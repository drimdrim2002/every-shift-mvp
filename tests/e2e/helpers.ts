import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, type Locator, type Page, type Route } from '@playwright/test'

type TestCredentials = {
  email: string
  password: string
}

type DayRequirement = {
  dayOfWeek: number
  D?: number
  E?: number
  N?: number
}

type ExistingScheduleOptions = {
  month?: string | null
  preferCompleted?: boolean
}

const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
const supabaseCorsHeaders = {
  'access-control-allow-origin': 'http://127.0.0.1:5173',
  'access-control-allow-headers': 'apikey, authorization, content-type, prefer, range, x-client-info',
  'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
  'access-control-max-age': '86400',
}

type MockRbacAccessState = 'super_active' | 'user_active'

type MockOrganizationRow = {
  id: string
  name: string
  type: string
  created_at?: string
  updated_at?: string
}

type MockEmployeeRow = {
  id: string
  organization_id: string
  employee_id: string
  name: string
  available_shifts: string[]
  created_at?: string
  updated_at?: string
}

type MockShiftRow = {
  id: string
  organization_id: string
  code: string
  name: string
  color_code: string
  start_time: string | null
  end_time: string | null
  created_at?: string
}

type MockRbacFixture = {
  profile: {
    global_role: 'super' | 'user'
    account_status: 'active'
    organization_id: string | null
    role: 'admin' | 'user' | null
    status: 'active' | null
  }
  memberships: Array<{
    id: string
    organization_id: string
    role: 'admin' | 'user'
    status: 'approved'
    approved_at: string
    created_at: string
    rejection_reason: null
  }>
  organizations: MockOrganizationRow[]
  employeesByOrganizationId: Record<string, MockEmployeeRow[]>
  shiftsByOrganizationId: Record<string, MockShiftRow[]>
}

type PlaywrightStorageState = {
  origins?: Array<{
    origin: string
    localStorage: Array<{
      name: string
      value: string
    }>
  }>
}

type PlaywrightSupabaseUser = {
  id: string
  aud: 'authenticated'
  role: 'authenticated'
  email: string
  email_confirmed_at: string
  phone: string
  confirmed_at: string
  app_metadata: Record<string, unknown>
  user_metadata: Record<string, unknown>
  identities: unknown[]
  created_at: string
  updated_at: string
  is_anonymous: false
}

type PlaywrightSupabaseSession = {
  access_token: string
  token_type: 'bearer'
  expires_in: number
  expires_at: number
  refresh_token: string
  user: PlaywrightSupabaseUser
  weak_password: null
}

function buildOrgId(index: number) {
  return `org-${index}`
}

function getSupabaseProjectRef() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim()
  if (supabaseUrl) {
    const match = supabaseUrl.match(/^https?:\/\/([^.]+)\.supabase\.co\/?$/)
    if (match?.[1]) {
      return match[1]
    }
  }

  const authStatePath = resolve(process.cwd(), 'playwright/.auth/user.json')
  const fallbackAuthState = JSON.parse(readFileSync(authStatePath, 'utf8')) as PlaywrightStorageState
  const originState = fallbackAuthState.origins?.find((origin) => origin.origin === 'http://127.0.0.1:5173')
  const authEntry = originState?.localStorage?.find((entry) => entry.name.endsWith('-auth-token'))
  const storageKey = authEntry?.name ?? 'sb-vjmerqaxguovnojinxfq-auth-token'
  const prefix = storageKey.startsWith('sb-') ? storageKey.slice(3) : storageKey
  const projectRef = prefix.endsWith('-auth-token') ? prefix.slice(0, -12) : prefix
  return projectRef || 'vjmerqaxguovnojinxfq'
}

function getSupabaseAuthStorageKey() {
  return `sb-${getSupabaseProjectRef()}-auth-token`
}

function base64UrlEncode(input: string) {
  return Buffer.from(input, 'utf8').toString('base64url')
}

function createFakeSupabaseAccessToken(user: PlaywrightSupabaseUser, expiresAt: number) {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  }
  const payload = {
    iss: `https://${getSupabaseProjectRef()}.supabase.co/auth/v1`,
    sub: user.id,
    aud: user.aud,
    exp: expiresAt,
    iat: expiresAt - 60 * 60 * 24 * 30,
    email: user.email,
    phone: user.phone,
    app_metadata: user.app_metadata,
    user_metadata: user.user_metadata,
    role: user.role,
    aal: 'aal1',
    amr: [{ method: 'password', timestamp: expiresAt - 60 * 60 * 24 * 30 }],
    session_id: `session-${user.id}`,
    is_anonymous: false,
  }

  return `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}.signature`
}

function buildFreshSupabaseAuthState() {
  const storageEntries = loadPlaywrightAuthStorageEntries()
  if (storageEntries.length === 0) {
    throw new Error('Playwright auth storage state is missing.')
  }

  const authEntry = storageEntries.find((entry) => entry.name.endsWith('-auth-token'))
  if (!authEntry) {
    throw new Error('Playwright auth storage state is missing the Supabase auth token.')
  }

  const parsedSession = JSON.parse(authEntry.value) as {
    user?: Partial<PlaywrightSupabaseUser>
  }

  const now = new Date()
  const expiresAt = Math.floor((now.getTime() + 1000 * 60 * 60 * 24 * 30) / 1000)
  const user: PlaywrightSupabaseUser = {
    id: parsedSession.user?.id ?? '3f7416de-3713-40ad-bac4-6e87c20b369c',
    email: parsedSession.user?.email ?? 'sindeaf@gmail.com',
    aud: 'authenticated',
    role: 'authenticated',
    email_confirmed_at: parsedSession.user?.email_confirmed_at ?? now.toISOString(),
    phone: parsedSession.user?.phone ?? '',
    confirmed_at: parsedSession.user?.confirmed_at ?? now.toISOString(),
    app_metadata: parsedSession.user?.app_metadata ?? {},
    user_metadata: parsedSession.user?.user_metadata ?? {},
    identities: parsedSession.user?.identities ?? [],
    created_at: parsedSession.user?.created_at ?? now.toISOString(),
    updated_at: parsedSession.user?.updated_at ?? now.toISOString(),
    is_anonymous: false,
  }

  const session: PlaywrightSupabaseSession = {
    access_token: createFakeSupabaseAccessToken(user, expiresAt),
    token_type: 'bearer',
    expires_in: 60 * 60 * 24 * 30,
    expires_at: expiresAt,
    refresh_token: `refresh-${user.id}-${expiresAt}`,
    user,
    weak_password: null,
  }

  return {
    storageKey: getSupabaseAuthStorageKey(),
    session,
  }
}

function buildRbacFixture(accessState: MockRbacAccessState): MockRbacFixture {
  if (accessState === 'super_active') {
    const organizations = [
      {
        id: buildOrgId(1),
        name: '서버 병원',
        type: 'hospital',
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z',
      },
      {
        id: buildOrgId(2),
        name: '동부 병원',
        type: 'hospital',
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z',
      },
    ]

    return {
      profile: {
        global_role: 'super',
        account_status: 'active',
        organization_id: null,
        role: null,
        status: null,
      },
      memberships: organizations.map((organization, index) => ({
        id: `membership-${index + 1}`,
        organization_id: organization.id,
        role: 'admin',
        status: 'approved',
        approved_at: '2026-04-01T00:00:00Z',
        created_at: '2026-04-01T00:00:00Z',
        rejection_reason: null,
      })),
      organizations,
      employeesByOrganizationId: {
        [buildOrgId(1)]: [
          {
            id: 'employee-1',
            organization_id: buildOrgId(1),
            employee_id: 'E001',
            name: '김 간호사',
            available_shifts: ['D', 'E', 'N'],
          },
        ],
        [buildOrgId(2)]: [
          {
            id: 'employee-2',
            organization_id: buildOrgId(2),
            employee_id: 'E101',
            name: '이 간호사',
            available_shifts: ['D', 'E', 'N'],
          },
        ],
      },
      shiftsByOrganizationId: {
        [buildOrgId(1)]: [
          {
            id: 'shift-1',
            organization_id: buildOrgId(1),
            code: 'D',
            name: 'Day',
            color_code: '#2563eb',
            start_time: '09:00:00',
            end_time: '18:00:00',
          },
        ],
        [buildOrgId(2)]: [
          {
            id: 'shift-2',
            organization_id: buildOrgId(2),
            code: 'D',
            name: 'Day',
            color_code: '#059669',
            start_time: '08:00:00',
            end_time: '17:00:00',
          },
        ],
      },
    }
  }

  return {
    profile: {
      global_role: 'user',
      account_status: 'active',
      organization_id: buildOrgId(1),
      role: 'user',
      status: 'active',
    },
    memberships: [
      {
        id: 'membership-1',
        organization_id: buildOrgId(1),
        role: 'user',
        status: 'approved',
        approved_at: '2026-04-01T00:00:00Z',
        created_at: '2026-04-01T00:00:00Z',
        rejection_reason: null,
      },
    ],
    organizations: [
      {
        id: buildOrgId(1),
        name: '서버 병원',
        type: 'hospital',
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z',
      },
    ],
    employeesByOrganizationId: {
      [buildOrgId(1)]: [
        {
          id: 'employee-1',
          organization_id: buildOrgId(1),
          employee_id: 'E001',
          name: '김 간호사',
          available_shifts: ['D', 'E', 'N'],
        },
      ],
    },
    shiftsByOrganizationId: {
      [buildOrgId(1)]: [
        {
          id: 'shift-1',
          organization_id: buildOrgId(1),
          code: 'D',
          name: 'Day',
          color_code: '#2563eb',
          start_time: '09:00:00',
          end_time: '18:00:00',
        },
      ],
    },
  }
}

function getFilterValue(searchParams: URLSearchParams, key: string): string | null {
  const rawValue = searchParams.get(key)
  if (!rawValue) {
    return null
  }

  return rawValue.startsWith('eq.') ? rawValue.slice(3) : rawValue
}

function buildCorsHeaders() {
  return supabaseCorsHeaders
}

function loadPlaywrightAuthStorageEntries() {
  const authStatePath = resolve(process.cwd(), 'playwright/.auth/user.json')
  const authState = JSON.parse(readFileSync(authStatePath, 'utf8')) as PlaywrightStorageState
  const originState = authState.origins?.find((origin) => origin.origin === 'http://127.0.0.1:5173')
  return originState?.localStorage ?? []
}

export async function seedPlaywrightAuthState(page: Page) {
  const { storageKey, session } = buildFreshSupabaseAuthState()

  await page.addInitScript((entryName, session) => {
    window.localStorage.setItem(entryName, JSON.stringify(session))
  }, storageKey, session)
}

async function fulfillJson(
  route: Route,
  body: unknown,
  status = 200,
) {
  await route.fulfill({
    status,
    headers: {
      ...buildCorsHeaders(),
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

export async function seedScheduleWizardContext(
  page: Page,
  params: {
    organizationId: string
    organizationName: string
    organizationType: string
    month: string
    employeeCount?: number
    scheduleId?: string | null
    schedulePublicId?: string | null
  }
) {
  const { session } = buildFreshSupabaseAuthState()

  await page.evaluate((payload) => {
    const userId = payload.userId
    const wizardContextKey = `everyshift_wizard_context_v2:${userId}`
    const nextContext = {
      schemaVersion: 2,
      ownerUserId: userId,
      ownerOrganizationId: payload.organizationId,
      context: {
        basicInfo: {
          month: payload.month,
          organizationId: payload.organizationId,
          organizationName: payload.organizationName,
          organizationType: payload.organizationType,
          employeeCount: payload.employeeCount ?? 0,
          shifts: [],
          ...(payload.scheduleId ? { scheduleId: payload.scheduleId } : {}),
          ...(payload.schedulePublicId ? { schedulePublicId: payload.schedulePublicId } : {}),
        },
        selectedVersionId: null,
        previewVersionId: null,
        currentStep: 1,
      },
    }

    window.localStorage.setItem(wizardContextKey, JSON.stringify(nextContext))
  }, { ...params, userId: session.user.id })
}

export async function seedSelectedOrganization(page: Page, organizationId: string) {
  const { session } = buildFreshSupabaseAuthState()
  const selectedOrganizationKey = `everyshift:selected-organization:${session.user.id}`

  await page.evaluate(
    ({ storageKey, value }) => {
      window.localStorage.setItem(storageKey, value)
    },
    {
      storageKey: selectedOrganizationKey,
      value: organizationId,
    },
  )
}

export async function mockRbacContext(page: Page, accessState: MockRbacAccessState) {
  const fixture = buildRbacFixture(accessState)
  const { session } = buildFreshSupabaseAuthState()

  await page.addInitScript((entryName, authSession) => {
    window.localStorage.setItem(entryName, JSON.stringify(authSession))
  }, getSupabaseAuthStorageKey(), session)

  await page.route('**/functions/v1/approval-read/**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: buildCorsHeaders() })
      return
    }

    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/queue')) {
      await fulfillJson(route, { items: [] })
      return
    }

    if (url.pathname.endsWith('/request')) {
      await fulfillJson(route, { request: null })
      return
    }

    await fulfillJson(route, { items: [] })
  })

  await page.route('**/auth/v1/**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: buildCorsHeaders() })
      return
    }

    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/user')) {
      await fulfillJson(route, session.user)
      return
    }

    if (url.pathname.endsWith('/token') && url.searchParams.get('grant_type') === 'refresh_token') {
      await fulfillJson(route, session)
      return
    }

    await fulfillJson(route, { user: session.user })
  })

  await page.route('**/rest/v1/**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: buildCorsHeaders() })
      return
    }

    const url = new URL(route.request().url())
    const table = url.pathname.split('/rest/v1/')[1]?.split('/')[0]

    switch (table) {
      case 'profiles':
        await fulfillJson(route, fixture.profile)
        return
      case 'organization_memberships':
        await fulfillJson(route, fixture.memberships)
        return
      case 'signup_requests':
        await fulfillJson(route, null)
        return
      case 'organizations': {
        const organizationId = getFilterValue(url.searchParams, 'id')
        const organizations = organizationId
          ? fixture.organizations.filter((organization) => organization.id === organizationId)
          : fixture.organizations
        await fulfillJson(route, organizations)
        return
      }
      case 'employees': {
        const organizationId = getFilterValue(url.searchParams, 'organization_id')
        await fulfillJson(route, organizationId ? fixture.employeesByOrganizationId[organizationId] ?? [] : [])
        return
      }
      case 'shifts': {
        const organizationId = getFilterValue(url.searchParams, 'organization_id')
        await fulfillJson(route, organizationId ? fixture.shiftsByOrganizationId[organizationId] ?? [] : [])
        return
      }
      default:
        await fulfillJson(route, [])
    }
  })

  return fixture
}

export async function selectOrganization(page: Page, organizationLabel: string) {
  const switcher = page.getByTestId('organization-switcher')
  await expect(switcher).toBeVisible()
  const currentValue = (await switcher.textContent())?.trim() ?? ''
  if (currentValue.includes(organizationLabel)) {
    return
  }

  await switcher.click()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(switcher).toContainText(organizationLabel)
}

export function getRequiredTestCredentials(): TestCredentials {
  const email = process.env.TEST_USER_EMAIL?.trim()
  const password = process.env.TEST_USER_PASSWORD?.trim()

  if (!email || !password) {
    throw new Error(
      'Missing TEST_USER_EMAIL or TEST_USER_PASSWORD. Set them in the environment or .env.test before running Playwright.'
    )
  }

  return { email, password }
}

export async function login(page: Page, credentials = getRequiredTestCredentials()) {
  await page.goto('/login')
  await expect(page).toHaveURL(/\/login$/)

  await page
    .locator('[data-test="login-email"] input, input[placeholder="admin@everyshift.com"]')
    .first()
    .fill(credentials.email)
  await page
    .locator('[data-test="login-password"] input, input[type="password"]')
    .first()
    .fill(credentials.password)
  await page
    .locator('[data-test="login-submit"], button:has-text("로그인")')
    .first()
    .click()

  await waitForDashboard(page)
}

export async function waitForDashboard(page: Page) {
  await page.waitForURL((url) => url.pathname === '/')
  await expect(page.getByRole('heading', { name: '근무표 관리', exact: true })).toBeVisible()
  await page.waitForLoadState('networkidle')
}

export async function startNewScheduleFromDashboard(page: Page) {
  await page.goto('/')
  await waitForDashboard(page)
  await waitForDashboardScheduleState(page)

  const existingMonths = (await getDashboardScheduleMonthLabels(page).allTextContents())
    .map(normalizeScheduleMonth)
    .filter(Boolean)
  const existingMonthSet = new Set(existingMonths)

  await page
    .locator(
      '[data-test="dashboard-create-schedule"], button:has-text("새 근무표 생성"), button:has-text("첫 근무표 생성하기")'
    )
    .first()
    .click()

  const monthSelect = page.locator('[data-test="dashboard-month-select"], .n-base-selection').last()
  await expect(monthSelect).toBeVisible()
  await monthSelect.click()

  const optionLocator = page.locator('.n-base-select-option')
  await expect(optionLocator.first()).toBeVisible()

  const optionTexts = (await optionLocator.allTextContents())
    .map((text) => text.trim())
    .filter(Boolean)
  const targetMonth = optionTexts.find((month) => !existingMonthSet.has(month))

  if (targetMonth) {
    await optionLocator.filter({ hasText: targetMonth }).first().click()
    await page.getByRole('button', { name: '확인' }).click()

    await page.waitForURL(/\/schedule\/step1$/)
    await expect(page.getByText('근무표 생성 - 기본 정보 설정')).toBeVisible()
    return targetMonth
  }

  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '취소' }).click()

  const reusableMonth = existingMonths.find((month) => month !== (process.env.TEST_REVIEW_HUB_MONTH?.trim() || '2026-03'))
  if (!reusableMonth) {
    throw new Error(
      `No unused schedule month is available and no reusable editable month was found. Existing months: ${existingMonths.join(', ')}`
    )
  }

  const reusableIndex = existingMonths.indexOf(reusableMonth)
  await page.getByRole('button', { name: '수정' }).nth(reusableIndex).click()
  await page.waitForURL(/\/schedule\/step1$/)
  await expect(page.getByText('근무표 생성 - 기본 정보 설정')).toBeVisible()
  return reusableMonth
}

export async function openExistingScheduleFromDashboard(
  page: Page,
  options: ExistingScheduleOptions = {}
) {
  await page.goto('/')
  await waitForDashboard(page)
  await waitForDashboardScheduleState(page)

  const { month = null, preferCompleted = true } = options
  const targetCard = await resolveExistingScheduleCard(page, month, preferCompleted)

  await targetCard.click()
  await page.waitForURL(/\/schedule\/step5\/.+/)

  return page.url()
}

async function resolveExistingScheduleCard(
  page: Page,
  month: string | null,
  preferCompleted: boolean
) {
  const scheduleMonthLabels = getDashboardScheduleMonthLabels(page)
  const availableTitles = (await scheduleMonthLabels.allTextContents()).map(normalizeScheduleMonth)

  if (month) {
    const matched = scheduleMonthLabels.filter({ hasText: `${month} 근무표` }).first()
    if ((await matched.count()) === 0) {
      throw new Error(
        `Could not find schedule month ${month}. Available months: ${availableTitles.join(', ')}`
      )
    }
    return matched
  }

  if (preferCompleted) {
    const completed = page
      .locator('[data-test="schedule-card"], .n-card')
      .filter({ hasText: '완료' })
      .locator('[data-test="schedule-card-month"], h3')
      .first()
    if ((await completed.count()) > 0) {
      return completed
    }
  }

  const firstCard = scheduleMonthLabels.first()
  if ((await firstCard.count()) === 0) {
    throw new Error('No schedule card is available on the dashboard.')
  }
  return firstCard
}

function getDashboardScheduleMonthLabels(page: Page): Locator {
  return page.locator('[data-test="schedule-card-month"], h3').filter({ hasText: '근무표' })
}

async function waitForDashboardScheduleState(page: Page) {
  const scheduleMonthLabels = getDashboardScheduleMonthLabels(page)
  const emptyState = page.getByText('생성된 근무표가 없습니다')

  await Promise.any([
    scheduleMonthLabels.first().waitFor({ state: 'visible', timeout: 10_000 }),
    emptyState.waitFor({ state: 'visible', timeout: 10_000 }),
  ]).catch(() => undefined)
}

function normalizeScheduleMonth(text: string) {
  return text.replace(' 근무표', '').trim()
}

export async function completeStep1(page: Page) {
  await expect(page.getByText('근무표 생성 - 기본 정보 설정')).toBeVisible()
  await expect(page.getByText('계획월:')).toBeVisible()

  await page.getByRole('button', { name: /다음 단계/ }).click()
  await page.waitForURL(/\/schedule\/step2$/)
}

export async function completeStep2(page: Page, requirements: DayRequirement[]) {
  await expect(page.getByText('근무표 생성 - 요일별 인력 설정')).toBeVisible()

  for (const requirement of requirements) {
    const row = page.locator('tr').filter({ hasText: dayNames[requirement.dayOfWeek] }).first()
    await expect(row).toBeVisible()

    const inputValues = [requirement.D, requirement.E, requirement.N]
    for (const [index, value] of inputValues.entries()) {
      if (typeof value !== 'number') {
        continue
      }

      await row.locator('input').nth(index).fill(String(value))
    }
  }

  await page.getByRole('button', { name: /다음 단계/ }).click()
  await page.waitForURL(/\/schedule\/step3$/)
}

export async function completeStep3Employees(page: Page) {
  await expect(page.getByText('근무표 생성 - 직원 정보 입력')).toBeVisible()
  await page.getByRole('button', { name: /다음 단계/ }).click()
  await page.waitForURL(/\/schedule\/step4$/)
}

export async function completeStep4InitialData(
  page: Page,
  assignments: {
    rowIndex: number
    colIndex: number
    shift: 'O'
  }[]
) {
  await page.waitForURL(/\/schedule\/step4$/)
  await expect(page.getByText(/월 근무 조정 일정 입력/)).toBeVisible()
  await expect(page.locator('table').first()).toBeVisible()

  for (const assignment of assignments) {
    const row = page.locator('tbody tr').nth(assignment.rowIndex)
    const cell = row.locator('.constraint-selector').nth(assignment.colIndex)
    await cell.click()
    await expect(cell).toContainText(assignment.shift)
  }

  await page.waitForTimeout(500)
}

export async function goToStep5(page: Page, timeout = 30000) {
  await page.getByRole('button', { name: /다음 단계/ }).click()
  await page.waitForURL(/\/schedule\/step5\/.+/, { timeout })
}

export async function verifyStep5ReviewHub(page: Page) {
  await expect(page.getByText('근무표 생성 - 결과 확인')).toBeVisible()
  await expect(page.getByTestId('version-compare-surface')).toBeVisible()
  await expect(page.getByTestId('review-tab-grid')).toBeVisible()
  await expect(page.getByTestId('review-tab-proof')).toBeVisible()
  await expect(page.getByTestId('review-tab-offRequests')).toBeVisible()
  return page.getByTestId('version-compare-surface').isVisible()
}

export async function getTempScheduleFromStorage(page: Page) {
  const localStorage = await page.evaluate(() => {
    const scopedKey = Object.keys(window.localStorage).find((key) =>
      key.startsWith('everyshift_temp_preferences_v2:')
    )
    if (scopedKey) {
      return window.localStorage.getItem(scopedKey)
    }

    return window.localStorage.getItem('everyshift_temp_schedule')
  })

  return localStorage ? JSON.parse(localStorage) : null
}

export async function clearLocalStorage(page: Page) {
  await page.evaluate(() => {
    window.localStorage.clear()
  })
}

export async function getCellShift(page: Page, rowIndex: number, colIndex: number) {
  const row = page.locator('tbody tr').nth(rowIndex)
  const cell = row.locator('.constraint-selector').nth(colIndex)

  return cell.textContent()
}

export async function getErrorMessage(page: Page) {
  try {
    await page.waitForSelector('.n-message', { timeout: 5000 })
    return page.locator('.n-message').textContent()
  } catch {
    return null
  }
}
