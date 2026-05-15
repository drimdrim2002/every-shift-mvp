import { mount, RouterLinkStub } from '@vue/test-utils'
import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAppHomeRoutePath,
  getDashboardCreateScheduleRouteKey,
  getScheduleResultsRoutePath,
  getScheduleStepRoutePath,
  getWorkPerformanceRoutePath,
  LOGIN_ROUTE_PATH,
} from '@/constants/routes'

const { pushMock, logoutMock, showSuccessMock, showErrorMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  logoutMock: vi.fn(),
  showSuccessMock: vi.fn(),
  showErrorMock: vi.fn(),
}))

const routeState = reactive({
  path: '/',
})

const rbacStoreMock = reactive({
  accessState: 'admin_active',
  selectedOrganizationId: 'org-1',
  organizationOptions: [
    {
      id: 'org-1',
      name: '서버 병원',
      membershipRole: 'admin',
    },
  ],
  effectiveMembership: {
    membershipId: 'membership-1',
    organizationId: 'org-1',
    organizationName: '멤버십 병원',
    role: 'admin',
    status: 'approved',
    selectionSource: 'current_organization',
  },
  abilities: {
    canSwitchOrganization: true,
    canViewRestrictedUserHome: false,
    canManageOrganizationSetup: true,
    canManageSchedules: true,
    canViewApprovalQueue: false,
  },
})

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    push: pushMock,
  }),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    logout: logoutMock,
  }),
}))

vi.mock('@/stores/rbac', () => ({
  useRbacStore: () => rbacStoreMock,
}))

vi.mock('@/utils/message', () => ({
  showSuccess: showSuccessMock,
  showError: showErrorMock,
}))

import Header from '@/components/layout/Header.vue'

function findHeaderButton(wrapper: ReturnType<typeof mountHeader>, label: string) {
  const button = wrapper
    .findAll('nav[aria-label="주요 메뉴"] button')
    .find((candidate) => candidate.text() === label)

  expect(button, `${label} button should exist`).toBeDefined()

  return button!
}

function findNavigationItemGroup(wrapper: ReturnType<typeof mountHeader>, label: string) {
  const group = wrapper
    .findAll('[data-test="primary-navigation-item"]')
    .find((candidate) => candidate.text().includes(label))

  expect(group, `${label} navigation group should exist`).toBeDefined()

  return group!
}

function mountHeader() {
  return mount(Header, {
    attachTo: document.body,
    global: {
      stubs: {
        OrganizationSwitcher: {
          template: '<div data-test="organization-switcher">switcher</div>',
        },
        NButton: {
          template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
        },
        RouterLink: RouterLinkStub,
      },
    },
  })
}

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeState.path = getScheduleStepRoutePath(1)
    rbacStoreMock.accessState = 'admin_active'
    rbacStoreMock.selectedOrganizationId = 'org-1'
    rbacStoreMock.organizationOptions = [
      {
        id: 'org-1',
        name: '서버 병원',
        membershipRole: 'admin',
      },
    ]
    rbacStoreMock.effectiveMembership = {
      membershipId: 'membership-1',
      organizationId: 'org-1',
      organizationName: '멤버십 병원',
      role: 'admin',
      status: 'approved',
      selectionSource: 'current_organization',
    }
    Object.assign(rbacStoreMock.abilities, {
      canSwitchOrganization: true,
      canViewRestrictedUserHome: false,
      canManageOrganizationSetup: true,
      canManageSchedules: true,
      canViewApprovalQueue: false,
    })
  })

  it('renders brand, primary admin navigation, account context, and logout', () => {
    const wrapper = mountHeader()

    expect(wrapper.classes()).toContain('h-full')
    expect(wrapper.classes()).toContain('w-full')
    expect(wrapper.classes()).toContain('grid')
    expect(wrapper.classes()).toContain('grid-cols-[auto_minmax(0,1fr)_auto]')
    expect(wrapper.classes()).not.toContain('max-w-[1480px]')
    expect(wrapper.get('[data-test="main-logo-home-link"]').attributes('aria-label')).toBe('대시보드로 이동')
    expect(wrapper.get('[data-test="main-logo-home-link"] img').attributes('alt')).toBe('everyshift')
    expect(wrapper.getComponent(RouterLinkStub).props('to')).toBe(getAppHomeRoutePath())
    expect(wrapper.get('nav[aria-label="주요 메뉴"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('운영 기준')
    expect(wrapper.text()).toContain('근무표 생성')
    expect(wrapper.text()).toContain('근무표 분석')
    expect(wrapper.text()).toContain('서버 병원')
    expect(wrapper.text()).toContain('운영 관리자')
    expect(wrapper.text()).toContain('로그아웃')
    expect(wrapper.find('[data-test="organization-switcher"]').exists()).toBe(false)
  })

  it('falls back to the effective membership organization name when no selected option matches', () => {
    rbacStoreMock.selectedOrganizationId = 'org-missing'

    const wrapper = mountHeader()

    expect(wrapper.text()).toContain('멤버십 병원')
  })

  it('keeps organization switching visible for active superusers', () => {
    rbacStoreMock.accessState = 'super_active'

    const wrapper = mountHeader()

    expect(wrapper.get('[data-test="organization-switcher"]').exists()).toBe(true)
  })

  it('marks the active primary navigation item as the current page', () => {
    const wrapper = mountHeader()

    const activeButton = findHeaderButton(wrapper, '근무표 생성')

    expect(activeButton.attributes('aria-current')).toBe('page')
    expect(activeButton.classes()).toContain('font-semibold')
    expect(activeButton.classes()).toContain('after:absolute')
    expect(activeButton.classes()).toContain('after:h-0.5')
  })

  it('renders primary navigation items as text menu controls instead of rounded buttons', () => {
    const wrapper = mountHeader()
    const navigation = wrapper.get('nav[aria-label="주요 메뉴"]')

    expect(navigation.classes()).toContain('justify-start')
    expect(navigation.classes()).toContain('gap-6')
    expect(navigation.classes()).toContain('pl-6')
    expect(navigation.classes()).not.toContain('justify-center')
    expect(navigation.classes()).not.toContain('gap-12')
    expect(navigation.classes()).not.toContain('gap-9')
    expect(navigation.classes()).not.toContain('gap-7')
    for (const label of ['운영 기준', '근무표 생성', '근무표 분석']) {
      const button = findHeaderButton(wrapper, label)

      expect(button.classes()).toContain('h-16')
      expect(button.classes()).toContain('cursor-pointer')
      expect(button.classes()).toContain('text-base')
      expect(button.classes()).toContain('font-semibold')
      expect(button.classes()).toContain('text-slate-800')
      expect(button.classes()).toContain('hover:text-teal-700')
      expect(button.classes()).not.toContain('text-[20px]')
      expect(button.classes()).not.toContain('rounded-md')
    }
  })

  it('opens parent submenus on hover without requiring a click', async () => {
    const wrapper = mountHeader()
    const operationsGroup = findNavigationItemGroup(wrapper, '운영 기준')
    const operationsButton = findHeaderButton(wrapper, '운영 기준')

    expect(operationsButton.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[role="group"][aria-label="운영 기준 하위 메뉴"]').exists()).toBe(false)

    await operationsGroup.trigger('mouseenter')

    expect(operationsButton.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('[role="group"][aria-label="운영 기준 하위 메뉴"]').exists()).toBe(true)
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('opens the schedule generation submenu on hover', async () => {
    const wrapper = mountHeader()
    const scheduleGroup = findNavigationItemGroup(wrapper, '근무표 생성')
    const scheduleButton = findHeaderButton(wrapper, '근무표 생성')

    expect(scheduleButton.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[role="group"][aria-label="근무표 생성 하위 메뉴"]').exists()).toBe(false)

    await scheduleGroup.trigger('mouseenter')

    expect(scheduleButton.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('[role="group"][aria-label="근무표 생성 하위 메뉴"]').exists()).toBe(true)
    expect(findHeaderButton(wrapper, '새 근무표 생성').element.tagName).toBe('BUTTON')
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('keeps hover-open submenus available until the navigation group is left', async () => {
    vi.useFakeTimers()
    const wrapper = mountHeader()
    const operationsGroup = findNavigationItemGroup(wrapper, '운영 기준')
    const operationsButton = findHeaderButton(wrapper, '운영 기준')

    try {
      await operationsGroup.trigger('mouseenter')
      expect(operationsButton.attributes('aria-expanded')).toBe('true')

      await operationsGroup.trigger('mouseleave')
      vi.runAllTimers()
      await wrapper.vm.$nextTick()

      expect(operationsButton.attributes('aria-expanded')).toBe('false')
      expect(wrapper.find('[role="group"][aria-label="운영 기준 하위 메뉴"]').exists()).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('opens schedule generation on parent click and pushes the dashboard create intent from the child item', async () => {
    const wrapper = mountHeader()
    const scheduleButton = findHeaderButton(wrapper, '근무표 생성')

    await scheduleButton.trigger('click')

    expect(scheduleButton.attributes('aria-expanded')).toBe('true')
    expect(pushMock).not.toHaveBeenCalled()

    await findHeaderButton(wrapper, '새 근무표 생성').trigger('click')

    expect(pushMock).toHaveBeenCalledWith(getDashboardCreateScheduleRouteKey())
    expect(pushMock).not.toHaveBeenCalledWith(getScheduleStepRoutePath(1))
  })

  it('opens operations submenu on parent click and reveals all child buttons', async () => {
    const wrapper = mountHeader()
    const operationsButton = findHeaderButton(wrapper, '운영 기준')

    expect(operationsButton.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('button[role="menuitem"]').exists()).toBe(false)

    await operationsButton.trigger('click')

    expect(operationsButton.attributes('aria-expanded')).toBe('true')
    expect(pushMock).not.toHaveBeenCalled()
    expect(wrapper.get('[role="group"][aria-label="운영 기준 하위 메뉴"]').exists()).toBe(true)
    expect(findHeaderButton(wrapper, '병원 정보').element.tagName).toBe('BUTTON')
    expect(findHeaderButton(wrapper, '병동/근무 기준').element.tagName).toBe('BUTTON')
    expect(findHeaderButton(wrapper, '직원 정보').element.tagName).toBe('BUTTON')
  })

  it('pushes expected setup workflow routes when operations child buttons are clicked', async () => {
    const wrapper = mountHeader()
    const expectedItems = [
      ['병원 정보', `${getScheduleStepRoutePath(1)}?context=setup`],
      ['병동/근무 기준', `${getScheduleStepRoutePath(2)}?context=setup`],
      ['직원 정보', `${getScheduleStepRoutePath(3)}?context=setup`],
    ] as const

    for (const [label, expectedRoute] of expectedItems) {
      await findHeaderButton(wrapper, '운영 기준').trigger('click')
      await findHeaderButton(wrapper, label).trigger('click')

      expect(pushMock).toHaveBeenCalledWith(expectedRoute)
    }
  })

  it('opens lookup submenu on parent click and pushes expected child routes', async () => {
    const wrapper = mountHeader()
    const lookupButton = findHeaderButton(wrapper, '근무표 분석')

    expect(lookupButton.attributes('aria-expanded')).toBe('false')

    await lookupButton.trigger('click')

    expect(lookupButton.attributes('aria-expanded')).toBe('true')
    expect(findHeaderButton(wrapper, '생성된 근무표').element.tagName).toBe('BUTTON')
    expect(findHeaderButton(wrapper, '근무 기록').element.tagName).toBe('BUTTON')

    await findHeaderButton(wrapper, '생성된 근무표').trigger('click')
    await lookupButton.trigger('click')
    await findHeaderButton(wrapper, '근무 기록').trigger('click')

    expect(pushMock).toHaveBeenCalledWith(getScheduleResultsRoutePath())
    expect(pushMock).toHaveBeenCalledWith(getWorkPerformanceRoutePath())
  })

  it('closes the open submenu on Escape and updates aria-expanded', async () => {
    const wrapper = mountHeader()
    const operationsButton = findHeaderButton(wrapper, '운영 기준')

    await operationsButton.trigger('click')
    expect(operationsButton.attributes('aria-expanded')).toBe('true')
    expect(findHeaderButton(wrapper, '병원 정보').exists()).toBe(true)

    await wrapper.get('nav[aria-label="주요 메뉴"]').trigger('keydown', { key: 'Escape' })

    expect(operationsButton.attributes('aria-expanded')).toBe('false')
    expect(wrapper.findAll('nav[aria-label="주요 메뉴"] button').map((button) => button.text())).not.toContain(
      '병원 정보',
    )
  })

  it('renders fallback dashboard navigation when there are no visible navigation abilities', () => {
    Object.assign(rbacStoreMock.abilities, {
      canViewRestrictedUserHome: false,
      canManageOrganizationSetup: false,
      canManageSchedules: false,
      canViewApprovalQueue: false,
    })

    const wrapper = mountHeader()

    expect(wrapper.get('nav[aria-label="주요 메뉴"]').text()).toContain('대시보드')
  })

  it('calls logout and redirects to login when logout button is clicked', async () => {
    logoutMock.mockResolvedValue(undefined)
    const wrapper = mountHeader()

    await wrapper.findAll('button').find((button) => button.text() === '로그아웃')?.trigger('click')

    expect(logoutMock).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith(LOGIN_ROUTE_PATH)
    expect(showSuccessMock).toHaveBeenCalledWith('로그아웃되었습니다')
    expect(showErrorMock).not.toHaveBeenCalled()
  })

  it('shows error message when logout fails', async () => {
    logoutMock.mockRejectedValue(new Error('로그아웃 실패'))
    const wrapper = mountHeader()

    await wrapper.findAll('button').find((button) => button.text() === '로그아웃')?.trigger('click')

    expect(showErrorMock).toHaveBeenCalledWith('로그아웃 실패')
    expect(pushMock).not.toHaveBeenCalled()
    expect(showSuccessMock).not.toHaveBeenCalled()
  })
})
