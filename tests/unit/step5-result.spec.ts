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
  dialogInfoMock,
  dialogWarningMock,
  getPhase2ScheduleCompareMock,
  getScheduleStatusMock,
  getScheduleVersionAssignmentsMock,
  getScheduleVersionPreferencesMock,
  refreshScheduleVersionPreferenceResolutionMock,
  resetScheduleVersionPreferenceResolutionMock,
  createPhase2ScheduleVersionMock,
  patchPhase2ScheduleVersionAssignmentsMock,
  deleteThisMonthAssignmentsMock,
  getPlanningEmployeesMock,
  getPlanningAssignmentsForVersionMock,
  mapToSolverRequestMock,
  loadSiteRequirementsMock,
  showSuccessMock,
  showErrorMock,
  showInfoMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  dialogInfoMock: vi.fn(),
  dialogWarningMock: vi.fn(),
  getPhase2ScheduleCompareMock: vi.fn(),
  getScheduleStatusMock: vi.fn(),
  getScheduleVersionAssignmentsMock: vi.fn(),
  getScheduleVersionPreferencesMock: vi.fn(),
  refreshScheduleVersionPreferenceResolutionMock: vi.fn(),
  resetScheduleVersionPreferenceResolutionMock: vi.fn(),
  createPhase2ScheduleVersionMock: vi.fn(),
  patchPhase2ScheduleVersionAssignmentsMock: vi.fn(),
  deleteThisMonthAssignmentsMock: vi.fn(),
  getPlanningEmployeesMock: vi.fn(),
  getPlanningAssignmentsForVersionMock: vi.fn(),
  mapToSolverRequestMock: vi.fn(),
  loadSiteRequirementsMock: vi.fn(),
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
  getScheduleVersionAssignments: getScheduleVersionAssignmentsMock,
  getScheduleVersionPreferences: getScheduleVersionPreferencesMock,
  refreshScheduleVersionPreferenceResolution: refreshScheduleVersionPreferenceResolutionMock,
  resetScheduleVersionPreferenceResolution: resetScheduleVersionPreferenceResolutionMock,
  createPhase2ScheduleVersion: createPhase2ScheduleVersionMock,
  patchPhase2ScheduleVersionAssignments: patchPhase2ScheduleVersionAssignmentsMock,
  deleteThisMonthAssignments: deleteThisMonthAssignmentsMock,
  getPlanningEmployees: getPlanningEmployeesMock,
  getPlanningAssignmentsForVersion: getPlanningAssignmentsForVersionMock,
}))

vi.mock('@/api/employee', () => ({
  loadSiteRequirements: loadSiteRequirementsMock,
}))

vi.mock('@/utils/solverMapper', () => ({
  mapToSolverRequest: mapToSolverRequestMock,
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
  siteRequirements: [
    {
      dayOfWeek: 1,
      shiftCode: 'D',
      requiredCount: 1,
    },
  ],
  selectedVersionId: null as string | null,
  previewVersionId: null as string | null,
  setSiteRequirements: vi.fn((requirements) => {
    scheduleStoreMock.siteRequirements = requirements
  }),
  setSelectedVersionId: vi.fn((versionId: string | null) => {
    scheduleStoreMock.selectedVersionId = versionId
  }),
  setPreviewVersionId: vi.fn((versionId: string | null) => {
    scheduleStoreMock.previewVersionId = versionId
  }),
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
        ScheduleGrid: {
          template:
            '<div><button class="emit-assignment" @click="$emit(\'update:assignment\', { employeeId: \'emp-1\', date: \'2025-12-01\', shiftCode: \'D\' })">emit-assignment</button></div>',
        },
      },
    },
  })
}

describe('Step5Result', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dialogInfoMock.mockImplementation((options?: { onPositiveClick?: () => void }) => {
      options?.onPositiveClick?.()
    })
    dialogWarningMock.mockImplementation((options?: { onPositiveClick?: () => void }) => {
      options?.onPositiveClick?.()
    })
    ;(window as Window & {
      $dialog?: {
        info: typeof dialogInfoMock
        warning: typeof dialogWarningMock
      }
    }).$dialog = {
      info: dialogInfoMock,
      warning: dialogWarningMock,
    }
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
    scheduleStoreMock.selectedVersionId = null
    scheduleStoreMock.previewVersionId = null

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
          activeSolverExecutionId: null,
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
          activeSolverExecutionId: null,
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
    getScheduleVersionAssignmentsMock.mockResolvedValue({
      assignments: {},
      offReasons: {},
      comments: {},
    })
    getScheduleVersionPreferencesMock.mockResolvedValue({
      constraints: {},
      notes: {},
      preferences: [],
    })
    refreshScheduleVersionPreferenceResolutionMock.mockResolvedValue([])
    resetScheduleVersionPreferenceResolutionMock.mockResolvedValue(undefined)
    createPhase2ScheduleVersionMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      createdVersionId: 'version-3',
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      versions: [],
    })
    patchPhase2ScheduleVersionAssignmentsMock.mockResolvedValue(undefined)
    deleteThisMonthAssignmentsMock.mockResolvedValue(undefined)
    getPlanningEmployeesMock.mockResolvedValue([])
    getPlanningAssignmentsForVersionMock.mockResolvedValue([])
    mapToSolverRequestMock.mockReturnValue({
      organization: {
        id: 'org-1',
        name: '서울병원',
        type: 'hospital',
        shifts: [],
        lastHistoricalDate: '2025-11-30',
        firstDraftDate: '2025-12-01',
        publishLength: 5,
        draftLength: 31,
      },
      employees: [],
      history: [],
      undesirable: [],
      requirements: [],
    })
    loadSiteRequirementsMock.mockResolvedValue(scheduleStoreMock.siteRequirements)
    solverMock.status.value = 'created'
    solverMock.startSolver.mockResolvedValue('exec-1')
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

  it('loads Step5 data through preview version-scoped helpers', async () => {
    routeMock.query = {
      version: 'version-1',
    }

    createWrapper()
    await flushPromises()

    expect(getScheduleVersionPreferencesMock).toHaveBeenCalledWith('version-1')
    expect(getScheduleVersionAssignmentsMock).toHaveBeenCalledWith('version-1')
  })

  it('canonicalizes to the authoritative running version before resume polling even when the legacy mirror is stale', async () => {
    routeMock.query = {
      version: 'version-1',
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
          activeSolverExecutionId: null,
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
          status: 'solving',
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
          activeSolverExecutionId: 'exec-running',
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

    createWrapper()
    await flushPromises()

    expect(scheduleStoreMock.setPreviewVersionId).toHaveBeenCalledWith('version-2')
    expect(replaceMock).toHaveBeenCalledWith({
      path: '/schedule/step5/schedule-1',
      query: {
        version: 'version-2',
      },
    })
    expect(solverMock.startPolling).toHaveBeenCalledWith('exec-running', {
      versionId: 'version-2',
      month: '2025-12',
    })
  })

  it('does not resume polling when compare exposes no running version even if the legacy mirror says running', async () => {
    getScheduleStatusMock.mockResolvedValue({
      status: 'running',
      hard_score: null,
      soft_score: null,
      solver_execution_id: 'legacy-exec',
    })

    createWrapper()
    await flushPromises()

    expect(solverMock.startPolling).not.toHaveBeenCalled()
    expect(showErrorMock).not.toHaveBeenCalledWith(
      '실행 중 버전 상태가 일치하지 않습니다. 새로고침 후 다시 시도해주세요.'
    )
  })

  it('fails closed when compare exposes multiple running versions', async () => {
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
          status: 'solving',
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
          activeSolverExecutionId: 'exec-1',
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
          status: 'solving',
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
          activeSolverExecutionId: 'exec-2',
          isSelected: true,
          isFinalized: false,
        },
      ],
    })
    getScheduleStatusMock.mockResolvedValue({
      status: 'running',
      hard_score: null,
      soft_score: null,
      solver_execution_id: 'legacy-exec',
    })

    createWrapper()
    await flushPromises()

    expect(solverMock.startPolling).not.toHaveBeenCalled()
    expect(showErrorMock).toHaveBeenCalledWith('실행 중 버전 상태가 일치하지 않습니다. 새로고침 후 다시 시도해주세요.')
  })

  it('regenerates by creating a new version, canonicalizing the query, and starting solver on that version', async () => {
    routeMock.query = {
      version: 'version-2',
    }

    const wrapper = createWrapper()
    await flushPromises()

    solverMock.status.value = 'complete'
    await flushPromises()

    const regenerateButton = wrapper.findAll('button').find((button) => button.text() === '더 개선하기')
    expect(regenerateButton).toBeTruthy()

    await regenerateButton!.trigger('click')
    await flushPromises()

    expect(createPhase2ScheduleVersionMock).toHaveBeenCalledWith('schedule-1', {
      baseVersionId: 'version-2',
      name: null,
      sourceType: 're_solve',
      inputDiffSummary: {
        changedOffRequests: 0,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: null,
      },
    })
    expect(scheduleStoreMock.setPreviewVersionId).toHaveBeenCalledWith('version-3')
    expect(replaceMock).toHaveBeenCalledWith({
      path: '/schedule/step5/schedule-1',
      query: {
        version: 'version-3',
      },
    })
    expect(solverMock.startSolver).toHaveBeenCalledWith({
      versionId: 'version-3',
      month: '2025-12',
      solverRequest: mapToSolverRequestMock.mock.results[0]?.value,
    })
    expect(resetScheduleVersionPreferenceResolutionMock).not.toHaveBeenCalled()
  })

  it('starts solver without calling the frontend preference reset helper', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    const startButton = wrapper.findAll('button').find((button) => button.text() === '근무표 생성 (AI)')
    expect(startButton).toBeTruthy()

    await startButton!.trigger('click')
    await flushPromises()

    expect(resetScheduleVersionPreferenceResolutionMock).not.toHaveBeenCalled()
    expect(solverMock.startSolver).toHaveBeenCalledWith({
      versionId: 'version-2',
      month: '2025-12',
      solverRequest: mapToSolverRequestMock.mock.results[0]?.value,
    })
  })

  it('saves manual edits without calling the frontend preference refresh helper', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    solverMock.status.value = 'complete'
    await flushPromises()

    await wrapper.find('button.emit-assignment').trigger('click')
    await flushPromises()

    const saveButton = wrapper.findAll('button').find((button) => button.text() === '저장')
    expect(saveButton).toBeTruthy()

    await saveButton!.trigger('click')
    await flushPromises()

    expect(patchPhase2ScheduleVersionAssignmentsMock).toHaveBeenCalledWith('version-2', {
      changes: [
        {
          employeeId: 'emp-1',
          date: '2025-12-01',
          shiftId: 'shift-1',
          isLocked: false,
        },
      ],
    })
    expect(refreshScheduleVersionPreferenceResolutionMock).not.toHaveBeenCalled()
  })
})
