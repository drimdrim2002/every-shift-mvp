import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LOGIN_ROUTE_PATH } from '@/constants/routes'

const { pushMock, logoutMock, showSuccessMock, showErrorMock, rbacStoreMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  logoutMock: vi.fn(),
  showSuccessMock: vi.fn(),
  showErrorMock: vi.fn(),
  rbacStoreMock: {
    accessState: 'admin_active',
    abilities: {
      canSwitchOrganization: true,
    },
  },
}))

vi.mock('vue-router', () => ({
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

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rbacStoreMock.accessState = 'admin_active'
    rbacStoreMock.abilities.canSwitchOrganization = true
  })

  it('renders the role label and organization switcher for switchable users', () => {
    const wrapper = mount(Header, {
      global: {
        stubs: {
          OrganizationSwitcher: {
            template: '<div data-test="organization-switcher">switcher</div>',
          },
          NButton: {
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('운영 관리자')
    expect(wrapper.get('[data-test="organization-switcher"]').exists()).toBe(true)
  })

  it('calls logout and redirects to login when logout button is clicked', async () => {
    logoutMock.mockResolvedValue(undefined)
    const wrapper = mount(Header, {
      global: {
        stubs: {
          OrganizationSwitcher: {
            template: '<div data-test="organization-switcher">switcher</div>',
          },
          NButton: {
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })

    await wrapper.find('button').trigger('click')

    expect(logoutMock).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith(LOGIN_ROUTE_PATH)
    expect(showSuccessMock).toHaveBeenCalledWith('로그아웃되었습니다')
    expect(showErrorMock).not.toHaveBeenCalled()
  })

  it('shows error message when logout fails', async () => {
    logoutMock.mockRejectedValue(new Error('로그아웃 실패'))
    const wrapper = mount(Header, {
      global: {
        stubs: {
          OrganizationSwitcher: {
            template: '<div data-test="organization-switcher">switcher</div>',
          },
          NButton: {
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })

    await wrapper.find('button').trigger('click')

    expect(showErrorMock).toHaveBeenCalledWith('로그아웃 실패')
    expect(pushMock).not.toHaveBeenCalled()
    expect(showSuccessMock).not.toHaveBeenCalled()
  })
})
