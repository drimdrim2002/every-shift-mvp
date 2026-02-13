<template>
  <div class="flex h-full w-80 flex-col border-l border-gray-200 bg-white">
    <div class="border-b border-gray-100 p-4">
      <h3 class="text-lg font-bold text-gray-800">
        요약
      </h3>
      <p class="text-xs text-gray-500">
        실시간 근무 통계
      </p>
    </div>

    <div class="flex-1 space-y-6 overflow-y-auto p-4">
      <!-- Employee Stats -->
      <div>
        <h4 class="mb-3 flex items-center gap-2 font-semibold text-gray-700">
          <span class="i-carbon-user text-gray-400" />
          직원별 근무 횟수
        </h4>
        <div class="space-y-2">
          <div
            v-for="(stat, empId) in stats.rowStats"
            :key="empId"
            class="flex items-center justify-between rounded bg-gray-50 p-2 text-sm transition-colors hover:bg-gray-100"
          >
            <span class="w-24 truncate font-medium text-gray-700">{{ getEmployeeName(empId) }}</span>
            <div class="flex gap-3 text-xs">
              <span class="font-medium text-orange-600">D:{{ stat.D }}</span>
              <span class="font-medium text-indigo-600">E:{{ stat.E }}</span>
              <span class="font-medium text-slate-800">N:{{ stat.N }}</span>
              <span class="ml-1 font-bold text-gray-900">T:{{ stat.total }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Daily Stats Summary (Optional/Expandable) -->
      <!-- This part can be expanded later if needed -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { GridStatistics } from '@/types/schedule';
import type { Employee } from '@/types/employee';

const props = defineProps<{
  stats: GridStatistics;
  employees: Employee[];
}>();

const employeeMap = computed(() => {
  const map: Record<string, string> = {};
  props.employees.forEach(emp => {
    map[emp.id] = emp.name;
  });
  return map;
});

function getEmployeeName(id: string) {
  return employeeMap.value[id] || 'Unknown';
}
</script>
