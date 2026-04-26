import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import StepIndicator from '@/components/schedule/StepIndicator.vue'

describe('StepIndicator', () => {
  it('renders the updated step labels', () => {
    const wrapper = mount(StepIndicator, {
      props: {
        currentStep: 2,
      },
    })

    expect(wrapper.text()).toContain('사이트 기준')
    expect(wrapper.text()).toContain('직원 기준')
    expect(wrapper.text()).toContain('오프 입력')
    expect(wrapper.text()).toContain('결과 검토')
  })
})
