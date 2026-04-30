import { getVercelOidcToken } from '@vercel/oidc';
import { ExternalAccountClient } from 'google-auth-library';

const DEFAULT_CLOUD_RUN_API_ORIGIN = 'https://every-shift-api-service-554455861916.asia-northeast3.run.app';

const blockedForwardHeaderNames = new Set([
  'authorization',
  'connection',
  'content-length',
  'cookie',
  'forwarded',
  'host',
  'origin',
  'referer',
  'transfer-encoding',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-port',
  'x-forwarded-proto',
  'x-real-ip',
]);

const blockedResponseHeaderNames = new Set([
  'content-encoding',
  'transfer-encoding',
]);

function normalizePathParam(pathParam) {
  if (Array.isArray(pathParam)) {
    return pathParam.join('/');
  }
  return typeof pathParam === 'string' ? pathParam : '';
}

function getCloudRunApiOrigin() {
  return (process.env.CLOUD_RUN_API_ORIGIN || DEFAULT_CLOUD_RUN_API_ORIGIN).replace(/\/$/, '');
}

function getCloudRunTargetAudience() {
  return process.env.CLOUD_RUN_TARGET_AUDIENCE || getCloudRunApiOrigin();
}

export function buildCloudRunApiUrl(requestUrl = '', pathParam = '') {
  const normalizedPathParam = normalizePathParam(pathParam);
  const path = normalizedPathParam
    ? `/api/${normalizedPathParam}`
    : requestUrl.startsWith('/api')
      ? requestUrl
      : `/api${requestUrl}`;

  return `${getCloudRunApiOrigin()}${path}`;
}

export function createForwardHeaders(sourceHeaders = {}) {
  const headers = new Headers();

  for (const [name, rawValue] of Object.entries(sourceHeaders)) {
    const normalizedName = name.toLowerCase();
    if (blockedForwardHeaderNames.has(normalizedName) || rawValue === undefined) {
      continue;
    }

    const value = Array.isArray(rawValue) ? rawValue.join(', ') : String(rawValue);
    headers.set(name, value);
  }

  return headers;
}

export function extractBearerToken(authorizationHeader) {
  const headerValues = Array.isArray(authorizationHeader) ? authorizationHeader : [authorizationHeader];

  for (const headerValue of headerValues) {
    if (typeof headerValue !== 'string') {
      continue;
    }

    const match = headerValue.match(/^\s*Bearer\s+(.+?)\s*$/i);
    const token = match?.[1]?.trim();
    if (token) {
      return token;
    }
  }

  return null;
}

function getSupabaseAuthConfig() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase URL and anon key are required for auth verification.');
  }

  return { supabaseUrl, anonKey };
}

function getGoogleAuthConfig() {
  const projectNumber = process.env.GCP_PROJECT_NUMBER;
  const workloadIdentityPoolId = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
  const workloadIdentityPoolProviderId = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;
  const serviceAccountEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL;

  const missingEnv = [
    ['GCP_PROJECT_NUMBER', projectNumber],
    ['GCP_WORKLOAD_IDENTITY_POOL_ID', workloadIdentityPoolId],
    ['GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID', workloadIdentityPoolProviderId],
    ['GCP_SERVICE_ACCOUNT_EMAIL', serviceAccountEmail],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missingEnv.length > 0) {
    throw new Error(`Google Cloud Workload Identity Federation env is required: ${missingEnv.join(', ')}`);
  }

  return {
    projectNumber,
    serviceAccountEmail,
    workloadIdentityPoolId,
    workloadIdentityPoolProviderId,
  };
}

function createExternalAccountClient(config) {
  const client = ExternalAccountClient.fromJSON({
    type: 'external_account',
    audience:
      `//iam.googleapis.com/projects/${config.projectNumber}` +
      `/locations/global/workloadIdentityPools/${config.workloadIdentityPoolId}` +
      `/providers/${config.workloadIdentityPoolProviderId}`,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    token_url: 'https://sts.googleapis.com/v1/token',
    subject_token_supplier: {
      getSubjectToken: getVercelOidcToken,
    },
  });

  if (!client) {
    throw new Error('Failed to create Google external account client.');
  }

  return client;
}

async function createCloudRunAuthorizationHeader() {
  const googleAuthConfig = getGoogleAuthConfig();
  const externalAccountClient = createExternalAccountClient(googleAuthConfig);
  const accessToken = await externalAccountClient.getAccessToken();

  if (!accessToken?.token) {
    throw new Error('Google STS did not return an access token.');
  }

  const response = await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${googleAuthConfig.serviceAccountEmail}:generateIdToken`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        audience: getCloudRunTargetAudience(),
        includeEmail: true,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`IAM Credentials generateIdToken failed with status ${response.status}`);
  }

  const payload = await response.json();
  if (!payload?.token) {
    throw new Error('IAM Credentials generateIdToken response did not include a token.');
  }

  return `Bearer ${payload.token}`;
}

export async function verifySupabaseAccessToken(accessToken) {
  const { supabaseUrl, anonKey } = getSupabaseAuthConfig();
  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    method: 'GET',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Supabase auth verification failed with status ${response.status}`);
  }

  const user = await response.json();
  if (!user?.id) {
    throw new Error('Supabase auth verification response did not include a user id');
  }

  return user;
}

async function readRequestBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return undefined;
  }

  if (req.body !== undefined) {
    return typeof req.body === 'string' || Buffer.isBuffer(req.body)
      ? req.body
      : JSON.stringify(req.body);
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json');
  res.send(JSON.stringify(payload));
}

export default async function proxySolverApi(req, res) {
  const accessToken = extractBearerToken(req.headers?.authorization);
  if (!accessToken) {
    sendJson(res, 401, { code: 'unauthorized', message: 'Authorization required' });
    return;
  }

  let user;
  try {
    user = await verifySupabaseAccessToken(accessToken);
  } catch (error) {
    console.error('[solver-proxy] Supabase auth verification failed:', error);
    sendJson(res, 500, { code: 'auth_verification_failed', message: 'Auth verification failed' });
    return;
  }

  if (!user) {
    sendJson(res, 401, { code: 'unauthorized', message: 'Invalid authorization token' });
    return;
  }

  const targetUrl = buildCloudRunApiUrl(req.url || '', req.query?.path);
  let cloudRunAuthorization;
  try {
    cloudRunAuthorization = await createCloudRunAuthorizationHeader();
  } catch (error) {
    console.error('[solver-proxy] Cloud Run auth failed:', error);
    sendJson(res, 502, { code: 'cloud_run_auth_failed', message: 'Cloud Run authentication failed' });
    return;
  }

  const headers = createForwardHeaders(req.headers);
  headers.set('Authorization', cloudRunAuthorization);

  const response = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: await readRequestBody(req),
  });

  res.statusCode = response.status;
  response.headers.forEach((value, name) => {
    if (!blockedResponseHeaderNames.has(name.toLowerCase())) {
      res.setHeader(name, value);
    }
  });

  res.send(Buffer.from(await response.arrayBuffer()));
}
