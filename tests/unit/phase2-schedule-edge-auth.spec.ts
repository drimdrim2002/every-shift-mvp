import { describe, expect, it, vi } from 'vitest';
import { resolveAuthContext } from '@/../supabase/functions/phase2-schedule/auth.ts';

describe('phase2 schedule edge auth', () => {
  it('prefers app_metadata.organization_id over user_metadata.organization_id', async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: '11111111-1111-4111-8111-111111111111',
          app_metadata: {
            organization_id: '22222222-2222-4222-8222-222222222222',
          },
          user_metadata: {
            organization_id: '33333333-3333-4333-8333-333333333333',
          },
        },
      },
      error: null,
    });

    const context = await resolveAuthContext(
      {
        auth: {
          getUser,
        },
      },
      new Request('https://example.com/functions/v1/phase2-schedule/schedules/ensure', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer access-token-123',
        },
      })
    );

    expect(getUser).toHaveBeenCalledWith('access-token-123');
    expect(context).toEqual({
      userId: '11111111-1111-4111-8111-111111111111',
      organizationId: '22222222-2222-4222-8222-222222222222',
    });
  });

  it('rejects verified users without an organization claim', async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: '44444444-4444-4444-8444-444444444444',
          app_metadata: {},
          user_metadata: {},
        },
      },
      error: null,
    });

    await expect(
      resolveAuthContext(
        {
          auth: {
            getUser,
          },
        },
        new Request('https://example.com/functions/v1/phase2-schedule/schedules/ensure', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer access-token-456',
          },
        })
      )
    ).rejects.toMatchObject({
      code: 'organization_context_missing',
      status: 403,
    });
  });
});
