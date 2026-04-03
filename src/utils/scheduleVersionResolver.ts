import type { ScheduleCompareResponse, ScheduleVersionSummary } from '@/types/schedule';

function hasVersionId(versions: ScheduleVersionSummary[], versionId: string | null): versionId is string {
  return versionId !== null && versions.some((version) => version.id === versionId);
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

export function resolveStep5VersionState(
  compare: ScheduleCompareResponse,
  requestedPreviewVersionId: string | null
): {
  selectedVersionId: string | null;
  previewVersionId: string | null;
  activeSolvingVersionId: string | null;
  versions: ScheduleVersionSummary[];
  shouldCanonicalize: boolean;
} {
  const finalizedVersionId = hasVersionId(compare.versions, compare.finalizedVersionId)
    ? compare.finalizedVersionId
    : null;
  let previewVersionId = finalizedVersionId;

  if (!previewVersionId && hasVersionId(compare.versions, requestedPreviewVersionId)) {
    previewVersionId = requestedPreviewVersionId;
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

  return {
    selectedVersionId: compare.selectedVersionId,
    previewVersionId,
    activeSolvingVersionId,
    versions: compare.versions,
    shouldCanonicalize: previewVersionId !== requestedPreviewVersionId,
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

export function buildStep5Route(scheduleId: string, previewVersionId: string | null) {
  if (!previewVersionId) {
    return {
      path: `/schedule/step5/${scheduleId}`,
    };
  }

  return {
    path: `/schedule/step5/${scheduleId}`,
    query: {
      version: previewVersionId,
    },
  };
}
