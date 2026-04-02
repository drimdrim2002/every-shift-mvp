<template>
  <div class="mx-auto max-w-7xl px-4">
    <StepIndicator :current-step="3" />

    <n-card title="근무표 생성 - 직원 정보 입력">
      <n-alert
        type="info"
        class="mb-6"
      >
        직원 정보를 입력하세요. 엑셀 파일을 업로드하거나 직접 입력할 수 있습니다.
      </n-alert>

      <!-- 탭 UI -->
      <n-tabs
        v-model:value="activeTab"
        type="line"
        class="mb-6"
      >
        <n-tab-pane
          name="manual"
          tab="직접 입력"
        >
          <EmployeeTable
            :employees="employees"
            :shifts="shifts"
            @add="handleAddEmployee"
            @edit="handleEditEmployee"
            @delete="handleDeleteEmployee"
          />
        </n-tab-pane>

        <n-tab-pane
          name="excel"
          tab="엑셀 업로드"
        >
          <EmployeeExcelUpload
            :shifts="shifts"
            @upload="handleExcelUpload"
          />

          <!-- 업로드된 데이터 미리보기 -->
          <div
            v-if="employees.length > 0"
            class="mt-6"
          >
            <h4 class="mb-4 text-lg font-medium">
              업로드된 직원 목록 ({{ employees.length }}명)
            </h4>
            <EmployeeTable
              :employees="employees"
              :shifts="shifts"
              @add="handleAddEmployee"
              @edit="handleEditEmployee"
              @delete="handleDeleteEmployee"
            />
          </div>
        </n-tab-pane>
      </n-tabs>

      <!-- 버튼 -->
      <div class="flex justify-between pt-6">
        <n-popconfirm @positive-click="handlePrev">
          <template #trigger>
            <n-button size="medium">
              ← 이전
            </n-button>
          </template>
          이전 단계로 돌아가면 현재 입력한 데이터가 초기화됩니다. 계속하시겠습니까?
        </n-popconfirm>
        <div class="flex gap-4">
          <n-button
            size="medium"
            :disabled="!canProceed"
            :loading="isSaving"
            @click="handleSave"
          >
            {{ hasUnsavedChanges ? '저장 *' : '저장' }}
          </n-button>
          <n-button
            type="primary"
            size="medium"
            :disabled="!canProceed || hasUnsavedChanges"
            @click="handleNext"
          >
            다음 단계 →
          </n-button>
        </div>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { NCard, NButton, NAlert, NTabs, NTabPane, NPopconfirm } from 'naive-ui';
import StepIndicator from '@/components/schedule/StepIndicator.vue';
import EmployeeTable from '@/components/schedule/EmployeeTable.vue';
import EmployeeExcelUpload from '@/components/schedule/EmployeeExcelUpload.vue';
import { useAuthStore } from '@/stores/auth';
import { useScheduleStore } from '@/stores/schedule';
import { useOrganizationStore } from '@/stores/organization';
import { deleteOrganizationEmployees, createEmployeesBatch } from '@/api/employee';
import {
  getLatestScheduleByOrganizationMonth,
  getPhase2ScheduleCompare,
  getScheduleStatus,
} from '@/api/schedule';
import { supabase } from '@/api/supabase';
import { buildStep5Route, resolveStep5VersionState } from '@/utils/scheduleVersionResolver';
import { showError, showInfo, showSuccess, showWarning } from '@/utils/message';
import { clearScopedTempPreferencesStorage } from '@/utils/tempPreferencesStorage';
import type { EmployeeInput } from '@/types/employee';
import type { Shift } from '@/types/shift';

const router = useRouter();
const authStore = useAuthStore();
const scheduleStore = useScheduleStore();
const orgStore = useOrganizationStore();

// State
const activeTab = ref<'manual' | 'excel'>('manual');
const employees = ref<EmployeeInput[]>([]);
const isSaving = ref(false);
const hasUnsavedChanges = ref(false); // 저장되지 않은 변경사항 추적

// 시프트 목록
const shifts = computed<Shift[]>(() => {
  return scheduleStore.basicInfo?.shifts || orgStore.shifts || [];
});

// 진행 가능 여부
const canProceed = computed(() => {
  return employees.value.length > 0;
});

// 초기화
onMounted(async () => {
  if (!scheduleStore.basicInfo) {
    router.push('/schedule/step1');
    return;
  }

  // 1. Store에 저장된 데이터가 있으면 복원 (새로 생성하는 경우)
  if (scheduleStore.employees.length > 0) {
    employees.value = [...scheduleStore.employees];
    hasUnsavedChanges.value = false;
    return;
  }

  // 2. DB에서 기존 직원 정보 불러오기 (수정하는 경우)
  try {
    const orgId = scheduleStore.basicInfo.organizationId;
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('organization_id', orgId)
      .order('employee_id');

    if (error) {
      console.error('[Step3] Load employees error:', error);
      return;
    }

    if (data && data.length > 0) {
      // DB 데이터를 EmployeeInput 형식으로 변환
      employees.value = data.map((emp: {
        employee_id: string;
        name: string;
        available_shifts: string[];
      }) => ({
        employeeId: emp.employee_id,
        name: emp.name,
        availableShifts: emp.available_shifts,
      }));
      
      // DB에서 불러온 데이터는 저장된 상태
      hasUnsavedChanges.value = false;
      
      showInfo(`기존 직원 ${employees.value.length}명을 불러왔습니다.`);
    } else {
      // DB에 데이터가 없으면 처음 입력하는 상태
      hasUnsavedChanges.value = false;
    }
  } catch (error) {
    console.error('[Step3] Failed to load employees:', error);
  }
});

// 직원 추가 핸들러
function handleAddEmployee(employee: EmployeeInput) {
  employees.value = [...employees.value, employee];
  hasUnsavedChanges.value = true;
}

// 직원 수정 핸들러
function handleEditEmployee(index: number, employee: EmployeeInput) {
  const updated = [...employees.value];
  updated[index] = employee;
  employees.value = updated;
  hasUnsavedChanges.value = true;
}

// 직원 삭제 핸들러
function handleDeleteEmployee(index: number) {
  employees.value = employees.value.filter((_, i) => i !== index);
  hasUnsavedChanges.value = true;
}

// 엑셀 업로드 핸들러
function handleExcelUpload(uploadedEmployees: EmployeeInput[]) {
  employees.value = uploadedEmployees;
  hasUnsavedChanges.value = true;
  showSuccess(`${uploadedEmployees.length}명의 직원이 업로드되었습니다.`);
}

async function performEmployeeResave(orgId: string) {
  isSaving.value = true;

  try {
    // 1. 기존 직원 ID 조회
    const { data: existingEmployees } = await supabase
      .from('employees')
      .select('id')
      .eq('organization_id', orgId);

    // 2. 기존 직원들의 schedule_assignments 먼저 삭제 (외래 키 제약 조건 해결)
    if (existingEmployees && existingEmployees.length > 0) {
      const employeeIds = existingEmployees.map((employee) => employee.id);
      const { error: assignmentError } = await supabase
        .from('schedule_assignments')
        .delete()
        .in('employee_id', employeeIds);

      if (assignmentError) {
        console.error('[handleSave] Assignment delete error:', assignmentError);
        throw new Error(`배정 데이터 삭제 실패: ${assignmentError.message}`);
      }

      console.log('[Step3] Deleted schedule_assignments for', employeeIds.length, 'employees');
    }

    // 3. 현재 month의 모든 schedules 삭제 (직원 재생성 시 이전 schedule 무효화)
    if (scheduleStore.basicInfo) {
      const { error: scheduleDeleteError } = await supabase
        .from('schedules')
        .delete()
        .eq('organization_id', orgId)
        .eq('month', scheduleStore.basicInfo.month);

      if (scheduleDeleteError) {
        console.error('[Step3] Schedule delete error:', scheduleDeleteError);
        console.warn('[Step3] Failed to delete schedules, continuing...');
      } else {
        console.log('[Step3] Deleted schedules for month:', scheduleStore.basicInfo.month);
        scheduleStore.setBasicInfo({
          ...scheduleStore.basicInfo,
          scheduleId: undefined,
        });
        scheduleStore.setSelectedVersionId(null);
        scheduleStore.setPreviewVersionId(null);
      }
    }

    // 4. 기존 직원 삭제
    await deleteOrganizationEmployees(orgId);

    // 5. 새 직원 일괄 생성
    await createEmployeesBatch(orgId, employees.value);

    // 6. Store 업데이트
    scheduleStore.setEmployees(employees.value);

    // basicInfo의 employeeCount 업데이트
    scheduleStore.setBasicInfo({
      ...scheduleStore.basicInfo,
      employeeCount: employees.value.length,
    });

    // 7. 임시키 정리 (동일 사용자/조직/월 범위 + 레거시 키)
    const clearedStorageKeys = clearScopedTempPreferencesStorage({
      userId: authStore.user?.id,
      organizationId: scheduleStore.basicInfo.organizationId,
      month: scheduleStore.basicInfo.month,
    });
    console.log('[Step3] Cleared temp preference storage keys:', clearedStorageKeys);

    // 8. Store의 assignments도 초기화
    scheduleStore.setAssignments({});

    // 9. 저장 완료 플래그
    hasUnsavedChanges.value = false;

    showSuccess('직원 정보가 저장되었습니다.');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.';
    showError(errorMessage);
  } finally {
    isSaving.value = false;
  }
}

async function getCurrentMonthScheduleState(): Promise<{ id: string; status: string } | null> {
  return getTargetScheduleForNextStep();
}

// 저장 핸들러
async function handleSave() {
  if (employees.value.length === 0) {
    showWarning('최소 1명 이상의 직원을 등록해주세요.');
    return;
  }

  if (!scheduleStore.basicInfo) {
    showError('기본 정보가 없습니다. 다시 시도해주세요.');
    return;
  }

  const orgId = scheduleStore.basicInfo.organizationId;
  const currentMonthSchedule = await getCurrentMonthScheduleState();

  if (!currentMonthSchedule) {
    await performEmployeeResave(orgId);
    return;
  }

  try {
    const compareResponse = await getPhase2ScheduleCompare(currentMonthSchedule.id);

    if (compareResponse.finalizedVersionId) {
      showError('현재 월에 확정된 근무표가 있어 직원 정보를 다시 저장할 수 없습니다.');
      return;
    }

    if ((compareResponse.versions?.length ?? 0) > 0) {
      if (!window.$dialog?.warning) {
        showError('확인 대화상자를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      window.$dialog.warning({
        title: '직원 정보 저장 확인',
        content: '현재 월의 근무표와 버전이 모두 삭제됩니다. 계속 저장하시겠습니까?',
        positiveText: '계속 저장',
        negativeText: '취소',
        onPositiveClick: async () => {
          await performEmployeeResave(orgId);
        },
      });
      return;
    }
  } catch (error) {
    console.warn('[Step3] Failed to check current month version state:', error);
    showError('현재 월의 근무표 상태를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.');
    return;
  }

  await performEmployeeResave(orgId);
}

// 이전 버튼 핸들러
function handlePrev() {
  scheduleStore.prevStep();
  router.push('/schedule/step2');
}

async function getTargetScheduleForNextStep(): Promise<{ id: string; status: string } | null> {
  const basicInfo = scheduleStore.basicInfo;
  if (!basicInfo) return null;

  // 1) scheduleId가 있으면 우선 조회
  if (basicInfo.scheduleId) {
    try {
      const schedule = await getScheduleStatus(basicInfo.scheduleId);
      if (schedule?.id && schedule?.status) {
        return { id: schedule.id, status: schedule.status };
      }
    } catch (error) {
      console.warn('[Step3] Failed to load schedule by id:', error);
    }
  }

  // 2) fallback: 조직+월 기준 최신 schedule 조회
  try {
    const latest = await getLatestScheduleByOrganizationMonth(
      basicInfo.organizationId,
      basicInfo.month
    );
    if (!latest || !latest.id || !latest.status) return null;

    return { id: latest.id, status: latest.status };
  } catch (error) {
    console.warn('[Step3] Failed to query latest schedule:', error);
    return null;
  }
}

async function hasPersistedEmployees(orgId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId);

  if (error) {
    throw new Error(`직원 저장 상태 확인 실패: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

// 다음 버튼 핸들러
async function handleNext() {
  if (employees.value.length === 0) {
    showWarning('최소 1명 이상의 직원을 등록해주세요.');
    return;
  }

  // 저장되지 않은 변경사항이 있으면 경고
  if (hasUnsavedChanges.value) {
    showWarning('변경사항을 먼저 저장해주세요.');
    return;
  }

  if (!scheduleStore.basicInfo) {
    showError('기본 정보가 없습니다. Step1부터 다시 진행해주세요.');
    return;
  }

  try {
    const persistedExists = await hasPersistedEmployees(scheduleStore.basicInfo.organizationId);
    if (!persistedExists) {
      showWarning('저장된 직원 정보가 없습니다. Step3에서 저장 후 다시 진행해주세요.');
      return;
    }
  } catch (error) {
    showError(error instanceof Error ? error.message : '직원 저장 상태 확인 중 오류가 발생했습니다.');
    return;
  }

  // Store에 저장 (이미 DB에 저장되어 있음)
  if (scheduleStore.basicInfo) {
    scheduleStore.setEmployees(employees.value);
    scheduleStore.setBasicInfo({
      ...scheduleStore.basicInfo,
      employeeCount: employees.value.length,
    });
  }

  const targetSchedule = await getTargetScheduleForNextStep();

  if (targetSchedule && (targetSchedule.status === 'complete' || targetSchedule.status === 'changed')) {
    if (scheduleStore.basicInfo) {
      scheduleStore.setBasicInfo({
        ...scheduleStore.basicInfo,
        scheduleId: targetSchedule.id,
      });
    }
    try {
      const compareResponse = await getPhase2ScheduleCompare(targetSchedule.id);
      const resolvedState = resolveStep5VersionState(
        compareResponse,
        scheduleStore.previewVersionId
      );

      scheduleStore.setSelectedVersionId(resolvedState.selectedVersionId);
      scheduleStore.setPreviewVersionId(resolvedState.previewVersionId);
      scheduleStore.currentStep = 5;
      router.push(buildStep5Route(targetSchedule.id, resolvedState.previewVersionId));
      return;
    } catch (error) {
      console.warn('[Step3] Failed to resolve Step5 preview version:', error);
      showError('선택한 근무표 버전을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }
  }

  scheduleStore.nextStep();
  router.push('/schedule/step4');
}
</script>
