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
  assignments: () => AssignmentMap,
  mode: () => 'planning' | 'result' = () => 'result',
  columnEmployees: () => Employee[] = employees,
  rowStatisticsDates: () => GridColumn[] = dates,
) {
  // 통계 데이터 (computed로 최적화, 캐싱 적용)
  const statistics = computed<GridStatistics>(() => {
    const currentMode = mode();
    const rowCache = new Map<string, RowStat>();
    const rowStats: Record<string, RowStat> = {};
    const columnStats: Record<string, ColumnStat> = {};

    // 행 통계 (직원별) - 캐싱 적용
    employees().forEach((emp) => {
      const empAssignments = assignments()[emp.id] || {};
      const cacheKey = `${currentMode}:${JSON.stringify(empAssignments)}`;

      if (!rowCache.has(cacheKey)) {
        const stat: RowStat = { D: 0, E: 0, N: 0, total: 0 };

        // 버그 수정: 그리드에 표시된 날짜만 계산, 단 전월 데이터는 요약(row)에서 제외
        rowStatisticsDates().forEach((date) => {
          if (date.isLastMonth) return;

          const shiftCode = empAssignments[date.date];
          if (!shiftCode) return;

          if (currentMode === 'planning') {
            if (shiftCode === 'O') stat.total++;
            return;
          }

          // 빈 셀 및 O(휴무) 처리
          if (shiftCode === 'O') return;

          if (shiftCode === 'D') stat.D++;
          else if (shiftCode === 'E') stat.E++;
          else if (shiftCode === 'N') stat.N++;

          stat.total++;
        });
        rowCache.set(cacheKey, stat);
      }

      rowStats[emp.id] = rowCache.get(cacheKey)!;
    });

    // 열 통계 (날짜별)
    dates().forEach((date) => {
      const stat: ColumnStat = { D: 0, E: 0, N: 0, total: 0 };

      columnEmployees().forEach((emp) => {
        const shiftCode = assignments()[emp.id]?.[date.date];

        if (currentMode === 'planning') {
          if (shiftCode === 'O') stat.total++;
          return;
        }

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
