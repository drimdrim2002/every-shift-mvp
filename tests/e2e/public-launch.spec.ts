import { expect, test } from '@playwright/test'
import {
  APP_HOME_ROUTE_PATH,
  LEGACY_APPROVAL_QUEUE_ROUTE_PATH,
  LEGACY_OPS_OFF_REQUEST_POLICY_SETUP_ROUTE_PATH,
  LEGACY_OPS_ORGANIZATION_SETUP_ROUTE_PATH,
  LEGACY_SCHEDULE_STEP1_ROUTE_PATH,
  LEGACY_SCHEDULE_STEP5_ROUTE_PREFIX,
  LEGACY_USER_HOME_ROUTE_PATH,
  getApprovalQueueRoutePath,
  getOpsOffRequestPolicySetupRoutePath,
  getOpsOrganizationSetupRoutePath,
  getScheduleStep5RoutePath,
  getScheduleStepRoutePath,
  getUserHomeRoutePath,
} from '../../src/constants/routes'
import {
  mockRbacContext,
  seedPlaywrightAuthState,
  seedScheduleWizardContext,
  seedSelectedOrganization,
} from './helpers'

test.describe('public launch route contract', () => {
  test('logged-out visitor sees public landing at root without app chrome', async ({ page }) => {
    await page.context().clearCookies()
    await page.addInitScript(() => {
      window.localStorage.clear()
      window.sessionStorage.clear()
    })

    await page.goto('/')

    const landing = page.getByTestId('public-landing')
    await expect(page).toHaveURL(/\/$/)
    await expect(landing).toBeVisible()
    await expect(landing.getByRole('link', { name: '로그인' })).toBeVisible()
    await expect(landing.getByRole('link', { name: '회원 가입' }).first()).toBeVisible()
    await expect(landing.getByRole('link', { name: '도입 문의' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: '로그아웃' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: '근무표 관리', exact: true })).toHaveCount(0)
  })

  test('authenticated admin visiting root enters the canonical app workspace', async ({ page }) => {
    await seedPlaywrightAuthState(page)
    await mockRbacContext(page, 'admin_active')

    await page.goto('/')

    await expect(page).toHaveURL((url) => url.pathname === APP_HOME_ROUTE_PATH)
    await expect(page.getByRole('heading', { name: '근무표 관리', exact: true }).last()).toBeVisible()
  })

  test('authenticated admin can open canonical /app dashboard', async ({ page }) => {
    await seedPlaywrightAuthState(page)
    await mockRbacContext(page, 'admin_active')

    await page.goto(APP_HOME_ROUTE_PATH)

    await expect(page).toHaveURL((url) => url.pathname === APP_HOME_ROUTE_PATH)
    await expect(page.getByRole('heading', { name: '근무표 관리', exact: true }).last()).toBeVisible()
  })

  test('legacy approval queue redirects to canonical /app approval queue', async ({ page }) => {
    await seedPlaywrightAuthState(page)
    await mockRbacContext(page, 'super_active')

    await page.goto(LEGACY_APPROVAL_QUEUE_ROUTE_PATH)

    await expect(page).toHaveURL((url) => url.pathname === getApprovalQueueRoutePath())
    await expect(page.getByRole('heading', { name: '관리자 가입 승인', exact: true })).toBeVisible()
  })

  test('legacy restricted user home redirects to canonical /app user home', async ({ page }) => {
    await seedPlaywrightAuthState(page)
    await mockRbacContext(page, 'user_active')

    await page.goto(LEGACY_USER_HOME_ROUTE_PATH)

    await expect(page).toHaveURL((url) => url.pathname === getUserHomeRoutePath())
    await expect(page.getByRole('heading', { name: '운영 권한 안내', exact: true })).toBeVisible()
  })

  test('legacy organization setup redirects to canonical /app organization setup', async ({ page }) => {
    await seedPlaywrightAuthState(page)
    await mockRbacContext(page, 'admin_active')
    await seedSelectedOrganization(page, 'org-1')

    await page.goto(LEGACY_OPS_ORGANIZATION_SETUP_ROUTE_PATH)

    await expect(page).toHaveURL((url) => url.pathname === getOpsOrganizationSetupRoutePath())
    await expect(page.getByRole('heading', { name: '운영 기본 설정', exact: true })).toBeVisible()
  })

  test('legacy off-request policy setup redirects to canonical /app policy setup', async ({ page }) => {
    await seedPlaywrightAuthState(page)
    await mockRbacContext(page, 'admin_active')
    await seedSelectedOrganization(page, 'org-1')

    await page.goto(LEGACY_OPS_OFF_REQUEST_POLICY_SETUP_ROUTE_PATH)

    await expect(page).toHaveURL((url) => url.pathname === getOpsOffRequestPolicySetupRoutePath())
    await expect(page.getByRole('heading', { name: 'Off 사용 기준 설정', exact: true })).toBeVisible()
  })

  test('legacy schedule step1 redirects to canonical /app schedule step1', async ({ page }) => {
    await seedPlaywrightAuthState(page)
    await mockRbacContext(page, 'admin_active')
    await seedSelectedOrganization(page, 'org-1')
    await page.goto(APP_HOME_ROUTE_PATH)
    await expect(page.getByRole('heading', { name: '근무표 관리', exact: true }).last()).toBeVisible()
    await seedScheduleWizardContext(page, {
      organizationId: 'org-1',
      organizationName: '서버 병원',
      organizationType: 'hospital',
      month: '2026-05',
      employeeCount: 1,
    })

    await page.goto(LEGACY_SCHEDULE_STEP1_ROUTE_PATH)

    await expect(page).toHaveURL((url) => url.pathname === getScheduleStepRoutePath(1))
    await expect(page.getByText('근무표 생성 - 기본 정보 설정')).toBeVisible()
  })

  test('legacy schedule step5 redirects to canonical /app schedule step5', async ({ page }) => {
    await seedPlaywrightAuthState(page)
    await mockRbacContext(page, 'admin_active')
    await seedSelectedOrganization(page, 'org-1')
    await page.goto(APP_HOME_ROUTE_PATH)
    await expect(page.getByRole('heading', { name: '근무표 관리', exact: true }).last()).toBeVisible()
    await seedScheduleWizardContext(page, {
      organizationId: 'org-1',
      organizationName: '서버 병원',
      organizationType: 'hospital',
      month: '2026-05',
      employeeCount: 1,
      schedulePublicId: 'schedule-123',
    })

    await page.goto(`${LEGACY_SCHEDULE_STEP5_ROUTE_PREFIX}schedule-123?version=draft#result`)

    await expect(page).toHaveURL((url) =>
      url.pathname === getScheduleStep5RoutePath('schedule-123')
      && url.searchParams.get('version') === 'draft'
      && url.hash === '#result'
    )
  })
})
