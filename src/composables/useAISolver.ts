import { requestAISolver, type SolverPayload, type SolverResponse } from '@/api/solver';
import { supabase } from '@/api/supabase';
import type { AssignmentMap, PlanningPayload } from '@/types/schedule';
import type { Shift } from '@/types/shift';
import { onUnmounted, ref } from 'vue';

export function useAISolver() {
  const status = ref<string>('created');
  const hardScore = ref<number>(0);
  const softScore = ref<number>(0);
  const progress = ref<number>(0);
  const error = ref<string | null>(null);

  const maxPollingAttempts = 60; // 5분 (5초 × 60회)
  let pollingAttempts = 0;
  let pollingInterval: number | null = null;

  // AI Solver 시작
  async function startSolver(
    scheduleId: string, 
    payload: SolverPayload, 
    organizationId: string,
    planningPayload?: PlanningPayload
  ) {
    // 초기화
    error.value = null;
    pollingAttempts = 0;
    progress.value = 0;

    // Planning Payload 로깅 (실제 API 호출 시 사용)
    if (planningPayload) {
      console.log('[useAISolver] Planning Payload available for API call');
      console.log('[useAISolver] Organization:', planningPayload.organization.name);
      console.log('[useAISolver] Shifts:', planningPayload.organization.shifts.length);
      console.log('[useAISolver] Employees:', planningPayload.employees.length);
      console.log('[useAISolver] Assignments:', planningPayload.assignments.length);
      console.log('[useAISolver] Requirements dates:', Object.keys(planningPayload.requirements).length);
      
      // 실제 API 호출 시 사용할 수 있도록 저장
      // TODO: Google Cloud Run API 호출 시 planningPayload 사용
      // const response = await fetch(CLOUD_RUN_URL, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(planningPayload),
      // });
    }

    // 1. Status를 'running'으로 변경
    await supabase.from('schedules').update({ status: 'running' }).eq('id', scheduleId);

    status.value = 'running';

    // 2. AI Solver 호출 (비동기) - 현재는 Mock 사용
    requestAISolver(payload)
      .then(async (result) => {
        // 결과를 Supabase에 저장
        await saveResult(scheduleId, result, organizationId);
      })
      .catch(async (solverError) => {
        console.error('AI Solver error:', solverError);
        error.value = solverError instanceof Error ? solverError.message : 'AI Solver 오류';
        await supabase.from('schedules').update({ status: 'error' }).eq('id', scheduleId);
      });

    // 3. Polling 시작
    startPolling(scheduleId);
  }

  // Polling 시작 (실제 API 상태 조회)
  function startPolling(scheduleId: string) {
    // 이미 polling이 시작되었으면 중복 실행 방지
    if (pollingInterval) {
      return;
    }

    pollingInterval = window.setInterval(async () => {
      pollingAttempts++;

      // Timeout 체크 (60회 = 5분)
      if (pollingAttempts > maxPollingAttempts) {
        stopPolling();
        error.value = 'Timeout: 근무표 생성이 5분을 초과했습니다. 다시 시도해주세요.';
        status.value = 'error';
        return;
      }

      try {
        // Supabase에서 schedules 테이블 조회 (기존 방식 유지)
        const { data, error: fetchError } = await supabase
          .from('schedules')
          .select('status, hard_score, soft_score')
          .eq('id', scheduleId)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        if (data) {
          status.value = data.status;
          hardScore.value = data.hard_score || 0;
          softScore.value = data.soft_score || 0;

          // 진행률 시뮬레이션 (Running 시)
          if (data.status === 'running' && progress.value < 90) {
            progress.value += Math.random() * 10;
          }

          if (data.status === 'complete') {
            stopPolling();
            progress.value = 100;
            error.value = null;
          } else if (data.status === 'error') {
            stopPolling();
            error.value = 'AI Solver에서 오류가 발생했습니다.';
            progress.value = 0;
          }
        }
      } catch (networkError) {
        console.error('Polling error:', networkError);
        // Network error는 다음 polling에서 재시도
        // maxPollingAttempts 초과 시에만 실패 처리
        if (pollingAttempts >= maxPollingAttempts) {
          stopPolling();
          error.value = 'Network error: 연결이 불안정합니다.';
          status.value = 'error';
        }
      }
    }, 5000); // 5초마다
  }

  // Polling 중지
  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  // 결과 저장
  async function saveResult(scheduleId: string, result: SolverResponse, organizationId: string) {
    // 디버깅: Solver 결과 확인
    console.log('[saveResult] Result assignments keys:', Object.keys(result.assignments).length);
    console.log('[saveResult] Last 3 keys:', Object.keys(result.assignments).slice(-3));

    // 1. schedules 업데이트
    await supabase
      .from('schedules')
      .update({
        status: result.status,
        hard_score: result.hardScore,
        soft_score: result.softScore,
      })
      .eq('id', scheduleId);

    // 2. Shifts 조회 (code → id 매핑)
    const { data: shifts } = await supabase
      .from('shifts')
      .select('id, code')
      .eq('organization_id', organizationId);

    const shiftMap = new Map<string, string>();
    (shifts as Shift[])?.forEach((shift) => {
      shiftMap.set(shift.code, shift.id);
    });

    // 3. schedule_assignments 저장 (bulk insert)
    const assignments = [];
    const assignmentMap: AssignmentMap = result.assignments;

    for (const [employeeId, dates] of Object.entries(assignmentMap)) {
      for (const [date, shiftCode] of Object.entries(dates)) {
        const shiftId = shiftMap.get(shiftCode);
        if (shiftId) {
          assignments.push({
            schedule_id: scheduleId,
            employee_id: employeeId,
            shift_id: shiftId,
            date,
            is_locked: false,
          });
        }
      }
    }

    // 4. 기존 데이터 삭제 후 삽입
    await supabase.from('schedule_assignments').delete().eq('schedule_id', scheduleId);

    if (assignments.length > 0) {
      console.log('Inserting assignments:', { count: assignments.length, sample: assignments[0] });
      const { error } = await supabase.from('schedule_assignments').insert(assignments);
      if (error) {
        console.error('Failed to insert schedule_assignments:', error);
        console.error('Sample assignment:', assignments[0]);
        throw error;
      }
    }
  }

  // 컴포넌트 언마운트 시 polling 정리
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
    startPolling,
    stopPolling,
  };
}
