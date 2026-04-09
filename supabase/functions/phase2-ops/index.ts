import { createClient } from 'npm:@supabase/supabase-js@2';
import { resolveOperatorAuthContext } from './auth.ts';
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
  parseOffRequestPolicySetupRequest,
  parseOffRequestPolicySetupResponse,
  parseJsonBody,
  type ErrorEnvelope,
  type HttpMethod,
} from './contracts.ts';
import {
  applyEmployeeImport,
  bootstrapAdmin,
  getChecklist,
  getOffRequestPolicySetup,
  saveOffRequestPolicySetup,
  validateEmployeeImport,
} from './repository.ts';

type ApiResponseBody =
  | ErrorEnvelope
  | ReturnType<typeof parseBootstrapAdminResponse>
  | ReturnType<typeof parseEmployeeImportValidateResponse>
  | ReturnType<typeof parseEmployeeImportApplyResponse>
  | ReturnType<typeof parseOffRequestPolicySetupResponse>
  | ReturnType<typeof parseChecklistResponse>;

function createResponse(request: Request, body: ApiResponseBody, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
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
    const auth = await resolveOperatorAuthContext(authClient, repositoryClient, request);

    if (route.route === 'bootstrapAdmin') {
      const payload = await parseJsonBody(request);
      const input = parseBootstrapAdminRequest(payload);
      const result = await bootstrapAdmin(repositoryClient, auth, input);
      return createResponse(request, parseBootstrapAdminResponse(result), 200);
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
      const organizationId = parseOrganizationIdQueryParam(request);
      const result = await getChecklist(repositoryClient, auth, organizationId);
      return createResponse(request, parseChecklistResponse(result), 200);
    }

    return createResponse(request, { code: 'not_found', message: 'Not found' }, 404);
  } catch (error) {
    const envelope = errorEnvelopeFromUnknown(error);
    return createResponse(request, envelope, mapErrorToStatus(envelope.code));
  }
});
