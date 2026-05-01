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

    <div class="flex min-h-[780px] flex-1 xl:min-h-[860px] 2xl:min-h-[920px]">
      <!-- Center Panel: Grid -->
      <div
        class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-white shadow-sm"
      >
        <div class="flex items-center justify-between border-b bg-gray-50 p-4">
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-bold text-gray-800">
              {{ scheduleStore.basicInfo?.month }}월 근무 조정 일정 입력
            </h2>
            <span
              v-if="orgStore.current"
              class="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
            >
              {{ orgStore.current.name }}
            </span>
          </div>
          <!-- Tips -->
          <div class="flex gap-3 text-xs text-gray-400">
            <span>👆 셀 클릭: 빈칸 ↔ O</span>
            <span>🖱️ 우클릭: O 셀 사유 작성</span>
          </div>
        </div>

        <div class="relative flex-1 overflow-hidden">
          <n-spin
            :show="grid.loading.value"
            class="h-full"
          >
            <div class="absolute inset-0 overflow-hidden">
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
                @update:assignment="handleAssignmentUpdate"
                @context-menu="handleContextMenu"
                @header-click="handleHeaderClick"
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

    <!-- Bottom Actions -->
    <div class="mt-4 flex items-center justify-between border-t bg-white py-4">
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
      :date="selectedDateSummary || ''"
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
import { computed, onMounted, ref } from 'vue';
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
import { NAlert, NButton, NInput, NModal, NPopconfirm, NSpin } from 'naive-ui';
import ScheduleGrid from '@/components/schedule/ScheduleGrid.vue';
import StepIndicator from '@/components/schedule/StepIndicator.vue';
import CommentModal from '@/components/schedule/CommentModal.vue';
import DaySummaryModal from '@/components/schedule/DaySummaryModal.vue';
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
const policyRejectionSummaries = ref<string[]>([]);

// Modals state
const showCommentModal = ref(false);
const selectedCell = ref<{ employeeId: string; employeeName: string; date: string } | null>(null);
const showDaySummaryModal = ref(false);
const selectedDateSummary = ref<string>('');
const showExistingHistoryChoiceModal = ref(false);
const hasShownExistingHistoryChoiceModal = ref(false);
const pendingVersionName = ref('');
const isVersionNameModalOpen = ref(false);
const duplicateVersionCandidate = ref<ScheduleVersionSummary | null>(null);

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

const baselineState = ref<BaselineState | null>(null);
const baselinePreferenceSnapshot = ref<{
  previewVersionId: string;
  snapshot: PreferenceSnapshot;
} | null>(null);
const pendingHandoffAction = ref<PendingHandoffAction | null>(null);
const pendingHandoffContext = ref<PendingHandoffContext | null>(null);

const canPersistStep4 = computed(() => {
  return (
    !isBaselineLoading.value &&
    !baselineErrorMessage.value &&
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
      const rejectionReason = policyRejectionReasons.value[employeeId]?.[date]?.trim() ?? '';
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

type PreferenceWithPolicyResult = {
  employee_id: string;
  date: string;
  policy_check_status?: string | null;
  policy_rejection_reason?: string | null;
};

function syncPolicyRejectionDisplay(preferences: PreferenceWithPolicyResult[]): void {
  const nextPolicyReasons: CommentMap = {};
  const nextSummaries: string[] = [];

  preferences.forEach((pref) => {
    if (pref.policy_check_status !== 'rejected') {
      return;
    }

    const rejectionReason = pref.policy_rejection_reason?.trim() ?? '';
    if (!rejectionReason) {
      return;
    }

    if (!nextPolicyReasons[pref.employee_id]) {
      nextPolicyReasons[pref.employee_id] = {};
    }
    nextPolicyReasons[pref.employee_id]![pref.date] = rejectionReason;

    const employeeName =
      grid.employees.value.find((employee) => employee.id === pref.employee_id)?.name ??
      pref.employee_id;
    nextSummaries.push(`${employeeName} (${pref.date}) - ${rejectionReason}`);
  });

  policyRejectionReasons.value = nextPolicyReasons;
  policyRejectionSummaries.value = nextSummaries;
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
  selectedDateSummary.value = date;
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

  try {
    const { context, hasStep4Changes, hasConstraintChanges } = await buildPendingHandoffContext();
    const { baseline } = context;

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
