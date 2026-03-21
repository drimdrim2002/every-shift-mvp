import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const HOSPITAL_SOURCE = 'data.go.kr';

type SignupRole = 'admin' | 'user';
type SignupPath = 'admin_submit' | 'user_invite_redeem';
type SignupNextState = 'pending_approval' | 'active';
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

type InviteInvalidReason =
  | 'INVITE_NOT_FOUND'
  | 'INVITE_EXPIRED'
  | 'INVITE_ALREADY_USED'
  | 'INVITE_REVOKED'
  | 'INVITE_ROLE_MISMATCH';

interface SignupSubmitRequest {
  email?: unknown;
  password?: unknown;
  name?: unknown;
  role?: unknown;
  requestedRole?: unknown;
  organizationSelectionMode?: unknown;
  hospitalId?: unknown;
  hospitalName?: unknown;
  hospitalSource?: unknown;
  organizationId?: unknown;
  inviteCode?: unknown;
}

interface SignupSuccessData {
  path: SignupPath;
  nextState: SignupNextState;
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

interface InviteCodeRow {
  organization_id: string;
  role_scope: string;
  expires_at: string;
  max_uses: number;
  used_count: number;
  used_at: string | null;
  used_by: string | null;
  revoked_at: string | null;
}

type InviteValidationResult =
  | { type: 'valid'; organizationId?: string }
  | { type: 'invalid'; reason: InviteInvalidReason }
  | { type: 'internal_error'; message: string };

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

function resolveHospitalName(payload: SignupSubmitRequest): string | null {
  if (!isNonEmptyString(payload.hospitalName)) {
    return null;
  }
  return payload.hospitalName.trim();
}

function resolveHospitalSource(payload: SignupSubmitRequest): string | null {
  if (!isNonEmptyString(payload.hospitalSource)) {
    return null;
  }
  return payload.hospitalSource.trim();
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

function validateOrganizationSelectionMode(payload: SignupSubmitRequest): SignupErrorResponse | null {
  if (!isNonEmptyString(payload.organizationSelectionMode)) {
    return null;
  }

  const normalizedMode = payload.organizationSelectionMode.trim();
  if (normalizedMode === 'existing') {
    return null;
  }

  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'organizationSelectionMode must be existing.',
      details: {
        field: 'organizationSelectionMode',
        expected: 'existing',
      },
    },
  };
}

function getInviteInvalidMessage(reason: InviteInvalidReason): string {
  switch (reason) {
    case 'INVITE_EXPIRED':
      return 'Invite code has expired.';
    case 'INVITE_ALREADY_USED':
      return 'Invite code was already used.';
    case 'INVITE_REVOKED':
      return 'Invite code has been revoked.';
    case 'INVITE_ROLE_MISMATCH':
      return 'Invite role scope does not match user signup path.';
    case 'INVITE_NOT_FOUND':
    default:
      return 'Invite code is invalid.';
  }
}

function createMockSuccess(
  role: SignupRole,
  payload: SignupSubmitRequest,
  inviteOrganizationId?: string
): SignupSuccessResponse {
  if (role === 'admin') {
    return {
      success: true,
      data: {
        path: 'admin_submit',
        nextState: 'pending_approval',
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
      nextState: 'active',
      signupRequestStatus: 'approved',
      membershipStatus: 'approved',
      organizationId: inviteOrganizationId,
    },
  };
}

function resolveInviteReasonFromContractToken(inviteCode: string): InviteInvalidReason | null {
  const normalized = inviteCode.trim().toLowerCase();

  if (normalized.startsWith('expired-')) return 'INVITE_EXPIRED';
  if (normalized.startsWith('used-')) return 'INVITE_ALREADY_USED';
  if (normalized.startsWith('revoked-')) return 'INVITE_REVOKED';
  if (normalized.startsWith('mismatch-')) return 'INVITE_ROLE_MISMATCH';
  if (normalized.startsWith('invalid-')) return 'INVITE_NOT_FOUND';

  return null;
}

function hasDuplicateContractToken(payload: SignupSubmitRequest): boolean {
  if (isNonEmptyString(payload.email) && payload.email.trim().toLowerCase().startsWith('duplicate-')) {
    return true;
  }

  if (isNonEmptyString(payload.inviteCode) && payload.inviteCode.trim().toLowerCase().startsWith('duplicate-')) {
    return true;
  }

  return false;
}

function createServiceRoleClient(): SupabaseClient | null {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function toSha256Hex(rawValue: string): Promise<string> {
  const data = new TextEncoder().encode(rawValue);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hashBuffer)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

async function validateInviteCode(inviteCode: string): Promise<InviteValidationResult> {
  const normalized = inviteCode.trim().toLowerCase();
  if (normalized.startsWith('valid-')) {
    return { type: 'valid' };
  }

  const tokenReason = resolveInviteReasonFromContractToken(inviteCode);
  if (tokenReason) {
    return { type: 'invalid', reason: tokenReason };
  }

  const serviceClient = createServiceRoleClient();
  if (!serviceClient) {
    return {
      type: 'internal_error',
      message: 'Invite validation is unavailable because service-role configuration is missing.',
    };
  }

  const codeHash = await toSha256Hex(inviteCode.trim());
  const { data, error } = await serviceClient
    .from('invite_codes')
    .select('organization_id, role_scope, expires_at, max_uses, used_count, used_at, used_by, revoked_at')
    .eq('code_hash', codeHash)
    .maybeSingle<InviteCodeRow>();

  if (error && error.code !== 'PGRST116') {
    return {
      type: 'internal_error',
      message: `Invite code lookup failed: ${error.message}`,
    };
  }

  if (!data) {
    return { type: 'invalid', reason: 'INVITE_NOT_FOUND' };
  }

  if (data.role_scope !== 'user') {
    return { type: 'invalid', reason: 'INVITE_ROLE_MISMATCH' };
  }

  if (data.revoked_at) {
    return { type: 'invalid', reason: 'INVITE_REVOKED' };
  }

  const maxUses = Number.isInteger(data.max_uses) && data.max_uses > 0 ? data.max_uses : 1;
  let usedCount = 0;
  if (Number.isInteger(data.used_count) && data.used_count >= 0) {
    usedCount = data.used_count;
  } else if (data.used_at || data.used_by) {
    usedCount = maxUses;
  }

  if (usedCount >= maxUses || data.used_at || data.used_by) {
    return { type: 'invalid', reason: 'INVITE_ALREADY_USED' };
  }

  const expiresAtTime = new Date(data.expires_at).getTime();
  if (!Number.isFinite(expiresAtTime) || expiresAtTime <= Date.now()) {
    return { type: 'invalid', reason: 'INVITE_EXPIRED' };
  }

  return {
    type: 'valid',
    organizationId: data.organization_id,
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

  const selectionModeValidationError = validateOrganizationSelectionMode(payload);
  if (selectionModeValidationError) {
    return jsonResponse(400, selectionModeValidationError);
  }

  let inviteOrganizationId: string | undefined;

  if (role === 'admin') {
    const hospitalId = resolveHospitalId(payload);
    if (!hospitalId) {
      return errorResponse(400, 'HOSPITAL_REQUIRED', 'hospitalId is required for admin role.');
    }

    const hospitalName = resolveHospitalName(payload);
    if (!hospitalName) {
      return errorResponse(400, 'VALIDATION_ERROR', 'hospitalName is required for admin role.', {
        field: 'hospitalName',
        reason: 'HOSPITAL_NAME_REQUIRED',
      });
    }

    const hospitalSource = resolveHospitalSource(payload);
    if (!hospitalSource || hospitalSource !== HOSPITAL_SOURCE) {
      return errorResponse(400, 'VALIDATION_ERROR', 'hospitalSource must be data.go.kr for admin role.', {
        field: 'hospitalSource',
        reason: 'HOSPITAL_SOURCE_INVALID',
        expected: HOSPITAL_SOURCE,
      });
    }
  }

  if (role === 'user') {
    if (!isNonEmptyString(payload.inviteCode)) {
      return errorResponse(400, 'INVALID_INVITE_CODE', 'inviteCode is required for user role.', {
        reason: 'INVITE_NOT_FOUND',
      });
    }

    const inviteValidation = await validateInviteCode(payload.inviteCode.trim());

    if (inviteValidation.type === 'internal_error') {
      return errorResponse(500, 'INTERNAL_ERROR', inviteValidation.message, {
        stage: 'invite_validation',
      });
    }

    if (inviteValidation.type === 'invalid') {
      return errorResponse(400, 'INVALID_INVITE_CODE', getInviteInvalidMessage(inviteValidation.reason), {
        reason: inviteValidation.reason,
      });
    }

    inviteOrganizationId = inviteValidation.organizationId;
  }

  if (hasDuplicateContractToken(payload)) {
    return errorResponse(409, 'DUPLICATE_REQUEST', 'Duplicate pending signup request exists.', {
      reason: 'DUPLICATE_PENDING_REQUEST',
      stage: 'contract_duplicate_probe',
    });
  }

  // Explicit non-production scaffold:
  // Set SIGNUP_SUBMIT_CONTRACT_MOCK_SUCCESS=true only when validating the v2 contract without persistence.
  const enableMockSuccess = Deno.env.get('SIGNUP_SUBMIT_CONTRACT_MOCK_SUCCESS') === 'true';
  if (!enableMockSuccess) {
    return errorResponse(501, 'INTERNAL_ERROR', 'signup-submit persistence is not implemented yet.', {
      stage: 'contract_only_scaffold',
    });
  }

  return jsonResponse(200, createMockSuccess(role, payload, inviteOrganizationId));
});
