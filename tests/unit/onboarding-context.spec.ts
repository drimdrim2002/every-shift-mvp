import type { LocationQuery, RouteLocationNormalized } from 'vue-router'
import { describe, expect, it } from 'vitest'
import { ADMIN_DASHBOARD_ROUTE_PATH, ONBOARDING_ROUTE_PATH } from '@/constants/routes'
import {
  buildOnboardingQuery,
  isAllowedOnboardingCompatibilityTarget,
  isEmployeeSeedDeepLinkTarget,
  isScheduleRequestDeepLinkTarget,
  resolveOnboardingRouteContext,
} from '@/utils/onboarding-context'

function createRoute(path: string, query: LocationQuery = {}): RouteLocationNormalized {
  return {
    path,
    query,
  } as RouteLocationNormalized
}

describe('onboarding-context contract', () => {
  it('resolves canonical onboarding query values from array inputs', () => {
    const context = resolveOnboardingRouteContext({
      source: ['', 'onboarding'],
      step: ['', 'employee_seed'],
      returnTo: ['', '/schedule/step1'],
      returnStep: ['', 'employee_seed'],
      entry: ['', 'excel'],
      openCreateSchedule: ['', '1'],
      scheduleStarted: ['', '1'],
      resumeStep: ['', 'schedule_request'],
    })

    expect(context).toEqual({
      isOnboardingSource: true,
      step: 'employee_seed',
      returnTo: '/schedule/step1',
      returnStep: 'employee_seed',
      entry: 'excel',
      openCreateSchedule: true,
      scheduleStarted: true,
      resumeStep: 'schedule_request',
    })
  })

  it('sanitizes invalid onboarding query inputs without throwing', () => {
    const context = resolveOnboardingRouteContext({
      source: 'onboarding',
      step: 'bad_step',
      returnTo: 'https://evil.example/path',
      returnStep: 'unknown_step',
      entry: 'invalid_mode',
      openCreateSchedule: 'true',
      scheduleStarted: 'yes',
      resumeStep: 'unknown_step',
    } as LocationQuery)

    expect(context).toEqual({
      isOnboardingSource: true,
      step: null,
      returnTo: ONBOARDING_ROUTE_PATH,
      returnStep: null,
      entry: null,
      openCreateSchedule: false,
      scheduleStarted: false,
      resumeStep: null,
    })
  })

  it('falls back to /onboarding for empty, malformed, and scheme-relative return paths', () => {
    expect(resolveOnboardingRouteContext({ returnTo: '' }).returnTo).toBe(ONBOARDING_ROUTE_PATH)
    expect(resolveOnboardingRouteContext({ returnTo: 'dashboard/admin' }).returnTo).toBe(
      ONBOARDING_ROUTE_PATH,
    )
    expect(resolveOnboardingRouteContext({ returnTo: '//evil.example' }).returnTo).toBe(
      ONBOARDING_ROUTE_PATH,
    )
  })

  it('builds the default employee-seed onboarding query', () => {
    expect(
      buildOnboardingQuery({
        step: 'employee_seed',
        entry: 'manual',
      }),
    ).toEqual({
      source: 'onboarding',
      step: 'employee_seed',
      returnTo: ONBOARDING_ROUTE_PATH,
      returnStep: 'employee_seed',
      entry: 'manual',
    })
  })

  it('builds schedule-request queries with sanitized return path and optional flags', () => {
    expect(
      buildOnboardingQuery({
        step: 'schedule_request',
        entry: 'create_schedule',
        returnTo: 'https://evil.example/path',
        openCreateSchedule: true,
        scheduleStarted: true,
        resumeStep: 'schedule_request',
      }),
    ).toEqual({
      source: 'onboarding',
      step: 'schedule_request',
      returnTo: ONBOARDING_ROUTE_PATH,
      returnStep: 'schedule_request',
      entry: 'create_schedule',
      openCreateSchedule: '1',
      scheduleStarted: '1',
      resumeStep: 'schedule_request',
    })
  })

  it('accepts employee-seed compatibility deep links only on /schedule/step3 with manual or excel entry', () => {
    expect(
      isEmployeeSeedDeepLinkTarget(
        createRoute('/schedule/step3', buildOnboardingQuery({ step: 'employee_seed', entry: 'manual' })),
      ),
    ).toBe(true)
    expect(
      isEmployeeSeedDeepLinkTarget(
        createRoute('/schedule/step3', buildOnboardingQuery({ step: 'employee_seed', entry: 'excel' })),
      ),
    ).toBe(true)
    expect(
      isEmployeeSeedDeepLinkTarget(
        createRoute('/schedule/step3', {
          source: 'onboarding',
          step: 'employee_seed',
          entry: 'create_schedule',
        } as LocationQuery),
      ),
    ).toBe(false)
    expect(
      isEmployeeSeedDeepLinkTarget(
        createRoute('/dashboard/admin', buildOnboardingQuery({ step: 'employee_seed', entry: 'manual' })),
      ),
    ).toBe(false)
  })

  it('accepts schedule-request create entry on /dashboard/admin and / only when openCreateSchedule=1', () => {
    const query = buildOnboardingQuery({
      step: 'schedule_request',
      entry: 'create_schedule',
      openCreateSchedule: true,
    })

    expect(isScheduleRequestDeepLinkTarget(createRoute(ADMIN_DASHBOARD_ROUTE_PATH, query))).toBe(true)
    expect(isScheduleRequestDeepLinkTarget(createRoute('/', query))).toBe(true)
    expect(
      isScheduleRequestDeepLinkTarget(
        createRoute(
          ADMIN_DASHBOARD_ROUTE_PATH,
          buildOnboardingQuery({
            step: 'schedule_request',
            entry: 'create_schedule',
          }),
        ),
      ),
    ).toBe(false)
    expect(
      isScheduleRequestDeepLinkTarget(
        createRoute(
          ADMIN_DASHBOARD_ROUTE_PATH,
          buildOnboardingQuery({
            step: 'schedule_request',
            entry: 'manual',
            openCreateSchedule: true,
          }),
        ),
      ),
    ).toBe(false)
  })

  it('accepts /schedule/step1 as the schedule-request return surface without requiring create entry flags', () => {
    expect(
      isScheduleRequestDeepLinkTarget(
        createRoute('/schedule/step1', buildOnboardingQuery({ step: 'schedule_request' })),
      ),
    ).toBe(true)
    expect(
      isScheduleRequestDeepLinkTarget(
        createRoute('/schedule/step1', {
          source: 'onboarding',
          step: 'employee_seed',
        } as LocationQuery),
      ),
    ).toBe(false)
  })

  it('exposes the union allowlist used by the onboarding guard', () => {
    expect(
      isAllowedOnboardingCompatibilityTarget(
        createRoute('/schedule/step3', buildOnboardingQuery({ step: 'employee_seed', entry: 'manual' })),
      ),
    ).toBe(true)
    expect(
      isAllowedOnboardingCompatibilityTarget(
        createRoute(
          ADMIN_DASHBOARD_ROUTE_PATH,
          buildOnboardingQuery({
            step: 'schedule_request',
            entry: 'create_schedule',
            openCreateSchedule: true,
          }),
        ),
      ),
    ).toBe(true)
    expect(
      isAllowedOnboardingCompatibilityTarget(
        createRoute('/schedule/step2', buildOnboardingQuery({ step: 'schedule_request' })),
      ),
    ).toBe(false)
  })
})
