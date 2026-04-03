import { expect, test } from '@playwright/test'
import {
  completeStep1,
  completeStep2,
  completeStep3Employees,
  completeStep4InitialData,
  getCellShift,
  getTempScheduleFromStorage,
  goToStep5,
  startNewScheduleFromDashboard,
  verifyStep5ReviewHub,
} from './helpers'

test.describe('스케줄 생성 전체 워크플로우', () => {
  test('Dashboard에서 시작해 Step5 review hub까지 이동한다', async ({ page }) => {
    test.setTimeout(90_000)

    await test.step('Dashboard에서 새 스케줄 생성 플로우를 시작한다', async () => {
      const selectedMonth = await startNewScheduleFromDashboard(page)
      expect(selectedMonth).toMatch(/^\d{4}-\d{2}$/)
    })

    await test.step('Step1부터 Step4까지 현재 플로우 기준으로 이동한다', async () => {
      await completeStep1(page)
      await completeStep2(page, [{ dayOfWeek: 1, D: 10, E: 8, N: 5 }])
      await completeStep3Employees(page)
      await completeStep4InitialData(page, [{ rowIndex: 0, colIndex: 0, shift: 'O' }])
    })

    await test.step('Step4 scoped localStorage가 저장되고 새로고침 후 복원된다', async () => {
      await expect
        .poll(async () => Boolean(await getTempScheduleFromStorage(page)), {
          timeout: 5_000,
        })
        .toBe(true)

      const tempSchedule = await getTempScheduleFromStorage(page)
      expect(tempSchedule).toBeTruthy()

      await page.reload()
      await expect(page.locator('table').first()).toBeVisible()

      await expect
        .poll(async () => (await getCellShift(page, 0, 0))?.trim() ?? '', {
          timeout: 10_000,
        })
        .toContain('O')

      const finalShift = await getCellShift(page, 0, 0)
      expect(finalShift?.trim()).toContain('O')
    })

    await test.step('Step5 deep-link는 preview query와 함께 열리고 review hub를 렌더링한다', async () => {
      await goToStep5(page)
      await expect(page).toHaveURL(/\/schedule\/step5\/.+\?version=/)

      const reviewHubVisible = await verifyStep5ReviewHub(page)
      expect(reviewHubVisible).toBe(true)
    })
  })
})
