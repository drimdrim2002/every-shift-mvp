<template>
  <div class="mx-auto max-w-7xl px-4">
    <StepIndicator :current-step="5" />

    <n-card title="근무표 생성 - 결과 확인">
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
          <h3 class="text-sm font-semibold text-gray-700">전월 데이터 표시 일수</h3>
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
        v-if="showIntermediateWaitingHint"
        type="info"
        class="mb-6"
      >
        중간 결과 대기 중 (엔진이 아직 partial result를 제공하지 않았습니다)
      </n-alert>

      <!-- 변경 사항 알림 -->
      <n-alert
        v-if="changedCells.size > 0"
        type="warning"
        class="mb-6"
      >
        <strong>{{ changedCells.size }}개의 변경사항</strong>이 있습니다. "저장" 버튼을 클릭하여 저장하세요.
      </n-alert>

      <!-- 그리드 -->
      <div class="my-6">
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
      </div>

      <!-- 버튼 -->
      <div class="flex flex-col gap-4 pt-6 sm:flex-row sm:justify-between">
        <n-button
          size="medium"
          @click="handleBack"
        >
          ← 이전
        </n-button>

        <n-button
          v-if="canCancel"
          size="medium"
          type="error"
          @click="handleCancelSchedule"
        >
          근무표 취소
        </n-button>

        <div class="flex flex-col gap-4 sm:flex-row">
          <n-button
            v-if="isPreRun"
            type="primary"
            size="medium"
            :loading="isStartingSolver"
            :disabled="isStartingSolver"
            @click="handleStartSolver"
          >
            근무표 생성 (AI)
          </n-button>

          <n-button
            v-if="isFinished && changedCells.size > 0"
            size="medium"
            @click="handleReset"
          >
            변경 사항 취소
          </n-button>

          <n-button
            v-if="isFinished"
            size="medium"
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
            type="primary"
            size="medium"
            @click="handleSave"
          >
            저장
          </n-button>
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
import { useScheduleGrid } from '@/composables/useScheduleGrid';
import { useScheduleStore } from '@/stores/schedule';
import { useOrganizationStore } from '@/stores/organization';
import {
  getScheduleStatus,
  getScheduleAssignments,
  getSchedulePreferences,
  refreshPreferenceResolution,
  resetPreferenceResolution,
  updateAssignment,
  deleteThisMonthAssignments,
  getPlanningEmployees,
  getPlanningAssignments,
} from '@/api/schedule';
import { loadSiteRequirements } from '@/api/employee';
import { mapToSolverRequest } from '@/utils/solverMapper';
import { exportToExcel } from '@/utils/excel';
import { showSuccess, showError, showInfo } from '@/utils/message';
import { supabase } from '@/api/supabase';
import type { AssignmentMap, ConstraintMap, CommentMap } from '@/types/schedule';

const route = useRoute();
const router = useRouter();
const solver = useAISolver();
const grid = useScheduleGrid();
const scheduleStore = useScheduleStore();
const organizationStore = useOrganizationStore();

const DB_REFRESH_INTERVAL_MS = 10000;
const MEMORY_TO_DB_GRACE_MS = 2000;
const WAITING_HINT_TICKS = 3;

const scheduleId = computed(() => route.params.id as string);
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
const lastMonthDays = ref(5);
const maxVisibleLastMonthDays = ref(0);
const hasInitializedLastMonthDays = ref(false);
const previousMonthAssignments = ref<AssignmentMap>({});
const currentScheduleAssignments = ref<AssignmentMap>({});
const offRequestsCurrentMonth = ref<ConstraintMap>({});
const offRequestNotesCurrentMonth = ref<CommentMap>({});

interface ScheduleStatusRow {
  status: 'created' | 'running' | 'complete' | 'changed' | 'error';
  hard_score: number | null;
  soft_score: number | null;
  solver_execution_id: string | null;
}

const isRunning = computed(() => solver.status.value === 'running');
const isFinished = computed(() => solver.status.value === 'complete' || solver.status.value === 'changed');
const isPreRun = computed(() => solver.status.value === 'created' || solver.status.value === 'error');
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
  return !isFinished.value;
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

  if (!currentMonth) {
    offRequestsCurrentMonth.value = emptyConstraints;
    offRequestNotesCurrentMonth.value = emptyNotes;
    return;
  }

  const { constraints, notes } = await getSchedulePreferences(scheduleId.value);

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
  solver.status.value = schedule.status;
  solver.hardScore.value = schedule.hard_score || 0;
  solver.softScore.value = schedule.soft_score || 0;
}

async function loadCurrentAssignments(options: { syncOriginal?: boolean; clearChanges?: boolean; forceAssignmentSync?: boolean } = {}) {
  const { syncOriginal = false, clearChanges = false, forceAssignmentSync = false } = options;
  const data = await getScheduleAssignments(scheduleId.value);
  const { currentAssignments, previousAssignments, previousDates } = splitAssignmentsByMonth(
    data.assignments
  );

  if (solver.status.value !== 'running') {
    previousMonthAssignments.value = previousAssignments;
    syncLastMonthDayWindow(previousDates);
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
  if (!basicInfo) {
    throw new Error('기본 정보가 없습니다. Step1부터 다시 진행해주세요.');
  }

  if (organizationStore.shifts.length === 0) {
    throw new Error('시프트 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
  }

  const { constraints } = await getSchedulePreferences(scheduleId.value);
  const planningEmployees = await getPlanningEmployees(basicInfo.organizationId);
  const planningAssignments = await getPlanningAssignments(scheduleId.value);

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
    planningAssignments
  );
}

async function handleStartSolver() {
  if (isStartingSolver.value || solver.status.value === 'running') {
    return;
  }

  isStartingSolver.value = true;

  try {
    await loadPreferencesForDisplay();
    await resetPreferenceResolution(scheduleId.value);

    const solverRequest = await buildSolverRequest();
    const executionId = await solver.startSolver(scheduleId.value, solverRequest);
    if (!executionId) {
      showError('근무표 생성 시작에 실패했습니다.');
      return;
    }

    resetRealtimeState();
    startAssignmentsRefresh();
    showSuccess('근무표 생성을 시작했습니다.');
  } catch (error) {
    console.warn('근무표 생성 시작 중 오류:', error);
    showError(error instanceof Error ? error.message : '근무표 생성 시작 중 오류가 발생했습니다.');
  } finally {
    isStartingSolver.value = false;
  }
}

async function resumePollingFromSchedule(schedule: ScheduleStatusRow) {
  if (!schedule.solver_execution_id) {
    showError('진행 중 작업 정보를 찾을 수 없습니다. 근무표 생성을 다시 시작해주세요.');
    solver.status.value = 'error';
    return;
  }

  solver.status.value = 'running';
  resetRealtimeState();
  solver.intermediateResults.value = null;
  solver.startPolling(schedule.solver_execution_id, scheduleId.value);
  startAssignmentsRefresh();
}

onMounted(async () => {
  if (!scheduleStore.basicInfo) {
    router.push('/schedule/step1');
    return;
  }

  try {
    await organizationStore.loadOrganization(scheduleStore.basicInfo.organizationId);
    await grid.loadEmployees(scheduleStore.basicInfo.organizationId);
    grid.generateDates(scheduleStore.basicInfo.month, 0);
    await loadPreferencesForDisplay();

    const schedule = (await getScheduleStatus(scheduleId.value)) as ScheduleStatusRow;
    applyScheduleStatus(schedule);

    if (schedule.status === 'complete' || schedule.status === 'changed') {
      await refreshPreferenceResolution(scheduleId.value);
    }

    await loadCurrentAssignments({
      syncOriginal: schedule.status !== 'running',
      clearChanges: schedule.status !== 'running',
    });

    if (schedule.status === 'running') {
      await resumePollingFromSchedule(schedule);
      return;
    }

    if (schedule.status === 'created' && schedule.solver_execution_id) {
      await resumePollingFromSchedule(schedule);
    }
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

watch(() => solver.status.value, async (newStatus) => {
  if (newStatus === 'running') {
    startAssignmentsRefresh();
  } else {
    stopAssignmentsRefresh();
  }

  if (newStatus === 'complete' || newStatus === 'changed' || newStatus === 'created' || newStatus === 'error') {
    try {
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

function handleBack() {
  router.push('/schedule/step4');
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
      showSuccess('변경사항이 취소되었습니다');
    },
  });
}

async function handleRegenerate() {
  await handleStartSolver();
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
  if (changedCells.value.size === 0) {
    showInfo('변경사항이 없습니다');
    router.push('/');
    return;
  }

  window.$dialog?.info({
    title: '근무표 저장',
    content: `${changedCells.value.size}개의 변경사항을 저장하시겠습니까?`,
    positiveText: '저장',
    negativeText: '취소',
    onPositiveClick: async () => {
      try {
        if (!scheduleId.value) {
          showError('스케줄 ID가 없습니다');
          return;
        }

        for (const cellKey of changedCells.value) {
          const [employeeId, date] = cellKey.split('_');

          if (!employeeId || !date) continue;

          const shiftCode = currentScheduleAssignments.value[employeeId]?.[date];

          if (!shiftCode) continue;

          const shift = organizationStore.shifts.find((s) => s.code === shiftCode);
          if (!shift) {
            console.warn(`Invalid shift code: ${shiftCode}`);
            continue;
          }

          await updateAssignment(scheduleId.value, employeeId, date, shift.id);
        }

        await supabase
          .from('schedules')
          .update({ status: 'changed' })
          .eq('id', scheduleId.value);

        await refreshPreferenceResolution(scheduleId.value);

        showSuccess('저장되었습니다');
        changedCells.value.clear();
        router.push('/');
      } catch (error) {
        console.warn('저장 중 오류:', error);
        showError('저장 중 오류가 발생했습니다');
      }
    },
  });
}

async function handleCancelSchedule() {
  window.$dialog?.warning({
    title: '이번달 근무표 취소',
    content: `이번달(${scheduleStore.basicInfo?.month}) 근무표를 삭제하고 다시 작성하시겠습니까?\n\n✓ 지난달 데이터는 보존됩니다\n✗ 이 작업은 되돌릴 수 없습니다`,
    positiveText: '삭제',
    negativeText: '취소',
    onPositiveClick: async () => {
      try {
        const currentMonth = scheduleStore.basicInfo?.month;
        if (!currentMonth) {
          showError('현재 월 정보를 찾을 수 없습니다');
          return;
        }

        await deleteThisMonthAssignments(scheduleId.value, currentMonth);

        solver.stopPolling();
        stopAssignmentsRefresh();

        currentScheduleAssignments.value = {};
        rebuildDisplayAssignments();

        const storageKeys = [
          `everyshift_temp_schedule_${currentMonth}`,
          `everyshift_temp_preferences_${currentMonth}`,
        ];
        storageKeys.forEach((key) => localStorage.removeItem(key));

        showSuccess('이번달 근무표가 삭제되었습니다. 지난달 데이터는 보존되었습니다.');
        router.push('/schedule/step4');
      } catch (error) {
        console.error('Delete schedule error:', error);
        showError('근무표 삭제 중 오류가 발생했습니다');
      }
    },
  });
}
</script>
