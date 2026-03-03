const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

type SignupRole = 'admin' | 'user';
type SignupPath = 'admin_submit' | 'user_invite_redeem';
type SignupRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'withdrawn';
type MembershipStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'none';

type SignupErrorCode =
  | 'INVALID_ROLE'
  | 'INVALID_INVITE_CODE'
  | 'HOSPITAL_REQUIRED'
  | 'DUPLICATE_REQUEST'
  | 'VALIDATION_ERROR'
  | 'PERMISSION_DENIED'
  | 'INTERNAL_ERROR';

interface SignupSubmitRequest {
  email?: unknown;
  password?: unknown;
  name?: unknown;
  role?: unknown;
  requestedRole?: unknown;
  hospitalId?: unknown;
  organizationId?: unknown;
  inviteCode?: unknown;
}

interface SignupSuccessData {
  path: SignupPath;
  signupRequestStatus: SignupRequestStatus;
  membershipStatus: MembershipStatus;
  signupRequestId?: string;
  organizationId?: string;
}

interface SignupErrorPayload {
  code: SignupErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

interface SignupSuccessResponse {
  success: true;
  data: SignupSuccessData;
}

interface SignupErrorResponse {
  success: false;
  error: SignupErrorPayload;
}

type SignupSubmitResponse = SignupSuccessResponse | SignupErrorResponse;

function jsonResponse(status: number, body: SignupSubmitResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  });
}

function errorResponse(
  status: number,
  code: SignupErrorCode,
  message: string,
  details?: Record<string, unknown>
): Response {
  return jsonResponse(status, {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeRole(payload: SignupSubmitRequest): SignupRole | null {
  const rawRole = payload.role ?? payload.requestedRole;
  if (rawRole === 'admin' || rawRole === 'user') {
    return rawRole;
  }
  return null;
}

function resolveHospitalId(payload: SignupSubmitRequest): string | null {
  if (isNonEmptyString(payload.hospitalId)) return payload.hospitalId.trim();
  if (isNonEmptyString(payload.organizationId)) return payload.organizationId.trim();
  return null;
}

function validateCommonFields(payload: SignupSubmitRequest): SignupErrorResponse | null {
  if (!isNonEmptyString(payload.email) || !EMAIL_PATTERN.test(payload.email.trim())) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'A valid email is required.',
        details: { field: 'email' },
      },
    };
  }

  if (!isNonEmptyString(payload.password) || payload.password.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
        details: { field: 'password', minLength: MIN_PASSWORD_LENGTH },
      },
    };
  }

  if (!isNonEmptyString(payload.name)) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Name is required.',
        details: { field: 'name' },
      },
    };
  }

  return null;
}

function createMockSuccess(role: SignupRole, payload: SignupSubmitRequest): SignupSuccessResponse {
  if (role === 'admin') {
    return {
      success: true,
      data: {
        path: 'admin_submit',
        signupRequestStatus: 'pending',
        membershipStatus: 'none',
        organizationId: resolveHospitalId(payload) ?? undefined,
      },
    };
  }

  return {
    success: true,
    data: {
      path: 'user_invite_redeem',
      signupRequestStatus: 'approved',
      membershipStatus: 'approved',
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'INTERNAL_ERROR', 'Only POST is supported.');
  }

  let payload: SignupSubmitRequest;
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return errorResponse(400, 'VALIDATION_ERROR', 'Request body must be a JSON object.');
    }
    payload = body as SignupSubmitRequest;
  } catch {
    return errorResponse(400, 'VALIDATION_ERROR', 'Invalid JSON payload.');
  }

  const role = normalizeRole(payload);
  if (!role) {
    return errorResponse(400, 'INVALID_ROLE', 'Role must be either admin or user.');
  }

  const commonValidationError = validateCommonFields(payload);
  if (commonValidationError) {
    return jsonResponse(400, commonValidationError);
  }

  if (role === 'admin') {
    const hospitalId = resolveHospitalId(payload);
    if (!hospitalId) {
      return errorResponse(400, 'HOSPITAL_REQUIRED', 'hospitalId is required for admin role.');
    }
  }

  if (role === 'user') {
    if (!isNonEmptyString(payload.inviteCode)) {
      return errorResponse(400, 'INVALID_INVITE_CODE', 'inviteCode is required for user role.');
    }
  }

  // Contract-only scaffold:
  // Set SIGNUP_SUBMIT_CONTRACT_MOCK_SUCCESS=true to return success envelopes for API integration checks.
  const enableMockSuccess = Deno.env.get('SIGNUP_SUBMIT_CONTRACT_MOCK_SUCCESS') === 'true';
  if (!enableMockSuccess) {
    return errorResponse(501, 'INTERNAL_ERROR', 'signup-submit persistence is not implemented yet.', {
      stage: 'contract_only_scaffold',
    });
  }

  return jsonResponse(200, createMockSuccess(role, payload));
});
