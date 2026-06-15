import type { Employee } from '@/types/employee';

type PairableEmployee = Pick<Employee, 'id' | 'employeeId' | 'name' | 'preceptorId'>;

export function buildEmployeeCalendarPages<T extends PairableEmployee>(
  employees: T[],
  pageSize: number,
): T[][] {
  const pages: T[][] = [];
  let current: T[] = [];

  const pairMateId = (emp: T): string | null => {
    if (emp.preceptorId) return emp.preceptorId;

    const preceptee = employees.find((employee) => employee.preceptorId === emp.id);
    if (preceptee) return preceptee.id;

    return null;
  };

  employees.forEach((employee) => {
    const last = current[current.length - 1];
    const isPairContinuation =
      last !== undefined && pairMateId(last) === employee.id;

    if (current.length >= pageSize && !isPairContinuation) {
      pages.push(current);
      current = [];
    }

    current.push(employee);
  });

  if (current.length > 0) pages.push(current);
  return pages;
}

export function findEmployeePageIndex(
  employees: PairableEmployee[],
  pageSize: number,
  employeeId: string,
): number {
  const pages = buildEmployeeCalendarPages(employees, pageSize);

  for (let index = 0; index < pages.length; index += 1) {
    if (pages[index]?.some((employee) => employee.id === employeeId)) {
      return index + 1;
    }
  }

  return 0;
}
