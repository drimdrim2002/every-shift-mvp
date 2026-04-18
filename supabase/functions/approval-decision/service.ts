export type ApprovalDecision = 'approve' | 'reject';
export type ApprovalErrorCode =
  | 'REQUEST_NOT_FOUND'
  | 'INVALID_TRANSITION'
  | 'PERMISSION_DENIED'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR';

export interface ApprovalDecisionRequest {
  signupRequestId: string;
  decision: ApprovalDecision;
  reviewNote?: string;
}

export interface ApprovalDecisionSuccessData {
  signupRequestId: string;
  decision: ApprovalDecision;
  requestStatus: 'approved' | 'rejected';
  membershipStatus: 'approved' | 'none';
  organizationId: string | null;
  membershipId: string | null;
  decidedAt: string;
  alreadyProcessed: boolean;
}

export interface ApprovalDecisionAuthContext {
  actorUserId: string;
  actorGlobalRole: string;
  actorAccountStatus: string;
}

interface SignupRequestRow {
  id: string;
  requester_user_id: string | null;
  organization_id: string | null;
  requested_role: string | null;
  status: string | null;
  reviewed_at?: string | null;
}

interface MembershipRow {
  id: string;
  status?: string | null;
}

interface QueryResult<T> {
  data: T | null;
  error: {
    message: string;
  } | null;
}

interface ApprovalAuthUser {
  id?: unknown;
}

export interface ApprovalAuthClient {
  auth: {
    getUser(token: string): Promise<{
      data: {
        user: ApprovalAuthUser | null;
      };
      error: {
        message: string;
      } | null;
    }>;
  };
}

export interface ApprovalRepositoryClient {
  from(table: string): {
    select?: (columns: string) => unknown;
    update?: (payload: Record<string, unknown>) => { eq(column: string, value: string): Promise<QueryResult<unknown>> };
    insert?: (payload: Record<string, unknown>) => Promise<QueryResult<unknown>>;
    upsert?: (
      payload: Record<string, unknown>,
      options: { onConflict: string },
    ) => Promise<QueryResult<MembershipRow[] | MembershipRow>>;
  };
}

export class ApprovalDecisionError extends Error {
  code: ApprovalErrorCode;
  status: number;
  details?: Record<string, unknown>;

  constructor(
    code: ApprovalErrorCode,
    message: string,
    status = 400,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApprovalDecisionError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function parseAuthorization(request: Request) {
  const header = request.headers.get('Authorization') ?? request.headers.get('authorization') ?? '';
  const [, token] = header.match(/^Bearer\s+(.+)$/i) ?? [];

  if (!token) {
    throw new ApprovalDecisionError('PERMISSION_DENIED', 'Missing bearer token.', 401);
  }

  return token;
}

function normalizeDecisionInput(input: ApprovalDecisionRequest): ApprovalDecisionRequest {
  const signupRequestId = input.signupRequestId?.trim() ?? '';
  if (!signupRequestId) {
    throw new ApprovalDecisionError('VALIDATION_ERROR', 'signupRequestId is required.', 400);
  }

  if (input.decision !== 'approve' && input.decision !== 'reject') {
    throw new ApprovalDecisionError('VALIDATION_ERROR', 'decision must be approve or reject.', 400);
  }

  const reviewNote = typeof input.reviewNote === 'string' ? input.reviewNote.trim() : '';

  return {
    signupRequestId,
    decision: input.decision,
    reviewNote: reviewNote || undefined,
  };
}

async function loadSignupRequest(
  repositoryClient: ApprovalRepositoryClient,
  signupRequestId: string,
): Promise<SignupRequestRow> {
  const { data, error }: QueryResult<SignupRequestRow> = await repositoryClient
    .from('signup_requests')
    .select('id, requester_user_id, organization_id, requested_role, status, reviewed_at')
    .eq('id', signupRequestId)
    .maybeSingle();

  if (error) {
    throw new ApprovalDecisionError('INTERNAL_ERROR', error.message, 500);
  }

  if (!data || data.requested_role !== 'admin') {
    throw new ApprovalDecisionError('REQUEST_NOT_FOUND', 'Admin signup request not found.', 404);
  }

  return data;
}

async function loadApprovedMembership(
  repositoryClient: ApprovalRepositoryClient,
  organizationId: string | null,
  requesterUserId: string | null,
): Promise<MembershipRow | null> {
  if (!organizationId || !requesterUserId) {
    return null;
  }

  const { data, error }: QueryResult<MembershipRow> = await repositoryClient
    .from('organization_memberships')
    .select('id, status')
    .eq('organization_id', organizationId)
    .eq('user_id', requesterUserId)
    .maybeSingle();

  if (error) {
    throw new ApprovalDecisionError('INTERNAL_ERROR', error.message, 500);
  }

  if (!data || data.status !== 'approved') {
    return null;
  }

  return data;
}

function resolveReplayDecision(status: string | null | undefined): ApprovalDecision | null {
  if (status === 'approved') {
    return 'approve';
  }

  if (status === 'rejected') {
    return 'reject';
  }

  return null;
}

async function updateSignupRequest(
  repositoryClient: ApprovalRepositoryClient,
  signupRequestId: string,
  payload: Record<string, unknown>,
) {
  const { error } = await repositoryClient
    .from('signup_requests')
    .update(payload)
    .eq('id', signupRequestId);

  if (error) {
    throw new ApprovalDecisionError('INTERNAL_ERROR', error.message, 500);
  }
}

async function insertApprovalLog(
  repositoryClient: ApprovalRepositoryClient,
  payload: Record<string, unknown>,
) {
  const { error } = await repositoryClient.from('approval_logs').insert(payload);

  if (error) {
    throw new ApprovalDecisionError('INTERNAL_ERROR', error.message, 500);
  }
}

export async function decideApprovalRequest(
  repositoryClient: ApprovalRepositoryClient,
  auth: ApprovalDecisionAuthContext,
  rawInput: ApprovalDecisionRequest,
): Promise<ApprovalDecisionSuccessData> {
  const input = normalizeDecisionInput(rawInput);

  if (auth.actorGlobalRole !== 'super' || auth.actorAccountStatus !== 'active') {
    throw new ApprovalDecisionError('PERMISSION_DENIED', 'Only active superusers can decide approvals.', 403);
  }

  const requestRow = await loadSignupRequest(repositoryClient, input.signupRequestId);
  const replayDecision = resolveReplayDecision(requestRow.status);
  if (replayDecision) {
    if (replayDecision !== input.decision) {
      throw new ApprovalDecisionError('INVALID_TRANSITION', 'Request already processed.', 409, {
        currentStatus: requestRow.status,
      });
    }

    const membership = replayDecision === 'approve'
      ? await loadApprovedMembership(
          repositoryClient,
          requestRow.organization_id,
          requestRow.requester_user_id,
        )
      : null;

    return {
      signupRequestId: requestRow.id,
      decision: input.decision,
      requestStatus: replayDecision === 'approve' ? 'approved' : 'rejected',
      membershipStatus: membership ? 'approved' : 'none',
      organizationId: requestRow.organization_id,
      membershipId: membership?.id ?? null,
      decidedAt: requestRow.reviewed_at ?? new Date().toISOString(),
      alreadyProcessed: true,
    };
  }

  if (requestRow.status !== 'pending') {
    throw new ApprovalDecisionError('INVALID_TRANSITION', 'Only pending requests can be decided.', 409, {
      currentStatus: requestRow.status,
    });
  }

  const decidedAt = new Date().toISOString();

  await updateSignupRequest(repositoryClient, requestRow.id, {
    status: input.decision === 'approve' ? 'approved' : 'rejected',
    reviewed_by: auth.actorUserId,
    reviewed_at: decidedAt,
    review_note: input.reviewNote ?? null,
  });

  let membershipId: string | null = null;
  let membershipStatus: 'approved' | 'none' = 'none';

  if (input.decision === 'approve') {
    if (!requestRow.organization_id || !requestRow.requester_user_id) {
      throw new ApprovalDecisionError(
        'VALIDATION_ERROR',
        'Approved admin request requires organization and requester identity.',
        400,
      );
    }

    const { data, error }: QueryResult<MembershipRow[] | MembershipRow> = await repositoryClient
      .from('organization_memberships')
      .upsert(
        {
          organization_id: requestRow.organization_id,
          user_id: requestRow.requester_user_id,
          role: 'admin',
          status: 'approved',
          approved_by: auth.actorUserId,
          approved_at: decidedAt,
          rejection_reason: null,
        },
        {
          onConflict: 'organization_id,user_id',
        },
      );

    if (error) {
      throw new ApprovalDecisionError('INTERNAL_ERROR', error.message, 500);
    }

    const membershipRow = Array.isArray(data) ? data[0] : data;
    membershipId = membershipRow?.id ?? null;
    membershipStatus = 'approved';
  }

  await insertApprovalLog(repositoryClient, {
    signup_request_id: requestRow.id,
    membership_id: membershipId,
    action: input.decision,
    actor_user_id: auth.actorUserId,
    target_user_id: requestRow.requester_user_id,
    organization_id: requestRow.organization_id,
    reason: input.reviewNote ?? null,
    metadata: {
      requested_role: 'admin',
      decision: input.decision,
    },
    created_at: decidedAt,
  });

  return {
    signupRequestId: requestRow.id,
    decision: input.decision,
    requestStatus: input.decision === 'approve' ? 'approved' : 'rejected',
    membershipStatus,
    organizationId: requestRow.organization_id,
    membershipId,
    decidedAt,
    alreadyProcessed: false,
  };
}

export async function resolveApprovalAuthContext(
  authClient: ApprovalAuthClient,
  repositoryClient: ApprovalRepositoryClient,
  request: Request,
): Promise<ApprovalDecisionAuthContext> {
  const token = parseAuthorization(request);
  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data.user || typeof data.user.id !== 'string' || data.user.id.length === 0) {
    throw new ApprovalDecisionError('PERMISSION_DENIED', 'Unable to verify the authenticated user.', 401);
  }

  const { data: profile, error: profileError }: QueryResult<{
    global_role: string | null;
    account_status: string | null;
  }> = await repositoryClient
    .from('profiles')
    .select('global_role, account_status')
    .eq('id', data.user.id)
    .limit(1)
    .maybeSingle();

  if (profileError) {
    throw new ApprovalDecisionError('INTERNAL_ERROR', profileError.message, 500);
  }

  return {
    actorUserId: data.user.id,
    actorGlobalRole: profile?.global_role?.trim() ?? '',
    actorAccountStatus: profile?.account_status?.trim() ?? '',
  };
}
