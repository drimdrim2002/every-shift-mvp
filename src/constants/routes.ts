export const LOGIN_ROUTE_PATH = '/login'
export const SIGNUP_ROUTE_PATH = '/signup'
export const POST_AUTH_REDIRECT_PATH = '/schedule/step1'

const AUTH_PAGE_PATH_SET = new Set([LOGIN_ROUTE_PATH, SIGNUP_ROUTE_PATH])

export function isAuthPagePath(path: string): boolean {
  return AUTH_PAGE_PATH_SET.has(path)
}
