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
      rankCode: null,
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
        rankCode: null,
      },
    ]
    scheduleStoreMock.currentStep = 3
    authStoreMock.user = {
      id: 'user-1',
    }

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

    const eqMock = vi.fn().mockResolvedValue({ count: 1, error: null })
    const orderMock = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    })

    supabaseFromMock.mockImplementation((table: string) => {
      if (table === 'employees') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: orderMock,
            }),
          }),
        }
      }

      return {
        select: vi.fn().mockReturnValue({
          eq: eqMock,
        }),
      }
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

    ;(window as typeof window & { $dialog?: typeof dialogMock }).$dialog = dialogMock
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
    expect(wrapper.text()).toContain('저장')
  })

  it('shows save only on normal entry and removes previous/apply CTAs', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('저장')
    expect(wrapper.text()).not.toContain('근무표 관리로 돌아가기')
    expect(wrapper.text()).not.toContain('이전')
    expect(wrapper.text()).not.toContain('적용')
  })

  it('shows dashboard return plus save only on dashboard entry', async () => {
    routeQueryMock.from = 'dashboard'

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('저장')
    expect(wrapper.text()).toContain('근무표 관리로 돌아가기')
    expect(wrapper.text()).not.toContain('이전')
    expect(wrapper.text()).not.toContain('적용')
  })

  it('shows an info message instead of saving when nothing changed', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    const saveButton = wrapper.findAll('button').find((button) => button.text() === '저장')
    expect(saveButton).toBeTruthy()
    await saveButton!.trigger('click')
    await flushPromises()

    expect(showInfoMock).toHaveBeenCalledWith('변경된 데이터가 없습니다')
    expect(applyEmployeeImportMock).not.toHaveBeenCalled()
    expect(validateEmployeeImportMock).not.toHaveBeenCalled()
  })

  it('saves dirty employee changes without navigating to Step4', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    wrapper.vm.handleAddEmployee({
      employeeId: 'E002',
      name: 'Lee',
      availableShifts: ['D'],
      rankCode: null,
    })

    const saveButton = wrapper.findAll('button').find((button) => button.text() === '저장')
    expect(saveButton).toBeTruthy()
    await saveButton!.trigger('click')
    await flushPromises()

    expect(dialogMock.warning).toHaveBeenCalledTimes(1)
    expect(dialogMock.warning).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '직원 정보 저장 확인',
        positiveText: '저장',
        negativeText: '취소',
      })
    )

    const warningConfig = dialogMock.warning.mock.calls[0]?.[0] as {
      onPositiveClick?: () => Promise<void> | void
    }
    await warningConfig.onPositiveClick?.()
    await flushPromises()

    expect(applyEmployeeImportMock).toHaveBeenCalledWith({
      organizationId: 'org-1',
      month: '2025-12',
      employees: expect.arrayContaining([
        expect.objectContaining({
          employeeId: 'E001',
          name: 'Kim',
        }),
        expect.objectContaining({
          employeeId: 'E002',
          name: 'Lee',
        }),
      ]),
    })
    expect(setBasicInfoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleId: undefined,
        employeeCount: 2,
      })
    )
    expect(setSelectedVersionIdMock).toHaveBeenCalledWith(null)
    expect(setPreviewVersionIdMock).toHaveBeenCalledWith(null)
    expect(scheduleStoreMock.nextStep).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
    expect(showSuccessMock).toHaveBeenCalledWith('직원 정보가 저장되었습니다.')
    expect(validateEmployeeImportMock).not.toHaveBeenCalled()
  })

  it('shows a no-op info message when saving again without additional edits', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    wrapper.vm.handleAddEmployee({
      employeeId: 'E002',
      name: 'Lee',
      availableShifts: ['D'],
      rankCode: null,
    })

    const saveButton = wrapper.findAll('button').find((button) => button.text() === '저장')
    expect(saveButton).toBeTruthy()
    await saveButton!.trigger('click')
    await flushPromises()

    const warningConfig = dialogMock.warning.mock.calls[0]?.[0] as {
      onPositiveClick?: () => Promise<void> | void
    }
    await warningConfig.onPositiveClick?.()
    await flushPromises()

    await saveButton!.trigger('click')
    await flushPromises()

    expect(applyEmployeeImportMock).toHaveBeenCalledTimes(1)
    expect(showInfoMock).toHaveBeenCalledWith('변경된 데이터가 없습니다')
  })

  it('returns to the dashboard immediately when nothing changed', async () => {
    routeQueryMock.from = 'dashboard'

    const wrapper = createWrapper()
    await flushPromises()

    const returnButton = wrapper.findAll('button').find((button) =>
      button.text().includes('근무표 관리로 돌아가기')
    )
    expect(returnButton).toBeTruthy()

    await returnButton!.trigger('click')
    await flushPromises()

    expect(scheduleStoreMock.reset).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith('/')
  })

  it('blocks dashboard return when there are unsaved changes', async () => {
    routeQueryMock.from = 'dashboard'

    const wrapper = createWrapper()
    await flushPromises()

    wrapper.vm.handleAddEmployee({
      employeeId: 'E002',
      name: 'Lee',
      availableShifts: ['D'],
      rankCode: null,
    })

    const returnButton = wrapper.findAll('button').find((button) =>
      button.text().includes('근무표 관리로 돌아가기')
    )
    expect(returnButton).toBeTruthy()

    await returnButton!.trigger('click')
    await flushPromises()

    expect(showInfoMock).toHaveBeenCalledWith('변경된 데이터가 있습니다. 저장 후 진행하세요')
    expect(scheduleStoreMock.reset).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('blocks save when dirty data leaves zero employees', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    wrapper.vm.handleDeleteEmployee(0)

    const saveButton = wrapper.findAll('button').find((button) => button.text() === '저장')
    expect(saveButton).toBeTruthy()
    await saveButton!.trigger('click')
    await flushPromises()

    expect(showWarningMock).toHaveBeenCalledWith('최소 1명 이상의 직원을 등록해주세요.')
    expect(dialogMock.warning).not.toHaveBeenCalled()
    expect(applyEmployeeImportMock).not.toHaveBeenCalled()
  })

  it('treats DB-preloaded employees as unchanged baseline data', async () => {
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

    const saveButton = wrapper.findAll('button').find((button) => button.text() === '저장')
    expect(saveButton).toBeTruthy()
    await saveButton!.trigger('click')
    await flushPromises()

    expect(showInfoMock).toHaveBeenCalledWith('변경된 데이터가 없습니다')
    expect(applyEmployeeImportMock).not.toHaveBeenCalled()
  })

  it('blocks finalized month on the save path before showing the confirm dialog', async () => {
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-123',
      selectedVersionId: 'version-final',
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

    wrapper.vm.handleAddEmployee({
      employeeId: 'E002',
      name: 'Lee',
      availableShifts: ['D'],
      rankCode: null,
    })

    const saveButton = wrapper.findAll('button').find((button) => button.text() === '저장')
    expect(saveButton).toBeTruthy()
    await saveButton!.trigger('click')
    await flushPromises()

    expect(showErrorMock).toHaveBeenCalledWith(
      '현재 월에 확정된 근무표가 있어 직원 정보를 저장할 수 없습니다.'
    )
    expect(dialogMock.warning).not.toHaveBeenCalled()
    expect(applyEmployeeImportMock).not.toHaveBeenCalled()
  })
})
