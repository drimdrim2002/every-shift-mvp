import { beforeEach, describe, expect, it, vi } from 'vitest'

const authStoreMock = vi.hoisted(() => ({
  user: null as { id: string } | null,
  checkSession: vi.fn(async () => undefined),
}))
const stepProgressGuardMock = vi.hoisted(() =>
  vi.fn(async (_to: unknown, _from: unknown, next: (value?: string) => void) => {
    next()
  }),
)

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => authStoreMock,
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
    stepProgressGuardMock.mockClear()
  })

  it(
    'allows unauthenticated user to access /signup',
    async () => {
      await router.push('/signup')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/signup')
      expect(authStoreMock.checkSession).toHaveBeenCalled()
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
      await router.push('/signup')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/schedule/step1')
      expect(authStoreMock.checkSession).not.toHaveBeenCalled()
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
})
