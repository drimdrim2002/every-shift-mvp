export type LandingSectionId =
  | 'ai-schedule'
  | 'condition-reflection'
  | 'guide-check'
  | 'flexible-operations'
  | 'fairness-management'

export type LandingPreviewVariant = 'overview' | 'ai' | 'conditions' | 'guide' | 'compare' | 'fairness'

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
  details: readonly string[]
  preview: LandingPreviewVariant
}

export const publicLandingHero: PublicLandingHeroContent = {
  kicker: '',
  sloganLines: ['모두의 근무표', '근무표의 모든 것'],
  body:
    'everyshift가 근무표 생성의 표준을 제시합니다.',
}

export const publicLandingSections: readonly PublicLandingValueSection[] = [
  {
    id: 'ai-schedule',
    navLabel: 'AI',
    headline: 'AI가 근무표를 작성합니다',
    description:
      '최적화 전문가가 개발한 AI Solver가 근무표를 자동으로 생성합니다.',
    details: [
    
    ],
    preview: 'ai',
  },
  {
    id: 'condition-reflection',
    navLabel: 'Agile',
    headline: '다양한 요구 사항을 유연하게 반영합니다',
    description:
      '물류/SCM 분야 컨설턴트 경험으로 다양한 요구 사항을 분석하고 Agile하게 반영합니다.',
    details: [],
    preview: 'conditions',
  },
  {
    id: 'guide-check',
    navLabel: '가이드라인 점검',
    headline: '보건 복지부 가이드라인을 점검합니다',
    description:
      '근로기준법의 근무 시간, 야간 근무에 대한 규정을 준수하고 위반 여부를 점검합니다.',
    details: [
      ],
    preview: 'guide',
  },
  {
    id: 'flexible-operations',
    navLabel: '유연한 운영',
    headline: '근무표 결과를 유연하게 운영할 수 있습니다',
    description:
      '생성된 근무표 결과를 직접 수정하고 저장한 뒤 재검증을 거쳐 Excel로 내보낼 수 있습니다.',
    details: [
      '결과 직접 수정 후 저장',
      '저장된 여러 버전 확인',
      '재검증 후 Excel 내보내기',
    ],
    preview: 'compare',
  },
  {
    id: 'fairness-management',
    navLabel: '공정성 관리',
    headline: '근무표를 지속적으로 공정하게 관리합니다',
    description:
      '근무자 별 야간, 공휴일, Off 요청 일수를 장기적으로 공정하게 관리합니다.',
    details: [
     ],
    preview: 'fairness',
  },
] as const
