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
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { watchDebounced } from '@vueuse/core';
import { NCard, NButton, NAlert, NSpin } from 'naive-ui';
import StepIndicator from '@/components/schedule/StepIndicator.vue';
import ScheduleGrid from '@/components/schedule/ScheduleGrid.vue';
import { useScheduleStore } from '@/stores/schedule';
import { useScheduleGrid } from '@/composables/useScheduleGrid';
import { showSuccess, showInfo, showError } from '@/utils/message';
import { validateLastMonthData } from '@/utils/validation';

const router = useRouter();
const scheduleStore = useScheduleStore();
const grid = useScheduleGrid();

// LocalStorage 키 (월별로 구분)
const STORAGE_KEY = computed(() => {
  if (!scheduleStore.basicInfo) return '';
  return `everyshift_temp_schedule_${scheduleStore.basicInfo.month}`;
});

// 자동 저장 (2초 debounce)
watchDebounced(
  () => grid.assignments.value,
  (newVal) => {
    if (STORAGE_KEY.value) {
      localStorage.setItem(STORAGE_KEY.value, JSON.stringify(newVal));
    }
  },
  { debounce: 2000, deep: true }
);

onMounted(async () => {
  if (!scheduleStore.basicInfo) {
    router.push('/schedule/step1');
    return;
  }

  // 직원 로드
  await grid.loadEmployees(scheduleStore.basicInfo.organizationId);

  // 날짜 생성 (전월 5일 + 당월)
  grid.generateDates(scheduleStore.basicInfo.month);

  // LocalStorage에서 복원
  if (STORAGE_KEY.value) {
    const saved = localStorage.getItem(STORAGE_KEY.value);
    if (saved) {
      try {
        grid.assignments.value = JSON.parse(saved);
        showInfo('이전 작업이 복원되었습니다');
      } catch (e) {
        console.warn('Failed to restore from localStorage:', e);
      }
    }
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
  // 1. 전월 데이터 검증
  const validation = validateLastMonthData(
    grid.employees.value,
    grid.dates.value,
    grid.assignments.value
  );

  if (!validation.isValid) {
    // 에러 메시지 표시
    showError('전월 데이터를 모두 입력해주세요');

    // 상세 에러 다이얼로그
    const errorList = validation.errors.join('\n');
    window.$dialog?.error({
      title: '전월 데이터 미입력',
      content: errorList,
      positiveText: '확인',
    });
    return;
  }

  // 2. 검증 통과 시 저장 및 다음 단계
  scheduleStore.setAssignments(grid.assignments.value);

  // LocalStorage 삭제 (임시 저장 불필요)
  if (STORAGE_KEY.value) {
    localStorage.removeItem(STORAGE_KEY.value);
  }

  // TODO: AI Solver 호출 (다음 작업에서 구현)
  showInfo('검증 완료! AI 생성은 다음 작업에서 구현됩니다');
  scheduleStore.nextStep();
  // router.push(`/schedule/step4/${scheduleId}`);
}
</script>
