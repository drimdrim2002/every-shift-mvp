import { describe, expect, it } from 'vitest'

import {
  ACCESS_PENDING_ROUTE_PATH,
  ACCESS_REJECTED_ROUTE_PATH,
  LOGIN_ROUTE_PATH,
} from '@/constants/routes'
import { resolveAuthNavigationTarget } from '@/router/guards'

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

    expect(redirect).toBe('/')
  })
})
