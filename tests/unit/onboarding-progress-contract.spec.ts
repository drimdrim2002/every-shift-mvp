import { describe, expect, it } from 'vitest'

import { validateOnboardingProgressRequest } from '../../supabase/functions/onboarding-progress/contract'

describe('onboarding-progress contract validation', () => {
  it('rejects stepKey on get requests', () => {
    expect(
      validateOnboardingProgressRequest({
        action: 'get',
        stepKey: 'employee_seed',
      }),
    ).toEqual({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'stepKey is only allowed for the update action.',
      details: {
        field: 'stepKey',
        action: 'get',
      },
    })
  })

  it('rejects stepKey on complete requests', () => {
    expect(
      validateOnboardingProgressRequest({
        action: 'complete',
        stepKey: 'schedule_request',
      }),
    ).toEqual({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'stepKey is only allowed for the update action.',
      details: {
        field: 'stepKey',
        action: 'complete',
      },
    })
  })

  it('accepts get requests without stepKey', () => {
    expect(
      validateOnboardingProgressRequest({
        action: 'get',
      }),
    ).toEqual({
      action: 'get',
      stepKey: null,
    })
  })

  it('accepts valid update requests', () => {
    expect(
      validateOnboardingProgressRequest({
        action: 'update',
        stepKey: 'employee_seed',
      }),
    ).toEqual({
      action: 'update',
      stepKey: 'employee_seed',
    })
  })
})
