import type {
  SchedulePrimaryActionKind,
  ScheduleVersionStatus,
  ScheduleVersionSummary,
} from '@/types/schedule';

const VERSION_STATUS_LABELS: Record<ScheduleVersionStatus, string> = {
  draft: '초안',
  solving: '생성 중',
  review_ready: '확정 가능',
  review_blocked: '규칙 위반으로 확정 불가',
  review_pending: '수정 후 다시 검사 필요',
  infeasible: '조건 충돌로 생성 불가',
  solve_failed: '생성 중 오류 발생',
  finalized: '최종 확정됨',
};

const PRIMARY_ACTION_LABELS: Record<SchedulePrimaryActionKind, string> = {
  select: '이 근무표안을 기준안으로 사용',
  recheck: '다시 검사',
  finalize: '이 근무표안 확정',
  retry: '다시 생성',
  none: '선택 가능한 작업이 없습니다.',
};

export function formatScheduleVersionStatus(status: ScheduleVersionStatus): string {
  return VERSION_STATUS_LABELS[status] ?? status;
}

export function formatScheduleVersionLabel(
  version: Pick<ScheduleVersionSummary, 'name' | 'versionNo'> | null,
  emptyLabel = '없음'
): string {
  if (!version) return emptyLabel;

  const name = version.name?.trim();
  return name && name.length > 0 ? name : `${version.versionNo ?? '?'}안`;
}

export function formatSchedulePrimaryActionLabel(
  kind: SchedulePrimaryActionKind,
  fallbackLabel?: string | null
): string {
  return PRIMARY_ACTION_LABELS[kind] ?? fallbackLabel ?? PRIMARY_ACTION_LABELS.none;
}
