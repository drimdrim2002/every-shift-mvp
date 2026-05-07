import { describe, expect, it } from 'vitest'

import {
  APP_APPROVAL_QUEUE_ROUTE_PATH,
  APP_OPS_OFF_REQUEST_POLICY_SETUP_ROUTE_PATH,
  APP_OPS_ORGANIZATION_SETUP_ROUTE_PATH,
  APP_SCHEDULE_ROUTE_PREFIX,
  APP_USER_HOME_ROUTE_PATH,
  LEGACY_APP_ROUTE_REDIRECTS,
  LEGACY_APPROVAL_QUEUE_ROUTE_PATH,
  LEGACY_OPS_OFF_REQUEST_POLICY_SETUP_ROUTE_PATH,
  LEGACY_OPS_ORGANIZATION_SETUP_ROUTE_PATH,
  LEGACY_USER_HOME_ROUTE_PATH,
  buildStep5RouteLocation,
  buildStep4RouteLocation,
  getLegacyRedirectTarget,
  getStep5ScheduleKeyFromPath,
  parseStep5RouteQuery,
} from '@/constants/routes'
import {
  buildStep5Route,
  getDefaultScheduleVersionId,
  getCanonicalCompareVersionIds,
  getDefaultCompareVersionIds,
  getDefaultExecutedFocusVersionId,
  hasExecutedVersionHistory,
  isSolverFailedVersion,
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

const initialEntryCompareResponse = {
  ...compareResponse,
  versions: compareResponse.versions.slice(0, 2),
}

describe('scheduleVersionResolver', () => {
  it('identifies solver failed versions through the shared helper', () => {
    expect(isSolverFailedVersion({ ...compareResponse.versions[0]!, status: 'solve_failed' })).toBe(true)
    expect(isSolverFailedVersion({ ...compareResponse.versions[0]!, status: 'review_ready' })).toBe(false)
  })

  it('does not treat draft-only version containers as executed history', () => {
    const draftOnlyCompare = {
      ...compareResponse,
      selectedVersionId: 'version-2',
      finalizedVersionId: null,
      versions: compareResponse.versions.map((version) => ({
        ...version,
        status: 'draft' as const,
        manualEditCount: version.id === 'version-2' ? 3 : 0,
        inputDiffSummary: {
          changedOffRequests: version.id === 'version-2' ? 2 : 0,
          changedLockedAssignments: 0,
          changedSiteRequirements: 0,
          note: version.id === 'version-2' ? 'draft assignments are not execution' : null,
        },
        latestEvaluationId: null,
        comparisonMetrics: null,
        finalizationGate: null,
        activeSolverExecutionId: null,
        isFinalized: false,
      })),
    }

    expect(hasExecutedVersionHistory(draftOnlyCompare)).toBe(false)
    expect(getDefaultExecutedFocusVersionId(draftOnlyCompare)).toBe('version-2')
    expect(getDefaultCompareVersionIds(draftOnlyCompare, 'version-2')).toEqual([])
  })

  it('does not treat solve_failed versions as executed result history', () => {
    const failedOnlyCompare = {
      ...compareResponse,
      selectedVersionId: null,
      finalizedVersionId: null,
      versions: [
        {
          ...compareResponse.versions[0]!,
          status: 'solve_failed' as const,
          latestEvaluationId: 'evaluation-failed',
          latestEvaluationResultStatus: 'solve_failed' as const,
          comparisonMetrics: {
            offRequestReflectionRate: null,
            nightShiftMin: null,
            nightShiftMax: null,
            weekendShiftMin: null,
            weekendShiftMax: null,
            manualEditCount: 0,
          },
          finalizationGate: {
            allowed: false,
            blockingReasons: ['solver_failed'],
          },
        },
      ],
    }

    expect(hasExecutedVersionHistory(failedOnlyCompare)).toBe(false)
    expect(getDefaultExecutedFocusVersionId(failedOnlyCompare)).toBe('version-1')
    expect(getDefaultCompareVersionIds(failedOnlyCompare, 'version-1')).toEqual([])
  })

  it('detects a single executed history version without adding draft compare candidates', () => {
    const singleHistoryCompare = {
      ...initialEntryCompareResponse,
      selectedVersionId: 'version-1',
      versions: [
        initialEntryCompareResponse.versions[0]!,
        {
          ...initialEntryCompareResponse.versions[1]!,
          status: 'review_ready' as const,
          isSelected: false,
        },
      ],
    }

    expect(hasExecutedVersionHistory(singleHistoryCompare)).toBe(true)
    expect(getDefaultExecutedFocusVersionId(singleHistoryCompare)).toBe('version-2')
    expect(getDefaultCompareVersionIds(singleHistoryCompare, 'version-2')).toEqual([])
  })

  it('defaults executed comparison to the selected version and latest other executed version', () => {
    expect(hasExecutedVersionHistory(compareResponse)).toBe(true)
    expect(getDefaultExecutedFocusVersionId(compareResponse)).toBe('version-2')
    expect(getDefaultCompareVersionIds(compareResponse, 'version-2')).toEqual(['version-2', 'version-3'])
  })

  it('prefers finalized versions over selected and latest executed candidates', () => {
    const finalizedCompare = {
      ...compareResponse,
      selectedVersionId: 'version-3',
      finalizedVersionId: 'version-2',
      versions: compareResponse.versions.map((version) =>
        version.id === 'version-2'
          ? { ...version, status: 'finalized' as const, isFinalized: true }
          : version
      ),
    }

    expect(hasExecutedVersionHistory(finalizedCompare)).toBe(true)
    expect(getDefaultExecutedFocusVersionId(finalizedCompare)).toBe('version-2')
    expect(getDefaultCompareVersionIds(finalizedCompare, 'version-2')).toEqual([])
  })

  it('treats active solving, comparison metrics, and finalization gates as executed history signals', () => {
    const signaledCompare = {
      ...compareResponse,
      selectedVersionId: null,
      versions: compareResponse.versions.map((version) => ({
        ...version,
        status: 'draft' as const,
        latestEvaluationId: null,
        activeSolverExecutionId: version.id === 'version-1' ? 'execution-1' : null,
        comparisonMetrics: version.id === 'version-2'
          ? {
              offRequestReflectionRate: 0.75,
              nightShiftMin: 1,
              nightShiftMax: 4,
              weekendShiftMin: 0,
              weekendShiftMax: 2,
              manualEditCount: 1,
            }
          : null,
        finalizationGate: version.id === 'version-3'
          ? {
              allowed: true,
              blockingReasons: [],
            }
          : null,
      })),
    }

    expect(hasExecutedVersionHistory(signaledCompare)).toBe(true)
    expect(getDefaultExecutedFocusVersionId(signaledCompare)).toBe('version-3')
    expect(getDefaultCompareVersionIds(signaledCompare, 'version-3')).toEqual(['version-3', 'version-2'])
  })

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
    expect(resolveStep5VersionState(initialEntryCompareResponse, 'version-1')).toEqual({
      defaultPreviewVersionId: 'version-2',
      selectedVersionId: 'version-2',
      previewVersionId: 'version-1',
      compareVersionIds: [],
      activeSolvingVersionId: null,
      versions: initialEntryCompareResponse.versions,
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
      defaultPreviewVersionId: 'version-2',
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
      defaultPreviewVersionId: 'version-2',
      selectedVersionId: 'version-2',
      previewVersionId: 'version-2',
      compareVersionIds: ['version-2', 'version-3'],
      activeSolvingVersionId: null,
      versions: compareResponse.versions,
      shouldCanonicalize: true,
    })
  })

  it('exports canonical compare id normalization for Step5 and compare modal reuse', () => {
    expect(getCanonicalCompareVersionIds(['version-3', 'version-2', 'version-3'], 'version-2')).toEqual([
      'version-2',
      'version-3',
    ])
    expect(getCanonicalCompareVersionIds(['version-3', 'version-2', 'version-1'], null)).toEqual([
      'version-3',
      'version-2',
    ])
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
      defaultPreviewVersionId: 'version-2',
      selectedVersionId: 'version-2',
      previewVersionId: 'version-2',
      compareVersionIds: [],
      activeSolvingVersionId: null,
      versions: compareResponse.versions,
      shouldCanonicalize: true,
    })
  })

  it('keeps first-entry Step5 in single-version mode when there is no compare candidate', () => {
    expect(resolveStep5VersionState(initialEntryCompareResponse, null)).toEqual({
      defaultPreviewVersionId: 'version-2',
      selectedVersionId: 'version-2',
      previewVersionId: 'version-2',
      compareVersionIds: [],
      activeSolvingVersionId: null,
      versions: initialEntryCompareResponse.versions,
      shouldCanonicalize: false,
    })
  })

  it('replaces invalid preview queries with the selected version', () => {
    expect(resolveStep5VersionState(initialEntryCompareResponse, 'missing-version')).toEqual({
      defaultPreviewVersionId: 'version-2',
      selectedVersionId: 'version-2',
      previewVersionId: 'version-2',
      compareVersionIds: [],
      activeSolvingVersionId: null,
      versions: initialEntryCompareResponse.versions,
      shouldCanonicalize: true,
    })
  })

  it('falls back to the latest executed version when there is no authoritative selection', () => {
    expect(
      resolveStep5VersionState(
        {
          ...initialEntryCompareResponse,
          selectedVersionId: null,
        },
        null
      )
    ).toEqual({
      defaultPreviewVersionId: 'version-2',
      selectedVersionId: null,
      previewVersionId: 'version-2',
      compareVersionIds: [],
      activeSolvingVersionId: null,
      versions: initialEntryCompareResponse.versions,
      shouldCanonicalize: false,
    })
  })

  it('auto-seeds compare ids from executed history without an explicit compare route', () => {
    expect(resolveStep5VersionState(compareResponse, null)).toEqual({
      defaultPreviewVersionId: 'version-2',
      selectedVersionId: 'version-2',
      previewVersionId: 'version-2',
      compareVersionIds: ['version-2', 'version-3'],
      activeSolvingVersionId: null,
      versions: compareResponse.versions,
      shouldCanonicalize: true,
    })
  })

  it('falls back to default executed compare ids when explicit compare query has no valid target', () => {
    const defaultState = resolveStep5VersionState(compareResponse, null)
    const invalidCompareState = resolveStep5VersionState(compareResponse, {
      requestedFocusVersionId: 'version-2',
      requestedCompareVersionIds: ['missing-version'],
    })

    expect(invalidCompareState).toEqual({
      ...defaultState,
      shouldCanonicalize: true,
    })
    expect(
      buildStep5Route('schedule-1', invalidCompareState.previewVersionId, invalidCompareState.compareVersionIds, {
        defaultVersionId: invalidCompareState.defaultPreviewVersionId,
      })
    ).toEqual({
      path: '/app/schedule/step5/schedule-1',
      query: {
        compare: 'version-3',
      },
    })
  })

  it('removes solve_failed versions from explicit Step5 compare query targets', () => {
    const compareWithFailedMiddleVersion = {
      ...compareResponse,
      selectedVersionId: 'version-3',
      versions: [
        {
          ...compareResponse.versions[0]!,
          status: 'review_ready' as const,
          latestEvaluationId: 'evaluation-1',
        },
        {
          ...compareResponse.versions[1]!,
          status: 'solve_failed' as const,
          latestEvaluationId: 'evaluation-failed',
          latestEvaluationResultStatus: 'solve_failed' as const,
          inputDiffSummary: {
            changedOffRequests: 4,
            changedLockedAssignments: 0,
            changedSiteRequirements: 0,
            note: 'failed candidate should be hidden',
          },
        },
        {
          ...compareResponse.versions[2]!,
          isSelected: true,
        },
      ],
    }

    expect(
      resolveStep5VersionState(compareWithFailedMiddleVersion, {
        requestedFocusVersionId: 'version-3',
        requestedCompareVersionIds: ['version-2'],
      })
    ).toEqual({
      defaultPreviewVersionId: 'version-3',
      selectedVersionId: 'version-3',
      previewVersionId: 'version-3',
      compareVersionIds: ['version-3', 'version-1'],
      activeSolvingVersionId: null,
      versions: compareWithFailedMiddleVersion.versions,
      shouldCanonicalize: true,
    })
  })

  it('falls back to default executed compare ids when explicit compare query only repeats focus', () => {
    const defaultState = resolveStep5VersionState(compareResponse, null)
    const focusOnlyCompareState = resolveStep5VersionState(compareResponse, {
      requestedFocusVersionId: 'version-2',
      requestedCompareVersionIds: ['version-2'],
    })
    const duplicateFocusCompareState = resolveStep5VersionState(compareResponse, {
      requestedFocusVersionId: 'version-2',
      requestedCompareVersionIds: ['version-2', 'version-2'],
    })

    expect(focusOnlyCompareState).toEqual({
      ...defaultState,
      shouldCanonicalize: true,
    })
    expect(duplicateFocusCompareState).toEqual({
      ...defaultState,
      shouldCanonicalize: true,
    })
  })

  it('does not treat an untouched re-solve draft as a compare candidate', () => {
    expect(
      resolveStep5VersionState(
        {
          ...initialEntryCompareResponse,
          versions: [
            initialEntryCompareResponse.versions[0]!,
            {
              ...initialEntryCompareResponse.versions[1]!,
              sourceType: 're_solve',
              status: 'draft',
              manualEditCount: 0,
              inputDiffSummary: {
                changedOffRequests: 0,
                changedLockedAssignments: 0,
                changedSiteRequirements: 0,
                note: null,
              },
            },
          ],
        },
        null
      )
    ).toEqual({
      defaultPreviewVersionId: 'version-2',
      selectedVersionId: 'version-2',
      previewVersionId: 'version-2',
      compareVersionIds: [],
      activeSolvingVersionId: null,
      versions: [
        initialEntryCompareResponse.versions[0]!,
        {
          ...initialEntryCompareResponse.versions[1]!,
          sourceType: 're_solve',
          status: 'draft',
          manualEditCount: 0,
          inputDiffSummary: {
            changedOffRequests: 0,
            changedLockedAssignments: 0,
            changedSiteRequirements: 0,
            note: null,
          },
        },
      ],
      shouldCanonicalize: false,
    })
  })

  it('exposes authoritative active solving version for Step5 runtime decisions', () => {
    const solvingCompare = {
      ...initialEntryCompareResponse,
      activeSolvingVersionId: 'version-2',
      versions: initialEntryCompareResponse.versions.map((version) =>
        version.id === 'version-2'
          ? { ...version, status: 'solving' as const }
          : version
      ),
    }

    expect(resolveStep5VersionState(solvingCompare, 'version-2')).toEqual({
      defaultPreviewVersionId: 'version-2',
      selectedVersionId: 'version-2',
      previewVersionId: 'version-2',
      compareVersionIds: [],
      activeSolvingVersionId: 'version-2',
      versions: solvingCompare.versions,
      shouldCanonicalize: true,
    })
  })

  it('returns the canonical Step5 route payload', () => {
    expect(getDefaultScheduleVersionId(compareResponse.versions)).toBe('version-1')
    expect(
      buildStep5Route('schedule-1', 'version-2', [], {
        defaultVersionId: 'version-2',
      })
    ).toEqual({
      path: '/app/schedule/step5/schedule-1',
    })
    expect(buildStep5Route('schedule-1', 'version-2')).toEqual({
      path: '/app/schedule/step5/schedule-1',
      query: {
        version: 'version-2',
      },
    })
    expect(
      buildStep5Route('schedule-1', 'version-3', ['version-3', 'version-2'], {
        defaultVersionId: 'version-2',
      })
    ).toEqual({
      path: '/app/schedule/step5/schedule-1',
      query: {
        version: 'version-3',
        compare: 'version-2',
      },
    })
    expect(
      buildStep5Route('schedule-1', 'version-2', ['version-3', 'version-2'], {
        defaultVersionId: 'version-2',
        autoStart: true,
      })
    ).toEqual({
      path: '/app/schedule/step5/schedule-1',
      query: {
        compare: 'version-3',
        autoStart: '1',
      },
    })
  })

  it('derives canonical launch-core constants from the legacy redirect contract', () => {
    expect(LEGACY_APP_ROUTE_REDIRECTS[LEGACY_APPROVAL_QUEUE_ROUTE_PATH]).toBe(APP_APPROVAL_QUEUE_ROUTE_PATH)
    expect(LEGACY_APP_ROUTE_REDIRECTS[LEGACY_USER_HOME_ROUTE_PATH]).toBe(APP_USER_HOME_ROUTE_PATH)
    expect(LEGACY_APP_ROUTE_REDIRECTS[LEGACY_OPS_ORGANIZATION_SETUP_ROUTE_PATH]).toBe(
      APP_OPS_ORGANIZATION_SETUP_ROUTE_PATH
    )
    expect(LEGACY_APP_ROUTE_REDIRECTS[LEGACY_OPS_OFF_REQUEST_POLICY_SETUP_ROUTE_PATH]).toBe(
      APP_OPS_OFF_REQUEST_POLICY_SETUP_ROUTE_PATH
    )
    expect(APP_SCHEDULE_ROUTE_PREFIX).toBe('/app/schedule/')
  })

  it('round-trips Step5 query ownership through the route contract helpers', () => {
    expect(buildStep4RouteLocation()).toEqual({
      path: '/app/schedule/step4',
    })
    expect(buildStep4RouteLocation({ versionId: 'version-2' })).toEqual({
      path: '/app/schedule/step4',
      query: {
        version: 'version-2',
      },
    })

    const routeLocation = buildStep5RouteLocation('schedule-1', {
      compareVersionId: 'version-3',
      autoStart: true,
    }) as { path: string; query?: Record<string, string> }

    expect(routeLocation).toEqual({
      path: '/app/schedule/step5/schedule-1',
      query: {
        compare: 'version-3',
        autoStart: '1',
      },
    })
    expect(parseStep5RouteQuery(routeLocation.query)).toEqual({
      requestedFocusVersionId: null,
      requestedCompareVersionIds: ['version-3'],
      autoStart: true,
    })
  })

  it('extracts Step5 schedule keys and redirects legacy step5 paths through the shared route contract', () => {
    expect(getStep5ScheduleKeyFromPath('/app/schedule/step5/schedule-1')).toBe('schedule-1')
    expect(getStep5ScheduleKeyFromPath('/schedule/step5/schedule-1')).toBe('schedule-1')
    expect(getLegacyRedirectTarget('/schedule/step5/schedule-1')).toBe('/app/schedule/step5/schedule-1')
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
        versions: compareResponse.versions.map((version) => ({
          ...version,
          status: 'solving' as const,
          activeSolverExecutionId: `${version.id}-exec`,
        })),
      })
    ).toEqual({
      issue: 'multiple',
      runningVersionId: null,
      runningExecutionId: null,
    })
  })
})
