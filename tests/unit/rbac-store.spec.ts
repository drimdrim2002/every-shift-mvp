import { describe, expect, it } from 'vitest'

import { deriveAccessState } from '@/stores/rbac'
import { pickDefaultOrganizationId } from '@/utils/rbacAccess'

describe('deriveAccessState', () => {
  it('prefers an approved admin membership over stale pending metadata for the same organization', () => {
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
            createdAt: '2026-04-18T03:03:58.048Z',
          },
          {
            membershipId: 'membership-1',
            organizationId: 'org-1',
            role: 'admin',
            status: 'approved',
            approvedAt: '2026-04-18T04:00:00.000Z',
          },
        ],
        currentOrganizationId: 'org-1',
      },
    })

    expect(resolution.accessState).toBe('admin_active')
    expect(resolution.effectiveMembership).toMatchObject({
      membershipId: 'membership-1',
      organizationId: 'org-1',
      role: 'admin',
      status: 'approved',
    })
  })

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

  it('picks the earliest approved admin organization when no persisted selection exists', () => {
    expect(
      pickDefaultOrganizationId({
        accessState: 'admin_active',
        memberships: [
          {
            organizationId: 'org-b',
            role: 'admin',
            status: 'approved',
            approvedAt: '2026-04-18T02:00:00.000Z',
          },
          {
            organizationId: 'org-a',
            role: 'admin',
            status: 'approved',
            approvedAt: '2026-04-18T01:00:00.000Z',
          },
        ],
        persistedOrganizationId: null,
      }),
    ).toBe('org-a')
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
      selectionSource: 'legacy_fallback',
    })
  })

  it('keeps approved memberships active even when the profile account status is stale', () => {
    const resolution = deriveAccessState({
      sessionUserId: 'user-1',
      context: {
        profile: {
          userId: 'user-1',
          globalRole: 'user',
          accountStatus: 'pending',
        },
        memberships: [
          {
            organizationId: 'org-1',
            role: 'user',
            status: 'approved',
          },
        ],
        currentOrganizationId: 'org-1',
      },
    })

    expect(resolution.accessState).toBe('user_active')
  })

  it('keeps blocked admin access visible even when the profile account status is not active', () => {
    const resolution = deriveAccessState({
      sessionUserId: 'user-1',
      context: {
        profile: {
          userId: 'user-1',
          globalRole: 'user',
          accountStatus: 'rejected',
        },
        memberships: [
          {
            organizationId: 'org-1',
            role: 'admin',
            status: 'rejected',
            rejectionReason: '반려',
          },
        ],
      },
    })

    expect(resolution.accessState).toBe('admin_rejected')
  })
})
