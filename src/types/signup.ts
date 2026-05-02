export type SignupRole = 'admin' | 'user'

export type SignupAuthMode = 'password' | 'existing_session'

export type SignupNextState = 'pending_approval' | 'active'

export type SignupOrganizationSelectionMode = 'existing' | 'manual'

export type SignupHospitalSource = 'data.go.kr' | 'manual'

export type SignupSubmitPath = 'admin_submit' | 'user_invite_redeem'

export type SignupRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'withdrawn'

export type SignupMembershipStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'withdrawn'

export type SignupErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_INVITE_CODE'
  | 'DUPLICATE_REQUEST'
  | 'OAUTH_EMAIL_REQUIRED'
  | 'AUTH_SESSION_REQUIRED'
  | 'INTERNAL_ERROR'

interface SignupSubmitRequestBase {
  role: SignupRole
  requestedRole?: SignupRole
  name: string
  inviteCode?: string
  organizationSelectionMode?: SignupOrganizationSelectionMode
  hospitalId?: string
  hospitalName?: string
  hospitalSource?: SignupHospitalSource
  organizationId?: string
}

export type PasswordSignupSubmitRequest = SignupSubmitRequestBase & {
  authMode?: 'password'
  email: string
  password: string
}

export type ExistingSessionSignupSubmitRequest = SignupSubmitRequestBase & {
  authMode: 'existing_session'
}

export type SignupSubmitRequest =
  | PasswordSignupSubmitRequest
  | ExistingSessionSignupSubmitRequest

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
  OAUTH_EMAIL_REQUIRED: '소셜 계정에서 이메일을 확인할 수 없습니다.',
  AUTH_SESSION_REQUIRED: '인증 세션이 만료되었습니다. 다시 로그인해 주세요.',
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
