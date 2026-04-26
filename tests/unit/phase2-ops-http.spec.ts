import { describe, expect, it } from 'vitest';
import { ContractError } from '@/../supabase/functions/phase2-ops/contracts.ts';
import { createErrorResponse } from '@/../supabase/functions/phase2-ops/http.ts';

describe('phase2 ops http boundary', () => {
  it('preserves ContractError.status when creating the HTTP error response', async () => {
    const request = new Request('https://example.com/functions/v1/phase2-ops/employee-import/apply', {
      method: 'POST',
      headers: {
        origin: 'https://app.example.com',
      },
    });

    const response = createErrorResponse(
      request,
      new ContractError('already_finalized', 'Schedule is already finalized', 409)
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      code: 'already_finalized',
      message: 'Schedule is already finalized',
    });
  });
});
