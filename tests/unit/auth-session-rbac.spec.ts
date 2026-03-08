import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const supabaseAuthMock = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
}))

vi.mock('@/api/signup', () => ({
  submitSignup: vi.fn(),
  getSignupErrorMessage: vi.fn((code: unknown) => String(code)),
  SignupSubmitApiError: class SignupSubmitApiError extends Error {
    code: string

    constructor(code: string, message?: string) {
      super(message ?? code)
      this.name = 'SignupSubmitApiError'
      this.code = code
    }
  },
}))

vi.mock('@/api/supabase', () => ({
  supabase: {
    auth: supabaseAuthMock,
  },
}))

const fetchAuthContextMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/auth-context', () => ({
  fetchAuthContext: fetchAuthContextMock,
}))

import { useAuthStore } from '@/stores/auth'
import { useRbacStore } from '@/stores/rbac'

describe('auth store RBAC handoff', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    supabaseAuthMock.signOut.mockResolvedValue({ error: null })
    supabaseAuthMock.getSession.mockResolvedValue({
      data: {
        session: null,
      },
    })
    fetchAuthContextMock.mockResolvedValue({
      profile: {
        userId: 'user-1',
        globalRole: 'user',
        accountStatus: 'active',
      },
      memberships: [
        {
          organizationId: 'org-1',
          role: 'user',
          status: 'approved',
          approvedAt: '2026-03-07T01:00:00.000Z',
        },
      ],
      currentOrganizationId: 'org-1',
    })
  })

  it('hydrates RBAC context after login', async () => {
    supabaseAuthMock.signInWithPassword.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
        },
      },
      error: null,
    })

    const authStore = useAuthStore()
    const rbacStore = useRbacStore()

    const result = await authStore.login('user@example.com', 'password123')

    expect(result).toEqual({ success: true })
    expect(rbacStore.sessionUserId).toBe('user-1')
    expect(fetchAuthContextMock).toHaveBeenCalledTimes(1)
    expect(rbacStore.initialized).toBe(true)
    expect(rbacStore.accessState).toBe('user_active')
  })

  it('clears RBAC context on logout', async () => {
    const authStore = useAuthStore()
    const rbacStore = useRbacStore()

    rbacStore.setSessionUserId('user-1')
    rbacStore.setAuthContext({
      profile: {
        userId: 'user-1',
        globalRole: 'user',
        accountStatus: 'active',
      },
      memberships: [
        {
          organizationId: 'org-1',
          role: 'user',
          status: 'approved',
          approvedAt: '2026-03-07T01:00:00.000Z',
        },
      ],
    })

    const result = await authStore.logout()

    expect(result).toEqual({ success: true })
    expect(rbacStore.sessionUserId).toBeNull()
    expect(rbacStore.context).toBeNull()
    expect(rbacStore.accessState).toBe('unauthenticated')
  })

  it('clears RBAC context when session restore finds no active session', async () => {
    const authStore = useAuthStore()
    const rbacStore = useRbacStore()

    rbacStore.setSessionUserId('user-1')
    rbacStore.setAuthContext({
      profile: {
        userId: 'user-1',
        globalRole: 'admin',
        accountStatus: 'active',
      },
      memberships: [
        {
          organizationId: 'org-1',
          role: 'admin',
          status: 'approved',
          approvedAt: '2026-03-07T01:00:00.000Z',
        },
      ],
    })

    await authStore.checkSession()

    expect(rbacStore.sessionUserId).toBeNull()
    expect(rbacStore.context).toBeNull()
    expect(rbacStore.accessState).toBe('unauthenticated')
  })
})
