import type { ScheduleReviewResponse, ScheduleVersionSummary } from '@/types/schedule';

function formatVersionLabel(version: ScheduleVersionSummary): string {
  return version.name ?? `V${version.versionNo}`;
}

function getReadinessRank(
  version: ScheduleVersionSummary,
  review: ScheduleReviewResponse | null
): number {
  if (version.status === 'finalized') return 5;
  if (version.status === 'review_ready') return 4;
  if (version.status === 'review_pending') return 3;
  if (version.status === 'review_blocked') return 2;
  if (version.status === 'infeasible') return 1;
  if (version.status === 'solve_failed') return 0;

  return review?.latestEvaluation?.resultStatus === 'passed' ? 4 : 0;
}

function getReadinessCopy(version: ScheduleVersionSummary): string | null {
  const label = formatVersionLabel(version);

  if (version.status === 'finalized') {
    return `${label}안은 최종 확정된 상태입니다.`;
  }

  if (version.status === 'review_ready') {
    return `${label}안은 바로 확정할 수 있습니다.`;
  }

  if (version.status === 'review_pending') {
    return `${label}안은 직접 수정이 있어 다시 검사가 필요합니다.`;
  }

  if (version.status === 'review_blocked') {
    return `${label}안은 규칙 위반 때문에 확정할 수 없습니다.`;
  }

  if (version.status === 'infeasible') {
    return `${label}안은 조건 충돌로 생성할 수 없습니다.`;
  }

  if (version.status === 'solve_failed') {
    return `${label}안은 생성 중 오류가 발생했습니다.`;
  }

  return null;
}

function buildOffRequestReflectionCopy(
  leftVersion: ScheduleVersionSummary,
  rightVersion: ScheduleVersionSummary
): string | null {
  const leftRate = leftVersion.comparisonMetrics?.offRequestReflectionRate;
  const rightRate = rightVersion.comparisonMetrics?.offRequestReflectionRate;

  if (leftRate == null || rightRate == null || leftRate === rightRate) {
    return null;
  }

  const winner = rightRate > leftRate ? rightVersion : leftVersion;
  return `${formatVersionLabel(winner)}안의 Off 요청 반영률이 더 높습니다.`;
}

export function buildScheduleComparisonSummary(
  leftVersion: ScheduleVersionSummary,
  rightVersion: ScheduleVersionSummary,
  leftReview: ScheduleReviewResponse | null,
  rightReview: ScheduleReviewResponse | null
): string[] {
  const bullets: string[] = [];

  const offRequestReflectionCopy = buildOffRequestReflectionCopy(leftVersion, rightVersion);
  if (offRequestReflectionCopy) {
    bullets.push(offRequestReflectionCopy);
  }

  const leftRank = getReadinessRank(leftVersion, leftReview);
  const rightRank = getReadinessRank(rightVersion, rightReview);
  if (leftRank !== rightRank) {
    const betterVersion = leftRank > rightRank ? leftVersion : rightVersion;
    const worseVersion = leftRank > rightRank ? rightVersion : leftVersion;
    const betterReadinessCopy = getReadinessCopy(betterVersion);
    const worseReadinessCopy = getReadinessCopy(worseVersion);

    if (betterReadinessCopy) {
      bullets.push(betterReadinessCopy);
    }

    if (worseReadinessCopy && bullets.length < 3) {
      bullets.push(worseReadinessCopy);
    }
  } else if (leftVersion.status !== rightVersion.status) {
    const leftReadinessCopy = getReadinessCopy(leftVersion);
    const rightReadinessCopy = getReadinessCopy(rightVersion);
    if (leftReadinessCopy && rightReadinessCopy) {
      bullets.push(leftReadinessCopy);
      if (bullets.length < 3) {
        bullets.push(rightReadinessCopy);
      }
    }
  }

  const leftManualEdits = leftVersion.manualEditCount ?? 0;
  const rightManualEdits = rightVersion.manualEditCount ?? 0;
  if (leftRank === rightRank && leftManualEdits !== rightManualEdits) {
    const editorVersion = rightManualEdits > leftManualEdits ? rightVersion : leftVersion;
    const editGap = Math.abs(rightManualEdits - leftManualEdits);
    bullets.push(`${formatVersionLabel(editorVersion)}안은 수동 수정이 ${editGap}건 더 있습니다.`);
  }

  if (bullets.length === 0) {
    bullets.push('두 안의 핵심 지표 차이가 크지 않습니다.');
  }

  return bullets.slice(0, 3);
}
