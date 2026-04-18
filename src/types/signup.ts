export type SignupRole = 'admin' | 'user'

export type SignupNextState = 'pending_approval' | 'active'

export type SignupSubmitPath = 'admin_submit' | 'user_invite_redeem'

export type SignupRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'withdrawn'

export type SignupMembershipStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'withdrawn'

export type SignupErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_INVITE_CODE'
  | 'DUPLICATE_REQUEST'
  | 'INTERNAL_ERROR'

export interface SignupSubmitRequest {
  role: SignupRole
  requestedRole?: SignupRole
  name: string
  email: string
  password: string
  inviteCode?: string
  organizationSelectionMode?: 'existing'
  hospitalId?: string
  hospitalName?: string
  hospitalSource?: 'data.go.kr'
  organizationId?: string
}

export interface SignupSubmitSuccessData {
  path: SignupSubmitPath
  nextState?: SignupNextState
  signupRequestStatus: SignupRequestStatus
  membershipStatus: SignupMembershipStatus
  organizationId?: string
}

export interface SignupSubmitResolvedSuccessData extends SignupSubmitSuccessData {
  nextState: SignupNextState
}

export interface SignupSubmitError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export type SignupSubmitResponse =
  | {
      success: true
      data: SignupSubmitSuccessData
    }
  | {
      success: false
      error: SignupSubmitError
    }

export const SIGNUP_ERROR_MESSAGES: Record<SignupErrorCode, string> = {
  VALIDATION_ERROR: '입력값을 다시 확인해주세요.',
  INVALID_INVITE_CODE: '초대코드가 유효하지 않습니다.',
  DUPLICATE_REQUEST: '동일한 가입 신청이 이미 접수되어 있습니다.',
  INTERNAL_ERROR: '회원가입 처리 중 오류가 발생했습니다.',
}

export const LEGACY_SIGNUP_ERROR_CODE_MAP: Record<string, SignupErrorCode | null> = {
  INVALID_INVITE_CODE: 'INVALID_INVITE_CODE',
  INVITE_EXPIRED: 'INVALID_INVITE_CODE',
  INVITE_NOT_FOUND: 'INVALID_INVITE_CODE',
  INVITE_REVOKED: 'INVALID_INVITE_CODE',
  INVITE_ALREADY_USED: 'INVALID_INVITE_CODE',
  DUPLICATE_REQUEST: 'DUPLICATE_REQUEST',
  DUPLICATE_PENDING_REQUEST: 'DUPLICATE_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
}
