import { hasPublicHolidayCoverageForYear, listPublicHolidayDatesInRange } from './publicHolidays';
import { supabase } from './supabase';
import {
  listPeriodDates,
} from '@/utils/workPerformanceFairness';
import type {
  WorkPerformanceAssignmentRow,
  WorkPerformanceEmployeeRow,
  WorkPerformancePeriod,
  WorkPerformancePreferenceRow,
} from '@/types/workPerformance';

const WORK_PERFORMANCE_LOAD_ERROR = '근무 실적을 불러오지 못했습니다';
const PAGE_SIZE = 1000;

export interface WorkPerformanceLoadParams {
  organizationId: string;
  year: number;
  startMonth: number;
  endMonth: number;
}

export interface WorkPerformanceLoadSuccess {
  status: 'success';
  period: WorkPerformancePeriod;
  employees: WorkPerformanceEmployeeRow[];
  assignments: WorkPerformanceAssignmentRow[];
  offRequests: WorkPerformancePreferenceRow[];
  publicHolidayDates: string[];
  finalizedMonths: string[];
  finalizedVersionIds: string[];
}

export type WorkPerformanceLoadResult =
  | WorkPerformanceLoadSuccess
  | { status: 'missingFinalizedMonth'; missingMonths: string[] }
  | { status: 'noFinalizedSchedule' }
  | { status: 'missingHolidayCoverage' };

interface ScheduleRow {
  id: string | null;
  month: string | null;
  finalized_version_id: string | null;
}

interface ShiftRow {
  code: string | null;
  name: string | null;
}

interface AssignmentRow {
  schedule_version_id: string | null;
  employee_id: string | null;
  date: string | null;
  shift_id: string | null;
  shifts: ShiftRow | ShiftRow[] | null;
}

interface PreferenceRow {
  schedule_version_id: string | null;
  employee_id: string | null;
  date: string | null;
  request_code: string | null;
}

interface EmployeeRow {
  id: string | null;
  name: string | null;
}

function createWorkPerformanceLoadError(): Error {
  return new Error(WORK_PERFORMANCE_LOAD_ERROR);
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function buildMonthLabel(year: number, month: number): string {
  return `${year}-${pad2(month)}`;
}

function getMonthLabels(year: number, startMonth: number, endMonth: number): string[] {
  return Array.from({ length: endMonth - startMonth + 1 }, (_value, index) =>
    buildMonthLabel(year, startMonth + index),
  );
}

function buildPeriod(params: WorkPerformanceLoadParams): WorkPerformancePeriod {
  const dates = listPeriodDates(params.year, params.startMonth, params.endMonth);
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  if (!startDate || !endDate) {
    throw createWorkPerformanceLoadError();
  }

  return {
    year: params.year,
    startMonth: params.startMonth,
    endMonth: params.endMonth,
    startDate,
    endDate,
  };
}

function normalizeShift(shifts: ShiftRow | ShiftRow[] | null): ShiftRow | null {
  if (Array.isArray(shifts)) {
    return shifts[0] ?? null;
  }

  return shifts;
}

function assertRequiredString(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw createWorkPerformanceLoadError();
  }

  return value;
}

function normalizeAssignment(row: AssignmentRow): WorkPerformanceAssignmentRow {
  const shift = normalizeShift(row.shifts);

  return {
    scheduleVersionId: assertRequiredString(row.schedule_version_id),
    employeeId: assertRequiredString(row.employee_id),
    date: assertRequiredString(row.date),
    shiftId: typeof row.shift_id === 'string' ? row.shift_id : null,
    shiftCode: typeof shift?.code === 'string' ? shift.code : null,
    shiftName: typeof shift?.name === 'string' ? shift.name : null,
  };
}

function normalizePreference(row: PreferenceRow): WorkPerformancePreferenceRow {
  return {
    scheduleVersionId: assertRequiredString(row.schedule_version_id),
    employeeId: assertRequiredString(row.employee_id),
    date: assertRequiredString(row.date),
    requestCode: 'O',
  };
}

function normalizeEmployee(row: EmployeeRow): WorkPerformanceEmployeeRow {
  return {
    id: assertRequiredString(row.id),
    name: assertRequiredString(row.name),
  };
}

async function hasAnyFinalizedSchedule(organizationId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('schedules')
    .select('id')
    .eq('organization_id', organizationId)
    .not('finalized_version_id', 'is', null)
    .limit(1);

  if (error) {
    throw createWorkPerformanceLoadError();
  }

  return (data ?? []).length > 0;
}

async function loadPagedRows<Row>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>,
): Promise<Row[]> {
  const rows: Row[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);

    if (error) {
      throw createWorkPerformanceLoadError();
    }

    const page = (data ?? []) as Row[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      return rows;
    }

    from += PAGE_SIZE;
  }
}

async function loadAssignments(
  finalizedVersionIds: string[],
  startDate: string,
  endDate: string,
): Promise<WorkPerformanceAssignmentRow[]> {
  const rows = await loadPagedRows<AssignmentRow>((from, to) =>
    supabase
      .from('schedule_assignments')
      .select('schedule_version_id, employee_id, date, shift_id, shifts(code, name)')
      .in('schedule_version_id', finalizedVersionIds)
      .gte('date', startDate)
      .lte('date', endDate)
      .range(from, to),
  );

  return rows.map(normalizeAssignment);
}

async function loadOffRequests(
  finalizedVersionIds: string[],
  startDate: string,
  endDate: string,
): Promise<WorkPerformancePreferenceRow[]> {
  const rows = await loadPagedRows<PreferenceRow>((from, to) =>
    supabase
      .from('schedule_preferences')
      .select('schedule_version_id, employee_id, date, request_code')
      .in('schedule_version_id', finalizedVersionIds)
      .eq('request_code', 'O')
      .gte('date', startDate)
      .lte('date', endDate)
      .range(from, to),
  );

  return rows.map(normalizePreference);
}

async function loadEmployees(organizationId: string): Promise<WorkPerformanceEmployeeRow[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true });

  if (error) {
    throw createWorkPerformanceLoadError();
  }

  return ((data ?? []) as EmployeeRow[]).map(normalizeEmployee);
}

export async function loadWorkPerformancePeriod(
  params: WorkPerformanceLoadParams,
): Promise<WorkPerformanceLoadResult> {
  try {
    const period = buildPeriod(params);
    const selectedMonths = getMonthLabels(params.year, params.startMonth, params.endMonth);
    const firstMonth = selectedMonths[0];
    const lastMonth = selectedMonths[selectedMonths.length - 1];

    const { data: scheduleData, error: scheduleError } = await supabase
      .from('schedules')
      .select('id, month, finalized_version_id')
      .eq('organization_id', params.organizationId)
      .gte('month', firstMonth)
      .lte('month', lastMonth)
      .order('month', { ascending: true });

    if (scheduleError) {
      throw createWorkPerformanceLoadError();
    }

    const schedulesByMonth = new Map(
      ((scheduleData ?? []) as ScheduleRow[]).map((row) => [row.month, row]),
    );
    const missingMonths = selectedMonths.filter((month) => {
      const schedule = schedulesByMonth.get(month);

      return !schedule?.finalized_version_id;
    });

    if (missingMonths.length > 0) {
      if (!(await hasAnyFinalizedSchedule(params.organizationId))) {
        return { status: 'noFinalizedSchedule' };
      }

      return {
        status: 'missingFinalizedMonth',
        missingMonths,
      };
    }

    const finalizedMonths = selectedMonths;
    const finalizedVersionIds = selectedMonths.map((month) =>
      assertRequiredString(schedulesByMonth.get(month)?.finalized_version_id),
    );

    if (!(await hasPublicHolidayCoverageForYear(params.year))) {
      return { status: 'missingHolidayCoverage' };
    }

    const publicHolidayDates = await listPublicHolidayDatesInRange(period.startDate, period.endDate);
    const [assignments, offRequests, employees] = await Promise.all([
      loadAssignments(finalizedVersionIds, period.startDate, period.endDate),
      loadOffRequests(finalizedVersionIds, period.startDate, period.endDate),
      loadEmployees(params.organizationId),
    ]);

    return {
      status: 'success',
      period,
      employees,
      assignments,
      offRequests,
      publicHolidayDates,
      finalizedMonths,
      finalizedVersionIds,
    };
  } catch (error) {
    if (error instanceof Error && error.message === WORK_PERFORMANCE_LOAD_ERROR) {
      throw error;
    }

    throw createWorkPerformanceLoadError();
  }
}
