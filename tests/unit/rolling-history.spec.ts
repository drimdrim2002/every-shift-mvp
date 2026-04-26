import { expect, it } from 'vitest';

import {
  buildRollingHistoryWindow,
  mergeAssignmentMapsWithFallback,
  mergePlanningAssignmentsWithFallback,
} from '@/utils/rollingHistory';

it('builds the exact previous-month carry-over window from month + lastMonthDays', () => {
  expect(buildRollingHistoryWindow('2025-04', 5)).toEqual({
    firstDraftDate: '2025-04-01',
    lastHistoricalDate: '2025-03-26',
    publishLength: 5,
    previousMonthDates: [
      '2025-03-27',
      '2025-03-28',
      '2025-03-29',
      '2025-03-30',
      '2025-03-31',
    ],
  });
});

it('keeps preview-version rows authoritative when fallback and current rows overlap', () => {
  expect(
    mergePlanningAssignmentsWithFallback(
      [
        { employee_id: 'emp-1', shift_id: 'shift-e', date: '2025-03-31', is_locked: false },
      ],
      [
        { employee_id: 'emp-1', shift_id: 'shift-d', date: '2025-03-31', is_locked: true },
        { employee_id: 'emp-1', shift_id: 'shift-n', date: '2025-03-30', is_locked: true },
      ],
      buildRollingHistoryWindow('2025-04', 5),
    ),
  ).toEqual([
    { employee_id: 'emp-1', shift_id: 'shift-n', date: '2025-03-30', is_locked: true },
    { employee_id: 'emp-1', shift_id: 'shift-e', date: '2025-03-31', is_locked: false },
  ]);
});

it('merges assignment maps with current rows overriding fallback rows within allowed dates only', () => {
  expect(
    mergeAssignmentMapsWithFallback(
      {
        'emp-1': {
          '2025-03-30': 'N',
          '2025-03-31': 'E',
          '2025-03-29': 'X',
        },
      },
      {
        'emp-1': {
          '2025-03-30': 'D',
          '2025-03-31': 'D',
          '2025-03-28': 'D',
        },
      },
      buildRollingHistoryWindow('2025-04', 5).previousMonthDates,
    ),
  ).toEqual({
    'emp-1': {
      '2025-03-28': 'D',
      '2025-03-29': 'X',
      '2025-03-30': 'N',
      '2025-03-31': 'E',
    },
  });
});

it('removes fallback assignment map values when current rows provide an explicit empty string', () => {
  expect(
    mergeAssignmentMapsWithFallback(
      {
        'emp-1': {
          '2025-03-30': '',
        },
      },
      {
        'emp-1': {
          '2025-03-30': 'D',
        },
      },
      buildRollingHistoryWindow('2025-04', 5).previousMonthDates,
    ),
  ).toEqual({
    'emp-1': {},
  });
});

it('drops out-of-window assignment map dates from both current and fallback inputs', () => {
  expect(
    mergeAssignmentMapsWithFallback(
      {
        'emp-1': {
          '2025-03-30': 'N',
          '2025-03-26': 'D',
        },
      },
      {
        'emp-1': {
          '2025-03-30': 'D',
          '2025-03-26': 'E',
        },
      },
      buildRollingHistoryWindow('2025-04', 5).previousMonthDates,
    ),
  ).toEqual({
    'emp-1': {
      '2025-03-30': 'N',
    },
  });
});
