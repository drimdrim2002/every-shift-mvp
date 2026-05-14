import { describe, expect, it } from 'vitest';
import {
  buildScheduleInputSnapshot,
  normalizeScheduleSolverInput,
} from '@/utils/scheduleInputSnapshot';
import type { SolverRequest } from '@/types/schedule';

function createSolverRequest(publicHolidays: string[] = []): SolverRequest {
  return {
    organization: {
      id: 'org-1',
      name: '테스트병원',
      type: 'hospital',
      shifts: [
        {
          id: 'shift-d',
          code: 'D',
          name: 'Day',
          start_time: '08:00:00',
          end_time: '16:00:00',
        },
      ],
      lastHistoricalDate: '2025-12-27',
      firstDraftDate: '2026-01-01',
      publishLength: 5,
      draftLength: 31,
    },
    employees: [
      {
        employee_id: 'emp-1',
        name: '직원1',
        available_shifts: ['N', 'D'],
        skill_set: ['RN', 'ALL'],
      },
    ],
    history: [],
    undesirable: [],
    requirements: [
      {
        shiftId: 'shift-d',
        dayIndex: 0,
        employeeCount: 2,
      },
    ],
    publicHolidays,
  };
}

describe('schedule input snapshot', () => {
  it('normalizes public holidays as sorted unique dates', () => {
    const solverInput = normalizeScheduleSolverInput({
      scheduleId: 'schedule-1',
      siteId: 'site-1',
      month: '2026-01',
      lastMonthDays: 5,
      solverRequest: createSolverRequest(['2026-01-03', '2026-01-01', '2026-01-03']),
    });

    expect(solverInput).toMatchObject({
      publicHolidays: ['2026-01-01', '2026-01-03'],
    });
  });

  it('changes the snapshot hash when public holidays change', async () => {
    const baseSnapshot = await buildScheduleInputSnapshot({
      scheduleId: 'schedule-1',
      siteId: 'site-1',
      month: '2026-01',
      lastMonthDays: 5,
      solverRequest: createSolverRequest([]),
      generatorVersion: 'test-generator',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    const holidaySnapshot = await buildScheduleInputSnapshot({
      scheduleId: 'schedule-1',
      siteId: 'site-1',
      month: '2026-01',
      lastMonthDays: 5,
      solverRequest: createSolverRequest(['2026-01-01']),
      generatorVersion: 'test-generator',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(holidaySnapshot.solverInputHash).not.toBe(baseSnapshot.solverInputHash);
  });
});
