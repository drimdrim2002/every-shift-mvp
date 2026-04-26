import { describe, expect, it } from 'vitest';
import { evaluateScheduleTrust } from '@/../supabase/functions/phase2-schedule/engine.ts';

describe('phase2 schedule trust gate evaluator', () => {
  it('classifies hard staffing shortfalls as review_blocked with blocked finalization gate', async () => {
    const result = await evaluateScheduleTrust({
      month: '2026-04',
      manualEditCount: 0,
      assignments: [
        {
          employeeId: 'employee-1',
          date: '2026-04-01',
          shiftId: 'shift-d',
          isLocked: false,
        },
      ],
      preferences: [],
      siteRequirements: [
        {
          dayOfWeek: 3,
          shiftId: 'shift-d',
          requiredCount: 2,
        },
      ],
      shifts: [
        {
          id: 'shift-d',
          code: 'D',
        },
      ],
      employees: [
        {
          id: 'employee-1',
        },
      ],
    });

    expect(result.resultStatus).toBe('review_blocked');
    expect(result.proofSummary.staffingShortfalls).toBeGreaterThan(0);
    expect(result.finalizationGate.allowed).toBe(false);
    expect(result.finalizationGate.blockingReasons[0]?.code).toBe('hard_constraints_violated');
  });

  it('returns passed when no hard violations exist and computes off-request reflection', async () => {
    const result = await evaluateScheduleTrust({
      month: '2026-04',
      manualEditCount: 1,
      assignments: [
        {
          employeeId: 'employee-1',
          date: '2026-04-01',
          shiftId: 'shift-o',
          isLocked: false,
        },
      ],
      preferences: [
        {
          employeeId: 'employee-1',
          date: '2026-04-01',
          requestCode: 'O',
          requestNote: null,
          isSoft: true,
          resolutionStatus: 'pending',
          resolvedShiftId: null,
          resolvedAt: null,
        },
      ],
      siteRequirements: [],
      shifts: [
        {
          id: 'shift-o',
          code: 'O',
        },
      ],
      employees: [
        {
          id: 'employee-1',
        },
      ],
    });

    expect(result.resultStatus).toBe('passed');
    expect(result.finalizationGate.allowed).toBe(true);
    expect(result.comparisonMetrics.offRequestReflectionRate).toBe(1);
    expect(result.offRequestResults[0]?.fulfilled).toBe(true);
  });

  it('supports forced infeasible classification for solver failure boundaries', async () => {
    const result = await evaluateScheduleTrust({
      month: '2026-04',
      manualEditCount: 0,
      assignments: [],
      preferences: [],
      siteRequirements: [],
      shifts: [],
      employees: [],
      forcedResultStatus: 'infeasible',
      failureReason: 'Need 3 N staff on April 12, only 2 feasible',
      failureType: 'infeasible',
      failureContext: {
        date: '2026-04-12',
        shiftCode: 'N',
        required: 3,
        feasible: 2,
      },
    });

    expect(result.resultStatus).toBe('infeasible');
    expect(result.infeasibility).toEqual({
      summary: 'Need 3 N staff on April 12, only 2 feasible',
      reason: 'infeasible',
      details: {
        date: '2026-04-12',
        shiftCode: 'N',
        required: 3,
        feasible: 2,
      },
    });
    expect(result.finalizationGate.allowed).toBe(false);
    expect(result.finalizationGate.blockingReasons[0]?.code).toBe('infeasible');
  });
});
