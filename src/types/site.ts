/**
 * Site — a physical or logical ward/unit within an organization.
 * Maps to the `sites` table (migration 007).
 */
export interface Site {
  id: string;
  organizationId: string;
  code: string;   // unique within org, e.g. "ICU", "GW1"
  name: string;   // display name, e.g. "중환자실"
  createdAt?: string;
}
