import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { User } from '@supabase/supabase-js'

type TableName = 'profiles' | 'organization_memberships' | 'signup_requests' | 'organizations'

interface ProfileRow {
  global_role: string | null
  account_status: string | null
  organization_id: string | null
  role: string | null
  status: string | null
}

interface MembershipRow {
  id: string
  organization_id: string | null
  role: string | null
  status: string | null
  approved_at?: string | null
  created_at?: string | null
  rejection_reason?: string | null
}

interface SignupRequestRow {
  organization_id: string | null
  status: 'pending' | 'rejected' | 'approved'
  review_note: string | null
  created_at: string
}

interface OrganizationRow {
  id: string
  name: string | null
}

const {
  fromMock,
  profileByUserId,
  membershipsByUserId,
  signupRequestByUserId,
  organizationsById,
  syncWithAccessScopeMock,
  resetContextMock,
  queryFailureState,
} = vi.hoisted(() => ({
  fromMock: vi.fn(),
  profileByUserId: new Map<string, ProfileRow | null>(),
  membershipsByUserId: new Map<string, MembershipRow[]>(),
  signupRequestByUserId: new Map<string, SignupRequestRow | null>(),
  organizationsById: new Map<string, OrganizationRow>(),
  syncWithAccessScopeMock: vi.fn(),
  resetContextMock: vi.fn(),
  queryFailureState: {
    profiles: false,
    memberships: false,
    signupRequests: false,
    organizations: false,
  },
}))

vi.mock('@/api/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}))

vi.mock('@/stores/schedule', () => ({
  useScheduleStore: () => ({
    syncWithAccessScope: syncWithAccessScopeMock,
  }),
}))

vi.mock('@/stores/organization', () => ({
  useOrganizationStore: () => ({
    resetContext: resetContextMock,
  }),
}))

import { useRbacStore } from '@/stores/rbac'

function createAuthUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    aud: 'authenticated',
    created_at: '2026-04-18T00:00:00Z',
    app_metadata: {},
    user_metadata: {
      email_verified: true,
    },
    ...overrides,
  } as User
}

function createQueryBuilder(table: TableName) {
  const filters = new Map<string, unknown>()

  const query = {
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: unknown) => {
      filters.set(column, value)
      return query
    }),
    in: vi.fn((column: string, value: unknown[]) => {
      filters.set(column, value)
      return query
    }),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => {
      if (table === 'profiles') {
        if (queryFailureState.profiles) {
          return {
            data: null,
            error: { message: 'profiles failed' },
          }
        }

        return {
          data: profileByUserId.get(String(filters.get('id'))) ?? null,
          error: null,
        }
      }

      if (queryFailureState.signupRequests) {
        return {
          data: null,
          error: { message: 'signup_requests failed' },
        }
      }

      return {
        data: signupRequestByUserId.get(String(filters.get('requester_user_id'))) ?? null,
        error: null,
      }
    }),
    then: undefined,
  }

  if (table === 'organization_memberships') {
    query.eq = vi.fn(async (column: string, value: unknown) => {
      filters.set(column, value)

      if (queryFailureState.memberships) {
        return {
          data: null,
          error: { message: 'organization_memberships failed' },
        }
      }

      return {
        data: membershipsByUserId.get(String(value)) ?? [],
        error: null,
      }
    })
  }

  if (table === 'organizations') {
    query.in = vi.fn(async (column: string, value: unknown[]) => {
      filters.set(column, value)

      if (queryFailureState.organizations) {
        return {
          data: null,
          error: { message: 'organizations failed' },
        }
      }

      return {
        data: value
          .map((organizationId) => organizationsById.get(String(organizationId)))
          .filter((organization): organization is OrganizationRow => Boolean(organization)),
        error: null,
      }
    })

    query.order = vi.fn(async () => {
      if (queryFailureState.organizations) {
        return {
          data: null,
          error: { message: 'organizations failed' },
        }
      }

      return {
        data: [...organizationsById.values()].sort((left, right) =>
          (left.name ?? '').localeCompare(right.name ?? ''),
        ),
        error: null,
      }
    })
  }

  return query
}

describe('RBAC access hydration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    profileByUserId.clear()
    membershipsByUserId.clear()
    signupRequestByUserId.clear()
    organizationsById.clear()
    syncWithAccessScopeMock.mockReset()
    resetContextMock.mockReset()
    queryFailureState.profiles = false
    queryFailureState.memberships = false
    queryFailureState.signupRequests = false
    queryFailureState.organizations = false

    fromMock.mockImplementation((table: TableName) => createQueryBuilder(table))
  })

  it('hydrates active admin access from DB when auth metadata is incomplete', async () => {
    profileByUserId.set('user-1', {
      global_role: 'user',
      account_status: 'active',
      organization_id: 'org-1',
      role: 'admin',
      status: 'active',
    })
    membershipsByUserId.set('user-1', [
      {
        id: 'membership-1',
        organization_id: 'org-1',
        role: 'admin',
        status: 'approved',
        approved_at: '2026-04-18T01:00:00Z',
      },
    ])

    const store = useRbacStore()
    store.setSessionUser(createAuthUser())
    await store.ensureAccessContextLoaded()

    expect(store.accessState).toBe('admin_active')
    expect(store.effectiveMembership).toMatchObject({
      membershipId: 'membership-1',
      organizationId: 'org-1',
      role: 'admin',
      status: 'approved',
    })
  })

  it('prefers a DB-approved admin membership over stale pending auth metadata for the same organization', async () => {
    profileByUserId.set('user-1', {
      global_role: 'user',
      account_status: 'pending',
      organization_id: 'org-1',
      role: 'admin',
      status: 'inactive',
    })
    membershipsByUserId.set('user-1', [
      {
        id: 'membership-1',
        organization_id: 'org-1',
        role: 'admin',
        status: 'approved',
        approved_at: '2026-04-18T04:00:00.000Z',
      },
    ])

    const store = useRbacStore()
    store.setSessionUser(
      createAuthUser({
        app_metadata: {
          global_role: 'user',
          account_status: 'active',
          organization_id: 'org-1',
          organization_memberships: [
            {
              organization_id: 'org-1',
              role: 'admin',
              status: 'pending',
              approved_at: null,
              created_at: '2026-04-18T03:03:58.048Z',
            },
          ],
        },
      }),
    )
    await store.ensureAccessContextLoaded()

    expect(store.accessState).toBe('admin_active')
    expect(store.effectiveMembership).toMatchObject({
      membershipId: 'membership-1',
      organizationId: 'org-1',
      role: 'admin',
      status: 'approved',
    })
  })

  it('hydrates super access from DB when JWT metadata is missing', async () => {
    profileByUserId.set('user-1', {
      global_role: 'super',
      account_status: 'active',
      organization_id: null,
      role: null,
      status: null,
    })

    const store = useRbacStore()
    store.setSessionUser(createAuthUser())
    await store.ensureAccessContextLoaded()

    expect(store.accessState).toBe('super_active')
    expect(store.effectiveMembership).toBeNull()
  })

  it('hydrates all organizations as switchable options for active super users without auto-selecting one', async () => {
    profileByUserId.set('user-1', {
      global_role: 'super',
      account_status: 'active',
      organization_id: null,
      role: null,
      status: null,
    })
    organizationsById.set('org-b', { id: 'org-b', name: 'Beta Hospital' })
    organizationsById.set('org-a', { id: 'org-a', name: 'Alpha Hospital' })

    const store = useRbacStore()
    store.setSessionUser(createAuthUser())
    await store.ensureAccessContextLoaded()

    expect(store.accessState).toBe('super_active')
    expect(store.selectedOrganizationId).toBeNull()
    expect(store.organizationOptions).toEqual([
      {
        id: 'org-a',
        name: 'Alpha Hospital',
        membershipRole: null,
      },
      {
        id: 'org-b',
        name: 'Beta Hospital',
        membershipRole: null,
      },
    ])
    expect(store.abilities).toMatchObject({
      canViewApprovalQueue: true,
      canManageOrganizationSetup: false,
      canManageEmployees: false,
      canManageSchedules: false,
    })
  })

  it('restores a persisted selected organization for super users from the full organization catalog', async () => {
    window.localStorage.setItem('everyshift:selected-organization:user-1', 'org-b')
    profileByUserId.set('user-1', {
      global_role: 'super',
      account_status: 'active',
      organization_id: null,
      role: null,
      status: null,
    })
    organizationsById.set('org-b', { id: 'org-b', name: 'Beta Hospital' })
    organizationsById.set('org-a', { id: 'org-a', name: 'Alpha Hospital' })

    const store = useRbacStore()
    store.setSessionUser(createAuthUser())
    await store.ensureAccessContextLoaded()

    expect(store.selectedOrganizationId).toBe('org-b')
    expect(store.organizationOptions).toEqual([
      {
        id: 'org-a',
        name: 'Alpha Hospital',
        membershipRole: null,
      },
      {
        id: 'org-b',
        name: 'Beta Hospital',
        membershipRole: null,
      },
    ])
    expect(store.abilities).toMatchObject({
      canManageOrganizationSetup: true,
      canManageEmployees: true,
      canManageSchedules: true,
    })
  })

  it('does not synthesize membership from top-level JWT org metadata when DB has no access rows', async () => {
    const store = useRbacStore()
    store.setSessionUser(
      createAuthUser({
        app_metadata: {
          organization_id: 'org-top-level',
          role: 'admin',
          status: 'active',
        },
      }),
    )

    await store.ensureAccessContextLoaded()

    expect(store.accessState).toBe('no_membership_or_inactive')
    expect(store.effectiveMembership).toBeNull()
    expect(store.selectedOrganizationId).toBeNull()
  })

  it('stays restricted before DB hydration completes even when metadata includes memberships', () => {
    const store = useRbacStore()
    store.setSessionUser(
      createAuthUser({
        app_metadata: {
          organization_memberships: [
            {
              organization_id: 'org-meta',
              role: 'admin',
              status: 'approved',
            },
          ],
        },
      }),
    )

    expect(store.accessState).toBe('no_membership_or_inactive')
    expect(store.effectiveMembership).toBeNull()
    expect(store.selectedOrganizationId).toBeNull()
    expect(store.abilities).toMatchObject({
      canManageOrganizationSetup: false,
      canManageEmployees: false,
      canManageSchedules: false,
    })
  })

  it('stays restricted when DB hydration fails even if metadata includes memberships', async () => {
    queryFailureState.memberships = true

    const store = useRbacStore()
    store.setSessionUser(
      createAuthUser({
        app_metadata: {
          organization_memberships: [
            {
              organization_id: 'org-meta',
              role: 'admin',
              status: 'approved',
            },
          ],
        },
      }),
    )

    await store.ensureAccessContextLoaded()

    expect(store.accessState).toBe('no_membership_or_inactive')
    expect(store.effectiveMembership).toBeNull()
    expect(store.selectedOrganizationId).toBeNull()
    expect(store.organizationOptions).toEqual([])
  })

  it('stays restricted when DB hydration fails even if metadata claims super access', async () => {
    queryFailureState.profiles = true

    const store = useRbacStore()
    store.setSessionUser(
      createAuthUser({
        app_metadata: {
          global_role: 'super',
          account_status: 'active',
        },
      }),
    )

    await store.ensureAccessContextLoaded()

    expect(store.accessState).toBe('no_membership_or_inactive')
    expect(store.effectiveMembership).toBeNull()
    expect(store.selectedOrganizationId).toBeNull()
    expect(store.abilities).toMatchObject({
      canViewApprovalQueue: false,
      canManageOrganizationSetup: false,
      canManageEmployees: false,
      canManageSchedules: false,
    })
  })

  it('keeps super access even when the organization catalog lookup fails', async () => {
    queryFailureState.organizations = true
    profileByUserId.set('user-1', {
      global_role: 'super',
      account_status: 'active',
      organization_id: null,
      role: null,
      status: null,
    })

    const store = useRbacStore()
    store.setSessionUser(createAuthUser())
    await store.ensureAccessContextLoaded()

    expect(store.accessState).toBe('super_active')
    expect(store.selectedOrganizationId).toBeNull()
    expect(store.organizationOptions).toEqual([])
    expect(store.abilities).toMatchObject({
      canViewApprovalQueue: true,
      canManageOrganizationSetup: false,
      canManageEmployees: false,
      canManageSchedules: false,
    })
  })

  it('restores a persisted selected organization and exposes membership-backed options', async () => {
    window.localStorage.setItem('everyshift:selected-organization:user-1', 'org-2')
    profileByUserId.set('user-1', {
      global_role: 'user',
      account_status: 'active',
      organization_id: 'org-1',
      role: 'admin',
      status: 'active',
    })
    membershipsByUserId.set('user-1', [
      {
        id: 'membership-1',
        organization_id: 'org-1',
        role: 'admin',
        status: 'approved',
        approved_at: '2026-04-18T01:00:00Z',
      },
      {
        id: 'membership-2',
        organization_id: 'org-2',
        role: 'user',
        status: 'approved',
        approved_at: '2026-04-18T02:00:00Z',
      },
    ])
    organizationsById.set('org-1', { id: 'org-1', name: '서울병원' })
    organizationsById.set('org-2', { id: 'org-2', name: '부산병원' })

    const store = useRbacStore()
    store.setSessionUser(createAuthUser())

    await store.ensureAccessContextLoaded()

    expect(store.selectedOrganizationId).toBe('org-2')
    expect(store.organizationOptions).toEqual([
      expect.objectContaining({ id: 'org-1', name: '서울병원' }),
      expect.objectContaining({ id: 'org-2', name: '부산병원' }),
    ])
  })

  it('persists org selection changes and propagates the active scope into dependent stores', async () => {
    profileByUserId.set('user-1', {
      global_role: 'user',
      account_status: 'active',
      organization_id: 'org-1',
      role: 'admin',
      status: 'active',
    })
    membershipsByUserId.set('user-1', [
      {
        id: 'membership-1',
        organization_id: 'org-1',
        role: 'admin',
        status: 'approved',
        approved_at: '2026-04-18T01:00:00Z',
      },
      {
        id: 'membership-2',
        organization_id: 'org-2',
        role: 'user',
        status: 'approved',
        approved_at: '2026-04-18T02:00:00Z',
      },
    ])

    const store = useRbacStore()
    store.setSessionUser(createAuthUser())
    await store.ensureAccessContextLoaded()

    await store.selectOrganization('org-2')

    expect(store.selectedOrganizationId).toBe('org-2')
    expect(window.localStorage.getItem('everyshift:selected-organization:user-1')).toBe('org-2')
    expect(syncWithAccessScopeMock).toHaveBeenCalledWith({
      userId: 'user-1',
      organizationId: 'org-2',
    })
    expect(resetContextMock).toHaveBeenCalledTimes(1)
  })

  it('rejects invalid selected organizations so super access cannot unlock admin abilities', async () => {
    profileByUserId.set('user-1', {
      global_role: 'super',
      account_status: 'active',
      organization_id: null,
      role: null,
      status: null,
    })
    organizationsById.set('org-1', { id: 'org-1', name: 'Alpha Hospital' })

    const store = useRbacStore()
    store.setSessionUser(createAuthUser())
    await store.ensureAccessContextLoaded()

    await store.selectOrganization('org-inaccessible')

    expect(store.selectedOrganizationId).toBeNull()
    expect(store.abilities).toMatchObject({
      canManageOrganizationSetup: false,
      canManageEmployees: false,
      canManageSchedules: false,
    })
  })

  it('falls back to the latest pending admin signup request when no membership metadata exists', async () => {
    signupRequestByUserId.set('user-1', {
      organization_id: 'org-pending',
      status: 'pending',
      review_note: null,
      created_at: '2026-04-18T02:00:00Z',
    })

    const store = useRbacStore()
    store.setSessionUser(createAuthUser())
    await store.ensureAccessContextLoaded()

    expect(store.accessState).toBe('admin_pending')
    expect(store.effectiveMembership).toMatchObject({
      organizationId: 'org-pending',
      role: 'admin',
      status: 'pending',
    })
  })

  it('falls back to the latest rejected admin signup request and preserves the review note', async () => {
    signupRequestByUserId.set('user-1', {
      organization_id: 'org-rejected',
      status: 'rejected',
      review_note: '증빙 서류를 다시 제출해주세요.',
      created_at: '2026-04-18T03:00:00Z',
    })

    const store = useRbacStore()
    store.setSessionUser(createAuthUser())
    await store.ensureAccessContextLoaded()

    expect(store.accessState).toBe('admin_rejected')
    expect(store.effectiveMembership).toMatchObject({
      organizationId: 'org-rejected',
      role: 'admin',
      status: 'rejected',
      rejectionReason: '증빙 서류를 다시 제출해주세요.',
    })
  })

  it('keeps membership-backed rejected admin access when signup-request fallback hydration fails', async () => {
    queryFailureState.signupRequests = true
    profileByUserId.set('user-1', {
      global_role: 'user',
      account_status: 'rejected',
      organization_id: 'org-rejected',
      role: 'admin',
      status: 'inactive',
    })
    membershipsByUserId.set('user-1', [
      {
        id: 'membership-rejected',
        organization_id: 'org-rejected',
        role: 'admin',
        status: 'rejected',
        approved_at: null,
        created_at: '2026-04-18T03:00:00.000Z',
        rejection_reason: '증빙 서류를 다시 제출해주세요.',
      },
    ])

    const store = useRbacStore()
    store.setSessionUser(createAuthUser())
    await store.ensureAccessContextLoaded()

    expect(store.accessState).toBe('admin_rejected')
    expect(store.effectiveMembership).toMatchObject({
      membershipId: 'membership-rejected',
      organizationId: 'org-rejected',
      role: 'admin',
      status: 'rejected',
      rejectionReason: '증빙 서류를 다시 제출해주세요.',
    })
  })
})
