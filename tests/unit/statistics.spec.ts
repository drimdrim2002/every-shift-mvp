import { describe, it, expect } from 'vitest'
import { useScheduleGridStatistics } from '@/composables/useScheduleGridStatistics'
import type { Employee } from '@/types/employee'
import type { GridColumn, AssignmentMap } from '@/types/schedule'

// Mock employee data
const mockEmployees: Employee[] = [
  {
    id: 'emp-1',
    organizationId: 'org-1',
    name: '김간호',
    employeeId: 'N001',
    availableShifts: ['D', 'E', 'N', 'O'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'emp-2',
    organizationId: 'org-1',
    name: '이간호',
    employeeId: 'N002',
    availableShifts: ['D', 'E', 'N', 'O'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'emp-3',
    organizationId: 'org-1',
    name: '박간호',
    employeeId: 'N003',
    availableShifts: ['D', 'N'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
]

// Mock dates (5 days)
const mockDates: GridColumn[] = [
  { date: '2024-01-01', day: 1, dayName: '월', isLastMonth: false },
  { date: '2024-01-02', day: 2, dayName: '화', isLastMonth: false },
  { date: '2024-01-03', day: 3, dayName: '수', isLastMonth: false },
  { date: '2024-01-04', day: 4, dayName: '목', isLastMonth: false },
  { date: '2024-01-05', day: 5, dayName: '금', isLastMonth: false },
]

describe('useScheduleGridStatistics', () => {
  describe('행 통계 (Row Statistics)', () => {
    it('직원별 시프트를 정확하게 계산', () => {
      const assignments: AssignmentMap = {
        'emp-1': {
          '2024-01-01': 'D',
          '2024-01-02': 'E',
          '2024-01-03': 'N',
          '2024-01-04': 'D',
          '2024-01-05': 'E',
        },
        'emp-2': {
          '2024-01-01': 'N',
          '2024-01-02': 'D',
          '2024-01-03': 'E',
          '2024-01-04': 'N',
          '2024-01-05': 'D',
        },
        'emp-3': {
          '2024-01-01': 'D',
          '2024-01-02': 'N',
          '2024-01-03': 'D',
          '2024-01-04': 'N',
          '2024-01-05': 'D',
        },
      }

      const statistics = useScheduleGridStatistics(
        () => mockEmployees,
        () => mockDates,
        () => assignments
      )

      // emp-1: D=2, E=2, N=1, total=5
      expect(statistics.value.rowStats['emp-1'].D).toBe(2)
      expect(statistics.value.rowStats['emp-1'].E).toBe(2)
      expect(statistics.value.rowStats['emp-1'].N).toBe(1)
      expect(statistics.value.rowStats['emp-1'].total).toBe(5)

      // emp-2: D=2, E=1, N=2, total=5
      expect(statistics.value.rowStats['emp-2'].D).toBe(2)
      expect(statistics.value.rowStats['emp-2'].E).toBe(1)
      expect(statistics.value.rowStats['emp-2'].N).toBe(2)
      expect(statistics.value.rowStats['emp-2'].total).toBe(5)

      // emp-3: D=3, E=0, N=2, total=5
      expect(statistics.value.rowStats['emp-3'].D).toBe(3)
      expect(statistics.value.rowStats['emp-3'].E).toBe(0)
      expect(statistics.value.rowStats['emp-3'].N).toBe(2)
      expect(statistics.value.rowStats['emp-3'].total).toBe(5)
    })

    it('O(휴무) 시프트는 total에 포함하지 않음', () => {
      const assignments: AssignmentMap = {
        'emp-1': {
          '2024-01-01': 'D',
          '2024-01-02': 'O', // 휴무
          '2024-01-03': 'E',
          '2024-01-04': 'O', // 휴무
          '2024-01-05': 'N',
        },
      }

      const statistics = useScheduleGridStatistics(
        () => mockEmployees,
        () => mockDates,
        () => assignments
      )

      // D=1, E=1, N=1, total=3 (O 2개는 제외)
      expect(statistics.value.rowStats['emp-1'].D).toBe(1)
      expect(statistics.value.rowStats['emp-1'].E).toBe(1)
      expect(statistics.value.rowStats['emp-1'].N).toBe(1)
      expect(statistics.value.rowStats['emp-1'].total).toBe(3)
    })

    it('빈 셀(undefined)이 있어도 정상 동작', () => {
      const assignments: AssignmentMap = {
        'emp-1': {
          '2024-01-01': 'D',
          // 2024-01-02: undefined (빈 셀)
          '2024-01-03': 'E',
          // 2024-01-04: undefined (빈 셀)
          '2024-01-05': 'N',
        },
      }

      const statistics = useScheduleGridStatistics(
        () => mockEmployees,
        () => mockDates,
        () => assignments
      )

      // D=1, E=1, N=1, total=3
      expect(statistics.value.rowStats['emp-1'].D).toBe(1)
      expect(statistics.value.rowStats['emp-1'].E).toBe(1)
      expect(statistics.value.rowStats['emp-1'].N).toBe(1)
      expect(statistics.value.rowStats['emp-1'].total).toBe(3)
    })

    it('그리드 외부 날짜는 계산하지 않음 (버그 수정 검증)', () => {
      const assignments: AssignmentMap = {
        'emp-1': {
          '2023-12-31': 'D', // 그리드 외부 날짜
          '2024-01-01': 'D',
          '2024-01-02': 'E',
          '2024-01-03': 'N',
          '2024-01-04': 'D',
          '2024-01-05': 'E',
          '2024-01-06': 'N', // 그리드 외부 날짜
        },
      }

      const statistics = useScheduleGridStatistics(
        () => mockEmployees,
        () => mockDates,
        () => assignments
      )

      // 그리드 내부만: D=2, E=2, N=1, total=5
      // (2023-12-31과 2024-01-06은 제외)
      expect(statistics.value.rowStats['emp-1'].D).toBe(2)
      expect(statistics.value.rowStats['emp-1'].E).toBe(2)
      expect(statistics.value.rowStats['emp-1'].N).toBe(1)
      expect(statistics.value.rowStats['emp-1'].total).toBe(5)
    })
  })

  describe('열 통계 (Column Statistics)', () => {
    it('날짜별 시프트를 정확하게 계산', () => {
      const assignments: AssignmentMap = {
        'emp-1': {
          '2024-01-01': 'D',
          '2024-01-02': 'E',
          '2024-01-03': 'N',
        },
        'emp-2': {
          '2024-01-01': 'D',
          '2024-01-02': 'D',
          '2024-01-03': 'E',
        },
        'emp-3': {
          '2024-01-01': 'N',
          '2024-01-02': 'N',
          '2024-01-03': 'D',
        },
      }

      const statistics = useScheduleGridStatistics(
        () => mockEmployees,
        () => mockDates,
        () => assignments
      )

      // 2024-01-01: D=2, E=0, N=1, total=3
      expect(statistics.value.columnStats['2024-01-01'].D).toBe(2)
      expect(statistics.value.columnStats['2024-01-01'].E).toBe(0)
      expect(statistics.value.columnStats['2024-01-01'].N).toBe(1)
      expect(statistics.value.columnStats['2024-01-01'].total).toBe(3)

      // 2024-01-02: D=1, E=1, N=1, total=3
      expect(statistics.value.columnStats['2024-01-02'].D).toBe(1)
      expect(statistics.value.columnStats['2024-01-02'].E).toBe(1)
      expect(statistics.value.columnStats['2024-01-02'].N).toBe(1)
      expect(statistics.value.columnStats['2024-01-02'].total).toBe(3)

      // 2024-01-03: D=1, E=1, N=1, total=3
      expect(statistics.value.columnStats['2024-01-03'].D).toBe(1)
      expect(statistics.value.columnStats['2024-01-03'].E).toBe(1)
      expect(statistics.value.columnStats['2024-01-03'].N).toBe(1)
      expect(statistics.value.columnStats['2024-01-03'].total).toBe(3)
    })

    it('O(휴무) 시프트는 total에 포함하지 않음', () => {
      const assignments: AssignmentMap = {
        'emp-1': {
          '2024-01-01': 'D',
        },
        'emp-2': {
          '2024-01-01': 'O', // 휴무
        },
        'emp-3': {
          '2024-01-01': 'E',
        },
      }

      const statistics = useScheduleGridStatistics(
        () => mockEmployees,
        () => mockDates,
        () => assignments
      )

      // D=1, E=1, N=0, total=2 (O는 제외)
      expect(statistics.value.columnStats['2024-01-01'].D).toBe(1)
      expect(statistics.value.columnStats['2024-01-01'].E).toBe(1)
      expect(statistics.value.columnStats['2024-01-01'].N).toBe(0)
      expect(statistics.value.columnStats['2024-01-01'].total).toBe(2)
    })

    it('빈 셀(undefined)이 있어도 정상 동작', () => {
      const assignments: AssignmentMap = {
        'emp-1': {
          '2024-01-01': 'D',
        },
        'emp-2': {
          // undefined (빈 셀)
        },
        'emp-3': {
          '2024-01-01': 'E',
        },
      }

      const statistics = useScheduleGridStatistics(
        () => mockEmployees,
        () => mockDates,
        () => assignments
      )

      // D=1, E=1, N=0, total=2
      expect(statistics.value.columnStats['2024-01-01'].D).toBe(1)
      expect(statistics.value.columnStats['2024-01-01'].E).toBe(1)
      expect(statistics.value.columnStats['2024-01-01'].N).toBe(0)
      expect(statistics.value.columnStats['2024-01-01'].total).toBe(2)
    })
  })

  describe('통계 일관성 검증', () => {
    it('행 통계와 열 통계의 total 합계가 일치', () => {
      const assignments: AssignmentMap = {
        'emp-1': {
          '2024-01-01': 'D',
          '2024-01-02': 'E',
          '2024-01-03': 'N',
        },
        'emp-2': {
          '2024-01-01': 'D',
          '2024-01-02': 'O',
          '2024-01-03': 'E',
        },
        'emp-3': {
          '2024-01-01': 'N',
          '2024-01-02': 'D',
          '2024-01-03': 'D',
        },
      }

      const statistics = useScheduleGridStatistics(
        () => mockEmployees,
        () => mockDates,
        () => assignments
      )

      // 행 통계 total 합계 계산
      const rowTotalSum = Object.values(statistics.value.rowStats).reduce(
        (sum, stat) => sum + stat.total,
        0
      )

      // 열 통계 total 합계 계산
      const columnTotalSum = Object.values(statistics.value.columnStats).reduce(
        (sum, stat) => sum + stat.total,
        0
      )

      // 행과 열의 total 합계는 동일해야 함
      expect(rowTotalSum).toBe(columnTotalSum)
      expect(rowTotalSum).toBe(8) // D=4, E=2, N=2 = 8 (O 1개 제외)
    })

    it('행 통계와 열 통계의 각 시프트 합계가 일치', () => {
      const assignments: AssignmentMap = {
        'emp-1': {
          '2024-01-01': 'D',
          '2024-01-02': 'E',
          '2024-01-03': 'N',
        },
        'emp-2': {
          '2024-01-01': 'D',
          '2024-01-02': 'D',
          '2024-01-03': 'E',
        },
        'emp-3': {
          '2024-01-01': 'N',
          '2024-01-02': 'N',
          '2024-01-03': 'D',
        },
      }

      const statistics = useScheduleGridStatistics(
        () => mockEmployees,
        () => mockDates,
        () => assignments
      )

      // 행 통계 D/E/N 합계
      const rowDSum = Object.values(statistics.value.rowStats).reduce((sum, stat) => sum + stat.D, 0)
      const rowESum = Object.values(statistics.value.rowStats).reduce((sum, stat) => sum + stat.E, 0)
      const rowNSum = Object.values(statistics.value.rowStats).reduce((sum, stat) => sum + stat.N, 0)

      // 열 통계 D/E/N 합계
      const columnDSum = Object.values(statistics.value.columnStats).reduce(
        (sum, stat) => sum + stat.D,
        0
      )
      const columnESum = Object.values(statistics.value.columnStats).reduce(
        (sum, stat) => sum + stat.E,
        0
      )
      const columnNSum = Object.values(statistics.value.columnStats).reduce(
        (sum, stat) => sum + stat.N,
        0
      )

      // 행과 열의 각 시프트 합계는 동일해야 함
      expect(rowDSum).toBe(columnDSum)
      expect(rowDSum).toBe(4)

      expect(rowESum).toBe(columnESum)
      expect(rowESum).toBe(2)

      expect(rowNSum).toBe(columnNSum)
      expect(rowNSum).toBe(3)
    })
  })

  describe('columnEmployees 분리 (pagination)', () => {
    it('planning mode: column stats use full roster, row stats use displayed employees only', () => {
      const displayedEmployees = [mockEmployees[0]];
      const fullRoster = mockEmployees.slice(0, 2);

      const assignments: AssignmentMap = {
        'emp-1': {
          '2024-01-01': 'O',
        },
        'emp-2': {
          '2024-01-01': 'O',
        },
      };

      const statistics = useScheduleGridStatistics(
        () => displayedEmployees,
        () => mockDates.slice(0, 1),
        () => assignments,
        () => 'planning',
        () => fullRoster,
      );

      expect(statistics.value.rowStats['emp-1'].total).toBe(1);
      expect(statistics.value.rowStats['emp-2']).toBeUndefined();
      expect(statistics.value.columnStats['2024-01-01'].total).toBe(2);
    });

    it('result mode: column stats use full roster, row stats use displayed employees only', () => {
      const displayedEmployees = [mockEmployees[0]];
      const fullRoster = mockEmployees.slice(0, 2);

      const assignments: AssignmentMap = {
        'emp-1': {
          '2024-01-01': 'D',
        },
        'emp-2': {
          '2024-01-01': 'E',
        },
      };

      const statistics = useScheduleGridStatistics(
        () => displayedEmployees,
        () => mockDates.slice(0, 1),
        () => assignments,
        () => 'result',
        () => fullRoster,
      );

      expect(statistics.value.rowStats['emp-1'].total).toBe(1);
      expect(statistics.value.rowStats['emp-2']).toBeUndefined();
      expect(statistics.value.columnStats['2024-01-01'].D).toBe(1);
      expect(statistics.value.columnStats['2024-01-01'].E).toBe(1);
      expect(statistics.value.columnStats['2024-01-01'].total).toBe(2);
    });
  })

  describe('rowStatisticsDates 분리 (week view)', () => {
    it('planning mode: row stats use rowStatisticsDates, column stats use visible dates only', () => {
      const displayedEmployees = [mockEmployees[0]];
      const visibleDates = mockDates.slice(0, 1); // one visible day
      const fullMonthDates = mockDates.slice(0, 2); // two days for row total

      const assignments: AssignmentMap = {
        'emp-1': {
          '2024-01-01': 'O',
          '2024-01-02': 'O',
        },
      };

      const statistics = useScheduleGridStatistics(
        () => displayedEmployees,
        () => visibleDates,
        () => assignments,
        () => 'planning',
        () => displayedEmployees,
        () => fullMonthDates,
      );

      expect(statistics.value.rowStats['emp-1'].total).toBe(2);
      expect(statistics.value.columnStats['2024-01-01'].total).toBe(1);
      expect(statistics.value.columnStats['2024-01-02']).toBeUndefined();
    });
  })
})
