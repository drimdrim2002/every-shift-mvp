import { mount, flushPromises } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildCanonicalStep5RouteLocation } from '@/constants/routes'

const {
  pushMock,
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

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock,
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
  showSuccess: vi.fn(),
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
          template: '<div />',
        },
        NBadge: {
          template: '<div />',
        },
        NModal: {
          props: ['show'],
          template: '<div v-if="show"><slot /></div>',
        },
        NForm: {
          template: '<form><slot /></form>',
        },
        NFormItem: {
          template: '<div><slot /></div>',
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

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-15T09:00:00+09:00'))
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
      {
        id: 'schedule-123',
        public_id: 'sch_a1b2c3d4e5f6',
        organization_id: 'org-1',
        month: '2025-12',
        status: 'complete',
        hard_score: 10,
        soft_score: 20,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
    ])
    getChecklistMock.mockResolvedValue({
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
          isOptional: false,
        },
        {
          key: 'schedule_foundation',
          title: '기준 장소와 근무 기준 설정',
          status: 'ready',
          route: '/schedule/step2',
          blockedReason: null,
          isOptional: false,
        },
        {
          key: 'employee_roster',
          title: '직원 로스터 준비',
          status: 'ready',
          route: '/schedule/step3',
          blockedReason: null,
          isOptional: false,
        },
        {
          key: 'off_request_policy',
          title: 'Off 사용 기준 설정',
          status: 'ready',
          route: '/ops/off-request-policy-setup',
          blockedReason: null,
          isOptional: true,
        },
        {
          key: 'schedule_review',
          title: '최종 검토 진입',
          status: 'ready',
          route: '/schedule/step5/sch_a1b2c3d4e5f6',
          blockedReason: null,
          isOptional: false,
        },
      ],
      fairnessSummary: [],
    })
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

  it('navigates to Step5 with a canonical preview query when viewing an existing schedule', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await (wrapper.vm as unknown as { handleViewSchedule: (schedule: unknown) => Promise<void> })
      .handleViewSchedule({
        id: 'schedule-123',
        public_id: 'sch_a1b2c3d4e5f6',
        organization_id: 'org-1',
        month: '2025-12',
        status: 'complete',
        hard_score: 10,
        soft_score: 20,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      })
    await flushPromises()

    expect(getPhase2ScheduleCompareMock).toHaveBeenCalledWith('sch_a1b2c3d4e5f6')
    expect(setSelectedVersionIdMock).toHaveBeenCalledWith('version-2')
    expect(setPreviewVersionIdMock).toHaveBeenCalledWith('version-2')
    expect(pushMock).toHaveBeenCalledWith(buildCanonicalStep5RouteLocation('sch_a1b2c3d4e5f6'))
  })

  it('falls back to the legacy uuid route key when a public id is unavailable', async () => {
    getScheduleListMock.mockResolvedValueOnce([
      {
        id: 'schedule-legacy',
        public_id: null,
        organization_id: 'org-1',
        month: '2025-12',
        status: 'complete',
        hard_score: 10,
        soft_score: 20,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
    ])

    const wrapper = createWrapper()
    await flushPromises()

    await (wrapper.vm as unknown as { handleViewSchedule: (schedule: unknown) => Promise<void> })
      .handleViewSchedule({
        id: 'schedule-legacy',
        public_id: null,
        organization_id: 'org-1',
        month: '2025-12',
        status: 'complete',
        hard_score: 10,
        soft_score: 20,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      })
    await flushPromises()

    expect(getPhase2ScheduleCompareMock).toHaveBeenCalledWith('schedule-legacy')
  })

  it('blocks navigation and shows an error when compare fails', async () => {
    getPhase2ScheduleCompareMock.mockRejectedValue(new Error('compare failed'))

    const wrapper = createWrapper()
    await flushPromises()

    await (wrapper.vm as unknown as { handleViewSchedule: (schedule: unknown) => Promise<void> })
      .handleViewSchedule({
        id: 'schedule-123',
        public_id: 'sch_a1b2c3d4e5f6',
        organization_id: 'org-1',
        month: '2025-12',
        status: 'complete',
        hard_score: 10,
        soft_score: 20,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      })
    await flushPromises()

    expect(getPhase2ScheduleCompareMock).toHaveBeenCalledWith('sch_a1b2c3d4e5f6')
    expect(showErrorMock).toHaveBeenCalledWith('선택한 근무표 버전을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.')
    expect(pushMock).not.toHaveBeenCalledWith(buildCanonicalStep5RouteLocation('sch_a1b2c3d4e5f6'))
  })

  it('deep-links the foundation card CTA to the hospital setup screen when hospital info is incomplete', async () => {
    getChecklistMock.mockResolvedValue({
      organizationId: 'org-1',
      checklistCursor: 'organization_profile',
      ready: false,
      items: [
        {
          key: 'organization_profile',
          title: '병원 정보 확인',
          status: 'blocked',
          route: '/ops/organization-setup',
          blockedReason: '병원 정보 확인이 아직 완료되지 않았습니다.',
          isOptional: false,
        },
        {
          key: 'schedule_foundation',
          title: '기준 장소와 근무 기준 설정',
          status: 'blocked',
          route: '/schedule/step2',
          blockedReason: '기준 장소, 휴식시간, 시프트, 인력 기준 설정을 먼저 완료해주세요.',
          isOptional: false,
        },
        {
          key: 'employee_roster',
          title: '직원 로스터 준비',
          status: 'blocked',
          route: '/schedule/step3',
          blockedReason: '직원 로스터가 아직 등록되지 않았습니다.',
          isOptional: false,
        },
        {
          key: 'off_request_policy',
          title: 'Off 사용 기준 설정',
          status: 'blocked',
          route: '/ops/off-request-policy-setup',
          blockedReason: '필요하면 나중에 설정할 수 있습니다.',
          isOptional: true,
        },
        {
          key: 'schedule_review',
          title: '최종 검토 진입',
          status: 'blocked',
          route: null,
          blockedReason: '검토할 근무표가 아직 없습니다.',
          isOptional: false,
        },
      ],
      fairnessSummary: [],
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('병원 정보 확인이 필요합니다')
    expect(wrapper.text()).toContain('병원명을 먼저 저장해야 다음 운영 기준을 이어서 설정할 수 있습니다.')
    expect(wrapper.text()).toContain('병원 정보 열기')

    await wrapper.get('[data-test="dashboard-foundation-card"]').trigger('click')

    expect(pushMock).toHaveBeenCalledWith('/app/ops/organization-setup')
  })

  it('deep-links the foundation card CTA to Step2 setup when only schedule foundation is incomplete', async () => {
    getChecklistMock.mockResolvedValue({
      organizationId: 'org-1',
      checklistCursor: 'schedule_foundation',
      ready: false,
      items: [
        {
          key: 'organization_profile',
          title: '병원 정보 확인',
          status: 'ready',
          route: '/ops/organization-setup',
          blockedReason: null,
          isOptional: false,
        },
        {
          key: 'schedule_foundation',
          title: '기준 장소와 근무 기준 설정',
          status: 'blocked',
          route: '/schedule/step2',
          blockedReason: '기준 장소, 휴식시간, 시프트, 인력 기준 설정을 먼저 완료해주세요.',
          isOptional: false,
        },
        {
          key: 'employee_roster',
          title: '직원 로스터 준비',
          status: 'blocked',
          route: '/schedule/step3',
          blockedReason: '직원 로스터가 아직 등록되지 않았습니다.',
          isOptional: false,
        },
        {
          key: 'off_request_policy',
          title: 'Off 사용 기준 설정',
          status: 'blocked',
          route: '/ops/off-request-policy-setup',
          blockedReason: '필요하면 나중에 설정할 수 있습니다.',
          isOptional: true,
        },
        {
          key: 'schedule_review',
          title: '최종 검토 진입',
          status: 'blocked',
          route: null,
          blockedReason: '검토할 근무표가 아직 없습니다.',
          isOptional: false,
        },
      ],
      fairnessSummary: [],
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('운영 기본 설정이 아직 완료되지 않았습니다')
    expect(wrapper.text()).toContain('기준 장소, 휴식시간, 시프트, 인력 기준을 먼저 확인해주세요.')
    expect(wrapper.text()).toContain('기준 설정 열기')

    await wrapper.get('[data-test="dashboard-foundation-card"]').trigger('click')

    expect(pushMock).toHaveBeenCalledWith({
      path: '/app/schedule/step2',
      query: {
        context: 'setup',
      },
    })
  })

  it('keeps a Step2 setup CTA visible when foundation setup is complete from local data', async () => {
    organizationStoreMock.current = {
      id: 'org-1',
      name: '서울병원',
      type: 'hospital',
      foundation: {
        currentStepKey: 'site_foundation',
        organizationInfoConfirmedAt: '2026-04-08T10:30:00Z',
        organizationInfoConfirmedBy: 'operator-1',
      },
    }
    organizationStoreMock.foundationProfile = {
      organizationId: 'org-1',
      name: '서울병원',
      type: 'hospital',
    }
    organizationStoreMock.foundationSite = {
      id: 'site-1',
      organizationId: 'org-1',
      code: 'MAIN',
      name: '본관',
      isActive: true,
      isScheduleActive: true,
    }

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('운영 기본 설정이 완료되었습니다')
    expect(wrapper.find('[data-test="dashboard-foundation-setup"]').exists()).toBe(true)

    await wrapper.get('[data-test="dashboard-foundation-setup"]').trigger('click')

    expect(pushMock).toHaveBeenCalledWith({
      path: '/app/schedule/step2',
      query: {
        context: 'setup',
      },
    })
  })

  it('keeps a Step2 setup CTA visible when foundation setup is complete from checklist readiness', async () => {
    organizationStoreMock.current = {
      id: 'org-1',
      name: '서울병원',
      type: 'hospital',
      foundation: null,
    }
    organizationStoreMock.foundationSite = null

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('운영 기본 설정이 완료되었습니다')
    expect(wrapper.find('[data-test="dashboard-foundation-setup"]').exists()).toBe(true)

    await wrapper.get('[data-test="dashboard-foundation-setup"]').trigger('click')

    expect(pushMock).toHaveBeenCalledWith({
      path: '/app/schedule/step2',
      query: {
        context: 'setup',
      },
    })
  })

  it('renders foundation incomplete from checklist readiness even when local foundation cache looks complete', async () => {
    organizationStoreMock.current = {
      id: 'org-1',
      name: '서울병원',
      type: 'hospital',
      foundation: {
        currentStepKey: 'site_foundation',
        organizationInfoConfirmedAt: '2026-04-08T10:30:00Z',
        organizationInfoConfirmedBy: 'operator-1',
      },
    }
    organizationStoreMock.foundationSite = {
      id: 'site-1',
      organizationId: 'org-1',
      code: 'MAIN',
      name: '본관',
      isActive: true,
      isScheduleActive: true,
    }
    getChecklistMock.mockResolvedValue({
      organizationId: 'org-1',
      checklistCursor: 'schedule_foundation',
      ready: false,
      items: [
        {
          key: 'organization_profile',
          title: '병원 정보 확인',
          status: 'ready',
          route: '/ops/organization-setup',
          blockedReason: null,
          isOptional: false,
        },
        {
          key: 'schedule_foundation',
          title: '기준 장소와 근무 기준 설정',
          status: 'blocked',
          route: '/schedule/step2',
          blockedReason: '기준 장소, 휴식시간, 시프트, 인력 기준 설정을 먼저 완료해주세요.',
          isOptional: false,
        },
        {
          key: 'employee_roster',
          title: '직원 로스터 준비',
          status: 'blocked',
          route: '/schedule/step3',
          blockedReason: '직원 로스터가 아직 등록되지 않았습니다.',
          isOptional: false,
        },
        {
          key: 'off_request_policy',
          title: 'Off 사용 기준 설정',
          status: 'blocked',
          route: '/ops/off-request-policy-setup',
          blockedReason: '필요하면 나중에 설정할 수 있습니다.',
          isOptional: true,
        },
        {
          key: 'schedule_review',
          title: '최종 검토 진입',
          status: 'blocked',
          route: null,
          blockedReason: '검토할 근무표가 아직 없습니다.',
          isOptional: false,
        },
      ],
      fairnessSummary: [],
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('운영 기본 설정이 아직 완료되지 않았습니다')
    expect(wrapper.find('[data-test="dashboard-foundation-setup"]').exists()).toBe(true)
  })

  it('hides the foundation card when checklist readiness cannot be loaded', async () => {
    getChecklistMock.mockRejectedValue(new Error('checklist failed'))

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="dashboard-foundation-card"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="dashboard-foundation-setup"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="dashboard-ops-readiness-loading"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('월별 근무표 작업')
    expect(wrapper.find('[data-test="schedule-card"]').exists()).toBe(true)
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

  it('disables months outside the +/-12 month window and existing schedule months', async () => {
    getScheduleListMock.mockResolvedValueOnce([
      {
        id: 'schedule-current',
        public_id: 'sch-current',
        organization_id: 'org-1',
        month: '2026-05',
        status: 'created',
        hard_score: null,
        soft_score: null,
        created_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
      },
      {
        id: 'schedule-next',
        public_id: 'sch-next',
        organization_id: 'org-1',
        month: '2026-06',
        status: 'error',
        hard_score: null,
        soft_score: null,
        created_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
      },
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
      {
        id: 'schedule-march',
        public_id: 'sch-march',
        organization_id: 'org-1',
        month: '2026-03',
        status: 'complete',
        hard_score: null,
        soft_score: null,
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-01T00:00:00Z',
      },
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
      {
        id: 'schedule-next',
        public_id: 'sch-next',
        organization_id: 'org-1',
        month: '2026-06',
        status: 'complete',
        hard_score: null,
        soft_score: null,
        created_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
      },
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

        return {
          id: `schedule-${month}`,
          public_id: `sch-${month}`,
          organization_id: 'org-1',
          month,
          status: 'complete' as const,
          hard_score: null,
          soft_score: null,
          created_at: `${month}-01T00:00:00Z`,
          updated_at: `${month}-01T00:00:00Z`,
        }
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

  it('keeps schedule actions hidden while ops readiness is still loading', async () => {
    const checklistDeferred = createDeferred<Awaited<ReturnType<typeof getChecklistMock>>>()
    getChecklistMock.mockReturnValue(checklistDeferred.promise)

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="dashboard-create-schedule"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('월별 근무표 작업')
    expect(wrapper.find('[data-test="schedule-card"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="dashboard-foundation-card"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="pilot-checklist-card"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="dashboard-ops-readiness-loading"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('운영 준비 정보를 확인하는 중입니다')
    expect(wrapper.text()).toContain('병원 정보, 기준 설정, 체크리스트를 불러오고 있습니다.')

    checklistDeferred.resolve({
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
          isOptional: false,
        },
        {
          key: 'schedule_foundation',
          title: '기준 장소와 근무 기준 설정',
          status: 'ready',
          route: '/schedule/step2',
          blockedReason: null,
          isOptional: false,
        },
        {
          key: 'employee_roster',
          title: '직원 로스터 준비',
          status: 'ready',
          route: '/schedule/step3',
          blockedReason: null,
          isOptional: false,
        },
        {
          key: 'off_request_policy',
          title: 'Off 사용 기준 설정',
          status: 'ready',
          route: '/ops/off-request-policy-setup',
          blockedReason: null,
          isOptional: true,
        },
        {
          key: 'schedule_review',
          title: '최종 검토 진입',
          status: 'ready',
          route: '/schedule/step5/sch_a1b2c3d4e5f6',
          blockedReason: null,
          isOptional: false,
        },
      ],
      fairnessSummary: [],
    })
    await flushPromises()

    expect(wrapper.find('[data-test="dashboard-ops-readiness-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="dashboard-create-schedule"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('월별 근무표 작업')
    expect(wrapper.find('[data-test="pilot-checklist-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="schedule-card"]').exists()).toBe(true)
  })

  it('surfaces the pilot checklist entry with deep links from the dashboard shell', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(getChecklistMock).toHaveBeenCalledWith('org-1')
    expect(wrapper.text()).toContain('운영 준비')
    expect(wrapper.text()).toContain('월별 근무표 작업')
    expect(wrapper.text()).toContain('운영 준비 체크리스트')
    expect(wrapper.text()).toContain('병원 정보 확인')
    expect(wrapper.text()).toContain('기준 장소와 근무 기준 설정')
    expect(wrapper.text()).toContain('직원 로스터 준비')
    expect(wrapper.text()).toContain('Off 사용 기준 설정')
    expect(wrapper.text()).toContain('최종 검토 진입')

    await wrapper.get('[data-test="pilot-checklist-link-organization_profile"]').trigger('click')
    await flushPromises()
    expect(pushMock).toHaveBeenCalledWith('/app/ops/organization-setup')

    pushMock.mockClear()
    setBasicInfoMock.mockClear()
    setSiteRequirementsMock.mockClear()
    resetMock.mockClear()
    await wrapper.get('[data-test="pilot-checklist-link-schedule_foundation"]').trigger('click')
    await flushPromises()
    expect(pushMock).toHaveBeenCalledWith({
      path: '/app/schedule/step2',
      query: {
        context: 'setup',
      },
    })
    expect(resetMock).not.toHaveBeenCalled()
    expect(setBasicInfoMock).not.toHaveBeenCalled()
    expect(setSiteRequirementsMock).not.toHaveBeenCalled()
    expect(scheduleStoreMock.currentStep).toBe(0)

    pushMock.mockClear()
    await wrapper.get('[data-test="pilot-checklist-item-schedule_foundation"]').trigger('click')
    await flushPromises()
    expect(pushMock).toHaveBeenCalledWith({
      path: '/app/schedule/step2',
      query: {
        context: 'setup',
      },
    })

    pushMock.mockClear()
    setBasicInfoMock.mockClear()
    setSiteRequirementsMock.mockClear()
    resetMock.mockClear()
    await wrapper.get('[data-test="pilot-checklist-link-employee_roster"]').trigger('click')
    await flushPromises()
    expect(pushMock).toHaveBeenCalledWith({
      path: '/app/schedule/step3',
      query: {
        context: 'setup',
      },
    })
    expect(resetMock).not.toHaveBeenCalled()
    expect(setBasicInfoMock).not.toHaveBeenCalled()
    expect(setSiteRequirementsMock).not.toHaveBeenCalled()
    expect(loadCanonicalSiteRequirementsMock).not.toHaveBeenCalled()
    expect(scheduleStoreMock.currentStep).toBe(0)

    pushMock.mockClear()
    await wrapper.get('[data-test="pilot-checklist-link-off_request_policy"]').trigger('click')
    await flushPromises()
    expect(pushMock).toHaveBeenCalledWith('/app/ops/off-request-policy-setup')

    pushMock.mockClear()
    await wrapper.get('[data-test="pilot-checklist-link-schedule_review"]').trigger('click')
    await flushPromises()
    expect(pushMock).toHaveBeenCalledWith(buildCanonicalStep5RouteLocation('sch_a1b2c3d4e5f6'))
  })

  it('treats the off-request policy item as optional while keeping the checklist ready', async () => {
    getChecklistMock.mockResolvedValueOnce({
      organizationId: 'org-1',
      checklistCursor: 'off_request_policy',
      ready: true,
      items: [
        {
          key: 'organization_profile',
          title: '병원 정보 확인',
          status: 'ready',
          route: '/ops/organization-setup',
          blockedReason: null,
          isOptional: false,
        },
        {
          key: 'schedule_foundation',
          title: '기준 장소와 근무 기준 설정',
          status: 'ready',
          route: '/schedule/step2',
          blockedReason: null,
          isOptional: false,
        },
        {
          key: 'employee_roster',
          title: '직원 로스터 준비',
          status: 'ready',
          route: '/schedule/step3',
          blockedReason: null,
          isOptional: false,
        },
        {
          key: 'off_request_policy',
          title: 'Off 사용 기준 설정',
          status: 'blocked',
          route: '/ops/off-request-policy-setup',
          blockedReason: '필요하면 나중에 설정할 수 있습니다.',
          isOptional: true,
        },
        {
          key: 'schedule_review',
          title: '최종 검토 진입',
          status: 'ready',
          route: '/schedule/step5/sch_a1b2c3d4e5f6',
          blockedReason: null,
          isOptional: false,
        },
      ],
      fairnessSummary: [],
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('준비 완료')
    expect(wrapper.text()).toContain('선택')
    expect(wrapper.text()).toContain('필요하면 나중에 설정할 수 있습니다.')
  })

  it('routes schedule foundation checklist entries to Step2 setup even when the backend route drifts to Step1', async () => {
    getChecklistMock.mockResolvedValueOnce({
      organizationId: 'org-1',
      checklistCursor: 'schedule_foundation',
      ready: false,
      items: [
        {
          key: 'organization_profile',
          title: '병원 정보 확인',
          status: 'ready',
          route: '/ops/organization-setup',
          blockedReason: null,
          isOptional: false,
        },
        {
          key: 'schedule_foundation',
          title: '사이트/근무 기본 설정',
          status: 'ready',
          route: '/schedule/step1',
          blockedReason: null,
          isOptional: false,
        },
        {
          key: 'employee_roster',
          title: '직원 로스터 준비',
          status: 'blocked',
          route: '/schedule/step3',
          blockedReason: '직원 로스터가 아직 등록되지 않았습니다.',
          isOptional: false,
        },
        {
          key: 'off_request_policy',
          title: 'Off 사용 기준 설정',
          status: 'blocked',
          route: '/ops/off-request-policy-setup',
          blockedReason: '필요하면 나중에 설정할 수 있습니다.',
          isOptional: true,
        },
        {
          key: 'schedule_review',
          title: '최종 검토 진입',
          status: 'blocked',
          route: null,
          blockedReason: '검토할 근무표가 아직 없습니다.',
          isOptional: false,
        },
      ],
      fairnessSummary: [],
    })

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.get('[data-test="pilot-checklist-item-schedule_foundation"]').trigger('click')
    await flushPromises()

    expect(pushMock).toHaveBeenCalledWith({
      path: '/app/schedule/step2',
      query: {
        context: 'setup',
      },
    })
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
      {
        id: `schedule-${organizationId}`,
        public_id: `sch-${organizationId}`,
        organization_id: organizationId,
        month: organizationId === 'org-2' ? '2026-01' : '2025-12',
        status: 'complete',
        hard_score: 10,
        soft_score: 20,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
    ])

    getChecklistMock.mockImplementation(async (organizationId: string) => ({
      organizationId,
      checklistCursor: 'schedule_review',
      ready: true,
      items: [],
      fairnessSummary: [],
    }))

    const wrapper = createWrapper()
    await flushPromises()

    expect(organizationStoreMock.loadOrganization).toHaveBeenCalledTimes(1)
    expect(getScheduleListMock).toHaveBeenCalledWith('org-1')
    expect(getChecklistMock).toHaveBeenCalledWith('org-1')
    expect(wrapper.text()).toContain('2025-12 근무표')

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
    expect(wrapper.text()).toContain('2026-01 근무표')
  })
})
