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
  // 통계 데이터 (computed로 최적화, 캐싱 적용)
  const statistics = computed<GridStatistics>(() => {
    const rowCache = new Map<string, RowStat>();
    const rowStats: Record<string, RowStat> = {};
    const columnStats: Record<string, ColumnStat> = {};

    // 행 통계 (직원별) - 캐싱 적용
    employees().forEach((emp) => {
      const empAssignments = assignments()[emp.id] || {};
      const cacheKey = JSON.stringify(empAssignments);

      if (!rowCache.has(cacheKey)) {
        const stat: RowStat = { D: 0, E: 0, N: 0, total: 0 };
        Object.values(empAssignments).forEach((shiftCode) => {
          if (shiftCode === 'D') stat.D++;
          else if (shiftCode === 'E') stat.E++;
          else if (shiftCode === 'N') stat.N++;

          // Total: O(휴무)를 제외한 근무일 수
          if (shiftCode !== 'O') stat.total++;
        });
        rowCache.set(cacheKey, stat);
      }

      rowStats[emp.id] = rowCache.get(cacheKey)!;
    });

    // 열 통계 (날짜별)
    dates().forEach((date) => {
      const stat: ColumnStat = { D: 0, E: 0, N: 0, total: 0 };

      employees().forEach((emp) => {
        const shiftCode = assignments()[emp.id]?.[date.date];
        if (shiftCode === 'D') stat.D++;
        else if (shiftCode === 'E') stat.E++;
        else if (shiftCode === 'N') stat.N++;

        if (shiftCode && shiftCode !== 'O') stat.total++;
      });

      columnStats[date.date] = stat;
    });

    return {
      rowStats,
      columnStats,
    };
  });

  return statistics;
}
