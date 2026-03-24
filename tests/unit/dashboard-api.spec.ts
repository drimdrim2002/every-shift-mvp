import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const rpcMock = vi.hoisted(() => vi.fn())
const fromMock = vi.hoisted(() => vi.fn())
const selectMock = vi.hoisted(() => vi.fn())
const eqMock = vi.hoisted(() => vi.fn())
const inMock = vi.hoisted(() => vi.fn())
const orderMock = vi.hoisted(() => vi.fn())
const limitMock = vi.hoisted(() => vi.fn())
const maybeSingleMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/supabase', () => ({
  supabase: {
    rpc: rpcMock,
    from: fromMock,
  },
}))

import {
  DashboardApiError,
  getAdminDashboardStats,
  getEmployeeDashboardStats,
  resolveDashboardDefaultPeriodMonth,
} from '@/api/dashboard'

describe('dashboard api boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-24T12:00:00.000Z'))

    fromMock.mockReturnValue({
      select: selectMock,
    })
    selectMock.mockReturnValue({
      eq: eqMock,
    })
    eqMock.mockReturnValue({
      in: inMock,
    })
    inMock.mockReturnValue({
      order: orderMock,
    })
    orderMock.mockReturnValue({
      limit: limitMock,
    })
    limitMock.mockReturnValue({
      maybeSingle: maybeSingleMock,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('maps admin dashboard request to RPC args with nullable optional filters', async () => {
    rpcMock.mockResolvedValue({
      data: {
        dashboardScope: 'admin',
        state: 'ready',
        filters: {
          periodMonth: '2026-03',
          siteId: null,
          rankId: null,
        },
        resolvedScope: {
          organizationId: 'org-1',
          grouping: 'employee',
        },
        summary: {
          groupCount: 1,
          nightShiftAvg: 3,
          nightShiftMin: 3,
          nightShiftMax: 3,
          nightShiftGap: 0,
          weekendWorkAvg: 2,
          weekendWorkMin: 2,
          weekendWorkMax: 2,
          weekendWorkGap: 0,
        },
        rows: [],
      },
      error: null,
    })

    await getAdminDashboardStats({
      filters: {
        periodMonth: '2026-03',
      },
      scope: {
        organizationId: 'org-1',
        grouping: 'employee',
      },
    })

    expect(rpcMock).toHaveBeenCalledWith('get_admin_dashboard_stats', {
      p_period_month: '2026-03',
      p_site_id: null,
      p_rank_id: null,
      p_grouping: 'employee',
      p_organization_id: 'org-1',
    })
  })

  it('maps employee dashboard request to RPC args without employeeId surface', async () => {
    rpcMock.mockResolvedValue({
      data: {
        dashboardScope: 'employee',
        state: 'dependency',
        reason: 'employee_mapping_required',
        filters: {
          periodMonth: '2026-03',
          siteId: 'site-1',
          rankId: null,
        },
        resolvedScope: {
          organizationId: 'org-1',
          employeeId: null,
        },
        summary: null,
        calendarAssignments: [],
      },
      error: null,
    })

    await getEmployeeDashboardStats({
      filters: {
        periodMonth: '2026-03',
        siteId: 'site-1',
        rankId: undefined,
      },
    })

    expect(rpcMock).toHaveBeenCalledWith('get_employee_dashboard_stats', {
      p_period_month: '2026-03',
      p_site_id: 'site-1',
      p_rank_id: null,
    })
  })

  it('normalizes RPC business errors into DashboardApiError', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: {
        message: 'DASHBOARD_ORGANIZATION_SCOPE_REQUIRED: missing organization scope',
      },
    })

    await expect(
      getAdminDashboardStats({
        filters: {
          periodMonth: '2026-03',
        },
        scope: {
          organizationId: null,
          grouping: 'employee',
        },
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DashboardApiError>>({
        name: 'DashboardApiError',
        code: 'DASHBOARD_ORGANIZATION_SCOPE_REQUIRED',
        message: 'DASHBOARD_ORGANIZATION_SCOPE_REQUIRED: missing organization scope',
      }),
    )
  })

  it('returns latest finalized persisted schedule month when available', async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        month: '2026-02',
      },
      error: null,
    })

    const result = await resolveDashboardDefaultPeriodMonth('org-1')

    expect(fromMock).toHaveBeenCalledWith('schedules')
    expect(selectMock).toHaveBeenCalledWith('month')
    expect(eqMock).toHaveBeenCalledWith('organization_id', 'org-1')
    expect(inMock).toHaveBeenCalledWith('status', ['complete', 'changed'])
    expect(orderMock).toHaveBeenCalledWith('month', { ascending: false })
    expect(limitMock).toHaveBeenCalledWith(1)
    expect(result).toBe('2026-02')
  })

  it('falls back to current month when no organization or persisted schedule exists', async () => {
    expect(await resolveDashboardDefaultPeriodMonth(null)).toBe('2026-03')

    maybeSingleMock.mockResolvedValue({
      data: null,
      error: null,
    })

    expect(await resolveDashboardDefaultPeriodMonth('org-1')).toBe('2026-03')
  })

  it('throws DashboardApiError when latest month lookup fails', async () => {
    maybeSingleMock.mockResolvedValue({
      data: null,
      error: {
        message: 'permission denied',
      },
    })

    await expect(resolveDashboardDefaultPeriodMonth('org-1')).rejects.toEqual(
      expect.objectContaining<Partial<DashboardApiError>>({
        name: 'DashboardApiError',
        code: 'DASHBOARD_INTERNAL_ERROR',
        message: '대시보드 기준 월 조회 실패: permission denied',
      }),
    )
  })
})
