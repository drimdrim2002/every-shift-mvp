import type { ScheduleCompareResponse, ScheduleVersionSummary } from '@/types/schedule';
import {
  buildCanonicalStep5RouteLocation,
  buildStep5RouteLocation,
} from '@/constants/routes';

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
  return versions[0]?.id ?? null;
}

export function getDefaultStep5FocusVersionId(compare: Pick<
  ScheduleCompareResponse,
  'versions' | 'selectedVersionId' | 'finalizedVersionId'
>): string | null {
  if (hasVersionId(compare.versions, compare.finalizedVersionId)) {
    return compare.finalizedVersionId;
  }

  if (hasVersionId(compare.versions, compare.selectedVersionId)) {
    return compare.selectedVersionId;
  }

  return getDefaultScheduleVersionId(compare.versions);
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
  defaultPreviewVersionId: string | null;
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

  if (!args.resolvedFocusVersionId || requestedCompareVersionIds.length === 0) {
    return [];
  }

  const otherVersionId = requestedCompareVersionIds.find(
    (versionId) => versionId !== args.resolvedFocusVersionId
  );

  if (otherVersionId) {
    return [args.resolvedFocusVersionId, otherVersionId];
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
  const defaultFocusVersionId = getDefaultStep5FocusVersionId(compare);
  let previewVersionId = finalizedVersionId;

  if (!previewVersionId && hasVersionId(compare.versions, normalizedQuery.requestedFocusVersionId)) {
    previewVersionId = normalizedQuery.requestedFocusVersionId;
  }

  if (!previewVersionId) {
    previewVersionId = defaultFocusVersionId;
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
  const requestedCompareVersionIds = normalizedQuery.requestedCompareVersionIds
    .filter(isNonEmptyString);
  const validRequestedCompareVersionIds = dedupeVersionIds(
    requestedCompareVersionIds.filter((versionId) => hasVersionId(compare.versions, versionId))
  );
  const canonicalQuery = buildStep5RouteQuery(
    previewVersionId,
    compareVersionIds,
    {
      defaultVersionId: defaultFocusVersionId,
    }
  );
  const shouldCanonicalize =
    (normalizedQuery.requestedFocusVersionId ?? undefined) !== canonicalQuery.version
    || requestedCompareVersionIds.length !== validRequestedCompareVersionIds.length
    || validRequestedCompareVersionIds.length !== (canonicalQuery.compare ? 1 : 0)
    || (canonicalQuery.compare ?? '') !== (validRequestedCompareVersionIds[0] ?? '');

  return {
    defaultPreviewVersionId: defaultFocusVersionId,
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
  scheduleKey: string,
  previewVersionId: string | null,
  compareVersionIds?: string[],
  options?: { autoStart?: boolean; defaultVersionId?: string | null }
) {
  const query = buildStep5RouteQuery(previewVersionId, compareVersionIds, options);
  return buildStep5RouteLocation(scheduleKey, {
    versionId: query.version ?? null,
    compareVersionId: query.compare ?? null,
    autoStart: query.autoStart === '1',
  });
}

export function buildCanonicalStep5Route(
  scheduleKey: string,
  options?: { autoStart?: boolean }
) {
  return buildCanonicalStep5RouteLocation(scheduleKey, options);
}

function buildStep5RouteQuery(
  previewVersionId: string | null,
  compareVersionIds?: string[],
  options?: { autoStart?: boolean; defaultVersionId?: string | null }
): Record<string, string> {
  const canonicalCompareVersionIds = previewVersionId
    ? getCanonicalCompareVersionIds(compareVersionIds ?? [], previewVersionId)
    : dedupeVersionIds(compareVersionIds ?? []).slice(0, 2);
  const query: Record<string, string> = {};
  const isDefaultFocus =
    previewVersionId === null || previewVersionId === (options?.defaultVersionId ?? null);

  if (previewVersionId && !isDefaultFocus) {
    query.version = previewVersionId;
  }

  const compareVersionId = previewVersionId
    ? canonicalCompareVersionIds.find((versionId) => versionId !== previewVersionId) ?? null
    : canonicalCompareVersionIds[0] ?? null;
  if (compareVersionId) {
    query.compare = compareVersionId;
  }

  if (options?.autoStart) {
    query.autoStart = '1';
  }

  return query;
}
