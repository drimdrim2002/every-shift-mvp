<template>
  <div class="mx-auto max-w-3xl px-4">
    <n-card>
      <div class="space-y-4 py-2">
        <div class="space-y-2">
          <p class="text-sm font-medium tracking-wide text-slate-500">
            사용자 홈
          </p>
          <h1 class="text-2xl font-semibold text-slate-900">
            운영 권한 안내
          </h1>
        </div>

        <p class="text-base text-slate-700">
          현재 계정은 운영 기능 권한이 없습니다.
        </p>
        <p class="text-sm leading-6 text-slate-500">
          근무표 생성, 운영 기본 설정, 가입 승인 같은 운영 작업은 관리자 권한이 있는 계정에서만 사용할 수 있습니다.
        </p>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { NCard } from 'naive-ui'
</script>
