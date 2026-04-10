const DEFAULT_ALLOW_HEADERS = 'authorization, x-client-info, content-type, apikey';
const ALLOW_METHODS = 'GET,POST,PUT,PATCH,OPTIONS';

export function createCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  const requestedHeaders = request.headers.get('access-control-request-headers');

  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': origin && origin.length > 0 ? origin : '*',
    'Access-Control-Allow-Headers':
      requestedHeaders && requestedHeaders.length > 0 ? requestedHeaders : DEFAULT_ALLOW_HEADERS,
    'Access-Control-Allow-Methods': ALLOW_METHODS,
    Vary: 'Origin, Access-Control-Request-Headers',
  };

  if (origin && origin.length > 0) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}
