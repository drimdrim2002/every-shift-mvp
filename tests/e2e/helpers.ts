import type { Page } from '@playwright/test'

/**
 * E2E 테스트 헬퍼 함수
 */

/**
 * 로그인 헬퍼
 */
export async function login(page: Page, email?: string, password?: string) {
  const testEmail = email || process.env.TEST_USER_EMAIL || 'test@example.com'
  const testPassword = password || process.env.TEST_USER_PASSWORD || 'password123'

  await page.goto('/login')
  await page.fill('input[type="email"]', testEmail)
  await page.fill('input[type="password"]', testPassword)
  await page.click('button[type="submit"]')

  // 로그인 완료 대기
  await page.waitForURL('/schedule/step1')
}

/**
 * Step 1: 기본 정보 설정
 */
export async function completeStep1(page: Page, monthIndex = 0) {
  // Step 1 페이지 확인
  await page.waitForSelector('text=근무표 생성 - 기본 정보 설정')

  // 조직 정보 로드 대기
  await page.waitForSelector('text=조직 정보 확인')

  // 월 선택
  await page.click('.n-select')
  await page.waitForSelector('.n-select-menu')

  // 지정된 월 선택 (기본값: 첫 번째 옵션)
  const options = page.locator('.n-select-menu .n-base-select-option')
  await options.nth(monthIndex).click()

  // 선택된 월 저장
  const selectedMonth = await page.locator('.n-select').textContent()

  // 다음 단계 버튼 클릭
  await page.click('button:has-text("다음 단계")')

  // Step 2로 이동 확인
  await page.waitForURL('/schedule/step2')

  return selectedMonth
}

/**
 * Step 2: 사이트 정보 설정
 */
export async function completeStep2(
  page: Page,
  requirements: {
    dayOfWeek: number // 0-6 (일-토)
    D: number
    E: number
    N: number
    O: number
  }[]
) {
  // Step 2 페이지 확인
  await page.waitForSelector('text=근무표 생성 - 사이트 정보 설정')

  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']

  // 각 요일별 필요 인력 설정
  for (const req of requirements) {
    const row = page.locator('tr').filter({ hasText: dayNames[req.dayOfWeek] })

    // D, E, N, O 순서대로 입력
    await row.locator('input').nth(0).fill(String(req.D))
    await row.locator('input').nth(1).fill(String(req.E))
    await row.locator('input').nth(2).fill(String(req.N))
    await row.locator('input').nth(3).fill(String(req.O))
  }

  // 다음 단계 버튼 클릭
  await page.click('button:has-text("다음 단계")')

  // Step 3로 이동 확인
  await page.waitForURL('/schedule/step3')
}

/**
 * Step 3: 직원 정보 화면에서 다음 단계로 이동
 */
export async function completeStep3Employees(page: Page) {
  await page.waitForSelector('text=근무표 생성 - 직원 정보 입력')
  await page.click('button:has-text("다음 단계")')
  await page.waitForURL('/schedule/step4')
}

/**
 * Step 4: 초기 데이터 입력
 */
export async function completeStep4InitialData(
  page: Page,
  assignments: {
    rowIndex: number
    colIndex: number
    shift: 'O'
  }[]
) {
  await page.waitForURL('/schedule/step4')
  await page.waitForSelector('text=월 근무 조정 일정 입력')

  await page.waitForSelector('table')

  for (const assignment of assignments) {
    const row = page.locator('tbody tr').nth(assignment.rowIndex)
    const cell = row.locator('td').nth(assignment.colIndex + 1) // +1은 이름 컬럼 건너뛰기

    await cell.click()
    await page.waitForTimeout(100)
  }

  await page.waitForTimeout(1000)
}

/**
 * Step 4 → Step 5 이동
 */
export async function goToStep5(page: Page, timeout = 30000) {
  await page.click('button:has-text("다음 단계")')
  await page.waitForURL(/\/schedule\/step5\/.+/, { timeout })
}

/**
 * Step 5: AI 생성 시작
 */
export async function startAISolver(page: Page) {
  await page.waitForSelector('text=근무표 생성 - 결과 확인')
  await page.click('button:has-text("근무표 생성 (AI)")')
}

/**
 * Step 5: 결과 확인
 */
export async function verifyStep5ReviewHub(page: Page) {
  await page.waitForSelector('text=근무표 생성 - 결과 확인')
  await page.waitForSelector('[data-test="version-compare-surface"]')
  await page.waitForSelector('[data-test="review-tab-grid"]')
  await page.waitForSelector('[data-test="review-tab-proof"]')
  await page.waitForSelector('[data-test="review-tab-offRequests"]')
  return await page.locator('[data-test="version-compare-surface"]').isVisible()
}

/**
 * 결과 저장
 */
export async function saveSchedule(page: Page) {
  // 저장 버튼 클릭
  await page.click('button:has-text("저장")')

  // 저장 완료 메시지 대기
  await page.waitForSelector('.n-message', { timeout: 5000 })

  // 메시지 내용 확인
  const messageText = await page.locator('.n-message').textContent()

  return messageText?.includes('저장')
}

/**
 * LocalStorage에서 임시 저장 데이터 가져오기
 */
export async function getTempScheduleFromStorage(page: Page) {
  const localStorage = await page.evaluate(() => {
    const scopedKey = Object.keys(window.localStorage).find((key) =>
      key.startsWith('everyshift_temp_preferences_v2:')
    )
    if (scopedKey) {
      return window.localStorage.getItem(scopedKey)
    }

    return window.localStorage.getItem('everyshift_temp_schedule')
  })

  return localStorage ? JSON.parse(localStorage) : null
}

/**
 * LocalStorage 초기화
 */
export async function clearLocalStorage(page: Page) {
  await page.evaluate(() => {
    window.localStorage.clear()
  })
}

/**
 * 특정 셀의 시프트 값 가져오기
 */
export async function getCellShift(page: Page, rowIndex: number, colIndex: number) {
  const row = page.locator('tbody tr').nth(rowIndex)
  const cell = row.locator('td').nth(colIndex + 1) // +1은 이름 컬럼 건너뛰기

  return await cell.textContent()
}

/**
 * 에러 메시지 확인
 */
export async function getErrorMessage(page: Page) {
  try {
    await page.waitForSelector('.n-message', { timeout: 5000 })
    return await page.locator('.n-message').textContent()
  } catch {
    return null
  }
}
