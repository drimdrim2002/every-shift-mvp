import type { 
  SolverRequest, 
  SolverStatusResponse, 
  AssignmentMap, 
  SolverResult, 
  ShiftAssignmentItem 
} from '@/types/schedule';

interface SolverRuntimeEnv {
  DEV?: boolean;
  VITE_API_BASE_URL?: string;
}

function normalizeApiBaseUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function resolveApiBaseUrl(env: SolverRuntimeEnv = import.meta.env): string {
  // In development, always use Vite proxy (/api) to avoid browser-side CORS issues.
  if (env.DEV) {
    return '';
  }

  return normalizeApiBaseUrl((env.VITE_API_BASE_URL || '').trim());
}

export function buildSolverApiUrl(path: string, env: SolverRuntimeEnv = import.meta.env): string {
  const baseUrl = resolveApiBaseUrl(env);
  return baseUrl ? `${baseUrl}${path}` : path;
}

// 실제 API 호출: POST /api/solve
export async function createSolverExecution(request: SolverRequest): Promise<string> {
  const url = buildSolverApiUrl('/api/solve');
  console.log('[createSolverExecution] API_BASE_URL:', resolveApiBaseUrl());
  console.log('[createSolverExecution] Full URL:', url);
  
  console.log('[createSolverExecution] Request Body:', JSON.stringify(request, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[createSolverExecution] Error response:', errorText);
    try {
      const errorJson = JSON.parse(errorText);
      throw new Error(errorJson.error || errorJson.message || `Solver 요청 실패: ${response.status} ${response.statusText}`);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Solver 요청 실패')) {
        throw e;
      }
      throw new Error(`Solver 요청 실패: ${response.status} ${response.statusText} - ${errorText.substring(0, 100)}`);
    }
  }

  const data = await response.json();
  return data.execution_id;
}

// 실제 API 호출: GET /api/status/{id}
export async function getSolverStatus(executionId: string): Promise<SolverStatusResponse> {
  const response = await fetch(buildSolverApiUrl(`/api/status/${executionId}`));
  
  if (!response.ok) {
    throw new Error('상태 조회 실패');
  }
  
  return await response.json();
}

// API 상태를 앱 내부 상태로 매핑
export function mapApiStatusToAppStatus(apiStatus: string): 'created' | 'running' | 'complete' | 'error' {
  switch (apiStatus) {
    case 'PENDING':
    case 'RUNNING':
      return 'running';
    case 'COMPLETED':
      return 'complete';
    case 'FAILED':
      return 'error';
    default:
      return 'created';
  }
}

import dayjs from 'dayjs';

// Solver 결과를 AssignmentMap으로 변환
export function parseSolverResult(result: SolverResult): AssignmentMap {
  const assignmentMap: AssignmentMap = {};

  if (!result || !result.shiftList) {
    return assignmentMap;
  }

  result.shiftList.forEach((shift: ShiftAssignmentItem) => {
    // Check if shift has employee and start date
    if (shift.employee && shift.start) {
        const employeeId = shift.employee.id;
        const assignedShiftId = shift.shiftId || shift.supabaseId; // Use shiftId if available, fallback to supabaseId
        
        const start = dayjs(shift.start);
        let logicalDate = start.format('YYYY-MM-DD');

        // Night shift starting in the morning (e.g., 00:00) belongs to the previous schedule day
        if (shift.shiftCode === 'N' && start.hour() < 12) {
            logicalDate = start.subtract(1, 'day').format('YYYY-MM-DD');
        } else if (!shift.shiftCode && start.hour() === 0 && start.minute() === 0) {
            // Fallback: If no shiftCode is provided but it starts exactly at midnight
            logicalDate = start.subtract(1, 'day').format('YYYY-MM-DD');
        }

        if (!assignmentMap[employeeId]) {
          assignmentMap[employeeId] = {};
        }
        assignmentMap[employeeId]![logicalDate] = assignedShiftId;
    }
  });

  return assignmentMap;
}
