import { expect, test, type Page, type Route } from '@playwright/test'

type OnboardingStepKey = 'organization_info' | 'employee_seed' | 'schedule_request'
type AccessState = 'admin_active' | 'admin_pending' | 'user_active'
type OnboardingAction = 'get' | 'update' | 'complete'

interface MockScenario {
  email: string
  accessState: AccessState
  onboarding: {
    currentStepKey: OnboardingStepKey | null
    completedStepKeys: OnboardingStepKey[]
    isOnboardingComplete: boolean
  } | null
}

const ORGANIZATION_ID = 'org-1'
const USER_ID = 'user-1'
const ISO_TIMESTAMP = '2026-03-24T12:00:00.000Z'
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'content-type': 'application/json',
}

function createScenario(
  accessState: AccessState,
  onboarding: MockScenario['onboarding'],
  email = `${accessState}@example.com`,
): MockScenario {
  return {
    email,
    accessState,
    onboarding,
  }
}

function createUser(email: string) {
  return {
    id: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    email_confirmed_at: ISO_TIMESTAMP,
    confirmed_at: ISO_TIMESTAMP,
    last_sign_in_at: ISO_TIMESTAMP,
    created_at: ISO_TIMESTAMP,
    updated_at: ISO_TIMESTAMP,
    app_metadata: {
      provider: 'email',
      providers: ['email'],
    },
    user_metadata: {},
    identities: [],
  }
}

function createSession(email: string) {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    expires_at: 1_900_000_000,
    token_type: 'bearer',
    user: createUser(email),
  }
}

function createProfile(accessState: AccessState) {
  if (accessState === 'user_active') {
    return {
      id: USER_ID,
      global_role: 'user',
      account_status: 'active',
    }
  }

  return {
    id: USER_ID,
    global_role: 'admin',
    account_status: 'active',
  }
}

function createMemberships(accessState: AccessState) {
  if (accessState === 'user_active') {
    return [
      {
        id: 'membership-1',
        organization_id: ORGANIZATION_ID,
        role: 'user',
        status: 'approved',
        approved_at: ISO_TIMESTAMP,
        created_at: ISO_TIMESTAMP,
        rejection_reason: null,
      },
    ]
  }

  if (accessState === 'admin_pending') {
    return [
      {
        id: 'membership-1',
        organization_id: ORGANIZATION_ID,
        role: 'admin',
        status: 'pending',
        approved_at: null,
        created_at: ISO_TIMESTAMP,
        rejection_reason: null,
      },
    ]
  }

  return [
    {
      id: 'membership-1',
      organization_id: ORGANIZATION_ID,
      role: 'admin',
      status: 'approved',
      approved_at: ISO_TIMESTAMP,
      created_at: ISO_TIMESTAMP,
      rejection_reason: null,
    },
  ]
}

function createOnboardingPayload(action: OnboardingAction, scenario: MockScenario) {
  const progress = scenario.onboarding ?? {
    organizationId: ORGANIZATION_ID,
    currentStepKey: null,
    completedStepKeys: [],
    isOnboardingComplete: true,
    completedAt: ISO_TIMESTAMP,
  }

  return {
    success: true,
    data: {
      action,
      progress: {
        organizationId: ORGANIZATION_ID,
        currentStepKey: progress.currentStepKey,
        completedStepKeys: progress.completedStepKeys,
        isOnboardingComplete: progress.isOnboardingComplete,
        completedAt: progress.isOnboardingComplete ? ISO_TIMESTAMP : null,
      },
      transition: null,
    },
  }
}

function jsonResponse(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  })
}

async function mockSupabase(page: Page, scenario: MockScenario) {
  const session = createSession(scenario.email)
  const onboardingActions: OnboardingAction[] = []

  await page.route('**/auth/v1/**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 200,
        headers: CORS_HEADERS,
        body: '',
      })
      return
    }

    const url = new URL(route.request().url())

    if (url.pathname.endsWith('/token')) {
      await jsonResponse(route, session)
      return
    }

    if (url.pathname.endsWith('/user')) {
      await jsonResponse(route, createUser(scenario.email))
      return
    }

    await jsonResponse(route, {})
  })

  await page.route('**/rest/v1/**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 200,
        headers: CORS_HEADERS,
        body: '',
      })
      return
    }

    const url = new URL(route.request().url())

    if (url.pathname.endsWith('/profiles')) {
      await jsonResponse(route, createProfile(scenario.accessState))
      return
    }

    if (url.pathname.endsWith('/organization_memberships')) {
      await jsonResponse(route, createMemberships(scenario.accessState))
      return
    }

    if (url.pathname.endsWith('/organizations')) {
      await jsonResponse(route, {
        id: ORGANIZATION_ID,
        name: '서울병원',
        type: 'hospital',
        created_at: ISO_TIMESTAMP,
        updated_at: ISO_TIMESTAMP,
      })
      return
    }

    if (url.pathname.endsWith('/employees')) {
      await jsonResponse(route, [
        {
          id: 'employee-row-1',
          organization_id: ORGANIZATION_ID,
          employee_id: 'EMP-001',
          name: '테스트 간호사',
          available_shifts: ['D', 'E', 'N'],
          created_at: ISO_TIMESTAMP,
          updated_at: ISO_TIMESTAMP,
        },
      ])
      return
    }

    if (url.pathname.endsWith('/shifts')) {
      await jsonResponse(route, [
        {
          id: 'shift-1',
          organization_id: ORGANIZATION_ID,
          code: 'D',
          name: 'Day',
          color_code: '#3b82f6',
          start_time: '09:00:00',
          end_time: '18:00:00',
          created_at: ISO_TIMESTAMP,
        },
        {
          id: 'shift-2',
          organization_id: ORGANIZATION_ID,
          code: 'E',
          name: 'Evening',
          color_code: '#f59e0b',
          start_time: '14:00:00',
          end_time: '22:00:00',
          created_at: ISO_TIMESTAMP,
        },
        {
          id: 'shift-3',
          organization_id: ORGANIZATION_ID,
          code: 'N',
          name: 'Night',
          color_code: '#6366f1',
          start_time: '22:00:00',
          end_time: '08:00:00',
          created_at: ISO_TIMESTAMP,
        },
      ])
      return
    }

    if (url.pathname.endsWith('/sites')) {
      await jsonResponse(route, [
        {
          id: 'site-1',
          organization_id: ORGANIZATION_ID,
          code: 'MAIN',
          name: '본원',
          created_at: ISO_TIMESTAMP,
        },
      ])
      return
    }

    if (url.pathname.endsWith('/organization_settings')) {
      await jsonResponse(route, {
        id: 'settings-1',
        organization_id: ORGANIZATION_ID,
        max_consecutive_night_shifts: 3,
        minimum_rest_hours: {
          D: 24,
          E: 24,
          N: 36,
        },
        work_constraints: {
          weeklyTargetHours: 40,
          weeklyMaxHours: 52,
          weeklyOffDays: 2,
        },
        created_at: ISO_TIMESTAMP,
        updated_at: ISO_TIMESTAMP,
      })
      return
    }

    await jsonResponse(route, [])
  })

  await page.route('**/functions/v1/onboarding-progress', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 200,
        headers: CORS_HEADERS,
        body: '',
      })
      return
    }

    const body = route.request().postDataJSON() as { action?: OnboardingAction }
    const action = body?.action ?? 'get'
    onboardingActions.push(action)

    await jsonResponse(route, createOnboardingPayload(action, scenario))
  })

  return {
    onboardingActions,
  }
}

async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.getByPlaceholder('admin@everyshift.com').fill(email)
  await page.getByPlaceholder('비밀번호 입력').fill('password123')
  await page.getByRole('button', { name: '로그인' }).click()
}

test.describe('onboarding guard / re-entry regression', () => {
  test('E2E-ONB-REG-001 forces incomplete admin into /onboarding after login handoff', async ({
    page,
  }) => {
    const scenario = createScenario('admin_active', {
      currentStepKey: 'organization_info',
      completedStepKeys: [],
      isOnboardingComplete: false,
    })
    const mock = await mockSupabase(page, scenario)

    await login(page, scenario.email)

    await expect(page).toHaveURL(/\/onboarding(?:\?.*)?$/)
    await expect(
      page.getByRole('heading', { name: 'EveryShift 시작 준비를 함께 완료해볼까요?' }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 3, name: '조직 정보와 운영 기준을 확인하세요' }),
    ).toBeVisible()
    expect(mock.onboardingActions.filter((action) => action === 'get').length).toBeGreaterThan(0)
  })

  test('E2E-ONB-REG-002 resumes the same onboarding step after refresh', async ({ page }) => {
    const scenario = createScenario('admin_active', {
      currentStepKey: 'employee_seed',
      completedStepKeys: ['organization_info'],
      isOnboardingComplete: false,
    })
    const mock = await mockSupabase(page, scenario)

    await login(page, scenario.email)

    await expect(page).toHaveURL(/\/onboarding(?:\?.*)?$/)
    await expect(page.getByRole('button', { name: '직원 등록하러 가기' })).toBeVisible()

    await page.reload()

    await expect(page).toHaveURL(/\/onboarding(?:\?.*)?$/)
    await expect(page.getByRole('button', { name: '직원 등록하러 가기' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 3, name: '첫 직원을 등록하세요' })).toBeVisible()
    expect(mock.onboardingActions.filter((action) => action === 'get').length).toBeGreaterThan(1)
  })

  test('E2E-ONB-REG-003 keeps employee-seed re-entry and onboarding return CTA intact', async ({
    page,
  }) => {
    const scenario = createScenario('admin_active', {
      currentStepKey: 'schedule_request',
      completedStepKeys: ['organization_info', 'employee_seed'],
      isOnboardingComplete: false,
    })
    await mockSupabase(page, scenario)

    await login(page, scenario.email)

    await expect(page).toHaveURL(/\/onboarding(?:\?.*)?$/)
    await page.getByRole('button', { name: '직원 등록 다시 열기' }).click()

    await expect(page).toHaveURL(/\/schedule\/step3\?.*step=employee_seed.*entry=manual/)
    await expect(page.locator('[data-test="onboarding-banner"]')).toBeVisible()
    await expect(page.getByText('직원을 1명 이상 저장하면 온보딩으로 돌아가 다음 단계를 진행할 수 있습니다.')).toBeVisible()
    await page.locator('[data-test="onboarding-footer-return"]').click()

    await expect(page).toHaveURL(/\/onboarding(?:\?.*resumeStep=employee_seed.*)?$/)
    await page.getByRole('button', { name: '엑셀 업로드로 시작' }).click()

    await expect(page).toHaveURL(/\/schedule\/step3\?.*step=employee_seed.*entry=excel/)
    await expect(page.locator('[data-test="excel-upload-entry"]')).toBeVisible()
    await expect(
      page
        .locator('[data-test="excel-upload-entry"]')
        .getByText('엑셀 파일로 직원을 한 번에 등록할 수 있습니다. 업로드 후 저장이 완료되면 온보딩으로 돌아가세요.'),
    ).toBeVisible()
  })

  test('E2E-ONB-REG-004 denies completed admin access to /onboarding', async ({ page }) => {
    const scenario = createScenario('admin_active', {
      currentStepKey: null,
      completedStepKeys: ['organization_info', 'employee_seed', 'schedule_request'],
      isOnboardingComplete: true,
    })
    await mockSupabase(page, scenario)

    await login(page, scenario.email)

    await expect(page).not.toHaveURL(/\/onboarding(?:\?.*)?$/)
    await page.goto('/onboarding')
    await expect(page).not.toHaveURL(/\/onboarding(?:\?.*)?$/)
    await expect(
      page.getByRole('heading', { name: 'EveryShift 시작 준비를 함께 완료해볼까요?' }),
    ).toHaveCount(0)
  })

  test('E2E-ONB-REG-005 keeps pending precedence ahead of onboarding evaluation', async ({
    page,
  }) => {
    const scenario = createScenario('admin_pending', null)
    const mock = await mockSupabase(page, scenario)

    await login(page, scenario.email)

    await expect(page).toHaveURL(/\/access\/pending(?:\?.*)?$/)
    await expect(page.getByText('관리자 가입 요청이 접수되었습니다. superuser 승인 완료 후 다시 로그인해 주세요.')).toBeVisible()

    await page.goto('/onboarding')

    await expect(page).toHaveURL(/\/access\/pending(?:\?.*)?$/)
    await expect(
      page.getByRole('heading', { name: 'EveryShift 시작 준비를 함께 완료해볼까요?' }),
    ).toHaveCount(0)
    expect(mock.onboardingActions).toEqual([])
  })
})
