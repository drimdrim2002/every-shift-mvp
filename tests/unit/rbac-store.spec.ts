import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { deriveAccessState, useRbacStore } from '@/stores/rbac'
import type { AuthContext } from '@/types/rbac'

function createAuthContext(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    profile: {
      userId: 'user-1',
      globalRole: 'user',
      accountStatus: 'active',
      ...(overrides.profile ?? {}),
    },
    memberships: overrides.memberships ?? [],
    currentOrganizationId: overrides.currentOrganizationId,
  }
}

describe('rbac access-state resolution', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns unauthenticated when there is no session user', () => {
    const result = deriveAccessState({
      sessionUserId: null,
      context: null,
    })

    expect(result).toEqual({
      accessState: 'unauthenticated',
      effectiveMembership: null,
    })
  })

  it('returns super_active for active super users', () => {
    const result = deriveAccessState({
      sessionUserId: 'user-1',
      context: createAuthContext({
        profile: {
          userId: 'user-1',
          globalRole: 'super',
          accountStatus: 'active',
        },
      }),
    })

    expect(result).toEqual({
      accessState: 'super_active',
      effectiveMembership: null,
    })
  })

  it('returns admin_active when an approved admin membership exists', () => {
    const result = deriveAccessState({
      sessionUserId: 'user-1',
      context: createAuthContext({
        profile: {
          userId: 'user-1',
          globalRole: 'admin',
          accountStatus: 'active',
        },
        memberships: [
          {
            organizationId: 'org-1',
            role: 'admin',
            status: 'approved',
            approvedAt: '2026-03-07T01:00:00.000Z',
          },
        ],
      }),
    })

    expect(result.accessState).toBe('admin_active')
    expect(result.effectiveMembership).toMatchObject({
      organizationId: 'org-1',
      role: 'admin',
      status: 'approved',
      selectionSource: 'role_priority',
    })
  })

  it('returns admin_pending when only a pending admin membership exists', () => {
    const result = deriveAccessState({
      sessionUserId: 'user-1',
      context: createAuthContext({
        profile: {
          userId: 'user-1',
          globalRole: 'admin',
          accountStatus: 'active',
        },
        memberships: [
          {
            organizationId: 'org-1',
            role: 'admin',
            status: 'pending',
            createdAt: '2026-03-07T01:00:00.000Z',
          },
        ],
      }),
    })

    expect(result.accessState).toBe('admin_pending')
    expect(result.effectiveMembership).toMatchObject({
      organizationId: 'org-1',
      role: 'admin',
      status: 'pending',
      selectionSource: 'status_fallback',
    })
  })

  it('returns admin_rejected when only a rejected admin membership exists', () => {
    const result = deriveAccessState({
      sessionUserId: 'user-1',
      context: createAuthContext({
        profile: {
          userId: 'user-1',
          globalRole: 'admin',
          accountStatus: 'active',
        },
        memberships: [
          {
            organizationId: 'org-1',
            role: 'admin',
            status: 'rejected',
            createdAt: '2026-03-07T01:00:00.000Z',
            rejectionReason: 'Duplicate admin request',
          },
        ],
      }),
    })

    expect(result.accessState).toBe('admin_rejected')
    expect(result.effectiveMembership).toMatchObject({
      organizationId: 'org-1',
      role: 'admin',
      status: 'rejected',
      selectionSource: 'status_fallback',
    })
  })

  it('returns user_active when an approved user membership exists', () => {
    const result = deriveAccessState({
      sessionUserId: 'user-1',
      context: createAuthContext({
        memberships: [
          {
            organizationId: 'org-1',
            role: 'user',
            status: 'approved',
            approvedAt: '2026-03-07T01:00:00.000Z',
          },
        ],
      }),
    })

    expect(result.accessState).toBe('user_active')
    expect(result.effectiveMembership).toMatchObject({
      organizationId: 'org-1',
      role: 'user',
      status: 'approved',
      selectionSource: 'role_priority',
    })
  })

  it('returns no_membership_or_inactive for active accounts without usable memberships', () => {
    const result = deriveAccessState({
      sessionUserId: 'user-1',
      context: createAuthContext(),
    })

    expect(result).toEqual({
      accessState: 'no_membership_or_inactive',
      effectiveMembership: null,
    })
  })

  it('returns no_membership_or_inactive when account status is not active', () => {
    const result = deriveAccessState({
      sessionUserId: 'user-1',
      context: createAuthContext({
        profile: {
          userId: 'user-1',
          globalRole: 'user',
          accountStatus: 'suspended',
        },
        memberships: [
          {
            organizationId: 'org-1',
            role: 'user',
            status: 'approved',
            approvedAt: '2026-03-07T01:00:00.000Z',
          },
        ],
      }),
    })

    expect(result).toEqual({
      accessState: 'no_membership_or_inactive',
      effectiveMembership: null,
    })
  })

  it('prioritizes the selected organization membership over another approved membership', () => {
    const result = deriveAccessState({
      sessionUserId: 'user-1',
      selectedOrganizationId: 'org-2',
      context: createAuthContext({
        memberships: [
          {
            organizationId: 'org-1',
            role: 'admin',
            status: 'approved',
            approvedAt: '2026-03-07T01:00:00.000Z',
          },
          {
            organizationId: 'org-2',
            role: 'admin',
            status: 'pending',
            createdAt: '2026-03-06T01:00:00.000Z',
          },
        ],
      }),
    })

    expect(result.accessState).toBe('admin_pending')
    expect(result.effectiveMembership).toMatchObject({
      organizationId: 'org-2',
      status: 'pending',
      selectionSource: 'current_organization',
    })
  })

  it('keeps access state unresolved until auth context is set in the store', () => {
    const store = useRbacStore()

    store.setSessionUserId('user-1')

    expect(store.initialized).toBe(false)
    expect(store.accessState).toBeNull()
    expect(store.resolveAccessState()).toBeNull()

    store.setAuthContext(
      createAuthContext({
        memberships: [
          {
            organizationId: 'org-1',
            role: 'user',
            status: 'approved',
            approvedAt: '2026-03-07T01:00:00.000Z',
          },
        ],
      }),
    )

    expect(store.initialized).toBe(true)
    expect(store.accessState).toBe('user_active')
    expect(store.effectiveMembership).toMatchObject({
      organizationId: 'org-1',
      status: 'approved',
    })
  })
})
