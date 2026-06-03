import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BrandLogo from '@/components/brand/BrandLogo.vue'

describe('BrandLogo', () => {
  it('renders the default logo with sm sizing and alt text', () => {
    const wrapper = mount(BrandLogo)

    const image = wrapper.get('[data-test="brand-logo"]')

    expect(image.attributes('alt')).toBe('everyshift')
    expect(image.classes()).toContain('h-8')
    expect(image.classes()).toContain('brand-logo-image')
    expect(image.attributes('src')).toBeTruthy()
  })

  it('renders md sizing when requested', () => {
    const wrapper = mount(BrandLogo, {
      props: {
        size: 'md',
      },
    })

    const image = wrapper.get('[data-test="brand-logo"]')

    expect(image.classes()).toContain('h-9')
    expect(image.classes()).toContain('max-w-[160px]')
  })

  it('allows decorative alt text override', () => {
    const wrapper = mount(BrandLogo, {
      props: {
        alt: '',
      },
    })

    expect(wrapper.get('[data-test="brand-logo"]').attributes('alt')).toBe('')
  })
})
