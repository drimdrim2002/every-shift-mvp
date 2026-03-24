import type { AccessState } from './rbac'

export type OrganizationType = 'hospital' | 'fire' | 'police' | 'logistics' | 'production'

export const PERSISTED_ORGANIZATION_TYPES = ['hospital', 'fire', 'police'] as const

export type PersistedOrganizationType = (typeof PERSISTED_ORGANIZATION_TYPES)[number]

export const ORGANIZATION_MANAGEMENT_ALLOWED_ACCESS_STATES = [
  'super_active',
  'admin_active',
] as const

export type OrganizationManagementAllowedAccessState =
  (typeof ORGANIZATION_MANAGEMENT_ALLOWED_ACCESS_STATES)[number]

export function isOrganizationType(value: string): value is OrganizationType {
  return ['hospital', 'fire', 'police', 'logistics', 'production'].includes(value)
}

export function isPersistedOrganizationType(
  value: string,
): value is PersistedOrganizationType {
  return PERSISTED_ORGANIZATION_TYPES.includes(value as PersistedOrganizationType)
}

export function normalizeOrganizationType(value: string): OrganizationType {
  if (isOrganizationType(value)) {
    return value
  }

  throw new Error(`Invalid organization type: ${value}`)
}

export function assertPersistedOrganizationType(
  value: string,
): PersistedOrganizationType {
  if (isPersistedOrganizationType(value)) {
    return value
  }

  throw new Error('조직 유형은 병원, 소방, 경찰만 저장할 수 있습니다.')
}

export interface Organization {
  id: string; // UUID
  name: string; // "세브란스병원"
  type: OrganizationType;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Weekly work constraint settings stored as JSONB in organization_settings.work_constraints
 */
export interface WorkConstraints {
  weeklyTargetHours: number; // default 40
  weeklyMaxHours: number;    // default 52
  weeklyOffDays: number;     // default 2
}

/**
 * Per-shift minimum rest hours stored as JSONB in organization_settings.minimum_rest_hours
 * key: shift code (e.g. "D", "E", "N"), value: hours
 */
export type MinimumRestHours = Record<string, number>

/**
 * Organization-level scheduling rules (maps to organization_settings table)
 */
export interface OrganizationSettings {
  id: string;
  organizationId: string;
  maxConsecutiveNightShifts: number | null;
  minimumRestHours: MinimumRestHours;
  workConstraints: WorkConstraints;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrganizationManagementScope {
  accessState: AccessState | null;
  organizationId: string | null;
}

export interface OrganizationProfileInput {
  name: string;
  type: PersistedOrganizationType;
}

export interface OrganizationProfilePatch {
  name?: string;
  type?: PersistedOrganizationType;
}

export type OrganizationSettingsSaveInput = Partial<
  Pick<
    OrganizationSettings,
    'maxConsecutiveNightShifts' | 'minimumRestHours' | 'workConstraints'
  >
>
