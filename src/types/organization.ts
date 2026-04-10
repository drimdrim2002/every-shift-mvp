export interface OrganizationFoundationMetadata {
  currentStepKey: string | null;
  organizationInfoConfirmedAt: string | null;
  organizationInfoConfirmedBy: string | null;
}

export interface Organization {
  id: string; // UUID
  name: string; // "세브란스병원"
  type: string; // "hospital", "fire", "police"
  createdAt?: string;
  updatedAt?: string;
  foundation?: OrganizationFoundationMetadata | null;
}
