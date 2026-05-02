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

  it('reports N N N as a triple_night violation', () => {
    const result = evaluate({
      e1: {
        '2026-05-01': 'N',
        '2026-05-02': 'N',
        '2026-05-03': 'N',
      },
    });

    expect(result.mandatoryPassed).toBe(false);
    expect(result.violations).toEqual([
      expect.objectContaining({
        ruleCode: 'triple_night',
        employeeId: 'e1',
        dates: ['2026-05-01', '2026-05-02', '2026-05-03'],
      }),
      expect.objectContaining({
        ruleCode: 'rest_after_two_nights',
        employeeId: 'e1',
        dates: ['2026-05-01', '2026-05-02', '2026-05-03'],
      }),
    ]);
    expect(result.summaries.find((summary) => summary.code === 'triple_night')?.status).toBe('failed');
  });

  it('blocks when first work after two nights starts before 48 hours', () => {
    const result = evaluate({
      e1: {
        '2026-05-01': 'N',
        '2026-05-02': 'N',
        '2026-05-03': 'D',
      },
    });

    expect(result.canFinalizeLocally).toBe(false);
    expect(result.violations).toEqual([
      expect.objectContaining({
        ruleCode: 'rest_after_two_nights',
        dates: ['2026-05-01', '2026-05-02', '2026-05-03'],
      }),
    ]);
    expect(result.violations[0]?.message).toContain('48시간');
  });

  it('passes rest_after_two_nights when the next work starts after 48 hours', () => {
    const result = evaluate({
      e1: {
        '2026-05-01': 'N',
        '2026-05-02': 'N',
        '2026-05-03': 'O',
        '2026-05-04': 'O',
        '2026-05-05': 'D',
      },
    });

    expect(result.mandatoryPassed).toBe(true);
    expect(result.summaries.find((summary) => summary.code === 'rest_after_two_nights')?.status).toBe('passed');
    expect(result.violations).toEqual([]);
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

  it('counts only target-month Off requests and only O as fulfilled', () => {
    const result = evaluate(
      {
        e1: {
          '2026-05-01': 'O',
          '2026-05-02': 'D',
          '2026-05-03': '',
          '2026-04-30': 'O',
        },
      },
      {
        e1: {
          '2026-05-01': 'O',
          '2026-05-02': 'O',
          '2026-05-03': 'O',
          '2026-04-30': 'O',
        },
        e2: {
          '2026-05-04': '',
        },
      },
    );

    expect(result.offRequests).toEqual({
      totalRequests: 3,
      fulfilledRequests: 1,
      unfulfilledRequests: 2,
      reflectionRate: 33,
    });
  });
});
