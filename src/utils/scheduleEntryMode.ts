export type ScheduleEntryMode = 'wizard' | 'setup'

export function normalizeScheduleEntryMode(value: unknown): ScheduleEntryMode {
  return value === 'setup' ? 'setup' : 'wizard'
}

export function isSetupEntryMode(value: unknown): boolean {
  return normalizeScheduleEntryMode(value) === 'setup'
}

export function buildScheduleEntryQuery(mode: ScheduleEntryMode): Record<string, string> | undefined {
  return mode === 'setup' ? { entry: 'setup' } : undefined
}
