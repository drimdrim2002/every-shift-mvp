export interface OrganizationProfileResponse {
  organizationId: string;
  name: string;
  type: string;
}

export type FoundationSaveState = 'empty' | 'dirty' | 'saving' | 'saved' | 'error';

export interface OrganizationProfileRequest {
  organizationId: string;
  name: string;
  type: string;
}

export interface SiteRequest {
  code: string;
  name: string;
}

export interface SiteResponse {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  isActive: boolean;
  isScheduleActive: boolean;
}

export interface SiteFoundationRequest {
  organizationId: string;
  site: SiteRequest;
}

export interface SiteFoundationResponse {
  organizationId: string;
  site: SiteResponse | null;
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

export type FairnessLedgerWindowMonths = 3 | 6 | 12;

export interface FairnessLedgerProofSummary {
  weeklyHoursViolations: number;
  nnnViolations: number;
  nodViolations: number;
  minimumRestViolations: number;
  staffingShortfalls: number;
}

export interface FairnessLedgerWindowSummary {
  months: FairnessLedgerWindowMonths;
  windowStartMonth: string | null;
  windowEndMonth: string | null;
  finalizedVersionCount: number;
  proofSummary: FairnessLedgerProofSummary;
}

export type ChecklistItemKey =
  | 'organization_profile'
  | 'schedule_foundation'
  | 'employee_roster'
  | 'off_request_policy'
  | 'schedule_review';

export interface ChecklistItem {
  key: ChecklistItemKey;
  title: string;
  status: 'ready' | 'blocked';
  route: string | null;
  blockedReason: string | null;
  isOptional: boolean;
}

export interface ChecklistResponse {
  organizationId: string;
  checklistCursor: string | null;
  ready: boolean;
  items: ChecklistItem[];
  fairnessSummary: FairnessLedgerWindowSummary[];
}

export interface EmployeeImportEmployeePreview {
  employeeId: string;
  name: string;
  availableShifts: string[];
  rankCode?: string | null;
  preceptorEmployeeId?: string | null;
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

export interface EmployeeRosterReplaceRequest {
  organizationId: string;
  employees: EmployeeImportEmployeePreview[];
}

export interface EmployeeRosterReplaceResponse {
  organizationId: string;
  employeeCount: number;
}
