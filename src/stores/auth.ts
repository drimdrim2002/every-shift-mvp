import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSignupErrorMessage, submitSignup, SignupSubmitApiError } from '@/api/signup'
import { supabase } from '@/api/supabase'
import type { User } from '@supabase/supabase-js'
import {
  SIGNUP_ERROR_MESSAGES,
  type SignupErrorCode,
  type SignupNextState,
  type SignupStoreSignupErrorResult,
  type SignupStoreSignupResult,
  type SignupStoreSignupSuccessResult,
  type SignupSubmitRequest,
  type SignupSubmitResolvedSuccessData,
  type SignupSubmitSuccessData,
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

function deriveSignupNextState(data: SignupSubmitSuccessData): SignupNextState {
  if (data.nextState === 'pending_approval' || data.nextState === 'active') {
    return data.nextState
  }

  if (data.signupRequestStatus === 'approved' || data.membershipStatus === 'approved') {
    return 'active'
  }

  return 'pending_approval'
}

function getSignupSuccessMessage(nextState: SignupNextState): string {
  return nextState === 'active'
    ? '가입이 완료되었습니다. 로그인할 수 있습니다.'
    : '가입 신청이 완료되었습니다. 관리자 승인을 기다려주세요.'
}

function createSignupSuccessResult(data: SignupSubmitSuccessData): SignupStoreSignupSuccessResult {
  const nextState = deriveSignupNextState(data)
  const resolvedData: SignupSubmitResolvedSuccessData = {
    ...data,
    nextState,
  }

  return {
    success: true,
    nextState,
    message: getSignupSuccessMessage(nextState),
    error: null,
    errorCode: null,
    data: resolvedData,
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
  }

  return {
    user,
    loading,
    login,
    signup,
    logout,
    checkSession,
  }
})
