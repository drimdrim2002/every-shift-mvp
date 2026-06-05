/* eslint-disable vue/one-component-per-file */

import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'

const { pushMock, searchHospitalsMock, startOAuthMock, submitSignupMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  searchHospitalsMock: vi.fn(),
  startOAuthMock: vi.fn(),
  submitSignupMock: vi.fn(),
}))

const authState = {
  loading: ref(false),
}

const routeState = ref({
  query: {} as Record<string, string>,
})

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  useRoute: () => routeState.value,
}))

vi.mock('@/api/hospital', () => ({
  searchHospitals: searchHospitalsMock,
}))

vi.mock('@/api/signup', () => ({
  submitSignup: submitSignupMock,
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    loading: authState.loading.value,
    startOAuth: startOAuthMock,
  }),
}))

vi.mock('@/seo/usePublicRouteSeo', () => ({
  usePublicRouteSeo: vi.fn(),
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

  const resolveRules = (rules: unknown): Record<string, unknown> => {
    if (!rules || typeof rules !== 'object') {
      return {}
    }

    return rules as Record<string, unknown>
  }

  const resolveModel = (model: unknown): Record<string, unknown> => {
    if (!model || typeof model !== 'object') {
      return {}
    }

    if ('value' in model && model.value && typeof model.value === 'object') {
      return model.value as Record<string, unknown>
    }

    return model as Record<string, unknown>
  }

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
    NCard: defineComponent({
      inheritAttrs: false,
      props: {
        title: {
          type: String,
          default: '',
        },
      },
      setup(props, { slots, attrs }) {
        return () =>
          h('section', attrs, [
            props.title ? h('div', {}, props.title) : null,
            slots.default?.(),
          ])
      },
    }),
    NForm: defineComponent({
      props: {
        model: {
          type: Object,
          default: () => ({}),
        },
        rules: {
          type: Object,
          default: () => ({}),
        },
      },
      setup(props, { slots, expose }) {
        const validate = vi.fn(async () => {
          for (const [path, rawRules] of Object.entries(resolveRules(props.rules))) {
            const value = resolveModel(props.model)[path]
            const rules = Array.isArray(rawRules) ? rawRules : [rawRules]

            for (const rawRule of rules) {
              const rule = rawRule as {
                required?: boolean
                message?: string
                validator?: (_rule: unknown, value: unknown) => boolean | Error | Promise<boolean | Error>
              }

              if (rule.required && !value) {
                throw new Error(rule.message ?? '필수 입력값입니다')
              }

              const result = await rule.validator?.(rule, value)
              if (result instanceof Error) {
                throw result
              }
            }
          }
        })

        expose({
          validate,
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
      emits: ['update:value', 'keydown.enter'],
      setup(props, { emit, attrs }) {
        return () =>
          h('input', {
            ...attrs,
            value: props.value,
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
      setup(props, { slots, emit }) {
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

import Signup from '@/views/auth/Signup.vue'

describe('Signup view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.loading.value = false
    routeState.value = { query: {} }
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
    startOAuthMock.mockResolvedValue({ success: true })
  })

  async function openSignupForm() {
    const wrapper = mount(Signup)
    await nextTick()
    return wrapper
  }

  it('defaults signup to admin when role query is missing', async () => {
    const wrapper = await openSignupForm()

    expect(wrapper.find('input[placeholder="병원명 입력"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="signup-hospital-search-source"]').exists()).toBe(false)
    expect(wrapper.find('input[placeholder="초대코드 입력"]').exists()).toBe(false)
  })

  it('opens admin signup when role=admin is provided', async () => {
    routeState.value = { query: { role: 'admin' } }

    const wrapper = await openSignupForm()

    expect(wrapper.find('input[placeholder="병원명 입력"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="signup-hospital-search-source"]').exists()).toBe(false)
    expect(wrapper.find('input[placeholder="초대코드 입력"]').exists()).toBe(false)
  })

  it('opens invite-code signup when role=user is provided', async () => {
    routeState.value = { query: { role: 'user' } }

    const wrapper = await openSignupForm()

    expect(wrapper.find('input[placeholder="초대코드 입력"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="signup-hospital-search-source"]').exists()).toBe(false)
  })

  it('falls back to admin when role query is invalid', async () => {
    routeState.value = { query: { role: 'operator' } }

    const wrapper = await openSignupForm()

    expect(wrapper.find('input[placeholder="병원명 입력"]').exists()).toBe(true)
  })

  it('shows the launch-ready signup context', () => {
    const wrapper = mount(Signup)

    expect(wrapper.text()).toContain('everyshift 시작하기')
    expect(wrapper.get('[data-test="auth-shell-product"]').text()).toBe('everyshift')
    expect(wrapper.text()).toContain('병원명을 직접 입력해 가입 신청하세요.')
    expect(wrapper.get('[data-test="auth-shell-title"]').text()).toBe('회원가입')
    expect(wrapper.get('[data-test="social-auth-options"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="social-auth-id"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="social-auth-naver"]').exists()).toBe(false)
  })

  it('shows only the direct hospital name input on admin signup', async () => {
    const wrapper = await openSignupForm()

    expect(wrapper.find('input[placeholder="병원명 입력"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="signup-manual-hospital-info"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="signup-search"]').exists()).toBe(false)
  })

  it('shows the signup form by default without the old ID/Naver social options', () => {
    const wrapper = mount(Signup)

    expect(wrapper.get('[data-test="social-auth-options"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="signup-submit"]').exists()).toBe(true)
    expect(wrapper.find('input[placeholder="name@example.com"]').exists()).toBe(true)
    expect(wrapper.find('input[placeholder="8자 이상 입력"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="signup-to-login"]').text()).toContain('로그인으로 이동')
    expect(wrapper.find('[data-test="social-auth-id"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="social-auth-naver"]').exists()).toBe(false)
  })

  it('renders compact social OAuth icon buttons with readable logos', () => {
    const wrapper = mount(Signup)

    expect(wrapper.get('[data-test="social-auth-kakao"]').classes()).toContain('h-11')
    expect(wrapper.get('[data-test="social-auth-google"]').classes()).toContain('h-11')
    expect(wrapper.get('[data-test="social-auth-kakao"]').classes()).toContain('w-full')
    expect(wrapper.get('[data-test="social-auth-google"]').classes()).toContain('w-full')
    expect(wrapper.get('[data-test="social-auth-kakao"] svg').classes()).toEqual(
      expect.arrayContaining(['block', 'size-5']),
    )
    expect(wrapper.get('[data-test="social-auth-google"] svg').classes()).toEqual(
      expect.arrayContaining(['block', 'size-5']),
    )
  })

  it('starts Kakao signup OAuth from the signup screen', async () => {
    startOAuthMock.mockResolvedValue({ success: true })

    const wrapper = mount(Signup)
    await wrapper.get('[data-test="social-auth-kakao"]').trigger('click')

    expect(startOAuthMock).toHaveBeenCalledWith('kakao', 'signup')
  })

  it('starts Google signup OAuth from the signup screen', async () => {
    startOAuthMock.mockResolvedValue({ success: true })

    const wrapper = mount(Signup)
    await wrapper.get('[data-test="social-auth-google"]').trigger('click')

    expect(startOAuthMock).toHaveBeenCalledWith('google', 'signup')
  })

  it('keeps admin submit disabled until a hospital name is entered', async () => {
    const wrapper = await openSignupForm()

    await wrapper.get('input[placeholder="이름 입력"]').setValue('관리자')
    await wrapper.get('input[placeholder="name@example.com"]').setValue('admin@example.com')
    await wrapper.get('input[placeholder="8자 이상 입력"]').setValue('password123')
    await wrapper.get('input[placeholder="비밀번호 재입력"]').setValue('password123')

    const submitButton = wrapper.get('[data-test="signup-submit"]')
    expect((submitButton.element as HTMLButtonElement).disabled).toBe(true)

    await wrapper.get('input[placeholder="병원명 입력"]').setValue('세브란스병원')
    await nextTick()

    expect((submitButton.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('requires matching password confirmation before password signup submits', async () => {
    const wrapper = await openSignupForm()

    await wrapper.get('input[placeholder="이름 입력"]').setValue('관리자')
    await wrapper.get('input[placeholder="name@example.com"]').setValue('admin@example.com')
    await wrapper.get('input[placeholder="8자 이상 입력"]').setValue('password123')
    await wrapper.get('input[placeholder="비밀번호 재입력"]').setValue('password124')
    await wrapper.get('input[placeholder="병원명 입력"]').setValue('세브란스병원')

    await wrapper.get('[data-test="signup-submit"]').trigger('click')
    await flushPromises()

    expect(submitSignupMock).not.toHaveBeenCalled()
  })

  it('hands admin signup success off to login with pending approval state', async () => {
    const wrapper = await openSignupForm()

    await wrapper.get('input[placeholder="이름 입력"]').setValue('관리자')
    await wrapper.get('input[placeholder="name@example.com"]').setValue('admin@example.com')
    await wrapper.get('input[placeholder="8자 이상 입력"]').setValue('password123')
    await wrapper.get('input[placeholder="비밀번호 재입력"]').setValue('password123')
    await wrapper.get('input[placeholder="병원명 입력"]').setValue('세브란스병원')
    await nextTick()

    expect((wrapper.get('[data-test="signup-submit"]').element as HTMLButtonElement).disabled).toBe(
      false,
    )
    await wrapper.get('[data-test="signup-submit"]').trigger('click')
    await flushPromises()

    expect(submitSignupMock).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'admin',
        hospitalName: '세브란스병원',
        hospitalSource: 'manual',
      }),
    )
    expect(submitSignupMock.mock.calls[0]?.[0]).not.toHaveProperty('hospitalId')
    expect(wrapper.text()).toContain('가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.')

    await wrapper.get('[data-test="signup-to-login"]').trigger('click')

    expect(pushMock).toHaveBeenCalledWith('/login?signupState=pending_approval')
  })

  it('clears pending signup state before login when the role changes after submit', async () => {
    const wrapper = await openSignupForm()

    await wrapper.get('input[placeholder="이름 입력"]').setValue('관리자')
    await wrapper.get('input[placeholder="name@example.com"]').setValue('admin@example.com')
    await wrapper.get('input[placeholder="8자 이상 입력"]').setValue('password123')
    await wrapper.get('input[placeholder="비밀번호 재입력"]').setValue('password123')
    await wrapper.get('input[placeholder="병원명 입력"]').setValue('세브란스병원')
    await nextTick()

    await wrapper.get('[data-test="signup-submit"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.')

    wrapper.findComponent({ name: 'NRadioGroup' }).vm.$emit('update:value', 'user')
    await nextTick()

    expect(wrapper.text()).not.toContain('가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.')

    await wrapper.get('[data-test="signup-to-login"]').trigger('click')

    expect(pushMock).toHaveBeenCalledWith('/login')
  })
})
