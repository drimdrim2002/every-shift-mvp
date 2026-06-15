import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BrandLogo from '@/components/brand/BrandLogo.vue'

describe('BrandLogo', () => {
  it('renders vector mark and wordmark with sm sizing', () => {
    const wrapper = mount(BrandLogo)

    const logo = wrapper.get('[data-test="brand-logo"]')

    expect(logo.attributes('aria-label')).toBe('everyshift')
    expect(logo.classes()).toContain('h-8')
    expect(logo.find('[data-test="brand-logo-mark"]').exists()).toBe(true)
    expect(logo.find('.brand-logo-wordmark').text()).toBe('everyshift')
    expect(logo.find('img').exists()).toBe(false)
  })

  it('renders md sizing when requested', () => {
    const wrapper = mount(BrandLogo, { props: { size: 'md' } })
    expect(wrapper.get('[data-test="brand-logo"]').classes()).toContain('h-10')
  })

  it('applies CSS variable fills on mark paths', () => {
    const wrapper = mount(BrandLogo)
    const paths = wrapper.findAll('[data-test="brand-logo-mark"] path')
    expect(paths.length).toBe(3)
    expect(paths[0]?.attributes('fill')).toBe('var(--brand-logo-mark-1)')
  })

  it('hides decorative label when alt is empty', () => {
    const wrapper = mount(BrandLogo, { props: { alt: '' } })
    const logo = wrapper.get('[data-test="brand-logo"]')
    expect(logo.attributes('aria-hidden')).toBe('true')
  })
})
