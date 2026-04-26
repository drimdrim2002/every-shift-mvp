import type {
  ScheduleEvaluation,
  ScheduleFinalizationGate,
  SchedulePrimaryAction,
  ScheduleReviewTab,
  ScheduleVersionStatus,
} from '@/types/schedule';

export type ReviewLeadPanel = 'grid' | 'pending' | 'proof' | 'infeasible' | 'failure';

function getGateSupportCopy(gate: ScheduleFinalizationGate | null): string | null {
  return gate?.blockingReasons[0]?.message ?? null;
}

function getSolveFailedSupportCopy(
  latestEvaluation: ScheduleEvaluation | null
): string | null {
  if (latestEvaluation?.resultStatus !== 'solve_failed') {
    return null;
  }

  return latestEvaluation.infeasibility?.summary ?? null;
}

export function resolveReviewLeadPanel(status: ScheduleVersionStatus): ReviewLeadPanel {
  if (status === 'review_pending') return 'pending';
  if (status === 'review_blocked') return 'proof';
  if (status === 'infeasible') return 'infeasible';
  if (status === 'solve_failed') return 'failure';
  return 'grid';
}

export function resolveDefaultReviewTab(status: ScheduleVersionStatus): ScheduleReviewTab {
  return status === 'review_blocked' ? 'proof' : 'grid';
}

export function buildPrimaryActionSupportCopy(args: {
  action: SchedulePrimaryAction;
  gate: ScheduleFinalizationGate | null;
  latestEvaluation: ScheduleEvaluation | null;
}): string | null {
  if (args.action.disabledReason) {
    return args.action.disabledReason;
  }

  const gateSupportCopy = getGateSupportCopy(args.gate ?? args.latestEvaluation?.finalizationGate ?? null);
  const solveFailedSupportCopy = getSolveFailedSupportCopy(args.latestEvaluation);

  if (args.action.kind === 'retry') {
    return solveFailedSupportCopy ?? gateSupportCopy;
  }

  if (args.action.kind === 'finalize' || args.action.kind === 'recheck' || args.action.kind === 'select') {
    return gateSupportCopy ?? solveFailedSupportCopy;
  }

  return gateSupportCopy ?? solveFailedSupportCopy;
}
