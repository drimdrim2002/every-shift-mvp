<template>
  <AppContainer class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">
          Off 사용 기준 설정
        </h1>
        <p class="mt-1 text-sm text-gray-500">
          직급별로 Off 사용 가능 횟수를 관리합니다.
        </p>
      </div>

      <div class="flex gap-2">
        <n-button @click="router.push(getOpsOrganizationSetupRoutePath())">
          조직 설정
        </n-button>
        <n-button @click="router.push(getAppHomeRoutePath())">
          대시보드로 돌아가기
        </n-button>
      </div>
    </div>

    <n-alert
      v-if="loadErrorMessage"
      type="error"
    >
      <template #header>
        Off 사용 기준을 불러오지 못했습니다
      </template>
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm">
          {{ loadErrorMessage }}
        </p>
        <n-button
          size="small"
          :loading="loading"
          @click="loadPolicySetup"
        >
          다시 시도
        </n-button>
      </div>
    </n-alert>

    <OffRequestPolicyTable
      v-if="policySetup.organizationId"
      :model-value="policySetup"
      :saving="saving"
      @save="handleSave"
    />

    <n-spin
      v-else
      :show="loading"
    >
      <n-card class="text-sm text-gray-500">
        Off 사용 기준을 불러오는 중입니다.
      </n-card>
    </n-spin>
  </AppContainer>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NAlert, NButton, NCard, NSpin } from 'naive-ui';
import AppContainer from '@/components/layout/AppContainer.vue';
import OffRequestPolicyTable from '@/components/ops/OffRequestPolicyTable.vue';
import { getOffRequestPolicies, updateOffRequestPolicies } from '@/api/ops';
import { useOrganizationStore } from '@/stores/organization';
import type { OffRequestPolicySetupRequest, OffRequestPolicySetupResponse } from '@/types/ops';
import { showError, showSuccess } from '@/utils/message';
import { getAppHomeRoutePath, getOpsOrganizationSetupRoutePath } from '@/constants/routes';

const router = useRouter();
const organizationStore = useOrganizationStore();

const loading = ref(false);
const saving = ref(false);
const loadErrorMessage = ref<string | null>(null);
const policySetup = ref<OffRequestPolicySetupResponse>({
  organizationId: '',
  rankCodes: [],
  policyRules: [],
});

async function ensureOrganizationId(): Promise<string> {
  if (organizationStore.current?.id) {
    return organizationStore.current.id;
  }

  const result = await organizationStore.loadOrganization();
  if (!result.success || !organizationStore.current?.id) {
    throw new Error(result.error ?? '조직 정보를 불러오지 못했습니다.');
  }

  return organizationStore.current.id;
}

async function loadPolicySetup() {
  loading.value = true;
  loadErrorMessage.value = null;

  try {
    const organizationId = await ensureOrganizationId();
    policySetup.value = await getOffRequestPolicies(organizationId);
  } catch (error) {
    loadErrorMessage.value = error instanceof Error ? error.message : 'Off 사용 기준을 불러오지 못했습니다.';
    showError(loadErrorMessage.value);
  } finally {
    loading.value = false;
  }
}

async function handleSave(value: OffRequestPolicySetupRequest) {
  saving.value = true;

  try {
    const saved = await updateOffRequestPolicies(value);
    policySetup.value = saved;
    showSuccess('Off 사용 기준을 저장했습니다.');
  } catch (error) {
    showError(error instanceof Error ? error.message : 'Off 사용 기준 저장에 실패했습니다.');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void loadPolicySetup();
});
</script>
