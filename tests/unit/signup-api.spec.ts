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
  const originalMockSignup = env.VITE_ENABLE_MOCK_SIGNUP

  beforeEach(() => {
    vi.clearAllMocks()
    env.VITE_SIGNUP_FORCE_REMOTE = undefined
    env.VITE_ENABLE_MOCK_SIGNUP = undefined
  })

  afterEach(() => {
    env.VITE_SIGNUP_FORCE_REMOTE = originalForceRemote
    env.VITE_ENABLE_MOCK_SIGNUP = originalMockSignup
  })

  it('maps legacy invite error code to canonical message', () => {
    expect(getSignupErrorMessage('INVITE_EXPIRED')).toBe(
      SIGNUP_ERROR_MESSAGES.INVALID_INVITE_CODE,
    )
  })

  it('normalizes admin hospital selection into organization identifiers and pending state', async () => {
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
      hospitalId: 'hospital-1',
      hospitalName: '세브란스병원',
      hospitalSource: 'data.go.kr',
    })

    expect(supabase.functions.invoke).toHaveBeenCalledWith('signup-submit', {
      body: expect.objectContaining({
        requestedRole: 'admin',
        organizationSelectionMode: 'existing',
        organizationId: 'hospital-1',
        hospitalId: 'hospital-1',
      }),
    })
    expect(response.nextState).toBe('pending_approval')
    expect(response.organizationId).toBe('hospital-1')
  })

  it('calls the remote signup function by default even in local development', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        success: true,
        data: {
          path: 'admin_submit',
          signupRequestStatus: 'pending',
          membershipStatus: 'none',
          organizationId: 'hospital-1',
        },
      },
      error: null,
    })

    await submitSignup({
      role: 'admin',
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
      hospitalId: 'hospital-1',
      hospitalName: '세브란스병원',
      hospitalSource: 'data.go.kr',
    })

    expect(supabase.functions.invoke).toHaveBeenCalledTimes(1)
  })

  it('uses the mock success path only when VITE_ENABLE_MOCK_SIGNUP is explicitly enabled', async () => {
    env.VITE_ENABLE_MOCK_SIGNUP = 'true'

    const response = await submitSignup({
      role: 'admin',
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
      hospitalId: 'hospital-1',
      hospitalName: '세브란스병원',
      hospitalSource: 'data.go.kr',
    })

    expect(supabase.functions.invoke).not.toHaveBeenCalled()
    expect(response).toMatchObject({
      path: 'admin_submit',
      nextState: 'pending_approval',
      organizationId: 'hospital-1',
    })
  })

  it('maps legacy duplicate request error code to canonical error code', async () => {
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
        hospitalId: 'hospital-1',
        hospitalName: '세브란스병원',
        hospitalSource: 'data.go.kr',
      }),
    ).rejects.toMatchObject({
      name: 'SignupSubmitApiError',
      code: 'DUPLICATE_REQUEST',
      message: 'duplicate pending request',
    })
  })

  it('maps invoke error response payload into canonical invalid invite error', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'INVITE_EXPIRED',
              message: 'invite expired',
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
        inviteCode: 'INV-EXPIRED',
      }),
    ).rejects.toMatchObject({
      name: 'SignupSubmitApiError',
      code: 'INVALID_INVITE_CODE',
      message: 'invite expired',
    })
  })
})
