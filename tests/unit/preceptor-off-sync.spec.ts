import { describe, expect, it, vi } from 'vitest';
import { resolvePreceptorPair } from '@/utils/preceptorOffSync';
import type { Employee } from '@/types/employee';

const employees: Employee[] = [
  {
    id: 'uuid-preceptor',
    organizationId: 'org-1',
    employeeId: '40501',
    name: '박선배',
    availableShifts: ['D', 'E'],
    preceptorId: null,
  },
  {
    id: 'uuid-preceptee',
    organizationId: 'org-1',
    employeeId: '40601',
    name: '김신규',
    availableShifts: ['D'],
    preceptorId: 'uuid-preceptor',
  },
];

describe('resolvePreceptorPair', () => {
  it('returns preceptor peer for preceptee', () => {
    expect(resolvePreceptorPair(employees, 'uuid-preceptee')).toEqual({
      peerId: 'uuid-preceptor',
      role: 'preceptee',
    });
  });

  it('returns preceptee peer for preceptor via reverse lookup', () => {
    expect(resolvePreceptorPair(employees, 'uuid-preceptor')).toEqual({
      peerId: 'uuid-preceptee',
      role: 'preceptor',
    });
  });

  it('returns null when no pair', () => {
    const solo: Employee[] = [
      {
        id: 'uuid-solo',
        organizationId: 'org-1',
        employeeId: '40701',
        name: '이단독',
        availableShifts: ['D'],
        preceptorId: null,
      },
    ];
    expect(resolvePreceptorPair(solo, 'uuid-solo')).toBeNull();
  });

  it('returns null and does not throw when reverse lookup matches more than one preceptee', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const abnormal: Employee[] = [
      { id: 'p1', organizationId: 'org-1', employeeId: '1', name: 'P', availableShifts: ['D'], preceptorId: null },
      { id: 't1', organizationId: 'org-1', employeeId: '2', name: 'T1', availableShifts: ['D'], preceptorId: 'p1' },
      { id: 't2', organizationId: 'org-1', employeeId: '3', name: 'T2', availableShifts: ['D'], preceptorId: 'p1' },
    ];
    expect(resolvePreceptorPair(abnormal, 'p1')).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
