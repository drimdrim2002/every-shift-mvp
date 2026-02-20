import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue');
  return {
    ...actual,
    onUnmounted: vi.fn(),
  };
});

vi.mock('@/api/solver', () => ({
  createSolverExecution: vi.fn(),
  getSolverStatus: vi.fn(),
  parseSolverResult: vi.fn(),
  mapApiStatusToAppStatus: vi.fn(),
}));

vi.mock('@/api/schedule', () => ({
  refreshPreferenceResolution: vi.fn(),
}));

vi.mock('@/api/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { useAISolver } from '@/composables/useAISolver';
import { getSolverStatus, mapApiStatusToAppStatus, parseSolverResult } from '@/api/solver';
import { refreshPreferenceResolution } from '@/api/schedule';
import { supabase } from '@/api/supabase';
import type { SolverStatusResponse } from '@/types/schedule';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flushPromises(times = 4) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

function createCompletedStatusResponse(executionId: string): SolverStatusResponse {
  return {
    execution_id: executionId,
    status: 'COMPLETED',
    result: {
      availabilityList: [],
      employeeList: [],
      shiftList: [],
      score: {
        hard_score: 0,
        soft_score: 0,
      },
      scheduleState: {},
    },
  };
}

function setupSupabaseMock(options?: {
  insertDeferred?: Deferred<{ error: null }>;
  insertReject?: Error;
  callOrder?: string[];
}) {
  const fromMock = vi.mocked(supabase.from);

  fromMock.mockImplementation((table: string) => {
    if (table === 'schedule_assignments') {
      return {
        delete: () => ({
          eq: vi.fn(async () => {
            options?.callOrder?.push('assignments-delete');
            return { error: null };
          }),
        }),
        insert: vi.fn(async () => {
          options?.callOrder?.push('assignments-insert');
          if (options?.insertReject) {
            return { error: options.insertReject };
          }
          if (options?.insertDeferred) {
            return options.insertDeferred.promise;
          }
          return { error: null };
        }),
      } as unknown as ReturnType<typeof supabase.from>;
    }

    if (table === 'schedules') {
      return {
        update: vi.fn((payload: { status?: string }) => ({
          eq: vi.fn(async () => {
            if (payload.status === 'complete') options?.callOrder?.push('schedule-complete');
            if (payload.status === 'error') options?.callOrder?.push('schedule-error');
            return { error: null };
          }),
        })),
      } as unknown as ReturnType<typeof supabase.from>;
    }

    throw new Error(`Unexpected table mock request: ${table}`);
  });
}

describe('useAISolver', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('sets complete only after final DB save is finished', async () => {
    const insertDeferred = createDeferred<{ error: null }>();
    setupSupabaseMock({ insertDeferred });
    vi.mocked(getSolverStatus).mockResolvedValue(createCompletedStatusResponse('exec-1'));
    vi.mocked(mapApiStatusToAppStatus).mockReturnValue('complete');
    vi.mocked(parseSolverResult).mockReturnValue({
      'emp-1': { '2025-12-01': 'shift-d' },
    });
    vi.mocked(refreshPreferenceResolution).mockResolvedValue([]);

    const solver = useAISolver();
    solver.status.value = 'running';
    solver.startPolling('exec-1', 'schedule-1');

    vi.advanceTimersByTime(10000);
    await flushPromises();

    expect(getSolverStatus).toHaveBeenCalledTimes(1);
    expect(solver.status.value).toBe('running');

    insertDeferred.resolve({ error: null });
    for (let i = 0; i < 20 && solver.status.value !== 'complete'; i++) {
      await flushPromises(1);
    }

    expect(solver.status.value).toBe('complete');
    expect(solver.progress.value).toBe(100);
  });

  it('moves to error when final result save fails', async () => {
    setupSupabaseMock({ insertReject: new Error('db insert failed') });
    vi.mocked(getSolverStatus).mockResolvedValue(createCompletedStatusResponse('exec-2'));
    vi.mocked(mapApiStatusToAppStatus).mockReturnValue('complete');
    vi.mocked(parseSolverResult).mockReturnValue({
      'emp-1': { '2025-12-01': 'shift-d' },
    });
    vi.mocked(refreshPreferenceResolution).mockResolvedValue([]);

    const solver = useAISolver();
    solver.status.value = 'running';
    solver.startPolling('exec-2', 'schedule-2');

    await vi.advanceTimersByTimeAsync(10000);
    await flushPromises();

    expect(solver.status.value).toBe('error');
    expect(solver.error.value).toContain('db insert failed');
  });

  it('persists final data in order: assignments -> preferences -> schedule complete', async () => {
    const callOrder: string[] = [];
    setupSupabaseMock({ callOrder });
    vi.mocked(getSolverStatus).mockResolvedValue(createCompletedStatusResponse('exec-3'));
    vi.mocked(mapApiStatusToAppStatus).mockReturnValue('complete');
    vi.mocked(parseSolverResult).mockReturnValue({
      'emp-1': { '2025-12-01': 'shift-d' },
    });
    vi.mocked(refreshPreferenceResolution).mockImplementation(async () => {
      callOrder.push('preferences-refresh');
      return [];
    });

    const solver = useAISolver();
    solver.status.value = 'running';
    solver.startPolling('exec-3', 'schedule-3');

    await vi.advanceTimersByTimeAsync(10000);
    await flushPromises();

    expect(callOrder).toEqual([
      'assignments-delete',
      'assignments-insert',
      'preferences-refresh',
      'schedule-complete',
    ]);
    expect(solver.status.value).toBe('complete');
  });
});
