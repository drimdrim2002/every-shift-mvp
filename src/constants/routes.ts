import type { AccessState } from '@/types/rbac'

export const HOME_ROUTE_PATH = '/'
export const LOGIN_ROUTE_PATH = '/login'
export const SIGNUP_ROUTE_PATH = '/signup'
export const ACCESS_PENDING_ROUTE_PATH = '/access/pending'
export const ACCESS_REJECTED_ROUTE_PATH = '/access/rejected'
export const APPROVAL_QUEUE_ROUTE_PATH = '/admin/approval-queue'

const AUTH_PAGE_PATH_SET = new Set([LOGIN_ROUTE_PATH, SIGNUP_ROUTE_PATH])

export function isAuthPagePath(path: string): boolean {
  return AUTH_PAGE_PATH_SET.has(path)
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
    case 'super_active':
    case 'user_active':
      return HOME_ROUTE_PATH
    case 'no_membership_or_inactive':
    case 'unauthenticated':
      return LOGIN_ROUTE_PATH
    default:
      return HOME_ROUTE_PATH
  }
}
