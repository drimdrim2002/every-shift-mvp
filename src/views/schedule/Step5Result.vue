<template>
  <AppContainer>
    <StepIndicator :current-step="5" />

    <n-card title="근무표 생성 - 결과 확인">
      <n-alert
        v-if="initialLoadErrorMessage"
        type="error"
        class="mb-6"
        data-test="step5-initial-load-error"
      >
        <template #header>
          결과 화면을 불러오지 못했습니다
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
        <section
          v-if="isRunning"
          data-test="step5-running-progress"
          class="mb-6 rounded-lg border border-blue-100 bg-blue-50 px-4 py-8"
        >
          <div class="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
            <n-progress
              type="line"
              :percentage="solver.progress.value"
            />
            <p class="text-sm font-medium text-slate-700">
              근무표를 생성하고 있습니다. 잠시만 기다려 주세요.
            </p>
          </div>
        </section>

        <section
          v-if="shouldShowStatusCard"
          data-test="step5-result-status-summary"
          class="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <article
            v-for="card in resultSummaryCards"
            :key="card.key"
            :data-test="summaryCardDataTest(card)"
            class="rounded-lg border bg-white p-4 shadow-sm"
            :class="summaryCardToneClass(card.tone)"
          >
            <p class="text-sm font-medium text-slate-600">
              {{ card.title }}
            </p>
            <div class="mt-2 flex items-center gap-2">
              <button
                v-if="isSummaryCardActionVisible(card)"
                type="button"
                :data-test="summaryCardActionDataTest(card)"
                class="rounded-md text-left text-lg font-semibold text-slate-950 underline underline-offset-4 transition hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                :aria-label="summaryCardActionLabel(card)"
                @click="handleSummaryCardAction(card)"
              >
                {{ card.value }}
              </button>
              <strong
                v-else
                class="text-lg font-semibold text-slate-950"
              >
                {{ card.value }}
              </strong>
              <n-badge
                v-if="card.key === 'generation'"
                :value="statusText"
                :type="statusType"
              />
            </div>
            <p class="mt-2 text-sm leading-6 text-slate-600">
              {{ card.description }}
            </p>
          </article>
        </section>

        <n-alert
          v-if="!isRunning && policyRejectionSummariesCurrentMonth.length > 0"
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

        <n-alert
          v-if="!isRunning && isVersionReadOnly"
          type="warning"
          class="mb-6"
        >
          현재 보는 근무표안은 편집할 수 없습니다. (생성 중 또는 최종 확정됨)
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
            상태 새로고침
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

        <section
          v-if="shouldShowResultDetails"
          class="my-6"
        >
          <div
            data-test="step5-result-view-switch"
            class="mb-4 flex flex-wrap gap-2"
          >
            <n-button
              size="small"
              :type="resultViewMode === 'site' ? 'primary' : 'default'"
              data-test="step5-result-view-site"
              @click="resultViewMode = 'site'"
            >
              사이트
            </n-button>
            <n-button
              size="small"
              :type="resultViewMode === 'employee' ? 'primary' : 'default'"
              data-test="step5-result-view-employee"
              @click="resultViewMode = 'employee'"
            >
              근무자
            </n-button>
          </div>

          <div
            v-if="resultViewMode === 'site'"
            data-test="step5-site-view"
          >
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-sm font-semibold text-slate-900">
                  배정표
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-2 sm:justify-end">
                <span
                  v-if="changedCells.size > 0"
                  class="text-xs font-medium text-amber-700"
                >
                  {{ changedCells.size }}개 변경됨
                </span>
                <n-button
                  size="small"
                  data-test="manual-edit-reset-button"
                  :disabled="isManualEditActionDisabled"
                  @click="handleReset"
                >
                  변경 사항 취소
                </n-button>
                <n-button
                  size="small"
                  type="primary"
                  data-test="manual-edit-save-button"
                  :disabled="isManualEditActionDisabled"
                  @click="handleSave"
                >
                  저장
                </n-button>
              </div>
            </div>

            <div
              v-if="shouldShowLastMonthDayControl"
              class="mt-4"
            >
              <div class="mb-2 flex items-center justify-between gap-3">
                <h3 class="text-sm font-semibold text-gray-700">
                  전월 데이터 표시 일수
                </h3>
                <span class="text-sm text-gray-500">{{ visibleLastMonthDays }}일</span>
              </div>
              <n-input-number
                v-model:value="visibleLastMonthDays"
                data-test="last-month-days-stepper"
                class="max-w-40"
                :min="0"
                :max="maxVisibleLastMonthDays"
                :step="1"
                :disabled="maxVisibleLastMonthDays === 0"
              />
            </div>

            <ScheduleGrid
              v-if="grid.employees.value.length > 0"
              class="mt-4"
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
              class="mt-4 text-center text-gray-500"
            >
              결과 로딩 중...
            </div>
          </div>

          <div
            v-else
            data-test="step5-employee-view"
          >
            <EmployeeResultDetail
              :selected-employee-id="selectedResultEmployeeId"
              :employees="grid.employees.value"
              :dates="grid.dates.value"
              :assignments="grid.assignments.value"
              :shift-colors="shiftColors"
              :violations="complianceResult.violations"
              :off-requests="offRequestsCurrentMonth"
              :off-request-notes="offRequestNotesCurrentMonth"
              :off-request-results="selectedEmployeeOffRequestResults"
              @update:selected-employee-id="handleSelectedResultEmployeeUpdate"
            />
          </div>
        </section>

        <n-alert
          v-if="shouldShowReviewAttentionPanel"
          type="warning"
          class="mb-6"
          data-test="step5-review-attention-panel"
        >
          <template #header>
            검토 필요
          </template>
          <div class="space-y-2 text-sm leading-6">
            <p v-if="reviewAttentionSummary">
              {{ reviewAttentionSummary }}
            </p>
            <ul
              v-if="reviewAttentionMessages.length > 0"
              class="list-disc space-y-1 pl-5"
            >
              <li
                v-for="message in reviewAttentionMessages"
                :key="message"
              >
                {{ message }}
              </li>
            </ul>
          </div>
        </n-alert>

        <n-alert
          v-if="review?.latestEvaluation?.infeasibility"
          type="error"
          class="mb-6"
        >
          <template #header>
            생성 실패
          </template>
          <p class="text-sm">
            {{ formatInfeasibilitySummary(review.latestEvaluation.infeasibility.summary) }}
          </p>
          <p
            v-if="review.latestEvaluation.infeasibility.details?.traceId"
            class="mt-1 text-xs text-slate-600"
          >
            문제가 반복되면 고객지원에 문의해주세요.
          </p>
        </n-alert>

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
            <p
              v-if="shouldShowFinalizeAction && visibleFinalizeBlockReason"
              data-test="finalize-block-reason"
              class="text-sm font-medium text-rose-700"
            >
              {{ visibleFinalizeBlockReason }}
            </p>
            <p
              v-if="shouldShowPrimaryActionButton && visiblePrimaryActionBlockReason"
              data-test="primary-action-block-reason"
              class="text-sm font-medium text-rose-700"
            >
              {{ visiblePrimaryActionBlockReason }}
            </p>
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
                :loading="isStartingSolver"
                :disabled="isStartingSolver || isVersionReadOnly"
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
                v-if="shouldShowPrimaryActionButton"
                size="medium"
                type="primary"
                data-test="primary-action-button"
                :loading="isPrimaryActionRunning"
                :disabled="isPrimaryActionButtonDisabled"
                @click="handlePrimaryAction"
              >
                {{ primaryActionButtonLabel }}
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

              <n-button
                v-if="shouldShowUnfinalizeAction"
                size="medium"
                type="warning"
                data-test="unfinalize-schedule-button"
                :loading="isPrimaryActionRunning"
                :disabled="isUnfinalizeActionDisabled"
                @click="handleUnfinalizeAction"
              >
                확정 취소
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
          :left-compliance-result="getComparisonComplianceResult(leftComparedVersion?.id)"
          :right-compliance-result="getComparisonComplianceResult(rightComparedVersion?.id)"
          :left-off-input="leftComparisonVersionData?.offInput ?? null"
          :right-off-input="rightComparisonVersionData?.offInput ?? null"
          :employees="grid.employees.value"
          :month="scheduleStore.basicInfo?.month ?? ''"
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
          v-model:show="isComplianceModalOpen"
          preset="card"
          class="w-[min(760px,calc(100vw-32px))]"
        >
          <template #header>
            보건복지부 가이드라인 상세
          </template>

          <div
            data-test="step5-guideline-modal"
            class="max-h-[min(70vh,720px)] overflow-y-auto pr-1"
          >
            <ScheduleCompliancePanel
              :result="complianceResult"
              :show-decision-header="false"
              :show-off-summary="false"
            />
          </div>
        </n-modal>

        <n-modal
          v-model:show="isOffRequestModalOpen"
          preset="card"
          class="w-[min(920px,calc(100vw-32px))]"
        >
          <template #header>
            Off 요청 상세
          </template>

          <div
            data-test="step5-off-request-modal"
            class="max-h-[min(70vh,760px)] overflow-y-auto pr-1"
          >
            <ScheduleOffRequestGroupList
              :employees="grid.employees.value"
              :assignments="grid.assignments.value"
              :off-requests="offRequestsCurrentMonth"
              :off-request-notes="offRequestNotesCurrentMonth"
              :off-request-results="selectedEmployeeOffRequestResults"
            />
          </div>
        </n-modal>

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
                    현재 근무표 생성 결과 삭제
                  </span>
                  <span class="mt-1 block text-xs leading-5 text-slate-500">
                    현재 근무표의 배정 결과만 지우고 Off 요청은 유지합니다.
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
  </AppContainer>
</template>

<script setup lang="ts">
import dayjs from 'dayjs';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NCard, NButton, NBadge, NProgress, NAlert, NInputNumber, NSpin, NModal } from 'naive-ui';
import AppContainer from '@/components/layout/AppContainer.vue';
import StepIndicator from '@/components/schedule/StepIndicator.vue';
import ScheduleGrid from '@/components/schedule/ScheduleGrid.vue';
import { useAISolver } from '@/composables/useAISolver';
import { useScheduleReviewHub } from '@/composables/useScheduleReviewHub';
import { useScheduleGrid } from '@/composables/useScheduleGrid';
import ScheduleCompareModal from '@/components/schedule/review/ScheduleCompareModal.vue';
import ScheduleCompliancePanel from '@/components/schedule/review/ScheduleCompliancePanel.vue';
import ScheduleOffRequestGroupList from '@/components/schedule/review/ScheduleOffRequestGroupList.vue';
import EmployeeResultDetail from '@/components/schedule/review/EmployeeResultDetail.vue';
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
  unfinalizePhase2ScheduleVersion,
  submitPhase2ScheduleVersionSolverResult,
} from '@/api/schedule';
import { useScheduleSolverRequest } from '@/composables/useScheduleSolverRequest';
import { evaluateScheduleCompliance } from '@/utils/scheduleCompliance';
import { exportToExcel } from '@/utils/excel';
import { showSuccess, showError, showInfo } from '@/utils/message';
import { selectDefaultResultEmployeeId } from '@/utils/employeeResultDetail';
import {
  getCanonicalCompareVersionIds,
  isSolverFailedVersion,
} from '@/utils/scheduleVersionResolver';
import {
  buildCanonicalStep5RouteLocation,
  buildStep4RouteLocation,
  getAppHomeRoutePath,
  getScheduleStepRoutePath,
  parseStep5RouteQuery,
} from '@/constants/routes';
import {
  buildRollingHistoryWindow,
  mergeAssignmentMapsWithFallback,
} from '@/utils/rollingHistory';
import { clearScopedTempPreferencesStorage } from '@/utils/tempPreferencesStorage';
import type { ScheduleComplianceResult } from '@/types/scheduleCompliance';
import type { ScheduleComparisonOffInputSnapshot } from '@/utils/scheduleComparisonSummary';
import type {
  AssignmentMap,
  ConstraintMap,
  CommentMap,
  PlanningAssignment,
  ScheduleBlockingReason,
  SchedulePrimaryAction,
  ScheduleReviewResponse,
  SolverRequest,
  ScheduleViolationDetail,
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
const scheduleSolverRequest = useScheduleSolverRequest();

const DB_REFRESH_INTERVAL_MS = 10000;
const MEMORY_TO_DB_GRACE_MS = 2000;
const PREVIOUS_MONTH_CONTEXT_CHECK_REQUIRED_MESSAGE = '전월 근무 이력을 불러오지 못해 확인이 필요합니다.';
const LOCAL_SOLVER_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

function isLocalSolverHost() {
  const hostname = window.location.hostname.toLowerCase();
  return LOCAL_SOLVER_HOSTNAMES.has(hostname.replace(/^\[(.*)\]$/, '$1'));
}

function logLocalSolverPayload(solverRequest: SolverRequest) {
  console.info('[Step5] Local solver payload:', solverRequest);
}

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
type ResultViewMode = 'site' | 'employee';
const resultViewMode = ref<ResultViewMode>('employee');
const selectedResultEmployeeId = ref<string | null>(null);
const autoSelectedResultEmployeeId = ref<string | null>(null);
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
type DeleteScope = 'selected_version' | 'whole_month';
const isDeleteScopeModalOpen = ref(false);
const selectedDeleteScope = ref<DeleteScope | null>(null);
const deleteScopeErrorMessage = ref<string | null>(null);
const isPrimaryActionRunning = ref(false);
const isCompareModalOpen = ref(false);
const isComplianceModalOpen = ref(false);
const isOffRequestModalOpen = ref(false);
const isCompareModalLoading = ref(false);
const compareModalErrorMessage = ref<string | null>(null);
interface ComparisonVersionData {
  assignments: AssignmentMap;
  offInput: ScheduleComparisonOffInputSnapshot;
  complianceResult: ScheduleComplianceResult;
}
const comparisonVersionDataById = ref<Record<string, ComparisonVersionData>>({});
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
    throw new Error('근무표 정보를 확인할 수 없습니다. 다시 불러오거나 이전 단계부터 진행해주세요.');
  }

  syncScheduleContextToStore(currentScheduleId);
  return currentScheduleId;
}

function ensureScheduleRouteKey(): string {
  const currentScheduleRouteKey = scheduleRouteKey.value;

  if (!currentScheduleRouteKey) {
    throw new Error('근무표 정보를 확인할 수 없습니다. 다시 불러오거나 이전 단계부터 진행해주세요.');
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

interface Step5SummaryCard {
  key: 'generation' | 'guideline' | 'offRequests' | 'finalization';
  title: string;
  value: string;
  description: string;
  tone: 'default' | 'info' | 'success' | 'warning' | 'error';
}

interface StaffingRequirementForSave {
  dayOfWeek: number;
  shiftCode: string;
  requiredCount: number;
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
    || isVersionReadOnly.value
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

const visibleCurrentMonthAssignments = computed<AssignmentMap>(() => {
  return extractCurrentMonthAssignments(
    grid.assignments.value,
    scheduleStore.basicInfo?.month,
  );
});
const complianceCurrentMonthAssignments = computed<AssignmentMap>(() => {
  return buildCurrentMonthComplianceAssignments(
    grid.assignments.value,
    grid.dates.value,
    grid.employees.value,
    scheduleStore.basicInfo?.month,
  );
});
const complianceVisiblePreviousMonthAssignments = computed<AssignmentMap>(() => {
  return buildVisiblePreviousMonthComplianceAssignments(
    grid.assignments.value,
    grid.dates.value,
    grid.employees.value,
  );
});
const activeComplianceAssignments = computed<AssignmentMap>(() => {
  return mergeComplianceAssignments(
    mergeComplianceAssignments(
      previousMonthAssignments.value,
      complianceVisiblePreviousMonthAssignments.value,
    ),
    complianceCurrentMonthAssignments.value,
  );
});
const hasCurrentMonthAssignments = computed(() => {
  return Object.values(visibleCurrentMonthAssignments.value).some((dateMap) => {
    return Object.values(dateMap || {}).some((shiftCode) => Boolean(shiftCode));
  });
});
const hasSolverExecutionHistory = computed(() => {
  return Boolean(
    previewVersionExecutionId.value
    || review.value?.latestEvaluation?.solverExecutionId
  );
});
const shouldShowResultDetails = computed(() => !isRunning.value && hasCurrentMonthAssignments.value);
const shouldShowStatusCard = computed(() => {
  return !isRunning.value && (hasCurrentMonthAssignments.value || hasSolverExecutionHistory.value);
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
const leftComparisonVersionData = computed<ComparisonVersionData | null>(() => {
  return leftComparedVersion.value
    ? comparisonVersionDataById.value[leftComparedVersion.value.id] ?? null
    : null;
});
const rightComparisonVersionData = computed<ComparisonVersionData | null>(() => {
  return rightComparedVersion.value
    ? comparisonVersionDataById.value[rightComparedVersion.value.id] ?? null
    : null;
});
const primaryAction = computed(() => {
  return review.value?.primaryAction ?? EMPTY_PRIMARY_ACTION;
});
const liveComplianceResult = computed(() => {
  return evaluateScheduleCompliance({
    month: scheduleStore.basicInfo?.month ?? '',
    employees: grid.employees.value,
    assignments: activeComplianceAssignments.value,
    offRequests: offRequestsCurrentMonth.value,
    shifts: organizationStore.shifts,
  });
});
const complianceResult = computed<ScheduleComplianceResult>(() => {
  const result = liveComplianceResult.value;
  return applyPreviousMonthFallbackWarning(result);
});
const complianceFinalizeBlockReason = computed(() => {
  if (complianceResult.value.checkRequiredCount > 0) {
    return '보건복지부 가이드라인을 확인한 뒤 확정할 수 있습니다.';
  }

  if (complianceResult.value.mandatoryViolationCount > 0) {
    return `보건복지부 가이드라인 위반 ${complianceResult.value.mandatoryViolationCount}건을 해결한 뒤 확정할 수 있습니다.`;
  }

  return null;
});
const unsavedFinalizeBlockReason = computed(() => {
  return changedCells.value.size > 0
    ? '변경사항을 저장하거나 취소한 뒤 확정할 수 있습니다.'
    : null;
});
const unsavedPrimaryActionBlockReason = computed(() => {
  if (changedCells.value.size === 0) {
    return null;
  }

  if (primaryAction.value.kind === 'recheck') {
    return '변경사항을 저장하거나 취소한 뒤 재검토할 수 있습니다.';
  }

  if (primaryAction.value.kind === 'select') {
    return '변경사항을 저장하거나 취소한 뒤 근무표안을 선택할 수 있습니다.';
  }

  return null;
});
const primaryActionDisabledReason = computed(() => {
  return formatBackendActionMessage(primaryAction.value.disabledReason);
});
const visibleFinalizeBlockReason = computed(() => {
  return complianceFinalizeBlockReason.value
    ?? unsavedFinalizeBlockReason.value
    ?? primaryActionDisabledReason.value;
});
const previewVersionExecutionId = computed(() => {
  return previewVersionSummary.value?.activeSolverExecutionId ?? null;
});
const canRecoverSolverState = computed(() => {
  return previewVersionStatus.value === 'solving';
});
const isFinalizedMonth = computed(() => Boolean(lockedVersionId.value));
const shouldShowCompareAction = computed(() => {
  return false;
});
const shouldShowLastMonthDayControl = computed(() => {
  return shouldShowResultDetails.value && maxVisibleLastMonthDays.value > 0;
});
const visibleLastMonthDays = computed({
  get: () => lastMonthDays.value,
  set: (value: number | null) => {
    const numericValue = Number(value ?? 0);
    const integerValue = Number.isFinite(numericValue) ? Math.floor(numericValue) : 0;
    lastMonthDays.value = Math.min(
      maxVisibleLastMonthDays.value,
      Math.max(0, integerValue)
    );
  },
});
const isManualEditActionDisabled = computed(() => {
  return changedCells.value.size === 0 || !canMutatePreviewVersion.value;
});
const selectedEmployeeOffRequestResults = computed(() => {
  return review.value?.latestEvaluation?.offRequestResults ?? [];
});
const latestReviewEvaluation = computed(() => review.value?.latestEvaluation ?? null);
const reviewAttentionSummary = computed(() => {
  const summary = latestReviewEvaluation.value?.proofSummary;
  if (!summary) {
    return null;
  }

  const parts = [
    summary.weeklyHoursViolations > 0 ? `주간 시간 위반 ${summary.weeklyHoursViolations}건` : null,
    summary.staffingShortfalls > 0 ? `인력 부족 ${summary.staffingShortfalls}건` : null,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(', ') : null;
});
const liveGuidelineReviewMessage = computed(() => {
  return formatLiveGuidelineReviewMessage(complianceResult.value);
});
const reviewAttentionMessages = computed(() => {
  const evaluation = latestReviewEvaluation.value;
  if (!evaluation) {
    return [];
  }

  const messages: string[] = [];
  const currentGuidelineMessage = liveGuidelineReviewMessage.value;

  for (const reason of evaluation.finalizationGate?.blockingReasons ?? []) {
    if (reason.code === 'hard_constraints_violated') {
      if (currentGuidelineMessage) {
        messages.push(currentGuidelineMessage);
      }
      continue;
    }

    const message = formatReviewBlockingReason(reason);
    if (message.length > 0) {
      messages.push(message);
    }
  }

  for (const detail of evaluation.violationDetails ?? []) {
    if (detail.code === 'hard_constraints_violated') {
      if (currentGuidelineMessage) {
        messages.push(currentGuidelineMessage);
      }
      continue;
    }

    const message = formatReviewViolationDetail(detail);
    if (message.length > 0) {
      messages.push(message);
    }
  }

  return Array.from(new Set(messages));
});
const shouldShowReviewAttentionPanel = computed(() => {
  const evaluation = latestReviewEvaluation.value;
  if (!evaluation || evaluation.resultStatus !== 'review_blocked') {
    return false;
  }

  return Boolean(reviewAttentionSummary.value) || reviewAttentionMessages.value.length > 0;
});
const shouldShowPrimaryActionButton = computed(() => {
  return (
    shouldShowResultDetails.value
    && primaryAction.value.kind === 'recheck'
  );
});
const isPrimaryActionButtonDisabled = computed(() => {
  return (
    isPrimaryActionRunning.value
    || Boolean(unsavedPrimaryActionBlockReason.value)
    || Boolean(primaryActionDisabledReason.value)
    || !primaryAction.value.targetVersionId
  );
});
const visiblePrimaryActionBlockReason = computed(() => {
  return unsavedPrimaryActionBlockReason.value ?? primaryActionDisabledReason.value;
});
const primaryActionButtonLabel = computed(() => {
  if (primaryAction.value.kind === 'select') {
    return '이 근무표안 선택';
  }

  if (primaryAction.value.kind === 'recheck') {
    return '재검토 실행';
  }

  return '작업 실행';
});
const shouldShowFinalizeAction = computed(() => {
  return isFinished.value && shouldShowResultDetails.value && !isFinalizedMonth.value;
});
const shouldShowUnfinalizeAction = computed(() => {
  return isFinished.value && shouldShowResultDetails.value && isFinalizedMonth.value;
});
const isFinalizeActionDisabled = computed(() => {
  return (
    isPrimaryActionRunning.value
    || Boolean(complianceFinalizeBlockReason.value)
    || Boolean(unsavedFinalizeBlockReason.value)
    || primaryAction.value.kind !== 'finalize'
    || !primaryAction.value.targetVersionId
    || Boolean(primaryAction.value.disabledReason)
  );
});
const isUnfinalizeActionDisabled = computed(() => {
  return isPrimaryActionRunning.value || !lockedVersionId.value;
});
const generationSummaryCard = computed<Step5SummaryCard>(() => {
  const progress = Math.round(solver.progress.value);
  const description = isRunning.value
    ? `생성 진행률 ${progress}%입니다.`
    : hasCurrentMonthAssignments.value
      ? '검토할 생성 결과가 준비되었습니다.'
      : hasSolverExecutionHistory.value
        ? '생성 이력을 확인하세요.'
        : '생성을 시작하면 결과 상태가 표시됩니다.';

  return {
    key: 'generation',
    title: '생성 상태',
    value: statusText.value,
    description,
    tone: statusType.value,
  };
});
const guidelineSummaryCard = computed<Step5SummaryCard>(() => {
  const { checkRequiredCount, mandatoryViolationCount } = complianceResult.value;

  if (checkRequiredCount > 0) {
    return {
      key: 'guideline',
      title: '보건복지부 가이드라인',
      value: '확인 필요',
      description: `자동 확인이 필요한 항목 ${checkRequiredCount}건이 있습니다.`,
      tone: 'warning',
    };
  }

  if (mandatoryViolationCount > 0) {
    return {
      key: 'guideline',
      title: '보건복지부 가이드라인',
      value: `위반 ${mandatoryViolationCount}건`,
      description: '확정 전 위반 항목을 해결해야 합니다.',
      tone: 'error',
    };
  }

  return {
    key: 'guideline',
    title: '보건복지부 가이드라인',
    value: '충족',
    description: '확정 전 필수 기준을 모두 확인했습니다.',
    tone: 'success',
  };
});
const offRequestSummaryCard = computed<Step5SummaryCard>(() => {
  const offRequests = complianceResult.value.offRequests;

  if (offRequests.totalRequests === 0) {
    return {
      key: 'offRequests',
      title: 'Off 요청',
      value: '요청 없음',
      description: '이번 달 반영할 Off 요청이 없습니다.',
      tone: 'default',
    };
  }

  const reflectionRate = offRequests.reflectionRate ?? 0;
  return {
    key: 'offRequests',
    title: 'Off 요청',
    value: `${offRequests.fulfilledRequests}/${offRequests.totalRequests} 반영`,
    description: `반영률 ${reflectionRate}% · 미반영 ${offRequests.unfulfilledRequests}건`,
    tone: offRequests.unfulfilledRequests === 0 ? 'success' : 'warning',
  };
});
const finalizationSummaryCard = computed<Step5SummaryCard>(() => {
  if (isFinalizedMonth.value) {
    return {
      key: 'finalization',
      title: '확정',
      value: '확정됨',
      description: '확정 취소 후 다시 편집할 수 있습니다.',
      tone: 'success',
    };
  }

  if (!shouldShowFinalizeAction.value) {
    return {
      key: 'finalization',
      title: '확정',
      value: isRunning.value ? '대기 중' : '대기',
      description: isRunning.value
        ? '생성 완료 후 확정 여부를 확인합니다.'
        : '생성 결과를 확인한 뒤 확정할 수 있습니다.',
      tone: isRunning.value ? 'info' : 'default',
    };
  }

  if (visibleFinalizeBlockReason.value) {
    return {
      key: 'finalization',
      title: '확정',
      value: '확인 필요',
      description: visibleFinalizeBlockReason.value,
      tone: 'warning',
    };
  }

  if (isFinalizeActionDisabled.value) {
    return {
      key: 'finalization',
      title: '확정',
      value: '확정 대기',
      description: primaryAction.value.label || '현재 근무표안은 바로 확정할 수 없습니다.',
      tone: 'default',
    };
  }

  return {
    key: 'finalization',
    title: '확정',
    value: '확정 가능',
    description: '아래 확정 버튼으로 최종 근무표를 확정할 수 있습니다.',
    tone: 'success',
  };
});
const resultSummaryCards = computed<Step5SummaryCard[]>(() => [
  generationSummaryCard.value,
  guidelineSummaryCard.value,
  offRequestSummaryCard.value,
  finalizationSummaryCard.value,
]);
const canOpenOffRequestDetails = computed(() => {
  return complianceResult.value.offRequests.totalRequests > 0;
});

function summaryCardDataTest(card: Step5SummaryCard): string {
  return card.key === 'offRequests'
    ? 'step5-summary-card-off-requests'
    : `step5-summary-card-${card.key}`;
}

function isSummaryCardActionVisible(card: Step5SummaryCard): boolean {
  if (card.key === 'guideline') {
    return true;
  }

  if (card.key === 'offRequests') {
    return canOpenOffRequestDetails.value;
  }

  return false;
}

function summaryCardActionDataTest(card: Step5SummaryCard): string | undefined {
  if (card.key === 'guideline') {
    return 'step5-summary-card-guideline-action';
  }

  if (card.key === 'offRequests') {
    return 'step5-summary-card-off-requests-action';
  }

  return undefined;
}

function summaryCardActionLabel(card: Step5SummaryCard): string | undefined {
  if (card.key === 'guideline') {
    return '보건복지부 가이드라인 상세 보기';
  }

  if (card.key === 'offRequests') {
    return 'Off 요청 상세 보기';
  }

  return undefined;
}

function handleSummaryCardAction(card: Step5SummaryCard) {
  if (card.key === 'guideline') {
    isComplianceModalOpen.value = true;
    return;
  }

  if (card.key === 'offRequests' && canOpenOffRequestDetails.value) {
    isOffRequestModalOpen.value = true;
  }
}

function summaryCardToneClass(tone: Step5SummaryCard['tone']): string {
  const map: Record<Step5SummaryCard['tone'], string> = {
    default: 'border-slate-200',
    info: 'border-sky-200 bg-sky-50/60',
    success: 'border-emerald-200 bg-emerald-50/60',
    warning: 'border-amber-200 bg-amber-50/60',
    error: 'border-rose-200 bg-rose-50/60',
  };
  return map[tone];
}

function sanitizeReviewMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return '';
  }

  const sanitized = trimmed
    .replace(/Hard-constraint violations were detected\./gi, '검토 기준 위반이 감지되었습니다.')
    .replace(/Recheck after fixing assignments\./gi, '배정을 수정한 뒤 재검토해주세요.')
    .replace(/No feasible schedule exists for the current input conditions\./gi, '현재 입력 조건으로 생성 가능한 근무표가 없습니다.')
    .replace(/Solver execution failed\. Retry before finalization\./gi, '생성 중 오류가 발생했습니다. 다시 생성해주세요.')
    .replace(/hard constraints?/gi, '검토 기준')
    .replace(/하드 제약/g, '검토 기준');

  return /[A-Za-z]/.test(sanitized) ? '' : sanitized;
}

function containsInternalErrorTerm(message: string): boolean {
  return /\b(api|backend|database|db|execution|hash|id|local|score|solver|sql|step5|trace|uuid)\b/i.test(message);
}

function toUserFacingErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.trim();
  if (!message) {
    return fallback;
  }

  const sanitized = sanitizeReviewMessage(message);
  if (sanitized) {
    return sanitized;
  }

  if (containsInternalErrorTerm(message)) {
    return fallback;
  }

  return message;
}

function formatInfeasibilitySummary(summary: string | null | undefined): string {
  if (!summary?.trim()) {
    return '근무표 생성 중 문제가 발생했습니다. 다시 생성해주세요.';
  }

  const sanitized = sanitizeReviewMessage(summary);
  if (sanitized && !containsInternalErrorTerm(sanitized)) {
    return sanitized;
  }

  return '근무표 생성 중 문제가 발생했습니다. 다시 생성해주세요.';
}

function formatBackendActionMessage(message: string | null): string | null {
  if (!message) {
    return null;
  }

  return sanitizeReviewMessage(message) || '현재 상태에서는 이 작업을 진행할 수 없습니다.';
}

function formatLiveGuidelineReviewMessage(result: ScheduleComplianceResult): string | null {
  if (result.checkRequiredCount > 0) {
    return '보건복지부 가이드라인 확인이 필요한 항목이 있습니다. 확인 후 재검토해주세요.';
  }

  if (result.mandatoryViolationCount > 0) {
    return `보건복지부 가이드라인 위반 ${result.mandatoryViolationCount}건이 있습니다. 배정을 수정한 뒤 재검토해주세요.`;
  }

  return null;
}

function formatReviewBlockingReason(reason: ScheduleBlockingReason): string {
  if (reason.code === 'hard_constraints_violated') {
    return '검토 기준 위반이 감지되었습니다. 배정을 수정한 뒤 재검토해주세요.';
  }

  if (reason.code === 'infeasible') {
    return '현재 입력 조건으로 생성 가능한 근무표가 없습니다.';
  }

  if (reason.code === 'solve_failed') {
    return '생성 중 오류가 발생했습니다. 다시 생성해주세요.';
  }

  return sanitizeReviewMessage(reason.message) || '검토가 필요한 항목이 있습니다.';
}

function formatReviewViolationDetail(detail: ScheduleViolationDetail): string {
  if (detail.code === 'hard_constraints_violated') {
    return '검토 기준 위반이 감지되었습니다. 배정을 수정한 뒤 재검토해주세요.';
  }

  if (detail.code === 'staffing_shortfall') {
    return formatStaffingShortfallDetail(detail);
  }

  return sanitizeReviewMessage(detail.message) || '검토가 필요한 항목이 있습니다.';
}

function getMetadataNumber(metadata: Record<string, unknown>, key: string): number | null {
  const value = metadata[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function formatStaffingShortfallDetail(detail: ScheduleViolationDetail): string {
  const date = detail.dates[0] ?? null;
  const requiredCount = getMetadataNumber(detail.metadata, 'requiredCount');
  const assignedCount = getMetadataNumber(detail.metadata, 'assignedCount');

  if (date && requiredCount !== null && assignedCount !== null) {
    return `${date} 인력 부족: 필요 ${requiredCount}명, 배정 ${assignedCount}명입니다.`;
  }

  if (date) {
    return `${date} 인력 부족이 있습니다.`;
  }

  return '인력 부족이 있습니다.';
}

function normalizeShiftCodeForCount(value: string | null | undefined): string {
  return value?.trim().toUpperCase() ?? '';
}

function getCurrentMonthStaffingDates(): string[] {
  const month = scheduleStore.basicInfo?.month;
  if (!month) {
    return [];
  }

  return grid.dates.value
    .filter((dateColumn) => !dateColumn.isLastMonth && dateColumn.date.startsWith(month))
    .map((dateColumn) => dateColumn.date)
    .sort();
}

function countCurrentGridStaffingShortfalls(): number {
  const currentMonthDates = getCurrentMonthStaffingDates();
  if (currentMonthDates.length === 0) {
    return 0;
  }

  const requirements = (scheduleStore.siteRequirements || []) as StaffingRequirementForSave[];
  if (requirements.length === 0) {
    return 0;
  }

  const relevantShiftCodes = new Set(
    requirements
      .map((requirement) => normalizeShiftCodeForCount(requirement.shiftCode))
      .filter(Boolean)
  );

  const assignedCountByDateShift = new Map<string, number>();

  for (const employee of grid.employees.value) {
    const dateMap = grid.assignments.value[employee.id] || {};

    for (const date of currentMonthDates) {
      const shiftCode = normalizeShiftCodeForCount(dateMap[date]);
      if (!shiftCode || shiftCode === 'O' || shiftCode === 'OFF' || !relevantShiftCodes.has(shiftCode)) {
        continue;
      }

      const key = `${date}_${shiftCode}`;
      assignedCountByDateShift.set(key, (assignedCountByDateShift.get(key) ?? 0) + 1);
    }
  }

  let shortfallCount = 0;
  for (const requirement of requirements) {
    const requiredCount = Number(requirement.requiredCount);
    const dayOfWeek = Number(requirement.dayOfWeek);
    const shiftCode = normalizeShiftCodeForCount(requirement.shiftCode);

    if (
      !Number.isFinite(requiredCount)
      || requiredCount <= 0
      || !Number.isInteger(dayOfWeek)
      || dayOfWeek < 0
      || dayOfWeek > 6
      || !shiftCode
    ) {
      continue;
    }

    for (const date of currentMonthDates) {
      if (dayjs(date).day() !== dayOfWeek) {
        continue;
      }

      const assignedCount = assignedCountByDateShift.get(`${date}_${shiftCode}`) ?? 0;
      if (assignedCount < requiredCount) {
        shortfallCount += 1;
      }
    }
  }

  return shortfallCount;
}

function getPreSaveBlockMessage(): string | null {
  const { checkRequiredCount, mandatoryViolationCount } = complianceResult.value;

  if (checkRequiredCount > 0) {
    return '보건복지부 가이드라인을 확인한 뒤 저장할 수 있습니다.';
  }

  if (mandatoryViolationCount > 0) {
    return `보건복지부 가이드라인 위반 ${mandatoryViolationCount}건을 해결한 뒤 저장할 수 있습니다.`;
  }

  const staffingShortfallCount = countCurrentGridStaffingShortfalls();
  if (staffingShortfallCount > 0) {
    return `인력 부족 ${staffingShortfallCount}건이 있어 저장할 수 없습니다. 배정을 수정한 뒤 다시 저장해주세요.`;
  }

  return null;
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

function buildCurrentMonthOffInputSnapshot(
  constraints: ConstraintMap,
  notes: CommentMap,
  currentMonth: string
): ScheduleComparisonOffInputSnapshot {
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

  return {
    constraints: filteredConstraints,
    notes: filteredNotes,
  };
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

  const offInput = buildCurrentMonthOffInputSnapshot(constraints, notes, currentMonth);
  const filteredConstraints = offInput.constraints;
  const filteredNotes = offInput.notes;

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

function mergeComplianceAssignments(
  previousAssignments: AssignmentMap,
  currentAssignments: AssignmentMap,
): AssignmentMap {
  const merged: AssignmentMap = {};

  for (const [employeeId, dateMap] of Object.entries(previousAssignments || {})) {
    merged[employeeId] = { ...(dateMap || {}) };
  }

  for (const [employeeId, dateMap] of Object.entries(currentAssignments || {})) {
    merged[employeeId] = {
      ...(merged[employeeId] || {}),
      ...(dateMap || {}),
    };
  }

  return merged;
}

function extractCurrentMonthAssignments(
  assignments: AssignmentMap,
  month: string | null | undefined,
): AssignmentMap {
  if (!month) {
    return {};
  }

  const currentAssignments: AssignmentMap = {};
  for (const [employeeId, dateMap] of Object.entries(assignments || {})) {
    for (const [date, shiftCode] of Object.entries(dateMap || {})) {
      if (!shiftCode || !date.startsWith(month)) {
        continue;
      }

      if (!currentAssignments[employeeId]) {
        currentAssignments[employeeId] = {};
      }
      currentAssignments[employeeId]![date] = shiftCode;
    }
  }

  return currentAssignments;
}

function buildCurrentMonthComplianceAssignments(
  assignments: AssignmentMap,
  dates: Array<{ date: string; isLastMonth?: boolean }>,
  employees: Array<{ id: string }>,
  month: string | null | undefined,
): AssignmentMap {
  if (!month) {
    return {};
  }

  const currentMonthDates = new Set<string>();
  for (const dateColumn of dates || []) {
    if (!dateColumn.isLastMonth && dateColumn.date.startsWith(month)) {
      currentMonthDates.add(dateColumn.date);
    }
  }

  for (const dateMap of Object.values(assignments || {})) {
    for (const date of Object.keys(dateMap || {})) {
      if (date.startsWith(month)) {
        currentMonthDates.add(date);
      }
    }
  }

  const sortedCurrentMonthDates = Array.from(currentMonthDates).sort();
  if (sortedCurrentMonthDates.length === 0) {
    return {};
  }

  const employeeIds = new Set<string>();
  for (const employee of employees || []) {
    if (employee.id) {
      employeeIds.add(employee.id);
    }
  }
  for (const employeeId of Object.keys(assignments || {})) {
    employeeIds.add(employeeId);
  }

  const complianceAssignments: AssignmentMap = {};
  for (const employeeId of employeeIds) {
    complianceAssignments[employeeId] = {};
    for (const date of sortedCurrentMonthDates) {
      const shiftCode = assignments[employeeId]?.[date];
      complianceAssignments[employeeId]![date] = shiftCode?.trim() ? shiftCode : 'O';
    }
  }

  return complianceAssignments;
}

function buildVisiblePreviousMonthComplianceAssignments(
  assignments: AssignmentMap,
  dates: Array<{ date: string; isLastMonth?: boolean }>,
  employees: Array<{ id: string }>,
): AssignmentMap {
  const visiblePreviousMonthDates = dates
    .filter((dateColumn) => dateColumn.isLastMonth)
    .map((dateColumn) => dateColumn.date)
    .sort();

  if (visiblePreviousMonthDates.length === 0) {
    return {};
  }

  const employeeIds = new Set<string>();
  for (const employee of employees || []) {
    if (employee.id) {
      employeeIds.add(employee.id);
    }
  }
  for (const employeeId of Object.keys(assignments || {})) {
    employeeIds.add(employeeId);
  }

  const complianceAssignments: AssignmentMap = {};
  for (const employeeId of employeeIds) {
    complianceAssignments[employeeId] = {};
    for (const date of visiblePreviousMonthDates) {
      const shiftCode = assignments[employeeId]?.[date];
      complianceAssignments[employeeId]![date] = shiftCode?.trim() ? shiftCode : 'O';
    }
  }

  return complianceAssignments;
}

function getComparisonComplianceResult(versionId: string | null | undefined): ScheduleComplianceResult | null {
  if (!versionId) {
    return null;
  }

  if (versionId === previewVersionId.value) {
    return complianceResult.value;
  }

  return comparisonVersionDataById.value[versionId]?.complianceResult ?? null;
}

function applyPreviousMonthFallbackWarning(result: ScheduleComplianceResult): ScheduleComplianceResult {
  if (!previousMonthFallbackError.value) {
    return result;
  }

  return {
    ...result,
    mandatoryPassed: false,
    canFinalizeLocally: false,
    checkRequiredCount: result.checkRequiredCount + 1,
    summaries: result.summaries.map((summary) => {
      if (summary.status !== 'passed') {
        return summary;
      }

      return {
        ...summary,
        status: 'check_required',
        message: PREVIOUS_MONTH_CONTEXT_CHECK_REQUIRED_MESSAGE,
      };
    }),
  };
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

async function loadComparisonVersionData(versionId: string): Promise<ComparisonVersionData> {
  const currentMonth = scheduleStore.basicInfo?.month;
  if (!currentMonth) {
    throw new Error('비교할 근무표 월 정보를 확인할 수 없습니다.');
  }

  const [assignmentData, preferenceData] = await Promise.all([
    getScheduleVersionAssignments(versionId),
    getScheduleVersionPreferences(versionId),
  ]);
  const { currentAssignments, previousAssignments } = splitAssignmentsByMonth(
    assignmentData.assignments,
  );
  const mergedPreviousAssignments = mergeAssignmentMapsWithFallback(
    previousAssignments,
    previousMonthFallbackAssignments.value,
    buildRollingHistoryWindow(currentMonth, 7).previousMonthDates,
  );
  const offInput = buildCurrentMonthOffInputSnapshot(
    preferenceData.constraints,
    preferenceData.notes,
    currentMonth,
  );
  const complianceResult = applyPreviousMonthFallbackWarning(
    evaluateScheduleCompliance({
      month: currentMonth,
      employees: grid.employees.value,
      assignments: mergeComplianceAssignments(
        mergedPreviousAssignments,
        currentAssignments,
      ),
      offRequests: offInput.constraints,
      shifts: organizationStore.shifts,
    })
  );

  return {
    assignments: currentAssignments,
    offInput,
    complianceResult,
  };
}

async function hydrateComparisonVersionData(): Promise<void> {
  const selectedIds = [leftComparedVersion.value?.id, rightComparedVersion.value?.id]
    .filter((versionId): versionId is string => Boolean(versionId));
  const selectedIdSet = new Set(selectedIds);
  const nextCache = { ...comparisonVersionDataById.value };

  for (const cachedId of Object.keys(nextCache)) {
    if (!selectedIdSet.has(cachedId)) {
      delete nextCache[cachedId];
    }
  }

  if (selectedIds.length < 2) {
    comparisonVersionDataById.value = nextCache;
    return;
  }

  const loadedData = await Promise.all(
    selectedIds.map(async (versionId) => ({
      versionId,
      data: await loadComparisonVersionData(versionId),
    }))
  );

  for (const { versionId, data } of loadedData) {
    nextCache[versionId] = data;
  }
  comparisonVersionDataById.value = nextCache;
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

  if (previousMonthFallbackError.value) {
    throw new Error('전월 확정 근무 이력을 불러오지 못했습니다. 다시 시도해주세요.');
  }

  const { solverRequest } = await scheduleSolverRequest.buildScheduleSolverRequest({
    basicInfo,
    scheduleId: ensureScheduleId(),
    versionId,
    shifts: organizationStore.shifts,
    siteRequirements: scheduleStore.siteRequirements,
    lastMonthDays: lastMonthDays.value,
    siteId: null,
    fallbackHistoryAssignments: previousMonthFallbackPlanningAssignments.value,
    onSiteRequirementsLoaded: (requirements) => {
      scheduleStore.setSiteRequirements(requirements);
    },
  });

  return solverRequest;
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
  let shouldFinishLoadingBar = true;
  window.$loadingBar?.start();

  try {
    if (previousMonthFallbackError.value) {
      throw new Error('전월 확정 근무 이력을 불러오지 못했습니다. 다시 시도해주세요.');
    }

    await loadPreferencesForDisplay();
    if (isLocalSolverHost()) {
      const solverRequest = await buildSolverRequest();
      logLocalSolverPayload(solverRequest);
      showError('현재 환경에서는 근무표를 생성할 수 없습니다.');
      return;
    }

    await resetPreferenceResolutionByVersion(previewVersionId.value);

    const solverRequest = await buildSolverRequest();
    await solver.startSolver(previewVersionId.value, solverRequest);

    resetRealtimeState();
    startAssignmentsRefresh();
    showSuccess('근무표 생성을 시작했습니다.');
  } catch (error) {
    shouldFinishLoadingBar = false;
    window.$loadingBar?.error();
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
        console.warn('충돌 후 상태 새로고침 중 오류:', syncError);
      }
      return;
    }

    showError(toUserFacingErrorMessage(error, '근무표 생성을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.'));
  } finally {
    if (shouldFinishLoadingBar) {
      window.$loadingBar?.finish();
    }
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
  showSuccess('최신 상태로 새로고침했습니다.');
}

async function handleSyncSolverState() {
  if (isRecoveringSolver.value) return;

  isRecoveringSolver.value = true;
  try {
    await syncSolverStateInternal();
  } catch (error) {
    console.warn('상태 새로고침 중 오류:', error);
    showError(toUserFacingErrorMessage(error, '최신 상태를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'));
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
      showSuccess('이미 생성 상태가 해제되어 최신 상태로 새로고침했습니다.');
      return;
    }

    let executionId = currentPreview.activeSolverExecutionId ?? previewVersionExecutionId.value;
    if (!executionId) {
      const schedule = (await getScheduleStatus(ensureScheduleId())) as ScheduleStatusRow;
      executionId = schedule.solver_execution_id;
    }

    if (!executionId) {
      throw new Error('생성 작업 정보를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.');
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

    showError(toUserFacingErrorMessage(error, '생성 상태를 정리하지 못했습니다. 잠시 후 다시 시도해주세요.'));
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
  return toUserFacingErrorMessage(
    error,
    '결과 화면을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
  );
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
      throw new Error('근무표 정보를 다시 불러오지 못했습니다. 이전 단계부터 다시 진행해주세요.');
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

function handleSelectedResultEmployeeUpdate(employeeId: string | null) {
  selectedResultEmployeeId.value = employeeId;
  autoSelectedResultEmployeeId.value = null;
}

watch(
  [
    resultViewMode,
    () => grid.employees.value,
    () => complianceResult.value.violations,
  ],
  () => {
    if (resultViewMode.value !== 'employee') {
      return;
    }

    const isCurrentSelectionManual = (
      selectedResultEmployeeId.value !== null
      && selectedResultEmployeeId.value !== autoSelectedResultEmployeeId.value
    );
    const currentEmployeeId = isCurrentSelectionManual ? selectedResultEmployeeId.value : null;

    const nextEmployeeId = selectDefaultResultEmployeeId(
      grid.employees.value,
      complianceResult.value.violations,
      currentEmployeeId,
    );
    selectedResultEmployeeId.value = nextEmployeeId;
    autoSelectedResultEmployeeId.value = isCurrentSelectionManual && nextEmployeeId === currentEmployeeId
      ? null
      : nextEmployeeId;
  },
  { immediate: true }
);

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
      if (newStatus === 'complete' || newStatus === 'changed') {
        resultViewMode.value = 'site';
      }
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
  router.push(buildStep4RouteLocation({
    versionId: previewVersionId.value,
  }));
}

function handleBack() {
  if (isInputEditDisabled.value) {
    showInfo(
      isVersionReadOnly.value
        ? '현재 보는 근무표안 상태에서는 입력을 수정할 수 없습니다.'
        : '근무표 생성 중에는 입력을 수정할 수 없습니다. 완료 후 다시 시도해주세요.'
    );
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
    await hydrateComparisonVersionData();
  } catch (error) {
    console.warn('근무표안 비교 로드 중 오류:', error);
    compareModalErrorMessage.value = '비교 데이터를 불러오지 못했습니다.';
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

  if (isCompareModalOpen.value) {
    await hydrateComparisonVersionData();
  }
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
      showError(toUserFacingErrorMessage(error, '자세히 보는 안을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'));
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
    showError(toUserFacingErrorMessage(error, '자세히 보는 안을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'));
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
    showError(toUserFacingErrorMessage(error, '비교할 근무표안을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'));
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
    showError(toUserFacingErrorMessage(error, '선택한 근무표안으로 변경하지 못했습니다. 잠시 후 다시 시도해주세요.'));
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
        showError(toUserFacingErrorMessage(error, '근무표안을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.'));
      }
    },
  });
}

async function handlePrimaryAction() {
  if (isPrimaryActionRunning.value) {
    return;
  }

  if (isPrimaryActionButtonDisabled.value) {
    if (visiblePrimaryActionBlockReason.value) {
      showInfo(visiblePrimaryActionBlockReason.value);
    }
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
    showError(toUserFacingErrorMessage(error, '요청한 작업을 완료하지 못했습니다. 잠시 후 다시 시도해주세요.'));
  } finally {
    isPrimaryActionRunning.value = false;
  }
}

async function handleFinalizeAction() {
  if (isFinalizeActionDisabled.value) {
    if (complianceFinalizeBlockReason.value) {
      showInfo(complianceFinalizeBlockReason.value);
    } else if (unsavedFinalizeBlockReason.value) {
      showInfo(unsavedFinalizeBlockReason.value);
    } else if (primaryActionDisabledReason.value) {
      showInfo(primaryActionDisabledReason.value);
    }
    return;
  }

  await handlePrimaryAction();
}

function handleUnfinalizeAction() {
  if (isUnfinalizeActionDisabled.value) {
    return;
  }

  const versionId = lockedVersionId.value;
  if (!versionId) {
    return;
  }

  window.$dialog?.warning({
    title: '확정 취소',
    content: '확정을 취소하면 이 월은 실적 계산에서 제외되고 다시 편집할 수 있습니다. 계속할까요?',
    positiveText: '확정 취소',
    negativeText: '닫기',
    onPositiveClick: async () => {
      isPrimaryActionRunning.value = true;

      try {
        await unfinalizePhase2ScheduleVersion(versionId);
        showSuccess('근무표 확정을 취소했습니다.');

        await hub.hydrate();
        await syncPreviewWorkspace({
          syncOriginal: true,
          clearChanges: true,
          forceAssignmentSync: true,
        });
      } catch (error) {
        console.warn('확정 취소 중 오류:', error);
        showError(toUserFacingErrorMessage(error, '확정을 취소하지 못했습니다. 잠시 후 다시 시도해주세요.'));
      } finally {
        isPrimaryActionRunning.value = false;
      }
    },
  });
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

  const preSaveBlockMessage = getPreSaveBlockMessage();
  if (preSaveBlockMessage) {
    showInfo(preSaveBlockMessage);
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

async function handleDeleteGeneratedResults(scope: 'selected_version') {
  if (!previewVersionId.value) {
    throw new Error('현재 보는 근무표안을 확인할 수 없습니다.');
  }

  const resetResponse = await deletePhase2ScheduleGeneratedResults(
    ensureScheduleId(),
    {
      scope,
      sourceVersionId: previewVersionId.value,
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

  showSuccess('현재 근무표 생성 결과를 삭제했습니다. Step4에서 요청을 다시 확인해주세요.');
  await router.push(buildStep4RouteLocation({
    versionId: resetResponse.selectedVersionId,
  }));
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
    const message = toUserFacingErrorMessage(error, '근무표를 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.');
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
