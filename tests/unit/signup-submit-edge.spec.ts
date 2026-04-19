import { describe, expect, it, vi } from 'vitest'

import {
  SignupSubmitServiceError,
  processSignupSubmit,
} from '../../supabase/functions/signup-submit/service.ts'

function createRequest(payload: Record<string, unknown>) {
  return {
    email: 'user@example.com',
    password: 'password123',
    name: '테스트 사용자',
    ...payload,
  }
}

function createServiceClients() {
  const createUser = vi.fn()
  const deleteUser = vi.fn()
  const rpc = vi.fn()
  const from = vi.fn()
  const createClient = {
    auth: {
      admin: {
        createUser,
        deleteUser,
      },
    },
    rpc,
    from,
  }

  return {
    createClient,
    spies: {
      createUser,
      deleteUser,
      rpc,
      from,
    },
  }
}

describe('signup-submit service', () => {
  it('creates a pending admin signup request and seeds pending membership metadata', async () => {
    const { createClient, spies } = createServiceClients()
    spies.createUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
        },
      },
      error: null,
    })
    spies.rpc.mockResolvedValue({
      data: [
        {
          signup_request_id: 'request-1',
          organization_id: '11111111-1111-4111-8111-111111111111',
        },
      ],
      error: null,
    })

    const response = await processSignupSubmit(createClient as never, createRequest({
      role: 'admin',
      hospitalId: '11111111-1111-4111-8111-111111111111',
      hospitalName: '세브란스병원',
      hospitalSource: 'data.go.kr',
      organizationSelectionMode: 'existing',
    }))

    expect(spies.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        password: 'password123',
        email_confirm: true,
        app_metadata: expect.objectContaining({
          organization_id: '11111111-1111-4111-8111-111111111111',
          global_role: 'user',
          account_status: 'pending',
          organization_memberships: [
            expect.objectContaining({
              organization_id: '11111111-1111-4111-8111-111111111111',
              role: 'admin',
              status: 'pending',
            }),
          ],
        }),
      }),
    )
    expect(spies.rpc).toHaveBeenCalledWith(
      'submit_admin_signup_atomic',
      expect.objectContaining({
        p_user_id: 'user-1',
        p_organization_id: '11111111-1111-4111-8111-111111111111',
        p_requester_email: 'user@example.com',
      }),
    )
    expect(response).toEqual({
      path: 'admin_submit',
      nextState: 'pending_approval',
      signupRequestStatus: 'pending',
      membershipStatus: 'none',
      signupRequestId: 'request-1',
      organizationId: '11111111-1111-4111-8111-111111111111',
    })
  })

  it('resolves a public hospital code to an internal organization uuid before admin signup', async () => {
    const { createClient, spies } = createServiceClients()
    spies.createUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
        },
      },
      error: null,
    })
    spies.rpc.mockResolvedValue({
      data: [
        {
          signup_request_id: 'request-1',
          organization_id: '00000000-0000-0000-0000-000000000099',
        },
      ],
      error: null,
    })

    const response = await processSignupSubmit(
      createClient as never,
      createRequest({
        role: 'admin',
        hospitalId: 'JDQ4MTg4MSM1MSMkMSMkMCMkODkkMzgxMzUxIzExIyQxIyQzIyQxMyQyNjEwMDIjNjEjJDEjJDQjJDgz',
        hospitalName: '이화여자대학교의과대학부속목동병원',
        hospitalSource: 'data.go.kr',
      }),
      {
        resolveAdminOrganizationId: vi
          .fn()
          .mockResolvedValue('00000000-0000-0000-0000-000000000099'),
      },
    )

    expect(spies.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        app_metadata: expect.objectContaining({
          organization_id: '00000000-0000-0000-0000-000000000099',
        }),
      }),
    )
    expect(spies.rpc).toHaveBeenCalledWith(
      'submit_admin_signup_atomic',
      expect.objectContaining({
        p_organization_id: '00000000-0000-0000-0000-000000000099',
        p_requester_email: 'user@example.com',
      }),
    )
    expect(response.organizationId).toBe('00000000-0000-0000-0000-000000000099')
  })

  it('redeems a user invite through the atomic rpc and returns active state', async () => {
    const { createClient, spies } = createServiceClients()
    spies.createUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-2',
        },
      },
      error: null,
    })
    spies.rpc.mockResolvedValue({
      data: [
        {
          organization_id: 'org-2',
          membership_id: 'membership-1',
          signup_request_id: 'request-2',
        },
      ],
      error: null,
    })

    const response = await processSignupSubmit(
      createClient as never,
      createRequest({
        role: 'user',
        inviteCode: 'INV-VALID-001',
      }),
      {
        validateInviteCode: vi.fn().mockResolvedValue({
          type: 'valid',
          organizationId: 'org-2',
          codeHash: 'hashed-code',
        }),
      },
    )

    expect(spies.rpc).toHaveBeenCalledWith(
      'redeem_user_invite_signup_atomic',
      expect.objectContaining({
        p_user_id: 'user-2',
        p_organization_id: 'org-2',
        p_requester_email: 'user@example.com',
        p_invite_code_hash: 'hashed-code',
      }),
    )
    expect(response).toEqual({
      path: 'user_invite_redeem',
      nextState: 'active',
      signupRequestStatus: 'approved',
      membershipStatus: 'approved',
      signupRequestId: 'request-2',
      organizationId: 'org-2',
    })
  })

  it('maps duplicate request errors and rolls back the created auth user', async () => {
    const { createClient, spies } = createServiceClients()
    spies.createUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-3',
        },
      },
      error: null,
    })
    spies.rpc.mockResolvedValue({
      data: null,
      error: {
        message: 'duplicate_signup_request',
      },
    })
    spies.deleteUser.mockResolvedValue({
      data: {
        user: null,
      },
      error: null,
    })

    await expect(
      processSignupSubmit(createClient as never, createRequest({
        role: 'admin',
        hospitalId: '33333333-3333-4333-8333-333333333333',
        hospitalName: '서울병원',
        hospitalSource: 'data.go.kr',
      })),
    ).rejects.toEqual(
      expect.objectContaining<Partial<SignupSubmitServiceError>>({
        code: 'DUPLICATE_REQUEST',
      }),
    )

    expect(spies.deleteUser).toHaveBeenCalledWith('user-3')
  })

  it('maps invalid invite reasons without creating an auth user', async () => {
    const { createClient, spies } = createServiceClients()

    await expect(
      processSignupSubmit(
        createClient as never,
        createRequest({
          role: 'user',
          inviteCode: 'INV-EXPIRED-001',
        }),
        {
          validateInviteCode: vi.fn().mockResolvedValue({
            type: 'invalid',
            reason: 'INVITE_EXPIRED',
          }),
        },
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<SignupSubmitServiceError>>({
        code: 'INVALID_INVITE_CODE',
        details: {
          reason: 'INVITE_EXPIRED',
        },
      }),
    )

    expect(spies.createUser).not.toHaveBeenCalled()
  })
})
