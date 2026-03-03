import { supabase } from './supabase';
import type {
  SignupErrorCode,
  SignupSubmitError,
  SignupSubmitRequest,
  SignupSubmitResponse,
  SignupSubmitSuccessData,
} from '@/types/signup';
import { LEGACY_SIGNUP_ERROR_CODE_MAP, SIGNUP_ERROR_MESSAGES } from '@/types/signup';

function normalizeSignupErrorCode(code: unknown): SignupErrorCode {
  if (typeof code === 'string') {
    if (code in SIGNUP_ERROR_MESSAGES) {
      return code as SignupErrorCode;
    }
    if (code in LEGACY_SIGNUP_ERROR_CODE_MAP) {
      return LEGACY_SIGNUP_ERROR_CODE_MAP[code];
    }
  }
  return 'INTERNAL_ERROR';
}

function normalizeSignupRequest(request: SignupSubmitRequest): SignupSubmitRequest {
  if (request.role === 'admin') {
    const hospitalId = request.hospitalId ?? request.organizationId;
    return {
      ...request,
      requestedRole: request.role,
      hospitalId,
      organizationId: hospitalId,
    };
  }

  return {
    ...request,
    requestedRole: request.role,
  };
}

export class SignupSubmitApiError extends Error {
  code: SignupErrorCode;
  details?: Record<string, unknown>;

  constructor(code: SignupErrorCode, message?: string, details?: Record<string, unknown>) {
    super(message || SIGNUP_ERROR_MESSAGES[code]);
    this.name = 'SignupSubmitApiError';
    this.code = code;
    this.details = details;
  }
}

function toApiError(error: SignupSubmitError | null | undefined): SignupSubmitApiError {
  const code = normalizeSignupErrorCode(error?.code);
  return new SignupSubmitApiError(code, error?.message || SIGNUP_ERROR_MESSAGES[code], error?.details);
}

/**
 * signup-submit 단일 경계 API
 * - direct table fallback is intentionally forbidden.
 * - all signup submissions must go through Edge Function invoke.
 */
export async function submitSignup(request: SignupSubmitRequest): Promise<SignupSubmitSuccessData> {
  const normalizedRequest = normalizeSignupRequest(request);

  const { data, error } = await supabase.functions.invoke<SignupSubmitResponse>('signup-submit', {
    body: normalizedRequest,
  });

  if (error) {
    throw new SignupSubmitApiError('INTERNAL_ERROR', error.message || SIGNUP_ERROR_MESSAGES.INTERNAL_ERROR);
  }

  if (!data) {
    throw new SignupSubmitApiError('INTERNAL_ERROR', 'signup-submit returned an empty response.');
  }

  if (!data.success) {
    throw toApiError(data.error);
  }

  return data.data;
}

export function getSignupErrorMessage(code: unknown): string {
  const normalizedCode = normalizeSignupErrorCode(code);
  return SIGNUP_ERROR_MESSAGES[normalizedCode];
}
