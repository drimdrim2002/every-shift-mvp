import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

const {
  pushMock,
  replaceSiteRequirementsMock,
  loadSiteRequirementsMock,
  showErrorMock,
  showInfoMock,
  showSuccessMock,
  routeQueryMock,
  updateSitesMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceSiteRequirementsMock: vi.fn(),
  loadSiteRequirementsMock: vi.fn(),
  showErrorMock: vi.fn(),
  showInfoMock: vi.fn(),
  showSuccessMock: vi.fn(),
  routeQueryMock: {} as Record<string, string>,
  updateSitesMock: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  useRoute: () => ({
    query: routeQueryMock,
  }),
}))

vi.mock('@/api/employee', () => ({
  replaceSiteRequirements: replaceSiteRequirementsMock,
  loadSiteRequirements: loadSiteRequirementsMock,
  replaceCanonicalSiteRequirements: replaceSiteRequirementsMock,
  loadCanonicalSiteRequirements: loadSiteRequirementsMock,
}))

vi.mock('@/api/ops', () => ({
  updateSites: updateSitesMock,
}))

vi.mock('@/api/shift', () => ({
  getSchedulingShifts: (shifts: Array<{ code: string; name: string; colorCode: string }>) => shifts,
}))

vi.mock('naive-ui', () => ({
  NCard: { template: '<div><slot /></div>' },
  NButton: { template: '<button v-bind="$attrs"><slot /></button>' },
  NAlert: { template: '<div><slot /></div>' },
  NInputNumber: {
    props: ['value'],
    emits: ['update:value'],
    template:
      '<input data-test="n-input-number" type="number" :value="value" @input="$emit(\'update:value\', Number($event.target.value))" />',
  },
  NPopconfirm: {
    template:
      '<div><slot name="trigger" /><button data-test="popconfirm-confirm" @click="$emit(\'positive-click\')">confirm</button><slot /></div>',
  },
}))

vi.mock('@/utils/message', () => ({
  showError: showErrorMock,
  showInfo: showInfoMock,
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
  reset: vi.fn(),
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
  foundationSite: null,
  shifts: [
    { code: 'D', name: 'Day', colorCode: '#111111' },
    { code: 'E', name: 'Evening', colorCode: '#222222' },
    { code: 'N', name: 'Night', colorCode: '#333333' },
    { code: 'O', name: 'Off', colorCode: '#444444' },
  ],
  updateFoundationSiteCache: vi.fn((site) => {
    organizationStoreMock.foundationSite = site
  }),
})

vi.mock('@/stores/schedule', () => ({
  useScheduleStore: () => scheduleStoreMock,
}))

vi.mock('@/stores/organization', () => ({
  useOrganizationStore: () => organizationStoreMock,
}))

vi.mock('@/components/schedule/StepIndicator.vue', () => ({
  default: { name: 'StepIndicator', template: '<div data-test="step-indicator" />' },
}))

vi.mock('@/components/ops/SiteFoundationForm.vue', () => ({
  default: {
    name: 'SiteFoundationForm',
    props: ['modelValue', 'saving', 'status', 'canSave'],
    emits: ['dirty-change', 'save'],
    template: '<div data-test="site-foundation-form-stub">근무표 기준 장소</div>',
  },
}))

import Step2SiteInfo from '@/views/schedule/Step2SiteInfo.vue'

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
  return mount(Step2SiteInfo, {
    global: {
      stubs: {},
    },
  })
}

function buildWeeklyRequirements(requiredCount: number) {
  return [1, 2, 3, 4, 5, 6, 0].flatMap((dayOfWeek) => [
    { dayOfWeek, dayName: '요일', shiftCode: 'D', requiredCount },
    { dayOfWeek, dayName: '요일', shiftCode: 'E', requiredCount: 0 },
    { dayOfWeek, dayName: '요일', shiftCode: 'N', requiredCount: 0 },
    { dayOfWeek, dayName: '요일', shiftCode: 'O', requiredCount: 0 },
  ])
}

describe('Step2SiteInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(routeQueryMock).forEach((key) => {
      delete routeQueryMock[key]
    })
    scheduleStoreMock.basicInfo = {
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
    }
    scheduleStoreMock.siteRequirements = []
    scheduleStoreMock.currentStep = 2
    organizationStoreMock.foundationSite = null
    organizationStoreMock.updateFoundationSiteCache.mockClear()
    organizationStoreMock.current = {
      id: 'org-1',
      name: '서울병원',
      type: 'hospital',
    }
    loadSiteRequirementsMock.mockResolvedValue([])
    replaceSiteRequirementsMock.mockResolvedValue(undefined)
    updateSitesMock.mockResolvedValue({
      organizationId: 'org-1',
      site: {
        id: 'site-1',
        organizationId: 'org-1',
        code: 'MAIN',
        name: '본관',
        isActive: true,
        isScheduleActive: true,
      },
    })
  })

  it('waits for the initial requirements preload before rendering the editable table', async () => {
    const requirementsDeferred = createDeferred<
      Array<{ dayOfWeek: number; dayName: string; shiftCode: string; requiredCount: number }>
    >()

    loadSiteRequirementsMock.mockReturnValue(requirementsDeferred.promise)

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.text()).toContain('요일별 필요 인력을 불러오는 중입니다.')

    requirementsDeferred.resolve([])
    await flushPromises()

    expect(wrapper.find('table').exists()).toBe(true)
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

    const inputs = wrapper.findAll('[data-test="n-input-number"]')
    expect(inputs.length).toBeGreaterThan(0)

    await inputs[0].setValue('1.9')
    await inputs[1].setValue('-3')
    await inputs[2].setValue('')
    await flushPromises()

    expect(wrapper.vm.getRequirement(1, 'D')).toBe(1)
    expect(wrapper.vm.getRequirement(1, 'E')).toBe(0)
    expect(wrapper.vm.getRequirement(1, 'N')).toBe(0)
  })

  it('blocks save with a validation error when changed data still leaves a day total at zero', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    wrapper.vm.setRequirement(1, 'D', 1)

    const saveButton = wrapper.findAll('button').find((button) => button.text() === '저장')
    expect(saveButton).toBeTruthy()
    await saveButton!.trigger('click')
    await flushPromises()

    expect(replaceSiteRequirementsMock).not.toHaveBeenCalled()
    expect(showErrorMock).toHaveBeenCalledWith('화요일 요일의 총 필요 인원은 1명 이상이어야 합니다.')
  })

  it('shows previous, save, and next-step CTAs on normal entry', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('저장')
    expect(wrapper.text()).toContain('다음 단계')
    expect(wrapper.text()).toContain('이전')
    expect(wrapper.text()).not.toContain('근무표 관리로 돌아가기')
  })

  it('renders setup-mode copy without the wizard indicator when basic info is missing', async () => {
    routeQueryMock.context = 'setup'
    scheduleStoreMock.basicInfo = null

    const wrapper = createWrapper()
    await flushPromises()

    expect(pushMock).not.toHaveBeenCalledWith('/schedule/step1')
    expect(wrapper.vm.pageTitle).toBe('운영 준비 - 기준 장소와 근무 기준 설정')
    expect(wrapper.text()).toContain('이 설정은 이번 달만이 아니라 조직의 기본값에 적용됩니다.')
    expect(wrapper.text()).toContain('근무표가 어느 장소를 기준으로 만들어지는지 먼저 정합니다.')
    expect(wrapper.find('[data-test="site-foundation-form-stub"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('대시보드로 돌아가기')
    expect(wrapper.text()).toContain('저장 후 직원 정보로 이동')
    expect(wrapper.find('[data-test="setup-action-bar"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="dashboard-return-button"]').text()).toContain('대시보드로 돌아가기')
    expect(wrapper.find('[data-test="page-action-bar-left"]').text()).toContain('대시보드로 돌아가기')
    expect(wrapper.find('[data-test="page-action-bar-right"]').text()).toContain('저장')
    expect(wrapper.findAll('[data-test="dashboard-return-button"]')).toHaveLength(1)
    expect(wrapper.text()).not.toContain('이전')
    expect(wrapper.text()).not.toContain('이 단계는 저장만 해도 되고')
    expect(wrapper.findComponent({ name: 'StepIndicator' }).exists()).toBe(false)
  })

  it('blocks setup-mode next step until the schedule site is saved', async () => {
    routeQueryMock.context = 'setup'
    scheduleStoreMock.basicInfo = null

    const wrapper = createWrapper()
    await flushPromises()

    const nextButton = wrapper.findAll('button').find((button) =>
      button.text().includes('저장 후 직원 정보로 이동')
    )
    expect(nextButton).toBeTruthy()
    await nextButton!.trigger('click')
    await flushPromises()

    expect(showErrorMock).toHaveBeenCalledWith('근무표 기준 장소를 먼저 저장해주세요.')
    expect(replaceSiteRequirementsMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('blocks setup-mode next step when saved site exists but every day total is still zero', async () => {
    routeQueryMock.context = 'setup'
    scheduleStoreMock.basicInfo = null
    organizationStoreMock.foundationSite = {
      id: 'site-1',
      organizationId: 'org-1',
      code: 'MAIN',
      name: '본관',
      isActive: true,
      isScheduleActive: true,
    }

    const wrapper = createWrapper()
    await flushPromises()

    const nextButton = wrapper.findAll('button').find((button) =>
      button.text().includes('저장 후 직원 정보로 이동')
    )
    expect(nextButton).toBeTruthy()
    await nextButton!.trigger('click')
    await flushPromises()

    expect(showErrorMock).toHaveBeenCalledWith('월요일 요일의 총 필요 인원은 1명 이상이어야 합니다.')
    expect(replaceSiteRequirementsMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('uses canonical defaults in setup mode when the database has no site requirements', async () => {
    routeQueryMock.context = 'setup'
    scheduleStoreMock.basicInfo = null
    scheduleStoreMock.siteRequirements = buildWeeklyRequirements(5)

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.vm.getRequirement(1, 'D')).toBe(0)
    expect(wrapper.vm.getRequirement(1, 'E')).toBe(0)
    expect(wrapper.vm.getRequirement(1, 'N')).toBe(0)
    expect(scheduleStoreMock.setSiteRequirements).not.toHaveBeenCalled()
  })

  it('uses the current organization context in setup mode before stale wizard basicInfo', async () => {
    routeQueryMock.context = 'setup'
    scheduleStoreMock.basicInfo = {
      month: '2025-12',
      organizationId: 'org-stale',
      organizationName: '이전병원',
      organizationType: 'hospital',
      employeeCount: 10,
      shifts: [
        { code: 'LEGACY', name: 'Legacy', colorCode: '#999999' },
      ],
    }
    organizationStoreMock.current = {
      id: 'org-current',
      name: '서울병원',
      type: 'hospital',
    }
    organizationStoreMock.foundationSite = {
      id: 'site-1',
      organizationId: 'org-foundation',
      code: 'MAIN',
      name: '본관',
      isActive: true,
      isScheduleActive: true,
    }
    organizationStoreMock.shifts = [
      { code: 'CUR', name: 'Current', colorCode: '#123456' },
    ]

    const wrapper = createWrapper()
    await flushPromises()

    expect(loadSiteRequirementsMock).toHaveBeenCalledWith('org-current')
    expect(wrapper.vm.shiftCodes).toEqual([
      {
        code: 'CUR',
        name: 'Current',
        colorCode: '#123456',
      },
    ])
  })

  it('saves setup-mode requirements to the current organization instead of stale wizard state', async () => {
    routeQueryMock.context = 'setup'
    scheduleStoreMock.basicInfo = {
      month: '2025-12',
      organizationId: 'org-stale',
      organizationName: '이전병원',
      organizationType: 'hospital',
      employeeCount: 10,
      shifts: [
        { code: 'LEGACY', name: 'Legacy', colorCode: '#999999' },
      ],
    }
    organizationStoreMock.current = {
      id: 'org-current',
      name: '서울병원',
      type: 'hospital',
    }
    organizationStoreMock.shifts = [
      { code: 'CUR', name: 'Current', colorCode: '#123456' },
    ]

    const wrapper = createWrapper()
    await flushPromises()

    for (const day of [1, 2, 3, 4, 5, 6, 0]) {
      wrapper.vm.setRequirement(day, 'CUR', 1)
    }

    const saveButton = wrapper.findAll('button').find((button) => button.text() === '저장')
    expect(saveButton).toBeTruthy()
    await saveButton!.trigger('click')
    await flushPromises()

    expect(replaceSiteRequirementsMock).toHaveBeenCalledWith(
      'org-current',
      expect.arrayContaining([
        expect.objectContaining({
          shiftCode: 'CUR',
          requiredCount: 1,
        }),
      ])
    )
  })

  it('shows an info message instead of saving when nothing changed', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    const saveButton = wrapper.findAll('button').find((button) => button.text() === '저장')
    expect(saveButton).toBeTruthy()
    await saveButton!.trigger('click')
    await flushPromises()

    expect(showInfoMock).toHaveBeenCalledWith('변경된 데이터가 없습니다')
    expect(replaceSiteRequirementsMock).not.toHaveBeenCalled()
    expect(showSuccessMock).not.toHaveBeenCalled()
  })

  it('saves when every day total is at least one without advancing to Step 3', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    for (const day of [1, 2, 3, 4, 5, 6, 0]) {
      wrapper.vm.setRequirement(day, 'D', 1)
      wrapper.vm.setRequirement(day, 'E', 0)
      wrapper.vm.setRequirement(day, 'N', 0)
    }

    const saveButton = wrapper.findAll('button').find((button) => button.text() === '저장')
    expect(saveButton).toBeTruthy()
    await saveButton!.trigger('click')
    await flushPromises()

    expect(replaceSiteRequirementsMock).toHaveBeenCalledTimes(1)
    expect(scheduleStoreMock.setSiteRequirements).toHaveBeenCalled()
    expect(scheduleStoreMock.nextStep).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
    expect(showSuccessMock).toHaveBeenCalledWith('요일별 인력이 저장되었습니다.')
  })

  it('moves to Step 3 without showing a no-change message when nothing changed', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    const nextButton = wrapper.findAll('button').find((button) => button.text().includes('다음 단계'))
    expect(nextButton).toBeTruthy()
    await nextButton!.trigger('click')
    await flushPromises()

    expect(showInfoMock).not.toHaveBeenCalledWith('변경된 데이터가 없습니다')
    expect(replaceSiteRequirementsMock).not.toHaveBeenCalled()
    expect(scheduleStoreMock.nextStep).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith('/app/schedule/step3')
  })

  it('saves dirty data and then moves to Step 3 when next-step is clicked', async () => {
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
    expect(scheduleStoreMock.setSiteRequirements).toHaveBeenCalled()
    expect(scheduleStoreMock.nextStep).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith('/app/schedule/step3')
    expect(showSuccessMock).toHaveBeenCalledWith('요일별 인력이 저장되었습니다.')
  })

  it('shows a no-op info message when saving again without additional edits', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    for (const day of [1, 2, 3, 4, 5, 6, 0]) {
      wrapper.vm.setRequirement(day, 'D', 1)
      wrapper.vm.setRequirement(day, 'E', 0)
      wrapper.vm.setRequirement(day, 'N', 0)
    }

    const saveButton = wrapper.findAll('button').find((button) => button.text() === '저장')
    expect(saveButton).toBeTruthy()

    await saveButton!.trigger('click')
    await flushPromises()
    expect(replaceSiteRequirementsMock).toHaveBeenCalledTimes(1)

    await saveButton!.trigger('click')
    await flushPromises()

    expect(replaceSiteRequirementsMock).toHaveBeenCalledTimes(1)
    expect(showInfoMock).toHaveBeenCalledWith('변경된 데이터가 없습니다')
  })

  it('keeps the dashboard return CTA and stays on Step 2 after save', async () => {
    routeQueryMock.from = 'dashboard'

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('근무표 관리로 돌아가기')

    for (const day of [1, 2, 3, 4, 5, 6, 0]) {
      wrapper.vm.setRequirement(day, 'D', 1)
      wrapper.vm.setRequirement(day, 'E', 0)
      wrapper.vm.setRequirement(day, 'N', 0)
    }

    const saveButton = wrapper.findAll('button').find((button) => button.text() === '저장')
    expect(saveButton).toBeTruthy()
    await saveButton!.trigger('click')
    await flushPromises()

    expect(pushMock).not.toHaveBeenCalled()
    expect(scheduleStoreMock.nextStep).not.toHaveBeenCalled()
  })

  it('preserves the dashboard origin when moving to Step 3', async () => {
    routeQueryMock.from = 'dashboard'

    const wrapper = createWrapper()
    await flushPromises()

    const nextButton = wrapper.findAll('button').find((button) => button.text().includes('다음 단계'))
    expect(nextButton).toBeTruthy()
    await nextButton!.trigger('click')
    await flushPromises()

    expect(scheduleStoreMock.nextStep).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith({
      path: '/app/schedule/step3',
      query: {
        from: 'dashboard',
      },
    })
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

    expect(scheduleStoreMock.reset).toHaveBeenCalled()
    expect(pushMock).toHaveBeenCalledWith('/app')
    expect(showInfoMock).not.toHaveBeenCalledWith('변경된 데이터가 없습니다')
  })

  it('blocks dashboard return when there are unsaved changes', async () => {
    routeQueryMock.from = 'dashboard'

    const wrapper = createWrapper()
    await flushPromises()

    wrapper.vm.setRequirement(1, 'D', 1)

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

  it('shows the primary site context while still reading and writing canonical site_requirements', async () => {
    organizationStoreMock.foundationSite = {
      id: 'site-1',
      organizationId: 'org-1',
      code: 'MAIN',
      name: '본관',
      isActive: true,
      isScheduleActive: true,
    }

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('현재 근무표 기준 장소: 본관 (MAIN)')
    expect(loadSiteRequirementsMock).toHaveBeenCalledWith('org-1')

    for (const day of [1, 2, 3, 4, 5, 6, 0]) {
      wrapper.vm.setRequirement(day, 'D', 1)
    }

    const saveButton = wrapper.findAll('button').find((button) => button.text() === '저장')
    expect(saveButton).toBeTruthy()
    await saveButton!.trigger('click')
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

  it('shows save, next-step, and dashboard return on dashboard entry', async () => {
    routeQueryMock.from = 'dashboard'
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('저장')
    expect(wrapper.text()).toContain('다음 단계')
    expect(wrapper.text()).toContain('근무표 관리로 돌아가기')
    expect(wrapper.text()).not.toContain('이전')
  })

  it('treats store-preloaded requirements as unchanged baseline data', async () => {
    scheduleStoreMock.siteRequirements = buildWeeklyRequirements(1)

    const wrapper = createWrapper()
    await flushPromises()

    const saveButton = wrapper.findAll('button').find((button) => button.text() === '저장')
    expect(saveButton).toBeTruthy()
    await saveButton!.trigger('click')
    await flushPromises()

    expect(showInfoMock).toHaveBeenCalledWith('변경된 데이터가 없습니다')
    expect(replaceSiteRequirementsMock).not.toHaveBeenCalled()
  })

  it('treats DB-preloaded requirements as unchanged baseline data', async () => {
    loadSiteRequirementsMock.mockResolvedValue(buildWeeklyRequirements(1))

    const wrapper = createWrapper()
    await flushPromises()

    const saveButton = wrapper.findAll('button').find((button) => button.text() === '저장')
    expect(saveButton).toBeTruthy()
    await saveButton!.trigger('click')
    await flushPromises()

    expect(showInfoMock).toHaveBeenCalledWith('변경된 데이터가 없습니다')
    expect(replaceSiteRequirementsMock).not.toHaveBeenCalled()
  })
})
