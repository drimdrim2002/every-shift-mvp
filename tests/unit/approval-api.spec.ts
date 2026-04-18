import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(),
  },
}))

import {
  ApprovalApiError,
  decideApproval,
  getApprovalRequest,
  listApprovalQueue,
} from '@/api/approval'
import { supabase } from '@/api/supabase'

function createListQueryResult(rows: unknown[], error: { message: string } | null = null) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    returns: vi.fn().mockResolvedValue({
      data: rows,
      error,
    }),
  }

  return query
}

function createDetailQueryResult(row: unknown, error: { message: string } | null = null) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: row,
      error,
    }),
  }

  return query
}

describe('approval api boundary', () => {
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
      reviewNote: '승인',
    })

    expect(supabase.functions.invoke).toHaveBeenCalledWith('approval-decision', {
      body: {
        signupRequestId: 'req-1',
        decision: 'approve',
        reviewNote: '승인',
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

  it('maps canonical error payloads to ApprovalApiError', async () => {
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

  it('lists only admin signup requests through the narrow queue contract', async () => {
    const listQuery = createListQueryResult([
      {
        id: 'req-1',
        requester_user_id: 'user-1',
        organization_id: 'org-1',
        requested_role: 'admin',
        status: 'pending',
        work_type: '3교대',
        shift_type: 'day-night',
        requested_site_name: '중환자실',
        requested_skill_summary: '중환자 간호',
        requested_rank_code: 'RN',
        requested_credit: 5,
        review_note: null,
        created_at: '2026-04-16T10:00:00.000Z',
      },
    ])
    vi.mocked(supabase.from).mockReturnValue(listQuery as never)

    const result = await listApprovalQueue({
      status: 'pending',
      keyword: ' 중환자 ',
    })

    expect(supabase.from).toHaveBeenCalledWith('signup_requests')
    expect(listQuery.eq).toHaveBeenNthCalledWith(1, 'requested_role', 'admin')
    expect(listQuery.eq).toHaveBeenNthCalledWith(2, 'status', 'pending')
    expect(listQuery.ilike).toHaveBeenCalledWith('requested_site_name', '%중환자%')
    expect(result).toEqual([
      {
        signupRequestId: 'req-1',
        requesterUserId: 'user-1',
        requesterEmail: null,
        requesterName: null,
        organizationId: 'org-1',
        organizationName: null,
        requestedRole: 'admin',
        status: 'pending',
        createdAt: '2026-04-16T10:00:00.000Z',
      },
    ])
  })

  it('loads request detail for an admin signup request', async () => {
    const detailQuery = createDetailQueryResult({
      id: 'req-2',
      requester_user_id: 'user-2',
      organization_id: 'org-9',
      requested_role: 'admin',
      status: 'pending',
      work_type: '상근',
      shift_type: 'fixed-day',
      requested_site_name: '외래',
      requested_skill_summary: '주사실',
      requested_rank_code: 'CN',
      requested_credit: 2,
      review_note: '추가 확인 필요',
      created_at: '2026-04-16T09:00:00.000Z',
    })
    vi.mocked(supabase.from).mockReturnValue(detailQuery as never)

    const result = await getApprovalRequest('req-2')

    expect(detailQuery.eq).toHaveBeenNthCalledWith(1, 'id', 'req-2')
    expect(detailQuery.eq).toHaveBeenNthCalledWith(2, 'requested_role', 'admin')
    expect(result).toEqual({
      signupRequestId: 'req-2',
      requesterUserId: 'user-2',
      requesterEmail: null,
      requesterName: null,
      organizationId: 'org-9',
      organizationName: null,
      requestedRole: 'admin',
      status: 'pending',
      createdAt: '2026-04-16T09:00:00.000Z',
      workType: '상근',
      shiftType: 'fixed-day',
      requestedSiteName: '외래',
      requestedSkillSummary: '주사실',
      requestedRankCode: 'CN',
      requestedCredit: 2,
      reviewNote: '추가 확인 필요',
    })
  })
})
