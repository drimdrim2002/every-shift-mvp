import { expect, test } from '@playwright/test'
import { openExistingScheduleFromDashboard, verifyStep5ReviewHub } from './helpers'

test.describe('Step5 review hub', () => {
  test.beforeEach(async ({ page }) => {
    await openExistingScheduleFromDashboard(page, {
      month: process.env.TEST_REVIEW_HUB_MONTH?.trim() || '2026-03',
      preferCompleted: true,
    })
  })

  test('renders the result review switch in the common Step5 frame', async ({ page }) => {
    const reviewHubVisible = await verifyStep5ReviewHub(page)
    expect(reviewHubVisible).toBe(true)

    await expect(page.getByTestId('step5-site-view')).toBeVisible()
    await expect(page).toHaveURL(/\/schedule\/step5\/.+\?version=/)
  })

  test('opens the compare modal from the Step5 result frame', async ({ page }) => {
    await verifyStep5ReviewHub(page)

    await page.getByTestId('step5-compare-button').click()
    await expect(page.getByTestId('schedule-compare-modal')).toBeVisible()
    await expect(page.getByText('근무표안 비교')).toBeVisible()
  })

  test('switches between site and employee result views inside the shared review shell', async ({ page }) => {
    await verifyStep5ReviewHub(page)
    await expect(page.getByTestId('step5-site-view')).toBeVisible()
    await expect(page.getByTestId('step5-result-view-site')).toHaveText('사이트')
    await expect(page.getByTestId('step5-result-view-employee')).toHaveText('근무자')

    await page.getByTestId('step5-result-view-employee').click()
    await expect(page.getByTestId('step5-employee-view')).toBeVisible()
    await expect(page.getByTestId('employee-result-detail')).toBeVisible()

    await page.getByTestId('step5-result-view-site').click()
    await expect(page.getByTestId('step5-site-view')).toBeVisible()
  })
})
