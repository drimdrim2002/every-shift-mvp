import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';
import {
  type OnboardingProgressAction,
  type OnboardingProgressRequest,
  STEP_SEQUENCE,
  type OnboardingStepKey,
  validateOnboardingProgressRequest,
} from './contract.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PROGRESS_SELECT =
  'organization_id, current_step, current_step_key, organization_info_confirmed_at, completed_at';

type OnboardingTransitionType = 'noop' | 'advance' | 'complete';
type OnboardingProgressErrorCode =
  | 'VALIDATION_ERROR'
  | 'PERMISSION_DENIED'
  | 'FORBIDDEN_STATE_TRANSITION'
  | 'METHOD_NOT_ALLOWED'
  | 'INTERNAL_ERROR';

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
  current_step: number;
  current_step_key: OnboardingStepKey | null;
  organization_info_confirmed_at: string | null;
  completed_at: string | null;
}

interface ProfileRow {
  global_role: string;
  account_status: string;
}

interface MembershipRow {
  organization_id: string;
  role: string;
  status: string;
  approved_at: string | null;
  created_at: string | null;
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

interface DomainProofs {
  isOrganizationInfoReady: boolean;
  isEmployeeSeedReady: boolean;
  isScheduleRequestReady: boolean;
}

interface CanonicalProgressSnapshot {
  row: OnboardingProgressRow;
  progress: OnboardingProgressStateDto;
  proofs: DomainProofs;
}

interface SyncOptions {
  finalizeCompletion: boolean;
  actorUserId?: string;
  completedByUserId?: string | null;
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

function compareMembershipTimestamps(
  leftTimestamp: string | null | undefined,
  rightTimestamp: string | null | undefined,
): number {
  if (leftTimestamp === rightTimestamp) {
    return 0;
  }

  if (!leftTimestamp) {
    return 1;
  }

  if (!rightTimestamp) {
    return -1;
  }

  return leftTimestamp.localeCompare(rightTimestamp);
}

function compareMembershipPriority(left: MembershipRow, right: MembershipRow): number {
  const approvedAtComparison = compareMembershipTimestamps(left.approved_at, right.approved_at);
  if (approvedAtComparison !== 0) {
    return approvedAtComparison;
  }

  const createdAtComparison = compareMembershipTimestamps(left.created_at, right.created_at);
  if (createdAtComparison !== 0) {
    return createdAtComparison;
  }

  return left.organization_id.localeCompare(right.organization_id);
}

function resolveCurrentOrganizationHint(user: User): string | null {
  const candidates = [
    user.user_metadata?.currentOrganizationId,
    user.user_metadata?.current_organization_id,
    user.app_metadata?.currentOrganizationId,
    user.app_metadata?.current_organization_id,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
}

function buildCompletedStepKeys(currentStepKey: OnboardingStepKey | null): OnboardingStepKey[] {
  if (currentStepKey === null) {
    return [...STEP_SEQUENCE];
  }

  const targetIndex = STEP_SEQUENCE.indexOf(currentStepKey);
  if (targetIndex <= 0) {
    return [];
  }

  return STEP_SEQUENCE.slice(0, targetIndex);
}

function toProgressState(row: OnboardingProgressRow): OnboardingProgressStateDto {
  const isOnboardingComplete = row.completed_at !== null || row.current_step_key === null;
  const currentStepKey = isOnboardingComplete ? null : row.current_step_key ?? 'organization_info';

  return {
    organizationId: row.organization_id,
    currentStepKey,
    completedStepKeys: buildCompletedStepKeys(currentStepKey),
    isOnboardingComplete,
    completedAt: isOnboardingComplete ? row.completed_at : null,
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
  snapshot: CanonicalProgressSnapshot,
  transition: OnboardingProgressTransitionDto | null,
): Response {
  return jsonResponse(status, {
    success: true,
    data: {
      action,
      progress: snapshot.progress,
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

  const user = authData.user;
  const userId = user.id;

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('global_role, account_status')
    .eq('id', userId)
    .maybeSingle<ProfileRow>();

  if (profileError && profileError.code !== PROFILE_NOT_FOUND_ERROR_CODE) {
    console.error('[onboarding-progress] Failed to load profile:', profileError);
    return {
      error: errorResponse(500, 'INTERNAL_ERROR', 'Failed to resolve profile scope.'),
    };
  }

  if (!profile || profile.account_status !== 'active' || profile.global_role !== 'admin') {
    return {
      error: errorResponse(403, 'PERMISSION_DENIED', 'Only active admin members can use onboarding.'),
    };
  }

  const { data: memberships, error: membershipError } = await adminClient
    .from('organization_memberships')
    .select('organization_id, role, status, approved_at, created_at')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .eq('status', 'approved')
    .returns<MembershipRow[]>();

  if (membershipError) {
    console.error('[onboarding-progress] Failed to load memberships:', membershipError);
    return {
      error: errorResponse(500, 'INTERNAL_ERROR', 'Failed to resolve membership scope.'),
    };
  }

  const approvedAdminMemberships = (memberships ?? [])
    .filter((membership) => membership.organization_id && membership.role === 'admin' && membership.status === 'approved')
    .sort(compareMembershipPriority);

  if (approvedAdminMemberships.length === 0) {
    return {
      error: errorResponse(403, 'PERMISSION_DENIED', 'Only admin_active users can use onboarding.'),
    };
  }

  const currentOrganizationHint = resolveCurrentOrganizationHint(user);
  const hintedMembership = currentOrganizationHint
    ? approvedAdminMemberships.find(
        (membership) => membership.organization_id === currentOrganizationHint,
      )
    : null;

  return {
    userId,
    organizationId: hintedMembership?.organization_id ?? approvedAdminMemberships[0].organization_id,
  };
}

async function getOrCreateProgressRow(
  adminClient: SupabaseClient,
  organizationId: string,
): Promise<OnboardingProgressRow | { error: Response }> {
  const existingRowResult = await adminClient
    .from('onboarding_progress')
    .select(PROGRESS_SELECT)
    .eq('organization_id', organizationId)
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
      current_step_key: 'organization_info',
      current_step: 1,
      completed_at: null,
    })
    .select(PROGRESS_SELECT)
    .single<OnboardingProgressRow>();

  if (!insertResult.error && insertResult.data) {
    return insertResult.data;
  }

  if (insertResult.error?.code === UNIQUE_VIOLATION_ERROR_CODE) {
    const retryResult = await adminClient
      .from('onboarding_progress')
      .select(PROGRESS_SELECT)
      .eq('organization_id', organizationId)
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

async function invokeBooleanRpc(
  adminClient: SupabaseClient,
  functionName:
    | 'is_onboarding_org_info_domain_ready'
    | 'is_onboarding_employee_seed_ready'
    | 'is_onboarding_schedule_request_ready',
  organizationId: string,
): Promise<boolean | { error: Response }> {
  const { data, error } = await adminClient.rpc<boolean>(functionName, {
    target_org_id: organizationId,
  });

  if (error) {
    console.error(`[onboarding-progress] Failed to run ${functionName}:`, error);
    return {
      error: errorResponse(500, 'INTERNAL_ERROR', 'Failed to resolve onboarding domain proof.'),
    };
  }

  return data === true;
}

async function loadDomainProofs(
  adminClient: SupabaseClient,
  organizationId: string,
): Promise<DomainProofs | { error: Response }> {
  const [organizationInfoReady, employeeSeedReady, scheduleRequestReady] = await Promise.all([
    invokeBooleanRpc(adminClient, 'is_onboarding_org_info_domain_ready', organizationId),
    invokeBooleanRpc(adminClient, 'is_onboarding_employee_seed_ready', organizationId),
    invokeBooleanRpc(adminClient, 'is_onboarding_schedule_request_ready', organizationId),
  ]);

  if (typeof organizationInfoReady !== 'boolean') {
    return organizationInfoReady;
  }

  if (typeof employeeSeedReady !== 'boolean') {
    return employeeSeedReady;
  }

  if (typeof scheduleRequestReady !== 'boolean') {
    return scheduleRequestReady;
  }

  return {
    isOrganizationInfoReady: organizationInfoReady,
    isEmployeeSeedReady: employeeSeedReady,
    isScheduleRequestReady: scheduleRequestReady,
  };
}

function deriveTargetState(
  row: OnboardingProgressRow,
  proofs: DomainProofs,
  options: SyncOptions,
): Pick<OnboardingProgressRow, 'current_step' | 'current_step_key' | 'completed_at'> {
  if (row.completed_at !== null) {
    return {
      current_step: 4,
      current_step_key: null,
      completed_at: row.completed_at,
    };
  }

  if (
    row.organization_info_confirmed_at !== null &&
    proofs.isOrganizationInfoReady &&
    proofs.isEmployeeSeedReady &&
    proofs.isScheduleRequestReady &&
    options.finalizeCompletion
  ) {
    return {
      current_step: 4,
      current_step_key: null,
      completed_at: new Date().toISOString(),
    };
  }

  if (row.organization_info_confirmed_at === null || !proofs.isOrganizationInfoReady) {
    return {
      current_step: 1,
      current_step_key: 'organization_info',
      completed_at: null,
    };
  }

  if (!proofs.isEmployeeSeedReady) {
    return {
      current_step: 2,
      current_step_key: 'employee_seed',
      completed_at: null,
    };
  }

  return {
    current_step: 3,
    current_step_key: 'schedule_request',
    completed_at: null,
  };
}

async function synchronizeProgressRow(
  adminClient: SupabaseClient,
  organizationId: string,
  options: SyncOptions,
): Promise<CanonicalProgressSnapshot | { error: Response }> {
  const row = await getOrCreateProgressRow(adminClient, organizationId);
  if ('error' in row) {
    return row;
  }

  const proofs = await loadDomainProofs(adminClient, organizationId);
  if ('error' in proofs) {
    return proofs;
  }

  const targetState = deriveTargetState(row, proofs, options);
  const needsUpdate =
    row.current_step !== targetState.current_step ||
    row.current_step_key !== targetState.current_step_key ||
    row.completed_at !== targetState.completed_at;

  if (!needsUpdate) {
    return {
      row,
      proofs,
      progress: toProgressState(row),
    };
  }

  const updatePayload: Record<string, unknown> = {
    current_step: targetState.current_step,
    current_step_key: targetState.current_step_key,
    completed_at: targetState.completed_at,
  };

  if (options.actorUserId) {
    updatePayload.last_actor_user_id = options.actorUserId;
  }

  if (targetState.completed_at !== null && options.completedByUserId !== undefined) {
    updatePayload.completed_by = options.completedByUserId;
  }

  if (targetState.completed_at === null) {
    updatePayload.completed_by = null;
  }

  const updateResult = await adminClient
    .from('onboarding_progress')
    .update(updatePayload)
    .eq('organization_id', organizationId)
    .select(PROGRESS_SELECT)
    .single<OnboardingProgressRow>();

  if (updateResult.error || !updateResult.data) {
    console.error('[onboarding-progress] Failed to synchronize progress:', updateResult.error);
    return {
      error: errorResponse(500, 'INTERNAL_ERROR', 'Failed to synchronize onboarding progress.'),
    };
  }

  return {
    row: updateResult.data,
    proofs,
    progress: toProgressState(updateResult.data),
  };
}

async function confirmOrganizationInfoStep(
  adminClient: SupabaseClient,
  context: CallerContext,
  snapshot: CanonicalProgressSnapshot,
): Promise<OnboardingProgressRow | { error: Response }> {
  if (!snapshot.proofs.isOrganizationInfoReady) {
    return {
      error: errorResponse(
        409,
        'FORBIDDEN_STATE_TRANSITION',
        'Organization info cannot be completed before the required organization setup exists.',
        {
          requestedStepKey: 'organization_info',
          currentStepKey: snapshot.progress.currentStepKey,
        },
      ),
    };
  }

  const updatePayload: Record<string, unknown> = {
    last_actor_user_id: context.userId,
  };

  if (snapshot.row.organization_info_confirmed_at === null) {
    updatePayload.organization_info_confirmed_at = new Date().toISOString();
    updatePayload.organization_info_confirmed_by = context.userId;
  }

  const updateResult = await adminClient
    .from('onboarding_progress')
    .update(updatePayload)
    .eq('organization_id', context.organizationId)
    .select(PROGRESS_SELECT)
    .single<OnboardingProgressRow>();

  if (updateResult.error || !updateResult.data) {
    console.error('[onboarding-progress] Failed to confirm organization info step:', updateResult.error);
    return {
      error: errorResponse(500, 'INTERNAL_ERROR', 'Failed to persist organization info completion.'),
    };
  }

  return updateResult.data;
}

async function handleUpdateAction(
  adminClient: SupabaseClient,
  context: CallerContext,
  stepKey: OnboardingStepKey,
): Promise<Response> {
  const previousSnapshot = await synchronizeProgressRow(adminClient, context.organizationId, {
    finalizeCompletion: false,
    actorUserId: context.userId,
  });
  if ('error' in previousSnapshot) {
    return previousSnapshot.error;
  }

  if (previousSnapshot.progress.isOnboardingComplete) {
    return errorResponse(409, 'FORBIDDEN_STATE_TRANSITION', 'Completed onboarding cannot be modified.', {
      requestedStepKey: stepKey,
      currentStepKey: previousSnapshot.progress.currentStepKey,
    });
  }

  if (previousSnapshot.progress.currentStepKey !== stepKey) {
    return errorResponse(
      409,
      'FORBIDDEN_STATE_TRANSITION',
      'Onboarding update must target the current incomplete step.',
      {
        currentStepKey: previousSnapshot.progress.currentStepKey,
        requestedStepKey: stepKey,
      },
    );
  }

  if (stepKey === 'organization_info') {
    const confirmationResult = await confirmOrganizationInfoStep(adminClient, context, previousSnapshot);
    if ('error' in confirmationResult) {
      return confirmationResult.error;
    }

    const nextSnapshot = await synchronizeProgressRow(adminClient, context.organizationId, {
      finalizeCompletion: false,
      actorUserId: context.userId,
    });
    if ('error' in nextSnapshot) {
      return nextSnapshot.error;
    }

    return successResponse(
      200,
      'update',
      nextSnapshot,
      toTransition('advance', stepKey, previousSnapshot.progress, nextSnapshot.progress),
    );
  }

  if (stepKey === 'employee_seed' && !previousSnapshot.proofs.isEmployeeSeedReady) {
    return errorResponse(
      409,
      'FORBIDDEN_STATE_TRANSITION',
      'Employee seed cannot be completed before at least one schedulable employee exists.',
      {
        currentStepKey: previousSnapshot.progress.currentStepKey,
        requestedStepKey: stepKey,
      },
    );
  }

  const nextSnapshot = await synchronizeProgressRow(adminClient, context.organizationId, {
    finalizeCompletion: false,
    actorUserId: context.userId,
  });
  if ('error' in nextSnapshot) {
    return nextSnapshot.error;
  }

  const transitionType: OnboardingTransitionType =
    previousSnapshot.progress.currentStepKey === nextSnapshot.progress.currentStepKey &&
    previousSnapshot.progress.isOnboardingComplete === nextSnapshot.progress.isOnboardingComplete
      ? 'noop'
      : 'advance';

  return successResponse(
    200,
    'update',
    nextSnapshot,
    toTransition(transitionType, stepKey, previousSnapshot.progress, nextSnapshot.progress),
  );
}

async function handleCompleteAction(
  adminClient: SupabaseClient,
  context: CallerContext,
): Promise<Response> {
  const previousSnapshot = await synchronizeProgressRow(adminClient, context.organizationId, {
    finalizeCompletion: false,
    actorUserId: context.userId,
  });
  if ('error' in previousSnapshot) {
    return previousSnapshot.error;
  }

  if (previousSnapshot.progress.isOnboardingComplete) {
    return successResponse(
      200,
      'complete',
      previousSnapshot,
      toTransition('noop', 'schedule_request', previousSnapshot.progress, previousSnapshot.progress),
    );
  }

  if (previousSnapshot.progress.currentStepKey !== 'schedule_request') {
    return errorResponse(
      409,
      'FORBIDDEN_STATE_TRANSITION',
      'Onboarding can only be completed from the final schedule_request step.',
      {
        currentStepKey: previousSnapshot.progress.currentStepKey,
        requestedStepKey: 'schedule_request',
      },
    );
  }

  if (!previousSnapshot.proofs.isScheduleRequestReady) {
    return errorResponse(
      409,
      'FORBIDDEN_STATE_TRANSITION',
      'Onboarding cannot be completed before the first schedule request is persisted.',
      {
        currentStepKey: previousSnapshot.progress.currentStepKey,
        requestedStepKey: 'schedule_request',
      },
    );
  }

  const nextSnapshot = await synchronizeProgressRow(adminClient, context.organizationId, {
    finalizeCompletion: true,
    actorUserId: context.userId,
    completedByUserId: context.userId,
  });
  if ('error' in nextSnapshot) {
    return nextSnapshot.error;
  }

  if (!nextSnapshot.progress.isOnboardingComplete) {
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to finalize onboarding completion.');
  }

  return successResponse(
    200,
    'complete',
    nextSnapshot,
    toTransition('complete', 'schedule_request', previousSnapshot.progress, nextSnapshot.progress),
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

  const validation = validateOnboardingProgressRequest(payload);
  if ('status' in validation) {
    return errorResponse(
      validation.status,
      validation.code,
      validation.message,
      validation.details,
    );
  }

  const { action, stepKey } = validation;

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
    const snapshot = await synchronizeProgressRow(adminClient, context.organizationId, {
      finalizeCompletion: true,
      actorUserId: context.userId,
    });
    if ('error' in snapshot) {
      return snapshot.error;
    }

    return successResponse(200, 'get', snapshot, null);
  }

  if (action === 'update') {
    return handleUpdateAction(adminClient, context, stepKey);
  }

  return handleCompleteAction(adminClient, context);
});
