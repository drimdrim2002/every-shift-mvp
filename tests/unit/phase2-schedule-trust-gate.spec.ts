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
        {
          employeeId: 'employee-1',
          date: '2026-04-03',
          shiftId: 'shift-d',
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
        {
          employeeId: 'employee-1',
          date: '2026-04-02',
          requestCode: 'O',
          requestNote: null,
          isSoft: true,
          resolutionStatus: 'pending',
          resolvedShiftId: null,
          resolvedAt: null,
        },
        {
          employeeId: 'employee-1',
          date: '2026-04-03',
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

    expect(result.resultStatus).toBe('passed');
    expect(result.finalizationGate.allowed).toBe(true);
    expect(result.comparisonMetrics.offRequestReflectionRate).toBe(0.6667);
    expect(result.offRequestResults[0]?.fulfilled).toBe(true);
    expect(result.offRequestResults[1]).toEqual(expect.objectContaining({
      date: '2026-04-02',
      fulfilled: true,
      resolvedShiftId: null,
      resolutionStatus: 'fulfilled',
    }));
    expect(result.offRequestResults[2]).toEqual(expect.objectContaining({
      date: '2026-04-03',
      fulfilled: false,
      resolvedShiftId: 'shift-d',
      resolutionStatus: 'unfulfilled',
    }));
  });

  it('keeps policy-rejected Off requests unfulfilled even when no work shift is assigned', async () => {
    const result = await evaluateScheduleTrust({
      month: '2026-04',
      manualEditCount: 0,
      assignments: [
        {
          employeeId: 'employee-1',
          date: '2026-04-02',
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
          policyCheckStatus: 'rejected',
          policyRejectionReason: '월 한도 초과',
        },
        {
          employeeId: 'employee-1',
          date: '2026-04-02',
          requestCode: 'O',
          requestNote: null,
          isSoft: true,
          resolutionStatus: 'pending',
          resolvedShiftId: null,
          resolvedAt: null,
          policyCheckStatus: 'rejected',
          policyRejectionReason: '월 한도 초과',
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

    expect(result.comparisonMetrics.offRequestReflectionRate).toBe(0);
    expect(result.offRequestResults).toEqual([
      expect.objectContaining({
        date: '2026-04-01',
        fulfilled: false,
        resolutionStatus: 'unfulfilled',
        resolvedShiftId: null,
        reason: '월 한도 초과',
      }),
      expect.objectContaining({
        date: '2026-04-02',
        fulfilled: false,
        resolutionStatus: 'unfulfilled',
        resolvedShiftId: 'shift-o',
        reason: '월 한도 초과',
      }),
    ]);
  });

  it('blocks review when there are no assignments even without site requirements', async () => {
    const result = await evaluateScheduleTrust({
      month: '2026-04',
      manualEditCount: 0,
      assignments: [],
      preferences: [],
      siteRequirements: [],
      shifts: [],
      employees: [{ id: 'employee-1' }],
    });

    expect(result.resultStatus).toBe('review_blocked');
    expect(result.finalizationGate.allowed).toBe(false);
    expect(result.finalizationGate.blockingReasons[0]?.code).toBe('empty_assignments');
    expect(result.violationDetails.some((detail) => detail.code === 'empty_assignments')).toBe(true);
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
