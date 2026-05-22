import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseFromMock } = vi.hoisted(() => ({
  supabaseFromMock: vi.fn(),
}));

vi.mock('@/api/supabase', () => ({
  supabase: {
    from: supabaseFromMock,
  },
}));

interface QueryResponse {
  data: unknown[] | null;
  error: { message: string } | null;
}

interface QueryCall {
  table: string;
  select?: string;
  eq: Array<[string, unknown]>;
  in: Array<[string, unknown[]]>;
  gte: Array<[string, unknown]>;
  lte: Array<[string, unknown]>;
  not: Array<[string, string, unknown]>;
  order: Array<[string, unknown]>;
  range: Array<[number, number]>;
}

function createSupabaseMock(responses: Record<string, QueryResponse[]>) {
  const calls: QueryCall[] = [];

  supabaseFromMock.mockImplementation((table: string) => {
    const call: QueryCall = {
      table,
      eq: [],
      in: [],
      gte: [],
      lte: [],
      not: [],
      order: [],
      range: [],
    };
    calls.push(call);

    const resolveNext = () => {
      const tableResponses = responses[table];
      if (!tableResponses || tableResponses.length === 0) {
        throw new Error(`Unexpected query for table: ${table}`);
      }

      return Promise.resolve(tableResponses.shift()!);
    };

    const builder = {
      select: vi.fn((columns: string) => {
        call.select = columns;
        return builder;
      }),
      eq: vi.fn((column: string, value: unknown) => {
        call.eq.push([column, value]);
        return builder;
      }),
      in: vi.fn((column: string, value: unknown[]) => {
        call.in.push([column, value]);
        return builder;
      }),
      gte: vi.fn((column: string, value: unknown) => {
        call.gte.push([column, value]);
        return builder;
      }),
      lte: vi.fn((column: string, value: unknown) => {
        call.lte.push([column, value]);
        return builder;
      }),
      not: vi.fn((column: string, operator: string, value: unknown) => {
        call.not.push([column, operator, value]);
        return builder;
      }),
      order: vi.fn((column: string, options?: unknown) => {
        call.order.push([column, options]);
        return builder;
      }),
      range: vi.fn((from: number, to: number) => {
        call.range.push([from, to]);
        return resolveNext();
      }),
      then: vi.fn((onFulfilled, onRejected) => resolveNext().then(onFulfilled, onRejected)),
    };

    return builder;
  });

  return calls;
}

describe('solver yearly employee stats api', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('aggregates finalized annual night, weekend-rule, and fulfilled off-request counts', async () => {
    const calls = createSupabaseMock({
      public_holidays: [
        {
          data: [
            { holiday_date: '2026-01-01' },
          ],
          error: null,
        },
      ],
      schedules: [
        {
          data: [
            { finalized_version_id: 'version-jan' },
            { finalized_version_id: null },
            { finalized_version_id: 'version-feb' },
          ],
          error: null,
        },
      ],
      schedule_assignments: [
        {
          data: [
            {
              schedule_version_id: 'version-jan',
              employee_id: 'emp-1',
              date: '2026-01-01',
              shifts: { code: 'D' },
            },
            {
              schedule_version_id: 'version-jan',
              employee_id: 'emp-1',
              date: '2026-01-02',
              shifts: { code: 'N' },
            },
            {
              schedule_version_id: 'version-jan',
              employee_id: 'emp-1',
              date: '2026-01-09',
              shifts: { code: 'D' },
            },
            {
              schedule_version_id: 'version-jan',
              employee_id: 'emp-1',
              date: '2026-01-03',
              shifts: { code: 'D' },
            },
            {
              schedule_version_id: 'version-jan',
              employee_id: 'emp-1',
              date: '2026-01-10',
              shifts: { code: 'E' },
            },
            {
              schedule_version_id: 'version-jan',
              employee_id: 'emp-1',
              date: '2026-01-17',
              shifts: { code: 'N' },
            },
            {
              schedule_version_id: 'version-jan',
              employee_id: 'emp-1',
              date: '2026-01-04',
              shifts: { code: 'D' },
            },
            {
              schedule_version_id: 'version-jan',
              employee_id: 'emp-1',
              date: '2026-01-11',
              shifts: { code: 'E' },
            },
            {
              schedule_version_id: 'version-jan',
              employee_id: 'emp-1',
              date: '2026-01-18',
              shifts: { code: 'N' },
            },
            {
              schedule_version_id: 'version-feb',
              employee_id: 'emp-2',
              date: '2026-02-02',
              shifts: { code: 'N' },
            },
          ],
          error: null,
        },
      ],
      schedule_preferences: [
        {
          data: [
            {
              schedule_version_id: 'version-jan',
              employee_id: 'emp-1',
              date: '2026-01-05',
              request_code: 'O',
              resolution_status: 'fulfilled',
            },
            {
              schedule_version_id: 'version-feb',
              employee_id: 'emp-1',
              date: '2026-02-05',
              request_code: 'O',
              resolution_status: 'unfulfilled',
            },
          ],
          error: null,
        },
      ],
    });

    const { loadSolverYearlyEmployeeStats } = await import('@/api/solverYearlyEmployeeStats');

    await expect(
      loadSolverYearlyEmployeeStats({
        organizationId: 'org-1',
        year: 2026,
        employeeIds: ['emp-1', 'emp-2', 'emp-3'],
      }),
    ).resolves.toEqual([
      {
        employee_id: 'emp-1',
        night_shift_count: 3,
        weekend_holiday_work_count: 7,
        approved_off_request_count: 1,
      },
      {
        employee_id: 'emp-2',
        night_shift_count: 1,
        weekend_holiday_work_count: 0,
        approved_off_request_count: 0,
      },
      {
        employee_id: 'emp-3',
        night_shift_count: 0,
        weekend_holiday_work_count: 0,
        approved_off_request_count: 0,
      },
    ]);

    const publicHolidayQuery = calls.find((call) => call.table === 'public_holidays')!;
    expect(publicHolidayQuery.eq).toContainEqual(['country_code', 'KR']);
    expect(publicHolidayQuery.eq).toContainEqual(['is_holiday', true]);
    expect(publicHolidayQuery.gte).toContainEqual(['holiday_date', '2026-01-01']);
    expect(publicHolidayQuery.lte).toContainEqual(['holiday_date', '2026-12-31']);

    const scheduleQuery = calls.find((call) => call.table === 'schedules')!;
    expect(scheduleQuery.eq).toContainEqual(['organization_id', 'org-1']);
    expect(scheduleQuery.gte).toContainEqual(['month', '2026-01']);
    expect(scheduleQuery.lte).toContainEqual(['month', '2026-12']);
    expect(scheduleQuery.not).toContainEqual(['finalized_version_id', 'is', null]);

    const assignmentQuery = calls.find((call) => call.table === 'schedule_assignments')!;
    expect(assignmentQuery.in).toContainEqual(['schedule_version_id', ['version-jan', 'version-feb']]);
    expect(assignmentQuery.in).toContainEqual(['employee_id', ['emp-1', 'emp-2', 'emp-3']]);
    expect(assignmentQuery.gte).toContainEqual(['date', '2026-01-01']);
    expect(assignmentQuery.lte).toContainEqual(['date', '2026-12-31']);

    const preferenceQuery = calls.find((call) => call.table === 'schedule_preferences')!;
    expect(preferenceQuery.eq).toContainEqual(['request_code', 'O']);
    expect(preferenceQuery.eq).toContainEqual(['resolution_status', 'fulfilled']);
    expect(preferenceQuery.gte).toContainEqual(['date', '2026-01-01']);
    expect(preferenceQuery.lte).toContainEqual(['date', '2026-12-31']);
  });

  it('returns zero stats without loading detail tables when no finalized schedules exist', async () => {
    const calls = createSupabaseMock({
      public_holidays: [{ data: [], error: null }],
      schedules: [{ data: [], error: null }],
    });

    const { loadSolverYearlyEmployeeStats } = await import('@/api/solverYearlyEmployeeStats');

    await expect(
      loadSolverYearlyEmployeeStats({
        organizationId: 'org-1',
        year: 2026,
        employeeIds: ['emp-1'],
      }),
    ).resolves.toEqual([
      {
        employee_id: 'emp-1',
        night_shift_count: 0,
        weekend_holiday_work_count: 0,
        approved_off_request_count: 0,
      },
    ]);

    expect(calls.some((call) => call.table === 'schedule_assignments')).toBe(false);
    expect(calls.some((call) => call.table === 'schedule_preferences')).toBe(false);
  });
});
