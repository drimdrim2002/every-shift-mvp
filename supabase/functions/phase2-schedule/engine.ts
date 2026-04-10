import type {
  CreateVersionRequest,
  type ScheduleCompareMetrics,
  type ScheduleEvaluationResultStatus,
  type ScheduleFinalizationGate,
  type ScheduleInfeasibility,
  type ScheduleOffRequestResult,
  type ScheduleProofSummary,
  ScheduleVersionAssignmentChange,
  type ScheduleViolationDetail,
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
  policy_check_status?: string | null;
  policy_rejection_reason?: string | null;
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

export interface EvaluationAssignmentInput {
  employeeId: string;
  date: string;
  shiftId: string;
  isLocked: boolean;
}

export interface EvaluationPreferenceInput {
  employeeId: string;
  date: string;
  requestCode: string;
  requestNote: string | null;
  isSoft: boolean;
  resolutionStatus: string;
  resolvedShiftId: string | null;
  resolvedAt: string | null;
  policyCheckStatus?: string | null;
  policyRejectionReason?: string | null;
}

export interface EvaluationSiteRequirementInput {
  dayOfWeek: number;
  shiftId: string;
  requiredCount: number;
}

export interface EvaluationShiftInput {
  id: string;
  code: string;
}

export interface EvaluationEmployeeInput {
  id: string;
}

export interface EvaluateScheduleVersionInput {
  month: string;
  manualEditCount: number;
  assignments: EvaluationAssignmentInput[];
  preferences: EvaluationPreferenceInput[];
  siteRequirements: EvaluationSiteRequirementInput[];
  shifts: EvaluationShiftInput[];
  employees: EvaluationEmployeeInput[];
  forcedResultStatus?: ScheduleEvaluationResultStatus | null;
  failureReason?: string | null;
  failureType?: string | null;
  failureContext?: Record<string, unknown> | null;
}

export interface EvaluatedTrustResult {
  assignmentHash: string;
  resultStatus: ScheduleEvaluationResultStatus;
  proofSummary: ScheduleProofSummary;
  violationDetails: ScheduleViolationDetail[];
  infeasibility: ScheduleInfeasibility | null;
  offRequestResults: ScheduleOffRequestResult[];
  comparisonMetrics: ScheduleCompareMetrics;
  finalizationGate: ScheduleFinalizationGate;
}

const TRUST_EVALUATOR_VERSION = 'phase2a-trust-gate-v1';

function toDateKey(day: Date): string {
  return day.toISOString().slice(0, 10);
}

function parseDateUtc(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function getDayOfWeekUtc(date: string): number {
  return parseDateUtc(date).getUTCDay();
}

function enumerateMonthDates(month: string): string[] {
  const { startDate, endDate } = getMonthDateRange(month);
  const dates: string[] = [];
  let cursor = parseDateUtc(startDate);
  const end = parseDateUtc(endDate);

  while (cursor <= end) {
    dates.push(toDateKey(cursor));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }

  return dates;
}

function getFailureSummary(
  failureReason: string | null | undefined,
  fallback: string
): string {
  if (typeof failureReason === 'string' && failureReason.trim().length > 0) {
    return failureReason.trim();
  }

  return fallback;
}

function buildInfeasibilityArtifact(
  resultStatus: ScheduleEvaluationResultStatus,
  failureReason: string | null | undefined,
  failureType: string | null | undefined,
  failureContext: Record<string, unknown> | null | undefined
): ScheduleInfeasibility | null {
  if (resultStatus !== 'infeasible' && resultStatus !== 'solve_failed') {
    return null;
  }

  return {
    summary: getFailureSummary(
      failureReason,
      resultStatus === 'solve_failed'
        ? 'Solver execution failed for this version.'
        : 'No feasible schedule exists for the current input.'
    ),
    reason: failureType ?? resultStatus,
    details: failureContext ?? {},
  };
}

function buildGateForResult(
  resultStatus: ScheduleEvaluationResultStatus
): ScheduleFinalizationGate {
  if (resultStatus === 'passed') {
    return {
      allowed: true,
      blockingReasons: [],
    };
  }

  if (resultStatus === 'review_blocked') {
    return {
      allowed: false,
      blockingReasons: [
        {
          code: 'hard_constraints_violated',
          message: 'Hard-constraint violations were detected. Recheck after fixing assignments.',
        },
      ],
    };
  }

  if (resultStatus === 'infeasible') {
    return {
      allowed: false,
      blockingReasons: [
        {
          code: 'infeasible',
          message: 'No feasible schedule exists for the current input conditions.',
        },
      ],
    };
  }

  return {
    allowed: false,
    blockingReasons: [
      {
        code: 'solve_failed',
        message: 'Solver execution failed. Retry before finalization.',
      },
    ],
  };
}

async function sha256Hex(value: string): Promise<string> {
  const payload = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', payload);
  const bytes = new Uint8Array(digest);
  const hex = Array.from(bytes)
    .map((chunk) => chunk.toString(16).padStart(2, '0'))
    .join('');
  return `sha256:${hex}`;
}

async function computeAssignmentHash(assignments: EvaluationAssignmentInput[]): Promise<string> {
  const normalized = assignments
    .map((assignment) => ({
      employeeId: assignment.employeeId,
      date: assignment.date,
      shiftId: assignment.shiftId,
      isLocked: assignment.isLocked,
    }))
    .sort((a, b) => {
      const employeeDiff = a.employeeId.localeCompare(b.employeeId);
      if (employeeDiff !== 0) return employeeDiff;
      const dateDiff = a.date.localeCompare(b.date);
      if (dateDiff !== 0) return dateDiff;
      return a.shiftId.localeCompare(b.shiftId);
    });

  return sha256Hex(JSON.stringify(normalized));
}

function roundTo4(value: number): number {
  return Number(value.toFixed(4));
}

function buildOffRequestResults(
  preferences: EvaluationPreferenceInput[],
  assignmentByCell: Map<string, EvaluationAssignmentInput>,
  shiftCodeById: Map<string, string>
): ScheduleOffRequestResult[] {
  const results: ScheduleOffRequestResult[] = [];

  for (const preference of preferences) {
    if (preference.requestCode !== 'O') {
      continue;
    }

    const assignment = assignmentByCell.get(`${preference.employeeId}:${preference.date}`) ?? null;
    const assignedShiftCode = assignment ? shiftCodeById.get(assignment.shiftId) ?? null : null;
    const fulfilled = assignedShiftCode === 'O';
    const policyRejected = preference.policyCheckStatus === 'rejected';
    const policyRejectionReason = preference.policyRejectionReason?.trim() || null;

    results.push({
      employeeId: preference.employeeId,
      date: preference.date,
      requestCode: 'O',
      requestNote: preference.requestNote,
      isSoft: preference.isSoft,
      resolutionStatus: fulfilled ? 'fulfilled' : 'unfulfilled',
      resolvedShiftId: assignment?.shiftId ?? null,
      resolvedAt: fulfilled || assignment ? new Date().toISOString() : null,
      fulfilled,
      reason: fulfilled
        ? '요청된 Off가 반영되었습니다.'
        : policyRejected && policyRejectionReason
          ? policyRejectionReason
        : '요청된 Off가 배정되지 않았습니다.',
    });
  }

  return results;
}

function buildComparisonMetrics(
  employees: EvaluationEmployeeInput[],
  assignments: EvaluationAssignmentInput[],
  offRequestResults: ScheduleOffRequestResult[],
  shiftCodeById: Map<string, string>,
  manualEditCount: number
): ScheduleCompareMetrics {
  const totalOffRequests = offRequestResults.length;
  const fulfilledOffRequests = offRequestResults.filter((result) => result.fulfilled).length;

  const employeeIds = employees.map((employee) => employee.id);
  const nightCountByEmployee = new Map<string, number>();
  const weekendCountByEmployee = new Map<string, number>();

  for (const employeeId of employeeIds) {
    nightCountByEmployee.set(employeeId, 0);
    weekendCountByEmployee.set(employeeId, 0);
  }

  for (const assignment of assignments) {
    if (!nightCountByEmployee.has(assignment.employeeId)) {
      nightCountByEmployee.set(assignment.employeeId, 0);
      weekendCountByEmployee.set(assignment.employeeId, 0);
    }

    const shiftCode = shiftCodeById.get(assignment.shiftId) ?? null;
    if (shiftCode === 'N') {
      nightCountByEmployee.set(
        assignment.employeeId,
        (nightCountByEmployee.get(assignment.employeeId) ?? 0) + 1
      );
    }

    const dayOfWeek = getDayOfWeekUtc(assignment.date);
    if ((dayOfWeek === 0 || dayOfWeek === 6) && shiftCode !== 'O') {
      weekendCountByEmployee.set(
        assignment.employeeId,
        (weekendCountByEmployee.get(assignment.employeeId) ?? 0) + 1
      );
    }
  }

  const nightValues = Array.from(nightCountByEmployee.values());
  const weekendValues = Array.from(weekendCountByEmployee.values());

  return {
    offRequestReflectionRate:
      totalOffRequests > 0 ? roundTo4(fulfilledOffRequests / totalOffRequests) : null,
    nightShiftMin: nightValues.length > 0 ? Math.min(...nightValues) : null,
    nightShiftMax: nightValues.length > 0 ? Math.max(...nightValues) : null,
    weekendShiftMin: weekendValues.length > 0 ? Math.min(...weekendValues) : null,
    weekendShiftMax: weekendValues.length > 0 ? Math.max(...weekendValues) : null,
    manualEditCount,
  };
}

function buildStaffingViolations(
  month: string,
  assignments: EvaluationAssignmentInput[],
  siteRequirements: EvaluationSiteRequirementInput[]
): {
  proofSummary: ScheduleProofSummary;
  violationDetails: ScheduleViolationDetail[];
} {
  const assignmentCountByDateShift = new Map<string, number>();
  const monthDates = enumerateMonthDates(month);

  for (const assignment of assignments) {
    const key = `${assignment.date}:${assignment.shiftId}`;
    assignmentCountByDateShift.set(key, (assignmentCountByDateShift.get(key) ?? 0) + 1);
  }

  let staffingShortfalls = 0;
  const violationDetails: ScheduleViolationDetail[] = [];

  for (const date of monthDates) {
    const dayOfWeek = getDayOfWeekUtc(date);
    const requirementsForDay = siteRequirements.filter((row) => row.dayOfWeek === dayOfWeek);

    for (const requirement of requirementsForDay) {
      const assignedCount = assignmentCountByDateShift.get(`${date}:${requirement.shiftId}`) ?? 0;
      if (assignedCount >= requirement.requiredCount) {
        continue;
      }

      const shortfall = requirement.requiredCount - assignedCount;
      staffingShortfalls += shortfall;

      violationDetails.push({
        code: 'staffing_shortfall',
        message: `Staffing shortfall on ${date}: required ${requirement.requiredCount}, assigned ${assignedCount}.`,
        severity: 'error',
        affectedEmployeeIds: [],
        dates: [date],
        metadata: {
          shiftId: requirement.shiftId,
          requiredCount: requirement.requiredCount,
          assignedCount,
          shortfall,
        },
      });
    }
  }

  return {
    proofSummary: {
      weeklyHoursViolations: 0,
      nnnViolations: 0,
      nodViolations: 0,
      minimumRestViolations: 0,
      staffingShortfalls,
    },
    violationDetails,
  };
}

export function getTrustEvaluatorVersion(): string {
  return TRUST_EVALUATOR_VERSION;
}

export async function evaluateScheduleTrust(
  input: EvaluateScheduleVersionInput
): Promise<EvaluatedTrustResult> {
  const shiftCodeById = new Map(input.shifts.map((shift) => [shift.id, shift.code]));
  const assignmentByCell = new Map(
    input.assignments.map((assignment) => [`${assignment.employeeId}:${assignment.date}`, assignment])
  );

  const assignmentHash = await computeAssignmentHash(input.assignments);
  const { proofSummary, violationDetails } = buildStaffingViolations(
    input.month,
    input.assignments,
    input.siteRequirements
  );
  const offRequestResults = buildOffRequestResults(
    input.preferences,
    assignmentByCell,
    shiftCodeById
  );
  const comparisonMetrics = buildComparisonMetrics(
    input.employees,
    input.assignments,
    offRequestResults,
    shiftCodeById,
    input.manualEditCount
  );

  const forcedResultStatus = input.forcedResultStatus ?? null;
  const resultStatus: ScheduleEvaluationResultStatus = forcedResultStatus
    ?? (proofSummary.staffingShortfalls > 0 ? 'review_blocked' : 'passed');
  const infeasibility = buildInfeasibilityArtifact(
    resultStatus,
    input.failureReason,
    input.failureType,
    input.failureContext
  );
  const finalizationGate = buildGateForResult(resultStatus);

  return {
    assignmentHash,
    resultStatus,
    proofSummary,
    violationDetails,
    infeasibility,
    offRequestResults,
    comparisonMetrics,
    finalizationGate,
  };
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
    policy_check_status: null,
    policy_rejection_reason: null,
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
