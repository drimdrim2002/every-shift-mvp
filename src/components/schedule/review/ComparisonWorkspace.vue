<script setup lang="ts">
import { computed } from 'vue';
import type { ScheduleReviewResponse, ScheduleVersionSummary } from '@/types/schedule';
import { formatScheduleVersionStatus } from '@/utils/scheduleReviewCopy';
import { buildScheduleComparisonSummary } from '@/utils/scheduleComparisonSummary';

const props = defineProps<{
  leftVersion: ScheduleVersionSummary | null;
  rightVersion: ScheduleVersionSummary | null;
  leftReview: ScheduleReviewResponse | null;
  rightReview: ScheduleReviewResponse | null;
  focusedVersionId: string | null;
}>();

const emit = defineEmits<{
  (event: 'focus-version', versionId: string): void;
}>();

const hasTwoVersions = computed(() => !!props.leftVersion && !!props.rightVersion);

const summaryBullets = computed(() => {
  if (!props.leftVersion || !props.rightVersion) {
    return [];
  }

  return buildScheduleComparisonSummary(
    props.leftVersion,
    props.rightVersion,
    props.leftReview,
    props.rightReview
  );
});

function formatVersionLabel(version: ScheduleVersionSummary | null) {
  if (!version) return '비교할 안을 하나 더 선택하세요';
  return version.name ?? `V${version.versionNo}`;
}

function isFocused(versionId: string | null | undefined) {
  return !!versionId && versionId === props.focusedVersionId;
}
</script>

<template>
  <section
    data-test="comparison-workspace"
    class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
  >
    <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
          비교 워크스페이스
        </p>
        <h3 class="text-base font-semibold text-slate-900">
          비교 중인 안
        </h3>
        <p class="mt-1 text-sm text-slate-600">
          두 안의 차이를 먼저 보고, 하나를 자세히 열어볼 수 있습니다.
        </p>
      </div>
      <p class="text-xs text-slate-500">
        {{ hasTwoVersions ? '2개 안 비교 중' : '비교할 안을 하나 더 선택하세요' }}
      </p>
    </div>

    <div
      v-if="summaryBullets.length > 0"
      data-test="comparison-summary"
      class="mb-4 rounded-xl border border-sky-200 bg-white p-4"
    >
      <p class="text-xs font-medium uppercase tracking-[0.12em] text-sky-700">
        핵심 차이
      </p>
      <ul class="mt-2 space-y-1 text-sm text-slate-700">
        <li
          v-for="bullet in summaryBullets"
          :key="bullet"
          class="flex gap-2"
        >
          <span class="mt-1 size-1.5 shrink-0 rounded-full bg-sky-500" />
          <span>{{ bullet }}</span>
        </li>
      </ul>
    </div>

    <div class="grid gap-3 md:grid-cols-2">
      <article
        data-test="comparison-slot-left"
        class="rounded-xl border bg-white p-4"
        :class="isFocused(leftVersion?.id) ? 'border-sky-500 ring-2 ring-sky-100' : 'border-slate-200'"
      >
        <div class="mb-3 flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              왼쪽 안
            </p>
            <h4 class="text-base font-semibold text-slate-900">
              {{ formatVersionLabel(leftVersion) }}
            </h4>
          </div>
          <button
            v-if="leftVersion"
            :data-test="`focus-left-${leftVersion.id}`"
            type="button"
            class="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
            @click="emit('focus-version', leftVersion.id)"
          >
            왼쪽 안 자세히 보기
          </button>
        </div>

        <div
          v-if="leftVersion"
          class="space-y-2 text-sm text-slate-700"
        >
          <p>
            상태: {{ formatScheduleVersionStatus(leftVersion.status) }}
          </p>
          <p>
            수정 {{ leftVersion.manualEditCount ?? 0 }}회
          </p>
          <p
            v-if="leftVersion.inputDiffSummary?.note"
            class="text-slate-600"
          >
            변경 메모: {{ leftVersion.inputDiffSummary.note }}
          </p>
          <p
            v-if="isFocused(leftVersion.id)"
            class="text-xs font-medium text-sky-700"
          >
            지금 자세히 보고 있습니다.
          </p>
        </div>
        <p
          v-else
          class="text-sm text-slate-500"
        >
          비교할 첫 번째 안을 선택하세요.
        </p>
      </article>

      <article
        data-test="comparison-slot-right"
        class="rounded-xl border bg-white p-4"
        :class="isFocused(rightVersion?.id) ? 'border-sky-500 ring-2 ring-sky-100' : 'border-slate-200'"
      >
        <div class="mb-3 flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              오른쪽 안
            </p>
            <h4 class="text-base font-semibold text-slate-900">
              {{ formatVersionLabel(rightVersion) }}
            </h4>
          </div>
          <button
            v-if="rightVersion"
            :data-test="`focus-right-${rightVersion.id}`"
            type="button"
            class="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
            @click="emit('focus-version', rightVersion.id)"
          >
            오른쪽 안 자세히 보기
          </button>
        </div>

        <div
          v-if="rightVersion"
          class="space-y-2 text-sm text-slate-700"
        >
          <p>
            상태: {{ formatScheduleVersionStatus(rightVersion.status) }}
          </p>
          <p>
            수정 {{ rightVersion.manualEditCount ?? 0 }}회
          </p>
          <p
            v-if="rightVersion.inputDiffSummary?.note"
            class="text-slate-600"
          >
            변경 메모: {{ rightVersion.inputDiffSummary.note }}
          </p>
          <p
            v-if="isFocused(rightVersion.id)"
            class="text-xs font-medium text-sky-700"
          >
            지금 자세히 보고 있습니다.
          </p>
        </div>
        <p
          v-else
          class="text-sm text-slate-500"
        >
          비교할 두 번째 안을 선택하세요.
        </p>
      </article>
    </div>
  </section>
</template>
