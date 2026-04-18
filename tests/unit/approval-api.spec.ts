import { beforeEach, describe, expect, it, vi } from 'vitest'

const getSessionMock = vi.fn()
const invokeMock = vi.fn()
const fetchMock = vi.fn()

vi.mock('@/api/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
    functions: {
      invoke: invokeMock,
    },
  },
}))

describe('approval api boundary', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'session-token',
        },
      },
      error: null,
    })
  })

  it('returns approval decision payload on success', async () => {
    invokeMock.mockResolvedValue({
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

    const { decideApproval } = await import('@/api/approval')
    const result = await decideApproval({
      signupRequestId: 'req-1',
      decision: 'approve',
      reviewNote: '승인',
    })

    expect(invokeMock).toHaveBeenCalledWith('approval-decision', {
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

  it('maps canonical invoke errors to ApprovalApiError', async () => {
    invokeMock.mockResolvedValue({
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

    const { decideApproval } = await import('@/api/approval')

    await expect(
      decideApproval({
        signupRequestId: 'req-1',
        decision: 'reject',
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: 'ApprovalApiError',
        code: 'INVALID_TRANSITION',
        message: 'already processed',
      }),
    )
  })

  it('loads the approval queue through the approval-read edge function', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
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
          ],
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    )

    const { listApprovalQueue } = await import('@/api/approval')
    const result = await listApprovalQueue({
      status: 'pending',
      keyword: ' 중환자 ',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/approval-read/queue?status=pending&keyword=%EC%A4%91%ED%99%98%EC%9E%90',
      expect.objectContaining({
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers: expect.objectContaining({
          apikey: 'anon-key',
          Authorization: 'Bearer session-token',
        }),
      }),
    )
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

  it('loads request detail through the approval-read edge function', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          request: {
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
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    )

    const { getApprovalRequest } = await import('@/api/approval')
    const result = await getApprovalRequest('req-2')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/approval-read/request?signupRequestId=req-2',
      expect.objectContaining({
        method: 'GET',
      }),
    )
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

  it('surfaces canonical permission errors from approval-read', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Only active superusers can read approvals.',
          },
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    )

    const { listApprovalQueue } = await import('@/api/approval')

    await expect(listApprovalQueue()).rejects.toEqual(
      expect.objectContaining({
        name: 'ApprovalApiError',
        code: 'PERMISSION_DENIED',
        message: 'Only active superusers can read approvals.',
      }),
    )
  })
})
