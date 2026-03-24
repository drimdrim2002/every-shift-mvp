export type DashboardScope = 'admin' | 'employee'

export type DashboardGrouping = 'employee' | 'site'

export type DashboardResponseState = 'ready' | 'empty' | 'dependency'

export type DashboardStoreStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'empty'
  | 'dependency'
  | 'blocked'
  | 'error'

export type DashboardEmptyReason = 'no_persisted_schedule'

export type EmployeeDashboardDependencyReason = 'employee_mapping_required'

export type DashboardApiErrorCode =
  | 'DASHBOARD_ACCESS_DENIED'
  | 'DASHBOARD_ORGANIZATION_SCOPE_REQUIRED'
  | 'DASHBOARD_INVALID_PERIOD_MONTH'
  | 'DASHBOARD_UNSUPPORTED_RANK_SCOPE'
  | 'DASHBOARD_INTERNAL_ERROR'

export interface DashboardFilterOption {
  value: string
  label: string
}

export interface DashboardFilterCapabilities {
  siteFilterVisible: boolean
  rankFilterVisible: boolean
}

export interface DashboardStoreError {
  code: DashboardApiErrorCode | null
  message: string
}

export interface DashboardFilters {
  periodMonth: string
  siteId?: string | null
  rankId?: string | null
}

export interface AdminDashboardScopeSelector {
  organizationId?: string | null
  grouping: DashboardGrouping
}

export interface DashboardResolvedFilters {
  periodMonth: string
  siteId: string | null
  rankId: string | null
}

export interface AdminDashboardStatsRequest {
  filters: DashboardFilters
  scope: AdminDashboardScopeSelector
}

export interface EmployeeDashboardStatsRequest {
  filters: DashboardFilters
}

export interface AdminDashboardResolvedScope {
  organizationId: string
  grouping: DashboardGrouping
}

export interface EmployeeDashboardResolvedScope {
  organizationId: string | null
  employeeId: string | null
}

export interface AdminDashboardSummaryMetrics {
  groupCount: number
  nightShiftAvg: number | null
  nightShiftMin: number | null
  nightShiftMax: number | null
  nightShiftGap: number | null
  weekendWorkAvg: number | null
  weekendWorkMin: number | null
  weekendWorkMax: number | null
  weekendWorkGap: number | null
}

export interface AdminEmployeeMetricRow {
  kind: 'employee'
  employeeId: string
  employeeName: string
  siteId: string | null
  siteName: string | null
  rankId: string | null
  rankName: string | null
  nightShiftCount: number
  weekendWorkCount: number
}

export interface AdminSiteMetricRow {
  kind: 'site'
  siteId: string
  siteName: string
  nightShiftCount: number
  weekendWorkCount: number
}

export type AdminDashboardMetricRow = AdminEmployeeMetricRow | AdminSiteMetricRow

export interface EmployeeDashboardSummaryMetrics {
  myNightShiftCount: number
  myWeekendWorkCount: number
  teamNightShiftAvg: number | null
  teamWeekendWorkAvg: number | null
  teamMemberCount: number
}

export interface DashboardCalendarAssignment {
  date: string
  shiftCode: string
  shiftName: string | null
  siteId: string | null
  siteName: string | null
}

export interface AdminDashboardReadyResponse {
  dashboardScope: 'admin'
  state: 'ready'
  filters: DashboardResolvedFilters
  resolvedScope: AdminDashboardResolvedScope
  summary: AdminDashboardSummaryMetrics
  rows: AdminDashboardMetricRow[]
}

export interface AdminDashboardEmptyResponse {
  dashboardScope: 'admin'
  state: 'empty'
  reason: DashboardEmptyReason
  filters: DashboardResolvedFilters
  resolvedScope: AdminDashboardResolvedScope
  summary: null
  rows: []
}

export type AdminDashboardStatsResponse =
  | AdminDashboardReadyResponse
  | AdminDashboardEmptyResponse

export interface EmployeeDashboardReadyResponse {
  dashboardScope: 'employee'
  state: 'ready'
  filters: DashboardResolvedFilters
  resolvedScope: EmployeeDashboardResolvedScope
  summary: EmployeeDashboardSummaryMetrics
  calendarAssignments: DashboardCalendarAssignment[]
}

export interface EmployeeDashboardEmptyResponse {
  dashboardScope: 'employee'
  state: 'empty'
  reason: DashboardEmptyReason
  filters: DashboardResolvedFilters
  resolvedScope: EmployeeDashboardResolvedScope
  summary: null
  calendarAssignments: []
}

export interface EmployeeDashboardDependencyResponse {
  dashboardScope: 'employee'
  state: 'dependency'
  reason: EmployeeDashboardDependencyReason
  filters: DashboardResolvedFilters
  resolvedScope: EmployeeDashboardResolvedScope
  summary: null
  calendarAssignments: []
}

export type EmployeeDashboardStatsResponse =
  | EmployeeDashboardReadyResponse
  | EmployeeDashboardEmptyResponse
  | EmployeeDashboardDependencyResponse
