import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ComparisonWorkspace from '@/components/schedule/review/ComparisonWorkspace.vue';
import type {
  ScheduleOffRequestResult,
  ScheduleReviewResponse,
  ScheduleVersionSummary,
} from '@/types/schedule';

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

function createOffRequestResult(
  overrides: Partial<ScheduleOffRequestResult> = {}
): ScheduleOffRequestResult {
  return {
    employeeId: 'employee-1',
    date: '2026-05-03',
    requestCode: 'O',
    requestNote: null,
    isSoft: true,
    resolutionStatus: 'fulfilled',
    resolvedShiftId: null,
    resolvedAt: null,
    fulfilled: true,
    reason: null,
    ...overrides,
  };
}

function createEvaluation(
  version: ScheduleVersionSummary,
  overrides: Partial<NonNullable<ScheduleReviewResponse['latestEvaluation']>> = {}
): NonNullable<ScheduleReviewResponse['latestEvaluation']> {
  return {
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
      offRequestReflectionRate: null,
      nightShiftMin: null,
      nightShiftMax: 15,
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
    createdAt: '2026-05-03T00:00:00.000Z',
    ...overrides,
  };
}

function mountWorkspace(
  props: Partial<InstanceType<typeof ComparisonWorkspace>['$props']> = {}
) {
  const leftVersion = createVersionSummary({
    versionNo: 2,
    name: '2안',
    inputDiffSummary: {
      changedOffRequests: 3,
      changedLockedAssignments: 0,
      changedSiteRequirements: 0,
      note: '휴가 요청 반영',
    },
  });
  const rightVersion = createVersionSummary({
    versionNo: 3,
    name: '3안',
    manualEditCount: 2,
    inputDiffSummary: {
      changedOffRequests: 1,
      changedLockedAssignments: 0,
      changedSiteRequirements: 0,
      note: null,
    },
  });

  return mount(ComparisonWorkspace, {
    props: {
      leftVersion,
      rightVersion,
      leftReview: createReviewResponse(leftVersion, {
        latestEvaluation: createEvaluation(leftVersion, {
          offRequestResults: [
            createOffRequestResult({ employeeId: 'employee-1', fulfilled: true }),
            createOffRequestResult({
              employeeId: 'employee-2',
              fulfilled: false,
              resolutionStatus: 'rejected',
              reason: '필수 인력 기준 우선',
            }),
          ],
        }),
      }),
      rightReview: createReviewResponse(rightVersion, {
        latestEvaluation: createEvaluation(rightVersion),
      }),
      focusedVersionId: rightVersion.id,
      ...props,
    },
  });
}

describe('ComparisonWorkspace', () => {
  it('shows the decision-first sections before detail actions and status text', () => {
    const wrapper = mountWorkspace();
    const text = wrapper.text();

    expect(text.indexOf('핵심 판단')).toBeLessThan(text.indexOf('Off 요청 입력 차이'));
    expect(text.indexOf('Off 요청 입력 차이')).toBeLessThan(text.indexOf('요구사항 충족 비교'));
    expect(text.indexOf('요구사항 충족 비교')).toBeLessThan(
      text.indexOf('이 근무표안 자세히 보기')
    );
    expect(text.indexOf('핵심 판단')).toBeLessThan(text.indexOf('상태:'));
  });

  it('shows requirement status text from review data and missing review fallback', () => {
    const leftVersion = createVersionSummary({ versionNo: 2, name: '2안' });
    const rightVersion = createVersionSummary({ versionNo: 3, name: '3안' });

    const wrapper = mountWorkspace({
      leftVersion,
      rightVersion,
      leftReview: createReviewResponse(leftVersion, {
        latestEvaluation: createEvaluation(leftVersion, {
          proofSummary: {
            weeklyHoursViolations: 0,
            nnnViolations: 0,
            nodViolations: 2,
            minimumRestViolations: 0,
            staffingShortfalls: 0,
          },
          offRequestResults: [],
          comparisonMetrics: {
            offRequestReflectionRate: null,
            nightShiftMin: null,
            nightShiftMax: 16,
            weekendShiftMin: null,
            weekendShiftMax: null,
            manualEditCount: 0,
          },
        }),
      }),
      rightReview: null,
      focusedVersionId: null,
    });

    const requirementsText = wrapper.get('[data-test="comparison-requirements"]').text();

    expect(requirementsText).toContain('통과');
    expect(requirementsText).toContain('위반 2건');
    expect(requirementsText).toContain('검토 정보 없음');
    expect(requirementsText).toContain('요청 없음');
  });

  it('emits focus-version from both detail buttons', async () => {
    const leftVersion = createVersionSummary({ versionNo: 2, name: '2안' });
    const rightVersion = createVersionSummary({ versionNo: 3, name: '3안' });
    const wrapper = mountWorkspace({
      leftVersion,
      rightVersion,
      leftReview: createReviewResponse(leftVersion, {
        latestEvaluation: createEvaluation(leftVersion),
      }),
      rightReview: createReviewResponse(rightVersion, {
        latestEvaluation: createEvaluation(rightVersion),
      }),
      focusedVersionId: null,
    });

    await wrapper.get(`[data-test="detail-version-${leftVersion.id}"]`).trigger('click');
    await wrapper.get(`[data-test="detail-version-${rightVersion.id}"]`).trigger('click');

    expect(wrapper.emitted('focus-version')).toEqual([[leftVersion.id], [rightVersion.id]]);
  });
});
