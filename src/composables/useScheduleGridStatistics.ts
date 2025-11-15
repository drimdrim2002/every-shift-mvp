import { computed } from 'vue';
import type {
  AssignmentMap,
  GridColumn,
  GridStatistics,
  RowStat,
  ColumnStat,
} from '@/types/schedule';
import type { Employee } from '@/types/employee';

export function useScheduleGridStatistics(
  employees: () => Employee[],
  dates: () => GridColumn[],
  assignments: () => AssignmentMap
) {
  // 행 통계 (직원별)
  const rowStats = computed(() => {
    const stats: Record<string, RowStat> = {};

    employees().forEach((emp) => {
      const stat: RowStat = { D: 0, E: 0, N: 0, total: 0 };

      const empAssignments = assignments()[emp.id] || {};
      Object.values(empAssignments).forEach((shiftCode) => {
        if (shiftCode === 'D') stat.D++;
        else if (shiftCode === 'E') stat.E++;
        else if (shiftCode === 'N') stat.N++;

        // Total: O(휴무)를 제외한 근무일 수
        if (shiftCode !== 'O') stat.total++;
      });

      stats[emp.id] = stat;
    });

    return stats;
  });

  // 열 통계 (날짜별)
  const columnStats = computed(() => {
    const stats: Record<string, ColumnStat> = {};

    dates().forEach((date) => {
      const stat: ColumnStat = { D: 0, E: 0, N: 0, total: 0 };

      employees().forEach((emp) => {
        const shiftCode = assignments()[emp.id]?.[date.date];
        if (shiftCode === 'D') stat.D++;
        else if (shiftCode === 'E') stat.E++;
        else if (shiftCode === 'N') stat.N++;

        if (shiftCode && shiftCode !== 'O') stat.total++;
      });

      stats[date.date] = stat;
    });

    return stats;
  });

  const statistics = computed<GridStatistics>(() => ({
    rowStats: rowStats.value,
    columnStats: columnStats.value,
  }));

  return statistics;
}
