export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'OPTIONS';
export type RouteName =
  | 'ensure'
  | 'compare'
  | 'review'
  | 'select'
  | 'createVersion'
  | 'solve'
  | 'solverResult'
  | 'patchAssignments'
  | 'recheck'
  | 'finalize';
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

export interface ErrorEnvelope {
  code: string;
  message: string;
}

export interface Phase2ScheduleAuthContext {
  userId: string;
  organizationId: string;
}

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
  requestCode: 'O';
  requestNote: string | null;
  isSoft: boolean;
  resolutionStatus: 'pending' | 'fulfilled' | 'unfulfilled';
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

export interface EnsureRequest {
  organizationId: string;
  month: string;
}

export interface EnsureResponse {
  scheduleId: string;
  selectedVersionId: string | null;
  finalizedVersionId: string | null;
  activeSolvingVersionId: string | null;
  versions: ScheduleVersionSummary[];
}

export interface CompareResponse {
  scheduleId: string;
  selectedVersionId: string | null;
  finalizedVersionId: string | null;
  activeSolvingVersionId: string | null;
  versions: ScheduleVersionSummary[];
}

export interface ReviewResponse {
  scheduleId: string;
  selectedVersionId: string | null;
  finalizedVersionId: string | null;
  version: ScheduleVersionSummary;
  latestEvaluation: ScheduleEvaluation | null;
  primaryAction: SchedulePrimaryAction;
  defaultTab: ScheduleReviewTab;
}

export interface SelectResponse {
  scheduleId: string;
  selectedVersionId: string;
}

export interface CreateVersionRequest {
  baseVersionId: string;
  name: string | null;
  sourceType: ScheduleVersionSourceType;
  inputDiffSummary: ScheduleInputDiffSummary;
}

export interface CreateVersionResponse {
  scheduleId: string;
  createdVersionId: string;
  selectedVersionId: string | null;
  finalizedVersionId: string | null;
  versions: ScheduleVersionSummary[];
}

export interface SolveRequest {
  solverExecutionId: string;
}

export interface SolveResponse {
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
  comment: string | null;
  offReason: string | null;
  isLocked: boolean;
}

export interface SolverResultRequest {
  status: 'completed' | 'failed';
  assignments: ScheduleVersionAssignmentChange[];
  score: ScheduleVersionScore | null;
  failureReason: string | null;
  failureType: string | null;
  failureContext: Record<string, unknown> | null;
  solverExecutionId: string;
}

export interface SolverResultResponse {
  scheduleVersionId: string;
  status: ScheduleVersionStatus;
  solverExecutionId: string | null;
  hardScore: number | null;
  softScore: number | null;
  failureReason: string | null;
}

export interface PatchAssignmentsRequest {
  changes: ScheduleVersionAssignmentChange[];
}

export interface PatchAssignmentsResponse {
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

export class ContractError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = 'ContractError';
  }
}

export interface RouteMatch {
  route: RouteName;
  params: Record<string, string>;
}

interface RouteDefinition {
  name: RouteName;
  methods: HttpMethod[];
  segments: string[];
}

const ROUTE_DEFINITIONS: RouteDefinition[] = [
  {
    name: 'ensure',
    methods: ['POST'],
    segments: ['schedules', 'ensure'],
  },
  {
    name: 'compare',
    methods: ['GET'],
    segments: ['schedules', ':scheduleId', 'compare'],
  },
  {
    name: 'createVersion',
    methods: ['POST'],
    segments: ['schedules', ':scheduleId', 'versions'],
  },
  {
    name: 'review',
    methods: ['GET'],
    segments: ['schedule-versions', ':versionId', 'review'],
  },
  {
    name: 'select',
    methods: ['POST'],
    segments: ['schedule-versions', ':versionId', 'select'],
  },
  {
    name: 'solve',
    methods: ['POST'],
    segments: ['schedule-versions', ':versionId', 'solve'],
  },
  {
    name: 'solverResult',
    methods: ['POST'],
    segments: ['schedule-versions', ':versionId', 'solver-result'],
  },
  {
    name: 'patchAssignments',
    methods: ['PATCH'],
    segments: ['schedule-versions', ':versionId', 'assignments'],
  },
  {
    name: 'recheck',
    methods: ['POST'],
    segments: ['schedule-versions', ':versionId', 'recheck'],
  },
  {
    name: 'finalize',
    methods: ['POST'],
    segments: ['schedule-versions', ':versionId', 'finalize'],
  },
];

export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function isValidMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function isValidDate(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value);
}

export function parseUuidParam(name: string, value: string): string {
  if (!isValidUuid(value)) {
    throw new ContractError('bad_request', `${name} must be a valid UUID`, 400);
  }

  return value;
}

export function normalizePathSegments(pathname: string): string[] {
  const cleaned = pathname
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean);
  const boundaryIndex = cleaned.findIndex((segment) => segment === 'phase2-schedule');

  return boundaryIndex >= 0 ? cleaned.slice(boundaryIndex + 1) : cleaned;
}

export function matchRoute(segments: string[]): RouteMatch | null {
  for (const definition of ROUTE_DEFINITIONS) {
    if (definition.segments.length !== segments.length) {
      continue;
    }

    const params: Record<string, string> = {};
    let matches = true;

    for (let index = 0; index < definition.segments.length; index += 1) {
      const pattern = definition.segments[index];
      const value = segments[index];

      if (!value) {
        matches = false;
        break;
      }

      if (pattern.startsWith(':')) {
        params[pattern.slice(1)] = value;
        continue;
      }

      if (pattern !== value) {
        matches = false;
        break;
      }
    }

    if (matches) {
      return { route: definition.name, params };
    }
  }

  return null;
}

export function allowedMethods(routeName: RouteName): HttpMethod[] {
  return ROUTE_DEFINITIONS.find((route) => route.name === routeName)?.methods ?? [];
}

export async function parseJsonBody(request: Request): Promise<unknown> {
  const rawBody = await request.text();

  if (!rawBody) {
    throw new ContractError('bad_request', 'Request body is required', 400);
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new ContractError('bad_request', 'Request body must be valid JSON', 400);
  }
}

export function parseEnsureRequest(payload: unknown): EnsureRequest {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new ContractError('bad_request', 'ensure request must be a JSON object', 400);
  }

  const record = payload as Record<string, unknown>;
  const organizationId = typeof record.organizationId === 'string' ? record.organizationId : '';
  const month = typeof record.month === 'string' ? record.month : '';

  if (!organizationId || !isValidUuid(organizationId)) {
    throw new ContractError('bad_request', 'organizationId must be a valid UUID', 400);
  }

  if (!isValidMonth(month)) {
    throw new ContractError('bad_request', 'month must be in YYYY-MM format', 400);
  }

  return { organizationId, month };
}

function parseInputDiffSummary(value: unknown): ScheduleInputDiffSummary {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ContractError('bad_request', 'inputDiffSummary must be a JSON object', 400);
  }

  const record = value as Record<string, unknown>;
  const changedOffRequests = record.changedOffRequests;
  const changedLockedAssignments = record.changedLockedAssignments;
  const changedSiteRequirements = record.changedSiteRequirements;
  const note = record.note;

  if (typeof changedOffRequests !== 'number' || changedOffRequests < 0) {
    throw new ContractError('bad_request', 'changedOffRequests must be a non-negative number', 400);
  }

  if (
    typeof changedLockedAssignments !== 'number'
    || changedLockedAssignments < 0
  ) {
    throw new ContractError(
      'bad_request',
      'changedLockedAssignments must be a non-negative number',
      400
    );
  }

  if (
    typeof changedSiteRequirements !== 'number'
    || changedSiteRequirements < 0
  ) {
    throw new ContractError(
      'bad_request',
      'changedSiteRequirements must be a non-negative number',
      400
    );
  }

  if (note !== null && note !== undefined && typeof note !== 'string') {
    throw new ContractError('bad_request', 'note must be a string or null', 400);
  }

  return {
    changedOffRequests,
    changedLockedAssignments,
    changedSiteRequirements,
    note: typeof note === 'string' ? note : null,
  };
}

function parseScheduleVersionAssignmentChange(
  payload: unknown
): ScheduleVersionAssignmentChange {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new ContractError('bad_request', 'assignment change must be a JSON object', 400);
  }

  const record = payload as Record<string, unknown>;
  const employeeId = typeof record.employeeId === 'string' ? record.employeeId : '';
  const date = typeof record.date === 'string' ? record.date : '';
  const shiftId = record.shiftId;
  const comment = record.comment;
  const offReason = record.offReason;
  const isLocked = record.isLocked;

  if (!employeeId || !isValidUuid(employeeId)) {
    throw new ContractError('bad_request', 'employeeId must be a valid UUID', 400);
  }

  if (!isValidDate(date)) {
    throw new ContractError('bad_request', 'date must be in YYYY-MM-DD format', 400);
  }

  if (shiftId !== null && shiftId !== undefined && (typeof shiftId !== 'string' || !isValidUuid(shiftId))) {
    throw new ContractError('bad_request', 'shiftId must be a valid UUID or null', 400);
  }

  if (comment !== null && comment !== undefined && typeof comment !== 'string') {
    throw new ContractError('bad_request', 'comment must be a string or null', 400);
  }

  if (offReason !== null && offReason !== undefined && typeof offReason !== 'string') {
    throw new ContractError('bad_request', 'offReason must be a string or null', 400);
  }

  if (isLocked !== undefined && typeof isLocked !== 'boolean') {
    throw new ContractError('bad_request', 'isLocked must be a boolean when provided', 400);
  }

  return {
    employeeId,
    date,
    shiftId: typeof shiftId === 'string' ? shiftId : null,
    comment: typeof comment === 'string' ? comment : null,
    offReason: typeof offReason === 'string' ? offReason : null,
    isLocked: typeof isLocked === 'boolean' ? isLocked : false,
  };
}

function parseScheduleVersionScore(payload: unknown): ScheduleVersionScore {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new ContractError('bad_request', 'score must be a JSON object', 400);
  }

  const record = payload as Record<string, unknown>;
  const hardScore = record.hardScore;
  const softScore = record.softScore;

  if (typeof hardScore !== 'number') {
    throw new ContractError('bad_request', 'hardScore must be a number', 400);
  }

  if (typeof softScore !== 'number') {
    throw new ContractError('bad_request', 'softScore must be a number', 400);
  }

  return {
    hardScore,
    softScore,
  };
}

export function parseCreateVersionRequest(payload: unknown): CreateVersionRequest {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new ContractError('bad_request', 'create version request must be a JSON object', 400);
  }

  const record = payload as Record<string, unknown>;
  const baseVersionId = typeof record.baseVersionId === 'string' ? record.baseVersionId : '';
  const name = record.name;
  const sourceType = record.sourceType;

  if (!baseVersionId || !isValidUuid(baseVersionId)) {
    throw new ContractError('bad_request', 'baseVersionId must be a valid UUID', 400);
  }

  if (name !== null && name !== undefined && typeof name !== 'string') {
    throw new ContractError('bad_request', 'name must be a string or null', 400);
  }

  if (
    sourceType !== 'initial_solve'
    && sourceType !== 're_solve'
    && sourceType !== 'manual_variant'
  ) {
    throw new ContractError('bad_request', 'sourceType is invalid', 400);
  }

  return {
    baseVersionId,
    name: typeof name === 'string' ? name : null,
    sourceType,
    inputDiffSummary: parseInputDiffSummary(record.inputDiffSummary),
  };
}

export function parseScheduleVersionSolveRequest(payload: unknown): SolveRequest {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new ContractError('bad_request', 'solve request must be a JSON object', 400);
  }

  const record = payload as Record<string, unknown>;
  const solverExecutionId =
    typeof record.solverExecutionId === 'string' ? record.solverExecutionId.trim() : '';

  if (!solverExecutionId) {
    throw new ContractError('bad_request', 'solverExecutionId is required', 400);
  }

  return { solverExecutionId };
}

export function parseScheduleVersionSolverResultRequest(payload: unknown): SolverResultRequest {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new ContractError('bad_request', 'solver result request must be a JSON object', 400);
  }

  const record = payload as Record<string, unknown>;
  const status = record.status;
  const failureReason = record.failureReason;
  const failureType = record.failureType;
  const failureContext = record.failureContext;

  if (status !== 'completed' && status !== 'failed') {
    throw new ContractError('bad_request', 'status must be completed or failed', 400);
  }

  if (
    failureReason !== null
    && failureReason !== undefined
    && typeof failureReason !== 'string'
  ) {
    throw new ContractError('bad_request', 'failureReason must be a string or null', 400);
  }

  if (failureType !== null && failureType !== undefined && typeof failureType !== 'string') {
    throw new ContractError('bad_request', 'failureType must be a string or null', 400);
  }

  if (
    failureContext !== null
    && failureContext !== undefined
    && (typeof failureContext !== 'object' || Array.isArray(failureContext))
  ) {
    throw new ContractError('bad_request', 'failureContext must be a JSON object or null', 400);
  }

  const solveRequest = parseScheduleVersionSolveRequest(payload);
  const assignments = Array.isArray(record.assignments)
    ? record.assignments.map((item) => parseScheduleVersionAssignmentChange(item))
    : [];
  const score = record.score == null ? null : parseScheduleVersionScore(record.score);

  return {
    status,
    solverExecutionId: solveRequest.solverExecutionId,
    assignments,
    score,
    failureReason: typeof failureReason === 'string' ? failureReason : null,
    failureType: typeof failureType === 'string' ? failureType : null,
    failureContext:
      failureContext !== null
      && failureContext !== undefined
      && typeof failureContext === 'object'
      && !Array.isArray(failureContext)
        ? (failureContext as Record<string, unknown>)
        : null,
  };
}

export function parsePatchScheduleVersionAssignmentsRequest(
  payload: unknown
): PatchAssignmentsRequest {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new ContractError('bad_request', 'patch assignments request must be a JSON object', 400);
  }

  const record = payload as Record<string, unknown>;
  const changes = record.changes;

  if (!Array.isArray(changes)) {
    throw new ContractError('bad_request', 'changes must be an array', 400);
  }

  return {
    changes: changes.map((change) => parseScheduleVersionAssignmentChange(change)),
  };
}
