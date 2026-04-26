import { ContractError } from './contracts.ts';
import {
  OrganizationAccessError,
  resolveOrganizationAccessContext,
  type SharedAccessRepositoryClient,
  type SharedAuthClient,
} from '../_shared/organization-access.ts';

export type Phase2OpsAuthClient = SharedAuthClient;
export type Phase2OpsAuthRepositoryClient = SharedAccessRepositoryClient;

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

function toContractError(error: unknown): never {
  if (error instanceof OrganizationAccessError) {
    throw new ContractError(error.code, error.message, error.status);
  }

  throw error;
}

function mapPhase2OpsAuthContext(access: Awaited<ReturnType<typeof resolveOrganizationAccessContext>>)
: Phase2OpsOperatorAuthContext {
  return {
    operatorUserId: access.userId,
    operatorOrganizationId: access.organizationId,
    operatorGlobalRole: access.globalRole,
    operatorRole: access.organizationRole,
    operatorStatus: access.organizationRole ? 'active' : null,
    operatorAccountStatus: access.accountStatus,
    operatorAppMetadata: access.appMetadata,
    operatorUserMetadata: access.userMetadata,
  };
}

function assertOrgAdminOrSuper(
  access: Awaited<ReturnType<typeof resolveOrganizationAccessContext>>,
  message: string
): void {
  if (access.isSuper || access.organizationRole === 'admin') {
    return;
  }

  throw new ContractError('organization_access_denied', message, 403);
}

export async function resolvePhase2OpsAuthContext(
  authClient: Phase2OpsAuthClient,
  repositoryClient: Phase2OpsAuthRepositoryClient,
  request: Request
): Promise<Phase2OpsOperatorAuthContext> {
  try {
    const access = await resolveOrganizationAccessContext(authClient, repositoryClient, request);
    assertOrgAdminOrSuper(access, 'Authenticated user is not authorized for phase2 ops');
    return mapPhase2OpsAuthContext(access);
  } catch (error: unknown) {
    toContractError(error);
  }
}

export async function resolveOperatorAuthContext(
  authClient: Phase2OpsAuthClient,
  repositoryClient: Phase2OpsAuthRepositoryClient,
  request: Request
): Promise<Phase2OpsOperatorAuthContext> {
  try {
    const access = await resolveOrganizationAccessContext(authClient, repositoryClient, request);
    assertOrgAdminOrSuper(
      access,
      'Authenticated user is not authorized to bootstrap pilot admins'
    );
    return mapPhase2OpsAuthContext(access);
  } catch (error: unknown) {
    toContractError(error);
  }
}
