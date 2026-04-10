import { describe, expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { resolveAuthScope, resolvePreferredOrganizationId } from '@/utils/authScope';

function createAuthUser(
  overrides: Partial<User> & {
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  } = {}
): User {
  return {
    id: overrides.id ?? 'user-1',
    aud: 'authenticated',
    created_at: '2026-03-29T00:00:00Z',
    app_metadata: overrides.app_metadata ?? {},
    user_metadata: overrides.user_metadata ?? {},
    ...overrides,
  } as User;
}

describe('resolveAuthScope', () => {
  it('prefers organization_id from app metadata over user metadata', () => {
    const scope = resolveAuthScope(
      createAuthUser({
        app_metadata: {
          organization_id: 'org-app',
        },
        user_metadata: {
          organization_id: 'org-user',
        },
      })
    );

    expect(scope).toEqual({
      userId: 'user-1',
      organizationId: 'org-app',
      foundation: null,
    });
  });

  it('does not trust user metadata when app metadata has no organization id', () => {
    const scope = resolveAuthScope(
      createAuthUser({
        app_metadata: {},
        user_metadata: {
          organization_id: 'org-user',
        },
      })
    );

    expect(scope).toEqual({
      userId: 'user-1',
      organizationId: null,
      foundation: null,
    });
  });

  it('accepts current_organization_id metadata keys', () => {
    const scope = resolveAuthScope(
      createAuthUser({
        app_metadata: {
          current_organization_id: 'org-current',
        },
      })
    );

    expect(scope).toEqual({
      userId: 'user-1',
      organizationId: 'org-current',
      foundation: null,
    });
  });

  it('accepts currentOrganizationId metadata keys', () => {
    const scope = resolveAuthScope(
      createAuthUser({
        app_metadata: {
          currentOrganizationId: '00000000-0000-0000-0000-000000000001',
        },
      })
    );

    expect(scope).toEqual({
      userId: 'user-1',
      organizationId: '00000000-0000-0000-0000-000000000001',
      foundation: null,
    });
  });

  it('reads organization id from nested foundation metadata when top-level keys are missing', () => {
    const scope = resolveAuthScope(
      createAuthUser({
        app_metadata: {
          foundation: {
            organization_id: 'org-foundation',
            current_step_key: 'organization_info',
          },
        },
      })
    );

    expect(scope).toEqual({
      userId: 'user-1',
      organizationId: 'org-foundation',
      foundation: {
        currentStepKey: 'organization_info',
        organizationInfoConfirmedAt: null,
        organizationInfoConfirmedBy: null,
      },
    });
  });

  it('prefers app foundation metadata over user foundation metadata', () => {
    const scope = resolveAuthScope(
      createAuthUser({
        app_metadata: {
          foundation: {
            current_step_key: 'organization_info',
            organization_info_confirmed_at: '2026-04-08T10:00:00Z',
            organization_info_confirmed_by: 'admin-app',
          },
        },
        user_metadata: {
          foundation: {
            current_step_key: 'seed_data',
            organization_info_confirmed_at: '2026-03-01T00:00:00Z',
            organization_info_confirmed_by: 'admin-user',
          },
        },
      })
    );

    expect(scope).toEqual({
      userId: 'user-1',
      organizationId: null,
      foundation: {
        currentStepKey: 'organization_info',
        organizationInfoConfirmedAt: '2026-04-08T10:00:00Z',
        organizationInfoConfirmedBy: 'admin-app',
      },
    });
  });
});

describe('resolvePreferredOrganizationId', () => {
  it('returns the app metadata organization id when present', () => {
    expect(
      resolvePreferredOrganizationId(
        createAuthUser({
          app_metadata: {
            organization_id: 'org-app',
          },
          user_metadata: {
            organization_id: 'org-user',
          },
        })
      )
    ).toBe('org-app');
  });

  it('does not trust user metadata fallback when app metadata has no organization id', () => {
    expect(
      resolvePreferredOrganizationId(
        createAuthUser({
          app_metadata: {},
          user_metadata: {
            organization_id: 'org-user',
          },
        })
      )
    ).toBeNull();
  });
});
