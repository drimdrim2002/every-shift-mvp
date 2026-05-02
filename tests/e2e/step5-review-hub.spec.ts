import { expect, test } from '@playwright/test'
import { openExistingScheduleFromDashboard, verifyStep5ReviewHub } from './helpers'

test.describe('Step5 review hub', () => {
  test.beforeEach(async ({ page }) => {
    await openExistingScheduleFromDashboard(page, {
      month: process.env.TEST_REVIEW_HUB_MONTH?.trim() || '2026-03',
      preferCompleted: true,
    })
  })

  test('renders the compare entry point and review tabs in the common Step5 frame', async ({ page }) => {
    const reviewHubVisible = await verifyStep5ReviewHub(page)
    expect(reviewHubVisible).toBe(true)

    await expect(page.getByTestId('review-tab-panel-grid')).toBeVisible()
    await expect(page).toHaveURL(/\/schedule\/step5\/.+\?version=/)
  })

  test('opens the compare modal from the Step5 result frame', async ({ page }) => {
    await verifyStep5ReviewHub(page)

    await page.getByTestId('step5-compare-button').click()
    await expect(page.getByTestId('schedule-compare-modal')).toBeVisible()
    await expect(page.getByText('근무표안 비교')).toBeVisible()
  })

  test('switches between grid, proof, and off-request tabs inside the shared review shell', async ({ page }) => {
    await page.getByTestId('review-tab-proof').click()
    await expect(page.getByTestId('review-tab-panel-proof')).toBeVisible()

    await page.getByTestId('review-tab-offRequests').click()
    await expect(page.getByTestId('review-tab-panel-offRequests')).toBeVisible()

    await page.getByTestId('review-tab-grid').click()
    await expect(page.getByTestId('review-tab-panel-grid')).toBeVisible()
  })
})
