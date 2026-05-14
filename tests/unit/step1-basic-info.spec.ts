import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

const {
  pushMock,
  createScheduleMock,
  setBasicInfoMock,
  loadOrganizationMock,
  supabaseFromMock,
  fetchMock,
  messageMock,
  routeQueryMock,
  getOrganizationProfileMock,
  updateOrganizationProfileMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  createScheduleMock: vi.fn(),
  setBasicInfoMock: vi.fn(),
  loadOrganizationMock: vi.fn(),
  supabaseFromMock: vi.fn(),
  fetchMock: vi.fn(),
  routeQueryMock: {} as Record<string, string>,
  getOrganizationProfileMock: vi.fn(),
  updateOrganizationProfileMock: vi.fn(),
  messageMock: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
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
  createSchedule: createScheduleMock,
}))

vi.mock('@/api/supabase', () => ({
  supabase: {
    from: supabaseFromMock,
  },
}))

vi.mock('@/api/ops', () => ({
  getOrganizationProfile: getOrganizationProfileMock,
  updateOrganizationProfile: updateOrganizationProfileMock,
}))

vi.mock('@/stores/schedule', () => ({
  useScheduleStore: () => scheduleStoreMock,
}))

vi.mock('@/stores/organization', () => ({
  useOrganizationStore: () => organizationStoreMock,
}))

const scheduleStoreMock = reactive({
  basicInfo: {
    month: '2025-12',
    organizationId: 'org-1',
    organizationName: '서울병원',
    organizationType: 'hospital',
    employeeCount: 12,
    shifts: [],
  },
  currentStep: 1,
  setBasicInfo: setBasicInfoMock,
})

const organizationStoreMock = reactive({
  current: {
    id: 'org-1',
    name: '서울병원',
    type: 'hospital',
  },
  shifts: [
    {
      id: 'shift-1',
      organizationId: 'org-1',
      code: 'D',
      name: 'Day',
      colorCode: '#123456',
      startTime: '09:00:00',
      endTime: '18:00:00',
      createdAt: '2025-01-01T00:00:00Z',
    },
  ],
  loadOrganization: loadOrganizationMock,
})

vi.mock('@/components/schedule/StepIndicator.vue', () => ({
  default: {
    template: '<div />',
  },
}))

vi.mock('@/components/schedule/ShiftManager.vue', () => ({
  default: {
    template: '<div />',
  },
}))

import Step1BasicInfo from '@/views/schedule/Step1BasicInfo.vue'

describe('Step1BasicInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    Object.keys(routeQueryMock).forEach((key) => {
      delete routeQueryMock[key]
    })
    loadOrganizationMock.mockResolvedValue({ success: true })
    getOrganizationProfileMock.mockResolvedValue({
      organizationId: 'org-1',
      name: '서울병원',
      type: 'hospital',
    })
    updateOrganizationProfileMock.mockResolvedValue({
      organizationId: 'org-1',
      name: '서울병원',
      type: 'hospital',
    })
    scheduleStoreMock.basicInfo = {
      month: '2025-12',
      organizationId: 'org-1',
      organizationName: '서울병원',
      organizationType: 'hospital',
      employeeCount: 12,
      shifts: [],
    }
    scheduleStoreMock.currentStep = 1
    organizationStoreMock.current = {
      id: 'org-1',
      name: '서울병원',
      type: 'hospital',
    }
    organizationStoreMock.shifts = [
      {
        id: 'shift-1',
        organizationId: 'org-1',
        code: 'D',
        name: 'Day',
        colorCode: '#123456',
        startTime: '09:00:00',
        endTime: '18:00:00',
        createdAt: '2025-01-01T00:00:00Z',
      },
    ]
    ;(window as typeof window & { $message?: typeof messageMock }).$message = messageMock
  })

  it('advances to Step 2 without creating a schedule row and keeps scheduleId optional', async () => {
    const wrapper = mount(Step1BasicInfo, {
      global: {
        stubs: {
          NCard: {
            template: '<div><slot /></div>',
          },
          NSpace: {
            template: '<div><slot /></div>',
          },
          NButton: {
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          NAlert: {
            template: '<div><slot /></div>',
          },
          NDataTable: {
            template: '<div />',
          },
          NPopconfirm: {
            template: '<div><slot name="trigger" /></div>',
          },
        },
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text().includes('다음 단계'))?.trigger('click')
    await flushPromises()

    expect(createScheduleMock).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(supabaseFromMock).not.toHaveBeenCalled()
    expect(setBasicInfoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        month: '2025-12',
        organizationId: 'org-1',
        organizationName: '서울병원',
        organizationType: 'hospital',
        employeeCount: 12,
        shifts: expect.arrayContaining([
          expect.objectContaining({
            code: 'D',
            startTime: '09:00:00',
            endTime: '18:00:00',
          }),
        ]),
      })
    )

    const payload = setBasicInfoMock.mock.calls[0]?.[0]
    expect(payload).not.toHaveProperty('scheduleId')
    expect(scheduleStoreMock.currentStep).toBe(2)
    expect(pushMock).toHaveBeenCalledWith('/app/schedule/step2')
    expect(messageMock.success).toHaveBeenCalledWith('기본 정보가 저장되었습니다.')
  })

  it('preserves an existing scheduleId when editing an existing schedule', async () => {
    scheduleStoreMock.basicInfo = {
      scheduleId: 'schedule-123',
      month: '2025-12',
      organizationId: 'org-1',
      organizationName: '서울병원',
      organizationType: 'hospital',
      employeeCount: 12,
      shifts: [],
    }

    const wrapper = mount(Step1BasicInfo, {
      global: {
        stubs: {
          NCard: {
            template: '<div><slot /></div>',
          },
          NSpace: {
            template: '<div><slot /></div>',
          },
          NButton: {
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          NAlert: {
            template: '<div><slot /></div>',
          },
          NDataTable: {
            template: '<div />',
          },
          NPopconfirm: {
            template: '<div><slot name="trigger" /></div>',
          },
        },
      },
    })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text().includes('다음 단계'))?.trigger('click')
    await flushPromises()

    expect(createScheduleMock).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(supabaseFromMock).not.toHaveBeenCalled()
    expect(setBasicInfoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleId: 'schedule-123',
        month: '2025-12',
      })
    )
    expect(messageMock.success).toHaveBeenCalledWith('기존 스케줄 정보를 유지하고 다음 단계로 이동합니다.')
  })

  it('opens setup mode without a selected month and continues to Step 2 setup after confirming hospital info', async () => {
    routeQueryMock.context = 'setup'
    scheduleStoreMock.basicInfo = null

    const wrapper = mount(Step1BasicInfo, {
      global: {
        stubs: {
          NCard: {
            template: '<div><slot /></div>',
          },
          NSpace: {
            template: '<div><slot /></div>',
          },
          NButton: {
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          NAlert: {
            template: '<div><slot /></div>',
          },
          NDataTable: {
            template: '<div />',
          },
          NPopconfirm: {
            template: '<div><slot name="trigger" /></div>',
          },
          OrganizationProfileForm: {
            template: '<div data-test="organization-profile-form-stub" />',
          },
          StepIndicator: {
            template: '<div data-test="step-indicator" />',
          },
        },
      },
    })

    await flushPromises()

    expect(loadOrganizationMock.mock.calls[0]).toEqual([])
    expect(pushMock).not.toHaveBeenCalledWith('/app')
    expect(wrapper.find('[data-test="step-indicator"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('처음 근무표를 만들기 전에')
    expect(wrapper.text()).toContain('계획월은 나중에 새 근무표를 만들 때 선택합니다.')

    await wrapper.findAll('button').find((button) => button.text().includes('다음'))?.trigger('click')
    await flushPromises()

    expect(updateOrganizationProfileMock).toHaveBeenCalledWith({
      organizationId: 'org-1',
      name: '서울병원',
      type: 'hospital',
    })
    expect(setBasicInfoMock).not.toHaveBeenCalled()
    expect(pushMock).toHaveBeenCalledWith({
      path: '/app/schedule/step2',
      query: {
        context: 'setup',
      },
    })
  })
})
