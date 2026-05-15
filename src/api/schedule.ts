import dayjs from 'dayjs';
import { buildOrganizationScopeHeaders, getRequiredOrganizationId } from './requestScope';
import { supabase } from './supabase';
import type {
  AssignmentMap,
  CreateScheduleVersionRequest,
  CreateScheduleVersionResponse,
  DeleteGeneratedResultsRequest,
  DeleteGeneratedResultsResponse,
  DeleteScheduleVersionRequest,
  DeleteScheduleVersionResponse,
  ConstraintCode,
  ConstraintMap,
  OffReasonMap,
  CommentMap,
  PatchScheduleVersionAssignmentsRequest,
  PatchScheduleVersionAssignmentsResponse,
  PreferenceStatus,
  SchedulePreference,
  SchedulePrimaryAction,
  ScheduleCompareResponse,
  ScheduleVersionAssignmentChange,
  ScheduleReviewTab,
  ScheduleReviewResponse,
  ScheduleVersionSolveRequest,
  ScheduleVersionSolveResponse,
  ScheduleVersionRecheckResponse,
  ScheduleVersionFinalizeResponse,
  ScheduleVersionUnfinalizeResponse,
  ScheduleVersionSolverResultRequest,
  ScheduleVersionSolverResultResponse,
  PlanningOrganization,
  PlanningShift,
  PlanningEmployee,
  PlanningAssignment,
  PreviousMonthFinalizedContext,
  DeleteScheduleMonthRequest,
  DeleteScheduleMonthResponse,
  ResetScheduleRosterRequest,
  ResetScheduleRosterResponse,
  ResetScheduleActiveFlowResponse,
} from '@/types/schedule';

interface ShiftReference {
  code: string;
}

interface AssignmentRow {
  employee_id: string;
  date: string;
  shifts: ShiftReference | null;
  off_reason: string | null;
  comment: string | null;
}

// Supabase 조회 결과 타입 (shifts가 배열로 반환될 수 있음)
interface AssignmentQueryResult {
  employee_id: string;
  date: string;
  shifts: ShiftReference | ShiftReference[] | null;
  off_reason: string | null;
  comment: string | null;
}

interface AssignmentWithShiftId {
  schedule_id?: string;
  schedule_version_id?: string;
  employee_id: string;
  shift_id: string;
  date: string;
  shifts: ShiftReference | ShiftReference[] | null;
}

interface RawSchedulePreference {
  id: string;
  schedule_id: string;
  employee_id: string;
  date: string;
  request_code: string;
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

type PreferenceScopeColumn = 'schedule_id' | 'schedule_version_id';
type AssignmentScopeColumn = 'schedule_id' | 'schedule_version_id';

interface RawScopedSchedulePreference extends RawSchedulePreference {
  schedule_version_id?: string;
}

export interface ScheduleSummary {
  id: string;
  public_id: string | null;
  organization_id: string;
  month: string;
  status: 'created' | 'running' | 'complete' | 'changed' | 'error';
  hard_score: number | null;
  soft_score: number | null;
  solver_execution_id: string | null;
  created_at: string;
  updated_at: string;
}

function normalizePreferenceCode(requestCode: string): ConstraintCode | null {
  if (requestCode === 'O') return 'O';
  if (requestCode === 'H' || requestCode === 'E' || requestCode === 'L') return 'O';
  return null;
}

function normalizeAssignedShiftCode(shiftCode: string | null | undefined): string {
  return shiftCode?.trim().toUpperCase() ?? '';
}

function resolveOffPreferenceStatus(
  pref: SchedulePreference,
  assignment: { shiftId: string; shiftCode: string | null } | undefined
): PreferenceStatus {
  if (pref.policy_check_status === 'rejected') {
    return 'unfulfilled';
  }

  if (!assignment) {
    return 'fulfilled';
  }

  const shiftCode = normalizeAssignedShiftCode(assignment.shiftCode);
  return shiftCode === '' || shiftCode === 'O' ? 'fulfilled' : 'unfulfilled';
}

function getPhase2ScheduleBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!baseUrl) {
    throw new Error('Missing VITE_SUPABASE_URL for phase 2 schedule API.');
  }

  return baseUrl.replace(/\/$/, '');
}

function getPhase2ScheduleAnonKey(): string {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error('Missing VITE_SUPABASE_ANON_KEY for phase 2 schedule API.');
  }

  return anonKey;
}

function createMissingOrganizationClaimError(): Error {
  const message = '로그인 세션에 조직 정보가 없습니다. 다시 로그인한 뒤 다시 시도해주세요.';
  const error = new Error(message);
  (error as Error & { code?: string; status?: number }).code = 'organization_context_missing';
  (error as Error & { code?: string; status?: number }).status = 403;
  return error;
}

async function getPhase2ScheduleAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }

  const session = data.session ?? null;
  if (!session?.access_token) {
    throw new Error('Authenticated session is required to call phase2-schedule');
  }

  return session.access_token;
}

async function refreshPhase2ScheduleAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    throw error;
  }

  const refreshedSession = data.session ?? null;
  if (!refreshedSession?.access_token) {
    throw new Error('Authenticated session is required to call phase2-schedule');
  }

  return refreshedSession.access_token;
}

function buildPhase2ScheduleUrl(path: string): string {
  return `${getPhase2ScheduleBaseUrl()}/functions/v1/phase2-schedule${path}`;
}

function resolveScopedOrganizationId(organizationId?: string | null): string {
  const activeOrganizationId = getRequiredOrganizationId();
  const requestedOrganizationId = organizationId?.trim() ?? null;

  if (requestedOrganizationId && requestedOrganizationId !== activeOrganizationId) {
    throw new Error('요청 조직과 활성 조직이 일치하지 않습니다.');
  }

  return activeOrganizationId;
}

function createPhase2ScheduleError(payload: unknown, status: number): Error {
  const fallbackMessage = `Phase 2 schedule request failed with status ${status}`;

  if (typeof payload === 'string' && payload.trim().length > 0) {
    const error = new Error(payload);
    (error as Error & { status?: number }).status = status;
    return error;
  }

  if (payload !== null && typeof payload === 'object') {
    const record = payload as { code?: unknown; message?: unknown };
    const message =
      record.code === 'organization_context_missing'
        ? createMissingOrganizationClaimError().message
        : typeof record.message === 'string' && record.message.trim().length > 0
          ? record.message
          : fallbackMessage;
    const error = new Error(message);
    (error as Error & { status?: number }).status = status;

    if (typeof record.code === 'string' && record.code.length > 0) {
      (error as Error & { code?: string }).code = record.code;
    }

    return error;
  }

  return new Error(fallbackMessage);
}

async function callPhase2Schedule<T>(
  path: string,
  options: {
    method: 'GET' | 'POST' | 'PATCH';
    body?: unknown;
    organizationId?: string | null;
  }
): Promise<T> {
  const url = buildPhase2ScheduleUrl(path);
  const scopedOrganizationId = resolveScopedOrganizationId(options.organizationId);
  const executeRequest = async (
    accessToken: string
  ): Promise<{ response: Response; payload: unknown }> => {
    const headers: Record<string, string> = {
      apikey: getPhase2ScheduleAnonKey(),
      Authorization: `Bearer ${accessToken}`,
      ...buildOrganizationScopeHeaders(scopedOrganizationId),
    };

    const requestInit: RequestInit = {
      method: options.method,
      headers,
      mode: 'cors',
      credentials: 'omit',
    };

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      requestInit.body = JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await fetch(url, requestInit);
    } catch (error) {
      const reason =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : String(error);
      throw new Error(
        `phase2-schedule 호출 실패 (네트워크/CORS 또는 배포 wiring 확인 필요): ${reason}`
      );
    }

    const responseText = await response.text();
    let payload: unknown = null;
    if (responseText) {
      try {
        payload = JSON.parse(responseText);
      } catch {
        payload = responseText;
      }
    }

    return { response, payload };
  };

  const shouldRetryWithRefreshedSession = (status: number, payload: unknown): boolean => {
    if (status === 401) {
      return true;
    }

    if (status !== 403 || payload === null || typeof payload !== 'object') {
      return false;
    }

    const record = payload as { code?: unknown };
    return record.code === 'organization_context_missing';
  };

  const accessToken = await getPhase2ScheduleAccessToken();
  let { response, payload } = await executeRequest(accessToken);

  if (!response.ok && shouldRetryWithRefreshedSession(response.status, payload)) {
    const refreshedAccessToken = await refreshPhase2ScheduleAccessToken();
    ({ response, payload } = await executeRequest(refreshedAccessToken));
  }

  if (!response.ok) {
    throw createPhase2ScheduleError(payload, response.status);
  }

  return payload as T;
}

export interface Phase2ScheduleEnsureRequest {
  organizationId: string;
  month: string;
}

export interface Phase2ScheduleSelectResponse {
  scheduleId: string;
  selectedVersionId: string;
}

function createEmptyPrimaryAction(): SchedulePrimaryAction {
  return {
    kind: 'none',
    targetVersionId: null,
    label: 'No primary action',
    disabledReason: null,
  };
}

function normalizeReviewResponse(payload: ScheduleReviewResponse): ScheduleReviewResponse {
  return {
    ...payload,
    primaryAction: payload.primaryAction ?? createEmptyPrimaryAction(),
    defaultTab: (payload.defaultTab ?? 'grid') as ScheduleReviewTab,
  };
}

export async function ensurePhase2Schedule(
  request: Phase2ScheduleEnsureRequest
): Promise<ScheduleCompareResponse> {
  return callPhase2Schedule<ScheduleCompareResponse>('/schedules/ensure', {
    method: 'POST',
    body: request,
    organizationId: request.organizationId,
  });
}

export async function getPhase2ScheduleCompare(scheduleKey: string): Promise<ScheduleCompareResponse> {
  return callPhase2Schedule<ScheduleCompareResponse>(`/schedules/${scheduleKey}/compare`, {
    method: 'GET',
  });
}

export async function getPhase2ScheduleReview(versionId: string): Promise<ScheduleReviewResponse> {
  const response = await callPhase2Schedule<ScheduleReviewResponse>(
    `/schedule-versions/${versionId}/review`,
    {
      method: 'GET',
    }
  );

  return normalizeReviewResponse(response);
}

export async function selectPhase2ScheduleVersion(
  versionId: string
): Promise<Phase2ScheduleSelectResponse> {
  return callPhase2Schedule<Phase2ScheduleSelectResponse>(
    `/schedule-versions/${versionId}/select`,
    {
      method: 'POST',
    }
  );
}

export async function createPhase2ScheduleVersion(
  scheduleId: string,
  request: CreateScheduleVersionRequest
): Promise<CreateScheduleVersionResponse> {
  const body: CreateScheduleVersionRequest = {
    ...request,
    name: request.name.trim(),
  };

  return callPhase2Schedule<CreateScheduleVersionResponse>(
    `/schedules/${scheduleId}/versions`,
    {
      method: 'POST',
      body,
    }
  );
}

export async function deletePhase2ScheduleVersion(
  versionId: string,
  request: DeleteScheduleVersionRequest = {}
): Promise<DeleteScheduleVersionResponse> {
  return callPhase2Schedule<DeleteScheduleVersionResponse>(
    `/schedule-versions/${versionId}/delete`,
    {
      method: 'POST',
      body: request,
    }
  );
}

export async function solvePhase2ScheduleVersion(
  versionId: string,
  request: ScheduleVersionSolveRequest
): Promise<ScheduleVersionSolveResponse> {
  return callPhase2Schedule<ScheduleVersionSolveResponse>(
    `/schedule-versions/${versionId}/solve`,
    {
      method: 'POST',
      body: request,
    }
  );
}

export async function submitPhase2ScheduleVersionSolverResult(
  versionId: string,
  request: ScheduleVersionSolverResultRequest
): Promise<ScheduleVersionSolverResultResponse> {
  return callPhase2Schedule<ScheduleVersionSolverResultResponse>(
    `/schedule-versions/${versionId}/solver-result`,
    {
      method: 'POST',
      body: request,
    }
  );
}

export async function patchPhase2ScheduleVersionAssignments(
  versionId: string,
  request: PatchScheduleVersionAssignmentsRequest
): Promise<PatchScheduleVersionAssignmentsResponse> {
  return callPhase2Schedule<PatchScheduleVersionAssignmentsResponse>(
    `/schedule-versions/${versionId}/assignments`,
    {
      method: 'PATCH',
      body: request,
    }
  );
}

export async function recheckPhase2ScheduleVersion(
  versionId: string
): Promise<ScheduleVersionRecheckResponse> {
  return callPhase2Schedule<ScheduleVersionRecheckResponse>(
    `/schedule-versions/${versionId}/recheck`,
    {
      method: 'POST',
    }
  );
}

export async function finalizePhase2ScheduleVersion(
  versionId: string
): Promise<ScheduleVersionFinalizeResponse> {
  return callPhase2Schedule<ScheduleVersionFinalizeResponse>(
    `/schedule-versions/${versionId}/finalize`,
    {
      method: 'POST',
    }
  );
}

export async function unfinalizePhase2ScheduleVersion(
  versionId: string
): Promise<ScheduleVersionUnfinalizeResponse> {
  return callPhase2Schedule<ScheduleVersionUnfinalizeResponse>(
    `/schedule-versions/${versionId}/unfinalize`,
    {
      method: 'POST',
    }
  );
}

export async function deletePhase2ScheduleGeneratedResults(
  scheduleId: string,
  request: DeleteGeneratedResultsRequest
): Promise<DeleteGeneratedResultsResponse> {
  return callPhase2Schedule<DeleteGeneratedResultsResponse>(
    `/schedules/${scheduleId}/delete-generated-results`,
    {
      method: 'POST',
      body: request,
    }
  );
}

export async function resetPhase2ScheduleRoster(
  request: ResetScheduleRosterRequest
): Promise<ResetScheduleRosterResponse> {
  return callPhase2Schedule<ResetScheduleRosterResponse>('/schedules/reset-roster', {
    method: 'POST',
    body: request,
    organizationId: request.organizationId,
  });
}

export async function deletePhase2ScheduleMonth(
  request: DeleteScheduleMonthRequest
): Promise<DeleteScheduleMonthResponse> {
  return callPhase2Schedule<DeleteScheduleMonthResponse>('/schedules/delete-month', {
    method: 'POST',
    body: request,
    organizationId: request.organizationId,
  });
}

export async function resetPhase2ScheduleActiveFlow(
  scheduleId: string
): Promise<ResetScheduleActiveFlowResponse> {
  return callPhase2Schedule<ResetScheduleActiveFlowResponse>(
    `/schedules/${scheduleId}/reset-active-flow`,
    {
      method: 'POST',
    }
  );
}

export async function patchScheduleVersionAssignmentsAtomic(
  scheduleVersionId: string,
  changes: ScheduleVersionAssignmentChange[]
): Promise<PatchScheduleVersionAssignmentsResponse> {
  return patchPhase2ScheduleVersionAssignments(scheduleVersionId, { changes });
}

// 근무표 생성 (기존 schedule 확인 후 재사용 또는 생성)
export async function createSchedule(orgId: string, month: string) {
  // 1. 기존 schedule 확인
  const { data: existing } = await supabase
    .from('schedules')
    .select('*')
    .eq('organization_id', orgId)
    .eq('month', month)
    .maybeSingle();

  // 2. 기존 schedule이 있으면 재사용 (status 리셋)
  if (existing) {
    const { data, error } = await supabase
      .from('schedules')
      .update({
        status: 'created',
        hard_score: null,
        soft_score: null,
        solver_execution_id: null,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // 3. 없으면 새로 생성
  const { data, error } = await supabase
    .from('schedules')
    .insert({
      organization_id: orgId,
      month,
      status: 'created',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 근무표 상태 조회
export async function getScheduleStatus(scheduleId: string) {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('id', scheduleId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// 조직 + 월 기준 최신 schedule 조회
export async function getLatestScheduleByOrganizationMonth(
  orgId: string,
  month: string
): Promise<ScheduleSummary | null> {
  const { data, error } = await supabase
    .from('schedules')
    .select('id, public_id, organization_id, month, status, hard_score, soft_score, solver_execution_id, created_at, updated_at')
    .eq('organization_id', orgId)
    .eq('month', month)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as ScheduleSummary | null;
}

// Step4 근무 불가 요청 조회
async function loadSchedulePreferences(
  scopeColumn: PreferenceScopeColumn,
  scopeId: string
): Promise<{
  constraints: ConstraintMap;
  notes: CommentMap;
  preferences: SchedulePreference[];
}> {
  const rawPreferences: RawScopedSchedulePreference[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
  const { data, error } = await supabase
    .from('schedule_preferences')
    .select(
      'id, schedule_id, schedule_version_id, employee_id, date, request_code, request_note, is_soft, resolution_status, resolved_shift_id, resolved_at, policy_check_status, policy_rejection_reason, created_at, updated_at'
    )
      .eq(scopeColumn, scopeId)
      .order('date', { ascending: true })
      .order('employee_id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`요청 데이터 조회 실패: ${error.message}`);

    if (data && data.length > 0) {
      rawPreferences.push(...(data as RawSchedulePreference[]));
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  const preferences: SchedulePreference[] = rawPreferences
    .map((pref): SchedulePreference | null => {
      const normalizedCode = normalizePreferenceCode(pref.request_code);
      if (!normalizedCode) return null;
      return {
        ...pref,
        request_code: normalizedCode,
      };
    })
    .filter((pref): pref is SchedulePreference => pref !== null);

  const constraints: ConstraintMap = {};
  const notes: CommentMap = {};

  preferences.forEach((pref) => {
    if (!constraints[pref.employee_id]) {
      constraints[pref.employee_id] = {};
      notes[pref.employee_id] = {};
    }
    constraints[pref.employee_id]![pref.date] = pref.request_code;
    if (pref.request_note) {
      notes[pref.employee_id]![pref.date] = pref.request_note;
    }
  });

  return { constraints, notes, preferences };
}

export async function getSchedulePreferences(scheduleId: string): Promise<{
  constraints: ConstraintMap;
  notes: CommentMap;
  preferences: SchedulePreference[];
}> {
  return loadSchedulePreferences('schedule_id', scheduleId);
}

export async function getScheduleVersionPreferences(
  scheduleVersionId: string
): Promise<{
  constraints: ConstraintMap;
  notes: CommentMap;
  preferences: SchedulePreference[];
}> {
  return loadSchedulePreferences('schedule_version_id', scheduleVersionId);
}

// Step4 근무 불가 요청 저장 (전체 교체)
async function saveSchedulePreferencesByScope(
  scopeColumn: PreferenceScopeColumn,
  scopeId: string,
  constraints: ConstraintMap,
  notes?: CommentMap,
  scheduleId?: string
): Promise<void> {
  const rows: Array<{
    schedule_id?: string;
    schedule_version_id?: string;
    employee_id: string;
    date: string;
    request_code: ConstraintCode;
    request_note?: string;
    is_soft: boolean;
    resolution_status: PreferenceStatus;
    resolved_shift_id: null;
    resolved_at: null;
    policy_check_status: string | null;
    policy_rejection_reason: string | null;
  }> = [];

  Object.entries(constraints).forEach(([employeeId, dateMap]) => {
    Object.entries(dateMap).forEach(([date, requestCode]) => {
      if (requestCode !== 'O') {
        return;
      }

      const requestNote = notes?.[employeeId]?.[date];
      rows.push({
        ...(scheduleId ? { schedule_id: scheduleId } : {}),
        [scopeColumn]: scopeId,
        employee_id: employeeId,
        date,
        request_code: requestCode,
        request_note: requestNote || undefined,
        is_soft: true,
        resolution_status: 'pending',
        resolved_shift_id: null,
        resolved_at: null,
        policy_check_status: 'pending',
        policy_rejection_reason: null,
      });
    });
  });

  const { error: deleteError } = await supabase
    .from('schedule_preferences')
    .delete()
    .eq(scopeColumn, scopeId);

  if (deleteError) {
    throw new Error(`기존 요청 삭제 실패: ${deleteError.message}`);
  }

  if (rows.length === 0) return;

  const { error: insertError } = await supabase.from('schedule_preferences').insert(rows);
  if (insertError) {
    throw new Error(`요청 저장 실패: ${insertError.message}`);
  }
}

export async function saveSchedulePreferences(
  scheduleId: string,
  constraints: ConstraintMap,
  notes?: CommentMap
): Promise<void> {
  return saveSchedulePreferencesByScope('schedule_id', scheduleId, constraints, notes, scheduleId);
}

export async function saveScheduleVersionPreferences(
  scheduleId: string,
  scheduleVersionId: string,
  constraints: ConstraintMap,
  notes?: CommentMap
): Promise<void> {
  return saveSchedulePreferencesByScope(
    'schedule_version_id',
    scheduleVersionId,
    constraints,
    notes,
    scheduleId
  );
}

// 요청 반영 상태 초기화
export async function resetPreferenceResolution(scheduleId: string): Promise<void> {
  return resetPreferenceResolutionByScope('schedule_id', scheduleId);
}

export async function resetPreferenceResolutionByVersion(scheduleVersionId: string): Promise<void> {
  return resetPreferenceResolutionByScope('schedule_version_id', scheduleVersionId);
}

async function resetPreferenceResolutionByScope(
  scopeColumn: PreferenceScopeColumn,
  scopeId: string
): Promise<void> {
  const { error } = await supabase
    .from('schedule_preferences')
    .update({
      resolution_status: 'pending',
      resolved_shift_id: null,
      resolved_at: null,
    })
    .eq(scopeColumn, scopeId);

  if (error) {
    throw new Error(`요청 상태 초기화 실패: ${error.message}`);
  }
}

// schedule_assignments 결과 기준으로 요청 반영 상태 갱신
export async function refreshPreferenceResolution(scheduleId: string): Promise<SchedulePreference[]> {
  return refreshPreferenceResolutionByScope('schedule_id', scheduleId);
}

export async function refreshPreferenceResolutionByVersion(
  scheduleVersionId: string
): Promise<SchedulePreference[]> {
  return refreshPreferenceResolutionByScope('schedule_version_id', scheduleVersionId);
}

async function refreshPreferenceResolutionByScope(
  scopeColumn: PreferenceScopeColumn,
  scopeId: string
): Promise<SchedulePreference[]> {
  const { preferences } = scopeColumn === 'schedule_version_id'
    ? await getScheduleVersionPreferences(scopeId)
    : await getSchedulePreferences(scopeId);
  if (preferences.length === 0) return [];

  const assignmentRows: AssignmentWithShiftId[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('schedule_assignments')
      .select('schedule_id, schedule_version_id, employee_id, shift_id, date, shifts(code)')
      .eq(scopeColumn, scopeId)
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`배정 조회 실패: ${error.message}`);
    }

    if (data && data.length > 0) {
      const normalized = (data as AssignmentWithShiftId[]).map((row) => ({
        ...row,
        shifts: Array.isArray(row.shifts) ? row.shifts[0] || null : row.shifts,
      }));
      assignmentRows.push(...normalized);
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  const assignmentMap = new Map<string, { shiftId: string; shiftCode: string | null }>();
  assignmentRows.forEach((row) => {
    const shiftRef = Array.isArray(row.shifts) ? row.shifts[0] || null : row.shifts;
    assignmentMap.set(`${row.employee_id}_${row.date}`, {
      shiftId: row.shift_id,
      shiftCode: shiftRef?.code ?? null,
    });
  });

  const resolvedAt = new Date().toISOString();
  const updates = preferences.map((pref) => {
    const match = assignmentMap.get(`${pref.employee_id}_${pref.date}`);
    const resolutionStatus = resolveOffPreferenceStatus(pref, match);
    return {
      id: pref.id,
      schedule_id: pref.schedule_id,
      ...(pref.schedule_version_id ? { schedule_version_id: pref.schedule_version_id } : {}),
      employee_id: pref.employee_id,
      date: pref.date,
      request_code: pref.request_code,
      request_note: pref.request_note,
      is_soft: pref.is_soft,
      resolution_status: resolutionStatus,
      resolved_shift_id: match?.shiftId ?? null,
      resolved_at: resolvedAt,
      policy_check_status: pref.policy_check_status,
      policy_rejection_reason: pref.policy_rejection_reason,
    };
  });

  const { data, error } = await supabase
    .from('schedule_preferences')
    .upsert(updates, { onConflict: 'id' })
    .select(
      'id, schedule_id, schedule_version_id, employee_id, date, request_code, request_note, is_soft, resolution_status, resolved_shift_id, resolved_at, policy_check_status, policy_rejection_reason, created_at, updated_at'
    );

  if (error) {
    throw new Error(`요청 반영 상태 갱신 실패: ${error.message}`);
  }

  return (data || []) as SchedulePreference[];
}

// 근무표 배정 조회 (assignments와 offReasons, comments 함께 반환)
export async function getScheduleAssignments(scheduleId: string): Promise<{
  assignments: AssignmentMap;
  offReasons: OffReasonMap;
  comments: CommentMap;
}> {
  return getScheduleAssignmentsByScope('schedule_id', scheduleId);
}

export async function getScheduleVersionAssignments(scheduleVersionId: string): Promise<{
  assignments: AssignmentMap;
  offReasons: OffReasonMap;
  comments: CommentMap;
}> {
  return getScheduleAssignmentsByScope('schedule_version_id', scheduleVersionId);
}

export async function getPreviousMonthFinalizedContext(
  organizationId: string,
  month: string,
): Promise<PreviousMonthFinalizedContext | null> {
  const previousMonth = dayjs(`${month}-01`).subtract(1, 'month').format('YYYY-MM');

  const { data, error } = await supabase
    .from('schedules')
    .select('id, finalized_version_id')
    .eq('organization_id', organizationId)
    .eq('month', previousMonth)
    .maybeSingle();

  if (error) throw new Error(`전월 확정 스케줄 조회 실패: ${error.message}`);
  if (!data?.id || !data.finalized_version_id) return null;

  const [displayData, planningAssignments] = await Promise.all([
    getScheduleVersionAssignments(data.finalized_version_id),
    getPlanningAssignmentsForVersion(data.finalized_version_id),
  ]);

  return {
    scheduleId: data.id,
    scheduleVersionId: data.finalized_version_id,
    displayAssignments: displayData.assignments,
    planningAssignments,
  };
}

async function getScheduleAssignmentsByScope(scopeColumn: AssignmentScopeColumn, scopeId: string): Promise<{
  assignments: AssignmentMap;
  offReasons: OffReasonMap;
  comments: CommentMap;
}> {
  // Supabase 기본 limit은 1000개이므로, 여러 번 조회하여 모든 데이터 가져오기
  // 30명 × 36일 = 1080개 필요

  const allData: AssignmentRow[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  // 1000개씩 페이지네이션하여 모든 데이터 조회
  while (hasMore) {
    const { data, error } = await supabase
      .from('schedule_assignments')
      .select('employee_id, date, shifts(code), off_reason, comment')
      .eq(scopeColumn, scopeId)
      .range(from, from + pageSize - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      // Supabase 조회 결과를 AssignmentRow로 변환
      const queryResults = data as unknown as AssignmentQueryResult[];
      const normalizedRows: AssignmentRow[] = queryResults.map((row) => ({
        employee_id: row.employee_id,
        date: row.date,
        shifts: Array.isArray(row.shifts) ? row.shifts[0] || null : row.shifts,
        off_reason: row.off_reason || null,
        comment: row.comment || null,
      }));
      allData.push(...normalizedRows);
      from += pageSize;
      hasMore = data.length === pageSize; // 정확히 pageSize만큼 받았으면 더 있을 가능성
    } else {
      hasMore = false;
    }
  }

  // 디버깅: 조회된 데이터 확인
  console.log('[getScheduleAssignments] Total rows:', allData.length);
  console.log('[getScheduleAssignments] Unique employees:', new Set(allData.map((r) => r.employee_id)).size);

  // AssignmentMap과 OffReasonMap, CommentMap 형식으로 변환
  const assignments: AssignmentMap = {};
  const offReasons: OffReasonMap = {};
  const comments: CommentMap = {};

  allData.forEach((row) => {
    if (!assignments[row.employee_id]) {
      assignments[row.employee_id] = {};
      offReasons[row.employee_id] = {};
      comments[row.employee_id] = {};
    }
    assignments[row.employee_id]![row.date] = row.shifts?.code ?? '';

    // off_reason이 있으면 offReasons에 저장
    if (row.off_reason) {
      offReasons[row.employee_id]![row.date] = row.off_reason;
    }

    // comment가 있으면 comments에 저장
    if (row.comment) {
      comments[row.employee_id]![row.date] = row.comment;
    }
  });

  console.log('[getScheduleAssignments] Assignment keys count:', Object.keys(assignments).length);
  console.log('[getScheduleAssignments] OffReason keys count:', Object.keys(offReasons).length);
  console.log('[getScheduleAssignments] Comment keys count:', Object.keys(comments).length);

  return { assignments, offReasons, comments };
}

// 배정 수정
export async function updateAssignment(
  scheduleId: string,
  employeeId: string,
  date: string,
  shiftId: string,
  comment?: string
) {
  const updateData: any = {
    schedule_id: scheduleId,
    employee_id: employeeId,
    shift_id: shiftId,
    date,
  };

  if (comment !== undefined) {
    updateData.comment = comment;
  }

  // Upsert
  const { error } = await supabase
    .from('schedule_assignments')
    .upsert(updateData, {
      onConflict: 'schedule_id,employee_id,date',
    });

  if (error) throw error;

  // 근무표 상태를 'changed'로 변경
  await supabase.from('schedules').update({ status: 'changed' }).eq('id', scheduleId);
}

export async function updateScheduleVersionAssignment(
  scheduleId: string,
  scheduleVersionId: string,
  employeeId: string,
  date: string,
  shiftId: string,
  comment?: string
) {
  const updateData: any = {
    schedule_id: scheduleId,
    schedule_version_id: scheduleVersionId,
    employee_id: employeeId,
    shift_id: shiftId,
    date,
  };

  if (comment !== undefined) {
    updateData.comment = comment;
  }

  const { error } = await supabase
    .from('schedule_assignments')
    .upsert(updateData, {
      onConflict: 'schedule_version_id,employee_id,date',
    });

  if (error) throw error;

  await supabase.from('schedules').update({ status: 'changed' }).eq('id', scheduleId);
}

// 근무표 완료 처리
export async function completeSchedule(scheduleId: string) {
  const { error } = await supabase.from('schedules').update({ status: 'complete' }).eq('id', scheduleId);

  if (error) throw error;
}

// 이번달 근무표만 삭제 (지난달 데이터 보존)
export async function deleteThisMonthAssignments(scheduleId: string, month: string) {
  return deleteThisMonthAssignmentsByScope('schedule_id', scheduleId, scheduleId, month);
}

export async function deleteThisMonthVersionAssignments(
  scheduleId: string,
  scheduleVersionId: string,
  month: string
) {
  return deleteThisMonthAssignmentsByScope(
    'schedule_version_id',
    scheduleVersionId,
    scheduleId,
    month
  );
}

async function deleteThisMonthAssignmentsByScope(
  scopeColumn: AssignmentScopeColumn,
  scopeId: string,
  scheduleId: string,
  month: string
) {
  // Calculate date range for current month
  const [year, monthPart] = month.split('-');
  const startDate = `${month}-01`;
  
  // Get last day of month: new Date(year, month, 0) returns last day of previous month
  // Since monthPart is 1-based, this gives us the correct last day
  const lastDay = new Date(Number(year), Number(monthPart), 0).getDate();
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;
  
  console.log(`[deleteThisMonthAssignments] Deleting assignments from ${startDate} to ${endDate}`);
  
  // Delete only current month's assignments
  const { error: deleteError } = await supabase
    .from('schedule_assignments')
    .delete()
    .eq(scopeColumn, scopeId)
    .gte('date', startDate)
    .lte('date', endDate);
    
  if (deleteError) throw deleteError;
  
  // Reset schedule status
  const { error: updateError } = await supabase
    .from('schedules')
    .update({
      status: 'created',
      hard_score: null,
      soft_score: null,
      solver_execution_id: null,
    })
    .eq('id', scheduleId);
    
  if (updateError) throw updateError;
}

// 조직의 근무표 목록 조회
export async function getScheduleList(orgId: string) {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('organization_id', orgId)
    .order('month', { ascending: false });

  if (error) throw error;
  return data;
}

// Planning Payload 데이터 조회 함수들

// 조직 정보 조회
export async function getPlanningOrganization(organizationId: string): Promise<Pick<PlanningOrganization, 'id' | 'name' | 'type'>> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, type')
    .eq('id', organizationId)
    .single();

  if (error) throw new Error(`조직 정보 조회 실패: ${error.message}`);
  if (!data) throw new Error('조직 정보를 찾을 수 없습니다');

  return {
    id: data.id,
    name: data.name,
    type: data.type,
  };
}

// 시프트 정보 조회
export async function getPlanningShifts(organizationId: string): Promise<PlanningShift[]> {
  const { data, error } = await supabase
    .from('shifts')
    .select('id, code, name, start_time, end_time')
    .eq('organization_id', organizationId)
    .order('code');

  if (error) throw new Error(`시프트 정보 조회 실패: ${error.message}`);
  if (!data) return [];

  return data.map(shift => ({
    id: shift.id,
    code: shift.code,
    name: shift.name,
    start_time: shift.start_time ?? '00:00:00',
    end_time: shift.end_time ?? '00:00:00',
  }));
}

// 직원 정보 조회
export async function getPlanningEmployees(organizationId: string): Promise<PlanningEmployee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, available_shifts')
    .eq('organization_id', organizationId)
    .order('name');

  if (error) throw new Error(`직원 정보 조회 실패: ${error.message}`);
  if (!data) return [];

  return data.map(emp => ({
    employee_id: emp.id,
    name: emp.name,
    available_shifts: emp.available_shifts || ['D', 'E', 'N', 'O'],
  }));
}

// 스케줄 배정 정보 조회 (Planning용)
export async function getPlanningAssignments(scheduleId: string): Promise<PlanningAssignment[]> {
  return getPlanningAssignmentsByScope('schedule_id', scheduleId);
}

export async function getPlanningAssignmentsForVersion(
  scheduleVersionId: string
): Promise<PlanningAssignment[]> {
  return getPlanningAssignmentsByScope('schedule_version_id', scheduleVersionId);
}

async function getPlanningAssignmentsByScope(
  scopeColumn: AssignmentScopeColumn,
  scopeId: string
): Promise<PlanningAssignment[]> {
  const allData: PlanningAssignment[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  // 페이지네이션하여 모든 데이터 조회
  while (hasMore) {
    const { data, error } = await supabase
      .from('schedule_assignments')
      .select('employee_id, shift_id, date, is_locked')
      .eq(scopeColumn, scopeId)
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`배정 정보 조회 실패: ${error.message}`);

    if (data && data.length > 0) {
      allData.push(...data.map(row => ({
        employee_id: row.employee_id,
        shift_id: row.shift_id,
        date: row.date,
        is_locked: row.is_locked ?? false,
      })));
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return allData;
}
