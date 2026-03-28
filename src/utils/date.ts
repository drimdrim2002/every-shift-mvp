import dayjs from 'dayjs';
import type { GridColumn } from '@/types/schedule';

const SHORT_DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'] as const;

function dayOfWeekToShortDayName(dayOfWeek: number): GridColumn['dayName'] {
  if (dayOfWeek < 0 || dayOfWeek >= SHORT_DAY_NAMES.length) {
    throw new Error(`잘못된 요일 번호: ${dayOfWeek}`);
  }
  return SHORT_DAY_NAMES[dayOfWeek]!;
}

/**
 * 다음 달 반환 (YYYY-MM)
 * @returns 다음 달 문자열 (예: "2025-12")
 */
export function getNextMonth(): string {
  return dayjs().add(1, 'month').format('YYYY-MM');
}

/**
 * 선택 가능한 월 목록 반환 (이번 달, 다음 달, 다다음 달)
 * @returns 3개월 배열 (예: ["2025-11", "2025-12", "2026-01"])
 */
export function getAvailableMonths(): string[] {
  return [
    dayjs().format('YYYY-MM'),
    dayjs().add(1, 'month').format('YYYY-MM'),
    dayjs().add(2, 'month').format('YYYY-MM'),
  ];
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
