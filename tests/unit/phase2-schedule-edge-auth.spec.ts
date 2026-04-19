import { describe, expect, it, vi } from 'vitest';
import { resolveAuthContext } from '@/../supabase/functions/phase2-schedule/auth.ts';

interface ProfileRow {
  global_role: string | null;
  account_status: string | null;
}

interface MembershipRow {
  organization_id: string | null;
  role: string | null;
  status: string | null;
}

function createAuthClient(userOverrides?: Partial<{
  id: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
}>) {
  const getUser = vi.fn().mockResolvedValue({
    data: {
      user: {
        id: userOverrides?.id ?? '11111111-1111-4111-8111-111111111111',
        app_metadata: userOverrides?.app_metadata ?? {},
        user_metadata: userOverrides?.user_metadata ?? {},
      },
    },
    error: null,
  });

  return {
    auth: {
      getUser,
    },
  };
}

function createRepositoryClient(options?: {
  profile?: ProfileRow | null;
  membership?: MembershipRow | null;
}) {
  return {
    from(table: 'profiles' | 'organization_memberships') {
      const result = table === 'profiles'
        ? { data: options?.profile ?? null, error: null }
        : { data: options?.membership ?? null, error: null };

      const builder = {
        eq() {
          return builder;
        },
        limit() {
          return builder;
        },
        maybeSingle: async () => result,
      };

      return {
        select() {
          return builder;
        },
      };
    },
  };
}

function createRequest(organizationId: string | null): Request {
  const headers = new Headers({
    Authorization: 'Bearer access-token-123',
  });

  if (organizationId !== null) {
    headers.set('X-Organization-Id', organizationId);
  }

  return new Request('https://example.com/functions/v1/phase2-schedule/schedules/ensure', {
    method: 'POST',
    headers,
  });
}

describe('phase2 schedule edge auth', () => {
  it('resolves the requested organization from the header and approved membership', async () => {
    const authClient = createAuthClient({
      app_metadata: {
        organization_id: 'metadata-only-org',
      },
    });

    const context = await resolveAuthContext(
      authClient,
      createRepositoryClient({
        profile: {
          global_role: 'user',
          account_status: 'active',
        },
        membership: {
          organization_id: '22222222-2222-4222-8222-222222222222',
          role: 'admin',
          status: 'approved',
        },
      }),
      createRequest('22222222-2222-4222-8222-222222222222')
    );

    expect(authClient.auth.getUser).toHaveBeenCalledWith('access-token-123');
    expect(context).toEqual({
      userId: '11111111-1111-4111-8111-111111111111',
      organizationId: '22222222-2222-4222-8222-222222222222',
    });
  });

  it('rejects requests without the organization header', async () => {
    await expect(
      resolveAuthContext(
        createAuthClient(),
        createRepositoryClient({
          profile: {
            global_role: 'super',
            account_status: 'active',
          },
        }),
        createRequest(null)
      )
    ).rejects.toMatchObject({
      code: 'organization_context_missing',
      status: 403,
    });
  });

  it('rejects metadata-only organization claims without an approved membership', async () => {
    await expect(
      resolveAuthContext(
        createAuthClient({
          app_metadata: {
            organization_id: '22222222-2222-4222-8222-222222222222',
          },
        }),
        createRepositoryClient({
          profile: {
            global_role: 'user',
            account_status: 'active',
          },
          membership: null,
        }),
        createRequest('22222222-2222-4222-8222-222222222222')
      )
    ).rejects.toMatchObject({
      code: 'organization_access_denied',
      status: 403,
    });
  });

  it('allows active super users to scope schedule access by the requested header', async () => {
    const context = await resolveAuthContext(
      createAuthClient(),
      createRepositoryClient({
        profile: {
          global_role: 'super',
          account_status: 'active',
        },
        membership: null,
      }),
      createRequest('00000000-0000-0000-0000-000000000009')
    );

    expect(context).toEqual({
      userId: '11111111-1111-4111-8111-111111111111',
      organizationId: '00000000-0000-0000-0000-000000000009',
    });
  });
});
