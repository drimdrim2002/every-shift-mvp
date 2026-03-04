import { supabase } from './supabase';

export interface HospitalSearchItem {
  id: string;
  name: string;
  source: 'data.go.kr';
}

type HospitalSearchErrorCode =
  | 'VALIDATION_ERROR'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_RATE_LIMIT'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR';

interface HospitalSearchRequest {
  keyword: string;
  pageNo?: number;
  numOfRows?: number;
}

interface HospitalSearchSuccessData {
  source: 'data.go.kr';
  keyword: string;
  items: HospitalSearchItem[];
  paging: {
    pageNo: number;
    numOfRows: number;
    totalCount: number | null;
  };
}

interface HospitalSearchErrorPayload {
  code: HospitalSearchErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

interface HospitalSearchSuccessResponse {
  success: true;
  data: HospitalSearchSuccessData;
}

interface HospitalSearchErrorResponse {
  success: false;
  error: HospitalSearchErrorPayload;
}

type HospitalSearchResponse = HospitalSearchSuccessResponse | HospitalSearchErrorResponse;

const DEFAULT_PAGE_NO = 1;
const DEFAULT_NUM_OF_ROWS = 20;
const MAX_NUM_OF_ROWS = 50;

const HOSPITAL_SEARCH_ERROR_MESSAGES: Record<HospitalSearchErrorCode, string> = {
  VALIDATION_ERROR: '병원 검색어를 확인해주세요.',
  UPSTREAM_TIMEOUT: '병원 검색 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  UPSTREAM_RATE_LIMIT: '요청이 많아 병원 검색이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  UPSTREAM_ERROR: '병원 검색 서비스 응답을 처리하지 못했습니다.',
  INTERNAL_ERROR: '병원 검색 중 오류가 발생했습니다.',
};

export class HospitalSearchApiError extends Error {
  code: HospitalSearchErrorCode;
  details?: Record<string, unknown>;

  constructor(code: HospitalSearchErrorCode, message?: string, details?: Record<string, unknown>) {
    super(message || HOSPITAL_SEARCH_ERROR_MESSAGES[code]);
    this.name = 'HospitalSearchApiError';
    this.code = code;
    this.details = details;
  }
}

function clampNumOfRows(limit: number): number {
  if (!Number.isFinite(limit)) {
    return DEFAULT_NUM_OF_ROWS;
  }

  const normalized = Math.trunc(limit);
  if (normalized <= 0) {
    return DEFAULT_NUM_OF_ROWS;
  }

  return Math.min(normalized, MAX_NUM_OF_ROWS);
}

function toApiError(error: HospitalSearchErrorPayload | undefined): HospitalSearchApiError {
  const code = error?.code ?? 'INTERNAL_ERROR';
  return new HospitalSearchApiError(
    code,
    error?.message || HOSPITAL_SEARCH_ERROR_MESSAGES[code],
    error?.details
  );
}

/**
 * 병원 검색 API (Edge Function 단일 경계)
 * - 브라우저에서 data.go.kr를 직접 호출하지 않는다.
 * - 키는 Edge Function 서버 환경변수에서만 사용한다.
 */
export async function searchHospitals(keyword = '', limit = DEFAULT_NUM_OF_ROWS): Promise<HospitalSearchItem[]> {
  const trimmedKeyword = keyword.trim();
  if (trimmedKeyword.length === 0) {
    return [];
  }

  const requestBody: HospitalSearchRequest = {
    keyword: trimmedKeyword,
    pageNo: DEFAULT_PAGE_NO,
    numOfRows: clampNumOfRows(limit),
  };

  const { data, error } = await supabase.functions.invoke<HospitalSearchResponse>('hospital-search', {
    body: requestBody,
  });

  if (error) {
    throw new HospitalSearchApiError('INTERNAL_ERROR', error.message);
  }

  if (!data) {
    throw new HospitalSearchApiError('INTERNAL_ERROR', 'hospital-search returned an empty response.');
  }

  if (!data.success) {
    throw toApiError(data.error);
  }

  return data.data.items;
}
