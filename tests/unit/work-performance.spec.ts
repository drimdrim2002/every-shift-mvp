import { mount } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { getScheduleResultsRoutePath, getScheduleStepRoutePath } from '@/constants/routes'
import type { WorkPerformanceLoadResult } from '@/api/workPerformance'
import type {
  WorkPerformanceAssignmentRow,
  WorkPerformanceEmployeeRow,
  WorkPerformancePeriod,
  WorkPerformancePreferenceRow,
} from '@/types/workPerformance'

const { pushMock, loadWorkPerformancePeriodMock, loadOrganizationMock, organizationStore } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  loadWorkPerformancePeriodMock: vi.fn(),
  loadOrganizationMock: vi.fn(),
  organizationStore: {
    current: { id: 'org-1' } as { id: string } | null,
    loadOrganization: vi.fn(),
  },
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

vi.mock('@/api/workPerformance', () => ({
  loadWorkPerformancePeriod: loadWorkPerformancePeriodMock,
}))

vi.mock('@/stores/organization', () => ({
  useOrganizationStore: () => organizationStore,
}))

import WorkPerformance from '@/views/schedule/WorkPerformance.vue'

function createWrapper() {
  return mount(WorkPerformance, {
    global: {
      stubs: {
        NButton: {
          props: ['loading', 'disabled', 'type', 'secondary', 'size'],
          template: '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
        },
        NSpin: {
          template: '<div data-test="spin"><slot /></div>',
        },
      },
    },
  })
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })

  return { promise, resolve, reject }
}

async function flush() {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

function listMonthDates(year: number, month: number) {
  const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate()

  return Array.from({ length: dayCount }, (_value, index) => {
    const day = String(index + 1).padStart(2, '0')
    return `${year}-${String(month).padStart(2, '0')}-${day}`
  })
}

function buildAssignments(
  employees: WorkPerformanceEmployeeRow[],
  dates: string[],
): WorkPerformanceAssignmentRow[] {
  return employees.flatMap((employee) =>
    dates.map((date, index) => ({
      scheduleVersionId: 'version-1',
      employeeId: employee.id,
      date,
      shiftId: null,
      shiftCode: index % 11 === 0 && employee.id === 'emp-1' ? 'N' : index % 7 === 0 ? 'O' : 'D',
      shiftName: null,
    })),
  )
}

function successResult(options?: {
  employees?: WorkPerformanceEmployeeRow[]
  assignments?: WorkPerformanceAssignmentRow[]
  offRequests?: WorkPerformancePreferenceRow[]
}): WorkPerformanceLoadResult {
  const period: WorkPerformancePeriod = {
    year: 2026,
    startMonth: 1,
    endMonth: 1,
    startDate: '2026-01-01',
    endDate: '2026-01-31',
  }
  const employees = options?.employees ?? [
    { id: 'emp-1', name: '김민지' },
    { id: 'emp-2', name: '이서연' },
  ]
  const dates = listMonthDates(2026, 1)

  return {
    status: 'success',
    period,
    employees,
    assignments: options?.assignments ?? buildAssignments(employees, dates),
    offRequests: options?.offRequests ?? [
      {
        scheduleVersionId: 'version-1',
        employeeId: 'emp-1',
        date: '2026-01-08',
        requestCode: 'O',
      },
    ],
    publicHolidayDates: ['2026-01-01'],
    finalizedMonths: ['2026-01'],
    finalizedVersionIds: ['version-1'],
  }
}

async function runQuery(wrapper: ReturnType<typeof createWrapper>) {
  await wrapper.get('[data-test="work-performance-query"]').trigger('click')
  await flush()
}

describe('WorkPerformance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    organizationStore.current = { id: 'org-1' }
    organizationStore.loadOrganization = loadOrganizationMock
  })

  it('renders the initial guidance without loading performance data', () => {
    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('근무 실적')
    expect(wrapper.text()).toContain('확정된 근무표 기준으로 야간, 주말·휴일, Off 요청 수락 편차를 확인합니다.')
    expect(wrapper.get('[data-test="work-performance-initial"]').text()).toContain('기간을 선택한 뒤 조회를 눌러 근무 실적을 확인하세요')
    expect(loadWorkPerformancePeriodMock).not.toHaveBeenCalled()
  })

  it('disables query and shows validation when the start month is after the end month', async () => {
    const wrapper = createWrapper()

    await wrapper.get('[data-test="work-performance-start-month"]').setValue('5')
    await wrapper.get('[data-test="work-performance-end-month"]').setValue('3')

    expect(wrapper.get('[data-test="work-performance-range-error"]').text()).toContain('시작 월은 종료 월보다 늦을 수 없습니다')
    expect(wrapper.get('[data-test="work-performance-query"]').attributes('disabled')).toBeDefined()
  })

  it('shows section-local loading when querying without a previous result', async () => {
    const deferred = createDeferred<WorkPerformanceLoadResult>()
    loadWorkPerformancePeriodMock.mockReturnValueOnce(deferred.promise)
    const wrapper = createWrapper()

    await wrapper.get('[data-test="work-performance-query"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-test="work-performance-loading"]').text()).toContain('근무 실적을 계산하는 중입니다')

    deferred.resolve(successResult())
    await flush()
  })

  it('keeps the previous result visible while a new query is loading', async () => {
    const deferred = createDeferred<WorkPerformanceLoadResult>()
    loadWorkPerformancePeriodMock.mockResolvedValueOnce(successResult()).mockReturnValueOnce(deferred.promise)
    const wrapper = createWrapper()

    await runQuery(wrapper)
    expect(wrapper.get('[data-test="work-performance-table"]').text()).toContain('김민지')

    await wrapper.get('[data-test="work-performance-query"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-test="work-performance-refreshing"]').text()).toContain('이전 조회 결과를 표시하는 중입니다')
    expect(wrapper.get('[data-test="work-performance-table"]').text()).toContain('김민지')

    deferred.resolve(successResult())
    await flush()
  })

  it('renders summary metrics, threshold control, table, and no request data explanation on success', async () => {
    loadWorkPerformancePeriodMock.mockResolvedValueOnce(successResult({ offRequests: [] }))
    const wrapper = createWrapper()

    await runQuery(wrapper)

    expect(wrapper.get('[data-test="work-performance-table"]').text()).toContain('김민지')
    expect(wrapper.get('[data-test="work-performance-summary"]').text()).toContain('야간 근무')
    expect(wrapper.get('[data-test="work-performance-threshold"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('선택 기간에 Off 요청이 없습니다')
    expect(loadWorkPerformancePeriodMock).toHaveBeenCalledWith({
      organizationId: 'org-1',
      year: expect.any(Number),
      startMonth: expect.any(Number),
      endMonth: expect.any(Number),
    })
  })

  it('renders the missing finalized month state with navigation to generated schedules', async () => {
    loadWorkPerformancePeriodMock.mockResolvedValueOnce({
      status: 'missingFinalizedMonth',
      missingMonths: ['2026-02', '2026-03'],
    } satisfies WorkPerformanceLoadResult)
    const wrapper = createWrapper()

    await runQuery(wrapper)

    expect(wrapper.get('[data-test="work-performance-state"]').text()).toContain('선택한 기간에 아직 확정되지 않은 월이 있습니다')
    expect(wrapper.text()).toContain('2026년 2월')

    await wrapper.get('[data-test="work-performance-results"]').trigger('click')
    expect(pushMock).toHaveBeenCalledWith(getScheduleResultsRoutePath())
  })

  it('renders the no finalized schedule state with actions', async () => {
    loadWorkPerformancePeriodMock.mockResolvedValueOnce({
      status: 'noFinalizedSchedule',
    } satisfies WorkPerformanceLoadResult)
    const wrapper = createWrapper()

    await runQuery(wrapper)

    expect(wrapper.get('[data-test="work-performance-state"]').text()).toContain('아직 확정된 근무표가 없습니다')

    await wrapper.get('[data-test="work-performance-create"]').trigger('click')
    expect(pushMock).toHaveBeenCalledWith(getScheduleStepRoutePath(1))
  })

  it('renders the no comparison employees state when all employees are excluded', async () => {
    loadWorkPerformancePeriodMock.mockResolvedValueOnce(successResult({ assignments: [] }))
    const wrapper = createWrapper()

    await runQuery(wrapper)

    expect(wrapper.get('[data-test="work-performance-state"]').text()).toContain('이 기간 전체를 근무한 직원이 없습니다')
    expect(wrapper.text()).toContain('선택 기간 전체에 배정 기록이 있는 직원만 비교 대상에 포함됩니다')
    expect(wrapper.find('[data-test="work-performance-table"]').exists()).toBe(false)
  })

  it('renders the missing public holiday data state', async () => {
    loadWorkPerformancePeriodMock.mockResolvedValueOnce({
      status: 'missingHolidayCoverage',
    } satisfies WorkPerformanceLoadResult)
    const wrapper = createWrapper()

    await runQuery(wrapper)

    expect(wrapper.get('[data-test="work-performance-state"]').text()).toContain('공휴일 데이터 없음')
    expect(wrapper.text()).toContain('공휴일 데이터가 등록되어 있는지 확인해 주세요')
  })

  it('renders load failure and retries successfully', async () => {
    loadWorkPerformancePeriodMock
      .mockRejectedValueOnce(new Error('근무 실적을 불러오지 못했습니다'))
      .mockResolvedValueOnce(successResult())
    const wrapper = createWrapper()

    await runQuery(wrapper)

    expect(wrapper.get('[data-test="work-performance-error"]').text()).toContain('근무 실적을 불러오지 못했습니다')

    await wrapper.get('[data-test="work-performance-retry"]').trigger('click')
    await flush()

    expect(loadWorkPerformancePeriodMock).toHaveBeenCalledTimes(2)
    expect(wrapper.get('[data-test="work-performance-table"]').text()).toContain('김민지')
  })
})
