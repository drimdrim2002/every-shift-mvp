import { createClient } from 'npm:@supabase/supabase-js@2';
import { resolveAuthContext } from './auth.ts';
import {
  allowedMethods,
  ContractError,
  type ErrorEnvelope,
  type HttpMethod,
  matchRoute,
  normalizePathSegments,
  parseEnsureRequest,
  parseJsonBody,
  parseUuidParam,
} from './contracts.ts';
import { createCorsHeaders } from './cors.ts';
import {
  compare as compareVersion,
  ensure as ensureSchedule,
  review as reviewVersion,
  select as selectVersion,
} from './repository.ts';
import type { CompareResponse, EnsureResponse, ReviewResponse, SelectResponse } from './contracts.ts';

type ApiResponseBody = CompareResponse | EnsureResponse | ReviewResponse | SelectResponse | ErrorEnvelope;

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
  return new Response(JSON.stringify(body), withCorsHeaders(request, { status }));
}

function createErrorResponse(request: Request, code: string, message: string, status: number): Response {
  return createResponse(request, { code, message }, status);
}

function mapErrorToStatus(code: string): number {
  switch (code) {
    case 'unauthorized':
      return 401;
    case 'organization_context_missing':
    case 'organization_access_denied':
      return 403;
    case 'already_finalized':
    case 'invalid_selection_state':
    case 'conflict':
      return 409;
    case 'not_found':
    case 'schedule_not_found':
    case 'version_not_found':
    case 'missing_schedule':
    case 'missing_version':
      return 404;
    case 'method_not_allowed':
      return 405;
    case 'bad_request':
      return 400;
    default:
      return 500;
  }
}

function errorEnvelopeFromUnknown(error: unknown): ErrorEnvelope {
  if (error instanceof ContractError) {
    return { code: error.code, message: error.message };
  }

  if (typeof error === 'object' && error !== null) {
    const candidate = error as { code?: unknown; message?: unknown };

    if (typeof candidate.code === 'string' && typeof candidate.message === 'string') {
      return {
        code: candidate.code,
        message: candidate.message,
      };
    }
  }

  if (error instanceof Error) {
    return {
      code: 'internal_error',
      message: error.message,
    };
  }

  return {
    code: 'internal_error',
    message: 'Internal server error',
  };
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

  const { pathname } = new URL(request.url);
  const route = matchRoute(normalizePathSegments(pathname));

  if (!route) {
    return createErrorResponse(request, 'not_found', 'Not found', 404);
  }

  const method = request.method.toUpperCase();

  try {
    const methods = allowedMethods(route.route);

    if (!methods.includes(method as HttpMethod)) {
      return createErrorResponse(request, 'method_not_allowed', `${method} is not allowed`, 405);
    }

    const authClient = createAuthClient();
    const auth = await resolveAuthContext(authClient, request);
    const repositoryClient = createRepositoryClient();

    if (route.route === 'ensure') {
      const payload = await parseJsonBody(request);
      const ensureInput = parseEnsureRequest(payload);
      const result: EnsureResponse = await ensureSchedule(repositoryClient, auth, ensureInput);
      return createResponse(request, result, 200);
    }

    if (route.route === 'compare') {
      const scheduleId = parseUuidParam('scheduleId', route.params.scheduleId);
      const result: CompareResponse = await compareVersion(repositoryClient, auth, scheduleId);
      return createResponse(request, result, 200);
    }

    if (route.route === 'review') {
      const versionId = parseUuidParam('versionId', route.params.versionId);
      const result: ReviewResponse = await reviewVersion(repositoryClient, auth, versionId);
      return createResponse(request, result, 200);
    }

    if (route.route === 'select') {
      const versionId = parseUuidParam('versionId', route.params.versionId);
      const result: SelectResponse = await selectVersion(repositoryClient, auth, versionId);
      return createResponse(request, result, 200);
    }

    throw new ContractError('not_found', 'Route handler not implemented', 404);
  } catch (error: unknown) {
    const envelope = errorEnvelopeFromUnknown(error);
    const status = mapErrorToStatus(envelope.code);
    return createResponse(request, envelope, status);
  }
});
