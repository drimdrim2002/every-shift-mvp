<template>
  <div
    v-if="shouldShowProductPreview"
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
      v-if="variant === 'ai'"
      data-test="landing-ai-schedule-mock"
      class="p-4"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-gray-950">
            근무표 초안 미리보기
          </p>
          <p class="mt-1 text-xs leading-5 text-gray-500">
            표본 12명 x 10일 표시 · 실제 입력 흐름은 30명 x 36일 기준
          </p>
        </div>
        <span class="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          대형병원 Excel 구조
        </span>
      </div>

      <div class="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div
          data-test="landing-ai-schedule-scroll"
          class="min-w-0 overflow-x-auto rounded-md border border-gray-200"
        >
          <table class="min-w-[680px] border-separate border-spacing-0 text-[11px]">
            <thead class="bg-gray-50 text-gray-600">
              <tr>
                <th
                  scope="col"
                  class="sticky left-0 z-10 w-[96px] border-b border-gray-200 bg-gray-50 px-3 py-2 text-left font-semibold"
                >
                  근무자
                </th>
                <th
                  v-for="day in aiScheduleDays"
                  :key="day.id"
                  scope="col"
                  data-test="landing-ai-day-header"
                  :data-day-id="day.id"
                  class="w-[48px] border-b border-gray-200 p-2 text-center font-semibold"
                >
                  {{ day.label }}
                </th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="row in aiScheduleRows"
                :key="row.id"
                data-test="landing-ai-employee-row"
                class="odd:bg-white even:bg-gray-50/40"
              >
                <th
                  scope="row"
                  data-test="landing-ai-employee-cell"
                  class="sticky left-0 z-10 border-b border-gray-100 bg-inherit px-3 py-2 text-left font-medium text-gray-800"
                >
                  {{ row.name }}
                </th>
                <td
                  v-for="shift in row.shifts"
                  :key="shift.id"
                  data-test="landing-ai-shift-cell"
                  :data-day-id="shift.dayId"
                  :data-shift-code="shift.code"
                  :data-off-requested="shift.offRequested ? 'true' : 'false'"
                  :aria-label="shift.offRequested ? `${row.name} ${shift.dayLabel} Off 요청 반영` : undefined"
                  class="border-b border-gray-100 p-1.5 text-center font-semibold"
                  :class="shift.offRequested ? 'ring-1 ring-inset ring-rose-300' : ''"
                >
                  <span
                    class="mx-auto block rounded px-2 py-1"
                    :class="aiShiftClassMap[shift.code]"
                  >
                    {{ shift.code }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <aside
          data-test="landing-ai-proof-panel"
          class="rounded-md border border-gray-200 bg-gray-50 p-3"
        >
          <p class="text-xs font-semibold text-gray-500">
            검토 기준
          </p>
          <div class="mt-3 grid gap-2">
            <div
              v-for="item in aiProofItems"
              :key="item.id"
              data-test="landing-ai-proof-item"
              class="rounded-md bg-white px-3 py-2"
            >
              <p class="text-xs font-semibold text-gray-950">
                {{ item.title }}
              </p>
              <p class="mt-1 text-xs leading-5 text-gray-600">
                {{ item.description }}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <div
      v-else-if="variant === 'fairness'"
      class="space-y-4 p-4"
    >
      <section class="rounded-md border border-gray-200 p-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="text-sm font-semibold text-gray-950">
              근무자별 공정성 비교
            </p>
            <p class="mt-1 text-xs leading-5 text-gray-500">
              2026년 3월 ~ 5월 확정 근무표 기준
            </p>
          </div>
          <span class="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
            다음 생성 기준
          </span>
        </div>

        <div class="mt-3 grid gap-2 sm:grid-cols-3">
          <div
            v-for="metric in fairnessSummaryMetrics"
            :key="metric.id"
            class="rounded-md border border-gray-200 bg-gray-50 p-3"
          >
            <p class="text-xs font-semibold text-gray-500">
              {{ metric.label }}
            </p>
            <p class="mt-1 text-lg font-bold text-gray-950">
              {{ metric.value }}
            </p>
            <p class="mt-1 text-xs leading-5 text-gray-600">
              {{ metric.caption }}
            </p>
          </div>
        </div>
      </section>

      <section class="overflow-hidden rounded-md border border-gray-200">
        <div class="border-b border-gray-200 bg-gray-50 px-3 py-2">
          <p class="text-xs font-semibold text-gray-600">
            직원별 평균 대비 차이
          </p>
        </div>

        <div class="grid gap-3 p-3 lg:hidden">
          <div
            v-for="row in fairnessRows"
            :key="row.id"
            class="rounded-md border border-gray-200 bg-white p-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-gray-950">
                  {{ row.name }}
                </p>
                <p class="mt-1 text-xs font-medium tabular-nums text-gray-500">
                  직원 ID {{ row.employeeId }}
                </p>
              </div>
              <span
                class="shrink-0 rounded px-2 py-1 text-xs font-semibold"
                :class="row.statusClass"
              >
                {{ row.status }}
              </span>
            </div>

            <div class="mt-3 grid gap-2">
              <div
                v-for="metric in row.metrics"
                :key="metric.id"
                class="rounded-md p-2"
                :class="metric.cellClass"
              >
                <div class="flex items-center justify-between gap-2">
                  <p class="text-xs font-semibold text-gray-600">
                    {{ metric.label }}
                  </p>
                  <p class="text-sm font-bold tabular-nums text-gray-950">
                    {{ metric.value }}
                  </p>
                </div>
                <p class="mt-1 text-xs tabular-nums text-gray-500">
                  전체 평균 {{ metric.average }} · 평균과의 차이 {{ metric.deltaLabel }}
                </p>
                <div class="mt-2">
                  <div class="relative h-2 rounded-full bg-white">
                    <span class="absolute -top-0.5 left-1/2 h-3 w-px bg-gray-400" />
                    <span
                      class="absolute top-0 h-2 rounded-full"
                      :class="metric.barClass"
                      :style="{ left: metric.barLeft, width: metric.barWidth }"
                    />
                  </div>
                </div>
                <p
                  class="mt-1 text-xs font-semibold"
                  :class="metric.textClass"
                >
                  {{ metric.directionLabel }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="hidden overflow-x-auto lg:block">
          <div class="min-w-[920px] divide-y divide-gray-100 text-sm">
            <div class="grid grid-cols-[9.5rem_repeat(3,minmax(13rem,1fr))] bg-gray-50 text-xs font-semibold text-gray-500">
              <div class="px-4 py-3 text-center">
                직원
              </div>
              <div
                v-for="metric in fairnessMetricHeaders"
                :key="metric.id"
                class="px-4 py-3 text-center"
              >
                {{ metric.label }}
              </div>
            </div>

            <div
              v-for="row in fairnessRows"
              :key="`desktop-${row.id}`"
              class="grid grid-cols-[9.5rem_repeat(3,minmax(13rem,1fr))] bg-white"
            >
              <div class="flex min-h-[5.5rem] items-center justify-center px-4 py-3 text-center">
                <div class="min-w-0">
                  <p class="truncate font-semibold text-gray-950">
                    {{ row.name }}
                  </p>
                  <p class="mt-1 text-xs font-medium tabular-nums text-gray-500">
                    직원 ID {{ row.employeeId }}
                  </p>
                  <span
                    class="mt-2 inline-flex rounded px-2 py-0.5 text-xs font-semibold"
                    :class="row.statusClass"
                  >
                    {{ row.status }}
                  </span>
                </div>
              </div>

              <div
                v-for="metric in row.metrics"
                :key="`desktop-${metric.id}`"
                class="min-h-[5.5rem] px-4 py-3 text-center"
                :class="metric.cellClass"
              >
                <p class="font-semibold tabular-nums text-gray-950">
                  {{ metric.value }}
                </p>
                <p class="mt-1 text-xs tabular-nums text-gray-500">
                  전체 평균 {{ metric.average }}
                </p>
                <p class="mt-1 text-xs font-semibold tabular-nums text-gray-700">
                  평균과의 차이 {{ metric.deltaLabel }}
                </p>
                <div class="mt-3">
                  <div class="relative h-2.5 rounded-full bg-white">
                    <span class="absolute left-1/2 top-[-0.1875rem] h-4 w-px bg-gray-400" />
                    <span
                      class="absolute top-0 h-2.5 rounded-full"
                      :class="metric.barClass"
                      :style="{ left: metric.barLeft, width: metric.barWidth }"
                    />
                  </div>
                </div>
                <p
                  class="mt-2 text-xs font-semibold"
                  :class="metric.textClass"
                >
                  {{ metric.directionLabel }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-md border border-amber-200 bg-amber-50 p-3">
        <p class="text-xs font-semibold text-amber-700">
          다음 근무표 생성 시 조정 기준
        </p>
        <div class="mt-2 grid gap-2 sm:grid-cols-3">
          <div
            v-for="item in fairnessAdjustmentRules"
            :key="item.id"
            class="rounded-md bg-white px-3 py-2"
          >
            <p class="text-xs font-semibold text-gray-950">
              {{ item.title }}
            </p>
            <p class="mt-1 text-xs leading-5 text-gray-600">
              {{ item.description }}
            </p>
          </div>
        </div>
      </section>
    </div>

    <div
      v-else-if="variant === 'conditions'"
      class="grid gap-4 p-4 lg:grid-cols-[1.1fr_0.9fr]"
    >
      <section class="min-w-0 rounded-md border border-gray-200 p-3">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm font-semibold text-gray-950">
            조건 입력
          </p>
          <span class="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
            3개 기준
          </span>
        </div>

        <div class="mt-3 grid gap-3">
          <div class="rounded-md bg-gray-50 p-3">
            <p class="text-xs font-semibold text-gray-500">
              1 요일별 필요 인력
            </p>
            <div class="mt-2 overflow-hidden rounded-md border border-gray-200 bg-white">
              <div
                v-for="requirement in staffingRequirementPreview"
                :key="requirement.id"
                class="grid grid-cols-[68px_1fr] items-center border-b border-gray-100 last:border-b-0"
              >
                <span class="px-3 py-2 text-xs font-semibold text-gray-600">
                  {{ requirement.days }}
                </span>
                <span class="flex flex-wrap gap-1.5 p-2">
                  <span
                    v-for="shift in requirement.shifts"
                    :key="shift.id"
                    class="rounded px-2 py-1 text-xs font-semibold"
                    :class="shiftClassMap[shift.code]"
                  >
                    {{ shift.code }} {{ shift.count }}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div class="rounded-md bg-gray-50 p-3">
            <p class="text-xs font-semibold text-gray-500">
              2 근무자별 가능 시프트
            </p>
            <div class="mt-2 grid gap-2 sm:grid-cols-3">
              <div
                v-for="employee in employeeShiftPreview"
                :key="employee.id"
                class="rounded-md border border-gray-200 bg-white p-2"
              >
                <p class="text-xs font-semibold text-gray-700">
                  {{ employee.name }}
                </p>
                <div class="mt-2 flex flex-wrap gap-1.5">
                  <span
                    v-for="shift in employee.shifts"
                    :key="shift"
                    class="rounded px-2 py-1 text-xs font-semibold"
                    :class="shiftClassMap[shift]"
                  >
                    {{ shift }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-md bg-gray-50 p-3">
            <p class="text-xs font-semibold text-gray-500">
              3 사전 Off 요청
            </p>
            <div class="mt-2 grid gap-2 sm:grid-cols-3">
              <div
                v-for="request in conditionOffRequests"
                :key="request.id"
                class="rounded-md border border-gray-200 bg-white p-2"
              >
                <p class="text-xs font-semibold text-gray-700">
                  {{ request.employee }}
                </p>
                <p class="mt-1 text-xs text-gray-500">
                  {{ request.date }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="grid content-start gap-3">
        <div class="rounded-md border border-emerald-200 bg-emerald-50 p-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-xs font-semibold text-emerald-700">
              조건 반영 완료
            </p>
            <span class="rounded-md bg-white px-2 py-1 text-xs font-semibold text-emerald-700">
              자동 검증
            </span>
          </div>
          <p class="mt-2 text-2xl font-bold text-gray-950">
            반영 5건 / 검토 1건
          </p>
        </div>

        <div
          v-for="item in conditionResultItems"
          :key="item.id"
          class="rounded-md border border-gray-200 p-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-gray-950">
                {{ item.title }}
              </p>
              <p class="mt-1 text-xs leading-5 text-gray-600">
                {{ item.description }}
              </p>
            </div>
            <span
              class="shrink-0 rounded px-2 py-1 text-xs font-semibold"
              :class="item.statusClass"
            >
              {{ item.status }}
            </span>
          </div>
        </div>

        <div class="rounded-md border border-amber-200 bg-amber-50 p-3">
          <p class="text-xs font-semibold text-amber-700">
            검토 사유
          </p>
          <p class="mt-1 text-sm font-bold text-gray-950">
            4월 12일 N 가능 인원 부족
          </p>
        </div>
      </section>
    </div>

    <div
      v-else-if="variant === 'guide'"
      data-test="landing-guide-compliance-mock"
      class="grid gap-4 p-4 lg:grid-cols-[0.9fr_1.1fr]"
    >
      <section class="grid content-start gap-3">
        <div class="rounded-md border border-emerald-200 bg-emerald-50 p-3">
          <p class="text-xs font-semibold text-emerald-700">
            보건복지부 가이드라인
          </p>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <p class="text-2xl font-bold text-gray-950">
              충족
            </p>
            <span class="rounded-md bg-white px-2 py-1 text-xs font-semibold text-emerald-700">
              확정 가능
            </span>
          </div>
          <p class="mt-2 text-xs leading-5 text-emerald-800">
            확정 전 필수 기준 5개를 모두 확인했습니다.
          </p>
        </div>

        <div class="grid gap-2 sm:grid-cols-3">
          <div
            v-for="summary in guideResultSummaries"
            :key="summary.id"
            class="rounded-md border border-gray-200 bg-white p-3"
          >
            <p class="text-[11px] font-semibold text-gray-500">
              {{ summary.label }}
            </p>
            <p class="mt-1 text-sm font-bold text-gray-950">
              {{ summary.value }}
            </p>
          </div>
        </div>

        <div class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
          <p class="text-xs leading-5 text-amber-800">
            현재 보는 근무표안은 편집할 수 없습니다. (생성 중 또는 최종 확정됨)
          </p>
        </div>
      </section>

      <section class="rounded-md border border-gray-200 bg-slate-50 p-3">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-gray-950">
              보건복지부 가이드라인 상세
            </p>
            <p class="mt-1 text-xs text-gray-500">
              항목별 충족 여부
            </p>
          </div>
          <span class="text-base leading-none text-gray-400">
            x
          </span>
        </div>

        <div class="mt-3 grid gap-2 sm:grid-cols-2">
          <div
            v-for="check in guideChecks"
            :key="check.id"
            class="rounded-md border border-emerald-100 bg-white p-3"
          >
            <div class="flex items-start justify-between gap-2">
              <p class="min-w-0 text-sm font-semibold leading-5 text-gray-950">
                {{ check.label }}
              </p>
              <strong class="shrink-0 text-xs font-bold text-emerald-700">
                {{ check.status }}
              </strong>
            </div>
            <p class="mt-1 text-xs leading-5 text-gray-600">
              {{ check.description }}
            </p>
          </div>
        </div>

        <div class="mt-3 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2">
          <p class="text-xs font-semibold text-emerald-700">
            위반 없음
          </p>
          <p class="mt-1 text-xs leading-5 text-emerald-800">
            보건복지부 가이드라인 위반 항목이 없습니다.
          </p>
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
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LandingPreviewVariant } from '@/data/publicLandingContent'

type ShiftCode = 'D' | 'E' | 'N' | 'OFF'
type AiShiftCode = 'D' | 'E' | 'N' | 'O'
type AiWorkShiftCode = Exclude<AiShiftCode, 'O'>

interface AiScheduleDay {
  id: string
  label: string
}

interface AiEmployee {
  id: string
  name: string
}

interface AiScheduleCell {
  id: string
  dayId: string
  dayLabel: string
  code: AiShiftCode
  offRequested: boolean
}

interface AiScheduleRow {
  id: string
  employeeId: string
  name: string
  shifts: readonly AiScheduleCell[]
}

interface AiScheduleRowDraft {
  employee: AiEmployee
  employeeIndex: number
  shifts: AiScheduleCell[]
}

type AiStaffingRequirement = Record<AiWorkShiftCode, number>

interface AiProofItem {
  id: string
  title: string
  description: string
}

interface GuideCheckPreview {
  id: string
  label: string
  status: string
  description: string
}

interface GuideResultSummaryPreview {
  id: string
  label: string
  value: string
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
  caption: string
}

interface FairnessMetric {
  id: string
  label: string
  value: string
  average: string
  deltaLabel: string
  directionLabel: string
  barLeft: string
  barWidth: string
  barClass: string
  cellClass: string
  textClass: string
}

interface FairnessRowPreview {
  id: string
  employeeId: string
  name: string
  status: string
  statusClass: string
  metrics: readonly FairnessMetric[]
}

interface FairnessMetricHeader {
  id: string
  label: string
}

interface FairnessAdjustmentRule {
  id: string
  title: string
  description: string
}

interface StaffingRequirementShiftPreview {
  id: string
  code: Exclude<ShiftCode, 'OFF'>
  count: number
}

interface StaffingRequirementPreview {
  id: string
  days: string
  shifts: readonly StaffingRequirementShiftPreview[]
}

interface EmployeeShiftPreview {
  id: string
  name: string
  shifts: readonly Exclude<ShiftCode, 'OFF'>[]
}

interface ConditionOffRequestPreview {
  id: string
  employee: string
  date: string
}

interface ConditionResultItemPreview {
  id: string
  title: string
  description: string
  status: string
  statusClass: string
}

const props = defineProps<{
  variant: LandingPreviewVariant
}>()

const shouldShowProductPreview = computed(() => props.variant !== 'compare')

const shiftClassMap: Record<ShiftCode, string> = {
  D: 'bg-shift-day/15 text-emerald-800',
  E: 'bg-shift-evening/15 text-sky-800',
  N: 'bg-shift-night/15 text-slate-800',
  OFF: 'bg-shift-off/40 text-slate-700',
}

const aiShiftClassMap: Record<AiShiftCode, string> = {
  D: 'bg-shift-day/15 text-emerald-800',
  E: 'bg-shift-evening/15 text-sky-800',
  N: 'bg-shift-night/15 text-slate-800',
  O: 'bg-shift-off/40 text-slate-700',
}

const aiWorkShiftCodes: readonly AiWorkShiftCode[] = ['D', 'E', 'N']

const aiDailyStaffingRequirement: AiStaffingRequirement = {
  D: 3,
  E: 4,
  N: 3,
}

const aiWorkShiftSlots: readonly AiWorkShiftCode[] = aiWorkShiftCodes.flatMap((code) =>
  Array.from({ length: aiDailyStaffingRequirement[code] }, () => code),
)

const aiProofItems: readonly AiProofItem[] = [
  {
    id: 'staffing',
    title: 'D/E/N 필요 인력 충족',
    description: '일자별 필요 인력을 준수합니다.',
  },
  {
    id: 'off-requests',
    title: 'Off 요청 반영',
    description: '사전 Off 요청일을 최대한 반영합니다.',
  },
  {
    id: 'fairness',
    title: '야간·공휴일 균형 점검',
    description: '한 달 결과만이 아니라 누적 편차를 함께 봅니다.',
  },
  {
    id: 'expert-review',
    title: '현직 수간호사 자문 기준',
    description: '실제 검토자가 확인하는 순서에 맞춰 흐름을 설계했습니다.',
  },
]

const aiScheduleDays: readonly AiScheduleDay[] = [
  { id: 'day-apr-01', label: '4/1' },
  { id: 'day-apr-02', label: '4/2' },
  { id: 'day-apr-03', label: '4/3' },
  { id: 'day-apr-04', label: '4/4' },
  { id: 'day-apr-05', label: '4/5' },
  { id: 'day-apr-06', label: '4/6' },
  { id: 'day-apr-07', label: '4/7' },
  { id: 'day-apr-08', label: '4/8' },
  { id: 'day-apr-09', label: '4/9' },
  { id: 'day-apr-10', label: '4/10' },
] as const

const aiEmployees: readonly AiEmployee[] = [
  { id: 'employee-kim-haneul', name: '김하늘' },
  { id: 'employee-lee-seoyun', name: '이서윤' },
  { id: 'employee-park-minji', name: '박민지' },
  { id: 'employee-choi-yujin', name: '최유진' },
  { id: 'employee-jeong-daeun', name: '정다은' },
  { id: 'employee-han-jimin', name: '한지민' },
  { id: 'employee-oh-seoa', name: '오서아' },
  { id: 'employee-yun-chaewon', name: '윤채원' },
  { id: 'employee-lim-subin', name: '임수빈' },
  { id: 'employee-kang-minseo', name: '강민서' },
  { id: 'employee-jo-ara', name: '조아라' },
  { id: 'employee-shin-yuna', name: '신유나' },
] as const

const aiOffRequestCellKeys = new Set<string>([
  'employee-kim-haneul:day-apr-03',
  'employee-choi-yujin:day-apr-05',
  'employee-han-jimin:day-apr-07',
  'employee-lim-subin:day-apr-09',
])

function buildAiScheduleRows(): readonly AiScheduleRow[] {
  const rowDrafts: AiScheduleRowDraft[] = aiEmployees.map((employee, employeeIndex) => ({
    employee,
    employeeIndex,
    shifts: aiScheduleDays.map((day) => ({
      id: `${employee.id}-${day.id}`,
      dayId: day.id,
      dayLabel: day.label,
      code: 'O',
      offRequested: aiOffRequestCellKeys.has(`${employee.id}:${day.id}`),
    })),
  }))

  aiScheduleDays.forEach((_, dayIndex) => {
    const rotationOffset = (dayIndex * 3) % aiEmployees.length
    const availableRows = [...rowDrafts]
      .filter((row) => !row.shifts[dayIndex]?.offRequested)
      .sort((a, b) => {
        const aRotationRank = (a.employeeIndex - rotationOffset + aiEmployees.length) % aiEmployees.length
        const bRotationRank = (b.employeeIndex - rotationOffset + aiEmployees.length) % aiEmployees.length

        return aRotationRank - bRotationRank
      })

    aiWorkShiftSlots.forEach((code, slotIndex) => {
      const candidateShift = availableRows[slotIndex]?.shifts[dayIndex]

      if (candidateShift !== undefined) {
        candidateShift.code = code
      }
    })
  })

  return rowDrafts.map((row) => ({
    id: `ai-row-${row.employee.id}`,
    employeeId: row.employee.id,
    name: row.employee.name,
    shifts: row.shifts,
  }))
}

const aiScheduleRows = buildAiScheduleRows()

const staffingRequirementPreview: readonly StaffingRequirementPreview[] = [
  {
    id: 'staffing-weekday',
    days: '월-금',
    shifts: [
      { id: 'staffing-weekday-day', code: 'D', count: 3 },
      { id: 'staffing-weekday-evening', code: 'E', count: 2 },
      { id: 'staffing-weekday-night', code: 'N', count: 1 },
    ],
  },
  {
    id: 'staffing-weekend',
    days: '토-일',
    shifts: [
      { id: 'staffing-weekend-day', code: 'D', count: 2 },
      { id: 'staffing-weekend-evening', code: 'E', count: 2 },
      { id: 'staffing-weekend-night', code: 'N', count: 1 },
    ],
  },
] as const

const employeeShiftPreview: readonly EmployeeShiftPreview[] = [
  { id: 'condition-employee-kim', name: '김하늘', shifts: ['D', 'E'] },
  { id: 'condition-employee-lee', name: '이서윤', shifts: ['E', 'N'] },
  { id: 'condition-employee-choi', name: '최유진', shifts: ['D', 'N'] },
] as const

const conditionOffRequests: readonly ConditionOffRequestPreview[] = [
  { id: 'condition-off-kim-apr-07', employee: '김하늘', date: '4월 7일' },
  { id: 'condition-off-lee-apr-12', employee: '이서윤', date: '4월 12일' },
  { id: 'condition-off-choi-apr-18', employee: '최유진', date: '4월 18일' },
] as const

const conditionResultItems: readonly ConditionResultItemPreview[] = [
  {
    id: 'condition-result-staffing',
    title: '요일별 인력 기준 충족',
    description: '평일과 주말의 D/E/N 필요 인원을 맞췄습니다.',
    status: '충족',
    statusClass: 'bg-emerald-50 text-emerald-700',
  },
  {
    id: 'condition-result-shift',
    title: '가능 시프트 기준 반영',
    description: '근무자별 가능한 D/E/N 범위 안에서 배정했습니다.',
    status: '반영',
    statusClass: 'bg-emerald-50 text-emerald-700',
  },
  {
    id: 'condition-result-off',
    title: 'Off 요청 2건 반영 · 1건 검토',
    description: '김하늘, 최유진 요청은 반영하고 이서윤 요청은 검토로 남겼습니다.',
    status: '검토',
    statusClass: 'bg-amber-50 text-amber-700',
  },
] as const

const guideChecks: readonly GuideCheckPreview[] = [
  {
    id: 'guide-nod',
    label: 'NOD 금지',
    status: '충족',
    description: '야간 후 휴무 다음 바로 주간으로 이어지는 배치가 없습니다.',
  },
  {
    id: 'guide-consecutive-night',
    label: '4일속 야간 금지 (3연속 허용)',
    status: '충족',
    description: '4일 연속 야간 근무가 없도록 확인했습니다.',
  },
  {
    id: 'guide-rest-after-night',
    label: '연속 야간 후 48시간 휴식',
    status: '충족',
    description: '연속 야간이 끝난 뒤 48시간 이상 휴식이 확보되었습니다.',
  },
  {
    id: 'guide-monthly-night-limit',
    label: '월 야간 15회 이하',
    status: '충족',
    description: '근무자별 월 야간 배정 횟수가 기준 안에 있습니다.',
  },
  {
    id: 'guide-required-staffing',
    label: '필요 인력 충족',
    status: '충족',
    description: 'D/E/N 필수 인력 기준을 모두 만족했습니다.',
  },
] as const

const guideResultSummaries: readonly GuideResultSummaryPreview[] = [
  { id: 'guide-summary-status', label: '생성 상태', value: '완성' },
  { id: 'guide-summary-off', label: 'Off 요청', value: '63/63 반영' },
  { id: 'guide-summary-finalize', label: '확정', value: '대기' },
] as const

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
  {
    id: 'fairness-summary-night',
    label: '야간 근무',
    value: '전체 평균 14.5일',
    caption: '최대 차이 3일',
  },
  {
    id: 'fairness-summary-weekend',
    label: '주말·공휴일 근무',
    value: '전체 평균 14.9일',
    caption: '최대 차이 4일',
  },
  {
    id: 'fairness-summary-off',
    label: 'Off 요청 수락',
    value: '전체 평균 6.5일',
    caption: '최대 차이 2일',
  },
]

const fairnessMetricHeaders: readonly FairnessMetricHeader[] = [
  { id: 'fairness-header-night', label: '야간 근무' },
  { id: 'fairness-header-weekend', label: '주말·공휴일 근무' },
  { id: 'fairness-header-off', label: 'Off 요청 수락' },
]

const fairnessRows: readonly FairnessRowPreview[] = [
  {
    id: 'fairness-row-kim',
    employeeId: '43577',
    name: '고소영',
    status: '조정 우선',
    statusClass: 'bg-amber-100 text-amber-900',
    metrics: [
      {
        id: 'kim-night-total',
        label: '야간 근무',
        value: '14일',
        average: '14.5일',
        deltaLabel: '-0.5일',
        directionLabel: '적게 근무',
        barLeft: '42%',
        barWidth: '8%',
        barClass: 'bg-emerald-600',
        cellClass: 'bg-emerald-50/60',
        textClass: 'text-emerald-700',
      },
      {
        id: 'kim-weekend-total',
        label: '주말·공휴일',
        value: '23일',
        average: '14.9일',
        deltaLabel: '+8.1일',
        directionLabel: '많이 근무 · 강조',
        barLeft: '50%',
        barWidth: '42%',
        barClass: 'bg-amber-500',
        cellClass: 'bg-amber-50 ring-1 ring-inset ring-amber-200',
        textClass: 'text-amber-800',
      },
      {
        id: 'kim-off-total',
        label: 'Off 요청',
        value: '6일',
        average: '6.5일',
        deltaLabel: '-0.5일',
        directionLabel: '적게 수락',
        barLeft: '43%',
        barWidth: '7%',
        barClass: 'bg-amber-500',
        cellClass: 'bg-amber-50/60',
        textClass: 'text-amber-800',
      },
    ],
  },
  {
    id: 'fairness-row-lee',
    employeeId: '43178',
    name: '이미지',
    status: '확인 필요',
    statusClass: 'bg-amber-100 text-amber-900',
    metrics: [
      {
        id: 'lee-night-total',
        label: '야간 근무',
        value: '16일',
        average: '14.5일',
        deltaLabel: '+1.5일',
        directionLabel: '많이 근무',
        barLeft: '50%',
        barWidth: '18%',
        barClass: 'bg-amber-500',
        cellClass: 'bg-amber-50/60',
        textClass: 'text-amber-800',
      },
      {
        id: 'lee-weekend-total',
        label: '주말·공휴일',
        value: '17일',
        average: '14.9일',
        deltaLabel: '+2.1일',
        directionLabel: '많이 근무',
        barLeft: '50%',
        barWidth: '22%',
        barClass: 'bg-amber-500',
        cellClass: 'bg-amber-50/60',
        textClass: 'text-amber-800',
      },
      {
        id: 'lee-off-total',
        label: 'Off 요청',
        value: '6일',
        average: '6.5일',
        deltaLabel: '-0.5일',
        directionLabel: '적게 수락',
        barLeft: '43%',
        barWidth: '7%',
        barClass: 'bg-amber-500',
        cellClass: 'bg-amber-50/60',
        textClass: 'text-amber-800',
      },
    ],
  },
  {
    id: 'fairness-row-park',
    employeeId: '43689',
    name: '김수연',
    status: '평균 범위',
    statusClass: 'bg-emerald-100 text-emerald-800',
    metrics: [
      {
        id: 'park-night-total',
        label: '야간 근무',
        value: '13일',
        average: '14.5일',
        deltaLabel: '-1.5일',
        directionLabel: '적게 근무',
        barLeft: '31%',
        barWidth: '19%',
        barClass: 'bg-emerald-600',
        cellClass: 'bg-emerald-50/60',
        textClass: 'text-emerald-700',
      },
      {
        id: 'park-weekend-total',
        label: '주말·공휴일',
        value: '17일',
        average: '14.9일',
        deltaLabel: '+2.1일',
        directionLabel: '많이 근무',
        barLeft: '50%',
        barWidth: '22%',
        barClass: 'bg-amber-500',
        cellClass: 'bg-amber-50/60',
        textClass: 'text-amber-800',
      },
      {
        id: 'park-off-total',
        label: 'Off 요청',
        value: '5일',
        average: '6.5일',
        deltaLabel: '-1.5일',
        directionLabel: '적게 수락',
        barLeft: '29%',
        barWidth: '21%',
        barClass: 'bg-amber-500',
        cellClass: 'bg-amber-50/60',
        textClass: 'text-amber-800',
      },
    ],
  },
]

const fairnessAdjustmentRules: readonly FairnessAdjustmentRule[] = [
  {
    id: 'fairness-adjust-weekend',
    title: '주말·공휴일 과다 배정',
    description: '고소영은 다음 생성에서 주말 배정을 후순위로 둡니다.',
  },
  {
    id: 'fairness-adjust-night',
    title: '야간 근무 균형',
    description: '야간 +1일 이상 직원은 새 야간 배정을 줄입니다.',
  },
  {
    id: 'fairness-adjust-off',
    title: 'Off 요청 보정',
    description: '수락 일수가 낮은 직원의 요청을 우선 검토합니다.',
  },
]
</script>
