import { expect, test, type Page, type Route } from '@playwright/test'
import {
  getScheduleStepRoutePath,
  getStep5ScheduleKeyFromPath,
} from '../../src/constants/routes'
import {
  applyRequest,
  mockDashboardReadiness,
  mockRbacContext,
  seedPlaywrightAuthState,
  seedScheduleWizardContext,
  seedSelectedOrganization,
  selectRequestDates,
} from './helpers'

test.use({ storageState: { cookies: [], origins: [] } })

const corsHeaders = {
  'access-control-allow-origin': 'http://127.0.0.1:5173',
  'access-control-allow-headers': 'apikey, authorization, content-type',
  'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'access-control-max-age': '86400',
}

const scheduleId = 'schedule-regenerate-off-save'
const schedulePublicId = 'schedule-public-regenerate-off-save'
const canonicalVersionId = 'version-canonical'

const recheckEvaluation = {
  id: 'evaluation-recheck',
  scheduleId,
  scheduleVersionId: canonicalVersionId,
  revisionNo: 2,
  resultStatus: 'review_blocked',
  proofSummary: {
    weeklyHoursViolations: 0,
    nnnViolations: 0,
    nodViolations: 0,
    minimumRestViolations: 0,
    staffingShortfalls: 300,
  },
  violationDetails: [
    {
      code: 'staffing_shortfall',
      message: 'Staffing shortfall on 2026-06-01: required 2, assigned 0.',
      severity: 'error',
      affectedEmployeeIds: [],
      dates: ['2026-06-01'],
      metadata: {
        requiredCount: 2,
        assignedCount: 0,
      },
    },
  ],
  infeasibility: null,
  offRequestResults: [],
  comparisonMetrics: null,
  finalizationGate: {
    allowed: false,
    blockingReasons: [],
  },
  assignmentHash: 'hash-recheck',
  solverExecutionId: null,
  evaluatorVersion: 'test',
  createdAt: '2026-05-01T00:00:00Z',
}

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

function createCompareResponse(options: {
  status?: string
  activeSolvingVersionId?: string | null
  activeSolverExecutionId?: string | null
} = {}) {
  return {
    scheduleId,
    schedulePublicId,
    organizationId: 'org-1',
    month: '2026-06',
    selectedVersionId: canonicalVersionId,
    finalizedVersionId: null,
    activeSolvingVersionId: options.activeSolvingVersionId ?? null,
    versions: [
      {
        id: canonicalVersionId,
        scheduleId,
        versionNo: 2,
        name: '현재 근무표',
        sourceType: 're_solve',
        baseVersionId: 'version-legacy',
        status: options.status ?? 'review_ready',
        currentRevision: 2,
        manualEditCount: 0,
        inputDiffSummary: {
          changedOffRequests: 0,
          changedLockedAssignments: 0,
          changedSiteRequirements: 0,
          note: null,
        },
        latestEvaluationId: 'evaluation-recheck',
        latestEvaluationResultStatus: 'review_blocked',
        comparisonMetrics: null,
        finalizationGate: null,
        activeSolverExecutionId: options.activeSolverExecutionId ?? null,
        isSelected: true,
        isFinalized: false,
      },
    ],
  }
}

async function mockRegenerateFlowNetwork(page: Page) {
  let hasRecheckEvaluation = false
  let versionStatus = 'review_ready'
  let activeSolvingVersionId: string | null = null
  let activeSolverExecutionId: string | null = null

  await page.route('**/functions/v1/phase2-ops/off-request-policies*', async (route) => {
    await fulfillJson(route, {
      organizationId: 'org-1',
      rankCodes: [],
      policyRules: [
        { rankCode: null, periodType: 'monthly', limitCount: 99, isActive: true },
        { rankCode: null, periodType: 'annual', limitCount: 10, isActive: true },
      ],
    })
  })

  await page.route('**/functions/v1/phase2-schedule/schedules/ensure', async (route) => {
    await fulfillJson(route, createCompareResponse())
  })

  await page.route('**/functions/v1/phase2-schedule/schedules/**/compare', async (route) => {
    await fulfillJson(route, createCompareResponse({
      status: versionStatus,
      activeSolvingVersionId,
      activeSolverExecutionId,
    }))
  })

  await page.route('**/functions/v1/phase2-schedule/schedule-versions/**/review', async (route) => {
    await fulfillJson(route, {
      scheduleId,
      selectedVersionId: canonicalVersionId,
      finalizedVersionId: null,
      version: createCompareResponse({ status: versionStatus }).versions[0],
      latestEvaluation: hasRecheckEvaluation ? recheckEvaluation : null,
      primaryAction: {
        kind: 'recheck',
        targetVersionId: canonicalVersionId,
        label: 'Run recheck',
        disabledReason: null,
      },
      defaultTab: 'grid',
    })
  })

  await page.route('**/functions/v1/phase2-schedule/schedule-versions/**/recheck', async (route) => {
    hasRecheckEvaluation = true
    versionStatus = 'review_blocked'
    await fulfillJson(route, {
      scheduleVersionId: canonicalVersionId,
      currentRevision: 2,
      evaluationId: 'evaluation-recheck',
      resultStatus: 'review_blocked',
      evaluationResultStatus: 'review_blocked',
    })
  })

  await page.route('**/functions/v1/phase2-schedule/schedule-versions/**/solve', async (route) => {
    versionStatus = 'solving'
    activeSolvingVersionId = canonicalVersionId
    activeSolverExecutionId = 'exec-regenerate-1'
    await fulfillJson(route, {
      scheduleVersionId: canonicalVersionId,
      solverExecutionId: 'exec-regenerate-1',
      status: 'solving',
    })
  })

  await page.route('**/api/solve', async (route) => {
    await fulfillJson(route, { execution_id: 'exec-regenerate-1' })
  })

  await page.route('**/api/status/**', async (route) => {
    await fulfillJson(route, {
      status: 'running',
      hard_score: 0,
      soft_score: 0,
      progress: 25,
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
      await fulfillJson(route, [])
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
      status: versionStatus === 'solving' ? 'running' : 'created',
      hard_score: null,
      soft_score: null,
      solver_execution_id: activeSolverExecutionId,
      finalized_version_id: null,
      created_at: '2026-05-01T00:00:00Z',
      updated_at: '2026-05-01T00:00:00Z',
    })
  })

  await page.route(/employees/, async (route) => {
    const method = route.request().method()
    const countHeaders = {
      ...corsHeaders,
      'content-range': '0-0/1',
    }

    if (method === 'HEAD') {
      await route.fulfill({
        status: 200,
        headers: countHeaders,
      })
      return
    }

    if (method === 'GET') {
      const preferHeader = route.request().headers().prefer ?? ''
      const url = route.request().url()
      if (preferHeader.includes('count=exact') || url.includes('select=id')) {
        await route.fulfill({
          status: 200,
          headers: {
            ...countHeaders,
            'content-type': 'application/json',
          },
          body: '[]',
        })
        return
      }
    }

    await fulfillJson(route, [
      {
        id: 'employee-1',
        organization_id: 'org-1',
        employee_id: 'E001',
        name: '김 간호사',
        available_shifts: ['D', 'E', 'N', 'O'],
      },
    ])
  })

  await page.route('**/rest/v1/shifts*', async (route) => {
    await fulfillJson(route, [
      {
        id: 'shift-d',
        organization_id: 'org-1',
        code: 'D',
        name: 'Day',
        color_code: '#3B82F6',
        start_time: '08:00:00',
        end_time: '16:00:00',
      },
    ])
  })

  await page.route('**/rest/v1/site_requirements*', async (route) => {
    await fulfillJson(route, [])
  })

  await page.route('**/rest/v1/public_holidays*', async (route) => {
    await fulfillJson(route, [])
  })
  await page.route('**/rest/v1/organizations*', async (route) => {
    await fulfillJson(route, [
      {
        id: 'org-1',
        name: '서버 병원',
        type: 'hospital',
      },
    ])
  })
  await page.route('**/functions/v1/phase2-ops/checklist*', async (route) => {
    await fulfillJson(route, {
      organizationId: 'org-1',
      fairnessSummary: [],
    })
  })

  await page.route('**/functions/v1/phase2-schedule/**/previous-month-finalized-context*', async (route) => {
    await fulfillJson(route, null)
  })

  await page.route('**/functions/v1/phase2-schedule/**/yearly-employee-stats*', async (route) => {
    await fulfillJson(route, [])
  })

  await page.route('**/functions/v1/phase2-schedule/**/public-holidays*', async (route) => {
    await fulfillJson(route, [])
  })
}

async function seedStep4Context(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(window.location, 'hostname', {
      get: () => 'app.everyshift.test',
    })
  })

  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window)
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      if (url.includes('/employees') && (url.includes('select=id') || init?.method === 'HEAD')) {
        return new Response('[]', {
          status: 200,
          headers: {
            'content-range': '0-0/1',
            'content-type': 'application/json',
          },
        })
      }
      return originalFetch(input, init)
    }
  })

  await seedPlaywrightAuthState(page)
  await mockRbacContext(page, 'admin_active')
  await mockDashboardReadiness(page, 'complete')
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
  await mockRegenerateFlowNetwork(page)
}

test.describe('Step4 regenerate after Off save', () => {
  test('hides pre-run staffing review attention after Off change and Step5 handoff', async ({ page }) => {
    test.setTimeout(120_000)

    await seedStep4Context(page)

    await page.goto(`${getScheduleStepRoutePath(4)}?version=${canonicalVersionId}`)
    await expect(page.getByText('사전 Off 요청 입력')).toBeVisible({ timeout: 15000 })

    await page.getByTestId('request-drawer-toggle').click()
    await page.getByTestId('step4-employee-select').click()
    await page.keyboard.type('김')
    await page.getByRole('dialog').getByText('김 간호사 (E001)').click()
    await selectRequestDates(page, [0])
    await applyRequest(page)
    await expect(page.locator('.constraint-selector').filter({ hasText: 'O' }).first()).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: '근무표 생성(AI)' })).toBeEnabled({ timeout: 10000 })

    await page.getByRole('button', { name: '근무표 생성(AI)' }).click()

    await page.waitForURL((url) => getStep5ScheduleKeyFromPath(url.pathname) === schedulePublicId)

    await expect(page.getByTestId('step5-review-attention-panel')).toHaveCount(0)
    await expect(page.getByText('검토 필요')).toHaveCount(0)
    await expect(page.getByText(/인력 부족 \d+건/)).toHaveCount(0)
    await expect(page.getByText('아직 생성 결과가 없습니다')).toBeVisible()
  })
})
