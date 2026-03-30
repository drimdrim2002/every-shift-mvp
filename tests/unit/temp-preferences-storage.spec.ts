import { beforeEach, describe, expect, it } from 'vitest'

import {
  buildLegacyTempPreferencesStorageKey,
  buildLegacyTempScheduleStorageKey,
  buildTempPreferencesStorageKey,
  buildTempPreferencesStorageScope,
  clearScopedTempPreferencesStorage,
  migrateLegacyTempPreferencesToV2,
  parseTempPreferencesStorageKey,
  readTempPreferencesEnvelopeV2,
  writeTempPreferencesEnvelopeV2,
} from '@/utils/tempPreferencesStorage'

describe('tempPreferencesStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('builds and parses v2 storage keys with user/org/month scope', () => {
    const scope = buildTempPreferencesStorageScope({
      userId: 'user-1',
      organizationId: 'org-1',
      month: '2025-12',
    })

    expect(scope).toEqual({
      userId: 'user-1',
      organizationId: 'org-1',
      month: '2025-12',
    })

    const key = buildTempPreferencesStorageKey(scope!)
    expect(key).toBe('everyshift_temp_preferences_v2:user-1:org-1:2025-12')
    expect(parseTempPreferencesStorageKey(key)).toEqual(scope)
    expect(parseTempPreferencesStorageKey('everyshift_temp_preferences_2025-12')).toBeNull()
  })

  it('validates TTL when reading v2 payloads', () => {
    const scope = buildTempPreferencesStorageScope({
      userId: 'user-1',
      organizationId: 'org-1',
      month: '2025-12',
    })!
    const now = Date.parse('2026-03-30T00:00:00.000Z')

    writeTempPreferencesEnvelopeV2(
      scope,
      { 'emp-1': { '2025-12-01': 'O' } },
      { 'emp-1': { '2025-12-01': '연차' } },
      new Date(now - 10 * 60 * 60 * 1000).toISOString()
    )

    expect(readTempPreferencesEnvelopeV2(scope, now).status).toBe('ok')

    writeTempPreferencesEnvelopeV2(
      scope,
      { 'emp-1': { '2025-12-01': 'O' } },
      { 'emp-1': { '2025-12-01': '연차' } },
      new Date(now - 73 * 60 * 60 * 1000).toISOString()
    )

    expect(readTempPreferencesEnvelopeV2(scope, now).status).toBe('expired')
  })

  it('removes corrupted v2 payloads on parse failure', () => {
    const scope = buildTempPreferencesStorageScope({
      userId: 'user-1',
      organizationId: 'org-1',
      month: '2025-12',
    })!
    const key = buildTempPreferencesStorageKey(scope)
    localStorage.setItem(key, '{broken-json')

    const result = readTempPreferencesEnvelopeV2(scope)
    expect(result.status).toBe('parse_error')
    expect(localStorage.getItem(key)).toBeNull()
  })

  it('migrates legacy month key to v2 once and sanitizes payload', () => {
    const scope = buildTempPreferencesStorageScope({
      userId: 'user-1',
      organizationId: 'org-1',
      month: '2025-12',
    })!
    const legacyKey = buildLegacyTempPreferencesStorageKey('2025-12')
    localStorage.setItem(
      legacyKey,
      JSON.stringify({
        constraints: {
          'emp-1': { '2025-12-01': 'O' },
          stale: { '2025-12-01': 'O' },
        },
        constraintNotes: {
          'emp-1': { '2025-12-01': '연차' },
          stale: { '2025-12-01': 'old' },
        },
      })
    )

    const migration = migrateLegacyTempPreferencesToV2(scope, {
      sanitize: (payload) => ({
        constraints: {
          'emp-1': payload.constraints['emp-1'] ?? {},
        },
        notes: {
          'emp-1': payload.notes['emp-1'] ?? {},
        },
      }),
    })

    expect(migration.status).toBe('migrated')
    expect(localStorage.getItem(legacyKey)).toBeNull()

    const v2Payload = JSON.parse(localStorage.getItem(buildTempPreferencesStorageKey(scope)) || '{}')
    expect(v2Payload.constraints).toEqual({
      'emp-1': {
        '2025-12-01': 'O',
      },
    })
    expect(v2Payload.constraintNotes).toEqual({
      'emp-1': {
        '2025-12-01': '연차',
      },
    })
  })

  it('clears scoped v2 and legacy month keys together', () => {
    const scope = buildTempPreferencesStorageScope({
      userId: 'user-1',
      organizationId: 'org-1',
      month: '2025-12',
    })!
    const v2Key = buildTempPreferencesStorageKey(scope)
    const legacyPreferencesKey = buildLegacyTempPreferencesStorageKey('2025-12')
    const legacyScheduleKey = buildLegacyTempScheduleStorageKey('2025-12')

    localStorage.setItem(v2Key, '{}')
    localStorage.setItem(legacyPreferencesKey, '{}')
    localStorage.setItem(legacyScheduleKey, '{}')

    const removed = clearScopedTempPreferencesStorage({
      userId: 'user-1',
      organizationId: 'org-1',
      month: '2025-12',
    })

    expect(removed).toContain(v2Key)
    expect(removed).toContain(legacyPreferencesKey)
    expect(removed).toContain(legacyScheduleKey)
    expect(localStorage.getItem(v2Key)).toBeNull()
    expect(localStorage.getItem(legacyPreferencesKey)).toBeNull()
    expect(localStorage.getItem(legacyScheduleKey)).toBeNull()
  })
})
