import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildCanonicalStep5RouteLocation, getScheduleStepRoutePath } from '@/constants/routes'

const { pushMock, getScheduleListMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  getScheduleListMock: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

vi.mock('@/api/schedule', () => ({
  getScheduleList: getScheduleListMock,
}))

const organizationStoreMock = reactive({
  current: {
    id: 'org-1',
    name: '서울병원',
    type: 'hospital',
  },
  loadOrganization: vi.fn(),
})

vi.mock('@/stores/organization', () => ({
  useOrganizationStore: () => organizationStoreMock,
}))

const scheduleStoreMock = reactive({
  reset: vi.fn(),
  setBasicInfo: vi.fn(),
})

vi.mock('@/stores/schedule', () => ({
  useScheduleStore: () => scheduleStoreMock,
}))

import ScheduleResults from '@/views/schedule/ScheduleResults.vue'

function createSchedule(overrides: Partial<{
  id: string
  public_id: string | null
  organization_id: string
  month: string
  status: 'created' | 'running' | 'complete' | 'changed' | 'error'
  hard_score: number | null
  soft_score: number | null
  created_at: string
  updated_at: string
}> = {}) {
  const month = overrides.month ?? '2026-03'

  return {
    id: 'schedule-1',
    public_id: 'sch_a1b2c3d4e5f6',
    organization_id: 'org-1',
    month,
    status: 'complete' as const,
    hard_score: 10,
    soft_score: 20,
    created_at: `${month}-01T00:00:00Z`,
    updated_at: `${month}-01T00:00:00Z`,
    ...overrides,
  }
}

function createWrapper() {
  return mount(ScheduleResults, {
    global: {
      stubs: {
        NButton: {
          template:
            '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
        },
        NSpin: {
          template: '<div data-test="spin-stub" />',
        },
      },
    },
  })
}

describe('ScheduleResults', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-13T00:00:00+09:00'))
    pushMock.mockReset()
    getScheduleListMock.mockReset()
    organizationStoreMock.current = {
      id: 'org-1',
      name: '서울병원',
      type: 'hospital',
    }
    organizationStoreMock.loadOrganization.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the title, current year, 12 month tiles, and disabled empty months', async () => {
    getScheduleListMock.mockResolvedValueOnce([createSchedule()])

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('생성된 근무표')
    expect(wrapper.get('[data-test="schedule-results-year"]').text()).toContain('2026')
    expect(wrapper.findAll('[data-test="schedule-results-month-tile"]')).toHaveLength(12)
    expect(wrapper.get('[data-test="schedule-results-month-01"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="schedule-results-month-01"]').text()).toContain('생성 전')
    expect(wrapper.get('[data-test="schedule-results-month-03"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[data-test="schedule-results-month-03"]').text()).toContain('결과 보기')
    expect(getScheduleListMock).toHaveBeenCalledWith('org-1')
  })

  it('labels draft schedules as in-progress instead of result review', async () => {
    getScheduleListMock.mockResolvedValueOnce([
      createSchedule({ month: '2026-05', status: 'created', hard_score: null, soft_score: null }),
    ])

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.get('[data-test="schedule-results-month-05"]').text()).toContain('이어서 진행')
    expect(wrapper.get('[data-test="schedule-results-month-05"]').attributes('data-display-state')).toBe('draft')
  })

  it('routes error schedules to Step4', async () => {
    getScheduleListMock.mockResolvedValueOnce([
      createSchedule({ month: '2026-05', status: 'error', hard_score: null, soft_score: null }),
    ])

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.get('[data-test="schedule-results-month-05"]').trigger('click')

    expect(pushMock).toHaveBeenCalledWith(getScheduleStepRoutePath(4))
  })

  it('routes generated months to the canonical Step5 review path', async () => {
    getScheduleListMock.mockResolvedValueOnce([
      createSchedule({
        id: 'schedule-legacy',
        public_id: null,
        month: '2026-07',
        status: 'changed',
        hard_score: null,
        soft_score: null,
      }),
    ])

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.get('[data-test="schedule-results-month-07"]').trigger('click')

    expect(pushMock).toHaveBeenCalledWith(buildCanonicalStep5RouteLocation('schedule-legacy'))
  })

  it('shows an empty state with a primary route to schedule step1 when no schedules exist', async () => {
    getScheduleListMock.mockResolvedValueOnce([])

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.get('[data-test="schedule-results-empty"]').text()).toContain('아직 생성된 근무표가 없습니다')

    await wrapper.get('[data-test="schedule-results-create"]').trigger('click')

    expect(pushMock).toHaveBeenCalledWith(getScheduleStepRoutePath(1))
  })

  it('defaults to the latest generated schedule year so off-year schedules remain clickable', async () => {
    getScheduleListMock.mockResolvedValueOnce([createSchedule({ month: '2025-11' })])

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.get('[data-test="schedule-results-year"]').text()).toContain('2025')
    expect(wrapper.findAll('[data-test="schedule-results-month-tile"]')).toHaveLength(12)
    expect(wrapper.get('[data-test="schedule-results-month-11"]').attributes('disabled')).toBeUndefined()

    await wrapper.get('[data-test="schedule-results-month-11"]').trigger('click')

    expect(pushMock).toHaveBeenCalledWith(buildCanonicalStep5RouteLocation('sch_a1b2c3d4e5f6'))
  })

  it('lets users switch between generated schedule years when multiple years exist', async () => {
    getScheduleListMock.mockResolvedValueOnce([
      createSchedule({ id: 'schedule-2025', public_id: 'sch_2025', month: '2025-11' }),
      createSchedule({ id: 'schedule-2026', public_id: 'sch_2026', month: '2026-02' }),
    ])

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.get('[data-test="schedule-results-year-select"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="schedule-results-year-select"]').element).toHaveProperty('value', '2026')
    expect(wrapper.get('[data-test="schedule-results-month-02"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[data-test="schedule-results-month-11"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[data-test="schedule-results-year-select"]').setValue('2025')

    expect(wrapper.get('[data-test="schedule-results-month-02"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="schedule-results-month-11"]').attributes('disabled')).toBeUndefined()
  })

  it('shows load error with retry instead of the empty create action when the API rejects', async () => {
    getScheduleListMock.mockRejectedValueOnce(new Error('network failed'))
    getScheduleListMock.mockResolvedValueOnce([createSchedule({ month: '2026-08' })])

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.get('[data-test="schedule-results-error"]').text()).toContain('근무표를 불러오지 못했습니다')
    expect(wrapper.find('[data-test="schedule-results-empty"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="schedule-results-create"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="schedule-results-month-tile"]').exists()).toBe(false)

    await wrapper.get('[data-test="schedule-results-retry"]').trigger('click')
    await flushPromises()

    expect(getScheduleListMock).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-test="schedule-results-error"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="schedule-results-month-08"]').attributes('disabled')).toBeUndefined()
  })

  it('does not render month grid content while loading or in the empty state', async () => {
    let resolveSchedules!: (value: unknown[]) => void
    getScheduleListMock.mockReturnValueOnce(new Promise((resolve) => {
      resolveSchedules = resolve
    }))

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('생성된 근무표를 불러오는 중입니다')
    expect(wrapper.find('[data-test="schedule-results-month-tile"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="schedule-results-empty"]').exists()).toBe(false)

    resolveSchedules([])
    await flushPromises()

    expect(wrapper.get('[data-test="schedule-results-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="schedule-results-month-tile"]').exists()).toBe(false)
  })
})
