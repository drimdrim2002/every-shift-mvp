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
  kicker: '간호사 근무표 생성/검토',
  sloganLines: ['근무표 생성부터', '검토와 내보내기까지'],
  body:
    'EveryShift는 병동 조건, Off 요청, 가이드라인 점검을 함께 보며 간호사 근무표를 만들고 확정 전 검토할 수 있게 돕습니다.',
}

export const publicLandingSections: readonly PublicLandingValueSection[] = [
  {
    id: 'ai-schedule',
    navLabel: '자동 완성',
    headline: '근무표 자동 완성 흐름을 검토 가능한 결과로 보여줍니다',
    description:
      '병동 조건과 Off 요청을 입력한 뒤 자동 완성 흐름을 실행하고, 반영 결과를 확정 전 검토할 수 있습니다.',
    details: [
      '병동 조건과 Off 요청 기반 자동 완성 흐름',
      '반영/미반영 항목을 확인할 수 있는 결과 화면',
      '확정 전 검토 가능한 근무표 결과 제공',
    ],
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
    headline: '확정 전 가이드라인을 점검합니다',
    description:
      '연속 야간, 야간 후 휴식, NOD 금지, 필요 인력 충족 여부를 확정 전에 확인하고 검토 항목으로 남깁니다.',
    details: [
      '연속 야간과 야간 후 휴식 기준 점검',
      'NOD 금지와 필요 인력 충족 여부 확인',
      '확정 전 검토 항목 표시',
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
    headline: '근무표를 계속 공정하게 관리합니다',
    description:
      '확정 이력과 근무자별 야간, 주말, Off 현황을 기간별 rolling 관점으로 확인해 누적 기준의 공정성을 관리합니다.',
    details: [
      '확정 이력 기반 기간별 rolling 확인',
      '근무자별 야간/주말/Off 누적 현황',
      '누적 공정성 확인',
    ],
    preview: 'fairness',
  },
] as const
