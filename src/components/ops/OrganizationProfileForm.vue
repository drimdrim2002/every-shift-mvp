<template>
  <n-card title="조직 기본 정보">
    <n-form
      :model="localValue"
      label-placement="top"
    >
      <n-form-item label="조직명">
        <n-input
          v-model:value="localValue.name"
          placeholder="조직명을 입력하세요"
        />
      </n-form-item>
      <n-form-item label="조직 유형">
        <n-input
          v-model:value="localValue.type"
          placeholder="hospital"
        />
      </n-form-item>
      <div class="flex justify-end">
        <n-button
          type="primary"
          :loading="saving"
          @click="emit('save', { ...localValue })"
        >
          조직 정보 저장
        </n-button>
      </div>
    </n-form>
  </n-card>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { NButton, NCard, NForm, NFormItem, NInput } from 'naive-ui';
import type { OrganizationProfileRequest } from '@/types/ops';

const props = defineProps<{
  modelValue: OrganizationProfileRequest;
  saving?: boolean;
}>();

const emit = defineEmits<{
  save: [value: OrganizationProfileRequest];
  'dirty-change': [value: boolean];
}>();

const localValue = reactive<OrganizationProfileRequest>({
  organizationId: props.modelValue.organizationId,
  name: props.modelValue.name,
  type: props.modelValue.type,
});

function syncFromProps(value: OrganizationProfileRequest) {
  localValue.organizationId = value.organizationId;
  localValue.name = value.name;
  localValue.type = value.type;
}

function normalize(value: string) {
  return value.trim();
}

const isDirty = computed(() => {
  const modelValue = props.modelValue;

  return normalize(localValue.organizationId) !== normalize(modelValue.organizationId)
    || normalize(localValue.name) !== normalize(modelValue.name)
    || normalize(localValue.type) !== normalize(modelValue.type);
});

watch(
  () => props.modelValue,
  syncFromProps,
  { immediate: true }
);

watch(
  isDirty,
  (value, previous) => {
    if (previous === undefined || value === previous) {
      return;
    }

    emit('dirty-change', value);
  },
  { immediate: true }
);
</script>
