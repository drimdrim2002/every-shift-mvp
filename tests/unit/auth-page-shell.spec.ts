import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AuthPageShell from '@/components/auth/AuthPageShell.vue'

describe('AuthPageShell', () => {
  it('supports the compact launch auth shell variant', () => {
    const wrapper = mount(AuthPageShell, {
      props: {
        eyebrow: 'EveryShift 시작하기',
        title: '로그인/회원가입',
        description: '간편하게 시작하세요.',
        variant: 'compact',
      },
      slots: {
        default: '<div data-test="slot">content</div>',
      },
    })

    expect(wrapper.get('[data-test="auth-shell-root"]').classes()).toContain('bg-white')
    expect(wrapper.get('[data-test="auth-shell-product"]').text()).toBe('EveryShift')
    expect(wrapper.get('[data-test="auth-shell-product"]').classes()).toContain('text-2xl')
    expect(wrapper.get('[data-test="auth-shell-title"]').classes()).toContain('text-2xl')
    expect(wrapper.get('[data-test="auth-shell-description"]').classes()).toContain('text-sm')
    expect(wrapper.get('[data-test="slot"]').text()).toBe('content')
  })

  it('locks auth shells to light color-scheme', () => {
    const wrapper = mount(AuthPageShell, {
      props: {
        eyebrow: 'EveryShift 계정',
        title: '로그인',
        description: '승인된 계정으로 근무표 작업 공간에 들어갑니다.',
      },
    })

    expect(wrapper.get('[data-test="auth-shell-root"]').classes()).toContain('[color-scheme:only_light]')
  })

  it('keeps EveryShift as the default product label', () => {
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

    expect(wrapper.get('[data-test="auth-shell-product"]').text()).toBe('EveryShift')
  })

  it('allows auth pages to override the product label', () => {
    const wrapper = mount(AuthPageShell, {
      props: {
        eyebrow: 'everyshift 시작하기',
        productLabel: 'everyshift',
        title: '회원가입',
        description: '병원 검색을 통해 병원을 입력하시거나 직접 입력하실 수 있습니다.',
        variant: 'compact',
      },
      slots: {
        default: '<form data-test="auth-form"></form>',
      },
    })

    expect(wrapper.get('[data-test="auth-shell-product"]').text()).toBe('everyshift')
  })

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
