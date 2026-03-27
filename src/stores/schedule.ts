import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  ScheduleBasicInfo,
  SiteRequirementList,
  AssignmentMap,
  CommentMap,
  ScheduleCompareResponse,
  ScheduleEvaluation,
  ScheduleReviewTab,
  ScheduleVersionSummary,
} from '@/types/schedule';
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
  const comments = ref<CommentMap>({});

  // 현재 단계
  const currentStep = ref<number>(1);

  // 엑셀 업로드 모드 플래그
  const isExcelUpload = ref<boolean>(false);

  // Trust Layer review state
  const selectedVersionId = ref<string | null>(null);
  const previewVersionId = ref<string | null>(null);
  const versions = ref<ScheduleVersionSummary[]>([]);
  const latestEvaluation = ref<ScheduleEvaluation | null>(null);
  const compareMatrix = ref<ScheduleCompareResponse | null>(null);
  const reviewTab = ref<ScheduleReviewTab>('grid');

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

  function setSelectedVersionId(versionId: string | null) {
    selectedVersionId.value = versionId;
  }

  function setPreviewVersionId(versionId: string | null) {
    previewVersionId.value = versionId;
  }

  function setVersions(data: ScheduleVersionSummary[]) {
    versions.value = data;
  }

  function setLatestEvaluation(evaluation: ScheduleEvaluation | null) {
    latestEvaluation.value = evaluation;
  }

  function setCompareMatrix(matrix: ScheduleCompareResponse | null) {
    compareMatrix.value = matrix;
  }

  function setReviewTab(tab: ScheduleReviewTab) {
    reviewTab.value = tab;
  }

  function resetReviewState() {
    selectedVersionId.value = null;
    previewVersionId.value = null;
    versions.value = [];
    latestEvaluation.value = null;
    compareMatrix.value = null;
    reviewTab.value = 'grid';
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

  function setComments(data: CommentMap) {
    comments.value = data;
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
    comments.value = {};
    currentStep.value = 1;
    isExcelUpload.value = false;
    resetReviewState();
  }

  return {
    basicInfo,
    siteRequirements,
    employees,
    assignments,
    comments,
    currentStep,
    isExcelUpload,
    isExcelUploadMode,
    scheduleId,
    selectedVersionId,
    previewVersionId,
    versions,
    latestEvaluation,
    compareMatrix,
    reviewTab,
    setBasicInfo,
    setSiteRequirements,
    setEmployees,
    setAssignments,
    setComments,
    setExcelUploadMode,
    setSelectedVersionId,
    setPreviewVersionId,
    setVersions,
    setLatestEvaluation,
    setCompareMatrix,
    setReviewTab,
    resetReviewState,
    nextStep,
    prevStep,
    reset,
  };
});
