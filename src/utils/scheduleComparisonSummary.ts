import type {
  CommentMap,
  ConstraintMap,
  ScheduleReviewResponse,
  ScheduleVersionSummary,
} from '@/types/schedule';
import type {
  ScheduleComplianceResult,
  ScheduleComplianceRuleCode,
  ScheduleComplianceRuleSummary,
} from '@/types/scheduleCompliance';
import { formatScheduleVersionLabel } from '@/utils/scheduleReviewCopy';

export type ScheduleComparisonRequirementStatus =
  | 'passed'
  | 'failed'
  | 'check_required'
  | 'unknown';
export type ScheduleComparisonRequirementGroup = 'mandatory' | 'optional';
export type ScheduleComparisonOffDiffType = 'left_only' | 'right_only' | 'note_changed';

export interface ScheduleComparisonTextRow {
  label: string;
  leftText: string;
  rightText: string;
}

export interface ScheduleComparisonRequirementRow {
  group: ScheduleComparisonRequirementGroup;
  label: string;
  leftStatus: ScheduleComparisonRequirementStatus;
  rightStatus: ScheduleComparisonRequirementStatus;
  leftText: string;
  rightText: string;
}

export interface ScheduleComparisonOffInputSnapshot {
  constraints: ConstraintMap;
  notes: CommentMap;
}

export interface ScheduleComparisonOffInputDiffRow {
  employeeId: string;
  employeeName: string;
  date: string;
  leftText: string;
  rightText: string;
  changeType: ScheduleComparisonOffDiffType;
  changeTypeLabel: string;
}

export interface ScheduleComparisonDecisionModel {
  summaryBullets: string[];
  offInputRows: ScheduleComparisonTextRow[];
  offInputDiffRows: ScheduleComparisonOffInputDiffRow[];
  offInputDiffEmptyText: string;
  requirementRows: ScheduleComparisonRequirementRow[];
}

export interface BuildScheduleComparisonDecisionModelArgs {
  leftVersion: ScheduleVersionSummary;
  rightVersion: ScheduleVersionSummary;
  leftReview: ScheduleReviewResponse | null;
  rightReview: ScheduleReviewResponse | null;
  leftComplianceResult?: ScheduleComplianceResult | null;
  rightComplianceResult?: ScheduleComplianceResult | null;
  leftOffInput?: ScheduleComparisonOffInputSnapshot | null;
  rightOffInput?: ScheduleComparisonOffInputSnapshot | null;
  employees?: Array<{ id: string; name: string }>;
}

export interface OffReflectionDisplay {
  status: ScheduleComparisonRequirementStatus;
  text: string;
  fulfilled: number | null;
  total: number | null;
  rate: number | null;
}

const UNKNOWN_TEXT = '검토 정보 없음';
const NO_REQUEST_TEXT = '요청 없음';
const OFF_INPUT_DIFF_EMPTY_TEXT = '두 안의 Off 요청 입력은 같습니다.';
const NIGHT_SHIFT_MAX_LIMIT = 15;

const COMPLIANCE_REQUIREMENT_DEFINITIONS: Array<{
  code: ScheduleComplianceRuleCode;
  label: string;
}> = [
  { code: 'nod_pattern', label: 'NOD 근무 불가' },
  { code: 'triple_night', label: '3연속 야간(N) 근무 불가' },
  { code: 'rest_after_two_nights', label: '2연속 야간(N) 후 48시간 이상 휴식' },
  { code: 'monthly_night_limit', label: '야간 근무 월 15회 이하' },
];

function formatVersionLabel(version: ScheduleVersionSummary): string {
  return formatScheduleVersionLabel(version);
}

function normalizePercent(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) {
    return null;
  }

  return Math.round(value <= 1 ? value * 100 : value);
}

function formatPercent(value: number | null | undefined): string | null {
  const percent = normalizePercent(value);
  return percent == null ? null : `${percent}%`;
}

function getViolationStatus(
  violationCount: number | null | undefined
): ScheduleComparisonRequirementStatus {
  if (violationCount == null) {
    return 'unknown';
  }

  return violationCount === 0 ? 'passed' : 'failed';
}

function formatViolationText(violationCount: number | null | undefined): string {
  if (violationCount == null) {
    return UNKNOWN_TEXT;
  }

  return violationCount === 0 ? '통과' : `위반 ${violationCount}건`;
}

function findComplianceSummary(
  compliance: ScheduleComplianceResult | null | undefined,
  code: ScheduleComplianceRuleCode
): ScheduleComplianceRuleSummary | null {
  return compliance?.summaries.find((summary) => summary.code === code) ?? null;
}

function getComplianceStatus(
  summary: ScheduleComplianceRuleSummary | null
): ScheduleComparisonRequirementStatus {
  if (!summary) return 'unknown';
  return summary.status;
}

function formatComplianceText(summary: ScheduleComplianceRuleSummary | null): string {
  if (!summary) return UNKNOWN_TEXT;
  if (summary.status === 'passed') return '통과';
  if (summary.status === 'check_required') return '확인 필요';
  return `위반 ${summary.violationCount}건`;
}

function getNightShiftMaxStatus(
  nightShiftMax: number | null | undefined
): ScheduleComparisonRequirementStatus {
  if (nightShiftMax == null) {
    return 'unknown';
  }

  return nightShiftMax <= NIGHT_SHIFT_MAX_LIMIT ? 'passed' : 'failed';
}

function formatNightShiftMaxText(nightShiftMax: number | null | undefined): string {
  if (nightShiftMax == null) {
    return UNKNOWN_TEXT;
  }

  if (nightShiftMax <= NIGHT_SHIFT_MAX_LIMIT) {
    return `통과 (최대 ${nightShiftMax}회)`;
  }

  return `최대 ${nightShiftMax}회`;
}

function buildOffReflectionDisplay(
  review: ScheduleReviewResponse | null,
  version: ScheduleVersionSummary
): OffReflectionDisplay {
  const offRequestResults = review?.latestEvaluation?.offRequestResults;
  if (Array.isArray(offRequestResults)) {
    const total = offRequestResults.length;
    if (total === 0) {
      return {
        status: 'unknown',
        text: NO_REQUEST_TEXT,
        fulfilled: 0,
        total: 0,
        rate: null,
      };
    }

    const fulfilled = offRequestResults.filter((result) => result.fulfilled).length;
    const rate = Math.round((fulfilled / total) * 100);

    return {
      status: fulfilled === total ? 'passed' : 'failed',
      text: `${total}건 중 ${fulfilled}건 반영 (${rate}%)`,
      fulfilled,
      total,
      rate,
    };
  }

  const fallbackRate = normalizePercent(
    review?.latestEvaluation?.comparisonMetrics?.offRequestReflectionRate ??
      version.comparisonMetrics?.offRequestReflectionRate
  );
  if (fallbackRate != null) {
    return {
      status: 'unknown',
      text: `반영률 ${formatPercent(fallbackRate)}`,
      fulfilled: null,
      total: null,
      rate: fallbackRate,
    };
  }

  return {
    status: 'unknown',
    text: UNKNOWN_TEXT,
    fulfilled: null,
    total: null,
    rate: null,
  };
}

function buildComplianceOffDisplay(
  compliance: ScheduleComplianceResult | null | undefined
): OffReflectionDisplay {
  const offRequests = compliance?.offRequests;
  if (!offRequests) {
    return {
      status: 'unknown',
      text: UNKNOWN_TEXT,
      fulfilled: null,
      total: null,
      rate: null,
    };
  }

  if (offRequests.totalRequests === 0) {
    return {
      status: 'unknown',
      text: NO_REQUEST_TEXT,
      fulfilled: 0,
      total: 0,
      rate: null,
    };
  }

  const rate = offRequests.reflectionRate == null
    ? Math.round((offRequests.fulfilledRequests / offRequests.totalRequests) * 100)
    : Math.round(offRequests.reflectionRate);

  return {
    status: offRequests.unfulfilledRequests === 0 ? 'passed' : 'failed',
    text: `${offRequests.totalRequests}건 중 ${offRequests.fulfilledRequests}건 반영 (${rate}%)`,
    fulfilled: offRequests.fulfilledRequests,
    total: offRequests.totalRequests,
    rate,
  };
}

function buildRequirementRow(
  label: string,
  leftViolationCount: number | null | undefined,
  rightViolationCount: number | null | undefined
): ScheduleComparisonRequirementRow {
  return {
    group: 'mandatory',
    label,
    leftStatus: getViolationStatus(leftViolationCount),
    rightStatus: getViolationStatus(rightViolationCount),
    leftText: formatViolationText(leftViolationCount),
    rightText: formatViolationText(rightViolationCount),
  };
}

function buildNightShiftRow(
  leftNightShiftMax: number | null | undefined,
  rightNightShiftMax: number | null | undefined
): ScheduleComparisonRequirementRow {
  return {
    group: 'mandatory',
    label: '야간 근무 월 15회 이하',
    leftStatus: getNightShiftMaxStatus(leftNightShiftMax),
    rightStatus: getNightShiftMaxStatus(rightNightShiftMax),
    leftText: formatNightShiftMaxText(leftNightShiftMax),
    rightText: formatNightShiftMaxText(rightNightShiftMax),
  };
}

function buildOffRow(
  leftDisplay: OffReflectionDisplay,
  rightDisplay: OffReflectionDisplay
): ScheduleComparisonRequirementRow {
  return {
    group: 'optional',
    label: 'Off 요청 준수',
    leftStatus: leftDisplay.status,
    rightStatus: rightDisplay.status,
    leftText: leftDisplay.text,
    rightText: rightDisplay.text,
  };
}

function buildComplianceRequirementRow(
  label: string,
  leftSummary: ScheduleComplianceRuleSummary | null,
  rightSummary: ScheduleComplianceRuleSummary | null
): ScheduleComparisonRequirementRow {
  return {
    group: 'mandatory',
    label,
    leftStatus: getComplianceStatus(leftSummary),
    rightStatus: getComplianceStatus(rightSummary),
    leftText: formatComplianceText(leftSummary),
    rightText: formatComplianceText(rightSummary),
  };
}

function isOffRequested(
  snapshot: ScheduleComparisonOffInputSnapshot | null | undefined,
  employeeId: string,
  date: string
): boolean {
  return snapshot?.constraints?.[employeeId]?.[date] === 'O';
}

function getTrimmedOffNote(
  snapshot: ScheduleComparisonOffInputSnapshot | null | undefined,
  employeeId: string,
  date: string
): string {
  return snapshot?.notes?.[employeeId]?.[date]?.trim() ?? '';
}

function formatOffInputText(isRequested: boolean, note: string): string {
  if (!isRequested) return '-';
  return note ? `Off · ${note}` : 'Off';
}

function getOffInputDiffLabel(
  changeType: ScheduleComparisonOffDiffType,
  leftVersionLabel: string,
  rightVersionLabel: string
): string {
  if (changeType === 'left_only') return `${leftVersionLabel}만 Off`;
  if (changeType === 'right_only') return `${rightVersionLabel}만 Off`;
  return '메모 변경';
}

function buildEmployeeOrderMap(employees: Array<{ id: string; name: string }> = []) {
  return new Map(employees.map((employee, index) => [employee.id, index]));
}

function getEmployeeName(
  employeeId: string,
  employees: Array<{ id: string; name: string }> = []
): string {
  return employees.find((employee) => employee.id === employeeId)?.name ?? employeeId;
}

function collectOffInputCells(
  snapshot: ScheduleComparisonOffInputSnapshot | null | undefined,
  cells: Set<string>
): void {
  for (const [employeeId, dateMap] of Object.entries(snapshot?.constraints ?? {})) {
    for (const [date, requestCode] of Object.entries(dateMap || {})) {
      if (requestCode === 'O') {
        cells.add(`${employeeId}::${date}`);
      }
    }
  }
}

function buildOffInputDiffRows(
  leftOffInput: ScheduleComparisonOffInputSnapshot | null | undefined,
  rightOffInput: ScheduleComparisonOffInputSnapshot | null | undefined,
  leftVersionLabel: string,
  rightVersionLabel: string,
  employees: Array<{ id: string; name: string }> = []
): ScheduleComparisonOffInputDiffRow[] {
  const cells = new Set<string>();
  collectOffInputCells(leftOffInput, cells);
  collectOffInputCells(rightOffInput, cells);

  const employeeOrderMap = buildEmployeeOrderMap(employees);

  return Array.from(cells)
    .map((cell) => {
      const [employeeId = '', date = ''] = cell.split('::');
      const leftRequested = isOffRequested(leftOffInput, employeeId, date);
      const rightRequested = isOffRequested(rightOffInput, employeeId, date);
      const leftNote = getTrimmedOffNote(leftOffInput, employeeId, date);
      const rightNote = getTrimmedOffNote(rightOffInput, employeeId, date);

      if (leftRequested && !rightRequested) {
        return {
          employeeId,
          employeeName: getEmployeeName(employeeId, employees),
          date,
          leftText: formatOffInputText(true, leftNote),
          rightText: '-',
          changeType: 'left_only' as const,
          changeTypeLabel: getOffInputDiffLabel('left_only', leftVersionLabel, rightVersionLabel),
        };
      }

      if (!leftRequested && rightRequested) {
        return {
          employeeId,
          employeeName: getEmployeeName(employeeId, employees),
          date,
          leftText: '-',
          rightText: formatOffInputText(true, rightNote),
          changeType: 'right_only' as const,
          changeTypeLabel: getOffInputDiffLabel('right_only', leftVersionLabel, rightVersionLabel),
        };
      }

      if (leftRequested && rightRequested && leftNote !== rightNote) {
        return {
          employeeId,
          employeeName: getEmployeeName(employeeId, employees),
          date,
          leftText: formatOffInputText(true, leftNote),
          rightText: formatOffInputText(true, rightNote),
          changeType: 'note_changed' as const,
          changeTypeLabel: getOffInputDiffLabel('note_changed', leftVersionLabel, rightVersionLabel),
        };
      }

      return null;
    })
    .filter((row): row is ScheduleComparisonOffInputDiffRow => row !== null)
    .sort((left, right) => {
      const dateOrder = left.date.localeCompare(right.date);
      if (dateOrder !== 0) return dateOrder;

      const leftOrder = employeeOrderMap.get(left.employeeId) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = employeeOrderMap.get(right.employeeId) ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;

      const nameOrder = left.employeeName.localeCompare(right.employeeName, 'ko');
      if (nameOrder !== 0) return nameOrder;

      return left.employeeId.localeCompare(right.employeeId);
    });
}

function countMandatoryFailures(
  rows: ScheduleComparisonRequirementRow[],
  side: 'left' | 'right'
): number {
  const statusKey = side === 'left' ? 'leftStatus' : 'rightStatus';
  return rows.filter((row) => row.group === 'mandatory' && row[statusKey] === 'failed').length;
}

function countMandatoryUnknowns(
  rows: ScheduleComparisonRequirementRow[],
  side: 'left' | 'right'
): number {
  const statusKey = side === 'left' ? 'leftStatus' : 'rightStatus';
  return rows.filter((row) => row.group === 'mandatory' && row[statusKey] === 'unknown').length;
}

function buildDecisionSummaryBullets(
  leftVersion: ScheduleVersionSummary,
  rightVersion: ScheduleVersionSummary,
  requirementRows: ScheduleComparisonRequirementRow[],
  leftOffDisplay: OffReflectionDisplay,
  rightOffDisplay: OffReflectionDisplay
): string[] {
  const bullets: string[] = [];
  const leftFailures = countMandatoryFailures(requirementRows, 'left');
  const rightFailures = countMandatoryFailures(requirementRows, 'right');
  const unknownCount =
    countMandatoryUnknowns(requirementRows, 'left') + countMandatoryUnknowns(requirementRows, 'right');

  if (unknownCount > 0) {
    bullets.push('검토 정보가 없는 항목이 있어 필수 기준 판단은 제한적입니다.');
  } else if (leftFailures !== rightFailures) {
    const saferVersion = leftFailures < rightFailures ? leftVersion : rightVersion;
    const saferLabel = formatVersionLabel(saferVersion);
    const saferFailures = Math.min(leftFailures, rightFailures);
    const riskierFailures = Math.max(leftFailures, rightFailures);

    if (saferFailures === 0) {
      bullets.push(`${saferLabel}은 필수 기준을 모두 통과했습니다.`);
    } else {
      bullets.push(`${saferLabel}의 필수 기준 위반이 ${riskierFailures - saferFailures}건 더 적습니다.`);
    }
  } else if (leftFailures === 0) {
    bullets.push('두 안 모두 필수 기준을 통과했습니다.');
  } else {
    bullets.push(`두 안 모두 필수 기준 위반 ${leftFailures}건이 있습니다.`);
  }

  if (
    leftOffDisplay.total != null &&
    rightOffDisplay.total != null &&
    leftOffDisplay.total > 0 &&
    rightOffDisplay.total > 0
  ) {
    if (leftOffDisplay.rate !== rightOffDisplay.rate) {
      const betterVersion =
        (leftOffDisplay.rate ?? 0) > (rightOffDisplay.rate ?? 0) ? leftVersion : rightVersion;
      bullets.push(`${formatVersionLabel(betterVersion)}의 Off 요청 반영률이 더 높습니다.`);
    } else {
      bullets.push('두 안의 Off 요청 반영률은 같습니다.');
    }
  } else if (leftOffDisplay.text === NO_REQUEST_TEXT && rightOffDisplay.text === NO_REQUEST_TEXT) {
    bullets.push('비교할 Off 요청이 없습니다.');
  } else {
    bullets.push('Off 요청 반영률은 제공된 검토 정보 기준으로만 확인할 수 있습니다.');
  }

  return bullets.slice(0, 3);
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
    return `${label}은 최종 확정된 상태입니다.`;
  }

  if (version.status === 'review_ready') {
    return `${label}은 바로 확정할 수 있습니다.`;
  }

  if (version.status === 'review_pending') {
    return `${label}은 직접 수정이 있어 다시 검사가 필요합니다.`;
  }

  if (version.status === 'review_blocked') {
    return `${label}은 규칙 위반 때문에 확정할 수 없습니다.`;
  }

  if (version.status === 'infeasible') {
    return `${label}은 조건 충돌로 생성할 수 없습니다.`;
  }

  if (version.status === 'solve_failed') {
    return `${label}은 생성 중 오류가 발생했습니다.`;
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
  return `${formatVersionLabel(winner)}의 Off 요청 반영률이 더 높습니다.`;
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
    bullets.push(`${formatVersionLabel(editorVersion)}은 수동 수정이 ${editGap}건 더 있습니다.`);
  }

  if (bullets.length === 0) {
    bullets.push('두 안의 핵심 지표 차이가 크지 않습니다.');
  }

  return bullets.slice(0, 3);
}

export function buildScheduleComparisonDecisionModel({
  leftVersion,
  rightVersion,
  leftReview,
  rightReview,
  leftComplianceResult,
  rightComplianceResult,
  leftOffInput,
  rightOffInput,
  employees = [],
}: BuildScheduleComparisonDecisionModelArgs): ScheduleComparisonDecisionModel {
  const leftEvaluation = leftReview?.latestEvaluation;
  const rightEvaluation = rightReview?.latestEvaluation;
  const leftVersionLabel = formatVersionLabel(leftVersion);
  const rightVersionLabel = formatVersionLabel(rightVersion);
  const hasComplianceResults = leftComplianceResult !== undefined || rightComplianceResult !== undefined;
  const leftOffDisplay = hasComplianceResults
    ? buildComplianceOffDisplay(leftComplianceResult)
    : buildOffReflectionDisplay(leftReview, leftVersion);
  const rightOffDisplay = hasComplianceResults
    ? buildComplianceOffDisplay(rightComplianceResult)
    : buildOffReflectionDisplay(rightReview, rightVersion);
  const requirementRows: ScheduleComparisonRequirementRow[] = hasComplianceResults
    ? [
        ...COMPLIANCE_REQUIREMENT_DEFINITIONS.map(({ code, label }) =>
          buildComplianceRequirementRow(
            label,
            findComplianceSummary(leftComplianceResult, code),
            findComplianceSummary(rightComplianceResult, code)
          )
        ),
        buildOffRow(leftOffDisplay, rightOffDisplay),
      ]
    : [
        buildRequirementRow(
          'NOD 근무 불가',
          leftEvaluation?.proofSummary?.nodViolations,
          rightEvaluation?.proofSummary?.nodViolations
        ),
        buildRequirementRow(
          '3연속 야간(N) 근무 불가',
          leftEvaluation?.proofSummary?.nnnViolations,
          rightEvaluation?.proofSummary?.nnnViolations
        ),
        buildRequirementRow(
          '2연속 야간(N) 후 48시간 이상 휴식',
          leftEvaluation?.proofSummary?.minimumRestViolations,
          rightEvaluation?.proofSummary?.minimumRestViolations
        ),
        buildNightShiftRow(
          leftEvaluation?.comparisonMetrics?.nightShiftMax,
          rightEvaluation?.comparisonMetrics?.nightShiftMax
        ),
        buildOffRow(leftOffDisplay, rightOffDisplay),
      ];
  const offInputDiffRows = buildOffInputDiffRows(
    leftOffInput,
    rightOffInput,
    leftVersionLabel,
    rightVersionLabel,
    employees
  );

  return {
    summaryBullets: buildDecisionSummaryBullets(
      leftVersion,
      rightVersion,
      requirementRows,
      leftOffDisplay,
      rightOffDisplay
    ),
    offInputRows: [
      {
        label: '변경 Off 요청',
        leftText: `${leftVersion.inputDiffSummary.changedOffRequests}건`,
        rightText: `${rightVersion.inputDiffSummary.changedOffRequests}건`,
      },
      {
        label: '변경 메모',
        leftText: leftVersion.inputDiffSummary.note?.trim() || '메모 없음',
        rightText: rightVersion.inputDiffSummary.note?.trim() || '메모 없음',
      },
    ],
    offInputDiffRows,
    offInputDiffEmptyText: OFF_INPUT_DIFF_EMPTY_TEXT,
    requirementRows,
  };
}
