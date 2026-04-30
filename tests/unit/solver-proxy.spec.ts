import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type WifSupplierContext = {
  audience: string;
  subjectTokenType: string;
};

type WifClientConfig = {
  type: string;
  audience: string;
  subject_token_type: string;
  token_url: string;
  subject_token_supplier: {
    getSubjectToken: (context: WifSupplierContext) => Promise<string>;
  };
};

const oidcMocks = vi.hoisted(() => ({
  getVercelOidcToken: vi.fn(),
}));

const googleAuthMocks = vi.hoisted(() => {
  const getAccessToken = vi.fn();
  const externalAccountClient = {
    getAccessToken,
  };
  const ExternalAccountClient = {
    fromJSON: vi.fn(),
  };

  return {
    ExternalAccountClient,
    externalAccountClient,
    getAccessToken,
  };
});

vi.mock('@vercel/oidc', () => ({
  getVercelOidcToken: oidcMocks.getVercelOidcToken,
}));

vi.mock('google-auth-library', () => ({
  ExternalAccountClient: googleAuthMocks.ExternalAccountClient,
}));

import proxySolverApi, {
  buildCloudRunApiUrl,
  createForwardHeaders,
  extractBearerToken,
} from '../../api/solver-proxy.js';

const cloudRunOrigin = 'https://every-shift-api-service-554455861916.asia-northeast3.run.app';
const iamCredentialsUrl =
  'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/vercel-solver-proxy-invoker@every-shift-api.iam.gserviceaccount.com:generateIdToken';

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
  const originalCloudRunApiOrigin = process.env.CLOUD_RUN_API_ORIGIN;
  const originalCloudRunTargetAudience = process.env.CLOUD_RUN_TARGET_AUDIENCE;
  const originalGcpProjectNumber = process.env.GCP_PROJECT_NUMBER;
  const originalGcpWorkloadIdentityPoolId = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
  const originalGcpWorkloadIdentityPoolProviderId = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;
  const originalGcpServiceAccountEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL;

  let capturedWifConfig: WifClientConfig | null = null;

  beforeEach(() => {
    vi.restoreAllMocks();
    capturedWifConfig = null;
    oidcMocks.getVercelOidcToken.mockReset();
    googleAuthMocks.getAccessToken.mockReset();
    googleAuthMocks.ExternalAccountClient.fromJSON.mockReset();
    process.env.SUPABASE_URL = 'https://supabase.example';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    process.env.GCP_PROJECT_NUMBER = '554455861916';
    process.env.GCP_WORKLOAD_IDENTITY_POOL_ID = 'vercel-solver';
    process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID = 'vercel-prod';
    process.env.GCP_SERVICE_ACCOUNT_EMAIL =
      'vercel-solver-proxy-invoker@every-shift-api.iam.gserviceaccount.com';
    delete process.env.CLOUD_RUN_API_ORIGIN;
    delete process.env.CLOUD_RUN_TARGET_AUDIENCE;
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;

    oidcMocks.getVercelOidcToken.mockResolvedValue('vercel-oidc-token');
    googleAuthMocks.getAccessToken.mockImplementation(async () => {
      if (!capturedWifConfig) {
        throw new Error('missing wif config');
      }

      await capturedWifConfig.subject_token_supplier.getSubjectToken({
        audience: capturedWifConfig.audience,
        subjectTokenType: capturedWifConfig.subject_token_type,
      });
      return { token: 'sts-access-token' };
    });
    googleAuthMocks.ExternalAccountClient.fromJSON.mockImplementation((config: WifClientConfig) => {
      capturedWifConfig = config;
      return googleAuthMocks.externalAccountClient;
    });
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
    if (originalCloudRunApiOrigin === undefined) {
      delete process.env.CLOUD_RUN_API_ORIGIN;
    } else {
      process.env.CLOUD_RUN_API_ORIGIN = originalCloudRunApiOrigin;
    }
    if (originalCloudRunTargetAudience === undefined) {
      delete process.env.CLOUD_RUN_TARGET_AUDIENCE;
    } else {
      process.env.CLOUD_RUN_TARGET_AUDIENCE = originalCloudRunTargetAudience;
    }
    if (originalGcpProjectNumber === undefined) {
      delete process.env.GCP_PROJECT_NUMBER;
    } else {
      process.env.GCP_PROJECT_NUMBER = originalGcpProjectNumber;
    }
    if (originalGcpWorkloadIdentityPoolId === undefined) {
      delete process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
    } else {
      process.env.GCP_WORKLOAD_IDENTITY_POOL_ID = originalGcpWorkloadIdentityPoolId;
    }
    if (originalGcpWorkloadIdentityPoolProviderId === undefined) {
      delete process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;
    } else {
      process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID = originalGcpWorkloadIdentityPoolProviderId;
    }
    if (originalGcpServiceAccountEmail === undefined) {
      delete process.env.GCP_SERVICE_ACCOUNT_EMAIL;
    } else {
      process.env.GCP_SERVICE_ACCOUNT_EMAIL = originalGcpServiceAccountEmail;
    }
  });

  it('maps same-origin api paths to cloud run api paths', () => {
    expect(buildCloudRunApiUrl('/api/solve')).toBe(`${cloudRunOrigin}/api/solve`);
    expect(buildCloudRunApiUrl('/api/status/exec-1?include=result')).toBe(
      `${cloudRunOrigin}/api/status/exec-1?include=result`,
    );
    expect(buildCloudRunApiUrl('/api/[...path]', ['status', 'exec-1'])).toBe(
      `${cloudRunOrigin}/api/status/exec-1`,
    );
  });

  it('uses the configured cloud run origin when building target urls', () => {
    process.env.CLOUD_RUN_API_ORIGIN = 'https://solver-private.example';

    expect(buildCloudRunApiUrl('/api/solve')).toBe('https://solver-private.example/api/solve');
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
    expect(oidcMocks.getVercelOidcToken).not.toHaveBeenCalled();
    expect(googleAuthMocks.ExternalAccountClient.fromJSON).not.toHaveBeenCalled();
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
    expect(oidcMocks.getVercelOidcToken).not.toHaveBeenCalled();
    expect(googleAuthMocks.ExternalAccountClient.fromJSON).not.toHaveBeenCalled();
  });

  it('verifies a valid token before forwarding the request body to cloud run with a google id token', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'user-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'google-id-token' }), { status: 200 }))
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

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://supabase.example/auth/v1/user', {
      method: 'GET',
      headers: { apikey: 'anon-key', Authorization: 'Bearer valid-token' },
    });
    expect(googleAuthMocks.ExternalAccountClient.fromJSON).toHaveBeenCalledWith({
      type: 'external_account',
      audience:
        '//iam.googleapis.com/projects/554455861916/locations/global/workloadIdentityPools/vercel-solver/providers/vercel-prod',
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      token_url: 'https://sts.googleapis.com/v1/token',
      subject_token_supplier: {
        getSubjectToken: oidcMocks.getVercelOidcToken,
      },
    });
    expect(oidcMocks.getVercelOidcToken).toHaveBeenCalledTimes(1);
    expect(googleAuthMocks.getAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenNthCalledWith(2, iamCredentialsUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer sts-access-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        audience: cloudRunOrigin,
        includeEmail: true,
      }),
    });

    const [, cloudRunRequest] = fetchMock.mock.calls[2];
    expect(fetchMock.mock.calls[2][0]).toBe(`${cloudRunOrigin}/api/solve`);
    expect(cloudRunRequest).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ units: [{ id: 'icu' }] }),
    });
    expect((cloudRunRequest?.headers as Headers).get('content-type')).toBe('application/json');
    expect((cloudRunRequest?.headers as Headers).get('authorization')).toBe('Bearer google-id-token');
    expect((cloudRunRequest?.headers as Headers).has('cookie')).toBe(false);
    expect(res.statusCode).toBe(202);
    expect(res.getHeader('content-type')).toBe('application/json');
    expect(res.getHeader('x-cloud-run')).toBe('ok');
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect((res.body as Buffer).toString('utf8')).toBe(JSON.stringify({ execution_id: 'exec-1' }));
  });

  it('uses CLOUD_RUN_TARGET_AUDIENCE when provided', async () => {
    process.env.CLOUD_RUN_API_ORIGIN = 'https://solver-private.example';
    process.env.CLOUD_RUN_TARGET_AUDIENCE = 'https://custom-audience.example';
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'user-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'custom-audience-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ execution_id: 'exec-1' }), { status: 202 }));
    const res = createMockResponse();

    await proxySolverApi(
      {
        method: 'POST',
        url: '/api/solve',
        headers: { authorization: 'Bearer valid-token' },
        body: { units: [] },
      } as never,
      res as never,
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      body: JSON.stringify({
        audience: 'https://custom-audience.example',
        includeEmail: true,
      }),
    });
    expect(fetchMock.mock.calls[2][0]).toBe('https://solver-private.example/api/solve');
  });

  it('returns 502 before forwarding when workload identity federation env is missing', async () => {
    delete process.env.GCP_PROJECT_NUMBER;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'user-1' }), { status: 200 }));
    const errorMock = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = createMockResponse();

    await proxySolverApi(
      {
        method: 'POST',
        url: '/api/solve',
        headers: { authorization: 'Bearer valid-token' },
        body: { units: [] },
      } as never,
      res as never,
    );

    expect(res.statusCode).toBe(502);
    expect(res.body).toBe(
      JSON.stringify({ code: 'cloud_run_auth_failed', message: 'Cloud Run authentication failed' }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(oidcMocks.getVercelOidcToken).not.toHaveBeenCalled();
    expect(googleAuthMocks.ExternalAccountClient.fromJSON).not.toHaveBeenCalled();
    expect(errorMock).toHaveBeenCalledWith('[solver-proxy] Cloud Run auth failed:', expect.any(Error));
  });

  it('returns 502 before forwarding when Vercel OIDC token issuance fails', async () => {
    oidcMocks.getVercelOidcToken.mockRejectedValueOnce(new Error('oidc unavailable'));
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'user-1' }), { status: 200 }));
    const errorMock = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = createMockResponse();

    await proxySolverApi(
      {
        method: 'POST',
        url: '/api/solve',
        headers: { authorization: 'Bearer valid-token' },
        body: { units: [] },
      } as never,
      res as never,
    );

    expect(res.statusCode).toBe(502);
    expect(res.body).toBe(
      JSON.stringify({ code: 'cloud_run_auth_failed', message: 'Cloud Run authentication failed' }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(googleAuthMocks.getAccessToken).toHaveBeenCalledTimes(1);
    expect(errorMock).toHaveBeenCalledWith('[solver-proxy] Cloud Run auth failed:', expect.any(Error));
  });

  it('returns 502 before forwarding when STS access token issuance fails', async () => {
    googleAuthMocks.getAccessToken.mockRejectedValueOnce(new Error('sts unavailable'));
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'user-1' }), { status: 200 }));
    const errorMock = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = createMockResponse();

    await proxySolverApi(
      {
        method: 'POST',
        url: '/api/solve',
        headers: { authorization: 'Bearer valid-token' },
        body: { units: [] },
      } as never,
      res as never,
    );

    expect(res.statusCode).toBe(502);
    expect(res.body).toBe(
      JSON.stringify({ code: 'cloud_run_auth_failed', message: 'Cloud Run authentication failed' }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(errorMock).toHaveBeenCalledWith('[solver-proxy] Cloud Run auth failed:', expect.any(Error));
  });

  it('returns 502 before forwarding when IAM Credentials rejects google id token issuance', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'user-1' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: 'permission denied' } }), { status: 403 }),
      );
    const errorMock = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = createMockResponse();

    await proxySolverApi(
      {
        method: 'POST',
        url: '/api/solve',
        headers: { authorization: 'Bearer valid-token' },
        body: { units: [] },
      } as never,
      res as never,
    );

    expect(res.statusCode).toBe(502);
    expect(res.body).toBe(
      JSON.stringify({ code: 'cloud_run_auth_failed', message: 'Cloud Run authentication failed' }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(errorMock).toHaveBeenCalledWith('[solver-proxy] Cloud Run auth failed:', expect.any(Error));
  });

  it('returns 502 before forwarding when IAM Credentials omits the google id token', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'user-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));
    const errorMock = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = createMockResponse();

    await proxySolverApi(
      {
        method: 'POST',
        url: '/api/solve',
        headers: { authorization: 'Bearer valid-token' },
        body: { units: [] },
      } as never,
      res as never,
    );

    expect(res.statusCode).toBe(502);
    expect(res.body).toBe(
      JSON.stringify({ code: 'cloud_run_auth_failed', message: 'Cloud Run authentication failed' }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(errorMock).toHaveBeenCalledWith('[solver-proxy] Cloud Run auth failed:', expect.any(Error));
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
