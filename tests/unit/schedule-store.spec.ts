import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useScheduleStore } from '@/stores/schedule';
import type {
  ScheduleCompareResponse,
  ScheduleEvaluation,
  ScheduleVersionSourceType,
  ScheduleVersionSummary,
} from '@/types/schedule';

type Assert<T extends true> = T;
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

const allowedSourceTypes: ScheduleVersionSourceType[] = [
  'initial_solve',
  're_solve',
  'manual_variant',
];
const LEGACY_STORAGE_KEY = 'everyshift_wizard_context_v1';
const USER_SCOPED_STORAGE_KEY = 'everyshift_wizard_context_v2:user-1';

function createVersionSummary(
  overrides: Partial<ScheduleVersionSummary> = {}
): ScheduleVersionSummary {
  return {
    id: 'version-1',
    scheduleId: 'schedule-1',
    versionNo: 1,
    name: 'V1',
    sourceType: allowedSourceTypes[0]!,
    baseVersionId: null,
    status: 'draft',
    currentRevision: 0,
    manualEditCount: 0,
    inputDiffSummary: {
      changedOffRequests: 0,
      changedLockedAssignments: 0,
      changedSiteRequirements: 0,
      note: null,
    },
    latestEvaluationId: null,
    latestEvaluationResultStatus: null,
    comparisonMetrics: null,
    finalizationGate: null,
    isSelected: true,
    isFinalized: false,
    ...overrides,
  };
}

function createEvaluation(overrides: Partial<ScheduleEvaluation> = {}): ScheduleEvaluation {
  return {
    id: 'evaluation-1',
    scheduleId: 'schedule-1',
    scheduleVersionId: 'version-1',
    revisionNo: 1,
    resultStatus: 'passed',
    proofSummary: {
      weeklyHoursViolations: 0,
      nnnViolations: 0,
      nodViolations: 0,
      minimumRestViolations: 0,
      staffingShortfalls: 0,
    },
    violationDetails: [],
    infeasibility: null,
    offRequestResults: [],
    comparisonMetrics: {
      offRequestReflectionRate: 1,
      nightShiftMin: 2,
      nightShiftMax: 3,
      weekendShiftMin: 1,
      weekendShiftMax: 2,
      manualEditCount: 0,
    },
    finalizationGate: {
      allowed: true,
      blockingReasons: [],
    },
    assignmentHash: 'hash-1',
    solverExecutionId: null,
    evaluatorVersion: 'v1',
    createdAt: '2026-03-27T00:00:00Z',
    ...overrides,
  };
}

function createCompareMatrix(
  overrides: Partial<ScheduleCompareResponse> = {}
): ScheduleCompareResponse {
  return {
    scheduleId: 'schedule-1',
    selectedVersionId: 'version-1',
    finalizedVersionId: null,
    activeSolvingVersionId: null,
    versions: [createVersionSummary()],
    ...overrides,
  };
}

describe('useScheduleStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('locks sourceType to the Trust Layer vocabulary', () => {
    const sourceTypeMatchesUnion: Assert<
      IsEqual<ScheduleVersionSummary['sourceType'], ScheduleVersionSourceType>
    > = true;

    expect(sourceTypeMatchesUnion).toBe(true);

    // @ts-expect-error invalid source type must be rejected
    const invalidSourceType: ScheduleVersionSourceType = 'unexpected_source';

    expect(invalidSourceType).toBe('unexpected_source');
  });

  it('keeps wizard state and clears only review state on resetReviewState', () => {
    const store = useScheduleStore();

    store.setBasicInfo({
      scheduleId: 'schedule-1',
      month: '2026-04',
      organizationId: 'org-1',
      organizationName: 'Test Hospital',
      organizationType: 'hospital',
      employeeCount: 12,
      shifts: [],
    });
    store.setSiteRequirements([
      {
        dayOfWeek: 1,
        dayName: '월요일',
        shiftCode: 'D',
        requiredCount: 2,
      },
    ]);
    store.setEmployees([
      {
        employeeId: 'N-001',
        name: 'Kim Nurse',
        availableShifts: ['D', 'E', 'N', 'O'],
      },
    ]);
    store.setAssignments({
      'employee-1': {
        '2026-04-01': 'D',
      },
    });
    store.setComments({
      'employee-1': {
        '2026-04-01': 'memo',
      },
    });
    store.currentStep = 4;
    store.setExcelUploadMode(true);

    const version = createVersionSummary();
    const evaluation = createEvaluation();
    const compareMatrix = createCompareMatrix({ versions: [version] });

    store.setSelectedVersionId(version.id);
    store.setPreviewVersionId(version.id);
    store.setVersions([version]);
    store.setLatestEvaluation(evaluation);
    store.setCompareMatrix(compareMatrix);
    store.setReviewTab('proof');

    store.resetReviewState();

    expect(store.basicInfo).toEqual({
      scheduleId: 'schedule-1',
      month: '2026-04',
      organizationId: 'org-1',
      organizationName: 'Test Hospital',
      organizationType: 'hospital',
      employeeCount: 12,
      shifts: [],
    });
    expect(store.siteRequirements).toHaveLength(1);
    expect(store.employees).toHaveLength(1);
    expect(store.assignments).toEqual({
      'employee-1': {
        '2026-04-01': 'D',
      },
    });
    expect(store.comments).toEqual({
      'employee-1': {
        '2026-04-01': 'memo',
      },
    });
    expect(store.currentStep).toBe(4);
    expect(store.isExcelUpload).toBe(true);

    expect(store.selectedVersionId).toBeNull();
    expect(store.previewVersionId).toBeNull();
    expect(store.versions).toEqual([]);
    expect(store.latestEvaluation).toBeNull();
    expect(store.compareMatrix).toBeNull();
    expect(store.reviewTab).toBe('grid');
  });

  it('clears both wizard state and review state on reset', () => {
    const store = useScheduleStore();

    const version = createVersionSummary({
      sourceType: allowedSourceTypes[1]!,
    });

    store.setBasicInfo({
      scheduleId: 'schedule-1',
      month: '2026-04',
      organizationId: 'org-1',
      organizationName: 'Test Hospital',
      organizationType: 'hospital',
      employeeCount: 12,
      shifts: [],
    });
    store.setSiteRequirements([
      {
        dayOfWeek: 1,
        dayName: '월요일',
        shiftCode: 'D',
        requiredCount: 2,
      },
    ]);
    store.setEmployees([
      {
        employeeId: 'N-001',
        name: 'Kim Nurse',
        availableShifts: ['D', 'E', 'N', 'O'],
      },
    ]);
    store.setAssignments({
      'employee-1': {
        '2026-04-01': 'D',
      },
    });
    store.setComments({
      'employee-1': {
        '2026-04-01': 'memo',
      },
    });
    store.currentStep = 5;
    store.setExcelUploadMode(true);
    store.setSelectedVersionId(version.id);
    store.setPreviewVersionId(version.id);
    store.setVersions([version]);
    store.setLatestEvaluation(createEvaluation());
    store.setCompareMatrix(createCompareMatrix({ versions: [version] }));
    store.setReviewTab('offRequests');

    store.reset();

    expect(store.basicInfo).toBeNull();
    expect(store.siteRequirements).toEqual([]);
    expect(store.employees).toEqual([]);
    expect(store.assignments).toEqual({});
    expect(store.comments).toEqual({});
    expect(store.currentStep).toBe(1);
    expect(store.isExcelUpload).toBe(false);

    expect(store.selectedVersionId).toBeNull();
    expect(store.previewVersionId).toBeNull();
    expect(store.versions).toEqual([]);
    expect(store.latestEvaluation).toBeNull();
    expect(store.compareMatrix).toBeNull();
    expect(store.reviewTab).toBe('grid');
  });

  it('persists wizard context needed for Step4/Step5 reload only after access-scope sync', async () => {
    const store = useScheduleStore();

    store.syncWithAccessScope({
      userId: 'user-1',
      organizationId: 'org-1',
    });
    store.setBasicInfo({
      scheduleId: 'schedule-1',
      month: '2026-04',
      organizationId: 'org-1',
      organizationName: 'Test Hospital',
      organizationType: 'hospital',
      employeeCount: 12,
      shifts: [],
    });
    store.setSelectedVersionId('version-2');
    store.setPreviewVersionId('version-1');
    store.currentStep = 4;

    await Promise.resolve();

    const raw = localStorage.getItem(USER_SCOPED_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw || '{}')).toEqual({
      schemaVersion: 2,
      ownerUserId: 'user-1',
      ownerOrganizationId: 'org-1',
      context: {
        basicInfo: {
          scheduleId: 'schedule-1',
          month: '2026-04',
          organizationId: 'org-1',
          organizationName: 'Test Hospital',
          organizationType: 'hospital',
          employeeCount: 12,
          shifts: [],
        },
        selectedVersionId: 'version-2',
        previewVersionId: 'version-1',
        currentStep: 4,
      },
    });
  });

  it('does not hydrate persisted wizard context until access scope is synced', () => {
    localStorage.setItem(
      USER_SCOPED_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 2,
        ownerUserId: 'user-1',
        ownerOrganizationId: 'org-restore',
        context: {
          basicInfo: {
            scheduleId: 'schedule-restored',
            month: '2026-05',
            organizationId: 'org-restore',
            organizationName: 'Restore Hospital',
            organizationType: 'hospital',
            employeeCount: 8,
            shifts: [],
          },
          selectedVersionId: 'version-selected',
          previewVersionId: 'version-preview',
          currentStep: 4,
        },
      })
    );

    setActivePinia(createPinia());

    const store = useScheduleStore();

    expect(store.basicInfo).toBeNull();
    expect(store.selectedVersionId).toBeNull();
    expect(store.previewVersionId).toBeNull();
    expect(store.currentStep).toBe(1);

    store.syncWithAccessScope({
      userId: 'user-1',
      organizationId: 'org-restore',
    });

    expect(store.basicInfo).toEqual({
      scheduleId: 'schedule-restored',
      month: '2026-05',
      organizationId: 'org-restore',
      organizationName: 'Restore Hospital',
      organizationType: 'hospital',
      employeeCount: 8,
      shifts: [],
    });
    expect(store.selectedVersionId).toBe('version-selected');
    expect(store.previewVersionId).toBe('version-preview');
    expect(store.currentStep).toBe(4);
  });

  it('does not hydrate persisted wizard context when the access scope organization is unknown', () => {
    localStorage.setItem(
      USER_SCOPED_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 2,
        ownerUserId: 'user-1',
        ownerOrganizationId: 'org-restore',
        context: {
          basicInfo: {
            scheduleId: 'schedule-restored',
            month: '2026-05',
            organizationId: 'org-restore',
            organizationName: 'Restore Hospital',
            organizationType: 'hospital',
            employeeCount: 8,
            shifts: [],
          },
          selectedVersionId: 'version-selected',
          previewVersionId: 'version-preview',
          currentStep: 4,
        },
      })
    );

    const store = useScheduleStore();

    store.syncWithAccessScope({
      userId: 'user-1',
      organizationId: null,
    });

    expect(store.basicInfo).toBeNull();
    expect(store.selectedVersionId).toBeNull();
    expect(store.previewVersionId).toBeNull();
    expect(store.currentStep).toBe(1);
    expect(localStorage.getItem(USER_SCOPED_STORAGE_KEY)).toBeTruthy();
  });

  it('syncs persisted wizard context against the explicit access scope organization', () => {
    localStorage.setItem(
      USER_SCOPED_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 2,
        ownerUserId: 'user-1',
        ownerOrganizationId: 'org-1',
        context: {
          basicInfo: {
            scheduleId: 'schedule-restored',
            month: '2026-05',
            organizationId: 'org-1',
            organizationName: 'Restore Hospital',
            organizationType: 'hospital',
            employeeCount: 8,
            shifts: [],
          },
          selectedVersionId: 'version-selected',
          previewVersionId: 'version-preview',
          currentStep: 4,
        },
      })
    );

    const store = useScheduleStore();

    store.syncWithAccessScope({
      userId: 'user-1',
      organizationId: 'org-2',
    });

    expect(store.basicInfo).toBeNull();
    expect(store.selectedVersionId).toBeNull();
    expect(store.previewVersionId).toBeNull();
    expect(store.currentStep).toBe(1);
    expect(localStorage.getItem(USER_SCOPED_STORAGE_KEY)).toBeNull();
  });

  it('clears in-memory and persisted wizard context on logout sync', async () => {
    const store = useScheduleStore();

    store.syncWithAccessScope({
      userId: 'user-1',
      organizationId: 'org-1',
    });
    store.setBasicInfo({
      scheduleId: 'schedule-1',
      month: '2026-04',
      organizationId: 'org-1',
      organizationName: 'Test Hospital',
      organizationType: 'hospital',
      employeeCount: 12,
      shifts: [],
    });
    store.setSelectedVersionId('version-2');
    store.setPreviewVersionId('version-1');
    store.currentStep = 4;

    await Promise.resolve();

    expect(localStorage.getItem(USER_SCOPED_STORAGE_KEY)).toBeTruthy();

    store.syncWithAccessScope(null);

    expect(store.basicInfo).toBeNull();
    expect(store.selectedVersionId).toBeNull();
    expect(store.previewVersionId).toBeNull();
    expect(store.currentStep).toBe(1);
    expect(localStorage.getItem(USER_SCOPED_STORAGE_KEY)).toBeNull();
  });

  it('removes the legacy global wizard key instead of hydrating it', () => {
    localStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({
        basicInfo: {
          scheduleId: 'schedule-legacy',
          month: '2026-05',
          organizationId: 'org-legacy',
          organizationName: 'Legacy Hospital',
          organizationType: 'hospital',
          employeeCount: 8,
          shifts: [],
        },
        selectedVersionId: 'version-selected',
        previewVersionId: 'version-preview',
        currentStep: 4,
      })
    );

    const store = useScheduleStore();

    store.syncWithAccessScope({
      userId: 'user-1',
      organizationId: 'org-1',
    });

    expect(store.basicInfo).toBeNull();
    expect(store.selectedVersionId).toBeNull();
    expect(store.previewVersionId).toBeNull();
    expect(store.currentStep).toBe(1);
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  });
});
