import dayjs from 'dayjs'
import { supabase } from './supabase'
import type {
  AdminDashboardStatsRequest,
  AdminDashboardStatsResponse,
  DashboardApiErrorCode,
  EmployeeDashboardStatsRequest,
  EmployeeDashboardStatsResponse,
} from '@/types/dashboard'

const FINALIZED_DASHBOARD_SCHEDULE_STATUSES = ['complete', 'changed'] as const

interface DashboardRpcErrorShape {
  code?: string
  message?: string
  details?: string | null
  hint?: string | null
}

function isDashboardApiErrorCode(value: unknown): value is DashboardApiErrorCode {
  return (
    value === 'DASHBOARD_ACCESS_DENIED' ||
    value === 'DASHBOARD_ORGANIZATION_SCOPE_REQUIRED' ||
    value === 'DASHBOARD_INVALID_PERIOD_MONTH' ||
    value === 'DASHBOARD_UNSUPPORTED_RANK_SCOPE' ||
    value === 'DASHBOARD_INTERNAL_ERROR'
  )
}

function normalizeDashboardApiErrorCode(error: DashboardRpcErrorShape): DashboardApiErrorCode {
  if (isDashboardApiErrorCode(error.code)) {
    return error.code
  }

  const message = error.message ?? ''
  const matchedCode = message.match(/DASHBOARD_[A-Z_]+/)?.[0]
  if (isDashboardApiErrorCode(matchedCode)) {
    return matchedCode
  }

  return 'DASHBOARD_INTERNAL_ERROR'
}

function getDashboardApiErrorMessage(
  code: DashboardApiErrorCode,
  fallbackMessage?: string | null,
): string {
  if (fallbackMessage) {
    return fallbackMessage
  }

  switch (code) {
    case 'DASHBOARD_ACCESS_DENIED':
      return '대시보드 접근 권한이 없습니다.'
    case 'DASHBOARD_ORGANIZATION_SCOPE_REQUIRED':
      return '조직을 선택한 뒤 관리자 대시보드를 조회해주세요.'
    case 'DASHBOARD_INVALID_PERIOD_MONTH':
      return '조회 월 형식이 올바르지 않습니다.'
    case 'DASHBOARD_UNSUPPORTED_RANK_SCOPE':
      return '현재 직급 필터는 지원되지 않습니다.'
    case 'DASHBOARD_INTERNAL_ERROR':
    default:
      return '대시보드 데이터를 불러오지 못했습니다.'
  }
}

export class DashboardApiError extends Error {
  code: DashboardApiErrorCode
  details: string | null
  hint: string | null

  constructor(
    code: DashboardApiErrorCode,
    message?: string | null,
    options: {
      details?: string | null
      hint?: string | null
    } = {},
  ) {
    super(getDashboardApiErrorMessage(code, message))
    this.name = 'DashboardApiError'
    this.code = code
    this.details = options.details ?? null
    this.hint = options.hint ?? null
  }
}

function normalizeDashboardApiError(error: unknown): DashboardApiError {
  if (error instanceof DashboardApiError) {
    return error
  }

  if (error && typeof error === 'object') {
    const normalizedError = error as DashboardRpcErrorShape
    const code = normalizeDashboardApiErrorCode(normalizedError)

    return new DashboardApiError(code, normalizedError.message, {
      details: normalizedError.details ?? null,
      hint: normalizedError.hint ?? null,
    })
  }

  const fallbackMessage = error instanceof Error ? error.message : null
  return new DashboardApiError('DASHBOARD_INTERNAL_ERROR', fallbackMessage)
}

async function callDashboardRpc<Response>(
  functionName: 'get_admin_dashboard_stats' | 'get_employee_dashboard_stats',
  params: Record<string, unknown>,
): Promise<Response> {
  const { data, error } = await supabase.rpc(functionName, params)

  if (error) {
    throw normalizeDashboardApiError(error)
  }

  return data as Response
}

export async function resolveDashboardDefaultPeriodMonth(
  organizationId?: string | null,
): Promise<string> {
  if (!organizationId) {
    return dayjs().format('YYYY-MM')
  }

  const { data, error } = await supabase
    .from('schedules')
    .select('month')
    .eq('organization_id', organizationId)
    .in('status', [...FINALIZED_DASHBOARD_SCHEDULE_STATUSES])
    .order('month', { ascending: false })
    .limit(1)
    .maybeSingle<{ month: string }>()

  if (error) {
    throw new DashboardApiError(
      'DASHBOARD_INTERNAL_ERROR',
      `대시보드 기준 월 조회 실패: ${error.message}`,
    )
  }

  return data?.month ?? dayjs().format('YYYY-MM')
}

export async function getAdminDashboardStats(
  input: AdminDashboardStatsRequest,
): Promise<AdminDashboardStatsResponse> {
  return callDashboardRpc<AdminDashboardStatsResponse>('get_admin_dashboard_stats', {
    p_period_month: input.filters.periodMonth,
    p_site_id: input.filters.siteId ?? null,
    p_rank_id: input.filters.rankId ?? null,
    p_grouping: input.scope.grouping,
    p_organization_id: input.scope.organizationId ?? null,
  })
}

export async function getEmployeeDashboardStats(
  input: EmployeeDashboardStatsRequest,
): Promise<EmployeeDashboardStatsResponse> {
  return callDashboardRpc<EmployeeDashboardStatsResponse>('get_employee_dashboard_stats', {
    p_period_month: input.filters.periodMonth,
    p_site_id: input.filters.siteId ?? null,
    p_rank_id: input.filters.rankId ?? null,
  })
}
