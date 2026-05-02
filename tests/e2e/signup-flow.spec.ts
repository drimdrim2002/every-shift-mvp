import { expect, test, type Page } from '@playwright/test'

test.use({
  storageState: {
    cookies: [],
    origins: [],
  },
})

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

async function openSignupForm(page: Page) {
  await expect(page.getByTestId('social-auth-options')).toBeVisible()
  await expect(page.getByTestId('signup-submit')).toBeVisible()
}

async function selectUserRole(page: Page) {
  await page.locator('.n-radio-group').getByText('사용자', { exact: true }).click()
}

test.describe('/signup flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockHospitalSearch(page)
    await mockSignupSubmit(page)
    await page.goto('/signup')
  })

  test('shows credential forms by default with Kakao and Google only', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByTestId('social-auth-options')).toBeVisible()
    await expect(page.getByTestId('login-email')).toBeVisible()
    await expect(page.getByTestId('social-auth-kakao')).toBeVisible()
    await expect(page.getByTestId('social-auth-google')).toBeVisible()
    await expect(page.getByTestId('social-auth-id')).toHaveCount(0)
    await expect(page.getByTestId('social-auth-naver')).toHaveCount(0)

    await page.goto('/signup')
    await expect(page.getByTestId('social-auth-options')).toBeVisible()
    await expect(page.getByTestId('signup-submit')).toBeVisible()
    await expect(page.getByTestId('social-auth-kakao')).toBeVisible()
    await expect(page.getByTestId('social-auth-google')).toBeVisible()
    await expect(page.getByTestId('social-auth-id')).toHaveCount(0)
    await expect(page.getByTestId('social-auth-naver')).toHaveCount(0)
  })

  test('opens admin signup from role query', async ({ page }) => {
    await page.goto('/signup?role=admin')
    await openSignupForm(page)

    await expect(
      page.getByText('병원 검색 결과가 없어도, 위에 입력한 병원명 그대로 가입 신청할 수 있습니다.'),
    ).toBeVisible()
    await expect(page.getByText('검색 결과 출처: 공공데이터포털(data.go.kr)')).toBeVisible()
    await expect(page.getByPlaceholder('초대코드 입력')).toHaveCount(0)
  })

  test('opens invite signup from role query', async ({ page }) => {
    await page.goto('/signup?role=user')
    await openSignupForm(page)

    await expect(page.getByPlaceholder('초대코드 입력')).toBeVisible()
    await expect(page.getByText('검색 결과 출처: 공공데이터포털(data.go.kr)')).toHaveCount(0)
  })

  test('routes admin signup success through pending approval login handoff', async ({ page }) => {
    await openSignupForm(page)
    await fillCommonFields(page, 'admin-success@example.com')
    await page.getByPlaceholder('병원명을 직접 입력하거나 검색하세요').fill('세브란스병원')

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
      page.locator('.n-alert-body__content').filter({
        hasText: '회원가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.',
      }),
    ).toBeVisible()
    expect(visitedUrls.some((url) => url.includes('/login?signupState=pending_approval'))).toBeTruthy()

    page.off('framenavigated', onFrameNavigated)
  })

  test('routes invite signup success through active login handoff', async ({ page }) => {
    await openSignupForm(page)
    await selectUserRole(page)
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
      page.locator('.n-alert-body__content').filter({ hasText: '가입이 완료되었습니다. 로그인할 수 있습니다.' }),
    ).toBeVisible()
    expect(visitedUrls.some((url) => url.includes('/login?signupState=active'))).toBeTruthy()

    page.off('framenavigated', onFrameNavigated)
  })
})
