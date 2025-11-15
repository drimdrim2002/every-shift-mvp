import * as XLSX from 'xlsx';
import type { Employee } from '@/types/employee';
import type { GridColumn, AssignmentMap } from '@/types/schedule';

/**
 * 근무표를 Excel 파일로 내보내기
 * @param employees - 직원 목록
 * @param dates - 날짜 컬럼 정보
 * @param assignments - 직원별 날짜별 시프트 할당 맵
 * @param filename - 저장할 파일명 (기본값: 'schedule.xlsx')
 */
export function exportToExcel(
  employees: Employee[],
  dates: GridColumn[],
  assignments: AssignmentMap,
  filename: string = 'schedule.xlsx'
): void {
  // 1. 데이터 변환
  const rows = employees.map((emp) => {
    const row: Record<string, string> = {
      직번: emp.employeeId,
      이름: emp.name,
    };

    // 각 날짜별 시프트 추가
    dates.forEach((date) => {
      const shift = assignments[emp.id]?.[date.date] || '';
      row[`${date.day}일`] = shift;
    });

    return row;
  });

  // 2. 워크시트 생성
  const ws = XLSX.utils.json_to_sheet(rows);

  // 3. 워크북 생성
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '근무표');

  // 4. 파일 다운로드
  XLSX.writeFile(wb, filename);
}
