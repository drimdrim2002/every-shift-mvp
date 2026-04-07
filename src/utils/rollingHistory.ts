import dayjs from 'dayjs';

import type { AssignmentMap, PlanningAssignment } from '@/types/schedule';

export interface RollingHistoryWindow {
  firstDraftDate: string;
  lastHistoricalDate: string;
  publishLength: number;
  previousMonthDates: string[];
}

export function buildRollingHistoryWindow(month: string, lastMonthDays: number): RollingHistoryWindow {
  const firstDraftDate = dayjs(`${month}-01`).format('YYYY-MM-DD');
  const publishLength = Math.max(0, Math.floor(lastMonthDays));
  const lastHistoricalDate = dayjs(firstDraftDate).subtract(publishLength + 1, 'day').format('YYYY-MM-DD');

  const previousMonthDates = Array.from({ length: publishLength }, (_, index) =>
    dayjs(firstDraftDate).subtract(publishLength - index, 'day').format('YYYY-MM-DD'),
  );

  return {
    firstDraftDate,
    lastHistoricalDate,
    publishLength,
    previousMonthDates,
  };
}

export function mergeAssignmentMapsWithFallback(
  currentPreviousAssignments: AssignmentMap,
  fallbackPreviousAssignments: AssignmentMap,
  allowedDates: string[],
): AssignmentMap {
  const allowed = new Set(allowedDates);
  const merged: AssignmentMap = JSON.parse(JSON.stringify(fallbackPreviousAssignments || {}));

  for (const [employeeId, dateMap] of Object.entries(currentPreviousAssignments || {})) {
    if (!merged[employeeId]) merged[employeeId] = {};
    for (const [date, shiftCode] of Object.entries(dateMap || {})) {
      if (!allowed.has(date)) continue;
      if (shiftCode === '') {
        delete merged[employeeId]![date];
        continue;
      }
      if (!shiftCode) continue;
      merged[employeeId]![date] = shiftCode;
    }
  }

  return Object.fromEntries(
    Object.entries(merged).map(([employeeId, dateMap]) => [
      employeeId,
      Object.fromEntries(
        Object.entries(dateMap || {}).filter(([date, shiftCode]) => allowed.has(date) && Boolean(shiftCode)),
      ),
    ]),
  );
}

export function mergePlanningAssignmentsWithFallback(
  currentAssignments: PlanningAssignment[],
  fallbackAssignments: PlanningAssignment[],
  window: RollingHistoryWindow,
): PlanningAssignment[] {
  const allowed = new Set(window.previousMonthDates);
  const merged = new Map<string, PlanningAssignment>();

  for (const row of fallbackAssignments) {
    if (!allowed.has(row.date)) continue;
    merged.set(`${row.employee_id}:${row.date}`, row);
  }

  for (const row of currentAssignments) {
    if (!allowed.has(row.date)) continue;
    merged.set(`${row.employee_id}:${row.date}`, row);
  }

  return Array.from(merged.values()).sort((left, right) => {
    if (left.date === right.date) return left.employee_id.localeCompare(right.employee_id);
    return left.date.localeCompare(right.date);
  });
}
