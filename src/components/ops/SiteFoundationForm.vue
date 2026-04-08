<template>
  <n-card title="스케줄 대상 사이트">
    <div class="space-y-4">
      <div
        v-for="(site, index) in localSites"
        :key="site.id ?? `${site.code}-${index}`"
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
        </div>
        <div class="flex flex-wrap gap-4">
          <n-checkbox v-model:checked="site.isActive">
            사용 중
          </n-checkbox>
          <n-checkbox
            :checked="site.isScheduleActive"
            @update:checked="setScheduleActive(index)"
          >
            스케줄 대상 사이트
          </n-checkbox>
        </div>
      </div>

      <div class="flex items-center justify-between">
        <n-button @click="addSite">
          사이트 추가
        </n-button>
        <n-button
          type="primary"
          :loading="saving"
          @click="
            emit(
              'save',
              localSites.map((site) => ({
                code: site.code,
                name: site.name,
                isActive: site.isActive,
                isScheduleActive: site.isScheduleActive,
              }))
            )
          "
        >
          사이트 설정 저장
        </n-button>
      </div>
    </div>
  </n-card>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { NButton, NCard, NCheckbox, NFormItem, NInput } from 'naive-ui';
import type { SiteRequest, SiteResponse } from '@/types/ops';

type SiteDraft = SiteRequest & {
  id?: string;
  organizationId?: string;
};

const props = defineProps<{
  modelValue: SiteResponse[];
  saving?: boolean;
}>();

const emit = defineEmits<{
  save: [value: SiteRequest[]];
}>();

const localSites = ref<SiteDraft[]>([]);

function createEmptySite(): SiteDraft {
  return {
    code: '',
    name: '',
    isActive: true,
    isScheduleActive: localSites.value.length === 0,
  };
}

function syncSites(sites: SiteResponse[]) {
  localSites.value = sites.length > 0 ? sites.map((site) => ({ ...site })) : [createEmptySite()];
}

function addSite() {
  localSites.value = [
    ...localSites.value,
    {
      ...createEmptySite(),
      isScheduleActive: false,
    },
  ];
}

function setScheduleActive(index: number) {
  localSites.value = localSites.value.map((site, currentIndex) => ({
    ...site,
    isScheduleActive: currentIndex === index,
  }));
}

watch(
  () => props.modelValue,
  (value) => {
    syncSites(value);
  },
  { deep: true, immediate: true }
);
</script>
