import { createClient } from 'npm:@supabase/supabase-js@2';
import { resolveOperatorAuthContext, resolvePhase2OpsAuthContext } from './auth.ts';
import {
  allowedMethods,
  ContractError,
  matchRoute,
  normalizePathSegments,
  parseEmployeeImportApplyRequest,
  parseEmployeeImportApplyResponse,
  parseEmployeeImportValidateRequest,
  parseEmployeeImportValidateResponse,
  parseBootstrapAdminRequest,
  parseBootstrapAdminResponse,
  parseChecklistResponse,
  parseChecklistUpdateRequest,
  parseOrganizationProfileRequest,
  parseOrganizationProfileResponse,
  parseSitesRequest,
  parseSitesResponse,
  parseShiftsConstraintsRequest,
  parseShiftsConstraintsResponse,
  parseOffRequestPolicySetupRequest,
  parseOffRequestPolicySetupResponse,
  parseJsonBody,
  type ErrorEnvelope,
  type HttpMethod,
} from './contracts.ts';
import { createCorsHeaders } from './cors.ts';
import {
  applyEmployeeImport,
  bootstrapAdmin,
  getChecklist,
  getOffRequestPolicySetup,
  getOrganizationProfile,
  getShiftsConstraints,
  getSites,
  saveOffRequestPolicySetup,
  saveOrganizationProfile,
  saveShiftsConstraints,
  saveSites,
  updateChecklist,
  validateEmployeeImport,
} from './repository.ts';

type ApiResponseBody =
  | ErrorEnvelope
  | ReturnType<typeof parseBootstrapAdminResponse>
  | ReturnType<typeof parseOrganizationProfileResponse>
  | ReturnType<typeof parseSitesResponse>
  | ReturnType<typeof parseShiftsConstraintsResponse>
  | ReturnType<typeof parseEmployeeImportValidateResponse>
  | ReturnType<typeof parseEmployeeImportApplyResponse>
  | ReturnType<typeof parseOffRequestPolicySetupResponse>
  | ReturnType<typeof parseChecklistResponse>;

function withCorsHeaders(request: Request, init: ResponseInit = {}): ResponseInit {
  return {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...createCorsHeaders(request),
      ...(init.headers || {}),
    },
  };
}

function createResponse(request: Request, body: ApiResponseBody, status = 200): Response {
  return new Response(JSON.stringify(body), {
    ...withCorsHeaders(request, { status }),
  });
}

function errorEnvelopeFromUnknown(error: unknown): ErrorEnvelope {
  if (error instanceof ContractError) {
    return { code: error.code, message: error.message };
  }

  if (error instanceof Error) {
    return { code: 'internal_error', message: error.message };
  }

  return { code: 'internal_error', message: 'Internal server error' };
}

function mapErrorToStatus(code: string): number {
  switch (code) {
    case 'unauthorized':
      return 401;
    case 'organization_access_denied':
      return 403;
    case 'not_found':
      return 404;
    case 'method_not_allowed':
      return 405;
    case 'bad_request':
      return 400;
    default:
      return 500;
  }
}

function parseOrganizationIdQueryParam(request: Request): string {
  const organizationId = new URL(request.url).searchParams.get('organizationId')?.trim() ?? '';

  if (!organizationId) {
    throw new ContractError('bad_request', 'organizationId query parameter is required', 400);
  }

  return organizationId;
}

function createAuthClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SB_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !publishableKey) {
    throw new ContractError(
      'internal_error',
      'Missing SUPABASE_URL or publishable Supabase key',
      500
    );
  }

  return createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function createRepositoryClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new ContractError(
      'internal_error',
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
      500
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, withCorsHeaders(request, { status: 200 }));
  }

  const route = matchRoute(normalizePathSegments(new URL(request.url).pathname));

  if (!route) {
    return createResponse(request, { code: 'not_found', message: 'Not found' }, 404);
  }

  try {
    const method = request.method.toUpperCase();
    if (!allowedMethods(route.route).includes(method as HttpMethod)) {
      return createResponse(
        request,
        { code: 'method_not_allowed', message: `${method} is not allowed` },
        405
      );
    }

    const authClient = createAuthClient();
    const repositoryClient = createRepositoryClient();
    const auth = route.route === 'bootstrapAdmin'
      ? await resolveOperatorAuthContext(authClient, repositoryClient, request)
      : await resolvePhase2OpsAuthContext(authClient, repositoryClient, request);

    if (route.route === 'bootstrapAdmin') {
      const payload = await parseJsonBody(request);
      const input = parseBootstrapAdminRequest(payload);
      const result = await bootstrapAdmin(repositoryClient, auth, input);
      return createResponse(request, parseBootstrapAdminResponse(result), 200);
    }

    if (route.route === 'organizationProfile') {
      if (method === 'GET') {
        const organizationId = parseOrganizationIdQueryParam(request);
        const result = await getOrganizationProfile(repositoryClient, auth, organizationId);
        return createResponse(request, parseOrganizationProfileResponse(result), 200);
      }

      if (method === 'PATCH') {
        const payload = await parseJsonBody(request);
        const input = parseOrganizationProfileRequest(payload);
        const result = await saveOrganizationProfile(repositoryClient, auth, input);
        return createResponse(request, parseOrganizationProfileResponse(result), 200);
      }
    }

    if (route.route === 'sites') {
      if (method === 'GET') {
        const organizationId = parseOrganizationIdQueryParam(request);
        const result = await getSites(repositoryClient, auth, organizationId);
        return createResponse(request, parseSitesResponse(result), 200);
      }

      if (method === 'PUT') {
        const payload = await parseJsonBody(request);
        const input = parseSitesRequest(payload);
        const result = await saveSites(repositoryClient, auth, input);
        return createResponse(request, parseSitesResponse(result), 200);
      }
    }

    if (route.route === 'shiftsConstraints') {
      if (method === 'GET') {
        const organizationId = parseOrganizationIdQueryParam(request);
        const result = await getShiftsConstraints(repositoryClient, auth, organizationId);
        return createResponse(request, parseShiftsConstraintsResponse(result), 200);
      }

      if (method === 'PUT') {
        const payload = await parseJsonBody(request);
        const input = parseShiftsConstraintsRequest(payload);
        const result = await saveShiftsConstraints(repositoryClient, auth, input);
        return createResponse(request, parseShiftsConstraintsResponse(result), 200);
      }
    }

    if (route.route === 'employeeImportValidate') {
      const payload = await parseJsonBody(request);
      const input = parseEmployeeImportValidateRequest(payload);
      const result = await validateEmployeeImport(repositoryClient, auth, input);
      return createResponse(request, parseEmployeeImportValidateResponse(result), 200);
    }

    if (route.route === 'employeeImportApply') {
      const payload = await parseJsonBody(request);
      const input = parseEmployeeImportApplyRequest(payload);
      const result = await applyEmployeeImport(repositoryClient, auth, input);
      return createResponse(request, parseEmployeeImportApplyResponse(result), 200);
    }

    if (route.route === 'offRequestPolicies') {
      if (method === 'GET') {
        const organizationId = parseOrganizationIdQueryParam(request);
        const result = await getOffRequestPolicySetup(repositoryClient, auth, organizationId);
        return createResponse(request, parseOffRequestPolicySetupResponse(result), 200);
      }

      if (method === 'PUT') {
        const payload = await parseJsonBody(request);
        const input = parseOffRequestPolicySetupRequest(payload);
        const result = await saveOffRequestPolicySetup(repositoryClient, auth, input);
        return createResponse(request, parseOffRequestPolicySetupResponse(result), 200);
      }
    }

    if (route.route === 'checklist') {
      if (method === 'GET') {
        const organizationId = parseOrganizationIdQueryParam(request);
        const result = await getChecklist(repositoryClient, auth, organizationId);
        return createResponse(request, parseChecklistResponse(result), 200);
      }

      if (method === 'PATCH') {
        const payload = await parseJsonBody(request);
        const input = parseChecklistUpdateRequest(payload);
        const result = await updateChecklist(repositoryClient, auth, input);
        return createResponse(request, parseChecklistResponse(result), 200);
      }
    }

    return createResponse(request, { code: 'not_found', message: 'Not found' }, 404);
  } catch (error) {
    const envelope = errorEnvelopeFromUnknown(error);
    return createResponse(request, envelope, mapErrorToStatus(envelope.code));
  }
});
