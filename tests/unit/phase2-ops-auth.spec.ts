import { describe, expect, it, vi } from 'vitest';
import {
  resolveOperatorAuthContext,
  resolvePhase2OpsAuthContext,
} from '@/../supabase/functions/phase2-ops/auth.ts';

interface ProfileRow {
  global_role: string | null;
  account_status: string | null;
}

interface MembershipRow {
  organization_id: string | null;
  role: string | null;
  status: string | null;
}

function createRequest(options?: {
  token?: string;
  organizationId?: string | null;
}): Request {
  const headers = new Headers({
    Authorization: `Bearer ${options?.token ?? 'token-123'}`,
  });

  if (options?.organizationId !== null) {
    headers.set('X-Organization-Id', options?.organizationId ?? '00000000-0000-0000-0000-000000000001');
  }

  return new Request('http://localhost/functions/v1/phase2-ops/bootstrap-admin', {
    method: 'POST',
    headers,
  });
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

describe('phase2 ops auth', () => {
  it('resolves the requested organization from the header and approved membership', async () => {
    const authClient = createAuthClient({
      app_metadata: {
        organization_id: 'metadata-only-org',
      },
    });
    const repositoryClient = createRepositoryClient({
      profile: {
        global_role: 'user',
        account_status: 'active',
      },
      membership: {
        organization_id: '00000000-0000-0000-0000-000000000001',
        role: 'admin',
        status: 'approved',
      },
    });

    const result = await resolvePhase2OpsAuthContext(
      authClient,
      repositoryClient,
      createRequest()
    );

    expect(authClient.auth.getUser).toHaveBeenCalledWith('token-123');
    expect(result).toMatchObject({
      operatorUserId: '11111111-1111-4111-8111-111111111111',
      operatorOrganizationId: '00000000-0000-0000-0000-000000000001',
      operatorGlobalRole: 'user',
      operatorRole: 'admin',
      operatorAccountStatus: 'active',
    });
  });

  it('rejects missing organization headers for org-scoped ops routes', async () => {
    await expect(
      resolvePhase2OpsAuthContext(
        createAuthClient(),
        createRepositoryClient({
          profile: {
            global_role: 'super',
            account_status: 'active',
          },
        }),
        createRequest({ organizationId: null })
      )
    ).rejects.toMatchObject({
      code: 'organization_context_missing',
      status: 403,
    });
  });

  it('rejects metadata-only organization claims without an approved membership', async () => {
    await expect(
      resolvePhase2OpsAuthContext(
        createAuthClient({
          app_metadata: {
            organization_id: '00000000-0000-0000-0000-000000000001',
          },
        }),
        createRepositoryClient({
          profile: {
            global_role: 'user',
            account_status: 'active',
          },
          membership: null,
        }),
        createRequest()
      )
    ).rejects.toMatchObject({
      code: 'organization_access_denied',
      status: 403,
    });
  });

  it('allows active super operators for the requested organization header', async () => {
    const result = await resolvePhase2OpsAuthContext(
      createAuthClient(),
      createRepositoryClient({
        profile: {
          global_role: 'super',
          account_status: 'active',
        },
        membership: null,
      }),
      createRequest({
        organizationId: '00000000-0000-0000-0000-000000000009',
      })
    );

    expect(result).toMatchObject({
      operatorOrganizationId: '00000000-0000-0000-0000-000000000009',
      operatorGlobalRole: 'super',
    });
  });

  it('keeps bootstrap auth restricted to super users or org admins', async () => {
    await expect(
      resolveOperatorAuthContext(
        createAuthClient(),
        createRepositoryClient({
          profile: {
            global_role: 'user',
            account_status: 'active',
          },
          membership: {
            organization_id: '00000000-0000-0000-0000-000000000001',
            role: 'user',
            status: 'approved',
          },
        }),
        createRequest()
      )
    ).rejects.toMatchObject({
      code: 'organization_access_denied',
      status: 403,
    });
  });
});
