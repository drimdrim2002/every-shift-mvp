import type { Employee, EmployeeInput } from '@/types/employee';

export function compareEmployeeIds(leftEmployeeId: string, rightEmployeeId: string): number {
  return leftEmployeeId.localeCompare(rightEmployeeId);
}

export function sortByEmployeeId<T extends { employeeId: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => compareEmployeeIds(left.employeeId, right.employeeId));
}

export function generateEmployeeId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `EMP${timestamp}${random}`;
}

export function normalizeEmployeeInputs(employees: EmployeeInput[]): EmployeeInput[] {
  return employees.map((employee) => ({
    ...employee,
    employeeId: employee.employeeId.trim() || generateEmployeeId(),
  }));
}

export function mapEmployeesToInput(employees: Employee[]): EmployeeInput[] {
  const idToEmployeeIdMap = new Map(
    employees.map((employee) => [employee.id, employee.employeeId]),
  );

  return sortByEmployeeId(
    employees.map((employee) => {
      const preceptorEmployeeId = employee.preceptorId
        ? idToEmployeeIdMap.get(employee.preceptorId) ?? null
        : null;

      return {
        employeeId: employee.employeeId,
        name: employee.name,
        availableShifts: [...employee.availableShifts],
        rankCode: employee.rankCode ?? null,
        preceptorEmployeeId,
      };
    }),
  );
}
