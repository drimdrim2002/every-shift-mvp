import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSignupErrorMessage, submitSignup, SignupSubmitApiError } from '@/api/signup'
import { supabase } from '@/api/supabase'
import type { User } from '@supabase/supabase-js'
import type { SignupErrorCode, SignupNextState, SignupSubmitRequest, SignupSubmitSuccessData } from '@/types/signup'

function deriveSignupNextState(data: SignupSubmitSuccessData): SignupNextState {
  if (data.nextState === 'pending_approval' || data.nextState === 'active') {
    return data.nextState
  }

  if (data.signupRequestStatus === 'approved' || data.membershipStatus === 'approved') {
    return 'active'
  }

  return 'pending_approval'
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
  async function signup(request: SignupSubmitRequest) {
    loading.value = true
    try {
      const data = await submitSignup(request)
      const nextState = deriveSignupNextState(data)

      return {
        success: true as const,
        data: {
          ...data,
          nextState,
        },
        nextState,
      }
    } catch (error: unknown) {
      if (error instanceof SignupSubmitApiError) {
        return {
          success: false as const,
          error: getSignupErrorMessage(error.code),
          errorCode: error.code,
        }
      }

      return {
        success: false as const,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'INTERNAL_ERROR' as SignupErrorCode,
      }
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
