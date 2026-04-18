import { describe, expect, it } from 'vitest'
import type { RouteRecordRaw } from 'vue-router'

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
})
