<script setup lang="ts">
import dayjs from 'dayjs';
import { computed, ref } from 'vue';
import type { ScheduleReviewResponse, ScheduleVersionSummary } from '@/types/schedule';
import type { ScheduleComplianceResult } from '@/types/scheduleCompliance';
import {
  formatScheduleVersionLabel,
  formatScheduleVersionStatus,
} from '@/utils/scheduleReviewCopy';
import {
  buildScheduleComparisonDecisionModel,
  type ScheduleComparisonOffInputDiffRow,
  type ScheduleComparisonOffInputSnapshot,
  type ScheduleComparisonRequirementStatus,
} from '@/utils/scheduleComparisonSummary';

const props = defineProps<{
  leftVersion: ScheduleVersionSummary | null;
  rightVersion: ScheduleVersionSummary | null;
  leftReview: ScheduleReviewResponse | null;
  rightReview: ScheduleReviewResponse | null;
  focusedVersionId: string | null;
  leftComplianceResult: ScheduleComplianceResult | null;
  rightComplianceResult: ScheduleComplianceResult | null;
  leftOffInput: ScheduleComparisonOffInputSnapshot | null;
  rightOffInput: ScheduleComparisonOffInputSnapshot | null;
  employees: Array<{ id: string; name: string }>;
  month: string;
}>();

const emit = defineEmits<{
  (event: 'focus-version', versionId: string): void;
}>();

const hasTwoVersions = computed(() => !!props.leftVersion && !!props.rightVersion);
const offDiffView = ref<'list' | 'calendar'>('list');

const decisionModel = computed(() => {
  if (!props.leftVersion || !props.rightVersion) {
    return null;
  }

  return buildScheduleComparisonDecisionModel({
    leftVersion: props.leftVersion,
    rightVersion: props.rightVersion,
    leftReview: props.leftReview,
    rightReview: props.rightReview,
    leftComplianceResult: props.leftComplianceResult ?? undefined,
    rightComplianceResult: props.rightComplianceResult ?? undefined,
    leftOffInput: props.leftOffInput ?? undefined,
    rightOffInput: props.rightOffInput ?? undefined,
    employees: props.employees,
  });
});

const offDiffRowsByDate = computed(() => {
  const groups = new Map<string, ScheduleComparisonOffInputDiffRow[]>();
  for (const row of decisionModel.value?.offInputDiffRows ?? []) {
    const rows = groups.get(row.date) ?? [];
    rows.push(row);
    groups.set(row.date, rows);
  }
  return groups;
});

const offDiffCalendarDates = computed(() => {
  if (!props.month || !dayjs(`${props.month}-01`).isValid()) {
    return [];
  }

  const firstDay = dayjs(`${props.month}-01`);
  return Array.from({ length: firstDay.daysInMonth() }, (_, index) => {
    const date = firstDay.add(index, 'day');
    const dateKey = date.format('YYYY-MM-DD');
    return {
      date: dateKey,
      day: date.format('D'),
      rows: offDiffRowsByDate.value.get(dateKey) ?? [],
    };
  });
});

function formatVersionLabel(version: ScheduleVersionSummary | null) {
  return formatScheduleVersionLabel(version, '비교할 안을 하나 더 선택하세요');
}

const leftVersionLabel = computed(() => formatVersionLabel(props.leftVersion));
const rightVersionLabel = computed(() => formatVersionLabel(props.rightVersion));

function getStatusClass(status: ScheduleComparisonRequirementStatus) {
  if (status === 'passed') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'failed') return 'border-rose-200 bg-rose-50 text-rose-800';
  if (status === 'check_required') return 'border-amber-200 bg-amber-50 text-amber-800';
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
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h4 class="text-sm font-semibold text-slate-900">
            Off 요청 입력 차이
          </h4>
          <div class="inline-flex w-fit rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              data-test="off-diff-list-view"
              class="rounded-md px-3 py-1.5 text-xs font-medium transition"
              :class="offDiffView === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-800'"
              @click="offDiffView = 'list'"
            >
              목록 보기
            </button>
            <button
              type="button"
              data-test="off-diff-calendar-view"
              class="rounded-md px-3 py-1.5 text-xs font-medium transition"
              :class="offDiffView === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-800'"
              @click="offDiffView = 'calendar'"
            >
              캘린더 보기
            </button>
          </div>
        </div>

        <div class="mt-3 overflow-hidden rounded-lg border border-slate-200">
          <div class="hidden grid-cols-[1.2fr_1fr_1fr] bg-slate-100 px-3 py-2 text-xs font-medium text-slate-500 sm:grid">
            <span>항목</span>
            <span>{{ leftVersionLabel }}</span>
            <span>{{ rightVersionLabel }}</span>
          </div>
          <div
            v-for="row in decisionModel.offInputRows"
            :key="row.label"
            class="grid gap-2 border-t border-slate-200 p-3 text-sm first:border-t-0 sm:grid-cols-[1.2fr_1fr_1fr]"
          >
            <span class="font-medium text-slate-700">{{ row.label }}</span>
            <span class="text-slate-700">
              <span class="mr-2 text-xs font-medium text-slate-500 sm:hidden">{{ leftVersionLabel }}</span>
              {{ row.leftText }}
            </span>
            <span class="text-slate-700">
              <span class="mr-2 text-xs font-medium text-slate-500 sm:hidden">{{ rightVersionLabel }}</span>
              {{ row.rightText }}
            </span>
          </div>
        </div>

        <div
          v-if="offDiffView === 'list'"
          data-test="off-diff-list"
          class="mt-3 overflow-hidden rounded-lg border border-slate-200"
        >
          <div class="hidden grid-cols-[1fr_1fr_1fr_1fr_1fr] bg-slate-100 px-3 py-2 text-xs font-medium text-slate-500 md:grid">
            <span>직원</span>
            <span>날짜</span>
            <span>{{ leftVersionLabel }} 요청</span>
            <span>{{ rightVersionLabel }} 요청</span>
            <span>차이</span>
          </div>
          <p
            v-if="decisionModel.offInputDiffRows.length === 0"
            class="p-3 text-sm text-slate-500"
          >
            {{ decisionModel.offInputDiffEmptyText }}
          </p>
          <div
            v-for="row in decisionModel.offInputDiffRows"
            :key="`${row.employeeId}:${row.date}:${row.changeType}`"
            class="grid gap-2 border-t border-slate-200 p-3 text-sm first:border-t-0 md:grid-cols-[1fr_1fr_1fr_1fr_1fr] md:items-center"
          >
            <span class="font-medium text-slate-800">{{ row.employeeName }}</span>
            <span class="text-slate-600">{{ row.date }}</span>
            <span class="text-slate-700">
              <span class="mr-2 text-xs font-medium text-slate-500 md:hidden">{{ leftVersionLabel }} 요청</span>
              {{ row.leftText }}
            </span>
            <span class="text-slate-700">
              <span class="mr-2 text-xs font-medium text-slate-500 md:hidden">{{ rightVersionLabel }} 요청</span>
              {{ row.rightText }}
            </span>
            <span class="w-fit rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
              {{ row.changeTypeLabel }}
            </span>
          </div>
        </div>

        <div
          v-else
          data-test="off-diff-calendar"
          class="mt-3 grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200"
        >
          <div
            v-for="date in offDiffCalendarDates"
            :key="date.date"
            class="min-h-24 bg-white p-2"
          >
            <div class="text-xs font-semibold text-slate-500">
              {{ date.day }}
            </div>
            <div class="mt-2 space-y-1">
              <span
                v-for="row in date.rows.slice(0, 3)"
                :key="`${row.employeeId}:${row.changeType}`"
                class="block rounded-md bg-sky-50 px-2 py-1 text-[11px] font-medium leading-4 text-sky-800"
              >
                {{ row.employeeName }} · {{ row.changeTypeLabel }}
              </span>
              <span
                v-if="date.rows.length > 3"
                class="block text-[11px] font-medium text-slate-500"
              >
                외 {{ date.rows.length - 3 }}건
              </span>
            </div>
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
            <span>{{ leftVersionLabel }}</span>
            <span>{{ rightVersionLabel }}</span>
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
              <span class="mb-1 block text-xs font-medium text-slate-500 md:hidden">{{ leftVersionLabel }}</span>
              <span
                class="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium"
                :class="getStatusClass(row.leftStatus)"
              >
                {{ row.leftText }}
              </span>
            </div>
            <div>
              <span class="mb-1 block text-xs font-medium text-slate-500 md:hidden">{{ rightVersionLabel }}</span>
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
                <h5 class="text-base font-semibold text-slate-900">
                  {{ leftVersionLabel }}
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
                :aria-label="`이 근무표안 자세히 보기 - ${leftVersionLabel}`"
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
                <h5 class="text-base font-semibold text-slate-900">
                  {{ rightVersionLabel }}
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
                :aria-label="`이 근무표안 자세히 보기 - ${rightVersionLabel}`"
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
