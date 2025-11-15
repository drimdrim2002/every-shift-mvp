<template>
  <div class="schedule-grid-container overflow-x-auto">
    <table class="schedule-grid w-full border-collapse">
      <!-- 3-level 헤더 -->
      <thead>
        <!-- Level 1: Last Month / This Month -->
        <tr>
          <th
            rowspan="3"
            class="sticky-column header-cell border border-gray-300 bg-white px-4 py-3 font-semibold"
          >
            근무자
          </th>
          <th
            v-for="group in headerLevel1"
            :key="group.label"
            :colspan="group.count"
            class="header-level-1 border border-gray-300 bg-gray-100 px-4 py-2 text-center font-semibold"
          >
            {{ group.label }}
          </th>
          <th
            rowspan="3"
            colspan="4"
            class="header-stats border border-gray-300 bg-white px-4 py-3 text-center font-semibold"
          >
            통계
          </th>
        </tr>

        <!-- Level 2: 월 이름 -->
        <tr>
          <th
            v-for="group in headerLevel2"
            :key="group.label"
            :colspan="group.count"
            class="header-level-2 border border-gray-300 bg-gray-50 px-4 py-2 text-center font-medium"
          >
            {{ group.label }}
          </th>
        </tr>

        <!-- Level 3: 날짜 + 요일 -->
        <tr>
          <th
            v-for="date in dates"
            :key="date.date"
            class="header-level-3 border border-gray-300 bg-gray-50 px-2 py-1 text-center text-sm"
          >
            {{ date.day }}일<br>
            <span class="text-xs text-gray-600">({{ date.dayName }})</span>
          </th>
        </tr>
      </thead>

      <!-- 데이터 행 -->
      <tbody>
        <tr
          v-for="employee in employees"
          :key="employee.id"
          class="data-row"
        >
          <td class="sticky-column employee-cell">
            <div class="font-semibold">
              {{ employee.name }}
            </div>
            <div class="text-xs text-gray-500">
              {{ employee.employeeId }}
            </div>
          </td>

          <td
            v-for="date in dates"
            :key="date.date"
            :class="getCellClass(date)"
          >
            <!-- ShiftSelector는 다음 작업에서 추가 -->
            <div class="text-center">
              -
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Employee } from '@/types/employee';
import type { GridColumn, AssignmentMap } from '@/types/schedule';

interface Props {
  employees: Employee[];
  dates: GridColumn[];
  assignments: AssignmentMap;
  readonly?: boolean;
  showLastMonth?: boolean;
}

interface Emits {
  (e: 'update:assignment', payload: {
    employeeId: string;
    date: string;
    shiftCode: string;
  }): void;
}

const props = defineProps<Props>();
defineEmits<Emits>();

// Level 1 헤더: 전월/당월 그룹
const headerLevel1 = computed(() => {
  const lastMonthCount = props.dates.filter(d => d.isLastMonth).length;
  const thisMonthCount = props.dates.filter(d => !d.isLastMonth).length;

  const groups = [];
  if (props.showLastMonth && lastMonthCount > 0) {
    groups.push({ label: '전월', count: lastMonthCount });
  }
  groups.push({ label: '당월', count: thisMonthCount });

  return groups;
});

// Level 2 헤더: 월 이름 그룹
const headerLevel2 = computed(() => {
  const groups: Array<{ label: string; count: number }> = [];
  let currentMonth = '';
  let count = 0;

  props.dates.forEach((date, index) => {
    const month = date.date.substring(5, 7) + '월';

    if (month !== currentMonth) {
      if (count > 0) {
        groups.push({ label: currentMonth, count });
      }
      currentMonth = month;
      count = 1;
    } else {
      count++;
    }

    if (index === props.dates.length - 1) {
      groups.push({ label: currentMonth, count });
    }
  });

  return groups;
});

function getCellClass(date: GridColumn) {
  return {
    'bg-gray-50': date.isLastMonth,
    'bg-white': !date.isLastMonth,
    'border border-gray-300': true,
  };
}
</script>

<style scoped>
.schedule-grid-container {
  max-height: 70vh;
  position: relative;
}

.schedule-grid {
  font-size: 14px;
}

.sticky-column {
  position: sticky;
  left: 0;
  z-index: 20;
  background: white;
  border-right: 2px solid #e5e7eb;
}

.employee-cell {
  padding: 12px;
  min-width: 150px;
}

/* 헤더 스타일 */
thead th {
  font-weight: 600;
}

.header-cell {
  min-width: 150px;
}

.header-stats {
  min-width: 200px;
}

.header-level-1,
.header-level-2,
.header-level-3 {
  white-space: nowrap;
}
</style>
