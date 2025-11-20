<script setup lang="ts">
import { onMounted } from 'vue'
import { NConfigProvider } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// 앱 시작 시 세션 확인
onMounted(async () => {
  await authStore.checkSession()
})
</script>

<template>
  <n-config-provider>
    <router-view />
  </n-config-provider>
</template>

<style>
/* 전역 스타일은 style.css에서 관리 */
</style>
