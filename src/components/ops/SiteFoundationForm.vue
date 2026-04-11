<template>
  <n-card title="사이트 목록">
    <div class="space-y-4">
      <p class="text-sm text-gray-500">
        여러 사이트를 등록할 수 있지만, 현재 스케줄 생성에는 1개 사이트만 사용합니다.
      </p>

      <div
        v-for="site in localSites"
        :key="site.draftKey"
        class="rounded border border-gray-200 p-4"
      >
        <div class="grid gap-4 md:grid-cols-2">
          <n-form-item label="사이트 코드">
            <n-input
              v-model:value="site.code"
              placeholder="MAIN"
            />
          </n-form-item>
          <n-form-item label="사이트 이름">
            <n-input
              v-model:value="site.name"
              placeholder="본관"
            />
          </n-form-item>
          <n-form-item label="사용 중">
            <n-checkbox v-model:checked="site.isActive">
              사용 중
            </n-checkbox>
          </n-form-item>
        </div>
      </div>

      <div class="rounded border border-gray-200 p-4">
        <div class="space-y-2">
          <div>
            <h3 class="text-base font-medium text-gray-900">
              현재 스케줄 생성 대상
            </h3>
            <p
              v-if="scheduleTargetLocked"
              class="mt-1 text-sm text-amber-700"
            >
              현재 버전에서는 최초 설정한 스케줄 대상 사이트를 변경할 수 없습니다.
            </p>
          </div>

          <n-radio-group
            v-model:value="selectedDraftKey"
            :disabled="scheduleTargetLocked"
            class="space-y-2"
          >
            <div
              v-for="site in localSites"
              :key="site.draftKey"
              class="flex items-center gap-3"
            >
              <n-radio
                :value="site.draftKey"
                :disabled="scheduleTargetLocked"
              >
                {{ site.name || site.code || '새 사이트' }}
              </n-radio>
            </div>
          </n-radio-group>
        </div>
      </div>

      <div class="flex items-center justify-between">
        <n-button @click="addSite">
          사이트 추가
        </n-button>
        <n-button
          type="primary"
          :loading="saving"
          @click="saveSites"
        >
          사이트 설정 저장
        </n-button>
      </div>
    </div>
  </n-card>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { NButton, NCard, NCheckbox, NFormItem, NInput, NRadio, NRadioGroup } from 'naive-ui';
import type { SiteRequest, SiteResponse } from '@/types/ops';

type SiteDraft = SiteRequest & {
  id?: string;
  organizationId?: string;
  draftKey: string;
};

const props = withDefaults(defineProps<{
  modelValue: SiteResponse[];
  pilotSiteId?: string | null;
  scheduleTargetLocked?: boolean;
  saving?: boolean;
}>(), {
  pilotSiteId: null,
  scheduleTargetLocked: false,
  saving: false,
});

const emit = defineEmits<{
  save: [value: SiteRequest[]];
}>();

const localSites = ref<SiteDraft[]>([]);
const selectedDraftKey = ref<string | null>(null);
let draftKeySeed = 0;

function createDraftKey() {
  draftKeySeed += 1;
  return `site-${draftKeySeed}`;
}

function createEmptySite(): SiteDraft {
  return {
    draftKey: createDraftKey(),
    code: '',
    name: '',
    isActive: true,
    isScheduleActive: false,
  };
}

function getPilotDraftKey(sites: SiteDraft[]) {
  return props.pilotSiteId
    ? sites.find((site) => site.id === props.pilotSiteId)?.draftKey ?? null
    : null;
}

function resolveSelectedDraftKey(sites: SiteDraft[]) {
  const pilotDraftKey = getPilotDraftKey(sites);

  if (props.scheduleTargetLocked) {
    selectedDraftKey.value = pilotDraftKey;
    return;
  }

  const activeDraftKey = sites.find((site) => site.isScheduleActive)?.draftKey ?? null;
  const currentDraftKey = selectedDraftKey.value && sites.some((site) => site.draftKey === selectedDraftKey.value)
    ? selectedDraftKey.value
    : null;

  selectedDraftKey.value = pilotDraftKey ?? currentDraftKey ?? activeDraftKey ?? sites[0]?.draftKey ?? null;
}

function syncSites(sites: SiteResponse[]) {
  localSites.value = sites.length > 0
    ? sites.map((site) => ({
        ...site,
        draftKey: site.id ?? createDraftKey(),
      }))
    : [createEmptySite()];

  resolveSelectedDraftKey(localSites.value);
}

function addSite() {
  const newSite = {
    ...createEmptySite(),
    isScheduleActive: false,
  };

  localSites.value = [...localSites.value, newSite];

  if (!props.scheduleTargetLocked && selectedDraftKey.value === null) {
    selectedDraftKey.value = newSite.draftKey;
  }
}

function saveSites() {
  const targetDraftKey = props.scheduleTargetLocked ? getPilotDraftKey(localSites.value) : selectedDraftKey.value;

  emit(
    'save',
    localSites.value.map((site) => ({
      code: site.code,
      name: site.name,
      isActive: site.isActive,
      isScheduleActive: site.draftKey === targetDraftKey,
    }))
  );
}

watch(
  () => props.modelValue,
  syncSites,
  { immediate: true }
);

watch(
  () => [props.pilotSiteId, props.scheduleTargetLocked],
  () => {
    resolveSelectedDraftKey(localSites.value);
  }
);
</script>
