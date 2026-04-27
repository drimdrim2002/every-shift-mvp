const CLOUD_RUN_API_ORIGIN = 'https://every-shift-api-service-554455861916.asia-northeast3.run.app';

const blockedForwardHeaderNames = new Set([
  'connection',
  'content-length',
  'host',
  'origin',
  'referer',
  'transfer-encoding',
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

export default async function proxySolverApi(req, res) {
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
