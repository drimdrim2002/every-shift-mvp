import { ref, onUnmounted } from 'vue';
import { supabase } from '@/api/supabase';
import { requestAISolver, type SolverPayload, type SolverResponse } from '@/api/solver';
import type { AssignmentMap } from '@/types/schedule';
import type { Shift } from '@/types/shift';

export function useAISolver() {
  const status = ref<string>('created');
  const hardScore = ref<number>(0);
  const softScore = ref<number>(0);
  const progress = ref<number>(0);

  let pollingInterval: number | null = null;

  // AI Solver 시작
  async function startSolver(scheduleId: string, payload: SolverPayload, organizationId: string) {
    // 1. Status를 'running'으로 변경
    await supabase.from('schedules').update({ status: 'running' }).eq('id', scheduleId);

    status.value = 'running';

    // 2. AI Solver 호출 (비동기)
    requestAISolver(payload)
      .then(async (result) => {
        // 결과를 Supabase에 저장
        await saveResult(scheduleId, result, organizationId);
      })
      .catch(async (_error) => {
        await supabase.from('schedules').update({ status: 'error' }).eq('id', scheduleId);
      });

    // 3. Polling 시작
    startPolling(scheduleId);
  }

  // Polling 시작
  function startPolling(scheduleId: string) {
    // 이미 polling이 시작되었으면 중복 실행 방지
    if (pollingInterval) {
      return;
    }

    pollingInterval = window.setInterval(async () => {
      const { data } = await supabase
        .from('schedules')
        .select('status, hard_score, soft_score')
        .eq('id', scheduleId)
        .single();

      if (data) {
        status.value = data.status;
        hardScore.value = data.hard_score || 0;
        softScore.value = data.soft_score || 0;

        // 진행률 시뮬레이션 (Running 시)
        if (data.status === 'running' && progress.value < 90) {
          progress.value += Math.random() * 10;
        }

        if (data.status !== 'running') {
          stopPolling();
          progress.value = 100;
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
    startSolver,
    startPolling,
    stopPolling,
  };
}
