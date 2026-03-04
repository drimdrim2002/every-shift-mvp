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
      const mappedCode = LEGACY_SIGNUP_ERROR_CODE_MAP[code];
      if (mappedCode) {
        return mappedCode;
      }
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

function createDevMockSuccessData(request: SignupSubmitRequest): SignupSubmitSuccessData {
  if (request.role === 'admin') {
    const organizationId = request.hospitalId ?? request.organizationId;
    return {
      path: 'admin_submit',
      nextState: 'pending_approval',
      signupRequestStatus: 'pending',
      membershipStatus: 'none',
      organizationId,
    };
  }

  return {
    path: 'user_invite_redeem',
    nextState: 'active',
    signupRequestStatus: 'approved',
    membershipStatus: 'approved',
  };
}

function shouldUseDevMockFallback(): boolean {
  const env = import.meta.env as ImportMetaEnv & { VITE_ENABLE_MOCK_SIGNUP?: string };
  return env.DEV || env.VITE_ENABLE_MOCK_SIGNUP === 'true';
}

function shouldBypassRemoteSignupInvoke(): boolean {
  const env = import.meta.env as ImportMetaEnv & { VITE_SIGNUP_FORCE_REMOTE?: string };

  if (!shouldUseDevMockFallback()) {
    return false;
  }

  return env.VITE_SIGNUP_FORCE_REMOTE !== 'true';
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

  if (shouldBypassRemoteSignupInvoke()) {
    console.info('[submitSignup] Using dev mock signup response (remote invoke bypassed).');
    return createDevMockSuccessData(normalizedRequest);
  }

  const { data, error } = await supabase.functions.invoke<SignupSubmitResponse>('signup-submit', {
    body: normalizedRequest,
  });

  if (error) {
    if (shouldUseDevMockFallback()) {
      console.warn('[submitSignup] Falling back to dev mock due invoke error:', error.message);
      return createDevMockSuccessData(normalizedRequest);
    }
    throw new SignupSubmitApiError('INTERNAL_ERROR', error.message || SIGNUP_ERROR_MESSAGES.INTERNAL_ERROR);
  }

  if (!data) {
    if (shouldUseDevMockFallback()) {
      console.warn('[submitSignup] Falling back to dev mock due empty response.');
      return createDevMockSuccessData(normalizedRequest);
    }
    throw new SignupSubmitApiError('INTERNAL_ERROR', 'signup-submit returned an empty response.');
  }

  if (!data.success) {
    const isContractOnlyScaffoldError =
      data.error.code === 'INTERNAL_ERROR' && data.error.details?.stage === 'contract_only_scaffold';

    if (isContractOnlyScaffoldError && shouldUseDevMockFallback()) {
      console.warn('[submitSignup] Falling back to dev mock due contract-only scaffold response.');
      return createDevMockSuccessData(normalizedRequest);
    }

    throw toApiError(data.error);
  }

  return data.data;
}

export function getSignupErrorMessage(code: unknown): string {
  const normalizedCode = normalizeSignupErrorCode(code);
  return SIGNUP_ERROR_MESSAGES[normalizedCode];
}
