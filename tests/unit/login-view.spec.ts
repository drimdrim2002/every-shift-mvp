import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const pushMock = vi.fn()
const replaceMock = vi.fn()
const routeMock = vi.hoisted(() => ({
  path: '/login',
  query: {} as Record<string, unknown>,
}))
const loginMock = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    loading: false,
    login: loginMock,
  }),
}))

vi.mock('@/composables/useGlobalMessage', () => ({
  useGlobalMessage: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}))

import Login from '@/views/auth/Login.vue'

describe('Login view signup state handoff', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeMock.path = '/login'
    routeMock.query = {}
  })

  it('consumes signupState from query and clears URL state', () => {
    routeMock.query = { signupState: 'pending_approval' }
    const wrapper = mount(Login)

    expect(wrapper.text()).toContain('회원가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.')
    expect(replaceMock).toHaveBeenCalledWith({
      path: '/login',
      query: {},
    })
  })

  it('shows active signup handoff message and clears URL state', () => {
    routeMock.query = { signupState: 'active' }
    const wrapper = mount(Login)

    expect(wrapper.text()).toContain('가입이 완료되었습니다. 로그인할 수 있습니다.')
    expect(replaceMock).toHaveBeenCalledWith({
      path: '/login',
      query: {},
    })
  })

  it('does not show alert for invalid signupState query', () => {
    routeMock.query = { signupState: 'unknown-state' }
    const wrapper = mount(Login)

    expect(wrapper.text()).not.toContain('회원가입 신청이 접수되었습니다.')
    expect(wrapper.text()).not.toContain('가입이 완료되었습니다. 로그인할 수 있습니다.')
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('navigates to /signup when signup CTA is clicked', async () => {
    const wrapper = mount(Login)
    const signupButton = wrapper
      .findAll('button')
      .find((candidate) => candidate.text().includes('회원가입'))

    if (!signupButton) {
      throw new Error('signup button not found')
    }

    await signupButton.trigger('click')
    expect(pushMock).toHaveBeenCalledWith('/signup')
  })
})
