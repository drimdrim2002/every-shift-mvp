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
import type { AssignmentMap, SolverRequest } from '@/types/schedule';
import { onUnmounted, ref } from 'vue';

type SolverLocalStatus = 'created' | 'running' | 'complete' | 'error' | 'changed';

function toSolverWriteRows(assignments: AssignmentMap) {
  const rows: Array<{
    employeeId: string;
    date: string;
    shiftId: string;
    isLocked: boolean;
    comment: null;
    offReason: null;
  }> = [];

  for (const [employeeId, dateMap] of Object.entries(assignments)) {
    for (const [date, shiftId] of Object.entries(dateMap || {})) {
      if (!shiftId) continue;
      rows.push({
        employeeId,
        date,
        shiftId,
        isLocked: false,
        comment: null,
        offReason: null,
      });
    }
  }

  return rows;
}

function readErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const candidate = error as { code?: unknown; message?: unknown };
  if (typeof candidate.code === 'string' && candidate.code.length > 0) {
    return candidate.code;
  }
  if (typeof candidate.message === 'string' && /^[a-z0-9_]+$/.test(candidate.message)) {
    return candidate.message;
  }
  return null;
}

function isStaleSolverCallbackError(error: unknown): boolean {
  return readErrorCode(error) === 'stale_solver_callback';
}

function toErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : fallbackMessage;
}

export function useAISolver() {
  const status = ref<SolverLocalStatus>('created');
  const hardScore = ref<number>(0);
  const softScore = ref<number>(0);
  const progress = ref<number>(0);
  const error = ref<string | null>(null);
  const executionIdRef = ref<string | null>(null);
  // Intermediate polling result uses shift UUIDs (not shift codes). UI must map before rendering.
  const intermediateResults = ref<AssignmentMap | null>(null);

  const maxPollingAttempts = 120; // 20 minutes (10s * 120)
  let pollingAttempts = 0;
  let pollingInterval: number | null = null;

  async function markSolveFailedIfCurrent(
    scheduleVersionId: string,
    executionId: string,
    score?: { hard_score: number; soft_score: number },
    failureReason?: string | null
  ): Promise<void> {
    try {
      await submitPhase2ScheduleVersionSolverResult(scheduleVersionId, {
        status: 'failed',
        solverExecutionId: executionId,
        assignments: [],
        score: score
          ? {
            hardScore: score.hard_score,
            softScore: score.soft_score,
          }
          : null,
        failureReason: failureReason ?? null,
      });
    } catch (applyError) {
      if (!isStaleSolverCallbackError(applyError)) {
        console.warn('[useAISolver] Failed to mark solve_failed state:', applyError);
      }
    }
  }

  async function startSolver(
    scheduleVersionId: string,
    request: SolverRequest
  ): Promise<string> {
    // Reset state
    status.value = 'running';
    error.value = null;
    progress.value = 0;
    pollingAttempts = 0;
    hardScore.value = 0;
    softScore.value = 0;
    executionIdRef.value = null;
    intermediateResults.value = null;

    try {
      const executionId = await createSolverExecution(request);
      await solvePhase2ScheduleVersion(scheduleVersionId, {
        solverExecutionId: executionId,
      });
      executionIdRef.value = executionId;
      console.log('[useAISolver] Solver started, executionId:', executionId);

      startPolling(executionId, scheduleVersionId);
      return executionId;
    } catch (startError: unknown) {
      console.error('[useAISolver] Failed to start solver:', startError);
      error.value = toErrorMessage(startError, 'Failed to start solver');
      status.value = 'error';
      throw startError;
    }
  }

  function startPolling(executionId: string, scheduleVersionId: string) {
    if (pollingInterval) clearInterval(pollingInterval);
    executionIdRef.value = executionId;
    pollingAttempts = 0;

    pollingInterval = window.setInterval(async () => {
      pollingAttempts++;
      if (pollingAttempts > maxPollingAttempts) {
        stopPolling();
        error.value = 'Timeout: 근무표 생성이 10분을 초과했습니다.';
        status.value = 'error';
        await markSolveFailedIfCurrent(scheduleVersionId, executionId);
        return;
      }

      try {
        const response = await getSolverStatus(executionId);
        const appStatus = mapApiStatusToAppStatus(response.status);

        if (response.score) {
          hardScore.value = response.score.hard_score;
          softScore.value = response.score.soft_score;
        }

        if (appStatus === 'running') {
          status.value = 'running';
          if (progress.value < 90) progress.value += 2;

          if (response.result) {
            const assignments = parseSolverResult(response.result);
            intermediateResults.value = assignments;
          }

          return;
        }

        if (appStatus === 'complete') {
          stopPolling();

          if (!response.result) {
            throw new Error('AI Solver 완료 응답에 결과 데이터가 없습니다.');
          }

          const assignments = parseSolverResult(response.result);
          await submitPhase2ScheduleVersionSolverResult(scheduleVersionId, {
            status: 'completed',
            solverExecutionId: executionId,
            assignments: toSolverWriteRows(assignments),
            score: response.score
              ? {
                hardScore: response.score.hard_score,
                softScore: response.score.soft_score,
              }
              : null,
            failureReason: null,
          });
          await refreshPreferenceResolutionByVersion(scheduleVersionId);

          progress.value = 100;
          status.value = 'complete';
          return;
        }

        if (appStatus === 'error') {
          stopPolling();
          error.value = response.error_message || 'AI Solver 오류';
          status.value = 'error';
          await markSolveFailedIfCurrent(
            scheduleVersionId,
            executionId,
            response.score,
            response.error_message ?? null
          );
          return;
        }

        status.value = appStatus;
      } catch (pollingError) {
        if (isStaleSolverCallbackError(pollingError)) {
          stopPolling();
          status.value = 'created';
          error.value = '최신 버전 상태가 변경되어 이전 실행 결과를 무시했습니다.';
          return;
        }

        console.error('Polling error:', pollingError);
        // Network/transient failures are retried by the next interval tick.
      }
    }, 10000);
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  onUnmounted(() => {
    stopPolling();
  });

  return {
    status,
    hardScore,
    softScore,
    progress,
    error,
    startSolver,
    stopPolling,
    startPolling,
    executionIdRef,
    intermediateResults,
  };
}
