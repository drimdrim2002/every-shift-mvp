import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import type { Employee } from '@/types/employee';
import type { GridColumn, AssignmentMap } from '@/types/schedule';

function getWorkbookSheet(workbook: XLSX.WorkBook, sheetName: string): XLSX.WorkSheet {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`엑셀 시트를 찾을 수 없습니다: ${sheetName}`);
  }
  return sheet;
}

function readWorksheetRows(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
  });
}

// ============================================================================
// 전월 데이터 엑셀 템플릿/파싱 (Step4InitialData 전용)
// ============================================================================

/**
 * 전월 데이터 템플릿 다운로드
 * @param employees - 직원 목록
 * @param dates - 전월 날짜 목록 (isLastMonth가 true인 것들만)
 * @param month - 계획월 (YYYY-MM)
 */
export function downloadLastMonthTemplate(
  employees: Employee[],
  dates: GridColumn[],
  month: string
): void {
  // 전월 날짜만 필터링
  const lastMonthDates = dates.filter(d => d.isLastMonth);
  
  if (lastMonthDates.length === 0) {
    throw new Error('전월 날짜가 없습니다. 전월 일수를 1일 이상으로 설정해주세요.');
  }
  
  // 헤더 생성: 이름, 사번, 날짜들...
  const dateHeaders = lastMonthDates.map(d => {
    const date = dayjs(d.date);
    return `${date.format('MM/DD')}(${d.dayName})`;
  });
  const headers = ['이름', '사번', ...dateHeaders];
  
  // 데이터 행 생성
  const rows: (string | number)[][] = [headers];
  employees.forEach(emp => {
    const row: (string | number)[] = [emp.name, emp.employeeId];
    // 날짜 컬럼은 빈 값으로
    lastMonthDates.forEach(() => row.push(''));
    rows.push(row);
  });
  
  // 워크시트 생성
  const ws = XLSX.utils.aoa_to_sheet(rows);
  
  // 컬럼 너비 설정
  const colWidths: XLSX.ColInfo[] = [
    { wch: 12 }, // 이름
    { wch: 10 }, // 사번
    ...lastMonthDates.map(() => ({ wch: 12 })), // 날짜 컬럼들
  ];
  ws['!cols'] = colWidths;
  
  // 워크북 생성
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '전월데이터');
  
  // 설명 시트 추가
  const infoData = [
    ['전월 데이터 입력 안내'],
    [''],
    ['1. 이름과 사번은 수정하지 마세요.'],
    ['2. 각 날짜 컬럼에 근무 코드를 입력하세요.'],
    ['3. 허용되는 근무 코드: D (주간), E (저녁), N (야간)'],
    ['   ※ 주의: 전월 데이터에는 O (휴무)를 입력할 수 없습니다.'],
    ['4. 빈 칸으로 두면 해당 날짜는 입력되지 않은 것으로 처리됩니다.'],
  ];
  const infoSheet = XLSX.utils.aoa_to_sheet(infoData);
  infoSheet['!cols'] = [{ wch: 60 }];
  XLSX.utils.book_append_sheet(wb, infoSheet, '안내');
  
  // 파일 다운로드
  const filename = `전월데이터_템플릿_${month}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * 전월 데이터 엑셀 파싱
 * @param file - 업로드된 엑셀 파일
 * @param employees - 직원 목록 (Employee[])
 * @param dates - 전월 날짜 목록 (GridColumn[])
 * @returns { assignments, rejectedOffCount } - 파싱된 assignments와 제거된 'O' 개수
 */
export async function parseLastMonthExcel(
  file: File,
  employees: Employee[],
  dates: GridColumn[]
): Promise<{ assignments: AssignmentMap; rejectedOffCount: number }> {
  // 전월 날짜만 필터링
  const lastMonthDates = dates.filter(d => d.isLastMonth);
  
  if (lastMonthDates.length === 0) {
    throw new Error('전월 날짜가 없습니다.');
  }
  
  // 파일 읽기
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  // 첫 번째 시트 또는 '전월데이터' 시트 찾기
  let sheet: XLSX.WorkSheet;
  if (workbook.Sheets['전월데이터']) {
    sheet = getWorkbookSheet(workbook, '전월데이터');
  } else {
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('엑셀 파일에 시트가 없습니다.');
    }
    sheet = getWorkbookSheet(workbook, firstSheetName);
  }
  
  // 시트 데이터 파싱
  const data = readWorksheetRows(sheet);
  
  if (data.length < 2) {
    throw new Error('엑셀 파일에 데이터가 부족합니다. 최소 헤더와 1개의 데이터 행이 필요합니다.');
  }
  
  const assignments: AssignmentMap = {};
  // 전월 데이터에서는 'O' (Off) 제외
  const validShiftCodes = ['D', 'E', 'N'];
  const rejectedOffCount = { count: 0 }; // 거부된 'O' 카운트
  
  // 사번 -> 직원 매핑 생성
  const employeeByEmployeeId = new Map<string, Employee>();
  employees.forEach(emp => {
    employeeByEmployeeId.set(emp.employeeId, emp);
  });
  
  // 데이터 행 파싱 (1행부터, 0행은 헤더)
  for (let i = 1; i < data.length; i++) {
    const row = data[i] ?? [];
    const name = String(row[0] || '').trim();
    const employeeId = String(row[1] || '').trim();
    
    // 빈 행 스킵
    if (!name && !employeeId) {
      continue;
    }
    
    // 직원 찾기 (사번으로)
    const employee = employeeByEmployeeId.get(employeeId);
    if (!employee) {
      console.warn(`${i + 1}행: 사번 ${employeeId}에 해당하는 직원을 찾을 수 없습니다.`);
      continue;
    }
    
    // 해당 직원의 assignments 초기화
    const employeeAssignments = assignments[employee.id] ?? {};
    assignments[employee.id] = employeeAssignments;
    
    // 날짜별 시프트 추출 (2번 컬럼부터)
    for (let j = 0; j < lastMonthDates.length; j++) {
      const shiftCode = String(row[j + 2] || '').trim().toUpperCase();
      
      if (shiftCode) {
        // 'O' (Off)는 전월 데이터에서 허용되지 않음
        if (shiftCode === 'O') {
          rejectedOffCount.count++;
          console.warn(`${i + 1}행, ${j + 3}열: 전월 데이터에는 'O' (휴무)를 입력할 수 없습니다. 이 셀은 건너뜁니다.`);
          continue;
        }
        
        // 유효한 시프트 코드인지 확인
        if (!validShiftCodes.includes(shiftCode)) {
          console.warn(`${i + 1}행, ${j + 3}열: 잘못된 근무 코드 "${shiftCode}" (허용: ${validShiftCodes.join(', ')})`);
          continue;
        }
        
        const dateInfo = lastMonthDates[j];
        if (!dateInfo) {
          throw new Error(`전월 날짜 정보를 찾을 수 없습니다: index=${j}`);
        }

        employeeAssignments[dateInfo.date] = shiftCode;
      }
    }
  }
  
  // 'O'가 발견되었으면 경고 메시지 출력
  if (rejectedOffCount.count > 0) {
    console.warn(`총 ${rejectedOffCount.count}개의 'O' (휴무)가 전월 데이터에서 제외되었습니다.`);
  }
  
  return { assignments, rejectedOffCount: rejectedOffCount.count };
}

/**
 * FileReader를 사용하여 파일을 ArrayBuffer로 읽기
 */
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        resolve(e.target.result);
      } else {
        reject(new Error('파일 읽기 실패'));
      }
    };
    reader.onerror = () => reject(new Error('파일 읽기 중 오류 발생'));
    reader.readAsArrayBuffer(file);
  });
}

// ============================================================================
// 기존 근무표 내보내기 기능
// ============================================================================

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
    if (!char) continue;
    // 한글 및 한자는 2 너비, 그 외는 1 너비
    width += /[\u3000-\u9FFF\uAC00-\uD7AF]/.test(char) ? 2 : 1;
  }
  return width;
}
