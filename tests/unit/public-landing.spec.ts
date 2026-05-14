import { mount, RouterLinkStub } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LandingProductPreview from '@/components/public/LandingProductPreview.vue'
import { LOGIN_ROUTE_PATH, SIGNUP_ROUTE_PATH } from '@/constants/routes'
import type { LandingPreviewVariant } from '@/data/publicLandingContent'
import PublicLandingView from '@/views/PublicLandingView.vue'

const INQUIRY_FORM_URL = 'https://forms.gle/everyshift-public-inquiry'
const expectedHeroSloganLines = ['모두의 근무표', '근무표의 모든 것'] as const
const previewTrustSignals: Record<Exclude<LandingPreviewVariant, 'overview' | 'compare'>, readonly string[]> = {
  ai: ['근무표 초안 미리보기', '대형병원 Excel 구조', '30명 x 36일', '수간호사 자문'],
  fairness: ['근무자별 공정성 비교', '야간 근무', '주말·공휴일', '다음 생성 기준'],
  conditions: ['반영', '검토', '사유'],
  guide: ['보건복지부 가이드라인', '충족', 'NOD', '월 야간'],
}
const previewTrustSignalEntries = Object.entries(previewTrustSignals) as Array<
  [Exclude<LandingPreviewVariant, 'overview' | 'compare'>, readonly string[]]
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
  it('does not render the retired overview product mock', () => {
    const wrapper = mount(LandingProductPreview, {
      props: { variant: 'overview' },
    })

    expect(wrapper.text()).not.toContain('AI 생성 근무표')
    expect(wrapper.text()).not.toContain('Off 요청')
    expect(wrapper.text()).not.toContain('가이드라인 점검')
    expect(wrapper.text()).not.toContain('Excel 내보내기')
    expect(wrapper.text()).not.toContain('확정 이력 기반 근무자별 누적 기준')
    wrapper.unmount()
  })

  it('hides the compare preview until the mock is ready to reintroduce', () => {
    const wrapper = mount(LandingProductPreview, {
      props: { variant: 'compare' },
    })

    expect(wrapper.find('[data-test="landing-product-preview"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('결과 직접 수정')
    expect(wrapper.text()).not.toContain('재검증 필요')
    expect(wrapper.text()).not.toContain('버전 A 저장됨')
    wrapper.unmount()
  })

  it.each(previewTrustSignalEntries)('renders %s preview trust signals', (variant, signals) => {
    const wrapper = mount(LandingProductPreview, {
      props: { variant },
    })

    signals.forEach((signal) => {
      expect(wrapper.text()).toContain(signal)
    })
    wrapper.unmount()
  })

  it('renders the AI preview as an in-component schedule mock instead of a static image', () => {
    const wrapper = mount(LandingProductPreview, {
      props: { variant: 'ai' },
    })
    const text = wrapper.text()
    const scheduleMock = wrapper.get('[data-test="landing-ai-schedule-mock"]')
    const scrollWrapper = wrapper.get('[data-test="landing-ai-schedule-scroll"]')
    const table = scheduleMock.get('table')
    const proofPanel = wrapper.get('[data-test="landing-ai-proof-panel"]')
    const proofItems = proofPanel.findAll('[data-test="landing-ai-proof-item"]')
    const dateHeaders = scheduleMock.findAll('[data-test="landing-ai-day-header"]')
    const employeeCells = scheduleMock.findAll('[data-test="landing-ai-employee-cell"]')
    const shiftCells = scheduleMock.findAll('[data-test="landing-ai-shift-cell"]')
    const offRequestCells = shiftCells.filter((cell) => cell.attributes('data-off-requested') === 'true')

    expect(wrapper.find('[data-test="landing-schedule-preview-image"]').exists()).toBe(false)
    expect(scheduleMock.exists()).toBe(true)
    expect(scrollWrapper.classes()).toContain('overflow-x-auto')
    expect(table.classes().some((className) => className.startsWith('min-w-'))).toBe(true)
    expect(text).toContain('근무표 초안 미리보기')
    expect(text).toContain('대형병원 Excel 구조')
    expect(text).toContain('30명 x 36일')
    expect(text).toContain('현직 수간호사 자문 기준')
    expect(text).not.toContain('Excel 내보내기')
    expect(text).not.toContain('생성 기준 요약')

    expect(dateHeaders).toHaveLength(10)
    dateHeaders.forEach((header) => {
      expect(header.text()).toMatch(/^\d{1,2}\/\d{1,2}$/)
    })

    expect(employeeCells).toHaveLength(12)
    employeeCells.forEach((cell) => {
      expect(cell.text()).not.toMatch(/\d/)
    })

    expect(scheduleMock.findAll('[data-test="landing-ai-employee-summary-cell"]')).toHaveLength(0)
    expect(scheduleMock.findAll('[data-test="landing-ai-summary-row"]')).toHaveLength(0)
    expect(proofItems.length).toBeGreaterThanOrEqual(4)

    shiftCells.forEach((cell) => {
      expect(['D', 'E', 'N', 'O']).toContain(cell.text())
    })

    const shiftCellCountByDay = new Map<string, Record<'D' | 'E' | 'N' | 'O', number>>()
    dateHeaders.forEach((header) => {
      const dayId = header.attributes('data-day-id')
      shiftCellCountByDay.set(dayId, { D: 0, E: 0, N: 0, O: 0 })
    })

    shiftCells.forEach((cell) => {
      const dayId = cell.attributes('data-day-id')
      const code = cell.text() as 'D' | 'E' | 'N' | 'O'
      const counts = shiftCellCountByDay.get(dayId)

      expect(counts).toBeDefined()
      counts![code] += 1
    })

    const expectedDailyCounts = {
      D: 3,
      E: 4,
      N: 3,
    } as const

    ;(['D', 'E', 'N'] as const).forEach((code) => {
      dateHeaders.forEach((header) => {
        const dayId = header.attributes('data-day-id')
        const actualCount = shiftCellCountByDay.get(dayId)?.[code] ?? 0

        expect(actualCount).toBe(expectedDailyCounts[code])
      })
    })

    expect(offRequestCells.length).toBeGreaterThan(0)
    offRequestCells.forEach((cell) => {
      expect(cell.text()).toBe('O')
      expect(cell.classes().join(' ')).toMatch(/(?:ring|border)-rose/)
    })

    wrapper.unmount()
  })

  it('renders the guide preview as a static compliance result mock', () => {
    const wrapper = mount(LandingProductPreview, {
      props: { variant: 'guide' },
    })
    const text = wrapper.text()

    expect(text).toContain('보건복지부 가이드라인')
    expect(text).toContain('충족')
    expect(text).toContain('위반 없음')
    expect(text).toContain('보건복지부 가이드라인 위반 항목이 없습니다.')
    expect(text).toContain('4일속 야간 금지 (3연속 허용)')
    expect(text).toContain('월 야간 15회 이하')
    expect(text).not.toContain('경고 하이라이트')
    expect(text).not.toContain('부족')
    wrapper.unmount()
  })

  it('renders the fairness preview as a mobile-first employee metric comparison', () => {
    const wrapper = mount(LandingProductPreview, {
      props: { variant: 'fairness' },
    })
    const text = wrapper.text()

    expect(text).toContain('근무자별 공정성 비교')
    expect(text).toContain('직원별 평균 대비 차이')
    expect(text).toContain('야간 근무')
    expect(text).toContain('주말·공휴일 근무')
    expect(text).toContain('Off 요청 수락')
    expect(text).toContain('전체 평균 14.5일')
    expect(text).toContain('평균과의 차이 +8.1일')
    expect(text).toContain('다음 근무표 생성 시 조정 기준')
    expect(text).toContain('주말·공휴일 과다 배정')
    expect(text).not.toContain('확정 이력 기반 근무자별 누적 기준')
    expect(text).not.toContain('최소/최대 차이와 평균을 함께 검토합니다.')
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
    const slogan = wrapper.get('[data-test="public-hero-slogan"]')

    expect(heroText).toContain('모두의 근무표')
    expect(heroText).toContain('근무표')
    expect(heroText).toContain('근무표의 모든 것')
    expect(sloganLines).toEqual([...expectedHeroSloganLines])
    expect(slogan.classes()).toContain('gap-y-[0.28em]')
    expect(hero.get('[data-test="public-hero-body"]').text()).toBe(
      'everyshift가 근무표 생성의 표준을 제시합니다.',
    )
    expect(hero.get('[data-test="public-hero-body"]').classes()).toContain('whitespace-pre-line')
    expect(hero.find('[data-test="landing-product-preview"]').exists()).toBe(false)
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

    expect(sections).toHaveLength(4)
    expect(sections[0].text()).toContain('AI 전문가가 수간호사 자문을 받아 설계했습니다')
    expect(sections[0].find('[data-test="landing-ai-schedule-mock"]').exists()).toBe(true)
    expect(sections[0].get('[data-test="public-value-section-nav-label"]').classes()).toContain('text-2xl')
    expect(sections[0].get('[data-test="public-value-section-copy"]').classes()).toContain('max-w-4xl')
    expect(sections[0].get('[data-test="public-value-section-description"]').classes()).toContain('max-w-4xl')
    expect(sections[0].get('[data-test="public-value-section-description"]').classes()).toContain('break-keep')
    expect(sections[0].get('[data-test="public-value-section-description"]').classes()).not.toContain('max-w-2xl')
    expect(sections[0].get('[data-test="public-value-section-preview"]').classes()).not.toContain('max-w-4xl')
    expect(sections[0].get('[data-test="public-value-section-preview"]').classes()).not.toContain('self-center')
    expect(sections[1].text()).toContain('공정하게 관리합니다')
    expect(sections[2].text()).toContain('다양한 요구 사항을 유연하게 반영합니다')
    expect(sections[3].text()).toMatch(/가이드라인|점검/)
    expect(wrapper.find('#flexible-operations').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('유연한 운영')
    expect(wrapper.text()).not.toContain('근무표 결과를 유연하게 운영할 수 있습니다')

    const guideSection = wrapper.get('#guide-check').text()
    expect(guideSection).toMatch(/확인|점검|검토/)

    const fairnessManagementSection = sections[1].text()
    expect(fairnessManagementSection).toContain('공정하게 관리합니다')
    expect(fairnessManagementSection).toContain('다음 생성 기준')
    expect(fairnessManagementSection).toContain('야간 근무')
    expect(fairnessManagementSection).toContain('주말·공휴일')
    expect(fairnessManagementSection).toContain('근무자별')
    expect(fairnessManagementSection).toContain('평균 대비 차이')
    expect(fairnessManagementSection).toContain('조정 기준')
  })

  it('reveals value sections immediately when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined)

    const wrapper = mountLanding()

    wrapper.findAll('[data-test="public-value-section"]').forEach((section) => {
      expect(section.classes().join(' ')).not.toContain('opacity-0')
      expect(section.get('[data-test="public-value-section-copy"]').classes()).not.toContain('opacity-0')
      expect(section.get('[data-test="public-value-section-preview"]').classes()).not.toContain('opacity-0')
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

    expect(observe).toHaveBeenCalledTimes(4)
    expect(observe.mock.calls.map(([element]) => element)).toEqual(valueSectionElements)
    expect(disconnect).toHaveBeenCalledOnce()
  })

  it('does not apply reveal motion classes when reduced motion is preferred', () => {
    const matchMedia = stubReducedMotion(true)

    const wrapper = mountLanding()

    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
    wrapper.findAll('[data-test="public-value-section"]').forEach((section) => {
      const classes = [
        ...section.classes(),
        ...section.get('[data-test="public-value-section-copy"]').classes(),
        ...section.get('[data-test="public-value-section-preview"]').classes(),
      ]

      expect(classes).not.toContain('translate-y-3')
      expect(classes).not.toContain('translate-y-4')
      expect(classes).not.toContain('opacity-0')
    })
  })

  it('uses compact schedule preview and proof language', () => {
    const wrapper = mountLanding()

    expect(wrapper.text()).toContain('근무표 초안 미리보기')
    expect(wrapper.text()).toContain('표본 12명 x 10일 표시')
    expect(wrapper.text()).toContain('실제 입력 흐름은 30명 x 36일 기준')
    expect(wrapper.text()).toContain('현직 수간호사 자문 기준')
    expect(wrapper.text()).not.toContain('후보안')
    expect(wrapper.text()).not.toContain('AI 생성 근무표')
    expect(wrapper.text()).not.toContain('생성 기준 요약')
    expect(wrapper.find('[data-test="landing-schedule-preview-image"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="landing-ai-schedule-mock"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('버전 A')
    expect(wrapper.text()).not.toContain('버전 B')
    expect(wrapper.text()).toContain('보건복지부 가이드라인')
    expect(wrapper.text()).toContain('4일속 야간 금지 (3연속 허용)')
    expect(wrapper.text()).toContain('연속 야간 후 48시간 휴식')
    expect(wrapper.text()).toContain('월 야간 15회 이하')
    expect(wrapper.text()).toContain('NOD 금지')
    expect(wrapper.text()).toContain('필요 인력 충족')
    expect(wrapper.text()).toContain('가이드라인')
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
