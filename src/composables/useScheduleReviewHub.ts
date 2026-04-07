import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getPhase2ScheduleCompare,
  getPhase2ScheduleReview,
  selectPhase2ScheduleVersion,
} from '@/api/schedule';
import { useScheduleStore } from '@/stores/schedule';
import { buildStep5Route, resolveStep5VersionState } from '@/utils/scheduleVersionResolver';
import type { ScheduleReviewResponse, ScheduleVersionSummary } from '@/types/schedule';

function getQueryPreviewVersionId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function getQueryCompareVersionIds(value: unknown): string[] {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((versionId) => versionId.trim())
      .filter((versionId) => versionId.length > 0);
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      if (typeof entry !== 'string') {
        return [];
      }

      return entry
        .split(',')
        .map((versionId) => versionId.trim())
        .filter((versionId) => versionId.length > 0);
    });
  }

  return [];
}

function dedupeVersionIds(versionIds: string[]): string[] {
  return [...new Set(versionIds)];
}

export function useScheduleReviewHub() {
  const route = useRoute();
  const router = useRouter();
  const scheduleStore = useScheduleStore();

  const versions = ref<ScheduleVersionSummary[]>([]);
  const review = ref<ScheduleReviewResponse | null>(null);
  const comparedReviews = ref<Record<string, ScheduleReviewResponse>>({});
  const compareVersionIds = ref<string[]>([]);
  const isLoading = ref(false);
  const isSelecting = ref(false);

  const focusVersionId = computed(() => scheduleStore.previewVersionId);
  const selectedVersionId = computed(() => scheduleStore.selectedVersionId);
  const previewVersionId = computed(() => scheduleStore.previewVersionId);

  const routeScheduleId = computed(() => {
    const paramId = route.params.id;
    return typeof paramId === 'string' && paramId.length > 0 ? paramId : null;
  });

  function syncScheduleIdToStore(nextScheduleId: string) {
    if (!scheduleStore.basicInfo || scheduleStore.basicInfo.scheduleId === nextScheduleId) {
      return;
    }

    scheduleStore.setBasicInfo({
      ...scheduleStore.basicInfo,
      scheduleId: nextScheduleId,
    });
  }

  function getScheduleId(): string {
    const currentScheduleId = routeScheduleId.value ?? scheduleStore.basicInfo?.scheduleId ?? null;

    if (!currentScheduleId) {
      throw new Error('스케줄 ID를 확인할 수 없습니다. Step5를 다시 불러주세요.');
    }

    syncScheduleIdToStore(currentScheduleId);
    return currentScheduleId;
  }

  function syncReviewState(nextReview: ScheduleReviewResponse | null) {
    review.value = nextReview;
    scheduleStore.setLatestEvaluation(nextReview?.latestEvaluation ?? null);
  }

  function getRequestedCompareVersionIds(): string[] {
    if (compareVersionIds.value.length > 0) {
      return compareVersionIds.value;
    }

    return getQueryCompareVersionIds(route.query.compare);
  }

  async function loadReviews(versionIds: string[], focusReviewVersionId: string | null) {
    const uniqueVersionIds = dedupeVersionIds(versionIds);

    if (uniqueVersionIds.length === 0) {
      syncReviewState(null);
      comparedReviews.value = {};
      return null;
    }

    const nextReviews: Record<string, ScheduleReviewResponse> = {};
    const nextFocusVersionId = focusReviewVersionId ?? null;

    if (nextFocusVersionId && uniqueVersionIds.includes(nextFocusVersionId)) {
      nextReviews[nextFocusVersionId] = await getPhase2ScheduleReview(nextFocusVersionId);
    }

    for (const versionId of uniqueVersionIds) {
      if (versionId === nextFocusVersionId) {
        continue;
      }

      nextReviews[versionId] = await getPhase2ScheduleReview(versionId);
    }

    comparedReviews.value = nextReviews;

    const resolvedFocusVersionId = nextFocusVersionId ?? focusVersionId.value;
    const focusReview = resolvedFocusVersionId ? nextReviews[resolvedFocusVersionId] ?? null : null;
    syncReviewState(focusReview);
    return focusReview;
  }

  async function loadCompare(requestedQuery: string | { requestedFocusVersionId: string | null; requestedCompareVersionIds: string[] } | null) {
    const currentScheduleId = getScheduleId();
    const compareResponse = await getPhase2ScheduleCompare(currentScheduleId);
    syncScheduleIdToStore(compareResponse.scheduleId);

    const resolvedState = resolveStep5VersionState(compareResponse, requestedQuery);
    versions.value = resolvedState.versions;
    compareVersionIds.value = resolvedState.compareVersionIds;
    scheduleStore.setCompareMatrix(compareResponse);
    scheduleStore.setSelectedVersionId(resolvedState.selectedVersionId);
    scheduleStore.setPreviewVersionId(resolvedState.previewVersionId);

    if (resolvedState.shouldCanonicalize && resolvedState.previewVersionId) {
      await router.replace(
        buildStep5Route(
          compareResponse.scheduleId,
          resolvedState.previewVersionId,
          resolvedState.compareVersionIds
        )
      );
    }

    return resolvedState;
  }

  async function hydrate() {
    isLoading.value = true;

    try {
      const resolvedState = await loadCompare({
        requestedFocusVersionId: getQueryPreviewVersionId(route.query.version),
        requestedCompareVersionIds: getQueryCompareVersionIds(route.query.compare),
      });
      await loadReviews(resolvedState.compareVersionIds, resolvedState.previewVersionId);
    } finally {
      isLoading.value = false;
    }
  }

  async function setPreviewVersion(versionId: string) {
    isLoading.value = true;

    try {
      const resolvedState = await loadCompare({
        requestedFocusVersionId: versionId,
        requestedCompareVersionIds: getRequestedCompareVersionIds(),
      });
      await loadReviews(resolvedState.compareVersionIds, resolvedState.previewVersionId);
    } finally {
      isLoading.value = false;
    }
  }

  async function selectPreviewVersion() {
    if (scheduleStore.compareMatrix?.finalizedVersionId) {
      return;
    }

    const versionId = scheduleStore.previewVersionId;
    if (!versionId) {
      return;
    }

    isSelecting.value = true;

    try {
      await selectPhase2ScheduleVersion(versionId);
      const resolvedState = await loadCompare(versionId);
      await loadReviews(resolvedState.compareVersionIds, resolvedState.previewVersionId);
    } finally {
      isSelecting.value = false;
    }
  }

  return {
    versions,
    review,
    comparedReviews,
    compareVersionIds,
    focusVersionId,
    isLoading,
    isSelecting,
    selectedVersionId,
    previewVersionId,
    hydrate,
    setPreviewVersion,
    selectPreviewVersion,
  };
}
