import { ContractError, type ErrorEnvelope } from './contracts.ts';
import { createCorsHeaders } from './cors.ts';

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
  return new Response(JSON.stringify(body), withCorsHeaders(request, { status }));
}

export function errorEnvelopeFromUnknown(error: unknown): ErrorEnvelope {
  if (error instanceof ContractError) {
    return { code: error.code, message: error.message };
  }

  if (error === 'single_version_policy_violation') {
    return {
      code: 'single_version_policy_violation',
      message: 'single_version_policy_violation',
    };
  }

  if (typeof error === 'object' && error !== null) {
    const candidate = error as { code?: unknown; message?: unknown };

    if (candidate.code === 'single_version_policy_violation') {
      return {
        code: 'single_version_policy_violation',
        message:
          typeof candidate.message === 'string'
            ? candidate.message
            : 'single_version_policy_violation',
      };
    }

    if (typeof candidate.code === 'string' && typeof candidate.message === 'string') {
      return {
        code: candidate.code,
        message: candidate.message,
      };
    }
  }

  if (error instanceof Error) {
    if (error.message === 'single_version_policy_violation') {
      return {
        code: 'single_version_policy_violation',
        message: error.message,
      };
    }

    return {
      code: 'internal_error',
      message: error.message,
    };
  }

  return {
    code: 'internal_error',
    message: 'Internal server error',
  };
}

export function mapErrorToStatus(code: string): number {
  switch (code) {
    case 'unauthorized':
      return 401;
    case 'organization_context_missing':
    case 'organization_access_denied':
      return 403;
    case 'already_finalized':
    case 'invalid_selection_state':
    case 'solver_execution_mismatch':
    case 'stale_solver_callback':
    case 'another_version_solving':
    case 'stale_evaluation':
    case 'review_not_passed':
    case 'not_review_ready':
    case 'gate_blocked':
    case 'not_selected_version':
    case 'version_locked_for_solving':
    case 'version_name_exists':
    case 'version_finalized':
    case 'version_solving':
    case 'version_archived':
    case 'last_version':
    case 'single_version_policy_violation':
    case 'conflict':
      return 409;
    case 'not_found':
    case 'schedule_not_found':
    case 'version_not_found':
    case 'missing_schedule':
    case 'missing_version':
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
