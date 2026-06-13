import { describe, expect, it, vi } from 'vitest';
import {
  expandOffDeltaWithPair,
  resolvePreceptorPair,
  validatePairedOffChanges,
} from '@/utils/preceptorOffSync';
import type { Employee } from '@/types/employee';
import type { OffRequestPolicyRule } from '@/types/ops';

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

const policyRules: OffRequestPolicyRule[] = [
  { rankCode: null, periodType: 'monthly', limitCount: 99, isActive: true },
  { rankCode: null, periodType: 'annual', limitCount: 2, isActive: true },
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

describe('expandOffDeltaWithPair', () => {
  it('expands preceptee add to include preceptor on same date', () => {
    const edits = expandOffDeltaWithPair(employees, [
      { employeeId: 'uuid-preceptee', date: '2026-05-15', action: 'add' },
    ]);

    expect(edits).toEqual(
      expect.arrayContaining([
        { employeeId: 'uuid-preceptee', date: '2026-05-15', action: 'add' },
        { employeeId: 'uuid-preceptor', date: '2026-05-15', action: 'add' },
      ])
    );
    expect(edits).toHaveLength(2);
  });

  it('dedupes when batch already includes both sides of a pair', () => {
    const edits = expandOffDeltaWithPair(employees, [
      { employeeId: 'uuid-preceptee', date: '2026-05-15', action: 'add' },
      { employeeId: 'uuid-preceptor', date: '2026-05-15', action: 'add' },
    ]);
    expect(edits).toHaveLength(2);
  });
});

describe('validatePairedOffChanges', () => {
  it('blocks entire paired operation when peer would exceed annual limit', () => {
    const constraints = {
      'uuid-preceptor': { '2026-05-01': 'O', '2026-05-02': 'O' },
    } as const;

    const result = validatePairedOffChanges({
      constraints,
      edits: [{ employeeId: 'uuid-preceptee', date: '2026-05-03', action: 'add' }],
      employees,
      policyRules,
      scheduleMonth: '2026-05',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.blockedEmployeeName).toBe('박선배');
      expect(result.role).toBe('preceptor');
    }
  });
});
