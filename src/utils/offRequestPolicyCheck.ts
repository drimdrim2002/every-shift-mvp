import type { OffRequestPolicyPeriodType, OffRequestPolicyRule } from '@/types/ops';

export interface OffPreferenceRow {
  employeeId: string;
  date: string;
}

type PolicyRuleCandidate = Pick<
  OffRequestPolicyRule,
  'rankCode' | 'periodType' | 'limitCount' | 'isActive'
>;

type PolicyRejectionReason = 'monthly' | 'annual';

interface PolicyCheckResult {
  status: 'accepted' | 'rejected';
  reason: PolicyRejectionReason | null;
}

interface EvaluateOffRequestPolicyInput {
  scheduleMonth: string;
  employees: Array<{ id: string; rankCode?: string | null }>;
  policyRules: OffRequestPolicyRule[];
  preferences: OffPreferenceRow[];
  historicalAnnualCountByEmployeeId?: Map<string, number>;
}

interface WouldExceedOffPolicyLimitInput {
  scheduleMonth: string;
  employees: Array<{ id: string; rankCode?: string | null }>;
  policyRules: OffRequestPolicyRule[];
  existingPreferences: OffPreferenceRow[];
  proposedAdds: OffPreferenceRow[];
  historicalAnnualCountByEmployeeId?: Map<string, number>;
}

type WouldExceedOffPolicyLimitResult =
  | { blocked: false }
  | { blocked: true; employeeId: string; reason: PolicyRejectionReason };

function normalizeOffRequestPolicyRankCode(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function resolveApplicableOffRequestPolicyRule<T extends PolicyRuleCandidate>(
  policyRules: T[],
  rankCode: string | null,
  periodType: OffRequestPolicyPeriodType
): T | null {
  const normalizedRankCode = normalizeOffRequestPolicyRankCode(rankCode);

  return (
    policyRules.find(
      (rule) =>
        rule.isActive &&
        rule.periodType === periodType &&
        normalizeOffRequestPolicyRankCode(rule.rankCode) === normalizedRankCode
    ) ??
    policyRules.find(
      (rule) => rule.isActive && rule.periodType === periodType && rule.rankCode === null
    ) ??
    null
  );
}

function sortOffPreferences(preferences: OffPreferenceRow[]): OffPreferenceRow[] {
  return [...preferences].sort((left, right) => {
    const dateDiff = left.date.localeCompare(right.date);
    if (dateDiff !== 0) return dateDiff;
    return left.employeeId.localeCompare(right.employeeId);
  });
}

function buildRankCodeByEmployeeId(
  employees: Array<{ id: string; rankCode?: string | null }>
): Map<string, string | null> {
  return new Map(employees.map((employee) => [employee.id, employee.rankCode ?? null] as const));
}

function evaluatePreferencePolicyResults(
  input: EvaluateOffRequestPolicyInput
): Map<string, Map<string, PolicyCheckResult>> {
  const {
    scheduleMonth,
    employees,
    policyRules,
    preferences,
    historicalAnnualCountByEmployeeId = new Map(),
  } = input;

  const result = new Map<string, Map<string, PolicyCheckResult>>();
  if (preferences.length === 0) {
    return result;
  }

  const rankCodeByEmployeeId = buildRankCodeByEmployeeId(employees);
  const monthlyCountByPeriod = new Map<string, number>();
  const annualCountByEmployeeId = new Map(historicalAnnualCountByEmployeeId);
  const sortedPreferences = sortOffPreferences(preferences);

  for (const preference of sortedPreferences) {
    const rankCode = rankCodeByEmployeeId.get(preference.employeeId) ?? null;
    const monthlyRule = resolveApplicableOffRequestPolicyRule(policyRules, rankCode, 'monthly');
    const annualRule = resolveApplicableOffRequestPolicyRule(policyRules, rankCode, 'annual');

    const monthlyKey = `${preference.employeeId}:${scheduleMonth}`;
    const nextMonthlyCount = (monthlyCountByPeriod.get(monthlyKey) ?? 0) + 1;
    const nextAnnualCount = (annualCountByEmployeeId.get(preference.employeeId) ?? 0) + 1;
    monthlyCountByPeriod.set(monthlyKey, nextMonthlyCount);
    annualCountByEmployeeId.set(preference.employeeId, nextAnnualCount);

    let status: PolicyCheckResult['status'] = 'accepted';
    let reason: PolicyRejectionReason | null = null;

    if (monthlyRule && nextMonthlyCount > monthlyRule.limitCount) {
      status = 'rejected';
      reason = 'monthly';
    } else if (annualRule && nextAnnualCount > annualRule.limitCount) {
      status = 'rejected';
      reason = 'annual';
    }

    const employeeStatuses = result.get(preference.employeeId) ?? new Map<string, PolicyCheckResult>();
    employeeStatuses.set(preference.date, { status, reason });
    result.set(preference.employeeId, employeeStatuses);
  }

  return result;
}

export function evaluateOffRequestPolicy(
  input: EvaluateOffRequestPolicyInput
): Map<string, Map<string, 'accepted' | 'rejected'>> {
  const policyResults = evaluatePreferencePolicyResults(input);
  const result = new Map<string, Map<string, 'accepted' | 'rejected'>>();

  policyResults.forEach((dateResults, employeeId) => {
    const employeeStatuses = new Map<string, 'accepted' | 'rejected'>();
    dateResults.forEach((policyResult, date) => {
      employeeStatuses.set(date, policyResult.status);
    });
    result.set(employeeId, employeeStatuses);
  });

  return result;
}

export function wouldExceedOffPolicyLimit(
  input: WouldExceedOffPolicyLimitInput
): WouldExceedOffPolicyLimitResult {
  const {
    scheduleMonth,
    employees,
    policyRules,
    existingPreferences,
    proposedAdds,
    historicalAnnualCountByEmployeeId,
  } = input;

  if (policyRules.length === 0 || proposedAdds.length === 0) {
    return { blocked: false };
  }

  const policyResults = evaluatePreferencePolicyResults({
    scheduleMonth,
    employees,
    policyRules,
    preferences: [...existingPreferences, ...proposedAdds],
    historicalAnnualCountByEmployeeId,
  });

  for (const proposedAdd of sortOffPreferences(proposedAdds)) {
    const policyResult = policyResults.get(proposedAdd.employeeId)?.get(proposedAdd.date);
    if (policyResult?.status === 'rejected' && policyResult.reason) {
      return {
        blocked: true,
        employeeId: proposedAdd.employeeId,
        reason: policyResult.reason,
      };
    }
  }

  return { blocked: false };
}
