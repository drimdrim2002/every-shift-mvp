import dayjs from 'dayjs';
import type { GridColumn } from '@/types/schedule';

const SHORT_DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'] as const;
const DEFAULT_MONTH_WINDOW_PAST = 12;
const DEFAULT_MONTH_WINDOW_FUTURE = 12;

function dayOfWeekToShortDayName(dayOfWeek: number): GridColumn['dayName'] {
  if (dayOfWeek < 0 || dayOfWeek >= SHORT_DAY_NAMES.length) {
    throw new Error(`잘못된 요일 번호: ${dayOfWeek}`);
  }
  return SHORT_DAY_NAMES[dayOfWeek]!;
}

function getMonthAnchor(baseDate: dayjs.ConfigType = dayjs()) {
  return dayjs(baseDate).startOf('month');
}

/**
 * 다음 달 반환 (YYYY-MM)
 * @returns 다음 달 문자열 (예: "2025-12")
 */
export function getNextMonth(): string {
  return dayjs().add(1, 'month').format('YYYY-MM');
}

/**
 * 현재 기준으로 선택 가능한 월 범위 반환
 * @returns 과거 12개월 ~ 미래 12개월의 25개월 배열
 */
export function buildSchedulableMonthWindow(
  baseDate: dayjs.ConfigType = dayjs(),
  pastMonths: number = DEFAULT_MONTH_WINDOW_PAST,
  futureMonths: number = DEFAULT_MONTH_WINDOW_FUTURE
): string[] {
  const anchor = getMonthAnchor(baseDate);
  const windowStart = anchor.subtract(pastMonths, 'month');

  return Array.from({ length: pastMonths + futureMonths + 1 }, (_, index) =>
    windowStart.add(index, 'month').format('YYYY-MM')
  );
}

/**
 * 특정 월이 현재 기준 선택 가능 범위 안에 있는지 확인
 */
export function isMonthWithinSchedulableWindow(
  month: string,
  baseDate: dayjs.ConfigType = dayjs(),
  pastMonths: number = DEFAULT_MONTH_WINDOW_PAST,
  futureMonths: number = DEFAULT_MONTH_WINDOW_FUTURE
): boolean {
  if (!month) {
    return false;
  }

  const targetMonth = dayjs(`${month}-01`);
  if (!targetMonth.isValid()) {
    return false;
  }

  const diffInMonths = targetMonth.diff(getMonthAnchor(baseDate), 'month');
  return diffInMonths >= -pastMonths && diffInMonths <= futureMonths;
}

/**
 * 특정 월이 선택 가능한지 확인
 */
export function isSchedulableMonthAvailable(
  month: string,
  existingMonths: Iterable<string>,
  baseDate: dayjs.ConfigType = dayjs(),
  pastMonths: number = DEFAULT_MONTH_WINDOW_PAST,
  futureMonths: number = DEFAULT_MONTH_WINDOW_FUTURE
): boolean {
  const existingMonthSet = new Set(existingMonths);
  return isMonthWithinSchedulableWindow(month, baseDate, pastMonths, futureMonths)
    && !existingMonthSet.has(month);
}

/**
 * 새 근무표 생성 시 기본 선택할 월 반환
 * 우선순위: 다음 달 → 현재 이후 가장 가까운 가능 월 → 과거 중 가장 최근 가능 월
 */
export function getDefaultSchedulableMonth(
  existingMonths: Iterable<string>,
  baseDate: dayjs.ConfigType = dayjs()
): string | null {
  const existingMonthSet = new Set(existingMonths);
  const anchor = getMonthAnchor(baseDate);
  const nextMonth = anchor.add(1, 'month').format('YYYY-MM');

  if (!existingMonthSet.has(nextMonth)) {
    return nextMonth;
  }

  for (let offset = 0; offset <= DEFAULT_MONTH_WINDOW_FUTURE; offset += 1) {
    if (offset === 1) {
      continue;
    }

    const candidate = anchor.add(offset, 'month').format('YYYY-MM');
    if (!existingMonthSet.has(candidate)) {
      return candidate;
    }
  }

  for (let offset = 1; offset <= DEFAULT_MONTH_WINDOW_PAST; offset += 1) {
    const candidate = anchor.subtract(offset, 'month').format('YYYY-MM');
    if (!existingMonthSet.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * 해당 월의 모든 날짜 정보 반환
 * @param month - 대상 월 (YYYY-MM)
 * @returns GridColumn 배열 (해당 월의 모든 날짜)
 */
export function getDaysInMonth(month: string): GridColumn[] {
  const start = dayjs(month + '-01');
  const daysCount = start.daysInMonth();

  return Array.from({ length: daysCount }, (_, i) => {
    const date = start.add(i, 'day');
    const dayOfWeek = date.day();
    return {
      date: date.format('YYYY-MM-DD'),
      day: date.date(),
      dayOfWeek, // 0(일) ~ 6(토)
      dayName: dayOfWeekToShortDayName(dayOfWeek),
      isLastMonth: false,
    };
  });
}

/**
 * 전월 마지막 N일 반환
 * @param month - 현재 월 (YYYY-MM)
 * @param count - 가져올 일수 (기본값: 5)
 * @returns GridColumn 배열 (전월 마지막 N일)
 */
export function getLastDaysOfPreviousMonth(month: string, count: number = 5): GridColumn[] {
  const currentMonthStart = dayjs(month + '-01');
  const previousMonthEnd = currentMonthStart.subtract(1, 'day');

  const days: GridColumn[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = previousMonthEnd.subtract(i, 'day');
    const dayOfWeek = date.day();
    days.push({
      date: date.format('YYYY-MM-DD'),
      day: date.date(),
      dayOfWeek,
      dayName: dayOfWeekToShortDayName(dayOfWeek),
      isLastMonth: true,
    });
  }
  return days;
}
