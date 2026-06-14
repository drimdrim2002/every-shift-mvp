import type { EmployeeInput } from '@/types/employee';
import { generateEmployeeId } from '@/utils/employeeRosterMapping';

export function parseEmployeeExcelRows(
  rows: Array<Record<string, string>>,
  validShiftCodes: string[]
): { employees: EmployeeInput[]; errors: string[] } {
  const employees: EmployeeInput[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2; // header + 1-indexed

    const nameValue = row.name ? String(row.name).trim() : '';
    if (!nameValue) {
      errors.push(`${rowNum}행: 이름이 비어있습니다.`);
      return;
    }

    const shiftsStr = row.availableShifts ? String(row.availableShifts) : '';
    const shiftCodes = shiftsStr
      .split(/[,\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s !== '');

    const validShifts = shiftCodes.filter((s) => validShiftCodes.includes(s));

    if (validShifts.length === 0) {
      errors.push(`${rowNum}행: 유효한 시프트가 없습니다. (가능: ${validShiftCodes.join(', ')})`);
      return;
    }

    const employeeIdValue = row.employeeId ? String(row.employeeId).trim() : '';
    const employeeId = employeeIdValue || generateEmployeeId();

    const preceptorRaw = row.preceptorEmployeeId ? String(row.preceptorEmployeeId).trim() : '';
    const preceptorEmployeeId = preceptorRaw.length > 0 ? preceptorRaw : null;

    employees.push({
      employeeId,
      name: nameValue,
      availableShifts: validShifts,
      preceptorEmployeeId,
    });
  });

  return { employees, errors };
}
