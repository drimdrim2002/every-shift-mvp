import { describe, expect, it, vi } from 'vitest';
import {
  buildFairnessLedgerSummary,
  getChecklist,
} from '@/../supabase/functions/phase2-ops/repository.ts';
import type { Phase2OpsRepositoryClient } from '@/../supabase/functions/phase2-ops/repository.ts';
import type { Phase2OpsOperatorAuthContext } from '@/../supabase/functions/phase2-ops/auth.ts';

interface QueryResult<T> {
  data: T | null;
  error: { message: string } | null;
}

class FakeQueryBuilder<T> {
  constructor(
    private readonly table: string,
    private readonly result: QueryResult<T>,
    private readonly calls: Array<{ table: string; method: string; args: unknown[] }>
  ) {}

  select(columns: string) {
    this.calls.push({ table: this.table, method: 'select', args: [columns] });
    return this;
  }

  eq(column: string, value: string) {
    this.calls.push({ table: this.table, method: 'eq', args: [column, value] });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.calls.push({ table: this.table, method: 'order', args: [column, options] });
    return Promise.resolve(this.result);
  }

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled ?? undefined, onrejected ?? undefined);
  }
}

function createRepositoryClient(rows: Array<Record<string, unknown>>) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];

  const client: Phase2OpsRepositoryClient = {
    auth: {
      admin: {
        listUsers: vi.fn(),
        updateUserById: vi.fn(),
      },
    },
    rpc: vi.fn(),
    from(table) {
      if (table !== 'fairness_ledger_monthly') {
        throw new Error(`Unexpected table query: ${table}`);
      }

      return new FakeQueryBuilder(
        table,
        {
          data: rows,
          error: null,
        },
        calls
      );
    },
  };

  return { client, calls };
}

const AUTH_CONTEXT: Phase2OpsOperatorAuthContext = {
  operatorUserId: '11111111-1111-4111-8111-111111111111',
  operatorOrganizationId: '00000000-0000-0000-0000-000000000001',
  operatorGlobalRole: 'admin',
};

describe('phase2 ops checklist', () => {
  it('builds 3/6/12 month aggregates only from finalized ledger rows', () => {
    const summary = buildFairnessLedgerSummary([
      {
        organization_id: '00000000-0000-0000-0000-000000000001',
        month: '2025-12',
        finalized_at: '2025-12-31T09:00:00Z',
        result_status: 'passed',
        proof_summary: {
          weeklyHoursViolations: 1,
          nnnViolations: 2,
          nodViolations: 3,
          minimumRestViolations: 4,
          staffingShortfalls: 5,
        },
        comparison_metrics: {},
      },
      {
        organization_id: '00000000-0000-0000-0000-000000000001',
        month: '2025-11',
        finalized_at: '2025-11-30T09:00:00Z',
        result_status: 'passed',
        proof_summary: {
          weeklyHoursViolations: 10,
          nnnViolations: 20,
          nodViolations: 30,
          minimumRestViolations: 40,
          staffingShortfalls: 50,
        },
        comparison_metrics: {},
      },
      {
        organization_id: '00000000-0000-0000-0000-000000000001',
        month: '2025-09',
        finalized_at: '2025-09-30T09:00:00Z',
        result_status: 'passed',
        proof_summary: {
          weeklyHoursViolations: 100,
          nnnViolations: 200,
          nodViolations: 300,
          minimumRestViolations: 400,
          staffingShortfalls: 500,
        },
        comparison_metrics: {},
      },
      {
        organization_id: '00000000-0000-0000-0000-000000000001',
        month: '2025-06',
        finalized_at: '2025-06-30T09:00:00Z',
        result_status: 'passed',
        proof_summary: {
          weeklyHoursViolations: 1000,
          nnnViolations: 2000,
          nodViolations: 3000,
          minimumRestViolations: 4000,
          staffingShortfalls: 5000,
        },
        comparison_metrics: {},
      },
    ]);

    expect(summary).toEqual([
      {
        months: 3,
        windowStartMonth: '2025-10',
        windowEndMonth: '2025-12',
        finalizedVersionCount: 2,
        proofSummary: {
          weeklyHoursViolations: 11,
          nnnViolations: 22,
          nodViolations: 33,
          minimumRestViolations: 44,
          staffingShortfalls: 55,
        },
      },
      {
        months: 6,
        windowStartMonth: '2025-07',
        windowEndMonth: '2025-12',
        finalizedVersionCount: 3,
        proofSummary: {
          weeklyHoursViolations: 111,
          nnnViolations: 222,
          nodViolations: 333,
          minimumRestViolations: 444,
          staffingShortfalls: 555,
        },
      },
      {
        months: 12,
        windowStartMonth: '2025-01',
        windowEndMonth: '2025-12',
        finalizedVersionCount: 4,
        proofSummary: {
          weeklyHoursViolations: 1111,
          nnnViolations: 2222,
          nodViolations: 3333,
          minimumRestViolations: 4444,
          staffingShortfalls: 5555,
        },
      },
    ]);
  });

  it('reads the checklist summary from fairness_ledger_monthly only', async () => {
    const { client, calls } = createRepositoryClient([
      {
        organization_id: AUTH_CONTEXT.operatorOrganizationId,
        month: '2025-12',
        finalized_at: '2025-12-31T09:00:00Z',
        result_status: 'passed',
        proof_summary: {
          weeklyHoursViolations: 1,
          nnnViolations: 2,
          nodViolations: 3,
          minimumRestViolations: 4,
          staffingShortfalls: 5,
        },
        comparison_metrics: {},
      },
    ]);

    const checklist = await getChecklist(client, AUTH_CONTEXT, AUTH_CONTEXT.operatorOrganizationId);

    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((call) => call.table === 'fairness_ledger_monthly')).toBe(true);
    expect(calls.some((call) => call.method === 'select')).toBe(true);
    expect(calls.some((call) => call.method === 'eq')).toBe(true);
    expect(calls.some((call) => call.method === 'order')).toBe(true);
    expect(checklist).toEqual({
      organizationId: AUTH_CONTEXT.operatorOrganizationId,
      fairnessSummary: [
        {
          months: 3,
          windowStartMonth: '2025-10',
          windowEndMonth: '2025-12',
          finalizedVersionCount: 1,
          proofSummary: {
            weeklyHoursViolations: 1,
            nnnViolations: 2,
            nodViolations: 3,
            minimumRestViolations: 4,
            staffingShortfalls: 5,
          },
        },
        {
          months: 6,
          windowStartMonth: '2025-07',
          windowEndMonth: '2025-12',
          finalizedVersionCount: 1,
          proofSummary: {
            weeklyHoursViolations: 1,
            nnnViolations: 2,
            nodViolations: 3,
            minimumRestViolations: 4,
            staffingShortfalls: 5,
          },
        },
        {
          months: 12,
          windowStartMonth: '2025-01',
          windowEndMonth: '2025-12',
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
  });
});
