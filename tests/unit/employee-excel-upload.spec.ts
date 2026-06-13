import { describe, expect, it } from 'vitest';
import { parseEmployeeExcelRows } from '@/utils/employeeExcelParser';

describe('employeeExcelUpload', () => {
  it('parses preceptorEmployeeId from fourth column', () => {
    const { employees } = parseEmployeeExcelRows(
      [{ employeeId: 'T-1', name: '김신규', availableShifts: 'D', preceptorEmployeeId: 'P-1' }],
      ['D']
    );
    expect(employees[0]?.preceptorEmployeeId).toBe('P-1');
  });

  it('sets preceptorEmployeeId to null when fourth column is empty', () => {
    const { employees } = parseEmployeeExcelRows(
      [{ employeeId: 'T-1', name: '김신규', availableShifts: 'D', preceptorEmployeeId: '' }],
      ['D']
    );
    expect(employees[0]?.preceptorEmployeeId).toBeNull();
  });

  it('trims preceptorEmployeeId whitespace', () => {
    const { employees } = parseEmployeeExcelRows(
      [{ employeeId: 'T-1', name: '김신규', availableShifts: 'D', preceptorEmployeeId: '  P-1  ' }],
      ['D']
    );
    expect(employees[0]?.preceptorEmployeeId).toBe('P-1');
  });

  it('returns errors for rows missing name', () => {
    const { employees, errors } = parseEmployeeExcelRows(
      [{ employeeId: 'T-1', name: '', availableShifts: 'D', preceptorEmployeeId: '' }],
      ['D']
    );
    expect(employees).toHaveLength(0);
    expect(errors).toContain('2행: 이름이 비어있습니다.');
  });
});
