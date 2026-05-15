import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, nextTick, reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  pushMock,
  replaceMock,
  routeQueryMock,
  createPhase2ScheduleVersionMock,
  ensurePhase2ScheduleMock,
  getScheduleVersionAssignmentsMock,
  getScheduleVersionPreferencesMock,
  getSchedulePreferencesMock,
  recheckPhase2ScheduleVersionMock,
  saveScheduleVersionPreferencesMock,
  deleteThisMonthVersionAssignmentsMock,
  buildScheduleSolverRequestMock,
  downloadOffRequestTemplateMock,
  showSuccessMock,
  showInfoMock,
  showErrorMock,
  prefillSearchQueryMock,
  dialogWarningMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  routeQueryMock: {} as { from?: string; intent?: string; version?: string; sourceVersion?: string },
  createPhase2ScheduleVersionMock: vi.fn(),
  ensurePhase2ScheduleMock: vi.fn(),
  getScheduleVersionAssignmentsMock: vi.fn(),
  getScheduleVersionPreferencesMock: vi.fn(),
  getSchedulePreferencesMock: vi.fn(),
  recheckPhase2ScheduleVersionMock: vi.fn(),
  saveScheduleVersionPreferencesMock: vi.fn(),
  deleteThisMonthVersionAssignmentsMock: vi.fn(),
  buildScheduleSolverRequestMock: vi.fn(),
  downloadOffRequestTemplateMock: vi.fn(),
  showSuccessMock: vi.fn(),
  showInfoMock: vi.fn(),
  showErrorMock: vi.fn(),
  prefillSearchQueryMock: vi.fn(),
  dialogWarningMock: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
  useRoute: () => ({
    query: routeQueryMock,
  }),
}))

vi.mock('@/api/schedule', () => ({
  createPhase2ScheduleVersion: createPhase2ScheduleVersionMock,
  ensurePhase2Schedule: ensurePhase2ScheduleMock,
  getScheduleVersionAssignments: getScheduleVersionAssignmentsMock,
  getScheduleVersionPreferences: getScheduleVersionPreferencesMock,
  getSchedulePreferences: getSchedulePreferencesMock,
  recheckPhase2ScheduleVersion: recheckPhase2ScheduleVersionMock,
  saveScheduleVersionPreferences: saveScheduleVersionPreferencesMock,
  deleteThisMonthVersionAssignments: deleteThisMonthVersionAssignmentsMock,
}))

vi.mock('@/api/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}))

vi.mock('naive-ui', () => ({
  NButton: { template: '<button v-bind="$attrs"><slot /></button>' },
  NInput: {
    template:
      '<input v-bind="$attrs" :value="value" @input="$emit(\'update:value\', $event.target.value)" />',
    props: ['value'],
    emits: ['update:value'],
  },
  NCheckbox: {
    template:
      '<label v-bind="$attrs"><input type="checkbox" :checked="checked" @change="$emit(\'update:checked\', $event.target.checked)" /><slot /></label>',
    props: ['checked'],
    emits: ['update:checked'],
  },
  NSpin: { template: '<div><slot /></div>' },
  NAlert: { template: '<div><slot /><slot name="header" /></div>' },
  NDrawer: defineComponent({
    props: {
      show: Boolean,
      placement: {
        type: String,
        default: 'right',
      },
      width: {
        type: [Number, String],
        default: 0,
      },
    },
    emits: ['update:show', 'close'],
    template: `
      <div
        v-if="show"
        data-test="drawer-stub"
        :data-placement="placement"
        :data-width="width"
      >
        <button
          data-test="drawer-close"
          @click="
            $emit('update:show', false);
            $emit('close');
          "
        >
          close-drawer
        </button>
        <slot />
      </div>
    `,
  }),
  NModal: { template: '<div v-if="show"><slot name="header" /><slot /></div>', props: ['show'] },
  NPopconfirm: {
    template:
      '<div><slot name="trigger" /><button data-test="popconfirm-confirm" @click="$emit(\'positive-click\')">confirm</button><slot /></div>',
  },
}))

vi.mock('@/utils/message', () => ({
  showSuccess: showSuccessMock,
  showInfo: showInfoMock,
  showError: showErrorMock,
}))

vi.mock('@/utils/offRequestExcel', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/offRequestExcel')>()),
  downloadOffRequestTemplate: downloadOffRequestTemplateMock,
}))

const scheduleStoreMock = reactive({
  basicInfo: {
    scheduleId: undefined as string | undefined,
    schedulePublicId: undefined as string | undefined,
    month: '2025-12',
    organizationId: 'org-1',
    organizationName: '서울병원',
    organizationType: 'hospital',
    employeeCount: 2,
    shifts: [],
  },
  currentStep: 4,
  assignments: {},
  comments: {},
  selectedVersionId: null as string | null,
  previewVersionId: null as string | null,
  setAssignments: vi.fn((data) => {
    scheduleStoreMock.assignments = data
  }),
  setComments: vi.fn((data) => {
    scheduleStoreMock.comments = data
  }),
  setBasicInfo: vi.fn((data) => {
    scheduleStoreMock.basicInfo = data
  }),
  setSelectedVersionId: vi.fn((versionId: string | null) => {
    scheduleStoreMock.selectedVersionId = versionId
  }),
  setPreviewVersionId: vi.fn((versionId: string | null) => {
    scheduleStoreMock.previewVersionId = versionId
  }),
  reset: vi.fn(),
  prevStep: vi.fn(() => {
    scheduleStoreMock.currentStep -= 1
  }),
})

const authStoreMock = reactive({
  user: {
    id: 'user-1',
  } as { id: string } | null,
})

const organizationStoreMock = reactive({
  current: {
    id: 'org-1',
    name: '서울병원',
    type: 'hospital',
  },
  employees: [
    {
      id: 'emp-1',
      organizationId: 'org-1',
      employeeId: 'E001',
      name: 'Kim',
      availableShifts: ['D'],
    },
    {
      id: 'emp-2',
      organizationId: 'org-1',
      employeeId: 'E002',
      name: 'Lee',
      availableShifts: ['D'],
    },
  ],
  loadOrganization: vi.fn(),
})

const gridMock = {
  employees: ref<typeof organizationStoreMock.employees>([]),
  dates: ref([{ date: '2025-12-01' }]),
  loading: ref(false),
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

vi.mock('@/composables/useScheduleGrid', () => ({
  useScheduleGrid: () => gridMock,
}))

vi.mock('@/composables/useScheduleSolverRequest', () => ({
  useScheduleSolverRequest: () => ({
    buildScheduleSolverRequest: buildScheduleSolverRequestMock,
  }),
}))

vi.mock('@/components/schedule/StepIndicator.vue', () => ({
  default: { template: '<div />' },
}))

vi.mock('@/components/schedule/ScheduleGrid.vue', () => ({
  default: defineComponent({
    emits: ['update:assignment', 'context-menu', 'header-click', 'cell-select'],
    template: `
      <div data-test="schedule-grid-stub">
        <button
          data-test="grid-emit-cell-select"
          @click="$emit('cell-select', { employeeId: 'emp-1', date: '2025-12-01' })"
        >
          grid-cell-select
        </button>
        <button
          data-test="grid-emit-second-cell-select"
          @click="$emit('cell-select', { employeeId: 'emp-2', date: '2025-12-01' })"
        >
          grid-second-cell-select
        </button>
      </div>
    `,
  }),
}))

vi.mock('@/components/schedule/request-entry/Step4RequestComposer.vue', () => ({
  default: defineComponent({
    props: {
      canSaveAppliedChanges: Boolean,
      isSaveAppliedChangesSaving: Boolean,
      saveAppliedChangesDisabledReason: {
        type: String,
        default: null,
      },
    },
    emits: [
      'select-employee',
      'update:request-type',
      'update:selection-mode',
      'update:selected-dates',
      'update:note',
      'apply-request',
      'save-applied-changes',
      'reset-draft',
      'edit-request',
      'delete-request',
    ],
    setup(_, { emit, expose }) {
      expose({
        focusSearchInput: () => {},
        prefillSearchQuery: prefillSearchQueryMock,
      })

      return {
        emit,
      }
    },
    template: `
      <div data-test="step4-request-composer">
        <button data-test="composer-select-employee" @click="$emit('select-employee', ['emp-1'])">
          composer-select-employee
        </button>
        <button data-test="composer-select-two-employees" @click="$emit('select-employee', ['emp-1', 'emp-2'])">
          composer-select-two-employees
        </button>
        <button
          data-test="composer-update-selected-dates"
          @click="$emit('update:selected-dates', ['2025-12-01'])"
        >
          composer-update-selected-dates
        </button>
        <button data-test="composer-update-note" @click="$emit('update:note', '연차')">
          composer-update-note
        </button>
        <button data-test="composer-apply-request" @click="$emit('apply-request')">
          composer-apply-request
        </button>
        <button
          data-test="composer-save-applied-changes"
          :disabled="!canSaveAppliedChanges || Boolean(saveAppliedChangesDisabledReason) || isSaveAppliedChangesSaving"
          @click="$emit('save-applied-changes')"
        >
          변경사항 저장
        </button>
      </div>
    `,
  }),
}))

vi.mock('@/components/schedule/CommentModal.vue', () => ({
  default: { template: '<div />' },
}))

vi.mock('@/components/schedule/DaySummaryModal.vue', () => ({
  default: { template: '<div />' },
}))

vi.mock('@/components/schedule/Step4OffRequestExcelUploadModal.vue', () => ({
  default: defineComponent({
    props: {
      show: Boolean,
      employees: {
        type: Array,
        default: () => [],
      },
      dates: {
        type: Array,
        default: () => [],
      },
      month: {
        type: String,
        default: '',
      },
    },
    emits: ['update:show', 'apply'],
    template: `
      <div v-if="show" data-test="off-request-excel-modal-stub">
        <button
          data-test="off-request-excel-modal-close"
          @click="$emit('update:show', false)"
        >
          close-upload
        </button>
        <button
          data-test="off-request-excel-modal-apply"
          @click="$emit('apply', { 'emp-2': { '2025-12-01': 'O' } })"
        >
          apply-upload
        </button>
      </div>
    `,
  }),
}))

import Step4InitialData from '@/views/schedule/Step4InitialData.vue'

const inputSnapshot = {
  solverInputHash: 'sha256:step4-solver-input',
  solverInput: {
    scheduleId: 'schedule-1',
    organizationId: 'org-1',
    siteId: null,
    month: '2025-12',
    lastMonthDays: 5,
    employees: [],
    assignments: [],
    employeeConstraints: [
      {
        employeeId: 'emp-1',
        date: '2025-12-01',
        isLocked: false,
      },
    ],
    hospitalRules: {
      organizationType: 'hospital',
      shifts: [],
      lastHistoricalDate: '2025-11-26',
      firstDraftDate: '2025-12-01',
      publishLength: 4,
      draftLength: 31,
    },
    monthlyRequirements: [],
  },
  generatorVersion: 'test-generator',
  createdAt: '2026-04-16T00:00:00.000Z',
}

const SCHEDULE_PUBLIC_ID = 'sch_a1b2c3d4e5f6'
const mountedWrappers: ReturnType<typeof mount>[] = []

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
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

const defaultEnsurePhase2ScheduleResponse = {
  scheduleId: 'schedule-1',
  schedulePublicId: SCHEDULE_PUBLIC_ID,
  organizationId: 'org-1',
  month: '2025-12',
  selectedVersionId: 'version-2',
  finalizedVersionId: null,
  activeSolvingVersionId: null,
  versions: [
    {
      id: 'version-1',
      scheduleId: 'schedule-1',
      versionNo: 1,
      name: '1안',
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
      name: '2안',
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
}

function createDraftEditOffEnsureResponse() {
  return {
    ...defaultEnsurePhase2ScheduleResponse,
    selectedVersionId: 'version-2',
    versions: [
      ...defaultEnsurePhase2ScheduleResponse.versions,
      {
        id: 'version-3',
        scheduleId: 'schedule-1',
        versionNo: 3,
        name: '3안',
        sourceType: 're_solve',
        baseVersionId: 'version-2',
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
    ],
  }
}

function createWrapper() {
  const wrapper = mount(Step4InitialData, {
    global: {
      stubs: {},
    },
  })
  mountedWrappers.push(wrapper)
  return wrapper
}

function writeScopedTempPreferences(payload: {
  constraints: Record<string, Record<string, string>>;
  constraintNotes?: Record<string, Record<string, string>>;
  savedAt?: string;
}) {
  localStorage.setItem(
    'everyshift_temp_preferences_v2:user-1:org-1:2025-12',
    JSON.stringify({
      schemaVersion: 2,
      ownerUserId: 'user-1',
      ownerOrganizationId: 'org-1',
      month: '2025-12',
      savedAt: payload.savedAt ?? new Date().toISOString(),
      constraints: payload.constraints,
      constraintNotes: payload.constraintNotes ?? {},
    })
  )
}

async function clickButtonByText(wrapper: ReturnType<typeof createWrapper>, text: string) {
  const target = wrapper.findAll('button').find((button) => button.text().includes(text))
  expect(target).toBeTruthy()
  await target?.trigger('click')
}

async function clickExactButtonByText(wrapper: ReturnType<typeof createWrapper>, text: string) {
  const target = wrapper.findAll('button').find((button) => button.text() === text)
  expect(target).toBeTruthy()
  await target?.trigger('click')
}

async function fillVersionName(wrapper: ReturnType<typeof createWrapper>, value: string) {
  const input = wrapper.find('[data-test="version-name-input"]')
  expect(input.exists()).toBe(true)
  await input.setValue(value)
}

async function fillEditOffStartVersionName(wrapper: ReturnType<typeof createWrapper>, value: string) {
  const input = wrapper.find('[data-test="edit-off-start-version-name-input"]')
  expect(input.exists()).toBe(true)
  await input.setValue(value)
}

async function setEditOffCopyExistingOff(wrapper: ReturnType<typeof createWrapper>, checked: boolean) {
  const checkbox = wrapper.find('[data-test="edit-off-copy-off-checkbox"] input[type="checkbox"]')
  expect(checkbox.exists()).toBe(true)
  await checkbox.setValue(checked)
}

async function openRequestDrawer(wrapper: ReturnType<typeof createWrapper>) {
  const requestDrawerButton = wrapper.find('[data-test="request-drawer-toggle"]')
  expect(requestDrawerButton.exists()).toBe(true)
  await requestDrawerButton.trigger('click')
  await flushPromises()
}

async function clickComposerSaveAppliedChanges(wrapper: ReturnType<typeof createWrapper>) {
  if (!wrapper.find('[data-test="step4-request-composer"]').exists()) {
    await openRequestDrawer(wrapper)
  }

  const saveButton = wrapper.find('[data-test="composer-save-applied-changes"]')
  expect(saveButton.exists()).toBe(true)
  await saveButton.trigger('click')
  await flushPromises()
}

describe('Step4InitialData', () => {
  afterEach(() => {
    mountedWrappers.splice(0).forEach((wrapper) => {
      wrapper.unmount()
    })
    vi.useRealTimers()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    routeQueryMock.from = undefined
    routeQueryMock.intent = undefined
    routeQueryMock.version = undefined
    routeQueryMock.sourceVersion = undefined
    window.$dialog = undefined
    pushMock.mockResolvedValue(undefined)
    replaceMock.mockImplementation(
      async (location: { query?: Record<string, string> } | string) => {
        if (typeof location === 'string' || !location.query) return
        routeQueryMock.from = location.query.from
        routeQueryMock.intent = location.query.intent
        routeQueryMock.version = location.query.version
        routeQueryMock.sourceVersion = location.query.sourceVersion
      }
    )

    scheduleStoreMock.basicInfo = {
      scheduleId: undefined,
      schedulePublicId: undefined,
      month: '2025-12',
      organizationId: 'org-1',
      organizationName: '서울병원',
      organizationType: 'hospital',
      employeeCount: 2,
      shifts: [],
    }
    scheduleStoreMock.currentStep = 4
    scheduleStoreMock.assignments = {}
    scheduleStoreMock.comments = {}
    scheduleStoreMock.selectedVersionId = null
    scheduleStoreMock.previewVersionId = null
    scheduleStoreMock.reset.mockClear()
    authStoreMock.user = {
      id: 'user-1',
    }

    organizationStoreMock.current = {
      id: 'org-1',
      name: '서울병원',
      type: 'hospital',
    }
    organizationStoreMock.employees = [
      {
        id: 'emp-1',
        organizationId: 'org-1',
        employeeId: 'E001',
        name: 'Kim',
        availableShifts: ['D'],
      },
      {
        id: 'emp-2',
        organizationId: 'org-1',
        employeeId: 'E002',
        name: 'Lee',
        availableShifts: ['D'],
      },
    ]

    gridMock.employees.value = []
    gridMock.dates.value = [{ date: '2025-12-01' }]
    gridMock.loading.value = false

    ensurePhase2ScheduleMock.mockResolvedValue(defaultEnsurePhase2ScheduleResponse)
    getScheduleVersionPreferencesMock.mockResolvedValue({
      constraints: {},
      notes: {},
      preferences: [],
    })
    getScheduleVersionAssignmentsMock.mockImplementation(async (versionId: string) => ({
      assignments: versionId === 'version-2'
        ? {
            'emp-1': {
              '2025-12-01': 'D',
            },
          }
        : {},
      offReasons: {},
      comments: {},
    }))
    getSchedulePreferencesMock.mockResolvedValue({
      constraints: {},
      notes: {},
      preferences: [],
    })
    recheckPhase2ScheduleVersionMock.mockResolvedValue({
      scheduleVersionId: 'version-2',
      currentRevision: 2,
      evaluationId: 'evaluation-1',
      resultStatus: 'review_ready',
      evaluationResultStatus: 'passed',
    })
    saveScheduleVersionPreferencesMock.mockResolvedValue(undefined)
    deleteThisMonthVersionAssignmentsMock.mockResolvedValue(undefined)
    buildScheduleSolverRequestMock.mockResolvedValue({
      solverRequest: {},
      inputSnapshot,
    })
    createPhase2ScheduleVersionMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      schedulePublicId: SCHEDULE_PUBLIC_ID,
      organizationId: 'org-1',
      month: '2025-12',
      createdVersionId: 'version-3',
      wasCreated: true,
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      versions: [],
    })
  })

  it('shows a Step4 initial loading panel until all initial data is restored', async () => {
    const pendingSchedule = createDeferred<typeof defaultEnsurePhase2ScheduleResponse>()
    ensurePhase2ScheduleMock.mockReturnValueOnce(pendingSchedule.promise)

    const wrapper = createWrapper()
    await nextTick()

    expect(wrapper.find('[data-test="step4-initial-loading"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('사전 Off 요청 데이터를 불러오는 중입니다.')
    expect(wrapper.find('[data-test="schedule-grid-stub"]').exists()).toBe(false)

    pendingSchedule.resolve(defaultEnsurePhase2ScheduleResponse)
    await flushPromises()

    expect(wrapper.find('[data-test="step4-initial-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="schedule-grid-stub"]').exists()).toBe(true)
  })

  it('uses the selected DB version on plain Step4 entry even when the store has a stale preview version', async () => {
    scheduleStoreMock.previewVersionId = 'version-1'

    createWrapper()
    await flushPromises()

    expect(ensurePhase2ScheduleMock).toHaveBeenCalledWith({
      organizationId: 'org-1',
      month: '2025-12',
    })
    expect(getScheduleVersionPreferencesMock).toHaveBeenCalledWith('version-2')
    expect(scheduleStoreMock.setBasicInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleId: 'schedule-1',
      })
    )
    expect(scheduleStoreMock.setSelectedVersionId).toHaveBeenCalledWith('version-2')
    expect(scheduleStoreMock.setPreviewVersionId).toHaveBeenCalledWith('version-2')
  })

  it('ignores an explicit Step4 version query and keeps the canonical schedule version', async () => {
    scheduleStoreMock.previewVersionId = 'version-2'
    routeQueryMock.version = 'version-1'

    createWrapper()
    await flushPromises()

    expect(getScheduleVersionPreferencesMock).toHaveBeenCalledWith('version-2')
    expect(scheduleStoreMock.setSelectedVersionId).toHaveBeenCalledWith('version-2')
    expect(scheduleStoreMock.setPreviewVersionId).toHaveBeenCalledWith('version-2')
  })

  it('falls back to the selected DB version when an explicit Step4 version query is invalid', async () => {
    scheduleStoreMock.previewVersionId = 'version-1'
    routeQueryMock.version = 'missing-version'

    createWrapper()
    await flushPromises()

    expect(getScheduleVersionPreferencesMock).toHaveBeenCalledWith('version-2')
    expect(scheduleStoreMock.setSelectedVersionId).toHaveBeenCalledWith('version-2')
    expect(scheduleStoreMock.setPreviewVersionId).toHaveBeenCalledWith('version-2')
  })

  it('falls back to the selected version when there is no preferred preview', async () => {
    createWrapper()
    await flushPromises()

    expect(scheduleStoreMock.setSelectedVersionId).toHaveBeenCalledWith('version-2')
    expect(scheduleStoreMock.setPreviewVersionId).toHaveBeenCalledWith('version-2')
    expect(getScheduleVersionPreferencesMock).toHaveBeenCalledWith('version-2')
  })

  it('renders the review workspace by default while the request drawer stays closed on Step4 entry', async () => {
    scheduleStoreMock.previewVersionId = 'version-2'

    const wrapper = createWrapper()
    await flushPromises()

    expect(getScheduleVersionPreferencesMock).toHaveBeenCalledWith('version-2')
    expect(wrapper.text()).toContain('사전 Off 요청을 입력하고 아래 캘린더에서 반영 내용을 확인하세요.')
    expect(wrapper.text()).toContain('사전 Off 요청 캘린더')
    expect(wrapper.text()).toContain('Off 요청 입력')
    expect(wrapper.text()).not.toContain('월간 검토 워크스페이스')
    expect(wrapper.text()).not.toContain('근무자를 선택하세요')
    expect(wrapper.text()).not.toContain('셀 클릭은 선택만 바꾸며')
    const requestDrawerButton = wrapper.find('[data-test="request-drawer-toggle"]')
    expect(requestDrawerButton.exists()).toBe(true)
    expect(requestDrawerButton.attributes('size')).toBe('large')
    expect(requestDrawerButton.attributes('strong')).toBeDefined()
    expect(wrapper.find('[data-test="step4-request-composer"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="drawer-stub"]').exists()).toBe(false)
    expect(wrapper.findAll('button').some((button) => button.text() === '임시 저장')).toBe(false)
    expect(wrapper.vm.selectedEmployeeId).toBeNull()
    expect(wrapper.vm.draftRequestTypeId).toBe('off')
    expect(wrapper.vm.draftSelectionMode).toBe('single')
    expect(wrapper.vm.draftSelectedDates).toEqual([])
    expect(wrapper.vm.draftNote).toBe('')
    expect(wrapper.vm.hasUnappliedDraft).toBe(false)
    expect(wrapper.vm.currentEmployeeRequests).toEqual([])
  })

  it('shows the Step4 Off request Excel upload button in the calendar header', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    const button = wrapper.find('[data-test="step4-excel-upload-button"]')

    expect(button.exists()).toBe(true)
    expect(button.text()).toContain('Excel 업로드')
  })

  it('downloads the current Off requests with the upload-compatible Excel template', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    wrapper.vm.constraints = {
      'emp-1': {
        '2025-12-01': 'O',
      },
    }
    await nextTick()

    await wrapper.find('[data-test="step4-excel-download-button"]').trigger('click')

    expect(downloadOffRequestTemplateMock).toHaveBeenCalledWith(
      organizationStoreMock.employees,
      '2025-12',
      {
        constraints: {
          'emp-1': {
            '2025-12-01': 'O',
          },
        },
        dates: gridMock.dates.value,
      }
    )
    expect(showSuccessMock).toHaveBeenCalledWith('Off 요청 Excel 파일을 다운로드했습니다.')
  })

  it('opens the Step4 Off request Excel upload modal from the calendar header', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.find('[data-test="step4-excel-upload-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="off-request-excel-modal-stub"]').exists()).toBe(true)
  })

  it('blocks the Step4 Off request Excel upload modal when an unapplied draft exists', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await openRequestDrawer(wrapper)
    await wrapper.find('[data-test="composer-select-employee"]').trigger('click')
    await wrapper.find('[data-test="composer-update-selected-dates"]').trigger('click')
    await flushPromises()

    expect(wrapper.vm.hasUnappliedDraft).toBe(true)

    await wrapper.find('[data-test="step4-excel-upload-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="off-request-excel-modal-stub"]').exists()).toBe(false)
    expect(showInfoMock).toHaveBeenCalledWith('미반영 요청이 있습니다. 먼저 반영하거나 선택을 초기화해 주세요.')
  })

  it('replaces current Off requests and notes from the Step4 Off request Excel upload without persistence calls', async () => {
    getScheduleVersionPreferencesMock.mockResolvedValue({
      constraints: {
        'emp-1': {
          '2025-12-01': 'O',
        },
        'emp-2': {},
      },
      notes: {
        'emp-1': {
          '2025-12-01': '기존 메모',
        },
      },
      preferences: [
        {
          employee_id: 'emp-1',
          date: '2025-12-01',
          request_code: 'O',
          request_note: '기존 메모',
          policy_check_status: 'rejected',
          policy_rejection_reason: '정책상 불가',
        },
      ],
    })
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.find('[data-test="grid-emit-cell-select"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="step4-excel-upload-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="off-request-excel-modal-stub"]').exists()).toBe(true)

    vi.clearAllMocks()
    await wrapper.find('[data-test="off-request-excel-modal-apply"]').trigger('click')
    await flushPromises()

    expect(wrapper.vm.constraints).toEqual({
      'emp-2': {
        '2025-12-01': 'O',
      },
    })
    expect(wrapper.vm.constraintNotes).toEqual({})
    expect(wrapper.vm.policyRejectionReasons).toEqual({})
    expect(wrapper.vm.policyCheckStatuses).toEqual({})
    expect(wrapper.vm.selectedEmployeeId).toBeNull()
    expect(wrapper.vm.draftSelectedDates).toEqual([])
    expect(wrapper.vm.draftNote).toBe('')
    expect(wrapper.vm.editingRequestKey).toBeNull()
    expect(wrapper.vm.dirtySinceLastApply).toBe(false)
    expect(wrapper.vm.blockedTransitionReason).toBeNull()
    expect(wrapper.find('[data-test="off-request-excel-modal-stub"]').exists()).toBe(false)
    expect(scheduleStoreMock.setAssignments).toHaveBeenCalledWith({
      'emp-2': {
        '2025-12-01': 'O',
      },
    })
    expect(scheduleStoreMock.setComments).toHaveBeenCalledWith({})
    expect(saveScheduleVersionPreferencesMock).not.toHaveBeenCalled()
    expect(recheckPhase2ScheduleVersionMock).not.toHaveBeenCalled()
    expect(ensurePhase2ScheduleMock).not.toHaveBeenCalled()
    expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled()
    expect(showSuccessMock).toHaveBeenCalledWith(
      'Excel Off 요청을 현재 화면에 반영했습니다. 저장하려면 변경사항 저장을 눌러 주세요.'
    )
  })

  it('opens the Step4 request drawer when 요청 입력 열기 is clicked', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="step4-request-composer"]').exists()).toBe(false)

    await clickButtonByText(wrapper, 'Off 요청 입력')
    await flushPromises()

    expect(wrapper.find('[data-test="drawer-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="step4-request-composer"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="drawer-close"]').exists()).toBe(true)
  })

  it('closes the request drawer when the explicit close button is clicked', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await clickButtonByText(wrapper, 'Off 요청 입력')
    await flushPromises()

    expect(wrapper.find('[data-test="drawer-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="request-drawer-close-button"]').exists()).toBe(true)

    await wrapper.find('[data-test="request-drawer-close-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="drawer-stub"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="step4-request-composer"]').exists()).toBe(false)
  })

  it('closes the request drawer when Escape is pressed', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await clickButtonByText(wrapper, 'Off 요청 입력')
    await flushPromises()

    expect(wrapper.find('[data-test="drawer-stub"]').exists()).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()

    expect(wrapper.find('[data-test="drawer-stub"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="step4-request-composer"]').exists()).toBe(false)
  })

  it('opens the request drawer from an empty grid cell selection without changing constraints', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.vm.constraints).toEqual({
      'emp-1': {},
      'emp-2': {},
    })

    await wrapper.find('[data-test="grid-emit-cell-select"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="step4-request-composer"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="drawer-stub"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Off 요청 입력')
    expect(wrapper.text()).toContain('선택한 셀을 Off 요청으로 반영하려면 요청 반영을 눌러 주세요.')
    expect(wrapper.vm.constraints).toEqual({
      'emp-1': {},
      'emp-2': {},
    })
    expect(wrapper.vm.selectedEmployeeId).toBe('emp-1')
    expect(wrapper.vm.draftSelectedDates).toEqual(['2025-12-01'])
    expect(wrapper.vm.hasUnappliedDraft).toBe(true)
    expect(saveScheduleVersionPreferencesMock).not.toHaveBeenCalled()
  })

  it('prefills the request search with the clicked employee when the drawer opens from grid selection', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.find('[data-test="grid-emit-cell-select"]').trigger('click')
    await flushPromises()

    expect(prefillSearchQueryMock).toHaveBeenCalledWith('Kim')
  })

  it('shows the hidden draft alert and blocks next step after closing a grid shortcut draft', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.find('[data-test="grid-emit-cell-select"]').trigger('click')
    await flushPromises()

    expect(wrapper.vm.hasUnappliedDraft).toBe(true)

    await wrapper.find('[data-test="request-drawer-close-button"]').trigger('click')
    await flushPromises()

    const nextButton = wrapper.findAll('button').find((button) => button.text().includes('이동'))

    expect(wrapper.find('[data-test="step4-request-composer"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="hidden-request-draft-alert"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('미반영 요청이 있습니다. 요청 입력을 다시 열어 마무리해 주세요.')
    expect(nextButton?.attributes('disabled')).toBeDefined()
    expect(wrapper.vm.selectedEmployeeId).toBe('emp-1')
    expect(wrapper.vm.draftSelectedDates).toEqual(['2025-12-01'])
    expect(wrapper.vm.constraints).toEqual({
      'emp-1': {},
      'emp-2': {},
    })
  })

  it('hydrates an existing Off request from grid selection without creating dirty draft state', async () => {
    getScheduleVersionPreferencesMock.mockResolvedValue({
      constraints: {
        'emp-1': {
          '2025-12-01': 'O',
        },
        'emp-2': {},
      },
      notes: {
        'emp-1': {
          '2025-12-01': '연차',
        },
      },
      preferences: [
        {
          employee_id: 'emp-1',
          date: '2025-12-01',
          request_code: 'O',
          request_note: '연차',
        },
      ],
    })
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.find('[data-test="grid-emit-cell-select"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="drawer-stub"]').exists()).toBe(true)
    expect(wrapper.vm.selectedEmployeeId).toBe('emp-1')
    expect(wrapper.vm.draftSelectedDates).toEqual(['2025-12-01'])
    expect(wrapper.vm.draftNote).toBe('연차')
    expect(wrapper.vm.editingRequestKey).toBe('emp-1::2025-12-01::연차::off')
    expect(wrapper.vm.hasUnappliedDraft).toBe(false)
    expect(wrapper.vm.constraints).toEqual({
      'emp-1': {
        '2025-12-01': 'O',
      },
      'emp-2': {},
    })
  })

  it('hydrates all dates for a multi-day existing Off request from grid selection', async () => {
    gridMock.dates.value = [
      { date: '2025-12-01' },
      { date: '2025-12-02' },
      { date: '2025-12-03' },
    ]
    getScheduleVersionPreferencesMock.mockResolvedValue({
      constraints: {
        'emp-1': {
          '2025-12-01': 'O',
          '2025-12-02': 'O',
          '2025-12-03': 'O',
        },
        'emp-2': {},
      },
      notes: {
        'emp-1': {
          '2025-12-01': '연차',
          '2025-12-02': '연차',
          '2025-12-03': '연차',
        },
      },
      preferences: [
        {
          employee_id: 'emp-1',
          date: '2025-12-01',
          request_code: 'O',
          request_note: '연차',
        },
        {
          employee_id: 'emp-1',
          date: '2025-12-02',
          request_code: 'O',
          request_note: '연차',
        },
        {
          employee_id: 'emp-1',
          date: '2025-12-03',
          request_code: 'O',
          request_note: '연차',
        },
      ],
    })
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.find('[data-test="grid-emit-cell-select"]').trigger('click')
    await flushPromises()

    expect(wrapper.vm.draftSelectionMode).toBe('multi')
    expect(wrapper.vm.draftSelectedDates).toEqual([
      '2025-12-01',
      '2025-12-02',
      '2025-12-03',
    ])
    expect(wrapper.vm.draftNote).toBe('연차')
    expect(wrapper.vm.editingRequestKey).toBe('emp-1::2025-12-01,2025-12-02,2025-12-03::연차::off')
    expect(wrapper.vm.hasUnappliedDraft).toBe(false)
  })

  it('replaces an untouched hidden grid shortcut draft when another grid cell is clicked', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.find('[data-test="grid-emit-cell-select"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="request-drawer-close-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="hidden-request-draft-alert"]').exists()).toBe(true)

    await wrapper.find('[data-test="grid-emit-second-cell-select"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="drawer-stub"]').exists()).toBe(true)
    expect(wrapper.vm.selectedEmployeeId).toBe('emp-2')
    expect(wrapper.vm.draftSelectedDates).toEqual(['2025-12-01'])
    expect(wrapper.vm.hasUnappliedDraft).toBe(true)
  })

  it('preserves a hidden grid shortcut draft after the user edits it inside the drawer', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.find('[data-test="grid-emit-cell-select"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="composer-update-note"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="request-drawer-close-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="hidden-request-draft-alert"]').exists()).toBe(true)

    await wrapper.find('[data-test="grid-emit-second-cell-select"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="drawer-stub"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('미반영 요청이 있습니다. 먼저 반영하거나 선택을 초기화해 주세요.')
    expect(wrapper.vm.selectedEmployeeId).toBe('emp-1')
    expect(wrapper.vm.draftSelectedDates).toEqual(['2025-12-01'])
    expect(wrapper.vm.draftNote).toBe('연차')
    expect(wrapper.vm.hasUnappliedDraft).toBe(true)
  })

  it('preserves the draft after closing the drawer and shows hidden-draft status with a reopen CTA', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await clickButtonByText(wrapper, 'Off 요청 입력')
    await flushPromises()
    await wrapper.find('[data-test="composer-select-employee"]').trigger('click')
    await wrapper.find('[data-test="composer-update-selected-dates"]').trigger('click')
    await wrapper.find('[data-test="composer-update-note"]').trigger('click')
    await flushPromises()

    expect(wrapper.vm.hasUnappliedDraft).toBe(true)

    await wrapper.find('[data-test="drawer-close"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="step4-request-composer"]').exists()).toBe(false)
    expect(wrapper.vm.selectedEmployeeId).toBe('emp-1')
    expect(wrapper.vm.draftSelectedDates).toEqual(['2025-12-01'])
    expect(wrapper.vm.draftNote).toBe('연차')
    expect(wrapper.vm.hasUnappliedDraft).toBe(true)
    expect(wrapper.find('[data-test="hidden-request-draft-alert"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('미반영 요청이 있습니다')
    expect(wrapper.text()).toContain('요청 입력 계속하기')
  })

  it('request-entry unapplied drafts disable next step and composer save actions', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await clickButtonByText(wrapper, 'Off 요청 입력')
    await flushPromises()
    await wrapper.find('[data-test="composer-select-employee"]').trigger('click')
    await wrapper.find('[data-test="composer-update-selected-dates"]').trigger('click')
    await wrapper.find('[data-test="composer-update-note"]').trigger('click')
    await flushPromises()

    const composerSaveButton = wrapper.find('[data-test="composer-save-applied-changes"]')
    const nextButton = wrapper.findAll('button').find((button) => button.text().includes('이동'))

    expect(wrapper.vm.hasUnappliedDraft).toBe(true)
    expect(composerSaveButton.attributes('disabled')).toBeDefined()
    expect(nextButton?.attributes('disabled')).toBeDefined()
  })

  it('keeps the request drawer open after applying a request', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await clickButtonByText(wrapper, 'Off 요청 입력')
    await flushPromises()
    await wrapper.find('[data-test="composer-select-employee"]').trigger('click')
    await wrapper.find('[data-test="composer-update-selected-dates"]').trigger('click')
    await wrapper.find('[data-test="composer-update-note"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-test="composer-apply-request"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="drawer-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="step4-request-composer"]').exists()).toBe(true)
    expect(wrapper.vm.hasUnappliedDraft).toBe(false)
    expect(wrapper.vm.constraints).toEqual({
      'emp-1': {
        '2025-12-01': 'O',
      },
      'emp-2': {},
    })
  })

  it('saves request-entry apply directly into the active preview version', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    saveScheduleVersionPreferencesMock.mockClear()
    recheckPhase2ScheduleVersionMock.mockClear()
    getScheduleVersionPreferencesMock.mockClear()

    await clickButtonByText(wrapper, 'Off 요청 입력')
    await flushPromises()
    await wrapper.find('[data-test="composer-select-employee"]').trigger('click')
    await wrapper.find('[data-test="composer-update-selected-dates"]').trigger('click')
    await wrapper.find('[data-test="composer-update-note"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-test="composer-apply-request"]').trigger('click')
    await flushPromises()

    expect(saveScheduleVersionPreferencesMock).toHaveBeenCalledWith(
      'schedule-1',
      'version-2',
      {
        'emp-1': {
          '2025-12-01': 'O',
        },
        'emp-2': {},
      },
      {
        'emp-1': {
          '2025-12-01': '연차',
        },
        'emp-2': {},
      }
    )
    expect(recheckPhase2ScheduleVersionMock).toHaveBeenCalledWith('version-2')
    expect(getScheduleVersionPreferencesMock).toHaveBeenCalledWith('version-2')
    expect(wrapper.vm.hasUnappliedDraft).toBe(false)
    expect(wrapper.vm.hasUnpersistedAppliedChanges).toBe(false)
    expect(showSuccessMock).toHaveBeenCalledWith('요청이 저장되었습니다.')
  })

  it.skip('saves request-entry apply into the draft edit-off version', async () => {
    routeQueryMock.intent = 'edit-off'
    routeQueryMock.version = 'version-3'
    routeQueryMock.sourceVersion = 'version-2'
    ensurePhase2ScheduleMock.mockResolvedValue(createDraftEditOffEnsureResponse())

    const wrapper = createWrapper()
    await flushPromises()

    saveScheduleVersionPreferencesMock.mockClear()
    recheckPhase2ScheduleVersionMock.mockClear()

    await openRequestDrawer(wrapper)
    await wrapper.find('[data-test="composer-select-employee"]').trigger('click')
    await wrapper.find('[data-test="composer-update-selected-dates"]').trigger('click')
    await wrapper.find('[data-test="composer-update-note"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-test="composer-apply-request"]').trigger('click')
    await flushPromises()

    expect(saveScheduleVersionPreferencesMock).toHaveBeenCalledWith(
      'schedule-1',
      'version-3',
      {
        'emp-1': {
          '2025-12-01': 'O',
        },
        'emp-2': {},
      },
      {
        'emp-1': {
          '2025-12-01': '연차',
        },
        'emp-2': {},
      }
    )
    expect(recheckPhase2ScheduleVersionMock).not.toHaveBeenCalled()
    expect(wrapper.vm.constraints).toEqual({
      'emp-1': {
        '2025-12-01': 'O',
      },
      'emp-2': {},
    })
    expect(wrapper.vm.constraintNotes).toEqual({
      'emp-1': {
        '2025-12-01': '연차',
      },
      'emp-2': {},
    })
    expect(wrapper.vm.hasUnappliedDraft).toBe(false)
    expect(wrapper.vm.hasUnpersistedAppliedChanges).toBe(false)
    expect(wrapper.vm.selectedEmployeeIds).toEqual(['emp-1'])
    expect(wrapper.vm.selectedEmployeeId).toBe('emp-1')
    expect(wrapper.vm.draftSelectedDates).toEqual(['2025-12-01'])
    expect(wrapper.vm.draftNote).toBe('연차')
    expect(wrapper.vm.currentEmployeeRequests).toEqual([
      {
        requestKey: 'emp-1::2025-12-01::연차::off',
        employeeId: 'emp-1',
        dates: ['2025-12-01'],
        requestTypeId: 'off',
        requestCode: 'O',
        note: '연차',
        status: 'persisted',
        policyRejectionReason: null,
      },
    ])
    expect(wrapper.text()).not.toContain('결과 확인으로 이동')
    expect(showSuccessMock).toHaveBeenCalledWith('요청이 새 근무표안에 저장되었습니다.')
  })

  it('applies one request draft to every selected employee', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await clickButtonByText(wrapper, 'Off 요청 입력')
    await flushPromises()
    await wrapper.find('[data-test="composer-select-two-employees"]').trigger('click')
    await wrapper.find('[data-test="composer-update-selected-dates"]').trigger('click')
    await wrapper.find('[data-test="composer-update-note"]').trigger('click')
    await flushPromises()

    expect(wrapper.vm.hasUnappliedDraft).toBe(true)

    await wrapper.find('[data-test="composer-apply-request"]').trigger('click')
    await flushPromises()

    expect(wrapper.vm.hasUnappliedDraft).toBe(false)
    expect(wrapper.vm.constraints).toEqual({
      'emp-1': {
        '2025-12-01': 'O',
      },
      'emp-2': {
        '2025-12-01': 'O',
      },
    })
    expect(wrapper.vm.constraintNotes).toEqual({
      'emp-1': {
        '2025-12-01': '연차',
      },
      'emp-2': {
        '2025-12-01': '연차',
      },
    })
  })

  it('shows policy rejection reasons while keeping Step4 request rows visible', async () => {
    getScheduleVersionPreferencesMock.mockResolvedValue({
      constraints: {
        'emp-1': {
          '2025-12-01': 'O',
        },
        'emp-2': {},
      },
      notes: {
        'emp-1': {
          '2025-12-01': '연차',
        },
      },
      preferences: [
        {
          id: 'pref-1',
          schedule_id: 'schedule-1',
          schedule_version_id: 'version-2',
          employee_id: 'emp-1',
          date: '2025-12-01',
          request_code: 'O',
          request_note: '연차',
          is_soft: true,
          resolution_status: 'pending',
          resolved_shift_id: null,
          resolved_at: null,
          policy_check_status: 'rejected',
          policy_rejection_reason: '월 한도 초과',
        },
      ],
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('정책상 거부된 요청')
    expect(wrapper.text()).toContain('월 한도 초과')
    expect(wrapper.text()).toContain('Kim (2025-12-01)')
  })

  it('clears all applied Off requests, notes, policy display, draft state, and scoped temp storage after confirmation', async () => {
    window.$dialog = {
      warning: dialogWarningMock,
    } as typeof window.$dialog
    getScheduleVersionPreferencesMock.mockResolvedValue({
      constraints: {
        'emp-1': {
          '2025-12-01': 'O',
        },
        'emp-2': {},
      },
      notes: {
        'emp-1': {
          '2025-12-01': '연차',
        },
      },
      preferences: [
        {
          id: 'pref-1',
          schedule_id: 'schedule-1',
          schedule_version_id: 'version-2',
          employee_id: 'emp-1',
          date: '2025-12-01',
          request_code: 'O',
          request_note: '연차',
          is_soft: true,
          resolution_status: 'pending',
          resolved_shift_id: null,
          resolved_at: null,
          policy_check_status: 'rejected',
          policy_rejection_reason: '월 한도 초과',
        },
      ],
    })
    writeScopedTempPreferences({
      constraints: {
        'emp-1': {
          '2025-12-01': 'O',
        },
      },
      constraintNotes: {
        'emp-1': {
          '2025-12-01': '연차',
        },
      },
    })

    const wrapper = createWrapper()
    await flushPromises()

    await clickButtonByText(wrapper, 'Off 요청 입력')
    await flushPromises()
    await wrapper.find('[data-test="composer-select-employee"]').trigger('click')
    await wrapper.find('[data-test="composer-update-selected-dates"]').trigger('click')
    await wrapper.find('[data-test="composer-update-note"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('정책상 거부된 요청')
    expect(wrapper.vm.hasUnappliedDraft).toBe(true)

    await clickButtonByText(wrapper, '모든 Off 요청 초기화')

    expect(dialogWarningMock).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Off 요청을 모두 초기화할까요?',
      content: '현재 입력한 Off 요청과 메모가 모두 지워집니다.',
      positiveText: '초기화',
      negativeText: '취소',
    }))
    expect(wrapper.vm.constraints).toEqual({
      'emp-1': {
        '2025-12-01': 'O',
      },
      'emp-2': {},
    })

    const dialogOptions = dialogWarningMock.mock.calls[0]![0] as {
      onPositiveClick: () => void;
    }
    dialogOptions.onPositiveClick()
    await flushPromises()

    expect(wrapper.vm.constraints).toEqual({})
    expect(wrapper.vm.constraintNotes).toEqual({})
    expect(wrapper.vm.policyRejectionSummaries).toEqual([])
    expect(wrapper.vm.hasUnappliedDraft).toBe(false)
    expect(wrapper.vm.selectedEmployeeIds).toEqual([])
    expect(wrapper.vm.draftSelectedDates).toEqual([])
    expect(wrapper.vm.draftNote).toBe('')
    expect(localStorage.getItem('everyshift_temp_preferences_v2:user-1:org-1:2025-12')).toBeNull()
    expect(scheduleStoreMock.setAssignments).toHaveBeenLastCalledWith({})
    expect(scheduleStoreMock.setComments).toHaveBeenLastCalledWith({})
    expect(showSuccessMock).toHaveBeenCalledWith('모든 Off 요청을 초기화했습니다.')
  })

  it('shows the dashboard return CTA only for dashboard-origin sessions', async () => {
    routeQueryMock.from = 'dashboard'

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('근무표 관리로 돌아가기')
  })

  it('hides the dashboard return CTA when the step was not opened from the dashboard', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).not.toContain('근무표 관리로 돌아가기')
  })

  it('resets wizard state after confirming return to the dashboard', async () => {
    routeQueryMock.from = 'dashboard'

    const wrapper = createWrapper()
    await flushPromises()

    await clickButtonByText(wrapper, '근무표 관리로 돌아가기')
    expect(pushMock).not.toHaveBeenCalledWith('/app')

    const confirmButtons = wrapper.findAll('[data-test="popconfirm-confirm"]')
    expect(confirmButtons).toHaveLength(1)
    await confirmButtons[0]!.trigger('click')
    await flushPromises()

    expect(scheduleStoreMock.reset).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith('/app')
  })

  it('clears scoped temp preference storage after confirming return to the dashboard', async () => {
    routeQueryMock.from = 'dashboard'
    writeScopedTempPreferences({
      constraints: {
        'emp-1': {
          '2025-12-01': 'O',
        },
      },
      constraintNotes: {
        'emp-1': {
          '2025-12-01': '연차',
        },
      },
    })
    localStorage.setItem('everyshift_temp_preferences_2025-12', JSON.stringify({}))
    localStorage.setItem('everyshift_temp_schedule_2025-12', JSON.stringify({}))

    const wrapper = createWrapper()
    await flushPromises()

    const confirmButtons = wrapper.findAll('[data-test="popconfirm-confirm"]')
    expect(confirmButtons).toHaveLength(1)
    await confirmButtons[0]!.trigger('click')
    await flushPromises()

    expect(localStorage.getItem('everyshift_temp_preferences_v2:user-1:org-1:2025-12')).toBeNull()
    expect(localStorage.getItem('everyshift_temp_preferences_2025-12')).toBeNull()
    expect(localStorage.getItem('everyshift_temp_schedule_2025-12')).toBeNull()
  })

  it('does not recreate scoped temp preference storage after dashboard return clears it', async () => {
    vi.useFakeTimers()
    routeQueryMock.from = 'dashboard'

    try {
      const wrapper = createWrapper()
      await flushPromises()

      await wrapper.vm.handleAssignmentUpdate({
        employeeId: 'emp-1',
        date: '2025-12-01',
        shiftCode: 'O',
      })
      await flushPromises()

      const confirmButtons = wrapper.findAll('[data-test="popconfirm-confirm"]')
      expect(confirmButtons).toHaveLength(1)
      await confirmButtons[0]!.trigger('click')
      await flushPromises()

      await vi.advanceTimersByTimeAsync(2100)

      expect(localStorage.getItem('everyshift_temp_preferences_v2:user-1:org-1:2025-12')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('preserves the dashboard origin query when navigating back to Step3', async () => {
    routeQueryMock.from = 'dashboard'

    const wrapper = createWrapper()
    await flushPromises()

    wrapper.vm.handlePrev()

    expect(pushMock).toHaveBeenCalledWith({
      path: '/app/schedule/step3',
      query: {
        from: 'dashboard',
      },
    })
  })

  it('saves Step4 preferences from the request composer into the active preview version', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.vm.handleAssignmentUpdate({
      employeeId: 'emp-1',
      date: '2025-12-01',
      shiftCode: 'O',
    })
    await flushPromises()

    await clickComposerSaveAppliedChanges(wrapper)

    expect(ensurePhase2ScheduleMock).toHaveBeenCalledBefore(saveScheduleVersionPreferencesMock)
    expect(saveScheduleVersionPreferencesMock).toHaveBeenCalledWith(
      'schedule-1',
      'version-2',
      {
        'emp-1': {
          '2025-12-01': 'O',
        },
        'emp-2': {},
      },
      {
        'emp-1': {},
        'emp-2': {},
      }
    )
    expect(recheckPhase2ScheduleVersionMock).toHaveBeenCalledWith('version-2')
    expect(showSuccessMock).toHaveBeenCalledWith('변경사항이 저장되었습니다.')
  })

  it.skip('saves applied changes into the draft edit-off version', async () => {
    routeQueryMock.intent = 'edit-off'
    routeQueryMock.version = 'version-3'
    routeQueryMock.sourceVersion = 'version-2'
    ensurePhase2ScheduleMock.mockResolvedValue(createDraftEditOffEnsureResponse())

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.vm.handleAssignmentUpdate({
      employeeId: 'emp-1',
      date: '2025-12-01',
      shiftCode: 'O',
    })
    await flushPromises()

    await clickComposerSaveAppliedChanges(wrapper)

    expect(saveScheduleVersionPreferencesMock).toHaveBeenCalledWith(
      'schedule-1',
      'version-3',
      {
        'emp-1': {
          '2025-12-01': 'O',
        },
        'emp-2': {},
      },
      {
        'emp-1': {},
        'emp-2': {},
      }
    )
    expect(recheckPhase2ScheduleVersionMock).not.toHaveBeenCalled()
    expect(wrapper.vm.hasUnpersistedAppliedChanges).toBe(false)
    expect(showSuccessMock).toHaveBeenCalledWith('요청이 새 근무표안에 저장되었습니다.')
  })

  it.skip('shows user-friendly existing-result branch actions before editing Step4', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('이미 만든 근무표안이 있습니다')
    expect(wrapper.text()).toContain('기존 결과를 먼저 확인하거나, Off 요청을 수정해 새 근무표안을 만들 수 있습니다.')
    expect(wrapper.text()).toContain('기존 결과 보기')
    expect(wrapper.text()).toContain('요청 수정해서 새 근무표안 만들기')
    expect(wrapper.text()).not.toContain('버전')
  })

  it('suppresses the existing-history choice modal for explicit edit intent', async () => {
    routeQueryMock.intent = 'edit-off'

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).not.toContain('이미 만든 근무표안이 있습니다')
    expect(wrapper.text()).not.toContain('요청 수정해서 새 근무표안 만들기')
  })

  it.skip('opens the edit-off start modal with the next version name and copy enabled by default', async () => {
    getScheduleVersionPreferencesMock.mockResolvedValue({
      constraints: {
        'emp-1': {
          '2025-12-01': 'O',
        },
        'emp-2': {},
      },
      notes: {
        'emp-1': {
          '2025-12-01': '연차',
        },
      },
      preferences: [
        {
          employee_id: 'emp-1',
          date: '2025-12-01',
          request_code: 'O',
          request_note: '연차',
        },
      ],
    })

    const wrapper = createWrapper()
    await flushPromises()

    await clickButtonByText(wrapper, '요청 수정해서 새 근무표안 만들기')
    await flushPromises()

    expect(wrapper.text()).not.toContain('이미 만든 근무표안이 있습니다')
    expect(wrapper.text()).toContain('새 근무표안으로 Off 요청 수정')
    expect(wrapper.find<HTMLInputElement>('[data-test="edit-off-start-version-name-input"]').element.value).toBe('3안')
    expect(wrapper.find<HTMLInputElement>('[data-test="edit-off-copy-off-checkbox"] input').element.checked).toBe(true)
    expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled()
  })

  it.skip('creates a draft edit-off version before editing and copies existing Off requests by default', async () => {
    getScheduleVersionPreferencesMock.mockResolvedValue({
      constraints: {
        'emp-1': {
          '2025-12-01': 'O',
        },
        'emp-2': {},
      },
      notes: {
        'emp-1': {
          '2025-12-01': '연차',
        },
      },
      preferences: [
        {
          employee_id: 'emp-1',
          date: '2025-12-01',
          request_code: 'O',
          request_note: '연차',
        },
      ],
    })

    const wrapper = createWrapper()
    await flushPromises()

    await clickButtonByText(wrapper, '요청 수정해서 새 근무표안 만들기')
    await flushPromises()
    await clickExactButtonByText(wrapper, '새 근무표안 만들기')
    await flushPromises()

    expect(createPhase2ScheduleVersionMock).toHaveBeenCalledWith('schedule-1', {
      baseVersionId: 'version-2',
      name: '3안',
      creationMode: 'new',
      sourceType: 're_solve',
      inputDiffSummary: {
        changedOffRequests: 0,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: null,
      },
    })
    expect(buildScheduleSolverRequestMock).not.toHaveBeenCalled()
    expect(saveScheduleVersionPreferencesMock).toHaveBeenCalledWith(
      'schedule-1',
      'version-3',
      {
        'emp-1': {
          '2025-12-01': 'O',
        },
        'emp-2': {},
      },
      {
        'emp-1': {
          '2025-12-01': '연차',
        },
        'emp-2': {},
      }
    )
    expect(deleteThisMonthVersionAssignmentsMock).toHaveBeenCalledWith(
      'schedule-1',
      'version-3',
      '2025-12'
    )
    expect(replaceMock).toHaveBeenCalledWith({
      query: {
        intent: 'edit-off',
        version: 'version-3',
        sourceVersion: 'version-2',
      },
    })
    expect(scheduleStoreMock.setPreviewVersionId).toHaveBeenCalledWith('version-3')
    expect(wrapper.vm.constraints).toEqual({
      'emp-1': {
        '2025-12-01': 'O',
      },
      'emp-2': {},
    })
    expect(wrapper.vm.constraintNotes).toEqual({
      'emp-1': {
        '2025-12-01': '연차',
      },
      'emp-2': {},
    })
  })

  it.skip('creates an empty draft edit-off version when existing Off requests are not copied', async () => {
    getScheduleVersionPreferencesMock.mockResolvedValue({
      constraints: {
        'emp-1': {
          '2025-12-01': 'O',
        },
        'emp-2': {},
      },
      notes: {
        'emp-1': {
          '2025-12-01': '연차',
        },
      },
      preferences: [
        {
          employee_id: 'emp-1',
          date: '2025-12-01',
          request_code: 'O',
          request_note: '연차',
        },
      ],
    })

    const wrapper = createWrapper()
    await flushPromises()

    await clickButtonByText(wrapper, '요청 수정해서 새 근무표안 만들기')
    await flushPromises()
    await setEditOffCopyExistingOff(wrapper, false)
    await clickExactButtonByText(wrapper, '새 근무표안 만들기')
    await flushPromises()

    expect(createPhase2ScheduleVersionMock).toHaveBeenCalledWith('schedule-1', {
      baseVersionId: 'version-2',
      name: '3안',
      creationMode: 'new',
      sourceType: 're_solve',
      inputDiffSummary: {
        changedOffRequests: 1,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: 'step4_notes_changed:1',
      },
    })
    expect(saveScheduleVersionPreferencesMock).toHaveBeenCalledWith(
      'schedule-1',
      'version-3',
      {
        'emp-1': {},
        'emp-2': {},
      },
      {
        'emp-1': {},
        'emp-2': {},
      }
    )
    expect(wrapper.vm.constraints).toEqual({
      'emp-1': {},
      'emp-2': {},
    })
    expect(wrapper.vm.constraintNotes).toEqual({
      'emp-1': {},
      'emp-2': {},
    })
  })

  it.skip('routes existing-result review without compare query', async () => {
    ensurePhase2ScheduleMock.mockResolvedValueOnce({
      scheduleId: 'schedule-1',
      schedulePublicId: SCHEDULE_PUBLIC_ID,
      organizationId: 'org-1',
      month: '2025-12',
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        {
          id: 'version-1',
          scheduleId: 'schedule-1',
          versionNo: 1,
          name: '1안',
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
          name: '2안',
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
          activeSolverExecutionId: null,
          isSelected: true,
          isFinalized: false,
        },
      ],
    })

    const wrapper = createWrapper()
    await flushPromises()

    await clickExactButtonByText(wrapper, '기존 결과 보기')
    await flushPromises()

    expect(pushMock).toHaveBeenCalledWith({
      path: `/app/schedule/step5/${SCHEDULE_PUBLIC_ID}`,
    })
  })

  it('does not create a schedule version when Step4 is opened alone', async () => {
    createWrapper()
    await flushPromises()

    expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled()
  })

  it('does not show legacy Step4 choice or version-name modals when executed history exists', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).not.toContain('이미 만든 근무표안이 있습니다')
    expect(wrapper.text()).not.toContain('새 근무표안으로 Off 요청 수정')
    expect(wrapper.text()).not.toContain('새 근무표안 이름')
  })

  it('saves changed Off requests to the current preview version, resets that version, and routes with autoStart', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.vm.handleAssignmentUpdate({
      employeeId: 'emp-1',
      date: '2025-12-01',
      shiftCode: 'O',
    })
    await flushPromises()

    await wrapper.vm.handleNext()
    await flushPromises()

    expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled()
    expect(saveScheduleVersionPreferencesMock).toHaveBeenCalledWith(
      'schedule-1',
      'version-2',
      {
        'emp-1': {
          '2025-12-01': 'O',
        },
        'emp-2': {},
      },
      {
        'emp-1': {},
        'emp-2': {},
      }
    )
    expect(deleteThisMonthVersionAssignmentsMock).toHaveBeenCalledWith(
      'schedule-1',
      'version-2',
      '2025-12'
    )
    expect(pushMock).toHaveBeenCalledWith({
      path: `/app/schedule/step5/${SCHEDULE_PUBLIC_ID}`,
      query: {
        autoStart: '1',
      },
    })
  })

  it('routes first generation to the current preview version with autoStart and no version-name modal', async () => {
    getScheduleVersionAssignmentsMock.mockResolvedValueOnce({
      assignments: {},
      offReasons: {},
      comments: {},
    })

    const wrapper = createWrapper()
    await flushPromises()

    await clickButtonByText(wrapper, '근무표 생성(AI)')
    await flushPromises()

    expect(wrapper.text()).not.toContain('새 근무표안 이름')
    expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled()
    expect(buildScheduleSolverRequestMock).not.toHaveBeenCalled()
    expect(deleteThisMonthVersionAssignmentsMock).not.toHaveBeenCalled()
    expect(pushMock).toHaveBeenCalledWith({
      path: `/app/schedule/step5/${SCHEDULE_PUBLIC_ID}`,
      query: {
        autoStart: '1',
      },
    })
  })

  it('preserves the preview version and skips destructive resets when Step4 is unchanged', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await clickButtonByText(wrapper, '결과 확인으로 이동')
    await flushPromises()

    expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled()
    expect(saveScheduleVersionPreferencesMock).not.toHaveBeenCalled()
    expect(deleteThisMonthVersionAssignmentsMock).not.toHaveBeenCalled()
    expect(pushMock).toHaveBeenCalledWith({
      path: `/app/schedule/step5/${SCHEDULE_PUBLIC_ID}`,
    })
  })

  it.skip('blocks unchanged edit-off next without creating or routing to a version', async () => {
    routeQueryMock.intent = 'edit-off'

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('생성 시작으로 이동')
    expect(wrapper.text()).not.toContain('결과 확인으로 이동')

    await wrapper.vm.handleNext()
    await flushPromises()

    expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled()
    expect(saveScheduleVersionPreferencesMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
    expect(showInfoMock).toHaveBeenCalledWith(
      'Off 요청을 수정한 뒤 새 근무표안을 생성할 수 있습니다.'
    )
  })

  it.skip('routes an unchanged draft edit-off version to Step5 with autoStart', async () => {
    routeQueryMock.intent = 'edit-off'
    routeQueryMock.version = 'version-3'
    routeQueryMock.sourceVersion = 'version-2'
    ensurePhase2ScheduleMock.mockResolvedValue(createDraftEditOffEnsureResponse())
    getScheduleVersionPreferencesMock.mockResolvedValue({
      constraints: {
        'emp-1': {
          '2025-12-01': 'O',
        },
        'emp-2': {},
      },
      notes: {
        'emp-1': {
          '2025-12-01': '연차',
        },
        'emp-2': {},
      },
      preferences: [
        {
          employee_id: 'emp-1',
          date: '2025-12-01',
          request_code: 'O',
          request_note: '연차',
        },
      ],
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('근무표 생성(AI)')
    expect(wrapper.text()).not.toContain('결과 확인으로 이동')

    await wrapper.vm.handleNext()
    await flushPromises()

    expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled()
    expect(showInfoMock).not.toHaveBeenCalledWith(
      'Off 요청을 수정한 뒤 새 근무표안을 생성할 수 있습니다.'
    )
    expect(pushMock).toHaveBeenCalledWith({
      path: `/app/schedule/step5/${SCHEDULE_PUBLIC_ID}`,
      query: {
        version: 'version-3',
        compare: 'version-2',
        autoStart: '1',
      },
    })
  })

  it.skip('auto-applies an unapplied draft before routing a draft edit-off version to Step5', async () => {
    routeQueryMock.intent = 'edit-off'
    routeQueryMock.version = 'version-3'
    routeQueryMock.sourceVersion = 'version-2'
    ensurePhase2ScheduleMock.mockResolvedValue(createDraftEditOffEnsureResponse())

    const wrapper = createWrapper()
    await flushPromises()

    await openRequestDrawer(wrapper)
    await wrapper.find('[data-test="composer-select-employee"]').trigger('click')
    await wrapper.find('[data-test="composer-update-selected-dates"]').trigger('click')
    await wrapper.find('[data-test="composer-update-note"]').trigger('click')
    await flushPromises()

    expect(wrapper.vm.hasUnappliedDraft).toBe(true)

    await wrapper.vm.handleNext()
    await flushPromises()

    expect(showInfoMock).not.toHaveBeenCalledWith(expect.stringContaining('미반영 요청'))
    expect(saveScheduleVersionPreferencesMock).toHaveBeenCalledWith(
      'schedule-1',
      'version-3',
      {
        'emp-1': {
          '2025-12-01': 'O',
        },
        'emp-2': {},
      },
      {
        'emp-1': {
          '2025-12-01': '연차',
        },
        'emp-2': {},
      }
    )
    expect(showSuccessMock).toHaveBeenCalledWith('요청이 새 근무표안에 저장되었습니다.')
    expect(pushMock).toHaveBeenCalledWith({
      path: `/app/schedule/step5/${SCHEDULE_PUBLIC_ID}`,
      query: {
        version: 'version-3',
        compare: 'version-2',
        autoStart: '1',
      },
    })
  })

  it('shows the direct AI-generate label instead of result-check when no solver run history exists', async () => {
    ensurePhase2ScheduleMock.mockResolvedValueOnce({
      scheduleId: 'schedule-1',
      schedulePublicId: SCHEDULE_PUBLIC_ID,
      organizationId: 'org-1',
      month: '2025-12',
      selectedVersionId: null,
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        {
          id: 'version-1',
          scheduleId: 'schedule-1',
          versionNo: 1,
          name: '1안',
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
      ],
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('근무표 생성(AI)')
    expect(wrapper.text()).not.toContain('결과 확인으로 이동')
  })

  it('shows the direct AI-generate label when the current preview version has no current-month assignments', async () => {
    getScheduleVersionAssignmentsMock.mockResolvedValueOnce({
      assignments: {},
      offReasons: {},
      comments: {},
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('근무표 생성(AI)')
    expect(wrapper.text()).not.toContain('결과 확인으로 이동')
  })

  it.skip('persists a custom first-run name onto the bootstrap version before autoStart routing', async () => {
    ensurePhase2ScheduleMock.mockResolvedValueOnce({
      scheduleId: 'schedule-1',
      schedulePublicId: SCHEDULE_PUBLIC_ID,
      organizationId: 'org-1',
      month: '2025-12',
      selectedVersionId: null,
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        {
          id: 'version-1',
          scheduleId: 'schedule-1',
          versionNo: 1,
          name: '1안',
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
      ],
    })

    const wrapper = createWrapper()
    await flushPromises()

    await clickButtonByText(wrapper, '근무표 생성(AI)')
    await flushPromises()

    expect(wrapper.text()).toContain('새 근무표안 이름')
    expect(wrapper.text()).toContain('근무표안 이름')
    expect(wrapper.text()).toContain('나중에 비교할 때 알아보기 쉬운 이름을 입력하세요.')
    expect(wrapper.find<HTMLInputElement>('[data-test="version-name-input"]').element.value).toBe('1안')
    expect(wrapper.find<HTMLInputElement>('[data-test="version-name-input"]').attributes('placeholder')).toBe('예: 2안')
    expect(pushMock).not.toHaveBeenCalledWith({
      path: `/app/schedule/step5/${SCHEDULE_PUBLIC_ID}`,
      query: {
        autoStart: '1',
      },
    })

    await fillVersionName(wrapper, '첫 생성본')
    await clickExactButtonByText(wrapper, '이 이름으로 생성')
    await flushPromises()

    expect(createPhase2ScheduleVersionMock).toHaveBeenCalledWith('schedule-1', {
      baseVersionId: 'version-1',
      name: '첫 생성본',
      creationMode: 'overwrite',
      overwriteVersionId: 'version-1',
      sourceType: 'initial_solve',
      inputDiffSummary: {
        changedOffRequests: 0,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: null,
      },
      inputSnapshot,
    })
    expect(buildScheduleSolverRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        basicInfo: expect.objectContaining({
          scheduleId: 'schedule-1',
          month: '2025-12',
          organizationId: 'org-1',
        }),
        versionId: 'version-1',
        constraints: {
          'emp-1': {},
          'emp-2': {},
        },
        lastMonthDays: 5,
        siteId: null,
      })
    )
    expect(pushMock).toHaveBeenCalledWith({
      path: `/app/schedule/step5/${SCHEDULE_PUBLIC_ID}`,
      query: {
        version: 'version-3',
        compare: 'version-2',
        autoStart: '1',
      },
    })
  })

  it.skip('reuses a failed first-run 1안 after failed replacement confirmation', async () => {
    ensurePhase2ScheduleMock.mockResolvedValueOnce({
      scheduleId: 'schedule-1',
      schedulePublicId: SCHEDULE_PUBLIC_ID,
      organizationId: 'org-1',
      month: '2025-12',
      selectedVersionId: null,
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        {
          id: 'version-1',
          scheduleId: 'schedule-1',
          versionNo: 1,
          name: '1안',
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
          latestEvaluationId: 'evaluation-failed',
          latestEvaluationResultStatus: 'solve_failed',
          comparisonMetrics: null,
          finalizationGate: null,
          activeSolverExecutionId: null,
          isSelected: false,
          isFinalized: false,
        },
      ],
    })
    createPhase2ScheduleVersionMock.mockResolvedValueOnce({
      scheduleId: 'schedule-1',
      schedulePublicId: SCHEDULE_PUBLIC_ID,
      organizationId: 'org-1',
      month: '2025-12',
      createdVersionId: 'version-1',
      wasCreated: false,
      selectedVersionId: null,
      finalizedVersionId: null,
      versions: [],
    })

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.vm.handleAssignmentUpdate({
      employeeId: 'emp-1',
      date: '2025-12-01',
      shiftCode: 'O',
    })
    await flushPromises()

    await wrapper.vm.handleNext()
    await flushPromises()

    expect(wrapper.text()).toContain('새 근무표안 이름')
    expect(wrapper.find<HTMLInputElement>('[data-test="version-name-input"]').element.value).toBe('1안')

    await clickExactButtonByText(wrapper, '이 이름으로 생성')
    await flushPromises()

    expect(wrapper.text()).toContain('같은 이름의 생성 실패 안이 있습니다. 이 입력으로 실패 안을 교체해 다시 생성합니다.')
    await clickExactButtonByText(wrapper, '실패 안 교체하고 생성')
    await flushPromises()

    expect(wrapper.text()).not.toContain('이미 같은 이름의 근무표안이 있습니다.')
    expect(createPhase2ScheduleVersionMock).toHaveBeenCalledWith('schedule-1', {
      baseVersionId: 'version-1',
      name: '1안',
      creationMode: 'overwrite',
      overwriteVersionId: 'version-1',
      sourceType: 'initial_solve',
      inputDiffSummary: {
        changedOffRequests: 1,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: null,
      },
      inputSnapshot,
    })
    expect(pushMock).toHaveBeenCalledWith({
      path: `/app/schedule/step5/${SCHEDULE_PUBLIC_ID}`,
      query: {
        autoStart: '1',
      },
    })
  })

  it.skip('requires and persists a first-run version name for note-only autoStart routing', async () => {
    ensurePhase2ScheduleMock.mockResolvedValueOnce({
      scheduleId: 'schedule-1',
      schedulePublicId: SCHEDULE_PUBLIC_ID,
      organizationId: 'org-1',
      month: '2025-12',
      selectedVersionId: null,
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        {
          id: 'version-1',
          scheduleId: 'schedule-1',
          versionNo: 1,
          name: '1안',
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
      ],
    })
    getScheduleVersionPreferencesMock.mockResolvedValue({
      constraints: {
        'emp-1': {
          '2025-12-01': 'O',
        },
        'emp-2': {},
      },
      notes: {},
      preferences: [
        {
          employee_id: 'emp-1',
          date: '2025-12-01',
          request_code: 'O',
          request_note: null,
        },
      ],
    })

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.vm.handleContextMenu({
      event: new MouseEvent('contextmenu'),
      employeeId: 'emp-1',
      date: '2025-12-01',
    })
    await flushPromises()

    wrapper.vm.handleSaveComment('메모만 변경')
    await flushPromises()

    await clickButtonByText(wrapper, '근무표 생성(AI)')
    await flushPromises()

    expect(wrapper.text()).toContain('새 근무표안 이름')
    expect(pushMock).not.toHaveBeenCalledWith({
      path: `/app/schedule/step5/${SCHEDULE_PUBLIC_ID}`,
      query: {
        autoStart: '1',
      },
    })

    await clickExactButtonByText(wrapper, '이 이름으로 생성')
    await flushPromises()

    expect(createPhase2ScheduleVersionMock).toHaveBeenCalledWith(
      'schedule-1',
      expect.objectContaining({
        baseVersionId: 'version-1',
        name: '1안',
        creationMode: 'overwrite',
        overwriteVersionId: 'version-1',
        sourceType: 'initial_solve',
        inputSnapshot,
        inputDiffSummary: {
          changedOffRequests: 0,
          changedLockedAssignments: 0,
          changedSiteRequirements: 0,
          note: 'step4_notes_changed:1',
        },
      })
    )
    expect(saveScheduleVersionPreferencesMock).toHaveBeenCalledWith(
      'schedule-1',
      'version-3',
      {
        'emp-1': {
          '2025-12-01': 'O',
        },
        'emp-2': {},
      },
      {
        'emp-1': {
          '2025-12-01': '메모만 변경',
        },
        'emp-2': {},
      }
    )
    expect(pushMock).toHaveBeenCalledWith({
      path: `/app/schedule/step5/${SCHEDULE_PUBLIC_ID}`,
      query: {
        version: 'version-3',
        compare: 'version-2',
        autoStart: '1',
      },
    })
  })

  it.skip('creates a new candidate version when Step4 input changes before returning to Step5', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.vm.handleAssignmentUpdate({
      employeeId: 'emp-1',
      date: '2025-12-01',
      shiftCode: 'O',
    })
    await flushPromises()

    expect(wrapper.text()).toContain('생성 시작으로 이동')
    expect(wrapper.text()).not.toContain('결과 확인으로 이동')

    await wrapper.vm.handleNext()
    await flushPromises()

    expect(wrapper.text()).toContain('새 근무표안 이름')
    expect(wrapper.find<HTMLInputElement>('[data-test="version-name-input"]').element.value).toBe('3안')
    expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled()

    await clickExactButtonByText(wrapper, '이 이름으로 생성')
    await flushPromises()

    expect(createPhase2ScheduleVersionMock).toHaveBeenCalledWith('schedule-1', {
      baseVersionId: 'version-2',
      name: '3안',
      creationMode: 'new',
      sourceType: 're_solve',
      inputDiffSummary: {
        changedOffRequests: 1,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: null,
      },
      inputSnapshot,
    })
    expect(buildScheduleSolverRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        basicInfo: expect.objectContaining({
          scheduleId: 'schedule-1',
          month: '2025-12',
          organizationId: 'org-1',
        }),
        versionId: 'version-2',
        constraints: {
          'emp-1': {
            '2025-12-01': 'O',
          },
          'emp-2': {},
        },
        lastMonthDays: 5,
        siteId: null,
      })
    )
    expect(saveScheduleVersionPreferencesMock).toHaveBeenCalledWith(
      'schedule-1',
      'version-3',
      {
        'emp-1': {
          '2025-12-01': 'O',
        },
        'emp-2': {},
      },
      {
        'emp-1': {},
        'emp-2': {},
      }
    )
    expect(deleteThisMonthVersionAssignmentsMock).toHaveBeenCalledWith(
      'schedule-1',
      'version-3',
      '2025-12'
    )
    expect(recheckPhase2ScheduleVersionMock).not.toHaveBeenCalledWith('version-3')
    expect(pushMock).toHaveBeenCalledWith({
      path: `/app/schedule/step5/${SCHEDULE_PUBLIC_ID}`,
      query: {
        version: 'version-3',
        compare: 'version-2',
      },
    })
    expect(wrapper.text()).toContain('근무표 생성(AI)')
    expect(wrapper.text()).not.toContain('결과 확인으로 이동')
  })

  it.skip('suggests the first unused numeric 근무표안 name when active names have a gap', async () => {
    ensurePhase2ScheduleMock.mockResolvedValueOnce({
      scheduleId: 'schedule-1',
      schedulePublicId: SCHEDULE_PUBLIC_ID,
      organizationId: 'org-1',
      month: '2025-12',
      selectedVersionId: 'version-3',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        {
          id: 'version-1',
          scheduleId: 'schedule-1',
          versionNo: 1,
          name: '1안',
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
          latestEvaluationId: 'evaluation-1',
          latestEvaluationResultStatus: 'passed',
          comparisonMetrics: null,
          finalizationGate: null,
          activeSolverExecutionId: null,
          isSelected: false,
          isFinalized: false,
        },
        {
          id: 'version-3',
          scheduleId: 'schedule-1',
          versionNo: 3,
          name: '3안',
          sourceType: 're_solve',
          baseVersionId: 'version-1',
          status: 'review_ready',
          currentRevision: 1,
          manualEditCount: 0,
          inputDiffSummary: {
            changedOffRequests: 1,
            changedLockedAssignments: 0,
            changedSiteRequirements: 0,
            note: null,
          },
          latestEvaluationId: 'evaluation-3',
          latestEvaluationResultStatus: 'passed',
          comparisonMetrics: null,
          finalizationGate: null,
          activeSolverExecutionId: null,
          isSelected: true,
          isFinalized: false,
        },
      ],
    })

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.vm.handleAssignmentUpdate({
      employeeId: 'emp-1',
      date: '2025-12-01',
      shiftCode: 'O',
    })
    await flushPromises()

    await wrapper.vm.handleNext()
    await flushPromises()

    expect(wrapper.find<HTMLInputElement>('[data-test="version-name-input"]').element.value).toBe('2안')
  })

  it('saves note-only changes onto the current preview version without creating a new version', async () => {
    getScheduleVersionPreferencesMock.mockResolvedValue({
      constraints: {
        'emp-1': {
          '2025-12-01': 'O',
        },
        'emp-2': {},
      },
      notes: {},
      preferences: [
        {
          employee_id: 'emp-1',
          date: '2025-12-01',
          shift_code: 'O',
          request_note: null,
        },
      ],
    })

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.vm.handleContextMenu({
      event: new MouseEvent('contextmenu'),
      employeeId: 'emp-1',
      date: '2025-12-01',
    })
    await flushPromises()

    wrapper.vm.handleSaveComment('연차')
    await flushPromises()

    await wrapper.vm.handleNext()
    await flushPromises()

    expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled()
    expect(buildScheduleSolverRequestMock).not.toHaveBeenCalled()
    expect(saveScheduleVersionPreferencesMock).toHaveBeenCalledWith(
      'schedule-1',
      'version-2',
      {
        'emp-1': {
          '2025-12-01': 'O',
        },
        'emp-2': {},
      },
      {
        'emp-1': {
          '2025-12-01': '연차',
        },
        'emp-2': {},
      }
    )
    expect(deleteThisMonthVersionAssignmentsMock).not.toHaveBeenCalled()
    expect(pushMock).toHaveBeenCalledWith({
      path: `/app/schedule/step5/${SCHEDULE_PUBLIC_ID}`,
    })
  })

  it.skip('creates a new re-solve version for note-only edit-off changes and saves preferences to the new version', async () => {
    routeQueryMock.intent = 'edit-off'
    getScheduleVersionPreferencesMock.mockResolvedValue({
      constraints: {
        'emp-1': {
          '2025-12-01': 'O',
        },
        'emp-2': {},
      },
      notes: {},
      preferences: [
        {
          employee_id: 'emp-1',
          date: '2025-12-01',
          shift_code: 'O',
          request_note: null,
        },
      ],
    })

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.vm.handleContextMenu({
      event: new MouseEvent('contextmenu'),
      employeeId: 'emp-1',
      date: '2025-12-01',
    })
    await flushPromises()

    wrapper.vm.handleSaveComment('메모만 변경')
    await flushPromises()

    await wrapper.vm.handleNext()
    await flushPromises()

    expect(wrapper.text()).toContain('새 근무표안 이름')
    expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled()

    await clickExactButtonByText(wrapper, '이 이름으로 생성')
    await flushPromises()

    expect(createPhase2ScheduleVersionMock).toHaveBeenCalledWith(
      'schedule-1',
      expect.objectContaining({
        baseVersionId: 'version-2',
        name: '3안',
        creationMode: 'new',
        sourceType: 're_solve',
        inputDiffSummary: {
          changedOffRequests: 0,
          changedLockedAssignments: 0,
          changedSiteRequirements: 0,
          note: 'step4_notes_changed:1',
        },
        inputSnapshot,
      })
    )
    expect(saveScheduleVersionPreferencesMock).toHaveBeenCalledWith(
      'schedule-1',
      'version-3',
      {
        'emp-1': {
          '2025-12-01': 'O',
        },
        'emp-2': {},
      },
      {
        'emp-1': {
          '2025-12-01': '메모만 변경',
        },
        'emp-2': {},
      }
    )
    expect(saveScheduleVersionPreferencesMock).not.toHaveBeenCalledWith(
      'schedule-1',
      'version-2',
      expect.any(Object),
      expect.any(Object)
    )
  })

  it.skip('blocks empty or whitespace-only 근무표안 names before calling the create API', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.vm.handleAssignmentUpdate({
      employeeId: 'emp-1',
      date: '2025-12-01',
      shiftCode: 'O',
    })
    await flushPromises()

    await wrapper.vm.handleNext()
    await flushPromises()
    await fillVersionName(wrapper, '   ')
    await clickExactButtonByText(wrapper, '이 이름으로 생성')
    await flushPromises()

    expect(showErrorMock).toHaveBeenCalledWith('근무표안 이름을 입력해 주세요.')
    expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled()
  })

  it.skip('blocks duplicate active 근무표안 names by trimmed lowercase value without generic overwrite UI', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.vm.handleAssignmentUpdate({
      employeeId: 'emp-1',
      date: '2025-12-01',
      shiftCode: 'O',
    })
    await flushPromises()

    await wrapper.vm.handleNext()
    await flushPromises()
    await fillVersionName(wrapper, '  2안  ')
    await clickExactButtonByText(wrapper, '이 이름으로 생성')
    await flushPromises()

    expect(showErrorMock).toHaveBeenCalledWith('이미 같은 이름의 근무표안이 있습니다.')
    expect(wrapper.text()).not.toContain('덮어쓰기')
    expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled()
  })

  it.skip('blocks duplicate active names before creating a draft edit-off version', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await clickButtonByText(wrapper, '요청 수정해서 새 근무표안 만들기')
    await flushPromises()
    await fillEditOffStartVersionName(wrapper, '  2안  ')
    await clickExactButtonByText(wrapper, '새 근무표안 만들기')
    await flushPromises()

    expect(showErrorMock).toHaveBeenCalledWith('이미 같은 이름의 근무표안이 있습니다.')
    expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled()
    expect(saveScheduleVersionPreferencesMock).not.toHaveBeenCalled()
  })

  it.skip('defaults to and confirms replacement for a failed re-solve 근무표안 name', async () => {
    ensurePhase2ScheduleMock.mockResolvedValueOnce({
      scheduleId: 'schedule-1',
      schedulePublicId: SCHEDULE_PUBLIC_ID,
      organizationId: 'org-1',
      month: '2025-12',
      selectedVersionId: 'version-1',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        {
          id: 'version-1',
          scheduleId: 'schedule-1',
          versionNo: 1,
          name: '1안',
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
          latestEvaluationId: 'evaluation-1',
          latestEvaluationResultStatus: 'passed',
          comparisonMetrics: null,
          finalizationGate: null,
          activeSolverExecutionId: null,
          isSelected: true,
          isFinalized: false,
        },
        {
          id: 'version-2',
          scheduleId: 'schedule-1',
          versionNo: 2,
          name: '2안',
          sourceType: 're_solve',
          baseVersionId: 'version-1',
          status: 'solve_failed',
          currentRevision: 1,
          manualEditCount: 0,
          inputDiffSummary: {
            changedOffRequests: 1,
            changedLockedAssignments: 0,
            changedSiteRequirements: 0,
            note: 'failed solve',
          },
          latestEvaluationId: 'evaluation-failed',
          latestEvaluationResultStatus: 'solve_failed',
          comparisonMetrics: null,
          finalizationGate: null,
          activeSolverExecutionId: null,
          isSelected: false,
          isFinalized: false,
        },
      ],
    })
    createPhase2ScheduleVersionMock.mockResolvedValueOnce({
      scheduleId: 'schedule-1',
      schedulePublicId: SCHEDULE_PUBLIC_ID,
      organizationId: 'org-1',
      month: '2025-12',
      createdVersionId: 'version-2',
      wasCreated: false,
      selectedVersionId: 'version-1',
      finalizedVersionId: null,
      versions: [],
    })

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.vm.handleAssignmentUpdate({
      employeeId: 'emp-1',
      date: '2025-12-01',
      shiftCode: 'O',
    })
    await flushPromises()

    await wrapper.vm.handleNext()
    await flushPromises()

    expect(wrapper.find<HTMLInputElement>('[data-test="version-name-input"]').element.value).toBe('2안')

    await clickExactButtonByText(wrapper, '이 이름으로 생성')
    await flushPromises()

    expect(wrapper.text()).toContain('같은 이름의 생성 실패 안이 있습니다. 이 입력으로 실패 안을 교체해 다시 생성합니다.')
    expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled()

    await clickExactButtonByText(wrapper, '실패 안 교체하고 생성')
    await flushPromises()

    expect(wrapper.text()).not.toContain('이미 같은 이름의 근무표안이 있습니다.')
    expect(createPhase2ScheduleVersionMock).toHaveBeenCalledWith(
      'schedule-1',
      expect.objectContaining({
        name: '2안',
        creationMode: 'overwrite',
        overwriteVersionId: 'version-2',
      })
    )
  })

  it.skip('clears failed replacement guidance when the name changes to a unique 근무표안 name', async () => {
    ensurePhase2ScheduleMock.mockResolvedValueOnce({
      scheduleId: 'schedule-1',
      schedulePublicId: SCHEDULE_PUBLIC_ID,
      organizationId: 'org-1',
      month: '2025-12',
      selectedVersionId: 'version-1',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        {
          id: 'version-1',
          scheduleId: 'schedule-1',
          versionNo: 1,
          name: '1안',
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
          latestEvaluationId: 'evaluation-1',
          latestEvaluationResultStatus: 'passed',
          comparisonMetrics: null,
          finalizationGate: null,
          activeSolverExecutionId: null,
          isSelected: true,
          isFinalized: false,
        },
        {
          id: 'version-2',
          scheduleId: 'schedule-1',
          versionNo: 2,
          name: '2안',
          sourceType: 're_solve',
          baseVersionId: 'version-1',
          status: 'solve_failed',
          currentRevision: 1,
          manualEditCount: 0,
          inputDiffSummary: {
            changedOffRequests: 1,
            changedLockedAssignments: 0,
            changedSiteRequirements: 0,
            note: 'failed solve',
          },
          latestEvaluationId: 'evaluation-failed',
          latestEvaluationResultStatus: 'solve_failed',
          comparisonMetrics: null,
          finalizationGate: null,
          activeSolverExecutionId: null,
          isSelected: false,
          isFinalized: false,
        },
      ],
    })

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.vm.handleAssignmentUpdate({
      employeeId: 'emp-1',
      date: '2025-12-01',
      shiftCode: 'O',
    })
    await flushPromises()

    await wrapper.vm.handleNext()
    await flushPromises()
    await fillVersionName(wrapper, '2안')
    await clickExactButtonByText(wrapper, '이 이름으로 생성')
    await flushPromises()

    expect(wrapper.text()).toContain('실패 안 교체하고 생성')

    await fillVersionName(wrapper, '4안')
    await flushPromises()

    expect(wrapper.text()).not.toContain('실패 안 교체하고 생성')
    expect(wrapper.text()).not.toContain('같은 이름의 생성 실패 안이 있습니다.')

    await clickExactButtonByText(wrapper, '이 이름으로 생성')
    await flushPromises()

    expect(createPhase2ScheduleVersionMock).toHaveBeenCalledWith(
      'schedule-1',
      expect.objectContaining({
        name: '4안',
        creationMode: 'new',
      })
    )
  })

  it.skip('blocks finalized, solving, or archived duplicate 근무표안 names and requires another name', async () => {
    ensurePhase2ScheduleMock.mockResolvedValueOnce({
      scheduleId: 'schedule-1',
      schedulePublicId: SCHEDULE_PUBLIC_ID,
      organizationId: 'org-1',
      month: '2025-12',
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        {
          id: 'version-1',
          scheduleId: 'schedule-1',
          versionNo: 1,
          name: '1안',
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
          name: '2안',
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
          latestEvaluationId: 'evaluation-2',
          latestEvaluationResultStatus: 'passed',
          comparisonMetrics: null,
          finalizationGate: null,
          activeSolverExecutionId: null,
          isSelected: true,
          isFinalized: false,
        },
        {
          id: 'version-finalized',
          scheduleId: 'schedule-1',
          versionNo: 3,
          name: 'Done',
          sourceType: 're_solve',
          baseVersionId: 'version-2',
          status: 'finalized',
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
          isFinalized: true,
        },
        {
          id: 'version-solving',
          scheduleId: 'schedule-1',
          versionNo: 4,
          name: 'Running',
          sourceType: 're_solve',
          baseVersionId: 'version-2',
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
          id: 'version-archived',
          scheduleId: 'schedule-1',
          versionNo: 5,
          name: 'Archived',
          sourceType: 're_solve',
          baseVersionId: 'version-2',
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
          archivedAt: '2026-04-30T00:00:00.000Z',
        },
      ],
    })

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.vm.handleAssignmentUpdate({
      employeeId: 'emp-1',
      date: '2025-12-01',
      shiftCode: 'O',
    })
    await flushPromises()

    for (const blockedName of ['done', 'running', 'archived']) {
      await clickButtonByText(wrapper, '생성 시작으로 이동')
      await flushPromises()
      await fillVersionName(wrapper, blockedName)
      await clickExactButtonByText(wrapper, '이 이름으로 생성')
      await flushPromises()

      expect(showErrorMock).toHaveBeenCalledWith('이미 같은 이름의 근무표안이 있습니다.')
      expect(wrapper.text()).not.toContain('덮어쓰기')
      expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled()
    }
  })

  it.skip('keeps the modal open with archived-name guidance when submit hits a hidden name conflict', async () => {
    createPhase2ScheduleVersionMock.mockRejectedValueOnce(
      Object.assign(new Error('Version name already exists'), {
        code: 'version_name_exists',
        status: 409,
      })
    )

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.vm.handleAssignmentUpdate({
      employeeId: 'emp-1',
      date: '2025-12-01',
      shiftCode: 'O',
    })
    await flushPromises()

    await clickButtonByText(wrapper, '생성 시작으로 이동')
    await flushPromises()
    await fillVersionName(wrapper, 'Archived')
    await clickExactButtonByText(wrapper, '이 이름으로 생성')
    await flushPromises()

    expect(createPhase2ScheduleVersionMock).toHaveBeenCalledTimes(1)
    expect(ensurePhase2ScheduleMock).toHaveBeenCalledTimes(2)
    expect(showErrorMock).toHaveBeenCalledWith(
      '이미 같은 이름의 근무표안이 있습니다.'
    )
    expect(wrapper.find('[data-test="version-name-input"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('덮어쓰기')
  })

  it.skip('refreshes duplicate state after version_name_exists and blocks an active duplicate without overwrite UI', async () => {
    createPhase2ScheduleVersionMock.mockRejectedValueOnce(
      Object.assign(new Error('Version name already exists'), {
        code: 'version_name_exists',
        status: 409,
      })
    )
    ensurePhase2ScheduleMock.mockReset()
    ensurePhase2ScheduleMock.mockResolvedValueOnce({
      scheduleId: 'schedule-1',
      schedulePublicId: SCHEDULE_PUBLIC_ID,
      organizationId: 'org-1',
      month: '2025-12',
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        {
          id: 'version-1',
          scheduleId: 'schedule-1',
          versionNo: 1,
          name: '1안',
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
          name: '2안',
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
          activeSolverExecutionId: null,
          isSelected: true,
          isFinalized: false,
        },
      ],
    })
    ensurePhase2ScheduleMock.mockResolvedValueOnce({
      scheduleId: 'schedule-1',
      schedulePublicId: SCHEDULE_PUBLIC_ID,
      organizationId: 'org-1',
      month: '2025-12',
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        {
          id: 'version-1',
          scheduleId: 'schedule-1',
          versionNo: 1,
          name: '1안',
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
          name: '2안',
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
          activeSolverExecutionId: null,
          isSelected: true,
          isFinalized: false,
        },
        {
          id: 'version-3',
          scheduleId: 'schedule-1',
          versionNo: 3,
          name: '3안',
          sourceType: 're_solve',
          baseVersionId: 'version-2',
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
      ],
    })

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.vm.handleAssignmentUpdate({
      employeeId: 'emp-1',
      date: '2025-12-01',
      shiftCode: 'O',
    })
    await flushPromises()

    await clickButtonByText(wrapper, '생성 시작으로 이동')
    await flushPromises()
    await fillVersionName(wrapper, '3안')
    await clickExactButtonByText(wrapper, '이 이름으로 생성')
    await flushPromises()

    expect(createPhase2ScheduleVersionMock).toHaveBeenCalledTimes(1)
    expect(ensurePhase2ScheduleMock).toHaveBeenCalledTimes(2)
    expect(showErrorMock).toHaveBeenCalledWith(
      '이미 같은 이름의 근무표안이 있습니다.'
    )
    expect(wrapper.text()).not.toContain('덮어쓰기')
  })

  it.skip('routes to an existing snapshot-matched version without rewriting assignments', async () => {
    createPhase2ScheduleVersionMock.mockResolvedValueOnce({
      scheduleId: 'schedule-1',
      schedulePublicId: SCHEDULE_PUBLIC_ID,
      organizationId: 'org-1',
      month: '2025-12',
      createdVersionId: 'version-existing',
      wasCreated: false,
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      versions: [],
    })
    getScheduleVersionAssignmentsMock.mockImplementation(async (versionId: string) => ({
      assignments: versionId === 'version-existing'
        ? {
            'emp-1': {
              '2025-12-01': 'D',
            },
          }
        : versionId === 'version-2'
          ? {
              'emp-1': {
                '2025-12-01': 'D',
              },
            }
          : {},
      offReasons: {},
      comments: {},
    }))

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.vm.handleAssignmentUpdate({
      employeeId: 'emp-1',
      date: '2025-12-01',
      shiftCode: 'O',
    })
    await flushPromises()

    await clickButtonByText(wrapper, '생성 시작으로 이동')
    await flushPromises()
    await clickExactButtonByText(wrapper, '이 이름으로 생성')
    await flushPromises()

    expect(createPhase2ScheduleVersionMock).toHaveBeenCalledWith(
      'schedule-1',
      expect.objectContaining({
        creationMode: 'new',
        inputSnapshot,
      })
    )
    expect(saveScheduleVersionPreferencesMock).not.toHaveBeenCalledWith(
      'schedule-1',
      'version-existing',
      expect.any(Object),
      expect.any(Object)
    )
    expect(deleteThisMonthVersionAssignmentsMock).not.toHaveBeenCalledWith(
      'schedule-1',
      'version-existing',
      '2025-12'
    )
    expect(scheduleStoreMock.setPreviewVersionId).toHaveBeenCalledWith('version-existing')
    expect(pushMock).toHaveBeenCalledWith({
      path: `/app/schedule/step5/${SCHEDULE_PUBLIC_ID}`,
      query: {
        version: 'version-existing',
        compare: 'version-2',
      },
    })
  })

  it.skip('persists note changes onto a reused snapshot-matched version without deleting assignments', async () => {
    createPhase2ScheduleVersionMock.mockResolvedValueOnce({
      scheduleId: 'schedule-1',
      schedulePublicId: SCHEDULE_PUBLIC_ID,
      organizationId: 'org-1',
      month: '2025-12',
      createdVersionId: 'version-existing',
      wasCreated: false,
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      versions: [],
    })
    getScheduleVersionAssignmentsMock.mockImplementation(async (versionId: string) => ({
      assignments: versionId === 'version-existing'
        ? {
            'emp-1': {
              '2025-12-01': 'D',
            },
          }
        : versionId === 'version-2'
          ? {
              'emp-1': {
                '2025-12-01': 'D',
              },
            }
          : {},
      offReasons: {},
      comments: {},
    }))

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.vm.handleAssignmentUpdate({
      employeeId: 'emp-1',
      date: '2025-12-01',
      shiftCode: 'O',
    })
    await flushPromises()

    await wrapper.vm.handleContextMenu({
      event: new MouseEvent('contextmenu'),
      employeeId: 'emp-1',
      date: '2025-12-01',
    })
    await flushPromises()

    wrapper.vm.handleSaveComment('연차')
    await flushPromises()

    await clickButtonByText(wrapper, '생성 시작으로 이동')
    await flushPromises()
    await clickExactButtonByText(wrapper, '이 이름으로 생성')
    await flushPromises()

    expect(saveScheduleVersionPreferencesMock).toHaveBeenCalledWith(
      'schedule-1',
      'version-existing',
      {
        'emp-1': {
          '2025-12-01': 'O',
        },
        'emp-2': {},
      },
      {
        'emp-1': {
          '2025-12-01': '연차',
        },
        'emp-2': {},
      }
    )
    expect(deleteThisMonthVersionAssignmentsMock).not.toHaveBeenCalledWith(
      'schedule-1',
      'version-existing',
      '2025-12'
    )
  })

  it('keeps selected unset and restores preview from the single available 1안 when selection is missing', async () => {
    ensurePhase2ScheduleMock.mockResolvedValueOnce({
      scheduleId: 'schedule-2',
      schedulePublicId: 'sch_b1b2c3d4e5f6',
      organizationId: 'org-1',
      month: '2025-12',
      selectedVersionId: null,
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        {
          id: 'version-v1',
          scheduleId: 'schedule-2',
          versionNo: 1,
          name: '1안',
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
      ],
    })

    createWrapper()
    await flushPromises()

    expect(scheduleStoreMock.setSelectedVersionId).toHaveBeenCalledWith(null)
    expect(scheduleStoreMock.setPreviewVersionId).toHaveBeenCalledWith('version-v1')
    expect(getScheduleVersionPreferencesMock).toHaveBeenCalledWith('version-v1')
  })

  it('shows explicit initialization failure and blocks save when ensure fails', async () => {
    ensurePhase2ScheduleMock.mockRejectedValueOnce(new Error('Failed to fetch'))

    const wrapper = createWrapper()
    await flushPromises()

    expect(showErrorMock).toHaveBeenCalledWith(
      expect.stringContaining('기준 버전 초기화에 실패했습니다')
    )

    expect(wrapper.findAll('button').some((button) => button.text() === '임시 저장')).toBe(false)

    await openRequestDrawer(wrapper)
    const composerSaveButton = wrapper.find('[data-test="composer-save-applied-changes"]')
    expect(composerSaveButton.exists()).toBe(true)
    expect(composerSaveButton.attributes('disabled')).toBeDefined()

    expect(saveScheduleVersionPreferencesMock).not.toHaveBeenCalled()
    expect(showErrorMock).toHaveBeenCalledTimes(1)
  })

  it('keeps a scoped localStorage v2 draft pending until the user loads it', async () => {
    writeScopedTempPreferences({
      constraints: {
        'emp-1': {
          '2025-12-01': 'O',
        },
      },
      constraintNotes: {
        'emp-1': {
          '2025-12-01': '연차',
        },
      },
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.vm.constraints).toEqual({
      'emp-1': {},
      'emp-2': {},
    })
    expect(wrapper.vm.constraintNotes).toEqual({
      'emp-1': {},
      'emp-2': {},
    })
    expect(wrapper.text()).toContain('이전에 입력하던 Off 요청이 있습니다')
    expect(wrapper.text()).toContain('저장된 데이터와 다를 수 있어 자동으로 반영하지 않았습니다. 필요한 경우 직접 불러와 이어서 작업하세요.')
    expect(wrapper.text()).toContain('불러오기')
    expect(wrapper.text()).toContain('삭제')
    expect(showInfoMock).not.toHaveBeenCalledWith('브라우저 임시 저장 데이터를 불러왔습니다.')

    await clickExactButtonByText(wrapper, '불러오기')
    await flushPromises()

    expect(wrapper.find('[data-test="pending-local-draft-alert"]').exists()).toBe(false)
    expect(wrapper.vm.constraints).toEqual({
      'emp-1': {
        '2025-12-01': 'O',
      },
      'emp-2': {},
    })
    expect(wrapper.vm.constraintNotes).toEqual({
      'emp-1': {
        '2025-12-01': '연차',
      },
      'emp-2': {},
    })
    expect(showSuccessMock).toHaveBeenCalledWith('이전에 입력하던 Off 요청을 불러왔습니다.')

    await clickComposerSaveAppliedChanges(wrapper)

    expect(saveScheduleVersionPreferencesMock).toHaveBeenCalledWith(
      'schedule-1',
      'version-2',
      {
        'emp-1': {
          '2025-12-01': 'O',
        },
        'emp-2': {},
      },
      {
        'emp-1': {
          '2025-12-01': '연차',
        },
        'emp-2': {},
      }
    )
  })

  it('deletes a pending scoped localStorage draft without changing visible DB data', async () => {
    writeScopedTempPreferences({
      constraints: {
        'emp-1': {
          '2025-12-01': 'O',
        },
      },
      constraintNotes: {
        'emp-1': {
          '2025-12-01': '연차',
        },
      },
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="pending-local-draft-alert"]').exists()).toBe(true)

    await clickExactButtonByText(wrapper, '삭제')
    await flushPromises()

    expect(localStorage.getItem('everyshift_temp_preferences_v2:user-1:org-1:2025-12')).toBeNull()
    expect(wrapper.find('[data-test="pending-local-draft-alert"]').exists()).toBe(false)
    expect(wrapper.vm.constraints).toEqual({
      'emp-1': {},
      'emp-2': {},
    })
    expect(wrapper.vm.constraintNotes).toEqual({
      'emp-1': {},
      'emp-2': {},
    })
    expect(showSuccessMock).toHaveBeenCalledWith('이전에 입력하던 Off 요청을 삭제했습니다.')
  })

  it('replaces restored preferences on retry instead of retaining stale Off requests', async () => {
    getScheduleVersionPreferencesMock.mockResolvedValueOnce({
      constraints: {
        'emp-1': {
          '2025-12-01': 'O',
        },
      },
      notes: {
        'emp-1': {
          '2025-12-01': '연차',
        },
      },
      preferences: [
        {
          employee_id: 'emp-1',
          date: '2025-12-01',
          request_code: 'O',
          request_note: '연차',
        },
      ],
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.vm.constraints).toEqual({
      'emp-1': {
        '2025-12-01': 'O',
      },
      'emp-2': {},
    })
    expect(wrapper.vm.constraintNotes).toEqual({
      'emp-1': {
        '2025-12-01': '연차',
      },
      'emp-2': {},
    })

    getScheduleVersionPreferencesMock.mockResolvedValue({
      constraints: {},
      notes: {},
      preferences: [],
    })

    await wrapper.vm.handleRetryBaseline()
    await flushPromises()

    expect(wrapper.vm.constraints).toEqual({
      'emp-1': {},
      'emp-2': {},
    })
    expect(wrapper.vm.constraintNotes).toEqual({
      'emp-1': {},
      'emp-2': {},
    })
  })

  it('keeps DB preferences as restore priority over scoped localStorage fallback in normal mode', async () => {
    getScheduleVersionPreferencesMock.mockResolvedValueOnce({
      constraints: {
        'emp-1': {
          '2025-12-01': 'O',
        },
      },
      notes: {},
      preferences: [
        {
          employee_id: 'emp-1',
          date: '2025-12-01',
          request_code: 'O',
        },
      ],
    })

    writeScopedTempPreferences({
      constraints: {
        'emp-2': {
          '2025-12-01': 'O',
        },
      },
      constraintNotes: {},
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.vm.constraints).toEqual({
      'emp-1': {
        '2025-12-01': 'O',
      },
      'emp-2': {},
    })
    expect(wrapper.text()).toContain('이전에 입력하던 Off 요청이 있습니다')

    await openRequestDrawer(wrapper)
    expect(wrapper.find('[data-test="composer-save-applied-changes"]').attributes('disabled')).toBeDefined()

    expect(saveScheduleVersionPreferencesMock).not.toHaveBeenCalled()
  })

  it('does not overwrite a pending scoped localStorage draft with restored DB data', async () => {
    vi.useFakeTimers()
    getScheduleVersionPreferencesMock.mockResolvedValueOnce({
      constraints: {
        'emp-1': {
          '2025-12-01': 'O',
        },
      },
      notes: {},
      preferences: [
        {
          employee_id: 'emp-1',
          date: '2025-12-01',
          request_code: 'O',
        },
      ],
    })
    writeScopedTempPreferences({
      constraints: {
        'emp-2': {
          '2025-12-01': 'O',
        },
      },
      constraintNotes: {
        'emp-2': {
          '2025-12-01': '초안',
        },
      },
    })

    try {
      const wrapper = createWrapper()
      await flushPromises()

      expect(wrapper.text()).toContain('이전에 입력하던 Off 요청이 있습니다')

      await vi.advanceTimersByTimeAsync(2100)

      const stored = JSON.parse(
        localStorage.getItem('everyshift_temp_preferences_v2:user-1:org-1:2025-12') || '{}'
      )
      expect(stored.constraints).toEqual({
        'emp-2': {
          '2025-12-01': 'O',
        },
      })
      expect(stored.constraintNotes).toEqual({
        'emp-2': {
          '2025-12-01': '초안',
        },
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it.skip('restores draft edit-off version preferences instead of the source version on re-entry', async () => {
    routeQueryMock.intent = 'edit-off'
    routeQueryMock.version = 'version-3'
    routeQueryMock.sourceVersion = 'version-2'
    ensurePhase2ScheduleMock.mockResolvedValue(createDraftEditOffEnsureResponse())
    getScheduleVersionPreferencesMock.mockImplementation(async (versionId: string) => {
      if (versionId === 'version-3') {
        return {
          constraints: {
            'emp-2': {
              '2025-12-01': 'O',
            },
          },
          notes: {
            'emp-2': {
              '2025-12-01': '새 근무표안 요청',
            },
          },
          preferences: [
            {
              employee_id: 'emp-2',
              date: '2025-12-01',
              request_code: 'O',
              request_note: '새 근무표안 요청',
            },
          ],
        }
      }

      return {
        constraints: {
          'emp-1': {
            '2025-12-01': 'O',
          },
        },
        notes: {
          'emp-1': {
            '2025-12-01': '기존 결과 요청',
          },
        },
        preferences: [
          {
            employee_id: 'emp-1',
            date: '2025-12-01',
            request_code: 'O',
            request_note: '기존 결과 요청',
          },
        ],
      }
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(getScheduleVersionPreferencesMock).toHaveBeenCalledWith('version-3')
    expect(scheduleStoreMock.setPreviewVersionId).toHaveBeenCalledWith('version-3')
    expect(wrapper.vm.constraints).toEqual({
      'emp-1': {},
      'emp-2': {
        '2025-12-01': 'O',
      },
    })
    expect(wrapper.vm.constraintNotes).toEqual({
      'emp-1': {},
      'emp-2': {
        '2025-12-01': '새 근무표안 요청',
      },
    })
  })

  it('keeps staged scoped localStorage pending over DB preferences in edit-off mode', async () => {
    routeQueryMock.intent = 'edit-off'
    getScheduleVersionPreferencesMock.mockResolvedValueOnce({
      constraints: {
        'emp-1': {
          '2025-12-01': 'O',
        },
      },
      notes: {
        'emp-1': {
          '2025-12-01': '기존 DB 요청',
        },
      },
      preferences: [
        {
          employee_id: 'emp-1',
          date: '2025-12-01',
          request_code: 'O',
          request_note: '기존 DB 요청',
        },
      ],
    })

    writeScopedTempPreferences({
      constraints: {
        'emp-2': {
          '2025-12-01': 'O',
        },
      },
      constraintNotes: {
        'emp-2': {
          '2025-12-01': '새 근무표안 입력',
        },
      },
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.vm.constraints).toEqual({
      'emp-1': {
        '2025-12-01': 'O',
      },
      'emp-2': {},
    })
    expect(wrapper.vm.constraintNotes).toEqual({
      'emp-1': {
        '2025-12-01': '기존 DB 요청',
      },
      'emp-2': {},
    })
    expect(saveScheduleVersionPreferencesMock).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('이전에 입력하던 Off 요청이 있습니다')

    await clickExactButtonByText(wrapper, '불러오기')
    await flushPromises()

    expect(wrapper.vm.constraints).toEqual({
      'emp-1': {},
      'emp-2': {
        '2025-12-01': 'O',
      },
    })
    expect(wrapper.vm.constraintNotes).toEqual({
      'emp-1': {},
      'emp-2': {
        '2025-12-01': '새 근무표안 입력',
      },
    })
    expect(showSuccessMock).toHaveBeenCalledWith('이전에 입력하던 Off 요청을 불러왔습니다.')
  })

  it('ignores expired scoped localStorage v2 payloads older than 72 hours', async () => {
    const expired = new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString()
    writeScopedTempPreferences({
      savedAt: expired,
      constraints: {
        'emp-1': {
          '2025-12-01': 'O',
        },
      },
      constraintNotes: {},
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="pending-local-draft-alert"]').exists()).toBe(false)
    await openRequestDrawer(wrapper)
    expect(wrapper.find('[data-test="composer-save-applied-changes"]').attributes('disabled')).toBeDefined()

    expect(saveScheduleVersionPreferencesMock).not.toHaveBeenCalled()
  })

  it('migrates legacy month-based key once when scoped v2 key is missing', async () => {
    localStorage.setItem(
      'everyshift_temp_preferences_2025-12',
      JSON.stringify({
        constraints: {
          'emp-1': {
            '2025-12-01': 'O',
          },
          'legacy-emp': {
            '2025-12-01': 'O',
          },
        },
        constraintNotes: {
          'emp-1': {
            '2025-12-01': '개인 사유',
          },
          'legacy-emp': {
            '2025-12-01': 'stale',
          },
        },
      })
    )

    const wrapper = createWrapper()
    await flushPromises()

    await clickComposerSaveAppliedChanges(wrapper)

    expect(localStorage.getItem('everyshift_temp_preferences_2025-12')).toBeNull()

    const migrated = localStorage.getItem('everyshift_temp_preferences_v2:user-1:org-1:2025-12')
    expect(migrated).toBeTruthy()
    const parsed = JSON.parse(migrated || '{}')
    expect(parsed.constraints).toEqual({
      'emp-1': {
        '2025-12-01': 'O',
      },
      'emp-2': {},
    })
    expect(parsed.constraintNotes).toEqual({
      'emp-1': {
        '2025-12-01': '개인 사유',
      },
      'emp-2': {},
    })
  })
})
