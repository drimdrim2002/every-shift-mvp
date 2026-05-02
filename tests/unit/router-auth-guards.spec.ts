import { describe, expect, it } from 'vitest'

import {
  ACCESS_PENDING_ROUTE_PATH,
  ACCESS_REJECTED_ROUTE_PATH,
  APP_HOME_ROUTE_PATH,
  APP_OPS_ORGANIZATION_SETUP_ROUTE_PATH,
  LEGACY_APPROVAL_QUEUE_ROUTE_PATH,
  LEGACY_OPS_ORGANIZATION_SETUP_ROUTE_PATH,
  LEGACY_SCHEDULE_STEP1_ROUTE_PATH,
  LOGIN_ROUTE_PATH,
  OAUTH_CALLBACK_ROUTE_PATH,
  PUBLIC_ROOT_ROUTE_PATH,
  SOCIAL_SIGNUP_COMPLETE_ROUTE_PATH,
  buildCanonicalStep5RouteLocation,
  getApprovalQueueRoutePath,
  getLegacyRedirectTarget,
  getScheduleStepRoutePath,
  getUserHomeRoutePath,
  isApprovalQueueRoutePath,
  isOpsRoutePath,
  isScheduleRoutePath,
  isUserHomeRoutePath,
} from '@/constants/routes'
import { resolveAuthNavigationTarget, resolveRouteAccessTarget } from '@/router/guards'

describe('route contract', () => {
  it('keeps public root distinct from the canonical app root', () => {
    expect(PUBLIC_ROOT_ROUTE_PATH).not.toBe(APP_HOME_ROUTE_PATH)
  })

  it('maps legacy approval routes into canonical app routes', () => {
    expect(getLegacyRedirectTarget(LEGACY_APPROVAL_QUEUE_ROUTE_PATH)).toBe(getApprovalQueueRoutePath())
  })

  it('classifies canonical and legacy launch-core routes through shared helpers', () => {
    expect(isApprovalQueueRoutePath(LEGACY_APPROVAL_QUEUE_ROUTE_PATH)).toBe(true)
    expect(isUserHomeRoutePath(getUserHomeRoutePath())).toBe(true)
    expect(isOpsRoutePath(LEGACY_OPS_ORGANIZATION_SETUP_ROUTE_PATH)).toBe(true)
    expect(isOpsRoutePath(APP_OPS_ORGANIZATION_SETUP_ROUTE_PATH)).toBe(true)
    expect(
      isScheduleRoutePath((buildCanonicalStep5RouteLocation('schedule-1') as { path: string }).path)
    ).toBe(true)
    expect(isScheduleRoutePath('/schedule/step4')).toBe(true)
    expect(isScheduleRoutePath(getScheduleStepRoutePath(1))).toBe(true)
  })
})

describe('resolveAuthNavigationTarget', () => {
  it('redirects pending admins away from the app into the pending access screen', () => {
    const redirect = resolveAuthNavigationTarget({
      toPath: PUBLIC_ROOT_ROUTE_PATH,
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

  it('redirects active users away from login into the canonical restricted user home', () => {
    const redirect = resolveAuthNavigationTarget({
      toPath: LOGIN_ROUTE_PATH,
      isAuthenticated: true,
      accessState: 'user_active',
    })

    expect(redirect).toBe(getUserHomeRoutePath())
  })

  it('redirects active admins away from login into the canonical app home', () => {
    const redirect = resolveAuthNavigationTarget({
      toPath: LOGIN_ROUTE_PATH,
      isAuthenticated: true,
      accessState: 'admin_active',
    })

    expect(redirect).toBe(APP_HOME_ROUTE_PATH)
  })

  it('redirects active users away from the public root into the canonical app home', () => {
    const redirect = resolveAuthNavigationTarget({
      toPath: PUBLIC_ROOT_ROUTE_PATH,
      isAuthenticated: true,
      accessState: 'user_active',
    })

    expect(redirect).toBe(APP_HOME_ROUTE_PATH)
  })

  it('redirects super users away from login into the canonical approval queue', () => {
    const redirect = resolveAuthNavigationTarget({
      toPath: LOGIN_ROUTE_PATH,
      isAuthenticated: true,
      accessState: 'super_active',
    })

    expect(redirect).toBe(getApprovalQueueRoutePath())
  })

  it('redirects super users away from the public root into the canonical app home', () => {
    const redirect = resolveAuthNavigationTarget({
      toPath: PUBLIC_ROOT_ROUTE_PATH,
      isAuthenticated: true,
      accessState: 'super_active',
      abilities: {
        canViewApprovalQueue: true,
        canSwitchOrganization: true,
        canViewRestrictedUserHome: false,
        canManageOrganizationSetup: false,
        canManageEmployees: false,
        canManageSchedules: false,
      },
    })

    expect(redirect).toBe(APP_HOME_ROUTE_PATH)
  })

  it('redirects super users away from the public root into the canonical app home when org-admin abilities are unlocked', () => {
    const redirect = resolveAuthNavigationTarget({
      toPath: PUBLIC_ROOT_ROUTE_PATH,
      isAuthenticated: true,
      accessState: 'super_active',
      abilities: {
        canViewApprovalQueue: true,
        canSwitchOrganization: true,
        canViewRestrictedUserHome: false,
        canManageOrganizationSetup: true,
        canManageEmployees: true,
        canManageSchedules: true,
      },
    })

    expect(redirect).toBe(APP_HOME_ROUTE_PATH)
  })
})

describe('resolveRouteAccessTarget', () => {
  it('keeps super users approval-first on the canonical app home when no active org is selected', () => {
    const redirect = resolveRouteAccessTarget({
      toPath: APP_HOME_ROUTE_PATH,
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

    expect(redirect).toBe(getApprovalQueueRoutePath())
  })

  it('blocks super users from org-admin flows until an organization is selected', () => {
    const redirect = resolveRouteAccessTarget({
      toPath: LEGACY_SCHEDULE_STEP1_ROUTE_PATH,
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

    expect(redirect).toBe(getApprovalQueueRoutePath())
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
        toPath: getApprovalQueueRoutePath(),
        accessState: 'user_active',
        abilities,
        selectedOrganizationId: 'org-1',
      }),
    ).toBe(getUserHomeRoutePath())

    expect(
      resolveRouteAccessTarget({
        toPath: LEGACY_OPS_ORGANIZATION_SETUP_ROUTE_PATH,
        accessState: 'user_active',
        abilities,
        selectedOrganizationId: 'org-1',
        requiresOrgContext: true,
        requiredOrgRole: 'admin',
      }),
    ).toBe(getUserHomeRoutePath())
  })

  it('redirects restricted users away from schedule generation routes into the canonical restricted home', () => {
    const redirect = resolveRouteAccessTarget({
      toPath: getScheduleStepRoutePath(1),
      accessState: 'user_active',
      abilities: {
        canViewApprovalQueue: false,
        canSwitchOrganization: true,
        canViewRestrictedUserHome: true,
        canManageOrganizationSetup: false,
        canManageEmployees: false,
        canManageSchedules: false,
      },
      selectedOrganizationId: 'org-1',
      requiresOrgContext: true,
      requiredOrgRole: 'admin',
    })

    expect(redirect).toBe(getUserHomeRoutePath())
  })

  it('allows super users with unlocked org-admin abilities to remain on canonical app home', () => {
    const redirect = resolveRouteAccessTarget({
      toPath: APP_HOME_ROUTE_PATH,
      accessState: 'super_active',
      abilities: {
        canViewApprovalQueue: true,
        canSwitchOrganization: true,
        canViewRestrictedUserHome: false,
        canManageOrganizationSetup: true,
        canManageEmployees: true,
        canManageSchedules: true,
      },
      selectedOrganizationId: 'org-1',
    })

    expect(redirect).toBeNull()
  })

  it('redirects no-membership users away from app home when the route does not allow no membership', () => {
    const redirect = resolveRouteAccessTarget({
      toPath: APP_HOME_ROUTE_PATH,
      accessState: 'no_membership_or_inactive',
      abilities: {
        canViewApprovalQueue: false,
        canSwitchOrganization: false,
        canViewRestrictedUserHome: false,
        canManageOrganizationSetup: false,
        canManageEmployees: false,
        canManageSchedules: false,
      },
    })

    expect(redirect).toBe(LOGIN_ROUTE_PATH)
  })

  it('allows no-membership social users to complete signup on the social completion route', () => {
    const redirect = resolveRouteAccessTarget({
      toPath: SOCIAL_SIGNUP_COMPLETE_ROUTE_PATH,
      accessState: 'no_membership_or_inactive',
      abilities: {
        canViewApprovalQueue: false,
        canSwitchOrganization: false,
        canViewRestrictedUserHome: false,
        canManageOrganizationSetup: false,
        canManageEmployees: false,
        canManageSchedules: false,
      },
      allowsNoMembership: true,
    })

    expect(redirect).toBeNull()
  })

  it('allows no-membership social users to enter the OAuth callback route', () => {
    const redirect = resolveRouteAccessTarget({
      toPath: OAUTH_CALLBACK_ROUTE_PATH,
      accessState: 'no_membership_or_inactive',
      abilities: {
        canViewApprovalQueue: false,
        canSwitchOrganization: false,
        canViewRestrictedUserHome: false,
        canManageOrganizationSetup: false,
        canManageEmployees: false,
        canManageSchedules: false,
      },
      allowsNoMembership: true,
    })

    expect(redirect).toBeNull()
  })
})
