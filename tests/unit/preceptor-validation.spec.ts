import { describe, expect, it } from 'vitest';
import type { EmployeeInput } from '@/types/employee';
import {
  buildPreceptorCandidateOptions,
  hasOverlappingWorkShifts,
  validatePreceptorAssignment,
  validatePreceptorExcelRows,
} from '@/utils/preceptorValidation';

function createEmployees(): EmployeeInput[] {
  return [
    {
      employeeId: 'P-1',
      name: '박선배',
      availableShifts: ['D', 'E', 'N', 'O'],
    },
    {
      employeeId: 'T-1',
      name: '김신규',
      availableShifts: ['D', 'E', 'O'],
    },
    {
      employeeId: 'T-2',
      name: '이신규',
      availableShifts: ['D', 'E', 'O'],
    },
    {
      employeeId: 'C-1',
      name: '최체인',
      availableShifts: ['D', 'E', 'O'],
      preceptorEmployeeId: 'P-1',
    },
  ];
}

describe('preceptorValidation', () => {
  it('passes when preceptor is null', () => {
    expect(
      validatePreceptorAssignment({
        employees: createEmployees(),
        targetIndex: 1,
        preceptorEmployeeId: null,
      })
    ).toBeNull();
  });

  it('rejects self assignment', () => {
    expect(
      validatePreceptorAssignment({
        employees: createEmployees(),
        targetIndex: 1,
        preceptorEmployeeId: 'T-1',
      })
    ).toBe('본인을 프리셉터로 지정할 수 없습니다.');
  });

  it('rejects when work shifts do not overlap', () => {
    const employees = createEmployees();
    employees[0] = {
      ...employees[0]!,
      availableShifts: ['N'],
    };

    expect(
      validatePreceptorAssignment({
        employees,
        targetIndex: 1,
        preceptorEmployeeId: 'P-1',
      })
    ).toBe('프리셉터와 가능 시프트가 겹치지 않습니다.');
  });

  it('rejects when preceptor is already assigned to another preceptee', () => {
    const employees = createEmployees();
    employees[2] = {
      ...employees[2]!,
      preceptorEmployeeId: 'P-1',
    };

    expect(
      validatePreceptorAssignment({
        employees,
        targetIndex: 1,
        preceptorEmployeeId: 'P-1',
      })
    ).toBe('선택한 프리셉터는 이미 다른 직원의 프리셉터입니다.');
  });

  it('rejects chain assignment when preceptor already has a preceptor', () => {
    expect(
      validatePreceptorAssignment({
        employees: createEmployees(),
        targetIndex: 1,
        preceptorEmployeeId: 'C-1',
      })
    ).toBe('프리셉터 관계는 연속(체인)으로 지정할 수 없습니다.');
  });

  it('detects overlapping work shifts excluding O', () => {
    expect(hasOverlappingWorkShifts(['D', 'O'], ['D', 'E'])).toBe(true);
    expect(hasOverlappingWorkShifts(['O'], ['O'])).toBe(false);
    expect(hasOverlappingWorkShifts(['D'], ['N', 'O'])).toBe(false);
  });

  it('returns PRECEPTOR_NOT_FOUND for unknown preceptor employee id', () => {
    const employees: EmployeeInput[] = [
      { employeeId: 'P-1', name: '박선배', availableShifts: ['D', 'E'] },
      { employeeId: 'T-1', name: '김신규', availableShifts: ['D'], preceptorEmployeeId: 'MISSING' },
    ];

    expect(validatePreceptorExcelRows(employees)).toEqual([
      expect.objectContaining({
        row: 3,
        code: 'PRECEPTOR_NOT_FOUND',
        message: "3행: 프리셉터 직번 'MISSING'를 찾을 수 없습니다.",
      }),
    ]);
  });

  it('builds candidate options with none first and disabled invalid candidates', () => {
    const employees = createEmployees();
    employees[2] = {
      ...employees[2]!,
      preceptorEmployeeId: 'P-1',
    };

    const options = buildPreceptorCandidateOptions(employees, 1);

    expect(options[0]).toMatchObject({ label: '(없음)', value: null });
    expect(options.some((option) => String(option.label).includes('이미 지정됨'))).toBe(true);
    expect(options.some((option) => String(option.label).includes('체인 불가'))).toBe(true);
    expect(options.every((option) => option.value === null || option.disabled === true)).toBe(true);
  });
});
