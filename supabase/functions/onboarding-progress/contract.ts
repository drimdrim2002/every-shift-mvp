export const STEP_SEQUENCE = ['organization_info', 'employee_seed', 'schedule_request'] as const

export type OnboardingStepKey = (typeof STEP_SEQUENCE)[number]
export type OnboardingProgressAction = 'get' | 'update' | 'complete'

export interface OnboardingProgressRequest {
  action?: unknown
  stepKey?: unknown
}

export interface OnboardingProgressValidationError {
  status: 400
  code: 'VALIDATION_ERROR'
  message: string
  details?: Record<string, unknown>
}

export interface ValidatedOnboardingProgressRequest {
  action: OnboardingProgressAction
  stepKey: OnboardingStepKey | null
}

export function normalizeAction(value: unknown): OnboardingProgressAction | null {
  if (value === 'get' || value === 'update' || value === 'complete') {
    return value
  }

  return null
}

export function normalizeStepKey(value: unknown): OnboardingStepKey | null {
  if (value === 'organization_info' || value === 'employee_seed' || value === 'schedule_request') {
    return value
  }

  return null
}

export function validateOnboardingProgressRequest(
  payload: OnboardingProgressRequest,
): ValidatedOnboardingProgressRequest | OnboardingProgressValidationError {
  const action = normalizeAction(payload.action)
  if (!action) {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'action must be get, update, or complete.',
      details: {
        field: 'action',
        allowedValues: ['get', 'update', 'complete'],
      },
    }
  }

  if (action === 'update') {
    const stepKey = normalizeStepKey(payload.stepKey)
    if (!stepKey) {
      return {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'stepKey must be one of organization_info, employee_seed, or schedule_request.',
        details: {
          field: 'stepKey',
          allowedValues: STEP_SEQUENCE,
        },
      }
    }

    return {
      action,
      stepKey,
    }
  }

  if (payload.stepKey !== undefined) {
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'stepKey is only allowed for the update action.',
      details: {
        field: 'stepKey',
        action,
      },
    }
  }

  return {
    action,
    stepKey: null,
  }
}
