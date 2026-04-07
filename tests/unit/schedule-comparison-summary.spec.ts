import { describe, expect, it } from 'vitest';

import { buildScheduleComparisonSummary } from '@/utils/scheduleComparisonSummary';
import type { ScheduleReviewResponse, ScheduleVersionSummary } from '@/types/schedule';

function createVersionSummary(overrides: Partial<ScheduleVersionSummary> = {}): ScheduleVersionSummary {
  const versionNo = overrides.versionNo ?? 1;
  return {
    id: `version-${versionNo}`,
    scheduleId: 'schedule-1',
    versionNo,
    name: `V${versionNo}`,
    sourceType: versionNo === 1 ? 'initial_solve' : 're_solve',
    baseVersionId: versionNo === 1 ? null : 'version-1',
    status: 'review_ready',
    currentRevision: 1,
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

function createReviewResponse(
  version: ScheduleVersionSummary,
  overrides: Partial<ScheduleReviewResponse> = {}
): ScheduleReviewResponse {
  return {
    scheduleId: version.scheduleId,
    selectedVersionId: version.id,
    finalizedVersionId: null,
    version,
    latestEvaluation: null,
    primaryAction: {
      kind: 'none',
      targetVersionId: null,
      label: '선택 가능한 작업이 없습니다.',
      disabledReason: null,
    },
    defaultTab: 'grid',
    ...overrides,
  };
}

describe('scheduleComparisonSummary', () => {
  it('builds plain-language bullets from truthful reflection-rate data', () => {
    const leftVersion = createVersionSummary({
      versionNo: 2,
      name: 'V2',
      status: 'review_ready',
      manualEditCount: 0,
      inputDiffSummary: {
        changedOffRequests: 10,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: null,
      },
      comparisonMetrics: {
        offRequestReflectionRate: 62,
        nightShiftMin: null,
        nightShiftMax: null,
        weekendShiftMin: null,
        weekendShiftMax: null,
        manualEditCount: 0,
      },
    });
    const rightVersion = createVersionSummary({
      versionNo: 3,
      name: 'V3',
      status: 'review_pending',
      manualEditCount: 2,
      inputDiffSummary: {
        changedOffRequests: 1,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: null,
      },
      comparisonMetrics: {
        offRequestReflectionRate: 84,
        nightShiftMin: null,
        nightShiftMax: null,
        weekendShiftMin: null,
        weekendShiftMax: null,
        manualEditCount: 2,
      },
    });

    expect(
      buildScheduleComparisonSummary(
        leftVersion,
        rightVersion,
        createReviewResponse(leftVersion),
        createReviewResponse(rightVersion)
      )
    ).toEqual([
      'V3안의 Off 요청 반영률이 더 높습니다.',
      'V2안은 바로 확정할 수 있습니다.',
      'V3안은 직접 수정이 있어 다시 검사가 필요합니다.',
    ]);
  });

  it('omits Off-request claims when reflection rates are unavailable', () => {
    const leftVersion = createVersionSummary({
      versionNo: 2,
      name: 'V2',
      status: 'review_ready',
      inputDiffSummary: {
        changedOffRequests: 1,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: null,
      },
      comparisonMetrics: null,
    });
    const rightVersion = createVersionSummary({
      versionNo: 3,
      name: 'V3',
      status: 'review_ready',
      inputDiffSummary: {
        changedOffRequests: 8,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: null,
      },
      comparisonMetrics: null,
    });

    expect(
      buildScheduleComparisonSummary(
        leftVersion,
        rightVersion,
        createReviewResponse(leftVersion),
        createReviewResponse(rightVersion)
      )
    ).toEqual(['두 안의 핵심 지표 차이가 크지 않습니다.']);
  });
});
