import { beforeEach, describe, expect, it, vi } from 'vitest'
import router from '@/router/index'
import { buildOnboardingQuery } from '@/utils/onboarding-context'

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
  effectiveMembership: null as { organizationId: string } | null,
}))
const onboardingStoreMock = vi.hoisted(() => ({
  loadProgress: vi.fn(async () => undefined),
  shouldForceOnboarding: false,
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
vi.mock('@/stores/onboarding', () => ({
  useOnboardingStore: () => onboardingStoreMock,
}))
vi.mock('@/router/guards', async () => {
  const actual = await vi.importActual<typeof import('@/router/guards')>('@/router/guards')

  return {
    ...actual,
    stepProgressGuard: stepProgressGuardMock,
  }
})

describe('router auth guard regression', () => {
  const ROUTER_GUARD_TEST_TIMEOUT = 15000

  function setAuthenticatedAccessState(
    accessState: NonNullable<typeof rbacStoreMock.accessState>,
    organizationId: string | null = 'org-1',
  ) {
    authStoreMock.user = { id: 'user-1' }
    rbacStoreMock.accessState = accessState
    rbacStoreMock.effectiveMembership = organizationId ? { organizationId } : null
  }

  async function navigateFromNeutralRoute() {
    await router.push('/test')
    await router.isReady()
    authStoreMock.checkSession.mockClear()
    authStoreMock.ensureAccessContext.mockClear()
    onboardingStoreMock.loadProgress.mockClear()
    stepProgressGuardMock.mockClear()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState({}, '', '/')
    authStoreMock.user = null
    authStoreMock.checkSession.mockResolvedValue(undefined)
    authStoreMock.ensureAccessContext.mockResolvedValue(null)
    rbacStoreMock.accessState = null
    rbacStoreMock.effectiveMembership = null
    onboardingStoreMock.loadProgress.mockResolvedValue(undefined)
    onboardingStoreMock.shouldForceOnboarding = false
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
      setAuthenticatedAccessState('user_active')
      await router.push('/signup')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/schedule/step1')
      expect(authStoreMock.checkSession).not.toHaveBeenCalled()
      expect(authStoreMock.ensureAccessContext).toHaveBeenCalled()
      expect(onboardingStoreMock.loadProgress).not.toHaveBeenCalled()
    },
    ROUTER_GUARD_TEST_TIMEOUT,
  )

  it(
    'redirects pending admin to /access/pending from auth page',
    async () => {
      setAuthenticatedAccessState('admin_pending')
      await router.push('/signup')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/access/pending')
      expect(onboardingStoreMock.loadProgress).not.toHaveBeenCalled()
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
      setAuthenticatedAccessState('admin_pending')

      await router.push('/schedule/step1')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/access/pending')
      expect(stepProgressGuardMock).not.toHaveBeenCalled()
      expect(onboardingStoreMock.loadProgress).not.toHaveBeenCalled()
    },
    ROUTER_GUARD_TEST_TIMEOUT,
  )

  it(
    'keeps pending admin on /access/pending route',
    async () => {
      setAuthenticatedAccessState('admin_pending')

      await router.push('/access/pending')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/access/pending')
      expect(onboardingStoreMock.loadProgress).not.toHaveBeenCalled()
    },
    ROUTER_GUARD_TEST_TIMEOUT,
  )

  it(
    'redirects no-membership state to /login from protected routes',
    async () => {
      setAuthenticatedAccessState('no_membership_or_inactive', null)

      await router.push('/schedule/step1')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/login')
      expect(onboardingStoreMock.loadProgress).not.toHaveBeenCalled()
    },
    ROUTER_GUARD_TEST_TIMEOUT,
  )

  it(
    'redirects active admin with incomplete onboarding from protected routes to /onboarding',
    async () => {
      setAuthenticatedAccessState('admin_active')
      onboardingStoreMock.shouldForceOnboarding = true

      await router.push('/schedule/step1')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/onboarding')
      expect(onboardingStoreMock.loadProgress).toHaveBeenCalledWith({
        scope: {
          accessState: 'admin_active',
          organizationId: 'org-1',
        },
      })
      expect(stepProgressGuardMock).not.toHaveBeenCalled()
    },
    ROUTER_GUARD_TEST_TIMEOUT,
  )

  it(
    'allows active admin to stay on /onboarding while onboarding is incomplete',
    async () => {
      setAuthenticatedAccessState('admin_active')
      onboardingStoreMock.shouldForceOnboarding = true
      await navigateFromNeutralRoute()

      await router.push('/onboarding')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/onboarding')
      expect(onboardingStoreMock.loadProgress).toHaveBeenCalled()
    },
    ROUTER_GUARD_TEST_TIMEOUT,
  )

  it(
    'redirects active admin from access-state route to /onboarding when onboarding is incomplete',
    async () => {
      setAuthenticatedAccessState('admin_active')
      onboardingStoreMock.shouldForceOnboarding = true

      await router.push('/access/pending')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/onboarding')
      expect(onboardingStoreMock.loadProgress).toHaveBeenCalledTimes(1)
    },
    ROUTER_GUARD_TEST_TIMEOUT,
  )

  it(
    'allows employee-seed compatibility deep link while onboarding is incomplete',
    async () => {
      setAuthenticatedAccessState('admin_active')
      onboardingStoreMock.shouldForceOnboarding = true

      await router.push({
        path: '/schedule/step3',
        query: buildOnboardingQuery({
          step: 'employee_seed',
          entry: 'manual',
        }),
      })
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/schedule/step3')
      expect(stepProgressGuardMock).toHaveBeenCalledTimes(1)
      expect(onboardingStoreMock.loadProgress).toHaveBeenCalledTimes(1)
    },
    ROUTER_GUARD_TEST_TIMEOUT,
  )

  it(
    'redirects completed admin away from /onboarding to the normal post-auth route',
    async () => {
      setAuthenticatedAccessState('admin_active')
      onboardingStoreMock.shouldForceOnboarding = false
      await navigateFromNeutralRoute()

      await router.push('/onboarding')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/schedule/step1')
      expect(onboardingStoreMock.loadProgress).toHaveBeenCalled()
    },
    ROUTER_GUARD_TEST_TIMEOUT,
  )

  it(
    'denies /onboarding to non-admin active users without invoking onboarding progress',
    async () => {
      setAuthenticatedAccessState('user_active')

      await router.push('/onboarding')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/schedule/step1')
      expect(onboardingStoreMock.loadProgress).not.toHaveBeenCalled()
    },
    ROUTER_GUARD_TEST_TIMEOUT,
  )

  it(
    'keeps pending precedence ahead of onboarding evaluation for /onboarding requests',
    async () => {
      setAuthenticatedAccessState('admin_pending')
      onboardingStoreMock.shouldForceOnboarding = true

      await router.push('/onboarding')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/access/pending')
      expect(onboardingStoreMock.loadProgress).not.toHaveBeenCalled()
    },
    ROUTER_GUARD_TEST_TIMEOUT,
  )
})
