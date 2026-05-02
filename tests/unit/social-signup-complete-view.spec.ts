/* eslint-disable vue/one-component-per-file */

import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, nextTick } from 'vue'
import type { AccessState } from '@/types/rbac'

const { replaceMock, searchHospitalsMock, submitSignupMock, authStoreState } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  searchHospitalsMock: vi.fn(),
  submitSignupMock: vi.fn(),
  authStoreState: {
    user: null as { id: string; email?: string | null } | null,
    refreshSessionContext: vi.fn(),
    logout: vi.fn(),
  },
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}))

vi.mock('@/api/hospital', () => ({
  searchHospitals: searchHospitalsMock,
}))

vi.mock('@/api/signup', () => ({
  getSignupErrorMessage: (code: string) => code,
  submitSignup: submitSignupMock,
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    get user() {
      return authStoreState.user
    },
    refreshSessionContext: authStoreState.refreshSessionContext,
    logout: authStoreState.logout,
  }),
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
    },
    setup(props, { slots }) {
      return () => h('main', {}, [
        h('p', {}, props.eyebrow),
        h('h1', {}, props.title),
        h('p', {}, props.description),
        slots.default?.(),
      ])
    },
  }),
}))

vi.mock('@/utils/message', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showInfo: vi.fn(),
  showWarning: vi.fn(),
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
        disabled: Boolean,
        block: Boolean,
        tertiary: Boolean,
        secondary: Boolean,
      },
      emits: ['click'],
      setup(props, { slots, emit, attrs }) {
        return () =>
          h(
            'button',
            {
              ...attrs,
              disabled: props.disabled || props.loading,
              onClick: () => emit('click'),
            },
            slots.default?.(),
          )
      },
    }),
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
        readonly: Boolean,
      },
      emits: ['update:value', 'keydown.enter'],
      setup(props, { emit, attrs }) {
        const inputValue = computed(() => props.value)

        return () =>
          h('input', {
            ...attrs,
            readonly: props.readonly,
            value: inputValue.value,
            onInput: (event: Event) =>
              emit('update:value', (event.target as HTMLInputElement).value),
            onKeydown: (event: KeyboardEvent) => {
              if (event.key === 'Enter') {
                emit('keydown.enter', event)
              }
            },
          })
      },
    }),
    NRadioButton: defineComponent({
      props: {
        value: {
          type: String,
          required: true,
        },
      },
      setup(props, { slots, attrs }) {
        return () =>
          h(
            'button',
            {
              ...attrs,
              type: 'button',
              'data-value': props.value,
            },
            slots.default?.(),
          )
      },
    }),
    NRadioGroup: defineComponent({
      name: 'NRadioGroup',
      props: {
        value: {
          type: String,
          default: '',
        },
      },
      emits: ['update:value'],
      setup(_, { slots, emit }) {
        return () =>
          h(
            'div',
            {
              onClick: (event: Event) => {
                const value = (event.target as HTMLElement).dataset.value
                if (value) {
                  emit('update:value', value)
                }
              },
            },
            slots.default?.(),
          )
      },
    }),
    NSelect: defineComponent({
      props: {
        value: {
          type: String,
          default: null,
        },
        options: {
          type: Array,
          default: () => [],
        },
      },
      emits: ['update:value'],
      setup(props, { emit, attrs }) {
        return () =>
          h(
            'select',
            {
              ...attrs,
              value: props.value ?? '',
              onChange: (event: Event) =>
                emit('update:value', (event.target as HTMLSelectElement).value || null),
            },
            [
              h('option', { value: '' }, '선택'),
              ...(props.options as Array<{ label: string; value: string }>).map((option) =>
                h('option', { value: option.value }, option.label),
              ),
            ],
          )
      },
    }),
  }
})

import SocialSignupComplete from '@/views/auth/SocialSignupComplete.vue'

describe('SocialSignupComplete view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authStoreState.user = {
      id: 'user-1',
      email: 'social@example.com',
    }
    authStoreState.refreshSessionContext.mockResolvedValue('admin_active' satisfies AccessState)
    authStoreState.logout.mockResolvedValue({ success: true })
    searchHospitalsMock.mockResolvedValue([
      {
        id: 'hospital-1',
        name: '세브란스병원',
        source: 'data.go.kr',
      },
    ])
    submitSignupMock.mockResolvedValue({
      nextState: 'pending_approval',
    })
  })

  async function fillAdminSignupForm(wrapper: ReturnType<typeof mount>) {
    await wrapper.get('input[placeholder="이름 입력"]').setValue('관리자')
    await wrapper.get('input[placeholder="병원명을 직접 입력하거나 검색하세요"]').setValue('세브란스병원')
  }

  it('shows the session email and omits password signup fields', () => {
    const wrapper = mount(SocialSignupComplete)

    expect(wrapper.text()).toContain('social@example.com')
    expect(wrapper.find('input[placeholder="8자 이상 입력"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="signup-submit"]').exists()).toBe(true)
  })

  it('shows a persistent manual hospital entry hint', () => {
    const wrapper = mount(SocialSignupComplete)

    expect(wrapper.get('[data-test="signup-manual-hospital-info"]').text()).toContain(
      '병원 검색 결과가 없어도, 위에 입력한 병원명 그대로 가입 신청할 수 있습니다.',
    )
  })

  it('redirects to login when the auth session user is missing', async () => {
    authStoreState.user = null

    mount(SocialSignupComplete)
    await flushPromises()

    expect(replaceMock).toHaveBeenCalledWith('/login')
  })

  it('shows a Korean warning when the social account email is missing', () => {
    authStoreState.user = {
      id: 'user-1',
      email: null,
    }

    const wrapper = mount(SocialSignupComplete)

    expect(wrapper.text()).toContain('소셜 계정 이메일을 확인할 수 없습니다.')
  })

  it('renders the session email field as read-only', () => {
    const wrapper = mount(SocialSignupComplete)

    const sessionEmailInput = wrapper.get('input[placeholder="name@example.com"]')

    expect((sessionEmailInput.element as HTMLInputElement).readOnly).toBe(true)
    expect((sessionEmailInput.element as HTMLInputElement).value).toBe('social@example.com')
  })

  it('logs out and routes to login when cancel is clicked', async () => {
    const wrapper = mount(SocialSignupComplete)

    await wrapper.get('[data-test="signup-to-login"]').trigger('click')
    await flushPromises()

    expect(authStoreState.logout).toHaveBeenCalled()
    expect(replaceMock).toHaveBeenCalledWith('/login')
  })

  it('submits existing session signup and routes pending approval users', async () => {
    const wrapper = mount(SocialSignupComplete)
    await fillAdminSignupForm(wrapper)

    await wrapper.get('[data-test="signup-submit"]').trigger('click')
    await flushPromises()

    expect(submitSignupMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authMode: 'existing_session',
        role: 'admin',
        name: '관리자',
        hospitalName: '세브란스병원',
        hospitalSource: 'manual',
      }),
    )
    expect(submitSignupMock.mock.calls[0]?.[0]).not.toHaveProperty('email')
    expect(submitSignupMock.mock.calls[0]?.[0]).not.toHaveProperty('password')
    expect(submitSignupMock.mock.calls[0]?.[0]).not.toHaveProperty('hospitalId')
    expect(replaceMock).toHaveBeenCalledWith('/access/pending')
  })

  it('submits an existing-session user invite role payload without email or password', async () => {
    const wrapper = mount(SocialSignupComplete)

    wrapper.findComponent({ name: 'NRadioGroup' }).vm.$emit('update:value', 'user')
    await nextTick()
    await wrapper.get('input[placeholder="초대코드 입력"]').setValue('INVITE-1234')

    await wrapper.get('[data-test="signup-submit"]').trigger('click')
    await flushPromises()

    expect(submitSignupMock).toHaveBeenCalledWith({
      authMode: 'existing_session',
      role: 'user',
      name: '',
      inviteCode: 'INVITE-1234',
    })
    expect(submitSignupMock.mock.calls[0]?.[0]).not.toHaveProperty('email')
    expect(submitSignupMock.mock.calls[0]?.[0]).not.toHaveProperty('password')
  })

  it('refreshes the session context and routes active users after completion', async () => {
    submitSignupMock.mockResolvedValue({
      nextState: 'active',
    })
    authStoreState.refreshSessionContext.mockResolvedValue('user_active' satisfies AccessState)
    const wrapper = mount(SocialSignupComplete)
    await fillAdminSignupForm(wrapper)

    await wrapper.get('[data-test="signup-submit"]').trigger('click')
    await flushPromises()

    expect(authStoreState.refreshSessionContext).toHaveBeenCalled()
    expect(replaceMock).toHaveBeenCalledWith('/app/home/user')
  })

  it('fills the hospital name from a searched result when selected', async () => {
    const wrapper = mount(SocialSignupComplete)

    await wrapper.get('input[placeholder="이름 입력"]').setValue('관리자')
    await wrapper.get('input[placeholder="병원명을 직접 입력하거나 검색하세요"]').setValue('세브')
    await wrapper.get('[data-test="signup-search"]').trigger('click')
    await nextTick()
    await wrapper.get('[data-test="signup-hospital-select"]').setValue('hospital-1')
    await nextTick()

    expect(
      (wrapper.get('input[placeholder="병원명을 직접 입력하거나 검색하세요"]').element as HTMLInputElement).value,
    ).toBe('세브란스병원')
  })

  it('shows an inline manual-entry warning when hospital search returns no results', async () => {
    searchHospitalsMock.mockResolvedValueOnce([])
    const wrapper = mount(SocialSignupComplete)

    await wrapper.get('input[placeholder="병원명을 직접 입력하거나 검색하세요"]').setValue('없는병원')
    await wrapper.get('[data-test="signup-search"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-test="signup-manual-hospital-empty"]').text()).toContain(
      "'없는병원' 검색 결과가 없습니다.",
    )
  })
})
