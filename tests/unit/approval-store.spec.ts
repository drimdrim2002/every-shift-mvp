import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { decideApprovalMock, getApprovalRequestMock, listApprovalQueueMock } = vi.hoisted(() => ({
  listApprovalQueueMock: vi.fn(),
  getApprovalRequestMock: vi.fn(),
  decideApprovalMock: vi.fn(),
}))

vi.mock('@/api/approval', () => ({
  listApprovalQueue: listApprovalQueueMock,
  getApprovalRequest: getApprovalRequestMock,
  decideApproval: decideApprovalMock,
}))

import { useApprovalStore } from '@/stores/approval'

describe('approval store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads the pending queue and selects the first request detail', async () => {
    listApprovalQueueMock.mockResolvedValue([
      {
        signupRequestId: 'req-1',
        requesterUserId: 'user-1',
        requesterEmail: 'nurse1@example.com',
        requesterName: null,
        organizationId: 'org-1',
        organizationName: null,
        requestedRole: 'admin',
        status: 'pending',
        createdAt: '2026-04-17T01:00:00.000Z',
      },
    ])
    getApprovalRequestMock.mockResolvedValue({
      signupRequestId: 'req-1',
      requesterUserId: 'user-1',
      requesterEmail: 'nurse1@example.com',
      requesterName: null,
      organizationId: 'org-1',
      organizationName: null,
      requestedRole: 'admin',
      status: 'pending',
      createdAt: '2026-04-17T01:00:00.000Z',
      requestedHospitalName: '중환자실',
      reviewNote: null,
    })

    const store = useApprovalStore()
    await store.loadQueue()

    expect(listApprovalQueueMock).toHaveBeenCalledWith({ status: 'pending' })
    expect(getApprovalRequestMock).toHaveBeenCalledWith('req-1')
    expect(store.items).toHaveLength(1)
    expect(store.selectedRequestId).toBe('req-1')
    expect(store.selectedRequest?.requestedHospitalName).toBe('중환자실')
  })

  it('submits a decision, reloads the pending queue, and advances selection', async () => {
    listApprovalQueueMock
      .mockResolvedValueOnce([
        {
          signupRequestId: 'req-1',
          requesterUserId: 'user-1',
          requesterEmail: 'nurse1@example.com',
          requesterName: null,
          organizationId: 'org-1',
          organizationName: null,
          requestedRole: 'admin',
          status: 'pending',
          createdAt: '2026-04-17T01:00:00.000Z',
        },
        {
          signupRequestId: 'req-2',
          requesterUserId: 'user-2',
          requesterEmail: 'nurse2@example.com',
          requesterName: null,
          organizationId: 'org-2',
          organizationName: null,
          requestedRole: 'admin',
          status: 'pending',
          createdAt: '2026-04-17T02:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          signupRequestId: 'req-2',
          requesterUserId: 'user-2',
          requesterEmail: null,
          requesterName: null,
          organizationId: 'org-2',
          organizationName: null,
          requestedRole: 'admin',
          status: 'pending',
          createdAt: '2026-04-17T02:00:00.000Z',
        },
      ])

    getApprovalRequestMock
      .mockResolvedValueOnce({
        signupRequestId: 'req-1',
        requesterUserId: 'user-1',
        requesterEmail: 'nurse1@example.com',
        requesterName: null,
        organizationId: 'org-1',
        organizationName: null,
        requestedRole: 'admin',
        status: 'pending',
        createdAt: '2026-04-17T01:00:00.000Z',
        requestedHospitalName: '중환자실',
        reviewNote: null,
      })
      .mockResolvedValueOnce({
        signupRequestId: 'req-2',
        requesterUserId: 'user-2',
        requesterEmail: 'nurse2@example.com',
        requesterName: null,
        organizationId: 'org-2',
        organizationName: null,
        requestedRole: 'admin',
        status: 'pending',
        createdAt: '2026-04-17T02:00:00.000Z',
        requestedHospitalName: '외래',
        reviewNote: null,
      })

    decideApprovalMock.mockResolvedValue({
      signupRequestId: 'req-1',
      decision: 'approve',
      requestStatus: 'approved',
      membershipStatus: 'approved',
      organizationId: 'org-1',
      membershipId: 'membership-1',
      decidedAt: '2026-04-17T03:00:00.000Z',
      alreadyProcessed: false,
    })

    const store = useApprovalStore()
    await store.loadQueue()
    const result = await store.submitDecision({
      signupRequestId: 'req-1',
      decision: 'approve',
      reviewNote: '승인',
    })

    expect(decideApprovalMock).toHaveBeenCalledWith({
      signupRequestId: 'req-1',
      decision: 'approve',
      reviewNote: '승인',
    })
    expect(listApprovalQueueMock).toHaveBeenCalledTimes(2)
    expect(store.selectedRequestId).toBe('req-2')
    expect(store.selectedRequest?.requestedHospitalName).toBe('외래')
    expect(result.requestStatus).toBe('approved')
  })
})
