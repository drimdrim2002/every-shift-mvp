import type { SolverYearlyEmployeeStats } from '@/types/schedule';

function toNonNegativeInteger(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.floor(value);
}

export function buildZeroYearlyEmployeeStats(employeeIds: string[]): SolverYearlyEmployeeStats[] {
  return [...new Set(employeeIds)].map((employeeId) => ({
    employee_id: employeeId,
    night_shift_count: 0,
    weekend_holiday_work_count: 0,
    approved_off_request_count: 0,
  }));
}

export function normalizeYearlyEmployeeStats(
  stats: SolverYearlyEmployeeStats[]
): SolverYearlyEmployeeStats[] {
  return [...stats]
    .map((stat) => ({
      employee_id: stat.employee_id,
      night_shift_count: toNonNegativeInteger(stat.night_shift_count),
      weekend_holiday_work_count: toNonNegativeInteger(stat.weekend_holiday_work_count),
      approved_off_request_count: toNonNegativeInteger(stat.approved_off_request_count),
    }))
    .sort((left, right) => {
      if (left.employee_id < right.employee_id) return -1;
      if (left.employee_id > right.employee_id) return 1;
      return 0;
    });
}
