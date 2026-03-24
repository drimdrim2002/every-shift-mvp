import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'
import { stepProgressGuard } from '@/router/guards'
import { buildOnboardingQuery } from '@/utils/onboarding-context'

type OnboardingStepKey = 'organization_info' | 'employee_seed' | 'schedule_request'

const pushMock = vi.hoisted(() => vi.fn(async () => undefined))
const replaceMock = vi.hoisted(() => vi.fn(async () => undefined))
const dialogWarningMock = vi.hoisted(() => vi.fn())
const messageMock = vi.hoisted(() => ({
  warning: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}))
const routeMock = vi.hoisted(() => ({
  path: '/onboarding',
  query: {} as Record<string, unknown>,
}))
const onboardingStoreMock = vi.hoisted(() => ({
  organizationId: 'org-1' as string | null,
  currentStepKey: 'organization_info' as OnboardingStepKey | null,
  completedStepKeys: [] as OnboardingStepKey[],
  isOnboardingComplete: false,
  shouldForceOnboarding: true,
  loadProgress: vi.fn(async () => null),
  complete: vi.fn(async () => null),
  updateStep: vi.fn(async () => null),
}))
const rbacStoreMock = vi.hoisted(() => ({
  accessState: 'admin_active' as
    | 'unauthenticated'
    | 'super_active'
    | 'admin_active'
    | 'admin_pending'
    | 'admin_rejected'
    | 'user_active'
    | 'no_membership_or_inactive'
    | null,
  effectiveMembership: {
    organizationId: 'org-1',
  },
}))
const orgStoreMock = vi.hoisted(() => ({
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
      colorCode: '#3b82f6',
      startTime: '09:00',
      endTime: '18:00',
      createdAt: '2026-03-24T00:00:00.000Z',
    },
  ],
  loadOrganization: vi.fn(async () => ({ success: true })),
}))
const masterStoreMock = vi.hoisted(() => ({
  settings: {
    workConstraints: {
      weeklyTargetHours: 40,
    },
  },
  sites: [
    {
      id: 'site-1',
      organizationId: 'org-1',
      code: 'MAIN',
      name: '본원',
      createdAt: '2026-03-24T00:00:00.000Z',
    },
  ],
  loadSettings: vi.fn(async () => ({ success: true })),
  loadSites: vi.fn(async () => ({ success: true })),
  saveSettings: vi.fn(async () => ({ success: true })),
  addSite: vi.fn(async () => ({ success: true })),
  removeSite: vi.fn(async () => ({ success: true })),
}))
const scheduleStoreMock = vi.hoisted(() => ({
  basicInfo: {
    month: '2026-04',
    organizationId: 'org-1',
    organizationName: '서울병원',
    organizationType: 'hospital',
    employeeCount: 0,
    shifts: [
      {
        id: 'shift-1',
        organizationId: 'org-1',
        code: 'D',
        name: 'Day',
        colorCode: '#3b82f6',
        startTime: '09:00',
        endTime: '18:00',
        createdAt: '2026-03-24T00:00:00.000Z',
      },
    ],
  } as
    | {
        month: string
        organizationId: string
        organizationName: string
        organizationType: string
        employeeCount: number
        shifts: Array<Record<string, unknown>>
      }
    | null,
  employees: [] as Array<Record<string, unknown>>,
  currentStep: 3,
  setEmployees: vi.fn(),
  setBasicInfo: vi.fn(),
  setAssignments: vi.fn(),
  nextStep: vi.fn(),
  prevStep: vi.fn(),
}))
const supabaseFromMock = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
}))

vi.mock('@/stores/onboarding', () => ({
  useOnboardingStore: () => onboardingStoreMock,
}))

vi.mock('@/stores/rbac', () => ({
  useRbacStore: () => rbacStoreMock,
}))

vi.mock('@/stores/organization', () => ({
  useOrganizationStore: () => orgStoreMock,
}))

vi.mock('@/stores/organization-master', () => ({
  useOrganizationMasterStore: () => masterStoreMock,
}))

vi.mock('@/stores/schedule', () => ({
  useScheduleStore: () => scheduleStoreMock,
}))

vi.mock('@/utils/message', () => ({
  showError: vi.fn(),
  showInfo: vi.fn(),
  showSuccess: vi.fn(),
  showWarning: vi.fn(),
}))

vi.mock('@/api/shift', () => ({
  createShift: vi.fn(async () => undefined),
  deleteShift: vi.fn(async () => undefined),
  updateShift: vi.fn(async () => undefined),
}))

vi.mock('@/api/employee', () => ({
  deleteOrganizationEmployees: vi.fn(async () => undefined),
  createEmployeesBatch: vi.fn(async () => undefined),
}))

vi.mock('@/api/schedule', () => ({
  getScheduleStatus: vi.fn(async () => null),
}))

vi.mock('@/api/supabase', () => ({
  supabase: {
    from: supabaseFromMock,
  },
}))

import Onboarding from '@/views/Onboarding.vue'
import Step3EmployeeInfo from '@/views/schedule/Step3EmployeeInfo.vue'

const AlertStub = {
  name: 'NAlert',
  props: {
    title: {
      type: String,
      default: '',
    },
  },
  template: `
    <div>
      <p v-if="title">{{ title }}</p>
      <slot />
    </div>
  `,
}

const ButtonStub = {
  name: 'NButton',
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['click'],
  template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
}

const CardStub = {
  name: 'NCard',
  props: {
    title: {
      type: String,
      default: '',
    },
  },
  template: `
    <div>
      <h2 v-if="title">{{ title }}</h2>
      <slot name="header" />
      <slot />
    </div>
  `,
}

const DataTableStub = {
  name: 'NDataTable',
  template: '<div data-test="data-table" />',
}

const InputStub = {
  name: 'NInput',
  template: '<input />',
}

const PopconfirmStub = {
  name: 'NPopconfirm',
  emits: ['positive-click'],
  template: `
    <div>
      <slot name="trigger" />
      <slot />
    </div>
  `,
}

const SpinStub = {
  name: 'NSpin',
  template: '<div>spinner</div>',
}

const TagStub = {
  name: 'NTag',
  template: '<span><slot /></span>',
}

const TabsStub = {
  name: 'NTabs',
  props: {
    value: {
      type: String,
      default: '',
    },
  },
  emits: ['update:value'],
  template: '<div><slot /></div>',
}

const TabPaneStub = {
  name: 'NTabPane',
  template: '<div><slot /></div>',
}

const ShiftManagerStub = {
  name: 'ShiftManager',
  template: '<div />',
}

const StepIndicatorStub = {
  name: 'StepIndicator',
  template: '<div data-test="step-indicator">step-indicator</div>',
}

const EmployeeTableStub = {
  name: 'EmployeeTable',
  emits: ['add', 'edit', 'delete'],
  template: `
    <div data-test="employee-table">
      <button
        data-test="employee-table-add"
        @click="$emit('add', { employeeId: 'EMP001', name: '홍길동', availableShifts: ['D'] })"
      >
        add employee
      </button>
    </div>
  `,
}

const EmployeeExcelUploadStub = {
  name: 'EmployeeExcelUpload',
  emits: ['upload'],
  template: '<div data-test="employee-excel-upload">excel-upload</div>',
}

function setDefaultSupabaseMock() {
  supabaseFromMock.mockImplementation(() => ({
    select: () => ({
      eq: () => ({
        order: async () => ({
          data: [],
          error: null,
        }),
      }),
    }),
  }))
}

function resetRoute() {
  routeMock.path = '/onboarding'
  routeMock.query = {}
}

function resetStores() {
  onboardingStoreMock.organizationId = 'org-1'
  onboardingStoreMock.currentStepKey = 'organization_info'
  onboardingStoreMock.completedStepKeys = []
  onboardingStoreMock.isOnboardingComplete = false
  onboardingStoreMock.shouldForceOnboarding = true
  onboardingStoreMock.loadProgress.mockResolvedValue(null)
  onboardingStoreMock.complete.mockResolvedValue(null)
  onboardingStoreMock.updateStep.mockResolvedValue(null)

  rbacStoreMock.accessState = 'admin_active'
  rbacStoreMock.effectiveMembership = {
    organizationId: 'org-1',
  }

  orgStoreMock.current = {
    id: 'org-1',
    name: '서울병원',
    type: 'hospital',
  }
  orgStoreMock.shifts = [
    {
      id: 'shift-1',
      organizationId: 'org-1',
      code: 'D',
      name: 'Day',
      colorCode: '#3b82f6',
      startTime: '09:00',
      endTime: '18:00',
      createdAt: '2026-03-24T00:00:00.000Z',
    },
  ]
  orgStoreMock.loadOrganization.mockResolvedValue({ success: true })

  masterStoreMock.settings = {
    workConstraints: {
      weeklyTargetHours: 40,
    },
  }
  masterStoreMock.sites = [
    {
      id: 'site-1',
      organizationId: 'org-1',
      code: 'MAIN',
      name: '본원',
      createdAt: '2026-03-24T00:00:00.000Z',
    },
  ]
  masterStoreMock.loadSettings.mockResolvedValue({ success: true })
  masterStoreMock.loadSites.mockResolvedValue({ success: true })

  scheduleStoreMock.basicInfo = {
    month: '2026-04',
    organizationId: 'org-1',
    organizationName: '서울병원',
    organizationType: 'hospital',
    employeeCount: 0,
    shifts: orgStoreMock.shifts,
  }
  scheduleStoreMock.employees = []
  scheduleStoreMock.currentStep = 3
}

function mountOnboardingView() {
  return mount(Onboarding, {
    global: {
      stubs: {
        NAlert: AlertStub,
        NButton: ButtonStub,
        NCard: CardStub,
        NDataTable: DataTableStub,
        NInput: InputStub,
        NPopconfirm: PopconfirmStub,
        NSpin: SpinStub,
        NTag: TagStub,
        ShiftManager: ShiftManagerStub,
      },
    },
  })
}

function mountStep3View() {
  return mount(Step3EmployeeInfo, {
    global: {
      stubs: {
        NAlert: AlertStub,
        NButton: ButtonStub,
        NCard: CardStub,
        NPopconfirm: PopconfirmStub,
        NTabs: TabsStub,
        NTabPane: TabPaneStub,
        StepIndicator: StepIndicatorStub,
        EmployeeTable: EmployeeTableStub,
        EmployeeExcelUpload: EmployeeExcelUploadStub,
      },
    },
  })
}

function createRoute(
  path: string,
  query: Record<string, unknown> = {},
): RouteLocationNormalized {
  return {
    path,
    query,
    params: {},
  } as RouteLocationNormalized
}

describe('onboarding re-entry regression', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetRoute()
    resetStores()
    setDefaultSupabaseMock()
    dialogWarningMock.mockImplementation(() => undefined)
    Object.assign(window, {
      $dialog: {
        warning: dialogWarningMock,
      },
      $message: messageMock,
    })
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
  })

  it('reopens completed Step 1 inline without updating canonical onboarding progress', async () => {
    onboardingStoreMock.currentStepKey = 'schedule_request'
    onboardingStoreMock.completedStepKeys = ['organization_info', 'employee_seed']

    const wrapper = mountOnboardingView()
    await flushPromises()

    expect(wrapper.text()).toContain('첫 스케줄 요청 시작하기')
    expect(wrapper.text()).toContain('다시 확인하기')

    await wrapper.findAll('button').find((button) => button.text() === '다시 확인하기')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('시프트 설정')
    expect(wrapper.text()).toContain('조직 기본 설정은 이미 완료된 단계입니다.')
    expect(onboardingStoreMock.updateStep).not.toHaveBeenCalled()

    await wrapper.findAll('button').find((button) => button.text() === '현재 단계 보기')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('첫 스케줄 요청 시작하기')
  })

  it('reopens completed Step 2 from resumeStep and can return to the current step CTA', async () => {
    onboardingStoreMock.currentStepKey = 'schedule_request'
    onboardingStoreMock.completedStepKeys = ['organization_info', 'employee_seed']
    routeMock.query = buildOnboardingQuery({
      step: 'employee_seed',
      returnStep: 'employee_seed',
      resumeStep: 'employee_seed',
    })

    const wrapper = mountOnboardingView()
    await flushPromises()

    expect(wrapper.text()).toContain('직원 등록하러 가기')
    expect(wrapper.text()).not.toContain('첫 스케줄 요청 시작하기')

    await wrapper.findAll('button').find((button) => button.text() === '현재 단계 보기')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('첫 스케줄 요청 시작하기')
  })

  it('uses completed Step 2 secondary CTA to reopen the Excel deep link', async () => {
    onboardingStoreMock.currentStepKey = 'schedule_request'
    onboardingStoreMock.completedStepKeys = ['organization_info', 'employee_seed']

    const wrapper = mountOnboardingView()
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '엑셀 업로드 다시 열기')
      ?.trigger('click')

    expect(pushMock).toHaveBeenCalledWith({
      path: '/schedule/step3',
      query: buildOnboardingQuery({
        step: 'employee_seed',
        entry: 'excel',
      }),
    })
  })

  it('keeps the Step 2 helper banner active and confirms unsaved changes before returning', async () => {
    let dialogOptions: Record<string, unknown> | null = null
    dialogWarningMock.mockImplementation((options: Record<string, unknown>) => {
      dialogOptions = options
    })

    routeMock.path = '/schedule/step3'
    routeMock.query = buildOnboardingQuery({
      step: 'employee_seed',
      entry: 'manual',
      returnTo: '/onboarding',
      returnStep: 'employee_seed',
    })

    const wrapper = mountStep3View()
    await flushPromises()

    expect(wrapper.find('[data-test="onboarding-banner"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('2단계: 첫 직원 등록')

    await wrapper.find('[data-test="employee-table-add"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-test="onboarding-banner-return"]').trigger('click')

    expect(dialogWarningMock).toHaveBeenCalledTimes(1)
    expect(pushMock).not.toHaveBeenCalled()

    await (dialogOptions?.onPositiveClick as (() => void) | undefined)?.()

    expect(pushMock).toHaveBeenCalledWith({
      path: '/onboarding',
      query: buildOnboardingQuery({
        step: 'employee_seed',
        returnTo: '/onboarding',
        returnStep: 'employee_seed',
        resumeStep: 'employee_seed',
      }),
    })
  })

  it('focuses the Excel upload entry only for an active onboarding deep link', async () => {
    const scrollIntoViewMock = vi.spyOn(HTMLElement.prototype, 'scrollIntoView')

    routeMock.path = '/schedule/step3'
    routeMock.query = buildOnboardingQuery({
      step: 'employee_seed',
      entry: 'excel',
      returnTo: '/onboarding',
      returnStep: 'employee_seed',
    })

    const wrapper = mountStep3View()
    await flushPromises()

    expect(wrapper.find('[data-test="excel-upload-entry"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('엑셀 업로드로 시작하세요')
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1)
  })

  it('suppresses onboarding helper UI when onboarding is already complete', async () => {
    routeMock.path = '/schedule/step3'
    routeMock.query = buildOnboardingQuery({
      step: 'employee_seed',
      entry: 'excel',
      returnTo: '/onboarding',
      returnStep: 'employee_seed',
    })
    onboardingStoreMock.shouldForceOnboarding = false
    onboardingStoreMock.isOnboardingComplete = true

    const wrapper = mountStep3View()
    await flushPromises()

    expect(wrapper.find('[data-test="onboarding-banner"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="step-indicator"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('엑셀 업로드로 시작하세요')
  })

  it('allows the employee deep-link bypass only while onboarding is still incomplete', async () => {
    const next = vi.fn()
    onboardingStoreMock.shouldForceOnboarding = true
    scheduleStoreMock.basicInfo = null

    await stepProgressGuard(
      createRoute(
        '/schedule/step3',
        buildOnboardingQuery({
          step: 'employee_seed',
          entry: 'manual',
        }),
      ),
      createRoute('/'),
      next,
    )

    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0]).toEqual([])
  })

  it('restores normal Step 3 prerequisites after onboarding completion', async () => {
    const next = vi.fn()
    onboardingStoreMock.shouldForceOnboarding = false
    scheduleStoreMock.basicInfo = null

    await stepProgressGuard(
      createRoute(
        '/schedule/step3',
        buildOnboardingQuery({
          step: 'employee_seed',
          entry: 'manual',
        }),
      ),
      createRoute('/'),
      next,
    )

    expect(messageMock.warning).toHaveBeenCalledWith('먼저 기본 정보를 입력해주세요.')
    expect(next).toHaveBeenCalledWith('/schedule/step1')
  })
})
