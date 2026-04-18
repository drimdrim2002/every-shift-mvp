import type { User } from '@supabase/supabase-js'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '@/api/supabase'
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

interface AuthContextSeedProfile {
  userId: string
  globalRole: GlobalRole | null
  accountStatus: AccountStatus | null
}

interface AuthContextSeed {
  profile: AuthContextSeedProfile
  memberships: AuthContextMembership[]
  currentOrganizationId: string | null
}

interface ProfileAccessRow {
  global_role: string | null
  account_status: string | null
  organization_id: string | null
  role: string | null
  status: string | null
}

interface OrganizationMembershipAccessRow {
  id: string
  organization_id: string | null
  role: string | null
  status: string | null
  approved_at: string | null
  created_at: string | null
  rejection_reason: string | null
}

interface SignupRequestAccessRow {
  organization_id: string | null
  status: 'pending' | 'rejected' | 'approved' | 'expired' | 'withdrawn' | null
  review_note: string | null
  created_at: string | null
}

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

function readGlobalRole(value: string | null): GlobalRole | null {
  if (value === 'super' || value === 'admin' || value === 'user') {
    return value
  }

  return null
}

function readAccountStatus(value: string | null): AccountStatus | null {
  if (
    value === 'active' ||
    value === 'pending' ||
    value === 'rejected' ||
    value === 'suspended' ||
    value === 'withdrawn'
  ) {
    return value
  }

  return null
}

function normalizeMembershipRole(
  value: string | null,
  fallbackRole: GlobalRole | null,
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

function readMemberships(metadata: MetadataRecord | null, fallbackRole: GlobalRole | null) {
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
  fallbackRole: GlobalRole | null,
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

function mergeMembership(existing: AuthContextMembership, next: AuthContextMembership): AuthContextMembership {
  return {
    membershipId: existing.membershipId ?? next.membershipId,
    organizationId: existing.organizationId,
    role: existing.role,
    status: existing.status,
    approvedAt: existing.approvedAt ?? next.approvedAt,
    createdAt: existing.createdAt ?? next.createdAt,
    rejectionReason: existing.rejectionReason ?? next.rejectionReason,
  }
}

function mergeMemberships(
  primaryMemberships: AuthContextMembership[],
  secondaryMemberships: AuthContextMembership[],
): AuthContextMembership[] {
  const mergedMemberships = new Map<string, AuthContextMembership>()

  for (const membership of [...primaryMemberships, ...secondaryMemberships]) {
    const key =
      membership.membershipId ??
      `${membership.organizationId}:${membership.role}:${membership.status}`
    const existingMembership = mergedMemberships.get(key)
    mergedMemberships.set(
      key,
      existingMembership ? mergeMembership(existingMembership, membership) : membership,
    )
  }

  return [...mergedMemberships.values()]
}

function hasApprovedMembership(memberships: AuthContextMembership[]): boolean {
  return memberships.some((membership) => membership.status === 'approved')
}

function hasBlockedAdminMembership(memberships: AuthContextMembership[]): boolean {
  return memberships.some(
    (membership) =>
      membership.role === 'admin' &&
      (membership.status === 'pending' || membership.status === 'rejected'),
  )
}

function resolveMergedAccountStatus(
  explicitAccountStatus: AccountStatus | null,
  globalRole: GlobalRole | null,
  memberships: AuthContextMembership[],
): AccountStatus {
  if (explicitAccountStatus === 'suspended' || explicitAccountStatus === 'withdrawn') {
    return explicitAccountStatus
  }

  if (
    explicitAccountStatus === 'active' ||
    hasApprovedMembership(memberships) ||
    hasBlockedAdminMembership(memberships) ||
    globalRole === 'super'
  ) {
    return 'active'
  }

  return explicitAccountStatus ?? 'active'
}

function buildAuthContextFromSeed(seed: AuthContextSeed | null): AuthContext | null {
  if (!seed) {
    return null
  }

  return {
    profile: {
      userId: seed.profile.userId,
      globalRole: seed.profile.globalRole ?? 'user',
      accountStatus: seed.profile.accountStatus ?? 'active',
    },
    memberships: seed.memberships,
    currentOrganizationId: seed.currentOrganizationId,
  }
}

function mergeAuthContextSeeds(
  primarySeed: AuthContextSeed | null,
  secondarySeed: AuthContextSeed | null,
): AuthContext | null {
  const userId = primarySeed?.profile.userId ?? secondarySeed?.profile.userId
  if (!userId) {
    return null
  }

  const memberships = mergeMemberships(
    primarySeed?.memberships ?? [],
    secondarySeed?.memberships ?? [],
  )
  const globalRole = primarySeed?.profile.globalRole ?? secondarySeed?.profile.globalRole ?? null
  const accountStatus = resolveMergedAccountStatus(
    primarySeed?.profile.accountStatus ?? secondarySeed?.profile.accountStatus ?? null,
    globalRole,
    memberships,
  )

  return buildAuthContextFromSeed({
    profile: {
      userId,
      globalRole,
      accountStatus,
    },
    memberships,
    currentOrganizationId:
      primarySeed?.currentOrganizationId ?? secondarySeed?.currentOrganizationId ?? null,
  })
}

function buildAuthContextSeedFromUser(user: User | null): AuthContextSeed | null {
  if (!user?.id) {
    return null
  }

  const appMetadata = asRecord(user.app_metadata)
  const userMetadata = asRecord(user.user_metadata)
  const currentOrganizationId = resolvePreferredOrganizationId(user)
  const globalRole =
    readGlobalRole(readString(appMetadata, ['global_role', 'globalRole'])) ??
    readGlobalRole(readString(userMetadata, ['global_role', 'globalRole']))
  const accountStatus =
    readAccountStatus(readString(appMetadata, ['account_status', 'accountStatus'])) ??
    readAccountStatus(readString(userMetadata, ['account_status', 'accountStatus']))

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

async function loadDatabaseAccessContextSeed(userId: string): Promise<AuthContextSeed | null> {
  const [{ data: profile, error: profileError }, { data: memberships, error: membershipsError }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('global_role, account_status, organization_id, role, status')
        .eq('id', userId)
        .limit(1)
        .maybeSingle<ProfileAccessRow>(),
      supabase
        .from('organization_memberships')
        .select('id, organization_id, role, status, approved_at, created_at, rejection_reason')
        .eq('user_id', userId) as Promise<{
          data: OrganizationMembershipAccessRow[] | null
          error: { message: string } | null
        }>,
    ])

  if (profileError) {
    throw new Error(profileError.message)
  }

  if (membershipsError) {
    throw new Error(membershipsError.message)
  }

  const { data: signupRequest, error: signupRequestError } = await supabase
    .from('signup_requests')
    .select('organization_id, status, review_note, created_at')
    .eq('requester_user_id', userId)
    .eq('requested_role', 'admin')
    .in('status', ['pending', 'rejected'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<SignupRequestAccessRow>()

  if (signupRequestError) {
    throw new Error(signupRequestError.message)
  }

  const profileGlobalRole = readGlobalRole(profile?.global_role?.trim() ?? null)
  const membershipsFromDatabase = (memberships ?? [])
    .map((membership) => {
      const organizationId = membership.organization_id?.trim() ?? null
      const status = normalizeMembershipStatus(membership.status?.trim() ?? null)
      if (!organizationId || !status) {
        return null
      }

      return {
        membershipId: membership.id,
        organizationId,
        role: normalizeMembershipRole(membership.role?.trim() ?? null, profileGlobalRole),
        status,
        approvedAt: membership.approved_at,
        createdAt: membership.created_at,
        rejectionReason: membership.rejection_reason,
      } satisfies AuthContextMembership
    })
    .filter((membership): membership is AuthContextMembership => Boolean(membership))

  if (
    membershipsFromDatabase.length === 0 &&
    profile?.organization_id &&
    profile.status?.trim() === 'active'
  ) {
    membershipsFromDatabase.push({
      organizationId: profile.organization_id,
      role: normalizeMembershipRole(profile.role?.trim() ?? null, profileGlobalRole),
      status: 'approved',
    })
  }

  if (
    signupRequest?.organization_id &&
    (signupRequest.status === 'pending' || signupRequest.status === 'rejected') &&
    !membershipsFromDatabase.some(
      (membership) =>
        membership.organizationId === signupRequest.organization_id &&
        membership.role === 'admin' &&
        membership.status === signupRequest.status,
    )
  ) {
    membershipsFromDatabase.push({
      organizationId: signupRequest.organization_id,
      role: 'admin',
      status: signupRequest.status,
      createdAt: signupRequest.created_at,
      rejectionReason: signupRequest.review_note,
    })
  }

  if (!profile && membershipsFromDatabase.length === 0) {
    return null
  }

  return {
    profile: {
      userId,
      globalRole: profileGlobalRole,
      accountStatus: readAccountStatus(profile?.account_status?.trim() ?? null),
    },
    memberships: membershipsFromDatabase,
    currentOrganizationId:
      profile?.organization_id ??
      membershipsFromDatabase.find((membership) => membership.status === 'approved')?.organizationId ??
      membershipsFromDatabase[0]?.organizationId ??
      signupRequest?.organization_id ??
      null,
  }
}

export const useRbacStore = defineStore('rbac', () => {
  const sessionUser = ref<User | null>(null)
  const selectedOrganizationId = ref<string | null>(null)
  const hydratedContext = ref<AuthContext | null>(null)
  const accessContextLoaded = ref(false)

  let pendingAccessContextLoad: Promise<void> | null = null

  const metadataContext = computed(() => buildAuthContextFromSeed(buildAuthContextSeedFromUser(sessionUser.value)))
  const context = computed(() =>
    accessContextLoaded.value ? hydratedContext.value : metadataContext.value,
  )

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

  async function ensureAccessContextLoaded() {
    const userId = sessionUser.value?.id ?? null
    if (!userId) {
      hydratedContext.value = null
      accessContextLoaded.value = true
      return
    }

    if (accessContextLoaded.value) {
      return
    }

    if (pendingAccessContextLoad) {
      await pendingAccessContextLoad
      return
    }

    pendingAccessContextLoad = (async () => {
      const metadataSeed = buildAuthContextSeedFromUser(sessionUser.value)
      try {
        const databaseSeed = await loadDatabaseAccessContextSeed(userId)
        if (sessionUser.value?.id !== userId) {
          return
        }

        hydratedContext.value = mergeAuthContextSeeds(metadataSeed, databaseSeed)
      } catch (error) {
        console.warn('[rbac] Failed to hydrate access context from DB:', error)
        if (sessionUser.value?.id !== userId) {
          return
        }

        hydratedContext.value = buildAuthContextFromSeed(metadataSeed)
      } finally {
        if (sessionUser.value?.id === userId) {
          accessContextLoaded.value = true
        }
      }
    })().finally(() => {
      pendingAccessContextLoad = null
    })

    await pendingAccessContextLoad
  }

  function setSessionUser(user: User | null) {
    sessionUser.value = user
    hydratedContext.value = null
    accessContextLoaded.value = false
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
    hydratedContext.value = null
    accessContextLoaded.value = false
  }

  return {
    accessState,
    effectiveMembership,
    ensureAccessContextLoaded,
    setSessionUser,
    setSelectedOrganizationId,
    clearContext,
  }
})
