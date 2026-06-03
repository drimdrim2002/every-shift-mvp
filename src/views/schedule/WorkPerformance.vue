<template>
  <AppContainer>
    <section class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">
          근무 기록
        </h1>
        <p class="mt-2 text-sm text-slate-500">
          확정된 근무표 기준으로 야간 근무, 휴일 근무, Off 요청 수락 건수를 비교합니다.
        </p>
        <details
          data-test="work-performance-calculation-guide"
          class="group mt-4 rounded-md border border-slate-200 border-l-teal-600 bg-slate-50 px-4 py-3 text-sm text-slate-600"
        >
          <summary class="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 [&::-webkit-details-marker]:hidden">
            <span>계산 기준</span>
            <span
              class="text-base leading-none text-slate-500 transition-transform group-open:rotate-180"
              aria-hidden="true"
            >
              ▾
            </span>
          </summary>
          <dl class="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            <div
              data-test="work-performance-calculation-card-night"
              class="rounded-md border border-slate-200 bg-white/75 p-3"
            >
              <dt class="text-xs font-medium text-slate-500">
                야간 근무 횟수
              </dt>
              <dd class="mt-1 font-semibold text-slate-900">
                N 배정 개수
              </dd>
            </div>
            <div
              data-test="work-performance-calculation-card-holidayWork"
              class="rounded-md border border-slate-200 bg-white/75 p-3"
            >
              <dt class="text-xs font-medium text-slate-500">
                휴일 근무 일수
              </dt>
              <dd class="mt-1 font-semibold text-slate-900">
                주말(금요일 야간, 토요일 전체, 일요일 주간/이브닝) 및 공휴일(당일 주간/이브닝, 전날 야간) 근무 일수입니다. 같은 날짜가 주말과 공휴일에 모두 해당하면 1일로 계산합니다.
              </dd>
            </div>
            <div
              data-test="work-performance-calculation-card-offRequestAccepted"
              class="rounded-md border border-slate-200 bg-white/75 p-3"
            >
              <dt class="text-xs font-medium text-slate-500">
                Off 요청 수락 건수
              </dt>
              <dd class="mt-1 font-semibold text-slate-900">
                수락 처리된 Off 요청 개수 (전날 야간 없음 + 당일 휴무 조건)
              </dd>
            </div>
          </dl>
        </details>
      </div>

      <div class="rounded-lg border border-slate-200 bg-white p-4">
        <div class="grid gap-3 sm:grid-cols-[minmax(20rem,34rem)_auto] sm:items-end">
          <WorkPerformanceMonthRangePicker
            :model-value="draftMonthRange"
            data-test="work-performance-month-range-picker"
            @update:model-value="updateDraftMonthRange"
          />
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
          조회 기간을 확인해 주세요
        </p>
      </div>

      <div
        v-if="loading && hasPreviousResult"
        data-test="work-performance-refreshing"
        aria-live="polite"
        class="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800"
      >
        이전 조회 결과를 표시하는 중입니다. 새 근무 기록을 계산하고 있습니다.
      </div>

      <div
        v-if="missingFinalizedMonths.length > 0"
        data-test="work-performance-missing-months-notice"
        aria-live="polite"
        class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        <p class="font-semibold">
          아래 월은 확정된 근무표가 없어 기록 계산에서 제외되었습니다.
        </p>
        <ul class="mt-3 flex flex-wrap gap-2 font-medium">
          <li
            v-for="month in missingFinalizedMonths"
            :key="month"
            class="rounded-full bg-white px-3 py-1"
          >
            {{ formatMonthLabel(month) }}
          </li>
        </ul>
      </div>

      <div
        v-if="loading && !hasPreviousResult"
        data-test="work-performance-loading"
        aria-live="polite"
        class="rounded-lg border border-slate-200 bg-white px-5 py-12 text-center"
      >
        <n-spin size="medium" />
        <p class="mt-4 text-sm text-slate-500">
          근무 기록을 계산하는 중입니다
        </p>
      </div>

      <div
        v-else-if="loadError"
        data-test="work-performance-error"
        aria-live="assertive"
        role="alert"
        class="rounded-lg border border-red-200 bg-red-50 px-5 py-10 text-center"
      >
        <h2 class="text-xl font-semibold text-red-900">
          근무 기록을 불러오지 못했습니다
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
          기간을 선택한 뒤 조회를 눌러 근무 기록을 확인하세요
        </h2>
        <p class="mt-2 text-sm text-slate-500">
          확정된 근무표가 있는 월만 분석할 수 있습니다.
        </p>
      </div>

      <div
        v-else-if="loadStatus === 'noFinalizedSchedule'"
        data-test="work-performance-state"
        aria-live="polite"
        class="rounded-lg border border-slate-200 bg-slate-50/70 px-5 py-10 text-center"
      >
        <h2 class="text-xl font-semibold text-slate-900">
          선택한 기간에 확정된 근무표가 없습니다
        </h2>
        <p class="mt-2 text-sm text-slate-500">
          조회 기간에 근무표를 생성하고 확정하면 근무 기록을 확인할 수 있습니다.
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
        aria-live="polite"
        class="rounded-lg border border-amber-200 bg-amber-50 px-5 py-10 text-center"
      >
        <h2 class="text-xl font-semibold text-amber-950">
          공휴일 데이터 없음
        </h2>
        <p class="mt-2 text-sm text-amber-800">
          주말·휴일 근무 일수를 비교하려면 선택 연도의 공휴일 데이터가 필요합니다. 공휴일 데이터가 등록되어 있는지 확인해 주세요.
        </p>
      </div>

      <div
        v-else-if="fairnessResult && fairnessResult.rows.length === 0"
        data-test="work-performance-state"
        aria-live="polite"
        class="rounded-lg border border-slate-200 bg-slate-50/70 px-5 py-10 text-center"
      >
        <h2 class="text-xl font-semibold text-slate-900">
          이 기간에 근무한 직원이 없습니다
        </h2>
        <p class="mt-2 text-sm text-slate-500">
          선택 기간에 확정 근무 배정이 있는 직원만 비교 대상에 포함됩니다. 근무 배정이 없는 직원은 제외됩니다.
        </p>
      </div>

      <div
        v-else-if="fairnessResult"
        class="space-y-5"
      >
        <div
          data-test="work-performance-summary"
          class="grid gap-3 md:grid-cols-3"
        >
          <div
            v-for="key in summaryMetricKeys"
            :key="key"
            class="rounded-lg border border-slate-200 bg-white p-4"
          >
            <p class="text-sm font-semibold text-slate-700">
              <span class="inline-flex items-center gap-1.5">
                {{ metricLabels[key] }}
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <span
                      class="inline-flex size-5 cursor-help items-center justify-center rounded-full border border-slate-200 text-xs font-semibold text-slate-500"
                    >
                      ?
                    </span>
                  </template>
                  <div class="max-w-56 whitespace-pre-wrap break-words">
                    {{ getMetricTooltip(key) }}
                  </div>
                </n-tooltip>
              </span>
            </p>
            <p class="mt-2 text-2xl font-bold text-slate-900">
              전체 평균 {{ formatMetricValue(key, fairnessResult.summary[key].average) }}
            </p>
            <p class="mt-1 text-sm text-slate-500">
              {{ formatNumber(fairnessResult.summary[key].min) }}일 ~ {{ formatNumber(fairnessResult.summary[key].max) }}일
            </p>
          </div>
        </div>

        <section
          v-if="showRiskSummary"
          data-test="work-performance-risk-summary"
          class="rounded-lg border border-slate-200 bg-white"
          aria-labelledby="work-performance-risk-summary-title"
        >
          <div class="border-b border-slate-200 px-4 py-3">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2
                  id="work-performance-risk-summary-title"
                  class="text-lg font-semibold text-slate-900"
                >
                  확인 필요 직원 요약
                </h2>
                <p class="mt-1 text-sm text-slate-500">
                  전체 평균과의 차이가 큰 직원부터 표시합니다.
                </p>
              </div>
              <div class="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                <span
                  v-for="key in summaryMetricKeys"
                  :key="key"
                  class="inline-flex items-center gap-1.5"
                >
                  <span
                    class="size-2.5 rounded-full"
                    :class="getRiskSegmentClass(key)"
                    aria-hidden="true"
                  />
                  {{ metricLabels[key] }}
                </span>
              </div>
            </div>
          </div>

          <div class="space-y-3 p-4">
            <div
              v-if="riskSummaryRows.length === 0"
              class="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
            >
              확인할 차이가 없습니다.
            </div>
            <div
              v-for="row in riskSummaryRows"
              :key="row.employeeId"
              :data-test="`work-performance-risk-row-${row.employeeId}`"
              class="grid gap-2 md:grid-cols-[9rem_1fr_6rem] md:items-center"
              :aria-label="`${row.employeeName}, 확인 필요 지수 ${formatNumber(row.priorityScore)}`"
            >
              <span class="truncate text-sm font-semibold text-slate-900">
                {{ row.employeeName }}
              </span>
              <div class="h-3 overflow-hidden rounded-full bg-slate-100">
                <div class="flex h-full">
                  <div
                    v-for="metric in metricKeys"
                    :key="metric"
                    class="h-full"
                    :class="getRiskSegmentClass(metric)"
                    :style="getRiskSegmentStyle(row, metric)"
                    :aria-label="getRiskSegmentLabel(row, metric)"
                  />
                </div>
              </div>
              <span class="text-sm font-semibold text-slate-700 md:text-right">
                확인 필요 지수 {{ formatNumber(row.priorityScore) }}
              </span>
            </div>
          </div>
        </section>

        <div class="rounded-lg border border-slate-200 bg-white">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <h2 class="text-lg font-semibold text-slate-900">
                직원별 근무 기록 비교
              </h2>
              <p class="mt-1 text-sm text-slate-500">
                전체 평균 기준으로 직원별 기록 차이를 비교합니다.
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <button
                type="button"
                data-test="work-performance-sort-priority"
                class="min-h-11 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                :aria-pressed="sortKey === 'priority'"
                @click="changeSort('priority')"
              >
                우선순위순
              </button>
              <label class="flex items-center gap-2 text-sm font-medium text-slate-700">
                <span>강조 기준</span>
                <input
                  :value="thresholdDays"
                  data-test="work-performance-threshold"
                  type="number"
                  min="1"
                  max="10"
                  class="min-h-11 w-20 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm tabular-nums"
                  aria-label="강조 기준 개수"
                  @input="updateThreshold"
                >
                <span>회/건</span>
              </label>
            </div>
          </div>

          <p
            v-if="hasNoOffRequests"
            class="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
          >
            선택 기간에 Off 요청이 없습니다. Off 요청 수락 지표는 0으로 표시됩니다.
          </p>

          <div
            data-test="work-performance-matrix"
            class="overflow-x-auto"
          >
            <div
              class="min-w-[1100px] divide-y divide-slate-100 text-sm"
              role="table"
              aria-label="직원별 근무 기록 비교"
            >
              <p class="sr-only">
                전체 평균과의 차이가 큰 직원부터 표시됩니다
              </p>
              <div
                class="grid grid-cols-[10rem_repeat(3,minmax(12rem,1fr))_6rem] bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"
                role="row"
              >
                <div
                  class="px-4 py-3 text-center"
                  role="columnheader"
                  :aria-sort="getAriaSort('employeeName')"
                  data-test="work-performance-sort-name"
                  @click="changeSort('employeeName')"
                >
                  <button
                    type="button"
                    class="min-h-11 rounded-md bg-transparent px-2 text-center font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    @click.stop="changeSort('employeeName')"
                  >
                    직원
                  </button>
                </div>
                <div
                  class="px-4 py-3 text-center"
                  role="columnheader"
                  :aria-sort="getAriaSort('night')"
                  data-test="work-performance-sort-night"
                  @click="changeSort('night')"
                >
                  <button
                    type="button"
                    class="min-h-11 rounded-md bg-transparent px-2 text-center font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    @click.stop="changeSort('night')"
                  >
                    <span class="inline-flex items-center justify-center gap-1.5">
                      야간 근무 일수
                      <n-tooltip trigger="hover">
                        <template #trigger>
                          <span
                            class="inline-flex size-5 cursor-help items-center justify-center rounded-full border border-slate-200 text-xs font-semibold text-slate-500"
                          >
                            ?
                          </span>
                        </template>
                        <div class="max-w-56 whitespace-pre-wrap break-words">
                          {{ getMetricTooltip('night') }}
                        </div>
                      </n-tooltip>
                    </span>
                  </button>
                </div>
                <div
                  class="px-4 py-3 text-center"
                  role="columnheader"
                  :aria-sort="getAriaSort('holidayWork')"
                  data-test="work-performance-sort-holidayWork"
                  @click="changeSort('holidayWork')"
                >
                  <button
                    type="button"
                    class="min-h-11 rounded-md bg-transparent px-2 text-center font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    @click.stop="changeSort('holidayWork')"
                  >
                    <span class="inline-flex items-center justify-center gap-1.5">
                      휴일 근무 일수
                      <n-tooltip trigger="hover">
                        <template #trigger>
                          <span
                            class="inline-flex size-5 cursor-help items-center justify-center rounded-full border border-slate-200 text-xs font-semibold text-slate-500"
                          >
                            ?
                          </span>
                        </template>
                        <div class="max-w-56 whitespace-pre-wrap break-words">
                          {{ getMetricTooltip('holidayWork') }}
                        </div>
                      </n-tooltip>
                    </span>
                  </button>
                </div>
                <div
                  class="px-4 py-3 text-center"
                  role="columnheader"
                  :aria-sort="getAriaSort('offRequestAccepted')"
                  data-test="work-performance-sort-offRequestAccepted"
                  @click="changeSort('offRequestAccepted')"
                >
                  <button
                    type="button"
                    class="min-h-11 rounded-md bg-transparent px-2 text-center font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    @click.stop="changeSort('offRequestAccepted')"
                  >
                    <span class="inline-flex items-center justify-center gap-1.5">
                      Off 요청 수락 일수
                      <n-tooltip trigger="hover">
                        <template #trigger>
                          <span
                            class="inline-flex size-5 cursor-help items-center justify-center rounded-full border border-slate-200 text-xs font-semibold text-slate-500"
                          >
                            ?
                          </span>
                        </template>
                        <div class="max-w-56 whitespace-pre-wrap break-words">
                          {{ getMetricTooltip('offRequestAccepted') }}
                        </div>
                      </n-tooltip>
                    </span>
                  </button>
                </div>
                <div
                  class="px-4 py-3 text-center"
                  role="columnheader"
                  data-test="work-performance-detail-header"
                >
                  상세
                </div>
              </div>
              <div
                v-for="row in sortedRows"
                :key="row.employeeId"
                data-test="work-performance-employee-row"
                role="rowgroup"
              >
                <div
                  class="grid grid-cols-[10rem_repeat(3,minmax(12rem,1fr))_6rem] items-stretch bg-white"
                  role="row"
                >
                  <div
                    class="flex min-h-[5.5rem] items-center justify-center px-4 py-3 text-center font-semibold text-slate-900"
                    role="rowheader"
                    :aria-label="`${row.employeeName}, 직원 ID ${row.employeeDisplayId}`"
                  >
                    <div class="min-w-0">
                      <span
                        data-test="work-performance-employee-name"
                        class="block truncate"
                        :title="row.employeeName"
                      >
                        {{ row.employeeName }}
                      </span>
                      <span
                        data-test="work-performance-employee-id"
                        class="mt-1 block truncate text-xs font-medium tabular-nums text-slate-500"
                        :title="row.employeeDisplayId"
                      >
                        직원 ID {{ row.employeeDisplayId }}
                      </span>
                    </div>
                  </div>
                  <div
                    v-for="metric in metricKeys"
                    :key="metric"
                    class="min-h-[5.5rem] px-4 py-3 text-center text-slate-700"
                    :class="getMetricCellClass(metric, row.metrics[metric])"
                    :aria-label="getMetricCellLabel(row.metrics[metric])"
                    :data-test="`work-performance-cell-${row.employeeId}-${metric}`"
                    role="cell"
                  >
                    <div class="flex flex-col items-center justify-center gap-1">
                      <div>
                        <p class="font-semibold tabular-nums text-slate-900">
                          {{ formatMetricValue(metric, row.metrics[metric].count) }}
                        </p>
                        <p class="mt-1 text-xs tabular-nums text-slate-500">
                          전체 평균 {{ formatMetricValue(metric, row.metrics[metric].average) }}
                        </p>
                      </div>
                      <span class="text-xs font-semibold tabular-nums text-slate-700">
                        평균과의 차이 {{ formatMetricDelta(metric, row.metrics[metric].delta) }}
                      </span>
                    </div>
                    <div class="mt-3">
                      <div
                        class="relative h-2.5 rounded-full bg-slate-100"
                        aria-hidden="true"
                      >
                        <span class="absolute left-1/2 top-[-0.1875rem] h-4 w-px bg-slate-400" />
                        <span
                          class="absolute top-0 h-2.5 rounded-full"
                          :class="getMetricBarClass(metric, row.metrics[metric])"
                          :style="getMetricBarStyle(metric, row.metrics[metric])"
                        />
                      </div>
                    </div>
                    <div class="mt-2 flex min-h-6 items-center justify-center gap-2">
                      <span
                        class="text-xs font-medium"
                        :class="getMetricDirectionTextClass(metric, row.metrics[metric])"
                      >
                        {{ getMetricDirectionLabel(metric, row.metrics[metric]) }}
                      </span>
                      <span
                        v-if="row.metrics[metric].highlighted"
                        class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900"
                      >
                        강조
                      </span>
                      <span
                        v-if="row.metrics[metric].highlighted"
                        data-test="work-performance-emphasis-label"
                        class="sr-only"
                      >
                        {{ getHighlightDescription(row.metrics[metric]) }}
                      </span>
                    </div>
                  </div>
                  <div
                    class="flex min-h-[5.5rem] items-center justify-center px-4 py-3 text-center"
                    role="cell"
                  >
                    <button
                      type="button"
                      class="min-h-11 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      :aria-expanded="isDetailExpanded(row.employeeId)"
                      :aria-controls="getDetailId(row.employeeId)"
                      :data-test="`work-performance-detail-${row.employeeId}`"
                      @click="toggleDetail(row.employeeId)"
                    >
                      상세 보기
                    </button>
                  </div>
                </div>
                <div
                  v-if="isDetailExpanded(row.employeeId)"
                  :id="getDetailId(row.employeeId)"
                  :data-test="`work-performance-detail-row-${row.employeeId}`"
                  class="bg-slate-50 p-4"
                >
                  <div class="grid gap-3 md:grid-cols-3">
                    <section
                      v-for="definition in fairnessResult.metricDefinitions"
                      :key="definition.key"
                      class="rounded-md border border-slate-200 bg-white p-3"
                    >
                      <h3 class="text-sm font-semibold text-slate-900">
                        {{ definition.label }}
                      </h3>
                      <ul class="mt-2 flex flex-wrap gap-2 text-sm text-slate-600">
                        <li
                          v-for="date in row.metrics[definition.key].evidenceDates"
                          :key="date"
                          class="rounded-full bg-slate-100 px-2.5 py-1"
                        >
                          {{ formatKoreanMonthDay(date) }}
                          <span
                            v-if="getShiftCode(row.employeeId, date)"
                            class="ml-0.5 font-medium text-slate-500"
                          >
                            ({{ getShiftCode(row.employeeId, date) }})
                          </span>
                          <span
                            v-if="isPublicHoliday(date)"
                            class="ml-1 text-xs font-semibold text-red-700"
                          >
                            공휴일
                          </span>
                        </li>
                        <li
                          v-if="row.metrics[definition.key].evidenceDates.length === 0"
                          class="text-slate-500"
                        >
                          해당 날짜 없음
                        </li>
                      </ul>
                    </section>
                  </div>
                </div>
              </div>
            </div>
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
  </AppContainer>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NSpin, NTooltip } from 'naive-ui'
import AppContainer from '@/components/layout/AppContainer.vue'
import {
  loadLatestFinalizedWorkPerformanceMonth,
  loadWorkPerformancePeriod,
  type WorkPerformanceLoadResult,
  type WorkPerformanceLoadSuccess,
} from '@/api/workPerformance'
import {
  clampWorkPerformanceThresholdDays,
  computeWorkPerformanceFairness,
  formatKoreanMonthDay,
} from '@/utils/workPerformanceFairness'
import WorkPerformanceMonthRangePicker from '@/components/schedule/WorkPerformanceMonthRangePicker.vue'
import { useOrganizationStore } from '@/stores/organization'
import { getScheduleResultsRoutePath, getScheduleStepRoutePath } from '@/constants/routes'
import type {
  WorkPerformanceFairnessResult,
  WorkPerformanceEmployeeResult,
  WorkPerformanceMetricKey,
  WorkPerformanceMetricResult,
} from '@/types/workPerformance'

interface WorkPerformanceQuery {
  year: number
  startMonth: number
  endMonth: number
}

type WorkPerformanceSortKey = 'priority' | 'employeeName' | WorkPerformanceMetricKey
type SortDirection = 'ascending' | 'descending'
type MonthRangeValue = [string, string]

const router = useRouter()
const orgStore = useOrganizationStore()

const currentDate = new Date()
const metricKeys: WorkPerformanceMetricKey[] = ['night', 'holidayWork', 'offRequestAccepted']
const summaryMetricKeys: readonly WorkPerformanceMetricKey[] = ['night', 'holidayWork', 'offRequestAccepted']
const showRiskSummary = false
const metricLabels: Record<WorkPerformanceMetricKey, string> = {
  night: '야간 근무 횟수',
  weekend: '주말 근무 횟수',
  holiday: '공휴일 근무 횟수',
  holidayWork: '휴일 근무 일수',
  offRequestAccepted: 'Off 요청 수락 건수',
}
const metricUnits: Record<WorkPerformanceMetricKey, string> = {
  night: '회',
  weekend: '회',
  holiday: '회',
  holidayWork: '일',
  offRequestAccepted: '건',
}
const metricTooltips: Record<WorkPerformanceMetricKey, string> = {
  night: '근무표의 N 배정 개수입니다.',
  weekend: '금요일 야간·토요일·일요일 주간/이브닝 근무 개수입니다.',
  holiday: '공휴일 당일 주간/이브닝 및 공휴일 전날 야간 근무 개수입니다.',
  holidayWork: '주말·공휴일 근무 일수입니다. 같은 날짜가 주말과 공휴일에 모두 해당하면 1일로 계산합니다.',
  offRequestAccepted: 'Off 요청이 수락된 건수입니다.',
}

const draftMonthRange = ref<MonthRangeValue>([
  formatYearMonth(currentDate.getFullYear(), 1),
  formatYearMonth(currentDate.getFullYear(), currentDate.getMonth() + 1),
])
const thresholdDays = ref(3)
const loading = ref(false)
const hasQueried = ref(false)
const loadError = ref(false)
const loadResult = ref<WorkPerformanceLoadResult | null>(null)
const sortKey = ref<WorkPerformanceSortKey>('priority')
const sortDirection = ref<SortDirection>('descending')
const expandedEmployeeId = ref<string | null>(null)
const draftPeriodTouched = ref(false)
let organizationLoadPromise: Promise<void> | null = null

const draftQuery = computed<WorkPerformanceQuery | null>(() =>
  parseWorkPerformanceMonthRange(draftMonthRange.value),
)
const isInvalidRange = computed(() => draftQuery.value === null)
const hasPreviousResult = computed(() => Boolean(loadResult.value))
const loadStatus = computed(() => loadResult.value?.status ?? null)
const successResult = computed<WorkPerformanceLoadSuccess | null>(() =>
  loadResult.value?.status === 'success' ? loadResult.value : null,
)
const missingFinalizedMonths = computed(() =>
  successResult.value?.missingMonths ?? [],
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
const publicHolidayDateSet = computed(() => new Set(successResult.value?.publicHolidayDates ?? []))
const calculatedRowOrder = computed(() => {
  const order = new Map<string, number>()

  fairnessResult.value?.rows.forEach((row, index) => {
    order.set(row.employeeId, index)
  })

  return order
})
const sortedRows = computed(() => {
  if (!fairnessResult.value) {
    return []
  }

  return [...fairnessResult.value.rows].sort(compareWorkPerformanceRows)
})
const riskSummaryRows = computed(() => {
  if (!fairnessResult.value) {
    return []
  }

  return [...fairnessResult.value.rows]
    .filter((row) => row.priorityScore > 0)
    .sort((left, right) =>
      right.priorityScore - left.priorityScore ||
      left.employeeName.localeCompare(right.employeeName, 'ko') ||
      left.employeeId.localeCompare(right.employeeId),
    )
    .slice(0, 5)
})
const maxRiskScore = computed(() =>
  Math.max(...riskSummaryRows.value.map((row) => row.priorityScore), 0),
)
const metricDeltaScale = computed<Record<string, number>>(() => ({
  night: getMaxDeviation('night'),
  holidayWork: getMaxDeviation('holidayWork'),
  offRequestAccepted: getMaxDeviation('offRequestAccepted'),
}))

const employeeDateShiftMap = computed(() => {
  const map = new Map<string, string>()
  if (!successResult.value) {
    return map
  }

  successResult.value.assignments.forEach((assignment) => {
    if (assignment.shiftCode) {
      map.set(`${assignment.employeeId}-${assignment.date}`, assignment.shiftCode)
    }
  })

  return map
})

function getShiftCode(employeeId: string, date: string): string {
  return employeeDateShiftMap.value.get(`${employeeId}-${date}`) ?? ''
}

onMounted(() => {
  void initializeDefaultPeriod()
})

function markDraftPeriodTouched() {
  draftPeriodTouched.value = true
}

function updateDraftMonthRange(value: MonthRangeValue) {
  const monthRangeChanged =
    value[0] !== draftMonthRange.value[0] || value[1] !== draftMonthRange.value[1]

  draftMonthRange.value = value
  markDraftPeriodTouched()

  if (monthRangeChanged) {
    clearDisplayedPerformanceState()
  }
}

function clearDisplayedPerformanceState() {
  loadResult.value = null
  loadError.value = false
  hasQueried.value = false
  expandedEmployeeId.value = null
}

function formatYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function parseWorkPerformanceMonthRange(value: MonthRangeValue): WorkPerformanceQuery | null {
  const start = parseYearMonth(value[0])
  const end = parseYearMonth(value[1])

  if (
    !start ||
    !end ||
    start.year !== end.year ||
    start.year < 2000 ||
    end.year > 2100 ||
    start.month > end.month
  ) {
    return null
  }

  return {
    year: start.year,
    startMonth: start.month,
    endMonth: end.month,
  }
}

function parseYearMonth(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value)

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null
  }

  return { year, month }
}

async function getOrganizationIdForWorkPerformance(): Promise<string> {
  if (!orgStore.current?.id) {
    if (typeof orgStore.loadOrganization !== 'function') {
      throw new Error('organization_not_found')
    }

    if (!organizationLoadPromise) {
      organizationLoadPromise = Promise.resolve(orgStore.loadOrganization())
        .then(() => undefined)
        .finally(() => {
          organizationLoadPromise = null
        })
    }

    await organizationLoadPromise
  }

  const organizationId = orgStore.current?.id

  if (!organizationId) {
    throw new Error('organization_not_found')
  }

  return organizationId
}

async function initializeDefaultPeriod() {
  try {
    const organizationId = await getOrganizationIdForWorkPerformance()
    const latestFinalizedMonth = await loadLatestFinalizedWorkPerformanceMonth(organizationId)

    if (!latestFinalizedMonth) {
      if (!draftPeriodTouched.value && !hasQueried.value) {
        loadResult.value = { status: 'noFinalizedSchedule' }
        hasQueried.value = true
      }
      return
    }

    if (draftPeriodTouched.value || hasQueried.value) {
      return
    }

    draftMonthRange.value = [
      formatYearMonth(latestFinalizedMonth.year, 1),
      formatYearMonth(latestFinalizedMonth.year, latestFinalizedMonth.month),
    ]
  } catch (error) {
    console.warn('최근 확정 근무표 조회 실패:', error)
  }
}

async function loadPerformance() {
  const query = draftQuery.value

  if (!query || loading.value) {
    return
  }

  loading.value = true
  hasQueried.value = true
  loadError.value = false

  try {
    const organizationId = await getOrganizationIdForWorkPerformance()
    const nextLoadResult = await loadWorkPerformancePeriod({
      organizationId,
      ...query,
    })

    if (!isCurrentDraftQuery(query)) {
      return
    }

    loadResult.value = nextLoadResult
    hasQueried.value = true
  } catch (error) {
    if (!isCurrentDraftQuery(query)) {
      return
    }

    console.warn('근무 기록 로드 실패:', error)
    loadResult.value = null
    loadError.value = true
    hasQueried.value = true
  } finally {
    loading.value = false
  }
}

function isCurrentDraftQuery(query: WorkPerformanceQuery): boolean {
  const currentQuery = draftQuery.value

  return Boolean(
    currentQuery &&
      currentQuery.year === query.year &&
      currentQuery.startMonth === query.startMonth &&
      currentQuery.endMonth === query.endMonth,
  )
}

function updateThreshold(event: Event) {
  const target = event.target as HTMLInputElement
  const clampedThreshold = clampWorkPerformanceThresholdDays(Number(target.value))

  thresholdDays.value = clampedThreshold
  target.value = String(clampedThreshold)
}

function getDefaultSortDirection(key: WorkPerformanceSortKey): SortDirection {
  if (key === 'employeeName' || key === 'offRequestAccepted') {
    return 'ascending'
  }

  return 'descending'
}

function changeSort(key: WorkPerformanceSortKey) {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'ascending' ? 'descending' : 'ascending'
    return
  }

  sortKey.value = key
  sortDirection.value = getDefaultSortDirection(key)
}

function getAriaSort(key: WorkPerformanceSortKey): 'ascending' | 'descending' | 'none' {
  return sortKey.value === key ? sortDirection.value : 'none'
}

function compareWorkPerformanceRows(
  left: WorkPerformanceEmployeeResult,
  right: WorkPerformanceEmployeeResult,
): number {
  const directionMultiplier = sortDirection.value === 'ascending' ? 1 : -1
  let result = 0

  if (sortKey.value === 'employeeName') {
    result = left.employeeName.localeCompare(right.employeeName, 'ko') ||
      left.employeeDisplayId.localeCompare(right.employeeDisplayId, 'ko') ||
      left.employeeId.localeCompare(right.employeeId)
  } else if (sortKey.value === 'priority') {
    result = left.priorityScore - right.priorityScore

    if (result === 0) {
      return getCalculatedRowIndex(left.employeeId) - getCalculatedRowIndex(right.employeeId)
    }
  } else {
    result = left.metrics[sortKey.value].count - right.metrics[sortKey.value].count
  }

  if (result !== 0) {
    return result * directionMultiplier
  }

  return left.employeeName.localeCompare(right.employeeName, 'ko') ||
    left.employeeDisplayId.localeCompare(right.employeeDisplayId, 'ko') ||
    left.employeeId.localeCompare(right.employeeId)
}

function getCalculatedRowIndex(employeeId: string): number {
  return calculatedRowOrder.value.get(employeeId) ?? Number.MAX_SAFE_INTEGER
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function formatDelta(value: number): string {
  if (Object.is(value, -0)) {
    return '0'
  }

  return value > 0 ? `+${formatNumber(value)}` : formatNumber(value)
}

function formatMetricValue(metric: WorkPerformanceMetricKey, value: number): string {
  return `${formatNumber(value)}${metricUnits[metric]}`
}

function formatMetricDelta(metric: WorkPerformanceMetricKey, value: number): string {
  return `${formatDelta(value)}${metricUnits[metric]}`
}

function getMetricTooltip(metric: WorkPerformanceMetricKey): string {
  return metricTooltips[metric]
}

function formatMonthLabel(month: string): string {
  const [year, monthValue] = month.split('-')

  return `${year}년 ${Number(monthValue)}월`
}

function getMaxDeviation(metric: WorkPerformanceMetricKey): number {
  if (!fairnessResult.value) {
    return 0
  }

  return Math.max(...fairnessResult.value.rows.map((row) => Math.abs(row.metrics[metric].delta)), 0)
}

function getUnfavorableDeviation(
  metricKey: WorkPerformanceMetricKey,
  metric: WorkPerformanceMetricResult,
): number {
  if (metricKey === 'offRequestAccepted') {
    return Math.max(0, metric.average - metric.count)
  }

  return Math.max(0, metric.count - metric.average)
}

function isUnfavorableMetricDeviation(
  metricKey: WorkPerformanceMetricKey,
  metric: WorkPerformanceMetricResult,
): boolean {
  return getUnfavorableDeviation(metricKey, metric) > 0
}

function getRiskSegmentClass(metric: WorkPerformanceMetricKey): string {
  if (metric === 'night') {
    return 'bg-blue-500'
  }

  if (metric === 'weekend') {
    return 'bg-amber-500'
  }

  if (metric === 'holiday') {
    return 'bg-orange-500'
  }

  if (metric === 'holidayWork') {
    return 'bg-purple-500'
  }

  return 'bg-teal-500'
}

function getRiskSegmentStyle(
  row: WorkPerformanceEmployeeResult,
  metric: WorkPerformanceMetricKey,
): Record<string, string> {
  const maxScore = maxRiskScore.value
  const unfavorableDeviation = getUnfavorableDeviation(metric, row.metrics[metric])

  if (maxScore <= 0 || unfavorableDeviation <= 0) {
    return { width: '0%' }
  }

  return { width: `${Math.min(100, (unfavorableDeviation / maxScore) * 100)}%` }
}

function getRiskSegmentLabel(
  row: WorkPerformanceEmployeeResult,
  metric: WorkPerformanceMetricKey,
): string {
  return `${metricLabels[metric]} 확인 필요 차이 ${formatMetricValue(metric, getUnfavorableDeviation(metric, row.metrics[metric]))}`
}

function getMetricCellClass(
  metricKey: WorkPerformanceMetricKey,
  metric: WorkPerformanceMetricResult,
): string {
  if (metric.highlighted) {
    return 'bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200'
  }

  if (isUnfavorableMetricDeviation(metricKey, metric)) {
    return 'bg-amber-50/50'
  }

  if (metric.delta !== 0) {
    return 'bg-teal-50/40'
  }

  return ''
}

function getMetricBarClass(
  metricKey: WorkPerformanceMetricKey,
  metric: WorkPerformanceMetricResult,
): string {
  if (isUnfavorableMetricDeviation(metricKey, metric)) {
    return 'left-1/2 bg-amber-500'
  }

  if (metric.delta !== 0) {
    return 'right-1/2 bg-teal-500'
  }

  return 'left-1/2 bg-transparent'
}

function getMetricBarStyle(
  metricKey: WorkPerformanceMetricKey,
  metric: WorkPerformanceMetricResult,
): Record<string, string> {
  const scale = metricDeltaScale.value[metricKey]

  if (!scale || scale <= 0 || metric.delta === 0) {
    return { width: '0%' }
  }

  const width = Math.min(50, Math.max(4, (Math.abs(metric.delta) / scale) * 50))

  return { width: `${width}%` }
}

function getMetricDirectionLabel(
  metricKey: WorkPerformanceMetricKey,
  metric: WorkPerformanceMetricResult,
): string {
  if (metric.delta === 0) {
    return '전체 평균과 동일'
  }

  if (metricKey === 'offRequestAccepted') {
    return metric.delta > 0 ? '많이 수락' : '적게 수락'
  }

  return metric.delta > 0 ? '많이 근무' : '적게 근무'
}

function getMetricDirectionTextClass(
  metricKey: WorkPerformanceMetricKey,
  metric: WorkPerformanceMetricResult,
): string {
  if (isUnfavorableMetricDeviation(metricKey, metric)) {
    return 'text-amber-800'
  }

  if (metric.delta !== 0) {
    return 'text-teal-700'
  }

  return 'text-slate-500'
}

function getMetricCellLabel(metric: WorkPerformanceMetricResult): string {
  const emphasisLabel = metric.highlighted ? `, ${getHighlightDescription(metric)}` : ''

  return `${formatMetricValue(metric.key, metric.count)}, 전체 평균 ${formatMetricValue(metric.key, metric.average)}, 평균과의 차이 ${formatMetricDelta(metric.key, metric.delta)}${emphasisLabel}`
}

function getHighlightDescription(metric: WorkPerformanceMetricResult): string {
  const absoluteDelta = Math.abs(metric.delta)
  const directionLabel = metric.delta >= 0 ? '많음' : '적음'

  return `강조, 전체 평균보다 ${formatMetricValue(metric.key, absoluteDelta)} ${directionLabel}`
}

function isDetailExpanded(employeeId: string): boolean {
  return expandedEmployeeId.value === employeeId
}

function getDetailId(employeeId: string): string {
  return `work-performance-detail-${employeeId}`
}

function toggleDetail(employeeId: string) {
  expandedEmployeeId.value = isDetailExpanded(employeeId) ? null : employeeId
}

function isPublicHoliday(date: string): boolean {
  return publicHolidayDateSet.value.has(date)
}

function goToScheduleResults() {
  void router.push(getScheduleResultsRoutePath())
}

function goToCreateSchedule() {
  void router.push(getScheduleStepRoutePath(1))
}
</script>
