import dayjs from 'dayjs'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildCanonicalStep5RouteLocation,
  buildStep5RouteLocation,
  getAppHomeRoutePath,
  getScheduleStepRoutePath,
} from '@/constants/routes'

const routeMock = reactive({
  params: {
    scheduleKey: 'schedule-1',
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
  getChecklistMock,
  selectPhase2ScheduleVersionMock,
  recheckPhase2ScheduleVersionMock,
  finalizePhase2ScheduleVersionMock,
  resetPhase2ScheduleActiveFlowMock,
  deletePhase2ScheduleMonthMock,
  deletePhase2ScheduleGeneratedResultsMock,
  deletePhase2ScheduleVersionMock,
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
  getChecklistMock: vi.fn(),
  selectPhase2ScheduleVersionMock: vi.fn(),
  recheckPhase2ScheduleVersionMock: vi.fn(),
  finalizePhase2ScheduleVersionMock: vi.fn(),
  resetPhase2ScheduleActiveFlowMock: vi.fn(),
  deletePhase2ScheduleMonthMock: vi.fn(),
  deletePhase2ScheduleGeneratedResultsMock: vi.fn(),
  deletePhase2ScheduleVersionMock: vi.fn(),
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
  resetPhase2ScheduleActiveFlow: resetPhase2ScheduleActiveFlowMock,
  deletePhase2ScheduleMonth: deletePhase2ScheduleMonthMock,
  deletePhase2ScheduleGeneratedResults: deletePhase2ScheduleGeneratedResultsMock,
  deletePhase2ScheduleVersion: deletePhase2ScheduleVersionMock,
  refreshPreferenceResolutionByVersion: refreshPreferenceResolutionByVersionMock,
  resetPreferenceResolutionByVersion: resetPreferenceResolutionByVersionMock,
  submitPhase2ScheduleVersionSolverResult: submitPhase2ScheduleVersionSolverResultMock,
  deleteThisMonthVersionAssignments: deleteThisMonthVersionAssignmentsMock,
  getPlanningEmployees: getPlanningEmployeesMock,
  getPlanningAssignmentsForVersion: getPlanningAssignmentsForVersionMock,
}))

vi.mock('@/api/ops', () => ({
  getChecklist: getChecklistMock,
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
    schedulePublicId: undefined as string | undefined,
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
  resetReviewState: vi.fn(() => {
    scheduleStoreMock.selectedVersionId = null
    scheduleStoreMock.previewVersionId = null
    scheduleStoreMock.compareMatrix = null
    scheduleStoreMock.latestEvaluation = null
    scheduleStoreMock.reviewTab = 'grid'
    scheduleStoreMock.siteRequirements = []
  }),
  setAssignments: vi.fn(),
  setComments: vi.fn(),
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
const mountedWrappers: Array<ReturnType<typeof mount>> = []

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

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
        NSpin: { template: '<div><slot /></div>' },
      },
    },
  })

  mountedWrappers.push(wrapper)
  return wrapper
}

async function clickDocumentTestId(testId: string) {
  const target = document.querySelector<HTMLElement>(`[data-test="${testId}"]`)
  expect(target).toBeTruthy()
  target!.click()
  await flushPromises()
}

async function selectDeleteScope(testId: string) {
  const input = document.querySelector<HTMLInputElement>(`[data-test="${testId}"] input[type="radio"]`)
  expect(input).toBeTruthy()
  input!.click()
  await flushPromises()
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
    document.body.innerHTML = ''
  })

  beforeEach(() => {
    vi.clearAllMocks()
    routeMock.params.scheduleKey = 'schedule-1'
    routeMock.query = {}
    replaceMock.mockImplementation(async (location: { path?: string; query?: Record<string, string> }) => {
      const nextPath = location.path ?? ''
      const pathParts = nextPath.split('/')
      const nextId = pathParts.at(-1)
      if (nextId) {
        routeMock.params.scheduleKey = nextId
      }
      routeMock.query = location.query ?? {}
    })
    scheduleStoreMock.basicInfo = {
      scheduleId: 'schedule-1',
      schedulePublicId: undefined,
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
    scheduleStoreMock.siteRequirements = []
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
    getChecklistMock.mockResolvedValue({
      organizationId: 'org-1',
      fairnessSummary: [
        {
          months: 3,
          windowStartMonth: '2025-10',
          windowEndMonth: '2025-12',
          finalizedVersionCount: 1,
          proofSummary: {
            weeklyHoursViolations: 1,
            nnnViolations: 2,
            nodViolations: 3,
            minimumRestViolations: 4,
            staffingShortfalls: 5,
          },
        },
        {
          months: 6,
          windowStartMonth: '2025-07',
          windowEndMonth: '2025-12',
          finalizedVersionCount: 1,
          proofSummary: {
            weeklyHoursViolations: 1,
            nnnViolations: 2,
            nodViolations: 3,
            minimumRestViolations: 4,
            staffingShortfalls: 5,
          },
        },
        {
          months: 12,
          windowStartMonth: '2025-01',
          windowEndMonth: '2025-12',
          finalizedVersionCount: 1,
          proofSummary: {
            weeklyHoursViolations: 1,
            nnnViolations: 2,
            nodViolations: 3,
            minimumRestViolations: 4,
            staffingShortfalls: 5,
          },
        },
      ],
    })
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
      assignments: {
        'emp-1': {
          '2025-12-01': 'D',
        },
      },
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
    resetPhase2ScheduleActiveFlowMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: null,
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [],
    })
    deletePhase2ScheduleMonthMock.mockResolvedValue({
      deletedScheduleId: 'schedule-1',
    })
    deletePhase2ScheduleGeneratedResultsMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-1',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        createVersionSummary({
          id: 'version-1',
          versionNo: 1,
          isSelected: true,
          status: 'draft',
        }),
      ],
    })
    deletePhase2ScheduleVersionMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-1',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        createVersionSummary({
          id: 'version-1',
          versionNo: 1,
          isSelected: true,
          status: 'review_ready',
        }),
      ],
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
    expect(replaceMock).toHaveBeenCalledWith(buildCanonicalStep5RouteLocation('schedule-1'))
  })

  it('self-heals legacy Step5 URLs without a preview query', async () => {
    createWrapper()
    await flushPromises()

    expect(getPhase2ScheduleCompareMock).toHaveBeenCalledWith('schedule-1')
    expect(scheduleStoreMock.setSelectedVersionId).toHaveBeenCalledWith('version-2')
    expect(scheduleStoreMock.setPreviewVersionId).toHaveBeenCalledWith('version-2')
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('keeps the rolling fairness summary hidden until rolling history is supported', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(getChecklistMock).not.toHaveBeenCalled()
    expect(wrapper.text()).not.toContain('공정성 요약')
    expect(wrapper.text()).not.toContain('최근 3개월')
  })

  it('shows a dedicated initial loading placeholder before Step5 hydration completes', async () => {
    const deferredCompare = createDeferred<{
      scheduleId: string
      selectedVersionId: string | null
      finalizedVersionId: string | null
      activeSolvingVersionId: string | null
      versions: Array<Record<string, unknown>>
    }>()

    getPhase2ScheduleCompareMock.mockImplementationOnce(() => deferredCompare.promise)

    const wrapper = createWrapper()

    expect(wrapper.find('[data-test="step5-initial-loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="result-empty-state"]').exists()).toBe(false)

    deferredCompare.resolve({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        createVersionSummary({ id: 'version-1', versionNo: 1 }),
        createVersionSummary({
          id: 'version-2',
          versionNo: 2,
          isSelected: true,
          status: 'review_ready',
        }),
      ],
    })
    await flushPromises()

    expect(wrapper.find('[data-test="step5-initial-loading"]').exists()).toBe(false)
  })

  it('shows an inline initialization error instead of the empty state when Step5 first load fails', async () => {
    getPhase2ScheduleCompareMock.mockRejectedValueOnce(new Error('Step5 failed'))

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="step5-initial-load-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Step5 failed')
    expect(wrapper.find('[data-test="result-empty-state"]').exists()).toBe(false)
    expect(showErrorMock).toHaveBeenCalledWith('Step5 failed')
  })

  it('retries Step5 initial loading from the inline error state', async () => {
    getPhase2ScheduleCompareMock.mockRejectedValueOnce(new Error('Step5 failed'))

    const wrapper = createWrapper()
    await flushPromises()

    const retryButton = wrapper.findAll('button').find((button) => button.text().includes('다시 시도'))
    expect(retryButton).toBeTruthy()

    await retryButton?.trigger('click')
    await flushPromises()

    expect(getPhase2ScheduleCompareMock.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(wrapper.find('[data-test="step5-initial-load-error"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('공정성 요약')
  })

  it('hides result-only UI and shows the empty state when the preview version has no current-month assignments', async () => {
    getScheduleVersionAssignmentsMock.mockResolvedValue({
      assignments: {},
      offReasons: {},
      comments: {},
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="result-empty-state"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="comparison-tools-section"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="review-tab-panel-grid"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('공정성 요약')
    expect(wrapper.text()).not.toContain('Hard Score:')
    expect(wrapper.text()).toContain('근무표 생성 (AI)')
  })

  it('keeps the running status visible while result details stay hidden until assignments arrive', async () => {
    getPhase2ScheduleCompareMock.mockResolvedValueOnce({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-1',
      finalizedVersionId: null,
      activeSolvingVersionId: 'version-1',
      versions: [
        createVersionSummary({
          id: 'version-1',
          versionNo: 1,
          isSelected: true,
          status: 'solving',
          activeSolverExecutionId: 'exec-1',
        }),
      ],
    })
    getPhase2ScheduleReviewMock.mockResolvedValueOnce(
      createReviewResponse('version-1', {
        selectedVersionId: 'version-1',
        version: {
          status: 'solving',
          activeSolverExecutionId: 'exec-1',
          isSelected: true,
        },
      })
    )
    getScheduleStatusMock.mockResolvedValueOnce({
      status: 'running',
      hard_score: 11,
      soft_score: 22,
      solver_execution_id: 'exec-1',
    })
    getScheduleVersionAssignmentsMock.mockResolvedValue({
      assignments: {},
      offReasons: {},
      comments: {},
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('Hard Score:')
    expect(wrapper.find('[data-test="result-empty-state"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="review-tab-panel-grid"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('공정성 요약')
  })

  it('keeps execution-history status visible without showing the first-run empty state when solver ran but assignments are empty', async () => {
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        createVersionSummary({ id: 'version-1', versionNo: 1 }),
        createVersionSummary({
          id: 'version-2',
          versionNo: 2,
          isSelected: true,
          status: 'solve_failed',
        }),
      ],
    })
    getPhase2ScheduleReviewMock.mockResolvedValue(
      createReviewResponse('version-2', {
        version: {
          status: 'solve_failed',
          isSelected: true,
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
          infeasibility: null,
          offRequestResults: [],
          comparisonMetrics: null,
          finalizationGate: null,
          assignmentHash: 'sha256:failed',
          solverExecutionId: 'exec-failed',
          evaluatorVersion: 'phase2a-trust-gate-v1',
          createdAt: '2026-04-14T00:00:00Z',
        },
      })
    )
    getScheduleStatusMock.mockResolvedValue({
      status: 'error',
      hard_score: null,
      soft_score: null,
      solver_execution_id: null,
    })
    getScheduleVersionAssignmentsMock.mockResolvedValue({
      assignments: {},
      offReasons: {},
      comments: {},
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('실패')
    expect(wrapper.find('[data-test="result-empty-state"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="comparison-tools-section"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="review-tab-panel-grid"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('공정성 요약')
    expect(wrapper.text()).not.toContain('Hard Score:')
    expect(wrapper.text()).toContain('근무표 생성 (AI)')
  })

  it('navigates to dashboard directly when the go-dashboard button is clicked', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    vi.clearAllMocks()

    await wrapper.get('[data-test="go-dashboard-button"]').trigger('click')
    await flushPromises()

    expect(replaceMock).toHaveBeenCalledWith(getAppHomeRoutePath())
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
    expect(replaceMock).not.toHaveBeenCalledWith(getAppHomeRoutePath())

    const dialogConfig = warningMock.mock.calls[0]?.[0] as {
      onPositiveClick?: () => void | Promise<void>
    }
    await dialogConfig.onPositiveClick?.()

    expect(replaceMock).toHaveBeenCalledWith(getAppHomeRoutePath())
  })

  it('requires confirmation before returning to Step4 when there are unsaved changes', async () => {
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

    expect(wrapper.text()).not.toContain('입력 수정으로 돌아가면 새 근무표안을 만들 수 있습니다.')

    const step4Button = wrapper.findAll('button')
      .find((button) => button.text().includes('Off 수정'))
    expect(step4Button).toBeTruthy()

    await step4Button!.trigger('click')
    await flushPromises()

    expect(warningMock).toHaveBeenCalledTimes(1)
    expect(pushMock).not.toHaveBeenCalledWith(getScheduleStepRoutePath(4))

    const dialogConfig = warningMock.mock.calls[0]?.[0] as {
      onPositiveClick?: () => void | Promise<void>
    }
    await dialogConfig.onPositiveClick?.()

    expect(pushMock).toHaveBeenCalledWith(getScheduleStepRoutePath(4))
  })

  it('blocks input editing while the focused version is solving', async () => {
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      activeSolvingVersionId: 'version-2',
      versions: [
        createVersionSummary({
          id: 'version-1',
          versionNo: 1,
          status: 'draft',
        }),
        createVersionSummary({
          id: 'version-2',
          versionNo: 2,
          status: 'solving',
          activeSolverExecutionId: 'exec-1',
          isSelected: true,
        }),
      ],
    })
    getPhase2ScheduleReviewMock.mockImplementation((versionId: string) => {
      return Promise.resolve(createReviewResponse(versionId, {
        version: {
          status: 'solving',
          activeSolverExecutionId: 'exec-1',
        },
      }))
    })
    getScheduleStatusMock.mockResolvedValue({
      status: 'running',
      hard_score: null,
      soft_score: null,
      solver_execution_id: 'exec-1',
    })

    const wrapper = createWrapper()
    await flushPromises()
    vi.clearAllMocks()

    const step4Button = wrapper.findAll('button')
      .find((button) => button.text().includes('Off 수정'))
    expect(step4Button).toBeTruthy()
    expect(step4Button!.attributes('disabled')).toBeDefined()

    await step4Button!.trigger('click')
    await flushPromises()

    expect(pushMock).not.toHaveBeenCalledWith(getScheduleStepRoutePath(4))
  })

  it('opens delete scope selection with three explicit options', async () => {
    const warningMock = vi.fn()
    ;(window as unknown as { $dialog?: Record<string, unknown> }).$dialog = {
      warning: warningMock,
    }

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).not.toContain('현재 안 초기화')
    expect(wrapper.text()).not.toContain('이번 달 새로 시작')

    const deleteMonthButton = wrapper.get('[data-test="delete-month-schedule-button"]')

    await deleteMonthButton.trigger('click')
    await flushPromises()

    expect(warningMock).not.toHaveBeenCalled()
    expect(document.querySelector('[data-test="delete-scope-modal"]')).toBeTruthy()
    expect(document.body.textContent).toContain('선택한 안의 생성 결과 삭제')
    expect(document.body.textContent).toContain('모든 안의 생성 결과 삭제')
    expect(document.body.textContent).toContain('이번 달 근무표 전체 삭제')
  })

  it('deletes selected generated results only and routes back to Step4', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    vi.clearAllMocks()

    const deleteMonthButton = wrapper.get('[data-test="delete-month-schedule-button"]')

    await deleteMonthButton.trigger('click')
    await flushPromises()

    await selectDeleteScope('delete-scope-option-selected-version')
    await clickDocumentTestId('delete-scope-confirm-button')

    expect(deletePhase2ScheduleGeneratedResultsMock).toHaveBeenCalledWith('schedule-1', {
      scope: 'selected_version',
      sourceVersionId: 'version-2',
    })
    expect(solverMock.stopPolling).toHaveBeenCalled()
    expect(scheduleStoreMock.setCompareMatrix).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleId: 'schedule-1',
        selectedVersionId: 'version-1',
      })
    )
    expect(scheduleStoreMock.setSelectedVersionId).toHaveBeenCalledWith('version-1')
    expect(scheduleStoreMock.setPreviewVersionId).toHaveBeenCalledWith('version-1')
    expect(showSuccessMock).toHaveBeenCalledWith(
      '선택한 안의 생성 결과를 삭제했습니다. Step4에서 요청을 다시 확인해주세요.'
    )
    expect(pushMock).toHaveBeenCalledWith(getScheduleStepRoutePath(4))
  })

  it('deletes all active generated results and routes back to Step4', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    vi.clearAllMocks()

    await wrapper.get('[data-test="delete-month-schedule-button"]').trigger('click')
    await flushPromises()
    await selectDeleteScope('delete-scope-option-all-active-versions')
    await clickDocumentTestId('delete-scope-confirm-button')

    expect(deletePhase2ScheduleGeneratedResultsMock).toHaveBeenCalledWith('schedule-1', {
      scope: 'all_active_versions',
    })
    expect(solverMock.stopPolling).toHaveBeenCalled()
    expect(showSuccessMock).toHaveBeenCalledWith(
      '모든 안의 생성 결과를 삭제했습니다. Step4에서 요청을 다시 확인해주세요.'
    )
    expect(pushMock).toHaveBeenCalledWith(getScheduleStepRoutePath(4))
  })

  it('deletes the whole month after choosing the full-delete path', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    vi.clearAllMocks()

    const deleteMonthButton = wrapper.get('[data-test="delete-month-schedule-button"]')

    await deleteMonthButton.trigger('click')
    await flushPromises()

    await selectDeleteScope('delete-scope-option-whole-month')
    await clickDocumentTestId('delete-scope-confirm-button')

    expect(deletePhase2ScheduleMonthMock).toHaveBeenCalledWith({
      organizationId: 'org-1',
      month: '2025-12',
    })
    expect(solverMock.stopPolling).toHaveBeenCalled()
    expect(scheduleStoreMock.setBasicInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleId: undefined,
        organizationId: 'org-1',
        month: '2025-12',
      })
    )
    expect(scheduleStoreMock.resetReviewState).toHaveBeenCalled()
    expect(scheduleStoreMock.setAssignments).toHaveBeenCalledWith({})
    expect(scheduleStoreMock.setComments).toHaveBeenCalledWith({})
    expect(replaceMock).toHaveBeenCalledWith(getAppHomeRoutePath())
  })

  it('blocks delete scope options for finalized months', async () => {
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-2',
      finalizedVersionId: 'version-2',
      activeSolvingVersionId: null,
      versions: [
        createVersionSummary({ id: 'version-1', versionNo: 1 }),
        createVersionSummary({ id: 'version-2', versionNo: 2, isSelected: true, isFinalized: true, status: 'finalized' }),
      ],
    })
    getPhase2ScheduleReviewMock.mockImplementation((versionId: string) =>
      Promise.resolve(createReviewResponse(versionId, {
        finalizedVersionId: 'version-2',
        version: {
          status: versionId === 'version-2' ? 'finalized' : 'draft',
          isFinalized: versionId === 'version-2',
        },
      }))
    )

    const wrapper = createWrapper()
    await flushPromises()

    const deleteMonthButton = wrapper.get('[data-test="delete-month-schedule-button"]')

    expect(deleteMonthButton.attributes('disabled')).toBeUndefined()

    await deleteMonthButton.trigger('click')
    await flushPromises()

    expect(document.body.textContent).toContain('확정된 근무표는 삭제할 수 없습니다.')
    expect(document.body.textContent).not.toContain('선택한 안의 생성 결과 삭제')
    expect(document.body.textContent).not.toContain('이번 달 근무표 전체 삭제')
  })

  it('deletes a selected non-focused compare card with preview replacement and rehydrates the route', async () => {
    routeMock.query = {
      version: 'version-1',
      compare: 'version-2',
    }
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        createVersionSummary({
          id: 'version-1',
          versionNo: 1,
          status: 'review_ready',
          manualEditCount: 1,
          latestEvaluationId: 'evaluation-1',
        }),
        createVersionSummary({
          id: 'version-2',
          versionNo: 2,
          isSelected: true,
          status: 'review_ready',
          manualEditCount: 2,
          latestEvaluationId: 'evaluation-2',
        }),
      ],
    })

    const warningMock = vi.fn()
    ;(window as unknown as { $dialog?: Record<string, unknown> }).$dialog = {
      warning: warningMock,
    }

    const wrapper = createWrapper()
    await flushPromises()
    vi.clearAllMocks()
    routeMock.query = {
      version: 'version-1',
      compare: 'version-2',
    }

    await wrapper.get('[data-test="step5-compare-button"]').trigger('click')
    await flushPromises()
    await clickDocumentTestId('delete-version-version-2')

    expect(warningMock).toHaveBeenCalledTimes(1)

    const dialogConfig = warningMock.mock.calls[0]?.[0] as {
      onPositiveClick?: () => void | Promise<void>
    }
    await dialogConfig.onPositiveClick?.()
    await flushPromises()

    expect(deletePhase2ScheduleVersionMock).toHaveBeenCalledWith('version-2', {
      replacementSelectedVersionId: 'version-1',
    })
    expect(showSuccessMock).toHaveBeenCalledWith('근무표안을 삭제했습니다.')
    expect(replaceMock).toHaveBeenCalledWith(buildCanonicalStep5RouteLocation('schedule-1'))
    expect(getPhase2ScheduleCompareMock).toHaveBeenCalled()
  })

  it('blocks compare-card deletion when the preview has unsaved changes', async () => {
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        createVersionSummary({
          id: 'version-1',
          versionNo: 1,
          status: 'review_ready',
          manualEditCount: 1,
          latestEvaluationId: 'evaluation-1',
        }),
        createVersionSummary({
          id: 'version-2',
          versionNo: 2,
          isSelected: true,
          status: 'review_ready',
          manualEditCount: 2,
          latestEvaluationId: 'evaluation-2',
        }),
      ],
    })

    const wrapper = createWrapper()
    await flushPromises()
    vi.clearAllMocks()

    await wrapper.get('[data-test="step5-compare-button"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-test="grid-edit"]').trigger('click')
    await flushPromises()
    await clickDocumentTestId('delete-version-version-1')

    expect(deletePhase2ScheduleVersionMock).not.toHaveBeenCalled()
    expect(showInfoMock).toHaveBeenCalledWith(
      '저장되지 않은 변경사항이 있어 비교안을 삭제할 수 없습니다. 먼저 저장하거나 변경 사항을 취소해주세요.'
    )
  })

  it('keeps comparison UI off the base page when there is only a single working version state', async () => {
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-1',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        createVersionSummary({
          id: 'version-1',
          versionNo: 1,
          isSelected: true,
          sourceType: 'initial_solve',
          manualEditCount: 0,
          inputDiffSummary: {
            changedOffRequests: 0,
            changedLockedAssignments: 0,
            changedSiteRequirements: 0,
            note: null,
          },
        }),
        createVersionSummary({
          id: 'version-2',
          versionNo: 2,
          isSelected: false,
          sourceType: 're_solve',
          status: 'draft',
          manualEditCount: 0,
          inputDiffSummary: {
            changedOffRequests: 0,
            changedLockedAssignments: 0,
            changedSiteRequirements: 0,
            note: null,
          },
        }),
      ],
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="comparison-tools-section"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="comparison-workspace"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('비교 후보')
    expect(wrapper.text()).not.toContain('비교 도구')
    expect(wrapper.text()).not.toContain('현재 보는 근무표안')
    expect(wrapper.text()).not.toContain('선택한 근무표안')
    expect(wrapper.text()).not.toContain('근무표안 비교')
  })

  it('opens comparison UI only after clicking the compare button', async () => {
    routeMock.query = {
      version: 'version-3',
      compare: 'version-3,version-2',
    }
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        createVersionSummary({ id: 'version-1', versionNo: 1, sourceType: 'initial_solve', manualEditCount: 0, inputDiffSummary: { changedOffRequests: 0, changedLockedAssignments: 0, changedSiteRequirements: 0, note: null } }),
        createVersionSummary({ id: 'version-2', versionNo: 2, isSelected: true }),
        createVersionSummary({
          id: 'version-3',
          versionNo: 3,
          baseVersionId: 'version-2',
          sourceType: 're_solve',
          status: 'review_ready',
          manualEditCount: 2,
          inputDiffSummary: {
            changedOffRequests: 2,
            changedLockedAssignments: 0,
            changedSiteRequirements: 0,
            note: 'candidate',
          },
        }),
      ],
    })
    getPhase2ScheduleReviewMock.mockImplementation((versionId: string) => {
      return Promise.resolve(createReviewResponse(versionId))
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="comparison-tools-section"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="comparison-workspace"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('비교 후보')
    expect(scheduleStoreMock.previewVersionId).toBe('version-3')
    expect(scheduleStoreMock.selectedVersionId).toBe('version-2')

    await wrapper.get('[data-test="step5-compare-button"]').trigger('click')
    await flushPromises()

    expect(document.querySelector('[data-test="comparison-workspace"]')).toBeTruthy()
    expect(document.body.textContent).toContain('비교 대상 변경')
    expect(document.body.textContent).toContain('근무표안 비교')
    expect(document.body.textContent).toContain(
      'Off 요청 차이와 필수 기준 충족 여부를 비교한 뒤 필요한 근무표안을 자세히 확인하세요.',
    )
    expect(document.body.textContent).toContain('V3')
    expect(document.body.textContent).not.toContain('V1')
  })

  it('hides solve_failed versions from comparison candidates even when requested by query', async () => {
    routeMock.query = {
      version: 'version-3',
      compare: 'version-2',
    }
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-3',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        createVersionSummary({
          id: 'version-1',
          versionNo: 1,
          sourceType: 'initial_solve',
          status: 'review_ready',
          latestEvaluationId: 'evaluation-1',
        }),
        createVersionSummary({
          id: 'version-2',
          versionNo: 2,
          name: '실패본',
          status: 'solve_failed',
          latestEvaluationId: 'evaluation-failed',
          latestEvaluationResultStatus: 'solve_failed',
          inputDiffSummary: {
            changedOffRequests: 3,
            changedLockedAssignments: 0,
            changedSiteRequirements: 0,
            note: 'failed compare candidate',
          },
        }),
        createVersionSummary({
          id: 'version-3',
          versionNo: 3,
          name: '성공본',
          isSelected: true,
        }),
      ],
    })
    getPhase2ScheduleReviewMock.mockImplementation((versionId: string) => {
      return Promise.resolve(createReviewResponse(versionId, {
        selectedVersionId: 'version-3',
        version: {
          name: versionId === 'version-3' ? '성공본' : `V${versionId.at(-1)}`,
          isSelected: versionId === 'version-3',
        },
      }))
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="comparison-tools-section"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('성공본')
    expect(wrapper.text()).not.toContain('실패본')
    expect(scheduleStoreMock.previewVersionId).toBe('version-3')
    expect(replaceMock).toHaveBeenCalledWith(buildCanonicalStep5RouteLocation('schedule-1'))

    await wrapper.get('[data-test="step5-compare-button"]').trigger('click')
    await flushPromises()

    expect(document.body.textContent).toContain('비교 대상 변경')
    expect(document.body.textContent).toContain('V1')
    expect(document.body.textContent).not.toContain('실패본')
  })

  it('canonicalizes finalized months to the locked preview version and hides comparison tools', async () => {
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
    expect(wrapper.find('[data-test="comparison-tools-section"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('비교 후보')
    expect(wrapper.text()).not.toContain('비교 워크스페이스')
    expect(selectPhase2ScheduleVersionMock).not.toHaveBeenCalled()
  })

  it('changes the focused version only when the explicit detail button is clicked', async () => {
    routeMock.query = {
      version: 'version-3',
      compare: 'version-3,version-2',
    }
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        createVersionSummary({ id: 'version-1', versionNo: 1, sourceType: 'initial_solve', manualEditCount: 0, inputDiffSummary: { changedOffRequests: 0, changedLockedAssignments: 0, changedSiteRequirements: 0, note: null } }),
        createVersionSummary({ id: 'version-2', versionNo: 2, isSelected: true }),
        createVersionSummary({
          id: 'version-3',
          versionNo: 3,
          baseVersionId: 'version-2',
          sourceType: 're_solve',
          status: 'review_ready',
          manualEditCount: 2,
          inputDiffSummary: {
            changedOffRequests: 2,
            changedLockedAssignments: 0,
            changedSiteRequirements: 0,
            note: 'candidate',
          },
        }),
      ],
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="focus-version-3"]').exists()).toBe(false)
    await wrapper.get('[data-test="step5-compare-button"]').trigger('click')
    await flushPromises()
    await clickDocumentTestId('focus-version-3')

    expect(scheduleStoreMock.setPreviewVersionId).toHaveBeenCalledWith('version-3')
    expect(selectPhase2ScheduleVersionMock).not.toHaveBeenCalled()
  })

  it('requires confirmation before discarding unsaved changes on focused-version switch', async () => {
    routeMock.query = {
      version: 'version-3',
      compare: 'version-3,version-2',
    }
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        createVersionSummary({ id: 'version-1', versionNo: 1, sourceType: 'initial_solve', manualEditCount: 0, inputDiffSummary: { changedOffRequests: 0, changedLockedAssignments: 0, changedSiteRequirements: 0, note: null } }),
        createVersionSummary({ id: 'version-2', versionNo: 2, isSelected: true }),
        createVersionSummary({
          id: 'version-3',
          versionNo: 3,
          baseVersionId: 'version-2',
          sourceType: 're_solve',
          status: 'review_ready',
          manualEditCount: 2,
          inputDiffSummary: {
            changedOffRequests: 2,
            changedLockedAssignments: 0,
            changedSiteRequirements: 0,
            note: 'candidate',
          },
        }),
      ],
    })
    const warningMock = vi.fn()
    ;(window as unknown as { $dialog?: Record<string, unknown> }).$dialog = {
      info: vi.fn(),
      warning: warningMock,
    }

    const wrapper = createWrapper()
    await flushPromises()
    vi.clearAllMocks()

    await wrapper.get('[data-test="step5-compare-button"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-test="grid-edit"]').trigger('click')
    await flushPromises()
    await clickDocumentTestId('focus-version-2')

    expect(warningMock).toHaveBeenCalledTimes(1)
    expect(scheduleStoreMock.setPreviewVersionId).not.toHaveBeenCalledWith('version-2')
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

    await wrapper.get('[data-test="step5-compare-button"]').trigger('click')
    await flushPromises()

    await clickDocumentTestId('select-version-1')
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
    expect(wrapper.find('[data-test="primary-action-button"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="finalize-schedule-button"]').attributes('disabled')).toBeDefined()
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
    expect(wrapper.find('[data-test="primary-action-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="finalize-schedule-button"]').exists()).toBe(false)
  })

  it('finalizes the current single version from the bottom action bar', async () => {
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-1',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        createVersionSummary({
          id: 'version-1',
          versionNo: 1,
          isSelected: true,
          status: 'review_ready',
        }),
      ],
    })
    getPhase2ScheduleReviewMock.mockResolvedValue(
      createReviewResponse('version-1', {
        selectedVersionId: 'version-1',
        version: {
          status: 'review_ready',
          isSelected: true,
        },
        primaryAction: {
          kind: 'finalize',
          targetVersionId: 'version-1',
          label: 'Finalize',
          disabledReason: null,
        },
      })
    )

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="step5-compare-button"]').exists()).toBe(false)

    await wrapper.get('[data-test="finalize-schedule-button"]').trigger('click')
    await flushPromises()

    expect(finalizePhase2ScheduleVersionMock).toHaveBeenCalledWith('version-1')
    expect(showSuccessMock).toHaveBeenCalledWith('근무표안을 확정했습니다.')
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

  it('generates the full previous-month window up to seven days', async () => {
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
          '2025-03-25': 'D',
          '2025-03-26': 'D',
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

    expect(gridMock.generateDates).toHaveBeenCalledWith('2025-04', 7)
    expect(gridMock.dates.value.filter((date) => date.isLastMonth)).toHaveLength(7)
    expect(gridMock.dates.value[0]?.date).toBe('2025-03-25')
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

    expect(showErrorMock).toHaveBeenCalledWith('다른 근무표안이 생성 중입니다. 완료 후 다시 시도해주세요.')
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

  it('re-solves the current preview version without creating a new candidate version', async () => {
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

    expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled()
    expect(resetPreferenceResolutionByVersionMock).toHaveBeenCalledWith('version-2')
    expect(solverMock.startSolver).toHaveBeenCalledWith('version-2', {})
    expect(scheduleStoreMock.selectedVersionId).toBe('version-2')
    expect(scheduleStoreMock.setPreviewVersionId).not.toHaveBeenCalledWith('version-3')
    expect(replaceMock).not.toHaveBeenCalledWith(
      buildStep5RouteLocation('schedule-1', {
        versionId: 'version-3',
      })
    )
  })

  it('consumes autoStart from the Step4 handoff and starts the solver once', async () => {
    routeMock.query = {
      version: 'version-1',
      autoStart: '1',
    }
    getPhase2ScheduleCompareMock.mockReset()
    getPhase2ScheduleReviewMock.mockReset()
    getScheduleVersionAssignmentsMock.mockReset()
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-1',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        createVersionSummary({
          id: 'version-1',
          versionNo: 1,
          isSelected: true,
          status: 'draft',
        }),
      ],
    })
    getPhase2ScheduleReviewMock.mockImplementation((versionId: string) => {
      return Promise.resolve(createReviewResponse(versionId))
    })
    getScheduleVersionAssignmentsMock.mockImplementation(async (versionId: string) => ({
      assignments: versionId === 'version-1'
        ? {}
        : {
            'emp-1': {
              '2025-12-01': 'D',
            },
          },
      offReasons: {},
      comments: {},
    }))
    scheduleStoreMock.siteRequirements = [
      {
        dayOfWeek: 1,
        shiftCode: 'D',
        requiredCount: 1,
      },
    ]

    createWrapper()
    await flushPromises()
    await flushPromises()

    expect(replaceMock).toHaveBeenCalledWith(buildCanonicalStep5RouteLocation('schedule-1'))
    expect(resetPreferenceResolutionByVersionMock).toHaveBeenCalledWith('version-1')
    expect(solverMock.startSolver).toHaveBeenCalledTimes(1)
    expect(solverMock.startSolver).toHaveBeenCalledWith('version-1', {})
  })

  it('starts the solver for a mutable draft preview even when another version has executed history', async () => {
    routeMock.query = {
      version: 'version-1',
      autoStart: '1',
    }
    getPhase2ScheduleCompareMock.mockReset()
    getPhase2ScheduleReviewMock.mockReset()
    getScheduleVersionAssignmentsMock.mockReset()
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-1',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        createVersionSummary({
          id: 'version-1',
          versionNo: 1,
          isSelected: true,
          status: 'draft',
        }),
        createVersionSummary({
          id: 'version-2',
          versionNo: 2,
          status: 'review_ready',
          latestEvaluationId: 'evaluation-2',
        }),
      ],
    })
    getPhase2ScheduleReviewMock.mockImplementation((versionId: string) => {
      return Promise.resolve(createReviewResponse(versionId))
    })
    getScheduleVersionAssignmentsMock.mockImplementation(async (versionId: string) => ({
      assignments: versionId === 'version-1'
        ? {}
        : {
            'emp-1': {
              '2025-12-01': 'D',
            },
          },
      offReasons: {},
      comments: {},
    }))
    scheduleStoreMock.siteRequirements = [
      {
        dayOfWeek: 1,
        shiftCode: 'D',
        requiredCount: 1,
      },
    ]

    createWrapper()
    await flushPromises()
    await flushPromises()

    expect(replaceMock).toHaveBeenCalledWith(buildCanonicalStep5RouteLocation('schedule-1'))
    expect(resetPreferenceResolutionByVersionMock).toHaveBeenCalledWith('version-1')
    expect(solverMock.startSolver).toHaveBeenCalledWith('version-1', {})
  })

  it('strips autoStart without starting the solver when another version is actively solving', async () => {
    routeMock.query = {
      version: 'version-1',
      autoStart: '1',
    }
    getPhase2ScheduleCompareMock.mockReset()
    getPhase2ScheduleReviewMock.mockReset()
    getScheduleVersionAssignmentsMock.mockReset()
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-1',
      finalizedVersionId: null,
      activeSolvingVersionId: 'version-2',
      versions: [
        createVersionSummary({
          id: 'version-1',
          versionNo: 1,
          isSelected: true,
          status: 'draft',
        }),
        createVersionSummary({
          id: 'version-2',
          versionNo: 2,
          status: 'solving',
          activeSolverExecutionId: 'exec-2',
        }),
      ],
    })
    getPhase2ScheduleReviewMock.mockImplementation((versionId: string) => {
      return Promise.resolve(createReviewResponse(versionId))
    })
    getScheduleVersionAssignmentsMock.mockImplementation(async (versionId: string) => ({
      assignments: versionId === 'version-1'
        ? {}
        : {
            'emp-1': {
              '2025-12-01': 'D',
            },
          },
      offReasons: {},
      comments: {},
    }))
    scheduleStoreMock.siteRequirements = [
      {
        dayOfWeek: 1,
        shiftCode: 'D',
        requiredCount: 1,
      },
    ]

    createWrapper()
    await flushPromises()
    await flushPromises()

    expect(replaceMock).toHaveBeenCalledWith(buildCanonicalStep5RouteLocation('schedule-1'))
    expect(resetPreferenceResolutionByVersionMock).not.toHaveBeenCalled()
    expect(solverMock.startSolver).not.toHaveBeenCalled()
  })

  it('strips autoStart without starting the solver when current-month assignments already exist', async () => {
    routeMock.query = {
      version: 'version-2',
      autoStart: '1',
    }

    createWrapper()
    await flushPromises()
    await flushPromises()

    expect(replaceMock).toHaveBeenCalledWith(
      buildCanonicalStep5RouteLocation('schedule-1', {
        autoStart: true,
      })
    )
    expect(replaceMock).toHaveBeenLastCalledWith(buildCanonicalStep5RouteLocation('schedule-1'))
    expect(solverMock.startSolver).not.toHaveBeenCalled()
  })

  it('blocks re-solve when there are unsaved manual changes', async () => {
    solverMock.status.value = 'complete'
    routeMock.query = {
      version: 'version-2',
    }

    const wrapper = createWrapper()
    await flushPromises()
    vi.clearAllMocks()

    await wrapper.get('[data-test="grid-edit"]').trigger('click')
    await flushPromises()

    const regenerateButton = wrapper.findAll('button')
      .find((button) => button.text().includes('더 개선하기'))
    expect(regenerateButton).toBeTruthy()

    await regenerateButton!.trigger('click')
    await flushPromises()

    expect(showInfoMock).toHaveBeenCalledWith('변경사항을 먼저 저장하거나 취소한 뒤 다시 생성해주세요.')
    expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled()
    expect(solverMock.startSolver).not.toHaveBeenCalled()
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
    expect(saveButton!.attributes('disabled')).toBeDefined()

    await saveButton!.trigger('click')
    await flushPromises()

    expect(showInfoMock).not.toHaveBeenCalledWith('변경사항이 없습니다')
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
