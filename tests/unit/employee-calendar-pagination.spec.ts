import { describe, expect, it } from 'vitest';

import type { Employee } from '@/types/employee';
import {
  buildEmployeeCalendarPages,
  findEmployeePageIndex,
} from '@/utils/employeeCalendarPagination';

function buildEmployee(partial: Partial<Employee> & Pick<Employee, 'id' | 'employeeId' | 'name'>): Employee {
  return {
    organizationId: 'org-1',
    availableShifts: ['D'],
    preceptorId: null,
    ...partial,
  };
}

function buildOrderedEmployeesWithBoundaryPair(): Employee[] {
  const soloEmployees = Array.from({ length: 9 }, (_, index) =>
    buildEmployee({
      id: `uuid-solo-${index + 1}`,
      employeeId: `${40100 + index}`,
      name: `단독${index + 1}`,
    }),
  );

  const preceptor = buildEmployee({
    id: 'uuid-preceptor',
    employeeId: '41001',
    name: '박선배',
  });
  const preceptee = buildEmployee({
    id: 'uuid-preceptee',
    employeeId: '41101',
    name: '김신규',
    preceptorId: 'uuid-preceptor',
  });
  const pageTwoEmployee = buildEmployee({
    id: 'emp-on-page-2',
    employeeId: '41201',
    name: '이둘째페이지',
  });

  return [...soloEmployees, preceptor, preceptee, pageTwoEmployee];
}

describe('employeeCalendarPagination', () => {
  const employees = buildOrderedEmployeesWithBoundaryPair();

  it('keeps preceptor pair on the same page when pageSize would split them', () => {
    const pages = buildEmployeeCalendarPages(employees, 10);
    const pageWithPreceptor = pages.find((page) => page.some((employee) => employee.id === 'uuid-preceptor'));

    expect(pageWithPreceptor?.some((employee) => employee.id === 'uuid-preceptee')).toBe(true);
    expect(pageWithPreceptor).toHaveLength(11);
  });

  it('finds page index for employee id', () => {
    expect(findEmployeePageIndex(employees, 10, 'emp-on-page-2')).toBe(2);
  });
});
