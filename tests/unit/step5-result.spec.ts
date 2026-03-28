import { mount, flushPromises } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const routeMock = reactive({
  params: {
    id: 'schedule-1',
  },
  query: {} as Record<string, string | undefined>,
})

const {
  pushMock,
  replaceMock,
  getPhase2ScheduleCompareMock,
  getScheduleStatusMock,
  getScheduleAssignmentsMock,
  getSchedulePreferencesMock,
  refreshPreferenceResolutionMock,
  resetPreferenceResolutionMock,
  updateAssignmentMock,
  deleteThisMonthAssignmentsMock,
  getPlanningEmployeesMock,
  getPlanningAssignmentsMock,
  showSuccessMock,
  showErrorMock,
  showInfoMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  getPhase2ScheduleCompareMock: vi.fn(),
  getScheduleStatusMock: vi.fn(),
  getScheduleAssignmentsMock: vi.fn(),
  getSchedulePreferencesMock: vi.fn(),
  refreshPreferenceResolutionMock: vi.fn(),
  resetPreferenceResolutionMock: vi.fn(),
  updateAssignmentMock: vi.fn(),
  deleteThisMonthAssignmentsMock: vi.fn(),
  getPlanningEmployeesMock: vi.fn(),
  getPlanningAssignmentsMock: vi.fn(),
  showSuccessMock: vi.fn(),
  showErrorMock: vi.fn(),
  showInfoMock: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
}))

vi.mock('@/api/schedule', () => ({
  getPhase2ScheduleCompare: getPhase2ScheduleCompareMock,
  getScheduleStatus: getScheduleStatusMock,
  getScheduleAssignments: getScheduleAssignmentsMock,
  getSchedulePreferences: getSchedulePreferencesMock,
  refreshPreferenceResolution: refreshPreferenceResolutionMock,
  resetPreferenceResolution: resetPreferenceResolutionMock,
  updateAssignment: updateAssignmentMock,
  deleteThisMonthAssignments: deleteThisMonthAssignmentsMock,
  getPlanningEmployees: getPlanningEmployeesMock,
  getPlanningAssignments: getPlanningAssignmentsMock,
}))

vi.mock('@/api/employee', () => ({
  loadSiteRequirements: vi.fn(),
}))

vi.mock('@/utils/solverMapper', () => ({
  mapToSolverRequest: vi.fn(),
}))

vi.mock('@/utils/excel', () => ({
  exportToExcel: vi.fn(),
}))

vi.mock('@/utils/message', () => ({
  showSuccess: showSuccessMock,
  showError: showErrorMock,
  showInfo: showInfoMock,
}))

vi.mock('@/api/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}))

const scheduleStoreMock = reactive({
  basicInfo: {
    scheduleId: 'schedule-1',
    month: '2025-12',
    organizationId: 'org-1',
    organizationName: '서울병원',
    organizationType: 'hospital',
    employeeCount: 1,
    shifts: [],
  },
  siteRequirements: [],
  setSiteRequirements: vi.fn(),
  setSelectedVersionId: vi.fn(),
  setPreviewVersionId: vi.fn(),
})

const organizationStoreMock = reactive({
  shifts: [
    {
      id: 'shift-1',
      code: 'D',
      colorCode: '#123456',
    },
  ],
  loadOrganization: vi.fn().mockResolvedValue(undefined),
})

const solverMock = {
  status: ref<'created' | 'running' | 'complete' | 'changed' | 'error'>('created'),
  hardScore: ref(0),
  softScore: ref(0),
  progress: ref(0),
  intermediateResults: ref<Record<string, Record<string, string>> | null>(null),
  startPolling: vi.fn(),
  stopPolling: vi.fn(),
  startSolver: vi.fn(),
}

const gridMock = {
  employees: ref([
    {
      id: 'emp-1',
      name: 'Kim',
    },
  ]),
  dates: ref([
    {
      date: '2025-12-01',
      isLastMonth: false,
    },
  ]),
  assignments: ref({}),
  offReasons: ref({}),
  loadEmployees: vi.fn().mockResolvedValue(undefined),
  generateDates: vi.fn(),
}

vi.mock('@/stores/schedule', () => ({
  useScheduleStore: () => scheduleStoreMock,
}))

vi.mock('@/stores/organization', () => ({
  useOrganizationStore: () => organizationStoreMock,
}))

vi.mock('@/composables/useAISolver', () => ({
  useAISolver: () => solverMock,
}))

vi.mock('@/composables/useScheduleGrid', () => ({
  useScheduleGrid: () => gridMock,
}))

vi.mock('@/components/schedule/StepIndicator.vue', () => ({
  default: { template: '<div />' },
}))

vi.mock('@/components/schedule/ScheduleGrid.vue', () => ({
  default: { template: '<div />' },
}))

import Step5Result from '@/views/schedule/Step5Result.vue'

function createWrapper() {
  return mount(Step5Result, {
    global: {
      stubs: {
        NCard: { template: '<div><slot /></div>' },
        NButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
        NBadge: { template: '<div />' },
        NProgress: { template: '<div />' },
        NAlert: { template: '<div><slot /></div>' },
        NSlider: { template: '<div />' },
      },
    },
  })
}

describe('Step5Result', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeMock.params.id = 'schedule-1'
    routeMock.query = {}
    scheduleStoreMock.basicInfo = {
      scheduleId: 'schedule-1',
      month: '2025-12',
      organizationId: 'org-1',
      organizationName: '서울병원',
      organizationType: 'hospital',
      employeeCount: 1,
      shifts: [],
    }

    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      versions: [
        {
          id: 'version-1',
          scheduleId: 'schedule-1',
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
          scheduleId: 'schedule-1',
          versionNo: 2,
          name: 'V2',
          sourceType: 're_solve',
          baseVersionId: 'version-1',
          status: 'review_ready',
          currentRevision: 2,
          manualEditCount: 1,
          inputDiffSummary: {
            changedOffRequests: 1,
            changedLockedAssignments: 0,
            changedSiteRequirements: 0,
            note: 'selected',
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
    getScheduleStatusMock.mockResolvedValue({
      status: 'created',
      hard_score: null,
      soft_score: null,
      solver_execution_id: null,
    })
    getScheduleAssignmentsMock.mockResolvedValue({
      assignments: {},
      offReasons: {},
      comments: {},
    })
    getSchedulePreferencesMock.mockResolvedValue({
      constraints: {},
      notes: {},
      preferences: [],
    })
    refreshPreferenceResolutionMock.mockResolvedValue([])
    resetPreferenceResolutionMock.mockResolvedValue(undefined)
    updateAssignmentMock.mockResolvedValue(undefined)
    deleteThisMonthAssignmentsMock.mockResolvedValue(undefined)
    getPlanningEmployeesMock.mockResolvedValue([])
    getPlanningAssignmentsMock.mockResolvedValue([])
  })

  it('hydrates selected and preview from compare while preserving a valid deep-linked preview', async () => {
    routeMock.query = {
      version: 'version-1',
    }

    createWrapper()
    await flushPromises()

    expect(getPhase2ScheduleCompareMock).toHaveBeenCalledWith('schedule-1')
    expect(scheduleStoreMock.setSelectedVersionId).toHaveBeenCalledWith('version-2')
    expect(scheduleStoreMock.setPreviewVersionId).toHaveBeenCalledWith('version-1')
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('self-heals legacy Step5 URLs without a preview query', async () => {
    createWrapper()
    await flushPromises()

    expect(getPhase2ScheduleCompareMock).toHaveBeenCalledWith('schedule-1')
    expect(scheduleStoreMock.setSelectedVersionId).toHaveBeenCalledWith('version-2')
    expect(scheduleStoreMock.setPreviewVersionId).toHaveBeenCalledWith('version-2')
    expect(replaceMock).toHaveBeenCalledWith({
      path: '/schedule/step5/schedule-1',
      query: {
        version: 'version-2',
      },
    })
  })
})
