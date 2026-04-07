import dayjs from 'dayjs'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
  getPhase2ScheduleReviewMock,
  getScheduleStatusMock,
  getScheduleVersionAssignmentsMock,
  getScheduleVersionPreferencesMock,
  getPreviousMonthFinalizedContextMock,
  selectPhase2ScheduleVersionMock,
  recheckPhase2ScheduleVersionMock,
  finalizePhase2ScheduleVersionMock,
  createPhase2ScheduleVersionMock,
  patchPhase2ScheduleVersionAssignmentsMock,
  refreshPreferenceResolutionByVersionMock,
  resetPreferenceResolutionByVersionMock,
  submitPhase2ScheduleVersionSolverResultMock,
  deleteThisMonthVersionAssignmentsMock,
  getPlanningEmployeesMock,
  getPlanningAssignmentsForVersionMock,
  mapToSolverRequestMock,
  showSuccessMock,
  showErrorMock,
  showInfoMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  getPhase2ScheduleCompareMock: vi.fn(),
  getPhase2ScheduleReviewMock: vi.fn(),
  getScheduleStatusMock: vi.fn(),
  getScheduleVersionAssignmentsMock: vi.fn(),
  getScheduleVersionPreferencesMock: vi.fn(),
  getPreviousMonthFinalizedContextMock: vi.fn(),
  selectPhase2ScheduleVersionMock: vi.fn(),
  recheckPhase2ScheduleVersionMock: vi.fn(),
  finalizePhase2ScheduleVersionMock: vi.fn(),
  createPhase2ScheduleVersionMock: vi.fn(),
  patchPhase2ScheduleVersionAssignmentsMock: vi.fn(),
  refreshPreferenceResolutionByVersionMock: vi.fn(),
  resetPreferenceResolutionByVersionMock: vi.fn(),
  submitPhase2ScheduleVersionSolverResultMock: vi.fn(),
  deleteThisMonthVersionAssignmentsMock: vi.fn(),
  getPlanningEmployeesMock: vi.fn(),
  getPlanningAssignmentsForVersionMock: vi.fn(),
  mapToSolverRequestMock: vi.fn(() => ({})),
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
  getPhase2ScheduleReview: getPhase2ScheduleReviewMock,
  patchPhase2ScheduleVersionAssignments: patchPhase2ScheduleVersionAssignmentsMock,
  getScheduleStatus: getScheduleStatusMock,
  getScheduleVersionAssignments: getScheduleVersionAssignmentsMock,
  getScheduleVersionPreferences: getScheduleVersionPreferencesMock,
  getPreviousMonthFinalizedContext: getPreviousMonthFinalizedContextMock,
  selectPhase2ScheduleVersion: selectPhase2ScheduleVersionMock,
  recheckPhase2ScheduleVersion: recheckPhase2ScheduleVersionMock,
  finalizePhase2ScheduleVersion: finalizePhase2ScheduleVersionMock,
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
  siteRequirements: [],
  selectedVersionId: null as string | null,
  previewVersionId: null as string | null,
  compareMatrix: null as unknown,
  latestEvaluation: null as unknown,
  reviewTab: 'grid' as 'grid' | 'proof' | 'offRequests',
  setBasicInfo: vi.fn((value) => {
    scheduleStoreMock.basicInfo = value
  }),
  setSiteRequirements: vi.fn(),
  setSelectedVersionId: vi.fn((value: string | null) => {
    scheduleStoreMock.selectedVersionId = value
  }),
  setPreviewVersionId: vi.fn((value: string | null) => {
    scheduleStoreMock.previewVersionId = value
  }),
  setCompareMatrix: vi.fn((value) => {
    scheduleStoreMock.compareMatrix = value
  }),
  setLatestEvaluation: vi.fn((value) => {
    scheduleStoreMock.latestEvaluation = value
  }),
  setReviewTab: vi.fn((value) => {
    scheduleStoreMock.reviewTab = value
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

function setMockGridDates(month: string, lastMonthDays = 0) {
  const currentMonthDate = dayjs(`${month}-01`).format('YYYY-MM-DD')
  const previousDates = Array.from({ length: lastMonthDays }, (_, index) => (
    dayjs(`${month}-01`).subtract(lastMonthDays - index, 'day').format('YYYY-MM-DD')
  ))

  gridMock.dates.value = [
    ...previousDates.map((date) => ({ date, isLastMonth: true })),
    { date: currentMonthDate, isLastMonth: false },
  ]
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
import VersionCompareSurface from '@/components/schedule/review/VersionCompareSurface.vue'

const mountedWrappers: Array<ReturnType<typeof mount>> = []

function createWrapper() {
  const wrapper = mount(Step5Result, {
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

  mountedWrappers.push(wrapper)
  return wrapper
}

function createVersionSummary(overrides: Record<string, unknown> = {}) {
  const versionNo = (overrides.versionNo as number | undefined) ?? 1
  const id = (overrides.id as string | undefined) ?? `version-${versionNo}`

  return {
    id,
    scheduleId: 'schedule-1',
    versionNo,
    name: `V${versionNo}`,
    sourceType: versionNo === 1 ? 'initial_solve' : 're_solve',
    baseVersionId: versionNo === 1 ? null : 'version-1',
    status: versionNo === 1 ? 'draft' : 'review_ready',
    currentRevision: versionNo,
    manualEditCount: versionNo === 1 ? 0 : 1,
    inputDiffSummary: {
      changedOffRequests: versionNo === 1 ? 0 : 1,
      changedLockedAssignments: 0,
      changedSiteRequirements: 0,
      note: versionNo === 1 ? null : 'selected',
    },
    latestEvaluationId: null,
    latestEvaluationResultStatus: null,
    comparisonMetrics: null,
    finalizationGate: null,
    activeSolverExecutionId: null,
    isSelected: false,
    isFinalized: false,
    ...overrides,
  }
}

function createReviewResponse(versionId: string, overrides: Record<string, unknown> = {}) {
  const parsedVersionNo = Number(versionId.split('-').at(-1))
  const versionNo = Number.isFinite(parsedVersionNo) && parsedVersionNo > 0 ? parsedVersionNo : 2
  const version = createVersionSummary({
    id: versionId,
    versionNo,
    isSelected: versionId === 'version-2',
    ...(overrides.version as Record<string, unknown> | undefined),
  })

  return {
    scheduleId: 'schedule-1',
    selectedVersionId: (overrides.selectedVersionId as string | null | undefined) ?? 'version-2',
    finalizedVersionId: (overrides.finalizedVersionId as string | null | undefined) ?? null,
    version,
    latestEvaluation: (overrides.latestEvaluation as Record<string, unknown> | null | undefined) ?? null,
    primaryAction: {
      kind: versionId === 'version-1' ? 'select' : 'none',
      targetVersionId: versionId === 'version-1' ? 'version-1' : null,
      label: versionId === 'version-1' ? 'Select this version as the finalization candidate' : 'No primary action',
      disabledReason: null,
      ...(overrides.primaryAction as Record<string, unknown> | undefined),
    },
    defaultTab: (overrides.defaultTab as string | undefined) ?? 'grid',
  }
}

describe('Step5Result', () => {
  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
  })

  beforeEach(() => {
    vi.clearAllMocks()
    routeMock.params.id = 'schedule-1'
    routeMock.query = {}
    replaceMock.mockImplementation(async (location: { path?: string; query?: Record<string, string> }) => {
      const nextPath = location.path ?? ''
      const pathParts = nextPath.split('/')
      const nextId = pathParts.at(-1)
      if (nextId) {
        routeMock.params.id = nextId
      }
      routeMock.query = location.query ?? {}
    })
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
    scheduleStoreMock.compareMatrix = null
    scheduleStoreMock.latestEvaluation = null
    scheduleStoreMock.reviewTab = 'grid'
    authStoreMock.user = {
      id: 'user-1',
    }
    solverMock.status.value = 'created'
    solverMock.hardScore.value = 0
    solverMock.softScore.value = 0
    solverMock.progress.value = 0
    solverMock.intermediateResults.value = null
    solverMock.startSolver.mockResolvedValue('exec-1')
    gridMock.generateDates.mockImplementation((month: string, lastMonthDays = 0) => {
      setMockGridDates(month, lastMonthDays)
    })
    setMockGridDates('2025-12', 0)
    getPreviousMonthFinalizedContextMock.mockResolvedValue(null)
    mapToSolverRequestMock.mockImplementation(() => ({}))
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
    getPhase2ScheduleReviewMock.mockImplementation((versionId: string) => {
      return Promise.resolve(createReviewResponse(versionId))
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
    selectPhase2ScheduleVersionMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-1',
    })
    recheckPhase2ScheduleVersionMock.mockResolvedValue({
      scheduleVersionId: 'version-2',
      currentRevision: 3,
      evaluationId: 'evaluation-3',
      resultStatus: 'review_ready',
      evaluationResultStatus: 'passed',
    })
    finalizePhase2ScheduleVersionMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      scheduleVersionId: 'version-2',
      status: 'finalized',
      finalizedVersionId: 'version-2',
      finalizedAt: '2026-04-02T00:00:00Z',
      finalizedBy: 'user-1',
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

  it('navigates to dashboard directly when the go-dashboard button is clicked', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    vi.clearAllMocks()

    await wrapper.get('[data-test="go-dashboard-button"]').trigger('click')
    await flushPromises()

    expect(replaceMock).toHaveBeenCalledWith('/')
  })

  it('requires confirmation before navigating to dashboard when there are unsaved changes', async () => {
    const warningMock = vi.fn()
    ;(window as unknown as { $dialog?: Record<string, unknown> }).$dialog = {
      info: vi.fn(),
      warning: warningMock,
    }

    const wrapper = createWrapper()
    await flushPromises()
    vi.clearAllMocks()

    await wrapper.get('[data-test="grid-edit"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-test="go-dashboard-button"]').trigger('click')
    await flushPromises()

    expect(warningMock).toHaveBeenCalledTimes(1)
    expect(replaceMock).not.toHaveBeenCalledWith('/')

    const dialogConfig = warningMock.mock.calls[0]?.[0] as {
      onPositiveClick?: () => void | Promise<void>
    }
    await dialogConfig.onPositiveClick?.()

    expect(replaceMock).toHaveBeenCalledWith('/')
  })

  it('renders the compare surface above the result grid for all preview states', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="version-compare-surface"]').exists()).toBe(true)
  })

  it('canonicalizes finalized months to the locked preview version and disables compare switching', async () => {
    routeMock.query = { version: 'version-1' }

    const finalizedVersion = createVersionSummary({
      id: 'version-2',
      versionNo: 2,
      isSelected: true,
      status: 'finalized',
      isFinalized: true,
    })

    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-2',
      finalizedVersionId: 'version-2',
      activeSolvingVersionId: null,
      versions: [
        createVersionSummary({
          id: 'version-1',
          versionNo: 1,
          status: 'draft',
          isSelected: false,
        }),
        finalizedVersion,
      ],
    })
    getPhase2ScheduleReviewMock.mockResolvedValue(
      createReviewResponse('version-2', {
        finalizedVersionId: 'version-2',
        version: {
          status: 'finalized',
          isFinalized: true,
        },
        primaryAction: {
          kind: 'none',
          targetVersionId: null,
          label: 'No primary action',
          disabledReason: null,
        },
      })
    )

    const wrapper = createWrapper()
    await flushPromises()

    expect(scheduleStoreMock.previewVersionId).toBe('version-2')
    expect(wrapper.get('[data-test="preview-version-1"]').attributes('disabled')).toBeDefined()
    expect(wrapper.findComponent(VersionCompareSurface).props('lockedVersionId')).toBe('version-2')

    const previewCallCount = scheduleStoreMock.setPreviewVersionId.mock.calls.length
    await wrapper.get('[data-test="preview-version-1"]').trigger('click')
    await flushPromises()

    expect(scheduleStoreMock.setPreviewVersionId.mock.calls.length).toBe(previewCallCount)
    expect(selectPhase2ScheduleVersionMock).not.toHaveBeenCalled()
  })

  it('changes preview only when a version card is clicked', async () => {
    routeMock.query = { version: 'version-2' }

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.get('[data-test="preview-version-1"]').trigger('click')
    await flushPromises()

    expect(scheduleStoreMock.setPreviewVersionId).toHaveBeenCalledWith('version-1')
    expect(selectPhase2ScheduleVersionMock).not.toHaveBeenCalled()
  })

  it('requires confirmation before discarding unsaved changes on preview switch', async () => {
    routeMock.query = { version: 'version-2' }
    const warningMock = vi.fn()
    ;(window as unknown as { $dialog?: Record<string, unknown> }).$dialog = {
      info: vi.fn(),
      warning: warningMock,
    }

    const wrapper = createWrapper()
    await flushPromises()
    vi.clearAllMocks()

    await wrapper.get('[data-test="grid-edit"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-test="preview-version-1"]').trigger('click')
    await flushPromises()

    expect(warningMock).toHaveBeenCalledTimes(1)
    expect(scheduleStoreMock.setPreviewVersionId).not.toHaveBeenCalledWith('version-1')
  })

  it('changes authoritative selection only when the explicit select button is clicked', async () => {
    routeMock.query = { version: 'version-1' }
    getPhase2ScheduleCompareMock
      .mockResolvedValueOnce({
        scheduleId: 'schedule-1',
        selectedVersionId: 'version-2',
        finalizedVersionId: null,
        activeSolvingVersionId: null,
        versions: [
          createVersionSummary({
            id: 'version-1',
            versionNo: 1,
            isSelected: false,
          }),
          createVersionSummary({
            id: 'version-2',
            versionNo: 2,
            isSelected: true,
          }),
        ],
      })
      .mockResolvedValueOnce({
        scheduleId: 'schedule-1',
        selectedVersionId: 'version-1',
        finalizedVersionId: null,
        activeSolvingVersionId: null,
        versions: [
          createVersionSummary({
            id: 'version-1',
            versionNo: 1,
            isSelected: true,
          }),
          createVersionSummary({
            id: 'version-2',
            versionNo: 2,
            isSelected: false,
          }),
        ],
      })
      .mockResolvedValue({
        scheduleId: 'schedule-1',
        selectedVersionId: 'version-2',
        finalizedVersionId: null,
        activeSolvingVersionId: 'version-3',
        versions: [
          createVersionSummary({
            id: 'version-1',
            versionNo: 1,
            isSelected: false,
          }),
          createVersionSummary({
            id: 'version-2',
            versionNo: 2,
            isSelected: true,
          }),
          createVersionSummary({
            id: 'version-3',
            versionNo: 3,
            status: 'solving',
            activeSolverExecutionId: 'exec-1',
            isSelected: false,
          }),
        ],
      })

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.get('[data-test="primary-action-button"]').trigger('click')
    await flushPromises()

    expect(selectPhase2ScheduleVersionMock).toHaveBeenCalledWith('version-1')
  })

  it('opens proof-first when the preview version is review_blocked', async () => {
    getPhase2ScheduleReviewMock.mockResolvedValue(
      createReviewResponse('version-2', {
        version: {
          status: 'review_blocked',
        },
        latestEvaluation: {
          id: 'evaluation-2',
          scheduleId: 'schedule-1',
          scheduleVersionId: 'version-2',
          revisionNo: 2,
          resultStatus: 'review_blocked',
          proofSummary: {
            weeklyHoursViolations: 1,
            nnnViolations: 0,
            nodViolations: 0,
            minimumRestViolations: 0,
            staffingShortfalls: 1,
          },
          violationDetails: [
            {
              code: 'hard_constraints_violated',
              message: 'Hard-constraint violations were detected.',
              severity: 'error',
              affectedEmployeeIds: ['emp-1'],
              dates: ['2025-12-01'],
              metadata: {},
            },
          ],
          infeasibility: null,
          offRequestResults: [],
          comparisonMetrics: {
            offRequestReflectionRate: 90,
            nightShiftMin: 1,
            nightShiftMax: 2,
            weekendShiftMin: 0,
            weekendShiftMax: 1,
            manualEditCount: 1,
          },
          finalizationGate: {
            allowed: false,
            blockingReasons: [
              {
                code: 'hard_constraints_violated',
                message: '하드 제약 위반이 있습니다.',
              },
            ],
          },
          assignmentHash: 'hash-2',
          solverExecutionId: null,
          evaluatorVersion: 'test',
          createdAt: '2026-04-02T00:00:00Z',
        },
        primaryAction: {
          kind: 'recheck',
          targetVersionId: 'version-2',
          label: 'Run recheck',
          disabledReason: null,
        },
      })
    )

    const wrapper = createWrapper()
    await flushPromises()

    expect(scheduleStoreMock.setReviewTab).toHaveBeenCalledWith('proof')
    expect(wrapper.text()).toContain('하드 제약 위반 요약')
    expect(wrapper.find('[data-test="grid-edit"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="primary-action-button"]').text()).toContain('다시 검토')
  })

  it('shows solve_failed support copy and dispatches retry from the shared Step5 frame', async () => {
    scheduleStoreMock.siteRequirements = [
      {
        dayOfWeek: 1,
        shiftCode: 'D',
        requiredCount: 1,
      },
    ]

    getPhase2ScheduleReviewMock.mockResolvedValue(
      createReviewResponse('version-2', {
        version: {
          status: 'solve_failed',
        },
        latestEvaluation: {
          id: 'evaluation-2',
          scheduleId: 'schedule-1',
          scheduleVersionId: 'version-2',
          revisionNo: 2,
          resultStatus: 'solve_failed',
          proofSummary: {
            weeklyHoursViolations: 0,
            nnnViolations: 0,
            nodViolations: 0,
            minimumRestViolations: 0,
            staffingShortfalls: 0,
          },
          violationDetails: [],
          infeasibility: {
            summary: 'solver crashed',
            reason: 'worker_crash',
            details: {
              traceId: 'trace-123',
            },
          },
          offRequestResults: [],
          comparisonMetrics: {
            offRequestReflectionRate: null,
            nightShiftMin: null,
            nightShiftMax: null,
            weekendShiftMin: null,
            weekendShiftMax: null,
            manualEditCount: 0,
          },
          finalizationGate: {
            allowed: false,
            blockingReasons: [
              {
                code: 'solve_failed',
                message: 'Solver execution failed. Retry before finalization.',
              },
            ],
          },
          assignmentHash: 'hash-2',
          solverExecutionId: 'exec-fail',
          evaluatorVersion: 'test',
          createdAt: '2026-04-02T00:00:00Z',
        },
        primaryAction: {
          kind: 'retry',
          targetVersionId: 'version-2',
          label: 'Retry',
          disabledReason: null,
        },
      })
    )

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('solver crashed')
    expect(wrapper.text()).toContain('trace-123')
    await wrapper.get('[data-test="primary-action-button"]').trigger('click')
    await flushPromises()

    expect(solverMock.startSolver).toHaveBeenCalled()
  })

  it('loads preview data by previewVersionId and allows mutation when preview status is editable', async () => {
    routeMock.query = {
      version: 'version-1',
    }

    const wrapper = createWrapper()
    await flushPromises()

    expect(getScheduleVersionPreferencesMock).toHaveBeenCalledWith('version-1')
    expect(getScheduleVersionAssignmentsMock).toHaveBeenCalledWith('version-1')

    const startSolverButton = wrapper.get('[data-test="start-solver-button"]')

    expect(startSolverButton.exists()).toBe(true)
    expect(startSolverButton.attributes('disabled')).toBeUndefined()
  })

  it('shows finalized previous-month fallback rows when the preview version has none', async () => {
    routeMock.query = { version: 'version-1' }
    scheduleStoreMock.basicInfo = {
      ...scheduleStoreMock.basicInfo,
      month: '2025-04',
    }
    getPreviousMonthFinalizedContextMock.mockResolvedValue({
      scheduleId: 'schedule-2025-03',
      scheduleVersionId: 'version-2025-03-final',
      displayAssignments: {
        'emp-1': {
          '2025-03-31': 'D',
        },
      },
      planningAssignments: [
        {
          employee_id: 'emp-1',
          shift_id: 'shift-1',
          date: '2025-03-31',
          is_locked: true,
        },
      ],
    })
    getScheduleVersionAssignmentsMock.mockResolvedValue({
      assignments: {},
      offReasons: {},
      comments: {},
    })

    createWrapper()
    await flushPromises()
    await flushPromises()

    expect(gridMock.assignments.value['emp-1']?.['2025-03-31']).toBe('D')
    expect(gridMock.dates.value.some((date) => date.date === '2025-03-31')).toBe(true)
  })

  it('generates the full previous-month window when fallback already spans the default five days', async () => {
    routeMock.query = { version: 'version-1' }
    scheduleStoreMock.basicInfo = {
      ...scheduleStoreMock.basicInfo,
      month: '2025-04',
    }
    getPreviousMonthFinalizedContextMock.mockResolvedValue({
      scheduleId: 'schedule-2025-03',
      scheduleVersionId: 'version-2025-03-final',
      displayAssignments: {
        'emp-1': {
          '2025-03-27': 'D',
          '2025-03-28': 'D',
          '2025-03-29': 'D',
          '2025-03-30': 'D',
          '2025-03-31': 'D',
        },
      },
      planningAssignments: [],
    })
    getScheduleVersionAssignmentsMock.mockResolvedValue({
      assignments: {},
      offReasons: {},
      comments: {},
    })

    createWrapper()
    await flushPromises()
    await flushPromises()

    expect(gridMock.generateDates).toHaveBeenCalledWith('2025-04', 5)
    expect(gridMock.dates.value.filter((date) => date.isLastMonth)).toHaveLength(5)
    expect(gridMock.dates.value[0]?.date).toBe('2025-03-27')
    expect(gridMock.assignments.value['emp-1']?.['2025-03-31']).toBe('D')
  })

  it('passes finalized previous-month planning rows into mapToSolverRequest on AI start', async () => {
    routeMock.query = { version: 'version-1' }
    scheduleStoreMock.basicInfo = {
      ...scheduleStoreMock.basicInfo,
      month: '2025-04',
    }
    scheduleStoreMock.siteRequirements = [
      {
        dayOfWeek: 1,
        shiftCode: 'D',
        requiredCount: 1,
      },
    ]
    getPreviousMonthFinalizedContextMock.mockResolvedValue({
      scheduleId: 'schedule-2025-03',
      scheduleVersionId: 'version-2025-03-final',
      displayAssignments: {},
      planningAssignments: [
        {
          employee_id: 'emp-1',
          shift_id: 'shift-1',
          date: '2025-03-31',
          is_locked: true,
        },
      ],
    })

    const wrapper = createWrapper()
    await flushPromises()
    await flushPromises()
    mapToSolverRequestMock.mockClear()

    const startSolverButton = wrapper.get('[data-test="start-solver-button"]')
    expect(startSolverButton.attributes('disabled')).toBeUndefined()

    await startSolverButton.trigger('click')
    await flushPromises()

    expect(mapToSolverRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        month: '2025-04',
        organizationId: 'org-1',
      }),
      expect.any(Object),
      expect.any(Object),
      expect.any(Array),
      expect.any(Array),
      expect.any(Array),
      expect.any(Number),
      [
        {
          employee_id: 'emp-1',
          shift_id: 'shift-1',
          date: '2025-03-31',
          is_locked: true,
        },
      ],
    )
  })

  it('blocks AI start when the previous-month fallback lookup fails', async () => {
    routeMock.query = { version: 'version-1' }
    scheduleStoreMock.basicInfo = {
      ...scheduleStoreMock.basicInfo,
      month: '2025-04',
    }
    scheduleStoreMock.siteRequirements = [
      {
        dayOfWeek: 1,
        shiftCode: 'D',
        requiredCount: 1,
      },
    ]
    getPreviousMonthFinalizedContextMock.mockRejectedValueOnce(new Error('lookup failed'))

    const wrapper = createWrapper()
    await flushPromises()
    await flushPromises()
    vi.clearAllMocks()

    const startSolverButton = wrapper.get('[data-test="start-solver-button"]')
    await startSolverButton.trigger('click')
    await flushPromises()

    expect(showErrorMock).toHaveBeenCalledWith(
      '전월 확정 근무 이력을 불러오지 못했습니다. 다시 시도해주세요.'
    )
    expect(resetPreferenceResolutionByVersionMock).not.toHaveBeenCalled()
    expect(mapToSolverRequestMock).not.toHaveBeenCalled()
    expect(solverMock.startSolver).not.toHaveBeenCalled()
  })

  it('regenerates the calendar grid when the mounted month changes', async () => {
    routeMock.query = { version: 'version-1' }

    const wrapper = createWrapper()
    await flushPromises()
    vi.clearAllMocks()

    scheduleStoreMock.basicInfo = {
      ...scheduleStoreMock.basicInfo,
      month: '2025-04',
    }

    await flushPromises()
    await flushPromises()

    expect(gridMock.generateDates).toHaveBeenCalledWith('2025-04', expect.any(Number))
    expect(gridMock.dates.value[0]?.date).toBe('2025-04-01')
    expect(wrapper.exists()).toBe(true)
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

    const startSolverButton = wrapper.get('[data-test="start-solver-button"]')

    expect(startSolverButton.exists()).toBe(true)
    expect(startSolverButton.attributes('disabled')).toBeDefined()
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

    const startSolverButton = wrapper.get('[data-test="start-solver-button"]')
    expect(startSolverButton.exists()).toBe(true)

    await startSolverButton.trigger('click')
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
    getPhase2ScheduleCompareMock
      .mockResolvedValueOnce({
        scheduleId: 'schedule-1',
        selectedVersionId: 'version-2',
        finalizedVersionId: null,
        activeSolvingVersionId: 'version-3',
        versions: [
          createVersionSummary({
            id: 'version-1',
            versionNo: 1,
            isSelected: false,
          }),
          createVersionSummary({
            id: 'version-2',
            versionNo: 2,
            isSelected: true,
          }),
        ],
      })
      .mockResolvedValueOnce({
        scheduleId: 'schedule-1',
        selectedVersionId: 'version-2',
        finalizedVersionId: null,
        activeSolvingVersionId: 'version-3',
        versions: [
          createVersionSummary({
            id: 'version-1',
            versionNo: 1,
            isSelected: false,
          }),
          createVersionSummary({
            id: 'version-2',
            versionNo: 2,
            isSelected: true,
          }),
          createVersionSummary({
            id: 'version-3',
            versionNo: 3,
            status: 'solving',
            activeSolverExecutionId: 'exec-1',
            isSelected: false,
          }),
        ],
      })

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
    expect(scheduleStoreMock.setPreviewVersionId).toHaveBeenCalledWith('version-3')
    expect(scheduleStoreMock.compareMatrix).toEqual(
      expect.objectContaining({
        scheduleId: 'schedule-1',
        selectedVersionId: 'version-2',
        finalizedVersionId: null,
        activeSolvingVersionId: null,
        versions: expect.arrayContaining([
          expect.objectContaining({
            id: 'version-1',
          }),
          expect.objectContaining({
            id: 'version-2',
          }),
        ]),
      })
    )
  })

  it('saves manual changes through preview-version patch route', async () => {
    routeMock.query = {
      version: 'version-1',
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
          status: 'review_ready',
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
    vi.clearAllMocks()

    await wrapper.get('[data-test="grid-edit"]').trigger('click')
    await flushPromises()

    const saveButton = wrapper.findAll('button')
      .find((button) => button.text().trim() === '저장')
    expect(saveButton).toBeTruthy()

    await saveButton!.trigger('click')
    await flushPromises()

    expect(patchPhase2ScheduleVersionAssignmentsMock).toHaveBeenCalledTimes(1)
    expect(patchPhase2ScheduleVersionAssignmentsMock).toHaveBeenCalledWith(
      'version-1',
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
    expect(scheduleStoreMock.previewVersionId).toBe('version-1')
    expect(scheduleStoreMock.selectedVersionId).toBe('version-2')
    expect(showSuccessMock).toHaveBeenCalledWith('저장되었습니다')
    expect(pushMock).not.toHaveBeenCalled()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('does not leave Step5 when save is clicked without changes', async () => {
    routeMock.query = {
      version: 'version-1',
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
          status: 'review_ready',
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
      status: 'complete',
      hard_score: 11,
      soft_score: 22,
      solver_execution_id: null,
    })

    const dialogInfoMock = vi.fn()
    ;(window as unknown as { $dialog?: Record<string, unknown> }).$dialog = {
      info: dialogInfoMock,
      warning: vi.fn(),
    }

    const wrapper = createWrapper()
    await flushPromises()

    const saveButton = wrapper.findAll('button')
      .find((button) => button.text().trim() === '저장')
    expect(saveButton).toBeTruthy()

    await saveButton!.trigger('click')
    await flushPromises()

    expect(showInfoMock).toHaveBeenCalledWith('변경사항이 없습니다')
    expect(dialogInfoMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('canonicalizes a legacy Step5 URL before refreshing saved preview state', async () => {
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
    vi.clearAllMocks()

    await wrapper.get('[data-test="grid-edit"]').trigger('click')
    await flushPromises()

    const saveButton = wrapper.findAll('button')
      .find((button) => button.text().trim() === '저장')
    expect(saveButton).toBeTruthy()

    await saveButton!.trigger('click')
    await flushPromises()

    expect(replaceMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
    expect(showSuccessMock).toHaveBeenCalledWith('저장되었습니다')
  })
})
