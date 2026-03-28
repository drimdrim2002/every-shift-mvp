import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseFromMock = vi.fn();

vi.mock('@/api/supabase', () => ({
  supabase: {
    from: supabaseFromMock,
  },
}));

describe('phase2 schedule version-scoped api helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('reads assignments by schedule_version_id', async () => {
    const range = vi.fn().mockResolvedValue({
      data: [
        {
          employee_id: 'employee-1',
          date: '2026-04-01',
          shifts: { code: 'D' },
          off_reason: null,
          comment: 'manual note',
        },
      ],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ range });
    const select = vi.fn().mockReturnValue({ eq });

    supabaseFromMock.mockImplementation((table: string) => {
      if (table !== 'schedule_assignments') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return { select };
    });

    const { getScheduleVersionAssignments } = await import('@/api/schedule');
    const result = await getScheduleVersionAssignments('version-1');

    expect(eq).toHaveBeenCalledWith('schedule_version_id', 'version-1');
    expect(result).toEqual({
      assignments: {
        'employee-1': {
          '2026-04-01': 'D',
        },
      },
      offReasons: {
        'employee-1': {},
      },
      comments: {
        'employee-1': {
          '2026-04-01': 'manual note',
        },
      },
    });
  });

  it('reads planning assignments by schedule_version_id', async () => {
    const range = vi.fn().mockResolvedValue({
      data: [
        {
          employee_id: 'employee-1',
          shift_id: 'shift-1',
          date: '2026-04-01',
          is_locked: true,
        },
      ],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ range });
    const select = vi.fn().mockReturnValue({ eq });

    supabaseFromMock.mockImplementation((table: string) => {
      if (table !== 'schedule_assignments') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return { select };
    });

    const { getPlanningAssignmentsForVersion } = await import('@/api/schedule');
    const result = await getPlanningAssignmentsForVersion('version-2');

    expect(eq).toHaveBeenCalledWith('schedule_version_id', 'version-2');
    expect(result).toEqual([
      {
        employee_id: 'employee-1',
        shift_id: 'shift-1',
        date: '2026-04-01',
        is_locked: true,
      },
    ]);
  });

  it('resets preference resolution by schedule_version_id', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq: updateEq });

    supabaseFromMock.mockImplementation((table: string) => {
      if (table !== 'schedule_preferences') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return { update };
    });

    const { resetPreferenceResolutionByVersion } = await import('@/api/schedule');
    await resetPreferenceResolutionByVersion('version-3');

    expect(update).toHaveBeenCalledWith({
      resolution_status: 'pending',
      resolved_shift_id: null,
      resolved_at: null,
    });
    expect(updateEq).toHaveBeenCalledWith('schedule_version_id', 'version-3');
  });

  it('refreshes preference resolution by schedule_version_id', async () => {
    const preferenceRange = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'pref-1',
          schedule_id: 'schedule-1',
          schedule_version_id: 'version-4',
          employee_id: 'employee-1',
          date: '2026-04-01',
          request_code: 'O',
          request_note: 'note',
          is_soft: true,
          resolution_status: 'pending',
          resolved_shift_id: null,
          resolved_at: null,
        },
      ],
      error: null,
    });
    const preferenceOrder = vi.fn();
    const preferenceEq = vi.fn().mockReturnValue({ order: preferenceOrder, range: preferenceRange });
    const preferenceSelect = vi.fn().mockReturnValue({ eq: preferenceEq, order: preferenceOrder, range: preferenceRange });
    preferenceOrder.mockReturnValue({ order: preferenceOrder, range: preferenceRange });
    const upsertSelect = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'pref-1',
          schedule_id: 'schedule-1',
          employee_id: 'employee-1',
          date: '2026-04-01',
          request_code: 'O',
          request_note: 'note',
          is_soft: true,
          resolution_status: 'fulfilled',
          resolved_shift_id: 'shift-off',
          resolved_at: '2026-04-01T00:00:00Z',
        },
      ],
      error: null,
    });
    const upsert = vi.fn().mockReturnValue({ select: upsertSelect });

    const assignmentRange = vi.fn().mockResolvedValue({
      data: [
        {
          employee_id: 'employee-1',
          shift_id: 'shift-off',
          date: '2026-04-01',
          shifts: { code: 'O' },
        },
      ],
      error: null,
    });
    const assignmentEq = vi.fn().mockReturnValue({ range: assignmentRange });
    const assignmentSelect = vi.fn().mockReturnValue({ eq: assignmentEq, range: assignmentRange });

    supabaseFromMock.mockImplementation((table: string) => {
      if (table === 'schedule_preferences') {
        return {
          select: preferenceSelect,
          upsert,
        };
      }

      if (table === 'schedule_assignments') {
        return {
          select: assignmentSelect,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { refreshPreferenceResolutionByVersion } = await import('@/api/schedule');
    const result = await refreshPreferenceResolutionByVersion('version-4');

    expect(preferenceEq).toHaveBeenCalledWith('schedule_version_id', 'version-4');
    expect(assignmentEq).toHaveBeenCalledWith('schedule_version_id', 'version-4');
    expect(upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          id: 'pref-1',
          resolution_status: 'fulfilled',
          resolved_shift_id: 'shift-off',
        }),
      ],
      { onConflict: 'id' }
    );
    expect(result).toHaveLength(1);
  });
});
