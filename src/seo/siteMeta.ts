export const DEFAULT_SITE_URL = 'https://www.everyshift.co.kr'

export const SITE_NAME = 'EveryShift'

export const DEFAULT_PAGE_TITLE = 'EveryShift | 교대 근무표 AI 솔루션'

export const DEFAULT_PAGE_DESCRIPTION =
  'EveryShift는 간호사를 포함한 모든 교대 근무자들을 위한 AI 근무표 작성 솔루션입니다. 복잡한 근무표 작성을 클릭 한 번에 해결하세요.'

export function getSiteUrl(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv.trim().replace(/\/$/, '')
  }

  return DEFAULT_SITE_URL
}

export function toAbsoluteUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getSiteUrl()}${normalizedPath}`
}

export const landingSeoMeta = {
  title: DEFAULT_PAGE_TITLE,
  description: DEFAULT_PAGE_DESCRIPTION,
  canonicalPath: '/',
} as const

export const loginSeoMeta = {
  title: '로그인',
  description: '승인된 계정으로 EveryShift 근무표 작업 공간에 로그인합니다.',
  canonicalPath: '/login',
} as const

export const signupSeoMeta = {
  title: '회원가입',
  description: 'EveryShift에 가입하고 교대 근무표 AI 솔루션을 시작하세요.',
  canonicalPath: '/signup',
} as const

export const NOINDEX_ROBOTS = 'noindex, follow'
