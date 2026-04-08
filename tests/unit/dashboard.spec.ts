import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  pushMock,
  getScheduleListMock,
  getPhase2ScheduleCompareMock,
  resetMock,
  setBasicInfoMock,
  setSelectedVersionIdMock,
  setPreviewVersionIdMock,
  showErrorMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  getScheduleListMock: vi.fn(),
  getPhase2ScheduleCompareMock: vi.fn(),
  resetMock: vi.fn(),
  setBasicInfoMock: vi.fn(),
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
  foundationSites: [],
  foundationLoading: false,
  loadOrganization: vi.fn(),
  loadFoundationData: vi.fn(),
})

const scheduleStoreMock = reactive({
  reset: resetMock,
  setBasicInfo: setBasicInfoMock,
  setSelectedVersionId: setSelectedVersionIdMock,
  setPreviewVersionId: setPreviewVersionIdMock,
})

vi.mock('@/stores/organization', () => ({
  useOrganizationStore: () => organizationStoreMock,
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
    organizationStoreMock.foundationSites = []
    organizationStoreMock.foundationLoading = false
    organizationStoreMock.loadOrganization.mockResolvedValue({ success: true })
    organizationStoreMock.loadFoundationData.mockResolvedValue({ success: true })
    getScheduleListMock.mockResolvedValue([
      {
        id: 'schedule-123',
        organization_id: 'org-1',
        month: '2025-12',
        status: 'complete',
        hard_score: 10,
        soft_score: 20,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
    ])
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-123',
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
        organization_id: 'org-1',
        month: '2025-12',
        status: 'complete',
        hard_score: 10,
        soft_score: 20,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      })
    await flushPromises()

    expect(getPhase2ScheduleCompareMock).toHaveBeenCalledWith('schedule-123')
    expect(setSelectedVersionIdMock).toHaveBeenCalledWith('version-2')
    expect(setPreviewVersionIdMock).toHaveBeenCalledWith('version-2')
    expect(pushMock).toHaveBeenCalledWith({
      path: '/schedule/step5/schedule-123',
      query: {
        version: 'version-2',
      },
    })
  })

  it('blocks navigation and shows an error when compare fails', async () => {
    getPhase2ScheduleCompareMock.mockRejectedValue(new Error('compare failed'))

    const wrapper = createWrapper()
    await flushPromises()

    await (wrapper.vm as unknown as { handleViewSchedule: (schedule: unknown) => Promise<void> })
      .handleViewSchedule({
        id: 'schedule-123',
        organization_id: 'org-1',
        month: '2025-12',
        status: 'complete',
        hard_score: 10,
        soft_score: 20,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      })
    await flushPromises()

    expect(getPhase2ScheduleCompareMock).toHaveBeenCalledWith('schedule-123')
    expect(showErrorMock).toHaveBeenCalledWith('선택한 근무표 버전을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.')
    expect(pushMock).not.toHaveBeenCalledWith('/schedule/step5/schedule-123')
    expect(pushMock).not.toHaveBeenCalledWith({
      path: '/schedule/step5/schedule-123',
      query: {
        version: 'version-2',
      },
    })
  })

  it('renders a foundation readiness card and deep-links to the setup screen when setup is incomplete', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('조직/사이트 기본 설정이 아직 완료되지 않았습니다')

    await wrapper.get('[data-test="dashboard-foundation-setup"]').trigger('click')

    expect(pushMock).toHaveBeenCalledWith('/ops/organization-setup')
  })

  it('renders foundation completion state when organization confirmation and an active site are present', async () => {
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
    organizationStoreMock.foundationSites = [
      {
        id: 'site-1',
        organizationId: 'org-1',
        code: 'MAIN',
        name: '본관',
        isActive: true,
        isScheduleActive: true,
      },
    ]

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('조직/사이트 기본 설정이 완료되었습니다')
    expect(wrapper.find('[data-test="dashboard-foundation-setup"]').exists()).toBe(false)
  })
})
