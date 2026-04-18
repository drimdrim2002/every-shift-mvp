import type { User } from '@supabase/supabase-js'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { resolvePreferredOrganizationId } from '@/utils/authScope'
import type {
  AccessResolution,
  AccessState,
  AccountStatus,
  AuthContext,
  AuthContextMembership,
  EffectiveMembership,
  GlobalRole,
  MembershipSelectionSource,
  OrganizationMembershipRole,
  OrganizationMembershipStatus,
  ResolveAccessStateInput,
} from '@/types/rbac'

type MetadataRecord = Record<string, unknown>

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
  const matchingMembership = memberships
    .filter((candidate) => candidate.role === 'admin' && candidate.status === status)
    .sort(compareMembershipPriority)[0]

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
  fallbackLegacyOrganizationId,
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

  if (context.profile.globalRole === 'super' && context.profile.accountStatus === 'active') {
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

  if (fallbackLegacyOrganizationId) {
    const legacyMembership = createEffectiveMembership(
      {
        organizationId: fallbackLegacyOrganizationId,
        role: 'admin',
        status: 'approved',
      },
      'legacy_fallback',
    )

    return {
      accessState: resolveAccessStateFromMembership(legacyMembership),
      effectiveMembership: legacyMembership,
    }
  }

  return {
    accessState: 'no_membership_or_inactive',
    effectiveMembership: null,
  }
}

function asRecord(value: unknown): MetadataRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as MetadataRecord
}

function readString(record: MetadataRecord | null, keys: readonly string[]): string | null {
  if (!record) {
    return null
  }

  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }

  return null
}

function normalizeGlobalRole(value: string | null): GlobalRole {
  if (value === 'super' || value === 'admin' || value === 'user') {
    return value
  }

  return 'user'
}

function normalizeAccountStatus(value: string | null): AccountStatus {
  if (
    value === 'active' ||
    value === 'pending' ||
    value === 'rejected' ||
    value === 'suspended' ||
    value === 'withdrawn'
  ) {
    return value
  }

  return 'active'
}

function normalizeMembershipRole(
  value: string | null,
  fallbackRole: GlobalRole,
): OrganizationMembershipRole {
  if (value === 'admin' || value === 'user') {
    return value
  }

  return fallbackRole === 'super' ? 'admin' : fallbackRole === 'admin' ? 'admin' : 'user'
}

function normalizeMembershipStatus(value: string | null): OrganizationMembershipStatus | null {
  if (value === 'approved' || value === 'pending' || value === 'rejected' || value === 'withdrawn') {
    return value
  }

  if (value === 'active') {
    return 'approved'
  }

  return null
}

function readMemberships(metadata: MetadataRecord | null, fallbackRole: GlobalRole) {
  if (!metadata) {
    return [] as AuthContextMembership[]
  }

  const list =
    metadata.organization_memberships ??
    metadata.organizationMemberships ??
    metadata.memberships

  if (!Array.isArray(list)) {
    return []
  }

  return list
    .map((item) => {
      const record = asRecord(item)
      if (!record) {
        return null
      }

      const organizationId = readString(record, ['organizationId', 'organization_id'])
      const role = normalizeMembershipRole(readString(record, ['role']), fallbackRole)
      const status = normalizeMembershipStatus(readString(record, ['status']))

      if (!organizationId || !status) {
        return null
      }

      return {
        membershipId: readString(record, ['membershipId', 'membership_id']) ?? undefined,
        organizationId,
        role,
        status,
        approvedAt: readString(record, ['approvedAt', 'approved_at']),
        createdAt: readString(record, ['createdAt', 'created_at']),
        rejectionReason: readString(record, ['rejectionReason', 'rejection_reason']),
      } satisfies AuthContextMembership
    })
    .filter((membership): membership is AuthContextMembership => Boolean(membership))
}

function readTopLevelMembership(
  metadata: MetadataRecord | null,
  fallbackRole: GlobalRole,
  fallbackOrganizationId: string | null,
): AuthContextMembership | null {
  if (!metadata) {
    return null
  }

  const organizationId =
    readString(metadata, ['organizationId', 'organization_id', 'currentOrganizationId', 'current_organization_id']) ??
    fallbackOrganizationId
  const status = normalizeMembershipStatus(readString(metadata, ['status']))

  if (!organizationId || !status) {
    return null
  }

  return {
    organizationId,
    role: normalizeMembershipRole(readString(metadata, ['role']), fallbackRole),
    status,
    approvedAt: readString(metadata, ['approvedAt', 'approved_at']),
    createdAt: readString(metadata, ['createdAt', 'created_at']),
    rejectionReason: readString(metadata, ['rejectionReason', 'rejection_reason']),
  }
}

function buildAuthContextFromUser(user: User | null): AuthContext | null {
  if (!user?.id) {
    return null
  }

  const appMetadata = asRecord(user.app_metadata)
  const userMetadata = asRecord(user.user_metadata)
  const currentOrganizationId = resolvePreferredOrganizationId(user)

  const globalRole = normalizeGlobalRole(
    readString(appMetadata, ['global_role', 'globalRole']) ??
      readString(userMetadata, ['global_role', 'globalRole']),
  )

  const accountStatus = normalizeAccountStatus(
    readString(appMetadata, ['account_status', 'accountStatus']) ??
      readString(userMetadata, ['account_status', 'accountStatus']),
  )

  const memberships = [
    ...readMemberships(appMetadata, globalRole),
    ...readMemberships(userMetadata, globalRole),
  ]

  if (memberships.length === 0) {
    const topLevelMembership =
      readTopLevelMembership(appMetadata, globalRole, currentOrganizationId) ??
      readTopLevelMembership(userMetadata, globalRole, currentOrganizationId)

    if (topLevelMembership) {
      memberships.push(topLevelMembership)
    }
  }

  return {
    profile: {
      userId: user.id,
      globalRole,
      accountStatus,
    },
    memberships,
    currentOrganizationId,
  }
}

export const useRbacStore = defineStore('rbac', () => {
  const sessionUser = ref<User | null>(null)
  const selectedOrganizationId = ref<string | null>(null)

  const context = computed(() => buildAuthContextFromUser(sessionUser.value))

  const resolution = computed<AccessResolution>(() =>
    deriveAccessState({
      sessionUserId: sessionUser.value?.id ?? null,
      context: context.value,
      selectedOrganizationId: selectedOrganizationId.value,
      fallbackLegacyOrganizationId: resolvePreferredOrganizationId(sessionUser.value),
    }),
  )

  const accessState = computed<AccessState>(() => resolution.value.accessState)
  const effectiveMembership = computed(() => resolution.value.effectiveMembership)

  function setSessionUser(user: User | null) {
    sessionUser.value = user
    if (!user) {
      selectedOrganizationId.value = null
    }
  }

  function setSelectedOrganizationId(organizationId: string | null) {
    selectedOrganizationId.value = organizationId
  }

  function clearContext() {
    sessionUser.value = null
    selectedOrganizationId.value = null
  }

  return {
    accessState,
    effectiveMembership,
    setSessionUser,
    setSelectedOrganizationId,
    clearContext,
  }
})
