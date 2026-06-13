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

  it('accepts first off in month when annual limit is 1 (server draft-guard fixture)', () => {
    const draftGuardRules: OffRequestPolicyRule[] = [
      { rankCode: null, periodType: 'monthly', limitCount: 99, isActive: true },
      { rankCode: null, periodType: 'annual', limitCount: 1, isActive: true },
    ];

    const result = wouldExceedOffPolicyLimit({
      scheduleMonth: '2026-04',
      employees,
      policyRules: draftGuardRules,
      existingPreferences: [],
      proposedAdds: [{ employeeId: 'employee-1', date: '2026-04-01' }],
      historicalAnnualCountByEmployeeId: new Map(),
    });

    expect(result).toEqual({ blocked: false });
  });

  it('rejects second off in same month when monthly limit is 1 (server counting order)', () => {
    const monthlyRules: OffRequestPolicyRule[] = [
      { rankCode: null, periodType: 'monthly', limitCount: 1, isActive: true },
      { rankCode: null, periodType: 'annual', limitCount: 99, isActive: true },
    ];

    const result = wouldExceedOffPolicyLimit({
      scheduleMonth: '2026-04',
      employees,
      policyRules: monthlyRules,
      existingPreferences: [{ employeeId: 'employee-1', date: '2026-04-01' }],
      proposedAdds: [{ employeeId: 'employee-1', date: '2026-04-02' }],
    });

    expect(result).toEqual({
      blocked: true,
      employeeId: 'employee-1',
      reason: 'monthly',
    });
  });
});
