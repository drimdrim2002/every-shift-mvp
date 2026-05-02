/* eslint-disable vue/one-component-per-file */

import { mount } from '@vue/test-utils'
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

  async function openIdSignup() {
    const wrapper = mount(Signup)
    await wrapper.get('[data-test="social-auth-id"]').trigger('click')
    await nextTick()
    return wrapper
  }

  it('defaults signup to admin when role query is missing', async () => {
    const wrapper = await openIdSignup()

    expect(wrapper.text()).toContain('검색 결과 출처: 공공데이터포털(data.go.kr)')
    expect(wrapper.find('input[placeholder="초대코드 입력"]').exists()).toBe(false)
  })

  it('opens admin signup when role=admin is provided', async () => {
    routeState.value = { query: { role: 'admin' } }

    const wrapper = await openIdSignup()

    expect(wrapper.text()).toContain('검색 결과 출처: 공공데이터포털(data.go.kr)')
    expect(wrapper.find('input[placeholder="초대코드 입력"]').exists()).toBe(false)
  })

  it('opens invite-code signup when role=user is provided', async () => {
    routeState.value = { query: { role: 'user' } }

    const wrapper = await openIdSignup()

    expect(wrapper.find('input[placeholder="초대코드 입력"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('검색 결과 출처: 공공데이터포털(data.go.kr)')
  })

  it('falls back to admin when role query is invalid', async () => {
    routeState.value = { query: { role: 'operator' } }

    const wrapper = await openIdSignup()

    expect(wrapper.text()).toContain('검색 결과 출처: 공공데이터포털(data.go.kr)')
  })

  it('shows the launch-ready signup context', () => {
    const wrapper = mount(Signup)

    expect(wrapper.text()).toContain('EveryShift')
    expect(wrapper.text()).toContain('관리자는 병원명을 입력해 가입 신청하고, 병원 검색은 선택사항입니다. 사용자는 초대코드로 참여합니다.')
    expect(wrapper.get('[data-test="social-auth-options"]').exists()).toBe(true)
  })

  it('shows a persistent manual hospital entry hint on admin signup', async () => {
    const wrapper = await openIdSignup()

    expect(wrapper.get('[data-test="signup-manual-hospital-info"]').text()).toContain(
      '병원 검색 결과가 없어도, 위에 입력한 병원명 그대로 가입 신청할 수 있습니다.',
    )
  })

  it('shows social choices first and expands ID signup on request', async () => {
    const wrapper = mount(Signup)

    expect(wrapper.get('[data-test="social-auth-options"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="signup-submit"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="social-auth-kakao"]').text()).toContain('카카오로 시작하기')
    expect(wrapper.get('[data-test="social-auth-id"]').text()).toContain('아이디로 시작하기')
    expect(wrapper.get('[data-test="social-auth-naver"]').text()).toContain('Naver')
    expect(wrapper.get('[data-test="social-auth-google"]').text()).toContain('Google')

    await wrapper.get('[data-test="social-auth-id"]').trigger('click')

    expect(wrapper.get('[data-test="signup-submit"]').exists()).toBe(true)
    expect(wrapper.find('input[placeholder="name@example.com"]').exists()).toBe(true)
    expect(wrapper.find('input[placeholder="8자 이상 입력"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="signup-to-login"]').text()).toContain('로그인으로 이동')
  })

  it('starts Kakao signup OAuth from the signup screen', async () => {
    startOAuthMock.mockResolvedValue({ success: true })

    const wrapper = mount(Signup)
    await wrapper.get('[data-test="social-auth-kakao"]').trigger('click')

    expect(startOAuthMock).toHaveBeenCalledWith('kakao', 'signup')
  })

  it('keeps admin submit disabled until a hospital name is entered', async () => {
    const wrapper = await openIdSignup()
    const inputs = wrapper.findAll('input')

    await inputs[0]?.setValue('관리자')
    await inputs[1]?.setValue('admin@example.com')
    await inputs[2]?.setValue('password123')

    const submitButton = wrapper.get('[data-test="signup-submit"]')
    expect((submitButton.element as HTMLButtonElement).disabled).toBe(true)

    await inputs[3]?.setValue('세브란스병원')
    await nextTick()

    expect((submitButton.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('searches using the live input value when the model update is delayed', async () => {
    const wrapper = await openIdSignup()
    const hospitalKeywordInput = wrapper.findAll('input')[3]

    ;(hospitalKeywordInput?.element as HTMLInputElement).value = '서울'
    await hospitalKeywordInput?.trigger('keydown', { key: 'Enter' })
    await nextTick()

    expect(searchHospitalsMock).toHaveBeenCalledWith('서울')
  })

  it('hands admin signup success off to login with pending approval state', async () => {
    const wrapper = await openIdSignup()
    const inputs = wrapper.findAll('input')

    await inputs[0]?.setValue('관리자')
    await inputs[1]?.setValue('admin@example.com')
    await inputs[2]?.setValue('password123')
    await inputs[3]?.setValue('세브란스병원')

    await wrapper.get('[data-test="signup-submit"]').trigger('click')
    await nextTick()

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
    const wrapper = await openIdSignup()
    const inputs = wrapper.findAll('input')

    await inputs[0]?.setValue('관리자')
    await inputs[1]?.setValue('admin@example.com')
    await inputs[2]?.setValue('password123')
    await inputs[3]?.setValue('세브란스병원')

    await wrapper.get('[data-test="signup-submit"]').trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.')

    wrapper.findComponent({ name: 'NRadioGroup' }).vm.$emit('update:value', 'user')
    await nextTick()

    expect(wrapper.text()).not.toContain('가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.')

    await wrapper.get('[data-test="signup-to-login"]').trigger('click')

    expect(pushMock).toHaveBeenCalledWith('/login')
  })

  it('fills the hospital name from a searched result when selected', async () => {
    const wrapper = await openIdSignup()

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
    const wrapper = await openIdSignup()

    await wrapper.get('input[placeholder="병원명을 직접 입력하거나 검색하세요"]').setValue('없는병원')
    await wrapper.get('[data-test="signup-search"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-test="signup-manual-hospital-empty"]').text()).toContain(
      "'없는병원' 검색 결과가 없습니다.",
    )
    expect(wrapper.get('[data-test="signup-manual-hospital-empty"]').text()).toContain(
      '지금 입력한 병원명으로 그대로 가입 신청할 수 있습니다.',
    )
  })
})
