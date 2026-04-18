<template>
  <div class="flex min-w-[220px] flex-col gap-1">
    <div class="flex items-center justify-between gap-3 text-xs text-slate-500">
      <span>선택한 조직</span>
      <span
        v-if="currentOrganizationLabel"
        class="max-w-[140px] truncate text-right text-slate-600"
      >
        {{ currentOrganizationLabel }}
      </span>
    </div>

    <n-select
      data-test="organization-switcher"
      size="small"
      :value="rbacStore.selectedOrganizationId"
      :options="selectOptions"
      :disabled="isDisabled"
      :placeholder="placeholder"
      @update:value="handleSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NSelect } from 'naive-ui'
import { useRbacStore } from '@/stores/rbac'

const rbacStore = useRbacStore()

const selectOptions = computed(() =>
  rbacStore.organizationOptions.map((option) => ({
    label:
      option.membershipRole === 'admin'
        ? `${option.name} (관리자)`
        : option.name,
    value: option.id,
  })),
)

const currentOrganizationLabel = computed(
  () =>
    rbacStore.organizationOptions.find(
      (option) => option.id === rbacStore.selectedOrganizationId,
    )?.name ?? null,
)

const isDisabled = computed(() => selectOptions.value.length <= 1)

const placeholder = computed(() =>
  selectOptions.value.length === 0 ? '선택 가능한 조직 없음' : '조직을 선택하세요',
)

function handleSelect(value: string | null) {
  if (isDisabled.value || value === rbacStore.selectedOrganizationId) {
    return
  }

  void rbacStore.selectOrganization(value)
}
</script>
