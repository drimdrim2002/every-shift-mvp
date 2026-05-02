<template>
  <AuthPageShell
    eyebrow="EveryShift 시작하기"
    title="회원가입"
    description="관리자는 병원명을 입력해 가입 신청하고, 병원 검색은 선택사항입니다. 사용자는 초대코드로 참여합니다."
    variant="compact"
  >
    <n-card
      class="mx-auto w-full max-w-lg"
      title="회원가입"
    >
      <n-alert
        v-if="resultNextState === 'pending_approval'"
        type="info"
        class="mb-4"
      >
        가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.
      </n-alert>
      <n-alert
        v-else-if="resultNextState === 'active'"
        type="success"
        class="mb-4"
      >
        가입이 완료되었습니다. 로그인 페이지에서 바로 로그인할 수 있습니다.
      </n-alert>

      <SocialAuthOptions
        v-if="!showPasswordSignup"
        :loading-provider="loadingProvider"
        @start-id="showPasswordSignup = true"
        @start-social="handleSocialStart"
      />

      <SignupApplicationForm
        v-else
        mode="password"
        :initial-role="initialRole"
        @completed="handleSignupCompleted"
        @cancel="moveToLogin"
        @state-reset="clearSignupState"
      />
    </n-card>
  </AuthPageShell>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NAlert, NCard } from 'naive-ui'
import AuthPageShell from '@/components/auth/AuthPageShell.vue'
import SignupApplicationForm from '@/components/auth/SignupApplicationForm.vue'
import SocialAuthOptions from '@/components/auth/SocialAuthOptions.vue'
import { LOGIN_ROUTE_PATH } from '@/constants/routes'
import { useAuthStore } from '@/stores/auth'
import type { SocialAuthProviderId } from '@/types/auth'
import type { SignupNextState, SignupRole } from '@/types/signup'
import { showError } from '@/utils/message'

function resolveInitialSignupRole(value: unknown): SignupRole {
  return value === 'user' ? 'user' : 'admin'
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const initialRole = resolveInitialSignupRole(route.query.role)
const showPasswordSignup = ref(false)
const loadingProvider = ref<SocialAuthProviderId | null>(null)
const resultNextState = ref<SignupNextState | null>(null)

function handleSignupCompleted(nextState: SignupNextState) {
  resultNextState.value = nextState
}

function clearSignupState() {
  resultNextState.value = null
}

async function handleSocialStart(provider: SocialAuthProviderId) {
  loadingProvider.value = provider

  try {
    const result = await authStore.startOAuth(provider, 'signup')

    if (!result.success) {
      showError(result.error || '소셜 회원가입을 시작하지 못했습니다.')
    }
  } catch (error) {
    showError(error instanceof Error ? error.message : '소셜 회원가입을 시작하지 못했습니다.')
  } finally {
    loadingProvider.value = null
  }
}

function moveToLogin() {
  const suffix = resultNextState.value ? `?signupState=${resultNextState.value}` : ''
  router.push(`${LOGIN_ROUTE_PATH}${suffix}`)
}
</script>
