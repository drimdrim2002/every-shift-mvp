import type { Employee } from '@/types/employee';
import type {
  AssignmentMap,
  CommentMap,
  ConstraintMap,
  GridColumn,
  ScheduleOffRequestResult,
} from '@/types/schedule';
import type { ScheduleComplianceViolation } from '@/types/scheduleCompliance';

export interface EmployeeScheduleRow {
  date: string;
  day: number;
  dayOfWeek: number;
  dayName: string;
  isLastMonth: boolean;
  assignment: string;
  hasOffRequest: boolean;
  offRequestNote: string | null;
}

export interface EmployeeOffRequestRow {
  employeeId: string;
  date: string;
  requestNote: string | null;
  actualAssignment: string;
  fulfilled: boolean;
  reason: string | null;
  source: 'evaluation' | 'fallback';
}

interface BuildEmployeeScheduleRowsInput {
  employeeId: string;
  dates: GridColumn[];
  assignments: AssignmentMap;
  offRequests: ConstraintMap;
  offRequestNotes: CommentMap;
}

interface BuildEmployeeOffRequestRowsInput {
  employeeId: string;
  assignments: AssignmentMap;
  offRequests: ConstraintMap;
  offRequestNotes: CommentMap;
  offRequestResults: ScheduleOffRequestResult[];
}

function getEmployeeAssignment(assignments: AssignmentMap, employeeId: string, date: string): string {
  return assignments[employeeId]?.[date] ?? '';
}

function getEmployeeActualAssignment(
  assignments: AssignmentMap,
  employeeId: string,
  date: string
): string {
  const employeeAssignments = assignments[employeeId];

  if (!employeeAssignments || !Object.prototype.hasOwnProperty.call(employeeAssignments, date)) {
    return '미배정';
  }

  return employeeAssignments[date] ?? '미배정';
}

function getEmployeeNote(notes: CommentMap, employeeId: string, date: string): string | null {
  const employeeNotes = notes[employeeId];

  if (!employeeNotes || !Object.prototype.hasOwnProperty.call(employeeNotes, date)) {
    return null;
  }

  return employeeNotes[date] ?? null;
}

function isFallbackOffRequestFulfilled(actualAssignment: string): boolean {
  return actualAssignment === '미배정' || actualAssignment.trim() === '' || actualAssignment === 'O';
}

export function selectDefaultResultEmployeeId(
  employees: Employee[],
  violations: ScheduleComplianceViolation[],
  currentEmployeeId: string | null
): string | null {
  const employeeIds = new Set(employees.map((employee) => employee.id));

  if (currentEmployeeId && employeeIds.has(currentEmployeeId)) {
    return currentEmployeeId;
  }

  const firstViolatingEmployee = violations.find((violation) => employeeIds.has(violation.employeeId));

  if (firstViolatingEmployee) {
    return firstViolatingEmployee.employeeId;
  }

  return employees[0]?.id ?? null;
}

export function filterEmployeeViolations(
  violations: ScheduleComplianceViolation[],
  employeeId: string | null
): ScheduleComplianceViolation[] {
  if (!employeeId) {
    return [];
  }

  return violations.filter((violation) => violation.employeeId === employeeId);
}

export function buildEmployeeScheduleRows(
  input: BuildEmployeeScheduleRowsInput
): EmployeeScheduleRow[] {
  const { employeeId, dates, assignments, offRequests, offRequestNotes } = input;

  return dates.map((dateColumn) => ({
    date: dateColumn.date,
    day: dateColumn.day,
    dayOfWeek: dateColumn.dayOfWeek,
    dayName: dateColumn.dayName,
    isLastMonth: dateColumn.isLastMonth,
    assignment: getEmployeeAssignment(assignments, employeeId, dateColumn.date),
    hasOffRequest: offRequests[employeeId]?.[dateColumn.date] === 'O',
    offRequestNote: getEmployeeNote(offRequestNotes, employeeId, dateColumn.date),
  }));
}

export function buildEmployeeOffRequestRows(
  input: BuildEmployeeOffRequestRowsInput
): EmployeeOffRequestRow[] {
  const { employeeId, assignments, offRequests, offRequestNotes, offRequestResults } = input;
  const rowsByDate = new Map<string, EmployeeOffRequestRow>();

  offRequestResults
    .filter((result) => result.employeeId === employeeId)
    .forEach((result) => {
      rowsByDate.set(result.date, {
        employeeId,
        date: result.date,
        requestNote: result.requestNote,
        actualAssignment: getEmployeeActualAssignment(assignments, employeeId, result.date),
        fulfilled: result.fulfilled,
        reason: result.reason,
        source: 'evaluation',
      });
    });

  Object.entries(offRequests[employeeId] ?? {}).forEach(([date, requestCode]) => {
    if (requestCode !== 'O' || rowsByDate.has(date)) {
      return;
    }

    const actualAssignment = getEmployeeActualAssignment(assignments, employeeId, date);

    rowsByDate.set(date, {
      employeeId,
      date,
      requestNote: getEmployeeNote(offRequestNotes, employeeId, date),
      actualAssignment,
      fulfilled: isFallbackOffRequestFulfilled(actualAssignment),
      reason: null,
      source: 'fallback',
    });
  });

  return [...rowsByDate.values()].sort((left, right) => left.date.localeCompare(right.date));
}
