<template>
  <AuthPageShell
    eyebrow="EveryShift"
    title="인증 처리 중"
    description="잠시만 기다려주세요."
    variant="compact"
  >
    <div data-test="oauth-callback-loading">
      인증 정보를 확인하고 있습니다.
    </div>
  </AuthPageShell>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthPageShell from '@/components/auth/AuthPageShell.vue'
import {
  LOGIN_ROUTE_PATH,
  SOCIAL_SIGNUP_COMPLETE_ROUTE_PATH,
  resolvePostAuthRedirectPath,
} from '@/constants/routes'
import { useAuthStore } from '@/stores/auth'
import type { SocialAuthIntent } from '@/types/auth'
import { showError } from '@/utils/message'

function resolveIntent(value: unknown): SocialAuthIntent {
  return value === 'signup' ? 'signup' : 'login'
}

function resolveCode(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.length > 0 ? value : null
  }

  if (!Array.isArray(value)) {
    return null
  }

  for (const entry of value) {
    if (typeof entry === 'string' && entry.length > 0) {
      return entry
    }
  }

  return null
}

function hasRouteQueryValue(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.length > 0
  }

  if (!Array.isArray(value)) {
    return false
  }

  return value.some((entry) => typeof entry === 'string' && entry.length > 0)
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

onMounted(async () => {
  if (hasRouteQueryValue(route.query.error_description) || hasRouteQueryValue(route.query.error)) {
    showError('소셜 인증이 취소되었거나 실패했습니다.')
    await router.replace(LOGIN_ROUTE_PATH)
    return
  }

  const result = await authStore.handleOAuthCallback(
    resolveIntent(route.query.intent),
    resolveCode(route.query.code),
  )

  if (!result.success) {
    showError(result.error)
    await router.replace(LOGIN_ROUTE_PATH)
    return
  }

  if (result.intent === 'signup' && result.accessState === 'no_membership_or_inactive') {
    await router.replace(SOCIAL_SIGNUP_COMPLETE_ROUTE_PATH)
    return
  }

  await router.replace(resolvePostAuthRedirectPath(result.accessState))
})
</script>
