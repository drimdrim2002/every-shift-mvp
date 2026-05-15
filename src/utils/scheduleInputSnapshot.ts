import type {
  ScheduleInputSnapshot,
  ScheduleInputSnapshotSolverInput,
  SolverRequest,
} from '@/types/schedule';
import { normalizeSolverPublicHolidays } from '@/utils/solverPublicHolidays';
import { normalizeYearlyEmployeeStats } from '@/utils/solverYearlyEmployeeStats';

export const SCHEDULE_INPUT_SNAPSHOT_GENERATOR_VERSION = 'schedule-input-snapshot:v1';

export interface BuildScheduleInputSnapshotInput {
  scheduleId: string;
  siteId: string | null;
  month: string;
  lastMonthDays: number;
  solverRequest: SolverRequest;
  generatorVersion?: string;
  createdAt?: string;
}

function compareByText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortObjectKeys(value));
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortObjectKeys(item));
  }

  if (typeof value !== 'object' || value === null) {
    return value;
  }

  const record = value as Record<string, unknown>;
  return Object.keys(record)
    .sort()
    .reduce<Record<string, unknown>>((normalized, key) => {
      normalized[key] = sortObjectKeys(record[key]);
      return normalized;
    }, {});
}

async function sha256Hex(value: string): Promise<string> {
  const payload = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', payload);
  const bytes = new Uint8Array(digest);
  const hex = Array.from(bytes)
    .map((chunk) => chunk.toString(16).padStart(2, '0'))
    .join('');

  return `sha256:${hex}`;
}

export function normalizeScheduleSolverInput(
  input: BuildScheduleInputSnapshotInput
): ScheduleInputSnapshotSolverInput {
  const { solverRequest } = input;

  return {
    scheduleId: input.scheduleId,
    organizationId: solverRequest.organization.id,
    siteId: input.siteId,
    month: input.month,
    lastMonthDays: input.lastMonthDays,
    publicHolidays: normalizeSolverPublicHolidays(solverRequest.publicHolidays),
    yearlyEmployeeStats: normalizeYearlyEmployeeStats(solverRequest.yearlyEmployeeStats ?? []),
    employees: solverRequest.employees
      .map((employee) => ({
        employeeId: employee.employee_id,
        availableShifts: [...employee.available_shifts].sort(compareByText),
        skillSet: [...employee.skill_set].sort(compareByText),
      }))
      .sort((left, right) => compareByText(left.employeeId, right.employeeId)),
    assignments: solverRequest.history
      .map((assignment) => ({
        employeeId: assignment.employee_id,
        date: assignment.date,
        shiftId: assignment.shift_id,
        isLocked: assignment.is_locked,
      }))
      .sort((left, right) => {
        const employeeDiff = compareByText(left.employeeId, right.employeeId);
        if (employeeDiff !== 0) return employeeDiff;

        const dateDiff = compareByText(left.date, right.date);
        if (dateDiff !== 0) return dateDiff;

        return compareByText(left.shiftId, right.shiftId);
      }),
    employeeConstraints: solverRequest.undesirable
      .map((constraint) => ({
        employeeId: constraint.employee_id,
        date: constraint.date,
        isLocked: constraint.is_locked,
      }))
      .sort((left, right) => {
        const employeeDiff = compareByText(left.employeeId, right.employeeId);
        if (employeeDiff !== 0) return employeeDiff;

        return compareByText(left.date, right.date);
      }),
    hospitalRules: {
      organizationType: solverRequest.organization.type,
      shifts: solverRequest.organization.shifts
        .map((shift) => ({
          id: shift.id,
          code: shift.code,
          startTime: shift.start_time,
          endTime: shift.end_time,
        }))
        .sort((left, right) => {
          const codeDiff = compareByText(left.code, right.code);
          if (codeDiff !== 0) return codeDiff;

          return compareByText(left.id, right.id);
        }),
      lastHistoricalDate: solverRequest.organization.lastHistoricalDate,
      firstDraftDate: solverRequest.organization.firstDraftDate,
      publishLength: solverRequest.organization.publishLength,
      draftLength: solverRequest.organization.draftLength,
    },
    monthlyRequirements: solverRequest.requirements
      .map((requirement) => ({
        shiftId: requirement.shiftId,
        dayIndex: requirement.dayIndex,
        employeeCount: requirement.employeeCount,
      }))
      .sort((left, right) => {
        const dayDiff = left.dayIndex - right.dayIndex;
        if (dayDiff !== 0) return dayDiff;

        return compareByText(left.shiftId, right.shiftId);
      }),
  };
}

export async function buildScheduleInputSnapshot(
  input: BuildScheduleInputSnapshotInput
): Promise<ScheduleInputSnapshot> {
  const solverInput = normalizeScheduleSolverInput(input);
  const solverInputHash = await sha256Hex(stableStringify(solverInput));

  return {
    solverInputHash,
    solverInput,
    generatorVersion: input.generatorVersion ?? SCHEDULE_INPUT_SNAPSHOT_GENERATOR_VERSION,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}
