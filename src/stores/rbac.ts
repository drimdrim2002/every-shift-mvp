import type { User } from '@supabase/supabase-js'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '@/api/supabase'
import { useOrganizationStore } from '@/stores/organization'
import { useScheduleStore } from '@/stores/schedule'
import {
  buildAccessAbilities,
  buildOrganizationOptions,
  deriveAccessState as resolveAccessState,
  pickDefaultOrganizationId,
} from '@/utils/rbacAccess'
import type {
  AccessResolution,
  AccessState,
  AccountStatus,
  AuthContext,
  AuthContextMembership,
  GlobalRole,
  OrganizationOption,
  OrganizationMembershipRole,
  OrganizationMembershipStatus,
} from '@/types/rbac'

export { deriveAccessState } from '@/utils/rbacAccess'

const ACTIVE_ORG_STORAGE_KEY_PREFIX = 'everyshift:selected-organization:'

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

function buildSelectedOrganizationStorageKey(userId: string) {
  return `${ACTIVE_ORG_STORAGE_KEY_PREFIX}${userId}`
}

function readPersistedSelectedOrganizationId(userId: string | null): string | null {
  if (!userId || typeof window === 'undefined') {
    return null
  }

  const value = window.localStorage.getItem(buildSelectedOrganizationStorageKey(userId))
  return value?.trim() ? value.trim() : null
}

function persistSelectedOrganizationId(userId: string | null, organizationId: string | null) {
  if (!userId || typeof window === 'undefined') {
    return
  }

  const storageKey = buildSelectedOrganizationStorageKey(userId)
  const trimmedOrganizationId = organizationId?.trim() ?? null
  if (!trimmedOrganizationId) {
    window.localStorage.removeItem(storageKey)
    return
  }

  window.localStorage.setItem(storageKey, trimmedOrganizationId)
}

function validateSelectedOrganizationId(
  organizationId: string | null,
  options: OrganizationOption[],
  memberships: AuthContextMembership[],
): string | null {
  const trimmedOrganizationId = organizationId?.trim() ?? null
  if (!trimmedOrganizationId) {
    return null
  }

  if (options.some((option) => option.id === trimmedOrganizationId)) {
    return trimmedOrganizationId
  }

  if (
    memberships.some(
      (membership) =>
        membership.organizationId === trimmedOrganizationId && membership.status === 'approved',
    )
  ) {
    return trimmedOrganizationId
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
  const organizationOptions = ref<OrganizationOption[]>([])
  const hydratedContext = ref<AuthContext | null>(null)
  const accessContextLoaded = ref(false)

  let pendingAccessContextLoad: Promise<void> | null = null

  const context = computed(() => hydratedContext.value)

  const resolution = computed<AccessResolution>(() =>
    resolveAccessState({
      sessionUserId: sessionUser.value?.id ?? null,
      context: context.value,
      selectedOrganizationId: selectedOrganizationId.value,
    }),
  )

  const accessState = computed<AccessState>(() => resolution.value.accessState)
  const effectiveMembership = computed(() => resolution.value.effectiveMembership)
  const abilities = computed(() =>
    buildAccessAbilities({
      accessState: accessState.value,
      selectedOrganizationId: selectedOrganizationId.value,
      effectiveMembership: effectiveMembership.value,
    }),
  )

  function syncOrganizationAccessState(nextContext: AuthContext | null) {
    organizationOptions.value = buildOrganizationOptions(nextContext)

    const userId = sessionUser.value?.id ?? null
    const validatedPersistedOrganizationId = validateSelectedOrganizationId(
      selectedOrganizationId.value ?? readPersistedSelectedOrganizationId(userId),
      organizationOptions.value,
      nextContext?.memberships ?? [],
    )
    const selectionResolution = resolveAccessState({
      sessionUserId: userId,
      context: nextContext,
    })

    selectedOrganizationId.value = pickDefaultOrganizationId({
      accessState: selectionResolution.accessState,
      memberships: nextContext?.memberships ?? [],
      persistedOrganizationId: validatedPersistedOrganizationId,
    })
    persistSelectedOrganizationId(userId, selectedOrganizationId.value)
  }

  async function ensureAccessContextLoaded() {
    const userId = sessionUser.value?.id ?? null
    if (!userId) {
      selectedOrganizationId.value = null
      organizationOptions.value = []
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
      try {
        const databaseSeed = await loadDatabaseAccessContextSeed(userId)
        if (sessionUser.value?.id !== userId) {
          return
        }

        const nextContext = buildAuthContextFromSeed(databaseSeed)
        hydratedContext.value = nextContext
        syncOrganizationAccessState(nextContext)
      } catch (error) {
        console.warn('[rbac] Failed to hydrate access context from DB:', error)
        if (sessionUser.value?.id !== userId) {
          return
        }

        hydratedContext.value = null
        syncOrganizationAccessState(null)
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
    selectedOrganizationId.value = user ? readPersistedSelectedOrganizationId(user.id) : null
    organizationOptions.value = []
    hydratedContext.value = null
    accessContextLoaded.value = false
    if (!user) {
      selectedOrganizationId.value = null
    }
  }

  async function selectOrganization(organizationId: string | null) {
    const validatedOrganizationId = validateSelectedOrganizationId(
      organizationId,
      organizationOptions.value,
      context.value?.memberships ?? [],
    )

    selectedOrganizationId.value = validatedOrganizationId
    persistSelectedOrganizationId(sessionUser.value?.id ?? null, validatedOrganizationId)

    useOrganizationStore().resetContext()
    useScheduleStore().syncWithAccessScope(
      sessionUser.value?.id
        ? {
            userId: sessionUser.value.id,
            organizationId: validatedOrganizationId,
          }
        : null,
    )
  }

  function setSelectedOrganizationId(organizationId: string | null) {
    void selectOrganization(organizationId)
  }

  function clearContext() {
    sessionUser.value = null
    selectedOrganizationId.value = null
    organizationOptions.value = []
    hydratedContext.value = null
    accessContextLoaded.value = false
  }

  return {
    accessState,
    abilities,
    effectiveMembership,
    ensureAccessContextLoaded,
    organizationOptions,
    selectedOrganizationId,
    selectOrganization,
    setSessionUser,
    setSelectedOrganizationId,
    clearContext,
  }
})
