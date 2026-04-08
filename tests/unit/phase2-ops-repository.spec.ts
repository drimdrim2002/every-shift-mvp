import { describe, expect, it, vi } from 'vitest';
import {
  applyEmployeeImport,
  bootstrapAdmin,
  validateEmployeeImport,
} from '@/../supabase/functions/phase2-ops/repository.ts';
import type { BootstrapAdminRequest } from '@/../supabase/functions/phase2-ops/contracts.ts';
import type { Phase2OpsOperatorAuthContext } from '@/../supabase/functions/phase2-ops/auth.ts';
import type { Phase2OpsRepositoryClient } from '@/../supabase/functions/phase2-ops/repository.ts';

interface QueryResult<T> {
  data: T | null;
  error: { message: string } | null;
}

class FakeSelectBuilder<T> {
  constructor(private readonly resolveResult: () => QueryResult<T>) {}

  eq() {
    return this;
  }

  limit() {
    return this;
  }

  maybeSingle(): Promise<QueryResult<T>> {
    return Promise.resolve(this.resolveResult());
  }
}

function createRepositoryClient(params: {
  users?: Array<Record<string, unknown>>;
  userPages?: Array<Array<Record<string, unknown>>>;
  profile?: Record<string, unknown> | null;
  profileResults?: Array<Record<string, unknown> | null>;
  onboardingProgress?: Record<string, unknown> | null;
  onboardingProgressResults?: Array<Record<string, unknown> | null>;
  profileInsertErrors?: Array<{ message: string } | null>;
  onboardingInsertErrors?: Array<{ message: string } | null>;
  shifts?: Array<Record<string, unknown>>;
  shiftResults?: Array<Array<Record<string, unknown>>>;
  schedule?: Record<string, unknown> | null;
  scheduleResults?: Array<Record<string, unknown> | null>;
}) {
  const insertCalls: Array<{ table: string; payload: Record<string, unknown> }> = [];
  const updateCalls: Array<{
    table: string;
    payload: Record<string, unknown>;
    filters: Array<[string, string]>;
  }> = [];
  const rpcCalls: Array<{ fn: string; params: Record<string, unknown> }> = [];
  const userPages = params.userPages ?? [params.users ?? []];
  const profileResults = [...(params.profileResults ?? [params.profile ?? null])];
  const onboardingProgressResults = [
    ...(params.onboardingProgressResults ?? [params.onboardingProgress ?? null]),
  ];
  const shiftResults = [...(params.shiftResults ?? [params.shifts ?? []])];
  const scheduleResults = [...(params.scheduleResults ?? [params.schedule ?? null])];
  const profileInsertErrors = [...(params.profileInsertErrors ?? [])];
  const onboardingInsertErrors = [...(params.onboardingInsertErrors ?? [])];
  const nextProfileResult = () => profileResults.shift() ?? params.profile ?? null;
  const nextOnboardingProgressResult =
    () => onboardingProgressResults.shift() ?? params.onboardingProgress ?? null;
  const nextShiftResult = () => shiftResults.shift() ?? params.shifts ?? [];
  const nextScheduleResult = () => scheduleResults.shift() ?? params.schedule ?? null;
  const listUsers = vi.fn().mockImplementation(async ({ page = 1 } = {}) => ({
    data: {
      users: userPages[page - 1] ?? [],
    },
    error: null,
  }));
  const updateUserById = vi.fn().mockResolvedValue({
    data: { user: null },
    error: null,
  });
  const rpc = vi.fn().mockImplementation(async (fn: string, params: Record<string, unknown>) => {
    rpcCalls.push({ fn, params });
    return {
      data: {
        deleted_schedule_id: 'schedule-123',
        employee_count: 2,
      },
      error: null,
    };
  });

  const client: Phase2OpsRepositoryClient = {
    auth: {
      admin: {
        listUsers,
        updateUserById,
      },
    },
    rpc,
    from(table) {
      if (table === 'profiles') {
        return {
          select() {
            return new FakeSelectBuilder(() => ({
              data: nextProfileResult(),
              error: null,
            }));
          },
          insert(payload) {
            insertCalls.push({ table, payload });
            return Promise.resolve({
              data: null,
              error: profileInsertErrors.shift() ?? null,
            });
          },
          update(payload) {
            return {
              eq(column, value) {
                updateCalls.push({
                  table,
                  payload,
                  filters: [[column, value]],
                });
                return Promise.resolve({ data: null, error: null });
              },
            };
          },
        };
      }

      if (table === 'shifts') {
        return {
          select() {
            return {
              eq() {
                return Promise.resolve({
                  data: nextShiftResult(),
                  error: null,
                });
              },
            };
          },
        };
      }

      if (table === 'schedules') {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      limit() {
                        return {
                          maybeSingle() {
                            return Promise.resolve({
                              data: nextScheduleResult(),
                              error: null,
                            });
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }

      return {
        select() {
          return new FakeSelectBuilder(() => ({
            data: nextOnboardingProgressResult(),
            error: null,
          }));
        },
        insert(payload) {
          insertCalls.push({ table, payload });
          return Promise.resolve({
            data: null,
            error: onboardingInsertErrors.shift() ?? null,
          });
        },
        update(payload) {
          return {
            eq(column, value) {
              updateCalls.push({
                table,
                payload,
                filters: [[column, value]],
              });
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
      };
    },
  };

  return { client, insertCalls, updateCalls, listUsers, updateUserById, rpcCalls };
}

const AUTH_CONTEXT: Phase2OpsOperatorAuthContext = {
  operatorUserId: '11111111-1111-4111-8111-111111111111',
  operatorOrganizationId: null,
  operatorGlobalRole: 'super',
};

const ADMIN_AUTH_CONTEXT: Phase2OpsOperatorAuthContext = {
  operatorUserId: '11111111-1111-4111-8111-111111111111',
  operatorOrganizationId: '00000000-0000-0000-0000-000000000009',
  operatorGlobalRole: 'admin',
};

const REQUEST: BootstrapAdminRequest = {
  organizationId: '00000000-0000-0000-0000-000000000001',
  targetEmail: 'pilot-admin@example.com',
  displayName: 'Pilot Admin',
  onboardingInitializationFlags: {
    createPilotSite: true,
    seedOrganizationSettings: true,
  },
};

describe('phase2 ops repository', () => {
  it('creates profile and onboarding progress while aligning auth metadata', async () => {
    const { client, insertCalls, updateCalls, updateUserById } = createRepositoryClient({
      users: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          email: REQUEST.targetEmail,
          app_metadata: {},
          user_metadata: {},
        },
      ],
      profile: null,
      onboardingProgress: null,
    });
    const emitEvent = vi.fn();

    const result = await bootstrapAdmin(client, AUTH_CONTEXT, REQUEST, emitEvent);

    expect(result).toEqual({
      organizationId: REQUEST.organizationId,
      targetEmail: REQUEST.targetEmail,
      displayName: REQUEST.displayName,
      operatorUserId: AUTH_CONTEXT.operatorUserId,
      onboardingInitializationFlags: REQUEST.onboardingInitializationFlags,
    });
    expect(insertCalls).toEqual([
      {
        table: 'profiles',
        payload: {
          id: '22222222-2222-4222-8222-222222222222',
          organization_id: REQUEST.organizationId,
          role: 'admin',
          display_name: REQUEST.displayName,
          status: 'active',
          global_role: 'user',
          account_status: 'active',
        },
      },
      {
        table: 'onboarding_progress',
        payload: {
          organization_id: REQUEST.organizationId,
          current_step: 1,
          current_step_key: 'organization_info',
          last_actor_user_id: AUTH_CONTEXT.operatorUserId,
        },
      },
    ]);
    expect(updateCalls).toHaveLength(0);
    expect(updateUserById).toHaveBeenCalledWith(
      '22222222-2222-4222-8222-222222222222',
      {
        app_metadata: {
          organization_id: REQUEST.organizationId,
          organizationId: REQUEST.organizationId,
          current_organization_id: REQUEST.organizationId,
          currentOrganizationId: REQUEST.organizationId,
          foundation: {
            current_step_key: 'organization_info',
            organization_info_confirmed_at: null,
            organization_info_confirmed_by: null,
          },
        },
      }
    );
    expect(emitEvent).toHaveBeenCalledWith('admin_bootstrap_provisioned', {
      organizationId: REQUEST.organizationId,
      operatorUserId: AUTH_CONTEXT.operatorUserId,
      targetEmail: REQUEST.targetEmail,
      targetUserId: '22222222-2222-4222-8222-222222222222',
    });
  });

  it('syncs an existing profile and preserves onboarding progress when already initialized', async () => {
    const { client, insertCalls, updateCalls, updateUserById } = createRepositoryClient({
      users: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          email: REQUEST.targetEmail,
          app_metadata: {
            organization_id: REQUEST.organizationId,
            organizationId: REQUEST.organizationId,
            current_organization_id: REQUEST.organizationId,
            currentOrganizationId: REQUEST.organizationId,
            foundation: {
              current_step_key: 'organization_info',
              organization_info_confirmed_at: null,
              organization_info_confirmed_by: null,
            },
          },
          user_metadata: {},
        },
      ],
      profile: {
        id: '22222222-2222-4222-8222-222222222222',
        organization_id: 'stale-org',
        role: 'user',
        display_name: 'Old Name',
        status: 'pending',
      },
      onboardingProgress: {
        id: '33333333-3333-4333-8333-333333333333',
        organization_id: REQUEST.organizationId,
        current_step: 4,
        current_step_key: 'step4',
      },
    });

    await bootstrapAdmin(client, AUTH_CONTEXT, REQUEST, vi.fn());

    expect(insertCalls).toHaveLength(0);
    expect(updateCalls).toEqual([
      {
        table: 'profiles',
        payload: {
          organization_id: REQUEST.organizationId,
          role: 'admin',
          display_name: REQUEST.displayName,
          status: 'active',
          global_role: 'user',
          account_status: 'active',
        },
        filters: [['id', '22222222-2222-4222-8222-222222222222']],
      },
    ]);
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('rejects bootstrap requests when a global admin targets a different organization', async () => {
    const { client, listUsers, updateUserById } = createRepositoryClient({
      users: [],
      profile: null,
      onboardingProgress: null,
    });

    await expect(bootstrapAdmin(client, ADMIN_AUTH_CONTEXT, REQUEST, vi.fn())).rejects.toMatchObject({
      code: 'organization_access_denied',
      message: 'Authenticated user is not authorized for the requested organization',
      status: 403,
    });

    expect(listUsers).not.toHaveBeenCalled();
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('validates employee import previews without writing and reports duplicate and missing shifts', async () => {
    const { client, rpcCalls, insertCalls, updateCalls } = createRepositoryClient({
      shifts: [
        { id: 'shift-d', code: 'D' },
        { id: 'shift-e', code: 'E' },
      ],
    });

    const result = await validateEmployeeImport(client, AUTH_CONTEXT, {
      organizationId: REQUEST.organizationId,
      month: '2026-04',
      employees: [
        {
          employeeId: 'EMP-1',
          name: 'Kim',
          availableShifts: ['D'],
          rankCode: null,
        },
        {
          employeeId: 'EMP-1',
          name: 'Lee',
          availableShifts: ['X'],
          rankCode: 'RN',
        },
      ],
    });

    expect(result).toEqual({
      organizationId: REQUEST.organizationId,
      month: '2026-04',
      employeeCount: 2,
      duplicateEmployeeIds: ['EMP-1'],
      missingShiftCodes: ['X'],
      isFinalized: false,
      isValid: false,
      previewEmployees: [
        {
          employeeId: 'EMP-1',
          name: 'Kim',
          availableShifts: ['D'],
          rankCode: null,
        },
        {
          employeeId: 'EMP-1',
          name: 'Lee',
          availableShifts: ['X'],
          rankCode: 'RN',
        },
      ],
    });
    expect(rpcCalls).toHaveLength(0);
    expect(insertCalls).toHaveLength(0);
    expect(updateCalls).toHaveLength(0);
  });

  it('applies employee import through the destructive reset boundary when the month is open', async () => {
    const { client, rpcCalls, insertCalls, updateCalls } = createRepositoryClient({
      shifts: [
        { id: 'shift-d', code: 'D' },
        { id: 'shift-e', code: 'E' },
      ],
      schedule: {
        id: 'schedule-123',
        finalized_version_id: null,
      },
    });

    const result = await applyEmployeeImport(client, AUTH_CONTEXT, {
      organizationId: REQUEST.organizationId,
      month: '2026-04',
      employees: [
        {
          employeeId: 'EMP-1',
          name: 'Kim',
          availableShifts: ['D'],
          rankCode: 'RN',
        },
      ],
    });

    expect(result).toEqual({
      organizationId: REQUEST.organizationId,
      month: '2026-04',
      deletedScheduleId: 'schedule-123',
      employeeCount: 2,
      isFinalized: false,
      isValid: true,
      duplicateEmployeeIds: [],
      missingShiftCodes: [],
      previewEmployees: [
        {
          employeeId: 'EMP-1',
          name: 'Kim',
          availableShifts: ['D'],
          rankCode: 'RN',
        },
      ],
    });
    expect(rpcCalls).toEqual([
      {
        fn: 'replace_roster_and_reset_schedule_atomic',
        params: {
          p_organization_id: REQUEST.organizationId,
          p_month: '2026-04',
          p_employees: [
            {
              employee_id: 'EMP-1',
              name: 'Kim',
              available_shifts: ['D'],
              rank_code: 'RN',
            },
          ],
        },
      },
    ]);
    expect(insertCalls).toHaveLength(0);
    expect(updateCalls).toHaveLength(0);
  });

  it('blocks employee import apply when the current month is finalized', async () => {
    const { client, rpcCalls } = createRepositoryClient({
      shifts: [
        { id: 'shift-d', code: 'D' },
      ],
      schedule: {
        id: 'schedule-123',
        finalized_version_id: 'version-final',
      },
    });

    await expect(
      applyEmployeeImport(client, AUTH_CONTEXT, {
        organizationId: REQUEST.organizationId,
        month: '2026-04',
        employees: [
          {
            employeeId: 'EMP-1',
            name: 'Kim',
            availableShifts: ['D'],
          },
        ],
      })
    ).rejects.toMatchObject({
      code: 'already_finalized',
      status: 409,
    });

    expect(rpcCalls).toHaveLength(0);
  });

  it('pages through auth users until the requested email is found', async () => {
    const { client, listUsers } = createRepositoryClient({
      userPages: [
        Array.from({ length: 200 }, (_, index) => ({
          id: `user-${index}`,
          email: `user-${index}@example.com`,
          app_metadata: {},
          user_metadata: {},
        })),
        [
          {
            id: '22222222-2222-4222-8222-222222222222',
            email: REQUEST.targetEmail,
            app_metadata: {},
            user_metadata: {},
          },
        ],
      ],
      profile: null,
      onboardingProgress: null,
    });

    await bootstrapAdmin(client, AUTH_CONTEXT, REQUEST, vi.fn());

    expect(listUsers).toHaveBeenCalledTimes(2);
    expect(listUsers).toHaveBeenNthCalledWith(1, { page: 1, perPage: 200 });
    expect(listUsers).toHaveBeenNthCalledWith(2, { page: 2, perPage: 200 });
  });

  it('treats duplicate profile and onboarding inserts as convergence instead of failure', async () => {
    const { client, insertCalls, updateCalls, updateUserById } = createRepositoryClient({
      users: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          email: REQUEST.targetEmail,
          app_metadata: {},
          user_metadata: {},
        },
      ],
      profileResults: [
        null,
        {
          id: '22222222-2222-4222-8222-222222222222',
          organization_id: REQUEST.organizationId,
          role: 'admin',
          display_name: REQUEST.displayName,
          status: 'active',
        },
      ],
      onboardingProgressResults: [
        null,
        {
          id: '33333333-3333-4333-8333-333333333333',
          organization_id: REQUEST.organizationId,
          current_step: 1,
          current_step_key: 'organization_info',
        },
      ],
      profileInsertErrors: [
        { message: 'duplicate key value violates unique constraint "profiles_pkey"' },
      ],
      onboardingInsertErrors: [
        {
          message:
            'duplicate key value violates unique constraint "onboarding_progress_organization_id_key"',
        },
      ],
    });

    await expect(bootstrapAdmin(client, AUTH_CONTEXT, REQUEST, vi.fn())).resolves.toEqual({
      organizationId: REQUEST.organizationId,
      targetEmail: REQUEST.targetEmail,
      displayName: REQUEST.displayName,
      operatorUserId: AUTH_CONTEXT.operatorUserId,
      onboardingInitializationFlags: REQUEST.onboardingInitializationFlags,
    });

    expect(insertCalls).toEqual([
      {
        table: 'profiles',
        payload: {
          id: '22222222-2222-4222-8222-222222222222',
          organization_id: REQUEST.organizationId,
          role: 'admin',
          display_name: REQUEST.displayName,
          status: 'active',
          global_role: 'user',
          account_status: 'active',
        },
      },
      {
        table: 'onboarding_progress',
        payload: {
          organization_id: REQUEST.organizationId,
          current_step: 1,
          current_step_key: 'organization_info',
          last_actor_user_id: AUTH_CONTEXT.operatorUserId,
        },
      },
    ]);
    expect(updateCalls).toEqual([
      {
        table: 'profiles',
        payload: {
          organization_id: REQUEST.organizationId,
          role: 'admin',
          display_name: REQUEST.displayName,
          status: 'active',
          global_role: 'user',
          account_status: 'active',
        },
        filters: [['id', '22222222-2222-4222-8222-222222222222']],
      },
    ]);
    expect(updateUserById).toHaveBeenCalledTimes(1);
  });

  it('preserves existing foundation progress when aligning missing organization metadata keys', async () => {
    const { client, updateUserById } = createRepositoryClient({
      users: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          email: REQUEST.targetEmail,
          app_metadata: {
            foundation: {
              current_step_key: 'step4_review',
              organization_info_confirmed_at: '2026-04-08T10:00:00Z',
              organization_info_confirmed_by: 'operator-1',
            },
          },
          user_metadata: {},
        },
      ],
      profile: null,
      onboardingProgress: {
        id: '33333333-3333-4333-8333-333333333333',
        organization_id: REQUEST.organizationId,
        current_step: 4,
        current_step_key: 'step4_review',
      },
    });

    await bootstrapAdmin(client, AUTH_CONTEXT, REQUEST, vi.fn());

    expect(updateUserById).toHaveBeenCalledWith(
      '22222222-2222-4222-8222-222222222222',
      {
        app_metadata: {
          organization_id: REQUEST.organizationId,
          organizationId: REQUEST.organizationId,
          current_organization_id: REQUEST.organizationId,
          currentOrganizationId: REQUEST.organizationId,
          foundation: {
            current_step_key: 'step4_review',
            organization_info_confirmed_at: '2026-04-08T10:00:00Z',
            organization_info_confirmed_by: 'operator-1',
          },
        },
      }
    );
  });

  it('rebuilds foundation metadata from onboarding progress when auth metadata is missing', async () => {
    const { client, updateUserById } = createRepositoryClient({
      users: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          email: REQUEST.targetEmail,
          app_metadata: {},
          user_metadata: {},
        },
      ],
      profile: null,
      onboardingProgress: {
        id: '33333333-3333-4333-8333-333333333333',
        organization_id: REQUEST.organizationId,
        current_step: 4,
        current_step_key: 'step4_review',
        organization_info_confirmed_at: '2026-04-08T10:00:00Z',
        organization_info_confirmed_by: 'operator-1',
      },
    });

    await bootstrapAdmin(client, AUTH_CONTEXT, REQUEST, vi.fn());

    expect(updateUserById).toHaveBeenCalledWith(
      '22222222-2222-4222-8222-222222222222',
      {
        app_metadata: {
          organization_id: REQUEST.organizationId,
          organizationId: REQUEST.organizationId,
          current_organization_id: REQUEST.organizationId,
          currentOrganizationId: REQUEST.organizationId,
          foundation: {
            current_step_key: 'step4_review',
            organization_info_confirmed_at: '2026-04-08T10:00:00Z',
            organization_info_confirmed_by: 'operator-1',
          },
        },
      }
    );
  });

  it('preserves legacy foundation progress from user metadata during bootstrap replay', async () => {
    const { client, updateUserById } = createRepositoryClient({
      users: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          email: REQUEST.targetEmail,
          app_metadata: {},
          user_metadata: {
            foundation: {
              currentStepKey: 'step5_ready',
              organizationInfoConfirmedAt: '2026-04-08T10:00:00Z',
              organizationInfoConfirmedBy: 'operator-legacy',
            },
          },
        },
      ],
      profile: null,
      onboardingProgress: {
        id: '33333333-3333-4333-8333-333333333333',
        organization_id: REQUEST.organizationId,
        current_step: 2,
        current_step_key: 'organization_info',
      },
    });

    await bootstrapAdmin(client, AUTH_CONTEXT, REQUEST, vi.fn());

    expect(updateUserById).toHaveBeenCalledWith(
      '22222222-2222-4222-8222-222222222222',
      {
        app_metadata: {
          organization_id: REQUEST.organizationId,
          organizationId: REQUEST.organizationId,
          current_organization_id: REQUEST.organizationId,
          currentOrganizationId: REQUEST.organizationId,
          foundation: {
            current_step_key: 'step5_ready',
            organization_info_confirmed_at: '2026-04-08T10:00:00Z',
            organization_info_confirmed_by: 'operator-legacy',
          },
        },
      }
    );
  });
});
