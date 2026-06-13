import { describe, expect, it } from 'vitest';
import { evaluateScheduleCompliance } from '@/utils/scheduleCompliance';
import type { AssignmentMap, ConstraintMap } from '@/types/schedule';
import type { Shift } from '@/types/shift';

const month = '2026-05';

const employees = [
  { id: 'e1', name: '김간호' },
  { id: 'e2', name: '이간호' },
];

const shifts: Shift[] = [
  createShift('D', '08:00:00', '16:00:00'),
  createShift('E', '16:00:00', '00:00:00'),
  createShift('N', '00:00:00', '08:00:00'),
  createShift('O', null, null),
];

function createShift(code: string, startTime: string | null, endTime: string | null): Shift {
  return {
    id: code,
    organizationId: 'org1',
    code,
    name: code,
    colorCode: '#000000',
    startTime,
    endTime,
  };
}

function evaluate(assignments: AssignmentMap, offRequests: ConstraintMap = {}) {
  return evaluateScheduleCompliance({
    month,
    employees,
    assignments,
    offRequests,
    shifts,
  });
}

describe('evaluateScheduleCompliance', () => {
  it('passes when mandatory rules have no violations', () => {
    const result = evaluate(
      {
        e1: {
          '2026-05-01': 'D',
          '2026-05-02': 'O',
          '2026-05-03': 'N',
          '2026-05-04': 'O',
          '2026-05-05': 'E',
        },
      },
      {
        e1: {
          '2026-05-02': 'O',
        },
      },
    );

    expect(result.mandatoryPassed).toBe(true);
    expect(result.canFinalizeLocally).toBe(true);
    expect(result.mandatoryViolationCount).toBe(0);
    expect(result.checkRequiredCount).toBe(0);
    expect(result.violations).toEqual([]);
    expect(result.summaries.map((summary) => [summary.code, summary.status])).toEqual([
      ['nod_pattern', 'passed'],
      ['preceptor_pairing', 'passed'],
      ['triple_night', 'passed'],
      ['rest_after_two_nights', 'passed'],
      ['monthly_night_limit', 'passed'],
    ]);
    expect(result.offRequests).toEqual({
      totalRequests: 1,
      fulfilledRequests: 1,
      unfulfilledRequests: 0,
      reflectionRate: 100,
    });
  });

  it('reports N O D as a nod_pattern violation', () => {
    const result = evaluate({
      e1: {
        '2026-05-01': 'N',
        '2026-05-02': 'O',
        '2026-05-03': 'D',
      },
    });

    expect(result.mandatoryPassed).toBe(false);
    expect(result.canFinalizeLocally).toBe(false);
    expect(result.violations).toEqual([
      expect.objectContaining({
        ruleCode: 'nod_pattern',
        employeeId: 'e1',
        employeeName: '김간호',
        dates: ['2026-05-01', '2026-05-02', '2026-05-03'],
      }),
    ]);
    expect(result.violations[0]?.message).toContain('N-O-D');
    expect(result.summaries.find((summary) => summary.code === 'nod_pattern')?.status).toBe('failed');
  });

  it('allows three consecutive nights without triple_night violation', () => {
    const result = evaluate({
      e1: {
        '2026-05-01': 'N',
        '2026-05-02': 'N',
        '2026-05-03': 'N',
        '2026-05-04': 'O',
        '2026-05-05': 'O',
        '2026-05-06': 'D',
      },
    });

    expect(result.violations.some((violation) => violation.ruleCode === 'triple_night')).toBe(false);
    expect(result.summaries.find((summary) => summary.code === 'triple_night')?.status).toBe('passed');
  });

  it('reports four consecutive nights as triple_night violation', () => {
    const result = evaluate({
      e1: {
        '2026-05-01': 'N',
        '2026-05-02': 'N',
        '2026-05-03': 'N',
        '2026-05-04': 'N',
      },
    });

    expect(result.violations).toContainEqual(
      expect.objectContaining({
        ruleCode: 'triple_night',
        employeeId: 'e1',
        dates: ['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04'],
      }),
    );
    expect(result.summaries.find((summary) => summary.code === 'triple_night')?.status).toBe('failed');
  });

  it('blocks when first work after a three-night streak starts before 48 hours from last night end', () => {
    const result = evaluate({
      e1: {
        '2026-05-01': 'N',
        '2026-05-02': 'N',
        '2026-05-03': 'N',
        '2026-05-04': 'O',
        '2026-05-05': 'D',
      },
    });

    expect(result.canFinalizeLocally).toBe(false);
    expect(result.violations).toContainEqual(
      expect.objectContaining({
        ruleCode: 'rest_after_two_nights',
        dates: ['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-05'],
      }),
    );
    expect(result.violations.find((violation) => violation.ruleCode === 'rest_after_two_nights')?.message)
      .toContain('48시간');
  });

  it('passes when first work starts at least 48 hours after last night in streak', () => {
    const result = evaluate({
      e1: {
        '2026-05-01': 'N',
        '2026-05-02': 'N',
        '2026-05-03': 'N',
        '2026-05-04': 'O',
        '2026-05-05': 'O',
        '2026-05-06': 'O',
        '2026-05-07': 'D',
      },
    });

    expect(result.violations.some((violation) => violation.ruleCode === 'rest_after_two_nights')).toBe(false);
    expect(result.summaries.find((summary) => summary.code === 'rest_after_two_nights')?.status).toBe('passed');
  });

  it('passes when first work starts exactly 48 hours after two consecutive nights', () => {
    const result = evaluate({
      e1: {
        '2026-05-01': 'N',
        '2026-05-02': 'N',
        '2026-05-03': 'O',
        '2026-05-04': 'O',
        '2026-05-05': 'D',
      },
    });

    expect(result.violations.some((violation) => violation.ruleCode === 'rest_after_two_nights')).toBe(false);
    expect(result.summaries.find((summary) => summary.code === 'rest_after_two_nights')?.status).toBe('passed');
  });

  it('counts only target-month nights for monthly_night_limit', () => {
    const targetMonthNights = Array.from({ length: 16 }, (_, index) => [
      `2026-05-${String(index + 1).padStart(2, '0')}`,
      'N',
    ]);
    const previousMonthNights = Array.from({ length: 5 }, (_, index) => [
      `2026-04-${String(index + 26).padStart(2, '0')}`,
      'N',
    ]);

    const result = evaluate({
      e1: Object.fromEntries([...previousMonthNights, ...targetMonthNights]),
      e2: Object.fromEntries(previousMonthNights),
    });

    expect(result.violations.some((violation) => violation.employeeId === 'e1' && violation.ruleCode === 'monthly_night_limit')).toBe(true);
    expect(result.violations.some((violation) => violation.employeeId === 'e2' && violation.ruleCode === 'monthly_night_limit')).toBe(false);
    expect(result.summaries.find((summary) => summary.code === 'monthly_night_limit')?.violationCount).toBe(1);
  });

  it('uses previous-month context for sequence checks', () => {
    const result = evaluate({
      e1: {
        '2026-04-30': 'N',
        '2026-05-01': 'O',
        '2026-05-02': 'D',
      },
    });

    expect(result.violations).toEqual([
      expect.objectContaining({
        ruleCode: 'nod_pattern',
        dates: ['2026-04-30', '2026-05-01', '2026-05-02'],
      }),
    ]);
  });

  it('ignores sequence violations that are entirely outside the target month', () => {
    const result = evaluate({
      e1: {
        '2026-04-24': 'N',
        '2026-04-25': 'N',
        '2026-04-26': 'O',
        '2026-04-27': 'D',
      },
      e2: {
        '2026-04-27': 'N',
        '2026-04-28': 'N',
        '2026-04-29': 'N',
        '2026-04-30': 'N',
        '2026-05-01': 'O',
      },
    });

    expect(result.violations).toEqual([]);
    expect(result.summaries.find((summary) => summary.code === 'nod_pattern')?.status).toBe('passed');
    expect(result.summaries.find((summary) => summary.code === 'triple_night')?.status).toBe('passed');
    expect(result.summaries.find((summary) => summary.code === 'rest_after_two_nights')?.status).toBe('passed');
  });

  it('degrades unknown shift codes to check_required', () => {
    const result = evaluate({
      e1: {
        '2026-05-01': 'X',
      },
    });

    expect(result.mandatoryPassed).toBe(false);
    expect(result.canFinalizeLocally).toBe(false);
    expect(result.checkRequiredCount).toBeGreaterThan(0);
    expect(result.summaries.some((summary) => summary.status === 'check_required')).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('degrades malformed dates to check_required without throwing', () => {
    expect(() =>
      evaluate({
        e1: {
          '2026-05-99': 'D',
          'not-a-date': 'N',
        },
      }),
    ).not.toThrow();

    const result = evaluate({
      e1: {
        '2026-05-99': 'D',
        'not-a-date': 'N',
      },
    });

    expect(result.mandatoryPassed).toBe(false);
    expect(result.canFinalizeLocally).toBe(false);
    expect(result.checkRequiredCount).toBeGreaterThanOrEqual(2);
    expect(result.summaries.every((summary) => summary.status === 'check_required')).toBe(true);
  });

  it('degrades missing required inputs to check_required without throwing', () => {
    const missingInput = undefined as unknown as Parameters<typeof evaluateScheduleCompliance>[0];

    expect(() => evaluateScheduleCompliance(missingInput)).not.toThrow();

    const result = evaluateScheduleCompliance(missingInput);

    expect(result.mandatoryPassed).toBe(false);
    expect(result.canFinalizeLocally).toBe(false);
    expect(result.checkRequiredCount).toBeGreaterThanOrEqual(5);
    expect(result.summaries.every((summary) => summary.status === 'check_required')).toBe(true);
    expect(result.offRequests).toEqual({
      totalRequests: 0,
      fulfilledRequests: 0,
      unfulfilledRequests: 0,
      reflectionRate: null,
    });
  });

  it('uses fallback shift times when shift definitions lack usable times', () => {
    const shiftsWithoutTimes = shifts.map((shift) => ({
      ...shift,
      startTime: null,
      endTime: null,
    }));

    const result = evaluateScheduleCompliance({
      month,
      employees,
      assignments: {
        e1: {
          '2026-05-01': 'N',
          '2026-05-02': 'N',
          '2026-05-03': 'O',
          '2026-05-04': 'O',
          '2026-05-05': 'D',
        },
      },
      offRequests: {},
      shifts: shiftsWithoutTimes,
    });

    expect(result.mandatoryPassed).toBe(true);
    expect(result.violations).toEqual([]);
    expect(result.summaries.find((summary) => summary.code === 'rest_after_two_nights')?.status).toBe('passed');
  });

  it('keeps custom overnight Night shifts on the logical next-day offset', () => {
    const customOvernightShifts = shifts.map((shift) =>
      shift.code === 'N'
        ? { ...shift, startTime: '20:00:00', endTime: '04:00:00' }
        : shift,
    );

    const result = evaluateScheduleCompliance({
      month,
      employees,
      assignments: {
        e1: {
          '2026-05-01': 'N',
          '2026-05-02': 'N',
          '2026-05-03': 'O',
          '2026-05-04': 'O',
          '2026-05-05': 'D',
        },
      },
      offRequests: {},
      shifts: customOvernightShifts,
    });

    expect(result.canFinalizeLocally).toBe(false);
    expect(result.violations).toEqual([
      expect.objectContaining({
        ruleCode: 'rest_after_two_nights',
        dates: ['2026-05-01', '2026-05-02', '2026-05-05'],
      }),
    ]);
  });

  it('counts target-month Off requests as fulfilled when no work shift is assigned', () => {
    const result = evaluate(
      {
        e1: {
          '2026-05-01': 'O',
          '2026-05-02': 'D',
          '2026-05-03': '',
          '2026-05-04': 'E',
          '2026-05-05': 'N',
          '2026-05-06': 'X',
          '2026-04-30': 'O',
        },
      },
      {
        e1: {
          '2026-05-01': 'O',
          '2026-05-02': 'O',
          '2026-05-03': 'O',
          '2026-05-04': 'O',
          '2026-05-05': 'O',
          '2026-05-06': 'O',
          '2026-05-07': 'O',
          '2026-04-30': 'O',
        },
        e2: {
          '2026-05-04': '',
        },
      },
    );

    expect(result.offRequests).toEqual({
      totalRequests: 7,
      fulfilledRequests: 3,
      unfulfilledRequests: 4,
      reflectionRate: 43,
    });
  });

  describe('preceptor_pairing', () => {
    const pairedEmployees = [
      { id: 'p1', name: '박선배' },
      { id: 't1', name: '김신규', preceptorId: 'p1' },
    ];

    function evaluatePairing(assignments: AssignmentMap) {
      return evaluateScheduleCompliance({
        month,
        employees: pairedEmployees,
        assignments,
        offRequests: {},
        shifts,
      });
    }

    function buildSameShiftAssignments(shiftCode: string, days: number): AssignmentMap {
      const dates = Array.from({ length: days }, (_, index) =>
        `2026-05-${String(index + 1).padStart(2, '0')}`
      );
      const byDate = Object.fromEntries(dates.map((date) => [date, shiftCode]));

      return {
        p1: { ...byDate },
        t1: { ...byDate },
      };
    }

    it('C1 passes when paired employees share the same shift every day', () => {
      const result = evaluatePairing(buildSameShiftAssignments('D', 31));

      expect(result.mandatoryPassed).toBe(true);
      expect(result.violations.some((violation) => violation.ruleCode === 'preceptor_pairing')).toBe(false);
      expect(result.summaries.find((summary) => summary.code === 'preceptor_pairing')?.status).toBe('passed');
    });

    it('C2 fails when paired employees differ on one day', () => {
      const assignments = buildSameShiftAssignments('D', 31);
      assignments.t1!['2026-05-15'] = 'E';

      const result = evaluatePairing(assignments);

      expect(result.mandatoryPassed).toBe(false);
      expect(result.canFinalizeLocally).toBe(false);
      expect(result.violations).toContainEqual(
        expect.objectContaining({
          ruleCode: 'preceptor_pairing',
          employeeId: 't1',
          dates: ['2026-05-15'],
        }),
      );
    });

    it('C3 skips employees without a preceptor', () => {
      const result = evaluateScheduleCompliance({
        month,
        employees: [{ id: 't1', name: '김신규', preceptorId: null }],
        assignments: {
          t1: {
            '2026-05-01': 'D',
            '2026-05-02': 'E',
          },
        },
        offRequests: {},
        shifts,
      });

      expect(result.violations.some((violation) => violation.ruleCode === 'preceptor_pairing')).toBe(false);
      expect(result.summaries.find((summary) => summary.code === 'preceptor_pairing')?.status).toBe('passed');
    });

    it('C4 fails when preceptee is O and preceptor is D', () => {
      const assignments = buildSameShiftAssignments('D', 31);
      assignments.t1!['2026-05-10'] = 'O';

      const result = evaluatePairing(assignments);

      expect(result.violations).toContainEqual(
        expect.objectContaining({
          ruleCode: 'preceptor_pairing',
          employeeId: 't1',
          dates: ['2026-05-10'],
        }),
      );
    });
  });

  it('ignores malformed target-month-looking Off request dates', () => {
    const result = evaluate(
      {
        e1: {
          '2026-05-01': 'O',
          '2026-05-99': 'O',
        },
      },
      {
        e1: {
          '2026-05-01': 'O',
          '2026-05-99': 'O',
        },
      },
    );

    expect(result.canFinalizeLocally).toBe(false);
    expect(result.checkRequiredCount).toBeGreaterThan(0);
    expect(result.offRequests).toEqual({
      totalRequests: 1,
      fulfilledRequests: 1,
      unfulfilledRequests: 0,
      reflectionRate: 100,
    });
  });
});
