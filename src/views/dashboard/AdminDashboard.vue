<template>
  <div class="mx-auto max-w-7xl space-y-6 px-4 pb-8">
    <div
      v-if="showOnboardingBanner"
      class="rounded-3xl border border-sky-200 bg-sky-50 px-5 py-4"
    >
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-sm font-semibold text-sky-700">
            3단계: 첫 스케줄 요청 시작
          </p>
          <p class="mt-1 text-sm leading-6 text-sky-900/80">
            계획월을 선택하면 첫 스케줄 생성 흐름으로 이동합니다. 작업을 마친 뒤에는 온보딩으로 돌아와 완료 상태를 확인하세요.
          </p>
        </div>
        <n-button
          secondary
          @click="handleReturnToOnboarding"
        >
          온보딩으로 돌아가기
        </n-button>
      </div>
    </div>

    <section class="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
      <n-card
        :bordered="false"
        class="rounded-3xl border border-slate-200 bg-white shadow-sm"
      >
        <div class="space-y-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              Admin Dashboard
            </span>
            <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {{ accessScopeLabel }}
            </span>
            <n-tag
              round
              size="small"
              type="info"
            >
              {{ groupingTagLabel }}
            </n-tag>
          </div>
          <div>
            <h1 class="text-3xl font-semibold tracking-tight text-slate-900">
              관리자 대시보드
            </h1>
            <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              공정성 지표를 `직원` 또는 `사이트` 기준으로 비교하고, 같은 화면 안에서 월별 근무표 생성과 운영 상태를 확인합니다.
            </p>
          </div>
        </div>
      </n-card>

      <section class="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700 shadow-sm">
        <div>
          <p class="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            현재 조직
          </p>
          <p class="mt-1 font-semibold text-slate-900">
            {{ currentOrganizationLabel }}
          </p>
        </div>
        <div>
          <p class="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            비교 기준
          </p>
          <p class="mt-1 font-semibold text-slate-900">
            {{ groupingSummaryLabel }}
          </p>
        </div>
        <div>
          <p class="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            마지막 갱신
          </p>
          <p class="mt-1 font-semibold text-slate-900">
            {{ lastFetchedLabel }}
          </p>
        </div>
        <div>
          <p class="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            근무표 운영 상태
          </p>
          <p class="mt-1 font-semibold text-slate-900">
            {{ scheduleOperationSummary }}
          </p>
        </div>
      </section>
    </section>

    <n-card class="rounded-3xl">
      <template #header>
        <div class="space-y-1">
          <h2 class="text-xl font-semibold text-slate-900">
            대시보드 필터
          </h2>
          <p class="text-sm text-slate-500">
            조직 범위, 기준 월, 사이트, 비교 단위를 조정해 공정성 지표를 다시 계산합니다.
          </p>
        </div>
      </template>

      <div class="grid gap-4 xl:grid-cols-[repeat(3,minmax(0,1fr))_auto] xl:items-end">
        <label
          v-if="isSuperAdmin"
          class="space-y-2"
        >
          <span class="text-sm font-medium text-slate-700">조직 선택</span>
          <n-select
            :value="selectedOrganizationId"
            :options="organizationOptions"
            placeholder="대상 조직을 선택하세요"
            clearable
            :loading="organizationOptionsLoading"
            @update:value="handleOrganizationScopeChange"
          />
        </label>

        <label class="space-y-2">
          <span class="text-sm font-medium text-slate-700">기준 월</span>
          <n-select
            :value="adminDashboardStore.filters.periodMonth"
            :options="periodMonthOptions"
            placeholder="조회 월을 선택하세요"
            @update:value="handlePeriodMonthChange"
          />
        </label>

        <label
          v-if="adminDashboardStore.capabilities.siteFilterVisible"
          class="space-y-2"
        >
          <span class="text-sm font-medium text-slate-700">사이트</span>
          <n-select
            :value="adminDashboardStore.filters.siteId ?? null"
            :options="siteFilterOptions"
            placeholder="전체 사이트"
            clearable
            @update:value="handleSiteChange"
          />
        </label>

        <div class="space-y-2">
          <span class="text-sm font-medium text-slate-700">비교 단위</span>
          <div class="flex flex-wrap gap-2">
            <n-button
              :type="adminDashboardStore.grouping === 'employee' ? 'primary' : 'default'"
              secondary
              @click="handleGroupingChange('employee')"
            >
              직원 기준
            </n-button>
            <n-button
              :type="adminDashboardStore.grouping === 'site' ? 'primary' : 'default'"
              secondary
              @click="handleGroupingChange('site')"
            >
              사이트 기준
            </n-button>
          </div>
        </div>

        <div class="flex flex-wrap items-end justify-end gap-2">
          <n-button
            tertiary
            :loading="organizationOptionsLoading"
            :disabled="!isSuperAdmin"
            @click="loadOrganizationOptions"
          >
            조직 목록 새로고침
          </n-button>
          <n-button
            type="primary"
            secondary
            :loading="adminDashboardStore.status === 'loading'"
            @click="handleRefreshDashboard"
          >
            지표 새로고침
          </n-button>
        </div>
      </div>

      <n-alert
        v-if="organizationOptionLoadError"
        type="error"
        class="mt-4 rounded-2xl"
      >
        {{ organizationOptionLoadError }}
      </n-alert>
    </n-card>

    <n-alert
      v-if="adminDashboardStore.error"
      type="error"
      :show-icon="true"
      class="rounded-2xl"
    >
      {{ adminDashboardStore.error.message }}
    </n-alert>

    <section
      v-if="adminDashboardStore.requiresOrganizationSelection"
      class="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-sm"
    >
      <p class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
        조직 범위 선택 필요
      </p>
      <h2 class="mt-2 text-2xl font-semibold text-slate-900">
        관리자 지표를 불러오기 전에 대상 조직을 선택해주세요.
      </h2>
      <p class="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        대상 경로는 `/dashboard/admin`이며, 상단 `조직 선택` 드롭다운에서 조직을 고르면 공정성 summary card, 비교 차트, 근무표 운영 목록이 같은 화면에서 활성화됩니다.
      </p>
    </section>

    <template v-else>
      <section
        v-if="adminDashboardStore.status === 'loading' && !adminDashboardStore.response"
        class="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm"
      >
        <n-spin size="large" />
        <p class="mt-4 text-sm text-slate-500">
          관리자 지표를 계산하는 중입니다...
        </p>
      </section>

      <template v-else-if="dashboardReadyResponse">
        <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <article
            v-for="card in summaryCards"
            :key="card.title"
            class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p class="text-sm font-medium text-slate-500">
              {{ card.title }}
            </p>
            <p class="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              {{ card.value }}
            </p>
            <p class="mt-2 text-sm leading-6 text-slate-600">
              {{ card.description }}
            </p>
          </article>
        </section>

        <section class="grid gap-4 xl:grid-cols-2">
          <n-card
            title="야간 근무 분포"
            class="rounded-3xl"
          >
            <template #header-extra>
              <n-tag
                size="small"
                type="warning"
                round
              >
                막대 비교
              </n-tag>
            </template>

            <div class="space-y-4">
              <article
                v-for="row in metricRows"
                :key="`${row.label}-night`"
                class="space-y-2"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-sm font-semibold text-slate-900">
                      {{ row.label }}
                    </p>
                    <p class="text-xs text-slate-500">
                      {{ row.subLabel }}
                    </p>
                  </div>
                  <p class="text-sm font-semibold text-slate-700">
                    {{ row.nightShiftCount }}회
                  </p>
                </div>
                <div class="h-2 rounded-full bg-slate-100">
                  <div
                    class="h-2 rounded-full bg-slate-900 transition-all"
                    :style="{ width: `${resolveBarWidth(row.nightShiftCount, maxNightShiftCount)}%` }"
                  />
                </div>
              </article>
            </div>
          </n-card>

          <n-card
            title="주말 근무 분포"
            class="rounded-3xl"
          >
            <template #header-extra>
              <n-tag
                size="small"
                type="info"
                round
              >
                막대 비교
              </n-tag>
            </template>

            <div class="space-y-4">
              <article
                v-for="row in metricRows"
                :key="`${row.label}-weekend`"
                class="space-y-2"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-sm font-semibold text-slate-900">
                      {{ row.label }}
                    </p>
                    <p class="text-xs text-slate-500">
                      {{ row.subLabel }}
                    </p>
                  </div>
                  <p class="text-sm font-semibold text-slate-700">
                    {{ row.weekendWorkCount }}회
                  </p>
                </div>
                <div class="h-2 rounded-full bg-sky-100">
                  <div
                    class="h-2 rounded-full bg-sky-600 transition-all"
                    :style="{ width: `${resolveBarWidth(row.weekendWorkCount, maxWeekendWorkCount)}%` }"
                  />
                </div>
              </article>
            </div>
          </n-card>
        </section>

        <n-card class="rounded-3xl">
          <template #header>
            <div class="space-y-1">
              <h2 class="text-xl font-semibold text-slate-900">
                {{ comparisonSectionTitle }}
              </h2>
              <p class="text-sm text-slate-500">
                {{ comparisonSectionDescription }}
              </p>
            </div>
          </template>

          <n-data-table
            :columns="comparisonColumns"
            :data="dashboardReadyResponse.rows"
            :bordered="false"
            :pagination="false"
            :single-line="false"
            :row-key="getDashboardRowKey"
          />
        </n-card>
      </template>

      <section
        v-else-if="adminDashboardStore.status === 'empty'"
        class="rounded-3xl border border-slate-200 bg-white px-6 py-12 shadow-sm"
      >
        <n-empty description="선택한 조건에 저장된 근무표가 없습니다.">
          <template #extra>
            <div class="flex flex-wrap justify-center gap-2">
              <n-button
                type="primary"
                @click="handleCreateNew"
              >
                새 근무표 생성
              </n-button>
              <n-button
                secondary
                @click="handleRefreshDashboard"
              >
                다시 조회
              </n-button>
            </div>
          </template>
        </n-empty>
      </section>
    </template>

    <n-card class="rounded-3xl">
      <template #header>
        <div class="flex flex-col gap-1">
          <h2 class="text-xl font-semibold text-slate-900">
            근무표 운영
          </h2>
          <p class="text-sm text-slate-500">
            현재 조직의 월별 근무표를 조회하고, 새 스케줄 생성 흐름으로 이동합니다.
          </p>
        </div>
      </template>

      <template #header-extra>
        <n-button
          type="primary"
          @click="handleCreateNew"
        >
          새 근무표 생성
        </n-button>
      </template>

      <div
        v-if="scheduleOperationsLoading"
        class="py-12 text-center"
      >
        <n-spin size="large" />
        <p class="mt-4 text-gray-500">
          근무표 목록을 불러오는 중...
        </p>
      </div>

      <n-empty
        v-else-if="schedules.length === 0"
        description="생성된 근무표가 없습니다."
        class="py-10"
      >
        <template #extra>
          <n-button
            type="primary"
            @click="handleCreateNew"
          >
            첫 근무표 생성하기
          </n-button>
        </template>
      </n-empty>

      <div
        v-else
        class="space-y-4"
      >
        <n-card
          v-for="schedule in schedules"
          :key="schedule.id"
          :bordered="true"
          class="cursor-pointer rounded-3xl transition-shadow hover:shadow-md"
          @click="handleViewSchedule(schedule)"
        >
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex-1">
              <div class="flex flex-wrap items-center gap-3">
                <h3 class="text-lg font-semibold text-slate-900">
                  {{ schedule.month }} 근무표
                </h3>
                <n-badge
                  :value="getStatusText(schedule.status)"
                  :type="getStatusType(schedule.status)"
                />
              </div>
              <div class="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                <span>생성일: {{ formatDateTime(schedule.created_at) }}</span>
                <span v-if="schedule.hard_score !== null && schedule.soft_score !== null">
                  Hard Score: {{ schedule.hard_score }} / Soft Score: {{ schedule.soft_score }}
                </span>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <n-button
                secondary
                @click.stop="handleEdit(schedule)"
              >
                수정
              </n-button>
              <n-button
                secondary
                type="error"
                @click.stop="handleDelete(schedule)"
              >
                삭제
              </n-button>
            </div>
          </div>
        </n-card>
      </div>
    </n-card>

    <n-modal
      v-model:show="showMonthModal"
      preset="dialog"
      title="근무표 생성"
      positive-text="확인"
      negative-text="취소"
      :loading="modalLoading"
      @positive-click="handleMonthConfirm"
    >
      <div class="py-4">
        <n-form :model="monthForm">
          <n-form-item
            label="계획월"
            path="month"
          >
            <n-select
              v-model:value="monthForm.month"
              :options="scheduleMonthOptions"
              placeholder="근무표 생성할 월을 선택하세요"
            />
          </n-form-item>
        </n-form>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { DataTableColumns, SelectOption } from 'naive-ui'
import {
  NAlert,
  NBadge,
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NForm,
  NFormItem,
  NModal,
  NSelect,
  NSpin,
  NTag,
} from 'naive-ui'
import dayjs from 'dayjs'
import { loadOrganizationsForManagement } from '@/api/organization'
import { getScheduleList, type ScheduleSummary } from '@/api/schedule'
import { supabase } from '@/api/supabase'
import { useAdminDashboardStore } from '@/stores/dashboard'
import { useOrganizationStore } from '@/stores/organization'
import { useOnboardingStore } from '@/stores/onboarding'
import { useRbacStore } from '@/stores/rbac'
import { useScheduleStore } from '@/stores/schedule'
import type {
  AdminDashboardMetricRow,
  AdminDashboardReadyResponse,
  DashboardGrouping,
} from '@/types/dashboard'
import { type Organization } from '@/types/organization'
import { getAvailableMonths } from '@/utils/date'
import { showError, showInfo, showSuccess, showWarning } from '@/utils/message'
import { buildOnboardingQuery, resolveOnboardingRouteContext } from '@/utils/onboarding-context'

interface MetricRowViewModel {
  label: string
  subLabel: string
  nightShiftCount: number
  weekendWorkCount: number
}

interface SummaryCardViewModel {
  title: string
  value: string
  description: string
}

const route = useRoute()
const router = useRouter()
const adminDashboardStore = useAdminDashboardStore()
const rbacStore = useRbacStore()
const onboardingStore = useOnboardingStore()
const orgStore = useOrganizationStore()
const scheduleStore = useScheduleStore()

const organizationOptions = ref<SelectOption[]>([])
const organizationOptionLoadError = ref<string | null>(null)
const organizationOptionsLoading = ref(false)
const scheduleOperationsLoading = ref(false)
const schedules = ref<ScheduleSummary[]>([])
const showMonthModal = ref(false)
const modalLoading = ref(false)
const monthForm = ref({
  month: '',
})
const hasAutoOpenedOnboardingModal = ref(false)

const onboardingContext = computed(() => resolveOnboardingRouteContext(route.query))
const isSuperAdmin = computed(() => rbacStore.accessState === 'super_active')
const accessScopeLabel = computed(() =>
  isSuperAdmin.value ? '슈퍼 관리자 범위' : '조직 관리자 범위',
)
const selectedOrganizationId = computed(
  () => adminDashboardStore.resolvedOrganizationId ?? rbacStore.selectedOrganizationId ?? null,
)
const currentOrganizationLabel = computed(
  () => orgStore.current?.name ?? (isSuperAdmin.value ? '조직 선택 필요' : '조직 확인 중'),
)
const groupingTagLabel = computed(() =>
  adminDashboardStore.grouping === 'employee' ? '직원 기준 비교' : '사이트 기준 비교',
)
const groupingSummaryLabel = computed(() =>
  adminDashboardStore.grouping === 'employee'
    ? '직원별 야간/주말 근무 공정성 비교'
    : '사이트별 야간/주말 근무 분포 비교',
)
const showOnboardingBanner = computed(
  () =>
    onboardingContext.value.isOnboardingSource &&
    onboardingContext.value.step === 'schedule_request' &&
    !onboardingStore.isOnboardingComplete,
)
const shouldAutoOpenCreateModal = computed(
  () =>
    showOnboardingBanner.value &&
    onboardingContext.value.entry === 'create_schedule' &&
    onboardingContext.value.openCreateSchedule,
)
const dashboardReadyResponse = computed<AdminDashboardReadyResponse | null>(() => {
  if (adminDashboardStore.response?.state !== 'ready') {
    return null
  }

  return adminDashboardStore.response
})
const periodMonthOptions = computed<SelectOption[]>(() => {
  const selectedMonth = adminDashboardStore.filters.periodMonth || dayjs().format('YYYY-MM')
  const monthSet = new Set<string>([selectedMonth])

  Array.from({ length: 12 }, (_, index) =>
    dayjs(selectedMonth).subtract(index, 'month').format('YYYY-MM'),
  ).forEach((month) => monthSet.add(month))

  return Array.from(monthSet)
    .sort((left, right) => right.localeCompare(left))
    .map((month) => ({
      label: month,
      value: month,
    }))
})
const siteFilterOptions = computed<SelectOption[]>(() => [
  {
    label: '전체 사이트',
    value: null,
  },
  ...adminDashboardStore.siteOptions.map((option) => ({
    label: option.label,
    value: option.value,
  })),
])
const scheduleMonthOptions = computed<SelectOption[]>(() =>
  getAvailableMonths().map((month) => ({
    label: month,
    value: month,
  })),
)
const metricRows = computed<MetricRowViewModel[]>(() =>
  (dashboardReadyResponse.value?.rows ?? []).map((row) => ({
    label: getDashboardRowPrimaryLabel(row),
    subLabel: getDashboardRowSecondaryLabel(row),
    nightShiftCount: row.nightShiftCount,
    weekendWorkCount: row.weekendWorkCount,
  })),
)
const maxNightShiftCount = computed(() =>
  Math.max(...metricRows.value.map((row) => row.nightShiftCount), 1),
)
const maxWeekendWorkCount = computed(() =>
  Math.max(...metricRows.value.map((row) => row.weekendWorkCount), 1),
)
const summaryCards = computed<SummaryCardViewModel[]>(() => {
  const summary = dashboardReadyResponse.value?.summary

  if (!summary) {
    return []
  }

  return [
    {
      title: '비교 대상 수',
      value: `${summary.groupCount}개`,
      description: `${adminDashboardStore.grouping === 'employee' ? '직원' : '사이트'} 기준으로 같은 기간의 공정성을 비교합니다.`,
    },
    {
      title: '평균 야간 근무',
      value: formatMetricValue(summary.nightShiftAvg, true),
      description: `최소 ${formatMetricValue(summary.nightShiftMin)}회 / 최대 ${formatMetricValue(summary.nightShiftMax)}회`,
    },
    {
      title: '야간 근무 편차',
      value: formatMetricValue(summary.nightShiftGap),
      description: '최대값과 최소값 차이로 편중 정도를 확인합니다.',
    },
    {
      title: '평균 주말 근무',
      value: formatMetricValue(summary.weekendWorkAvg, true),
      description: `최소 ${formatMetricValue(summary.weekendWorkMin)}회 / 최대 ${formatMetricValue(summary.weekendWorkMax)}회`,
    },
    {
      title: '주말 근무 편차',
      value: formatMetricValue(summary.weekendWorkGap),
      description: '주말 근무 배분의 간격을 빠르게 파악합니다.',
    },
  ]
})
const comparisonSectionTitle = computed(() =>
  adminDashboardStore.grouping === 'employee' ? '직원 비교표' : '사이트 비교표',
)
const comparisonSectionDescription = computed(() =>
  adminDashboardStore.grouping === 'employee'
    ? '동일한 필터 조건에서 직원별 야간/주말 근무 횟수를 숫자로 검증합니다.'
    : '동일한 필터 조건에서 사이트별 야간/주말 근무 횟수를 숫자로 검증합니다.',
)
const lastFetchedLabel = computed(() =>
  adminDashboardStore.lastFetchedAt
    ? formatDateTime(adminDashboardStore.lastFetchedAt)
    : '아직 조회 전',
)
const scheduleOperationSummary = computed(() => {
  if (!selectedOrganizationId.value) {
    return '조직 선택 후 목록이 활성화됩니다.'
  }

  if (scheduleOperationsLoading.value) {
    return '근무표 목록 동기화 중'
  }

  return schedules.value.length > 0
    ? `${schedules.value.length}건의 근무표`
    : '등록된 근무표 없음'
})
const comparisonColumns = computed<DataTableColumns<AdminDashboardMetricRow>>(() => {
  if (adminDashboardStore.grouping === 'site') {
    return [
      {
        title: '사이트',
        key: 'siteName',
        render: (row) => getDashboardRowPrimaryLabel(row),
      },
      {
        title: '설명',
        key: 'siteDescription',
        render: () => '사이트 단위 집계',
      },
      {
        title: '야간 근무',
        key: 'nightShiftCount',
        sorter: (left, right) => left.nightShiftCount - right.nightShiftCount,
        render: (row) => `${row.nightShiftCount}회`,
      },
      {
        title: '주말 근무',
        key: 'weekendWorkCount',
        sorter: (left, right) => left.weekendWorkCount - right.weekendWorkCount,
        render: (row) => `${row.weekendWorkCount}회`,
      },
    ]
  }

  return [
    {
      title: '직원',
      key: 'employeeName',
      render: (row) => getDashboardRowPrimaryLabel(row),
    },
    {
      title: '사이트 / 직급',
      key: 'employeeScope',
      render: (row) =>
        h('div', { class: 'text-sm text-slate-600' }, getDashboardRowSecondaryLabel(row)),
    },
    {
      title: '야간 근무',
      key: 'nightShiftCount',
      sorter: (left, right) => left.nightShiftCount - right.nightShiftCount,
      render: (row) => `${row.nightShiftCount}회`,
    },
    {
      title: '주말 근무',
      key: 'weekendWorkCount',
      sorter: (left, right) => left.weekendWorkCount - right.weekendWorkCount,
      render: (row) => `${row.weekendWorkCount}회`,
    },
  ]
})

watch(
  shouldAutoOpenCreateModal,
  (nextValue) => {
    if (!nextValue || hasAutoOpenedOnboardingModal.value) {
      return
    }

    hasAutoOpenedOnboardingModal.value = true
    handleCreateNew()
  },
  { immediate: true },
)

watch(
  () => adminDashboardStore.resolvedOrganizationId,
  (nextOrganizationId, previousOrganizationId) => {
    if (nextOrganizationId === previousOrganizationId) {
      return
    }

    void syncOrganizationContext(nextOrganizationId)
  },
  { immediate: true },
)

onMounted(async () => {
  await loadOrganizationOptions()
  await adminDashboardStore.initialize()
})

async function loadOrganizationOptions() {
  if (!isSuperAdmin.value) {
    organizationOptions.value = []
    organizationOptionLoadError.value = null
    return
  }

  organizationOptionsLoading.value = true
  organizationOptionLoadError.value = null

  try {
    const organizations = await loadOrganizationsForManagement({
      accessState: rbacStore.accessState,
      organizationId: rbacStore.effectiveMembership?.organizationId ?? null,
    })

    organizationOptions.value = organizations.map((organization: Organization) => ({
      label: organization.name,
      value: organization.id,
    }))
  } catch (error) {
    organizationOptionLoadError.value =
      error instanceof Error ? error.message : '조직 목록을 불러오지 못했습니다.'
  } finally {
    organizationOptionsLoading.value = false
  }
}

async function syncOrganizationContext(organizationId: string | null) {
  if (!organizationId) {
    schedules.value = []
    return
  }

  const result = await orgStore.loadOrganization(organizationId)
  if (!result.success || !orgStore.current) {
    showError(result.error ?? '조직 정보를 불러오지 못했습니다.')
    schedules.value = []
    return
  }

  await loadSchedules(organizationId)
}

async function loadSchedules(organizationId: string) {
  scheduleOperationsLoading.value = true

  try {
    const data = await getScheduleList(organizationId)
    schedules.value = (data as ScheduleSummary[]).sort((left, right) =>
      right.month.localeCompare(left.month),
    )
  } catch (error) {
    console.warn('근무표 목록 로드 실패:', error)
    showError('근무표 목록을 불러오는데 실패했습니다.')
    schedules.value = []
  } finally {
    scheduleOperationsLoading.value = false
  }
}

async function handleOrganizationScopeChange(nextOrganizationId: string | null) {
  if (!nextOrganizationId) {
    showWarning('관리자 지표를 보려면 조직을 선택해주세요.')
    return
  }

  await adminDashboardStore.setOrganizationScope(nextOrganizationId)
}

async function handlePeriodMonthChange(nextPeriodMonth: string | null) {
  if (!nextPeriodMonth) {
    return
  }

  await adminDashboardStore.setPeriodMonth(nextPeriodMonth)
}

async function handleSiteChange(nextSiteId: string | null) {
  await adminDashboardStore.setSiteId(nextSiteId)
}

async function handleGroupingChange(nextGrouping: DashboardGrouping) {
  if (adminDashboardStore.grouping === nextGrouping) {
    return
  }

  await adminDashboardStore.setGrouping(nextGrouping)
}

async function handleRefreshDashboard() {
  await Promise.all([
    adminDashboardStore.refresh(),
    selectedOrganizationId.value ? loadSchedules(selectedOrganizationId.value) : Promise.resolve(),
  ])
}

function handleCreateNew() {
  monthForm.value.month = scheduleMonthOptions.value[1]?.value?.toString() ?? ''
  showMonthModal.value = true
}

async function handleMonthConfirm() {
  if (!orgStore.current) {
    showError('조직 정보가 없습니다. 페이지를 새로고침 해주세요.')
    return false
  }

  if (!monthForm.value.month) {
    showWarning('계획월을 선택해주세요.')
    return false
  }

  modalLoading.value = true

  try {
    const { data, error } = await supabase
      .from('schedules')
      .select('id, month, status')
      .eq('organization_id', orgStore.current.id)
      .eq('month', monthForm.value.month)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (data) {
      showError(`${monthForm.value.month} 근무표가 이미 존재합니다. 다른 월을 선택해주세요.`)
      return false
    }

    scheduleStore.reset()
    scheduleStore.setBasicInfo({
      month: monthForm.value.month,
      organizationId: orgStore.current.id,
      organizationName: orgStore.current.name,
      organizationType: orgStore.current.type,
      shifts: orgStore.shifts,
      employeeCount: orgStore.employees.length,
    })

    const query =
      showOnboardingBanner.value && onboardingContext.value.step === 'schedule_request'
        ? buildOnboardingQuery({
            step: 'schedule_request',
            entry: 'create_schedule',
            returnTo: onboardingContext.value.returnTo,
            returnStep: onboardingContext.value.returnStep ?? 'schedule_request',
          })
        : undefined

    await router.push({
      path: '/schedule/step1',
      query,
    })

    return true
  } catch (error) {
    console.warn('월 중복 체크 실패:', error)
    showError('월 중복 체크 중 오류가 발생했습니다.')
    return false
  } finally {
    modalLoading.value = false
  }
}

function handleViewSchedule(schedule: ScheduleSummary) {
  if (!orgStore.current) {
    showError('조직 정보가 없습니다. 페이지를 새로고침 해주세요.')
    return
  }

  scheduleStore.reset()
  scheduleStore.setBasicInfo({
    scheduleId: schedule.id,
    month: schedule.month,
    organizationId: orgStore.current.id,
    organizationName: orgStore.current.name,
    organizationType: orgStore.current.type,
    shifts: orgStore.shifts,
    employeeCount: orgStore.employees.length,
  })

  if (
    schedule.status === 'complete' ||
    schedule.status === 'changed' ||
    schedule.status === 'created' ||
    schedule.status === 'running'
  ) {
    void router.push(`/schedule/step5/${schedule.id}`)
    return
  }

  showInfo('해당 근무표를 조회할 수 없습니다.')
}

async function handleEdit(schedule: ScheduleSummary) {
  if (!orgStore.current) {
    showError('조직 정보가 없습니다. 페이지를 새로고침 해주세요.')
    return
  }

  scheduleStore.reset()
  scheduleStore.setBasicInfo({
    scheduleId: schedule.id,
    month: schedule.month,
    organizationId: orgStore.current.id,
    organizationName: orgStore.current.name,
    organizationType: orgStore.current.type,
    shifts: orgStore.shifts,
    employeeCount: orgStore.employees.length,
  })

  await router.push('/schedule/step1')
}

function handleDelete(schedule: ScheduleSummary) {
  window.$dialog?.warning({
    title: '근무표 삭제',
    content: `${schedule.month} 근무표를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
    positiveText: '삭제',
    negativeText: '취소',
    onPositiveClick: async () => {
      try {
        await supabase.from('schedule_assignments').delete().eq('schedule_id', schedule.id)

        const { error } = await supabase.from('schedules').delete().eq('id', schedule.id)

        if (error) {
          throw error
        }

        showSuccess('근무표가 삭제되었습니다.')
        if (selectedOrganizationId.value) {
          await Promise.all([
            loadSchedules(selectedOrganizationId.value),
            adminDashboardStore.refresh(),
          ])
        }
      } catch (error) {
        console.warn('삭제 실패:', error)
        showError('삭제 중 오류가 발생했습니다.')
      }
    },
  })
}

function handleReturnToOnboarding() {
  void router.push({
    path: onboardingContext.value.returnTo,
    query: buildOnboardingQuery({
      step: 'schedule_request',
      returnTo: onboardingContext.value.returnTo,
      returnStep: onboardingContext.value.returnStep ?? 'schedule_request',
      resumeStep: onboardingContext.value.returnStep ?? 'schedule_request',
    }),
  })
}

function getDashboardRowPrimaryLabel(row: AdminDashboardMetricRow): string {
  return row.kind === 'employee' ? row.employeeName : row.siteName
}

function getDashboardRowSecondaryLabel(row: AdminDashboardMetricRow): string {
  if (row.kind === 'site') {
    return '사이트 단위 집계'
  }

  const siteLabel = row.siteName ?? '사이트 미지정'
  const rankLabel = row.rankName ?? '직급 미지정'
  return `${siteLabel} · ${rankLabel}`
}

function getDashboardRowKey(row: AdminDashboardMetricRow): string {
  return row.kind === 'employee' ? row.employeeId : row.siteId
}

function resolveBarWidth(value: number, maxValue: number): number {
  return Math.max((value / maxValue) * 100, 6)
}

function formatMetricValue(value: number | null, fixed = false): string {
  if (value === null) {
    return '-'
  }

  return fixed ? `${value.toFixed(2)}회` : `${value}회`
}

function getStatusText(status: ScheduleSummary['status']): string {
  const map: Record<ScheduleSummary['status'], string> = {
    created: '생성됨',
    running: '생성 중',
    complete: '완료',
    changed: '수정됨',
    error: '오류',
  }

  return map[status]
}

function getStatusType(
  status: ScheduleSummary['status'],
): 'info' | 'success' | 'error' | 'warning' | 'default' {
  const map: Record<ScheduleSummary['status'], 'info' | 'success' | 'error' | 'warning' | 'default'> = {
    created: 'info',
    running: 'info',
    complete: 'success',
    changed: 'warning',
    error: 'error',
  }

  return map[status]
}

function formatDateTime(dateValue: string): string {
  return dayjs(dateValue).format('YYYY-MM-DD HH:mm')
}
</script>
