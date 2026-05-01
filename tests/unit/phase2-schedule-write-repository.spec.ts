import { describe, expect, it, vi } from 'vitest';
import * as scheduleWriteRepository from '@/../supabase/functions/phase2-schedule/repository.ts';
import {
  createVersion,
  deleteScheduleMonth,
  finalizeVersion,
  markVersionSolving,
  patchVersionAssignments,
  resetActiveFlow,
  resetScheduleRoster,
  recheckVersion,
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
    if (Array.isArray(this.listResult.data) && this.listResult.data.length > 1) {
      return Promise.resolve({
        data: null,
        error: {
          message: 'JSON object requested, multiple rows returned',
          details: 'Results contain multiple rows, application/vnd.pgrst.object+json requires 1 row',
        },
      });
    }

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
    const queue = (results[table] ??= []);

    if (queue.length === 0) {
      if (
        table === 'schedules'
        || table === 'schedule_preferences'
        || table === 'off_request_policy_rules'
        || table === 'schedule_evaluations'
        || table === 'fairness_ledger_monthly'
      ) {
        queue.push({
          data: [],
          error: null,
        });
      } else {
        throw new Error(`Unexpected query for table ${table}`);
      }
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

type DeleteVersionFn = (
  client: Phase2ScheduleRepositoryClient,
  auth: Phase2ScheduleAuthContext,
  versionId: string,
  request: {
    replacementSelectedVersionId?: string;
  }
) => Promise<unknown>;

type DeleteGeneratedResultsFn = (
  client: Phase2ScheduleRepositoryClient,
  auth: Phase2ScheduleAuthContext,
  scheduleId: string,
  request: {
    sourceVersionId: string;
  }
) => Promise<unknown>;

function getDeleteVersion(): DeleteVersionFn {
  const candidate = (scheduleWriteRepository as Record<string, unknown>).deleteVersion;
  expect(candidate).toBeTypeOf('function');
  return candidate as DeleteVersionFn;
}

function getDeleteGeneratedResults(): DeleteGeneratedResultsFn {
  const candidate = (scheduleWriteRepository as Record<string, unknown>).deleteGeneratedResults;
  expect(candidate).toBeTypeOf('function');
  return candidate as DeleteGeneratedResultsFn;
}

describe('phase2 schedule write repository', () => {
  it('archives the active non-finalized flow and returns the empty active compare state', async () => {
    const { client, rpcSpies } = createClient({
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
            selected_version_id: null,
            finalized_version_id: null,
            latest_version_no: 2,
          },
          error: null,
        },
        {
          data: {
            id: 'schedule-1',
            organization_id: AUTH_CONTEXT.organizationId,
            month: '2026-04',
            status: 'created',
            solver_execution_id: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: null,
            finalized_version_id: null,
            latest_version_no: 2,
          },
          error: null,
        },
      ],
      schedule_versions: [
        {
          data: [],
          error: null,
        },
      ],
    }, {
      reset_schedule_active_flow_atomic: [
        {
          data: {
            schedule_id: 'schedule-1',
          },
          error: null,
        },
      ],
    })

    const result = await resetActiveFlow(client, AUTH_CONTEXT, 'schedule-1')

    expect(rpcSpies.reset_schedule_active_flow_atomic).toHaveBeenCalledWith({
      p_schedule_id: 'schedule-1',
      p_archived_by: AUTH_CONTEXT.userId,
    })
    expect(result).toEqual({
      scheduleId: 'schedule-1',
      schedulePublicId: undefined,
      organizationId: AUTH_CONTEXT.organizationId,
      month: '2026-04',
      selectedVersionId: null,
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [],
    })
  })

  it('maps reset-active-flow finalized conflicts to 409 already_finalized contract errors', async () => {
    const { client } = createClient({
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
            finalized_version_id: 'version-1',
            latest_version_no: 1,
          },
          error: null,
        },
      ],
    }, {
      reset_schedule_active_flow_atomic: [
        {
          data: null,
          error: {
            message: 'already_finalized',
            code: 'P0001',
          },
        },
      ],
    })

    await expect(resetActiveFlow(client, AUTH_CONTEXT, 'schedule-1')).rejects.toMatchObject({
      code: 'already_finalized',
      status: 409,
    })
  })

  it('creates a new version through the atomic rpc without changing selected_version_id', async () => {
    const { client, rpcSpies } = createClient({
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
      ],
      schedule_versions: [
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
    }, {
      create_schedule_version_atomic: [
        {
          data: {
            schedule_id: 'schedule-1',
            created_version_id: 'version-2',
            selected_version_id: 'version-1',
            finalized_version_id: null,
            latest_version_no: 2,
          },
          error: null,
        },
      ],
    });

    const result = await createVersion(client, AUTH_CONTEXT, 'schedule-1', {
      baseVersionId: 'version-1',
      name: 'V2',
      creationMode: 'new',
      inputDiffSummary: {
        changedOffRequests: 1,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: 'retry',
      },
    });

    expect(result).toEqual({
      scheduleId: 'schedule-1',
      schedulePublicId: undefined,
      organizationId: AUTH_CONTEXT.organizationId,
      month: '2026-04',
      createdVersionId: 'version-2',
      wasCreated: true,
      selectedVersionId: 'version-1',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        expect.objectContaining({ id: 'version-1', versionNo: 1 }),
        expect.objectContaining({ id: 'version-2', versionNo: 2 }),
      ],
    });
    expect(rpcSpies.create_schedule_version_atomic).toHaveBeenCalledWith({
      p_schedule_id: 'schedule-1',
      p_base_version_id: 'version-1',
      p_name: 'V2',
      p_source_type: 're_solve',
      p_input_diff_summary: {
        changedOffRequests: 1,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: 'retry',
      },
      p_input_snapshot: {},
      p_created_by: AUTH_CONTEXT.userId,
    });
  });

  it('passes inputSnapshot into the create-version atomic rpc', async () => {
    const inputSnapshot = {
      generatedAt: '2026-04-01T00:00:00.000Z',
      solverInput: {
        month: '2026-04',
        employees: [{ id: 'employee-1', name: '간호사 1', employmentType: 'full_time' }],
        assignments: [],
        employeeConstraints: [],
        hospitalRules: { shifts: [] },
        monthlyRequirements: [],
      },
    };
    const { client, rpcSpies } = createClient({
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
      ],
      schedule_versions: [
        {
          data: [],
          error: null,
        },
      ],
    }, {
      create_schedule_version_atomic: [
        {
          data: {
            schedule_id: 'schedule-1',
            created_version_id: 'version-2',
            selected_version_id: 'version-1',
            finalized_version_id: null,
            latest_version_no: 2,
          },
          error: null,
        },
      ],
    });

    await createVersion(client, AUTH_CONTEXT, 'schedule-1', {
      baseVersionId: 'version-1',
      name: 'V2',
      creationMode: 'new',
      inputDiffSummary: {
        changedOffRequests: 1,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: 'retry',
      },
      inputSnapshot,
    });

    expect(rpcSpies.create_schedule_version_atomic).toHaveBeenCalledWith(
      expect.objectContaining({
        p_input_snapshot: inputSnapshot,
      })
    );
  });

  it('overwrites an existing version through the atomic overwrite rpc', async () => {
    const inputSnapshot = {
      generatedAt: '2026-04-01T00:00:00.000Z',
      solverInput: {
        month: '2026-04',
      },
    };
    const { client, deleteSpies, updateSpies, rpcSpies } = createClient({
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
            selected_version_id: 'version-2',
            finalized_version_id: null,
            latest_version_no: 2,
          },
          error: null,
        },
      ],
      schedule_versions: [
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
              current_revision: 1,
              manual_edit_count: 0,
              input_diff_summary: {},
              latest_evaluation_id: null,
              active_solver_execution_id: null,
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
              input_diff_summary: { changedOffRequests: 1 },
              latest_evaluation_id: null,
              active_solver_execution_id: null,
            },
          ],
          error: null,
        },
      ],
    }, {
      overwrite_schedule_version_atomic: [
        {
          data: {
            schedule_id: 'schedule-1',
            overwritten_version_id: 'version-2',
            selected_version_id: 'version-2',
            finalized_version_id: null,
          },
          error: null,
        },
      ],
    });

    const result = await createVersion(client, AUTH_CONTEXT, 'schedule-1', {
      name: 'V2',
      creationMode: 'overwrite',
      overwriteVersionId: 'version-2',
      inputDiffSummary: {
        changedOffRequests: 1,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: 'retry',
      },
      inputSnapshot,
    });

    expect(rpcSpies.create_schedule_version_atomic).toBeUndefined();
    expect(rpcSpies.overwrite_schedule_version_atomic).toHaveBeenCalledWith({
      p_schedule_id: 'schedule-1',
      p_overwrite_version_id: 'version-2',
      p_name: 'V2',
      p_input_diff_summary: {
        changedOffRequests: 1,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: 'retry',
      },
      p_input_snapshot: inputSnapshot,
    });
    expect(deleteSpies.schedule_assignments).toBeUndefined();
    expect(updateSpies.schedule_versions).not.toHaveBeenCalled();
    expect(result).toEqual({
      scheduleId: 'schedule-1',
      schedulePublicId: undefined,
      organizationId: AUTH_CONTEXT.organizationId,
      month: '2026-04',
      createdVersionId: 'version-2',
      wasCreated: false,
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        expect.objectContaining({ id: 'version-1', versionNo: 1 }),
        expect.objectContaining({
          id: 'version-2',
          versionNo: 2,
          status: 'draft',
          latestEvaluationId: null,
        }),
      ],
    });
  });

  it('maps overwrite rpc version_not_found to version_not_found', async () => {
    const { client } = createClient({
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
            selected_version_id: null,
            finalized_version_id: null,
            latest_version_no: 1,
          },
          error: null,
        },
      ],
    }, {
      overwrite_schedule_version_atomic: [
        {
          data: null,
          error: {
            message: 'version_not_found',
            code: 'P0001',
          },
        },
      ],
    });

    await expect(
      createVersion(client, AUTH_CONTEXT, 'schedule-1', {
        name: 'V2',
        creationMode: 'overwrite',
        overwriteVersionId: 'version-2',
        inputDiffSummary: {
          changedOffRequests: 0,
          changedLockedAssignments: 0,
          changedSiteRequirements: 0,
          note: null,
        },
      })
    ).rejects.toMatchObject({
      code: 'version_not_found',
      status: 404,
    });
  });

  it.each([
    ['already_finalized', 'already_finalized', 409],
    ['version_finalized', 'version_finalized', 409],
    ['version_solving', 'version_solving', 409],
    ['version_archived', 'version_archived', 409],
    ['another_version_solving', 'another_version_solving', 409],
    ['version_not_found', 'version_not_found', 404],
  ])('maps overwrite rpc guard error %s to %s', async (sqlMessage, expectedCode, expectedStatus) => {
    const { client } = createClient({
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
            selected_version_id: null,
            finalized_version_id: null,
            latest_version_no: 1,
          },
          error: null,
        },
      ],
    }, {
      overwrite_schedule_version_atomic: [
        {
          data: null,
          error: {
            message: sqlMessage,
            code: 'P0001',
          },
        },
      ],
    });

    await expect(
      createVersion(client, AUTH_CONTEXT, 'schedule-1', {
        name: 'V2',
        creationMode: 'overwrite',
        overwriteVersionId: 'version-2',
        inputDiffSummary: {
          changedOffRequests: 0,
          changedLockedAssignments: 0,
          changedSiteRequirements: 0,
          note: null,
        },
      })
    ).rejects.toMatchObject({
      code: expectedCode,
      status: expectedStatus,
    });
  });

  it('maps overwrite duplicate version names to version_name_exists', async () => {
    const { client } = createClient({
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
            selected_version_id: null,
            finalized_version_id: null,
            latest_version_no: 2,
          },
          error: null,
        },
      ],
    }, {
      overwrite_schedule_version_atomic: [
        {
          data: null,
          error: {
            message: 'duplicate key value violates unique constraint "idx_schedule_versions_active_name_normalized_unique"',
            code: '23505',
            constraint: 'idx_schedule_versions_active_name_normalized_unique',
          },
        },
      ],
    });

    await expect(
      createVersion(client, AUTH_CONTEXT, 'schedule-1', {
        name: 'V1',
        creationMode: 'overwrite',
        overwriteVersionId: 'version-2',
        inputDiffSummary: {
          changedOffRequests: 0,
          changedLockedAssignments: 0,
          changedSiteRequirements: 0,
          note: null,
        },
      })
    ).rejects.toMatchObject({
      code: 'version_name_exists',
      status: 409,
    });
  });

  it('maps duplicate version names from the normalized SQL index to version_name_exists', async () => {
    const { client } = createClient({
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
      ],
    }, {
      create_schedule_version_atomic: [
        {
          data: null,
          error: {
            message: 'duplicate key value violates unique constraint "idx_schedule_versions_active_name_normalized_unique"',
            code: '23505',
            constraint: 'idx_schedule_versions_active_name_normalized_unique',
          },
        },
      ],
    });

    await expect(
      createVersion(client, AUTH_CONTEXT, 'schedule-1', {
        baseVersionId: 'version-1',
        name: 'V1',
        creationMode: 'new',
        inputDiffSummary: {
          changedOffRequests: 0,
          changedLockedAssignments: 0,
          changedSiteRequirements: 0,
          note: null,
        },
      })
    ).rejects.toMatchObject({
      code: 'version_name_exists',
      status: 409,
    });
  });

  it('maps archived duplicate version names from the normalized SQL index to version_name_exists', async () => {
    const { client } = createClient({
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
      ],
    }, {
      create_schedule_version_atomic: [
        {
          data: null,
          error: {
            message: 'duplicate key value violates unique constraint "idx_schedule_versions_name_normalized_unique"',
            code: '23505',
            constraint: 'idx_schedule_versions_name_normalized_unique',
          },
        },
      ],
    });

    await expect(
      createVersion(client, AUTH_CONTEXT, 'schedule-1', {
        baseVersionId: 'version-1',
        name: 'Archived V1',
        creationMode: 'new',
        inputDiffSummary: {
          changedOffRequests: 0,
          changedLockedAssignments: 0,
          changedSiteRequirements: 0,
          note: null,
        },
      })
    ).rejects.toMatchObject({
      code: 'version_name_exists',
      status: 409,
    });
  });

  it('maps trim/case-insensitive duplicate version names to version_name_exists', async () => {
    const { client } = createClient({
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
      ],
    }, {
      create_schedule_version_atomic: [
        {
          data: null,
          error: {
            message: 'duplicate key value violates unique constraint',
            code: '23505',
            details: 'Key (schedule_id, lower(btrim(name)))=(schedule-1, v1) already exists.',
          },
        },
      ],
    });

    await expect(
      createVersion(client, AUTH_CONTEXT, 'schedule-1', {
        baseVersionId: 'version-1',
        name: '  v1  ',
        creationMode: 'new',
        inputDiffSummary: {
          changedOffRequests: 0,
          changedLockedAssignments: 0,
          changedSiteRequirements: 0,
          note: null,
        },
      })
    ).rejects.toMatchObject({
      code: 'version_name_exists',
      status: 409,
    });
  });

  it.each([
    ['already_finalized', 'already_finalized'],
    ['version_finalized', 'version_finalized'],
    ['version_solving', 'version_solving'],
    ['version_archived', 'version_archived'],
    ['another_version_solving', 'another_version_solving'],
  ])('maps SQL overwrite guard error %s to a 409 %s contract error', async (sqlMessage, expectedCode) => {
    const { client } = createClient({
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
      ],
    }, {
      create_schedule_version_atomic: [
        {
          data: null,
          error: {
            message: sqlMessage,
            code: 'P0001',
          },
        },
      ],
    });

    await expect(
      createVersion(client, AUTH_CONTEXT, 'schedule-1', {
        baseVersionId: 'version-1',
        name: 'V2',
        creationMode: 'new',
        inputDiffSummary: {
          changedOffRequests: 0,
          changedLockedAssignments: 0,
          changedSiteRequirements: 0,
          note: null,
        },
      })
    ).rejects.toMatchObject({
      code: expectedCode,
      status: 409,
    });
  });

  it('maps create-version finalized conflicts to 409 already_finalized contract errors', async () => {
    const { client } = createClient({
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
      ],
    }, {
      create_schedule_version_atomic: [
        {
          data: null,
          error: {
            message: 'already_finalized',
            code: 'P0001',
          },
        },
      ],
    });

    await expect(
      createVersion(client, AUTH_CONTEXT, 'schedule-1', {
        baseVersionId: 'version-1',
        name: 'V2',
        creationMode: 'new',
        inputDiffSummary: {
          changedOffRequests: 0,
          changedLockedAssignments: 0,
          changedSiteRequirements: 0,
          note: null,
        },
      })
    ).rejects.toMatchObject({
      code: 'already_finalized',
      status: 409,
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
    const { client, rpcSpies, updateSpies, upsertSpies, eqSpies } = createClient({
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
          data: [
            {
              id: 'pref-1',
              schedule_id: 'schedule-1',
              schedule_version_id: 'version-2',
              employee_id: 'employee-1',
              date: '2026-04-01',
              request_code: 'O',
              request_note: 'requested off',
              is_soft: true,
              resolution_status: 'pending',
              resolved_shift_id: null,
              resolved_at: null,
              request_source: 'employee_off',
              policy_check_status: 'pending',
              policy_rejection_reason: null,
            },
          ],
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
      commit_schedule_version_solver_result_atomic: [
        {
          data: {
            schedule_version_id: 'version-2',
            status: 'review_ready',
            active_solver_execution_id: null,
            hard_score: 12,
            soft_score: 34,
            failure_reason: null,
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
    expect(rpcSpies.commit_schedule_version_solver_result_atomic).toHaveBeenCalledWith(
      expect.objectContaining({
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
      p_evaluation_result_status: 'passed',
      p_finalization_gate: {
        allowed: true,
        blockingReasons: [],
      },
      p_evaluator_version: 'phase2a-trust-gate-v1',
      })
    );
    expect(
      rpcSpies.commit_schedule_version_solver_result_atomic.mock.calls[0]?.[0]?.p_assignment_hash
    ).toMatch(/^sha256:/);
    expect(upsertSpies.schedule_preferences).not.toHaveBeenCalled();
    expect(updateSpies.schedule_preferences).toHaveBeenCalledWith({
      policy_check_status: 'accepted',
      policy_rejection_reason: null,
    });
    expect(eqSpies.schedule_preferences).toHaveBeenCalledWith('id', 'pref-1');
    expect(eqSpies.schedule_preferences).toHaveBeenCalledWith('schedule_id', 'schedule-1');
    expect(eqSpies.schedule_preferences).toHaveBeenCalledWith('schedule_version_id', 'version-2');
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
      commit_schedule_version_solver_result_atomic: [
        {
          data: {
            schedule_version_id: 'version-2',
            status: 'infeasible',
            active_solver_execution_id: null,
            hard_score: null,
            soft_score: null,
            failure_reason: 'timeout',
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
    expect(rpcSpies.commit_schedule_version_solver_result_atomic).toHaveBeenCalledWith(
      expect.objectContaining({
      p_version_id: 'version-2',
      p_solver_execution_id: 'exec-1',
      p_status: 'failed',
      p_assignments: [],
      p_score: null,
      p_failure_reason: 'timeout',
      p_edited_by: AUTH_CONTEXT.userId,
      p_evaluation_result_status: 'infeasible',
      p_infeasibility: expect.objectContaining({
        summary: 'timeout',
        reason: 'infeasible',
      }),
      p_finalization_gate: expect.objectContaining({
        allowed: false,
      }),
      })
    );
  });

  it('evaluates and persists off-request policy results from active rules on recheck', async () => {
    const { client, rpcSpies, updateSpies, upsertSpies, eqSpies } = createClient({
      schedule_versions: [
        {
          data: {
            id: 'version-2',
            schedule_id: 'schedule-1',
            version_no: 2,
            name: 'V2',
            source_type: 're_solve',
            base_version_id: 'version-1',
            status: 'review_pending',
            current_revision: 3,
            manual_edit_count: 1,
            input_diff_summary: {},
            latest_evaluation_id: 'evaluation-1',
            active_solver_execution_id: null,
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
      schedule_assignments: [
        {
          data: [],
          error: null,
        },
      ],
      schedule_preferences: [
        {
          data: [
            {
              id: 'pref-rn-1',
              schedule_id: 'schedule-1',
              schedule_version_id: 'version-2',
              employee_id: 'employee-rn',
              date: '2026-04-01',
              request_code: 'O',
              request_note: 'rn off 1',
              is_soft: true,
              resolution_status: 'pending',
              resolved_shift_id: null,
              resolved_at: null,
            },
            {
              id: 'pref-rn-2',
              schedule_id: 'schedule-1',
              schedule_version_id: 'version-2',
              employee_id: 'employee-rn',
              date: '2026-04-02',
              request_code: 'O',
              request_note: 'rn off 2',
              is_soft: true,
              resolution_status: 'pending',
              resolved_shift_id: null,
              resolved_at: null,
            },
            {
              id: 'pref-default-1',
              schedule_id: 'schedule-1',
              schedule_version_id: 'version-2',
              employee_id: 'employee-default',
              date: '2026-04-01',
              request_code: 'O',
              request_note: 'default off 1',
              is_soft: true,
              resolution_status: 'pending',
              resolved_shift_id: null,
              resolved_at: null,
            },
            {
              id: 'pref-default-2',
              schedule_id: 'schedule-1',
              schedule_version_id: 'version-2',
              employee_id: 'employee-default',
              date: '2026-04-02',
              request_code: 'O',
              request_note: 'default off 2',
              is_soft: true,
              resolution_status: 'pending',
              resolved_shift_id: null,
              resolved_at: null,
            },
          ],
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
              id: 'shift-1',
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
              id: 'employee-rn',
              rank_code: 'RN',
            },
            {
              id: 'employee-default',
              rank_code: null,
            },
          ],
          error: null,
        },
      ],
      off_request_policy_rules: [
        {
          data: [
            {
              rank_code: null,
              period_type: 'monthly',
              limit_count: 1,
              is_active: true,
            },
            {
              rank_code: null,
              period_type: 'annual',
              limit_count: 12,
              is_active: true,
            },
            {
              rank_code: 'RN',
              period_type: 'monthly',
              limit_count: 2,
              is_active: true,
            },
            {
              rank_code: 'RN',
              period_type: 'annual',
              limit_count: 12,
              is_active: true,
            },
          ],
          error: null,
        },
      ],
      schedule_evaluations: [
        {
          data: null,
          error: null,
        },
      ],
    }, {
      save_schedule_version_evaluation_atomic: [
        {
          data: {
            schedule_version_id: 'version-2',
            current_revision: 3,
            evaluation_id: 'evaluation-2',
            status: 'review_blocked',
            evaluation_result_status: 'review_blocked',
          },
          error: null,
        },
      ],
    });

    await recheckVersion(client, AUTH_CONTEXT, 'version-2');

    expect(upsertSpies.schedule_preferences).not.toHaveBeenCalled();
    expect(updateSpies.schedule_preferences).toHaveBeenCalledTimes(4);
    expect(updateSpies.schedule_preferences).toHaveBeenCalledWith({
      policy_check_status: 'rejected',
      policy_rejection_reason: '월 한도 초과',
    });
    for (const preferenceId of ['pref-default-1', 'pref-rn-1', 'pref-default-2', 'pref-rn-2']) {
      expect(eqSpies.schedule_preferences).toHaveBeenCalledWith('id', preferenceId);
    }
    expect(eqSpies.schedule_preferences).toHaveBeenCalledWith('schedule_id', 'schedule-1');
    expect(eqSpies.schedule_preferences).toHaveBeenCalledWith('schedule_version_id', 'version-2');
    expect(rpcSpies.save_schedule_version_evaluation_atomic).toHaveBeenCalledWith(
      expect.objectContaining({
        p_version_id: 'version-2',
        p_off_request_results: expect.arrayContaining([
          expect.objectContaining({
            employeeId: 'employee-default',
            date: '2026-04-02',
            fulfilled: false,
            reason: '월 한도 초과',
          }),
        ]),
      })
    );
  });

  it('finalizes a review-ready version without a repository-side fairness ledger write', async () => {
    const { client, rpcSpies, upsertSpies } = createClient({
      schedule_versions: [
        {
          data: {
            id: 'version-finalize',
            schedule_id: 'schedule-finalize',
            version_no: 2,
            name: 'V2',
            source_type: 're_solve',
            base_version_id: 'version-1',
            status: 'review_ready',
            current_revision: 4,
            manual_edit_count: 1,
            input_diff_summary: {},
            latest_evaluation_id: 'evaluation-finalize',
            active_solver_execution_id: null,
          },
          error: null,
        },
      ],
      schedules: [
        {
          data: {
            id: 'schedule-finalize',
            organization_id: AUTH_CONTEXT.organizationId,
            month: '2026-04',
            status: 'complete',
            solver_execution_id: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: 'version-finalize',
            finalized_version_id: null,
            latest_version_no: 2,
          },
          error: null,
        },
      ],
      schedule_evaluations: [
        {
          data: {
            id: 'evaluation-finalize',
            schedule_id: 'schedule-finalize',
            schedule_version_id: 'version-finalize',
            revision_no: 4,
            result_status: 'passed',
            proof_summary: {
              weeklyHoursViolations: 0,
              nnnViolations: 0,
              nodViolations: 0,
              minimumRestViolations: 0,
              staffingShortfalls: 0,
            },
            violation_details: [],
            infeasibility: null,
            off_request_results: [],
            comparison_metrics: {
              offRequestReflectionRate: 0.75,
              nightShiftMin: 1,
              nightShiftMax: 2,
              weekendShiftMin: 0,
              weekendShiftMax: 1,
              manualEditCount: 1,
            },
            finalization_gate: {
              allowed: true,
              blocking_reasons: [],
            },
            assignment_hash: 'sha256:finalize-hash',
            solver_execution_id: null,
            evaluator_version: 'phase2a-trust-gate-v1',
            created_at: '2026-04-01T08:00:00Z',
          },
          error: null,
        },
      ],
    }, {
      finalize_schedule_version_atomic: [
        {
          data: {
            schedule_id: 'schedule-finalize',
            schedule_version_id: 'version-finalize',
            status: 'finalized',
            finalized_version_id: 'version-finalize',
            finalized_at: '2026-04-01T09:00:00Z',
            finalized_by: AUTH_CONTEXT.userId,
          },
          error: null,
        },
      ],
    });

    const result = await finalizeVersion(client, AUTH_CONTEXT, 'version-finalize');

    expect(result).toEqual({
      scheduleId: 'schedule-finalize',
      scheduleVersionId: 'version-finalize',
      status: 'finalized',
      finalizedVersionId: 'version-finalize',
      finalizedAt: '2026-04-01T09:00:00Z',
      finalizedBy: AUTH_CONTEXT.userId,
    });
    expect(rpcSpies.finalize_schedule_version_atomic).toHaveBeenCalledWith({
      p_version_id: 'version-finalize',
      p_finalized_by: AUTH_CONTEXT.userId,
    });
    expect(upsertSpies.fairness_ledger_monthly).toBeUndefined();
  });

  it('retries finalization without a repository-side fairness ledger write', async () => {
    const { client, rpcSpies, upsertSpies } = createClient({
      schedule_versions: [
        {
          data: {
            id: 'version-finalize-retry',
            schedule_id: 'schedule-finalize-retry',
            version_no: 2,
            name: 'V2',
            source_type: 're_solve',
            base_version_id: 'version-1',
            status: 'review_ready',
            current_revision: 4,
            manual_edit_count: 1,
            input_diff_summary: {},
            latest_evaluation_id: 'evaluation-finalize-retry',
            active_solver_execution_id: null,
          },
          error: null,
        },
        {
          data: {
            id: 'version-finalize-retry',
            schedule_id: 'schedule-finalize-retry',
            version_no: 2,
            name: 'V2',
            source_type: 're_solve',
            base_version_id: 'version-1',
            status: 'finalized',
            current_revision: 4,
            manual_edit_count: 1,
            input_diff_summary: {},
            latest_evaluation_id: 'evaluation-finalize-retry',
            active_solver_execution_id: null,
          },
          error: null,
        },
      ],
      schedules: [
        {
          data: {
            id: 'schedule-finalize-retry',
            organization_id: AUTH_CONTEXT.organizationId,
            month: '2026-04',
            status: 'complete',
            solver_execution_id: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: 'version-finalize-retry',
            finalized_version_id: null,
            latest_version_no: 2,
          },
          error: null,
        },
        {
          data: {
            id: 'schedule-finalize-retry',
            organization_id: AUTH_CONTEXT.organizationId,
            month: '2026-04',
            status: 'complete',
            solver_execution_id: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: 'version-finalize-retry',
            finalized_version_id: 'version-finalize-retry',
            latest_version_no: 2,
          },
          error: null,
        },
      ],
      schedule_evaluations: [
        {
          data: {
            id: 'evaluation-finalize-retry',
            schedule_id: 'schedule-finalize-retry',
            schedule_version_id: 'version-finalize-retry',
            revision_no: 4,
            result_status: 'passed',
            proof_summary: {
              weeklyHoursViolations: 0,
              nnnViolations: 0,
              nodViolations: 0,
              minimumRestViolations: 0,
              staffingShortfalls: 0,
            },
            violation_details: [],
            infeasibility: null,
            off_request_results: [],
            comparison_metrics: {
              offRequestReflectionRate: 0.75,
              nightShiftMin: 1,
              nightShiftMax: 2,
              weekendShiftMin: 0,
              weekendShiftMax: 1,
              manualEditCount: 1,
            },
            finalization_gate: {
              allowed: true,
              blocking_reasons: [],
            },
            assignment_hash: 'sha256:finalize-retry-hash',
            solver_execution_id: null,
            evaluator_version: 'phase2a-trust-gate-v1',
            created_at: '2026-04-01T08:00:00Z',
          },
          error: null,
        },
        {
          data: {
            id: 'evaluation-finalize-retry',
            schedule_id: 'schedule-finalize-retry',
            schedule_version_id: 'version-finalize-retry',
            revision_no: 4,
            result_status: 'passed',
            proof_summary: {
              weeklyHoursViolations: 0,
              nnnViolations: 0,
              nodViolations: 0,
              minimumRestViolations: 0,
              staffingShortfalls: 0,
            },
            violation_details: [],
            infeasibility: null,
            off_request_results: [],
            comparison_metrics: {
              offRequestReflectionRate: 0.75,
              nightShiftMin: 1,
              nightShiftMax: 2,
              weekendShiftMin: 0,
              weekendShiftMax: 1,
              manualEditCount: 1,
            },
            finalization_gate: {
              allowed: true,
              blocking_reasons: [],
            },
            assignment_hash: 'sha256:finalize-retry-hash',
            solver_execution_id: null,
            evaluator_version: 'phase2a-trust-gate-v1',
            created_at: '2026-04-01T08:00:00Z',
          },
          error: null,
        },
      ],
    }, {
      finalize_schedule_version_atomic: [
        {
          data: {
            schedule_id: 'schedule-finalize-retry',
            schedule_version_id: 'version-finalize-retry',
            status: 'finalized',
            finalized_version_id: 'version-finalize-retry',
            finalized_at: '2026-04-01T09:00:00Z',
            finalized_by: AUTH_CONTEXT.userId,
          },
          error: null,
        },
        {
          data: {
            schedule_id: 'schedule-finalize-retry',
            schedule_version_id: 'version-finalize-retry',
            status: 'finalized',
            finalized_version_id: 'version-finalize-retry',
            finalized_at: '2026-04-01T09:00:00Z',
            finalized_by: AUTH_CONTEXT.userId,
          },
          error: null,
        },
      ],
    });

    await finalizeVersion(client, AUTH_CONTEXT, 'version-finalize-retry');
    await finalizeVersion(client, AUTH_CONTEXT, 'version-finalize-retry');

    expect(rpcSpies.finalize_schedule_version_atomic).toHaveBeenCalledTimes(2);
    expect(upsertSpies.fairness_ledger_monthly).toBeUndefined();
  });

  it.each([
    {
      label: 'draft',
      versionStatus: 'draft' as const,
      selectedVersionId: 'version-blocked',
      errorCode: 'not_review_ready',
    },
    {
      label: 'review_pending',
      versionStatus: 'review_pending' as const,
      selectedVersionId: 'version-blocked',
      errorCode: 'not_review_ready',
    },
    {
      label: 'compare-only',
      versionStatus: 'review_ready' as const,
      selectedVersionId: 'version-other',
      errorCode: 'not_selected_version',
    },
  ])('blocks ledger writes for $label versions', async ({
    versionStatus,
    selectedVersionId,
    errorCode,
  }) => {
    const { client, rpcSpies, upsertSpies } = createClient({
      schedule_versions: [
        {
          data: {
            id: 'version-blocked',
            schedule_id: 'schedule-blocked',
            version_no: 2,
            name: 'V2',
            source_type: 're_solve',
            base_version_id: 'version-1',
            status: versionStatus,
            current_revision: 4,
            manual_edit_count: 1,
            input_diff_summary: {},
            latest_evaluation_id: 'evaluation-blocked',
            active_solver_execution_id: null,
          },
          error: null,
        },
      ],
      schedules: [
        {
          data: {
            id: 'schedule-blocked',
            organization_id: AUTH_CONTEXT.organizationId,
            month: '2026-04',
            status: 'complete',
            solver_execution_id: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: selectedVersionId,
            finalized_version_id: null,
            latest_version_no: 2,
          },
          error: null,
        },
      ],
    });

    await expect(finalizeVersion(client, AUTH_CONTEXT, 'version-blocked')).rejects.toMatchObject({
      code: errorCode,
    });
    expect(rpcSpies.finalize_schedule_version_atomic).toBeUndefined();
    expect(upsertSpies.fairness_ledger_monthly).toBeUndefined();
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

  it('resets roster and current-month schedule through the atomic trust boundary rpc', async () => {
    const { client, rpcSpies } = createClient({}, {
      replace_roster_and_reset_schedule_atomic: [
        {
          data: {
            deleted_schedule_id: 'schedule-2',
            employee_count: 2,
          },
          error: null,
        },
      ],
    });

    const result = await resetScheduleRoster(client, AUTH_CONTEXT, {
      organizationId: AUTH_CONTEXT.organizationId,
      month: '2026-04',
      employees: [
        {
          employeeId: 'E-001',
          name: 'Alice',
          availableShifts: ['D', 'E'],
        },
        {
          employeeId: 'E-002',
          name: 'Bob',
          availableShifts: ['N', 'O'],
        },
      ],
    });

    expect(result).toEqual({
      deletedScheduleId: 'schedule-2',
      employeeCount: 2,
    });
    expect(rpcSpies.replace_roster_and_reset_schedule_atomic).toHaveBeenCalledWith({
      p_organization_id: AUTH_CONTEXT.organizationId,
      p_month: '2026-04',
      p_employees: [
        {
          employeeId: 'E-001',
          name: 'Alice',
          availableShifts: ['D', 'E'],
        },
        {
          employeeId: 'E-002',
          name: 'Bob',
          availableShifts: ['N', 'O'],
        },
      ],
    });
  });

  it('deletes a non-finalized month schedule through the atomic trust boundary rpc', async () => {
    const { client, rpcSpies } = createClient({}, {
      delete_schedule_month_atomic: [
        {
          data: {
            deleted_schedule_id: 'schedule-2',
          },
          error: null,
        },
      ],
    });

    const result = await deleteScheduleMonth(client, AUTH_CONTEXT, {
      organizationId: AUTH_CONTEXT.organizationId,
      month: '2026-04',
    });

    expect(result).toEqual({ deletedScheduleId: 'schedule-2' });
    expect(rpcSpies.delete_schedule_month_atomic).toHaveBeenCalledWith({
      p_organization_id: AUTH_CONTEXT.organizationId,
      p_month: '2026-04',
      p_deleted_by: AUTH_CONTEXT.userId,
    });
  });

  it('rejects schedule month deletion for another organization', async () => {
    const { client } = createClient({}, {});

    await expect(deleteScheduleMonth(client, AUTH_CONTEXT, {
      organizationId: '99999999-9999-4999-8999-999999999999',
      month: '2026-04',
    })).rejects.toMatchObject({
      code: 'organization_access_denied',
      status: 403,
    });
  });

  it('maps delete-month finalized conflicts to 409 already_finalized contract errors', async () => {
    const { client } = createClient({}, {
      delete_schedule_month_atomic: [
        {
          data: null,
          error: {
            message: 'already_finalized',
            code: 'P0001',
          },
        },
      ],
    });

    await expect(deleteScheduleMonth(client, AUTH_CONTEXT, {
      organizationId: AUTH_CONTEXT.organizationId,
      month: '2026-04',
    })).rejects.toMatchObject({
      code: 'already_finalized',
      status: 409,
    });
  });

  it('maps delete-month active solver conflicts to 409 version_locked_for_solving contract errors', async () => {
    const { client } = createClient({}, {
      delete_schedule_month_atomic: [
        {
          data: null,
          error: {
            message: 'version_locked_for_solving',
            code: 'P0001',
          },
        },
      ],
    });

    await expect(deleteScheduleMonth(client, AUTH_CONTEXT, {
      organizationId: AUTH_CONTEXT.organizationId,
      month: '2026-04',
    })).rejects.toMatchObject({
      code: 'version_locked_for_solving',
      status: 409,
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
          data: [],
          error: null,
        },
      ],
    }, {
      commit_schedule_version_solver_result_atomic: [
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

  it('returns the already-committed solver result when a duplicate callback arrives after completion', async () => {
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
            status: 'review_ready',
            current_revision: 0,
            manual_edit_count: 0,
            input_diff_summary: {},
            latest_evaluation_id: 'evaluation-2',
            active_solver_execution_id: null,
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
            status: 'review_ready',
            current_revision: 0,
            manual_edit_count: 0,
            input_diff_summary: {},
            latest_evaluation_id: 'evaluation-2',
            active_solver_execution_id: null,
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
            status: 'complete',
            solver_execution_id: null,
            hard_score: 12,
            soft_score: 34,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: 'version-2',
            finalized_version_id: null,
            latest_version_no: 2,
          },
          error: null,
        },
        {
          data: [],
          error: null,
        },
        {
          data: {
            id: 'schedule-1',
            organization_id: AUTH_CONTEXT.organizationId,
            month: '2026-04',
            status: 'complete',
            solver_execution_id: null,
            hard_score: 12,
            soft_score: 34,
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
          data: [],
          error: null,
        },
      ],
      schedule_evaluations: [
        {
          data: [
            {
              id: 'evaluation-2',
              schedule_id: 'schedule-1',
              schedule_version_id: 'version-2',
              revision_no: 0,
              result_status: 'passed',
              proof_summary: {},
              violation_details: [],
              infeasibility: null,
              off_request_results: [],
              comparison_metrics: {},
              finalization_gate: {
                allowed: true,
                blockingReasons: [],
              },
              assignment_hash: 'sha256:abc',
              solver_execution_id: 'exec-final',
              evaluator_version: 'phase2a-trust-gate-v1',
              created_at: '2026-04-01T00:00:00Z',
            },
          ],
          error: null,
        },
      ],
      off_request_policy_rules: [
        {
          data: [],
          error: null,
        },
      ],
    }, {
      commit_schedule_version_solver_result_atomic: [
        {
          data: null,
          error: {
            message: 'stale_solver_callback',
            code: 'P0001',
          },
        },
      ],
    });

    const result = await syncVersionSolverResult(client, AUTH_CONTEXT, 'version-2', {
      status: 'completed',
      solverExecutionId: 'exec-final',
      assignments: [],
      score: {
        hardScore: 12,
        softScore: 34,
      },
      failureReason: null,
      failureType: null,
      failureContext: null,
    });

    expect(result).toEqual({
      scheduleVersionId: 'version-2',
      status: 'review_ready',
      solverExecutionId: null,
      hardScore: 12,
      softScore: 34,
      failureReason: null,
    });
  });

  it('returns the latest saved evaluation when duplicate callbacks produced multiple evaluation rows', async () => {
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
            status: 'solve_failed',
            current_revision: 0,
            manual_edit_count: 0,
            input_diff_summary: {},
            latest_evaluation_id: 'evaluation-latest',
            active_solver_execution_id: null,
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
            status: 'solve_failed',
            current_revision: 0,
            manual_edit_count: 0,
            input_diff_summary: {},
            latest_evaluation_id: 'evaluation-latest',
            active_solver_execution_id: null,
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
            status: 'error',
            solver_execution_id: null,
            hard_score: null,
            soft_score: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: 'version-2',
            finalized_version_id: null,
            latest_version_no: 2,
          },
          error: null,
        },
        {
          data: [],
          error: null,
        },
        {
          data: {
            id: 'schedule-1',
            organization_id: AUTH_CONTEXT.organizationId,
            month: '2026-04',
            status: 'error',
            solver_execution_id: null,
            hard_score: null,
            soft_score: null,
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
          data: [],
          error: null,
        },
      ],
      schedule_evaluations: [
        {
          data: [
            {
              id: 'evaluation-latest',
              schedule_id: 'schedule-1',
              schedule_version_id: 'version-2',
              revision_no: 0,
              result_status: 'solve_failed',
              proof_summary: {},
              violation_details: [],
              infeasibility: {
                summary: 'latest duplicate',
              },
              off_request_results: [],
              comparison_metrics: {},
              finalization_gate: {
                allowed: false,
                blockingReasons: ['latest'],
              },
              assignment_hash: 'sha256:latest',
              solver_execution_id: 'exec-duplicate',
              evaluator_version: 'phase2a-trust-gate-v1',
              created_at: '2026-04-01T01:00:00Z',
            },
            {
              id: 'evaluation-earlier',
              schedule_id: 'schedule-1',
              schedule_version_id: 'version-2',
              revision_no: 0,
              result_status: 'solve_failed',
              proof_summary: {},
              violation_details: [],
              infeasibility: {
                summary: 'older duplicate',
              },
              off_request_results: [],
              comparison_metrics: {},
              finalization_gate: {
                allowed: false,
                blockingReasons: ['older'],
              },
              assignment_hash: 'sha256:older',
              solver_execution_id: 'exec-duplicate',
              evaluator_version: 'phase2a-trust-gate-v1',
              created_at: '2026-04-01T00:00:00Z',
            },
          ],
          error: null,
        },
      ],
      off_request_policy_rules: [
        {
          data: [],
          error: null,
        },
      ],
    }, {
      commit_schedule_version_solver_result_atomic: [
        {
          data: null,
          error: {
            message: 'stale_solver_callback',
            code: 'P0001',
          },
        },
      ],
    });

    const result = await syncVersionSolverResult(client, AUTH_CONTEXT, 'version-2', {
      status: 'failed',
      solverExecutionId: 'exec-duplicate',
      assignments: [],
      score: null,
      failureReason: 'solver failed',
      failureType: 'worker_crash',
      failureContext: {
        traceId: 'trace-1',
      },
    });

    expect(result).toEqual({
      scheduleVersionId: 'version-2',
      status: 'solve_failed',
      solverExecutionId: null,
      hardScore: null,
      softScore: null,
      failureReason: 'latest duplicate',
    });
  });

  it('archives one version through the atomic delete rpc and returns the refreshed compare response', async () => {
    const deleteVersion = getDeleteVersion();
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
            current_revision: 1,
            manual_edit_count: 2,
            input_diff_summary: {},
            latest_evaluation_id: null,
            active_solver_execution_id: null,
            archived_at: null,
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
              status: 'review_ready',
              current_revision: 0,
              manual_edit_count: 0,
              input_diff_summary: {},
              latest_evaluation_id: null,
              active_solver_execution_id: null,
              archived_at: null,
            },
            {
              id: 'version-3',
              schedule_id: 'schedule-1',
              version_no: 3,
              name: 'V3',
              source_type: 'manual_variant',
              base_version_id: 'version-1',
              status: 'draft',
              current_revision: 0,
              manual_edit_count: 0,
              input_diff_summary: {},
              latest_evaluation_id: null,
              active_solver_execution_id: null,
              archived_at: null,
            },
          ],
          error: null,
        },
      ],
      schedules: [
        {
          data: {
            id: 'schedule-1',
            public_id: 'sch_deletev0001',
            organization_id: AUTH_CONTEXT.organizationId,
            month: '2026-04',
            status: 'complete',
            solver_execution_id: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: 'version-2',
            finalized_version_id: null,
            latest_version_no: 3,
          },
          error: null,
        },
        {
          data: {
            id: 'schedule-1',
            public_id: 'sch_deletev0001',
            organization_id: AUTH_CONTEXT.organizationId,
            month: '2026-04',
            status: 'created',
            solver_execution_id: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:05:00Z',
            selected_version_id: 'version-3',
            finalized_version_id: null,
            latest_version_no: 3,
          },
          error: null,
        },
      ],
    }, {
      archive_schedule_version_atomic: [
        {
          data: {
            schedule_id: 'schedule-1',
            archived_version_id: 'version-2',
            selected_version_id: 'version-3',
          },
          error: null,
        },
      ],
    });

    const result = await deleteVersion(client, AUTH_CONTEXT, 'version-2', {
      replacementSelectedVersionId: 'version-3',
    });

    expect(result).toEqual({
      scheduleId: 'schedule-1',
      schedulePublicId: 'sch_deletev0001',
      organizationId: AUTH_CONTEXT.organizationId,
      month: '2026-04',
      selectedVersionId: 'version-3',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        expect.objectContaining({
          id: 'version-1',
          versionNo: 1,
          isSelected: false,
        }),
        expect.objectContaining({
          id: 'version-3',
          versionNo: 3,
          isSelected: true,
        }),
      ],
    });
    expect(rpcSpies.archive_schedule_version_atomic).toHaveBeenCalledWith({
      p_version_id: 'version-2',
      p_replacement_selected_version_id: 'version-3',
      p_archived_by: AUTH_CONTEXT.userId,
    });
  });

  it('maps delete-version last_version conflicts to 409 contract errors', async () => {
    const deleteVersion = getDeleteVersion();
    const { client } = createClient({
      schedule_versions: [
        {
          data: {
            id: 'version-only',
            schedule_id: 'schedule-1',
            version_no: 1,
            name: 'V1',
            source_type: 'initial_solve',
            base_version_id: null,
            status: 'draft',
            current_revision: 0,
            manual_edit_count: 0,
            input_diff_summary: {},
            latest_evaluation_id: null,
            active_solver_execution_id: null,
            archived_at: null,
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
            selected_version_id: 'version-only',
            finalized_version_id: null,
            latest_version_no: 1,
          },
          error: null,
        },
      ],
    }, {
      archive_schedule_version_atomic: [
        {
          data: null,
          error: {
            message: 'last_version',
            code: 'P0001',
          },
        },
      ],
    });

    await expect(
      deleteVersion(client, AUTH_CONTEXT, 'version-only', {
        replacementSelectedVersionId: 'version-replacement',
      })
    ).rejects.toMatchObject({
      code: 'last_version',
      status: 409,
    });
  });

  it('resets generated results through the atomic rpc and keeps the source version as the only active compare candidate', async () => {
    const deleteGeneratedResults = getDeleteGeneratedResults();
    const { client, rpcSpies } = createClient({
      schedule_versions: [
        {
          data: {
            id: 'version-1',
            schedule_id: 'schedule-1',
            version_no: 1,
            name: 'V1',
            source_type: 'initial_solve',
            base_version_id: null,
            status: 'review_ready',
            current_revision: 3,
            manual_edit_count: 5,
            input_diff_summary: {},
            latest_evaluation_id: null,
            active_solver_execution_id: null,
            archived_at: null,
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
              status: 'draft',
              current_revision: 0,
              manual_edit_count: 0,
              input_diff_summary: {},
              latest_evaluation_id: null,
              active_solver_execution_id: null,
              archived_at: null,
            },
          ],
          error: null,
        },
      ],
      schedules: [
        {
          data: {
            id: 'schedule-1',
            public_id: 'sch_resetg0001',
            organization_id: AUTH_CONTEXT.organizationId,
            month: '2026-04',
            status: 'complete',
            solver_execution_id: null,
            hard_score: 88,
            soft_score: 12,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: 'version-3',
            finalized_version_id: null,
            latest_version_no: 3,
          },
          error: null,
        },
        {
          data: {
            id: 'schedule-1',
            public_id: 'sch_resetg0001',
            organization_id: AUTH_CONTEXT.organizationId,
            month: '2026-04',
            status: 'created',
            solver_execution_id: null,
            hard_score: null,
            soft_score: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:10:00Z',
            selected_version_id: 'version-1',
            finalized_version_id: null,
            latest_version_no: 3,
          },
          error: null,
        },
      ],
    }, {
      reset_schedule_generated_results_atomic: [
        {
          data: {
            schedule_id: 'schedule-1',
            source_version_id: 'version-1',
          },
          error: null,
        },
      ],
    });

    const result = await deleteGeneratedResults(client, AUTH_CONTEXT, 'schedule-1', {
      sourceVersionId: 'version-1',
    });

    expect(result).toEqual({
      scheduleId: 'schedule-1',
      schedulePublicId: 'sch_resetg0001',
      organizationId: AUTH_CONTEXT.organizationId,
      month: '2026-04',
      selectedVersionId: 'version-1',
      finalizedVersionId: null,
      activeSolvingVersionId: null,
      versions: [
        expect.objectContaining({
          id: 'version-1',
          versionNo: 1,
          status: 'draft',
          manualEditCount: 0,
          isSelected: true,
        }),
      ],
    });
    expect(rpcSpies.reset_schedule_generated_results_atomic).toHaveBeenCalledWith({
      p_schedule_id: 'schedule-1',
      p_source_version_id: 'version-1',
      p_reset_by: AUTH_CONTEXT.userId,
    });
  });

  it('maps delete-generated-results solving conflicts to 409 contract errors', async () => {
    const deleteGeneratedResults = getDeleteGeneratedResults();
    const { client } = createClient({
      schedule_versions: [
        {
          data: {
            id: 'version-1',
            schedule_id: 'schedule-1',
            version_no: 1,
            name: 'V1',
            source_type: 'initial_solve',
            base_version_id: null,
            status: 'review_ready',
            current_revision: 0,
            manual_edit_count: 0,
            input_diff_summary: {},
            latest_evaluation_id: null,
            active_solver_execution_id: null,
            archived_at: null,
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
            selected_version_id: 'version-1',
            finalized_version_id: null,
            latest_version_no: 1,
          },
          error: null,
        },
      ],
    }, {
      reset_schedule_generated_results_atomic: [
        {
          data: null,
          error: {
            message: 'version_locked_for_solving',
            code: 'P0001',
          },
        },
      ],
    });

    await expect(
      deleteGeneratedResults(client, AUTH_CONTEXT, 'schedule-1', {
        sourceVersionId: 'version-1',
      })
    ).rejects.toMatchObject({
      code: 'version_locked_for_solving',
      status: 409,
    });
  });
});
