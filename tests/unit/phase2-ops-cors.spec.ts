import { describe, expect, it } from 'vitest';
import { createCorsHeaders } from '@/../supabase/functions/phase2-ops/cors.ts';

describe('phase2 ops cors', () => {
  it('allows browser preflight headers used by authenticated ops calls', () => {
    const headers = createCorsHeaders({
      headers: new Headers({
        origin: 'https://app.example.com',
        'access-control-request-headers': 'authorization,apikey,content-type',
      }),
    } as Request);

    expect(headers['Access-Control-Allow-Origin']).toBe('https://app.example.com');
    expect(headers['Access-Control-Allow-Headers']).toBe('authorization,apikey,content-type');
    expect(headers['Access-Control-Allow-Methods']).toContain('PUT');
    expect(headers['Access-Control-Allow-Methods']).toContain('OPTIONS');
  });
});
