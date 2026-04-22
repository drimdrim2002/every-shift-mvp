import { expect, test } from '@playwright/test'
import { waitForDashboard } from './helpers'

const corsHeaders = {
  'access-control-allow-origin': 'http://127.0.0.1:5173',
  'access-control-allow-headers': 'apikey, authorization, content-type',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-max-age': '86400',
}

test.describe('pilot checklist entry surface', () => {
  test('shows a checklist card with deep links from the dashboard shell', async ({ page }) => {
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
              route: '/ops/organization-setup',
              blockedReason: null,
            },
            {
              key: 'schedule_foundation',
              title: '기준 장소와 근무 기준 설정',
              status: 'ready',
              route: '/schedule/step2',
              blockedReason: null,
            },
            {
              key: 'employee_roster',
              title: '직원 로스터 준비',
              status: 'ready',
              route: '/schedule/step3',
              blockedReason: null,
            },
            {
              key: 'off_request_policy',
              title: 'Off 사용 기준 설정',
              status: 'ready',
              route: '/ops/off-request-policy-setup',
              blockedReason: null,
            },
            {
              key: 'schedule_review',
              title: '최종 검토 진입',
              status: 'ready',
              route: '/schedule/step5/schedule-123',
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
    await expect(page).toHaveURL(/\/ops\/organization-setup$/)
    await expect(page.getByRole('heading', { name: '운영 기본 설정' })).toBeVisible()

    await page.goto('/')
    await waitForDashboard(page)
    await page.getByTestId('pilot-checklist-link-schedule_foundation').click()
    await expect(page).toHaveURL(/\/schedule\/step2/)
    await expect(page.getByText('운영 준비 - 기준 장소와 근무 기준 설정')).toBeVisible()

    await page.goto('/')
    await waitForDashboard(page)
    await page.getByTestId('pilot-checklist-link-employee_roster').click()
    await expect(page).toHaveURL(/\/schedule\/step3/)
    await expect(page.getByText('운영 준비 - 직원 기준 설정')).toBeVisible()

    await page.goto('/')
    await waitForDashboard(page)
    await page.getByTestId('pilot-checklist-link-off_request_policy').click()
    await expect(page).toHaveURL(/\/ops\/off-request-policy-setup$/)
    await expect(page.getByRole('heading', { name: 'Off 사용 기준 설정' })).toBeVisible()

    await page.goto('/')
    await waitForDashboard(page)
    await page.getByTestId('pilot-checklist-link-schedule_review').click()
    await expect(page).toHaveURL(/\/schedule\/step5\/schedule-123/)
    await expect(page.getByText('근무표 생성 - 결과 확인')).toBeVisible()
  })
})
