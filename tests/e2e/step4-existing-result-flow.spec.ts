import { expect, test } from '@playwright/test'
import {
  getScheduleStepRoutePath,
  getStep5ScheduleKeyFromPath,
} from '../../src/constants/routes'

test.describe('Step4 existing-result branch', () => {
  test.skip('Step4 existing month -> 기존 결과 보기 -> Step5 detail', async ({ page }) => {
    await page.goto(getScheduleStepRoutePath(4))

    await expect(page.getByText('이미 만든 근무표안이 있습니다')).toBeVisible()
    await page.getByRole('button', { name: '기존 결과 보기' }).click()

    await page.waitForURL((url) => getStep5ScheduleKeyFromPath(url.pathname) !== null)
    await expect(page.getByText('근무표 생성 - 결과 확인')).toBeVisible()
    await expect(page.getByTestId('review-tab-panel-grid')).toBeVisible()
  })

  test.skip('Step4 existing month -> 요청 수정 -> 새 근무표안 이름 -> solver starts', async ({ page }) => {
    await page.goto(getScheduleStepRoutePath(4))

    await expect(page.getByText('이미 만든 근무표안이 있습니다')).toBeVisible()
    await page.getByRole('button', { name: '요청 수정해서 새 근무표안 만들기' }).click()
    await expect(page).toHaveURL(/intent=edit-off/)

    await page.getByTestId('request-drawer-toggle').click()
    await page.locator('[data-test="step4-employee-search"] input').fill('E')
    await page.locator('[data-test^="employee-option-"]').first().click()
    await page.locator('[data-test^="calendar-day-"]').first().click()
    await page.getByRole('button', { name: '요청 반영' }).click()
    await page.getByRole('button', { name: /생성 시작으로 이동|결과 확인으로 이동/ }).click()

    await expect(page.getByText('새 근무표안 이름')).toBeVisible()
    await page.locator('[data-test="version-name-input"] input').fill('E2E 재생성안')
    await page.getByRole('button', { name: '이 이름으로 생성' }).click()

    await page.waitForURL((url) => getStep5ScheduleKeyFromPath(url.pathname) !== null)
    await expect(page.getByTestId('start-solver-button')).toBeVisible()
  })
})
