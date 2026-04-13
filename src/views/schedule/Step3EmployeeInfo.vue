<template>
  <div class="mx-auto max-w-7xl px-4">
    <StepIndicator :current-step="3" />

    <n-card title="근무표 생성 - 직원 정보 입력">
      <div
        v-if="isInitialLoading"
        class="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500"
      >
        직원 정보를 불러오는 중입니다.
      </div>

      <template v-else>
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
              :validation-preview="null"
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
        <div class="flex justify-end gap-3 pt-6">
          <n-button
            v-if="cameFromDashboard"
            size="medium"
            @click="handleReturnToDashboard"
          >
            근무표 관리로 돌아가기
          </n-button>
          <n-button
            type="primary"
            size="medium"
            :disabled="isSaving"
            :loading="isSaving"
            @click="handleSave"
          >
            저장
          </n-button>
        </div>
      </template>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NCard, NButton, NAlert, NTabs, NTabPane } from 'naive-ui';
import StepIndicator from '@/components/schedule/StepIndicator.vue';
import EmployeeTable from '@/components/schedule/EmployeeTable.vue';
import EmployeeExcelUpload from '@/components/schedule/EmployeeExcelUpload.vue';
import { useAuthStore } from '@/stores/auth';
import { useScheduleStore } from '@/stores/schedule';
import { useOrganizationStore } from '@/stores/organization';
import { applyEmployeeImport } from '@/api/ops';
import {
  getLatestScheduleByOrganizationMonth,
  getPhase2ScheduleCompare,
  getScheduleStatus,
} from '@/api/schedule';
import { supabase } from '@/api/supabase';
import { showError, showInfo, showSuccess, showWarning } from '@/utils/message';
import { clearScopedTempPreferencesStorage } from '@/utils/tempPreferencesStorage';
import type { EmployeeInput } from '@/types/employee';
import type { Shift } from '@/types/shift';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const scheduleStore = useScheduleStore();
const orgStore = useOrganizationStore();

// State
const activeTab = ref<'manual' | 'excel'>('manual');
const employees = ref<EmployeeInput[]>([]);
const isSaving = ref(false);
const isInitialLoading = ref(true);
const baselineEmployeesSnapshot = ref('');

// 시프트 목록
const shifts = computed<Shift[]>(() => {
  return scheduleStore.basicInfo?.shifts || orgStore.shifts || [];
});

const cameFromDashboard = computed(() => route.query.from === 'dashboard');
const hasUnsavedChanges = computed(() => {
  return serializeEmployees(employees.value) !== baselineEmployeesSnapshot.value;
});

// 초기화
onMounted(async () => {
  if (!scheduleStore.basicInfo) {
    router.push('/schedule/step1');
    return;
  }

  // 1. Store에 저장된 데이터가 있으면 복원 (새로 생성하는 경우)
  if (scheduleStore.employees.length > 0) {
    employees.value = cloneEmployees(scheduleStore.employees);
    setBaselineEmployeesSnapshot(employees.value);
    isInitialLoading.value = false;
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
        rank_code?: string | null;
      }) => ({
        employeeId: emp.employee_id,
        name: emp.name,
        availableShifts: emp.available_shifts,
        rankCode: emp.rank_code ?? null,
      }));

      setBaselineEmployeesSnapshot(employees.value);
      showInfo(`기존 직원 ${employees.value.length}명을 불러왔습니다.`);
    } else {
      employees.value = [];
      setBaselineEmployeesSnapshot([]);
    }
  } catch (error) {
    console.error('[Step3] Failed to load employees:', error);
    setBaselineEmployeesSnapshot(employees.value);
  } finally {
    isInitialLoading.value = false;
  }
});

function cloneEmployees(list: EmployeeInput[]): EmployeeInput[] {
  return list.map((employee) => ({
    employeeId: employee.employeeId,
    name: employee.name,
    availableShifts: [...employee.availableShifts],
    rankCode: employee.rankCode ?? null,
  }));
}

function serializeEmployees(list: EmployeeInput[]): string {
  return JSON.stringify(
    cloneEmployees(list)
      .map((employee) => ({
        employeeId: employee.employeeId,
        name: employee.name,
        availableShifts: [...employee.availableShifts].sort(),
        rankCode: employee.rankCode ?? null,
      }))
      .sort((left, right) => {
        if (left.employeeId !== right.employeeId) {
          return left.employeeId.localeCompare(right.employeeId);
        }

        if (left.name !== right.name) {
          return left.name.localeCompare(right.name);
        }

        return (left.rankCode ?? '').localeCompare(right.rankCode ?? '');
      })
  );
}

function setBaselineEmployeesSnapshot(list: EmployeeInput[]) {
  baselineEmployeesSnapshot.value = serializeEmployees(list);
}

function buildEmployeePayload() {
  return employees.value.map((employee) => ({
    employeeId: employee.employeeId,
    name: employee.name,
    availableShifts: employee.availableShifts,
    rankCode: employee.rankCode ?? null,
  }));
}

// 직원 추가 핸들러
function handleAddEmployee(employee: EmployeeInput) {
  employees.value = [...employees.value, employee];
}

// 직원 수정 핸들러
function handleEditEmployee(index: number, employee: EmployeeInput) {
  const updated = [...employees.value];
  updated[index] = employee;
  employees.value = updated;
}

// 직원 삭제 핸들러
function handleDeleteEmployee(index: number) {
  employees.value = employees.value.filter((_, i) => i !== index);
}

// 엑셀 업로드 핸들러
function handleExcelUpload(uploadedEmployees: EmployeeInput[]) {
  employees.value = uploadedEmployees;
  showSuccess(`${uploadedEmployees.length}명의 직원이 업로드되었습니다.`);
}

async function getCurrentMonthScheduleState(): Promise<{ id: string; status: string } | null> {
  const basicInfo = scheduleStore.basicInfo;
  if (!basicInfo) return null;

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

  try {
    const latest = await getLatestScheduleByOrganizationMonth(
      basicInfo.organizationId,
      basicInfo.month
    );
    if (!latest?.id || !latest?.status) return null;

    return { id: latest.id, status: latest.status };
  } catch (error) {
    console.warn('[Step3] Failed to query latest schedule:', error);
    return null;
  }
}

async function performEmployeeSave(orgId: string) {
  isSaving.value = true;

  try {
    if (!scheduleStore.basicInfo) {
      throw new Error('기본 정보가 없습니다. 다시 시도해주세요.');
    }

    const applyResult = await applyEmployeeImport({
      organizationId: orgId,
      month: scheduleStore.basicInfo.month,
      employees: buildEmployeePayload(),
    });

    if (applyResult.deletedScheduleId) {
      console.log('[Step3] Applied roster and removed schedule:', applyResult.deletedScheduleId);
    }

    scheduleStore.setEmployees(cloneEmployees(employees.value));
    scheduleStore.setBasicInfo({
      ...scheduleStore.basicInfo,
      scheduleId: undefined,
      employeeCount: employees.value.length,
    });
    scheduleStore.setSelectedVersionId(null);
    scheduleStore.setPreviewVersionId(null);
    scheduleStore.setAssignments({});

    const clearedStorageKeys = clearScopedTempPreferencesStorage({
      userId: authStore.user?.id,
      organizationId: scheduleStore.basicInfo.organizationId,
      month: scheduleStore.basicInfo.month,
    });
    console.log('[Step3] Cleared temp preference storage keys:', clearedStorageKeys);
    setBaselineEmployeesSnapshot(employees.value);

    showSuccess('직원 정보가 저장되었습니다.');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.';
    showError(errorMessage);
  } finally {
    isSaving.value = false;
  }
}

// 저장 핸들러
async function handleSave() {
  if (!scheduleStore.basicInfo) {
    showError('기본 정보가 없습니다. 다시 시도해주세요.');
    return;
  }

  if (!hasUnsavedChanges.value) {
    showInfo('변경된 데이터가 없습니다');
    return;
  }

  if (employees.value.length === 0) {
    showWarning('최소 1명 이상의 직원을 등록해주세요.');
    return;
  }

  const orgId = scheduleStore.basicInfo.organizationId;
  let compareResponse = null;
  try {
    const currentMonthSchedule = await getCurrentMonthScheduleState();
    if (currentMonthSchedule) {
      compareResponse = await getPhase2ScheduleCompare(currentMonthSchedule.id);
      if (compareResponse.finalizedVersionId) {
        showError('현재 월에 확정된 근무표가 있어 직원 정보를 저장할 수 없습니다.');
        return;
      }
    }
  } catch (error) {
    console.warn('[Step3] Failed to check current month version state:', error);
    showError('현재 월의 근무표 상태를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.');
    return;
  }

  if (!window.$dialog?.warning) {
    showError('확인 대화상자를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    return;
  }

  window.$dialog.warning({
    title: '직원 정보 저장 확인',
    content:
      (compareResponse?.versions?.length ?? 0) > 0
        ? '현재 월의 근무표와 버전이 모두 삭제됩니다. 계속 저장하시겠습니까?'
        : '직원 정보를 저장하시겠습니까?',
    positiveText: '저장',
    negativeText: '취소',
    onPositiveClick: async () => {
      await performEmployeeSave(orgId);
    },
  });
}

function handleReturnToDashboard() {
  if (hasUnsavedChanges.value) {
    showInfo('변경된 데이터가 있습니다. 저장 후 진행하세요');
    return;
  }

  scheduleStore.reset();
  router.push('/');
}
</script>
