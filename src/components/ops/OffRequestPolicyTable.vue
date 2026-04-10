<template>
  <n-card title="Off 요청 정책">
    <div class="space-y-8">
      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base font-semibold text-gray-800">
              조직별 rank 코드
            </h2>
            <p class="text-sm text-gray-500">
              신규 직원이나 기본 정책과 연결할 rank 코드 목록입니다.
            </p>
          </div>
          <n-button @click="addRankCode">
            rank 코드 추가
          </n-button>
        </div>

        <div class="overflow-hidden rounded-lg border border-gray-200">
          <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="bg-gray-50 text-left text-gray-600">
              <tr>
                <th class="px-3 py-2">
                  코드
                </th>
                <th class="px-3 py-2">
                  라벨
                </th>
                <th class="w-24 px-3 py-2">
                  표시 순서
                </th>
                <th class="w-24 px-3 py-2">
                  사용
                </th>
                <th class="w-20 px-3 py-2" />
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 bg-white">
              <tr
                v-for="(rankCode, index) in localRankCodes"
                :key="rankCode.id ?? `${rankCode.code}-${index}`"
              >
                <td class="px-3 py-2">
                  <n-input
                    v-model:value="rankCode.code"
                    placeholder="RN"
                  />
                </td>
                <td class="px-3 py-2">
                  <n-input
                    v-model:value="rankCode.label"
                    placeholder="Registered Nurse"
                  />
                </td>
                <td class="px-3 py-2">
                  <n-input-number
                    v-model:value="rankCode.displayOrder"
                    :min="0"
                    class="w-full"
                  />
                </td>
                <td class="px-3 py-2">
                  <n-switch v-model:value="rankCode.isActive" />
                </td>
                <td class="px-3 py-2 text-right">
                  <n-button
                    quaternary
                    size="small"
                    @click="removeRankCode(index)"
                  >
                    삭제
                  </n-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base font-semibold text-gray-800">
              정책 규칙
            </h2>
            <p class="text-sm text-gray-500">
              rank 코드가 없으면 조직 기본 정책이 적용됩니다.
            </p>
          </div>
          <n-button @click="addPolicyRule">
            정책 규칙 추가
          </n-button>
        </div>

        <div class="overflow-hidden rounded-lg border border-gray-200">
          <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="bg-gray-50 text-left text-gray-600">
              <tr>
                <th class="px-3 py-2">
                  대상 rank
                </th>
                <th class="w-32 px-3 py-2">
                  기간
                </th>
                <th class="w-28 px-3 py-2">
                  제한 횟수
                </th>
                <th class="w-24 px-3 py-2">
                  사용
                </th>
                <th class="w-20 px-3 py-2" />
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 bg-white">
              <tr
                v-for="(rule, index) in localPolicyRules"
                :key="rule.id ?? `${rule.periodType}-${rule.rankCode ?? 'default'}-${index}`"
              >
                <td class="px-3 py-2">
                  <n-select
                    v-model:value="rule.rankCode"
                    :options="rankOptions"
                    clearable
                    placeholder="조직 기본"
                  />
                </td>
                <td class="px-3 py-2">
                  <n-select
                    v-model:value="rule.periodType"
                    :options="periodOptions"
                  />
                </td>
                <td class="px-3 py-2">
                  <n-input-number
                    v-model:value="rule.limitCount"
                    :min="0"
                    class="w-full"
                  />
                </td>
                <td class="px-3 py-2">
                  <n-switch v-model:value="rule.isActive" />
                </td>
                <td class="px-3 py-2 text-right">
                  <n-button
                    quaternary
                    size="small"
                    @click="removePolicyRule(index)"
                  >
                    삭제
                  </n-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="flex items-center justify-between border-t border-gray-200 pt-4">
        <p class="text-sm text-gray-500">
          저장하면 rank 코드와 정책 규칙이 함께 갱신됩니다.
        </p>
        <n-button
          type="primary"
          :loading="saving"
          @click="emitSave"
        >
          정책 저장
        </n-button>
      </div>
    </div>
  </n-card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { NButton, NCard, NInput, NInputNumber, NSelect, NSwitch } from 'naive-ui';
import type {
  OffRequestPolicyPeriodType,
  OffRequestPolicySetupRequest,
  OffRequestPolicySetupResponse,
} from '@/types/ops';

type RankCodeDraft = {
  id?: string;
  code: string;
  label: string;
  displayOrder: number;
  isActive: boolean;
};

type PolicyRuleDraft = {
  id?: string;
  rankCode: string | null;
  periodType: OffRequestPolicyPeriodType;
  limitCount: number;
  isActive: boolean;
};

const props = defineProps<{
  modelValue: OffRequestPolicySetupResponse;
  saving?: boolean;
}>();

const emit = defineEmits<{
  save: [value: OffRequestPolicySetupRequest];
}>();

const localRankCodes = ref<RankCodeDraft[]>([]);
const localPolicyRules = ref<PolicyRuleDraft[]>([]);

const periodOptions = [
  { label: '월간', value: 'monthly' },
  { label: '연간', value: 'annual' },
];

const rankOptions = computed(() =>
  localRankCodes.value
    .filter((rankCode) => rankCode.isActive)
    .map((rankCode) => ({
      label: `${rankCode.code} · ${rankCode.label}`,
      value: rankCode.code,
    }))
);

function createEmptyRankCode(): RankCodeDraft {
  return {
    code: '',
    label: '',
    displayOrder: localRankCodes.value.length + 1,
    isActive: true,
  };
}

function createEmptyPolicyRule(): PolicyRuleDraft {
  return {
    rankCode: null,
    periodType: 'monthly',
    limitCount: 4,
    isActive: true,
  };
}

function syncModel(value: OffRequestPolicySetupResponse) {
  localRankCodes.value = value.rankCodes.length > 0
    ? value.rankCodes.map((rankCode) => ({ ...rankCode }))
    : [createEmptyRankCode()];

  localPolicyRules.value = value.policyRules.length > 0
    ? value.policyRules.map((rule) => ({ ...rule }))
    : [createEmptyPolicyRule()];
}

function addRankCode() {
  localRankCodes.value = [...localRankCodes.value, createEmptyRankCode()];
}

function removeRankCode(index: number) {
  localRankCodes.value = localRankCodes.value.filter((_, currentIndex) => currentIndex !== index);
}

function addPolicyRule() {
  localPolicyRules.value = [...localPolicyRules.value, createEmptyPolicyRule()];
}

function removePolicyRule(index: number) {
  localPolicyRules.value = localPolicyRules.value.filter((_, currentIndex) => currentIndex !== index);
}

function emitSave() {
  emit('save', {
    organizationId: props.modelValue.organizationId,
    rankCodes: localRankCodes.value.map((rankCode) => ({
      id: rankCode.id,
      code: rankCode.code.trim(),
      label: rankCode.label.trim(),
      displayOrder: rankCode.displayOrder,
      isActive: rankCode.isActive,
    })),
    policyRules: localPolicyRules.value.map((rule) => ({
      id: rule.id,
      rankCode: rule.rankCode,
      periodType: rule.periodType,
      limitCount: rule.limitCount,
      isActive: rule.isActive,
    })),
  });
}

watch(
  () => props.modelValue,
  (value) => {
    syncModel(value);
  },
  { deep: true, immediate: true }
);
</script>
