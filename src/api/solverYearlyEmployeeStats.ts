import dayjs from 'dayjs';
import { supabase } from './supabase';
import type { SolverYearlyEmployeeStats } from '@/types/schedule';
import { buildZeroYearlyEmployeeStats } from '@/utils/solverYearlyEmployeeStats';

const SOLVER_YEARLY_STATS_LOAD_ERROR =
  '연간 근무 기록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';

const PAGE_SIZE = 1000;

interface LoadSolverYearlyEmployeeStatsInput {
  organizationId: string;
  year: number;
  employeeIds: string[];
}

interface FinalizedScheduleRow {
  finalized_version_id: string | null;
}

interface ShiftReference {
  code: string | null;
}

interface AssignmentRow {
  employee_id: string | null;
  date: string | null;
  shifts: ShiftReference | ShiftReference[] | null;
}

interface PreferenceRow {
  employee_id: string | null;
  request_code: string | null;
  resolution_status: string | null;
}

type QueryFactory = (from: number, to: number) => PromiseLike<{
  data: unknown[] | null;
  error: unknown;
}>;

function createLoadError(): Error {
  return new Error(SOLVER_YEARLY_STATS_LOAD_ERROR);
}

function normalizeShift(shifts: ShiftReference | ShiftReference[] | null): ShiftReference | null {
  if (Array.isArray(shifts)) {
    return shifts[0] ?? null;
  }

  return shifts;
}

function shouldCountWeekendHolidayWork(date: string, shiftCode: string): boolean {
  const day = dayjs(date).day();

  if (day === 5) {
    return shiftCode === 'N';
  }

  if (day === 6) {
    return shiftCode === 'D' || shiftCode === 'E' || shiftCode === 'N';
  }

  if (day === 0) {
    return shiftCode === 'D' || shiftCode === 'E';
  }

  return false;
}

async function loadPagedRows<Row>(queryFactory: QueryFactory): Promise<Row[]> {
  const rows: Row[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await queryFactory(from, from + PAGE_SIZE - 1);

    if (error) {
      throw createLoadError();
    }

    const page = (data ?? []) as Row[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      return rows;
    }

    from += PAGE_SIZE;
  }
}

async function loadFinalizedVersionIds(
  organizationId: string,
  startMonth: string,
  endMonth: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('schedules')
    .select('finalized_version_id')
    .eq('organization_id', organizationId)
    .gte('month', startMonth)
    .lte('month', endMonth)
    .not('finalized_version_id', 'is', null)
    .order('month', { ascending: true });

  if (error) {
    throw createLoadError();
  }

  return [...new Set(
    ((data ?? []) as FinalizedScheduleRow[])
      .map((row) => row.finalized_version_id)
      .filter((versionId): versionId is string => typeof versionId === 'string' && versionId.length > 0),
  )];
}

function createStatsMap(employeeIds: string[]): Map<string, SolverYearlyEmployeeStats> {
  return new Map(
    buildZeroYearlyEmployeeStats(employeeIds).map((stat) => [stat.employee_id, stat])
  );
}

export async function loadSolverYearlyEmployeeStats(
  input: LoadSolverYearlyEmployeeStatsInput
): Promise<SolverYearlyEmployeeStats[]> {
  const employeeIds = [...new Set(input.employeeIds)];
  const statsByEmployeeId = createStatsMap(employeeIds);

  if (employeeIds.length === 0) {
    return [];
  }

  if (!Number.isInteger(input.year) || input.year < 1) {
    throw createLoadError();
  }

  const startDate = `${input.year}-01-01`;
  const endDate = `${input.year}-12-31`;
  const finalizedVersionIds = await loadFinalizedVersionIds(
    input.organizationId,
    `${input.year}-01`,
    `${input.year}-12`,
  );

  if (finalizedVersionIds.length === 0) {
    return [...statsByEmployeeId.values()];
  }

  const assignmentRows = await loadPagedRows<AssignmentRow>((from, to) =>
    supabase
      .from('schedule_assignments')
      .select('schedule_version_id, employee_id, date, shifts(code)')
      .in('schedule_version_id', finalizedVersionIds)
      .in('employee_id', employeeIds)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('schedule_version_id', { ascending: true })
      .order('date', { ascending: true })
      .order('employee_id', { ascending: true })
      .range(from, to)
  );

  assignmentRows.forEach((row) => {
    const employeeId = row.employee_id;
    const date = row.date;
    const stats = typeof employeeId === 'string' ? statsByEmployeeId.get(employeeId) : undefined;

    if (!stats || typeof date !== 'string') {
      return;
    }

    const shiftCode = normalizeShift(row.shifts)?.code ?? '';
    if (shiftCode === 'N') {
      stats.night_shift_count += 1;
    }

    if (shouldCountWeekendHolidayWork(date, shiftCode)) {
      stats.weekend_holiday_work_count += 1;
    }
  });

  const preferenceRows = await loadPagedRows<PreferenceRow>((from, to) =>
    supabase
      .from('schedule_preferences')
      .select('schedule_version_id, employee_id, date, request_code, resolution_status')
      .in('schedule_version_id', finalizedVersionIds)
      .in('employee_id', employeeIds)
      .eq('request_code', 'O')
      .eq('resolution_status', 'fulfilled')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('schedule_version_id', { ascending: true })
      .order('date', { ascending: true })
      .order('employee_id', { ascending: true })
      .range(from, to)
  );

  preferenceRows.forEach((row) => {
    if (row.request_code !== 'O' || row.resolution_status !== 'fulfilled') {
      return;
    }

    const employeeId = row.employee_id;
    const stats = typeof employeeId === 'string' ? statsByEmployeeId.get(employeeId) : undefined;

    if (stats) {
      stats.approved_off_request_count += 1;
    }
  });

  return [...statsByEmployeeId.values()];
}
