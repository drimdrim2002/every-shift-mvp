import { describe, expect, it } from 'vitest';

import type { Employee } from '@/types/employee';
import {
  expandSelectedEmployeeIdsWithPairs,
  getPreceptorPairDisplayMeta,
  orderEmployeesForPreceptorPairs,
} from '@/utils/preceptorPairDisplayOrder';

function buildEmployee(partial: Partial<Employee> & Pick<Employee, 'id' | 'employeeId' | 'name'>): Employee {
  return {
    organizationId: 'org-1',
    availableShifts: ['D'],
    preceptorId: null,
    ...partial,
  };
}

describe('preceptorPairDisplayOrder', () => {
  const preceptor = buildEmployee({
    id: 'uuid-preceptor',
    employeeId: '40501',
    name: '박선배',
  });
  const preceptee = buildEmployee({
    id: 'uuid-preceptee',
    employeeId: '40601',
    name: '김신규',
    preceptorId: 'uuid-preceptor',
  });
  const solo = buildEmployee({
    id: 'uuid-solo',
    employeeId: '50001',
    name: '이단독',
  });

  it('places preceptor immediately before preceptee even when preceptee sorts first', () => {
    const ordered = orderEmployeesForPreceptorPairs([preceptee, preceptor, solo]);

    expect(ordered.map((employee) => employee.id)).toEqual([
      'uuid-preceptor',
      'uuid-preceptee',
      'uuid-solo',
    ]);
  });

  it('keeps unpaired employees in employee_id order', () => {
    const anotherSolo = buildEmployee({
      id: 'uuid-solo-2',
      employeeId: '51001',
      name: '최단독',
    });

    const ordered = orderEmployeesForPreceptorPairs([anotherSolo, solo, preceptor, preceptee]);

    expect(ordered.map((employee) => employee.id)).toEqual([
      'uuid-preceptor',
      'uuid-preceptee',
      'uuid-solo',
      'uuid-solo-2',
    ]);
  });

  it('skips abnormal multi-preceptee pair grouping and keeps original order', () => {
    const precepteeTwo = buildEmployee({
      id: 'uuid-preceptee-2',
      employeeId: '40602',
      name: '박신규',
      preceptorId: 'uuid-preceptor',
    });

    const ordered = orderEmployeesForPreceptorPairs([preceptor, preceptee, precepteeTwo, solo]);

    expect(ordered.map((employee) => employee.id)).toEqual([
      'uuid-preceptor',
      'uuid-preceptee',
      'uuid-preceptee-2',
      'uuid-solo',
    ]);
  });

  it('builds pair display meta for both sides of a valid pair', () => {
    const meta = getPreceptorPairDisplayMeta([preceptor, preceptee]);

    expect(meta['uuid-preceptor']).toMatchObject({
      peerId: 'uuid-preceptee',
      peerName: '김신규',
      role: 'preceptor',
      groupKey: 'uuid-preceptee::uuid-preceptor',
    });
    expect(meta['uuid-preceptee']).toMatchObject({
      peerId: 'uuid-preceptor',
      peerName: '박선배',
      role: 'preceptee',
      groupKey: 'uuid-preceptee::uuid-preceptor',
    });
  });

  it('expands selected employee ids with their preceptor pair peer', () => {
    expect(
      expandSelectedEmployeeIdsWithPairs([preceptor, preceptee], ['uuid-preceptee'])
    ).toEqual(['uuid-preceptee', 'uuid-preceptor']);

    expect(
      expandSelectedEmployeeIdsWithPairs([preceptor, preceptee], ['uuid-preceptor'])
    ).toEqual(['uuid-preceptor', 'uuid-preceptee']);
  });

  it('dedupes peers when both sides are already selected', () => {
    expect(
      expandSelectedEmployeeIdsWithPairs(
        [preceptor, preceptee],
        ['uuid-preceptee', 'uuid-preceptor']
      )
    ).toEqual(['uuid-preceptee', 'uuid-preceptor']);
  });

  it('leaves solo employee selection unchanged', () => {
    expect(expandSelectedEmployeeIdsWithPairs([solo], ['uuid-solo'])).toEqual(['uuid-solo']);
  });
});
