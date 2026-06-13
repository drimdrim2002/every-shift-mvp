import type { Employee } from '@/types/employee';

export type PreceptorRole = 'preceptee' | 'preceptor';

export interface PreceptorPairRef {
  peerId: string;
  role: PreceptorRole;
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
