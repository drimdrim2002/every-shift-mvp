export interface OrganizationProfileResponse {
  organizationId: string;
  name: string;
  type: string;
}

export type OrganizationProfileRequest = OrganizationProfileResponse;

export interface SiteRecord {
  id?: string;
  organizationId?: string;
  code: string;
  name: string;
  isActive: boolean;
  isScheduleActive: boolean;
}

export interface SitesResponse {
  organizationId: string;
  pilotSiteId: string | null;
  sites: SiteRecord[];
}

export interface SitesRequest {
  organizationId: string;
  sites: SiteRecord[];
}

export interface ShiftsConstraintsResponse {
  organizationId: string;
  minimumRestHours: number;
  checklistCursor: string;
}

export type ShiftsConstraintsRequest = ShiftsConstraintsResponse;
