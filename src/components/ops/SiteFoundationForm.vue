<template>
  <n-card>
    <div class="space-y-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">
            근무표 기준 장소
          </h2>
          <p
            data-test="site-foundation-status-message"
            class="mt-1 text-sm text-gray-500"
          >
            {{ statusDescription }}
          </p>
        </div>
        <span
          data-test="site-foundation-status-badge"
          :class="statusBadgeClass"
          class="rounded-full px-3 py-1 text-xs font-medium"
        >
          {{ statusLabel }}
        </span>
      </div>

      <p class="text-sm text-gray-500">
        현재는 근무표 기준으로 사용할 장소 1곳만 설정합니다.
      </p>

      <div class="rounded border border-gray-200 p-4">
        <div class="grid gap-4 md:grid-cols-2">
          <n-form-item label="장소 코드">
            <n-input
              v-model:value="localSite.code"
              placeholder="MAIN"
              :disabled="saving"
            />
            <p class="mt-2 text-xs text-gray-500">
              예: MAIN, ER, ICU. 내부 구분용 코드입니다.
            </p>
          </n-form-item>
          <n-form-item label="장소 이름">
            <n-input
              v-model:value="localSite.name"
              placeholder="본관"
              :disabled="saving"
            />
          </n-form-item>
        </div>
      </div>

      <div class="flex justify-end">
        <n-button
          type="primary"
          :loading="saving"
          :disabled="!canSave"
          @click="saveSites"
        >
          기준 장소 저장
        </n-button>
      </div>
    </div>
  </n-card>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { NButton, NCard, NFormItem, NInput } from 'naive-ui';
import type { FoundationSaveState, SiteRequest, SiteResponse } from '@/types/ops';

const props = withDefaults(defineProps<{
  modelValue: SiteResponse | null;
  saving?: boolean;
  status: FoundationSaveState;
  canSave?: boolean;
}>(), {
  saving: false,
  canSave: false,
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
  if (props.saving || !props.canSave) {
    return;
  }

  emit('save', {
    code: localSite.code.trim(),
    name: localSite.name.trim(),
  });
}

const statusMeta = computed(() => {
  const map: Record<FoundationSaveState, { label: string; description: string; badgeClass: string }> = {
    empty: {
      label: '입력 필요',
      description: '이 항목은 아직 저장되지 않았습니다.',
      badgeClass: 'bg-slate-100 text-slate-700',
    },
    dirty: {
      label: '저장 전',
      description: '수정한 내용이 아직 저장되지 않았습니다.',
      badgeClass: 'bg-amber-50 text-amber-700',
    },
    saving: {
      label: '저장 중',
      description: '입력한 내용을 저장하고 있습니다.',
      badgeClass: 'bg-blue-50 text-blue-700',
    },
    saved: {
      label: '저장 완료',
      description: '현재 화면의 값이 저장되어 있습니다.',
      badgeClass: 'bg-emerald-50 text-emerald-700',
    },
    error: {
      label: '저장 실패',
      description: '저장에 실패했습니다. 내용을 확인한 뒤 다시 저장해주세요.',
      badgeClass: 'bg-rose-50 text-rose-700',
    },
  };

  return map[props.status];
});

const statusLabel = computed(() => statusMeta.value.label);
const statusDescription = computed(() => statusMeta.value.description);
const statusBadgeClass = computed(() => statusMeta.value.badgeClass);

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
