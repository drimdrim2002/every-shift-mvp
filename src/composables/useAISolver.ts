import { ref, onUnmounted } from 'vue';
import { supabase } from '@/api/supabase';
import { requestAISolver, type SolverPayload, type SolverResponse } from '@/api/solver';
import type { AssignmentMap } from '@/types/schedule';

export function useAISolver() {
  const status = ref<string>('created');
  const hardScore = ref<number>(0);
  const softScore = ref<number>(0);
  const progress = ref<number>(0);

  let pollingInterval: number | null = null;

  // AI Solver 시작
  async function startSolver(scheduleId: string, payload: SolverPayload) {
    // 1. Status를 'running'으로 변경
    await supabase.from('schedules').update({ status: 'running' }).eq('id', scheduleId);

    status.value = 'running';

    // 2. AI Solver 호출 (비동기)
    requestAISolver(payload)
      .then(async (result) => {
        // 결과를 Supabase에 저장
        await saveResult(scheduleId, result);
      })
      .catch(async (_error) => {
        await supabase.from('schedules').update({ status: 'error' }).eq('id', scheduleId);
      });

    // 3. Polling 시작
    startPolling(scheduleId);
  }

  // Polling 시작
  function startPolling(scheduleId: string) {
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
  async function saveResult(scheduleId: string, result: SolverResponse) {
    // schedules 업데이트
    await supabase
      .from('schedules')
      .update({
        status: result.status,
        hard_score: result.hardScore,
        soft_score: result.softScore,
      })
      .eq('id', scheduleId);

    // schedule_assignments 저장 (bulk insert)
    const assignments = [];
    const assignmentMap: AssignmentMap = result.assignments;

    for (const [employeeId, dates] of Object.entries(assignmentMap)) {
      for (const [date, shiftCode] of Object.entries(dates)) {
        assignments.push({
          schedule_id: scheduleId,
          employee_id: employeeId,
          shift_id: shiftCode, // TODO: shift code → shift id 변환 필요
          date,
          is_locked: false,
        });
      }
    }

    // 기존 데이터 삭제 후 삽입
    await supabase.from('schedule_assignments').delete().eq('schedule_id', scheduleId);

    await supabase.from('schedule_assignments').insert(assignments);
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
    stopPolling,
  };
}
