import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import type {
  ParsedExcelData,
  EmployeeData,
  SiteRequirementRow,
} from '@/types/excel';
import { DAY_NAMES, dayNameToDayOfWeek } from '@/types/excel';
import type { AssignmentMap } from '@/types/schedule';

// 엑셀 시트 이름 상수 (3개 시트만)
const SHEET_NAMES = {
  EMPLOYEES: '직원정보',
  SITE_REQUIREMENTS: '요일별인력',
  PREVIOUS_MONTH: '전월데이터',
} as const;

// 요일별 인력 시트 대체 이름 (공백 포함/미포함)
const SITE_REQUIREMENTS_ALT_NAMES = ['요일별인력', '요일별 인력'];

/**
 * 엑셀 파일을 파싱하여 ParsedExcelData 형식으로 변환
 * @param file - 업로드된 엑셀 파일
 * @param month - 계획월 (YYYY-MM 형식, Step1에서 입력받음)
 * @returns 파싱된 데이터
 * @throws 파싱 실패 시 에러 메시지
 */
export async function parseExcelFile(
  file: File,
  month: string
): Promise<ParsedExcelData> {
  try {
    // 1. FileReader로 파일 읽기
    const arrayBuffer = await readFileAsArrayBuffer(file);

    // 2. XLSX.read()로 워크북 생성
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // 3. 필수 시트 존재 확인
    validateRequiredSheets(workbook);

    // 4. 각 시트 추출
    const empSheet = workbook.Sheets[SHEET_NAMES.EMPLOYEES];
    const reqSheet = findSiteRequirementsSheet(workbook);
    const prevSheet = workbook.Sheets[SHEET_NAMES.PREVIOUS_MONTH];

    // 5. 각 시트 데이터 추출
    const employees = extractEmployees(empSheet);
    const siteRequirements = extractSiteRequirements(reqSheet);
    const previousMonthData = extractPreviousMonthData(prevSheet, month, employees);

    return {
      employees,
      siteRequirements,
      previousMonthData,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`엑셀 파일 파싱 실패: ${error.message}`);
    }
    throw new Error('엑셀 파일 파싱 중 알 수 없는 오류가 발생했습니다.');
  }
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

/**
 * 필수 시트 존재 확인 (3개 시트)
 */
function validateRequiredSheets(workbook: XLSX.WorkBook): void {
  const sheetNames = workbook.SheetNames;

  // 직원정보 시트 확인
  if (!sheetNames.includes(SHEET_NAMES.EMPLOYEES)) {
    throw new Error(`필수 시트가 누락되었습니다: ${SHEET_NAMES.EMPLOYEES}`);
  }

  // 요일별인력 시트 확인 (대체 이름 허용)
  const hasReqSheet = SITE_REQUIREMENTS_ALT_NAMES.some((name) =>
    sheetNames.includes(name)
  );
  if (!hasReqSheet) {
    throw new Error(`필수 시트가 누락되었습니다: ${SHEET_NAMES.SITE_REQUIREMENTS}`);
  }

  // 전월데이터 시트 확인
  if (!sheetNames.includes(SHEET_NAMES.PREVIOUS_MONTH)) {
    throw new Error(`필수 시트가 누락되었습니다: ${SHEET_NAMES.PREVIOUS_MONTH}`);
  }
}

/**
 * 요일별 인력 시트 찾기 (대체 이름 지원)
 */
function findSiteRequirementsSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet {
  for (const name of SITE_REQUIREMENTS_ALT_NAMES) {
    if (workbook.Sheets[name]) {
      return workbook.Sheets[name];
    }
  }
  throw new Error(`시트를 찾을 수 없습니다: ${SHEET_NAMES.SITE_REQUIREMENTS}`);
}

/**
 * 직원 정보 추출 (2행부터)
 */
function extractEmployees(sheet: XLSX.WorkSheet): EmployeeData[] {
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    header: 1,
    defval: '',
  }) as unknown[][];

  if (data.length < 2) {
    throw new Error('직원정보 시트: 직원 데이터가 없습니다');
  }

  const employees: EmployeeData[] = [];
  const employeeIds = new Set<string>();

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as string[];
    const employeeId = String(row[0] || '').trim();
    const name = String(row[1] || '').trim();
    const availableShiftsStr = String(row[2] || '').trim();

    // 빈 행은 건너뛰기
    if (!employeeId && !name) {
      continue;
    }

    if (!employeeId || !name) {
      throw new Error(`직원정보 시트 ${i + 1}행: 직원ID와 이름은 필수입니다`);
    }

    // 중복 직원ID 확인
    if (employeeIds.has(employeeId)) {
      throw new Error(
        `직원정보 시트 ${i + 1}행: 중복된 직원ID입니다 (${employeeId})`
      );
    }
    employeeIds.add(employeeId);

    // availableShifts 파싱: "D,E,N" → ["D", "E", "N"]
    const availableShifts = availableShiftsStr
      ? availableShiftsStr.split(',').map((s) => s.trim().toUpperCase())
      : [];

    if (availableShifts.length === 0) {
      throw new Error(
        `직원정보 시트 ${i + 1}행: 가능한 시프트는 최소 1개 이상이어야 합니다`
      );
    }

    employees.push({
      employeeId,
      name,
      availableShifts,
    });
  }

  if (employees.length === 0) {
    throw new Error('직원정보 시트: 최소 1명의 직원이 필요합니다');
  }

  return employees;
}

/**
 * 요일별 필요 인력 추출 - 세로형 구조 (21행: 7일 x 3시프트)
 * 헤더: 요일명, 시프트유형, 필요인력수
 * 데이터: 월요일, D, 5
 */
function extractSiteRequirements(sheet: XLSX.WorkSheet): SiteRequirementRow[] {
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    header: 1,
    defval: '',
  }) as unknown[][];

  if (data.length < 2) {
    throw new Error('요일별인력 시트: 데이터가 부족합니다');
  }

  const requirements: SiteRequirementRow[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as (string | number)[];
    const dayName = String(row[0] || '').trim();
    const shiftCode = String(row[1] || '').trim().toUpperCase();
    const requiredCount = Number(row[2] || 0);

    // 빈 행은 건너뛰기
    if (!dayName && !shiftCode) {
      continue;
    }

    // 요일명 검증
    if (!dayName) {
      throw new Error(`요일별인력 시트 ${i + 1}행: 요일명은 필수입니다`);
    }

    // DAY_NAMES에 있는지 확인
    if (!DAY_NAMES.includes(dayName as (typeof DAY_NAMES)[number])) {
      throw new Error(
        `요일별인력 시트 ${i + 1}행: 잘못된 요일명입니다 (${dayName}). 일요일~토요일 중 하나를 입력하세요.`
      );
    }

    // 시프트 코드 검증
    if (!shiftCode) {
      throw new Error(`요일별인력 시트 ${i + 1}행: 시프트유형은 필수입니다`);
    }

    // 필요 인원 검증
    if (isNaN(requiredCount) || requiredCount < 0) {
      throw new Error(
        `요일별인력 시트 ${i + 1}행: 필요인력수는 0 이상의 숫자여야 합니다`
      );
    }

    // dayOfWeek 변환
    const dayOfWeek = dayNameToDayOfWeek(dayName);

    requirements.push({
      dayOfWeek,
      dayName,
      shiftCode,
      requiredCount,
    });
  }

  // 최소 데이터 확인 (최소 7개 이상 - 요일 수)
  if (requirements.length < 7) {
    throw new Error(
      `요일별인력 시트: 데이터가 부족합니다. 최소 7개 요일의 시프트 데이터가 필요합니다. (현재: ${requirements.length}행)`
    );
  }

  return requirements;
}

/**
 * 전월 데이터 추출 (전월 마지막 5일)
 * @param sheet - 전월데이터 워크시트
 * @param month - 계획월 (YYYY-MM)
 * @param employees - 직원 목록 (검증용)
 */
function extractPreviousMonthData(
  sheet: XLSX.WorkSheet,
  month: string,
  employees: EmployeeData[]
): AssignmentMap {
  const assignments: AssignmentMap = {};

  // 날짜 계산: 전월 마지막 5일
  const targetDate = dayjs(month + '-01');
  const prevMonthEnd = targetDate.subtract(1, 'day');
  const dates: string[] = [];

  for (let i = 4; i >= 0; i--) {
    const date = prevMonthEnd.subtract(i, 'day').format('YYYY-MM-DD');
    dates.push(date);
  }

  // 시트를 JSON으로 변환
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    header: 1,
    defval: '',
  }) as unknown[][];

  if (data.length < 2) {
    throw new Error('전월데이터 시트: 데이터가 부족합니다');
  }

  // 각 직원별 데이터 추출
  for (let i = 1; i < data.length; i++) {
    const row = data[i] as string[];
    const employeeId = String(row[0] || '').trim();

    // 빈 행은 건너뛰기
    if (!employeeId) {
      continue;
    }

    // 직원 ID 검증
    const employee = employees.find((e) => e.employeeId === employeeId);
    if (!employee) {
      throw new Error(
        `전월데이터 시트 ${i + 1}행: 직원정보에 없는 직원ID입니다 (${employeeId})`
      );
    }

    assignments[employeeId] = {};

    // 날짜별 시프트 추출 (컬럼 2부터 시작, 5개 날짜)
    for (let j = 0; j < dates.length; j++) {
      const shift = String(row[j + 2] || '').trim().toUpperCase();
      const date = dates[j];
      if (shift && date) {
        assignments[employeeId][date] = shift;
      }
    }
  }

  return assignments;
}
