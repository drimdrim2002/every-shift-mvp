import type { Employee } from '@/types/employee';
import type { OffRequestPolicyRule } from '@/types/ops';
import type { ConstraintMap } from '@/types/schedule';
import { wouldExceedOffPolicyLimit } from '@/utils/offRequestPolicyCheck';

export type PreceptorRole = 'preceptee' | 'preceptor';

export interface PairCorrectionSummary {
  preceptorName: string;
  precepteeName: string;
  correctedCount: number;
}

export interface PairSkipSummary {
  employeeName: string;
  role: PreceptorRole;
  skippedCount: number;
}

export interface OffEdit {
  employeeId: string;
  date: string;
  action: 'add' | 'remove';
}

export interface PreceptorPairRef {
  peerId: string;
  role: PreceptorRole;
}

export type ValidatePairedOffChangesResult =
  | { ok: true }
  | {
      ok: false;
      blockedEmployeeId: string;
      blockedEmployeeName: string;
      role: PreceptorRole | 'requester';
      reason: string;
    };

interface ValidatePairedOffChangesInput {
  constraints: ConstraintMap;
  edits: OffEdit[];
  employees: Employee[];
  policyRules: OffRequestPolicyRule[];
  scheduleMonth: string;
  historicalAnnualCountByEmployeeId?: Map<string, number>;
}

function offEditKey(edit: OffEdit): string {
  return `${edit.employeeId}:${edit.date}:${edit.action}`;
}

function constraintsToExistingPreferences(constraints: ConstraintMap) {
  const preferences: Array<{ employeeId: string; date: string }> = [];

  for (const [employeeId, dateCodes] of Object.entries(constraints)) {
    for (const [date, code] of Object.entries(dateCodes)) {
      if (code === 'O') {
        preferences.push({ employeeId, date });
      }
    }
  }

  return preferences;
}

function resolveBlockedEmployeeRole(
  employees: Employee[],
  blockedEmployeeId: string
): PreceptorRole | 'requester' {
  return resolvePreceptorPair(employees, blockedEmployeeId)?.role ?? 'requester';
}

function buildPolicyBlockReason(reason: 'monthly' | 'annual'): string {
  return reason === 'annual' ? 'annual limit exceeded' : 'monthly limit exceeded';
}

interface ReconcilePreceptorOffPairsInput {
  constraints: ConstraintMap;
  employees: Employee[];
  policyRules: OffRequestPolicyRule[];
  scheduleMonth: string;
  historicalAnnualCountByEmployeeId?: Map<string, number>;
}

function cloneConstraints(constraints: ConstraintMap): ConstraintMap {
  const next: ConstraintMap = {};

  for (const [employeeId, dateCodes] of Object.entries(constraints)) {
    next[employeeId] = { ...dateCodes };
  }

  return next;
}

function getOffDates(constraints: ConstraintMap, employeeId: string): Set<string> {
  const dates = new Set<string>();
  const dateCodes = constraints[employeeId];

  if (!dateCodes) {
    return dates;
  }

  for (const [date, code] of Object.entries(dateCodes)) {
    if (code === 'O') {
      dates.add(date);
    }
  }

  return dates;
}

function setOffDate(constraints: ConstraintMap, employeeId: string, date: string): void {
  const dateCodes = constraints[employeeId] ?? {};
  dateCodes[date] = 'O';
  constraints[employeeId] = dateCodes;
}

function collectUniquePreceptorPairs(
  employees: Employee[]
): Array<{ preceptorId: string; precepteeId: string }> {
  const pairs: Array<{ preceptorId: string; precepteeId: string }> = [];
  const seen = new Set<string>();

  for (const employee of employees) {
    const pair = resolvePreceptorPair(employees, employee.id);
    if (!pair) continue;

    const precepteeId = pair.role === 'preceptee' ? employee.id : pair.peerId;
    const preceptorId = pair.role === 'preceptor' ? employee.id : pair.peerId;
    const key = `${preceptorId}:${precepteeId}`;

    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({ preceptorId, precepteeId });
  }

  return pairs;
}

function skipKey(employeeId: string, role: PreceptorRole): string {
  return `${employeeId}:${role}`;
}

function recordSkip(
  skippedByKey: Map<string, PairSkipSummary>,
  employees: Employee[],
  employeeId: string,
  role: PreceptorRole
): void {
  const key = skipKey(employeeId, role);
  const existing = skippedByKey.get(key);
  const employeeName = employees.find((employee) => employee.id === employeeId)?.name ?? employeeId;

  if (existing) {
    existing.skippedCount += 1;
    return;
  }

  skippedByKey.set(key, {
    employeeName,
    role,
    skippedCount: 1,
  });
}

function canAddOffDate(input: {
  constraints: ConstraintMap;
  employeeId: string;
  date: string;
  employees: Employee[];
  policyRules: OffRequestPolicyRule[];
  scheduleMonth: string;
  historicalAnnualCountByEmployeeId?: Map<string, number>;
}): boolean {
  const {
    constraints,
    employeeId,
    date,
    employees,
    policyRules,
    scheduleMonth,
    historicalAnnualCountByEmployeeId,
  } = input;

  if (policyRules.length === 0) {
    return true;
  }

  const proposedAdds = expandOffDeltaWithPair(employees, [
    { employeeId, date, action: 'add' },
  ])
    .filter((edit) => edit.action === 'add')
    .map(({ employeeId: proposedEmployeeId, date: proposedDate }) => ({
      employeeId: proposedEmployeeId,
      date: proposedDate,
    }));

  const policyResult = wouldExceedOffPolicyLimit({
    scheduleMonth,
    employees,
    policyRules,
    existingPreferences: constraintsToExistingPreferences(constraints),
    proposedAdds,
    historicalAnnualCountByEmployeeId,
  });

  return !policyResult.blocked;
}

export function reconcilePreceptorOffPairs(input: ReconcilePreceptorOffPairsInput): {
  nextConstraints: ConstraintMap;
  corrections: PairCorrectionSummary[];
  skipped: PairSkipSummary[];
} {
  const {
    constraints,
    employees,
    policyRules,
    scheduleMonth,
    historicalAnnualCountByEmployeeId,
  } = input;

  const nextConstraints = cloneConstraints(constraints);
  const corrections: PairCorrectionSummary[] = [];
  const skippedByKey = new Map<string, PairSkipSummary>();
  const employeeById = new Map(employees.map((employee) => [employee.id, employee] as const));

  for (const { preceptorId, precepteeId } of collectUniquePreceptorPairs(employees)) {
    const unionDates = new Set([
      ...getOffDates(nextConstraints, precepteeId),
      ...getOffDates(nextConstraints, preceptorId),
    ]);
    let correctedCount = 0;

    for (const date of [...unionDates].sort()) {
      const precepteeHasDate = getOffDates(nextConstraints, precepteeId).has(date);
      const preceptorHasDate = getOffDates(nextConstraints, preceptorId).has(date);

      if (!precepteeHasDate) {
        if (
          canAddOffDate({
            constraints: nextConstraints,
            employeeId: precepteeId,
            date,
            employees,
            policyRules,
            scheduleMonth,
            historicalAnnualCountByEmployeeId,
          })
        ) {
          setOffDate(nextConstraints, precepteeId, date);
          correctedCount += 1;
        } else {
          recordSkip(skippedByKey, employees, precepteeId, 'preceptee');
        }
      }

      if (!preceptorHasDate) {
        if (
          canAddOffDate({
            constraints: nextConstraints,
            employeeId: preceptorId,
            date,
            employees,
            policyRules,
            scheduleMonth,
            historicalAnnualCountByEmployeeId,
          })
        ) {
          setOffDate(nextConstraints, preceptorId, date);
          correctedCount += 1;
        } else {
          recordSkip(skippedByKey, employees, preceptorId, 'preceptor');
        }
      }
    }

    if (correctedCount > 0) {
      corrections.push({
        preceptorName: employeeById.get(preceptorId)?.name ?? preceptorId,
        precepteeName: employeeById.get(precepteeId)?.name ?? precepteeId,
        correctedCount,
      });
    }
  }

  return {
    nextConstraints,
    corrections,
    skipped: [...skippedByKey.values()],
  };
}

export function resolvePreceptorPair(
  employees: Employee[],
  employeeId: string
): PreceptorPairRef | null {
  const self = employees.find((employee) => employee.id === employeeId);
  if (!self) return null;

  if (self.preceptorId) {
    const preceptorExists = employees.some((employee) => employee.id === self.preceptorId);
    if (!preceptorExists) return null;
    return { peerId: self.preceptorId, role: 'preceptee' };
  }

  const preceptees = employees.filter((employee) => employee.preceptorId === employeeId);
  if (preceptees.length === 0) return null;
  if (preceptees.length > 1) {
    console.warn('[preceptorOffSync] Multiple preceptees for preceptor; skipping pair sync', {
      preceptorId: employeeId,
      precepteeIds: preceptees.map((employee) => employee.id),
    });
    return null;
  }

  return { peerId: preceptees[0]!.id, role: 'preceptor' };
}

export function expandOffDeltaWithPair(employees: Employee[], edits: OffEdit[]): OffEdit[] {
  const seen = new Set<string>();
  const expanded: OffEdit[] = [];

  const appendEdit = (edit: OffEdit) => {
    const key = offEditKey(edit);
    if (seen.has(key)) return;
    seen.add(key);
    expanded.push(edit);
  };

  for (const edit of edits) {
    appendEdit(edit);

    const pair = resolvePreceptorPair(employees, edit.employeeId);
    if (!pair) continue;

    appendEdit({
      employeeId: pair.peerId,
      date: edit.date,
      action: edit.action,
    });
  }

  return expanded;
}

export function validatePairedOffChanges(
  input: ValidatePairedOffChangesInput
): ValidatePairedOffChangesResult {
  const {
    constraints,
    edits,
    employees,
    policyRules,
    scheduleMonth,
    historicalAnnualCountByEmployeeId,
  } = input;

  if (policyRules.length === 0) {
    return { ok: true };
  }

  const expandedEdits = expandOffDeltaWithPair(employees, edits);
  const proposedAdds = expandedEdits
    .filter((edit) => edit.action === 'add')
    .map(({ employeeId, date }) => ({ employeeId, date }));

  const policyResult = wouldExceedOffPolicyLimit({
    scheduleMonth,
    employees,
    policyRules,
    existingPreferences: constraintsToExistingPreferences(constraints),
    proposedAdds,
    historicalAnnualCountByEmployeeId,
  });

  if (!policyResult.blocked) {
    return { ok: true };
  }

  const blockedEmployee = employees.find((employee) => employee.id === policyResult.employeeId);

  return {
    ok: false,
    blockedEmployeeId: policyResult.employeeId,
    blockedEmployeeName: blockedEmployee?.name ?? policyResult.employeeId,
    role: resolveBlockedEmployeeRole(employees, policyResult.employeeId),
    reason: buildPolicyBlockReason(policyResult.reason),
  };
}
