import type { ScheduleCompareResponse, ScheduleVersionSummary } from '@/types/schedule';
import {
  buildCanonicalStep5RouteLocation,
  buildStep5RouteLocation,
} from '@/constants/routes';

function hasVersionId(versions: ScheduleVersionSummary[], versionId: string | null): versionId is string {
  return versionId !== null && versions.some((version) => version.id === versionId);
}

function getVersionById(
  versions: ScheduleVersionSummary[],
  versionId: string | null
): ScheduleVersionSummary | null {
  if (!versionId) {
    return null;
  }

  return versions.find((version) => version.id === versionId) ?? null;
}

function isActiveVersion(version: ScheduleVersionSummary): boolean {
  return !version.archivedAt;
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

export function getCanonicalCompareVersionIds(
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
  return getCanonicalScheduleVersionId(compare);
}

export function isSolverFailedVersion(version: ScheduleVersionSummary): boolean {
  return version.status === 'solve_failed';
}

function isExecutedVersion(version: ScheduleVersionSummary): boolean {
  if (isSolverFailedVersion(version)) {
    return false;
  }

  return version.status !== 'draft'
    || version.latestEvaluationId !== null
    || version.activeSolverExecutionId !== null
    || version.comparisonMetrics !== null
    || version.finalizationGate !== null;
}

function getFinalizedVersionId(compare: Pick<
  ScheduleCompareResponse,
  'versions' | 'finalizedVersionId'
>): string | null {
  if (hasVersionId(compare.versions, compare.finalizedVersionId)) {
    return compare.finalizedVersionId;
  }

  return compare.versions.find((version) => version.isFinalized)?.id ?? null;
}

function getExecutedVersions(versions: ScheduleVersionSummary[]): ScheduleVersionSummary[] {
  return versions.filter(isExecutedVersion);
}

export function getCanonicalScheduleVersionId(compare: Pick<
  ScheduleCompareResponse,
  'versions' | 'selectedVersionId' | 'finalizedVersionId'
>): string | null {
  const activeVersions = compare.versions.filter(isActiveVersion);
  const finalizedVersion =
    getVersionById(activeVersions, compare.finalizedVersionId)
    ?? activeVersions.find((version) => version.isFinalized)
    ?? null;
  if (finalizedVersion) {
    return finalizedVersion.id;
  }

  const selectedVersion = getVersionById(activeVersions, compare.selectedVersionId);
  if (selectedVersion) {
    return selectedVersion.id;
  }

  const latestExecutedVersion = activeVersions
    .filter(isExecutedVersion)
    .sort((left, right) => right.versionNo - left.versionNo)[0];
  if (latestExecutedVersion) {
    return latestExecutedVersion.id;
  }

  const firstDraftVersion = activeVersions
    .filter((version) => version.status === 'draft')
    .sort((left, right) => left.versionNo - right.versionNo)[0];
  if (firstDraftVersion) {
    return firstDraftVersion.id;
  }

  return activeVersions.sort((left, right) => left.versionNo - right.versionNo)[0]?.id ?? null;
}

export function hasExecutedVersionHistory(compare: Pick<
  ScheduleCompareResponse,
  'versions'
>): boolean {
  return compare.versions.some(isExecutedVersion);
}

export function getDefaultExecutedFocusVersionId(compare: Pick<
  ScheduleCompareResponse,
  'versions' | 'selectedVersionId' | 'finalizedVersionId'
>): string | null {
  const finalizedVersionId = getFinalizedVersionId(compare);
  if (finalizedVersionId) {
    return finalizedVersionId;
  }

  const executedVersions = getExecutedVersions(compare.versions);
  const selectedVersion = executedVersions.find((version) => version.id === compare.selectedVersionId);
  if (selectedVersion) {
    return selectedVersion.id;
  }

  const latestExecutedVersion = [...executedVersions].sort(
    (left, right) => right.versionNo - left.versionNo
  )[0];
  if (latestExecutedVersion) {
    return latestExecutedVersion.id;
  }

  return getDefaultStep5FocusVersionId(compare);
}

export function getDefaultCompareVersionIds(
  compare: Pick<ScheduleCompareResponse, 'versions' | 'finalizedVersionId'>,
  focusVersionId: string | null
): string[] {
  if (getFinalizedVersionId(compare) || !focusVersionId) {
    return [];
  }

  const executedVersions = getExecutedVersions(compare.versions);
  const focusVersion = executedVersions.find((version) => version.id === focusVersionId);
  if (!focusVersion) {
    return [];
  }

  const latestOtherVersion = executedVersions
    .filter((version) => version.id !== focusVersionId)
    .sort((left, right) => right.versionNo - left.versionNo)[0];

  return latestOtherVersion ? [focusVersion.id, latestOtherVersion.id] : [];
}

export function resolveStep4VersionState(compare: ScheduleCompareResponse): {
  selectedVersionId: string | null;
  previewVersionId: string | null;
  versions: ScheduleVersionSummary[];
}
export function resolveStep4VersionState(
  compare: ScheduleCompareResponse,
  _preferredPreviewVersionId?: string | null
): {
  selectedVersionId: string | null;
  previewVersionId: string | null;
  versions: ScheduleVersionSummary[];
}
export function resolveStep4VersionState(
  compare: ScheduleCompareResponse,
  _preferredPreviewVersionId?: string | null
): {
  selectedVersionId: string | null;
  previewVersionId: string | null;
  versions: ScheduleVersionSummary[];
} {
  const previewVersionId = getCanonicalScheduleVersionId(compare);

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

export function resolveStep5VersionState(
  compare: ScheduleCompareResponse,
  requestedQuery: string | Step5QueryState | null
): ResolvedStep5VersionState {
  const normalizedQuery = normalizeStep5QueryState(requestedQuery);
  const defaultFocusVersionId = getCanonicalScheduleVersionId(compare);
  const previewVersionId = defaultFocusVersionId;

  const activeSolvingVersionId = hasVersionId(compare.versions, compare.activeSolvingVersionId)
    ? compare.activeSolvingVersionId
    : null;
  const requestedCompareVersionIds = normalizedQuery.requestedCompareVersionIds
    .filter(isNonEmptyString);
  const validRequestedCompareVersionIds = dedupeVersionIds(
    requestedCompareVersionIds.filter((versionId) => {
      const version = compare.versions.find((candidate) => candidate.id === versionId);
      return version !== undefined && !isSolverFailedVersion(version);
    })
  );
  const compareVersionIds: string[] = [];
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
    || validRequestedCompareVersionIds.length > 0
    || Boolean(canonicalQuery.compare);

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
