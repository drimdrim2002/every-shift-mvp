import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ScheduleBasicInfo, SiteRequirements, AssignmentMap } from '@/types/schedule';

export const useScheduleStore = defineStore('schedule', () => {
  // Step 1: 기본 정보
  const basicInfo = ref<ScheduleBasicInfo | null>(null);

  // Step 2: 사이트 정보
  const siteRequirements = ref<SiteRequirements>({});

  // Step 3: 그리드 데이터
  const assignments = ref<AssignmentMap>({});

  // 현재 단계
  const currentStep = ref<number>(1);

  // Actions
  function setBasicInfo(info: ScheduleBasicInfo) {
    basicInfo.value = info;
  }

  function setSiteRequirements(reqs: SiteRequirements) {
    siteRequirements.value = reqs;
  }

  function setAssignments(data: AssignmentMap) {
    assignments.value = data;
  }

  function nextStep() {
    if (currentStep.value < 4) {
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
    siteRequirements.value = {};
    assignments.value = {};
    currentStep.value = 1;
  }

  return {
    basicInfo,
    siteRequirements,
    assignments,
    currentStep,
    setBasicInfo,
    setSiteRequirements,
    setAssignments,
    nextStep,
    prevStep,
    reset,
  };
});
