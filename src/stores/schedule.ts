import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { User } from '@supabase/supabase-js';
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
import { resolveAuthScope, type AuthScope } from '@/utils/authScope';

const LEGACY_WIZARD_CONTEXT_STORAGE_KEY = 'everyshift_wizard_context_v1';
const WIZARD_CONTEXT_STORAGE_KEY_PREFIX = 'everyshift_wizard_context_v2';
const WIZARD_CONTEXT_SCHEMA_VERSION = 2;

interface PersistedWizardContext {
  basicInfo: ScheduleBasicInfo | null;
  selectedVersionId: string | null;
  previewVersionId: string | null;
  currentStep: number;
}

interface PersistedWizardContextEnvelope {
  schemaVersion: number;
  ownerUserId: string;
  ownerOrganizationId: string | null;
  context: PersistedWizardContext;
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

function buildWizardContextStorageKey(userId: string): string {
  return `${WIZARD_CONTEXT_STORAGE_KEY_PREFIX}:${userId}`;
}

function isPersistedWizardContext(value: unknown): value is PersistedWizardContext {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const parsedBasicInfo = record.basicInfo;

  return (
    (parsedBasicInfo === null || isScheduleBasicInfo(parsedBasicInfo)) &&
    (record.selectedVersionId === null || typeof record.selectedVersionId === 'string') &&
    (record.previewVersionId === null || typeof record.previewVersionId === 'string') &&
    typeof normalizeCurrentStep(record.currentStep) === 'number'
  );
}

function readPersistedWizardContext(scope: AuthScope): PersistedWizardContextEnvelope | null {
  if (!canUseLocalStorage()) return null;

  const raw = window.localStorage.getItem(buildWizardContextStorageKey(scope.userId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const parsedContext = parsed.context;
    if (!isPersistedWizardContext(parsedContext)) {
      throw new Error('Invalid persisted wizard context');
    }

    const basicInfo = parsedContext.basicInfo;

    return {
      schemaVersion:
        typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : WIZARD_CONTEXT_SCHEMA_VERSION,
      ownerUserId: typeof parsed.ownerUserId === 'string' ? parsed.ownerUserId : '',
      ownerOrganizationId:
        typeof parsed.ownerOrganizationId === 'string' ? parsed.ownerOrganizationId : null,
      context: {
        basicInfo,
        selectedVersionId:
          typeof parsedContext.selectedVersionId === 'string' ? parsedContext.selectedVersionId : null,
        previewVersionId:
          typeof parsedContext.previewVersionId === 'string' ? parsedContext.previewVersionId : null,
        currentStep: normalizeCurrentStep(parsedContext.currentStep),
      },
    };
  } catch {
    window.localStorage.removeItem(buildWizardContextStorageKey(scope.userId));
    return null;
  }
}

function isSameAuthScope(left: AuthScope | null, right: AuthScope | null): boolean {
  return left?.userId === right?.userId && left?.organizationId === right?.organizationId;
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
  const activeAuthScope = ref<AuthScope | null>(null);
  const hasInitializedAuthScope = ref(false);

  function clearLegacyPersistedWizardContext() {
    if (!canUseLocalStorage()) return;
    window.localStorage.removeItem(LEGACY_WIZARD_CONTEXT_STORAGE_KEY);
  }

  function clearPersistedWizardContext(scope: AuthScope | null = activeAuthScope.value) {
    clearLegacyPersistedWizardContext();
    if (!canUseLocalStorage() || !scope) return;
    window.localStorage.removeItem(buildWizardContextStorageKey(scope.userId));
  }

  function applyDefaultState() {
    basicInfo.value = null;
    siteRequirements.value = [];
    employees.value = [];
    assignments.value = {};
    comments.value = {};
    currentStep.value = 1;
    isExcelUpload.value = false;
    resetReviewState();
  }

  function shouldHydratePersistedWizardContext(
    persisted: PersistedWizardContextEnvelope,
    scope: AuthScope
  ): boolean {
    if (persisted.schemaVersion !== WIZARD_CONTEXT_SCHEMA_VERSION) {
      return false;
    }

    if (persisted.ownerUserId !== scope.userId) {
      return false;
    }

    if (
      scope.organizationId &&
      persisted.ownerOrganizationId &&
      persisted.ownerOrganizationId !== scope.organizationId
    ) {
      return false;
    }

    if (
      scope.organizationId &&
      persisted.context.basicInfo?.organizationId &&
      persisted.context.basicInfo.organizationId !== scope.organizationId
    ) {
      return false;
    }

    return true;
  }

  function persistWizardContext() {
    clearLegacyPersistedWizardContext();
    if (!canUseLocalStorage()) return;
    if (!activeAuthScope.value) return;

    if (!basicInfo.value) {
      clearPersistedWizardContext();
      return;
    }

    const payload: PersistedWizardContextEnvelope = {
      schemaVersion: WIZARD_CONTEXT_SCHEMA_VERSION,
      ownerUserId: activeAuthScope.value.userId,
      ownerOrganizationId: basicInfo.value.organizationId,
      context: {
        basicInfo: basicInfo.value,
        selectedVersionId: selectedVersionId.value,
        previewVersionId: previewVersionId.value,
        currentStep: normalizeCurrentStep(currentStep.value),
      },
    };

    window.localStorage.setItem(
      buildWizardContextStorageKey(activeAuthScope.value.userId),
      JSON.stringify(payload)
    );
  }

  function hydrateWizardContext(scope: AuthScope) {
    const persisted = readPersistedWizardContext(scope);
    if (!persisted) return;

    if (!shouldHydratePersistedWizardContext(persisted, scope)) {
      clearPersistedWizardContext(scope);
      return;
    }

    basicInfo.value = persisted.context.basicInfo;
    selectedVersionId.value = persisted.context.selectedVersionId;
    previewVersionId.value = persisted.context.previewVersionId;
    currentStep.value = persisted.context.currentStep;
  }

  function syncWithAuthUser(user: User | null) {
    const nextScope = resolveAuthScope(user);
    const previousScope = activeAuthScope.value;

    clearLegacyPersistedWizardContext();

    if (hasInitializedAuthScope.value && isSameAuthScope(previousScope, nextScope)) {
      return;
    }

    if (previousScope) {
      clearPersistedWizardContext(previousScope);
    }

    applyDefaultState();
    activeAuthScope.value = nextScope;
    hasInitializedAuthScope.value = true;

    if (!nextScope) {
      return;
    }

    hydrateWizardContext(nextScope);
  }

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
    applyDefaultState();
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
    syncWithAuthUser,
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
