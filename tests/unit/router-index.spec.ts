import { describe, expect, it } from 'vitest'
import type { RouteRecordRaw } from 'vue-router'

import {
  ACCESS_PENDING_ROUTE_PATH,
  ACCESS_REJECTED_ROUTE_PATH,
  APP_HOME_ROUTE_PATH,
  getScheduleResultsRoutePath,
  LEGACY_APP_ROUTE_REDIRECTS,
  LEGACY_SCHEDULE_STEP5_ROUTE_PREFIX,
  LOGIN_ROUTE_PATH,
  OAUTH_CALLBACK_ROUTE_PATH,
  PUBLIC_ROOT_ROUTE_PATH,
  SIGNUP_ROUTE_PATH,
  SOCIAL_SIGNUP_COMPLETE_ROUTE_PATH,
  getScheduleStep5RoutePath,
  getWorkPerformanceRoutePath,
  getStep5ScheduleKeyFromPath,
  normalizeAppContractPath,
} from '@/constants/routes'
import { createAppRoutes } from '@/router/index'

function collectRoutePaths(routes: RouteRecordRaw[]): string[] {
  const paths: string[] = []

  const walk = (items: RouteRecordRaw[]) => {
    for (const route of items) {
      paths.push(route.path)
      if (route.children) {
        walk(route.children)
      }
    }
  }

  walk(routes)
  return paths
}

function findRouteByName(routes: RouteRecordRaw[], routeName: string): RouteRecordRaw | undefined {
  for (const route of routes) {
    if (route.name === routeName) {
      return route
    }

    if (route.children) {
      const matchedChild = findRouteByName(route.children, routeName)
      if (matchedChild) {
        return matchedChild
      }
    }
  }

  return undefined
}

function findTopLevelRouteByPath(routes: RouteRecordRaw[], path: string): RouteRecordRaw | undefined {
  return routes.find((route) => route.path === path)
}

function findAppChildByPath(routes: RouteRecordRaw[], path: string): RouteRecordRaw | undefined {
  return findTopLevelRouteByPath(routes, APP_HOME_ROUTE_PATH)?.children?.find((route) => route.path === path)
}

function resolveRedirect(route: RouteRecordRaw, path: string) {
  if (typeof route.redirect === 'function') {
    return route.redirect({
      path,
      fullPath: path,
      query: { version: 'draft' },
      hash: '#section',
      params: { scheduleKey: 'schedule-123' },
      name: undefined,
      matched: [],
      meta: {},
      redirectedFrom: undefined,
    })
  }

  return route.redirect
}

describe('router dev-only routes', () => {
  it('includes /test* routes only in development mode', () => {
    const devPaths = collectRoutePaths(createAppRoutes(true))
    expect(devPaths).toContain('admin/approval-queue')
    expect(devPaths).toContain('/test')
    expect(devPaths).toContain('/test-schedule')
    expect(devPaths).toContain('/test-step-indicator')
    expect(devPaths).toContain('/test-grid')

    const prodPaths = collectRoutePaths(createAppRoutes(false))
    expect(prodPaths).toContain('admin/approval-queue')
    expect(prodPaths).not.toContain('/test')
    expect(prodPaths).not.toContain('/test-schedule')
    expect(prodPaths).not.toContain('/test-step-indicator')
    expect(prodPaths).not.toContain('/test-grid')
  })

  it('registers the restricted user home route and admin org-context meta', () => {
    const routes = createAppRoutes(false)

    expect(PUBLIC_ROOT_ROUTE_PATH).not.toBe(APP_HOME_ROUTE_PATH)
    expect(collectRoutePaths(routes)).toContain('home/user')

    expect(findRouteByName(routes, 'UserHome')?.meta).toMatchObject({
      requiresAuth: true,
      title: '내 홈',
    })

    expect(findRouteByName(routes, 'OrganizationProfileSetup')?.meta).toMatchObject({
      requiresAuth: true,
      requiresOrgContext: true,
      requiredOrgRole: 'admin',
    })

    expect(findRouteByName(routes, 'Step1')?.meta).toMatchObject({
      requiresAuth: true,
      requiresOrgContext: true,
      requiredOrgRole: 'admin',
    })

    expect(findRouteByName(routes, 'Step5')?.path).toBe('schedule/step5/:scheduleKey')
    expect(getStep5ScheduleKeyFromPath('/schedule/step5/schedule-1')).toBe('schedule-1')
  })

  it('mounts DefaultLayout only under the canonical /app workspace root', () => {
    const routes = createAppRoutes(false)
    const publicRootRoute = findTopLevelRouteByPath(routes, PUBLIC_ROOT_ROUTE_PATH)
    const appRoute = findTopLevelRouteByPath(routes, APP_HOME_ROUTE_PATH)

    expect(publicRootRoute?.redirect).toBeUndefined()
    expect(publicRootRoute?.component).toBeTypeOf('function')
    expect(publicRootRoute?.meta).toMatchObject({
      requiresAuth: false,
      title: 'everyshift',
    })
    expect(appRoute?.component).toBeTypeOf('function')
    expect(appRoute?.meta).toMatchObject({ requiresAuth: true })
  })

  it('keeps public auth and access-state routes outside DefaultLayout', () => {
    const routes = createAppRoutes(false)

    for (const path of [
      PUBLIC_ROOT_ROUTE_PATH,
      LOGIN_ROUTE_PATH,
      SIGNUP_ROUTE_PATH,
      ACCESS_PENDING_ROUTE_PATH,
      ACCESS_REJECTED_ROUTE_PATH,
    ]) {
      const route = findTopLevelRouteByPath(routes, path)
      expect(route?.path).toBe(path)
      expect(route?.children).toBeUndefined()
    }

    expect(findTopLevelRouteByPath(routes, APP_HOME_ROUTE_PATH)?.children?.length).toBeGreaterThan(0)
  })

  it('registers social auth completion routes outside DefaultLayout', () => {
    const routes = createAppRoutes(false)

    expect(findTopLevelRouteByPath(routes, OAUTH_CALLBACK_ROUTE_PATH)?.meta).toMatchObject({
      requiresAuth: false,
      title: '인증 처리',
      allowsNoMembership: true,
    })
    expect(findTopLevelRouteByPath(routes, OAUTH_CALLBACK_ROUTE_PATH)?.children).toBeUndefined()

    expect(findTopLevelRouteByPath(routes, SOCIAL_SIGNUP_COMPLETE_ROUTE_PATH)?.meta).toMatchObject({
      requiresAuth: true,
      title: '가입 완료',
      allowsNoMembership: true,
    })
    expect(findTopLevelRouteByPath(routes, SOCIAL_SIGNUP_COMPLETE_ROUTE_PATH)?.children).toBeUndefined()
  })

  it('registers canonical workspace children as relative /app routes', () => {
    const appRoute = findTopLevelRouteByPath(createAppRoutes(false), APP_HOME_ROUTE_PATH)
    const childPaths = appRoute?.children?.map((route) => route.path) ?? []

    expect(childPaths).toEqual([
      '',
      'admin/approval-queue',
      'home/user',
      'ops/organization-setup',
      'ops/off-request-policy-setup',
      'schedule-results',
      'work-performance',
      'schedule/step1',
      'schedule/step2',
      'schedule/step3',
      'schedule/step4',
      'schedule/step5/:scheduleKey',
    ])
  })

  it('registers schedule lookup routes under DefaultLayout with admin org workspace meta', () => {
    const routes = createAppRoutes(false)

    expect(getScheduleResultsRoutePath()).toBe('/app/schedule-results')
    expect(getWorkPerformanceRoutePath()).toBe('/app/work-performance')

    expect(findAppChildByPath(routes, 'schedule-results')).toMatchObject({
      path: 'schedule-results',
      name: 'ScheduleResults',
      meta: {
        requiresAuth: true,
        requiresOrgContext: true,
        requiredOrgRole: 'admin',
      },
    })
    expect(findAppChildByPath(routes, 'work-performance')).toMatchObject({
      path: 'work-performance',
      name: 'WorkPerformance',
      meta: {
        requiresAuth: true,
        requiresOrgContext: true,
        requiredOrgRole: 'admin',
      },
    })

    expect(findAppChildByPath(routes, 'schedule/step1')?.meta).toMatchObject({
      requiresAuth: true,
      requiresOrgContext: true,
      requiredOrgRole: 'admin',
    })
    expect(findAppChildByPath(routes, 'schedule/step5/:scheduleKey')?.meta).toMatchObject({
      requiresAuth: true,
      requiresOrgContext: true,
      requiredOrgRole: 'admin',
    })
  })

  it('keeps every legacy static route as a redirect that preserves query and hash', () => {
    const routes = createAppRoutes(false)

    for (const [legacyPath, canonicalPath] of Object.entries(LEGACY_APP_ROUTE_REDIRECTS)) {
      const legacyRoute = findTopLevelRouteByPath(routes, legacyPath)

      expect(legacyRoute).toBeDefined()
      expect(resolveRedirect(legacyRoute!, legacyPath)).toEqual({
        path: canonicalPath,
        query: { version: 'draft' },
        hash: '#section',
        replace: true,
      })
    }
  })

  it('keeps legacy schedule step5 as a redirect that preserves scheduleKey, query, and hash', () => {
    const legacyRoute = findTopLevelRouteByPath(
      createAppRoutes(false),
      `${LEGACY_SCHEDULE_STEP5_ROUTE_PREFIX}:scheduleKey`,
    )

    expect(resolveRedirect(legacyRoute!, `${LEGACY_SCHEDULE_STEP5_ROUTE_PREFIX}schedule-123`)).toEqual({
      path: '/app/schedule/step5/schedule-123',
      query: { version: 'draft' },
      hash: '#section',
      replace: true,
    })
  })

  it('normalizes launch-window legacy app paths to canonical /app contract paths', () => {
    for (const [legacyPath, canonicalPath] of Object.entries(LEGACY_APP_ROUTE_REDIRECTS)) {
      expect(normalizeAppContractPath(legacyPath)).toBe(canonicalPath)
    }

    expect(normalizeAppContractPath(`${LEGACY_SCHEDULE_STEP5_ROUTE_PREFIX}schedule-123`)).toBe(
      getScheduleStep5RoutePath('schedule-123'),
    )
    expect(normalizeAppContractPath(APP_HOME_ROUTE_PATH)).toBe(APP_HOME_ROUTE_PATH)
  })
})
