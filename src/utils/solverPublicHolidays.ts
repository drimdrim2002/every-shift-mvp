import dayjs from 'dayjs';
import type { SolverPublicHoliday, SolverPublicHolidayKind } from '@/types/schedule';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'] as const;

const KIND_PRIORITY: Record<SolverPublicHolidayKind, number> = {
  friday: 1,
  saturday: 2,
  sunday: 3,
  publicHoliday: 4,
};

function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && dayjs(value).format('YYYY-MM-DD') === value;
}

function createHoliday(date: string, kind: SolverPublicHolidayKind): SolverPublicHoliday {
  const parsedDate = dayjs(date);
  const dayOfWeek = parsedDate.day();

  return {
    date,
    dayOfWeek,
    dayName: DAY_NAMES[dayOfWeek],
    kind,
  };
}

function upsertHoliday(
  holidaysByDate: Map<string, SolverPublicHoliday>,
  date: string,
  kind: SolverPublicHolidayKind
): void {
  if (!isValidIsoDate(date)) return;

  const existing = holidaysByDate.get(date);
  if (existing && KIND_PRIORITY[existing.kind] >= KIND_PRIORITY[kind]) {
    return;
  }

  holidaysByDate.set(date, createHoliday(date, kind));
}

export function buildSolverPublicHolidays(
  startDate: string,
  endDate: string,
  publicHolidayDates: string[]
): SolverPublicHoliday[] {
  const holidaysByDate = new Map<string, SolverPublicHoliday>();
  let cursor = dayjs(startDate);
  const lastDate = dayjs(endDate);

  while (cursor.isValid() && lastDate.isValid() && !cursor.isAfter(lastDate, 'day')) {
    const date = cursor.format('YYYY-MM-DD');
    const dayOfWeek = cursor.day();

    if (dayOfWeek === 5) {
      upsertHoliday(holidaysByDate, date, 'friday');
    } else if (dayOfWeek === 6) {
      upsertHoliday(holidaysByDate, date, 'saturday');
    } else if (dayOfWeek === 0) {
      upsertHoliday(holidaysByDate, date, 'sunday');
    }

    cursor = cursor.add(1, 'day');
  }

  for (const date of publicHolidayDates) {
    if (dayjs(date).isBefore(dayjs(startDate), 'day') || dayjs(date).isAfter(lastDate, 'day')) {
      continue;
    }

    upsertHoliday(holidaysByDate, date, 'publicHoliday');
  }

  return [...holidaysByDate.values()].sort((left, right) => left.date.localeCompare(right.date));
}

function isHolidayObject(value: unknown): value is Partial<SolverPublicHoliday> {
  return typeof value === 'object' && value !== null && 'date' in value;
}

export function normalizeSolverPublicHolidays(value: unknown): SolverPublicHoliday[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const holidaysByDate = new Map<string, SolverPublicHoliday>();

  for (const item of value) {
    if (typeof item === 'string') {
      upsertHoliday(holidaysByDate, item, 'publicHoliday');
      continue;
    }

    if (!isHolidayObject(item) || typeof item.date !== 'string') {
      continue;
    }

    const kind = item.kind && item.kind in KIND_PRIORITY ? item.kind : 'publicHoliday';
    upsertHoliday(holidaysByDate, item.date, kind);
  }

  return [...holidaysByDate.values()].sort((left, right) => left.date.localeCompare(right.date));
}
