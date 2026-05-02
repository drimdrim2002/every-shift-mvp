import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
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

  it('maps oauth and auth session error codes to Korean messages', () => {
    expect(getSignupErrorMessage('OAUTH_EMAIL_REQUIRED')).toBe(
      '소셜 계정에서 이메일을 확인할 수 없습니다.',
    )
    expect(getSignupErrorMessage('AUTH_SESSION_REQUIRED')).toBe(
      '인증 세션이 만료되었습니다. 다시 로그인해 주세요.',
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

  it('normalizes manual admin hospital entry without requiring a searched hospital id', async () => {
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

    await submitSignup({
      role: 'admin',
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
      hospitalName: '새봄병원',
    })

    expect(supabase.functions.invoke).toHaveBeenCalledWith('signup-submit', {
      body: expect.objectContaining({
        requestedRole: 'admin',
        organizationSelectionMode: 'manual',
        hospitalName: '새봄병원',
        hospitalSource: 'manual',
      }),
    })
    expect(supabase.functions.invoke.mock.calls[0]?.[1]?.body).not.toHaveProperty('organizationId')
    expect(supabase.functions.invoke.mock.calls[0]?.[1]?.body).not.toHaveProperty('hospitalId')
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

  it('existing session signup sends current access token', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'jwt-1',
        },
      },
      error: null,
    })
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
      authMode: 'existing_session',
      role: 'admin',
      name: '소셜 관리자',
      hospitalId: 'hospital-1',
      hospitalName: '세브란스병원',
      hospitalSource: 'data.go.kr',
    })

    expect(supabase.functions.invoke).toHaveBeenCalledWith('signup-submit', {
      body: expect.objectContaining({
        authMode: 'existing_session',
        role: 'admin',
        name: '소셜 관리자',
      }),
      headers: {
        Authorization: 'Bearer jwt-1',
      },
    })
  })

  it('existing session signup requires a current access token before invoking signup-submit', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: null,
      },
      error: null,
    })

    await expect(
      submitSignup({
        authMode: 'existing_session',
        role: 'admin',
        name: '소셜 관리자',
        hospitalId: 'hospital-1',
        hospitalName: '세브란스병원',
        hospitalSource: 'data.go.kr',
      }),
    ).rejects.toMatchObject({
      name: 'SignupSubmitApiError',
      code: 'AUTH_SESSION_REQUIRED',
    })

    expect(supabase.functions.invoke).not.toHaveBeenCalled()
  })

  it('password signup with omitted auth mode invokes signup-submit without reading the current session', async () => {
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

    expect(supabase.auth.getSession).not.toHaveBeenCalled()
    expect(supabase.functions.invoke).toHaveBeenCalledWith('signup-submit', {
      body: expect.objectContaining({
        role: 'admin',
        email: 'admin@example.com',
        requestedRole: 'admin',
        organizationId: 'hospital-1',
      }),
    })
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

  it('existing session signup uses mock success without reading auth or invoking the function when mock signup is enabled', async () => {
    env.VITE_ENABLE_MOCK_SIGNUP = 'true'

    const response = await submitSignup({
      authMode: 'existing_session',
      role: 'admin',
      name: '소셜 관리자',
      hospitalId: 'hospital-1',
      hospitalName: '세브란스병원',
      hospitalSource: 'data.go.kr',
    })

    expect(supabase.auth.getSession).not.toHaveBeenCalled()
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
