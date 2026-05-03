import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ComparisonWorkspace from '@/components/schedule/review/ComparisonWorkspace.vue';
import type {
  ScheduleOffRequestResult,
  ScheduleReviewResponse,
  ScheduleVersionSummary,
} from '@/types/schedule';
import type { ScheduleComplianceResult } from '@/types/scheduleCompliance';
import type { ScheduleComparisonOffInputSnapshot } from '@/utils/scheduleComparisonSummary';

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

function createComplianceResult(
  overrides: Partial<ScheduleComplianceResult> = {}
): ScheduleComplianceResult {
  return {
    mandatoryPassed: true,
    canFinalizeLocally: true,
    mandatoryViolationCount: 0,
    checkRequiredCount: 0,
    summaries: [
      { code: 'nod_pattern', label: 'NOD 금지', status: 'passed', violationCount: 0, message: '통과' },
      { code: 'triple_night', label: '3연속 야간 금지', status: 'failed', violationCount: 2, message: '위반 2건' },
      { code: 'rest_after_two_nights', label: '2연속 야간 후 48시간 휴식', status: 'check_required', violationCount: 0, message: '확인 필요' },
      { code: 'monthly_night_limit', label: '월 야간 15회 이하', status: 'passed', violationCount: 0, message: '통과' },
    ],
    violations: [],
    offRequests: {
      totalRequests: 0,
      fulfilledRequests: 0,
      unfulfilledRequests: 0,
      reflectionRate: null,
    },
    ...overrides,
  };
}

function createOffInput(
  constraints: ScheduleComparisonOffInputSnapshot['constraints'],
  notes: ScheduleComparisonOffInputSnapshot['notes'] = {}
): ScheduleComparisonOffInputSnapshot {
  return { constraints, notes };
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
      leftComplianceResult: null,
      rightComplianceResult: null,
      leftOffInput: null,
      rightOffInput: null,
      employees: [],
      month: '2026-05',
      ...props,
    },
  });
}

function visibleIndex(text: string, label: string) {
  const index = text.indexOf(label);
  expect(index, `${label} should be visible`).toBeGreaterThanOrEqual(0);
  return index;
}

describe('ComparisonWorkspace', () => {
  it('shows the decision-first sections before detail actions and status text', () => {
    const wrapper = mountWorkspace();
    const text = wrapper.text();
    const summaryIndex = visibleIndex(text, '핵심 판단');
    const offInputIndex = visibleIndex(text, 'Off 요청 입력 차이');
    const requirementsIndex = visibleIndex(text, '요구사항 충족 비교');
    const detailButtonIndex = visibleIndex(text, '이 근무표안 자세히 보기');
    const statusIndex = visibleIndex(text, '상태:');

    expect(summaryIndex).toBeLessThan(offInputIndex);
    expect(offInputIndex).toBeLessThan(requirementsIndex);
    expect(requirementsIndex).toBeLessThan(detailButtonIndex);
    expect(summaryIndex).toBeLessThan(statusIndex);
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

  it('shows employee-date Off input diff rows', () => {
    const wrapper = mountWorkspace({
      leftComplianceResult: createComplianceResult(),
      rightComplianceResult: createComplianceResult(),
      employees: [
        { id: 'employee-1', name: '김간호' },
        { id: 'employee-2', name: '박간호' },
      ],
      leftOffInput: createOffInput({
        'employee-1': { '2026-05-05': 'O' },
      }),
      rightOffInput: createOffInput({
        'employee-2': { '2026-05-06': 'O' },
      }),
    });

    const offInputText = wrapper.get('[data-test="comparison-off-input"]').text();

    expect(offInputText).toContain('김간호');
    expect(offInputText).toContain('2026-05-05');
    expect(offInputText).toContain('왼쪽만 Off');
    expect(offInputText).toContain('박간호');
    expect(offInputText).toContain('오른쪽만 Off');
  });

  it('shows empty Off input diff copy', () => {
    const wrapper = mountWorkspace({
      leftComplianceResult: createComplianceResult(),
      rightComplianceResult: createComplianceResult(),
      leftOffInput: createOffInput({}),
      rightOffInput: createOffInput({}),
    });

    expect(wrapper.get('[data-test="comparison-off-input"]').text()).toContain(
      '두 안의 Off 요청 입력은 같습니다.'
    );
  });

  it('switches to calendar view and shows diff badges by date', async () => {
    const wrapper = mountWorkspace({
      leftComplianceResult: createComplianceResult(),
      rightComplianceResult: createComplianceResult(),
      employees: [{ id: 'employee-1', name: '김간호' }],
      leftOffInput: createOffInput({
        'employee-1': { '2026-05-05': 'O' },
      }),
      rightOffInput: createOffInput({}),
      month: '2026-05',
    });

    await wrapper.get('[data-test="off-diff-calendar-view"]').trigger('click');

    const calendarText = wrapper.get('[data-test="off-diff-calendar"]').text();
    expect(calendarText).toContain('5');
    expect(calendarText).toContain('김간호 · 왼쪽만 Off');
  });

  it('shows compliance-first requirement status text', () => {
    const wrapper = mountWorkspace({
      leftComplianceResult: createComplianceResult(),
      rightComplianceResult: createComplianceResult({
        summaries: [
          { code: 'nod_pattern', label: 'NOD 금지', status: 'passed', violationCount: 0, message: '통과' },
          { code: 'triple_night', label: '3연속 야간 금지', status: 'passed', violationCount: 0, message: '통과' },
          { code: 'rest_after_two_nights', label: '2연속 야간 후 48시간 휴식', status: 'passed', violationCount: 0, message: '통과' },
          { code: 'monthly_night_limit', label: '월 야간 15회 이하', status: 'passed', violationCount: 0, message: '통과' },
        ],
      }),
    });

    const requirementsText = wrapper.get('[data-test="comparison-requirements"]').text();

    expect(requirementsText).toContain('통과');
    expect(requirementsText).toContain('위반 2건');
    expect(requirementsText).toContain('확인 필요');
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

  it('uses unique accessible labels and visible focused-state copy for detail actions', () => {
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
      focusedVersionId: rightVersion.id,
    });

    const leftButton = wrapper.get(`[data-test="detail-version-${leftVersion.id}"]`);
    const rightButton = wrapper.get(`[data-test="detail-version-${rightVersion.id}"]`);

    expect(leftButton.text()).toBe('이 근무표안 자세히 보기');
    expect(rightButton.text()).toBe('이 근무표안 자세히 보기');
    expect(leftButton.attributes('aria-label')).toBe('이 근무표안 자세히 보기 - 왼쪽 근무표안');
    expect(rightButton.attributes('aria-label')).toBe('이 근무표안 자세히 보기 - 오른쪽 근무표안');
    expect(wrapper.get('[data-test="comparison-slot-left"]').text()).not.toContain('현재 확인 중');
    expect(wrapper.get('[data-test="comparison-slot-right"]').text()).toContain('현재 확인 중');
  });
});
