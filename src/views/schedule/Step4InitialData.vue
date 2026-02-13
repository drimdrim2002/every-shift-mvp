<template>
  <div class="mx-auto flex h-full max-w-full flex-col px-4">
    <StepIndicator
      :current-step="4"
      class="mb-4"
    />

    <div class="flex min-h-0 flex-1 gap-4">
      <!-- Center Panel: Grid -->
      <div class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-white shadow-sm">
        <!-- Debug Info (Dev Only) -->
        <div
          v-if="isDev"
          class="border-b border-yellow-300 bg-yellow-100 p-2 font-mono text-xs"
        >
          DEBUG: Employees={{ grid.employees.value.length }}, Dates={{ grid.dates.value.length }}, Loading={{ grid.loading.value }}
          <span v-if="grid.employees.value.length > 0">Sample Emp: {{ grid.employees.value[0]?.name }}</span>
        </div>

        <div class="flex items-center justify-between border-b bg-gray-50 p-4">
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-bold text-gray-800">
              {{ scheduleStore.basicInfo?.month }}월 제약사항 입력
            </h2>
            <span
              v-if="orgStore.current"
              class="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
            >
              {{ orgStore.current.name }}
            </span>
          </div>
          <!-- Tips -->
          <div class="flex gap-3 text-xs text-gray-400">
            <span>👆 셀 클릭: H → E → O → 빈칸</span>
            <span>🖱️ 우클릭: 코멘트 작성</span>
          </div>
        </div>
        
        <div class="relative flex-1 overflow-hidden">
          <n-spin
            :show="grid.loading.value"
            class="h-full"
          >
            <div class="absolute inset-0 overflow-hidden">
              <ScheduleGrid
                v-if="grid.employees.value.length > 0 && grid.dates.value.length > 0"
                class="h-full"
                mode="planning"
                :employees="grid.employees.value"
                :dates="grid.dates.value"
                :assignments="grid.assignments.value"
                :off-reasons="grid.offReasons.value"
                :comments="grid.comments.value"
                :readonly="false"
                :show-last-month="false"
                @update:assignment="handleAssignmentUpdate"
                @context-menu="handleContextMenu"
                @header-click="handleHeaderClick"
              />
              <div
                v-else-if="!grid.loading.value"
                class="flex h-full items-center justify-center text-gray-400"
              >
                직원 데이터 또는 날짜 데이터가 없습니다. (Emp: {{ grid.employees.value.length }}, Date: {{ grid.dates.value.length }})
              </div>
            </div>
          </n-spin>
        </div>
      </div>

      <!-- Right Panel: Summary -->
      <ScheduleSummary
        :stats="grid.statistics.value"
        :employees="grid.employees.value"
        class="w-64 flex-none"
      />
    </div>

    <!-- Bottom Actions -->
    <div class="mt-4 flex items-center justify-between border-t bg-white py-4">
      <n-button
        size="large"
        @click="handlePrev"
      >
        ← 이전 단계
      </n-button>
      
      <div class="flex gap-3">
        <n-button
          size="large"
          @click="handleSave"
        >
          임시 저장
        </n-button>
        <n-button
          type="primary"
          size="large"
          :loading="isSubmitting"
          :disabled="isSubmitting"
          @click="handleGenerate"
        >
          근무표 생성 (AI) →
        </n-button>
      </div>
    </div>

    <!-- Modals -->
    <CommentModal
      v-model:show="showCommentModal"
      :employee-name="selectedCell?.employeeName || ''"
      :date="selectedCell?.date || ''"
      :initial-value="selectedCellComment"
      @save="handleSaveComment"
    />

    <DaySummaryModal
      v-model:show="showDaySummaryModal"
      :date="selectedDateSummary || ''"
      :employees="grid.employees.value"
      :assignments="grid.assignments.value"
      :comments="grid.comments.value"
      @close="showDaySummaryModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useScheduleStore } from '@/stores/schedule';
import { useOrganizationStore } from '@/stores/organization';
import { useScheduleGrid } from '@/composables/useScheduleGrid';
import {
  getScheduleAssignments,
  saveTempAssignments,
  getPlanningEmployees,
  getPlanningAssignments,
} from '@/api/schedule';
import { loadShifts } from '@/api/shift';
import { supabase } from '@/api/supabase';
import { mapToSolverRequest } from '@/utils/solverMapper';
import {
  NButton, NSpin
} from 'naive-ui';
import ScheduleGrid from '@/components/schedule/ScheduleGrid.vue';
import ScheduleSummary from '@/components/schedule/ScheduleSummary.vue';
import StepIndicator from '@/components/schedule/StepIndicator.vue';
import CommentModal from '@/components/schedule/CommentModal.vue';
import DaySummaryModal from '@/components/schedule/DaySummaryModal.vue';
import { showError, showInfo, showSuccess } from '@/utils/message';
import { watchDebounced } from '@vueuse/core';

const router = useRouter();
const scheduleStore = useScheduleStore();
const orgStore = useOrganizationStore();
const grid = useScheduleGrid();

const isSubmitting = ref(false);
const existingScheduleId = ref<string | null>(null);
const isDev = import.meta.env.DEV;

// Modals state
const showCommentModal = ref(false);
const selectedCell = ref<{ employeeId: string; employeeName: string; date: string } | null>(null);
const showDaySummaryModal = ref(false);
const selectedDateSummary = ref<string>('');

const selectedCellComment = computed(() => {
  if (!selectedCell.value) return '';
  return grid.getComment(selectedCell.value.employeeId, selectedCell.value.date) || '';
});


// Callbacks
function handleAssignmentUpdate(payload: { employeeId: string; date: string; shiftCode: string }) {
  grid.setAssignment(payload.employeeId, payload.date, payload.shiftCode);
  
  if (payload.shiftCode === 'O') {
      if (!grid.getOffReason(payload.employeeId, payload.date)) {
          grid.setOffReason(payload.employeeId, payload.date, 'VACATION'); 
      }
  } else {
      grid.setOffReason(payload.employeeId, payload.date, '');
  }
}

function handleContextMenu(payload: { event: MouseEvent; employeeId: string; date: string }) {
  const employee = grid.employees.value.find(e => e.id === payload.employeeId);
  if (!employee) return;

  selectedCell.value = {
    employeeId: payload.employeeId,
    employeeName: employee.name,
    date: payload.date
  };
  showCommentModal.value = true;
}

function handleSaveComment(comment: string) {
  if (!selectedCell.value) return;
  grid.setComment(selectedCell.value.employeeId, selectedCell.value.date, comment);
  showSuccess('코멘트가 저장되었습니다.');
}

function handleHeaderClick(date: string) {
  selectedDateSummary.value = date;
  showDaySummaryModal.value = true;
}

// Watchers for LocalStorage
const STORAGE_KEY = computed(() => {
  if (!scheduleStore.basicInfo) return '';
  return `everyshift_temp_schedule_${scheduleStore.basicInfo.month}`;
});

watchDebounced(
  [
      () => grid.assignments.value, 
      () => grid.offReasons.value,
      () => grid.comments.value
  ],
  ([assignments, offReasons, comments]) => {
    if (STORAGE_KEY.value) {
      const dataToSave = { assignments, offReasons, comments };
      localStorage.setItem(STORAGE_KEY.value, JSON.stringify(dataToSave));
    }
  },
  { debounce: 2000, deep: true }
);

// Lifecycle
onMounted(async () => {
  console.log('[Step4] Mounted');
  if (!scheduleStore.basicInfo) {
    console.log('[Step4] No basicInfo, redirecting');
    router.push('/schedule/step1');
    return;
  }

  // Reload Org info to ensure name is available
  if (!orgStore.current) {
      await orgStore.loadOrganization(scheduleStore.basicInfo.organizationId);
  }

  await grid.loadEmployees(scheduleStore.basicInfo.organizationId);
  // Default to 0 days from last month for now, as user requested to remove the toggle
  grid.generateDates(scheduleStore.basicInfo.month, 0); 
  
  // Restore logic (Supabase -> LocalStorage)
  await restoreData();
});

async function restoreData() {
    let dataRestored = false;
    
    // 1. Supabase
    try {
        const { data: existingSchedules } = await supabase
            .from('schedules')
            .select('id, status')
            .eq('organization_id', scheduleStore.basicInfo!.organizationId)
            .eq('month', scheduleStore.basicInfo!.month)
            .order('created_at', { ascending: false })
            .limit(1);

        if (existingSchedules && existingSchedules.length > 0) {
            const schedule = existingSchedules[0];
            if (!schedule) return;

            existingScheduleId.value = schedule.id;
            
            if (schedule.status === 'complete' || schedule.status === 'changed') {
                scheduleStore.currentStep = 5;
                router.replace(`/schedule/step5/${schedule.id}`);
                return;
            }

            const { assignments, offReasons, comments } = await getScheduleAssignments(schedule.id);
            if (Object.keys(assignments).length > 0) {
                grid.assignments.value = { ...grid.assignments.value, ...assignments };
                grid.offReasons.value = { ...grid.offReasons.value, ...offReasons };
                grid.comments.value = { ...grid.comments.value, ...comments };
                dataRestored = true;
                showInfo('저장된 데이터를 불러왔습니다.');
            }
        }
    } catch (e) {
        console.error('Failed to load from Supabase', e);
    }

    // 2. LocalStorage
    if (!dataRestored && STORAGE_KEY.value) {
        const saved = localStorage.getItem(STORAGE_KEY.value);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const savedAssignments = parsed.assignments || parsed; 
                const savedOffReasons = parsed.offReasons || {};
                const savedComments = parsed.comments || {};
                
                grid.assignments.value = { ...grid.assignments.value, ...savedAssignments };
                grid.offReasons.value = { ...grid.offReasons.value, ...savedOffReasons };
                grid.comments.value = { ...grid.comments.value, ...savedComments };
                
                showInfo('이전 작업이 복원되었습니다 (LocalStorage)');
            } catch {
                localStorage.removeItem(STORAGE_KEY.value);
            }
        }
    }
}

// Actions
function handlePrev() {
  scheduleStore.setAssignments(grid.assignments.value);
  scheduleStore.setComments(grid.comments.value);
  scheduleStore.prevStep();
  router.push('/schedule/step3');
}

async function handleSave(): Promise<string | undefined> {
    if (!scheduleStore.basicInfo) return;
    
    try {
        scheduleStore.setAssignments(grid.assignments.value);
        scheduleStore.setComments(grid.comments.value);
        
        const shifts = await loadShifts(scheduleStore.basicInfo.organizationId);
        const shiftsMap: Record<string, string> = {};
        shifts.forEach(s => shiftsMap[s.code] = s.id);

        const schedule = await saveTempAssignments(
            scheduleStore.basicInfo.organizationId,
            scheduleStore.basicInfo.month,
            grid.assignments.value,
            shiftsMap,
            grid.offReasons.value,
            grid.comments.value
        );
        showSuccess('임시 저장되었습니다.');
        return schedule.id;
    } catch (e) {
        showError('저장 실패: ' + (e instanceof Error ? e.message : String(e)));
    }
}

async function handleGenerate() {
  if (isSubmitting.value) return;
  isSubmitting.value = true;

  try {
    const scheduleId = await handleSave();
    if (!scheduleId) throw new Error('임시 저장에 실패했습니다.');

    const planningEmployees = await getPlanningEmployees(scheduleStore.basicInfo!.organizationId);
    
    // 기존 배정 데이터 조회
    const existingAssignments = await getPlanningAssignments(scheduleId);

    // 주간 요구사항 집계
    const weeklyRequirements: Record<number, any> = {};
    scheduleStore.siteRequirements.forEach(req => {
       if (!weeklyRequirements[req.dayOfWeek]) {
         weeklyRequirements[req.dayOfWeek] = { D: 0, E: 0, N: 0, O: 0, total: 0 };
       }
       const currentReq = weeklyRequirements[req.dayOfWeek];
       const shift = req.shiftCode;
       if (['D', 'E', 'N', 'O'].includes(shift)) {
         currentReq[shift] = req.requiredCount;
         currentReq.total += req.requiredCount;
       }
    });

    // 일자별 요구사항 생성
    const dateBasedRequirements: Record<string, any> = {};
    grid.dates.value.forEach(d => {
       if (d.isLastMonth) return;
       
       const dateObj = new Date(d.date);
       const dayOfWeek = dateObj.getDay(); 
       const weeklyReq = weeklyRequirements[dayOfWeek];
       
       if (weeklyReq) {
         dateBasedRequirements[d.date] = { ...weeklyReq };
       } else {
         dateBasedRequirements[d.date] = { D: 0, E: 0, N: 0, O: 0, total: 0 };
       }
    });

    const solverRequest = mapToSolverRequest(
      scheduleStore.basicInfo!,
      dateBasedRequirements, 
      grid.assignments.value,
      grid.offReasons.value,
      planningEmployees,
      scheduleStore.basicInfo!.shifts,
      existingAssignments
    );

    scheduleStore.setPendingSolverRequest(scheduleId, solverRequest);
    scheduleStore.currentStep = 5;
    router.push(`/schedule/step5/${scheduleId}`);

  } catch (error) {
    console.error(error);
    showError(error instanceof Error ? error.message : '근무표 생성 요청 중 오류가 발생했습니다.');
  } finally {
    isSubmitting.value = false;
  }
}
</script>
