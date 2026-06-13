import { describe, expect, it } from 'vitest';
import { wouldExceedOffPolicyLimit } from '@/utils/offRequestPolicyCheck';
import type { OffRequestPolicyRule } from '@/types/ops';

const policyRules: OffRequestPolicyRule[] = [
  { rankCode: null, periodType: 'monthly', limitCount: 99, isActive: true },
  { rankCode: null, periodType: 'annual', limitCount: 2, isActive: true },
];

const employees = [{ id: 'employee-1', rankCode: null }];

describe('offRequestPolicyCheck', () => {
  it('rejects third off in same year when annual limit is 2', () => {
    const result = wouldExceedOffPolicyLimit({
      scheduleMonth: '2026-04',
      employees,
      policyRules,
      existingPreferences: [
        { employeeId: 'employee-1', date: '2026-04-01' },
        { employeeId: 'employee-1', date: '2026-04-02' },
      ],
      proposedAdds: [{ employeeId: 'employee-1', date: '2026-04-03' }],
      historicalAnnualCountByEmployeeId: new Map(),
    });

    expect(result).toEqual({
      blocked: true,
      employeeId: 'employee-1',
      reason: 'annual',
    });
  });

  it('skips validation when no active policy rules', () => {
    const result = wouldExceedOffPolicyLimit({
      scheduleMonth: '2026-04',
      employees,
      policyRules: [],
      existingPreferences: [],
      proposedAdds: [{ employeeId: 'employee-1', date: '2026-04-01' }],
    });

    expect(result).toEqual({ blocked: false });
  });
});
