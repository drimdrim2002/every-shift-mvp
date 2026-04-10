export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'OPTIONS';
export type RouteName =
  | 'bootstrapAdmin'
  | 'employeeImportValidate'
  | 'employeeImportApply'
  | 'offRequestPolicies'
  | 'checklist';

export interface ErrorEnvelope {
  code: string;
  message: string;
}

export interface Phase2OpsAuthContext {
  operatorToken: string;
}

export interface BootstrapAdminInitializationFlags {
  createPilotSite: boolean;
  seedOrganizationSettings: boolean;
}

export interface BootstrapAdminRequest {
  organizationId: string;
  targetEmail: string;
  displayName: string;
  onboardingInitializationFlags: BootstrapAdminInitializationFlags;
}

export interface BootstrapAdminResponse {
  organizationId: string;
  targetEmail: string;
  displayName: string;
  operatorUserId: string;
  onboardingInitializationFlags: BootstrapAdminInitializationFlags;
}

export interface EmployeeImportEmployeePayload {
  employeeId: string;
  name: string;
  availableShifts: string[];
  rankCode?: string | null;
}

export interface EmployeeImportRequest {
  organizationId: string;
  month: string;
  employees: EmployeeImportEmployeePayload[];
}

export type EmployeeImportPreviewEmployee = EmployeeImportEmployeePayload;

export interface EmployeeImportPreviewResponse {
  organizationId: string;
  month: string;
  employeeCount: number;
  duplicateEmployeeIds: string[];
  missingShiftCodes: string[];
  isFinalized: boolean;
  isValid: boolean;
  previewEmployees: EmployeeImportPreviewEmployee[];
}

export interface EmployeeImportApplyResponse extends EmployeeImportPreviewResponse {
  deletedScheduleId: string | null;
}

export type OffRequestPolicyPeriodType = 'monthly' | 'annual';

export interface OffRequestPolicyRankCode {
  id?: string;
  code: string;
  label: string;
  displayOrder: number;
  isActive: boolean;
}

export interface OffRequestPolicyRule {
  id?: string;
  rankCode: string | null;
  periodType: OffRequestPolicyPeriodType;
  limitCount: number;
  isActive: boolean;
}

export interface OffRequestPolicySetupRequest {
  organizationId: string;
  rankCodes: OffRequestPolicyRankCode[];
  policyRules: OffRequestPolicyRule[];
}

export interface OffRequestPolicyRankCodeRecord extends OffRequestPolicyRankCode {
  id: string;
  organizationId: string;
}

export interface OffRequestPolicyRuleRecord extends OffRequestPolicyRule {
  id: string;
  organizationId: string;
}

export interface OffRequestPolicySetupResponse {
  organizationId: string;
  rankCodes: OffRequestPolicyRankCodeRecord[];
  policyRules: OffRequestPolicyRuleRecord[];
}

export type FairnessLedgerWindowMonths = 3 | 6 | 12;

export interface FairnessLedgerProofSummary {
  weeklyHoursViolations: number;
  nnnViolations: number;
  nodViolations: number;
  minimumRestViolations: number;
  staffingShortfalls: number;
}

export interface FairnessLedgerWindowSummary {
  months: FairnessLedgerWindowMonths;
  windowStartMonth: string | null;
  windowEndMonth: string | null;
  finalizedVersionCount: number;
  proofSummary: FairnessLedgerProofSummary;
}

export type ChecklistItemKey =
  | 'organization_profile'
  | 'schedule_foundation'
  | 'employee_roster'
  | 'off_request_policy'
  | 'schedule_review';

export type ChecklistItemStatus = 'ready' | 'blocked';

export interface ChecklistItem {
  key: ChecklistItemKey;
  title: string;
  status: ChecklistItemStatus;
  route: string | null;
  blockedReason: string | null;
}

export interface ChecklistUpdateRequest {
  organizationId: string;
  checklistCursor: string | null;
}

export interface ChecklistResponse {
  organizationId: string;
  checklistCursor: string | null;
  ready: boolean;
  items: ChecklistItem[];
  fairnessSummary: FairnessLedgerWindowSummary[];
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
    name: 'bootstrapAdmin',
    methods: ['POST'],
    segments: ['bootstrap-admin'],
  },
  {
    name: 'employeeImportValidate',
    methods: ['POST'],
    segments: ['employee-import', 'validate'],
  },
  {
    name: 'employeeImportApply',
    methods: ['POST'],
    segments: ['employee-import', 'apply'],
  },
  {
    name: 'offRequestPolicies',
    methods: ['GET', 'PUT'],
    segments: ['off-request-policies'],
  },
  {
    name: 'checklist',
    methods: ['GET', 'PATCH'],
    segments: ['checklist'],
  },
];

export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizePathSegments(pathname: string): string[] {
  const cleaned = pathname
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean);
  const boundaryIndex = cleaned.findIndex((segment) => segment === 'phase2-ops');

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

export function parseOperatorAuthorization(request: Request): string {
  const headerValue = request.headers.get('authorization') ?? request.headers.get('Authorization');

  if (!headerValue) {
    throw new ContractError('unauthorized', 'Operator authorization bearer token is required', 401);
  }

  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (!token) {
    throw new ContractError('unauthorized', 'Operator authorization bearer token is required', 401);
  }

  return token;
}

function parseBootstrapAdminInitializationFlags(value: unknown): BootstrapAdminInitializationFlags {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ContractError(
      'bad_request',
      'onboardingInitializationFlags must be a JSON object',
      400
    );
  }

  const record = value as Record<string, unknown>;
  const allowedKeys: (keyof BootstrapAdminInitializationFlags)[] = [
    'createPilotSite',
    'seedOrganizationSettings',
  ];

  for (const key of Object.keys(record)) {
    if (!allowedKeys.includes(key as keyof BootstrapAdminInitializationFlags)) {
      throw new ContractError(
        'bad_request',
        `onboardingInitializationFlags contains unsupported key: ${key}`,
        400
      );
    }
  }

  for (const key of allowedKeys) {
    if (typeof record[key] !== 'boolean') {
      throw new ContractError(
        'bad_request',
        `onboardingInitializationFlags.${key} must be a boolean`,
        400
      );
    }
  }

  return {
    createPilotSite: record.createPilotSite as boolean,
    seedOrganizationSettings: record.seedOrganizationSettings as boolean,
  };
}

export function parseBootstrapAdminRequest(payload: unknown): BootstrapAdminRequest {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new ContractError('bad_request', 'bootstrap admin request must be a JSON object', 400);
  }

  const record = payload as Record<string, unknown>;
  const organizationId = typeof record.organizationId === 'string' ? record.organizationId.trim() : '';
  const targetEmail = typeof record.targetEmail === 'string' ? record.targetEmail.trim() : '';
  const displayName = typeof record.displayName === 'string' ? record.displayName.trim() : '';

  if (!organizationId || !isValidUuid(organizationId)) {
    throw new ContractError('bad_request', 'organizationId must be a valid UUID', 400);
  }

  if (!targetEmail || !isValidEmail(targetEmail)) {
    throw new ContractError('bad_request', 'targetEmail must be a valid email address', 400);
  }

  if (!displayName) {
    throw new ContractError('bad_request', 'displayName is required', 400);
  }

  return {
    organizationId,
    targetEmail,
    displayName,
    onboardingInitializationFlags: parseBootstrapAdminInitializationFlags(
      record.onboardingInitializationFlags
    ),
  };
}

export function parseBootstrapAdminResponse(payload: unknown): BootstrapAdminResponse {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new ContractError('bad_request', 'bootstrap admin response must be a JSON object', 400);
  }

  const record = payload as Record<string, unknown>;
  const organizationId = typeof record.organizationId === 'string' ? record.organizationId.trim() : '';
  const targetEmail = typeof record.targetEmail === 'string' ? record.targetEmail.trim() : '';
  const displayName = typeof record.displayName === 'string' ? record.displayName.trim() : '';
  const operatorUserId = typeof record.operatorUserId === 'string' ? record.operatorUserId.trim() : '';

  if (!organizationId || !isValidUuid(organizationId)) {
    throw new ContractError('bad_request', 'organizationId must be a valid UUID', 400);
  }

  if (!targetEmail || !isValidEmail(targetEmail)) {
    throw new ContractError('bad_request', 'targetEmail must be a valid email address', 400);
  }

  if (!displayName) {
    throw new ContractError('bad_request', 'displayName is required', 400);
  }

  if (!operatorUserId || !isValidUuid(operatorUserId)) {
    throw new ContractError('bad_request', 'operatorUserId must be a valid UUID', 400);
  }

  return {
    organizationId,
    targetEmail,
    displayName,
    operatorUserId,
    onboardingInitializationFlags: parseBootstrapAdminInitializationFlags(
      record.onboardingInitializationFlags
    ),
  };
}

function parseOffRequestPolicyRankCode(value: unknown): OffRequestPolicyRankCode {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ContractError('bad_request', 'policy rank code must be a JSON object', 400);
  }

  const record = value as Record<string, unknown>;
  const code = typeof record.code === 'string' ? record.code.trim() : '';
  const label = typeof record.label === 'string' ? record.label.trim() : '';
  const displayOrder = typeof record.displayOrder === 'number' ? record.displayOrder : NaN;
  const isActive = typeof record.isActive === 'boolean' ? record.isActive : null;

  if (!code) {
    throw new ContractError('bad_request', 'policy rank code.code is required', 400);
  }

  if (!label) {
    throw new ContractError('bad_request', 'policy rank code.label is required', 400);
  }

  if (!Number.isInteger(displayOrder) || displayOrder < 0) {
    throw new ContractError(
      'bad_request',
      'policy rank code.displayOrder must be a non-negative integer',
      400
    );
  }

  if (isActive === null) {
    throw new ContractError('bad_request', 'policy rank code.isActive must be a boolean', 400);
  }

  const payload: OffRequestPolicyRankCode = {
    code,
    label,
    displayOrder,
    isActive,
  };

  if (typeof record.id === 'string' && record.id.trim().length > 0) {
    payload.id = record.id.trim();
  }

  return payload;
}

function parseOffRequestPolicyRule(value: unknown): OffRequestPolicyRule {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ContractError('bad_request', 'policy rule must be a JSON object', 400);
  }

  const record = value as Record<string, unknown>;
  const rankCode =
    typeof record.rankCode === 'string' && record.rankCode.trim().length > 0
      ? record.rankCode.trim()
      : record.rankCode === null
        ? null
        : undefined;
  const periodType =
    record.periodType === 'monthly' || record.periodType === 'annual'
      ? record.periodType
      : null;
  const limitCount = typeof record.limitCount === 'number' ? record.limitCount : NaN;
  const isActive = typeof record.isActive === 'boolean' ? record.isActive : null;

  if (periodType === null) {
    throw new ContractError(
      'bad_request',
      'policy rule.periodType must be monthly or annual',
      400
    );
  }

  if (!Number.isInteger(limitCount) || limitCount < 0) {
    throw new ContractError('bad_request', 'policy rule.limitCount must be a non-negative integer', 400);
  }

  if (isActive === null) {
    throw new ContractError('bad_request', 'policy rule.isActive must be a boolean', 400);
  }

  const payload: OffRequestPolicyRule = {
    rankCode: rankCode ?? null,
    periodType,
    limitCount,
    isActive,
  };

  if (typeof record.id === 'string' && record.id.trim().length > 0) {
    payload.id = record.id.trim();
  }

  return payload;
}

export function parseOffRequestPolicySetupRequest(payload: unknown): OffRequestPolicySetupRequest {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new ContractError('bad_request', 'off-request policy request must be a JSON object', 400);
  }

  const record = payload as Record<string, unknown>;
  const organizationId = typeof record.organizationId === 'string' ? record.organizationId.trim() : '';

  if (!organizationId || !isValidUuid(organizationId)) {
    throw new ContractError('bad_request', 'organizationId must be a valid UUID', 400);
  }

  if (!Array.isArray(record.rankCodes)) {
    throw new ContractError('bad_request', 'rankCodes must be an array', 400);
  }

  if (!Array.isArray(record.policyRules)) {
    throw new ContractError('bad_request', 'policyRules must be an array', 400);
  }

  return {
    organizationId,
    rankCodes: record.rankCodes.map((rankCode) => parseOffRequestPolicyRankCode(rankCode)),
    policyRules: record.policyRules.map((rule) => parseOffRequestPolicyRule(rule)),
  };
}

function parseOffRequestPolicyRankCodeRecord(value: unknown): OffRequestPolicyRankCodeRecord {
  const rankCode = parseOffRequestPolicyRankCode(value);

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ContractError('bad_request', 'policy rank code record must be a JSON object', 400);
  }

  const record = value as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  const organizationId =
    typeof record.organizationId === 'string' ? record.organizationId.trim() : '';

  if (!id) {
    throw new ContractError('bad_request', 'policy rank code id is required', 400);
  }

  if (!organizationId || !isValidUuid(organizationId)) {
    throw new ContractError('bad_request', 'policy rank code organizationId must be a valid UUID', 400);
  }

  return {
    id,
    organizationId,
    ...rankCode,
  };
}

function parseOffRequestPolicyRuleRecord(value: unknown): OffRequestPolicyRuleRecord {
  const rule = parseOffRequestPolicyRule(value);

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ContractError('bad_request', 'policy rule record must be a JSON object', 400);
  }

  const record = value as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  const organizationId =
    typeof record.organizationId === 'string' ? record.organizationId.trim() : '';

  if (!id) {
    throw new ContractError('bad_request', 'policy rule id is required', 400);
  }

  if (!organizationId || !isValidUuid(organizationId)) {
    throw new ContractError('bad_request', 'policy rule organizationId must be a valid UUID', 400);
  }

  return {
    id,
    organizationId,
    ...rule,
  };
}

export function parseOffRequestPolicySetupResponse(payload: unknown): OffRequestPolicySetupResponse {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new ContractError(
      'bad_request',
      'off-request policy response must be a JSON object',
      400
    );
  }

  const record = payload as Record<string, unknown>;
  const organizationId = typeof record.organizationId === 'string' ? record.organizationId.trim() : '';

  if (!organizationId || !isValidUuid(organizationId)) {
    throw new ContractError('bad_request', 'organizationId must be a valid UUID', 400);
  }

  if (!Array.isArray(record.rankCodes)) {
    throw new ContractError('bad_request', 'rankCodes must be an array', 400);
  }

  if (!Array.isArray(record.policyRules)) {
    throw new ContractError('bad_request', 'policyRules must be an array', 400);
  }

  return {
    organizationId,
    rankCodes: record.rankCodes.map((rankCode) => parseOffRequestPolicyRankCodeRecord(rankCode)),
    policyRules: record.policyRules.map((rule) => parseOffRequestPolicyRuleRecord(rule)),
  };
}

function parseEmployeeImportEmployeePayload(value: unknown): EmployeeImportEmployeePayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ContractError('bad_request', 'employee must be a JSON object', 400);
  }

  const record = value as Record<string, unknown>;
  const employeeId = typeof record.employeeId === 'string' ? record.employeeId.trim() : '';
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  const availableShifts = Array.isArray(record.availableShifts)
    ? record.availableShifts.filter((shift) => typeof shift === 'string').map((shift) => shift.trim()).filter(Boolean)
    : null;
  const rankCode =
    typeof record.rankCode === 'string' && record.rankCode.trim().length > 0
      ? record.rankCode.trim()
      : record.rankCode === null
        ? null
        : undefined;

  if (!employeeId) {
    throw new ContractError('bad_request', 'employeeId is required', 400);
  }

  if (!name) {
    throw new ContractError('bad_request', 'name is required', 400);
  }

  if (!availableShifts) {
    throw new ContractError('bad_request', 'availableShifts must be an array', 400);
  }

  const payload: EmployeeImportEmployeePayload = {
    employeeId,
    name,
    availableShifts,
  };

  if (rankCode !== undefined) {
    payload.rankCode = rankCode;
  }

  return payload;
}

function parseEmployeeImportRequest(payload: unknown): EmployeeImportRequest {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new ContractError('bad_request', 'employee import request must be a JSON object', 400);
  }

  const record = payload as Record<string, unknown>;
  const organizationId = typeof record.organizationId === 'string' ? record.organizationId.trim() : '';
  const month = typeof record.month === 'string' ? record.month.trim() : '';

  if (!organizationId || !isValidUuid(organizationId)) {
    throw new ContractError('bad_request', 'organizationId must be a valid UUID', 400);
  }

  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new ContractError('bad_request', 'month must be in YYYY-MM format', 400);
  }

  if (!Array.isArray(record.employees)) {
    throw new ContractError('bad_request', 'employees must be an array', 400);
  }

  return {
    organizationId,
    month,
    employees: record.employees.map((employee) => parseEmployeeImportEmployeePayload(employee)),
  };
}

export function parseEmployeeImportValidateRequest(payload: unknown): EmployeeImportRequest {
  return parseEmployeeImportRequest(payload);
}

export function parseEmployeeImportApplyRequest(payload: unknown): EmployeeImportRequest {
  return parseEmployeeImportRequest(payload);
}

function parseEmployeeImportPreviewEmployee(value: unknown): EmployeeImportPreviewEmployee {
  return parseEmployeeImportEmployeePayload(value);
}

function parseEmployeeImportPreviewResponse(payload: unknown): EmployeeImportPreviewResponse {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new ContractError('bad_request', 'employee import response must be a JSON object', 400);
  }

  const record = payload as Record<string, unknown>;
  const organizationId = typeof record.organizationId === 'string' ? record.organizationId.trim() : '';
  const month = typeof record.month === 'string' ? record.month.trim() : '';
  const employeeCount = typeof record.employeeCount === 'number' ? record.employeeCount : NaN;
  const duplicateEmployeeIds = Array.isArray(record.duplicateEmployeeIds)
    ? record.duplicateEmployeeIds.filter((value) => typeof value === 'string').map((value) => value.trim()).filter(Boolean)
    : null;
  const missingShiftCodes = Array.isArray(record.missingShiftCodes)
    ? record.missingShiftCodes.filter((value) => typeof value === 'string').map((value) => value.trim()).filter(Boolean)
    : null;
  const isFinalized = typeof record.isFinalized === 'boolean' ? record.isFinalized : null;
  const isValid = typeof record.isValid === 'boolean' ? record.isValid : null;
  const previewEmployees = Array.isArray(record.previewEmployees)
    ? record.previewEmployees.map((employee) => parseEmployeeImportPreviewEmployee(employee))
    : null;

  if (!organizationId || !isValidUuid(organizationId)) {
    throw new ContractError('bad_request', 'organizationId must be a valid UUID', 400);
  }

  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new ContractError('bad_request', 'month must be in YYYY-MM format', 400);
  }

  if (!Number.isInteger(employeeCount) || employeeCount < 0) {
    throw new ContractError('bad_request', 'employeeCount must be a non-negative integer', 400);
  }

  if (!duplicateEmployeeIds || !missingShiftCodes || isFinalized === null || isValid === null || !previewEmployees) {
    throw new ContractError('bad_request', 'employee import response is missing required fields', 400);
  }

  return {
    organizationId,
    month,
    employeeCount,
    duplicateEmployeeIds,
    missingShiftCodes,
    isFinalized,
    isValid,
    previewEmployees,
  };
}

export function parseEmployeeImportValidateResponse(payload: unknown): EmployeeImportPreviewResponse {
  return parseEmployeeImportPreviewResponse(payload);
}

export function parseEmployeeImportApplyResponse(payload: unknown): EmployeeImportApplyResponse {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new ContractError('bad_request', 'employee import apply response must be a JSON object', 400);
  }

  const record = payload as Record<string, unknown>;
  const deletedScheduleId =
    typeof record.deletedScheduleId === 'string' && record.deletedScheduleId.trim().length > 0
      ? record.deletedScheduleId.trim()
      : record.deletedScheduleId === null
        ? null
        : undefined;

  const preview = parseEmployeeImportPreviewResponse(record);

  if (deletedScheduleId === undefined) {
    throw new ContractError('bad_request', 'deletedScheduleId must be a string or null', 400);
  }

  return {
    ...preview,
    deletedScheduleId,
  };
}

function parseFairnessLedgerProofSummary(payload: unknown): FairnessLedgerProofSummary {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new ContractError('bad_request', 'fairness proof summary must be a JSON object', 400);
  }

  const record = payload as Record<string, unknown>;
  const readCount = (key: keyof FairnessLedgerProofSummary): number => {
    const value = record[key];
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : NaN;
  };

  const proofSummary = {
    weeklyHoursViolations: readCount('weeklyHoursViolations'),
    nnnViolations: readCount('nnnViolations'),
    nodViolations: readCount('nodViolations'),
    minimumRestViolations: readCount('minimumRestViolations'),
    staffingShortfalls: readCount('staffingShortfalls'),
  };

  if (Object.values(proofSummary).some((value) => !Number.isFinite(value))) {
    throw new ContractError('bad_request', 'fairness proof summary must contain counts', 400);
  }

  return proofSummary;
}

function parseFairnessLedgerWindowSummary(payload: unknown): FairnessLedgerWindowSummary {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new ContractError('bad_request', 'fairness summary item must be a JSON object', 400);
  }

  const record = payload as Record<string, unknown>;
  const months = record.months;
  const windowStartMonth = typeof record.windowStartMonth === 'string' ? record.windowStartMonth.trim() : null;
  const windowEndMonth = typeof record.windowEndMonth === 'string' ? record.windowEndMonth.trim() : null;
  const finalizedVersionCount =
    typeof record.finalizedVersionCount === 'number' ? record.finalizedVersionCount : NaN;

  if (months !== 3 && months !== 6 && months !== 12) {
    throw new ContractError('bad_request', 'months must be one of 3, 6, or 12', 400);
  }

  if (!Number.isInteger(finalizedVersionCount) || finalizedVersionCount < 0) {
    throw new ContractError('bad_request', 'finalizedVersionCount must be a non-negative integer', 400);
  }

  return {
    months,
    windowStartMonth: windowStartMonth && /^\d{4}-\d{2}$/.test(windowStartMonth) ? windowStartMonth : null,
    windowEndMonth: windowEndMonth && /^\d{4}-\d{2}$/.test(windowEndMonth) ? windowEndMonth : null,
    finalizedVersionCount,
    proofSummary: parseFairnessLedgerProofSummary(record.proofSummary),
  };
}

function parseChecklistItemKey(value: unknown): ChecklistItemKey {
  switch (value) {
    case 'organization_profile':
    case 'schedule_foundation':
    case 'employee_roster':
    case 'off_request_policy':
    case 'schedule_review':
      return value;
    default:
      throw new ContractError('bad_request', 'checklist item key is invalid', 400);
  }
}

function parseChecklistItemStatus(value: unknown): ChecklistItemStatus {
  switch (value) {
    case 'ready':
    case 'blocked':
      return value;
    default:
      throw new ContractError('bad_request', 'checklist item status is invalid', 400);
  }
}

function parseChecklistItem(payload: unknown): ChecklistItem {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new ContractError('bad_request', 'checklist item must be a JSON object', 400);
  }

  const record = payload as Record<string, unknown>;
  const title = typeof record.title === 'string' ? record.title.trim() : '';
  const route = typeof record.route === 'string' ? record.route.trim() : null;
  const blockedReason =
    typeof record.blockedReason === 'string' && record.blockedReason.trim().length > 0
      ? record.blockedReason.trim()
      : null;

  if (!title) {
    throw new ContractError('bad_request', 'checklist item title is required', 400);
  }

  return {
    key: parseChecklistItemKey(record.key),
    title,
    status: parseChecklistItemStatus(record.status),
    route: route && route.length > 0 ? route : null,
    blockedReason,
  };
}

export function parseChecklistUpdateRequest(payload: unknown): ChecklistUpdateRequest {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new ContractError('bad_request', 'checklist request must be a JSON object', 400);
  }

  const record = payload as Record<string, unknown>;
  const organizationId = typeof record.organizationId === 'string' ? record.organizationId.trim() : '';
  const checklistCursor =
    typeof record.checklistCursor === 'string' && record.checklistCursor.trim().length > 0
      ? parseChecklistItemKey(record.checklistCursor.trim())
      : null;

  if (!organizationId || !isValidUuid(organizationId)) {
    throw new ContractError('bad_request', 'organizationId must be a valid UUID', 400);
  }

  return {
    organizationId,
    checklistCursor,
  };
}

export function parseChecklistResponse(payload: unknown): ChecklistResponse {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new ContractError('bad_request', 'checklist response must be a JSON object', 400);
  }

  const record = payload as Record<string, unknown>;
  const organizationId = typeof record.organizationId === 'string' ? record.organizationId.trim() : '';
  const checklistCursor =
    typeof record.checklistCursor === 'string' && record.checklistCursor.trim().length > 0
      ? parseChecklistItemKey(record.checklistCursor.trim())
      : null;
  const ready = record.ready;
  const items = Array.isArray(record.items) ? record.items.map((item) => parseChecklistItem(item)) : null;
  const fairnessSummary = Array.isArray(record.fairnessSummary)
    ? record.fairnessSummary.map((item) => parseFairnessLedgerWindowSummary(item))
    : null;

  if (!organizationId || !isValidUuid(organizationId)) {
    throw new ContractError('bad_request', 'organizationId must be a valid UUID', 400);
  }

  if (typeof ready !== 'boolean') {
    throw new ContractError('bad_request', 'ready must be a boolean', 400);
  }

  if (!items) {
    throw new ContractError('bad_request', 'items must be an array', 400);
  }

  if (!fairnessSummary) {
    throw new ContractError('bad_request', 'fairnessSummary must be an array', 400);
  }

  return {
    organizationId,
    checklistCursor,
    ready,
    items,
    fairnessSummary,
  };
}
