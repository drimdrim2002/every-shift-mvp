import { buildHospitalSearchQuery } from './query.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SOURCE = 'data.go.kr' as const
const DEFAULT_PAGE_NO = 1
const DEFAULT_NUM_OF_ROWS = 20
const MAX_NUM_OF_ROWS = 50
const MIN_KEYWORD_LENGTH = 2
const MAX_KEYWORD_LENGTH = 50
const UPSTREAM_TIMEOUT_MS = 5000
const RATE_LIMIT_WINDOW_MS = 60_000
const EDGE_RATE_LIMIT_COUNT = 60

const requestLogByClient = new Map<string, number[]>()

type HospitalSearchErrorCode =
  | 'VALIDATION_ERROR'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_RATE_LIMIT'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR'

interface HospitalSearchRequest {
  keyword?: unknown
  pageNo?: unknown
  numOfRows?: unknown
}

interface HospitalSearchItem {
  id: string
  name: string
  source: typeof SOURCE
}

interface HospitalSearchSuccessResponse {
  success: true
  data: {
    source: typeof SOURCE
    keyword: string
    items: HospitalSearchItem[]
    paging: {
      pageNo: number
      numOfRows: number
      totalCount: number | null
    }
  }
}

interface HospitalSearchErrorResponse {
  success: false
  error: {
    code: HospitalSearchErrorCode
    message: string
    details?: Record<string, unknown>
  }
}

type HospitalSearchResponse = HospitalSearchSuccessResponse | HospitalSearchErrorResponse

interface UpstreamHospitalItem {
  ykiho?: string
  yadmNm?: string
}

interface NormalizedHospitalResult {
  items: HospitalSearchItem[]
  paging: {
    pageNo: number
    numOfRows: number
    totalCount: number | null
  }
}

function jsonResponse(status: number, body: HospitalSearchResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  })
}

function errorResponse(
  status: number,
  code: HospitalSearchErrorCode,
  message: string,
  details?: Record<string, unknown>,
): Response {
  return jsonResponse(status, {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  })
}

function successResponse(
  keyword: string,
  result: NormalizedHospitalResult,
): HospitalSearchSuccessResponse {
  return {
    success: true,
    data: {
      source: SOURCE,
      keyword,
      items: result.items,
      paging: result.paging,
    },
  }
}

function toPositiveInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed
    }
  }

  return null
}

function normalizeKeyword(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (trimmed.length < MIN_KEYWORD_LENGTH || trimmed.length > MAX_KEYWORD_LENGTH) {
    return null
  }

  return trimmed
}

function parseRequest(payload: HospitalSearchRequest) {
  const keyword = normalizeKeyword(payload.keyword)
  if (!keyword) {
    return null
  }

  const parsedPageNo = payload.pageNo === undefined ? DEFAULT_PAGE_NO : toPositiveInteger(payload.pageNo)
  if (!parsedPageNo) {
    return null
  }

  const parsedNumOfRows =
    payload.numOfRows === undefined ? DEFAULT_NUM_OF_ROWS : toPositiveInteger(payload.numOfRows)
  if (!parsedNumOfRows) {
    return null
  }

  return {
    keyword,
    pageNo: parsedPageNo,
    numOfRows: Math.min(parsedNumOfRows, MAX_NUM_OF_ROWS),
  }
}

function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.trim()
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    return authHeader.slice(0, 32)
  }

  return 'unknown'
}

function isRateLimited(clientKey: string): boolean {
  const now = Date.now()
  const existing = requestLogByClient.get(clientKey) ?? []
  const activeWindow = existing.filter((time) => now - time < RATE_LIMIT_WINDOW_MS)

  if (activeWindow.length >= EDGE_RATE_LIMIT_COUNT) {
    requestLogByClient.set(clientKey, activeWindow)
    return true
  }

  activeWindow.push(now)
  requestLogByClient.set(clientKey, activeWindow)
  return false
}

function extractBody(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const response = (payload as { response?: unknown }).response
  if (!response || typeof response !== 'object') {
    return null
  }

  const header = (response as { header?: unknown }).header
  const body = (response as { body?: unknown }).body
  if (!body || typeof body !== 'object') {
    return null
  }

  const resultCode =
    header && typeof header === 'object' && typeof (header as { resultCode?: unknown }).resultCode === 'string'
      ? ((header as { resultCode?: string }).resultCode ?? null)
      : null

  const resultMessage =
    header && typeof header === 'object' && typeof (header as { resultMsg?: unknown }).resultMsg === 'string'
      ? ((header as { resultMsg?: string }).resultMsg ?? null)
      : null

  const parsedPageNo = toPositiveInteger((body as { pageNo?: unknown }).pageNo) ?? DEFAULT_PAGE_NO
  const parsedNumOfRows =
    toPositiveInteger((body as { numOfRows?: unknown }).numOfRows) ?? DEFAULT_NUM_OF_ROWS
  const parsedTotalCount = toPositiveInteger((body as { totalCount?: unknown }).totalCount)

  const items = (body as { items?: unknown }).items
  const itemsRaw = items && typeof items === 'object' ? (items as { item?: unknown }).item : []

  return {
    itemsRaw,
    pageNo: parsedPageNo,
    numOfRows: parsedNumOfRows,
    totalCount: parsedTotalCount,
    resultCode,
    resultMessage,
  }
}

function normalizeItems(itemsRaw: unknown): HospitalSearchItem[] {
  const upstreamItems: UpstreamHospitalItem[] = Array.isArray(itemsRaw)
    ? (itemsRaw as UpstreamHospitalItem[])
    : itemsRaw && typeof itemsRaw === 'object'
      ? ([itemsRaw] as UpstreamHospitalItem[])
      : []

  return upstreamItems
    .map((item) => {
      const id = typeof item.ykiho === 'string' ? item.ykiho.trim() : ''
      const name = typeof item.yadmNm === 'string' ? item.yadmNm.trim() : ''

      if (!id || !name) {
        return null
      }

      return {
        id,
        name,
        source: SOURCE,
      } satisfies HospitalSearchItem
    })
    .filter((item): item is HospitalSearchItem => Boolean(item))
}

function createUpstreamUrl(keyword: string, pageNo: number, numOfRows: number): URL {
  const baseUrl = Deno.env.get('HOSPITAL_API_BASE_URL')
  const apiKey = Deno.env.get('HOSPITAL_API_KEY')

  if (!baseUrl || !apiKey) {
    throw new Error('Missing HOSPITAL_API_BASE_URL or HOSPITAL_API_KEY')
  }

  const url = new URL(baseUrl)
  url.search = buildHospitalSearchQuery(apiKey, keyword, pageNo, numOfRows).toString()
  return url
}

async function fetchUpstreamHospitals(
  keyword: string,
  pageNo: number,
  numOfRows: number,
): Promise<NormalizedHospitalResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

  try {
    const response = await fetch(createUpstreamUrl(keyword, pageNo, numOfRows), {
      method: 'GET',
      signal: controller.signal,
    })

    if (response.status === 429) {
      throw new Error('UPSTREAM_RATE_LIMIT')
    }

    if (!response.ok) {
      throw new Error(`UPSTREAM_ERROR:${response.status}`)
    }

    const payload = await response.json()
    const body = extractBody(payload)
    if (!body) {
      throw new Error('UPSTREAM_ERROR:invalid_payload')
    }

    if (body.resultCode && body.resultCode !== '00') {
      throw new Error(`UPSTREAM_ERROR:${body.resultCode}:${body.resultMessage ?? 'unknown'}`)
    }

    return {
      items: normalizeItems(body.itemsRaw),
      paging: {
        pageNo: body.pageNo,
        numOfRows: body.numOfRows,
        totalCount: body.totalCount,
      },
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('UPSTREAM_TIMEOUT')
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: CORS_HEADERS,
    })
  }

  if (request.method !== 'POST') {
    return errorResponse(405, 'VALIDATION_ERROR', 'POST only')
  }

  const clientKey = getClientKey(request)
  if (isRateLimited(clientKey)) {
    return errorResponse(
      429,
      'UPSTREAM_RATE_LIMIT',
      '요청이 많아 병원 검색이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
    )
  }

  let payload: HospitalSearchRequest
  try {
    payload = await request.json()
  } catch {
    return errorResponse(400, 'VALIDATION_ERROR', '잘못된 요청 본문입니다.')
  }

  const parsed = parseRequest(payload)
  if (!parsed) {
    return errorResponse(400, 'VALIDATION_ERROR', '병원 검색어를 확인해주세요.')
  }

  try {
    const result = await fetchUpstreamHospitals(parsed.keyword, parsed.pageNo, parsed.numOfRows)
    return jsonResponse(200, successResponse(parsed.keyword, result))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'INTERNAL_ERROR'

    if (message === 'UPSTREAM_TIMEOUT') {
      return errorResponse(
        504,
        'UPSTREAM_TIMEOUT',
        '병원 검색 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
      )
    }

    if (message === 'UPSTREAM_RATE_LIMIT') {
      return errorResponse(
        429,
        'UPSTREAM_RATE_LIMIT',
        '요청이 많아 병원 검색이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
      )
    }

    if (message.startsWith('UPSTREAM_ERROR')) {
      return errorResponse(
        502,
        'UPSTREAM_ERROR',
        '병원 검색 서비스 응답을 처리하지 못했습니다.',
        { upstream: message },
      )
    }

    return errorResponse(500, 'INTERNAL_ERROR', '병원 검색 중 오류가 발생했습니다.')
  }
})
