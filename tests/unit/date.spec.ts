import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildSchedulableMonthWindow,
  getDefaultSchedulableMonth,
  isMonthWithinSchedulableWindow,
} from '@/utils/date'

describe('date utils', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-15T09:00:00+09:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('builds a 25-month window centered on the current month', () => {
    expect(buildSchedulableMonthWindow()).toEqual([
      '2025-05',
      '2025-06',
      '2025-07',
      '2025-08',
      '2025-09',
      '2025-10',
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
      '2027-03',
      '2027-04',
      '2027-05',
    ])
  })

  it('keeps boundary months selectable and rejects months outside the window', () => {
    expect(isMonthWithinSchedulableWindow('2025-05')).toBe(true)
    expect(isMonthWithinSchedulableWindow('2027-05')).toBe(true)
    expect(isMonthWithinSchedulableWindow('2025-04')).toBe(false)
    expect(isMonthWithinSchedulableWindow('2027-06')).toBe(false)
  })

  it('prefers next month when choosing the default new schedule month', () => {
    expect(getDefaultSchedulableMonth(new Set(['2026-05']))).toBe('2026-06')
  })

  it('falls back to the closest current-or-future month after next month', () => {
    expect(getDefaultSchedulableMonth(new Set(['2026-06']))).toBe('2026-05')
    expect(getDefaultSchedulableMonth(new Set(['2026-05', '2026-06']))).toBe('2026-07')
  })

  it('falls back to the most recent past month when current and future months are unavailable', () => {
    const usedMonths = new Set([
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
      '2027-03',
      '2027-04',
      '2027-05',
    ])

    expect(getDefaultSchedulableMonth(usedMonths)).toBe('2026-04')
  })

  it('returns null when every month in the window is already used', () => {
    expect(getDefaultSchedulableMonth(new Set(buildSchedulableMonthWindow()))).toBeNull()
  })
})
