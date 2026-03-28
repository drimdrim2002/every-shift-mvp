<template>
  <n-card
    title="통계 요약"
    class="mt-4"
  >
    <n-grid
      cols="4"
      x-gap="12"
    >
      <n-gi>
        <n-statistic label="Day 근무">
          <template #suffix>
            일
          </template>
          {{ totalD }}
        </n-statistic>
      </n-gi>
      <n-gi>
        <n-statistic label="Evening 근무">
          <template #suffix>
            일
          </template>
          {{ totalE }}
        </n-statistic>
      </n-gi>
      <n-gi>
        <n-statistic label="Night 근무">
          <template #suffix>
            일
          </template>
          {{ totalN }}
        </n-statistic>
      </n-gi>
      <n-gi>
        <n-statistic label="평균 근무일">
          <template #suffix>
            일/인
          </template>
          {{ averageWorkDays.toFixed(1) }}
        </n-statistic>
      </n-gi>
    </n-grid>

    <n-alert
      v-if="violations.length > 0"
      type="warning"
      title="제약 조건 위반"
      class="mt-4"
    >
      <ul>
        <li
          v-for="v in violations"
          :key="v"
        >
          {{ v }}
        </li>
      </ul>
    </n-alert>
  </n-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ColumnStat, RowStat } from '@/types/schedule';

interface Props {
  rowStats: Record<string, RowStat>;
  columnStats: Record<string, ColumnStat>;
  employeeCount: number;
}

const props = defineProps<Props>();

const totalD = computed(() => {
  return Object.values(props.rowStats).reduce((sum, stat) => sum + stat.D, 0);
});

const totalE = computed(() => {
  return Object.values(props.rowStats).reduce((sum, stat) => sum + stat.E, 0);
});

const totalN = computed(() => {
  return Object.values(props.rowStats).reduce((sum, stat) => sum + stat.N, 0);
});

const totalWorkDays = computed(() => {
  return Object.values(props.rowStats).reduce((sum, stat) => sum + stat.total, 0);
});

const averageWorkDays = computed(() => {
  return props.employeeCount > 0 ? totalWorkDays.value / props.employeeCount : 0;
});

const violations = computed(() => {
  const v: string[] = [];

  // 제약 조건 체크 로직
  // 예: 일일 필요 인력 미달, 개인별 과도한 야간 근무 등
  // MVP에서는 기본 통계만 표시

  return v;
});
</script>
