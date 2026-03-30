import type { User } from '@supabase/supabase-js';

type OrganizationMetadata = Record<string, unknown> | null | undefined;

export interface AuthScope {
  userId: string;
  organizationId: string | null;
}

export function readOrganizationIdFromMetadata(metadata: OrganizationMetadata): string | null {
  const keys = [
    'organizationId',
    'organization_id',
    'currentOrganizationId',
    'current_organization_id',
  ] as const;

  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

export function resolveAuthScope(user: User | null | undefined): AuthScope | null {
  if (!user?.id) {
    return null;
  }

  const organizationId =
    readOrganizationIdFromMetadata(user.app_metadata as OrganizationMetadata) ??
    readOrganizationIdFromMetadata(user.user_metadata as OrganizationMetadata);

  return {
    userId: user.id,
    organizationId,
  };
}
