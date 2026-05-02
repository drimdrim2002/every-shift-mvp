import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ComparisonToolsSection from '@/components/schedule/review/ComparisonToolsSection.vue'

describe('ComparisonToolsSection', () => {
  it('renders the body when expanded and hides it when collapsed', async () => {
    const wrapper = mount(ComparisonToolsSection, {
      props: {
        collapsed: false,
        candidateCount: 3,
        compareCount: 2,
      },
      slots: {
        default: '<div data-test="slot-body">body</div>',
      },
    })

    expect(wrapper.get('[data-test="comparison-tools-section"]').text()).toContain('근무표안 비교')
    expect(wrapper.get('[data-test="comparison-tools-body"]').text()).toContain('body')

    await wrapper.get('[data-test="comparison-tools-toggle"]').trigger('click')

    expect(wrapper.emitted('toggle-collapsed')).toEqual([[]])
  })

  it('shows the collapsed summary state when collapsed', () => {
    const wrapper = mount(ComparisonToolsSection, {
      props: {
        collapsed: true,
        candidateCount: 4,
        compareCount: 2,
      },
      slots: {
        default: '<div data-test="slot-body">body</div>',
      },
    })

    expect(wrapper.find('[data-test="comparison-tools-body"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('후보 4개')
    expect(wrapper.text()).toContain('비교 중 2개')
    expect(wrapper.text()).toContain('다시 보기')
  })
})
