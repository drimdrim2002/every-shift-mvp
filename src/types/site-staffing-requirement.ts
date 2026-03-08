/**
 * SiteStaffingRequirement — required headcount per site/shift/day-of-week.
 * Maps to `site_staffing_requirements` table (migration 007).
 *
 * Unique scope: (organization_id, site_id, shift_id, day_of_week,
 *                COALESCE(skill_id, uuid_zero), COALESCE(rank_id, uuid_zero))
 *
 * Semantics:
 *  - skill_id = null  → applies to all skills
 *  - rank_id  = null  → applies to all ranks
 *  - When both are null → base requirement; specialized rows add on top
 */
export interface SiteStaffingRequirement {
  id: string;
  organizationId: string;
  siteId: string;
  shiftId: string;
  dayOfWeek: number;        // 0 = Sunday … 6 = Saturday
  requiredCount: number;    // >= 0
  skillId?: string | null;
  rankId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Input type for bulk upsert (omits server-generated fields).
 */
export type SiteStaffingRequirementInput = Omit<
  SiteStaffingRequirement,
  'id' | 'createdAt' | 'updatedAt'
>

/**
 * Expanded monthly requirement entry (output of useSiteRequirements.expandToMonth).
 */
export interface MonthlyRequirement {
  date: string;             // YYYY-MM-DD
  dayOfWeek: number;        // 0–6
  siteId: string;
  shiftId: string;
  requiredCount: number;
  skillId?: string | null;
  rankId?: string | null;
}
