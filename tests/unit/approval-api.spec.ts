import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}))

import { ApprovalApiError, decideApproval } from '@/api/approval'
import { supabase } from '@/api/supabase'

describe('approval decision api boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns approval decision payload on success', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        success: true,
        data: {
          signupRequestId: 'req-1',
          decision: 'approve',
          requestStatus: 'approved',
          membershipStatus: 'approved',
          organizationId: 'org-1',
          membershipId: 'membership-1',
          decidedAt: '2026-03-08T01:00:00.000Z',
          alreadyProcessed: false,
        },
      },
      error: null,
    })

    const result = await decideApproval({
      signupRequestId: 'req-1',
      decision: 'approve',
      reviewNote: 'ok',
    })

    expect(supabase.functions.invoke).toHaveBeenCalledWith('approval-decision', {
      body: {
        signupRequestId: 'req-1',
        decision: 'approve',
        reviewNote: 'ok',
      },
    })
    expect(result).toEqual({
      signupRequestId: 'req-1',
      decision: 'approve',
      requestStatus: 'approved',
      membershipStatus: 'approved',
      organizationId: 'org-1',
      membershipId: 'membership-1',
      decidedAt: '2026-03-08T01:00:00.000Z',
      alreadyProcessed: false,
    })
  })

  it('keeps idempotent success payload on already processed request', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        success: true,
        data: {
          signupRequestId: 'req-1',
          decision: 'approve',
          requestStatus: 'approved',
          membershipStatus: 'approved',
          organizationId: 'org-1',
          membershipId: 'membership-1',
          decidedAt: '2026-03-08T01:00:00.000Z',
          alreadyProcessed: true,
        },
      },
      error: null,
    })

    const result = await decideApproval({
      signupRequestId: 'req-1',
      decision: 'approve',
    })

    expect(result.alreadyProcessed).toBe(true)
  })

  it('maps error payload to ApprovalApiError with canonical code', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        success: false,
        error: {
          code: 'INVALID_TRANSITION',
          message: 'already processed',
          details: {
            currentStatus: 'approved',
          },
        },
      },
      error: null,
    })

    await expect(
      decideApproval({
        signupRequestId: 'req-1',
        decision: 'reject',
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ApprovalApiError>>({
        name: 'ApprovalApiError',
        code: 'INVALID_TRANSITION',
        message: 'already processed',
      }),
    )
  })
})
