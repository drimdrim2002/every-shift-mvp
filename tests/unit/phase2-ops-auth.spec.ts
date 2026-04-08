import { describe, expect, it } from 'vitest';
import { resolveOperatorAuthContext } from '@/../supabase/functions/phase2-ops/auth.ts';

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
    });
  });
});
