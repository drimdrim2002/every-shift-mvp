import { mount, flushPromises } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
    from: vi.fn(),
  },
}))

vi.mock('@/utils/message', () => ({
  showSuccess: vi.fn(),
  showError: showErrorMock,
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
          template: '<div><slot /></div>',
        },
        NForm: {
          template: '<form><slot /></form>',
        },
        NFormItem: {
          template: '<div><slot /></div>',
        },
        NSelect: {
          template: '<select />',
        },
      },
    },
  })
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
          route: '/schedule/step5/sch_a1b2c3d4e5f6',
          blockedReason: null,
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
    expect(pushMock).toHaveBeenCalledWith({
      path: '/schedule/step5/sch_a1b2c3d4e5f6',
    })
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
    expect(pushMock).not.toHaveBeenCalledWith('/schedule/step5/sch_a1b2c3d4e5f6')
    expect(pushMock).not.toHaveBeenCalledWith({
      path: '/schedule/step5/sch_a1b2c3d4e5f6',
    })
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
        },
        {
          key: 'schedule_foundation',
          title: '기준 장소와 근무 기준 설정',
          status: 'blocked',
          route: '/schedule/step2',
          blockedReason: '기준 장소, 휴식시간, 시프트, 인력 기준 설정을 먼저 완료해주세요.',
        },
        {
          key: 'employee_roster',
          title: '직원 로스터 준비',
          status: 'blocked',
          route: '/schedule/step3',
          blockedReason: '직원 로스터가 아직 등록되지 않았습니다.',
        },
        {
          key: 'off_request_policy',
          title: 'Off 사용 기준 설정',
          status: 'blocked',
          route: '/ops/off-request-policy-setup',
          blockedReason: '공통 기준의 월간/연간 Off 사용 기준을 먼저 설정해주세요.',
        },
        {
          key: 'schedule_review',
          title: '최종 검토 진입',
          status: 'blocked',
          route: null,
          blockedReason: '검토할 근무표가 아직 없습니다.',
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

    expect(pushMock).toHaveBeenCalledWith('/ops/organization-setup')
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
        },
        {
          key: 'schedule_foundation',
          title: '기준 장소와 근무 기준 설정',
          status: 'blocked',
          route: '/schedule/step2',
          blockedReason: '기준 장소, 휴식시간, 시프트, 인력 기준 설정을 먼저 완료해주세요.',
        },
        {
          key: 'employee_roster',
          title: '직원 로스터 준비',
          status: 'blocked',
          route: '/schedule/step3',
          blockedReason: '직원 로스터가 아직 등록되지 않았습니다.',
        },
        {
          key: 'off_request_policy',
          title: 'Off 사용 기준 설정',
          status: 'blocked',
          route: '/ops/off-request-policy-setup',
          blockedReason: '공통 기준의 월간/연간 Off 사용 기준을 먼저 설정해주세요.',
        },
        {
          key: 'schedule_review',
          title: '최종 검토 진입',
          status: 'blocked',
          route: null,
          blockedReason: '검토할 근무표가 아직 없습니다.',
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
      path: '/schedule/step2',
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
      path: '/schedule/step2',
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
      path: '/schedule/step2',
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
        },
        {
          key: 'schedule_foundation',
          title: '기준 장소와 근무 기준 설정',
          status: 'blocked',
          route: '/schedule/step2',
          blockedReason: '기준 장소, 휴식시간, 시프트, 인력 기준 설정을 먼저 완료해주세요.',
        },
        {
          key: 'employee_roster',
          title: '직원 로스터 준비',
          status: 'blocked',
          route: '/schedule/step3',
          blockedReason: '직원 로스터가 아직 등록되지 않았습니다.',
        },
        {
          key: 'off_request_policy',
          title: 'Off 사용 기준 설정',
          status: 'blocked',
          route: '/ops/off-request-policy-setup',
          blockedReason: '공통 기준의 월간/연간 Off 사용 기준을 먼저 설정해주세요.',
        },
        {
          key: 'schedule_review',
          title: '최종 검토 진입',
          status: 'blocked',
          route: null,
          blockedReason: '검토할 근무표가 아직 없습니다.',
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
    expect(pushMock).toHaveBeenCalledWith('/ops/organization-setup')

    pushMock.mockClear()
    setBasicInfoMock.mockClear()
    setSiteRequirementsMock.mockClear()
    resetMock.mockClear()
    await wrapper.get('[data-test="pilot-checklist-link-schedule_foundation"]').trigger('click')
    await flushPromises()
    expect(pushMock).toHaveBeenCalledWith({
      path: '/schedule/step2',
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
      path: '/schedule/step2',
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
      path: '/schedule/step3',
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
    expect(pushMock).toHaveBeenCalledWith('/ops/off-request-policy-setup')

    pushMock.mockClear()
    await wrapper.get('[data-test="pilot-checklist-link-schedule_review"]').trigger('click')
    await flushPromises()
    expect(pushMock).toHaveBeenCalledWith({
      path: '/schedule/step5/sch_a1b2c3d4e5f6',
    })
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
        },
        {
          key: 'schedule_foundation',
          title: '사이트/근무 기본 설정',
          status: 'ready',
          route: '/schedule/step1',
          blockedReason: null,
        },
        {
          key: 'employee_roster',
          title: '직원 로스터 준비',
          status: 'blocked',
          route: '/schedule/step3',
          blockedReason: '직원 로스터가 아직 등록되지 않았습니다.',
        },
        {
          key: 'off_request_policy',
          title: 'Off 사용 기준 설정',
          status: 'blocked',
          route: '/ops/off-request-policy-setup',
          blockedReason: '공통 기준의 월간/연간 Off 사용 기준을 먼저 설정해주세요.',
        },
        {
          key: 'schedule_review',
          title: '최종 검토 진입',
          status: 'blocked',
          route: null,
          blockedReason: '검토할 근무표가 아직 없습니다.',
        },
      ],
      fairnessSummary: [],
    })

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.get('[data-test="pilot-checklist-item-schedule_foundation"]').trigger('click')
    await flushPromises()

    expect(pushMock).toHaveBeenCalledWith({
      path: '/schedule/step2',
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
