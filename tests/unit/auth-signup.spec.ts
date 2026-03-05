import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const signupApiMock = vi.hoisted(() => {
  class SignupSubmitApiError extends Error {
    code: string
    details?: Record<string, unknown>

    constructor(code: string, message?: string, details?: Record<string, unknown>) {
      super(message ?? code)
      this.name = 'SignupSubmitApiError'
      this.code = code
      this.details = details
    }
  }

  return {
    submitSignup: vi.fn(),
    getSignupErrorMessage: vi.fn(),
    SignupSubmitApiError,
  }
})

vi.mock('@/api/signup', () => ({
  submitSignup: signupApiMock.submitSignup,
  getSignupErrorMessage: signupApiMock.getSignupErrorMessage,
  SignupSubmitApiError: signupApiMock.SignupSubmitApiError,
}))

vi.mock('@/api/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(async () => ({ data: { session: null } })),
    },
  },
}))

import { SignupSubmitApiError, getSignupErrorMessage, submitSignup } from '@/api/signup'
import { useAuthStore } from '@/stores/auth'
import type { SignupSubmitRequest } from '@/types/signup'

const adminRequest: SignupSubmitRequest = {
  role: 'admin',
  name: 'Admin User',
  email: 'admin@example.com',
  password: 'password123',
  hospitalId: 'org-1',
  hospitalName: '세브란스병원',
  hospitalSource: 'data.go.kr',
  organizationSelectionMode: 'existing',
}

const userRequest: SignupSubmitRequest = {
  role: 'user',
  name: 'Invite User',
  email: 'user@example.com',
  password: 'password123',
  inviteCode: 'INV-001',
  organizationSelectionMode: 'existing',
}

describe('auth store signup contract', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(getSignupErrorMessage).mockImplementation((code: unknown) => `mapped:${String(code)}`)
  })

  it('returns deterministic pending result for admin when nextState is omitted', async () => {
    vi.mocked(submitSignup).mockResolvedValue({
      path: 'admin_submit',
      signupRequestStatus: 'pending',
      membershipStatus: 'none',
      organizationId: 'org-1',
    })

    const authStore = useAuthStore()
    const result = await authStore.signup(adminRequest)

    expect(submitSignup).toHaveBeenCalledWith(adminRequest)
    expect(submitSignup).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      success: true,
      nextState: 'pending_approval',
      message: '가입 신청이 완료되었습니다. 관리자 승인을 기다려주세요.',
      error: null,
      errorCode: null,
      data: {
        path: 'admin_submit',
        signupRequestStatus: 'pending',
        membershipStatus: 'none',
        organizationId: 'org-1',
        nextState: 'pending_approval',
      },
    })
  })

  it('returns deterministic active result for user success', async () => {
    vi.mocked(submitSignup).mockResolvedValue({
      path: 'user_invite_redeem',
      nextState: 'active',
      signupRequestStatus: 'approved',
      membershipStatus: 'approved',
      organizationId: 'org-1',
      signupRequestId: 'request-1',
    })

    const authStore = useAuthStore()
    const result = await authStore.signup(userRequest)

    expect(submitSignup).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      success: true,
      nextState: 'active',
      message: '가입이 완료되었습니다. 로그인할 수 있습니다.',
      error: null,
      errorCode: null,
      data: {
        path: 'user_invite_redeem',
        nextState: 'active',
        signupRequestStatus: 'approved',
        membershipStatus: 'approved',
        organizationId: 'org-1',
        signupRequestId: 'request-1',
      },
    })
  })

  it('returns canonical mapped message and code for API errors', async () => {
    vi.mocked(submitSignup).mockRejectedValue(new SignupSubmitApiError('INVALID_INVITE_CODE'))
    vi.mocked(getSignupErrorMessage).mockImplementation((code: unknown) =>
      code === 'INVALID_INVITE_CODE' ? '초대코드가 유효하지 않습니다.' : `mapped:${String(code)}`,
    )

    const authStore = useAuthStore()
    const result = await authStore.signup(userRequest)

    expect(submitSignup).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      success: false,
      nextState: null,
      message: '초대코드가 유효하지 않습니다.',
      error: '초대코드가 유효하지 않습니다.',
      errorCode: 'INVALID_INVITE_CODE',
      data: null,
    })
  })

  it('keeps canonical error mapping even when thrown error is not SignupSubmitApiError instance', async () => {
    vi.mocked(submitSignup).mockRejectedValue({
      name: 'SignupSubmitApiError',
      code: 'INVALID_INVITE_CODE',
      message: 'Invite code is invalid.',
      details: {
        reason: 'INVITE_NOT_FOUND',
      },
    })
    vi.mocked(getSignupErrorMessage).mockImplementation((code: unknown) =>
      code === 'INVALID_INVITE_CODE' ? '초대코드가 유효하지 않습니다.' : `mapped:${String(code)}`,
    )

    const authStore = useAuthStore()
    const result = await authStore.signup(userRequest)

    expect(submitSignup).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      success: false,
      nextState: null,
      message: '초대코드가 유효하지 않습니다.',
      error: '초대코드가 유효하지 않습니다.',
      errorCode: 'INVALID_INVITE_CODE',
      data: null,
    })
  })

  it('returns INTERNAL_ERROR contract for unknown errors', async () => {
    vi.mocked(submitSignup).mockRejectedValue(new Error('network down'))

    const authStore = useAuthStore()
    const result = await authStore.signup(userRequest)

    expect(submitSignup).toHaveBeenCalledTimes(1)
    expect(getSignupErrorMessage).toHaveBeenCalledWith('INTERNAL_ERROR')
    expect(result).toEqual({
      success: false,
      nextState: null,
      message: 'mapped:INTERNAL_ERROR',
      error: 'mapped:INTERNAL_ERROR',
      errorCode: 'INTERNAL_ERROR',
      data: null,
    })
  })
})
