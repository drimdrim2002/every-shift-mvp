<template>
  <div
    class="p-6"
    style="max-width: none !important; width: 100%"
  >
    <h1 class="mb-4 text-2xl font-bold">
      Step 3: 초기 데이터
    </h1>

    <!-- 로딩 상태 -->
    <div
      v-if="loading"
      class="flex items-center justify-center py-12"
    >
      <div class="text-gray-600">
        데이터를 불러오는 중...
      </div>
    </div>

    <!-- 그리드 컴포넌트 -->
    <div
      v-else
      class="mt-6"
    >
      <ScheduleGrid
        :employees="employees"
        :dates="dates"
        :assignments="assignments"
        :show-last-month="true"
        @update:assignment="handleAssignmentUpdate"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
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
  // 날짜 목록 생성 (전월 5일 + 당월)
  generateDates(PLANNING_MONTH);

  // 직원 목록 로드
  await loadEmployees(ORGANIZATION_ID);
});
</script>
