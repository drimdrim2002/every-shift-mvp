import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
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

const WIZARD_CONTEXT_STORAGE_KEY = 'everyshift_wizard_context_v1';

interface PersistedWizardContext {
  basicInfo: ScheduleBasicInfo | null;
  selectedVersionId: string | null;
  previewVersionId: string | null;
  currentStep: number;
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

function isScheduleBasicInfo(value: unknown): value is ScheduleBasicInfo {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (record.scheduleId !== undefined && typeof record.scheduleId !== 'string') {
    return false;
  }

  return (
    typeof record.month === 'string' &&
    typeof record.organizationId === 'string' &&
    typeof record.organizationName === 'string' &&
    typeof record.organizationType === 'string' &&
    typeof record.employeeCount === 'number' &&
    Array.isArray(record.shifts)
  );
}

function normalizeCurrentStep(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return 1;
  }

  if (value < 1) return 1;
  if (value > 5) return 5;

  return value;
}

function readPersistedWizardContext(): PersistedWizardContext | null {
  if (!canUseLocalStorage()) return null;

  const raw = window.localStorage.getItem(WIZARD_CONTEXT_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const parsedBasicInfo = parsed.basicInfo;
    const basicInfo = isScheduleBasicInfo(parsedBasicInfo) ? parsedBasicInfo : null;

    return {
      basicInfo,
      selectedVersionId:
        typeof parsed.selectedVersionId === 'string' ? parsed.selectedVersionId : null,
      previewVersionId:
        typeof parsed.previewVersionId === 'string' ? parsed.previewVersionId : null,
      currentStep: normalizeCurrentStep(parsed.currentStep),
    };
  } catch {
    window.localStorage.removeItem(WIZARD_CONTEXT_STORAGE_KEY);
    return null;
  }
}

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

  function clearPersistedWizardContext() {
    if (!canUseLocalStorage()) return;
    window.localStorage.removeItem(WIZARD_CONTEXT_STORAGE_KEY);
  }

  function persistWizardContext() {
    if (!canUseLocalStorage()) return;

    if (!basicInfo.value) {
      clearPersistedWizardContext();
      return;
    }

    const payload: PersistedWizardContext = {
      basicInfo: basicInfo.value,
      selectedVersionId: selectedVersionId.value,
      previewVersionId: previewVersionId.value,
      currentStep: normalizeCurrentStep(currentStep.value),
    };

    window.localStorage.setItem(WIZARD_CONTEXT_STORAGE_KEY, JSON.stringify(payload));
  }

  function hydrateWizardContext() {
    const persisted = readPersistedWizardContext();
    if (!persisted) return;

    basicInfo.value = persisted.basicInfo;
    selectedVersionId.value = persisted.selectedVersionId;
    previewVersionId.value = persisted.previewVersionId;
    currentStep.value = persisted.currentStep;
  }

  hydrateWizardContext();

  watch(
    [basicInfo, selectedVersionId, previewVersionId, currentStep],
    () => {
      persistWizardContext();
    },
    {
      deep: true,
    }
  );

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
    clearPersistedWizardContext();
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
