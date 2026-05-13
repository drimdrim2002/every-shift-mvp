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
      await fulfillJson(route, fixture.schedules.filter((schedule) => schedule.finalized_version_id))
      return
    }

    await fulfillJson(route, fixture.schedules)
  })

  await page.route('**/rest/v1/public_holidays*', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204 })
      return
    }

    const url = new URL(route.request().url())
    const isCoverageCheck = url.searchParams.has('limit')
    const holidays = fixture.publicHolidays.map((holiday_date) => ({ holiday_date }))

    await fulfillJson(route, isCoverageCheck ? holidays.slice(0, 1) : holidays)
  })

  await page.route('**/rest/v1/schedule_assignments*', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204 })
      return
    }

    await fulfillJson(route, fixture.assignments)
  })

  await page.route('**/rest/v1/schedule_preferences*', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204 })
      return
    }

    await fulfillJson(route, fixture.preferences)
  })

  await page.route('**/rest/v1/employees*', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204 })
      return
    }

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

    const topNav = page.getByRole('navigation', { name: '주요 메뉴' })
    await topNav.getByRole('button', { name: '근무표 분석', exact: true }).hover()
    await topNav.getByRole('button', { name: '근무자별', exact: true }).click()

    await expect(page).toHaveURL((url) => url.pathname === getWorkPerformanceRoutePath())
    await expect(page.getByRole('heading', { name: '근무 실적', exact: true })).toBeVisible()
    await expect(page.getByText('준비 중입니다')).toHaveCount(0)
  })

  test('queries finalized schedules and renders summary, employee rows, and deltas', async ({ page }) => {
    await openWorkPerformance(page, createSuccessfulFixture())
    await selectJanuary2026(page)

    await page.getByTestId('work-performance-query').click()

    await expect(page.getByTestId('work-performance-applied-period')).toHaveText('조회 기간: 2026년 1월')
    await expect(page.getByTestId('work-performance-summary')).toContainText('야간 근무')
    await expect(page.getByTestId('work-performance-summary')).toContainText('최대 편차 5.7일')
    await expect(page.getByTestId('work-performance-table')).toBeVisible()
    await expect(page.getByTestId('work-performance-employee-row')).toHaveCount(3)
    await expect(page.getByTestId('work-performance-employee-name').filter({ hasText: '김민지' })).toBeVisible()
    await expect(page.getByTestId('work-performance-cell-employee-a-night')).toContainText('평균 대비 +3.3일')
    await expect(page.getByText('준비 중입니다')).toHaveCount(0)
  })

  test('blocks a selected period when any month is not finalized', async ({ page }) => {
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

    await expect(page.getByRole('heading', { name: '선택한 기간에 아직 확정되지 않은 월이 있습니다' })).toBeVisible()
    await expect(page.getByTestId('work-performance-state').getByText('2026년 2월')).toBeVisible()
    await expect(page.getByTestId('work-performance-table')).toHaveCount(0)
  })

  test('updates highlighted cells when the threshold changes', async ({ page }) => {
    await openWorkPerformance(page, createSuccessfulFixture())
    await selectJanuary2026(page)

    await page.getByTestId('work-performance-query').click()
    await expect(page.getByTestId('work-performance-emphasis-label')).toHaveCount(2)

    await page.getByTestId('work-performance-threshold').fill('10')
    await expect(page.getByTestId('work-performance-emphasis-label')).toHaveCount(0)

    await page.getByTestId('work-performance-threshold').fill('3')
    await expect(page.getByTestId('work-performance-emphasis-label')).toHaveCount(2)
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
