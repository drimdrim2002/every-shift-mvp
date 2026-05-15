import { describe, expect, it } from 'vitest';
import {
  allowedMethods,
  isValidUuid,
  isValidSchedulePublicId,
  matchRoute,
  normalizePathSegments,
  parseDeleteGeneratedResultsRequest,
  parseDeleteMonthRequest,
  parseDeleteScheduleVersionRequest,
  parseEnsureRequest,
  parseCreateVersionRequest,
  parsePatchScheduleVersionAssignmentsRequest,
  parseResetRosterRequest,
  parseScheduleKeyParam,
  parseScheduleVersionSolveRequest,
  parseScheduleVersionSolverResultRequest,
} from '@/../supabase/functions/phase2-schedule/contracts.ts';
import { buildScheduleInputSnapshot } from '@/utils/scheduleInputSnapshot';

describe('phase2 schedule contracts', () => {
  it('matches mutation routes and allowed methods including trust-gate actions', () => {
    expect(
      matchRoute(
        normalizePathSegments('/functions/v1/phase2-schedule/schedules/schedule-1/versions')
      )
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
          '/functions/v1/phase2-schedule/schedules/sch_a1b2c3d4e5f6/compare'
        )
      )
    ).toEqual({
      route: 'compare',
      params: {
        scheduleKey: 'sch_a1b2c3d4e5f6',
      },
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
        normalizePathSegments('/functions/v1/phase2-schedule/schedule-versions/version-1/recheck')
      )
    ).toEqual({
      route: 'recheck',
      params: {
        versionId: 'version-1',
      },
    });

    expect(
      matchRoute(
        normalizePathSegments('/functions/v1/phase2-schedule/schedule-versions/version-1/finalize')
      )
    ).toEqual({
      route: 'finalize',
      params: {
        versionId: 'version-1',
      },
    });

    expect(
      matchRoute(
        normalizePathSegments('/functions/v1/phase2-schedule/schedule-versions/version-1/unfinalize')
      )
    ).toEqual({
      route: 'unfinalize',
      params: {
        versionId: 'version-1',
      },
    });

    expect(
      matchRoute(
        normalizePathSegments('/functions/v1/phase2-schedule/schedule-versions/version-1/delete')
      )
    ).toEqual({
      route: 'deleteVersion',
      params: {
        versionId: 'version-1',
      },
    });

    expect(
      matchRoute(
        normalizePathSegments(
          '/functions/v1/phase2-schedule/schedules/schedule-1/delete-generated-results'
        )
      )
    ).toEqual({
      route: 'deleteGeneratedResults',
      params: {
        scheduleId: 'schedule-1',
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
    expect(allowedMethods('deleteVersion')).toEqual(['POST']);
    expect(allowedMethods('deleteGeneratedResults')).toEqual(['POST']);
  });

  it('parses create version request bodies', () => {
    const inputSnapshot = {
      scheduleId: 'schedule-1',
      solverInput: {
        month: '2026-04',
      },
    };

    expect(
      parseCreateVersionRequest({
        baseVersionId: '11111111-1111-4111-8111-111111111111',
        name: '  V2  ',
        creationMode: 'new',
        inputDiffSummary: {
          changedOffRequests: 1,
          changedLockedAssignments: 2,
          changedSiteRequirements: 3,
          note: 'retry',
        },
        inputSnapshot,
      })
    ).toEqual({
      baseVersionId: '11111111-1111-4111-8111-111111111111',
      name: 'V2',
      creationMode: 'new',
      inputDiffSummary: {
        changedOffRequests: 1,
        changedLockedAssignments: 2,
        changedSiteRequirements: 3,
        note: 'retry',
      },
      inputSnapshot,
    });
  });

  it('validates create version names and creation mode', () => {
    const validBase = {
      baseVersionId: '11111111-1111-4111-8111-111111111111',
      creationMode: 'new',
      inputDiffSummary: {
        changedOffRequests: 0,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: null,
      },
    };

    expect(() => parseCreateVersionRequest({ ...validBase, name: '   ' })).toThrow(
      'name is required'
    );
    expect(() => parseCreateVersionRequest({ ...validBase, name: 'A'.repeat(101) })).toThrow(
      'name must be 100 characters or fewer'
    );
    expect(() => parseCreateVersionRequest({ ...validBase, name: 'V2' })).not.toThrow();

    expect(() =>
      parseCreateVersionRequest({
        ...validBase,
        name: 'V2',
        creationMode: undefined,
      })
    ).toThrow('creationMode must be new or overwrite');
    expect(() =>
      parseCreateVersionRequest({
        ...validBase,
        name: 'V2',
        creationMode: 'copy',
      })
    ).toThrow('creationMode must be new or overwrite');
  });

  it('requires overwriteVersionId only for overwrite creation mode', () => {
    const basePayload = {
      name: 'V2',
      inputDiffSummary: {
        changedOffRequests: 0,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: null,
      },
    };

    expect(() =>
      parseCreateVersionRequest({
        ...basePayload,
        creationMode: 'overwrite',
      })
    ).toThrow('overwriteVersionId must be a valid UUID');

    expect(
      parseCreateVersionRequest({
        ...basePayload,
        creationMode: 'overwrite',
        overwriteVersionId: '22222222-2222-4222-8222-222222222222',
        sourceType: 'initial_solve',
      })
    ).toEqual({
      name: 'V2',
      creationMode: 'overwrite',
      overwriteVersionId: '22222222-2222-4222-8222-222222222222',
      sourceType: 'initial_solve',
      inputDiffSummary: {
        changedOffRequests: 0,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: null,
      },
      inputSnapshot: {},
    });

    expect(() =>
      parseCreateVersionRequest({
        ...basePayload,
        creationMode: 'overwrite',
        overwriteVersionId: '22222222-2222-4222-8222-222222222222',
        sourceType: 'invalid',
      })
    ).toThrow('sourceType must be a valid schedule version source type');

    expect(
      parseCreateVersionRequest({
        ...basePayload,
        creationMode: 'new',
        baseVersionId: '11111111-1111-4111-8111-111111111111',
        overwriteVersionId: '22222222-2222-4222-8222-222222222222',
      })
    ).toEqual({
      baseVersionId: '11111111-1111-4111-8111-111111111111',
      name: 'V2',
      creationMode: 'new',
      inputDiffSummary: {
        changedOffRequests: 0,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: null,
      },
      inputSnapshot: {},
    });
  });

  it('requires baseVersionId for new version creation', () => {
    expect(() =>
      parseCreateVersionRequest({
        name: 'V2',
        creationMode: 'new',
        inputDiffSummary: {
          changedOffRequests: 0,
          changedLockedAssignments: 0,
          changedSiteRequirements: 0,
          note: null,
        },
      })
    ).toThrow('baseVersionId must be a valid UUID');
  });

  it('accepts inputSnapshot as a JSON object and defaults to an empty object', () => {
    const basePayload = {
      baseVersionId: '11111111-1111-4111-8111-111111111111',
      name: 'V2',
      creationMode: 'new',
      inputDiffSummary: {
        changedOffRequests: 0,
        changedLockedAssignments: 0,
        changedSiteRequirements: 0,
        note: null,
      },
    };

    expect(parseCreateVersionRequest(basePayload)).toEqual({
      ...basePayload,
      inputSnapshot: {},
    });

    expect(() =>
      parseCreateVersionRequest({
        ...basePayload,
        inputSnapshot: [],
      })
    ).toThrow('inputSnapshot must be a JSON object');
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
    expect(() =>
      parseDeleteMonthRequest({
        organizationId: '11111111-1111-4111-8111-111111111111',
        month: '2026-13',
      })
    ).toThrow();
  });

  it('parses delete version request bodies with an optional replacementSelectedVersionId', () => {
    expect(parseDeleteScheduleVersionRequest({})).toEqual({});

    expect(
      parseDeleteScheduleVersionRequest({
        replacementSelectedVersionId: '11111111-1111-4111-8111-111111111111',
      })
    ).toEqual({
      replacementSelectedVersionId: '11111111-1111-4111-8111-111111111111',
    });

    expect(() =>
      parseDeleteScheduleVersionRequest({
        replacementSelectedVersionId: 'not-a-uuid',
      })
    ).toThrow('replacementSelectedVersionId must be a valid UUID');
  });

  it('parses scoped delete generated results request bodies', () => {
    expect(
      parseDeleteGeneratedResultsRequest({
        scope: 'selected_version',
        sourceVersionId: '22222222-2222-4222-8222-222222222222',
      })
    ).toEqual({
      scope: 'selected_version',
      sourceVersionId: '22222222-2222-4222-8222-222222222222',
    });

    expect(
      parseDeleteGeneratedResultsRequest({
        scope: 'all_active_versions',
      })
    ).toEqual({
      scope: 'all_active_versions',
    });

    expect(() => parseDeleteGeneratedResultsRequest({})).toThrow('scope is required');
    expect(() =>
      parseDeleteGeneratedResultsRequest({
        scope: 'selected_version',
      })
    ).toThrow(
      'sourceVersionId must be a valid UUID'
    );
    expect(() =>
      parseDeleteGeneratedResultsRequest({
        scope: 'selected_version',
        sourceVersionId: 'not-a-uuid',
      })
    ).toThrow('sourceVersionId must be a valid UUID');
    expect(() =>
      parseDeleteGeneratedResultsRequest({
        scope: 'all_active_versions',
        sourceVersionId: '22222222-2222-4222-8222-222222222222',
      })
    ).toThrow('sourceVersionId is not allowed for all_active_versions');
    expect(() =>
      parseDeleteGeneratedResultsRequest({
        scope: 'invalid_scope',
      })
    ).toThrow('scope must be selected_version or all_active_versions');
  });

  it('accepts canonical postgres uuids used by seeded organizations', () => {
    expect(isValidUuid('00000000-0000-0000-0000-000000000001')).toBe(true);
    expect(isValidSchedulePublicId('sch_a1b2c3d4e5f6')).toBe(true);
    expect(isValidSchedulePublicId('schedule-1')).toBe(false);

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

  it('accepts schedule keys as either UUIDs or public ids', () => {
    expect(
      parseScheduleKeyParam('scheduleKey', '11111111-1111-4111-8111-111111111111')
    ).toBe('11111111-1111-4111-8111-111111111111');
    expect(parseScheduleKeyParam('scheduleKey', 'sch_a1b2c3d4e5f6')).toBe('sch_a1b2c3d4e5f6');

    expect(() => parseScheduleKeyParam('scheduleKey', 'schedule-1')).toThrow(
      'scheduleKey must be a valid UUID or schedule public id'
    );
  });

  it('parses solve request bodies', () => {
    expect(parseScheduleVersionSolveRequest({ solverExecutionId: 'exec-1' })).toEqual({
      solverExecutionId: 'exec-1',
    });
  });

  it('accepts create and solve requests without an input snapshot until callers are wired', () => {
    expect(
      parseCreateVersionRequest({
        baseVersionId: '11111111-1111-4111-8111-111111111111',
        name: 'V2',
        creationMode: 'new',
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
      creationMode: 'new',
      inputDiffSummary: {
        changedOffRequests: 1,
        changedLockedAssignments: 2,
        changedSiteRequirements: 3,
        note: 'retry',
      },
      inputSnapshot: {},
    });

    expect(parseScheduleVersionSolveRequest({ solverExecutionId: 'exec-1' })).toEqual({
      solverExecutionId: 'exec-1',
    });
  });

  it('builds a stable snapshot hash after canonicalizing array ordering', async () => {
    const inputSnapshot = await buildScheduleInputSnapshot({
      scheduleId: '11111111-1111-4111-8111-111111111111',
      siteId: '22222222-2222-4222-8222-222222222222',
      month: '2026-04',
      lastMonthDays: 5,
      solverRequest: {
        organization: {
          id: '00000000-0000-0000-0000-000000000001',
          name: '테스트 병원',
          type: 'hospital',
          shifts: [
            {
              id: '44444444-4444-4444-8444-444444444444',
              code: 'N',
              name: '야간',
              start_time: '00:00:00',
              end_time: '08:00:00',
            },
            {
              id: '33333333-3333-4333-8333-333333333333',
              code: 'D',
              name: '주간',
              start_time: '08:00:00',
              end_time: '16:00:00',
            },
          ],
          lastHistoricalDate: '2026-03-27',
          firstDraftDate: '2026-04-01',
          publishLength: 5,
          draftLength: 30,
        },
        employees: [
          {
            employee_id: '66666666-6666-4666-8666-666666666666',
            name: 'B',
            available_shifts: ['N', 'D'],
            skill_set: ['ALL'],
          },
          {
            employee_id: '55555555-5555-4555-8555-555555555555',
            name: 'A',
            available_shifts: ['D'],
            skill_set: ['ALL'],
          },
        ],
        history: [
          {
            employee_id: '66666666-6666-4666-8666-666666666666',
            date: '2026-03-30',
            shift_id: '44444444-4444-4444-8444-444444444444',
            is_locked: true,
          },
          {
            employee_id: '55555555-5555-4555-8555-555555555555',
            date: '2026-03-29',
            shift_id: '33333333-3333-4333-8333-333333333333',
            is_locked: true,
          },
        ],
        undesirable: [
          {
            employee_id: '66666666-6666-4666-8666-666666666666',
            date: '2026-04-03',
            is_locked: false,
          },
          {
            employee_id: '55555555-5555-4555-8555-555555555555',
            date: '2026-04-02',
            is_locked: false,
          },
        ],
        requirements: [
          {
            shiftId: '44444444-4444-4444-8444-444444444444',
            dayIndex: 1,
            employeeCount: 2,
          },
          {
            shiftId: '33333333-3333-4333-8333-333333333333',
            dayIndex: 0,
            employeeCount: 3,
          },
        ],
      },
      generatorVersion: 'test-generator',
      createdAt: '2026-04-16T00:00:00.000Z',
    });

    const reorderedInputSnapshot = await buildScheduleInputSnapshot({
      scheduleId: '11111111-1111-4111-8111-111111111111',
      siteId: '22222222-2222-4222-8222-222222222222',
      month: '2026-04',
      lastMonthDays: 5,
      solverRequest: {
        organization: {
          id: '00000000-0000-0000-0000-000000000001',
          name: '테스트 병원',
          type: 'hospital',
          shifts: [
            {
              id: '44444444-4444-4444-8444-444444444444',
              code: 'N',
              name: '야간',
              start_time: '00:00:00',
              end_time: '08:00:00',
            },
            {
              id: '33333333-3333-4333-8333-333333333333',
              code: 'D',
              name: '주간',
              start_time: '08:00:00',
              end_time: '16:00:00',
            },
          ],
          lastHistoricalDate: '2026-03-27',
          firstDraftDate: '2026-04-01',
          publishLength: 5,
          draftLength: 30,
        },
        employees: [
          {
            employee_id: '66666666-6666-4666-8666-666666666666',
            name: 'B',
            available_shifts: ['N', 'D'],
            skill_set: ['ALL'],
          },
          {
            employee_id: '55555555-5555-4555-8555-555555555555',
            name: 'A',
            available_shifts: ['D'],
            skill_set: ['ALL'],
          },
        ],
        history: [
          {
            employee_id: '66666666-6666-4666-8666-666666666666',
            date: '2026-03-30',
            shift_id: '44444444-4444-4444-8444-444444444444',
            is_locked: true,
          },
          {
            employee_id: '55555555-5555-4555-8555-555555555555',
            date: '2026-03-29',
            shift_id: '33333333-3333-4333-8333-333333333333',
            is_locked: true,
          },
        ],
        undesirable: [
          {
            employee_id: '66666666-6666-4666-8666-666666666666',
            date: '2026-04-03',
            is_locked: false,
          },
          {
            employee_id: '55555555-5555-4555-8555-555555555555',
            date: '2026-04-02',
            is_locked: false,
          },
        ],
        requirements: [
          {
            shiftId: '44444444-4444-4444-8444-444444444444',
            dayIndex: 1,
            employeeCount: 2,
          },
          {
            shiftId: '33333333-3333-4333-8333-333333333333',
            dayIndex: 0,
            employeeCount: 3,
          },
        ],
      },
      generatorVersion: 'test-generator',
      createdAt: '2026-04-16T00:00:00.000Z',
    });

    expect(reorderedInputSnapshot.solverInputHash).toBe(inputSnapshot.solverInputHash);
    expect(reorderedInputSnapshot.solverInput).toEqual(inputSnapshot.solverInput);
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
