import { expect, test, type Page } from '@playwright/test'
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
  buildPublicLaunchAuthStorageState,
  mockPublicLaunchRbacContext,
  seedPublicLaunchScheduleWizardContext,
  seedPublicLaunchSelectedOrganization,
} from './helpers'

async function openLoggedOutLanding(page: Page, path = '/') {
  await page.context().clearCookies()
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
  await page.goto(path)
}

async function expectNoPageHorizontalOverflow(page: Page) {
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )

  expect(hasHorizontalOverflow).toBe(false)
}

test.describe('public launch route contract', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('logged-out visitor sees public landing at root without app chrome', async ({ page }) => {
    await openLoggedOutLanding(page)

    const landing = page.getByTestId('public-landing')
    await expect(page).toHaveURL(/\/$/)
    await expect(landing).toBeVisible()
    await expect(landing.getByRole('link', { name: '로그인' })).toBeVisible()
    await expect(landing.getByRole('link', { name: '회원 가입' }).first()).toBeVisible()
    await expect(landing.getByRole('link', { name: '도입 문의' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: '로그아웃' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: '근무표 관리', exact: true })).toHaveCount(0)
  })

  test('logged-out mobile landing does not overflow horizontally', async ({ page }) => {
    for (const viewport of [
      { width: 360, height: 740 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport)
      await openLoggedOutLanding(page)

      const signupCta = page.getByTestId('public-hero-signup')
      const inquiryCta = page.getByTestId('public-hero-inquiry')
      const hero = page.getByTestId('public-hero')

      await expect(page.getByTestId('public-landing')).toBeVisible()
      await expect(signupCta).toBeVisible()
      await expect(inquiryCta).toBeVisible()
      await expect(hero.getByTestId('landing-product-preview')).toHaveCount(0)

      const signupBox = await signupCta.boundingBox()
      const inquiryBox = await inquiryCta.boundingBox()

      expect(signupBox).not.toBeNull()
      expect(inquiryBox).not.toBeNull()
      for (const box of [signupBox, inquiryBox]) {
        expect(box?.x ?? Number.NEGATIVE_INFINITY).toBeGreaterThanOrEqual(0)
        expect((box?.x ?? Number.POSITIVE_INFINITY) + (box?.width ?? 0)).toBeLessThanOrEqual(
          viewport.width + 1,
        )
      }
      expect(
        (signupBox?.y ?? Number.POSITIVE_INFINITY) + (signupBox?.height ?? 0),
      ).toBeLessThanOrEqual(viewport.height)
      expect(
        (inquiryBox?.y ?? Number.POSITIVE_INFINITY) + (inquiryBox?.height ?? 0),
      ).toBeLessThanOrEqual(viewport.height)

      await expectNoPageHorizontalOverflow(page)
    }
  })

  test('logged-out mobile landing keeps the AI preview contained', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openLoggedOutLanding(page, '/#ai-schedule')

    const section = page.locator('#ai-schedule')
    await expect(section.getByTestId('landing-ai-schedule-mock')).toBeVisible()
    await expect(section.getByTestId('landing-ai-proof-panel')).toBeVisible()

    await expectNoPageHorizontalOverflow(page)
  })

  test('logged-out mobile landing shows only the AI product preview', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openLoggedOutLanding(page, '/#ai-schedule')

    await expect(page.locator('#ai-schedule').getByTestId('landing-product-preview')).toBeVisible()

    for (const id of ['#fairness-management', '#condition-reflection', '#guide-check']) {
      await expect(page.locator(id).getByTestId('landing-product-preview')).toBeHidden()
    }

    await expectNoPageHorizontalOverflow(page)
  })

  test('logged-out mobile landing keeps the bottom inquiry CTA full width without clipping', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 430, height: 932 })
    await openLoggedOutLanding(page, '/#inquiry')

    const inquirySection = page.getByTestId('public-inquiry-section')
    const bottomInquiry = page.getByTestId('public-bottom-inquiry')

    await expect(inquirySection).toBeVisible()
    await expect(bottomInquiry).toBeVisible()

    const sectionBox = await inquirySection.boundingBox()
    const buttonBox = await bottomInquiry.boundingBox()

    expect(sectionBox).not.toBeNull()
    expect(buttonBox).not.toBeNull()
    expect(buttonBox!.height).toBeGreaterThanOrEqual(44)
    expect(buttonBox!.width).toBeGreaterThanOrEqual(sectionBox!.width - 33)
    expect(buttonBox!.x).toBeGreaterThanOrEqual(sectionBox!.x)
    expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(
      sectionBox!.x + sectionBox!.width + 1,
    )

    await expectNoPageHorizontalOverflow(page)
  })
})

test.describe('authenticated public launch route contract', () => {
  test.use({ storageState: buildPublicLaunchAuthStorageState() })

  test('authenticated admin visiting root enters the canonical app workspace', async ({ page }) => {
    await mockPublicLaunchRbacContext(page, 'admin_active')

    await page.goto('/')

    await expect(page).toHaveURL((url) => url.pathname === APP_HOME_ROUTE_PATH)
    await expect(page.getByRole('heading', { name: '근무표 관리', exact: true }).last()).toBeVisible()
  })

  test('authenticated admin can open canonical /app dashboard', async ({ page }) => {
    await mockPublicLaunchRbacContext(page, 'admin_active')

    await page.goto(APP_HOME_ROUTE_PATH)

    await expect(page).toHaveURL((url) => url.pathname === APP_HOME_ROUTE_PATH)
    await expect(page.getByRole('heading', { name: '근무표 관리', exact: true }).last()).toBeVisible()
  })

  test('legacy approval queue redirects to canonical /app approval queue', async ({ page }) => {
    await mockPublicLaunchRbacContext(page, 'super_active')

    await page.goto(LEGACY_APPROVAL_QUEUE_ROUTE_PATH)

    await expect(page).toHaveURL((url) => url.pathname === getApprovalQueueRoutePath())
    await expect(page.getByRole('heading', { name: '관리자 가입 승인', exact: true })).toBeVisible()
  })

  test('legacy restricted user home redirects to canonical /app user home', async ({ page }) => {
    await mockPublicLaunchRbacContext(page, 'user_active')

    await page.goto(LEGACY_USER_HOME_ROUTE_PATH)

    await expect(page).toHaveURL((url) => url.pathname === getUserHomeRoutePath())
    await expect(page.getByRole('heading', { name: '운영 권한 안내', exact: true })).toBeVisible()
  })

  test('legacy organization setup redirects to canonical /app organization setup', async ({ page }) => {
    await mockPublicLaunchRbacContext(page, 'admin_active')
    await seedPublicLaunchSelectedOrganization(page, 'org-1')

    await page.goto(LEGACY_OPS_ORGANIZATION_SETUP_ROUTE_PATH)

    await expect(page).toHaveURL((url) => url.pathname === getOpsOrganizationSetupRoutePath())
    await expect(page.getByRole('heading', { name: '운영 기본 설정', exact: true })).toBeVisible()
  })

  test('legacy off-request policy setup redirects to canonical /app policy setup', async ({ page }) => {
    await mockPublicLaunchRbacContext(page, 'admin_active')
    await seedPublicLaunchSelectedOrganization(page, 'org-1')

    await page.goto(LEGACY_OPS_OFF_REQUEST_POLICY_SETUP_ROUTE_PATH)

    await expect(page).toHaveURL((url) => url.pathname === getOpsOffRequestPolicySetupRoutePath())
    await expect(page.getByRole('heading', { name: 'Off 사용 기준 설정', exact: true })).toBeVisible()
  })

  test('legacy schedule step1 redirects to canonical /app schedule step1', async ({ page }) => {
    await mockPublicLaunchRbacContext(page, 'admin_active')
    await seedPublicLaunchSelectedOrganization(page, 'org-1')
    await page.goto(APP_HOME_ROUTE_PATH)
    await expect(page.getByRole('heading', { name: '근무표 관리', exact: true }).last()).toBeVisible()
    await seedPublicLaunchScheduleWizardContext(page, {
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
    await mockPublicLaunchRbacContext(page, 'admin_active')
    await seedPublicLaunchSelectedOrganization(page, 'org-1')
    await page.goto(APP_HOME_ROUTE_PATH)
    await expect(page.getByRole('heading', { name: '근무표 관리', exact: true }).last()).toBeVisible()
    await seedPublicLaunchScheduleWizardContext(page, {
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
