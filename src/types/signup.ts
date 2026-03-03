export type SignupRole = 'admin' | 'user';

export type SignupPath = 'admin_submit' | 'user_invite_redeem';

export type SignupRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'withdrawn';

export type MembershipStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'none';

export type SignupErrorCode =
  | 'INVALID_ROLE'
  | 'INVALID_INVITE_CODE'
  | 'HOSPITAL_REQUIRED'
  | 'DUPLICATE_REQUEST'
  | 'VALIDATION_ERROR'
  | 'PERMISSION_DENIED'
  | 'INTERNAL_ERROR';

export interface SignupSubmitCommonRequest {
  email: string;
  password: string;
  name: string;
  role: SignupRole;
  requestedRole?: SignupRole;
}

export interface SignupSubmitAdminRequest extends SignupSubmitCommonRequest {
  role: 'admin';
  hospitalId?: string;
  organizationId?: string;
  organizationSelectionMode?: 'existing' | 'create_new';
  organizationDraftId?: string;
  workType?: string;
  shiftType?: string;
  requestedSiteName?: string;
  requestedSkillSummary?: string;
  requestedRankCode?: string;
  requestedCredit?: number;
}

export interface SignupSubmitUserRequest extends SignupSubmitCommonRequest {
  role: 'user';
  inviteCode: string;
  organizationSelectionMode?: 'existing';
}

export type SignupSubmitRequest = SignupSubmitAdminRequest | SignupSubmitUserRequest;

export interface SignupSubmitSuccessData {
  path: SignupPath;
  signupRequestStatus: SignupRequestStatus;
  membershipStatus: MembershipStatus;
  signupRequestId?: string;
  organizationId?: string;
}

export interface SignupSubmitError {
  code: SignupErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface SignupSubmitSuccessResponse {
  success: true;
  data: SignupSubmitSuccessData;
}

export interface SignupSubmitErrorResponse {
  success: false;
  error: SignupSubmitError;
}

export type SignupSubmitResponse = SignupSubmitSuccessResponse | SignupSubmitErrorResponse;

export const SIGNUP_ERROR_MESSAGES: Record<SignupErrorCode, string> = {
  INVALID_ROLE: '가입 역할이 올바르지 않습니다.',
  INVALID_INVITE_CODE: '초대코드가 유효하지 않습니다.',
  HOSPITAL_REQUIRED: '관리자 가입에는 병원(조직) 선택이 필요합니다.',
  DUPLICATE_REQUEST: '동일한 가입 신청이 이미 접수되어 있습니다.',
  VALIDATION_ERROR: '입력값을 확인해주세요.',
  PERMISSION_DENIED: '요청 권한이 없습니다.',
  INTERNAL_ERROR: '가입 처리 중 오류가 발생했습니다.',
};

export const LEGACY_SIGNUP_ERROR_CODE_MAP: Record<string, SignupErrorCode> = {
  DUPLICATE_PENDING_REQUEST: 'DUPLICATE_REQUEST',
  ORGANIZATION_REQUIRED: 'HOSPITAL_REQUIRED',
  INVITE_NOT_FOUND: 'INVALID_INVITE_CODE',
  INVITE_EXPIRED: 'INVALID_INVITE_CODE',
  INVITE_ALREADY_USED: 'INVALID_INVITE_CODE',
  INVITE_REVOKED: 'INVALID_INVITE_CODE',
  INVITE_ROLE_MISMATCH: 'INVALID_INVITE_CODE',
};
