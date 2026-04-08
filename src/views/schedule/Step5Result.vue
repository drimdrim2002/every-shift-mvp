<template>
  <div class="mx-auto max-w-7xl px-4">
    <StepIndicator :current-step="5" />

    <n-card title="근무표 생성 - 결과 확인">
      <ComparisonToolsSection
        v-if="shouldShowComparisonTools"
        :collapsed="isComparisonToolsCollapsed"
        :candidate-count="comparisonCandidateVersions.length"
        :compare-count="compareVersionIds.length"
        @toggle-collapsed="handleToggleComparisonTools"
      >
        <VersionCandidateShelf
          :versions="comparisonCandidateVersions"
          :compare-version-ids="compareVersionIds"
          :focused-version-id="previewVersionId"
          :selected-version-id="selectedVersionId"
          :locked-version-id="lockedVersionId"
          @toggle-compare="handleToggleCompareVersion"
          @focus-version="handleFocusVersionChange"
          @select-version="handleSelectCandidateVersion"
        />

        <div class="my-6">
          <ComparisonWorkspace
            :left-version="leftComparedVersion"
            :right-version="rightComparedVersion"
            :left-review="leftComparedReview"
            :right-review="rightComparedReview"
            :focused-version-id="previewVersionId"
            @focus-version="handleFocusVersionChange"
          />
        </div>
      </ComparisonToolsSection>

      <FocusedVersionActionBar
        :focused-version="previewVersionSummary"
        :selected-version="selectedVersionSummary"
        :primary-action="primaryAction"
        :support-copy="primaryActionSupportCopy"
        :selecting="isSelectingPreview"
        :acting="isPrimaryActionRunning"
        :show-version-context="shouldShowComparisonTools"
        @primary-action="handlePrimaryAction"
      />

      <!-- 상태 표시 -->
      <div class="mb-6 flex items-center justify-between rounded bg-gray-50 p-4">
        <div class="flex items-center gap-4">
          <n-badge
            :value="statusText"
            :type="statusType"
          />
          <n-progress
            v-if="isRunning"
            type="line"
            :percentage="solver.progress.value"
            class="w-48"
          />
        </div>
        <div class="text-sm">
          <span class="mr-4">Hard Score: <strong>{{ solver.hardScore.value }}</strong></span>
          <span>Soft Score: <strong>{{ solver.softScore.value }}</strong></span>
        </div>
      </div>

      <div
        v-if="isPreRun"
        class="mb-6"
      >
        <div class="mb-2 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-700">
            전월 데이터 표시 일수
          </h3>
          <span class="text-sm text-gray-500">{{ lastMonthDays }}일</span>
        </div>
        <n-slider
          v-model:value="lastMonthDays"
          :min="0"
          :max="maxVisibleLastMonthDays"
          :step="1"
          :disabled="maxVisibleLastMonthDays === 0"
        />
      </div>

      <n-alert
        v-if="isVersionReadOnly"
        type="warning"
        class="mb-6"
      >
        현재 자세히 보고 있는 안은 편집할 수 없습니다. (생성 중 또는 최종 확정됨)
      </n-alert>

      <n-alert
        v-if="showIntermediateWaitingHint"
        type="info"
        class="mb-6"
      >
        중간 결과 대기 중 (엔진이 아직 partial result를 제공하지 않았습니다)
      </n-alert>

      <div
        v-if="canRecoverSolverState"
        class="mb-6 flex flex-wrap gap-2"
      >
        <n-button
          size="small"
          :loading="isRecoveringSolver"
          :disabled="isRecoveringSolver"
          @click="handleSyncSolverState"
        >
          상태 재동기화
        </n-button>
        <n-button
          size="small"
          type="warning"
          :loading="isRecoveringSolver"
          :disabled="isRecoveringSolver"
          @click="handleForceResetSolverState"
        >
          생성 중단 후 초기화
        </n-button>
      </div>

      <!-- 변경 사항 알림 -->
      <n-alert
        v-if="changedCells.size > 0"
        type="warning"
        class="mb-6"
      >
        <strong>{{ changedCells.size }}개의 변경사항</strong>이 있습니다. "저장" 버튼을 클릭하여 저장하세요.
      </n-alert>

      <div class="my-6">
        <VersionReviewDetail
          :review="review"
          :active-tab="activeReviewTab"
          :focus-title="reviewFocusTitle"
          @update:tab="handleReviewTabChange"
        >
          <template #grid>
            <ScheduleGrid
              v-if="grid.employees.value.length > 0"
              mode="result"
              :employees="grid.employees.value"
              :dates="grid.dates.value"
              :assignments="grid.assignments.value"
              :shift-colors="shiftColors"
              :off-requests="offRequestsCurrentMonth"
              :off-request-notes="offRequestNotesCurrentMonth"
              :preference-display-mode="preferenceDisplayMode"
              :allow-pre-run-fallback-when-empty="allowPreRunFallbackWhenEmpty"
              :readonly="isReadonlyGrid"
              :show-last-month="true"
              result-cell-layout="single-box"
              @update:assignment="handleAssignmentUpdate"
            />
            <div
              v-else
              class="text-center text-gray-500"
            >
              결과 로딩 중...
            </div>
          </template>

          <template #proof>
            <p
              v-if="review?.latestEvaluation?.violationDetails.length"
              class="text-sm text-slate-700"
            >
              {{ review.latestEvaluation.violationDetails[0]?.message }}
            </p>
          </template>

          <template #offRequests>
            <p class="text-sm text-slate-700">
              미충족 Off 요청 {{ review?.latestEvaluation?.offRequestResults.length ?? 0 }}건
            </p>
          </template>
        </VersionReviewDetail>
      </div>

      <!-- 버튼 -->
      <div class="flex flex-col gap-4 pt-6 sm:flex-row sm:justify-between">
        <div class="flex flex-col gap-2 sm:flex-row">
          <n-button
            size="medium"
            @click="handleBack"
          >
            ← 이전
          </n-button>
          <n-button
            size="medium"
            data-test="go-dashboard-button"
            @click="handleGoDashboard"
          >
            근무표 관리로
          </n-button>
        </div>

        <div class="flex flex-col items-start gap-3">
          <p
            v-if="isFinished"
            class="text-xs leading-5 text-slate-500"
          >
            같은 안을 다시 생성하려면 더 개선하기를 사용하고, 입력을 바꿔 비교안을 만들려면 이전 단계로 돌아가세요.
          </p>

          <div class="flex flex-col gap-4 sm:flex-row">
            <n-button
              v-if="canCancel"
              size="medium"
              type="warning"
              :disabled="isVersionReadOnly"
              @click="handleResetCurrentVersion"
            >
              현재 안 초기화
            </n-button>

            <n-button
              v-if="canCancel"
              size="medium"
              type="error"
              :disabled="isResetActiveFlowDisabled"
              @click="handleResetActiveMonthFlow"
            >
              이번 달 새로 시작
            </n-button>

            <n-button
              v-if="isFinished"
              size="medium"
              :disabled="isVersionReadOnly"
              @click="handleCreateCompareCandidate"
            >
              입력 변경 후 비교안 만들기
            </n-button>

            <n-button
              v-if="isPreRun"
              data-test="start-solver-button"
              :type="primaryAction.kind === 'none' ? 'primary' : 'default'"
              size="medium"
              :loading="isStartingSolver"
              :disabled="isStartingSolver || isVersionReadOnly"
              @click="handleStartSolver"
            >
              근무표 생성 (AI)
            </n-button>

            <n-button
              v-if="isFinished && changedCells.size > 0"
              size="medium"
              :disabled="isVersionReadOnly"
              @click="handleReset"
            >
              변경 사항 취소
            </n-button>

            <n-button
              v-if="isFinished"
              size="medium"
              :disabled="isVersionReadOnly"
              @click="handleRegenerate"
            >
              더 개선하기
            </n-button>

            <n-button
              v-if="isFinished"
              size="medium"
              @click="handleExport"
            >
              엑셀 다운로드
            </n-button>

            <n-button
              v-if="isFinished"
              size="medium"
              :disabled="isVersionReadOnly"
              @click="handleSave"
            >
              저장
            </n-button>
          </div>
        </div>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NCard, NButton, NBadge, NProgress, NAlert, NSlider } from 'naive-ui';
import StepIndicator from '@/components/schedule/StepIndicator.vue';
import ScheduleGrid from '@/components/schedule/ScheduleGrid.vue';
import { useAISolver } from '@/composables/useAISolver';
import { useScheduleReviewHub } from '@/composables/useScheduleReviewHub';
import { useScheduleGrid } from '@/composables/useScheduleGrid';
import ComparisonToolsSection from '@/components/schedule/review/ComparisonToolsSection.vue';
import VersionCandidateShelf from '@/components/schedule/review/VersionCandidateShelf.vue';
import ComparisonWorkspace from '@/components/schedule/review/ComparisonWorkspace.vue';
import FocusedVersionActionBar from '@/components/schedule/review/FocusedVersionActionBar.vue';
import VersionReviewDetail from '@/components/schedule/review/VersionReviewDetail.vue';
import { useAuthStore } from '@/stores/auth';
import { useScheduleStore } from '@/stores/schedule';
import { useOrganizationStore } from '@/stores/organization';
import {
  getPreviousMonthFinalizedContext,
  patchPhase2ScheduleVersionAssignments,
  getScheduleStatus,
  getScheduleVersionAssignments,
  getScheduleVersionPreferences,
  resetPhase2ScheduleActiveFlow,
  refreshPreferenceResolutionByVersion,
  resetPreferenceResolutionByVersion,
  selectPhase2ScheduleVersion,
  recheckPhase2ScheduleVersion,
  finalizePhase2ScheduleVersion,
  submitPhase2ScheduleVersionSolverResult,
  deleteThisMonthVersionAssignments,
  getPlanningEmployees,
  getPlanningAssignmentsForVersion,
} from '@/api/schedule';
import { loadSiteRequirements } from '@/api/employee';
import { mapToSolverRequest } from '@/utils/solverMapper';
import { exportToExcel } from '@/utils/excel';
import { showSuccess, showError, showInfo } from '@/utils/message';
import {
  buildPrimaryActionSupportCopy,
  resolveDefaultReviewTab,
} from '@/utils/scheduleReviewState';
import { buildStep5Route } from '@/utils/scheduleVersionResolver';
import {
  buildRollingHistoryWindow,
  mergeAssignmentMapsWithFallback,
} from '@/utils/rollingHistory';
import { clearScopedTempPreferencesStorage } from '@/utils/tempPreferencesStorage';
import type {
  AssignmentMap,
  ConstraintMap,
  CommentMap,
  PlanningAssignment,
  SchedulePrimaryAction,
  ScheduleReviewResponse,
  ScheduleVersionSummary,
  ScheduleVersionStatus,
} from '@/types/schedule';

const route = useRoute();
const router = useRouter();
const solver = useAISolver();
const hub = useScheduleReviewHub();
const grid = useScheduleGrid();
const authStore = useAuthStore();
const scheduleStore = useScheduleStore();
const organizationStore = useOrganizationStore();

const DB_REFRESH_INTERVAL_MS = 10000;
const MEMORY_TO_DB_GRACE_MS = 2000;
const WAITING_HINT_TICKS = 3;

const routeScheduleId = computed(() => {
  const paramId = route.params.id;
  return typeof paramId === 'string' && paramId.length > 0 ? paramId : null;
});
const scheduleId = computed(() => routeScheduleId.value ?? scheduleStore.basicInfo?.scheduleId ?? null);
const previewVersionId = computed(() => hub.previewVersionId.value);
const selectedVersionId = computed(() => hub.selectedVersionId.value);
const compareVersionIds = computed(() => hub.compareVersionIds.value);
const compareVersions = hub.versions;
const review = computed(() => hub.review.value);
const comparedReviews = computed(() => hub.comparedReviews.value);
const lockedVersionId = computed(() => {
  return review.value?.finalizedVersionId ?? scheduleStore.compareMatrix?.finalizedVersionId ?? null;
});
const changedCells = ref<Set<string>>(new Set());
const originalCurrentAssignments = ref<AssignmentMap>({});
let assignmentRefreshInterval: number | null = null;
const isDbRefreshing = ref(false);
const lastMemoryAppliedAt = ref(0);
const lastMemoryHash = ref('');
const hasIntermediateResult = ref(false);
const runningTicksWithoutIntermediate = ref(0);
const warnedUnknownShiftIds = ref<Set<string>>(new Set());
const isStartingSolver = ref(false);
const isRecoveringSolver = ref(false);
const isSelectingPreview = computed(() => hub.isSelecting.value);
const isPrimaryActionRunning = ref(false);
const isComparisonToolsCollapsed = ref(false);
const lastMonthDays = ref(5);
const maxVisibleLastMonthDays = ref(0);
const hasInitializedLastMonthDays = ref(false);
const previousMonthAssignments = ref<AssignmentMap>({});
const previousMonthFallbackAssignments = ref<AssignmentMap>({});
const previousMonthFallbackPlanningAssignments = ref<PlanningAssignment[]>([]);
const previousMonthFallbackError = ref<string | null>(null);
const currentScheduleAssignments = ref<AssignmentMap>({});
const offRequestsCurrentMonth = ref<ConstraintMap>({});
const offRequestNotesCurrentMonth = ref<CommentMap>({});
const EMPTY_PRIMARY_ACTION: SchedulePrimaryAction = {
  kind: 'none',
  targetVersionId: null,
  label: '선택 가능한 작업이 없습니다.',
  disabledReason: null,
};

function getRequestedPreviewVersionId(): string | null {
  const routeQueryVersion = route.query.version;
  return typeof routeQueryVersion === 'string' && routeQueryVersion.length > 0
    ? routeQueryVersion
    : null;
}

function syncScheduleIdToStore(nextScheduleId: string) {
  if (!scheduleStore.basicInfo || scheduleStore.basicInfo.scheduleId === nextScheduleId) {
    return;
  }

  scheduleStore.setBasicInfo({
    ...scheduleStore.basicInfo,
    scheduleId: nextScheduleId,
  });
}

function ensureScheduleId(): string {
  const currentScheduleId = scheduleId.value;

  if (!currentScheduleId) {
    throw new Error('스케줄 ID를 확인할 수 없습니다. Step4부터 다시 시도해주세요.');
  }

  syncScheduleIdToStore(currentScheduleId);
  return currentScheduleId;
}

interface ScheduleStatusRow {
  status: 'created' | 'running' | 'complete' | 'changed' | 'error';
  hard_score: number | null;
  soft_score: number | null;
  solver_execution_id: string | null;
}

const isRunning = computed(() => solver.status.value === 'running');
const isFinished = computed(() => solver.status.value === 'complete' || solver.status.value === 'changed');
const isPreRun = computed(() => solver.status.value === 'created' || solver.status.value === 'error');
const previewVersionStatus = computed<ScheduleVersionStatus>(() => {
  if (!previewVersionId.value) return 'draft';
  if (
    review.value?.version?.id === previewVersionId.value
    && review.value.latestEvaluation !== null
  ) {
    return review.value.version.status;
  }
  return compareVersions.value.find((version) => version.id === previewVersionId.value)?.status ?? 'draft';
});
const isVersionReadOnly = computed(() => {
  if (!previewVersionId.value) return true;
  return Boolean(lockedVersionId.value)
    || previewVersionStatus.value === 'solving'
    || previewVersionStatus.value === 'finalized';
});
const canMutatePreviewVersion = computed(() => {
  return !!previewVersionId.value && !isVersionReadOnly.value;
});
const isResetActiveFlowDisabled = computed(() => {
  return Boolean(lockedVersionId.value) || !scheduleId.value;
});
const previousMonthPrefix = computed(() => {
  if (!scheduleStore.basicInfo?.month) return '';
  return dayjs(`${scheduleStore.basicInfo.month}-01`).subtract(1, 'month').format('YYYY-MM');
});

const statusText = computed(() => {
  const map: Record<string, string> = {
    running: '생성 중',
    complete: '완료',
    error: '오류 (재시도 가능)',
    changed: '수정됨',
    created: '생성 전',
  };
  return map[solver.status.value] || '알 수 없음';
});

const statusType = computed(() => {
  const map: Record<string, 'info' | 'success' | 'error' | 'warning' | 'default'> = {
    running: 'info',
    complete: 'success',
    error: 'error',
    changed: 'warning',
    created: 'default',
  };
  return map[solver.status.value] || 'default';
});

const isReadonlyGrid = computed(() => {
  return !isFinished.value || !canMutatePreviewVersion.value;
});
const preferenceDisplayMode = computed<'pre-run' | 'post-run'>(() => {
  return isPreRun.value ? 'pre-run' : 'post-run';
});
const allowPreRunFallbackWhenEmpty = computed(() => solver.status.value === 'running');

const showIntermediateWaitingHint = computed(() => {
  return (
    solver.status.value === 'running'
    && !hasIntermediateResult.value
    && runningTicksWithoutIntermediate.value >= WAITING_HINT_TICKS
  );
});

function formatVersionLabel(version: ScheduleVersionSummary | null): string {
  if (!version) return '없음';
  return version.name ?? `V${version.versionNo}`;
}

function hasCompareCandidateSignal(version: ScheduleVersionSummary): boolean {
  return (
    version.manualEditCount > 0
    || Boolean(version.inputDiffSummary?.note)
    || (version.inputDiffSummary?.changedOffRequests ?? 0) > 0
    || (version.inputDiffSummary?.changedLockedAssignments ?? 0) > 0
    || (version.inputDiffSummary?.changedSiteRequirements ?? 0) > 0
  );
}

const previewVersionSummary = computed(() => {
  if (!previewVersionId.value) return null;
  const comparedVersion = compareVersions.value.find((version) => version.id === previewVersionId.value) ?? null;
  const reviewedVersion = review.value?.version?.id === previewVersionId.value ? review.value.version : null;
  const shouldUseReviewedVersion = review.value?.latestEvaluation !== null;

  if (reviewedVersion && comparedVersion && shouldUseReviewedVersion) {
    return {
      ...comparedVersion,
      ...reviewedVersion,
    };
  }

  return comparedVersion ?? reviewedVersion;
});
const selectedVersionSummary = computed(() => {
  if (!selectedVersionId.value) return null;
  return compareVersions.value.find((version) => version.id === selectedVersionId.value) ?? null;
});
const comparisonCandidateVersions = computed(() => {
  return compareVersions.value.filter((version) => {
    return (
      version.id === selectedVersionId.value
      || compareVersionIds.value.includes(version.id)
      || hasCompareCandidateSignal(version)
    );
  });
});
const comparedVersionSummaries = computed(() => {
  return compareVersionIds.value
    .map((versionId) => {
      const comparedVersion = compareVersions.value.find((version) => version.id === versionId) ?? null;
      const reviewedVersion = comparedReviews.value[versionId]?.version ?? null;

      if (comparedVersion && reviewedVersion) {
        return {
          ...comparedVersion,
          ...reviewedVersion,
        } as ScheduleVersionSummary;
      }

      return comparedVersion ?? reviewedVersion;
    })
    .filter((version): version is ScheduleVersionSummary => version !== null);
});
const leftComparedVersion = computed(() => comparedVersionSummaries.value[0] ?? null);
const rightComparedVersion = computed(() => comparedVersionSummaries.value[1] ?? null);
const leftComparedReview = computed<ScheduleReviewResponse | null>(() => {
  return leftComparedVersion.value ? comparedReviews.value[leftComparedVersion.value.id] ?? null : null;
});
const rightComparedReview = computed<ScheduleReviewResponse | null>(() => {
  return rightComparedVersion.value ? comparedReviews.value[rightComparedVersion.value.id] ?? null : null;
});
const focusedVersionTitle = computed(() => {
  return previewVersionSummary.value ? `${formatVersionLabel(previewVersionSummary.value)}안` : null;
});
const reviewFocusTitle = computed(() => {
  return shouldShowComparisonTools.value ? focusedVersionTitle.value : null;
});
const primaryAction = computed(() => {
  return review.value?.primaryAction ?? EMPTY_PRIMARY_ACTION;
});
const activeReviewTab = computed(() => scheduleStore.reviewTab);
const selectedGate = computed(() => {
  return selectedVersionSummary.value?.finalizationGate
    ?? scheduleStore.latestEvaluation?.finalizationGate
    ?? null;
});
const primaryActionSupportCopy = computed(() => {
  return buildPrimaryActionSupportCopy({
    action: primaryAction.value,
    gate: selectedGate.value,
    latestEvaluation: review.value?.latestEvaluation ?? null,
  });
});
const previewVersionExecutionId = computed(() => {
  return previewVersionSummary.value?.activeSolverExecutionId ?? null;
});
const canRecoverSolverState = computed(() => {
  return previewVersionStatus.value === 'solving';
});
const isFinalizedMonth = computed(() => Boolean(lockedVersionId.value));
const shouldShowComparisonTools = computed(() => {
  if (isFinalizedMonth.value) {
    return false;
  }

  return compareVersionIds.value.length >= 2 && comparisonCandidateVersions.value.length >= 2;
});

function syncReviewTabForPreview() {
  scheduleStore.setReviewTab(resolveDefaultReviewTab(previewVersionStatus.value));
}

function getActiveSolvingVersionId(): string | null {
  return scheduleStore.compareMatrix?.activeSolvingVersionId ?? null;
}

const shiftIdToCodeMap = computed(() => {
  const map = new Map<string, string>();
  for (const shift of organizationStore.shifts) {
    map.set(shift.id, shift.code);
  }
  return map;
});

const shiftColors = computed(() => {
  const map: Record<string, string> = {};
  for (const shift of organizationStore.shifts) {
    if (!shift.code || !shift.colorCode) continue;
    map[shift.code] = shift.colorCode;
  }
  return map;
});

const knownShiftCodes = computed(() => {
  return new Set(organizationStore.shifts.map((shift) => shift.code));
});

const canCancel = computed(() => {
  if (solver.status.value === 'complete' || solver.status.value === 'changed') {
    return true;
  }

  if (!scheduleStore.basicInfo?.month) return false;

  const currentMonth = scheduleStore.basicInfo.month;

  for (const dateMap of Object.values(currentScheduleAssignments.value)) {
    for (const [date, shiftCode] of Object.entries(dateMap || {})) {
      if (date.startsWith(currentMonth) && shiftCode) {
        return true;
      }
    }
  }

  return false;
});

function resetRealtimeState() {
  isDbRefreshing.value = false;
  lastMemoryAppliedAt.value = 0;
  lastMemoryHash.value = '';
  hasIntermediateResult.value = false;
  runningTicksWithoutIntermediate.value = 0;
  warnedUnknownShiftIds.value = new Set();
}

async function loadPreviousMonthFallback() {
  const basicInfo = scheduleStore.basicInfo;
  if (!basicInfo?.organizationId || !basicInfo.month) {
    previousMonthFallbackAssignments.value = {};
    previousMonthFallbackPlanningAssignments.value = [];
    previousMonthFallbackError.value = null;
    return;
  }

  previousMonthFallbackError.value = null;

  try {
    const context = await getPreviousMonthFinalizedContext(
      basicInfo.organizationId,
      basicInfo.month,
    );

    previousMonthFallbackAssignments.value = context?.displayAssignments ?? {};
    previousMonthFallbackPlanningAssignments.value = context?.planningAssignments ?? [];
  } catch (error) {
    previousMonthFallbackAssignments.value = {};
    previousMonthFallbackPlanningAssignments.value = [];
    previousMonthFallbackError.value = error instanceof Error
      ? error.message
      : '전월 rolling history 조회 실패';
  }
}

function hashAssignmentMap(assignments: AssignmentMap): string {
  const employeeIds = Object.keys(assignments).sort();
  return employeeIds
    .map((employeeId) => {
      const dateMap = assignments[employeeId] || {};
      const dates = Object.keys(dateMap).sort();
      const dateTokens = dates.map((date) => `${date}=${dateMap[date] || ''}`);
      return `${employeeId}:${dateTokens.join(',')}`;
    })
    .join('|');
}

function splitAssignmentsByMonth(assignments: AssignmentMap): {
  currentAssignments: AssignmentMap;
  previousAssignments: AssignmentMap;
  previousDates: Set<string>;
} {
  const currentAssignments: AssignmentMap = {};
  const previousAssignments: AssignmentMap = {};
  const previousDates = new Set<string>();
  const currentMonth = scheduleStore.basicInfo?.month || '';
  const previousMonth = previousMonthPrefix.value;

  for (const [employeeId, dateMap] of Object.entries(assignments)) {
    for (const [date, shiftCode] of Object.entries(dateMap || {})) {
      if (!shiftCode) continue;

      if (currentMonth && date.startsWith(currentMonth)) {
        if (!currentAssignments[employeeId]) currentAssignments[employeeId] = {};
        currentAssignments[employeeId]![date] = shiftCode;
        continue;
      }

      if (previousMonth && date.startsWith(previousMonth)) {
        if (!previousAssignments[employeeId]) previousAssignments[employeeId] = {};
        previousAssignments[employeeId]![date] = shiftCode;
        previousDates.add(date);
      }
    }
  }

  return { currentAssignments, previousAssignments, previousDates };
}

function createEmptyConstraintMapForEmployees(): ConstraintMap {
  const map: ConstraintMap = {};
  for (const employee of grid.employees.value) {
    map[employee.id] = {};
  }
  return map;
}

function createEmptyCommentMapForEmployees(): CommentMap {
  const map: CommentMap = {};
  for (const employee of grid.employees.value) {
    map[employee.id] = {};
  }
  return map;
}

async function loadPreferencesForDisplay() {
  const emptyConstraints = createEmptyConstraintMapForEmployees();
  const emptyNotes = createEmptyCommentMapForEmployees();
  const currentMonth = scheduleStore.basicInfo?.month || '';
  const versionId = previewVersionId.value;

  if (!currentMonth || !versionId) {
    offRequestsCurrentMonth.value = emptyConstraints;
    offRequestNotesCurrentMonth.value = emptyNotes;
    return;
  }

  const { constraints, notes } = await getScheduleVersionPreferences(versionId);

  const filteredConstraints: ConstraintMap = createEmptyConstraintMapForEmployees();
  const filteredNotes: CommentMap = createEmptyCommentMapForEmployees();

  for (const [employeeId, dateMap] of Object.entries(constraints)) {
    if (!filteredConstraints[employeeId]) filteredConstraints[employeeId] = {};
    for (const [date, requestCode] of Object.entries(dateMap || {})) {
      if (!date.startsWith(currentMonth)) continue;
      if (requestCode !== 'O') continue;
      filteredConstraints[employeeId]![date] = 'O';
    }
  }

  for (const [employeeId, dateMap] of Object.entries(notes)) {
    if (!filteredNotes[employeeId]) filteredNotes[employeeId] = {};
    for (const [date, note] of Object.entries(dateMap || {})) {
      if (!date.startsWith(currentMonth)) continue;
      if (!note) continue;
      filteredNotes[employeeId]![date] = note;
    }
  }

  offRequestsCurrentMonth.value = filteredConstraints;
  offRequestNotesCurrentMonth.value = filteredNotes;
}

function calculateMaxVisibleLastMonthDays(previousDates: Set<string>): number {
  if (previousDates.size === 0) return 0;

  const sorted = Array.from(previousDates).sort((a, b) => a.localeCompare(b));
  const minDate = sorted[0];
  const maxDate = sorted[sorted.length - 1];
  if (!minDate || !maxDate) return 0;

  const visibleRangeDays = dayjs(maxDate).diff(dayjs(minDate), 'day') + 1;
  return Math.min(5, Math.max(1, visibleRangeDays));
}

function syncLastMonthDayWindow(previousDates: Set<string>) {
  const maxDays = calculateMaxVisibleLastMonthDays(previousDates);
  maxVisibleLastMonthDays.value = maxDays;

  if (maxDays === 0) {
    lastMonthDays.value = 0;
    hasInitializedLastMonthDays.value = true;
    return;
  }

  if (!hasInitializedLastMonthDays.value) {
    lastMonthDays.value = maxDays;
    hasInitializedLastMonthDays.value = true;

    if (scheduleStore.basicInfo && getDisplayedLastMonthDates().size !== maxDays) {
      grid.generateDates(scheduleStore.basicInfo.month, maxDays);
    }

    return;
  }

  if (lastMonthDays.value > maxDays) {
    lastMonthDays.value = maxDays;
  } else if (lastMonthDays.value === 0) {
    lastMonthDays.value = 1;
  }
}

function getDisplayedLastMonthDates(): Set<string> {
  return new Set(
    grid.dates.value
      .filter((date) => date.isLastMonth)
      .map((date) => date.date)
  );
}

function rebuildDisplayAssignments(baseCurrentAssignments: AssignmentMap = currentScheduleAssignments.value) {
  const mergedAssignments: AssignmentMap = JSON.parse(JSON.stringify(baseCurrentAssignments || {}));

  for (const employee of grid.employees.value) {
    if (!mergedAssignments[employee.id]) {
      mergedAssignments[employee.id] = {};
    }
  }

  const displayedLastMonthDates = getDisplayedLastMonthDates();
  for (const [employeeId, dateMap] of Object.entries(previousMonthAssignments.value)) {
    if (!mergedAssignments[employeeId]) {
      mergedAssignments[employeeId] = {};
    }

    for (const [date, shiftCode] of Object.entries(dateMap || {})) {
      if (!displayedLastMonthDates.has(date) || !shiftCode) continue;
      mergedAssignments[employeeId]![date] = shiftCode;
    }
  }

  grid.assignments.value = mergedAssignments;
}

function mapIntermediateShiftIdsToCodes(intermediateAssignments: AssignmentMap): AssignmentMap {
  const mappedAssignments: AssignmentMap = {};
  const idToCode = shiftIdToCodeMap.value;
  const validCodes = knownShiftCodes.value;

  for (const [employeeId, dateMap] of Object.entries(intermediateAssignments)) {
    if (!mappedAssignments[employeeId]) {
      mappedAssignments[employeeId] = {};
    }

    for (const [date, shiftIdentifier] of Object.entries(dateMap || {})) {
      if (!shiftIdentifier) continue;

      const mappedShiftCode = idToCode.get(shiftIdentifier);
      if (mappedShiftCode) {
        mappedAssignments[employeeId]![date] = mappedShiftCode;
        continue;
      }

      if (validCodes.has(shiftIdentifier)) {
        mappedAssignments[employeeId]![date] = shiftIdentifier;
        continue;
      }

      if (!warnedUnknownShiftIds.value.has(shiftIdentifier)) {
        warnedUnknownShiftIds.value.add(shiftIdentifier);
        console.warn('[Step5] Unknown shift identifier in intermediate result:', shiftIdentifier);
      }
    }
  }

  return mappedAssignments;
}

function applyIntermediateAssignments(intermediateAssignments: AssignmentMap): number {
  const mappedAssignments = mapIntermediateShiftIdsToCodes(intermediateAssignments);
  const nextCurrentAssignments: AssignmentMap = JSON.parse(
    JSON.stringify(currentScheduleAssignments.value || {})
  );
  let appliedCount = 0;

  for (const [employeeId, dateMap] of Object.entries(mappedAssignments)) {
    if (!nextCurrentAssignments[employeeId]) {
      nextCurrentAssignments[employeeId] = {};
    }

    for (const [date, shiftCode] of Object.entries(dateMap || {})) {
      if (!shiftCode) continue;
      if (!isCurrentMonthDate(date)) continue;
      nextCurrentAssignments[employeeId]![date] = shiftCode;
      appliedCount++;
    }
  }

  if (appliedCount > 0) {
    currentScheduleAssignments.value = nextCurrentAssignments;
    rebuildDisplayAssignments(nextCurrentAssignments);
    lastMemoryAppliedAt.value = Date.now();
  }

  return appliedCount;
}

function applyScheduleStatus(schedule: ScheduleStatusRow) {
  solver.hardScore.value = schedule.hard_score || 0;
  solver.softScore.value = schedule.soft_score || 0;
}

function readErrorCode(error: unknown): string | null {
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

function mapVersionStatusToSolverStatus(status: ScheduleVersionStatus): 'created' | 'complete' | 'changed' | 'error' {
  switch (status) {
    case 'solve_failed':
      return 'error';
    case 'review_pending':
      return 'changed';
    case 'review_ready':
    case 'review_blocked':
    case 'infeasible':
    case 'finalized':
      return 'complete';
    case 'solving':
    case 'draft':
    default:
      return 'created';
  }
}

async function loadCurrentAssignments(options: { syncOriginal?: boolean; clearChanges?: boolean; forceAssignmentSync?: boolean } = {}) {
  const { syncOriginal = false, clearChanges = false, forceAssignmentSync = false } = options;
  const versionId = previewVersionId.value;

  if (!versionId) {
    currentScheduleAssignments.value = {};
    previousMonthAssignments.value = {};
    grid.assignments.value = {};
    grid.offReasons.value = {};
    if (clearChanges) {
      changedCells.value.clear();
    }
    return;
  }

  const currentMonth = scheduleStore.basicInfo?.month;
  if (!currentMonth) {
    currentScheduleAssignments.value = {};
    previousMonthAssignments.value = {};
    grid.assignments.value = {};
    grid.offReasons.value = {};
    if (clearChanges) {
      changedCells.value.clear();
    }
    return;
  }

  const data = await getScheduleVersionAssignments(versionId);
  const { currentAssignments, previousAssignments } = splitAssignmentsByMonth(
    data.assignments,
  );

  const mergedPreviousAssignments = mergeAssignmentMapsWithFallback(
    previousAssignments,
    previousMonthFallbackAssignments.value,
    buildRollingHistoryWindow(currentMonth, 5).previousMonthDates,
  );

  if (solver.status.value !== 'running') {
    previousMonthAssignments.value = mergedPreviousAssignments;
    const mergedPreviousDates = new Set<string>();
    for (const dateMap of Object.values(mergedPreviousAssignments)) {
      for (const [date, shiftCode] of Object.entries(dateMap || {})) {
        if (!shiftCode) continue;
        mergedPreviousDates.add(date);
      }
    }
    syncLastMonthDayWindow(mergedPreviousDates);
  }

  const hasDbAssignments = Object.values(currentAssignments).some((dateMap) => {
    return Object.values(dateMap || {}).some((shiftCode) => Boolean(shiftCode));
  });

  if (solver.status.value === 'running' && hasDbAssignments && !hasIntermediateResult.value) {
    hasIntermediateResult.value = true;
    runningTicksWithoutIntermediate.value = 0;
  }

  const withinGraceWindow = (
    !forceAssignmentSync
    && solver.status.value === 'running'
    && Date.now() - lastMemoryAppliedAt.value < MEMORY_TO_DB_GRACE_MS
  );

  if (!withinGraceWindow) {
    currentScheduleAssignments.value = currentAssignments;
    rebuildDisplayAssignments(currentScheduleAssignments.value);
  }

  grid.offReasons.value = data.offReasons;

  if (syncOriginal) {
    originalCurrentAssignments.value = JSON.parse(
      JSON.stringify(currentScheduleAssignments.value)
    );
  }

  if (clearChanges) {
    changedCells.value.clear();
  }
}

function startAssignmentsRefresh() {
  if (assignmentRefreshInterval) return;
  assignmentRefreshInterval = window.setInterval(async () => {
    if (solver.status.value !== 'running') return;
    if (isDbRefreshing.value) return;

    if (!hasIntermediateResult.value) {
      runningTicksWithoutIntermediate.value++;
    }

    isDbRefreshing.value = true;
    try {
      await loadCurrentAssignments();
    } catch (error) {
      console.warn('주기적 결과 동기화 중 오류:', error);
    } finally {
      isDbRefreshing.value = false;
    }
  }, DB_REFRESH_INTERVAL_MS);
}

function stopAssignmentsRefresh() {
  if (assignmentRefreshInterval) {
    clearInterval(assignmentRefreshInterval);
    assignmentRefreshInterval = null;
  }
  isDbRefreshing.value = false;
}

function buildDateBasedRequirements(siteRequirements: Array<{ dayOfWeek: number; shiftCode: string; requiredCount: number }>) {
  const weeklyRequirements: Record<
    number,
    { D: number; E: number; N: number; O: number; total: number }
  > = {};

  siteRequirements.forEach((req) => {
    if (!weeklyRequirements[req.dayOfWeek]) {
      weeklyRequirements[req.dayOfWeek] = { D: 0, E: 0, N: 0, O: 0, total: 0 };
    }

    const shiftCode = req.shiftCode.toUpperCase();
    const dayRequirements = weeklyRequirements[req.dayOfWeek];
    if (!dayRequirements) return;

    if (['D', 'E', 'N', 'O'].includes(shiftCode)) {
      dayRequirements[shiftCode as 'D' | 'E' | 'N' | 'O'] = req.requiredCount;
      dayRequirements.total += req.requiredCount;
    }
  });

  const dateBasedRequirements: Record<
    string,
    { D: number; E: number; N: number; O: number; total: number }
  > = {};

  grid.dates.value.forEach((date) => {
    if (date.isLastMonth) return;

    const dayOfWeek = new Date(date.date).getDay();
    const weeklyRequirement = weeklyRequirements[dayOfWeek];
    dateBasedRequirements[date.date] = weeklyRequirement
      ? { ...weeklyRequirement }
      : { D: 0, E: 0, N: 0, O: 0, total: 0 };
  });

  return dateBasedRequirements;
}

async function buildSolverRequest() {
  const basicInfo = scheduleStore.basicInfo;
  const versionId = previewVersionId.value;
  if (!basicInfo) {
    throw new Error('기본 정보가 없습니다. Step1부터 다시 진행해주세요.');
  }
  if (!versionId) {
    throw new Error('현재 자세히 보는 안 정보를 찾을 수 없습니다. 다시 진입해주세요.');
  }

  if (organizationStore.shifts.length === 0) {
    throw new Error('시프트 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
  }

  const { constraints } = await getScheduleVersionPreferences(versionId);
  const planningEmployees = await getPlanningEmployees(basicInfo.organizationId);
  const planningAssignments = await getPlanningAssignmentsForVersion(versionId);

  if (previousMonthFallbackError.value) {
    throw new Error('전월 확정 근무 이력을 불러오지 못했습니다. 다시 시도해주세요.');
  }

  let siteRequirements = scheduleStore.siteRequirements;
  if (!siteRequirements || siteRequirements.length === 0) {
    siteRequirements = await loadSiteRequirements(basicInfo.organizationId);
    scheduleStore.setSiteRequirements(siteRequirements);
  }

  if (!siteRequirements || siteRequirements.length === 0) {
    throw new Error('사이트 요구사항이 비어 있습니다. Step2에서 먼저 설정해주세요.');
  }

  const dateBasedRequirements = buildDateBasedRequirements(siteRequirements);

  return mapToSolverRequest(
    basicInfo,
    dateBasedRequirements,
    constraints,
    planningEmployees,
    organizationStore.shifts,
    planningAssignments,
    lastMonthDays.value,
    previousMonthFallbackPlanningAssignments.value,
  );
}

async function syncPreviewWorkspace(options: {
  syncOriginal?: boolean;
  clearChanges?: boolean;
  forceAssignmentSync?: boolean;
} = {}) {
  const schedule = (await getScheduleStatus(ensureScheduleId())) as ScheduleStatusRow;
  applyScheduleStatus(schedule);
  await loadPreferencesForDisplay();

  const shouldResumePolling = (
    getActiveSolvingVersionId() !== null
    && getActiveSolvingVersionId() === previewVersionId.value
    && Boolean(schedule.solver_execution_id)
  );

  if (shouldResumePolling) {
    await loadCurrentAssignments({
      syncOriginal: false,
      clearChanges: false,
      ...options,
    });
    const resumed = await resumePollingFromSchedule(schedule);
    if (resumed) {
      return;
    }
  }

  solver.status.value = mapVersionStatusToSolverStatus(previewVersionStatus.value);

  if (
    (solver.status.value === 'complete' || solver.status.value === 'changed')
    && canMutatePreviewVersion.value
    && previewVersionId.value
  ) {
    await refreshPreferenceResolutionByVersion(previewVersionId.value);
  }

  await loadCurrentAssignments(options);
}

async function handleStartSolver() {
  if (isStartingSolver.value || solver.status.value === 'running') {
    return;
  }
  if (!canMutatePreviewVersion.value || !previewVersionId.value) {
    showInfo('현재 자세히 보는 안 상태에서는 생성이나 편집을 진행할 수 없습니다.');
    return;
  }

  isStartingSolver.value = true;

  try {
    if (previousMonthFallbackError.value) {
      throw new Error('전월 확정 근무 이력을 불러오지 못했습니다. 다시 시도해주세요.');
    }

    await loadPreferencesForDisplay();
    await resetPreferenceResolutionByVersion(previewVersionId.value);

    const solverRequest = await buildSolverRequest();
    await solver.startSolver(previewVersionId.value, solverRequest);

    resetRealtimeState();
    startAssignmentsRefresh();
    showSuccess('근무표 생성을 시작했습니다.');
  } catch (error) {
    console.warn('근무표 생성 시작 중 오류:', error);
    if (readErrorCode(error) === 'another_version_solving') {
      showError('다른 버전이 생성 중입니다. 완료 후 다시 시도해주세요.');
      try {
        await hub.hydrate();
        if (getActiveSolvingVersionId() !== previewVersionId.value) {
          solver.status.value = mapVersionStatusToSolverStatus(previewVersionStatus.value);
        }
        await loadCurrentAssignments({
          syncOriginal: true,
          clearChanges: true,
          forceAssignmentSync: true,
        });
      } catch (syncError) {
        console.warn('충돌 후 상태 재동기화 중 오류:', syncError);
      }
      return;
    }

    showError(error instanceof Error ? error.message : '근무표 생성 시작 중 오류가 발생했습니다.');
  } finally {
    isStartingSolver.value = false;
  }
}

async function syncSolverStateInternal() {
  solver.stopPolling();
  stopAssignmentsRefresh();

  await hub.hydrate();
  const currentPreviewVersionId = previewVersionId.value;
  const currentPreviewStatus = previewVersionStatus.value;
  const currentExecutionId = previewVersionExecutionId.value;

  if (currentPreviewStatus === 'solving' && currentExecutionId && currentPreviewVersionId) {
    solver.status.value = 'running';
    resetRealtimeState();
    solver.intermediateResults.value = null;
    solver.startPolling(currentExecutionId, currentPreviewVersionId);
    startAssignmentsRefresh();
    showInfo('생성 진행 상태를 다시 연결했습니다. 잠시 후 다시 확인해주세요.');
    return;
  }

  solver.status.value = mapVersionStatusToSolverStatus(currentPreviewStatus);
  resetRealtimeState();

  await loadPreferencesForDisplay();
  await loadCurrentAssignments({
    syncOriginal: true,
    clearChanges: true,
    forceAssignmentSync: true,
  });
  showSuccess('최신 상태로 동기화했습니다.');
}

async function handleSyncSolverState() {
  if (isRecoveringSolver.value) return;

  isRecoveringSolver.value = true;
  try {
    await syncSolverStateInternal();
  } catch (error) {
    console.warn('상태 재동기화 중 오류:', error);
    showError(error instanceof Error ? error.message : '상태 재동기화 중 오류가 발생했습니다.');
  } finally {
    isRecoveringSolver.value = false;
  }
}

async function handleForceResetSolverState() {
  if (isRecoveringSolver.value) return;
  if (!previewVersionId.value) {
    showError('현재 자세히 보는 안 정보를 찾을 수 없습니다.');
    return;
  }
  if (previewVersionStatus.value !== 'solving') {
    showInfo('현재는 생성 중 상태가 아니므로 초기화가 필요하지 않습니다.');
    return;
  }

  isRecoveringSolver.value = true;
  try {
    solver.stopPolling();
    stopAssignmentsRefresh();

    await hub.hydrate();
    const currentPreviewVersionId = previewVersionId.value;
    if (!currentPreviewVersionId) {
      throw new Error('현재 자세히 보는 안 정보를 찾을 수 없습니다.');
    }

    const currentPreview = compareVersions.value.find((version) => version.id === currentPreviewVersionId);
    if (!currentPreview || currentPreview.status !== 'solving') {
      solver.status.value = mapVersionStatusToSolverStatus(currentPreview?.status ?? 'draft');
      resetRealtimeState();
      await loadPreferencesForDisplay();
      await loadCurrentAssignments({
        syncOriginal: true,
        clearChanges: true,
        forceAssignmentSync: true,
      });
      showSuccess('이미 생성 상태가 해제되어 최신 상태로 동기화했습니다.');
      return;
    }

    let executionId = currentPreview.activeSolverExecutionId ?? previewVersionExecutionId.value;
    if (!executionId) {
      const schedule = (await getScheduleStatus(ensureScheduleId())) as ScheduleStatusRow;
      executionId = schedule.solver_execution_id;
    }

    if (!executionId) {
      throw new Error('실행 ID를 찾을 수 없습니다. 잠시 후 다시 시도해주세요.');
    }

    await submitPhase2ScheduleVersionSolverResult(currentPreviewVersionId, {
      status: 'failed',
      solverExecutionId: executionId,
      assignments: [],
      score: null,
      failureReason: 'manual_recovery_reset',
    });

    await hub.hydrate();
    solver.status.value = mapVersionStatusToSolverStatus(previewVersionStatus.value);
    resetRealtimeState();

    await loadPreferencesForDisplay();
    await loadCurrentAssignments({
      syncOriginal: true,
      clearChanges: true,
      forceAssignmentSync: true,
    });

    showSuccess('생성 상태를 초기화했습니다. 다시 생성을 시도할 수 있습니다.');
  } catch (error) {
    console.warn('생성 상태 강제 초기화 중 오류:', error);

    if (readErrorCode(error) === 'stale_solver_callback') {
      await syncSolverStateInternal();
      showInfo('이미 최신 상태로 전환되어 강제 초기화가 필요하지 않았습니다.');
      return;
    }

    showError(error instanceof Error ? error.message : '생성 상태 초기화 중 오류가 발생했습니다.');
  } finally {
    isRecoveringSolver.value = false;
  }
}

async function resumePollingFromSchedule(schedule: ScheduleStatusRow): Promise<boolean> {
  if (!schedule.solver_execution_id || !previewVersionId.value) {
    return false;
  }

  solver.status.value = 'running';
  resetRealtimeState();
  solver.intermediateResults.value = null;
  solver.startPolling(schedule.solver_execution_id, previewVersionId.value);
  startAssignmentsRefresh();
  return true;
}

onMounted(async () => {
  if (!scheduleStore.basicInfo) {
    router.push('/schedule/step1');
    return;
  }

  try {
    await hub.hydrate();
    await organizationStore.loadOrganization(scheduleStore.basicInfo.organizationId);
    await grid.loadEmployees(scheduleStore.basicInfo.organizationId);
    grid.generateDates(scheduleStore.basicInfo.month, 0);
    await loadPreviousMonthFallback();
    await syncPreviewWorkspace({
      syncOriginal: true,
      clearChanges: true,
    });
  } catch (error) {
    console.warn('데이터 로드 중 오류:', error);
    showError('데이터 로드 중 오류가 발생했습니다.');
  }
});

onUnmounted(() => {
  solver.stopPolling();
  stopAssignmentsRefresh();
  resetRealtimeState();
});

watch(lastMonthDays, (newDays) => {
  if (!scheduleStore.basicInfo) return;
  if (newDays < 0 || newDays > maxVisibleLastMonthDays.value) return;

  grid.generateDates(scheduleStore.basicInfo.month, newDays);
  rebuildDisplayAssignments();
});

watch(
  () => [
    scheduleStore.basicInfo?.organizationId ?? null,
    scheduleStore.basicInfo?.month ?? null,
  ],
  async ([newOrganizationId, newMonth], [oldOrganizationId, oldMonth]) => {
    if (newOrganizationId === oldOrganizationId && newMonth === oldMonth) {
      return;
    }
    if (!newOrganizationId || !newMonth) {
      return;
    }

    grid.generateDates(newMonth, lastMonthDays.value);
    await loadPreviousMonthFallback();
    await syncPreviewWorkspace({
      syncOriginal: true,
      clearChanges: true,
      forceAssignmentSync: true,
    });
  }
);

watch(
  () => [review.value?.version?.id ?? null, previewVersionStatus.value],
  () => {
    syncReviewTabForPreview();
  },
  { immediate: true }
);

watch(() => solver.status.value, async (newStatus) => {
  if (newStatus === 'running') {
    startAssignmentsRefresh();
  } else {
    stopAssignmentsRefresh();
  }

  if (newStatus === 'complete' || newStatus === 'changed' || newStatus === 'created' || newStatus === 'error') {
    try {
      await hub.hydrate();
      await loadCurrentAssignments({
        syncOriginal: true,
        clearChanges: true,
        forceAssignmentSync: true,
      });
    } catch (error) {
      console.warn('Assignments 로드 중 오류:', error);
    }
  }

  if (newStatus !== 'running') {
    runningTicksWithoutIntermediate.value = 0;
  }
});

watch(() => solver.intermediateResults.value, (intermediateAssignments) => {
  if (solver.status.value !== 'running' || !intermediateAssignments) {
    return;
  }

  const intermediateHash = hashAssignmentMap(intermediateAssignments);
  if (intermediateHash === lastMemoryHash.value) {
    return;
  }

  lastMemoryHash.value = intermediateHash;
  const appliedCount = applyIntermediateAssignments(intermediateAssignments);

  if (appliedCount > 0) {
    hasIntermediateResult.value = true;
    runningTicksWithoutIntermediate.value = 0;
  }
});

function navigateToStep4() {
  router.push('/schedule/step4');
}

function handleBack() {
  if (changedCells.value.size === 0) {
    navigateToStep4();
    return;
  }

  window.$dialog?.warning({
    title: '저장되지 않은 변경사항',
    content: `${changedCells.value.size}개의 변경사항이 저장되지 않았습니다. 이전 단계로 이동하면 현재 수정 내용이 사라집니다.`,
    positiveText: '이동',
    negativeText: '계속 편집',
    onPositiveClick: () => {
      navigateToStep4();
    },
  });
}

function handleGoDashboard() {
  if (changedCells.value.size === 0) {
    router.replace('/');
    return;
  }

  window.$dialog?.warning({
    title: '저장되지 않은 변경사항',
    content: `${changedCells.value.size}개의 변경사항이 저장되지 않았습니다. 근무표 관리로 이동하면 현재 수정 내용이 사라집니다.`,
    positiveText: '이동',
    negativeText: '계속 편집',
    onPositiveClick: () => {
      router.replace('/');
    },
  });
}

function handleReviewTabChange(tab: 'grid' | 'proof' | 'offRequests') {
  scheduleStore.setReviewTab(tab);
}

function handleToggleComparisonTools() {
  isComparisonToolsCollapsed.value = !isComparisonToolsCollapsed.value;
}

function dedupeVersionIds(versionIds: string[]): string[] {
  return [...new Set(versionIds)];
}

function getCanonicalCompareVersionIds(
  versionIds: string[],
  focusVersionId: string | null
): string[] {
  const deduped = dedupeVersionIds(versionIds);

  if (!focusVersionId) {
    return deduped.slice(0, 2);
  }

  const withoutFocus = deduped.filter((versionId) => versionId !== focusVersionId);
  return [focusVersionId, ...withoutFocus].slice(0, 2);
}

async function syncComparisonWorkspace(
  focusVersionId: string | null,
  nextCompareVersionIds: string[]
) {
  await router.replace(
    buildStep5Route(ensureScheduleId(), focusVersionId, nextCompareVersionIds)
  );
  await hub.hydrate();
}

function buildNextCompareVersionIds(versionId: string): string[] {
  if (versionId === previewVersionId.value) {
    return compareVersionIds.value;
  }

  if (compareVersionIds.value.includes(versionId)) {
    return getCanonicalCompareVersionIds(
      compareVersionIds.value.filter((candidateId) => candidateId !== versionId),
      previewVersionId.value
    );
  }

  if (compareVersionIds.value.length >= 2) {
    return getCanonicalCompareVersionIds([previewVersionId.value, versionId].filter(Boolean) as string[], previewVersionId.value);
  }

  return getCanonicalCompareVersionIds([...compareVersionIds.value, versionId], previewVersionId.value);
}

async function handleFocusVersionChange(versionId: string) {
  if (lockedVersionId.value && versionId !== lockedVersionId.value) {
    return;
  }

  if (versionId === previewVersionId.value) {
    return;
  }

  const switchFocusedVersion = async () => {
    try {
      solver.stopPolling();
      stopAssignmentsRefresh();
      resetRealtimeState();

      await syncComparisonWorkspace(
        versionId,
        getCanonicalCompareVersionIds(compareVersionIds.value, versionId)
      );
      await syncPreviewWorkspace({
        syncOriginal: true,
        clearChanges: true,
        forceAssignmentSync: true,
      });
    } catch (error) {
      console.warn('상세 보기 버전 전환 중 오류:', error);
      showError(error instanceof Error ? error.message : '자세히 보는 안 전환 중 오류가 발생했습니다.');
    }
  };

  if (changedCells.value.size > 0) {
    window.$dialog?.warning({
      title: '저장되지 않은 변경사항',
      content: `${changedCells.value.size}개의 변경사항이 저장되지 않았습니다. 다른 안을 자세히 보면 현재 수정 내용이 사라집니다.`,
      positiveText: '다른 안 보기',
      negativeText: '계속 편집',
      onPositiveClick: () => switchFocusedVersion(),
    });
    return;
  }

  try {
    await switchFocusedVersion();
  } catch (error) {
    console.warn('상세 보기 버전 전환 중 오류:', error);
    showError(error instanceof Error ? error.message : '자세히 보는 안 전환 중 오류가 발생했습니다.');
  }
}

async function handleToggleCompareVersion(versionId: string) {
  if (lockedVersionId.value && versionId !== lockedVersionId.value) {
    return;
  }

  const nextCompareVersionIds = buildNextCompareVersionIds(versionId);
  const currentCompareVersionIds = compareVersionIds.value;

  if (
    nextCompareVersionIds.length === currentCompareVersionIds.length
    && nextCompareVersionIds.every((candidateId, index) => candidateId === currentCompareVersionIds[index])
  ) {
    return;
  }

  try {
    await syncComparisonWorkspace(previewVersionId.value, nextCompareVersionIds);
  } catch (error) {
    console.warn('비교 후보 갱신 중 오류:', error);
    showError(error instanceof Error ? error.message : '비교 후보를 갱신하는 중 오류가 발생했습니다.');
  }
}

async function handleSelectCandidateVersion(versionId: string) {
  if (lockedVersionId.value && versionId !== lockedVersionId.value) {
    return;
  }

  if (versionId === selectedVersionId.value || isPrimaryActionRunning.value) {
    return;
  }

  isPrimaryActionRunning.value = true;

  try {
    await selectPhase2ScheduleVersion(versionId);
    showSuccess('기준안을 변경했습니다.');

    await hub.hydrate();
    await syncPreviewWorkspace({
      syncOriginal: true,
      clearChanges: false,
      forceAssignmentSync: true,
    });
  } catch (error) {
    console.warn('기준안 변경 중 오류:', error);
    showError(error instanceof Error ? error.message : '기준안 변경 중 오류가 발생했습니다.');
  } finally {
    isPrimaryActionRunning.value = false;
  }
}

async function handlePrimaryAction() {
  if (isPrimaryActionRunning.value) {
    return;
  }

  isPrimaryActionRunning.value = true;

  try {
    switch (primaryAction.value.kind) {
      case 'select':
        if (!previewVersionId.value) return;
        await selectPhase2ScheduleVersion(previewVersionId.value);
        showSuccess('기준안을 변경했습니다.');
        break;
      case 'recheck':
        if (!primaryAction.value.targetVersionId) return;
        await recheckPhase2ScheduleVersion(primaryAction.value.targetVersionId);
        showSuccess('재검토를 완료했습니다.');
        break;
      case 'finalize':
        if (!primaryAction.value.targetVersionId) return;
        await finalizePhase2ScheduleVersion(primaryAction.value.targetVersionId);
        showSuccess('버전을 확정했습니다.');
        break;
      case 'retry':
        await handleStartSolver();
        return;
      default:
        return;
    }

    await hub.hydrate();
    await syncPreviewWorkspace({
      syncOriginal: true,
      clearChanges: true,
      forceAssignmentSync: true,
    });
  } catch (error) {
    console.warn('Primary action 처리 중 오류:', error);
    showError(error instanceof Error ? error.message : '작업 처리 중 오류가 발생했습니다.');
  } finally {
    isPrimaryActionRunning.value = false;
  }
}

function isCurrentMonthDate(date: string) {
  return !!scheduleStore.basicInfo?.month && date.startsWith(scheduleStore.basicInfo.month);
}

function handleAssignmentUpdate(payload: { employeeId: string; date: string; shiftCode: string }) {
  if (isReadonlyGrid.value || !isCurrentMonthDate(payload.date)) {
    return;
  }

  if (!currentScheduleAssignments.value[payload.employeeId]) {
    currentScheduleAssignments.value[payload.employeeId] = {};
  }

  currentScheduleAssignments.value[payload.employeeId]![payload.date] = payload.shiftCode;
  currentScheduleAssignments.value = { ...currentScheduleAssignments.value };
  rebuildDisplayAssignments(currentScheduleAssignments.value);

  const cellKey = `${payload.employeeId}_${payload.date}`;
  changedCells.value.add(cellKey);
}

function handleReset() {
  if (!canMutatePreviewVersion.value) {
    showInfo('현재 자세히 보는 안 상태에서는 편집할 수 없습니다.');
    return;
  }

  if (changedCells.value.size === 0) {
    showInfo('변경사항이 없습니다');
    return;
  }

  window.$dialog?.warning({
    title: '변경 사항 취소',
    content: `${changedCells.value.size}개의 변경사항을 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
    positiveText: '취소하기',
    negativeText: '돌아가기',
    onPositiveClick: () => {
      currentScheduleAssignments.value = JSON.parse(
        JSON.stringify(originalCurrentAssignments.value)
      );
      rebuildDisplayAssignments(currentScheduleAssignments.value);
      changedCells.value.clear();
      clearTempPreferenceStorage();
      showSuccess('변경사항이 취소되었습니다');
    },
  });
}

async function handleRegenerate() {
  if (!canMutatePreviewVersion.value || !previewVersionId.value) {
    showInfo('현재 자세히 보는 안 상태에서는 생성할 수 없습니다.');
    return;
  }

  if (changedCells.value.size > 0) {
    showInfo('변경사항을 먼저 저장하거나 취소한 뒤 다시 생성해주세요.');
    return;
  }

  await handleStartSolver();
}

function handleCreateCompareCandidate() {
  if (!canMutatePreviewVersion.value) {
    showInfo('현재 자세히 보는 안 상태에서는 비교안을 만들 수 없습니다.');
    return;
  }

  if (changedCells.value.size === 0) {
    navigateToStep4();
    return;
  }

  window.$dialog?.warning({
    title: '저장되지 않은 변경사항',
    content: `${changedCells.value.size}개의 변경사항이 저장되지 않았습니다. 이전 단계로 이동하면 현재 수정 내용이 사라집니다.`,
    positiveText: '이동',
    negativeText: '계속 편집',
    onPositiveClick: () => {
      navigateToStep4();
    },
  });
}

function handleExport() {
  if (grid.employees.value.length === 0) {
    showError('데이터가 없습니다');
    return;
  }

  const filename = `schedule_${scheduleStore.basicInfo?.month}.xlsx`;

  try {
    exportToExcel(
      grid.employees.value,
      grid.dates.value,
      grid.assignments.value,
      filename
    );
    showSuccess('엑셀 파일이 다운로드되었습니다');
  } catch (error) {
    showError('다운로드 실패');
    console.warn('Excel export error:', error);
  }
}

function handleSave() {
  if (!canMutatePreviewVersion.value || !previewVersionId.value) {
    showInfo('현재 자세히 보는 안 상태에서는 편집할 수 없습니다.');
    return;
  }
  const targetVersionId = previewVersionId.value;
  const targetScheduleId = ensureScheduleId();

  if (changedCells.value.size === 0) {
    showInfo('변경사항이 없습니다');
    return;
  }

  window.$dialog?.info({
    title: '근무표 저장',
    content: `${changedCells.value.size}개의 변경사항을 저장하시겠습니까?`,
    positiveText: '저장',
    negativeText: '취소',
    onPositiveClick: async () => {
      try {
        const changes: Array<{ employeeId: string; date: string; shiftId: string | null }> = [];

        for (const cellKey of changedCells.value) {
          const [employeeId, date] = cellKey.split('_');

          if (!employeeId || !date) continue;

          const shiftCode = currentScheduleAssignments.value[employeeId]?.[date];

          if (!shiftCode) {
            changes.push({
              employeeId,
              date,
              shiftId: null,
            });
            continue;
          }

          const shift = organizationStore.shifts.find((s) => s.code === shiftCode);
          if (!shift) {
            console.warn(`Invalid shift code: ${shiftCode}`);
            continue;
          }

          changes.push({
            employeeId,
            date,
            shiftId: shift.id,
          });
        }

        if (changes.length === 0) {
          showInfo('저장할 변경사항이 없습니다.');
          return;
        }

        await patchPhase2ScheduleVersionAssignments(targetVersionId, {
          changes,
        });

        if (getRequestedPreviewVersionId() !== targetVersionId) {
          await router.replace(buildStep5Route(targetScheduleId, targetVersionId));
        }

        await hub.hydrate();
        await loadPreferencesForDisplay();
        await loadCurrentAssignments({
          syncOriginal: true,
          clearChanges: true,
          forceAssignmentSync: true,
        });

        showSuccess('저장되었습니다');
      } catch (error) {
        console.warn('저장 중 오류:', error);
        showError('저장 중 오류가 발생했습니다');
      }
    },
  });
}

async function handleResetCurrentVersion() {
  window.$dialog?.warning({
    title: '현재 안 초기화',
    content: `현재 보고 있는 안의 이번 달 결과만 비우고 Step4로 돌아가시겠습니까?\n\n비교안 이력은 유지되며, 이 안의 이번 달 배정만 초기화됩니다.`,
    positiveText: '초기화',
    negativeText: '취소',
    onPositiveClick: async () => {
      try {
        const currentMonth = scheduleStore.basicInfo?.month;
        if (!currentMonth) {
          showError('현재 월 정보를 찾을 수 없습니다');
          return;
        }
        if (!canMutatePreviewVersion.value || !previewVersionId.value) {
          showInfo('현재 자세히 보는 안 상태에서는 편집할 수 없습니다.');
          return;
        }

        await deleteThisMonthVersionAssignments(
          ensureScheduleId(),
          previewVersionId.value,
          currentMonth
        );

        solver.stopPolling();
        stopAssignmentsRefresh();

        currentScheduleAssignments.value = {};
        rebuildDisplayAssignments();

        clearTempPreferenceStorage();

        showSuccess('현재 안의 이번 달 결과를 초기화했습니다.');
        router.push('/schedule/step4');
      } catch (error) {
        console.error('Current version reset error:', error);
        showError('현재 안 초기화 중 오류가 발생했습니다');
      }
    },
  });
}

async function handleResetActiveMonthFlow() {
  if (isResetActiveFlowDisabled.value) {
    showInfo('확정본이 있는 월은 이번 달 새로 시작을 사용할 수 없습니다.');
    return;
  }

  window.$dialog?.warning({
    title: '이번 달 새로 시작',
    content: `비교안, 저장된 입력 요청, 이번 달 결과를 초기화하고 새로 시작하시겠습니까?\n\n확정본이 없는 현재 작업 흐름만 정리되며, 이 작업은 되돌릴 수 없습니다.`,
    positiveText: '새로 시작',
    negativeText: '취소',
    onPositiveClick: async () => {
      try {
        const resetResponse = await resetPhase2ScheduleActiveFlow(ensureScheduleId());

        solver.stopPolling();
        stopAssignmentsRefresh();

        currentScheduleAssignments.value = {};
        changedCells.value.clear();
        originalCurrentAssignments.value = {};
        rebuildDisplayAssignments();

        clearTempPreferenceStorage();
        scheduleStore.setCompareMatrix(resetResponse);
        scheduleStore.setSelectedVersionId(resetResponse.selectedVersionId);
        scheduleStore.setPreviewVersionId(resetResponse.selectedVersionId);

        showSuccess('이번 달을 새로 시작합니다. Step4에서 다시 입력해주세요.');
        router.push('/schedule/step4');
      } catch (error) {
        console.error('Reset active flow error:', error);
        showError(error instanceof Error ? error.message : '이번 달 새로 시작 중 오류가 발생했습니다.');
      }
    },
  });
}

function clearTempPreferenceStorage() {
  clearScopedTempPreferencesStorage({
    userId: authStore.user?.id,
    organizationId: scheduleStore.basicInfo?.organizationId,
    month: scheduleStore.basicInfo?.month,
  });
}
</script>
