/* eslint-disable vue/one-component-per-file */

import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { getUserHomeRoutePath } from '@/constants/routes'

const pushMock = vi.fn()
const replaceMock = vi.fn()
const loginMock = vi.fn()
const logoutMock = vi.fn()
const { showErrorMock, showSuccessMock } = vi.hoisted(() => ({
  showErrorMock: vi.fn(),
  showSuccessMock: vi.fn(),
}))
const authState = {
  loading: ref(false),
}
const routeState = ref({
  path: '/login',
  query: {} as Record<string, string>,
})

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
  useRoute: () => routeState.value,
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    loading: authState.loading.value,
    login: loginMock,
    logout: logoutMock,
  }),
}))

vi.mock('@/utils/message', () => ({
  showError: showErrorMock,
  showSuccess: showSuccessMock,
}))

vi.mock('naive-ui', () => {
  const passthrough = (tag: string) =>
    defineComponent({
      inheritAttrs: false,
      setup(_, { slots, attrs }) {
        return () => h(tag, attrs, slots.default?.())
      },
    })

  return {
    NAlert: passthrough('div'),
    NButton: defineComponent({
      props: {
        loading: Boolean,
        block: Boolean,
        tertiary: Boolean,
      },
      emits: ['click'],
      setup(props, { slots, emit, attrs }) {
        return () =>
          h(
            'button',
            {
              ...attrs,
              disabled: attrs.disabled ?? props.loading,
              onClick: () => emit('click'),
            },
            slots.default?.(),
          )
      },
    }),
    NCard: passthrough('section'),
    NForm: defineComponent({
      setup(_, { slots, expose }) {
        expose({
          validate: vi.fn().mockResolvedValue(undefined),
        })
        return () => h('form', {}, slots.default?.())
      },
    }),
    NFormItem: passthrough('label'),
    NInput: defineComponent({
      props: {
        value: {
          type: String,
          default: '',
        },
      },
      emits: ['update:value', 'keydown'],
      setup(props, { emit, attrs }) {
        return () =>
          h('input', {
            ...attrs,
            value: props.value,
            onInput: (event: Event) =>
              emit('update:value', (event.target as HTMLInputElement).value),
            onKeydown: (event: KeyboardEvent) => emit('keydown', event),
          })
      },
    }),
  }
})

import Login from '@/views/auth/Login.vue'

describe('Login view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeState.value = {
      path: '/login',
      query: {},
    }
    authState.loading.value = false
    loginMock.mockResolvedValue({ success: true, accessState: 'user_active' })
    logoutMock.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows the signup handoff banner for pending approval and clears the query state', async () => {
    routeState.value = {
      path: '/login',
      query: {
        signupState: 'pending_approval',
      },
    }

    const wrapper = mount(Login)
    await nextTick()

    expect(wrapper.text()).toContain('회원가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.')
    expect(replaceMock).toHaveBeenCalledWith({
      path: '/login',
      query: {},
    })
  })

  it('redirects a successful login into the resolved active route', async () => {
    const wrapper = mount(Login)
    const inputs = wrapper.findAll('input')
    await inputs[0]?.setValue('user@example.com')
    await inputs[1]?.setValue('password123')

    await wrapper.get('[data-test="login-submit"]').trigger('click')

    expect(loginMock).toHaveBeenCalledWith('user@example.com', 'password123')
    expect(showSuccessMock).toHaveBeenCalledWith('로그인 성공')
    expect(replaceMock).toHaveBeenCalledWith(getUserHomeRoutePath())
  })

  it('routes rejected admins into the rejected access screen without a success toast', async () => {
    loginMock.mockResolvedValue({
      success: true,
      accessState: 'admin_rejected',
    })

    const wrapper = mount(Login)
    const inputs = wrapper.findAll('input')
    await inputs[0]?.setValue('rejected@example.com')
    await inputs[1]?.setValue('password123')

    await wrapper.get('[data-test="login-submit"]').trigger('click')

    expect(showSuccessMock).not.toHaveBeenCalled()
    expect(showErrorMock).not.toHaveBeenCalled()
    expect(replaceMock).toHaveBeenCalledWith('/access/rejected')
  })

  it('routes pending admins into the pending access screen without a success toast', async () => {
    loginMock.mockResolvedValue({
      success: true,
      accessState: 'admin_pending',
    })

    const wrapper = mount(Login)
    const inputs = wrapper.findAll('input')
    await inputs[0]?.setValue('pending@example.com')
    await inputs[1]?.setValue('password123')

    await wrapper.get('[data-test="login-submit"]').trigger('click')

    expect(showSuccessMock).not.toHaveBeenCalled()
    expect(showErrorMock).not.toHaveBeenCalled()
    expect(replaceMock).toHaveBeenCalledWith('/access/pending')
  })

  it('clears the session and stays on login when access cannot be resolved after authentication', async () => {
    loginMock.mockResolvedValue({
      success: true,
      accessState: 'no_membership_or_inactive',
    })

    const wrapper = mount(Login)
    const inputs = wrapper.findAll('input')
    await inputs[0]?.setValue('unknown@example.com')
    await inputs[1]?.setValue('password123')

    await wrapper.get('[data-test="login-submit"]').trigger('click')

    expect(logoutMock).toHaveBeenCalledTimes(1)
    expect(showSuccessMock).not.toHaveBeenCalled()
    expect(showErrorMock).toHaveBeenCalledWith(
      '계정의 승인 또는 소속 상태를 확인할 수 없습니다. 다시 로그인해 주세요.',
    )
    expect(replaceMock).toHaveBeenCalledWith('/login')
  })
})
