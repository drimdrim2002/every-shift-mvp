import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AuthPageShell from '@/components/auth/AuthPageShell.vue'

describe('AuthPageShell', () => {
  it('stacks the auth context above the form at every viewport size', () => {
    const wrapper = mount(AuthPageShell, {
      props: {
        eyebrow: 'EveryShift 계정',
        title: '로그인',
        description: '승인된 병원 계정으로 근무표 작업 공간에 들어갑니다.',
      },
      slots: {
        default: '<form data-test="auth-form"></form>',
      },
    })

    const layoutClasses = wrapper.find('main > div').classes()

    expect(layoutClasses).toContain('flex')
    expect(layoutClasses).toContain('flex-col')
    expect(layoutClasses.some((className) => className.startsWith('lg:grid-cols'))).toBe(false)
  })

  it('uses a larger transition message scale for desktop readability', () => {
    const wrapper = mount(AuthPageShell, {
      props: {
        eyebrow: 'EveryShift 계정',
        title: '로그인',
        description: '승인된 병원 계정으로 근무표 작업 공간에 들어갑니다.',
      },
      slots: {
        default: '<form data-test="auth-form"></form>',
      },
    })

    expect(wrapper.get('[data-test="auth-shell-product"]').classes()).toContain('text-4xl')
    expect(wrapper.get('[data-test="auth-shell-title"]').classes()).toContain('text-3xl')
    expect(wrapper.get('[data-test="auth-shell-description"]').classes()).toContain('text-base')
  })
})
