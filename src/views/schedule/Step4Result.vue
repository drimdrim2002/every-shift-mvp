<template>
  <div class="mx-auto max-w-full px-4">
    <StepIndicator :current-step="4" />

    <n-card title="근무표 생성 - 결과 확인">
      <!-- 상태 표시 -->
      <div class="mb-4 flex items-center justify-between rounded bg-gray-50 p-4">
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

      <!-- 그리드 -->
      <div class="my-4">
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
      <div class="flex justify-between pt-4">
        <n-button @click="handleBack">
          ← 이전
        </n-button>
        <div class="flex gap-2">
          <n-button @click="handleRegenerate">
            더 개선하기
          </n-button>
          <n-button @click="handleExport">
            엑셀 다운로드
          </n-button>
          <n-button
            type="primary"
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
import { computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NCard, NButton, NBadge, NProgress } from 'naive-ui';
import StepIndicator from '@/components/schedule/StepIndicator.vue';
import ScheduleGrid from '@/components/schedule/ScheduleGrid.vue';
import { useAISolver } from '@/composables/useAISolver';
import { useScheduleGrid } from '@/composables/useScheduleGrid';
import { useScheduleStore } from '@/stores/schedule';
import { useOrganizationStore } from '@/stores/organization';
import { getScheduleStatus, getScheduleAssignments, updateAssignment } from '@/api/schedule';
import { exportToExcel } from '@/utils/excel';

const route = useRoute();
const router = useRouter();
const solver = useAISolver();
const grid = useScheduleGrid();
const scheduleStore = useScheduleStore();
const organizationStore = useOrganizationStore();

const scheduleId = computed(() => route.params.id as string);

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

function handleBack() {
  router.push('/schedule/step3');
}

async function handleAssignmentUpdate(payload: { employeeId: string; date: string; shiftCode: string }) {
  try {
    // shiftCode를 shiftId로 변환
    const shift = organizationStore.shifts.find(s => s.code === payload.shiftCode);
    if (!shift) {
      window.$message?.error('잘못된 근무 유형입니다.');
      return;
    }

    // 그리드 업데이트
    grid.setAssignment(payload.employeeId, payload.date, payload.shiftCode);

    // API 호출
    await updateAssignment(scheduleId.value, payload.employeeId, payload.date, shift.id);

    // 상태 업데이트
    solver.status.value = 'changed';
  } catch (error) {
    console.warn('근무 배정 업데이트 중 오류:', error);
    window.$message?.error('근무 배정 업데이트 중 오류가 발생했습니다.');
  }
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
  // TODO
}
</script>
