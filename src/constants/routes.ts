import type { AccessState } from '@/types/rbac'

export const PUBLIC_ROOT_ROUTE_PATH = '/'
export const APP_HOME_ROUTE_PATH = '/app'

export const LOGIN_ROUTE_PATH = '/login'
export const SIGNUP_ROUTE_PATH = '/signup'
export const ACCESS_PENDING_ROUTE_PATH = '/access/pending'
export const ACCESS_REJECTED_ROUTE_PATH = '/access/rejected'

export const LEGACY_APPROVAL_QUEUE_ROUTE_PATH = '/admin/approval-queue'
export const LEGACY_USER_HOME_ROUTE_PATH = '/home/user'
export const LEGACY_OPS_ORGANIZATION_SETUP_ROUTE_PATH = '/ops/organization-setup'
export const LEGACY_OPS_OFF_REQUEST_POLICY_SETUP_ROUTE_PATH = '/ops/off-request-policy-setup'
export const LEGACY_SCHEDULE_STEP1_ROUTE_PATH = '/schedule/step1'
export const LEGACY_SCHEDULE_STEP2_ROUTE_PATH = '/schedule/step2'
export const LEGACY_SCHEDULE_STEP3_ROUTE_PATH = '/schedule/step3'
export const LEGACY_SCHEDULE_STEP4_ROUTE_PATH = '/schedule/step4'
export const LEGACY_SCHEDULE_STEP5_ROUTE_PREFIX = '/schedule/step5/'
export const APP_SCHEDULE_STEP5_ROUTE_PREFIX = `${APP_HOME_ROUTE_PATH}/schedule/step5/`

const AUTH_PAGE_PATH_SET = new Set([LOGIN_ROUTE_PATH, SIGNUP_ROUTE_PATH])

export function getAppHomeRoutePath(): string {
  return APP_HOME_ROUTE_PATH
}

export function getApprovalQueueRoutePath(): string {
  return `${APP_HOME_ROUTE_PATH}/admin/approval-queue`
}

export function getUserHomeRoutePath(): string {
  return `${APP_HOME_ROUTE_PATH}/home/user`
}

export function getOpsOrganizationSetupRoutePath(): string {
  return `${APP_HOME_ROUTE_PATH}/ops/organization-setup`
}

export function getOpsOffRequestPolicySetupRoutePath(): string {
  return `${APP_HOME_ROUTE_PATH}/ops/off-request-policy-setup`
}

export function getScheduleStepRoutePath(step: 1 | 2 | 3 | 4): string {
  return `${APP_HOME_ROUTE_PATH}/schedule/step${step}`
}

export function getScheduleStep5RoutePath(scheduleKey: string): string {
  return `${APP_SCHEDULE_STEP5_ROUTE_PREFIX}${scheduleKey}`
}

export const LEGACY_APP_ROUTE_REDIRECTS = Object.freeze({
  [LEGACY_APPROVAL_QUEUE_ROUTE_PATH]: getApprovalQueueRoutePath(),
  [LEGACY_USER_HOME_ROUTE_PATH]: getUserHomeRoutePath(),
  [LEGACY_OPS_ORGANIZATION_SETUP_ROUTE_PATH]: getOpsOrganizationSetupRoutePath(),
  [LEGACY_OPS_OFF_REQUEST_POLICY_SETUP_ROUTE_PATH]: getOpsOffRequestPolicySetupRoutePath(),
  [LEGACY_SCHEDULE_STEP1_ROUTE_PATH]: getScheduleStepRoutePath(1),
  [LEGACY_SCHEDULE_STEP2_ROUTE_PATH]: getScheduleStepRoutePath(2),
  [LEGACY_SCHEDULE_STEP3_ROUTE_PATH]: getScheduleStepRoutePath(3),
  [LEGACY_SCHEDULE_STEP4_ROUTE_PATH]: getScheduleStepRoutePath(4),
} satisfies Record<string, string>)

export function isAuthPagePath(path: string): boolean {
  return AUTH_PAGE_PATH_SET.has(path)
}

export function isAccessStateRoutePath(path: string): boolean {
  return path === ACCESS_PENDING_ROUTE_PATH || path === ACCESS_REJECTED_ROUTE_PATH
}

export function isPublicRootRoutePath(path: string): boolean {
  return path === PUBLIC_ROOT_ROUTE_PATH
}

export function isAppRoutePath(path: string): boolean {
  return path === APP_HOME_ROUTE_PATH || path.startsWith(`${APP_HOME_ROUTE_PATH}/`)
}

export function isScheduleStep5RoutePath(path: string): boolean {
  return path.startsWith(APP_SCHEDULE_STEP5_ROUTE_PREFIX)
}

export function isLegacyScheduleStep5RoutePath(path: string): boolean {
  return path.startsWith(LEGACY_SCHEDULE_STEP5_ROUTE_PREFIX)
}

export function isLegacyAppRoutePath(path: string): boolean {
  return Object.hasOwn(LEGACY_APP_ROUTE_REDIRECTS, path) || isLegacyScheduleStep5RoutePath(path)
}

export function getLegacyRedirectTarget(path: string): string | null {
  const redirectTarget = LEGACY_APP_ROUTE_REDIRECTS[path as keyof typeof LEGACY_APP_ROUTE_REDIRECTS]
  if (redirectTarget) {
    return redirectTarget
  }

  if (!isLegacyScheduleStep5RoutePath(path)) {
    return null
  }

  const scheduleKey = path.slice(LEGACY_SCHEDULE_STEP5_ROUTE_PREFIX.length)
  return scheduleKey ? getScheduleStep5RoutePath(scheduleKey) : null
}

export function resolvePostAuthRedirectPath(accessState: AccessState | null): string {
  switch (accessState) {
    case 'admin_pending':
      return ACCESS_PENDING_ROUTE_PATH
    case 'admin_rejected':
      return ACCESS_REJECTED_ROUTE_PATH
    case 'super_active':
      return getApprovalQueueRoutePath()
    case 'admin_active':
      return getAppHomeRoutePath()
    case 'user_active':
      return getUserHomeRoutePath()
    case 'no_membership_or_inactive':
    case 'unauthenticated':
      return LOGIN_ROUTE_PATH
    default:
      return getAppHomeRoutePath()
  }
}
