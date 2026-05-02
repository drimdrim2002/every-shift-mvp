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

    <div class="mb-4 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-bold text-slate-900">
              {{ scheduleStore.basicInfo?.month }} 요청 입력
            </h2>
            <span
              v-if="orgStore.current"
              class="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
            >
              {{ orgStore.current.name }}
            </span>
          </div>
          <p class="text-sm text-slate-600">
            요청 입력 drawer를 열어 요청을 작성하고, 반영된 결과를 월간 검토 워크스페이스에서 확인합니다.
          </p>
        </div>
        <div class="flex flex-col items-end gap-2 text-right">
          <p class="text-xs font-medium text-slate-500">
            {{ hasUnpersistedAppliedChanges ? '로컬 반영됨 · 페이지 저장 필요' : '저장된 변경 없음' }}
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
            secondary
            type="primary"
            @click="handleOpenRequestDrawer"
          >
            {{ requestDrawerCtaLabel }}
          </n-button>
          <p
            v-else
            class="text-xs text-slate-500"
          >
            요청 입력 drawer가 열려 있습니다.
          </p>
        </div>
      </div>
    </div>

    <div class="flex min-h-[780px] flex-1 flex-col gap-4 xl:min-h-[860px] 2xl:min-h-[920px]">
      <div
        class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
      >
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div class="space-y-1">
            <h3 class="text-base font-semibold text-slate-900">
              월간 검토 워크스페이스
            </h3>
            <p class="text-sm text-slate-600">
              {{ selectedEmployeeName || '근무자를 선택하세요' }}
              <span v-if="selectedDateSummary"> · {{ selectedDateSummary }}</span>
            </p>
          </div>
          <div class="text-xs text-slate-500">
            셀 클릭은 선택만 바꾸며, 실제 반영은 요청 입력 drawer의 `요청 반영`으로 진행합니다.
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
              @click="handleOpenRequestDrawer"
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
      width="min(100vw, 460px)"
      :auto-focus="false"
      @update:show="handleRequestDrawerVisibility"
    >
      <div
        data-test="step4-request-drawer"
        class="flex h-full flex-col bg-white"
      >
        <div class="border-b border-slate-200 px-5 py-4">
          <div class="space-y-1">
            <h3 class="text-base font-semibold text-slate-900">
              요청 입력
            </h3>
            <p class="text-sm text-slate-600">
              근무자를 찾고 날짜를 선택한 뒤 요청을 반영합니다.
            </p>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-5 py-4">
          <Step4RequestComposer
            ref="requestComposerRef"
            :employees="grid.employees.value"
            :dates="grid.dates.value"
            :selected-employee-id="selectedEmployeeId"
            :selected-employee-name="selectedEmployeeName"
            :request-catalog="requestCatalog"
            :draft-request-type-id="draftRequestTypeId"
            :draft-selection-mode="draftSelectionMode"
            :draft-selected-dates="draftSelectedDates"
            :draft-note="draftNote"
            :selected-date-summary="selectedDateSummary"
            :current-employee-requests="currentEmployeeRequests"
            :has-unapplied-draft="hasUnappliedDraft"
            :has-unpersisted-applied-changes="hasUnpersistedAppliedChanges"
            :apply-disabled-reason="applyDisabledReason"
            :blocked-transition-reason="blockedTransitionReason"
            @select-employee="handleSelectEmployee"
            @update:request-type="draftRequestTypeId = $event"
            @update:selection-mode="handleDraftSelectionModeUpdate"
            @update:selected-dates="handleDraftSelectedDatesUpdate"
            @update:note="handleDraftNoteUpdate"
            @apply-request="applyDraftRequest"
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
            size="large"
            :disabled="isSubmitting || !canPersistStep4"
            @click="handleSave"
          >
            임시 저장
          </n-button>
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

    <n-modal
      :show="showExistingHistoryChoiceModal"
      preset="card"
      class="max-w-md"
      :mask-closable="false"
      :closable="false"
    >
      <template #header>
        기존 생성 결과가 있습니다
      </template>
      <p class="mb-5 text-sm leading-6 text-gray-600">
        이미 생성된 근무표 결과가 있습니다. Off 요청을 수정해 다시 실행하거나 기존 결과를 확인할 수 있습니다.
      </p>
      <div class="flex justify-end gap-2">
        <n-button @click="handleChooseEditExistingHistory">
          Off 수정 후 다시 실행
        </n-button>
        <n-button
          type="primary"
          @click="handleChooseReviewExistingHistory"
        >
          결과 확인
        </n-button>
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
        버전 이름
      </template>
      <div class="space-y-4">
        <p class="text-sm leading-6 text-gray-600">
          생성할 근무표 버전 이름을 입력해 주세요.
        </p>
        <n-input
          v-model:value="pendingVersionName"
          data-test="version-name-input"
          maxlength="100"
          placeholder="예: V3"
          @keyup.enter="handleConfirmVersionName"
        />
        <div
          v-if="duplicateVersionCandidate"
          class="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
        >
          이미 같은 이름의 버전이 있습니다. 이 버전을 덮어쓰거나 다른 이름을 입력해 주세요.
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
            덮어쓰기
          </n-button>
          <n-button
            type="primary"
            @click="handleConfirmVersionName"
          >
            확인
          </n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
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
import { NAlert, NButton, NDrawer, NInput, NModal, NPopconfirm, NSpin } from 'naive-ui';
import ScheduleGrid from '@/components/schedule/ScheduleGrid.vue';
import StepIndicator from '@/components/schedule/StepIndicator.vue';
import CommentModal from '@/components/schedule/CommentModal.vue';
import DaySummaryModal from '@/components/schedule/DaySummaryModal.vue';
import Step4RequestComposer from '@/components/schedule/request-entry/Step4RequestComposer.vue';
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
const showExistingHistoryChoiceModal = ref(false);
const hasShownExistingHistoryChoiceModal = ref(false);
const pendingVersionName = ref('');
const isVersionNameModalOpen = ref(false);
const duplicateVersionCandidate = ref<ScheduleVersionSummary | null>(null);
const requestComposerRef = ref<{ focusSearchInput?: () => void } | null>(null);
const isRequestDrawerOpen = ref(false);

const selectedEmployeeId = ref<string | null>(null);
const draftRequestTypeId = ref<Step4RequestTypeId>('off');
const draftSelectionMode = ref<Step4SelectionMode>('single');
const draftSelectedDates = ref<string[]>([]);
const draftNote = ref('');
const editingRequestKey = ref<string | null>(null);
const dirtySinceLastApply = ref(false);
const blockedTransitionReason = ref<string | null>(null);

const VALID_CONSTRAINTS = new Set<ConstraintCode>(['O']);
type PendingHandoffAction = 'first_run' | 'new_re_solve' | 'overwrite_re_solve';
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
type Step4SelectionMode = 'single' | 'range' | 'multi';
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
    selectionModeSupport: ['single', 'range', 'multi'],
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

const requestCatalog = STEP4_REQUEST_CATALOG;
const OPEN_DRAFT_BLOCKED_REASON = '미반영 요청이 있습니다. 먼저 요청 반영 또는 선택 초기화를 진행해 주세요.';
const HIDDEN_DRAFT_BLOCKED_REASON =
  '미반영 요청이 있습니다. 요청 입력을 다시 열어 반영 또는 선택 초기화를 진행해 주세요.';
const selectedEmployee = computed(() => {
  if (!selectedEmployeeId.value) return null;
  return grid.employees.value.find((employee) => employee.id === selectedEmployeeId.value) ?? null;
});
const selectedEmployeeName = computed(() => selectedEmployee.value?.name ?? '');
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
  return dirtySinceLastApply.value && selectedEmployeeId.value !== null && draftSelectedDates.value.length > 0;
});
const hasHiddenUnappliedDraft = computed(() => {
  return hasUnappliedDraft.value && !isRequestDrawerOpen.value;
});
const requestDrawerCtaLabel = computed(() => {
  return hasHiddenUnappliedDraft.value ? '요청 입력 다시 열기' : '요청 입력 열기';
});
const requestDrawerStatusCopy = computed(() => {
  return hasHiddenUnappliedDraft.value
    ? HIDDEN_DRAFT_BLOCKED_REASON
    : '필요할 때만 요청 입력 drawer를 열어 요청을 추가할 수 있습니다.';
});
const pageLevelBlockedReason = computed(() => {
  if (!hasUnappliedDraft.value) return null;
  return hasHiddenUnappliedDraft.value
    ? HIDDEN_DRAFT_BLOCKED_REASON
    : OPEN_DRAFT_BLOCKED_REASON;
});
const applyDisabledReason = computed(() => {
  if (!selectedEmployeeId.value) return '근무자를 먼저 선택해 주세요.';
  if (draftSelectedDates.value.length === 0) return '날짜를 먼저 선택해 주세요.';
  return null;
});
const canApplyDraft = computed(() => applyDisabledReason.value === null);
const hasUnpersistedAppliedChanges = computed(() => hasPendingStep4Changes.value);
const currentEmployeeRequests = computed<EmployeeRequestRowVM[]>(() => {
  return buildCurrentEmployeeRequests(selectedEmployeeId.value);
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
    !isBaselineLoading.value &&
    !baselineErrorMessage.value &&
    !hasUnappliedDraft.value &&
    !!baselineState.value &&
    grid.employees.value.length > 0
  );
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

const nextStepLabel = computed(() => {
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

function hasExplicitEditIntent(): boolean {
  return route.query.intent === 'edit-off';
}

function buildRouteQueryWithEditIntent(): Record<string, string> {
  const query: Record<string, string> = {};

  Object.entries(route.query).forEach(([key, value]) => {
    if (typeof value === 'string' && value.length > 0 && key !== 'intent') {
      query[key] = value;
    }
  });

  query.intent = 'edit-off';
  return query;
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

function mergeConstraintMap(source: ConstraintMap): void {
  Object.entries(source).forEach(([employeeId, dateMap]) => {
    if (!constraints.value[employeeId]) constraints.value[employeeId] = {};
    Object.entries(dateMap || {}).forEach(([date, code]) => {
      constraints.value[employeeId]![date] = code;
    });
  });
  constraints.value = { ...constraints.value };
}

function mergeCommentMap(source: CommentMap): void {
  Object.entries(source).forEach(([employeeId, dateMap]) => {
    if (!constraintNotes.value[employeeId]) constraintNotes.value[employeeId] = {};
    Object.entries(dateMap || {}).forEach(([date, comment]) => {
      constraintNotes.value[employeeId]![date] = comment;
    });
  });
  constraintNotes.value = { ...constraintNotes.value };
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
  if (!options.preserveEmployee) {
    selectedEmployeeId.value = null;
  }
  draftRequestTypeId.value = 'off';
  draftSelectionMode.value = 'single';
  draftSelectedDates.value = [];
  draftNote.value = '';
  editingRequestKey.value = null;
  dirtySinceLastApply.value = false;
  blockedTransitionReason.value = null;
}

function guardDraftTransition(
  nextEmployeeId: string | null,
  nextDates: string[],
  nextEditingRequestKey: string | null
): boolean {
  if (!hasUnappliedDraft.value) {
    blockedTransitionReason.value = null;
    return true;
  }

  const sameEmployee = selectedEmployeeId.value === nextEmployeeId;
  const sameDates =
    JSON.stringify(sortDates(draftSelectedDates.value)) === JSON.stringify(sortDates(nextDates));
  const sameEditingRequest = editingRequestKey.value === nextEditingRequestKey;

  if (sameEmployee && sameDates && sameEditingRequest) {
    blockedTransitionReason.value = null;
    return true;
  }

  blockedTransitionReason.value = pageLevelBlockedReason.value ?? OPEN_DRAFT_BLOCKED_REASON;
  return false;
}

function handleSelectEmployee(employeeId: string): void {
  if (!guardDraftTransition(employeeId, [], null)) {
    return;
  }

  selectedEmployeeId.value = employeeId;
  draftSelectedDates.value = [];
  draftNote.value = '';
  editingRequestKey.value = null;
  dirtySinceLastApply.value = false;
  blockedTransitionReason.value = null;
}

function handleDraftSelectionModeUpdate(mode: Step4SelectionMode): void {
  draftSelectionMode.value = mode;
  blockedTransitionReason.value = null;
}

function handleDraftSelectedDatesUpdate(dates: string[]): void {
  draftSelectedDates.value = sortDates(dates);
  dirtySinceLastApply.value = draftSelectedDates.value.length > 0 || draftNote.value.trim().length > 0;
  blockedTransitionReason.value = null;
}

function handleDraftNoteUpdate(note: string): void {
  draftNote.value = note;
  dirtySinceLastApply.value = draftSelectedDates.value.length > 0 || draftNote.value.trim().length > 0;
  blockedTransitionReason.value = null;
}

function handleGridCellSelect(payload: { employeeId: string; date: string }): void {
  const existingRow =
    buildCurrentEmployeeRequests(payload.employeeId).find((row) => row.dates.includes(payload.date)) ?? null;
  if (!guardDraftTransition(payload.employeeId, [payload.date], existingRow?.requestKey ?? null)) {
    return;
  }

  selectedEmployeeId.value = payload.employeeId;
  draftRequestTypeId.value = 'off';
  draftSelectionMode.value = 'single';
  draftSelectedDates.value = [payload.date];
  draftNote.value = constraintNotes.value[payload.employeeId]?.[payload.date] ?? '';
  editingRequestKey.value = existingRow?.requestKey ?? null;
  dirtySinceLastApply.value = false;
  blockedTransitionReason.value = null;
  scrollEmployeeRowIntoView(payload.employeeId);
}

function hydrateDraftFromRequestRow(requestKey: string): void {
  const requestRow = findCurrentEmployeeRequest(requestKey);
  if (!requestRow) return;
  if (!guardDraftTransition(requestRow.employeeId, requestRow.dates, requestRow.requestKey)) {
    return;
  }

  selectedEmployeeId.value = requestRow.employeeId;
  draftRequestTypeId.value = requestRow.requestTypeId;
  draftSelectionMode.value = requestRow.dates.length > 1 ? 'range' : 'single';
  draftSelectedDates.value = [...requestRow.dates];
  draftNote.value = requestRow.note;
  editingRequestKey.value = requestRow.requestKey;
  dirtySinceLastApply.value = false;
  blockedTransitionReason.value = null;
  scrollEmployeeRowIntoView(requestRow.employeeId);
}

function applyDraftRequest(): void {
  if (!selectedEmployeeId.value || !canApplyDraft.value) {
    return;
  }

  if (!constraints.value[selectedEmployeeId.value]) {
    constraints.value[selectedEmployeeId.value] = {};
  }
  if (!constraintNotes.value[selectedEmployeeId.value]) {
    constraintNotes.value[selectedEmployeeId.value] = {};
  }

  const editingRow = editingRequestKey.value ? findCurrentEmployeeRequest(editingRequestKey.value) : null;
  if (editingRow) {
    editingRow.dates.forEach((date) => {
      constraints.value[selectedEmployeeId.value]![date] = '';
      removeConstraintNote(selectedEmployeeId.value!, date);
    });
  }

  const normalizedNote = draftNote.value.trim();
  draftSelectedDates.value.forEach((date) => {
    constraints.value[selectedEmployeeId.value!]![date] = 'O';
    if (normalizedNote.length > 0) {
      constraintNotes.value[selectedEmployeeId.value!]![date] = normalizedNote;
    } else {
      removeConstraintNote(selectedEmployeeId.value!, date);
    }
  });

  constraints.value = { ...constraints.value };
  constraintNotes.value = { ...constraintNotes.value };
  editingRequestKey.value = null;
  dirtySinceLastApply.value = false;
  blockedTransitionReason.value = null;

  if (isRequestDrawerOpen.value) {
    void focusRequestComposerSearch();
  }
}

function handleDeleteRequest(requestKey: string): void {
  const requestRow = findCurrentEmployeeRequest(requestKey);
  if (!requestRow) return;
  if (!guardDraftTransition(requestRow.employeeId, requestRow.dates, requestRow.requestKey)) {
    return;
  }

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
    const scope = tempPreferenceScope.value;
    if (!scope) return;
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
  return scheduleStore.previewVersionId;
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
  const latestVersionNo = versions.reduce((latest, version) => {
    if (isSolverFailedVersion(version)) {
      return latest;
    }

    return Math.max(latest, version.versionNo);
  }, 0);
  return `V${latestVersionNo + 1}`;
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
  pendingVersionName.value = action === 'first_run' ? 'V1' : getNextVersionNameDefault();
  isVersionNameModalOpen.value = true;
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

async function focusRequestComposerSearch(): Promise<void> {
  await nextTick();
  requestComposerRef.value?.focusSearchInput?.();
}

async function handleOpenRequestDrawer(): Promise<void> {
  isRequestDrawerOpen.value = true;
  blockedTransitionReason.value = null;
  await focusRequestComposerSearch();
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

function scrollEmployeeRowIntoView(employeeId: string): void {
  void nextTick(() => {
    document
      .querySelector<HTMLElement>(`[data-employee-id="${employeeId}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  });
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
    baselineState.value.previewVersionId === preferredPreviewVersionId
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
  if (!scheduleStore.basicInfo) {
    router.push(getScheduleStepRoutePath(1));
    return;
  }

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
  await restoreData();
});

async function restoreData(forceRefresh = false) {
  if (grid.employees.value.length === 0) {
    baselineErrorMessage.value = '직원 정보가 없습니다. Step3에서 최소 1명 저장 후 다시 진행해주세요.';
    showError(baselineErrorMessage.value);
    return;
  }

  try {
    resetDraftState();
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
        mergeConstraintMap(versionPreferenceData.constraints);
        mergeCommentMap(versionPreferenceData.notes);
        const sanitized = sanitizePreferenceMapsToCurrentEmployees();
        if (sanitized.removedEmployeeIds.length > 0) {
          logRestoreTrace('Removed stale employee keys from version preferences', sanitized);
        }
        if (hasCurrentPreferences()) {
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
      mergeConstraintMap(schedulePreferenceData.constraints);
      mergeCommentMap(schedulePreferenceData.notes);
      const sanitized = sanitizePreferenceMapsToCurrentEmployees();
      if (sanitized.removedEmployeeIds.length > 0) {
        logRestoreTrace('Removed stale employee keys from legacy schedule preferences', sanitized);
      }
      if (hasCurrentPreferences()) {
        showInfo('기존 저장 데이터(schedule 기준)를 불러왔습니다.');
        maybeOpenExistingHistoryChoiceModal();
        return;
      }
    }

    const localSnapshot = loadTempPreferencesFromLocalStorage();
    if (localSnapshot) {
      const offRequestCount = countStoredOffRequests(localSnapshot.constraints);
      const hasNotes = hasAnyConstraintNotes(localSnapshot.notes);

      logRestoreTrace('Fetched preferences by localStorage fallback', {
        storageKey: tempPreferenceScope.value
          ? buildTempPreferencesStorageKey(tempPreferenceScope.value)
          : null,
        offRequestCount,
        hasNotes,
      });

      if (offRequestCount > 0 || hasNotes) {
        mergeConstraintMap(localSnapshot.constraints);
        mergeCommentMap(localSnapshot.notes);
        const sanitized = sanitizePreferenceMapsToCurrentEmployees();
        if (sanitized.removedEmployeeIds.length > 0) {
          logRestoreTrace('Removed stale employee keys from localStorage preferences', sanitized);
        }
        if (hasCurrentPreferences()) {
          showInfo('브라우저 임시 저장 데이터를 불러왔습니다.');
          maybeOpenExistingHistoryChoiceModal();
          return;
        }
        showInfo('브라우저 임시 저장 데이터가 현재 직원 목록과 일치하지 않아 불러오지 않았습니다.');
      }
    }

    logRestoreTrace('No saved preference data found in all scopes');

    if (previewVersionId) {
      setBaselinePreferenceSnapshot(
        previewVersionId,
        createPreferenceSnapshot({}, {})
      );
    }
    syncPolicyRejectionDisplay([]);
    maybeOpenExistingHistoryChoiceModal();
  } catch {
    showError(baselineErrorMessage.value ?? 'Step4 초기화에 실패했습니다.');
  }
}

async function handleRetryBaseline() {
  await restoreData(true);
  if (isRequestDrawerOpen.value) {
    await focusRequestComposerSearch();
  }
}

// Actions
function handleChooseEditExistingHistory() {
  showExistingHistoryChoiceModal.value = false;
  hasShownExistingHistoryChoiceModal.value = true;
  void router.replace({
    query: buildRouteQueryWithEditIntent(),
  });
}

function handleChooseReviewExistingHistory() {
  const baseline = baselineState.value;
  if (!baseline) {
    showError('기준 버전 정보가 없습니다. Step4를 다시 열어 주세요.');
    return;
  }

  showExistingHistoryChoiceModal.value = false;
  scheduleStore.currentStep = 5;
  router.push(
    buildStep5Route(
      baseline.schedulePublicId ?? baseline.scheduleId,
      baseline.defaultStep5FocusVersionId,
      baseline.defaultStep5CompareVersionIds,
      {
        defaultVersionId: baseline.defaultStep5FocusVersionId,
      }
    )
  );
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
  clearScopedTempPreferencesStorage({
    userId: authStore.user?.id,
    organizationId: scheduleStore.basicInfo?.organizationId,
    month: scheduleStore.basicInfo?.month,
  });
  scheduleStore.reset();
  router.push(getAppHomeRoutePath());
}

async function handleSave(): Promise<{ scheduleId: string; previewVersionId: string } | undefined> {
  if (!scheduleStore.basicInfo) return;
  if (grid.employees.value.length === 0) {
    showError('직원 정보가 없습니다. Step3에서 최소 1명 저장 후 다시 진행해주세요.');
    return;
  }
  if (hasUnappliedDraft.value) {
    blockedTransitionReason.value = pageLevelBlockedReason.value;
    showInfo(pageLevelBlockedReason.value ?? '미반영 요청이 있습니다.');
    return;
  }

  try {
    const sanitizedBeforeSave = sanitizePreferenceMapsToCurrentEmployees();
    if (sanitizedBeforeSave.removedEmployeeIds.length > 0) {
      logRestoreTrace('Removed stale employee keys before save', sanitizedBeforeSave);
      showInfo('현재 직원 목록에 없는 임시 데이터는 제외하고 저장합니다.');
    }

    scheduleStore.setAssignments(constraints.value);
    scheduleStore.setComments(constraintNotes.value);

    const { scheduleId, previewVersionId } = await ensureBaselineVersion();
    const offRequestCount = countStoredOffRequests(constraints.value);

    logRestoreTrace('Saving preferences', {
      scheduleId,
      scheduleVersionId: previewVersionId,
      offRequestCount,
      hasNotes: hasAnyConstraintNotes(constraintNotes.value),
    });

    await saveScheduleVersionPreferences(
      scheduleId,
      previewVersionId,
      constraints.value,
      constraintNotes.value
    );
    await recheckPhase2ScheduleVersion(previewVersionId);
    setBaselinePreferenceSnapshot(previewVersionId, getCurrentPreferenceSnapshot());

    const verification = await getScheduleVersionPreferences(previewVersionId);
    logRestoreTrace('Saved preferences verification', {
      scheduleVersionId: previewVersionId,
      preferenceCount: verification.preferences.length,
      offRequestCount: countStoredOffRequests(verification.constraints),
      hasNotes: hasAnyConstraintNotes(verification.notes),
    });
    syncPolicyRejectionDisplay(verification.preferences as PreferenceWithPolicyResult[]);

    showSuccess('임시 저장되었습니다.');
    return { scheduleId, previewVersionId };
  } catch (error) {
    showError('저장 실패: ' + toErrorMessage(error));
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
    showError('진행할 버전 정보가 없습니다. 다시 시도해 주세요.');
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

      if (duplicate && !isVersionBlockedForOverwrite(duplicate)) {
        showError('이미 같은 이름의 활성 버전이 있습니다. 덮어쓰거나 다른 이름을 입력해 주세요.');
        return;
      }

      if (duplicate) {
        showError('이미 같은 이름의 버전이 있습니다. 이 버전은 덮어쓸 수 없어 다른 이름을 입력해 주세요.');
        return;
      }

      showError('이미 같은 이름의 버전이 있습니다. 보관된 버전을 포함해 중복 없이 다른 이름을 입력해 주세요.');
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
    showError('버전 이름을 입력해 주세요.');
    return;
  }

  if (pendingHandoffAction.value === 'first_run') {
    duplicateVersionCandidate.value = null;
    await executePendingHandoff(name, 'new');
    return;
  }

  const duplicate = findDuplicateVersionByName(name);
  if (duplicate) {
    if (isVersionBlockedForOverwrite(duplicate)) {
      duplicateVersionCandidate.value = null;
      showError('이 버전은 덮어쓸 수 없습니다. 다른 이름을 입력해 주세요.');
      return;
    }

    if (isSolverFailedVersion(duplicate)) {
      duplicateVersionCandidate.value = null;
      await executePendingHandoff(name, 'overwrite', duplicate.id);
      return;
    }

    duplicateVersionCandidate.value = duplicate;
    return;
  }

  duplicateVersionCandidate.value = null;
  await executePendingHandoff(name, 'new');
}

async function handleConfirmOverwriteVersion() {
  const duplicate = duplicateVersionCandidate.value;
  const name = pendingVersionName.value.trim();
  if (!duplicate || !name) {
    showError('덮어쓸 버전 정보가 없습니다. 다시 시도해 주세요.');
    return;
  }

  const currentDuplicate = findDuplicateVersionByName(name);
  if (!currentDuplicate || currentDuplicate.id !== duplicate.id) {
    duplicateVersionCandidate.value = null;
    showError('버전 이름이 변경되었습니다. 다시 확인해 주세요.');
    return;
  }

  if (isVersionBlockedForOverwrite(duplicate)) {
    duplicateVersionCandidate.value = null;
    showError('이 버전은 덮어쓸 수 없습니다. 다른 이름을 입력해 주세요.');
    return;
  }

  await executePendingHandoff(name, 'overwrite', duplicate.id);
}

function handleCancelVersionNameModal() {
  clearPendingVersionHandoff();
}

async function handleNext() {
  if (isSubmitting.value) return;
  if (hasUnappliedDraft.value) {
    blockedTransitionReason.value = pageLevelBlockedReason.value;
    showInfo(pageLevelBlockedReason.value ?? '미반영 요청이 있습니다.');
    return;
  }

  try {
    const { context, hasStep4Changes, hasConstraintChanges } = await buildPendingHandoffContext();
    const { baseline } = context;

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
