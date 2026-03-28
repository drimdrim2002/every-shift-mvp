import { describe, expect, it, vi } from 'vitest';
import { compare, ensure, review, select } from '@/../supabase/functions/phase2-schedule/repository.ts';
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

class FakeQueryBuilder<T> implements PromiseLike<QueryResult<T>> {
  private readonly listResult: QueryResult<T>;

  constructor(listResult: QueryResult<T>) {
    this.listResult = listResult;
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

  eq() {
    return this;
  }

  in() {
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

function createClient(results: Record<string, Array<QueryResult<any>>>) {
  const updateSpies: Record<string, ReturnType<typeof vi.fn>> = {};
  const insertSpies: Record<string, ReturnType<typeof vi.fn>> = {};
  const from = vi.fn((table: string) => {
    const queue = results[table];

    if (!queue || queue.length === 0) {
      throw new Error(`Unexpected query for table ${table}`);
    }

    const builder = new FakeQueryBuilder(queue.shift()!);
    insertSpies[table] ??= vi.fn();
    updateSpies[table] ??= vi.fn();

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
    };
  });

  const client = { from } as unknown as Phase2ScheduleRepositoryClient;

  return {
    client,
    from,
    updateSpies,
    insertSpies,
  };
}

const AUTH_CONTEXT: Phase2ScheduleAuthContext = {
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  organizationId: '33333333-3333-4333-8333-333333333333',
};

describe('phase2 schedule repository', () => {
  it('keeps ensure idempotent when the container and V1 already exist', async () => {
    const { client, insertSpies } = createClient({
      schedules: [
        {
          data: {
            id: '11111111-1111-4111-8111-111111111111',
            organization_id: '33333333-3333-4333-8333-333333333333',
            month: '2026-04',
            status: 'created',
            solver_execution_id: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: '22222222-2222-4222-8222-222222222222',
            finalized_version_id: null,
            latest_version_no: 1,
          },
          error: null,
        },
        {
          data: {
            id: '11111111-1111-4111-8111-111111111111',
            organization_id: '33333333-3333-4333-8333-333333333333',
            month: '2026-04',
            status: 'created',
            solver_execution_id: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: '22222222-2222-4222-8222-222222222222',
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
              id: '22222222-2222-4222-8222-222222222222',
              schedule_id: '11111111-1111-4111-8111-111111111111',
              version_no: 1,
              name: 'V1',
              source_type: 'initial_solve',
              base_version_id: null,
              status: 'draft',
              current_revision: 0,
              manual_edit_count: 0,
              input_diff_summary: {},
              latest_evaluation_id: null,
              latest_evaluation_result_status: null,
              comparison_metrics: null,
              finalization_gate: null,
            },
          ],
          error: null,
        },
        {
          data: [
            {
              id: '22222222-2222-4222-8222-222222222222',
              schedule_id: '11111111-1111-4111-8111-111111111111',
              version_no: 1,
              name: 'V1',
              source_type: 'initial_solve',
              base_version_id: null,
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
    });

    const result = await ensure(client, AUTH_CONTEXT, {
      organizationId: '33333333-3333-4333-8333-333333333333',
      month: '2026-04',
    });

    expect(result).toEqual({
      scheduleId: '11111111-1111-4111-8111-111111111111',
      selectedVersionId: '22222222-2222-4222-8222-222222222222',
      finalizedVersionId: null,
      versions: [
        expect.objectContaining({
          id: '22222222-2222-4222-8222-222222222222',
          versionNo: 1,
          isSelected: true,
          isFinalized: false,
        }),
      ],
    });
    expect(insertSpies.schedules).not.toHaveBeenCalled();
    expect(insertSpies.schedule_versions).not.toHaveBeenCalled();
  });

  it('recovers from a duplicate schedule insert by reloading the existing container', async () => {
    const { client, insertSpies } = createClient({
      schedules: [
        {
          data: null,
          error: null,
        },
        {
          data: null,
          error: {
            message: 'duplicate key value violates unique constraint',
            code: '23505',
            constraint: 'schedules_organization_id_month_key',
            details: 'Key (organization_id, month)=(33333333-3333-4333-8333-333333333333, 2026-04) already exists.',
          },
        },
        {
          data: {
            id: '99999999-9999-4999-8999-999999999999',
            organization_id: '33333333-3333-4333-8333-333333333333',
            month: '2026-04',
            status: 'created',
            solver_execution_id: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: '12121212-1212-4212-8212-121212121212',
            finalized_version_id: null,
            latest_version_no: 1,
          },
          error: null,
        },
        {
          data: {
            id: '99999999-9999-4999-8999-999999999999',
            organization_id: '33333333-3333-4333-8333-333333333333',
            month: '2026-04',
            status: 'created',
            solver_execution_id: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: '12121212-1212-4212-8212-121212121212',
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
              id: '12121212-1212-4212-8212-121212121212',
              schedule_id: '99999999-9999-4999-8999-999999999999',
              version_no: 1,
              name: 'V1',
              source_type: 'initial_solve',
              base_version_id: null,
              status: 'draft',
              current_revision: 0,
              manual_edit_count: 0,
              input_diff_summary: {},
              latest_evaluation_id: null,
            },
          ],
          error: null,
        },
        {
          data: [
            {
              id: '12121212-1212-4212-8212-121212121212',
              schedule_id: '99999999-9999-4999-8999-999999999999',
              version_no: 1,
              name: 'V1',
              source_type: 'initial_solve',
              base_version_id: null,
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
    });

    const result = await ensure(client, AUTH_CONTEXT, {
      organizationId: AUTH_CONTEXT.organizationId,
      month: '2026-04',
    });

    expect(result.scheduleId).toBe('99999999-9999-4999-8999-999999999999');
    expect(result.selectedVersionId).toBe('12121212-1212-4212-8212-121212121212');
    expect(insertSpies.schedules).toHaveBeenCalledWith({
      organization_id: '33333333-3333-4333-8333-333333333333',
      month: '2026-04',
      status: 'created',
      selected_version_id: null,
      finalized_version_id: null,
      latest_version_no: 0,
    });
    expect(insertSpies.schedule_versions).not.toHaveBeenCalled();
  });

  it('recovers from a duplicate V1 insert and returns refreshed selection state', async () => {
    const { client, insertSpies, updateSpies } = createClient({
      schedules: [
        {
          data: {
            id: '98989898-9898-4989-8989-989898989898',
            organization_id: '33333333-3333-4333-8333-333333333333',
            month: '2026-04',
            status: 'created',
            solver_execution_id: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: null,
            finalized_version_id: null,
            latest_version_no: 0,
          },
          error: null,
        },
        {
          data: null,
          error: null,
        },
        {
          data: {
            id: '98989898-9898-4989-8989-989898989898',
            organization_id: '33333333-3333-4333-8333-333333333333',
            month: '2026-04',
            status: 'created',
            solver_execution_id: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: '56565656-5656-4656-8656-565656565656',
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
        {
          data: null,
          error: {
            message: 'duplicate key value violates unique constraint',
            code: '23505',
            constraint: 'schedule_versions_schedule_id_version_no_key',
            details: 'Key (schedule_id, version_no)=(98989898-9898-4989-8989-989898989898, 1) already exists.',
          },
        },
        {
          data: [
            {
              id: '56565656-5656-4656-8656-565656565656',
              schedule_id: '98989898-9898-4989-8989-989898989898',
              version_no: 1,
              name: 'V1',
              source_type: 'initial_solve',
              base_version_id: null,
              status: 'draft',
              current_revision: 0,
              manual_edit_count: 0,
              input_diff_summary: {},
              latest_evaluation_id: null,
            },
          ],
          error: null,
        },
        {
          data: [
            {
              id: '56565656-5656-4656-8656-565656565656',
              schedule_id: '98989898-9898-4989-8989-989898989898',
              version_no: 1,
              name: 'V1',
              source_type: 'initial_solve',
              base_version_id: null,
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

    const result = await ensure(client, AUTH_CONTEXT, {
      organizationId: AUTH_CONTEXT.organizationId,
      month: '2026-04',
    });

    expect(result.selectedVersionId).toBe('56565656-5656-4656-8656-565656565656');
    expect(insertSpies.schedule_versions).toHaveBeenCalledTimes(1);
    expect(updateSpies.schedules).toHaveBeenCalledWith({
      selected_version_id: '56565656-5656-4656-8656-565656565656',
      latest_version_no: 1,
    });
  });

  it('preserves legacy runtime state when bootstrapping the first V1', async () => {
    const { client, insertSpies } = createClient({
      schedules: [
        {
          data: {
            id: '45454545-4545-4454-8454-454545454545',
            organization_id: '33333333-3333-4333-8333-333333333333',
            month: '2026-04',
            status: 'running',
            solver_execution_id: 'solver-exec-1',
            created_at: '2026-03-01T00:00:00Z',
            updated_at: '2026-03-15T12:00:00Z',
            selected_version_id: null,
            finalized_version_id: null,
            latest_version_no: 0,
          },
          error: null,
        },
        {
          data: null,
          error: null,
        },
        {
          data: {
            id: '45454545-4545-4454-8454-454545454545',
            organization_id: '33333333-3333-4333-8333-333333333333',
            month: '2026-04',
            status: 'running',
            solver_execution_id: 'solver-exec-1',
            created_at: '2026-03-01T00:00:00Z',
            updated_at: '2026-03-15T12:00:00Z',
            selected_version_id: '78787878-7878-4878-8878-787878787878',
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
        {
          data: {
            id: '78787878-7878-4878-8878-787878787878',
            schedule_id: '45454545-4545-4454-8454-454545454545',
            version_no: 1,
            name: 'V1',
            source_type: 'initial_solve',
            base_version_id: null,
            status: 'solving',
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
              id: '78787878-7878-4878-8878-787878787878',
              schedule_id: '45454545-4545-4454-8454-454545454545',
              version_no: 1,
              name: 'V1',
              source_type: 'initial_solve',
              base_version_id: null,
              status: 'solving',
              current_revision: 0,
              manual_edit_count: 0,
              input_diff_summary: {},
              latest_evaluation_id: null,
              active_solver_execution_id: 'solver-exec-1',
            },
          ],
          error: null,
        },
      ],
      schedule_preferences: [
        {
          data: [{ id: 'pref-1' }, { id: 'pref-2' }],
          error: null,
        },
      ],
      schedule_assignments: [
        {
          data: [{ is_locked: true }, { is_locked: false }, { is_locked: true }],
          error: null,
        },
      ],
    });

    const result = await ensure(client, AUTH_CONTEXT, {
      organizationId: AUTH_CONTEXT.organizationId,
      month: '2026-04',
    });

    expect(insertSpies.schedule_versions).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'solving',
        active_solver_execution_id: 'solver-exec-1',
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-15T12:00:00Z',
        input_snapshot: {
          off_request_count: 2,
          locked_assignment_count: 2,
        },
      })
    );
    expect(result.versions[0]).toEqual(
      expect.objectContaining({
        id: '78787878-7878-4878-8878-787878787878',
        status: 'solving',
        activeSolverExecutionId: 'solver-exec-1',
      })
    );
  });

  it('denies compare requests that target another organization', async () => {
    const { client } = createClient({
      schedules: [
        {
          data: {
            id: '90909090-9090-4909-8909-909090909090',
            organization_id: '12121212-1212-4212-8212-121212121212',
            month: '2026-04',
            status: 'created',
            solver_execution_id: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: null,
            finalized_version_id: null,
            latest_version_no: 0,
          },
          error: null,
        },
      ],
    });

    await expect(
      compare(client, AUTH_CONTEXT, '90909090-9090-4909-8909-909090909090')
    ).rejects.toMatchObject({
      code: 'organization_access_denied',
      status: 403,
    });
  });

  it('returns latestEvaluation as null when the preview version has not been evaluated', async () => {
    const { client } = createClient({
      schedule_versions: [
        {
          data: {
            id: '44444444-4444-4444-8444-444444444444',
            schedule_id: '55555555-5555-4555-8555-555555555555',
            version_no: 2,
            name: 'V2',
            source_type: 're_solve',
            base_version_id: '22222222-2222-4222-8222-222222222222',
            status: 'review_blocked',
            current_revision: 3,
            manual_edit_count: 1,
            input_diff_summary: { changed_off_requests: 1, note: 'Adjusted request' },
            latest_evaluation_id: null,
            comparison_metrics: null,
            finalization_gate: null,
          },
          error: null,
        },
      ],
      schedules: [
        {
          data: {
            id: '55555555-5555-4555-8555-555555555555',
            organization_id: '33333333-3333-4333-8333-333333333333',
            month: '2026-04',
            status: 'created',
            solver_execution_id: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: '22222222-2222-4222-8222-222222222222',
            finalized_version_id: null,
            latest_version_no: 2,
          },
          error: null,
        },
      ],
    });

    const result = await review(client, AUTH_CONTEXT, '44444444-4444-4444-8444-444444444444');

    expect(result.latestEvaluation).toBeNull();
    expect(result.primaryAction).toEqual({
      kind: 'select',
      targetVersionId: '44444444-4444-4444-8444-444444444444',
      label: 'Select this version as the finalization candidate',
      disabledReason: null,
    });
    expect(result.defaultTab).toBe('grid');
  });

  it('updates only selected_version_id during select and leaves version rows untouched', async () => {
    const { client, updateSpies } = createClient({
      schedule_versions: [
        {
          data: {
            id: '66666666-6666-4666-8666-666666666666',
            schedule_id: '77777777-7777-4777-8777-777777777777',
          },
          error: null,
        },
      ],
      schedules: [
        {
          data: {
            id: '77777777-7777-4777-8777-777777777777',
            organization_id: '33333333-3333-4333-8333-333333333333',
            month: '2026-04',
            status: 'created',
            solver_execution_id: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
            selected_version_id: '22222222-2222-4222-8222-222222222222',
            finalized_version_id: null,
            latest_version_no: 2,
          },
          error: null,
        },
        {
          data: {
            id: '77777777-7777-4777-8777-777777777777',
            selected_version_id: '66666666-6666-4666-8666-666666666666',
            finalized_version_id: null,
          },
          error: null,
        },
      ],
    });

    const result = await select(client, AUTH_CONTEXT, '66666666-6666-4666-8666-666666666666');

    expect(result).toEqual({
      scheduleId: '77777777-7777-4777-8777-777777777777',
      selectedVersionId: '66666666-6666-4666-8666-666666666666',
    });
    expect(updateSpies.schedules).toHaveBeenCalledWith({
      selected_version_id: '66666666-6666-4666-8666-666666666666',
    });
    expect(updateSpies.schedule_versions).not.toHaveBeenCalled();
    expect(updateSpies.schedule_evaluations).toBeUndefined();
  });
});
