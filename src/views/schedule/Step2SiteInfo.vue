<template>
  <div class="mx-auto max-w-7xl">
    <StepIndicator :current-step="2" />

    <n-card title="근무표 생성 - 사이트 정보 설정">
      <p class="mb-4">
        {{ scheduleStore.basicInfo?.month }} 필요 인력 ({{ daysInMonth.length }}일)
      </p>

      <div class="overflow-x-auto">
        <table class="w-full border-collapse border border-gray-300">
          <thead>
            <!-- Level 1: 월 이름 -->
            <tr>
              <th
                rowspan="3"
                class="border border-gray-300 bg-gray-50 px-4 py-2"
              >
                시프트
              </th>
              <th
                :colspan="daysInMonth.length"
                class="border border-gray-300 bg-gray-100 px-4 py-2 text-center"
              >
                {{ monthName }}
              </th>
            </tr>
            <!-- Level 2: 날짜 -->
            <tr>
              <th
                v-for="day in daysInMonth"
                :key="day.date"
                class="border border-gray-300 bg-gray-50 px-2 py-1 text-center text-sm"
              >
                {{ day.day }}일
              </th>
            </tr>
            <!-- Level 3: 요일 -->
            <tr>
              <th
                v-for="day in daysInMonth"
                :key="day.date"
                class="border border-gray-300 bg-gray-50 px-2 py-1 text-center text-xs"
              >
                ({{ day.dayName }})
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- Total 행 -->
            <tr>
              <td class="border border-gray-300 px-4 py-2 font-bold">
                Total
              </td>
              <td
                v-for="day in daysInMonth"
                :key="day.date"
                class="border border-gray-300 px-2 py-1 text-center"
              >
                {{ requirements[day.date]?.total || 0 }}
              </td>
            </tr>
            <!-- D, E, N 행 -->
            <tr
              v-for="shift in ['D', 'E', 'N']"
              :key="shift"
            >
              <td class="border border-gray-300 px-4 py-2 font-semibold">
                {{ shift }}
              </td>
              <td
                v-for="day in daysInMonth"
                :key="day.date"
                class="border border-gray-300 px-2 py-1 text-center"
              >
                <input
                  type="number"
                  :value="(requirements[day.date] as any)?.[shift] || 0"
                  min="0"
                  class="w-full border-none text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  @change="handleCellChange(day.date, shift, $event)"
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <n-alert
        type="info"
        class="mt-4"
      >
        셀을 클릭하여 필요 인력 수를 수정할 수 있습니다
      </n-alert>

      <!-- 버튼 -->
      <div class="flex justify-between pt-4">
        <n-button @click="handlePrev">
          ← 이전
        </n-button>
        <n-button
          type="primary"
          @click="handleNext"
        >
          다음 단계 →
        </n-button>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { NCard, NButton, NAlert } from 'naive-ui';
import StepIndicator from '@/components/schedule/StepIndicator.vue';
import { useScheduleStore } from '@/stores/schedule';
import { useSiteRequirements } from '@/composables/useSiteRequirements';
import { getDaysInMonth } from '@/utils/date';
import dayjs from 'dayjs';

const router = useRouter();
const scheduleStore = useScheduleStore();
const { requirements, loadRequirements, updateRequirement } = useSiteRequirements();

const daysInMonth = computed(() => {
  if (!scheduleStore.basicInfo?.month) return [];
  return getDaysInMonth(scheduleStore.basicInfo.month);
});

const monthName = computed(() => {
  if (!scheduleStore.basicInfo?.month) return '';
  return dayjs(scheduleStore.basicInfo.month + '-01').format('YYYY년 MM월');
});

onMounted(async () => {
  if (!scheduleStore.basicInfo) {
    router.push('/schedule/step1');
    return;
  }

  // 사이트 요구사항 로드
  await loadRequirements(
    scheduleStore.basicInfo.organizationId,
    scheduleStore.basicInfo.month
  );
});

function handleCellChange(date: string, shiftCode: string, event: Event) {
  const input = event.target as HTMLInputElement;
  const value = parseInt(input.value) || 0;
  updateRequirement(date, shiftCode, value);
}

function handlePrev() {
  scheduleStore.prevStep();
  router.push('/schedule/step1');
}

function handleNext() {
  scheduleStore.setSiteRequirements(requirements.value);
  scheduleStore.nextStep();
  router.push('/schedule/step3');
}
</script>
