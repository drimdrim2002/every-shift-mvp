<template>
  <div class="min-h-screen bg-gray-100 p-6">
    <div class="mx-auto max-w-7xl">
      <div class="mb-6 rounded-lg bg-white p-6 shadow">
        <h1 class="mb-2 text-3xl font-bold text-gray-900">
          ScheduleGrid 컴포넌트 테스트
        </h1>
        <p class="text-gray-600">
          30명 × 36일 (전월 5일 + 당월 31일) 그리드 - 2025년 12월 기준
        </p>
      </div>

      <!-- 로딩 상태 -->
      <div
        v-if="loading"
        class="flex items-center justify-center rounded-lg bg-white p-12 shadow"
      >
        <div class="text-center">
          <div class="mb-4 text-lg font-medium text-gray-700">
            데이터를 불러오는 중...
          </div>
          <div class="text-sm text-gray-500">
            직원 정보와 날짜 데이터를 로드하고 있습니다.
          </div>
        </div>
      </div>

      <!-- 에러 상태 -->
      <div
        v-else-if="error"
        class="rounded-lg bg-red-50 p-6 shadow"
      >
        <h2 class="mb-2 text-lg font-semibold text-red-800">
          데이터 로드 오류
        </h2>
        <p class="text-red-600">
          {{ error }}
        </p>
        <p class="mt-4 text-sm text-red-500">
          Supabase 연결 및 시드 데이터를 확인해주세요.
        </p>
      </div>

      <!-- 그리드 컴포넌트 -->
      <div
        v-else
        class="rounded-lg bg-white p-6 shadow"
      >
        <div class="mb-4 flex items-center justify-between">
          <div class="text-sm text-gray-600">
            <span class="font-medium">직원:</span> {{ employees.length }}명 |
            <span class="font-medium">날짜:</span> {{ dates.length }}일 |
            <span class="font-medium">총 셀:</span> {{ employees.length * dates.length }}개
          </div>
          <div class="text-xs text-gray-500">
            Organization ID: {{ ORGANIZATION_ID.substring(0, 8) }}...
          </div>
        </div>

        <ScheduleGrid
          :employees="employees"
          :dates="dates"
          :assignments="assignments"
          :show-last-month="true"
          @update:assignment="handleAssignmentUpdate"
        />

        <div class="mt-4 rounded border border-gray-200 bg-gray-50 p-4">
          <h3 class="mb-2 text-sm font-semibold text-gray-700">
            범례
          </h3>
          <div class="flex gap-4 text-xs text-gray-600">
            <div class="flex items-center gap-2">
              <div class="size-4 border border-gray-300 bg-gray-50" />
              <span>전월 (5일)</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="size-4 border border-gray-300 bg-white" />
              <span>당월 (31일)</span>
            </div>
            <div class="ml-auto text-gray-500">
              * ShiftSelector는 다음 작업에서 추가됩니다
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import ScheduleGrid from '@/components/schedule/ScheduleGrid.vue';
import { useScheduleGrid } from '@/composables/useScheduleGrid';

// Fixed organization ID for MVP (seed data)
const ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001';
const PLANNING_MONTH = '2025-12';

const {
  employees,
  assignments,
  dates,
  loading,
  loadEmployees,
  generateDates,
  setAssignment,
} = useScheduleGrid();

const error = ref<string | null>(null);

// 배정 업데이트 핸들러
function handleAssignmentUpdate(payload: {
  employeeId: string;
  date: string;
  shiftCode: string;
}) {
  setAssignment(payload.employeeId, payload.date, payload.shiftCode);
}

// 초기 데이터 로드
onMounted(async () => {
  try {
    // 날짜 목록 생성 (전월 5일 + 당월)
    generateDates(PLANNING_MONTH);

    // 직원 목록 로드
    const result = await loadEmployees(ORGANIZATION_ID);
    if (!result.success) {
      error.value = result.error || '직원 데이터를 불러오는데 실패했습니다.';
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
  }
});
</script>
