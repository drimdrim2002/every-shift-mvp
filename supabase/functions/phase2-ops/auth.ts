import { ContractError, parseOperatorAuthorization } from './contracts.ts';

interface Phase2OpsAuthUser {
  id?: unknown;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
}

interface Phase2OpsGetUserResult {
  data: {
    user: Phase2OpsAuthUser | null;
  };
  error: {
    message: string;
  } | null;
}

interface OperatorProfileRow {
  global_role: string | null;
  role: string | null;
  status: string | null;
  account_status: string | null;
  organization_id: string | null;
}

interface OrganizationMembershipRow {
  organization_id: string | null;
  role: string | null;
  status: string | null;
}

export interface Phase2OpsAuthClient {
  auth: {
    getUser(token: string): Promise<Phase2OpsGetUserResult>;
  };
}

export interface Phase2OpsAuthRepositoryClient {
  from(table: 'profiles'): {
    select(columns: string): {
      eq(column: string, value: string): {
        limit(count: number): {
          maybeSingle(): Promise<{
            data: OperatorProfileRow | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };
  from(table: 'organization_memberships'): {
    select(columns: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): {
          limit(count: number): {
            maybeSingle(): Promise<{
              data: OrganizationMembershipRow | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };
  };
}

export interface Phase2OpsOperatorAuthContext {
  operatorUserId: string;
  operatorOrganizationId: string | null;
  operatorGlobalRole: string;
  operatorRole?: string | null;
  operatorStatus?: string | null;
  operatorAccountStatus?: string | null;
  operatorAppMetadata?: Record<string, unknown> | null;
  operatorUserMetadata?: Record<string, unknown> | null;
}

async function resolveAuthenticatedProfileContext(
  authClient: Phase2OpsAuthClient,
  repositoryClient: Phase2OpsAuthRepositoryClient,
  request: Request
): Promise<Phase2OpsOperatorAuthContext> {
  const token = parseOperatorAuthorization(request);
  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data.user || typeof data.user.id !== 'string' || data.user.id.length === 0) {
    throw new ContractError('unauthorized', 'Unable to verify the authenticated user', 401);
  }

  const { data: profile, error: profileError } = await repositoryClient
    .from('profiles')
    .select('global_role, role, status, account_status, organization_id')
    .eq('id', data.user.id)
    .limit(1)
    .maybeSingle();

  if (profileError) {
    throw new ContractError('internal_error', profileError.message, 500);
  }

  const globalRole = profile?.global_role?.trim() ?? '';
  const role = profile?.role?.trim() ?? '';
  const status = profile?.status?.trim() ?? '';
  const accountStatus = profile?.account_status?.trim() ?? '';

  if (!profile || accountStatus !== 'active') {
    throw new ContractError(
      'organization_access_denied',
      'Authenticated user is not active for phase2 ops',
      403
    );
  }

  let organizationId = profile.organization_id;
  let resolvedRole = role || null;
  let resolvedStatus = status || null;

  if (!organizationId) {
    const { data: membership, error: membershipError } = await repositoryClient
      .from('organization_memberships')
      .select('organization_id, role, status')
      .eq('user_id', data.user.id)
      .eq('status', 'approved')
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      throw new ContractError('internal_error', membershipError.message, 500);
    }

    if (membership?.organization_id) {
      organizationId = membership.organization_id;
      resolvedRole = resolvedRole ?? membership.role?.trim() ?? null;
      resolvedStatus = resolvedStatus ?? 'active';
    }
  }

  return {
    operatorUserId: data.user.id,
    operatorOrganizationId: organizationId,
    operatorGlobalRole: globalRole,
    operatorRole: resolvedRole,
    operatorStatus: resolvedStatus,
    operatorAccountStatus: accountStatus || null,
    operatorAppMetadata:
      typeof data.user.app_metadata === 'object'
      && data.user.app_metadata !== null
      && !Array.isArray(data.user.app_metadata)
        ? data.user.app_metadata
        : null,
    operatorUserMetadata:
      typeof data.user.user_metadata === 'object'
      && data.user.user_metadata !== null
      && !Array.isArray(data.user.user_metadata)
        ? data.user.user_metadata
        : null,
  };
}

export async function resolvePhase2OpsAuthContext(
  authClient: Phase2OpsAuthClient,
  repositoryClient: Phase2OpsAuthRepositoryClient,
  request: Request
): Promise<Phase2OpsOperatorAuthContext> {
  return resolveAuthenticatedProfileContext(authClient, repositoryClient, request);
}

export async function resolveOperatorAuthContext(
  authClient: Phase2OpsAuthClient,
  repositoryClient: Phase2OpsAuthRepositoryClient,
  request: Request
): Promise<Phase2OpsOperatorAuthContext> {
  const auth = await resolveAuthenticatedProfileContext(authClient, repositoryClient, request);

  if (!['super', 'admin'].includes(auth.operatorGlobalRole)) {
    throw new ContractError(
      'organization_access_denied',
      'Authenticated user is not authorized to bootstrap pilot admins',
      403
    );
  }

  return auth;
}
