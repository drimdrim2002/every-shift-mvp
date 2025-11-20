<template>
  <div class="mx-auto max-w-5xl">
    <StepIndicator :current-step="2" />

    <n-card title="근무표 생성 - 사이트 정보 설정">
      <p class="mb-4 text-gray-600">
        {{ scheduleStore.basicInfo?.month }} 요일별 필요 인력을 설정합니다
      </p>

      <div class="overflow-x-auto">
        <table class="w-full border-collapse border border-gray-300">
          <thead>
            <tr class="bg-gray-50">
              <th class="border border-gray-300 px-4 py-3 text-left font-semibold">
                요일
              </th>
              <th class="border border-gray-300 px-4 py-3 text-center font-semibold">
                D (Day)
              </th>
              <th class="border border-gray-300 px-4 py-3 text-center font-semibold">
                E (Evening)
              </th>
              <th class="border border-gray-300 px-4 py-3 text-center font-semibold">
                N (Night)
              </th>
              <th class="border border-gray-300 px-4 py-3 text-center font-semibold">
                O (Off)
              </th>
              <th class="border border-gray-300 bg-gray-100 px-4 py-3 text-center font-semibold">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="dayOfWeek in [0, 1, 2, 3, 4, 5, 6]"
              :key="dayOfWeek"
              class="hover:bg-gray-50"
            >
              <td class="border border-gray-300 px-4 py-3 font-medium">
                {{ dayNames[dayOfWeek] }}
              </td>
              <td class="border border-gray-300 p-2 text-center">
                <n-input-number
                  v-model:value="weeklyRequirements[dayOfWeek].D"
                  :min="0"
                  :show-button="false"
                  class="w-full"
                  @update:value="updateTotal(dayOfWeek)"
                />
              </td>
              <td class="border border-gray-300 p-2 text-center">
                <n-input-number
                  v-model:value="weeklyRequirements[dayOfWeek].E"
                  :min="0"
                  :show-button="false"
                  class="w-full"
                  @update:value="updateTotal(dayOfWeek)"
                />
              </td>
              <td class="border border-gray-300 p-2 text-center">
                <n-input-number
                  v-model:value="weeklyRequirements[dayOfWeek].N"
                  :min="0"
                  :show-button="false"
                  class="w-full"
                  @update:value="updateTotal(dayOfWeek)"
                />
              </td>
              <td class="border border-gray-300 p-2 text-center">
                <n-input-number
                  v-model:value="weeklyRequirements[dayOfWeek].O"
                  :min="0"
                  :show-button="false"
                  class="w-full"
                  @update:value="updateTotal(dayOfWeek)"
                />
              </td>
              <td class="border border-gray-300 bg-gray-50 px-4 py-3 text-center font-bold">
                {{ weeklyRequirements[dayOfWeek].total }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <n-alert
        type="info"
        class="mt-4"
      >
        각 요일별로 필요한 시프트별 인력 수를 입력하세요. 이 패턴이 해당 월의 모든 날짜에 적용됩니다.
      </n-alert>

      <!-- 버튼 -->
      <div class="flex justify-between pt-6">
        <n-button
          :disabled="isSaving || loading"
          @click="handlePrev"
        >
          ← 이전
        </n-button>
        <n-button
          type="primary"
          :loading="isSaving || loading"
          @click="handleNext"
        >
          다음 단계 →
        </n-button>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { NCard, NButton, NAlert, NInputNumber } from 'naive-ui';
import StepIndicator from '@/components/schedule/StepIndicator.vue';
import { useScheduleStore } from '@/stores/schedule';
import { useSiteRequirements } from '@/composables/useSiteRequirements';
import type { DailyRequirement, SiteRequirements } from '@/types/schedule';

const router = useRouter();
const scheduleStore = useScheduleStore();
const { loading, loadWeeklyRequirements, saveRequirements } = useSiteRequirements();

const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const isSaving = ref(false);

// 요일별 필요 인력 (0: 일요일 ~ 6: 토요일)
const weeklyRequirements = reactive<Record<number, DailyRequirement>>({
  0: { D: 0, E: 0, N: 0, O: 0, total: 0 },
  1: { D: 0, E: 0, N: 0, O: 0, total: 0 },
  2: { D: 0, E: 0, N: 0, O: 0, total: 0 },
  3: { D: 0, E: 0, N: 0, O: 0, total: 0 },
  4: { D: 0, E: 0, N: 0, O: 0, total: 0 },
  5: { D: 0, E: 0, N: 0, O: 0, total: 0 },
  6: { D: 0, E: 0, N: 0, O: 0, total: 0 },
});

onMounted(async () => {
  if (!scheduleStore.basicInfo) {
    router.push('/schedule/step1');
    return;
  }

  // 기존 데이터 로드
  const result = await loadWeeklyRequirements(scheduleStore.basicInfo.organizationId);

  if (result.success && result.data) {
    // 로드된 데이터로 weeklyRequirements 업데이트
    for (let i = 0; i < 7; i++) {
      Object.assign(weeklyRequirements[i], result.data[i]);
    }
  }
});

function updateTotal(dayOfWeek: number) {
  const req = weeklyRequirements[dayOfWeek];
  req.total = (req.D || 0) + (req.E || 0) + (req.N || 0) + (req.O || 0);
}

function handlePrev() {
  scheduleStore.prevStep();
  router.push('/schedule/step1');
}

async function handleNext() {
  if (!scheduleStore.basicInfo) {
    showError('기본 정보가 없습니다. 다시 시도해주세요.');
    return;
  }

  isSaving.value = true;

  try {
    // Supabase에 저장
    const result = await saveRequirements(
      weeklyRequirements,
      scheduleStore.basicInfo.organizationId
    );

    if (!result.success) {
      showError(result.error || '저장 중 오류가 발생했습니다.');
      return;
    }

    // Schedule Store 업데이트
    scheduleStore.setSiteRequirements(weeklyRequirements as unknown as SiteRequirements);
    scheduleStore.nextStep();

    // 성공 메시지 표시
    showSuccess('사이트 정보가 저장되었습니다.');

    // Step 3로 이동
    router.push('/schedule/step3');
  } catch {
    showError('저장 중 예상치 못한 오류가 발생했습니다.');
  } finally {
    isSaving.value = false;
  }
}

function showSuccess(msg: string) {
  window.$message?.success(msg);
}

function showError(msg: string) {
  window.$message?.error(msg);
}
</script>
