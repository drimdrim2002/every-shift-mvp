import type { SchedulePrimaryActionKind, ScheduleVersionStatus } from '@/types/schedule';

const VERSION_STATUS_LABELS: Record<ScheduleVersionStatus, string> = {
  draft: '초안',
  solving: '생성 중',
  review_ready: '검토 준비 완료',
  review_blocked: '검토 차단',
  review_pending: '재검토 필요',
  infeasible: '생성 불가',
  solve_failed: '생성 실패',
  finalized: '최종 확정',
};

const PRIMARY_ACTION_LABELS: Record<SchedulePrimaryActionKind, string> = {
  select: '이 버전을 선택',
  recheck: '다시 검토',
  finalize: '이 버전 확정',
  retry: '다시 생성',
  none: '선택 가능한 작업이 없습니다.',
};

export function formatScheduleVersionStatus(status: ScheduleVersionStatus): string {
  return VERSION_STATUS_LABELS[status] ?? status;
}

export function formatSchedulePrimaryActionLabel(
  kind: SchedulePrimaryActionKind,
  fallbackLabel?: string | null
): string {
  return PRIMARY_ACTION_LABELS[kind] ?? fallbackLabel ?? PRIMARY_ACTION_LABELS.none;
}
