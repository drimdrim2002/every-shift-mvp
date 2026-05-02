import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getPhase2ScheduleCompare,
  getPhase2ScheduleReview,
  selectPhase2ScheduleVersion,
} from '@/api/schedule';
import { useScheduleStore } from '@/stores/schedule';
import {
  resolveStep5VersionState,
} from '@/utils/scheduleVersionResolver';
import type { Step5QueryState } from '@/utils/scheduleVersionResolver';
import {
  buildCanonicalStep5RouteLocation,
  parseStep5RouteQuery,
} from '@/constants/routes';
import type {
  ScheduleCompareResponse,
  ScheduleReviewResponse,
  ScheduleVersionSummary,
} from '@/types/schedule';

function dedupeVersionIds(versionIds: string[]): string[] {
  return [...new Set(versionIds)];
}

type HydrateOptions = {
  loadComparedReviews?: boolean;
};

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
  const hasHydratedOnce = ref(false);

  const focusVersionId = computed(() => scheduleStore.previewVersionId);
  const selectedVersionId = computed(() => scheduleStore.selectedVersionId);
  const previewVersionId = computed(() => scheduleStore.previewVersionId);

  const routeScheduleKey = computed(() => {
    const paramId = route.params.scheduleKey;
    return typeof paramId === 'string' && paramId.length > 0 ? paramId : null;
  });

  function syncScheduleContextToStore(compareResponse: ScheduleCompareResponse) {
    const currentBasicInfo = scheduleStore.basicInfo;
    const resolvedSchedulePublicId =
      compareResponse.schedulePublicId ?? currentBasicInfo?.schedulePublicId ?? compareResponse.scheduleId;
    const nextBasicInfo = {
      scheduleId: compareResponse.scheduleId,
      schedulePublicId: resolvedSchedulePublicId,
      month: compareResponse.month ?? currentBasicInfo?.month ?? '',
      organizationId: compareResponse.organizationId ?? currentBasicInfo?.organizationId ?? '',
      organizationName: currentBasicInfo?.organizationName ?? '',
      organizationType: currentBasicInfo?.organizationType ?? '',
      employeeCount: currentBasicInfo?.employeeCount ?? 0,
      shifts: currentBasicInfo?.shifts ?? [],
    };

    if (
      currentBasicInfo?.scheduleId === nextBasicInfo.scheduleId &&
      currentBasicInfo?.schedulePublicId === nextBasicInfo.schedulePublicId &&
      currentBasicInfo?.month === nextBasicInfo.month &&
      currentBasicInfo?.organizationId === nextBasicInfo.organizationId
    ) {
      return;
    }

    scheduleStore.setBasicInfo(nextBasicInfo);
  }

  function getScheduleKey(): string {
    const currentScheduleKey =
      routeScheduleKey.value
      ?? scheduleStore.basicInfo?.schedulePublicId
      ?? scheduleStore.basicInfo?.scheduleId
      ?? null;

    if (!currentScheduleKey) {
      throw new Error('스케줄 키를 확인할 수 없습니다. Step5를 다시 불러주세요.');
    }

    return currentScheduleKey;
  }

  function syncReviewState(nextReview: ScheduleReviewResponse | null) {
    review.value = nextReview;
    scheduleStore.setLatestEvaluation(nextReview?.latestEvaluation ?? null);
  }

  function getRequestedCompareVersionIds(): string[] {
    if (compareVersionIds.value.length > 0) {
      return compareVersionIds.value;
    }

    return parseStep5RouteQuery(route.query).requestedCompareVersionIds;
  }

  function hasTransientStep5QueryState(): boolean {
    const parsedRouteQuery = parseStep5RouteQuery(route.query);
    return parsedRouteQuery.requestedFocusVersionId !== null
      || parsedRouteQuery.requestedCompareVersionIds.length > 0;
  }

  function getRouteRequestedQueryState(): Step5QueryState | null {
    if (!hasTransientStep5QueryState()) {
      return null;
    }

    const parsedRouteQuery = parseStep5RouteQuery(route.query);
    return {
      requestedFocusVersionId: parsedRouteQuery.requestedFocusVersionId,
      requestedCompareVersionIds: parsedRouteQuery.requestedCompareVersionIds,
    };
  }

  function getInMemoryRequestedQueryState(): Step5QueryState | null {
    if (!hasHydratedOnce.value) {
      return null;
    }

    return {
      requestedFocusVersionId: focusVersionId.value,
      requestedCompareVersionIds: compareVersionIds.value,
    };
  }

  async function loadReviews(versionIds: string[], focusReviewVersionId: string | null) {
    const uniqueVersionIds = dedupeVersionIds(
      [focusReviewVersionId, ...versionIds].filter((versionId): versionId is string => !!versionId)
    );

    if (focusReviewVersionId === null && uniqueVersionIds.length === 0) {
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

  async function loadCompare(
    requestedQuery: string | Step5QueryState | null,
    options?: { canonicalizeRoute?: boolean }
  ) {
    const currentScheduleKey = getScheduleKey();
    const compareResponse = await getPhase2ScheduleCompare(currentScheduleKey);
    syncScheduleContextToStore(compareResponse);

    const resolvedState = resolveStep5VersionState(compareResponse, requestedQuery);
    versions.value = resolvedState.versions;
    compareVersionIds.value = resolvedState.compareVersionIds;
    scheduleStore.setCompareMatrix(compareResponse);
    scheduleStore.setSelectedVersionId(resolvedState.selectedVersionId);
    scheduleStore.setPreviewVersionId(resolvedState.previewVersionId);

    if (
      options?.canonicalizeRoute ||
      routeScheduleKey.value !== (compareResponse.schedulePublicId ?? compareResponse.scheduleId)
    ) {
      const parsedRouteQuery = parseStep5RouteQuery(route.query);
      await router.replace(
        buildCanonicalStep5RouteLocation(compareResponse.schedulePublicId ?? compareResponse.scheduleId, {
          autoStart: parsedRouteQuery.autoStart,
        })
      );
    }

    return resolvedState;
  }

  function resolveHydrateRequestedQuery(
    requestedQuery?: Step5QueryState | null
  ): {
    requestedQuery: Step5QueryState | null;
    canonicalizeRoute: boolean;
  } {
    if (requestedQuery !== undefined) {
      return {
        requestedQuery,
        canonicalizeRoute: false,
      };
    }

    const routeRequestedQuery = getRouteRequestedQueryState();
    if (routeRequestedQuery) {
      return {
        requestedQuery: routeRequestedQuery,
        canonicalizeRoute: true,
      };
    }

    return {
      requestedQuery: getInMemoryRequestedQueryState(),
      canonicalizeRoute: false,
    };
  }

  async function hydrate(
    requestedQuery?: Step5QueryState | null,
    options: HydrateOptions = {}
  ) {
    isLoading.value = true;

    try {
      const nextRequestedQuery = resolveHydrateRequestedQuery(requestedQuery);
      const resolvedState = await loadCompare(
        nextRequestedQuery.requestedQuery,
        {
          canonicalizeRoute: nextRequestedQuery.canonicalizeRoute,
        }
      );
      await loadReviews(
        options.loadComparedReviews ? resolvedState.compareVersionIds : [],
        resolvedState.previewVersionId
      );
      hasHydratedOnce.value = true;
    } finally {
      isLoading.value = false;
    }
  }

  async function hydrateComparedReviews() {
    await loadReviews(compareVersionIds.value, previewVersionId.value);
  }

  async function setPreviewVersion(versionId: string) {
    isLoading.value = true;

    try {
      const resolvedState = await loadCompare(
        {
          requestedFocusVersionId: versionId,
          requestedCompareVersionIds: getRequestedCompareVersionIds(),
        },
        {
          canonicalizeRoute: false,
        }
      );
      await loadReviews(resolvedState.compareVersionIds, resolvedState.previewVersionId);
      hasHydratedOnce.value = true;
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
      const resolvedState = await loadCompare(
        {
          requestedFocusVersionId: versionId,
          requestedCompareVersionIds: getRequestedCompareVersionIds(),
        },
        {
          canonicalizeRoute: false,
        }
      );
      await loadReviews(resolvedState.compareVersionIds, resolvedState.previewVersionId);
      hasHydratedOnce.value = true;
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
    hydrateComparedReviews,
    setPreviewVersion,
    selectPreviewVersion,
  };
}
