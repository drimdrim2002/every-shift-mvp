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
});
