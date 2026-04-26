import { describe, expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { resolveAuthScope } from '@/utils/authScope';

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
  it('returns only the user id and foundation metadata', () => {
    const scope = resolveAuthScope(
      createAuthUser({
        app_metadata: {
          current_step_key: 'organization_info',
        },
        user_metadata: {
          current_step_key: 'seed_data',
        },
      })
    );

    expect(scope).toEqual({
      userId: 'user-1',
      foundation: {
        currentStepKey: 'organization_info',
        organizationInfoConfirmedAt: null,
        organizationInfoConfirmedBy: null,
      },
    });
  });

  it('reads foundation metadata from nested foundation records', () => {
    const scope = resolveAuthScope(
      createAuthUser({
        app_metadata: {
          foundation: {
            current_step_key: 'organization_info',
          },
        },
      })
    );

    expect(scope).toEqual({
      userId: 'user-1',
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
      foundation: {
        currentStepKey: 'organization_info',
        organizationInfoConfirmedAt: '2026-04-08T10:00:00Z',
        organizationInfoConfirmedBy: 'admin-app',
      },
    });
  });
});
