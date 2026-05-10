import { describe, expect, it } from 'vitest';

import {
  buildEmployeeOffRequestRows,
  buildEmployeeScheduleRows,
  filterEmployeeViolations,
  selectDefaultResultEmployeeId,
} from '@/utils/employeeResultDetail';
import type { Employee } from '@/types/employee';
import type { GridColumn, ScheduleOffRequestResult } from '@/types/schedule';
import type { ScheduleComplianceViolation } from '@/types/scheduleCompliance';

function createEmployee(id: string, name = id): Employee {
  return {
    id,
    organizationId: 'org-1',
    employeeId: id,
    name,
    availableShifts: ['D', 'E', 'N', 'O'],
  };
}

function createViolation(
  employeeId: string,
  overrides: Partial<ScheduleComplianceViolation> = {}
): ScheduleComplianceViolation {
  return {
    id: `violation-${employeeId}`,
    ruleCode: 'nod_pattern',
    employeeId,
    employeeName: employeeId,
    dates: ['2025-12-01'],
    message: '위반',
    ...overrides,
  };
}

function createDate(
  date: string,
  day: number,
  dayName: string,
  dayOfWeek = 1,
  isLastMonth = false
): GridColumn {
  return {
    date,
    day,
    dayOfWeek,
    dayName,
    isLastMonth,
  };
}

function createOffRequestResult(
  overrides: Partial<ScheduleOffRequestResult> = {}
): ScheduleOffRequestResult {
  return {
    employeeId: 'employee-1',
    date: '2025-12-01',
    requestCode: 'O',
    requestNote: '가족 행사',
    isSoft: false,
    resolutionStatus: 'unfulfilled',
    resolvedShiftId: 'shift-d',
    resolvedAt: '2025-11-20T00:00:00.000Z',
    fulfilled: false,
    reason: '인력 부족',
    ...overrides,
  };
}

describe('employee result detail helpers', () => {
  it('keeps the current employee when that employee still exists', () => {
    const employees = [createEmployee('employee-1'), createEmployee('employee-2')];
    const violations = [createViolation('employee-2')];

    expect(selectDefaultResultEmployeeId(employees, violations, 'employee-1')).toBe('employee-1');
  });

  it('selects the first violating employee when the current employee is missing', () => {
    const employees = [createEmployee('employee-1'), createEmployee('employee-2')];
    const violations = [createViolation('employee-2'), createViolation('employee-1')];

    expect(selectDefaultResultEmployeeId(employees, violations, 'missing-employee')).toBe('employee-2');
  });

  it('falls back to the first employee and returns null when no employee exists', () => {
    expect(selectDefaultResultEmployeeId([createEmployee('employee-1')], [], null)).toBe('employee-1');
    expect(selectDefaultResultEmployeeId([], [], null)).toBeNull();
  });

  it('filters violations to the selected employee', () => {
    const violations = [
      createViolation('employee-1', { id: 'violation-1' }),
      createViolation('employee-2', { id: 'violation-2' }),
      createViolation('employee-1', { id: 'violation-3' }),
    ];

    expect(filterEmployeeViolations(violations, 'employee-1')).toEqual([
      violations[0],
      violations[2],
    ]);
    expect(filterEmployeeViolations(violations, null)).toEqual([]);
  });

  it('builds schedule rows with notes and blank missing assignments in input date order', () => {
    const rows = buildEmployeeScheduleRows({
      employeeId: 'employee-1',
      dates: [
        createDate('2025-11-30', 30, '일', 0, true),
        createDate('2025-12-01', 1, '월', 1),
      ],
      assignments: {
        'employee-1': {
          '2025-11-30': 'N',
        },
      },
      offRequests: {
        'employee-1': {
          '2025-12-01': 'O',
        },
      },
      offRequestNotes: {
        'employee-1': {
          '2025-12-01': '병원 예약',
        },
      },
    });

    expect(rows).toEqual([
      {
        date: '2025-11-30',
        day: 30,
        dayOfWeek: 0,
        dayName: '일',
        isLastMonth: true,
        assignment: 'N',
        hasOffRequest: false,
        offRequestNote: null,
      },
      {
        date: '2025-12-01',
        day: 1,
        dayOfWeek: 1,
        dayName: '월',
        isLastMonth: false,
        assignment: '',
        hasOffRequest: true,
        offRequestNote: '병원 예약',
      },
    ]);
  });

  it('prefers evaluation Off request rows and adds fallback rows with O assignment fulfillment', () => {
    const rows = buildEmployeeOffRequestRows({
      employeeId: 'employee-1',
      assignments: {
        'employee-1': {
          '2025-12-01': 'D',
          '2025-12-02': 'O',
          '2025-12-03': 'N',
        },
      },
      offRequests: {
        'employee-1': {
          '2025-12-01': 'O',
          '2025-12-02': 'O',
          '2025-12-03': 'O',
        },
        'employee-2': {
          '2025-12-04': 'O',
        },
      },
      offRequestNotes: {
        'employee-1': {
          '2025-12-02': '가족 행사',
          '2025-12-03': '개인 일정',
        },
      },
      offRequestResults: [
        createOffRequestResult({
          employeeId: 'employee-1',
          date: '2025-12-01',
          requestNote: '평가 메모',
          resolvedShiftId: 'shift-o',
          fulfilled: false,
          reason: '평가 사유',
        }),
        createOffRequestResult({
          employeeId: 'employee-2',
          date: '2025-12-04',
          fulfilled: true,
        }),
      ],
    });

    expect(rows).toEqual([
      {
        employeeId: 'employee-1',
        date: '2025-12-01',
        requestNote: '평가 메모',
        actualAssignment: 'D',
        fulfilled: false,
        reason: '평가 사유',
        source: 'evaluation',
      },
      {
        employeeId: 'employee-1',
        date: '2025-12-02',
        requestNote: '가족 행사',
        actualAssignment: 'O',
        fulfilled: true,
        reason: null,
        source: 'fallback',
      },
      {
        employeeId: 'employee-1',
        date: '2025-12-03',
        requestNote: '개인 일정',
        actualAssignment: 'N',
        fulfilled: false,
        reason: null,
        source: 'fallback',
      },
    ]);
  });

  it('fulfills fallback off requests when assignment is missing or blank', () => {
    expect(
      buildEmployeeOffRequestRows({
        employeeId: 'employee-1',
        assignments: {
          'employee-1': {
            '2025-12-02': '',
            '2025-12-03': '   ',
          },
        },
        offRequests: {
          'employee-1': {
            '2025-12-01': 'O',
            '2025-12-02': 'O',
            '2025-12-03': 'O',
          },
        },
        offRequestNotes: {},
        offRequestResults: [],
      })
    ).toEqual([
      {
        employeeId: 'employee-1',
        date: '2025-12-01',
        requestNote: null,
        actualAssignment: '미배정',
        fulfilled: true,
        reason: null,
        source: 'fallback',
      },
      {
        employeeId: 'employee-1',
        date: '2025-12-02',
        requestNote: null,
        actualAssignment: '',
        fulfilled: true,
        reason: null,
        source: 'fallback',
      },
      {
        employeeId: 'employee-1',
        date: '2025-12-03',
        requestNote: null,
        actualAssignment: '   ',
        fulfilled: true,
        reason: null,
        source: 'fallback',
      },
    ]);
  });

  it('leaves fallback off requests unfulfilled for work shifts', () => {
    const rows = buildEmployeeOffRequestRows({
      employeeId: 'employee-1',
      assignments: {
        'employee-1': {
          '2025-12-01': 'D',
          '2025-12-02': 'E',
          '2025-12-03': 'N',
          '2025-12-04': 'X',
        },
      },
      offRequests: {
        'employee-1': {
          '2025-12-01': 'O',
          '2025-12-02': 'O',
          '2025-12-03': 'O',
          '2025-12-04': 'O',
        },
      },
      offRequestNotes: {},
      offRequestResults: [],
    });

    expect(rows.map((row) => [row.actualAssignment, row.fulfilled])).toEqual([
      ['D', false],
      ['E', false],
      ['N', false],
      ['X', false],
    ]);
  });

  it('sorts off request rows by date across unsorted evaluation and fallback inputs', () => {
    const rows = buildEmployeeOffRequestRows({
      employeeId: 'employee-1',
      assignments: {
        'employee-1': {
          '2025-12-01': 'O',
          '2025-12-02': 'D',
          '2025-12-03': 'E',
          '2025-12-04': 'N',
        },
      },
      offRequests: {
        'employee-1': {
          '2025-12-04': 'O',
          '2025-12-01': 'O',
        },
      },
      offRequestNotes: {},
      offRequestResults: [
        createOffRequestResult({
          employeeId: 'employee-1',
          date: '2025-12-03',
          requestNote: '셋째 날 평가',
        }),
        createOffRequestResult({
          employeeId: 'employee-1',
          date: '2025-12-02',
          requestNote: '둘째 날 평가',
        }),
      ],
    });

    expect(rows.map((row) => `${row.date}:${row.source}`)).toEqual([
      '2025-12-01:fallback',
      '2025-12-02:evaluation',
      '2025-12-03:evaluation',
      '2025-12-04:fallback',
    ]);
  });

  it('keeps evaluation fulfillment even when the displayed assignment is missing', () => {
    expect(
      buildEmployeeOffRequestRows({
        employeeId: 'employee-1',
        assignments: {},
        offRequests: {},
        offRequestNotes: {},
        offRequestResults: [
          createOffRequestResult({
            employeeId: 'employee-1',
            date: '2025-12-02',
            requestNote: null,
            fulfilled: false,
          }),
        ],
      })
    ).toEqual([
      {
        employeeId: 'employee-1',
        date: '2025-12-02',
        requestNote: null,
        actualAssignment: '미배정',
        fulfilled: false,
        reason: '인력 부족',
        source: 'evaluation',
      },
    ]);
  });
});
