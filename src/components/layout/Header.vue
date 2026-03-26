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
import { NButton } from 'naive-ui';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { showError, showSuccess } from '@/utils/message';

const router = useRouter();
const authStore = useAuthStore();

async function handleLogout() {
  try {
    await authStore.logout();
    showSuccess('로그아웃되었습니다');
    await router.push('/login');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '로그아웃 중 오류가 발생했습니다';
    showError(message);
  }
}
</script>
