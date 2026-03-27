import {
  ContractError,
  type CompareResponse,
  type EnsureRequest,
  type EnsureResponse,
  type Phase2ScheduleAuthContext,
  type ReviewResponse,
  type ScheduleCompareMetrics,
  type ScheduleEvaluation,
  type ScheduleFinalizationGate,
  type ScheduleInputDiffSummary,
  type SchedulePrimaryAction,
  type ScheduleVersionStatus,
  type ScheduleVersionSummary,
  type SelectResponse,
} from './contracts.ts';

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
  selectedVersionId: string | null
): SchedulePrimaryAction {
  if (previewVersionId !== selectedVersionId) {
    return {
      kind: 'select',
      targetVersionId: previewVersionId,
      label: 'Select this version as the finalization candidate',
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

  return {
    scheduleId: schedule.id,
    selectedVersionId: schedule.selected_version_id,
    finalizedVersionId: schedule.finalized_version_id,
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

  return {
    scheduleId: schedule.id,
    selectedVersionId: schedule.selected_version_id,
    finalizedVersionId: schedule.finalized_version_id,
    version: toVersionSummary(schedule, version, latestEvaluation),
    latestEvaluation,
    primaryAction: buildPrimaryAction(version.id, schedule.selected_version_id),
    defaultTab: 'grid',
  };
}

export async function select(
  client: Phase2ScheduleRepositoryClient,
  auth: Phase2ScheduleAuthContext,
  versionId: string
): Promise<SelectResponse> {
  const version = await loadVersionById(client, versionId);

  if (!version) {
    throw new ContractError('version_not_found', 'Version not found', 404);
  }

  const schedule = await loadAuthorizedSchedule(client, auth, version.schedule_id);

  if (schedule.finalized_version_id) {
    throw new ContractError('already_finalized', 'Schedule is already finalized', 409);
  }

  if (schedule.selected_version_id !== version.id) {
    await run(
      client
        .from('schedules')
        .update({
          selected_version_id: version.id,
        })
        .eq('id', schedule.id)
    );
  }

  return {
    scheduleId: schedule.id,
    selectedVersionId: version.id,
  };
}
