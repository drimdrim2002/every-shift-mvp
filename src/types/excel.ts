import type { AssignmentMap } from './schedule';

// 직원 정보 (엑셀 시트에서 파싱)
export interface EmployeeData {
  employeeId: string;
  name: string;
  availableShifts: string[]; // ['D', 'E', 'N', 'O']
}

// 시프트 정의 (API 저장용, 엑셀 템플릿 생성 시 사용)
export interface ShiftData {
  code: string; // "D", "E", "N", "O", "H"
  name: string;
  colorCode: string; // "#RRGGBB"
  startTime: string | null; // "HH:mm" or null
  endTime: string | null; // "HH:mm" or null
}

// 요일별 필요 인력 - 세로형 구조 (21행: 7일 x 3시프트)
export interface SiteRequirementRow {
  dayOfWeek: number; // 0-6 (일요일=0, 월요일=1, ..., 토요일=6)
  dayName: string; // '일요일', '월요일', ..., '토요일'
  shiftCode: string; // 'D', 'E', 'N' 등
  requiredCount: number; // 필요 인원 수
}

// 엑셀 파싱 결과 (3개 시트 데이터)
export interface ParsedExcelData {
  employees: EmployeeData[];
  siteRequirements: SiteRequirementRow[]; // 세로형 21행 데이터
  previousMonthData: AssignmentMap; // 전월 마지막 5일
}

// 에러 타입
export type ExcelErrorType =
  | 'MISSING_SHEET' // 필수 시트 누락
  | 'INVALID_FORMAT' // 형식 오류
  | 'REQUIRED_FIELD' // 필수 필드 누락
  | 'BUSINESS_RULE'; // 비즈니스 규칙 위반

// 경고 타입
export type ExcelWarningType =
  | 'DATA_MISMATCH' // 데이터 불일치
  | 'OUT_OF_RANGE' // 범위 초과
  | 'INCONSISTENT'; // 일관성 없음

// 에러 정보
export interface ExcelError {
  type: ExcelErrorType;
  sheet: string; // 시트 이름
  row?: number; // 행 번호 (옵셔널)
  column?: string; // 컬럼 이름 (옵셔널)
  message: string; // 한국어 에러 메시지
}

// 경고 정보
export interface ExcelWarning {
  type: ExcelWarningType;
  message: string; // 한국어 경고 메시지
}

// 검증 결과
export interface ExcelValidationResult {
  isValid: boolean; // 에러가 없으면 true
  errors: ExcelError[]; // 에러 목록 (치명적)
  warnings: ExcelWarning[]; // 경고 목록 (비치명적)
}

// 요일 이름 상수 (0=일요일부터)
export const DAY_NAMES = [
  '일요일',
  '월요일',
  '화요일',
  '수요일',
  '목요일',
  '금요일',
  '토요일',
] as const;

// 요일 이름 → dayOfWeek 변환 헬퍼
export function dayNameToDayOfWeek(dayName: string): number {
  const index = DAY_NAMES.indexOf(dayName as (typeof DAY_NAMES)[number]);
  if (index === -1) {
    throw new Error(`잘못된 요일 이름: ${dayName}`);
  }
  return index;
}

// dayOfWeek → 요일 이름 변환 헬퍼
export function dayOfWeekToDayName(dayOfWeek: number): string {
  if (dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error(`잘못된 요일 번호: ${dayOfWeek}`);
  }
  const dayName = DAY_NAMES[dayOfWeek];
  if (!dayName) {
    throw new Error(`잘못된 요일 번호: ${dayOfWeek}`);
  }

  return dayName;
}
