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

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const KOREAN_DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const
const OFF_SHIFT_CODE = 'O'
const NIGHT_SHIFT_CODE = 'N'

const METRIC_KEYS = ['night', 'weekendHoliday', 'offRequestAccepted'] as const

export const metricDefinitions = [
  { key: 'night', label: '야간 근무 횟수', unit: '회', unfavorableDirection: 'aboveAverage' },
  { key: 'weekendHoliday', label: '주말·휴일 근무 횟수', unit: '회', unfavorableDirection: 'aboveAverage' },
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
  const holidayDateSet = new Set(publicHolidayDates.filter((date) => requiredDateSet.has(date)))
  const threshold = clampWorkPerformanceThresholdDays(highlightThresholdDays)
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]))
  const assignmentsByEmployeeDate = new Map<string, WorkPerformanceAssignmentRow>()
  const workedDatesByEmployee = new Map<string, Set<string>>()

  assignments.forEach((assignment) => {
    if (!employeeById.has(assignment.employeeId) || !requiredDateSet.has(assignment.date)) {
      return
    }

    assignmentsByEmployeeDate.set(mapKey(assignment.employeeId, assignment.date), assignment)

    if (isWorkedAssignment(assignment)) {
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
    const weekendHolidayEvidenceDates: string[] = []
    const offAcceptedEvidenceDates: string[] = []
    const offRequestDates = offRequestDatesByEmployee.get(employee.id) ?? new Set<string>()

    requiredDates.forEach((date) => {
      const assignment = assignmentsByEmployeeDate.get(mapKey(employee.id, date))
      const worked = isWorkedAssignment(assignment)
      const isWeekend = getIsoDayOfWeek(date) === 0 || getIsoDayOfWeek(date) === 6
      const isHoliday = holidayDateSet.has(date)

      if (normalizeShiftCode(assignment?.shiftCode) === NIGHT_SHIFT_CODE) {
        nightEvidenceDates.push(date)
      }

      if (worked && (isWeekend || isHoliday)) {
        weekendHolidayEvidenceDates.push(date)
      }

      if (offRequestDates.has(date)) {
        offAcceptedEvidenceDates.push(date)
      }
    })

    return {
      employee,
      counts: {
        night: nightEvidenceDates.length,
        weekendHoliday: weekendHolidayEvidenceDates.length,
        offRequestAccepted: offAcceptedEvidenceDates.length,
      } satisfies Record<WorkPerformanceMetricKey, number>,
      evidenceDates: {
        night: nightEvidenceDates,
        weekendHoliday: weekendHolidayEvidenceDates,
        offRequestAccepted: offAcceptedEvidenceDates,
      } satisfies Record<WorkPerformanceMetricKey, string[]>,
    }
  })

  const summary = METRIC_KEYS.reduce(
    (result, key) => ({
      ...result,
      [key]: calculateSummary(countRows.map((row) => row.counts[key])),
    }),
    {} as Record<WorkPerformanceMetricKey, WorkPerformanceMetricSummary>,
  )

  const rows: WorkPerformanceEmployeeResult[] = countRows.map(({ employee, counts, evidenceDates }) => {
    const metrics = METRIC_KEYS.reduce(
      (result, key) => ({
        ...result,
        [key]: buildMetricResult(key, counts[key], summary[key].average, evidenceDates[key], threshold),
      }),
      {} as Record<WorkPerformanceMetricKey, WorkPerformanceMetricResult>,
    )
    const priorityScore =
      getUnfavorableDeviation('night', metrics.night) +
      getUnfavorableDeviation('weekendHoliday', metrics.weekendHoliday) +
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

    const weekendHolidayDelta =
      getUnfavorableDeviation('weekendHoliday', right.metrics.weekendHoliday) -
      getUnfavorableDeviation('weekendHoliday', left.metrics.weekendHoliday)

    if (weekendHolidayDelta !== 0) {
      return weekendHolidayDelta
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
    summary,
    excludedEmployeeCount,
  }
}
