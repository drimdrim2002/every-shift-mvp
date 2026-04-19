import type {
  AccessAbilities,
  AccessResolution,
  AccessState,
  AuthContext,
  AuthContextMembership,
  BuildAccessAbilitiesInput,
  EffectiveMembership,
  MembershipSelectionSource,
  OrganizationMembershipStatus,
  OrganizationOption,
  PickDefaultOrganizationIdInput,
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

export function compareMembershipPriority(left: AuthContextMembership, right: AuthContextMembership) {
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

function getMembershipAccessPriority(membership: AuthContextMembership): number {
  if (membership.status === 'approved') {
    return membership.role === 'admin' ? 4 : 3
  }

  if (membership.role === 'admin' && membership.status === 'pending') {
    return 2
  }

  if (membership.role === 'admin' && membership.status === 'rejected') {
    return 1
  }

  return 0
}

function compareMembershipAccessPriority(left: AuthContextMembership, right: AuthContextMembership) {
  const priorityDifference =
    getMembershipAccessPriority(right) - getMembershipAccessPriority(left)
  if (priorityDifference !== 0) {
    return priorityDifference
  }

  return compareMembershipPriority(left, right)
}

function findMembershipByOrganization(
  memberships: AuthContextMembership[],
  organizationId: string | null | undefined,
): EffectiveMembership | null {
  if (!organizationId) {
    return null
  }

  const membership = memberships
    .filter((candidate) => candidate.organizationId === organizationId)
    .sort(compareMembershipAccessPriority)[0]
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

function isApprovedMembershipForOrganization(
  memberships: AuthContextMembership[],
  organizationId: string,
) {
  return memberships.some(
    (membership) =>
      membership.organizationId === organizationId && membership.status === 'approved',
  )
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

  if (
    context.profile.accountStatus === 'suspended' ||
    context.profile.accountStatus === 'withdrawn'
  ) {
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

  if (fallbackLegacyOrganizationId && context.profile.accountStatus === 'active') {
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

export function buildAccessAbilities(input: BuildAccessAbilitiesInput): AccessAbilities {
  if (input.accessState === 'super_active') {
    return {
      canViewApprovalQueue: true,
      canSwitchOrganization: true,
      canViewRestrictedUserHome: false,
      canManageOrganizationSetup: Boolean(input.selectedOrganizationId),
      canManageEmployees: Boolean(input.selectedOrganizationId),
      canManageSchedules: Boolean(input.selectedOrganizationId),
    }
  }

  if (
    input.effectiveMembership?.role === 'admin' &&
    input.effectiveMembership.status === 'approved'
  ) {
    return {
      canViewApprovalQueue: false,
      canSwitchOrganization: true,
      canViewRestrictedUserHome: false,
      canManageOrganizationSetup: true,
      canManageEmployees: true,
      canManageSchedules: true,
    }
  }

  return {
    canViewApprovalQueue: false,
    canSwitchOrganization: input.accessState === 'user_active',
    canViewRestrictedUserHome: input.accessState === 'user_active',
    canManageOrganizationSetup: false,
    canManageEmployees: false,
    canManageSchedules: false,
  }
}

export function buildOrganizationOptions(
  context: AuthContext | null,
): OrganizationOption[] {
  if (!context) {
    return []
  }

  const membershipsByOrganizationId = new Map<string, AuthContextMembership>()
  for (const membership of context.memberships) {
    if (membership.status !== 'approved') {
      continue
    }

    const existingMembership = membershipsByOrganizationId.get(membership.organizationId)
    if (
      !existingMembership ||
      compareMembershipAccessPriority(membership, existingMembership) < 0
    ) {
      membershipsByOrganizationId.set(membership.organizationId, membership)
    }
  }

  return [...membershipsByOrganizationId.values()]
    .sort(compareMembershipPriority)
    .map((membership) => ({
      id: membership.organizationId,
      name: membership.organizationName?.trim() || '알 수 없는 조직',
      membershipRole: membership.role,
    }))
}

export function pickDefaultOrganizationId({
  accessState,
  memberships,
  persistedOrganizationId,
}: PickDefaultOrganizationIdInput): string | null {
  const trimmedPersistedOrganizationId = persistedOrganizationId?.trim() ?? null
  if (accessState === 'super_active') {
    return trimmedPersistedOrganizationId
  }

  if (trimmedPersistedOrganizationId) {
    if (isApprovedMembershipForOrganization(memberships, trimmedPersistedOrganizationId)) {
      return trimmedPersistedOrganizationId
    }
  }

  const approvedAdminMembership = memberships
    .filter((membership) => membership.status === 'approved' && membership.role === 'admin')
    .sort(compareMembershipPriority)[0]
  if (approvedAdminMembership) {
    return approvedAdminMembership.organizationId
  }

  const approvedUserMembership = memberships
    .filter((membership) => membership.status === 'approved' && membership.role === 'user')
    .sort(compareMembershipPriority)[0]
  if (approvedUserMembership) {
    return approvedUserMembership.organizationId
  }

  return null
}
