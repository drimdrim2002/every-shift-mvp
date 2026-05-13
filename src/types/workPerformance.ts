export type WorkPerformanceMetricKey = 'night' | 'weekendHoliday' | 'offRequestAccepted'

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
}

export interface WorkPerformanceEmployeeRow {
  id: string
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
  employeeName: string
  priorityScore: number
  metrics: Record<WorkPerformanceMetricKey, WorkPerformanceMetricResult>
}
