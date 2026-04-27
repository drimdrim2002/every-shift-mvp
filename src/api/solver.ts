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

interface SolverRequestOptions {
  signal?: AbortSignal;
}

export class SolverApiError extends Error {
  code?: string;
  status?: number;
  payload?: unknown;

  constructor(message: string, options?: { code?: string; status?: number; payload?: unknown }) {
    super(message);
    this.name = 'SolverApiError';
    this.code = options?.code;
    this.status = options?.status;
    this.payload = options?.payload;
  }
}

function normalizeApiBaseUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function resolveApiBaseUrl(env: SolverRuntimeEnv = import.meta.env): string {
  const configuredBaseUrl = (env.VITE_API_BASE_URL || '').trim();
  return configuredBaseUrl ? normalizeApiBaseUrl(configuredBaseUrl) : '';
}

export function buildSolverApiUrl(path: string, env: SolverRuntimeEnv = import.meta.env): string {
  const baseUrl = resolveApiBaseUrl(env);
  return baseUrl ? `${baseUrl}${path}` : path;
}

function shouldRetryWithDevProxy(env: SolverRuntimeEnv): boolean {
  return Boolean(env.DEV && resolveApiBaseUrl(env));
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'AbortError';
  }

  return typeof error === 'object'
    && error !== null
    && 'name' in error
    && (error as { name?: unknown }).name === 'AbortError';
}

async function fetchSolverApiWithDevProxyFallback(
  path: string,
  fallbackProxyPaths: string[],
  init: RequestInit,
  env: SolverRuntimeEnv = import.meta.env,
): Promise<Response> {
  const directUrl = buildSolverApiUrl(path, env);

  try {
    return await fetch(directUrl, init);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    if (!shouldRetryWithDevProxy(env)) {
      throw error;
    }

    console.warn('[solver] Direct API request failed, retrying with Vite proxy:', {
      directUrl,
      proxyUrl: path,
      error,
    });

    const primaryProxyResponse = await fetch(path, init);
    if (primaryProxyResponse.status !== 404 || fallbackProxyPaths.length === 0) {
      return primaryProxyResponse;
    }

    let lastResponse = primaryProxyResponse;
    for (const fallbackProxyPath of fallbackProxyPaths) {
      console.warn('[solver] Proxy request returned 404, retrying with alternate proxy path:', {
        primaryProxyUrl: path,
        alternateProxyUrl: fallbackProxyPath,
      });

      const fallbackResponse = await fetch(fallbackProxyPath, init);
      if (fallbackResponse.status !== 404) {
        return fallbackResponse;
      }
      lastResponse = fallbackResponse;
    }

    return lastResponse;
  }
}

// 실제 API 호출: POST /api/solve
export async function createSolverExecution(
  request: SolverRequest,
  env: SolverRuntimeEnv = import.meta.env,
): Promise<string> {
  const path = '/api/solve';
  const url = buildSolverApiUrl(path, env);

  let response: Response;
  try {
    response = await fetchSolverApiWithDevProxyFallback(
      path,
      ['/solve'],
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      },
      env
    );
  } catch (networkError) {
    const fallbackMessage = networkError instanceof Error ? networkError.message : String(networkError);
    throw new SolverApiError(
      `Solver API 호출 실패 (네트워크/CORS 또는 배포 URL 확인 필요): ${fallbackMessage}`,
      {
        payload: {
          url,
          baseUrl: resolveApiBaseUrl(env),
        },
      }
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[createSolverExecution] Error response:', errorText);
    const fallbackMessage = `Solver 요청 실패: ${response.status} ${response.statusText}`;

    try {
      const errorJson = JSON.parse(errorText) as {
        code?: unknown;
        error?: unknown;
        message?: unknown;
      };
      const message = [errorJson.message, errorJson.error].find(
        (entry) => typeof entry === 'string' && entry.trim().length > 0
      ) as string | undefined;
      const code = typeof errorJson.code === 'string' && errorJson.code.trim().length > 0
        ? errorJson.code
        : undefined;

      throw new SolverApiError(message ?? fallbackMessage, {
        code,
        status: response.status,
        payload: errorJson,
      });
    } catch (parseError) {
      if (parseError instanceof SolverApiError) {
        throw parseError;
      }

      throw new SolverApiError(
        `${fallbackMessage} - ${errorText.substring(0, 100)}`,
        {
          status: response.status,
          payload: errorText,
        }
      );
    }
  }

  const data = await response.json();
  return data.execution_id;
}

// 실제 API 호출: GET /api/status/{id}
export async function getSolverStatus(
  executionId: string,
  env: SolverRuntimeEnv = import.meta.env,
  options: SolverRequestOptions = {},
): Promise<SolverStatusResponse> {
  const path = `/api/status/${executionId}`;
  const response = await fetchSolverApiWithDevProxyFallback(
    path,
    [`/status/${executionId}`],
    {
      signal: options.signal,
    },
    env
  );
  
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
