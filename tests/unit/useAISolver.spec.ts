import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue');
  return {
    ...actual,
    onUnmounted: vi.fn(),
  };
});

vi.mock('@/api/solver', () => ({
  createSolverExecution: vi.fn(),
  getSolverStatus: vi.fn(),
  parseSolverResult: vi.fn(),
  mapApiStatusToAppStatus: vi.fn(),
}));

vi.mock('@/api/schedule', () => ({
  markPhase2ScheduleVersionSolving: vi.fn(),
  syncPhase2ScheduleVersionSolverResult: vi.fn(),
}));

import { useAISolver } from '@/composables/useAISolver';
import {
  createSolverExecution,
  getSolverStatus,
  mapApiStatusToAppStatus,
  parseSolverResult,
} from '@/api/solver';
import {
  markPhase2ScheduleVersionSolving,
  syncPhase2ScheduleVersionSolverResult,
} from '@/api/schedule';
import type { SolverRequest, SolverStatusResponse } from '@/types/schedule';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flushPromises(times = 4) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

function createCompletedStatusResponse(executionId: string): SolverStatusResponse {
  return {
    execution_id: executionId,
    status: 'COMPLETED',
    score: {
      hard_score: 0,
      soft_score: 0,
    },
    result: {
      availabilityList: [],
      employeeList: [],
      shiftList: [],
      score: {
        hard_score: 0,
        soft_score: 0,
      },
      scheduleState: {},
    },
  };
}

function createSolverRequest(): SolverRequest {
  return {
    organization: {
      id: 'org-1',
      name: 'Hospital',
      type: 'hospital',
      shifts: [],
      lastHistoricalDate: '2025-11-30',
      firstDraftDate: '2025-12-01',
      publishLength: 5,
      draftLength: 31,
    },
    employees: [],
    history: [],
    undesirable: [],
    requirements: [],
  };
}

describe('useAISolver', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('marks the target version solving immediately after creating the solver execution', async () => {
    const callOrder: string[] = [];
    vi.mocked(createSolverExecution).mockImplementation(async () => {
      callOrder.push('solver-execution-created');
      return 'exec-1';
    });
    vi.mocked(markPhase2ScheduleVersionSolving).mockImplementation(async () => {
      callOrder.push('version-solving');
      return {
        scheduleVersionId: 'version-2',
        status: 'solving',
        solverExecutionId: 'exec-1',
      };
    });

    const solver = useAISolver();
    const executionId = await solver.startSolver({
      versionId: 'version-2',
      month: '2025-12',
      solverRequest: createSolverRequest(),
    });

    expect(executionId).toBe('exec-1');
    expect(markPhase2ScheduleVersionSolving).toHaveBeenCalledWith('version-2', {
      solverExecutionId: 'exec-1',
    });
    expect(callOrder).toEqual(['solver-execution-created', 'version-solving']);
    expect(solver.status.value).toBe('running');
  });

  it('keeps local state fail-closed when solve-start returns another_version_solving', async () => {
    vi.mocked(createSolverExecution).mockResolvedValue('exec-conflict');
    vi.mocked(markPhase2ScheduleVersionSolving).mockRejectedValue(
      Object.assign(new Error('Another version is already solving for this schedule'), {
        code: 'another_version_solving',
        status: 409,
      })
    );

    const solver = useAISolver();
    const executionId = await solver.startSolver({
      versionId: 'version-2',
      month: '2025-12',
      solverRequest: createSolverRequest(),
    });

    expect(executionId).toBeNull();
    expect(solver.status.value).toBe('error');
    expect(solver.error.value).toBe('이미 다른 버전이 생성 중입니다. 완료 후 다시 시도해주세요.');
  });

  it('sets complete only after backend solver-result sync finishes', async () => {
    const syncDeferred = createDeferred<{
      scheduleVersionId: string;
      status: 'review_pending';
      solverExecutionId: null;
      hardScore: number;
      softScore: number;
      failureReason: null;
    }>();
    vi.mocked(getSolverStatus).mockResolvedValue(createCompletedStatusResponse('exec-1'));
    vi.mocked(mapApiStatusToAppStatus).mockReturnValue('complete');
    vi.mocked(parseSolverResult).mockReturnValue({
      'emp-1': { '2025-12-01': 'shift-1' },
    });
    vi.mocked(syncPhase2ScheduleVersionSolverResult).mockReturnValue(syncDeferred.promise);

    const solver = useAISolver();
    solver.status.value = 'running';
    solver.startPolling('exec-1', {
      versionId: 'version-2',
      month: '2025-12',
    });

    vi.advanceTimersByTime(10000);
    await flushPromises();

    expect(getSolverStatus).toHaveBeenCalledTimes(1);
    expect(solver.status.value).toBe('running');

    syncDeferred.resolve({
      scheduleVersionId: 'version-2',
      status: 'review_pending',
      solverExecutionId: null,
      hardScore: 0,
      softScore: 0,
      failureReason: null,
    });
    for (let i = 0; i < 20 && solver.status.value !== 'complete'; i++) {
      await flushPromises(1);
    }

    expect(syncPhase2ScheduleVersionSolverResult).toHaveBeenCalledWith('version-2', {
      status: 'completed',
      solverExecutionId: 'exec-1',
      assignments: [
        {
          employeeId: 'emp-1',
          date: '2025-12-01',
          shiftId: 'shift-1',
          isLocked: false,
        },
      ],
      score: {
        hardScore: 0,
        softScore: 0,
      },
    });
    expect(solver.status.value).toBe('complete');
    expect(solver.progress.value).toBe(100);
  });

  it('marks only the target version solve_failed before surfacing the error locally', async () => {
    const callOrder: string[] = [];
    vi.mocked(getSolverStatus).mockResolvedValue({
      execution_id: 'exec-2',
      status: 'FAILED',
      error_message: 'solver timeout',
    });
    vi.mocked(mapApiStatusToAppStatus).mockReturnValue('error');
    vi.mocked(syncPhase2ScheduleVersionSolverResult).mockImplementation(async () => {
      callOrder.push('version-failed');
      return {
        scheduleVersionId: 'version-2',
        status: 'solve_failed',
        solverExecutionId: null,
        hardScore: null,
        softScore: null,
        failureReason: 'solver timeout',
      };
    });

    const solver = useAISolver();
    solver.status.value = 'running';
    solver.startPolling('exec-2', {
      versionId: 'version-2',
      month: '2025-12',
    });

    await vi.advanceTimersByTimeAsync(10000);
    await flushPromises();

    expect(callOrder).toEqual(['version-failed']);
    expect(syncPhase2ScheduleVersionSolverResult).toHaveBeenCalledWith('version-2', {
      status: 'failed',
      solverExecutionId: 'exec-2',
      failureReason: 'solver timeout',
    });
    expect(solver.status.value).toBe('error');
  });

  it.each(['solver_execution_mismatch', 'stale_solver_callback'])(
    'stops local polling without mutating the legacy mirror when solver-result sync returns %s',
    async (code) => {
      vi.mocked(getSolverStatus).mockResolvedValue(createCompletedStatusResponse('exec-3'));
      vi.mocked(mapApiStatusToAppStatus).mockReturnValue('complete');
      vi.mocked(parseSolverResult).mockReturnValue({
        'emp-1': { '2025-12-01': 'shift-1' },
      });
      vi.mocked(syncPhase2ScheduleVersionSolverResult).mockRejectedValue(
        Object.assign(new Error(code), {
          code,
          status: 409,
        })
      );

      const solver = useAISolver();
      solver.status.value = 'running';
      solver.startPolling('exec-3', {
        versionId: 'version-3',
        month: '2025-12',
      });

      await vi.advanceTimersByTimeAsync(10000);
      await flushPromises();

      expect(solver.status.value).toBe('error');
      expect(solver.error.value).toContain('다른 세션');
    }
  );
});
