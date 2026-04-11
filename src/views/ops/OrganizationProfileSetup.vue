<template>
  <div class="mx-auto max-w-4xl space-y-6 px-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">
          조직/사이트 기본 설정
        </h1>
        <p class="mt-1 text-sm text-gray-500">
          대시보드와 Step2에서 공통으로 사용할 기본 설정을 관리합니다.
        </p>
      </div>
      <n-button @click="router.push('/')">
        대시보드로 돌아가기
      </n-button>
    </div>

    <n-alert
      v-if="loadErrorMessage"
      type="error"
    >
      <template #header>
        기본 설정을 불러오지 못했습니다
      </template>
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm">
          {{ loadErrorMessage }}
        </p>
        <n-button
          size="small"
          :loading="loading"
          @click="loadFoundationSetup"
        >
          다시 시도
        </n-button>
      </div>
    </n-alert>

    <template v-if="hasLoaded">
      <organization-profile-form
        :model-value="organizationProfile"
        :saving="organizationSaving"
        @save="handleSaveOrganizationProfile"
      />

      <site-foundation-form
        :model-value="siteSetup.sites"
        :pilot-site-id="siteSetup.pilotSiteId"
        :schedule-target-locked="scheduleTargetLocked"
        :saving="siteSaving"
        @save="handleSaveSites"
      />
    </template>

    <n-spin
      v-else-if="loading"
      :show="loading"
    >
      <n-card class="text-sm text-gray-500">
        기본 설정을 불러오는 중입니다.
      </n-card>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NAlert, NButton, NCard, NSpin } from 'naive-ui';
import OrganizationProfileForm from '@/components/ops/OrganizationProfileForm.vue';
import SiteFoundationForm from '@/components/ops/SiteFoundationForm.vue';
import { getOrganizationProfile, getSites, updateOrganizationProfile, updateSites } from '@/api/ops';
import { useOrganizationStore } from '@/stores/organization';
import type { OrganizationProfileRequest, SiteRequest, SitesResponse } from '@/types/ops';
import { showError, showSuccess } from '@/utils/message';

const router = useRouter();
const organizationStore = useOrganizationStore();

const loading = ref(true);
const hasLoaded = ref(false);
const loadErrorMessage = ref<string | null>(null);
const organizationSaving = ref(false);
const siteSaving = ref(false);
const organizationProfile = ref<OrganizationProfileRequest>({
  organizationId: '',
  name: '',
  type: '',
});
const siteSetup = ref<SitesResponse>({
  organizationId: '',
  pilotSiteId: null,
  sites: [],
});
const scheduleTargetLocked = computed(() => siteSetup.value.pilotSiteId !== null);

function toSiteSaveErrorMessage(error: unknown): string {
  const fallback = '사이트 설정 저장에 실패했습니다.';

  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.trim();
  if (!message) {
    return fallback;
  }

  if (message.includes('Changing the schedule-active pilot site code is not supported')) {
    return '현재 버전에서는 최초 설정한 스케줄 대상 사이트를 변경할 수 없습니다.';
  }

  if (message.includes('Exactly one schedule-active site is required')) {
    return '스케줄 생성 대상 사이트는 1개만 선택할 수 있습니다.';
  }

  console.error('[OrganizationProfileSetup] Unexpected site save error:', error);
  if (/[가-힣]/.test(message)) {
    return message;
  }

  return fallback;
}

async function ensureOrganizationId(): Promise<string> {
  if (organizationStore.current?.id) {
    return organizationStore.current.id;
  }

  const result = await organizationStore.loadOrganization();
  if (!result.success || !organizationStore.current?.id) {
    throw new Error(result.error ?? '조직 정보를 불러오지 못했습니다.');
  }

  return organizationStore.current.id;
}

async function loadFoundationSetup() {
  loading.value = true;
  loadErrorMessage.value = null;

  try {
    const organizationId = await ensureOrganizationId();
    const [profile, sites] = await Promise.all([
      getOrganizationProfile(organizationId),
      getSites(organizationId),
    ]);

    organizationProfile.value = profile;
    siteSetup.value = sites;
    organizationStore.updateFoundationProfileCache(profile);
    organizationStore.updateFoundationSitesCache(sites.sites);
    hasLoaded.value = true;
  } catch (error) {
    loadErrorMessage.value = error instanceof Error ? error.message : '기본 설정을 불러오지 못했습니다.';
    showError(loadErrorMessage.value);
  } finally {
    loading.value = false;
  }
}

async function handleSaveOrganizationProfile(value: OrganizationProfileRequest) {
  organizationSaving.value = true;

  try {
    const saved = await updateOrganizationProfile(value);
    organizationProfile.value = saved;
    organizationStore.updateFoundationProfileCache(saved);
    showSuccess('조직 기본 정보를 저장했습니다.');
  } catch (error) {
    showError(error instanceof Error ? error.message : '조직 기본 정보 저장에 실패했습니다.');
  } finally {
    organizationSaving.value = false;
  }
}

async function handleSaveSites(value: SiteRequest[]) {
  siteSaving.value = true;

  try {
    const organizationId = await ensureOrganizationId();
    const saved = await updateSites({
      organizationId,
      sites: value,
    });
    siteSetup.value = saved;
    organizationStore.updateFoundationSitesCache(saved.sites);
    showSuccess('사이트 설정을 저장했습니다.');
  } catch (error) {
    showError(toSiteSaveErrorMessage(error));
  } finally {
    siteSaving.value = false;
  }
}

onMounted(() => {
  void loadFoundationSetup();
});
</script>
