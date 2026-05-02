<template>
  <AuthPageShell
    eyebrow="EveryShift 시작하기"
    title="가입 정보 완료"
    description="소셜 계정 인증이 완료되었습니다. 병원명을 입력해 가입 정보를 완료하세요."
    variant="compact"
  >
    <n-alert
      v-if="!sessionEmail"
      type="warning"
      class="mx-auto mb-4 max-w-2xl"
    >
      소셜 계정 이메일을 확인할 수 없습니다.
    </n-alert>
    <SignupApplicationForm
      mode="existing_session"
      :session-email="sessionEmail"
      @completed="handleCompleted"
      @cancel="moveToLogin"
    />
  </AuthPageShell>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NAlert } from 'naive-ui'
import AuthPageShell from '@/components/auth/AuthPageShell.vue'
import SignupApplicationForm from '@/components/auth/SignupApplicationForm.vue'
import {
  ACCESS_PENDING_ROUTE_PATH,
  LOGIN_ROUTE_PATH,
  resolvePostAuthRedirectPath,
} from '@/constants/routes'
import { useAuthStore } from '@/stores/auth'
import type { SignupNextState } from '@/types/signup'

const authStore = useAuthStore()
const router = useRouter()

const sessionEmail = computed(() => authStore.user?.email ?? null)

onMounted(async () => {
  if (!authStore.user) {
    await router.replace(LOGIN_ROUTE_PATH)
  }
})

async function handleCompleted(nextState: SignupNextState) {
  if (nextState === 'pending_approval') {
    await router.replace(ACCESS_PENDING_ROUTE_PATH)
    return
  }

  const accessState = await authStore.refreshSessionContext()
  await router.replace(resolvePostAuthRedirectPath(accessState))
}

async function moveToLogin() {
  try {
    await authStore.logout()
  } catch (error) {
    console.warn('Failed to logout before returning to login.', error)
  } finally {
    await router.replace(LOGIN_ROUTE_PATH)
  }
}
</script>
