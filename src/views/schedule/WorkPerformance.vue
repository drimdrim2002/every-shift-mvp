<template>
  <div class="mx-auto max-w-6xl px-4">
    <section class="space-y-6">
      <div>
        <p class="text-sm font-medium tracking-wide text-slate-500">
          근무표 조회
        </p>
        <h1 class="mt-1 text-2xl font-bold text-slate-900">
          근무 실적
        </h1>
      </div>

      <div
        data-test="work-performance-empty"
        class="rounded-lg border border-slate-200 bg-slate-50/70 px-5 py-10 text-center"
      >
        <h2 class="text-xl font-semibold text-slate-900">
          근무 실적 화면은 준비 중입니다
        </h2>
        <p class="mt-2 text-sm text-slate-500">
          현재는 생성된 근무표 조회를 먼저 사용할 수 있습니다.
        </p>
        <n-button
          data-test="work-performance-results"
          class="mt-6"
          secondary
          @click="goToScheduleResults"
        >
          생성된 근무표 보기
        </n-button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { NButton } from 'naive-ui';
import { getScheduleResultsRoutePath } from '@/constants/routes';

const router = useRouter();

function goToScheduleResults() {
  void router.push(getScheduleResultsRoutePath());
}
</script>
