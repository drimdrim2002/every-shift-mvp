import type { AccessState } from '@/types/rbac'

export const LOGIN_ROUTE_PATH = '/login'
export const SIGNUP_ROUTE_PATH = '/signup'
export const ACCESS_PENDING_ROUTE_PATH = '/access/pending'
export const ACCESS_REJECTED_ROUTE_PATH = '/access/rejected'
export const ONBOARDING_ROUTE_PATH = '/onboarding'
export const ADMIN_DASHBOARD_ROUTE_PATH = '/dashboard/admin'
export const POST_AUTH_REDIRECT_PATH = '/schedule/step1'

const AUTH_PAGE_PATH_SET = new Set([LOGIN_ROUTE_PATH, SIGNUP_ROUTE_PATH])
const PUBLIC_ROUTE_PATH_SET = new Set([
  LOGIN_ROUTE_PATH,
  SIGNUP_ROUTE_PATH,
  ACCESS_PENDING_ROUTE_PATH,
  ACCESS_REJECTED_ROUTE_PATH,
])

export function isAuthPagePath(path: string): boolean {
  return AUTH_PAGE_PATH_SET.has(path)
}

export function isPublicRoutePath(path: string): boolean {
  return PUBLIC_ROUTE_PATH_SET.has(path)
}

export function isOnboardingRoutePath(path: string): boolean {
  return path === ONBOARDING_ROUTE_PATH
}

export function isAccessStateRoutePath(path: string): boolean {
  return path === ACCESS_PENDING_ROUTE_PATH || path === ACCESS_REJECTED_ROUTE_PATH
}

export function resolvePostAuthRedirectPath(accessState: AccessState | null): string {
  switch (accessState) {
    case 'admin_pending':
      return ACCESS_PENDING_ROUTE_PATH
    case 'admin_rejected':
      return ACCESS_REJECTED_ROUTE_PATH
    case 'admin_active':
    case 'user_active':
    case 'super_active':
      return POST_AUTH_REDIRECT_PATH
    case 'no_membership_or_inactive':
    case 'unauthenticated':
      return LOGIN_ROUTE_PATH
    default:
      return POST_AUTH_REDIRECT_PATH
  }
}
