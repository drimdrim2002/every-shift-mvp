import type {
  ApprovalDecisionAuthContext,
  ApprovalErrorCode,
} from '../approval-decision/service.ts';

export class ApprovalReadError extends Error {
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
    this.name = 'ApprovalReadError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface SignupRequestRow {
  id: string;
  requester_user_id: string | null;
  organization_id: string | null;
  requested_role: 'admin';
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'withdrawn';
  work_type: string | null;
  shift_type: string | null;
  requested_site_name: string | null;
  requested_skill_summary: string | null;
  requested_rank_code: string | null;
  requested_credit: number | null;
  review_note: string | null;
  created_at: string;
}

interface ProfileLookupRow {
  id: string;
  display_name: string | null;
}

interface OrganizationLookupRow {
  id: string;
  name: string | null;
}

interface QueryError {
  message: string;
}

interface QueryResult<T> {
  data: T | null;
  error: QueryError | null;
}

interface SignupRequestListQuery {
  eq(column: string, value: string): SignupRequestListQuery;
  order(column: string, options: { ascending: boolean }): SignupRequestListQuery;
  ilike(column: string, value: string): SignupRequestListQuery;
  returns<T>(): Promise<QueryResult<T>>;
}

interface SignupRequestDetailQuery {
  eq(column: string, value: string): SignupRequestDetailQuery;
  maybeSingle<T>(): Promise<QueryResult<T>>;
}

interface LookupQuery {
  in(column: string, values: string[]): LookupQuery;
  returns<T>(): Promise<QueryResult<T>>;
}

export interface ApprovalReadRepositoryClient {
  from(table: 'signup_requests'): {
    select(columns: string): SignupRequestListQuery & SignupRequestDetailQuery;
  };
  from(table: 'profiles'): {
    select(columns: string): LookupQuery;
  };
  from(table: 'organizations'): {
    select(columns: string): LookupQuery;
  };
}

function mapQueueItem(
  row: SignupRequestRow,
  lookups: {
    requesterNames: Map<string, string>;
    organizationNames: Map<string, string>;
  },
) {
  return {
    signupRequestId: row.id,
    requesterUserId: row.requester_user_id,
    requesterEmail: null,
    requesterName: row.requester_user_id ? lookups.requesterNames.get(row.requester_user_id) ?? null : null,
    organizationId: row.organization_id,
    organizationName: row.organization_id ? lookups.organizationNames.get(row.organization_id) ?? null : null,
    requestedRole: row.requested_role,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapQueueDetail(
  row: SignupRequestRow,
  lookups: {
    requesterNames: Map<string, string>;
    organizationNames: Map<string, string>;
  },
) {
  return {
    ...mapQueueItem(row, lookups),
    workType: row.work_type,
    shiftType: row.shift_type,
    requestedSiteName: row.requested_site_name,
    requestedSkillSummary: row.requested_skill_summary,
    requestedRankCode: row.requested_rank_code,
    requestedCredit: row.requested_credit,
    reviewNote: row.review_note,
  };
}

function uniqueIds(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0))];
}

async function loadRequesterNames(
  repositoryClient: ApprovalReadRepositoryClient,
  requesterUserIds: string[],
): Promise<Map<string, string>> {
  if (requesterUserIds.length === 0) {
    return new Map();
  }

  const { data, error } = await repositoryClient
    .from('profiles')
    .select('id, display_name')
    .in('id', requesterUserIds)
    .returns<ProfileLookupRow[]>();

  if (error) {
    throw new ApprovalReadError('INTERNAL_ERROR', error.message, 500);
  }

  return new Map(
    (data ?? [])
      .filter((row) => typeof row.display_name === 'string' && row.display_name.trim().length > 0)
      .map((row) => [row.id, row.display_name!.trim()]),
  );
}

async function loadOrganizationNames(
  repositoryClient: ApprovalReadRepositoryClient,
  organizationIds: string[],
): Promise<Map<string, string>> {
  if (organizationIds.length === 0) {
    return new Map();
  }

  const { data, error } = await repositoryClient
    .from('organizations')
    .select('id, name')
    .in('id', organizationIds)
    .returns<OrganizationLookupRow[]>();

  if (error) {
    throw new ApprovalReadError('INTERNAL_ERROR', error.message, 500);
  }

  return new Map(
    (data ?? [])
      .filter((row) => typeof row.name === 'string' && row.name.trim().length > 0)
      .map((row) => [row.id, row.name!.trim()]),
  );
}

async function loadApprovalLookups(
  repositoryClient: ApprovalReadRepositoryClient,
  rows: SignupRequestRow[],
) {
  const requesterUserIds = uniqueIds(rows.map((row) => row.requester_user_id));
  const organizationIds = uniqueIds(rows.map((row) => row.organization_id));

  const [requesterNames, organizationNames] = await Promise.all([
    loadRequesterNames(repositoryClient, requesterUserIds),
    loadOrganizationNames(repositoryClient, organizationIds),
  ]);

  return {
    requesterNames,
    organizationNames,
  };
}

export function assertApprovalReadAccess(auth: ApprovalDecisionAuthContext): void {
  if (auth.actorGlobalRole !== 'super' || auth.actorAccountStatus !== 'active') {
    throw new ApprovalReadError('PERMISSION_DENIED', 'Only active superusers can read approvals.', 403);
  }
}

export async function listApprovalQueueRequests(
  repositoryClient: ApprovalReadRepositoryClient,
  auth: ApprovalDecisionAuthContext,
  filters: {
    status?: string | null;
    organizationId?: string | null;
    keyword?: string | null;
  } = {},
) {
  assertApprovalReadAccess(auth);

  let query = repositoryClient
    .from('signup_requests')
    .select(
      'id, requester_user_id, organization_id, requested_role, status, work_type, shift_type, requested_site_name, requested_skill_summary, requested_rank_code, requested_credit, review_note, created_at',
    )
    .eq('requested_role', 'admin')
    .order('created_at', { ascending: false });

  if (filters.status?.trim()) {
    query = query.eq('status', filters.status.trim());
  }

  if (filters.organizationId?.trim()) {
    query = query.eq('organization_id', filters.organizationId.trim());
  }

  if (filters.keyword?.trim()) {
    query = query.ilike('requested_site_name', `%${filters.keyword.trim()}%`);
  }

  const { data, error } = await query.returns<SignupRequestRow[]>();
  if (error) {
    throw new ApprovalReadError('INTERNAL_ERROR', error.message, 500);
  }

  const rows = data ?? [];
  const lookups = await loadApprovalLookups(repositoryClient, rows);

  return {
    items: rows.map((row) => mapQueueItem(row, lookups)),
  };
}

export async function loadApprovalRequestDetail(
  repositoryClient: ApprovalReadRepositoryClient,
  auth: ApprovalDecisionAuthContext,
  signupRequestId: string,
) {
  assertApprovalReadAccess(auth);

  const trimmedSignupRequestId = signupRequestId.trim();
  if (!trimmedSignupRequestId) {
    throw new ApprovalReadError('VALIDATION_ERROR', 'signupRequestId is required.', 400);
  }

  const { data, error } = await repositoryClient
    .from('signup_requests')
    .select(
      'id, requester_user_id, organization_id, requested_role, status, work_type, shift_type, requested_site_name, requested_skill_summary, requested_rank_code, requested_credit, review_note, created_at',
    )
    .eq('id', trimmedSignupRequestId)
    .eq('requested_role', 'admin')
    .maybeSingle<SignupRequestRow>();

  if (error) {
    throw new ApprovalReadError('INTERNAL_ERROR', error.message, 500);
  }

  const row = data ?? null;
  const lookups = await loadApprovalLookups(repositoryClient, row ? [row] : []);

  return {
    request: row ? mapQueueDetail(row, lookups) : null,
  };
}
