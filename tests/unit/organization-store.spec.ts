import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const {
  getSessionMock,
  fromMock,
  organizationRowsById,
  employeeRowsByOrganizationId,
  shiftRowsByOrganizationId,
  rbacStoreState,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  fromMock: vi.fn(),
  organizationRowsById: new Map<string, Record<string, unknown>>(),
  employeeRowsByOrganizationId: new Map<string, Record<string, unknown>[]>(),
  shiftRowsByOrganizationId: new Map<string, Record<string, unknown>[]>(),
  rbacStoreState: {
    selectedOrganizationId: null as string | null,
    effectiveMembership: null as { organizationId: string } | null,
  },
}));

vi.mock('@/api/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
    from: fromMock,
  },
}));

vi.mock('@/api/organization', () => ({}));
vi.mock('@/api/shift', () => ({}));
vi.mock('@/stores/rbac', () => ({
  useRbacStore: () => rbacStoreState,
}));

import { useOrganizationStore } from '@/stores/organization';

function createFromQuery(table: string) {
  const filters: Record<string, string> = {};

  const query = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    eq: vi.fn((column: string, value: string) => {
      filters[column] = value;

      if (table === 'employees' && column === 'organization_id') {
        return Promise.resolve({
          data: employeeRowsByOrganizationId.get(value) ?? [],
          error: null,
        });
      }

      if (table === 'shifts' && column === 'organization_id') {
        return Promise.resolve({
          data: shiftRowsByOrganizationId.get(value) ?? [],
          error: null,
        });
      }

      return query;
    }),
    limit: vi.fn(() => {
      if (table !== 'organizations') {
        return Promise.resolve({ data: [], error: null });
      }

      if (filters.id) {
        const row = organizationRowsById.get(filters.id);
        return Promise.resolve({
          data: row ? [row] : [],
          error: null,
        });
      }

      return Promise.resolve({
        data: Array.from(organizationRowsById.values()).slice(0, 1),
        error: null,
      });
    }),
  };

  return query;
}

describe('useOrganizationStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    organizationRowsById.clear();
    employeeRowsByOrganizationId.clear();
    shiftRowsByOrganizationId.clear();
    rbacStoreState.selectedOrganizationId = null;
    rbacStoreState.effectiveMembership = null;

    fromMock.mockImplementation((table: string) => createFromQuery(table));
  });

  function createSessionUser(overrides: {
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  } = {}) {
    return {
      id: 'user-1',
      aud: 'authenticated',
      created_at: '2026-03-29T00:00:00Z',
      app_metadata: overrides.app_metadata ?? {},
      user_metadata: overrides.user_metadata ?? {},
    };
  }

  it('loads the RBAC-selected organization instead of trusting session metadata', async () => {
    organizationRowsById.set('org-2', {
      id: 'org-2',
      name: 'Correct Org',
      type: 'hospital',
    });
    employeeRowsByOrganizationId.set('org-2', [
      {
        id: 'emp-1',
        organization_id: 'org-2',
        employee_id: 'E001',
        name: 'Kim Nurse',
        available_shifts: ['D', 'E', 'N', 'O'],
      },
    ]);
    shiftRowsByOrganizationId.set('org-2', [
      {
        id: 'shift-1',
        organization_id: 'org-2',
        code: 'D',
        name: 'Day',
        color_code: '#123456',
        start_time: '09:00:00',
        end_time: '18:00:00',
      },
    ]);

    getSessionMock.mockResolvedValue({
      data: {
        session: {
          user: createSessionUser({
            user_metadata: {},
            app_metadata: {
              organization_id: 'org-legacy',
            },
          }),
        },
      },
      error: null,
    });

    const store = useOrganizationStore();
    rbacStoreState.selectedOrganizationId = 'org-2';

    const result = await store.loadOrganization();

    expect(result).toEqual({ success: true });
    expect(fromMock).toHaveBeenCalledWith('organizations');
    expect(store.current).toEqual({
      id: 'org-2',
      name: 'Correct Org',
      type: 'hospital',
      createdAt: undefined,
      updatedAt: undefined,
      foundation: null,
    });
    expect(store.employees).toHaveLength(1);
    expect(store.employees[0]?.organizationId).toBe('org-2');
    expect(store.shifts).toHaveLength(1);
    expect(store.shifts[0]?.organizationId).toBe('org-2');
  });

  it('fails fast when no selected or effective organization is available from RBAC', async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          user: createSessionUser({
            user_metadata: {},
            app_metadata: {},
          }),
        },
      },
      error: null,
    });

    const store = useOrganizationStore();
    const result = await store.loadOrganization();

    expect(result).toEqual({
      success: false,
      error: '접근 가능한 조직 정보가 없습니다.',
    });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('falls back to the effective membership organization when no explicit selection exists', async () => {
    organizationRowsById.set('org-user', {
      id: 'org-user',
      name: 'User Org',
      type: 'hospital',
    });
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          user: createSessionUser({
            user_metadata: {
              organization_id: 'org-user',
            },
            app_metadata: {},
          }),
        },
      },
      error: null,
    });
    rbacStoreState.effectiveMembership = { organizationId: 'org-user' };

    const store = useOrganizationStore();
    const result = await store.loadOrganization();

    expect(result).toEqual({ success: true });
    expect(store.current?.id).toBe('org-user');
  });

  it('allows an explicit organization id to override the active RBAC selection', async () => {
    organizationRowsById.set('org-explicit', {
      id: 'org-explicit',
      name: 'Explicit Org',
      type: 'hospital',
    });
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          user: createSessionUser({
            user_metadata: {},
            app_metadata: {
              organization_id: 'org-correct',
            },
          }),
        },
      },
      error: null,
    });
    rbacStoreState.selectedOrganizationId = 'org-selected';

    const store = useOrganizationStore();
    const result = await store.loadOrganization('org-explicit');

    expect(result).toEqual({ success: true });
    expect(store.current?.id).toBe('org-explicit');
  });

  it('hydrates organization foundation metadata from authenticated app metadata on first login', async () => {
    organizationRowsById.set('org-foundation', {
      id: 'org-foundation',
      name: 'Foundation Org',
      type: 'hospital',
    });

    getSessionMock.mockResolvedValue({
      data: {
        session: {
          user: createSessionUser({
            app_metadata: {
              organization_id: 'org-foundation',
              foundation: {
                current_step_key: 'organization_info',
                organization_info_confirmed_at: '2026-04-08T10:30:00Z',
                organization_info_confirmed_by: 'operator-1',
              },
            },
            user_metadata: {},
          }),
        },
      },
      error: null,
    });
    rbacStoreState.selectedOrganizationId = 'org-foundation';

    const store = useOrganizationStore();
    const result = await store.loadOrganization();

    expect(result).toEqual({ success: true });
    expect(store.current).toEqual({
      id: 'org-foundation',
      name: 'Foundation Org',
      type: 'hospital',
      createdAt: undefined,
      updatedAt: undefined,
      foundation: {
        currentStepKey: 'organization_info',
        organizationInfoConfirmedAt: '2026-04-08T10:30:00Z',
        organizationInfoConfirmedBy: 'operator-1',
      },
    });
  });
});
