import { supabase } from './supabase';
import type {
  ChecklistResponse,
  EmployeeImportApplyRequest,
  EmployeeImportApplyResponse,
  EmployeeImportValidateRequest,
  EmployeeImportValidateResponse,
  OffRequestPolicySetupRequest,
  OffRequestPolicySetupResponse,
  OrganizationProfileRequest,
  OrganizationProfileResponse,
  ShiftsConstraintsRequest,
  ShiftsConstraintsResponse,
  SitesRequest,
  SitesResponse,
  SiteRequest,
} from '@/types/ops';

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

async function callPhase2Ops<T>(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT',
  body?: unknown
): Promise<T> {
  const accessToken = await getPhase2OpsAccessToken();
  const headers: Record<string, string> = {
    apikey: getPhase2OpsAnonKey(),
    Authorization: `Bearer ${accessToken}`,
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

function countScheduleActiveSites(sites: SiteRequest[]): number {
  return sites.filter((site) => site.isScheduleActive).length;
}

function assertExactlyOneScheduleActiveSite(sites: SiteRequest[]): void {
  if (countScheduleActiveSites(sites) !== 1) {
    throw new Error('Exactly one schedule-active site is required');
  }
}

export async function getOrganizationProfile(
  organizationId: string
): Promise<OrganizationProfileResponse> {
  return callPhase2Ops<OrganizationProfileResponse>(
    `/organization-profile?organizationId=${encodeURIComponent(organizationId)}`,
    'GET'
  );
}

export async function updateOrganizationProfile(
  request: OrganizationProfileRequest
): Promise<OrganizationProfileResponse> {
  return callPhase2Ops<OrganizationProfileResponse>('/organization-profile', 'PATCH', request);
}

export async function getSites(organizationId: string): Promise<SitesResponse> {
  return callPhase2Ops<SitesResponse>(`/sites?organizationId=${encodeURIComponent(organizationId)}`, 'GET');
}

export async function updateSites(request: SitesRequest): Promise<SitesResponse> {
  assertExactlyOneScheduleActiveSite(request.sites);
  return callPhase2Ops<SitesResponse>('/sites', 'PUT', request);
}

export async function getShiftsConstraints(
  organizationId: string
): Promise<ShiftsConstraintsResponse> {
  return callPhase2Ops<ShiftsConstraintsResponse>(
    `/shifts-constraints?organizationId=${encodeURIComponent(organizationId)}`,
    'GET'
  );
}

export async function updateShiftsConstraints(
  request: ShiftsConstraintsRequest
): Promise<ShiftsConstraintsResponse> {
  return callPhase2Ops<ShiftsConstraintsResponse>('/shifts-constraints', 'PUT', request);
}

export async function validateEmployeeImport(
  request: EmployeeImportValidateRequest
): Promise<EmployeeImportValidateResponse> {
  return callPhase2Ops<EmployeeImportValidateResponse>(
    '/employee-import/validate',
    'POST',
    request
  );
}

export async function applyEmployeeImport(
  request: EmployeeImportApplyRequest
): Promise<EmployeeImportApplyResponse> {
  return callPhase2Ops<EmployeeImportApplyResponse>('/employee-import/apply', 'POST', request);
}

export async function getOffRequestPolicies(
  organizationId: string
): Promise<OffRequestPolicySetupResponse> {
  return callPhase2Ops<OffRequestPolicySetupResponse>(
    `/off-request-policies?organizationId=${encodeURIComponent(organizationId)}`,
    'GET'
  );
}

export async function updateOffRequestPolicies(
  request: OffRequestPolicySetupRequest
): Promise<OffRequestPolicySetupResponse> {
  return callPhase2Ops<OffRequestPolicySetupResponse>('/off-request-policies', 'PUT', request);
}

export async function getChecklist(organizationId: string): Promise<ChecklistResponse> {
  return callPhase2Ops<ChecklistResponse>(
    `/checklist?organizationId=${encodeURIComponent(organizationId)}`,
    'GET'
  );
}
