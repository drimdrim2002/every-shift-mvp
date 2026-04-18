import { describe, expect, it, vi } from 'vitest'

import {
  ApprovalDecisionError,
  decideApprovalRequest,
} from '../../supabase/functions/approval-decision/service.ts'

function createPendingRequestRow() {
  return {
    id: 'req-1',
    requester_user_id: 'user-1',
    organization_id: 'org-1',
    requested_role: 'admin',
    status: 'pending',
    reviewed_at: null,
  }
}

function createRepositoryClient({
  signupRequest = createPendingRequestRow(),
  membership = null,
} = {}) {
  const signupRequestUpdateEq = vi.fn().mockResolvedValue({
    data: null,
    error: null,
  })
  const signupRequestUpdate = vi.fn().mockReturnValue({
    eq: signupRequestUpdateEq,
  })
  const signupRequestQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: signupRequest,
      error: null,
    }),
    update: signupRequestUpdate,
  }

  const membershipMaybeSingle = vi.fn().mockResolvedValue({
    data: membership,
    error: null,
  })
  const membershipSelect = {
    eq: vi.fn().mockReturnThis(),
    maybeSingle: membershipMaybeSingle,
  }
  const membershipUpsert = vi.fn().mockResolvedValue({
    data: [
      {
        id: 'membership-1',
      },
    ],
    error: null,
  })
  const membershipQuery = {
    select: vi.fn().mockReturnValue(membershipSelect),
    upsert: membershipUpsert,
  }

  const approvalLogsInsert = vi.fn().mockResolvedValue({
    data: null,
    error: null,
  })

  const repositoryClient = {
    from(table: string) {
      if (table === 'signup_requests') {
        return signupRequestQuery
      }

      if (table === 'organization_memberships') {
        return membershipQuery
      }

      if (table === 'approval_logs') {
        return {
          insert: approvalLogsInsert,
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    },
  }

  return {
    repositoryClient,
    spies: {
      signupRequestUpdate,
      signupRequestUpdateEq,
      membershipSelect,
      membershipUpsert,
      membershipMaybeSingle,
      approvalLogsInsert,
    },
  }
}

describe('approval-decision workflow', () => {
  it('approves a pending admin signup request and creates approved membership', async () => {
    const { repositoryClient, spies } = createRepositoryClient()

    const result = await decideApprovalRequest(
      repositoryClient as never,
      {
        actorUserId: 'super-1',
        actorGlobalRole: 'super',
        actorAccountStatus: 'active',
      },
      {
        signupRequestId: 'req-1',
        decision: 'approve',
        reviewNote: '승인',
      },
    )

    expect(spies.signupRequestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'approved',
        reviewed_by: 'super-1',
        review_note: '승인',
      }),
    )
    expect(spies.membershipUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: 'org-1',
        user_id: 'user-1',
        role: 'admin',
        status: 'approved',
        approved_by: 'super-1',
      }),
      expect.objectContaining({
        onConflict: 'organization_id,user_id',
      }),
    )
    expect(spies.approvalLogsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        signup_request_id: 'req-1',
        action: 'approve',
      }),
    )
    expect(result).toEqual(
      expect.objectContaining({
        signupRequestId: 'req-1',
        decision: 'approve',
        requestStatus: 'approved',
        membershipStatus: 'approved',
        membershipId: 'membership-1',
        alreadyProcessed: false,
      }),
    )
  })

  it('rejects a pending admin signup request without creating approved membership', async () => {
    const { repositoryClient, spies } = createRepositoryClient()

    const result = await decideApprovalRequest(
      repositoryClient as never,
      {
        actorUserId: 'super-1',
        actorGlobalRole: 'super',
        actorAccountStatus: 'active',
      },
      {
        signupRequestId: 'req-1',
        decision: 'reject',
        reviewNote: '서류 보완 필요',
      },
    )

    expect(spies.signupRequestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'rejected',
        review_note: '서류 보완 필요',
      }),
    )
    expect(spies.membershipUpsert).not.toHaveBeenCalled()
    expect(result).toEqual(
      expect.objectContaining({
        signupRequestId: 'req-1',
        decision: 'reject',
        requestStatus: 'rejected',
        membershipStatus: 'none',
        membershipId: null,
        alreadyProcessed: false,
      }),
    )
  })

  it('returns idempotent success for a repeated matching terminal decision', async () => {
    const { repositoryClient } = createRepositoryClient({
      signupRequest: {
        ...createPendingRequestRow(),
        status: 'approved',
        reviewed_at: '2026-04-17T01:00:00.000Z',
      },
      membership: {
        id: 'membership-1',
        status: 'approved',
      },
    })

    const result = await decideApprovalRequest(
      repositoryClient as never,
      {
        actorUserId: 'super-1',
        actorGlobalRole: 'super',
        actorAccountStatus: 'active',
      },
      {
        signupRequestId: 'req-1',
        decision: 'approve',
      },
    )

    expect(result).toEqual(
      expect.objectContaining({
        requestStatus: 'approved',
        membershipStatus: 'approved',
        membershipId: 'membership-1',
        alreadyProcessed: true,
      }),
    )
  })

  it('rejects conflicting terminal replays and non-super actors', async () => {
    const { repositoryClient } = createRepositoryClient({
      signupRequest: {
        ...createPendingRequestRow(),
        status: 'rejected',
        reviewed_at: '2026-04-17T01:00:00.000Z',
      },
    })

    await expect(
      decideApprovalRequest(
        repositoryClient as never,
        {
          actorUserId: 'admin-1',
          actorGlobalRole: 'admin',
          actorAccountStatus: 'active',
        },
        {
          signupRequestId: 'req-1',
          decision: 'approve',
        },
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ApprovalDecisionError>>({
        code: 'PERMISSION_DENIED',
      }),
    )

    await expect(
      decideApprovalRequest(
        repositoryClient as never,
        {
          actorUserId: 'super-1',
          actorGlobalRole: 'super',
          actorAccountStatus: 'active',
        },
        {
          signupRequestId: 'req-1',
          decision: 'approve',
        },
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ApprovalDecisionError>>({
        code: 'INVALID_TRANSITION',
      }),
    )
  })
})
