<template>
  <div class="mx-auto max-w-6xl px-4">
    <n-card>
      <template #header>
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">
            근무표 관리
          </h1>
          <n-button
            v-if="canManageSchedules && isDashboardReady && !opsReadinessLoading"
            data-test="dashboard-create-schedule"
            type="primary"
            @click="handleCreateNew"
          >
            <template #icon>
              <span class="text-lg">+</span>
            </template>
            새 근무표 생성
          </n-button>
        </div>
      </template>

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
                필수 정보가 준비되었는지 확인할 수 없어 근무표 생성과 지난 결과를 잠시 숨겼습니다.
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
              아래 3가지를 순서대로 완료하면 근무표 생성과 지난 결과 확인을 사용할 수 있습니다.
            </p>
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
            data-test="dashboard-basic-info-section"
            class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div class="mb-4">
              <p class="text-sm font-medium tracking-wide text-slate-500">
                기본 정보
              </p>
              <h2 class="mt-1 text-xl font-semibold text-slate-900">
                근무표 생성에 필요한 기준 정보를 확인합니다
              </h2>
            </div>

            <div class="divide-y divide-slate-200 rounded-lg border border-slate-200">
              <div
                v-for="item in completeReadinessItems"
                :key="item.key"
                class="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p class="text-sm font-semibold text-slate-900">
                    {{ item.label }}
                  </p>
                  <p class="mt-1 text-sm text-slate-500">
                    {{ item.description }}
                  </p>
                </div>
                <n-button
                  :data-test="`dashboard-basic-info-link-${item.key}`"
                  secondary
                  @click="handleOpenReadinessItem(item.key)"
                >
                  확인하기
                </n-button>
              </div>
            </div>
          </section>

          <section
            data-test="dashboard-create-section"
            class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="text-sm font-medium tracking-wide text-slate-500">
                  근무표 생성
                </p>
                <h2 class="mt-1 text-xl font-semibold text-slate-900">
                  새 계획월의 근무표를 생성합니다
                </h2>
                <p class="mt-2 text-sm text-slate-600">
                  필수 정보가 준비되었습니다. 계획월을 선택해 생성 흐름을 시작하세요.
                </p>
                <p
                  v-if="!canManageSchedules"
                  class="mt-3 text-sm font-medium text-slate-600"
                >
                  근무표 생성 권한이 없는 계정입니다. 기존 정보 확인만 사용할 수 있습니다.
                </p>
              </div>
              <n-button
                v-if="canManageSchedules"
                data-test="dashboard-create-schedule-section"
                type="primary"
                size="large"
                @click="handleCreateNew"
              >
                새 근무표 생성
              </n-button>
            </div>
          </section>

          <section
            data-test="dashboard-history-section"
            class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div class="mb-4">
              <p class="text-sm font-medium tracking-wide text-slate-500">
                지난 결과
              </p>
              <h2 class="mt-1 text-xl font-semibold text-slate-900">
                생성된 근무표를 확인하고 이어서 작업합니다
              </h2>
              <p class="mt-2 text-sm text-slate-600">
                기존 결과 확인, 수정, 삭제는 이 영역에서 시작합니다.
              </p>
            </div>

            <div
              v-if="scheduleListLoadFailed"
              data-test="dashboard-history-error"
              class="rounded-lg border border-amber-200 bg-amber-50/70 p-5"
            >
              <p class="text-base font-semibold text-slate-900">
                지난 결과를 불러오지 못했습니다
              </p>
              <p class="mt-1 text-sm text-slate-600">
                근무표 생성은 계속 사용할 수 있지만, 기존 결과를 확인하려면 목록을 다시 불러와야 합니다.
              </p>
              <n-button
                data-test="dashboard-history-retry"
                class="mt-4"
                secondary
                type="primary"
                @click="loadSchedules"
              >
                다시 불러오기
              </n-button>
            </div>

            <div
              v-else-if="scheduleLoading"
              class="py-12 text-center"
            >
              <n-spin size="large" />
              <p class="mt-4 text-gray-500">
                근무표 목록을 불러오는 중...
              </p>
            </div>

            <div
              v-else-if="schedules.length === 0"
              class="rounded-lg border border-slate-200 bg-slate-50/70 px-5 py-10 text-center"
            >
              <h2 class="mb-2 text-xl font-semibold text-gray-700">
                아직 생성된 근무표가 없습니다
              </h2>
              <p class="mb-6 text-gray-500">
                필수 정보는 준비되었습니다. 첫 근무표를 생성해 이번 달 배정을 시작하세요.
              </p>
              <n-button
                v-if="canManageSchedules"
                data-test="dashboard-create-schedule-empty"
                type="primary"
                size="large"
                @click="handleCreateNew"
              >
                첫 근무표 생성하기
              </n-button>
            </div>

            <div
              v-else
              class="space-y-4"
            >
              <n-card
                v-for="schedule in schedules"
                :key="schedule.id"
                data-test="schedule-card"
                :bordered="true"
                class="cursor-pointer transition-shadow hover:shadow-md"
                @click="handleViewSchedule(schedule)"
              >
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-3">
                      <h3
                        data-test="schedule-card-month"
                        class="text-lg font-semibold"
                      >
                        {{ schedule.month }} 근무표
                      </h3>
                      <n-badge
                        data-test="schedule-card-status"
                        :value="getStatusText(schedule.status)"
                        :type="getStatusType(schedule.status)"
                      />
                    </div>
                    <div class="mt-2 flex gap-6 text-sm text-gray-600">
                      <span>생성일: {{ formatDate(schedule.created_at) }}</span>
                      <span v-if="schedule.hard_score !== null && schedule.soft_score !== null">
                        Hard Score: {{ schedule.hard_score }} / Soft Score: {{ schedule.soft_score }}
                      </span>
                    </div>
                  </div>
                  <div class="flex gap-2">
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
          </section>
        </template>
      </div>
    </n-card>

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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { NCard, NButton, NSpin, NBadge, NModal, NForm, NFormItem, NDatePicker } from 'naive-ui';
import { useOrganizationStore } from '@/stores/organization';
import { useRbacStore } from '@/stores/rbac';
import { useScheduleStore } from '@/stores/schedule';
import { deletePhase2ScheduleMonth, getPhase2ScheduleCompare, getScheduleList } from '@/api/schedule';
import { getChecklist } from '@/api/ops';
import { supabase } from '@/api/supabase';
import { showSuccess, showError, showWarning } from '@/utils/message';
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
  getOpsOrganizationSetupRoutePath,
  getScheduleStepRoutePath,
} from '@/constants/routes';
import dayjs from 'dayjs';
import type { ChecklistItem, ChecklistResponse } from '@/types/ops';

interface Schedule {
  id: string;
  public_id: string | null;
  organization_id: string;
  month: string;
  status: 'created' | 'running' | 'complete' | 'changed' | 'error';
  hard_score: number | null;
  soft_score: number | null;
  created_at: string;
  updated_at: string;
}

const router = useRouter();
const orgStore = useOrganizationStore();
const rbacStore = useRbacStore();
const scheduleStore = useScheduleStore();

const opsReadinessLoading = ref(true);
const opsReadinessLoadFailed = ref(false);
const scheduleLoading = ref(false);
const scheduleListLoadFailed = ref(false);
const schedules = ref<Schedule[]>([]);
const checklist = ref<ChecklistResponse | null>(null);

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
const existingScheduleMonthSet = computed(() => new Set(schedules.value.map((schedule) => schedule.month)));

const REQUIRED_DASHBOARD_READINESS_KEYS = [
  'organization_profile',
  'schedule_foundation',
  'employee_roster',
] as const satisfies readonly ChecklistItem['key'][];

type DashboardReadinessKey = (typeof REQUIRED_DASHBOARD_READINESS_KEYS)[number];

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
    description: '병원 이름과 운영 기준의 기본 단위를 확인합니다.',
    actionLabel: '병원 정보 확인하기',
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

const completeReadinessItems = computed(() => {
  return REQUIRED_DASHBOARD_READINESS_KEYS.map((key) => ({
    key,
    ...READINESS_ITEM_COPY[key],
  }));
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

function resetDashboardData() {
  schedules.value = [];
  checklist.value = null;
  opsReadinessLoadFailed.value = false;
  scheduleListLoadFailed.value = false;
  opsReadinessLoading.value = false;
  scheduleLoading.value = false;
}

async function reloadDashboardData() {
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

  if (!result.success) {
    showError(result.error || '조직 정보를 불러오지 못했습니다.');
    opsReadinessLoading.value = false;
    scheduleLoading.value = false;
    return;
  }

  try {
    if (orgStore.current?.id && typeof orgStore.loadFoundationData === 'function') {
      await orgStore.loadFoundationData(orgStore.current.id);
    }

    const loadedChecklist = await loadChecklist();
    if (!loadedChecklist || !hasRequiredReadinessItems.value || !isDashboardReady.value) {
      schedules.value = [];
      return;
    }

    await loadSchedules();
  } finally {
    opsReadinessLoading.value = false;
  }
}

onMounted(async () => {
  await reloadDashboardData();
});

watch(
  () => rbacStore.selectedOrganizationId,
  async (nextOrganizationId, previousOrganizationId) => {
    if (nextOrganizationId === previousOrganizationId) {
      return;
    }

    await reloadDashboardData();
  },
);

async function loadSchedules() {
  try {
    scheduleLoading.value = true;
    scheduleListLoadFailed.value = false;
    const data = await getScheduleList(orgStore.current!.id);
    schedules.value = data as Schedule[];
  } catch (error) {
    console.warn('근무표 목록 로드 실패:', error);
    schedules.value = [];
    scheduleListLoadFailed.value = true;
  } finally {
    scheduleLoading.value = false;
  }
}

async function loadChecklist(): Promise<ChecklistResponse | null> {
  try {
    const response = await getChecklist(orgStore.current!.id);
    checklist.value = response;
    opsReadinessLoadFailed.value = false;
    return response;
  } catch (error) {
    console.warn('체크리스트 로드 실패:', error);
    checklist.value = null;
    opsReadinessLoadFailed.value = true;
    return null;
  }
}

function handleCreateNew() {
  if (!canManageSchedules.value) {
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
    return getOpsOrganizationSetupRoutePath();
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

    router.push(getScheduleStepRoutePath(1));
    return true; // 모달 닫기 허용
  } catch (error) {
    console.warn('중복 체크 실패:', error);
    showError('월 중복 체크 중 오류가 발생했습니다');
    return false;
  } finally {
    modalLoading.value = false;
  }
}

async function handleViewSchedule(schedule: Schedule) {
  // scheduleStore에 기본 정보 로드
  scheduleStore.reset();
    scheduleStore.setBasicInfo({
      scheduleId: schedule.id,
      schedulePublicId: schedule.public_id ?? undefined,
    month: schedule.month,
    organizationId: orgStore.current!.id,
    organizationName: orgStore.current!.name,
    organizationType: orgStore.current!.type,
    shifts: orgStore.shifts,
    employeeCount: orgStore.employees.length,
  });
  
  if (schedule.status === 'complete' || schedule.status === 'changed') {
    try {
      await navigateToCanonicalStep5(schedule.public_id ?? schedule.id);
      return;
    } catch (error) {
      console.warn('Step5 preview version resolve 실패:', error);
      showError('선택한 근무표 버전을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }
  } else if (schedule.status === 'created' || schedule.status === 'running') {
    try {
      await navigateToCanonicalStep5(schedule.public_id ?? schedule.id);
      return;
    } catch (error) {
      console.warn('Step5 preview version resolve 실패:', error);
      showError('선택한 근무표 버전을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }
  } else {
    window.$message?.info('해당 근무표를 조회할 수 없습니다');
  }
}

async function handleEdit(schedule: Schedule) {
  // running 상태여도 수정 가능하도록 변경 (중간 결과 확인 및 수정 기능 지원)
  // 이전: if (schedule.status === 'running') { ... return; }

  // created, complete, changed, error 상태는 모두 수정 가능
  scheduleStore.reset();
  scheduleStore.setBasicInfo({
    scheduleId: schedule.id,
    schedulePublicId: schedule.public_id ?? undefined,
    month: schedule.month,
    organizationId: orgStore.current!.id,
    organizationName: orgStore.current!.name,
    organizationType: orgStore.current!.type,
    shifts: orgStore.shifts,
    employeeCount: orgStore.employees.length,
  });
  
  // Step1부터 다시 시작 (시프트, 사이트 정보 등 재설정)
  router.push(getScheduleStepRoutePath(1));
}

function handleDelete(schedule: Schedule) {
  window.$dialog?.warning({
    title: '근무표 삭제',
    content: `${schedule.month} 근무표를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
    positiveText: '삭제',
    negativeText: '취소',
    onPositiveClick: async () => {
      try {
        await deletePhase2ScheduleMonth({
          organizationId: schedule.organization_id,
          month: schedule.month,
        });
        showSuccess('근무표가 삭제되었습니다');
        await loadSchedules();
      } catch (error) {
        console.warn('삭제 실패:', error);
        showError(getDeleteScheduleErrorMessage(error));
      }
    },
  });
}

function readDeleteScheduleErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const candidate = error as { code?: unknown; message?: unknown };
  if (typeof candidate.code === 'string' && candidate.code.length > 0) {
    return candidate.code;
  }
  if (typeof candidate.message === 'string' && /^[a-z0-9_]+$/.test(candidate.message)) {
    return candidate.message;
  }

  return null;
}

function getDeleteScheduleErrorMessage(error: unknown): string {
  switch (readDeleteScheduleErrorCode(error)) {
    case 'already_finalized':
      return '확정된 근무표는 삭제할 수 없습니다.';
    case 'version_locked_for_solving':
      return '근무표 생성이 진행 중입니다. 완료 후 다시 삭제해주세요.';
    default:
      return '삭제 중 오류가 발생했습니다';
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
