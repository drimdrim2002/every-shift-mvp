<template>
  <n-card title="Off 사용 기준">
    <div class="space-y-8">
      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base font-semibold text-gray-800">
              직급 구분
            </h2>
            <p class="text-sm text-gray-500">
              직급별로 다른 기준을 적용하려면 직급 구분을 등록하세요.
            </p>
          </div>
          <n-button @click="addRankCode">
            직급 구분 추가
          </n-button>
        </div>

        <div class="overflow-hidden rounded-lg border border-gray-200">
          <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="bg-gray-50 text-left text-gray-600">
              <tr>
                <th class="px-3 py-2">
                  직급 코드
                </th>
                <th class="px-3 py-2">
                  직급명
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
                :key="rankCode.draftKey"
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
                    placeholder="일반 간호사"
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
              Off 사용 기준
            </h2>
            <p class="text-sm text-gray-500">
              직급을 선택하면 해당 직급에만 적용되고, 비워두면 공통 기준으로 적용됩니다.
            </p>
          </div>
          <n-button @click="addPolicyRule">
            기준 추가
          </n-button>
        </div>

        <div class="overflow-hidden rounded-lg border border-gray-200">
          <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="bg-gray-50 text-left text-gray-600">
              <tr>
                <th class="px-3 py-2">
                  적용 대상
                </th>
                <th class="w-32 px-3 py-2">
                  기간
                </th>
                <th class="w-28 px-3 py-2">
                  허용 횟수
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
                :key="rule.draftKey"
              >
                <td class="px-3 py-2">
                  <n-select
                    v-model:value="rule.rankCode"
                    :options="rankOptions"
                    clearable
                    placeholder="공통 기준"
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
          저장하면 직급 구분과 Off 사용 기준이 함께 업데이트됩니다.
        </p>
        <n-button
          type="primary"
          :loading="saving"
          @click="emitSave"
        >
          기준 저장
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
  draftKey: string;
  id?: string;
  code: string;
  label: string;
  displayOrder: number;
  isActive: boolean;
};

type PolicyRuleDraft = {
  draftKey: string;
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
let draftKeySeed = 0;

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
    draftKey: createDraftKey('rank'),
    code: '',
    label: '',
    displayOrder: localRankCodes.value.length + 1,
    isActive: true,
  };
}

function createEmptyPolicyRule(): PolicyRuleDraft {
  return {
    draftKey: createDraftKey('policy'),
    rankCode: null,
    periodType: 'monthly',
    limitCount: 4,
    isActive: true,
  };
}

function createDraftKey(prefix: 'rank' | 'policy') {
  draftKeySeed += 1;
  return `${prefix}-${draftKeySeed}`;
}

function createDefaultPolicyRules(): PolicyRuleDraft[] {
  return [
    {
      draftKey: createDraftKey('policy'),
      rankCode: null,
      periodType: 'annual',
      limitCount: 16,
      isActive: true,
    },
    {
      draftKey: createDraftKey('policy'),
      rankCode: null,
      periodType: 'monthly',
      limitCount: 4,
      isActive: true,
    },
  ];
}

function syncModel(value: OffRequestPolicySetupResponse) {
  localRankCodes.value = value.rankCodes.length > 0
    ? value.rankCodes.map((rankCode) => ({
        ...rankCode,
        draftKey: rankCode.id ?? createDraftKey('rank'),
      }))
    : [createEmptyRankCode()];

  localPolicyRules.value = value.policyRules.length > 0
    ? value.policyRules.map((rule) => ({
        ...rule,
        draftKey: rule.id ?? createDraftKey('policy'),
      }))
    : createDefaultPolicyRules();
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
    rankCodes: localRankCodes.value
      .map((rankCode) => ({
        id: rankCode.id,
        code: rankCode.code.trim(),
        label: rankCode.label.trim(),
        displayOrder: rankCode.displayOrder,
        isActive: rankCode.isActive,
      }))
      .filter((rankCode) => rankCode.code.length > 0 || rankCode.label.length > 0),
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
  syncModel,
  { immediate: true }
);
</script>
