import type { Employee } from '@/types/employee';
import type { AssignmentMap, SiteRequirements, SolverRequest, SolverStatusResponse } from '@/types/schedule';

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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''; // 개발: '' (프록시 사용), 프로덕션: 전체 URL

// 실제 API 호출: POST /api/solve
export async function createSolverExecution(request: SolverRequest): Promise<string> {
  const url = `${API_BASE_URL}/api/solve`;
  console.log('[createSolverExecution] API_BASE_URL:', API_BASE_URL);
  console.log('[createSolverExecution] Full URL:', url);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Solver 요청 실패');
  }

  const data = await response.json();
  return data.execution_id;
}

// 실제 API 호출: GET /api/status/{id}
export async function getSolverStatus(executionId: string): Promise<SolverStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/status/${executionId}`);
  
  if (!response.ok) {
    throw new Error('상태 조회 실패');
  }
  
  return await response.json();
}

// Mock: 5초 후 완료 (개발/테스트용)
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

  console.log('[generateMockAssignments] Payload employees count:', payload.employees.length);
  console.log('[generateMockAssignments] Last 3 employees:', payload.employees.slice(-3).map(e => ({ id: e.id, name: e.name })));

  payload.employees.forEach((emp) => {
    result[emp.id] = {
      // 전월 데이터 보존
      ...payload.lastMonthAssignments[emp.id],
      // 당월 부분 입력 데이터 보존
      ...payload.thisMonthAssignments[emp.id],
    };

    // 빈 날짜만 자동 배정 (availableShifts 제약 준수)
    const dates = Object.keys(payload.requirements);
    const availableShifts = emp.availableShifts || ['D', 'E', 'N', 'O'];

    dates.forEach((date) => {
      if (!result[emp.id]?.[date]) {
        // availableShifts 중 랜덤 선택
        const randomIndex = Math.floor(Math.random() * availableShifts.length);
        result[emp.id]![date] = availableShifts[randomIndex]!;
      }
    });
  });

  console.log('[generateMockAssignments] Result keys count:', Object.keys(result).length);
  console.log('[generateMockAssignments] Last 3 result keys:', Object.keys(result).slice(-3));

  return result;
}

