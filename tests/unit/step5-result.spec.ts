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
  getScheduleVersionAssignmentsMock,
  getScheduleVersionPreferencesMock,
  createPhase2ScheduleVersionMock,
  patchPhase2ScheduleVersionAssignmentsMock,
  refreshPreferenceResolutionByVersionMock,
  resetPreferenceResolutionByVersionMock,
  submitPhase2ScheduleVersionSolverResultMock,
  deleteThisMonthVersionAssignmentsMock,
  getPlanningEmployeesMock,
  getPlanningAssignmentsForVersionMock,
  showSuccessMock,
  showErrorMock,
  showInfoMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  getPhase2ScheduleCompareMock: vi.fn(),
  getScheduleStatusMock: vi.fn(),
  getScheduleVersionAssignmentsMock: vi.fn(),
  getScheduleVersionPreferencesMock: vi.fn(),
  createPhase2ScheduleVersionMock: vi.fn(),
  patchPhase2ScheduleVersionAssignmentsMock: vi.fn(),
  refreshPreferenceResolutionByVersionMock: vi.fn(),
  resetPreferenceResolutionByVersionMock: vi.fn(),
  submitPhase2ScheduleVersionSolverResultMock: vi.fn(),
  deleteThisMonthVersionAssignmentsMock: vi.fn(),
  getPlanningEmployeesMock: vi.fn(),
  getPlanningAssignmentsForVersionMock: vi.fn(),
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
  createPhase2ScheduleVersion: createPhase2ScheduleVersionMock,
  getPhase2ScheduleCompare: getPhase2ScheduleCompareMock,
  patchPhase2ScheduleVersionAssignments: patchPhase2ScheduleVersionAssignmentsMock,
  getScheduleStatus: getScheduleStatusMock,
  getScheduleVersionAssignments: getScheduleVersionAssignmentsMock,
  getScheduleVersionPreferences: getScheduleVersionPreferencesMock,
  refreshPreferenceResolutionByVersion: refreshPreferenceResolutionByVersionMock,
  resetPreferenceResolutionByVersion: resetPreferenceResolutionByVersionMock,
  submitPhase2ScheduleVersionSolverResult: submitPhase2ScheduleVersionSolverResultMock,
  deleteThisMonthVersionAssignments: deleteThisMonthVersionAssignmentsMock,
  getPlanningEmployees: getPlanningEmployeesMock,
  getPlanningAssignmentsForVersion: getPlanningAssignmentsForVersionMock,
}))

vi.mock('@/api/employee', () => ({
  loadSiteRequirements: vi.fn(),
}))

vi.mock('@/utils/solverMapper', () => ({
  mapToSolverRequest: vi.fn(() => ({})),
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
  selectedVersionId: null as string | null,
  previewVersionId: null as string | null,
  setSiteRequirements: vi.fn(),
  setSelectedVersionId: vi.fn((value: string | null) => {
    scheduleStoreMock.selectedVersionId = value
  }),
  setPreviewVersionId: vi.fn((value: string | null) => {
    scheduleStoreMock.previewVersionId = value
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

const authStoreMock = reactive({
  user: {
    id: 'user-1',
  } as { id: string } | null,
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

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => authStoreMock,
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
  default: {
    emits: ['update:assignment'],
    template: `<button data-test="grid-edit" @click="$emit('update:assignment', { employeeId: 'emp-1', date: '2025-12-01', shiftCode: 'D' })">grid-edit</button>`,
  },
}))

import Step5Result from '@/views/schedule/Step5Result.vue'

function createWrapper() {
  return mount(Step5Result, {
    global: {
      stubs: {
        NCard: { template: '<div><slot /></div>' },
        NButton: { props: ['disabled'], template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
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
    scheduleStoreMock.selectedVersionId = null
    scheduleStoreMock.previewVersionId = null
    authStoreMock.user = {
      id: 'user-1',
    }
    solverMock.status.value = 'created'
    solverMock.hardScore.value = 0
    solverMock.softScore.value = 0
    solverMock.progress.value = 0
    solverMock.intermediateResults.value = null
    solverMock.startSolver.mockResolvedValue('exec-1')
    ;(window as unknown as { $dialog?: Record<string, unknown> }).$dialog = {
      info: vi.fn(),
      warning: vi.fn(),
    }

    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
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
    refreshPreferenceResolutionByVersionMock.mockResolvedValue([])
    resetPreferenceResolutionByVersionMock.mockResolvedValue(undefined)
    createPhase2ScheduleVersionMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      createdVersionId: 'version-3',
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      versions: [
        {
          id: 'version-1',
          status: 'draft',
        },
        {
          id: 'version-2',
          status: 'review_ready',
        },
        {
          id: 'version-3',
          status: 'draft',
        },
      ],
    })
    patchPhase2ScheduleVersionAssignmentsMock.mockResolvedValue({
      scheduleVersionId: 'version-2',
      status: 'review_pending',
      currentRevision: 3,
      manualEditCount: 2,
      changedCells: 1,
    })
    submitPhase2ScheduleVersionSolverResultMock.mockResolvedValue({
      scheduleVersionId: 'version-2',
      status: 'solve_failed',
      solverExecutionId: null,
      hardScore: null,
      softScore: null,
      failureReason: 'manual_recovery_reset',
    })
    deleteThisMonthVersionAssignmentsMock.mockResolvedValue(undefined)
    getPlanningEmployeesMock.mockResolvedValue([])
    getPlanningAssignmentsForVersionMock.mockResolvedValue([])
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

  it('loads preview data by previewVersionId and allows mutation when preview status is editable', async () => {
    routeMock.query = {
      version: 'version-1',
    }

    const wrapper = createWrapper()
    await flushPromises()

    expect(getScheduleVersionPreferencesMock).toHaveBeenCalledWith('version-1')
    expect(getScheduleVersionAssignmentsMock).toHaveBeenCalledWith('version-1')

    const startSolverButton = wrapper.findAll('button')
      .find((button) => button.text().includes('근무표 생성 (AI)'))

    expect(startSolverButton).toBeTruthy()
    expect(startSolverButton?.attributes('disabled')).toBeUndefined()
  })

  it('locks mutation controls when preview version status is solving', async () => {
    routeMock.query = {
      version: 'version-1',
    }
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      activeSolvingVersionId: 'version-1',
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

    const wrapper = createWrapper()
    await flushPromises()

    const startSolverButton = wrapper.findAll('button')
      .find((button) => button.text().includes('근무표 생성 (AI)'))

    expect(startSolverButton).toBeTruthy()
    expect(startSolverButton?.attributes('disabled')).toBeDefined()
  })

  it('does not resume polling when compare has no activeSolvingVersionId even if legacy schedule.status is running', async () => {
    getScheduleStatusMock.mockResolvedValue({
      status: 'running',
      hard_score: 11,
      soft_score: 22,
      solver_execution_id: 'legacy-exec-1',
    })

    createWrapper()
    await flushPromises()

    expect(solverMock.startPolling).not.toHaveBeenCalled()
    expect(solverMock.status.value).toBe('complete')
  })

  it('shows another_version_solving guidance and refreshes compare after conflict', async () => {
    scheduleStoreMock.siteRequirements = [
      {
        dayOfWeek: 1,
        shiftCode: 'D',
        requiredCount: 1,
      },
    ]

    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
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
          status: 'draft',
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

    solverMock.startSolver.mockRejectedValue({
      code: 'another_version_solving',
      message: 'another_version_solving',
      status: 409,
    })

    const wrapper = createWrapper()
    await flushPromises()

    const startSolverButton = wrapper.findAll('button')
      .find((button) => button.text().includes('근무표 생성 (AI)'))
    expect(startSolverButton).toBeTruthy()

    await startSolverButton!.trigger('click')
    await flushPromises()

    expect(showErrorMock).toHaveBeenCalledWith('다른 버전이 생성 중입니다. 완료 후 다시 시도해주세요.')
    expect(getPhase2ScheduleCompareMock.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('forces solver reset when preview version remains solving', async () => {
    routeMock.query = {
      version: 'version-1',
    }

    getPhase2ScheduleCompareMock
      .mockResolvedValueOnce({
        scheduleId: 'schedule-1',
        selectedVersionId: 'version-1',
        finalizedVersionId: null,
        activeSolvingVersionId: 'version-1',
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
            activeSolverExecutionId: 'exec-live',
            isSelected: true,
            isFinalized: false,
          },
        ],
      })
      .mockResolvedValueOnce({
        scheduleId: 'schedule-1',
        selectedVersionId: 'version-1',
        finalizedVersionId: null,
        activeSolvingVersionId: 'version-1',
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
            activeSolverExecutionId: 'exec-live',
            isSelected: true,
            isFinalized: false,
          },
        ],
      })
      .mockResolvedValueOnce({
        scheduleId: 'schedule-1',
        selectedVersionId: 'version-1',
        finalizedVersionId: null,
        activeSolvingVersionId: null,
        versions: [
          {
            id: 'version-1',
            scheduleId: 'schedule-1',
            versionNo: 1,
            name: 'V1',
            sourceType: 'initial_solve',
            baseVersionId: null,
            status: 'solve_failed',
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
            isSelected: true,
            isFinalized: false,
          },
        ],
      })

    getScheduleStatusMock.mockResolvedValue({
      status: 'running',
      hard_score: null,
      soft_score: null,
      solver_execution_id: 'exec-live',
    })

    const wrapper = createWrapper()
    await flushPromises()

    const forceResetButton = wrapper.findAll('button')
      .find((button) => button.text().includes('생성 중단 후 초기화'))
    expect(forceResetButton).toBeTruthy()

    await forceResetButton!.trigger('click')
    await flushPromises()

    expect(submitPhase2ScheduleVersionSolverResultMock).toHaveBeenCalledWith('version-1', {
      status: 'failed',
      solverExecutionId: 'exec-live',
      assignments: [],
      score: null,
      failureReason: 'manual_recovery_reset',
    })
    expect(showSuccessMock).toHaveBeenCalledWith('생성 상태를 초기화했습니다. 다시 생성을 시도할 수 있습니다.')
  })

  it('re-solve creates a new preview candidate without changing selected version', async () => {
    solverMock.status.value = 'complete'
    getScheduleStatusMock.mockResolvedValue({
      status: 'complete',
      hard_score: 11,
      soft_score: 22,
      solver_execution_id: null,
    })
    scheduleStoreMock.siteRequirements = [
      {
        dayOfWeek: 1,
        shiftCode: 'D',
        requiredCount: 1,
      },
    ]

    const wrapper = createWrapper()
    await flushPromises()

    const regenerateButton = wrapper.findAll('button')
      .find((button) => button.text().includes('더 개선하기'))
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
    expect(scheduleStoreMock.selectedVersionId).toBe('version-2')
    expect(scheduleStoreMock.previewVersionId).toBe('version-3')
    expect(solverMock.startSolver).toHaveBeenCalledWith(
      'version-3',
      expect.any(Object)
    )
  })

  it('saves manual changes through preview-version patch route', async () => {
    getScheduleStatusMock.mockResolvedValue({
      status: 'complete',
      hard_score: 11,
      soft_score: 22,
      solver_execution_id: null,
    })

    const dialogInfoMock = vi.fn((options: { onPositiveClick?: () => Promise<void> | void }) => {
      options.onPositiveClick?.()
    })
    ;(window as unknown as { $dialog?: Record<string, unknown> }).$dialog = {
      info: dialogInfoMock,
      warning: vi.fn(),
    }

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.get('[data-test="grid-edit"]').trigger('click')
    await flushPromises()

    const saveButton = wrapper.findAll('button')
      .find((button) => button.text().trim() === '저장')
    expect(saveButton).toBeTruthy()

    await saveButton!.trigger('click')
    await flushPromises()

    expect(patchPhase2ScheduleVersionAssignmentsMock).toHaveBeenCalledTimes(1)
    expect(patchPhase2ScheduleVersionAssignmentsMock).toHaveBeenCalledWith(
      'version-2',
      {
        changes: [
          {
            employeeId: 'emp-1',
            date: '2025-12-01',
            shiftId: 'shift-1',
          },
        ],
      }
    )
    expect(showSuccessMock).toHaveBeenCalledWith('저장되었습니다')
  })
})
