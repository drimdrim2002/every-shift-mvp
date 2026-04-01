import { describe, expect, it, vi } from 'vitest';
import {
  createVersion,
  markVersionSolving,
  patchVersionAssignments,
  syncVersionSolverResult,
} from '@/../supabase/functions/phase2-schedule/repository.ts';
import type { Phase2ScheduleAuthContext } from '@/../supabase/functions/phase2-schedule/contracts.ts';
import type { Phase2ScheduleRepositoryClient } from '@/../supabase/functions/phase2-schedule/repository.ts';

interface QueryError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  constraint?: string;
}

interface QueryResult<T> {
  data: T | null;
  error: QueryError | null;
}

interface RpcResult<T> {
  data: T | null;
  error: QueryError | null;
}

class FakeQueryBuilder<T> implements PromiseLike<QueryResult<T>> {
  private readonly listResult: QueryResult<T>;
  private readonly spies: {
    eq: ReturnType<typeof vi.fn>;
    gte: ReturnType<typeof vi.fn>;
    lte: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
  };

  constructor(
    listResult: QueryResult<T>,
    spies: {
      eq: ReturnType<typeof vi.fn>;
      gte: ReturnType<typeof vi.fn>;
      lte: ReturnType<typeof vi.fn>;
      in: ReturnType<typeof vi.fn>;
    }
  ) {
    this.listResult = listResult;
    this.spies = spies;
  }

  select() {
    return this;
  }

  insert() {
    return this;
  }

  update() {
    return this;
  }

  upsert() {
    return this;
  }

  delete() {
    return this;
  }

  eq(...args: unknown[]) {
    this.spies.eq(...args);
    return this;
  }

  gte(...args: unknown[]) {
    this.spies.gte(...args);
    return this;
  }

  lte(...args: unknown[]) {
    this.spies.lte(...args);
    return this;
  }

  in(...args: unknown[]) {
    this.spies.in(...args);
    return this;
  }

  order() {
    return this;
  }

  maybeSingle(): Promise<QueryResult<T extends Array<infer R> ? R : T>> {
    const data = Array.isArray(this.listResult.data)
      ? ((this.listResult.data[0] ?? null) as T extends Array<infer R> ? R : T)
      : ((this.listResult.data ?? null) as T extends Array<infer R> ? R : T);

    return Promise.resolve({
      data,
      error: this.listResult.error,
    });
  }

  single(): Promise<QueryResult<T extends Array<infer R> ? R : T>> {
    return this.maybeSingle();
  }

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.listResult).then(onfulfilled ?? undefined, onrejected ?? undefined);
  }
}

function createClient(
  results: Record<string, Array<QueryResult<any>>>,
  rpcResults?: Record<string, Array<RpcResult<any>>>
) {
  const insertSpies: Record<string, ReturnType<typeof vi.fn>> = {};
  const updateSpies: Record<string, ReturnType<typeof vi.fn>> = {};
  const upsertSpies: Record<string, ReturnType<typeof vi.fn>> = {};
  const deleteSpies: Record<string, ReturnType<typeof vi.fn>> = {};
  const eqSpies: Record<string, ReturnType<typeof vi.fn>> = {};
  const gteSpies: Record<string, ReturnType<typeof vi.fn>> = {};
  const lteSpies: Record<string, ReturnType<typeof vi.fn>> = {};
  const inSpies: Record<string, ReturnType<typeof vi.fn>> = {};
  const rpcSpies: Record<string, ReturnType<typeof vi.fn>> = {};

  const from = vi.fn((table: string) => {
    const queue = results[table];

    if (!queue || queue.length === 0) {
      throw new Error(`Unexpected query for table ${table}`);
    }

    insertSpies[table] ??= vi.fn();
    updateSpies[table] ??= vi.fn();
    upsertSpies[table] ??= vi.fn();
    deleteSpies[table] ??= vi.fn();
    eqSpies[table] ??= vi.fn();
    gteSpies[table] ??= vi.fn();
    lteSpies[table] ??= vi.fn();
    inSpies[table] ??= vi.fn();

    const builder = new FakeQueryBuilder(queue.shift()!, {
      eq: eqSpies[table],
      gte: gteSpies[table],
      lte: lteSpies[table],
      in: inSpies[table],
    });

    return {
      select: vi.fn(() => builder),
      insert: vi.fn((payload: unknown) => {
        insertSpies[table](payload);
        return builder;
      }),
      update: vi.fn((payload: unknown) => {
        updateSpies[table](payload);
        return builder;
      }),
      upsert: vi.fn((payload: unknown, options?: unknown) => {
        upsertSpies[table](payload, options);
        return builder;
      }),
      delete: vi.fn(() => {
        deleteSpies[table]();
        return builder;
      }),
    };
  });

  const rpc = vi.fn((fn: string, args: unknown) => {
    const queue = rpcResults?.[fn];

    if (!queue || queue.length === 0) {
      throw new Error(`Unexpected rpc call for function ${fn}`);
    }

    rpcSpies[fn] ??= vi.fn();
    rpcSpies[fn](args);

    return Promise.resolve(queue.shift()!);
  });

  return {
    client: { from, rpc } as unknown as Phase2ScheduleRepositoryClient,
    insertSpies,
    updateSpies,
    upsertSpies,
    deleteSpies,
    eqSpies,
    gteSpies,
    lteSpies,
    inSpies,
    rpcSpies,
  };
}

const AUTH_CONTEXT: Phase2ScheduleAuthContext = {
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  organizationId: '33333333-3333-4333-8333-333333333333',
};

describe('phase2 schedule write repository', () => {
  it('creates a new version without changing selected_version_id and clones preferences plus locked assignments only', async () => {
    const { client, insertSpies, updateSpies } = createClient({
      schedules: [
        {
          data: {
            id: 'schedule-1',
            organization_id: AUTH_CONTEXT.organizationId,
            month: '2026-04',
            status: 'complete',
            solver_execution_id: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: 'version-1',
            finalized_version_id: null,
            latest_version_no: 1,
          },
          error: null,
        },
        {
          data: null,
          error: null,
        },
      ],
      schedule_versions: [
        {
          data: {
            id: 'version-1',
            schedule_id: 'schedule-1',
            version_no: 1,
            name: 'V1',
            source_type: 'initial_solve',
            base_version_id: null,
            status: 'review_pending',
            current_revision: 2,
            manual_edit_count: 1,
            input_diff_summary: {},
            latest_evaluation_id: null,
          },
          error: null,
        },
        {
          data: {
            id: 'version-2',
            schedule_id: 'schedule-1',
            version_no: 2,
            name: 'V2',
            source_type: 're_solve',
            base_version_id: 'version-1',
            status: 'draft',
            current_revision: 0,
            manual_edit_count: 0,
            input_diff_summary: { changed_off_requests: 1, note: 'retry' },
            latest_evaluation_id: null,
          },
          error: null,
        },
        {
          data: [
            {
              id: 'version-1',
              schedule_id: 'schedule-1',
              version_no: 1,
              name: 'V1',
              source_type: 'initial_solve',
              base_version_id: null,
              status: 'review_pending',
              current_revision: 2,
              manual_edit_count: 1,
              input_diff_summary: {},
              latest_evaluation_id: null,
            },
            {
              id: 'version-2',
              schedule_id: 'schedule-1',
              version_no: 2,
              name: 'V2',
              source_type: 're_solve',
              base_version_id: 'version-1',
              status: 'draft',
              current_revision: 0,
              manual_edit_count: 0,
              input_diff_summary: { changed_off_requests: 1, note: 'retry' },
              latest_evaluation_id: null,
            },
          ],
          error: null,
        },
      ],
      schedule_preferences: [
        {
          data: [
            {
              id: 'pref-1',
              schedule_id: 'schedule-1',
              schedule_version_id: 'version-1',
              employee_id: 'employee-1',
              date: '2026-04-01',
              request_code: 'O',
              request_note: 'personal',
              is_soft: true,
              resolution_status: 'pending',
              resolved_shift_id: null,
              resolved_at: null,
              request_source: 'employee_off',
            },
          ],
          error: null,
        },
        {
          data: null,
          error: null,
        },
      ],
      schedule_assignments: [
        {
          data: [
            {
              id: 'assignment-locked',
              schedule_id: 'schedule-1',
              schedule_version_id: 'version-1',
              employee_id: 'employee-1',
              shift_id: 'shift-1',
              date: '2026-03-31',
              is_locked: true,
              off_reason: null,
              comment: 'keep',
            },
            {
              id: 'assignment-open',
              schedule_id: 'schedule-1',
              schedule_version_id: 'version-1',
              employee_id: 'employee-2',
              shift_id: 'shift-2',
              date: '2026-04-01',
              is_locked: false,
              off_reason: null,
              comment: null,
            },
          ],
          error: null,
        },
        {
          data: null,
          error: null,
        },
      ],
    });

    const result = await createVersion(client, AUTH_CONTEXT, 'schedule-1', {
      baseVersionId: 'version-1',
      name: 'V2',
      sourceType: 're_solve',
      inputDiffSummary: {
        changedOffRequests: 1,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: 'retry',
      },
    });

    expect(result).toEqual({
      scheduleId: 'schedule-1',
      createdVersionId: 'version-2',
      selectedVersionId: 'version-1',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        expect.objectContaining({ id: 'version-1', versionNo: 1 }),
        expect.objectContaining({ id: 'version-2', versionNo: 2 }),
      ],
    });
    expect(insertSpies.schedule_versions).toHaveBeenCalledWith(
      expect.objectContaining({
        schedule_id: 'schedule-1',
        version_no: 2,
        name: 'V2',
        source_type: 're_solve',
        base_version_id: 'version-1',
        status: 'draft',
      })
    );
    expect(insertSpies.schedule_preferences).toHaveBeenCalledWith([
      expect.objectContaining({
        schedule_id: 'schedule-1',
        schedule_version_id: 'version-2',
        employee_id: 'employee-1',
        date: '2026-04-01',
      }),
    ]);
    expect(insertSpies.schedule_assignments).toHaveBeenCalledWith([
      expect.objectContaining({
        schedule_id: 'schedule-1',
        schedule_version_id: 'version-2',
        employee_id: 'employee-1',
        shift_id: 'shift-1',
        date: '2026-03-31',
        is_locked: true,
      }),
    ]);
    expect(updateSpies.schedules).toHaveBeenCalledWith({
      latest_version_no: 2,
    });
  });

  it('retries version numbering on duplicate version_no conflicts', async () => {
    const { client, insertSpies, updateSpies } = createClient({
      schedules: [
        {
          data: {
            id: 'schedule-1',
            organization_id: AUTH_CONTEXT.organizationId,
            month: '2026-04',
            status: 'complete',
            solver_execution_id: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: 'version-1',
            finalized_version_id: null,
            latest_version_no: 1,
          },
          error: null,
        },
        {
          data: {
            id: 'schedule-1',
            organization_id: AUTH_CONTEXT.organizationId,
            month: '2026-04',
            status: 'complete',
            solver_execution_id: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: 'version-1',
            finalized_version_id: null,
            latest_version_no: 2,
          },
          error: null,
        },
        {
          data: null,
          error: null,
        },
      ],
      schedule_versions: [
        {
          data: {
            id: 'version-1',
            schedule_id: 'schedule-1',
            version_no: 1,
            name: 'V1',
            source_type: 'initial_solve',
            base_version_id: null,
            status: 'review_pending',
            current_revision: 2,
            manual_edit_count: 1,
            input_diff_summary: {},
            latest_evaluation_id: null,
          },
          error: null,
        },
        {
          data: null,
          error: {
            message: 'duplicate key value violates unique constraint',
            code: '23505',
            constraint: 'schedule_versions_schedule_id_version_no_key',
          },
        },
        {
          data: {
            id: 'version-3',
            schedule_id: 'schedule-1',
            version_no: 3,
            name: 'V3',
            source_type: 're_solve',
            base_version_id: 'version-1',
            status: 'draft',
            current_revision: 0,
            manual_edit_count: 0,
            input_diff_summary: {},
            latest_evaluation_id: null,
          },
          error: null,
        },
        {
          data: [
            {
              id: 'version-1',
              schedule_id: 'schedule-1',
              version_no: 1,
              name: 'V1',
              source_type: 'initial_solve',
              base_version_id: null,
              status: 'review_pending',
              current_revision: 2,
              manual_edit_count: 1,
              input_diff_summary: {},
              latest_evaluation_id: null,
            },
            {
              id: 'version-3',
              schedule_id: 'schedule-1',
              version_no: 3,
              name: 'V3',
              source_type: 're_solve',
              base_version_id: 'version-1',
              status: 'draft',
              current_revision: 0,
              manual_edit_count: 0,
              input_diff_summary: {},
              latest_evaluation_id: null,
            },
          ],
          error: null,
        },
      ],
      schedule_preferences: [
        {
          data: [],
          error: null,
        },
      ],
      schedule_assignments: [
        {
          data: [],
          error: null,
        },
      ],
    });

    const result = await createVersion(client, AUTH_CONTEXT, 'schedule-1', {
      baseVersionId: 'version-1',
      name: 'V3',
      sourceType: 're_solve',
      inputDiffSummary: {
        changedOffRequests: 0,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: null,
      },
    });

    expect(result.createdVersionId).toBe('version-3');
    expect(insertSpies.schedule_versions.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ version_no: 2 })
    );
    expect(insertSpies.schedule_versions.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({ version_no: 3 })
    );
    expect(updateSpies.schedules).toHaveBeenCalledWith({
      latest_version_no: 3,
    });
  });

  it('marks a version as solving with the active solver execution id through the atomic rpc', async () => {
    const { client, rpcSpies } = createClient({
      schedule_versions: [
        {
          data: {
            id: 'version-2',
            schedule_id: 'schedule-1',
            version_no: 2,
            name: 'V2',
            source_type: 're_solve',
            base_version_id: 'version-1',
            status: 'draft',
            current_revision: 0,
            manual_edit_count: 0,
            input_diff_summary: {},
            latest_evaluation_id: null,
          },
          error: null,
        },
      ],
      schedules: [
        {
          data: {
            id: 'schedule-1',
            organization_id: AUTH_CONTEXT.organizationId,
            month: '2026-04',
            status: 'created',
            solver_execution_id: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: 'version-1',
            finalized_version_id: null,
            latest_version_no: 2,
          },
          error: null,
        },
      ],
    }, {
      mark_schedule_version_solving_atomic: [
        {
          data: {
            schedule_version_id: 'version-2',
            status: 'solving',
            active_solver_execution_id: 'exec-1',
          },
          error: null,
        },
      ],
    });

    const result = await markVersionSolving(client, AUTH_CONTEXT, 'version-2', {
      solverExecutionId: 'exec-1',
    });

    expect(result).toEqual({
      scheduleVersionId: 'version-2',
      status: 'solving',
      solverExecutionId: 'exec-1',
    });
    expect(rpcSpies.mark_schedule_version_solving_atomic).toHaveBeenCalledWith({
      p_version_id: 'version-2',
      p_solver_execution_id: 'exec-1',
    });
  });

  it('maps solve-start conflicts to 409 another_version_solving contract errors', async () => {
    const { client } = createClient({
      schedule_versions: [
        {
          data: {
            id: 'version-2',
            schedule_id: 'schedule-1',
            version_no: 2,
            name: 'V2',
            source_type: 're_solve',
            base_version_id: 'version-1',
            status: 'draft',
            current_revision: 0,
            manual_edit_count: 0,
            input_diff_summary: {},
            latest_evaluation_id: null,
          },
          error: null,
        },
      ],
      schedules: [
        {
          data: {
            id: 'schedule-1',
            organization_id: AUTH_CONTEXT.organizationId,
            month: '2026-04',
            status: 'created',
            solver_execution_id: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: 'version-1',
            finalized_version_id: null,
            latest_version_no: 2,
          },
          error: null,
        },
      ],
    }, {
      mark_schedule_version_solving_atomic: [
        {
          data: null,
          error: {
            message: 'another_version_solving',
            code: 'P0001',
          },
        },
      ],
    });

    await expect(
      markVersionSolving(client, AUTH_CONTEXT, 'version-2', {
        solverExecutionId: 'exec-1',
      })
    ).rejects.toMatchObject({
      code: 'another_version_solving',
      status: 409,
    });
  });

  it('syncs completed solver results by replacing only the current month rows for that version', async () => {
    const { client, rpcSpies } = createClient({
      schedule_versions: [
        {
          data: {
            id: 'version-2',
            schedule_id: 'schedule-1',
            version_no: 2,
            name: 'V2',
            source_type: 're_solve',
            base_version_id: 'version-1',
            status: 'solving',
            current_revision: 0,
            manual_edit_count: 0,
            input_diff_summary: {},
            latest_evaluation_id: null,
          },
          error: null,
        },
      ],
      schedules: [
        {
          data: {
            id: 'schedule-1',
            organization_id: AUTH_CONTEXT.organizationId,
            month: '2026-04',
            status: 'running',
            solver_execution_id: 'exec-1',
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: 'version-2',
            finalized_version_id: null,
            latest_version_no: 2,
          },
          error: null,
        },
      ],
      schedule_assignments: [
        {
          data: [
            {
              employee_id: 'employee-1',
              date: '2026-04-01',
              shift_id: 'new-shift-1',
              is_locked: false,
            },
          ],
          error: null,
        },
      ],
      schedule_preferences: [
        {
          data: [],
          error: null,
        },
      ],
      site_requirements: [
        {
          data: [],
          error: null,
        },
      ],
      shifts: [
        {
          data: [
            {
              id: 'new-shift-1',
              code: 'D',
            },
          ],
          error: null,
        },
      ],
      employees: [
        {
          data: [
            {
              id: 'employee-1',
            },
          ],
          error: null,
        },
      ],
    }, {
      apply_schedule_version_solver_result: [
        {
          data: {
            schedule_version_id: 'version-2',
            status: 'review_pending',
            active_solver_execution_id: null,
            hard_score: 12,
            soft_score: 34,
            failure_reason: null,
          },
          error: null,
        },
      ],
      save_schedule_version_evaluation_atomic: [
        {
          data: {
            schedule_version_id: 'version-2',
            current_revision: 0,
            evaluation_id: 'evaluation-2',
            status: 'review_ready',
            evaluation_result_status: 'passed',
          },
          error: null,
        },
      ],
    });

    const result = await syncVersionSolverResult(client, AUTH_CONTEXT, 'version-2', {
      status: 'completed',
      solverExecutionId: 'exec-1',
      assignments: [
        {
          employeeId: 'employee-1',
          date: '2026-04-01',
          shiftId: 'new-shift-1',
          isLocked: false,
          comment: null,
          offReason: null,
        },
        {
          employeeId: 'employee-1',
          date: '2026-03-31',
          shiftId: 'old-shift-ignored',
          isLocked: false,
          comment: null,
          offReason: null,
        },
      ],
      score: {
        hardScore: 12,
        softScore: 34,
      },
      failureReason: null,
    });

    expect(result).toEqual({
      scheduleVersionId: 'version-2',
      status: 'review_ready',
      solverExecutionId: null,
      hardScore: 12,
      softScore: 34,
      failureReason: null,
    });
    expect(rpcSpies.apply_schedule_version_solver_result).toHaveBeenCalledWith({
      p_version_id: 'version-2',
      p_solver_execution_id: 'exec-1',
      p_status: 'completed',
      p_assignments: [
        {
          employeeId: 'employee-1',
          date: '2026-04-01',
          shiftId: 'new-shift-1',
          isLocked: false,
          comment: null,
          offReason: null,
        },
      ],
      p_score: {
        hardScore: 12,
        softScore: 34,
      },
      p_failure_reason: null,
      p_edited_by: AUTH_CONTEXT.userId,
    });
    expect(rpcSpies.save_schedule_version_evaluation_atomic).toHaveBeenCalledWith(
      expect.objectContaining({
        p_version_id: 'version-2',
        p_revision_no: 0,
        p_result_status: 'passed',
        p_solver_execution_id: 'exec-1',
        p_evaluator_version: 'phase2a-trust-gate-v1',
      })
    );
  });

  it('marks only the target version as solve_failed when solver sync fails', async () => {
    const { client, rpcSpies } = createClient({
      schedule_versions: [
        {
          data: {
            id: 'version-2',
            schedule_id: 'schedule-1',
            version_no: 2,
            name: 'V2',
            source_type: 're_solve',
            base_version_id: 'version-1',
            status: 'solving',
            current_revision: 0,
            manual_edit_count: 0,
            input_diff_summary: {},
            latest_evaluation_id: null,
          },
          error: null,
        },
        {
          data: null,
          error: null,
        },
      ],
      schedules: [
        {
          data: {
            id: 'schedule-1',
            organization_id: AUTH_CONTEXT.organizationId,
            month: '2026-04',
            status: 'running',
            solver_execution_id: 'exec-1',
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: 'version-2',
            finalized_version_id: null,
            latest_version_no: 2,
          },
          error: null,
        },
      ],
      schedule_assignments: [
        {
          data: [],
          error: null,
        },
      ],
      schedule_preferences: [
        {
          data: [],
          error: null,
        },
      ],
      site_requirements: [
        {
          data: [],
          error: null,
        },
      ],
      shifts: [
        {
          data: [],
          error: null,
        },
      ],
      employees: [
        {
          data: [
            {
              id: 'employee-1',
            },
          ],
          error: null,
        },
      ],
    }, {
      apply_schedule_version_solver_result: [
        {
          data: {
            schedule_version_id: 'version-2',
            status: 'solve_failed',
            active_solver_execution_id: null,
            hard_score: null,
            soft_score: null,
            failure_reason: 'timeout',
          },
          error: null,
        },
      ],
      save_schedule_version_evaluation_atomic: [
        {
          data: {
            schedule_version_id: 'version-2',
            current_revision: 0,
            evaluation_id: 'evaluation-3',
            status: 'infeasible',
            evaluation_result_status: 'infeasible',
          },
          error: null,
        },
      ],
    });

    const result = await syncVersionSolverResult(client, AUTH_CONTEXT, 'version-2', {
      status: 'failed',
      solverExecutionId: 'exec-1',
      failureReason: 'timeout',
      failureType: 'infeasible',
      failureContext: {
        shiftCode: 'N',
        required: 3,
        feasible: 2,
      },
      assignments: [],
      score: null,
    });

    expect(result).toEqual({
      scheduleVersionId: 'version-2',
      status: 'infeasible',
      solverExecutionId: null,
      hardScore: null,
      softScore: null,
      failureReason: 'timeout',
    });
    expect(rpcSpies.apply_schedule_version_solver_result).toHaveBeenCalledWith({
      p_version_id: 'version-2',
      p_solver_execution_id: 'exec-1',
      p_status: 'failed',
      p_assignments: [],
      p_score: null,
      p_failure_reason: 'timeout',
      p_edited_by: AUTH_CONTEXT.userId,
    });
    expect(rpcSpies.save_schedule_version_evaluation_atomic).toHaveBeenCalledWith(
      expect.objectContaining({
        p_version_id: 'version-2',
        p_revision_no: 0,
        p_result_status: 'infeasible',
        p_solver_execution_id: 'exec-1',
      })
    );
  });

  it('patches version assignments with version-scoped upserts, delete-for-null, revision bump, and review_pending status', async () => {
    const { client, rpcSpies } = createClient({
      schedule_versions: [
        {
          data: {
            id: 'version-2',
            schedule_id: 'schedule-1',
            version_no: 2,
            name: 'V2',
            source_type: 're_solve',
            base_version_id: 'version-1',
            status: 'review_ready',
            current_revision: 4,
            manual_edit_count: 7,
            input_diff_summary: {},
            latest_evaluation_id: null,
          },
          error: null,
        },
        {
          data: null,
          error: null,
        },
        {
          data: null,
          error: null,
        },
      ],
      schedules: [
        {
          data: {
            id: 'schedule-1',
            organization_id: AUTH_CONTEXT.organizationId,
            month: '2026-04',
            status: 'complete',
            solver_execution_id: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: 'version-2',
            finalized_version_id: null,
            latest_version_no: 2,
          },
          error: null,
        },
      ],
    }, {
      patch_schedule_version_assignments_atomic: [
        {
          data: {
            schedule_version_id: 'version-2',
            status: 'review_pending',
            current_revision: 5,
            manual_edit_count: 9,
            changed_cells: 2,
          },
          error: null,
        },
      ],
    });

    const result = await patchVersionAssignments(client, AUTH_CONTEXT, 'version-2', {
      changes: [
        {
          employeeId: 'employee-1',
          date: '2026-04-10',
          shiftId: 'shift-1',
          isLocked: false,
          comment: 'manual move',
          offReason: null,
        },
        {
          employeeId: 'employee-2',
          date: '2026-04-11',
          shiftId: null,
          isLocked: false,
          comment: null,
          offReason: null,
        },
        {
          employeeId: 'employee-3',
          date: '2026-03-31',
          shiftId: 'shift-3',
          isLocked: false,
          comment: 'ignore previous month',
          offReason: null,
        },
      ],
    });

    expect(result).toEqual({
      scheduleVersionId: 'version-2',
      status: 'review_pending',
      currentRevision: 5,
      manualEditCount: 9,
      changedCells: 2,
    });
    expect(rpcSpies.patch_schedule_version_assignments_atomic).toHaveBeenCalledWith({
      p_version_id: 'version-2',
      p_changes: [
        {
          employeeId: 'employee-1',
          date: '2026-04-10',
          shiftId: 'shift-1',
          isLocked: false,
          comment: 'manual move',
          offReason: null,
        },
        {
          employeeId: 'employee-2',
          date: '2026-04-11',
          shiftId: null,
          isLocked: false,
          comment: null,
          offReason: null,
        },
      ],
      p_edited_by: AUTH_CONTEXT.userId,
    });
  });

  it('maps rpc solver execution conflicts to 409 contract errors', async () => {
    const { client } = createClient({
      schedule_versions: [
        {
          data: {
            id: 'version-2',
            schedule_id: 'schedule-1',
            version_no: 2,
            name: 'V2',
            source_type: 're_solve',
            base_version_id: 'version-1',
            status: 'solving',
            current_revision: 0,
            manual_edit_count: 0,
            input_diff_summary: {},
            latest_evaluation_id: null,
            active_solver_execution_id: 'exec-active',
          },
          error: null,
        },
      ],
      schedules: [
        {
          data: {
            id: 'schedule-1',
            organization_id: AUTH_CONTEXT.organizationId,
            month: '2026-04',
            status: 'running',
            solver_execution_id: 'exec-active',
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: 'version-2',
            finalized_version_id: null,
            latest_version_no: 2,
          },
          error: null,
        },
      ],
    }, {
      apply_schedule_version_solver_result: [
        {
          data: null,
          error: {
            message: 'solver_execution_mismatch',
            code: 'P0001',
          },
        },
      ],
    });

    await expect(
      syncVersionSolverResult(client, AUTH_CONTEXT, 'version-2', {
        status: 'completed',
        solverExecutionId: 'exec-stale',
        assignments: [],
        score: null,
        failureReason: null,
      })
    ).rejects.toMatchObject({
      code: 'solver_execution_mismatch',
      status: 409,
    });
  });
});
