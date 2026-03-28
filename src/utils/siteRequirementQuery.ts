import { dayOfWeekToDayName } from '@/types/excel'
import type { SiteRequirementRow } from '@/types/excel'
import type { DailyRequirement } from '@/types/schedule'

type DailyRequirementShiftCode = keyof Omit<DailyRequirement, 'total'>

interface NormalizedSiteRequirementQueryRow {
  dayOfWeek: number
  requiredCount: number
  shiftCode: string
}

const DAILY_REQUIREMENT_SHIFT_CODES: DailyRequirementShiftCode[] = ['D', 'E', 'N', 'O']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function extractNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function extractShiftCode(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const code = extractShiftCode(item)
      if (code) {
        return code
      }
    }
    return null
  }

  if (!isRecord(value)) {
    return null
  }

  const code = value.code
  return typeof code === 'string' && code.trim() !== '' ? code.trim().toUpperCase() : null
}

export function normalizeSiteRequirementQueryRows(
  value: unknown
): NormalizedSiteRequirementQueryRow[] {
  if (!Array.isArray(value)) {
    return []
  }

  const rows: NormalizedSiteRequirementQueryRow[] = []

  for (const item of value) {
    if (!isRecord(item)) {
      continue
    }

    const dayOfWeek = extractNumber(item.day_of_week)
    const requiredCount = extractNumber(item.required_count)
    const shiftCode = extractShiftCode(item.shifts)

    if (
      dayOfWeek === null
      || !Number.isInteger(dayOfWeek)
      || dayOfWeek < 0
      || dayOfWeek > 6
      || requiredCount === null
      || shiftCode === null
    ) {
      continue
    }

    rows.push({
      dayOfWeek,
      requiredCount,
      shiftCode,
    })
  }

  return rows
}

export function normalizeSiteRequirementList(value: unknown): SiteRequirementRow[] {
  return normalizeSiteRequirementQueryRows(value).map((row) => ({
    dayOfWeek: row.dayOfWeek,
    dayName: dayOfWeekToDayName(row.dayOfWeek),
    shiftCode: row.shiftCode,
    requiredCount: row.requiredCount,
  }))
}

export function isDailyRequirementShiftCode(code: string): code is DailyRequirementShiftCode {
  return DAILY_REQUIREMENT_SHIFT_CODES.includes(code as DailyRequirementShiftCode)
}
