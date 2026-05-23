import type {
  ComputeWorkPerformanceFairnessInput,
  WorkPerformanceAssignmentRow,
  WorkPerformanceEmployeeResult,
  WorkPerformanceFairnessResult,
  WorkPerformanceMetricDefinition,
  WorkPerformanceMetricKey,
  WorkPerformanceMetricResult,
  WorkPerformanceMetricSummary,
  WorkPerformancePreferenceRow,
} from '@/types/workPerformance'
import { getPreviousDate, getNextDate } from '@/api/workPerformance'

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const KOREAN_DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const
const OFF_SHIFT_CODE = 'O'
const NIGHT_SHIFT_CODE = 'N'

const METRIC_KEYS = ['night', 'weekend', 'holiday', 'offRequestAccepted'] as const
type ActiveMetricKey = (typeof METRIC_KEYS)[number]


export const metricDefinitions = [
  { key: 'night', label: '야간 근무 횟수', unit: '회', unfavorableDirection: 'aboveAverage' },
  { key: 'weekend', label: '주말 근무 횟수', unit: '회', unfavorableDirection: 'aboveAverage' },
  { key: 'holiday', label: '공휴일 근무 횟수', unit: '회', unfavorableDirection: 'aboveAverage' },
  { key: 'offRequestAccepted', label: 'Off 요청 수락 건수', unit: '건', unfavorableDirection: 'belowAverage' },
] as const satisfies readonly WorkPerformanceMetricDefinition[]

interface DateParts {
  year: number
  month: number
  day: number
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function getMonthDayCount(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function assertYear(year: number): void {
  if (!Number.isInteger(year) || !Number.isFinite(year)) {
    throw new Error(`유효한 연도가 아닙니다: ${year}`)
  }
}

function parseIsoDate(value: string): DateParts | null {
  const match = ISO_DATE_PATTERN.exec(value)

  if (!match) {
    return null
  }

  const [, yearValue, monthValue, dayValue] = match
  const year = Number(yearValue)
  const month = Number(monthValue)
  const day = Number(dayValue)

  if (month < 1 || month > 12) {
    return null
  }

  if (day < 1 || day > getMonthDayCount(year, month)) {
    return null
  }

  return { year, month, day }
}

function assertIsoDate(value: string): DateParts {
  const parts = parseIsoDate(value)

  if (!parts) {
    throw new Error(`유효한 ISO 날짜가 아닙니다: ${value}`)
  }

  return parts
}

function assertMonth(month: number): void {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`유효한 월이 아닙니다: ${month}`)
  }
}

export function isIsoDate(value: string): boolean {
  return parseIsoDate(value) !== null
}

export function compareIsoDate(left: string, right: string): number {
  assertIsoDate(left)
  assertIsoDate(right)

  return left.localeCompare(right)
}

export function listMonthDates(year: number, month: number): string[] {
  assertYear(year)
  assertMonth(month)

  const dayCount = getMonthDayCount(year, month)
  const monthLabel = pad2(month)

  return Array.from(
    { length: dayCount },
    (_value, index) => `${year}-${monthLabel}-${pad2(index + 1)}`,
  )
}

export function listPeriodDates(year: number, startMonth: number, endMonth: number): string[] {
  assertYear(year)
  assertMonth(startMonth)
  assertMonth(endMonth)

  if (startMonth > endMonth) {
    throw new Error('시작 월은 종료 월보다 늦을 수 없습니다')
  }

  return Array.from({ length: endMonth - startMonth + 1 }, (_value, index) =>
    listMonthDates(year, startMonth + index),
  ).flat()
}

export function getIsoDayOfWeek(date: string): number {
  const { year, month, day } = assertIsoDate(date)

  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

export function formatKoreanMonthDay(date: string): string {
  const { month, day } = assertIsoDate(date)
  const dayOfWeek = getIsoDayOfWeek(date)

  return `${month}/${day} ${KOREAN_DAY_LABELS[dayOfWeek]}`
}

function mapKey(employeeId: string, date: string): string {
  return `${employeeId}\u0000${date}`
}

function normalizeShiftCode(shiftCode: string | null | undefined): string | null {
  const normalizedShiftCode = shiftCode?.trim().toUpperCase() ?? ''

  return normalizedShiftCode.length > 0 ? normalizedShiftCode : null
}

function isWorkedAssignment(assignment: WorkPerformanceAssignmentRow | undefined): boolean {
  const shiftCode = normalizeShiftCode(assignment?.shiftCode)

  return shiftCode !== null && shiftCode !== OFF_SHIFT_CODE
}

function isOffRequestAccepted(
  request: WorkPerformancePreferenceRow,
): boolean {
  return request.resolutionStatus === 'fulfilled'
}

function calculateAverage(values: readonly number[]): number {
  if (values.length === 0) {
    return 0
  }

  return values.reduce((total, value) => total + value, 0) / values.length
}

function calculateSummary(values: readonly number[]): WorkPerformanceMetricSummary {
  if (values.length === 0) {
    return {
      average: 0,
      min: 0,
      max: 0,
    }
  }

  return {
    average: calculateAverage(values),
    min: Math.min(...values),
    max: Math.max(...values),
  }
}

function buildMetricResult(
  key: WorkPerformanceMetricKey,
  count: number,
  average: number,
  evidenceDates: string[],
  threshold: number,
): WorkPerformanceMetricResult {
  const delta = count - average
  const highlighted =
    key === 'offRequestAccepted' ? average - count >= threshold : count - average >= threshold

  return {
    key,
    count,
    average,
    delta,
    highlighted,
    evidenceDates: [...evidenceDates].sort(compareIsoDate),
  }
}

function getUnfavorableDeviation(
  metricKey: WorkPerformanceMetricKey,
  metric: WorkPerformanceMetricResult,
): number {
  if (metricKey === 'offRequestAccepted') {
    return Math.max(0, metric.average - metric.count)
  }

  return Math.max(0, metric.count - metric.average)
}

export function clampWorkPerformanceThresholdDays(value: number): number {
  if (!Number.isFinite(value)) {
    return 1
  }

  return Math.min(10, Math.max(1, value))
}

export function computeWorkPerformanceFairness({
  period,
  employees,
  assignments,
  offRequests,
  publicHolidayDates,
  highlightThresholdDays,
}: ComputeWorkPerformanceFairnessInput): WorkPerformanceFairnessResult {
  const requiredDates = listPeriodDates(period.year, period.startMonth, period.endMonth)
  const requiredDateSet = new Set(requiredDates)
  const holidayDateSet = new Set(publicHolidayDates)
  const threshold = clampWorkPerformanceThresholdDays(highlightThresholdDays)
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]))
  const assignmentsByEmployeeDate = new Map<string, WorkPerformanceAssignmentRow>()
  const workedDatesByEmployee = new Map<string, Set<string>>()
  const prevStartDate = getPreviousDate(period.startDate)

  assignments.forEach((assignment) => {
    if (!employeeById.has(assignment.employeeId)) {
      return
    }

    if (requiredDateSet.has(assignment.date) || assignment.date === prevStartDate) {
      assignmentsByEmployeeDate.set(mapKey(assignment.employeeId, assignment.date), assignment)
    }

    if (requiredDateSet.has(assignment.date) && isWorkedAssignment(assignment)) {
      const workedDates = workedDatesByEmployee.get(assignment.employeeId) ?? new Set<string>()
      workedDates.add(assignment.date)
      workedDatesByEmployee.set(assignment.employeeId, workedDates)
    }
  })

  const offRequestDatesByEmployee = new Map<string, Set<string>>()

  offRequests.forEach((request) => {
    if (!employeeById.has(request.employeeId) || !requiredDateSet.has(request.date) || request.requestCode !== 'O') {
      return
    }

    if (isOffRequestAccepted(request)) {
      const requestDates = offRequestDatesByEmployee.get(request.employeeId) ?? new Set<string>()
      requestDates.add(request.date)
      offRequestDatesByEmployee.set(request.employeeId, requestDates)
    }
  })

  const includedEmployees = employees.filter((employee) => (workedDatesByEmployee.get(employee.id)?.size ?? 0) > 0)
  const excludedEmployeeCount = employees.length - includedEmployees.length

  const countRows = includedEmployees.map((employee) => {
    const nightEvidenceDates: string[] = []
    const weekendEvidenceDates: string[] = []
    const holidayEvidenceDates: string[] = []
    const offAcceptedEvidenceDates: string[] = []
    const offRequestDates = offRequestDatesByEmployee.get(employee.id) ?? new Set<string>()

    requiredDates.forEach((date) => {
      const assignment = assignmentsByEmployeeDate.get(mapKey(employee.id, date))

      // 1. 야간 근무 (night)
      if (normalizeShiftCode(assignment?.shiftCode) === NIGHT_SHIFT_CODE) {
        nightEvidenceDates.push(date)
      }

      // 2. 주말 근무 (weekend): 금요일 야간(N), 토요일 전체(D/E/N), 일요일 주간/이브닝(D/E)
      const dayOfWeek = getIsoDayOfWeek(date)
      const isWorked = isWorkedAssignment(assignment)
      if (isWorked) {
        const shift = normalizeShiftCode(assignment?.shiftCode)
        if (
          (dayOfWeek === 5 && shift === NIGHT_SHIFT_CODE) || // 금요일 야간
          (dayOfWeek === 6 && (shift === 'D' || shift === 'E' || shift === NIGHT_SHIFT_CODE)) || // 토요일 전체
          (dayOfWeek === 0 && (shift === 'D' || shift === 'E')) // 일요일 주간/이브닝
        ) {
          weekendEvidenceDates.push(date)
        }
      }

      // 3. 공휴일 근무 (holiday): 공휴일 당일 주간/이브닝(D/E), 공휴일 전날 야간(N)
      const isHoliday = holidayDateSet.has(date)
      const nextDateStr = getNextDate(date)
      const isNextDayHoliday = holidayDateSet.has(nextDateStr)
      if (isWorked) {
        const shift = normalizeShiftCode(assignment?.shiftCode)
        if (
          (isHoliday && (shift === 'D' || shift === 'E')) || // 공휴일 당일 D/E
          (isNextDayHoliday && shift === NIGHT_SHIFT_CODE) // 공휴일 전날 야간 N
        ) {
          holidayEvidenceDates.push(date)
        }
      }

      // 4. Off 요청 수락 (offRequestAccepted): 해당일에 Off 신청('O')이 존재할 때, 조건 A(전날 N 근무 없음) & 조건 B(당일 D/E/N 근무 없음)를 모두 만족하는 경우
      if (offRequestDates.has(date)) {
        const prevDateStr = getPreviousDate(date)
        const prevAssignment = assignmentsByEmployeeDate.get(mapKey(employee.id, prevDateStr))
        // If previous assignment is missing (e.g., previous month's schedule not finalized), default to no night shift
        const hasPrevNight = prevAssignment
          ? normalizeShiftCode(prevAssignment.shiftCode) === NIGHT_SHIFT_CODE
          : false
        const hasCurrentWork = isWorkedAssignment(assignment) // D, E, N 근무 배정이 없어야 함
        
        if (!hasPrevNight && !hasCurrentWork) {
          offAcceptedEvidenceDates.push(date)
        }
      }
    })

    return {
      employee,
      counts: {
        night: nightEvidenceDates.length,
        weekend: weekendEvidenceDates.length,
        holiday: holidayEvidenceDates.length,
        offRequestAccepted: offAcceptedEvidenceDates.length,
      } satisfies Record<ActiveMetricKey, number>,
      evidenceDates: {
        night: nightEvidenceDates,
        weekend: weekendEvidenceDates,
        holiday: holidayEvidenceDates,
        offRequestAccepted: offAcceptedEvidenceDates,
      } satisfies Record<ActiveMetricKey, string[]>,
    }
  })

  const summary = METRIC_KEYS.reduce(
    (result, key) => ({
      ...result,
      [key]: calculateSummary(countRows.map((row) => row.counts[key])),
    }),
    {} as Record<ActiveMetricKey, WorkPerformanceMetricSummary>,
  )

  const rows: WorkPerformanceEmployeeResult[] = countRows.map(({ employee, counts, evidenceDates }) => {
    const metrics = METRIC_KEYS.reduce(
      (result, key) => ({
        ...result,
        [key]: buildMetricResult(key, counts[key], summary[key]!.average, evidenceDates[key], threshold),
      }),
      {} as Record<WorkPerformanceMetricKey, WorkPerformanceMetricResult>,
    )
    const priorityScore =
      getUnfavorableDeviation('night', metrics.night) +
      getUnfavorableDeviation('weekend', metrics.weekend) +
      getUnfavorableDeviation('holiday', metrics.holiday) +
      getUnfavorableDeviation('offRequestAccepted', metrics.offRequestAccepted)

    return {
      employeeId: employee.id,
      employeeDisplayId: employee.employeeId?.trim() || employee.id,
      employeeName: employee.name,
      priorityScore,
      metrics,
    }
  })

  rows.sort((left, right) => {
    const priorityDelta = right.priorityScore - left.priorityScore

    if (priorityDelta !== 0) {
      return priorityDelta
    }

    const nightDelta =
      getUnfavorableDeviation('night', right.metrics.night) -
      getUnfavorableDeviation('night', left.metrics.night)

    if (nightDelta !== 0) {
      return nightDelta
    }

    const weekendDelta =
      getUnfavorableDeviation('weekend', right.metrics.weekend) -
      getUnfavorableDeviation('weekend', left.metrics.weekend)

    if (weekendDelta !== 0) {
      return weekendDelta
    }

    const holidayDelta =
      getUnfavorableDeviation('holiday', right.metrics.holiday) -
      getUnfavorableDeviation('holiday', left.metrics.holiday)

    if (holidayDelta !== 0) {
      return holidayDelta
    }

    const offRequestAcceptedDelta =
      getUnfavorableDeviation('offRequestAccepted', right.metrics.offRequestAccepted) -
      getUnfavorableDeviation('offRequestAccepted', left.metrics.offRequestAccepted)

    if (offRequestAcceptedDelta !== 0) {
      return offRequestAcceptedDelta
    }

    return left.employeeName.localeCompare(right.employeeName, 'ko') ||
      left.employeeDisplayId.localeCompare(right.employeeDisplayId, 'ko') ||
      left.employeeId.localeCompare(right.employeeId)
  })

  return {
    metricDefinitions,
    highlightThresholdDays: threshold,
    rows,
    summary: summary as Record<WorkPerformanceMetricKey, WorkPerformanceMetricSummary>,
    excludedEmployeeCount,
  }
}
