import * as XLSX from 'xlsx';
import type { Employee } from '@/types/employee';
import type { GridColumn, AssignmentMap } from '@/types/schedule';

/**
 * 근무표를 Excel 파일로 내보내기
 * @param employees - 직원 목록
 * @param dates - 날짜 컬럼 정보
 * @param assignments - 직원별 날짜별 시프트 할당 맵
 * @param filename - 저장할 파일명 (기본값: 'schedule.xlsx')
 *
 * @example
 * exportToExcel(employees, dates, assignments, 'schedule_2025-01.xlsx');
 */
export function exportToExcel(
  employees: Employee[],
  dates: GridColumn[],
  assignments: AssignmentMap,
  filename: string = 'schedule.xlsx'
): void {
  // 1. 데이터 변환: 각 직원을 행으로 변환
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

  // 3. 컬럼 너비 자동 조정
  const colWidths = calculateColumnWidths(rows, dates);
  ws['!cols'] = colWidths;

  // 4. 워크북 생성
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '근무표');

  // 5. 파일 다운로드
  XLSX.writeFile(wb, filename);
}

/**
 * 컬럼 너비 계산
 * 직번/이름 컬럼은 고정 너비, 날짜 컬럼은 균일한 너비 적용
 */
function calculateColumnWidths(
  rows: Record<string, string>[],
  dates: GridColumn[]
): XLSX.ColInfo[] {
  const widths: XLSX.ColInfo[] = [];

  // 직번 컬럼 너비
  widths.push({ wch: 10 });

  // 이름 컬럼 너비 (가장 긴 이름 기준)
  const maxNameLength = Math.max(
    4, // 최소 너비 (헤더 '이름')
    ...rows.map((row) => getStringWidth(row['이름'] || ''))
  );
  widths.push({ wch: maxNameLength });

  // 날짜 컬럼들은 균일한 너비 (시프트 코드 기준)
  dates.forEach(() => {
    widths.push({ wch: 5 }); // 'D', 'E', 'N', 'O' 등 시프트 코드 너비
  });

  return widths;
}

/**
 * 문자열의 표시 너비 계산 (한글은 2바이트로 계산)
 */
function getStringWidth(str: string): number {
  let width = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    // 한글 및 한자는 2 너비, 그 외는 1 너비
    width += /[\u3000-\u9FFF\uAC00-\uD7AF]/.test(char) ? 2 : 1;
  }
  return width;
}
