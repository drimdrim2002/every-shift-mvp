import { reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routeMock = reactive({
  params: {
    id: 'schedule-1',
  },
  query: {} as Record<string, string | undefined>,
});

const {
  replaceMock,
  getPhase2ScheduleCompareMock,
  getPhase2ScheduleReviewMock,
  selectPhase2ScheduleVersionMock,
} = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  getPhase2ScheduleCompareMock: vi.fn(),
  getPhase2ScheduleReviewMock: vi.fn(),
  selectPhase2ScheduleVersionMock: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock('@/api/schedule', () => ({
  getPhase2ScheduleCompare: getPhase2ScheduleCompareMock,
  getPhase2ScheduleReview: getPhase2ScheduleReviewMock,
  selectPhase2ScheduleVersion: selectPhase2ScheduleVersionMock,
}));

const scheduleStoreMock = reactive({
  basicInfo: {
    scheduleId: 'schedule-1',
    month: '2025-12',
    organizationId: 'org-1',
    organizationName: '서울병원',
    organizationType: 'hospital',
    employeeCount: 2,
    shifts: [],
  },
  selectedVersionId: null as string | null,
  previewVersionId: null as string | null,
  compareMatrix: null,
  latestEvaluation: null,
  reviewTab: 'grid' as 'grid' | 'proof' | 'offRequests',
  setBasicInfo: vi.fn((value) => {
    scheduleStoreMock.basicInfo = value;
  }),
  setSelectedVersionId: vi.fn((value: string | null) => {
    scheduleStoreMock.selectedVersionId = value;
  }),
  setPreviewVersionId: vi.fn((value: string | null) => {
    scheduleStoreMock.previewVersionId = value;
  }),
  setCompareMatrix: vi.fn((value) => {
    scheduleStoreMock.compareMatrix = value;
  }),
  setLatestEvaluation: vi.fn((value) => {
    scheduleStoreMock.latestEvaluation = value;
  }),
  setReviewTab: vi.fn((value) => {
    scheduleStoreMock.reviewTab = value;
  }),
});

vi.mock('@/stores/schedule', () => ({
  useScheduleStore: () => scheduleStoreMock,
}));

import { useScheduleReviewHub } from '@/composables/useScheduleReviewHub';
import type {
  ScheduleCompareResponse,
  ScheduleReviewResponse,
  ScheduleVersionSummary,
} from '@/types/schedule';

function createVersionSummary(
  id: string,
  versionNo: number,
  overrides: Partial<ScheduleVersionSummary> = {}
): ScheduleVersionSummary {
  return {
    id,
    scheduleId: 'schedule-1',
    versionNo,
    name: `V${versionNo}`,
    sourceType: versionNo === 1 ? 'initial_solve' : 're_solve',
    baseVersionId: versionNo === 1 ? null : 'version-1',
    status: versionNo === 1 ? 'draft' : 'review_ready',
    currentRevision: versionNo,
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
    activeSolverExecutionId: null,
    isSelected: false,
    isFinalized: false,
    ...overrides,
  };
}

const version1 = createVersionSummary('version-1', 1);
const version2 = createVersionSummary('version-2', 2, {
  baseVersionId: 'version-1',
});

function createCompareResponse(
  selectedVersionId: string | null,
  versions: ScheduleVersionSummary[],
): ScheduleCompareResponse {
  return {
    scheduleId: 'schedule-1',
    selectedVersionId,
    finalizedVersionId: null,
    activeSolvingVersionId: null,
    versions,
  };
}

function createReviewResponse(versionId: string, defaultTab: ScheduleReviewResponse['defaultTab'] = 'grid'): ScheduleReviewResponse {
  const reviewedVersion = versionId === 'version-1' ? version1 : version2;

  return {
    scheduleId: 'schedule-1',
    selectedVersionId: versionId,
    finalizedVersionId: null,
    version: reviewedVersion,
    latestEvaluation: {
      id: `evaluation-${versionId}`,
      scheduleId: 'schedule-1',
      scheduleVersionId: versionId,
      revisionNo: reviewedVersion.currentRevision,
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
        offRequestReflectionRate: null,
        nightShiftMin: null,
        nightShiftMax: null,
        weekendShiftMin: null,
        weekendShiftMax: null,
        manualEditCount: 0,
      },
      finalizationGate: {
        allowed: true,
        blockingReasons: [],
      },
      assignmentHash: `hash-${versionId}`,
      solverExecutionId: null,
      evaluatorVersion: 'test',
      createdAt: '2026-04-02T00:00:00.000Z',
    },
    primaryAction: {
      kind: 'select',
      targetVersionId: versionId,
      label: '선택',
      disabledReason: null,
    },
    defaultTab,
  };
}

async function mountUseScheduleReviewHub(options: { previewVersionId?: string | null } = {}) {
  if (options.previewVersionId !== undefined) {
    routeMock.query = options.previewVersionId
      ? { ...routeMock.query, version: options.previewVersionId }
      : {};
  }

  const hub = useScheduleReviewHub();
  await hub.hydrate();
  return hub;
}

describe('useScheduleReviewHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMock.params.id = 'schedule-1';
    routeMock.query = {};
    scheduleStoreMock.basicInfo = {
      scheduleId: 'schedule-1',
      month: '2025-12',
      organizationId: 'org-1',
      organizationName: '서울병원',
      organizationType: 'hospital',
      employeeCount: 2,
      shifts: [],
    };
    scheduleStoreMock.selectedVersionId = null;
    scheduleStoreMock.previewVersionId = null;
    scheduleStoreMock.compareMatrix = null;
    scheduleStoreMock.latestEvaluation = null;
    scheduleStoreMock.reviewTab = 'grid';
  });

  it('hydrates selected and preview from compare and canonicalizes invalid preview queries', async () => {
    routeMock.query = { version: 'missing-version' };
    getPhase2ScheduleCompareMock.mockResolvedValue(
      createCompareResponse('version-2', [version1, version2])
    );
    getPhase2ScheduleReviewMock.mockResolvedValue(createReviewResponse('version-2'));

    const hub = await mountUseScheduleReviewHub();

    expect(hub.selectedVersionId.value).toBe('version-2');
    expect(hub.previewVersionId.value).toBe('version-2');
    expect(scheduleStoreMock.selectedVersionId).toBe('version-2');
    expect(scheduleStoreMock.previewVersionId).toBe('version-2');
    expect(scheduleStoreMock.compareMatrix).toEqual(
      createCompareResponse('version-2', [version1, version2])
    );
    expect(scheduleStoreMock.latestEvaluation?.scheduleVersionId).toBe('version-2');
    expect(scheduleStoreMock.reviewTab).toBe('grid');
    expect(getPhase2ScheduleReviewMock).toHaveBeenCalledWith('version-2');
    expect(replaceMock).toHaveBeenCalledWith({
      path: '/schedule/step5/schedule-1',
      query: { version: 'version-2' },
    });
  });

  it('switches preview without mutating authoritative selection', async () => {
    getPhase2ScheduleCompareMock.mockResolvedValue(
      createCompareResponse('version-2', [version1, version2])
    );
    getPhase2ScheduleReviewMock
      .mockResolvedValueOnce(createReviewResponse('version-2'))
      .mockResolvedValueOnce(createReviewResponse('version-1'));

    const hub = await mountUseScheduleReviewHub();

    await hub.setPreviewVersion('version-1');

    expect(hub.selectedVersionId.value).toBe('version-2');
    expect(hub.previewVersionId.value).toBe('version-1');
    expect(scheduleStoreMock.setPreviewVersionId).toHaveBeenCalledWith('version-1');
    expect(scheduleStoreMock.setSelectedVersionId).toHaveBeenCalledWith('version-2');
    expect(scheduleStoreMock.latestEvaluation?.scheduleVersionId).toBe('version-1');
    expect(scheduleStoreMock.reviewTab).toBe('grid');
    expect(replaceMock).toHaveBeenLastCalledWith({
      path: '/schedule/step5/schedule-1',
      query: { version: 'version-1' },
    });
    expect(selectPhase2ScheduleVersionMock).not.toHaveBeenCalled();
    expect(getPhase2ScheduleCompareMock).toHaveBeenCalledTimes(2);
  });

  it('canonicalizes preview to the finalized version and blocks preview switching', async () => {
    routeMock.query = { version: 'version-1' };
    const finalizedVersion = createVersionSummary('version-2', 2, {
      status: 'finalized',
      isSelected: true,
      isFinalized: true,
    });
    getPhase2ScheduleCompareMock.mockResolvedValue({
      ...createCompareResponse('version-2', [version1, finalizedVersion]),
      finalizedVersionId: 'version-2',
    });
    getPhase2ScheduleReviewMock.mockResolvedValue(createReviewResponse('version-2'));

    const hub = await mountUseScheduleReviewHub({ previewVersionId: 'version-1' });

    expect(hub.previewVersionId.value).toBe('version-2');
    expect(scheduleStoreMock.previewVersionId).toBe('version-2');
    expect(replaceMock).toHaveBeenCalledWith({
      path: '/schedule/step5/schedule-1',
      query: { version: 'version-2' },
    });

    await hub.setPreviewVersion('version-1');

    expect(hub.previewVersionId.value).toBe('version-2');
    expect(scheduleStoreMock.previewVersionId).toBe('version-2');
    expect(getPhase2ScheduleCompareMock).toHaveBeenCalledTimes(2);
    expect(getPhase2ScheduleReviewMock).toHaveBeenCalledTimes(2);
  });

  it('preserves the current review tab while hydrating review data', async () => {
    scheduleStoreMock.reviewTab = 'proof';
    getPhase2ScheduleCompareMock.mockResolvedValue(
      createCompareResponse('version-2', [version1, version2])
    );
    getPhase2ScheduleReviewMock.mockResolvedValue(createReviewResponse('version-2', 'grid'));

    await mountUseScheduleReviewHub();

    expect(scheduleStoreMock.reviewTab).toBe('proof');
    expect(scheduleStoreMock.setReviewTab).not.toHaveBeenCalled();
  });

  it('selects the preview version only through the explicit action and refreshes compare/review state', async () => {
    routeMock.query = { version: 'version-1' };
    getPhase2ScheduleCompareMock
      .mockResolvedValueOnce(createCompareResponse('version-2', [version1, version2]))
      .mockResolvedValueOnce(createCompareResponse('version-1', [
        createVersionSummary('version-1', 1, { isSelected: true }),
        version2,
      ]));
    getPhase2ScheduleReviewMock.mockResolvedValue(createReviewResponse('version-1'));
    selectPhase2ScheduleVersionMock.mockResolvedValue({
      scheduleId: 'schedule-1',
      selectedVersionId: 'version-1',
    });

    const hub = await mountUseScheduleReviewHub({ previewVersionId: 'version-1' });

    await hub.selectPreviewVersion();

    expect(selectPhase2ScheduleVersionMock).toHaveBeenCalledWith('version-1');
    expect(scheduleStoreMock.setSelectedVersionId).toHaveBeenLastCalledWith('version-1');
    expect(scheduleStoreMock.selectedVersionId).toBe('version-1');
    expect(scheduleStoreMock.previewVersionId).toBe('version-1');
    expect(hub.selectedVersionId.value).toBe('version-1');
    expect(hub.previewVersionId.value).toBe('version-1');
    expect(scheduleStoreMock.compareMatrix).toEqual(
      createCompareResponse('version-1', [
        createVersionSummary('version-1', 1, { isSelected: true }),
        version2,
      ])
    );
    expect(scheduleStoreMock.latestEvaluation?.scheduleVersionId).toBe('version-1');
    expect(replaceMock).not.toHaveBeenCalled();
    expect(getPhase2ScheduleCompareMock).toHaveBeenCalledTimes(2);
    expect(getPhase2ScheduleReviewMock).toHaveBeenCalledTimes(2);
  });
});
