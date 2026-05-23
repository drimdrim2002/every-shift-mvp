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
  WorkPerformancePreferenceResolutionStatus,
} from '@/types/workPerformance';

const WORK_PERFORMANCE_LOAD_ERROR = '근무 기록을 불러오지 못했습니다';
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
  missingMonths: string[];
}

export type WorkPerformanceLoadResult =
  | WorkPerformanceLoadSuccess
  | { status: 'noFinalizedSchedule' }
  | { status: 'missingHolidayCoverage' };

export interface WorkPerformanceLatestFinalizedMonth {
  year: number;
  month: number;
}

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
  resolution_status: string | null;
}

interface EmployeeRow {
  id: string | null;
  employee_id: string | null;
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

export function getPreviousDate(dateStr: string): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

export function getNextDate(dateStr: string): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
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
    resolutionStatus: normalizePreferenceResolutionStatus(row.resolution_status),
  };
}

function normalizePreferenceResolutionStatus(
  value: string | null,
): WorkPerformancePreferenceResolutionStatus | null {
  return value === 'pending' || value === 'fulfilled' || value === 'unfulfilled' ? value : null;
}

function normalizeEmployee(row: EmployeeRow): WorkPerformanceEmployeeRow {
  const id = assertRequiredString(row.id);
  const trimmedEmployeeId = typeof row.employee_id === 'string' ? row.employee_id.trim() : '';

  return {
    id,
    employeeId: trimmedEmployeeId || id,
    name: assertRequiredString(row.name),
  };
}

function parseScheduleMonth(month: string | null): WorkPerformanceLatestFinalizedMonth | null {
  if (typeof month !== 'string') {
    return null;
  }

  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const parsedMonth = Number(match[2]);

  if (!Number.isInteger(year) || !Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
    return null;
  }

  return { year, month: parsedMonth };
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
      .order('schedule_version_id', { ascending: true })
      .order('date', { ascending: true })
      .order('employee_id', { ascending: true })
      .order('shift_id', { ascending: true })
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
      .select('schedule_version_id, employee_id, date, request_code, resolution_status')
      .in('schedule_version_id', finalizedVersionIds)
      .eq('request_code', 'O')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('schedule_version_id', { ascending: true })
      .order('date', { ascending: true })
      .order('employee_id', { ascending: true })
      .range(from, to),
  );

  return rows.map(normalizePreference);
}

async function loadEmployees(organizationId: string): Promise<WorkPerformanceEmployeeRow[]> {
  const rows = await loadPagedRows<EmployeeRow>((from, to) =>
    supabase
      .from('employees')
      .select('id, employee_id, name')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true })
      .order('employee_id', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to),
  );

  return rows.map(normalizeEmployee);
}

export async function loadLatestFinalizedWorkPerformanceMonth(
  organizationId: string,
): Promise<WorkPerformanceLatestFinalizedMonth | null> {
  try {
    const { data, error } = await supabase
      .from('schedules')
      .select('month')
      .eq('organization_id', organizationId)
      .not('finalized_version_id', 'is', null)
      .order('month', { ascending: false })
      .limit(1);

    if (error) {
      throw createWorkPerformanceLoadError();
    }

    const [latestSchedule] = (data ?? []) as Pick<ScheduleRow, 'month'>[];

    return parseScheduleMonth(latestSchedule?.month ?? null);
  } catch (error) {
    if (error instanceof Error && error.message === WORK_PERFORMANCE_LOAD_ERROR) {
      throw error;
    }

    throw createWorkPerformanceLoadError();
  }
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

    const finalizedMonths = selectedMonths.filter((month) => {
      const schedule = schedulesByMonth.get(month);

      return Boolean(schedule?.finalized_version_id);
    });

    if (finalizedMonths.length === 0) {
      return { status: 'noFinalizedSchedule' };
    }

    const finalizedVersionIds = finalizedMonths.map((month) =>
      assertRequiredString(schedulesByMonth.get(month)?.finalized_version_id),
    );

    const prevDateStr = getPreviousDate(period.startDate);
    const prevMonthLabel = prevDateStr.substring(0, 7); // "YYYY-MM"

    if (!selectedMonths.includes(prevMonthLabel)) {
      const { data: prevSchedule } = await supabase
        .from('schedules')
        .select('finalized_version_id')
        .eq('organization_id', params.organizationId)
        .eq('month', prevMonthLabel)
        .maybeSingle();

      if (prevSchedule?.finalized_version_id) {
        finalizedVersionIds.unshift(prevSchedule.finalized_version_id);
      }
    }

    if (!(await hasPublicHolidayCoverageForYear(params.year))) {
      return { status: 'missingHolidayCoverage' };
    }

    const publicHolidayDates = await listPublicHolidayDatesInRange(period.startDate, getNextDate(period.endDate));
    const [assignments, offRequests, employees] = await Promise.all([
      loadAssignments(finalizedVersionIds, getPreviousDate(period.startDate), period.endDate),
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
      missingMonths,
    };
  } catch (error) {
    if (error instanceof Error && error.message === WORK_PERFORMANCE_LOAD_ERROR) {
      throw error;
    }

    throw createWorkPerformanceLoadError();
  }
}
