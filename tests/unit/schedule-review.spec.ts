import { describe, expect, it } from 'vitest';
import { evaluateScheduleTrust } from '@/../supabase/functions/phase2-schedule/engine.ts';
import {
  buildPrimaryActionSupportCopy,
  resolveDefaultReviewTab,
  resolveReviewLeadPanel,
} from '@/utils/scheduleReviewState';
import type {
  ScheduleEvaluation,
  ScheduleFinalizationGate,
  SchedulePrimaryAction,
} from '@/types/schedule';

function createPrimaryAction(overrides: Partial<SchedulePrimaryAction> = {}): SchedulePrimaryAction {
  return {
    kind: 'select',
    targetVersionId: 'version-1',
    label: '이 버전을 선택',
    disabledReason: null,
    ...overrides,
  };
}

function createFinalizationGate(
  overrides: Partial<ScheduleFinalizationGate> = {}
): ScheduleFinalizationGate {
  return {
    allowed: true,
    blockingReasons: [],
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
      nightShiftMin: 0,
      nightShiftMax: 0,
      weekendShiftMin: 0,
      weekendShiftMax: 0,
      manualEditCount: 0,
    },
    finalizationGate: createFinalizationGate(),
    assignmentHash: 'hash-1',
    solverExecutionId: null,
    evaluatorVersion: 'v1',
    createdAt: '2026-04-02T00:00:00Z',
    ...overrides,
  };
}

describe('scheduleReviewState', () => {
  it('maps each Slice 8 status to the correct lead panel', () => {
    expect(resolveReviewLeadPanel('review_ready')).toBe('grid');
    expect(resolveReviewLeadPanel('finalized')).toBe('grid');
    expect(resolveReviewLeadPanel('review_pending')).toBe('pending');
    expect(resolveReviewLeadPanel('review_blocked')).toBe('proof');
    expect(resolveReviewLeadPanel('infeasible')).toBe('infeasible');
    expect(resolveReviewLeadPanel('solve_failed')).toBe('failure');
  });

  it('defaults review_blocked to the proof tab and other states to grid', () => {
    expect(resolveDefaultReviewTab('review_blocked')).toBe('proof');
    expect(resolveDefaultReviewTab('review_ready')).toBe('grid');
    expect(resolveDefaultReviewTab('review_pending')).toBe('grid');
    expect(resolveDefaultReviewTab('infeasible')).toBe('grid');
    expect(resolveDefaultReviewTab('solve_failed')).toBe('grid');
    expect(resolveDefaultReviewTab('finalized')).toBe('grid');
  });

  it('prefers disabled copy, then latest failure summary, then gate copy for primary actions', () => {
    expect(
      buildPrimaryActionSupportCopy({
        action: createPrimaryAction({
          disabledReason: '이 버전은 이미 선택되어 있습니다.',
        }),
        gate: createFinalizationGate({
          allowed: false,
          blockingReasons: [
            {
              code: 'blocked',
              message: '게이트 메시지',
            },
          ],
        }),
        latestEvaluation: createEvaluation({
          resultStatus: 'solve_failed',
          infeasibility: {
            summary: 'Solver execution failed.',
            reason: 'worker_crash',
            details: {
              traceId: 'trace-123',
            },
          },
        }),
      })
    ).toBe('이 버전은 이미 선택되어 있습니다.');

    expect(
      buildPrimaryActionSupportCopy({
        action: createPrimaryAction({
          kind: 'retry',
          label: '다시 생성',
          disabledReason: null,
        }),
        gate: createFinalizationGate(),
        latestEvaluation: createEvaluation({
          resultStatus: 'solve_failed',
          infeasibility: {
            summary: 'Solver execution failed.',
            reason: 'worker_crash',
            details: {
              traceId: 'trace-123',
            },
          },
        }),
      })
    ).toBe('Solver execution failed.');

    expect(
      buildPrimaryActionSupportCopy({
        action: createPrimaryAction({
          kind: 'finalize',
          label: '이 버전 확정',
          disabledReason: null,
        }),
        gate: createFinalizationGate({
          allowed: false,
          blockingReasons: [
            {
              code: 'blocked',
              message: '게이트 메시지',
            },
          ],
        }),
        latestEvaluation: createEvaluation(),
      })
    ).toBe('게이트 메시지');
  });
});

describe('evaluateScheduleTrust', () => {
  it('preserves solve_failed failure summary and details in the evaluation artifact', async () => {
    const result = await evaluateScheduleTrust({
      month: '2026-04',
      manualEditCount: 0,
      assignments: [],
      preferences: [],
      siteRequirements: [],
      shifts: [],
      employees: [],
      forcedResultStatus: 'solve_failed',
      failureReason: 'solver crashed',
      failureType: 'worker_crash',
      failureContext: {
        traceId: 'trace-123',
        workerId: 'worker-9',
      },
    });

    expect(result.resultStatus).toBe('solve_failed');
    expect(result.infeasibility).toEqual({
      summary: 'solver crashed',
      reason: 'worker_crash',
      details: {
        traceId: 'trace-123',
        workerId: 'worker-9',
      },
    });
    expect(result.finalizationGate.allowed).toBe(false);
    expect(result.finalizationGate.blockingReasons[0]?.code).toBe('solve_failed');
  });
});
