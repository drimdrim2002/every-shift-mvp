<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 p-4">
    <n-card
      class="w-full max-w-md"
      title="EveryShift 로그인"
    >
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
            type="password"
            show-password-on="click"
            placeholder="비밀번호 입력"
            @keydown.enter="handleLogin"
          />
        </n-form-item>
        <n-button
          type="primary"
          block
          :loading="authStore.loading"
          @click="handleLogin"
        >
          로그인
        </n-button>
        <n-button
          class="mt-3"
          tertiary
          block
          @click="moveToSignup"
        >
          회원가입
        </n-button>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInst, FormItemRule } from 'naive-ui'
import { NAlert, NButton, NCard, NForm, NFormItem, NInput } from 'naive-ui'
import { useGlobalMessage } from '@/composables/useGlobalMessage'
import { SIGNUP_ROUTE_PATH, resolvePostAuthRedirectPath } from '@/constants/routes'
import { useAuthStore } from '@/stores/auth'
import { useRbacStore } from '@/stores/rbac'
import type { SignupNextState } from '@/types/signup'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const rbacStore = useRbacStore()
const { success, error } = useGlobalMessage()

const formRef = ref<FormInst | null>(null)
const formValue = ref({
  email: '',
  password: '',
})

const signupState = ref<SignupNextState | null>(null)

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
      path: route.path,
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

async function handleLogin() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  const result = await authStore.login(formValue.value.email, formValue.value.password)

  if (result.success) {
    success('로그인 성공')
    router.push(resolvePostAuthRedirectPath(rbacStore.accessState))
  } else {
    error(result.error || '로그인 실패')
  }
}

function moveToSignup() {
  router.push(SIGNUP_ROUTE_PATH)
}
</script>
