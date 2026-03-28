import { 
  createSolverExecution, 
  getSolverStatus, 
  parseSolverResult, 
  mapApiStatusToAppStatus 
} from '@/api/solver';
import {
  markPhase2ScheduleVersionSolving,
  syncPhase2ScheduleVersionSolverResult,
} from '@/api/schedule';
import type {
  SolverRequest,
  AssignmentMap,
  ScheduleVersionAssignmentChange,
  ScheduleVersionScore,
} from '@/types/schedule';
import { onUnmounted, ref } from 'vue';

interface SolverStartParams {
  versionId: string;
  month: string;
  solverRequest: SolverRequest;
}

interface SolverPollingContext {
  versionId: string;
  month: string;
}

interface Phase2ScheduleConflictError extends Error {
  code?: string;
  status?: number;
}

export function useAISolver() {
  const status = ref<'created' | 'running' | 'complete' | 'error' | 'changed'>('created');
  const hardScore = ref<number>(0);
  const softScore = ref<number>(0);
  const progress = ref<number>(0);
  const error = ref<string | null>(null);
  const executionIdRef = ref<string | null>(null);
  // Intermediate polling result uses shift UUIDs (not shift codes). UI must map before rendering.
  const intermediateResults = ref<AssignmentMap | null>(null);

  const maxPollingAttempts = 120; // 10 minutes (5s * 120)
  let pollingAttempts = 0;
  let pollingInterval: number | null = null;

  function toAssignmentChanges(assignments: AssignmentMap): ScheduleVersionAssignmentChange[] {
    const changes: ScheduleVersionAssignmentChange[] = [];

    for (const [employeeId, dateMap] of Object.entries(assignments)) {
      for (const [date, shiftId] of Object.entries(dateMap)) {
        if (!shiftId) continue;
        changes.push({
          employeeId,
          date,
          shiftId,
          isLocked: false,
        });
      }
    }

    return changes;
  }

  function toVersionScore(score?: { hard_score: number; soft_score: number }): ScheduleVersionScore | undefined {
    if (!score) {
      return undefined;
    }

  return {
      hardScore: score.hard_score,
      softScore: score.soft_score,
    };
  }

  async function markVersionFailed(
    context: SolverPollingContext,
    solverExecutionId: string,
    failureReason: string
  ) {
    await syncPhase2ScheduleVersionSolverResult(context.versionId, {
      status: 'failed',
      solverExecutionId,
      failureReason,
    });
  }

  function isStaleLocalSessionError(error: unknown): error is Phase2ScheduleConflictError {
    if (!(error instanceof Error)) {
      return false;
    }

    const candidate = error as Phase2ScheduleConflictError;
    return candidate.status === 409
      && (candidate.code === 'solver_execution_mismatch' || candidate.code === 'stale_solver_callback');
  }

  function isAnotherVersionSolvingError(error: unknown): error is Phase2ScheduleConflictError {
    if (!(error instanceof Error)) {
      return false;
    }

    const candidate = error as Phase2ScheduleConflictError;
    return candidate.status === 409 && candidate.code === 'another_version_solving';
  }

  function handleStaleLocalSession(errorCode?: string) {
    stopPolling();
    status.value = 'error';
    error.value = errorCode === 'solver_execution_mismatch'
      ? '다른 세션에서 이미 새 실행으로 전환되었습니다. 화면을 새로고침해주세요.'
      : '다른 세션에서 이미 처리된 실행입니다. 화면을 새로고침해주세요.';
  }

  async function startSolver(params: SolverStartParams): Promise<string | null> {
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
      const executionId = await createSolverExecution(params.solverRequest);
      executionIdRef.value = executionId;
      console.log('[useAISolver] Solver started, executionId:', executionId);

      await markPhase2ScheduleVersionSolving(params.versionId, {
        solverExecutionId: executionId,
      });

      startPolling(executionId, {
        versionId: params.versionId,
        month: params.month,
      });
      return executionId;

    } catch (e: unknown) {
      console.error('[useAISolver] Failed to start solver:', e);
      error.value = isAnotherVersionSolvingError(e)
        ? '이미 다른 버전이 생성 중입니다. 완료 후 다시 시도해주세요.'
        : e instanceof Error
          ? e.message
          : 'Failed to start solver';
      status.value = 'error';
      return null;
    }
  }

  function startPolling(executionId: string, context: SolverPollingContext) {
    if (pollingInterval) clearInterval(pollingInterval);
    executionIdRef.value = executionId;
    pollingAttempts = 0;

    pollingInterval = window.setInterval(async () => {
      pollingAttempts++;
      if (pollingAttempts > maxPollingAttempts) {
        stopPolling();
        const failureReason = 'Timeout: 근무표 생성이 10분을 초과했습니다.';
        error.value = failureReason;
        status.value = 'error';
        try {
          await markVersionFailed(context, executionId, failureReason);
        } catch (e: unknown) {
          if (isStaleLocalSessionError(e)) {
            handleStaleLocalSession(e.code);
            return;
          }

          throw e;
        }
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
            // Fake progress if needed
            if (progress.value < 90) progress.value += 2;
            
            if (response.result) {
                intermediateResults.value = parseSolverResult(response.result);
            }
        } else if (appStatus === 'complete') {
            stopPolling();
            try {
                if (!response.result) {
                    throw new Error('AI Solver 완료 응답에 결과 데이터가 없습니다.');
                }

                const assignments = parseSolverResult(response.result);
                await syncPhase2ScheduleVersionSolverResult(context.versionId, {
                  status: 'completed',
                  solverExecutionId: executionId,
                  assignments: toAssignmentChanges(assignments),
                  score: toVersionScore(response.score),
                });
                progress.value = 100;
                status.value = 'complete';
            } catch (e: unknown) {
                if (isStaleLocalSessionError(e)) {
                    handleStaleLocalSession(e.code);
                    return;
                }

                console.error('[useAISolver] Failed to save final solver result:', e);
                error.value = e instanceof Error ? e.message : '최종 결과 저장 중 오류가 발생했습니다.';
                status.value = 'error';
            }
        } else if (appStatus === 'error') {
            stopPolling();
            error.value = response.error_message || 'AI Solver 오류';
            try {
              await markVersionFailed(context, executionId, error.value);
            } catch (e: unknown) {
              if (isStaleLocalSessionError(e)) {
                handleStaleLocalSession(e.code);
                return;
              }

              throw e;
            }
            status.value = 'error';
        } else {
            status.value = appStatus;
        }

      } catch (e) {
          console.error('Polling error:', e);
          // Don't stop immediately on network error, just retry
      }
    }, 10000); // Changed from 5000 to 10000 (10 seconds)
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
