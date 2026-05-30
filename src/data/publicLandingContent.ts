export type LandingSectionId =
  | 'ai-schedule'
  | 'fairness-management'
  | 'condition-reflection'
  | 'guide-check'
  | 'flexible-operations'

export type LandingPreviewVariant = 'overview' | 'ai' | 'fairness' | 'conditions' | 'guide' | 'compare'

export interface PublicLandingHeroContent {
  kicker: string
  sloganLines: readonly [string, string]
  body: string
}

export interface PublicLandingValueSection {
  id: LandingSectionId
  navLabel: string
  headline: string
  description: string
  preview: LandingPreviewVariant
}

export const publicLandingHero: PublicLandingHeroContent = {
  kicker: '교대 근무표 자동 생성 AI 솔루션',
  sloganLines: ['모두의 근무표', '근무표의 모든 것'],
  body:
    '수간호사와 현장 관리자의 실무 노하우를 바탕으로 AI가 교대 근무표 작성 시간을 90% 이상 단축합니다. 병원부터 일반 기업까지, 이제 복잡한 스케줄링 스트레스에서 벗어나 본연의 업무에만 집중하세요.',
}

export const publicLandingSections: readonly PublicLandingValueSection[] = [
  {
    id: 'ai-schedule',
    navLabel: 'AI 스케줄링',
    headline: '현장의 노하우를 학습한 AI가 최적의 근무표를 제안합니다',
    description:
      '필요 인력, 개인별 오프 요청 등 복잡한 제약 조건을 AI가 분석하여 각 부서에 최적화된 교대 근무표를 자동 생성합니다.',
    preview: 'ai',
  },
  {
    id: 'fairness-management',
    navLabel: '공정성 관리',
    headline: '누적 데이터로 모두가 만족하는 공정한 일정을 배분합니다',
    description:
      '야간(Night) 근무 횟수, 주말 및 휴일 근무 빈도 등을 장기적으로 추적하여 근로자 간의 업무 불균형을 방지하고 만족도를 높입니다.',
    preview: 'fairness',
  },
  {
    id: 'condition-reflection',
    navLabel: '맞춤형 규칙 설정',
    headline: '조직마다 다른 고유한 근무 규칙을 유연하게 반영합니다',
    description:
      '오래된 컨설팅 경험으로 다양한 요구 사항을 분석하고 Agile하게 반영합니다.',
    preview: 'conditions',
  },
  {
    id: 'guide-check',
    navLabel: '컴플라이언스',
    headline: '보건복지부 가이드라인을 준수합니다',
    description:
      '법정 최대 근로 시간, 야간 근무 연속 제한 등을 반영하여 규정 위반으로 인한 법적 리스크를 사전에 예방합니다.',
    preview: 'guide',
  },
  {
    id: 'flexible-operations',
    navLabel: '유연한 편집과 엑셀',
    headline: '근무표를 자유롭게 편집하고 익숙한 엑셀로 공유하세요',
    description:
      '생성된 근무표는 직관적인 화면에서 언제든 수동으로 미세 조정할 수 있습니다. 확정된 최종 스케줄은 클릭 한 번으로 엑셀 양식으로 변환되어 즉시 배포 가능합니다.',
    preview: 'compare',
  },
] as const

/** Sections shown on the public landing page and in static SEO HTML (excludes compare-only preview). */
export const visiblePublicLandingSections = publicLandingSections.filter(
  (section) => section.preview !== 'compare',
)
