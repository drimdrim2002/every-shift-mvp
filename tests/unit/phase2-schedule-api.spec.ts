import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.fn();
const refreshSessionMock = vi.fn();
const supabaseFromMock = vi.fn();
const supabaseRpcMock = vi.fn();

vi.mock('@/api/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      refreshSession: refreshSessionMock,
    },
    from: supabaseFromMock,
    rpc: supabaseRpcMock,
  },
}));

describe('phase2 schedule api helpers', () => {
  const fetchMock = vi.fn();

  function createPreferenceQueryMocks(rows: unknown[]) {
    const range = vi.fn().mockResolvedValue({ data: rows, error: null });
    const order = vi.fn();
    const eq = vi.fn();
    const select = vi.fn();
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const deleteRows = vi.fn();
    const insert = vi.fn().mockResolvedValue({ error: null });

    order.mockReturnValue({ order, range });
    eq.mockReturnValue({ order, range });
    select.mockReturnValue({ eq, order, range });
    deleteRows.mockReturnValue({ eq: deleteEq });

    supabaseFromMock.mockImplementation((table: string) => {
      if (table === 'schedule_preferences') {
        return {
          select,
          delete: deleteRows,
          insert,
        };
      }

      if (table !== 'schedule_preferences') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select,
        delete: deleteRows,
        insert,
      };
    });

    return {
      select,
      eq,
      order,
      range,
      deleteRows,
      deleteEq,
      insert,
    };
  }

  function createAssignmentQueryMocks(rows: unknown[]) {
    const range = vi.fn().mockResolvedValue({ data: rows, error: null });
    const eq = vi.fn().mockReturnValue({ range });
    const select = vi.fn().mockReturnValue({ eq, range });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const scheduleEq = vi.fn().mockResolvedValue({ error: null });
    const scheduleUpdate = vi.fn().mockReturnValue({ eq: scheduleEq });

    supabaseFromMock.mockImplementation((table: string) => {
      if (table === 'schedule_assignments') {
        return {
          select,
          upsert,
        };
      }

      if (table === 'schedules') {
        return {
          update: scheduleUpdate,
        };
      }

      if (table !== 'schedule_assignments') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select,
        upsert,
      };
    });

    return {
      select,
      eq,
      range,
      upsert,
      scheduleUpdate,
      scheduleEq,
    };
  }

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
  });

  it('sends session auth headers when calling ensure', async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-123',
        },
      },
      error: null,
    });
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          scheduleId: 'schedule-1',
          selectedVersionId: 'version-1',
          finalizedVersionId: null,
          activeSolvingVersionId: null,
          versions: [],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const { ensurePhase2Schedule } = await import('@/api/schedule');
    await ensurePhase2Schedule({
      organizationId: '11111111-1111-4111-8111-111111111111',
      month: '2026-04',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/phase2-schedule/schedules/ensure',
      expect.objectContaining({
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: expect.objectContaining({
          apikey: 'anon-key',
          Authorization: 'Bearer token-123',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          organizationId: '11111111-1111-4111-8111-111111111111',
          month: '2026-04',
        }),
      })
    );
  });

  it('fails fast when there is no authenticated session token', async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: null,
      },
      error: null,
    });

    const { getPhase2ScheduleCompare } = await import('@/api/schedule');

    await expect(
      getPhase2ScheduleCompare('22222222-2222-4222-8222-222222222222')
    ).rejects.toThrow('Authenticated session is required to call phase2-schedule');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refreshes the session and retries once when the server reports missing organization context', async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'stale-token-123',
        },
      },
      error: null,
    });
    refreshSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'fresh-token-456',
        },
      },
      error: null,
    });
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 'organization_context_missing',
            message: 'Authenticated user is missing a valid organization_id claim',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )
      .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          scheduleId: 'schedule-1',
          selectedVersionId: 'version-1',
          finalizedVersionId: null,
          activeSolvingVersionId: null,
          versions: [],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
      );

    const { ensurePhase2Schedule } = await import('@/api/schedule');
    await ensurePhase2Schedule({
      organizationId: '22222222-2222-4222-8222-222222222222',
      month: '2026-04',
    });

    expect(refreshSessionMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://example.supabase.co/functions/v1/phase2-schedule/schedules/ensure',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer stale-token-123',
        }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://example.supabase.co/functions/v1/phase2-schedule/schedules/ensure',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fresh-token-456',
        }),
      })
    );
  });

  it('surfaces a clear error when organization context is still missing after one retry', async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'stale-token-123',
        },
      },
      error: null,
    });
    refreshSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'fresh-token-456',
        },
      },
      error: null,
    });
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 'organization_context_missing',
            message: 'Authenticated user is missing a valid organization_id claim',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 'organization_context_missing',
            message: 'Authenticated user is missing a valid organization_id claim',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

    const { ensurePhase2Schedule } = await import('@/api/schedule');

    await expect(
      ensurePhase2Schedule({
        organizationId: '22222222-2222-4222-8222-222222222222',
        month: '2026-04',
      })
    ).rejects.toMatchObject({
      message:
        '로그인 세션에 조직 정보가 없습니다. 다시 로그인한 뒤 다시 시도해주세요.',
      code: 'organization_context_missing',
      status: 403,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('refreshes the session and retries once on unauthorized responses', async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'stale-token-123',
        },
      },
      error: null,
    });
    refreshSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'fresh-token-456',
        },
      },
      error: null,
    });
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'unauthorized', message: 'Authorization required' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            scheduleId: 'schedule-1',
            selectedVersionId: 'version-1',
            finalizedVersionId: null,
            activeSolvingVersionId: null,
            versions: [],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

    const { ensurePhase2Schedule } = await import('@/api/schedule');
    await ensurePhase2Schedule({
      organizationId: '22222222-2222-4222-8222-222222222222',
      month: '2026-04',
    });

    expect(refreshSessionMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('unwraps error envelopes from non-2xx responses', async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-456',
        },
      },
      error: null,
    });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ code: 'already_finalized', message: 'Already finalized' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { selectPhase2ScheduleVersion } = await import('@/api/schedule');

    await expect(
      selectPhase2ScheduleVersion('33333333-3333-4333-8333-333333333333')
    ).rejects.toMatchObject({
      message: 'Already finalized',
      code: 'already_finalized',
      status: 409,
    });
  });

  it('uses GET for read helpers and does not send a mutation body', async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-789',
        },
      },
      error: null,
    });
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          scheduleId: 'schedule-2',
          selectedVersionId: 'version-2',
          finalizedVersionId: null,
          activeSolvingVersionId: null,
          versions: [],
          version: {
            id: 'version-2',
            scheduleId: 'schedule-2',
            versionNo: 2,
            name: 'V2',
            sourceType: 're_solve',
            baseVersionId: 'version-1',
            status: 'draft',
            currentRevision: 0,
            manualEditCount: 0,
            inputDiffSummary: {
              changedOffRequests: 0,
              changedLockedAssignments: 0,
              changedSiteRequirements: 0,
              note: null,
            },
            latestEvaluationId: null,
            latestEvaluationResultStatus: null,
            comparisonMetrics: null,
            finalizationGate: null,
            isSelected: true,
            isFinalized: false,
          },
          latestEvaluation: null,
          primaryAction: {
            kind: 'none',
            targetVersionId: null,
            label: 'No primary action',
            disabledReason: null,
          },
          defaultTab: 'grid',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const { getPhase2ScheduleReview } = await import('@/api/schedule');
    await getPhase2ScheduleReview('44444444-4444-4444-8444-444444444444');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/phase2-schedule/schedule-versions/44444444-4444-4444-8444-444444444444/review',
      expect.objectContaining({
        method: 'GET',
      })
    );
    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty('body');
  });

  it('provides a deployment/cors hint when fetch fails before receiving an HTTP response', async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-network',
        },
      },
      error: null,
    });
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const { ensurePhase2Schedule } = await import('@/api/schedule');

    await expect(
      ensurePhase2Schedule({
        organizationId: '11111111-1111-4111-8111-111111111111',
        month: '2026-04',
      })
    ).rejects.toThrow('phase2-schedule 호출 실패 (네트워크/CORS 또는 배포 wiring 확인 필요)');
  });

  it('reads version-scoped preferences by schedule_version_id', async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-abc',
        },
      },
      error: null,
    });

    const queryMocks = createPreferenceQueryMocks([
      {
        id: 'pref-1',
        schedule_id: 'schedule-legacy',
        schedule_version_id: 'version-1',
        employee_id: 'employee-1',
        date: '2026-04-01',
        request_code: 'O',
        request_note: 'night shift',
        is_soft: true,
        resolution_status: 'pending',
        resolved_shift_id: null,
        resolved_at: null,
      },
      {
        id: 'pref-2',
        schedule_id: 'schedule-legacy',
        schedule_version_id: 'version-1',
        employee_id: 'employee-1',
        date: '2026-04-02',
        request_code: 'H',
        request_note: null,
        is_soft: true,
        resolution_status: 'pending',
        resolved_shift_id: null,
        resolved_at: null,
      },
    ]);

    const { getScheduleVersionPreferences } = await import('@/api/schedule');

    const result = await getScheduleVersionPreferences('version-1');

    expect(queryMocks.eq).toHaveBeenCalledWith('schedule_version_id', 'version-1');
    expect(result.constraints).toEqual({
      'employee-1': {
        '2026-04-01': 'O',
        '2026-04-02': 'O',
      },
    });
    expect(result.notes).toEqual({
      'employee-1': {
        '2026-04-01': 'night shift',
      },
    });
    expect(result.preferences).toHaveLength(2);
  });

  it('reads legacy preferences by schedule_id', async () => {
    const queryMocks = createPreferenceQueryMocks([
      {
        id: 'pref-legacy-1',
        schedule_id: 'schedule-legacy',
        schedule_version_id: 'version-legacy',
        employee_id: 'employee-1',
        date: '2026-04-03',
        request_code: 'O',
        request_note: 'legacy note',
        is_soft: true,
        resolution_status: 'pending',
        resolved_shift_id: null,
        resolved_at: null,
      },
    ]);

    const { getSchedulePreferences } = await import('@/api/schedule');

    const result = await getSchedulePreferences('schedule-legacy');

    expect(queryMocks.eq).toHaveBeenCalledWith('schedule_id', 'schedule-legacy');
    expect(result.constraints).toEqual({
      'employee-1': {
        '2026-04-03': 'O',
      },
    });
    expect(result.notes).toEqual({
      'employee-1': {
        '2026-04-03': 'legacy note',
      },
    });
    expect(result.preferences).toHaveLength(1);
  });

  it('saves version-scoped preferences by schedule_version_id', async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-def',
        },
      },
      error: null,
    });

    const queryMocks = createPreferenceQueryMocks([]);

    const { saveScheduleVersionPreferences } = await import('@/api/schedule');

    await saveScheduleVersionPreferences(
      'schedule-2',
      'version-2',
      {
        employee_1: {
          '2026-04-01': 'O',
        },
      },
      {
        employee_1: {
          '2026-04-01': 'personal note',
        },
      }
    );

    expect(queryMocks.deleteEq).toHaveBeenCalledWith('schedule_version_id', 'version-2');
    expect(queryMocks.insert).toHaveBeenCalledWith([
      {
        schedule_id: 'schedule-2',
        schedule_version_id: 'version-2',
        employee_id: 'employee_1',
        date: '2026-04-01',
        request_code: 'O',
        request_note: 'personal note',
        is_soft: true,
        resolution_status: 'pending',
        resolved_shift_id: null,
        resolved_at: null,
        policy_check_status: null,
        policy_rejection_reason: null,
      },
    ]);
    expect(
      supabaseFromMock.mock.calls.some((call) => call[0] === 'schedule_versions')
    ).toBe(false);
  });

  it('saves legacy preferences by schedule_id', async () => {
    const queryMocks = createPreferenceQueryMocks([]);

    const { saveSchedulePreferences } = await import('@/api/schedule');

    await saveSchedulePreferences(
      'schedule-legacy',
      {
        employee_1: {
          '2026-04-01': 'O',
        },
      },
      {
        employee_1: {
          '2026-04-01': 'legacy note',
        },
      }
    );

    expect(queryMocks.deleteEq).toHaveBeenCalledWith('schedule_id', 'schedule-legacy');
    expect(queryMocks.insert).toHaveBeenCalledWith([
      {
        schedule_id: 'schedule-legacy',
        employee_id: 'employee_1',
        date: '2026-04-01',
        request_code: 'O',
        request_note: 'legacy note',
        is_soft: true,
        resolution_status: 'pending',
        resolved_shift_id: null,
        resolved_at: null,
        policy_check_status: null,
        policy_rejection_reason: null,
      },
    ]);
  });

  it('reads version-scoped assignments by schedule_version_id', async () => {
    const queryMocks = createAssignmentQueryMocks([
      {
        employee_id: 'employee-1',
        date: '2026-04-01',
        shifts: { code: 'D' },
        off_reason: null,
        comment: 'memo',
      },
    ]);

    const { getScheduleVersionAssignments } = await import('@/api/schedule');

    const result = await getScheduleVersionAssignments('version-7');

    expect(queryMocks.eq).toHaveBeenCalledWith('schedule_version_id', 'version-7');
    expect(result.assignments).toEqual({
      'employee-1': {
        '2026-04-01': 'D',
      },
    });
    expect(result.comments).toEqual({
      'employee-1': {
        '2026-04-01': 'memo',
      },
    });
  });

  it('updates assignments by schedule_version_id while preserving the container schedule_id', async () => {
    const queryMocks = createAssignmentQueryMocks([]);

    const { updateScheduleVersionAssignment } = await import('@/api/schedule');

    await updateScheduleVersionAssignment(
      'schedule-9',
      'version-9',
      'employee-9',
      '2026-04-09',
      'shift-9',
      'manual'
    );

    expect(queryMocks.upsert).toHaveBeenCalledWith(
      {
        schedule_id: 'schedule-9',
        schedule_version_id: 'version-9',
        employee_id: 'employee-9',
        shift_id: 'shift-9',
        date: '2026-04-09',
        comment: 'manual',
      },
      {
        onConflict: 'schedule_version_id,employee_id,date',
      }
    );
  });

  it('calls create/solve/solver-result mutation routes through phase2-schedule edge function', async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-mutation',
        },
      },
      error: null,
    });

    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            scheduleId: 'schedule-11',
            createdVersionId: 'version-12',
            selectedVersionId: 'version-11',
            finalizedVersionId: null,
            versions: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            scheduleVersionId: 'version-12',
            status: 'solving',
            solverExecutionId: 'exec-12',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            scheduleVersionId: 'version-12',
            status: 'review_pending',
            solverExecutionId: null,
            hardScore: 10,
            softScore: 20,
            failureReason: null,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

    const {
      createPhase2ScheduleVersion,
      solvePhase2ScheduleVersion,
      submitPhase2ScheduleVersionSolverResult,
    } = await import('@/api/schedule');

    await createPhase2ScheduleVersion('schedule-11', {
      baseVersionId: 'version-11',
      name: null,
      sourceType: 're_solve',
      inputDiffSummary: {
        changedOffRequests: 0,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: null,
      },
    });

    await solvePhase2ScheduleVersion('version-12', {
      solverExecutionId: 'exec-12',
    });

    await submitPhase2ScheduleVersionSolverResult('version-12', {
      status: 'completed',
      solverExecutionId: 'exec-12',
      assignments: [],
      score: null,
      failureReason: null,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://example.supabase.co/functions/v1/phase2-schedule/schedules/schedule-11/versions',
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://example.supabase.co/functions/v1/phase2-schedule/schedule-versions/version-12/solve',
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://example.supabase.co/functions/v1/phase2-schedule/schedule-versions/version-12/solver-result',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('sends manual save changes through PATCH assignments route', async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-patch',
        },
      },
      error: null,
    });
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          scheduleVersionId: 'version-11',
          status: 'review_pending',
          currentRevision: 3,
          manualEditCount: 2,
          changedCells: 2,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const { patchPhase2ScheduleVersionAssignments } = await import('@/api/schedule');

    await patchPhase2ScheduleVersionAssignments('version-11', {
      changes: [
        {
          employeeId: 'employee-11',
          date: '2026-04-11',
          shiftId: null,
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/phase2-schedule/schedule-versions/version-11/assignments',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          changes: [
            {
              employeeId: 'employee-11',
              date: '2026-04-11',
              shiftId: null,
            },
          ],
        }),
      })
    );
  });

  it('calls trust-gate mutation routes for recheck and finalize', async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-trust-gate',
        },
      },
      error: null,
    });
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            scheduleVersionId: 'version-22',
            currentRevision: 3,
            evaluationId: 'evaluation-22',
            resultStatus: 'review_ready',
            evaluationResultStatus: 'passed',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            scheduleId: 'schedule-22',
            scheduleVersionId: 'version-22',
            status: 'finalized',
            finalizedVersionId: 'version-22',
            finalizedAt: '2026-04-01T10:00:00Z',
            finalizedBy: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

    const { recheckPhase2ScheduleVersion, finalizePhase2ScheduleVersion } = await import('@/api/schedule');
    await recheckPhase2ScheduleVersion('version-22');
    await finalizePhase2ScheduleVersion('version-22');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://example.supabase.co/functions/v1/phase2-schedule/schedule-versions/version-22/recheck',
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://example.supabase.co/functions/v1/phase2-schedule/schedule-versions/version-22/finalize',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('calls the reset-roster mutation route through phase2-schedule edge function', async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-reset-roster',
        },
      },
      error: null,
    });
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          deletedScheduleId: 'schedule-33',
          employeeCount: 2,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const { resetPhase2ScheduleRoster } = await import('@/api/schedule');

    await resetPhase2ScheduleRoster({
      organizationId: '33333333-3333-4333-8333-333333333333',
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

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/phase2-schedule/schedules/reset-roster',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          organizationId: '33333333-3333-4333-8333-333333333333',
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
        }),
      })
    );
  });
});
