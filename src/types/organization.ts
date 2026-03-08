export type OrganizationType = 'hospital' | 'fire' | 'police' | 'logistics' | 'production'

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
