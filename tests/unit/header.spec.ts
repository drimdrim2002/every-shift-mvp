import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { pushMock, logoutMock, showSuccessMock, showErrorMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  logoutMock: vi.fn(),
  showSuccessMock: vi.fn(),
  showErrorMock: vi.fn(),
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

vi.mock('@/utils/message', () => ({
  showSuccess: showSuccessMock,
  showError: showErrorMock,
}))

import Header from '@/components/layout/Header.vue'

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls logout and redirects to login when logout button is clicked', async () => {
    logoutMock.mockResolvedValue(undefined)
    const wrapper = mount(Header, {
      global: {
        stubs: {
          NButton: {
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })

    await wrapper.find('button').trigger('click')

    expect(logoutMock).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith('/login')
    expect(showSuccessMock).toHaveBeenCalledWith('로그아웃되었습니다')
    expect(showErrorMock).not.toHaveBeenCalled()
  })

  it('shows error message when logout fails', async () => {
    logoutMock.mockRejectedValue(new Error('로그아웃 실패'))
    const wrapper = mount(Header, {
      global: {
        stubs: {
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
