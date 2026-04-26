/* eslint-disable vue/one-component-per-file */

import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'

const { pushMock, radioGroupSelectMock, searchHospitalsMock, submitSignupMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  radioGroupSelectMock: vi.fn(),
  searchHospitalsMock: vi.fn(),
  submitSignupMock: vi.fn(),
}))

const authState = {
  loading: ref(false),
}

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
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
              onClick: () => radioGroupSelectMock(props.value),
            },
            slots.default?.(),
          )
      },
    }),
    NRadioGroup: defineComponent({
      props: {
        value: {
          type: String,
          default: '',
        },
      },
      emits: ['update:value'],
      setup(props, { slots, emit }) {
        radioGroupSelectMock.mockImplementation((value: string) => {
          emit('update:value', value)
        })

        return () =>
          h(
            'div',
            {},
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

  it('switches between hospital lookup and invite-code signup on one route', async () => {
    const wrapper = mount(Signup)

    expect(wrapper.text()).toContain('병원 목록 출처: 공공데이터포털(data.go.kr)')
    expect(wrapper.find('input[placeholder="초대코드 입력"]').exists()).toBe(false)

    ;(wrapper.vm as unknown as { formValue: { role: 'admin' | 'user' } }).formValue.role = 'user'
    await nextTick()

    expect(wrapper.find('input[placeholder="초대코드 입력"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('병원 목록 출처: 공공데이터포털(data.go.kr)')
  })

  it('keeps admin submit disabled until a hospital is selected', async () => {
    const wrapper = mount(Signup)
    const inputs = wrapper.findAll('input')

    await inputs[0]?.setValue('관리자')
    await inputs[1]?.setValue('admin@example.com')
    await inputs[2]?.setValue('password123')

    const submitButton = wrapper.get('[data-test="signup-submit"]')
    expect((submitButton.element as HTMLButtonElement).disabled).toBe(true)

    await inputs[3]?.setValue('세브')
    await wrapper.get('[data-test="signup-search"]').trigger('click')
    await nextTick()

    await wrapper.get('[data-test="signup-hospital-select"]').setValue('hospital-1')
    await nextTick()

    expect((submitButton.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('searches using the live input value when the model update is delayed', async () => {
    const wrapper = mount(Signup)
    const hospitalKeywordInput = wrapper.findAll('input')[3]

    ;(hospitalKeywordInput?.element as HTMLInputElement).value = '서울'
    await hospitalKeywordInput?.trigger('keydown', { key: 'Enter' })
    await nextTick()

    expect(searchHospitalsMock).toHaveBeenCalledWith('서울')
  })

  it('hands admin signup success off to login with pending approval state', async () => {
    const wrapper = mount(Signup)
    const inputs = wrapper.findAll('input')

    await inputs[0]?.setValue('관리자')
    await inputs[1]?.setValue('admin@example.com')
    await inputs[2]?.setValue('password123')
    await inputs[3]?.setValue('세브')
    await wrapper.get('[data-test="signup-search"]').trigger('click')
    await nextTick()
    await wrapper.get('[data-test="signup-hospital-select"]').setValue('hospital-1')

    await wrapper.get('[data-test="signup-submit"]').trigger('click')
    await nextTick()

    expect(submitSignupMock).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'admin',
        hospitalId: 'hospital-1',
      }),
    )
    expect(wrapper.text()).toContain('가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.')

    await wrapper.get('[data-test="signup-to-login"]').trigger('click')

    expect(pushMock).toHaveBeenCalledWith('/login?signupState=pending_approval')
  })
})
