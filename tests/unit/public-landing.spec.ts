import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { LOGIN_ROUTE_PATH, SIGNUP_ROUTE_PATH } from '@/constants/routes'
import PublicLandingView from '@/views/PublicLandingView.vue'

function mountLanding() {
  return mount(PublicLandingView, {
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
      },
    },
  })
}

describe('PublicLandingView', () => {
  it('renders header actions in order with expected destinations', () => {
    const wrapper = mountLanding()
    const header = wrapper.get('[data-test="public-header"]')
    const loginLink = wrapper.getComponent('[data-test="public-header-login"]')
    const signupLink = wrapper.getComponent('[data-test="public-header-signup"]')
    const inquiryLink = wrapper.get('[data-test="public-header-inquiry"]')

    expect(header.text()).toContain('EveryShift')
    expect(header.text()).toContain('로그인')
    expect(header.text()).toContain('회원 가입')
    expect(header.text()).toContain('도입 문의')
    expect(header.text().indexOf('로그인')).toBeLessThan(header.text().indexOf('회원 가입'))
    expect(header.text().indexOf('회원 가입')).toBeLessThan(header.text().indexOf('도입 문의'))
    expect(loginLink.props('to')).toBe(LOGIN_ROUTE_PATH)
    expect(signupLink.props('to')).toEqual({
      path: SIGNUP_ROUTE_PATH,
      query: { role: 'admin' },
    })
    expect(inquiryLink.attributes('href')).toBe('#inquiry')
  })

  it('renders hero copy and CTA destinations', () => {
    const wrapper = mountLanding()
    const hero = wrapper.get('[data-test="public-hero"]')
    const signupLink = wrapper.getComponent('[data-test="public-hero-signup"]')
    const inquiryLink = wrapper.get('[data-test="public-hero-inquiry"]')

    expect(hero.text()).toContain('EveryShift')
    expect(hero.text()).toContain('간호사 근무표 생성을 더 빠르고 신뢰할 수 있게')
    expect(hero.text()).toContain('회원 가입')
    expect(hero.text()).toContain('도입 문의')
    expect(signupLink.props('to')).toEqual({
      path: SIGNUP_ROUTE_PATH,
      query: { role: 'admin' },
    })
    expect(inquiryLink.attributes('href')).toBe('#inquiry')
  })

  it('renders public sections without authenticated app chrome text', () => {
    const wrapper = mountLanding()

    expect(wrapper.get('[data-test="public-workflow-summary"]').text()).toContain('기본 정보')
    expect(wrapper.get('[data-test="public-workflow-summary"]').text()).toContain(
      '결과 확인 / 수정 / 내보내기',
    )
    expect(wrapper.get('[data-test="public-trust-signals"]').text()).toContain('보호된 작업 공간')
    expect(wrapper.get('[data-test="public-trust-signals"]').text()).toContain('관리자 승인 절차')
    expect(wrapper.get('[data-test="public-inquiry-section"]').text()).toContain('도입 문의')
    expect(wrapper.get('[data-test="public-footer"]').text()).toContain('EveryShift')
    expect(wrapper.find('[data-test="organization-switcher"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="app-sidebar"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="app-header"]').exists()).toBe(false)
    expect(wrapper.find('.n-layout-sider').exists()).toBe(false)
    expect(wrapper.find('.n-layout-header').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('로그아웃')
    expect(wrapper.text()).not.toContain('조직 선택')
    expect(wrapper.text()).not.toContain('근무표 관리')
  })
})
