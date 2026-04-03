<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50">
    <n-card
      class="w-full max-w-md"
      title="EveryShift 로그인"
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
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { FormInst, FormItemRule } from 'naive-ui'
import { NButton, NCard, NForm, NFormItem, NInput } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const formRef = ref<FormInst | null>(null)
const formValue = ref({
  email: '',
  password: '',
})

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
  // 폼 검증
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  // 로그인 시도
  const result = await authStore.login(formValue.value.email, formValue.value.password)

  if (result.success) {
    window.$message?.success('로그인 성공')
    router.push('/')
  } else {
    window.$message?.error(result.error || '로그인 실패')
  }
}
</script>
