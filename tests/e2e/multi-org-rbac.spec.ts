import { expect, test } from '@playwright/test'
import {
  mockRbacContext,
  seedPlaywrightAuthState,
  seedScheduleWizardContext,
  selectOrganization,
} from './helpers'

test.describe('multi-org RBAC regression', () => {
  test('super selects an organization before entering schedule generation', async ({ page }) => {
    await seedPlaywrightAuthState(page)
    const fixture = await mockRbacContext(page, 'super_active')
    const targetOrganization = fixture.organizations[1]
    const targetOrganizationLabel = `${targetOrganization.id} (관리자)`

    await page.goto('/admin/approval-queue')
    await expect(page.getByRole('heading', { name: '관리자 가입 승인', exact: true })).toBeVisible()
    await expect(page.getByTestId('organization-switcher')).toBeVisible()

    await seedScheduleWizardContext(page, {
      organizationId: targetOrganization.id,
      organizationName: targetOrganization.name,
      organizationType: targetOrganization.type,
      month: '2026-05',
      employeeCount: 1,
    })

    await selectOrganization(page, targetOrganizationLabel)
    await expect(page.getByTestId('organization-switcher')).toContainText(targetOrganizationLabel)

    await page.goto('/schedule/step1')
    await expect(page).toHaveURL(/\/schedule\/step1$/)
    await expect(page.getByText('근무표 생성 - 기본 정보 설정')).toBeVisible()
    await expect(page.getByTestId('organization-switcher')).toContainText(targetOrganizationLabel)
    await expect(page.getByText('계획월:')).toBeVisible()
  })

  test('user_active cannot access schedule generation routes and lands on /home/user', async ({
    page,
  }) => {
    await seedPlaywrightAuthState(page)
    await mockRbacContext(page, 'user_active')

    await page.goto('/schedule/step1')

    await expect(page).toHaveURL(/\/home\/user$/)
    await expect(page.getByRole('heading', { name: '운영 권한 안내' })).toBeVisible()
    await expect(page.getByText('현재 계정은 운영 기능 권한이 없습니다.')).toBeVisible()
  })
})
