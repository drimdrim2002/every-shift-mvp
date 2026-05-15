<template>
  <AppContainer
    data-test="dashboard-app-container"
    class="space-y-6"
  >
    <div>
      <h1 class="text-2xl font-bold">
        근무표 관리
      </h1>
    </div>

    <div>
      <div
        v-if="!hasAdminDashboardAccess"
        class="space-y-8"
      >
        <section class="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
          <div class="space-y-2">
            <p class="text-sm font-medium tracking-wide text-slate-500">
              권한 안내
            </p>
            <h2 class="text-xl font-semibold text-slate-900">
              운영 권한이 없는 계정입니다
            </h2>
            <p class="text-sm text-slate-600">
              현재 계정은 운영 기능 권한이 없습니다.
            </p>
          </div>
        </section>
      </div>

      <div
        v-else
        class="space-y-8"
      >
        <section
          v-if="opsReadinessLoading"
          class="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm"
        >
          <div
            data-test="dashboard-ops-readiness-loading"
            class="rounded-xl border border-slate-200 bg-white px-5 py-8 text-center"
          >
            <n-spin size="medium" />
            <p class="mt-4 text-base font-semibold text-slate-900">
              운영 준비 정보를 확인하는 중입니다
            </p>
            <p class="mt-1 text-sm text-slate-500">
              병원 정보, 기준 설정, 체크리스트를 불러오고 있습니다.
            </p>
          </div>
        </section>

        <section
          v-else-if="isDashboardReadinessUnavailable"
          data-test="dashboard-readiness-unavailable"
          class="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm"
        >
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="space-y-2">
              <p class="text-sm font-medium tracking-wide text-amber-700">
                운영 준비
              </p>
              <h2 class="text-xl font-semibold text-slate-900">
                운영 준비 상태를 확인하지 못했습니다
              </h2>
              <p class="text-sm text-slate-600">
                필수 정보가 준비되었는지 확인할 수 없어 근무표 생성과 생성된 근무표를 잠시 숨겼습니다.
              </p>
            </div>
            <n-button
              data-test="dashboard-readiness-retry"
              type="primary"
              @click="reloadDashboardData"
            >
              다시 확인
            </n-button>
          </div>
        </section>

        <section
          v-else-if="!isDashboardReady"
          data-test="dashboard-onboarding-only"
          class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div class="mb-5">
            <p class="text-sm font-medium tracking-wide text-slate-500">
              운영 준비
            </p>
            <h2 class="mt-1 text-xl font-semibold text-slate-900">
              근무표 생성을 시작하기 전에 필수 정보를 먼저 확인해주세요
            </h2>
            <p class="mt-2 text-sm text-slate-600">
              아래 3가지를 순서대로 완료하면 근무표 생성과 생성된 근무표를 사용할 수 있습니다.
            </p>
            <div class="mt-4 rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900">
              처음 설정은 한 번만 해두면 됩니다. 병원 정보와 근무 유형을 확인한 뒤, 장소별 필요 인원과 직원 명단을 차례대로 저장해주세요.
            </div>
          </div>

          <div class="space-y-3">
            <div
              v-for="item in onboardingReadinessItems"
              :key="item.key"
              class="rounded-lg border border-slate-200 bg-slate-50/60 p-4"
            >
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="text-base font-semibold text-slate-900">
                      {{ item.step }} {{ item.label }}
                    </p>
                    <span
                      class="rounded-full px-2.5 py-1 text-xs font-medium ring-1"
                      :class="item.statusClass"
                    >
                      {{ item.statusLabel }}
                    </span>
                  </div>
                  <p class="mt-1 text-sm text-slate-600">
                    {{ item.description }}
                  </p>
                  <p
                    v-if="item.disabledReason"
                    class="mt-2 text-sm text-slate-500"
                  >
                    {{ item.disabledReason }}
                  </p>
                </div>
                <n-button
                  :data-test="`dashboard-onboarding-item-${item.key}`"
                  :type="item.isCurrent ? 'primary' : 'default'"
                  :secondary="!item.isCurrent"
                  :disabled="item.isWaiting"
                  @click="handleOpenReadinessItem(item.key)"
                >
                  {{ item.actionLabel }}
                </n-button>
              </div>
            </div>
          </div>
        </section>

        <template v-else>
          <section
            data-test="dashboard-next-action"
            class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div class="flex flex-wrap items-start justify-between gap-5">
              <div class="min-w-0 flex-1 space-y-2">
                <p class="text-sm font-medium tracking-wide text-slate-500">
                  오늘의 다음 작업
                </p>
                <h2 class="mt-1 text-xl font-semibold text-slate-900">
                  {{ primaryDashboardAction.title }}
                </h2>
                <p class="text-sm text-slate-600">
                  {{ primaryDashboardAction.description }}
                </p>
                <p
                  v-if="!canManageSchedules"
                  class="text-sm font-medium text-slate-500"
                >
                  근무표 생성 권한이 없는 계정입니다. 기존 정보 확인만 사용할 수 있습니다.
                </p>
              </div>
              <n-button
                data-test="dashboard-primary-action"
                type="primary"
                size="large"
                class="min-h-11"
                @click="handlePrimaryDashboardAction(primaryDashboardAction)"
              >
                {{ primaryDashboardAction.label }}
              </n-button>
            </div>
          </section>

          <section
            data-test="dashboard-operational-status"
            class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div class="mb-4">
              <p class="text-sm font-medium tracking-wide text-slate-500">
                운영 상태
              </p>
              <h2 class="mt-1 text-xl font-semibold text-slate-900">
                지금 확인해야 할 상태를 요약합니다
              </h2>
            </div>

            <div class="divide-y divide-slate-200 rounded-lg border border-slate-200">
              <div
                v-for="row in operationalStatusRows"
                :key="row.key"
                class="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <p class="text-sm font-medium text-slate-600">
                  {{ row.label }}
                </p>
                <span
                  class="w-fit rounded-full px-2.5 py-1 text-xs font-medium ring-1"
                  :class="row.statusClass"
                >
                  {{ row.value }}
                </span>
              </div>
            </div>
          </section>

          <section
            data-test="dashboard-recent-schedule"
            class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div class="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="text-sm font-medium tracking-wide text-slate-500">
                  최근 근무표
                </p>
                <h2 class="mt-1 text-xl font-semibold text-slate-900">
                  마지막 작업 결과를 확인합니다
                </h2>
              </div>
              <n-button
                data-test="dashboard-view-all-schedules"
                secondary
                @click="handleViewAllSchedules"
              >
                전체 목록 보기
              </n-button>
            </div>

            <div
              v-if="scheduleListLoadFailed"
              class="rounded-lg border border-amber-200 bg-amber-50/70 p-5"
            >
              <h3 class="text-base font-semibold text-slate-900">
                근무표 목록을 확인하지 못했습니다
              </h3>
              <p class="mt-1 text-sm text-slate-600">
                생성 중인 근무표나 최근 결과를 확인하려면 목록을 다시 불러와야 합니다.
              </p>
              <n-button
                data-test="dashboard-schedule-list-retry"
                class="mt-4"
                secondary
                type="primary"
                @click="handleRetryScheduleList"
              >
                다시 불러오기
              </n-button>
            </div>

            <div
              v-else-if="scheduleLoading"
              class="rounded-lg border border-slate-200 bg-slate-50/70 px-5 py-8 text-center"
            >
              <n-spin size="medium" />
              <p class="mt-4 text-sm text-slate-500">
                근무표 목록을 불러오는 중입니다.
              </p>
            </div>

            <div
              v-else-if="!latestDisplaySchedule"
              class="rounded-lg border border-slate-200 bg-slate-50/70 px-5 py-8"
            >
              <h3 class="text-base font-semibold text-slate-900">
                아직 생성된 근무표가 없습니다
              </h3>
              <p class="mt-1 text-sm text-slate-600">
                새 계획월을 선택하면 생성 흐름을 시작할 수 있습니다.
              </p>
            </div>

            <div
              v-else
              class="rounded-lg border border-slate-200 bg-slate-50/60 p-4"
            >
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-3">
                    <h3 class="text-lg font-semibold text-slate-900">
                      {{ latestDisplaySchedule.month }} 근무표
                    </h3>
                    <n-badge
                      :value="getStatusText(latestDisplaySchedule.status)"
                      :type="getStatusType(latestDisplaySchedule.status)"
                    />
                  </div>
                  <div class="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
                    <span>생성일: {{ formatDate(latestDisplaySchedule.created_at) }}</span>
                    <span
                      v-if="latestDisplaySchedule.hard_score !== null && latestDisplaySchedule.soft_score !== null"
                    >
                      Hard Score: {{ latestDisplaySchedule.hard_score }} / Soft Score: {{ latestDisplaySchedule.soft_score }}
                    </span>
                  </div>
                </div>
                <n-button
                  data-test="dashboard-view-recent-schedule"
                  secondary
                  type="primary"
                  @click="handleViewSchedule(latestDisplaySchedule)"
                >
                  보기
                </n-button>
              </div>
            </div>
          </section>
        </template>
      </div>
    </div>

    <!-- 월 선택 모달 -->
    <n-modal
      v-model:show="showMonthModal"
      data-test="dashboard-month-modal"
      preset="dialog"
      title="근무표 생성"
      positive-text="확인"
      negative-text="취소"
      :loading="modalLoading"
      @positive-click="handleMonthConfirm"
    >
      <div class="py-4">
        <n-form
          ref="monthFormRef"
          :model="monthForm"
        >
          <p
            data-test="dashboard-month-picker-help"
            class="mb-4 text-sm text-slate-500"
          >
            현재 기준 과거 12개월부터 미래 12개월 사이에서, 아직 생성하지 않은 월만 선택할 수 있습니다.
          </p>
          <n-form-item
            label="계획월"
            path="month"
          >
            <n-date-picker
              v-model:formatted-value="monthForm.month"
              data-test="dashboard-month-picker"
              type="month"
              format="yyyy-MM"
              value-format="yyyy-MM"
              input-readonly
              :is-date-disabled="isMonthDateDisabled"
              placeholder="근무표 생성할 월을 선택하세요"
            />
          </n-form-item>
        </n-form>
      </div>
    </n-modal>
  </AppContainer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NButton, NSpin, NBadge, NModal, NForm, NFormItem, NDatePicker } from 'naive-ui';
import { useOrganizationStore } from '@/stores/organization';
import { useRbacStore } from '@/stores/rbac';
import { useScheduleStore } from '@/stores/schedule';
import AppContainer from '@/components/layout/AppContainer.vue';
import {
  getPhase2ScheduleCompare,
  getScheduleList,
  type ScheduleSummary,
} from '@/api/schedule';
import { getChecklist } from '@/api/ops';
import { supabase } from '@/api/supabase';
import { showError, showWarning } from '@/utils/message';
import {
  buildSchedulableMonthWindow,
  getDefaultSchedulableMonth,
  isSchedulableMonthAvailable,
} from '@/utils/date';
import {
  resolveStep5VersionState,
} from '@/utils/scheduleVersionResolver';
import { buildScheduleEntryQuery } from '@/utils/scheduleEntryMode';
import {
  buildCanonicalStep5RouteLocation,
  getAppHomeRoutePath,
  getScheduleResultsRoutePath,
  getScheduleStepRoutePath,
} from '@/constants/routes';
import dayjs from 'dayjs';
import type { ChecklistItem, ChecklistResponse } from '@/types/ops';

const route = useRoute();
const router = useRouter();
const orgStore = useOrganizationStore();
const rbacStore = useRbacStore();
const scheduleStore = useScheduleStore();

const DASHBOARD_CREATE_SCHEDULE_QUERY_KEY = 'createSchedule';
const DASHBOARD_CREATE_SCHEDULE_QUERY_VALUE = '1';

const opsReadinessLoading = ref(true);
const opsReadinessLoadFailed = ref(false);
const scheduleLoading = ref(false);
const scheduleListLoadFailed = ref(false);
const schedules = ref<ScheduleSummary[]>([]);
const verifiedExistingScheduleMonths = ref<Set<string>>(new Set());
const checklist = ref<ChecklistResponse | null>(null);
const dashboardLoadRunId = ref(0);

// 월 선택 모달 관련
const showMonthModal = ref(false);
const modalLoading = ref(false);
const monthFormRef = ref();
const monthForm = ref({
  month: '',
});

type DatePickerDisableDetail =
  | { type: 'date'; year: number; month: number; date: number }
  | { type: 'month'; year: number; month: number }
  | { type: 'year'; year: number }
  | { type: 'quarter'; year: number; quarter: number }
  | { type: 'input' };

const schedulableMonthWindow = computed(() => buildSchedulableMonthWindow());
const existingScheduleMonthSet = computed(() =>
  new Set([
    ...schedules.value.map((schedule) => schedule.month),
    ...verifiedExistingScheduleMonths.value,
  ])
);
const nextSchedulableMonth = computed(() =>
  getDefaultSchedulableMonth(existingScheduleMonthSet.value)
);

function getScheduleSortTime(schedule: ScheduleSummary) {
  const updatedTime = dayjs(schedule.updated_at);
  if (updatedTime.isValid()) {
    return updatedTime.valueOf();
  }

  const createdTime = dayjs(schedule.created_at);
  return createdTime.isValid() ? createdTime.valueOf() : 0;
}

const sortedSchedulesByRecency = computed(() => {
  return [...schedules.value].sort((left, right) => {
    const timeDiff = getScheduleSortTime(right) - getScheduleSortTime(left);
    if (timeDiff !== 0) {
      return timeDiff;
    }

    const monthDiff = right.month.localeCompare(left.month);
    if (monthDiff !== 0) {
      return monthDiff;
    }

    return left.id.localeCompare(right.id);
  });
});

const latestDisplaySchedule = computed(() => sortedSchedulesByRecency.value[0] ?? null);
const runningSchedule = computed(() =>
  sortedSchedulesByRecency.value.find((schedule) => schedule.status === 'running') ?? null
);
const recentActionableSchedule = computed(() =>
  sortedSchedulesByRecency.value.find((schedule) =>
    schedule.status === 'complete' || schedule.status === 'changed'
  ) ?? null
);

const REQUIRED_DASHBOARD_READINESS_KEYS = [
  'organization_profile',
  'schedule_foundation',
  'employee_roster',
] as const satisfies readonly ChecklistItem['key'][];

type DashboardReadinessKey = (typeof REQUIRED_DASHBOARD_READINESS_KEYS)[number];
type DashboardPrimaryActionKey =
  | 'retry_readiness'
  | 'open_readiness_item'
  | 'retry_schedule_list'
  | 'open_running_schedule'
  | 'create_schedule'
  | 'open_recent_schedule'
  | 'open_schedule_results';

interface DashboardPrimaryAction {
  key: DashboardPrimaryActionKey;
  label: string;
  title: string;
  description: string;
  readinessKey?: DashboardReadinessKey;
  schedule?: ScheduleSummary;
}

const READINESS_ITEM_COPY: Record<DashboardReadinessKey, {
  step: number;
  label: string;
  description: string;
  actionLabel: string;
  waitingReason: string;
}> = {
  organization_profile: {
    step: 1,
    label: '병원 정보',
    description: '병원 이름을 확인하고 실제 사용하는 근무 유형을 정리합니다.',
    actionLabel: '기본 정보 확인하기',
    waitingReason: '',
  },
  schedule_foundation: {
    step: 2,
    label: '병동/근무 기준',
    description: '기준 장소, 휴식시간, 시프트, 인력 기준을 확인합니다.',
    actionLabel: '근무 기준 설정하기',
    waitingReason: '병원 정보를 먼저 완료해야 설정할 수 있습니다.',
  },
  employee_roster: {
    step: 3,
    label: '직원 정보',
    description: '근무표에 배정할 직원 로스터와 근무 가능 기준을 확인합니다.',
    actionLabel: '직원 정보 확인하기',
    waitingReason: '병동/근무 기준을 먼저 완료해야 설정할 수 있습니다.',
  },
};

const checklistItemByKey = computed(() => {
  return new Map((checklist.value?.items ?? []).map((item) => [item.key, item]));
});

const requiredReadinessItems = computed(() => {
  return REQUIRED_DASHBOARD_READINESS_KEYS.map((key) => checklistItemByKey.value.get(key) ?? null);
});

const hasRequiredReadinessItems = computed(() => {
  return requiredReadinessItems.value.every((item) => item !== null);
});

const isDashboardReady = computed(() => {
  return requiredReadinessItems.value.every((item) => item?.status === 'ready');
});

const isDashboardReadinessUnavailable = computed(() => {
  return !opsReadinessLoading.value && (opsReadinessLoadFailed.value || !hasRequiredReadinessItems.value);
});

const firstIncompleteReadinessKey = computed<DashboardReadinessKey | null>(() => {
  const firstIncompleteIndex = requiredReadinessItems.value.findIndex((item) => item?.status !== 'ready');
  return firstIncompleteIndex === -1 ? null : REQUIRED_DASHBOARD_READINESS_KEYS[firstIncompleteIndex] ?? null;
});

const onboardingReadinessItems = computed(() => {
  const currentKey = firstIncompleteReadinessKey.value;

  return REQUIRED_DASHBOARD_READINESS_KEYS.map((key) => {
    const item = checklistItemByKey.value.get(key);
    const copy = READINESS_ITEM_COPY[key];
    const isComplete = item?.status === 'ready';
    const isCurrent = !isComplete && key === currentKey;
    const isWaiting = !isComplete && !isCurrent;

    return {
      key,
      ...copy,
      statusLabel: isComplete ? '완료' : isCurrent ? '진행' : '대기',
      statusClass: isComplete
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
        : isCurrent
          ? 'bg-teal-50 text-teal-700 ring-teal-200'
          : 'bg-slate-100 text-slate-600 ring-slate-200',
      isCurrent,
      isWaiting,
      actionLabel: isComplete ? '확인하기' : copy.actionLabel,
      disabledReason: isWaiting ? copy.waitingReason : item?.blockedReason,
    };
  });
});

const hasAdminDashboardAccess = computed(() =>
  rbacStore.abilities.canManageOrganizationSetup
  || rbacStore.abilities.canManageEmployees
  || rbacStore.abilities.canManageSchedules
);

const canManageSchedules = computed(() => rbacStore.abilities.canManageSchedules);

const primaryDashboardAction = computed<DashboardPrimaryAction>(() => {
  if (isDashboardReadinessUnavailable.value) {
    return {
      key: 'retry_readiness',
      label: '다시 확인',
      title: '운영 준비 상태를 확인하지 못했습니다',
      description: '필수 정보가 준비되었는지 확인할 수 없어 다음 작업을 잠시 멈췄습니다.',
    };
  }

  if (!isDashboardReady.value && firstIncompleteReadinessKey.value) {
    return {
      key: 'open_readiness_item',
      label: '현재 항목 확인하기',
      title: '운영 기준 확인이 필요합니다',
      description: '근무표 생성을 시작하려면 먼저 막힌 기준 항목을 완료해야 합니다.',
      readinessKey: firstIncompleteReadinessKey.value,
    };
  }

  if (scheduleListLoadFailed.value) {
    return {
      key: 'retry_schedule_list',
      label: '다시 불러오기',
      title: '근무표 목록을 확인하지 못했습니다',
      description: '생성 중인 근무표나 이미 만든 계획월을 확인할 수 없어 목록을 다시 불러와야 합니다.',
    };
  }

  if (runningSchedule.value) {
    return {
      key: 'open_running_schedule',
      label: '생성 상태 확인하기',
      title: '생성 중인 근무표가 있습니다',
      description: '생성 상태를 확인하고 이어서 검토할 수 있습니다.',
      schedule: runningSchedule.value,
    };
  }

  if (canManageSchedules.value && nextSchedulableMonth.value !== null) {
    return {
      key: 'create_schedule',
      label: '새 근무표 생성하기',
      title: '새 근무표를 만들 수 있습니다',
      description: '아직 생성하지 않은 다음 계획월을 선택해 생성 흐름을 시작합니다.',
    };
  }

  if (recentActionableSchedule.value) {
    return {
      key: 'open_recent_schedule',
      label: '최근 근무표 보기',
      title: '최근 완료된 근무표가 있습니다',
      description: '마지막으로 작업한 근무표를 바로 확인할 수 있습니다.',
      schedule: recentActionableSchedule.value,
    };
  }

  return {
    key: 'open_schedule_results',
    label: '생성된 근무표로 이동',
    title: '지금 바로 처리할 작업은 없습니다',
    description: '생성된 근무표 목록에서 이전 결과를 확인할 수 있습니다.',
  };
});

function getOperationalStatusClass(key: string, value: string) {
  if (key === 'data_attention' && value === '있음') {
    return 'bg-amber-50 text-amber-700 ring-amber-200';
  }

  if (value === '준비 완료' || value === '있음') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }

  if (value === '확인 실패' || value === '확인 필요') {
    return 'bg-amber-50 text-amber-700 ring-amber-200';
  }

  return 'bg-slate-100 text-slate-600 ring-slate-200';
}

const operationalStatusRows = computed(() => {
  const rows = [
    {
      key: 'readiness',
      label: '운영 기준',
      value: isDashboardReadinessUnavailable.value
        ? '확인 실패'
        : isDashboardReady.value
          ? '준비 완료'
          : '확인 필요',
    },
  ];

  if (runningSchedule.value) {
    rows.push({
      key: 'running_schedule',
      label: '생성 중 근무표',
      value: '있음',
    });
  }

  rows.push({
    key: 'recent_schedule',
    label: '최근 완료 근무표',
    value: recentActionableSchedule.value ? '있음' : '없음',
  });

  if (isDashboardReadinessUnavailable.value || scheduleListLoadFailed.value) {
    rows.push({
      key: 'data_attention',
      label: '확인 필요',
      value: '있음',
    });
  }

  return rows.map((row) => ({
    ...row,
    statusClass: getOperationalStatusClass(row.key, row.value),
  }));
});

function startDashboardLoadRun() {
  const runId = dashboardLoadRunId.value + 1;
  dashboardLoadRunId.value = runId;
  return runId;
}

function resetDashboardData() {
  schedules.value = [];
  verifiedExistingScheduleMonths.value = new Set();
  checklist.value = null;
  opsReadinessLoadFailed.value = false;
  scheduleListLoadFailed.value = false;
  opsReadinessLoading.value = false;
  scheduleLoading.value = false;
}

async function reloadDashboardData() {
  const runId = startDashboardLoadRun();

  if (!hasAdminDashboardAccess.value) {
    resetDashboardData();
    return;
  }

  schedules.value = [];
  checklist.value = null;
  opsReadinessLoadFailed.value = false;
  scheduleListLoadFailed.value = false;
  opsReadinessLoading.value = true;
  scheduleLoading.value = false;

  const result = await orgStore.loadOrganization();
  if (runId !== dashboardLoadRunId.value) {
    return;
  }

  if (!result.success) {
    showError(result.error || '조직 정보를 불러오지 못했습니다.');
    opsReadinessLoading.value = false;
    scheduleLoading.value = false;
    return;
  }

  try {
    if (orgStore.current?.id && typeof orgStore.loadFoundationData === 'function') {
      const foundationOrganizationId = orgStore.current.id;
      await orgStore.loadFoundationData(foundationOrganizationId);
      if (runId !== dashboardLoadRunId.value || foundationOrganizationId !== orgStore.current?.id) {
        return;
      }
    }

    const organizationId = orgStore.current?.id ?? null;
    const loadedChecklist = await loadChecklist(runId, organizationId);
    if (runId !== dashboardLoadRunId.value || organizationId !== orgStore.current?.id) {
      return;
    }

    if (!loadedChecklist || !hasRequiredReadinessItems.value || !isDashboardReady.value) {
      schedules.value = [];
      return;
    }

    opsReadinessLoading.value = false;
    await loadSchedules(runId, organizationId);
  } finally {
    if (runId === dashboardLoadRunId.value) {
      opsReadinessLoading.value = false;
    }
  }
}

function hasDashboardCreateScheduleIntent() {
  return route.query[DASHBOARD_CREATE_SCHEDULE_QUERY_KEY] === DASHBOARD_CREATE_SCHEDULE_QUERY_VALUE;
}

function getQueryWithoutDashboardCreateScheduleIntent() {
  const nextQuery = { ...route.query };
  delete nextQuery[DASHBOARD_CREATE_SCHEDULE_QUERY_KEY];
  return nextQuery;
}

function canOpenDashboardCreateScheduleModal() {
  return (
    hasAdminDashboardAccess.value
    && canManageSchedules.value
    && !opsReadinessLoading.value
    && !isDashboardReadinessUnavailable.value
    && isDashboardReady.value
    && !scheduleLoading.value
    && !scheduleListLoadFailed.value
  );
}

async function consumeDashboardCreateScheduleIntent() {
  if (!hasDashboardCreateScheduleIntent()) {
    return;
  }

  try {
    await router.replace({
      path: getAppHomeRoutePath(),
      query: getQueryWithoutDashboardCreateScheduleIntent(),
    });
  } catch (error) {
    console.warn('Dashboard create schedule query cleanup failed:', error);
  }

  if (!canOpenDashboardCreateScheduleModal()) {
    return;
  }

  await handleCreateNew();
}

async function reloadDashboardDataAndConsumeRouteIntent() {
  await reloadDashboardData();
  await consumeDashboardCreateScheduleIntent();
}

onMounted(async () => {
  await reloadDashboardDataAndConsumeRouteIntent();
});

watch(
  () => route.query[DASHBOARD_CREATE_SCHEDULE_QUERY_KEY],
  async (nextCreateScheduleIntent) => {
    if (nextCreateScheduleIntent !== DASHBOARD_CREATE_SCHEDULE_QUERY_VALUE) {
      return;
    }

    await consumeDashboardCreateScheduleIntent();
  },
);

watch(
  () => rbacStore.selectedOrganizationId,
  async (nextOrganizationId, previousOrganizationId) => {
    if (nextOrganizationId === previousOrganizationId) {
      return;
    }

    await reloadDashboardDataAndConsumeRouteIntent();
  },
);

async function loadSchedules(
  runId = dashboardLoadRunId.value,
  organizationId = orgStore.current?.id ?? null
) {
  if (!organizationId) {
    schedules.value = [];
    scheduleListLoadFailed.value = true;
    scheduleLoading.value = false;
    return;
  }

  try {
    scheduleLoading.value = true;
    scheduleListLoadFailed.value = false;
    const data = await getScheduleList(organizationId);
    if (runId !== dashboardLoadRunId.value || organizationId !== orgStore.current?.id) {
      return;
    }

    schedules.value = data;
    verifiedExistingScheduleMonths.value = new Set(data.map((schedule) => schedule.month));
  } catch (error) {
    if (runId !== dashboardLoadRunId.value || organizationId !== orgStore.current?.id) {
      return;
    }

    console.warn('근무표 목록 로드 실패:', error);
    schedules.value = [];
    verifiedExistingScheduleMonths.value = new Set();
    scheduleListLoadFailed.value = true;
  } finally {
    if (runId === dashboardLoadRunId.value && organizationId === orgStore.current?.id) {
      scheduleLoading.value = false;
    }
  }
}

async function loadChecklist(
  runId = dashboardLoadRunId.value,
  organizationId = orgStore.current?.id ?? null
): Promise<ChecklistResponse | null> {
  if (!organizationId) {
    checklist.value = null;
    opsReadinessLoadFailed.value = true;
    return null;
  }

  try {
    const response = await getChecklist(organizationId);
    if (runId !== dashboardLoadRunId.value || organizationId !== orgStore.current?.id) {
      return null;
    }

    checklist.value = response;
    opsReadinessLoadFailed.value = false;
    return response;
  } catch (error) {
    if (runId !== dashboardLoadRunId.value || organizationId !== orgStore.current?.id) {
      return null;
    }

    console.warn('체크리스트 로드 실패:', error);
    checklist.value = null;
    opsReadinessLoadFailed.value = true;
    return null;
  }
}

function extractScheduleMonths(rows: Array<{ month?: string | null }> | null) {
  return rows
    ?.map((row) => row.month)
    .filter((month): month is string => typeof month === 'string' && month.length > 0)
    ?? [];
}

async function refreshExistingScheduleMonths() {
  const organizationId = orgStore.current?.id;
  if (!organizationId) {
    throw new Error('Organization is required to verify existing schedule months.');
  }

  const { data, error } = await supabase
    .from('schedules')
    .select('month')
    .eq('organization_id', organizationId);

  if (error) {
    throw error;
  }

  verifiedExistingScheduleMonths.value = new Set(extractScheduleMonths(data));
}

async function handleCreateNew() {
  if (!canManageSchedules.value) {
    return;
  }

  try {
    await refreshExistingScheduleMonths();
  } catch (error) {
    console.warn('기존 근무표 월 조회 실패:', error);
    showError('이미 생성된 계획월을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.');
    return;
  }

  const defaultMonth = getDefaultSchedulableMonth(existingScheduleMonthSet.value);

  if (!defaultMonth) {
    monthForm.value.month = '';
    showMonthModal.value = false;
    showWarning('현재 기준 과거 12개월부터 미래 12개월 사이에 선택 가능한 계획월이 없습니다.');
    return;
  }

  monthForm.value.month = defaultMonth;
  showMonthModal.value = true;
}

function getReadinessRoute(key: DashboardReadinessKey) {
  if (key === 'organization_profile') {
    return {
      path: getScheduleStepRoutePath(1),
      query: buildScheduleEntryQuery('setup'),
    };
  }

  if (key === 'schedule_foundation') {
    return {
      path: getScheduleStepRoutePath(2),
      query: buildScheduleEntryQuery('setup'),
    };
  }

  return {
    path: getScheduleStepRoutePath(3),
    query: buildScheduleEntryQuery('setup'),
  };
}

async function handleOpenReadinessItem(key: DashboardReadinessKey) {
  if (!hasAdminDashboardAccess.value) {
    return;
  }

  try {
    await router.push(getReadinessRoute(key));
  } catch (error) {
    console.warn('Readiness navigation failed:', error);
    showError('화면을 열지 못했습니다. 잠시 후 다시 시도해주세요.');
  }
}

async function handleViewAllSchedules() {
  try {
    await router.push(getScheduleResultsRoutePath());
  } catch (error) {
    console.warn('Schedule results navigation failed:', error);
    showError('요청한 화면으로 이동하지 못했습니다. 다시 시도해주세요.');
  }
}

async function handleRetryScheduleList() {
  const runId = startDashboardLoadRun();
  await loadSchedules(runId, orgStore.current?.id ?? null);
}

async function handlePrimaryDashboardAction(action: DashboardPrimaryAction) {
  try {
    switch (action.key) {
      case 'retry_readiness':
        await reloadDashboardData();
        return;
      case 'open_readiness_item':
        if (action.readinessKey) {
          await handleOpenReadinessItem(action.readinessKey);
        }
        return;
      case 'retry_schedule_list':
        await handleRetryScheduleList();
        return;
      case 'open_running_schedule':
      case 'open_recent_schedule':
        if (action.schedule) {
          await handleViewSchedule(action.schedule);
        }
        return;
      case 'create_schedule':
        await handleCreateNew();
        return;
      case 'open_schedule_results':
        await router.push(getScheduleResultsRoutePath());
        return;
    }
  } catch (error) {
    console.warn('Dashboard primary action failed:', error);
    showError('요청한 화면으로 이동하지 못했습니다. 다시 시도해주세요.');
  }
}

function buildChecklistBasicInfo(
  month: string,
  scheduleId?: string,
  schedulePublicId?: string
) {
  return {
    scheduleId,
    schedulePublicId,
    month,
    organizationId: orgStore.current!.id,
    organizationName: orgStore.current!.name,
    organizationType: orgStore.current!.type,
    shifts: orgStore.shifts,
    employeeCount: orgStore.employees.length,
  };
}

async function navigateToCanonicalStep5(scheduleKey: string) {
  const compareResponse = await getPhase2ScheduleCompare(scheduleKey);
  const resolvedState = resolveStep5VersionState(compareResponse, null);
  const schedulePublicId = compareResponse.schedulePublicId ?? compareResponse.scheduleId;

  scheduleStore.setBasicInfo({
    ...(scheduleStore.basicInfo ?? buildChecklistBasicInfo(compareResponse.month)),
    scheduleId: compareResponse.scheduleId,
    schedulePublicId,
    month: compareResponse.month ?? scheduleStore.basicInfo?.month ?? '',
    organizationId: compareResponse.organizationId ?? scheduleStore.basicInfo?.organizationId ?? orgStore.current!.id,
  });
  scheduleStore.setSelectedVersionId(resolvedState.selectedVersionId);
  scheduleStore.setPreviewVersionId(resolvedState.previewVersionId);

  await router.push(buildCanonicalStep5RouteLocation(schedulePublicId));
}

function isSelectableDashboardMonth(month: string) {
  return isSchedulableMonthAvailable(month, existingScheduleMonthSet.value);
}

function formatDatePickerMonth(year: number, zeroBasedMonth: number) {
  return `${year}-${String(zeroBasedMonth + 1).padStart(2, '0')}`;
}

function isMonthDateDisabled(timestamp: number, detail: DatePickerDisableDetail) {
  if (detail.type === 'year') {
    return !schedulableMonthWindow.value.some((month) => {
      return month.startsWith(`${detail.year}-`) && isSelectableDashboardMonth(month);
    });
  }

  if (detail.type === 'quarter') {
    const startMonth = (detail.quarter - 1) * 3 + 1;
    return Array.from({ length: 3 }, (_, index) => startMonth + index).every((month) => {
      return !isSelectableDashboardMonth(`${detail.year}-${String(month).padStart(2, '0')}`);
    });
  }

  if (detail.type === 'month') {
    return !isSelectableDashboardMonth(formatDatePickerMonth(detail.year, detail.month));
  }

  return !isSelectableDashboardMonth(dayjs(timestamp).format('YYYY-MM'));
}

async function handleMonthConfirm() {
  // 월 선택 확인
  if (!monthForm.value.month) {
    showWarning('계획월을 선택해주세요');
    return false; // 모달 닫기 방지
  }

  if (!isSelectableDashboardMonth(monthForm.value.month)) {
    showWarning('선택할 수 없는 계획월입니다. 다른 월을 선택해주세요.');
    return false; // 모달 닫기 방지
  }

  // 중복 체크
  modalLoading.value = true;
  try {
    const { data, error } = await supabase
      .from('schedules')
      .select('id, month, status')
      .eq('organization_id', orgStore.current!.id)
      .eq('month', monthForm.value.month)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      showError(`${monthForm.value.month} 근무표가 이미 존재합니다. 다른 월을 선택해주세요.`);
      return false; // 모달 닫기 방지
    }

    // 중복 없음 - scheduleStore에 month 저장 후 Step1으로 이동
    scheduleStore.reset();
    scheduleStore.setBasicInfo({
      month: monthForm.value.month,
      organizationId: orgStore.current!.id,
      organizationName: orgStore.current!.name,
      organizationType: orgStore.current!.type,
      shifts: orgStore.shifts,
      employeeCount: orgStore.employees.length,
    });

    try {
      await router.push(getScheduleStepRoutePath(1));
    } catch (error) {
      console.warn('Schedule creation navigation failed:', error);
      showError('요청한 화면으로 이동하지 못했습니다. 다시 시도해주세요.');
      return false;
    }

    return true; // 모달 닫기 허용
  } catch (error) {
    console.warn('중복 체크 실패:', error);
    showError('월 중복 체크 중 오류가 발생했습니다');
    return false;
  } finally {
    modalLoading.value = false;
  }
}

async function handleViewSchedule(schedule: ScheduleSummary) {
  scheduleStore.reset();
  scheduleStore.setBasicInfo({
    ...buildChecklistBasicInfo(
      schedule.month,
      schedule.id,
      schedule.public_id ?? undefined
    ),
  });

  if (schedule.status === 'error') {
    try {
      await router.push(getScheduleStepRoutePath(4));
    } catch (error) {
      console.warn('Step4 navigation failed:', error);
      showError('요청한 화면으로 이동하지 못했습니다. 다시 시도해주세요.');
    }
    return;
  }

  try {
    await navigateToCanonicalStep5(schedule.public_id ?? schedule.id);
  } catch (error) {
    console.warn('Step5 preview version resolve 실패:', error);
    showError('선택한 근무표 버전을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.');
  }
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    created: '생성됨',
    running: '생성 중',
    complete: '완료',
    changed: '수정됨',
    error: '오류',
  };
  return map[status] || status;
}

function getStatusType(status: string): 'info' | 'success' | 'error' | 'warning' | 'default' {
  const map: Record<string, 'info' | 'success' | 'error' | 'warning' | 'default'> = {
    created: 'info',
    running: 'info',
    complete: 'success',
    changed: 'warning',
    error: 'error',
  };
  return map[status] || 'default';
}

function formatDate(dateStr: string): string {
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm');
}
</script>
