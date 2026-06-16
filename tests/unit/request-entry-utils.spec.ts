import { describe, expect, it } from 'vitest';
import type { GridColumn } from '@/types/schedule';
import {
  buildMonthCalendarMatrix,
  formatCalendarWeekLabel,
  findWeekPageIndexForDate,
} from '@/components/schedule/request-entry/requestEntryUtils';

function buildMay2026Dates(): GridColumn[] {
  // 2026-05-01 = Friday (dayOfWeek 5)
  return Array.from({ length: 31 }, (_, index) => {
    const day = index + 1;
    const date = `2026-05-${String(day).padStart(2, '0')}`;
    const dayOfWeek = (5 + index) % 7; // Fri=5 .. Thu=4 on 31st
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    return {
      date,
      day,
      dayOfWeek,
      dayName: dayNames[dayOfWeek]!,
      isLastMonth: false,
    };
  });
}

describe('buildMonthCalendarMatrix — May 2026', () => {
  it('pads 5 null cells before May 1 (Friday) and produces 6 weeks', () => {
    const weeks = buildMonthCalendarMatrix(buildMay2026Dates());
    expect(weeks).toHaveLength(6);
    expect(weeks[0]!.slice(0, 5).every((cell) => cell === null)).toBe(true);
    expect(weeks[0]![5]?.day).toBe(1);
    expect(weeks[0]![6]?.day).toBe(2);
  });
});

describe('formatCalendarWeekLabel', () => {
  it('formats a single in-month day', () => {
    const week: Array<GridColumn | null> = [
      null, null, null, null, null,
      { date: '2026-05-01', day: 1, dayOfWeek: 5, dayName: '금', isLastMonth: false },
      { date: '2026-05-02', day: 2, dayOfWeek: 6, dayName: '토', isLastMonth: false },
    ];
    expect(formatCalendarWeekLabel(week)).toBe('1일(금) ~ 2일(토)');
  });

  it('returns empty string for all-null week', () => {
    expect(formatCalendarWeekLabel(Array(7).fill(null))).toBe('');
  });
});

describe('findWeekPageIndexForDate', () => {
  it('returns 1-based page index for in-month date', () => {
    const dates = buildMay2026Dates();
    expect(findWeekPageIndexForDate(dates, '2026-05-01')).toBe(1);
    expect(findWeekPageIndexForDate(dates, '2026-05-11')).toBe(3);
  });

  it('returns null for unknown date', () => {
    expect(findWeekPageIndexForDate(buildMay2026Dates(), '2026-06-01')).toBeNull();
  });
});
