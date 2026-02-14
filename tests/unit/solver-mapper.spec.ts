import { describe, expect, it } from 'vitest';
import { mapToSolverRequest } from '@/utils/solverMapper';
import type {
  ConstraintMap,
  PlanningAssignment,
  PlanningEmployee,
  ScheduleBasicInfo,
  SiteRequirements,
} from '@/types/schedule';
import type { Shift } from '@/types/shift';

function createShifts(): Shift[] {
  return [
    {
      id: 'shift-d',
      organizationId: 'org-1',
      code: 'D',
      name: 'Day',
      colorCode: '#92D050',
      startTime: '08:00:00',
      endTime: '16:00:00',
    },
    {
      id: 'shift-e',
      organizationId: 'org-1',
      code: 'E',
      name: 'Evening',
      colorCode: '#FFC000',
      startTime: '16:00:00',
      endTime: '00:00:00',
    },
    {
      id: 'shift-n',
      organizationId: 'org-1',
      code: 'N',
      name: 'Night',
      colorCode: '#4472C4',
      startTime: '00:00:00',
      endTime: '08:00:00',
    },
    {
      id: 'shift-o',
      organizationId: 'org-1',
      code: 'O',
      name: 'Off',
      colorCode: '#D9D9D9',
      startTime: null,
      endTime: null,
    },
  ];
}

function createBasicInfo(shifts: Shift[]): ScheduleBasicInfo {
  return {
    month: '2025-12',
    organizationId: 'org-1',
    organizationName: '테스트병원',
    organizationType: 'hospital',
    employeeCount: 1,
    shifts,
  };
}

function createSiteRequirements(): SiteRequirements {
  return {
    '2025-12-01': { D: 3, E: 2, N: 1, O: 0, total: 6 },
    '2025-12-02': { D: 4, E: 2, N: 1, O: 0, total: 7 },
  };
}

function createEmployees(): PlanningEmployee[] {
  return [
    {
      employee_id: 'emp-1',
      name: '직원1',
      available_shifts: ['D', 'E', 'N', 'O'],
    },
  ];
}

function createConstraints(): ConstraintMap {
  return {
    'emp-1': {
      '2025-11-30': 'O',
      '2025-12-02': 'O',
    },
  };
}

function createAssignments(): PlanningAssignment[] {
  return [
    {
      employee_id: 'emp-1',
      shift_id: 'shift-d',
      date: '2025-11-30',
      is_locked: false,
    },
    {
      employee_id: 'emp-1',
      shift_id: 'shift-e',
      date: '2025-12-03',
      is_locked: true,
    },
    {
      employee_id: 'emp-1',
      shift_id: 'shift-n',
      date: '2025-12-04',
      is_locked: false,
    },
  ];
}

describe('mapToSolverRequest', () => {
  it('sets firstDraftDate/lastHistoricalDate/publishLength from lastMonthDays', () => {
    const shifts = createShifts();
    const payload = mapToSolverRequest(
      createBasicInfo(shifts),
      createSiteRequirements(),
      createConstraints(),
      createEmployees(),
      shifts,
      createAssignments(),
      4,
    );

    expect(payload.organization.firstDraftDate).toBe('2025-12-01');
    expect(payload.organization.lastHistoricalDate).toBe('2025-11-26');
    expect(payload.organization.publishLength).toBe(4);
    expect(payload.organization.draftLength).toBe(31);
  });

  it('supports zero previous-month days', () => {
    const shifts = createShifts();
    const payload = mapToSolverRequest(
      createBasicInfo(shifts),
      createSiteRequirements(),
      createConstraints(),
      createEmployees(),
      shifts,
      createAssignments(),
      0,
    );

    expect(payload.organization.firstDraftDate).toBe('2025-12-01');
    expect(payload.organization.lastHistoricalDate).toBe('2025-11-30');
    expect(payload.organization.publishLength).toBe(0);
  });

  it('keeps requirements/history/undesirable mapping behavior', () => {
    const shifts = createShifts();
    const payload = mapToSolverRequest(
      createBasicInfo(shifts),
      createSiteRequirements(),
      createConstraints(),
      createEmployees(),
      shifts,
      createAssignments(),
      4,
    );

    expect(payload.requirements).toEqual([
      { shiftId: 'shift-d', dayIndex: 0, employeeCount: 3 },
      { shiftId: 'shift-e', dayIndex: 0, employeeCount: 2 },
      { shiftId: 'shift-n', dayIndex: 0, employeeCount: 1 },
      { shiftId: 'shift-d', dayIndex: 1, employeeCount: 4 },
      { shiftId: 'shift-e', dayIndex: 1, employeeCount: 2 },
      { shiftId: 'shift-n', dayIndex: 1, employeeCount: 1 },
    ]);

    expect(payload.history).toEqual([
      {
        employee_id: 'emp-1',
        shift_id: 'shift-d',
        date: '2025-11-30',
        is_locked: true,
      },
      {
        employee_id: 'emp-1',
        shift_id: 'shift-e',
        date: '2025-12-03',
        is_locked: true,
      },
    ]);

    expect(payload.undesirable).toEqual([
      {
        employee_id: 'emp-1',
        shift_id: 'shift-o',
        date: '2025-12-02',
        is_locked: false,
      },
    ]);
  });
});
