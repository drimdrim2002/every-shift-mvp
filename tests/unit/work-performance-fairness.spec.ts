import { describe, expect, it } from 'vitest'
import {
  compareIsoDate,
  formatKoreanMonthDay,
  getIsoDayOfWeek,
  isIsoDate,
  listMonthDates,
  listPeriodDates,
} from '@/utils/workPerformanceFairness'

describe('work performance fairness date helpers', () => {
  it('lists every date in a requested month using ISO date strings', () => {
    expect(listMonthDates(2026, 1)).toContain('2026-01-01')
    expect(listMonthDates(2026, 1).at(-1)).toBe('2026-01-31')
    expect(listMonthDates(2026, 3)).toContain('2026-03-01')
    expect(listMonthDates(2026, 3).at(-1)).toBe('2026-03-31')
    expect(listMonthDates(2028, 2)).toContain('2028-02-29')
    expect(listMonthDates(2028, 2).at(-1)).toBe('2028-02-29')
  })

  it('lists every date across an inclusive month period', () => {
    expect(listPeriodDates(2026, 1, 1)).toContain('2026-01-01')
    expect(listPeriodDates(2028, 2, 2)).toContain('2028-02-29')
    expect(listPeriodDates(2026, 9, 10)).toContain('2026-10-09')
  })

  it('rejects a period whose start month is after its end month', () => {
    expect(() => listPeriodDates(2026, 3, 1)).toThrow('시작 월은 종료 월보다 늦을 수 없습니다')
  })

  it('calculates the ISO date day of week without local timezone parsing', () => {
    expect(getIsoDayOfWeek('2026-01-01')).toBe(4)
    expect(getIsoDayOfWeek('2026-01-03')).toBe(6)
    expect(getIsoDayOfWeek('2026-03-01')).toBe(0)
    expect(getIsoDayOfWeek('2026-10-09')).toBe(5)
    expect(getIsoDayOfWeek('2028-02-29')).toBe(2)
  })

  it('formats ISO dates as Korean month/day labels', () => {
    expect(formatKoreanMonthDay('2026-01-03')).toBe('1/3 토')
    expect(formatKoreanMonthDay('2026-03-01')).toBe('3/1 일')
    expect(formatKoreanMonthDay('2026-10-09')).toBe('10/9 금')
    expect(formatKoreanMonthDay('2028-02-29')).toBe('2/29 화')
  })

  it('validates and compares ISO date-only strings', () => {
    expect(isIsoDate('2026-01-01')).toBe(true)
    expect(isIsoDate('2028-02-29')).toBe(true)
    expect(isIsoDate('2026-02-29')).toBe(false)
    expect(isIsoDate('2026-1-01')).toBe(false)
    expect(compareIsoDate('2026-01-01', '2026-01-02')).toBeLessThan(0)
    expect(compareIsoDate('2026-01-02', '2026-01-01')).toBeGreaterThan(0)
    expect(compareIsoDate('2026-01-01', '2026-01-01')).toBe(0)
  })
})
