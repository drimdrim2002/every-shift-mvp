import dayjs from 'dayjs'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildCanonicalStep5RouteLocation,
  buildStep4RouteLocation,
  buildStep5RouteLocation,
  getAppHomeRoutePath,
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
  unfinalizePhase2ScheduleVersionMock,
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
  listPublicHolidayDatesInRangeMock,
  loadSolverYearlyEmployeeStatsMock,
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
  unfinalizePhase2ScheduleVersionMock: vi.fn(),
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
  listPublicHolidayDatesInRangeMock: vi.fn(),
  loadSolverYearlyEmployeeStatsMock: vi.fn(),
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
  unfinalizePhase2ScheduleVersion: unfinalizePhase2ScheduleVersionMock,
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

vi.mock('@/api/publicHolidays', () => ({
  listPublicHolidayDatesInRange: listPublicHolidayDatesInRangeMock,
}))

vi.mock('@/api/solverYearlyEmployeeStats', () => ({
  loadSolverYearlyEmployeeStats: loadSolverYearlyEmployeeStatsMock,
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

function createStep5SolverRequest(month = '2025-12') {
  return {
    organization: {
      id: 'org-1',
      name: '서울병원',
      type: 'hospital',
      shifts: [
        {
          id: 'shift-1',
          code: 'D',
          name: 'Day',
          start_time: '08:00:00',
          end_time: '16:00:00',
        },
      ],
      lastHistoricalDate: dayjs(`${month}-01`).subtract(5, 'day').format('YYYY-MM-DD'),
      firstDraftDate: `${month}-01`,
      publishLength: 5,
      draftLength: dayjs(`${month}-01`).daysInMonth(),
    },
    employees: [
      {
        employee_id: 'emp-1',
        name: 'Kim',
        available_shifts: ['D', 'E', 'N', 'O'],
        skill_set: ['ALL'],
      },
    ],
    history: [],
    undesirable: [],
    requirements: [],
    publicHolidays: [],
    yearlyEmployeeStats: [],
  }
}

const april2025WeekendAndHolidayDates = [
  { date: '2025-04-04', dayOfWeek: 5, dayName: '금', kind: 'friday' },
  { date: '2025-04-05', dayOfWeek: 6, dayName: '토', kind: 'saturday' },
  { date: '2025-04-06', dayOfWeek: 0, dayName: '일', kind: 'sunday' },
  { date: '2025-04-11', dayOfWeek: 5, dayName: '금', kind: 'friday' },
  { date: '2025-04-12', dayOfWeek: 6, dayName: '토', kind: 'saturday' },
  { date: '2025-04-13', dayOfWeek: 0, dayName: '일', kind: 'sunday' },
  { date: '2025-04-15', dayOfWeek: 2, dayName: '화', kind: 'publicHoliday' },
  { date: '2025-04-18', dayOfWeek: 5, dayName: '금', kind: 'friday' },
  { date: '2025-04-19', dayOfWeek: 6, dayName: '토', kind: 'saturday' },
  { date: '2025-04-20', dayOfWeek: 0, dayName: '일', kind: 'sunday' },
  { date: '2025-04-25', dayOfWeek: 5, dayName: '금', kind: 'friday' },
  { date: '2025-04-26', dayOfWeek: 6, dayName: '토', kind: 'saturday' },
  { date: '2025-04-27', dayOfWeek: 0, dayName: '일', kind: 'sunday' },
]

const december2025WeekendAndHolidayDates = [
  { date: '2025-12-05', dayOfWeek: 5, dayName: '금', kind: 'friday' },
  { date: '2025-12-06', dayOfWeek: 6, dayName: '토', kind: 'saturday' },
  { date: '2025-12-07', dayOfWeek: 0, dayName: '일', kind: 'sunday' },
  { date: '2025-12-12', dayOfWeek: 5, dayName: '금', kind: 'friday' },
  { date: '2025-12-13', dayOfWeek: 6, dayName: '토', kind: 'saturday' },
  { date: '2025-12-14', dayOfWeek: 0, dayName: '일', kind: 'sunday' },
  { date: '2025-12-19', dayOfWeek: 5, dayName: '금', kind: 'friday' },
  { date: '2025-12-20', dayOfWeek: 6, dayName: '토', kind: 'saturday' },
  { date: '2025-12-21', dayOfWeek: 0, dayName: '일', kind: 'sunday' },
  { date: '2025-12-25', dayOfWeek: 4, dayName: '목', kind: 'publicHoliday' },
  { date: '2025-12-26', dayOfWeek: 5, dayName: '금', kind: 'friday' },
  { date: '2025-12-27', dayOfWeek: 6, dayName: '토', kind: 'saturday' },
  { date: '2025-12-28', dayOfWeek: 0, dayName: '일', kind: 'sunday' },
]

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
  default: defineComponent({
    inheritAttrs: false,
    props: {
      employees: { type: Array, default: () => [] },
      statisticsEmployees: { type: Array, default: undefined },
      pairDisplayMetaByEmployeeId: { type: Object, default: undefined },
    },
    emits: ['update:assignment'],
    template: `
      <div data-test="schedule-grid-stub" v-bind="$attrs">
        <span data-test="schedule-grid-employee-count">{{ employees.length }}</span>
        <span data-test="schedule-grid-statistics-employee-count">{{ statisticsEmployees?.length ?? 0 }}</span>
        <span data-test="schedule-grid-has-pair-meta">{{ pairDisplayMetaByEmployeeId ? 'yes' : 'no' }}</span>
        <button data-test="grid-edit" @click="$emit('update:assignment', { employeeId: 'emp-1', date: '2025-12-01', shiftCode: 'D' })">grid-edit</button>
      </div>
    `,
  }),
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

function createWrapper(customStubs: Record<string, unknown> = {}) {
  const wrapper = mount(Step5Result, {
    global: {
      stubs: {
        NCard: { template: '<div><slot /></div>' },
        NButton: { props: ['disabled'], template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
        NBadge: { template: '<div />' },
        NProgress: { template: '<div />' },
        NAlert: { template: '<div><slot /></div>' },
        NInputNumber: {
          name: 'NInputNumber',
          props: ['value', 'min', 'max', 'step', 'disabled'],
          template: '<input type="number" :value="value" :min="min" :max="max" :step="step" :disabled="disabled" @input="$emit(\'update:value\', Number($event.target.value))" />',
        },
        NSpin: { template: '<div><slot /></div>' },
        NSelect: {
          name: 'NSelect',
          props: ['value', 'options'],
          template: '<select :value="value ?? \'\'" @change="$emit(\'update:value\', $event.target.value || null)"><option value="">직원 선택</option><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select>',
        },
        ...customStubs,
      },
    },
  })

  mountedWrappers.push(wrapper)
  return wrapper
}

async function emitButtonComponentClick(wrapper: ReturnType<typeof createWrapper>, testId: string) {
  const buttons = [
    ...wrapper.findAllComponents({ name: 'NButton' }),
    ...wrapper.findAllComponents({ name: 'Button' }),
  ]
  const button = buttons.find((candidate) => candidate.attributes('data-test') === testId)

  expect(button).toBeTruthy()
  button!.vm.$emit('click')
  await flushPromises()
}

async function clickDocumentTestId(testId: string) {
  const target = document.querySelector<HTMLElement>(`[data-test="${testId}"]`)
  expect(target).toBeTruthy()
  target!.click()
  await flushPromises()
}

async function switchToSiteView(wrapper: ReturnType<typeof createWrapper>) {
  await wrapper.get('[data-test="step5-result-view-site"]').trigger('click')
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

function mockSingleFinalizeReview(options: {
  assignments?: Record<string, Record<string, string>>
  primaryAction?: Record<string, unknown>
} = {}) {
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
        ...options.primaryAction,
      },
    })
  )
  getScheduleVersionAssignmentsMock.mockResolvedValue({
    assignments: options.assignments ?? {
      'emp-1': {
        '2025-12-01': 'D',
      },
    },
    offReasons: {},
    comments: {},
  })
}

function installAutoConfirmDialog() {
  const dialogInfoMock = vi.fn((options: { onPositiveClick?: () => Promise<void> | void }) => {
    options.onPositiveClick?.()
  })

  ;(window as unknown as { $dialog?: Record<string, unknown> }).$dialog = {
    info: dialogInfoMock,
    warning: vi.fn(),
  }

  return dialogInfoMock
}

function setVisibleAssignments(assignments: Record<string, Record<string, string>>) {
  gridMock.assignments.value = assignments
}

function expectGuidelineSummary(wrapper: ReturnType<typeof createWrapper>, text: string) {
  expect(wrapper.get('[data-test="step5-summary-card-guideline"]').text()).toContain(text)
}

function stubWindowHostname(hostname: string) {
  vi.stubGlobal('location', {
    ...window.location,
    hostname,
  })
}

describe('Step5Result', () => {
  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    stubWindowHostname('app.everyshift.test')
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
    gridMock.employees.value = [
      {
        id: 'emp-1',
        employeeId: 'emp-1',
        name: 'Kim',
      },
    ]
    gridMock.assignments.value = {}
    gridMock.offReasons.value = {}
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
    mapToSolverRequestMock.mockImplementation((basicInfo: { month?: string }) => (
      createStep5SolverRequest(basicInfo.month)
    ))
    listPublicHolidayDatesInRangeMock.mockResolvedValue(['2025-12-25'])
    loadSolverYearlyEmployeeStatsMock.mockResolvedValue([])
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
    unfinalizePhase2ScheduleVersionMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      scheduleVersionId: 'version-2',
      status: 'review_ready',
      finalizedVersionId: null,
      finalizedAt: null,
      finalizedBy: null,
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

  it('normalizes a deep-linked candidate preview to the selected single-version preview', async () => {
    routeMock.query = {
      version: 'version-1',
    }

    createWrapper()
    await flushPromises()

    expect(getPhase2ScheduleCompareMock).toHaveBeenCalledWith('schedule-1')
    expect(scheduleStoreMock.setSelectedVersionId).toHaveBeenCalledWith('version-2')
    expect(scheduleStoreMock.setPreviewVersionId).toHaveBeenCalledWith('version-2')
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

  it('shows a user-facing initialization error instead of leaking internal Step5 details', async () => {
    getPhase2ScheduleCompareMock.mockRejectedValueOnce(new Error('Step5 failed: database score mismatch'))

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="step5-initial-load-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('결과 화면을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
    expect(wrapper.text()).not.toContain('Step5')
    expect(wrapper.text()).not.toContain('database')
    expect(wrapper.text()).not.toContain('score')
    expect(wrapper.find('[data-test="result-empty-state"]').exists()).toBe(false)
    expect(showErrorMock).toHaveBeenCalledWith('결과 화면을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
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
    expect(wrapper.find('[data-test="step5-result-status-summary"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="step5-running-progress"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="comparison-tools-section"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="review-tab-panel-grid"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('공정성 요약')
    expect(wrapper.text()).not.toContain('Hard Score:')
    expect(wrapper.text()).not.toContain('Soft Score:')
    expect(wrapper.text()).toContain('근무표 생성 (AI)')
  })

  it('shows only the running progress state while the engine is generating', async () => {
    solverMock.progress.value = 37
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
      assignments: {
        'emp-1': {
          '2025-12-01': 'D',
        },
      },
      offReasons: {},
      comments: {},
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="step5-running-progress"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('근무표를 생성하고 있습니다. 잠시만 기다려 주세요.')
    expect(wrapper.find('[data-test="step5-result-status-summary"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Hard Score:')
    expect(wrapper.text()).not.toContain('Soft Score:')
    expect(wrapper.find('[data-test="result-empty-state"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="step5-site-view"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="review-tab-panel-grid"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('공정성 요약')
    expect(wrapper.text()).not.toContain('중간 결과 대기 중')
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

    expect(wrapper.find('[data-test="step5-result-status-summary"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="step5-running-progress"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('실패')
    expect(wrapper.find('[data-test="result-empty-state"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="comparison-tools-section"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="review-tab-panel-grid"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('공정성 요약')
    expect(wrapper.text()).not.toContain('Hard Score:')
    expect(wrapper.text()).not.toContain('Soft Score:')
    expect(wrapper.text()).toContain('근무표 생성 (AI)')
  })

  describe('Step5 result summary cards', () => {
    it('renders reviewer-facing summary cards for a completed result without solver score jargon', async () => {
      getScheduleStatusMock.mockResolvedValue({
        status: 'complete',
        hard_score: 11,
        soft_score: 22,
        solver_execution_id: null,
      })
      getScheduleVersionPreferencesMock.mockResolvedValue({
        constraints: {
          'emp-1': {
            '2025-12-01': 'O',
            '2025-12-02': 'O',
          },
        },
        notes: {},
        preferences: [],
      })

      const wrapper = createWrapper()
      await flushPromises()

      const summary = wrapper.get('[data-test="step5-result-status-summary"]')
      const generation = wrapper.get('[data-test="step5-summary-card-generation"]')
      const guideline = wrapper.get('[data-test="step5-summary-card-guideline"]')
      const offRequests = wrapper.get('[data-test="step5-summary-card-off-requests"]')
      const finalization = wrapper.get('[data-test="step5-summary-card-finalization"]')

      expect(summary.exists()).toBe(true)
      expect(generation.text()).toContain('생성 상태')
      expect(generation.text()).toContain('완료')
      expect(guideline.text()).toContain('보건복지부 가이드라인')
      expect(guideline.text()).toContain('충족')
      expect(offRequests.text()).toContain('Off 요청')
      expect(offRequests.text()).toContain('1/2')
      expect(offRequests.text()).toContain('50%')
      expect(finalization.text()).toContain('확정')
      expect(wrapper.text()).not.toContain('Hard Score:')
      expect(wrapper.text()).not.toContain('Soft Score:')
    })

    it('opens guideline details from the guideline summary value when violations exist', async () => {
      mockSingleFinalizeReview({
        assignments: {
          'emp-1': {
            '2025-12-01': 'N',
            '2025-12-02': 'O',
            '2025-12-03': 'D',
          },
        },
      })

      const wrapper = createWrapper()
      await flushPromises()

      expect(wrapper.find('[data-test="step5-site-view"] [data-test="compliance-panel"]').exists()).toBe(false)

      const action = wrapper.get('[data-test="step5-summary-card-guideline-action"]')
      expect(action.text()).toContain('위반 1건')

      await action.trigger('click')
      await flushPromises()

      expect(document.querySelector('[data-test="step5-guideline-modal"]')).toBeTruthy()
      expect(document.body.textContent).toContain('보건복지부 가이드라인 상세')
      expect(document.body.textContent).toContain('NOD 금지')
      expect(document.body.textContent).toContain('4연속 야간 금지 (3연속 허용)')
      expect(document.body.textContent).toContain('연속 야간 후 48시간 휴식')
      expect(document.body.textContent).toContain('월 야간 15회 이하')
      expect(document.body.textContent).toContain('위반 상세')
      expect(document.body.textContent).toContain('Kim')
      expect(document.body.textContent).not.toContain('Off 요청 반영')
    })

    it('opens Off request details grouped by employee from the Off request summary value', async () => {
      gridMock.employees.value = [
        {
          id: 'emp-1',
          employeeId: 'E001',
          name: '김간호',
        },
        {
          id: 'emp-2',
          employeeId: 'E002',
          name: '이간호',
        },
      ]
      getScheduleStatusMock.mockResolvedValue({
        status: 'complete',
        hard_score: 11,
        soft_score: 22,
        solver_execution_id: null,
      })
      getScheduleVersionAssignmentsMock.mockResolvedValue({
        assignments: {
          'emp-1': {
            '2025-12-01': 'O',
            '2025-12-02': 'D',
          },
          'emp-2': {
            '2025-12-03': '',
          },
        },
        offReasons: {},
        comments: {},
      })
      getScheduleVersionPreferencesMock.mockResolvedValue({
        constraints: {
          'emp-1': {
            '2025-12-01': 'O',
            '2025-12-02': 'O',
          },
          'emp-2': {
            '2025-12-03': 'O',
          },
        },
        notes: {
          'emp-1': {
            '2025-12-01': '가족 일정',
            '2025-12-02': '외래 진료',
          },
          'emp-2': {
            '2025-12-03': '개인 일정',
          },
        },
        preferences: [],
      })
      getPhase2ScheduleReviewMock.mockImplementation((versionId: string) => {
        return Promise.resolve(createReviewResponse(versionId, {
          latestEvaluation: {
            offRequestResults: [
              {
                employeeId: 'emp-1',
                date: '2025-12-02',
                requestCode: 'O',
                requestNote: '외래 진료',
                isSoft: false,
                resolutionStatus: 'unfulfilled',
                resolvedShiftId: null,
                resolvedAt: null,
                fulfilled: false,
                reason: '필요 인력 기준 때문에 D 근무로 배정되었습니다.',
              },
            ],
          },
        }))
      })

      const wrapper = createWrapper()
      await flushPromises()

      const action = wrapper.get('[data-test="step5-summary-card-off-requests-action"]')
      expect(action.text()).toContain('2/3 반영')

      await action.trigger('click')
      await flushPromises()

      expect(document.querySelector('[data-test="step5-off-request-modal"]')).toBeTruthy()
      expect(document.querySelectorAll('[data-test="off-request-employee-group"]')).toHaveLength(2)
      expect(document.querySelectorAll('[data-test="off-request-row"]')).toHaveLength(3)
      expect(document.body.textContent).toContain('Off 요청 상세')
      expect(document.body.textContent).toContain('김간호')
      expect(document.body.textContent).toContain('요청 2건')
      expect(document.body.textContent).toContain('미반영 1건')
      expect(document.body.textContent).toContain('외래 진료')
      expect(document.body.textContent).toContain('실제 배정 D')
      expect(document.body.textContent).toContain('필요 인력 기준 때문에 D 근무로 배정되었습니다.')
      expect(document.body.textContent).toContain('이간호')
      expect(document.body.textContent).toContain('개인 일정')
      expect(document.body.textContent).toContain('실제 배정 미배정')
    })

    it('opens guideline details from the guideline summary value when guidelines are satisfied', async () => {
      const wrapper = createWrapper()
      await flushPromises()

      expect(wrapper.get('[data-test="step5-summary-card-guideline"]').text()).toContain('충족')
      expect(wrapper.get('[data-test="step5-summary-card-off-requests"]').text()).toContain('요청 없음')
      expect(wrapper.find('[data-test="step5-summary-card-guideline-action"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="step5-summary-card-off-requests-action"]').exists()).toBe(false)

      await wrapper.get('[data-test="step5-summary-card-guideline-action"]').trigger('click')
      await flushPromises()

      expect(document.querySelector('[data-test="step5-guideline-modal"]')).toBeTruthy()
      expect(document.body.textContent).toContain('보건복지부 가이드라인 상세')
      expect(document.body.textContent).toContain('위반 없음')
      expect(document.body.textContent).toContain('보건복지부 가이드라인 위반 항목이 없습니다.')
      expect(document.body.textContent).not.toContain('Off 요청 반영')
    })

    it('hides result summary cards during generation even before partial results arrive', async () => {
      solverMock.progress.value = 37
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

      expect(wrapper.find('[data-test="step5-running-progress"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('근무표를 생성하고 있습니다. 잠시만 기다려 주세요.')
      expect(wrapper.find('[data-test="step5-result-status-summary"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="step5-summary-card-generation"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="step5-summary-card-guideline"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="step5-summary-card-off-requests"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="step5-summary-card-finalization"]').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('Hard Score:')
      expect(wrapper.text()).not.toContain('Soft Score:')
      expect(wrapper.text()).not.toContain('중간 결과 대기 중')
    })
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

    await switchToSiteView(wrapper)
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

    await switchToSiteView(wrapper)
    await wrapper.get('[data-test="grid-edit"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('입력 수정으로 돌아가면 새 근무표안을 만들 수 있습니다.')

    const step4Button = wrapper.findAll('button')
      .find((button) => button.text().includes('Off 수정'))
    expect(step4Button).toBeTruthy()

    await step4Button!.trigger('click')
    await flushPromises()

    expect(warningMock).toHaveBeenCalledTimes(1)
    expect(pushMock).not.toHaveBeenCalledWith(buildStep4RouteLocation({ versionId: 'version-2' }))

    const dialogConfig = warningMock.mock.calls[0]?.[0] as {
      onPositiveClick?: () => void | Promise<void>
    }
    await dialogConfig.onPositiveClick?.()

    expect(pushMock).toHaveBeenCalledWith(buildStep4RouteLocation({ versionId: 'version-2' }))
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

    expect(pushMock).not.toHaveBeenCalledWith(buildStep4RouteLocation({ versionId: 'version-2' }))
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
    expect(document.body.textContent).toContain('현재 근무표 생성 결과 삭제')
    expect(document.body.textContent).not.toContain('모든 안의 생성 결과 삭제')
    expect(document.querySelector('[data-test="delete-scope-option-all-active-versions"]')).toBeNull()
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
      '현재 근무표 생성 결과를 삭제했습니다. Step4에서 요청을 다시 확인해주세요.'
    )
    expect(pushMock).toHaveBeenCalledWith(buildStep4RouteLocation({ versionId: 'version-1' }))
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

  describe.skip('legacy comparison modal workflows', () => {
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

    await switchToSiteView(wrapper)
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

  it('hides comparison modal entry points for the MVP single-version flow', async () => {
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
    expect(scheduleStoreMock.previewVersionId).toBe('version-2')
    expect(scheduleStoreMock.selectedVersionId).toBe('version-2')
    expect(wrapper.find('[data-test="step5-compare-button"]').exists()).toBe(false)
    expect(document.querySelector('[data-test="comparison-workspace"]')).toBeNull()
    expect(document.querySelector('[data-test^="focus-version-"]')).toBeNull()
    expect(document.querySelector('[data-test^="select-version-"]')).toBeNull()
    expect(document.querySelector('[data-test^="delete-version-"]')).toBeNull()
  })

  describe.skip('legacy comparison modal data workflows', () => {
  it('loads compared version assignments and preferences for compliance comparison', async () => {
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
        createVersionSummary({ id: 'version-1', versionNo: 1, sourceType: 'initial_solve' }),
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
    getScheduleVersionAssignmentsMock.mockImplementation((versionId: string) => {
      if (versionId === 'version-3') {
        return Promise.resolve({
          assignments: {
            'emp-1': {
              '2025-12-01': 'D',
            },
          },
          offReasons: {},
          comments: {},
        })
      }

      return Promise.resolve({
        assignments: {
          'emp-1': {
            '2025-12-03': 'D',
          },
        },
        offReasons: {},
        comments: {},
      })
    })
    getScheduleVersionPreferencesMock.mockImplementation((versionId: string) => {
      if (versionId === 'version-3') {
        return Promise.resolve({
          constraints: {
            'emp-1': {
              '2025-12-02': 'O',
              '2026-01-01': 'O',
            },
          },
          notes: {
            'emp-1': {
              '2025-12-02': '왼쪽 메모',
              '2026-01-01': '다음 달 메모',
            },
          },
          preferences: [],
        })
      }

      return Promise.resolve({
        constraints: {
          'emp-1': {
            '2025-12-03': 'O',
          },
        },
        notes: {
          'emp-1': {
            '2025-12-03': '오른쪽 메모',
          },
        },
        preferences: [],
      })
    })

    const wrapper = createWrapper()
    await flushPromises()
    vi.clearAllMocks()
    getScheduleVersionAssignmentsMock.mockImplementation((versionId: string) => {
      if (versionId === 'version-3') {
        return Promise.resolve({
          assignments: {
            'emp-1': {
              '2025-11-30': 'N',
            },
          },
          offReasons: {},
          comments: {},
        })
      }

      return Promise.resolve({
        assignments: {
          'emp-1': {
            '2025-12-03': 'D',
          },
        },
        offReasons: {},
        comments: {},
      })
    })

    await wrapper.get('[data-test="step5-compare-button"]').trigger('click')
    await flushPromises()

    expect(getScheduleVersionAssignmentsMock).toHaveBeenCalledWith('version-3')
    expect(getScheduleVersionAssignmentsMock).toHaveBeenCalledWith('version-2')
    expect(getScheduleVersionPreferencesMock).toHaveBeenCalledWith('version-3')
    expect(getScheduleVersionPreferencesMock).toHaveBeenCalledWith('version-2')
    expect(document.body.textContent).toContain('1건 중 1건 반영 (100%)')
    expect(document.body.textContent).toContain('1건 중 0건 반영 (0%)')
    expect(document.body.textContent).toContain('Kim')
    expect(document.body.textContent).toContain('V3만 Off')
    expect(document.body.textContent).toContain('V2만 Off')
    expect(document.body.textContent).not.toContain('2026-01-01')
  })

  it('uses live focused-version compliance in comparison while preserving loaded off-input data', async () => {
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
        createVersionSummary({ id: 'version-1', versionNo: 1, sourceType: 'initial_solve' }),
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
    getScheduleVersionAssignmentsMock.mockImplementation((versionId: string) => {
      if (versionId === 'version-3') {
        return Promise.resolve({
          assignments: {
            'emp-1': {
              '2025-12-01': 'N',
              '2025-12-02': 'O',
              '2025-12-03': 'D',
            },
          },
          offReasons: {},
          comments: {},
        })
      }

      return Promise.resolve({
        assignments: {
          'emp-1': {
            '2025-12-11': 'N',
            '2025-12-12': 'O',
            '2025-12-13': 'D',
          },
        },
        offReasons: {},
        comments: {},
      })
    })
    getScheduleVersionPreferencesMock.mockImplementation((versionId: string) => {
      if (versionId === 'version-3') {
        return Promise.resolve({
          constraints: {
            'emp-1': {
              '2025-12-02': 'O',
              '2026-01-01': 'O',
            },
          },
          notes: {
            'emp-1': {
              '2025-12-02': '왼쪽 메모',
              '2026-01-01': '다음 달 메모',
            },
          },
          preferences: [],
        })
      }

      return Promise.resolve({
        constraints: {
          'emp-1': {
            '2025-12-03': 'O',
          },
        },
        notes: {
          'emp-1': {
            '2025-12-03': '오른쪽 메모',
          },
        },
        preferences: [],
      })
    })

    const wrapper = createWrapper()
    await flushPromises()

    setVisibleAssignments({
      'emp-1': {
        '2025-12-01': 'D',
        '2025-12-02': 'D',
        '2025-12-03': 'D',
      },
    })
    await flushPromises()
    expectGuidelineSummary(wrapper, '충족')

    vi.clearAllMocks()
    await wrapper.get('[data-test="step5-compare-button"]').trigger('click')
    await flushPromises()

    expect(getScheduleVersionAssignmentsMock).toHaveBeenCalledWith('version-3')
    expect(getScheduleVersionAssignmentsMock).toHaveBeenCalledWith('version-2')
    expect(getScheduleVersionPreferencesMock).toHaveBeenCalledWith('version-3')
    expect(getScheduleVersionPreferencesMock).toHaveBeenCalledWith('version-2')

    const requirements = document.querySelector('[data-test="comparison-requirements"]')
    expect(requirements).toBeTruthy()

    const nodRow = Array.from(requirements!.querySelectorAll('div')).find((element) => {
      const text = element.textContent ?? ''
      return text.includes('NOD 근무 불가') && text.includes('필수 기준')
    })
    expect(nodRow).toBeTruthy()

    const normalizedNodRowText = (nodRow?.textContent ?? '').replace(/\s+/g, ' ').trim()
    const leftSlotText = document.querySelector('[data-test="comparison-slot-left"]')?.textContent ?? ''
    const isLeftFocused = leftSlotText.includes('현재 확인 중')
    if (isLeftFocused) {
      expect(normalizedNodRowText).toMatch(/NOD 근무 불가.*통과.*위반 1건/)
    } else {
      expect(normalizedNodRowText).toMatch(/NOD 근무 불가.*위반 1건.*통과/)
    }

    expect(document.body.textContent).toContain('V3만 Off')
    expect(document.body.textContent).toContain('V2만 Off')
    expect(document.body.textContent).not.toContain('2026-01-01')
  })

  it('shows modal-local comparison data errors and retries assignments and preferences', async () => {
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
    vi.clearAllMocks()
    getScheduleVersionAssignmentsMock
      .mockRejectedValueOnce(new Error('assignments failed'))
      .mockResolvedValue({
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

    await wrapper.get('[data-test="step5-compare-button"]').trigger('click')
    await flushPromises()

    expect(document.querySelector('[data-test="compare-modal-error"]')).toBeTruthy()
    expect(document.body.textContent).toContain('비교 데이터를 불러오지 못했습니다.')

    const retryButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('다시 시도'))
    expect(retryButton).toBeTruthy()
    retryButton!.click()
    await flushPromises()

    expect(getScheduleVersionAssignmentsMock.mock.calls.length).toBeGreaterThanOrEqual(3)
    expect(getScheduleVersionPreferencesMock).toHaveBeenCalled()
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

  describe.skip('legacy comparison modal focus workflows', () => {
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

    await switchToSiteView(wrapper)
    await wrapper.get('[data-test="step5-compare-button"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-test="grid-edit"]').trigger('click')
    await flushPromises()
    await clickDocumentTestId('focus-version-2')

    expect(warningMock).toHaveBeenCalledTimes(1)
    expect(scheduleStoreMock.setPreviewVersionId).not.toHaveBeenCalledWith('version-2')
  })
  })

  it('hides authoritative candidate selection in the MVP single-version flow', async () => {
    routeMock.query = { version: 'version-1' }
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        createVersionSummary({
          id: 'version-1',
          versionNo: 1,
          isSelected: false,
          status: 'review_ready',
        }),
        createVersionSummary({
          id: 'version-2',
          versionNo: 2,
          isSelected: true,
        }),
      ],
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="primary-action-button"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('이 근무표안 선택')
    expect(selectPhase2ScheduleVersionMock).not.toHaveBeenCalled()
  })

  it('hides review attention for recheck-only review_blocked evaluation before solver assignments exist', async () => {
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        createVersionSummary({
          id: 'version-2',
          versionNo: 2,
          isSelected: true,
          status: 'review_blocked',
        }),
      ],
    })
    getPhase2ScheduleReviewMock.mockResolvedValue(
      createReviewResponse('version-2', {
        selectedVersionId: 'version-2',
        version: {
          status: 'review_blocked',
          isSelected: true,
        },
        latestEvaluation: {
          id: 'evaluation-2',
          scheduleId: 'schedule-1',
          scheduleVersionId: 'version-2',
          revisionNo: 2,
          resultStatus: 'review_blocked',
          proofSummary: {
            weeklyHoursViolations: 0,
            nnnViolations: 0,
            nodViolations: 0,
            minimumRestViolations: 0,
            staffingShortfalls: 300,
          },
          violationDetails: [
            {
              code: 'staffing_shortfall',
              message: 'Staffing shortfall on 2025-12-01: required 2, assigned 0.',
              severity: 'error',
              affectedEmployeeIds: [],
              dates: ['2025-12-01'],
              metadata: {
                requiredCount: 2,
                assignedCount: 0,
              },
            },
          ],
          infeasibility: null,
          offRequestResults: [],
          comparisonMetrics: null,
          finalizationGate: {
            allowed: false,
            blockingReasons: [],
          },
          assignmentHash: 'hash-2',
          solverExecutionId: null,
          evaluatorVersion: 'test',
          createdAt: '2026-04-02T00:00:00Z',
        },
      })
    )
    getScheduleVersionAssignmentsMock.mockResolvedValue({
      assignments: {},
      offReasons: {},
      comments: {},
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="step5-review-attention-panel"]').exists()).toBe(false)
  })

  it('hides stale post-solve review attention when assignments were cleared before re-run', async () => {
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        createVersionSummary({
          id: 'version-2',
          versionNo: 2,
          isSelected: true,
          status: 'review_ready',
        }),
      ],
    })
    getPhase2ScheduleReviewMock.mockResolvedValue(
      createReviewResponse('version-2', {
        selectedVersionId: 'version-2',
        version: {
          status: 'review_ready',
          isSelected: true,
        },
        latestEvaluation: {
          id: 'evaluation-2',
          scheduleId: 'schedule-1',
          scheduleVersionId: 'version-2',
          revisionNo: 2,
          resultStatus: 'review_blocked',
          proofSummary: {
            weeklyHoursViolations: 0,
            nnnViolations: 0,
            nodViolations: 0,
            minimumRestViolations: 0,
            staffingShortfalls: 2,
          },
          violationDetails: [
            {
              code: 'staffing_shortfall',
              message: 'Staffing shortfall on 2025-12-01: required 2, assigned 1.',
              severity: 'error',
              affectedEmployeeIds: [],
              dates: ['2025-12-01'],
              metadata: {
                requiredCount: 2,
                assignedCount: 1,
              },
            },
          ],
          infeasibility: null,
          offRequestResults: [],
          comparisonMetrics: null,
          finalizationGate: {
            allowed: false,
            blockingReasons: [],
          },
          assignmentHash: 'hash-2',
          solverExecutionId: 'exec-stale-1',
          evaluatorVersion: 'test',
          createdAt: '2026-04-02T00:00:00Z',
        },
      })
    )
    getScheduleVersionAssignmentsMock.mockResolvedValue({
      assignments: {},
      offReasons: {},
      comments: {},
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="step5-review-attention-panel"]').exists()).toBe(false)
  })

  it('keeps review-blocked previews in the local site result shell', async () => {
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
            nnnViolations: 2,
            nodViolations: 3,
            minimumRestViolations: 4,
            staffingShortfalls: 1,
          },
          violationDetails: [
            {
              code: 'hard_constraints_violated',
              message: 'Hard-constraint violations were detected. Recheck after fixing assignments.',
              severity: 'error',
              affectedEmployeeIds: ['emp-1'],
              dates: ['2025-12-01'],
              metadata: {},
            },
            {
              code: 'staffing_shortfall',
              message: 'Staffing shortfall on 2025-12-02: required 2, assigned 1.',
              severity: 'error',
              affectedEmployeeIds: [],
              dates: ['2025-12-02'],
              metadata: {
                requiredCount: 2,
                assignedCount: 1,
              },
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

    expect(scheduleStoreMock.setReviewTab).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="step5-result-view-switch"]').text()).toContain('사이트')
    expect(wrapper.get('[data-test="step5-result-view-switch"]').text()).toContain('근무자')

    await switchToSiteView(wrapper)

    expect(wrapper.find('[data-test="step5-site-view"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="review-tab-grid"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="review-tab-proof"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="review-tab-offRequests"]').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'VersionReviewDetail' }).exists()).toBe(false)
    expect(wrapper.find('[data-test="grid-edit"]').exists()).toBe(true)
    const reviewAttention = wrapper.get('[data-test="step5-review-attention-panel"]')
    expect(reviewAttention.text()).toContain('검토 필요')
    expect(reviewAttention.text()).toContain('주간 시간 위반 1건')
    expect(reviewAttention.text()).toContain('인력 부족 1건')
    expect(reviewAttention.text()).not.toContain('야간 연속 위반')
    expect(reviewAttention.text()).not.toContain('NOD 패턴')
    expect(reviewAttention.text()).not.toContain('휴식 기준 위반')
    expect(reviewAttention.text()).not.toContain('검토 기준 위반이 감지되었습니다. 배정을 수정한 뒤 재검토해주세요.')
    expect(reviewAttention.text()).toContain('2025-12-02 인력 부족: 필요 2명, 배정 1명입니다.')
    expect(reviewAttention.text()).not.toContain('Hard-constraint')
    expect(reviewAttention.text()).not.toContain('하드 제약')
    expect(reviewAttention.text()).not.toContain('Recheck after fixing assignments')
    expect(reviewAttention.text()).not.toContain('Staffing shortfall')
    expect(reviewAttention.text()).not.toContain('required 2')
    expect(reviewAttention.text()).not.toContain('assigned 1')
    expect(wrapper.get('[data-test="primary-action-button"]').text()).toBe('재검토 실행')
    expect(wrapper.get('[data-test="finalize-schedule-button"]').attributes('disabled')).toBeDefined()

    vi.clearAllMocks()
    await emitButtonComponentClick(wrapper, 'primary-action-button')

    expect(recheckPhase2ScheduleVersionMock).toHaveBeenCalledWith('version-2')
    expect(showSuccessMock).toHaveBeenCalledWith('재검토를 완료했습니다.')
  })

  it('removes stale review attention hard-constraint guidance when visible assignments pass local compliance', async () => {
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        createVersionSummary({
          id: 'version-2',
          versionNo: 2,
          isSelected: true,
          status: 'review_blocked',
        }),
      ],
    })
    getPhase2ScheduleReviewMock.mockResolvedValue(
      createReviewResponse('version-2', {
        selectedVersionId: 'version-2',
        version: {
          status: 'review_blocked',
          isSelected: true,
        },
        latestEvaluation: {
          id: 'evaluation-2',
          scheduleId: 'schedule-1',
          scheduleVersionId: 'version-2',
          revisionNo: 2,
          resultStatus: 'review_blocked',
          proofSummary: {
            weeklyHoursViolations: 0,
            nnnViolations: 0,
            nodViolations: 1,
            minimumRestViolations: 0,
            staffingShortfalls: 0,
          },
          violationDetails: [
            {
              code: 'hard_constraints_violated',
              message: 'Hard-constraint violations were detected. Recheck after fixing assignments.',
              severity: 'error',
              affectedEmployeeIds: ['emp-1'],
              dates: ['2025-12-01', '2025-12-02', '2025-12-03'],
              metadata: {},
            },
          ],
          infeasibility: null,
          offRequestResults: [],
          comparisonMetrics: null,
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
    getScheduleVersionAssignmentsMock.mockResolvedValue({
      assignments: {
        'emp-1': {
          '2025-12-01': 'N',
          '2025-12-02': 'O',
          '2025-12-03': 'D',
        },
      },
      offReasons: {},
      comments: {},
    })

    const wrapper = createWrapper()
    await flushPromises()

    expectGuidelineSummary(wrapper, '위반 1건')
    const initialReviewAttention = wrapper.get('[data-test="step5-review-attention-panel"]')
    expect(initialReviewAttention.text()).toContain('보건복지부 가이드라인 위반 1건')

    setVisibleAssignments({
      'emp-1': {
        '2025-12-01': 'D',
        '2025-12-02': 'D',
        '2025-12-03': 'D',
      },
    })
    await flushPromises()

    expectGuidelineSummary(wrapper, '충족')
    expect(wrapper.find('[data-test="step5-review-attention-panel"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('검토 기준 위반이 감지되었습니다')
  })

  it('blocks primary recheck while manual edits are unsaved', async () => {
    mockSingleFinalizeReview({
      primaryAction: {
        kind: 'recheck',
        targetVersionId: 'version-1',
        label: 'Recheck',
        disabledReason: null,
      },
    })

    const wrapper = createWrapper()
    await flushPromises()

    await switchToSiteView(wrapper)
    await wrapper.get('[data-test="grid-edit"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="primary-action-button"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="primary-action-block-reason"]').text()).toBe(
      '변경사항을 저장하거나 취소한 뒤 재검토할 수 있습니다.'
    )

    vi.clearAllMocks()
    await emitButtonComponentClick(wrapper, 'primary-action-button')

    expect(recheckPhase2ScheduleVersionMock).not.toHaveBeenCalled()
    expect(showInfoMock).toHaveBeenCalledWith('변경사항을 저장하거나 취소한 뒤 재검토할 수 있습니다.')
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

    expect(wrapper.text()).toContain('근무표 생성 중 문제가 발생했습니다. 다시 생성해주세요.')
    expect(wrapper.text()).toContain('문제가 반복되면 고객지원에 문의해주세요.')
    expect(wrapper.text()).not.toContain('solver crashed')
    expect(wrapper.text()).not.toContain('trace-123')
    expect(wrapper.find('[data-test="primary-action-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="finalize-schedule-button"]').exists()).toBe(false)
  })

  it('starts in site view and switches to the employee detail grid on demand', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.get('[data-test="step5-result-view-switch"]').text()).toContain('사이트')
    expect(wrapper.get('[data-test="step5-result-view-switch"]').text()).toContain('근무자')
    expect(wrapper.find('[data-test="step5-site-view"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="step5-employee-view"]').exists()).toBe(false)

    await wrapper.get('[data-test="step5-result-view-employee"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="step5-employee-view"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="employee-result-detail"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="step5-site-view"]').exists()).toBe(false)

    await wrapper.get('[data-test="step5-result-view-site"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="step5-site-view"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="step5-employee-view"]').exists()).toBe(false)
  })

  it('keeps the site grid editable for a mutable preview and scopes manual controls to site view', async () => {
    getScheduleStatusMock.mockResolvedValue({
      status: 'complete',
      hard_score: 11,
      soft_score: 22,
      solver_execution_id: null,
    })

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.get('[data-test="step5-result-view-site"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="step5-site-view"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="grid-edit"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="manual-edit-reset-button"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="manual-edit-save-button"]').exists()).toBe(true)

    await wrapper.get('[data-test="grid-edit"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="step5-site-view"]').text()).toContain('1개 변경됨')

    await wrapper.get('[data-test="step5-result-view-employee"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="step5-site-view"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="step5-employee-view"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="employee-result-detail"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="employee-guideline-status"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="grid-edit"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="manual-edit-reset-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="manual-edit-save-button"]').exists()).toBe(false)
  })

  it('passes organization shift colors to EmployeeResultDetail in employee view', async () => {
    const wrapper = createWrapper({
      EmployeeResultDetail: {
        name: 'EmployeeResultDetail',
        props: ['shiftColors'],
        template: '<div data-test="employee-result-detail-shift-colors">{{ JSON.stringify(shiftColors) }}</div>',
      },
    })
    await flushPromises()

    await wrapper.get('[data-test="step5-result-view-employee"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="employee-result-detail-shift-colors"]').text()).toBe(
      '{"D":"#123456"}'
    )
  })

  it('uses a previous-month day stepper instead of the slider in site view', async () => {
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
          '2025-03-30': 'N',
          '2025-03-31': 'O',
        },
      },
      planningAssignments: [],
    })
    getScheduleVersionAssignmentsMock.mockResolvedValue({
      assignments: {
        'emp-1': {
          '2025-04-01': 'D',
        },
      },
      offReasons: {},
      comments: {},
    })

    const wrapper = createWrapper()
    await flushPromises()
    await flushPromises()

    await wrapper.get('[data-test="step5-result-view-site"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="last-month-days-stepper"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'NSlider' }).exists()).toBe(false)
  })

  it('selects the first employee with guideline violations on initial employee view entry', async () => {
    gridMock.employees.value = [
      {
        id: 'emp-1',
        employeeId: 'emp-1',
        name: 'Kim',
      },
      {
        id: 'emp-2',
        employeeId: 'emp-2',
        name: 'Park',
      },
    ]
    getScheduleStatusMock.mockResolvedValue({
      status: 'complete',
      hard_score: 11,
      soft_score: 22,
      solver_execution_id: null,
    })
    getScheduleVersionAssignmentsMock.mockResolvedValue({
      assignments: {
        'emp-1': {
          '2025-12-01': 'D',
        },
        'emp-2': {
          '2025-12-01': 'N',
          '2025-12-02': 'O',
          '2025-12-03': 'D',
        },
      },
      offReasons: {},
      comments: {},
    })

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.get('[data-test="step5-result-view-employee"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="step5-employee-view"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="employee-result-detail"]').text()).toContain('Park님의')
    expect(wrapper.get('[data-test="employee-guideline-status"]').text()).toContain(
      '보건복지부 가이드라인 위반 1건'
    )
  })

  it('keeps finalized employee previews read-only', async () => {
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-2',
      finalizedVersionId: 'version-2',
      activeSolvingVersionId: null,
      versions: [
        createVersionSummary({ id: 'version-1', versionNo: 1 }),
        createVersionSummary({
          id: 'version-2',
          versionNo: 2,
          isSelected: true,
          isFinalized: true,
          status: 'finalized',
        }),
      ],
    })
    getPhase2ScheduleReviewMock.mockResolvedValue(
      createReviewResponse('version-2', {
        finalizedVersionId: 'version-2',
        version: {
          status: 'finalized',
          isFinalized: true,
        },
      })
    )

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.get('[data-test="step5-result-view-employee"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="step5-employee-view"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="employee-result-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="grid-edit"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="manual-edit-reset-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="manual-edit-save-button"]').exists()).toBe(false)
  })

  it('confirms and unfinalizes a finalized month from the bottom action bar', async () => {
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-2',
      finalizedVersionId: 'version-2',
      activeSolvingVersionId: null,
      versions: [
        createVersionSummary({
          id: 'version-2',
          versionNo: 2,
          isSelected: true,
          isFinalized: true,
          status: 'finalized',
        }),
      ],
    })
    getPhase2ScheduleReviewMock.mockImplementation((versionId: string) =>
      Promise.resolve(createReviewResponse(versionId, {
        selectedVersionId: 'version-2',
        finalizedVersionId: 'version-2',
        version: {
          status: 'finalized',
          isSelected: true,
          isFinalized: true,
        },
        primaryAction: {
          kind: 'none',
          targetVersionId: null,
          label: 'No primary action',
          disabledReason: null,
        },
      }))
    )
    const warningDialog = vi.fn(() => ({ loading: false }))
    ;(window as unknown as { $dialog?: Record<string, unknown> }).$dialog = {
      warning: warningDialog,
    }

    const wrapper = createWrapper()
    await flushPromises()
    vi.clearAllMocks()

    await emitButtonComponentClick(wrapper, 'unfinalize-schedule-button')

    expect(warningDialog).toHaveBeenCalledWith(expect.objectContaining({
      title: '확정 취소',
      positiveText: '확정 취소',
      negativeText: '닫기',
    }))

    const dialogConfig = warningDialog.mock.calls[0]?.[0] as {
      onPositiveClick?: () => Promise<void> | void
    }
    await dialogConfig.onPositiveClick?.()
    await flushPromises()

    expect(unfinalizePhase2ScheduleVersionMock).toHaveBeenCalledWith('version-2')
    expect(showSuccessMock).toHaveBeenCalledWith('근무표 확정을 취소했습니다.')
    expect(getPhase2ScheduleCompareMock).toHaveBeenCalled()
  })

  it('disables finalization when local compliance has mandatory violations', async () => {
    mockSingleFinalizeReview({
      assignments: {
        'emp-1': {
          '2025-12-01': 'N',
          '2025-12-02': 'O',
          '2025-12-03': 'D',
        },
      },
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.get('[data-test="step5-summary-card-guideline"]').text()).toContain('위반 1건')
    expect(wrapper.get('[data-test="finalize-schedule-button"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="finalize-block-reason"]').text()).toBe(
      '보건복지부 가이드라인 위반 1건을 해결한 뒤 확정할 수 있습니다.'
    )

    await wrapper.get('[data-test="finalize-schedule-button"]').trigger('click')
    await flushPromises()

    expect(finalizePhase2ScheduleVersionMock).not.toHaveBeenCalled()
  })

  it('shows local compliance blocker before backend disabled reason', async () => {
    mockSingleFinalizeReview({
      assignments: {
        'emp-1': {
          '2025-12-01': 'N',
          '2025-12-02': 'O',
          '2025-12-03': 'D',
        },
      },
      primaryAction: {
        disabledReason: '백엔드 사유',
      },
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.get('[data-test="finalize-block-reason"]').text()).toBe(
      '보건복지부 가이드라인 위반 1건을 해결한 뒤 확정할 수 있습니다.'
    )
    expect(wrapper.get('[data-test="finalize-block-reason"]').text()).not.toContain('백엔드 사유')
  })

  it('keeps backend disabled reason when local compliance passes', async () => {
    mockSingleFinalizeReview({
      assignments: {
        'emp-1': {
          '2025-12-01': 'D',
        },
      },
      primaryAction: {
        disabledReason: '백엔드 사유',
      },
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.get('[data-test="step5-summary-card-guideline"]').text()).toContain('충족')
    expect(wrapper.get('[data-test="finalize-schedule-button"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="finalize-block-reason"]').text()).toBe('백엔드 사유')
  })

  it('uses hidden previousMonthAssignments for validation when previous-month dates are not visible', async () => {
    mockSingleFinalizeReview({
      assignments: {
        'emp-1': {
          '2025-11-29': 'N',
          '2025-11-30': 'O',
          '2025-12-01': 'D',
        },
      },
    })

    const wrapper = createWrapper()
    await flushPromises()

    gridMock.dates.value = [
      { date: '2025-12-01', isLastMonth: false },
    ]
    gridMock.assignments.value = {
      'emp-1': {
        '2025-12-01': 'D',
      },
    }
    await flushPromises()

    expect(wrapper.get('[data-test="step5-summary-card-guideline"]').text()).toContain('위반 1건')
    expect(wrapper.get('[data-test="finalize-block-reason"]').text()).toBe(
      '보건복지부 가이드라인 위반 1건을 해결한 뒤 확정할 수 있습니다.'
    )
  })

  it('uses visible grid assignments for compliance summary, modal, employee view, and finalize blocker', async () => {
    mockSingleFinalizeReview({
      assignments: {
        'emp-1': {
          '2025-12-01': 'N',
          '2025-12-02': 'O',
          '2025-12-03': 'D',
        },
      },
      primaryAction: {
        disabledReason: '백엔드 사유',
      },
    })

    const wrapper = createWrapper()
    await flushPromises()

    expectGuidelineSummary(wrapper, '위반 1건')
    const guidelineAction = wrapper.get('[data-test="step5-summary-card-guideline-action"]')
    await guidelineAction.trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('NOD 금지')

    setVisibleAssignments({
      'emp-1': {
        '2025-12-01': 'D',
        '2025-12-02': 'D',
        '2025-12-03': 'D',
      },
    })
    await flushPromises()

    expectGuidelineSummary(wrapper, '충족')
    expect(wrapper.find('[data-test="step5-summary-card-guideline-action"]').exists()).toBe(true)

    await wrapper.get('[data-test="step5-result-view-employee"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="employee-guideline-status"]').text()).toContain('보건복지부 가이드라인 충족')
    expect(wrapper.get('[data-test="finalize-block-reason"]').text()).toBe('백엔드 사유')
    expect(wrapper.get('[data-test="finalize-block-reason"]').text()).not.toContain('보건복지부 가이드라인 위반')
  })

  it('materializes visible blank current-month cells as Off for compliance', async () => {
    mockSingleFinalizeReview({
      assignments: {
        'emp-1': {
          '2025-12-01': 'D',
          '2025-12-02': 'D',
          '2025-12-03': 'D',
        },
      },
    })

    const wrapper = createWrapper()
    await flushPromises()

    gridMock.dates.value = [
      { date: '2025-12-01', isLastMonth: false },
      { date: '2025-12-02', isLastMonth: false },
      { date: '2025-12-03', isLastMonth: false },
    ]
    setVisibleAssignments({
      'emp-1': {
        '2025-12-01': 'N',
        '2025-12-02': '',
        '2025-12-03': 'D',
      },
    })
    await flushPromises()

    expectGuidelineSummary(wrapper, '위반 1건')
    expect(wrapper.get('[data-test="finalize-block-reason"]').text()).toBe(
      '보건복지부 가이드라인 위반 1건을 해결한 뒤 확정할 수 있습니다.'
    )

    const guidelineAction = wrapper.get('[data-test="step5-summary-card-guideline-action"]')
    await guidelineAction.trigger('click')
    await flushPromises()

    expect(document.body.textContent).toContain('NOD 금지')
  })

  it('does not keep stale rest violations when visible middle cells are blank', async () => {
    mockSingleFinalizeReview({
      assignments: {
        'emp-1': {
          '2026-03-27': 'N',
          '2026-03-28': 'N',
          '2026-03-30': 'D',
        },
      },
    })
    scheduleStoreMock.basicInfo = {
      ...scheduleStoreMock.basicInfo,
      month: '2026-03',
    }
    gridMock.employees.value = [
      {
        id: 'emp-1',
        employeeId: 'emp-1',
        name: '남보미',
      },
    ]

    const wrapper = createWrapper()
    await flushPromises()

    gridMock.dates.value = [
      { date: '2026-03-27', isLastMonth: false },
      { date: '2026-03-28', isLastMonth: false },
      { date: '2026-03-29', isLastMonth: false },
      { date: '2026-03-30', isLastMonth: false },
    ]
    setVisibleAssignments({
      'emp-1': {
        '2026-03-27': 'N',
        '2026-03-28': '',
        '2026-03-29': '',
        '2026-03-30': 'D',
      },
    })
    await flushPromises()

    expectGuidelineSummary(wrapper, '충족')
    expect(wrapper.find('[data-test="step5-summary-card-guideline-action"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('연속 야간 종료 후 48시간 휴식 전에 다음 근무가 배정되었습니다')
  })

  it('materializes visible previous-month blank cells as Off for compliance', async () => {
    scheduleStoreMock.basicInfo = {
      ...scheduleStoreMock.basicInfo,
      month: '2026-04',
    }
    gridMock.employees.value = [
      {
        id: 'emp-1',
        employeeId: 'emp-1',
        name: '남보미',
      },
    ]
    mockSingleFinalizeReview({
      assignments: {
        'emp-1': {
          '2026-03-27': 'N',
          '2026-03-28': 'N',
          '2026-03-30': 'D',
          '2026-04-01': 'D',
        },
      },
    })

    const wrapper = createWrapper()
    await flushPromises()

    gridMock.dates.value = [
      { date: '2026-03-27', isLastMonth: true },
      { date: '2026-03-28', isLastMonth: true },
      { date: '2026-03-29', isLastMonth: true },
      { date: '2026-03-30', isLastMonth: true },
      { date: '2026-04-01', isLastMonth: false },
    ]
    setVisibleAssignments({
      'emp-1': {
        '2026-03-27': 'N',
        '2026-03-28': '',
        '2026-03-29': '',
        '2026-03-30': 'D',
        '2026-04-01': 'D',
      },
    })
    await flushPromises()

    expectGuidelineSummary(wrapper, '충족')
    expect(wrapper.find('[data-test="step5-summary-card-guideline-action"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('연속 야간 종료 후 48시간 휴식 전에 다음 근무가 배정되었습니다')
  })

  it('does not show previous-month-only violations when current-month visible cells are compliant', async () => {
    scheduleStoreMock.basicInfo = {
      ...scheduleStoreMock.basicInfo,
      month: '2026-04',
    }
    gridMock.employees.value = [
      {
        id: 'emp-1',
        employeeId: 'emp-1',
        name: '남보미',
      },
    ]
    mockSingleFinalizeReview({
      assignments: {
        'emp-1': {
          '2026-03-27': 'N',
          '2026-03-28': 'N',
          '2026-03-30': 'D',
          '2026-04-27': 'N',
          '2026-04-30': 'D',
        },
      },
    })

    const wrapper = createWrapper()
    await flushPromises()

    gridMock.dates.value = [
      { date: '2026-04-27', isLastMonth: false },
      { date: '2026-04-28', isLastMonth: false },
      { date: '2026-04-29', isLastMonth: false },
      { date: '2026-04-30', isLastMonth: false },
    ]
    setVisibleAssignments({
      'emp-1': {
        '2026-04-27': 'N',
        '2026-04-28': '',
        '2026-04-29': '',
        '2026-04-30': 'D',
      },
    })
    await flushPromises()

    expectGuidelineSummary(wrapper, '충족')
    expect(wrapper.find('[data-test="step5-summary-card-guideline-action"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('2026-03-27')
    expect(wrapper.text()).not.toContain('연속 야간 종료 후 48시간 휴식 전에 다음 근무가 배정되었습니다')
  })

  it('refreshes compliance after solver completion sync without stale violations', async () => {
    mockSingleFinalizeReview({
      assignments: {
        'emp-1': {
          '2025-12-01': 'N',
          '2025-12-02': 'O',
          '2025-12-03': 'D',
        },
      },
      primaryAction: {
        disabledReason: '백엔드 사유',
      },
    })

    const wrapper = createWrapper()
    await flushPromises()

    expectGuidelineSummary(wrapper, '위반 1건')
    solverMock.status.value = 'running'
    await flushPromises()

    getScheduleVersionAssignmentsMock.mockResolvedValue({
      assignments: {
        'emp-1': {
          '2025-12-01': 'D',
          '2025-12-02': 'D',
          '2025-12-03': 'D',
        },
      },
      offReasons: {},
      comments: {},
    })

    solverMock.status.value = 'complete'
    await flushPromises()
    await flushPromises()

    expectGuidelineSummary(wrapper, '충족')
    expect(wrapper.get('[data-test="finalize-block-reason"]').text()).toBe('백엔드 사유')
  })

  it('updates compliance from intermediate solver assignments', async () => {
    mockSingleFinalizeReview({
      assignments: {
        'emp-1': {
          '2025-12-01': 'N',
          '2025-12-02': 'O',
          '2025-12-03': 'D',
        },
      },
    })

    const wrapper = createWrapper()
    await flushPromises()

    expectGuidelineSummary(wrapper, '위반 1건')

    solverMock.status.value = 'running'
    await flushPromises()

    solverMock.intermediateResults.value = {
      'emp-1': {
        '2025-12-01': 'D',
        '2025-12-02': 'D',
        '2025-12-03': 'D',
      },
    }
    await flushPromises()

    expect(gridMock.assignments.value).toEqual({
      'emp-1': {
        '2025-12-01': 'D',
        '2025-12-02': 'D',
        '2025-12-03': 'D',
      },
    })
    expect(wrapper.find('[data-test="step5-running-progress"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="step5-result-status-summary"]').exists()).toBe(false)
  })

  it('updates compliance text after a manual grid edit', async () => {
    mockSingleFinalizeReview({
      assignments: {
        'emp-1': {
          '2025-12-01': 'N',
          '2025-12-02': 'O',
          '2025-12-03': 'D',
        },
      },
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.get('[data-test="step5-summary-card-guideline"]').text()).toContain('위반 1건')

    await switchToSiteView(wrapper)
    await wrapper.get('[data-test="grid-edit"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="step5-summary-card-guideline"]').text()).toContain('충족')
    expect(wrapper.get('[data-test="finalize-schedule-button"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="finalize-block-reason"]').text()).toBe(
      '변경사항을 저장하거나 취소한 뒤 확정할 수 있습니다.'
    )

    await emitButtonComponentClick(wrapper, 'finalize-schedule-button')

    expect(finalizePhase2ScheduleVersionMock).not.toHaveBeenCalled()
    expect(showInfoMock).toHaveBeenCalledWith('변경사항을 저장하거나 취소한 뒤 확정할 수 있습니다.')
  })

  it('shows check-required blocker when validation cannot safely run', async () => {
    mockSingleFinalizeReview({
      assignments: {
        'emp-1': {
          '2025-12-01': 'X',
        },
      },
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.get('[data-test="step5-summary-card-guideline"]').text()).toContain('확인 필요')
    expect(wrapper.get('[data-test="finalize-schedule-button"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="finalize-block-reason"]').text()).toBe(
      '보건복지부 가이드라인을 확인한 뒤 확정할 수 있습니다.'
    )
  })

  it('blocks finalization when previous-month fallback lookup fails and current assignments are clean', async () => {
    getPreviousMonthFinalizedContextMock.mockRejectedValueOnce(new Error('lookup failed'))
    mockSingleFinalizeReview({
      assignments: {
        'emp-1': {
          '2025-12-01': 'D',
        },
      },
    })

    const wrapper = createWrapper()
    await flushPromises()
    vi.clearAllMocks()

    expect(wrapper.get('[data-test="step5-summary-card-guideline"]').text()).toContain('확인 필요')
    expect(wrapper.get('[data-test="finalize-block-reason"]').text()).toBe(
      '보건복지부 가이드라인을 확인한 뒤 확정할 수 있습니다.'
    )
    expect(wrapper.get('[data-test="finalize-schedule-button"]').attributes('disabled')).toBeDefined()

    await emitButtonComponentClick(wrapper, 'finalize-schedule-button')

    expect(finalizePhase2ScheduleVersionMock).not.toHaveBeenCalled()
    expect(showInfoMock).toHaveBeenCalledWith('보건복지부 가이드라인을 확인한 뒤 확정할 수 있습니다.')
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
    getScheduleVersionAssignmentsMock.mockResolvedValue({
      assignments: {},
      offReasons: {},
      comments: {},
    })

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
    getPlanningEmployeesMock.mockResolvedValue([
      {
        employee_id: 'emp-1',
        name: 'Kim',
        available_shifts: ['D', 'E', 'N', 'O'],
      },
    ])
    listPublicHolidayDatesInRangeMock.mockResolvedValueOnce(['2025-04-15'])
    loadSolverYearlyEmployeeStatsMock.mockResolvedValue([
      {
        employee_id: 'emp-1',
        night_shift_count: 3,
        weekend_holiday_work_count: 2,
        approved_off_request_count: 1,
      },
    ])

    const startSolverButton = wrapper.get('[data-test="start-solver-button"]')
    expect(startSolverButton.attributes('disabled')).toBeUndefined()

    await startSolverButton.trigger('click')
    await flushPromises()
    await flushPromises()
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 0))
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
    expect(listPublicHolidayDatesInRangeMock).toHaveBeenCalledWith('2025-04-01', '2025-04-30')
    expect(loadSolverYearlyEmployeeStatsMock).toHaveBeenCalledWith({
      organizationId: 'org-1',
      targetMonth: '2025-04',
      employeeIds: ['emp-1'],
    })
    expect(solverMock.startSolver).toHaveBeenCalledWith(
      'version-1',
      expect.objectContaining({
        publicHolidays: april2025WeekendAndHolidayDates,
        yearlyEmployeeStats: [
          {
            employee_id: 'emp-1',
            night_shift_count: 3,
            weekend_holiday_work_count: 2,
            approved_off_request_count: 1,
          },
        ],
      }),
    )
  })

  it.each(['localhost', '127.0.0.1', '::1'])(
    'logs the solver payload and blocks AI start on local hostname %s',
    async (hostname) => {
      stubWindowHostname(hostname)
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
      routeMock.query = { version: 'version-1' }
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
      scheduleStoreMock.siteRequirements = [
        {
          dayOfWeek: 1,
          shiftCode: 'D',
          requiredCount: 1,
        },
      ]

      const wrapper = createWrapper()
      await flushPromises()
      await flushPromises()
      vi.clearAllMocks()

      const startSolverButton = wrapper.get('[data-test="start-solver-button"]')
      expect(startSolverButton.attributes('disabled')).toBeUndefined()

      await startSolverButton.trigger('click')
      await flushPromises()
      await flushPromises()

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '[Step5] Local solver payload:',
        expect.objectContaining({
          publicHolidays: december2025WeekendAndHolidayDates,
          yearlyEmployeeStats: [],
        }),
      )
      expect(showErrorMock).toHaveBeenCalledWith('현재 환경에서는 근무표를 생성할 수 없습니다.')
      expect(resetPreferenceResolutionByVersionMock).not.toHaveBeenCalled()
      expect(mapToSolverRequestMock).toHaveBeenCalled()
      expect(solverMock.startSolver).not.toHaveBeenCalled()
    }
  )

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

    const editInputButton = wrapper.get('[data-test="edit-input-button"]')
    expect(editInputButton.attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test="start-solver-button"]').exists()).toBe(false)
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
    await flushPromises()
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

  it('uses user-facing copy for stale solving state refresh controls and errors', async () => {
    getPhase2ScheduleCompareMock.mockResolvedValue({
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
    getPhase2ScheduleReviewMock.mockResolvedValue(
      createReviewResponse('version-1', {
        selectedVersionId: 'version-1',
        version: {
          status: 'solving',
          activeSolverExecutionId: 'exec-1',
          isSelected: true,
        },
      })
    )
    getScheduleStatusMock.mockResolvedValue({
      status: 'running',
      hard_score: null,
      soft_score: null,
      solver_execution_id: 'exec-1',
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('상태 새로고침')
    expect(wrapper.text()).not.toContain('상태 재동기화')

    getPhase2ScheduleCompareMock.mockRejectedValueOnce(new Error('DB execution score failed'))
    vi.clearAllMocks()

    const refreshButton = wrapper.findAll('button')
      .find((button) => button.text().includes('상태 새로고침'))
    expect(refreshButton).toBeTruthy()

    await refreshButton!.trigger('click')
    await flushPromises()

    expect(showErrorMock).toHaveBeenCalledWith('최신 상태를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
    expect(showErrorMock).not.toHaveBeenCalledWith(expect.stringContaining('DB'))
    expect(showErrorMock).not.toHaveBeenCalledWith(expect.stringContaining('execution'))
    expect(showErrorMock).not.toHaveBeenCalledWith(expect.stringContaining('score'))
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
    await flushPromises()

    expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled()
    expect(resetPreferenceResolutionByVersionMock).toHaveBeenCalledWith('version-2')
    expect(solverMock.startSolver).toHaveBeenCalledWith(
      'version-2',
      expect.objectContaining({
        publicHolidays: december2025WeekendAndHolidayDates,
      }),
    )
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
    await flushPromises()

    expect(replaceMock).toHaveBeenCalledWith(buildCanonicalStep5RouteLocation('schedule-1'))
    expect(resetPreferenceResolutionByVersionMock).toHaveBeenCalledWith('version-1')
    expect(solverMock.startSolver).toHaveBeenCalledTimes(1)
    expect(solverMock.startSolver).toHaveBeenCalledWith(
      'version-1',
      expect.objectContaining({
        publicHolidays: december2025WeekendAndHolidayDates,
      }),
    )
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
    expect(solverMock.startSolver).toHaveBeenCalledWith(
      'version-1',
      expect.objectContaining({
        publicHolidays: december2025WeekendAndHolidayDates,
      }),
    )
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
    expect(showInfoMock).toHaveBeenCalledWith('다른 근무표안이 생성 중입니다. 완료 후 다시 시도해주세요.')
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
    expect(showInfoMock).toHaveBeenCalledWith(
      '기존 배정이 있어 자동 생성을 건너뛰었습니다. 필요하면 배정을 초기화한 뒤 다시 생성해주세요.'
    )
  })

  it('blocks re-solve when there are unsaved manual changes', async () => {
    solverMock.status.value = 'complete'
    routeMock.query = {
      version: 'version-2',
    }

    const wrapper = createWrapper()
    await flushPromises()
    vi.clearAllMocks()

    await switchToSiteView(wrapper)
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

  it('blocks save when guideline violations remain in the current grid', async () => {
    routeMock.query = {
      version: 'version-1',
    }
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-1',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        createVersionSummary({
          id: 'version-1',
          versionNo: 1,
          status: 'review_ready',
          isSelected: true,
        }),
        createVersionSummary({
          id: 'version-2',
          versionNo: 2,
          status: 'review_ready',
          isSelected: false,
        }),
      ],
    })
    getScheduleStatusMock.mockResolvedValue({
      status: 'complete',
      hard_score: 11,
      soft_score: 22,
      solver_execution_id: null,
    })
    getScheduleVersionAssignmentsMock.mockImplementation(async (versionId: string) => ({
      assignments: versionId === 'version-1'
        ? {
            'emp-1': {
              '2025-12-01': 'O',
              '2025-12-02': 'N',
              '2025-12-03': 'O',
              '2025-12-04': 'D',
            },
          }
        : {
            'emp-1': {
              '2025-12-01': 'D',
            },
          },
      offReasons: {},
      comments: {},
    }))
    gridMock.dates.value = [
      { date: '2025-12-01', isLastMonth: false },
      { date: '2025-12-02', isLastMonth: false },
      { date: '2025-12-03', isLastMonth: false },
      { date: '2025-12-04', isLastMonth: false },
    ]

    const dialogInfoMock = installAutoConfirmDialog()

    const wrapper = createWrapper()
    await flushPromises()
    vi.clearAllMocks()

    await switchToSiteView(wrapper)
    await wrapper.get('[data-test="grid-edit"]').trigger('click')
    await flushPromises()

    const saveButton = wrapper.findAll('button')
      .find((button) => button.text().trim() === '저장')
    expect(saveButton).toBeTruthy()

    await saveButton!.trigger('click')
    await flushPromises()

    expect(showInfoMock).toHaveBeenCalledWith(
      '보건복지부 가이드라인 위반 1건을 해결한 뒤 저장할 수 있습니다.'
    )
    expect(dialogInfoMock).not.toHaveBeenCalled()
    expect(patchPhase2ScheduleVersionAssignmentsMock).not.toHaveBeenCalled()
  })

  it('blocks save when current-month staffing is short even if previous-month rows are staffed', async () => {
    routeMock.query = {
      version: 'version-1',
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
          isSelected: false,
        }),
        createVersionSummary({
          id: 'version-2',
          versionNo: 2,
          status: 'review_ready',
          isSelected: true,
        }),
      ],
    })
    getScheduleStatusMock.mockResolvedValue({
      status: 'complete',
      hard_score: 11,
      soft_score: 22,
      solver_execution_id: null,
    })
    getScheduleVersionAssignmentsMock.mockImplementation(async (versionId: string) => ({
      assignments: versionId === 'version-1'
        ? {
            'emp-1': {
              '2025-11-30': 'D',
              '2025-12-01': 'O',
            },
            'emp-2': {
              '2025-11-30': 'D',
            },
          }
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
        dayName: '월요일',
        shiftCode: 'D',
        requiredCount: 2,
      },
    ]
    gridMock.employees.value = [
      { id: 'emp-1', employeeId: 'emp-1', name: 'Kim' },
      { id: 'emp-2', employeeId: 'emp-2', name: 'Lee' },
    ]
    gridMock.dates.value = [
      { date: '2025-11-30', isLastMonth: true },
      { date: '2025-12-01', isLastMonth: false },
    ]

    const dialogInfoMock = installAutoConfirmDialog()

    const wrapper = createWrapper()
    await flushPromises()
    vi.clearAllMocks()

    await switchToSiteView(wrapper)
    await wrapper.get('[data-test="grid-edit"]').trigger('click')
    await flushPromises()

    const saveButton = wrapper.findAll('button')
      .find((button) => button.text().trim() === '저장')
    expect(saveButton).toBeTruthy()

    await saveButton!.trigger('click')
    await flushPromises()

    expect(showInfoMock).toHaveBeenCalledWith(
      '인력 부족 1건이 있어 저장할 수 없습니다. 배정을 수정한 뒤 다시 저장해주세요.'
    )
    expect(dialogInfoMock).not.toHaveBeenCalled()
    expect(patchPhase2ScheduleVersionAssignmentsMock).not.toHaveBeenCalled()
  })

  it('does not block save on stale server staffing shortfalls when the current grid passes staffing', async () => {
    routeMock.query = {
      version: 'version-1',
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
          isSelected: false,
        }),
        createVersionSummary({
          id: 'version-2',
          versionNo: 2,
          status: 'review_ready',
          isSelected: true,
        }),
      ],
    })
    getScheduleStatusMock.mockResolvedValue({
      status: 'complete',
      hard_score: 11,
      soft_score: 22,
      solver_execution_id: null,
    })
    getPhase2ScheduleReviewMock.mockImplementation((versionId: string) => {
      return Promise.resolve(createReviewResponse(versionId, {
        version: {
          status: 'review_ready',
        },
        latestEvaluation: {
          id: `evaluation-${versionId}`,
          scheduleId: 'schedule-1',
          scheduleVersionId: versionId,
          revisionNo: 1,
          resultStatus: 'review_ready',
          proofSummary: {
            weeklyHoursViolations: 0,
            nnnViolations: 0,
            nodViolations: 0,
            minimumRestViolations: 0,
            staffingShortfalls: 1,
          },
          violationDetails: [
            {
              code: 'staffing_shortfall',
              message: 'Staffing shortfall on 2025-12-01: required 2, assigned 1.',
              severity: 'error',
              affectedEmployeeIds: [],
              dates: ['2025-12-01'],
              metadata: {
                requiredCount: 2,
                assignedCount: 1,
              },
            },
          ],
          infeasibility: null,
          offRequestResults: [],
          comparisonMetrics: {
            offRequestReflectionRate: 100,
            nightShiftMin: 0,
            nightShiftMax: 0,
            weekendShiftMin: 0,
            weekendShiftMax: 0,
            manualEditCount: 0,
          },
          finalizationGate: null,
          assignmentHash: `hash-${versionId}`,
          solverExecutionId: null,
          evaluatorVersion: 'test',
          createdAt: '2026-05-12T00:00:00Z',
        },
      }))
    })
    scheduleStoreMock.siteRequirements = [
      {
        dayOfWeek: 1,
        dayName: '월요일',
        shiftCode: 'D',
        requiredCount: 1,
      },
    ]

    const dialogInfoMock = installAutoConfirmDialog()

    const wrapper = createWrapper()
    await flushPromises()
    vi.clearAllMocks()

    await switchToSiteView(wrapper)
    await wrapper.get('[data-test="grid-edit"]').trigger('click')
    await flushPromises()

    const saveButton = wrapper.findAll('button')
      .find((button) => button.text().trim() === '저장')
    expect(saveButton).toBeTruthy()

    await saveButton!.trigger('click')
    await flushPromises()

    expect(dialogInfoMock).toHaveBeenCalledTimes(1)
    expect(patchPhase2ScheduleVersionAssignmentsMock).toHaveBeenCalledTimes(1)
    expect(showInfoMock).not.toHaveBeenCalledWith(
      '인력 부족 1건이 있어 저장할 수 없습니다. 배정을 수정한 뒤 다시 저장해주세요.'
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
    scheduleStoreMock.siteRequirements = [
      {
        dayOfWeek: 1,
        dayName: '월요일',
        shiftCode: 'D',
        requiredCount: 1,
      },
    ]

    const dialogInfoMock = installAutoConfirmDialog()

    const wrapper = createWrapper()
    await flushPromises()
    vi.clearAllMocks()

    await switchToSiteView(wrapper)
    await wrapper.get('[data-test="grid-edit"]').trigger('click')
    await flushPromises()

    const saveButton = wrapper.findAll('button')
      .find((button) => button.text().trim() === '저장')
    expect(saveButton).toBeTruthy()

    await saveButton!.trigger('click')
    await flushPromises()

    expect(dialogInfoMock).toHaveBeenCalledTimes(1)
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
    expect(scheduleStoreMock.previewVersionId).toBe('version-2')
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

    await switchToSiteView(wrapper)

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

    await switchToSiteView(wrapper)
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

  describe('site calendar pagination contract', () => {
    function buildManyEmployees(count: number) {
      return Array.from({ length: count }, (_, index) => {
        const number = String(index + 1).padStart(2, '0')
        return {
          id: `emp-${number}`,
          organizationId: 'org-1',
          employeeId: `E${number}`,
          name: `직원 ${number}`,
          availableShifts: ['D'],
          preceptorId: null,
        }
      })
    }

    function buildEmployeesWithBoundaryPair() {
      const soloEmployees = Array.from({ length: 9 }, (_, index) => ({
        id: `uuid-solo-${index + 1}`,
        organizationId: 'org-1',
        employeeId: `${40100 + index}`,
        name: `단독${index + 1}`,
        availableShifts: ['D'],
        preceptorId: null,
      }))

      return [
        ...soloEmployees,
        {
          id: 'uuid-preceptor',
          organizationId: 'org-1',
          employeeId: '41001',
          name: '박선배',
          availableShifts: ['D'],
          preceptorId: null,
        },
        {
          id: 'uuid-preceptee',
          organizationId: 'org-1',
          employeeId: '41101',
          name: '김신규',
          availableShifts: ['D'],
          preceptorId: 'uuid-preceptor',
        },
        {
          id: 'emp-on-page-2',
          organizationId: 'org-1',
          employeeId: '41201',
          name: '이둘째페이지',
          availableShifts: ['D'],
          preceptorId: null,
        },
      ]
    }

    it('shows the 11th employee on page 2 in site view', async () => {
      gridMock.employees.value = buildManyEmployees(12)

      const wrapper = createWrapper()
      await flushPromises()
      await switchToSiteView(wrapper)

      expect(wrapper.find('[data-test="step5-calendar-scroll-region"]').exists()).toBe(true)
      expect(wrapper.get('[data-test="step5-calendar-employee-count"]').text()).toBe('근무자 12명')
      expect(wrapper.find('[data-test="schedule-grid-stub"]').classes()).toContain('step5-calendar-grid')
      expect(wrapper.get('[data-test="schedule-grid-employee-count"]').text()).toBe('10')
      expect(wrapper.get('[data-test="schedule-grid-statistics-employee-count"]').text()).toBe('12')
      expect(wrapper.get('[data-test="schedule-grid-has-pair-meta"]').text()).toBe('yes')

      wrapper.vm.calendarPage = 2
      await flushPromises()

      expect(wrapper.get('[data-test="schedule-grid-employee-count"]').text()).toBe('2')
      expect(wrapper.get('[data-test="step5-calendar-page-info"]').text()).toBe('11–12번째')
      expect(wrapper.find('[data-test="step5-calendar-pagination"]').exists()).toBe(true)
    })

    it('enables horizontal and vertical scroll on the calendar scroll region', async () => {
      gridMock.employees.value = buildManyEmployees(12)

      const wrapper = createWrapper()
      await flushPromises()
      await switchToSiteView(wrapper)

      const scrollRegion = wrapper.get('[data-test="step5-calendar-scroll-region"]')
      expect(scrollRegion.classes()).toContain('overflow-auto')
    })

    it('orders paired employees adjacently and keeps the pair on the same page', async () => {
      gridMock.employees.value = buildEmployeesWithBoundaryPair()

      const wrapper = createWrapper()
      await flushPromises()
      await switchToSiteView(wrapper)

      const displayIds = wrapper.vm.displayEmployees.map((employee: { id: string }) => employee.id)
      expect(displayIds.indexOf('uuid-preceptor')).toBeLessThan(displayIds.indexOf('uuid-preceptee'))
      expect(displayIds.indexOf('uuid-preceptee') - displayIds.indexOf('uuid-preceptor')).toBe(1)

      const pageWithPair = wrapper.vm.employeeCalendarPages[0]
      expect(pageWithPair.some((employee: { id: string }) => employee.id === 'uuid-preceptor')).toBe(true)
      expect(pageWithPair.some((employee: { id: string }) => employee.id === 'uuid-preceptee')).toBe(true)
      expect(pageWithPair).toHaveLength(11)
      expect(wrapper.vm.paginatedDisplayEmployees).toHaveLength(11)
    })

    it('keeps schedule-grid-container overflow visible so sticky targets the card scrollport', () => {
      const source = readFileSync(
        resolve(__dirname, '../../src/views/schedule/Step5Result.vue'),
        'utf8',
      )
      const styleBlock = source.slice(source.lastIndexOf('<style scoped>'))

      expect(source).toContain(':deep(.step5-calendar-grid .schedule-grid-container)')
      expect(styleBlock).toMatch(/overflow:\s*visible/)
      expect(styleBlock).not.toMatch(/overflow-y:\s*visible/)
    })

    it('applies two-line centered date headers in the site grid', () => {
      const source = readFileSync(
        resolve(__dirname, '../../src/components/schedule/ScheduleGrid.vue'),
        'utf8',
      )
      const step5Source = readFileSync(
        resolve(__dirname, '../../src/views/schedule/Step5Result.vue'),
        'utf8',
      )

      expect(source).toContain('{{ cell.day }}일</span>')
      expect(source).toContain('({{ cell.dayName }})</span>')
      expect(step5Source).toContain(':deep(.step5-calendar-grid thead th.date-col-header)')
    })
  })
})
