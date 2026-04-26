import type { User } from '@supabase/supabase-js';

type OrganizationMetadata = Record<string, unknown> | null | undefined;

export interface AuthFoundationMetadata {
  currentStepKey: string | null;
  organizationInfoConfirmedAt: string | null;
  organizationInfoConfirmedBy: string | null;
}

export interface AuthScope {
  userId: string;
  foundation: AuthFoundationMetadata | null;
}

function readStringFromMetadata(
  metadata: OrganizationMetadata,
  keys: readonly string[]
): string | null {
  if (!metadata) {
    return null;
  }

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function readFoundationFromMetadata(metadata: OrganizationMetadata): AuthFoundationMetadata | null {
  if (!metadata) {
    return null;
  }

  const foundationRoot =
    typeof metadata.foundation === 'object' &&
    metadata.foundation !== null &&
    !Array.isArray(metadata.foundation)
      ? (metadata.foundation as Record<string, unknown>)
      : metadata;

  const currentStepKey = readStringFromMetadata(foundationRoot, [
    'current_step_key',
    'currentStepKey',
    'onboarding_step_key',
    'onboardingStepKey',
  ]);
  const organizationInfoConfirmedAt = readStringFromMetadata(foundationRoot, [
    'organization_info_confirmed_at',
    'organizationInfoConfirmedAt',
  ]);
  const organizationInfoConfirmedBy = readStringFromMetadata(foundationRoot, [
    'organization_info_confirmed_by',
    'organizationInfoConfirmedBy',
  ]);

  if (!currentStepKey && !organizationInfoConfirmedAt && !organizationInfoConfirmedBy) {
    return null;
  }

  return {
    currentStepKey,
    organizationInfoConfirmedAt,
    organizationInfoConfirmedBy,
  };
}

export function resolveAuthScope(user: User | null | undefined): AuthScope | null {
  if (!user?.id) {
    return null;
  }

  const appMetadata = user.app_metadata as OrganizationMetadata;
  const userMetadata = user.user_metadata as OrganizationMetadata;
  const foundation = readFoundationFromMetadata(appMetadata) ?? readFoundationFromMetadata(userMetadata);

  return {
    userId: user.id,
    foundation,
  };
}
