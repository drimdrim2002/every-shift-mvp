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
        <p class="mt-2 text-sm text-slate-500">
          확정된 근무표 기준으로 야간, 주말·휴일, Off 요청 수락 편차를 확인합니다.
        </p>
      </div>

      <div class="rounded-lg border border-slate-200 bg-white p-4">
        <div class="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <label class="space-y-1 text-sm font-medium text-slate-700">
            <span>연도</span>
            <input
              v-model.number="draftYear"
              data-test="work-performance-year"
              type="number"
              min="2000"
              max="2100"
              class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              aria-label="조회 연도"
            >
          </label>
          <label class="space-y-1 text-sm font-medium text-slate-700">
            <span>시작 월</span>
            <select
              v-model.number="draftStartMonth"
              data-test="work-performance-start-month"
              class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              aria-label="시작 월"
            >
              <option
                v-for="month in monthOptions"
                :key="month"
                :value="month"
              >
                {{ month }}월
              </option>
            </select>
          </label>
          <label class="space-y-1 text-sm font-medium text-slate-700">
            <span>종료 월</span>
            <select
              v-model.number="draftEndMonth"
              data-test="work-performance-end-month"
              class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              aria-label="종료 월"
            >
              <option
                v-for="month in monthOptions"
                :key="month"
                :value="month"
              >
                {{ month }}월
              </option>
            </select>
          </label>
          <n-button
            data-test="work-performance-query"
            type="primary"
            size="large"
            :loading="loading"
            :disabled="isInvalidRange"
            @click="loadPerformance"
          >
            조회
          </n-button>
        </div>
        <p
          v-if="isInvalidRange"
          data-test="work-performance-range-error"
          class="mt-3 text-sm font-medium text-red-600"
        >
          시작 월은 종료 월보다 늦을 수 없습니다
        </p>
      </div>

      <div
        v-if="loading && hasPreviousResult"
        data-test="work-performance-refreshing"
        class="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800"
      >
        이전 조회 결과를 표시하는 중입니다. 새 근무 실적을 계산하고 있습니다.
      </div>

      <div
        v-if="loading && !hasPreviousResult"
        data-test="work-performance-loading"
        class="rounded-lg border border-slate-200 bg-white px-5 py-12 text-center"
      >
        <n-spin size="medium" />
        <p class="mt-4 text-sm text-slate-500">
          근무 실적을 계산하는 중입니다
        </p>
      </div>

      <div
        v-else-if="loadError"
        data-test="work-performance-error"
        class="rounded-lg border border-red-200 bg-red-50 px-5 py-10 text-center"
      >
        <h2 class="text-xl font-semibold text-red-900">
          근무 실적을 불러오지 못했습니다
        </h2>
        <p class="mt-2 text-sm text-red-700">
          잠시 후 다시 시도해 주세요.
        </p>
        <n-button
          data-test="work-performance-retry"
          class="mt-6"
          type="primary"
          size="large"
          @click="loadPerformance"
        >
          다시 시도
        </n-button>
      </div>

      <div
        v-else-if="!hasQueried"
        data-test="work-performance-initial"
        class="rounded-lg border border-slate-200 bg-slate-50/70 px-5 py-10 text-center"
      >
        <h2 class="text-xl font-semibold text-slate-900">
          기간을 선택한 뒤 조회를 눌러 근무 실적을 확인하세요
        </h2>
        <p class="mt-2 text-sm text-slate-500">
          확정된 근무표가 있는 월만 분석할 수 있습니다.
        </p>
      </div>

      <div
        v-else-if="loadStatus === 'missingFinalizedMonth'"
        data-test="work-performance-state"
        class="rounded-lg border border-amber-200 bg-amber-50 px-5 py-10"
      >
        <h2 class="text-xl font-semibold text-amber-950">
          선택한 기간에 아직 확정되지 않은 월이 있습니다
        </h2>
        <p class="mt-2 text-sm text-amber-800">
          모든 선택 월의 근무표를 확정한 뒤 다시 조회해 주세요.
        </p>
        <ul class="mt-4 flex flex-wrap gap-2 text-sm font-medium text-amber-900">
          <li
            v-for="month in missingFinalizedMonths"
            :key="month"
            class="rounded-full bg-white px-3 py-1"
          >
            {{ formatMonthLabel(month) }}
          </li>
        </ul>
        <n-button
          data-test="work-performance-results"
          class="mt-6"
          secondary
          @click="goToScheduleResults"
        >
          생성된 근무표 보기
        </n-button>
      </div>

      <div
        v-else-if="loadStatus === 'noFinalizedSchedule'"
        data-test="work-performance-state"
        class="rounded-lg border border-slate-200 bg-slate-50/70 px-5 py-10 text-center"
      >
        <h2 class="text-xl font-semibold text-slate-900">
          아직 확정된 근무표가 없습니다
        </h2>
        <p class="mt-2 text-sm text-slate-500">
          근무표를 생성하고 확정하면 근무 실적을 확인할 수 있습니다.
        </p>
        <div class="mt-6 flex flex-wrap justify-center gap-3">
          <n-button
            data-test="work-performance-results"
            secondary
            @click="goToScheduleResults"
          >
            생성된 근무표 보기
          </n-button>
          <n-button
            data-test="work-performance-create"
            type="primary"
            @click="goToCreateSchedule"
          >
            새 근무표 생성
          </n-button>
        </div>
      </div>

      <div
        v-else-if="loadStatus === 'missingHolidayCoverage'"
        data-test="work-performance-state"
        class="rounded-lg border border-amber-200 bg-amber-50 px-5 py-10 text-center"
      >
        <h2 class="text-xl font-semibold text-amber-950">
          공휴일 데이터 없음
        </h2>
        <p class="mt-2 text-sm text-amber-800">
          주말·휴일 근무 편차를 계산하려면 선택 연도의 공휴일 데이터가 필요합니다. 공휴일 데이터가 등록되어 있는지 확인해 주세요.
        </p>
      </div>

      <div
        v-else-if="fairnessResult && fairnessResult.rows.length === 0"
        data-test="work-performance-state"
        class="rounded-lg border border-slate-200 bg-slate-50/70 px-5 py-10 text-center"
      >
        <h2 class="text-xl font-semibold text-slate-900">
          이 기간 전체를 근무한 직원이 없습니다
        </h2>
        <p class="mt-2 text-sm text-slate-500">
          선택 기간 전체에 배정 기록이 있는 직원만 비교 대상에 포함됩니다. 입퇴사나 누락 배정이 있는 직원은 제외됩니다.
        </p>
      </div>

      <div
        v-else-if="fairnessResult"
        class="space-y-5"
      >
        <div class="rounded-lg border border-slate-200 bg-white">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <h2 class="text-lg font-semibold text-slate-900">
                직원별 근무 실적 비교
              </h2>
              <p class="mt-1 text-sm text-slate-500">
                평균보다 불리한 편차가 큰 직원이 먼저 표시됩니다.
              </p>
            </div>
            <label class="flex items-center gap-2 text-sm font-medium text-slate-700">
              <span>강조 기준</span>
              <input
                :value="thresholdDays"
                data-test="work-performance-threshold"
                type="number"
                min="1"
                max="10"
                class="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                aria-label="강조 기준 일수"
                @input="updateThreshold"
              >
              <span>일</span>
            </label>
          </div>

          <p
            v-if="hasNoOffRequests"
            class="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
          >
            선택 기간에 Off 요청이 없습니다. Off 요청 수락 지표는 0으로 표시됩니다.
          </p>

          <div class="overflow-x-auto">
            <table
              data-test="work-performance-table"
              class="min-w-full divide-y divide-slate-200 text-sm"
            >
              <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th class="px-4 py-3">
                    직원
                  </th>
                  <th class="px-4 py-3">
                    야간 근무
                  </th>
                  <th class="px-4 py-3">
                    주말·휴일 근무
                  </th>
                  <th class="px-4 py-3">
                    Off 요청 수락
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white">
                <tr
                  v-for="row in fairnessResult.rows"
                  :key="row.employeeId"
                >
                  <td class="px-4 py-3 font-semibold text-slate-900">
                    {{ row.employeeName }}
                  </td>
                  <td
                    v-for="metric in metricKeys"
                    :key="metric"
                    class="px-4 py-3 text-slate-700"
                    :class="row.metrics[metric].highlighted ? 'bg-red-50 text-red-800' : ''"
                  >
                    {{ row.metrics[metric].count }}일
                    <span class="ml-1 text-xs text-slate-500">
                      평균 {{ formatNumber(row.metrics[metric].average) }}일
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div
          data-test="work-performance-summary"
          class="grid gap-3 md:grid-cols-3"
        >
          <div
            v-for="definition in fairnessResult.metricDefinitions"
            :key="definition.key"
            class="rounded-lg border border-slate-200 bg-white p-4"
          >
            <p class="text-sm font-semibold text-slate-700">
              {{ definition.label }}
            </p>
            <p class="mt-2 text-2xl font-bold text-slate-900">
              평균 {{ formatNumber(fairnessResult.summary[definition.key].average) }}일
            </p>
            <p class="mt-1 text-sm text-slate-500">
              최소 {{ fairnessResult.summary[definition.key].min }}일 · 최대 {{ fairnessResult.summary[definition.key].max }}일
            </p>
          </div>
        </div>

        <p
          v-if="fairnessResult.excludedEmployeeCount > 0"
          class="text-sm text-slate-500"
        >
          선택 기간 전체 배정 기록이 없어 제외된 직원 {{ fairnessResult.excludedEmployeeCount }}명
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NSpin } from 'naive-ui'
import {
  loadWorkPerformancePeriod,
  type WorkPerformanceLoadResult,
  type WorkPerformanceLoadSuccess,
} from '@/api/workPerformance'
import {
  clampWorkPerformanceThresholdDays,
  computeWorkPerformanceFairness,
} from '@/utils/workPerformanceFairness'
import { useOrganizationStore } from '@/stores/organization'
import { getScheduleResultsRoutePath, getScheduleStepRoutePath } from '@/constants/routes'
import type { WorkPerformanceFairnessResult, WorkPerformanceMetricKey } from '@/types/workPerformance'

const router = useRouter()
const orgStore = useOrganizationStore()

const currentDate = new Date()
const monthOptions = Array.from({ length: 12 }, (_value, index) => index + 1)
const metricKeys: WorkPerformanceMetricKey[] = ['night', 'weekendHoliday', 'offRequestAccepted']

const draftYear = ref(currentDate.getFullYear())
const draftStartMonth = ref(currentDate.getMonth() + 1)
const draftEndMonth = ref(currentDate.getMonth() + 1)
const thresholdDays = ref(2)
const loading = ref(false)
const hasQueried = ref(false)
const loadError = ref(false)
const loadResult = ref<WorkPerformanceLoadResult | null>(null)

const isInvalidRange = computed(() => draftStartMonth.value > draftEndMonth.value)
const hasPreviousResult = computed(() => Boolean(loadResult.value))
const loadStatus = computed(() => loadResult.value?.status ?? null)
const missingFinalizedMonths = computed(() =>
  loadResult.value?.status === 'missingFinalizedMonth' ? loadResult.value.missingMonths : [],
)
const successResult = computed<WorkPerformanceLoadSuccess | null>(() =>
  loadResult.value?.status === 'success' ? loadResult.value : null,
)
const fairnessResult = computed<WorkPerformanceFairnessResult | null>(() => {
  if (!successResult.value) {
    return null
  }

  return computeWorkPerformanceFairness({
    period: successResult.value.period,
    employees: successResult.value.employees,
    assignments: successResult.value.assignments,
    offRequests: successResult.value.offRequests,
    publicHolidayDates: successResult.value.publicHolidayDates,
    highlightThresholdDays: thresholdDays.value,
  })
})
const hasNoOffRequests = computed(() => successResult.value?.offRequests.length === 0)

async function loadPerformance() {
  if (isInvalidRange.value || loading.value) {
    return
  }

  loading.value = true
  hasQueried.value = true
  loadError.value = false

  try {
    if (!orgStore.current?.id && typeof orgStore.loadOrganization === 'function') {
      await orgStore.loadOrganization()
    }

    const organizationId = orgStore.current?.id

    if (!organizationId) {
      throw new Error('organization_not_found')
    }

    loadResult.value = await loadWorkPerformancePeriod({
      organizationId,
      year: draftYear.value,
      startMonth: draftStartMonth.value,
      endMonth: draftEndMonth.value,
    })
  } catch (error) {
    console.warn('근무 실적 로드 실패:', error)
    loadResult.value = null
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function updateThreshold(event: Event) {
  const target = event.target as HTMLInputElement
  thresholdDays.value = clampWorkPerformanceThresholdDays(Number(target.value))
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function formatMonthLabel(month: string): string {
  const [year, monthValue] = month.split('-')

  return `${year}년 ${Number(monthValue)}월`
}

function goToScheduleResults() {
  void router.push(getScheduleResultsRoutePath())
}

function goToCreateSchedule() {
  void router.push(getScheduleStepRoutePath(1))
}
</script>
