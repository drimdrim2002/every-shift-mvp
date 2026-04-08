export interface OrganizationProfileResponse {
  organizationId: string;
  name: string;
  type: string;
}

export interface OrganizationProfileRequest {
  organizationId: string;
  name: string;
  type: string;
}

export interface SiteRequest {
  code: string;
  name: string;
  isActive: boolean;
  isScheduleActive: boolean;
}

export interface SiteResponse extends SiteRequest {
  id: string;
  organizationId: string;
}

export interface SitesRequest {
  organizationId: string;
  sites: SiteRequest[];
}

export interface SitesResponse {
  organizationId: string;
  pilotSiteId: string | null;
  sites: SiteResponse[];
}

export interface ShiftsConstraintsResponse {
  organizationId: string;
  minimumRestHours: number;
  checklistCursor: string;
}

export interface ShiftsConstraintsRequest {
  organizationId: string;
  minimumRestHours: number;
  checklistCursor: string;
}
