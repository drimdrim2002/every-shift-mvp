import { describe, expect, it } from 'vitest';
import { hasUsableAssignments } from '@/utils/scheduleAssignments';

describe('hasUsableAssignments', () => {
  it('returns false for empty or missing maps', () => {
    expect(hasUsableAssignments(undefined)).toBe(false);
    expect(hasUsableAssignments(null)).toBe(false);
    expect(hasUsableAssignments({})).toBe(false);
    expect(hasUsableAssignments({ 'emp-1': {} })).toBe(false);
  });

  it('returns false for empty-string or whitespace shift codes', () => {
    expect(
      hasUsableAssignments({
        'emp-1': {
          '2026-03-01': '',
          '2026-03-02': '   ',
        },
      }),
    ).toBe(false);
  });

  it('returns true when any non-empty shift code exists, including O', () => {
    expect(
      hasUsableAssignments({
        'emp-1': {
          '2026-03-01': 'O',
        },
      }),
    ).toBe(true);

    expect(
      hasUsableAssignments({
        'emp-1': {
          '2026-03-01': 'D',
        },
      }),
    ).toBe(true);
  });

  it('filters by month when month is provided', () => {
    const assignments = {
      'emp-1': {
        '2026-02-28': 'N',
        '2026-03-01': '',
      },
    };

    expect(hasUsableAssignments(assignments, '2026-03')).toBe(false);
    expect(hasUsableAssignments(assignments, '2026-02')).toBe(true);
    expect(hasUsableAssignments(assignments)).toBe(true);
  });

  it('returns true for current-month codes when filtered', () => {
    expect(
      hasUsableAssignments(
        {
          'emp-1': {
            '2026-02-28': 'N',
            '2026-03-15': 'E',
          },
        },
        '2026-03',
      ),
    ).toBe(true);
  });
});
