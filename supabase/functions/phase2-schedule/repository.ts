import {
  ContractError,
  type CompareResponse,
  type CreateVersionRequest,
  type CreateVersionResponse,
  type EnsureRequest,
  type EnsureResponse,
  type PatchAssignmentsRequest,
  type PatchAssignmentsResponse,
  type Phase2ScheduleAuthContext,
  type ReviewResponse,
  type ScheduleEvaluationResultStatus,
  type ScheduleVersionFinalizeResponse,
  type ScheduleVersionRecheckResponse,
  type ScheduleCompareMetrics,
  type ScheduleEvaluation,
  type ScheduleFinalizationGate,
  type ScheduleInputDiffSummary,
  type SchedulePrimaryAction,
  type SolveRequest,
  type SolveResponse,
  type SolverResultRequest,
  type SolverResultResponse,
  type ScheduleVersionStatus,
  type ScheduleVersionSummary,
  type SelectResponse,
} from './contracts.ts';
import {
  buildAssignmentUpsertRows,
  buildVersionInsertPayload,
  cloneLockedAssignments,
  cloneSchedulePreferences,
  evaluateScheduleTrust,
  filterAssignmentChangesToMonth,
  getMonthDateRange,
  getTrustEvaluatorVersion,
  type AssignmentIdentityRow,
} from './engine.ts';

type DbRecord = Record<string, unknown>;

interface DbError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  constraint?: string;
}

type DbQueryResult<T> = { data: T | null; error: DbError | null };

interface ScheduleRow {
  id: string;
  organization_id: string;
  month: string;
  status: string | null;
  solver_execution_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  selected_version_id: string | null;
  finalized_version_id: string | null;
  latest_version_no: number | null;
}

interface ScheduleVersionRow {
  id: string;
  schedule_id: string;
  version_no: number;
  name: string | null;
  source_type: string;
  base_version_id: string | null;
  current_revision: number;
  status: string;
  input_diff_summary: unknown;
  manual_edit_count: number;
  latest_evaluation_id: string | null;
  active_solver_execution_id?: string | null;
}

interface ApplyScheduleVersionSolverResultRow {
  schedule_version_id: string;
  status: string;
  active_solver_execution_id: string | null;
  hard_score: number | null;
  soft_score: number | null;
  failure_reason: string | null;
}

interface SaveScheduleVersionEvaluationAtomicRow {
  schedule_version_id: string;
  current_revision: number;
  evaluation_id: string;
  status: string;
  evaluation_result_status: string;
}

interface MarkScheduleVersionSolvingAtomicRow {
  schedule_version_id: string;
  status: string;
  active_solver_execution_id: string;
}

interface PatchScheduleVersionAssignmentsAtomicRow {
  schedule_version_id: string;
  status: string;
  current_revision: number;
  manual_edit_count: number;
  changed_cells: number;
}

interface SelectScheduleVersionAtomicRow {
  schedule_id: string;
  selected_version_id: string;
}

interface FinalizeScheduleVersionAtomicRow {
  schedule_id: string;
  schedule_version_id: string;
  status: string;
  finalized_version_id: string;
  finalized_at: string;
  finalized_by: string | null;
}

interface SchedulePreferenceRow {
  id?: string;
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

interface ScheduleAssignmentRow extends AssignmentIdentityRow {
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

interface SiteRequirementRow {
  day_of_week: number;
  shift_id: string;
  required_count: number;
}

interface ShiftRow {
  id: string;
  code: string;
}

interface EmployeeRow {
  id: string;
}

interface ScheduleEvaluationRow {
  id: string;
  schedule_id: string;
  schedule_version_id: string;
  revision_no: number;
  result_status: string;
  proof_summary: unknown;
  violation_details: unknown;
  infeasibility: unknown;
  off_request_results: unknown;
  comparison_metrics: unknown;
  finalization_gate: unknown;
  assignment_hash: string;
  solver_execution_id: string | null;
  evaluator_version: string;
  created_at: string;
}

interface LegacyAssignmentRow {
  is_locked?: boolean | null;
}

interface BootstrapSnapshotCounts {
  offRequestCount: number;
  lockedAssignmentCount: number;
}

export interface Phase2ScheduleRepositoryClient {
  from(table: string): any;
  rpc?(fn: string, params: Record<string, unknown>): any;
}

class DatabaseError extends Error {
  constructor(public readonly dbError: DbError) {
    super(dbError.message ?? 'Database query failed');
    this.name = 'DatabaseError';
  }
}

const DEFAULT_INPUT_DIFF_SUMMARY: ScheduleInputDiffSummary = {
  changedOffRequests: 0,
  changedLockedAssignments: 0,
  changedSiteRequirements: 0,
  note: null,
};

const EMPTY_BOOTSTRAP_COUNTS: BootstrapSnapshotCounts = {
  offRequestCount: 0,
  lockedAssignmentCount: 0,
};

const SCHEDULE_UNIQUE_CONSTRAINTS = ['schedules_organization_id_month_key'];
const VERSION_UNIQUE_CONSTRAINTS = ['schedule_versions_schedule_id_version_no_key'];

function asRecord(value: unknown): DbRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as DbRecord)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readFirst(record: DbRecord, keys: string[], fallback: unknown): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return record[key];
    }
  }

  return fallback;
}

function toInputDiffSummary(value: unknown): ScheduleInputDiffSummary {
  const record = asRecord(value);
  return {
    changedOffRequests:
      asNumber(readFirst(record, ['changedOffRequests', 'changed_off_requests'], 0)) ?? 0,
    changedLockedAssignments:
      asNumber(
        readFirst(record, ['changedLockedAssignments', 'changed_locked_assignments'], 0)
      ) ?? 0,
    changedSiteRequirements:
      asNumber(readFirst(record, ['changedSiteRequirements', 'changed_site_requirements'], 0)) ??
      0,
    note: asString(readFirst(record, ['note'], null)),
  };
}

function toComparisonMetrics(value: unknown): ScheduleCompareMetrics {
  const record = asRecord(value);
  return {
    offRequestReflectionRate:
      asNumber(
        readFirst(record, ['offRequestReflectionRate', 'off_request_reflection_rate'], null)
      ) ?? null,
    nightShiftMin: asNumber(readFirst(record, ['nightShiftMin', 'night_shift_min'], null)) ?? null,
    nightShiftMax: asNumber(readFirst(record, ['nightShiftMax', 'night_shift_max'], null)) ?? null,
    weekendShiftMin:
      asNumber(readFirst(record, ['weekendShiftMin', 'weekend_shift_min'], null)) ?? null,
    weekendShiftMax:
      asNumber(readFirst(record, ['weekendShiftMax', 'weekend_shift_max'], null)) ?? null,
    manualEditCount: asNumber(readFirst(record, ['manualEditCount', 'manual_edit_count'], 0)) ?? 0,
  };
}

function toFinalizationGate(value: unknown): ScheduleFinalizationGate {
  const record = asRecord(value);
  const blockingReasons = readFirst(record, ['blockingReasons', 'blocking_reasons'], []);

  return {
    allowed: Boolean(readFirst(record, ['allowed'], false)),
    blockingReasons: Array.isArray(blockingReasons)
      ? blockingReasons.map((reason) => {
          const reasonRecord = asRecord(reason);
          return {
            code: asString(readFirst(reasonRecord, ['code'], 'unknown')) ?? 'unknown',
            message: asString(readFirst(reasonRecord, ['message'], '')) ?? '',
          };
        })
      : [],
  };
}

function toEvaluation(row: ScheduleEvaluationRow): ScheduleEvaluation {
  const proofSummary = asRecord(row.proof_summary);

  return {
    id: row.id,
    scheduleId: row.schedule_id,
    scheduleVersionId: row.schedule_version_id,
    revisionNo: row.revision_no,
    resultStatus: row.result_status as ScheduleEvaluation['resultStatus'],
    proofSummary: {
      weeklyHoursViolations:
        asNumber(readFirst(proofSummary, ['weeklyHoursViolations', 'weekly_hours_violations'], 0)) ??
        0,
      nnnViolations: asNumber(readFirst(proofSummary, ['nnnViolations', 'nnn_violations'], 0)) ?? 0,
      nodViolations: asNumber(readFirst(proofSummary, ['nodViolations', 'nod_violations'], 0)) ?? 0,
      minimumRestViolations:
        asNumber(readFirst(proofSummary, ['minimumRestViolations', 'minimum_rest_violations'], 0)) ??
        0,
      staffingShortfalls:
        asNumber(readFirst(proofSummary, ['staffingShortfalls', 'staffing_shortfalls'], 0)) ?? 0,
    },
    violationDetails: Array.isArray(row.violation_details)
      ? row.violation_details.map((item) => {
          const record = asRecord(item);
          const affectedEmployeeIds = readFirst(
            record,
            ['affectedEmployeeIds', 'affected_employee_ids'],
            []
          );
          const dates = readFirst(record, ['dates'], []);

          return {
            code: asString(readFirst(record, ['code'], 'unknown')) ?? 'unknown',
            message: asString(readFirst(record, ['message'], '')) ?? '',
            severity:
              (asString(readFirst(record, ['severity'], 'info')) as 'info' | 'warning' | 'error') ??
              'info',
            affectedEmployeeIds: Array.isArray(affectedEmployeeIds)
              ? affectedEmployeeIds.flatMap((entry) => (typeof entry === 'string' ? [entry] : []))
              : [],
            dates: Array.isArray(dates)
              ? dates.flatMap((entry) => (typeof entry === 'string' ? [entry] : []))
              : [],
            metadata: asRecord(readFirst(record, ['metadata'], {})),
          };
        })
      : [],
    infeasibility:
      row.infeasibility == null
        ? null
        : {
            summary: asString(readFirst(asRecord(row.infeasibility), ['summary'], '')) ?? '',
            reason: asString(readFirst(asRecord(row.infeasibility), ['reason'], '')) ?? '',
            details: asRecord(readFirst(asRecord(row.infeasibility), ['details'], {})),
          },
    offRequestResults: Array.isArray(row.off_request_results)
      ? row.off_request_results.map((item) => {
          const record = asRecord(item);
          return {
            employeeId: asString(readFirst(record, ['employeeId', 'employee_id'], '')) ?? '',
            date: asString(readFirst(record, ['date'], '')) ?? '',
            requestCode:
              (asString(readFirst(record, ['requestCode', 'request_code'], 'O')) as 'O') ?? 'O',
            requestNote: asString(readFirst(record, ['requestNote', 'request_note'], null)),
            isSoft: Boolean(readFirst(record, ['isSoft', 'is_soft'], false)),
            resolutionStatus:
              (asString(
                readFirst(record, ['resolutionStatus', 'resolution_status'], 'pending')
              ) as 'pending' | 'fulfilled' | 'unfulfilled') ?? 'pending',
            resolvedShiftId: asString(
              readFirst(record, ['resolvedShiftId', 'resolved_shift_id'], null)
            ),
            resolvedAt: asString(readFirst(record, ['resolvedAt', 'resolved_at'], null)),
            fulfilled: Boolean(readFirst(record, ['fulfilled'], false)),
            reason: asString(readFirst(record, ['reason'], null)),
          };
        })
      : [],
    comparisonMetrics: toComparisonMetrics(row.comparison_metrics),
    finalizationGate: toFinalizationGate(row.finalization_gate),
    assignmentHash: row.assignment_hash,
    solverExecutionId: row.solver_execution_id,
    evaluatorVersion: row.evaluator_version,
    createdAt: row.created_at,
  };
}

function buildPrimaryAction(
  previewVersionId: string,
  selectedVersionId: string | null,
  version: ScheduleVersionSummary,
  latestEvaluation: ScheduleEvaluation | null
): SchedulePrimaryAction {
  if (previewVersionId !== selectedVersionId) {
    return {
      kind: 'select',
      targetVersionId: previewVersionId,
      label: 'Select this version as the finalization candidate',
      disabledReason: null,
    };
  }

  if (version.status === 'solve_failed') {
    return {
      kind: 'retry',
      targetVersionId: version.id,
      label: 'Retry',
      disabledReason: null,
    };
  }

  if (version.status === 'review_pending' || version.status === 'review_blocked') {
    return {
      kind: 'recheck',
      targetVersionId: version.id,
      label: 'Run recheck',
      disabledReason: null,
    };
  }

  if (
    version.status === 'review_ready'
    && latestEvaluation?.finalizationGate.allowed
  ) {
    return {
      kind: 'finalize',
      targetVersionId: version.id,
      label: 'Finalize this version',
      disabledReason: null,
    };
  }

  return {
    kind: 'none',
    targetVersionId: null,
    label: 'No primary action',
    disabledReason: null,
  };
}

function toVersionSummary(
  schedule: ScheduleRow,
  version: ScheduleVersionRow,
  evaluation: ScheduleEvaluation | null
): ScheduleVersionSummary {
  return {
    id: version.id,
    scheduleId: version.schedule_id,
    versionNo: version.version_no,
    name: version.name,
    sourceType: version.source_type as ScheduleVersionSummary['sourceType'],
    baseVersionId: version.base_version_id,
    status: version.status as ScheduleVersionSummary['status'],
    currentRevision: version.current_revision,
    manualEditCount: version.manual_edit_count,
    inputDiffSummary: toInputDiffSummary(version.input_diff_summary),
    latestEvaluationId: version.latest_evaluation_id,
    latestEvaluationResultStatus: evaluation?.resultStatus ?? null,
    comparisonMetrics: version.latest_evaluation_id ? evaluation?.comparisonMetrics ?? null : null,
    finalizationGate: version.latest_evaluation_id ? evaluation?.finalizationGate ?? null : null,
    activeSolverExecutionId: version.active_solver_execution_id ?? null,
    isSelected: schedule.selected_version_id === version.id,
    isFinalized: schedule.finalized_version_id === version.id,
  };
}

function isUniqueViolation(
  error: unknown,
  constraintNames: string[],
  fieldNames: string[]
): boolean {
  if (!(error instanceof DatabaseError)) {
    return false;
  }

  const { code, constraint, details, message } = error.dbError;

  if (code !== '23505') {
    return false;
  }

  if (constraint && constraintNames.includes(constraint)) {
    return true;
  }

  const haystack = `${details ?? ''} ${message ?? ''}`.toLowerCase();
  return fieldNames.every((fieldName) => haystack.includes(fieldName.toLowerCase()));
}

async function maybeSingle<T>(query: any): Promise<T | null> {
  const result = (await query.maybeSingle()) as DbQueryResult<T>;

  if (result.error) {
    throw new DatabaseError(result.error);
  }

  return result.data;
}

async function single<T>(query: any): Promise<T> {
  const result = (await query.single()) as DbQueryResult<T>;

  if (result.error) {
    throw new DatabaseError(result.error);
  }

  if (!result.data) {
    throw new Error('Expected a single row but query returned no data');
  }

  return result.data;
}

async function list<T>(query: any): Promise<T[]> {
  const result = (await query) as DbQueryResult<T[]>;

  if (result.error) {
    throw new DatabaseError(result.error);
  }

  return result.data ?? [];
}

async function run(query: any): Promise<void> {
  const result = (await query) as DbQueryResult<unknown>;

  if (result.error) {
    throw new DatabaseError(result.error);
  }
}

async function rpcSingle<T>(
  client: Phase2ScheduleRepositoryClient,
  fn: string,
  params: Record<string, unknown>
): Promise<T> {
  if (typeof client.rpc !== 'function') {
    throw new Error(`Repository client does not implement rpc(${fn})`);
  }

  const result = (await client.rpc(fn, params)) as DbQueryResult<T | T[]>;

  if (result.error) {
    throw new DatabaseError(result.error);
  }

  if (Array.isArray(result.data)) {
    const [firstRow] = result.data;

    if (!firstRow) {
      throw new Error(`Expected rpc ${fn} to return a row`);
    }

    return firstRow;
  }

  if (!result.data) {
    throw new Error(`Expected rpc ${fn} to return data`);
  }

  return result.data;
}

function remapSlice5RpcConflict(error: unknown): never {
  if (error instanceof DatabaseError) {
    const { code, constraint, details, message } = error.dbError;

    if (message === 'solver_execution_mismatch') {
      throw new ContractError(
        'solver_execution_mismatch',
        'Solver execution no longer matches the active version run',
        409
      );
    }

    if (message === 'stale_solver_callback') {
      throw new ContractError(
        'stale_solver_callback',
        'Solver callback no longer applies to the current version state',
        409
      );
    }

    if (
      message === 'another_version_solving'
      || (code === '23505'
        && `${constraint ?? ''} ${details ?? ''} ${message ?? ''}`.includes(
          'schedule_versions_single_running_per_schedule'
        ))
    ) {
      throw new ContractError(
        'another_version_solving',
        'Another version is already solving for this schedule',
        409
      );
    }
  }

  throw error;
}

function isAmbiguousScoreColumnError(error: unknown): boolean {
  if (!(error instanceof DatabaseError)) {
    return false;
  }

  const haystack = `${error.dbError.message ?? ''} ${error.dbError.details ?? ''}`.toLowerCase();
  return haystack.includes('column reference') && haystack.includes('hard_score') && haystack.includes('ambiguous');
}

function isInfeasibleFailureType(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === 'infeasible'
    || normalized === 'no_feasible_solution'
    || normalized === 'unsat'
    || normalized === 'no_solution';
}

async function loadEvaluationAssignmentRows(
  client: Phase2ScheduleRepositoryClient,
  versionId: string,
  month: string
): Promise<ScheduleAssignmentRow[]> {
  const { startDate, endDate } = getMonthDateRange(month);
  return list<ScheduleAssignmentRow>(
    client
      .from('schedule_assignments')
      .select('employee_id, date, shift_id, is_locked')
      .eq('schedule_version_id', versionId)
      .gte('date', startDate)
      .lte('date', endDate)
  );
}

async function loadEvaluationPreferenceRows(
  client: Phase2ScheduleRepositoryClient,
  versionId: string,
  month: string
): Promise<SchedulePreferenceRow[]> {
  const { startDate, endDate } = getMonthDateRange(month);
  return list<SchedulePreferenceRow>(
    client
      .from('schedule_preferences')
      .select(
        'employee_id, date, request_code, request_note, is_soft, resolution_status, resolved_shift_id, resolved_at'
      )
      .eq('schedule_version_id', versionId)
      .gte('date', startDate)
      .lte('date', endDate)
  );
}

async function loadSiteRequirementRows(
  client: Phase2ScheduleRepositoryClient,
  organizationId: string
): Promise<SiteRequirementRow[]> {
  return list<SiteRequirementRow>(
    client
      .from('site_requirements')
      .select('day_of_week, shift_id, required_count')
      .eq('organization_id', organizationId)
  );
}

async function loadShiftRows(
  client: Phase2ScheduleRepositoryClient,
  organizationId: string
): Promise<ShiftRow[]> {
  return list<ShiftRow>(
    client
      .from('shifts')
      .select('id, code')
      .eq('organization_id', organizationId)
  );
}

async function loadEmployeeRows(
  client: Phase2ScheduleRepositoryClient,
  organizationId: string
): Promise<EmployeeRow[]> {
  return list<EmployeeRow>(
    client
      .from('employees')
      .select('id')
      .eq('organization_id', organizationId)
  );
}

async function buildVersionEvaluation(
  client: Phase2ScheduleRepositoryClient,
  schedule: ScheduleRow,
  version: ScheduleVersionRow,
  options?: {
    forcedResultStatus?: ScheduleEvaluationResultStatus | null;
    failureReason?: string | null;
    failureType?: string | null;
    failureContext?: Record<string, unknown> | null;
  }
) {
  const [assignments, preferences, siteRequirements, shifts, employees] = await Promise.all([
    loadEvaluationAssignmentRows(client, version.id, schedule.month),
    loadEvaluationPreferenceRows(client, version.id, schedule.month),
    loadSiteRequirementRows(client, schedule.organization_id),
    loadShiftRows(client, schedule.organization_id),
    loadEmployeeRows(client, schedule.organization_id),
  ]);

  return evaluateScheduleTrust({
    month: schedule.month,
    manualEditCount: version.manual_edit_count,
    assignments: assignments.map((row) => ({
      employeeId: row.employee_id,
      date: row.date,
      shiftId: row.shift_id,
      isLocked: row.is_locked === true,
    })),
    preferences: preferences.map((row) => ({
      employeeId: row.employee_id,
      date: row.date,
      requestCode: row.request_code,
      requestNote: row.request_note,
      isSoft: row.is_soft,
      resolutionStatus: row.resolution_status,
      resolvedShiftId: row.resolved_shift_id,
      resolvedAt: row.resolved_at,
    })),
    siteRequirements: siteRequirements.map((row) => ({
      dayOfWeek: row.day_of_week,
      shiftId: row.shift_id,
      requiredCount: row.required_count,
    })),
    shifts: shifts.map((row) => ({
      id: row.id,
      code: row.code,
    })),
    employees: employees.map((row) => ({
      id: row.id,
    })),
    forcedResultStatus: options?.forcedResultStatus ?? null,
    failureReason: options?.failureReason ?? null,
    failureType: options?.failureType ?? null,
    failureContext: options?.failureContext ?? null,
  });
}

function remapTrustGateRpcConflict(error: unknown): never {
  if (error instanceof DatabaseError) {
    const { message } = error.dbError;
    if (message === 'version_not_found') {
      throw new ContractError('version_not_found', 'Version not found', 404);
    }
    if (message === 'already_finalized') {
      throw new ContractError('already_finalized', 'Schedule is already finalized', 409);
    }
    if (message === 'version_locked_for_solving') {
      throw new ContractError(
        'version_locked_for_solving',
        'Version is locked while solving is active',
        409
      );
    }
    if (message === 'stale_evaluation') {
      throw new ContractError('stale_evaluation', 'Evaluation is stale', 409);
    }
    if (message === 'review_not_passed') {
      throw new ContractError('review_not_passed', 'Latest evaluation did not pass review', 409);
    }
    if (message === 'gate_blocked') {
      throw new ContractError('gate_blocked', 'Finalization gate is blocked', 409);
    }
    if (message === 'not_selected_version') {
      throw new ContractError(
        'not_selected_version',
        'Finalize target must match selected_version_id',
        409
      );
    }
  }

  throw error;
}

async function persistVersionEvaluation(
  client: Phase2ScheduleRepositoryClient,
  versionId: string,
  revisionNo: number,
  evaluation: Awaited<ReturnType<typeof evaluateScheduleTrust>>,
  solverExecutionId: string | null
): Promise<SaveScheduleVersionEvaluationAtomicRow> {
  try {
    return await rpcSingle<SaveScheduleVersionEvaluationAtomicRow>(
      client,
      'save_schedule_version_evaluation_atomic',
      {
        p_version_id: versionId,
        p_revision_no: revisionNo,
        p_result_status: evaluation.resultStatus,
        p_proof_summary: evaluation.proofSummary,
        p_violation_details: evaluation.violationDetails,
        p_infeasibility: evaluation.infeasibility,
        p_off_request_results: evaluation.offRequestResults,
        p_comparison_metrics: evaluation.comparisonMetrics,
        p_finalization_gate: evaluation.finalizationGate,
        p_assignment_hash: evaluation.assignmentHash,
        p_solver_execution_id: solverExecutionId,
        p_evaluator_version: getTrustEvaluatorVersion(),
      }
    );
  } catch (error: unknown) {
    remapTrustGateRpcConflict(error);
  }
}

async function syncVersionSolverResultWithoutRpc(
  client: Phase2ScheduleRepositoryClient,
  schedule: ScheduleRow,
  version: ScheduleVersionRow,
  auth: Phase2ScheduleAuthContext,
  monthScopedAssignments: SolverResultRequest['assignments'],
  request: SolverResultRequest
): Promise<SolverResultResponse> {
  if (version.active_solver_execution_id !== request.solverExecutionId) {
    throw new ContractError(
      'stale_solver_callback',
      'Solver callback no longer applies to the current version state',
      409
    );
  }

  const nowIso = new Date().toISOString();

  if (request.status === 'completed') {
    const { startDate, endDate } = getMonthDateRange(schedule.month);
    const assignmentRows = buildAssignmentUpsertRows(
      schedule.id,
      version.id,
      auth.userId,
      monthScopedAssignments
    );

    await run(
      client
        .from('schedule_assignments')
        .delete()
        .eq('schedule_version_id', version.id)
        .gte('date', startDate)
        .lte('date', endDate)
    );

    if (assignmentRows.length > 0) {
      await run(
        client.from('schedule_assignments').upsert(assignmentRows, {
          onConflict: 'schedule_version_id,employee_id,date',
        })
      );
    }

    if (typeof client.rpc === 'function') {
      await run(
        client.rpc('sync_schedule_version_preference_resolution', {
          p_version_id: version.id,
        })
      );
    }

    const updatedVersion = await maybeSingle<ScheduleVersionRow>(
      client
        .from('schedule_versions')
        .update({
          status: 'review_pending',
          active_solver_execution_id: null,
          updated_at: nowIso,
        })
        .eq('id', version.id)
        .eq('active_solver_execution_id', request.solverExecutionId)
        .select()
    );

    if (!updatedVersion) {
      throw new ContractError(
        'stale_solver_callback',
        'Solver callback no longer applies to the current version state',
        409
      );
    }

    await run(
      client
        .from('schedules')
        .update({
          status: 'complete',
          solver_execution_id: null,
          hard_score: request.score?.hardScore ?? null,
          soft_score: request.score?.softScore ?? null,
          updated_at: nowIso,
        })
        .eq('id', schedule.id)
    );

    return {
      scheduleVersionId: updatedVersion.id,
      status: updatedVersion.status as ScheduleVersionStatus,
      solverExecutionId: updatedVersion.active_solver_execution_id ?? null,
      hardScore: request.score?.hardScore ?? null,
      softScore: request.score?.softScore ?? null,
      failureReason: null,
    };
  }

  const updatedVersion = await maybeSingle<ScheduleVersionRow>(
    client
      .from('schedule_versions')
      .update({
        status: 'solve_failed',
        active_solver_execution_id: null,
        updated_at: nowIso,
      })
      .eq('id', version.id)
      .eq('active_solver_execution_id', request.solverExecutionId)
      .select()
  );

  if (!updatedVersion) {
    throw new ContractError(
      'stale_solver_callback',
      'Solver callback no longer applies to the current version state',
      409
    );
  }

  await run(
    client
      .from('schedules')
      .update({
        status: 'error',
        solver_execution_id: null,
        hard_score: null,
        soft_score: null,
        updated_at: nowIso,
      })
      .eq('id', schedule.id)
  );

  return {
    scheduleVersionId: updatedVersion.id,
    status: updatedVersion.status as ScheduleVersionStatus,
    solverExecutionId: updatedVersion.active_solver_execution_id ?? null,
    hardScore: null,
    softScore: null,
    failureReason: request.failureReason,
  };
}

function remapSelectRpcConflict(error: unknown): never {
  if (error instanceof DatabaseError) {
    if (error.dbError.message === 'version_not_found') {
      throw new ContractError('version_not_found', 'Version not found', 404);
    }

    if (error.dbError.message === 'already_finalized') {
      throw new ContractError('already_finalized', 'Schedule is already finalized', 409);
    }
  }

  throw error;
}

function assertOrganizationAccess(
  auth: Phase2ScheduleAuthContext,
  schedule: ScheduleRow
): void {
  if (schedule.organization_id !== auth.organizationId) {
    throw new ContractError(
      'organization_access_denied',
      'Authenticated user cannot access this organization schedule',
      403
    );
  }
}

function mapLegacyScheduleStatus(status: string | null): ScheduleVersionStatus {
  switch (status) {
    case 'running':
      return 'solving';
    case 'complete':
    case 'changed':
      return 'review_pending';
    case 'error':
      return 'solve_failed';
    case 'created':
    default:
      return 'draft';
  }
}

async function loadScheduleById(
  client: Phase2ScheduleRepositoryClient,
  scheduleId: string
): Promise<ScheduleRow | null> {
  return maybeSingle<ScheduleRow>(client.from('schedules').select('*').eq('id', scheduleId));
}

async function loadScheduleByOrgMonth(
  client: Phase2ScheduleRepositoryClient,
  organizationId: string,
  month: string
): Promise<ScheduleRow | null> {
  return maybeSingle<ScheduleRow>(
    client
      .from('schedules')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('month', month)
  );
}

async function loadVersionById(
  client: Phase2ScheduleRepositoryClient,
  versionId: string
): Promise<ScheduleVersionRow | null> {
  return maybeSingle<ScheduleVersionRow>(
    client.from('schedule_versions').select('*').eq('id', versionId)
  );
}

async function loadVersionRows(
  client: Phase2ScheduleRepositoryClient,
  scheduleId: string
): Promise<ScheduleVersionRow[]> {
  return list<ScheduleVersionRow>(
    client
      .from('schedule_versions')
      .select('*')
      .eq('schedule_id', scheduleId)
      .order('version_no', { ascending: true })
  );
}

async function loadVersionPreferenceRows(
  client: Phase2ScheduleRepositoryClient,
  versionId: string
): Promise<SchedulePreferenceRow[]> {
  return list<SchedulePreferenceRow>(
    client.from('schedule_preferences').select('*').eq('schedule_version_id', versionId)
  );
}

async function loadLockedAssignmentRows(
  client: Phase2ScheduleRepositoryClient,
  versionId: string
): Promise<ScheduleAssignmentRow[]> {
  return list<ScheduleAssignmentRow>(
    client
      .from('schedule_assignments')
      .select('*')
      .eq('schedule_version_id', versionId)
      .eq('is_locked', true)
  );
}

async function loadEvaluationById(
  client: Phase2ScheduleRepositoryClient,
  evaluationId: string
): Promise<ScheduleEvaluation | null> {
  const row = await maybeSingle<ScheduleEvaluationRow>(
    client.from('schedule_evaluations').select('*').eq('id', evaluationId)
  );

  return row ? toEvaluation(row) : null;
}

async function mapVersionSummaries(
  client: Phase2ScheduleRepositoryClient,
  schedule: ScheduleRow,
  versions: ScheduleVersionRow[]
): Promise<ScheduleVersionSummary[]> {
  return Promise.all(
    versions.map(async (version) => {
      const evaluation = version.latest_evaluation_id
        ? await loadEvaluationById(client, version.latest_evaluation_id)
        : null;

      return toVersionSummary(schedule, version, evaluation);
    })
  );
}

async function loadLegacySnapshotCounts(
  client: Phase2ScheduleRepositoryClient,
  scheduleId: string
): Promise<BootstrapSnapshotCounts> {
  const preferenceRows = await list<DbRecord>(
    client.from('schedule_preferences').select('id').eq('schedule_id', scheduleId)
  );
  const assignmentRows = await list<LegacyAssignmentRow>(
    client.from('schedule_assignments').select('is_locked').eq('schedule_id', scheduleId)
  );

  return {
    offRequestCount: preferenceRows.length,
    lockedAssignmentCount: assignmentRows.filter((row) => row.is_locked === true).length,
  };
}

function buildBootstrapVersionInsert(
  schedule: ScheduleRow,
  snapshotCounts: BootstrapSnapshotCounts,
  preserveLegacyState: boolean
): DbRecord {
  const payload: DbRecord = {
    schedule_id: schedule.id,
    version_no: 1,
    name: 'V1',
    source_type: 'initial_solve',
    base_version_id: null,
    current_revision: 0,
    status: preserveLegacyState ? mapLegacyScheduleStatus(schedule.status) : 'draft',
    input_snapshot: {
      off_request_count: snapshotCounts.offRequestCount,
      locked_assignment_count: snapshotCounts.lockedAssignmentCount,
    },
    input_diff_summary: preserveLegacyState ? {} : DEFAULT_INPUT_DIFF_SUMMARY,
    manual_edit_count: 0,
    latest_evaluation_id: null,
  };

  if (preserveLegacyState) {
    if (schedule.solver_execution_id) {
      payload.active_solver_execution_id = schedule.solver_execution_id;
    }
    if (schedule.created_at) {
      payload.created_at = schedule.created_at;
    }
    if (schedule.updated_at) {
      payload.updated_at = schedule.updated_at;
    }
  }

  return payload;
}

async function repairSelectionState(
  client: Phase2ScheduleRepositoryClient,
  schedule: ScheduleRow,
  versionId: string
): Promise<void> {
  const desiredLatestVersionNo = Math.max(schedule.latest_version_no ?? 0, 1);
  const needsSelectionRepair = schedule.selected_version_id == null;
  const needsVersionNoRepair = (schedule.latest_version_no ?? 0) < 1;

  if (!needsSelectionRepair && !needsVersionNoRepair) {
    return;
  }

  const updatePayload: DbRecord = {
    latest_version_no: desiredLatestVersionNo,
  };

  if (needsSelectionRepair) {
    updatePayload.selected_version_id = versionId;
  }

  await run(client.from('schedules').update(updatePayload).eq('id', schedule.id));
  schedule.selected_version_id = needsSelectionRepair ? versionId : schedule.selected_version_id;
  schedule.latest_version_no = desiredLatestVersionNo;
}

async function ensureScheduleContainer(
  client: Phase2ScheduleRepositoryClient,
  request: EnsureRequest
): Promise<{ schedule: ScheduleRow; existedBeforeRequest: boolean }> {
  const existingSchedule = await loadScheduleByOrgMonth(client, request.organizationId, request.month);

  if (existingSchedule) {
    return {
      schedule: existingSchedule,
      existedBeforeRequest: true,
    };
  }

  try {
    const insertedSchedule = await single<ScheduleRow>(
      client
        .from('schedules')
        .insert({
          organization_id: request.organizationId,
          month: request.month,
          status: 'created',
          selected_version_id: null,
          finalized_version_id: null,
          latest_version_no: 0,
        })
        .select()
    );

    return {
      schedule: insertedSchedule,
      existedBeforeRequest: false,
    };
  } catch (error: unknown) {
    if (!isUniqueViolation(error, SCHEDULE_UNIQUE_CONSTRAINTS, ['organization_id', 'month'])) {
      throw error;
    }

    const recoveredSchedule = await loadScheduleByOrgMonth(client, request.organizationId, request.month);

    if (!recoveredSchedule) {
      throw error;
    }

    return {
      schedule: recoveredSchedule,
      existedBeforeRequest: true,
    };
  }
}

async function ensureBootstrapVersion(
  client: Phase2ScheduleRepositoryClient,
  schedule: ScheduleRow,
  preserveLegacyState: boolean
): Promise<void> {
  const existingVersions = await loadVersionRows(client, schedule.id);
  const version1 = existingVersions.find((version) => version.version_no === 1) ?? null;

  if (version1) {
    await repairSelectionState(client, schedule, version1.id);
    return;
  }

  const snapshotCounts = preserveLegacyState
    ? await loadLegacySnapshotCounts(client, schedule.id)
    : EMPTY_BOOTSTRAP_COUNTS;
  const bootstrapInsert = buildBootstrapVersionInsert(schedule, snapshotCounts, preserveLegacyState);

  try {
    const insertedVersion = await single<ScheduleVersionRow>(
      client.from('schedule_versions').insert(bootstrapInsert).select()
    );
    await repairSelectionState(client, schedule, insertedVersion.id);
    return;
  } catch (error: unknown) {
    if (!isUniqueViolation(error, VERSION_UNIQUE_CONSTRAINTS, ['schedule_id', 'version_no'])) {
      throw error;
    }
  }

  const recoveredVersions = await loadVersionRows(client, schedule.id);
  const recoveredVersion1 = recoveredVersions.find((version) => version.version_no === 1) ?? null;

  if (!recoveredVersion1) {
    throw new Error('Expected V1 to exist after duplicate bootstrap recovery');
  }

  await repairSelectionState(client, schedule, recoveredVersion1.id);
}

async function buildCompareResponse(
  client: Phase2ScheduleRepositoryClient,
  schedule: ScheduleRow
): Promise<CompareResponse> {
  const versions = await loadVersionRows(client, schedule.id);
  const solvingVersions = versions.filter((version) => version.status === 'solving');

  if (solvingVersions.length > 1) {
    throw new ContractError(
      'invalid_selection_state',
      'Expected at most one active solving version for this schedule',
      409
    );
  }

  return {
    scheduleId: schedule.id,
    selectedVersionId: schedule.selected_version_id,
    finalizedVersionId: schedule.finalized_version_id,
    activeSolvingVersionId: solvingVersions[0]?.id ?? null,
    versions: await mapVersionSummaries(client, schedule, versions),
  };
}

async function loadAuthorizedSchedule(
  client: Phase2ScheduleRepositoryClient,
  auth: Phase2ScheduleAuthContext,
  scheduleId: string
): Promise<ScheduleRow> {
  const schedule = await loadScheduleById(client, scheduleId);

  if (!schedule) {
    throw new ContractError('schedule_not_found', 'Schedule not found', 404);
  }

  assertOrganizationAccess(auth, schedule);
  return schedule;
}

async function loadAuthorizedVersionContext(
  client: Phase2ScheduleRepositoryClient,
  auth: Phase2ScheduleAuthContext,
  versionId: string
): Promise<{ schedule: ScheduleRow; version: ScheduleVersionRow }> {
  const version = await loadVersionById(client, versionId);

  if (!version) {
    throw new ContractError('version_not_found', 'Version not found', 404);
  }

  const schedule = await loadAuthorizedSchedule(client, auth, version.schedule_id);
  return { schedule, version };
}

export async function createVersion(
  client: Phase2ScheduleRepositoryClient,
  auth: Phase2ScheduleAuthContext,
  scheduleId: string,
  request: CreateVersionRequest
): Promise<CreateVersionResponse> {
  const schedule = await loadAuthorizedSchedule(client, auth, scheduleId);
  const baseVersion = await loadVersionById(client, request.baseVersionId);

  if (!baseVersion || baseVersion.schedule_id !== schedule.id) {
    throw new ContractError('version_not_found', 'Base version not found', 404);
  }

  const basePreferences = await loadVersionPreferenceRows(client, baseVersion.id);
  const lockedAssignments = await loadLockedAssignmentRows(client, baseVersion.id);

  let insertedVersion: ScheduleVersionRow | null = null;
  let latestVersionNo = schedule.latest_version_no ?? 0;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const nextVersionNo = Math.max(latestVersionNo, 0) + 1;

    try {
      insertedVersion = await single<ScheduleVersionRow>(
        client
          .from('schedule_versions')
          .insert(buildVersionInsertPayload(schedule.id, nextVersionNo, auth.userId, request))
          .select()
      );
      break;
    } catch (error: unknown) {
      if (!isUniqueViolation(error, VERSION_UNIQUE_CONSTRAINTS, ['schedule_id', 'version_no'])) {
        throw error;
      }

      const refreshedSchedule = await loadScheduleById(client, schedule.id);
      latestVersionNo = refreshedSchedule?.latest_version_no ?? nextVersionNo;
    }
  }

  if (!insertedVersion) {
    throw new ContractError('conflict', 'Failed to allocate a new version number', 409);
  }

  const clonedPreferences = cloneSchedulePreferences(schedule.id, insertedVersion.id, basePreferences);
  if (clonedPreferences.length > 0) {
    await run(client.from('schedule_preferences').insert(clonedPreferences));
  }

  const clonedAssignments = cloneLockedAssignments(schedule.id, insertedVersion.id, lockedAssignments);
  if (clonedAssignments.length > 0) {
    await run(client.from('schedule_assignments').insert(clonedAssignments));
  }

  if ((schedule.latest_version_no ?? 0) < insertedVersion.version_no) {
    await run(
      client.from('schedules').update({ latest_version_no: insertedVersion.version_no }).eq('id', schedule.id)
    );
    schedule.latest_version_no = insertedVersion.version_no;
  }

  const response = await buildCompareResponse(client, schedule);
  return {
    ...response,
    createdVersionId: insertedVersion.id,
  };
}

export async function markVersionSolving(
  client: Phase2ScheduleRepositoryClient,
  auth: Phase2ScheduleAuthContext,
  versionId: string,
  request: SolveRequest
): Promise<SolveResponse> {
  await loadAuthorizedVersionContext(client, auth, versionId);

  try {
    const row = await rpcSingle<MarkScheduleVersionSolvingAtomicRow>(
      client,
      'mark_schedule_version_solving_atomic',
      {
        p_version_id: versionId,
        p_solver_execution_id: request.solverExecutionId,
      }
    );

    return {
      scheduleVersionId: row.schedule_version_id,
      status: row.status as ScheduleVersionStatus,
      solverExecutionId: row.active_solver_execution_id,
    };
  } catch (error: unknown) {
    remapSlice5RpcConflict(error);
  }
}

export async function syncVersionSolverResult(
  client: Phase2ScheduleRepositoryClient,
  auth: Phase2ScheduleAuthContext,
  versionId: string,
  request: SolverResultRequest
): Promise<SolverResultResponse> {
  const { schedule, version } = await loadAuthorizedVersionContext(client, auth, versionId);
  const monthScopedAssignments = filterAssignmentChangesToMonth(request.assignments, schedule.month);
  let applyResult: ApplyScheduleVersionSolverResultRow;

  try {
    applyResult = await rpcSingle<ApplyScheduleVersionSolverResultRow>(
      client,
      'apply_schedule_version_solver_result',
      {
        p_version_id: versionId,
        p_solver_execution_id: request.solverExecutionId,
        p_status: request.status,
        p_assignments: monthScopedAssignments,
        p_score: request.score,
        p_failure_reason: request.failureReason,
        p_edited_by: auth.userId,
      }
    );
  } catch (error: unknown) {
    if (isAmbiguousScoreColumnError(error)) {
      console.warn(
        '[phase2-schedule] Falling back to non-RPC solver result sync due to ambiguous hard_score column error.'
      );
      applyResult = await syncVersionSolverResultWithoutRpc(
        client,
        schedule,
        version,
        auth,
        monthScopedAssignments,
        request
      );
    } else {
      remapSlice5RpcConflict(error);
    }
  }

  const forcedResultStatus: ScheduleEvaluationResultStatus | null =
    request.status === 'failed'
      ? (isInfeasibleFailureType(request.failureType) ? 'infeasible' : 'solve_failed')
      : null;
  const evaluation = await buildVersionEvaluation(client, schedule, version, {
    forcedResultStatus,
    failureReason: request.failureReason,
    failureType: request.failureType,
    failureContext: request.failureContext,
  });
  const evaluationRow = await persistVersionEvaluation(
    client,
    version.id,
    version.current_revision,
    evaluation,
    request.solverExecutionId
  );

  return {
    scheduleVersionId: evaluationRow.schedule_version_id,
    status: evaluationRow.status as ScheduleVersionStatus,
    solverExecutionId: null,
    hardScore: applyResult.hard_score,
    softScore: applyResult.soft_score,
    failureReason: applyResult.failure_reason,
  };
}

export async function patchVersionAssignments(
  client: Phase2ScheduleRepositoryClient,
  auth: Phase2ScheduleAuthContext,
  versionId: string,
  request: PatchAssignmentsRequest
): Promise<PatchAssignmentsResponse> {
  const { schedule, version } = await loadAuthorizedVersionContext(client, auth, versionId);
  const monthScopedChanges = filterAssignmentChangesToMonth(request.changes, schedule.month);

  try {
    const row = await rpcSingle<PatchScheduleVersionAssignmentsAtomicRow>(
      client,
      'patch_schedule_version_assignments_atomic',
      {
        p_version_id: version.id,
        p_changes: monthScopedChanges,
        p_edited_by: auth.userId,
      }
    );

    return {
      scheduleVersionId: row.schedule_version_id,
      status: row.status as ScheduleVersionStatus,
      currentRevision: row.current_revision,
      manualEditCount: row.manual_edit_count,
      changedCells: row.changed_cells,
    };
  } catch (error: unknown) {
    remapSlice5RpcConflict(error);
  }
}

export async function ensure(
  client: Phase2ScheduleRepositoryClient,
  auth: Phase2ScheduleAuthContext,
  request: EnsureRequest
): Promise<EnsureResponse> {
  if (request.organizationId !== auth.organizationId) {
    throw new ContractError(
      'organization_access_denied',
      'Authenticated user cannot ensure schedules for another organization',
      403
    );
  }

  const { schedule, existedBeforeRequest } = await ensureScheduleContainer(client, request);
  await ensureBootstrapVersion(client, schedule, existedBeforeRequest);

  const refreshedSchedule = await loadAuthorizedSchedule(client, auth, schedule.id);
  return buildCompareResponse(client, refreshedSchedule);
}

export async function compare(
  client: Phase2ScheduleRepositoryClient,
  auth: Phase2ScheduleAuthContext,
  scheduleId: string
): Promise<CompareResponse> {
  const schedule = await loadAuthorizedSchedule(client, auth, scheduleId);
  return buildCompareResponse(client, schedule);
}

export async function review(
  client: Phase2ScheduleRepositoryClient,
  auth: Phase2ScheduleAuthContext,
  versionId: string
): Promise<ReviewResponse> {
  const version = await loadVersionById(client, versionId);

  if (!version) {
    throw new ContractError('version_not_found', 'Version not found', 404);
  }

  const schedule = await loadAuthorizedSchedule(client, auth, version.schedule_id);
  const latestEvaluation = version.latest_evaluation_id
    ? await loadEvaluationById(client, version.latest_evaluation_id)
    : null;
  const versionSummary = toVersionSummary(schedule, version, latestEvaluation);

  return {
    scheduleId: schedule.id,
    selectedVersionId: schedule.selected_version_id,
    finalizedVersionId: schedule.finalized_version_id,
    version: versionSummary,
    latestEvaluation,
    primaryAction: buildPrimaryAction(
      version.id,
      schedule.selected_version_id,
      versionSummary,
      latestEvaluation
    ),
    defaultTab: 'grid',
  };
}

export async function select(
  client: Phase2ScheduleRepositoryClient,
  auth: Phase2ScheduleAuthContext,
  versionId: string
): Promise<SelectResponse> {
  const { version } = await loadAuthorizedVersionContext(client, auth, versionId);

  try {
    const row = await rpcSingle<SelectScheduleVersionAtomicRow>(
      client,
      'select_schedule_version_atomic',
      {
        p_version_id: version.id,
      }
    );

    return {
      scheduleId: row.schedule_id,
      selectedVersionId: row.selected_version_id,
    };
  } catch (error: unknown) {
    remapSelectRpcConflict(error);
  }
}

export async function recheckVersion(
  client: Phase2ScheduleRepositoryClient,
  auth: Phase2ScheduleAuthContext,
  versionId: string
): Promise<ScheduleVersionRecheckResponse> {
  const { schedule, version } = await loadAuthorizedVersionContext(client, auth, versionId);

  if (schedule.finalized_version_id !== null || version.status === 'finalized') {
    throw new ContractError('already_finalized', 'Schedule is already finalized', 409);
  }

  if (version.status === 'solving' || version.active_solver_execution_id) {
    throw new ContractError(
      'version_locked_for_solving',
      'Version is currently solving and cannot be rechecked',
      409
    );
  }

  const evaluation = await buildVersionEvaluation(client, schedule, version);
  const row = await persistVersionEvaluation(client, version.id, version.current_revision, evaluation, null);

  return {
    scheduleVersionId: row.schedule_version_id,
    currentRevision: row.current_revision,
    evaluationId: row.evaluation_id,
    resultStatus: row.status as ScheduleVersionStatus,
    evaluationResultStatus: row.evaluation_result_status as ScheduleEvaluationResultStatus,
  };
}

export async function finalizeVersion(
  client: Phase2ScheduleRepositoryClient,
  auth: Phase2ScheduleAuthContext,
  versionId: string
): Promise<ScheduleVersionFinalizeResponse> {
  const { version } = await loadAuthorizedVersionContext(client, auth, versionId);

  try {
    const row = await rpcSingle<FinalizeScheduleVersionAtomicRow>(
      client,
      'finalize_schedule_version_atomic',
      {
        p_version_id: version.id,
        p_finalized_by: auth.userId,
      }
    );

    return {
      scheduleId: row.schedule_id,
      scheduleVersionId: row.schedule_version_id,
      status: row.status as ScheduleVersionStatus,
      finalizedVersionId: row.finalized_version_id,
      finalizedAt: row.finalized_at,
      finalizedBy: row.finalized_by,
    };
  } catch (error: unknown) {
    remapTrustGateRpcConflict(error);
  }
}
