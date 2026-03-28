import { ContractError, isValidUuid, type Phase2ScheduleAuthContext } from './contracts.ts';

interface Phase2ScheduleAuthUser {
  id?: unknown;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
}

interface Phase2ScheduleGetUserResult {
  data: {
    user: Phase2ScheduleAuthUser | null;
  };
  error: {
    message: string;
  } | null;
}

export interface Phase2ScheduleAuthClient {
  auth: {
    getUser(token: string): Promise<Phase2ScheduleGetUserResult>;
  };
}

function asMetadataRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readOrganizationId(user: Phase2ScheduleAuthUser): string | null {
  const appMetadata = asMetadataRecord(user.app_metadata);
  const userMetadata = asMetadataRecord(user.user_metadata);

  const candidates = [
    appMetadata.organization_id,
    userMetadata.organization_id,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && isValidUuid(candidate)) {
      return candidate;
    }
  }

  return null;
}

function readBearerToken(request: Request): string {
  const headerValue = request.headers.get('authorization') ?? request.headers.get('Authorization');

  if (!headerValue) {
    throw new ContractError('unauthorized', 'Authorization bearer token is required', 401);
  }

  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (!token) {
    throw new ContractError('unauthorized', 'Authorization bearer token is required', 401);
  }

  return token;
}

export async function resolveAuthContext(
  authClient: Phase2ScheduleAuthClient,
  request: Request
): Promise<Phase2ScheduleAuthContext> {
  const token = readBearerToken(request);
  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data.user || typeof data.user.id !== 'string' || data.user.id.length === 0) {
    throw new ContractError('unauthorized', 'Unable to verify the authenticated user', 401);
  }

  const organizationId = readOrganizationId(data.user);

  if (!organizationId) {
    throw new ContractError(
      'organization_context_missing',
      'Authenticated user is missing a valid organization_id claim',
      403
    );
  }

  return {
    userId: data.user.id,
    organizationId,
  };
}
