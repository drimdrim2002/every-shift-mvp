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
import { NButton } from 'naive-ui'

function handleLogout() {
  // TODO: 로그아웃 로직은 Auth Store 생성 후 구현
  console.log('로그아웃')
}
</script>
