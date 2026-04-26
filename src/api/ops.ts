import { supabase } from './supabase';
import { buildOrganizationScopeHeaders, getRequiredOrganizationId } from './requestScope';
import type {
  ChecklistResponse,
  EmployeeImportApplyRequest,
  EmployeeImportApplyResponse,
  EmployeeRosterReplaceRequest,
  EmployeeRosterReplaceResponse,
  EmployeeImportValidateRequest,
  EmployeeImportValidateResponse,
  OffRequestPolicySetupRequest,
  OffRequestPolicySetupResponse,
  OrganizationProfileRequest,
  OrganizationProfileResponse,
  ShiftsConstraintsRequest,
  ShiftsConstraintsResponse,
  SiteFoundationRequest,
  SiteFoundationResponse,
  SiteRequest,
} from '@/types/ops';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getPhase2OpsBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!baseUrl) {
    throw new Error('Missing VITE_SUPABASE_URL for phase 2 ops API.');
  }

  return baseUrl.replace(/\/$/, '');
}

function getPhase2OpsAnonKey(): string {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error('Missing VITE_SUPABASE_ANON_KEY for phase 2 ops API.');
  }

  return anonKey;
}

async function getPhase2OpsAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }

  const session = data.session ?? null;
  if (!session?.access_token) {
    throw new Error('Authenticated session is required to call phase2-ops');
  }

  return session.access_token;
}

function buildPhase2OpsUrl(path: string): string {
  return `${getPhase2OpsBaseUrl()}/functions/v1/phase2-ops${path}`;
}

function resolveScopedOrganizationId(organizationId?: string | null): string {
  const activeOrganizationId = getRequiredOrganizationId();
  const requestedOrganizationId = organizationId?.trim() ?? null;

  if (requestedOrganizationId && requestedOrganizationId !== activeOrganizationId) {
    throw new Error('요청 조직과 활성 조직이 일치하지 않습니다.');
  }

  return activeOrganizationId;
}

async function callPhase2Ops<T>(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT',
  body?: unknown,
  organizationId?: string | null
): Promise<T> {
  const accessToken = await getPhase2OpsAccessToken();
  const scopedOrganizationId = resolveScopedOrganizationId(organizationId);
  const headers: Record<string, string> = {
    apikey: getPhase2OpsAnonKey(),
    Authorization: `Bearer ${accessToken}`,
    ...buildOrganizationScopeHeaders(scopedOrganizationId),
  };

  const requestInit: RequestInit = {
    method,
    headers,
    mode: 'cors',
    credentials: 'omit',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    requestInit.body = JSON.stringify(body);
  }

  const response = await fetch(buildPhase2OpsUrl(path), requestInit);
  const responseText = await response.text();
  let payload: unknown = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = responseText;
    }
  }

  if (!response.ok) {
    const message =
      payload !== null && typeof payload === 'object' && typeof (payload as { message?: unknown }).message === 'string'
        ? String((payload as { message?: string }).message)
        : `phase2-ops request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

function assertValidSiteRequest(site: SiteRequest): void {
  if (!site.code.trim()) {
    throw new Error('site.code is required');
  }

  if (!site.name.trim()) {
    throw new Error('site.name is required');
  }
}

function assertValidSiteFoundationResponse(payload: unknown): asserts payload is SiteFoundationResponse {
  if (!isRecord(payload) || typeof payload.organizationId !== 'string') {
    throw new Error('Invalid phase2-ops sites response: organizationId is required');
  }

  if (payload.site === null) {
    return;
  }

  if (!isRecord(payload.site)) {
    throw new Error('Invalid phase2-ops sites response: site must be an object or null');
  }

  const site = payload.site;
  if (
    typeof site.id !== 'string' ||
    typeof site.organizationId !== 'string' ||
    typeof site.code !== 'string' ||
    typeof site.name !== 'string' ||
    typeof site.isActive !== 'boolean' ||
    typeof site.isScheduleActive !== 'boolean'
  ) {
    throw new Error('Invalid phase2-ops sites response: site payload shape is invalid');
  }
}

export async function getOrganizationProfile(
  organizationId: string
): Promise<OrganizationProfileResponse> {
  return callPhase2Ops<OrganizationProfileResponse>(
    `/organization-profile?organizationId=${encodeURIComponent(organizationId)}`,
    'GET',
    undefined,
    organizationId
  );
}

export async function updateOrganizationProfile(
  request: OrganizationProfileRequest
): Promise<OrganizationProfileResponse> {
  return callPhase2Ops<OrganizationProfileResponse>(
    '/organization-profile',
    'PATCH',
    request,
    request.organizationId
  );
}

export async function getSites(organizationId: string): Promise<SiteFoundationResponse> {
  const response = await callPhase2Ops<SiteFoundationResponse>(
    `/sites?organizationId=${encodeURIComponent(organizationId)}`,
    'GET',
    undefined,
    organizationId
  );
  assertValidSiteFoundationResponse(response);
  return response;
}

export async function updateSites(request: SiteFoundationRequest): Promise<SiteFoundationResponse> {
  assertValidSiteRequest(request.site);
  const response = await callPhase2Ops<SiteFoundationResponse>(
    '/sites',
    'PUT',
    request,
    request.organizationId
  );
  assertValidSiteFoundationResponse(response);
  return response;
}

export async function getShiftsConstraints(
  organizationId: string
): Promise<ShiftsConstraintsResponse> {
  return callPhase2Ops<ShiftsConstraintsResponse>(
    `/shifts-constraints?organizationId=${encodeURIComponent(organizationId)}`,
    'GET',
    undefined,
    organizationId
  );
}

export async function updateShiftsConstraints(
  request: ShiftsConstraintsRequest
): Promise<ShiftsConstraintsResponse> {
  return callPhase2Ops<ShiftsConstraintsResponse>(
    '/shifts-constraints',
    'PUT',
    request,
    request.organizationId
  );
}

export async function validateEmployeeImport(
  request: EmployeeImportValidateRequest
): Promise<EmployeeImportValidateResponse> {
  return callPhase2Ops<EmployeeImportValidateResponse>(
    '/employee-import/validate',
    'POST',
    request,
    request.organizationId
  );
}

export async function applyEmployeeImport(
  request: EmployeeImportApplyRequest
): Promise<EmployeeImportApplyResponse> {
  return callPhase2Ops<EmployeeImportApplyResponse>(
    '/employee-import/apply',
    'POST',
    request,
    request.organizationId
  );
}

export async function replaceOrganizationRoster(
  request: EmployeeRosterReplaceRequest
): Promise<EmployeeRosterReplaceResponse> {
  return callPhase2Ops<EmployeeRosterReplaceResponse>(
    '/employee-roster/replace',
    'POST',
    request,
    request.organizationId
  );
}

export async function getOffRequestPolicies(
  organizationId: string
): Promise<OffRequestPolicySetupResponse> {
  return callPhase2Ops<OffRequestPolicySetupResponse>(
    `/off-request-policies?organizationId=${encodeURIComponent(organizationId)}`,
    'GET',
    undefined,
    organizationId
  );
}

export async function updateOffRequestPolicies(
  request: OffRequestPolicySetupRequest
): Promise<OffRequestPolicySetupResponse> {
  return callPhase2Ops<OffRequestPolicySetupResponse>(
    '/off-request-policies',
    'PUT',
    request,
    request.organizationId
  );
}

export async function getChecklist(organizationId: string): Promise<ChecklistResponse> {
  return callPhase2Ops<ChecklistResponse>(
    `/checklist?organizationId=${encodeURIComponent(organizationId)}`,
    'GET',
    undefined,
    organizationId
  );
}
