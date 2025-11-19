import type { Employee } from '@/types/employee';
import type { AssignmentMap, SiteRequirements } from '@/types/schedule';

export interface SolverPayload {
  scheduleId: string;
  employees: Employee[];
  requirements: SiteRequirements;
  lastMonthAssignments: AssignmentMap;
  thisMonthAssignments: AssignmentMap;
}

export interface SolverResponse {
  scheduleId: string;
  status: 'complete' | 'error';
  hardScore: number;
  softScore: number;
  assignments: AssignmentMap;
}

// Mock: 5초 후 완료
export async function requestAISolver(payload: SolverPayload): Promise<SolverResponse> {
  // 실제 환경에서는 Google Cloud Run URL 호출
  // const response = await fetch(CLOUD_RUN_URL, { method: 'POST', body: JSON.stringify(payload) });

  await new Promise((resolve) => setTimeout(resolve, 5000));

  return {
    scheduleId: payload.scheduleId,
    status: 'complete',
    hardScore: 0,
    softScore: Math.floor(Math.random() * 100) + 100,
    assignments: generateMockAssignments(payload),
  };
}

function generateMockAssignments(payload: SolverPayload): AssignmentMap {
  const result: AssignmentMap = {};
  const shifts = ['D', 'E', 'N', 'O'];

  payload.employees.forEach((emp) => {
    result[emp.id] = {
      // 전월 데이터 보존
      ...payload.lastMonthAssignments[emp.id],
      // 당월 부분 입력 데이터 보존
      ...payload.thisMonthAssignments[emp.id],
    };

    // 빈 날짜만 자동 배정 (간단한 로테이션)
    const dates = Object.keys(payload.requirements);
    dates.forEach((date) => {
      if (!result[emp.id][date]) {
        const randomShift = shifts[Math.floor(Math.random() * shifts.length)];
        result[emp.id][date] = randomShift;
      }
    });
  });

  return result;
}
