<template>
  <div class="mx-auto max-w-7xl px-4">
    <StepIndicator :current-step="4" />

    <n-card title="근무표 생성 - 초기 정보 입력">
      <n-alert
        type="warning"
        class="mb-6"
      >
        <strong>전월 마지막 5일 데이터는 반드시 입력해야 합니다.</strong>
        당월 데이터는 비워두면 AI가 자동으로 배치합니다.
      </n-alert>

      <!-- 그리드 -->
      <n-spin :show="grid.loading.value">
        <ScheduleGrid
          v-if="grid.employees.value.length > 0"
          :employees="grid.employees.value"
          :dates="grid.dates.value"
          :assignments="grid.assignments.value"
          :readonly="false"
          :show-last-month="true"
          @update:assignment="handleAssignmentUpdate"
        />
      </n-spin>

      <!-- 버튼 -->
      <div class="flex flex-col gap-4 pt-6 sm:flex-row sm:justify-between">
        <n-button
          size="medium"
          @click="handlePrev"
        >
          ← 이전
        </n-button>
        <div class="flex flex-col gap-4 sm:flex-row">
          <n-button
            secondary
            type="info"
            size="medium"
            @click="handleLoadSampleData"
          >
            📝 샘플 데이터 로드
          </n-button>
          <n-button
            size="medium"
            @click="handleSave"
          >
            임시 저장
          </n-button>
          <n-button
            type="primary"
            size="medium"
            @click="handleGenerate"
          >
            근무표 생성 →
          </n-button>
        </div>
      </div>
    </n-card>

    <!-- Loading Modal -->
    <n-modal
      v-model:show="showModal"
      :mask-closable="false"
      preset="card"
      title="근무표 생성 중"
      class="w-96"
    >
      <div class="text-center">
        <n-spin
          v-if="solver.status.value !== 'error'"
          size="large"
        />
        <p class="mt-4 text-lg font-medium">
          {{ statusMessage }}
        </p>
        <p
          v-if="solver.error.value"
          class="mt-2 text-sm text-red-500"
        >
          {{ solver.error.value }}
        </p>
        <p
          v-else
          class="mt-2 text-sm text-gray-500"
        >
          경과 시간: {{ elapsedTime }}초
        </p>
        <n-progress
          v-if="solver.status.value === 'running'"
          type="line"
          :percentage="solver.progress.value"
          status="info"
          class="mt-4"
        />
        <n-button
          class="mt-6"
          @click="handleCancel"
        >
          {{ solver.status.value === 'error' ? '닫기' : '취소' }}
        </n-button>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { watchDebounced } from '@vueuse/core';
import { NCard, NButton, NAlert, NSpin, NModal, NProgress } from 'naive-ui';
import StepIndicator from '@/components/schedule/StepIndicator.vue';
import ScheduleGrid from '@/components/schedule/ScheduleGrid.vue';
import { useScheduleStore } from '@/stores/schedule';
import { useScheduleGrid } from '@/composables/useScheduleGrid';
import { useAISolver } from '@/composables/useAISolver';
import { showSuccess, showInfo, showError } from '@/utils/message';
import { validateLastMonthData } from '@/utils/validation';
import { createSchedule } from '@/api/schedule';
import type { AssignmentMap, SiteRequirements } from '@/types/schedule';

const router = useRouter();
const scheduleStore = useScheduleStore();
const grid = useScheduleGrid();
const solver = useAISolver();

// Modal 상태
const showModal = ref(false);
const elapsedTime = ref(0);
let timerInterval: number | null = null;

// LocalStorage 키 (월별로 구분)
const STORAGE_KEY = computed(() => {
  if (!scheduleStore.basicInfo) return '';
  return `everyshift_temp_schedule_${scheduleStore.basicInfo.month}`;
});

// 상태 메시지
const statusMessage = computed(() => {
  switch (solver.status.value) {
    case 'created':
      return '요청 생성 중...';
    case 'running':
      return '처리 중... 잠시만 기다려주세요.';
    case 'complete':
      return '완료! 결과를 불러오는 중...';
    case 'error':
      return '오류가 발생했습니다.';
    default:
      return '';
  }
});

// 자동 저장 (2초 debounce)
watchDebounced(
  () => grid.assignments.value,
  (newVal) => {
    if (STORAGE_KEY.value) {
      localStorage.setItem(STORAGE_KEY.value, JSON.stringify(newVal));
    }
  },
  { debounce: 2000, deep: true }
);

onMounted(async () => {
  if (!scheduleStore.basicInfo) {
    router.push('/schedule/step1');
    return;
  }

  // 직원 로드
  await grid.loadEmployees(scheduleStore.basicInfo.organizationId);

  // 날짜 생성 (전월 5일 + 당월)
  grid.generateDates(scheduleStore.basicInfo.month);

  // LocalStorage에서 복원
  if (STORAGE_KEY.value) {
    const saved = localStorage.getItem(STORAGE_KEY.value);
    if (saved) {
      try {
        const savedAssignments = JSON.parse(saved);
        // 기존 초기화된 객체와 병합 (모든 직원의 키 보존)
        grid.assignments.value = {
          ...grid.assignments.value,
          ...savedAssignments,
        };
        showInfo('이전 작업이 복원되었습니다');
      } catch (e) {
        console.warn('Failed to restore from localStorage:', e);
      }
    }
  }
});

function handleAssignmentUpdate(payload: {
  employeeId: string;
  date: string;
  shiftCode: string;
}) {
  grid.setAssignment(payload.employeeId, payload.date, payload.shiftCode);
}

function handlePrev() {
  // 현재 상태 저장
  scheduleStore.setAssignments(grid.assignments.value);
  scheduleStore.prevStep();
  router.push('/schedule/step3');
}

function handleSave() {
  scheduleStore.setAssignments(grid.assignments.value);
  showSuccess('임시 저장되었습니다');
}

function handleLoadSampleData() {
  // 전월 5일 데이터만 샘플로 채우기
  const lastMonthDates = grid.dates.value.filter(d => d.isLastMonth);
  const shiftCodes = ['D', 'E', 'N', 'O'];

  grid.employees.value.forEach((employee, empIndex) => {
    lastMonthDates.forEach((dateCol, dateIndex) => {
      // 각 직원마다 다른 패턴으로 배치 (순환)
      const shiftIndex = (empIndex + dateIndex) % 4;
      const shiftCode = shiftCodes[shiftIndex];

      grid.setAssignment(employee.id, dateCol.date as string, shiftCode);
    });
  });

  showSuccess('전월 5일 샘플 데이터가 로드되었습니다');
}

async function handleGenerate() {
  // 1. 전월 데이터 검증
  const validation = validateLastMonthData(
    grid.employees.value,
    grid.dates.value,
    grid.assignments.value
  );

  if (!validation.isValid) {
    // 에러 메시지 표시
    showError('전월 데이터를 모두 입력해주세요');

    // 상세 에러 다이얼로그
    const errorList = validation.errors.join('\n');
    window.$dialog?.error({
      title: '전월 데이터 미입력',
      content: errorList,
      positiveText: '확인',
    });
    return;
  }

  // 2. 검증 통과 시 저장 및 다음 단계
  scheduleStore.setAssignments(grid.assignments.value);

  try {
    // 3. Schedule 레코드 생성
    if (!scheduleStore.basicInfo) return;

    const schedule = await createSchedule(
      scheduleStore.basicInfo.organizationId,
      scheduleStore.basicInfo.month
    );

    // 4. 전월/당월 assignments 분리
    const lastMonthDates = grid.dates.value.filter(d => d.isLastMonth).map(d => d.date);
    const thisMonthDates = grid.dates.value.filter(d => !d.isLastMonth).map(d => d.date);

    const lastMonthAssignments: AssignmentMap = {};
    const thisMonthAssignments: AssignmentMap = {};

    grid.employees.value.forEach((emp) => {
      // 안전장치: assignments 객체가 없으면 빈 객체로 초기화
      if (!grid.assignments.value[emp.id]) {
        grid.assignments.value[emp.id] = {};
      }

      lastMonthAssignments[emp.id] = {};
      thisMonthAssignments[emp.id] = {};

      lastMonthDates.forEach((date) => {
        const shift = grid.assignments.value[emp.id]?.[date as string] || '';
        if (shift && lastMonthAssignments[emp.id]) {
          lastMonthAssignments[emp.id][date as string] = shift;
        }
      });

      thisMonthDates.forEach((date) => {
        const shift = grid.assignments.value[emp.id]?.[date as string] || '';
        if (shift && thisMonthAssignments[emp.id]) {
          thisMonthAssignments[emp.id][date as string] = shift;
        }
      });
    });

    // 5. 요일별 requirements를 날짜별로 변환
    const dateBasedRequirements: SiteRequirements = {};
    thisMonthDates.forEach((dateStr) => {
      const date = new Date(dateStr as string);
      const dayOfWeek = date.getDay(); // 0-6
      // scheduleStore.siteRequirements는 요일별 데이터
      const weeklyReq = scheduleStore.siteRequirements[dayOfWeek];
      if (weeklyReq) {
        dateBasedRequirements[dateStr as string] = weeklyReq;
      }
    });

    // 6. 모달 표시 및 타이머 시작
    showModal.value = true;
    elapsedTime.value = 0;
    timerInterval = window.setInterval(() => {
      elapsedTime.value++;
    }, 1000);

    // 디버깅: Solver에 전달되는 데이터 확인
    console.log('[Step3] Employees count:', grid.employees.value.length);
    console.log('[Step3] Last 3 employees:', grid.employees.value.slice(-3).map(e => ({ id: e.id, name: e.name })));
    console.log('[Step3] LastMonth assignments keys:', Object.keys(lastMonthAssignments).length);
    console.log('[Step3] ThisMonth assignments keys:', Object.keys(thisMonthAssignments).length);
    console.log('[Step3] Last 3 lastMonth keys:', Object.keys(lastMonthAssignments).slice(-3));

    // 7. AI Solver 시작
    await solver.startSolver(
      schedule.id,
      {
        scheduleId: schedule.id,
        employees: grid.employees.value,
        requirements: dateBasedRequirements,
        lastMonthAssignments,
        thisMonthAssignments,
      },
      scheduleStore.basicInfo.organizationId
    );

    // 8. 상태 변화 감지 및 자동 이동
    const checkStatusInterval = setInterval(() => {
      if (solver.status.value === 'complete') {
        clearInterval(checkStatusInterval);
        if (timerInterval) clearInterval(timerInterval);

        // LocalStorage 삭제 (임시 저장 불필요)
        if (STORAGE_KEY.value) {
          localStorage.removeItem(STORAGE_KEY.value);
        }

        // Step 4로 이동
        scheduleStore.nextStep();
        showSuccess('근무표 생성이 완료되었습니다');
        showModal.value = false;
        router.push(`/schedule/step5/${schedule.id}`);
      } else if (solver.status.value === 'error') {
        clearInterval(checkStatusInterval);
        if (timerInterval) clearInterval(timerInterval);
        showModal.value = false;
        showError('근무표 생성 중 오류가 발생했습니다');
      }
    }, 500);
  } catch {
    if (timerInterval) clearInterval(timerInterval);
    showModal.value = false;
    showError('근무표 생성 중 오류가 발생했습니다');
  }
}

function handleCancel() {
  solver.stopPolling();
  showModal.value = false;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  showInfo('근무표 생성이 취소되었습니다');
}

// Cleanup on unmount
onUnmounted(() => {
  solver.stopPolling();
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
});
</script>
