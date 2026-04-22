import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
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

import Sidebar from '@/components/layout/Sidebar.vue'

const NMenuStub = {
  props: ['options'],
  template: `
    <nav data-test="sidebar-menu">
      <div
        v-for="option in options"
        :key="option.key"
        data-test="sidebar-menu-item"
      >
        {{ option.label }}
      </div>
    </nav>
  `,
}

function createWrapper() {
  return mount(Sidebar, {
    global: {
      stubs: {
        NMenu: NMenuStub,
      },
    },
  })
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
})
