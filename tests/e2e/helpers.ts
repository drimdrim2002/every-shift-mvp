import { expect, type Locator, type Page } from '@playwright/test'

type TestCredentials = {
  email: string
  password: string
}

type DayRequirement = {
  dayOfWeek: number
  D?: number
  E?: number
  N?: number
}

type ExistingScheduleOptions = {
  month?: string | null
  preferCompleted?: boolean
}

const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']

export function getRequiredTestCredentials(): TestCredentials {
  const email = process.env.TEST_USER_EMAIL?.trim()
  const password = process.env.TEST_USER_PASSWORD?.trim()

  if (!email || !password) {
    throw new Error(
      'Missing TEST_USER_EMAIL or TEST_USER_PASSWORD. Set them in the environment or .env.test before running Playwright.'
    )
  }

  return { email, password }
}

export async function login(page: Page, credentials = getRequiredTestCredentials()) {
  await page.goto('/login')
  await expect(page).toHaveURL(/\/login$/)

  await page
    .locator('[data-test="login-email"] input, input[placeholder="admin@everyshift.com"]')
    .first()
    .fill(credentials.email)
  await page
    .locator('[data-test="login-password"] input, input[type="password"]')
    .first()
    .fill(credentials.password)
  await page
    .locator('[data-test="login-submit"], button:has-text("로그인")')
    .first()
    .click()

  await waitForDashboard(page)
}

export async function waitForDashboard(page: Page) {
  await page.waitForURL((url) => url.pathname === '/')
  await expect(page.getByRole('heading', { name: '근무표 관리', exact: true })).toBeVisible()
  await page.waitForLoadState('networkidle')
}

export async function startNewScheduleFromDashboard(page: Page) {
  await page.goto('/')
  await waitForDashboard(page)
  await waitForDashboardScheduleState(page)

  const existingMonths = (await getDashboardScheduleMonthLabels(page).allTextContents())
    .map(normalizeScheduleMonth)
    .filter(Boolean)
  const existingMonthSet = new Set(existingMonths)

  await page
    .locator(
      '[data-test="dashboard-create-schedule"], button:has-text("새 근무표 생성"), button:has-text("첫 근무표 생성하기")'
    )
    .first()
    .click()

  const monthSelect = page.locator('[data-test="dashboard-month-select"], .n-base-selection').last()
  await expect(monthSelect).toBeVisible()
  await monthSelect.click()

  const optionLocator = page.locator('.n-base-select-option')
  await expect(optionLocator.first()).toBeVisible()

  const optionTexts = (await optionLocator.allTextContents())
    .map((text) => text.trim())
    .filter(Boolean)
  const targetMonth = optionTexts.find((month) => !existingMonthSet.has(month))

  if (targetMonth) {
    await optionLocator.filter({ hasText: targetMonth }).first().click()
    await page.getByRole('button', { name: '확인' }).click()

    await page.waitForURL(/\/schedule\/step1$/)
    await expect(page.getByText('근무표 생성 - 기본 정보 설정')).toBeVisible()
    return targetMonth
  }

  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '취소' }).click()

  const reusableMonth = existingMonths.find((month) => month !== (process.env.TEST_REVIEW_HUB_MONTH?.trim() || '2026-03'))
  if (!reusableMonth) {
    throw new Error(
      `No unused schedule month is available and no reusable editable month was found. Existing months: ${existingMonths.join(', ')}`
    )
  }

  const reusableIndex = existingMonths.indexOf(reusableMonth)
  await page.getByRole('button', { name: '수정' }).nth(reusableIndex).click()
  await page.waitForURL(/\/schedule\/step1$/)
  await expect(page.getByText('근무표 생성 - 기본 정보 설정')).toBeVisible()
  return reusableMonth
}

export async function openExistingScheduleFromDashboard(
  page: Page,
  options: ExistingScheduleOptions = {}
) {
  await page.goto('/')
  await waitForDashboard(page)
  await waitForDashboardScheduleState(page)

  const { month = null, preferCompleted = true } = options
  const targetCard = await resolveExistingScheduleCard(page, month, preferCompleted)

  await targetCard.click()
  await page.waitForURL(/\/schedule\/step5\/.+/)

  return page.url()
}

async function resolveExistingScheduleCard(
  page: Page,
  month: string | null,
  preferCompleted: boolean
) {
  const scheduleMonthLabels = getDashboardScheduleMonthLabels(page)
  const availableTitles = (await scheduleMonthLabels.allTextContents()).map(normalizeScheduleMonth)

  if (month) {
    const matched = scheduleMonthLabels.filter({ hasText: `${month} 근무표` }).first()
    if ((await matched.count()) === 0) {
      throw new Error(
        `Could not find schedule month ${month}. Available months: ${availableTitles.join(', ')}`
      )
    }
    return matched
  }

  if (preferCompleted) {
    const completed = page
      .locator('[data-test="schedule-card"], .n-card')
      .filter({ hasText: '완료' })
      .locator('[data-test="schedule-card-month"], h3')
      .first()
    if ((await completed.count()) > 0) {
      return completed
    }
  }

  const firstCard = scheduleMonthLabels.first()
  if ((await firstCard.count()) === 0) {
    throw new Error('No schedule card is available on the dashboard.')
  }
  return firstCard
}

function getDashboardScheduleMonthLabels(page: Page): Locator {
  return page.locator('[data-test="schedule-card-month"], h3').filter({ hasText: '근무표' })
}

async function waitForDashboardScheduleState(page: Page) {
  const scheduleMonthLabels = getDashboardScheduleMonthLabels(page)
  const emptyState = page.getByText('생성된 근무표가 없습니다')

  await Promise.any([
    scheduleMonthLabels.first().waitFor({ state: 'visible', timeout: 10_000 }),
    emptyState.waitFor({ state: 'visible', timeout: 10_000 }),
  ]).catch(() => undefined)
}

function normalizeScheduleMonth(text: string) {
  return text.replace(' 근무표', '').trim()
}

export async function completeStep1(page: Page) {
  await expect(page.getByText('근무표 생성 - 기본 정보 설정')).toBeVisible()
  await expect(page.getByText('계획월:')).toBeVisible()

  await page.getByRole('button', { name: /다음 단계/ }).click()
  await page.waitForURL(/\/schedule\/step2$/)
}

export async function completeStep2(page: Page, requirements: DayRequirement[]) {
  await expect(page.getByText('근무표 생성 - 요일별 인력 설정')).toBeVisible()

  for (const requirement of requirements) {
    const row = page.locator('tr').filter({ hasText: dayNames[requirement.dayOfWeek] }).first()
    await expect(row).toBeVisible()

    const inputValues = [requirement.D, requirement.E, requirement.N]
    for (const [index, value] of inputValues.entries()) {
      if (typeof value !== 'number') {
        continue
      }

      await row.locator('input').nth(index).fill(String(value))
    }
  }

  await page.getByRole('button', { name: /다음 단계/ }).click()
  await page.waitForURL(/\/schedule\/step3$/)
}

export async function completeStep3Employees(page: Page) {
  await expect(page.getByText('근무표 생성 - 직원 정보 입력')).toBeVisible()
  await page.getByRole('button', { name: /다음 단계/ }).click()
  await page.waitForURL(/\/schedule\/step4$/)
}

export async function completeStep4InitialData(
  page: Page,
  assignments: {
    rowIndex: number
    colIndex: number
    shift: 'O'
  }[]
) {
  await page.waitForURL(/\/schedule\/step4$/)
  await expect(page.getByText(/월 근무 조정 일정 입력/)).toBeVisible()
  await expect(page.locator('table').first()).toBeVisible()

  for (const assignment of assignments) {
    const row = page.locator('tbody tr').nth(assignment.rowIndex)
    const cell = row.locator('.constraint-selector').nth(assignment.colIndex)
    await cell.click()
    await expect(cell).toContainText(assignment.shift)
  }

  await page.waitForTimeout(500)
}

export async function goToStep5(page: Page, timeout = 30000) {
  await page.getByRole('button', { name: /다음 단계/ }).click()
  await page.waitForURL(/\/schedule\/step5\/.+/, { timeout })
}

export async function verifyStep5ReviewHub(page: Page) {
  await expect(page.getByText('근무표 생성 - 결과 확인')).toBeVisible()
  await expect(page.getByTestId('version-compare-surface')).toBeVisible()
  await expect(page.getByTestId('review-tab-grid')).toBeVisible()
  await expect(page.getByTestId('review-tab-proof')).toBeVisible()
  await expect(page.getByTestId('review-tab-offRequests')).toBeVisible()
  return page.getByTestId('version-compare-surface').isVisible()
}

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

export async function clearLocalStorage(page: Page) {
  await page.evaluate(() => {
    window.localStorage.clear()
  })
}

export async function getCellShift(page: Page, rowIndex: number, colIndex: number) {
  const row = page.locator('tbody tr').nth(rowIndex)
  const cell = row.locator('.constraint-selector').nth(colIndex)

  return cell.textContent()
}

export async function getErrorMessage(page: Page) {
  try {
    await page.waitForSelector('.n-message', { timeout: 5000 })
    return page.locator('.n-message').textContent()
  } catch {
    return null
  }
}
