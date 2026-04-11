<template>
  <div class="mx-auto max-w-7xl px-4">
    <StepIndicator :current-step="2" />

    <n-card title="근무표 생성 - 요일별 인력 설정">
      <p class="mb-2 text-base text-gray-600">
        {{ scheduleStore.basicInfo?.month }} 요일별 필요 인력을 확인하고 수정합니다
      </p>

      <div
        v-if="loading"
        class="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500"
      >
        요일별 필요 인력을 불러오는 중입니다.
      </div>

      <template v-else>
        <n-alert
          v-if="primarySiteLabel"
          type="info"
          class="mb-4"
        >
          현재 스케줄 대상 사이트: {{ primarySiteLabel }}
        </n-alert>

        <div class="overflow-x-auto">
          <table class="w-full border-collapse border border-gray-300">
            <thead>
              <tr class="bg-gray-50">
                <th class="border border-gray-300 px-4 py-3 text-left font-semibold">
                  요일
                </th>
                <th
                  v-for="shift in shiftCodes"
                  :key="shift.code"
                  class="border border-gray-300 px-4 py-3 text-center font-semibold"
                  :style="{ backgroundColor: shift.colorCode + '20' }"
                >
                  <span
                    class="inline-flex items-center gap-1"
                    :style="{ color: shift.colorCode }"
                  >
                    <span
                      class="inline-block size-3 rounded"
                      :style="{ backgroundColor: shift.colorCode }"
                    />
                    {{ shift.code }} ({{ shift.name }})
                  </span>
                </th>
                <th class="border border-gray-300 bg-gray-100 px-4 py-3 text-center font-semibold">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="dayOfWeek in dayOrder"
                :key="dayOfWeek"
                class="hover:bg-gray-50"
              >
                <td class="border border-gray-300 px-4 py-3 font-medium">
                  {{ dayNames[dayOfWeek] }}
                </td>
                <td
                  v-for="shift in shiftCodes"
                  :key="shift.code"
                  class="border border-gray-300 p-2 text-center"
                >
                  <n-input-number
                    :value="getRequirement(dayOfWeek, shift.code)"
                    :min="0"
                    :precision="0"
                    :show-button="false"
                    class="w-full"
                    @update:value="(val) => setRequirement(dayOfWeek, shift.code, val)"
                  />
                </td>
                <td class="border border-gray-300 bg-gray-50 px-4 py-3 text-center font-bold">
                  {{ getDayTotal(dayOfWeek) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <n-alert
          type="info"
          class="mt-6"
        >
          각 요일별로 필요한 시프트별 인력 수를 입력하세요. 이 패턴이 해당 월의 모든 날짜에 적용됩니다.
        </n-alert>

        <!-- 버튼 -->
        <div class="flex justify-between pt-6">
          <n-popconfirm
            @positive-click="handlePrev"
          >
            <template #trigger>
              <n-button
                size="medium"
                :disabled="isSaving || loading"
              >
                ← 이전
              </n-button>
            </template>
            {{ prevConfirmMessage }}
          </n-popconfirm>
          <n-button
            type="primary"
            size="medium"
            :loading="isSaving || loading"
            @click="handleNext"
          >
            다음 단계 →
          </n-button>
        </div>
      </template>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NCard, NButton, NAlert, NInputNumber, NPopconfirm } from 'naive-ui';
import StepIndicator from '@/components/schedule/StepIndicator.vue';
import { useScheduleStore } from '@/stores/schedule';
import { useOrganizationStore } from '@/stores/organization';
import { loadCanonicalSiteRequirements, replaceCanonicalSiteRequirements } from '@/api/employee';
import { getSchedulingShifts } from '@/api/shift';
import { showError, showSuccess } from '@/utils/message';
import type { SiteRequirementRow } from '@/types/excel';
import { DAY_NAMES } from '@/types/excel';

const router = useRouter();
const route = useRoute();
const scheduleStore = useScheduleStore();
const orgStore = useOrganizationStore();

const dayNames = DAY_NAMES;
const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // 월~일 순서

const isSaving = ref(false);
const loading = ref(true);

// 시프트 목록 (스토어에서 가져옴)
const shiftCodes = computed(() => {
  const shifts = scheduleStore.basicInfo?.shifts || orgStore.shifts || [];
  return getSchedulingShifts(shifts)
    .map((s) => ({
      code: s.code,
      name: s.name,
      colorCode: s.colorCode,
    }));
});

const primarySiteLabel = computed(() => {
  const primarySite = orgStore.foundationSites?.find((site) => site.isActive && site.isScheduleActive);

  if (!primarySite) {
    return '';
  }

  return `${primarySite.name} (${primarySite.code})`;
});

const cameFromDashboard = computed(() => route.query.from === 'dashboard');

const prevConfirmMessage = computed(() => {
  if (cameFromDashboard.value) {
    return '근무표 관리로 돌아가면 현재 입력한 데이터가 초기화됩니다. 계속하시겠습니까?';
  }

  return '이전 단계로 돌아가면 현재 입력한 데이터가 초기화됩니다. 계속하시겠습니까?';
});

// 가로형 데이터: Record<dayOfWeek, Record<shiftCode, requiredCount>>
const horizontalData = reactive<Record<number, Record<string, number>>>({
  0: {},
  1: {},
  2: {},
  3: {},
  4: {},
  5: {},
  6: {},
});

onMounted(async () => {
  if (!scheduleStore.basicInfo) {
    router.push('/schedule/step1');
    return;
  }

  loading.value = true;

  try {
    // 1. Supabase에서 기존 데이터 로드
    const savedRequirements = await loadCanonicalSiteRequirements(scheduleStore.basicInfo.organizationId);

    // 2. 데이터가 있으면 변환하여 표시
    if (savedRequirements && savedRequirements.length > 0) {
      convertVerticalToHorizontal(savedRequirements);
      // 스토어에도 저장
      scheduleStore.setSiteRequirements(savedRequirements);
    } else {
      // 3. 스케줄 스토어 확인 (메모리에 있을 수도 있음)
      const siteReqs = scheduleStore.siteRequirements;
      if (siteReqs && Array.isArray(siteReqs) && siteReqs.length > 0) {
        convertVerticalToHorizontal(siteReqs as SiteRequirementRow[]);
      } else {
        // 4. 아무것도 없으면 기본값 초기화
        initDefaultValues();
      }
    }
  } catch (error) {
    console.error('[Step2SiteInfo] Load error:', error);
    showError('기존 데이터를 불러오는 중 오류가 발생했습니다.');
    // 오류 발생 시 기본값으로 초기화
    initDefaultValues();
  } finally {
    loading.value = false;
  }
});

/**
 * 세로형 데이터 → 가로형 변환
 */
function convertVerticalToHorizontal(verticalData: SiteRequirementRow[]) {
  // 초기화
  for (let day = 0; day < 7; day++) {
    horizontalData[day] = {};
  }

  // 세로형 데이터를 순회하며 가로형으로 변환
  verticalData.forEach((row) => {
    if (!horizontalData[row.dayOfWeek]) {
      horizontalData[row.dayOfWeek] = {};
    }
    // Type assertion or check
    const dayData = horizontalData[row.dayOfWeek];
    if (dayData) {
      dayData[row.shiftCode.toUpperCase()] = normalizeRequirementValue(row.requiredCount);
    }
  });
}

/**
 * 가로형 데이터 → 세로형 변환
 */
function convertHorizontalToVertical(): SiteRequirementRow[] {
  const result: SiteRequirementRow[] = [];

  dayOrder.forEach((dayOfWeek) => {
    const dayName = dayNames[dayOfWeek] as string; // Assert string
    const dayData = horizontalData[dayOfWeek] || {};

    shiftCodes.value.forEach((shift) => {
      result.push({
        dayOfWeek,
        dayName,
        shiftCode: shift.code.toUpperCase(),
        requiredCount: dayData[shift.code.toUpperCase()] || 0,
      });
    });
  });

  return result;
}

/**
 * 기본값 초기화
 */
function initDefaultValues() {
  for (let day = 0; day < 7; day++) {
    horizontalData[day] = {};
    shiftCodes.value.forEach((shift) => {
      const dayData = horizontalData[day];
      if (dayData) {
        dayData[shift.code.toUpperCase()] = 0;
      }
    });
  }
}

/**
 * 요일/시프트별 값 가져오기
 */
function getRequirement(dayOfWeek: number, shiftCode: string): number {
  return horizontalData[dayOfWeek]?.[shiftCode.toUpperCase()] || 0;
}

/**
 * 요일/시프트별 값 설정
 */
function setRequirement(dayOfWeek: number, shiftCode: string, value: number | null) {
  if (!horizontalData[dayOfWeek]) {
    horizontalData[dayOfWeek] = {};
  }
  horizontalData[dayOfWeek][shiftCode.toUpperCase()] = normalizeRequirementValue(value);
}

/**
 * 요일별 총합 계산
 */
function getDayTotal(dayOfWeek: number): number {
  const dayData = horizontalData[dayOfWeek] || {};
  return Object.values(dayData).reduce((sum, val) => sum + (val || 0), 0);
}

function normalizeRequirementValue(value: number | null): number {
  if (value === null || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function validateBeforeSave(): string | null {
  for (const dayOfWeek of dayOrder) {
    for (const shift of shiftCodes.value) {
      const count = getRequirement(dayOfWeek, shift.code);
      if (!Number.isInteger(count) || count < 0) {
        return `${dayNames[dayOfWeek]} 요일의 ${shift.code} 값은 0 이상의 정수여야 합니다.`;
      }
    }

    if (getDayTotal(dayOfWeek) === 0) {
      return `${dayNames[dayOfWeek]} 요일의 총 필요 인원은 1명 이상이어야 합니다.`;
    }
  }

  return null;
}

/**
 * 이전 버튼 핸들러
 */
function handlePrev() {
  scheduleStore.prevStep();
  router.push(cameFromDashboard.value ? '/' : '/schedule/step1');
}

/**
 * 다음 버튼 핸들러
 */
async function handleNext() {
  if (!scheduleStore.basicInfo) {
    showError('기본 정보가 없습니다. 다시 시도해주세요.');
    return;
  }

  isSaving.value = true;

  try {
    const validationError = validateBeforeSave();
    if (validationError) {
      showError(validationError);
      return;
    }

    // 가로형 → 세로형 변환
    const verticalData = convertHorizontalToVertical();

    // Supabase에 저장
    await replaceCanonicalSiteRequirements(scheduleStore.basicInfo.organizationId, verticalData);

    // Schedule Store 업데이트
    scheduleStore.setSiteRequirements(verticalData);
    scheduleStore.nextStep();

    // 성공 메시지 표시
    showSuccess('요일별 인력이 저장되었습니다.');

    // Step 3로 이동
    router.push('/schedule/step3');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.';
    showError(errorMessage);
  } finally {
    isSaving.value = false;
  }
}
</script>
