import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  ApprovalDecisionError,
  decideApprovalRequest,
  resolveApprovalAuthContext,
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
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Content-Type', 'application/json');

  return {
    ...init,
    headers,
  };
}

function createJsonResponse(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), withCorsHeaders(request, { status }));
}

function createErrorResponse(request: Request, error: ApprovalDecisionError) {
  const payload: { success: false; error: ApprovalErrorPayload } = {
    success: false,
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
    throw new ApprovalDecisionError('INTERNAL_ERROR', 'Missing Supabase auth configuration.', 500);
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
    throw new ApprovalDecisionError('INTERNAL_ERROR', 'Missing Supabase service role configuration.', 500);
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function handleApprovalDecisionRequest(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, withCorsHeaders(request, { status: 200 }));
  }

  if (request.method !== 'POST') {
    return createJsonResponse(
      request,
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Method not allowed.',
        },
      },
      405,
    );
  }

  try {
    const authClient = createAuthClient();
    const repositoryClient = createRepositoryClient();
    const auth = await resolveApprovalAuthContext(authClient, repositoryClient, request);
    const payload = await request.json();
    const result = await decideApprovalRequest(repositoryClient, auth, payload);

    return createJsonResponse(request, { success: true, data: result }, 200);
  } catch (error) {
    if (error instanceof ApprovalDecisionError) {
      return createErrorResponse(request, error);
    }

    const internalError = new ApprovalDecisionError(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Unexpected approval decision error.',
      500,
    );
    return createErrorResponse(request, internalError);
  }
}

if (import.meta.main) {
  Deno.serve(handleApprovalDecisionRequest);
}
