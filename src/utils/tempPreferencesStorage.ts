import type {
  CommentMap,
  ConstraintMap,
  TempPreferencesEnvelopeV2,
} from '@/types/schedule';

export const TEMP_PREFERENCES_SCHEMA_VERSION = 2 as const;
export const TEMP_PREFERENCES_TTL_MS = 72 * 60 * 60 * 1000;
export const TEMP_PREFERENCES_V2_KEY_PREFIX = 'everyshift_temp_preferences_v2';
export const TEMP_PREFERENCES_LEGACY_KEY_PREFIX = 'everyshift_temp_preferences';
export const TEMP_SCHEDULE_LEGACY_KEY_PREFIX = 'everyshift_temp_schedule';

const MONTH_FORMAT_REGEX = /^\d{4}-\d{2}$/;

export interface TempPreferencesStorageScope {
  userId: string;
  organizationId: string;
  month: string;
}

export interface TempPreferencesReadResult {
  status: 'missing' | 'ok' | 'parse_error' | 'invalid' | 'scope_mismatch' | 'expired';
  storageKey: string;
  envelope: TempPreferencesEnvelopeV2 | null;
}

export interface LegacyTempPreferencesReadResult {
  status: 'missing' | 'ok' | 'parse_error' | 'invalid';
  storageKey: string;
  payload: { constraints: ConstraintMap; notes: CommentMap } | null;
}

export interface LegacyTempPreferencesMigrationResult {
  status:
    | 'no_scope'
    | 'already_migrated'
    | 'legacy_missing'
    | 'legacy_parse_error'
    | 'legacy_invalid'
    | 'migrated';
  storageKey: string | null;
  migratedEnvelope: TempPreferencesEnvelopeV2 | null;
}

type TempPreferencesPayload = { constraints: ConstraintMap; notes: CommentMap };

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isConstraintMap(value: unknown): value is ConstraintMap {
  return isRecord(value);
}

function isCommentMap(value: unknown): value is CommentMap {
  return isRecord(value);
}

export function buildTempPreferencesStorageScope(params: {
  userId?: string | null;
  organizationId?: string | null;
  month?: string | null;
}): TempPreferencesStorageScope | null {
  const userId = params.userId?.trim();
  const organizationId = params.organizationId?.trim();
  const month = params.month?.trim();

  if (!userId || !organizationId || !month || !MONTH_FORMAT_REGEX.test(month)) {
    return null;
  }

  return {
    userId,
    organizationId,
    month,
  };
}

export function buildTempPreferencesStorageKey(scope: TempPreferencesStorageScope): string {
  return `${TEMP_PREFERENCES_V2_KEY_PREFIX}:${scope.userId}:${scope.organizationId}:${scope.month}`;
}

export function parseTempPreferencesStorageKey(
  key: string
): TempPreferencesStorageScope | null {
  const [prefix, userId, organizationId, month, ...rest] = key.split(':');
  if (prefix !== TEMP_PREFERENCES_V2_KEY_PREFIX) return null;
  if (rest.length > 0) return null;

  return buildTempPreferencesStorageScope({
    userId,
    organizationId,
    month,
  });
}

export function buildLegacyTempPreferencesStorageKey(month: string): string {
  return `${TEMP_PREFERENCES_LEGACY_KEY_PREFIX}_${month}`;
}

export function buildLegacyTempScheduleStorageKey(month: string): string {
  return `${TEMP_SCHEDULE_LEGACY_KEY_PREFIX}_${month}`;
}

function isTempPreferencesEnvelopeV2(value: unknown): value is TempPreferencesEnvelopeV2 {
  if (!isRecord(value)) return false;

  return (
    value.schemaVersion === TEMP_PREFERENCES_SCHEMA_VERSION &&
    typeof value.ownerUserId === 'string' &&
    value.ownerUserId.trim().length > 0 &&
    typeof value.ownerOrganizationId === 'string' &&
    value.ownerOrganizationId.trim().length > 0 &&
    typeof value.month === 'string' &&
    MONTH_FORMAT_REGEX.test(value.month) &&
    typeof value.savedAt === 'string' &&
    isConstraintMap(value.constraints) &&
    isCommentMap(value.constraintNotes)
  );
}

export function writeTempPreferencesEnvelopeV2(
  scope: TempPreferencesStorageScope,
  constraints: ConstraintMap,
  constraintNotes: CommentMap,
  savedAt = new Date().toISOString()
): TempPreferencesEnvelopeV2 | null {
  if (!canUseLocalStorage()) return null;

  const envelope: TempPreferencesEnvelopeV2 = {
    schemaVersion: TEMP_PREFERENCES_SCHEMA_VERSION,
    ownerUserId: scope.userId,
    ownerOrganizationId: scope.organizationId,
    month: scope.month,
    savedAt,
    constraints,
    constraintNotes,
  };

  window.localStorage.setItem(buildTempPreferencesStorageKey(scope), JSON.stringify(envelope));
  return envelope;
}

export function readTempPreferencesEnvelopeV2(
  scope: TempPreferencesStorageScope,
  nowMs = Date.now()
): TempPreferencesReadResult {
  const storageKey = buildTempPreferencesStorageKey(scope);
  if (!canUseLocalStorage()) {
    return { status: 'missing', storageKey, envelope: null };
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return { status: 'missing', storageKey, envelope: null };
  }

  try {
    const parsed = JSON.parse(raw);
    if (!isTempPreferencesEnvelopeV2(parsed)) {
      return { status: 'invalid', storageKey, envelope: null };
    }

    if (
      parsed.ownerUserId !== scope.userId ||
      parsed.ownerOrganizationId !== scope.organizationId ||
      parsed.month !== scope.month
    ) {
      return { status: 'scope_mismatch', storageKey, envelope: null };
    }

    const savedAtMs = Date.parse(parsed.savedAt);
    if (!Number.isFinite(savedAtMs)) {
      return { status: 'invalid', storageKey, envelope: null };
    }

    if (nowMs - savedAtMs > TEMP_PREFERENCES_TTL_MS) {
      return { status: 'expired', storageKey, envelope: null };
    }

    return { status: 'ok', storageKey, envelope: parsed };
  } catch {
    window.localStorage.removeItem(storageKey);
    return { status: 'parse_error', storageKey, envelope: null };
  }
}

export function readLegacyTempPreferences(
  month: string
): LegacyTempPreferencesReadResult {
  const storageKey = buildLegacyTempPreferencesStorageKey(month);
  if (!canUseLocalStorage()) {
    return { status: 'missing', storageKey, payload: null };
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return { status: 'missing', storageKey, payload: null };
  }

  try {
    const parsed = JSON.parse(raw) as {
      constraints?: ConstraintMap;
      constraintNotes?: CommentMap;
    };

    if (
      (parsed.constraints !== undefined && !isConstraintMap(parsed.constraints)) ||
      (parsed.constraintNotes !== undefined && !isCommentMap(parsed.constraintNotes))
    ) {
      return { status: 'invalid', storageKey, payload: null };
    }

    return {
      status: 'ok',
      storageKey,
      payload: {
        constraints: parsed.constraints ?? {},
        notes: parsed.constraintNotes ?? {},
      },
    };
  } catch {
    window.localStorage.removeItem(storageKey);
    return { status: 'parse_error', storageKey, payload: null };
  }
}

export function migrateLegacyTempPreferencesToV2(
  scope: TempPreferencesStorageScope | null,
  options?: {
    nowMs?: number;
    sanitize?: (payload: TempPreferencesPayload) => TempPreferencesPayload;
  }
): LegacyTempPreferencesMigrationResult {
  if (!scope || !canUseLocalStorage()) {
    return {
      status: 'no_scope',
      storageKey: null,
      migratedEnvelope: null,
    };
  }

  const targetStorageKey = buildTempPreferencesStorageKey(scope);
  if (window.localStorage.getItem(targetStorageKey)) {
    return {
      status: 'already_migrated',
      storageKey: targetStorageKey,
      migratedEnvelope: null,
    };
  }

  const legacyResult = readLegacyTempPreferences(scope.month);
  if (legacyResult.status === 'missing') {
    return {
      status: 'legacy_missing',
      storageKey: legacyResult.storageKey,
      migratedEnvelope: null,
    };
  }

  if (legacyResult.status === 'parse_error') {
    return {
      status: 'legacy_parse_error',
      storageKey: legacyResult.storageKey,
      migratedEnvelope: null,
    };
  }

  if (legacyResult.status === 'invalid' || !legacyResult.payload) {
    return {
      status: 'legacy_invalid',
      storageKey: legacyResult.storageKey,
      migratedEnvelope: null,
    };
  }

  const payload = options?.sanitize
    ? options.sanitize(legacyResult.payload)
    : legacyResult.payload;
  const savedAt = new Date(options?.nowMs ?? Date.now()).toISOString();
  const migratedEnvelope = writeTempPreferencesEnvelopeV2(
    scope,
    payload.constraints,
    payload.notes,
    savedAt
  );

  window.localStorage.removeItem(legacyResult.storageKey);

  return {
    status: 'migrated',
    storageKey: targetStorageKey,
    migratedEnvelope,
  };
}

export function clearScopedTempPreferencesStorage(params: {
  userId?: string | null;
  organizationId?: string | null;
  month?: string | null;
}): string[] {
  if (!canUseLocalStorage()) return [];

  const removedKeys: string[] = [];
  const month = params.month?.trim();
  if (!month || !MONTH_FORMAT_REGEX.test(month)) {
    return removedKeys;
  }

  const v2Scope = buildTempPreferencesStorageScope({
    userId: params.userId,
    organizationId: params.organizationId,
    month,
  });

  if (v2Scope) {
    const v2Key = buildTempPreferencesStorageKey(v2Scope);
    window.localStorage.removeItem(v2Key);
    removedKeys.push(v2Key);
  }

  const legacyPreferencesKey = buildLegacyTempPreferencesStorageKey(month);
  const legacyScheduleKey = buildLegacyTempScheduleStorageKey(month);
  window.localStorage.removeItem(legacyPreferencesKey);
  window.localStorage.removeItem(legacyScheduleKey);
  removedKeys.push(legacyPreferencesKey, legacyScheduleKey);

  return removedKeys;
}
