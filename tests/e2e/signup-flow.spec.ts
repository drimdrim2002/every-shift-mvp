import { expect, test, type Page } from '@playwright/test'

async function mockHospitalSearch(page: Page) {
  await page.route('**/functions/v1/hospital-search', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          source: 'data.go.kr',
          keyword: '세브',
          items: [
            {
              id: 'hospital-1',
              name: '세브란스병원',
              source: 'data.go.kr',
            },
          ],
          paging: {
            pageNo: 1,
            numOfRows: 20,
            totalCount: 1,
          },
        },
      }),
    })
  })
}

async function mockSignupSubmit(page: Page) {
  await page.route('**/functions/v1/signup-submit', async (route) => {
    const payload = route.request().postDataJSON() as { role?: 'admin' | 'user' }
    const isAdmin = payload?.role === 'admin'

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: isAdmin
          ? {
              path: 'admin_submit',
              nextState: 'pending_approval',
              signupRequestStatus: 'pending',
              membershipStatus: 'none',
              organizationId: 'hospital-1',
            }
          : {
              path: 'user_invite_redeem',
              nextState: 'active',
              signupRequestStatus: 'approved',
              membershipStatus: 'approved',
              organizationId: 'hospital-1',
            },
      }),
    })
  })
}

async function fillCommonFields(page: Page, email: string) {
  await page.getByPlaceholder('이름 입력').fill('테스트 사용자')
  await page.getByPlaceholder('name@example.com').fill(email)
  await page.getByPlaceholder('8자 이상 입력').fill('password123')
}

async function selectRole(page: Page, roleLabel: '관리자' | '사용자') {
  await page.locator('.n-radio-group').getByText(roleLabel, { exact: true }).click()
}

test.describe('/signup role-branch flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockHospitalSearch(page)
    await mockSignupSubmit(page)
    await page.goto('/signup')
  })

  test('toggles role-specific sections on a single route', async ({ page }) => {
    await expect(page.getByPlaceholder('병원명을 2글자 이상 입력하세요')).toBeVisible()
    await expect(page.getByText('병원 목록 출처: 공공데이터포털(data.go.kr)')).toBeVisible()
    await expect(page.getByPlaceholder('초대코드 입력')).toHaveCount(0)

    await selectRole(page, '사용자')

    await expect(page.getByPlaceholder('초대코드 입력')).toBeVisible()
    await expect(page.getByPlaceholder('병원명을 2글자 이상 입력하세요')).toHaveCount(0)
  })

  test('enforces role-specific submit blocking', async ({ page }) => {
    await fillCommonFields(page, 'admin-block@example.com')

    const adminSubmitButton = page.getByRole('button', { name: '가입 신청' })
    await expect(adminSubmitButton).toBeDisabled()

    await selectRole(page, '사용자')
    await fillCommonFields(page, 'user-block@example.com')

    const userSubmitButton = page.getByRole('button', { name: '가입하기' })
    await expect(userSubmitButton).toBeDisabled()

    await page.getByPlaceholder('초대코드 입력').fill('INV-001')
    await expect(userSubmitButton).toBeEnabled()
  })

  test('routes admin success through /login?signupState=pending_approval handoff', async ({ page }) => {
    await fillCommonFields(page, 'admin-success@example.com')
    await page.getByPlaceholder('병원명을 2글자 이상 입력하세요').fill('세브')
    await page.getByRole('button', { name: '검색' }).click()

    await page.locator('.n-select').first().click()
    await page.getByText('세브란스병원', { exact: true }).click()

    const visitedUrls: string[] = []
    const onFrameNavigated = (frame: { url: () => string }) => {
      visitedUrls.push(frame.url())
    }
    page.on('framenavigated', onFrameNavigated)

    await page.getByRole('button', { name: '가입 신청' }).click()
    await expect(page.getByText('가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.')).toBeVisible()

    await page.getByRole('button', { name: '로그인으로 이동' }).click()
    await expect(page).toHaveURL(/\/login(?:\?.*)?$/)
    await expect(
      page.locator('.n-alert-body__content').filter({ hasText: '회원가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.' })
    ).toBeVisible()
    expect(visitedUrls.some((url) => url.includes('/login?signupState=pending_approval'))).toBeTruthy()

    page.off('framenavigated', onFrameNavigated)
  })

  test('routes user success through /login?signupState=active handoff', async ({ page }) => {
    await selectRole(page, '사용자')
    await fillCommonFields(page, 'user-success@example.com')
    await page.getByPlaceholder('초대코드 입력').fill('INV-VALID-001')

    const visitedUrls: string[] = []
    const onFrameNavigated = (frame: { url: () => string }) => {
      visitedUrls.push(frame.url())
    }
    page.on('framenavigated', onFrameNavigated)

    await page.getByRole('button', { name: '가입하기' }).click()
    await expect(page.getByText('가입이 완료되었습니다. 로그인 페이지에서 바로 로그인할 수 있습니다.')).toBeVisible()

    await page.getByRole('button', { name: '로그인으로 이동' }).click()
    await expect(page).toHaveURL(/\/login(?:\?.*)?$/)
    await expect(
      page.locator('.n-alert-body__content').filter({ hasText: '가입이 완료되었습니다. 로그인할 수 있습니다.' })
    ).toBeVisible()
    expect(visitedUrls.some((url) => url.includes('/login?signupState=active'))).toBeTruthy()

    page.off('framenavigated', onFrameNavigated)
  })
})
