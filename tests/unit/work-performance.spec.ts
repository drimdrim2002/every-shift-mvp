import { mount, type MountingOptions } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { getScheduleStepRoutePath } from '@/constants/routes'
import type { WorkPerformanceLoadResult } from '@/api/workPerformance'
import type {
  WorkPerformanceAssignmentRow,
  WorkPerformanceEmployeeRow,
  WorkPerformancePeriod,
  WorkPerformancePreferenceRow,
} from '@/types/workPerformance'

const {
  pushMock,
  loadLatestFinalizedWorkPerformanceMonthMock,
  loadWorkPerformancePeriodMock,
  loadOrganizationMock,
  organizationStore,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  loadLatestFinalizedWorkPerformanceMonthMock: vi.fn(),
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
  loadLatestFinalizedWorkPerformanceMonth: loadLatestFinalizedWorkPerformanceMonthMock,
  loadWorkPerformancePeriod: loadWorkPerformancePeriodMock,
}))

vi.mock('@/stores/organization', () => ({
  useOrganizationStore: () => organizationStore,
}))

import WorkPerformance from '@/views/schedule/WorkPerformance.vue'

function createWrapper(options: MountingOptions<unknown> = {}) {
  return mount(WorkPerformance, {
    ...options,
    global: {
      ...options.global,
      stubs: {
        ...options.global?.stubs,
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
  for (let index = 0; index < 4; index += 1) {
    await nextTick()
    await Promise.resolve()
  }
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
      shiftCode: index % 5 === 0 && employee.id === 'emp-1' ? 'N' : index % 7 === 0 ? 'O' : 'D',
      shiftName: null,
    })),
  )
}

function buildAssignmentsFromShiftCodes(
  employees: WorkPerformanceEmployeeRow[],
  shiftsByEmployeeDate: Record<string, Record<string, string>>,
): WorkPerformanceAssignmentRow[] {
  const dates = listMonthDates(2026, 1)

  return employees.flatMap((employee) =>
    dates.map((date) => ({
      scheduleVersionId: 'version-1',
      employeeId: employee.id,
      date,
      shiftId: null,
      shiftCode: shiftsByEmployeeDate[employee.id]?.[date] ?? 'O',
      shiftName: null,
    })),
  )
}

function preference(employeeId: string, date: string): WorkPerformancePreferenceRow {
  return {
    scheduleVersionId: 'version-1',
    employeeId,
    date,
    requestCode: 'O',
  }
}

function successResult(options?: {
  employees?: WorkPerformanceEmployeeRow[]
  assignments?: WorkPerformanceAssignmentRow[]
  offRequests?: WorkPerformancePreferenceRow[]
  publicHolidayDates?: string[]
  missingMonths?: string[]
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
    publicHolidayDates: options?.publicHolidayDates ?? ['2026-01-01'],
    finalizedMonths: ['2026-01'],
    finalizedVersionIds: ['version-1'],
    missingMonths: options?.missingMonths ?? [],
  }
}

function getEmployeeRowNames(wrapper: ReturnType<typeof createWrapper>): string[] {
  return wrapper
    .findAll('[data-test="work-performance-employee-row"]')
    .map((row) => row.get('[data-test="work-performance-employee-name"]').text())
}

async function runQuery(wrapper: ReturnType<typeof createWrapper>) {
  await wrapper.get('[data-test="work-performance-query"]').trigger('click')
  await flush()
}

describe('WorkPerformance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadLatestFinalizedWorkPerformanceMonthMock.mockResolvedValue(null)
    organizationStore.current = { id: 'org-1' }
    organizationStore.loadOrganization = loadOrganizationMock
  })

  it('renders the initial guidance without loading performance data', () => {
    loadLatestFinalizedWorkPerformanceMonthMock.mockReturnValueOnce(new Promise(() => undefined))
    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('근무 실적')
    expect(wrapper.text()).toContain('확정된 근무표 기준으로 야간, 주말·휴일, Off 요청 수락 편차를 확인합니다.')
    expect(wrapper.get('[data-test="work-performance-initial"]').text()).toContain('기간을 선택한 뒤 조회를 눌러 근무 실적을 확인하세요')
    expect(loadWorkPerformancePeriodMock).not.toHaveBeenCalled()
  })

  it('shows the no finalized schedule state on entry when there is no latest finalized month', async () => {
    const wrapper = createWrapper()

    await flush()

    expect(wrapper.get('[data-test="work-performance-state"]').text()).toContain('선택한 기간에 확정된 근무표가 없습니다')
    expect(loadLatestFinalizedWorkPerformanceMonthMock).toHaveBeenCalledWith('org-1')
    expect(loadWorkPerformancePeriodMock).not.toHaveBeenCalled()
  })

  it('defaults the draft period to the latest finalized month without auto-querying', async () => {
    loadLatestFinalizedWorkPerformanceMonthMock.mockResolvedValueOnce({ year: 2026, month: 4 })
    const wrapper = createWrapper()

    await flush()

    expect(wrapper.get('[data-test="work-performance-year"]').element).toHaveProperty('value', '2026')
    expect(wrapper.get('[data-test="work-performance-start-month"]').element).toHaveProperty('value', '4')
    expect(wrapper.get('[data-test="work-performance-end-month"]').element).toHaveProperty('value', '4')
    expect(loadLatestFinalizedWorkPerformanceMonthMock).toHaveBeenCalledWith('org-1')
    expect(loadWorkPerformancePeriodMock).not.toHaveBeenCalled()
  })

  it('does not overwrite draft period changes when latest finalized month lookup finishes late', async () => {
    const deferredLatest = createDeferred<{ year: number; month: number } | null>()
    loadLatestFinalizedWorkPerformanceMonthMock.mockReturnValueOnce(deferredLatest.promise)
    const wrapper = createWrapper()

    await wrapper.get('[data-test="work-performance-year"]').setValue('2027')
    await wrapper.get('[data-test="work-performance-start-month"]').setValue('5')
    await wrapper.get('[data-test="work-performance-end-month"]').setValue('6')

    deferredLatest.resolve({ year: 2026, month: 4 })
    await flush()

    expect(wrapper.get('[data-test="work-performance-year"]').element).toHaveProperty('value', '2027')
    expect(wrapper.get('[data-test="work-performance-start-month"]').element).toHaveProperty('value', '5')
    expect(wrapper.get('[data-test="work-performance-end-month"]').element).toHaveProperty('value', '6')
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
    expect(wrapper.get('[data-test="work-performance-matrix"]').text()).toContain('김민지')

    await wrapper.get('[data-test="work-performance-query"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-test="work-performance-refreshing"]').text()).toContain('이전 조회 결과를 표시하는 중입니다')
    expect(wrapper.get('[data-test="work-performance-matrix"]').text()).toContain('김민지')

    deferred.resolve(successResult())
    await flush()
  })

  it('renders summary metrics first, hides risk summary, and renders deviation matrix on success', async () => {
    loadWorkPerformancePeriodMock.mockResolvedValueOnce(successResult({ offRequests: [] }))
    const wrapper = createWrapper()

    await wrapper.get('[data-test="work-performance-year"]').setValue('2026')
    await wrapper.get('[data-test="work-performance-start-month"]').setValue('1')
    await wrapper.get('[data-test="work-performance-end-month"]').setValue('1')
    await runQuery(wrapper)

    expect(wrapper.get('[data-test="work-performance-summary"]').text()).toContain('야간 근무')
    expect(wrapper.get('[data-test="work-performance-summary"]').text()).toContain('최대 편차')
    expect(wrapper.find('[data-test="work-performance-risk-summary"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="work-performance-matrix"]').text()).toContain('김민지')
    expect(
      wrapper.get('[data-test="work-performance-summary"]').element.compareDocumentPosition(
        wrapper.get('[data-test="work-performance-matrix"]').element,
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(wrapper.get('[data-test="work-performance-threshold"]').element).toHaveProperty('value', '3')
    expect(wrapper.get('[data-test="work-performance-applied-period"]').text()).toContain('조회 기간: 2026년 1월')
    expect(wrapper.get('[data-test="work-performance-matrix"]').text()).toContain('평균 대비')
    expect(wrapper.get('[data-test="work-performance-detail-header"]').text()).toBe('상세')
    expect(wrapper.find('[data-test="work-performance-emphasis-label"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('선택 기간에 Off 요청이 없습니다')
    expect(loadWorkPerformancePeriodMock).toHaveBeenCalledWith({
      organizationId: 'org-1',
      year: 2026,
      startMonth: 1,
      endMonth: 1,
    })
  })

  it('keeps the applied result label unchanged when draft controls change before query', async () => {
    loadWorkPerformancePeriodMock.mockResolvedValueOnce(successResult())
    const wrapper = createWrapper()

    await wrapper.get('[data-test="work-performance-year"]').setValue('2026')
    await wrapper.get('[data-test="work-performance-start-month"]').setValue('1')
    await wrapper.get('[data-test="work-performance-end-month"]').setValue('1')
    await runQuery(wrapper)

    expect(wrapper.get('[data-test="work-performance-applied-period"]').text()).toContain('조회 기간: 2026년 1월')

    await wrapper.get('[data-test="work-performance-year"]').setValue('2027')
    await wrapper.get('[data-test="work-performance-start-month"]').setValue('2')
    await wrapper.get('[data-test="work-performance-end-month"]').setValue('3')

    expect(loadWorkPerformancePeriodMock).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-test="work-performance-applied-period"]').text()).toContain('조회 기간: 2026년 1월')
    expect(wrapper.get('[data-test="work-performance-matrix"]').text()).toContain('김민지')
    expect(wrapper.get('[data-test="work-performance-matrix"]').text()).toContain('이서연')
  })

  it('clamps threshold input between 1 and 10 and updates highlight state immediately', async () => {
    loadWorkPerformancePeriodMock.mockResolvedValueOnce(successResult())
    const wrapper = createWrapper()

    await runQuery(wrapper)

    const nightCell = () => wrapper.get('[data-test="work-performance-cell-emp-1-night"]')
    expect(nightCell().text()).toContain('강조')

    await wrapper.get('[data-test="work-performance-threshold"]').setValue('999')
    await flush()

    expect(wrapper.get('[data-test="work-performance-threshold"]').element).toHaveProperty('value', '10')
    expect(nightCell().text()).not.toContain('강조')

    await wrapper.get('[data-test="work-performance-threshold"]').setValue('-5')
    await flush()

    expect(wrapper.get('[data-test="work-performance-threshold"]').element).toHaveProperty('value', '1')
    expect(nightCell().text()).toContain('강조')

    await wrapper.get('[data-test="work-performance-threshold"]').setValue('0')
    await flush()

    expect(wrapper.get('[data-test="work-performance-threshold"]').element).toHaveProperty('value', '1')
  })

  it('shows visible deltas and accessible descriptions for highlighted cells', async () => {
    loadWorkPerformancePeriodMock.mockResolvedValueOnce(successResult())
    const wrapper = createWrapper()

    await runQuery(wrapper)

    const nightCell = wrapper.get('[data-test="work-performance-cell-emp-1-night"]')
    expect(nightCell.text()).toContain('7일')
    expect(nightCell.text()).toContain('평균 대비 +3.5일')
    expect(nightCell.text()).toContain('강조')
    expect(nightCell.attributes('aria-label')).toContain('강조, 평균보다 3.5일 많음')
  })

  it('sorts rows with aria-sort updates when metric and name headers are clicked', async () => {
    loadWorkPerformancePeriodMock.mockResolvedValueOnce(successResult({
      employees: [
        { id: 'emp-1', name: '김민지' },
        { id: 'emp-2', name: '이서연' },
        { id: 'emp-3', name: '박하늘' },
      ],
    }))
    const wrapper = createWrapper()

    await runQuery(wrapper)

    expect(wrapper.get('[data-test="work-performance-sort-priority"]').attributes('aria-pressed')).toBe('true')
    expect(getEmployeeRowNames(wrapper)).toEqual(['김민지', '박하늘', '이서연'])

    await wrapper.get('[data-test="work-performance-sort-name"]').trigger('click')
    await flush()

    expect(wrapper.get('[data-test="work-performance-sort-priority"]').attributes('aria-pressed')).toBe('false')
    expect(wrapper.get('[data-test="work-performance-sort-name"]').attributes('aria-sort')).toBe('ascending')
    expect(getEmployeeRowNames(wrapper)).toEqual(['김민지', '박하늘', '이서연'])

    await wrapper.get('[data-test="work-performance-sort-name"]').trigger('click')
    await flush()

    expect(wrapper.get('[data-test="work-performance-sort-name"]').attributes('aria-sort')).toBe('descending')
    expect(getEmployeeRowNames(wrapper)).toEqual(['이서연', '박하늘', '김민지'])

    await wrapper.get('[data-test="work-performance-sort-offRequestAccepted"]').trigger('click')
    await flush()

    expect(wrapper.get('[data-test="work-performance-sort-offRequestAccepted"]').attributes('aria-sort')).toBe('ascending')
    expect(getEmployeeRowNames(wrapper).slice(0, 2)).not.toContain('김민지')
  })

  it('sorts night and weekend holiday columns with aria-sort updates', async () => {
    const employees = [
      { id: 'night-many', name: '김민지' },
      { id: 'middle', name: '이서연' },
      { id: 'weekend-many', name: '박하늘' },
    ]
    loadWorkPerformancePeriodMock.mockResolvedValueOnce(successResult({
      employees,
      assignments: buildAssignmentsFromShiftCodes(employees, {
        'night-many': {
          '2026-01-05': 'N',
          '2026-01-06': 'N',
          '2026-01-07': 'N',
        },
        middle: {
          '2026-01-03': 'D',
          '2026-01-08': 'N',
        },
        'weekend-many': {
          '2026-01-03': 'D',
          '2026-01-04': 'D',
          '2026-01-10': 'D',
        },
      }),
      offRequests: [],
      publicHolidayDates: [],
    }))
    const wrapper = createWrapper()

    await runQuery(wrapper)

    await wrapper.get('[data-test="work-performance-sort-night"]').trigger('click')
    await flush()

    expect(wrapper.get('[data-test="work-performance-sort-night"]').attributes('aria-sort')).toBe('descending')
    expect(wrapper.get('[data-test="work-performance-sort-weekendHoliday"]').attributes('aria-sort')).toBe('none')
    expect(getEmployeeRowNames(wrapper)).toEqual(['김민지', '이서연', '박하늘'])

    await wrapper.get('[data-test="work-performance-sort-weekendHoliday"]').trigger('click')
    await flush()

    expect(wrapper.get('[data-test="work-performance-sort-night"]').attributes('aria-sort')).toBe('none')
    expect(wrapper.get('[data-test="work-performance-sort-weekendHoliday"]').attributes('aria-sort')).toBe('descending')
    expect(getEmployeeRowNames(wrapper)).toEqual(['박하늘', '이서연', '김민지'])
  })

  it('preserves calculation tie-break order when default priority scores tie', async () => {
    const employees = [
      { id: 'night-heavy', name: '이서연' },
      { id: 'weekend-heavy', name: '김민지' },
      { id: 'baseline', name: '박하늘' },
    ]
    loadWorkPerformancePeriodMock.mockResolvedValueOnce(successResult({
      employees,
      assignments: buildAssignmentsFromShiftCodes(employees, {
        'night-heavy': {
          '2026-01-05': 'N',
          '2026-01-06': 'N',
          '2026-01-07': 'N',
          '2026-01-08': 'N',
        },
        'weekend-heavy': {
          '2026-01-03': 'D',
          '2026-01-04': 'D',
          '2026-01-12': 'N',
          '2026-01-13': 'N',
          '2026-01-14': 'N',
        },
        baseline: {
          '2026-01-10': 'D',
        },
      }),
      offRequests: [],
      publicHolidayDates: [],
    }))
    const wrapper = createWrapper()

    await runQuery(wrapper)

    expect(wrapper.get('[data-test="work-performance-sort-priority"]').attributes('aria-pressed')).toBe('true')
    expect(getEmployeeRowNames(wrapper)).toEqual(['이서연', '김민지', '박하늘'])
  })

  it('sorts Off request accepted rows by exact accepted count order', async () => {
    const employees = [
      { id: 'two-off', name: '김민지' },
      { id: 'zero-off', name: '박하늘' },
      { id: 'one-off', name: '이서연' },
    ]
    loadWorkPerformancePeriodMock.mockResolvedValueOnce(successResult({
      employees,
      assignments: buildAssignmentsFromShiftCodes(employees, {
        'two-off': {
          '2026-01-05': 'D',
          '2026-01-06': 'O',
          '2026-01-07': 'O',
        },
        'zero-off': {
          '2026-01-05': 'D',
        },
        'one-off': {
          '2026-01-05': 'D',
          '2026-01-08': 'O',
        },
      }),
      offRequests: [
        preference('two-off', '2026-01-06'),
        preference('two-off', '2026-01-07'),
        preference('one-off', '2026-01-08'),
      ],
      publicHolidayDates: [],
    }))
    const wrapper = createWrapper()

    await runQuery(wrapper)

    await wrapper.get('[data-test="work-performance-sort-offRequestAccepted"]').trigger('click')
    await flush()

    expect(wrapper.get('[data-test="work-performance-sort-offRequestAccepted"]').attributes('aria-sort')).toBe('ascending')
    expect(getEmployeeRowNames(wrapper)).toEqual(['박하늘', '이서연', '김민지'])
  })

  it('toggles inline detail expansion without moving focus from the detail button', async () => {
    loadWorkPerformancePeriodMock.mockResolvedValueOnce(successResult())
    const wrapper = createWrapper({ attachTo: document.body })

    await runQuery(wrapper)

    const detailButton = wrapper.get('[data-test="work-performance-detail-emp-1"]')
    expect(detailButton.attributes('aria-expanded')).toBe('false')

    detailButton.element.focus()
    await detailButton.trigger('click')
    await flush()

    expect(detailButton.attributes('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(detailButton.element)

    const detail = wrapper.get('[data-test="work-performance-detail-row-emp-1"]')
    expect(detail.text()).toContain('야간 근무')
    expect(detail.text()).toContain('주말·휴일 근무')
    expect(detail.text()).toContain('Off 요청 수락')
    expect(detail.text()).toContain('1/1 목')
    expect(detail.text()).toContain('공휴일')

    await detailButton.trigger('click')
    await flush()

    expect(detailButton.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[data-test="work-performance-detail-row-emp-1"]').exists()).toBe(false)
    expect(document.activeElement).toBe(detailButton.element)

    const emptyDetailButton = wrapper.get('[data-test="work-performance-detail-emp-2"]')
    await emptyDetailButton.trigger('click')
    await flush()

    expect(wrapper.get('[data-test="work-performance-detail-row-emp-2"]').text()).toContain('해당 날짜 없음')

    wrapper.unmount()
  })

  it('captures query params before async organization loading can finish', async () => {
    const deferredOrg = createDeferred<void>()
    organizationStore.current = null
    loadOrganizationMock.mockImplementationOnce(async () => {
      await deferredOrg.promise
      organizationStore.current = { id: 'org-loaded' }
    })
    loadWorkPerformancePeriodMock.mockResolvedValueOnce(successResult())
    const wrapper = createWrapper()

    await wrapper.get('[data-test="work-performance-year"]').setValue('2026')
    await wrapper.get('[data-test="work-performance-start-month"]').setValue('1')
    await wrapper.get('[data-test="work-performance-end-month"]').setValue('1')
    await wrapper.get('[data-test="work-performance-query"]').trigger('click')
    await nextTick()

    await wrapper.get('[data-test="work-performance-year"]').setValue('2027')
    await wrapper.get('[data-test="work-performance-start-month"]').setValue('5')
    await wrapper.get('[data-test="work-performance-end-month"]').setValue('6')

    deferredOrg.resolve()
    await flush()

    expect(loadWorkPerformancePeriodMock).toHaveBeenCalledWith({
      organizationId: 'org-loaded',
      year: 2026,
      startMonth: 1,
      endMonth: 1,
    })
    expect(wrapper.get('[data-test="work-performance-applied-period"]').text()).toContain('조회 기간: 2026년 1월')
  })

  it('renders finalized data with a top notice when selected months are missing', async () => {
    loadWorkPerformancePeriodMock.mockResolvedValueOnce(successResult({
      missingMonths: ['2026-02', '2026-03'],
    }))
    const wrapper = createWrapper()

    await runQuery(wrapper)

    expect(wrapper.get('[data-test="work-performance-missing-months-notice"]').text()).toContain('확정된 근무표가 없어 실적 계산에서 제외되었습니다')
    expect(wrapper.get('[data-test="work-performance-missing-months-notice"]').text()).toContain('2026년 2월')
    expect(wrapper.get('[data-test="work-performance-missing-months-notice"]').text()).toContain('2026년 3월')
    expect(wrapper.get('[data-test="work-performance-analysis-period"]').text()).toContain('분석 기준: 2026년 1월 확정 데이터')
    expect(wrapper.get('[data-test="work-performance-matrix"]').text()).toContain('김민지')
  })

  it('renders the no finalized schedule state with actions', async () => {
    loadWorkPerformancePeriodMock.mockResolvedValueOnce({
      status: 'noFinalizedSchedule',
    } satisfies WorkPerformanceLoadResult)
    const wrapper = createWrapper()

    await runQuery(wrapper)

    expect(wrapper.get('[data-test="work-performance-state"]').text()).toContain('선택한 기간에 확정된 근무표가 없습니다')

    await wrapper.get('[data-test="work-performance-create"]').trigger('click')
    expect(pushMock).toHaveBeenCalledWith(getScheduleStepRoutePath(1))
  })

  it('renders the no comparison employees state when all employees are excluded', async () => {
    loadWorkPerformancePeriodMock.mockResolvedValueOnce(successResult({ assignments: [] }))
    const wrapper = createWrapper()

    await runQuery(wrapper)

    expect(wrapper.get('[data-test="work-performance-state"]').text()).toContain('이 기간에 근무한 직원이 없습니다')
    expect(wrapper.text()).toContain('선택 기간에 확정 근무 배정이 있는 직원만 비교 대상에 포함됩니다')
    expect(wrapper.find('[data-test="work-performance-matrix"]').exists()).toBe(false)
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
    expect(wrapper.get('[data-test="work-performance-matrix"]').text()).toContain('김민지')
  })
})
