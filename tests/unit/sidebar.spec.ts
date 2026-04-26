import { mount } from '@vue/test-utils'
import { defineComponent, h, reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const pushMock = vi.fn()

const routeState = reactive({
  path: '/',
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

vi.mock('naive-ui', () => ({
  NMenu: defineComponent({
    props: {
      options: {
        type: Array,
        default: () => [],
      },
      defaultValue: {
        type: String,
        default: '',
      },
    },
    setup(props) {
      return () =>
        h('nav', {
          'data-test': 'sidebar-menu',
          'data-current': props.defaultValue,
        }, (props.options as Array<{ label: string; key: string }>).map((option) =>
          h('div', {
            key: option.key,
            'data-test': 'sidebar-menu-item',
          }, option.label)
        ))
    },
  }),
}))

import Sidebar from '@/components/layout/Sidebar.vue'
import {
  getAppHomeRoutePath,
  getApprovalQueueRoutePath,
  getOpsOrganizationSetupRoutePath,
  getScheduleStepRoutePath,
  getUserHomeRoutePath,
} from '@/constants/routes'

function createWrapper() {
  return mount(Sidebar)
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeState.path = '/'
    Object.assign(rbacStoreMock.abilities, {
      canViewApprovalQueue: false,
      canSwitchOrganization: false,
      canViewRestrictedUserHome: false,
      canManageOrganizationSetup: false,
      canManageEmployees: false,
      canManageSchedules: false,
    })
  })

  it('renders only the restricted user home entry for restricted user abilities', () => {
    Object.assign(rbacStoreMock.abilities, {
      canViewRestrictedUserHome: true,
    })

    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('내 홈')
    expect(wrapper.text()).not.toContain('운영 기본 설정')
    expect(wrapper.text()).not.toContain('근무표 생성')
    expect(wrapper.text()).not.toContain('가입 승인')
  })

  it('renders organization and schedule entries for admin abilities', () => {
    Object.assign(rbacStoreMock.abilities, {
      canManageOrganizationSetup: true,
      canManageSchedules: true,
    })

    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('운영 기본 설정')
    expect(wrapper.text()).toContain('근무표 생성')
    expect(wrapper.text()).not.toContain('내 홈')
    expect(wrapper.text()).not.toContain('가입 승인')
  })

  it('renders the approval queue entry for super approval-only abilities', () => {
    Object.assign(rbacStoreMock.abilities, {
      canViewApprovalQueue: true,
    })

    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('가입 승인')
    expect(wrapper.text()).not.toContain('운영 기본 설정')
    expect(wrapper.text()).not.toContain('근무표 생성')
    expect(wrapper.text()).not.toContain('내 홈')
  })

  it('normalizes canonical and legacy schedule routes to the schedule menu key', () => {
    routeState.path = '/app/schedule/step5/schedule-1'
    let wrapper = createWrapper()
    expect(wrapper.get('[data-test="sidebar-menu"]').attributes('data-current')).toBe(
      getScheduleStepRoutePath(1)
    )

    routeState.path = '/schedule/step4'
    wrapper = createWrapper()
    expect(wrapper.get('[data-test="sidebar-menu"]').attributes('data-current')).toBe(
      getScheduleStepRoutePath(1)
    )
  })

  it('normalizes canonical and legacy ops routes to the setup menu key', () => {
    routeState.path = '/app/ops/off-request-policy-setup'
    let wrapper = createWrapper()
    expect(wrapper.get('[data-test="sidebar-menu"]').attributes('data-current')).toBe(
      getOpsOrganizationSetupRoutePath()
    )

    routeState.path = '/ops/organization-setup'
    wrapper = createWrapper()
    expect(wrapper.get('[data-test="sidebar-menu"]').attributes('data-current')).toBe(
      getOpsOrganizationSetupRoutePath()
    )
  })

  it('normalizes approval, user home, and dashboard routes without path literals', () => {
    routeState.path = '/admin/approval-queue'
    let wrapper = createWrapper()
    expect(wrapper.get('[data-test="sidebar-menu"]').attributes('data-current')).toBe(
      getApprovalQueueRoutePath()
    )

    routeState.path = '/app/home/user'
    wrapper = createWrapper()
    expect(wrapper.get('[data-test="sidebar-menu"]').attributes('data-current')).toBe(
      getUserHomeRoutePath()
    )

    routeState.path = '/'
    wrapper = createWrapper()
    expect(wrapper.get('[data-test="sidebar-menu"]').attributes('data-current')).toBe(
      getAppHomeRoutePath()
    )
  })
})
