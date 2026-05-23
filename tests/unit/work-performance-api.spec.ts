import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseFromMock } = vi.hoisted(() => ({
  supabaseFromMock: vi.fn(),
}));

vi.mock('@/api/supabase', () => ({
  supabase: {
    from: supabaseFromMock,
  },
}));

const LOAD_ERROR_MESSAGE = '근무 실적을 불러오지 못했습니다';

interface QueryResponse {
  data: unknown[] | null;
  error: { message: string } | null;
}

interface QueryCall {
  table: string;
  select?: string;
  operations: string[];
  eq: Array<[string, unknown]>;
  not: Array<[string, string, unknown]>;
  in: Array<[string, unknown[]]>;
  gte: Array<[string, unknown]>;
  lte: Array<[string, unknown]>;
  order: Array<[string, unknown]>;
  range: Array<[number, number]>;
  limit: number[];
}

function createSupabaseMock(responses: Record<string, QueryResponse[]>) {
  const calls: QueryCall[] = [];

  supabaseFromMock.mockImplementation((table: string) => {
    const call: QueryCall = {
      table,
      operations: [],
      eq: [],
      not: [],
      in: [],
      gte: [],
      lte: [],
      order: [],
      range: [],
      limit: [],
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
        call.operations.push('select');
        return builder;
      }),
      eq: vi.fn((column: string, value: unknown) => {
        call.eq.push([column, value]);
        call.operations.push(`eq:${column}`);
        return builder;
      }),
      not: vi.fn((column: string, operator: string, value: unknown) => {
        call.not.push([column, operator, value]);
        call.operations.push(`not:${column}`);
        return builder;
      }),
      in: vi.fn((column: string, value: unknown[]) => {
        call.in.push([column, value]);
        call.operations.push(`in:${column}`);
        return builder;
      }),
      gte: vi.fn((column: string, value: unknown) => {
        call.gte.push([column, value]);
        call.operations.push(`gte:${column}`);
        return builder;
      }),
      lte: vi.fn((column: string, value: unknown) => {
        call.lte.push([column, value]);
        call.operations.push(`lte:${column}`);
        return builder;
      }),
      order: vi.fn((column: string, options?: unknown) => {
        call.order.push([column, options]);
        call.operations.push(`order:${column}`);
        return builder;
      }),
      range: vi.fn((from: number, to: number) => {
        call.range.push([from, to]);
        call.operations.push('range');
        return resolveNext();
      }),
      limit: vi.fn((count: number) => {
        call.limit.push(count);
        call.operations.push('limit');
        return resolveNext();
      }),
      maybeSingle: vi.fn(() => builder),
      then: vi.fn((onFulfilled, onRejected) => resolveNext().then(onFulfilled, onRejected)),
    };

    return builder;
  });

  return calls;
}

function buildRows(count: number, makeRow: (index: number) => Record<string, unknown>) {
  return Array.from({ length: count }, (_value, index) => makeRow(index));
}

describe('work performance api boundary', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('loads the latest finalized month as the default period source', async () => {
    const calls = createSupabaseMock({
      schedules: [
        {
          data: [{ month: '2026-04' }],
          error: null,
        },
      ],
    });

    const { loadLatestFinalizedWorkPerformanceMonth } = await import('@/api/workPerformance');
    const result = await loadLatestFinalizedWorkPerformanceMonth('org-1');

    expect(result).toEqual({ year: 2026, month: 4 });
    expect(calls).toHaveLength(1);
    expect(calls[0].table).toBe('schedules');
    expect(calls[0].select).toBe('month');
    expect(calls[0].eq).toContainEqual(['organization_id', 'org-1']);
    expect(calls[0].not).toContainEqual(['finalized_version_id', 'is', null]);
    expect(calls[0].order).toEqual([['month', { ascending: false }]]);
    expect(calls[0].limit).toEqual([1]);
  });

  it('returns null when no finalized month exists for the default period source', async () => {
    createSupabaseMock({
      schedules: [
        {
          data: [],
          error: null,
        },
      ],
    });

    const { loadLatestFinalizedWorkPerformanceMonth } = await import('@/api/workPerformance');

    await expect(loadLatestFinalizedWorkPerformanceMonth('org-1')).resolves.toBeNull();
  });

  it('loads finalized schedules, assignments, off requests, employees, and holiday dates for the selected period', async () => {
    const assignmentsPage1 = buildRows(1000, (index) => ({
      schedule_version_id: index < 31 ? 'version-jan' : 'version-feb',
      employee_id: `emp-${index % 2 + 1}`,
      date: index < 31 ? `2026-01-${String((index % 31) + 1).padStart(2, '0')}` : '2026-02-01',
      shift_id: index % 3 === 0 ? null : `shift-${index}`,
      shifts: index % 3 === 0 ? null : [{ code: index % 2 === 0 ? 'N' : 'D', name: '근무' }],
    }));
    const assignmentsPage2 = [
      {
        schedule_version_id: 'version-feb',
        employee_id: 'emp-1',
        date: '2026-02-28',
        shift_id: 'shift-last',
        shifts: { code: 'D', name: '주간' },
      },
    ];
    const preferencesPage1 = buildRows(1000, (index) => ({
      schedule_version_id: index < 500 ? 'version-jan' : 'version-feb',
      employee_id: `emp-${index % 2 + 1}`,
      date: index < 500 ? '2026-01-05' : '2026-02-05',
      request_code: 'O',
      resolution_status: index % 2 === 0 ? 'fulfilled' : 'unfulfilled',
    }));
    const preferencesPage2 = [
      {
        schedule_version_id: 'version-feb',
        employee_id: 'emp-2',
        date: '2026-02-10',
        request_code: 'O',
        resolution_status: 'fulfilled',
      },
    ];
    const calls = createSupabaseMock({
      schedules: [
        {
          data: [
            { id: 'schedule-jan', month: '2026-01', finalized_version_id: 'version-jan' },
            { id: 'schedule-feb', month: '2026-02', finalized_version_id: 'version-feb' },
          ],
          error: null,
        },
        {
          data: { finalized_version_id: 'version-dec' },
          error: null,
        },
      ],
      public_holidays: [
        { data: [{ holiday_date: '2026-01-01' }], error: null },
        { data: [{ holiday_date: '2026-01-01' }, { holiday_date: '2026-02-17' }], error: null },
      ],
      schedule_assignments: [
        { data: assignmentsPage1, error: null },
        { data: assignmentsPage2, error: null },
      ],
      schedule_preferences: [
        { data: preferencesPage1, error: null },
        { data: preferencesPage2, error: null },
      ],
      employees: [
        {
          data: buildRows(1000, (index) => ({
            id: `emp-${String(index + 1).padStart(4, '0')}`,
            employee_id: `N${String(index + 1).padStart(4, '0')}`,
            name: `간호사 ${String(index + 1).padStart(4, '0')}`,
          })),
          error: null,
        },
        {
          data: [
            { id: 'emp-1001', employee_id: 'N1001', name: '간호사 1001' },
          ],
          error: null,
        },
      ],
    });

    const { loadWorkPerformancePeriod } = await import('@/api/workPerformance');
    const result = await loadWorkPerformancePeriod({
      organizationId: 'org-1',
      year: 2026,
      startMonth: 1,
      endMonth: 2,
    });

    expect(result.status).toBe('success');
    if (result.status !== 'success') {
      throw new Error(`Unexpected status: ${result.status}`);
    }

    expect(result.period).toEqual({
      year: 2026,
      startMonth: 1,
      endMonth: 2,
      startDate: '2026-01-01',
      endDate: '2026-02-28',
    });
    expect(result.finalizedMonths).toEqual(['2026-01', '2026-02']);
    expect(result.finalizedVersionIds).toEqual(['version-dec', 'version-jan', 'version-feb']);
    expect(result.missingMonths).toEqual([]);
    expect(result.assignments).toHaveLength(1001);
    expect(result.assignments[1]).toMatchObject({
      scheduleVersionId: 'version-jan',
      employeeId: 'emp-2',
      shiftCode: 'D',
      shiftName: '근무',
    });
    expect(result.assignments[999].shiftCode).toBeNull();
    expect(result.assignments[1000]).toMatchObject({
      scheduleVersionId: 'version-feb',
      shiftCode: 'D',
      shiftName: '주간',
    });
    expect(result.offRequests).toHaveLength(1001);
    expect(result.offRequests[0]).toMatchObject({
      scheduleVersionId: 'version-jan',
      requestCode: 'O',
      resolutionStatus: 'fulfilled',
    });
    expect(result.offRequests[1].resolutionStatus).toBe('unfulfilled');
    expect(result.offRequests[1000].resolutionStatus).toBe('fulfilled');
    expect(result.employees).toHaveLength(1001);
    expect(result.employees[1000]).toEqual({ id: 'emp-1001', employeeId: 'N1001', name: '간호사 1001' });
    expect(result.publicHolidayDates).toEqual(['2026-01-01', '2026-02-17']);

    const scheduleQueries = calls.filter((call) => call.table === 'schedules');
    expect(scheduleQueries).toHaveLength(2);
    expect(scheduleQueries[0].select).toBe('id, month, finalized_version_id');
    expect(scheduleQueries[0].eq).toContainEqual(['organization_id', 'org-1']);
    expect(scheduleQueries[0].gte).toContainEqual(['month', '2026-01']);
    expect(scheduleQueries[0].lte).toContainEqual(['month', '2026-02']);
    expect(scheduleQueries[0].order).toContainEqual(['month', { ascending: true }]);

    expect(scheduleQueries[1].select).toBe('finalized_version_id');
    expect(scheduleQueries[1].eq).toContainEqual(['organization_id', 'org-1']);
    expect(scheduleQueries[1].eq).toContainEqual(['month', '2025-12']);

    const holidayQueries = calls.filter((call) => call.table === 'public_holidays');
    expect(holidayQueries[0].gte).toContainEqual(['holiday_date', '2026-01-01']);
    expect(holidayQueries[0].lte).toContainEqual(['holiday_date', '2026-12-31']);
    expect(holidayQueries[0].limit).toEqual([1]);
    expect(holidayQueries[1].gte).toContainEqual(['holiday_date', '2026-01-01']);
    expect(holidayQueries[1].lte).toContainEqual(['holiday_date', '2026-03-01']);

    const assignmentQueries = calls.filter((call) => call.table === 'schedule_assignments');
    expect(assignmentQueries).toHaveLength(2);
    expect(assignmentQueries[0].select).toBe('schedule_version_id, employee_id, date, shift_id, shifts(code, name)');
    expect(assignmentQueries[0].in).toContainEqual(['schedule_version_id', ['version-dec', 'version-jan', 'version-feb']]);
    expect(assignmentQueries[0].gte).toContainEqual(['date', '2025-12-31']);
    expect(assignmentQueries[0].lte).toContainEqual(['date', '2026-02-28']);
    expect(assignmentQueries[0].order).toEqual([
      ['schedule_version_id', { ascending: true }],
      ['date', { ascending: true }],
      ['employee_id', { ascending: true }],
      ['shift_id', { ascending: true }],
    ]);
    expect(assignmentQueries[0].operations.indexOf('order:shift_id')).toBeLessThan(
      assignmentQueries[0].operations.indexOf('range'),
    );
    expect(assignmentQueries.map((call) => call.range[0])).toEqual([
      [0, 999],
      [1000, 1999],
    ]);

    const preferenceQueries = calls.filter((call) => call.table === 'schedule_preferences');
    expect(preferenceQueries).toHaveLength(2);
    expect(preferenceQueries[0].select).toBe('schedule_version_id, employee_id, date, request_code, resolution_status');
    expect(preferenceQueries[0].in).toContainEqual(['schedule_version_id', ['version-dec', 'version-jan', 'version-feb']]);
    expect(preferenceQueries[0].eq).toContainEqual(['request_code', 'O']);
    expect(preferenceQueries[0].gte).toContainEqual(['date', '2026-01-01']);
    expect(preferenceQueries[0].lte).toContainEqual(['date', '2026-02-28']);
    expect(preferenceQueries[0].order).toEqual([
      ['schedule_version_id', { ascending: true }],
      ['date', { ascending: true }],
      ['employee_id', { ascending: true }],
    ]);
    expect(preferenceQueries[0].operations.indexOf('order:employee_id')).toBeLessThan(
      preferenceQueries[0].operations.indexOf('range'),
    );
    expect(preferenceQueries.map((call) => call.range[0])).toEqual([
      [0, 999],
      [1000, 1999],
    ]);

    const employeeQueries = calls.filter((call) => call.table === 'employees');
    expect(employeeQueries).toHaveLength(2);
    expect(employeeQueries[0].select).toBe('id, employee_id, name');
    expect(employeeQueries[0].eq).toContainEqual(['organization_id', 'org-1']);
    expect(employeeQueries[0].order).toEqual([
      ['name', { ascending: true }],
      ['employee_id', { ascending: true }],
      ['id', { ascending: true }],
    ]);
    expect(employeeQueries[0].operations.indexOf('order:employee_id')).toBeLessThan(
      employeeQueries[0].operations.indexOf('order:id'),
    );
    expect(employeeQueries[0].operations.indexOf('order:id')).toBeLessThan(
      employeeQueries[0].operations.indexOf('range'),
    );
    expect(employeeQueries.map((call) => call.range[0])).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it('returns noFinalizedSchedule when the organization has no finalized schedules at all', async () => {
    const calls = createSupabaseMock({
      schedules: [
        { data: [], error: null },
      ],
    });

    const { loadWorkPerformancePeriod } = await import('@/api/workPerformance');
    const result = await loadWorkPerformancePeriod({
      organizationId: 'org-1',
      year: 2026,
      startMonth: 1,
      endMonth: 2,
    });

    expect(result).toEqual({ status: 'noFinalizedSchedule' });
    expect(calls).toHaveLength(1);
    expect(calls[0].table).toBe('schedules');
    expect(calls[0].select).toBe('id, month, finalized_version_id');
    expect(calls[0].eq).toContainEqual(['organization_id', 'org-1']);
  });

  it('loads finalized months and reports missing months for a partially finalized selected period', async () => {
    const calls = createSupabaseMock({
      schedules: [
        {
          data: [
            { id: 'schedule-jan', month: '2026-01', finalized_version_id: 'version-jan' },
            { id: 'schedule-feb', month: '2026-02', finalized_version_id: null },
          ],
          error: null,
        },
        {
          data: null,
          error: null,
        },
      ],
      public_holidays: [
        { data: [{ holiday_date: '2026-01-01' }], error: null },
        { data: [{ holiday_date: '2026-01-01' }], error: null },
      ],
      schedule_assignments: [
        {
          data: [
            {
              schedule_version_id: 'version-jan',
              employee_id: 'emp-1',
              date: '2026-01-01',
              shift_id: 'shift-night',
              shifts: { code: 'N', name: '야간' },
            },
          ],
          error: null,
        },
      ],
      schedule_preferences: [{ data: [], error: null }],
      employees: [{ data: [{ id: 'emp-1', employee_id: 'N001', name: '김민지' }], error: null }],
    });

    const { loadWorkPerformancePeriod } = await import('@/api/workPerformance');
    const result = await loadWorkPerformancePeriod({
      organizationId: 'org-1',
      year: 2026,
      startMonth: 1,
      endMonth: 3,
    });

    expect(result.status).toBe('success');
    if (result.status !== 'success') {
      throw new Error(`Unexpected status: ${result.status}`);
    }

    expect(result.finalizedMonths).toEqual(['2026-01']);
    expect(result.finalizedVersionIds).toEqual(['version-jan']);
    expect(result.missingMonths).toEqual(['2026-02', '2026-03']);
    expect(result.assignments).toHaveLength(1);

    const assignmentQuery = calls.find((call) => call.table === 'schedule_assignments')!;
    expect(assignmentQuery.in).toContainEqual(['schedule_version_id', ['version-jan']]);
    expect(assignmentQuery.gte).toContainEqual(['date', '2025-12-31']);
    expect(assignmentQuery.lte).toContainEqual(['date', '2026-03-31']);
  });

  it('returns missingHolidayCoverage before loading selected-period holiday dates', async () => {
    const calls = createSupabaseMock({
      schedules: [
        {
          data: [{ id: 'schedule-jan', month: '2026-01', finalized_version_id: 'version-jan' }],
          error: null,
        },
        {
          data: null,
          error: null,
        },
      ],
      public_holidays: [{ data: [], error: null }],
    });

    const { loadWorkPerformancePeriod } = await import('@/api/workPerformance');
    const result = await loadWorkPerformancePeriod({
      organizationId: 'org-1',
      year: 2026,
      startMonth: 1,
      endMonth: 1,
    });

    expect(result).toEqual({ status: 'missingHolidayCoverage' });
    expect(calls.filter((call) => call.table === 'public_holidays')).toHaveLength(1);
    expect(calls.some((call) => call.table === 'schedule_assignments')).toBe(false);
  });

  it('throws the Korean load error for Supabase query failures and malformed required assignment rows', async () => {
    createSupabaseMock({
      schedules: [
        {
          data: [{ id: 'schedule-jan', month: '2026-01', finalized_version_id: 'version-jan' }],
          error: null,
        },
        {
          data: null,
          error: null,
        },
      ],
      public_holidays: [
        { data: [{ holiday_date: '2026-01-01' }], error: null },
        { data: [{ holiday_date: '2026-01-01' }], error: null },
      ],
      schedule_assignments: [
        {
          data: [
            {
              schedule_version_id: 'version-jan',
              employee_id: null,
              date: '2026-01-01',
              shift_id: 'shift-d',
              shifts: { code: 'D', name: '주간' },
            },
          ],
          error: null,
        },
      ],
    });

    const { loadWorkPerformancePeriod } = await import('@/api/workPerformance');
    await expect(
      loadWorkPerformancePeriod({
        organizationId: 'org-1',
        year: 2026,
        startMonth: 1,
        endMonth: 1,
      }),
    ).rejects.toThrow(LOAD_ERROR_MESSAGE);

    vi.resetModules();
    vi.clearAllMocks();
    createSupabaseMock({
      schedules: [{ data: null, error: { message: 'permission denied' } }],
    });

    const reloaded = await import('@/api/workPerformance');
    await expect(
      reloaded.loadWorkPerformancePeriod({
        organizationId: 'org-1',
        year: 2026,
        startMonth: 1,
        endMonth: 1,
      }),
    ).rejects.toThrow(LOAD_ERROR_MESSAGE);
  });
});
