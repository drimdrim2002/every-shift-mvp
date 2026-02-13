<template>
  <div class="h-full flex flex-col bg-white border-l border-gray-200 w-80">
    <div class="p-4 border-b border-gray-100">
      <h3 class="font-bold text-gray-800 text-lg">요약</h3>
      <p class="text-xs text-gray-500">실시간 근무 통계</p>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-6">
      <!-- Employee Stats -->
      <div>
        <h4 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span class="i-carbon-user text-gray-400"></span>
          직원별 근무 횟수
        </h4>
        <div class="space-y-2">
           <div v-for="(stat, empId) in stats.rowStats" :key="empId" class="flex items-center justify-between text-sm p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
            <span class="font-medium text-gray-700 truncate w-24">{{ getEmployeeName(empId) }}</span>
            <div class="flex gap-3 text-xs">
              <span class="text-orange-600 font-medium">D:{{ stat.D }}</span>
              <span class="text-indigo-600 font-medium">E:{{ stat.E }}</span>
              <span class="text-slate-800 font-medium">N:{{ stat.N }}</span>
              <span class="text-gray-900 font-bold ml-1">T:{{ stat.total }}</span>
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
