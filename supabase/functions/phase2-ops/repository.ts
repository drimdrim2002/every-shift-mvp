import {
  ContractError,
  type ChecklistUpdateRequest,
  type ChecklistResponse,
  type BootstrapAdminRequest,
  type BootstrapAdminResponse,
  type FairnessLedgerProofSummary,
  type FairnessLedgerWindowMonths,
  type FairnessLedgerWindowSummary,
  type EmployeeImportApplyResponse,
  type EmployeeImportEmployeePayload,
  type EmployeeImportPreviewEmployee,
  type EmployeeImportPreviewResponse,
  type EmployeeImportRequest,
  type OrganizationProfileRequest,
  type OrganizationProfileResponse,
  type OffRequestPolicyPeriodType,
  type OffRequestPolicyRankCodeRecord,
  type OffRequestPolicyRuleRecord,
  type OffRequestPolicySetupRequest,
  type OffRequestPolicySetupResponse,
  type ShiftsConstraintsRequest,
  type ShiftsConstraintsResponse,
  type SiteRequest,
  type SiteResponse,
  type SitesRequest,
  type SitesResponse,
} from './contracts.ts';
import {
  emitPhase2OpsEvent,
  type Phase2OpsEventName,
} from './observability.ts';
import type { Phase2OpsOperatorAuthContext } from './auth.ts';
import { buildChecklistResponse, type ChecklistSnapshot } from './checklist.ts';

interface Phase2OpsDbError {
  message: string;
}

interface TargetAuthUser {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
}

interface ListUsersResult {
  data: {
    users: TargetAuthUser[];
  };
  error: Phase2OpsDbError | null;
}

interface UpdateUserResult {
  data: {
    user: TargetAuthUser | null;
  } | null;
  error: Phase2OpsDbError | null;
}

interface QueryResult<T> {
  data: T | null;
  error: Phase2OpsDbError | null;
}

interface QueryBuilder<T> extends PromiseLike<QueryResult<T>> {
  select(columns: string): QueryBuilder<T>;
  eq(column: string, value: string): QueryBuilder<T>;
  limit(count: number): QueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): QueryBuilder<T>;
  delete(): QueryBuilder<T>;
  update(payload: Record<string, unknown>): {
    eq(column: string, value: string): Promise<QueryResult<unknown>>;
  };
  maybeSingle(): Promise<QueryResult<T extends Array<infer R> ? R : T>>;
}

interface ProfileRow {
  id: string;
  organization_id: string | null;
  role: string | null;
  display_name: string | null;
  status: string | null;
}

interface OnboardingProgressRow {
  id: string;
  organization_id: string;
  current_step: number;
  current_step_key: string | null;
  organization_info_confirmed_at?: string | null;
  organization_info_confirmed_by?: string | null;
}

interface OrganizationRow {
  id: string;
  name: string | null;
  type: string | null;
}

interface SiteRow {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  is_active: boolean;
  is_schedule_active: boolean;
}

interface OrganizationSettingsRow {
  organization_id: string;
  pilot_site_id: string | null;
  minimum_rest_hours: number | null;
  checklist_cursor: string | null;
}

interface SiteRequirementRow {
  id: string;
  organization_id: string;
}

interface ScheduleRow {
  id: string;
  organization_id: string;
  month: string;
  finalized_version_id: string | null;
}

interface ShiftRow {
  id: string;
  code: string;
}

interface OrganizationRankCodeRow {
  id: string;
  organization_id: string;
  code: string;
  label: string;
  display_order: number;
  is_active: boolean;
}

interface OffRequestPolicyRuleRow {
  id: string;
  organization_id: string;
  rank_code: string | null;
  period_type: OffRequestPolicyPeriodType;
  limit_count: number;
  is_active: boolean;
}

interface FairnessLedgerMonthlyRow {
  organization_id: string;
  month: string;
  finalized_at: string | null;
  result_status: string;
  proof_summary: unknown;
  comparison_metrics: unknown;
}

interface EmployeeImportValidationState {
  organizationId: string;
  month: string;
  employeeCount: number;
  duplicateEmployeeIds: string[];
  missingShiftCodes: string[];
  isFinalized: boolean;
  isValid: boolean;
  previewEmployees: EmployeeImportPreviewEmployee[];
}

type TableName = 'profiles' | 'onboarding_progress';
type Phase2OpsTableName =
  | TableName
  | 'organizations'
  | 'sites'
  | 'organization_settings'
  | 'site_requirements'
  | 'employees'
  | 'schedules'
  | 'shifts'
  | 'organization_rank_codes'
  | 'off_request_policy_rules'
  | 'fairness_ledger_monthly';

export interface Phase2OpsRepositoryClient {
  auth: {
    admin: {
      listUsers(params?: { page?: number; perPage?: number }): Promise<ListUsersResult>;
      updateUserById(
        userId: string,
        attributes: {
          app_metadata?: Record<string, unknown>;
          user_metadata?: Record<string, unknown>;
        }
      ): Promise<UpdateUserResult>;
    };
  };
  rpc(
    fn: string,
    params: Record<string, unknown>
  ): Promise<QueryResult<Record<string, unknown> | Record<string, unknown>[]>>;
  from(table: Phase2OpsTableName): QueryBuilder<Record<string, unknown> | Record<string, unknown>[]>;
}

export type Phase2OpsEventEmitter = (
  event: Phase2OpsEventName,
  payload: Record<string, unknown>
) => void;

const AUTH_USER_LOOKUP_PAGE_SIZE = 200;
const AUTH_USER_LOOKUP_MAX_PAGES = 1000;
const INITIAL_FOUNDATION_STEP_KEY = 'organization_info';
const INITIAL_CHECKLIST_CURSOR = 'organization_profile';
const ORGANIZATION_METADATA_KEYS = [
  'organization_id',
  'organizationId',
  'current_organization_id',
  'currentOrganizationId',
] as const;

interface FoundationMetadata {
  current_step_key: string | null;
  organization_info_confirmed_at: string | null;
  organization_info_confirmed_by: string | null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readStringValue(metadata: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function readNumberValue(
  record: Record<string, unknown>,
  keys: readonly string[],
  fallback = 0
): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return fallback;
}

function normalizeChecklistCursor(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  switch (normalized) {
    case 'organization_info':
      return INITIAL_CHECKLIST_CURSOR;
    case 'organization_profile':
    case 'schedule_foundation':
    case 'employee_roster':
    case 'off_request_policy':
    case 'schedule_review':
      return normalized;
    default:
      return null;
  }
}

function mapChecklistCursorToStep(checklistCursor: string | null): number {
  switch (checklistCursor) {
    case 'schedule_foundation':
      return 2;
    case 'employee_roster':
      return 3;
    case 'off_request_policy':
      return 4;
    case 'schedule_review':
      return 5;
    case 'organization_profile':
    default:
      return 1;
  }
}

function readFoundationMetadataFromRecord(metadata: Record<string, unknown>): FoundationMetadata | null {
  const foundationRoot =
    typeof metadata.foundation === 'object' && metadata.foundation !== null && !Array.isArray(metadata.foundation)
      ? asRecord(metadata.foundation)
      : metadata;
  const currentStepKey = readStringValue(foundationRoot, [
    'current_step_key',
    'currentStepKey',
    'onboarding_step_key',
    'onboardingStepKey',
  ]);
  const organizationInfoConfirmedAt = readStringValue(foundationRoot, [
    'organization_info_confirmed_at',
    'organizationInfoConfirmedAt',
  ]);
  const organizationInfoConfirmedBy = readStringValue(foundationRoot, [
    'organization_info_confirmed_by',
    'organizationInfoConfirmedBy',
  ]);

  if (!currentStepKey && !organizationInfoConfirmedAt && !organizationInfoConfirmedBy) {
    return null;
  }

  return {
    current_step_key: currentStepKey,
    organization_info_confirmed_at: organizationInfoConfirmedAt,
    organization_info_confirmed_by: organizationInfoConfirmedBy,
  };
}

function readFoundationMetadata(user: TargetAuthUser): FoundationMetadata | null {
  return (
    readFoundationMetadataFromRecord(asRecord(user.app_metadata))
    ?? readFoundationMetadataFromRecord(asRecord(user.user_metadata))
  );
}

function buildFoundationMetadata(
  user: TargetAuthUser,
  onboardingProgress: OnboardingProgressRow | null
): FoundationMetadata {
  const existing = readFoundationMetadata(user);

  return {
    current_step_key:
      existing?.current_step_key ?? onboardingProgress?.current_step_key ?? INITIAL_FOUNDATION_STEP_KEY,
    organization_info_confirmed_at:
      existing?.organization_info_confirmed_at
      ?? onboardingProgress?.organization_info_confirmed_at
      ?? null,
    organization_info_confirmed_by:
      existing?.organization_info_confirmed_by
      ?? onboardingProgress?.organization_info_confirmed_by
      ?? null,
  };
}

function buildProfilePayload(
  targetUserId: string,
  request: BootstrapAdminRequest
): Record<string, unknown> {
  return {
    id: targetUserId,
    organization_id: request.organizationId,
    role: 'admin',
    display_name: request.displayName,
    status: 'active',
    global_role: 'user',
    account_status: 'active',
  };
}

function buildProfileUpdatePayload(request: BootstrapAdminRequest): Record<string, unknown> {
  return {
    organization_id: request.organizationId,
    role: 'admin',
    display_name: request.displayName,
    status: 'active',
    global_role: 'user',
    account_status: 'active',
  };
}

function isDuplicateConflict(error: Phase2OpsDbError | null): boolean {
  if (!error) {
    return false;
  }

  return /duplicate|already exists|unique constraint|23505/i.test(error.message);
}

function assertBootstrapOrganizationAccess(
  auth: Phase2OpsOperatorAuthContext,
  organizationId: string
): void {
  if (auth.operatorGlobalRole === 'super') {
    return;
  }

  if (
    auth.operatorGlobalRole === 'admin' &&
    auth.operatorOrganizationId &&
    auth.operatorOrganizationId === organizationId
  ) {
    return;
  }

  throw new ContractError(
    'organization_access_denied',
    'Authenticated user is not authorized for the requested organization',
    403
  );
}

function assertOrganizationAccess(
  auth: Phase2OpsOperatorAuthContext,
  organizationId: string
): void {
  if (auth.operatorGlobalRole === 'super') {
    return;
  }

  if (
    auth.operatorGlobalRole === 'admin' &&
    auth.operatorOrganizationId &&
    auth.operatorOrganizationId === organizationId
  ) {
    return;
  }

  if (
    auth.operatorRole === 'admin' &&
    auth.operatorStatus === 'active' &&
    auth.operatorOrganizationId === organizationId
  ) {
    return;
  }

  throw new ContractError(
    'organization_access_denied',
    'Authenticated user is not authorized for the requested organization',
    403
  );
}

function needsMetadataAlignment(user: TargetAuthUser, organizationId: string): boolean {
  const appMetadata = asRecord(user.app_metadata);
  const foundation = readFoundationMetadata(user);

  return (
    ORGANIZATION_METADATA_KEYS.some((key) => appMetadata[key] !== organizationId)
    || foundation === null
  );
}

function normalizeEmployeeImportEmployee(
  employee: EmployeeImportEmployeePayload
): EmployeeImportPreviewEmployee {
  const employeeId = employee.employeeId.trim();
  const name = employee.name.trim();
  const availableShifts = employee.availableShifts
    .map((shift) => shift.trim().toUpperCase())
    .filter(Boolean);
  const normalized: EmployeeImportPreviewEmployee = {
    employeeId,
    name,
    availableShifts,
  };

  if (employee.rankCode === null) {
    normalized.rankCode = null;
  } else if (typeof employee.rankCode === 'string' && employee.rankCode.trim().length > 0) {
    normalized.rankCode = employee.rankCode.trim();
  }

  return normalized;
}

function collectDuplicateEmployeeIds(employees: EmployeeImportPreviewEmployee[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const employee of employees) {
    if (seen.has(employee.employeeId)) {
      duplicates.add(employee.employeeId);
      continue;
    }

    seen.add(employee.employeeId);
  }

  return [...duplicates];
}

function collectMissingShiftCodes(
  employees: EmployeeImportPreviewEmployee[],
  allowedShiftCodes: Set<string>
): string[] {
  const missing = new Set<string>();

  for (const employee of employees) {
    for (const shiftCode of employee.availableShifts) {
      const normalizedShiftCode = shiftCode.trim().toUpperCase();
      if (normalizedShiftCode && !allowedShiftCodes.has(normalizedShiftCode)) {
        missing.add(normalizedShiftCode);
      }
    }
  }

  return [...missing];
}

async function loadScheduleForImport(
  client: Phase2OpsRepositoryClient,
  organizationId: string,
  month: string
): Promise<ScheduleRow | null> {
  const result = await client
    .from('schedules')
    .select('id, organization_id, month, finalized_version_id')
    .eq('organization_id', organizationId)
    .eq('month', month)
    .limit(1)
    .maybeSingle();

  if (result.error) {
    throw new ContractError('internal_error', result.error.message, 500);
  }

  return (result.data as ScheduleRow | null) ?? null;
}

async function loadShiftCodes(
  client: Phase2OpsRepositoryClient,
  organizationId: string
): Promise<Set<string>> {
  const result = await client
    .from('shifts')
    .select('id, code')
    .eq('organization_id', organizationId);

  if (result.error) {
    throw new ContractError('internal_error', result.error.message, 500);
  }

  const rows = Array.isArray(result.data) ? (result.data as ShiftRow[]) : [];
  return new Set(
    rows
      .map((row) => row.code.trim().toUpperCase())
      .filter((code) => code.length > 0)
  );
}

async function validateEmployeeImportRequest(
  client: Phase2OpsRepositoryClient,
  request: EmployeeImportRequest
): Promise<EmployeeImportValidationState> {
  const previewEmployees = request.employees.map((employee) => normalizeEmployeeImportEmployee(employee));
  const allowedShiftCodes = await loadShiftCodes(client, request.organizationId);
  const schedule = await loadScheduleForImport(client, request.organizationId, request.month);
  const duplicateEmployeeIds = collectDuplicateEmployeeIds(previewEmployees);
  const missingShiftCodes = collectMissingShiftCodes(previewEmployees, allowedShiftCodes);
  const isFinalized = Boolean(schedule?.finalized_version_id);

  return {
    organizationId: request.organizationId,
    month: request.month,
    employeeCount: previewEmployees.length,
    duplicateEmployeeIds,
    missingShiftCodes,
    isFinalized,
    isValid: !isFinalized && duplicateEmployeeIds.length === 0 && missingShiftCodes.length === 0,
    previewEmployees,
  };
}

function toEmployeeImportPreviewResponse(state: EmployeeImportValidationState): EmployeeImportPreviewResponse {
  return {
    organizationId: state.organizationId,
    month: state.month,
    employeeCount: state.employeeCount,
    duplicateEmployeeIds: state.duplicateEmployeeIds,
    missingShiftCodes: state.missingShiftCodes,
    isFinalized: state.isFinalized,
    isValid: state.isValid,
    previewEmployees: state.previewEmployees,
  };
}

async function findTargetAuthUserByEmail(
  client: Phase2OpsRepositoryClient,
  email: string
): Promise<TargetAuthUser> {
  const targetEmail = email.trim().toLowerCase();

  for (let page = 1; page <= AUTH_USER_LOOKUP_MAX_PAGES; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: AUTH_USER_LOOKUP_PAGE_SIZE,
    });

    if (error) {
      throw new ContractError('internal_error', error.message, 500);
    }

    const users = data.users;
    const user = users.find((candidate) => candidate.email?.trim().toLowerCase() === targetEmail);

    if (user) {
      return user;
    }

    if (users.length < AUTH_USER_LOOKUP_PAGE_SIZE) {
      break;
    }
  }

  throw new ContractError('not_found', 'Target auth user not found for the requested email', 404);
}

async function loadProfile(
  client: Phase2OpsRepositoryClient,
  userId: string
): Promise<ProfileRow | null> {
  const { data, error } = await client
    .from('profiles')
    .select('id, organization_id, role, display_name, status')
    .eq('id', userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new ContractError('internal_error', error.message, 500);
  }

  return (data as ProfileRow | null) ?? null;
}

async function loadOnboardingProgress(
  client: Phase2OpsRepositoryClient,
  organizationId: string
): Promise<OnboardingProgressRow | null> {
  const { data, error } = await client
    .from('onboarding_progress')
    .select(
      'id, organization_id, current_step, current_step_key, organization_info_confirmed_at, organization_info_confirmed_by'
    )
    .eq('organization_id', organizationId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new ContractError('internal_error', error.message, 500);
  }

  return (data as OnboardingProgressRow | null) ?? null;
}

async function syncProfile(
  client: Phase2OpsRepositoryClient,
  targetUserId: string,
  request: BootstrapAdminRequest
): Promise<void> {
  const existingProfile = await loadProfile(client, targetUserId);

  if (existingProfile) {
    const { error } = await client
      .from('profiles')
      .update(buildProfileUpdatePayload(request))
      .eq('id', targetUserId);

    if (error) {
      throw new ContractError('internal_error', error.message, 500);
    }

    return;
  }

  const { error } = await client.from('profiles').insert(buildProfilePayload(targetUserId, request));

  if (!error) {
    return;
  }

  if (isDuplicateConflict(error)) {
    const { error: updateError } = await client
      .from('profiles')
      .update(buildProfileUpdatePayload(request))
      .eq('id', targetUserId);

    if (!updateError) {
      return;
    }

    throw new ContractError('internal_error', updateError.message, 500);
  }

  if (error) {
    throw new ContractError('internal_error', error.message, 500);
  }
}

async function ensureOnboardingProgress(
  client: Phase2OpsRepositoryClient,
  auth: Phase2OpsOperatorAuthContext,
  organizationId: string
): Promise<OnboardingProgressRow> {
  const existingProgress = await loadOnboardingProgress(client, organizationId);

  if (existingProgress) {
    return existingProgress;
  }

  const { error } = await client.from('onboarding_progress').insert({
    organization_id: organizationId,
    current_step: 1,
    current_step_key: INITIAL_FOUNDATION_STEP_KEY,
    last_actor_user_id: auth.operatorUserId,
  });

  if (!error) {
    const createdProgress = await loadOnboardingProgress(client, organizationId);
    if (createdProgress) {
      return createdProgress;
    }

    return {
      id: '',
      organization_id: organizationId,
      current_step: 1,
      current_step_key: INITIAL_FOUNDATION_STEP_KEY,
      organization_info_confirmed_at: null,
      organization_info_confirmed_by: null,
    };
  }

  if (isDuplicateConflict(error)) {
    const convergedProgress = await loadOnboardingProgress(client, organizationId);
    if (convergedProgress) {
      return convergedProgress;
    }
  }

  throw new ContractError('internal_error', error.message, 500);
}

async function alignAuthMetadata(
  client: Phase2OpsRepositoryClient,
  targetUser: TargetAuthUser,
  organizationId: string,
  onboardingProgress: OnboardingProgressRow | null
): Promise<void> {
  if (!needsMetadataAlignment(targetUser, organizationId)) {
    return;
  }

  const appMetadata = {
    ...asRecord(targetUser.app_metadata),
    organization_id: organizationId,
    organizationId: organizationId,
    current_organization_id: organizationId,
    currentOrganizationId: organizationId,
    foundation: buildFoundationMetadata(targetUser, onboardingProgress),
  };

  const { error } = await client.auth.admin.updateUserById(targetUser.id, {
    app_metadata: appMetadata,
  });

  if (error) {
    throw new ContractError('internal_error', error.message, 500);
  }
}

function remapEmployeeImportFailure(
  state: EmployeeImportValidationState
): never {
  if (state.isFinalized) {
    throw new ContractError('already_finalized', 'Schedule is already finalized', 409);
  }

  if (state.duplicateEmployeeIds.length > 0) {
    throw new ContractError(
      'bad_request',
      `Duplicate employee IDs: ${state.duplicateEmployeeIds.join(', ')}`,
      400
    );
  }

  if (state.missingShiftCodes.length > 0) {
    throw new ContractError(
      'bad_request',
      `Unknown shift codes: ${state.missingShiftCodes.join(', ')}`,
      400
    );
  }

  throw new ContractError('bad_request', 'Employee import preview is invalid', 400);
}

function toApplyResponse(
  state: EmployeeImportValidationState,
  applied: { deletedScheduleId: string | null; employeeCount: number }
): EmployeeImportApplyResponse {
  return {
    ...toEmployeeImportPreviewResponse(state),
    deletedScheduleId: applied.deletedScheduleId,
    employeeCount: applied.employeeCount,
  };
}

async function callResetRosterBoundary(
  client: Phase2OpsRepositoryClient,
  request: EmployeeImportRequest
): Promise<{ deletedScheduleId: string | null; employeeCount: number }> {
  const { data, error } = await client.rpc('replace_roster_and_reset_schedule_atomic', {
    p_organization_id: request.organizationId,
    p_month: request.month,
    p_employees: request.employees.map((employee) => ({
      employee_id: employee.employeeId,
      name: employee.name,
      available_shifts: employee.availableShifts,
      rank_code: employee.rankCode ?? null,
    })),
  });

  if (error) {
    if (/already_finalized/i.test(error.message)) {
      throw new ContractError('already_finalized', 'Schedule is already finalized', 409);
    }

    throw new ContractError('internal_error', error.message, 500);
  }

  const row = Array.isArray(data) ? (data[0] as Record<string, unknown> | null) : data;

  return {
    deletedScheduleId:
      typeof row?.deleted_schedule_id === 'string' ? row.deleted_schedule_id : null,
    employeeCount: typeof row?.employee_count === 'number' ? row.employee_count : 0,
  };
}

function normalizeOffRequestPolicyRankCode(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeOffRequestPolicySetupRequest(
  request: OffRequestPolicySetupRequest
): OffRequestPolicySetupRequest {
  return {
    organizationId: request.organizationId,
    rankCodes: request.rankCodes.map((rankCode) => ({
      ...rankCode,
      code: rankCode.code.trim(),
      label: rankCode.label.trim(),
    })),
    policyRules: request.policyRules.map((rule) => ({
      ...rule,
      rankCode: normalizeOffRequestPolicyRankCode(rule.rankCode),
    })),
  };
}

function ensureNoOffRequestPolicyOverlap(request: OffRequestPolicySetupRequest): void {
  const activeRuleKeys = new Set<string>();

  for (const rule of request.policyRules) {
    if (!rule.isActive) {
      continue;
    }

    const key = `${rule.periodType}:${normalizeOffRequestPolicyRankCode(rule.rankCode) ?? '__default__'}`;
    if (activeRuleKeys.has(key)) {
      throw new ContractError(
        'bad_request',
        'Overlapping active off-request policies are not allowed',
        400
      );
    }

    activeRuleKeys.add(key);
  }
}

function ensureOffRequestPolicyRuleRankCodesExist(request: OffRequestPolicySetupRequest): void {
  const availableRankCodes = new Set(
    request.rankCodes
      .filter((rankCode) => rankCode.isActive)
      .map((rankCode) => rankCode.code.trim())
      .filter((code) => code.length > 0)
  );

  for (const rule of request.policyRules) {
    const normalizedRankCode = normalizeOffRequestPolicyRankCode(rule.rankCode);
    if (normalizedRankCode === null) {
      continue;
    }

    if (!availableRankCodes.has(normalizedRankCode)) {
      throw new ContractError(
        'bad_request',
        `Unknown or inactive rank code in off-request policy rule: ${normalizedRankCode}`,
        400
      );
    }
  }
}

function toOffRequestPolicyRankCodeResponse(
  row: OrganizationRankCodeRow
): OffRequestPolicyRankCodeRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    code: row.code,
    label: row.label,
    displayOrder: row.display_order,
    isActive: row.is_active,
  };
}

function toOffRequestPolicyRuleResponse(row: OffRequestPolicyRuleRow): OffRequestPolicyRuleRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    rankCode: normalizeOffRequestPolicyRankCode(row.rank_code),
    periodType: row.period_type,
    limitCount: row.limit_count,
    isActive: row.is_active,
  };
}

function sortOffRequestPolicyRankCodes(
  rankCodes: OffRequestPolicyRankCodeRecord[]
): OffRequestPolicyRankCodeRecord[] {
  return [...rankCodes].sort((left, right) => {
    if (left.displayOrder !== right.displayOrder) {
      return left.displayOrder - right.displayOrder;
    }

    return left.code.localeCompare(right.code);
  });
}

function sortOffRequestPolicyRules(
  policyRules: OffRequestPolicyRuleRecord[]
): OffRequestPolicyRuleRecord[] {
  return [...policyRules].sort((left, right) => {
    if (left.periodType !== right.periodType) {
      return left.periodType.localeCompare(right.periodType);
    }

    if (left.rankCode === right.rankCode) {
      return left.limitCount - right.limitCount;
    }

    if (left.rankCode === null) {
      return -1;
    }

    if (right.rankCode === null) {
      return 1;
    }

    return left.rankCode.localeCompare(right.rankCode);
  });
}

export function resolveApplicableOffRequestPolicyRule<
  T extends { rankCode: string | null; periodType: OffRequestPolicyPeriodType; isActive: boolean }
>(
  policyRules: T[],
  rankCode: string | null,
  periodType: OffRequestPolicyPeriodType
): T | null {
  const normalizedRankCode = normalizeOffRequestPolicyRankCode(rankCode);

  return (
    policyRules.find(
      (rule) =>
        rule.isActive &&
        rule.periodType === periodType &&
        normalizeOffRequestPolicyRankCode(rule.rankCode) === normalizedRankCode
    ) ??
    policyRules.find(
      (rule) => rule.isActive && rule.periodType === periodType && rule.rankCode === null
    ) ??
    null
  );
}

async function loadOffRequestPolicySetupRows(
  client: Phase2OpsRepositoryClient,
  organizationId: string
): Promise<OffRequestPolicySetupResponse> {
  const rankCodeResult = await client
    .from('organization_rank_codes')
    .select('id, organization_id, code, label, display_order, is_active')
    .eq('organization_id', organizationId)
    .order('display_order', { ascending: true });

  if ((rankCodeResult as QueryResult<OrganizationRankCodeRow[]>).error) {
    throw new ContractError(
      'internal_error',
      (rankCodeResult as QueryResult<OrganizationRankCodeRow[]>).error?.message ?? 'Internal error',
      500
    );
  }

  const policyRuleResult = await client
    .from('off_request_policy_rules')
    .select('id, organization_id, rank_code, period_type, limit_count, is_active')
    .eq('organization_id', organizationId)
    .order('period_type', { ascending: true });

  if ((policyRuleResult as QueryResult<OffRequestPolicyRuleRow[]>).error) {
    throw new ContractError(
      'internal_error',
      (policyRuleResult as QueryResult<OffRequestPolicyRuleRow[]>).error?.message ?? 'Internal error',
      500
    );
  }

  const rankCodes = Array.isArray((rankCodeResult as QueryResult<OrganizationRankCodeRow[]>).data)
    ? sortOffRequestPolicyRankCodes(
        ((rankCodeResult as QueryResult<OrganizationRankCodeRow[]>).data ?? []).map(
          (row) => toOffRequestPolicyRankCodeResponse(row)
        )
      )
    : [];
  const policyRules = Array.isArray((policyRuleResult as QueryResult<OffRequestPolicyRuleRow[]>).data)
    ? sortOffRequestPolicyRules(
        ((policyRuleResult as QueryResult<OffRequestPolicyRuleRow[]>).data ?? []).map((row) =>
          toOffRequestPolicyRuleResponse(row)
        )
      )
    : [];

  return {
    organizationId,
    rankCodes,
    policyRules,
  };
}

function toRankCodeInsertPayload(
  request: OffRequestPolicySetupRequest
): Record<string, unknown>[] {
  return request.rankCodes.map((rankCode) => ({
    id: rankCode.id,
    code: rankCode.code,
    label: rankCode.label,
    display_order: rankCode.displayOrder,
    is_active: rankCode.isActive,
  }));
}

function toPolicyRuleInsertPayload(request: OffRequestPolicySetupRequest): Record<string, unknown>[] {
  return request.policyRules.map((rule) => ({
    id: rule.id,
    rank_code: normalizeOffRequestPolicyRankCode(rule.rankCode),
    period_type: rule.periodType,
    limit_count: rule.limitCount,
    is_active: rule.isActive,
  }));
}

function toSiteResponse(row: SiteRow): SiteResponse {
  return {
    id: row.id,
    organizationId: row.organization_id,
    code: row.code,
    name: row.name,
    isActive: row.is_active,
    isScheduleActive: row.is_schedule_active,
  };
}

async function loadOpsSites(
  client: Phase2OpsRepositoryClient,
  organizationId: string
): Promise<SiteRow[]> {
  const result = await client
    .from('sites')
    .select('id, organization_id, code, name, is_active, is_schedule_active')
    .eq('organization_id', organizationId)
    .order('code', { ascending: true });

  if ((result as QueryResult<SiteRow[]>).error) {
    throw new ContractError(
      'internal_error',
      (result as QueryResult<SiteRow[]>).error?.message ?? 'Internal error',
      500
    );
  }

  return Array.isArray((result as QueryResult<SiteRow[]>).data)
    ? ((result as QueryResult<SiteRow[]>).data ?? [])
    : [];
}

function assertExactlyOneScheduleActiveSite(sites: SiteRequest[]): void {
  const activeCount = sites.filter((site) => site.isScheduleActive === true).length;

  if (activeCount !== 1) {
    throw new ContractError('bad_request', 'Exactly one schedule-active site is required', 400);
  }
}

function toSiteUpsertPayload(request: SitesRequest): Record<string, unknown>[] {
  return request.sites.map((site) => ({
    organization_id: request.organizationId,
    code: site.code,
    name: site.name,
    is_active: site.isActive,
    is_schedule_active: site.isScheduleActive,
  }));
}

export async function getOrganizationProfile(
  client: Phase2OpsRepositoryClient,
  auth: Phase2OpsOperatorAuthContext,
  organizationId: string
): Promise<OrganizationProfileResponse> {
  assertOrganizationAccess(auth, organizationId);
  const organization = await loadChecklistOrganization(client, organizationId);

  if (!organization) {
    throw new ContractError('not_found', 'Organization not found', 404);
  }

  return {
    organizationId: organization.id,
    name: organization.name ?? '',
    type: organization.type ?? '',
  };
}

export async function saveOrganizationProfile(
  client: Phase2OpsRepositoryClient,
  auth: Phase2OpsOperatorAuthContext,
  request: OrganizationProfileRequest
): Promise<OrganizationProfileResponse> {
  assertOrganizationAccess(auth, request.organizationId);

  const { error } = await client
    .from('organizations')
    .update({
      name: request.name,
      type: request.type,
    })
    .eq('id', request.organizationId);

  if (error) {
    throw new ContractError('internal_error', error.message, 500);
  }

  await ensureOnboardingProgress(client, auth, request.organizationId);

  const progressResult = await client
    .from('onboarding_progress')
    .update({
      current_step: mapChecklistCursorToStep('schedule_foundation'),
      current_step_key: 'schedule_foundation',
      organization_info_confirmed_at: new Date().toISOString(),
      organization_info_confirmed_by: auth.operatorUserId,
      last_actor_user_id: auth.operatorUserId,
    })
    .eq('organization_id', request.organizationId);

  if (progressResult.error) {
    throw new ContractError('internal_error', progressResult.error.message, 500);
  }

  return {
    organizationId: request.organizationId,
    name: request.name,
    type: request.type,
  };
}

export async function getSites(
  client: Phase2OpsRepositoryClient,
  auth: Phase2OpsOperatorAuthContext,
  organizationId: string
): Promise<SitesResponse> {
  assertOrganizationAccess(auth, organizationId);
  const [settings, sites] = await Promise.all([
    loadOrganizationSettings(client, organizationId),
    loadOpsSites(client, organizationId),
  ]);

  return {
    organizationId,
    pilotSiteId: settings?.pilot_site_id ?? null,
    sites: sites.map((site) => toSiteResponse(site)),
  };
}

export async function saveSites(
  client: Phase2OpsRepositoryClient,
  auth: Phase2OpsOperatorAuthContext,
  request: SitesRequest
): Promise<SitesResponse> {
  assertOrganizationAccess(auth, request.organizationId);
  assertExactlyOneScheduleActiveSite(request.sites);

  const [settings, existingSites] = await Promise.all([
    loadOrganizationSettings(client, request.organizationId),
    loadOpsSites(client, request.organizationId),
  ]);
  const activeSiteRequest = request.sites.find((site) => site.isScheduleActive);
  const currentActiveSite = existingSites.find((site) => site.is_schedule_active);

  if (
    settings?.pilot_site_id &&
    currentActiveSite &&
    activeSiteRequest &&
    currentActiveSite.code !== activeSiteRequest.code
  ) {
    throw new ContractError(
      'bad_request',
      'Changing the schedule-active pilot site code is not supported in Phase2A',
      400
    );
  }

  if (!settings) {
    const resetActiveResult = await client
      .from('sites')
      .update({ is_schedule_active: false })
      .eq('organization_id', request.organizationId);

    if (resetActiveResult.error) {
      throw new ContractError('internal_error', resetActiveResult.error.message, 500);
    }
  }

  const upsertResult = await (client.from('sites') as any)
    .upsert(toSiteUpsertPayload(request), { onConflict: 'organization_id,code' })
    .select('id, organization_id, code, name, is_active, is_schedule_active');

  if ((upsertResult as QueryResult<SiteRow[]>).error) {
    throw new ContractError(
      'internal_error',
      (upsertResult as QueryResult<SiteRow[]>).error?.message ?? 'Internal error',
      500
    );
  }

  const savedSites = Array.isArray((upsertResult as QueryResult<SiteRow[]>).data)
    ? ((upsertResult as QueryResult<SiteRow[]>).data ?? [])
    : [];
  const activeSite = savedSites.find((site) => site.is_schedule_active);

  if (!activeSite) {
    throw new ContractError('internal_error', 'Schedule-active site was not saved', 500);
  }

  const settingsPayload = {
    organization_id: request.organizationId,
    pilot_site_id: activeSite.id,
    minimum_rest_hours: settings?.minimum_rest_hours ?? 11,
    checklist_cursor: normalizeChecklistCursor(settings?.checklist_cursor) ?? 'employee_roster',
  };
  const settingsResult = await (client.from('organization_settings') as any)
    .upsert(settingsPayload, { onConflict: 'organization_id' });

  if ((settingsResult as QueryResult<unknown>).error) {
    throw new ContractError(
      'internal_error',
      (settingsResult as QueryResult<unknown>).error?.message ?? 'Internal error',
      500
    );
  }

  return {
    organizationId: request.organizationId,
    pilotSiteId: activeSite.id,
    sites: savedSites.map((site) => toSiteResponse(site)),
  };
}

export async function getShiftsConstraints(
  client: Phase2OpsRepositoryClient,
  auth: Phase2OpsOperatorAuthContext,
  organizationId: string
): Promise<ShiftsConstraintsResponse> {
  assertOrganizationAccess(auth, organizationId);
  const settings = await loadOrganizationSettings(client, organizationId);

  return {
    organizationId,
    minimumRestHours: settings?.minimum_rest_hours ?? 11,
    checklistCursor: normalizeChecklistCursor(settings?.checklist_cursor) ?? '',
  };
}

export async function saveShiftsConstraints(
  client: Phase2OpsRepositoryClient,
  auth: Phase2OpsOperatorAuthContext,
  request: ShiftsConstraintsRequest
): Promise<ShiftsConstraintsResponse> {
  assertOrganizationAccess(auth, request.organizationId);
  const settings = await loadOrganizationSettings(client, request.organizationId);

  if (!settings?.pilot_site_id) {
    throw new ContractError(
      'bad_request',
      'A schedule-active pilot site is required before saving shift constraints',
      400
    );
  }

  const normalizedCursor = normalizeChecklistCursor(request.checklistCursor) ?? 'employee_roster';
  const { error } = await client
    .from('organization_settings')
    .update({
      minimum_rest_hours: request.minimumRestHours,
      checklist_cursor: normalizedCursor,
    })
    .eq('organization_id', request.organizationId);

  if (error) {
    throw new ContractError('internal_error', error.message, 500);
  }

  return {
    organizationId: request.organizationId,
    minimumRestHours: request.minimumRestHours,
    checklistCursor: normalizedCursor,
  };
}

export async function getOffRequestPolicySetup(
  client: Phase2OpsRepositoryClient,
  auth: Phase2OpsOperatorAuthContext,
  organizationId: string
): Promise<OffRequestPolicySetupResponse> {
  assertOrganizationAccess(auth, organizationId);
  return loadOffRequestPolicySetupRows(client, organizationId);
}

export async function saveOffRequestPolicySetup(
  client: Phase2OpsRepositoryClient,
  auth: Phase2OpsOperatorAuthContext,
  request: OffRequestPolicySetupRequest
): Promise<OffRequestPolicySetupResponse> {
  assertOrganizationAccess(auth, request.organizationId);
  const normalizedRequest = normalizeOffRequestPolicySetupRequest(request);
  ensureOffRequestPolicyRuleRankCodesExist(normalizedRequest);
  ensureNoOffRequestPolicyOverlap(normalizedRequest);

  const { error } = await client.rpc('replace_off_request_policy_setup_atomic', {
    p_organization_id: normalizedRequest.organizationId,
    p_rank_codes: toRankCodeInsertPayload(normalizedRequest),
    p_policy_rules: toPolicyRuleInsertPayload(normalizedRequest),
  });

  if (error) {
    throw new ContractError('internal_error', error.message, 500);
  }

  return loadOffRequestPolicySetupRows(client, normalizedRequest.organizationId);
}

const FAIRNESS_WINDOW_MONTHS: FairnessLedgerWindowMonths[] = [3, 6, 12];

function normalizeLedgerMonth(month: string): string | null {
  return /^\d{4}-\d{2}$/.test(month) ? month : null;
}

function shiftLedgerMonth(month: string, offset: number): string | null {
  const normalizedMonth = normalizeLedgerMonth(month);
  if (!normalizedMonth) {
    return null;
  }

  const [yearPart, monthPart] = normalizedMonth.split('-');
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1 + offset;

  if (!Number.isInteger(year) || !Number.isInteger(monthIndex)) {
    return null;
  }

  let nextYear = year;
  let nextMonthIndex = monthIndex;

  while (nextMonthIndex < 0) {
    nextMonthIndex += 12;
    nextYear -= 1;
  }

  while (nextMonthIndex > 11) {
    nextMonthIndex -= 12;
    nextYear += 1;
  }

  return `${nextYear.toString().padStart(4, '0')}-${(nextMonthIndex + 1).toString().padStart(2, '0')}`;
}

function readFairnessLedgerProofSummary(row: FairnessLedgerMonthlyRow): FairnessLedgerProofSummary {
  const proofSummary = asRecord(row.proof_summary);

  return {
    weeklyHoursViolations: readNumberValue(proofSummary, [
      'weeklyHoursViolations',
      'weekly_hours_violations',
    ]),
    nnnViolations: readNumberValue(proofSummary, ['nnnViolations', 'nnn_violations']),
    nodViolations: readNumberValue(proofSummary, ['nodViolations', 'nod_violations']),
    minimumRestViolations: readNumberValue(proofSummary, [
      'minimumRestViolations',
      'minimum_rest_violations',
    ]),
    staffingShortfalls: readNumberValue(proofSummary, [
      'staffingShortfalls',
      'staffing_shortfalls',
    ]),
  };
}

function createEmptyFairnessProofSummary(): FairnessLedgerProofSummary {
  return {
    weeklyHoursViolations: 0,
    nnnViolations: 0,
    nodViolations: 0,
    minimumRestViolations: 0,
    staffingShortfalls: 0,
  };
}

function sumFairnessProofSummaries(rows: FairnessLedgerMonthlyRow[]): FairnessLedgerProofSummary {
  const totals = createEmptyFairnessProofSummary();

  for (const row of rows) {
    const proofSummary = readFairnessLedgerProofSummary(row);
    totals.weeklyHoursViolations += proofSummary.weeklyHoursViolations;
    totals.nnnViolations += proofSummary.nnnViolations;
    totals.nodViolations += proofSummary.nodViolations;
    totals.minimumRestViolations += proofSummary.minimumRestViolations;
    totals.staffingShortfalls += proofSummary.staffingShortfalls;
  }

  return totals;
}

function collectFairnessLedgerWindowRows(
  rows: FairnessLedgerMonthlyRow[],
  anchorMonth: string,
  months: FairnessLedgerWindowMonths
): FairnessLedgerMonthlyRow[] {
  const windowStartMonth = shiftLedgerMonth(anchorMonth, -(months - 1));
  if (!windowStartMonth) {
    return [];
  }

  return rows.filter((row) => row.month >= windowStartMonth && row.month <= anchorMonth);
}

function buildFairnessLedgerWindowSummary(
  rows: FairnessLedgerMonthlyRow[],
  anchorMonth: string,
  months: FairnessLedgerWindowMonths
): FairnessLedgerWindowSummary {
  const windowRows = collectFairnessLedgerWindowRows(rows, anchorMonth, months);
  return {
    months,
    windowStartMonth: shiftLedgerMonth(anchorMonth, -(months - 1)),
    windowEndMonth: anchorMonth,
    finalizedVersionCount: windowRows.length,
    proofSummary: sumFairnessProofSummaries(windowRows),
  };
}

export function buildFairnessLedgerSummary(
  rows: FairnessLedgerMonthlyRow[]
): FairnessLedgerWindowSummary[] {
  const sortedRows = rows
    .filter((row) =>
      typeof row.finalized_at === 'string'
      && row.finalized_at.trim().length > 0
      && row.result_status === 'passed'
    )
    .map((row) => ({
      ...row,
      month: normalizeLedgerMonth(row.month) ?? '',
    }))
    .filter((row) => row.month.length > 0)
    .sort((left, right) => left.month.localeCompare(right.month));

  if (sortedRows.length === 0) {
    return FAIRNESS_WINDOW_MONTHS.map((months) => ({
      months,
      windowStartMonth: null,
      windowEndMonth: null,
      finalizedVersionCount: 0,
      proofSummary: createEmptyFairnessProofSummary(),
    }));
  }

  const anchorMonth = sortedRows.at(-1)?.month ?? null;
  if (!anchorMonth) {
    return FAIRNESS_WINDOW_MONTHS.map((months) => ({
      months,
      windowStartMonth: null,
      windowEndMonth: null,
      finalizedVersionCount: 0,
      proofSummary: createEmptyFairnessProofSummary(),
    }));
  }

  return FAIRNESS_WINDOW_MONTHS.map((months) =>
    buildFairnessLedgerWindowSummary(sortedRows, anchorMonth, months)
  );
}

async function loadFairnessLedgerMonthlyRows(
  client: Phase2OpsRepositoryClient,
  organizationId: string
): Promise<FairnessLedgerMonthlyRow[]> {
  const result = await client
    .from('fairness_ledger_monthly')
    .select(
      'organization_id, month, finalized_at, result_status, proof_summary, comparison_metrics'
    )
    .eq('organization_id', organizationId)
    .eq('result_status', 'passed')
    .order('month', { ascending: true });

  if ((result as QueryResult<FairnessLedgerMonthlyRow[]>).error) {
    throw new ContractError(
      'internal_error',
      (result as QueryResult<FairnessLedgerMonthlyRow[]>).error?.message ?? 'Internal error',
      500
    );
  }

  return Array.isArray((result as QueryResult<FairnessLedgerMonthlyRow[]>).data)
    ? ((result as QueryResult<FairnessLedgerMonthlyRow[]>).data ?? [])
    : [];
}

async function loadChecklistOrganization(
  client: Phase2OpsRepositoryClient,
  organizationId: string
): Promise<OrganizationRow | null> {
  const result = await client
    .from('organizations')
    .select('id, name, type')
    .eq('id', organizationId)
    .limit(1)
    .maybeSingle();

  if (result.error) {
    throw new ContractError('internal_error', result.error.message, 500);
  }

  return (result.data as OrganizationRow | null) ?? null;
}

async function loadChecklistSites(
  client: Phase2OpsRepositoryClient,
  organizationId: string
): Promise<SiteRow[]> {
  const result = await client
    .from('sites')
    .select('id, organization_id, code, name, is_active, is_schedule_active')
    .eq('organization_id', organizationId);

  if ((result as QueryResult<SiteRow[]>).error) {
    throw new ContractError(
      'internal_error',
      (result as QueryResult<SiteRow[]>).error?.message ?? 'Internal error',
      500
    );
  }

  return Array.isArray((result as QueryResult<SiteRow[]>).data)
    ? ((result as QueryResult<SiteRow[]>).data ?? [])
    : [];
}

async function loadOrganizationSettings(
  client: Phase2OpsRepositoryClient,
  organizationId: string
): Promise<OrganizationSettingsRow | null> {
  const result = await client
    .from('organization_settings')
    .select('organization_id, pilot_site_id, minimum_rest_hours, checklist_cursor')
    .eq('organization_id', organizationId)
    .limit(1)
    .maybeSingle();

  if (result.error) {
    throw new ContractError('internal_error', result.error.message, 500);
  }

  return (result.data as OrganizationSettingsRow | null) ?? null;
}

async function loadSiteRequirements(
  client: Phase2OpsRepositoryClient,
  organizationId: string
): Promise<SiteRequirementRow[]> {
  const result = await client
    .from('site_requirements')
    .select('id, organization_id')
    .eq('organization_id', organizationId);

  if ((result as QueryResult<SiteRequirementRow[]>).error) {
    throw new ContractError(
      'internal_error',
      (result as QueryResult<SiteRequirementRow[]>).error?.message ?? 'Internal error',
      500
    );
  }

  return Array.isArray((result as QueryResult<SiteRequirementRow[]>).data)
    ? ((result as QueryResult<SiteRequirementRow[]>).data ?? [])
    : [];
}

async function loadChecklistShifts(
  client: Phase2OpsRepositoryClient,
  organizationId: string
): Promise<ShiftRow[]> {
  const result = await client
    .from('shifts')
    .select('id, code')
    .eq('organization_id', organizationId);

  if ((result as QueryResult<ShiftRow[]>).error) {
    throw new ContractError(
      'internal_error',
      (result as QueryResult<ShiftRow[]>).error?.message ?? 'Internal error',
      500
    );
  }

  return Array.isArray((result as QueryResult<ShiftRow[]>).data)
    ? ((result as QueryResult<ShiftRow[]>).data ?? [])
    : [];
}

async function loadChecklistEmployees(
  client: Phase2OpsRepositoryClient,
  organizationId: string
): Promise<Array<Record<string, unknown>>> {
  const result = await client
    .from('employees')
    .select('id')
    .eq('organization_id', organizationId);

  if ((result as QueryResult<Array<Record<string, unknown>>>).error) {
    throw new ContractError(
      'internal_error',
      (result as QueryResult<Array<Record<string, unknown>>>).error?.message ?? 'Internal error',
      500
    );
  }

  return Array.isArray((result as QueryResult<Array<Record<string, unknown>>>).data)
    ? ((result as QueryResult<Array<Record<string, unknown>>>).data ?? [])
    : [];
}

async function loadChecklistPolicyRules(
  client: Phase2OpsRepositoryClient,
  organizationId: string
): Promise<OffRequestPolicyRuleRow[]> {
  const result = await client
    .from('off_request_policy_rules')
    .select('id, organization_id, rank_code, period_type, limit_count, is_active')
    .eq('organization_id', organizationId);

  if ((result as QueryResult<OffRequestPolicyRuleRow[]>).error) {
    throw new ContractError(
      'internal_error',
      (result as QueryResult<OffRequestPolicyRuleRow[]>).error?.message ?? 'Internal error',
      500
    );
  }

  return Array.isArray((result as QueryResult<OffRequestPolicyRuleRow[]>).data)
    ? ((result as QueryResult<OffRequestPolicyRuleRow[]>).data ?? [])
    : [];
}

async function loadChecklistSchedules(
  client: Phase2OpsRepositoryClient,
  organizationId: string
): Promise<ScheduleRow[]> {
  const result = await client
    .from('schedules')
    .select('id, organization_id, month, finalized_version_id')
    .eq('organization_id', organizationId)
    .order('month', { ascending: false });

  if ((result as QueryResult<ScheduleRow[]>).error) {
    throw new ContractError(
      'internal_error',
      (result as QueryResult<ScheduleRow[]>).error?.message ?? 'Internal error',
      500
    );
  }

  return Array.isArray((result as QueryResult<ScheduleRow[]>).data)
    ? ((result as QueryResult<ScheduleRow[]>).data ?? [])
    : [];
}

async function loadChecklistSnapshot(
  client: Phase2OpsRepositoryClient,
  organizationId: string
): Promise<ChecklistSnapshot> {
  const [
    organization,
    onboardingProgress,
    organizationSettings,
    sites,
    shifts,
    siteRequirements,
    employees,
    policyRules,
    schedules,
    fairnessLedgerRows,
  ] = await Promise.all([
    loadChecklistOrganization(client, organizationId),
    loadOnboardingProgress(client, organizationId),
    loadOrganizationSettings(client, organizationId),
    loadChecklistSites(client, organizationId),
    loadChecklistShifts(client, organizationId),
    loadSiteRequirements(client, organizationId),
    loadChecklistEmployees(client, organizationId),
    loadChecklistPolicyRules(client, organizationId),
    loadChecklistSchedules(client, organizationId),
    loadFairnessLedgerMonthlyRows(client, organizationId),
  ]);

  return {
    organizationId,
    organizationName: organization?.name ?? null,
    organizationType: organization?.type ?? null,
    checklistCursor:
      normalizeChecklistCursor(onboardingProgress?.current_step_key)
      ?? normalizeChecklistCursor(organizationSettings?.checklist_cursor)
      ?? INITIAL_CHECKLIST_CURSOR,
    organizationProfileConfirmedAt: onboardingProgress?.organization_info_confirmed_at ?? null,
    scheduleActiveSiteCount: sites.filter((site) => site.is_active && site.is_schedule_active).length,
    pilotSiteId: organizationSettings?.pilot_site_id ?? null,
    minimumRestHours: organizationSettings?.minimum_rest_hours ?? null,
    shiftCount: shifts.length,
    siteRequirementCount: siteRequirements.length,
    employeeCount: employees.length,
    hasMonthlyDefaultOffRequestPolicy: policyRules.some((rule) =>
      rule.is_active
      && rule.period_type === 'monthly'
      && normalizeOffRequestPolicyRankCode(rule.rank_code) === null
    ),
    hasAnnualDefaultOffRequestPolicy: policyRules.some((rule) =>
      rule.is_active
      && rule.period_type === 'annual'
      && normalizeOffRequestPolicyRankCode(rule.rank_code) === null
    ),
    scheduleReviewRoute:
      typeof schedules[0]?.id === 'string' && schedules[0].id.length > 0
        ? `/schedule/step5/${schedules[0].id}`
        : null,
    fairnessSummary: buildFairnessLedgerSummary(fairnessLedgerRows),
  };
}

async function saveChecklistCursor(
  client: Phase2OpsRepositoryClient,
  auth: Phase2OpsOperatorAuthContext,
  organizationId: string,
  checklistCursor: string | null
): Promise<void> {
  await ensureOnboardingProgress(client, auth, organizationId);

  const { error } = await client
    .from('onboarding_progress')
    .update({
      current_step: mapChecklistCursorToStep(checklistCursor),
      current_step_key: checklistCursor ?? INITIAL_CHECKLIST_CURSOR,
      last_actor_user_id: auth.operatorUserId,
    })
    .eq('organization_id', organizationId);

  if (error) {
    throw new ContractError('internal_error', error.message, 500);
  }
}

export async function getChecklist(
  client: Phase2OpsRepositoryClient,
  auth: Phase2OpsOperatorAuthContext,
  organizationId: string
): Promise<ChecklistResponse> {
  assertOrganizationAccess(auth, organizationId);
  return buildChecklistResponse(await loadChecklistSnapshot(client, organizationId));
}

export async function updateChecklist(
  client: Phase2OpsRepositoryClient,
  auth: Phase2OpsOperatorAuthContext,
  request: ChecklistUpdateRequest
): Promise<ChecklistResponse> {
  assertOrganizationAccess(auth, request.organizationId);
  await saveChecklistCursor(client, auth, request.organizationId, request.checklistCursor);
  return buildChecklistResponse(await loadChecklistSnapshot(client, request.organizationId));
}

export async function bootstrapAdmin(
  client: Phase2OpsRepositoryClient,
  auth: Phase2OpsOperatorAuthContext,
  request: BootstrapAdminRequest,
  emitEvent: Phase2OpsEventEmitter = emitPhase2OpsEvent
): Promise<BootstrapAdminResponse> {
  assertBootstrapOrganizationAccess(auth, request.organizationId);

  const targetUser = await findTargetAuthUserByEmail(client, request.targetEmail);

  await syncProfile(client, targetUser.id, request);
  const onboardingProgress = await ensureOnboardingProgress(client, auth, request.organizationId);
  await alignAuthMetadata(client, targetUser, request.organizationId, onboardingProgress);

  emitEvent('admin_bootstrap_provisioned', {
    organizationId: request.organizationId,
    operatorUserId: auth.operatorUserId,
    targetEmail: request.targetEmail,
    targetUserId: targetUser.id,
  });

  return {
    organizationId: request.organizationId,
    targetEmail: request.targetEmail,
    displayName: request.displayName,
    operatorUserId: auth.operatorUserId,
    onboardingInitializationFlags: request.onboardingInitializationFlags,
  };
}

export async function validateEmployeeImport(
  client: Phase2OpsRepositoryClient,
  auth: Phase2OpsOperatorAuthContext,
  request: EmployeeImportRequest
): Promise<EmployeeImportPreviewResponse> {
  assertOrganizationAccess(auth, request.organizationId);
  const state = await validateEmployeeImportRequest(client, request);
  return toEmployeeImportPreviewResponse(state);
}

export async function applyEmployeeImport(
  client: Phase2OpsRepositoryClient,
  auth: Phase2OpsOperatorAuthContext,
  request: EmployeeImportRequest
): Promise<EmployeeImportApplyResponse> {
  assertOrganizationAccess(auth, request.organizationId);
  const state = await validateEmployeeImportRequest(client, request);

  if (!state.isValid) {
    remapEmployeeImportFailure(state);
  }

  const applied = await callResetRosterBoundary(client, request);
  return toApplyResponse(state, applied);
}
