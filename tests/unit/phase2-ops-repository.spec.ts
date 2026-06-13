import { describe, expect, it, vi } from 'vitest';
import {
  applyEmployeeImport,
  bootstrapAdmin,
  replaceOrganizationRoster,
  saveOrganizationProfile,
  validateEmployeeImport,
} from '@/../supabase/functions/phase2-ops/repository.ts';
import * as phase2OpsRepository from '@/../supabase/functions/phase2-ops/repository.ts';
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
  operatorOrganizationId: '00000000-0000-0000-0000-000000000001',
  operatorGlobalRole: 'super',
  operatorAppMetadata: {},
  operatorUserMetadata: {},
};

const ADMIN_AUTH_CONTEXT: Phase2OpsOperatorAuthContext = {
  operatorUserId: '11111111-1111-4111-8111-111111111111',
  operatorOrganizationId: '00000000-0000-0000-0000-000000000009',
  operatorGlobalRole: 'admin',
  operatorRole: 'admin',
  operatorStatus: 'active',
  operatorAppMetadata: {},
  operatorUserMetadata: {},
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

const POLICY_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001';

class PolicySelectBuilder<T> {
  constructor(private readonly resolveResult: () => QueryResult<T>) {}

  eq() {
    return this;
  }

  order() {
    return this;
  }

  maybeSingle(): Promise<QueryResult<T>> {
    return Promise.resolve(this.resolveResult());
  }

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.resolveResult()).then(onfulfilled ?? undefined, onrejected ?? undefined);
  }
}

function createPolicyRepositoryClient(params: {
  rankCodes?: Array<Record<string, unknown>>;
  policyRules?: Array<Record<string, unknown>>;
  policyRpcError?: { message: string } | null;
}) {
  const deleteCalls: Array<{ table: string; filters: Array<[string, string]> }> = [];
  const insertCalls: Array<{ table: string; payload: unknown }> = [];
  const rpcCalls: Array<{ fn: string; params: Record<string, unknown> }> = [];
  const rankCodes = [...(params.rankCodes ?? [])];
  const policyRules = [...(params.policyRules ?? [])];

  function clearRows(table: string) {
    if (table === 'organization_rank_codes') {
      rankCodes.splice(0, rankCodes.length);
      return;
    }

    if (table === 'off_request_policy_rules') {
      policyRules.splice(0, policyRules.length);
    }
  }

  function normalizeRankCodeRow(row: Record<string, unknown>, index: number) {
    return {
      id: typeof row.id === 'string' && row.id.trim().length > 0 ? row.id.trim() : `rank-code-${index + 1}`,
      organization_id:
        typeof row.organization_id === 'string' && row.organization_id.trim().length > 0
          ? row.organization_id.trim()
          : POLICY_ORGANIZATION_ID,
      code: typeof row.code === 'string' ? row.code.trim() : '',
      label: typeof row.label === 'string' ? row.label.trim() : '',
      display_order:
        typeof row.display_order === 'number'
          ? row.display_order
          : typeof row.displayOrder === 'number'
            ? row.displayOrder
            : index + 1,
      is_active:
        typeof row.is_active === 'boolean'
          ? row.is_active
          : typeof row.isActive === 'boolean'
            ? row.isActive
            : true,
    };
  }

  function normalizePolicyRuleRow(row: Record<string, unknown>, index: number) {
    const rankCode =
      typeof row.rank_code === 'string'
        ? row.rank_code.trim()
        : typeof row.rankCode === 'string'
          ? row.rankCode.trim()
          : null;

    return {
      id:
        typeof row.id === 'string' && row.id.trim().length > 0
          ? row.id.trim()
          : rankCode === null
            ? `policy-rule-default-${index + 1}`
            : `policy-rule-${rankCode.toLowerCase()}-${index + 1}`,
      organization_id:
        typeof row.organization_id === 'string' && row.organization_id.trim().length > 0
          ? row.organization_id.trim()
          : POLICY_ORGANIZATION_ID,
      rank_code: rankCode,
      period_type:
        typeof row.period_type === 'string'
          ? row.period_type
          : typeof row.periodType === 'string'
            ? row.periodType
            : 'monthly',
      limit_count:
        typeof row.limit_count === 'number'
          ? row.limit_count
          : typeof row.limitCount === 'number'
            ? row.limitCount
            : 0,
      is_active:
        typeof row.is_active === 'boolean'
          ? row.is_active
          : typeof row.isActive === 'boolean'
            ? row.isActive
            : true,
    };
  }

  const client = {
    auth: {
      admin: {
        listUsers: vi.fn(),
        updateUserById: vi.fn(),
      },
    },
    rpc: vi.fn().mockImplementation(async (fn: string, rpcParams: Record<string, unknown>) => {
      rpcCalls.push({ fn, params: rpcParams });

      if (fn !== 'replace_off_request_policy_setup_atomic') {
        return { data: null, error: null };
      }

      if (params.policyRpcError) {
        return { data: null, error: params.policyRpcError };
      }

      const rankRows = Array.isArray(rpcParams.p_rank_codes) ? rpcParams.p_rank_codes : [];
      const policyRows = Array.isArray(rpcParams.p_policy_rules) ? rpcParams.p_policy_rules : [];
      rankCodes.splice(
        0,
        rankCodes.length,
        ...rankRows.map((row, index) => normalizeRankCodeRow(row as Record<string, unknown>, index))
      );
      policyRules.splice(
        0,
        policyRules.length,
        ...policyRows.map((row, index) => normalizePolicyRuleRow(row as Record<string, unknown>, index))
      );

      return { data: null, error: null };
    }),
    from(table: string) {
      if (table === 'organization_rank_codes') {
        return {
          select() {
            return new PolicySelectBuilder(() => ({
              data: rankCodes,
              error: null,
            }));
          },
          delete() {
            return {
              eq(column: string, value: string) {
                deleteCalls.push({ table, filters: [[column, value]] });
                clearRows(table);
                return Promise.resolve({
                  data: null,
                  error: null,
                });
              },
            };
          },
          insert(payload: unknown) {
            insertCalls.push({ table, payload });
            const rows = Array.isArray(payload) ? payload : [payload];
            rows.forEach((row, index) => {
              rankCodes.push(normalizeRankCodeRow(row as Record<string, unknown>, index));
            });
            return Promise.resolve({
              data: null,
              error: null,
            });
          },
        };
      }

      if (table === 'off_request_policy_rules') {
        return {
          select() {
            return new PolicySelectBuilder(() => ({
              data: policyRules,
              error: null,
            }));
          },
          delete() {
            return {
              eq(column: string, value: string) {
                deleteCalls.push({ table, filters: [[column, value]] });
                clearRows(table);
                return Promise.resolve({
                  data: null,
                  error: null,
                });
              },
            };
          },
          insert(payload: unknown) {
            insertCalls.push({ table, payload });
            const rows = Array.isArray(payload) ? payload : [payload];
            rows.forEach((row, index) => {
              policyRules.push(normalizePolicyRuleRow(row as Record<string, unknown>, index));
            });
            return Promise.resolve({
              data: null,
              error: null,
            });
          },
        };
      }

      throw new Error(`Unexpected policy table ${table}`);
    },
  } as unknown as Phase2OpsRepositoryClient;

  return { client, deleteCalls, insertCalls, rpcCalls };
}

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

  it('rejects organization profile writes when the request body drifts from the authenticated organization header', async () => {
    const { client, updateCalls, updateUserById } = createRepositoryClient({
      onboardingProgress: {
        id: 'progress-1',
        organization_id: REQUEST.organizationId,
        current_step: 1,
        current_step_key: 'organization_profile',
        organization_info_confirmed_at: null,
        organization_info_confirmed_by: null,
      },
    });

    await expect(
      saveOrganizationProfile(client, AUTH_CONTEXT, {
        organizationId: '00000000-0000-0000-0000-000000000009',
        name: '서울병원',
        type: 'hospital',
      })
    ).rejects.toMatchObject({
      code: 'organization_access_denied',
      status: 403,
    });

    expect(updateCalls).toHaveLength(0);
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
              preceptor_employee_id: null,
            },
          ],
        },
      },
    ]);
    expect(insertCalls).toHaveLength(0);
    expect(updateCalls).toHaveLength(0);
  });

  it('replaces the organization roster through the dedicated atomic RPC boundary', async () => {
    const { client, rpcCalls, insertCalls, updateCalls } = createRepositoryClient({
      shifts: [
        { id: 'shift-d', code: 'D' },
        { id: 'shift-e', code: 'E' },
      ],
    });

    const result = await replaceOrganizationRoster(client, AUTH_CONTEXT, {
      organizationId: REQUEST.organizationId,
      employees: [
        {
          employeeId: 'EMP-1',
          name: 'Kim',
          availableShifts: ['D'],
          rankCode: 'RN',
        },
        {
          employeeId: 'EMP-2',
          name: 'Lee',
          availableShifts: ['E'],
          rankCode: null,
        },
      ],
    });

    expect(result).toEqual({
      organizationId: REQUEST.organizationId,
      employeeCount: 2,
    });
    expect(rpcCalls).toEqual([
      {
        fn: 'replace_organization_roster_atomic',
        params: {
          p_organization_id: REQUEST.organizationId,
          p_employees: [
            {
              employee_id: 'EMP-1',
              name: 'Kim',
              available_shifts: ['D'],
              rank_code: 'RN',
              preceptor_employee_id: null,
            },
            {
              employee_id: 'EMP-2',
              name: 'Lee',
              available_shifts: ['E'],
              rank_code: null,
              preceptor_employee_id: null,
            },
          ],
        },
      },
    ]);
    expect(insertCalls).toHaveLength(0);
    expect(updateCalls).toHaveLength(0);
  });

  it('uses normalized employee fields and shift codes for the org-level roster replace RPC payload', async () => {
    const { client, rpcCalls } = createRepositoryClient({
      shifts: [
        { id: 'shift-d', code: 'D' },
      ],
    });

    await replaceOrganizationRoster(client, AUTH_CONTEXT, {
      organizationId: REQUEST.organizationId,
      employees: [
        {
          employeeId: ' EMP-1 ',
          name: ' Kim ',
          availableShifts: [' d '],
          rankCode: ' RN ',
        },
      ],
    });

    expect(rpcCalls).toEqual([
      {
        fn: 'replace_organization_roster_atomic',
        params: {
          p_organization_id: REQUEST.organizationId,
          p_employees: [
            {
              employee_id: 'EMP-1',
              name: 'Kim',
              available_shifts: ['D'],
              rank_code: 'RN',
              preceptor_employee_id: null,
            },
          ],
        },
      },
    ]);
  });

  it('maps preceptorEmployeeId to preceptor_employee_id in org-level roster replace RPC payload', async () => {
    const { client, rpcCalls } = createRepositoryClient({
      shifts: [
        { id: 'shift-d', code: 'D' },
        { id: 'shift-e', code: 'E' },
      ],
    });

    await replaceOrganizationRoster(client, AUTH_CONTEXT, {
      organizationId: REQUEST.organizationId,
      employees: [
        {
          employeeId: 'EMP-1',
          name: 'Kim',
          availableShifts: ['D', 'E'],
          rankCode: 'RN',
          preceptorEmployeeId: 'EMP-2',
        },
        {
          employeeId: 'EMP-2',
          name: 'Lee',
          availableShifts: ['D', 'E'],
          rankCode: null,
        },
      ],
    });

    expect(rpcCalls).toEqual([
      {
        fn: 'replace_organization_roster_atomic',
        params: {
          p_organization_id: REQUEST.organizationId,
          p_employees: [
            {
              employee_id: 'EMP-1',
              name: 'Kim',
              available_shifts: ['D', 'E'],
              rank_code: 'RN',
              preceptor_employee_id: 'EMP-2',
            },
            {
              employee_id: 'EMP-2',
              name: 'Lee',
              available_shifts: ['D', 'E'],
              rank_code: null,
              preceptor_employee_id: null,
            },
          ],
        },
      },
    ]);
  });

  it('rejects org-level roster replace when duplicate employee IDs are present', async () => {
    const { client, rpcCalls } = createRepositoryClient({
      shifts: [
        { id: 'shift-d', code: 'D' },
      ],
    });

    await expect(
      replaceOrganizationRoster(client, AUTH_CONTEXT, {
        organizationId: REQUEST.organizationId,
        employees: [
          {
            employeeId: 'EMP-1',
            name: 'Kim',
            availableShifts: ['D'],
          },
          {
            employeeId: 'EMP-1',
            name: 'Lee',
            availableShifts: ['D'],
          },
        ],
      })
    ).rejects.toMatchObject({
      code: 'bad_request',
      message: 'Duplicate employee IDs: EMP-1',
      status: 400,
    });

    expect(rpcCalls).toHaveLength(0);
  });

  it('rejects org-level roster replace when the roster payload is empty', async () => {
    const { client, rpcCalls } = createRepositoryClient({
      shifts: [
        { id: 'shift-d', code: 'D' },
      ],
    });

    await expect(
      replaceOrganizationRoster(client, AUTH_CONTEXT, {
        organizationId: REQUEST.organizationId,
        employees: [],
      })
    ).rejects.toMatchObject({
      code: 'bad_request',
      message: 'At least one employee is required',
      status: 400,
    });

    expect(rpcCalls).toHaveLength(0);
  });

  it('rejects org-level roster replace when unknown shift codes are present', async () => {
    const { client, rpcCalls } = createRepositoryClient({
      shifts: [
        { id: 'shift-d', code: 'D' },
      ],
    });

    await expect(
      replaceOrganizationRoster(client, AUTH_CONTEXT, {
        organizationId: REQUEST.organizationId,
        employees: [
          {
            employeeId: 'EMP-1',
            name: 'Kim',
            availableShifts: ['X'],
          },
        ],
      })
    ).rejects.toMatchObject({
      code: 'bad_request',
      message: 'Unknown shift codes: X',
      status: 400,
    });

    expect(rpcCalls).toHaveLength(0);
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

  it('loads rank and default off-request policies and resolves null-rank employees to the default rule', async () => {
    const { client } = createPolicyRepositoryClient({
      rankCodes: [
        {
          id: 'rank-code-1',
          organization_id: POLICY_ORGANIZATION_ID,
          code: 'RN',
          label: 'Registered Nurse',
          display_order: 1,
          is_active: true,
        },
      ],
      policyRules: [
        {
          id: 'policy-rule-default',
          organization_id: POLICY_ORGANIZATION_ID,
          rank_code: null,
          period_type: 'monthly',
          limit_count: 4,
          is_active: true,
        },
        {
          id: 'policy-rule-rn',
          organization_id: POLICY_ORGANIZATION_ID,
          rank_code: 'RN',
          period_type: 'monthly',
          limit_count: 6,
          is_active: true,
        },
      ],
    });

    const result = await (phase2OpsRepository as any).getOffRequestPolicySetup(
      client,
      AUTH_CONTEXT,
      POLICY_ORGANIZATION_ID
    );

    expect(result).toEqual({
      organizationId: POLICY_ORGANIZATION_ID,
      rankCodes: [
        {
          id: 'rank-code-1',
          organizationId: POLICY_ORGANIZATION_ID,
          code: 'RN',
          label: 'Registered Nurse',
          displayOrder: 1,
          isActive: true,
        },
      ],
      policyRules: [
        {
          id: 'policy-rule-default',
          organizationId: POLICY_ORGANIZATION_ID,
          rankCode: null,
          periodType: 'monthly',
          limitCount: 4,
          isActive: true,
        },
        {
          id: 'policy-rule-rn',
          organizationId: POLICY_ORGANIZATION_ID,
          rankCode: 'RN',
          periodType: 'monthly',
          limitCount: 6,
          isActive: true,
        },
      ],
    });

    expect(
      (phase2OpsRepository as any).resolveApplicableOffRequestPolicyRule(
        result.policyRules,
        null,
        'monthly'
      )
    ).toEqual({
      id: 'policy-rule-default',
      organizationId: POLICY_ORGANIZATION_ID,
      rankCode: null,
      periodType: 'monthly',
      limitCount: 4,
      isActive: true,
    });
  });

  it('saves rank/default off-request policies through the repository', async () => {
    const { client, deleteCalls, insertCalls, rpcCalls } = createPolicyRepositoryClient({
      rankCodes: [],
      policyRules: [],
    });

    const request = {
      organizationId: POLICY_ORGANIZATION_ID,
      rankCodes: [
        {
          id: 'rank-code-1',
          code: 'RN',
          label: 'Registered Nurse',
          displayOrder: 1,
          isActive: true,
        },
      ],
      policyRules: [
        {
          id: 'policy-rule-default',
          rankCode: null,
          periodType: 'monthly',
          limitCount: 4,
          isActive: true,
        },
        {
          id: 'policy-rule-rn',
          rankCode: 'RN',
          periodType: 'monthly',
          limitCount: 6,
          isActive: true,
        },
      ],
    };

    const result = await (phase2OpsRepository as any).saveOffRequestPolicySetup(
      client,
      AUTH_CONTEXT,
      request
    );

    expect(deleteCalls).toHaveLength(0);
    expect(insertCalls).toHaveLength(0);
    expect(rpcCalls).toEqual([
      {
        fn: 'replace_off_request_policy_setup_atomic',
        params: {
          p_organization_id: POLICY_ORGANIZATION_ID,
          p_rank_codes: [
            {
              id: 'rank-code-1',
              code: 'RN',
              label: 'Registered Nurse',
              display_order: 1,
              is_active: true,
            },
          ],
          p_policy_rules: [
            {
              id: 'policy-rule-default',
              rank_code: null,
              period_type: 'monthly',
              limit_count: 4,
              is_active: true,
            },
            {
              id: 'policy-rule-rn',
              rank_code: 'RN',
              period_type: 'monthly',
              limit_count: 6,
              is_active: true,
            },
          ],
        },
      },
    ]);
    expect(result).toEqual({
      organizationId: POLICY_ORGANIZATION_ID,
      rankCodes: [
        {
          id: 'rank-code-1',
          organizationId: POLICY_ORGANIZATION_ID,
          code: 'RN',
          label: 'Registered Nurse',
          displayOrder: 1,
          isActive: true,
        },
      ],
      policyRules: [
        {
          id: 'policy-rule-default',
          organizationId: POLICY_ORGANIZATION_ID,
          rankCode: null,
          periodType: 'monthly',
          limitCount: 4,
          isActive: true,
        },
        {
          id: 'policy-rule-rn',
          organizationId: POLICY_ORGANIZATION_ID,
          rankCode: 'RN',
          periodType: 'monthly',
          limitCount: 6,
          isActive: true,
        },
      ],
    });
  });

  it('rejects off-request policy rules that reference unknown rank codes before any writes', async () => {
    const { client, deleteCalls, insertCalls } = createPolicyRepositoryClient({
      rankCodes: [],
      policyRules: [],
    });

    await expect(
      (phase2OpsRepository as any).saveOffRequestPolicySetup(client, AUTH_CONTEXT, {
        organizationId: POLICY_ORGANIZATION_ID,
        rankCodes: [],
        policyRules: [
          {
            rankCode: 'RN',
            periodType: 'monthly',
            limitCount: 4,
            isActive: true,
          },
        ],
      })
    ).rejects.toMatchObject({
      code: 'bad_request',
      message: 'Unknown or inactive rank code in off-request policy rule: RN',
      status: 400,
    });

    expect(deleteCalls).toHaveLength(0);
    expect(insertCalls).toHaveLength(0);
  });

  it('rejects off-request policy rules that reference inactive rank codes before any writes', async () => {
    const { client, deleteCalls, insertCalls } = createPolicyRepositoryClient({
      rankCodes: [],
      policyRules: [],
    });

    await expect(
      (phase2OpsRepository as any).saveOffRequestPolicySetup(client, AUTH_CONTEXT, {
        organizationId: POLICY_ORGANIZATION_ID,
        rankCodes: [
          {
            code: 'RN',
            label: 'Registered Nurse',
            displayOrder: 1,
            isActive: false,
          },
        ],
        policyRules: [
          {
            rankCode: 'RN',
            periodType: 'monthly',
            limitCount: 4,
            isActive: true,
          },
        ],
      })
    ).rejects.toMatchObject({
      code: 'bad_request',
      message: 'Unknown or inactive rank code in off-request policy rule: RN',
      status: 400,
    });

    expect(deleteCalls).toHaveLength(0);
    expect(insertCalls).toHaveLength(0);
  });

  it('rejects overlapping active rank policies for the same period', async () => {
    const { client, deleteCalls, insertCalls } = createPolicyRepositoryClient({
      rankCodes: [],
      policyRules: [],
    });

    await expect(
      (phase2OpsRepository as any).saveOffRequestPolicySetup(client, AUTH_CONTEXT, {
        organizationId: POLICY_ORGANIZATION_ID,
        rankCodes: [],
        policyRules: [
          {
            rankCode: 'RN',
            periodType: 'monthly',
            limitCount: 4,
            isActive: true,
          },
          {
            rankCode: 'RN',
            periodType: 'monthly',
            limitCount: 5,
            isActive: true,
          },
        ],
      })
    ).rejects.toMatchObject({
      code: 'bad_request',
    });

    expect(deleteCalls).toHaveLength(0);
    expect(insertCalls).toHaveLength(0);
  });

  it('rejects a second active default rule for the same organization and period', async () => {
    const { client, deleteCalls, insertCalls } = createPolicyRepositoryClient({
      rankCodes: [],
      policyRules: [],
    });

    await expect(
      (phase2OpsRepository as any).saveOffRequestPolicySetup(client, AUTH_CONTEXT, {
        organizationId: POLICY_ORGANIZATION_ID,
        rankCodes: [],
        policyRules: [
          {
            rankCode: null,
            periodType: 'annual',
            limitCount: 12,
            isActive: true,
          },
          {
            rankCode: null,
            periodType: 'annual',
            limitCount: 10,
            isActive: true,
          },
        ],
      })
    ).rejects.toMatchObject({
      code: 'bad_request',
    });

    expect(deleteCalls).toHaveLength(0);
    expect(insertCalls).toHaveLength(0);
  });

  it('keeps completed onboarding rows closed when saving organization profile', async () => {
    const organizationId = '00000000-0000-0000-0000-000000000001';
    const { client, updateCalls, updateUserById } = createRepositoryClient({
      onboardingProgress: {
        id: 'progress-1',
        organization_id: organizationId,
        current_step: 4,
        current_step_key: null,
        completed_at: '2026-04-01T00:00:00.000Z',
        organization_info_confirmed_at: '2026-03-01T00:00:00.000Z',
        organization_info_confirmed_by: AUTH_CONTEXT.operatorUserId,
      },
    });

    const response = await saveOrganizationProfile(client, {
      ...ADMIN_AUTH_CONTEXT,
      operatorOrganizationId: organizationId,
      operatorAppMetadata: {
        organization_id: organizationId,
        organizationId,
        current_organization_id: organizationId,
        currentOrganizationId: organizationId,
      },
    }, {
      organizationId,
      name: '서울병원',
      type: 'hospital',
    });

    expect(response).toEqual({
      organizationId,
      name: '서울병원',
      type: 'hospital',
    });
    expect(updateCalls).toEqual([
      {
        table: 'organizations',
        payload: {
          name: '서울병원',
          type: 'hospital',
        },
        filters: [['id', organizationId]],
      },
      {
        table: 'onboarding_progress',
        payload: {
          organization_info_confirmed_at: expect.any(String),
          organization_info_confirmed_by: AUTH_CONTEXT.operatorUserId,
          last_actor_user_id: AUTH_CONTEXT.operatorUserId,
        },
        filters: [['organization_id', organizationId]],
      },
    ]);
    expect(updateUserById).toHaveBeenCalledWith(AUTH_CONTEXT.operatorUserId, {
      app_metadata: expect.objectContaining({
        organization_id: organizationId,
        organizationId,
        current_organization_id: organizationId,
        currentOrganizationId: organizationId,
        foundation: expect.objectContaining({
          organization_info_confirmed_at: expect.any(String),
          organization_info_confirmed_by: AUTH_CONTEXT.operatorUserId,
        }),
      }),
    });
  });

  it('refreshes stale operator foundation metadata when saving organization profile', async () => {
    const organizationId = '00000000-0000-0000-0000-000000000001';
    const { client, updateUserById } = createRepositoryClient({
      onboardingProgress: {
        id: 'progress-1',
        organization_id: organizationId,
        current_step: 1,
        current_step_key: 'organization_profile',
        organization_info_confirmed_at: null,
        organization_info_confirmed_by: null,
      },
    });

    await saveOrganizationProfile(client, {
      ...ADMIN_AUTH_CONTEXT,
      operatorOrganizationId: organizationId,
      operatorAppMetadata: {
        organization_id: organizationId,
        foundation: {
          current_step_key: 'organization_profile',
          organization_info_confirmed_at: '2026-03-01T00:00:00.000Z',
          organization_info_confirmed_by: 'stale-user',
        },
      },
    }, {
      organizationId,
      name: '서울병원',
      type: 'hospital',
    });

    expect(updateUserById).toHaveBeenCalledWith(AUTH_CONTEXT.operatorUserId, {
      app_metadata: expect.objectContaining({
        organization_id: organizationId,
        foundation: expect.objectContaining({
          current_step_key: 'schedule_foundation',
          organization_info_confirmed_at: expect.any(String),
          organization_info_confirmed_by: AUTH_CONTEXT.operatorUserId,
        }),
      }),
    });
  });

  it('does not sync operator metadata when a super user saves the scoped organization profile', async () => {
    const organizationId = AUTH_CONTEXT.operatorOrganizationId!;
    const { client, updateUserById } = createRepositoryClient({
      onboardingProgress: {
        id: 'progress-1',
        organization_id: organizationId,
        current_step: 1,
        current_step_key: 'organization_profile',
        organization_info_confirmed_at: null,
        organization_info_confirmed_by: null,
      },
    });

    await saveOrganizationProfile(client, AUTH_CONTEXT, {
      organizationId,
      name: '서울병원',
      type: 'hospital',
    });

    expect(updateUserById).not.toHaveBeenCalled();
  });
});
