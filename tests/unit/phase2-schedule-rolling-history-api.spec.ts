import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseFromMock = vi.fn();

vi.mock('@/api/supabase', () => ({
  supabase: {
    from: supabaseFromMock,
  },
}));

describe('phase2 schedule rolling history api helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns null when the previous month exists but has no finalized version', async () => {
    const schedulesEqOrganization = vi.fn();
    const schedulesEqMonth = vi.fn();
    const schedulesMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    supabaseFromMock.mockImplementation((table: string) => {
      if (table !== 'schedules') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: vi.fn().mockReturnValue({
          eq: schedulesEqOrganization.mockReturnValue({
            eq: schedulesEqMonth.mockReturnValue({
              maybeSingle: schedulesMaybeSingle,
            }),
          }),
        }),
      };
    });

    const { getPreviousMonthFinalizedContext } = await import('@/api/schedule');

    expect(await getPreviousMonthFinalizedContext('org-1', '2025-04')).toBeNull();
    expect(schedulesEqOrganization).toHaveBeenCalledWith('organization_id', 'org-1');
    expect(schedulesEqMonth).toHaveBeenCalledWith('month', '2025-03');
    expect(schedulesMaybeSingle).toHaveBeenCalledTimes(1);
  });

  it('returns display + planning assignments for the previous month finalized version', async () => {
    const schedulesEqOrganization = vi.fn();
    const schedulesEqMonth = vi.fn();
    const displayEqScope = vi.fn();
    const planningEqScope = vi.fn();
    const displayRange = vi.fn().mockResolvedValue({
      data: [
        {
          employee_id: 'emp-1',
          date: '2025-03-31',
          shifts: { code: 'D' },
          off_reason: null,
          comment: null,
        },
      ],
      error: null,
    });
    const planningRange = vi.fn().mockResolvedValue({
      data: [
        {
          employee_id: 'emp-1',
          shift_id: 'shift-d',
          date: '2025-03-31',
          is_locked: true,
        },
      ],
      error: null,
    });
    const schedulesMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'schedule-2025-03',
        finalized_version_id: 'version-2025-03-final',
      },
      error: null,
    });

    supabaseFromMock.mockImplementation((table: string) => {
      if (table === 'schedules') {
        return {
          select: vi.fn().mockReturnValue({
            eq: schedulesEqOrganization.mockReturnValue({
              eq: schedulesEqMonth.mockReturnValue({
                maybeSingle: schedulesMaybeSingle,
              }),
            }),
          }),
        };
      }

      if (table === 'schedule_assignments') {
        return {
          select: vi.fn((query: string) => {
            if (query.includes('off_reason')) {
              return {
                eq: displayEqScope.mockReturnValue({
                  range: displayRange,
                }),
              };
            }

            if (query.includes('is_locked')) {
              return {
                eq: planningEqScope.mockReturnValue({
                  range: planningRange,
                }),
              };
            }

            throw new Error(`Unexpected query: ${query}`);
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { getPreviousMonthFinalizedContext } = await import('@/api/schedule');

    expect(await getPreviousMonthFinalizedContext('org-1', '2025-04')).toEqual({
      scheduleId: 'schedule-2025-03',
      scheduleVersionId: 'version-2025-03-final',
      displayAssignments: {
        'emp-1': { '2025-03-31': 'D' },
      },
      planningAssignments: [
        { employee_id: 'emp-1', shift_id: 'shift-d', date: '2025-03-31', is_locked: true },
      ],
    });
    expect(schedulesEqOrganization).toHaveBeenCalledWith('organization_id', 'org-1');
    expect(schedulesEqMonth).toHaveBeenCalledWith('month', '2025-03');
    expect(displayEqScope).toHaveBeenCalledWith('schedule_version_id', 'version-2025-03-final');
    expect(planningEqScope).toHaveBeenCalledWith('schedule_version_id', 'version-2025-03-final');
  });
});
