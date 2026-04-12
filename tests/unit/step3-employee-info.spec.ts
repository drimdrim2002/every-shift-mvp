import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  pushMock,
  routeQueryMock,
  getScheduleStatusMock,
  getLatestScheduleByOrganizationMonthMock,
  getPhase2ScheduleCompareMock,
  validateEmployeeImportMock,
  applyEmployeeImportMock,
  supabaseFromMock,
  messageMock,
  dialogMock,
  setBasicInfoMock,
  setSelectedVersionIdMock,
  setPreviewVersionIdMock,
  showErrorMock,
  showInfoMock,
  showSuccessMock,
  showWarningMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  routeQueryMock: {} as { from?: string },
  getScheduleStatusMock: vi.fn(),
  getLatestScheduleByOrganizationMonthMock: vi.fn(),
  getPhase2ScheduleCompareMock: vi.fn(),
  validateEmployeeImportMock: vi.fn(),
  applyEmployeeImportMock: vi.fn(),
  supabaseFromMock: vi.fn(),
  messageMock: {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
  dialogMock: {
    warning: vi.fn(),
  },
  setBasicInfoMock: vi.fn(),
  setSelectedVersionIdMock: vi.fn(),
  setPreviewVersionIdMock: vi.fn(),
  showErrorMock: vi.fn(),
  showInfoMock: vi.fn(),
  showSuccessMock: vi.fn(),
  showWarningMock: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  useRoute: () => ({
    query: routeQueryMock,
  }),
}))

vi.mock('@/api/schedule', () => ({
  getScheduleStatus: getScheduleStatusMock,
  getLatestScheduleByOrganizationMonth: getLatestScheduleByOrganizationMonthMock,
  getPhase2ScheduleCompare: getPhase2ScheduleCompareMock,
}))

vi.mock('@/api/ops', () => ({
  validateEmployeeImport: validateEmployeeImportMock,
  applyEmployeeImport: applyEmployeeImportMock,
}))

vi.mock('@/api/supabase', () => ({
  supabase: {
    from: supabaseFromMock,
  },
}))

vi.mock('naive-ui', () => ({
  NCard: { template: '<div><slot /></div>' },
  NButton: { template: '<button v-bind="$attrs"><slot /></button>' },
  NAlert: { template: '<div><slot /></div>' },
  NTabs: { template: '<div><slot /></div>' },
  NTabPane: { template: '<div><slot /></div>' },
  NPopconfirm: {
    template:
      '<div><slot name="trigger" /><button data-test="popconfirm-confirm" @click="$emit(\'positive-click\')">confirm</button><slot /></div>',
  },
}))

vi.mock('@/utils/message', () => ({
  showError: showErrorMock,
  showInfo: showInfoMock,
  showSuccess: showSuccessMock,
  showWarning: showWarningMock,
}))

const scheduleStoreMock = reactive({
  basicInfo: {
    scheduleId: 'schedule-123',
    month: '2025-12',
    organizationId: 'org-1',
    organizationName: '서울병원',
    organizationType: 'hospital',
    employeeCount: 1,
    shifts: [],
  },
  employees: [
    {
      employeeId: 'E001',
      name: 'Kim',
      availableShifts: ['D'],
    },
  ],
  currentStep: 3,
  nextStep: vi.fn(() => {
    scheduleStoreMock.currentStep += 1
  }),
  prevStep: vi.fn(() => {
    scheduleStoreMock.currentStep -= 1
  }),
  setEmployees: vi.fn(),
  setAssignments: vi.fn(),
  setBasicInfo: setBasicInfoMock,
  setSelectedVersionId: setSelectedVersionIdMock,
  setPreviewVersionId: setPreviewVersionIdMock,
  reset: vi.fn(),
})

const organizationStoreMock = reactive({
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
})

const authStoreMock = reactive({
  user: {
    id: 'user-1',
  } as { id: string } | null,
})

vi.mock('@/stores/schedule', () => ({
  useScheduleStore: () => scheduleStoreMock,
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => authStoreMock,
}))

vi.mock('@/stores/organization', () => ({
  useOrganizationStore: () => organizationStoreMock,
}))

vi.mock('@/components/schedule/StepIndicator.vue', () => ({
  default: { template: '<div />' },
}))

vi.mock('@/components/schedule/EmployeeTable.vue', () => ({
  default: { template: '<div data-test="employee-table" />' },
}))

vi.mock('@/components/schedule/EmployeeExcelUpload.vue', () => ({
  default: { template: '<div data-test="employee-upload" />' },
}))

import Step3EmployeeInfo from '@/views/schedule/Step3EmployeeInfo.vue'

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
  return mount(Step3EmployeeInfo, {
    global: {
      stubs: {},
    },
  })
}

describe('Step3EmployeeInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeQueryMock.from = undefined
    scheduleStoreMock.basicInfo = {
      scheduleId: 'schedule-123',
      month: '2025-12',
      organizationId: 'org-1',
      organizationName: '서울병원',
      organizationType: 'hospital',
      employeeCount: 1,
      shifts: [],
    }
    scheduleStoreMock.employees = [
      {
        employeeId: 'E001',
        name: 'Kim',
        availableShifts: ['D'],
      },
    ]
    scheduleStoreMock.currentStep = 3
    authStoreMock.user = {
      id: 'user-1',
    }
    scheduleStoreMock.reset.mockClear()

    const eqMock = vi.fn().mockResolvedValue({ count: 1, error: null })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    supabaseFromMock.mockImplementation((table: string) => {
      if (table === 'schedule_assignments') {
        return {
          select: selectMock,
        }
      }

      if (table === 'schedules') {
        return {
          select: selectMock,
        }
      }

      return { select: selectMock }
    })

    getScheduleStatusMock.mockResolvedValue({
      id: 'schedule-123',
      status: 'complete',
    })
    getLatestScheduleByOrganizationMonthMock.mockResolvedValue(null)
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
    ;(window as typeof window & { $message?: typeof messageMock }).$message = messageMock
    ;(window as typeof window & { $dialog?: typeof dialogMock }).$dialog = dialogMock

    validateEmployeeImportMock.mockResolvedValue({
      organizationId: 'org-1',
      month: '2025-12',
      employeeCount: 1,
      duplicateEmployeeIds: [],
      missingShiftCodes: [],
      isFinalized: false,
      isValid: true,
      previewEmployees: [
        {
          employeeId: 'E001',
          name: 'Kim',
          availableShifts: ['D'],
          rankCode: null,
        },
      ],
    })

    applyEmployeeImportMock.mockResolvedValue({
      organizationId: 'org-1',
      month: '2025-12',
      deletedScheduleId: 'schedule-123',
      employeeCount: 1,
      duplicateEmployeeIds: [],
      missingShiftCodes: [],
      isFinalized: false,
      isValid: true,
      previewEmployees: [
        {
          employeeId: 'E001',
          name: 'Kim',
          availableShifts: ['D'],
          rankCode: null,
        },
      ],
    })
  })

  it('waits for the initial employee preload before rendering the editor surface', async () => {
    const employeesDeferred = createDeferred<{
      data: Array<{
        employee_id: string
        name: string
        available_shifts: string[]
        rank_code?: string | null
      }>
      error: null
    }>()

    scheduleStoreMock.employees = []
    supabaseFromMock.mockImplementation((table: string) => {
      if (table === 'employees') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue(employeesDeferred.promise),
            }),
          }),
        }
      }

      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
        }),
      }
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="employee-table"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="employee-upload"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('직원 정보를 불러오는 중입니다.')

    employeesDeferred.resolve({
      data: [],
      error: null,
    })
    await flushPromises()

    expect(wrapper.find('[data-test="employee-table"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('직원 정보를 불러오는 중입니다.')
    expect(wrapper.text()).toContain('저장')
  })

  it('validates first and applies second with explicit confirmation', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('저장'))
      ?.trigger('click')
    await flushPromises()

    expect(validateEmployeeImportMock).toHaveBeenCalledWith({
      organizationId: 'org-1',
      month: '2025-12',
      employees: expect.arrayContaining([
        expect.objectContaining({
          employeeId: 'E001',
          name: 'Kim',
          availableShifts: ['D'],
        }),
      ]),
    })
    expect(applyEmployeeImportMock).not.toHaveBeenCalled()
    expect(showSuccessMock).toHaveBeenCalledWith(
      '직원 정보 검증이 완료되었습니다. 적용 전에 결과를 확인하세요.'
    )

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('적용'))
      ?.trigger('click')
    await flushPromises()

    expect(dialogMock.warning).toHaveBeenCalledTimes(1)
    const warningConfig = dialogMock.warning.mock.calls[0]?.[0] as {
      onPositiveClick?: () => Promise<void> | void
    }
    expect(warningConfig).toMatchObject({
      title: '직원 정보 적용 확인',
      positiveText: '계속 적용',
      negativeText: '취소',
    })

    await warningConfig.onPositiveClick?.()
    await flushPromises()

    expect(applyEmployeeImportMock).toHaveBeenCalledWith({
      organizationId: 'org-1',
      month: '2025-12',
      employees: expect.arrayContaining([
        expect.objectContaining({
          employeeId: 'E001',
          name: 'Kim',
          availableShifts: ['D'],
        }),
      ]),
    })
    expect(setBasicInfoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleId: undefined,
        employeeCount: 1,
      })
    )
    expect(setSelectedVersionIdMock).toHaveBeenCalledWith(null)
    expect(setPreviewVersionIdMock).toHaveBeenCalledWith(null)
    expect(pushMock).toHaveBeenCalledWith('/schedule/step4')
    expect(pushMock).not.toHaveBeenCalledWith({
      path: '/schedule/step5/schedule-123',
      query: {
        version: 'version-2',
      },
    })
  })

  it('shows the dashboard return CTA and requires confirmation before resetting state', async () => {
    routeQueryMock.from = 'dashboard'

    const wrapper = createWrapper()
    await flushPromises()

    const returnButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('근무표 관리로 돌아가기'))
    expect(returnButton?.exists()).toBe(true)

    await returnButton?.trigger('click')
    await flushPromises()

    expect(scheduleStoreMock.reset).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalledWith('/')

    const confirmButtons = wrapper.findAll('[data-test="popconfirm-confirm"]')
    expect(confirmButtons).toHaveLength(1)
    await confirmButtons[0]!.trigger('click')
    await flushPromises()

    expect(scheduleStoreMock.reset).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith('/')
  })

  it('hides the dashboard return CTA when the step was not opened from the dashboard', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).not.toContain('근무표 관리로 돌아가기')
  })

  it('hides the wizard previous CTA when the step was opened from the dashboard', async () => {
    routeQueryMock.from = 'dashboard'

    const wrapper = createWrapper()
    await flushPromises()

    const prevButton = wrapper.findAll('button').find((button) => button.text().includes('이전'))
    expect(prevButton).toBeUndefined()
  })

  it('preserves the dashboard origin query when applying and moving to Step4', async () => {
    routeQueryMock.from = 'dashboard'

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('저장'))
      ?.trigger('click')
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('적용'))
      ?.trigger('click')
    await flushPromises()

    const warningConfig = dialogMock.warning.mock.calls[0]?.[0] as {
      onPositiveClick?: () => Promise<void> | void
    }
    await warningConfig.onPositiveClick?.()
    await flushPromises()

    expect(pushMock).toHaveBeenCalledWith({
      path: '/schedule/step4',
      query: {
        from: 'dashboard',
      },
    })
  })

  it('preserves rank codes loaded from the database when validating and applying', async () => {
    scheduleStoreMock.employees = []
    supabaseFromMock.mockImplementation((table: string) => {
      if (table === 'employees') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    employee_id: 'E001',
                    name: 'Kim',
                    available_shifts: ['D'],
                    rank_code: 'RN',
                  },
                ],
                error: null,
              }),
            }),
          }),
        }
      }

      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
        }),
      }
    })

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('저장'))
      ?.trigger('click')
    await flushPromises()

    expect(validateEmployeeImportMock).toHaveBeenCalledWith({
      organizationId: 'org-1',
      month: '2025-12',
      employees: [
        {
          employeeId: 'E001',
          name: 'Kim',
          availableShifts: ['D'],
          rankCode: 'RN',
        },
      ],
    })

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('적용'))
      ?.trigger('click')
    await flushPromises()

    const warningConfig = dialogMock.warning.mock.calls[0]?.[0] as {
      onPositiveClick?: () => Promise<void> | void
    }
    await warningConfig.onPositiveClick?.()
    await flushPromises()

    expect(applyEmployeeImportMock).toHaveBeenCalledWith({
      organizationId: 'org-1',
      month: '2025-12',
      employees: [
        {
          employeeId: 'E001',
          name: 'Kim',
          availableShifts: ['D'],
          rankCode: 'RN',
        },
      ],
    })
  })

  it('blocks finalized month on apply even after preview validation succeeds', async () => {
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-123',
      selectedVersionId: 'version-2',
      finalizedVersionId: 'version-final',
      activeSolvingVersionId: null,
      versions: [
        {
          id: 'version-final',
          scheduleId: 'schedule-123',
          versionNo: 2,
          name: 'V2',
          sourceType: 're_solve',
          baseVersionId: 'version-1',
          status: 'finalized',
          currentRevision: 2,
          manualEditCount: 1,
          inputDiffSummary: {
            changedOffRequests: 1,
            changedLockedAssignments: 0,
            changedSiteRequirements: 0,
            note: 'finalized',
          },
          latestEvaluationId: null,
          latestEvaluationResultStatus: null,
          comparisonMetrics: null,
          finalizationGate: null,
          isSelected: true,
          isFinalized: true,
        },
      ],
    })

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('저장'))
      ?.trigger('click')
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('적용'))
      ?.trigger('click')
    await flushPromises()

    expect(showErrorMock).toHaveBeenCalledWith(
      '현재 월에 확정된 근무표가 있어 직원 정보를 적용할 수 없습니다.'
    )
    expect(dialogMock.warning).not.toHaveBeenCalled()
    expect(applyEmployeeImportMock).not.toHaveBeenCalled()
  })

  it('falls back to the latest schedule when the stored schedule id is stale before apply confirmation', async () => {
    getScheduleStatusMock.mockResolvedValueOnce(null)
    getLatestScheduleByOrganizationMonthMock.mockResolvedValue({
      id: 'schedule-456',
      organization_id: 'org-1',
      month: '2025-12',
      status: 'complete',
      hard_score: null,
      soft_score: null,
      solver_execution_id: null,
      created_at: '2025-12-01T00:00:00Z',
      updated_at: '2025-12-01T00:00:00Z',
    })
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-456',
      selectedVersionId: 'version-9',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        {
          id: 'version-9',
          scheduleId: 'schedule-456',
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
          isSelected: true,
          isFinalized: false,
        },
      ],
    })

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('저장'))
      ?.trigger('click')
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('적용'))
      ?.trigger('click')
    await flushPromises()

    expect(getScheduleStatusMock).toHaveBeenCalledWith('schedule-123')
    expect(getLatestScheduleByOrganizationMonthMock).toHaveBeenCalledWith('org-1', '2025-12')
    expect(getPhase2ScheduleCompareMock).toHaveBeenCalledWith('schedule-456')
    expect(dialogMock.warning).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '직원 정보 적용 확인',
        content: '현재 월의 근무표와 버전이 모두 삭제됩니다. 계속 적용하시겠습니까?',
      })
    )
  })
})
