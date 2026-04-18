import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/api/supabase'
import type { User } from '@supabase/supabase-js'
import { useScheduleStore } from '@/stores/schedule'
import { useRbacStore } from '@/stores/rbac'

function mapLoginErrorMessage(error: unknown): string {
  const authError = error as { code?: unknown; message?: unknown } | null
  const errorCode = typeof authError?.code === 'string' ? authError.code : null
  const errorMessage = typeof authError?.message === 'string' ? authError.message : null

  if (
    errorCode === 'invalid_credentials' ||
    errorMessage === 'Invalid login credentials'
  ) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.'
  }

  return error instanceof Error ? error.message : 'Unknown error'
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  let pendingSessionCheck: Promise<void> | null = null

  function syncAuthUser(nextUser: User | null) {
    const rbacStore = useRbacStore()
    user.value = nextUser
    useScheduleStore().syncWithAuthUser(nextUser)
    rbacStore.setSessionUser(nextUser)
  }

  async function syncAndHydrateAuthUser(nextUser: User | null) {
    syncAuthUser(nextUser)

    if (!nextUser) {
      return
    }

    await useRbacStore().ensureAccessContextLoaded()
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

      await syncAndHydrateAuthUser(data.user)
      return { success: true }
    } catch (error: unknown) {
      const message = mapLoginErrorMessage(error)
      return { success: false, error: message }
    } finally {
      loading.value = false
    }
  }

  /**
   * 로그아웃
   */
  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }

    syncAuthUser(null)
    return { success: true }
  }

  /**
   * 세션 확인 (앱 시작 시 호출)
   */
  async function checkSession() {
    if (pendingSessionCheck) {
      await pendingSessionCheck
      return
    }

    pendingSessionCheck = (async () => {
      const { data } = await supabase.auth.getSession()
      await syncAndHydrateAuthUser(data.session?.user ?? null)
    })().finally(() => {
      pendingSessionCheck = null
    })

    await pendingSessionCheck
  }

  return {
    user,
    loading,
    login,
    logout,
    checkSession,
  }
})
