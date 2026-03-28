import { describe, expect, it } from 'vitest';
import { createCorsHeaders } from '@/../supabase/functions/phase2-schedule/cors.ts';

describe('phase2 schedule cors helper', () => {
  it('echoes origin and requested headers for preflight requests', () => {
    const request = {
      headers: new Headers({
        origin: 'http://localhost:5173',
        'access-control-request-headers': 'authorization,apikey,x-client-info,content-type',
      }),
    } as Request;

    const headers = createCorsHeaders(request);

    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
    expect(headers['Access-Control-Allow-Headers']).toBe(
      'authorization,apikey,x-client-info,content-type'
    );
    expect(headers['Access-Control-Allow-Methods']).toBe('GET,POST,OPTIONS');
    expect(headers['Access-Control-Allow-Credentials']).toBe('true');
  });

  it('falls back to wildcard origin and default headers when preflight metadata is absent', () => {
    const request = new Request('https://example.com/functions/v1/phase2-schedule/schedules/ensure', {
      method: 'GET',
    });

    const headers = createCorsHeaders(request);

    expect(headers['Access-Control-Allow-Origin']).toBe('*');
    expect(headers['Access-Control-Allow-Headers']).toBe(
      'authorization, x-client-info, content-type, apikey'
    );
    expect(headers['Access-Control-Allow-Methods']).toBe('GET,POST,OPTIONS');
    expect(headers['Access-Control-Allow-Credentials']).toBeUndefined();
  });
});
