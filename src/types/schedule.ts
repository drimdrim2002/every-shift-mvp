import type { Shift } from './shift';
import type { SiteRequirementRow } from './excel';

// 기본 정보 (Step 1)
export interface ScheduleBasicInfo {
  month: string; // "2025-12"
  organizationId: string; // UUID
  organizationName: string;
  organizationType: string;
  employeeCount: number;
  shifts: Shift[];
}

// 요일별 인력 요구사항 (세로형 배열)
export type SiteRequirementList = SiteRequirementRow[];

// 그리드 컬럼 정보
export interface GridColumn {
  date: string; // "2025-11-27"
  day: number; // 27
  dayOfWeek: number; // 0-6
  dayName: string; // "일", "월", ...
  isLastMonth: boolean; // 전월 여부
}

// 배정 맵: employeeId -> date -> shiftCode
export type AssignmentMap = Record<string, Record<string, string>>;

// 행/열 통계
export interface RowStat {
  D: number;
  E: number;
  N: number;
  total: number;
}

export interface ColumnStat {
  D: number;
  E: number;
  N: number;
  total: number;
}

export interface GridStatistics {
  rowStats: Record<string, RowStat>; // employeeId별
  columnStats: Record<string, ColumnStat>; // date별
}

// 사이트 요구사항 (Step 2)
export interface SiteRequirements {
  [date: string]: DailyRequirement; // "2025-12-01": { D: 3, E: 4, ... }
}

export interface DailyRequirement {
  D: number;
  E: number;
  N: number;
  O: number;
  total: number;
}
