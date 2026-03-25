<template>
  <div class="mx-auto max-w-5xl space-y-6 px-4 pb-8">
    <n-card class="rounded-3xl border border-slate-200 shadow-sm">
      <div class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
            직원 대시보드
          </span>
          <n-tag
            size="small"
            round
            type="info"
          >
            개인 일정
          </n-tag>
        </div>
        <div>
          <h1 class="text-3xl font-semibold tracking-tight text-slate-900">
            직원 대시보드
          </h1>
          <p class="mt-2 text-sm leading-6 text-slate-600">
            개인 일정과 팀 비교 지표를 확인하는 직원 관점 대시보드입니다. 현재 Phase 9 route baseline이 먼저 연결되어 있으며, 상세 일정 캘린더와 summary surface는 다음 작업에서 확장됩니다.
          </p>
        </div>
      </div>
    </n-card>

    <n-alert
      type="info"
      class="rounded-3xl"
      :show-icon="true"
    >
      일반 사용자 계정은 이제 직원 대시보드를 기본 landing으로 사용합니다.
    </n-alert>
  </div>
</template>

<script setup lang="ts">
import { NAlert, NCard, NTag } from 'naive-ui'
</script>
