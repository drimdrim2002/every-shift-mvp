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
  refreshPreferenceResolutionByVersion: vi.fn(),
  solvePhase2ScheduleVersion: vi.fn(),
  submitPhase2ScheduleVersionSolverResult: vi.fn(),
}));

import { useAISolver } from '@/composables/useAISolver';
import {
  createSolverExecution,
  getSolverStatus,
  mapApiStatusToAppStatus,
  parseSolverResult,
} from '@/api/solver';
import {
  refreshPreferenceResolutionByVersion,
  solvePhase2ScheduleVersion,
  submitPhase2ScheduleVersionSolverResult,
} from '@/api/schedule';
import type { SolverRequest, SolverStatusResponse } from '@/types/schedule';

async function flushPromises(times = 4) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

function createSolverRequest(): SolverRequest {
  return {
    organization: {
      id: 'org-1',
      name: '테스트병원',
      type: 'hospital',
      shifts: [],
      lastHistoricalDate: '2025-11-26',
      firstDraftDate: '2025-12-01',
      publishLength: 4,
      draftLength: 31,
    },
    employees: [],
    history: [],
    undesirable: [],
    requirements: [],
  };
}

function createCompletedStatusResponse(executionId: string): SolverStatusResponse {
  return {
    execution_id: executionId,
    status: 'COMPLETED',
    result: {
      availabilityList: [],
      employeeList: [],
      shiftList: [],
      score: {
        hard_score: 10,
        soft_score: 20,
      },
      scheduleState: {},
    },
    score: {
      hard_score: 10,
      soft_score: 20,
    },
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
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

  it('propagates another_version_solving from startSolver instead of swallowing it', async () => {
    vi.mocked(createSolverExecution).mockResolvedValue('exec-1');
    vi.mocked(solvePhase2ScheduleVersion).mockRejectedValue({
      code: 'another_version_solving',
      message: 'another_version_solving',
      status: 409,
    });

    const solver = useAISolver();

    await expect(
      solver.startSolver('version-1', createSolverRequest())
    ).rejects.toMatchObject({
      code: 'another_version_solving',
      status: 409,
    });

    expect(solvePhase2ScheduleVersion).toHaveBeenCalledWith('version-1', {
      solverExecutionId: 'exec-1',
    });
    expect(solver.status.value).toBe('error');
    expect(solver.executionIdRef.value).toBeNull();
  });

  it('does not move to complete when final callback is rejected as stale', async () => {
    vi.mocked(getSolverStatus).mockResolvedValue(createCompletedStatusResponse('exec-stale'));
    vi.mocked(mapApiStatusToAppStatus).mockReturnValue('complete');
    vi.mocked(parseSolverResult).mockReturnValue({
      'emp-1': { '2025-12-01': 'shift-d' },
    });
    vi.mocked(submitPhase2ScheduleVersionSolverResult).mockRejectedValue({
      code: 'stale_solver_callback',
      message: 'stale_solver_callback',
      status: 409,
    });

    const solver = useAISolver();
    solver.status.value = 'running';
    solver.startPolling('exec-stale', 'version-2');

    await vi.advanceTimersByTimeAsync(10000);
    await flushPromises();

    expect(solver.status.value).toBe('created');
    expect(refreshPreferenceResolutionByVersion).not.toHaveBeenCalled();
  });

  it('final commit writes through guarded RPC with final execution metadata', async () => {
    vi.mocked(getSolverStatus).mockResolvedValue(createCompletedStatusResponse('exec-final'));
    vi.mocked(mapApiStatusToAppStatus).mockReturnValue('complete');
    vi.mocked(parseSolverResult).mockReturnValue({
      'emp-1': { '2025-12-01': 'shift-d' },
    });
    vi.mocked(submitPhase2ScheduleVersionSolverResult).mockResolvedValue({
      scheduleVersionId: 'version-3',
      status: 'review_ready',
      solverExecutionId: null,
      hardScore: 10,
      softScore: 20,
      failureReason: null,
    });
    vi.mocked(refreshPreferenceResolutionByVersion).mockResolvedValue([]);

    const solver = useAISolver();
    solver.status.value = 'running';
    solver.startPolling('exec-final', 'version-3');

    await vi.advanceTimersByTimeAsync(10000);
    await flushPromises();

    expect(submitPhase2ScheduleVersionSolverResult).toHaveBeenCalledWith('version-3', {
      status: 'completed',
      solverExecutionId: 'exec-final',
      assignments: [
        {
          employeeId: 'emp-1',
          date: '2025-12-01',
          shiftId: 'shift-d',
          isLocked: false,
          comment: null,
          offReason: null,
        },
      ],
      score: {
        hardScore: 10,
        softScore: 20,
      },
      failureReason: null,
      failureType: null,
      failureContext: null,
    });
    expect(refreshPreferenceResolutionByVersion).toHaveBeenCalledWith('version-3');
    expect(solver.status.value).toBe('complete');
    expect(solver.progress.value).toBe(100);
  });

  it('does not start a second polling request while the previous status check is still pending', async () => {
    const pendingStatus = createDeferred<SolverStatusResponse>();
    vi.mocked(getSolverStatus).mockReturnValue(pendingStatus.promise);
    vi.mocked(mapApiStatusToAppStatus).mockReturnValue('complete');
    vi.mocked(parseSolverResult).mockReturnValue({
      'emp-1': { '2025-12-01': 'shift-d' },
    });
    vi.mocked(submitPhase2ScheduleVersionSolverResult).mockResolvedValue({
      scheduleVersionId: 'version-6',
      status: 'review_ready',
      solverExecutionId: null,
      hardScore: 10,
      softScore: 20,
      failureReason: null,
    });
    vi.mocked(refreshPreferenceResolutionByVersion).mockResolvedValue([]);

    const solver = useAISolver();
    solver.status.value = 'running';
    solver.startPolling('exec-slow-complete', 'version-6');

    await vi.advanceTimersByTimeAsync(10000);
    await flushPromises();
    expect(getSolverStatus).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(10000);
    await flushPromises();
    expect(getSolverStatus).toHaveBeenCalledTimes(1);

    pendingStatus.resolve(createCompletedStatusResponse('exec-slow-complete'));
    await flushPromises();

    expect(submitPhase2ScheduleVersionSolverResult).toHaveBeenCalledTimes(1);
  });

  it('stops running and marks failure after repeated polling errors', async () => {
    vi.mocked(getSolverStatus).mockRejectedValue(new Error('network timeout'));
    vi.mocked(submitPhase2ScheduleVersionSolverResult).mockResolvedValue({
      scheduleVersionId: 'version-4',
      status: 'solve_failed',
      solverExecutionId: null,
      hardScore: null,
      softScore: null,
      failureReason: 'polling_status_unreachable',
    });

    const solver = useAISolver();
    solver.status.value = 'running';
    solver.startPolling('exec-network-fail', 'version-4');

    await vi.advanceTimersByTimeAsync(30000);
    await flushPromises();

    expect(solver.status.value).toBe('error');
    expect(solver.error.value).toBe('AI Solver 상태 조회가 반복 실패하여 실행을 중단했습니다. 다시 시도해주세요.');
    expect(submitPhase2ScheduleVersionSolverResult).toHaveBeenCalledWith('version-4', {
      status: 'failed',
      solverExecutionId: 'exec-network-fail',
      assignments: [],
      score: null,
      failureReason: 'polling_status_unreachable',
      failureType: 'polling_unreachable',
      failureContext: null,
    });
  });

  it('preserves solver failure reason, type, and context for the failure panel', async () => {
    vi.mocked(getSolverStatus).mockResolvedValue({
      execution_id: 'exec-fail',
      status: 'FAILED',
      error_message: 'solver crashed',
      failure_type: 'worker_crash',
      failure_context: {
        traceId: 'trace-123',
        workerId: 'worker-9',
      },
      score: null,
      result: null,
    });
    vi.mocked(mapApiStatusToAppStatus).mockReturnValue('error');
    vi.mocked(submitPhase2ScheduleVersionSolverResult).mockResolvedValue({
      scheduleVersionId: 'version-5',
      status: 'solve_failed',
      solverExecutionId: null,
      hardScore: null,
      softScore: null,
      failureReason: 'solver crashed',
    });

    const solver = useAISolver();
    solver.status.value = 'running';
    solver.startPolling('exec-fail', 'version-5');

    await vi.advanceTimersByTimeAsync(10000);
    await flushPromises();

    expect(submitPhase2ScheduleVersionSolverResult).toHaveBeenCalledWith('version-5', {
      status: 'failed',
      solverExecutionId: 'exec-fail',
      assignments: [],
      score: null,
      failureReason: 'solver crashed',
      failureType: 'worker_crash',
      failureContext: {
        traceId: 'trace-123',
        workerId: 'worker-9',
      },
    });
  });
});
