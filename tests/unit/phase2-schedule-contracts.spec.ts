import { describe, expect, it } from 'vitest';
import {
  allowedMethods,
  isValidUuid,
  matchRoute,
  normalizePathSegments,
  parseDeleteMonthRequest,
  parseEnsureRequest,
  parseCreateVersionRequest,
  parsePatchScheduleVersionAssignmentsRequest,
  parseResetRosterRequest,
  parseScheduleVersionSolveRequest,
  parseScheduleVersionSolverResultRequest,
} from '@/../supabase/functions/phase2-schedule/contracts.ts';

describe('phase2 schedule contracts', () => {
  it('matches mutation routes and allowed methods including trust-gate actions', () => {
    expect(
      matchRoute(normalizePathSegments('/functions/v1/phase2-schedule/schedules/schedule-1/versions'))
    ).toEqual({
      route: 'createVersion',
      params: {
        scheduleId: 'schedule-1',
      },
    });

    expect(
      matchRoute(normalizePathSegments('/functions/v1/phase2-schedule/schedules/reset-roster'))
    ).toEqual({
      route: 'resetRoster',
      params: {},
    });

    expect(
      matchRoute(
        normalizePathSegments(
          '/functions/v1/phase2-schedule/schedules/11111111-1111-4111-8111-111111111111/reset-active-flow'
        )
      )
    ).toEqual({
      route: 'resetActiveFlow',
      params: {
        scheduleId: '11111111-1111-4111-8111-111111111111',
      },
    });

    expect(
      matchRoute(normalizePathSegments('/functions/v1/phase2-schedule/schedules/delete-month'))
    ).toEqual({
      route: 'deleteMonth',
      params: {},
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

    expect(
      matchRoute(
        normalizePathSegments(
          '/functions/v1/phase2-schedule/schedule-versions/version-1/recheck'
        )
      )
    ).toEqual({
      route: 'recheck',
      params: {
        versionId: 'version-1',
      },
    });

    expect(
      matchRoute(
        normalizePathSegments(
          '/functions/v1/phase2-schedule/schedule-versions/version-1/finalize'
        )
      )
    ).toEqual({
      route: 'finalize',
      params: {
        versionId: 'version-1',
      },
    });

    expect(allowedMethods('createVersion')).toEqual(['POST']);
    expect(allowedMethods('resetRoster')).toEqual(['POST']);
    expect(allowedMethods('resetActiveFlow')).toEqual(['POST']);
    expect(allowedMethods('deleteMonth')).toEqual(['POST']);
    expect(allowedMethods('solve')).toEqual(['POST']);
    expect(allowedMethods('solverResult')).toEqual(['POST']);
    expect(allowedMethods('patchAssignments')).toEqual(['PATCH']);
    expect(allowedMethods('recheck')).toEqual(['POST']);
    expect(allowedMethods('finalize')).toEqual(['POST']);
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

  it('parses reset roster request bodies', () => {
    expect(
      parseResetRosterRequest({
        organizationId: '00000000-0000-0000-0000-000000000001',
        month: '2026-04',
        employees: [
          {
            employeeId: 'E-001',
            name: 'Alice',
            availableShifts: ['D', 'E', 'N'],
          },
        ],
      })
    ).toEqual({
      organizationId: '00000000-0000-0000-0000-000000000001',
      month: '2026-04',
      employees: [
        {
          employeeId: 'E-001',
          name: 'Alice',
          availableShifts: ['D', 'E', 'N'],
        },
      ],
    });
  });

  it('parses delete month request bodies', () => {
    expect(
      parseDeleteMonthRequest({
        organizationId: '11111111-1111-4111-8111-111111111111',
        month: '2026-04',
      })
    ).toEqual({
      organizationId: '11111111-1111-4111-8111-111111111111',
      month: '2026-04',
    });

    expect(() => parseDeleteMonthRequest({ organizationId: 'bad', month: '2026-04' })).toThrow();
    expect(() => parseDeleteMonthRequest({
      organizationId: '11111111-1111-4111-8111-111111111111',
      month: '2026-13',
    })).toThrow();
  });

  it('accepts canonical postgres uuids used by seeded organizations', () => {
    expect(isValidUuid('00000000-0000-0000-0000-000000000001')).toBe(true);

    expect(
      parseEnsureRequest({
        organizationId: '00000000-0000-0000-0000-000000000001',
        month: '2026-04',
      })
    ).toEqual({
      organizationId: '00000000-0000-0000-0000-000000000001',
      month: '2026-04',
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
      failureType: null,
      failureContext: null,
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
      failureType: null,
      failureContext: null,
    });

    expect(
      parseScheduleVersionSolverResultRequest({
        status: 'failed',
        solverExecutionId: 'exec-4',
        failureReason: 'no feasible solution',
        failureType: 'infeasible',
        failureContext: {
          date: '2026-04-12',
          shiftCode: 'N',
          required: 3,
          feasible: 2,
        },
      })
    ).toEqual({
      status: 'failed',
      solverExecutionId: 'exec-4',
      assignments: [],
      score: null,
      failureReason: 'no feasible solution',
      failureType: 'infeasible',
      failureContext: {
        date: '2026-04-12',
        shiftCode: 'N',
        required: 3,
        feasible: 2,
      },
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
