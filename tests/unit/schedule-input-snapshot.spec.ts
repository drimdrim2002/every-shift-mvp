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
    yearlyEmployeeStats: [
      {
        employee_id: 'emp-1',
        night_shift_count: 2,
        weekend_holiday_work_count: 1,
        approved_off_request_count: 3,
      },
    ],
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

  it('normalizes yearly employee stats by employee id with non-negative integer counts', () => {
    const solverRequest = createSolverRequest();
    solverRequest.yearlyEmployeeStats = [
      {
        employee_id: 'emp-2',
        night_shift_count: 1.2,
        weekend_holiday_work_count: -1,
        approved_off_request_count: Number.NaN,
      },
      {
        employee_id: 'emp-1',
        night_shift_count: 4,
        weekend_holiday_work_count: 2,
        approved_off_request_count: 1,
      },
    ];

    const solverInput = normalizeScheduleSolverInput({
      scheduleId: 'schedule-1',
      siteId: 'site-1',
      month: '2026-01',
      lastMonthDays: 5,
      solverRequest,
    });

    expect(solverInput.yearlyEmployeeStats).toEqual([
      {
        employee_id: 'emp-1',
        night_shift_count: 4,
        weekend_holiday_work_count: 2,
        approved_off_request_count: 1,
      },
      {
        employee_id: 'emp-2',
        night_shift_count: 1,
        weekend_holiday_work_count: 0,
        approved_off_request_count: 0,
      },
    ]);
  });

  it('changes the snapshot hash when yearly employee stats change', async () => {
    const baseRequest = createSolverRequest();
    const changedRequest = createSolverRequest();
    changedRequest.yearlyEmployeeStats = [
      {
        employee_id: 'emp-1',
        night_shift_count: 3,
        weekend_holiday_work_count: 1,
        approved_off_request_count: 3,
      },
    ];

    const baseSnapshot = await buildScheduleInputSnapshot({
      scheduleId: 'schedule-1',
      siteId: 'site-1',
      month: '2026-01',
      lastMonthDays: 5,
      solverRequest: baseRequest,
      generatorVersion: 'test-generator',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    const changedSnapshot = await buildScheduleInputSnapshot({
      scheduleId: 'schedule-1',
      siteId: 'site-1',
      month: '2026-01',
      lastMonthDays: 5,
      solverRequest: changedRequest,
      generatorVersion: 'test-generator',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(changedSnapshot.solverInputHash).not.toBe(baseSnapshot.solverInputHash);
  });
});
