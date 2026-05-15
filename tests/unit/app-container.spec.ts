import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppContainer from '@/components/layout/AppContainer.vue'

describe('AppContainer', () => {
  it('uses the default app shell width and padding by default', () => {
    const wrapper = mount(AppContainer, {
      slots: {
        default: '<p>content</p>',
      },
    })

    expect(wrapper.classes()).toEqual(expect.arrayContaining([
      'mx-auto',
      'w-full',
      'max-w-7xl',
      'px-4',
      'sm:px-6',
      'lg:px-8',
    ]))
    expect(wrapper.text()).toBe('content')
  })

  it('uses the full width exception when requested', () => {
    const wrapper = mount(AppContainer, {
      props: {
        width: 'full',
      },
    })

    expect(wrapper.classes()).toContain('max-w-none')
    expect(wrapper.classes()).not.toContain('max-w-7xl')
  })

  it('passes through root attributes and merges extra classes', () => {
    const wrapper = mount(AppContainer, {
      attrs: {
        'data-test': 'custom-container',
        class: 'space-y-6',
      },
    })

    expect(wrapper.attributes('data-test')).toBe('custom-container')
    expect(wrapper.classes()).toContain('space-y-6')
    expect(wrapper.classes()).toContain('max-w-7xl')
  })
})
