import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  getAppHomeRoutePath,
  getScheduleStepRoutePath,
  getWorkPerformanceRoutePath,
} from '../../src/constants/routes'
import {
  mockDashboardReadiness,
  mockRbacContext,
  seedScheduleWizardContext,
  seedPlaywrightAuthState,
  seedSelectedOrganization,
  waitForDashboard,
} from './helpers'

test.use({ storageState: { cookies: [], origins: [] } })

async function openAppShell(
  page: Page,
  accessState: 'super_active' | 'admin_active' = 'super_active',
  options: { seedWizardContext?: boolean } = {},
) {
  await seedPlaywrightAuthState(page)
  await mockRbacContext(page, accessState)
  await seedSelectedOrganization(page, 'org-1')
  if (options.seedWizardContext) {
    await seedScheduleWizardContext(page, {
      organizationId: 'org-1',
      organizationName: '서버 병원',
      organizationType: 'hospital',
      month: '2026-05',
      employeeCount: 1,
    })
  }
  await mockDashboardReadiness(page, 'complete')
  await page.goto(getAppHomeRoutePath())
  await waitForDashboard(page)
}

async function expectNoVisibleOverlap(first: Locator, second: Locator) {
  const [leftBox, rightBox] = await Promise.all([
    first.boundingBox(),
    second.boundingBox(),
  ])

  expect(leftBox).not.toBeNull()
  expect(rightBox).not.toBeNull()

  const horizontallySeparated =
    leftBox!.x + leftBox!.width <= rightBox!.x + 2
    || rightBox!.x + rightBox!.width <= leftBox!.x + 2
  const verticallySeparated =
    leftBox!.y + leftBox!.height <= rightBox!.y + 2
    || rightBox!.y + rightBox!.height <= leftBox!.y + 2

  expect(horizontallySeparated || verticallySeparated).toBe(true)
}

async function expectAlignedShellContainers(headerContainer: Locator, contentContainer: Locator) {
  const [headerBox, contentBox] = await Promise.all([
    headerContainer.boundingBox(),
    contentContainer.boundingBox(),
  ])

  expect(headerBox).not.toBeNull()
  expect(contentBox).not.toBeNull()
  expect(Math.abs(headerBox!.x - contentBox!.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(headerBox!.width - contentBox!.width)).toBeLessThanOrEqual(1)
}

async function mockEmployeeCountForStep4(page: Page, count: number) {
  await page.route('**/rest/v1/employees?**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const isCountRequest =
      request.method() === 'HEAD'
      && url.searchParams.get('select') === 'id'
      && url.searchParams.has('organization_id')

    if (!isCountRequest) {
      await route.fallback()
      return
    }

    await route.fulfill({
      status: 200,
      headers: {
        'access-control-allow-origin': 'http://127.0.0.1:5173',
        'access-control-expose-headers': 'content-range',
        'content-range': count > 0 ? `0-${count - 1}/${count}` : '*/0',
      },
    })
  })
}

test.describe('app shell top navigation', () => {
  test('renders header navigation and account controls without the old sidebar', async ({ page }) => {
    await openAppShell(page)

    const topNav = page.getByRole('navigation', { name: '주요 메뉴' })
    await expect(page.getByRole('link', { name: '대시보드로 이동' })).toBeVisible()
    await expect(topNav.getByRole('button', { name: '운영 기준' })).toBeVisible()
    await expect(topNav.getByRole('button', { name: '근무표 생성' })).toBeVisible()
    await expect(topNav.getByRole('button', { name: '근무표 분석' })).toBeVisible()
    await expect(page.getByLabel('메뉴', { exact: true })).toHaveCount(0)

    const organizationSwitcher = page.getByTestId('organization-switcher')
    await expect(organizationSwitcher).toBeVisible()
    await organizationSwitcher.click()
    await expect(page.locator('.n-base-select-option').filter({ hasText: '동부 병원' })).toBeVisible()
    await page.keyboard.press('Escape')

    await expect(page.getByRole('button', { name: '로그아웃' })).toBeVisible()
  })

  test('renders static organization context for admin users without a switcher', async ({ page }) => {
    await openAppShell(page, 'admin_active')

    await expect(page.getByTestId('organization-switcher')).toHaveCount(0)
    await expect(page.getByText('서버 병원')).toBeVisible()
    await expect(page.getByText('운영 관리자')).toBeVisible()
    await expect(page.getByRole('button', { name: '로그아웃' })).toBeVisible()
  })

  test('keeps brand, nav, and account controls separated at 1024px width', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await openAppShell(page)

    const brand = page.getByRole('link', { name: '대시보드로 이동' })
    const topNav = page.getByRole('navigation', { name: '주요 메뉴' })
    const organizationSwitcher = page.getByTestId('organization-switcher')

    await expect(brand).toBeVisible()
    await expect(topNav).toBeVisible()
    await expect(organizationSwitcher).toBeVisible()
    await expect(page.getByRole('button', { name: '로그아웃' })).toBeVisible()

    await expectNoVisibleOverlap(brand, topNav)
    await expectNoVisibleOverlap(topNav, organizationSwitcher)
  })

  test('aligns the header and dashboard app containers', async ({ page }) => {
    await openAppShell(page)

    await expectAlignedShellContainers(
      page.getByTestId('app-shell-header-container'),
      page.getByTestId('dashboard-app-container'),
    )
  })

  test('keeps Step4 on the full-width grid surface exception', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await openAppShell(page, 'super_active', { seedWizardContext: true })
    await mockEmployeeCountForStep4(page, 1)

    await page.goto(getScheduleStepRoutePath(4))

    const headerContainer = page.getByTestId('app-shell-header-container')
    const step4Container = page.getByTestId('step4-app-container')
    await expect(step4Container).toBeVisible()

    const [headerBox, step4Box] = await Promise.all([
      headerContainer.boundingBox(),
      step4Container.boundingBox(),
    ])

    expect(headerBox).not.toBeNull()
    expect(step4Box).not.toBeNull()
    expect(step4Box!.width).toBeGreaterThan(headerBox!.width + 40)
  })

  test('navigates direct and submenu top navigation items', async ({ page }) => {
    await openAppShell(page, 'super_active', { seedWizardContext: true })

    const topNav = page.getByRole('navigation', { name: '주요 메뉴' })
    const createScheduleMenuItem = topNav.getByRole('button', { name: '새 근무표 생성', exact: true })

    await topNav.getByRole('button', { name: '근무표 생성', exact: true }).hover()
    await expect(createScheduleMenuItem).toBeVisible()
    await createScheduleMenuItem.click()
    await expect(page).toHaveURL((url) => url.pathname === getAppHomeRoutePath())
    await expect(page.getByTestId('dashboard-month-modal')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('dashboard-month-modal')).toBeHidden()

    await topNav.getByRole('button', { name: '근무표 분석', exact: true }).hover()
    await expect(topNav.getByRole('button', { name: '근무 기록', exact: true })).toBeVisible()
    await topNav.getByRole('button', { name: '근무 기록', exact: true }).click()
    await expect(page).toHaveURL((url) => url.pathname === getWorkPerformanceRoutePath())
    await expect(page.getByRole('heading', { name: '근무 기록', exact: true })).toBeVisible()

    await topNav.getByRole('button', { name: '운영 기준', exact: true }).hover()
    await expect(topNav.getByRole('button', { name: '병원 정보', exact: true })).toBeVisible()
    await topNav.getByRole('button', { name: '병원 정보', exact: true }).click()
    await expect(page).toHaveURL((url) =>
      url.pathname === getScheduleStepRoutePath(1) && url.searchParams.get('context') === 'setup'
    )
    await expect(page.getByText('운영 준비 - 병원 정보와 근무 유형 확인')).toBeVisible()
    await expect(page.getByText('병원 정보').first()).toBeVisible()
  })
})
