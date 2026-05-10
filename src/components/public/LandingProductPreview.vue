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
        <div class="mt-3 overflow-x-auto">
          <div class="min-w-[460px] rounded-md border border-gray-200">
            <div class="grid grid-cols-[88px_repeat(6,minmax(40px,1fr))] border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500">
              <span class="px-3 py-2">직원</span>
              <span
                v-for="day in previewDays"
                :key="day"
                class="p-2 text-center"
              >
                {{ day }}
              </span>
            </div>
            <div
              v-for="row in overviewRows"
              :key="row.id"
              class="grid grid-cols-[88px_repeat(6,minmax(40px,1fr))] border-b border-gray-100 last:border-b-0"
            >
              <span class="truncate px-3 py-2 text-xs font-medium text-gray-700">
                {{ row.name }}
              </span>
              <span
                v-for="(shift, index) in row.shifts"
                :key="`${row.id}-${index}`"
                class="m-1 rounded px-2 py-1 text-center text-xs font-semibold"
                :class="shiftClassMap[shift]"
              >
                {{ shift }}
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
          :key="item.label"
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
            :key="row.label"
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
        :key="`${request.employee}-${request.date}`"
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
          :key="check.label"
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
            :key="cell.label"
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
      class="grid gap-3 p-4"
    >
      <div
        v-for="plan in candidatePlans"
        :key="plan.name"
        class="rounded-md border border-gray-200 p-3"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-sm font-semibold text-gray-950">
            {{ plan.name }}
          </p>
          <span
            class="rounded-md px-2 py-1 text-xs font-semibold"
            :class="plan.badgeClass"
          >
            {{ plan.badge }}
          </span>
        </div>
        <div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div
            v-for="metric in plan.metrics"
            :key="metric.label"
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
      </div>
    </div>

    <div
      v-else
      class="grid gap-4 p-4 lg:grid-cols-[1.1fr_0.9fr]"
    >
      <section class="rounded-md border border-gray-200 p-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-sm font-semibold text-gray-950">
            근무자별 야간/주말/Off 현황
          </p>
          <span class="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
            누적 기준
          </span>
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
                누적 공정성 {{ row.balance }}
              </p>
            </div>
            <div class="mt-2 grid grid-cols-3 gap-2 text-center">
              <div
                v-for="metric in row.metrics"
                :key="metric.label"
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
            월별 rolling 이력
          </p>
          <div class="mt-3 space-y-2">
            <div
              v-for="month in rollingHistory"
              :key="month.month"
              class="grid grid-cols-[56px_1fr_auto] items-center gap-2 text-xs"
            >
              <span class="font-semibold text-gray-600">{{ month.month }}</span>
              <div class="h-2 rounded-full bg-gray-100">
                <div
                  class="h-2 rounded-full bg-sky-500"
                  :style="{ width: month.width }"
                />
              </div>
              <span class="font-semibold text-gray-800">{{ month.value }}</span>
            </div>
          </div>
        </div>
        <div class="rounded-md border border-emerald-200 bg-emerald-50 p-3">
          <p class="text-xs font-semibold text-emerald-700">
            누적 공정성 확인
          </p>
          <p class="mt-1 text-lg font-bold text-gray-950">
            편차 2회 이내
          </p>
          <p class="mt-1 text-xs leading-5 text-gray-600">
            야간과 주말 근무 편차를 누적 기준으로 확인합니다.
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LandingPreviewVariant } from '@/data/publicLandingContent'

type ShiftCode = 'D' | 'E' | 'N' | 'OFF'

interface SchedulePreviewRow {
  id: string
  name: string
  shifts: readonly ShiftCode[]
}

interface OffRequestPreview {
  employee: string
  date: string
  approved: boolean
  reason: string
}

interface GuideCheckPreview {
  label: string
  description: string
  warning: boolean
}

interface GuideCellPreview {
  label: string
  shift: ShiftCode
  warning: boolean
}

interface CandidateMetric {
  label: string
  value: string
}

interface CandidatePlanPreview {
  name: string
  badge: string
  badgeClass: string
  metrics: readonly CandidateMetric[]
}

interface FairnessMetric {
  label: string
  value: string
}

interface FairnessRowPreview {
  id: string
  name: string
  balance: string
  width: string
  metrics: readonly FairnessMetric[]
}

interface RollingHistoryPreview {
  month: string
  value: string
  width: string
}

defineProps<{
  variant: LandingPreviewVariant
}>()

const previewDays = ['3/29', '3/30', '3/31', '4/1', '4/2', '4/3'] as const

const overviewRows: readonly SchedulePreviewRow[] = [
  { id: 'nurse-kim', name: '김하늘', shifts: ['D', 'E', 'OFF', 'N', 'OFF', 'D'] },
  { id: 'nurse-lee', name: '이서윤', shifts: ['N', 'OFF', 'D', 'E', 'D', 'OFF'] },
  { id: 'nurse-park', name: '박민지', shifts: ['E', 'D', 'N', 'OFF', 'E', 'D'] },
  { id: 'nurse-choi', name: '최유진', shifts: ['OFF', 'D', 'E', 'D', 'N', 'OFF'] },
]

const shiftClassMap: Record<ShiftCode, string> = {
  D: 'bg-emerald-100 text-emerald-800',
  E: 'bg-sky-100 text-sky-800',
  N: 'bg-violet-100 text-violet-800',
  OFF: 'bg-gray-200 text-gray-700',
}

const generationCriteria = [
  {
    label: '근무자 조건',
    value: '30명',
    caption: '가능 근무와 제외 조건 포함',
  },
  {
    label: '이전 이력',
    value: '전월 5일',
    caption: '연속 야간과 휴식 기준 확인',
  },
  {
    label: '병동 기준',
    value: '요일별',
    caption: 'D/E/N 기준 인원 적용',
  },
] as const

const aiRows = [
  { label: 'Day', value: '96%', width: '96%', barClass: 'bg-emerald-500' },
  { label: 'Evening', value: '92%', width: '92%', barClass: 'bg-sky-500' },
  { label: 'Night', value: '88%', width: '88%', barClass: 'bg-violet-500' },
] as const

const offRequests: readonly OffRequestPreview[] = [
  {
    employee: '김하늘',
    date: '4월 7일',
    approved: true,
    reason: '필요 인력 기준을 유지하면서 Off 요청을 반영했습니다.',
  },
  {
    employee: '이서윤',
    date: '4월 12일',
    approved: false,
    reason: '해당 일자 N 근무 가능 인원이 부족해 검토 항목으로 남겼습니다.',
  },
  {
    employee: '최유진',
    date: '4월 18일',
    approved: true,
    reason: '전후 휴식 기준을 충족해 요청을 반영했습니다.',
  },
]

const guideChecks: readonly GuideCheckPreview[] = [
  {
    label: '연속 야간 제한',
    description: '연속 야간 4회 이상 배치가 없도록 점검합니다.',
    warning: true,
  },
  {
    label: '야간 후 휴식',
    description: '연속 야간이 끝난 뒤 48시간 이상 휴식이 확보되는지 확인합니다.',
    warning: false,
  },
  {
    label: 'NOD 금지',
    description: '야간 이후 Off 없이 주간으로 이어지는 배치를 확인합니다.',
    warning: true,
  },
  {
    label: '필요 인력 충족',
    description: '4월 12일 Evening 기준 인원이 부족합니다.',
    warning: true,
  },
]

const guideCells: readonly GuideCellPreview[] = [
  { label: 'D', shift: 'D', warning: false },
  { label: 'E', shift: 'E', warning: false },
  { label: 'N', shift: 'N', warning: false },
  { label: 'NOD', shift: 'N', warning: true },
  { label: 'OFF', shift: 'OFF', warning: false },
  { label: 'D', shift: 'D', warning: false },
  { label: '부족', shift: 'E', warning: true },
  { label: 'N', shift: 'N', warning: false },
]

const candidatePlans: readonly CandidatePlanPreview[] = [
  {
    name: '버전 A',
    badge: '추천',
    badgeClass: 'bg-emerald-50 text-emerald-700',
    metrics: [
      { label: 'Off 반영률', value: '82%' },
      { label: '야간/주말 편차', value: '낮음' },
      { label: '수정 건수', value: '3건' },
      { label: 'Excel 내보내기', value: '준비' },
    ],
  },
  {
    name: '버전 B',
    badge: '비교',
    badgeClass: 'bg-sky-50 text-sky-700',
    metrics: [
      { label: 'Off 반영률', value: '76%' },
      { label: '야간/주말 편차', value: '보통' },
      { label: '수정 건수', value: '6건' },
      { label: 'Excel 내보내기', value: '검토' },
    ],
  },
]

const fairnessRows: readonly FairnessRowPreview[] = [
  {
    id: 'nurse-kim',
    name: '김하늘',
    balance: '확인',
    width: '74%',
    metrics: [
      { label: '야간', value: '6회' },
      { label: '주말', value: '3회' },
      { label: 'Off', value: '9일' },
    ],
  },
  {
    id: 'nurse-lee',
    name: '이서윤',
    balance: '관찰',
    width: '68%',
    metrics: [
      { label: '야간', value: '7회' },
      { label: '주말', value: '4회' },
      { label: 'Off', value: '8일' },
    ],
  },
  {
    id: 'nurse-park',
    name: '박민지',
    balance: '확인',
    width: '72%',
    metrics: [
      { label: '야간', value: '5회' },
      { label: '주말', value: '3회' },
      { label: 'Off', value: '10일' },
    ],
  },
]

const rollingHistory: readonly RollingHistoryPreview[] = [
  { month: '2월', value: '6회', width: '60%' },
  { month: '3월', value: '7회', width: '70%' },
  { month: '4월', value: '6회', width: '60%' },
]
</script>
