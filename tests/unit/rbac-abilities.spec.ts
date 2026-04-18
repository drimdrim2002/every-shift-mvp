import { describe, expect, it } from 'vitest'

import { buildAccessAbilities } from '@/utils/rbacAccess'

describe('buildAccessAbilities', () => {
  it('returns approval-only access for super users without an active organization', () => {
    expect(
      buildAccessAbilities({
        accessState: 'super_active',
        selectedOrganizationId: null,
        effectiveMembership: null,
      }),
    ).toMatchObject({
      canViewApprovalQueue: true,
      canSwitchOrganization: true,
      canManageEmployees: false,
      canManageOrganizationSetup: false,
      canManageSchedules: false,
    })
  })

  it('returns full management abilities for approved admin memberships', () => {
    expect(
      buildAccessAbilities({
        accessState: 'admin_active',
        selectedOrganizationId: 'org-1',
        effectiveMembership: {
          organizationId: 'org-1',
          role: 'admin',
          status: 'approved',
          selectionSource: 'current_organization',
        },
      }),
    ).toMatchObject({
      canManageOrganizationSetup: true,
      canManageEmployees: true,
      canManageSchedules: true,
    })
  })

  it('returns restricted home access for approved user memberships', () => {
    expect(
      buildAccessAbilities({
        accessState: 'user_active',
        selectedOrganizationId: 'org-1',
        effectiveMembership: {
          organizationId: 'org-1',
          role: 'user',
          status: 'approved',
          selectionSource: 'current_organization',
        },
      }),
    ).toMatchObject({
      canViewRestrictedUserHome: true,
      canManageSchedules: false,
    })
  })
})
