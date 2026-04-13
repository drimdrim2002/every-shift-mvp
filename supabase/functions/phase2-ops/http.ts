import { ContractError, type ErrorEnvelope } from './contracts.ts';
import { createCorsHeaders } from './cors.ts';

export type ApiErrorResponseBody = ErrorEnvelope;

export function withCorsHeaders(request: Request, init: ResponseInit = {}): ResponseInit {
  return {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...createCorsHeaders(request),
      ...(init.headers || {}),
    },
  };
}

export function createJsonResponse(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    ...withCorsHeaders(request, { status }),
  });
}

export function errorEnvelopeFromUnknown(error: unknown): ErrorEnvelope {
  if (error instanceof ContractError) {
    return { code: error.code, message: error.message };
  }

  if (error instanceof Error) {
    return { code: 'internal_error', message: error.message };
  }

  return { code: 'internal_error', message: 'Internal server error' };
}

export function mapErrorToStatus(code: string): number {
  switch (code) {
    case 'unauthorized':
      return 401;
    case 'organization_access_denied':
      return 403;
    case 'not_found':
      return 404;
    case 'method_not_allowed':
      return 405;
    case 'bad_request':
      return 400;
    default:
      return 500;
  }
}

export function errorStatusFromUnknown(error: unknown): number {
  if (error instanceof ContractError) {
    return error.status;
  }

  const envelope = errorEnvelopeFromUnknown(error);
  return mapErrorToStatus(envelope.code);
}

export function createErrorResponse(request: Request, error: unknown): Response {
  return createJsonResponse(
    request,
    errorEnvelopeFromUnknown(error),
    errorStatusFromUnknown(error)
  );
}
