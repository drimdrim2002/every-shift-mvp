import { expect, test } from '@playwright/test'
import { openExistingScheduleFromDashboard, verifyStep5ReviewHub } from './helpers'

test.describe('Step5 review hub', () => {
  test.beforeEach(async ({ page }) => {
    await openExistingScheduleFromDashboard(page, {
      month: process.env.TEST_REVIEW_HUB_MONTH?.trim() || '2026-03',
      preferCompleted: true,
    })
  })

  test('renders the compare surface and review tabs in the common Step5 frame', async ({ page }) => {
    const reviewHubVisible = await verifyStep5ReviewHub(page)
    expect(reviewHubVisible).toBe(true)

    await expect(page.getByTestId('review-tab-panel-grid')).toBeVisible()
    await expect(page).toHaveURL(/\/schedule\/step5\/.+\?version=/)
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
