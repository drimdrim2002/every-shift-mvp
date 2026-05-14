<template>
  <div
    data-test="landing-product-preview"
    class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm shadow-gray-200/70"
  >
    <div class="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
      <div class="flex min-w-0 items-center gap-2">
        <span class="size-2.5 rounded-full bg-emerald-600" />
        <span class="truncate text-sm font-semibold text-gray-950">EveryShift</span>
      </div>
      <span class="shrink-0 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
        2026.04
      </span>
    </div>

    <div
      v-if="variant === 'overview'"
      class="grid gap-4 p-4 lg:grid-cols-[1.3fr_0.9fr]"
    >
      <section class="min-w-0">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm font-semibold text-gray-950">
            AI 생성 근무표
          </p>
          <span class="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            자동 완성
          </span>
        </div>
        <div class="mt-3 overflow-hidden rounded-md border border-gray-200">
          <div class="min-w-0">
            <div class="grid grid-cols-[54px_repeat(6,minmax(26px,1fr))] border-b border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-500 sm:grid-cols-[88px_repeat(6,minmax(40px,1fr))] sm:text-xs">
              <span class="p-2 sm:px-3">직원</span>
              <span
                v-for="day in previewDays"
                :key="day.id"
                class="px-1 py-2 text-center sm:p-2"
              >
                {{ day.label }}
              </span>
            </div>
            <div
              v-for="row in overviewRows"
              :key="row.id"
              class="grid grid-cols-[54px_repeat(6,minmax(26px,1fr))] border-b border-gray-100 last:border-b-0 sm:grid-cols-[88px_repeat(6,minmax(40px,1fr))]"
            >
              <span class="truncate p-2 text-[11px] font-medium text-gray-700 sm:px-3 sm:text-xs">
                {{ row.name }}
              </span>
              <span
                v-for="shift in row.shifts"
                :key="shift.id"
                class="m-0.5 rounded p-1 text-center text-[11px] font-semibold sm:m-1 sm:px-2 sm:text-xs"
                :class="shiftClassMap[shift.code]"
              >
                {{ shift.code }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section class="grid gap-3">
        <div class="rounded-md border border-gray-200 p-3">
          <p class="text-xs font-semibold text-gray-500">
            Off 요청
          </p>
          <p class="mt-1 text-2xl font-bold text-gray-950">
            18건
          </p>
          <p class="mt-1 text-xs text-gray-500">
            반영 14건, 검토 4건
          </p>
        </div>
        <div class="rounded-md border border-amber-200 bg-amber-50 p-3">
          <p class="text-xs font-semibold text-amber-700">
            가이드라인 점검
          </p>
          <p class="mt-1 text-sm font-semibold text-gray-950">
            점검 항목 3개 확인 필요
          </p>
        </div>
        <div class="rounded-md border border-gray-200 p-3">
          <p class="text-xs font-semibold text-gray-500">
            Excel 내보내기
          </p>
          <div class="mt-2 h-2 rounded-full bg-gray-100">
            <div class="h-2 w-3/4 rounded-full bg-emerald-600" />
          </div>
        </div>
      </section>
    </div>

    <div
      v-else-if="variant === 'ai'"
      class="grid gap-4 p-4 lg:grid-cols-[0.9fr_1.1fr]"
    >
      <section class="grid gap-3">
        <div
          v-for="item in generationCriteria"
          :key="item.id"
          class="rounded-md border border-gray-200 p-3"
        >
          <p class="text-xs font-semibold text-gray-500">
            {{ item.label }}
          </p>
          <p class="mt-1 text-lg font-bold text-gray-950">
            {{ item.value }}
          </p>
          <p class="mt-1 text-xs text-gray-500">
            {{ item.caption }}
          </p>
        </div>
      </section>
      <section class="rounded-md border border-gray-200 p-3">
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm font-semibold text-gray-950">
            생성 기준 요약
          </p>
          <span class="rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">
            36일 범위
          </span>
        </div>
        <div class="mt-3 space-y-2">
          <div
            v-for="row in aiRows"
            :key="row.id"
            class="grid grid-cols-[68px_1fr_auto] items-center gap-2 text-xs"
          >
            <span class="font-medium text-gray-600">{{ row.label }}</span>
            <div class="h-2 rounded-full bg-gray-100">
              <div
                class="h-2 rounded-full"
                :class="row.barClass"
                :style="{ width: row.width }"
              />
            </div>
            <span class="font-semibold text-gray-800">{{ row.value }}</span>
          </div>
        </div>
      </section>
    </div>

    <div
      v-else-if="variant === 'conditions'"
      class="grid gap-3 p-4"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm font-semibold text-gray-950">
          조건 반영 결과
        </p>
        <span class="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          78% 반영
        </span>
      </div>
      <div
        v-for="request in offRequests"
        :key="request.id"
        class="rounded-md border p-3"
        :class="request.approved ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-sm font-semibold text-gray-950">
            {{ request.employee }} · {{ request.date }}
          </p>
          <span
            class="rounded-md px-2 py-1 text-xs font-semibold"
            :class="request.approved ? 'bg-white text-emerald-700' : 'bg-white text-rose-700'"
          >
            {{ request.approved ? '반영' : '미반영' }}
          </span>
        </div>
        <p class="mt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          사유
        </p>
        <p class="mt-2 text-xs leading-5 text-gray-600">
          {{ request.reason }}
        </p>
      </div>
    </div>

    <div
      v-else-if="variant === 'guide'"
      class="grid gap-4 p-4 lg:grid-cols-[1fr_0.9fr]"
    >
      <section class="space-y-2">
        <div
          v-for="check in guideChecks"
          :key="check.id"
          class="flex items-start gap-3 rounded-md border p-3"
          :class="check.warning ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'"
        >
          <span
            class="mt-0.5 size-2.5 rounded-full"
            :class="check.warning ? 'bg-amber-500' : 'bg-emerald-500'"
          />
          <div class="min-w-0">
            <p class="text-sm font-semibold text-gray-950">
              {{ check.label }}
            </p>
            <p class="mt-1 text-xs leading-5 text-gray-600">
              {{ check.description }}
            </p>
          </div>
        </div>
      </section>
      <section class="rounded-md border border-gray-200 p-3">
        <p class="text-sm font-semibold text-gray-950">
          경고 하이라이트
        </p>
        <div class="mt-3 grid grid-cols-4 gap-2">
          <span
            v-for="cell in guideCells"
            :key="cell.id"
            class="rounded p-2 text-center text-xs font-semibold"
            :class="cell.warning ? 'bg-amber-100 text-amber-800' : shiftClassMap[cell.shift]"
          >
            {{ cell.label }}
          </span>
        </div>
      </section>
    </div>

    <div
      v-else-if="variant === 'compare'"
      class="grid gap-4 p-4 lg:grid-cols-[1.15fr_0.85fr]"
    >
      <section class="min-w-0 rounded-md border border-gray-200 p-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-sm font-semibold text-gray-950">
            결과 직접 수정
          </p>
          <span class="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
            재검증 필요
          </span>
        </div>
        <div class="mt-3 grid gap-2">
          <div
            v-for="edit in operationEdits"
            :key="edit.id"
            class="grid gap-2 rounded-md bg-gray-50 p-2 text-xs sm:grid-cols-[72px_1fr_auto] sm:items-center"
          >
            <div class="flex min-w-0 items-center justify-between gap-2 sm:block">
              <span class="truncate font-semibold text-gray-700">{{ edit.employee }}</span>
              <span class="rounded bg-white px-2 py-1 font-semibold text-gray-600 sm:hidden">
                수정됨
              </span>
            </div>
            <span class="flex min-w-0 flex-wrap items-center gap-1.5">
              <span
                class="rounded px-2 py-1 font-semibold"
                :class="shiftClassMap[edit.before]"
              >
                {{ edit.before }}
              </span>
              <span class="text-gray-400">-&gt;</span>
              <span
                class="rounded px-2 py-1 font-semibold"
                :class="shiftClassMap[edit.after]"
              >
                {{ edit.after }}
              </span>
              <span class="text-gray-500">{{ edit.date }}</span>
            </span>
            <span class="hidden rounded bg-white px-2 py-1 font-semibold text-gray-600 sm:inline">
              수정됨
            </span>
          </div>
        </div>
      </section>

      <section class="grid gap-3">
        <div
          v-for="status in operationStatuses"
          :key="status.id"
          class="rounded-md border border-gray-200 p-3"
        >
          <p class="text-xs font-semibold text-gray-500">
            {{ status.label }}
          </p>
          <p
            class="mt-1 text-sm font-bold"
            :class="status.valueClass"
          >
            {{ status.value }}
          </p>
        </div>
        <div class="rounded-md border border-gray-200 bg-gray-50 p-3">
          <p class="text-xs font-semibold text-gray-500">
            저장 이력
          </p>
          <p class="mt-1 text-sm font-bold text-gray-950">
            버전 A 저장됨 · 버전 B 보관
          </p>
        </div>
      </section>
    </div>

    <div
      v-else
      class="grid gap-4 p-4 lg:grid-cols-[1.1fr_0.9fr]"
    >
      <section class="rounded-md border border-gray-200 p-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-sm font-semibold text-gray-950">
            확정 이력 기반 근무자별 누적 기준
          </p>
          <span class="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
            기간 3개월
          </span>
        </div>
        <div class="mt-3 grid gap-2 sm:grid-cols-3">
          <div
            v-for="metric in fairnessSummaryMetrics"
            :key="metric.id"
            class="rounded-md bg-gray-50 p-2"
          >
            <p class="text-xs text-gray-500">
              {{ metric.label }}
            </p>
            <p class="mt-1 text-sm font-bold text-gray-950">
              {{ metric.value }}
            </p>
          </div>
        </div>
        <div class="mt-3 space-y-3">
          <div
            v-for="row in fairnessRows"
            :key="row.id"
            class="rounded-md bg-gray-50 p-3"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-xs font-semibold text-gray-700">
                {{ row.name }}
              </p>
              <p class="text-xs font-semibold text-gray-500">
                {{ row.status }}
              </p>
            </div>
            <div class="mt-2 grid grid-cols-3 gap-2 text-center">
              <div
                v-for="metric in row.metrics"
                :key="metric.id"
                class="rounded bg-white p-2"
              >
                <p class="text-xs text-gray-500">
                  {{ metric.label }}
                </p>
                <p class="mt-1 text-sm font-bold text-gray-950">
                  {{ metric.value }}
                </p>
              </div>
            </div>
            <div class="mt-3 h-2 rounded-full bg-white">
              <div
                class="h-2 rounded-full bg-emerald-600"
                :style="{ width: row.width }"
              />
            </div>
          </div>
        </div>
      </section>

      <section class="grid gap-3">
        <div class="rounded-md border border-gray-200 p-3">
          <p class="text-sm font-semibold text-gray-950">
            확정 이력
          </p>
          <div class="mt-3 space-y-2">
            <div
              v-for="month in rollingHistory"
              :key="month.id"
              class="grid grid-cols-[52px_1fr_auto] items-center gap-2 text-xs"
            >
              <span class="font-semibold text-gray-600">{{ month.period }}</span>
              <div class="h-2 rounded-full bg-gray-100">
                <div
                  class="h-2 rounded-full bg-sky-500"
                  :style="{ width: month.width }"
                />
              </div>
              <span class="font-semibold text-gray-800">{{ month.average }}</span>
            </div>
          </div>
          <p class="mt-3 text-xs leading-5 text-gray-600">
            최소/최대 차이와 평균을 함께 검토합니다.
          </p>
        </div>
        <div class="rounded-md border border-amber-200 bg-amber-50 p-3">
          <p class="text-xs font-semibold text-amber-700">
            확인 필요
          </p>
          <p class="mt-1 text-lg font-bold text-gray-950">
            이서윤 누적 야간 +2회
          </p>
          <p class="mt-1 text-xs leading-5 text-gray-600">
            확정 이력의 누적 기준으로 다음 배정에서 조정할 항목입니다.
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LandingPreviewVariant } from '@/data/publicLandingContent'

type ShiftCode = 'D' | 'E' | 'N' | 'OFF'

interface PreviewDay {
  id: string
  label: string
}

interface ShiftCellPreview {
  id: string
  code: ShiftCode
}

interface SchedulePreviewRow {
  id: string
  name: string
  shifts: readonly ShiftCellPreview[]
}

interface PreviewMetric {
  id: string
  label: string
  value: string
  caption?: string
}

interface PreviewProgressMetric extends PreviewMetric {
  width: string
  barClass: string
}

interface OffRequestPreview {
  id: string
  employee: string
  date: string
  approved: boolean
  reason: string
}

interface GuideCheckPreview {
  id: string
  label: string
  description: string
  warning: boolean
}

interface GuideCellPreview {
  id: string
  label: string
  shift: ShiftCode
  warning: boolean
}

interface OperationEditPreview {
  id: string
  employee: string
  date: string
  before: ShiftCode
  after: ShiftCode
}

interface OperationStatusPreview {
  id: string
  label: string
  value: string
  valueClass: string
}

interface FairnessSummaryMetric {
  id: string
  label: string
  value: string
}

interface FairnessMetric {
  id: string
  label: string
  value: string
}

interface FairnessRowPreview {
  id: string
  name: string
  status: string
  width: string
  metrics: readonly FairnessMetric[]
}

interface RollingHistoryPreview {
  id: string
  period: string
  average: string
  width: string
}

defineProps<{
  variant: LandingPreviewVariant
}>()

const previewDays: readonly PreviewDay[] = [
  { id: 'day-mar-29', label: '3/29' },
  { id: 'day-mar-30', label: '3/30' },
  { id: 'day-mar-31', label: '3/31' },
  { id: 'day-apr-01', label: '4/1' },
  { id: 'day-apr-02', label: '4/2' },
  { id: 'day-apr-03', label: '4/3' },
]

const overviewRows: readonly SchedulePreviewRow[] = [
  {
    id: 'overview-row-kim',
    name: '김하늘',
    shifts: [
      { id: 'kim-mar-29', code: 'D' },
      { id: 'kim-mar-30', code: 'E' },
      { id: 'kim-mar-31', code: 'OFF' },
      { id: 'kim-apr-01', code: 'N' },
      { id: 'kim-apr-02', code: 'OFF' },
      { id: 'kim-apr-03', code: 'D' },
    ],
  },
  {
    id: 'overview-row-lee',
    name: '이서윤',
    shifts: [
      { id: 'lee-mar-29', code: 'N' },
      { id: 'lee-mar-30', code: 'OFF' },
      { id: 'lee-mar-31', code: 'D' },
      { id: 'lee-apr-01', code: 'E' },
      { id: 'lee-apr-02', code: 'D' },
      { id: 'lee-apr-03', code: 'OFF' },
    ],
  },
  {
    id: 'overview-row-park',
    name: '박민지',
    shifts: [
      { id: 'park-mar-29', code: 'E' },
      { id: 'park-mar-30', code: 'D' },
      { id: 'park-mar-31', code: 'N' },
      { id: 'park-apr-01', code: 'OFF' },
      { id: 'park-apr-02', code: 'E' },
      { id: 'park-apr-03', code: 'D' },
    ],
  },
  {
    id: 'overview-row-choi',
    name: '최유진',
    shifts: [
      { id: 'choi-mar-29', code: 'OFF' },
      { id: 'choi-mar-30', code: 'D' },
      { id: 'choi-mar-31', code: 'E' },
      { id: 'choi-apr-01', code: 'D' },
      { id: 'choi-apr-02', code: 'N' },
      { id: 'choi-apr-03', code: 'OFF' },
    ],
  },
]

const shiftClassMap: Record<ShiftCode, string> = {
  D: 'bg-shift-day/15 text-emerald-800',
  E: 'bg-shift-evening/15 text-sky-800',
  N: 'bg-shift-night/15 text-slate-800',
  OFF: 'bg-shift-off/40 text-slate-700',
}

const generationCriteria: readonly PreviewMetric[] = [
  {
    id: 'criteria-employees',
    label: '근무자 조건',
    value: '30명',
    caption: '가능 근무와 제외 조건 포함',
  },
  {
    id: 'criteria-history',
    label: '이전 이력',
    value: '전월 5일',
    caption: '연속 야간과 휴식 기준 확인',
  },
  {
    id: 'criteria-ward',
    label: '병동 기준',
    value: '요일별',
    caption: 'D/E/N 기준 인원 적용',
  },
] as const

const aiRows: readonly PreviewProgressMetric[] = [
  { id: 'ai-row-day', label: '주간', value: '96%', width: '96%', barClass: 'bg-emerald-500' },
  { id: 'ai-row-evening', label: '이브닝', value: '92%', width: '92%', barClass: 'bg-sky-500' },
  { id: 'ai-row-night', label: '야간', value: '88%', width: '88%', barClass: 'bg-shift-night' },
] as const

const offRequests: readonly OffRequestPreview[] = [
  {
    id: 'off-request-kim-apr-07',
    employee: '김하늘',
    date: '4월 7일',
    approved: true,
    reason: '필요 인력 기준을 유지하면서 Off 요청을 반영했습니다.',
  },
  {
    id: 'off-request-lee-apr-12',
    employee: '이서윤',
    date: '4월 12일',
    approved: false,
    reason: '해당 일자 N 근무 가능 인원이 부족해 검토 항목으로 남겼습니다.',
  },
  {
    id: 'off-request-choi-apr-18',
    employee: '최유진',
    date: '4월 18일',
    approved: true,
    reason: '전후 휴식 기준을 충족해 요청을 반영했습니다.',
  },
]

const guideChecks: readonly GuideCheckPreview[] = [
  {
    id: 'guide-consecutive-night',
    label: '연속 야간 제한',
    description: '연속 야간 4회 이상 배치가 없도록 점검합니다.',
    warning: true,
  },
  {
    id: 'guide-rest-after-night',
    label: '야간 후 휴식',
    description: '연속 야간이 끝난 뒤 48시간 이상 휴식이 확보되는지 확인합니다.',
    warning: false,
  },
  {
    id: 'guide-nod',
    label: 'NOD 금지',
    description: '야간 후 휴무 다음 바로 주간으로 이어지는 N-O-D 배치를 확인합니다.',
    warning: true,
  },
  {
    id: 'guide-required-staffing',
    label: '필요 인력 충족',
    description: '4월 12일 이브닝 기준 인원이 부족합니다.',
    warning: true,
  },
]

const guideCells: readonly GuideCellPreview[] = [
  { id: 'guide-cell-01', label: 'D', shift: 'D', warning: false },
  { id: 'guide-cell-02', label: 'E', shift: 'E', warning: false },
  { id: 'guide-cell-03', label: 'N', shift: 'N', warning: false },
  { id: 'guide-cell-04', label: 'NOD', shift: 'N', warning: true },
  { id: 'guide-cell-05', label: 'OFF', shift: 'OFF', warning: false },
  { id: 'guide-cell-06', label: 'D', shift: 'D', warning: false },
  { id: 'guide-cell-07', label: '부족', shift: 'E', warning: true },
  { id: 'guide-cell-08', label: 'N', shift: 'N', warning: false },
]

const operationEdits: readonly OperationEditPreview[] = [
  {
    id: 'operation-edit-kim-apr-08',
    employee: '김하늘',
    date: '4월 8일',
    before: 'N',
    after: 'OFF',
  },
  {
    id: 'operation-edit-lee-apr-09',
    employee: '이서윤',
    date: '4월 9일',
    before: 'OFF',
    after: 'E',
  },
  {
    id: 'operation-edit-park-apr-10',
    employee: '박민지',
    date: '4월 10일',
    before: 'E',
    after: 'D',
  },
]

const operationStatuses: readonly OperationStatusPreview[] = [
  {
    id: 'operation-status-save',
    label: '저장',
    value: '저장됨',
    valueClass: 'text-emerald-700',
  },
  {
    id: 'operation-status-revalidate',
    label: '재검증',
    value: '재검증 필요',
    valueClass: 'text-amber-700',
  },
  {
    id: 'operation-status-export',
    label: 'Excel',
    value: 'Excel 내보내기',
    valueClass: 'text-gray-950',
  },
]

const fairnessSummaryMetrics: readonly FairnessSummaryMetric[] = [
  { id: 'fairness-summary-cumulative', label: '누적', value: '3개월' },
  { id: 'fairness-summary-average', label: '평균', value: '야간 6회' },
  { id: 'fairness-summary-minmax', label: '최소/최대', value: '5회 / 7회' },
]

const fairnessRows: readonly FairnessRowPreview[] = [
  {
    id: 'fairness-row-kim',
    name: '김하늘',
    status: '평균 범위',
    width: '74%',
    metrics: [
      { id: 'kim-night-total', label: '야간', value: '6회' },
      { id: 'kim-weekend-total', label: '주말', value: '3회' },
      { id: 'kim-off-total', label: 'Off', value: '9일' },
    ],
  },
  {
    id: 'fairness-row-lee',
    name: '이서윤',
    status: '확인 필요',
    width: '68%',
    metrics: [
      { id: 'lee-night-total', label: '야간', value: '7회' },
      { id: 'lee-weekend-total', label: '주말', value: '4회' },
      { id: 'lee-off-total', label: 'Off', value: '8일' },
    ],
  },
  {
    id: 'fairness-row-park',
    name: '박민지',
    status: '평균 범위',
    width: '72%',
    metrics: [
      { id: 'park-night-total', label: '야간', value: '5회' },
      { id: 'park-weekend-total', label: '주말', value: '3회' },
      { id: 'park-off-total', label: 'Off', value: '10일' },
    ],
  },
]

const rollingHistory: readonly RollingHistoryPreview[] = [
  { id: 'rolling-history-feb', period: '2월', average: '평균 6회', width: '60%' },
  { id: 'rolling-history-mar', period: '3월', average: '평균 7회', width: '70%' },
  { id: 'rolling-history-apr', period: '4월', average: '평균 6회', width: '60%' },
]
</script>
