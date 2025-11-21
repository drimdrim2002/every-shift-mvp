import type { AssignmentMap } from './schedule';

// 조직 정보
export interface OrganizationData {
  name: string;
  type: 'hospital' | 'fire' | 'police';
  month: string; // YYYY-MM
}

// 직원 정보
export interface EmployeeData {
  employeeId: string;
  name: string;
  availableShifts: string[]; // ['D', 'E', 'N', 'O']
}

// 시프트 정의
export interface ShiftData {
  code: string; // "D", "E", "N", "O", "H"
  name: string;
  colorCode: string; // "#RRGGBB"
  startTime: string | null; // "HH:mm" or null
  endTime: string | null; // "HH:mm" or null
}

// 요일별 필요 인력
export interface SiteRequirementData {
  dayOfWeek: number; // 0-6 (일~토)
  D: number;
  E: number;
  N: number;
  O: number;
}

// 엑셀 파싱 결과 (6개 시트 데이터)
export interface ParsedExcelData {
  organization: OrganizationData;
  employees: EmployeeData[];
  shifts: ShiftData[];
  siteRequirements: SiteRequirementData[];
  previousMonthData: AssignmentMap; // 전월 마지막 5일
  currentMonthData: AssignmentMap; // 당월 데이터 (선택)
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
