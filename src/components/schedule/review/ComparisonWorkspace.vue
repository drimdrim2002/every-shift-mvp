<script setup lang="ts">
import { computed } from 'vue';
import type { ScheduleReviewResponse, ScheduleVersionSummary } from '@/types/schedule';
import {
  formatScheduleVersionLabel,
  formatScheduleVersionStatus,
} from '@/utils/scheduleReviewCopy';
import {
  buildScheduleComparisonDecisionModel,
  type ScheduleComparisonRequirementStatus,
} from '@/utils/scheduleComparisonSummary';

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

const decisionModel = computed(() => {
  if (!props.leftVersion || !props.rightVersion) {
    return null;
  }

  return buildScheduleComparisonDecisionModel({
    leftVersion: props.leftVersion,
    rightVersion: props.rightVersion,
    leftReview: props.leftReview,
    rightReview: props.rightReview,
  });
});

function formatVersionLabel(version: ScheduleVersionSummary | null) {
  return formatScheduleVersionLabel(version, '비교할 안을 하나 더 선택하세요');
}

function getStatusClass(status: ScheduleComparisonRequirementStatus) {
  if (status === 'passed') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'failed') return 'border-rose-200 bg-rose-50 text-rose-800';
  return 'border-slate-200 bg-slate-100 text-slate-600';
}

function getGroupLabel(group: 'mandatory' | 'optional') {
  return group === 'mandatory' ? '필수 기준' : '선택 기준';
}

function isFocused(versionId: string | null | undefined) {
  return !!versionId && versionId === props.focusedVersionId;
}
</script>

<template>
  <section
    data-test="comparison-workspace"
    class="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
  >
    <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
          근무표안 비교
        </p>
        <h3 class="text-base font-semibold text-slate-900">
          Off 요청과 필수 기준을 먼저 확인하세요
        </h3>
        <p class="mt-1 text-sm text-slate-600">
          Off 요청 차이와 필수 기준 충족 여부를 비교합니다.
        </p>
      </div>
      <p class="text-xs text-slate-500">
        {{ hasTwoVersions ? '2개 안 비교 중' : '비교할 근무표안을 하나 더 선택하세요' }}
      </p>
    </div>

    <template v-if="decisionModel">
      <section
        data-test="comparison-summary"
        class="rounded-xl border border-sky-200 bg-white p-4"
      >
        <h4 class="text-sm font-semibold text-slate-900">
          핵심 판단
        </h4>
        <ul class="mt-3 space-y-2 text-sm text-slate-700">
          <li
            v-for="(bullet, index) in decisionModel.summaryBullets"
            :key="`${index}:${bullet}`"
            class="flex gap-2"
          >
            <span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-sky-500" />
            <span>{{ bullet }}</span>
          </li>
        </ul>
      </section>

      <section
        data-test="comparison-off-input"
        class="rounded-xl border border-slate-200 bg-white p-4"
      >
        <h4 class="text-sm font-semibold text-slate-900">
          Off 요청 입력 차이
        </h4>
        <div class="mt-3 overflow-hidden rounded-lg border border-slate-200">
          <div class="hidden grid-cols-[1.2fr_1fr_1fr] bg-slate-100 px-3 py-2 text-xs font-medium text-slate-500 sm:grid">
            <span>항목</span>
            <span>왼쪽</span>
            <span>오른쪽</span>
          </div>
          <div
            v-for="row in decisionModel.offInputRows"
            :key="row.label"
            class="grid gap-2 border-t border-slate-200 p-3 text-sm first:border-t-0 sm:grid-cols-[1.2fr_1fr_1fr]"
          >
            <span class="font-medium text-slate-700">{{ row.label }}</span>
            <span class="text-slate-700">
              <span class="mr-2 text-xs font-medium text-slate-500 sm:hidden">왼쪽</span>
              {{ row.leftText }}
            </span>
            <span class="text-slate-700">
              <span class="mr-2 text-xs font-medium text-slate-500 sm:hidden">오른쪽</span>
              {{ row.rightText }}
            </span>
          </div>
        </div>
      </section>

      <section
        data-test="comparison-requirements"
        class="rounded-xl border border-slate-200 bg-white p-4"
      >
        <h4 class="text-sm font-semibold text-slate-900">
          요구사항 충족 비교
        </h4>
        <div class="mt-3 overflow-hidden rounded-lg border border-slate-200">
          <div class="hidden grid-cols-[0.8fr_1.2fr_1fr_1fr] bg-slate-100 px-3 py-2 text-xs font-medium text-slate-500 md:grid">
            <span>구분</span>
            <span>요구사항</span>
            <span>왼쪽</span>
            <span>오른쪽</span>
          </div>
          <div
            v-for="row in decisionModel.requirementRows"
            :key="row.label"
            class="grid gap-3 border-t border-slate-200 p-3 text-sm first:border-t-0 md:grid-cols-[0.8fr_1.2fr_1fr_1fr] md:items-center"
          >
            <span class="text-xs font-medium text-slate-500">
              {{ getGroupLabel(row.group) }}
            </span>
            <span class="font-medium text-slate-800">{{ row.label }}</span>
            <div>
              <span class="mb-1 block text-xs font-medium text-slate-500 md:hidden">왼쪽</span>
              <span
                class="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium"
                :class="getStatusClass(row.leftStatus)"
              >
                {{ row.leftText }}
              </span>
            </div>
            <div>
              <span class="mb-1 block text-xs font-medium text-slate-500 md:hidden">오른쪽</span>
              <span
                class="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium"
                :class="getStatusClass(row.rightStatus)"
              >
                {{ row.rightText }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        data-test="comparison-detail-actions"
        class="rounded-xl border border-slate-200 bg-white p-4"
      >
        <h4 class="text-sm font-semibold text-slate-900">
          생성 근무표 확인
        </h4>
        <div class="mt-3 grid gap-3 md:grid-cols-2">
          <article
            data-test="comparison-slot-left"
            class="rounded-xl border p-4"
            :class="isFocused(leftVersion?.id) ? 'border-sky-500 ring-2 ring-sky-100' : 'border-slate-200'"
          >
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-xs font-medium text-slate-500">
                  왼쪽 근무표안
                </p>
                <h5 class="mt-1 text-base font-semibold text-slate-900">
                  {{ formatVersionLabel(leftVersion) }}
                </h5>
                <p
                  v-if="leftVersion"
                  class="mt-1 text-sm text-slate-600"
                >
                  상태: {{ formatScheduleVersionStatus(leftVersion.status) }} · 수정
                  {{ leftVersion.manualEditCount ?? 0 }}회
                </p>
                <p
                  v-if="isFocused(leftVersion?.id)"
                  class="mt-2 text-xs font-medium text-sky-700"
                >
                  현재 확인 중
                </p>
              </div>
              <button
                v-if="leftVersion"
                :data-test="`detail-version-${leftVersion.id}`"
                type="button"
                aria-label="이 근무표안 자세히 보기 - 왼쪽 근무표안"
                class="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                @click="emit('focus-version', leftVersion.id)"
              >
                이 근무표안 자세히 보기
              </button>
            </div>
          </article>

          <article
            data-test="comparison-slot-right"
            class="rounded-xl border p-4"
            :class="isFocused(rightVersion?.id) ? 'border-sky-500 ring-2 ring-sky-100' : 'border-slate-200'"
          >
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-xs font-medium text-slate-500">
                  오른쪽 근무표안
                </p>
                <h5 class="mt-1 text-base font-semibold text-slate-900">
                  {{ formatVersionLabel(rightVersion) }}
                </h5>
                <p
                  v-if="rightVersion"
                  class="mt-1 text-sm text-slate-600"
                >
                  상태: {{ formatScheduleVersionStatus(rightVersion.status) }} · 수정
                  {{ rightVersion.manualEditCount ?? 0 }}회
                </p>
                <p
                  v-if="isFocused(rightVersion?.id)"
                  class="mt-2 text-xs font-medium text-sky-700"
                >
                  현재 확인 중
                </p>
              </div>
              <button
                v-if="rightVersion"
                :data-test="`detail-version-${rightVersion.id}`"
                type="button"
                aria-label="이 근무표안 자세히 보기 - 오른쪽 근무표안"
                class="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                @click="emit('focus-version', rightVersion.id)"
              >
                이 근무표안 자세히 보기
              </button>
            </div>
          </article>
        </div>
      </section>
    </template>

    <p
      v-else
      class="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500"
    >
      비교할 근무표안을 하나 더 선택하세요.
    </p>
  </section>
</template>
