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
  getLegacyRedirectTarget,
  getStep5ScheduleKeyFromPath,
  parseStep5RouteQuery,
} from '@/constants/routes'
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

const initialEntryCompareResponse = {
  ...compareResponse,
  versions: compareResponse.versions.slice(0, 2),
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

  it('falls back to V1 when there is no authoritative selection', () => {
    expect(
      resolveStep5VersionState(
        {
          ...initialEntryCompareResponse,
          selectedVersionId: null,
        },
        null
      )
    ).toEqual({
      defaultPreviewVersionId: 'version-1',
      selectedVersionId: null,
      previewVersionId: 'version-1',
      compareVersionIds: [],
      activeSolvingVersionId: null,
      versions: initialEntryCompareResponse.versions,
      shouldCanonicalize: false,
    })
  })

  it('does not auto-seed compare ids without an explicit compare route', () => {
    expect(resolveStep5VersionState(compareResponse, null)).toEqual({
      defaultPreviewVersionId: 'version-2',
      selectedVersionId: 'version-2',
      previewVersionId: 'version-2',
      compareVersionIds: [],
      activeSolvingVersionId: null,
      versions: compareResponse.versions,
      shouldCanonicalize: false,
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
