import { describe, expect, it } from 'vitest'

import { deriveAccessState } from '@/stores/rbac'

describe('deriveAccessState', () => {
  it('returns admin_pending when the selected membership is pending admin access', () => {
    const resolution = deriveAccessState({
      sessionUserId: 'user-1',
      context: {
        profile: {
          userId: 'user-1',
          globalRole: 'user',
          accountStatus: 'active',
        },
        memberships: [
          {
            organizationId: 'org-1',
            role: 'admin',
            status: 'pending',
          },
        ],
        currentOrganizationId: 'org-1',
      },
    })

    expect(resolution.accessState).toBe('admin_pending')
  })

  it('returns admin_rejected when the best available membership is a rejected admin request', () => {
    const resolution = deriveAccessState({
      sessionUserId: 'user-1',
      context: {
        profile: {
          userId: 'user-1',
          globalRole: 'user',
          accountStatus: 'active',
        },
        memberships: [
          {
            organizationId: 'org-1',
            role: 'admin',
            status: 'rejected',
            rejectionReason: '증빙 서류 미제출',
          },
        ],
      },
    })

    expect(resolution.accessState).toBe('admin_rejected')
    expect(resolution.effectiveMembership?.rejectionReason).toBe('증빙 서류 미제출')
  })

  it('keeps legacy organization-scoped pilot users active through the compatibility fallback', () => {
    const resolution = deriveAccessState({
      sessionUserId: 'user-1',
      context: {
        profile: {
          userId: 'user-1',
          globalRole: 'admin',
          accountStatus: 'active',
        },
        memberships: [],
        currentOrganizationId: 'org-legacy',
      },
      fallbackLegacyOrganizationId: 'org-legacy',
    })

    expect(resolution.accessState).toBe('admin_active')
    expect(resolution.effectiveMembership).toMatchObject({
      organizationId: 'org-legacy',
      role: 'admin',
      status: 'approved',
    })
  })
})
