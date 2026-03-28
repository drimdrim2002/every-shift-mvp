import type {
  CreateVersionRequest,
  ScheduleVersionAssignmentChange,
} from './contracts.ts';

interface SchedulePreferenceRow {
  schedule_id: string;
  schedule_version_id: string | null;
  employee_id: string;
  date: string;
  request_code: string;
  request_note: string | null;
  is_soft: boolean;
  resolution_status: string;
  resolved_shift_id: string | null;
  resolved_at: string | null;
  request_source?: string | null;
}

interface ScheduleAssignmentRow {
  id?: string;
  schedule_id: string;
  schedule_version_id: string | null;
  employee_id: string;
  shift_id: string;
  date: string;
  is_locked: boolean | null;
  off_reason?: string | null;
  comment?: string | null;
  edited_by?: string | null;
  edited_at?: string | null;
}

export interface AssignmentIdentityRow {
  id: string;
  employee_id: string;
  date: string;
}

export interface MonthDateRange {
  startDate: string;
  endDate: string;
}

export function getMonthDateRange(month: string): MonthDateRange {
  const [year, monthPart] = month.split('-');
  const lastDay = new Date(Number(year), Number(monthPart), 0).getDate();

  return {
    startDate: `${month}-01`,
    endDate: `${month}-${String(lastDay).padStart(2, '0')}`,
  };
}

export function buildVersionInsertPayload(
  scheduleId: string,
  versionNo: number,
  createdBy: string,
  request: CreateVersionRequest
) {
  return {
    schedule_id: scheduleId,
    version_no: versionNo,
    name: request.name,
    source_type: request.sourceType,
    base_version_id: request.baseVersionId,
    current_revision: 0,
    status: 'draft',
    input_diff_summary: request.inputDiffSummary,
    manual_edit_count: 0,
    latest_evaluation_id: null,
    active_solver_execution_id: null,
    created_by: createdBy,
  };
}

export function cloneSchedulePreferences(
  scheduleId: string,
  targetVersionId: string,
  rows: SchedulePreferenceRow[]
) {
  return rows.map((row) => ({
    schedule_id: scheduleId,
    schedule_version_id: targetVersionId,
    employee_id: row.employee_id,
    date: row.date,
    request_code: row.request_code,
    request_note: row.request_note,
    is_soft: row.is_soft,
    resolution_status: row.resolution_status,
    resolved_shift_id: row.resolved_shift_id,
    resolved_at: row.resolved_at,
    request_source: row.request_source ?? 'employee_off',
  }));
}

export function cloneLockedAssignments(
  scheduleId: string,
  targetVersionId: string,
  rows: ScheduleAssignmentRow[]
) {
  return rows
    .filter((row) => row.is_locked === true)
    .map((row) => ({
      schedule_id: scheduleId,
      schedule_version_id: targetVersionId,
      employee_id: row.employee_id,
      shift_id: row.shift_id,
      date: row.date,
      is_locked: true,
      off_reason: row.off_reason ?? null,
      comment: row.comment ?? null,
      edited_by: row.edited_by ?? null,
      edited_at: row.edited_at ?? null,
    }));
}

export function buildAssignmentUpsertRows(
  scheduleId: string,
  versionId: string,
  editedBy: string,
  changes: ScheduleVersionAssignmentChange[]
) {
  const editedAt = new Date().toISOString();

  return changes
    .filter((change) => change.shiftId)
    .map((change) => ({
      schedule_id: scheduleId,
      schedule_version_id: versionId,
      employee_id: change.employeeId,
      shift_id: change.shiftId,
      date: change.date,
      is_locked: change.isLocked ?? false,
      off_reason: change.offReason ?? null,
      comment: change.comment ?? null,
      edited_by: editedBy,
      edited_at: editedAt,
    }));
}

export function filterAssignmentChangesToMonth(
  changes: ScheduleVersionAssignmentChange[],
  month: string
) {
  const { startDate, endDate } = getMonthDateRange(month);

  return changes.filter((change) => change.date >= startDate && change.date <= endDate);
}

export function buildStaleAssignmentIds(
  existingRows: AssignmentIdentityRow[],
  desiredAssignments: ScheduleVersionAssignmentChange[]
) {
  const desiredKeys = new Set(
    desiredAssignments
      .filter((assignment) => assignment.shiftId)
      .map((assignment) => `${assignment.employeeId}:${assignment.date}`)
  );

  return existingRows
    .filter((row) => !desiredKeys.has(`${row.employee_id}:${row.date}`))
    .map((row) => row.id);
}
