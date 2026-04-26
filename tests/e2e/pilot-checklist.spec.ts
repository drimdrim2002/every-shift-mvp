import { expect, test } from '@playwright/test'
import {
  LEGACY_OPS_OFF_REQUEST_POLICY_SETUP_ROUTE_PATH,
  LEGACY_OPS_ORGANIZATION_SETUP_ROUTE_PATH,
  LEGACY_SCHEDULE_STEP2_ROUTE_PATH,
  LEGACY_SCHEDULE_STEP3_ROUTE_PATH,
  LEGACY_SCHEDULE_STEP5_ROUTE_PREFIX,
  getOpsOffRequestPolicySetupRoutePath,
  getOpsOrganizationSetupRoutePath,
  getScheduleStep5RoutePath,
  getScheduleStepRoutePath,
} from '../../src/constants/routes'
import {
  mockRbacContext,
  seedPlaywrightAuthState,
  seedSelectedOrganization,
  waitForDashboard,
} from './helpers'

const corsHeaders = {
  'access-control-allow-origin': 'http://127.0.0.1:5173',
  'access-control-allow-headers': 'apikey, authorization, content-type',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-max-age': '86400',
}

test.describe('pilot checklist entry surface', () => {
  test('shows a checklist card with deep links from the dashboard shell', async ({ page }) => {
    await seedPlaywrightAuthState(page)
    await mockRbacContext(page, 'admin_active')
    await seedSelectedOrganization(page, 'org-1')

    await page.route('**/functions/v1/phase2-schedule/schedules/**/compare', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders })
        return
      }

      await route.fulfill({
        status: 200,
        headers: {
          ...corsHeaders,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          scheduleId: 'schedule-123',
          schedulePublicId: 'schedule-123',
          organizationId: 'org-1',
          month: '2026-05',
          selectedVersionId: 'version-1',
          finalizedVersionId: null,
          activeSolvingVersionId: null,
          versions: [
            {
              id: 'version-1',
              scheduleId: 'schedule-123',
              versionNo: 1,
              name: 'V1',
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
              latestEvaluationId: null,
              latestEvaluationResultStatus: null,
              comparisonMetrics: null,
              finalizationGate: null,
              activeSolverExecutionId: null,
              isSelected: true,
              isFinalized: false,
            },
          ],
        }),
      })
    })

    await page.route('**/functions/v1/phase2-ops/checklist*', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders })
        return
      }

      await route.fulfill({
        status: 200,
        headers: {
          ...corsHeaders,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: 'org-1',
          checklistCursor: 'schedule_review',
          ready: true,
          items: [
            {
              key: 'organization_profile',
              title: '병원 정보 확인',
              status: 'ready',
              route: LEGACY_OPS_ORGANIZATION_SETUP_ROUTE_PATH,
              blockedReason: null,
            },
            {
              key: 'schedule_foundation',
              title: '기준 장소와 근무 기준 설정',
              status: 'ready',
              route: LEGACY_SCHEDULE_STEP2_ROUTE_PATH,
              blockedReason: null,
            },
            {
              key: 'employee_roster',
              title: '직원 로스터 준비',
              status: 'ready',
              route: LEGACY_SCHEDULE_STEP3_ROUTE_PATH,
              blockedReason: null,
            },
            {
              key: 'off_request_policy',
              title: 'Off 사용 기준 설정',
              status: 'ready',
              route: LEGACY_OPS_OFF_REQUEST_POLICY_SETUP_ROUTE_PATH,
              blockedReason: null,
            },
            {
              key: 'schedule_review',
              title: '최종 검토 진입',
              status: 'ready',
              route: `${LEGACY_SCHEDULE_STEP5_ROUTE_PREFIX}schedule-123`,
              blockedReason: null,
            },
          ],
          fairnessSummary: [],
        }),
      })
    })

    await page.goto('/')
    await waitForDashboard(page)

    await expect(page.getByText('운영 준비 체크리스트')).toBeVisible()
    await expect(page.getByRole('heading', { name: '병원 정보 확인' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '기준 장소와 근무 기준 설정' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '직원 로스터 준비' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Off 사용 기준 설정' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '최종 검토 진입' })).toBeVisible()

    await page.getByTestId('pilot-checklist-link-organization_profile').click()
    await expect(page).toHaveURL((url) => url.pathname === getOpsOrganizationSetupRoutePath())
    await expect(page.getByRole('heading', { name: '운영 기본 설정' })).toBeVisible()

    await page.goto('/')
    await waitForDashboard(page)
    await page.getByTestId('pilot-checklist-link-schedule_foundation').click()
    await expect(page).toHaveURL((url) => url.pathname === getScheduleStepRoutePath(2))
    await expect(page.getByText('운영 준비 - 기준 장소와 근무 기준 설정')).toBeVisible()

    await page.goto('/')
    await waitForDashboard(page)
    await page.getByTestId('pilot-checklist-link-employee_roster').click()
    await expect(page).toHaveURL((url) => url.pathname === getScheduleStepRoutePath(3))
    await expect(page.getByText('운영 준비 - 직원 기준 설정')).toBeVisible()

    await page.goto('/')
    await waitForDashboard(page)
    await page.getByTestId('pilot-checklist-link-off_request_policy').click()
    await expect(page).toHaveURL((url) => url.pathname === getOpsOffRequestPolicySetupRoutePath())
    await expect(page.getByRole('heading', { name: 'Off 사용 기준 설정' })).toBeVisible()

    await page.goto('/')
    await waitForDashboard(page)
    await page.getByTestId('pilot-checklist-link-schedule_review').click()
    await expect(page).toHaveURL((url) => url.pathname === getScheduleStep5RoutePath('schedule-123'))
    await expect(page.getByText('근무표 생성 - 결과 확인')).toBeVisible()
  })
})
