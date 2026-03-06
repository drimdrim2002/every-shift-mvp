import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  AccessResolution,
  AccessState,
  AuthContext,
  AuthContextMembership,
  EffectiveMembership,
  MembershipSelectionSource,
  OrganizationMembershipStatus,
  RbacSetAuthContextOptions,
  ResolveAccessStateInput,
} from '@/types/rbac'

function compareMembershipTimestamps(
  leftTimestamp: string | null | undefined,
  rightTimestamp: string | null | undefined,
) {
  if (leftTimestamp === rightTimestamp) {
    return 0
  }

  if (!leftTimestamp) {
    return 1
  }

  if (!rightTimestamp) {
    return -1
  }

  return leftTimestamp.localeCompare(rightTimestamp)
}

function compareMembershipPriority(left: AuthContextMembership, right: AuthContextMembership) {
  const approvedAtComparison = compareMembershipTimestamps(left.approvedAt, right.approvedAt)
  if (approvedAtComparison !== 0) {
    return approvedAtComparison
  }

  const createdAtComparison = compareMembershipTimestamps(left.createdAt, right.createdAt)
  if (createdAtComparison !== 0) {
    return createdAtComparison
  }

  return left.organizationId.localeCompare(right.organizationId)
}

function createEffectiveMembership(
  membership: AuthContextMembership,
  selectionSource: MembershipSelectionSource,
): EffectiveMembership {
  return {
    ...membership,
    selectionSource,
  }
}

function findMembershipByOrganization(
  memberships: AuthContextMembership[],
  organizationId: string | null | undefined,
): EffectiveMembership | null {
  if (!organizationId) {
    return null
  }

  const membership = memberships.find((candidate) => candidate.organizationId === organizationId)
  if (!membership) {
    return null
  }

  return createEffectiveMembership(membership, 'current_organization')
}

function findPrioritizedApprovedMembership(
  memberships: AuthContextMembership[],
): EffectiveMembership | null {
  const approvedAdmins = memberships
    .filter((candidate) => candidate.status === 'approved' && candidate.role === 'admin')
    .sort(compareMembershipPriority)

  const approvedAdmin = approvedAdmins[0]
  if (approvedAdmin) {
    return createEffectiveMembership(approvedAdmin, 'role_priority')
  }

  const approvedUsers = memberships
    .filter((candidate) => candidate.status === 'approved' && candidate.role === 'user')
    .sort(compareMembershipPriority)

  const approvedUser = approvedUsers[0]
  if (approvedUser) {
    return createEffectiveMembership(approvedUser, 'role_priority')
  }

  return null
}

function findAdminStatusFallback(
  memberships: AuthContextMembership[],
  status: OrganizationMembershipStatus,
): EffectiveMembership | null {
  const matchingMemberships = memberships
    .filter((candidate) => candidate.role === 'admin' && candidate.status === status)
    .sort(compareMembershipPriority)

  const matchingMembership = matchingMemberships[0]
  if (!matchingMembership) {
    return null
  }

  return createEffectiveMembership(matchingMembership, 'status_fallback')
}

function resolveAccessStateFromMembership(membership: EffectiveMembership): AccessState {
  if (membership.status === 'approved') {
    return membership.role === 'admin' ? 'admin_active' : 'user_active'
  }

  if (membership.role === 'admin' && membership.status === 'pending') {
    return 'admin_pending'
  }

  if (membership.role === 'admin' && membership.status === 'rejected') {
    return 'admin_rejected'
  }

  return 'no_membership_or_inactive'
}

export function deriveAccessState({
  sessionUserId,
  context,
  selectedOrganizationId,
}: ResolveAccessStateInput): AccessResolution {
  if (!sessionUserId) {
    return {
      accessState: 'unauthenticated',
      effectiveMembership: null,
    }
  }

  if (!context) {
    return {
      accessState: 'no_membership_or_inactive',
      effectiveMembership: null,
    }
  }

  if (
    context.profile.globalRole === 'super' &&
    context.profile.accountStatus === 'active'
  ) {
    return {
      accessState: 'super_active',
      effectiveMembership: null,
    }
  }

  if (context.profile.accountStatus !== 'active') {
    return {
      accessState: 'no_membership_or_inactive',
      effectiveMembership: null,
    }
  }

  const currentOrganizationId = selectedOrganizationId ?? context.currentOrganizationId ?? null
  const currentMembership = findMembershipByOrganization(context.memberships, currentOrganizationId)
  if (currentMembership) {
    return {
      accessState: resolveAccessStateFromMembership(currentMembership),
      effectiveMembership: currentMembership,
    }
  }

  const prioritizedApprovedMembership = findPrioritizedApprovedMembership(context.memberships)
  if (prioritizedApprovedMembership) {
    return {
      accessState: resolveAccessStateFromMembership(prioritizedApprovedMembership),
      effectiveMembership: prioritizedApprovedMembership,
    }
  }

  const pendingAdminMembership = findAdminStatusFallback(context.memberships, 'pending')
  if (pendingAdminMembership) {
    return {
      accessState: 'admin_pending',
      effectiveMembership: pendingAdminMembership,
    }
  }

  const rejectedAdminMembership = findAdminStatusFallback(context.memberships, 'rejected')
  if (rejectedAdminMembership) {
    return {
      accessState: 'admin_rejected',
      effectiveMembership: rejectedAdminMembership,
    }
  }

  return {
    accessState: 'no_membership_or_inactive',
    effectiveMembership: null,
  }
}

export const useRbacStore = defineStore('rbac', () => {
  const sessionUserId = ref<string | null>(null)
  const context = ref<AuthContext | null>(null)
  const selectedOrganizationId = ref<string | null>(null)
  const loading = ref(false)
  const initialized = ref(false)

  const resolution = computed<AccessResolution | null>(() => {
    if (!sessionUserId.value) {
      return {
        accessState: 'unauthenticated',
        effectiveMembership: null,
      }
    }

    // Authenticated sessions stay unresolved until auth-context is loaded.
    if (!initialized.value || !context.value) {
      return null
    }

    return deriveAccessState({
      sessionUserId: sessionUserId.value,
      context: context.value,
      selectedOrganizationId: selectedOrganizationId.value,
    })
  })

  const accessState = computed<AccessState | null>(() => {
    if (!sessionUserId.value) {
      return 'unauthenticated'
    }

    return resolution.value?.accessState ?? null
  })

  const effectiveMembership = computed(() => resolution.value?.effectiveMembership ?? null)

  function setSessionUserId(nextSessionUserId: string | null) {
    if (!nextSessionUserId) {
      clearContext()
      return
    }

    if (sessionUserId.value === nextSessionUserId) {
      return
    }

    sessionUserId.value = nextSessionUserId
    context.value = null
    loading.value = false
    initialized.value = false
  }

  function setSelectedOrganizationId(nextOrganizationId: string | null) {
    selectedOrganizationId.value = nextOrganizationId
  }

  function setLoading(nextLoading: boolean) {
    loading.value = nextLoading
  }

  function setAuthContext(nextContext: AuthContext, options: RbacSetAuthContextOptions = {}) {
    sessionUserId.value = nextContext.profile.userId
    context.value = nextContext
    selectedOrganizationId.value =
      options.selectedOrganizationId ?? nextContext.currentOrganizationId ?? null
    loading.value = false
    initialized.value = true
  }

  function resolveAccessState() {
    return resolution.value
  }

  function clearContext() {
    sessionUserId.value = null
    context.value = null
    selectedOrganizationId.value = null
    loading.value = false
    initialized.value = false
  }

  return {
    sessionUserId,
    context,
    selectedOrganizationId,
    loading,
    initialized,
    accessState,
    effectiveMembership,
    setSessionUserId,
    setSelectedOrganizationId,
    setLoading,
    setAuthContext,
    resolveAccessState,
    clearContext,
  }
})
