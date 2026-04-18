import { describe, expect, it } from 'vitest'

import {
  ACCESS_PENDING_ROUTE_PATH,
  ACCESS_REJECTED_ROUTE_PATH,
  APPROVAL_QUEUE_ROUTE_PATH,
  HOME_ROUTE_PATH,
  LOGIN_ROUTE_PATH,
  USER_HOME_ROUTE_PATH,
} from '@/constants/routes'
import { resolveAuthNavigationTarget, resolveRouteAccessTarget } from '@/router/guards'

describe('resolveAuthNavigationTarget', () => {
  it('redirects pending admins away from the app into the pending access screen', () => {
    const redirect = resolveAuthNavigationTarget({
      toPath: '/',
      isAuthenticated: true,
      accessState: 'admin_pending',
    })

    expect(redirect).toBe(ACCESS_PENDING_ROUTE_PATH)
  })

  it('redirects rejected admins away from auth pages into the rejected access screen', () => {
    const redirect = resolveAuthNavigationTarget({
      toPath: LOGIN_ROUTE_PATH,
      isAuthenticated: true,
      accessState: 'admin_rejected',
    })

    expect(redirect).toBe(ACCESS_REJECTED_ROUTE_PATH)
  })

  it('lets a blocked admin stay on the matching access-state page', () => {
    const redirect = resolveAuthNavigationTarget({
      toPath: ACCESS_PENDING_ROUTE_PATH,
      isAuthenticated: true,
      accessState: 'admin_pending',
    })

    expect(redirect).toBeNull()
  })

  it('redirects active users away from login into the normal app flow', () => {
    const redirect = resolveAuthNavigationTarget({
      toPath: LOGIN_ROUTE_PATH,
      isAuthenticated: true,
      accessState: 'user_active',
    })

    expect(redirect).toBe(USER_HOME_ROUTE_PATH)
  })

  it('redirects super users away from login into the approval queue', () => {
    const redirect = resolveAuthNavigationTarget({
      toPath: LOGIN_ROUTE_PATH,
      isAuthenticated: true,
      accessState: 'super_active',
    })

    expect(redirect).toBe(APPROVAL_QUEUE_ROUTE_PATH)
  })
})

describe('resolveRouteAccessTarget', () => {
  it('keeps super users approval-first on the dashboard when no active org is selected', () => {
    const redirect = resolveRouteAccessTarget({
      toPath: HOME_ROUTE_PATH,
      accessState: 'super_active',
      abilities: {
        canViewApprovalQueue: true,
        canSwitchOrganization: true,
        canViewRestrictedUserHome: false,
        canManageOrganizationSetup: false,
        canManageEmployees: false,
        canManageSchedules: false,
      },
      selectedOrganizationId: null,
    })

    expect(redirect).toBe(APPROVAL_QUEUE_ROUTE_PATH)
  })

  it('blocks super users from org-admin flows until an organization is selected', () => {
    const redirect = resolveRouteAccessTarget({
      toPath: '/schedule/step1',
      accessState: 'super_active',
      abilities: {
        canViewApprovalQueue: true,
        canSwitchOrganization: true,
        canViewRestrictedUserHome: false,
        canManageOrganizationSetup: false,
        canManageEmployees: false,
        canManageSchedules: false,
      },
      selectedOrganizationId: null,
      requiresOrgContext: true,
      requiredOrgRole: 'admin',
    })

    expect(redirect).toBe(APPROVAL_QUEUE_ROUTE_PATH)
  })

  it('blocks restricted users from approval queue and org-admin routes', () => {
    const abilities = {
      canViewApprovalQueue: false,
      canSwitchOrganization: true,
      canViewRestrictedUserHome: true,
      canManageOrganizationSetup: false,
      canManageEmployees: false,
      canManageSchedules: false,
    }

    expect(
      resolveRouteAccessTarget({
        toPath: APPROVAL_QUEUE_ROUTE_PATH,
        accessState: 'user_active',
        abilities,
        selectedOrganizationId: 'org-1',
      }),
    ).toBe(USER_HOME_ROUTE_PATH)

    expect(
      resolveRouteAccessTarget({
        toPath: '/ops/organization-setup',
        accessState: 'user_active',
        abilities,
        selectedOrganizationId: 'org-1',
        requiresOrgContext: true,
        requiredOrgRole: 'admin',
      }),
    ).toBe(USER_HOME_ROUTE_PATH)
  })
})
