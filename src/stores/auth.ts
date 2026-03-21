import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchAuthContext } from '@/api/auth-context'
import { getSignupErrorMessage, submitSignup, SignupSubmitApiError } from '@/api/signup'
import { supabase } from '@/api/supabase'
import { useOnboardingStore } from '@/stores/onboarding'
import { useRbacStore } from '@/stores/rbac'
import type { User } from '@supabase/supabase-js'
import {
  SIGNUP_ERROR_MESSAGES,
  type SignupErrorCode,
  type SignupStoreSignupErrorResult,
  type SignupStoreSignupResult,
  type SignupStoreSignupSuccessResult,
  type SignupSubmitRequest,
  type SignupSubmitResolvedSuccessData,
} from '@/types/signup'

function isSignupErrorCode(value: unknown): value is SignupErrorCode {
  return typeof value === 'string' && value in SIGNUP_ERROR_MESSAGES
}

function resolveSignupErrorCode(error: unknown): SignupErrorCode | null {
  if (error instanceof SignupSubmitApiError && isSignupErrorCode(error.code)) {
    return error.code
  }

  if (error && typeof error === 'object') {
    const maybeCode = Reflect.get(error, 'code')
    if (isSignupErrorCode(maybeCode)) {
      return maybeCode
    }
  }

  return null
}

type SignupNextState = SignupSubmitResolvedSuccessData['nextState']

function getSignupSuccessMessage(nextState: SignupNextState): string {
  return nextState === 'active'
    ? '가입이 완료되었습니다. 로그인할 수 있습니다.'
    : '가입 신청이 완료되었습니다. 관리자 승인을 기다려주세요.'
}

function createSignupSuccessResult(data: SignupSubmitResolvedSuccessData): SignupStoreSignupSuccessResult {
  const nextState = data.nextState
  return {
    success: true,
    nextState,
    message: getSignupSuccessMessage(nextState),
    error: null,
    errorCode: null,
    data,
  }
}

function createSignupErrorResult(errorCode: SignupErrorCode): SignupStoreSignupErrorResult {
  const message = getSignupErrorMessage(errorCode)

  return {
    success: false,
    nextState: null,
    message,
    error: message,
    errorCode,
    data: null,
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)

  function syncSessionHandoffs(nextUser: User | null) {
    const rbacStore = useRbacStore()
    const onboardingStore = useOnboardingStore()
    rbacStore.setSessionUserId(nextUser?.id ?? null)
    onboardingStore.setSessionUserId(nextUser?.id ?? null)
  }

  async function ensureAccessContext(forceRefresh = false) {
    const rbacStore = useRbacStore()

    if (!user.value) {
      rbacStore.clearContext()
      useOnboardingStore().clearContext()
      return null
    }

    if (!forceRefresh && rbacStore.initialized && rbacStore.context) {
      return rbacStore.context
    }

    rbacStore.setLoading(true)

    try {
      const context = await fetchAuthContext(user.value)
      rbacStore.setAuthContext(context)
      return context
    } catch (error) {
      console.warn('[auth] Failed to hydrate auth context:', error)
      rbacStore.clearContext()
      useOnboardingStore().setScope({
        accessState: null,
        organizationId: null,
      })
      return null
    }
  }

  /**
   * 이메일/비밀번호 로그인
   */
  async function login(email: string, password: string) {
    loading.value = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      user.value = data.user
      syncSessionHandoffs(data.user)
      await ensureAccessContext(true)
      return { success: true }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    } finally {
      loading.value = false
    }
  }

  /**
   * 역할 기반 회원가입 요청
   */
  async function signup(request: SignupSubmitRequest): Promise<SignupStoreSignupResult> {
    loading.value = true
    try {
      const data = await submitSignup(request)
      return createSignupSuccessResult(data)
    } catch (error: unknown) {
      const resolvedCode = resolveSignupErrorCode(error)
      if (resolvedCode) {
        return createSignupErrorResult(resolvedCode)
      }

      const fallbackCode: SignupErrorCode = 'INTERNAL_ERROR'
      return createSignupErrorResult(fallbackCode)
    } finally {
      loading.value = false
    }
  }

  /**
   * 로그아웃
   */
  async function logout() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      user.value = null
      useRbacStore().clearContext()
      useOnboardingStore().clearContext()
      return { success: true }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '로그아웃 실패'
      return { success: false, error: message }
    }
  }

  /**
   * 세션 확인 (앱 시작 시 호출)
   */
  async function checkSession() {
    const { data } = await supabase.auth.getSession()
    user.value = data.session?.user ?? null
    syncSessionHandoffs(user.value)
    await ensureAccessContext()
  }

  return {
    user,
    loading,
    login,
    signup,
    logout,
    checkSession,
    ensureAccessContext,
  }
})
