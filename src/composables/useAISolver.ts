import { 
  createSolverExecution, 
  getSolverStatus, 
  parseSolverResult, 
  mapApiStatusToAppStatus 
} from '@/api/solver';
import { supabase } from '@/api/supabase';
import type { SolverRequest, AssignmentMap } from '@/types/schedule';
import { onUnmounted, ref } from 'vue';

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

  async function startSolver(scheduleId: string, request: SolverRequest): Promise<string | null> {
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
      // 1. Update Supabase status to running
      await supabase
        .from('schedules')
        .update({ status: 'running', solver_execution_id: null })
        .eq('id', scheduleId);

      // 2. Call API
      const executionId = await createSolverExecution(request);
      executionIdRef.value = executionId;
      console.log('[useAISolver] Solver started, executionId:', executionId);

      // 3. Persist execution id for resume/reconnect
      await supabase
        .from('schedules')
        .update({ solver_execution_id: executionId })
        .eq('id', scheduleId);

      // 3. Start Polling
      startPolling(executionId, scheduleId);
      return executionId;

    } catch (e: any) {
      console.error('[useAISolver] Failed to start solver:', e);
      error.value = e.message || 'Failed to start solver';
      status.value = 'error';
      await supabase
        .from('schedules')
        .update({ status: 'error', solver_execution_id: null })
        .eq('id', scheduleId);
      return null;
    }
  }

  function startPolling(executionId: string, scheduleId: string) {
    if (pollingInterval) clearInterval(pollingInterval);
    executionIdRef.value = executionId;
    pollingAttempts = 0;

    pollingInterval = window.setInterval(async () => {
      pollingAttempts++;
      if (pollingAttempts > maxPollingAttempts) {
        stopPolling();
        error.value = 'Timeout: 근무표 생성이 10분을 초과했습니다.';
        status.value = 'error';
        await supabase.from('schedules').update({ status: 'error' }).eq('id', scheduleId);
        return;
      }

      try {
        const response = await getSolverStatus(executionId);
        const appStatus = mapApiStatusToAppStatus(response.status);
        
        status.value = appStatus;

        if (response.score) {
          hardScore.value = response.score.hard_score;
          softScore.value = response.score.soft_score;
        }

        if (appStatus === 'running') {
            // Fake progress if needed
            if (progress.value < 90) progress.value += 2;
            
            // Save intermediate results if available
            if (response.result) {
                const assignments = parseSolverResult(response.result);
                intermediateResults.value = assignments;
                await saveIntermediateResult(scheduleId, assignments, response.score);
            }
        } else if (appStatus === 'complete') {
            stopPolling();
            progress.value = 100;
            // Save results
            if (response.result) {
                const assignments = parseSolverResult(response.result);
                await saveResult(scheduleId, assignments, response.score);
            }
        } else if (appStatus === 'error') {
            stopPolling();
            error.value = response.error_message || 'AI Solver 오류';
            await supabase.from('schedules').update({ status: 'error' }).eq('id', scheduleId);
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

  async function saveIntermediateResult(scheduleId: string, assignments: AssignmentMap, score?: { hard_score: number, soft_score: number }) {
      console.log('[saveIntermediateResult] Saving intermediate results to database...');
      // Update schedule with intermediate score (don't change status)
      await supabase.from('schedules').update({
          hard_score: score?.hard_score || 0,
          soft_score: score?.soft_score || 0
      }).eq('id', scheduleId);

      // Save assignments to DB
      await saveAssignmentsToDb(scheduleId, assignments);
      console.log('[saveIntermediateResult] Saved intermediate results.');
  }

  async function saveResult(scheduleId: string, assignments: AssignmentMap, score?: { hard_score: number, soft_score: number }) {
      console.log('[saveResult] Saving final results to database...');
      // Update schedule status and score
      await supabase.from('schedules').update({
          status: 'complete',
          hard_score: score?.hard_score || 0,
          soft_score: score?.soft_score || 0
      }).eq('id', scheduleId);

      // Save assignments to DB
      await saveAssignmentsToDb(scheduleId, assignments);
      console.log('[saveResult] Saved final results.');
  }

  async function saveAssignmentsToDb(scheduleId: string, assignments: AssignmentMap) {

      // Transform AssignmentMap to DB rows
      const rows = [];
      for (const [employeeId, dateMap] of Object.entries(assignments)) {
          for (const [date, shiftId] of Object.entries(dateMap)) {
              if (shiftId) { // shiftId is UUID from parseSolverResult
                  rows.push({
                      schedule_id: scheduleId,
                      employee_id: employeeId,
                      shift_id: shiftId,
                      date: date,
                      is_locked: false
                  });
              }
          }
      }

      // Bulk replace
      const { error: deleteError } = await supabase.from('schedule_assignments').delete().eq('schedule_id', scheduleId);
      if (deleteError) {
          console.error('Failed to delete old assignments:', deleteError);
          throw deleteError;
      }

      if (rows.length > 0) {
          const { error } = await supabase.from('schedule_assignments').insert(rows);
          if (error) {
              console.error('Failed to insert new assignments:', error);
              throw error;
          }
      }
      console.log('[saveAssignmentsToDb] Saved', rows.length, 'assignments.');
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
