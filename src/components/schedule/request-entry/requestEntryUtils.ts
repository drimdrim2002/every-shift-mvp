import dayjs from 'dayjs'

import type { GridColumn } from '@/types/schedule'

export type Step4SelectionMode = 'single' | 'multi'

export type Step4MonthCalendarCell = GridColumn | null
export type Step4MonthCalendarWeek = Step4MonthCalendarCell[]

function sortGridDates(dates: GridColumn[]): GridColumn[] {
  return [...dates].sort((left, right) => left.date.localeCompare(right.date))
}

export function getCurrentMonthGridDates(dates: GridColumn[]): GridColumn[] {
  return sortGridDates(dates.filter((date) => !date.isLastMonth))
}

export function buildMonthCalendarMatrix(dates: GridColumn[]): Step4MonthCalendarWeek[] {
  const currentMonthDates = getCurrentMonthGridDates(dates)

  if (currentMonthDates.length === 0) {
    return []
  }

  const cells: Step4MonthCalendarCell[] = Array.from(
    { length: currentMonthDates[0]!.dayOfWeek },
    () => null,
  )

  cells.push(...currentMonthDates)

  while (cells.length % 7 !== 0) {
    cells.push(null)
  }

  const weeks: Step4MonthCalendarWeek[] = []
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7))
  }

  return weeks
}

export function normalizeSelectedDates(selectedDates: string[], dates: GridColumn[]): string[] {
  const allowedDateSet = new Set(getCurrentMonthGridDates(dates).map((date) => date.date))

  return [...new Set(selectedDates)]
    .filter((date) => allowedDateSet.has(date))
    .sort((left, right) => left.localeCompare(right))
}

export function buildDateRangeByGridOrder(
  startDate: string,
  endDate: string,
  dates: GridColumn[],
): string[] {
  const currentMonthDates = getCurrentMonthGridDates(dates)
  const startIndex = currentMonthDates.findIndex((date) => date.date === startDate)
  const endIndex = currentMonthDates.findIndex((date) => date.date === endDate)

  if (startIndex === -1 || endIndex === -1) {
    return []
  }

  const [fromIndex, toIndex] = startIndex <= endIndex
    ? [startIndex, endIndex]
    : [endIndex, startIndex]

  return currentMonthDates.slice(fromIndex, toIndex + 1).map((date) => date.date)
}

export function getNextSelectedDates(args: {
  selectionMode: Step4SelectionMode
  selectedDates: string[]
  targetDate: string
  dates: GridColumn[]
}): string[] {
  const { dates, selectionMode, selectedDates, targetDate } = args
  const normalizedSelectedDates = normalizeSelectedDates(selectedDates, dates)

  if (!normalizeSelectedDates([targetDate], dates).length) {
    return normalizedSelectedDates
  }

  if (selectionMode === 'single') {
    return normalizedSelectedDates.length === 1 && normalizedSelectedDates[0] === targetDate
      ? []
      : [targetDate]
  }

  const nextSelection = normalizedSelectedDates.includes(targetDate)
    ? normalizedSelectedDates.filter((date) => date !== targetDate)
    : [...normalizedSelectedDates, targetDate]

  return normalizeSelectedDates(nextSelection, dates)
}

function formatShortDate(date: string): string {
  return dayjs(date).format('M월 D일')
}

export function buildSelectedDateSummary(selectedDates: string[], dates: GridColumn[]): string {
  const normalizedSelectedDates = normalizeSelectedDates(selectedDates, dates)

  if (normalizedSelectedDates.length === 0) {
    return '선택된 날짜 없음'
  }

  if (normalizedSelectedDates.length === 1) {
    return formatShortDate(normalizedSelectedDates[0]!)
  }

  const fullRange = buildDateRangeByGridOrder(
    normalizedSelectedDates[0]!,
    normalizedSelectedDates[normalizedSelectedDates.length - 1]!,
    dates,
  )
  const isContiguousRange = fullRange.length === normalizedSelectedDates.length
    && fullRange.every((date, index) => date === normalizedSelectedDates[index])

  if (isContiguousRange) {
    return `${formatShortDate(normalizedSelectedDates[0]!)} ~ ${formatShortDate(normalizedSelectedDates[normalizedSelectedDates.length - 1]!)} (${normalizedSelectedDates.length}일)`
  }

  if (normalizedSelectedDates.length === 2) {
    return `${formatShortDate(normalizedSelectedDates[0]!)} / ${formatShortDate(normalizedSelectedDates[1]!)}`
  }

  return `${formatShortDate(normalizedSelectedDates[0]!)} 외 ${normalizedSelectedDates.length - 1}일`
}

export function formatCalendarWeekLabel(week: Step4MonthCalendarWeek): string {
  const monthDates = week.filter((cell): cell is GridColumn => cell !== null)
  if (monthDates.length === 0) return ''
  if (monthDates.length === 1) {
    const d = monthDates[0]!
    return `${d.day}일(${d.dayName})`
  }
  const first = monthDates[0]!
  const last = monthDates[monthDates.length - 1]!
  return `${first.day}일(${first.dayName}) ~ ${last.day}일(${last.dayName})`
}

export function findWeekPageIndexForDate(
  dates: GridColumn[],
  targetDate: string,
): number | null {
  const weeks = buildMonthCalendarMatrix(dates)
  const index = weeks.findIndex((week) =>
    week.some((cell) => cell?.date === targetDate),
  )
  return index === -1 ? null : index + 1
}
