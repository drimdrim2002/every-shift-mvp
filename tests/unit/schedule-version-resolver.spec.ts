import { describe, expect, it } from 'vitest'

import {
  buildStep5Route,
  getDefaultScheduleVersionId,
  resolveStep4VersionState,
  resolveStep5VersionState,
} from '@/utils/scheduleVersionResolver'

const compareResponse = {
  scheduleId: 'schedule-1',
  selectedVersionId: 'version-2',
  finalizedVersionId: null,
  versions: [
    {
      id: 'version-1',
      scheduleId: 'schedule-1',
      versionNo: 1,
      name: 'V1',
      sourceType: 'initial_solve' as const,
      baseVersionId: null,
      status: 'draft' as const,
      currentRevision: 1,
      manualEditCount: 0,
      inputDiffSummary: {
        changedOffRequests: 0,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: null,
      },
      latestEvaluationId: null,
      latestEvaluationResultStatus: null,
      comparisonMetrics: null,
      finalizationGate: null,
      isSelected: false,
      isFinalized: false,
    },
    {
      id: 'version-2',
      scheduleId: 'schedule-1',
      versionNo: 2,
      name: 'V2',
      sourceType: 're_solve' as const,
      baseVersionId: 'version-1',
      status: 'review_ready' as const,
      currentRevision: 2,
      manualEditCount: 1,
      inputDiffSummary: {
        changedOffRequests: 1,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: 'selected',
      },
      latestEvaluationId: null,
      latestEvaluationResultStatus: null,
      comparisonMetrics: null,
      finalizationGate: null,
      isSelected: true,
      isFinalized: false,
    },
  ],
}

describe('scheduleVersionResolver', () => {
  it('keeps Step4 bound to the default V1 preview while preserving backend selection', () => {
    expect(resolveStep4VersionState(compareResponse)).toEqual({
      selectedVersionId: 'version-2',
      previewVersionId: 'version-1',
      versions: compareResponse.versions,
    })
  })

  it('preserves a valid preview deep link even when preview differs from selected', () => {
    expect(resolveStep5VersionState(compareResponse, 'version-1')).toEqual({
      selectedVersionId: 'version-2',
      previewVersionId: 'version-1',
      versions: compareResponse.versions,
      shouldCanonicalize: false,
    })
  })

  it('defaults Step5 preview to the selected version when the query is missing', () => {
    expect(resolveStep5VersionState(compareResponse, null)).toEqual({
      selectedVersionId: 'version-2',
      previewVersionId: 'version-2',
      versions: compareResponse.versions,
      shouldCanonicalize: true,
    })
  })

  it('replaces invalid preview queries with the selected version', () => {
    expect(resolveStep5VersionState(compareResponse, 'missing-version')).toEqual({
      selectedVersionId: 'version-2',
      previewVersionId: 'version-2',
      versions: compareResponse.versions,
      shouldCanonicalize: true,
    })
  })

  it('falls back to V1 when there is no authoritative selection', () => {
    expect(
      resolveStep5VersionState(
        {
          ...compareResponse,
          selectedVersionId: null,
        },
        null
      )
    ).toEqual({
      selectedVersionId: null,
      previewVersionId: 'version-1',
      versions: compareResponse.versions,
      shouldCanonicalize: true,
    })
  })

  it('returns the canonical Step5 route payload', () => {
    expect(getDefaultScheduleVersionId(compareResponse.versions)).toBe('version-1')
    expect(buildStep5Route('schedule-1', 'version-2')).toEqual({
      path: '/schedule/step5/schedule-1',
      query: {
        version: 'version-2',
      },
    })
  })
})
