import dayjs from 'dayjs';
import type { SolverRequest, SolverRequestEmployee } from '@/types/schedule';

const PAIR_CONFLICT_PENALTY = 1000;

export interface MockSolverPairingState {
  assignments: Record<string, Record<string, string>>;
  pairConflictCount: number;
  hardScorePenalty: number;
}

interface EmployeeShiftContext {
  employee: SolverRequestEmployee;
  availableShifts: Set<string>;
}

function buildDraftDates(firstDraftDate: string, draftLength: number): string[] {
  const dates: string[] = [];
  for (let index = 0; index < draftLength; index += 1) {
    dates.push(dayjs(firstDraftDate).add(index, 'day').format('YYYY-MM-DD'));
  }
  return dates;
}

function intersectAvailableShifts(
  preceptee: EmployeeShiftContext,
  preceptor: EmployeeShiftContext
): string[] {
  return [...preceptee.availableShifts].filter((shiftCode) =>
    preceptor.availableShifts.has(shiftCode)
  );
}

function isLockedOff(
  undesirable: SolverRequest['undesirable'],
  employeeId: string,
  date: string
): boolean {
  return undesirable.some(
    (item) => item.employee_id === employeeId && item.date === date
  );
}

function pickShiftForPair(
  preceptee: EmployeeShiftContext,
  preceptor: EmployeeShiftContext,
  date: string,
  assignments: Record<string, Record<string, string>>,
  undesirable: SolverRequest['undesirable']
): { shiftCode: string; pairConflict: boolean } {
  const precepteeLocked = assignments[preceptee.employee.employee_id]?.[date];
  const preceptorLocked = assignments[preceptor.employee.employee_id]?.[date];

  if (precepteeLocked && preceptorLocked) {
    return {
      shiftCode: precepteeLocked,
      pairConflict: precepteeLocked !== preceptorLocked,
    };
  }

  if (precepteeLocked) {
    const shiftCode = preceptor.availableShifts.has(precepteeLocked) ? precepteeLocked : 'O';
    return {
      shiftCode,
      pairConflict: !preceptor.availableShifts.has(precepteeLocked),
    };
  }

  if (preceptorLocked) {
    const shiftCode = preceptee.availableShifts.has(preceptorLocked) ? preceptorLocked : 'O';
    return {
      shiftCode,
      pairConflict: !preceptee.availableShifts.has(preceptorLocked),
    };
  }

  const precepteeOffLocked = isLockedOff(undesirable, preceptee.employee.employee_id, date);
  const preceptorOffLocked = isLockedOff(undesirable, preceptor.employee.employee_id, date);

  if (precepteeOffLocked || preceptorOffLocked) {
    const bothOff = precepteeOffLocked && preceptorOffLocked;
    return {
      shiftCode: 'O',
      pairConflict: !bothOff,
    };
  }

  const candidates = intersectAvailableShifts(preceptee, preceptor);
  if (candidates.length > 0) {
    const shiftCode = candidates.includes('D')
      ? 'D'
      : candidates.includes('E')
        ? 'E'
        : candidates.includes('N')
          ? 'N'
          : candidates[0] ?? 'O';
    return { shiftCode, pairConflict: false };
  }

  return { shiftCode: 'O', pairConflict: true };
}

function buildEmployeeContext(employee: SolverRequestEmployee): EmployeeShiftContext {
  return {
    employee,
    availableShifts: new Set(employee.available_shifts),
  };
}

export function applyMockPreceptorPairing(
  solverRequest: SolverRequest,
  existingAssignments: Record<string, Record<string, string>> = {}
): MockSolverPairingState {
  const assignments: Record<string, Record<string, string>> = {};
  for (const [employeeId, dateMap] of Object.entries(existingAssignments)) {
    assignments[employeeId] = { ...dateMap };
  }

  const employeesById = new Map(
    solverRequest.employees.map((employee) => [employee.employee_id, employee])
  );
  const pairs = solverRequest.employees
    .filter((employee) => employee.preceptor_id)
    .map((employee) => ({
      precepteeId: employee.employee_id,
      preceptorId: employee.preceptor_id as string,
    }));

  const draftDates = buildDraftDates(
    solverRequest.organization.firstDraftDate,
    solverRequest.organization.draftLength
  );

  let pairConflictCount = 0;

  for (const date of draftDates) {
    for (const pair of pairs) {
      const preceptee = employeesById.get(pair.precepteeId);
      const preceptor = employeesById.get(pair.preceptorId);
      if (!preceptee || !preceptor) {
        continue;
      }

      const result = pickShiftForPair(
        buildEmployeeContext(preceptee),
        buildEmployeeContext(preceptor),
        date,
        assignments,
        solverRequest.undesirable
      );

      if (!assignments[pair.precepteeId]) {
        assignments[pair.precepteeId] = {};
      }
      if (!assignments[pair.preceptorId]) {
        assignments[pair.preceptorId] = {};
      }

      assignments[pair.precepteeId]![date] = result.shiftCode;
      assignments[pair.preceptorId]![date] = result.shiftCode;

      if (result.pairConflict) {
        pairConflictCount += 1;
      }
    }
  }

  return {
    assignments,
    pairConflictCount,
    hardScorePenalty: pairConflictCount * PAIR_CONFLICT_PENALTY,
  };
}
