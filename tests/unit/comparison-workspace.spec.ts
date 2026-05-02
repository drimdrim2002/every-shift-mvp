import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ComparisonWorkspace from '@/components/schedule/review/ComparisonWorkspace.vue';
import type { ScheduleReviewResponse, ScheduleVersionSummary } from '@/types/schedule';

function createVersionSummary(overrides: Partial<ScheduleVersionSummary> = {}): ScheduleVersionSummary {
  const versionNo = overrides.versionNo ?? 1;

  return {
    id: `version-${versionNo}`,
    scheduleId: 'schedule-1',
    versionNo,
    name: `${versionNo}안`,
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

function createReviewResponse(version: ScheduleVersionSummary): ScheduleReviewResponse {
  return {
    scheduleId: version.scheduleId,
    selectedVersionId: version.id,
    finalizedVersionId: null,
    version,
    latestEvaluation: {
      id: `${version.id}-evaluation`,
      scheduleId: version.scheduleId,
      scheduleVersionId: version.id,
      revisionNo: version.currentRevision,
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
        offRequestReflectionRate: version.comparisonMetrics?.offRequestReflectionRate ?? null,
        nightShiftMin: null,
        nightShiftMax: null,
        weekendShiftMin: null,
        weekendShiftMax: null,
        manualEditCount: version.manualEditCount,
      },
      finalizationGate: {
        allowed: true,
        blockingReasons: [],
      },
      assignmentHash: `hash-${version.id}`,
      solverExecutionId: null,
      evaluatorVersion: 'test',
      createdAt: '2026-04-03T00:00:00.000Z',
    },
    primaryAction: {
      kind: 'none',
      targetVersionId: null,
      label: '선택 가능한 작업이 없습니다.',
      disabledReason: null,
    },
    defaultTab: 'grid',
  };
}

describe('ComparisonWorkspace', () => {
  it('shows truthful comparison text from reflection-rate metrics instead of input diff counts', () => {
    const leftVersion = createVersionSummary({
      versionNo: 2,
      name: '2안',
      status: 'review_ready',
      inputDiffSummary: {
        changedOffRequests: 12,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: null,
      },
      comparisonMetrics: {
        offRequestReflectionRate: 61,
        nightShiftMin: null,
        nightShiftMax: null,
        weekendShiftMin: null,
        weekendShiftMax: null,
        manualEditCount: 0,
      },
    });
    const rightVersion = createVersionSummary({
      versionNo: 3,
      name: '3안',
      status: 'review_pending',
      manualEditCount: 2,
      inputDiffSummary: {
        changedOffRequests: 1,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: '수동 수정됨',
      },
      comparisonMetrics: {
        offRequestReflectionRate: 88,
        nightShiftMin: null,
        nightShiftMax: null,
        weekendShiftMin: null,
        weekendShiftMax: null,
        manualEditCount: 2,
      },
    });

    const wrapper = mount(ComparisonWorkspace, {
      props: {
        leftVersion,
        rightVersion,
        leftReview: createReviewResponse(leftVersion),
        rightReview: createReviewResponse(rightVersion),
        focusedVersionId: 'version-3',
      },
    });

    const summaryText = wrapper.get('[data-test="comparison-summary"]').text();

    expect(summaryText).toContain('3안의 Off 요청 반영률이 더 높습니다.');
    expect(summaryText).not.toContain('Off 요청을 11건 더 반영했습니다.');
    expect(summaryText).not.toContain('Off 요청을 3건 더 반영했습니다.');
    expect(summaryText).toContain('2안은 바로 확정할 수 있습니다.');
    expect(summaryText).toContain('3안은 직접 수정이 있어 다시 검사가 필요합니다.');
  });

  it('falls back to a neutral summary when both rates are missing', () => {
    const leftVersion = createVersionSummary({
      versionNo: 2,
      name: '2안',
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
      name: '3안',
      inputDiffSummary: {
        changedOffRequests: 5,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: null,
      },
      comparisonMetrics: null,
    });

    const wrapper = mount(ComparisonWorkspace, {
      props: {
        leftVersion,
        rightVersion,
        leftReview: null,
        rightReview: null,
        focusedVersionId: null,
      },
    });

    expect(wrapper.get('[data-test="comparison-summary"]').text()).toContain('두 안의 핵심 지표 차이가 크지 않습니다.');
  });
});
