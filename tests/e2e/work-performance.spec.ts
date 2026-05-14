import { expect, test, type Page, type Route } from '@playwright/test'
import { getAppHomeRoutePath, getWorkPerformanceRoutePath } from '../../src/constants/routes'
import {
  mockDashboardReadiness,
  mockRbacContext,
  seedPlaywrightAuthState,
  seedSelectedOrganization,
  waitForDashboard,
} from './helpers'

test.use({ storageState: { cookies: [], origins: [] } })

type EmployeeFixture = {
  id: string
  name: string
}

type ScheduleFixture = {
  id: string
  month: string
  finalized_version_id: string | null
}

type WorkPerformanceFixture = {
  schedules: ScheduleFixture[]
  employees: EmployeeFixture[]
  publicHolidays: string[]
  assignments: Array<{
    schedule_version_id: string
    employee_id: string
    date: string
    shift_id: string
    shifts: {
      code: string
      name: string
    }
  }>
  preferences: Array<{
    schedule_version_id: string
    employee_id: string
    date: string
    request_code: 'O'
  }>
}

const organizationId = 'org-1'

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    headers: {
      'access-control-allow-origin': 'http://127.0.0.1:5173',
      'access-control-allow-headers': 'apikey, authorization, content-type, prefer, range, x-client-info',
      'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

function listJanuary2026Dates() {
  return Array.from({ length: 31 }, (_value, index) => `2026-01-${String(index + 1).padStart(2, '0')}`)
}

function getShiftForEmployee(employeeId: string, day: number) {
  if (employeeId === 'employee-a') {
    return day <= 5 ? { code: 'N', name: 'Night' } : { code: 'D', name: 'Day' }
  }

  if (employeeId === 'employee-b') {
    return day === 6 || day === 7 || day === 10 || day === 11 || day === 17 || day === 18 || day === 24 || day === 25 || day === 31
      ? { code: 'O', name: 'Off' }
      : { code: 'D', name: 'Day' }
  }

  return { code: 'O', name: 'Off' }
}

function assertQueryParam(url: URL, key: string, expectedValue: string) {
  const actualValues = url.searchParams.getAll(key)

  expect(
    actualValues,
    `${url.pathname} should include ${key}=${expectedValue}`,
  ).toContain(expectedValue)
}

function assertRangeIfVisible(route: Route) {
  const url = new URL(route.request().url())
  const rangeHeader = route.request().headers().range

  if (rangeHeader) {
    expect(rangeHeader, `${url.pathname} should request the first Supabase page`).toBe('0-999')
    return
  }

  if (url.searchParams.has('offset') || url.searchParams.has('limit')) {
    assertQueryParam(url, 'offset', '0')
    assertQueryParam(url, 'limit', '1000')
  }
}

function getExpectedFinalizedVersionIds(fixture: WorkPerformanceFixture) {
  return fixture.schedules
    .map((schedule) => schedule.finalized_version_id)
    .filter((versionId): versionId is string => typeof versionId === 'string' && versionId.length > 0)
}

function assertFinalizedVersionFilter(url: URL, fixture: WorkPerformanceFixture) {
  const expectedVersionIds = getExpectedFinalizedVersionIds(fixture)

  expect(expectedVersionIds, 'work performance fixture should include finalized version IDs').not.toHaveLength(0)
  assertQueryParam(url, 'schedule_version_id', `in.(${expectedVersionIds.join(',')})`)
}

function getFixtureDateRange(fixture: WorkPerformanceFixture) {
  const months = fixture.schedules.map((schedule) => schedule.month).sort()
  const startMonth = months[0]
  const endMonth = months[months.length - 1]

  expect(startMonth, 'work performance fixture should include a start month').toBeTruthy()
  expect(endMonth, 'work performance fixture should include an end month').toBeTruthy()

  const [endYear, endMonthValue] = endMonth.split('-').map(Number)
  const endDay = new Date(Date.UTC(endYear, endMonthValue, 0)).getUTCDate()

  return {
    startMonth,
    endMonth,
    startDate: `${startMonth}-01`,
    endDate: `${endMonth}-${String(endDay).padStart(2, '0')}`,
  }
}

function assertFixtureDateRange(url: URL, key: string, fixture: WorkPerformanceFixture) {
  const { startDate, endDate } = getFixtureDateRange(fixture)

  assertQueryParam(url, key, `gte.${startDate}`)
  assertQueryParam(url, key, `lte.${endDate}`)
}

function createSuccessfulFixture(): WorkPerformanceFixture {
  const employees = [
    { id: 'employee-a', name: '김민지' },
    { id: 'employee-b', name: '박서연' },
    { id: 'employee-c', name: '이도윤' },
  ]

  const assignments = employees.flatMap((employee) =>
    listJanuary2026Dates().map((date) => {
      const day = Number(date.slice(-2))
      const shift = getShiftForEmployee(employee.id, day)

      return {
        schedule_version_id: 'version-2026-01',
        employee_id: employee.id,
        date,
        shift_id: `shift-${shift.code.toLowerCase()}`,
        shifts: shift,
      }
    }),
  )

  return {
    schedules: [
      {
        id: 'schedule-2026-01',
        month: '2026-01',
        finalized_version_id: 'version-2026-01',
      },
    ],
    employees,
    publicHolidays: ['2026-01-01'],
    assignments,
    preferences: [
      {
        schedule_version_id: 'version-2026-01',
        employee_id: 'employee-b',
        date: '2026-01-06',
        request_code: 'O',
      },
      {
        schedule_version_id: 'version-2026-01',
        employee_id: 'employee-b',
        date: '2026-01-07',
        request_code: 'O',
      },
    ],
  }
}

async function openAppShell(page: Page) {
  await seedPlaywrightAuthState(page)
  await mockRbacContext(page, 'super_active')
  await seedSelectedOrganization(page, organizationId)
  await mockDashboardReadiness(page, 'complete')
  await page.goto(getAppHomeRoutePath())
  await waitForDashboard(page)
}

async function openWorkPerformance(page: Page, fixture: WorkPerformanceFixture) {
  await seedPlaywrightAuthState(page)
  await mockRbacContext(page, 'super_active')
  await mockWorkPerformanceRest(page, fixture)
  await seedSelectedOrganization(page, organizationId)
  await mockDashboardReadiness(page, 'complete')
  await page.goto(getWorkPerformanceRoutePath())
  await expect(page.getByRole('heading', { name: '근무 실적', exact: true })).toBeVisible()
}

async function mockWorkPerformanceRest(page: Page, fixture: WorkPerformanceFixture) {
  await page.route('**/rest/v1/schedules*', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204 })
      return
    }

    const url = new URL(route.request().url())
    const finalizedFilter = url.searchParams.get('finalized_version_id')

    if (finalizedFilter === 'not.is.null') {
      assertQueryParam(url, 'organization_id', `eq.${organizationId}`)
      assertQueryParam(url, 'limit', '1')
      await fulfillJson(route, fixture.schedules.filter((schedule) => schedule.finalized_version_id))
      return
    }

    assertQueryParam(url, 'organization_id', `eq.${organizationId}`)

    const { startMonth, endMonth } = getFixtureDateRange(fixture)
    assertQueryParam(url, 'month', `gte.${startMonth}`)
    assertQueryParam(url, 'month', `lte.${endMonth}`)

    await fulfillJson(
      route,
      fixture.schedules.filter((schedule) => schedule.month >= startMonth && schedule.month <= endMonth),
    )
  })

  await page.route('**/rest/v1/public_holidays*', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204 })
      return
    }

    const url = new URL(route.request().url())
    assertQueryParam(url, 'country_code', 'eq.KR')
    assertQueryParam(url, 'is_holiday', 'eq.true')

    const isCoverageCheck = url.searchParams.get('limit') === '1'
    const holidays = fixture.publicHolidays.map((holiday_date) => ({ holiday_date }))

    if (isCoverageCheck) {
      assertQueryParam(url, 'holiday_date', 'gte.2026-01-01')
      assertQueryParam(url, 'holiday_date', 'lte.2026-12-31')
      await fulfillJson(route, holidays.slice(0, 1))
      return
    }

    assertFixtureDateRange(url, 'holiday_date', fixture)
    await fulfillJson(route, isCoverageCheck ? holidays.slice(0, 1) : holidays)
  })

  await page.route('**/rest/v1/schedule_assignments*', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204 })
      return
    }

    const url = new URL(route.request().url())
    assertFinalizedVersionFilter(url, fixture)
    assertFixtureDateRange(url, 'date', fixture)
    assertRangeIfVisible(route)

    await fulfillJson(route, fixture.assignments)
  })

  await page.route('**/rest/v1/schedule_preferences*', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204 })
      return
    }

    const url = new URL(route.request().url())
    assertFinalizedVersionFilter(url, fixture)
    assertQueryParam(url, 'request_code', 'eq.O')
    assertFixtureDateRange(url, 'date', fixture)
    assertRangeIfVisible(route)

    await fulfillJson(route, fixture.preferences)
  })

  await page.route('**/rest/v1/employees*', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204 })
      return
    }

    const url = new URL(route.request().url())
    assertQueryParam(url, 'organization_id', `eq.${organizationId}`)
    assertRangeIfVisible(route)

    await fulfillJson(route, fixture.employees)
  })
}

async function selectJanuary2026(page: Page, endMonth = '1') {
  await page.getByTestId('work-performance-year').fill('2026')
  await page.getByTestId('work-performance-start-month').selectOption('1')
  await page.getByTestId('work-performance-end-month').selectOption(endMonth)
}

test.describe('work performance', () => {
  test('opens from top navigation without showing the old placeholder state', async ({ page }) => {
    await openAppShell(page)
    await mockWorkPerformanceRest(page, createSuccessfulFixture())

    const topNav = page.getByRole('navigation', { name: '주요 메뉴' })
    await topNav.getByRole('button', { name: '근무표 분석', exact: true }).hover()
    await topNav.getByRole('button', { name: '근무자별', exact: true }).click()

    await expect(page).toHaveURL((url) => url.pathname === getWorkPerformanceRoutePath())
    await expect(page.getByRole('heading', { name: '근무 실적', exact: true })).toBeVisible()
    await expect(page.getByTestId('work-performance-initial')).toBeVisible()
  })

  test('queries finalized schedules and renders summary, employee rows, and deltas', async ({ page }) => {
    await openWorkPerformance(page, createSuccessfulFixture())
    await selectJanuary2026(page)

    await page.getByTestId('work-performance-query').click()

    await expect(page.getByTestId('work-performance-applied-period')).toHaveText('조회 기간: 2026년 1월')
    await expect(page.getByTestId('work-performance-summary')).toContainText('야간 근무')
    await expect(page.getByTestId('work-performance-summary')).toContainText('최대 편차 2.5일')
    await expect(page.getByTestId('work-performance-risk-summary')).toHaveCount(0)
    await expect(page.getByTestId('work-performance-matrix')).toBeVisible()
    expect(await page.evaluate(() => {
      const summary = document.querySelector('[data-test="work-performance-summary"]')
      const matrix = document.querySelector('[data-test="work-performance-matrix"]')

      return Boolean(summary && matrix && (summary.compareDocumentPosition(matrix) & Node.DOCUMENT_POSITION_FOLLOWING))
    })).toBe(true)
    await expect(page.getByTestId('work-performance-employee-row')).toHaveCount(2)
    await expect(page.getByTestId('work-performance-employee-name').filter({ hasText: '김민지' })).toBeVisible()
    await expect(page.getByTestId('work-performance-cell-employee-a-night')).toContainText('평균 대비 +2.5일')
  })

  test('renders finalized data with a notice when selected months are not finalized', async ({ page }) => {
    await openWorkPerformance(page, {
      ...createSuccessfulFixture(),
      schedules: [
        {
          id: 'schedule-2026-01',
          month: '2026-01',
          finalized_version_id: 'version-2026-01',
        },
        {
          id: 'schedule-2026-02',
          month: '2026-02',
          finalized_version_id: null,
        },
      ],
    })
    await selectJanuary2026(page, '2')

    await page.getByTestId('work-performance-query').click()

    await expect(page.getByTestId('work-performance-missing-months-notice')).toContainText('확정된 근무표가 없어 실적 계산에서 제외되었습니다')
    await expect(page.getByTestId('work-performance-missing-months-notice')).toContainText('2026년 2월')
    await expect(page.getByTestId('work-performance-analysis-period')).toHaveText('분석 기준: 2026년 1월 확정 데이터')
    await expect(page.getByTestId('work-performance-matrix')).toBeVisible()
    await expect(page.getByTestId('work-performance-employee-name').filter({ hasText: '김민지' })).toBeVisible()
  })

  test('updates highlighted cells when the threshold changes', async ({ page }) => {
    await openWorkPerformance(page, createSuccessfulFixture())
    await selectJanuary2026(page)

    await page.getByTestId('work-performance-query').click()
    await expect(page.getByTestId('work-performance-emphasis-label')).toHaveCount(1)

    await page.getByTestId('work-performance-threshold').fill('10')
    await expect(page.getByTestId('work-performance-emphasis-label')).toHaveCount(0)

    await page.getByTestId('work-performance-threshold').fill('3')
    await expect(page.getByTestId('work-performance-emphasis-label')).toHaveCount(1)
  })

  test('expands employee details with evidence dates and empty metric states', async ({ page }) => {
    await openWorkPerformance(page, createSuccessfulFixture())
    await selectJanuary2026(page)
    await page.getByTestId('work-performance-query').click()

    const detailButton = page.getByTestId('work-performance-detail-employee-a')
    await detailButton.click()

    await expect(detailButton).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByTestId('work-performance-detail-row-employee-a')).toContainText('1/3 토')
    await expect(page.getByTestId('work-performance-detail-row-employee-a')).toContainText('1/1 목')
    await expect(page.getByTestId('work-performance-detail-row-employee-a')).toContainText('공휴일')
    await expect(page.getByTestId('work-performance-detail-row-employee-a')).toContainText('해당 날짜 없음')
  })
})
