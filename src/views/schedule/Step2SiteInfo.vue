<template>
  <div class="mx-auto max-w-7xl px-4">
    <StepIndicator :current-step="2" />

    <n-card title="근무표 생성 - 요일별 인력 설정">
      <p class="mb-2 text-base text-gray-600">
        {{ scheduleStore.basicInfo?.month }} 요일별 필요 인력을 확인하고 수정합니다
      </p>

      <!-- 엑셀에서 불러온 데이터 안내 -->
      <n-alert
        v-if="isExcelMode"
        type="info"
        class="mb-6"
      >
        엑셀에서 불러온 요일별 인력 데이터입니다. 필요시 수정 후 다음 단계로 진행하세요.
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
                  :show-button="false"
                  class="w-full"
                  @update:value="(val) => setRequirement(dayOfWeek, shift.code, val || 0)"
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
          이전 단계로 돌아가면 현재 입력한 데이터가 초기화됩니다. 계속하시겠습니까?
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
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { NCard, NButton, NAlert, NInputNumber, NPopconfirm } from 'naive-ui';
import StepIndicator from '@/components/schedule/StepIndicator.vue';
import { useScheduleStore } from '@/stores/schedule';
import { useOrganizationStore } from '@/stores/organization';
import { replaceSiteRequirements } from '@/api/employee';
import type { SiteRequirementRow } from '@/types/excel';
import { DAY_NAMES } from '@/types/excel';

const router = useRouter();
const scheduleStore = useScheduleStore();
const orgStore = useOrganizationStore();

const dayNames = DAY_NAMES;
const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // 월~일 순서

const isSaving = ref(false);
const loading = ref(false);

// 엑셀 업로드 모드 확인
const isExcelMode = computed(() => scheduleStore.isExcelUploadMode);

// 시프트 목록 (스토어에서 가져옴)
const shiftCodes = computed(() => {
  const shifts = scheduleStore.basicInfo?.shifts || orgStore.shifts || [];
  return shifts.map((s) => ({
    code: s.code,
    name: s.name,
    colorCode: s.colorCode,
  }));
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

  // 스케줄 스토어에서 세로형 데이터를 가로형으로 변환
  const siteReqs = scheduleStore.siteRequirements;
  if (siteReqs && Array.isArray(siteReqs) && siteReqs.length > 0) {
    convertVerticalToHorizontal(siteReqs as SiteRequirementRow[]);
  } else {
    // 기본값 초기화
    initDefaultValues();
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
    horizontalData[row.dayOfWeek][row.shiftCode.toUpperCase()] = row.requiredCount;
  });
}

/**
 * 가로형 데이터 → 세로형 변환
 */
function convertHorizontalToVertical(): SiteRequirementRow[] {
  const result: SiteRequirementRow[] = [];

  dayOrder.forEach((dayOfWeek) => {
    const dayName = dayNames[dayOfWeek];
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
      horizontalData[day][shift.code.toUpperCase()] = shift.code.toUpperCase() === 'O' ? 0 : 5;
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
function setRequirement(dayOfWeek: number, shiftCode: string, value: number) {
  if (!horizontalData[dayOfWeek]) {
    horizontalData[dayOfWeek] = {};
  }
  horizontalData[dayOfWeek][shiftCode.toUpperCase()] = value;
}

/**
 * 요일별 총합 계산
 */
function getDayTotal(dayOfWeek: number): number {
  const dayData = horizontalData[dayOfWeek] || {};
  return Object.values(dayData).reduce((sum, val) => sum + (val || 0), 0);
}

/**
 * 이전 버튼 핸들러
 */
function handlePrev() {
  scheduleStore.prevStep();
  router.push('/schedule/step1');
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
    // 가로형 → 세로형 변환
    const verticalData = convertHorizontalToVertical();

    // Supabase에 저장
    await replaceSiteRequirements(scheduleStore.basicInfo.organizationId, verticalData);

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

function showSuccess(msg: string) {
  window.$message?.success(msg);
}

function showError(msg: string) {
  window.$message?.error(msg);
}
</script>
