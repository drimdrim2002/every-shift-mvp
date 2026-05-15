import { mount, flushPromises } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildCanonicalStep5RouteLocation,
  getAppHomeRoutePath,
  getScheduleStepRoutePath,
} from '@/constants/routes'
import type { ScheduleSummary } from '@/api/schedule'

const {
  pushMock,
  replaceMock,
  getScheduleListMock,
  getPhase2ScheduleCompareMock,
  getChecklistMock,
  loadCanonicalSiteRequirementsMock,
  resetMock,
  setBasicInfoMock,
  setSiteRequirementsMock,
  setSelectedVersionIdMock,
  setPreviewVersionIdMock,
  showErrorMock,
  showWarningMock,
  supabaseFromMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  getScheduleListMock: vi.fn(),
  getPhase2ScheduleCompareMock: vi.fn(),
  getChecklistMock: vi.fn(),
  loadCanonicalSiteRequirementsMock: vi.fn(),
  resetMock: vi.fn(),
  setBasicInfoMock: vi.fn(),
  setSiteRequirementsMock: vi.fn(),
  setSelectedVersionIdMock: vi.fn(),
  setPreviewVersionIdMock: vi.fn(),
  showErrorMock: vi.fn(),
  showWarningMock: vi.fn(),
  supabaseFromMock: vi.fn(),
}))

const routeState = reactive({
  path: '/',
  query: {} as Record<string, unknown>,
})

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
}))

vi.mock('@/api/schedule', () => ({
  getScheduleList: getScheduleListMock,
  getPhase2ScheduleCompare: getPhase2ScheduleCompareMock,
}))

vi.mock('@/api/ops', () => ({
  getChecklist: getChecklistMock,
}))

vi.mock('@/api/employee', () => ({
  loadCanonicalSiteRequirements: loadCanonicalSiteRequirementsMock,
}))

vi.mock('@/api/supabase', () => ({
  supabase: {
    from: supabaseFromMock,
  },
}))

vi.mock('@/utils/message', () => ({
  showError: showErrorMock,
  showWarning: showWarningMock,
}))

const organizationStoreMock = reactive({
  current: {
    id: 'org-1',
    name: '서울병원',
    type: 'hospital',
    foundation: null,
  },
  shifts: [
    {
      id: 'shift-1',
      code: 'D',
      name: 'Day',
      colorCode: '#123456',
      startTime: '09:00:00',
      endTime: '18:00:00',
    },
  ],
  employees: [
    {
      id: 'emp-1',
      name: 'Kim',
    },
  ],
  foundationProfile: null,
  foundationSite: null,
  foundationLoading: false,
  loadOrganization: vi.fn(),
  loadFoundationData: vi.fn(),
})

const scheduleStoreMock = reactive({
  reset: resetMock,
  setBasicInfo: setBasicInfoMock,
  setSiteRequirements: setSiteRequirementsMock,
  setSelectedVersionId: setSelectedVersionIdMock,
  setPreviewVersionId: setPreviewVersionIdMock,
  currentStep: 0,
})

const rbacStoreMock = reactive({
  selectedOrganizationId: 'org-1',
  abilities: {
    canViewApprovalQueue: false,
    canSwitchOrganization: true,
    canViewRestrictedUserHome: false,
    canManageOrganizationSetup: true,
    canManageEmployees: true,
    canManageSchedules: true,
  },
})

vi.mock('@/stores/organization', () => ({
  useOrganizationStore: () => organizationStoreMock,
}))

vi.mock('@/stores/rbac', () => ({
  useRbacStore: () => rbacStoreMock,
}))

vi.mock('@/stores/schedule', () => ({
  useScheduleStore: () => scheduleStoreMock,
}))

import Dashboard from '@/views/Dashboard.vue'

function createWrapper() {
  return mount(Dashboard, {
    global: {
      stubs: {
        NCard: {
          template:
            '<div class="n-card-stub" v-bind="$attrs" @click="$emit(\'click\')"><slot name="header" /><slot /></div>',
        },
        NButton: {
          template:
            '<button v-bind="$attrs" @click="$emit(\'click\', $event)"><slot name="icon" /><slot /></button>',
        },
        NSpin: {
          template: '<div v-bind="$attrs"><slot /></div>',
        },
        NBadge: {
          template: '<div v-bind="$attrs"><slot /></div>',
        },
        NEmpty: {
          template: '<div v-bind="$attrs"><slot /><slot name="extra" /></div>',
        },
        NTag: {
          template: '<span v-bind="$attrs"><slot /></span>',
        },
        NModal: {
          props: ['show'],
          template: '<div v-if="show" v-bind="$attrs"><slot /></div>',
        },
        NForm: {
          template: '<form v-bind="$attrs"><slot /></form>',
        },
        NFormItem: {
          template: '<div v-bind="$attrs"><slot /></div>',
        },
        NDatePicker: {
          name: 'NDatePicker',
          props: [
            'formattedValue',
            'type',
            'format',
            'valueFormat',
            'isDateDisabled',
            'placeholder',
          ],
          template:
            '<input data-test="dashboard-month-picker" :value="formattedValue" @input="$emit(\'update:formattedValue\', $event.target.value)" />',
        },
      },
    },
  })
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })

  return {
    promise,
    resolve,
    reject,
  }
}

type ChecklistItemStatus = 'ready' | 'blocked'

type ChecklistItemKey =
  | 'organization_profile'
  | 'schedule_foundation'
  | 'employee_roster'
  | 'off_request_policy'
  | 'schedule_review'

interface ChecklistFixtureItem {
  key: ChecklistItemKey
  title: string
  status: ChecklistItemStatus
  route: string | null
  blockedReason: string | null
  isOptional: boolean
}

const checklistItemFixtures: Record<ChecklistItemKey, ChecklistFixtureItem> = {
  organization_profile: {
    key: 'organization_profile',
    title: '병원 정보 확인',
    status: 'ready',
    route: '/ops/organization-setup',
    blockedReason: null,
    isOptional: false,
  },
  schedule_foundation: {
    key: 'schedule_foundation',
    title: '기준 장소와 근무 기준 설정',
    status: 'ready',
    route: '/schedule/step2',
    blockedReason: null,
    isOptional: false,
  },
  employee_roster: {
    key: 'employee_roster',
    title: '직원 로스터 준비',
    status: 'ready',
    route: '/schedule/step3',
    blockedReason: null,
    isOptional: false,
  },
  off_request_policy: {
    key: 'off_request_policy',
    title: 'Off 사용 기준 설정',
    status: 'ready',
    route: '/ops/off-request-policy-setup',
    blockedReason: null,
    isOptional: true,
  },
  schedule_review: {
    key: 'schedule_review',
    title: '최종 검토 진입',
    status: 'ready',
    route: '/schedule/step5/sch_a1b2c3d4e5f6',
    blockedReason: null,
    isOptional: false,
  },
}

function buildChecklistFixture(
  overrides: Partial<Record<ChecklistItemKey, Partial<ChecklistFixtureItem>>> = {},
  options: {
    checklistCursor?: ChecklistItemKey
    organizationId?: string
    ready?: boolean
    omitKeys?: ChecklistItemKey[]
  } = {}
) {
  const omittedKeys = new Set(options.omitKeys ?? [])
  const items = Object.values(checklistItemFixtures)
    .filter((item) => !omittedKeys.has(item.key))
    .map((item) => ({
      ...item,
      ...(overrides[item.key] ?? {}),
    }))

  return {
    organizationId: options.organizationId ?? 'org-1',
    checklistCursor: options.checklistCursor ?? 'schedule_review',
    ready: options.ready ?? items.every((item) => item.isOptional || item.status === 'ready'),
    items,
    fairnessSummary: [],
  }
}

function createReadyChecklist(options: { organizationId?: string } = {}) {
  return buildChecklistFixture({}, { organizationId: options.organizationId, ready: true })
}

function createScheduleSummary(overrides: Partial<ScheduleSummary> = {}): ScheduleSummary {
  return {
    id: 'schedule-1',
    public_id: 'sch_a1b2c3d4e5f6',
    organization_id: 'org-1',
    month: '2026-05',
    status: 'complete',
    hard_score: 0,
    soft_score: 0,
    solver_execution_id: null,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-02T00:00:00.000Z',
    ...overrides,
  }
}

async function clickPrimaryAction(wrapper: ReturnType<typeof createWrapper>) {
  await wrapper.get('[data-test="dashboard-primary-action"]').trigger('click')
  await flushPromises()
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-15T09:00:00+09:00'))
    routeState.path = getAppHomeRoutePath()
    routeState.query = {}
    replaceMock.mockImplementation(async (location: { path?: string; query?: Record<string, unknown> }) => {
      routeState.path = location.path ?? routeState.path
      routeState.query = location.query ?? {}
    })
    organizationStoreMock.current = {
      id: 'org-1',
      name: '서울병원',
      type: 'hospital',
      foundation: null,
    }
    organizationStoreMock.foundationProfile = null
    organizationStoreMock.foundationSite = null
    organizationStoreMock.foundationLoading = false
    organizationStoreMock.loadOrganization.mockResolvedValue({ success: true })
    organizationStoreMock.loadFoundationData.mockResolvedValue({ success: true })
    scheduleStoreMock.currentStep = 0
    Object.assign(rbacStoreMock.abilities, {
      canViewApprovalQueue: false,
      canSwitchOrganization: true,
      canViewRestrictedUserHome: false,
      canManageOrganizationSetup: true,
      canManageEmployees: true,
      canManageSchedules: true,
    })
    rbacStoreMock.selectedOrganizationId = 'org-1'
    getScheduleListMock.mockResolvedValue([
      createScheduleSummary({
        id: 'schedule-123',
        public_id: 'sch_a1b2c3d4e5f6',
        month: '2025-12',
        hard_score: 10,
        soft_score: 20,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      }),
    ])
    getChecklistMock.mockResolvedValue(createReadyChecklist())
    loadCanonicalSiteRequirementsMock.mockResolvedValue([
      {
        dayOfWeek: 1,
        dayName: '월요일',
        shiftCode: 'D',
        requiredCount: 1,
      },
    ])
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-123',
      schedulePublicId: 'sch_a1b2c3d4e5f6',
      organizationId: 'org-1',
      month: '2025-12',
      selectedVersionId: 'version-2',
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
          status: 'draft',
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
          isSelected: false,
          isFinalized: false,
        },
        {
          id: 'version-2',
          scheduleId: 'schedule-123',
          versionNo: 2,
          name: 'V2',
          sourceType: 're_solve',
          baseVersionId: 'version-1',
          status: 'review_ready',
          currentRevision: 2,
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
          isSelected: true,
          isFinalized: false,
        },
      ],
    })
    supabaseFromMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the operational briefing instead of legacy dashboard sections when ready', async () => {
    getChecklistMock.mockResolvedValue(createReadyChecklist())
    getScheduleListMock.mockResolvedValue([
      createScheduleSummary({ id: 'schedule-1', month: '2026-05', status: 'complete' }),
    ])

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="dashboard-next-action"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="dashboard-operational-status"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="dashboard-recent-schedule"]').exists()).toBe(true)
    const operationalStatusText = wrapper.get('[data-test="dashboard-operational-status"]').text()
    expect(operationalStatusText).not.toContain('생성 중 근무표')
    expect(operationalStatusText).not.toContain('확인 필요')
    expect(wrapper.find('[data-test="dashboard-basic-info-section"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="dashboard-create-section"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-test="schedule-card"]')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('수정')
    expect(wrapper.text()).not.toContain('삭제')
  })

  it('routes to schedule results from the full-list action with text distinct from the primary CTA', async () => {
    getChecklistMock.mockResolvedValue(createReadyChecklist())
    getScheduleListMock.mockResolvedValue([
      createScheduleSummary({ id: 'schedule-1', month: '2026-05', status: 'complete' }),
    ])

    const wrapper = createWrapper()
    await flushPromises()

    const primaryAction = wrapper.get('[data-test="dashboard-primary-action"]')
    const fullListAction = wrapper.get('[data-test="dashboard-view-all-schedules"]')
    expect(primaryAction.text()).not.toBe(fullListAction.text())

    await fullListAction.trigger('click')
    await flushPromises()

    expect(pushMock).toHaveBeenCalledWith('/app/schedule-results')
  })

  it('prioritizes schedule-list retry over creating a new schedule', async () => {
    getChecklistMock.mockResolvedValue(createReadyChecklist())
    getScheduleListMock.mockRejectedValue(new Error('schedule list failed'))

    const wrapper = createWrapper()
    await flushPromises()

    const primaryAction = wrapper.get('[data-test="dashboard-primary-action"]')
    expect(primaryAction.text()).toContain('다시 불러오기')
    expect(primaryAction.text()).not.toContain('새 근무표 생성')

    await clickPrimaryAction(wrapper)
    expect(getScheduleListMock).toHaveBeenCalledTimes(2)
  })

  it('keeps briefing visible with a section-local spinner while schedules are still loading', async () => {
    const schedulesDeferred = createDeferred<ScheduleSummary[]>()
    getChecklistMock.mockResolvedValue(createReadyChecklist())
    getScheduleListMock.mockReturnValue(schedulesDeferred.promise)

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="dashboard-ops-readiness-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="dashboard-next-action"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="dashboard-operational-status"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="dashboard-recent-schedule"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="dashboard-recent-schedule"]').text()).toContain(
      '근무표 목록을 불러오는 중입니다.'
    )

    schedulesDeferred.resolve([
      createScheduleSummary({ id: 'loaded-schedule', month: '2026-08' }),
    ])
    await flushPromises()

    expect(wrapper.text()).toContain('2026-08')
  })

  it('ignores stale schedule-list retry failures after a newer retry succeeds', async () => {
    const firstRetry = createDeferred<ScheduleSummary[]>()
    const secondRetry = createDeferred<ScheduleSummary[]>()
    getChecklistMock.mockResolvedValue(createReadyChecklist())
    getScheduleListMock
      .mockRejectedValueOnce(new Error('initial schedule list failed'))
      .mockReturnValueOnce(firstRetry.promise)
      .mockReturnValueOnce(secondRetry.promise)

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.get('[data-test="dashboard-primary-action"]').text()).toContain('다시 불러오기')

    const dashboard = wrapper.vm as unknown as {
      handleRetryScheduleList: () => Promise<void>
    }
    const firstRetryPromise = dashboard.handleRetryScheduleList()
    const secondRetryPromise = dashboard.handleRetryScheduleList()

    secondRetry.resolve([
      createScheduleSummary({ id: 'newer-retry-schedule', month: '2026-08' }),
    ])
    await secondRetryPromise
    await flushPromises()

    firstRetry.reject(new Error('older retry failed'))
    await firstRetryPromise
    await flushPromises()

    expect(wrapper.text()).toContain('2026-08')
    expect(wrapper.find('[data-test="dashboard-schedule-list-retry"]').exists()).toBe(false)
  })

  it('prioritizes a running schedule over a creatable month', async () => {
    getChecklistMock.mockResolvedValue(createReadyChecklist())
    getScheduleListMock.mockResolvedValue([
      createScheduleSummary({ id: 'running-1', month: '2026-05', status: 'running' }),
    ])

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.get('[data-test="dashboard-primary-action"]').text()).toContain('생성 상태 확인하기')

    await clickPrimaryAction(wrapper)

    expect(getPhase2ScheduleCompareMock).toHaveBeenCalledWith('sch_a1b2c3d4e5f6')
    expect(pushMock).toHaveBeenCalledWith(buildCanonicalStep5RouteLocation('sch_a1b2c3d4e5f6'))
  })

  it('falls back to recent result instead of create when schedule management is not allowed', async () => {
    rbacStoreMock.abilities.canManageSchedules = false
    getChecklistMock.mockResolvedValue(createReadyChecklist())
    getScheduleListMock.mockResolvedValue([
      createScheduleSummary({ id: 'recent-1', month: '2026-04', status: 'complete' }),
    ])

    const wrapper = createWrapper()
    await flushPromises()

    const primaryAction = wrapper.get('[data-test="dashboard-primary-action"]')
    expect(primaryAction.text()).toContain('최근 근무표 보기')
    expect(primaryAction.text()).not.toContain('새 근무표 생성')
  })

  it('falls back to schedule results when schedule management is not allowed and there is no recent result', async () => {
    rbacStoreMock.abilities.canManageSchedules = false
    getChecklistMock.mockResolvedValue(createReadyChecklist())
    getScheduleListMock.mockResolvedValue([
      createScheduleSummary({ id: 'error-1', month: '2026-04', status: 'error' }),
    ])

    const wrapper = createWrapper()
    await flushPromises()

    const primaryAction = wrapper.get('[data-test="dashboard-primary-action"]')
    expect(primaryAction.text()).toContain('생성된 근무표로 이동')
    expect(primaryAction.text()).not.toContain('새 근무표 생성')
  })

  it('shows one recent schedule sorted by updated_at, created_at, month, then id without mutating the API array', async () => {
    const apiResponse = [
      createScheduleSummary({
        id: 'older-valid-updated',
        month: '2026-12',
        created_at: '2026-05-01T00:00:00.000Z',
        updated_at: '2026-05-02T00:00:00.000Z',
      }),
      createScheduleSummary({
        id: 'b-schedule',
        month: '2026-04',
        created_at: '2026-05-03T00:00:00.000Z',
        updated_at: 'not-a-date',
      }),
      createScheduleSummary({
        id: 'a-schedule',
        month: '2026-06',
        created_at: '2026-05-03T00:00:00.000Z',
        updated_at: 'not-a-date',
      }),
    ]
    getChecklistMock.mockResolvedValue(createReadyChecklist())
    getScheduleListMock.mockResolvedValue(apiResponse)

    const wrapper = createWrapper()
    await flushPromises()

    const recentSchedules = wrapper.findAll('[data-test="dashboard-recent-schedule"]')
    expect(recentSchedules).toHaveLength(1)
    expect(recentSchedules[0].text()).toContain('2026-06')
    expect(recentSchedules[0].text()).not.toContain('2026-04')
    expect(recentSchedules[0].text()).not.toContain('2026-12')
    expect(apiResponse.map((schedule) => schedule.id)).toEqual([
      'older-valid-updated',
      'b-schedule',
      'a-schedule',
    ])
  })

  it('ignores stale schedule responses after the selected organization changes', async () => {
    const firstSchedules = createDeferred<ScheduleSummary[]>()
    const secondSchedules = createDeferred<ScheduleSummary[]>()

    getScheduleListMock.mockReset()
    getChecklistMock.mockReset()
    organizationStoreMock.loadOrganization.mockImplementation(async () => {
      organizationStoreMock.current = {
        id: rbacStoreMock.selectedOrganizationId,
        name: rbacStoreMock.selectedOrganizationId === 'org-2' ? '부산병원' : '서울병원',
        type: 'hospital',
        foundation: null,
      }
      return { success: true }
    })
    getChecklistMock.mockImplementation(async (organizationId: string) =>
      createReadyChecklist({ organizationId })
    )
    getScheduleListMock.mockImplementation((organizationId: string) =>
      organizationId === 'org-2' ? secondSchedules.promise : firstSchedules.promise
    )

    const wrapper = createWrapper()
    await flushPromises()

    rbacStoreMock.selectedOrganizationId = 'org-2'
    await nextTick()
    await flushPromises()

    secondSchedules.resolve([
      createScheduleSummary({
        id: 'new-org-schedule',
        organization_id: 'org-2',
        month: '2026-07',
      }),
    ])
    await flushPromises()

    firstSchedules.resolve([
      createScheduleSummary({
        id: 'old-org-schedule',
        organization_id: 'org-1',
        month: '2026-01',
      }),
    ])
    await flushPromises()

    expect(wrapper.text()).toContain('2026-07')
    expect(wrapper.text()).not.toContain('2026-01')
  })

  it('navigates to Step5 with a canonical preview query when viewing an existing schedule', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.get('[data-test="dashboard-view-recent-schedule"]').trigger('click')
    await flushPromises()

    expect(getPhase2ScheduleCompareMock).toHaveBeenCalledWith('sch_a1b2c3d4e5f6')
    expect(setSelectedVersionIdMock).toHaveBeenCalledWith('version-2')
    expect(setPreviewVersionIdMock).toHaveBeenCalledWith('version-2')
    expect(pushMock).toHaveBeenCalledWith(buildCanonicalStep5RouteLocation('sch_a1b2c3d4e5f6'))
  })

  it('falls back to the legacy uuid route key when a public id is unavailable', async () => {
    getScheduleListMock.mockResolvedValueOnce([
      createScheduleSummary({
        id: 'schedule-legacy',
        public_id: null,
        month: '2025-12',
      }),
    ])

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.get('[data-test="dashboard-view-recent-schedule"]').trigger('click')
    await flushPromises()

    expect(getPhase2ScheduleCompareMock).toHaveBeenCalledWith('schedule-legacy')
  })

  it('blocks navigation and shows an error when compare fails', async () => {
    getPhase2ScheduleCompareMock.mockRejectedValue(new Error('compare failed'))

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.get('[data-test="dashboard-view-recent-schedule"]').trigger('click')
    await flushPromises()

    expect(getPhase2ScheduleCompareMock).toHaveBeenCalledWith('sch_a1b2c3d4e5f6')
    expect(showErrorMock).toHaveBeenCalledWith('선택한 근무표 버전을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.')
    expect(pushMock).not.toHaveBeenCalledWith(buildCanonicalStep5RouteLocation('sch_a1b2c3d4e5f6'))
  })

  it('routes a recent error schedule to Step4 and sets basic schedule context', async () => {
    getScheduleListMock.mockResolvedValueOnce([
      createScheduleSummary({
        id: 'error-schedule',
        public_id: 'sch_error123456',
        month: '2026-05',
        status: 'error',
      }),
    ])

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.get('[data-test="dashboard-view-recent-schedule"]').trigger('click')
    await flushPromises()

    expect(getPhase2ScheduleCompareMock).not.toHaveBeenCalled()
    expect(setBasicInfoMock).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: 'org-1',
      organizationName: '서울병원',
      scheduleId: 'error-schedule',
      schedulePublicId: 'sch_error123456',
      month: '2026-05',
    }))
    expect(pushMock).toHaveBeenCalledWith('/app/schedule/step4')
    expect(showWarningMock).not.toHaveBeenCalled()
  })

  it('hides schedule actions when checklist readiness cannot be loaded', async () => {
    getChecklistMock.mockRejectedValue(new Error('checklist failed'))

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="dashboard-readiness-unavailable"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="dashboard-ops-readiness-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="dashboard-recent-schedule"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="dashboard-readiness-retry"]').text()).toContain('다시 확인')
    expect(wrapper.text()).toContain('운영 준비 상태를 확인하지 못했습니다')
    expect(getScheduleListMock).not.toHaveBeenCalled()
  })

  it('keeps schedule actions hidden while ops readiness is still loading', async () => {
    const checklistDeferred = createDeferred<ReturnType<typeof createReadyChecklist>>()
    getChecklistMock.mockReturnValue(checklistDeferred.promise)

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="dashboard-primary-action"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="dashboard-recent-schedule"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="dashboard-ops-readiness-loading"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('운영 준비 정보를 확인하는 중입니다')

    checklistDeferred.resolve(createReadyChecklist())
    await flushPromises()

    expect(wrapper.find('[data-test="dashboard-ops-readiness-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="dashboard-next-action"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="dashboard-operational-status"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="dashboard-recent-schedule"]').exists()).toBe(true)
  })

  it('shows onboarding only and skips schedule loading when required readiness is incomplete', async () => {
    getChecklistMock.mockResolvedValue(buildChecklistFixture({
      schedule_foundation: {
        status: 'blocked',
        blockedReason: '기준 장소, 휴식시간, 시프트, 인력 기준 설정을 먼저 완료해주세요.',
      },
      employee_roster: {
        status: 'blocked',
        blockedReason: '직원 로스터가 아직 등록되지 않았습니다.',
      },
    }, {
      checklistCursor: 'schedule_foundation',
      ready: false,
    }))

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="dashboard-onboarding-only"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="dashboard-next-action"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="dashboard-recent-schedule"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="dashboard-basic-info-section"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="dashboard-create-section"]').exists()).toBe(false)
    expect(getScheduleListMock).not.toHaveBeenCalled()
  })

  it('shows readiness unavailable and skips schedule loading when a required readiness item is missing', async () => {
    getChecklistMock.mockResolvedValue(buildChecklistFixture({}, {
      omitKeys: ['employee_roster'],
      ready: true,
    }))

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="dashboard-readiness-unavailable"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="dashboard-recent-schedule"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="dashboard-onboarding-only"]').exists()).toBe(false)
    expect(getScheduleListMock).not.toHaveBeenCalled()
  })

  it('treats blocked optional readiness as ready for dashboard briefing sections', async () => {
    getChecklistMock.mockResolvedValue(buildChecklistFixture({
      off_request_policy: {
        status: 'blocked',
        blockedReason: '필요하면 나중에 설정할 수 있습니다.',
      },
    }, {
      checklistCursor: 'off_request_policy',
      ready: true,
    }))

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="dashboard-onboarding-only"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="dashboard-next-action"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="dashboard-operational-status"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="dashboard-recent-schedule"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('필요하면 나중에 설정할 수 있습니다.')
    expect(getScheduleListMock).toHaveBeenCalledWith('org-1')
  })

  it('keeps dashboard briefing sections available when only schedule review is blocked', async () => {
    getChecklistMock.mockResolvedValue(buildChecklistFixture({
      schedule_review: {
        status: 'blocked',
        route: null,
        blockedReason: '검토할 근무표가 아직 없습니다.',
      },
    }, {
      checklistCursor: 'schedule_review',
      ready: true,
    }))

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="dashboard-onboarding-only"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="dashboard-next-action"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="dashboard-operational-status"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="dashboard-recent-schedule"]').exists()).toBe(true)
    expect(getScheduleListMock).toHaveBeenCalledWith('org-1')
  })

  it('shows a retry action instead of an empty state when schedule list loading fails after readiness is complete', async () => {
    getChecklistMock.mockResolvedValue(createReadyChecklist())
    getScheduleListMock.mockRejectedValue(new Error('schedule list failed'))

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.get('[data-test="dashboard-next-action"]').text()).toContain('근무표 목록을 확인하지 못했습니다')
    expect(wrapper.get('[data-test="dashboard-primary-action"]').text()).toContain('다시 불러오기')
    expect(wrapper.get('[data-test="dashboard-operational-status"]').text()).toContain('확인 필요')
    expect(wrapper.find('[data-test="dashboard-schedule-list-retry"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('아직 생성된 근무표가 없습니다')
  })

  it('routes onboarding organization profile action to Step1 setup mode', async () => {
    getChecklistMock.mockResolvedValue(buildChecklistFixture({
      organization_profile: {
        status: 'blocked',
        blockedReason: '병원 정보 확인이 아직 완료되지 않았습니다.',
      },
      schedule_foundation: {
        status: 'blocked',
        blockedReason: '기준 장소, 휴식시간, 시프트, 인력 기준 설정을 먼저 완료해주세요.',
      },
      employee_roster: {
        status: 'blocked',
        blockedReason: '직원 로스터가 아직 등록되지 않았습니다.',
      },
    }, {
      checklistCursor: 'organization_profile',
      ready: false,
    }))

    const wrapper = createWrapper()
    await flushPromises()

    const onboardingItem = wrapper.find('[data-test="dashboard-onboarding-item-organization_profile"]')
    expect(onboardingItem.exists()).toBe(true)
    await onboardingItem.trigger('click')

    expect(pushMock).toHaveBeenCalledWith({
      path: '/app/schedule/step1',
      query: {
        context: 'setup',
      },
    })
  })

  it('routes onboarding schedule foundation action to Step2 setup mode', async () => {
    getChecklistMock.mockResolvedValue(buildChecklistFixture({
      schedule_foundation: {
        status: 'blocked',
        blockedReason: '기준 장소, 휴식시간, 시프트, 인력 기준 설정을 먼저 완료해주세요.',
      },
      employee_roster: {
        status: 'blocked',
        blockedReason: '직원 로스터가 아직 등록되지 않았습니다.',
      },
    }, {
      checklistCursor: 'schedule_foundation',
      ready: false,
    }))

    const wrapper = createWrapper()
    await flushPromises()

    const onboardingItem = wrapper.find('[data-test="dashboard-onboarding-item-schedule_foundation"]')
    expect(onboardingItem.exists()).toBe(true)
    await onboardingItem.trigger('click')

    expect(pushMock).toHaveBeenCalledWith({
      path: '/app/schedule/step2',
      query: {
        context: 'setup',
      },
    })
  })

  it('routes onboarding employee roster action to Step3 setup mode', async () => {
    getChecklistMock.mockResolvedValue(buildChecklistFixture({
      employee_roster: {
        status: 'blocked',
        blockedReason: '직원 로스터가 아직 등록되지 않았습니다.',
      },
    }, {
      checklistCursor: 'employee_roster',
      ready: false,
    }))

    const wrapper = createWrapper()
    await flushPromises()

    const onboardingItem = wrapper.find('[data-test="dashboard-onboarding-item-employee_roster"]')
    expect(onboardingItem.exists()).toBe(true)
    await onboardingItem.trigger('click')

    expect(pushMock).toHaveBeenCalledWith({
      path: '/app/schedule/step3',
      query: {
        context: 'setup',
      },
    })
  })

  it('keeps onboarding visible and shows an error when onboarding route navigation fails', async () => {
    getChecklistMock.mockResolvedValue(buildChecklistFixture({
      schedule_foundation: {
        status: 'blocked',
        blockedReason: '기준 장소, 휴식시간, 시프트, 인력 기준 설정을 먼저 완료해주세요.',
      },
      employee_roster: {
        status: 'blocked',
        blockedReason: '직원 로스터가 아직 등록되지 않았습니다.',
      },
    }, {
      checklistCursor: 'schedule_foundation',
      ready: false,
    }))

    const wrapper = createWrapper()
    await flushPromises()

    const onboardingItem = wrapper.find('[data-test="dashboard-onboarding-item-schedule_foundation"]')
    expect(onboardingItem.exists()).toBe(true)

    pushMock.mockRejectedValueOnce(new Error('navigation failed'))
    await onboardingItem.trigger('click')
    await flushPromises()

    expect(showErrorMock).toHaveBeenCalledWith('화면을 열지 못했습니다. 잠시 후 다시 시도해주세요.')
    expect(wrapper.find('[data-test="dashboard-onboarding-only"]').exists()).toBe(true)
  })

  it('routes schedule foundation checklist entries to Step2 setup even when the backend route drifts to Step1', async () => {
    getChecklistMock.mockResolvedValueOnce(buildChecklistFixture({
      schedule_foundation: {
        title: '사이트/근무 기본 설정',
        status: 'ready',
        route: '/schedule/step1',
      },
      employee_roster: {
        status: 'blocked',
        blockedReason: '직원 로스터가 아직 등록되지 않았습니다.',
      },
    }, {
      checklistCursor: 'schedule_foundation',
      ready: false,
    }))

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.get('[data-test="dashboard-onboarding-item-schedule_foundation"]').trigger('click')
    await flushPromises()

    expect(pushMock).toHaveBeenCalledWith({
      path: '/app/schedule/step2',
      query: {
        context: 'setup',
      },
    })
  })

  it('renders a month picker instead of the legacy select when opening the creation modal', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await (wrapper.vm as unknown as { handleCreateNew: () => void }).handleCreateNew()
    await nextTick()

    const monthPicker = wrapper.findComponent('[data-test="dashboard-month-picker"]')

    expect(monthPicker.exists()).toBe(true)
    expect(wrapper.find('[data-test="dashboard-month-select"]').exists()).toBe(false)
    expect(monthPicker.props('type')).toBe('month')
    expect(monthPicker.props('format')).toBe('yyyy-MM')
    expect(monthPicker.props('valueFormat')).toBe('yyyy-MM')
    expect(document.body.textContent).toContain(
      '현재 기준 과거 12개월부터 미래 12개월 사이에서, 아직 생성하지 않은 월만 선택할 수 있습니다.'
    )
  })

  it('opens the month picker from the Dashboard createSchedule query after data is ready', async () => {
    routeState.query = {
      createSchedule: '1',
      keep: 'yes',
    }

    const wrapper = createWrapper()
    await flushPromises()
    await nextTick()

    expect(wrapper.findComponent('[data-test="dashboard-month-picker"]').exists()).toBe(true)
    expect(pushMock).not.toHaveBeenCalledWith(getScheduleStepRoutePath(1))
    expect(replaceMock).toHaveBeenCalledWith({
      path: getAppHomeRoutePath(),
      query: {
        keep: 'yes',
      },
    })
  })

  it('consumes the Dashboard createSchedule query without opening the modal when readiness is incomplete', async () => {
    routeState.query = {
      createSchedule: '1',
    }
    getChecklistMock.mockResolvedValue(buildChecklistFixture({
      schedule_foundation: {
        status: 'blocked',
        blockedReason: '기준 장소, 휴식시간, 시프트, 인력 기준 설정을 먼저 완료해주세요.',
      },
      employee_roster: {
        status: 'blocked',
        blockedReason: '직원 로스터가 아직 등록되지 않았습니다.',
      },
    }, {
      checklistCursor: 'schedule_foundation',
      ready: false,
    }))

    const wrapper = createWrapper()
    await flushPromises()
    await nextTick()

    expect(wrapper.findComponent('[data-test="dashboard-month-picker"]').exists()).toBe(false)
    expect(getScheduleListMock).not.toHaveBeenCalled()
    expect(supabaseFromMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalledWith(getScheduleStepRoutePath(1))
    expect(replaceMock).toHaveBeenCalledWith({
      path: getAppHomeRoutePath(),
      query: {},
    })
  })

  it('consumes the Dashboard createSchedule query without opening the modal when schedule loading fails', async () => {
    routeState.query = {
      createSchedule: '1',
    }
    getChecklistMock.mockResolvedValue(createReadyChecklist())
    getScheduleListMock.mockRejectedValue(new Error('schedule list failed'))

    const wrapper = createWrapper()
    await flushPromises()
    await nextTick()

    expect(wrapper.findComponent('[data-test="dashboard-month-picker"]').exists()).toBe(false)
    expect(supabaseFromMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalledWith(getScheduleStepRoutePath(1))
    expect(replaceMock).toHaveBeenCalledWith({
      path: getAppHomeRoutePath(),
      query: {},
    })
  })

  it('disables months outside the +/-12 month window and existing schedule months', async () => {
    getScheduleListMock.mockResolvedValueOnce([
      createScheduleSummary({
        id: 'schedule-current',
        public_id: 'sch-current',
        month: '2026-05',
        status: 'created',
        hard_score: null,
        soft_score: null,
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
      }),
      createScheduleSummary({
        id: 'schedule-next',
        public_id: 'sch-next',
        month: '2026-06',
        status: 'error',
        hard_score: null,
        soft_score: null,
        created_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
      }),
    ])

    const wrapper = createWrapper()
    await flushPromises()

    await (wrapper.vm as unknown as { handleCreateNew: () => void }).handleCreateNew()
    await nextTick()

    const monthPicker = wrapper.findComponent('[data-test="dashboard-month-picker"]')
    const isDateDisabled = monthPicker.props('isDateDisabled') as (
      timestamp: number,
      detail: { type: 'month'; year: number; month: number } | { type: 'year'; year: number }
    ) => boolean

    expect(isDateDisabled(new Date('2025-04-01T00:00:00+09:00').getTime(), {
      type: 'month',
      year: 2025,
      month: 3,
    })).toBe(true)
    expect(isDateDisabled(new Date('2027-06-01T00:00:00+09:00').getTime(), {
      type: 'month',
      year: 2027,
      month: 5,
    })).toBe(true)
    expect(isDateDisabled(new Date('2026-05-01T00:00:00+09:00').getTime(), {
      type: 'month',
      year: 2026,
      month: 4,
    })).toBe(true)
    expect(isDateDisabled(new Date('2026-06-01T00:00:00+09:00').getTime(), {
      type: 'month',
      year: 2026,
      month: 5,
    })).toBe(true)
    expect(isDateDisabled(new Date('2026-07-01T00:00:00+09:00').getTime(), {
      type: 'month',
      year: 2026,
      month: 6,
    })).toBe(false)
    expect(isDateDisabled(new Date('2024-01-01T00:00:00+09:00').getTime(), {
      type: 'year',
      year: 2024,
    })).toBe(true)
  })

  it('keeps the month after an existing schedule selectable when date picker month detail is zero-based', async () => {
    getScheduleListMock.mockResolvedValueOnce([
      createScheduleSummary({
        id: 'schedule-march',
        public_id: 'sch-march',
        month: '2026-03',
      }),
    ])

    const wrapper = createWrapper()
    await flushPromises()

    await (wrapper.vm as unknown as { handleCreateNew: () => void }).handleCreateNew()
    await nextTick()

    const monthPicker = wrapper.findComponent('[data-test="dashboard-month-picker"]')
    const isDateDisabled = monthPicker.props('isDateDisabled') as (
      timestamp: number,
      detail: { type: 'month'; year: number; month: number }
    ) => boolean

    expect(isDateDisabled(new Date('2026-03-01T00:00:00+09:00').getTime(), {
      type: 'month',
      year: 2026,
      month: 2,
    })).toBe(true)
    expect(isDateDisabled(new Date('2026-04-01T00:00:00+09:00').getTime(), {
      type: 'month',
      year: 2026,
      month: 3,
    })).toBe(false)
  })

  it('defaults to the nearest available month using the planned priority order', async () => {
    getScheduleListMock.mockResolvedValueOnce([
      createScheduleSummary({
        id: 'schedule-next',
        public_id: 'sch-next',
        month: '2026-06',
      }),
    ])

    const wrapper = createWrapper()
    await flushPromises()

    await (wrapper.vm as unknown as { handleCreateNew: () => void }).handleCreateNew()
    await nextTick()

    const monthPicker = wrapper.findComponent('[data-test="dashboard-month-picker"]')
    expect(monthPicker.props('formattedValue')).toBe('2026-05')
  })

  it('shows a warning and does not open the modal when every month in range is already taken', async () => {
    getScheduleListMock.mockResolvedValueOnce(
      Array.from({ length: 25 }, (_, index) => {
        const baseDate = new Date('2025-05-01T00:00:00+09:00')
        baseDate.setMonth(baseDate.getMonth() + index)
        const month = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}`

        return createScheduleSummary({
          id: `schedule-${month}`,
          public_id: `sch-${month}`,
          month,
          created_at: `${month}-01T00:00:00Z`,
          updated_at: `${month}-01T00:00:00Z`,
        })
      })
    )

    const wrapper = createWrapper()
    await flushPromises()

    await (wrapper.vm as unknown as { handleCreateNew: () => void }).handleCreateNew()
    await nextTick()

    expect(showWarningMock).toHaveBeenCalledWith(
      '현재 기준 과거 12개월부터 미래 12개월 사이에 선택 가능한 계획월이 없습니다.'
    )
    expect(wrapper.findComponent('[data-test="dashboard-month-picker"]').exists()).toBe(false)
  })

  it('blocks creation when the final duplicate check finds an existing month', async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: {
        id: 'schedule-dup',
        month: '2026-07',
        status: 'created',
      },
      error: null,
    })
    const monthEqMock = vi.fn(() => ({
      maybeSingle: maybeSingleMock,
    }))
    const organizationEqMock = vi.fn(() => ({
      eq: monthEqMock,
    }))
    const selectMock = vi.fn(() => ({
      eq: organizationEqMock,
    }))

    supabaseFromMock.mockReturnValue({
      select: selectMock,
    })

    const wrapper = createWrapper()
    await flushPromises()

    ;(wrapper.vm as unknown as { monthForm: { month: string } }).monthForm.month = '2026-07'

    const result = await (wrapper.vm as unknown as {
      handleMonthConfirm: () => Promise<boolean>
    }).handleMonthConfirm()

    expect(result).toBe(false)
    expect(showErrorMock).toHaveBeenCalledWith('2026-07 근무표가 이미 존재합니다. 다른 월을 선택해주세요.')
    expect(pushMock).not.toHaveBeenCalledWith('/app/schedule/step1')
  })

  it('keeps the creation modal open and shows an error when Step1 navigation fails', async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    })
    const monthEqMock = vi.fn(() => ({
      maybeSingle: maybeSingleMock,
    }))
    const organizationEqMock = vi.fn(() => ({
      eq: monthEqMock,
    }))
    const selectMock = vi.fn(() => ({
      eq: organizationEqMock,
    }))

    supabaseFromMock.mockReturnValue({
      select: selectMock,
    })
    pushMock.mockRejectedValueOnce(new Error('navigation failed'))

    const wrapper = createWrapper()
    await flushPromises()

    ;(wrapper.vm as unknown as { monthForm: { month: string } }).monthForm.month = '2026-07'

    const result = await (wrapper.vm as unknown as {
      handleMonthConfirm: () => Promise<boolean>
    }).handleMonthConfirm()

    expect(result).toBe(false)
    expect(pushMock).toHaveBeenCalledWith('/app/schedule/step1')
    expect(showErrorMock).toHaveBeenCalledWith('요청한 화면으로 이동하지 못했습니다. 다시 시도해주세요.')
  })

  it('renders a restricted fallback without schedule creation actions for user-only access', async () => {
    Object.assign(rbacStoreMock.abilities, {
      canViewApprovalQueue: false,
      canSwitchOrganization: true,
      canViewRestrictedUserHome: true,
      canManageOrganizationSetup: false,
      canManageEmployees: false,
      canManageSchedules: false,
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('현재 계정은 운영 기능 권한이 없습니다.')
    expect(wrapper.find('[data-test="dashboard-primary-action"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="dashboard-create-schedule"]').exists()).toBe(false)
    expect(organizationStoreMock.loadOrganization).not.toHaveBeenCalled()
    expect(getChecklistMock).not.toHaveBeenCalled()
    expect(getScheduleListMock).not.toHaveBeenCalled()
  })

  it('reloads organization-scoped dashboard data when the active organization changes', async () => {
    organizationStoreMock.loadOrganization.mockImplementation(async () => {
      if (rbacStoreMock.selectedOrganizationId === 'org-2') {
        organizationStoreMock.current = {
          id: 'org-2',
          name: '부산병원',
          type: 'hospital',
          foundation: null,
        }
      } else {
        organizationStoreMock.current = {
          id: 'org-1',
          name: '서울병원',
          type: 'hospital',
          foundation: null,
        }
      }

      return { success: true }
    })

    getScheduleListMock.mockImplementation(async (organizationId: string) => [
      createScheduleSummary({
        id: `schedule-${organizationId}`,
        public_id: `sch-${organizationId}`,
        organization_id: organizationId,
        month: organizationId === 'org-2' ? '2026-01' : '2025-12',
      }),
    ])

    getChecklistMock.mockImplementation(async (organizationId: string) =>
      createReadyChecklist({ organizationId })
    )

    const wrapper = createWrapper()
    await flushPromises()

    expect(organizationStoreMock.loadOrganization).toHaveBeenCalledTimes(1)
    expect(getScheduleListMock).toHaveBeenCalledWith('org-1')
    expect(getChecklistMock).toHaveBeenCalledWith('org-1')
    expect(wrapper.text()).toContain('2025-12')

    const initialLoadOrganizationCalls = organizationStoreMock.loadOrganization.mock.calls.length
    const initialFoundationCalls = organizationStoreMock.loadFoundationData.mock.calls.length
    const initialScheduleCalls = getScheduleListMock.mock.calls.length
    const initialChecklistCalls = getChecklistMock.mock.calls.length

    rbacStoreMock.selectedOrganizationId = 'org-2'
    await nextTick()
    await flushPromises()

    expect(organizationStoreMock.loadOrganization.mock.calls.length)
      .toBeGreaterThan(initialLoadOrganizationCalls)
    expect(organizationStoreMock.loadFoundationData.mock.calls.length)
      .toBeGreaterThan(initialFoundationCalls)
    expect(getScheduleListMock.mock.calls.length).toBeGreaterThan(initialScheduleCalls)
    expect(getChecklistMock.mock.calls.length).toBeGreaterThan(initialChecklistCalls)
    expect(organizationStoreMock.loadFoundationData).toHaveBeenCalledWith('org-2')
    expect(getScheduleListMock).toHaveBeenCalledWith('org-2')
    expect(getChecklistMock).toHaveBeenCalledWith('org-2')
    expect(wrapper.text()).toContain('2026-01')
  })
})
