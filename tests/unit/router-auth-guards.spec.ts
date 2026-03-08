import { beforeEach, describe, expect, it, vi } from 'vitest'

const authStoreMock = vi.hoisted(() => ({
  user: null as { id: string } | null,
  checkSession: vi.fn(async () => undefined),
  ensureAccessContext: vi.fn(async () => null),
}))
const rbacStoreMock = vi.hoisted(() => ({
  accessState: null as
    | 'unauthenticated'
    | 'super_active'
    | 'admin_active'
    | 'admin_pending'
    | 'admin_rejected'
    | 'user_active'
    | 'no_membership_or_inactive'
    | null,
}))
const stepProgressGuardMock = vi.hoisted(() =>
  vi.fn(async (_to: unknown, _from: unknown, next: (value?: string) => void) => {
    next()
  }),
)

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => authStoreMock,
}))
vi.mock('@/stores/rbac', () => ({
  useRbacStore: () => rbacStoreMock,
}))
vi.mock('@/router/guards', () => ({
  stepProgressGuard: stepProgressGuardMock,
}))

import router from '@/router/index'

describe('router auth guard regression', () => {
  const ROUTER_GUARD_TEST_TIMEOUT = 15000

  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState({}, '', '/')
    authStoreMock.user = null
    authStoreMock.checkSession.mockResolvedValue(undefined)
    authStoreMock.ensureAccessContext.mockResolvedValue(null)
    rbacStoreMock.accessState = null
    stepProgressGuardMock.mockClear()
  })

  it(
    'allows unauthenticated user to access /signup',
    async () => {
      await router.push('/signup')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/signup')
      expect(authStoreMock.checkSession).toHaveBeenCalled()
      expect(authStoreMock.ensureAccessContext).not.toHaveBeenCalled()
    },
    ROUTER_GUARD_TEST_TIMEOUT,
  )

  it(
    'allows unauthenticated user to access /login',
    async () => {
      await router.push('/login')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/login')
      expect(authStoreMock.checkSession).toHaveBeenCalled()
    },
    ROUTER_GUARD_TEST_TIMEOUT,
  )

  it(
    'redirects authenticated user away from /signup',
    async () => {
      authStoreMock.user = { id: 'user-1' }
      rbacStoreMock.accessState = 'user_active'
      await router.push('/signup')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/schedule/step1')
      expect(authStoreMock.checkSession).not.toHaveBeenCalled()
      expect(authStoreMock.ensureAccessContext).toHaveBeenCalled()
    },
    ROUTER_GUARD_TEST_TIMEOUT,
  )

  it(
    'redirects pending admin to /access/pending from auth page',
    async () => {
      authStoreMock.user = { id: 'user-1' }
      rbacStoreMock.accessState = 'admin_pending'
      await router.push('/signup')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/access/pending')
    },
    ROUTER_GUARD_TEST_TIMEOUT,
  )

  it(
    'redirects unauthenticated access to protected schedule route to /login',
    async () => {
      await router.push('/login')
      vi.clearAllMocks()
      authStoreMock.checkSession.mockResolvedValue(undefined)

      await router.push('/schedule/step1')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/login')
      expect(authStoreMock.checkSession).toHaveBeenCalled()
      expect(stepProgressGuardMock).not.toHaveBeenCalled()
    },
    ROUTER_GUARD_TEST_TIMEOUT,
  )

  it(
    'redirects pending admin to pending access page for protected routes',
    async () => {
      authStoreMock.user = { id: 'user-1' }
      rbacStoreMock.accessState = 'admin_pending'

      await router.push('/schedule/step1')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/access/pending')
      expect(stepProgressGuardMock).not.toHaveBeenCalled()
    },
    ROUTER_GUARD_TEST_TIMEOUT,
  )

  it(
    'keeps pending admin on /access/pending route',
    async () => {
      authStoreMock.user = { id: 'user-1' }
      rbacStoreMock.accessState = 'admin_pending'

      await router.push('/access/pending')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/access/pending')
    },
    ROUTER_GUARD_TEST_TIMEOUT,
  )

  it(
    'redirects no-membership state to /login from protected routes',
    async () => {
      authStoreMock.user = { id: 'user-1' }
      rbacStoreMock.accessState = 'no_membership_or_inactive'

      await router.push('/schedule/step1')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/login')
    },
    ROUTER_GUARD_TEST_TIMEOUT,
  )
})
