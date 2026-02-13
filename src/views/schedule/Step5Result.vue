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
            v-if="solver.status.value === 'running'"
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

      <div
        v-if="preferenceDisplayRows.length > 0"
        class="mb-6"
      >
        <h3 class="mb-2 text-sm font-semibold text-gray-700">근무 불가 요청 반영 현황</h3>
        <n-table
          :single-line="false"
          size="small"
        >
          <thead>
            <tr>
              <th>직원</th>
              <th>날짜</th>
              <th>근무 불가 요청</th>
              <th>상태</th>
              <th>최종 배정</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in preferenceDisplayRows"
              :key="row.id"
            >
              <td>{{ row.employeeName }}</td>
              <td>{{ row.date }}</td>
              <td>
                <n-tag size="small">
                  {{ row.requestCode }}
                </n-tag>
              </td>
              <td>
                <n-tag
                  size="small"
                  :type="getPreferenceStatusType(row.resolutionStatus)"
                >
                  {{ getPreferenceStatusText(row.resolutionStatus) }}
                </n-tag>
              </td>
              <td>{{ row.resolvedShiftCode }}</td>
            </tr>
          </tbody>
        </n-table>
      </div>

      <!-- 그리드 -->
      <div class="my-6">
        <ScheduleGrid
          v-if="grid.employees.value.length > 0"
          :employees="grid.employees.value"
          :dates="grid.dates.value"
          :assignments="grid.assignments.value"
          :readonly="isReadonlyGrid"
          :show-last-month="true"
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
            v-if="changedCells.size > 0"
            size="medium"
            @click="handleReset"
          >
            변경 사항 취소
          </n-button>
          <n-button
            size="medium"
            @click="handleRegenerate"
          >
            더 개선하기
          </n-button>
          <n-button
            size="medium"
            @click="handleExport"
          >
            엑셀 다운로드
          </n-button>
          <n-button
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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NCard, NButton, NBadge, NProgress, NAlert, NTable, NTag } from 'naive-ui';
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
  updateAssignment,
  deleteThisMonthAssignments,
} from '@/api/schedule';
import { exportToExcel } from '@/utils/excel';
import { showSuccess, showError, showInfo } from '@/utils/message';
import { supabase } from '@/api/supabase';
import type { AssignmentMap, PreferenceStatus, SchedulePreference } from '@/types/schedule';

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
const shouldAutostart = computed(() => route.query.autostart === '1');
const changedCells = ref<Set<string>>(new Set()); // 변경된 셀 추적
const originalAssignments = ref<AssignmentMap>({}); // 원본 데이터 백업
let assignmentRefreshInterval: number | null = null;
const isDbRefreshing = ref(false);
const lastMemoryAppliedAt = ref(0);
const lastMemoryHash = ref('');
const hasIntermediateResult = ref(false);
const runningTicksWithoutIntermediate = ref(0);
const warnedUnknownShiftIds = ref<Set<string>>(new Set());
const preferenceRows = ref<SchedulePreference[]>([]);

interface ScheduleStatusRow {
  status: 'created' | 'running' | 'complete' | 'changed' | 'error';
  hard_score: number | null;
  soft_score: number | null;
  solver_execution_id: string | null;
}

interface PreferenceDisplayRow {
  id: string;
  employeeName: string;
  date: string;
  requestCode: string;
  resolutionStatus: PreferenceStatus;
  resolvedShiftCode: string;
}

const statusText = computed(() => {
  const map: Record<string, string> = {
    running: '생성 중',
    complete: '완료',
    error: '오류',
    changed: '수정됨',
    created: '생성됨',
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
  return solver.status.value === 'running' || solver.status.value === 'created';
});

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

const knownShiftCodes = computed(() => {
  return new Set(organizationStore.shifts.map((shift) => shift.code));
});

const preferenceDisplayRows = computed<PreferenceDisplayRow[]>(() => {
  const employeeNameMap = new Map<string, string>(
    grid.employees.value.map((employee) => [employee.id, employee.name])
  );
  const shiftCodeMap = new Map<string, string>(
    organizationStore.shifts.map((shift) => [shift.id, shift.code])
  );

  return preferenceRows.value
    .map((row) => ({
      id: row.id,
      employeeName: employeeNameMap.get(row.employee_id) || row.employee_id,
      date: row.date,
      requestCode: row.request_code,
      resolutionStatus: row.resolution_status,
      resolvedShiftCode: row.resolved_shift_id ? (shiftCodeMap.get(row.resolved_shift_id) || '-') : '-',
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.employeeName.localeCompare(b.employeeName));
});

// Check if cancellation is possible
const canCancel = computed(() => {
  // Check 1: Status is complete or changed
  if (solver.status.value === 'complete' || solver.status.value === 'changed') {
    return true;
  }
  
  // Check 2: Has current month data (handles 'created' status bug)
  if (!scheduleStore.basicInfo?.month) return false;
  
  const currentMonth = scheduleStore.basicInfo.month; // e.g., "2024-12"
  
  for (const dateMap of Object.values(grid.assignments.value)) {
    for (const date of Object.keys(dateMap || {})) {
      if (date.startsWith(currentMonth)) {
        return true; // Found at least one current month assignment
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
  const nextAssignments: AssignmentMap = JSON.parse(JSON.stringify(grid.assignments.value || {}));
  let appliedCount = 0;

  for (const [employeeId, dateMap] of Object.entries(mappedAssignments)) {
    if (!nextAssignments[employeeId]) {
      nextAssignments[employeeId] = {};
    }

    for (const [date, shiftCode] of Object.entries(dateMap || {})) {
      if (!shiftCode) continue;
      nextAssignments[employeeId]![date] = shiftCode;
      appliedCount++;
    }
  }

  if (appliedCount > 0) {
    grid.assignments.value = nextAssignments;
    lastMemoryAppliedAt.value = Date.now();
  }

  return appliedCount;
}

function applyScheduleStatus(schedule: ScheduleStatusRow) {
  solver.status.value = schedule.status;
  solver.hardScore.value = schedule.hard_score || 0;
  solver.softScore.value = schedule.soft_score || 0;
}

async function loadAssignments(options: { syncOriginal?: boolean; clearChanges?: boolean; forceAssignmentSync?: boolean } = {}) {
  const { syncOriginal = false, clearChanges = false, forceAssignmentSync = false } = options;
  const data = await getScheduleAssignments(scheduleId.value);
  const hasDbAssignments = Object.values(data.assignments).some((dateMap) => {
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
    grid.assignments.value = data.assignments;
  }

  grid.offReasons.value = data.offReasons;

  if (syncOriginal) {
    originalAssignments.value = JSON.parse(JSON.stringify(data.assignments));
  }

  if (clearChanges) {
    changedCells.value.clear();
  }
}

async function loadPreferenceRows() {
  const data = await getSchedulePreferences(scheduleId.value);
  preferenceRows.value = data.preferences;
}

function getPreferenceStatusText(status: PreferenceStatus): string {
  if (status === 'fulfilled') return '반영됨';
  if (status === 'unfulfilled') return '미반영';
  return '대기';
}

function getPreferenceStatusType(status: PreferenceStatus): 'default' | 'success' | 'warning' {
  if (status === 'fulfilled') return 'success';
  if (status === 'unfulfilled') return 'warning';
  return 'default';
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
      await loadAssignments();
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

async function startSolverWithPendingRequest() {
  const pendingRequest = scheduleStore.pendingSolverRequest;
  const pendingScheduleId = scheduleStore.pendingSolverScheduleId;
  scheduleStore.clearPendingSolverRequest();
  await router.replace({ path: route.path, query: {} });

  if (!pendingRequest || pendingScheduleId !== scheduleId.value) {
    showError('생성 요청 정보를 찾을 수 없습니다. 초기 데이터 화면으로 이동합니다.');
    await router.push('/schedule/step4');
    return;
  }

  const executionId = await solver.startSolver(scheduleId.value, pendingRequest);
  if (!executionId) {
    showError('근무표 생성 시작에 실패했습니다.');
    return;
  }

  resetRealtimeState();
  startAssignmentsRefresh();
}

async function resumePollingFromSchedule(schedule: ScheduleStatusRow) {
  if (!schedule.solver_execution_id) {
    showError('진행 중 작업 정보를 찾을 수 없습니다. 초기 데이터 화면으로 이동합니다.');
    await router.push('/schedule/step4');
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
    grid.generateDates(scheduleStore.basicInfo.month);

    const schedule = (await getScheduleStatus(scheduleId.value)) as ScheduleStatusRow;
    applyScheduleStatus(schedule);

    if (schedule.status === 'complete' || schedule.status === 'changed') {
      await refreshPreferenceResolution(scheduleId.value);
    }

    if (schedule.status === 'complete' || schedule.status === 'changed' || schedule.status === 'running' || schedule.status === 'created') {
      await loadAssignments({
        syncOriginal: schedule.status !== 'running',
        clearChanges: schedule.status !== 'running',
      });
      await loadPreferenceRows();
    }

    if (shouldAutostart.value) {
      await startSolverWithPendingRequest();
      return;
    }

    if (schedule.status === 'running') {
      await resumePollingFromSchedule(schedule);
      return;
    }

    if (schedule.status === 'created') {
      if (schedule.solver_execution_id) {
        await resumePollingFromSchedule(schedule);
      } else {
        showInfo('아직 근무표 생성이 시작되지 않았습니다. 초기 데이터 화면으로 이동합니다.');
        await router.push('/schedule/step4');
      }
    }
  } catch (error) {
    console.warn('데이터 로드 중 오류:', error);
    window.$message?.error('데이터 로드 중 오류가 발생했습니다.');
  }
});

onUnmounted(() => {
  solver.stopPolling();
  stopAssignmentsRefresh();
  resetRealtimeState();
});

// status 변경 시 결과 재동기화 및 interval 정리
watch(() => solver.status.value, async (newStatus) => {
  if (newStatus === 'running') {
    startAssignmentsRefresh();
  } else {
    stopAssignmentsRefresh();
  }

  if (newStatus === 'complete' || newStatus === 'changed' || newStatus === 'created' || newStatus === 'error') {
    try {
      await loadAssignments({
        syncOriginal: true,
        clearChanges: true,
        forceAssignmentSync: true,
      });
      await loadPreferenceRows();
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
  router.push('/');
}

function handleAssignmentUpdate(payload: { employeeId: string; date: string; shiftCode: string }) {
  if (isReadonlyGrid.value) {
    return;
  }

  // 그리드 업데이트
  grid.setAssignment(payload.employeeId, payload.date, payload.shiftCode);

  // 변경된 셀 추적
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
      // 원본 데이터로 복원 (deep copy)
      grid.assignments.value = JSON.parse(JSON.stringify(originalAssignments.value));
      changedCells.value.clear();
      showSuccess('변경사항이 취소되었습니다');
    },
  });
}

function handleRegenerate() {
  // TODO
}

function handleExport() {
  if (grid.employees.value.length === 0) {
    window.$message?.error('데이터가 없습니다');
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
    window.$message?.success('엑셀 파일이 다운로드되었습니다');
  } catch (error) {
    window.$message?.error('다운로드 실패');
    console.warn('Excel export error:', error);
  }
}

function handleSave() {
  if (changedCells.value.size === 0) {
    showInfo('변경사항이 없습니다');
    // 대시보드로 이동
    router.push('/');
    return;
  }

  // 저장 확인 다이얼로그
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

        // 변경된 셀만 Supabase에 업데이트
        for (const cellKey of changedCells.value) {
          const [employeeId, date] = cellKey.split('_');
          
          if (!employeeId || !date) continue;
          
          const shiftCode = grid.assignments.value[employeeId]?.[date];

          if (!shiftCode) continue;

          // shiftCode를 shiftId로 변환
          const shift = organizationStore.shifts.find(s => s.code === shiftCode);
          if (!shift) {
            console.warn(`Invalid shift code: ${shiftCode}`);
            continue;
          }

          // API 호출
          await updateAssignment(scheduleId.value, employeeId, date, shift.id);
        }

        // Schedule status를 'changed'로 업데이트
        await supabase
          .from('schedules')
          .update({ status: 'changed' })
          .eq('id', scheduleId.value);

        await refreshPreferenceResolution(scheduleId.value);
        await loadPreferenceRows();

        showSuccess('저장되었습니다');
        changedCells.value.clear();
        // 대시보드로 이동
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
        
        // Clear localStorage for this month
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
