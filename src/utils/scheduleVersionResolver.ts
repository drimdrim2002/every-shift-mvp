import type { ScheduleCompareResponse, ScheduleVersionSummary } from '@/types/schedule';

function hasVersionId(versions: ScheduleVersionSummary[], versionId: string | null): versionId is string {
  return versionId !== null && versions.some((version) => version.id === versionId);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function dedupeVersionIds(versionIds: string[]): string[] {
  const seen = new Set<string>();
  const uniqueVersionIds: string[] = [];

  for (const versionId of versionIds) {
    if (seen.has(versionId)) {
      continue;
    }

    seen.add(versionId);
    uniqueVersionIds.push(versionId);
  }

  return uniqueVersionIds;
}

function getCanonicalCompareVersionIds(
  versionIds: string[],
  focusVersionId: string | null
): string[] {
  const dedupedVersionIds = dedupeVersionIds(versionIds);

  if (!focusVersionId) {
    return dedupedVersionIds.slice(0, 2);
  }

  const withoutFocus = dedupedVersionIds.filter((versionId) => versionId !== focusVersionId);
  return [focusVersionId, ...withoutFocus].slice(0, 2);
}

export function getDefaultScheduleVersionId(
  versions: ScheduleVersionSummary[]
): string | null {
  return versions.find((version) => version.versionNo === 1)?.id ?? null;
}

export function resolveStep4VersionState(compare: ScheduleCompareResponse): {
  selectedVersionId: string | null;
  previewVersionId: string | null;
  versions: ScheduleVersionSummary[];
}
export function resolveStep4VersionState(
  compare: ScheduleCompareResponse,
  preferredPreviewVersionId?: string | null
): {
  selectedVersionId: string | null;
  previewVersionId: string | null;
  versions: ScheduleVersionSummary[];
}
export function resolveStep4VersionState(
  compare: ScheduleCompareResponse,
  preferredPreviewVersionId?: string | null
): {
  selectedVersionId: string | null;
  previewVersionId: string | null;
  versions: ScheduleVersionSummary[];
} {
  let previewVersionId = hasVersionId(compare.versions, preferredPreviewVersionId ?? null)
    ? preferredPreviewVersionId ?? null
    : null;

  if (!previewVersionId && hasVersionId(compare.versions, compare.selectedVersionId)) {
    previewVersionId = compare.selectedVersionId;
  }

  if (!previewVersionId) {
    previewVersionId = getDefaultScheduleVersionId(compare.versions);
  }

  return {
    selectedVersionId: compare.selectedVersionId,
    previewVersionId,
    versions: compare.versions,
  };
}

export interface Step5QueryState {
  requestedFocusVersionId: string | null;
  requestedCompareVersionIds: string[];
}

export interface ResolvedStep5VersionState {
  selectedVersionId: string | null;
  previewVersionId: string | null;
  compareVersionIds: string[];
  activeSolvingVersionId: string | null;
  versions: ScheduleVersionSummary[];
  shouldCanonicalize: boolean;
}

function normalizeStep5QueryState(
  requestedQuery: string | Step5QueryState | null | undefined
): Step5QueryState {
  if (typeof requestedQuery === 'string' || requestedQuery === null || requestedQuery === undefined) {
    return {
      requestedFocusVersionId: requestedQuery ?? null,
      requestedCompareVersionIds: [],
    };
  }

  return {
    requestedFocusVersionId: requestedQuery.requestedFocusVersionId,
    requestedCompareVersionIds: requestedQuery.requestedCompareVersionIds,
  };
}

function resolvePreferredCompareVersionIds(args: {
  compare: ScheduleCompareResponse;
  requestedCompareVersionIds: string[];
  resolvedFocusVersionId: string | null;
  finalizedVersionId: string | null;
}): string[] {
  if (args.finalizedVersionId) {
    return [];
  }

  const requestedCompareVersionIds = dedupeVersionIds(
    args.requestedCompareVersionIds.filter((versionId) => hasVersionId(args.compare.versions, versionId))
  );

  if (requestedCompareVersionIds.length > 0) {
    const canonicalCompareVersionIds = getCanonicalCompareVersionIds(
      requestedCompareVersionIds,
      args.resolvedFocusVersionId
    );

    return canonicalCompareVersionIds.length >= 2 ? canonicalCompareVersionIds : [];
  }

  return [];
}

export function resolveStep5VersionState(
  compare: ScheduleCompareResponse,
  requestedQuery: string | Step5QueryState | null
): ResolvedStep5VersionState {
  const normalizedQuery = normalizeStep5QueryState(requestedQuery);
  const finalizedVersionId = hasVersionId(compare.versions, compare.finalizedVersionId)
    ? compare.finalizedVersionId
    : null;
  let previewVersionId = finalizedVersionId;

  if (!previewVersionId && hasVersionId(compare.versions, normalizedQuery.requestedFocusVersionId)) {
    previewVersionId = normalizedQuery.requestedFocusVersionId;
  }

  if (!previewVersionId && hasVersionId(compare.versions, compare.selectedVersionId)) {
    previewVersionId = compare.selectedVersionId;
  }

  if (!previewVersionId) {
    previewVersionId = getDefaultScheduleVersionId(compare.versions);
  }

  const activeSolvingVersionId = hasVersionId(compare.versions, compare.activeSolvingVersionId)
    ? compare.activeSolvingVersionId
    : null;
  const compareVersionIds = resolvePreferredCompareVersionIds({
    compare,
    requestedCompareVersionIds: normalizedQuery.requestedCompareVersionIds,
    resolvedFocusVersionId: previewVersionId,
    finalizedVersionId,
  });
  const requestedCompareVersionIds = normalizedQuery.requestedCompareVersionIds.filter(isNonEmptyString);
  const validRequestedCompareVersionIds = dedupeVersionIds(
    requestedCompareVersionIds.filter((versionId) => hasVersionId(compare.versions, versionId))
  );
  const shouldCanonicalize = (() => {
    if (normalizedQuery.requestedFocusVersionId !== previewVersionId) {
      return true;
    }

    if (requestedCompareVersionIds.length === 0) {
      return normalizedQuery.requestedFocusVersionId === null;
    }

    if (requestedCompareVersionIds.length !== validRequestedCompareVersionIds.length) {
      return true;
    }

    if (validRequestedCompareVersionIds.length !== compareVersionIds.length) {
      return true;
    }

    return validRequestedCompareVersionIds.some(
      (versionId, index) => compareVersionIds[index] !== versionId
    );
  })();

  return {
    selectedVersionId: compare.selectedVersionId,
    previewVersionId,
    compareVersionIds,
    activeSolvingVersionId,
    versions: compare.versions,
    shouldCanonicalize,
  };
}

export function resolveStep5RunningVersion(compare: ScheduleCompareResponse): {
  issue: 'missing' | 'multiple' | null;
  runningVersionId: string | null;
  runningExecutionId: string | null;
} {
  const runningVersions = compare.versions.filter((version) => {
    return version.status === 'solving' && version.activeSolverExecutionId !== null;
  });

  if (runningVersions.length === 1) {
    const [runningVersion] = runningVersions;
    return {
      issue: null,
      runningVersionId: runningVersion?.id ?? null,
      runningExecutionId: runningVersion?.activeSolverExecutionId ?? null,
    };
  }

  return {
    issue: runningVersions.length === 0 ? 'missing' : 'multiple',
    runningVersionId: null,
    runningExecutionId: null,
  };
}

export function buildStep5Route(
  scheduleId: string,
  previewVersionId: string | null,
  compareVersionIds?: string[]
) {
  const canonicalCompareVersionIds = previewVersionId
    ? getCanonicalCompareVersionIds(compareVersionIds ?? [], previewVersionId)
    : dedupeVersionIds(compareVersionIds ?? []).slice(0, 2);

  if (!previewVersionId) {
    return canonicalCompareVersionIds.length > 1
      ? {
          path: `/schedule/step5/${scheduleId}`,
          query: {
            compare: canonicalCompareVersionIds.join(','),
          },
        }
      : {
        path: `/schedule/step5/${scheduleId}`,
      };
  }

  const query: Record<string, string> = {
    version: previewVersionId,
  };

  if (canonicalCompareVersionIds.length > 1) {
    query.compare = canonicalCompareVersionIds.join(',');
  }

  return {
    path: `/schedule/step5/${scheduleId}`,
    query,
  };
}
