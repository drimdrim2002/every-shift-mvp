<template>
  <div class="mx-auto max-w-7xl px-4">
    <StepIndicator :current-step="4" />

    <n-card title="근무표 생성 - 초기 정보 입력">
      <!-- 통합 툴바 영역 -->
      <div class="mb-4 flex flex-col gap-4 rounded-lg bg-gray-50 p-4">
        <!-- 1열: 주요 컨트롤 (전월 데이터 토글 + 뷰 모드) -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <!-- 왼쪽: 전월 데이터 토글 -->
          <div class="flex items-center gap-3">
            <n-switch
              v-model:value="showLastMonth"
              @update:value="handleLastMonthToggle"
            />
            <span class="font-medium text-gray-700">전월 데이터 포함</span>
            <n-tooltip trigger="hover">
              <template #trigger>
                <span class="cursor-help text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="size-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </span>
              </template>
              연속 근무(예: N-D 금지) 규칙을 적용하려면 전월 마지막 근무 기록이 필요합니다.
            </n-tooltip>
          </div>

          <!-- 오른쪽: 뷰 모드 선택 -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500">보기 방식:</span>
            <n-radio-group
              v-model:value="viewMode"
              size="small"
            >
              <n-radio-button value="month">
                월간 (전체)
              </n-radio-button>
              <n-radio-button value="week">
                주간 (7일씩)
              </n-radio-button>
            </n-radio-group>
          </div>
        </div>

        <!-- 2열: 상세 컨트롤 (조건부 렌더링) -->
        <div 
          v-if="showLastMonth || viewMode === 'week'" 
          class="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-3"
        >
          <!-- 왼쪽: 전월 데이터 설정 (showLastMonth일 때만) -->
          <div class="flex items-center gap-3">
            <template v-if="showLastMonth">
              <div class="flex items-center gap-2 border-r border-gray-300 pr-3">
                <span class="text-xs text-gray-500">기간:</span>
                <n-input-number
                  v-model:value="lastMonthDays"
                  size="small"
                  :min="1"
                  :max="5"
                  class="w-20"
                  @update:value="handleLastMonthDaysChange"
                />
                <span class="text-xs text-gray-500">일</span>
              </div>

              <n-button-group size="small">
                <n-button
                  secondary
                  @click="handleDownloadTemplate"
                >
                  템플릿
                </n-button>
                <n-upload
                  :show-file-list="false"
                  accept=".xlsx,.xls"
                  @change="handleExcelUpload"
                >
                  <n-button secondary>
                    업로드
                  </n-button>
                </n-upload>
                <n-button
                  secondary
                  @click="handleLoadSampleData"
                >
                  샘플
                </n-button>
              </n-button-group>
            </template>
          </div>

          <!-- 오른쪽: 주간 이동 컨트롤 (viewMode === 'week'일 때만) -->
          <div
            v-if="viewMode === 'week'"
            class="flex items-center gap-2"
          >
            <n-button 
              size="small" 
              :disabled="weekIndex === 0" 
              @click="handlePrevWeek"
            >
              &lt; 이전 주
            </n-button>
            <span class="min-w-[150px] text-center font-medium text-gray-700">
              {{ currentWeekLabel }}
            </span>
            <n-button 
              size="small" 
              :disabled="weekIndex >= weekRanges.length - 1" 
              @click="handleNextWeek"
            >
              다음 주 &gt;
            </n-button>
          </div>
        </div>
      </div>

      <!-- 안내 텍스트 (간소화) -->
      <div class="mb-4 flex items-start gap-2 text-xs text-gray-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="mt-0.5 size-4 text-blue-500"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clip-rule="evenodd"
          />
        </svg>
        <p>
          당월 데이터는 비워두면 AI가 자동으로 최적의 근무를 배치합니다.
          <strong>이미 확정된 근무(휴가, 교육 등)가 있다면 해당 셀에 직접 입력해주세요.</strong>
        </p>
      </div>

      <!-- 그리드 -->
      <n-spin :show="grid.loading.value">
        <ScheduleGrid
          v-if="grid.employees.value.length > 0"
          :employees="grid.employees.value"
          :dates="visibleDates"
          :assignments="grid.assignments.value"
          :off-reasons="grid.offReasons.value"
          :readonly="false"
          :show-last-month="lastMonthDays > 0"
          @update:assignment="handleAssignmentUpdate"
          @select-off="handleOffSelect"
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

    <!-- Off 사유 선택 Modal -->
    <n-modal
      v-model:show="showOffReasonModal"
      preset="dialog"
      title="Off 사유 선택"
      positive-text="확인"
      negative-text="취소"
      @positive-click="handleOffReasonConfirm"
      @negative-click="handleOffReasonCancel"
    >
      <div class="py-4">
        <p class="mb-4 text-sm text-gray-600">
          Off 사유를 선택해주세요. 선택한 셀은 AI가 변경할 수 없도록 잠금 처리됩니다.
        </p>
        <n-radio-group v-model:value="selectedOffReason">
          <n-space vertical>
            <n-radio
              v-for="option in offReasonOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </n-radio>
          </n-space>
        </n-radio-group>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { watchDebounced } from '@vueuse/core';
import {
  NCard,
  NButton,
  NSpin,
  NModal,
  NProgress,
  NInputNumber,
  NUpload,
  NSwitch,
  NTooltip,
  NButtonGroup,
  NRadioGroup,
  NRadioButton,
  NRadio,
  NSpace,
} from 'naive-ui';
import type { UploadFileInfo } from 'naive-ui';
import StepIndicator from '@/components/schedule/StepIndicator.vue';
import ScheduleGrid from '@/components/schedule/ScheduleGrid.vue';
import { useScheduleStore } from '@/stores/schedule';
import { useScheduleGrid } from '@/composables/useScheduleGrid';
import { useAISolver } from '@/composables/useAISolver';
import { showSuccess, showInfo, showError, showWarning } from '@/utils/message';
import { validateLastMonthData } from '@/utils/validation';
import { downloadLastMonthTemplate, parseLastMonthExcel } from '@/utils/excel';
import { validatePlanningPayload, summarizePlanningPayload } from '@/utils/planningPayloadValidator';
import { 
  createSchedule, 
  saveTempAssignments, 
  getScheduleAssignments,
  getPlanningOrganization,
  getPlanningShifts,
  getPlanningEmployees,
  getPlanningAssignments,
} from '@/api/schedule';
import { loadShifts } from '@/api/shift';
import { supabase } from '@/api/supabase';
import type { 
  AssignmentMap, 
  SiteRequirements, 
  GridColumn, 
  DailyRequirement, 
  OffReasonMap,
  PlanningPayload,
  PlanningAssignment,
} from '@/types/schedule';
import { OFF_REASONS } from '@/types/schedule';

const router = useRouter();
const scheduleStore = useScheduleStore();
const grid = useScheduleGrid();
const solver = useAISolver();

// Modal 상태
const showModal = ref(false);
const elapsedTime = ref(0);
let timerInterval: number | null = null;

// Off 사유 선택 모달 상태
const showOffReasonModal = ref(false);
const selectedOffCell = ref<{ employeeId: string; date: string } | null>(null);
const selectedOffReason = ref<string>('VACATION');

// Off 사유 옵션
const offReasonOptions = [
  { label: OFF_REASONS.VACATION, value: 'VACATION' },
  { label: OFF_REASONS.TRAINING, value: 'TRAINING' },
  { label: OFF_REASONS.SICK, value: 'SICK' },
  { label: OFF_REASONS.OTHER, value: 'OTHER' },
];

// 전월 데이터 상태
const showLastMonth = ref(false); // 기본: 숨김
const lastMonthDays = ref(0); // 전월 일수 (0: 숨김, 1-5: 표시)

// 뷰 모드 상태 (월간/주간)
const viewMode = ref<'month' | 'week'>('month');
const weekIndex = ref(0);

// 주차별 데이터 계산 (7일 단위)
const weekRanges = computed(() => {
  const allDates = grid.dates.value;
  const weeks: GridColumn[][] = [];
  for (let i = 0; i < allDates.length; i += 7) {
    weeks.push(allDates.slice(i, i + 7));
  }
  return weeks;
});

// 현재 주차 라벨
const currentWeekLabel = computed(() => {
  if (weekRanges.value.length === 0) return '';
  const currentWeek = weekRanges.value[weekIndex.value];
  if (!currentWeek || currentWeek.length === 0) return '';
  
  const start = currentWeek[0];
  const end = currentWeek[currentWeek.length - 1];
  
  if (!start || !end) return `${weekIndex.value + 1}주차`;

  const format = (d: string) => d.substring(5).replace('-', '.');
  return `${weekIndex.value + 1}주차 (${format(start.date)} ~ ${format(end.date)})`;
});

// 그리드에 표시할 날짜 계산
const visibleDates = computed(() => {
  if (viewMode.value === 'month') {
    return grid.dates.value;
  }
  return weekRanges.value[weekIndex.value] || [];
});

// 주차 이동 핸들러
function handlePrevWeek() {
  if (weekIndex.value > 0) weekIndex.value--;
}

function handleNextWeek() {
  if (weekIndex.value < weekRanges.value.length - 1) weekIndex.value++;
}

// 날짜 변경 시 주차 인덱스 범위 체크
watch([() => grid.dates.value.length, viewMode], () => {
  if (weekIndex.value >= weekRanges.value.length) {
    weekIndex.value = 0;
  }
});

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

// 자동 저장 (2초 debounce) - assignments와 offReasons 함께 저장
watchDebounced(
  [() => grid.assignments.value, () => grid.offReasons.value],
  ([assignments, offReasons]) => {
    if (STORAGE_KEY.value) {
      const dataToSave = {
        assignments,
        offReasons,
      };
      localStorage.setItem(STORAGE_KEY.value, JSON.stringify(dataToSave));
    }
  },
  { debounce: 2000, deep: true }
);

// 전월 데이터 토글
function handleLastMonthToggle(value: boolean) {
  if (value) {
    // 켜질 때 기본값 5일 설정
    lastMonthDays.value = 5;
  } else {
    // 꺼질 때 0일 설정
    lastMonthDays.value = 0;
  }
  
  if (scheduleStore.basicInfo) {
    grid.generateDates(scheduleStore.basicInfo.month, lastMonthDays.value);
  }
}

// 전월 일수 변경 시 날짜 재생성
function handleLastMonthDaysChange(value: number | null) {
  if (value === null) return;
  
  // 0이 되면 토글도 끔
  if (value === 0) {
    showLastMonth.value = false;
  }
  
  if (scheduleStore.basicInfo) {
    grid.generateDates(scheduleStore.basicInfo.month, value);
  }
}

// lastMonthDays 변경 감지하여 grid.lastMonthDays와 동기화
watch(lastMonthDays, (newValue) => {
  grid.lastMonthDays.value = newValue;
});

onMounted(async () => {
  if (!scheduleStore.basicInfo) {
    router.push('/schedule/step1');
    return;
  }

  // 직원 로드
  await grid.loadEmployees(scheduleStore.basicInfo.organizationId);

  console.log('[Step4 onMounted] Loaded employees:', grid.employees.value.length);
  console.log('[Step4 onMounted] Employee IDs:', grid.employees.value.map(e => e.id).slice(0, 3));

  // 날짜 생성 (기본값 0일 + 당월)
  grid.generateDates(scheduleStore.basicInfo.month, lastMonthDays.value);

  // 데이터 복원 우선순위: Supabase > LocalStorage
  let dataRestored = false;
  let restoredAssignments: AssignmentMap = {};

  try {
    // 1. Supabase에서 저장된 schedule 조회
    const { data: existingSchedules, error: scheduleError } = await supabase
      .from('schedules')
      .select('id, status')
      .eq('organization_id', scheduleStore.basicInfo.organizationId)
      .eq('month', scheduleStore.basicInfo.month)
      .order('created_at', { ascending: false })
      .limit(1);

    if (scheduleError) {
      console.error('[Step4 onMounted] Schedule query error:', scheduleError);
    } else if (existingSchedules && existingSchedules.length > 0) {
      const schedule = existingSchedules[0];
      if (schedule && schedule.id) {
        console.log('[Step4 onMounted] Found existing schedule:', schedule.id, 'status:', schedule.status);

        // 2. Schedule assignments와 offReasons 조회
        const { assignments, offReasons } = await getScheduleAssignments(schedule.id);
        const assignmentCount = Object.keys(assignments).reduce((sum, empId) => {
          const empAssignments = assignments[empId];
          if (empAssignments) {
            return sum + Object.keys(empAssignments).length;
          }
          return sum;
        }, 0);

        console.log('[Step4 onMounted] Loaded assignments from Supabase:', assignmentCount, 'cells');

        if (assignmentCount > 0) {
          // Supabase 데이터로 grid 초기화
          grid.assignments.value = {
            ...grid.assignments.value,
            ...assignments,
          };
          grid.offReasons.value = {
            ...grid.offReasons.value,
            ...offReasons,
          };
          restoredAssignments = assignments;
          dataRestored = true;
          showInfo(`저장된 데이터를 불러왔습니다 (${assignmentCount}개 셀)`);
        }
      }
    } else {
      console.log('[Step4 onMounted] No existing schedule found for', scheduleStore.basicInfo.month);
    }
  } catch (error) {
    console.error('[Step4 onMounted] Failed to load from Supabase:', error);
  }

  // 3. Supabase에 데이터가 없으면 LocalStorage에서 복원
  if (!dataRestored && STORAGE_KEY.value) {
    const saved = localStorage.getItem(STORAGE_KEY.value);
    if (saved) {
      try {
        const savedData = JSON.parse(saved);
        
        // 이전 버전 호환성: assignments만 저장된 경우와 새 버전(assignments + offReasons) 구분
        let savedAssignments: AssignmentMap;
        let savedOffReasons: OffReasonMap = {};
        
        if (savedData.assignments) {
          // 새 버전
          savedAssignments = savedData.assignments;
          savedOffReasons = savedData.offReasons || {};
        } else {
          // 이전 버전 (assignments만 저장됨)
          savedAssignments = savedData;
        }
        
        const savedKeys = Object.keys(savedAssignments);
        
        console.log('[Step4 onMounted] LocalStorage has', savedKeys.length, 'employee assignments');
        
        // 유효한 employee_id만 필터링 (현재 로드된 직원들만)
        const validEmployeeIds = new Set(grid.employees.value.map(emp => emp.id));
        const filteredSavedAssignments: AssignmentMap = {};
        const filteredSavedOffReasons: OffReasonMap = {};
        
        let invalidCount = 0;
        Object.entries(savedAssignments).forEach(([employeeId, dateMap]) => {
          if (validEmployeeIds.has(employeeId)) {
            filteredSavedAssignments[employeeId] = dateMap as Record<string, string>;
            // offReasons도 복원
            if (savedOffReasons[employeeId]) {
              filteredSavedOffReasons[employeeId] = savedOffReasons[employeeId];
            }
          } else {
            invalidCount++;
            console.warn('[onMounted] Skipping invalid employee_id from localStorage:', employeeId);
          }
        });
        
        const restoredCount = Object.keys(filteredSavedAssignments).length;
        
        // 모든 employee_id가 유효하지 않으면 LocalStorage 초기화
        if (restoredCount === 0 && savedKeys.length > 0) {
          console.warn('[onMounted] All employee IDs in localStorage are invalid. Clearing localStorage.');
          localStorage.removeItem(STORAGE_KEY.value);
          showWarning('이전 작업 데이터가 현재 직원 정보와 일치하지 않아 초기화되었습니다.');
        } else if (restoredCount > 0) {
          // 기존 초기화된 객체와 병합 (모든 직원의 키 보존)
          grid.assignments.value = {
            ...grid.assignments.value,
            ...filteredSavedAssignments,
          };
          grid.offReasons.value = {
            ...grid.offReasons.value,
            ...filteredSavedOffReasons,
          };
          restoredAssignments = filteredSavedAssignments;
          dataRestored = true;
          
          if (invalidCount > 0) {
            showInfo(`이전 작업이 복원되었습니다 (${restoredCount}/${savedKeys.length}명) - LocalStorage`);
          } else {
            showInfo('이전 작업이 복원되었습니다 (LocalStorage)');
          }
        }
      } catch (e) {
        console.warn('Failed to restore from localStorage:', e);
        // 파싱 실패 시 LocalStorage 초기화
        localStorage.removeItem(STORAGE_KEY.value);
      }
    }
  }

  // 4. 복원된 데이터에서 전월 데이터 자동 감지
  if (dataRestored && scheduleStore.basicInfo) {
    const detectedLastMonthDays = detectLastMonthDays(
      restoredAssignments,
      scheduleStore.basicInfo.month
    );
    
    if (detectedLastMonthDays > 0) {
      console.log('[Step4 onMounted] Auto-detected lastMonthDays:', detectedLastMonthDays);
      
      // 전월 데이터 자동 활성화
      showLastMonth.value = true;
      lastMonthDays.value = detectedLastMonthDays;
      grid.lastMonthDays.value = detectedLastMonthDays;
      
      // 날짜 재생성 (전월 포함)
      grid.generateDates(scheduleStore.basicInfo.month, detectedLastMonthDays);
      
      showInfo(`전월 ${detectedLastMonthDays}일 데이터가 자동으로 표시되었습니다`);
    }
  }
});

// 전월 데이터 일수 자동 감지 함수
function detectLastMonthDays(assignments: AssignmentMap, currentMonth: string): number {
  if (!currentMonth) return 0;
  
  // 현재 월의 첫날
  const currentMonthDate = new Date(currentMonth + '-01');
  
  // 전월 말일 계산
  const lastMonth = new Date(currentMonthDate);
  lastMonth.setDate(0); // 전월 마지막 날
  
  const lastMonthYear = lastMonth.getFullYear();
  const lastMonthMonth = String(lastMonth.getMonth() + 1).padStart(2, '0');
  const lastMonthLastDay = lastMonth.getDate();
  
  // 전월 마지막 5일 날짜 생성
  const lastMonthDates: string[] = [];
  for (let i = 4; i >= 0; i--) {
    const day = lastMonthLastDay - i;
    const dateStr = `${lastMonthYear}-${lastMonthMonth}-${String(day).padStart(2, '0')}`;
    lastMonthDates.push(dateStr);
  }
  
  console.log('[detectLastMonthDays] Checking dates:', lastMonthDates);
  
  // 각 날짜별로 데이터 존재 여부 확인
  const daysWithData: Set<string> = new Set();
  
  Object.values(assignments).forEach(dateMap => {
    if (dateMap) {
      Object.keys(dateMap).forEach(date => {
        if (lastMonthDates.includes(date)) {
          daysWithData.add(date);
        }
      });
    }
  });
  
  console.log('[detectLastMonthDays] Days with data:', Array.from(daysWithData));
  
  // 연속된 전월 일수 계산 (뒤에서부터)
  let detectedDays = 0;
  for (let i = lastMonthDates.length - 1; i >= 0; i--) {
    if (daysWithData.has(lastMonthDates[i] as string)) {
      detectedDays = lastMonthDates.length - i;
    } else {
      // 중간에 빈 날짜가 있으면 중단
      break;
    }
  }
  
  return Math.min(detectedDays, 5); // 최대 5일
}

function handleAssignmentUpdate(payload: {
  employeeId: string;
  date: string;
  shiftCode: string;
}) {
  grid.setAssignment(payload.employeeId, payload.date, payload.shiftCode);
}

// Off 선택 시 사유 입력 모달 표시
function handleOffSelect(payload: { employeeId: string; date: string }) {
  selectedOffCell.value = payload;
  selectedOffReason.value = 'VACATION'; // 기본값
  showOffReasonModal.value = true;
}

// Off 사유 확인
function handleOffReasonConfirm() {
  if (!selectedOffCell.value) return;
  
  const { employeeId, date } = selectedOffCell.value;
  const reasonKey = selectedOffReason.value;
  const reasonLabel = OFF_REASONS[reasonKey as keyof typeof OFF_REASONS];
  
  // Off 배정 및 사유 저장
  grid.setAssignment(employeeId, date, 'O');
  grid.setOffReason(employeeId, date, reasonLabel);
  
  // 모달 닫기
  showOffReasonModal.value = false;
  selectedOffCell.value = null;
  
  showSuccess(`Off가 설정되었습니다 (${reasonLabel})`);
}

// Off 사유 모달 취소
function handleOffReasonCancel() {
  showOffReasonModal.value = false;
  selectedOffCell.value = null;
}

function handlePrev() {
  // 현재 상태 저장
  scheduleStore.setAssignments(grid.assignments.value);
  scheduleStore.prevStep();
  router.push('/schedule/step3');
}

async function handleSave() {
  if (!scheduleStore.basicInfo) {
    showError('기본 정보가 없습니다');
    return;
  }

  try {
    // 1. Store에 저장
    scheduleStore.setAssignments(grid.assignments.value);

    // 2. Shifts 로드하여 code -> id 매핑 생성
    const shifts = await loadShifts(scheduleStore.basicInfo.organizationId);
    const shiftsMap: Record<string, string> = {};
    shifts.forEach((shift) => {
      shiftsMap[shift.code] = shift.id;
    });

    // 3. 유효한 employee_id만 필터링 (현재 로드된 직원들만)
    const validEmployeeIds = new Set(grid.employees.value.map(emp => emp.id));
    const filteredAssignments: AssignmentMap = {};
    
    Object.entries(grid.assignments.value).forEach(([employeeId, dateMap]) => {
      if (validEmployeeIds.has(employeeId)) {
        filteredAssignments[employeeId] = dateMap;
      } else {
        console.warn('[handleSave] Skipping invalid employee_id:', employeeId);
      }
    });

    console.log('[handleSave] Valid employees:', validEmployeeIds.size);
    console.log('[handleSave] Filtered assignments keys:', Object.keys(filteredAssignments).length);
    console.log('[handleSave] Original assignments keys:', Object.keys(grid.assignments.value).length);
    
    // 샘플 데이터 출력 (첫 3명)
    const sampleEmployeeIds = Array.from(validEmployeeIds).slice(0, 3);
    console.log('[handleSave] Sample valid employee IDs:', sampleEmployeeIds);
    
    const filteredKeys = Object.keys(filteredAssignments).slice(0, 3);
    console.log('[handleSave] Sample filtered assignment keys:', filteredKeys);

    // 4. Supabase에 저장 (offReasons도 함께 전달)
    await saveTempAssignments(
      scheduleStore.basicInfo.organizationId,
      scheduleStore.basicInfo.month,
      filteredAssignments,
      shiftsMap,
      grid.offReasons.value
    );

    showSuccess('임시 저장되었습니다');
  } catch (error) {
    console.error('[handleSave] Error:', error);
    showError(error instanceof Error ? error.message : '임시 저장 실패');
  }
}

function handleLoadSampleData() {
  // 전월 데이터만 샘플로 채우기
  const lastMonthDates = grid.dates.value.filter(d => d.isLastMonth);
  
  if (lastMonthDates.length === 0) {
    showWarning('전월 일수를 1일 이상으로 설정해주세요');
    return;
  }
  
  // 전월 데이터에서는 'O' (Off) 제외
  const shiftCodes = ['D', 'E', 'N'];

  grid.employees.value.forEach((employee, empIndex) => {
    lastMonthDates.forEach((dateCol, dateIndex) => {
      // 각 직원마다 다른 패턴으로 배치 (순환)
      const shiftIndex = (empIndex + dateIndex) % 3;
      const shiftCode = shiftCodes[shiftIndex] || 'D';

      grid.setAssignment(employee.id, dateCol.date as string, shiftCode);
    });
  });

  showSuccess(`전월 ${lastMonthDates.length}일 샘플 데이터가 로드되었습니다`);
}

// 엑셀 템플릿 다운로드
function handleDownloadTemplate() {
  if (!scheduleStore.basicInfo) {
    showError('기본 정보가 없습니다');
    return;
  }
  
  const lastMonthDates = grid.dates.value.filter(d => d.isLastMonth);
  if (lastMonthDates.length === 0) {
    showWarning('전월 일수를 1일 이상으로 설정해주세요');
    return;
  }
  
  try {
    downloadLastMonthTemplate(
      grid.employees.value,
      grid.dates.value,
      scheduleStore.basicInfo.month
    );
    showSuccess('템플릿이 다운로드되었습니다');
  } catch (error) {
    showError(error instanceof Error ? error.message : '템플릿 다운로드 실패');
  }
}

// 엑셀 업로드 처리
async function handleExcelUpload({ file }: { file: UploadFileInfo }) {
  if (!file.file) {
    showError('파일을 선택해주세요');
    return;
  }
  
  const lastMonthDates = grid.dates.value.filter(d => d.isLastMonth);
  if (lastMonthDates.length === 0) {
    showWarning('전월 일수를 1일 이상으로 설정해주세요');
    return;
  }
  
  try {
    const { assignments: parsedAssignments, rejectedOffCount } = await parseLastMonthExcel(
      file.file,
      grid.employees.value,
      grid.dates.value
    );
    
    // 기존 assignments에 전월 데이터 덮어쓰기
    const lastMonthDateSet = new Set(lastMonthDates.map(d => d.date));
    
    grid.employees.value.forEach(emp => {
      // 안전하게 가져오거나 초기화
      let empAssignments = grid.assignments.value[emp.id];
      if (!empAssignments) {
        empAssignments = {};
        grid.assignments.value[emp.id] = empAssignments;
      }
      
      // 전월 날짜만 덮어쓰기
      lastMonthDateSet.forEach(date => {
        const shift = parsedAssignments[emp.id]?.[date];
        if (shift) {
          empAssignments[date] = shift;
        }
      });
    });
    
    // 반응성 트리거
    grid.assignments.value = { ...grid.assignments.value };
    
    const importedCount = Object.keys(parsedAssignments).length;
    
    // 성공 메시지 (제거된 'O'가 있으면 경고 추가)
    if (rejectedOffCount > 0) {
      showWarning(`${importedCount}명의 전월 데이터가 업로드되었습니다. (${rejectedOffCount}개의 'O'는 전월 데이터에서 제외되었습니다)`);
    } else {
      showSuccess(`${importedCount}명의 전월 데이터가 업로드되었습니다`);
    }
  } catch (error) {
    showError(error instanceof Error ? error.message : '엑셀 파싱 실패');
  }
}

async function handleGenerate() {
  // 1. 전월 데이터 검증 (선택적 - requireLastMonth=false)
  const validation = validateLastMonthData(
    grid.employees.value,
    grid.dates.value,
    grid.assignments.value as AssignmentMap, // 명시적 형변환 (타입 안전성 보장)
    false // 전월 데이터 필수 아님
  );

  // 경고가 있으면 사용자에게 알림 (계속 진행 가능)
  if (validation.warnings.length > 0 && lastMonthDays.value > 0) {
    const warningCount = validation.warnings.length;
    showWarning(`전월 데이터 중 ${warningCount}개 셀이 비어있습니다. 계속 진행합니다.`);
  }

  // 2. 저장 및 다음 단계
  scheduleStore.setAssignments(grid.assignments.value);

  try {
    // 3. Schedule 레코드 생성
    if (!scheduleStore.basicInfo) {
      showError('기본 정보가 없습니다');
      return;
    }

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
      // 안전장치: assignments 객체 가져오기
      const empAssignments = grid.assignments.value[emp.id] || {};

      // 미리 객체 할당
      const empLast: Record<string, string> = {};
      const empThis: Record<string, string> = {};
      
      lastMonthAssignments[emp.id] = empLast;
      thisMonthAssignments[emp.id] = empThis;

      lastMonthDates.forEach((date) => {
        const shift = empAssignments[date as string] || '';
        if (shift) {
          empLast[date as string] = shift;
        }
      });

      thisMonthDates.forEach((date) => {
        const shift = empAssignments[date as string] || '';
        if (shift) {
          empThis[date as string] = shift;
        }
      });
    });

    // 5. 요일별 requirements를 날짜별로 변환
    // 먼저 세로형 데이터를 요일별 객체로 변환
    const weeklyRequirements: Record<number, DailyRequirement> = {};

    scheduleStore.siteRequirements.forEach(req => {
      if (!weeklyRequirements[req.dayOfWeek]) {
        weeklyRequirements[req.dayOfWeek] = { D: 0, E: 0, N: 0, O: 0, total: 0 };
      }
      
      const shift = req.shiftCode as keyof DailyRequirement;
      const currentReq = weeklyRequirements[req.dayOfWeek];
      
      if (currentReq && ['D', 'E', 'N', 'O'].includes(shift)) {
        currentReq[shift] = req.requiredCount;
        currentReq.total += req.requiredCount;
      }
    });

    const dateBasedRequirements: SiteRequirements = {};
    thisMonthDates.forEach((dateStr) => {
      const date = new Date(dateStr as string);
      const dayOfWeek = date.getDay(); // 0-6
      const weeklyReq = weeklyRequirements[dayOfWeek];
      
      if (weeklyReq) {
        dateBasedRequirements[dateStr as string] = { ...weeklyReq };
      } else {
        // 기본값
        dateBasedRequirements[dateStr as string] = { D: 0, E: 0, N: 0, O: 0, total: 0 };
      }
    });

    // 6. Planning Payload 구성
    console.log('[Step4] Building Planning Payload...');

    // 날짜 계산 로직 (순서 이동: 배정 처리에 필요함)
    const monthStr = scheduleStore.basicInfo.month; // "2025-12"
    const [year, month] = monthStr.split('-').map(Number);
    const firstDraftDate = `${monthStr}-01`;
    const draftLength = new Date(year, month, 0).getDate();
    
    // publishLength: 전월 데이터 표시 일수
    const publishLength = lastMonthDays.value > 0 ? lastMonthDays.value : 0;

    // lastHistoricalDate calculation: Day before the history starts.
    const prevMonthLastDate = new Date(year, month - 1, 0); 
    const prevMonthLastDay = prevMonthLastDate.getDate(); 
    const historicalAnchorDay = prevMonthLastDay - publishLength; 
    
    const prevYear = prevMonthLastDate.getFullYear();
    const prevMonth = String(prevMonthLastDate.getMonth() + 1).padStart(2, '0');
    const lastHistoricalDate = `${prevYear}-${prevMonth}-${String(historicalAnchorDay).padStart(2, '0')}`;
    
    // 6-1. 조직 정보 조회 (기본 정보)
    const orgBasic = await getPlanningOrganization(scheduleStore.basicInfo.organizationId);
    console.log('[Step4] Organization Basic:', orgBasic);
    
    // 6-2. 시프트 정보 조회
    const shifts = await getPlanningShifts(scheduleStore.basicInfo.organizationId);
    console.log('[Step4] Shifts count:', shifts.length);
    
    // 6-3. 직원 정보 조회
    const employees = await getPlanningEmployees(scheduleStore.basicInfo.organizationId);
    console.log('[Step4] Employees count:', employees.length);
    
    // 6-4. 기존 배정 정보 조회 (schedule_assignments 테이블에서)
    const existingAssignments = await getPlanningAssignments(schedule.id);
    console.log('[Step4] Existing assignments count:', existingAssignments.length);
    
    // 6-5. 현재 그리드의 assignments를 PlanningAssignment 형식으로 변환
    const shiftsMap: Record<string, string> = {};
    const shiftsData = await loadShifts(scheduleStore.basicInfo.organizationId);
    shiftsData.forEach((shift) => {
      shiftsMap[shift.code] = shift.id;
    });
    
    const gridAssignments: PlanningAssignment[] = [];
    Object.entries(grid.assignments.value).forEach(([employeeId, dateMap]) => {
      Object.entries(dateMap).forEach(([date, shiftCode]) => {
        if (shiftCode && shiftsMap[shiftCode]) {
          // off_reason이 있으면 is_locked=true (Off 사유 - 사용자 명시적 지정)
          const offReason = grid.offReasons.value[employeeId]?.[date];
          
          // Locking Logic:
          // 1. Historical data (date < firstDraftDate) -> Always LOCKED
          // 2. Future data -> Locked only if User explicitly set Off (offReason exists)
          let isLocked = !!offReason;
          if (date < firstDraftDate) {
            isLocked = true;
          }
          
          gridAssignments.push({
            employee_id: employeeId,
            shift_id: shiftsMap[shiftCode],
            date,
            is_locked: isLocked,
          });
        }
      });
    });
    
    // 6-6. 기존 배정과 그리드 배정 병합 (그리드 우선)
    const assignmentMap = new Map<string, PlanningAssignment>();
    
    // 기존 배정 먼저 추가
    existingAssignments.forEach(assignment => {
      // Re-evaluate lock logic for existing assignments too
      let isLocked = assignment.is_locked;
      if (assignment.date < firstDraftDate) {
        isLocked = true;
      }

      const key = `${assignment.employee_id}_${assignment.date}`;
      assignmentMap.set(key, { ...assignment, is_locked: isLocked });
    });
    
    // 그리드 배정으로 덮어쓰기 (최신 데이터 우선)
    gridAssignments.forEach(assignment => {
      const key = `${assignment.employee_id}_${assignment.date}`;
      assignmentMap.set(key, assignment);
    });
    
    const finalAssignments = Array.from(assignmentMap.values());
    console.log('[Step4] Final assignments count:', finalAssignments.length);

    // 6-7. Planning Payload 구성
    const planningPayload: PlanningPayload = {
      organization: {
        ...orgBasic,
        shifts,
        lastHistoricalDate,
        firstDraftDate,
        publishLength,
        draftLength,
      },
      // shifts, // Removed from top-level
      employees,
      assignments: finalAssignments,
      requirements: dateBasedRequirements,
    };
    
    // 6-8. Planning Payload 검증
    const validation = validatePlanningPayload(planningPayload);
    console.log('[Step4] Planning Payload Validation:', validation);
    console.log(summarizePlanningPayload(planningPayload));
    
    if (!validation.valid) {
      console.error('[Step4] Planning Payload validation failed:', validation.errors);
      showError(`Planning Payload 검증 실패: ${validation.errors[0]}`);
      return;
    }
    
    if (validation.warnings.length > 0) {
      console.warn('[Step4] Planning Payload warnings:', validation.warnings);
    }
    
    // 디버깅: Planning Payload 출력 및 다운로드 (개발 모드)
    console.log('[Step4] Planning Payload:', JSON.stringify(planningPayload, null, 2));
    
    // 개발 환경에서 Planning Payload를 JSON 파일로 다운로드
    if (import.meta.env.DEV) {
      try {
        const dataStr = JSON.stringify(planningPayload, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `planning-payload-${scheduleStore.basicInfo.month}.json`;
        link.click();
        URL.revokeObjectURL(url);
        console.log('[Step4] Planning Payload downloaded as JSON file');
      } catch (downloadError) {
        console.warn('[Step4] Failed to download Planning Payload:', downloadError);
      }
    }

    // 7. 모달 표시 및 타이머 시작
    showModal.value = true;
    elapsedTime.value = 0;
    timerInterval = window.setInterval(() => {
      elapsedTime.value++;
    }, 1000);

    // 8. AI Solver 시작 (Planning Payload 전달)
    // await solver.startSolver(
    //   schedule.id,
    //   {
    //     scheduleId: schedule.id,
    //     employees: grid.employees.value,
    //     requirements: dateBasedRequirements,
    //     lastMonthAssignments,
    //     thisMonthAssignments,
    //   },
    //   scheduleStore.basicInfo.organizationId,
    //   planningPayload // Planning Payload 전달
    // );

    // 9. 상태 변화 감지 및 자동 이동
    const checkStatusInterval = setInterval(() => {
      if (solver.status.value === 'complete') {
        clearInterval(checkStatusInterval);
        if (timerInterval) clearInterval(timerInterval);

        // LocalStorage 삭제 (임시 저장 불필요)
        if (STORAGE_KEY.value) {
          localStorage.removeItem(STORAGE_KEY.value);
        }

        // Step 5 (결과 확인)로 이동
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
  } catch (error) {
    if (timerInterval) clearInterval(timerInterval);
    showModal.value = false;
    console.error('[handleGenerate] Error:', error);
    const errorMessage = error instanceof Error ? error.message : '근무표 생성 중 오류가 발생했습니다';
    showError(errorMessage);
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