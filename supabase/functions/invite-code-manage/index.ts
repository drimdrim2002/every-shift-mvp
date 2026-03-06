const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MOCK_PERMISSION_DENIED_TOKEN = '00000000-0000-0000-0000-000000000403';
const MOCK_NOT_FOUND_TOKEN = '00000000-0000-0000-0000-000000000404';
const MOCK_ALREADY_REVOKED_TOKEN = '00000000-0000-0000-0000-000000000410';
const MOCK_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001';
const MOCK_CREATED_BY = '00000000-0000-0000-0000-000000000001';

type InviteCodeManageAction = 'create' | 'revoke' | 'list';
type InviteCodeDerivedStatus = 'active' | 'expired' | 'used' | 'revoked';

type InviteCodeManageErrorCode =
  | 'VALIDATION_ERROR'
  | 'PERMISSION_DENIED'
  | 'INVITE_CODE_NOT_FOUND'
  | 'INVITE_CODE_ALREADY_REVOKED'
  | 'INTERNAL_ERROR';

interface InviteCodeManageRequest {
  action?: unknown;
  organizationId?: unknown;
  expiresAt?: unknown;
  maxUses?: unknown;
  inviteCodeId?: unknown;
  includeInactive?: unknown;
}

interface CreateInviteCodeSuccessData {
  action: 'create';
  inviteCodeId: string;
  organizationId: string;
  roleScope: 'user';
  rawCode: string;
  maxUses: 1;
  usedCount: 0;
  expiresAt: string;
  createdAt: string;
  createdBy: string;
  derivedStatus: 'active';
}

interface RevokeInviteCodeSuccessData {
  action: 'revoke';
  inviteCodeId: string;
  organizationId: string;
  revokedAt: string;
  derivedStatus: 'revoked';
}

interface InviteCodeListItem {
  inviteCodeId: string;
  roleScope: 'user';
  maxUses: 1;
  usedCount: 0 | 1;
  expiresAt: string;
  revokedAt: string | null;
  usedAt: string | null;
  createdAt: string;
  createdBy: string;
  derivedStatus: InviteCodeDerivedStatus;
}

interface ListInviteCodeSuccessData {
  action: 'list';
  organizationId: string;
  items: InviteCodeListItem[];
}

type InviteCodeManageSuccessData =
  | CreateInviteCodeSuccessData
  | RevokeInviteCodeSuccessData
  | ListInviteCodeSuccessData;

interface InviteCodeManageSuccessResponse {
  success: true;
  data: InviteCodeManageSuccessData;
}

interface InviteCodeManageErrorResponse {
  success: false;
  error: {
    code: InviteCodeManageErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

type InviteCodeManageResponse = InviteCodeManageSuccessResponse | InviteCodeManageErrorResponse;

function jsonResponse(status: number, body: InviteCodeManageResponse): Response {
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
  code: InviteCodeManageErrorCode,
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

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function normalizeAction(value: unknown): InviteCodeManageAction | null {
  if (value === 'create' || value === 'revoke' || value === 'list') {
    return value;
  }
  return null;
}

function normalizeBoolean(value: unknown, defaultValue: boolean): boolean | null {
  if (value === undefined) return defaultValue;
  if (typeof value === 'boolean') return value;
  return null;
}

function normalizeIsoTimestamp(value: unknown): string | null {
  if (!isNonEmptyString(value)) return null;
  const parsed = new Date(value.trim());
  if (!Number.isFinite(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function createMockRawCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const token = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `INV-${token.slice(0, 4)}-${token.slice(4, 8)}-${token.slice(8, 12)}`;
}

function createMockListItems(
  includeInactive: boolean,
  now: string,
  expiresAt: string
): InviteCodeListItem[] {
  const activeItem: InviteCodeListItem = {
    inviteCodeId: crypto.randomUUID(),
    roleScope: 'user',
    maxUses: 1,
    usedCount: 0,
    expiresAt,
    revokedAt: null,
    usedAt: null,
    createdAt: now,
    createdBy: MOCK_CREATED_BY,
    derivedStatus: 'active',
  };

  if (!includeInactive) {
    return [activeItem];
  }

  const revokedItem: InviteCodeListItem = {
    ...activeItem,
    inviteCodeId: crypto.randomUUID(),
    revokedAt: now,
    derivedStatus: 'revoked',
  };

  return [activeItem, revokedItem];
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

  let payload: InviteCodeManageRequest;
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return errorResponse(400, 'VALIDATION_ERROR', 'Request body must be a JSON object.');
    }
    payload = body as InviteCodeManageRequest;
  } catch {
    return errorResponse(400, 'VALIDATION_ERROR', 'Invalid JSON payload.');
  }

  const action = normalizeAction(payload.action);
  if (!action) {
    return errorResponse(400, 'VALIDATION_ERROR', 'action must be create, revoke, or list.', {
      field: 'action',
      allowedValues: ['create', 'revoke', 'list'],
    });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const enableMockSuccess = Deno.env.get('INVITE_CODE_MANAGE_CONTRACT_MOCK_SUCCESS') === 'true';

  if (action === 'create') {
    if (!isNonEmptyString(payload.organizationId) || !isUuid(payload.organizationId.trim())) {
      return errorResponse(400, 'VALIDATION_ERROR', 'organizationId must be a valid UUID.', {
        field: 'organizationId',
      });
    }

    if (payload.organizationId.trim() === MOCK_PERMISSION_DENIED_TOKEN) {
      return errorResponse(403, 'PERMISSION_DENIED', 'Caller cannot manage invite codes for this organization.', {
        organizationId: payload.organizationId.trim(),
      });
    }

    const expiresAt = normalizeIsoTimestamp(payload.expiresAt);
    if (!expiresAt) {
      return errorResponse(400, 'VALIDATION_ERROR', 'expiresAt must be a valid ISO-8601 timestamp.', {
        field: 'expiresAt',
      });
    }

    if (new Date(expiresAt).getTime() <= now.getTime()) {
      return errorResponse(400, 'VALIDATION_ERROR', 'expiresAt must be later than current server time.', {
        field: 'expiresAt',
      });
    }

    if (!enableMockSuccess) {
      return errorResponse(501, 'INTERNAL_ERROR', 'invite-code-manage persistence is not implemented yet.', {
        stage: 'contract_only_scaffold',
      });
    }

    return jsonResponse(200, {
      success: true,
      data: {
        action: 'create',
        inviteCodeId: crypto.randomUUID(),
        organizationId: payload.organizationId.trim(),
        roleScope: 'user',
        rawCode: createMockRawCode(),
        maxUses: 1,
        usedCount: 0,
        expiresAt,
        createdAt: nowIso,
        createdBy: MOCK_CREATED_BY,
        derivedStatus: 'active',
      },
    });
  }

  if (action === 'revoke') {
    if (!isNonEmptyString(payload.inviteCodeId) || !isUuid(payload.inviteCodeId.trim())) {
      return errorResponse(400, 'VALIDATION_ERROR', 'inviteCodeId must be a valid UUID.', {
        field: 'inviteCodeId',
      });
    }

    const inviteCodeId = payload.inviteCodeId.trim();
    if (inviteCodeId === MOCK_PERMISSION_DENIED_TOKEN) {
      return errorResponse(403, 'PERMISSION_DENIED', 'Caller cannot revoke this invite code.', {
        inviteCodeId,
      });
    }

    if (inviteCodeId === MOCK_NOT_FOUND_TOKEN) {
      return errorResponse(404, 'INVITE_CODE_NOT_FOUND', 'Invite code not found.', {
        inviteCodeId,
      });
    }

    if (inviteCodeId === MOCK_ALREADY_REVOKED_TOKEN) {
      return errorResponse(409, 'INVITE_CODE_ALREADY_REVOKED', 'Invite code is already revoked.', {
        inviteCodeId,
      });
    }

    if (!enableMockSuccess) {
      return errorResponse(501, 'INTERNAL_ERROR', 'invite-code-manage persistence is not implemented yet.', {
        stage: 'contract_only_scaffold',
      });
    }

    return jsonResponse(200, {
      success: true,
      data: {
        action: 'revoke',
        inviteCodeId,
        organizationId: MOCK_ORGANIZATION_ID,
        revokedAt: nowIso,
        derivedStatus: 'revoked',
      },
    });
  }

  if (!isNonEmptyString(payload.organizationId) || !isUuid(payload.organizationId.trim())) {
    return errorResponse(400, 'VALIDATION_ERROR', 'organizationId must be a valid UUID.', {
      field: 'organizationId',
    });
  }

  const organizationId = payload.organizationId.trim();
  if (organizationId === MOCK_PERMISSION_DENIED_TOKEN) {
    return errorResponse(403, 'PERMISSION_DENIED', 'Caller cannot list invite codes for this organization.', {
      organizationId,
    });
  }

  const includeInactive = normalizeBoolean(payload.includeInactive, true);
  if (includeInactive === null) {
    return errorResponse(400, 'VALIDATION_ERROR', 'includeInactive must be a boolean when provided.', {
      field: 'includeInactive',
    });
  }

  if (!enableMockSuccess) {
    return errorResponse(501, 'INTERNAL_ERROR', 'invite-code-manage persistence is not implemented yet.', {
      stage: 'contract_only_scaffold',
    });
  }

  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  return jsonResponse(200, {
    success: true,
    data: {
      action: 'list',
      organizationId,
      items: createMockListItems(includeInactive, nowIso, expiresAt),
    },
  });
});
