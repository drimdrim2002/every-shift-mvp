import type { AssignmentMap, GridColumn } from '@/types/schedule';
import type { Employee } from '@/types/employee';

/**
 * 유효한 근무 코드 검증
 * @param code - 근무 코드 (D, E, N, O, H 등)
 * @returns 유효 여부
 */
export function isValidShiftCode(code: string): boolean {
  const validCodes = ['D', 'E', 'N', 'O', 'H', 'L'];
  return validCodes.includes(code);
}

/**
 * 전월 마지막 N일 데이터 입력 확인 (선택적 검증)
 * @param employees - 직원 목록
 * @param dates - 전체 날짜 목록 (GridColumn 배열)
 * @param assignments - 배정 맵 (employeeId -> date -> shiftCode)
 * @param requireLastMonth - 전월 데이터 필수 여부 (기본값: false)
 * @returns 검증 결과 { isValid: boolean, errors: string[], warnings: string[] }
 */
export function validateLastMonthData(
  employees: Employee[],
  dates: GridColumn[],
  assignments: AssignmentMap,
  requireLastMonth: boolean = false
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 빈 assignments 체크 (전월 데이터가 필수가 아닐 때는 경고만)
  if (!assignments || Object.keys(assignments).length === 0) {
    if (requireLastMonth) {
      errors.push('배정 데이터가 비어있습니다.');
      return { isValid: false, errors, warnings };
    }
    return { isValid: true, errors, warnings };
  }

  // 전월 날짜만 필터링
  const lastMonthDates = dates.filter((d) => d.isLastMonth).map((d) => d.date);

  // 전월 데이터가 없는 경우 (일수가 0인 경우)
  if (lastMonthDates.length === 0) {
    return { isValid: true, errors, warnings };
  }

  // 전월 데이터가 필수가 아닌 경우 - 검증 스킵
  if (!requireLastMonth) {
    // 입력되지 않은 데이터가 있으면 경고만 표시
    for (const employee of employees) {
      for (const date of lastMonthDates) {
        const shift = assignments[employee.id]?.[date];
        if (!shift) {
          warnings.push(`${employee.name}의 ${date} 데이터가 입력되지 않았습니다.`);
        }
      }
    }
    return { isValid: true, errors, warnings };
  }

  // 전월 데이터가 필수인 경우 - 각 직원에 대해 전월 데이터 모두 입력 확인
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
    warnings,
  };
}
