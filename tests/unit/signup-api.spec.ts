import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}))

import { getSignupErrorMessage, submitSignup } from '@/api/signup'
import { supabase } from '@/api/supabase'
import { SIGNUP_ERROR_MESSAGES } from '@/types/signup'

const env = import.meta.env as ImportMetaEnv & Record<string, string | boolean | undefined>

describe('signup api boundary', () => {
  const originalForceRemote = env.VITE_SIGNUP_FORCE_REMOTE

  beforeEach(() => {
    vi.clearAllMocks()
    env.VITE_SIGNUP_FORCE_REMOTE = 'true'
  })

  afterEach(() => {
    env.VITE_SIGNUP_FORCE_REMOTE = originalForceRemote
  })

  it('maps legacy error code in message lookup to canonical message', () => {
    expect(getSignupErrorMessage('INVITE_EXPIRED')).toBe(SIGNUP_ERROR_MESSAGES.INVALID_INVITE_CODE)
  })

  it('normalizes admin aliases and fills organizationId fallback from request', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        success: true,
        data: {
          path: 'admin_submit',
          signupRequestStatus: 'pending',
          membershipStatus: 'none',
        },
      },
      error: null,
    })

    const response = await submitSignup({
      role: 'admin',
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
      organizationId: 'org-legacy-id',
      hospitalName: '세브란스병원',
      hospitalSource: 'data.go.kr',
    })

    expect(supabase.functions.invoke).toHaveBeenCalledWith('signup-submit', {
      body: expect.objectContaining({
        requestedRole: 'admin',
        organizationSelectionMode: 'existing',
        organizationId: 'org-legacy-id',
        hospitalId: 'org-legacy-id',
      }),
    })
    expect(response.organizationId).toBe('org-legacy-id')
  })

  it('maps legacy server error code to canonical SignupSubmitApiError code', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        success: false,
        error: {
          code: 'INVITE_EXPIRED',
          message: 'invite expired',
        },
      },
      error: null,
    })

    await expect(
      submitSignup({
        role: 'user',
        name: 'Invite User',
        email: 'user@example.com',
        password: 'password123',
        inviteCode: 'INV-001',
        organizationSelectionMode: 'existing',
      }),
    ).rejects.toMatchObject({
      name: 'SignupSubmitApiError',
      code: 'INVALID_INVITE_CODE',
      message: 'invite expired',
    })
  })

  it('maps duplicate legacy error code to DUPLICATE_REQUEST', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        success: false,
        error: {
          code: 'DUPLICATE_PENDING_REQUEST',
          message: 'duplicate pending request',
        },
      },
      error: null,
    })

    await expect(
      submitSignup({
        role: 'admin',
        name: 'Admin User',
        email: 'duplicate-admin@example.com',
        password: 'password123',
        hospitalId: 'org-1',
        hospitalName: '세브란스병원',
        hospitalSource: 'data.go.kr',
        organizationSelectionMode: 'existing',
      }),
    ).rejects.toMatchObject({
      name: 'SignupSubmitApiError',
      code: 'DUPLICATE_REQUEST',
      message: 'duplicate pending request',
    })
  })

  it('maps legacy details.reason to canonical error code', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'duplicate pending request',
          details: {
            reason: 'DUPLICATE_PENDING_REQUEST',
          },
        },
      },
      error: null,
    })

    await expect(
      submitSignup({
        role: 'user',
        name: 'Invite User',
        email: 'user@example.com',
        password: 'password123',
        inviteCode: 'INV-001',
      }),
    ).rejects.toMatchObject({
      name: 'SignupSubmitApiError',
      code: 'DUPLICATE_REQUEST',
      message: 'duplicate pending request',
    })
  })

  it('maps invoke HTTP error response payload to canonical SignupSubmitApiError', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'INVALID_INVITE_CODE',
              message: 'Invite code is invalid.',
              details: {
                reason: 'INVITE_NOT_FOUND',
              },
            },
          }),
          {
            status: 400,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      },
    })

    await expect(
      submitSignup({
        role: 'user',
        name: 'Invite User',
        email: 'user@example.com',
        password: 'password123',
        inviteCode: 'invalid-anything',
        organizationSelectionMode: 'existing',
      }),
    ).rejects.toMatchObject({
      name: 'SignupSubmitApiError',
      code: 'INVALID_INVITE_CODE',
      message: 'Invite code is invalid.',
    })
  })

  it('does not fallback to dev mock when force remote is enabled and invoke fails', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: {
        message: 'network failure',
      },
    })

    await expect(
      submitSignup({
        role: 'user',
        name: 'Invite User',
        email: 'user@example.com',
        password: 'password123',
        inviteCode: 'invalid-anything',
        organizationSelectionMode: 'existing',
      }),
    ).rejects.toMatchObject({
      name: 'SignupSubmitApiError',
      code: 'INTERNAL_ERROR',
      message: 'network failure',
    })
  })

  it('does not fallback on contract-only scaffold response when force remote is enabled', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'signup-submit persistence is not implemented yet.',
          details: {
            stage: 'contract_only_scaffold',
          },
        },
      },
      error: null,
    })

    await expect(
      submitSignup({
        role: 'user',
        name: 'Invite User',
        email: 'user@example.com',
        password: 'password123',
        inviteCode: 'invalid-anything',
        organizationSelectionMode: 'existing',
      }),
    ).rejects.toMatchObject({
      name: 'SignupSubmitApiError',
      code: 'INTERNAL_ERROR',
      message: 'signup-submit persistence is not implemented yet.',
    })
  })
})
