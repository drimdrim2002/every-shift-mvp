import { describe, expect, it } from 'vitest'
import type { RouteRecordRaw } from 'vue-router'

import { USER_HOME_ROUTE_PATH } from '@/constants/routes'
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

    expect(collectRoutePaths(routes)).toContain(USER_HOME_ROUTE_PATH)

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
  })
})
