import { test, expect } from '@playwright/test'
import {
  login,
  completeStep1,
  completeStep2,
  completeStep3,
  generateSchedule,
  verifyStep4Results,
  saveSchedule,
  getTempScheduleFromStorage,
  getCellShift,
  getErrorMessage,
} from './helpers'

/**
 * E2E 통합 테스트 - Step 1→2→3→4 전체 플로우
 *
 * 검증 사항:
 * 1. Step 1→2→3→4 전체 플로우가 에러 없이 완료
 * 2. 각 Step에서 입력한 데이터가 다음 Step에 올바르게 전달
 * 3. LocalStorage 복원 기능 정상 작동
 * 4. AI Solver Polling 및 상태 전이 정상 작동
 * 5. 최종 결과가 Supabase에 올바르게 저장
 */

test.describe('스케줄 생성 전체 워크플로우', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('Step 1 → Step 2 → Step 3 → Step 4 전체 플로우', async ({ page }) => {
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

    // Step 3: 초기 데이터 입력
    await test.step('Step 3: 이전 달 마지막 5일 데이터 입력', async () => {
      // 첫 번째 직원의 이전 달 마지막 5일 데이터 입력
      const assignments = Array.from({ length: 5 }, (_, i) => ({
        rowIndex: 0,
        colIndex: i,
        shift: 'D' as const,
      }))

      await completeStep3(page, assignments)

      // LocalStorage 저장 확인
      const tempSchedule = await getTempScheduleFromStorage(page)
      expect(tempSchedule).toBeTruthy()
      console.log('LocalStorage 임시 저장 확인:', !!tempSchedule)

      // AI Solver 생성 및 완료 대기
      await generateSchedule(page)
    })

    // Step 4: 결과 확인
    await test.step('Step 4: AI 생성 결과 확인 및 저장', async () => {
      // 통계 정보 확인
      const statsVisible = await verifyStep4Results(page)
      expect(statsVisible).toBe(true)

      // 첫 번째 셀 시프트 확인
      const firstCellShift = await getCellShift(page, 0, 0)
      expect(['D', 'E', 'N', 'O', 'H']).toContain(firstCellShift?.trim())
      console.log('첫 번째 셀 시프트:', firstCellShift)

      // 저장
      const saved = await saveSchedule(page)
      expect(saved).toBe(true)

      console.log('전체 워크플로우 테스트 완료')
    })
  })

  test('LocalStorage 복원 기능 테스트', async ({ page }) => {
    // Step 3로 직접 이동 (데이터 없으면 Step 1로 리다이렉트)
    await page.goto('/schedule/step3')
    await page.waitForURL('/schedule/step1')

    // Step 1 완료
    await completeStep1(page)

    // Step 2 완료
    await completeStep2(page, [{ dayOfWeek: 1, D: 10, E: 0, N: 0, O: 0 }])

    // Step 3에서 데이터 입력
    await completeStep3(page, [{ rowIndex: 0, colIndex: 0, shift: 'D' }])

    // 페이지 새로고침
    await page.reload()

    // 데이터 복원 확인
    await page.waitForSelector('table')
    const restoredShift = await getCellShift(page, 0, 0)
    expect(restoredShift).toContain('D')

    console.log('LocalStorage 복원 테스트 완료')
  })

  test('유효성 검증 테스트', async ({ page }) => {
    // Step 1 완료
    await page.goto('/schedule/step1')
    await completeStep1(page)

    // Step 2 완료
    await completeStep2(page, [{ dayOfWeek: 1, D: 10, E: 0, N: 0, O: 0 }])

    // Step 3: 이전 달 데이터 입력 없이 생성 시도
    await page.waitForURL('/schedule/step3')
    await page.click('button:has-text("생성")')

    // 검증 에러 메시지 확인
    const errorMessage = await getErrorMessage(page)
    expect(errorMessage).toContain('이전')

    console.log('유효성 검증 테스트 완료')
  })
})
