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
  replaceOrganizationRosterMock,
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
  routeQueryMock: {} as { from?: string; entry?: string; context?: string },
  getScheduleStatusMock: vi.fn(),
  getLatestScheduleByOrganizationMonthMock: vi.fn(),
  getPhase2ScheduleCompareMock: vi.fn(),
  validateEmployeeImportMock: vi.fn(),
  applyEmployeeImportMock: vi.fn(),
  replaceOrganizationRosterMock: vi.fn(),
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
  replaceOrganizationRoster: replaceOrganizationRosterMock,
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
  default: { name: 'StepIndicator', template: '<div data-test="step-indicator" />' },
}))

vi.mock('@/components/schedule/EmployeeTable.vue', () => ({
  default: {
    name: 'EmployeeTable',
    template:
      '<div data-test="employee-table"><button data-test="employee-table-add" @click="$emit(\'add\', { employeeId: \'E002\', name: \'Lee\', availableShifts: [\'D\'], rankCode: null })">add</button></div>',
  },
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
    delete routeQueryMock.entry
    delete routeQueryMock.context
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
    organizationStoreMock.current = {
      id: 'org-1',
      name: '서울병원',
      type: 'hospital',
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
    replaceOrganizationRosterMock.mockResolvedValue({
      organizationId: 'org-1',
      employeeCount: 2,
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

  it('shows previous, save, and next-step CTAs on normal entry', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('저장')
    expect(wrapper.text()).toContain('다음 단계')
    expect(wrapper.text()).toContain('이전')
    expect(wrapper.text()).not.toContain('근무표 관리로 돌아가기')
    expect(wrapper.text()).not.toContain('적용')
  })

  it('shows dashboard return, save, and next-step on dashboard entry', async () => {
    routeQueryMock.from = 'dashboard'

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('저장')
    expect(wrapper.text()).toContain('다음 단계')
    expect(wrapper.text()).toContain('근무표 관리로 돌아가기')
    expect(wrapper.text()).not.toContain('이전')
    expect(wrapper.text()).not.toContain('적용')
  })

  it('renders setup-mode copy without redirecting when basic info is missing', async () => {
    routeQueryMock.context = 'setup'
    scheduleStoreMock.basicInfo = null

    const wrapper = createWrapper()
    await flushPromises()

    expect(pushMock).not.toHaveBeenCalledWith('/schedule/step1')
    expect(wrapper.vm.pageTitle).toBe('운영 준비 - 직원 기준 설정')
    expect(wrapper.text()).toContain('조직의 직원 기본 정보를 관리합니다.')
    expect(wrapper.text()).toContain('대시보드로 돌아가기')
    expect(wrapper.text()).toContain('저장 후 대시보드로 이동')
    expect(wrapper.text()).not.toContain('이전')
    expect(wrapper.text()).not.toContain('이 단계는 저장만 해도 되고')
    expect(wrapper.findComponent({ name: 'StepIndicator' }).exists()).toBe(false)
  })

  it('uses the current organization context in setup mode before stale wizard basicInfo', async () => {
    routeQueryMock.context = 'setup'
    scheduleStoreMock.basicInfo = {
      scheduleId: 'schedule-stale',
      month: '2025-12',
      organizationId: 'org-stale',
      organizationName: '이전 조직',
      organizationType: 'hospital',
      employeeCount: 1,
      shifts: [],
    }
    organizationStoreMock.current = {
      id: 'org-current',
      name: '현재 조직',
      type: 'hospital',
    }

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

    expect(replaceOrganizationRosterMock).toHaveBeenCalledWith({
      organizationId: 'org-current',
      employees: expect.any(Array),
    })
    expect(replaceOrganizationRosterMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-stale',
      })
    )
  })

  it('fails closed in setup mode when current and foundation org context are missing', async () => {
    routeQueryMock.context = 'setup'
    scheduleStoreMock.basicInfo = {
      scheduleId: 'schedule-stale',
      month: '2025-12',
      organizationId: 'org-stale',
      organizationName: '이전 조직',
      organizationType: 'hospital',
      employeeCount: 1,
      shifts: [],
    }
    organizationStoreMock.current = null
    organizationStoreMock.foundationSite = null

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

    expect(showErrorMock).toHaveBeenCalledWith('조직 정보를 찾을 수 없습니다. 다시 시도해주세요.')
    expect(dialogMock.warning).not.toHaveBeenCalled()
    expect(replaceOrganizationRosterMock).not.toHaveBeenCalled()
    expect(replaceOrganizationRosterMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-stale',
      })
    )
  })

  it('uses current organization shifts in setup mode instead of stale wizard shifts', async () => {
    routeQueryMock.context = 'setup'
    scheduleStoreMock.basicInfo = {
      scheduleId: 'schedule-stale',
      month: '2025-12',
      organizationId: 'org-stale',
      organizationName: '이전 조직',
      organizationType: 'hospital',
      employeeCount: 1,
      shifts: [
        {
          id: 'shift-stale',
          code: 'N',
          name: 'Night',
          colorCode: '#000000',
          startTime: '22:00:00',
          endTime: '07:00:00',
        },
      ],
    }
    organizationStoreMock.current = {
      id: 'org-current',
      name: '현재 조직',
      type: 'hospital',
    }
    organizationStoreMock.shifts = [
      {
        id: 'shift-current',
        code: 'D',
        name: 'Day',
        colorCode: '#123456',
        startTime: '09:00:00',
        endTime: '18:00:00',
      },
    ]

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.vm.shifts).toEqual([
      expect.objectContaining({
        id: 'shift-current',
        code: 'D',
        name: 'Day',
      }),
    ])
    expect(wrapper.vm.shifts).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'shift-stale',
          code: 'N',
        }),
      ])
    )
  })

  it('routes setup-mode primary CTA back to the dashboard when nothing changed', async () => {
    routeQueryMock.context = 'setup'
    scheduleStoreMock.basicInfo = null

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-test="setup-action-bar"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="dashboard-return-button"]').text()).toContain('대시보드로 돌아가기')
    expect(wrapper.find('[data-test="page-action-bar-left"]').text()).toContain('대시보드로 돌아가기')
    expect(wrapper.find('[data-test="page-action-bar-right"]').text()).toContain('저장')
    expect(wrapper.findAll('[data-test="dashboard-return-button"]')).toHaveLength(1)

    const nextButton = wrapper.findAll('button').find((button) =>
      button.text().includes('저장 후 대시보드로 이동')
    )
    expect(nextButton).toBeTruthy()

    await nextButton!.trigger('click')
    await flushPromises()

    expect(showInfoMock).not.toHaveBeenCalledWith('변경된 데이터가 없습니다')
    expect(scheduleStoreMock.setEmployees).not.toHaveBeenCalledWith([])
    expect(pushMock).toHaveBeenCalledWith('/app')
    expect(pushMock).not.toHaveBeenCalledWith('/app/schedule/step4')
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

  it('uses setup-mode save confirmation language for org-wide employee changes', async () => {
    routeQueryMock.context = 'setup'

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

    expect(dialogMock.warning).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '직원 기준 저장 확인',
      })
    )
  })

  it('saves setup-mode employee changes without navigating away from Step3', async () => {
    routeQueryMock.context = 'setup'
    scheduleStoreMock.basicInfo = null

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

    expect(dialogMock.warning).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '직원 기준 저장 확인',
      })
    )

    const warningConfig = dialogMock.warning.mock.calls[0]?.[0] as {
      onPositiveClick?: () => Promise<void> | void
    }
    await warningConfig.onPositiveClick?.()
    await flushPromises()

    expect(showErrorMock).not.toHaveBeenCalledWith('기본 정보가 없습니다. 다시 시도해주세요.')
    expect(replaceOrganizationRosterMock).toHaveBeenCalledWith({
      organizationId: 'org-1',
      employees: expect.arrayContaining([
        expect.objectContaining({
          employeeId: 'E002',
          name: 'Lee',
        }),
      ]),
    })
    expect(applyEmployeeImportMock).not.toHaveBeenCalled()
    expect(scheduleStoreMock.setEmployees).toHaveBeenCalled()
    expect(showSuccessMock).toHaveBeenCalledWith('직원 기본 정보가 저장되었습니다.')
    expect(pushMock).not.toHaveBeenCalledWith('/schedule/step1')
    expect(pushMock).not.toHaveBeenCalledWith('/schedule/step4')
  })

  it('keeps setup-mode baseline clean when employee preload fails', async () => {
    routeQueryMock.context = 'setup'
    scheduleStoreMock.basicInfo = null

    supabaseFromMock.mockImplementation((table: string) => {
      if (table === 'employees') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('employee preload failed'),
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
    expect(dialogMock.warning).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('routes setup-mode primary CTA to the dashboard after saving', async () => {
    routeQueryMock.context = 'setup'
    scheduleStoreMock.basicInfo = null

    const wrapper = createWrapper()
    await flushPromises()

    wrapper.vm.handleAddEmployee({
      employeeId: 'E002',
      name: 'Lee',
      availableShifts: ['D'],
      rankCode: null,
    })

    const nextButton = wrapper.findAll('button').find((button) =>
      button.text().includes('저장 후 대시보드로 이동')
    )
    expect(nextButton).toBeTruthy()
    await nextButton!.trigger('click')
    await flushPromises()

    expect(dialogMock.warning).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '직원 기준 저장 확인',
      })
    )

    const warningConfig = dialogMock.warning.mock.calls[0]?.[0] as {
      onPositiveClick?: () => Promise<void> | void
    }
    await warningConfig.onPositiveClick?.()
    await flushPromises()

    expect(showErrorMock).not.toHaveBeenCalledWith('기본 정보가 없습니다. 다시 시도해주세요.')
    expect(replaceOrganizationRosterMock).toHaveBeenCalledWith({
      organizationId: 'org-1',
      employees: expect.arrayContaining([
        expect.objectContaining({
          employeeId: 'E002',
          name: 'Lee',
        }),
      ]),
    })
    expect(applyEmployeeImportMock).not.toHaveBeenCalled()
    expect(scheduleStoreMock.setEmployees).toHaveBeenCalled()
    expect(showSuccessMock).toHaveBeenCalledWith('직원 기본 정보가 저장되었습니다.')
    expect(pushMock).toHaveBeenCalledWith('/app')
  })

  it('saves dirty employee changes without navigating to Step4', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    const addButton = wrapper.find('[data-test="employee-table-add"]')
    expect(addButton.exists()).toBe(true)
    await addButton.trigger('click')
    await flushPromises()

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

  it('moves to Step4 without a no-change message when nothing changed', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    const nextButton = wrapper.findAll('button').find((button) => button.text().includes('다음 단계'))
    expect(nextButton).toBeTruthy()
    await nextButton!.trigger('click')
    await flushPromises()

    expect(showInfoMock).not.toHaveBeenCalledWith('변경된 데이터가 없습니다')
    expect(applyEmployeeImportMock).not.toHaveBeenCalled()
    expect(scheduleStoreMock.nextStep).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith('/app/schedule/step4')
  })

  it('saves dirty employee changes and then moves to Step4 when next-step is clicked', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    wrapper.vm.handleAddEmployee({
      employeeId: 'E002',
      name: 'Lee',
      availableShifts: ['D'],
      rankCode: null,
    })

    const nextButton = wrapper.findAll('button').find((button) => button.text().includes('다음 단계'))
    expect(nextButton).toBeTruthy()
    await nextButton!.trigger('click')
    await flushPromises()

    expect(dialogMock.warning).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '직원 정보 저장 확인',
        positiveText: '저장',
      })
    )

    const warningConfig = dialogMock.warning.mock.calls[0]?.[0] as {
      onPositiveClick?: () => Promise<void> | void
    }
    await warningConfig.onPositiveClick?.()
    await flushPromises()

    expect(applyEmployeeImportMock).toHaveBeenCalledTimes(1)
    expect(scheduleStoreMock.nextStep).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith('/app/schedule/step4')
    expect(showSuccessMock).toHaveBeenCalledWith('직원 정보가 저장되었습니다.')
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
    expect(pushMock).toHaveBeenCalledWith('/app')
  })

  it('preserves the dashboard origin when moving to Step4', async () => {
    routeQueryMock.from = 'dashboard'

    const wrapper = createWrapper()
    await flushPromises()

    const nextButton = wrapper.findAll('button').find((button) => button.text().includes('다음 단계'))
    expect(nextButton).toBeTruthy()
    await nextButton!.trigger('click')
    await flushPromises()

    expect(scheduleStoreMock.nextStep).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith({
      path: '/app/schedule/step4',
      query: {
        from: 'dashboard',
      },
    })
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

  it('blocks finalized month on the next-step path before showing the confirm dialog', async () => {
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

    const nextButton = wrapper.findAll('button').find((button) => button.text().includes('다음 단계'))
    expect(nextButton).toBeTruthy()
    await nextButton!.trigger('click')
    await flushPromises()

    expect(showErrorMock).toHaveBeenCalledWith(
      '현재 월에 확정된 근무표가 있어 직원 정보를 저장할 수 없습니다.'
    )
    expect(dialogMock.warning).not.toHaveBeenCalled()
    expect(applyEmployeeImportMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })
})
