import type { AccessState } from '@/types/rbac'

export type OnboardingProgressAction = 'get' | 'update' | 'complete'

export type OnboardingStepKey = 'organization_info' | 'employee_seed' | 'schedule_request'

export type OnboardingTransitionType = 'noop' | 'advance' | 'complete'

export type OnboardingProgressErrorCode =
  | 'VALIDATION_ERROR'
  | 'PERMISSION_DENIED'
  | 'FORBIDDEN_STATE_TRANSITION'
  | 'METHOD_NOT_ALLOWED'
  | 'INTERNAL_ERROR'

export interface OnboardingProgressState {
  organizationId: string
  currentStepKey: OnboardingStepKey | null
  completedStepKeys: OnboardingStepKey[]
  isOnboardingComplete: boolean
  completedAt: string | null
}

export interface OnboardingProgressTransition {
  type: OnboardingTransitionType
  requestedStepKey: OnboardingStepKey | null
  previousCurrentStepKey: OnboardingStepKey | null
  resultingCurrentStepKey: OnboardingStepKey | null
  isOnboardingComplete: boolean
}

export interface OnboardingProgressSuccessData {
  action: OnboardingProgressAction
  progress: OnboardingProgressState
  transition: OnboardingProgressTransition | null
}

export interface OnboardingProgressErrorPayload {
  code: OnboardingProgressErrorCode
  message: string
  details?: Record<string, unknown>
}

export interface OnboardingProgressScope {
  accessState: AccessState | null
  organizationId: string | null
}

export type OnboardingCacheSource = 'empty' | 'local_storage' | 'remote' | 'storage_event'

export interface OnboardingProgressCacheRecord {
  version: 1
  cachedAt: string
  action: OnboardingProgressAction
  progress: OnboardingProgressState
  transition: OnboardingProgressTransition | null
}
