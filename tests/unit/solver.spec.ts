import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSolverExecution,
  getSolverStatus,
  mapApiStatusToAppStatus,
  parseSolverResult,
} from '@/api/solver';
import type { SolverRequest, SolverResult, SolverStatusResponse } from '@/types/schedule';

function createSolverRequest(): SolverRequest {
  return {
    organization: {
      id: 'org-1',
      name: '테스트병원',
      type: 'hospital',
      shifts: [
        {
          id: 'shift-d',
          code: 'D',
          name: 'Day',
          start_time: '08:00:00',
          end_time: '16:00:00',
        },
      ],
      lastHistoricalDate: '2025-11-26',
      firstDraftDate: '2025-12-01',
      publishLength: 4,
      draftLength: 31,
    },
    employees: [
      {
        employee_id: 'emp-1',
        name: '직원1',
        available_shifts: ['D', 'E', 'N', 'O'],
        skill_set: ['ALL'],
      },
    ],
    history: [],
    undesirable: [],
    requirements: [
      {
        shiftId: 'shift-d',
        dayIndex: 0,
        employeeCount: 3,
      },
    ],
  };
}

function createSolverStatus(status: SolverStatusResponse['status']): SolverStatusResponse {
  return {
    execution_id: 'exec-1',
    status,
    score: {
      hard_score: 0,
      soft_score: -5,
    },
  };
}

function createSolverResult(): SolverResult {
  return {
    availabilityList: [],
    employeeList: [],
    shiftList: [
      {
        id: 1,
        start: '2025-12-01T08:00:00',
        end: '2025-12-01T16:00:00',
        employee: {
          id: 'emp-1',
          name: '직원1',
          skillSet: ['ALL'],
          availableShift: ['D', 'E', 'N', 'O'],
        },
        pinned: false,
        supabaseId: 'shift-d',
      },
      {
        id: 2,
        start: '2025-12-02T16:00:00',
        end: '2025-12-03T00:00:00',
        employee: {
          id: 'emp-2',
          name: '직원2',
          skillSet: ['ALL'],
          availableShift: ['D', 'E', 'N', 'O'],
        },
        pinned: false,
        supabaseId: 'shift-e',
      },
      // Invalid item should be ignored by parser.
      {
        id: 3,
        start: '',
        end: '2025-12-03T08:00:00',
        employee: {
          id: 'emp-3',
          name: '직원3',
          skillSet: ['ALL'],
          availableShift: ['D', 'E', 'N', 'O'],
        },
        pinned: false,
        supabaseId: 'shift-n',
      },
    ],
    score: {
      hard_score: 0,
      soft_score: -10,
    },
    scheduleState: {},
  };
}

describe('solver api', () => {
  const directApiEnv = {
    DEV: true,
    VITE_API_BASE_URL: 'https://every-shift-api-service-554455861916.asia-northeast3.run.app',
  };
  const noFallbackEnv = {
    DEV: false,
    VITE_API_BASE_URL: 'https://every-shift-api-service-554455861916.asia-northeast3.run.app',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createSolverExecution', () => {
    it('returns execution id on success', async () => {
      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ execution_id: 'exec-123' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );

      const executionId = await createSolverExecution(createSolverRequest(), directApiEnv);

      expect(executionId).toBe('exec-123');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0]!;
      expect(url).toBe('https://every-shift-api-service-554455861916.asia-northeast3.run.app/api/solve');
      expect(init).toMatchObject({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('preserves code/message/status for non-2xx json responses', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'another_version_solving', message: 'validation failed' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await expect(createSolverExecution(createSolverRequest(), directApiEnv)).rejects.toMatchObject({
        message: 'validation failed',
        code: 'another_version_solving',
        status: 409,
      });
    });

    it('throws a fallback error message when non-json text is returned', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Bad Gateway', { status: 502, statusText: 'Bad Gateway' }),
      );

      await expect(createSolverExecution(createSolverRequest(), directApiEnv)).rejects.toMatchObject({
        message: 'Solver 요청 실패: 502 Bad Gateway - Bad Gateway',
        status: 502,
      });
    });

    it('retries with vite proxy path when direct request fails in development mode', async () => {
      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ execution_id: 'exec-proxy' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );

      const executionId = await createSolverExecution(createSolverRequest(), directApiEnv);

      expect(executionId).toBe('exec-proxy');
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const [directUrl] = fetchMock.mock.calls[0]!;
      const [proxyUrl] = fetchMock.mock.calls[1]!;
      expect(directUrl).toBe('https://every-shift-api-service-554455861916.asia-northeast3.run.app/api/solve');
      expect(proxyUrl).toBe('/api/solve');
    });

    it('retries with alternate proxy path when primary proxy path returns 404', async () => {
      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(new Response('Not Found', { status: 404, statusText: 'Not Found' }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ execution_id: 'exec-alt-proxy' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );

      const executionId = await createSolverExecution(createSolverRequest(), directApiEnv);

      expect(executionId).toBe('exec-alt-proxy');
      expect(fetchMock).toHaveBeenCalledTimes(3);
      const [directUrl] = fetchMock.mock.calls[0]!;
      const [primaryProxyUrl] = fetchMock.mock.calls[1]!;
      const [alternateProxyUrl] = fetchMock.mock.calls[2]!;
      expect(directUrl).toBe('https://every-shift-api-service-554455861916.asia-northeast3.run.app/api/solve');
      expect(primaryProxyUrl).toBe('/api/solve');
      expect(alternateProxyUrl).toBe('/solve');
    });

    it('throws a solver api error with diagnostics when fetch fails before response', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(createSolverExecution(createSolverRequest(), noFallbackEnv)).rejects.toMatchObject({
        name: 'SolverApiError',
        message: expect.stringContaining('Solver API 호출 실패 (네트워크/CORS 또는 배포 URL 확인 필요)'),
      });
    });
  });

  describe('getSolverStatus', () => {
    it('returns status payload on success', async () => {
      const expected = createSolverStatus('RUNNING');
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(expected), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await getSolverStatus('exec-1');
      expect(result).toEqual(expected);
    });

    it('retries with vite proxy path for status polling in development mode', async () => {
      const expected = createSolverStatus('RUNNING');
      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(
          new Response(JSON.stringify(expected), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );

      const result = await getSolverStatus('exec-1', directApiEnv);

      expect(result).toEqual(expected);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const [directUrl] = fetchMock.mock.calls[0]!;
      const [proxyUrl] = fetchMock.mock.calls[1]!;
      expect(directUrl).toBe('https://every-shift-api-service-554455861916.asia-northeast3.run.app/api/status/exec-1');
      expect(proxyUrl).toBe('/api/status/exec-1');
    });

    it('retries status polling with alternate proxy path when primary proxy path returns 404', async () => {
      const expected = createSolverStatus('RUNNING');
      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(new Response('Not Found', { status: 404, statusText: 'Not Found' }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify(expected), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );

      const result = await getSolverStatus('exec-1', directApiEnv);

      expect(result).toEqual(expected);
      expect(fetchMock).toHaveBeenCalledTimes(3);
      const [directUrl] = fetchMock.mock.calls[0]!;
      const [primaryProxyUrl] = fetchMock.mock.calls[1]!;
      const [alternateProxyUrl] = fetchMock.mock.calls[2]!;
      expect(directUrl).toBe('https://every-shift-api-service-554455861916.asia-northeast3.run.app/api/status/exec-1');
      expect(primaryProxyUrl).toBe('/api/status/exec-1');
      expect(alternateProxyUrl).toBe('/status/exec-1');
    });

    it('throws when status endpoint returns non-2xx', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('error', { status: 500 }));

      await expect(getSolverStatus('exec-1')).rejects.toThrow('상태 조회 실패');
    });
  });

  describe('mapApiStatusToAppStatus', () => {
    it('maps api statuses to app statuses', () => {
      expect(mapApiStatusToAppStatus('PENDING')).toBe('running');
      expect(mapApiStatusToAppStatus('RUNNING')).toBe('running');
      expect(mapApiStatusToAppStatus('COMPLETED')).toBe('complete');
      expect(mapApiStatusToAppStatus('FAILED')).toBe('error');
      expect(mapApiStatusToAppStatus('UNKNOWN')).toBe('created');
    });
  });

  describe('parseSolverResult', () => {
    it('parses shift list into assignment map by employee/date', () => {
      const result = parseSolverResult(createSolverResult());

      expect(result).toEqual({
        'emp-1': { '2025-12-01': 'shift-d' },
        'emp-2': { '2025-12-02': 'shift-e' },
      });
    });

    it('returns empty map when result is missing shiftList', () => {
      const empty = parseSolverResult({
        availabilityList: [],
        employeeList: [],
        shiftList: [],
        score: { hard_score: 0, soft_score: 0 },
        scheduleState: {},
      });

      expect(empty).toEqual({});
    });
  });
});
