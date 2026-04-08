export type HttpMethod = 'POST' | 'OPTIONS';
export type RouteName = 'bootstrapAdmin';

export interface ErrorEnvelope {
  code: string;
  message: string;
}

export interface Phase2OpsAuthContext {
  operatorToken: string;
}

export interface BootstrapAdminInitializationFlags {
  createPilotSite: boolean;
  seedOrganizationSettings: boolean;
}

export interface BootstrapAdminRequest {
  organizationId: string;
  targetEmail: string;
  displayName: string;
  onboardingInitializationFlags: BootstrapAdminInitializationFlags;
}

export interface BootstrapAdminResponse {
  organizationId: string;
  targetEmail: string;
  displayName: string;
  operatorUserId: string;
  onboardingInitializationFlags: BootstrapAdminInitializationFlags;
}

export class ContractError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = 'ContractError';
  }
}

export interface RouteMatch {
  route: RouteName;
  params: Record<string, string>;
}

interface RouteDefinition {
  name: RouteName;
  methods: HttpMethod[];
  segments: string[];
}

const ROUTE_DEFINITIONS: RouteDefinition[] = [
  {
    name: 'bootstrapAdmin',
    methods: ['POST'],
    segments: ['bootstrap-admin'],
  },
];

export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizePathSegments(pathname: string): string[] {
  const cleaned = pathname
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean);
  const boundaryIndex = cleaned.findIndex((segment) => segment === 'phase2-ops');

  return boundaryIndex >= 0 ? cleaned.slice(boundaryIndex + 1) : cleaned;
}

export function matchRoute(segments: string[]): RouteMatch | null {
  for (const definition of ROUTE_DEFINITIONS) {
    if (definition.segments.length !== segments.length) {
      continue;
    }

    const params: Record<string, string> = {};
    let matches = true;

    for (let index = 0; index < definition.segments.length; index += 1) {
      const pattern = definition.segments[index];
      const value = segments[index];

      if (!value) {
        matches = false;
        break;
      }

      if (pattern.startsWith(':')) {
        params[pattern.slice(1)] = value;
        continue;
      }

      if (pattern !== value) {
        matches = false;
        break;
      }
    }

    if (matches) {
      return { route: definition.name, params };
    }
  }

  return null;
}

export function allowedMethods(routeName: RouteName): HttpMethod[] {
  return ROUTE_DEFINITIONS.find((route) => route.name === routeName)?.methods ?? [];
}

export async function parseJsonBody(request: Request): Promise<unknown> {
  const rawBody = await request.text();

  if (!rawBody) {
    throw new ContractError('bad_request', 'Request body is required', 400);
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new ContractError('bad_request', 'Request body must be valid JSON', 400);
  }
}

export function parseOperatorAuthorization(request: Request): string {
  const headerValue = request.headers.get('authorization') ?? request.headers.get('Authorization');

  if (!headerValue) {
    throw new ContractError('unauthorized', 'Operator authorization bearer token is required', 401);
  }

  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (!token) {
    throw new ContractError('unauthorized', 'Operator authorization bearer token is required', 401);
  }

  return token;
}

function parseBootstrapAdminInitializationFlags(value: unknown): BootstrapAdminInitializationFlags {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ContractError(
      'bad_request',
      'onboardingInitializationFlags must be a JSON object',
      400
    );
  }

  const record = value as Record<string, unknown>;
  const allowedKeys: (keyof BootstrapAdminInitializationFlags)[] = [
    'createPilotSite',
    'seedOrganizationSettings',
  ];

  for (const key of Object.keys(record)) {
    if (!allowedKeys.includes(key as keyof BootstrapAdminInitializationFlags)) {
      throw new ContractError(
        'bad_request',
        `onboardingInitializationFlags contains unsupported key: ${key}`,
        400
      );
    }
  }

  for (const key of allowedKeys) {
    if (typeof record[key] !== 'boolean') {
      throw new ContractError(
        'bad_request',
        `onboardingInitializationFlags.${key} must be a boolean`,
        400
      );
    }
  }

  return {
    createPilotSite: record.createPilotSite as boolean,
    seedOrganizationSettings: record.seedOrganizationSettings as boolean,
  };
}

export function parseBootstrapAdminRequest(payload: unknown): BootstrapAdminRequest {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new ContractError('bad_request', 'bootstrap admin request must be a JSON object', 400);
  }

  const record = payload as Record<string, unknown>;
  const organizationId = typeof record.organizationId === 'string' ? record.organizationId.trim() : '';
  const targetEmail = typeof record.targetEmail === 'string' ? record.targetEmail.trim() : '';
  const displayName = typeof record.displayName === 'string' ? record.displayName.trim() : '';

  if (!organizationId || !isValidUuid(organizationId)) {
    throw new ContractError('bad_request', 'organizationId must be a valid UUID', 400);
  }

  if (!targetEmail || !isValidEmail(targetEmail)) {
    throw new ContractError('bad_request', 'targetEmail must be a valid email address', 400);
  }

  if (!displayName) {
    throw new ContractError('bad_request', 'displayName is required', 400);
  }

  return {
    organizationId,
    targetEmail,
    displayName,
    onboardingInitializationFlags: parseBootstrapAdminInitializationFlags(
      record.onboardingInitializationFlags
    ),
  };
}

export function parseBootstrapAdminResponse(payload: unknown): BootstrapAdminResponse {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new ContractError('bad_request', 'bootstrap admin response must be a JSON object', 400);
  }

  const record = payload as Record<string, unknown>;
  const organizationId = typeof record.organizationId === 'string' ? record.organizationId.trim() : '';
  const targetEmail = typeof record.targetEmail === 'string' ? record.targetEmail.trim() : '';
  const displayName = typeof record.displayName === 'string' ? record.displayName.trim() : '';
  const operatorUserId = typeof record.operatorUserId === 'string' ? record.operatorUserId.trim() : '';

  if (!organizationId || !isValidUuid(organizationId)) {
    throw new ContractError('bad_request', 'organizationId must be a valid UUID', 400);
  }

  if (!targetEmail || !isValidEmail(targetEmail)) {
    throw new ContractError('bad_request', 'targetEmail must be a valid email address', 400);
  }

  if (!displayName) {
    throw new ContractError('bad_request', 'displayName is required', 400);
  }

  if (!operatorUserId || !isValidUuid(operatorUserId)) {
    throw new ContractError('bad_request', 'operatorUserId must be a valid UUID', 400);
  }

  return {
    organizationId,
    targetEmail,
    displayName,
    operatorUserId,
    onboardingInitializationFlags: parseBootstrapAdminInitializationFlags(
      record.onboardingInitializationFlags
    ),
  };
}
