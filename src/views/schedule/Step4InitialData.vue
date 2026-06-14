<template>
  <AppContainer
    width="full"
    data-test="step4-app-container"
    class="flex h-full flex-col"
  >
    <StepIndicator
      :current-step="4"
      class="mb-4"
    />

    <n-alert
      v-if="baselineErrorMessage"
      type="error"
      class="mb-4"
    >
      <template #header>
        Step4 초기화 실패
      </template>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm">
          {{ baselineErrorMessage }}
        </p>
        <n-button
          size="small"
          :loading="isBaselineLoading"
          @click="handleRetryBaseline"
        >
          다시 시도
        </n-button>
      </div>
    </n-alert>

    <n-alert
      v-if="offPolicyLoadError"
      type="error"
      class="mb-4"
      data-test="off-policy-error-alert"
    >
      <template #header>
        Off 정책 로드 실패
      </template>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm">
          {{ offPolicyLoadError }}
        </p>
        <n-button
          size="small"
          data-test="off-policy-retry"
          :loading="isOffPolicyLoading"
          @click="handleRetryOffPolicyLoad"
        >
          다시 시도
        </n-button>
      </div>
    </n-alert>

    <div
      v-if="isInitialDataLoading && !baselineErrorMessage"
      data-test="step4-initial-loading"
      class="flex min-h-[520px] flex-1 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10"
    >
      <div class="flex flex-col items-center gap-3 text-center text-sm text-slate-500">
        <n-spin size="large" />
        <p>사전 Off 요청 데이터를 불러오는 중입니다.</p>
      </div>
    </div>

    <template v-else>
      <n-alert
        v-if="policyRejectionSummaries.length > 0"
        type="warning"
        class="mb-4"
      >
        <template #header>
          정책상 거부된 요청 {{ policyRejectionSummaries.length }}건
        </template>
        <ul class="space-y-1 text-sm">
          <li
            v-for="summary in policyRejectionSummaries.slice(0, 3)"
            :key="summary"
          >
            {{ summary }}
          </li>
        </ul>
      </n-alert>

      <n-alert
        v-if="preceptorReconcileAlertSummary"
        data-test="preceptor-reconcile-alert"
        type="info"
        class="mb-4"
      >
        {{ preceptorReconcileAlertSummary }}
      </n-alert>

      <n-alert
        v-if="hasPendingLocalDraft"
        data-test="pending-local-draft-alert"
        type="info"
        class="mb-4"
      >
        <template #header>
          이전에 입력하던 Off 요청이 있습니다
        </template>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm leading-6 text-slate-600">
            저장된 데이터와 다를 수 있어 자동으로 반영하지 않았습니다. 필요한 경우 직접 불러와 이어서 작업하세요.
          </p>
          <div class="flex gap-2">
            <n-button
              size="small"
              type="primary"
              @click="handleLoadPendingLocalDraft"
            >
              불러오기
            </n-button>
            <n-button
              size="small"
              secondary
              @click="handleDiscardPendingLocalDraft"
            >
              삭제
            </n-button>
          </div>
        </div>
      </n-alert>

      <!-- Off 요청 규칙 안내 배너 -->
      <div class="mb-4 rounded-2xl border border-sky-100 bg-sky-50/60 px-5 py-3.5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <div class="mt-0.5 shrink-0 rounded-full bg-sky-100 p-1.5">
              <svg
                class="size-4 text-sky-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </div>
            <div class="space-y-2">
              <p class="text-sm font-medium text-slate-700">
                Off 요청은 전일 야간 근무 및 당일 근무 배정을 지양하며, 인력 상황에 따라 수락되지 않을 수 있습니다.
              </p>
              <div
                v-if="isOffRequestGuideExpanded"
                class="space-y-2 text-sm text-slate-600"
              >
                <div class="rounded-xl bg-white/70 px-4 py-3">
                  <p class="mb-2 font-medium text-slate-700">
                    🛡️ 근무자 휴식 보장 원칙
                  </p>
                  <p class="leading-relaxed">
                    근무자가 특정 날짜에 Off를 요청한 경우, <strong>해당 날짜의 모든 근무 배정</strong>을 지양합니다. 또한 <strong>전날 야간 근무 배정</strong>도 함께 지양하여 충분한 휴식을 보장합니다. 예를 들어 5월 5일 Off를 요청했다면, 5월 4일 야간 근무와 5월 5일 모든 근무를 배정하지 않도록 합니다.
                  </p>
                </div>
                <div class="rounded-xl bg-white/70 px-4 py-3">
                  <p class="mb-2 font-medium text-slate-700">
                    ⚖️ Off 요청 수락 우선순위 기준
                  </p>
                  <ul class="list-inside list-disc space-y-1 leading-relaxed">
                    <li>
                      해당 일자에 가용한 근무자가 부족한 경우 Off 요청이 수락되지 않을 수 있습니다.
                    </li>
                    <li>
                      같은 날짜에 Off를 요청한 근무자가 많은 경우, <strong>이전 Off 횟수가 적은 근무자</strong>에게 우선순위를 부여합니다. 이를 통해 모든 근무자에게 공정한 휴식 기회를 제공합니다.
                    </li>
                  </ul>
                </div>
                <div class="rounded-xl bg-white/70 px-4 py-3">
                  <p class="mb-2 font-medium text-slate-700">
                    🔗 프리셉터 짝 Off 연동
                  </p>
                  <p class="leading-relaxed">
                    프리셉터 짝으로 지정된 근무자는 같은 날짜 Off가 함께 반영됩니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <n-button
            size="small"
            text
            type="info"
            class="shrink-0 font-medium"
            data-test="off-guide-toggle"
            @click="isOffRequestGuideExpanded = !isOffRequestGuideExpanded"
          >
            {{ isOffRequestGuideExpanded ? '접기' : '자세히 보기' }}
          </n-button>
        </div>
      </div>

      <div class="mb-4 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <h2 class="text-lg font-bold text-slate-900">
                {{ scheduleStore.basicInfo?.month }} 사전 Off 요청 입력
              </h2>
              <span
                v-if="orgStore.current"
                class="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
              >
                {{ orgStore.current.name }}
              </span>
            </div>
            <p class="text-sm text-slate-600">
              사전 Off 요청을 입력하고 아래 캘린더에서 반영 내용을 확인하세요.
            </p>
          </div>
          <div class="flex flex-col items-end gap-2 text-right">
            <p class="text-xs font-medium text-slate-500">
              {{ hasUnpersistedAppliedChanges ? '로컬 반영됨 · 요청 입력에서 저장 필요' : '저장된 변경 없음' }}
            </p>
            <p
              v-if="pageLevelBlockedReason"
              class="text-sm font-medium text-amber-700"
            >
              {{ pageLevelBlockedReason }}
            </p>
            <n-button
              v-if="!isRequestDrawerOpen"
              data-test="request-drawer-toggle"
              type="primary"
              size="large"
              strong
              class="min-w-[168px] font-semibold shadow-sm"
              @click="handleOpenRequestDrawerClick"
            >
              {{ requestDrawerCtaLabel }}
            </n-button>
          </div>
        </div>
      </div>

      <div class="flex min-h-[780px] flex-1 flex-col gap-4 xl:min-h-[860px] 2xl:min-h-[920px]">
        <div
          class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          <div class="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="space-y-1">
                <h3 class="text-base font-semibold text-slate-900">
                  사전 Off 요청 캘린더
                </h3>
                <p
                  v-if="selectedEmployeeName || selectedDateSummary"
                  class="text-sm text-slate-600"
                >
                  <span v-if="selectedEmployeeName">{{ selectedEmployeeName }}</span>
                  <span v-if="selectedDateSummary">
                    <span v-if="selectedEmployeeName"> · </span>{{ selectedDateSummary }}
                  </span>
                </p>
              </div>
              <div class="flex flex-wrap items-center justify-end gap-2">
                <n-button
                  data-test="step4-excel-download-button"
                  size="small"
                  secondary
                  type="success"
                  class="font-semibold"
                  @click="handleDownloadOffRequestExcel"
                >
                  <template #icon>
                    <svg
                      class="size-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <path d="M7 10l5 5 5-5" />
                      <path d="M12 15V3" />
                    </svg>
                  </template>
                  Excel 다운로드
                </n-button>
                <n-button
                  data-test="step4-excel-upload-button"
                  size="small"
                  secondary
                  type="success"
                  class="font-semibold"
                  @click="handleOpenOffRequestExcelUploadModal"
                >
                  <template #icon>
                    <svg
                      class="size-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <path d="M17 8l-5-5-5 5" />
                      <path d="M12 3v12" />
                    </svg>
                  </template>
                  Excel 업로드
                </n-button>
              </div>
            </div>
          </div>

          <n-alert
            v-if="hasHiddenUnappliedDraft"
            data-test="hidden-request-draft-alert"
            type="warning"
            class="mx-5 mt-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="text-sm font-medium">
                {{ requestDrawerStatusCopy }}
              </p>
              <n-button
                data-test="request-drawer-toggle"
                size="small"
                secondary
                type="warning"
                @click="handleOpenRequestDrawerClick"
              >
                {{ requestDrawerCtaLabel }}
              </n-button>
            </div>
          </n-alert>

          <div class="relative min-h-0 flex-1 overflow-hidden">
            <n-spin
              :show="grid.loading.value"
              class="h-full"
            >
              <div class="h-full overflow-hidden">
                <ScheduleGrid
                  v-if="grid.employees.value.length > 0 && grid.dates.value.length > 0"
                  class="h-full"
                  mode="planning"
                  :employees="grid.employees.value"
                  :dates="grid.dates.value"
                  :constraints="constraints"
                  :comments="displayConstraintNotes"
                  :readonly="Boolean(step4MutationBlockedReason)"
                  :show-last-month="false"
                  :selected-employee-id="selectedEmployeeId"
                  :selected-dates="draftSelectedDates"
                  planning-interaction-mode="select"
                  @update:assignment="handleAssignmentUpdate"
                  @context-menu="handleContextMenu"
                  @header-click="handleHeaderClick"
                  @cell-select="handleGridCellSelect"
                />
                <div
                  v-else-if="!grid.loading.value"
                  class="flex h-full items-center justify-center text-gray-400"
                >
                  직원 데이터 또는 날짜 데이터가 없습니다. (Emp: {{ grid.employees.value.length }},
                  Date: {{ grid.dates.value.length }})
                </div>
              </div>
            </n-spin>
          </div>
        </div>
      </div>

      <n-drawer
        :show="isRequestDrawerOpen"
        placement="right"
        width="min(100vw, 720px)"
        :auto-focus="false"
        @update:show="handleRequestDrawerVisibility"
      >
        <div
          data-test="step4-request-drawer"
          class="flex h-full flex-col bg-white"
        >
          <div class="border-b border-slate-200 px-5 py-4">
            <div class="flex items-start justify-between gap-4">
              <div class="space-y-1">
                <h3 class="text-base font-semibold text-slate-900">
                  요청 입력
                </h3>
                <p class="text-sm text-slate-600">
                  {{ requestDrawerHelpCopy }}
                </p>
              </div>
              <n-button
                data-test="request-drawer-close-button"
                size="small"
                secondary
                @click="handleCloseRequestDrawer"
              >
                닫기
              </n-button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto px-5 py-4">
            <Step4RequestComposer
              ref="requestComposerRef"
              :employees="grid.employees.value"
              :dates="grid.dates.value"
              :selected-employee-ids="selectedEmployeeIds"
              :request-catalog="requestCatalog"
              :draft-request-type-id="draftRequestTypeId"
              :draft-selection-mode="draftSelectionMode"
              :draft-selected-dates="draftSelectedDates"
              :draft-note="draftNote"
              :selected-date-summary="selectedDateSummary"
              :current-employee-requests="currentEmployeeRequests"
              :has-unapplied-draft="hasUnappliedDraft"
              :has-unpersisted-applied-changes="hasUnpersistedAppliedChanges"
              :can-save-applied-changes="canSaveAppliedChanges"
              :is-save-applied-changes-saving="isSavingStep4Preferences"
              :save-applied-changes-disabled-reason="saveAppliedChangesDisabledReason"
              :is-apply-request-saving="isApplyRequestSaving"
              :request-apply-status-message="requestApplyStatusMessage"
              :request-apply-status-tone="requestApplyStatusTone"
              :apply-disabled-reason="applyDisabledReason"
              :blocked-transition-reason="blockedTransitionReason"
              :preceptor-pair-hints="preceptorPairHints"
              @select-employee="handleSelectEmployee"
              @update:request-type="draftRequestTypeId = $event"
              @update:selection-mode="handleDraftSelectionModeUpdate"
              @update:selected-dates="handleDraftSelectedDatesUpdate"
              @update:note="handleDraftNoteUpdate"
              @apply-request="applyDraftRequest"
              @save-applied-changes="handleSaveAppliedChanges"
              @reset-draft="resetDraftState({ preserveEmployee: true })"
              @edit-request="hydrateDraftFromRequestRow"
              @delete-request="handleDeleteRequest"
            />
          </div>
        </div>
      </n-drawer>

      <!-- Bottom Actions -->
      <div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t bg-white py-4">
        <div class="flex gap-3">
          <n-popconfirm
            v-if="cameFromDashboard"
            @positive-click="handleReturnToDashboard"
          >
            <template #trigger>
              <n-button size="large">
                근무표 관리로 돌아가기
              </n-button>
            </template>
            근무표 관리로 돌아가면 현재 입력한 데이터가 초기화됩니다. 계속하시겠습니까?
          </n-popconfirm>
          <n-button
            v-if="!cameFromDashboard"
            size="large"
            @click="handlePrev"
          >
            ← 이전 단계
          </n-button>
          <n-button
            size="large"
            secondary
            type="error"
            :disabled="Boolean(step4MutationBlockedReason)"
            @click="handleClearAllOffRequests"
          >
            모든 Off 요청 초기화
          </n-button>
        </div>

        <div class="flex flex-col items-end gap-2">
          <p
            v-if="pageLevelBlockedReason"
            class="text-sm text-amber-700"
          >
            {{ pageLevelBlockedReason }}
          </p>
          <div class="flex gap-3">
            <n-button
              type="primary"
              size="large"
              :loading="isSubmitting"
              :disabled="isSubmitting || !canPersistStep4"
              @click="handleNext"
            >
              {{ nextStepLabel }}
            </n-button>
          </div>
        </div>
      </div>
    </template>

    <!-- Modals -->
    <CommentModal
      v-model:show="showCommentModal"
      :employee-name="selectedCell?.employeeName || ''"
      :date="selectedCell?.date || ''"
      :initial-value="selectedCellComment"
      @save="handleSaveComment"
    />

    <DaySummaryModal
      v-model:show="showDaySummaryModal"
      :date="selectedDaySummaryDate || ''"
      :employees="grid.employees.value"
      :assignments="constraints"
      :comments="displayConstraintNotes"
      @close="showDaySummaryModal = false"
    />

    <Step4OffRequestExcelUploadModal
      :show="isOffRequestExcelUploadModalOpen"
      :employees="grid.employees.value"
      :dates="grid.dates.value"
      :month="scheduleStore.basicInfo?.month ?? ''"
      @update:show="isOffRequestExcelUploadModalOpen = $event"
      @apply="handleApplyOffRequestExcelUpload"
    />
  </AppContainer>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppContainer from '@/components/layout/AppContainer.vue';
import { useScheduleStore } from '@/stores/schedule';
import { useOrganizationStore } from '@/stores/organization';
import { useAuthStore } from '@/stores/auth';
import { useScheduleGrid } from '@/composables/useScheduleGrid';
import {
  ensurePhase2Schedule,
  deleteThisMonthVersionAssignments,
  getScheduleVersionAssignments,
  getScheduleVersionPreferences,
  getSchedulePreferences,
  recheckPhase2ScheduleVersion,
  saveScheduleVersionPreferences,
} from '@/api/schedule';
import { getOffRequestPolicies } from '@/api/ops';
import { NAlert, NButton, NDrawer, NPopconfirm, NSpin } from 'naive-ui';
import ScheduleGrid from '@/components/schedule/ScheduleGrid.vue';
import StepIndicator from '@/components/schedule/StepIndicator.vue';
import CommentModal from '@/components/schedule/CommentModal.vue';
import DaySummaryModal from '@/components/schedule/DaySummaryModal.vue';
import Step4OffRequestExcelUploadModal from '@/components/schedule/Step4OffRequestExcelUploadModal.vue';
import Step4RequestComposer from '@/components/schedule/request-entry/Step4RequestComposer.vue';
import { downloadOffRequestTemplate } from '@/utils/offRequestExcel';
import { showError, showInfo, showSuccess } from '@/utils/message';
import {
  buildStep5Route,
  getDefaultCompareVersionIds,
  getDefaultExecutedFocusVersionId,
  getDefaultStep5FocusVersionId,
  hasExecutedVersionHistory,
  resolveStep4VersionState,
} from '@/utils/scheduleVersionResolver';
import { watchDebounced } from '@vueuse/core';
import type {
  AssignmentMap,
  CommentMap,
  ConstraintCode,
  ConstraintMap,
  SchedulePreference,
  ScheduleVersionSummary,
} from '@/types/schedule';
import type { OffRequestPolicyRule } from '@/types/ops';
import {
  buildTempPreferencesStorageKey,
  buildTempPreferencesStorageScope,
  clearScopedTempPreferencesStorage,
  migrateLegacyTempPreferencesToV2,
  readTempPreferencesEnvelopeV2,
  writeTempPreferencesEnvelopeV2,
} from '@/utils/tempPreferencesStorage';
import { getAppHomeRoutePath, getScheduleStepRoutePath } from '@/constants/routes';
import {
  expandOffDeltaWithPair,
  reconcilePreceptorOffPairs,
  resolvePreceptorPair,
  validatePairedOffChanges,
  type OffEdit,
  type PairCorrectionSummary,
  type PairSkipSummary,
} from '@/utils/preceptorOffSync';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const scheduleStore = useScheduleStore();
const orgStore = useOrganizationStore();
const grid = useScheduleGrid();

const isSubmitting = ref(false);
const isInitialDataLoading = ref(true);
const isSavingStep4Preferences = ref(false);
const isBaselineLoading = ref(false);
const baselineErrorMessage = ref<string | null>(null);
const offRequestPolicyRules = ref<OffRequestPolicyRule[]>([]);
const offPolicyLoadError = ref<string | null>(null);
const isOffPolicyLoading = ref(false);
const isReturningToDashboard = ref(false);
const cameFromDashboard = computed(() => route.query.from === 'dashboard');

const constraints = ref<ConstraintMap>({});
const constraintNotes = ref<CommentMap>({});
const policyRejectionReasons = ref<CommentMap>({});
const policyCheckStatuses = ref<Record<string, Record<string, PolicyCheckStatus>>>({});

// Modals state
const showCommentModal = ref(false);
const selectedCell = ref<{ employeeId: string; employeeName: string; date: string } | null>(null);
const showDaySummaryModal = ref(false);
const selectedDaySummaryDate = ref<string>('');
const isOffRequestExcelUploadModalOpen = ref(false);
const requestComposerRef = ref<{
  focusSearchInput?: () => void;
  prefillSearchQuery?: (value: string) => void;
} | null>(null);
const isRequestDrawerOpen = ref(false);
const isRequestDrawerOpenedFromGridShortcut = ref(false);
const isOffRequestGuideExpanded = ref(false);
const preceptorReconcileAlertSummary = ref<string | null>(null);

const selectedEmployeeIds = ref<string[]>([]);
const draftRequestTypeId = ref<Step4RequestTypeId>('off');
const draftSelectionMode = ref<Step4SelectionMode>('single');
const draftSelectedDates = ref<string[]>([]);
const draftNote = ref('');
const editingRequestKey = ref<string | null>(null);
const dirtySinceLastApply = ref(false);
const blockedTransitionReason = ref<string | null>(null);
const isApplyRequestSaving = ref(false);
const requestApplyStatusMessage = ref<string | null>(null);
const requestApplyStatusTone = ref<RequestApplyStatusTone>('neutral');

const VALID_CONSTRAINTS = new Set<ConstraintCode>(['O']);
type RequestApplyStatusTone = 'neutral' | 'info' | 'success' | 'error';
type PreferenceSnapshot = {
  constraints: ConstraintMap;
  notes: CommentMap;
};

type BaselineState = {
  scheduleId: string;
  schedulePublicId: string;
  previewVersionId: string;
  selectedVersionId: string | null;
  defaultRouteFocusVersionId: string | null;
  hasExecutedHistory: boolean;
  versions: ScheduleVersionSummary[];
  defaultStep5FocusVersionId: string | null;
  defaultStep5CompareVersionIds: string[];
  hasCurrentMonthAssignments: boolean;
};

function createBaselineState(input: BaselineState): BaselineState {
  return input;
}

type Step4HandoffContext = {
  baseline: BaselineState;
  currentSnapshot: PreferenceSnapshot;
};

type Step4RequestTypeId = 'off';
type Step4SelectionMode = 'single' | 'multi';
type PolicyCheckStatus = 'pending' | 'passed' | 'rejected' | null;

type Step4RequestCatalogItem = {
  id: Step4RequestTypeId;
  label: string;
  shortCode: ConstraintCode;
  colorToken: 'shift-off';
  selectionModeSupport: Step4SelectionMode[];
  noteRequired: boolean;
  isActive: boolean;
};

type EmployeeRequestRowVM = {
  requestKey: string;
  employeeId: string;
  dates: string[];
  requestTypeId: Step4RequestTypeId;
  requestCode: 'O';
  note: string;
  status: 'local-pending' | 'persisted' | 'policy-checking' | 'policy-rejected';
  policyRejectionReason: string | null;
};

type PreceptorPairHint = {
  label: string;
};

const STEP4_REQUEST_CATALOG: Step4RequestCatalogItem[] = [
  {
    id: 'off',
    label: 'Off',
    shortCode: 'O',
    colorToken: 'shift-off',
    selectionModeSupport: ['single', 'multi'],
    noteRequired: false,
    isActive: true,
  },
];

const baselineState = ref<BaselineState | null>(null);
const baselinePreferenceSnapshot = ref<{
  previewVersionId: string;
  snapshot: PreferenceSnapshot;
} | null>(null);
const pendingLocalDraftSnapshot = ref<PreferenceSnapshot | null>(null);

const requestCatalog = STEP4_REQUEST_CATALOG;
const OPEN_DRAFT_BLOCKED_REASON = '미반영 요청이 있습니다. 먼저 반영하거나 선택을 초기화해 주세요.';
const HIDDEN_DRAFT_BLOCKED_REASON =
  '미반영 요청이 있습니다. 요청 입력을 다시 열어 마무리해 주세요.';
const OFF_POLICY_LOAD_ERROR_MESSAGE =
  'Off 정책을 불러오지 못해 요청을 반영할 수 없습니다.';
const selectedEmployeeId = computed(() => selectedEmployeeIds.value[0] ?? null);
const selectedEmployees = computed(() => {
  const selectedEmployeeIdSet = new Set(selectedEmployeeIds.value);
  return grid.employees.value.filter((employee) => selectedEmployeeIdSet.has(employee.id));
});
const selectedEmployeeName = computed(() => {
  if (selectedEmployees.value.length === 0) return '';
  if (selectedEmployees.value.length === 1) return selectedEmployees.value[0]?.name ?? '';
  return `${selectedEmployees.value[0]?.name ?? ''} 외 ${selectedEmployees.value.length - 1}명`;
});
const selectedDateSummary = computed(() => {
  const dates = [...draftSelectedDates.value].sort();
  if (dates.length === 0) return '';

  if (dates.length === 1) {
    return formatDateChip(dates[0]!);
  }

  const isContinuous = dates.every((date, index) => {
    if (index === 0) return true;
    return diffDateDays(dates[index - 1]!, date) === 1;
  });

  if (isContinuous) {
    return `${formatDateChip(dates[0]!)} ~ ${formatDateChip(dates[dates.length - 1]!)}`
  }

  return dates.map((date) => formatDateChip(date)).join(', ');
});
const hasUnappliedDraft = computed(() => {
  return dirtySinceLastApply.value && selectedEmployeeIds.value.length > 0 && draftSelectedDates.value.length > 0;
});
const hasHiddenUnappliedDraft = computed(() => {
  return hasUnappliedDraft.value && !isRequestDrawerOpen.value;
});
const requestDrawerCtaLabel = computed(() => {
  if (hasHiddenUnappliedDraft.value) return '요청 입력 계속하기';
  if (hasUnpersistedAppliedChanges.value) return '변경사항 저장하기';
  return 'Off 요청 입력';
});
const requestDrawerStatusCopy = computed(() => {
  return hasHiddenUnappliedDraft.value
    ? HIDDEN_DRAFT_BLOCKED_REASON
    : '필요할 때만 요청 입력 창을 열어 Off 요청을 추가할 수 있습니다.';
});
const requestDrawerHelpCopy = computed(() => {
  if (isRequestDrawerOpenedFromGridShortcut.value && hasUnappliedDraft.value) {
    return '선택한 셀을 Off 요청으로 반영하려면 요청 반영을 눌러 주세요.';
  }

  return '근무자와 날짜를 선택해 Off 요청을 반영하세요.';
});
const pageLevelBlockedReason = computed(() => {
  if (!hasUnappliedDraft.value) return null;
  return hasHiddenUnappliedDraft.value
    ? HIDDEN_DRAFT_BLOCKED_REASON
    : OPEN_DRAFT_BLOCKED_REASON;
});
const applyDisabledReason = computed(() => {
  if (offPolicyLoadError.value) return offPolicyLoadError.value;
  if (selectedEmployeeIds.value.length === 0) return '근무자를 먼저 선택해 주세요.';
  if (draftSelectedDates.value.length === 0) return '날짜를 먼저 선택해 주세요.';
  return null;
});
const canApplyDraft = computed(() => applyDisabledReason.value === null);
const hasUnpersistedAppliedChanges = computed(() => hasPendingStep4Changes.value);
const currentEmployeeRequests = computed<EmployeeRequestRowVM[]>(() => {
  return selectedEmployeeIds.value.flatMap((employeeId) => buildCurrentEmployeeRequests(employeeId));
});
const policyRejectionSummaries = computed(() => {
  const summaries: string[] = [];

  Object.entries(policyRejectionReasons.value).forEach(([employeeId, dateMap]) => {
    const employeeName =
      grid.employees.value.find((employee) => employee.id === employeeId)?.name ?? employeeId;

    Object.entries(dateMap ?? {}).forEach(([date, rejectionReason]) => {
      if (!rejectionReason.trim()) return;
      if (isCellLocalPending(employeeId, date)) return;
      summaries.push(`${employeeName} (${date}) - ${rejectionReason}`);
    });
  });

  return summaries.sort((left, right) => left.localeCompare(right));
});

const preceptorPairHints = computed<PreceptorPairHint[]>(() => {
  const selectedIds = selectedEmployeeIds.value;
  if (selectedIds.length === 0) return [];

  if (selectedIds.length === 1) {
    const selectedId = selectedIds[0]!;
    const pair = resolvePreceptorPair(grid.employees.value, selectedId);
    if (!pair) return [];

    const peer = grid.employees.value.find((employee) => employee.id === pair.peerId);
    if (!peer) return [];

    const roleLabel = pair.role === 'preceptee' ? '프리셉터' : '프리셉티';
    return [{
      label: `연결된 ${roleLabel}: ${peer.name} (${peer.employeeId}) — Off는 같은 날짜로 자동 반영`,
    }];
  }

  const pairKeys = new Set<string>();
  const pairLabels: string[] = [];

  selectedIds.forEach((employeeId) => {
    const pair = resolvePreceptorPair(grid.employees.value, employeeId);
    if (!pair) return;

    const self = grid.employees.value.find((employee) => employee.id === employeeId);
    const peer = grid.employees.value.find((employee) => employee.id === pair.peerId);
    if (!self || !peer) return;

    const pairKey = [employeeId, pair.peerId].sort().join('::');
    if (pairKeys.has(pairKey)) return;
    pairKeys.add(pairKey);

    const preceptor = pair.role === 'preceptee' ? peer : self;
    const preceptee = pair.role === 'preceptee' ? self : peer;
    pairLabels.push(`${preceptor.name} ↔ ${preceptee.name}`);
  });

  if (pairLabels.length === 0) return [];

  const visiblePairs = pairLabels.slice(0, 2);
  const overflowCount = pairLabels.length - visiblePairs.length;
  let summary = `프리셉터 짝 연동 대상: ${visiblePairs.join(', ')}`;
  if (overflowCount > 0) {
    summary += ` 외 ${overflowCount}쌍`;
  }

  return [{ label: summary }];
});

const canPersistStep4 = computed(() => {
  return (
    !isInitialDataLoading.value &&
    !isBaselineLoading.value &&
    !baselineErrorMessage.value &&
    !hasUnappliedDraft.value &&
    !!baselineState.value &&
    grid.employees.value.length > 0
  );
});

const saveAppliedChangesDisabledReason = computed(() => {
  if (hasUnappliedDraft.value) {
    return pageLevelBlockedReason.value ?? OPEN_DRAFT_BLOCKED_REASON;
  }
  if (isInitialDataLoading.value) return '데이터를 불러오는 중입니다.';
  if (isBaselineLoading.value) return '기준 버전을 확인하는 중입니다.';
  if (baselineErrorMessage.value) return baselineErrorMessage.value;
  if (offPolicyLoadError.value) return offPolicyLoadError.value;
  if (!baselineState.value) return '기준 버전을 먼저 확인해 주세요.';
  if (grid.employees.value.length === 0) return '직원 정보가 없습니다.';
  if (step4MutationBlockedReason.value) return step4MutationBlockedReason.value;
  if (!hasUnpersistedAppliedChanges.value) return '저장할 변경사항이 없습니다.';
  return null;
});

const canSaveAppliedChanges = computed(() => {
  return saveAppliedChangesDisabledReason.value === null && canPersistStep4.value;
});

const hasPendingStep4Changes = computed(() => {
  if (
    !baselineState.value
    || !baselinePreferenceSnapshot.value
    || baselinePreferenceSnapshot.value.previewVersionId !== baselineState.value.previewVersionId
  ) {
    return false;
  }

  return !arePreferenceSnapshotsEqual(
    baselinePreferenceSnapshot.value.snapshot,
    getCurrentPreferenceSnapshot()
  );
});

const hasPendingLocalDraft = computed(() => pendingLocalDraftSnapshot.value !== null);
const routePreviewVersionId = computed(() => normalizeRouteQueryString(route.query.version));
const previewVersionSummary = computed(() => {
  const baseline = baselineState.value;
  if (!baseline) return null;
  return baseline.versions.find((version) => version.id === baseline.previewVersionId) ?? null;
});
const step4MutationBlockedReason = computed(() => {
  const previewVersion = previewVersionSummary.value;
  if (!previewVersion) return null;
  if (previewVersion.status === 'solving' || previewVersion.activeSolverExecutionId) {
    return '현재 근무표안을 생성 중이라 Off 요청을 수정할 수 없습니다.';
  }
  if (previewVersion.isFinalized || previewVersion.status === 'finalized') {
    return '확정된 근무표안은 Off 요청을 수정하거나 다시 생성할 수 없습니다.';
  }
  return null;
});

const nextStepLabel = computed(() => {
  if (!baselineState.value?.hasCurrentMonthAssignments) {
    return '근무표 생성(AI)';
  }

  if (hasPendingStep4Changes.value) {
    return '근무표 생성(AI)';
  }

  return baselineState.value?.hasCurrentMonthAssignments
    ? '결과 확인으로 이동'
    : '생성 시작으로 이동';
});

const selectedCellComment = computed(() => {
  if (!selectedCell.value) return '';
  return constraintNotes.value[selectedCell.value.employeeId]?.[selectedCell.value.date] || '';
});

const displayConstraintNotes = computed(() => {
  const mergedNotes: CommentMap = {};
  const employeeIds = new Set([
    ...Object.keys(constraintNotes.value),
    ...Object.keys(policyRejectionReasons.value),
  ]);

  employeeIds.forEach((employeeId) => {
    const dates = new Set([
      ...Object.keys(constraintNotes.value[employeeId] ?? {}),
      ...Object.keys(policyRejectionReasons.value[employeeId] ?? {}),
    ]);

    if (!mergedNotes[employeeId]) {
      mergedNotes[employeeId] = {};
    }

    dates.forEach((date) => {
      const userNote = constraintNotes.value[employeeId]?.[date]?.trim() ?? '';
      const rejectionReason = isCellLocalPending(employeeId, date)
        ? ''
        : policyRejectionReasons.value[employeeId]?.[date]?.trim() ?? '';
      const displayNote = [userNote, rejectionReason ? `정책 거부: ${rejectionReason}` : '']
        .filter((value) => value.length > 0)
        .join('\n');

      if (displayNote.length > 0) {
        mergedNotes[employeeId]![date] = displayNote;
      }
    });
  });

  return mergedNotes;
});

const tempPreferenceScope = computed(() => {
  return buildTempPreferencesStorageScope({
    userId: authStore.user?.id,
    organizationId: scheduleStore.basicInfo?.organizationId,
    month: scheduleStore.basicInfo?.month,
  });
});

function normalizeRouteQueryString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function ensureEmployeeMaps(): void {
  grid.employees.value.forEach((employee) => {
    if (!constraints.value[employee.id]) {
      constraints.value[employee.id] = {};
    }
    if (!constraintNotes.value[employee.id]) {
      constraintNotes.value[employee.id] = {};
    }
  });
}

function hasCurrentMonthAssignments(assignments: AssignmentMap, month: string): boolean {
  return Object.values(assignments).some((dateMap) => {
    return Object.entries(dateMap || {}).some(([date, shiftCode]) => {
      return date.startsWith(month) && Boolean(shiftCode);
    });
  });
}

type PreferenceWithPolicyResult = Pick<
  SchedulePreference,
  'employee_id' | 'date' | 'policy_check_status' | 'policy_rejection_reason'
>;

function syncPolicyRejectionDisplay(preferences: PreferenceWithPolicyResult[]): void {
  const nextPolicyReasons: CommentMap = {};
  const nextPolicyStatuses: Record<string, Record<string, PolicyCheckStatus>> = {};

  preferences.forEach((pref) => {
    if (!nextPolicyStatuses[pref.employee_id]) {
      nextPolicyStatuses[pref.employee_id] = {};
    }
    nextPolicyStatuses[pref.employee_id]![pref.date] =
      (pref.policy_check_status as PolicyCheckStatus) ?? null;

    const rejectionReason = pref.policy_rejection_reason?.trim() ?? '';
    if (pref.policy_check_status !== 'rejected' || !rejectionReason) {
      return;
    }

    if (!nextPolicyReasons[pref.employee_id]) {
      nextPolicyReasons[pref.employee_id] = {};
    }
    nextPolicyReasons[pref.employee_id]![pref.date] = rejectionReason;
  });

  policyCheckStatuses.value = nextPolicyStatuses;
  policyRejectionReasons.value = nextPolicyReasons;
}

function sanitizePreferenceMapsToCurrentEmployees(): {
  removedEmployeeIds: string[];
  removedOffRequestCount: number;
  removedNoteCount: number;
} {
  const currentEmployeeIds = new Set(grid.employees.value.map((employee) => employee.id));
  if (currentEmployeeIds.size === 0) {
    return { removedEmployeeIds: [], removedOffRequestCount: 0, removedNoteCount: 0 };
  }

  const removedEmployeeIdSet = new Set<string>();
  let removedOffRequestCount = 0;
  let removedNoteCount = 0;

  Object.entries(constraints.value).forEach(([employeeId, dateMap]) => {
    if (currentEmployeeIds.has(employeeId)) return;
    removedEmployeeIdSet.add(employeeId);
    removedOffRequestCount += Object.values(dateMap || {}).filter((constraintCode) => constraintCode === 'O')
      .length;
    delete constraints.value[employeeId];
  });

  Object.entries(constraintNotes.value).forEach(([employeeId, dateMap]) => {
    if (currentEmployeeIds.has(employeeId)) return;
    removedEmployeeIdSet.add(employeeId);
    removedNoteCount += Object.values(dateMap || {}).filter((note) => note.trim().length > 0).length;
    delete constraintNotes.value[employeeId];
  });

  if (removedEmployeeIdSet.size > 0) {
    constraints.value = { ...constraints.value };
    constraintNotes.value = { ...constraintNotes.value };
  }

  ensureEmployeeMaps();

  return {
    removedEmployeeIds: Array.from(removedEmployeeIdSet),
    removedOffRequestCount,
    removedNoteCount,
  };
}

function sanitizeSnapshotToCurrentEmployees(snapshot: {
  constraints: ConstraintMap;
  notes: CommentMap;
}): {
  constraints: ConstraintMap;
  notes: CommentMap;
  removedEmployeeIds: string[];
  removedOffRequestCount: number;
  removedNoteCount: number;
} {
  const currentEmployeeIds = new Set(grid.employees.value.map((employee) => employee.id));
  if (currentEmployeeIds.size === 0) {
    return {
      constraints: {},
      notes: {},
      removedEmployeeIds: [],
      removedOffRequestCount: 0,
      removedNoteCount: 0,
    };
  }

  const sanitizedConstraints: ConstraintMap = {};
  const sanitizedNotes: CommentMap = {};
  const removedEmployeeIdSet = new Set<string>();
  let removedOffRequestCount = 0;
  let removedNoteCount = 0;

  Object.entries(snapshot.constraints).forEach(([employeeId, dateMap]) => {
    if (!currentEmployeeIds.has(employeeId)) {
      removedEmployeeIdSet.add(employeeId);
      removedOffRequestCount += Object.values(dateMap || {}).filter((constraintCode) => constraintCode === 'O')
        .length;
      return;
    }
    sanitizedConstraints[employeeId] = { ...dateMap };
  });

  Object.entries(snapshot.notes).forEach(([employeeId, dateMap]) => {
    if (!currentEmployeeIds.has(employeeId)) {
      removedEmployeeIdSet.add(employeeId);
      removedNoteCount += Object.values(dateMap || {}).filter((note) => note.trim().length > 0).length;
      return;
    }
    sanitizedNotes[employeeId] = { ...dateMap };
  });

  for (const employee of grid.employees.value) {
    if (!sanitizedConstraints[employee.id]) sanitizedConstraints[employee.id] = {};
    if (!sanitizedNotes[employee.id]) sanitizedNotes[employee.id] = {};
  }

  return {
    constraints: sanitizedConstraints,
    notes: sanitizedNotes,
    removedEmployeeIds: Array.from(removedEmployeeIdSet),
    removedOffRequestCount,
    removedNoteCount,
  };
}

function cloneConstraintMap(source: ConstraintMap): ConstraintMap {
  return Object.fromEntries(
    Object.entries(source).map(([employeeId, dateMap]) => [employeeId, { ...(dateMap ?? {}) }])
  );
}

function cloneCommentMap(source: CommentMap): CommentMap {
  return Object.fromEntries(
    Object.entries(source).map(([employeeId, dateMap]) => [employeeId, { ...(dateMap ?? {}) }])
  );
}

function removeConstraintNoteFromMap(map: CommentMap, employeeId: string, date: string): void {
  if (!map[employeeId]?.[date]) return;
  delete map[employeeId]![date];
}

function deriveDraftOffEdits(): OffEdit[] {
  const edits: OffEdit[] = [];
  const editingRow = editingRequestKey.value ? findCurrentEmployeeRequest(editingRequestKey.value) : null;

  if (editingRow) {
    const nextDateSet = new Set(draftSelectedDates.value);

    editingRow.dates.forEach((date) => {
      if (!nextDateSet.has(date)) {
        edits.push({ employeeId: editingRow.employeeId, date, action: 'remove' });
      }
    });

    draftSelectedDates.value.forEach((date) => {
      if (!editingRow.dates.includes(date)) {
        edits.push({ employeeId: editingRow.employeeId, date, action: 'add' });
      }
    });

    return edits;
  }

  selectedEmployeeIds.value.forEach((employeeId) => {
    draftSelectedDates.value.forEach((date) => {
      edits.push({ employeeId, date, action: 'add' });
    });
  });

  return edits;
}

function formatPreceptorPairToastDate(date: string): string {
  const [, month = '0', day = '0'] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
}

function buildPreceptorPairApplyToasts(baseEdits: OffEdit[], expandedEdits: OffEdit[]): string[] {
  const employees = grid.employees.value;
  const toasts: string[] = [];

  expandedEdits.forEach((edit) => {
    if (edit.action !== 'add') return;

    const isRequesterEdit = baseEdits.some(
      (baseEdit) =>
        baseEdit.employeeId === edit.employeeId
        && baseEdit.date === edit.date
        && baseEdit.action === 'add'
    );
    if (isRequesterEdit) return;

    const triggerEdit = baseEdits.find((baseEdit) => {
      if (baseEdit.action !== 'add' || baseEdit.date !== edit.date) return false;
      return resolvePreceptorPair(employees, baseEdit.employeeId)?.peerId === edit.employeeId;
    });
    if (!triggerEdit) return;

    const requester = employees.find((employee) => employee.id === triggerEdit.employeeId);
    const peer = employees.find((employee) => employee.id === edit.employeeId);
    const pair = resolvePreceptorPair(employees, triggerEdit.employeeId);
    if (!requester || !peer || !pair) return;

    const peerRoleLabel = pair.role === 'preceptee' ? '프리셉터' : '프리셉티';
    toasts.push(
      `${requester.name} Off 반영 — ${peerRoleLabel} ${peer.name}에도 ${formatPreceptorPairToastDate(edit.date)} Off가 추가되었습니다.`
    );
  });

  return toasts;
}

function clearRequestApplyStatus(): void {
  requestApplyStatusMessage.value = null;
  requestApplyStatusTone.value = 'neutral';
}

function setRequestApplyStatus(message: string, tone: RequestApplyStatusTone): void {
  requestApplyStatusMessage.value = message;
  requestApplyStatusTone.value = tone;
}

function commitPreferenceMaps(nextConstraints: ConstraintMap, nextNotes: CommentMap): void {
  constraints.value = nextConstraints;
  constraintNotes.value = nextNotes;
  scheduleStore.setAssignments(nextConstraints);
  scheduleStore.setComments(nextNotes);
}

function notifyPreceptorReconcileResults(
  corrections: PairCorrectionSummary[],
  skipped: PairSkipSummary[]
): void {
  const pairCount = corrections.length;
  if (pairCount === 0 && skipped.length === 0) return;

  corrections.forEach((item) => {
    showSuccess(
      `프리셉터 짝 Off ${item.correctedCount}건이 자동 맞춤되었습니다 (${item.preceptorName} ↔ ${item.precepteeName}).`
    );
  });

  skipped.forEach((item) => {
    showInfo(
      `${item.skippedCount}건은 ${item.employeeName}(${item.role === 'preceptor' ? '프리셉터' : '프리셉티'}) Off 한도 초과로 맞추지 못했습니다.`
    );
  });

  if (pairCount >= 3) {
    preceptorReconcileAlertSummary.value = `${pairCount}쌍의 프리셉터 짝 Off가 자동 맞춤되었습니다.`;
  }
}

function reconcileAndNotifyPreferenceMaps(
  nextConstraints: ConstraintMap,
  nextNotes: CommentMap
): void {
  const blocked = assertOffWritesAllowed();
  if (blocked) {
    showInfo(blocked);
    return;
  }

  const { nextConstraints: reconciled, corrections, skipped } = reconcilePreceptorOffPairs({
    constraints: nextConstraints,
    employees: grid.employees.value,
    policyRules: offRequestPolicyRules.value,
    scheduleMonth: scheduleStore.basicInfo?.month ?? '',
  });

  commitPreferenceMaps(reconciled, nextNotes);
  notifyPreceptorReconcileResults(corrections, skipped);
}

function clearCurrentScopedTempPreferencesStorage(): void {
  clearScopedTempPreferencesStorage({
    userId: authStore.user?.id,
    organizationId: scheduleStore.basicInfo?.organizationId,
    month: scheduleStore.basicInfo?.month,
  });
}

function buildDraftAppliedPreferenceMaps(): {
  constraints: ConstraintMap;
  notes: CommentMap;
} {
  const nextConstraints = cloneConstraintMap(constraints.value);
  const nextNotes = cloneCommentMap(constraintNotes.value);
  const baseEdits = deriveDraftOffEdits();
  const expandedEdits = expandOffDeltaWithPair(grid.employees.value, baseEdits);

  expandedEdits.forEach((edit) => {
    if (!nextConstraints[edit.employeeId]) {
      nextConstraints[edit.employeeId] = {};
    }

    if (edit.action === 'add') {
      nextConstraints[edit.employeeId]![edit.date] = 'O';
      return;
    }

    nextConstraints[edit.employeeId]![edit.date] = '';
    removeConstraintNoteFromMap(nextNotes, edit.employeeId, edit.date);
  });

  const normalizedNote = draftNote.value.trim();
  selectedEmployeeIds.value.forEach((employeeId) => {
    if (!nextNotes[employeeId]) {
      nextNotes[employeeId] = {};
    }

    draftSelectedDates.value.forEach((date) => {
      if (normalizedNote.length > 0) {
        nextNotes[employeeId]![date] = normalizedNote;
      } else {
        removeConstraintNoteFromMap(nextNotes, employeeId, date);
      }
    });
  });

  return {
    constraints: nextConstraints,
    notes: nextNotes,
  };
}

function replacePreferenceMapsFromSnapshot(snapshot: {
  constraints: ConstraintMap;
  notes: CommentMap;
}): {
  removedEmployeeIds: string[];
  removedOffRequestCount: number;
  removedNoteCount: number;
} {
  const sanitized = sanitizeSnapshotToCurrentEmployees(snapshot);
  reconcileAndNotifyPreferenceMaps(sanitized.constraints, sanitized.notes);
  return {
    removedEmployeeIds: sanitized.removedEmployeeIds,
    removedOffRequestCount: sanitized.removedOffRequestCount,
    removedNoteCount: sanitized.removedNoteCount,
  };
}

function removeConstraintNote(employeeId: string, date: string): void {
  if (!constraintNotes.value[employeeId]?.[date]) return;
  delete constraintNotes.value[employeeId]![date];
  constraintNotes.value = { ...constraintNotes.value };
}

function sortDates(dates: string[]): string[] {
  return Array.from(new Set(dates)).sort((left, right) => left.localeCompare(right));
}

function diffDateDays(left: string, right: string): number {
  const leftTime = new Date(`${left}T00:00:00`).getTime();
  const rightTime = new Date(`${right}T00:00:00`).getTime();
  return Math.round((rightTime - leftTime) / (1000 * 60 * 60 * 24));
}

function formatDateChip(date: string): string {
  const [, month = '0', day = '0'] = date.split('-');
  return `${Number(month)}월 ${Number(day)}일`;
}

function getBaselineRequestCode(employeeId: string, date: string): ConstraintCode | '' {
  return baselinePreferenceSnapshot.value?.snapshot.constraints[employeeId]?.[date] ?? '';
}

function getBaselineRequestNote(employeeId: string, date: string): string {
  return baselinePreferenceSnapshot.value?.snapshot.notes[employeeId]?.[date] ?? '';
}

function getPolicyStatus(employeeId: string, date: string): PolicyCheckStatus {
  return policyCheckStatuses.value[employeeId]?.[date] ?? null;
}

function isCellLocalPending(employeeId: string, date: string): boolean {
  const currentCode = constraints.value[employeeId]?.[date] ?? '';
  const currentNote = constraintNotes.value[employeeId]?.[date] ?? '';

  return (
    getBaselineRequestCode(employeeId, date) !== currentCode
    || getBaselineRequestNote(employeeId, date) !== currentNote
  );
}

function buildRequestKey(employeeId: string, dates: string[], note: string): string {
  return [employeeId, dates.join(','), note, draftRequestTypeId.value].join('::');
}

function buildCurrentEmployeeRequests(employeeId: string | null): EmployeeRequestRowVM[] {
  if (!employeeId) return [];

  const employeeConstraints = constraints.value[employeeId] ?? {};
  const allDates = Object.keys(employeeConstraints)
    .filter((date) => employeeConstraints[date] === 'O')
    .sort((left, right) => left.localeCompare(right));

  const rows: EmployeeRequestRowVM[] = [];
  let currentGroup: EmployeeRequestRowVM | null = null;

  allDates.forEach((date) => {
    const note = constraintNotes.value[employeeId]?.[date]?.trim() ?? '';
    const localPending = isCellLocalPending(employeeId, date);
    const rejectionReason = localPending
      ? null
      : policyRejectionReasons.value[employeeId]?.[date]?.trim() || null;
    const policyStatus = getPolicyStatus(employeeId, date);
    const status: EmployeeRequestRowVM['status'] = localPending
      ? 'local-pending'
      : policyStatus === 'rejected'
        ? 'policy-rejected'
        : policyStatus === 'pending'
          ? 'policy-checking'
          : 'persisted';

    if (
      currentGroup
      && currentGroup.note === note
      && currentGroup.status === status
      && currentGroup.policyRejectionReason === rejectionReason
      && diffDateDays(currentGroup.dates[currentGroup.dates.length - 1]!, date) === 1
    ) {
      currentGroup.dates.push(date);
      currentGroup.requestKey = buildRequestKey(currentGroup.employeeId, currentGroup.dates, currentGroup.note);
      return;
    }

    currentGroup = {
      requestKey: buildRequestKey(employeeId, [date], note),
      employeeId,
      dates: [date],
      requestTypeId: 'off',
      requestCode: 'O',
      note,
      status,
      policyRejectionReason: rejectionReason,
    };
    rows.push(currentGroup);
  });

  return rows;
}

function findCurrentEmployeeRequest(requestKey: string): EmployeeRequestRowVM | null {
  return currentEmployeeRequests.value.find((row) => row.requestKey === requestKey) ?? null;
}

function resetDraftState(options: { preserveEmployee?: boolean } = {}): void {
  clearRequestApplyStatus();
  isRequestDrawerOpenedFromGridShortcut.value = false;
  if (!options.preserveEmployee) {
    selectedEmployeeIds.value = [];
  }
  draftRequestTypeId.value = 'off';
  draftSelectionMode.value = 'single';
  draftSelectedDates.value = [];
  draftNote.value = '';
  editingRequestKey.value = null;
  dirtySinceLastApply.value = false;
  blockedTransitionReason.value = null;
}

function isSameDraftTarget(
  nextEmployeeIds: string[],
  nextDates: string[],
  nextEditingRequestKey: string | null
): boolean {
  const sameEmployee =
    JSON.stringify([...selectedEmployeeIds.value].sort()) === JSON.stringify([...nextEmployeeIds].sort());
  const sameDates =
    JSON.stringify(sortDates(draftSelectedDates.value)) === JSON.stringify(sortDates(nextDates));
  const sameEditingRequest = editingRequestKey.value === nextEditingRequestKey;

  return sameEmployee && sameDates && sameEditingRequest;
}

function shouldResetGridShortcutDraft(
  nextEmployeeIds: string[],
  nextDates: string[],
  nextEditingRequestKey: string | null
): boolean {
  return (
    isRequestDrawerOpenedFromGridShortcut.value &&
    hasUnappliedDraft.value &&
    !isSameDraftTarget(nextEmployeeIds, nextDates, nextEditingRequestKey)
  );
}

function guardDraftTransition(
  nextEmployeeIds: string[],
  nextDates: string[],
  nextEditingRequestKey: string | null
): boolean {
  if (!hasUnappliedDraft.value) {
    blockedTransitionReason.value = null;
    return true;
  }

  if (isSameDraftTarget(nextEmployeeIds, nextDates, nextEditingRequestKey)) {
    blockedTransitionReason.value = null;
    return true;
  }

  blockedTransitionReason.value = pageLevelBlockedReason.value ?? OPEN_DRAFT_BLOCKED_REASON;
  return false;
}

function handleSelectEmployee(employeeIds: string[]): void {
  if (!guardDraftTransition(employeeIds, [], null)) {
    return;
  }

  clearRequestApplyStatus();
  isRequestDrawerOpenedFromGridShortcut.value = false;
  selectedEmployeeIds.value = [...employeeIds];
  draftSelectedDates.value = [];
  draftNote.value = '';
  editingRequestKey.value = null;
  dirtySinceLastApply.value = false;
  blockedTransitionReason.value = null;
}

function handleDraftSelectionModeUpdate(mode: Step4SelectionMode): void {
  clearRequestApplyStatus();
  isRequestDrawerOpenedFromGridShortcut.value = false;
  draftSelectionMode.value = mode;
  blockedTransitionReason.value = null;
}

function handleDraftSelectedDatesUpdate(dates: string[]): void {
  clearRequestApplyStatus();
  isRequestDrawerOpenedFromGridShortcut.value = false;
  draftSelectedDates.value = sortDates(dates);
  dirtySinceLastApply.value = draftSelectedDates.value.length > 0 || draftNote.value.trim().length > 0;
  blockedTransitionReason.value = null;
}

function handleDraftNoteUpdate(note: string): void {
  clearRequestApplyStatus();
  isRequestDrawerOpenedFromGridShortcut.value = false;
  draftNote.value = note;
  dirtySinceLastApply.value = draftSelectedDates.value.length > 0 || draftNote.value.trim().length > 0;
  blockedTransitionReason.value = null;
}

function handleGridCellSelect(payload: { employeeId: string; date: string }): void {
  if (step4MutationBlockedReason.value) {
    showInfo(step4MutationBlockedReason.value);
    return;
  }

  const existingRow =
    buildCurrentEmployeeRequests(payload.employeeId).find((row) => row.dates.includes(payload.date)) ?? null;
  const nextDates = existingRow?.dates ?? [payload.date];
  const nextEditingRequestKey = existingRow?.requestKey ?? null;
  const nextEmployeeIds = [payload.employeeId];

  if (shouldResetGridShortcutDraft(nextEmployeeIds, nextDates, nextEditingRequestKey)) {
    resetDraftState();
  }

  if (!guardDraftTransition(nextEmployeeIds, nextDates, nextEditingRequestKey)) {
    void handleOpenRequestDrawer({ preserveBlockedReason: true });
    return;
  }

  isRequestDrawerOpenedFromGridShortcut.value = true;
  selectedEmployeeIds.value = nextEmployeeIds;
  clearRequestApplyStatus();
  draftRequestTypeId.value = 'off';
  draftSelectionMode.value = nextDates.length > 1 ? 'multi' : 'single';
  draftSelectedDates.value = [...nextDates];
  draftNote.value = existingRow?.note ?? constraintNotes.value[payload.employeeId]?.[payload.date] ?? '';
  editingRequestKey.value = nextEditingRequestKey;
  dirtySinceLastApply.value = existingRow === null;
  blockedTransitionReason.value = null;
  scrollEmployeeRowIntoView(payload.employeeId);
  void handleOpenRequestDrawer();
}

function hydrateDraftFromRequestRow(requestKey: string): void {
  const requestRow = findCurrentEmployeeRequest(requestKey);
  if (!requestRow) return;
  if (!guardDraftTransition([requestRow.employeeId], requestRow.dates, requestRow.requestKey)) {
    return;
  }

  selectedEmployeeIds.value = [requestRow.employeeId];
  clearRequestApplyStatus();
  isRequestDrawerOpenedFromGridShortcut.value = false;
  draftRequestTypeId.value = requestRow.requestTypeId;
  draftSelectionMode.value = requestRow.dates.length > 1 ? 'multi' : 'single';
  draftSelectedDates.value = [...requestRow.dates];
  draftNote.value = requestRow.note;
  editingRequestKey.value = requestRow.requestKey;
  dirtySinceLastApply.value = false;
  blockedTransitionReason.value = null;
  scrollEmployeeRowIntoView(requestRow.employeeId);
}

async function applyDraftRequest(): Promise<void> {
  const blockedReason = assertOffWritesAllowed({ includeDraftBlock: false });
  if (blockedReason) {
    setRequestApplyStatus(blockedReason, 'error');
    showError(blockedReason);
    return;
  }

  const employeeIds = [...selectedEmployeeIds.value];

  if (step4MutationBlockedReason.value) {
    setRequestApplyStatus(step4MutationBlockedReason.value, 'error');
    showInfo(step4MutationBlockedReason.value);
    return;
  }

  if (employeeIds.length === 0 || !canApplyDraft.value || isApplyRequestSaving.value) {
    return;
  }

  isApplyRequestSaving.value = true;
  setRequestApplyStatus('요청을 저장하는 중입니다.', 'info');

  try {
    const baseEdits = deriveDraftOffEdits();
    const validation = validatePairedOffChanges({
      constraints: constraints.value,
      edits: baseEdits,
      employees: grid.employees.value,
      policyRules: offRequestPolicyRules.value,
      scheduleMonth: scheduleStore.basicInfo?.month ?? '',
    });

    if (!validation.ok) {
      const roleLabel =
        validation.role === 'preceptor'
          ? '프리셉터'
          : validation.role === 'preceptee'
            ? '프리셉티'
            : '';
      const message = `${validation.blockedEmployeeName}(${roleLabel})의 Off 한도 초과로 함께 반영할 수 없습니다.`;
      setRequestApplyStatus(message, 'error');
      showError(message);
      return;
    }

    const nextPreferenceMaps = buildDraftAppliedPreferenceMaps();
    const pairToasts = buildPreceptorPairApplyToasts(
      baseEdits,
      expandOffDeltaWithPair(grid.employees.value, baseEdits)
    );

    pairToasts.forEach((message) => {
      showSuccess(message);
    });

    const result = await persistStep4PreferenceMaps(
      nextPreferenceMaps.constraints,
      nextPreferenceMaps.notes,
      {
        successMessage: '요청이 저장되었습니다.',
        staleEmployeeMessage: '현재 직원 목록에 없는 임시 데이터는 제외하고 요청을 저장합니다.',
        logMessage: 'Saving request-entry preferences',
      }
    );

    if (!result) return;

    editingRequestKey.value = null;
    dirtySinceLastApply.value = false;
    blockedTransitionReason.value = null;
    setRequestApplyStatus('요청이 DB에 저장되었습니다.', 'success');

    if (isRequestDrawerOpen.value) {
      void focusRequestComposerSearch();
    }
  } catch (error) {
    const message = '요청 저장 실패: ' + toErrorMessage(error);
    setRequestApplyStatus(message, 'error');
    showError(message);
  } finally {
    isApplyRequestSaving.value = false;
  }
}

function handleDeleteRequest(requestKey: string): void {
  const blocked = assertOffWritesAllowed();
  if (blocked) {
    showInfo(blocked);
    return;
  }

  const requestRow = findCurrentEmployeeRequest(requestKey);
  if (!requestRow) return;
  if (!guardDraftTransition([requestRow.employeeId], requestRow.dates, requestRow.requestKey)) {
    return;
  }

  clearRequestApplyStatus();
  const pair = resolvePreceptorPair(grid.employees.value, requestRow.employeeId);
  const datesToDelete = requestRow.dates;

  datesToDelete.forEach((date) => {
    if (constraints.value[requestRow.employeeId]) {
      constraints.value[requestRow.employeeId]![date] = '';
    }
    removeConstraintNote(requestRow.employeeId, date);

    if (pair) {
      if (constraints.value[pair.peerId]) {
        constraints.value[pair.peerId]![date] = '';
      }
      removeConstraintNote(pair.peerId, date);
    }
  });

  constraints.value = { ...constraints.value };
  constraintNotes.value = { ...constraintNotes.value };

  if (editingRequestKey.value === requestKey) {
    resetDraftState({ preserveEmployee: true });
  }

  if (pair) {
    const peerName = grid.employees.value.find((employee) => employee.id === pair.peerId)?.name ?? pair.peerId;
    showSuccess(`${formatDateChip(datesToDelete[0]!)} Off 삭제 — ${peerName}의 같은 날짜 Off도 삭제되었습니다.`);
  }
}

// Callbacks
function handleAssignmentUpdate(payload: { employeeId: string; date: string; shiftCode: string }) {
  if (step4MutationBlockedReason.value) {
    showInfo(step4MutationBlockedReason.value);
    return;
  }

  if (!constraints.value[payload.employeeId]) {
    constraints.value[payload.employeeId] = {};
  }

  if (VALID_CONSTRAINTS.has(payload.shiftCode as ConstraintCode)) {
    constraints.value[payload.employeeId]![payload.date] = payload.shiftCode as ConstraintCode;
  } else {
    constraints.value[payload.employeeId]![payload.date] = '';
    removeConstraintNote(payload.employeeId, payload.date);
  }

  constraints.value = { ...constraints.value };
}

function handleContextMenu(payload: { event: MouseEvent; employeeId: string; date: string }) {
  if (step4MutationBlockedReason.value) {
    showInfo(step4MutationBlockedReason.value);
    return;
  }

  const currentConstraint = constraints.value[payload.employeeId]?.[payload.date];
  if (currentConstraint !== 'O') {
    showInfo('근무 불가(O) 셀에서만 사유를 입력할 수 있습니다.');
    return;
  }

  const employee = grid.employees.value.find((e) => e.id === payload.employeeId);
  if (!employee) return;

  selectedCell.value = {
    employeeId: payload.employeeId,
    employeeName: employee.name,
    date: payload.date,
  };
  showCommentModal.value = true;
}

function handleSaveComment(comment: string) {
  if (!selectedCell.value) return;

  const currentConstraint =
    constraints.value[selectedCell.value.employeeId]?.[selectedCell.value.date] || '';
  if (currentConstraint !== 'O') {
    showInfo('근무 불가(O) 셀에서만 사유를 저장할 수 있습니다.');
    return;
  }

  const normalizedComment = comment.trim();
  if (!constraintNotes.value[selectedCell.value.employeeId]) {
    constraintNotes.value[selectedCell.value.employeeId] = {};
  }

  if (!normalizedComment) {
    removeConstraintNote(selectedCell.value.employeeId, selectedCell.value.date);
    showSuccess('코멘트가 삭제되었습니다.');
    return;
  }

  constraintNotes.value[selectedCell.value.employeeId]![selectedCell.value.date] =
    normalizedComment;
  constraintNotes.value = { ...constraintNotes.value };
  showSuccess('코멘트가 저장되었습니다.');
}

function handleHeaderClick(date: string) {
  selectedDaySummaryDate.value = date;
  showDaySummaryModal.value = true;
}

watchDebounced(
  [() => constraints.value, () => constraintNotes.value],
  ([latestConstraints, latestNotes]) => {
    if (isReturningToDashboard.value) return;
    if (pendingLocalDraftSnapshot.value) return;
    const scope = tempPreferenceScope.value;
    if (!scope) return;
    if (countStoredOffRequests(latestConstraints) === 0 && !hasAnyConstraintNotes(latestNotes)) {
      clearCurrentScopedTempPreferencesStorage();
      return;
    }
    writeTempPreferencesEnvelopeV2(scope, latestConstraints, latestNotes);
  },
  { debounce: 2000 }
);

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return String(error);
}

function logRestoreTrace(message: string, payload?: Record<string, unknown>): void {
  if (!import.meta.env.DEV) return;
  if (payload) {
    console.info(`[Step4InitialData] ${message}`, payload);
    return;
  }

  console.info(`[Step4InitialData] ${message}`);
}

function countStoredOffRequests(map: ConstraintMap): number {
  return Object.values(map).reduce((total, dateMap) => {
    return (
      total +
      Object.values(dateMap || {}).filter((constraintCode) => constraintCode === 'O').length
    );
  }, 0);
}

function hasAnyConstraintNotes(map: CommentMap): boolean {
  return Object.values(map).some((dateMap) => {
    return Object.values(dateMap || {}).some((note) => note.trim().length > 0);
  });
}

function hasCurrentPreferences(): boolean {
  return countStoredOffRequests(constraints.value) > 0 || hasAnyConstraintNotes(constraintNotes.value);
}

function getPreferredPreviewVersionId(): string | null {
  return routePreviewVersionId.value;
}

function createPreferenceSnapshot(
  sourceConstraints: ConstraintMap,
  sourceNotes: CommentMap
): PreferenceSnapshot {
  const normalizedConstraints: ConstraintMap = {};
  const normalizedNotes: CommentMap = {};

  Object.keys(sourceConstraints)
    .sort()
    .forEach((employeeId) => {
      const entries = Object.entries(sourceConstraints[employeeId] ?? {})
        .filter(([, code]) => code === 'O')
        .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate));

      if (entries.length === 0) return;

      normalizedConstraints[employeeId] = Object.fromEntries(entries);
    });

  Object.keys(sourceNotes)
    .sort()
    .forEach((employeeId) => {
      const entries = Object.entries(sourceNotes[employeeId] ?? {})
        .map(([date, note]) => [date, note.trim()] as const)
        .filter(([, note]) => note.length > 0)
        .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate));

      if (entries.length === 0) return;

      normalizedNotes[employeeId] = Object.fromEntries(entries);
    });

  return {
    constraints: normalizedConstraints,
    notes: normalizedNotes,
  };
}

function getCurrentPreferenceSnapshot(): PreferenceSnapshot {
  return createPreferenceSnapshot(constraints.value, constraintNotes.value);
}

function serializeConstraintMap(map: ConstraintMap): string {
  return JSON.stringify(
    Object.keys(map)
      .sort()
      .map((employeeId) => [
        employeeId,
        Object.keys(map[employeeId] ?? {})
          .sort()
          .map((date) => [date, map[employeeId]?.[date] ?? '']),
      ])
  );
}

function serializeCommentMap(map: CommentMap): string {
  return JSON.stringify(
    Object.keys(map)
      .sort()
      .map((employeeId) => [
        employeeId,
        Object.keys(map[employeeId] ?? {})
          .sort()
          .map((date) => [date, map[employeeId]?.[date] ?? '']),
      ])
  );
}

function arePreferenceSnapshotsEqual(left: PreferenceSnapshot, right: PreferenceSnapshot): boolean {
  return (
    serializeConstraintMap(left.constraints) === serializeConstraintMap(right.constraints)
    && serializeCommentMap(left.notes) === serializeCommentMap(right.notes)
  );
}

function areConstraintSnapshotsEqual(left: PreferenceSnapshot, right: PreferenceSnapshot): boolean {
  return serializeConstraintMap(left.constraints) === serializeConstraintMap(right.constraints);
}

function setBaselinePreferenceSnapshot(
  previewVersionId: string,
  snapshot: PreferenceSnapshot
): void {
  baselinePreferenceSnapshot.value = {
    previewVersionId,
    snapshot,
  };
}

async function getBaselinePreferenceSnapshot(previewVersionId: string): Promise<PreferenceSnapshot> {
  if (baselinePreferenceSnapshot.value?.previewVersionId === previewVersionId) {
    return baselinePreferenceSnapshot.value.snapshot;
  }

  const versionPreferenceData = await getScheduleVersionPreferences(previewVersionId);
  const snapshot = createPreferenceSnapshot(
    versionPreferenceData.constraints,
    versionPreferenceData.notes
  );
  setBaselinePreferenceSnapshot(previewVersionId, snapshot);
  return snapshot;
}

function loadTempPreferencesFromLocalStorage(): { constraints: ConstraintMap; notes: CommentMap } | null {
  const scope = tempPreferenceScope.value;
  if (!scope) return null;

  const result = readTempPreferencesEnvelopeV2(scope);
  if (result.status !== 'ok' || !result.envelope) {
    if (result.status !== 'missing') {
      logRestoreTrace('Skipped localStorage v2 restore', {
        storageKey: result.storageKey,
        reason: result.status,
      });
    }
    return null;
  }

  return {
    constraints: result.envelope.constraints,
    notes: result.envelope.constraintNotes,
  };
}

function storePendingLocalDraftSnapshot(snapshot: {
  constraints: ConstraintMap;
  notes: CommentMap;
} | null): boolean {
  pendingLocalDraftSnapshot.value = null;
  if (!snapshot) return false;

  const sanitized = sanitizeSnapshotToCurrentEmployees(snapshot);
  const offRequestCount = countStoredOffRequests(sanitized.constraints);
  const hasNotes = hasAnyConstraintNotes(sanitized.notes);

  logRestoreTrace('Found pending local Step4 draft', {
    storageKey: tempPreferenceScope.value
      ? buildTempPreferencesStorageKey(tempPreferenceScope.value)
      : null,
    offRequestCount,
    hasNotes,
  });

  if (sanitized.removedEmployeeIds.length > 0) {
    logRestoreTrace('Removed stale employee keys from pending local Step4 draft', {
      removedEmployeeIds: sanitized.removedEmployeeIds,
      removedOffRequestCount: sanitized.removedOffRequestCount,
      removedNoteCount: sanitized.removedNoteCount,
    });
  }

  if (offRequestCount === 0 && !hasNotes) {
    return false;
  }

  pendingLocalDraftSnapshot.value = {
    constraints: sanitized.constraints,
    notes: sanitized.notes,
  };
  return true;
}

function handleLoadPendingLocalDraft(): void {
  const snapshot = pendingLocalDraftSnapshot.value;
  if (!snapshot) return;

  const sanitized = sanitizeSnapshotToCurrentEmployees(snapshot);
  if (
    countStoredOffRequests(sanitized.constraints) === 0
    && !hasAnyConstraintNotes(sanitized.notes)
  ) {
    pendingLocalDraftSnapshot.value = null;
    showInfo('현재 직원 목록에 맞는 Off 요청이 없어 불러오지 않았습니다.');
    return;
  }

  reconcileAndNotifyPreferenceMaps(sanitized.constraints, sanitized.notes);
  pendingLocalDraftSnapshot.value = null;
  showSuccess('이전에 입력하던 Off 요청을 불러왔습니다.');
}

function handleDiscardPendingLocalDraft(): void {
  pendingLocalDraftSnapshot.value = null;
  clearCurrentScopedTempPreferencesStorage();
  showSuccess('이전에 입력하던 Off 요청을 삭제했습니다.');
}

async function focusRequestComposerSearch(): Promise<void> {
  await nextTick();
  requestComposerRef.value?.prefillSearchQuery?.(selectedEmployeeName.value);
  requestComposerRef.value?.focusSearchInput?.();
}

async function handleOpenRequestDrawer(options: { preserveBlockedReason?: boolean } = {}): Promise<void> {
  isRequestDrawerOpen.value = true;
  if (!options.preserveBlockedReason) {
    blockedTransitionReason.value = null;
  }
  await focusRequestComposerSearch();
}

function handleOpenRequestDrawerClick(): void {
  if (step4MutationBlockedReason.value) {
    showInfo(step4MutationBlockedReason.value);
    return;
  }
  void handleOpenRequestDrawer();
}

function handleCloseRequestDrawer(): void {
  isRequestDrawerOpen.value = false;
}

function handleRequestDrawerVisibility(show: boolean): void {
  if (show) {
    void handleOpenRequestDrawer();
    return;
  }

  handleCloseRequestDrawer();
}

function handleOpenOffRequestExcelUploadModal(): void {
  const blocked = assertOffWritesAllowed();
  if (blocked) {
    showInfo(blocked);
    return;
  }

  isOffRequestExcelUploadModalOpen.value = true;
}

function handleDownloadOffRequestExcel(): void {
  if (grid.employees.value.length === 0) {
    showError('다운로드할 직원 정보가 없습니다.');
    return;
  }

  try {
    downloadOffRequestTemplate(grid.employees.value, scheduleStore.basicInfo?.month ?? '', {
      constraints: constraints.value,
      dates: grid.dates.value,
    });
    showSuccess('Off 요청 Excel 파일을 다운로드했습니다.');
  } catch {
    showError('Excel 다운로드 중 오류가 발생했습니다.');
  }
}

function handleApplyOffRequestExcelUpload(nextConstraints: ConstraintMap): void {
  if (step4MutationBlockedReason.value) {
    showInfo(step4MutationBlockedReason.value);
    return;
  }

  pendingLocalDraftSnapshot.value = null;
  policyRejectionReasons.value = {};
  policyCheckStatuses.value = {};
  selectedCell.value = null;
  showCommentModal.value = false;
  blockedTransitionReason.value = null;
  resetDraftState();
  reconcileAndNotifyPreferenceMaps(nextConstraints, {});
  clearCurrentScopedTempPreferencesStorage();
  isOffRequestExcelUploadModalOpen.value = false;
  showSuccess('Excel Off 요청을 현재 화면에 반영했습니다. 저장하려면 변경사항 저장을 눌러 주세요.');
}

function scrollEmployeeRowIntoView(employeeId: string): void {
  void nextTick(() => {
    document
      .querySelector<HTMLElement>(`[data-employee-id="${employeeId}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  });
}

function handleWindowKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !isRequestDrawerOpen.value) {
    return;
  }

  handleCloseRequestDrawer();
}

function migrateLegacyTempPreferencesIfNeeded(): void {
  const migration = migrateLegacyTempPreferencesToV2(tempPreferenceScope.value, {
    sanitize: (payload) => {
      const sanitized = sanitizeSnapshotToCurrentEmployees(payload);
      if (sanitized.removedEmployeeIds.length > 0) {
        logRestoreTrace('Removed stale employee keys during legacy migration', {
          removedEmployeeIds: sanitized.removedEmployeeIds,
          removedOffRequestCount: sanitized.removedOffRequestCount,
          removedNoteCount: sanitized.removedNoteCount,
        });
      }
      return {
        constraints: sanitized.constraints,
        notes: sanitized.notes,
      };
    },
  });

  if (migration.status === 'migrated') {
    logRestoreTrace('Migrated legacy Step4 localStorage payload to v2 envelope', {
      storageKey: migration.storageKey,
    });
    return;
  }

  if (migration.status === 'legacy_parse_error' || migration.status === 'legacy_invalid') {
    logRestoreTrace('Legacy Step4 localStorage payload skipped during migration', {
      reason: migration.status,
      storageKey: migration.storageKey,
    });
  }
}

async function ensureBaselineVersion(forceRefresh = false): Promise<BaselineState> {
  const preferredPreviewVersionId = getPreferredPreviewVersionId();
  if (
    !forceRefresh &&
    baselineState.value &&
    (preferredPreviewVersionId === null || baselineState.value.previewVersionId === preferredPreviewVersionId)
  ) {
    return baselineState.value;
  }

  if (!scheduleStore.basicInfo) {
    throw new Error('기본 스케줄 정보가 없습니다.');
  }

  isBaselineLoading.value = true;
  baselineErrorMessage.value = null;

  try {
    const compareResponse = await ensurePhase2Schedule({
      organizationId: scheduleStore.basicInfo.organizationId,
      month: scheduleStore.basicInfo.month,
    });
    const schedulePublicId = compareResponse.schedulePublicId ?? compareResponse.scheduleId;

    const resolvedState = resolveStep4VersionState(compareResponse, preferredPreviewVersionId);

    if (!resolvedState.previewVersionId) {
      throw new Error('기본 스케줄 버전을 확인할 수 없습니다.');
    }

    const hasExecutedHistory = hasExecutedVersionHistory(compareResponse);
    const defaultStep5FocusVersionId = getDefaultExecutedFocusVersionId(compareResponse);
    const defaultStep5CompareVersionIds = getDefaultCompareVersionIds(
      compareResponse,
      defaultStep5FocusVersionId
    );

    scheduleStore.setBasicInfo({
      ...scheduleStore.basicInfo,
      scheduleId: compareResponse.scheduleId,
      schedulePublicId,
    });
    scheduleStore.setSelectedVersionId(resolvedState.selectedVersionId);
    scheduleStore.setPreviewVersionId(resolvedState.previewVersionId);

    const assignmentData = await getScheduleVersionAssignments(resolvedState.previewVersionId);

    baselineState.value = createBaselineState({
      scheduleId: compareResponse.scheduleId,
      schedulePublicId,
      previewVersionId: resolvedState.previewVersionId,
      selectedVersionId: resolvedState.selectedVersionId,
      defaultRouteFocusVersionId: getDefaultStep5FocusVersionId(compareResponse),
      hasExecutedHistory,
      versions: resolvedState.versions,
      defaultStep5FocusVersionId,
      defaultStep5CompareVersionIds,
      hasCurrentMonthAssignments: hasCurrentMonthAssignments(
        assignmentData.assignments,
        scheduleStore.basicInfo.month
      ),
    });
    baselinePreferenceSnapshot.value = null;

    return baselineState.value;
  } catch (error) {
    baselineState.value = null;
    baselinePreferenceSnapshot.value = null;
    baselineErrorMessage.value = `기준 버전 초기화에 실패했습니다: ${toErrorMessage(error)}`;
    throw error;
  } finally {
    isBaselineLoading.value = false;
  }
}

async function loadOffRequestPolicyRules(force = false): Promise<void> {
  const organizationId = scheduleStore.basicInfo?.organizationId ?? orgStore.current?.id;
  if (!organizationId) {
    offRequestPolicyRules.value = [];
    offPolicyLoadError.value = null;
    return;
  }

  isOffPolicyLoading.value = true;
  if (force) offPolicyLoadError.value = null;

  try {
    const response = await getOffRequestPolicies(organizationId);
    offRequestPolicyRules.value = response.policyRules.filter((rule) => rule.isActive);
    offPolicyLoadError.value = null;
  } catch {
    offPolicyLoadError.value = OFF_POLICY_LOAD_ERROR_MESSAGE;
    showError(OFF_POLICY_LOAD_ERROR_MESSAGE);
  } finally {
    isOffPolicyLoading.value = false;
  }
}

async function handleRetryOffPolicyLoad(): Promise<void> {
  await loadOffRequestPolicyRules(true);
}

function assertOffWritesAllowed(options?: { includeDraftBlock?: boolean }): string | null {
  if (offPolicyLoadError.value) return offPolicyLoadError.value;
  if (step4MutationBlockedReason.value) return step4MutationBlockedReason.value;
  if (options?.includeDraftBlock !== false && pageLevelBlockedReason.value) {
    return pageLevelBlockedReason.value;
  }
  return null;
}

// Lifecycle
onMounted(async () => {
  window.addEventListener('keydown', handleWindowKeydown);

  if (!scheduleStore.basicInfo) {
    router.push(getScheduleStepRoutePath(1));
    return;
  }

  await loadStep4InitialData();
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleWindowKeydown);
});

function shouldReloadOrganizationEmployees(forceRefresh: boolean): boolean {
  if (forceRefresh) return true;
  if (!orgStore.current || orgStore.employees.length === 0) return true;
  if (!scheduleStore.basicInfo?.scheduleId) return true;
  return false;
}

async function loadStep4InitialData(forceRefresh = false) {
  if (!scheduleStore.basicInfo) return;

  isInitialDataLoading.value = true;
  baselineErrorMessage.value = null;

  try {
    if (shouldReloadOrganizationEmployees(forceRefresh)) {
      const loadResult = await orgStore.loadOrganization(scheduleStore.basicInfo.organizationId);
      if (!loadResult.success) {
        baselineErrorMessage.value = `직원 정보를 불러오지 못했습니다: ${loadResult.error ?? 'Unknown error'}`;
        showError(baselineErrorMessage.value);
        return;
      }
    }

    grid.employees.value = orgStore.employees;
    if (grid.employees.value.length === 0) {
      baselineErrorMessage.value = '직원 정보가 없습니다. Step3에서 최소 1명 저장 후 다시 진행해주세요.';
      showError(baselineErrorMessage.value);
      return;
    }

    grid.generateDates(scheduleStore.basicInfo.month, 0);
    ensureEmployeeMaps();
    await loadOffRequestPolicyRules();
    await restoreData(forceRefresh);
  } finally {
    isInitialDataLoading.value = false;
  }
}

async function restoreData(forceRefresh = false) {
  if (grid.employees.value.length === 0) {
    baselineErrorMessage.value = '직원 정보가 없습니다. Step3에서 최소 1명 저장 후 다시 진행해주세요.';
    showError(baselineErrorMessage.value);
    return;
  }

  try {
    resetDraftState();
    pendingLocalDraftSnapshot.value = null;
    migrateLegacyTempPreferencesIfNeeded();

    const scopedLocalSnapshot = loadTempPreferencesFromLocalStorage();

    if (!scheduleStore.basicInfo?.scheduleId) {
      logRestoreTrace('Skipping ensure on restoreData(); using local draft only', {
        month: scheduleStore.basicInfo?.month,
      });

      if (scopedLocalSnapshot) {
        const sanitized = sanitizeSnapshotToCurrentEmployees(scopedLocalSnapshot);
        const offRequestCount = countStoredOffRequests(sanitized.constraints);
        const hasNotes = hasAnyConstraintNotes(sanitized.notes);

        if (offRequestCount > 0 || hasNotes) {
          reconcileAndNotifyPreferenceMaps(sanitized.constraints, sanitized.notes);
        } else {
          replacePreferenceMapsFromSnapshot({
            constraints: {},
            notes: {},
          });
        }
      } else {
        replacePreferenceMapsFromSnapshot({
          constraints: {},
          notes: {},
        });
      }

      baselineState.value = null;
      baselinePreferenceSnapshot.value = null;
      syncPolicyRejectionDisplay([]);
      storePendingLocalDraftSnapshot(scopedLocalSnapshot);
      return;
    }

    const { scheduleId, previewVersionId, selectedVersionId } = await ensureBaselineVersion(
      forceRefresh
    );

    const versionCandidates = Array.from(
      new Set([previewVersionId, selectedVersionId].filter((id): id is string => !!id))
    );

    logRestoreTrace('Starting restoreData()', {
      scheduleId,
      previewVersionId,
      selectedVersionId,
      versionCandidates,
    });

    for (const versionId of versionCandidates) {
      const versionPreferenceData = await getScheduleVersionPreferences(versionId);

      if (versionId === previewVersionId) {
        setBaselinePreferenceSnapshot(
          previewVersionId,
          createPreferenceSnapshot(versionPreferenceData.constraints, versionPreferenceData.notes)
        );
        syncPolicyRejectionDisplay(versionPreferenceData.preferences as PreferenceWithPolicyResult[]);
      }

      logRestoreTrace('Fetched preferences by schedule_version_id', {
        scheduleVersionId: versionId,
        preferenceCount: versionPreferenceData.preferences.length,
      });

      if (versionPreferenceData.preferences.length > 0) {
        const sanitized = replacePreferenceMapsFromSnapshot({
          constraints: versionPreferenceData.constraints,
          notes: versionPreferenceData.notes,
        });
        if (sanitized.removedEmployeeIds.length > 0) {
          logRestoreTrace('Removed stale employee keys from version preferences', sanitized);
        }
        if (hasCurrentPreferences()) {
          storePendingLocalDraftSnapshot(scopedLocalSnapshot);
          showInfo('저장된 요청 데이터를 불러왔습니다.');
          return;
        }
      }
    }

    const schedulePreferenceData = await getSchedulePreferences(scheduleId);
    logRestoreTrace('Fetched preferences by schedule_id (legacy fallback)', {
      scheduleId,
      preferenceCount: schedulePreferenceData.preferences.length,
    });

    if (schedulePreferenceData.preferences.length > 0) {
      const sanitized = replacePreferenceMapsFromSnapshot({
        constraints: schedulePreferenceData.constraints,
        notes: schedulePreferenceData.notes,
      });
      if (sanitized.removedEmployeeIds.length > 0) {
        logRestoreTrace('Removed stale employee keys from legacy schedule preferences', sanitized);
      }
      if (hasCurrentPreferences()) {
        storePendingLocalDraftSnapshot(scopedLocalSnapshot);
        showInfo('기존 저장 데이터(schedule 기준)를 불러왔습니다.');
        return;
      }
    }

    logRestoreTrace('No saved preference data found in all scopes');
    replacePreferenceMapsFromSnapshot({
      constraints: {},
      notes: {},
    });

    if (previewVersionId) {
      setBaselinePreferenceSnapshot(
        previewVersionId,
        createPreferenceSnapshot({}, {})
      );
    }
    syncPolicyRejectionDisplay([]);
    storePendingLocalDraftSnapshot(scopedLocalSnapshot);
  } catch {
    showError(baselineErrorMessage.value ?? 'Step4 초기화에 실패했습니다.');
  }
}

async function handleRetryBaseline() {
  await loadStep4InitialData(true);
  if (isRequestDrawerOpen.value) {
    await focusRequestComposerSearch();
  }
}

// Actions
function handlePrev() {
  scheduleStore.setAssignments(constraints.value);
  scheduleStore.setComments(constraintNotes.value);
  scheduleStore.prevStep();
  router.push(
    cameFromDashboard.value
      ? {
          path: getScheduleStepRoutePath(3),
          query: {
            from: 'dashboard',
          },
        }
      : getScheduleStepRoutePath(3)
  );
}

function handleReturnToDashboard() {
  isReturningToDashboard.value = true;
  pendingLocalDraftSnapshot.value = null;
  clearCurrentScopedTempPreferencesStorage();
  scheduleStore.reset();
  router.push(getAppHomeRoutePath());
}

function clearAllOffRequestsInMemory(): void {
  pendingLocalDraftSnapshot.value = null;
  commitPreferenceMaps({}, {});
  policyRejectionReasons.value = {};
  policyCheckStatuses.value = {};
  selectedCell.value = null;
  showCommentModal.value = false;
  blockedTransitionReason.value = null;
  resetDraftState();
  clearCurrentScopedTempPreferencesStorage();
  showSuccess('모든 Off 요청을 초기화했습니다.');
}

function handleClearAllOffRequests(): void {
  if (step4MutationBlockedReason.value) {
    showInfo(step4MutationBlockedReason.value);
    return;
  }

  if (!window.$dialog?.warning) {
    showError('확인 대화상자를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    return;
  }

  window.$dialog.warning({
    title: 'Off 요청을 모두 초기화할까요?',
    content: '현재 입력한 Off 요청과 메모가 모두 지워집니다.',
    positiveText: '초기화',
    negativeText: '취소',
    positiveButtonProps: {
      type: 'error',
    },
    onPositiveClick: () => {
      clearAllOffRequestsInMemory();
    },
  });
}

async function persistStep4PreferenceMaps(
  nextConstraints: ConstraintMap,
  nextNotes: CommentMap,
  options: {
    successMessage: string;
    staleEmployeeMessage: string;
    logMessage: string;
  }
): Promise<{ scheduleId: string; previewVersionId: string } | undefined> {
  if (!scheduleStore.basicInfo) return;
  if (grid.employees.value.length === 0) {
    showError('직원 정보가 없습니다. Step3에서 최소 1명 저장 후 다시 진행해주세요.');
    return;
  }

  const sanitized = sanitizeSnapshotToCurrentEmployees({
    constraints: nextConstraints,
    notes: nextNotes,
  });
  if (sanitized.removedEmployeeIds.length > 0) {
    logRestoreTrace('Removed stale employee keys before preference persistence', sanitized);
    showInfo(options.staleEmployeeMessage);
  }

  const { scheduleId, previewVersionId } = await ensureBaselineVersion();
  const offRequestCount = countStoredOffRequests(sanitized.constraints);

  logRestoreTrace(options.logMessage, {
    scheduleId,
    scheduleVersionId: previewVersionId,
    offRequestCount,
    hasNotes: hasAnyConstraintNotes(sanitized.notes),
  });

  await saveScheduleVersionPreferences(
    scheduleId,
    previewVersionId,
    sanitized.constraints,
    sanitized.notes
  );
  await recheckPhase2ScheduleVersion(previewVersionId);
  commitPreferenceMaps(sanitized.constraints, sanitized.notes);
  setBaselinePreferenceSnapshot(
    previewVersionId,
    createPreferenceSnapshot(sanitized.constraints, sanitized.notes)
  );

  const verification = await getScheduleVersionPreferences(previewVersionId);
  logRestoreTrace('Saved preferences verification', {
    scheduleVersionId: previewVersionId,
    preferenceCount: verification.preferences.length,
    offRequestCount: countStoredOffRequests(verification.constraints),
    hasNotes: hasAnyConstraintNotes(verification.notes),
  });
  syncPolicyRejectionDisplay(verification.preferences as PreferenceWithPolicyResult[]);

  showSuccess(options.successMessage);
  return { scheduleId, previewVersionId };
}

async function handleSave(): Promise<{ scheduleId: string; previewVersionId: string } | undefined> {
  if (!scheduleStore.basicInfo) return;
  if (step4MutationBlockedReason.value) {
    showInfo(step4MutationBlockedReason.value);
    return;
  }
  if (hasUnappliedDraft.value) {
    blockedTransitionReason.value = pageLevelBlockedReason.value;
    showInfo(pageLevelBlockedReason.value ?? '미반영 요청이 있습니다.');
    return;
  }

  try {
    return await persistStep4PreferenceMaps(
      constraints.value,
      constraintNotes.value,
      {
        successMessage: '변경사항이 저장되었습니다.',
        staleEmployeeMessage: '현재 직원 목록에 없는 임시 데이터는 제외하고 저장합니다.',
        logMessage: 'Saving preferences',
      }
    );
  } catch (error) {
    showError('저장 실패: ' + toErrorMessage(error));
  }
}

async function handleSaveAppliedChanges(): Promise<void> {
  if (isSavingStep4Preferences.value) return;

  const disabledReason = saveAppliedChangesDisabledReason.value;
  if (disabledReason) {
    if (hasUnappliedDraft.value) {
      blockedTransitionReason.value = disabledReason;
    }
    showInfo(disabledReason);
    return;
  }

  isSavingStep4Preferences.value = true;
  try {
    await handleSave();
  } finally {
    isSavingStep4Preferences.value = false;
  }
}

function routeToStep5(
  schedulePublicId: string,
  versionId: string,
  options: {
    compareVersionIds?: string[];
    autoStart?: boolean;
    defaultVersionId?: string | null;
  } = {}
): void {
  scheduleStore.currentStep = 5;
  router.push(
    buildStep5Route(schedulePublicId, versionId, options.compareVersionIds, {
      autoStart: options.autoStart,
      defaultVersionId: options.defaultVersionId,
    })
  );
}

async function buildPendingHandoffContext(): Promise<{
  context: Step4HandoffContext;
  hasStep4Changes: boolean;
  hasConstraintChanges: boolean;
}> {
  const sanitizedBeforeSave = sanitizePreferenceMapsToCurrentEmployees();
  if (sanitizedBeforeSave.removedEmployeeIds.length > 0) {
    logRestoreTrace('Removed stale employee keys before next', sanitizedBeforeSave);
    showInfo('현재 직원 목록에 없는 임시 데이터는 제외하고 진행합니다.');
  }

  scheduleStore.setAssignments(constraints.value);
  scheduleStore.setComments(constraintNotes.value);

  const baseline = await ensureBaselineVersion();
  if (!baseline.previewVersionId) {
    throw new Error('기준 버전 정보가 없습니다. Step4를 다시 열어 주세요.');
  }

  const currentSnapshot = getCurrentPreferenceSnapshot();
  const baselineSnapshot = await getBaselinePreferenceSnapshot(baseline.previewVersionId);
  const hasStep4Changes = !arePreferenceSnapshotsEqual(baselineSnapshot, currentSnapshot);
  const hasConstraintChanges = !areConstraintSnapshotsEqual(baselineSnapshot, currentSnapshot);

  return {
    context: {
      baseline,
      currentSnapshot,
    },
    hasStep4Changes,
    hasConstraintChanges,
  };
}

async function handleNext() {
  if (isSubmitting.value) return;

  if (hasUnappliedDraft.value) {
    blockedTransitionReason.value = pageLevelBlockedReason.value;
    showInfo(pageLevelBlockedReason.value ?? '미반영 요청이 있습니다.');
    return;
  }

  isSubmitting.value = true;
  try {
    const { context, hasStep4Changes, hasConstraintChanges } = await buildPendingHandoffContext();
    const { baseline } = context;
    const shouldRegenerate = !baseline.hasCurrentMonthAssignments || hasConstraintChanges;
    const blockedReason = step4MutationBlockedReason.value;

    if (blockedReason && (hasStep4Changes || shouldRegenerate)) {
      showInfo(blockedReason);
      return;
    }

    if (!hasStep4Changes && !shouldRegenerate) {
      routeToStep5(baseline.schedulePublicId ?? baseline.scheduleId, baseline.previewVersionId, {
        defaultVersionId: baseline.defaultRouteFocusVersionId,
      });
      return;
    }

    if (hasStep4Changes) {
      await saveScheduleVersionPreferences(
        baseline.scheduleId,
        baseline.previewVersionId,
        constraints.value,
        constraintNotes.value
      );
      setBaselinePreferenceSnapshot(baseline.previewVersionId, context.currentSnapshot);
    }

    if (hasConstraintChanges) {
      await deleteThisMonthVersionAssignments(
        baseline.scheduleId,
        baseline.previewVersionId,
        scheduleStore.basicInfo!.month
      );
    }

    routeToStep5(baseline.schedulePublicId ?? baseline.scheduleId, baseline.previewVersionId, {
      autoStart: shouldRegenerate,
      defaultVersionId: baseline.defaultRouteFocusVersionId,
    });
  } catch (error) {
    console.error(error);
    showError(error instanceof Error ? error.message : '근무표 생성 요청 중 오류가 발생했습니다.');
  } finally {
    isSubmitting.value = false;
  }
}
</script>
