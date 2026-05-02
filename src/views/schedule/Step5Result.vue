<template>
  <div class="mx-auto max-w-7xl px-4">
    <StepIndicator :current-step="5" />

    <n-card title="근무표 생성 - 결과 확인">
      <n-alert
        v-if="initialLoadErrorMessage"
        type="error"
        class="mb-6"
        data-test="step5-initial-load-error"
      >
        <template #header>
          결과 화면 초기화 실패
        </template>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-sm">
            {{ initialLoadErrorMessage }}
          </p>
          <n-button
            size="small"
            :loading="isInitialLoading"
            @click="handleRetryInitialLoad"
          >
            다시 시도
          </n-button>
        </div>
      </n-alert>

      <div
        v-else-if="isInitialLoading"
        data-test="step5-initial-loading"
        class="mb-6 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-10"
      >
        <div class="flex flex-col items-center gap-3 text-center text-sm text-gray-500">
          <n-spin size="large" />
          <p>근무표 결과 데이터를 불러오는 중입니다.</p>
        </div>
      </div>

      <template v-else>
        <!-- 상태 표시 -->
        <div
          v-if="shouldShowStatusCard"
          class="mb-6 flex items-center justify-between rounded bg-gray-50 p-4"
        >
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
          <div
            v-if="shouldShowScoreSummary"
            class="text-sm"
          >
            <span class="mr-4">Hard Score: <strong>{{ solver.hardScore.value }}</strong></span>
            <span>Soft Score: <strong>{{ solver.softScore.value }}</strong></span>
          </div>
        </div>

        <n-alert
          v-if="policyRejectionSummariesCurrentMonth.length > 0"
          type="warning"
          class="mb-6"
        >
          <template #header>
            정책상 거부된 Off 요청 {{ policyRejectionSummariesCurrentMonth.length }}건
          </template>
          <ul class="space-y-1 text-sm">
            <li
              v-for="summary in policyRejectionSummariesCurrentMonth.slice(0, 3)"
              :key="summary"
            >
              {{ summary }}
            </li>
          </ul>
        </n-alert>

        <div
          v-if="shouldShowFirstRunEmptyState"
          data-test="result-empty-state"
        >
          <n-alert
            type="info"
            class="mb-6"
          >
            아직 생성 결과가 없습니다. 아래에서 AI 생성을 시작하세요.
          </n-alert>
        </div>

        <div
          v-if="shouldShowLastMonthDayControl"
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
          현재 보는 근무표안은 편집할 수 없습니다. (생성 중 또는 최종 확정됨)
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

        <div class="my-6">
          <VersionReviewDetail
            v-if="shouldShowResultDetails"
            :review="review"
            :active-tab="activeReviewTab"
            @update:tab="handleReviewTabChange"
          >
            <template #headerActions>
              <div class="flex flex-wrap items-center gap-2 sm:justify-end">
                <span
                  v-if="changedCells.size > 0"
                  class="text-xs font-medium text-amber-700"
                >
                  {{ changedCells.size }}개 변경됨
                </span>
                <n-button
                  size="small"
                  :disabled="isManualEditActionDisabled"
                  @click="handleReset"
                >
                  변경 사항 취소
                </n-button>
                <n-button
                  size="small"
                  type="primary"
                  :disabled="isManualEditActionDisabled"
                  @click="handleSave"
                >
                  저장
                </n-button>
              </div>
            </template>

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
              data-test="edit-input-button"
              :disabled="isInputEditDisabled"
              @click="handleBack"
            >
              Off 수정
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
            <div class="flex flex-col gap-4 sm:flex-row">
              <n-button
                v-if="shouldShowCompareAction"
                size="medium"
                data-test="step5-compare-button"
                @click="handleOpenCompareModal"
              >
                근무표안 비교
              </n-button>

              <n-button
                v-if="scheduleId && scheduleStore.basicInfo"
                size="medium"
                type="error"
                ghost
                data-test="delete-month-schedule-button"
                :loading="isDeletingMonthSchedule"
                :disabled="isDeleteScheduleButtonDisabled"
                @click="handleDeleteMonthSchedule"
              >
                근무표 삭제
              </n-button>

              <n-button
                v-if="!isRunning && (isPreRun || !hasCurrentMonthAssignments)"
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
                v-if="isFinished && shouldShowResultDetails"
                size="medium"
                :disabled="isVersionReadOnly"
                @click="handleRegenerate"
              >
                더 개선하기
              </n-button>

              <n-button
                v-if="isFinished && shouldShowResultDetails"
                size="medium"
                @click="handleExport"
              >
                엑셀 다운로드
              </n-button>

              <n-button
                v-if="shouldShowFinalizeAction"
                size="medium"
                type="primary"
                data-test="finalize-schedule-button"
                :loading="isPrimaryActionRunning"
                :disabled="isFinalizeActionDisabled"
                @click="handleFinalizeAction"
              >
                확정
              </n-button>
            </div>
          </div>
        </div>

        <ScheduleCompareModal
          v-if="isCompareModalOpen"
          :show="isCompareModalOpen"
          :versions="comparisonCandidateVersions"
          :compare-version-ids="compareVersionIds"
          :focused-version-id="previewVersionId"
          :selected-version-id="selectedVersionId"
          :locked-version-id="lockedVersionId"
          :left-version="leftComparedVersion"
          :right-version="rightComparedVersion"
          :left-review="leftComparedReview"
          :right-review="rightComparedReview"
          :loading="isCompareModalLoading"
          :error-message="compareModalErrorMessage"
          @update:show="handleCompareModalVisibility"
          @toggle-compare="handleToggleCompareVersion"
          @focus-version="handleFocusVersionChange"
          @select-version="handleSelectCandidateVersion"
          @delete-version="handleDeleteVersion"
          @request-edit="handleCompareModalRequestEdit"
          @retry="handleOpenCompareModal"
        />

        <n-modal
          :show="isDeleteScopeModalOpen"
          preset="card"
          class="w-[min(640px,calc(100vw-32px))]"
          :mask-closable="!isDeletingMonthSchedule"
          @update:show="handleDeleteScopeModalVisibility"
        >
          <template #header>
            근무표 삭제
          </template>

          <div
            data-test="delete-scope-modal"
            class="space-y-4"
          >
            <p class="text-sm leading-6 text-slate-600">
              {{ scheduleStore.basicInfo?.month ?? '선택한 달' }} 근무표에서 삭제할 범위를 선택하세요.
            </p>

            <n-alert
              v-if="deleteScopeBlockReason"
              type="warning"
              data-test="delete-scope-block"
            >
              {{ deleteScopeBlockReason }}
            </n-alert>

            <div
              v-else
              class="space-y-3"
              role="radiogroup"
              aria-label="근무표 삭제 범위"
            >
              <label
                class="flex cursor-pointer gap-3 rounded-lg border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
                :class="selectedDeleteScope === 'selected_version' ? 'border-slate-900 ring-1 ring-slate-900' : ''"
                data-test="delete-scope-option-selected-version"
              >
                <input
                  v-model="selectedDeleteScope"
                  class="mt-1"
                  type="radio"
                  value="selected_version"
                  :disabled="!previewVersionId"
                >
                <span>
                  <span class="block text-sm font-semibold text-slate-900">
                    선택한 안의 생성 결과 삭제
                  </span>
                  <span class="mt-1 block text-xs leading-5 text-slate-500">
                    현재 보는 근무표안의 배정 결과만 지우고 Off 요청과 다른 근무표안은 유지합니다.
                  </span>
                </span>
              </label>

              <label
                class="flex cursor-pointer gap-3 rounded-lg border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
                :class="selectedDeleteScope === 'all_active_versions' ? 'border-slate-900 ring-1 ring-slate-900' : ''"
                data-test="delete-scope-option-all-active-versions"
              >
                <input
                  v-model="selectedDeleteScope"
                  class="mt-1"
                  type="radio"
                  value="all_active_versions"
                >
                <span>
                  <span class="block text-sm font-semibold text-slate-900">
                    모든 안의 생성 결과 삭제
                  </span>
                  <span class="mt-1 block text-xs leading-5 text-slate-500">
                    이 달의 모든 근무표안 배정 결과를 지우고 Off 요청은 유지합니다.
                  </span>
                </span>
              </label>

              <label
                class="flex cursor-pointer gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 transition hover:bg-rose-100"
                :class="selectedDeleteScope === 'whole_month' ? 'border-rose-700 ring-1 ring-rose-700' : ''"
                data-test="delete-scope-option-whole-month"
              >
                <input
                  v-model="selectedDeleteScope"
                  class="mt-1"
                  type="radio"
                  value="whole_month"
                >
                <span>
                  <span class="block text-sm font-semibold text-rose-900">
                    이번 달 근무표 전체 삭제
                  </span>
                  <span class="mt-1 block text-xs leading-5 text-rose-700">
                    입력한 Off 요청과 생성 결과를 모두 삭제하고 근무표 관리로 이동합니다.
                  </span>
                </span>
              </label>
            </div>

            <n-alert
              v-if="deleteScopeErrorMessage"
              type="error"
              data-test="delete-scope-error"
            >
              {{ deleteScopeErrorMessage }}
            </n-alert>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <n-button
                data-test="delete-scope-cancel-button"
                :disabled="isDeletingMonthSchedule"
                @click="handleCloseDeleteScopeModal"
              >
                취소
              </n-button>
              <n-button
                type="error"
                data-test="delete-scope-confirm-button"
                :loading="isDeletingMonthSchedule"
                :disabled="isDeleteScopeConfirmDisabled"
                @click="handleConfirmDeleteScope"
              >
                삭제
              </n-button>
            </div>
          </template>
        </n-modal>
      </template>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NCard, NButton, NBadge, NProgress, NAlert, NSlider, NSpin, NModal } from 'naive-ui';
import StepIndicator from '@/components/schedule/StepIndicator.vue';
import ScheduleGrid from '@/components/schedule/ScheduleGrid.vue';
import { useAISolver } from '@/composables/useAISolver';
import { useScheduleReviewHub } from '@/composables/useScheduleReviewHub';
import { useScheduleGrid } from '@/composables/useScheduleGrid';
import ScheduleCompareModal from '@/components/schedule/review/ScheduleCompareModal.vue';
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
  deletePhase2ScheduleMonth,
  deletePhase2ScheduleGeneratedResults,
  deletePhase2ScheduleVersion,
  refreshPreferenceResolutionByVersion,
  resetPreferenceResolutionByVersion,
  selectPhase2ScheduleVersion,
  recheckPhase2ScheduleVersion,
  finalizePhase2ScheduleVersion,
  submitPhase2ScheduleVersionSolverResult,
  getPlanningEmployees,
  getPlanningAssignmentsForVersion,
} from '@/api/schedule';
import { loadSiteRequirements } from '@/api/employee';
import { mapToSolverRequest } from '@/utils/solverMapper';
import { exportToExcel } from '@/utils/excel';
import { showSuccess, showError, showInfo } from '@/utils/message';
import { resolveDefaultReviewTab } from '@/utils/scheduleReviewState';
import {
  getCanonicalCompareVersionIds,
  isSolverFailedVersion,
} from '@/utils/scheduleVersionResolver';
import {
  buildCanonicalStep5RouteLocation,
  getAppHomeRoutePath,
  getScheduleStepRoutePath,
  parseStep5RouteQuery,
} from '@/constants/routes';
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

const routeScheduleKey = computed(() => {
  const paramId = route.params.scheduleKey;
  return typeof paramId === 'string' && paramId.length > 0 ? paramId : null;
});
const scheduleId = computed(() => scheduleStore.basicInfo?.scheduleId ?? null);
const scheduleRouteKey = computed(() => {
  return (
    scheduleStore.basicInfo?.schedulePublicId
    ?? routeScheduleKey.value
    ?? scheduleStore.basicInfo?.scheduleId
    ?? null
  );
});
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
const hasConsumedRouteAutoStart = ref(false);
const lastMemoryAppliedAt = ref(0);
const lastMemoryHash = ref('');
const hasIntermediateResult = ref(false);
const runningTicksWithoutIntermediate = ref(0);
const warnedUnknownShiftIds = ref<Set<string>>(new Set());
const isInitialLoading = ref(true);
const hasInitialLoadCompleted = ref(false);
const initialLoadErrorMessage = ref<string | null>(null);
const isStartingSolver = ref(false);
const isRecoveringSolver = ref(false);
const isDeletingMonthSchedule = ref(false);
type DeleteScope = 'selected_version' | 'all_active_versions' | 'whole_month';
const isDeleteScopeModalOpen = ref(false);
const selectedDeleteScope = ref<DeleteScope | null>(null);
const deleteScopeErrorMessage = ref<string | null>(null);
const isPrimaryActionRunning = ref(false);
const isCompareModalOpen = ref(false);
const isCompareModalLoading = ref(false);
const compareModalErrorMessage = ref<string | null>(null);
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
const policyRejectionSummariesCurrentMonth = ref<string[]>([]);
const EMPTY_PRIMARY_ACTION: SchedulePrimaryAction = {
  kind: 'none',
  targetVersionId: null,
  label: '선택 가능한 작업이 없습니다.',
  disabledReason: null,
};

function hasTransientStep5RouteState(): boolean {
  const parsedRouteQuery = parseStep5RouteQuery(route.query);
  return parsedRouteQuery.requestedFocusVersionId !== null
    || parsedRouteQuery.requestedCompareVersionIds.length > 0;
}

function syncScheduleContextToStore(nextScheduleId: string, nextSchedulePublicId?: string | null) {
  if (!scheduleStore.basicInfo) {
    return;
  }

  if (
    scheduleStore.basicInfo.scheduleId === nextScheduleId &&
    (nextSchedulePublicId === undefined
      || scheduleStore.basicInfo.schedulePublicId === nextSchedulePublicId)
  ) {
    return;
  }

  scheduleStore.setBasicInfo({
    ...scheduleStore.basicInfo,
    scheduleId: nextScheduleId,
    schedulePublicId: nextSchedulePublicId ?? scheduleStore.basicInfo.schedulePublicId,
  });
}

function ensureScheduleId(): string {
  const currentScheduleId = scheduleId.value;

  if (!currentScheduleId) {
    throw new Error('스케줄 ID를 확인할 수 없습니다. Step4부터 다시 시도해주세요.');
  }

  syncScheduleContextToStore(currentScheduleId);
  return currentScheduleId;
}

function ensureScheduleRouteKey(): string {
  const currentScheduleRouteKey = scheduleRouteKey.value;

  if (!currentScheduleRouteKey) {
    throw new Error('스케줄 URL 키를 확인할 수 없습니다. Step5를 다시 불러주세요.');
  }

  return currentScheduleRouteKey;
}

function syncBasicInfoFromOrganizationStore() {
  const basicInfo = scheduleStore.basicInfo;
  if (!basicInfo) {
    return;
  }

  const organizationEmployees = Array.isArray(organizationStore.employees)
    ? organizationStore.employees
    : [];
  const organizationShifts = Array.isArray(organizationStore.shifts)
    ? organizationStore.shifts
    : [];

  const nextBasicInfo = {
    ...basicInfo,
    organizationName: organizationStore.current?.name ?? basicInfo.organizationName,
    organizationType: organizationStore.current?.type ?? basicInfo.organizationType,
    employeeCount:
      organizationEmployees.length > 0
        ? organizationEmployees.length
        : basicInfo.employeeCount,
    shifts: organizationShifts.length > 0 ? organizationShifts : basicInfo.shifts,
  };

  if (
    nextBasicInfo.organizationName === basicInfo.organizationName &&
    nextBasicInfo.organizationType === basicInfo.organizationType &&
    nextBasicInfo.employeeCount === basicInfo.employeeCount &&
    nextBasicInfo.shifts === basicInfo.shifts
  ) {
    return;
  }

  scheduleStore.setBasicInfo(nextBasicInfo);
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
const isInputEditDisabled = computed(() => {
  return isRunning.value
    || previewVersionStatus.value === 'solving'
    || getActiveSolvingVersionId() !== null;
});
const isDeleteScheduleButtonDisabled = computed(() => {
  const basicInfo = scheduleStore.basicInfo;
  return (
    isDeletingMonthSchedule.value
    || !scheduleId.value
    || !basicInfo?.organizationId
    || !basicInfo.month
  );
});
const deleteScopeBlockReason = computed(() => {
  if (lockedVersionId.value) {
    return '확정된 근무표는 삭제할 수 없습니다.';
  }

  if (isRunning.value || previewVersionStatus.value === 'solving' || getActiveSolvingVersionId() !== null) {
    return '생성 중인 근무표안이 있어 삭제할 수 없습니다.';
  }

  return null;
});
const isDeleteScopeConfirmDisabled = computed(() => {
  return (
    isDeletingMonthSchedule.value
    || Boolean(deleteScopeBlockReason.value)
    || selectedDeleteScope.value === null
    || (selectedDeleteScope.value === 'selected_version' && !previewVersionId.value)
  );
});
const previousMonthPrefix = computed(() => {
  if (!scheduleStore.basicInfo?.month) return '';
  return dayjs(`${scheduleStore.basicInfo.month}-01`).subtract(1, 'month').format('YYYY-MM');
});

const statusText = computed(() => {
  if (solver.status.value === 'running') {
    return '생성 중';
  }

  const map: Record<ScheduleVersionStatus, string> = {
    draft: '생성 전',
    solving: '생성 중',
    solve_failed: '실패',
    review_pending: '입력 수정됨',
    review_ready: '완료',
    review_blocked: '재검토 차단',
    infeasible: '해 없음',
    finalized: '확정',
  };
  return map[previewVersionStatus.value] || '알 수 없음';
});

const statusType = computed(() => {
  if (solver.status.value === 'running') {
    return 'info';
  }

  const map: Record<ScheduleVersionStatus, 'info' | 'success' | 'error' | 'warning' | 'default'> = {
    draft: 'default',
    solving: 'info',
    solve_failed: 'error',
    review_pending: 'warning',
    review_ready: 'success',
    review_blocked: 'warning',
    infeasible: 'error',
    finalized: 'success',
  };
  return map[previewVersionStatus.value] || 'default';
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
const hasCurrentMonthAssignments = computed(() => {
  const currentMonth = scheduleStore.basicInfo?.month;
  if (!currentMonth) return false;

  return Object.values(currentScheduleAssignments.value).some((dateMap) => {
    return Object.entries(dateMap || {}).some(([date, shiftCode]) => {
      return date.startsWith(currentMonth) && Boolean(shiftCode);
    });
  });
});
const hasSolverExecutionHistory = computed(() => {
  return Boolean(
    isRunning.value
    || previewVersionExecutionId.value
    || review.value?.latestEvaluation?.solverExecutionId
  );
});
const shouldShowResultDetails = computed(() => hasCurrentMonthAssignments.value);
const shouldShowStatusCard = computed(() => {
  return isRunning.value || hasCurrentMonthAssignments.value || hasSolverExecutionHistory.value;
});
const shouldShowScoreSummary = computed(() => {
  return isRunning.value || hasCurrentMonthAssignments.value;
});
const shouldShowFirstRunEmptyState = computed(() => {
  return (
    hasInitialLoadCompleted.value
    && !isRunning.value
    && !hasCurrentMonthAssignments.value
    && !hasSolverExecutionHistory.value
  );
});

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
const comparisonCandidateVersions = computed(() => {
  return compareVersions.value.filter((version) => {
    if (isSolverFailedVersion(version)) {
      return false;
    }

    return (
      version.id === selectedVersionId.value
      || version.id === previewVersionId.value
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
const primaryAction = computed(() => {
  return review.value?.primaryAction ?? EMPTY_PRIMARY_ACTION;
});
const activeReviewTab = computed(() => scheduleStore.reviewTab);
const previewVersionExecutionId = computed(() => {
  return previewVersionSummary.value?.activeSolverExecutionId ?? null;
});
const canRecoverSolverState = computed(() => {
  return previewVersionStatus.value === 'solving';
});
const isFinalizedMonth = computed(() => Boolean(lockedVersionId.value));
const shouldShowCompareAction = computed(() => {
  return shouldShowResultDetails.value
    && !isFinalizedMonth.value
    && comparisonCandidateVersions.value.length > 1;
});
const shouldShowLastMonthDayControl = computed(() => {
  return shouldShowResultDetails.value && maxVisibleLastMonthDays.value > 0;
});
const isManualEditActionDisabled = computed(() => {
  return changedCells.value.size === 0 || !canMutatePreviewVersion.value;
});
const shouldShowFinalizeAction = computed(() => {
  return isFinished.value && shouldShowResultDetails.value && !isFinalizedMonth.value;
});
const isFinalizeActionDisabled = computed(() => {
  return (
    isPrimaryActionRunning.value
    || primaryAction.value.kind !== 'finalize'
    || !primaryAction.value.targetVersionId
    || Boolean(primaryAction.value.disabledReason)
  );
});

function syncReviewTabForPreview() {
  scheduleStore.setReviewTab(resolveDefaultReviewTab(previewVersionStatus.value));
}

function getActiveSolvingVersionId(): string | null {
  return scheduleStore.compareMatrix?.activeSolvingVersionId ?? null;
}

function hasOtherActiveSolvingVersion(): boolean {
  const activeSolvingVersionId = getActiveSolvingVersionId();
  return Boolean(activeSolvingVersionId && activeSolvingVersionId !== previewVersionId.value);
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

type PreferenceWithPolicyResult = {
  employee_id: string;
  date: string;
  request_note: string | null;
  policy_check_status?: string | null;
  policy_rejection_reason?: string | null;
};

function combineOffRequestNote(
  requestNote: string | null | undefined,
  policyRejectionReason: string | null | undefined
): string | null {
  const parts = [requestNote?.trim() ?? '', policyRejectionReason?.trim() ? `정책 거부: ${policyRejectionReason.trim()}` : '']
    .filter((part) => part.length > 0);

  return parts.length > 0 ? parts.join('\n') : null;
}

function syncPolicyRejectionDisplay(
  preferences: PreferenceWithPolicyResult[],
  monthPrefix: string
): void {
  const nextSummaries: string[] = [];

  preferences.forEach((pref) => {
    if (!pref.date.startsWith(monthPrefix)) {
      return;
    }

    if (pref.policy_check_status !== 'rejected') {
      return;
    }

    const rejectionReason = pref.policy_rejection_reason?.trim() ?? '';
    if (!rejectionReason) {
      return;
    }

    const employeeName =
      grid.employees.value.find((employee) => employee.id === pref.employee_id)?.name ??
      pref.employee_id;
    nextSummaries.push(`${employeeName} (${pref.date}) - ${rejectionReason}`);
  });

  policyRejectionSummariesCurrentMonth.value = nextSummaries;
}

async function loadPreferencesForDisplay() {
  const emptyConstraints = createEmptyConstraintMapForEmployees();
  const emptyNotes = createEmptyCommentMapForEmployees();
  const currentMonth = scheduleStore.basicInfo?.month || '';
  const versionId = previewVersionId.value;

  if (!currentMonth || !versionId) {
    offRequestsCurrentMonth.value = emptyConstraints;
    offRequestNotesCurrentMonth.value = emptyNotes;
    policyRejectionSummariesCurrentMonth.value = [];
    return;
  }

  const { constraints, notes, preferences } = await getScheduleVersionPreferences(versionId);

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

  for (const pref of preferences as PreferenceWithPolicyResult[]) {
    if (!pref.date.startsWith(currentMonth)) continue;
    const rejectionReason = pref.policy_check_status === 'rejected'
      ? pref.policy_rejection_reason?.trim() ?? ''
      : '';
    if (!rejectionReason) continue;

    if (!filteredNotes[pref.employee_id]) {
      filteredNotes[pref.employee_id] = {};
    }
    filteredNotes[pref.employee_id]![pref.date] = combineOffRequestNote(
      filteredNotes[pref.employee_id]?.[pref.date] ?? null,
      rejectionReason
    ) ?? '';
  }

  offRequestsCurrentMonth.value = filteredConstraints;
  offRequestNotesCurrentMonth.value = filteredNotes;
  syncPolicyRejectionDisplay(preferences as PreferenceWithPolicyResult[], currentMonth);
}

function calculateMaxVisibleLastMonthDays(previousDates: Set<string>): number {
  if (previousDates.size === 0) return 0;

  const sorted = Array.from(previousDates).sort((a, b) => a.localeCompare(b));
  const minDate = sorted[0];
  const maxDate = sorted[sorted.length - 1];
  if (!minDate || !maxDate) return 0;

  const visibleRangeDays = dayjs(maxDate).diff(dayjs(minDate), 'day') + 1;
  return Math.min(7, Math.max(1, visibleRangeDays));
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
    buildRollingHistoryWindow(currentMonth, 7).previousMonthDates,
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
    throw new Error('현재 보는 근무표안 정보를 찾을 수 없습니다. 다시 진입해주세요.');
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
    showInfo('현재 보는 근무표안 상태에서는 생성이나 편집을 진행할 수 없습니다.');
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
      showError('다른 근무표안이 생성 중입니다. 완료 후 다시 시도해주세요.');
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

async function consumeRouteAutoStart(shouldAutoStart = parseStep5RouteQuery(route.query).autoStart) {
  if (hasConsumedRouteAutoStart.value || !shouldAutoStart) {
    return;
  }

  hasConsumedRouteAutoStart.value = true;

  await router.replace(
    buildCanonicalStep5RouteLocation(ensureScheduleRouteKey())
  );

  const targetScheduleId = scheduleId.value;
  const targetPreviewVersionId = previewVersionId.value;

  if (!targetScheduleId || !targetPreviewVersionId) {
    return;
  }

  if (isStartingSolver.value || solver.status.value === 'running') {
    return;
  }

  if (
    !canMutatePreviewVersion.value
    || hasCurrentMonthAssignments.value
    || hasOtherActiveSolvingVersion()
  ) {
    return;
  }

  await handleStartSolver();
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
    showError('현재 보는 근무표안 정보를 찾을 수 없습니다.');
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
      throw new Error('현재 보는 근무표안 정보를 찾을 수 없습니다.');
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

function toInitialLoadErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return '데이터 로드 중 오류가 발생했습니다.';
}

async function loadStep5InitialData() {
  isInitialLoading.value = true;
  initialLoadErrorMessage.value = null;

  if (!scheduleStore.basicInfo && !routeScheduleKey.value) {
    router.push(getScheduleStepRoutePath(1));
    return;
  }

  try {
    const shouldAutoStart = parseStep5RouteQuery(route.query).autoStart;
    await hub.hydrate();
    if (!scheduleStore.basicInfo) {
      throw new Error('Step5에 필요한 스케줄 컨텍스트를 복원하지 못했습니다.');
    }
    await organizationStore.loadOrganization(scheduleStore.basicInfo.organizationId);
    syncBasicInfoFromOrganizationStore();
    await grid.loadEmployees(scheduleStore.basicInfo.organizationId);
    grid.generateDates(scheduleStore.basicInfo.month, 0);
    await loadPreviousMonthFallback();
    await syncPreviewWorkspace({
      syncOriginal: true,
      clearChanges: true,
    });
    await consumeRouteAutoStart(shouldAutoStart);
    hasInitialLoadCompleted.value = true;
  } catch (error) {
    const errorMessage = toInitialLoadErrorMessage(error);
    console.warn('데이터 로드 중 오류:', error);
    initialLoadErrorMessage.value = errorMessage;
    hasInitialLoadCompleted.value = true;
    showError(errorMessage);
  } finally {
    isInitialLoading.value = false;
  }
}

async function handleRetryInitialLoad() {
  await loadStep5InitialData();
}

onMounted(async () => {
  await loadStep5InitialData();
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
  router.push(getScheduleStepRoutePath(4));
}

function handleBack() {
  if (isInputEditDisabled.value) {
    showInfo('근무표 생성 중에는 입력을 수정할 수 없습니다. 완료 후 다시 시도해주세요.');
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

function handleGoDashboard() {
  if (changedCells.value.size === 0) {
    router.replace(getAppHomeRoutePath());
    return;
  }

  window.$dialog?.warning({
    title: '저장되지 않은 변경사항',
    content: `${changedCells.value.size}개의 변경사항이 저장되지 않았습니다. 근무표 관리로 이동하면 현재 수정 내용이 사라집니다.`,
    positiveText: '이동',
    negativeText: '계속 편집',
    onPositiveClick: () => {
      router.replace(getAppHomeRoutePath());
    },
  });
}

function handleReviewTabChange(tab: 'grid' | 'proof' | 'offRequests') {
  scheduleStore.setReviewTab(tab);
}

function handleCloseCompareModal() {
  isCompareModalOpen.value = false;
  compareModalErrorMessage.value = null;
  void nextTick(() => {
    document.querySelector<HTMLElement>('[data-test="step5-compare-button"]')?.focus();
  });
}

async function handleOpenCompareModal() {
  if (!shouldShowCompareAction.value) {
    return;
  }

  isCompareModalOpen.value = true;
  isCompareModalLoading.value = true;
  compareModalErrorMessage.value = null;

  try {
    await hub.hydrateComparedReviews();
  } catch (error) {
    console.warn('근무표안 비교 로드 중 오류:', error);
    compareModalErrorMessage.value = error instanceof Error
      ? error.message
      : '근무표안 비교 정보를 불러오는 중 오류가 발생했습니다.';
  } finally {
    isCompareModalLoading.value = false;
  }
}

function handleCompareModalVisibility(show: boolean) {
  if (show) {
    void handleOpenCompareModal();
    return;
  }

  handleCloseCompareModal();
}

function handleCompareModalRequestEdit() {
  handleCloseCompareModal();
  handleCreateCompareCandidate();
}

async function syncComparisonWorkspace(
  focusVersionId: string | null,
  nextCompareVersionIds: string[]
) {
  await router.replace(
    buildCanonicalStep5RouteLocation(ensureScheduleRouteKey())
  );
  await hub.hydrate({
    requestedFocusVersionId: focusVersionId,
    requestedCompareVersionIds: nextCompareVersionIds,
  }, {
    loadComparedReviews: true,
  });
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
    showSuccess('선택한 근무표안을 변경했습니다.');

    await hub.hydrate(undefined, {
      loadComparedReviews: isCompareModalOpen.value,
    });
    await syncPreviewWorkspace({
      syncOriginal: true,
      clearChanges: false,
      forceAssignmentSync: true,
    });
  } catch (error) {
    console.warn('선택한 근무표안 변경 중 오류:', error);
    showError(error instanceof Error ? error.message : '선택한 근무표안 변경 중 오류가 발생했습니다.');
  } finally {
    isPrimaryActionRunning.value = false;
  }
}

function getDeleteVersionReplacement(versionId: string): string | undefined {
  if (versionId !== selectedVersionId.value) {
    return undefined;
  }

  return previewVersionId.value ?? undefined;
}

async function handleDeleteVersion(versionId: string) {
  if (versionId === previewVersionId.value) {
    return;
  }

  if (changedCells.value.size > 0) {
    showInfo('저장되지 않은 변경사항이 있어 비교안을 삭제할 수 없습니다. 먼저 저장하거나 변경 사항을 취소해주세요.');
    return;
  }

  window.$dialog?.warning({
    title: '근무표안 삭제',
    content: '이 근무표안을 삭제할까요? 삭제한 근무표안의 생성 결과와 비교 이력은 사라집니다. 현재 보는 근무표안은 유지됩니다.',
    positiveText: '삭제',
    negativeText: '취소',
    onPositiveClick: async () => {
      try {
        await deletePhase2ScheduleVersion(versionId, {
          replacementSelectedVersionId: getDeleteVersionReplacement(versionId),
        });

        await hub.hydrate(undefined, {
          loadComparedReviews: isCompareModalOpen.value,
        });
        showSuccess('근무표안을 삭제했습니다.');
      } catch (error) {
        console.warn('비교안 삭제 중 오류:', error);
        showError(error instanceof Error ? error.message : '근무표안을 삭제하는 중 오류가 발생했습니다.');
      }
    },
  });
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
        showSuccess('선택한 근무표안을 변경했습니다.');
        break;
      case 'recheck':
        if (!primaryAction.value.targetVersionId) return;
        await recheckPhase2ScheduleVersion(primaryAction.value.targetVersionId);
        showSuccess('재검토를 완료했습니다.');
        break;
      case 'finalize':
        if (!primaryAction.value.targetVersionId) return;
        await finalizePhase2ScheduleVersion(primaryAction.value.targetVersionId);
        showSuccess('근무표안을 확정했습니다.');
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

async function handleFinalizeAction() {
  if (isFinalizeActionDisabled.value) {
    if (primaryAction.value.disabledReason) {
      showInfo(primaryAction.value.disabledReason);
    }
    return;
  }

  await handlePrimaryAction();
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
    showInfo('현재 보는 근무표안 상태에서는 편집할 수 없습니다.');
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
    showInfo('현재 보는 근무표안 상태에서는 생성할 수 없습니다.');
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
    showInfo('현재 보는 근무표안 상태에서는 새 근무표안을 만들 수 없습니다.');
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
    showInfo('현재 보는 근무표안 상태에서는 편집할 수 없습니다.');
    return;
  }
  const targetVersionId = previewVersionId.value;

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

        if (hasTransientStep5RouteState()) {
          await router.replace(
            buildCanonicalStep5RouteLocation(ensureScheduleRouteKey())
          );
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

function clearResultOnlyLocalState() {
  currentScheduleAssignments.value = {};
  changedCells.value.clear();
  originalCurrentAssignments.value = {};
  policyRejectionSummariesCurrentMonth.value = [];
  scheduleStore.setLatestEvaluation(null);
  resetRealtimeState();
  rebuildDisplayAssignments({});
}

async function handleDeleteGeneratedResults(scope: 'selected_version' | 'all_active_versions') {
  if (scope === 'selected_version' && !previewVersionId.value) {
    throw new Error('현재 보는 근무표안을 확인할 수 없습니다.');
  }

  const resetResponse = await deletePhase2ScheduleGeneratedResults(
    ensureScheduleId(),
    scope === 'selected_version'
      ? {
          scope,
          sourceVersionId: previewVersionId.value!,
        }
      : {
          scope,
        }
  );

  solver.stopPolling();
  stopAssignmentsRefresh();
  clearResultOnlyLocalState();

  scheduleStore.setCompareMatrix(resetResponse);
  scheduleStore.setSelectedVersionId(resetResponse.selectedVersionId);
  scheduleStore.setPreviewVersionId(resetResponse.selectedVersionId);

  await loadPreferencesForDisplay();
  clearTempPreferenceStorage();

  showSuccess(
    scope === 'selected_version'
      ? '선택한 안의 생성 결과를 삭제했습니다. Step4에서 요청을 다시 확인해주세요.'
      : '모든 안의 생성 결과를 삭제했습니다. Step4에서 요청을 다시 확인해주세요.'
  );
  await router.push(getScheduleStepRoutePath(4));
}

async function handleDeleteWholeMonthSchedule() {
  const basicInfo = scheduleStore.basicInfo;
  if (!basicInfo?.organizationId || !basicInfo.month) {
    throw new Error('조직 또는 월 정보를 찾을 수 없습니다.');
  }

  await deletePhase2ScheduleMonth({
    organizationId: basicInfo.organizationId,
    month: basicInfo.month,
  });

  solver.stopPolling();
  stopAssignmentsRefresh();
  resetRealtimeState();

  currentScheduleAssignments.value = {};
  previousMonthAssignments.value = {};
  changedCells.value.clear();
  originalCurrentAssignments.value = {};
  offRequestsCurrentMonth.value = {};
  offRequestNotesCurrentMonth.value = {};
  policyRejectionSummariesCurrentMonth.value = [];
  rebuildDisplayAssignments({});

  clearTempPreferenceStorage();
  scheduleStore.setBasicInfo({
    ...basicInfo,
    scheduleId: undefined,
    schedulePublicId: undefined,
  });
  scheduleStore.resetReviewState();
  scheduleStore.setAssignments({});
  scheduleStore.setComments({});

  showSuccess('이번 달 근무표를 삭제했습니다.');
  await router.replace(getAppHomeRoutePath());
}

async function handleDeleteMonthSchedule() {
  const basicInfo = scheduleStore.basicInfo;
  if (!basicInfo?.organizationId || !basicInfo.month) {
    showError('조직 또는 월 정보를 찾을 수 없습니다.');
    return;
  }

  selectedDeleteScope.value = null;
  deleteScopeErrorMessage.value = null;
  isDeleteScopeModalOpen.value = true;
}

function handleCloseDeleteScopeModal() {
  if (isDeletingMonthSchedule.value) {
    return;
  }

  isDeleteScopeModalOpen.value = false;
  selectedDeleteScope.value = null;
  deleteScopeErrorMessage.value = null;
}

function handleDeleteScopeModalVisibility(show: boolean) {
  if (show) {
    isDeleteScopeModalOpen.value = true;
    return;
  }

  handleCloseDeleteScopeModal();
}

async function handleConfirmDeleteScope() {
  if (isDeleteScopeConfirmDisabled.value || !selectedDeleteScope.value) {
    return;
  }

  isDeletingMonthSchedule.value = true;
  deleteScopeErrorMessage.value = null;

  try {
    if (selectedDeleteScope.value === 'whole_month') {
      await handleDeleteWholeMonthSchedule();
    } else {
      await handleDeleteGeneratedResults(selectedDeleteScope.value);
    }

    isDeleteScopeModalOpen.value = false;
    selectedDeleteScope.value = null;
  } catch (error) {
    console.error('Delete schedule scope error:', error);
    const message = error instanceof Error ? error.message : '근무표 삭제 중 오류가 발생했습니다.';
    deleteScopeErrorMessage.value = message;
    showError(message);
  } finally {
    isDeletingMonthSchedule.value = false;
  }
}

function clearTempPreferenceStorage() {
  clearScopedTempPreferencesStorage({
    userId: authStore.user?.id,
    organizationId: scheduleStore.basicInfo?.organizationId,
    month: scheduleStore.basicInfo?.month,
  });
}
</script>
