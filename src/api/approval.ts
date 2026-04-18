import { supabase } from '@/api/supabase'
import type {
  ApprovalDecisionRequest,
  ApprovalDecisionResponse,
  ApprovalDecisionSuccessData,
  ApprovalErrorCode,
  ApprovalErrorPayload,
  ApprovalQueueFilters,
  ApprovalQueueItem,
  ApprovalRequestDetail,
} from '@/types/approval'

interface SignupRequestRow {
  id: string
  requester_user_id: string | null
  organization_id: string | null
  requested_role: 'admin'
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'withdrawn'
  work_type: string | null
  shift_type: string | null
  requested_site_name: string | null
  requested_skill_summary: string | null
  requested_rank_code: string | null
  requested_credit: number | null
  review_note: string | null
  created_at: string
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

function mapQueueItem(row: SignupRequestRow): ApprovalQueueItem {
  return {
    signupRequestId: row.id,
    requesterUserId: row.requester_user_id,
    requesterEmail: null,
    requesterName: null,
    organizationId: row.organization_id,
    organizationName: null,
    requestedRole: row.requested_role,
    status: row.status,
    createdAt: row.created_at,
  }
}

function mapQueueDetail(row: SignupRequestRow): ApprovalRequestDetail {
  return {
    ...mapQueueItem(row),
    workType: row.work_type,
    shiftType: row.shift_type,
    requestedSiteName: row.requested_site_name,
    requestedSkillSummary: row.requested_skill_summary,
    requestedRankCode: row.requested_rank_code,
    requestedCredit: row.requested_credit,
    reviewNote: row.review_note,
  }
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
  let query = supabase
    .from('signup_requests')
    .select(
      'id, requester_user_id, organization_id, requested_role, status, work_type, shift_type, requested_site_name, requested_skill_summary, requested_rank_code, requested_credit, review_note, created_at',
    )
    .eq('requested_role', 'admin')
    .order('created_at', { ascending: false })

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.organizationId) {
    query = query.eq('organization_id', filters.organizationId)
  }

  const trimmedKeyword = filters.keyword?.trim()
  if (trimmedKeyword) {
    query = query.ilike('requested_site_name', `%${trimmedKeyword}%`)
  }

  const { data, error } = await query.returns<SignupRequestRow[]>()

  if (error) {
    throw new ApprovalApiError('INTERNAL_ERROR', error.message || DEFAULT_APPROVAL_ERROR_MESSAGE.INTERNAL_ERROR)
  }

  return (data ?? []).map(mapQueueItem)
}

export async function getApprovalRequest(signupRequestId: string): Promise<ApprovalRequestDetail | null> {
  const trimmedSignupRequestId = signupRequestId.trim()
  if (!trimmedSignupRequestId) {
    throw new ApprovalApiError('VALIDATION_ERROR', 'signupRequestId is required')
  }

  const { data, error } = await supabase
    .from('signup_requests')
    .select(
      'id, requester_user_id, organization_id, requested_role, status, work_type, shift_type, requested_site_name, requested_skill_summary, requested_rank_code, requested_credit, review_note, created_at',
    )
    .eq('id', trimmedSignupRequestId)
    .eq('requested_role', 'admin')
    .maybeSingle<SignupRequestRow>()

  if (error) {
    throw new ApprovalApiError('INTERNAL_ERROR', error.message || DEFAULT_APPROVAL_ERROR_MESSAGE.INTERNAL_ERROR)
  }

  if (!data) {
    return null
  }

  return mapQueueDetail(data)
}
