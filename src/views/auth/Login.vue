<template>
  <AuthPageShell
    variant="compact"
    eyebrow="EveryShift에 오신 것을 환영합니다"
    title="로그인"
    description="승인된 계정으로 근무표 작업 공간에 들어갑니다."
  >
    <div class="mx-auto w-full max-w-lg">
      <n-alert
        v-if="signupState === 'pending_approval'"
        type="info"
        class="mb-4"
      >
        회원가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.
      </n-alert>
      <n-alert
        v-else-if="signupState === 'active'"
        type="success"
        class="mb-4"
      >
        가입이 완료되었습니다. 로그인할 수 있습니다.
      </n-alert>

      <n-card
        data-test="login-card"
        class="mx-auto w-full max-w-lg"
      >
        <n-form
          ref="formRef"
          :model="formValue"
          :rules="rules"
        >
          <n-form-item
            label="이메일"
            path="email"
          >
            <n-input
              v-model:value="formValue.email"
              data-test="login-email"
              placeholder="admin@everyshift.com"
              @keydown.enter="handleLogin"
            />
          </n-form-item>
          <n-form-item
            label="비밀번호"
            path="password"
          >
            <n-input
              v-model:value="formValue.password"
              data-test="login-password"
              type="password"
              show-password-on="click"
              placeholder="비밀번호 입력"
              @keydown.enter="handleLogin"
            />
          </n-form-item>
          <n-button
            data-test="login-submit"
            type="primary"
            block
            :loading="authStore.loading"
            @click="handleLogin"
          >
            로그인
          </n-button>
        </n-form>

        <div class="my-5 flex items-center gap-3 text-xs text-slate-500">
          <span
            class="h-px flex-1 bg-slate-200"
            aria-hidden="true"
          />
          <span class="shrink-0">또는 소셜 계정으로 로그인</span>
          <span
            class="h-px flex-1 bg-slate-200"
            aria-hidden="true"
          />
        </div>

        <SocialAuthOptions
          intent="login"
          :loading-provider="loadingProvider"
          @start-social="handleSocialStart"
        />

        <div class="mt-5 text-center text-sm text-slate-500">
          <span>계정이 없으신가요?</span>
          <n-button
            data-test="login-to-signup"
            text
            type="primary"
            class="ml-1 align-baseline font-medium"
            @click="moveToSignup"
          >
            회원가입
          </n-button>
        </div>
      </n-card>
    </div>
  </AuthPageShell>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInst, FormItemRule } from 'naive-ui'
import { NAlert, NButton, NCard, NForm, NFormItem, NInput } from 'naive-ui'
import AuthPageShell from '@/components/auth/AuthPageShell.vue'
import SocialAuthOptions from '@/components/auth/SocialAuthOptions.vue'
import { LOGIN_ROUTE_PATH, SIGNUP_ROUTE_PATH, resolvePostAuthRedirectPath } from '@/constants/routes'
import { useAuthStore } from '@/stores/auth'
import { showError, showSuccess } from '@/utils/message'
import type { SocialAuthProviderId } from '@/types/auth'
import type { SignupNextState } from '@/types/signup'
import type { AccessState } from '@/types/rbac'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const formRef = ref<FormInst | null>(null)
const formValue = ref({
  email: '',
  password: '',
})
const signupState = ref<SignupNextState | null>(null)
const loadingProvider = ref<SocialAuthProviderId | null>(null)

watch(
  () => route.query.signupState,
  (state) => {
    if (state !== 'pending_approval' && state !== 'active') {
      return
    }

    signupState.value = state

    const nextQuery = { ...route.query }
    delete nextQuery.signupState
    void router.replace({
      path: LOGIN_ROUTE_PATH,
      query: nextQuery,
    })
  },
  { immediate: true },
)

const rules: Record<string, FormItemRule | FormItemRule[]> = {
  email: {
    required: true,
    message: '이메일을 입력하세요',
    trigger: 'blur',
  },
  password: {
    required: true,
    message: '비밀번호를 입력하세요',
    trigger: 'blur',
  },
}

function isActiveAccessState(accessState: AccessState) {
  return (
    accessState === 'super_active'
    || accessState === 'admin_active'
    || accessState === 'user_active'
  )
}

async function handleSocialStart(provider: SocialAuthProviderId) {
  loadingProvider.value = provider

  try {
    const result = await authStore.startOAuth(provider, 'login')

    if (!result.success) {
      showError(result.error || '소셜 로그인을 시작하지 못했습니다.')
    }
  } catch (error) {
    showError(error instanceof Error ? error.message : '소셜 로그인을 시작하지 못했습니다.')
  } finally {
    loadingProvider.value = null
  }
}

async function handleLogin() {
  // 폼 검증
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  // 로그인 시도
  const result = await authStore.login(formValue.value.email, formValue.value.password)

  if (!result.success) {
    showError(result.error || '로그인 실패')
    return
  }

  if (result.accessState === 'no_membership_or_inactive') {
    try {
      await authStore.logout()
    } catch (error) {
      console.warn('[login] Failed to clear invalid session after login:', error)
    }

    showError('계정의 승인 또는 소속 상태를 확인할 수 없습니다. 다시 로그인해 주세요.')
    await router.replace(LOGIN_ROUTE_PATH)
    return
  }

  if (isActiveAccessState(result.accessState)) {
    showSuccess('로그인 성공')
  }

  await router.replace(resolvePostAuthRedirectPath(result.accessState))
}

function moveToSignup() {
  router.push(SIGNUP_ROUTE_PATH)
}
</script>
