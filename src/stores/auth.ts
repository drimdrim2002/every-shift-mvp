import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/api/supabase'
import type { User } from '@supabase/supabase-js'
import { OAUTH_CALLBACK_ROUTE_PATH } from '@/constants/routes'
import { useOrganizationStore } from '@/stores/organization'
import { useScheduleStore } from '@/stores/schedule'
import { useRbacStore } from '@/stores/rbac'
import type {
  OAuthCallbackResult,
  SocialAuthIntent,
  SocialAuthProviderId,
} from '@/types/auth'
import type { AccessState } from '@/types/rbac'

type SupabaseOAuthInput = Parameters<typeof supabase.auth.signInWithOAuth>[0]

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

function buildOAuthRedirectTo(intent: SocialAuthIntent): string {
  return `${window.location.origin}${OAUTH_CALLBACK_ROUTE_PATH}?intent=${intent}`
}

function buildSupabaseOAuthInput(
  provider: SocialAuthProviderId,
  intent: SocialAuthIntent,
): SupabaseOAuthInput {
  return {
    // Supabase supports custom OAuth provider IDs at runtime, but this SDK version's
    // Provider type does not include project-specific values like custom:naver.
    provider: provider as SupabaseOAuthInput['provider'],
    options: {
      redirectTo: buildOAuthRedirectTo(intent),
    },
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  let pendingSessionCheck: Promise<void> | null = null

  function resolveAccessScope(userId: string | null) {
    if (!userId) {
      return null
    }

    const rbacStore = useRbacStore()
    return {
      userId,
      organizationId:
        rbacStore.selectedOrganizationId ?? rbacStore.effectiveMembership?.organizationId ?? null,
    }
  }

  function syncAuthUser(nextUser: User | null) {
    const rbacStore = useRbacStore()
    const previousUserId = user.value?.id ?? null
    user.value = nextUser
    rbacStore.setSessionUser(nextUser)

    if (previousUserId !== (nextUser?.id ?? null)) {
      useOrganizationStore().resetContext()
    }

    if (!nextUser) {
      useScheduleStore().syncWithAccessScope(null)
    }
  }

  async function syncAndHydrateAuthUser(nextUser: User | null) {
    syncAuthUser(nextUser)

    if (!nextUser) {
      return
    }

    const rbacStore = useRbacStore()
    await rbacStore.ensureAccessContextLoaded()
    useScheduleStore().syncWithAccessScope(resolveAccessScope(nextUser.id))
  }

  /**
   * 이메일/비밀번호 로그인
   */
  async function login(email: string, password: string) {
    loading.value = true
    try {
      const rbacStore = useRbacStore()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      await syncAndHydrateAuthUser(data.user)
      return {
        success: true as const,
        accessState: rbacStore.accessState as AccessState,
      }
    } catch (error: unknown) {
      const message = mapLoginErrorMessage(error)
      return { success: false as const, error: message }
    } finally {
      loading.value = false
    }
  }

  async function startOAuth(provider: SocialAuthProviderId, intent: SocialAuthIntent) {
    loading.value = true
    try {
      const { error } = await supabase.auth.signInWithOAuth(
        buildSupabaseOAuthInput(provider, intent),
      )

      if (error) {
        throw error
      }

      return { success: true as const }
    } catch (error: unknown) {
      return {
        success: false as const,
        error: error instanceof Error ? error.message : '소셜 인증을 시작하지 못했습니다.',
      }
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

  async function refreshSessionContext() {
    const rbacStore = useRbacStore()
    await checkSession()
    return rbacStore.accessState as AccessState
  }

  async function handleOAuthCallback(
    intent: SocialAuthIntent,
    code?: string | null,
  ): Promise<OAuthCallbackResult> {
    try {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
          throw error
        }
      }

      const accessState = await refreshSessionContext()

      if (!user.value) {
        return { success: false, error: '인증 세션을 확인할 수 없습니다.' }
      }

      return {
        success: true,
        intent,
        accessState,
      }
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '소셜 인증 처리에 실패했습니다.',
      }
    }
  }

  return {
    user,
    loading,
    login,
    startOAuth,
    logout,
    checkSession,
    refreshSessionContext,
    handleOAuthCallback,
  }
})
