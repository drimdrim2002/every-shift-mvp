import {
  ContractError,
  type BootstrapAdminRequest,
  type BootstrapAdminResponse,
} from './contracts.ts';
import {
  emitPhase2OpsEvent,
  type Phase2OpsEventName,
} from './observability.ts';
import type { Phase2OpsOperatorAuthContext } from './auth.ts';

interface Phase2OpsDbError {
  message: string;
}

interface TargetAuthUser {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
}

interface ListUsersResult {
  data: {
    users: TargetAuthUser[];
  };
  error: Phase2OpsDbError | null;
}

interface UpdateUserResult {
  data: {
    user: TargetAuthUser | null;
  } | null;
  error: Phase2OpsDbError | null;
}

interface QueryResult<T> {
  data: T | null;
  error: Phase2OpsDbError | null;
}

interface ProfileRow {
  id: string;
  organization_id: string | null;
  role: string | null;
  display_name: string | null;
  status: string | null;
}

interface OnboardingProgressRow {
  id: string;
  organization_id: string;
  current_step: number;
  current_step_key: string | null;
  organization_info_confirmed_at?: string | null;
  organization_info_confirmed_by?: string | null;
}

type TableName = 'profiles' | 'onboarding_progress';

export interface Phase2OpsRepositoryClient {
  auth: {
    admin: {
      listUsers(params?: { page?: number; perPage?: number }): Promise<ListUsersResult>;
      updateUserById(
        userId: string,
        attributes: {
          app_metadata?: Record<string, unknown>;
          user_metadata?: Record<string, unknown>;
        }
      ): Promise<UpdateUserResult>;
    };
  };
  from(table: TableName): {
    select(columns: string): {
      eq(column: string, value: string): {
        limit(count: number): {
          maybeSingle(): Promise<QueryResult<Record<string, unknown>>>;
        };
      };
    };
    insert(payload: Record<string, unknown>): Promise<QueryResult<null>>;
    update(payload: Record<string, unknown>): {
      eq(column: string, value: string): Promise<QueryResult<null>>;
    };
  };
}

export type Phase2OpsEventEmitter = (
  event: Phase2OpsEventName,
  payload: Record<string, unknown>
) => void;

const AUTH_USER_LOOKUP_PAGE_SIZE = 200;
const AUTH_USER_LOOKUP_MAX_PAGES = 1000;
const INITIAL_FOUNDATION_STEP_KEY = 'organization_info';
const ORGANIZATION_METADATA_KEYS = [
  'organization_id',
  'organizationId',
  'current_organization_id',
  'currentOrganizationId',
] as const;

interface FoundationMetadata {
  current_step_key: string | null;
  organization_info_confirmed_at: string | null;
  organization_info_confirmed_by: string | null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readStringValue(metadata: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function readFoundationMetadataFromRecord(metadata: Record<string, unknown>): FoundationMetadata | null {
  const foundationRoot =
    typeof metadata.foundation === 'object' && metadata.foundation !== null && !Array.isArray(metadata.foundation)
      ? asRecord(metadata.foundation)
      : metadata;
  const currentStepKey = readStringValue(foundationRoot, [
    'current_step_key',
    'currentStepKey',
    'onboarding_step_key',
    'onboardingStepKey',
  ]);
  const organizationInfoConfirmedAt = readStringValue(foundationRoot, [
    'organization_info_confirmed_at',
    'organizationInfoConfirmedAt',
  ]);
  const organizationInfoConfirmedBy = readStringValue(foundationRoot, [
    'organization_info_confirmed_by',
    'organizationInfoConfirmedBy',
  ]);

  if (!currentStepKey && !organizationInfoConfirmedAt && !organizationInfoConfirmedBy) {
    return null;
  }

  return {
    current_step_key: currentStepKey,
    organization_info_confirmed_at: organizationInfoConfirmedAt,
    organization_info_confirmed_by: organizationInfoConfirmedBy,
  };
}

function readFoundationMetadata(user: TargetAuthUser): FoundationMetadata | null {
  return (
    readFoundationMetadataFromRecord(asRecord(user.app_metadata))
    ?? readFoundationMetadataFromRecord(asRecord(user.user_metadata))
  );
}

function buildFoundationMetadata(
  user: TargetAuthUser,
  onboardingProgress: OnboardingProgressRow | null
): FoundationMetadata {
  const existing = readFoundationMetadata(user);

  return {
    current_step_key:
      existing?.current_step_key ?? onboardingProgress?.current_step_key ?? INITIAL_FOUNDATION_STEP_KEY,
    organization_info_confirmed_at:
      existing?.organization_info_confirmed_at
      ?? onboardingProgress?.organization_info_confirmed_at
      ?? null,
    organization_info_confirmed_by:
      existing?.organization_info_confirmed_by
      ?? onboardingProgress?.organization_info_confirmed_by
      ?? null,
  };
}

function buildProfilePayload(
  targetUserId: string,
  request: BootstrapAdminRequest
): Record<string, unknown> {
  return {
    id: targetUserId,
    organization_id: request.organizationId,
    role: 'admin',
    display_name: request.displayName,
    status: 'active',
    global_role: 'user',
    account_status: 'active',
  };
}

function buildProfileUpdatePayload(request: BootstrapAdminRequest): Record<string, unknown> {
  return {
    organization_id: request.organizationId,
    role: 'admin',
    display_name: request.displayName,
    status: 'active',
    global_role: 'user',
    account_status: 'active',
  };
}

function isDuplicateConflict(error: Phase2OpsDbError | null): boolean {
  if (!error) {
    return false;
  }

  return /duplicate|already exists|unique constraint|23505/i.test(error.message);
}

function assertBootstrapOrganizationAccess(
  auth: Phase2OpsOperatorAuthContext,
  organizationId: string
): void {
  if (auth.operatorGlobalRole === 'super') {
    return;
  }

  if (
    auth.operatorGlobalRole === 'admin' &&
    auth.operatorOrganizationId &&
    auth.operatorOrganizationId === organizationId
  ) {
    return;
  }

  throw new ContractError(
    'organization_access_denied',
    'Authenticated user is not authorized for the requested organization',
    403
  );
}

function needsMetadataAlignment(user: TargetAuthUser, organizationId: string): boolean {
  const appMetadata = asRecord(user.app_metadata);
  const foundation = readFoundationMetadata(user);

  return (
    ORGANIZATION_METADATA_KEYS.some((key) => appMetadata[key] !== organizationId)
    || foundation === null
  );
}

async function findTargetAuthUserByEmail(
  client: Phase2OpsRepositoryClient,
  email: string
): Promise<TargetAuthUser> {
  const targetEmail = email.trim().toLowerCase();

  for (let page = 1; page <= AUTH_USER_LOOKUP_MAX_PAGES; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: AUTH_USER_LOOKUP_PAGE_SIZE,
    });

    if (error) {
      throw new ContractError('internal_error', error.message, 500);
    }

    const users = data.users;
    const user = users.find((candidate) => candidate.email?.trim().toLowerCase() === targetEmail);

    if (user) {
      return user;
    }

    if (users.length < AUTH_USER_LOOKUP_PAGE_SIZE) {
      break;
    }
  }

  throw new ContractError('not_found', 'Target auth user not found for the requested email', 404);
}

async function loadProfile(
  client: Phase2OpsRepositoryClient,
  userId: string
): Promise<ProfileRow | null> {
  const { data, error } = await client
    .from('profiles')
    .select('id, organization_id, role, display_name, status')
    .eq('id', userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new ContractError('internal_error', error.message, 500);
  }

  return (data as ProfileRow | null) ?? null;
}

async function loadOnboardingProgress(
  client: Phase2OpsRepositoryClient,
  organizationId: string
): Promise<OnboardingProgressRow | null> {
  const { data, error } = await client
    .from('onboarding_progress')
    .select(
      'id, organization_id, current_step, current_step_key, organization_info_confirmed_at, organization_info_confirmed_by'
    )
    .eq('organization_id', organizationId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new ContractError('internal_error', error.message, 500);
  }

  return (data as OnboardingProgressRow | null) ?? null;
}

async function syncProfile(
  client: Phase2OpsRepositoryClient,
  targetUserId: string,
  request: BootstrapAdminRequest
): Promise<void> {
  const existingProfile = await loadProfile(client, targetUserId);

  if (existingProfile) {
    const { error } = await client
      .from('profiles')
      .update(buildProfileUpdatePayload(request))
      .eq('id', targetUserId);

    if (error) {
      throw new ContractError('internal_error', error.message, 500);
    }

    return;
  }

  const { error } = await client.from('profiles').insert(buildProfilePayload(targetUserId, request));

  if (!error) {
    return;
  }

  if (isDuplicateConflict(error)) {
    const { error: updateError } = await client
      .from('profiles')
      .update(buildProfileUpdatePayload(request))
      .eq('id', targetUserId);

    if (!updateError) {
      return;
    }

    throw new ContractError('internal_error', updateError.message, 500);
  }

  if (error) {
    throw new ContractError('internal_error', error.message, 500);
  }
}

async function ensureOnboardingProgress(
  client: Phase2OpsRepositoryClient,
  auth: Phase2OpsOperatorAuthContext,
  organizationId: string
): Promise<OnboardingProgressRow> {
  const existingProgress = await loadOnboardingProgress(client, organizationId);

  if (existingProgress) {
    return existingProgress;
  }

  const { error } = await client.from('onboarding_progress').insert({
    organization_id: organizationId,
    current_step: 1,
    current_step_key: INITIAL_FOUNDATION_STEP_KEY,
    last_actor_user_id: auth.operatorUserId,
  });

  if (!error) {
    const createdProgress = await loadOnboardingProgress(client, organizationId);
    if (createdProgress) {
      return createdProgress;
    }

    return {
      id: '',
      organization_id: organizationId,
      current_step: 1,
      current_step_key: INITIAL_FOUNDATION_STEP_KEY,
      organization_info_confirmed_at: null,
      organization_info_confirmed_by: null,
    };
  }

  if (isDuplicateConflict(error)) {
    const convergedProgress = await loadOnboardingProgress(client, organizationId);
    if (convergedProgress) {
      return convergedProgress;
    }
  }

  throw new ContractError('internal_error', error.message, 500);
}

async function alignAuthMetadata(
  client: Phase2OpsRepositoryClient,
  targetUser: TargetAuthUser,
  organizationId: string,
  onboardingProgress: OnboardingProgressRow | null
): Promise<void> {
  if (!needsMetadataAlignment(targetUser, organizationId)) {
    return;
  }

  const appMetadata = {
    ...asRecord(targetUser.app_metadata),
    organization_id: organizationId,
    organizationId: organizationId,
    current_organization_id: organizationId,
    currentOrganizationId: organizationId,
    foundation: buildFoundationMetadata(targetUser, onboardingProgress),
  };

  const { error } = await client.auth.admin.updateUserById(targetUser.id, {
    app_metadata: appMetadata,
  });

  if (error) {
    throw new ContractError('internal_error', error.message, 500);
  }
}

export async function bootstrapAdmin(
  client: Phase2OpsRepositoryClient,
  auth: Phase2OpsOperatorAuthContext,
  request: BootstrapAdminRequest,
  emitEvent: Phase2OpsEventEmitter = emitPhase2OpsEvent
): Promise<BootstrapAdminResponse> {
  assertBootstrapOrganizationAccess(auth, request.organizationId);

  const targetUser = await findTargetAuthUserByEmail(client, request.targetEmail);

  await syncProfile(client, targetUser.id, request);
  const onboardingProgress = await ensureOnboardingProgress(client, auth, request.organizationId);
  await alignAuthMetadata(client, targetUser, request.organizationId, onboardingProgress);

  emitEvent('admin_bootstrap_provisioned', {
    organizationId: request.organizationId,
    operatorUserId: auth.operatorUserId,
    targetEmail: request.targetEmail,
    targetUserId: targetUser.id,
  });

  return {
    organizationId: request.organizationId,
    targetEmail: request.targetEmail,
    displayName: request.displayName,
    operatorUserId: auth.operatorUserId,
    onboardingInitializationFlags: request.onboardingInitializationFlags,
  };
}
