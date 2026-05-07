<template>
  <div class="mx-auto flex h-full max-w-full flex-col px-4">
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
                  :readonly="false"
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

    <n-modal
      :show="showExistingHistoryChoiceModal"
      preset="card"
      class="max-w-md"
      :mask-closable="false"
      :closable="false"
    >
      <template #header>
        이미 만든 근무표안이 있습니다
      </template>
      <p class="mb-5 text-sm leading-6 text-gray-600">
        기존 결과를 먼저 확인하거나, Off 요청을 수정해 새 근무표안을 만들 수 있습니다.
      </p>
      <div class="flex justify-end gap-2">
        <n-button
          type="primary"
          @click="handleChooseReviewExistingHistory"
        >
          기존 결과 보기
        </n-button>
        <n-button @click="handleChooseEditExistingHistory">
          요청 수정해서 새 근무표안 만들기
        </n-button>
      </div>
    </n-modal>

    <n-modal
      :show="isEditOffStartModalOpen"
      preset="card"
      class="max-w-md"
      :mask-closable="!isCreatingEditOffDraftVersion"
      :closable="false"
    >
      <template #header>
        새 근무표안으로 Off 요청 수정
      </template>
      <div class="space-y-4">
        <div class="space-y-2">
          <p class="text-sm font-medium leading-6 text-gray-700">
            근무표안 이름
          </p>
          <n-input
            :value="pendingEditOffDraftVersionName"
            data-test="edit-off-start-version-name-input"
            maxlength="100"
            placeholder="예: 3안"
            :disabled="isCreatingEditOffDraftVersion"
            @update:value="pendingEditOffDraftVersionName = $event"
            @keyup.enter="handleConfirmEditOffDraftStart"
          />
        </div>
        <n-checkbox
          :checked="shouldCopyExistingOffRequests"
          data-test="edit-off-copy-off-checkbox"
          :disabled="isCreatingEditOffDraftVersion"
          @update:checked="shouldCopyExistingOffRequests = $event"
        >
          기존 Off 요청을 새 근무표안으로 복사
        </n-checkbox>
        <div class="flex justify-end gap-2">
          <n-button
            :disabled="isCreatingEditOffDraftVersion"
            @click="handleCancelEditOffDraftStart"
          >
            취소
          </n-button>
          <n-button
            type="primary"
            :loading="isCreatingEditOffDraftVersion"
            @click="handleConfirmEditOffDraftStart"
          >
            새 근무표안 만들기
          </n-button>
        </div>
      </div>
    </n-modal>

    <n-modal
      :show="isVersionNameModalOpen"
      preset="card"
      class="max-w-md"
      :mask-closable="false"
      :closable="false"
    >
      <template #header>
        새 근무표안 이름
      </template>
      <div class="space-y-4">
        <p class="text-sm leading-6 text-gray-600">
          근무표안 이름
        </p>
        <n-input
          :value="pendingVersionName"
          data-test="version-name-input"
          maxlength="100"
          placeholder="예: 2안"
          @update:value="handlePendingVersionNameUpdate"
          @keyup.enter="handleConfirmVersionName"
        />
        <p class="text-xs leading-5 text-gray-500">
          나중에 비교할 때 알아보기 쉬운 이름을 입력하세요.
        </p>
        <div
          v-if="duplicateVersionCandidate"
          class="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
        >
          같은 이름의 생성 실패 안이 있습니다. 이 입력으로 실패 안을 교체해 다시 생성합니다.
        </div>
        <div class="flex justify-end gap-2">
          <n-button @click="handleCancelVersionNameModal">
            취소
          </n-button>
          <n-button
            v-if="duplicateVersionCandidate"
            type="warning"
            @click="handleConfirmOverwriteVersion"
          >
            실패 안 교체하고 생성
          </n-button>
          <n-button
            v-else
            type="primary"
            @click="handleConfirmVersionName"
          >
            이 이름으로 생성
          </n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useScheduleStore } from '@/stores/schedule';
import { useOrganizationStore } from '@/stores/organization';
import { useAuthStore } from '@/stores/auth';
import { useScheduleGrid } from '@/composables/useScheduleGrid';
import { useScheduleSolverRequest } from '@/composables/useScheduleSolverRequest';
import {
  createPhase2ScheduleVersion,
  ensurePhase2Schedule,
  deleteThisMonthVersionAssignments,
  getScheduleVersionAssignments,
  getScheduleVersionPreferences,
  getSchedulePreferences,
  recheckPhase2ScheduleVersion,
  saveScheduleVersionPreferences,
} from '@/api/schedule';
import { NAlert, NButton, NCheckbox, NDrawer, NInput, NModal, NPopconfirm, NSpin } from 'naive-ui';
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
  isSolverFailedVersion,
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
import {
  buildTempPreferencesStorageKey,
  buildTempPreferencesStorageScope,
  clearScopedTempPreferencesStorage,
  migrateLegacyTempPreferencesToV2,
  readTempPreferencesEnvelopeV2,
  writeTempPreferencesEnvelopeV2,
} from '@/utils/tempPreferencesStorage';
import { getAppHomeRoutePath, getScheduleStepRoutePath } from '@/constants/routes';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const scheduleStore = useScheduleStore();
const orgStore = useOrganizationStore();
const grid = useScheduleGrid();
const solverRequestBuilder = useScheduleSolverRequest();

const isSubmitting = ref(false);
const isInitialDataLoading = ref(true);
const isSavingStep4Preferences = ref(false);
const isBaselineLoading = ref(false);
const baselineErrorMessage = ref<string | null>(null);
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
const showExistingHistoryChoiceModal = ref(false);
const hasShownExistingHistoryChoiceModal = ref(false);
const isEditOffStartModalOpen = ref(false);
const pendingEditOffDraftVersionName = ref('');
const shouldCopyExistingOffRequests = ref(true);
const isCreatingEditOffDraftVersion = ref(false);
const pendingVersionName = ref('');
const isVersionNameModalOpen = ref(false);
const duplicateVersionCandidate = ref<ScheduleVersionSummary | null>(null);
const requestComposerRef = ref<{
  focusSearchInput?: () => void;
  prefillSearchQuery?: (value: string) => void;
} | null>(null);
const isRequestDrawerOpen = ref(false);
const isRequestDrawerOpenedFromGridShortcut = ref(false);

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
type PendingHandoffAction = 'first_run' | 'new_re_solve' | 'overwrite_re_solve';
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

type PendingHandoffContext = {
  baseline: BaselineState;
  currentSnapshot: PreferenceSnapshot;
  baselineSnapshot: PreferenceSnapshot;
  hasNoteChanges: boolean;
  shouldAutoStartSolver: boolean;
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
const pendingHandoffAction = ref<PendingHandoffAction | null>(null);
const pendingHandoffContext = ref<PendingHandoffContext | null>(null);
const pendingLocalDraftSnapshot = ref<PreferenceSnapshot | null>(null);

const requestCatalog = STEP4_REQUEST_CATALOG;
const OPEN_DRAFT_BLOCKED_REASON = '미반영 요청이 있습니다. 먼저 반영하거나 선택을 초기화해 주세요.';
const HIDDEN_DRAFT_BLOCKED_REASON =
  '미반영 요청이 있습니다. 요청 입력을 다시 열어 마무리해 주세요.';
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

const canPersistStep4 = computed(() => {
  return (
    !isInitialDataLoading.value &&
    !isBaselineLoading.value &&
    !baselineErrorMessage.value &&
    (!hasUnappliedDraft.value || isEditOffDraftVersionMode.value) &&
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
  if (!baselineState.value) return '기준 버전을 먼저 확인해 주세요.';
  if (grid.employees.value.length === 0) return '직원 정보가 없습니다.';
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
const routeSourceVersionId = computed(() => normalizeRouteQueryString(route.query.sourceVersion));
const isEditOffDraftVersionMode = computed(() => {
  return (
    hasExplicitEditIntent()
    && routePreviewVersionId.value !== null
    && baselineState.value?.previewVersionId === routePreviewVersionId.value
  );
});
const isExistingResultEditMode = computed(() => {
  return hasExplicitEditIntent() && baselineState.value?.hasExecutedHistory === true;
});
const isLegacyExistingResultEditMode = computed(() => {
  return isExistingResultEditMode.value && !isEditOffDraftVersionMode.value;
});

const nextStepLabel = computed(() => {
  if (isEditOffDraftVersionMode.value) {
    return '근무표 생성(AI)';
  }

  if (isExistingResultEditMode.value) {
    return baselineState.value?.hasCurrentMonthAssignments
      ? '생성 시작으로 이동'
      : '근무표 생성(AI)';
  }

  if (!baselineState.value?.hasCurrentMonthAssignments) {
    return '근무표 생성(AI)';
  }

  if (hasPendingStep4Changes.value) {
    return '생성 시작으로 이동';
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

function hasExplicitEditIntent(): boolean {
  return route.query.intent === 'edit-off';
}

function maybeOpenExistingHistoryChoiceModal(): void {
  const baseline = baselineState.value;
  if (
    !baseline
    || !baseline.hasExecutedHistory
    || hasExplicitEditIntent()
    || hasShownExistingHistoryChoiceModal.value
  ) {
    return;
  }

  hasShownExistingHistoryChoiceModal.value = true;
  showExistingHistoryChoiceModal.value = true;
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
  const editingRow = editingRequestKey.value ? findCurrentEmployeeRequest(editingRequestKey.value) : null;

  if (editingRow) {
    if (!nextConstraints[editingRow.employeeId]) {
      nextConstraints[editingRow.employeeId] = {};
    }
    editingRow.dates.forEach((date) => {
      nextConstraints[editingRow.employeeId]![date] = '';
      removeConstraintNoteFromMap(nextNotes, editingRow.employeeId, date);
    });
  }

  const normalizedNote = draftNote.value.trim();
  selectedEmployeeIds.value.forEach((employeeId) => {
    if (!nextConstraints[employeeId]) {
      nextConstraints[employeeId] = {};
    }
    if (!nextNotes[employeeId]) {
      nextNotes[employeeId] = {};
    }

    draftSelectedDates.value.forEach((date) => {
      nextConstraints[employeeId]![date] = 'O';
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
  commitPreferenceMaps(sanitized.constraints, sanitized.notes);
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
  const employeeIds = [...selectedEmployeeIds.value];

  if (employeeIds.length === 0 || !canApplyDraft.value || isApplyRequestSaving.value) {
    return;
  }

  isApplyRequestSaving.value = true;
  setRequestApplyStatus(
    hasExplicitEditIntent() ? '요청을 반영하는 중입니다.' : '요청을 저장하는 중입니다.',
    'info'
  );

  try {
    const nextPreferenceMaps = buildDraftAppliedPreferenceMaps();
    const result = isEditOffDraftVersionMode.value
      ? await saveEditOffDraftPreferenceMaps(
          nextPreferenceMaps.constraints,
          nextPreferenceMaps.notes,
          {
            successMessage: '요청이 새 근무표안에 저장되었습니다.',
            staleEmployeeMessage: '현재 직원 목록에 없는 임시 데이터는 제외하고 요청을 저장합니다.',
            logMessage: 'Saving edit-off draft request-entry preferences',
          }
        )
      : isLegacyExistingResultEditMode.value
      ? stageStep4PreferenceMaps(
          nextPreferenceMaps.constraints,
          nextPreferenceMaps.notes,
          {
            successMessage: '요청이 새 근무표안 입력에 반영되었습니다.',
            staleEmployeeMessage: '현재 직원 목록에 없는 임시 데이터는 제외하고 요청을 반영합니다.',
            logMessage: 'Staging edit-off request-entry preferences',
          }
        )
      : await persistStep4PreferenceMaps(
          nextPreferenceMaps.constraints,
          nextPreferenceMaps.notes,
          {
            successMessage: '요청이 저장되었습니다.',
            staleEmployeeMessage: '현재 직원 목록에 없는 임시 데이터는 제외하고 요청을 저장합니다.',
            logMessage: 'Saving request-entry preferences',
          }
        );

    if (!result) return;

    if (isLegacyExistingResultEditMode.value) {
      resetDraftState();
    } else {
      editingRequestKey.value = null;
      dirtySinceLastApply.value = false;
      blockedTransitionReason.value = null;
    }
    setRequestApplyStatus(
      isEditOffDraftVersionMode.value
        ? '요청이 새 근무표안에 저장되었습니다.'
        : isLegacyExistingResultEditMode.value
        ? '요청이 새 근무표안 입력에 반영되었습니다.'
        : '요청이 DB에 저장되었습니다.',
      'success'
    );

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
  const requestRow = findCurrentEmployeeRequest(requestKey);
  if (!requestRow) return;
  if (!guardDraftTransition([requestRow.employeeId], requestRow.dates, requestRow.requestKey)) {
    return;
  }

  clearRequestApplyStatus();
  requestRow.dates.forEach((date) => {
    if (constraints.value[requestRow.employeeId]) {
      constraints.value[requestRow.employeeId]![date] = '';
    }
    removeConstraintNote(requestRow.employeeId, date);
  });

  constraints.value = { ...constraints.value };
  constraintNotes.value = { ...constraintNotes.value };

  if (editingRequestKey.value === requestKey) {
    resetDraftState({ preserveEmployee: true });
  }
}

// Callbacks
function handleAssignmentUpdate(payload: { employeeId: string; date: string; shiftCode: string }) {
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

function areNoteSnapshotsEqual(left: PreferenceSnapshot, right: PreferenceSnapshot): boolean {
  return serializeCommentMap(left.notes) === serializeCommentMap(right.notes);
}

function countChangedEntries<T extends string>(left: Record<string, Record<string, T>>, right: Record<string, Record<string, T>>): number {
  const employeeIds = new Set([...Object.keys(left), ...Object.keys(right)]);
  let changedCount = 0;

  employeeIds.forEach((employeeId) => {
    const dates = new Set([
      ...Object.keys(left[employeeId] ?? {}),
      ...Object.keys(right[employeeId] ?? {}),
    ]);

    dates.forEach((date) => {
      if ((left[employeeId]?.[date] ?? '') !== (right[employeeId]?.[date] ?? '')) {
        changedCount += 1;
      }
    });
  });

  return changedCount;
}

function buildStep4InputDiffSummary(
  baselineSnapshot: PreferenceSnapshot,
  currentSnapshot: PreferenceSnapshot
) {
  const changedOffRequests = countChangedEntries(
    baselineSnapshot.constraints,
    currentSnapshot.constraints
  );
  const changedNotes = countChangedEntries(baselineSnapshot.notes, currentSnapshot.notes);

  return {
    changedOffRequests,
    changedLockedAssignments: 0,
    changedSiteRequirements: 0,
    note: changedNotes > 0 ? `step4_notes_changed:${changedNotes}` : null,
  };
}

function getNextVersionNameDefault(): string {
  const versions = baselineState.value?.versions ?? [];
  const usedNumericNames = new Set<number>();

  versions.forEach((version) => {
    if (isSolverFailedVersion(version) || version.archivedAt) {
      return;
    }

    const match = normalizeVersionName(version.name).match(/^(\d+)안$/);
    const numericName = match?.[1] ? Number(match[1]) : NaN;

    if (Number.isInteger(numericName) && numericName > 0) {
      usedNumericNames.add(numericName);
    }
  });

  let nextNameNumber = 1;
  while (usedNumericNames.has(nextNameNumber)) {
    nextNameNumber += 1;
  }

  return `${nextNameNumber}안`;
}

function normalizeVersionName(name: string | null): string {
  return (name ?? '').trim().toLowerCase();
}

function findDuplicateVersionByName(name: string): ScheduleVersionSummary | null {
  const normalizedName = normalizeVersionName(name);
  if (!normalizedName) return null;

  return (
    baselineState.value?.versions.find((version) => {
      return normalizeVersionName(version.name) === normalizedName;
    }) ?? null
  );
}

function isVersionBlockedForOverwrite(version: ScheduleVersionSummary): boolean {
  return Boolean(
    version.isFinalized
    || version.status === 'finalized'
    || version.status === 'solving'
    || version.activeSolverExecutionId
    || version.archivedAt
  );
}

function clearPendingVersionHandoff(): void {
  pendingVersionName.value = '';
  isVersionNameModalOpen.value = false;
  duplicateVersionCandidate.value = null;
  pendingHandoffAction.value = null;
  pendingHandoffContext.value = null;
}

function openVersionNameModal(
  action: PendingHandoffAction,
  context: PendingHandoffContext
): void {
  pendingHandoffAction.value = action;
  pendingHandoffContext.value = context;
  duplicateVersionCandidate.value = null;
  pendingVersionName.value = action === 'first_run' ? '1안' : getNextVersionNameDefault();
  isVersionNameModalOpen.value = true;
}

function handlePendingVersionNameUpdate(value: string): void {
  pendingVersionName.value = value;

  if (
    duplicateVersionCandidate.value
    && normalizeVersionName(value) !== normalizeVersionName(duplicateVersionCandidate.value.name)
  ) {
    duplicateVersionCandidate.value = null;
  }
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

  commitPreferenceMaps(sanitized.constraints, sanitized.notes);
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
  if (pageLevelBlockedReason.value) {
    showInfo(pageLevelBlockedReason.value ?? '미반영 요청이 있습니다.');
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
  pendingLocalDraftSnapshot.value = null;
  policyRejectionReasons.value = {};
  policyCheckStatuses.value = {};
  selectedCell.value = null;
  showCommentModal.value = false;
  blockedTransitionReason.value = null;
  resetDraftState();
  commitPreferenceMaps(nextConstraints, {});
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

async function loadStep4InitialData(forceRefresh = false) {
  if (!scheduleStore.basicInfo) return;

  isInitialDataLoading.value = true;
  baselineErrorMessage.value = null;

  try {
    if (!orgStore.current || orgStore.employees.length === 0) {
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

    const scopedLocalSnapshot = loadTempPreferencesFromLocalStorage();

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
          maybeOpenExistingHistoryChoiceModal();
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
        maybeOpenExistingHistoryChoiceModal();
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
    maybeOpenExistingHistoryChoiceModal();
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
function handleChooseEditExistingHistory() {
  showExistingHistoryChoiceModal.value = false;
  hasShownExistingHistoryChoiceModal.value = true;
  pendingEditOffDraftVersionName.value = getNextVersionNameDefault();
  shouldCopyExistingOffRequests.value = true;
  isEditOffStartModalOpen.value = true;
}

function handleCancelEditOffDraftStart(): void {
  if (isCreatingEditOffDraftVersion.value) return;
  isEditOffStartModalOpen.value = false;
}

function buildRouteQueryWithEditOffDraftVersion(
  draftVersionId: string,
  sourceVersionId: string
): Record<string, string> {
  const query: Record<string, string> = {};

  Object.entries(route.query).forEach(([key, value]) => {
    if (
      typeof value === 'string'
      && value.length > 0
      && key !== 'intent'
      && key !== 'version'
      && key !== 'sourceVersion'
    ) {
      query[key] = value;
    }
  });

  query.intent = 'edit-off';
  query.version = draftVersionId;
  query.sourceVersion = sourceVersionId;
  return query;
}

function createEmptyPreferenceMapsForCurrentEmployees(): PreferenceSnapshot {
  const emptyConstraints: ConstraintMap = {};
  const emptyNotes: CommentMap = {};

  grid.employees.value.forEach((employee) => {
    emptyConstraints[employee.id] = {};
    emptyNotes[employee.id] = {};
  });

  return {
    constraints: emptyConstraints,
    notes: emptyNotes,
  };
}

function buildCreatedDraftVersionSummary(
  baseline: BaselineState,
  input: {
    versionId: string;
    sourceVersionId: string;
    name: string;
    inputDiffSummary: ReturnType<typeof buildStep4InputDiffSummary>;
  }
): ScheduleVersionSummary {
  const maxVersionNo = baseline.versions.reduce(
    (max, version) => Math.max(max, version.versionNo),
    0
  );

  return {
    id: input.versionId,
    scheduleId: baseline.scheduleId,
    versionNo: maxVersionNo + 1,
    name: input.name,
    sourceType: 're_solve',
    baseVersionId: input.sourceVersionId,
    status: 'draft',
    currentRevision: 1,
    manualEditCount: 0,
    inputDiffSummary: input.inputDiffSummary,
    latestEvaluationId: null,
    latestEvaluationResultStatus: null,
    comparisonMetrics: null,
    finalizationGate: null,
    activeSolverExecutionId: null,
    isSelected: false,
    isFinalized: false,
  };
}

function resolveCreatedVersionList(
  baseline: BaselineState,
  responseVersions: ScheduleVersionSummary[],
  createdVersion: ScheduleVersionSummary
): ScheduleVersionSummary[] {
  if (responseVersions.length > 0) {
    return responseVersions;
  }

  return [
    ...baseline.versions.filter((version) => version.id !== createdVersion.id),
    createdVersion,
  ];
}

async function handleConfirmEditOffDraftStart(): Promise<void> {
  if (isCreatingEditOffDraftVersion.value) return;

  const name = pendingEditOffDraftVersionName.value.trim();
  if (!name) {
    showError('근무표안 이름을 입력해 주세요.');
    return;
  }

  const duplicate = findDuplicateVersionByName(name);
  if (duplicate) {
    showError('이미 같은 이름의 근무표안이 있습니다.');
    return;
  }

  isCreatingEditOffDraftVersion.value = true;

  try {
    const baseline = await ensureBaselineVersion();
    const sourceVersionId = baseline.previewVersionId;
    if (!sourceVersionId) {
      throw new Error('기준 버전 정보가 없습니다. Step4를 다시 열어 주세요.');
    }

    const baselineSnapshot = await getBaselinePreferenceSnapshot(sourceVersionId);
    const draftPreferenceMaps = shouldCopyExistingOffRequests.value
      ? sanitizeSnapshotToCurrentEmployees(baselineSnapshot)
      : createEmptyPreferenceMapsForCurrentEmployees();
    const draftSnapshot = createPreferenceSnapshot(
      draftPreferenceMaps.constraints,
      draftPreferenceMaps.notes
    );
    const inputDiffSummary = buildStep4InputDiffSummary(baselineSnapshot, draftSnapshot);
    const createResponse = await createPhase2ScheduleVersion(baseline.scheduleId, {
      baseVersionId: sourceVersionId,
      name,
      creationMode: 'new',
      sourceType: 're_solve',
      inputDiffSummary,
    });
    const draftVersionId = createResponse.createdVersionId;

    await saveScheduleVersionPreferences(
      baseline.scheduleId,
      draftVersionId,
      draftPreferenceMaps.constraints,
      draftPreferenceMaps.notes
    );
    await deleteThisMonthVersionAssignments(
      baseline.scheduleId,
      draftVersionId,
      scheduleStore.basicInfo!.month
    );

    const nextSchedulePublicId =
      createResponse.schedulePublicId ?? baseline.schedulePublicId ?? baseline.scheduleId;
    const createdVersion = buildCreatedDraftVersionSummary(baseline, {
      versionId: draftVersionId,
      sourceVersionId,
      name,
      inputDiffSummary,
    });

    scheduleStore.setSelectedVersionId(createResponse.selectedVersionId);
    scheduleStore.setPreviewVersionId(draftVersionId);
    baselineState.value = createBaselineState({
      scheduleId: baseline.scheduleId,
      schedulePublicId: nextSchedulePublicId,
      previewVersionId: draftVersionId,
      selectedVersionId: createResponse.selectedVersionId,
      defaultRouteFocusVersionId: baseline.defaultRouteFocusVersionId,
      hasExecutedHistory: baseline.hasExecutedHistory,
      versions: resolveCreatedVersionList(baseline, createResponse.versions, createdVersion),
      defaultStep5FocusVersionId: baseline.defaultStep5FocusVersionId,
      defaultStep5CompareVersionIds: baseline.defaultStep5CompareVersionIds,
      hasCurrentMonthAssignments: false,
    });
    commitPreferenceMaps(draftPreferenceMaps.constraints, draftPreferenceMaps.notes);
    setBaselinePreferenceSnapshot(draftVersionId, draftSnapshot);
    syncPolicyRejectionDisplay([]);
    pendingLocalDraftSnapshot.value = null;
    clearCurrentScopedTempPreferencesStorage();

    isEditOffStartModalOpen.value = false;
    await router.replace({
      query: buildRouteQueryWithEditOffDraftVersion(draftVersionId, sourceVersionId),
    });
  } catch (error) {
    if (readErrorCode(error) === 'version_name_exists') {
      try {
        await ensureBaselineVersion(true);
      } catch (refreshError) {
        console.warn('새 근무표안 이름 충돌 후 기준 버전 새로고침 실패:', refreshError);
      }
      showError('이미 같은 이름의 근무표안이 있습니다.');
      return;
    }

    console.error(error);
    showError(error instanceof Error ? error.message : '새 근무표안 생성 중 오류가 발생했습니다.');
    try {
      await ensureBaselineVersion(true);
    } catch (refreshError) {
      console.warn('새 근무표안 생성 실패 후 기준 버전 새로고침 실패:', refreshError);
    }
  } finally {
    isCreatingEditOffDraftVersion.value = false;
  }
}

function handleChooseReviewExistingHistory() {
  const baseline = baselineState.value;
  if (!baseline) {
    showError('기준 버전 정보가 없습니다. Step4를 다시 열어 주세요.');
    return;
  }

  showExistingHistoryChoiceModal.value = false;
  scheduleStore.currentStep = 5;
  router.push(buildStep5Route(
    baseline.schedulePublicId ?? baseline.scheduleId,
    baseline.defaultStep5FocusVersionId,
    [],
    {
      defaultVersionId: baseline.defaultStep5FocusVersionId,
    }
  ));
}

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

function stageStep4PreferenceMaps(
  nextConstraints: ConstraintMap,
  nextNotes: CommentMap,
  options: {
    successMessage: string;
    staleEmployeeMessage: string;
    logMessage: string;
  }
): boolean {
  if (!scheduleStore.basicInfo) return false;
  if (grid.employees.value.length === 0) {
    showError('직원 정보가 없습니다. Step3에서 최소 1명 저장 후 다시 진행해주세요.');
    return false;
  }

  const sanitized = sanitizeSnapshotToCurrentEmployees({
    constraints: nextConstraints,
    notes: nextNotes,
  });
  if (sanitized.removedEmployeeIds.length > 0) {
    logRestoreTrace('Removed stale employee keys before staged preference update', sanitized);
    showInfo(options.staleEmployeeMessage);
  }

  logRestoreTrace(options.logMessage, {
    scheduleId: baselineState.value?.scheduleId ?? scheduleStore.basicInfo.scheduleId ?? null,
    scheduleVersionId: baselineState.value?.previewVersionId ?? null,
    offRequestCount: countStoredOffRequests(sanitized.constraints),
    hasNotes: hasAnyConstraintNotes(sanitized.notes),
  });

  commitPreferenceMaps(sanitized.constraints, sanitized.notes);
  showSuccess(options.successMessage);
  return true;
}

async function saveEditOffDraftPreferenceMaps(
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
    logRestoreTrace('Removed stale employee keys before edit-off draft preference persistence', sanitized);
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
  commitPreferenceMaps(sanitized.constraints, sanitized.notes);
  setBaselinePreferenceSnapshot(
    previewVersionId,
    createPreferenceSnapshot(sanitized.constraints, sanitized.notes)
  );
  syncPolicyRejectionDisplay([]);
  pendingLocalDraftSnapshot.value = null;
  clearCurrentScopedTempPreferencesStorage();

  showSuccess(options.successMessage);
  return { scheduleId, previewVersionId };
}

async function handleSave(): Promise<{ scheduleId: string; previewVersionId: string } | undefined> {
  if (!scheduleStore.basicInfo) return;
  if (hasUnappliedDraft.value) {
    blockedTransitionReason.value = pageLevelBlockedReason.value;
    showInfo(pageLevelBlockedReason.value ?? '미반영 요청이 있습니다.');
    return;
  }

  try {
    if (isEditOffDraftVersionMode.value) {
      return await saveEditOffDraftPreferenceMaps(
        constraints.value,
        constraintNotes.value,
        {
          successMessage: '요청이 새 근무표안에 저장되었습니다.',
          staleEmployeeMessage: '현재 직원 목록에 없는 임시 데이터는 제외하고 저장합니다.',
          logMessage: 'Saving edit-off draft preferences',
        }
      );
    }

    if (isLegacyExistingResultEditMode.value) {
      stageStep4PreferenceMaps(
        constraints.value,
        constraintNotes.value,
        {
          successMessage: '새 근무표안 입력으로 임시 반영되었습니다.',
          staleEmployeeMessage: '현재 직원 목록에 없는 임시 데이터는 제외하고 임시 반영합니다.',
          logMessage: 'Staging edit-off preferences',
        }
      );
      return;
    }

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
  context: PendingHandoffContext;
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
  const hasNoteChanges = !areNoteSnapshotsEqual(baselineSnapshot, currentSnapshot);

  return {
    context: {
      baseline,
      currentSnapshot,
      baselineSnapshot,
      hasNoteChanges,
      shouldAutoStartSolver: !baseline.hasCurrentMonthAssignments,
    },
    hasStep4Changes,
    hasConstraintChanges,
  };
}

async function routeFirstRunAfterName(context: PendingHandoffContext, name: string): Promise<void> {
  const { baseline, baselineSnapshot, currentSnapshot } = context;
  const { inputSnapshot } = await solverRequestBuilder.buildScheduleSolverRequest({
    basicInfo: {
      ...scheduleStore.basicInfo!,
      scheduleId: baseline.scheduleId,
    },
    scheduleId: baseline.scheduleId,
    versionId: baseline.previewVersionId,
    constraints: constraints.value,
    siteRequirements: scheduleStore.siteRequirements,
    shifts: orgStore.shifts,
    lastMonthDays: 5,
    siteId: orgStore.foundationSite?.id ?? null,
    onSiteRequirementsLoaded: scheduleStore.setSiteRequirements,
  });

  const createResponse = await createPhase2ScheduleVersion(baseline.scheduleId, {
    baseVersionId: baseline.previewVersionId,
    name,
    creationMode: 'overwrite',
    overwriteVersionId: baseline.previewVersionId,
    sourceType: 'initial_solve',
    inputDiffSummary: buildStep4InputDiffSummary(baselineSnapshot, currentSnapshot),
    inputSnapshot,
  });
  const nextSchedulePublicId =
    createResponse.schedulePublicId ?? baseline.schedulePublicId ?? baseline.scheduleId;
  const nextVersionId = createResponse.createdVersionId;

  if (!arePreferenceSnapshotsEqual(baselineSnapshot, currentSnapshot)) {
    await saveScheduleVersionPreferences(
      baseline.scheduleId,
      nextVersionId,
      constraints.value,
      constraintNotes.value
    );
  }

  scheduleStore.setSelectedVersionId(createResponse.selectedVersionId);
  scheduleStore.setPreviewVersionId(nextVersionId);
  baselineState.value = createBaselineState({
    scheduleId: baseline.scheduleId,
    schedulePublicId: nextSchedulePublicId,
    previewVersionId: nextVersionId,
    selectedVersionId: createResponse.selectedVersionId,
    defaultRouteFocusVersionId: baseline.defaultRouteFocusVersionId,
    hasExecutedHistory: baseline.hasExecutedHistory,
    versions: createResponse.versions.length > 0 ? createResponse.versions : baseline.versions,
    defaultStep5FocusVersionId: baseline.defaultStep5FocusVersionId,
    defaultStep5CompareVersionIds: baseline.defaultStep5CompareVersionIds,
    hasCurrentMonthAssignments: false,
  });
  setBaselinePreferenceSnapshot(nextVersionId, currentSnapshot);
  routeToStep5(nextSchedulePublicId, nextVersionId, {
    compareVersionIds: [nextVersionId, createResponse.selectedVersionId].filter(
      (versionId): versionId is string => !!versionId
    ),
    autoStart: context.shouldAutoStartSolver,
    defaultVersionId: baseline.defaultRouteFocusVersionId,
  });
}

async function createAndRouteReSolveVersion(
  context: PendingHandoffContext,
  name: string,
  creationMode: 'new' | 'overwrite',
  overwriteVersionId?: string
): Promise<void> {
  const { baseline, baselineSnapshot, currentSnapshot, hasNoteChanges } = context;
  const { inputSnapshot } = await solverRequestBuilder.buildScheduleSolverRequest({
    basicInfo: {
      ...scheduleStore.basicInfo!,
      scheduleId: baseline.scheduleId,
    },
    scheduleId: baseline.scheduleId,
    versionId: baseline.previewVersionId,
    constraints: constraints.value,
    siteRequirements: scheduleStore.siteRequirements,
    shifts: orgStore.shifts,
    lastMonthDays: 5,
    siteId: orgStore.foundationSite?.id ?? null,
    onSiteRequirementsLoaded: scheduleStore.setSiteRequirements,
  });

  const createResponse = await createPhase2ScheduleVersion(baseline.scheduleId, {
    baseVersionId: baseline.previewVersionId,
    name,
    creationMode,
    ...(overwriteVersionId ? { overwriteVersionId } : {}),
    sourceType: 're_solve',
    inputDiffSummary: buildStep4InputDiffSummary(baselineSnapshot, currentSnapshot),
    inputSnapshot,
  });

  if (!createResponse.wasCreated) {
    const nextSchedulePublicId =
      createResponse.schedulePublicId ?? baseline.schedulePublicId ?? baseline.scheduleId;

    if (creationMode === 'overwrite') {
      await saveScheduleVersionPreferences(
        baseline.scheduleId,
        createResponse.createdVersionId,
        constraints.value,
        constraintNotes.value
      );
      await deleteThisMonthVersionAssignments(
        baseline.scheduleId,
        createResponse.createdVersionId,
        scheduleStore.basicInfo!.month
      );

      scheduleStore.setSelectedVersionId(createResponse.selectedVersionId);
      scheduleStore.setPreviewVersionId(createResponse.createdVersionId);
      baselineState.value = createBaselineState({
        scheduleId: baseline.scheduleId,
        schedulePublicId: nextSchedulePublicId,
        previewVersionId: createResponse.createdVersionId,
        selectedVersionId: createResponse.selectedVersionId,
        defaultRouteFocusVersionId: baseline.defaultRouteFocusVersionId,
        hasExecutedHistory: baseline.hasExecutedHistory,
        versions: createResponse.versions.length > 0 ? createResponse.versions : baseline.versions,
        defaultStep5FocusVersionId: baseline.defaultStep5FocusVersionId,
        defaultStep5CompareVersionIds: baseline.defaultStep5CompareVersionIds,
        hasCurrentMonthAssignments: false,
      });
      setBaselinePreferenceSnapshot(createResponse.createdVersionId, currentSnapshot);
      routeToStep5(nextSchedulePublicId, createResponse.createdVersionId, {
        compareVersionIds: [createResponse.createdVersionId, createResponse.selectedVersionId].filter(
          (versionId): versionId is string => !!versionId
        ),
        autoStart: true,
        defaultVersionId: baseline.defaultRouteFocusVersionId,
      });
      return;
    }

    const reusedAssignmentData = await getScheduleVersionAssignments(createResponse.createdVersionId);
    const reusedHasCurrentMonthAssignments = hasCurrentMonthAssignments(
      reusedAssignmentData.assignments,
      scheduleStore.basicInfo!.month
    );

    if (hasNoteChanges) {
      await saveScheduleVersionPreferences(
        baseline.scheduleId,
        createResponse.createdVersionId,
        constraints.value,
        constraintNotes.value
      );
    }

    scheduleStore.setSelectedVersionId(createResponse.selectedVersionId);
    scheduleStore.setPreviewVersionId(createResponse.createdVersionId);
    baselineState.value = createBaselineState({
      scheduleId: baseline.scheduleId,
      schedulePublicId: nextSchedulePublicId,
      previewVersionId: createResponse.createdVersionId,
      selectedVersionId: createResponse.selectedVersionId,
      defaultRouteFocusVersionId: baseline.defaultRouteFocusVersionId,
      hasExecutedHistory: baseline.hasExecutedHistory,
      versions: createResponse.versions.length > 0 ? createResponse.versions : baseline.versions,
      defaultStep5FocusVersionId: baseline.defaultStep5FocusVersionId,
      defaultStep5CompareVersionIds: baseline.defaultStep5CompareVersionIds,
      hasCurrentMonthAssignments: reusedHasCurrentMonthAssignments,
    });
    setBaselinePreferenceSnapshot(createResponse.createdVersionId, currentSnapshot);
    routeToStep5(nextSchedulePublicId, createResponse.createdVersionId, {
      compareVersionIds: [createResponse.createdVersionId, createResponse.selectedVersionId].filter(
        (versionId): versionId is string => !!versionId
      ),
      autoStart: !reusedHasCurrentMonthAssignments,
      defaultVersionId: baseline.defaultRouteFocusVersionId,
    });
    return;
  }

  await saveScheduleVersionPreferences(
    baseline.scheduleId,
    createResponse.createdVersionId,
    constraints.value,
    constraintNotes.value
  );
  await deleteThisMonthVersionAssignments(
    baseline.scheduleId,
    createResponse.createdVersionId,
    scheduleStore.basicInfo!.month
  );

  scheduleStore.setSelectedVersionId(createResponse.selectedVersionId);
  scheduleStore.setPreviewVersionId(createResponse.createdVersionId);
  const nextSchedulePublicId =
    createResponse.schedulePublicId ?? baseline.schedulePublicId ?? baseline.scheduleId;
  baselineState.value = createBaselineState({
    scheduleId: baseline.scheduleId,
    schedulePublicId: nextSchedulePublicId,
    previewVersionId: createResponse.createdVersionId,
    selectedVersionId: createResponse.selectedVersionId,
    defaultRouteFocusVersionId: baseline.defaultRouteFocusVersionId,
    hasExecutedHistory: baseline.hasExecutedHistory,
    versions: createResponse.versions.length > 0 ? createResponse.versions : baseline.versions,
    defaultStep5FocusVersionId: baseline.defaultStep5FocusVersionId,
    defaultStep5CompareVersionIds: baseline.defaultStep5CompareVersionIds,
    hasCurrentMonthAssignments: false,
  });
  setBaselinePreferenceSnapshot(createResponse.createdVersionId, currentSnapshot);
  routeToStep5(nextSchedulePublicId, createResponse.createdVersionId, {
    compareVersionIds: [createResponse.createdVersionId, createResponse.selectedVersionId].filter(
      (versionId): versionId is string => !!versionId
    ),
    autoStart: context.shouldAutoStartSolver,
    defaultVersionId: baseline.defaultRouteFocusVersionId,
  });
}

async function executePendingHandoff(
  name: string,
  mode: 'new' | 'overwrite',
  overwriteVersionId?: string
): Promise<void> {
  const action = pendingHandoffAction.value;
  const context = pendingHandoffContext.value;
  if (!action || !context) {
    showError('진행할 근무표안 정보가 없습니다. 다시 시도해 주세요.');
    return;
  }

  if (isSubmitting.value) return;
  isSubmitting.value = true;

  try {
    if (action === 'first_run') {
      await routeFirstRunAfterName(context, name);
    } else {
      pendingHandoffAction.value = mode === 'overwrite' ? 'overwrite_re_solve' : 'new_re_solve';
      await createAndRouteReSolveVersion(context, name, mode, overwriteVersionId);
    }
    clearPendingVersionHandoff();
  } catch (error) {
    console.error(error);
    if (readErrorCode(error) === 'version_name_exists') {
      try {
        await ensureBaselineVersion(true);
      } catch (refreshError) {
        console.warn('버전 이름 충돌 후 기준 버전 새로고침 실패:', refreshError);
      }

      const duplicate = findDuplicateVersionByName(name);
      duplicateVersionCandidate.value = duplicate;

      if (duplicate && isSolverFailedVersion(duplicate) && !isVersionBlockedForOverwrite(duplicate)) {
        return;
      }

      duplicateVersionCandidate.value = null;
      showError('이미 같은 이름의 근무표안이 있습니다.');
      return;
    }

    showError(error instanceof Error ? error.message : '근무표 생성 요청 중 오류가 발생했습니다.');
  } finally {
    isSubmitting.value = false;
  }
}

async function handleConfirmVersionName() {
  const name = pendingVersionName.value.trim();
  if (!name) {
    showError('근무표안 이름을 입력해 주세요.');
    return;
  }

  const duplicate = findDuplicateVersionByName(name);
  if (duplicate) {
    if (isSolverFailedVersion(duplicate)) {
      if (isVersionBlockedForOverwrite(duplicate)) {
        duplicateVersionCandidate.value = null;
        showError('이미 같은 이름의 근무표안이 있습니다.');
        return;
      }

      duplicateVersionCandidate.value = duplicate;
      return;
    }

    if (
      pendingHandoffAction.value === 'first_run'
      && pendingHandoffContext.value?.baseline.previewVersionId === duplicate.id
    ) {
      duplicateVersionCandidate.value = null;
      await executePendingHandoff(name, 'new');
      return;
    }

    duplicateVersionCandidate.value = null;
    showError('이미 같은 이름의 근무표안이 있습니다.');
    return;
  }

  duplicateVersionCandidate.value = null;
  await executePendingHandoff(name, 'new');
}

async function handleConfirmOverwriteVersion() {
  const duplicate = duplicateVersionCandidate.value;
  const name = pendingVersionName.value.trim();
  if (!duplicate || !name) {
    showError('교체할 실패 안 정보가 없습니다. 다시 시도해 주세요.');
    return;
  }

  const currentDuplicate = findDuplicateVersionByName(name);
  if (!currentDuplicate || currentDuplicate.id !== duplicate.id) {
    duplicateVersionCandidate.value = null;
    showError('근무표안 이름이 변경되었습니다. 다시 확인해 주세요.');
    return;
  }

  if (!isSolverFailedVersion(duplicate) || isVersionBlockedForOverwrite(duplicate)) {
    duplicateVersionCandidate.value = null;
    showError('이미 같은 이름의 근무표안이 있습니다.');
    return;
  }

  await executePendingHandoff(name, 'overwrite', duplicate.id);
}

function handleCancelVersionNameModal() {
  clearPendingVersionHandoff();
}

async function handleEditOffDraftNext(): Promise<void> {
  if (isSubmitting.value) return;

  isSubmitting.value = true;
  try {
    const baseline = await ensureBaselineVersion();
    const draftVersionId = baseline.previewVersionId;
    if (!draftVersionId) {
      throw new Error('현재 수정 중인 근무표안 정보를 찾을 수 없습니다.');
    }

    if (hasUnappliedDraft.value) {
      const nextPreferenceMaps = buildDraftAppliedPreferenceMaps();
      const saved = await saveEditOffDraftPreferenceMaps(
        nextPreferenceMaps.constraints,
        nextPreferenceMaps.notes,
        {
          successMessage: '요청이 새 근무표안에 저장되었습니다.',
          staleEmployeeMessage: '현재 직원 목록에 없는 임시 데이터는 제외하고 저장합니다.',
          logMessage: 'Saving edit-off draft preferences before Step5 handoff',
        }
      );
      if (!saved) return;
      resetDraftState();
    } else if (hasPendingStep4Changes.value) {
      const saved = await saveEditOffDraftPreferenceMaps(
        constraints.value,
        constraintNotes.value,
        {
          successMessage: '요청이 새 근무표안에 저장되었습니다.',
          staleEmployeeMessage: '현재 직원 목록에 없는 임시 데이터는 제외하고 저장합니다.',
          logMessage: 'Saving edit-off draft pending preferences before Step5 handoff',
        }
      );
      if (!saved) return;
    }

    scheduleStore.setAssignments(constraints.value);
    scheduleStore.setComments(constraintNotes.value);

    routeToStep5(baseline.schedulePublicId ?? baseline.scheduleId, draftVersionId, {
      compareVersionIds: [routeSourceVersionId.value ?? baseline.selectedVersionId].filter(
        (versionId): versionId is string => !!versionId
      ),
      autoStart: true,
      defaultVersionId: null,
    });
  } catch (error) {
    console.error(error);
    showError(error instanceof Error ? error.message : '근무표 생성 요청 중 오류가 발생했습니다.');
  } finally {
    isSubmitting.value = false;
  }
}

async function handleNext() {
  if (isSubmitting.value) return;
  if (isEditOffDraftVersionMode.value) {
    await handleEditOffDraftNext();
    return;
  }

  if (hasUnappliedDraft.value) {
    blockedTransitionReason.value = pageLevelBlockedReason.value;
    showInfo(pageLevelBlockedReason.value ?? '미반영 요청이 있습니다.');
    return;
  }

  try {
    const { context, hasStep4Changes, hasConstraintChanges } = await buildPendingHandoffContext();
    const { baseline } = context;

    if (isLegacyExistingResultEditMode.value) {
      if (!hasStep4Changes) {
        showInfo('Off 요청을 수정한 뒤 새 근무표안을 생성할 수 있습니다.');
        return;
      }

      openVersionNameModal('new_re_solve', {
        ...context,
        shouldAutoStartSolver: true,
      });
      return;
    }

    if (!baseline.hasExecutedHistory && context.shouldAutoStartSolver) {
      openVersionNameModal('first_run', context);
      return;
    }

    if (!hasStep4Changes) {
      if (context.shouldAutoStartSolver) {
        openVersionNameModal('first_run', context);
        return;
      }

      routeToStep5(baseline.schedulePublicId ?? baseline.scheduleId, baseline.previewVersionId, {
        autoStart: context.shouldAutoStartSolver,
        defaultVersionId: baseline.defaultRouteFocusVersionId,
      });
      return;
    }

    if (!hasConstraintChanges) {
      if (context.shouldAutoStartSolver) {
        openVersionNameModal('first_run', context);
        return;
      }

      if (context.hasNoteChanges) {
        await saveScheduleVersionPreferences(
          baseline.scheduleId,
          baseline.previewVersionId,
          constraints.value,
          constraintNotes.value
        );
      }

      setBaselinePreferenceSnapshot(baseline.previewVersionId, context.currentSnapshot);
      routeToStep5(baseline.schedulePublicId ?? baseline.scheduleId, baseline.previewVersionId, {
        autoStart: context.shouldAutoStartSolver,
        defaultVersionId: baseline.defaultRouteFocusVersionId,
      });
      return;
    }

    openVersionNameModal('new_re_solve', context);
  } catch (error) {
    console.error(error);
    showError(error instanceof Error ? error.message : '근무표 생성 요청 중 오류가 발생했습니다.');
  }
}
</script>
