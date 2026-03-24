import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const getAdminDashboardStatsMock = vi.hoisted(() => vi.fn())
const getEmployeeDashboardStatsMock = vi.hoisted(() => vi.fn())
const resolveDashboardDefaultPeriodMonthMock = vi.hoisted(() => vi.fn())
const masterStoreMock = vi.hoisted(() => ({
  sites: [] as Array<{ id: string; name: string }>,
  loadSites: vi.fn(async (_organizationId: string) => ({ success: true as const })),
}))

vi.mock('@/api/dashboard', () => ({
  DashboardApiError: class DashboardApiError extends Error {
    code: string

    constructor(code: string, message?: string | null) {
      super(message ?? code)
      this.name = 'DashboardApiError'
      this.code = code
    }
  },
  getAdminDashboardStats: getAdminDashboardStatsMock,
  getEmployeeDashboardStats: getEmployeeDashboardStatsMock,
  resolveDashboardDefaultPeriodMonth: resolveDashboardDefaultPeriodMonthMock,
}))

vi.mock('@/stores/organization-master', () => ({
  useOrganizationMasterStore: () => masterStoreMock,
}))

import { useAdminDashboardStore, useEmployeeDashboardStore } from '@/stores/dashboard'
import { useRbacStore } from '@/stores/rbac'
import type {
  AdminDashboardStatsResponse,
  EmployeeDashboardStatsResponse,
} from '@/types/dashboard'
import type { AuthContext } from '@/types/rbac'

function createAuthContext(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    profile: {
      userId: 'user-1',
      globalRole: 'user',
      accountStatus: 'active',
      ...(overrides.profile ?? {}),
    },
    memberships: overrides.memberships ?? [],
    currentOrganizationId: overrides.currentOrganizationId,
  }
}

function createAdminReadyResponse(
  organizationId = 'org-1',
  grouping: 'employee' | 'site' = 'employee',
): AdminDashboardStatsResponse {
  return {
    dashboardScope: 'admin',
    state: 'ready',
    filters: {
      periodMonth: '2026-03',
      siteId: null,
      rankId: null,
    },
    resolvedScope: {
      organizationId,
      grouping,
    },
    summary: {
      groupCount: 2,
      nightShiftAvg: 3,
      nightShiftMin: 2,
      nightShiftMax: 4,
      nightShiftGap: 2,
      weekendWorkAvg: 2,
      weekendWorkMin: 1,
      weekendWorkMax: 3,
      weekendWorkGap: 2,
    },
    rows: [
      {
        kind: 'employee',
        employeeId: 'employee-1',
        employeeName: '직원1',
        siteId: 'site-1',
        siteName: '중환자실',
        rankId: null,
        rankName: null,
        nightShiftCount: 2,
        weekendWorkCount: 1,
      },
      {
        kind: 'employee',
        employeeId: 'employee-2',
        employeeName: '직원2',
        siteId: 'site-2',
        siteName: '일반병동',
        rankId: null,
        rankName: null,
        nightShiftCount: 4,
        weekendWorkCount: 3,
      },
    ],
  }
}

function createEmployeeDependencyResponse(
  organizationId = 'org-1',
): EmployeeDashboardStatsResponse {
  return {
    dashboardScope: 'employee',
    state: 'dependency',
    reason: 'employee_mapping_required',
    filters: {
      periodMonth: '2026-03',
      siteId: null,
      rankId: null,
    },
    resolvedScope: {
      organizationId,
      employeeId: null,
    },
    summary: null,
    calendarAssignments: [],
  }
}

function createEmployeeReadyResponse(
  organizationId = 'org-employee',
): EmployeeDashboardStatsResponse {
  return {
    dashboardScope: 'employee',
    state: 'ready',
    filters: {
      periodMonth: '2026-03',
      siteId: null,
      rankId: null,
    },
    resolvedScope: {
      organizationId,
      employeeId: 'employee-1',
    },
    summary: {
      myNightShiftCount: 3,
      myWeekendWorkCount: 2,
      teamNightShiftAvg: 2.5,
      teamWeekendWorkAvg: 1.5,
      teamMemberCount: 12,
    },
    calendarAssignments: [
      {
        date: '2026-03-01',
        shiftCode: 'D',
        shiftName: '데이',
        siteId: 'site-1',
        siteName: '중환자실',
      },
    ],
  }
}

describe('dashboard stores', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-24T00:00:00.000Z'))

    resolveDashboardDefaultPeriodMonthMock.mockResolvedValue('2026-03')
    getAdminDashboardStatsMock.mockResolvedValue(createAdminReadyResponse())
    getEmployeeDashboardStatsMock.mockResolvedValue(createEmployeeDependencyResponse())
    masterStoreMock.sites = []
    masterStoreMock.loadSites.mockImplementation(async (organizationId: string) => {
      if (organizationId === 'org-1') {
        masterStoreMock.sites = [
          { id: 'site-1', name: '중환자실' },
          { id: 'site-2', name: '일반병동' },
        ]
      } else if (organizationId === 'org-employee') {
        masterStoreMock.sites = [
          { id: 'site-a', name: 'A병동' },
          { id: 'site-b', name: 'B병동' },
        ]
      } else {
        masterStoreMock.sites = []
      }

      return { success: true as const }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('blocks super admin dashboard load until an organization is selected', async () => {
    const rbacStore = useRbacStore()
    rbacStore.setSessionUserId('super-1')
    rbacStore.setAuthContext(
      createAuthContext({
        profile: {
          userId: 'super-1',
          globalRole: 'super',
          accountStatus: 'active',
        },
        memberships: [],
        currentOrganizationId: null,
      }),
    )

    const store = useAdminDashboardStore()
    const result = await store.initialize()

    expect(result).toBeNull()
    expect(store.status).toBe('blocked')
    expect(store.requiresOrganizationSelection).toBe(true)
    expect(getAdminDashboardStatsMock).not.toHaveBeenCalled()
  })

  it('does not allow admin dashboard scope override for admin_active users', async () => {
    const rbacStore = useRbacStore()
    rbacStore.setSessionUserId('admin-1')
    rbacStore.setAuthContext(
      createAuthContext({
        profile: {
          userId: 'admin-1',
          globalRole: 'admin',
          accountStatus: 'active',
        },
        memberships: [
          {
            organizationId: 'org-1',
            role: 'admin',
            status: 'approved',
            approvedAt: '2026-03-24T00:00:00.000Z',
          },
        ],
        currentOrganizationId: 'org-1',
      }),
    )

    const store = useAdminDashboardStore()
    await store.initialize()

    vi.clearAllMocks()

    await store.setOrganizationScope('org-2')

    expect(rbacStore.selectedOrganizationId).toBe('org-1')
    expect(store.resolvedOrganizationId).toBe('org-1')
    expect(getAdminDashboardStatsMock).not.toHaveBeenCalled()
    expect(store.response?.resolvedScope.organizationId).toBe('org-1')
  })

  it('uses cache within TTL and refetches after TTL or grouping change', async () => {
    const rbacStore = useRbacStore()
    rbacStore.setSessionUserId('admin-1')
    rbacStore.setAuthContext(
      createAuthContext({
        profile: {
          userId: 'admin-1',
          globalRole: 'admin',
          accountStatus: 'active',
        },
        memberships: [
          {
            organizationId: 'org-1',
            role: 'admin',
            status: 'approved',
            approvedAt: '2026-03-24T00:00:00.000Z',
          },
        ],
        currentOrganizationId: 'org-1',
      }),
    )

    const store = useAdminDashboardStore()
    await store.initialize()

    expect(getAdminDashboardStatsMock).toHaveBeenCalledTimes(1)
    expect(store.capabilities.siteFilterVisible).toBe(true)

    await store.load()
    expect(getAdminDashboardStatsMock).toHaveBeenCalledTimes(1)

    vi.setSystemTime(new Date('2026-03-24T00:06:00.000Z'))
    await store.load()
    expect(getAdminDashboardStatsMock).toHaveBeenCalledTimes(2)

    getAdminDashboardStatsMock.mockResolvedValueOnce(
      createAdminReadyResponse('org-1', 'site'),
    )

    await store.setGrouping('site')

    expect(getAdminDashboardStatsMock).toHaveBeenCalledTimes(3)
    expect(getAdminDashboardStatsMock).toHaveBeenLastCalledWith({
      filters: {
        periodMonth: '2026-03',
        siteId: null,
        rankId: null,
      },
      scope: {
        organizationId: null,
        grouping: 'site',
      },
    })
    expect(store.currentQueryKey).toContain('"grouping":"site"')
  })

  it('keeps employee dependency state instead of treating it as a transport error', async () => {
    const rbacStore = useRbacStore()
    rbacStore.setSessionUserId('user-1')
    rbacStore.setAuthContext(
      createAuthContext({
        profile: {
          userId: 'user-1',
          globalRole: 'user',
          accountStatus: 'active',
        },
        memberships: [
          {
            organizationId: 'org-1',
            role: 'user',
            status: 'approved',
            approvedAt: '2026-03-24T00:00:00.000Z',
          },
        ],
        currentOrganizationId: 'org-1',
      }),
    )

    const store = useEmployeeDashboardStore()
    await store.initialize()

    expect(store.status).toBe('dependency')
    expect(store.response?.state).toBe('dependency')
    expect(store.error).toBeNull()
    expect(store.capabilities.rankFilterVisible).toBe(false)
    expect('setEmployeeId' in store).toBe(false)
  })

  it('hydrates employee site filters after the first response resolves organization scope', async () => {
    const rbacStore = useRbacStore()
    rbacStore.setSessionUserId('super-1')
    rbacStore.setAuthContext(
      createAuthContext({
        profile: {
          userId: 'super-1',
          globalRole: 'super',
          accountStatus: 'active',
        },
        memberships: [],
        currentOrganizationId: null,
      }),
    )

    getEmployeeDashboardStatsMock.mockResolvedValue(createEmployeeReadyResponse())

    const store = useEmployeeDashboardStore()
    await store.initialize()

    expect(masterStoreMock.loadSites).toHaveBeenCalledWith('org-employee')
    expect(store.capabilities.siteFilterVisible).toBe(true)
    expect(store.siteOptions).toEqual([
      { value: 'site-a', label: 'A병동' },
      { value: 'site-b', label: 'B병동' },
    ])
    expect(store.resolvedOrganizationId).toBe('org-employee')
    expect(store.status).toBe('ready')
  })
})
