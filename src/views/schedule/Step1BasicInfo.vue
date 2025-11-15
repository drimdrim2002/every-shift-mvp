<template>
  <div class="mx-auto max-w-4xl">
    <StepIndicator :current-step="1" />

    <n-card title="근무표 생성 - 기본 정보 설정">
      <n-space
        vertical
        :size="24"
      >
        <!-- 계획 월 선택 -->
        <div>
          <h3 class="mb-4 text-lg font-semibold">
            계획 월 선택
          </h3>
          <n-select
            v-model:value="selectedMonth"
            :options="monthOptions"
            placeholder="월 선택"
          />
          <n-alert
            type="info"
            class="mt-2"
          >
            다음 달 근무표를 생성합니다
          </n-alert>
        </div>

        <!-- 조직 정보 -->
        <div v-if="orgStore.current">
          <h3 class="mb-4 text-lg font-semibold">
            조직 정보 확인
          </h3>
          <div class="space-y-2">
            <p><strong>조직:</strong> {{ orgStore.current.name }} ({{ orgStore.current.type }})</p>
            <p><strong>등록 직원:</strong> {{ orgStore.employees.length }}명</p>

            <div>
              <p class="mb-2 font-semibold">
                등록된 시프트:
              </p>
              <ul class="list-inside list-disc space-y-1">
                <li
                  v-for="shift in orgStore.shifts"
                  :key="shift.id"
                >
                  <span :style="{ color: shift.colorCode }">{{ shift.code }}</span>
                  ({{ shift.name }}):
                  {{ shift.startTime || '-' }} - {{ shift.endTime || '-' }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- 버튼 -->
        <div class="flex justify-between pt-4">
          <n-button @click="handleCancel">
            취소
          </n-button>
          <n-button
            type="primary"
            @click="handleNext"
          >
            다음 단계 →
          </n-button>
        </div>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { NCard, NSpace, NSelect, NButton, NAlert } from 'naive-ui';
import StepIndicator from '@/components/schedule/StepIndicator.vue';
import { useScheduleStore } from '@/stores/schedule';
import { useOrganizationStore } from '@/stores/organization';
import { getAvailableMonths } from '@/utils/date';

const router = useRouter();
const scheduleStore = useScheduleStore();
const orgStore = useOrganizationStore();

const selectedMonth = ref<string>('');

const monthOptions = computed(() => {
  return getAvailableMonths().map((month) => ({
    label: month,
    value: month,
  }));
});

onMounted(async () => {
  // 조직 정보 로드
  if (!orgStore.current) {
    await orgStore.loadOrganization('00000000-0000-0000-0000-000000000001');
  }

  // 기본값: 다음 달
  selectedMonth.value = monthOptions.value[1]?.value || '';
});

function handleCancel() {
  router.push('/');
}

function handleNext() {
  if (!selectedMonth.value) {
    return;
  }

  scheduleStore.setBasicInfo({
    month: selectedMonth.value,
    organizationId: orgStore.current!.id,
    organizationName: orgStore.current!.name,
    organizationType: orgStore.current!.type,
    employeeCount: orgStore.employees.length,
    shifts: orgStore.shifts,
  });

  scheduleStore.nextStep();
  router.push('/schedule/step2');
}
</script>
