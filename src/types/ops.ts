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

export interface EmployeeImportEmployeePreview {
  employeeId: string;
  name: string;
  availableShifts: string[];
  rankCode?: string | null;
}

export interface EmployeeImportValidateRequest {
  organizationId: string;
  month: string;
  employees: EmployeeImportEmployeePreview[];
}

export interface EmployeeImportValidateResponse {
  organizationId: string;
  month: string;
  employeeCount: number;
  duplicateEmployeeIds: string[];
  missingShiftCodes: string[];
  isFinalized: boolean;
  isValid: boolean;
  previewEmployees: EmployeeImportEmployeePreview[];
}

export type EmployeeImportApplyRequest = EmployeeImportValidateRequest;

export interface EmployeeImportApplyResponse extends EmployeeImportValidateResponse {
  deletedScheduleId: string | null;
}
