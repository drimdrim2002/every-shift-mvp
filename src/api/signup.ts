import { supabase } from './supabase';
import type {
  SignupErrorCode,
  SignupNextState,
  SignupSubmitError,
  SignupSubmitRequest,
  SignupSubmitResolvedSuccessData,
  SignupSubmitResponse,
  SignupSubmitSuccessData,
} from '@/types/signup';
import { LEGACY_SIGNUP_ERROR_CODE_MAP, SIGNUP_ERROR_MESSAGES } from '@/types/signup';

type SignupSubmitRawSuccessData = Omit<SignupSubmitSuccessData, 'nextState'> & {
  nextState?: SignupNextState;
};

function resolveLegacySignupErrorCode(code: unknown): SignupErrorCode | null {
  if (typeof code !== 'string') {
    return null;
  }

  if (code in LEGACY_SIGNUP_ERROR_CODE_MAP) {
    const mappedCode = LEGACY_SIGNUP_ERROR_CODE_MAP[code];
    if (mappedCode) {
      return mappedCode;
    }
  }

  return null;
}

function normalizeSignupErrorCode(code: unknown, details?: Record<string, unknown>): SignupErrorCode {
  if (typeof code === 'string' && code in SIGNUP_ERROR_MESSAGES && code !== 'INTERNAL_ERROR') {
    return code as SignupErrorCode;
  }

  const reasonCode = resolveLegacySignupErrorCode(details?.reason);
  if (reasonCode) {
    return reasonCode;
  }

  if (typeof code === 'string' && code in SIGNUP_ERROR_MESSAGES) {
    return code as SignupErrorCode;
  }

  const legacyCode = resolveLegacySignupErrorCode(code);
  if (legacyCode) {
    return legacyCode;
  }

  return 'INTERNAL_ERROR';
}

function normalizeSignupRequest(request: SignupSubmitRequest): SignupSubmitRequest {
  const organizationSelectionMode = request.organizationSelectionMode ?? 'existing';

  if (request.role === 'admin') {
    const hospitalId = request.hospitalId ?? request.organizationId;
    return {
      ...request,
      requestedRole: request.role,
      organizationSelectionMode,
      hospitalId,
      organizationId: hospitalId,
    };
  }

  return {
    ...request,
    requestedRole: request.role,
    organizationSelectionMode,
  };
}

function resolveSignupNextState(data: SignupSubmitRawSuccessData): SignupNextState {
  if (data.nextState === 'pending_approval' || data.nextState === 'active') {
    return data.nextState;
  }

  if (data.signupRequestStatus === 'approved' || data.membershipStatus === 'approved') {
    return 'active';
  }

  return 'pending_approval';
}

function normalizeSignupSuccessData(
  data: SignupSubmitRawSuccessData,
  request: SignupSubmitRequest,
): SignupSubmitResolvedSuccessData {
  const nextState = resolveSignupNextState(data);

  if (request.role !== 'admin') {
    return {
      ...data,
      nextState,
    };
  }

  const requestOrganizationId = request.hospitalId ?? request.organizationId;
  if (!requestOrganizationId || data.organizationId) {
    return {
      ...data,
      nextState,
    };
  }

  return {
    ...data,
    nextState,
    organizationId: requestOrganizationId,
  };
}

function createDevMockSuccessData(request: SignupSubmitRequest): SignupSubmitResolvedSuccessData {
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

function isSignupForceRemoteEnabled(): boolean {
  const env = import.meta.env as ImportMetaEnv & { VITE_SIGNUP_FORCE_REMOTE?: string };
  return env.VITE_SIGNUP_FORCE_REMOTE === 'true';
}

function shouldBypassRemoteSignupInvoke(): boolean {
  if (isSignupForceRemoteEnabled()) {
    return false;
  }

  if (!shouldUseDevMockFallback()) {
    return false;
  }

  return true;
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
  const code = normalizeSignupErrorCode(error?.code, error?.details);
  return new SignupSubmitApiError(code, error?.message || SIGNUP_ERROR_MESSAGES[code], error?.details);
}

function isSignupSubmitErrorPayload(value: unknown): value is SignupSubmitError {
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

function isSignupSubmitErrorResponse(value: unknown): value is { success: false; error: SignupSubmitError } {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return Reflect.get(value, 'success') === false && isSignupSubmitErrorPayload(Reflect.get(value, 'error'));
}

function isContractOnlyScaffoldApiError(error: SignupSubmitApiError): boolean {
  return error.code === 'INTERNAL_ERROR' && error.details?.stage === 'contract_only_scaffold';
}

async function parseInvokeContextError(error: unknown): Promise<SignupSubmitApiError | null> {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const context = Reflect.get(error, 'context');
  if (!(context instanceof Response)) {
    return null;
  }

  try {
    const payload = await context.clone().json();
    if (!isSignupSubmitErrorResponse(payload)) {
      return null;
    }

    return toApiError(payload.error);
  } catch {
    return null;
  }
}

/**
 * signup-submit 단일 경계 API
 * - direct table fallback is intentionally forbidden.
 * - all signup submissions must go through Edge Function invoke.
 */
export async function submitSignup(request: SignupSubmitRequest): Promise<SignupSubmitResolvedSuccessData> {
  const normalizedRequest = normalizeSignupRequest(request);
  const forceRemoteInvoke = isSignupForceRemoteEnabled();

  if (shouldBypassRemoteSignupInvoke()) {
    console.info('[submitSignup] Using dev mock signup response (remote invoke bypassed).');
    return createDevMockSuccessData(normalizedRequest);
  }

  const { data, error } = await supabase.functions.invoke<SignupSubmitResponse>('signup-submit', {
    body: normalizedRequest,
  });

  if (error) {
    const contextError = await parseInvokeContextError(error);
    if (contextError) {
      if (isContractOnlyScaffoldApiError(contextError) && !forceRemoteInvoke && shouldUseDevMockFallback()) {
        console.warn('[submitSignup] Falling back to dev mock due contract-only scaffold response.');
        return createDevMockSuccessData(normalizedRequest);
      }
      throw contextError;
    }

    if (!forceRemoteInvoke && shouldUseDevMockFallback()) {
      console.warn('[submitSignup] Falling back to dev mock due invoke error:', error.message);
      return createDevMockSuccessData(normalizedRequest);
    }
    throw new SignupSubmitApiError('INTERNAL_ERROR', error.message || SIGNUP_ERROR_MESSAGES.INTERNAL_ERROR);
  }

  if (!data) {
    if (!forceRemoteInvoke && shouldUseDevMockFallback()) {
      console.warn('[submitSignup] Falling back to dev mock due empty response.');
      return createDevMockSuccessData(normalizedRequest);
    }
    throw new SignupSubmitApiError('INTERNAL_ERROR', 'signup-submit returned an empty response.');
  }

  if (!data.success) {
    const isContractOnlyScaffoldError =
      data.error.code === 'INTERNAL_ERROR' && data.error.details?.stage === 'contract_only_scaffold';

    if (isContractOnlyScaffoldError && !forceRemoteInvoke && shouldUseDevMockFallback()) {
      console.warn('[submitSignup] Falling back to dev mock due contract-only scaffold response.');
      return createDevMockSuccessData(normalizedRequest);
    }

    throw toApiError(data.error);
  }

  return normalizeSignupSuccessData(data.data as SignupSubmitRawSuccessData, normalizedRequest);
}

export function getSignupErrorMessage(code: unknown): string {
  const normalizedCode = normalizeSignupErrorCode(code);
  return SIGNUP_ERROR_MESSAGES[normalizedCode];
}
