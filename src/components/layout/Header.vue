<template>
  <div class="flex w-full items-center justify-between">
    <div class="flex items-center gap-4">
      <h1 class="text-xl font-bold">
        EveryShift
      </h1>
    </div>
    <div class="flex items-center gap-4">
      <span class="text-sm text-gray-600">관리자</span>
      <n-button
        text
        @click="handleLogout"
      >
        로그아웃
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { NButton } from 'naive-ui'
import { useGlobalMessage } from '@/composables/useGlobalMessage'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const { success, error: showError } = useGlobalMessage()

async function handleLogout() {
  const result = await authStore.logout()
  if (result.success) {
    success('로그아웃되었습니다.')
    router.push('/login')
  } else {
    showError(result.error || '로그아웃 실패')
  }
}
</script>
