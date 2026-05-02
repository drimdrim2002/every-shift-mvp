import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import type { LocationQuery } from 'vue-router'
import {
  LOGIN_ROUTE_PATH,
  SOCIAL_SIGNUP_COMPLETE_ROUTE_PATH,
  getUserHomeRoutePath,
} from '@/constants/routes'

const replaceMock = vi.fn()
const handleOAuthCallbackMock = vi.fn()
const routeState = ref<{ query: LocationQuery }>({
  query: {},
})
const { showErrorMock } = vi.hoisted(() => ({
  showErrorMock: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState.value,
  useRouter: () => ({
    replace: replaceMock,
  }),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    handleOAuthCallback: handleOAuthCallbackMock,
  }),
}))

vi.mock('@/utils/message', () => ({
  showError: showErrorMock,
}))

vi.mock('@/components/auth/AuthPageShell.vue', () => ({
  default: defineComponent({
    props: {
      eyebrow: {
        type: String,
        default: '',
      },
      title: {
        type: String,
        default: '',
      },
      description: {
        type: String,
        default: '',
      },
      variant: {
        type: String,
        default: '',
      },
    },
    setup(props, { slots }) {
      return () =>
        h(
          'section',
          {
            'data-test': 'auth-page-shell',
            'data-variant': props.variant,
          },
          [
            h('p', props.eyebrow),
            h('h1', props.title),
            h('p', props.description),
            slots.default?.(),
          ],
        )
    },
  }),
}))

import OAuthCallback from '@/views/auth/OAuthCallback.vue'

describe('OAuthCallback view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeState.value = {
      query: {},
    }
    handleOAuthCallbackMock.mockResolvedValue({
      success: true,
      intent: 'login',
      accessState: 'user_active',
    })
  })

  it('shows the compact processing state while OAuth session is resolved', () => {
    const wrapper = mount(OAuthCallback)

    expect(wrapper.get('[data-test="auth-page-shell"]').attributes('data-variant')).toBe('compact')
    expect(wrapper.text()).toContain('EveryShift')
    expect(wrapper.text()).toContain('인증 처리 중')
    expect(wrapper.text()).toContain('잠시만 기다려주세요.')
    expect(wrapper.get('[data-test="oauth-callback-loading"]').text()).toBe(
      '인증 정보를 확인하고 있습니다.',
    )
  })

  it('routes signup users without membership to social signup completion', async () => {
    routeState.value = {
      query: {
        intent: 'signup',
        code: 'oauth-code',
      },
    }
    handleOAuthCallbackMock.mockResolvedValue({
      success: true,
      intent: 'signup',
      accessState: 'no_membership_or_inactive',
    })

    mount(OAuthCallback)
    await flushPromises()

    expect(handleOAuthCallbackMock).toHaveBeenCalledWith('signup', 'oauth-code')
    expect(replaceMock).toHaveBeenCalledWith(SOCIAL_SIGNUP_COMPLETE_ROUTE_PATH)
  })

  it('routes active login users through the post-auth resolver', async () => {
    routeState.value = {
      query: {
        intent: 'login',
        code: 'oauth-code',
      },
    }
    handleOAuthCallbackMock.mockResolvedValue({
      success: true,
      intent: 'login',
      accessState: 'user_active',
    })

    mount(OAuthCallback)
    await flushPromises()

    expect(handleOAuthCallbackMock).toHaveBeenCalledWith('login', 'oauth-code')
    expect(replaceMock).toHaveBeenCalledWith(getUserHomeRoutePath())
  })

  it('returns to login when OAuth provider sends an error query', async () => {
    routeState.value = {
      query: {
        error_description: 'access_denied',
      },
    }

    mount(OAuthCallback)
    await flushPromises()

    expect(showErrorMock).toHaveBeenCalledWith('소셜 인증이 취소되었거나 실패했습니다.')
    expect(handleOAuthCallbackMock).not.toHaveBeenCalled()
    expect(replaceMock).toHaveBeenCalledWith(LOGIN_ROUTE_PATH)
  })

  it('returns to login when OAuth provider sends an array-shaped error query', async () => {
    routeState.value = {
      query: {
        error: ['access_denied'],
      },
    }

    mount(OAuthCallback)
    await flushPromises()

    expect(showErrorMock).toHaveBeenCalledWith('소셜 인증이 취소되었거나 실패했습니다.')
    expect(handleOAuthCallbackMock).not.toHaveBeenCalled()
    expect(replaceMock).toHaveBeenCalledWith(LOGIN_ROUTE_PATH)
  })

  it('returns to login when OAuth callback handling fails', async () => {
    handleOAuthCallbackMock.mockResolvedValue({
      success: false,
      error: '인증 세션을 확인할 수 없습니다.',
    })

    mount(OAuthCallback)
    await flushPromises()

    expect(showErrorMock).toHaveBeenCalledWith('인증 세션을 확인할 수 없습니다.')
    expect(replaceMock).toHaveBeenCalledWith(LOGIN_ROUTE_PATH)
  })
})
