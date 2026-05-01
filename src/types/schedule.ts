import type { SiteRequirementRow } from './excel';
import type { EmployeeInput } from './employee';
import type { Shift } from './shift';

// 기본 정보 (Step 1)
export interface ScheduleBasicInfo {
  scheduleId?: string; // Schedule UUID (Step1에서 생성)
  schedulePublicId?: string; // URL-safe public schedule key
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

export interface PreviousMonthFinalizedContext {
  scheduleId: string;
  scheduleVersionId: string;
  displayAssignments: AssignmentMap;
  planningAssignments: PlanningAssignment[];
}

// Step4 근무 불가 코드
export type ConstraintCode = 'O';

// 근무 불가 맵: employeeId -> date -> requestCode
export type ConstraintMap = Record<string, Record<string, ConstraintCode | ''>>;

// Off 사유 맵: employeeId -> date -> reason
export type OffReasonMap = Record<string, Record<string, string>>;

// 코멘트 맵: employeeId -> date -> comment
export type CommentMap = Record<string, Record<string, string>>;

export interface TempPreferencesEnvelopeV2 {
  schemaVersion: 2;
  ownerUserId: string;
  ownerOrganizationId: string;
  month: string;
  savedAt: string;
  constraints: ConstraintMap;
  constraintNotes: CommentMap;
}

export type PreferenceStatus = 'pending' | 'fulfilled' | 'unfulfilled';

export type LegacyScheduleStatus = 'created' | 'running' | 'complete' | 'changed' | 'error';

export type ScheduleVersionStatus =
  | 'draft'
  | 'solving'
  | 'review_ready'
  | 'review_blocked'
  | 'review_pending'
  | 'infeasible'
  | 'solve_failed'
  | 'finalized';

export type ScheduleEvaluationResultStatus =
  | 'passed'
  | 'review_blocked'
  | 'infeasible'
  | 'solve_failed';

export type ScheduleReviewTab = 'grid' | 'proof' | 'offRequests';

export type SchedulePrimaryActionKind = 'select' | 'recheck' | 'finalize' | 'retry' | 'none';
export type ScheduleVersionSourceType = 'initial_solve' | 're_solve' | 'manual_variant';

export interface ScheduleBlockingReason {
  code: string;
  message: string;
}

export interface ScheduleFinalizationGate {
  allowed: boolean;
  blockingReasons: ScheduleBlockingReason[];
}

export interface ScheduleInputDiffSummary {
  changedOffRequests: number;
  changedLockedAssignments: number;
  changedSiteRequirements: number;
  note: string | null;
}

export interface ScheduleInputSnapshotEmployee {
  employeeId: string;
  availableShifts: string[];
  skillSet: string[];
}

export interface ScheduleInputSnapshotAssignment {
  employeeId: string;
  date: string;
  shiftId: string;
  isLocked: boolean;
}

export interface ScheduleInputSnapshotEmployeeConstraint {
  employeeId: string;
  date: string;
  isLocked: boolean;
}

export interface ScheduleInputSnapshotShiftRule {
  id: string;
  code: string;
  startTime: string;
  endTime: string;
}

export interface ScheduleInputSnapshotHospitalRules {
  organizationType: string;
  shifts: ScheduleInputSnapshotShiftRule[];
  lastHistoricalDate: string;
  firstDraftDate: string;
  publishLength: number;
  draftLength: number;
}

export interface ScheduleInputSnapshotMonthlyRequirement {
  shiftId: string;
  dayIndex: number;
  employeeCount: number;
}

export interface ScheduleInputSnapshotSolverInput {
  scheduleId: string;
  organizationId: string;
  siteId: string | null;
  month: string;
  lastMonthDays: number;
  employees: ScheduleInputSnapshotEmployee[];
  assignments: ScheduleInputSnapshotAssignment[];
  employeeConstraints: ScheduleInputSnapshotEmployeeConstraint[];
  hospitalRules: ScheduleInputSnapshotHospitalRules;
  monthlyRequirements: ScheduleInputSnapshotMonthlyRequirement[];
}

export interface ScheduleInputSnapshot {
  solverInputHash: string;
  solverInput: ScheduleInputSnapshotSolverInput;
  generatorVersion: string;
  createdAt: string;
}

export interface ScheduleCompareMetrics {
  offRequestReflectionRate: number | null;
  nightShiftMin: number | null;
  nightShiftMax: number | null;
  weekendShiftMin: number | null;
  weekendShiftMax: number | null;
  manualEditCount: number;
}

export interface ScheduleProofSummary {
  weeklyHoursViolations: number;
  nnnViolations: number;
  nodViolations: number;
  minimumRestViolations: number;
  staffingShortfalls: number;
}

export interface SchedulePrimaryAction {
  kind: SchedulePrimaryActionKind;
  targetVersionId: string | null;
  label: string;
  disabledReason: string | null;
}

export interface ScheduleViolationDetail {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  affectedEmployeeIds: string[];
  dates: string[];
  metadata: Record<string, unknown>;
}

export interface ScheduleOffRequestResult {
  employeeId: string;
  date: string;
  requestCode: ConstraintCode;
  requestNote: string | null;
  isSoft: boolean;
  resolutionStatus: PreferenceStatus;
  resolvedShiftId: string | null;
  resolvedAt: string | null;
  fulfilled: boolean;
  reason: string | null;
}

export interface ScheduleInfeasibility {
  summary: string;
  reason: string;
  details: Record<string, unknown>;
}

export interface SchedulePreference {
  id: string;
  schedule_id: string;
  schedule_version_id?: string;
  employee_id: string;
  date: string;
  request_code: ConstraintCode;
  request_note: string | null;
  is_soft: boolean;
  resolution_status: PreferenceStatus;
  resolved_shift_id: string | null;
  resolved_at: string | null;
  policy_check_status: string | null;
  policy_rejection_reason: string | null;
  created_at?: string;
  updated_at?: string;
}

// Version summary is used by ensure/compare/list responses and must work before evaluation exists.
export interface ScheduleVersionSummary {
  id: string;
  scheduleId: string;
  versionNo: number;
  name: string | null;
  sourceType: ScheduleVersionSourceType;
  baseVersionId: string | null;
  status: ScheduleVersionStatus;
  currentRevision: number;
  manualEditCount: number;
  inputDiffSummary: ScheduleInputDiffSummary;
  latestEvaluationId: string | null;
  latestEvaluationResultStatus: ScheduleEvaluationResultStatus | null;
  comparisonMetrics: ScheduleCompareMetrics | null;
  finalizationGate: ScheduleFinalizationGate | null;
  activeSolverExecutionId: string | null;
  isSelected: boolean;
  isFinalized: boolean;
  archivedAt?: string | null;
}

export interface ScheduleEvaluation {
  id: string;
  scheduleId: string;
  scheduleVersionId: string;
  revisionNo: number;
  resultStatus: ScheduleEvaluationResultStatus;
  proofSummary: ScheduleProofSummary;
  violationDetails: ScheduleViolationDetail[];
  infeasibility: ScheduleInfeasibility | null;
  offRequestResults: ScheduleOffRequestResult[];
  comparisonMetrics: ScheduleCompareMetrics;
  finalizationGate: ScheduleFinalizationGate;
  assignmentHash: string;
  solverExecutionId: string | null;
  evaluatorVersion: string;
  createdAt: string;
}

export interface ScheduleCompareResponse {
  scheduleId: string;
  schedulePublicId: string;
  organizationId: string;
  month: string;
  selectedVersionId: string | null;
  finalizedVersionId: string | null;
  activeSolvingVersionId: string | null;
  versions: ScheduleVersionSummary[];
}

export interface CreateScheduleVersionRequest {
  baseVersionId: string;
  name: string;
  creationMode: 'new' | 'overwrite';
  overwriteVersionId?: string;
  sourceType: ScheduleVersionSourceType;
  inputDiffSummary: ScheduleInputDiffSummary;
  inputSnapshot?: ScheduleInputSnapshot;
}

export interface CreateScheduleVersionResponse {
  scheduleId: string;
  schedulePublicId: string;
  organizationId: string;
  month: string;
  createdVersionId: string;
  wasCreated: boolean;
  selectedVersionId: string | null;
  finalizedVersionId: string | null;
  versions: ScheduleVersionSummary[];
}

export interface DeleteScheduleVersionRequest {
  replacementSelectedVersionId?: string;
}

export type DeleteScheduleVersionResponse = ScheduleCompareResponse;

export interface ScheduleVersionSolveRequest {
  solverExecutionId: string;
  inputSnapshot?: ScheduleInputSnapshot;
}

export interface ScheduleVersionSolveResponse {
  scheduleVersionId: string;
  status: ScheduleVersionStatus;
  solverExecutionId: string;
}

export interface ScheduleVersionScore {
  hardScore: number;
  softScore: number;
}

export interface ScheduleVersionAssignmentChange {
  employeeId: string;
  date: string;
  shiftId: string | null;
  comment?: string | null;
  offReason?: string | null;
  isLocked?: boolean;
}

export interface ScheduleVersionSolverResultRequest {
  status: 'completed' | 'failed';
  assignments?: ScheduleVersionAssignmentChange[];
  score?: ScheduleVersionScore | null;
  failureReason?: string | null;
  failureType?: string | null;
  failureContext?: Record<string, unknown> | null;
  solverExecutionId: string;
}

export interface ScheduleVersionSolverResultResponse {
  scheduleVersionId: string;
  status: ScheduleVersionStatus;
  solverExecutionId: string | null;
  hardScore: number | null;
  softScore: number | null;
  failureReason: string | null;
}

export interface PatchScheduleVersionAssignmentsRequest {
  changes: ScheduleVersionAssignmentChange[];
}

export interface PatchScheduleVersionAssignmentsResponse {
  scheduleVersionId: string;
  status: ScheduleVersionStatus;
  currentRevision: number;
  manualEditCount: number;
  changedCells: number;
}

export interface ScheduleVersionRecheckResponse {
  scheduleVersionId: string;
  currentRevision: number;
  evaluationId: string;
  resultStatus: ScheduleVersionStatus;
  evaluationResultStatus: ScheduleEvaluationResultStatus;
}

export interface ScheduleVersionFinalizeResponse {
  scheduleId: string;
  scheduleVersionId: string;
  status: ScheduleVersionStatus;
  finalizedVersionId: string;
  finalizedAt: string;
  finalizedBy: string | null;
}

export interface ResetScheduleRosterRequest {
  organizationId: string;
  month: string;
  employees: EmployeeInput[];
}

export interface ResetScheduleRosterResponse {
  deletedScheduleId: string | null;
  employeeCount: number;
}

export interface DeleteGeneratedResultsRequest {
  sourceVersionId: string;
}

export type DeleteGeneratedResultsResponse = ScheduleCompareResponse;

export interface DeleteScheduleMonthRequest {
  organizationId: string;
  month: string;
}

export interface DeleteScheduleMonthResponse {
  deletedScheduleId: string | null;
}

export interface ResetScheduleActiveFlowResponse {
  scheduleId: string;
  schedulePublicId: string;
  organizationId: string;
  month: string;
  selectedVersionId: string | null;
  finalizedVersionId: string | null;
  activeSolvingVersionId: string | null;
  versions: ScheduleVersionSummary[];
}

export interface ScheduleReviewResponse {
  scheduleId: string;
  selectedVersionId: string | null;
  finalizedVersionId: string | null;
  version: ScheduleVersionSummary;
  latestEvaluation: ScheduleEvaluation | null;
  primaryAction: SchedulePrimaryAction;
  defaultTab: ScheduleReviewTab;
}

// Off 사유 상수
export const OFF_REASONS = {
  VACATION: '휴가',
  TRAINING: '교육',
  SICK: '병가',
  OTHER: '기타',
} as const;

export type OffReasonType = keyof typeof OFF_REASONS;

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

// Planning Payload 타입 정의
export interface PlanningOrganization {
  id: string;
  name: string;
  type: string;
  shifts: PlanningShift[]; // Moved from top-level
  lastHistoricalDate: string; // "2025-11-26"
  firstDraftDate: string; // "2025-12-01"
  publishLength: number; // 4
  draftLength: number; // 31
}

export interface PlanningShift {
  id: string; // Add ID for linkage
  code: string;
  name: string;
  start_time: string;
  end_time: string;
}

export interface PlanningEmployee {
  employee_id: string;
  name: string;
  available_shifts: string[];
}

export interface PlanningAssignment {
  employee_id: string;
  shift_id: string;
  date: string;
  is_locked: boolean;
}

export interface PlanningPayload {
  organization: PlanningOrganization;
  // shifts: PlanningShift[]; // Removed
  employees: PlanningEmployee[];
  assignments: PlanningAssignment[];
  requirements: SiteRequirements; // 날짜별 요구사항
}

// API 요청용 타입 (API_DOCUMENTATION.md 기준)
export interface SolverRequestEmployee {
  employee_id: string;
  name: string;
  available_shifts: string[];
  skill_set: string[]; // 예: ["ALL"]
}

export interface SolverRequestHistoryItem {
  employee_id: string;
  shift_id: string;
  date: string; // "YYYY-MM-DD"
  is_locked: boolean; // true: 변경 불가
}

export interface SolverRequestUndesirableItem {
  employee_id: string;
  date: string; // "YYYY-MM-DD"
  is_locked: boolean; // false: 권장 사항 (soft constraint)
}

export interface SolverRequestRequirementItem {
  shiftId: string; // shift UUID
  dayIndex: number; // 0 = 스케줄 시작일 (firstDraftDate) 기준
  employeeCount: number;
}

export interface SolverRequest {
  organization: {
    id: string;
    name: string;
    type: string;
    shifts: PlanningShift[];
    lastHistoricalDate: string;
    firstDraftDate: string;
    publishLength: number;
    draftLength: number;
  };
  employees: SolverRequestEmployee[];
  history: SolverRequestHistoryItem[];
  undesirable: SolverRequestUndesirableItem[];
  requirements: SolverRequestRequirementItem[];
}

// API 응답 타입
export interface SolverStatusResponse {
  execution_id: string;
  tenant_id?: string;
  organization_name?: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  score?: SolverApiScore;
  result?: SolverResult;
  error_message?: string | null;
  failure_type?: string | null;
  failure_context?: Record<string, unknown> | null;
  failureType?: string | null;
  failureContext?: Record<string, unknown> | null;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
}

export interface SolverApiScore {
  hard_score: number;
  soft_score?: number | null;
  undesired_soft_score?: number | null;
  fair_soft_score?: number | null;
  desired_soft_score?: number | null;
  legacy_soft_score_total?: number | null;
}

export interface SolverResultEmployee {
  id: string;
  name: string;
  skillSet: string[];
  availableShift: string[];
}

export interface ShiftAssignmentItem {
  id: number;
  start: string;
  end: string;
  location?: string;
  requiredSkill?: string;
  employee: SolverResultEmployee;
  pinned: boolean; // boolean
  supabaseId: string; // shift id
  shiftCode?: string;
  shiftId?: string;
}

export interface AvailabilityItem {
    id: number;
    employee: SolverResultEmployee;
    date: string;
    availabilityType: string;
}

export interface SolverResult {
  availabilityList: AvailabilityItem[];
  employeeList: any[]; 
  shiftList: ShiftAssignmentItem[];
  score: SolverApiScore;
  scheduleState: any;
}
