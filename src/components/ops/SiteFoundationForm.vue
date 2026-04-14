<template>
  <n-card title="파일럿 사이트 설정">
    <div class="space-y-4">
      <p class="text-sm text-gray-500">
        현재 제품에서는 스케줄 생성에 사용할 파일럿 사이트 1개만 설정합니다.
      </p>

      <div class="rounded border border-gray-200 p-4">
        <div class="grid gap-4 md:grid-cols-2">
          <n-form-item label="사이트 코드">
            <n-input
              v-model:value="localSite.code"
              placeholder="MAIN"
            />
          </n-form-item>
          <n-form-item label="사이트 이름">
            <n-input
              v-model:value="localSite.name"
              placeholder="본관"
            />
          </n-form-item>
        </div>
      </div>

      <div class="flex justify-end">
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
import { computed, reactive, watch } from 'vue';
import { NButton, NCard, NFormItem, NInput } from 'naive-ui';
import type { SiteRequest, SiteResponse } from '@/types/ops';

const props = withDefaults(defineProps<{
  modelValue: SiteResponse | null;
  saving?: boolean;
}>(), {
  saving: false,
});

const emit = defineEmits<{
  save: [value: SiteRequest];
  'dirty-change': [value: boolean];
}>();

const localSite = reactive<SiteRequest>({
  code: '',
  name: '',
});

const pristineSite = reactive<SiteRequest>({
  code: '',
  name: '',
});

function syncSite(site: SiteResponse | null) {
  localSite.code = site?.code ?? '';
  localSite.name = site?.name ?? '';

  pristineSite.code = site?.code ?? '';
  pristineSite.name = site?.name ?? '';
}

function normalize(value: string) {
  return value.trim();
}

const isDirty = computed(() => {
  return normalize(localSite.code) !== normalize(pristineSite.code)
    || normalize(localSite.name) !== normalize(pristineSite.name);
});

function saveSites() {
  emit('save', {
    code: localSite.code.trim(),
    name: localSite.name.trim(),
  });
}

watch(
  () => props.modelValue,
  syncSite,
  { immediate: true }
);

watch(
  isDirty,
  (value, previous) => {
    if (value === previous) {
      return;
    }

    emit('dirty-change', value);
  },
  { immediate: true }
);
</script>
