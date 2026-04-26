import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import type { Shift } from '@/types/shift';
import { dayOfWeekToDayName } from '@/types/excel';

// 시트 이름 상수 (3개 시트만)
const SHEET_NAMES = {
  EMPLOYEES: '직원정보',
  SITE_REQUIREMENTS: '요일별인력',
  PREVIOUS_MONTH: '전월데이터',
} as const;

/**
 * 빈 템플릿 생성
 * @param shifts - Step1에서 설정한 시프트 목록
 * @param month - 계획월 (YYYY-MM 형식)
 * @returns 3개 시트가 포함된 빈 워크북
 */
export function generateBlankTemplate(
  shifts: Shift[],
  month: string
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // 3개 시트 생성
  const empSheet = createEmployeesSheet(shifts);
  const reqSheet = createSiteRequirementsSheet(shifts);
  const prevSheet = createPreviousMonthSheet(month, shifts);

  // 워크북에 시트 추가
  XLSX.utils.book_append_sheet(wb, empSheet, SHEET_NAMES.EMPLOYEES);
  XLSX.utils.book_append_sheet(wb, reqSheet, SHEET_NAMES.SITE_REQUIREMENTS);
  XLSX.utils.book_append_sheet(wb, prevSheet, SHEET_NAMES.PREVIOUS_MONTH);

  return wb;
}

/**
 * 직원정보 시트 생성
 * @param shifts - 설정된 시프트 목록
 */
function createEmployeesSheet(shifts: Shift[]): XLSX.WorkSheet {
  const shiftCodes = shifts.map((s) => s.code).join(',');

  const data = [
    ['직원ID', '이름', '가능한시프트'],
    ['EMP001', '홍길동', shiftCodes], // 샘플 데이터
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // 컬럼 너비 설정
  ws['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 20 }];

  // 셀 주석 추가 (C2: 가능한시프트)
  if (!ws['C2']) ws['C2'] = { t: 's', v: shiftCodes };
  ws['C2'].c = [
    {
      a: 'Guide',
      t: `${shiftCodes} 형식으로 쉼표로 구분하여 입력하세요. 허용된 시프트: ${shiftCodes}`,
    },
  ];

  return ws;
}

/**
 * 요일별인력 시트 생성 - 세로형 구조 (7일 x 시프트 수)
 * 헤더: 요일명, 시프트유형, 필요인력수
 * @param shifts - 설정된 시프트 목록
 */
function createSiteRequirementsSheet(shifts: Shift[]): XLSX.WorkSheet {
  const shiftCodes = shifts.map((s) => s.code);
  const sampleShiftCode = shiftCodes[0] ?? '';
  const data: (string | number)[][] = [['요일명', '시프트유형', '필요인력수']];

  // 7일 x 시프트 수 = 세로형 데이터 생성
  // 월요일(1)부터 시작, 일요일(0)이 마지막
  const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // 월~일 순서

  dayOrder.forEach((dayOfWeek) => {
    const dayName = dayOfWeekToDayName(dayOfWeek);
    shiftCodes.forEach((code) => {
      const defaultCount = 0;
      data.push([dayName, code, defaultCount]);
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(data);

  // 컬럼 너비 설정
  ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }];

  // 셀 주석 추가 (B2: 시프트유형)
  if (!ws['B2']) ws['B2'] = { t: 's', v: sampleShiftCode };
  ws['B2'].c = [
    {
      a: 'Guide',
      t: `시프트유형은 ${shiftCodes.join(', ')} 중 하나를 입력하세요.`,
    },
  ];

  // 셀 주석 추가 (C2: 필요인력수)
  if (!ws['C2']) ws['C2'] = { t: 'n', v: 0 };
  ws['C2'].c = [
    {
      a: 'Guide',
      t: '기본값은 모두 0입니다. 업로드 전 각 요일 total이 0이 아니도록 값을 입력하세요. (0 이상의 정수)',
    },
  ];

  return ws;
}

/**
 * 전월데이터 시트 생성 (전월 마지막 5일)
 * @param month - 계획월 (YYYY-MM 형식)
 * @param shifts - 설정된 시프트 목록
 */
function createPreviousMonthSheet(
  month: string,
  shifts: Shift[]
): XLSX.WorkSheet {
  const shiftCodes = shifts.map((s) => s.code).join(',');

  // 전월 마지막 5일 날짜 계산
  const targetDate = dayjs(month + '-01');
  const prevMonthEnd = targetDate.subtract(1, 'day');
  const dates: string[] = [];
  const fullDates: string[] = []; // YYYY-MM-DD 형식

  for (let i = 4; i >= 0; i--) {
    const date = prevMonthEnd.subtract(i, 'day');
    dates.push(date.format('MM/DD'));
    fullDates.push(date.format('YYYY-MM-DD'));
  }

  const firstDate = fullDates[0] ?? '';
  const lastDate = fullDates[fullDates.length - 1] ?? '';

  // 헤더 생성
  const header = ['직원ID', '이름', ...dates];
  const data = [header];

  // 샘플 데이터 1개
  const sampleRow = ['EMP001', '홍길동', ...Array(dates.length).fill('')];
  data.push(sampleRow);

  const ws = XLSX.utils.aoa_to_sheet(data);

  // 컬럼 너비 설정
  const colWidths: XLSX.ColInfo[] = [
    { wch: 12 }, // 직원ID
    { wch: 10 }, // 이름
    ...dates.map(() => ({ wch: 8 })), // 날짜 컬럼들
  ];
  ws['!cols'] = colWidths;

  // 셀 주석 추가 (C2: 첫 번째 날짜)
  if (!ws['C2']) ws['C2'] = { t: 's', v: '' };
  ws['C2'].c = [
    {
      a: 'Guide',
      t: `시프트 코드(${shiftCodes})를 입력하세요. 전월 마지막 5일(${firstDate} ~ ${lastDate}) 데이터가 필요합니다.`,
    },
  ];

  return ws;
}

/**
 * 시트 포맷팅 적용
 * @param sheet - 포맷팅할 워크시트
 */
export function applySheetFormatting(sheet: XLSX.WorkSheet): void {
  // 헤더 행 배경색 (회색)
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!sheet[cellRef]) continue;

    sheet[cellRef].s = {
      fill: {
        fgColor: { rgb: 'D3D3D3' }, // 회색
      },
      font: {
        bold: true,
      },
    };
  }

  // 테두리 추가 (전체 셀)
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!sheet[cellRef]) continue;

      sheet[cellRef].s = {
        ...sheet[cellRef].s,
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } },
        },
      };
    }
  }
}

/**
 * 워크북을 Blob으로 변환
 * @param workbook - XLSX 워크북
 * @returns Blob 객체
 */
export function workbookToBlob(workbook: XLSX.WorkBook): Blob {
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * 템플릿 파일 다운로드
 * @param shifts - 설정된 시프트 목록
 * @param month - 계획월 (YYYY-MM 형식)
 * @param filename - 파일명 (기본값: schedule_template.xlsx)
 */
export function downloadTemplate(
  shifts: Shift[],
  month: string,
  filename = 'schedule_template.xlsx'
): void {
  const workbook = generateBlankTemplate(shifts, month);
  const blob = workbookToBlob(workbook);

  // 다운로드 링크 생성
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
