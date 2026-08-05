import type { ScheduleSummary } from '@/api/schedule';
import type { ScheduleCompareResponse } from '@/types/schedule';
import { getCanonicalScheduleVersionId, hasExecutedVersionHistory } from '@/utils/scheduleVersionResolver';

export type ScheduleMonthDisplayState =
  | 'empty'
  | 'draft'
  | 'running'
  | 'ready'
  | 'ready_empty'
  | 'error';
export type ScheduleMonthResumeStep = 'step4' | 'step5';

export type ScheduleMonthLike = Pick<
  ScheduleSummary,
  'month' | 'status' | 'has_assignments'
>;

const READY_STATUSES = new Set<ScheduleSummary['status']>(['complete', 'changed']);

export function getScheduleMonthDisplayState(
  schedule: ScheduleMonthLike | null | undefined
): ScheduleMonthDisplayState {
  if (!schedule) {
    return 'empty';
  }

  if (schedule.status === 'running') {
    return 'running';
  }

  if (READY_STATUSES.has(schedule.status)) {
    // Explicit false only: undefined keeps prior "ready" behavior for callers
    // that have not evaluated assignment presence.
    if (schedule.has_assignments === false) {
      return 'ready_empty';
    }
    return 'ready';
  }

  if (schedule.status === 'error') {
    return 'error';
  }

  return 'draft';
}

export function isScheduleMonthBlockedForCreation(schedule: ScheduleMonthLike): boolean {
  return schedule.status === 'running' || READY_STATUSES.has(schedule.status);
}

export function getBlockedScheduleMonths(schedules: Iterable<ScheduleMonthLike>): string[] {
  const blockedMonths: string[] = [];

  for (const schedule of schedules) {
    if (isScheduleMonthBlockedForCreation(schedule)) {
      blockedMonths.push(schedule.month);
    }
  }

  return blockedMonths;
}

export function isInProgressScheduleMonth(schedule: ScheduleMonthLike): boolean {
  return schedule.status === 'created' || schedule.status === 'error';
}

export function getScheduleMonthTileLabel(state: ScheduleMonthDisplayState): string {
  const labels: Record<ScheduleMonthDisplayState, string> = {
    empty: '생성 전',
    draft: '이어서 진행',
    running: '생성 중',
    ready: '결과 보기',
    ready_empty: '배정 없음',
    error: '오류 · 재시도',
  };

  return labels[state];
}

export function isScheduleMonthTileInteractive(state: ScheduleMonthDisplayState): boolean {
  return state !== 'empty';
}

export function resolveResumeStepFromCompare(
  schedule: ScheduleMonthLike,
  compare: ScheduleCompareResponse,
  hasSavedPreferences: boolean
): ScheduleMonthResumeStep {
  if (schedule.status === 'error') {
    return 'step4';
  }

  if (schedule.status === 'running' || READY_STATUSES.has(schedule.status)) {
    return 'step5';
  }

  if (hasExecutedVersionHistory(compare)) {
    return 'step5';
  }

  if (hasSavedPreferences) {
    return 'step5';
  }

  return 'step4';
}

export function getResumePreviewVersionId(compare: ScheduleCompareResponse): string | null {
  return getCanonicalScheduleVersionId(compare);
}
