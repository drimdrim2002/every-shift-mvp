import { mount, flushPromises } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
  showSuccessMock,
  showInfoMock,
  showErrorMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  routeQueryMock: {} as { from?: string; intent?: string },
  createPhase2ScheduleVersionMock: vi.fn(),
  ensurePhase2ScheduleMock: vi.fn(),
  getScheduleVersionAssignmentsMock: vi.fn(),
  getScheduleVersionPreferencesMock: vi.fn(),
  getSchedulePreferencesMock: vi.fn(),
  recheckPhase2ScheduleVersionMock: vi.fn(),
  saveScheduleVersionPreferencesMock: vi.fn(),
  deleteThisMonthVersionAssignmentsMock: vi.fn(),
  buildScheduleSolverRequestMock: vi.fn(),
  showSuccessMock: vi.fn(),
  showInfoMock: vi.fn(),
  showErrorMock: vi.fn(),
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
  NSpin: { template: '<div><slot /></div>' },
  NAlert: { template: '<div><slot /><slot name="header" /></div>' },
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
  default: { template: '<div />' },
}))

vi.mock('@/components/schedule/CommentModal.vue', () => ({
  default: { template: '<div />' },
}))

vi.mock('@/components/schedule/DaySummaryModal.vue', () => ({
  default: { template: '<div />' },
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

function createWrapper() {
  return mount(Step4InitialData, {
    global: {
      stubs: {},
    },
  })
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

describe('Step4InitialData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    routeQueryMock.from = undefined
    routeQueryMock.intent = undefined

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

    ensurePhase2ScheduleMock.mockResolvedValue({
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

  it('keeps the current preview version when returning from Step5', async () => {
    scheduleStoreMock.previewVersionId = 'version-2'

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

  it('falls back to the selected version when there is no preferred preview', async () => {
    createWrapper()
    await flushPromises()

    expect(scheduleStoreMock.setSelectedVersionId).toHaveBeenCalledWith('version-2')
    expect(scheduleStoreMock.setPreviewVersionId).toHaveBeenCalledWith('version-2')
    expect(getScheduleVersionPreferencesMock).toHaveBeenCalledWith('version-2')
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
    localStorage.setItem(
      'everyshift_temp_preferences_v2:user-1:org-1:2025-12',
      JSON.stringify({
        schemaVersion: 2,
        ownerUserId: 'user-1',
        ownerOrganizationId: 'org-1',
        month: '2025-12',
        savedAt: new Date().toISOString(),
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
    )
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

  it('saves Step4 preferences into the active preview version', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.vm.handleAssignmentUpdate({
      employeeId: 'emp-1',
      date: '2025-12-01',
      shiftCode: 'O',
    })
    await flushPromises()

    await clickButtonByText(wrapper, '임시 저장')
    await flushPromises()

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
  })

  it('opens the existing-history choice modal on normal Step4 entry', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('기존 생성 결과가 있습니다')
    expect(wrapper.text()).toContain('Off 수정 후 다시 실행')
    expect(wrapper.text()).toContain('결과 확인')
  })

  it('suppresses the existing-history choice modal for explicit edit intent', async () => {
    routeQueryMock.intent = 'edit-off'

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).not.toContain('기존 생성 결과가 있습니다')
    expect(wrapper.text()).not.toContain('Off 수정 후 다시 실행')
  })

  it('keeps Step4 editable and loaded with version preferences after choosing edit', async () => {
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

    await clickButtonByText(wrapper, 'Off 수정 후 다시 실행')
    await flushPromises()

    expect(wrapper.text()).not.toContain('기존 생성 결과가 있습니다')
    expect(replaceMock).toHaveBeenCalledWith({
      query: {
        intent: 'edit-off',
      },
    })
    expect(getScheduleVersionPreferencesMock).toHaveBeenCalledWith('version-2')
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
    expect(saveScheduleVersionPreferencesMock).not.toHaveBeenCalled()
  })

  it('routes to Step5 with default focus and compare IDs after choosing result review', async () => {
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

    await clickExactButtonByText(wrapper, '결과 확인')
    await flushPromises()

    expect(pushMock).toHaveBeenCalledWith({
      path: `/app/schedule/step5/${SCHEDULE_PUBLIC_ID}`,
      query: {
        compare: 'version-1',
      },
    })
  })

  it('does not create a schedule version when Step4 is opened alone', async () => {
    createWrapper()
    await flushPromises()

    expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled()
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

  it('persists a custom first-run name onto the bootstrap version before autoStart routing', async () => {
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
      ],
    })

    const wrapper = createWrapper()
    await flushPromises()

    await clickButtonByText(wrapper, '근무표 생성(AI)')
    await flushPromises()

    expect(wrapper.text()).toContain('버전 이름')
    expect(wrapper.find<HTMLInputElement>('[data-test="version-name-input"]').element.value).toBe('V1')
    expect(pushMock).not.toHaveBeenCalledWith({
      path: `/app/schedule/step5/${SCHEDULE_PUBLIC_ID}`,
      query: {
        autoStart: '1',
      },
    })

    await fillVersionName(wrapper, '첫 생성본')
    await clickExactButtonByText(wrapper, '확인')
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

  it('requires and persists a first-run version name for note-only autoStart routing', async () => {
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

    expect(wrapper.text()).toContain('버전 이름')
    expect(pushMock).not.toHaveBeenCalledWith({
      path: `/app/schedule/step5/${SCHEDULE_PUBLIC_ID}`,
      query: {
        autoStart: '1',
      },
    })

    await clickExactButtonByText(wrapper, '확인')
    await flushPromises()

    expect(createPhase2ScheduleVersionMock).toHaveBeenCalledWith(
      'schedule-1',
      expect.objectContaining({
        baseVersionId: 'version-1',
        name: 'V1',
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

  it('creates a new candidate version when Step4 input changes before returning to Step5', async () => {
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

    await clickButtonByText(wrapper, '생성 시작으로 이동')
    await flushPromises()

    expect(wrapper.text()).toContain('버전 이름')
    expect(wrapper.find<HTMLInputElement>('[data-test="version-name-input"]').element.value).toBe('V3')
    expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled()

    await clickExactButtonByText(wrapper, '확인')
    await flushPromises()

    expect(createPhase2ScheduleVersionMock).toHaveBeenCalledWith('schedule-1', {
      baseVersionId: 'version-2',
      name: 'V3',
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

  it('blocks empty or whitespace-only version names before calling the create API', async () => {
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
    await fillVersionName(wrapper, '   ')
    await clickExactButtonByText(wrapper, '확인')
    await flushPromises()

    expect(showErrorMock).toHaveBeenCalledWith('버전 이름을 입력해 주세요.')
    expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled()
  })

  it('detects duplicate version names by trimmed lowercase value before creating', async () => {
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
    await fillVersionName(wrapper, '  v2  ')
    await clickExactButtonByText(wrapper, '확인')
    await flushPromises()

    expect(wrapper.text()).toContain('이미 같은 이름의 버전이 있습니다')
    expect(wrapper.text()).toContain('덮어쓰기')
    expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled()
  })

  it('does not allow finalized, solving, or archived duplicate versions to be selected for overwrite', async () => {
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
      await clickExactButtonByText(wrapper, '확인')
      await flushPromises()

      expect(showErrorMock).toHaveBeenCalledWith('이 버전은 덮어쓸 수 없습니다. 다른 이름을 입력해 주세요.')
      expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled()
    }
  })

  it('sends overwrite creation mode and overwriteVersionId after duplicate overwrite confirmation', async () => {
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
    await fillVersionName(wrapper, 'v1')
    await clickExactButtonByText(wrapper, '확인')
    await flushPromises()
    await clickExactButtonByText(wrapper, '덮어쓰기')
    await flushPromises()

    expect(createPhase2ScheduleVersionMock).toHaveBeenCalledWith(
      'schedule-1',
      expect.objectContaining({
        name: 'v1',
        creationMode: 'overwrite',
        overwriteVersionId: 'version-1',
        inputSnapshot,
        inputDiffSummary: {
          changedOffRequests: 1,
          changedLockedAssignments: 0,
          changedSiteRequirements: 0,
          note: null,
        },
      })
    )
  })

  it('persists preferences and clears assignments when overwrite returns the reused version', async () => {
    createPhase2ScheduleVersionMock.mockResolvedValueOnce({
      scheduleId: 'schedule-1',
      schedulePublicId: SCHEDULE_PUBLIC_ID,
      organizationId: 'org-1',
      month: '2025-12',
      createdVersionId: 'version-1',
      wasCreated: false,
      selectedVersionId: 'version-2',
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

    await clickButtonByText(wrapper, '생성 시작으로 이동')
    await flushPromises()
    await fillVersionName(wrapper, 'v1')
    await clickExactButtonByText(wrapper, '확인')
    await flushPromises()
    await clickExactButtonByText(wrapper, '덮어쓰기')
    await flushPromises()

    expect(saveScheduleVersionPreferencesMock).toHaveBeenCalledWith(
      'schedule-1',
      'version-1',
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
      'version-1',
      '2025-12'
    )
    expect(pushMock).toHaveBeenCalledWith({
      path: `/app/schedule/step5/${SCHEDULE_PUBLIC_ID}`,
      query: {
        version: 'version-1',
        compare: 'version-2',
        autoStart: '1',
      },
    })
  })

  it('does not overwrite a stale duplicate candidate after the name input changes', async () => {
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
    await fillVersionName(wrapper, 'v1')
    await clickExactButtonByText(wrapper, '확인')
    await flushPromises()
    expect(wrapper.text()).toContain('이미 같은 이름의 버전이 있습니다')

    await fillVersionName(wrapper, 'V9')
    await clickExactButtonByText(wrapper, '덮어쓰기')
    await flushPromises()

    expect(showErrorMock).toHaveBeenCalledWith('버전 이름이 변경되었습니다. 다시 확인해 주세요.')
    expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled()
  })

  it('routes to an existing snapshot-matched version without rewriting assignments', async () => {
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
    await clickExactButtonByText(wrapper, '확인')
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

  it('persists note changes onto a reused snapshot-matched version without deleting assignments', async () => {
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
    await clickExactButtonByText(wrapper, '확인')
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

  it('keeps selected unset and restores preview from the single available V1 when selection is missing', async () => {
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

    const saveButton = wrapper.findAll('button').find((button) => button.text().includes('임시 저장'))
    expect(saveButton).toBeTruthy()
    expect(saveButton?.attributes('disabled')).toBeDefined()

    expect(saveScheduleVersionPreferencesMock).not.toHaveBeenCalled()
    expect(showErrorMock).toHaveBeenCalledTimes(1)
  })

  it('restores from scoped localStorage v2 when DB has no preferences', async () => {
    localStorage.setItem(
      'everyshift_temp_preferences_v2:user-1:org-1:2025-12',
      JSON.stringify({
        schemaVersion: 2,
        ownerUserId: 'user-1',
        ownerOrganizationId: 'org-1',
        month: '2025-12',
        savedAt: new Date().toISOString(),
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
    )

    const wrapper = createWrapper()
    await flushPromises()

    await clickButtonByText(wrapper, '임시 저장')
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
    expect(showInfoMock).toHaveBeenCalledWith('브라우저 임시 저장 데이터를 불러왔습니다.')
  })

  it('keeps DB preferences as restore priority over scoped localStorage fallback', async () => {
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

    localStorage.setItem(
      'everyshift_temp_preferences_v2:user-1:org-1:2025-12',
      JSON.stringify({
        schemaVersion: 2,
        ownerUserId: 'user-1',
        ownerOrganizationId: 'org-1',
        month: '2025-12',
        savedAt: new Date().toISOString(),
        constraints: {
          'emp-2': {
            '2025-12-01': 'O',
          },
        },
        constraintNotes: {},
      })
    )

    const wrapper = createWrapper()
    await flushPromises()

    await clickButtonByText(wrapper, '임시 저장')
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
        'emp-1': {},
        'emp-2': {},
      }
    )
  })

  it('ignores expired scoped localStorage v2 payloads older than 72 hours', async () => {
    const expired = new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString()
    localStorage.setItem(
      'everyshift_temp_preferences_v2:user-1:org-1:2025-12',
      JSON.stringify({
        schemaVersion: 2,
        ownerUserId: 'user-1',
        ownerOrganizationId: 'org-1',
        month: '2025-12',
        savedAt: expired,
        constraints: {
          'emp-1': {
            '2025-12-01': 'O',
          },
        },
        constraintNotes: {},
      })
    )

    const wrapper = createWrapper()
    await flushPromises()

    await clickButtonByText(wrapper, '임시 저장')
    await flushPromises()

    expect(saveScheduleVersionPreferencesMock).toHaveBeenCalledWith(
      'schedule-1',
      'version-2',
      {
        'emp-1': {},
        'emp-2': {},
      },
      {
        'emp-1': {},
        'emp-2': {},
      }
    )
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

    await clickButtonByText(wrapper, '임시 저장')
    await flushPromises()

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
