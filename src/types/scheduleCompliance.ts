import type { AssignmentMap, ConstraintMap } from './schedule';
import type { Shift } from './shift';

export type ScheduleComplianceRuleCode =
  | 'nod_pattern'
  // Legacy key kept for API compatibility: violations now start at 4 consecutive nights (3 allowed).
  | 'triple_night'
  // Legacy key kept for API compatibility: evaluates 48h rest after the end of a consecutive night streak.
  | 'rest_after_two_nights'
  | 'monthly_night_limit'
  | 'preceptor_pairing';

export type ScheduleComplianceRuleStatus = 'passed' | 'failed' | 'check_required';

export interface ScheduleComplianceViolation {
  id: string;
  ruleCode: ScheduleComplianceRuleCode;
  employeeId: string;
  employeeName: string;
  dates: string[];
  message: string;
}

export interface ScheduleComplianceRuleSummary {
  code: ScheduleComplianceRuleCode;
  label: string;
  status: ScheduleComplianceRuleStatus;
  violationCount: number;
  message: string;
}

export interface OffRequestComplianceSummary {
  totalRequests: number;
  fulfilledRequests: number;
  unfulfilledRequests: number;
  reflectionRate: number | null;
}

export interface ScheduleComplianceResult {
  mandatoryPassed: boolean;
  canFinalizeLocally: boolean;
  mandatoryViolationCount: number;
  checkRequiredCount: number;
  summaries: ScheduleComplianceRuleSummary[];
  violations: ScheduleComplianceViolation[];
  offRequests: OffRequestComplianceSummary;
}

export interface EvaluateScheduleComplianceInput {
  month: string;
  employees: Array<{ id: string; name: string; preceptorId?: string | null }>;
  assignments: AssignmentMap;
  offRequests: ConstraintMap;
  shifts: Shift[];
}
