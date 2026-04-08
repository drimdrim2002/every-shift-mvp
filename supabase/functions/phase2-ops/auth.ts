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
  account_status: string | null;
  organization_id: string | null;
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
}

export interface Phase2OpsOperatorAuthContext {
  operatorUserId: string;
  operatorOrganizationId: string | null;
  operatorGlobalRole: string;
}

export async function resolveOperatorAuthContext(
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
    .select('global_role, account_status, organization_id')
    .eq('id', data.user.id)
    .limit(1)
    .maybeSingle();

  if (profileError) {
    throw new ContractError('internal_error', profileError.message, 500);
  }

  const globalRole = profile?.global_role?.trim() ?? '';
  const accountStatus = profile?.account_status?.trim() ?? '';

  if (!profile || !['super', 'admin'].includes(globalRole) || accountStatus !== 'active') {
    throw new ContractError(
      'organization_access_denied',
      'Authenticated user is not authorized to bootstrap pilot admins',
      403
    );
  }

  return {
    operatorUserId: data.user.id,
    operatorOrganizationId: profile.organization_id,
    operatorGlobalRole: globalRole,
  };
}
