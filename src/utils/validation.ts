import type { AssignmentMap, GridColumn } from '@/types/schedule';
import type { Employee } from '@/types/employee';

/**
 * 유효한 근무 코드 검증
 * @param code - 근무 코드 (D, E, N, O, H 등)
 * @returns 유효 여부
 */
export function isValidShiftCode(code: string): boolean {
  const validCodes = ['D', 'E', 'N', 'O', 'H'];
  return validCodes.includes(code);
}

/**
 * 전월 마지막 5일 데이터 입력 확인
 * @param employees - 직원 목록
 * @param dates - 전체 날짜 목록 (GridColumn 배열)
 * @param assignments - 배정 맵 (employeeId -> date -> shiftCode)
 * @returns 검증 결과 { isValid: boolean, errors: string[] }
 */
export function validateLastMonthData(
  employees: Employee[],
  dates: GridColumn[],
  assignments: AssignmentMap
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 빈 assignments 체크
  if (!assignments || Object.keys(assignments).length === 0) {
    errors.push('배정 데이터가 비어있습니다.');
    return { isValid: false, errors };
  }

  // 전월 날짜만 필터링
  const lastMonthDates = dates.filter((d) => d.isLastMonth).map((d) => d.date);

  // 전월 데이터가 없는 경우
  if (lastMonthDates.length === 0) {
    return { isValid: true, errors }; // 전월 데이터가 필요없는 경우
  }

  // 각 직원에 대해 전월 5일 모두 입력 확인
  for (const employee of employees) {
    for (const date of lastMonthDates) {
      const shift = assignments[employee.id]?.[date];
      if (!shift) {
        errors.push(`${employee.name}의 ${date} 데이터가 입력되지 않았습니다.`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
