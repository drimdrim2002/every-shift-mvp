import { describe, expect, it } from 'vitest';
import {
  allowedMethods,
  matchRoute,
  normalizePathSegments,
  parseCreateVersionRequest,
  parsePatchScheduleVersionAssignmentsRequest,
  parseScheduleVersionSolveRequest,
  parseScheduleVersionSolverResultRequest,
} from '@/../supabase/functions/phase2-schedule/contracts.ts';

describe('phase2 schedule contracts', () => {
  it('matches the Slice 5 mutation routes and allowed methods', () => {
    expect(
      matchRoute(normalizePathSegments('/functions/v1/phase2-schedule/schedules/schedule-1/versions'))
    ).toEqual({
      route: 'createVersion',
      params: {
        scheduleId: 'schedule-1',
      },
    });

    expect(
      matchRoute(
        normalizePathSegments('/functions/v1/phase2-schedule/schedule-versions/version-1/solve')
      )
    ).toEqual({
      route: 'solve',
      params: {
        versionId: 'version-1',
      },
    });

    expect(
      matchRoute(
        normalizePathSegments(
          '/functions/v1/phase2-schedule/schedule-versions/version-1/solver-result'
        )
      )
    ).toEqual({
      route: 'solverResult',
      params: {
        versionId: 'version-1',
      },
    });

    expect(
      matchRoute(
        normalizePathSegments(
          '/functions/v1/phase2-schedule/schedule-versions/version-1/assignments'
        )
      )
    ).toEqual({
      route: 'patchAssignments',
      params: {
        versionId: 'version-1',
      },
    });

    expect(allowedMethods('createVersion')).toEqual(['POST']);
    expect(allowedMethods('solve')).toEqual(['POST']);
    expect(allowedMethods('solverResult')).toEqual(['POST']);
    expect(allowedMethods('patchAssignments')).toEqual(['PATCH']);
  });

  it('parses create version request bodies', () => {
    expect(
      parseCreateVersionRequest({
        baseVersionId: '11111111-1111-4111-8111-111111111111',
        name: 'V2',
        sourceType: 're_solve',
        inputDiffSummary: {
          changedOffRequests: 1,
          changedLockedAssignments: 2,
          changedSiteRequirements: 3,
          note: 'retry',
        },
      })
    ).toEqual({
      baseVersionId: '11111111-1111-4111-8111-111111111111',
      name: 'V2',
      sourceType: 're_solve',
      inputDiffSummary: {
        changedOffRequests: 1,
        changedLockedAssignments: 2,
        changedSiteRequirements: 3,
        note: 'retry',
      },
    });
  });

  it('parses solve request bodies', () => {
    expect(
      parseScheduleVersionSolveRequest({
        solverExecutionId: 'exec-1',
      })
    ).toEqual({
      solverExecutionId: 'exec-1',
    });
  });

  it('parses solver result bodies for completed and failed results', () => {
    expect(
      parseScheduleVersionSolverResultRequest({
        status: 'completed',
        solverExecutionId: 'exec-2',
        assignments: [
          {
            employeeId: '22222222-2222-4222-8222-222222222222',
            date: '2026-04-01',
            shiftId: '33333333-3333-4333-8333-333333333333',
            isLocked: false,
          },
        ],
        score: {
          hardScore: 10,
          softScore: 20,
        },
      })
    ).toEqual({
      status: 'completed',
      solverExecutionId: 'exec-2',
      assignments: [
        {
          employeeId: '22222222-2222-4222-8222-222222222222',
          date: '2026-04-01',
          shiftId: '33333333-3333-4333-8333-333333333333',
          isLocked: false,
          comment: null,
          offReason: null,
        },
      ],
      score: {
        hardScore: 10,
        softScore: 20,
      },
      failureReason: null,
    });

    expect(
      parseScheduleVersionSolverResultRequest({
        status: 'failed',
        solverExecutionId: 'exec-3',
        failureReason: 'timeout',
      })
    ).toEqual({
      status: 'failed',
      solverExecutionId: 'exec-3',
      assignments: [],
      score: null,
      failureReason: 'timeout',
    });
  });

  it('parses version assignment patch bodies', () => {
    expect(
      parsePatchScheduleVersionAssignmentsRequest({
        changes: [
          {
            employeeId: '44444444-4444-4444-8444-444444444444',
            date: '2026-04-02',
            shiftId: '55555555-5555-4555-8555-555555555555',
            comment: 'manual move',
            offReason: null,
            isLocked: false,
          },
        ],
      })
    ).toEqual({
      changes: [
        {
          employeeId: '44444444-4444-4444-8444-444444444444',
          date: '2026-04-02',
          shiftId: '55555555-5555-4555-8555-555555555555',
          comment: 'manual move',
          offReason: null,
          isLocked: false,
        },
      ],
    });
  });
});
