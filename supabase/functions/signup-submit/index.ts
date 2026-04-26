import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  processSignupSubmit,
  SignupSubmitServiceError,
  type SignupSubmitRequest,
} from './service.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  })
}

function createServiceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    throw new SignupSubmitServiceError('INTERNAL_ERROR', 'Missing Supabase service role configuration.', 500)
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function handleSignupSubmitRequest(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    })
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Only POST is supported.',
      },
    })
  }

  let payload: SignupSubmitRequest
  try {
    const body = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonResponse(400, {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request body must be a JSON object.',
        },
      })
    }
    payload = body as SignupSubmitRequest
  } catch {
    return jsonResponse(400, {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid JSON payload.',
      },
    })
  }

  try {
    const client = createServiceClient()
    const data = await processSignupSubmit(client as never, payload)

    return jsonResponse(200, {
      success: true,
      data,
    })
  } catch (error) {
    if (error instanceof SignupSubmitServiceError) {
      return jsonResponse(error.status, {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      })
    }

    return jsonResponse(500, {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unexpected signup-submit error.',
      },
    })
  }
}

if (import.meta.main) {
  Deno.serve(handleSignupSubmitRequest)
}
