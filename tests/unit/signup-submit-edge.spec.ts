import { describe, expect, it, vi } from 'vitest'

import {
  SignupSubmitServiceError,
  createSignupSubmitContextFromRequest,
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
  const getUser = vi.fn()
  const createUser = vi.fn()
  const deleteUser = vi.fn()
  const updateUserById = vi.fn()
  const rpc = vi.fn()
  const from = vi.fn()
  const createClient = {
    auth: {
      getUser,
      admin: {
        createUser,
        deleteUser,
        updateUserById,
      },
    },
    rpc,
    from,
  }

  return {
    createClient,
    spies: {
      getUser,
      createUser,
      deleteUser,
      updateUserById,
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

  it('accepts a manual hospital name for admin signup without requiring a searched hospital id', async () => {
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
          organization_id: '22222222-2222-4222-8222-222222222222',
        },
      ],
      error: null,
    })

    const resolveAdminOrganizationId = vi
      .fn()
      .mockResolvedValue('22222222-2222-4222-8222-222222222222')

    const response = await processSignupSubmit(
      createClient as never,
      createRequest({
        role: 'admin',
        hospitalName: '새봄병원',
        hospitalSource: 'manual',
        organizationSelectionMode: 'manual',
      }),
      {
        resolveAdminOrganizationId,
      },
    )

    expect(resolveAdminOrganizationId).toHaveBeenCalledWith(
      createClient,
      null,
      '새봄병원',
    )
    expect(spies.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        password: 'password123',
      }),
    )
    expect(spies.rpc).toHaveBeenCalledWith(
      'submit_admin_signup_atomic',
      expect.objectContaining({
        p_organization_id: '22222222-2222-4222-8222-222222222222',
        p_display_name: '테스트 사용자',
        p_requested_site_name: '새봄병원',
      }),
    )
    expect(response.organizationId).toBe('22222222-2222-4222-8222-222222222222')
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

  it('uses the bearer token user for existing session admin signup without creating auth user', async () => {
    const { createClient, spies } = createServiceClients()
    spies.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'oauth-user-1',
          email: 'social@example.com',
        },
      },
      error: null,
    })
    spies.updateUserById.mockResolvedValue({
      data: {
        user: {
          id: 'oauth-user-1',
        },
      },
      error: null,
    })
    spies.rpc.mockResolvedValue({
      data: [
        {
          signup_request_id: 'request-1',
          organization_id: 'org-1',
        },
      ],
      error: null,
    })

    const response = await processSignupSubmit(
      createClient as never,
      {
        authMode: 'existing_session',
        role: 'admin',
        name: '소셜 관리자',
        hospitalId: 'org-1',
        hospitalName: '세브란스병원',
        hospitalSource: 'data.go.kr',
      },
      {},
      {
        accessToken: 'jwt-1',
      },
    )

    expect(spies.getUser).toHaveBeenCalledWith('jwt-1')
    expect(spies.createUser).not.toHaveBeenCalled()
    expect(spies.deleteUser).not.toHaveBeenCalled()
    expect(spies.rpc).toHaveBeenCalledWith(
      'submit_admin_signup_atomic',
      expect.objectContaining({
        p_user_id: 'oauth-user-1',
        p_requester_email: 'social@example.com',
      }),
    )
    expect(spies.updateUserById).toHaveBeenCalledWith('oauth-user-1', {
      user_metadata: {
        display_name: '소셜 관리자',
        name: '소셜 관리자',
      },
      app_metadata: expect.objectContaining({
        organization_id: 'org-1',
        organization_memberships: [
          expect.objectContaining({
            organization_id: 'org-1',
            role: 'admin',
            status: 'pending',
          }),
        ],
      }),
    })
    expect(response.nextState).toBe('pending_approval')
  })

  it('uses the bearer token user for existing session invite signup without creating auth user', async () => {
    const { createClient, spies } = createServiceClients()
    spies.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'oauth-user-2',
          email: 'social-user@example.com',
        },
      },
      error: null,
    })
    spies.rpc.mockResolvedValue({
      data: [
        {
          organization_id: 'org-2',
          membership_id: 'membership-2',
          signup_request_id: 'request-2',
        },
      ],
      error: null,
    })
    spies.updateUserById.mockResolvedValue({
      data: {
        user: {
          id: 'oauth-user-2',
        },
      },
      error: null,
    })

    const response = await processSignupSubmit(
      createClient as never,
      {
        authMode: 'existing_session',
        role: 'user',
        name: '소셜 사용자',
        inviteCode: 'INV-VALID-002',
      },
      {
        validateInviteCode: vi.fn().mockResolvedValue({
          type: 'valid',
          organizationId: 'org-2',
          codeHash: 'hashed-code',
        }),
      },
      {
        accessToken: 'jwt-2',
      },
    )

    expect(spies.createUser).not.toHaveBeenCalled()
    expect(spies.deleteUser).not.toHaveBeenCalled()
    expect(spies.rpc).toHaveBeenCalledWith(
      'redeem_user_invite_signup_atomic',
      expect.objectContaining({
        p_user_id: 'oauth-user-2',
        p_organization_id: 'org-2',
        p_requester_email: 'social-user@example.com',
        p_invite_code_hash: 'hashed-code',
      }),
    )
    expect(spies.updateUserById).toHaveBeenCalledWith('oauth-user-2', {
      user_metadata: {
        display_name: '소셜 사용자',
        name: '소셜 사용자',
      },
      app_metadata: expect.objectContaining({
        account_status: 'active',
        organization_id: 'org-2',
        organization_memberships: [
          expect.objectContaining({
            organization_id: 'org-2',
            role: 'user',
            status: 'approved',
          }),
        ],
      }),
    })
    expect(response).toEqual({
      path: 'user_invite_redeem',
      nextState: 'active',
      signupRequestStatus: 'approved',
      membershipStatus: 'approved',
      signupRequestId: 'request-2',
      organizationId: 'org-2',
    })
  })

  it('does not delete the auth user when existing session rpc fails', async () => {
    const { createClient, spies } = createServiceClients()
    spies.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'oauth-user-1',
          email: 'social@example.com',
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

    await expect(
      processSignupSubmit(
        createClient as never,
        {
          authMode: 'existing_session',
          role: 'admin',
          name: '소셜 관리자',
          hospitalId: 'org-1',
          hospitalName: '세브란스병원',
          hospitalSource: 'data.go.kr',
        },
        {},
        {
          accessToken: 'jwt-1',
        },
      ),
    ).rejects.toMatchObject({
      code: 'DUPLICATE_REQUEST',
    })

    expect(spies.createUser).not.toHaveBeenCalled()
    expect(spies.deleteUser).not.toHaveBeenCalled()
    expect(spies.updateUserById).not.toHaveBeenCalled()
  })

  it('maps existing session metadata update failures to auth_user_update internal errors', async () => {
    const { createClient, spies } = createServiceClients()
    spies.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'oauth-user-1',
          email: 'social@example.com',
        },
      },
      error: null,
    })
    spies.rpc.mockResolvedValue({
      data: [
        {
          signup_request_id: 'request-1',
          organization_id: 'org-1',
        },
      ],
      error: null,
    })
    spies.updateUserById.mockResolvedValue({
      data: {
        user: null,
      },
      error: {
        message: 'metadata update failed',
      },
    })

    await expect(
      processSignupSubmit(
        createClient as never,
        {
          authMode: 'existing_session',
          role: 'admin',
          name: '소셜 관리자',
          hospitalId: 'org-1',
          hospitalName: '세브란스병원',
          hospitalSource: 'data.go.kr',
        },
        {},
        {
          accessToken: 'jwt-1',
        },
      ),
    ).rejects.toMatchObject({
      code: 'INTERNAL_ERROR',
      details: {
        stage: 'auth_user_update',
      },
    })

    expect(spies.createUser).not.toHaveBeenCalled()
    expect(spies.deleteUser).not.toHaveBeenCalled()
  })

  it('rejects existing session signup when the provider email is missing', async () => {
    const { createClient, spies } = createServiceClients()
    spies.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'oauth-user-1',
          email: null,
        },
      },
      error: null,
    })

    await expect(
      processSignupSubmit(
        createClient as never,
        {
          authMode: 'existing_session',
          role: 'user',
          name: '소셜 사용자',
          inviteCode: 'INV-1',
        },
        {},
        {
          accessToken: 'jwt-1',
        },
      ),
    ).rejects.toMatchObject({
      code: 'OAUTH_EMAIL_REQUIRED',
    })

    expect(spies.getUser).toHaveBeenCalledWith('jwt-1')
    expect(spies.createUser).not.toHaveBeenCalled()
  })

  it('rejects existing session signup when the bearer token is missing', async () => {
    const { createClient, spies } = createServiceClients()

    await expect(
      processSignupSubmit(
        createClient as never,
        {
          authMode: 'existing_session',
          role: 'admin',
          name: '소셜 관리자',
          hospitalId: 'org-1',
          hospitalName: '세브란스병원',
          hospitalSource: 'data.go.kr',
        },
        {},
      ),
    ).rejects.toMatchObject({
      code: 'AUTH_SESSION_REQUIRED',
      status: 401,
    })

    expect(spies.getUser).not.toHaveBeenCalled()
    expect(spies.createUser).not.toHaveBeenCalled()
  })
})

describe('signup-submit request context', () => {
  it('passes the authorization bearer token to signup-submit processing context', () => {
    const request = new Request('https://example.test/signup-submit', {
      method: 'POST',
      headers: {
        authorization: 'Bearer jwt-1',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        authMode: 'existing_session',
        role: 'admin',
        name: '소셜 관리자',
        hospitalId: 'org-1',
        hospitalName: '세브란스병원',
        hospitalSource: 'data.go.kr',
      }),
    })

    expect(createSignupSubmitContextFromRequest(request)).toEqual({
      accessToken: 'jwt-1',
    })
  })

  it('accepts case-insensitive bearer authorization schemes', () => {
    const request = new Request('https://example.test/signup-submit', {
      method: 'POST',
      headers: {
        authorization: 'bearer jwt-1',
      },
    })

    expect(createSignupSubmitContextFromRequest(request)).toEqual({
      accessToken: 'jwt-1',
    })
  })
})
