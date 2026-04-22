export type ScheduleEntryMode = 'wizard' | 'setup'

export function normalizeScheduleEntryMode(value: unknown): ScheduleEntryMode {
  return value === 'setup' ? 'setup' : 'wizard'
}

function isSetupQueryValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => isSetupQueryValue(item))
  }

  return normalizeScheduleEntryMode(value) === 'setup'
}

export function isSetupEntryMode(value: unknown): boolean {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const query = value as Record<string, unknown>
    return isSetupQueryValue(query.context) || isSetupQueryValue(query.entry)
  }

  return isSetupQueryValue(value)
}

export function buildScheduleEntryQuery(mode: ScheduleEntryMode): Record<string, string> | undefined {
  return mode === 'setup' ? { context: 'setup' } : undefined
}
