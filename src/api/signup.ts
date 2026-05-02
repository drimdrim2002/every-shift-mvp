import { supabase } from './supabase'
import type {
  SignupErrorCode,
  SignupNextState,
  SignupSubmitError,
  SignupSubmitRequest,
  SignupSubmitResolvedSuccessData,
  SignupSubmitResponse,
  SignupSubmitSuccessData,
} from '@/types/signup'
import { LEGACY_SIGNUP_ERROR_CODE_MAP, SIGNUP_ERROR_MESSAGES } from '@/types/signup'

type SignupSubmitRawSuccessData = Omit<SignupSubmitSuccessData, 'nextState'> & {
  nextState?: SignupNextState
}

type SignupSubmitHeaders = {
  Authorization: string
}

function resolveLegacySignupErrorCode(code: unknown): SignupErrorCode | null {
  if (typeof code !== 'string') {
    return null
  }

  return LEGACY_SIGNUP_ERROR_CODE_MAP[code] ?? null
}

function normalizeSignupErrorCode(
  code: unknown,
  details?: Record<string, unknown>,
): SignupErrorCode {
  if (typeof code === 'string' && code in SIGNUP_ERROR_MESSAGES && code !== 'INTERNAL_ERROR') {
    return code as SignupErrorCode
  }

  const reasonCode = resolveLegacySignupErrorCode(details?.reason)
  if (reasonCode) {
    return reasonCode
  }

  const legacyCode = resolveLegacySignupErrorCode(code)
  if (legacyCode) {
    return legacyCode
  }

  return 'INTERNAL_ERROR'
}

function normalizeSignupRequest(request: SignupSubmitRequest): SignupSubmitRequest {
  if (request.role === 'admin') {
    const hospitalId = request.hospitalId ?? request.organizationId

    if (!hospitalId) {
      return {
        ...request,
        requestedRole: request.role,
        organizationSelectionMode: 'manual',
        hospitalSource: 'manual',
      }
    }

    return {
      ...request,
      requestedRole: request.role,
      organizationSelectionMode: 'existing',
      hospitalSource: 'data.go.kr',
      hospitalId,
      organizationId: hospitalId,
    }
  }

  return {
    ...request,
    requestedRole: request.role,
    organizationSelectionMode: 'existing',
  }
}

function resolveSignupNextState(data: SignupSubmitRawSuccessData): SignupNextState {
  if (data.nextState === 'pending_approval' || data.nextState === 'active') {
    return data.nextState
  }

  if (data.signupRequestStatus === 'approved' || data.membershipStatus === 'approved') {
    return 'active'
  }

  return 'pending_approval'
}

function normalizeSignupSuccessData(
  data: SignupSubmitRawSuccessData,
  request: SignupSubmitRequest,
): SignupSubmitResolvedSuccessData {
  const nextState = resolveSignupNextState(data)
  const requestOrganizationId = request.hospitalId ?? request.organizationId

  if (request.role !== 'admin' || data.organizationId || !requestOrganizationId) {
    return {
      ...data,
      nextState,
    }
  }

  return {
    ...data,
    nextState,
    organizationId: requestOrganizationId,
  }
}

function createDevMockSuccessData(request: SignupSubmitRequest): SignupSubmitResolvedSuccessData {
  if (request.role === 'admin') {
    const organizationId = request.hospitalId ?? request.organizationId
    return {
      path: 'admin_submit',
      nextState: 'pending_approval',
      signupRequestStatus: 'pending',
      membershipStatus: 'none',
      organizationId,
    }
  }

  return {
    path: 'user_invite_redeem',
    nextState: 'active',
    signupRequestStatus: 'approved',
    membershipStatus: 'approved',
  }
}

function shouldUseDevMockFallback(): boolean {
  const env = import.meta.env as ImportMetaEnv & { VITE_ENABLE_MOCK_SIGNUP?: string }
  return env.VITE_ENABLE_MOCK_SIGNUP === 'true'
}

function isSignupForceRemoteEnabled(): boolean {
  const env = import.meta.env as ImportMetaEnv & { VITE_SIGNUP_FORCE_REMOTE?: string }
  return env.VITE_SIGNUP_FORCE_REMOTE === 'true'
}

function shouldBypassRemoteSignupInvoke(): boolean {
  if (isSignupForceRemoteEnabled()) {
    return false
  }

  return shouldUseDevMockFallback()
}

async function resolveExistingSessionHeaders(
  request: SignupSubmitRequest,
): Promise<SignupSubmitHeaders | undefined> {
  if (request.authMode !== 'existing_session') {
    return undefined
  }

  const { data, error } = await supabase.auth.getSession()
  if (error) {
    throw error
  }

  const accessToken = data.session?.access_token
  if (!accessToken) {
    throw new SignupSubmitApiError('AUTH_SESSION_REQUIRED')
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  }
}

export class SignupSubmitApiError extends Error {
  code: SignupErrorCode
  details?: Record<string, unknown>

  constructor(code: SignupErrorCode, message?: string, details?: Record<string, unknown>) {
    super(message || SIGNUP_ERROR_MESSAGES[code])
    this.name = 'SignupSubmitApiError'
    this.code = code
    this.details = details
  }
}

function toApiError(error: SignupSubmitError | null | undefined): SignupSubmitApiError {
  const code = normalizeSignupErrorCode(error?.code, error?.details)
  return new SignupSubmitApiError(
    code,
    error?.message || SIGNUP_ERROR_MESSAGES[code],
    error?.details,
  )
}

function isSignupSubmitErrorPayload(value: unknown): value is SignupSubmitError {
  if (!value || typeof value !== 'object') {
    return false
  }

  const code = Reflect.get(value, 'code')
  const message = Reflect.get(value, 'message')
  const details = Reflect.get(value, 'details')

  if (typeof code !== 'string' || typeof message !== 'string') {
    return false
  }

  return details === undefined || (Boolean(details) && typeof details === 'object')
}

function isSignupSubmitErrorResponse(
  value: unknown,
): value is { success: false; error: SignupSubmitError } {
  if (!value || typeof value !== 'object') {
    return false
  }

  return Reflect.get(value, 'success') === false && isSignupSubmitErrorPayload(Reflect.get(value, 'error'))
}

function isContractOnlyScaffoldApiError(error: SignupSubmitApiError): boolean {
  return error.code === 'INTERNAL_ERROR' && error.details?.stage === 'contract_only_scaffold'
}

async function parseInvokeContextError(error: unknown): Promise<SignupSubmitApiError | null> {
  if (!error || typeof error !== 'object') {
    return null
  }

  const context = Reflect.get(error, 'context')
  if (!(context instanceof Response)) {
    return null
  }

  try {
    const payload = await context.clone().json()
    if (!isSignupSubmitErrorResponse(payload)) {
      return null
    }

    return toApiError(payload.error)
  } catch {
    return null
  }
}

export function getSignupErrorMessage(code: SignupErrorCode | string | undefined): string {
  const normalizedCode = normalizeSignupErrorCode(code)
  return SIGNUP_ERROR_MESSAGES[normalizedCode]
}

export async function submitSignup(
  request: SignupSubmitRequest,
): Promise<SignupSubmitResolvedSuccessData> {
  const normalizedRequest = normalizeSignupRequest(request)
  const forceRemoteInvoke = isSignupForceRemoteEnabled()

  if (shouldBypassRemoteSignupInvoke()) {
    return createDevMockSuccessData(normalizedRequest)
  }

  const headers = await resolveExistingSessionHeaders(normalizedRequest)

  const { data, error } = await supabase.functions.invoke<SignupSubmitResponse>('signup-submit', {
    body: normalizedRequest,
    ...(headers ? { headers } : {}),
  })

  if (error) {
    const contextError = await parseInvokeContextError(error)
    if (contextError) {
      if (
        isContractOnlyScaffoldApiError(contextError) &&
        !forceRemoteInvoke &&
        shouldUseDevMockFallback()
      ) {
        return createDevMockSuccessData(normalizedRequest)
      }

      throw contextError
    }

    if (!forceRemoteInvoke && shouldUseDevMockFallback()) {
      return createDevMockSuccessData(normalizedRequest)
    }

    throw new SignupSubmitApiError('INTERNAL_ERROR', error.message || SIGNUP_ERROR_MESSAGES.INTERNAL_ERROR)
  }

  if (!data) {
    throw new SignupSubmitApiError('INTERNAL_ERROR')
  }

  if (!data.success) {
    const apiError = toApiError(data.error)
    if (
      isContractOnlyScaffoldApiError(apiError) &&
      !forceRemoteInvoke &&
      shouldUseDevMockFallback()
    ) {
      return createDevMockSuccessData(normalizedRequest)
    }
    throw apiError
  }

  return normalizeSignupSuccessData(data.data, normalizedRequest)
}
