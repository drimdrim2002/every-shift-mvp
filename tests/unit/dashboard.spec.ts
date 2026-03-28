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
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  getScheduleListMock: vi.fn(),
  getPhase2ScheduleCompareMock: vi.fn(),
  resetMock: vi.fn(),
  setBasicInfoMock: vi.fn(),
  setSelectedVersionIdMock: vi.fn(),
  setPreviewVersionIdMock: vi.fn(),
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
  showError: vi.fn(),
}))

const organizationStoreMock = reactive({
  current: {
    id: 'org-1',
    name: '서울병원',
    type: 'hospital',
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
  loadOrganization: vi.fn(),
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
          template: '<div class="n-card-stub" @click="$emit(\'click\')"><slot name="header" /><slot /></div>',
        },
        NButton: {
          template: '<button @click="$emit(\'click\', $event)"><slot name="icon" /><slot /></button>',
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
})
