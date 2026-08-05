import { describe, expect, it } from 'vitest';
import type { ScheduleSummary } from '@/api/schedule';
import type { ScheduleCompareResponse } from '@/types/schedule';
import {
  getBlockedScheduleMonths,
  getScheduleMonthDisplayState,
  getScheduleMonthTileLabel,
  isInProgressScheduleMonth,
  isScheduleMonthBlockedForCreation,
  resolveResumeStepFromCompare,
} from '@/utils/scheduleMonthState';

function createSchedule(
  overrides: Partial<ScheduleSummary> = {}
): ScheduleSummary {
  return {
    id: 'schedule-1',
    public_id: 'sch_test123456',
    organization_id: 'org-1',
    month: '2026-05',
    status: 'created',
    hard_score: null,
    soft_score: null,
    solver_execution_id: null,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

function createCompare(
  overrides: Partial<ScheduleCompareResponse> = {}
): ScheduleCompareResponse {
  return {
    scheduleId: 'schedule-1',
    schedulePublicId: 'sch_test123456',
    organizationId: 'org-1',
    month: '2026-05',
    selectedVersionId: 'version-1',
    finalizedVersionId: null,
    activeSolvingVersionId: null,
    versions: [
      {
        id: 'version-1',
        scheduleId: 'schedule-1',
        versionNo: 1,
        name: 'V1',
        sourceType: 'initial_solve',
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
        activeSolverExecutionId: null,
        isSelected: true,
        isFinalized: false,
      },
    ],
    ...overrides,
  };
}

describe('scheduleMonthState', () => {
  it('maps schedule statuses to display states', () => {
    expect(getScheduleMonthDisplayState(null)).toBe('empty');
    expect(getScheduleMonthDisplayState(createSchedule({ status: 'created' }))).toBe('draft');
    expect(getScheduleMonthDisplayState(createSchedule({ status: 'running' }))).toBe('running');
    expect(getScheduleMonthDisplayState(createSchedule({ status: 'complete' }))).toBe('ready');
    expect(getScheduleMonthDisplayState(createSchedule({ status: 'changed' }))).toBe('ready');
    expect(getScheduleMonthDisplayState(createSchedule({ status: 'error' }))).toBe('error');
  });

  it('marks complete months without assignments as ready_empty', () => {
    expect(
      getScheduleMonthDisplayState(createSchedule({ status: 'complete', has_assignments: false })),
    ).toBe('ready_empty');
    expect(
      getScheduleMonthDisplayState(createSchedule({ status: 'complete', has_assignments: true })),
    ).toBe('ready');
    expect(getScheduleMonthTileLabel('ready_empty')).toBe('배정 없음');
  });

  it('blocks only running and completed months for creation', () => {
    expect(isScheduleMonthBlockedForCreation(createSchedule({ status: 'created' }))).toBe(false);
    expect(isScheduleMonthBlockedForCreation(createSchedule({ status: 'error' }))).toBe(false);
    expect(isScheduleMonthBlockedForCreation(createSchedule({ status: 'running' }))).toBe(true);
    expect(isScheduleMonthBlockedForCreation(createSchedule({ status: 'complete' }))).toBe(true);
    expect(isScheduleMonthBlockedForCreation(createSchedule({ status: 'changed' }))).toBe(true);
  });

  it('returns blocked months from a schedule list', () => {
    expect(getBlockedScheduleMonths([
      createSchedule({ month: '2026-04', status: 'complete' }),
      createSchedule({ month: '2026-05', status: 'created' }),
      createSchedule({ month: '2026-06', status: 'running' }),
    ])).toEqual(['2026-04', '2026-06']);
  });

  it('labels tiles by display state', () => {
    expect(getScheduleMonthTileLabel('empty')).toBe('생성 전');
    expect(getScheduleMonthTileLabel('draft')).toBe('이어서 진행');
    expect(getScheduleMonthTileLabel('ready')).toBe('결과 보기');
  });

  it('treats created and error schedules as in progress', () => {
    expect(isInProgressScheduleMonth(createSchedule({ status: 'created' }))).toBe(true);
    expect(isInProgressScheduleMonth(createSchedule({ status: 'error' }))).toBe(true);
    expect(isInProgressScheduleMonth(createSchedule({ status: 'complete' }))).toBe(false);
  });

  it('resumes draft schedules at step4 or step5 based on compare and preferences', () => {
    const draft = createSchedule({ status: 'created' });
    const compare = createCompare();

    expect(resolveResumeStepFromCompare(draft, compare, false)).toBe('step4');
    expect(resolveResumeStepFromCompare(draft, compare, true)).toBe('step5');
    expect(resolveResumeStepFromCompare(
      createSchedule({ status: 'error' }),
      compare,
      true
    )).toBe('step4');
    expect(resolveResumeStepFromCompare(
      createSchedule({ status: 'complete' }),
      compare,
      false
    )).toBe('step5');
    expect(resolveResumeStepFromCompare(
      draft,
      createCompare({
        versions: [
          {
            ...createCompare().versions[0]!,
            status: 'review_ready',
            latestEvaluationId: 'eval-1',
          },
        ],
      }),
      false
    )).toBe('step5');
  });
});
