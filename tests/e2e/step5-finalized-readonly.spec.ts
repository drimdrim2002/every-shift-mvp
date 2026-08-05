import { expect, test } from '@playwright/test'
import { mockDashboardReadiness, openExistingScheduleFromDashboard, verifyStep5ReviewHub } from './helpers'

const finalizedMonth = process.env.TEST_FINALIZED_MONTH?.trim()

test.describe('Step5 finalized read-only', () => {
  test.skip(!finalizedMonth, 'Set TEST_FINALIZED_MONTH to run finalized read-only E2E.')

  test('renders a finalized schedule in read-only mode', async ({ page }) => {
    await mockDashboardReadiness(page, 'complete')
    await openExistingScheduleFromDashboard(page, {
      month: finalizedMonth,
      preferCompleted: false,
    })

    await verifyStep5ReviewHub(page)

    await expect(page.getByText('확정됨')).toBeVisible()
    await expect(page.getByRole('button', { name: '근무표 취소' })).toBeDisabled()
    await expect(page.getByRole('button', { name: '다시 생성' })).toBeDisabled()
    await expect(page.getByRole('button', { name: '저장' })).toBeDisabled()
  })
})
