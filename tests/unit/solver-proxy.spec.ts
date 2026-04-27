import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import proxySolverApi, {
  buildCloudRunApiUrl,
  createForwardHeaders,
  extractBearerToken,
} from '../../api/solver-proxy.js';

const cloudRunOrigin = 'https://every-shift-api-service-554455861916.asia-northeast3.run.app';

function createMockResponse() {
  const headers = new Map<string, string>();
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    setHeader: vi.fn((name: string, value: string) => {
      headers.set(name.toLowerCase(), value);
      return res;
    }),
    send: vi.fn((body: unknown) => {
      res.body = body;
      return res;
    }),
    getHeader: (name: string) => headers.get(name.toLowerCase()),
  };

  return res;
}

describe('solver vercel proxy', () => {
  const originalSupabaseUrl = process.env.SUPABASE_URL;
  const originalViteSupabaseUrl = process.env.VITE_SUPABASE_URL;
  const originalSupabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const originalViteSupabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.SUPABASE_URL = 'https://supabase.example';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalSupabaseUrl === undefined) {
      delete process.env.SUPABASE_URL;
    } else {
      process.env.SUPABASE_URL = originalSupabaseUrl;
    }
    if (originalViteSupabaseUrl === undefined) {
      delete process.env.VITE_SUPABASE_URL;
    } else {
      process.env.VITE_SUPABASE_URL = originalViteSupabaseUrl;
    }
    if (originalSupabaseAnonKey === undefined) {
      delete process.env.SUPABASE_ANON_KEY;
    } else {
      process.env.SUPABASE_ANON_KEY = originalSupabaseAnonKey;
    }
    if (originalViteSupabaseAnonKey === undefined) {
      delete process.env.VITE_SUPABASE_ANON_KEY;
    } else {
      process.env.VITE_SUPABASE_ANON_KEY = originalViteSupabaseAnonKey;
    }
  });

  it('maps same-origin api paths to cloud run api paths', () => {
    expect(buildCloudRunApiUrl('/api/solve')).toBe(
      `${cloudRunOrigin}/api/solve`,
    );
    expect(buildCloudRunApiUrl('/api/status/exec-1?include=result')).toBe(
      `${cloudRunOrigin}/api/status/exec-1?include=result`,
    );
    expect(buildCloudRunApiUrl('/api/[...path]', ['status', 'exec-1'])).toBe(
      `${cloudRunOrigin}/api/status/exec-1`,
    );
  });

  it('extracts bearer tokens case-insensitively', () => {
    expect(extractBearerToken('Bearer token')).toBe('token');
    expect(extractBearerToken('bearer token')).toBe('token');
    expect(extractBearerToken(['Bearer first-token', 'Bearer second-token'])).toBe('first-token');
    expect(extractBearerToken('Basic token')).toBeNull();
    expect(extractBearerToken(undefined)).toBeNull();
  });

  it('does not forward browser routing or credential headers to cloud run', () => {
    const headers = createForwardHeaders({
      origin: 'https://every-shift-mvp.vercel.app',
      referer: 'https://every-shift-mvp.vercel.app/app/schedules/1',
      host: 'every-shift-mvp.vercel.app',
      cookie: 'session=browser-cookie',
      authorization: 'Bearer token',
      'x-forwarded-host': 'every-shift-mvp.vercel.app',
      'content-type': 'application/json',
    });

    expect(headers.has('origin')).toBe(false);
    expect(headers.has('referer')).toBe(false);
    expect(headers.has('host')).toBe(false);
    expect(headers.has('cookie')).toBe(false);
    expect(headers.has('authorization')).toBe(false);
    expect(headers.has('x-forwarded-host')).toBe(false);
    expect(headers.get('content-type')).toBe('application/json');
  });

  it('returns 401 before forwarding when authorization is missing', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const res = createMockResponse();

    await proxySolverApi(
      {
        method: 'POST',
        url: '/api/solve',
        headers: { 'content-type': 'application/json' },
        body: { units: [] },
      } as never,
      res as never,
    );

    expect(res.statusCode).toBe(401);
    expect(res.getHeader('content-type')).toBe('application/json');
    expect(res.body).toBe(JSON.stringify({ code: 'unauthorized', message: 'Authorization required' }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 401 before forwarding when Supabase rejects the token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'bad jwt' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const res = createMockResponse();

    await proxySolverApi(
      {
        method: 'POST',
        url: '/api/solve',
        headers: { authorization: 'Bearer rejected-token' },
        body: { units: [] },
      } as never,
      res as never,
    );

    expect(res.statusCode).toBe(401);
    expect(res.body).toBe(JSON.stringify({ code: 'unauthorized', message: 'Invalid authorization token' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://supabase.example/auth/v1/user', {
      method: 'GET',
      headers: { apikey: 'anon-key', Authorization: 'Bearer rejected-token' },
    });
  });

  it('verifies a valid token before forwarding the request body to cloud run', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'user-1' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ execution_id: 'exec-1' }), {
          status: 202,
          headers: { 'content-type': 'application/json', 'x-cloud-run': 'ok' },
        }),
      );
    const res = createMockResponse();

    await proxySolverApi(
      {
        method: 'POST',
        url: '/api/solve',
        headers: {
          authorization: 'Bearer valid-token',
          cookie: 'session=browser-cookie',
          'content-type': 'application/json',
        },
        body: { units: [{ id: 'icu' }] },
      } as never,
      res as never,
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://supabase.example/auth/v1/user', {
      method: 'GET',
      headers: { apikey: 'anon-key', Authorization: 'Bearer valid-token' },
    });

    const [, cloudRunRequest] = fetchMock.mock.calls[1];
    expect(fetchMock.mock.calls[1][0]).toBe(`${cloudRunOrigin}/api/solve`);
    expect(cloudRunRequest).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ units: [{ id: 'icu' }] }),
    });
    expect((cloudRunRequest?.headers as Headers).get('content-type')).toBe('application/json');
    expect((cloudRunRequest?.headers as Headers).has('authorization')).toBe(false);
    expect((cloudRunRequest?.headers as Headers).has('cookie')).toBe(false);
    expect(res.statusCode).toBe(202);
    expect(res.getHeader('content-type')).toBe('application/json');
    expect(res.getHeader('x-cloud-run')).toBe('ok');
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect((res.body as Buffer).toString('utf8')).toBe(JSON.stringify({ execution_id: 'exec-1' }));
  });

  it('returns 500 before forwarding when Supabase verification returns 500', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'service unavailable' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const errorMock = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = createMockResponse();

    await proxySolverApi(
      {
        method: 'POST',
        url: '/api/solve',
        headers: { authorization: 'Bearer token' },
        body: { units: [] },
      } as never,
      res as never,
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toBe(
      JSON.stringify({ code: 'auth_verification_failed', message: 'Auth verification failed' }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(errorMock).toHaveBeenCalledWith(
      '[solver-proxy] Supabase auth verification failed:',
      expect.any(Error),
    );
  });

  it('returns 500 before forwarding when Supabase verification omits the user id', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));
    const errorMock = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = createMockResponse();

    await proxySolverApi(
      {
        method: 'POST',
        url: '/api/solve',
        headers: { authorization: 'Bearer token' },
        body: { units: [] },
      } as never,
      res as never,
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toBe(
      JSON.stringify({ code: 'auth_verification_failed', message: 'Auth verification failed' }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(errorMock).toHaveBeenCalledWith(
      '[solver-proxy] Supabase auth verification failed:',
      expect.any(Error),
    );
  });

  it('returns 500 before forwarding when Supabase verification fetch rejects', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network down'));
    const errorMock = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = createMockResponse();

    await proxySolverApi(
      {
        method: 'POST',
        url: '/api/solve',
        headers: { authorization: 'Bearer token' },
        body: { units: [] },
      } as never,
      res as never,
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toBe(
      JSON.stringify({ code: 'auth_verification_failed', message: 'Auth verification failed' }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(errorMock).toHaveBeenCalledWith(
      '[solver-proxy] Supabase auth verification failed:',
      expect.any(Error),
    );
  });

  it('returns 500 before forwarding when Supabase verification env is missing', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.VITE_SUPABASE_URL;
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const errorMock = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = createMockResponse();

    await proxySolverApi(
      {
        method: 'POST',
        url: '/api/solve',
        headers: { authorization: 'Bearer token' },
        body: { units: [] },
      } as never,
      res as never,
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toBe(
      JSON.stringify({ code: 'auth_verification_failed', message: 'Auth verification failed' }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorMock).toHaveBeenCalledWith(
      '[solver-proxy] Supabase auth verification failed:',
      expect.any(Error),
    );
  });
});
