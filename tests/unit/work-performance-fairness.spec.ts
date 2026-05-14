import { describe, expect, it } from 'vitest'
import type {
  WorkPerformanceAssignmentRow,
  WorkPerformanceEmployeeRow,
  WorkPerformancePeriod,
  WorkPerformancePreferenceRow,
} from '@/types/workPerformance'
import {
  compareIsoDate,
  computeWorkPerformanceFairness,
  formatKoreanMonthDay,
  getIsoDayOfWeek,
  isIsoDate,
  listMonthDates,
  listPeriodDates,
  clampWorkPerformanceThresholdDays,
} from '@/utils/workPerformanceFairness'

describe('work performance fairness date helpers', () => {
  it('lists every date in a requested month using ISO date strings', () => {
    expect(listMonthDates(2026, 1)).toEqual(
      Array.from({ length: 31 }, (_value, index) => `2026-01-${String(index + 1).padStart(2, '0')}`),
    )
    expect(listMonthDates(2026, 3)).toEqual(
      Array.from({ length: 31 }, (_value, index) => `2026-03-${String(index + 1).padStart(2, '0')}`),
    )
    expect(listMonthDates(2028, 2)).toEqual(
      Array.from({ length: 29 }, (_value, index) => `2028-02-${String(index + 1).padStart(2, '0')}`),
    )
  })

  it('lists every date across an inclusive month period', () => {
    expect(listPeriodDates(2026, 1, 1)).toEqual(listMonthDates(2026, 1))
    expect(listPeriodDates(2028, 2, 2)).toEqual(listMonthDates(2028, 2))
    expect(listPeriodDates(2026, 9, 10)).toEqual([
      ...listMonthDates(2026, 9),
      ...listMonthDates(2026, 10),
    ])
    expect(listPeriodDates(2026, 9, 10)).toHaveLength(61)
  })

  it('rejects a period whose start month is after its end month', () => {
    expect(() => listPeriodDates(2026, 3, 1)).toThrow('시작 월은 종료 월보다 늦을 수 없습니다')
  })

  it('rejects non-finite and non-integer years', () => {
    expect(() => listMonthDates(Number.NaN, 1)).toThrow('유효한 연도가 아닙니다')
    expect(() => listMonthDates(2026.5, 1)).toThrow('유효한 연도가 아닙니다')
    expect(() => listPeriodDates(Number.POSITIVE_INFINITY, 1, 1)).toThrow('유효한 연도가 아닙니다')
  })

  it('calculates the ISO date day of week without local timezone parsing', () => {
    expect(getIsoDayOfWeek('2026-01-01')).toBe(4)
    expect(getIsoDayOfWeek('2026-01-03')).toBe(6)
    expect(getIsoDayOfWeek('2026-03-01')).toBe(0)
    expect(getIsoDayOfWeek('2026-10-09')).toBe(5)
    expect(getIsoDayOfWeek('2028-02-29')).toBe(2)
  })

  it('formats ISO dates as Korean month/day labels', () => {
    expect(formatKoreanMonthDay('2026-01-03')).toBe('1/3 토')
    expect(formatKoreanMonthDay('2026-03-01')).toBe('3/1 일')
    expect(formatKoreanMonthDay('2026-10-09')).toBe('10/9 금')
    expect(formatKoreanMonthDay('2028-02-29')).toBe('2/29 화')
  })

  it('validates and compares ISO date-only strings', () => {
    expect(isIsoDate('2026-01-01')).toBe(true)
    expect(isIsoDate('2028-02-29')).toBe(true)
    expect(isIsoDate('2026-02-29')).toBe(false)
    expect(isIsoDate('2026-1-01')).toBe(false)
    expect(compareIsoDate('2026-01-01', '2026-01-02')).toBeLessThan(0)
    expect(compareIsoDate('2026-01-02', '2026-01-01')).toBeGreaterThan(0)
    expect(compareIsoDate('2026-01-01', '2026-01-01')).toBe(0)
  })
})

const period: WorkPerformancePeriod = {
  year: 2026,
  startMonth: 1,
  endMonth: 1,
  startDate: '2026-01-01',
  endDate: '2026-01-31',
}

const employees: WorkPerformanceEmployeeRow[] = [
  { id: 'employee-a', name: '김민지' },
  { id: 'employee-b', name: '박서준' },
  { id: 'employee-c', name: '이지은' },
  { id: 'employee-d', name: '최유리' },
]

function fullOffAssignments(employeeId: string): WorkPerformanceAssignmentRow[] {
  return listPeriodDates(period.year, period.startMonth, period.endMonth).map((date) => ({
    scheduleVersionId: 'version-1',
    employeeId,
    date,
    shiftId: 'shift-off',
    shiftCode: 'O',
    shiftName: 'Off',
  }))
}

function setWorkedDates(
  rows: WorkPerformanceAssignmentRow[],
  employeeId: string,
  dates: readonly string[],
  shiftCode: 'D' | 'N',
): void {
  const dateSet = new Set(dates)

  rows.forEach((row) => {
    if (row.employeeId !== employeeId || !dateSet.has(row.date)) {
      return
    }

    row.shiftId = `shift-${shiftCode.toLowerCase()}`
    row.shiftCode = shiftCode
    row.shiftName = shiftCode === 'N' ? '야간' : '주간'
  })
}

function offRequest(employeeId: string, date: string): WorkPerformancePreferenceRow {
  return {
    scheduleVersionId: 'version-1',
    employeeId,
    date,
    requestCode: 'O',
  }
}

function buildFairnessFixture(): {
  assignments: WorkPerformanceAssignmentRow[]
  offRequests: WorkPerformancePreferenceRow[]
} {
  const assignments = employees.flatMap((employee) => fullOffAssignments(employee.id))

  setWorkedDates(
    assignments,
    'employee-a',
    ['2026-01-02', '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09', '2026-01-12'],
    'N',
  )
  setWorkedDates(assignments, 'employee-a', ['2026-01-01', '2026-01-03', '2026-01-04', '2026-01-10'], 'D')

  setWorkedDates(assignments, 'employee-b', ['2026-01-02', '2026-01-05', '2026-01-06', '2026-01-07'], 'N')
  setWorkedDates(assignments, 'employee-b', ['2026-01-01', '2026-01-03', '2026-01-04'], 'D')

  setWorkedDates(assignments, 'employee-c', ['2026-01-02'], 'N')
  setWorkedDates(assignments, 'employee-c', ['2026-01-01'], 'D')

  return {
    assignments: assignments.filter(
      (assignment) => assignment.employeeId !== 'employee-d' || assignment.date !== '2026-01-31',
    ),
    offRequests: [
      offRequest('employee-a', '2026-01-01'),
      offRequest('employee-a', '2026-01-03'),
      offRequest('employee-a', '2026-01-04'),
      offRequest('employee-a', '2026-01-10'),
      offRequest('employee-b', '2026-01-10'),
      offRequest('employee-b', '2026-01-11'),
      offRequest('employee-b', '2026-01-12'),
      offRequest('employee-b', '2026-01-13'),
      offRequest('employee-b', '2026-01-14'),
      offRequest('employee-b', '2026-01-15'),
      offRequest('employee-c', '2026-01-10'),
      offRequest('employee-c', '2026-01-11'),
      offRequest('employee-c', '2026-01-12'),
      offRequest('employee-c', '2026-01-13'),
      offRequest('employee-c', '2026-01-14'),
      offRequest('employee-c', '2026-01-15'),
      offRequest('employee-d', '2026-01-10'),
    ],
  }
}

function workedAssignment(
  employeeId: string,
  date: string,
  shiftCode: 'D' | 'N' = 'D',
): WorkPerformanceAssignmentRow {
  return {
    scheduleVersionId: 'version-1',
    employeeId,
    date,
    shiftId: `shift-${shiftCode.toLowerCase()}`,
    shiftCode,
    shiftName: shiftCode === 'N' ? '야간' : '주간',
  }
}

describe('computeWorkPerformanceFairness', () => {
  it('includes employees with worked assignments when finalized schedules store only worked days', () => {
    const sparseEmployees: WorkPerformanceEmployeeRow[] = [
      { id: 'employee-a', name: '김민지' },
      { id: 'employee-b', name: '박서준' },
      { id: 'employee-c', name: '이휴무' },
    ]
    const assignments: WorkPerformanceAssignmentRow[] = [
      workedAssignment('employee-a', '2026-01-01', 'D'),
      workedAssignment('employee-a', '2026-01-02', 'N'),
      workedAssignment('employee-b', '2026-01-03', 'D'),
      {
        scheduleVersionId: 'version-1',
        employeeId: 'employee-c',
        date: '2026-01-04',
        shiftId: 'shift-off',
        shiftCode: 'O',
        shiftName: 'Off',
      },
    ]

    const result = computeWorkPerformanceFairness({
      period,
      employees: sparseEmployees,
      assignments,
      offRequests: [],
      publicHolidayDates: ['2026-01-01'],
      highlightThresholdDays: 1,
    })

    expect(result.rows.map((row) => row.employeeId)).toEqual(['employee-a', 'employee-b'])
    expect(result.excludedEmployeeCount).toBe(1)
    expect(result.rows.find((row) => row.employeeId === 'employee-a')?.metrics.night.count).toBe(1)
    expect(result.rows.find((row) => row.employeeId === 'employee-a')?.metrics.weekendHoliday.count).toBe(1)
    expect(result.rows.find((row) => row.employeeId === 'employee-b')?.metrics.weekendHoliday.count).toBe(1)
  })

  it('computes metric counts, evidence, summaries, exclusions, and default priority sorting', () => {
    const { assignments, offRequests } = buildFairnessFixture()

    const result = computeWorkPerformanceFairness({
      period,
      employees,
      assignments,
      offRequests,
      publicHolidayDates: ['2026-01-01', '2026-01-03'],
      highlightThresholdDays: 3,
    })

    expect(result.excludedEmployeeCount).toBe(1)
    expect(result.metricDefinitions).toEqual([
      { key: 'night', label: '야간 근무', unfavorableDirection: 'aboveAverage' },
      { key: 'weekendHoliday', label: '주말·휴일 근무', unfavorableDirection: 'aboveAverage' },
      { key: 'offRequestAccepted', label: 'Off 요청 수락', unfavorableDirection: 'belowAverage' },
    ])
    expect(result.summary).toEqual({
      night: { average: 4, min: 1, max: 7 },
      weekendHoliday: { average: 8 / 3, min: 1, max: 4 },
      offRequestAccepted: { average: 4, min: 0, max: 6 },
    })

    expect(result.rows.map((row) => row.employeeName)).toEqual(['김민지', '박서준', '이지은'])

    expect(result.rows[0]?.metrics.night).toMatchObject({
      count: 7,
      average: 4,
      delta: 3,
      highlighted: true,
      evidenceDates: [
        '2026-01-02',
        '2026-01-05',
        '2026-01-06',
        '2026-01-07',
        '2026-01-08',
        '2026-01-09',
        '2026-01-12',
      ],
    })
    expect(result.rows[0]?.metrics.weekendHoliday).toMatchObject({
      count: 4,
      average: 8 / 3,
      delta: 4 - 8 / 3,
      highlighted: false,
      evidenceDates: ['2026-01-01', '2026-01-03', '2026-01-04', '2026-01-10'],
    })
    expect(result.rows[0]?.metrics.offRequestAccepted).toMatchObject({
      count: 0,
      average: 4,
      delta: -4,
      highlighted: true,
      evidenceDates: [],
    })

    expect(result.rows[1]?.metrics.offRequestAccepted).toMatchObject({
      count: 6,
      evidenceDates: [
        '2026-01-10',
        '2026-01-11',
        '2026-01-12',
        '2026-01-13',
        '2026-01-14',
        '2026-01-15',
      ],
    })
    expect(result.rows[2]?.metrics.offRequestAccepted).toMatchObject({
      count: 6,
      evidenceDates: [
        '2026-01-10',
        '2026-01-11',
        '2026-01-12',
        '2026-01-13',
        '2026-01-14',
        '2026-01-15',
      ],
    })
  })

  it('sorts ties by unfavorable deviations before stable employee name and id order', () => {
    const tieEmployees: WorkPerformanceEmployeeRow[] = [
      { id: '2', name: '동명이' },
      { id: '1', name: '동명이' },
      { id: 'night-heavy', name: '나야간' },
      { id: 'weekend-heavy', name: '다주말' },
      { id: 'off-short', name: '라오프' },
    ]
    const assignments = tieEmployees.flatMap((employee) => fullOffAssignments(employee.id))

    setWorkedDates(assignments, 'night-heavy', ['2026-01-05', '2026-01-06'], 'N')
    setWorkedDates(assignments, 'weekend-heavy', ['2026-01-03', '2026-01-04'], 'D')
    setWorkedDates(assignments, '2', ['2026-01-13'], 'D')
    setWorkedDates(assignments, '1', ['2026-01-13'], 'D')

    const offRequests = [
      offRequest('2', '2026-01-10'),
      offRequest('1', '2026-01-10'),
      offRequest('night-heavy', '2026-01-10'),
      offRequest('weekend-heavy', '2026-01-10'),
      offRequest('off-short', '2026-01-10'),
    ]
    setWorkedDates(assignments, 'off-short', ['2026-01-10'], 'D')

    const result = computeWorkPerformanceFairness({
      period,
      employees: tieEmployees,
      assignments,
      offRequests,
      publicHolidayDates: ['2026-01-01'],
      highlightThresholdDays: 1,
    })

    expect(result.rows.map((row) => row.employeeId)).toEqual([
      'night-heavy',
      'weekend-heavy',
      'off-short',
      '1',
      '2',
    ])
  })

  it('clamps highlight threshold to the supported one to ten day range', () => {
    const { assignments, offRequests } = buildFairnessFixture()

    const result = computeWorkPerformanceFairness({
      period,
      employees,
      assignments,
      offRequests,
      publicHolidayDates: ['2026-01-01', '2026-01-03'],
      highlightThresholdDays: 0,
    })

    expect(clampWorkPerformanceThresholdDays(-1)).toBe(1)
    expect(clampWorkPerformanceThresholdDays(0)).toBe(1)
    expect(clampWorkPerformanceThresholdDays(1)).toBe(1)
    expect(clampWorkPerformanceThresholdDays(10)).toBe(10)
    expect(clampWorkPerformanceThresholdDays(999)).toBe(10)
    expect(clampWorkPerformanceThresholdDays(Number.NaN)).toBe(1)
    expect(clampWorkPerformanceThresholdDays(Number.POSITIVE_INFINITY)).toBe(1)
    expect(result.highlightThresholdDays).toBe(1)
    expect(result.rows.find((row) => row.employeeName === '김민지')?.metrics.weekendHoliday.highlighted).toBe(true)
  })

  it('does not count null, empty, or whitespace shift codes as weekend or holiday work', () => {
    const employee: WorkPerformanceEmployeeRow = { id: 'edge-employee', name: '검증간호사' }
    const assignments = fullOffAssignments(employee.id)

    assignments.find((assignment) => assignment.date === '2026-01-01')!.shiftCode = null
    assignments.find((assignment) => assignment.date === '2026-01-03')!.shiftCode = ''
    assignments.find((assignment) => assignment.date === '2026-01-04')!.shiftCode = '   '
    assignments.find((assignment) => assignment.date === '2026-01-05')!.shiftCode = 'D'

    const result = computeWorkPerformanceFairness({
      period,
      employees: [employee],
      assignments,
      offRequests: [],
      publicHolidayDates: ['2026-01-01'],
      highlightThresholdDays: 1,
    })

    expect(result.rows[0]?.metrics.weekendHoliday).toMatchObject({
      count: 0,
      evidenceDates: [],
    })
  })

  it('normalizes lowercase and padded night and Off shift codes', () => {
    const employee: WorkPerformanceEmployeeRow = { id: 'normalized-employee', name: '정규화간호사' }
    const assignments = fullOffAssignments(employee.id)

    assignments.find((assignment) => assignment.date === '2026-01-02')!.shiftCode = ' n '
    assignments.find((assignment) => assignment.date === '2026-01-03')!.shiftCode = ' o '
    assignments.find((assignment) => assignment.date === '2026-01-04')!.shiftCode = ' d '

    const result = computeWorkPerformanceFairness({
      period,
      employees: [employee],
      assignments,
      offRequests: [offRequest(employee.id, '2026-01-03')],
      publicHolidayDates: ['2026-01-01'],
      highlightThresholdDays: 1,
    })

    expect(result.rows[0]?.metrics.night).toMatchObject({
      count: 1,
      evidenceDates: ['2026-01-02'],
    })
    expect(result.rows[0]?.metrics.weekendHoliday).toMatchObject({
      count: 1,
      evidenceDates: ['2026-01-04'],
    })
    expect(result.rows[0]?.metrics.offRequestAccepted).toMatchObject({
      count: 1,
      evidenceDates: ['2026-01-03'],
    })
  })
})
