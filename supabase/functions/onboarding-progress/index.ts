import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const STEP_SEQUENCE = ['organization_info', 'employee_seed', 'schedule_request'] as const;

type OnboardingStepKey = (typeof STEP_SEQUENCE)[number];
type StoredStep = 1 | 2 | 3;
type OnboardingProgressAction = 'get' | 'update' | 'complete';
type OnboardingTransitionType = 'noop' | 'advance' | 'complete';
type OnboardingProgressErrorCode =
  | 'VALIDATION_ERROR'
  | 'PERMISSION_DENIED'
  | 'FORBIDDEN_STATE_TRANSITION'
  | 'METHOD_NOT_ALLOWED'
  | 'INTERNAL_ERROR';

interface OnboardingProgressRequest {
  action?: unknown;
  stepKey?: unknown;
}

interface OnboardingProgressStateDto {
  organizationId: string;
  currentStepKey: OnboardingStepKey | null;
  completedStepKeys: OnboardingStepKey[];
  isOnboardingComplete: boolean;
  completedAt: string | null;
}

interface OnboardingProgressTransitionDto {
  type: OnboardingTransitionType;
  requestedStepKey: OnboardingStepKey | null;
  previousCurrentStepKey: OnboardingStepKey | null;
  resultingCurrentStepKey: OnboardingStepKey | null;
  isOnboardingComplete: boolean;
}

interface OnboardingProgressSuccessData {
  action: OnboardingProgressAction;
  progress: OnboardingProgressStateDto;
  transition: OnboardingProgressTransitionDto | null;
}

interface OnboardingProgressRow {
  organization_id: string;
  user_id: string;
  current_step: number;
  completed_at: string | null;
}

interface OnboardingProgressSuccessResponse {
  success: true;
  data: OnboardingProgressSuccessData;
}

interface OnboardingProgressErrorResponse {
  success: false;
  error: {
    code: OnboardingProgressErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

type OnboardingProgressResponse = OnboardingProgressSuccessResponse | OnboardingProgressErrorResponse;

interface CallerContext {
  userId: string;
  organizationId: string;
}

const PROFILE_NOT_FOUND_ERROR_CODE = 'PGRST116';
const UNIQUE_VIOLATION_ERROR_CODE = '23505';

function jsonResponse(status: number, body: OnboardingProgressResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  });
}

function errorResponse(
  status: number,
  code: OnboardingProgressErrorCode,
  message: string,
  details?: Record<string, unknown>,
): Response {
  return jsonResponse(status, {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}

function normalizeAction(value: unknown): OnboardingProgressAction | null {
  if (value === 'get' || value === 'update' || value === 'complete') {
    return value;
  }
  return null;
}

function normalizeStepKey(value: unknown): OnboardingStepKey | null {
  if (value === 'organization_info' || value === 'employee_seed' || value === 'schedule_request') {
    return value;
  }
  return null;
}

function sanitizeStep(step: number): StoredStep {
  if (step <= 1) {
    return 1;
  }
  if (step >= 3) {
    return 3;
  }
  return 2;
}

function stepKeyToStoredStep(stepKey: OnboardingStepKey): StoredStep {
  return (STEP_SEQUENCE.indexOf(stepKey) + 1) as StoredStep;
}

function storedStepToStepKey(step: StoredStep): OnboardingStepKey {
  return STEP_SEQUENCE[step - 1];
}

function toProgressState(row: OnboardingProgressRow): OnboardingProgressStateDto {
  const storedStep = sanitizeStep(row.current_step);
  const isOnboardingComplete = row.completed_at !== null;
  const currentStepKey = isOnboardingComplete ? null : storedStepToStepKey(storedStep);
  const completedStepKeys = isOnboardingComplete
    ? [...STEP_SEQUENCE]
    : STEP_SEQUENCE.slice(0, storedStep - 1);

  return {
    organizationId: row.organization_id,
    currentStepKey,
    completedStepKeys,
    isOnboardingComplete,
    completedAt: row.completed_at,
  };
}

function toTransition(
  type: OnboardingTransitionType,
  requestedStepKey: OnboardingStepKey | null,
  previousProgress: OnboardingProgressStateDto,
  nextProgress: OnboardingProgressStateDto,
): OnboardingProgressTransitionDto {
  return {
    type,
    requestedStepKey,
    previousCurrentStepKey: previousProgress.currentStepKey,
    resultingCurrentStepKey: nextProgress.currentStepKey,
    isOnboardingComplete: nextProgress.isOnboardingComplete,
  };
}

function successResponse(
  status: number,
  action: OnboardingProgressAction,
  row: OnboardingProgressRow,
  transition: OnboardingProgressTransitionDto | null,
): Response {
  return jsonResponse(status, {
    success: true,
    data: {
      action,
      progress: toProgressState(row),
      transition,
    },
  });
}

function createServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function createAuthClient(req: Request): SupabaseClient | null {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const authHeader = req.headers.get('Authorization');

  if (!supabaseUrl || !anonKey || !authHeader) {
    return null;
  }

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function resolveCallerContext(
  req: Request,
  adminClient: SupabaseClient,
): Promise<CallerContext | { error: Response }> {
  const authClient = createAuthClient(req);
  if (!authClient) {
    return {
      error: errorResponse(403, 'PERMISSION_DENIED', 'Authorization header is required.'),
    };
  }

  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) {
    return {
      error: errorResponse(403, 'PERMISSION_DENIED', 'Authenticated user is required.'),
    };
  }

  const userId = authData.user.id;

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('account_status')
    .eq('id', userId)
    .maybeSingle<{ account_status: string }>();

  if (profileError && profileError.code !== PROFILE_NOT_FOUND_ERROR_CODE) {
    console.error('[onboarding-progress] Failed to load profile:', profileError);
    return {
      error: errorResponse(500, 'INTERNAL_ERROR', 'Failed to resolve profile scope.'),
    };
  }

  if (profile && profile.account_status !== 'active') {
    return {
      error: errorResponse(403, 'PERMISSION_DENIED', 'Only active admin members can use onboarding.'),
    };
  }

  const { data: memberships, error: membershipError } = await adminClient
    .from('organization_memberships')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .eq('status', 'approved')
    .order('approved_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true, nullsFirst: false })
    .order('organization_id', { ascending: true })
    .limit(1);

  if (membershipError) {
    console.error('[onboarding-progress] Failed to load memberships:', membershipError);
    return {
      error: errorResponse(500, 'INTERNAL_ERROR', 'Failed to resolve membership scope.'),
    };
  }

  const membership = memberships?.[0];
  if (!membership?.organization_id) {
    return {
      error: errorResponse(403, 'PERMISSION_DENIED', 'Only admin_active users can use onboarding.'),
    };
  }

  return {
    userId,
    organizationId: membership.organization_id,
  };
}

async function getOrCreateProgressRow(
  adminClient: SupabaseClient,
  organizationId: string,
  userId: string,
): Promise<OnboardingProgressRow | { error: Response }> {
  const existingRowResult = await adminClient
    .from('onboarding_progress')
    .select('organization_id, user_id, current_step, completed_at')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle<OnboardingProgressRow>();

  if (existingRowResult.error) {
    console.error('[onboarding-progress] Failed to query progress:', existingRowResult.error);
    return {
      error: errorResponse(500, 'INTERNAL_ERROR', 'Failed to load onboarding progress.'),
    };
  }

  if (existingRowResult.data) {
    return existingRowResult.data;
  }

  const insertResult = await adminClient
    .from('onboarding_progress')
    .insert({
      organization_id: organizationId,
      user_id: userId,
      current_step: 1,
      completed_at: null,
    })
    .select('organization_id, user_id, current_step, completed_at')
    .single<OnboardingProgressRow>();

  if (!insertResult.error && insertResult.data) {
    return insertResult.data;
  }

  if (insertResult.error?.code === UNIQUE_VIOLATION_ERROR_CODE) {
    const retryResult = await adminClient
      .from('onboarding_progress')
      .select('organization_id, user_id, current_step, completed_at')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single<OnboardingProgressRow>();

    if (retryResult.error || !retryResult.data) {
      console.error('[onboarding-progress] Retry query failed:', retryResult.error);
      return {
        error: errorResponse(500, 'INTERNAL_ERROR', 'Failed to load onboarding progress after retry.'),
      };
    }

    return retryResult.data;
  }

  console.error('[onboarding-progress] Failed to insert progress row:', insertResult.error);
  return {
    error: errorResponse(500, 'INTERNAL_ERROR', 'Failed to initialize onboarding progress.'),
  };
}

async function handleUpdateAction(
  adminClient: SupabaseClient,
  context: CallerContext,
  stepKey: OnboardingStepKey,
): Promise<Response> {
  const row = await getOrCreateProgressRow(adminClient, context.organizationId, context.userId);
  if ('error' in row) {
    return row.error;
  }

  const previousProgress = toProgressState(row);
  if (row.completed_at) {
    return errorResponse(409, 'FORBIDDEN_STATE_TRANSITION', 'Completed onboarding cannot be modified.', {
      requestedStepKey: stepKey,
      currentStepKey: previousProgress.currentStepKey,
    });
  }

  const storedStep = sanitizeStep(row.current_step);
  const requestedStep = stepKeyToStoredStep(stepKey);
  if (requestedStep < storedStep) {
    return errorResponse(
      409,
      'FORBIDDEN_STATE_TRANSITION',
      'Onboarding step can only stay same or move forward.',
      {
        currentStepKey: previousProgress.currentStepKey,
        requestedStepKey: stepKey,
      },
    );
  }

  if (requestedStep === storedStep) {
    return successResponse(
      200,
      'update',
      row,
      toTransition('noop', stepKey, previousProgress, previousProgress),
    );
  }

  const updateResult = await adminClient
    .from('onboarding_progress')
    .update({
      current_step: requestedStep,
    })
    .eq('organization_id', context.organizationId)
    .eq('user_id', context.userId)
    .select('organization_id, user_id, current_step, completed_at')
    .single<OnboardingProgressRow>();

  if (updateResult.error || !updateResult.data) {
    console.error('[onboarding-progress] Failed to update step:', updateResult.error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to update onboarding step.');
  }

  return successResponse(
    200,
    'update',
    updateResult.data,
    toTransition('advance', stepKey, previousProgress, toProgressState(updateResult.data)),
  );
}

async function handleCompleteAction(
  adminClient: SupabaseClient,
  context: CallerContext,
): Promise<Response> {
  const row = await getOrCreateProgressRow(adminClient, context.organizationId, context.userId);
  if ('error' in row) {
    return row.error;
  }

  const previousProgress = toProgressState(row);
  if (row.completed_at) {
    return successResponse(
      200,
      'complete',
      row,
      toTransition('noop', 'schedule_request', previousProgress, previousProgress),
    );
  }

  const completedAt = row.completed_at ?? new Date().toISOString();
  const updateResult = await adminClient
    .from('onboarding_progress')
    .update({
      current_step: 3,
      completed_at: completedAt,
    })
    .eq('organization_id', context.organizationId)
    .eq('user_id', context.userId)
    .select('organization_id, user_id, current_step, completed_at')
    .single<OnboardingProgressRow>();

  if (updateResult.error || !updateResult.data) {
    console.error('[onboarding-progress] Failed to complete onboarding:', updateResult.error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to complete onboarding.');
  }

  return successResponse(
    200,
    'complete',
    updateResult.data,
    toTransition('complete', 'schedule_request', previousProgress, toProgressState(updateResult.data)),
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Only POST is supported.');
  }

  let payload: OnboardingProgressRequest;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== 'object') {
      return errorResponse(400, 'VALIDATION_ERROR', 'Request body must be a JSON object.');
    }
    payload = parsed as OnboardingProgressRequest;
  } catch {
    return errorResponse(400, 'VALIDATION_ERROR', 'Invalid JSON payload.');
  }

  const action = normalizeAction(payload.action);
  if (!action) {
    return errorResponse(400, 'VALIDATION_ERROR', 'action must be get, update, or complete.', {
      field: 'action',
      allowedValues: ['get', 'update', 'complete'],
    });
  }

  let adminClient: SupabaseClient;
  try {
    adminClient = createServiceClient();
  } catch (error) {
    console.error('[onboarding-progress] Failed to initialize clients:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Server configuration is invalid.');
  }

  const context = await resolveCallerContext(req, adminClient);
  if ('error' in context) {
    return context.error;
  }

  if (action === 'get') {
    const row = await getOrCreateProgressRow(adminClient, context.organizationId, context.userId);
    if ('error' in row) {
      return row.error;
    }

    return successResponse(200, 'get', row, null);
  }

  if (action === 'update') {
    const stepKey = normalizeStepKey(payload.stepKey);
    if (!stepKey) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'stepKey must be one of organization_info, employee_seed, or schedule_request.',
        {
          field: 'stepKey',
          allowedValues: STEP_SEQUENCE,
        },
      );
    }

    return handleUpdateAction(adminClient, context, stepKey);
  }

  if (payload.stepKey !== undefined) {
    return errorResponse(400, 'VALIDATION_ERROR', 'stepKey is only allowed for the update action.', {
      field: 'stepKey',
      action,
    });
  }

  return handleCompleteAction(adminClient, context);
});
