import { ref, watch } from 'vue';
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
  // 통계 데이터 (ref로 변경)
  const statistics = ref<GridStatistics>({
    rowStats: {},
    columnStats: {},
  });

  // 통계 계산 함수
  function calculateStatistics() {
    const rowStats: Record<string, RowStat> = {};
    const columnStats: Record<string, ColumnStat> = {};

    // 행 통계 (직원별)
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

      rowStats[emp.id] = stat;
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

    // 통계 업데이트
    statistics.value = {
      rowStats,
      columnStats,
    };
  }

  // assignments 변경 감지 및 실시간 통계 재계산
  watch(assignments, () => {
    calculateStatistics();
  }, { deep: true, immediate: true });

  return statistics;
}
