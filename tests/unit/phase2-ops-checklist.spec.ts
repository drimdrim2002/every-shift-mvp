import { describe, expect, it, vi } from 'vitest';
import { buildChecklistResponse, type ChecklistSnapshot } from '@/../supabase/functions/phase2-ops/checklist.ts';
import { getChecklist, updateChecklist, type Phase2OpsRepositoryClient } from '@/../supabase/functions/phase2-ops/repository.ts';
import type { Phase2OpsOperatorAuthContext } from '@/../supabase/functions/phase2-ops/auth.ts';

interface QueryResult<T> {
  data: T | null;
  error: { message: string } | null;
}

type TableRowValue = Record<string, unknown> | Array<Record<string, unknown>> | null;

class FakeQueryBuilder {
  private filters: Array<[string, string]> = [];

  constructor(
    private readonly table: string,
    private readonly rowsByTable: Record<string, TableRowValue>,
    private readonly calls: Array<{ table: string; method: string; args: unknown[] }>,
    private readonly updateCalls: Array<{
      table: string;
      payload: Record<string, unknown>;
      filters: Array<[string, string]>;
    }>
  ) {}

  select(columns: string) {
    this.calls.push({ table: this.table, method: 'select', args: [columns] });
    return this;
  }

  eq(column: string, value: string) {
    this.calls.push({ table: this.table, method: 'eq', args: [column, value] });
    this.filters.push([column, value]);
    return this;
  }

  limit(count: number) {
    this.calls.push({ table: this.table, method: 'limit', args: [count] });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.calls.push({ table: this.table, method: 'order', args: [column, options] });
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.calls.push({ table: this.table, method: 'update', args: [payload] });
    return {
      eq: async (column: string, value: string): Promise<QueryResult<null>> => {
        this.updateCalls.push({
          table: this.table,
          payload,
          filters: [...this.filters, [column, value]],
        });

        const current = this.rowsByTable[this.table];
        if (Array.isArray(current) && current.length > 0) {
          this.rowsByTable[this.table] = [{ ...current[0], ...payload }];
        } else if (current && !Array.isArray(current)) {
          this.rowsByTable[this.table] = { ...current, ...payload };
        }

        return { data: null, error: null };
      },
    };
  }

  maybeSingle(): Promise<QueryResult<Record<string, unknown>>> {
    const value = this.rowsByTable[this.table];
    const row = Array.isArray(value) ? (value[0] ?? null) : value;
    return Promise.resolve({
      data: row,
      error: null,
    });
  }

  then<TResult1 = QueryResult<Array<Record<string, unknown>>>, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult<Array<Record<string, unknown>>>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    const value = this.rowsByTable[this.table];
    const rows = Array.isArray(value) ? value : value ? [value] : [];

    return Promise.resolve({
      data: rows,
      error: null,
    }).then(onfulfilled ?? undefined, onrejected ?? undefined);
  }
}

function createRepositoryClient(rowsByTable: Record<string, TableRowValue>) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
  const updateCalls: Array<{
    table: string;
    payload: Record<string, unknown>;
    filters: Array<[string, string]>;
  }> = [];

  const client: Phase2OpsRepositoryClient = {
    auth: {
      admin: {
        listUsers: vi.fn(),
        updateUserById: vi.fn(),
      },
    },
    rpc: vi.fn(),
    from(table) {
      return new FakeQueryBuilder(table, rowsByTable, calls, updateCalls) as never;
    },
  };

  return { client, calls, updateCalls, rowsByTable };
}

const AUTH_CONTEXT: Phase2OpsOperatorAuthContext = {
  operatorUserId: '11111111-1111-4111-8111-111111111111',
  operatorOrganizationId: '00000000-0000-0000-0000-000000000001',
  operatorGlobalRole: 'admin',
};

function createBlockedSnapshot(): ChecklistSnapshot {
  return {
    organizationId: AUTH_CONTEXT.operatorOrganizationId,
    organizationName: null,
    organizationType: null,
    checklistCursor: 'organization_profile',
    organizationProfileConfirmedAt: null,
    scheduleActiveSiteCount: 0,
    pilotSiteId: null,
    minimumRestHours: null,
    shiftCount: 0,
    siteRequirementCount: 0,
    employeeCount: 0,
    hasMonthlyDefaultOffRequestPolicy: false,
    hasAnnualDefaultOffRequestPolicy: false,
    scheduleReviewRoute: null,
    fairnessSummary: [],
  };
}

describe('phase2 ops checklist', () => {
  it('builds blocked checklist items from empty snapshot state', () => {
    const response = buildChecklistResponse(createBlockedSnapshot());

    expect(response.ready).toBe(false);
    expect(response.checklistCursor).toBe('organization_profile');
    expect(response.items).toHaveLength(5);
    expect(response.items.find((item) => item.key === 'organization_profile')).toEqual(
      expect.objectContaining({
        status: 'blocked',
        route: '/ops/organization-setup',
      })
    );
    expect(response.items.find((item) => item.key === 'schedule_foundation')).toEqual(
      expect.objectContaining({
        status: 'blocked',
        route: '/schedule/step2',
      })
    );
    expect(response.items.find((item) => item.key === 'employee_roster')).toEqual(
      expect.objectContaining({
        status: 'blocked',
        route: '/schedule/step3',
      })
    );
    expect(response.items.find((item) => item.key === 'off_request_policy')).toEqual(
      expect.objectContaining({
        status: 'blocked',
        route: '/ops/off-request-policy-setup',
      })
    );
    expect(response.items.find((item) => item.key === 'schedule_review')).toEqual(
      expect.objectContaining({
        status: 'blocked',
        route: null,
      })
    );
  });

  it('builds ready checklist items and preserves fairness summary as read-only context', () => {
    const response = buildChecklistResponse({
      organizationId: AUTH_CONTEXT.operatorOrganizationId,
      organizationName: '서울병원',
      organizationType: 'hospital',
      checklistCursor: 'schedule_review',
      organizationProfileConfirmedAt: '2026-04-09T00:00:00Z',
      scheduleActiveSiteCount: 1,
      pilotSiteId: 'site-1',
      minimumRestHours: 11,
      shiftCount: 4,
      siteRequirementCount: 21,
      employeeCount: 30,
      hasMonthlyDefaultOffRequestPolicy: true,
      hasAnnualDefaultOffRequestPolicy: true,
      scheduleReviewRoute: '/schedule/step5/schedule-2',
      fairnessSummary: [
        {
          months: 3,
          windowStartMonth: '2026-02',
          windowEndMonth: '2026-04',
          finalizedVersionCount: 1,
          proofSummary: {
            weeklyHoursViolations: 1,
            nnnViolations: 2,
            nodViolations: 3,
            minimumRestViolations: 4,
            staffingShortfalls: 5,
          },
        },
      ],
    });

    expect(response.ready).toBe(true);
    expect(response.items.every((item) => item.status === 'ready')).toBe(true);
    expect(response.items.find((item) => item.key === 'schedule_review')).toEqual(
      expect.objectContaining({
        status: 'ready',
        route: '/schedule/step5/schedule-2',
      })
    );
    expect(response.fairnessSummary).toEqual([
      expect.objectContaining({
        months: 3,
        finalizedVersionCount: 1,
      }),
    ]);
  });

  it('derives checklist readiness from repository snapshot tables on GET', async () => {
    const { client, calls } = createRepositoryClient({
      organizations: {
        id: AUTH_CONTEXT.operatorOrganizationId,
        name: '서울병원',
        type: 'hospital',
      },
      onboarding_progress: {
        id: 'progress-1',
        organization_id: AUTH_CONTEXT.operatorOrganizationId,
        current_step: 3,
        current_step_key: 'employee_roster',
        organization_info_confirmed_at: '2026-04-09T00:00:00Z',
        organization_info_confirmed_by: AUTH_CONTEXT.operatorUserId,
      },
      organization_settings: {
        organization_id: AUTH_CONTEXT.operatorOrganizationId,
        pilot_site_id: 'site-1',
        minimum_rest_hours: 11,
        checklist_cursor: '',
      },
      sites: [
        {
          id: 'site-1',
          organization_id: AUTH_CONTEXT.operatorOrganizationId,
          is_active: true,
          is_schedule_active: true,
        },
      ],
      shifts: [
        { id: 'shift-1', code: 'D' },
      ],
      site_requirements: [
        { id: 'req-1', organization_id: AUTH_CONTEXT.operatorOrganizationId },
      ],
      employees: [
        { id: 'emp-1' },
      ],
      off_request_policy_rules: [
        {
          id: 'policy-monthly',
          organization_id: AUTH_CONTEXT.operatorOrganizationId,
          rank_code: null,
          period_type: 'monthly',
          limit_count: 2,
          is_active: true,
        },
        {
          id: 'policy-annual',
          organization_id: AUTH_CONTEXT.operatorOrganizationId,
          rank_code: null,
          period_type: 'annual',
          limit_count: 12,
          is_active: true,
        },
      ],
      schedules: [
        {
          id: 'schedule-1',
          organization_id: AUTH_CONTEXT.operatorOrganizationId,
          month: '2026-04',
          finalized_version_id: null,
        },
      ],
      fairness_ledger_monthly: [
        {
          organization_id: AUTH_CONTEXT.operatorOrganizationId,
          month: '2026-04',
          finalized_at: '2026-04-30T09:00:00Z',
          result_status: 'passed',
          proof_summary: {
            weeklyHoursViolations: 0,
            nnnViolations: 0,
            nodViolations: 0,
            minimumRestViolations: 0,
            staffingShortfalls: 0,
          },
          comparison_metrics: {},
        },
        {
          organization_id: AUTH_CONTEXT.operatorOrganizationId,
          month: '2026-05',
          finalized_at: null,
          result_status: 'draft',
          proof_summary: {
            weeklyHoursViolations: 99,
            nnnViolations: 99,
            nodViolations: 99,
            minimumRestViolations: 99,
            staffingShortfalls: 99,
          },
          comparison_metrics: {},
        },
      ],
    });

    const response = await getChecklist(client, AUTH_CONTEXT, AUTH_CONTEXT.operatorOrganizationId);

    expect(response.ready).toBe(true);
    expect(response.checklistCursor).toBe('employee_roster');
    expect(response.items.find((item) => item.key === 'schedule_review')).toEqual(
      expect.objectContaining({
        status: 'ready',
        route: '/schedule/step5/schedule-1',
      })
    );
    expect(calls.some((call) => call.table === 'site_requirements')).toBe(true);
    expect(calls.some((call) => call.table === 'fairness_ledger_monthly')).toBe(true);
    expect(
      calls.some((call) =>
        call.table === 'fairness_ledger_monthly'
        && call.method === 'eq'
        && call.args[0] === 'result_status'
        && call.args[1] === 'passed'
      )
    ).toBe(true);
    expect(response.fairnessSummary.find((item) => item.months === 3)).toEqual(
      expect.objectContaining({
        windowEndMonth: '2026-04',
        finalizedVersionCount: 1,
        proofSummary: expect.objectContaining({
          weeklyHoursViolations: 0,
        }),
      })
    );
  });

  it('normalizes the legacy organization_info cursor on GET', async () => {
    const { client } = createRepositoryClient({
      organizations: {
        id: AUTH_CONTEXT.operatorOrganizationId,
        name: '서울병원',
        type: 'hospital',
      },
      onboarding_progress: {
        id: 'progress-legacy',
        organization_id: AUTH_CONTEXT.operatorOrganizationId,
        current_step: 1,
        current_step_key: 'organization_info',
        organization_info_confirmed_at: null,
        organization_info_confirmed_by: null,
      },
    });

    const response = await getChecklist(client, AUTH_CONTEXT, AUTH_CONTEXT.operatorOrganizationId);

    expect(response.checklistCursor).toBe('organization_profile');
  });

  it('normalizes the legacy schedule_request cursor on GET', async () => {
    const { client } = createRepositoryClient({
      organizations: {
        id: AUTH_CONTEXT.operatorOrganizationId,
        name: '서울병원',
        type: 'hospital',
      },
      onboarding_progress: {
        id: 'progress-1',
        organization_id: AUTH_CONTEXT.operatorOrganizationId,
        current_step: 3,
        current_step_key: 'schedule_request',
        organization_info_confirmed_at: '2026-04-09T00:00:00Z',
        organization_info_confirmed_by: AUTH_CONTEXT.operatorUserId,
      },
      organization_settings: {
        organization_id: AUTH_CONTEXT.operatorOrganizationId,
        pilot_site_id: null,
        minimum_rest_hours: 11,
        checklist_cursor: '',
      },
      sites: [],
      shifts: [],
      site_requirements: [],
      employees: [],
      off_request_policy_rules: [],
      schedules: [],
      fairness_ledger_monthly: [],
    });

    const response = await getChecklist(client, AUTH_CONTEXT, AUTH_CONTEXT.operatorOrganizationId);

    expect(response.checklistCursor).toBe('off_request_policy');
  });

  it('patches checklist cursor through onboarding_progress and returns the full derived response', async () => {
    const { client, updateCalls, rowsByTable } = createRepositoryClient({
      organizations: {
        id: AUTH_CONTEXT.operatorOrganizationId,
        name: '서울병원',
        type: 'hospital',
      },
      onboarding_progress: {
        id: 'progress-1',
        organization_id: AUTH_CONTEXT.operatorOrganizationId,
        current_step: 1,
        current_step_key: 'organization_profile',
        organization_info_confirmed_at: '2026-04-09T00:00:00Z',
        organization_info_confirmed_by: AUTH_CONTEXT.operatorUserId,
      },
      organization_settings: {
        organization_id: AUTH_CONTEXT.operatorOrganizationId,
        pilot_site_id: 'site-1',
        minimum_rest_hours: 11,
        checklist_cursor: '',
      },
      sites: [
        {
          id: 'site-1',
          organization_id: AUTH_CONTEXT.operatorOrganizationId,
          is_active: true,
          is_schedule_active: true,
        },
      ],
      shifts: [{ id: 'shift-1', code: 'D' }],
      site_requirements: [{ id: 'req-1', organization_id: AUTH_CONTEXT.operatorOrganizationId }],
      employees: [{ id: 'emp-1' }],
      off_request_policy_rules: [
        {
          id: 'policy-monthly',
          organization_id: AUTH_CONTEXT.operatorOrganizationId,
          rank_code: null,
          period_type: 'monthly',
          limit_count: 2,
          is_active: true,
        },
        {
          id: 'policy-annual',
          organization_id: AUTH_CONTEXT.operatorOrganizationId,
          rank_code: null,
          period_type: 'annual',
          limit_count: 12,
          is_active: true,
        },
      ],
      schedules: [
        {
          id: 'schedule-1',
          organization_id: AUTH_CONTEXT.operatorOrganizationId,
          month: '2026-04',
          finalized_version_id: null,
        },
      ],
      fairness_ledger_monthly: [],
    });

    const response = await updateChecklist(client, AUTH_CONTEXT, {
      organizationId: AUTH_CONTEXT.operatorOrganizationId,
      checklistCursor: 'schedule_review',
    });

    expect(updateCalls).toEqual([
      {
        table: 'onboarding_progress',
        payload: {
          current_step: 5,
          current_step_key: 'schedule_review',
          last_actor_user_id: AUTH_CONTEXT.operatorUserId,
        },
        filters: [['organization_id', AUTH_CONTEXT.operatorOrganizationId]],
      },
      {
        table: 'organization_settings',
        payload: {
          checklist_cursor: 'schedule_review',
        },
        filters: [['organization_id', AUTH_CONTEXT.operatorOrganizationId]],
      },
    ]);
    expect((rowsByTable.onboarding_progress as Record<string, unknown>).current_step_key).toBe('schedule_review');
    expect((rowsByTable.organization_settings as Record<string, unknown>).checklist_cursor).toBe('schedule_review');
    expect(response.checklistCursor).toBe('schedule_review');
    expect(response.ready).toBe(true);
  });

  it('keeps completed onboarding rows closed while mirroring checklist cursor into organization_settings', async () => {
    const { client, updateCalls, rowsByTable } = createRepositoryClient({
      organizations: {
        id: AUTH_CONTEXT.operatorOrganizationId,
        name: '서울병원',
        type: 'hospital',
      },
      onboarding_progress: {
        id: 'progress-1',
        organization_id: AUTH_CONTEXT.operatorOrganizationId,
        current_step: 4,
        current_step_key: null,
        completed_at: '2026-04-01T00:00:00.000Z',
        organization_info_confirmed_at: '2026-03-01T00:00:00.000Z',
        organization_info_confirmed_by: AUTH_CONTEXT.operatorUserId,
      },
      organization_settings: {
        organization_id: AUTH_CONTEXT.operatorOrganizationId,
        pilot_site_id: 'site-1',
        minimum_rest_hours: 11,
        checklist_cursor: 'employee_roster',
      },
      sites: [
        {
          id: 'site-1',
          organization_id: AUTH_CONTEXT.operatorOrganizationId,
          code: 'MAIN',
          name: '본관',
          is_active: true,
          is_schedule_active: true,
        },
      ],
      shifts: [
        {
          id: 'shift-1',
          organization_id: AUTH_CONTEXT.operatorOrganizationId,
          code: 'D',
          name: 'Day',
        },
      ],
      site_requirements: [
        {
          id: 'requirement-1',
          organization_id: AUTH_CONTEXT.operatorOrganizationId,
        },
      ],
      employees: [
        {
          id: 'employee-1',
          organization_id: AUTH_CONTEXT.operatorOrganizationId,
        },
      ],
      off_request_policy_rules: [
        {
          id: 'policy-monthly',
          organization_id: AUTH_CONTEXT.operatorOrganizationId,
          rank_code: null,
          period_type: 'monthly',
          limit_count: 2,
          is_active: true,
        },
        {
          id: 'policy-annual',
          organization_id: AUTH_CONTEXT.operatorOrganizationId,
          rank_code: null,
          period_type: 'annual',
          limit_count: 12,
          is_active: true,
        },
      ],
      schedules: [],
      fairness_ledger_monthly: [],
    });

    const response = await updateChecklist(client, AUTH_CONTEXT, {
      organizationId: AUTH_CONTEXT.operatorOrganizationId,
      checklistCursor: 'schedule_review',
    });

    expect(updateCalls).toEqual([
      {
        table: 'onboarding_progress',
        payload: {
          last_actor_user_id: AUTH_CONTEXT.operatorUserId,
        },
        filters: [['organization_id', AUTH_CONTEXT.operatorOrganizationId]],
      },
      {
        table: 'organization_settings',
        payload: {
          checklist_cursor: 'schedule_review',
        },
        filters: [['organization_id', AUTH_CONTEXT.operatorOrganizationId]],
      },
    ]);
    expect((rowsByTable.onboarding_progress as Record<string, unknown>).current_step_key).toBeNull();
    expect((rowsByTable.organization_settings as Record<string, unknown>).checklist_cursor).toBe('schedule_review');
    expect(response.checklistCursor).toBe('schedule_review');
  });
});
