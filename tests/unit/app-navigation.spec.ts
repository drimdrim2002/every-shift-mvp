import { mount } from '@vue/test-utils'
import { defineComponent, reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { useAppNavigation as useAppNavigationType } from '@/components/layout/useAppNavigation'

const pushMock = vi.fn()

const routeState = reactive({
  path: '/',
  query: {},
})

const rbacStoreMock = reactive({
  abilities: {
    canViewApprovalQueue: false,
    canSwitchOrganization: false,
    canViewRestrictedUserHome: false,
    canManageOrganizationSetup: false,
    canManageEmployees: false,
    canManageSchedules: false,
  },
})

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    push: pushMock,
  }),
}))

vi.mock('@/stores/rbac', () => ({
  useRbacStore: () => rbacStoreMock,
}))

import { useAppNavigation } from '@/components/layout/useAppNavigation'
import {
  getAppHomeRoutePath,
  getApprovalQueueRoutePath,
  getOpsOrganizationSetupRoutePath,
  getScheduleResultsRoutePath,
  getScheduleStepRoutePath,
  getUserHomeRoutePath,
  getWorkPerformanceRoutePath,
} from '@/constants/routes'

type AppNavigation = ReturnType<typeof useAppNavigationType>

let appNavigation: AppNavigation

function mountNavigation() {
  const Harness = defineComponent({
    setup() {
      appNavigation = useAppNavigation()
      return () => null
    },
  })

  return mount(Harness)
}

describe('useAppNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeState.path = '/'
    routeState.query = {}
    Object.assign(rbacStoreMock.abilities, {
      canViewApprovalQueue: false,
      canSwitchOrganization: false,
      canViewRestrictedUserHome: false,
      canManageOrganizationSetup: false,
      canManageEmployees: false,
      canManageSchedules: false,
    })
  })

  it('builds admin primary navigation in workflow order', () => {
    Object.assign(rbacStoreMock.abilities, {
      canManageOrganizationSetup: true,
      canManageSchedules: true,
    })

    mountNavigation()

    expect(appNavigation.navigationItems.value.map((item) => item.label)).toEqual([
      '운영 기준',
      '근무표 생성',
      '근무표 분석',
    ])
  })

  it('builds schedule generation as a parent menu with a new schedule child', () => {
    Object.assign(rbacStoreMock.abilities, {
      canManageSchedules: true,
    })

    mountNavigation()

    expect(appNavigation.navigationItems.value).toContainEqual({
      label: '근무표 생성',
      key: getScheduleStepRoutePath(1),
      children: [
        { label: '새 근무표 생성', key: getScheduleStepRoutePath(1) },
      ],
    })
  })

  it('normalizes step5 schedule routes to step1', () => {
    routeState.path = '/app/schedule/step5/2026-05'

    mountNavigation()

    expect(appNavigation.activeNavigationKey.value).toBe(getScheduleStepRoutePath(1))
  })

  it('normalizes lookup routes before broad schedule matching', () => {
    routeState.path = '/app/schedule-results'
    mountNavigation()
    expect(appNavigation.activeNavigationKey.value).toBe(getScheduleResultsRoutePath())

    routeState.path = '/app/work-performance'
    expect(appNavigation.activeNavigationKey.value).toBe(getScheduleResultsRoutePath())
  })

  it('builds operations children as setup workflow destinations', () => {
    Object.assign(rbacStoreMock.abilities, {
      canManageOrganizationSetup: true,
    })

    mountNavigation()

    expect(appNavigation.navigationItems.value[0]).toEqual({
      label: '운영 기준',
      key: getOpsOrganizationSetupRoutePath(),
      children: [
        { label: '병원 정보', key: `${getScheduleStepRoutePath(1)}?context=setup` },
        { label: '병동/근무 기준', key: `${getScheduleStepRoutePath(2)}?context=setup` },
        { label: '직원 정보', key: `${getScheduleStepRoutePath(3)}?context=setup` },
      ],
    })
  })

  it('keeps setup workflow routes active under operations navigation', () => {
    routeState.path = getScheduleStepRoutePath(3)
    routeState.query = { context: 'setup' }

    mountNavigation()

    expect(appNavigation.activeNavigationKey.value).toBe(getOpsOrganizationSetupRoutePath())
  })

  it('builds schedule analysis children for site and worker analysis', () => {
    Object.assign(rbacStoreMock.abilities, {
      canManageSchedules: true,
    })

    mountNavigation()

    expect(appNavigation.navigationItems.value[1]).toEqual({
      label: '근무표 분석',
      key: getScheduleResultsRoutePath(),
      children: [
        { label: '사이트별', key: getScheduleResultsRoutePath() },
        { label: '근무자별', key: getWorkPerformanceRoutePath() },
      ],
    })
  })

  it('shows only my home for restricted user abilities', () => {
    Object.assign(rbacStoreMock.abilities, {
      canViewRestrictedUserHome: true,
    })

    mountNavigation()

    expect(appNavigation.navigationItems.value).toEqual([
      { label: '내 홈', key: getUserHomeRoutePath() },
    ])
  })

  it('shows only approval queue for approval-only abilities', () => {
    Object.assign(rbacStoreMock.abilities, {
      canViewApprovalQueue: true,
    })

    mountNavigation()

    expect(appNavigation.navigationItems.value).toEqual([
      { label: '가입 승인', key: getApprovalQueueRoutePath() },
    ])
  })

  it('falls back to dashboard when no visible abilities exist', () => {
    mountNavigation()

    expect(appNavigation.navigationItems.value).toEqual([
      { label: '대시보드', key: getAppHomeRoutePath() },
    ])
  })

  it('normalizes canonical and legacy ops routes to organization setup', () => {
    routeState.path = '/app/ops/off-request-policy-setup'
    mountNavigation()
    expect(appNavigation.activeNavigationKey.value).toBe(getOpsOrganizationSetupRoutePath())

    routeState.path = '/ops/organization-setup'
    expect(appNavigation.activeNavigationKey.value).toBe(getOpsOrganizationSetupRoutePath())
  })

  it('normalizes canonical and legacy schedule routes to step1', () => {
    routeState.path = '/app/schedule/step4'
    mountNavigation()
    expect(appNavigation.activeNavigationKey.value).toBe(getScheduleStepRoutePath(1))

    routeState.path = '/schedule/step2'
    expect(appNavigation.activeNavigationKey.value).toBe(getScheduleStepRoutePath(1))
  })

  it('normalizes approval, user home, and dashboard routes without path literals', () => {
    routeState.path = '/admin/approval-queue'
    mountNavigation()
    expect(appNavigation.activeNavigationKey.value).toBe(getApprovalQueueRoutePath())

    routeState.path = '/app/home/user'
    expect(appNavigation.activeNavigationKey.value).toBe(getUserHomeRoutePath())

    routeState.path = '/'
    expect(appNavigation.activeNavigationKey.value).toBe(getAppHomeRoutePath())
  })

  it('pushes the navigation item key', async () => {
    mountNavigation()

    await appNavigation.navigateToNavigationItem(getScheduleStepRoutePath(1))

    expect(pushMock).toHaveBeenCalledWith(getScheduleStepRoutePath(1))
  })
})
