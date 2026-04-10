import { describe, expect, it } from 'vitest';
import {
  resolveOperatorAuthContext,
  resolvePhase2OpsAuthContext,
} from '@/../supabase/functions/phase2-ops/auth.ts';

function createRequest(token = 'token-123'): Request {
  return new Request('http://localhost/functions/v1/phase2-ops/bootstrap-admin', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

describe('resolveOperatorAuthContext', () => {
  it('does not fall back to user metadata for admin organization scope', async () => {
    const authClient = {
      auth: {
        getUser: async () => ({
          data: {
            user: {
              id: '11111111-1111-4111-8111-111111111111',
              app_metadata: {},
              user_metadata: {
                organization_id: 'org-from-user-metadata',
              },
            },
          },
          error: null,
        }),
      },
    };
    const repositoryClient = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  limit() {
                    return {
                      maybeSingle: async () => ({
                        data: {
                          global_role: 'admin',
                          role: null,
                          status: null,
                          account_status: 'active',
                          organization_id: null,
                        },
                        error: null,
                      }),
                    };
                  },
                };
              },
            };
          },
        };
      },
    };

    const result = await resolveOperatorAuthContext(authClient, repositoryClient, createRequest());

    expect(result).toEqual({
      operatorUserId: '11111111-1111-4111-8111-111111111111',
      operatorOrganizationId: null,
      operatorGlobalRole: 'admin',
      operatorRole: null,
      operatorStatus: null,
      operatorAccountStatus: 'active',
    });
  });

  it('allows active pilot admins through the non-bootstrap ops auth path', async () => {
    const authClient = {
      auth: {
        getUser: async () => ({
          data: {
            user: {
              id: '22222222-2222-4222-8222-222222222222',
              app_metadata: {},
              user_metadata: {},
            },
          },
          error: null,
        }),
      },
    };
    const repositoryClient = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  limit() {
                    return {
                      maybeSingle: async () => ({
                        data: {
                          global_role: 'user',
                          role: 'admin',
                          status: 'active',
                          account_status: 'active',
                          organization_id: '00000000-0000-0000-0000-000000000001',
                        },
                        error: null,
                      }),
                    };
                  },
                };
              },
            };
          },
        };
      },
    };

    const result = await resolvePhase2OpsAuthContext(
      authClient,
      repositoryClient,
      createRequest()
    );

    expect(result).toEqual({
      operatorUserId: '22222222-2222-4222-8222-222222222222',
      operatorOrganizationId: '00000000-0000-0000-0000-000000000001',
      operatorGlobalRole: 'user',
      operatorRole: 'admin',
      operatorStatus: 'active',
      operatorAccountStatus: 'active',
    });
  });
});
