import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  pushMock,
  getScheduleStatusMock,
  getPhase2ScheduleCompareMock,
  deleteOrganizationEmployeesMock,
  createEmployeesBatchMock,
  supabaseFromMock,
  messageMock,
  setBasicInfoMock,
  setSelectedVersionIdMock,
  setPreviewVersionIdMock,
  showErrorMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  getScheduleStatusMock: vi.fn(),
  getPhase2ScheduleCompareMock: vi.fn(),
  deleteOrganizationEmployeesMock: vi.fn(),
  createEmployeesBatchMock: vi.fn(),
  supabaseFromMock: vi.fn(),
  messageMock: {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
  setBasicInfoMock: vi.fn(),
  setSelectedVersionIdMock: vi.fn(),
  setPreviewVersionIdMock: vi.fn(),
  showErrorMock: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

vi.mock('@/api/schedule', () => ({
  getScheduleStatus: getScheduleStatusMock,
  getPhase2ScheduleCompare: getPhase2ScheduleCompareMock,
}))

vi.mock('@/api/employee', () => ({
  deleteOrganizationEmployees: deleteOrganizationEmployeesMock,
  createEmployeesBatch: createEmployeesBatchMock,
}))

vi.mock('@/api/supabase', () => ({
  supabase: {
    from: supabaseFromMock,
  },
}))

vi.mock('@/utils/message', () => ({
  showError: showErrorMock,
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

vi.mock('@/stores/schedule', () => ({
  useScheduleStore: () => scheduleStoreMock,
}))

vi.mock('@/stores/organization', () => ({
  useOrganizationStore: () => organizationStoreMock,
}))

vi.mock('@/components/schedule/StepIndicator.vue', () => ({
  default: { template: '<div />' },
}))

vi.mock('@/components/schedule/EmployeeTable.vue', () => ({
  default: { template: '<div />' },
}))

vi.mock('@/components/schedule/EmployeeExcelUpload.vue', () => ({
  default: { template: '<div />' },
}))

import Step3EmployeeInfo from '@/views/schedule/Step3EmployeeInfo.vue'

function createWrapper() {
  return mount(Step3EmployeeInfo, {
    global: {
      stubs: {
        NCard: { template: '<div><slot /></div>' },
        NButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
        NAlert: { template: '<div><slot /></div>' },
        NTabs: { template: '<div><slot /></div>' },
        NTabPane: { template: '<div><slot /></div>' },
        NPopconfirm: { template: '<div><slot name="trigger" /></div>' },
      },
    },
  })
}

describe('Step3EmployeeInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

    getScheduleStatusMock.mockResolvedValue({
      id: 'schedule-123',
      status: 'complete',
    })
    getPhase2ScheduleCompareMock.mockResolvedValue({
      scheduleId: 'schedule-123',
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      versions: [
        {
          id: 'version-1',
          scheduleId: 'schedule-123',
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
  })

  it('navigates to Step5 with a resolved preview query for existing schedules', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.findAll('button').find((button) => button.text().includes('다음 단계'))?.trigger('click')
    await flushPromises()

    expect(getScheduleStatusMock).toHaveBeenCalledWith('schedule-123')
    expect(getPhase2ScheduleCompareMock).toHaveBeenCalledWith('schedule-123')
    expect(setSelectedVersionIdMock).toHaveBeenCalledWith('version-2')
    expect(setPreviewVersionIdMock).toHaveBeenCalledWith('version-2')
    expect(pushMock).toHaveBeenCalledWith({
      path: '/schedule/step5/schedule-123',
      query: {
        version: 'version-2',
      },
    })
  })

  it('blocks Step5 entry and shows an error when compare fails', async () => {
    getPhase2ScheduleCompareMock.mockRejectedValue(new Error('compare failed'))

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.findAll('button').find((button) => button.text().includes('다음 단계'))?.trigger('click')
    await flushPromises()

    expect(getPhase2ScheduleCompareMock).toHaveBeenCalledWith('schedule-123')
    expect(showErrorMock).toHaveBeenCalledWith('선택한 근무표 버전을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.')
    expect(pushMock).not.toHaveBeenCalledWith('/schedule/step5/schedule-123')
  })
})
