import type { Employee } from '@/types/employee';
import { compareEmployeeIds } from '@/utils/employeeRosterMapping';
import { resolvePreceptorPair } from '@/utils/preceptorOffSync';

export type PreceptorDisplayRole = 'preceptor' | 'preceptee';

export interface PreceptorPairDisplayMeta {
  peerId: string;
  peerName: string;
  peerEmployeeId: string;
  role: PreceptorDisplayRole;
  groupKey: string;
}

type PairableEmployee = Pick<Employee, 'id' | 'employeeId' | 'name' | 'preceptorId'>;

function sortEmployeesByEmployeeId<T extends { employeeId: string }>(employees: T[]): T[] {
  return [...employees].sort((left, right) => compareEmployeeIds(left.employeeId, right.employeeId));
}

function buildPairGroupKey(preceptorId: string, precepteeId: string): string {
  return [preceptorId, precepteeId].sort().join('::');
}

function resolvePairMemberIds(
  employees: PairableEmployee[],
  employeeId: string
): { preceptorId: string; precepteeId: string } | null {
  const pair = resolvePreceptorPair(employees as Employee[], employeeId);
  if (!pair) return null;

  if (pair.role === 'preceptee') {
    return { preceptorId: pair.peerId, precepteeId: employeeId };
  }

  return { preceptorId: employeeId, precepteeId: pair.peerId };
}

export function orderEmployeesForPreceptorPairs<T extends PairableEmployee>(employees: T[]): T[] {
  const sortedEmployees = sortEmployeesByEmployeeId(employees);
  const employeeById = new Map(sortedEmployees.map((employee) => [employee.id, employee]));
  const usedEmployeeIds = new Set<string>();
  const orderedEmployees: T[] = [];

  sortedEmployees.forEach((employee) => {
    if (usedEmployeeIds.has(employee.id)) return;

    const pairMemberIds = resolvePairMemberIds(sortedEmployees, employee.id);
    if (!pairMemberIds) {
      orderedEmployees.push(employee);
      usedEmployeeIds.add(employee.id);
      return;
    }

    const preceptor = employeeById.get(pairMemberIds.preceptorId);
    const preceptee = employeeById.get(pairMemberIds.precepteeId);
    if (!preceptor || !preceptee) {
      orderedEmployees.push(employee);
      usedEmployeeIds.add(employee.id);
      return;
    }

    if (!usedEmployeeIds.has(preceptor.id)) {
      orderedEmployees.push(preceptor);
      usedEmployeeIds.add(preceptor.id);
    }

    if (!usedEmployeeIds.has(preceptee.id)) {
      orderedEmployees.push(preceptee);
      usedEmployeeIds.add(preceptee.id);
    }
  });

  return orderedEmployees;
}

export function getPreceptorPairDisplayMeta(
  employees: PairableEmployee[]
): Record<string, PreceptorPairDisplayMeta> {
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  const metaByEmployeeId: Record<string, PreceptorPairDisplayMeta> = {};

  employees.forEach((employee) => {
    const pairMemberIds = resolvePairMemberIds(employees, employee.id);
    if (!pairMemberIds) return;

    const preceptor = employeeById.get(pairMemberIds.preceptorId);
    const preceptee = employeeById.get(pairMemberIds.precepteeId);
    if (!preceptor || !preceptee) return;

    const groupKey = buildPairGroupKey(preceptor.id, preceptee.id);

    metaByEmployeeId[preceptor.id] = {
      peerId: preceptee.id,
      peerName: preceptee.name,
      peerEmployeeId: preceptee.employeeId,
      role: 'preceptor',
      groupKey,
    };

    metaByEmployeeId[preceptee.id] = {
      peerId: preceptor.id,
      peerName: preceptor.name,
      peerEmployeeId: preceptor.employeeId,
      role: 'preceptee',
      groupKey,
    };
  });

  return metaByEmployeeId;
}

export function expandSelectedEmployeeIdsWithPairs(
  employees: PairableEmployee[],
  employeeIds: string[]
): string[] {
  const expandedIds: string[] = [];
  const seenEmployeeIds = new Set<string>();

  employeeIds.forEach((employeeId) => {
    if (!seenEmployeeIds.has(employeeId)) {
      seenEmployeeIds.add(employeeId);
      expandedIds.push(employeeId);
    }

    const pair = resolvePreceptorPair(employees as Employee[], employeeId);
    if (!pair || seenEmployeeIds.has(pair.peerId)) return;

    seenEmployeeIds.add(pair.peerId);
    expandedIds.push(pair.peerId);
  });

  return expandedIds;
}
