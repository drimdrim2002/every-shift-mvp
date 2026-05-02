import { describe, expect, it } from 'vitest';

import {
  buildScheduleComparisonDecisionModel,
  buildScheduleComparisonSummary,
} from '@/utils/scheduleComparisonSummary';
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

function createEvaluation(
  overrides: Partial<NonNullable<ScheduleReviewResponse['latestEvaluation']>> = {}
) {
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
    assignmentHash: 'hash-1',
    solverExecutionId: null,
    evaluatorVersion: 'test',
    createdAt: '2026-05-03T00:00:00.000Z',
    ...overrides,
  } satisfies NonNullable<ScheduleReviewResponse['latestEvaluation']>;
}

function createReviewWithEvaluation(
  version: ScheduleVersionSummary,
  evaluationOverrides: Partial<NonNullable<ScheduleReviewResponse['latestEvaluation']>> = {}
): ScheduleReviewResponse {
  return createReviewResponse(version, {
    latestEvaluation: createEvaluation({
      scheduleId: version.scheduleId,
      scheduleVersionId: version.id,
      revisionNo: version.currentRevision,
      ...evaluationOverrides,
    }),
  });
}

function createMalformedReviewWithEvaluation(
  version: ScheduleVersionSummary,
  latestEvaluationOverrides: Record<string, unknown>
): ScheduleReviewResponse {
  return createReviewResponse(version, {
    latestEvaluation: {
      id: 'evaluation-malformed',
      scheduleId: version.scheduleId,
      scheduleVersionId: version.id,
      revisionNo: version.currentRevision,
      resultStatus: 'passed',
      violationDetails: [],
      infeasibility: null,
      finalizationGate: {
        allowed: true,
        blockingReasons: [],
      },
      assignmentHash: 'hash-malformed',
      solverExecutionId: null,
      evaluatorVersion: 'test',
      createdAt: '2026-05-03T00:00:00.000Z',
      ...latestEvaluationOverrides,
    } as NonNullable<ScheduleReviewResponse['latestEvaluation']>,
  });
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

describe('scheduleComparisonSummary', () => {
  it('비교 의사결정 모델의 기본 행 구조를 만든다', () => {
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
      inputDiffSummary: {
        changedOffRequests: 1,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: null,
      },
    });

    const model = buildScheduleComparisonDecisionModel({
      leftVersion,
      rightVersion,
      leftReview: createReviewWithEvaluation(leftVersion, {
        comparisonMetrics: {
          offRequestReflectionRate: null,
          nightShiftMin: null,
          nightShiftMax: 15,
          weekendShiftMin: null,
          weekendShiftMax: null,
          manualEditCount: 0,
        },
      }),
      rightReview: createReviewWithEvaluation(rightVersion, {
        comparisonMetrics: {
          offRequestReflectionRate: null,
          nightShiftMin: null,
          nightShiftMax: 15,
          weekendShiftMin: null,
          weekendShiftMax: null,
          manualEditCount: 0,
        },
      }),
    });

    expect(model.summaryBullets).toHaveLength(2);
    expect(model.summaryBullets).toContain('두 안 모두 필수 기준을 통과했습니다.');
    expect(model.summaryBullets).toContain('비교할 Off 요청이 없습니다.');
    expect(model.offInputRows).toEqual([
      {
        label: '변경 Off 요청',
        leftText: '3건',
        rightText: '1건',
      },
      {
        label: '변경 메모',
        leftText: '휴가 요청 반영',
        rightText: '메모 없음',
      },
    ]);
    expect(model.requirementRows.map((row) => row.label)).toEqual([
      'NOD 근무 불가',
      '3연속 야간(N) 근무 불가',
      '2연속 야간(N) 후 48시간 이상 휴식',
      '야간 근무 월 15회 이하',
      'Off 요청 준수',
    ]);
  });

  it('필수 기준 위반과 검토 정보 없음 상태를 행에 표시한다', () => {
    const leftVersion = createVersionSummary({
      versionNo: 2,
      name: '2안',
    });
    const rightVersion = createVersionSummary({
      versionNo: 3,
      name: '3안',
    });

    const model = buildScheduleComparisonDecisionModel({
      leftVersion,
      rightVersion,
      leftReview: createReviewWithEvaluation(leftVersion, {
        proofSummary: {
          weeklyHoursViolations: 0,
          nnnViolations: 2,
          nodViolations: 0,
          minimumRestViolations: 1,
          staffingShortfalls: 0,
        },
        comparisonMetrics: {
          offRequestReflectionRate: null,
          nightShiftMin: null,
          nightShiftMax: 16,
          weekendShiftMin: null,
          weekendShiftMax: null,
          manualEditCount: 0,
        },
      }),
      rightReview: null,
    });

    expect(model.requirementRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'NOD 근무 불가',
          leftStatus: 'passed',
          leftText: '통과',
          rightStatus: 'unknown',
          rightText: '검토 정보 없음',
        }),
        expect.objectContaining({
          label: '3연속 야간(N) 근무 불가',
          leftStatus: 'failed',
          leftText: '위반 2건',
          rightStatus: 'unknown',
          rightText: '검토 정보 없음',
        }),
        expect.objectContaining({
          label: '야간 근무 월 15회 이하',
          leftStatus: 'failed',
          leftText: '최대 16회',
          rightStatus: 'unknown',
          rightText: '검토 정보 없음',
        }),
      ])
    );
    expect(model.summaryBullets[0]).toBe(
      '검토 정보가 없는 항목이 있어 필수 기준 판단은 제한적입니다.'
    );
  });

  it('검토 응답의 중첩 필드가 누락돼도 통과로 오인하지 않고 검토 정보 없음으로 표시한다', () => {
    const leftVersion = createVersionSummary({
      versionNo: 2,
      name: '2안',
    });
    const rightVersion = createVersionSummary({
      versionNo: 3,
      name: '3안',
    });

    const buildModel = () =>
      buildScheduleComparisonDecisionModel({
        leftVersion,
        rightVersion,
        leftReview: createMalformedReviewWithEvaluation(leftVersion, {
          proofSummary: undefined,
          comparisonMetrics: undefined,
          offRequestResults: undefined,
        }),
        rightReview: createReviewWithEvaluation(rightVersion),
      });

    expect(buildModel).not.toThrow();

    const model = buildModel();
    expect(model.requirementRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'NOD 근무 불가',
          leftStatus: 'unknown',
          leftText: '검토 정보 없음',
        }),
        expect.objectContaining({
          label: '3연속 야간(N) 근무 불가',
          leftStatus: 'unknown',
          leftText: '검토 정보 없음',
        }),
        expect.objectContaining({
          label: '2연속 야간(N) 후 48시간 이상 휴식',
          leftStatus: 'unknown',
          leftText: '검토 정보 없음',
        }),
        expect.objectContaining({
          label: '야간 근무 월 15회 이하',
          leftStatus: 'unknown',
          leftText: '검토 정보 없음',
        }),
        expect.objectContaining({
          label: 'Off 요청 준수',
          leftStatus: 'unknown',
          leftText: '검토 정보 없음',
        }),
      ])
    );
    expect(model.summaryBullets[0]).toBe(
      '검토 정보가 없는 항목이 있어 필수 기준 판단은 제한적입니다.'
    );
  });

  it('필수 기준 위반 수가 다르고 더 안전한 안이 모두 통과한 경우 계획 문구를 표시한다', () => {
    const leftVersion = createVersionSummary({
      versionNo: 2,
      name: '2안',
    });
    const rightVersion = createVersionSummary({
      versionNo: 3,
      name: '3안',
    });

    const model = buildScheduleComparisonDecisionModel({
      leftVersion,
      rightVersion,
      leftReview: createReviewWithEvaluation(leftVersion, {
        comparisonMetrics: {
          offRequestReflectionRate: null,
          nightShiftMin: null,
          nightShiftMax: 15,
          weekendShiftMin: null,
          weekendShiftMax: null,
          manualEditCount: 0,
        },
      }),
      rightReview: createReviewWithEvaluation(rightVersion, {
        proofSummary: {
          weeklyHoursViolations: 0,
          nnnViolations: 1,
          nodViolations: 0,
          minimumRestViolations: 0,
          staffingShortfalls: 0,
        },
        comparisonMetrics: {
          offRequestReflectionRate: null,
          nightShiftMin: null,
          nightShiftMax: 15,
          weekendShiftMin: null,
          weekendShiftMax: null,
          manualEditCount: 0,
        },
      }),
    });

    expect(model.summaryBullets[0]).toBe('2안은 필수 기준을 모두 통과했습니다.');
  });

  it('필수 기준 위반 수가 다르고 더 안전한 안에도 위반이 있으면 차이를 표시한다', () => {
    const leftVersion = createVersionSummary({
      versionNo: 2,
      name: '2안',
    });
    const rightVersion = createVersionSummary({
      versionNo: 3,
      name: '3안',
    });

    const model = buildScheduleComparisonDecisionModel({
      leftVersion,
      rightVersion,
      leftReview: createReviewWithEvaluation(leftVersion, {
        proofSummary: {
          weeklyHoursViolations: 0,
          nnnViolations: 1,
          nodViolations: 0,
          minimumRestViolations: 0,
          staffingShortfalls: 0,
        },
        comparisonMetrics: {
          offRequestReflectionRate: null,
          nightShiftMin: null,
          nightShiftMax: 15,
          weekendShiftMin: null,
          weekendShiftMax: null,
          manualEditCount: 0,
        },
      }),
      rightReview: createReviewWithEvaluation(rightVersion, {
        proofSummary: {
          weeklyHoursViolations: 0,
          nnnViolations: 1,
          nodViolations: 1,
          minimumRestViolations: 1,
          staffingShortfalls: 0,
        },
        comparisonMetrics: {
          offRequestReflectionRate: null,
          nightShiftMin: null,
          nightShiftMax: 15,
          weekendShiftMin: null,
          weekendShiftMax: null,
          manualEditCount: 0,
        },
      }),
    });

    expect(model.summaryBullets[0]).toBe('2안의 필수 기준 위반이 2건 더 적습니다.');
  });

  it('두 안의 필수 기준 위반 수가 같고 0보다 크면 공통 위반 수를 표시한다', () => {
    const leftVersion = createVersionSummary({
      versionNo: 2,
      name: '2안',
    });
    const rightVersion = createVersionSummary({
      versionNo: 3,
      name: '3안',
    });

    const model = buildScheduleComparisonDecisionModel({
      leftVersion,
      rightVersion,
      leftReview: createReviewWithEvaluation(leftVersion, {
        proofSummary: {
          weeklyHoursViolations: 0,
          nnnViolations: 1,
          nodViolations: 0,
          minimumRestViolations: 0,
          staffingShortfalls: 0,
        },
        comparisonMetrics: {
          offRequestReflectionRate: null,
          nightShiftMin: null,
          nightShiftMax: 15,
          weekendShiftMin: null,
          weekendShiftMax: null,
          manualEditCount: 0,
        },
      }),
      rightReview: createReviewWithEvaluation(rightVersion, {
        proofSummary: {
          weeklyHoursViolations: 0,
          nnnViolations: 0,
          nodViolations: 1,
          minimumRestViolations: 0,
          staffingShortfalls: 0,
        },
        comparisonMetrics: {
          offRequestReflectionRate: null,
          nightShiftMin: null,
          nightShiftMax: 15,
          weekendShiftMin: null,
          weekendShiftMax: null,
          manualEditCount: 0,
        },
      }),
    });

    expect(model.summaryBullets[0]).toBe('두 안 모두 필수 기준 위반 1건이 있습니다.');
  });

  it('정확한 Off 요청 결과가 반영률 대체 지표보다 우선한다', () => {
    const leftVersion = createVersionSummary({
      versionNo: 2,
      name: '2안',
      comparisonMetrics: {
        offRequestReflectionRate: 81,
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
      comparisonMetrics: {
        offRequestReflectionRate: 81,
        nightShiftMin: null,
        nightShiftMax: null,
        weekendShiftMin: null,
        weekendShiftMax: null,
        manualEditCount: 0,
      },
    });

    const model = buildScheduleComparisonDecisionModel({
      leftVersion,
      rightVersion,
      leftReview: createReviewWithEvaluation(leftVersion, {
        offRequestResults: [
          createOffRequestResult(),
          createOffRequestResult({ employeeId: 'employee-2' }),
          createOffRequestResult({
            employeeId: 'employee-3',
            resolutionStatus: 'unfulfilled',
            fulfilled: false,
          }),
        ],
        comparisonMetrics: {
          offRequestReflectionRate: 100,
          nightShiftMin: null,
          nightShiftMax: null,
          weekendShiftMin: null,
          weekendShiftMax: null,
          manualEditCount: 0,
        },
      }),
      rightReview: createReviewWithEvaluation(rightVersion, {
        offRequestResults: [],
      }),
    });

    expect(model.requirementRows).toContainEqual(
      expect.objectContaining({
        label: 'Off 요청 준수',
        leftStatus: 'failed',
        leftText: '3건 중 2건 반영 (67%)',
        rightStatus: 'unknown',
        rightText: '요청 없음',
      })
    );
  });

  it('정확한 Off 요청 반영률이 같으면 계획 문구를 표시한다', () => {
    const leftVersion = createVersionSummary({
      versionNo: 2,
      name: '2안',
    });
    const rightVersion = createVersionSummary({
      versionNo: 3,
      name: '3안',
    });

    const model = buildScheduleComparisonDecisionModel({
      leftVersion,
      rightVersion,
      leftReview: createReviewWithEvaluation(leftVersion, {
        offRequestResults: [
          createOffRequestResult(),
          createOffRequestResult({ employeeId: 'employee-2' }),
        ],
      }),
      rightReview: createReviewWithEvaluation(rightVersion, {
        offRequestResults: [
          createOffRequestResult(),
          createOffRequestResult({ employeeId: 'employee-2' }),
          createOffRequestResult({ employeeId: 'employee-3' }),
        ],
      }),
    });

    expect(model.summaryBullets).toContain('두 안의 Off 요청 반영률은 같습니다.');
  });

  it('Off 요청 대체 반영률은 0.81과 81을 모두 81%로 표시한다', () => {
    const leftVersion = createVersionSummary({
      versionNo: 2,
      name: '2안',
      comparisonMetrics: {
        offRequestReflectionRate: 0.81,
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
      comparisonMetrics: {
        offRequestReflectionRate: 81,
        nightShiftMin: null,
        nightShiftMax: null,
        weekendShiftMin: null,
        weekendShiftMax: null,
        manualEditCount: 0,
      },
    });

    const model = buildScheduleComparisonDecisionModel({
      leftVersion,
      rightVersion,
      leftReview: null,
      rightReview: null,
    });
    const offRow = model.requirementRows.find((row) => row.label === 'Off 요청 준수');

    expect(offRow).toEqual(
      expect.objectContaining({
        leftStatus: 'unknown',
        leftText: '반영률 81%',
        rightStatus: 'unknown',
        rightText: '반영률 81%',
      })
    );
    expect(offRow?.leftText).not.toContain('건 중');
    expect(offRow?.rightText).not.toContain('건 중');
  });

  it('builds plain-language bullets from truthful reflection-rate data', () => {
    const leftVersion = createVersionSummary({
      versionNo: 2,
      name: '2안',
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
      name: '3안',
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
      '3안의 Off 요청 반영률이 더 높습니다.',
      '2안은 바로 확정할 수 있습니다.',
      '3안은 직접 수정이 있어 다시 검사가 필요합니다.',
    ]);
  });

  it('omits Off-request claims when reflection rates are unavailable', () => {
    const leftVersion = createVersionSummary({
      versionNo: 2,
      name: '2안',
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
      name: '3안',
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
