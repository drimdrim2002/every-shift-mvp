<template>
  <div class="space-y-2">
    <div
      ref="hospitalSearchFieldRef"
      class="flex w-full gap-2"
    >
      <n-button
        data-test="signup-search"
        secondary
        :disabled="!canSearchHospital"
        :loading="hospitalLoading"
        @click="handleHospitalSearch"
      >
        검색
      </n-button>
    </div>
    <p
      class="text-xs text-gray-500"
      data-test="signup-hospital-search-source"
    >
      검색 출처: 공공데이터포털(data.go.kr)
    </p>

    <n-alert
      type="info"
      class="mb-2"
      data-test="signup-manual-hospital-info"
    >
      병원명은 검색 결과에서 선택하거나 직접 입력할 수 있습니다.
    </n-alert>

    <n-form-item label="검색 결과에서 선택 (선택사항)">
      <n-select
        :value="hospitalId"
        data-test="signup-hospital-select"
        :options="hospitalOptions"
        :loading="hospitalLoading"
        placeholder="검색 결과를 선택하면 병원명이 자동 입력됩니다"
        filterable
        clearable
        @update:value="handleHospitalSelect"
      />
    </n-form-item>

    <n-alert
      v-if="hospitalSearchFeedback?.type === 'empty'"
      type="warning"
      class="mb-2"
      data-test="signup-manual-hospital-empty"
    >
      '{{ hospitalSearchFeedback.keyword }}' 검색 결과가 없습니다. 입력한 병원명으로 가입을 계속 진행할 수 있습니다.
    </n-alert>

    <n-alert
      v-else-if="hospitalSearchFeedback?.type === 'error'"
      type="warning"
      class="mb-2"
      data-test="signup-manual-hospital-error"
    >
      병원 검색이 원활하지 않습니다. 병원명을 직접 입력해 가입을 계속 진행할 수 있습니다.
    </n-alert>
  </div>
</template>

<script setup lang="ts">
import { NAlert, NButton, NFormItem, NSelect } from 'naive-ui'
import { useHospitalSearch } from '@/composables/useHospitalSearch'

const hospitalName = defineModel<string>('hospitalName', { required: true })
const hospitalId = defineModel<string | null>('hospitalId', { required: true })

const {
  hospitalSearchFieldRef,
  hospitalLoading,
  hospitalOptions,
  hospitalSearchFeedback,
  canSearchHospital,
  handleHospitalSelect,
  handleHospitalSearch,
  resetHospitalSearchState,
} = useHospitalSearch({
  hospitalName,
  hospitalId,
})

defineExpose({
  handleHospitalSearch,
  resetHospitalSearchState,
})
</script>
