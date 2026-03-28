<template>
  <div class="mx-auto flex h-full max-w-full flex-col px-4">
    <StepIndicator
      :current-step="4"
      class="mb-4"
    />

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
          @click="handleSave"
        >
          임시 저장
        </n-button>
        <n-button
          type="primary"
          size="large"
          :loading="isSubmitting"
          :disabled="isSubmitting"
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
  deleteThisMonthAssignments,
  getScheduleVersionPreferences,
  saveScheduleVersionPreferences,
} from '@/api/schedule';
import { NButton, NSpin } from 'naive-ui';
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

const constraints = ref<ConstraintMap>({});
const constraintNotes = ref<CommentMap>({});

// Modals state
const showCommentModal = ref(false);
const selectedCell = ref<{ employeeId: string; employeeName: string; date: string } | null>(null);
const showDaySummaryModal = ref(false);
const selectedDateSummary = ref<string>('');

const VALID_CONSTRAINTS = new Set<ConstraintCode>(['O']);

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

async function ensureBaselineVersion(): Promise<{
  scheduleId: string;
  previewVersionId: string;
  selectedVersionId: string | null;
}> {
  if (!scheduleStore.basicInfo) {
    throw new Error('기본 스케줄 정보가 없습니다.');
  }

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

  return {
    scheduleId: compareResponse.scheduleId,
    previewVersionId: resolvedState.previewVersionId,
    selectedVersionId: resolvedState.selectedVersionId,
  };
}

// Lifecycle
onMounted(async () => {
  console.time('[Step4] Total Load Time');

  if (!scheduleStore.basicInfo) {
    router.push('/schedule/step1');
    return;
  }

  // Parallel initialization: org loading + data restoration
  console.time('[Step4] Parallel Init (Org + Data Restore)');
  await Promise.all([
    // Load org data if not already loaded
    (!orgStore.current || orgStore.employees.length === 0)
      ? orgStore.loadOrganization(scheduleStore.basicInfo.organizationId)
      : Promise.resolve(),
    // Restore saved data from Supabase
    restoreData(),
  ]);
  console.timeEnd('[Step4] Parallel Init (Org + Data Restore)');

  // Initialize grid from org store (no DB query needed)
  console.time('[Step4] Grid Init');
  grid.employees.value = orgStore.employees;
  grid.generateDates(scheduleStore.basicInfo.month, 0);
  ensureEmployeeMaps();
  console.timeEnd('[Step4] Grid Init');

  console.timeEnd('[Step4] Total Load Time');
});

async function restoreData() {
  try {
    const { previewVersionId } = await ensureBaselineVersion();
    const preferenceData = await getScheduleVersionPreferences(previewVersionId);

    if (preferenceData.preferences.length > 0) {
      mergeConstraintMap(preferenceData.constraints);
      mergeCommentMap(preferenceData.notes);
      showInfo('저장된 요청 데이터를 불러왔습니다.');
    }
  } catch (e) {
    console.error('Failed to load from Supabase', e);
  }
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

  try {
    scheduleStore.setAssignments(constraints.value);
    scheduleStore.setComments(constraintNotes.value);

    const { scheduleId, previewVersionId } = await ensureBaselineVersion();

    await saveScheduleVersionPreferences(previewVersionId, constraints.value, constraintNotes.value);

    showSuccess('임시 저장되었습니다.');
    return { scheduleId, previewVersionId };
  } catch (e) {
    showError('저장 실패: ' + (e instanceof Error ? e.message : String(e)));
  }
}

async function handleNext() {
  if (isSubmitting.value) return;
  isSubmitting.value = true;

  try {
    const saved = await handleSave();
    if (!saved) throw new Error('임시 저장에 실패했습니다.');

    await deleteThisMonthAssignments(saved.scheduleId, scheduleStore.basicInfo!.month);
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
