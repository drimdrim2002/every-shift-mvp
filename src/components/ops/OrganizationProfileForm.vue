<template>
  <n-card>
    <div class="space-y-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">
            병원 정보
          </h2>
          <p
            data-test="organization-profile-status-message"
            class="mt-1 text-sm text-gray-500"
          >
            {{ statusDescription }}
          </p>
        </div>
        <span
          data-test="organization-profile-status-badge"
          :class="statusBadgeClass"
          class="rounded-full px-3 py-1 text-xs font-medium"
        >
          {{ statusLabel }}
        </span>
      </div>

      <n-form
        :model="localValue"
        label-placement="top"
      >
        <n-form-item label="병원명">
          <n-input
            v-model:value="localValue.name"
            placeholder="병원명을 입력하세요"
            :disabled="saving"
          />
        </n-form-item>

        <div class="flex justify-end">
          <n-button
            type="primary"
            :loading="saving"
            :disabled="!canSave"
            @click="saveOrganizationProfile"
          >
            병원 정보 저장
          </n-button>
        </div>
      </n-form>
    </div>
  </n-card>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { NButton, NCard, NForm, NFormItem, NInput } from 'naive-ui';
import type { FoundationSaveState, OrganizationProfileRequest } from '@/types/ops';

const props = withDefaults(defineProps<{
  modelValue: OrganizationProfileRequest;
  saving?: boolean;
  status: FoundationSaveState;
  canSave?: boolean;
}>(), {
  saving: false,
  canSave: false,
});

const emit = defineEmits<{
  save: [value: OrganizationProfileRequest];
  'dirty-change': [value: boolean];
}>();

const localValue = reactive<OrganizationProfileRequest>({
  organizationId: props.modelValue.organizationId,
  name: props.modelValue.name,
  type: props.modelValue.type,
});

const pristineValue = reactive<OrganizationProfileRequest>({
  organizationId: props.modelValue.organizationId,
  name: props.modelValue.name,
  type: props.modelValue.type,
});

function syncFromProps(value: OrganizationProfileRequest) {
  localValue.organizationId = value.organizationId;
  localValue.name = value.name;
  localValue.type = value.type;

  pristineValue.organizationId = value.organizationId;
  pristineValue.name = value.name;
  pristineValue.type = value.type;
}

function normalize(value: string) {
  return value.trim();
}

function saveOrganizationProfile() {
  if (props.saving || !props.canSave) {
    return;
  }

  emit('save', {
    organizationId: normalize(localValue.organizationId),
    name: normalize(localValue.name),
    type: normalize(localValue.type),
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

const isDirty = computed(() => {
  return normalize(localValue.organizationId) !== normalize(pristineValue.organizationId)
    || normalize(localValue.name) !== normalize(pristineValue.name)
    || normalize(localValue.type) !== normalize(pristineValue.type);
});

watch(
  () => props.modelValue,
  syncFromProps,
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
