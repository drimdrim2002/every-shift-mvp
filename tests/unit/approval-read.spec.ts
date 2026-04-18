import { describe, expect, it, vi } from 'vitest'

import {
  ApprovalReadError,
  assertApprovalReadAccess,
  listApprovalQueueRequests,
  loadApprovalRequestDetail,
} from '../../supabase/functions/approval-read/service.ts'

function createSignupRequestListQuery(rows: unknown[]) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    returns: vi.fn().mockResolvedValue({
      data: rows,
      error: null,
    }),
  }
}

function createSignupRequestDetailQuery(row: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: row,
      error: null,
    }),
  }
}

function createLookupQuery(rows: unknown[]) {
  return {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    returns: vi.fn().mockResolvedValue({
      data: rows,
      error: null,
    }),
  }
}

describe('approval-read service', () => {
  it('returns pending admin queue items for active super users', async () => {
    const listQuery = createSignupRequestListQuery([
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
        created_at: '2026-04-17T01:00:00.000Z',
      },
    ])
    const profilesQuery = createLookupQuery([
      {
        id: 'user-1',
        display_name: '김간호',
      },
    ])
    const organizationsQuery = createLookupQuery([
      {
        id: 'org-1',
        name: '이화여자대학교의과대학부속목동병원',
      },
    ])

    const repositoryClient = {
      from: vi.fn((table: string) => {
        if (table === 'signup_requests') {
          return listQuery
        }

        if (table === 'profiles') {
          return profilesQuery
        }

        if (table === 'organizations') {
          return organizationsQuery
        }

        throw new Error(`Unexpected table: ${table}`)
      }),
    }

    const result = await listApprovalQueueRequests(
      repositoryClient as never,
      {
        actorUserId: 'super-1',
        actorGlobalRole: 'super',
        actorAccountStatus: 'active',
      },
      {
        status: 'pending',
        keyword: ' 중환자 ',
      },
    )

    expect(listQuery.eq).toHaveBeenNthCalledWith(1, 'requested_role', 'admin')
    expect(listQuery.eq).toHaveBeenNthCalledWith(2, 'status', 'pending')
    expect(listQuery.ilike).toHaveBeenCalledWith('requested_site_name', '%중환자%')
    expect(result).toEqual({
      items: [
        {
          signupRequestId: 'req-1',
          requesterUserId: 'user-1',
          requesterEmail: null,
          requesterName: '김간호',
          organizationId: 'org-1',
          organizationName: '이화여자대학교의과대학부속목동병원',
          requestedRole: 'admin',
          status: 'pending',
          createdAt: '2026-04-17T01:00:00.000Z',
        },
      ],
    })
  })

  it('loads request detail for active super users', async () => {
    const detailQuery = createSignupRequestDetailQuery({
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
    const profilesQuery = createLookupQuery([
      {
        id: 'user-2',
        display_name: '박수간호',
      },
    ])
    const organizationsQuery = createLookupQuery([
      {
        id: 'org-9',
        name: '서울병원',
      },
    ])

    const repositoryClient = {
      from: vi.fn((table: string) => {
        if (table === 'signup_requests') {
          return detailQuery
        }

        if (table === 'profiles') {
          return profilesQuery
        }

        if (table === 'organizations') {
          return organizationsQuery
        }

        throw new Error(`Unexpected table: ${table}`)
      }),
    }

    const result = await loadApprovalRequestDetail(
      repositoryClient as never,
      {
        actorUserId: 'super-1',
        actorGlobalRole: 'super',
        actorAccountStatus: 'active',
      },
      'req-2',
    )

    expect(detailQuery.eq).toHaveBeenNthCalledWith(1, 'id', 'req-2')
    expect(detailQuery.eq).toHaveBeenNthCalledWith(2, 'requested_role', 'admin')
    expect(result).toEqual({
      request: {
        signupRequestId: 'req-2',
        requesterUserId: 'user-2',
        requesterEmail: null,
        requesterName: '박수간호',
        organizationId: 'org-9',
        organizationName: '서울병원',
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
    })
  })

  it('rejects non-super access before querying approval data', async () => {
    expect(() =>
      assertApprovalReadAccess({
        actorUserId: 'admin-1',
        actorGlobalRole: 'admin',
        actorAccountStatus: 'active',
      }),
    ).toThrowError(
      expect.objectContaining<Partial<ApprovalReadError>>({
        code: 'PERMISSION_DENIED',
        message: 'Only active superusers can read approvals.',
      }),
    )
  })
})
