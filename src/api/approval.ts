import { supabase } from '@/api/supabase'
import type {
  ApprovalDecisionRequest,
  ApprovalDecisionResponse,
  ApprovalDecisionSuccessData,
  ApprovalErrorCode,
  ApprovalErrorPayload,
  ApprovalQueueFilters,
  ApprovalQueueItem,
  ApprovalQueueResponse,
  ApprovalRequestResponse,
  ApprovalRequestDetail,
} from '@/types/approval'

interface ApprovalReadErrorResponse {
  error: ApprovalErrorPayload
}

const DEFAULT_APPROVAL_ERROR_MESSAGE: Record<ApprovalErrorCode, string> = {
  REQUEST_NOT_FOUND: '승인 요청을 찾을 수 없습니다.',
  INVALID_TRANSITION: '요청 상태 전이가 유효하지 않습니다.',
  PERMISSION_DENIED: '승인 권한이 없습니다.',
  VALIDATION_ERROR: '입력값을 확인해 주세요.',
  INTERNAL_ERROR: '승인 처리 중 오류가 발생했습니다.',
}

function normalizeApprovalErrorCode(code: unknown): ApprovalErrorCode {
  if (
    code === 'REQUEST_NOT_FOUND' ||
    code === 'INVALID_TRANSITION' ||
    code === 'PERMISSION_DENIED' ||
    code === 'VALIDATION_ERROR' ||
    code === 'INTERNAL_ERROR'
  ) {
    return code
  }

  return 'INTERNAL_ERROR'
}

function isApprovalErrorPayload(value: unknown): value is ApprovalErrorPayload {
  if (!value || typeof value !== 'object') {
    return false
  }

  return typeof Reflect.get(value, 'code') === 'string' && typeof Reflect.get(value, 'message') === 'string'
}

function isApprovalErrorResponse(
  value: unknown,
): value is { success: false; error: ApprovalErrorPayload } {
  if (!value || typeof value !== 'object') {
    return false
  }

  return Reflect.get(value, 'success') === false && isApprovalErrorPayload(Reflect.get(value, 'error'))
}

function isApprovalReadErrorResponse(value: unknown): value is ApprovalReadErrorResponse {
  if (!value || typeof value !== 'object') {
    return false
  }

  return isApprovalErrorPayload(Reflect.get(value, 'error'))
}

async function parseInvokeContextError(error: unknown): Promise<ApprovalApiError | null> {
  if (!error || typeof error !== 'object') {
    return null
  }

  const context = Reflect.get(error, 'context')
  if (!(context instanceof Response)) {
    return null
  }

  try {
    const payload = await context.clone().json()
    if (!isApprovalErrorResponse(payload)) {
      return null
    }

    const errorCode = normalizeApprovalErrorCode(payload.error.code)
    return new ApprovalApiError(
      errorCode,
      payload.error.message || DEFAULT_APPROVAL_ERROR_MESSAGE[errorCode],
      payload.error.details,
    )
  } catch {
    return null
  }
}

export class ApprovalApiError extends Error {
  code: ApprovalErrorCode
  details?: Record<string, unknown>

  constructor(code: ApprovalErrorCode, message?: string, details?: Record<string, unknown>) {
    super(message || DEFAULT_APPROVAL_ERROR_MESSAGE[code])
    this.name = 'ApprovalApiError'
    this.code = code
    this.details = details
  }
}

function getApprovalReadBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL
  if (!baseUrl) {
    throw new Error('Missing VITE_SUPABASE_URL for approval API.')
  }

  return baseUrl.replace(/\/$/, '')
}

function getApprovalReadAnonKey(): string {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!anonKey) {
    throw new Error('Missing VITE_SUPABASE_ANON_KEY for approval API.')
  }

  return anonKey
}

async function getApprovalReadAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    throw error
  }

  const accessToken = data.session?.access_token
  if (!accessToken) {
    throw new Error('Authenticated session is required to call approval-read')
  }

  return accessToken
}

function buildApprovalReadUrl(path: string, searchParams?: URLSearchParams): string {
  const query = searchParams?.toString()
  return `${getApprovalReadBaseUrl()}/functions/v1/approval-read${path}${query ? `?${query}` : ''}`
}

async function callApprovalRead<T>(path: string, searchParams?: URLSearchParams): Promise<T> {
  const accessToken = await getApprovalReadAccessToken()
  const response = await fetch(buildApprovalReadUrl(path, searchParams), {
    method: 'GET',
    mode: 'cors',
    credentials: 'omit',
    headers: {
      apikey: getApprovalReadAnonKey(),
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const responseText = await response.text()
  let payload: unknown = null

  if (responseText) {
    try {
      payload = JSON.parse(responseText)
    } catch {
      payload = responseText
    }
  }

  if (!response.ok) {
    if (isApprovalReadErrorResponse(payload)) {
      const errorCode = normalizeApprovalErrorCode(payload.error.code)
      throw new ApprovalApiError(
        errorCode,
        payload.error.message || DEFAULT_APPROVAL_ERROR_MESSAGE[errorCode],
        payload.error.details,
      )
    }

    throw new ApprovalApiError(
      'INTERNAL_ERROR',
      `approval-read request failed with status ${response.status}`,
    )
  }

  return payload as T
}

export async function decideApproval(input: ApprovalDecisionRequest): Promise<ApprovalDecisionSuccessData> {
  const { data, error } = await supabase.functions.invoke<ApprovalDecisionResponse>('approval-decision', {
    body: input,
  })

  if (error) {
    const contextError = await parseInvokeContextError(error)
    if (contextError) {
      throw contextError
    }

    throw new ApprovalApiError('INTERNAL_ERROR', error.message || DEFAULT_APPROVAL_ERROR_MESSAGE.INTERNAL_ERROR)
  }

  if (!data) {
    throw new ApprovalApiError('INTERNAL_ERROR', 'approval-decision returned an empty response.')
  }

  if (!data.success) {
    const errorCode = normalizeApprovalErrorCode(data.error.code)
    throw new ApprovalApiError(
      errorCode,
      data.error.message || DEFAULT_APPROVAL_ERROR_MESSAGE[errorCode],
      data.error.details,
    )
  }

  return data.data
}

export async function listApprovalQueue(filters: ApprovalQueueFilters = {}): Promise<ApprovalQueueItem[]> {
  const searchParams = new URLSearchParams()
  if (filters.status) {
    searchParams.set('status', filters.status)
  }
  if (filters.organizationId) {
    searchParams.set('organizationId', filters.organizationId)
  }
  const trimmedKeyword = filters.keyword?.trim()
  if (trimmedKeyword) {
    searchParams.set('keyword', trimmedKeyword)
  }

  const payload = await callApprovalRead<ApprovalQueueResponse>('/queue', searchParams)
  return payload.items
}

export async function getApprovalRequest(signupRequestId: string): Promise<ApprovalRequestDetail | null> {
  const trimmedSignupRequestId = signupRequestId.trim()
  if (!trimmedSignupRequestId) {
    throw new ApprovalApiError('VALIDATION_ERROR', 'signupRequestId is required')
  }

  const searchParams = new URLSearchParams({
    signupRequestId: trimmedSignupRequestId,
  })
  const payload = await callApprovalRead<ApprovalRequestResponse>('/request', searchParams)
  return payload.request
}
