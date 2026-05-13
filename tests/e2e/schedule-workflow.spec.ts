import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import {
  getScheduleResultsRoutePath,
  getScheduleStep5RoutePath,
  getScheduleStepRoutePath,
  getWorkPerformanceRoutePath,
} from '../../src/constants/routes'
import {
  completeStep1,
  completeStep2,
  completeStep4InitialData,
  getCellShift,
  getTempScheduleFromStorage,
  mockDashboardReadiness,
  mockRbacContext,
  seedPlaywrightAuthState,
  seedScheduleWizardContext,
  seedSelectedOrganization,
  startNewScheduleFromDashboard,
} from './helpers'

const employeeImportFile = path.resolve(process.cwd(), 'docs/임직원_등록_73.xlsx')
const corsHeaders = {
  'access-control-allow-origin': 'http://127.0.0.1:5173',
  'access-control-allow-headers': 'apikey, authorization, content-type',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-max-age': '86400',
}

async function mockStep3Network(
  page: Page,
  options: {
    finalized?: boolean
  } = {}
) {
  const mockVersionId = 'mock-step5-version-1'
  let applyCallCount = 0

  await page.route('**/functions/v1/phase2-ops/employee-import/validate', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders })
      return
    }

    const body = route.request().postDataJSON() as {
      organizationId?: string
      month?: string
      employees?: Array<{ employeeId: string; name: string; availableShifts: string[] }>
    }
    const employees = Array.isArray(body.employees) ? body.employees : []

    await route.fulfill({
      status: 200,
      headers: {
        ...corsHeaders,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        organizationId: body.organizationId ?? '',
        month: body.month ?? '',
        employeeCount: employees.length,
        duplicateEmployeeIds: [],
        missingShiftCodes: [],
        isFinalized: options.finalized ?? false,
        isValid: true,
        previewEmployees: employees,
      }),
    })
  })

  await page.route('**/functions/v1/phase2-ops/employee-import/apply', async (route) => {
    applyCallCount += 1

    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders })
      return
    }

    const body = route.request().postDataJSON() as {
      organizationId?: string
      month?: string
      employees?: Array<{ employeeId: string; name: string; availableShifts: string[] }>
    }
    const employees = Array.isArray(body.employees) ? body.employees : []

    await route.fulfill({
      status: 200,
      headers: {
        ...corsHeaders,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        organizationId: body.organizationId ?? '',
        month: body.month ?? '',
        employeeCount: employees.length,
        duplicateEmployeeIds: [],
        missingShiftCodes: [],
        isFinalized: options.finalized ?? false,
        isValid: true,
        previewEmployees: employees,
        deletedScheduleId: null,
      }),
    })
  })

  await page.route('**/functions/v1/phase2-schedule/schedules/**/compare', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders })
      return
    }

    const scheduleIdMatch = route.request().url().match(/\/schedules\/([^/]+)\/compare$/)
    const scheduleId = scheduleIdMatch?.[1] ?? ''

    await route.fulfill({
      status: 200,
      headers: {
        ...corsHeaders,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        scheduleId,
        selectedVersionId: mockVersionId,
        finalizedVersionId: options.finalized ? mockVersionId : null,
        activeSolvingVersionId: null,
        versions: [
          {
            id: mockVersionId,
            scheduleId,
            versionNo: 1,
            name: 'V1',
            sourceType: 'initial_solve',
            baseVersionId: null,
            status: options.finalized ? 'finalized' : 'draft',
            currentRevision: 1,
            manualEditCount: 0,
            inputDiffSummary: {
              changedOffRequests: 0,
              changedLockedAssignments: 0,
              changedSiteRequirements: 0,
              note: null,
            },
            latestEvaluationId: null,
            latestEvaluationResultStatus: null,
            comparisonMetrics: null,
            finalizationGate: null,
            activeSolverExecutionId: null,
            isSelected: true,
            isFinalized: options.finalized ?? false,
          },
        ],
      }),
    })
  })

  return {
    getApplyCallCount: () => applyCallCount,
  }
}

async function completeStep3WithEmployeeImport(page: Page) {
  await expect(page.getByText('근무표 생성 - 직원 정보 입력')).toBeVisible()

  await page.getByText('엑셀 업로드', { exact: true }).click()
  await page.locator('input[type="file"]').first().setInputFiles(employeeImportFile)

  await expect(page.getByText('업로드된 직원 목록 (19명)')).toBeVisible()

  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByText('직원 정보 저장 확인')).toBeVisible()
  await page.getByRole('button', { name: '저장', exact: true }).last().click()
  await expect(page.getByText('직원 정보가 저장되었습니다.')).toBeVisible()
  await page.getByRole('button', { name: /다음 단계/ }).click()
  await expect(page).toHaveURL(/\/schedule\/step4$/)
}

async function seedAuthenticatedApp(page: Page) {
  await seedPlaywrightAuthState(page)
  await mockRbacContext(page, 'admin_active')
  await seedSelectedOrganization(page, 'org-1')
}

function getTopNavigationItem(page: Page, name: string) {
  return page
    .getByRole('navigation', { name: '주요 메뉴' })
    .getByRole('button', { name })
}

test.describe('스케줄 생성 전체 워크플로우', () => {
  test('Dashboard에서 시작해 Step4까지 이동한다', async ({ page }) => {
    test.setTimeout(120_000)

    await mockStep3Network(page)
    await mockDashboardReadiness(page, 'complete')

    await test.step('Dashboard에서 새 스케줄 생성 플로우를 시작한다', async () => {
      const selectedMonth = await startNewScheduleFromDashboard(page)
      expect(selectedMonth).toMatch(/^\d{4}-\d{2}$/)
    })

    await test.step('Step1부터 Step4까지 현재 플로우 기준으로 이동한다', async () => {
      await completeStep1(page)
      await completeStep2(page, [{ dayOfWeek: 1, D: 10, E: 8, N: 5 }])
      await completeStep3WithEmployeeImport(page)
      await expect(page.getByText(/요청 입력/)).toBeVisible()
      await expect(page.getByText('월간 검토 워크스페이스')).toBeVisible()
      await expect(page.locator('[data-test="request-drawer-toggle"]').first()).toBeVisible()

      await test.step('Step4 그리드 셀 클릭으로 요청 Drawer가 열린다', async () => {
        const firstGridCell = page.locator('tbody tr').nth(0).locator('.constraint-selector').nth(0)

        await expect(page.locator('[data-test="step4-request-composer"]')).toHaveCount(0)
        await firstGridCell.click()
        await expect(page.locator('[data-test="step4-request-composer"]')).toBeVisible()
        await expect(page.locator('[data-test="step4-employee-select"]')).toBeVisible()

        await page.locator('[data-test="reset-draft"]').click()
        await page.keyboard.press('Escape')
        await expect(page.locator('[data-test="step4-request-composer"]')).toHaveCount(0)
      })

      await completeStep4InitialData(page)
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
  })

  test('finalized month는 Step3 적용에서 차단되고 apply가 호출되지 않는다', async ({
    page,
  }) => {
    test.setTimeout(120_000)

    const step3Network = await mockStep3Network(page, { finalized: true })
    await mockDashboardReadiness(page, 'complete')

    await test.step('Dashboard에서 새 스케줄 생성 플로우를 시작한다', async () => {
      const selectedMonth = await startNewScheduleFromDashboard(page)
      expect(selectedMonth).toMatch(/^\d{4}-\d{2}$/)
    })

    await test.step('Step3 저장 시 finalized 경고가 보이고 저장은 차단된다', async () => {
      await completeStep1(page)
      await completeStep2(page, [{ dayOfWeek: 1, D: 10, E: 8, N: 5 }])

      await expect(page.getByText('근무표 생성 - 직원 정보 입력')).toBeVisible()
      await page.getByText('엑셀 업로드', { exact: true }).click()
      await page.locator('input[type="file"]').first().setInputFiles(employeeImportFile)

      await expect(page.getByText('업로드된 직원 목록 (19명)')).toBeVisible()

      await page.getByRole('button', { name: '저장' }).click()

      await expect(page.getByText('현재 월에 확정된 근무표가 있어 직원 정보를 저장할 수 없습니다.')).toBeVisible()
      await expect(page).toHaveURL(/\/schedule\/step3$/)
      expect(step3Network.getApplyCallCount()).toBe(0)
    })
  })

  test.describe('상단 메뉴 라우트 스모크', () => {
    test.use({ storageState: { cookies: [], origins: [] } })

    test('Step3 직원 정보 그리드가 새 앱 레이아웃 안에서 렌더링된다', async ({ page }) => {
      await seedAuthenticatedApp(page)
      await seedScheduleWizardContext(page, {
        organizationId: 'org-1',
        organizationName: '서버 병원',
        organizationType: 'hospital',
        month: '2026-06',
        employeeCount: 1,
        currentStep: 3,
      })

      await page.goto(`${getScheduleStepRoutePath(3)}?context=setup`)

      await expect(getTopNavigationItem(page, '근무표 생성')).toHaveAttribute('aria-current', 'page')
      await expect(page.getByText('운영 준비 - 직원 기준 설정')).toBeVisible()
      await expect(page.getByText('직접 입력')).toBeVisible()
      await expect(page.locator('table').first()).toBeVisible()
      await expect(page.getByRole('cell', { name: '직원 ID' })).toBeVisible()
      await expect(page.getByRole('cell', { name: '가능 시프트' })).toBeVisible()
    })

    test('근무표 생성 Step5 동적 경로는 근무표 생성 상단 메뉴를 활성화한다', async ({ page }) => {
      await seedAuthenticatedApp(page)

      await page.goto(getScheduleStep5RoutePath('mock-schedule-public-id'))

      await expect(page).toHaveURL((url) => url.pathname === getScheduleStep5RoutePath('mock-schedule-public-id'))
      await expect(getTopNavigationItem(page, '근무표 생성')).toHaveAttribute('aria-current', 'page')
      await expect(getTopNavigationItem(page, '근무표 분석')).not.toHaveAttribute('aria-current', 'page')
    })

    test('근무표 분석 라우트는 근무표 분석 상단 메뉴를 활성화한다', async ({ page }) => {
      await seedAuthenticatedApp(page)

      await page.goto(getScheduleResultsRoutePath())
      await expect(page.getByRole('heading', { name: '생성된 근무표', exact: true })).toBeVisible()
      await expect(getTopNavigationItem(page, '근무표 분석')).toHaveAttribute('aria-current', 'page')
      await expect(getTopNavigationItem(page, '근무표 생성')).not.toHaveAttribute('aria-current', 'page')

      await page.goto(getWorkPerformanceRoutePath())
      await expect(page.getByRole('heading', { name: '근무 실적', exact: true })).toBeVisible()
      await expect(getTopNavigationItem(page, '근무표 분석')).toHaveAttribute('aria-current', 'page')
      await expect(getTopNavigationItem(page, '근무표 생성')).not.toHaveAttribute('aria-current', 'page')
    })
  })
})
