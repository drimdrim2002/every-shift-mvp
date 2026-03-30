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
                :comments="constraintNotes"
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
      <n-button
        size="large"
        @click="handlePrev"
      >
        ← 이전 단계
      </n-button>

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
          다음 단계 →
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
      :comments="constraintNotes"
      @close="showDaySummaryModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useScheduleStore } from '@/stores/schedule';
import { useOrganizationStore } from '@/stores/organization';
import { useScheduleGrid } from '@/composables/useScheduleGrid';
import {
  ensurePhase2Schedule,
  deleteThisMonthVersionAssignments,
  getScheduleVersionPreferences,
  getSchedulePreferences,
  saveScheduleVersionPreferences,
} from '@/api/schedule';
import { NAlert, NButton, NSpin } from 'naive-ui';
import ScheduleGrid from '@/components/schedule/ScheduleGrid.vue';
import StepIndicator from '@/components/schedule/StepIndicator.vue';
import CommentModal from '@/components/schedule/CommentModal.vue';
import DaySummaryModal from '@/components/schedule/DaySummaryModal.vue';
import { showError, showInfo, showSuccess } from '@/utils/message';
import { buildStep5Route, resolveStep4VersionState } from '@/utils/scheduleVersionResolver';
import { watchDebounced } from '@vueuse/core';
import type { CommentMap, ConstraintCode, ConstraintMap } from '@/types/schedule';

const router = useRouter();
const scheduleStore = useScheduleStore();
const orgStore = useOrganizationStore();
const grid = useScheduleGrid();

const isSubmitting = ref(false);
const isBaselineLoading = ref(false);
const baselineErrorMessage = ref<string | null>(null);

const constraints = ref<ConstraintMap>({});
const constraintNotes = ref<CommentMap>({});

// Modals state
const showCommentModal = ref(false);
const selectedCell = ref<{ employeeId: string; employeeName: string; date: string } | null>(null);
const showDaySummaryModal = ref(false);
const selectedDateSummary = ref<string>('');

const VALID_CONSTRAINTS = new Set<ConstraintCode>(['O']);
const baselineState = ref<{
  scheduleId: string;
  previewVersionId: string;
  selectedVersionId: string | null;
} | null>(null);

const canPersistStep4 = computed(() => {
  return (
    !isBaselineLoading.value &&
    !baselineErrorMessage.value &&
    !!baselineState.value &&
    grid.employees.value.length > 0
  );
});

const selectedCellComment = computed(() => {
  if (!selectedCell.value) return '';
  return constraintNotes.value[selectedCell.value.employeeId]?.[selectedCell.value.date] || '';
});

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

// Watchers for LocalStorage
const STORAGE_KEY = computed(() => {
  if (!scheduleStore.basicInfo) return '';
  return `everyshift_temp_preferences_${scheduleStore.basicInfo.month}`;
});

watchDebounced(
  [() => constraints.value, () => constraintNotes.value],
  ([latestConstraints, latestNotes]) => {
    if (STORAGE_KEY.value) {
      const dataToSave = { constraints: latestConstraints, constraintNotes: latestNotes };
      localStorage.setItem(STORAGE_KEY.value, JSON.stringify(dataToSave));
    }
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

function loadTempPreferencesFromLocalStorage(): { constraints: ConstraintMap; notes: CommentMap } | null {
  if (!STORAGE_KEY.value) return null;

  const raw = localStorage.getItem(STORAGE_KEY.value);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      constraints?: ConstraintMap;
      constraintNotes?: CommentMap;
    };

    return {
      constraints: parsed.constraints ?? {},
      notes: parsed.constraintNotes ?? {},
    };
  } catch (error) {
    logRestoreTrace('Failed to parse localStorage temp preferences', {
      storageKey: STORAGE_KEY.value,
      error: toErrorMessage(error),
    });
    return null;
  }
}

async function ensureBaselineVersion(forceRefresh = false): Promise<{
  scheduleId: string;
  previewVersionId: string;
  selectedVersionId: string | null;
}> {
  if (!forceRefresh && baselineState.value) {
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

    const resolvedState = resolveStep4VersionState(compareResponse);

    if (!resolvedState.previewVersionId) {
      throw new Error('기본 스케줄 버전을 확인할 수 없습니다.');
    }

    scheduleStore.setBasicInfo({
      ...scheduleStore.basicInfo,
      scheduleId: compareResponse.scheduleId,
    });
    scheduleStore.setSelectedVersionId(resolvedState.selectedVersionId);
    scheduleStore.setPreviewVersionId(resolvedState.previewVersionId);

    baselineState.value = {
      scheduleId: compareResponse.scheduleId,
      previewVersionId: resolvedState.previewVersionId,
      selectedVersionId: resolvedState.selectedVersionId,
    };

    return baselineState.value;
  } catch (error) {
    baselineState.value = null;
    baselineErrorMessage.value = `기준 버전 초기화에 실패했습니다: ${toErrorMessage(error)}`;
    throw error;
  } finally {
    isBaselineLoading.value = false;
  }
}

// Lifecycle
onMounted(async () => {
  if (!scheduleStore.basicInfo) {
    router.push('/schedule/step1');
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
        return;
      }
    }

    const localSnapshot = loadTempPreferencesFromLocalStorage();
    if (localSnapshot) {
      const offRequestCount = countStoredOffRequests(localSnapshot.constraints);
      const hasNotes = hasAnyConstraintNotes(localSnapshot.notes);

      logRestoreTrace('Fetched preferences by localStorage fallback', {
        storageKey: STORAGE_KEY.value,
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
          return;
        }
        showInfo('브라우저 임시 저장 데이터가 현재 직원 목록과 일치하지 않아 불러오지 않았습니다.');
      }
    }

    logRestoreTrace('No saved preference data found in all scopes');
  } catch {
    showError(baselineErrorMessage.value ?? 'Step4 초기화에 실패했습니다.');
  }
}

async function handleRetryBaseline() {
  await restoreData(true);
}

// Actions
function handlePrev() {
  scheduleStore.setAssignments(constraints.value);
  scheduleStore.setComments(constraintNotes.value);
  scheduleStore.prevStep();
  router.push('/schedule/step3');
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

    const verification = await getScheduleVersionPreferences(previewVersionId);
    logRestoreTrace('Saved preferences verification', {
      scheduleVersionId: previewVersionId,
      preferenceCount: verification.preferences.length,
      offRequestCount: countStoredOffRequests(verification.constraints),
      hasNotes: hasAnyConstraintNotes(verification.notes),
    });

    showSuccess('임시 저장되었습니다.');
    return { scheduleId, previewVersionId };
  } catch (error) {
    showError('저장 실패: ' + toErrorMessage(error));
  }
}

async function handleNext() {
  if (isSubmitting.value) return;
  isSubmitting.value = true;

  try {
    const saved = await handleSave();
    if (!saved) throw new Error('임시 저장에 실패했습니다.');

    if (!saved.previewVersionId) {
      throw new Error('기준 버전 정보가 없습니다. Step4를 다시 열어 주세요.');
    }

    await deleteThisMonthVersionAssignments(
      saved.scheduleId,
      saved.previewVersionId,
      scheduleStore.basicInfo!.month
    );
    scheduleStore.currentStep = 5;
    router.push(buildStep5Route(saved.scheduleId, saved.previewVersionId));
  } catch (error) {
    console.error(error);
    showError(error instanceof Error ? error.message : '근무표 생성 요청 중 오류가 발생했습니다.');
  } finally {
    isSubmitting.value = false;
  }
}
</script>
