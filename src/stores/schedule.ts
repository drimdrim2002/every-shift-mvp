import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ScheduleBasicInfo, SiteRequirementList, AssignmentMap } from '@/types/schedule';
import type { EmployeeInput } from '@/types/employee';

export const useScheduleStore = defineStore('schedule', () => {
  // Step 1: 기본 정보
  const basicInfo = ref<ScheduleBasicInfo | null>(null);

  // Step 2: 사이트 정보 (세로형 배열)
  const siteRequirements = ref<SiteRequirementList>([]);

  // Step 3: 직원 정보
  const employees = ref<EmployeeInput[]>([]);

  // Step 4: 그리드 데이터
  const assignments = ref<AssignmentMap>({});

  // 현재 단계
  const currentStep = ref<number>(1);

  // 엑셀 업로드 모드 플래그
  const isExcelUpload = ref<boolean>(false);

  // 엑셀 업로드 모드 computed getter
  const isExcelUploadMode = computed(() => isExcelUpload.value);

  // scheduleId computed getter
  const scheduleId = computed(() => basicInfo.value?.scheduleId ?? null);

  // Actions
  function setBasicInfo(info: ScheduleBasicInfo) {
    basicInfo.value = info;
  }

  function setExcelUploadMode(mode: boolean) {
    isExcelUpload.value = mode;
  }

  function setSiteRequirements(reqs: SiteRequirementList) {
    siteRequirements.value = reqs;
  }

  function setEmployees(data: EmployeeInput[]) {
    employees.value = data;
  }

  function setAssignments(data: AssignmentMap) {
    assignments.value = data;
  }

  function nextStep() {
    if (currentStep.value < 5) {
      currentStep.value++;
    }
  }

  function prevStep() {
    if (currentStep.value > 1) {
      currentStep.value--;
    }
  }

  function reset() {
    basicInfo.value = null;
    siteRequirements.value = [];
    employees.value = [];
    assignments.value = {};
    currentStep.value = 1;
    isExcelUpload.value = false;
  }

  return {
    basicInfo,
    siteRequirements,
    employees,
    assignments,
    currentStep,
    isExcelUpload,
    isExcelUploadMode,
    scheduleId,
    setBasicInfo,
    setSiteRequirements,
    setEmployees,
    setAssignments,
    setExcelUploadMode,
    nextStep,
    prevStep,
    reset,
  };
});
