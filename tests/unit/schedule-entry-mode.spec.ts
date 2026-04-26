import { describe, expect, it } from 'vitest'

import {
  buildScheduleEntryQuery,
  isSetupEntryMode,
  normalizeScheduleEntryMode,
} from '@/utils/scheduleEntryMode'

describe('scheduleEntryMode', () => {
  it('normalizes unknown values to wizard mode', () => {
    expect(normalizeScheduleEntryMode(undefined)).toBe('wizard')
    expect(normalizeScheduleEntryMode(null)).toBe('wizard')
    expect(normalizeScheduleEntryMode('wizard')).toBe('wizard')
  })

  it('preserves setup mode and detects setup entry mode', () => {
    expect(normalizeScheduleEntryMode('setup')).toBe('setup')
    expect(isSetupEntryMode('setup')).toBe(true)
    expect(isSetupEntryMode({ context: 'setup' })).toBe(true)
    expect(isSetupEntryMode({ entry: 'setup' })).toBe(true)
    expect(isSetupEntryMode('wizard')).toBe(false)
  })

  it('builds a query only for setup mode', () => {
    expect(buildScheduleEntryQuery('wizard')).toBeUndefined()
    expect(buildScheduleEntryQuery('setup')).toEqual({ context: 'setup' })
  })
})
