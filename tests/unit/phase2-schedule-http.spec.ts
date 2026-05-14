import { describe, expect, it } from 'vitest';
import { ContractError } from '@/../supabase/functions/phase2-schedule/contracts.ts';
import { createErrorResponse } from '@/../supabase/functions/phase2-schedule/http.ts';

describe('phase2 schedule http boundary', () => {
  it('preserves the 409 status for version_name_exists contract errors', async () => {
    const request = new Request('https://example.com/functions/v1/phase2-schedule/schedules/id/versions', {
      method: 'POST',
      headers: {
        origin: 'https://app.example.com',
      },
    });

    const response = createErrorResponse(
      request,
      new ContractError('version_name_exists', 'Version name already exists', 409)
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      code: 'version_name_exists',
      message: 'Version name already exists',
    });
  });

  it.each([
    ['plain Error message', new Error('single_version_policy_violation')],
    ['plain string message', 'single_version_policy_violation'],
    ['plain code object', { code: 'single_version_policy_violation' }],
  ])('maps single-version policy violations from %s to 409', async (_, error) => {
    const request = new Request('https://example.com/functions/v1/phase2-schedule/schedules/id/versions', {
      method: 'POST',
      headers: {
        origin: 'https://app.example.com',
      },
    });

    const response = createErrorResponse(request, error);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: 'single_version_policy_violation',
    });
  });
});
