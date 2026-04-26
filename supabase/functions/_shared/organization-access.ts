export type OrganizationAccessGlobalRole = 'super' | 'admin' | 'user';
export type OrganizationAccessAccountStatus =
  | 'active'
  | 'pending'
  | 'rejected'
  | 'suspended'
  | 'withdrawn';
export type OrganizationAccessRole = 'admin' | 'user';

interface SharedAuthUser {
  id?: unknown;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
}

interface SharedGetUserResult {
  data: {
    user: SharedAuthUser | null;
  };
  error: {
    message: string;
  } | null;
}

interface ProfileRow {
  global_role: string | null;
  account_status: string | null;
}

interface MembershipRow {
  organization_id: string | null;
  role: string | null;
  status: string | null;
}

interface MaybeSingleBuilder<T> {
  eq(column: string, value: string): MaybeSingleBuilder<T>;
  limit(count: number): MaybeSingleBuilder<T>;
  maybeSingle(): Promise<{
    data: T | null;
    error: { message: string } | null;
  }>;
}

export interface SharedAuthClient {
  auth: {
    getUser(token: string): Promise<SharedGetUserResult>;
  };
}

export interface SharedAccessRepositoryClient {
  from(table: 'profiles'): {
    select(columns: string): MaybeSingleBuilder<ProfileRow>;
  };
  from(table: 'organization_memberships'): {
    select(columns: string): MaybeSingleBuilder<MembershipRow>;
  };
}

export interface OrganizationAccessContext {
  userId: string;
  globalRole: OrganizationAccessGlobalRole;
  accountStatus: OrganizationAccessAccountStatus;
  organizationId: string;
  organizationRole: OrganizationAccessRole | null;
  isSuper: boolean;
  appMetadata: Record<string, unknown> | null;
  userMetadata: Record<string, unknown> | null;
}

export class OrganizationAccessError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'OrganizationAccessError';
    this.code = code;
    this.status = status;
  }
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function asMetadataRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readBearerToken(request: Request): string {
  const headerValue = request.headers.get('authorization') ?? request.headers.get('Authorization');

  if (!headerValue) {
    throw new OrganizationAccessError(
      'unauthorized',
      'Authorization bearer token is required',
      401
    );
  }

  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (!token) {
    throw new OrganizationAccessError(
      'unauthorized',
      'Authorization bearer token is required',
      401
    );
  }

  return token;
}

function readOrganizationHeader(request: Request): string {
  const organizationId = request.headers.get('X-Organization-Id')?.trim() ?? '';

  if (!organizationId || !isValidUuid(organizationId)) {
    throw new OrganizationAccessError(
      'organization_context_missing',
      'X-Organization-Id header is required for org-scoped access',
      403
    );
  }

  return organizationId;
}

function normalizeGlobalRole(value: string | null | undefined): OrganizationAccessGlobalRole {
  switch (value?.trim().toLowerCase()) {
    case 'super':
      return 'super';
    case 'admin':
      return 'admin';
    default:
      return 'user';
  }
}

function normalizeAccountStatus(value: string | null | undefined): OrganizationAccessAccountStatus {
  switch (value?.trim().toLowerCase()) {
    case 'active':
      return 'active';
    case 'rejected':
      return 'rejected';
    case 'suspended':
      return 'suspended';
    case 'withdrawn':
      return 'withdrawn';
    case 'pending':
    default:
      return 'pending';
  }
}

function normalizeOrganizationRole(value: string | null | undefined): OrganizationAccessRole | null {
  switch (value?.trim().toLowerCase()) {
    case 'admin':
      return 'admin';
    case 'user':
      return 'user';
    default:
      return null;
  }
}

async function requireAuthenticatedUser(
  authClient: SharedAuthClient,
  token: string
): Promise<SharedAuthUser & { id: string }> {
  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data.user || typeof data.user.id !== 'string' || data.user.id.length === 0) {
    throw new OrganizationAccessError(
      'unauthorized',
      'Unable to verify the authenticated user',
      401
    );
  }

  return data.user as SharedAuthUser & { id: string };
}

async function loadProfile(
  repositoryClient: SharedAccessRepositoryClient,
  userId: string
): Promise<ProfileRow> {
  const { data, error } = await repositoryClient
    .from('profiles')
    .select('global_role, account_status')
    .eq('id', userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new OrganizationAccessError('internal_error', error.message, 500);
  }

  if (!data) {
    throw new OrganizationAccessError(
      'organization_access_denied',
      'Authenticated user profile could not be found',
      403
    );
  }

  return data;
}

async function loadApprovedMembership(
  repositoryClient: SharedAccessRepositoryClient,
  userId: string,
  organizationId: string
): Promise<MembershipRow | null> {
  const { data, error } = await repositoryClient
    .from('organization_memberships')
    .select('organization_id, role, status')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .eq('status', 'approved')
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new OrganizationAccessError('internal_error', error.message, 500);
  }

  return data;
}

export async function resolveOrganizationAccessContext(
  authClient: SharedAuthClient,
  repositoryClient: SharedAccessRepositoryClient,
  request: Request
): Promise<OrganizationAccessContext> {
  const token = readBearerToken(request);
  const organizationId = readOrganizationHeader(request);
  const user = await requireAuthenticatedUser(authClient, token);
  const profile = await loadProfile(repositoryClient, user.id);
  const globalRole = normalizeGlobalRole(profile.global_role);
  const accountStatus = normalizeAccountStatus(profile.account_status);

  if (accountStatus !== 'active') {
    throw new OrganizationAccessError(
      'organization_access_denied',
      'Authenticated user is not active for the requested organization',
      403
    );
  }

  if (globalRole === 'super') {
    return {
      userId: user.id,
      globalRole,
      accountStatus,
      organizationId,
      organizationRole: null,
      isSuper: true,
      appMetadata: asMetadataRecord(user.app_metadata),
      userMetadata: asMetadataRecord(user.user_metadata),
    };
  }

  const membership = await loadApprovedMembership(repositoryClient, user.id, organizationId);
  const organizationRole = normalizeOrganizationRole(membership?.role);

  if (!membership || !organizationRole) {
    throw new OrganizationAccessError(
      'organization_access_denied',
      'Authenticated user cannot access this organization',
      403
    );
  }

  return {
    userId: user.id,
    globalRole,
    accountStatus,
    organizationId,
    organizationRole,
    isSuper: false,
    appMetadata: asMetadataRecord(user.app_metadata),
    userMetadata: asMetadataRecord(user.user_metadata),
  };
}
