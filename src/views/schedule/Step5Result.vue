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
          :employees="grid.employees.value"
          :dates="grid.dates.value"
          :assignments="grid.assignments.value"
          :readonly="false"
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
import { NCard, NButton, NBadge, NProgress, NAlert } from 'naive-ui';
import StepIndicator from '@/components/schedule/StepIndicator.vue';
import ScheduleGrid from '@/components/schedule/ScheduleGrid.vue';
import { useAISolver } from '@/composables/useAISolver';
import { useScheduleGrid } from '@/composables/useScheduleGrid';
import { useScheduleStore } from '@/stores/schedule';
import { useOrganizationStore } from '@/stores/organization';
import { getScheduleStatus, getScheduleAssignments, updateAssignment } from '@/api/schedule';
import { exportToExcel } from '@/utils/excel';
import { showSuccess, showError, showInfo } from '@/utils/message';
import { supabase } from '@/api/supabase';
import type { AssignmentMap } from '@/types/schedule';

const route = useRoute();
const router = useRouter();
const solver = useAISolver();
const grid = useScheduleGrid();
const scheduleStore = useScheduleStore();
const organizationStore = useOrganizationStore();

const scheduleId = computed(() => route.params.id as string);
const changedCells = ref<Set<string>>(new Set()); // 변경된 셀 추적
const originalAssignments = ref<AssignmentMap>({}); // 원본 데이터 백업

const statusText = computed(() => {
  const map: Record<string, string> = {
    running: '생성 중',
    complete: '완료',
    error: '오류',
    changed: '수정됨',
  };
  return map[solver.status.value] || '알 수 없음';
});

const statusType = computed(() => {
  const map: Record<string, 'info' | 'success' | 'error' | 'warning' | 'default'> = {
    running: 'info',
    complete: 'success',
    error: 'error',
    changed: 'warning',
  };
  return map[solver.status.value] || 'default';
});

onMounted(async () => {
  // 기본 정보 체크
  if (!scheduleStore.basicInfo) {
    router.push('/schedule/step1');
    return;
  }

  try {
    // 조직 데이터 로드 (shifts 포함)
    await organizationStore.loadOrganization(scheduleStore.basicInfo.organizationId);

    // 직원 로드
    await grid.loadEmployees(scheduleStore.basicInfo.organizationId);

    // 날짜 생성
    grid.generateDates(scheduleStore.basicInfo.month);

    // 근무표 상태 조회
    const schedule = await getScheduleStatus(scheduleId.value);
    solver.status.value = schedule.status;
    solver.hardScore.value = schedule.hard_score || 0;
    solver.softScore.value = schedule.soft_score || 0;

    // 결과 로드
    if (schedule.status === 'complete' || schedule.status === 'changed') {
      const assignments = await getScheduleAssignments(scheduleId.value);
      grid.assignments.value = assignments;
      // 원본 데이터 백업 (deep copy)
      originalAssignments.value = JSON.parse(JSON.stringify(assignments));

      // 디버깅: 로드된 데이터 확인
      console.log('[Step4] Loaded employees count:', grid.employees.value.length);
      console.log('[Step4] Loaded assignments keys count:', Object.keys(assignments).length);
      console.log('[Step4] Last 3 employees:', grid.employees.value.slice(-3).map(e => ({ id: e.id, name: e.name })));
      console.log('[Step4] Last 3 assignment keys:', Object.keys(assignments).slice(-3));
    } else if (schedule.status === 'running') {
      // Polling 시작
      solver.startPolling(scheduleId.value);
    }
  } catch (error) {
    console.warn('데이터 로드 중 오류:', error);
    window.$message?.error('데이터 로드 중 오류가 발생했습니다.');
  }
});

onUnmounted(() => {
  solver.stopPolling();
});

// status가 complete로 변경되면 assignments 로드
watch(() => solver.status.value, async (newStatus) => {
  if (newStatus === 'complete' || newStatus === 'changed') {
    try {
      const assignments = await getScheduleAssignments(scheduleId.value);
      grid.assignments.value = assignments;
      // 원본 데이터 백업 (deep copy)
      originalAssignments.value = JSON.parse(JSON.stringify(assignments));
      // 변경 사항 초기화
      changedCells.value.clear();

      // 디버깅: 로드된 데이터 확인
      console.log('[Step4 Watch] Assignments keys count:', Object.keys(assignments).length);
    } catch (error) {
      console.warn('Assignments 로드 중 오류:', error);
    }
  }
});

function handleBack() {
  router.push('/');
}

function handleAssignmentUpdate(payload: { employeeId: string; date: string; shiftCode: string }) {
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
</script>
