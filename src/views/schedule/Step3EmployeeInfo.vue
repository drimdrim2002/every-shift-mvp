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
        <n-button
          type="primary"
          size="medium"
          :disabled="!canProceed"
          :loading="isSaving"
          @click="handleNext"
        >
          다음 단계 →
        </n-button>
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
import { useScheduleStore } from '@/stores/schedule';
import { useOrganizationStore } from '@/stores/organization';
import { deleteOrganizationEmployees, createEmployeesBatch } from '@/api/employee';
import type { EmployeeInput } from '@/types/employee';
import type { Shift } from '@/types/shift';

const router = useRouter();
const scheduleStore = useScheduleStore();
const orgStore = useOrganizationStore();

// State
const activeTab = ref<'manual' | 'excel'>('manual');
const employees = ref<EmployeeInput[]>([]);
const isSaving = ref(false);

// 시프트 목록
const shifts = computed<Shift[]>(() => {
  return scheduleStore.basicInfo?.shifts || orgStore.shifts || [];
});

// 진행 가능 여부
const canProceed = computed(() => {
  return employees.value.length > 0;
});

// 초기화
onMounted(() => {
  if (!scheduleStore.basicInfo) {
    router.push('/schedule/step1');
    return;
  }

  // 기존 직원 데이터 복원
  if (scheduleStore.employees.length > 0) {
    employees.value = [...scheduleStore.employees];
  }
});

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
  window.$message?.success(`${uploadedEmployees.length}명의 직원이 업로드되었습니다.`);
}

// 이전 버튼 핸들러
function handlePrev() {
  scheduleStore.prevStep();
  router.push('/schedule/step2');
}

// 다음 버튼 핸들러
async function handleNext() {
  if (employees.value.length === 0) {
    window.$message?.warning('최소 1명 이상의 직원을 등록해주세요.');
    return;
  }

  if (!scheduleStore.basicInfo) {
    window.$message?.error('기본 정보가 없습니다. 다시 시도해주세요.');
    return;
  }

  isSaving.value = true;

  try {
    const orgId = scheduleStore.basicInfo.organizationId;

    // 1. 기존 직원 삭제
    await deleteOrganizationEmployees(orgId);

    // 2. 새 직원 일괄 생성
    await createEmployeesBatch(orgId, employees.value);

    // 3. Store 업데이트
    scheduleStore.setEmployees(employees.value);
    
    // basicInfo의 employeeCount 업데이트
    scheduleStore.setBasicInfo({
      ...scheduleStore.basicInfo,
      employeeCount: employees.value.length,
    });

    scheduleStore.nextStep();

    window.$message?.success('직원 정보가 저장되었습니다.');
    router.push('/schedule/step4');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.';
    window.$message?.error(errorMessage);
  } finally {
    isSaving.value = false;
  }
}
</script>



