import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

const {
  pushMock,
  replaceSiteRequirementsMock,
  loadSiteRequirementsMock,
  showErrorMock,
  showSuccessMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceSiteRequirementsMock: vi.fn(),
  loadSiteRequirementsMock: vi.fn(),
  showErrorMock: vi.fn(),
  showSuccessMock: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

vi.mock('@/api/employee', () => ({
  replaceSiteRequirements: replaceSiteRequirementsMock,
  loadSiteRequirements: loadSiteRequirementsMock,
  replaceCanonicalSiteRequirements: replaceSiteRequirementsMock,
  loadCanonicalSiteRequirements: loadSiteRequirementsMock,
}))

vi.mock('@/utils/message', () => ({
  showError: showErrorMock,
  showSuccess: showSuccessMock,
}))

const scheduleStoreMock = reactive({
  basicInfo: {
    month: '2025-12',
    organizationId: 'org-1',
    organizationName: '서울병원',
    organizationType: 'hospital',
    employeeCount: 10,
    shifts: [
      { code: 'D', name: 'Day', colorCode: '#111111' },
      { code: 'E', name: 'Evening', colorCode: '#222222' },
      { code: 'N', name: 'Night', colorCode: '#333333' },
      { code: 'O', name: 'Off', colorCode: '#444444' },
    ],
  },
  siteRequirements: [] as Array<{ dayOfWeek: number; dayName: string; shiftCode: string; requiredCount: number }>,
  currentStep: 2,
  prevStep: vi.fn(() => {
    scheduleStoreMock.currentStep -= 1
  }),
  nextStep: vi.fn(() => {
    scheduleStoreMock.currentStep += 1
  }),
  setSiteRequirements: vi.fn((requirements) => {
    scheduleStoreMock.siteRequirements = requirements
  }),
})

const organizationStoreMock = reactive({
  foundationSites: [],
  shifts: [
    { code: 'D', name: 'Day', colorCode: '#111111' },
    { code: 'E', name: 'Evening', colorCode: '#222222' },
    { code: 'N', name: 'Night', colorCode: '#333333' },
    { code: 'O', name: 'Off', colorCode: '#444444' },
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

import Step2SiteInfo from '@/views/schedule/Step2SiteInfo.vue'

function createWrapper() {
  return mount(Step2SiteInfo, {
    global: {
      stubs: {
        NCard: { template: '<div><slot /></div>' },
        NButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
        NAlert: { template: '<div><slot /></div>' },
        NInputNumber: { template: '<div />' },
        NPopconfirm: { template: '<div><slot name="trigger" /></div>' },
      },
    },
  })
}

describe('Step2SiteInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    scheduleStoreMock.siteRequirements = []
    scheduleStoreMock.currentStep = 2
    organizationStoreMock.foundationSites = []
    loadSiteRequirementsMock.mockResolvedValue([])
    replaceSiteRequirementsMock.mockResolvedValue(undefined)
  })

  it('initializes all shift requirements to zero by default', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.vm.getRequirement(1, 'D')).toBe(0)
    expect(wrapper.vm.getRequirement(1, 'E')).toBe(0)
    expect(wrapper.vm.getRequirement(1, 'N')).toBe(0)
    expect(wrapper.vm.getDayTotal(1)).toBe(0)
  })

  it('normalizes invalid inputs to non-negative integers', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    wrapper.vm.setRequirement(1, 'D', 1.9)
    wrapper.vm.setRequirement(1, 'E', -3)
    wrapper.vm.setRequirement(1, 'N', null)

    expect(wrapper.vm.getRequirement(1, 'D')).toBe(1)
    expect(wrapper.vm.getRequirement(1, 'E')).toBe(0)
    expect(wrapper.vm.getRequirement(1, 'N')).toBe(0)
  })

  it('blocks save when any day total is zero', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    const nextButton = wrapper.findAll('button').find((button) => button.text().includes('다음 단계'))
    expect(nextButton).toBeTruthy()
    await nextButton!.trigger('click')
    await flushPromises()

    expect(replaceSiteRequirementsMock).not.toHaveBeenCalled()
    expect(showErrorMock).toHaveBeenCalledWith('월요일 요일의 총 필요 인원은 1명 이상이어야 합니다.')
  })

  it('saves when every day total is at least one', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    for (const day of [1, 2, 3, 4, 5, 6, 0]) {
      wrapper.vm.setRequirement(day, 'D', 1)
      wrapper.vm.setRequirement(day, 'E', 0)
      wrapper.vm.setRequirement(day, 'N', 0)
    }

    const nextButton = wrapper.findAll('button').find((button) => button.text().includes('다음 단계'))
    expect(nextButton).toBeTruthy()
    await nextButton!.trigger('click')
    await flushPromises()

    expect(replaceSiteRequirementsMock).toHaveBeenCalledTimes(1)
    expect(scheduleStoreMock.nextStep).toHaveBeenCalled()
    expect(pushMock).toHaveBeenCalledWith('/schedule/step3')
    expect(showSuccessMock).toHaveBeenCalledWith('요일별 인력이 저장되었습니다.')
  })

  it('shows the primary site context while still reading and writing canonical site_requirements', async () => {
    organizationStoreMock.foundationSites = [
      {
        id: 'site-1',
        organizationId: 'org-1',
        code: 'MAIN',
        name: '본관',
        isActive: true,
        isScheduleActive: true,
      },
    ]

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('현재 스케줄 대상 사이트: 본관 (MAIN)')
    expect(loadSiteRequirementsMock).toHaveBeenCalledWith('org-1')

    for (const day of [1, 2, 3, 4, 5, 6, 0]) {
      wrapper.vm.setRequirement(day, 'D', 1)
    }

    const nextButton = wrapper.findAll('button').find((button) => button.text().includes('다음 단계'))
    expect(nextButton).toBeTruthy()
    await nextButton!.trigger('click')
    await flushPromises()

    expect(replaceSiteRequirementsMock).toHaveBeenCalledTimes(1)
    expect(replaceSiteRequirementsMock).toHaveBeenCalledWith(
      'org-1',
      expect.arrayContaining([
        expect.objectContaining({
          dayOfWeek: 1,
          shiftCode: 'D',
          requiredCount: 1,
        }),
      ])
    )
  })
})
