import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type OnboardingStepKey = 'organization_info' | 'employee_seed' | 'schedule_request'

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })

  return { promise, resolve, reject }
}

const pushMock = vi.fn()
const replaceMock = vi.fn()
const routeMock = vi.hoisted(() => ({
  path: '/onboarding',
  query: {} as Record<string, unknown>,
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
const onboardingStoreMock = vi.hoisted(() => ({
  organizationId: null as string | null,
  currentStepKey: 'organization_info' as OnboardingStepKey | null,
  completedStepKeys: [] as OnboardingStepKey[],
  isOnboardingComplete: false,
  loadProgress: vi.fn(async () => null),
  complete: vi.fn(async () => null),
  updateStep: vi.fn(async () => null),
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
const messageMocks = vi.hoisted(() => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showWarning: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
}))

vi.mock('@/stores/rbac', () => ({
  useRbacStore: () => rbacStoreMock,
}))

vi.mock('@/stores/onboarding', () => ({
  useOnboardingStore: () => onboardingStoreMock,
}))

vi.mock('@/stores/organization', () => ({
  useOrganizationStore: () => orgStoreMock,
}))

vi.mock('@/stores/organization-master', () => ({
  useOrganizationMasterStore: () => masterStoreMock,
}))

vi.mock('@/utils/message', () => ({
  showError: messageMocks.showError,
  showSuccess: messageMocks.showSuccess,
  showWarning: messageMocks.showWarning,
}))

vi.mock('@/api/shift', () => ({
  createShift: vi.fn(async () => undefined),
  deleteShift: vi.fn(async () => undefined),
  updateShift: vi.fn(async () => undefined),
}))

import Onboarding from '@/views/Onboarding.vue'

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
  template: `
    <div>
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

const ShiftManagerStub = {
  name: 'ShiftManager',
  template: '<div />',
}

function mountView() {
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

function resetStores() {
  routeMock.path = '/onboarding'
  routeMock.query = {}
  rbacStoreMock.accessState = 'admin_active'
  rbacStoreMock.effectiveMembership = {
    organizationId: 'org-1',
  }

  onboardingStoreMock.organizationId = null
  onboardingStoreMock.currentStepKey = 'organization_info'
  onboardingStoreMock.completedStepKeys = []
  onboardingStoreMock.isOnboardingComplete = false
  onboardingStoreMock.loadProgress.mockResolvedValue(null)
  onboardingStoreMock.complete.mockResolvedValue(null)
  onboardingStoreMock.updateStep.mockResolvedValue(null)

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
}

describe('Onboarding view state regression', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStores()
  })

  it('shows only the loading state while onboarding progress is pending', async () => {
    const deferred = createDeferred<null>()
    onboardingStoreMock.loadProgress.mockImplementation(() => deferred.promise)

    const wrapper = mountView()

    expect(wrapper.text()).toContain('온보딩 상태를 불러오는 중입니다...')
    expect(wrapper.text()).not.toContain('온보딩 상태를 확인하지 못했습니다')
    expect(wrapper.findAll('button')).toHaveLength(0)

    deferred.resolve(null)
    await flushPromises()
  })

  it('renders the progress error state when loadProgress fails', async () => {
    onboardingStoreMock.loadProgress.mockRejectedValue(new Error('진행 상태 로드 실패'))

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('온보딩 상태를 확인하지 못했습니다')
    expect(wrapper.text()).toContain('진행 상태 로드 실패')
    expect(wrapper.text()).toContain('다시 시도')
    expect(wrapper.text()).not.toContain('온보딩 화면 정보를 불러오지 못했습니다')
  })

  it('renders the organization data error state separately from progress errors', async () => {
    orgStoreMock.loadOrganization.mockResolvedValue({
      success: false,
      error: '조직 정보를 불러오지 못했습니다.',
    })

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('온보딩 화면 정보를 불러오지 못했습니다')
    expect(wrapper.text()).toContain('조직 정보를 불러오지 못했습니다.')
    expect(wrapper.text()).not.toContain('온보딩 상태를 확인하지 못했습니다')
  })

  it('renders the completion landing when onboarding is complete', async () => {
    onboardingStoreMock.currentStepKey = null
    onboardingStoreMock.completedStepKeys = [
      'organization_info',
      'employee_seed',
      'schedule_request',
    ]
    onboardingStoreMock.isOnboardingComplete = true

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('온보딩 완료')
    expect(wrapper.text()).toContain('대시보드로 이동')
    expect(wrapper.text()).not.toContain('직원 등록하러 가기')
  })

  it('shows the organization_info CTA when the first step is current', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('조직 정보 확인하기')
    expect(wrapper.text()).not.toContain('직원 등록하러 가기')
    expect(wrapper.text()).not.toContain('첫 스케줄 요청 시작하기')
  })

  it('shows the employee seed CTAs when employee_seed is current', async () => {
    onboardingStoreMock.currentStepKey = 'employee_seed'
    onboardingStoreMock.completedStepKeys = ['organization_info']

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('직원 등록하러 가기')
    expect(wrapper.text()).toContain('엑셀 업로드로 시작')
    expect(wrapper.text()).toContain('완료')
    expect(wrapper.text()).toContain('진행 중')
    expect(wrapper.text()).not.toContain('첫 스케줄 요청 시작하기')
  })

  it('shows the schedule request CTA when schedule_request is current', async () => {
    onboardingStoreMock.currentStepKey = 'schedule_request'
    onboardingStoreMock.completedStepKeys = ['organization_info', 'employee_seed']

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('첫 스케줄 요청 시작하기')
    expect(wrapper.text()).not.toContain('직원 등록하러 가기')
  })
})
