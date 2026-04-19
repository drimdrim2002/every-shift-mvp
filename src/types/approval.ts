export type ApprovalDecision = 'approve' | 'reject'

export type ApprovalQueueStatus = 'pending' | 'approved' | 'rejected'

export type ApprovalRequestStatus =
  | ApprovalQueueStatus
  | 'expired'
  | 'withdrawn'

export type ApprovalMembershipStatus = 'approved' | 'rejected' | 'none'

export type ApprovalErrorCode =
  | 'REQUEST_NOT_FOUND'
  | 'INVALID_TRANSITION'
  | 'PERMISSION_DENIED'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'

export interface ApprovalQueueFilters {
  status?: ApprovalQueueStatus
  organizationId?: string
  keyword?: string
}

export interface ApprovalQueueItem {
  signupRequestId: string
  requesterUserId: string | null
  requesterEmail: string | null
  requesterName: string | null
  organizationId: string | null
  organizationName: string | null
  requestedRole: 'admin'
  status: ApprovalRequestStatus
  createdAt: string
}

export interface ApprovalRequestDetail extends ApprovalQueueItem {
  requestedHospitalName: string | null
  reviewNote: string | null
}

export interface ApprovalDecisionRequest {
  signupRequestId: string
  decision: ApprovalDecision
  reviewNote?: string
}

export interface ApprovalDecisionSuccessData {
  signupRequestId: string
  decision: ApprovalDecision
  requestStatus: Extract<ApprovalRequestStatus, 'approved' | 'rejected'>
  membershipStatus: ApprovalMembershipStatus
  organizationId: string | null
  membershipId: string | null
  decidedAt: string
  alreadyProcessed: boolean
}

export interface ApprovalErrorPayload {
  code: ApprovalErrorCode
  message: string
  details?: Record<string, unknown>
}

export interface ApprovalDecisionSuccessResponse {
  success: true
  data: ApprovalDecisionSuccessData
}

export interface ApprovalDecisionErrorResponse {
  success: false
  error: ApprovalErrorPayload
}

export interface ApprovalQueueResponse {
  items: ApprovalQueueItem[]
}

export interface ApprovalRequestResponse {
  request: ApprovalRequestDetail | null
}

export type ApprovalDecisionResponse =
  | ApprovalDecisionSuccessResponse
  | ApprovalDecisionErrorResponse
