import { supabase } from './supabase';

export type InviteCodeManageAction = 'create' | 'revoke' | 'list';
export type InviteCodeDerivedStatus = 'active' | 'expired' | 'used' | 'revoked';
export type InviteCodeRoleScope = 'user';

export type InviteCodeManageErrorCode =
  | 'VALIDATION_ERROR'
  | 'PERMISSION_DENIED'
  | 'INVITE_CODE_NOT_FOUND'
  | 'INVITE_CODE_ALREADY_REVOKED'
  | 'INTERNAL_ERROR';

export interface CreateInviteCodeRequest {
  organizationId: string;
  expiresAt: string;
  maxUses?: number;
}

export interface RevokeInviteCodeRequest {
  inviteCodeId: string;
}

export interface ListInviteCodesRequest {
  organizationId: string;
  includeInactive?: boolean;
}

export interface CreateInviteCodeSuccessData {
  action: 'create';
  inviteCodeId: string;
  organizationId: string;
  roleScope: InviteCodeRoleScope;
  rawCode: string;
  maxUses: 1;
  usedCount: 0;
  expiresAt: string;
  createdAt: string;
  createdBy: string;
  derivedStatus: 'active';
}

export interface RevokeInviteCodeSuccessData {
  action: 'revoke';
  inviteCodeId: string;
  organizationId: string;
  revokedAt: string;
  derivedStatus: 'revoked';
}

export interface InviteCodeListItem {
  inviteCodeId: string;
  roleScope: InviteCodeRoleScope;
  maxUses: 1;
  usedCount: 0 | 1;
  expiresAt: string;
  revokedAt: string | null;
  usedAt: string | null;
  createdAt: string;
  createdBy: string;
  derivedStatus: InviteCodeDerivedStatus;
}

export interface ListInviteCodeSuccessData {
  action: 'list';
  organizationId: string;
  items: InviteCodeListItem[];
}

export type InviteCodeManageSuccessData =
  | CreateInviteCodeSuccessData
  | RevokeInviteCodeSuccessData
  | ListInviteCodeSuccessData;

export interface InviteCodeManageErrorPayload {
  code: InviteCodeManageErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

interface InviteCodeManageSuccessResponse {
  success: true;
  data: InviteCodeManageSuccessData;
}

interface InviteCodeManageErrorResponse {
  success: false;
  error: InviteCodeManageErrorPayload;
}

type InviteCodeManageResponse = InviteCodeManageSuccessResponse | InviteCodeManageErrorResponse;

const INVITE_CODE_MANAGE_ERROR_MESSAGES: Record<InviteCodeManageErrorCode, string> = {
  VALIDATION_ERROR: '요청 데이터를 확인해주세요.',
  PERMISSION_DENIED: '초대코드 관리 권한이 없습니다.',
  INVITE_CODE_NOT_FOUND: '초대코드를 찾을 수 없습니다.',
  INVITE_CODE_ALREADY_REVOKED: '이미 폐기된 초대코드입니다.',
  INTERNAL_ERROR: '초대코드 처리 중 오류가 발생했습니다.',
};

export class InviteCodeManageApiError extends Error {
  code: InviteCodeManageErrorCode;
  details?: Record<string, unknown>;

  constructor(code: InviteCodeManageErrorCode, message?: string, details?: Record<string, unknown>) {
    super(message || INVITE_CODE_MANAGE_ERROR_MESSAGES[code]);
    this.name = 'InviteCodeManageApiError';
    this.code = code;
    this.details = details;
  }
}

function normalizeInviteCodeManageErrorCode(code: unknown): InviteCodeManageErrorCode {
  if (typeof code === 'string' && code in INVITE_CODE_MANAGE_ERROR_MESSAGES) {
    return code as InviteCodeManageErrorCode;
  }

  return 'INTERNAL_ERROR';
}

function toApiError(error: InviteCodeManageErrorPayload | null | undefined): InviteCodeManageApiError {
  const code = normalizeInviteCodeManageErrorCode(error?.code);
  return new InviteCodeManageApiError(
    code,
    error?.message || INVITE_CODE_MANAGE_ERROR_MESSAGES[code],
    error?.details
  );
}

function isErrorPayload(value: unknown): value is InviteCodeManageErrorPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const code = Reflect.get(value, 'code');
  const message = Reflect.get(value, 'message');
  const details = Reflect.get(value, 'details');

  if (typeof code !== 'string' || typeof message !== 'string') {
    return false;
  }

  if (details === undefined) {
    return true;
  }

  return Boolean(details) && typeof details === 'object';
}

function isErrorResponse(value: unknown): value is { success: false; error: InviteCodeManageErrorPayload } {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return Reflect.get(value, 'success') === false && isErrorPayload(Reflect.get(value, 'error'));
}

function isSuccessResponse(value: unknown): value is { success: true; data: InviteCodeManageSuccessData } {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return Reflect.get(value, 'success') === true && Boolean(Reflect.get(value, 'data'));
}

async function parseInvokeContextError(error: unknown): Promise<InviteCodeManageApiError | null> {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const context = Reflect.get(error, 'context');
  if (!(context instanceof Response)) {
    return null;
  }

  try {
    const payload = await context.clone().json();
    if (!isErrorResponse(payload)) {
      return null;
    }
    return toApiError(payload.error);
  } catch {
    return null;
  }
}

async function invokeInviteCodeManage(
  body:
    | ({ action: 'create' } & CreateInviteCodeRequest)
    | ({ action: 'revoke' } & RevokeInviteCodeRequest)
    | ({ action: 'list' } & ListInviteCodesRequest)
): Promise<InviteCodeManageSuccessData> {
  const { data, error } = await supabase.functions.invoke<InviteCodeManageResponse>('invite-code-manage', {
    body,
  });

  if (error) {
    const contextError = await parseInvokeContextError(error);
    if (contextError) {
      throw contextError;
    }
    throw new InviteCodeManageApiError('INTERNAL_ERROR', error.message);
  }

  if (!data) {
    throw new InviteCodeManageApiError('INTERNAL_ERROR', 'invite-code-manage returned an empty response.');
  }

  if (isErrorResponse(data)) {
    throw toApiError(data.error);
  }

  if (!isSuccessResponse(data)) {
    throw new InviteCodeManageApiError('INTERNAL_ERROR', 'invite-code-manage returned malformed response.');
  }

  return data.data;
}

export async function createInviteCode(
  request: CreateInviteCodeRequest
): Promise<CreateInviteCodeSuccessData> {
  const result = await invokeInviteCodeManage({
    action: 'create',
    ...request,
  });

  if (result.action !== 'create') {
    throw new InviteCodeManageApiError('INTERNAL_ERROR', 'invite-code-manage returned unexpected action.');
  }

  return result;
}

export async function revokeInviteCode(
  request: RevokeInviteCodeRequest
): Promise<RevokeInviteCodeSuccessData> {
  const result = await invokeInviteCodeManage({
    action: 'revoke',
    ...request,
  });

  if (result.action !== 'revoke') {
    throw new InviteCodeManageApiError('INTERNAL_ERROR', 'invite-code-manage returned unexpected action.');
  }

  return result;
}

export async function listInviteCodes(
  request: ListInviteCodesRequest
): Promise<ListInviteCodeSuccessData> {
  const result = await invokeInviteCodeManage({
    action: 'list',
    ...request,
  });

  if (result.action !== 'list') {
    throw new InviteCodeManageApiError('INTERNAL_ERROR', 'invite-code-manage returned unexpected action.');
  }

  return result;
}
