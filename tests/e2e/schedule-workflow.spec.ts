import { test, expect } from '@playwright/test'
import {
  login,
  completeStep1,
  completeStep2,
  completeStep3Employees,
  completeStep4InitialData,
  goToStep5,
  verifyStep5ReviewHub,
  getTempScheduleFromStorage,
  getCellShift,
} from './helpers'

/**
 * E2E 통합 테스트 - Step 1→2→3→4→5 현재 워크플로우
 *
 * 검증 사항:
 * 1. Step 1→2→3→4→5 전체 이동이 에러 없이 완료
 * 2. 각 Step에서 입력한 데이터가 다음 Step에 올바르게 전달
 * 3. Step4 scoped localStorage 복원 기능 정상 작동
 * 4. Step5 review hub 기본 surface가 정상 렌더링
 */

test.describe('스케줄 생성 전체 워크플로우', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('Step 1 → Step 2 → Step 3 → Step 4 → Step 5 이동과 review hub 렌더링', async ({ page }) => {
    // Step 1: 기본 정보 설정
    await test.step('Step 1: 월 선택 및 조직 정보 확인', async () => {
      const selectedMonth = await completeStep1(page)
      console.log('선택된 월:', selectedMonth)
    })

    // Step 2: 사이트 정보 설정
    await test.step('Step 2: 요일별 필요 인력 설정', async () => {
      await completeStep2(page, [
        { dayOfWeek: 1, D: 10, E: 8, N: 5, O: 7 }, // 월요일
      ])
    })

    await test.step('Step 3: 직원 정보 확인 후 Step4 이동', async () => {
      await completeStep3Employees(page)
    })

    await test.step('Step 4: 초기 데이터 입력 후 Step5 이동', async () => {
      await completeStep4InitialData(page, [{ rowIndex: 0, colIndex: 0, shift: 'O' }])
      const tempSchedule = await getTempScheduleFromStorage(page)
      expect(tempSchedule).toBeTruthy()
      console.log('Scoped localStorage 임시 저장 확인:', !!tempSchedule)

      await goToStep5(page)
    })

    await test.step('Step 5: review hub 기본 surface 확인', async () => {
      const reviewHubVisible = await verifyStep5ReviewHub(page)
      expect(reviewHubVisible).toBe(true)
      console.log('Step5 review hub 테스트 완료')
    })
  })

  test('Step4 scoped localStorage 복원 기능 테스트', async ({ page }) => {
    await page.goto('/schedule/step4')
    await page.waitForURL('/schedule/step1')

    await completeStep1(page)
    await completeStep2(page, [{ dayOfWeek: 1, D: 10, E: 0, N: 0, O: 0 }])
    await completeStep3Employees(page)
    await completeStep4InitialData(page, [{ rowIndex: 0, colIndex: 0, shift: 'O' }])

    await page.reload()
    await page.waitForSelector('table')

    const restoredShift = await getCellShift(page, 0, 0)
    expect(restoredShift).toContain('O')

    console.log('Step4 scoped localStorage 복원 테스트 완료')
  })

  test('Step5 deep-link는 preview query와 함께 열린다', async ({ page }) => {
    await page.goto('/schedule/step1')
    await completeStep1(page)
    await completeStep2(page, [{ dayOfWeek: 1, D: 10, E: 0, N: 0, O: 0 }])
    await completeStep3Employees(page)
    await goToStep5(page)

    await expect(page).toHaveURL(/\/schedule\/step5\/.+\?version=/)
    await expect(page.locator('[data-test="version-compare-surface"]')).toBeVisible()
  })
})
