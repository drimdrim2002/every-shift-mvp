<script setup lang="ts">
import { computed } from 'vue';
import { resolveReviewLeadPanel } from '@/utils/scheduleReviewState';
import type { ScheduleReviewResponse, ScheduleReviewTab } from '@/types/schedule';

const props = defineProps<{
  review: ScheduleReviewResponse | null;
  activeTab: ScheduleReviewTab;
  focusTitle?: string | null;
}>();

const emit = defineEmits<{
  (event: 'update:tab', tab: ScheduleReviewTab): void;
}>();

const leadPanel = computed(() => {
  return props.review ? resolveReviewLeadPanel(props.review.version.status) : 'grid';
});

const latestEvaluation = computed(() => props.review?.latestEvaluation ?? null);
const failureDetails = computed(() => {
  return latestEvaluation.value?.infeasibility?.details ?? {};
});
const failureTraceId = computed(() => {
  const traceId = failureDetails.value.traceId;
  return typeof traceId === 'string' && traceId.length > 0 ? traceId : null;
});

const tabOptions: Array<{ id: ScheduleReviewTab; label: string }> = [
  { id: 'grid', label: '배정표' },
  { id: 'proof', label: '하드 제약' },
  { id: 'offRequests', label: 'Off 요청' },
];

function isTabActive(tab: ScheduleReviewTab) {
  return props.activeTab === tab;
}
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-4">
    <div
      v-if="focusTitle"
      data-test="review-focus-heading"
      class="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
    >
      <p class="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
        현재 보는 근무표안
      </p>
      <h3 class="mt-1 text-base font-semibold text-slate-900">
        {{ focusTitle }}
      </h3>
    </div>

    <div
      v-if="leadPanel === 'pending'"
      data-test="review-lead-panel-pending"
      class="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4"
    >
      <h3 class="text-sm font-semibold text-amber-900">
        재검토 필요
      </h3>
      <p class="mt-1 text-sm text-amber-800">
        최신 평가가 확정 조건을 충족하지 않습니다. 다시 검토를 실행한 뒤 결과를 확인하세요.
      </p>
    </div>

    <div
      v-else-if="leadPanel === 'proof'"
      data-test="review-lead-panel-proof"
      class="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4"
    >
      <h3 class="text-sm font-semibold text-rose-900">
        하드 제약 위반 요약
      </h3>
      <p class="mt-1 text-sm text-rose-800">
        주간 시간 위반 {{ latestEvaluation?.proofSummary.weeklyHoursViolations ?? 0 }}건,
        인력 부족 {{ latestEvaluation?.proofSummary.staffingShortfalls ?? 0 }}건
      </p>
      <p
        v-if="latestEvaluation?.finalizationGate.blockingReasons[0]?.message"
        class="mt-2 text-sm text-rose-800"
      >
        {{ latestEvaluation.finalizationGate.blockingReasons[0].message }}
      </p>
    </div>

    <div
      v-else-if="leadPanel === 'infeasible'"
      data-test="review-lead-panel-infeasible"
      class="mb-4 rounded-xl border border-red-200 bg-red-50 p-4"
    >
      <h3 class="text-sm font-semibold text-red-900">
        생성 불가
      </h3>
      <p class="mt-1 text-sm text-red-800">
        {{ latestEvaluation?.infeasibility?.summary ?? '입력 조건으로는 해를 찾지 못했습니다.' }}
      </p>
    </div>

    <div
      v-else-if="leadPanel === 'failure'"
      data-test="review-lead-panel-failure"
      class="mb-4 rounded-xl border border-red-200 bg-red-50 p-4"
    >
      <h3 class="text-sm font-semibold text-red-900">
        생성 실패
      </h3>
      <p class="mt-1 text-sm text-red-800">
        {{ latestEvaluation?.infeasibility?.summary ?? '엔진 실행에 실패했습니다. 다시 생성해주세요.' }}
      </p>
      <p
        v-if="failureTraceId"
        class="mt-2 text-xs font-medium text-red-700"
      >
        Trace ID: {{ failureTraceId }}
      </p>
    </div>

    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="tab in tabOptions"
          :key="tab.id"
          type="button"
          class="rounded-full px-3 py-1 text-sm transition"
          :class="isTabActive(tab.id)
            ? 'bg-slate-900 text-white'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
          :data-test="`review-tab-${tab.id}`"
          @click="emit('update:tab', tab.id)"
        >
          {{ tab.label }}
        </button>
      </div>

      <slot name="headerActions" />
    </div>

    <div
      v-if="activeTab === 'grid'"
      data-test="review-tab-panel-grid"
    >
      <slot name="grid" />
    </div>

    <div
      v-else-if="activeTab === 'proof'"
      data-test="review-tab-panel-proof"
      class="space-y-2 text-sm text-slate-700"
    >
      <div>
        주간 시간 위반: {{ latestEvaluation?.proofSummary.weeklyHoursViolations ?? 0 }}
      </div>
      <div>
        야간 연속 위반: {{ latestEvaluation?.proofSummary.nnnViolations ?? 0 }}
      </div>
      <div>
        최소 휴식 위반: {{ latestEvaluation?.proofSummary.minimumRestViolations ?? 0 }}
      </div>
      <div>
        인력 부족: {{ latestEvaluation?.proofSummary.staffingShortfalls ?? 0 }}
      </div>
      <slot name="proof" />
    </div>

    <div
      v-else
      data-test="review-tab-panel-offRequests"
      class="space-y-2 text-sm text-slate-700"
    >
      <div>
        미충족 Off 요청: {{ latestEvaluation?.offRequestResults.length ?? 0 }}건
      </div>
      <slot name="offRequests" />
    </div>
  </section>
</template>
