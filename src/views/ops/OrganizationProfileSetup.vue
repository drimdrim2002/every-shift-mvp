<template>
  <div class="mx-auto max-w-4xl space-y-6 px-4">
    <div>
      <h1 class="text-2xl font-bold">
        운영 기본 설정
      </h1>
      <p class="mt-1 text-sm text-gray-500">
        근무표 생성 전에 병원 정보와 기준 장소를 먼저 확인합니다.
      </p>
    </div>

    <n-alert
      v-if="loadErrorMessage"
      type="error"
    >
      <template #header>
        운영 기본 설정을 불러오지 못했습니다
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
        :status="organizationStatus"
        :can-save="organizationCanSave"
        @dirty-change="handleOrganizationDirtyChange"
        @save="handleSaveOrganizationProfile"
      />

      <site-foundation-form
        :model-value="siteSetup.site"
        :saving="siteSaving"
        :status="siteStatus"
        :can-save="siteCanSave"
        @dirty-change="handleSiteDirtyChange"
        @save="handleSaveSites"
      />
    </template>

    <n-spin
      v-else-if="loading"
      :show="loading"
    >
      <n-card class="text-sm text-gray-500">
        운영 기본 설정을 불러오는 중입니다.
      </n-card>
    </n-spin>

    <PageActionBar data-test="setup-action-bar">
      <template #left>
        <n-button
          data-test="dashboard-return-button"
          @click="handleReturnToDashboard"
        >
          대시보드로 돌아가기
        </n-button>
      </template>
    </PageActionBar>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NAlert, NButton, NCard, NSpin } from 'naive-ui';
import OrganizationProfileForm from '@/components/ops/OrganizationProfileForm.vue';
import SiteFoundationForm from '@/components/ops/SiteFoundationForm.vue';
import PageActionBar from '@/components/ui/PageActionBar.vue';
import { getOrganizationProfile, getSites, updateOrganizationProfile, updateSites } from '@/api/ops';
import { useOrganizationStore } from '@/stores/organization';
import type {
  FoundationSaveState,
  OrganizationProfileRequest,
  OrganizationProfileResponse,
  SiteFoundationResponse,
  SiteRequest,
} from '@/types/ops';
import { showError, showInfo, showSuccess } from '@/utils/message';

const DEFAULT_ORGANIZATION_TYPE = 'hospital';

const router = useRouter();
const organizationStore = useOrganizationStore();

const loading = ref(true);
const hasLoaded = ref(false);
const loadErrorMessage = ref<string | null>(null);
const organizationSaving = ref(false);
const siteSaving = ref(false);
const organizationDirty = ref(false);
const siteDirty = ref(false);
const organizationSaveFailed = ref(false);
const siteSaveFailed = ref(false);
const organizationTypeBackfillRequired = ref(false);
const organizationProfile = ref<OrganizationProfileRequest>({
  organizationId: '',
  name: '',
  type: '',
});
const siteSetup = ref<SiteFoundationResponse>({
  organizationId: '',
  site: null,
});
const organizationNeedsSave = computed(() => organizationDirty.value || organizationTypeBackfillRequired.value);
const hasUnsavedChanges = computed(() => organizationNeedsSave.value || siteDirty.value);
const organizationCanSave = computed(() => organizationNeedsSave.value && !organizationSaving.value);
const siteCanSave = computed(() => siteDirty.value && !siteSaving.value);

function normalizeOrganizationType(type: string): string {
  const normalizedType = type.trim();
  return normalizedType.length > 0 ? normalizedType : DEFAULT_ORGANIZATION_TYPE;
}

function normalizeOrganizationProfile(profile: OrganizationProfileRequest | OrganizationProfileResponse): OrganizationProfileRequest {
  return {
    organizationId: profile.organizationId,
    name: profile.name,
    type: normalizeOrganizationType(profile.type),
  };
}

function hasPersistedOrganizationProfileValue(profile: OrganizationProfileRequest): boolean {
  return profile.name.trim().length > 0
    && profile.type.trim().length > 0
    && !organizationTypeBackfillRequired.value;
}

function hasSiteFoundationValue(site: SiteFoundationResponse['site']): boolean {
  return Boolean(site?.code.trim() && site?.name.trim());
}

function resolveSaveState(options: {
  saving: boolean;
  dirty: boolean;
  failed: boolean;
  hasValue: boolean;
}): FoundationSaveState {
  if (options.saving) {
    return 'saving';
  }

  if (options.failed && options.dirty) {
    return 'error';
  }

  if (options.dirty) {
    return 'dirty';
  }

  return options.hasValue ? 'saved' : 'empty';
}

const organizationStatus = computed(() => resolveSaveState({
  saving: organizationSaving.value,
  dirty: organizationNeedsSave.value,
  failed: organizationSaveFailed.value,
  hasValue: hasPersistedOrganizationProfileValue(organizationProfile.value),
}));

const siteStatus = computed(() => resolveSaveState({
  saving: siteSaving.value,
  dirty: siteDirty.value,
  failed: siteSaveFailed.value,
  hasValue: hasSiteFoundationValue(siteSetup.value.site),
}));

const internalSiteSaveErrorPatterns = [
  /duplicate key/i,
  /violat(?:es|ion)/i,
  /constraint/i,
  /postgres/i,
  /sql/i,
  /relation/i,
  /column/i,
  /row/i,
  /uuid/i,
  /null value/i,
  /foreign key/i,
  /unique constraint/i,
];

function isInternalSiteSaveErrorMessage(message: string): boolean {
  return internalSiteSaveErrorPatterns.some((pattern) => pattern.test(message));
}

function toSiteSaveErrorMessage(error: unknown): string {
  const fallback = '기준 장소 저장에 실패했습니다.';

  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.trim();
  if (!message) {
    return fallback;
  }

  console.error('[OrganizationProfileSetup] Unexpected site save error:', error);
  if (/[가-힣]/.test(message) && !isInternalSiteSaveErrorMessage(message)) {
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
    throw new Error(result.error ?? '병원 정보를 불러오지 못했습니다.');
  }

  return organizationStore.current.id;
}

async function loadFoundationSetup() {
  loading.value = true;
  loadErrorMessage.value = null;
  organizationSaveFailed.value = false;
  siteSaveFailed.value = false;

  try {
    const organizationId = await ensureOrganizationId();
    const [profile, sites] = await Promise.all([
      getOrganizationProfile(organizationId),
      getSites(organizationId),
    ]);

    organizationTypeBackfillRequired.value = profile.type.trim().length === 0;
    organizationProfile.value = normalizeOrganizationProfile(profile);
    siteSetup.value = sites;
    organizationStore.updateFoundationProfileCache(profile);
    organizationStore.updateFoundationSiteCache(sites.site);
    hasLoaded.value = true;
  } catch (error) {
    loadErrorMessage.value = error instanceof Error ? error.message : '운영 기본 설정을 불러오지 못했습니다.';
    showError(loadErrorMessage.value);
  } finally {
    loading.value = false;
  }
}

async function handleSaveOrganizationProfile(value: OrganizationProfileRequest) {
  organizationSaveFailed.value = false;
  organizationSaving.value = true;

  try {
    const saved = normalizeOrganizationProfile(await updateOrganizationProfile(normalizeOrganizationProfile(value)));
    organizationProfile.value = saved;
    organizationTypeBackfillRequired.value = false;
    organizationStore.updateFoundationProfileCache(saved);
    showSuccess('병원 정보를 저장했습니다.');
  } catch (error) {
    organizationSaveFailed.value = true;
    showError(error instanceof Error ? error.message : '병원 정보 저장에 실패했습니다.');
  } finally {
    organizationSaving.value = false;
  }
}

async function handleSaveSites(value: SiteRequest) {
  siteSaveFailed.value = false;
  siteSaving.value = true;

  try {
    const organizationId = await ensureOrganizationId();
    const saved = await updateSites({
      organizationId,
      site: value,
    });
    siteSetup.value = saved;
    organizationStore.updateFoundationSiteCache(saved.site);
    showSuccess('기준 장소를 저장했습니다.');
  } catch (error) {
    siteSaveFailed.value = true;
    showError(toSiteSaveErrorMessage(error));
  } finally {
    siteSaving.value = false;
  }
}

function handleOrganizationDirtyChange(isDirty: boolean) {
  organizationDirty.value = isDirty;
  if (!isDirty && !organizationTypeBackfillRequired.value) {
    organizationSaveFailed.value = false;
  }
}

function handleSiteDirtyChange(isDirty: boolean) {
  siteDirty.value = isDirty;
  if (!isDirty) {
    siteSaveFailed.value = false;
  }
}

function handleReturnToDashboard() {
  if (hasUnsavedChanges.value) {
    const pendingSections = [
      organizationNeedsSave.value ? '병원 정보' : null,
      siteDirty.value ? '기준 장소' : null,
    ].filter((value): value is string => value !== null);
    showInfo(`저장되지 않은 항목이 있습니다: ${pendingSections.join(', ')}. 저장 후 이동해주세요.`);
    return;
  }

  void router.push('/');
}

onMounted(() => {
  void loadFoundationSetup();
});
</script>
