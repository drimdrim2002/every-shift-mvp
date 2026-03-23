import type { LocationQuery, LocationQueryValue, RouteLocationNormalized } from 'vue-router'
import { ADMIN_DASHBOARD_ROUTE_PATH, ONBOARDING_ROUTE_PATH } from '@/constants/routes'
import type { OnboardingStepKey } from '@/types/onboarding'

export type OnboardingEntryMode = 'manual' | 'excel' | 'create_schedule'

export interface OnboardingRouteContext {
  isOnboardingSource: boolean
  step: OnboardingStepKey | null
  returnTo: string
  returnStep: OnboardingStepKey | null
  entry: OnboardingEntryMode | null
  openCreateSchedule: boolean
  scheduleStarted: boolean
  resumeStep: OnboardingStepKey | null
}

export interface OnboardingQueryOptions {
  step: OnboardingStepKey
  returnTo?: string
  returnStep?: OnboardingStepKey
  entry?: OnboardingEntryMode
  openCreateSchedule?: boolean
  scheduleStarted?: boolean
  resumeStep?: OnboardingStepKey
}

function getQueryString(value: LocationQueryValue | LocationQueryValue[] | undefined): string | null {
  if (Array.isArray(value)) {
    for (const candidate of value) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate
      }
    }
    return null
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value
  }

  return null
}

export function isOnboardingStepKey(value: unknown): value is OnboardingStepKey {
  return (
    value === 'organization_info' || value === 'employee_seed' || value === 'schedule_request'
  )
}

export function isOnboardingEntryMode(value: unknown): value is OnboardingEntryMode {
  return value === 'manual' || value === 'excel' || value === 'create_schedule'
}

export function sanitizeOnboardingReturnPath(value: string | null | undefined): string {
  if (!value) {
    return ONBOARDING_ROUTE_PATH
  }

  if (!value.startsWith('/')) {
    return ONBOARDING_ROUTE_PATH
  }

  if (value.startsWith('//') || value.includes('://')) {
    return ONBOARDING_ROUTE_PATH
  }

  return value
}

export function resolveOnboardingRouteContext(query: LocationQuery): OnboardingRouteContext {
  const stepValue = getQueryString(query.step)
  const returnStepValue = getQueryString(query.returnStep)
  const entryValue = getQueryString(query.entry)
  const resumeStepValue = getQueryString(query.resumeStep)

  return {
    isOnboardingSource: getQueryString(query.source) === 'onboarding',
    step: isOnboardingStepKey(stepValue) ? stepValue : null,
    returnTo: sanitizeOnboardingReturnPath(getQueryString(query.returnTo)),
    returnStep: isOnboardingStepKey(returnStepValue) ? returnStepValue : null,
    entry: isOnboardingEntryMode(entryValue) ? entryValue : null,
    openCreateSchedule: getQueryString(query.openCreateSchedule) === '1',
    scheduleStarted: getQueryString(query.scheduleStarted) === '1',
    resumeStep: isOnboardingStepKey(resumeStepValue) ? resumeStepValue : null,
  }
}

export function buildOnboardingQuery(options: OnboardingQueryOptions) {
  const query: Record<string, string> = {
    source: 'onboarding',
    step: options.step,
    returnTo: sanitizeOnboardingReturnPath(options.returnTo ?? ONBOARDING_ROUTE_PATH),
    returnStep: options.returnStep ?? options.step,
  }

  if (options.entry) {
    query.entry = options.entry
  }

  if (options.openCreateSchedule) {
    query.openCreateSchedule = '1'
  }

  if (options.scheduleStarted) {
    query.scheduleStarted = '1'
  }

  if (options.resumeStep) {
    query.resumeStep = options.resumeStep
  }

  return query
}

export function isEmployeeSeedDeepLinkTarget(route: RouteLocationNormalized): boolean {
  const context = resolveOnboardingRouteContext(route.query)
  return (
    context.isOnboardingSource &&
    route.path === '/schedule/step3' &&
    context.step === 'employee_seed' &&
    (context.entry === 'manual' || context.entry === 'excel')
  )
}

export function isScheduleRequestDeepLinkTarget(route: RouteLocationNormalized): boolean {
  const context = resolveOnboardingRouteContext(route.query)
  return (
    context.isOnboardingSource &&
    ((route.path === ADMIN_DASHBOARD_ROUTE_PATH &&
      context.step === 'schedule_request' &&
      context.entry === 'create_schedule' &&
      context.openCreateSchedule) ||
      (route.path === '/' &&
        context.step === 'schedule_request' &&
        context.entry === 'create_schedule' &&
        context.openCreateSchedule) ||
      (route.path === '/schedule/step1' && context.step === 'schedule_request'))
  )
}

export function isAllowedOnboardingCompatibilityTarget(route: RouteLocationNormalized): boolean {
  return isEmployeeSeedDeepLinkTarget(route) || isScheduleRequestDeepLinkTarget(route)
}
