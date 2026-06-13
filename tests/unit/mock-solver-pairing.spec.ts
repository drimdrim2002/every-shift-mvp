import { describe, expect, it } from 'vitest';
import { applyMockPreceptorPairing } from '@/utils/mockSolverPairing';
import type { SolverRequest } from '@/types/schedule';

function createSolverRequest(): SolverRequest {
  return {
    organization: {
      id: 'org-1',
      name: '테스트병원',
      type: 'hospital',
      shifts: [
        {
          id: 'shift-d',
          code: 'D',
          name: 'Day',
          start_time: '08:00:00',
          end_time: '16:00:00',
        },
      ],
      lastHistoricalDate: '2026-05-27',
      firstDraftDate: '2026-06-01',
      publishLength: 4,
      draftLength: 2,
    },
    employees: [
      {
        employee_id: 'preceptor-1',
        name: '박선배',
        available_shifts: ['D', 'E', 'N', 'O'],
        skill_set: ['ALL'],
        preceptor_id: null,
      },
      {
        employee_id: 'preceptee-1',
        name: '김신규',
        available_shifts: ['D', 'E', 'O'],
        skill_set: ['ALL'],
        preceptor_id: 'preceptor-1',
      },
    ],
    history: [],
    undesirable: [],
    requirements: [],
    publicHolidays: [],
    yearlyEmployeeStats: [],
  };
}

describe('applyMockPreceptorPairing', () => {
  it('assigns the same shift to paired employees for each draft date', () => {
    const result = applyMockPreceptorPairing(createSolverRequest());

    expect(result.assignments['preceptee-1']?.['2026-06-01']).toBe('D');
    expect(result.assignments['preceptor-1']?.['2026-06-01']).toBe('D');
    expect(result.assignments['preceptee-1']?.['2026-06-02']).toBe('D');
    expect(result.assignments['preceptor-1']?.['2026-06-02']).toBe('D');
    expect(result.pairConflictCount).toBe(0);
    expect(result.hardScorePenalty).toBe(0);
  });

  it('marks pair conflicts and applies hard score penalty when pairing is infeasible', () => {
    const solverRequest = createSolverRequest();
    solverRequest.undesirable = [
      {
        employee_id: 'preceptee-1',
        date: '2026-06-01',
        is_locked: false,
      },
    ];
    solverRequest.employees[0] = {
      ...solverRequest.employees[0]!,
      available_shifts: ['N'],
    };

    const result = applyMockPreceptorPairing(solverRequest);

    expect(result.assignments['preceptee-1']?.['2026-06-01']).toBe('O');
    expect(result.assignments['preceptor-1']?.['2026-06-01']).toBe('O');
    expect(result.pairConflictCount).toBeGreaterThan(0);
    expect(result.hardScorePenalty).toBe(result.pairConflictCount * 1000);
  });
});
