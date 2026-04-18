import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { User } from '@supabase/supabase-js'

type TableName = 'profiles' | 'organization_memberships' | 'signup_requests'

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

const {
  fromMock,
  profileByUserId,
  membershipsByUserId,
  signupRequestByUserId,
  syncWithAccessScopeMock,
  resetContextMock,
} = vi.hoisted(() => ({
  fromMock: vi.fn(),
  profileByUserId: new Map<string, ProfileRow | null>(),
  membershipsByUserId: new Map<string, MembershipRow[]>(),
  signupRequestByUserId: new Map<string, SignupRequestRow | null>(),
  syncWithAccessScopeMock: vi.fn(),
  resetContextMock: vi.fn(),
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
        return {
          data: profileByUserId.get(String(filters.get('id'))) ?? null,
          error: null,
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
      return {
        data: membershipsByUserId.get(String(value)) ?? [],
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
    syncWithAccessScopeMock.mockReset()
    resetContextMock.mockReset()

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
          current_organization_id: 'org-1',
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

    const store = useRbacStore()
    store.setSessionUser(createAuthUser())

    await store.ensureAccessContextLoaded()

    expect(store.selectedOrganizationId).toBe('org-2')
    expect(store.organizationOptions).toEqual([
      expect.objectContaining({ id: 'org-1' }),
      expect.objectContaining({ id: 'org-2' }),
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
})
