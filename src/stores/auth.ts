import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/api/supabase'
import type { User } from '@supabase/supabase-js'
import { useScheduleStore } from '@/stores/schedule'
import { useRbacStore } from '@/stores/rbac'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)

  function syncAuthUser(nextUser: User | null) {
    user.value = nextUser
    useScheduleStore().syncWithAuthUser(nextUser)
    useRbacStore().setSessionUser(nextUser)
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

      syncAuthUser(data.user)
      return { success: true }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
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
    const { data } = await supabase.auth.getSession()
    syncAuthUser(data.session?.user ?? null)
  }

  return {
    user,
    loading,
    login,
    logout,
    checkSession,
  }
})
