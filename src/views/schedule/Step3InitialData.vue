<template>
  <div class="mx-auto max-w-full px-4">
    <StepIndicator :current-step="3" />

    <n-card title="근무표 생성 - 초기 정보 입력">
      <n-alert
        type="warning"
        class="mb-4"
      >
        <strong>전월 마지막 5일 데이터는 반드시 입력해야 합니다.</strong>
        당월 데이터는 비워두면 AI가 자동으로 배치합니다.
      </n-alert>

      <!-- 그리드 -->
      <n-spin :show="grid.loading.value">
        <ScheduleGrid
          v-if="grid.employees.value.length > 0"
          :employees="grid.employees.value"
          :dates="grid.dates.value"
          :assignments="grid.assignments.value"
          :readonly="false"
          :show-last-month="true"
          @update:assignment="handleAssignmentUpdate"
        />
      </n-spin>

      <!-- 버튼 -->
      <div class="flex justify-between pt-4">
        <n-button @click="handlePrev">
          ← 이전
        </n-button>
        <div class="flex gap-2">
          <n-button @click="handleSave">
            임시 저장
          </n-button>
          <n-button
            type="primary"
            @click="handleGenerate"
          >
            근무표 생성 →
          </n-button>
        </div>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { NCard, NButton, NAlert, NSpin } from 'naive-ui';
import StepIndicator from '@/components/schedule/StepIndicator.vue';
import ScheduleGrid from '@/components/schedule/ScheduleGrid.vue';
import { useScheduleStore } from '@/stores/schedule';
import { useScheduleGrid } from '@/composables/useScheduleGrid';
import { showSuccess, showInfo } from '@/utils/message';

const router = useRouter();
const scheduleStore = useScheduleStore();
const grid = useScheduleGrid();

onMounted(async () => {
  if (!scheduleStore.basicInfo) {
    router.push('/schedule/step1');
    return;
  }

  // 직원 로드
  await grid.loadEmployees(scheduleStore.basicInfo.organizationId);

  // 날짜 생성 (전월 5일 + 당월)
  grid.generateDates(scheduleStore.basicInfo.month);

  // 기존 assignments 복원 (있다면)
  if (Object.keys(scheduleStore.assignments).length > 0) {
    grid.assignments.value = scheduleStore.assignments;
  }
});

function handleAssignmentUpdate(payload: {
  employeeId: string;
  date: string;
  shiftCode: string;
}) {
  grid.setAssignment(payload.employeeId, payload.date, payload.shiftCode);
}

function handlePrev() {
  // 현재 상태 저장
  scheduleStore.setAssignments(grid.assignments.value);
  scheduleStore.prevStep();
  router.push('/schedule/step2');
}

function handleSave() {
  scheduleStore.setAssignments(grid.assignments.value);
  showSuccess('임시 저장되었습니다');
}

function handleGenerate() {
  // TODO: 검증 로직 (다음 작업에서 구현)
  showInfo('검증 기능은 다음 작업에서 구현됩니다');
}
</script>
