import { supabase } from './supabase';

const PUBLIC_HOLIDAY_LOAD_ERROR =
  '공휴일 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';

interface PublicHolidayRow {
  holiday_date: string | null;
}

function createPublicHolidayLoadError(): Error {
  return new Error(PUBLIC_HOLIDAY_LOAD_ERROR);
}

function isValidIsoDate(date: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export async function listPublicHolidayDatesInRange(
  startDate: string,
  endDate: string,
): Promise<string[]> {
  if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) {
    throw createPublicHolidayLoadError();
  }

  if (startDate > endDate) {
    return [];
  }

  const { data, error } = await supabase
    .from('public_holidays')
    .select('holiday_date')
    .eq('country_code', 'KR')
    .eq('is_holiday', true)
    .gte('holiday_date', startDate)
    .lte('holiday_date', endDate)
    .order('holiday_date', { ascending: true });

  if (error) {
    throw createPublicHolidayLoadError();
  }

  return Array.from(
    new Set(
      ((data ?? []) as PublicHolidayRow[])
        .map((row) => row.holiday_date)
        .filter((date): date is string => typeof date === 'string' && isValidIsoDate(date)),
    ),
  ).sort();
}

export async function hasPublicHolidayCoverageForYear(year: number): Promise<boolean> {
  if (!Number.isInteger(year) || year < 1) {
    throw createPublicHolidayLoadError();
  }

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data, error } = await supabase
    .from('public_holidays')
    .select('holiday_date')
    .eq('country_code', 'KR')
    .eq('is_holiday', true)
    .gte('holiday_date', startDate)
    .lte('holiday_date', endDate)
    .limit(1);

  if (error) {
    throw createPublicHolidayLoadError();
  }

  return ((data ?? []) as PublicHolidayRow[]).some(
    (row) => typeof row.holiday_date === 'string' && isValidIsoDate(row.holiday_date),
  );
}
