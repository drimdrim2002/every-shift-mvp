import { mount, RouterLinkStub } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LandingProductPreview from '@/components/public/LandingProductPreview.vue'
import { LOGIN_ROUTE_PATH, SIGNUP_ROUTE_PATH } from '@/constants/routes'
import type { LandingPreviewVariant } from '@/data/publicLandingContent'
import PublicLandingView from '@/views/PublicLandingView.vue'

const INQUIRY_FORM_URL = 'https://forms.gle/everyshift-public-inquiry'
const expectedHeroSloganLines = ['근무표 생성부터', '검토와 내보내기까지'] as const
const previewTrustSignals: Record<LandingPreviewVariant, readonly string[]> = {
  overview: ['AI 생성 근무표', 'Off 요청', '가이드라인 점검', 'Excel'],
  ai: ['30명', '36일', '전월 5일'],
  conditions: ['반영', '미반영', '사유'],
  guide: ['연속 야간', '야간 후 휴식', 'NOD', '필요 인력'],
  compare: ['수정', '저장', '재검증', 'Excel'],
  fairness: ['확정 이력', '누적', '평균', '확인 필요'],
}
const previewTrustSignalEntries = Object.entries(previewTrustSignals) as Array<
  [LandingPreviewVariant, readonly string[]]
>

function mountLanding() {
  return mount(PublicLandingView, {
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
      },
    },
  })
}

function stubReducedMotion(matches: boolean) {
  const matchMedia = vi.fn((query: string): MediaQueryList => ({
    matches: query.includes('prefers-reduced-motion') ? matches : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  }))

  vi.stubGlobal(
    'matchMedia',
    matchMedia,
  )

  return matchMedia
}

describe('LandingProductPreview', () => {
  it.each(previewTrustSignalEntries)('renders %s preview trust signals', (variant, signals) => {
    const wrapper = mount(LandingProductPreview, {
      props: { variant },
    })

    signals.forEach((signal) => {
      expect(wrapper.text()).toContain(signal)
    })
    wrapper.unmount()
  })
})

describe('PublicLandingView', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_PUBLIC_INQUIRY_FORM_URL', INQUIRY_FORM_URL)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders header actions in order with expected destinations', () => {
    const wrapper = mountLanding()
    const header = wrapper.get('[data-test="public-header"]')
    const loginLink = wrapper.getComponent('[data-test="public-header-login"]')
    const signupLink = wrapper.getComponent('[data-test="public-header-signup"]')
    const inquiryLink = wrapper.get('[data-test="public-header-inquiry"]')
    const headerActions = wrapper
      .findAll(
        '[data-test="public-header-login"], [data-test="public-header-signup"], [data-test="public-header-inquiry"]',
      )
      .map((link) => link.text())

    expect(header.text()).toContain('EveryShift')
    expect(header.text()).toContain('로그인')
    expect(header.text()).toContain('회원 가입')
    expect(header.text()).toContain('도입 문의')
    expect(header.text()).not.toContain('AI 근무표')
    expect(header.text()).not.toContain('Off 요청')
    expect(header.text()).not.toContain('가이드 체크')
    expect(headerActions).toEqual(['로그인', '회원 가입', '도입 문의'])
    expect(loginLink.props('to')).toBe(LOGIN_ROUTE_PATH)
    expect(signupLink.props('to')).toEqual({
      path: SIGNUP_ROUTE_PATH,
      query: { role: 'admin' },
    })
    expect(inquiryLink.attributes('href')).toBe(INQUIRY_FORM_URL)
    expect(inquiryLink.attributes('target')).toBe('_blank')
    expect(inquiryLink.attributes('rel')).toBe('noopener noreferrer')
  })

  it('renders hero copy with signup and inquiry CTAs in order', () => {
    const wrapper = mountLanding()
    const hero = wrapper.get('[data-test="public-hero"]')
    const heroText = hero.text()
    const signupLink = wrapper.getComponent('[data-test="public-hero-signup"]')
    const inquiryLink = wrapper.get('[data-test="public-hero-inquiry"]')
    const heroActions = hero
      .findAll('[data-test="public-hero-signup"], [data-test="public-hero-inquiry"]')
      .map((link) => link.text())
    const sloganLines = wrapper
      .findAll('[data-test="public-hero-slogan-line"]')
      .map((line) => line.text())

    expect(heroText).toContain('간호사 근무표 생성/검토')
    expect(heroText).toContain('간호사')
    expect(heroText).toContain('근무표')
    expect(heroText).toMatch(/생성|검토/)
    expect(sloganLines).toEqual([...expectedHeroSloganLines])
    expect(hero.get('[data-test="public-hero-body"]').text()).toContain('병동 조건')
    expect(hero.get('[data-test="public-hero-body"]').text()).toContain('Off 요청')
    expect(hero.get('[data-test="public-hero-body"]').text()).toContain('가이드라인 점검')
    expect(hero.get('[data-test="public-hero-body"]').text()).toContain('확정 전 검토')
    expect(hero.get('[data-test="public-hero-body"]').classes()).toContain('whitespace-pre-line')
    expect(heroActions).toEqual(['회원 가입', '도입 문의'])
    expect(signupLink.props('to')).toEqual({
      path: SIGNUP_ROUTE_PATH,
      query: { role: 'admin' },
    })
    expect(inquiryLink.attributes('href')).toBe(INQUIRY_FORM_URL)
    expect(inquiryLink.attributes('target')).toBe('_blank')
    expect(inquiryLink.attributes('rel')).toBe('noopener noreferrer')
  })

  it('renders narrative value sections with fixed anchors', () => {
    const wrapper = mountLanding()
    const sections = wrapper.findAll('[data-test="public-value-section"]')

    expect(sections).toHaveLength(5)
    expect(sections[0].text()).toContain('AI Solver가 근무표를 자동으로 완성합니다')
    expect(sections[1].text()).toContain('병동과 근무자의 조건을 함께 반영합니다')
    expect(sections[2].text()).toMatch(/가이드라인|점검/)

    const guideSection = wrapper.get('#guide-check').text()
    expect(guideSection).not.toMatch(/준수|보장|법적/)
    expect(guideSection).toMatch(/확인|점검|검토/)

    const flexibleOperationsSection = sections[3].text()
    expect(flexibleOperationsSection).toContain('근무표 결과를 유연하게 운영할 수 있습니다')
    expect(flexibleOperationsSection).toContain('여러 버전')
    expect(flexibleOperationsSection).toContain('수정')
    expect(flexibleOperationsSection).toContain('재검증')
    expect(flexibleOperationsSection).toContain('저장')
    expect(flexibleOperationsSection).toContain('Excel')
    expect(flexibleOperationsSection).not.toMatch(/여러 버전.*주요|후보안.*추천/)
    expect(flexibleOperationsSection).not.toContain('누적 공정성')
    expect(flexibleOperationsSection).not.toContain('rolling')
    expect(flexibleOperationsSection).not.toContain('근무자별 현황')

    const fairnessManagementSection = sections[4].text()
    expect(fairnessManagementSection).toContain('공정하게 관리합니다')
    expect(fairnessManagementSection).toContain('확정 이력')
    expect(fairnessManagementSection).toContain('누적')
    expect(fairnessManagementSection).toMatch(/기간|rolling/)
    expect(fairnessManagementSection).toContain('근무자별')
    expect(fairnessManagementSection).toContain('rolling')
    expect(fairnessManagementSection).toContain('누적 기준')
    expect(fairnessManagementSection).toContain('누적 공정성')
  })

  it('reveals value sections immediately when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined)

    const wrapper = mountLanding()

    wrapper.findAll('[data-test="public-value-section"]').forEach((section) => {
      expect(section.classes().join(' ')).not.toContain('opacity-0')
    })
  })

  it('disconnects the value section reveal observer on unmount', () => {
    const observe = vi.fn()
    const unobserve = vi.fn()
    const disconnect = vi.fn()

    vi.stubGlobal(
      'IntersectionObserver',
      vi.fn(function () {
        return {
          root: null,
          rootMargin: '0px',
          thresholds: [0],
          observe,
          unobserve,
          disconnect,
          takeRecords: vi.fn(() => []),
        }
      }),
    )

    const wrapper = mountLanding()
    const valueSectionElements = wrapper
      .findAll('[data-test="public-value-section"]')
      .map((section) => section.element)
    wrapper.unmount()

    expect(observe).toHaveBeenCalledTimes(5)
    expect(observe.mock.calls.map(([element]) => element)).toEqual(valueSectionElements)
    expect(disconnect).toHaveBeenCalledOnce()
  })

  it('does not apply reveal motion classes when reduced motion is preferred', () => {
    const matchMedia = stubReducedMotion(true)

    const wrapper = mountLanding()

    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
    wrapper.findAll('[data-test="public-value-section"]').forEach((section) => {
      const classes = section.classes()

      expect(classes).not.toContain('translate-y-3')
      expect(classes).not.toContain('translate-y-4')
      expect(classes).not.toContain('opacity-0')
    })
  })

  it('removes draft wording and uses result/version preview language', () => {
    const wrapper = mountLanding()

    expect(wrapper.text()).not.toContain('초안')
    expect(wrapper.text()).not.toContain('후보안')
    expect(wrapper.text()).toContain('AI 생성 근무표')
    expect(wrapper.text()).toContain('버전 A')
    expect(wrapper.text()).toContain('버전 B')
    expect(wrapper.text()).toContain('연속 야간 제한')
    expect(wrapper.text()).toContain('연속 야간 4회 이상 배치가 없도록 점검합니다.')
    expect(wrapper.text()).toContain('야간 후 휴식')
    expect(wrapper.text()).toContain('연속 야간이 끝난 뒤 48시간 이상 휴식이 확보되는지 확인합니다.')
    expect(wrapper.text()).toContain('NOD 금지')
    expect(wrapper.text()).toContain('필요 인력 충족')
    expect(wrapper.text()).toContain('확정 전')
  })

  it('renders public sections without authenticated app chrome text', () => {
    const wrapper = mountLanding()
    const inquiry = wrapper.get('[data-test="public-inquiry-section"]')
    const bottomActions = inquiry
      .findAll('[data-test="public-bottom-inquiry"], [data-test="public-bottom-signup"]')
      .map((link) => link.text())

    expect(inquiry.text()).toContain('도입 문의')
    expect(wrapper.get('[data-test="public-header"]').text()).toContain('회원 가입')
    expect(inquiry.text()).not.toContain('회원 가입')
    expect(bottomActions).toEqual(['도입 문의'])
    expect(wrapper.find('[data-test="public-bottom-signup"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="public-bottom-inquiry"]').attributes('href')).toBe(INQUIRY_FORM_URL)
    expect(wrapper.get('[data-test="public-bottom-inquiry"]').attributes('target')).toBe('_blank')
    expect(wrapper.get('[data-test="public-bottom-inquiry"]').attributes('rel')).toBe(
      'noopener noreferrer',
    )
    expect(wrapper.find('[data-test="public-footer"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="organization-switcher"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="app-sidebar"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="app-header"]').exists()).toBe(false)
    expect(wrapper.find('.n-layout-sider').exists()).toBe(false)
    expect(wrapper.find('.n-layout-header').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('로그아웃')
    expect(wrapper.text()).not.toContain('조직 선택')
    expect(wrapper.text()).not.toContain('근무표 관리')
  })

  it('uses the same configured inquiry URL for every public inquiry CTA', () => {
    const wrapper = mountLanding()
    const inquiryLinks = wrapper.findAll(
      '[data-test="public-header-inquiry"], [data-test="public-hero-inquiry"], [data-test="public-bottom-inquiry"]',
    )

    expect(inquiryLinks).toHaveLength(3)
    expect(inquiryLinks.map((link) => link.attributes('href'))).toEqual([
      INQUIRY_FORM_URL,
      INQUIRY_FORM_URL,
      INQUIRY_FORM_URL,
    ])
    inquiryLinks.forEach((link) => {
      expect(link.attributes('target')).toBe('_blank')
      expect(link.attributes('rel')).toBe('noopener noreferrer')
    })
  })
})
