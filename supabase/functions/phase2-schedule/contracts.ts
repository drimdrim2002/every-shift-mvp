export type HttpMethod = 'GET' | 'POST' | 'OPTIONS';
export type RouteName = 'ensure' | 'compare' | 'review' | 'select';
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
  versions: ScheduleVersionSummary[];
}

export interface CompareResponse {
  scheduleId: string;
  selectedVersionId: string | null;
  finalizedVersionId: string | null;
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
    name: 'review',
    methods: ['GET'],
    segments: ['schedule-versions', ':versionId', 'review'],
  },
  {
    name: 'select',
    methods: ['POST'],
    segments: ['schedule-versions', ':versionId', 'select'],
  },
];

export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function isValidMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
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
