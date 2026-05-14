import { expect, test, type Page, type Route } from '@playwright/test'
import {
  getScheduleStepRoutePath,
  getStep5ScheduleKeyFromPath,
} from '../../src/constants/routes'
import {
  mockRbacContext,
  seedPlaywrightAuthState,
  seedScheduleWizardContext,
  seedSelectedOrganization,
} from './helpers'

test.use({ storageState: { cookies: [], origins: [] } })

const corsHeaders = {
  'access-control-allow-origin': 'http://127.0.0.1:5173',
  'access-control-allow-headers': 'apikey, authorization, content-type',
  'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'access-control-max-age': '86400',
}

const scheduleId = 'schedule-single-month'
const schedulePublicId = 'schedule-public-single-month'
const canonicalVersionId = 'version-canonical'
const legacyVersionId = 'version-legacy-hidden'

async function fulfillJson(route: Route, body: unknown, status = 200) {
  if (route.request().method() === 'OPTIONS') {
    await route.fulfill({ status: 204, headers: corsHeaders })
    return
  }

  await route.fulfill({
    status,
    headers: {
      ...corsHeaders,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

function createCompareResponse() {
  return {
    scheduleId,
    schedulePublicId,
    organizationId: 'org-1',
    month: '2026-06',
    selectedVersionId: canonicalVersionId,
    finalizedVersionId: null,
    activeSolvingVersionId: null,
    versions: [
      {
        id: legacyVersionId,
        scheduleId,
        versionNo: 1,
        name: '예전 안',
        sourceType: 'initial_solve',
        baseVersionId: null,
        status: 'review_ready',
        currentRevision: 1,
        manualEditCount: 0,
        inputDiffSummary: {
          changedOffRequests: 0,
          changedLockedAssignments: 0,
          changedSiteRequirements: 0,
          note: null,
        },
        latestEvaluationId: 'evaluation-legacy',
        latestEvaluationResultStatus: 'passed',
        comparisonMetrics: null,
        finalizationGate: null,
        activeSolverExecutionId: null,
        isSelected: false,
        isFinalized: false,
      },
      {
        id: canonicalVersionId,
        scheduleId,
        versionNo: 2,
        name: '현재 근무표',
        sourceType: 're_solve',
        baseVersionId: legacyVersionId,
        status: 'review_ready',
        currentRevision: 2,
        manualEditCount: 1,
        inputDiffSummary: {
          changedOffRequests: 1,
          changedLockedAssignments: 0,
          changedSiteRequirements: 0,
          note: 'canonical',
        },
        latestEvaluationId: 'evaluation-canonical',
        latestEvaluationResultStatus: 'passed',
        comparisonMetrics: null,
        finalizationGate: null,
        activeSolverExecutionId: null,
        isSelected: true,
        isFinalized: false,
      },
    ],
  }
}

async function mockSingleVersionScheduleNetwork(page: Page) {
  await page.route('**/functions/v1/phase2-schedule/schedules/ensure', async (route) => {
    await fulfillJson(route, createCompareResponse())
  })

  await page.route('**/functions/v1/phase2-schedule/schedules/**/compare', async (route) => {
    await fulfillJson(route, createCompareResponse())
  })

  await page.route('**/functions/v1/phase2-schedule/schedule-versions/**/review', async (route) => {
    await fulfillJson(route, {
      scheduleId,
      selectedVersionId: canonicalVersionId,
      finalizedVersionId: null,
      version: createCompareResponse().versions[1],
      latestEvaluation: null,
      primaryAction: {
        kind: 'none',
        targetVersionId: null,
        label: 'No primary action',
        disabledReason: null,
      },
      defaultTab: 'grid',
    })
  })

  await page.route('**/functions/v1/phase2-schedule/schedule-versions/**/recheck', async (route) => {
    await fulfillJson(route, {
      scheduleVersionId: canonicalVersionId,
      preferenceCount: 1,
      rejectedCount: 0,
      preferences: [],
    })
  })

  await page.route('**/rest/v1/schedule_preferences*', async (route) => {
    const method = route.request().method()
    if (method === 'GET') {
      await fulfillJson(route, [
        {
          id: 'preference-1',
          schedule_id: scheduleId,
          schedule_version_id: canonicalVersionId,
          employee_id: 'employee-1',
          date: '2026-06-01',
          request_code: 'O',
          request_note: null,
          is_soft: true,
          resolution_status: 'pending',
          resolved_shift_id: null,
          resolved_at: null,
          policy_check_status: 'pending',
          policy_rejection_reason: null,
          created_at: '2026-05-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
      ])
      return
    }

    await fulfillJson(route, method === 'POST' ? [] : null, method === 'POST' ? 201 : 204)
  })

  await page.route('**/rest/v1/schedule_assignments*', async (route) => {
    const method = route.request().method()
    if (method === 'GET') {
      await fulfillJson(route, [
        {
          employee_id: 'employee-1',
          date: '2026-06-01',
          shifts: { code: 'D' },
          off_reason: null,
          comment: null,
        },
      ])
      return
    }

    await fulfillJson(route, null, 204)
  })

  await page.route('**/rest/v1/schedules*', async (route) => {
    await fulfillJson(route, {
      id: scheduleId,
      public_id: schedulePublicId,
      organization_id: 'org-1',
      month: '2026-06',
      status: 'created',
      solver_execution_id: null,
      finalized_version_id: null,
      created_at: '2026-05-01T00:00:00Z',
      updated_at: '2026-05-01T00:00:00Z',
    })
  })

  await page.route('**/rest/v1/employees*', async (route) => {
    if (route.request().method() === 'HEAD' || route.request().url().includes('select=id')) {
      await route.fulfill({
        status: 200,
        headers: {
          ...corsHeaders,
          'content-type': 'application/json',
          'content-range': '0-0/1',
        },
        body: route.request().method() === 'HEAD' ? undefined : '[]',
      })
      return
    }

    await fulfillJson(route, [
      {
        id: 'employee-1',
        organization_id: 'org-1',
        employee_id: 'E001',
        name: '김 간호사',
        available_shifts: ['D', 'E', 'N'],
      },
    ])
  })
}

async function seedStep4Context(page: Page) {
  await seedPlaywrightAuthState(page)
  await mockRbacContext(page, 'admin_active')
  await seedSelectedOrganization(page, 'org-1')
  await seedScheduleWizardContext(page, {
    organizationId: 'org-1',
    organizationName: '서버 병원',
    organizationType: 'hospital',
    month: '2026-06',
    employeeCount: 1,
    scheduleId,
    schedulePublicId,
    currentStep: 4,
  })
  await mockSingleVersionScheduleNetwork(page)
}

test.describe.skip('Step4 existing-result branch', () => {
  test('기존 결과가 있는 월도 Step4에서 version 선택이나 이름 입력을 보여주지 않는다', async ({ page }) => {
    await seedStep4Context(page)

    await page.goto(`${getScheduleStepRoutePath(4)}?version=${legacyVersionId}`)

    await expect(page.getByText('월간 검토 워크스페이스')).toBeVisible()
    await expect(page.getByText('이미 만든 근무표안이 있습니다')).toHaveCount(0)
    await expect(page.getByText('새 근무표안 이름')).toHaveCount(0)
    await expect(page.getByText('새 근무표안으로 Off 요청 수정')).toHaveCount(0)
  })

  test('결과 확인 이동 후 Step5는 canonical version만 쓰고 비교 UI를 숨긴다', async ({ page }) => {
    await seedStep4Context(page)

    await page.goto(`${getScheduleStepRoutePath(4)}?version=${legacyVersionId}`)
    await page.getByRole('button', { name: '결과 확인으로 이동' }).click()

    await page.waitForURL((url) => getStep5ScheduleKeyFromPath(url.pathname) === schedulePublicId)
    await expect(page.getByText('근무표 생성 - 결과 확인')).toBeVisible()
    await expect(page).not.toHaveURL(/version=version-legacy-hidden/)
    await expect(page.getByTestId('step5-compare-button')).toHaveCount(0)
    await expect(page.getByText('근무표안 비교')).toHaveCount(0)
  })
})
