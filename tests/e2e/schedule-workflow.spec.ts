import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import {
  completeStep1,
  completeStep2,
  completeStep4InitialData,
  getCellShift,
  getTempScheduleFromStorage,
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
  await expect(page).toHaveURL(/\/schedule\/step3$/)
}

test.describe('스케줄 생성 전체 워크플로우', () => {
  test('Dashboard에서 시작해 Step4까지 이동한다', async ({ page }) => {
    test.setTimeout(120_000)

    await mockStep3Network(page)

    await test.step('Dashboard에서 새 스케줄 생성 플로우를 시작한다', async () => {
      const selectedMonth = await startNewScheduleFromDashboard(page)
      expect(selectedMonth).toMatch(/^\d{4}-\d{2}$/)
    })

    await test.step('Step1부터 Step4까지 현재 플로우 기준으로 이동한다', async () => {
      await completeStep1(page)
      await completeStep2(page, [{ dayOfWeek: 1, D: 10, E: 8, N: 5 }])
      await completeStep3WithEmployeeImport(page)
      await page.goto('/schedule/step4')
      await expect(page.getByText(/근무 조정 일정 입력/)).toBeVisible()
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
  })

  test('finalized month는 Step3 적용에서 차단되고 apply가 호출되지 않는다', async ({
    page,
  }) => {
    test.setTimeout(120_000)

    const step3Network = await mockStep3Network(page, { finalized: true })

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
})
