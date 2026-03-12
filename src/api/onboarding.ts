import { supabase } from '@/api/supabase'
import type {
  OnboardingProgressAction,
  OnboardingProgressErrorCode,
  OnboardingProgressErrorPayload,
  OnboardingProgressState,
  OnboardingProgressSuccessData,
  OnboardingProgressTransition,
  OnboardingStepKey,
} from '@/types/onboarding'

const ONBOARDING_PROGRESS_ERROR_MESSAGES: Record<OnboardingProgressErrorCode, string> = {
  VALIDATION_ERROR: '온보딩 요청 데이터를 확인해주세요.',
  PERMISSION_DENIED: '온보딩 진행 상태를 조회하거나 수정할 권한이 없습니다.',
  FORBIDDEN_STATE_TRANSITION: '현재 단계에서는 요청한 온보딩 변경을 수행할 수 없습니다.',
  METHOD_NOT_ALLOWED: '지원하지 않는 온보딩 요청 방식입니다.',
  INTERNAL_ERROR: '온보딩 진행 상태를 처리하는 중 오류가 발생했습니다.',
}

interface OnboardingProgressSuccessResponse {
  success: true
  data: OnboardingProgressSuccessData
}

interface OnboardingProgressErrorResponse {
  success: false
  error: OnboardingProgressErrorPayload
}

type OnboardingProgressResponse =
  | OnboardingProgressSuccessResponse
  | OnboardingProgressErrorResponse

interface GetOnboardingProgressRequest {
  action: 'get'
}

interface UpdateOnboardingProgressRequest {
  action: 'update'
  stepKey: OnboardingStepKey
}

interface CompleteOnboardingProgressRequest {
  action: 'complete'
}

function isStepKey(value: unknown): value is OnboardingStepKey {
  return (
    value === 'organization_info' || value === 'employee_seed' || value === 'schedule_request'
  )
}

function isTransitionType(value: unknown): boolean {
  return value === 'noop' || value === 'advance' || value === 'complete'
}

function isProgressState(value: unknown): value is OnboardingProgressState {
  if (!value || typeof value !== 'object') {
    return false
  }

  const organizationId = Reflect.get(value, 'organizationId')
  const currentStepKey = Reflect.get(value, 'currentStepKey')
  const completedStepKeys = Reflect.get(value, 'completedStepKeys')
  const isOnboardingComplete = Reflect.get(value, 'isOnboardingComplete')
  const completedAt = Reflect.get(value, 'completedAt')

  return (
    typeof organizationId === 'string' &&
    (currentStepKey === null || isStepKey(currentStepKey)) &&
    Array.isArray(completedStepKeys) &&
    completedStepKeys.every((stepKey) => isStepKey(stepKey)) &&
    typeof isOnboardingComplete === 'boolean' &&
    (completedAt === null || typeof completedAt === 'string')
  )
}

function isProgressTransition(value: unknown): value is OnboardingProgressTransition {
  if (!value || typeof value !== 'object') {
    return false
  }

  const type = Reflect.get(value, 'type')
  const requestedStepKey = Reflect.get(value, 'requestedStepKey')
  const previousCurrentStepKey = Reflect.get(value, 'previousCurrentStepKey')
  const resultingCurrentStepKey = Reflect.get(value, 'resultingCurrentStepKey')
  const isOnboardingComplete = Reflect.get(value, 'isOnboardingComplete')

  return (
    isTransitionType(type) &&
    (requestedStepKey === null || isStepKey(requestedStepKey)) &&
    (previousCurrentStepKey === null || isStepKey(previousCurrentStepKey)) &&
    (resultingCurrentStepKey === null || isStepKey(resultingCurrentStepKey)) &&
    typeof isOnboardingComplete === 'boolean'
  )
}

function normalizeOnboardingProgressErrorCode(code: unknown): OnboardingProgressErrorCode {
  if (typeof code === 'string' && code in ONBOARDING_PROGRESS_ERROR_MESSAGES) {
    return code as OnboardingProgressErrorCode
  }

  return 'INTERNAL_ERROR'
}

function toApiError(
  error: OnboardingProgressErrorPayload | null | undefined,
): OnboardingProgressApiError {
  const code = normalizeOnboardingProgressErrorCode(error?.code)
  return new OnboardingProgressApiError(
    code,
    error?.message || ONBOARDING_PROGRESS_ERROR_MESSAGES[code],
    error?.details,
  )
}

function isErrorPayload(value: unknown): value is OnboardingProgressErrorPayload {
  if (!value || typeof value !== 'object') {
    return false
  }

  const code = Reflect.get(value, 'code')
  const message = Reflect.get(value, 'message')
  const details = Reflect.get(value, 'details')

  if (typeof code !== 'string' || typeof message !== 'string') {
    return false
  }

  if (details === undefined) {
    return true
  }

  return Boolean(details) && typeof details === 'object'
}

function isSuccessData(value: unknown): value is OnboardingProgressSuccessData {
  if (!value || typeof value !== 'object') {
    return false
  }

  const action = Reflect.get(value, 'action')
  const progress = Reflect.get(value, 'progress')
  const transition = Reflect.get(value, 'transition')

  return (
    (action === 'get' || action === 'update' || action === 'complete') &&
    isProgressState(progress) &&
    (transition === null || isProgressTransition(transition))
  )
}

function isErrorResponse(value: unknown): value is OnboardingProgressErrorResponse {
  if (!value || typeof value !== 'object') {
    return false
  }

  return Reflect.get(value, 'success') === false && isErrorPayload(Reflect.get(value, 'error'))
}

function isSuccessResponse(value: unknown): value is OnboardingProgressSuccessResponse {
  if (!value || typeof value !== 'object') {
    return false
  }

  return Reflect.get(value, 'success') === true && isSuccessData(Reflect.get(value, 'data'))
}

async function parseInvokeContextError(
  error: unknown,
): Promise<OnboardingProgressApiError | null> {
  if (!error || typeof error !== 'object') {
    return null
  }

  const context = Reflect.get(error, 'context')
  if (!(context instanceof Response)) {
    return null
  }

  try {
    const payload = await context.clone().json()
    if (!isErrorResponse(payload)) {
      return null
    }

    return toApiError(payload.error)
  } catch {
    return null
  }
}

export class OnboardingProgressApiError extends Error {
  code: OnboardingProgressErrorCode
  details?: Record<string, unknown>

  constructor(
    code: OnboardingProgressErrorCode,
    message?: string,
    details?: Record<string, unknown>,
  ) {
    super(message || ONBOARDING_PROGRESS_ERROR_MESSAGES[code])
    this.name = 'OnboardingProgressApiError'
    this.code = code
    this.details = details
  }
}

async function invokeOnboardingProgress(
  body:
    | GetOnboardingProgressRequest
    | UpdateOnboardingProgressRequest
    | CompleteOnboardingProgressRequest,
): Promise<OnboardingProgressSuccessData> {
  const { data, error } = await supabase.functions.invoke<OnboardingProgressResponse>(
    'onboarding-progress',
    {
      body,
    },
  )

  if (error) {
    const contextError = await parseInvokeContextError(error)
    if (contextError) {
      throw contextError
    }

    throw new OnboardingProgressApiError('INTERNAL_ERROR', error.message)
  }

  if (!data) {
    throw new OnboardingProgressApiError(
      'INTERNAL_ERROR',
      'onboarding-progress returned an empty response.',
    )
  }

  if (isErrorResponse(data)) {
    throw toApiError(data.error)
  }

  if (!isSuccessResponse(data)) {
    throw new OnboardingProgressApiError(
      'INTERNAL_ERROR',
      'onboarding-progress returned malformed response.',
    )
  }

  return data.data
}

function expectAction(
  result: OnboardingProgressSuccessData,
  expectedAction: OnboardingProgressAction,
) {
  if (result.action !== expectedAction) {
    throw new OnboardingProgressApiError(
      'INTERNAL_ERROR',
      `onboarding-progress returned unexpected action: ${result.action}`,
    )
  }
}

export async function getOnboardingProgress(): Promise<OnboardingProgressSuccessData> {
  const result = await invokeOnboardingProgress({
    action: 'get',
  })
  expectAction(result, 'get')
  return result
}

export async function updateOnboardingProgress(
  stepKey: OnboardingStepKey,
): Promise<OnboardingProgressSuccessData> {
  const result = await invokeOnboardingProgress({
    action: 'update',
    stepKey,
  })
  expectAction(result, 'update')
  return result
}

export async function completeOnboardingProgress(): Promise<OnboardingProgressSuccessData> {
  const result = await invokeOnboardingProgress({
    action: 'complete',
  })
  expectAction(result, 'complete')
  return result
}

export function getOnboardingProgressErrorMessage(code: OnboardingProgressErrorCode): string {
  return ONBOARDING_PROGRESS_ERROR_MESSAGES[code]
}
