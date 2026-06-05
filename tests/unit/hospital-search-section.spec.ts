/* eslint-disable vue/one-component-per-file */

import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'

const { searchHospitalsMock } = vi.hoisted(() => ({
  searchHospitalsMock: vi.fn(),
}))

vi.mock('@/api/hospital', () => ({
  searchHospitals: searchHospitalsMock,
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
    NFormItem: passthrough('label'),
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

import HospitalSearchSection from '@/components/auth/HospitalSearchSection.vue'
import { showInfo } from '@/utils/message'

describe('HospitalSearchSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    searchHospitalsMock.mockResolvedValue([
      {
        id: 'hospital-1',
        name: '세브란스병원',
        source: 'data.go.kr',
      },
    ])
  })

  function mountSection(initialHospitalName = '세브') {
    const wrapper = mount(HospitalSearchSection, {
      props: {
        hospitalName: initialHospitalName,
        hospitalId: null,
        'onUpdate:hospitalName': (value: string) => wrapper.setProps({ hospitalName: value }),
        'onUpdate:hospitalId': (value: string | null) => wrapper.setProps({ hospitalId: value }),
      },
    })

    return wrapper
  }

  it('shows the preserved hospital search guidance', () => {
    const wrapper = mountSection()

    expect(wrapper.get('[data-test="signup-hospital-search-source"]').text()).toContain(
      '검색 출처: 공공데이터포털(data.go.kr)',
    )
    expect(wrapper.get('[data-test="signup-manual-hospital-info"]').text()).toContain(
      '병원명은 검색 결과에서 선택하거나 직접 입력할 수 있습니다.',
    )
  })

  it('fills the hospital name from a searched result when selected', async () => {
    const wrapper = mountSection('세브')

    await wrapper.get('[data-test="signup-search"]').trigger('click')
    await nextTick()
    await wrapper.get('[data-test="signup-hospital-select"]').setValue('hospital-1')
    await nextTick()

    expect(wrapper.props('hospitalName')).toBe('세브란스병원')
    expect(wrapper.props('hospitalId')).toBe('hospital-1')
  })

  it('shows an inline manual-entry warning when hospital search returns no results', async () => {
    searchHospitalsMock.mockResolvedValueOnce([])
    const wrapper = mountSection('없는병원')

    await wrapper.get('[data-test="signup-search"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-test="signup-manual-hospital-empty"]').text()).toContain(
      "'없는병원' 검색 결과가 없습니다.",
    )
    expect(wrapper.get('[data-test="signup-manual-hospital-empty"]').text()).toContain(
      '입력한 병원명으로 가입을 계속 진행할 수 있습니다.',
    )
  })

  it('shows a manual-entry warning when hospital search fails without exposing upstream errors', async () => {
    searchHospitalsMock.mockRejectedValueOnce(new Error('upstream timeout'))
    const wrapper = mountSection('세브란스')

    await wrapper.get('[data-test="signup-search"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="signup-manual-hospital-error"]').text()).toContain(
      '병원 검색이 원활하지 않습니다. 병원명을 직접 입력해 가입을 계속 진행할 수 있습니다.',
    )
    expect(showInfo).toHaveBeenCalledWith(
      '병원 검색이 원활하지 않습니다. 병원명을 직접 입력해 가입을 계속 진행할 수 있습니다.',
    )
    expect(wrapper.text()).not.toContain('upstream timeout')
  })

  it('searches using the current hospital name model value', async () => {
    const wrapper = mountSection('서울')

    await wrapper.get('[data-test="signup-search"]').trigger('click')
    await nextTick()

    expect(searchHospitalsMock).toHaveBeenCalledWith('서울')
  })
})
