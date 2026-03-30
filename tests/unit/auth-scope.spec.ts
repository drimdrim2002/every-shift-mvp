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
    });
  });

  it('falls back to user metadata when app metadata has no organization id', () => {
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
      organizationId: 'org-user',
    });
  });
});
