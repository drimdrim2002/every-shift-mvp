import type { Employee } from '@/types/employee';
import type { OffRequestPolicyRule } from '@/types/ops';
import type { ConstraintMap } from '@/types/schedule';
import { wouldExceedOffPolicyLimit } from '@/utils/offRequestPolicyCheck';

export type PreceptorRole = 'preceptee' | 'preceptor';

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
