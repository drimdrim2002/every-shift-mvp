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

export function useScheduleReviewHub() {
  const route = useRoute();
  const router = useRouter();
  const scheduleStore = useScheduleStore();

  const versions = ref<ScheduleVersionSummary[]>([]);
  const review = ref<ScheduleReviewResponse | null>(null);
  const isLoading = ref(false);
  const isSelecting = ref(false);

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

  async function loadReview(versionId: string | null) {
    if (!versionId) {
      syncReviewState(null);
      return null;
    }

    const nextReview = await getPhase2ScheduleReview(versionId);
    syncReviewState(nextReview);
    return nextReview;
  }

  async function loadCompare(requestedPreviewVersionId: string | null) {
    const currentScheduleId = getScheduleId();
    const compareResponse = await getPhase2ScheduleCompare(currentScheduleId);
    syncScheduleIdToStore(compareResponse.scheduleId);

    const resolvedState = resolveStep5VersionState(compareResponse, requestedPreviewVersionId);
    versions.value = resolvedState.versions;
    scheduleStore.setCompareMatrix(compareResponse);
    scheduleStore.setSelectedVersionId(resolvedState.selectedVersionId);
    scheduleStore.setPreviewVersionId(resolvedState.previewVersionId);

    if (resolvedState.shouldCanonicalize && resolvedState.previewVersionId) {
      await router.replace(buildStep5Route(compareResponse.scheduleId, resolvedState.previewVersionId));
    }

    return resolvedState;
  }

  async function hydrate() {
    isLoading.value = true;

    try {
      const resolvedState = await loadCompare(getQueryPreviewVersionId(route.query.version));
      await loadReview(resolvedState.previewVersionId);
    } finally {
      isLoading.value = false;
    }
  }

  async function setPreviewVersion(versionId: string) {
    isLoading.value = true;

    try {
      const scheduleId = getScheduleId();
      scheduleStore.setPreviewVersionId(versionId);
      await router.replace(buildStep5Route(scheduleId, versionId));
      await loadReview(versionId);
    } finally {
      isLoading.value = false;
    }
  }

  async function selectPreviewVersion() {
    const versionId = scheduleStore.previewVersionId;
    if (!versionId) {
      return;
    }

    isSelecting.value = true;

    try {
      await selectPhase2ScheduleVersion(versionId);
      const resolvedState = await loadCompare(versionId);
      await loadReview(resolvedState.previewVersionId);
    } finally {
      isSelecting.value = false;
    }
  }

  return {
    versions,
    review,
    isLoading,
    isSelecting,
    selectedVersionId,
    previewVersionId,
    hydrate,
    setPreviewVersion,
    selectPreviewVersion,
  };
}
