import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  ApprovalDecisionError,
  resolveApprovalAuthContext,
} from '../approval-decision/service.ts';
import {
  ApprovalReadError,
  loadApprovalRequestDetail,
  listApprovalQueueRequests,
} from './service.ts';

interface ApprovalErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

function withCorsHeaders(request: Request, init: ResponseInit = {}) {
  const origin = request.headers.get('origin') ?? '*';
  const headers = new Headers(init.headers);
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Content-Type', 'application/json');

  return {
    ...init,
    headers,
  };
}

function createJsonResponse(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), withCorsHeaders(request, { status }));
}

function createErrorResponse(
  request: Request,
  error: ApprovalReadError | ApprovalDecisionError,
) {
  const payload: { error: ApprovalErrorPayload } = {
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  };

  return createJsonResponse(request, payload, error.status);
}

function createAuthClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SB_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !publishableKey) {
    throw new ApprovalReadError('INTERNAL_ERROR', 'Missing Supabase auth configuration.', 500);
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
    throw new ApprovalReadError('INTERNAL_ERROR', 'Missing Supabase service role configuration.', 500);
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function resolveRoute(request: Request): 'queue' | 'request' {
  const pathname = new URL(request.url).pathname;

  if (pathname.endsWith('/queue')) {
    return 'queue';
  }

  if (pathname.endsWith('/request')) {
    return 'request';
  }

  throw new ApprovalReadError('VALIDATION_ERROR', 'Unknown approval-read route.', 404);
}

export async function handleApprovalReadRequest(
  request: Request,
  deps?: {
    authClient?: ReturnType<typeof createAuthClient>;
    repositoryClient?: ReturnType<typeof createRepositoryClient>;
  },
): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, withCorsHeaders(request, { status: 200 }));
  }

  if (request.method !== 'GET') {
    return createJsonResponse(
      request,
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Method not allowed.',
        },
      },
      405,
    );
  }

  try {
    const authClient = deps?.authClient ?? createAuthClient();
    const repositoryClient = deps?.repositoryClient ?? createRepositoryClient();
    const auth = await resolveApprovalAuthContext(authClient, repositoryClient, request);
    const url = new URL(request.url);
    const route = resolveRoute(request);

    if (route === 'queue') {
      const payload = await listApprovalQueueRequests(repositoryClient, auth, {
        status: url.searchParams.get('status'),
        organizationId: url.searchParams.get('organizationId'),
        keyword: url.searchParams.get('keyword'),
      });

      return createJsonResponse(request, payload, 200);
    }

    const payload = await loadApprovalRequestDetail(
      repositoryClient,
      auth,
      url.searchParams.get('signupRequestId') ?? '',
    );

    return createJsonResponse(request, payload, 200);
  } catch (error) {
    if (error instanceof ApprovalReadError || error instanceof ApprovalDecisionError) {
      return createErrorResponse(request, error);
    }

    const internalError = new ApprovalReadError(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Unexpected approval read error.',
      500,
    );
    return createErrorResponse(request, internalError);
  }
}

if (import.meta.main) {
  Deno.serve(handleApprovalReadRequest);
}
