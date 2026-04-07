import { describe, expect, it } from 'vitest'

import {
  buildStep5Route,
  getDefaultScheduleVersionId,
  resolveStep4VersionState,
  resolveStep5RunningVersion,
  resolveStep5VersionState,
} from '@/utils/scheduleVersionResolver'

const compareResponse = {
  scheduleId: 'schedule-1',
  selectedVersionId: 'version-2',
  finalizedVersionId: null,
  activeSolvingVersionId: null,
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
      activeSolverExecutionId: null,
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
      activeSolverExecutionId: null,
      isSelected: true,
      isFinalized: false,
    },
    {
      id: 'version-3',
      scheduleId: 'schedule-1',
      versionNo: 3,
      name: 'V3',
      sourceType: 're_solve' as const,
      baseVersionId: 'version-2',
      status: 'review_ready' as const,
      currentRevision: 3,
      manualEditCount: 2,
      inputDiffSummary: {
        changedOffRequests: 2,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: 'candidate',
      },
      latestEvaluationId: null,
      latestEvaluationResultStatus: null,
      comparisonMetrics: null,
      finalizationGate: null,
      activeSolverExecutionId: null,
      isSelected: false,
      isFinalized: false,
    },
  ],
}

describe('scheduleVersionResolver', () => {
  it('keeps Step4 bound to the preferred preview when it is still valid', () => {
    expect(resolveStep4VersionState(compareResponse, 'version-1')).toEqual({
      selectedVersionId: 'version-2',
      previewVersionId: 'version-1',
      versions: compareResponse.versions,
    })
  })

  it('defaults Step4 preview to the selected version when there is no preferred preview', () => {
    expect(resolveStep4VersionState(compareResponse, null)).toEqual({
      selectedVersionId: 'version-2',
      previewVersionId: 'version-2',
      versions: compareResponse.versions,
    })
  })

  it('falls back to V1 when both preferred and selected versions are unavailable', () => {
    expect(
      resolveStep4VersionState(
        {
          ...compareResponse,
          selectedVersionId: null,
        },
        'missing-version'
      )
    ).toEqual({
      selectedVersionId: null,
      previewVersionId: 'version-1',
      versions: compareResponse.versions,
    })
  })

  it('preserves a valid preview deep link even when preview differs from selected', () => {
    expect(resolveStep5VersionState(compareResponse, 'version-1')).toEqual({
      selectedVersionId: 'version-2',
      previewVersionId: 'version-1',
      compareVersionIds: ['version-2', 'version-1'],
      activeSolvingVersionId: null,
      versions: compareResponse.versions,
      shouldCanonicalize: false,
    })
  })

  it('canonicalizes a compare query to valid distinct Step5 ids', () => {
    expect(
      resolveStep5VersionState(compareResponse, {
        requestedFocusVersionId: 'version-3',
        requestedCompareVersionIds: ['version-3', 'version-2', 'missing-version'],
      })
    ).toEqual({
      selectedVersionId: 'version-2',
      previewVersionId: 'version-3',
      compareVersionIds: ['version-3', 'version-2'],
      activeSolvingVersionId: null,
      versions: compareResponse.versions,
      shouldCanonicalize: true,
    })
  })

  it('canonicalizes compare routes so the focused version stays first', () => {
    expect(
      resolveStep5VersionState(compareResponse, {
        requestedFocusVersionId: 'version-2',
        requestedCompareVersionIds: ['version-3', 'version-2'],
      })
    ).toEqual({
      selectedVersionId: 'version-2',
      previewVersionId: 'version-2',
      compareVersionIds: ['version-2', 'version-3'],
      activeSolvingVersionId: null,
      versions: compareResponse.versions,
      shouldCanonicalize: true,
    })
  })

  it('canonicalizes Step5 preview to the finalized version when the month is locked', () => {
    expect(
      resolveStep5VersionState(
        {
          ...compareResponse,
          finalizedVersionId: 'version-2',
        },
        'version-1'
      )
    ).toEqual({
      selectedVersionId: 'version-2',
      previewVersionId: 'version-2',
      compareVersionIds: ['version-2'],
      activeSolvingVersionId: null,
      versions: compareResponse.versions,
      shouldCanonicalize: true,
    })
  })

  it('defaults Step5 preview to the selected version when the query is missing', () => {
    expect(resolveStep5VersionState(compareResponse, null)).toEqual({
      selectedVersionId: 'version-2',
      previewVersionId: 'version-2',
      compareVersionIds: ['version-2'],
      activeSolvingVersionId: null,
      versions: compareResponse.versions,
      shouldCanonicalize: true,
    })
  })

  it('replaces invalid preview queries with the selected version', () => {
    expect(resolveStep5VersionState(compareResponse, 'missing-version')).toEqual({
      selectedVersionId: 'version-2',
      previewVersionId: 'version-2',
      compareVersionIds: ['version-2'],
      activeSolvingVersionId: null,
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
      compareVersionIds: ['version-1'],
      activeSolvingVersionId: null,
      versions: compareResponse.versions,
      shouldCanonicalize: true,
    })
  })

  it('exposes authoritative active solving version for Step5 runtime decisions', () => {
    const solvingCompare = {
      ...compareResponse,
      activeSolvingVersionId: 'version-2',
      versions: compareResponse.versions.map((version) =>
        version.id === 'version-2'
          ? { ...version, status: 'solving' as const }
          : version
      ),
    }

    expect(resolveStep5VersionState(solvingCompare, 'version-2')).toEqual({
      selectedVersionId: 'version-2',
      previewVersionId: 'version-2',
      compareVersionIds: ['version-2'],
      activeSolvingVersionId: 'version-2',
      versions: solvingCompare.versions,
      shouldCanonicalize: false,
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
    expect(
      buildStep5Route('schedule-1', 'version-2', ['version-3', 'version-2'])
    ).toEqual({
      path: '/schedule/step5/schedule-1',
      query: {
        version: 'version-2',
        compare: 'version-2,version-3',
      },
    })
  })

  it('finds the single authoritative running version for Step5 resume', () => {
    expect(
      resolveStep5RunningVersion({
        ...compareResponse,
        versions: [
          compareResponse.versions[0],
          {
            ...compareResponse.versions[1],
            status: 'solving',
            activeSolverExecutionId: 'exec-1',
          },
        ],
      })
    ).toEqual({
      issue: null,
      runningVersionId: 'version-2',
      runningExecutionId: 'exec-1',
    })
  })

  it('fails fast when compare exposes multiple running versions', () => {
    expect(
      resolveStep5RunningVersion({
        ...compareResponse,
        versions: [
          {
            ...compareResponse.versions[0],
            status: 'solving',
            activeSolverExecutionId: 'exec-1',
          },
          {
            ...compareResponse.versions[1],
            status: 'solving',
            activeSolverExecutionId: 'exec-2',
          },
        ],
      })
    ).toEqual({
      issue: 'multiple',
      runningVersionId: null,
      runningExecutionId: null,
    })
  })
})
