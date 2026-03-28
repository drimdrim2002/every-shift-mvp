import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.fn();
const supabaseFromMock = vi.fn();

vi.mock('@/api/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
    from: supabaseFromMock,
  },
}));

describe('phase2 schedule api helpers', () => {
  const fetchMock = vi.fn();

  function createPreferenceQueryMocks(
    rows: unknown[],
    options?: {
      scheduleVersionRow?: { schedule_id: string } | null;
      scheduleVersionError?: { message: string };
    }
  ) {
    const range = vi.fn().mockResolvedValue({ data: rows, error: null });
    const order = vi.fn();
    const eq = vi.fn();
    const select = vi.fn();
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const deleteRows = vi.fn();
    const insert = vi.fn().mockResolvedValue({ error: null });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: options?.scheduleVersionRow ?? null,
      error: options?.scheduleVersionError ?? null,
    });
    const versionEq = vi.fn().mockReturnValue({ maybeSingle });
    const versionSelect = vi.fn().mockReturnValue({ eq: versionEq });

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

      if (table === 'schedule_versions') {
        return {
          select: versionSelect,
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
      versionSelect,
      versionEq,
      maybeSingle,
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

    const queryMocks = createPreferenceQueryMocks([], {
      scheduleVersionRow: { schedule_id: 'schedule-2' },
    });

    const { saveScheduleVersionPreferences } = await import('@/api/schedule');

    await saveScheduleVersionPreferences(
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
    expect(queryMocks.versionEq).toHaveBeenCalledWith('id', 'version-2');
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
      },
    ]);
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
      },
    ]);
  });

  it('throws a specific error when version ownership lookup fails', async () => {
    createPreferenceQueryMocks([], {
      scheduleVersionError: { message: 'lookup failed' },
    });

    const { saveScheduleVersionPreferences } = await import('@/api/schedule');

    await expect(
      saveScheduleVersionPreferences('version-lookup-fail', {
        employee_1: {
          '2026-04-01': 'O',
        },
      })
    ).rejects.toThrow('버전 소유 schedule 조회 실패: lookup failed');
  });

  it('throws a specific error when version ownership is missing', async () => {
    createPreferenceQueryMocks([], {
      scheduleVersionRow: null,
    });

    const { saveScheduleVersionPreferences } = await import('@/api/schedule');

    await expect(
      saveScheduleVersionPreferences('version-missing-owner', {
        employee_1: {
          '2026-04-01': 'O',
        },
      })
    ).rejects.toThrow('버전 소유 schedule을 찾을 수 없습니다.');
  });
});
