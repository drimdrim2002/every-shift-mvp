import type { LocationQuery, RouteLocationRaw } from 'vue-router'
import type { AccessState } from '@/types/rbac'

export const PUBLIC_ROOT_ROUTE_PATH = '/'
export const PUBLIC_FAQ_ROUTE_PATH = '/faq'
export const APP_HOME_ROUTE_PATH = '/app'
export const APP_APPROVAL_QUEUE_ROUTE_PATH = `${APP_HOME_ROUTE_PATH}/admin/approval-queue`
export const APP_USER_HOME_ROUTE_PATH = `${APP_HOME_ROUTE_PATH}/home/user`
export const APP_OPS_ROUTE_PREFIX = `${APP_HOME_ROUTE_PATH}/ops/`
export const APP_OPS_ORGANIZATION_SETUP_ROUTE_PATH = `${APP_OPS_ROUTE_PREFIX}organization-setup`
export const APP_OPS_OFF_REQUEST_POLICY_SETUP_ROUTE_PATH = `${APP_OPS_ROUTE_PREFIX}off-request-policy-setup`
export const APP_SCHEDULE_ROUTE_PREFIX = `${APP_HOME_ROUTE_PATH}/schedule/`
export const APP_SCHEDULE_RESULTS_ROUTE_PATH = `${APP_HOME_ROUTE_PATH}/schedule-results`
export const APP_WORK_PERFORMANCE_ROUTE_PATH = `${APP_HOME_ROUTE_PATH}/work-performance`

export const LOGIN_ROUTE_PATH = '/login'
export const SIGNUP_ROUTE_PATH = '/signup'
export const OAUTH_CALLBACK_ROUTE_PATH = '/auth/callback'
export const SOCIAL_SIGNUP_COMPLETE_ROUTE_PATH = '/auth/signup-complete'
export const ACCESS_PENDING_ROUTE_PATH = '/access/pending'
export const ACCESS_REJECTED_ROUTE_PATH = '/access/rejected'

const LEGACY_OPS_ROUTE_PREFIX = '/ops/'
const LEGACY_SCHEDULE_ROUTE_PREFIX = '/schedule/'

export const LEGACY_APPROVAL_QUEUE_ROUTE_PATH = '/admin/approval-queue'
export const LEGACY_USER_HOME_ROUTE_PATH = '/home/user'
export const LEGACY_OPS_ORGANIZATION_SETUP_ROUTE_PATH = '/ops/organization-setup'
export const LEGACY_OPS_OFF_REQUEST_POLICY_SETUP_ROUTE_PATH = '/ops/off-request-policy-setup'
export const LEGACY_SCHEDULE_STEP1_ROUTE_PATH = '/schedule/step1'
export const LEGACY_SCHEDULE_STEP2_ROUTE_PATH = '/schedule/step2'
export const LEGACY_SCHEDULE_STEP3_ROUTE_PATH = '/schedule/step3'
export const LEGACY_SCHEDULE_STEP4_ROUTE_PATH = '/schedule/step4'
export const LEGACY_SCHEDULE_STEP5_ROUTE_PREFIX = '/schedule/step5/'
export const APP_SCHEDULE_STEP5_ROUTE_PREFIX = `${APP_SCHEDULE_ROUTE_PREFIX}step5/`

const AUTH_PAGE_PATH_SET = new Set([LOGIN_ROUTE_PATH, SIGNUP_ROUTE_PATH])

function normalizeRouteQueryValue(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.length > 0 ? value : null
  }

  if (!Array.isArray(value)) {
    return null
  }

  for (const entry of value) {
    if (typeof entry === 'string' && entry.length > 0) {
      return entry
    }
  }

  return null
}

function normalizeMultiValueRouteQuery(value: unknown): string[] {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  }

  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((entry) => {
    if (typeof entry !== 'string') {
      return []
    }

    return entry
      .split(',')
      .map((nestedEntry) => nestedEntry.trim())
      .filter((nestedEntry) => nestedEntry.length > 0)
  })
}

export function getAppHomeRoutePath(): string {
  return APP_HOME_ROUTE_PATH
}

export function getDashboardCreateScheduleRouteKey(): string {
  return `${getAppHomeRoutePath()}?createSchedule=1`
}

export function getApprovalQueueRoutePath(): string {
  return APP_APPROVAL_QUEUE_ROUTE_PATH
}

export function getUserHomeRoutePath(): string {
  return APP_USER_HOME_ROUTE_PATH
}

export function getOpsOrganizationSetupRoutePath(): string {
  return APP_OPS_ORGANIZATION_SETUP_ROUTE_PATH
}

export function getOpsOffRequestPolicySetupRoutePath(): string {
  return APP_OPS_OFF_REQUEST_POLICY_SETUP_ROUTE_PATH
}

export function getScheduleStepRoutePath(step: 1 | 2 | 3 | 4): string {
  return `${APP_SCHEDULE_ROUTE_PREFIX}step${step}`
}

export function getScheduleResultsRoutePath(): string {
  return APP_SCHEDULE_RESULTS_ROUTE_PATH
}

export function getWorkPerformanceRoutePath(): string {
  return APP_WORK_PERFORMANCE_ROUTE_PATH
}

export function buildStep4RouteLocation(options?: {
  versionId?: string | null
}): RouteLocationRaw {
  return options?.versionId
    ? {
        path: getScheduleStepRoutePath(4),
        query: {
          version: options.versionId,
        },
      }
    : {
        path: getScheduleStepRoutePath(4),
      }
}

export function getScheduleStep5RoutePath(scheduleKey: string): string {
  return `${APP_SCHEDULE_STEP5_ROUTE_PREFIX}${scheduleKey}`
}

export function buildStep5RouteLocation(
  scheduleKey: string,
  options?: {
    versionId?: string | null
    compareVersionId?: string | null
    autoStart?: boolean
  }
): RouteLocationRaw {
  const query: Record<string, string> = {}

  if (options?.versionId) {
    query.version = options.versionId
  }

  if (options?.compareVersionId) {
    query.compare = options.compareVersionId
  }

  if (options?.autoStart) {
    query.autoStart = '1'
  }

  return Object.keys(query).length > 0
    ? {
        path: getScheduleStep5RoutePath(scheduleKey),
        query,
      }
    : {
        path: getScheduleStep5RoutePath(scheduleKey),
      }
}

export function buildCanonicalStep5RouteLocation(
  scheduleKey: string,
  options?: { autoStart?: boolean }
): RouteLocationRaw {
  return buildStep5RouteLocation(scheduleKey, {
    autoStart: options?.autoStart,
  })
}

export function parseStep5RouteQuery(
  query: LocationQuery | Record<string, unknown> | null | undefined
): {
  requestedFocusVersionId: string | null
  requestedCompareVersionIds: string[]
  autoStart: boolean
} {
  return {
    requestedFocusVersionId: normalizeRouteQueryValue(query?.version),
    requestedCompareVersionIds: normalizeMultiValueRouteQuery(query?.compare),
    autoStart: normalizeRouteQueryValue(query?.autoStart) === '1',
  }
}

export function getStep5ScheduleKeyFromPath(path: string): string | null {
  if (path.startsWith(APP_SCHEDULE_STEP5_ROUTE_PREFIX)) {
    return path.slice(APP_SCHEDULE_STEP5_ROUTE_PREFIX.length) || null
  }

  if (path.startsWith(LEGACY_SCHEDULE_STEP5_ROUTE_PREFIX)) {
    return path.slice(LEGACY_SCHEDULE_STEP5_ROUTE_PREFIX.length) || null
  }

  return null
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

export function isSocialSignupCompleteRoutePath(path: string): boolean {
  return path === SOCIAL_SIGNUP_COMPLETE_ROUTE_PATH
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

export function isScheduleRoutePath(path: string): boolean {
  return path.startsWith(APP_SCHEDULE_ROUTE_PREFIX) || path.startsWith(LEGACY_SCHEDULE_ROUTE_PREFIX)
}

export function isScheduleLookupRoutePath(path: string): boolean {
  return path === APP_SCHEDULE_RESULTS_ROUTE_PATH || path === APP_WORK_PERFORMANCE_ROUTE_PATH
}

export function isOpsRoutePath(path: string): boolean {
  return path.startsWith(APP_OPS_ROUTE_PREFIX) || path.startsWith(LEGACY_OPS_ROUTE_PREFIX)
}

export function isApprovalQueueRoutePath(path: string): boolean {
  return path === APP_APPROVAL_QUEUE_ROUTE_PATH || path === LEGACY_APPROVAL_QUEUE_ROUTE_PATH
}

export function isUserHomeRoutePath(path: string): boolean {
  return path === APP_USER_HOME_ROUTE_PATH || path === LEGACY_USER_HOME_ROUTE_PATH
}

export function isScheduleStep5RoutePath(path: string): boolean {
  return path.startsWith(APP_SCHEDULE_STEP5_ROUTE_PREFIX)
}

export function isLegacyScheduleStep5RoutePath(path: string): boolean {
  return path.startsWith(LEGACY_SCHEDULE_STEP5_ROUTE_PREFIX)
}

export function isLegacyAppRoutePath(path: string): boolean {
  return (
    Object.prototype.hasOwnProperty.call(LEGACY_APP_ROUTE_REDIRECTS, path)
    || isLegacyScheduleStep5RoutePath(path)
  )
}

export function getLegacyRedirectTarget(path: string): string | null {
  const redirectTarget = LEGACY_APP_ROUTE_REDIRECTS[path as keyof typeof LEGACY_APP_ROUTE_REDIRECTS]
  if (redirectTarget) {
    return redirectTarget
  }

  if (!isLegacyScheduleStep5RoutePath(path)) {
    return null
  }

  const scheduleKey = getStep5ScheduleKeyFromPath(path)
  return scheduleKey ? getScheduleStep5RoutePath(scheduleKey) : null
}

export function normalizeAppContractPath(path: string): string {
  return getLegacyRedirectTarget(path) ?? path
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
