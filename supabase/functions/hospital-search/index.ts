const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SOURCE = 'data.go.kr' as const;
const DEFAULT_PAGE_NO = 1;
const DEFAULT_NUM_OF_ROWS = 20;
const MAX_NUM_OF_ROWS = 50;
const MIN_KEYWORD_LENGTH = 2;
const MAX_KEYWORD_LENGTH = 50;
const UPSTREAM_TIMEOUT_MS = 5000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const EDGE_RATE_LIMIT_COUNT = 60;

const requestLogByClient = new Map<string, number[]>();

type HospitalSearchErrorCode =
  | 'VALIDATION_ERROR'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_RATE_LIMIT'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR';

interface HospitalSearchRequest {
  keyword?: unknown;
  pageNo?: unknown;
  numOfRows?: unknown;
}

interface HospitalSearchItem {
  id: string;
  name: string;
  source: typeof SOURCE;
}

interface HospitalSearchSuccessResponse {
  success: true;
  data: {
    source: typeof SOURCE;
    keyword: string;
    items: HospitalSearchItem[];
    paging: {
      pageNo: number;
      numOfRows: number;
      totalCount: number | null;
    };
  };
}

interface HospitalSearchErrorResponse {
  success: false;
  error: {
    code: HospitalSearchErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

type HospitalSearchResponse = HospitalSearchSuccessResponse | HospitalSearchErrorResponse;

interface UpstreamHospitalItem {
  ykiho?: string;
  yadmNm?: string;
}

interface NormalizedHospitalResult {
  items: HospitalSearchItem[];
  paging: {
    pageNo: number;
    numOfRows: number;
    totalCount: number | null;
  };
}

function jsonResponse(status: number, body: HospitalSearchResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  });
}

function errorResponse(
  status: number,
  code: HospitalSearchErrorCode,
  message: string,
  details?: Record<string, unknown>
): Response {
  return jsonResponse(status, {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}

function successResponse(
  keyword: string,
  result: NormalizedHospitalResult
): HospitalSearchSuccessResponse {
  return {
    success: true,
    data: {
      source: SOURCE,
      keyword,
      items: result.items,
      paging: result.paging,
    },
  };
}

function toPositiveInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function normalizeKeyword(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length < MIN_KEYWORD_LENGTH || trimmed.length > MAX_KEYWORD_LENGTH) {
    return null;
  }

  return trimmed;
}

function parseRequest(payload: HospitalSearchRequest): {
  keyword: string;
  pageNo: number;
  numOfRows: number;
} | null {
  const keyword = normalizeKeyword(payload.keyword);
  if (!keyword) {
    return null;
  }

  const parsedPageNo = payload.pageNo === undefined ? DEFAULT_PAGE_NO : toPositiveInteger(payload.pageNo);
  if (!parsedPageNo) {
    return null;
  }

  const parsedNumOfRows =
    payload.numOfRows === undefined ? DEFAULT_NUM_OF_ROWS : toPositiveInteger(payload.numOfRows);
  if (!parsedNumOfRows) {
    return null;
  }

  return {
    keyword,
    pageNo: parsedPageNo,
    numOfRows: Math.min(parsedNumOfRows, MAX_NUM_OF_ROWS),
  };
}

function getClientKey(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for')?.trim();
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    return authHeader.slice(0, 32);
  }

  return 'unknown';
}

function isRateLimited(clientKey: string): boolean {
  const now = Date.now();
  const existing = requestLogByClient.get(clientKey) ?? [];
  const activeWindow = existing.filter((time) => now - time < RATE_LIMIT_WINDOW_MS);

  if (activeWindow.length >= EDGE_RATE_LIMIT_COUNT) {
    requestLogByClient.set(clientKey, activeWindow);
    return true;
  }

  activeWindow.push(now);
  requestLogByClient.set(clientKey, activeWindow);
  return false;
}

function extractBody(payload: unknown): {
  itemsRaw: unknown;
  pageNo: number;
  numOfRows: number;
  totalCount: number | null;
  resultCode: string | null;
  resultMessage: string | null;
} | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const response = (payload as { response?: unknown }).response;
  if (!response || typeof response !== 'object') {
    return null;
  }

  const header = (response as { header?: unknown }).header;
  const body = (response as { body?: unknown }).body;
  if (!body || typeof body !== 'object') {
    return null;
  }

  const resultCode =
    header && typeof header === 'object' && typeof (header as { resultCode?: unknown }).resultCode === 'string'
      ? ((header as { resultCode?: string }).resultCode ?? null)
      : null;

  const resultMessage =
    header && typeof header === 'object' && typeof (header as { resultMsg?: unknown }).resultMsg === 'string'
      ? ((header as { resultMsg?: string }).resultMsg ?? null)
      : null;

  const parsedPageNo = toPositiveInteger((body as { pageNo?: unknown }).pageNo) ?? DEFAULT_PAGE_NO;
  const parsedNumOfRows =
    toPositiveInteger((body as { numOfRows?: unknown }).numOfRows) ?? DEFAULT_NUM_OF_ROWS;
  const parsedTotalCount = toPositiveInteger((body as { totalCount?: unknown }).totalCount);

  const items = (body as { items?: unknown }).items;
  const itemsRaw = items && typeof items === 'object' ? (items as { item?: unknown }).item : [];

  return {
    itemsRaw,
    pageNo: parsedPageNo,
    numOfRows: parsedNumOfRows,
    totalCount: parsedTotalCount,
    resultCode,
    resultMessage,
  };
}

function normalizeItems(itemsRaw: unknown): HospitalSearchItem[] {
  const upstreamItems: UpstreamHospitalItem[] = Array.isArray(itemsRaw)
    ? (itemsRaw as UpstreamHospitalItem[])
    : itemsRaw && typeof itemsRaw === 'object'
      ? ([itemsRaw] as UpstreamHospitalItem[])
      : [];

  return upstreamItems
    .map((item) => ({
      id: item.ykiho?.trim() || '',
      name: item.yadmNm?.trim() || '',
      source: SOURCE,
    }))
    .filter((item) => item.id.length > 0 && item.name.length > 0);
}

async function fetchFromUpstream(keyword: string, pageNo: number, numOfRows: number): Promise<NormalizedHospitalResult> {
  const baseUrl = Deno.env.get('HOSPITAL_API_BASE_URL')?.trim();
  const apiKey = Deno.env.get('HOSPITAL_API_KEY')?.trim();

  if (!baseUrl || !apiKey) {
    throw new Error('HOSPITAL_API_CONFIG_MISSING');
  }

  const params = new URLSearchParams();
  params.set('serviceKey', apiKey);
  params.set('yadmNm', keyword);
  params.set('_type', 'json');
  params.set('pageNo', String(pageNo));
  params.set('numOfRows', String(numOfRows));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (response.status === 429) {
      throw new Error('UPSTREAM_RATE_LIMIT');
    }

    if (!response.ok) {
      throw new Error(`UPSTREAM_HTTP_${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    const body = extractBody(payload);
    if (!body) {
      throw new Error('UPSTREAM_INVALID_PAYLOAD');
    }

    if (body.resultCode && body.resultCode !== '00') {
      throw new Error(`UPSTREAM_RESULT_${body.resultCode}:${body.resultMessage ?? 'UNKNOWN'}`);
    }

    return {
      items: normalizeItems(body.itemsRaw),
      paging: {
        pageNo: body.pageNo,
        numOfRows: body.numOfRows,
        totalCount: body.totalCount,
      },
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('UPSTREAM_TIMEOUT');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'VALIDATION_ERROR', 'Only POST is supported.');
  }

  const clientKey = getClientKey(req);
  if (isRateLimited(clientKey)) {
    return errorResponse(429, 'UPSTREAM_RATE_LIMIT', 'Too many requests. Please try again later.', {
      stage: 'edge_rate_limit',
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxRequests: EDGE_RATE_LIMIT_COUNT,
    });
  }

  let rawPayload: HospitalSearchRequest;
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return errorResponse(400, 'VALIDATION_ERROR', 'Request body must be a JSON object.');
    }
    rawPayload = body as HospitalSearchRequest;
  } catch {
    return errorResponse(400, 'VALIDATION_ERROR', 'Invalid JSON payload.');
  }

  const parsed = parseRequest(rawPayload);
  if (!parsed) {
    return errorResponse(400, 'VALIDATION_ERROR', 'Invalid keyword/pageNo/numOfRows.');
  }

  try {
    const result = await fetchFromUpstream(parsed.keyword, parsed.pageNo, parsed.numOfRows);
    return jsonResponse(200, successResponse(parsed.keyword, result));
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UPSTREAM_TIMEOUT') {
        return errorResponse(504, 'UPSTREAM_TIMEOUT', 'Upstream request timed out.', {
          timeoutMs: UPSTREAM_TIMEOUT_MS,
        });
      }

      if (error.message === 'UPSTREAM_RATE_LIMIT') {
        return errorResponse(429, 'UPSTREAM_RATE_LIMIT', 'Upstream rate limit exceeded.');
      }

      if (error.message === 'HOSPITAL_API_CONFIG_MISSING') {
        return errorResponse(
          500,
          'INTERNAL_ERROR',
          'Hospital API configuration is missing on server environment.'
        );
      }

      if (error.message.startsWith('UPSTREAM_')) {
        return errorResponse(502, 'UPSTREAM_ERROR', 'Upstream hospital API request failed.', {
          reason: error.message,
        });
      }
    }

    return errorResponse(500, 'INTERNAL_ERROR', 'Unexpected error occurred during hospital search.');
  }
});
