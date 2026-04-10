import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const {
  getSessionMock,
  fromMock,
  organizationRowsById,
  employeeRowsByOrganizationId,
  shiftRowsByOrganizationId,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  fromMock: vi.fn(),
  organizationRowsById: new Map<string, Record<string, unknown>>(),
  employeeRowsByOrganizationId: new Map<string, Record<string, unknown>[]>(),
  shiftRowsByOrganizationId: new Map<string, Record<string, unknown>[]>(),
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

  it('prefers authenticated metadata over stale current organization state', async () => {
    organizationRowsById.set('org-stale', {
      id: 'org-stale',
      name: 'Stale Org',
      type: 'hospital',
    });
    organizationRowsById.set('org-correct', {
      id: 'org-correct',
      name: 'Correct Org',
      type: 'hospital',
    });
    employeeRowsByOrganizationId.set('org-correct', [
      {
        id: 'emp-1',
        organization_id: 'org-correct',
        employee_id: 'E001',
        name: 'Kim Nurse',
        available_shifts: ['D', 'E', 'N', 'O'],
      },
    ]);
    shiftRowsByOrganizationId.set('org-correct', [
      {
        id: 'shift-1',
        organization_id: 'org-correct',
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
              organization_id: 'org-correct',
            },
          }),
        },
      },
      error: null,
    });

    const store = useOrganizationStore();
    store.current = {
      id: 'org-stale',
      name: 'Stale Org',
      type: 'hospital',
    };

    const result = await store.loadOrganization();

    expect(result).toEqual({ success: true });
    expect(store.current).toEqual({
      id: 'org-correct',
      name: 'Correct Org',
      type: 'hospital',
      createdAt: undefined,
      updatedAt: undefined,
      foundation: null,
    });
    expect(store.employees).toHaveLength(1);
    expect(store.employees[0]?.organizationId).toBe('org-correct');
    expect(store.shifts).toHaveLength(1);
    expect(store.shifts[0]?.organizationId).toBe('org-correct');
  });

  it('fails fast when an authenticated user has no organization metadata', async () => {
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
      error: '로그인 계정에 organization_id 메타데이터가 없습니다.',
    });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('fails fast when only user metadata has organization_id', async () => {
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

    const store = useOrganizationStore();
    const result = await store.loadOrganization();

    expect(result).toEqual({
      success: false,
      error: '로그인 계정에 organization_id 메타데이터가 없습니다.',
    });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('rejects an explicit organization id that does not match the authenticated metadata', async () => {
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

    const store = useOrganizationStore();
    const result = await store.loadOrganization('org-stale');

    expect(result).toEqual({
      success: false,
      error: '요청한 조직과 로그인 계정의 organization_id가 일치하지 않습니다.',
    });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('does not trust user metadata fallback when validating an explicit organization id', async () => {
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

    const store = useOrganizationStore();
    const result = await store.loadOrganization('org-user');

    expect(result).toEqual({
      success: false,
      error: '로그인 계정에 organization_id 메타데이터가 없습니다.',
    });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('prefers app metadata when user metadata points at a different organization', async () => {
    organizationRowsById.set('org-app', {
      id: 'org-app',
      name: 'App Org',
      type: 'hospital',
    });

    getSessionMock.mockResolvedValue({
      data: {
        session: {
          user: createSessionUser({
            user_metadata: {
              organization_id: 'org-user',
            },
            app_metadata: {
              organization_id: 'org-app',
            },
          }),
        },
      },
      error: null,
    });

    const store = useOrganizationStore();
    const result = await store.loadOrganization();

    expect(result).toEqual({ success: true });
    expect(store.current?.id).toBe('org-app');
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
