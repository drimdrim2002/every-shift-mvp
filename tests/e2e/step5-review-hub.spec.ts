import { expect, test } from '@playwright/test'
import {
  completeStep1,
  completeStep2,
  completeStep3Employees,
  goToStep5,
  login,
  verifyStep5ReviewHub,
} from './helpers'

test.describe('Step5 review hub', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await completeStep1(page)
    await completeStep2(page, [{ dayOfWeek: 1, D: 10, E: 0, N: 0, O: 0 }])
    await completeStep3Employees(page)
    await goToStep5(page)
  })

  test('renders the compare surface and review tabs in the common Step5 frame', async ({ page }) => {
    const reviewHubVisible = await verifyStep5ReviewHub(page)
    expect(reviewHubVisible).toBe(true)
    await expect(page.locator('[data-test="review-tab-panel-grid"]')).toBeVisible()
  })

  test('switches between grid, proof, and off-request tabs inside the shared review shell', async ({ page }) => {
    await page.click('[data-test="review-tab-proof"]')
    await expect(page.locator('[data-test="review-tab-panel-proof"]')).toBeVisible()

    await page.click('[data-test="review-tab-offRequests"]')
    await expect(page.locator('[data-test="review-tab-panel-offRequests"]')).toBeVisible()

    await page.click('[data-test="review-tab-grid"]')
    await expect(page.locator('[data-test="review-tab-panel-grid"]')).toBeVisible()
  })
})
