import { expect, test } from '@playwright/test'
import {
  APP_HOME_ROUTE_PATH,
  LEGACY_APPROVAL_QUEUE_ROUTE_PATH,
  LEGACY_SCHEDULE_STEP1_ROUTE_PATH,
  LEGACY_SCHEDULE_STEP5_ROUTE_PREFIX,
  getApprovalQueueRoutePath,
  getScheduleStep5RoutePath,
  getScheduleStepRoutePath,
} from '../../src/constants/routes'
import {
  mockRbacContext,
  seedPlaywrightAuthState,
  seedScheduleWizardContext,
  seedSelectedOrganization,
} from './helpers'

test.describe('public launch route contract', () => {
  test('authenticated admin can open canonical /app dashboard', async ({ page }) => {
    await seedPlaywrightAuthState(page)
    await mockRbacContext(page, 'admin_active')

    await page.goto(APP_HOME_ROUTE_PATH)

    await expect(page).toHaveURL(new RegExp(`${APP_HOME_ROUTE_PATH}$`))
    await expect(page.getByRole('heading', { name: '근무표 관리', exact: true }).last()).toBeVisible()
  })

  test('legacy approval queue redirects to canonical /app approval queue', async ({ page }) => {
    await seedPlaywrightAuthState(page)
    await mockRbacContext(page, 'super_active')

    await page.goto(LEGACY_APPROVAL_QUEUE_ROUTE_PATH)

    await expect(page).toHaveURL(new RegExp(`${getApprovalQueueRoutePath()}$`))
    await expect(page.getByRole('heading', { name: '관리자 가입 승인', exact: true })).toBeVisible()
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

    await expect(page).toHaveURL(new RegExp(`${getScheduleStepRoutePath(1)}$`))
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
