/**
 * Rank — a job grade/level definition within an organization.
 * Maps to the `ranks` table (migration 007).
 * `credit` column is added in migration 012.
 */
export interface Rank {
  id: string;
  organizationId: string;
  code: string;       // unique within org, e.g. "RN", "LV1"
  name: string;       // display name, e.g. "일반 간호사", "레벨 1"
  credit?: number | null;  // numeric credit value (migration 012)
  createdAt?: string;
}
