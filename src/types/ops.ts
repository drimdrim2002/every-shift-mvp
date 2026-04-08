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

export type OffRequestPolicyPeriodType = 'monthly' | 'annual';

export interface OffRequestPolicyRankCode {
  id?: string;
  code: string;
  label: string;
  displayOrder: number;
  isActive: boolean;
}

export interface OffRequestPolicyRule {
  id?: string;
  rankCode: string | null;
  periodType: OffRequestPolicyPeriodType;
  limitCount: number;
  isActive: boolean;
}

export interface OffRequestPolicyRankCodeRecord extends OffRequestPolicyRankCode {
  id: string;
  organizationId: string;
}

export interface OffRequestPolicyRuleRecord extends OffRequestPolicyRule {
  id: string;
  organizationId: string;
}

export interface OffRequestPolicySetupRequest {
  organizationId: string;
  rankCodes: OffRequestPolicyRankCode[];
  policyRules: OffRequestPolicyRule[];
}

export interface OffRequestPolicySetupResponse {
  organizationId: string;
  rankCodes: OffRequestPolicyRankCodeRecord[];
  policyRules: OffRequestPolicyRuleRecord[];
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
