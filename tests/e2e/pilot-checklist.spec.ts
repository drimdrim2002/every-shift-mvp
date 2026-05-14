import { expect, test } from '@playwright/test'
import {
  getScheduleStepRoutePath,
} from '../../src/constants/routes'
import {
  mockDashboardReadiness,
  mockRbacContext,
  seedPlaywrightAuthState,
  seedSelectedOrganization,
  waitForDashboard,
} from './helpers'

test.use({ storageState: { cookies: [], origins: [] } })

async function openDashboard(page: Parameters<typeof waitForDashboard>[0]) {
  await seedPlaywrightAuthState(page)
  await mockRbacContext(page, 'admin_active')
  await seedSelectedOrganization(page, 'org-1')
  await page.goto('/')
  await waitForDashboard(page)
}

async function expectScheduleSurfacesHidden(page: Parameters<typeof waitForDashboard>[0]) {
  await expect(page.locator('[data-test="dashboard-create-schedule"]')).toHaveCount(0)
  await expect(page.locator('[data-test="dashboard-history-section"]')).toHaveCount(0)
  await expect(page.locator('[data-test="schedule-card"]')).toHaveCount(0)
  await expect(page.locator('[data-test="dashboard-next-action"]')).toHaveCount(0)
  await expect(page.getByText('월별 근무표 작업')).toHaveCount(0)
}

test.describe('dashboard readiness gate', () => {
  test('shows only onboarding when required readiness is incomplete', async ({ page }) => {
    await mockDashboardReadiness(page, 'incomplete')
    await openDashboard(page)

    await expect(page.getByTestId('dashboard-onboarding-only')).toBeVisible()
    await expect(page.getByText('근무표 생성을 시작하기 전에 필수 정보를 먼저 확인해주세요')).toBeVisible()
    await expect(page.getByText('아래 3가지를 순서대로 완료하면 근무표 생성과 근무표 조회를 사용할 수 있습니다.')).toBeVisible()
    const onboarding = page.getByTestId('dashboard-onboarding-only')
    await expect(onboarding.getByText('1 병원 정보', { exact: true })).toBeVisible()
    await expect(onboarding.getByText('2 병동/근무 기준', { exact: true })).toBeVisible()
    await expect(onboarding.getByText('3 직원 정보', { exact: true })).toBeVisible()

    await page.getByTestId('dashboard-onboarding-item-schedule_foundation').click()
    await expect(page).toHaveURL((url) =>
      url.pathname === getScheduleStepRoutePath(2) && url.searchParams.get('context') === 'setup'
    )

    await page.goto('/')
    await waitForDashboard(page)
    await expectScheduleSurfacesHidden(page)
    await expect(page.locator('[data-test="dashboard-basic-info-section"]')).toHaveCount(0)
    await expect(page.locator('[data-test="dashboard-create-section"]')).toHaveCount(0)
  })

  test('hides schedule surfaces when readiness cannot be loaded', async ({ page }) => {
    await mockDashboardReadiness(page, 'failure')
    await openDashboard(page)

    await expect(page.getByTestId('dashboard-readiness-unavailable')).toBeVisible()
    await expect(page.getByText('운영 준비 상태를 확인하지 못했습니다')).toBeVisible()
    await expect(
      page.getByText('필수 정보가 준비되었는지 확인할 수 없어 근무표 생성과 근무표 조회를 잠시 숨겼습니다.')
    ).toBeVisible()

    await expectScheduleSurfacesHidden(page)
    await expect(page.locator('[data-test="dashboard-onboarding-only"]')).toHaveCount(0)
    await expect(page.locator('[data-test="dashboard-basic-info-section"]')).toHaveCount(0)
  })

  test('shows operational briefing sections when readiness is complete', async ({ page }) => {
    await mockDashboardReadiness(page, 'complete')
    await openDashboard(page)

    await expect(page.getByTestId('dashboard-next-action')).toBeVisible()
    await expect(page.getByTestId('dashboard-primary-action')).toBeVisible()
    await expect(page.getByTestId('dashboard-operational-status')).toBeVisible()
    await expect(page.getByTestId('dashboard-recent-schedule')).toBeVisible()
    await expect(page.getByTestId('dashboard-view-all-schedules')).toBeVisible()
    await expect(page.getByTestId('dashboard-basic-info-section')).toHaveCount(0)
    await expect(page.getByTestId('dashboard-create-section')).toHaveCount(0)
    await expect(page.locator('[data-test="schedule-card"]')).toHaveCount(0)
    await expect(page.getByTestId('dashboard-primary-action')).toContainText('새 근무표 생성하기')
    await expect(page.getByTestId('dashboard-operational-status')).toContainText('운영 기준')
    await expect(page.getByTestId('dashboard-operational-status')).toContainText('준비 완료')
    await expect(page.getByTestId('dashboard-recent-schedule')).toContainText('최근 근무표')
    await expect(page.getByText('Off 사용 기준 설정')).toHaveCount(0)
    await expect(page.getByText('최종 검토 진입')).toHaveCount(0)
  })

  test('keeps briefing actions reachable on narrow desktop', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 760 })
    await mockDashboardReadiness(page, 'complete')
    await openDashboard(page)

    await expect(page.getByTestId('dashboard-primary-action')).toBeVisible()
    await expect(page.getByTestId('dashboard-view-all-schedules')).toBeVisible()

    const hasHorizontalOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    )
    expect(hasHorizontalOverflow).toBe(false)
  })
})
