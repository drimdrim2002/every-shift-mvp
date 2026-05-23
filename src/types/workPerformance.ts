export type WorkPerformanceMetricKey = 'night' | 'weekend' | 'holiday' | 'offRequestAccepted'

export type WorkPerformanceMetricDirection = 'aboveAverage' | 'belowAverage'

export type WorkPerformancePreferenceResolutionStatus = 'pending' | 'fulfilled' | 'unfulfilled'

export interface WorkPerformancePeriod {
  year: number
  startMonth: number
  endMonth: number
  startDate: string
  endDate: string
}

export interface WorkPerformanceAssignmentRow {
  scheduleVersionId: string
  employeeId: string
  date: string
  shiftId: string | null
  shiftCode: string | null
  shiftName: string | null
}

export interface WorkPerformancePreferenceRow {
  scheduleVersionId: string
  employeeId: string
  date: string
  requestCode: 'O'
  resolutionStatus?: WorkPerformancePreferenceResolutionStatus | null
}

export interface WorkPerformanceEmployeeRow {
  id: string
  employeeId?: string | null
  name: string
}

export interface WorkPerformanceMetricResult {
  key: WorkPerformanceMetricKey
  count: number
  average: number
  delta: number
  highlighted: boolean
  evidenceDates: string[]
}

export interface WorkPerformanceEmployeeResult {
  employeeId: string
  employeeDisplayId: string
  employeeName: string
  priorityScore: number
  metrics: Record<WorkPerformanceMetricKey, WorkPerformanceMetricResult>
}

export interface WorkPerformanceMetricDefinition {
  key: WorkPerformanceMetricKey
  label: string
  unit: '회' | '건'
  unfavorableDirection: WorkPerformanceMetricDirection
}

export interface WorkPerformanceMetricSummary {
  average: number
  min: number
  max: number
}

export interface ComputeWorkPerformanceFairnessInput {
  period: WorkPerformancePeriod
  employees: WorkPerformanceEmployeeRow[]
  assignments: WorkPerformanceAssignmentRow[]
  offRequests: WorkPerformancePreferenceRow[]
  publicHolidayDates: string[]
  highlightThresholdDays: number
}

export interface WorkPerformanceFairnessResult {
  metricDefinitions: readonly WorkPerformanceMetricDefinition[]
  highlightThresholdDays: number
  rows: WorkPerformanceEmployeeResult[]
  summary: Record<WorkPerformanceMetricKey, WorkPerformanceMetricSummary>
  excludedEmployeeCount: number
}
