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
  sloganLines: ['모두의 근무표,', '근무표의 모든 것'],
  body:
    'EveryShift가 근무표 생성의 표준을 제시합니다.',
}

export const publicLandingSections: readonly PublicLandingValueSection[] = [
  {
    id: 'ai-schedule',
    navLabel: '자동 완성',
    headline: 'AI Solver가 근무표를 자동으로 완성합니다',
    description:
      'SCM/물류 최적화 전문가와 수간호사님들의 도움을 받아 근무표 생성을 위한 AI Solver를 개발하였습니다.',
    details: ['버튼 클릭으로 수분 내 최적화된 근무표 생성', '실제 병원 요구 사항을 분석하고 반영', '기존 근무표와 비교해 개선된 결과 제공'],
    preview: 'ai',
  },
  {
    id: 'condition-reflection',
    navLabel: '조건 반영',
    headline: '병동과 근무자의 조건을 함께 반영합니다',
    description:
      '병동별 필요 인력, 근무자별 가능 근무, Off 요청을 모두 확인해 운영 기준에 맞는 결과를 만듭니다.',
    details: ['요일별 필요 인력 반영', '근무자 직급 및 직무 고려', 'Off 요청 반영 여부와 사유 표시'],
    preview: 'conditions',
  },
  {
    id: 'guide-check',
    navLabel: '가이드라인 점검',
    headline: '보건복지부 근무 가이드라인을 준수합니다',
    description:
      '근로기준법 근무 시간, 야간 근무에 대한 규정 등을 준수하고 위반 여부를 화면에서 바로 확인하도록 설계했습니다.',
    details: ['연속 야간 근무는 최대 3일', '야간 후 휴식 시간 보장', '위반 여부를 쉽게 확인'],
    preview: 'guide',
  },
  {
    id: 'flexible-operations',
    navLabel: '유연한 운영',
    headline: '근무표 결과를 유연하게 운영할 수 있습니다',
    description:
      '생성된 근무표 결과를 직접 수정하고 여러 버전을 비교한 뒤 Excel로 내보낼 수 있습니다.',
    details: [
      '결과 직접 수정',
      '여러 버전의 근무표 비교',
      'Excel 내보내기 전 최종 확인',
    ],
    preview: 'compare',
  },
  {
    id: 'fairness-management',
    navLabel: '공정성 관리',
    headline: '근무표를 계속 공정하게 관리합니다',
    description:
      '근무자별 야간, 주말, Off 현황과 월별 rolling 이력을 함께 확인해 누적 기준의 공정성을 관리합니다.',
    details: ['근무자별 야간/주말/Off 현황 시각화', '월별 rolling 이력 확인', '누적 공정성 확인'],
    preview: 'fairness',
  },
] as const
