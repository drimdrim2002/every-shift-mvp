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
import type { AssignmentMap, SolverApiScore, SolverRequest } from '@/types/schedule';
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

function toFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return value;
}

function normalizeSolverScore(
  score: SolverApiScore | null | undefined
): { hardScore: number; softScore: number } | null {
  if (!score) return null;

  const hardScore = toFiniteNumber(score.hard_score);

  if (typeof score.soft_score === 'number' && Number.isFinite(score.soft_score)) {
    return {
      hardScore,
      softScore: score.soft_score,
    };
  }

  if (
    typeof score.legacy_soft_score_total === 'number'
    && Number.isFinite(score.legacy_soft_score_total)
  ) {
    return {
      hardScore,
      softScore: score.legacy_soft_score_total,
    };
  }

  return {
    hardScore,
    softScore: toFiniteNumber(score.undesired_soft_score)
      + toFiniteNumber(score.fair_soft_score)
      + toFiniteNumber(score.desired_soft_score),
  };
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
  const maxConsecutivePollingErrors = 3;
  let pollingAttempts = 0;
  let consecutivePollingErrors = 0;
  let pollingTimeout: number | null = null;
  let pollingSessionId = 0;

  function clearPollingTimeout() {
    if (pollingTimeout !== null) {
      clearTimeout(pollingTimeout);
      pollingTimeout = null;
    }
  }

  function isActivePollingSession(sessionId: number) {
    return pollingSessionId === sessionId;
  }

  function scheduleNextPoll(
    sessionId: number,
    executionId: string,
    scheduleVersionId: string,
    delayMs = 10000
  ) {
    if (!isActivePollingSession(sessionId)) {
      return;
    }

    clearPollingTimeout();
    pollingTimeout = window.setTimeout(() => {
      void pollSolverStatus(sessionId, executionId, scheduleVersionId);
    }, delayMs);
  }

  async function pollSolverStatus(
    sessionId: number,
    executionId: string,
    scheduleVersionId: string
  ) {
    if (!isActivePollingSession(sessionId)) {
      return;
    }

    pollingAttempts++;
    if (pollingAttempts > maxPollingAttempts) {
      clearPollingTimeout();
      error.value = 'Timeout: 근무표 생성이 20분을 초과했습니다.';
      status.value = 'error';
      await markSolveFailedIfCurrent(
        scheduleVersionId,
        executionId,
        null,
        'polling_timeout',
        'timeout',
        null
      );
      return;
    }

    try {
      const response = await getSolverStatus(executionId);
      if (!isActivePollingSession(sessionId)) {
        return;
      }

      consecutivePollingErrors = 0;
      const appStatus = mapApiStatusToAppStatus(response.status);
      const normalizedScore = normalizeSolverScore(response.score);

      if (normalizedScore) {
        hardScore.value = normalizedScore.hardScore;
        softScore.value = normalizedScore.softScore;
      }

      if (appStatus === 'running') {
        status.value = 'running';
        if (progress.value < 90) progress.value += 2;

        if (response.result) {
          const assignments = parseSolverResult(response.result);
          intermediateResults.value = assignments;
        }

        scheduleNextPoll(sessionId, executionId, scheduleVersionId);
        return;
      }

      if (appStatus === 'complete') {
        clearPollingTimeout();

        if (!response.result) {
          throw new Error('AI Solver 완료 응답에 결과 데이터가 없습니다.');
        }

        const assignments = parseSolverResult(response.result);
        await submitPhase2ScheduleVersionSolverResult(scheduleVersionId, {
          status: 'completed',
          solverExecutionId: executionId,
          assignments: toSolverWriteRows(assignments),
          score: normalizedScore
            ? {
              hardScore: normalizedScore.hardScore,
              softScore: normalizedScore.softScore,
            }
            : null,
          failureReason: null,
          failureType: null,
          failureContext: null,
        });

        if (!isActivePollingSession(sessionId)) {
          return;
        }

        await refreshPreferenceResolutionByVersion(scheduleVersionId);
        if (!isActivePollingSession(sessionId)) {
          return;
        }

        progress.value = 100;
        status.value = 'complete';
        return;
      }

      if (appStatus === 'error') {
        clearPollingTimeout();
        error.value = response.error_message || 'AI Solver 오류';
        status.value = 'error';
        const failureType = response.failure_type
          ?? response.failureType
          ?? null;
        const failureContext = response.failure_context
          ?? response.failureContext
          ?? null;
        await markSolveFailedIfCurrent(
          scheduleVersionId,
          executionId,
          response.score,
          response.error_message ?? null,
          failureType,
          failureContext
        );
        return;
      }

      status.value = appStatus;
      scheduleNextPoll(sessionId, executionId, scheduleVersionId);
    } catch (pollingError) {
      if (!isActivePollingSession(sessionId)) {
        return;
      }

      if (isStaleSolverCallbackError(pollingError)) {
        clearPollingTimeout();
        status.value = 'created';
        error.value = '최신 버전 상태가 변경되어 이전 실행 결과를 무시했습니다.';
        return;
      }

      consecutivePollingErrors += 1;
      console.error('Polling error:', pollingError);

      if (consecutivePollingErrors >= maxConsecutivePollingErrors) {
        clearPollingTimeout();
        status.value = 'error';
        error.value = 'AI Solver 상태 조회가 반복 실패하여 실행을 중단했습니다. 다시 시도해주세요.';
        await markSolveFailedIfCurrent(
          scheduleVersionId,
          executionId,
          null,
          'polling_status_unreachable',
          'polling_unreachable',
          null
        );
        return;
      }

      scheduleNextPoll(sessionId, executionId, scheduleVersionId);
    }
  }

  async function markSolveFailedIfCurrent(
    scheduleVersionId: string,
    executionId: string,
    score?: SolverApiScore | null,
    failureReason?: string | null,
    failureType?: string | null,
    failureContext?: Record<string, unknown> | null
  ): Promise<void> {
    try {
      const normalizedScore = normalizeSolverScore(score);
      await submitPhase2ScheduleVersionSolverResult(scheduleVersionId, {
        status: 'failed',
        solverExecutionId: executionId,
        assignments: [],
        score: normalizedScore
          ? {
            hardScore: normalizedScore.hardScore,
            softScore: normalizedScore.softScore,
          }
          : null,
        failureReason: failureReason ?? null,
        failureType: failureType ?? null,
        failureContext: failureContext ?? null,
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
    consecutivePollingErrors = 0;
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
    stopPolling();
    executionIdRef.value = executionId;
    pollingAttempts = 0;
    consecutivePollingErrors = 0;
    const sessionId = pollingSessionId;
    scheduleNextPoll(sessionId, executionId, scheduleVersionId);
  }

  function stopPolling() {
    pollingSessionId += 1;
    clearPollingTimeout();
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
