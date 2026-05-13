const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const KOREAN_DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const

interface DateParts {
  year: number
  month: number
  day: number
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function getMonthDayCount(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function parseIsoDate(value: string): DateParts | null {
  const match = ISO_DATE_PATTERN.exec(value)

  if (!match) {
    return null
  }

  const [, yearValue, monthValue, dayValue] = match
  const year = Number(yearValue)
  const month = Number(monthValue)
  const day = Number(dayValue)

  if (month < 1 || month > 12) {
    return null
  }

  if (day < 1 || day > getMonthDayCount(year, month)) {
    return null
  }

  return { year, month, day }
}

function assertIsoDate(value: string): DateParts {
  const parts = parseIsoDate(value)

  if (!parts) {
    throw new Error(`유효한 ISO 날짜가 아닙니다: ${value}`)
  }

  return parts
}

function assertMonth(month: number): void {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`유효한 월이 아닙니다: ${month}`)
  }
}

export function isIsoDate(value: string): boolean {
  return parseIsoDate(value) !== null
}

export function compareIsoDate(left: string, right: string): number {
  assertIsoDate(left)
  assertIsoDate(right)

  return left.localeCompare(right)
}

export function listMonthDates(year: number, month: number): string[] {
  assertMonth(month)

  const dayCount = getMonthDayCount(year, month)
  const monthLabel = pad2(month)

  return Array.from(
    { length: dayCount },
    (_value, index) => `${year}-${monthLabel}-${pad2(index + 1)}`,
  )
}

export function listPeriodDates(year: number, startMonth: number, endMonth: number): string[] {
  assertMonth(startMonth)
  assertMonth(endMonth)

  if (startMonth > endMonth) {
    throw new Error('시작 월은 종료 월보다 늦을 수 없습니다')
  }

  return Array.from({ length: endMonth - startMonth + 1 }, (_value, index) =>
    listMonthDates(year, startMonth + index),
  ).flat()
}

export function getIsoDayOfWeek(date: string): number {
  const { year, month, day } = assertIsoDate(date)

  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

export function formatKoreanMonthDay(date: string): string {
  const { month, day } = assertIsoDate(date)
  const dayOfWeek = getIsoDayOfWeek(date)

  return `${month}/${day} ${KOREAN_DAY_LABELS[dayOfWeek]}`
}
