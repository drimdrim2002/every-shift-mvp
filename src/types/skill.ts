/**
 * Skill — a clinical or professional competency tag.
 * Maps to the `skills` table (migration 007).
 */
export interface Skill {
  id: string;
  organizationId: string;
  code: string;   // unique within org, e.g. "GENERAL", "ICU"
  name: string;   // display name, e.g. "일반", "중환자"
  createdAt?: string;
}
