const CLOUD_RUN_API_ORIGIN = 'https://every-shift-api-service-554455861916.asia-northeast3.run.app';

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

export function buildCloudRunApiUrl(requestUrl = '', pathParam = '') {
  const normalizedPathParam = normalizePathParam(pathParam);
  const path = normalizedPathParam
    ? `/api/${normalizedPathParam}`
    : requestUrl.startsWith('/api')
      ? requestUrl
      : `/api${requestUrl}`;

  return `${CLOUD_RUN_API_ORIGIN}${path}`;
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
  const response = await fetch(targetUrl, {
    method: req.method,
    headers: createForwardHeaders(req.headers),
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
