# Step5 Version Comparison Decision Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Step5 comparison modal so hospital operators judge schedule candidates by Off-request differences and mandatory-rule compliance before opening a generated schedule detail.

**Architecture:** Keep the existing Step5 review hub data flow and modal shell. Add one pure decision view-model builder in `scheduleComparisonSummary.ts`, render that model in `ComparisonWorkspace.vue`, and reorder `ScheduleCompareModal.vue` so the decision workspace appears before the candidate shelf whenever two versions are selected.

**Tech Stack:** Vue 3, TypeScript, Vite, Tailwind CSS, Naive UI, Vitest, ESLint.

---

## Source Spec

- Spec: `docs/plans/2026-05-02-step5-version-comparison-decision-screen.ko.md`
- Local design source: `DESIGN.md`
- Existing Step5 review hub context:
  - `src/views/schedule/Step5Result.vue`
  - `src/composables/useScheduleReviewHub.ts`
  - `src/components/schedule/review/ScheduleCompareModal.vue`
  - `src/components/schedule/review/ComparisonWorkspace.vue`
  - `src/components/schedule/review/VersionCandidateShelf.vue`
  - `src/utils/scheduleComparisonSummary.ts`

## File Structure

- Modify `src/utils/scheduleComparisonSummary.ts`
  - Keep `buildScheduleComparisonSummary()` unchanged for existing callers.
  - Add exported decision model types and `buildScheduleComparisonDecisionModel()`.
  - Keep all rule/proof/off-request display derivation in this pure utility.
- Modify `src/components/schedule/review/ComparisonWorkspace.vue`
  - Replace the old status/card-first UI with a decision-first workspace.
  - Render `핵심 판단`, `Off 요청 입력 차이`, `요구사항 충족 비교`, then detail actions.
  - Emit the existing `focus-version` event from new detail buttons.
- Modify `src/components/schedule/review/ScheduleCompareModal.vue`
  - Update helper copy.
  - Render workspace before candidate shelf for the two-version success state.
  - Wrap candidate shelf in a lower-priority `비교 대상 변경` section with `data-test="comparison-candidate-shelf-section"`.
- Inspect only `src/components/schedule/review/VersionCandidateShelf.vue`
  - Confirm it stays focused on candidate selection/delete/select actions.
- Inspect only `src/components/schedule/review/VersionCompareSurface.vue`
  - Confirm Step5 base preview metrics remain separate from modal decision rows.
- Inspect only `src/components/schedule/review/ComparisonToolsSection.vue`
  - Confirm it remains an expand/collapse shell and does not duplicate decision metrics.
- Modify `tests/unit/schedule-comparison-summary.spec.ts`
  - Add utility branch coverage for mandatory, optional, unknown, and percent fallback cases.
- Modify `tests/unit/comparison-workspace.spec.ts`
  - Add component coverage for DOM order, status text, unknown states, and detail events.
- Modify `tests/unit/schedule-compare-modal.spec.ts`
  - Add modal copy, state, and workspace-before-shelf order coverage.
- Optional modify `tests/e2e/schedule-workflow.spec.ts`
  - Only if jsdom unit tests cannot reliably verify modal ordering/focus behavior.

## Data Contracts To Use

Existing types live in `src/types/schedule.ts`.

```ts
export interface ScheduleVersionSummary {
  id: string;
  scheduleId: string;
  versionNo: number;
  name: string | null;
  status: ScheduleVersionStatus;
  manualEditCount: number;
  inputDiffSummary: ScheduleInputDiffSummary;
  comparisonMetrics: ScheduleCompareMetrics | null;
  // other fields omitted
}

export interface ScheduleEvaluation {
  resultStatus: ScheduleEvaluationResultStatus;
  proofSummary: ScheduleProofSummary;
  offRequestResults: ScheduleOffRequestResult[];
  comparisonMetrics: ScheduleCompareMetrics;
  // other fields omitted
}

export interface ScheduleProofSummary {
  weeklyHoursViolations: number;
  nnnViolations: number;
  nodViolations: number;
  minimumRestViolations: number;
  staffingShortfalls: number;
}

export interface ScheduleCompareMetrics {
  offRequestReflectionRate: number | null;
  nightShiftMin: number | null;
  nightShiftMax: number | null;
  weekendShiftMin: number | null;
  weekendShiftMax: number | null;
  manualEditCount: number;
}

export interface ScheduleOffRequestResult {
  fulfilled: boolean;
  // other fields omitted
}
```

Do not change these API contracts for this feature.

## Task 1: Add Decision Model Utility

**Files:**

- Modify: `src/utils/scheduleComparisonSummary.ts`
- Test: `tests/unit/schedule-comparison-summary.spec.ts`

- [ ] **Step 1: Add failing tests for decision-model shape**

In `tests/unit/schedule-comparison-summary.spec.ts`, update the import:

```ts
import {
  buildScheduleComparisonDecisionModel,
  buildScheduleComparisonSummary,
} from '@/utils/scheduleComparisonSummary';
```

Add helper factories near the existing factories:

```ts
function createEvaluation(
  overrides: Partial<NonNullable<ScheduleReviewResponse['latestEvaluation']>> = {}
) {
  return {
    id: 'evaluation-1',
    scheduleId: 'schedule-1',
    scheduleVersionId: 'version-1',
    revisionNo: 1,
    resultStatus: 'passed',
    proofSummary: {
      weeklyHoursViolations: 0,
      nnnViolations: 0,
      nodViolations: 0,
      minimumRestViolations: 0,
      staffingShortfalls: 0,
    },
    violationDetails: [],
    infeasibility: null,
    offRequestResults: [],
    comparisonMetrics: {
      offRequestReflectionRate: null,
      nightShiftMin: null,
      nightShiftMax: null,
      weekendShiftMin: null,
      weekendShiftMax: null,
      manualEditCount: 0,
    },
    finalizationGate: {
      allowed: true,
      blockingReasons: [],
    },
    assignmentHash: 'hash-1',
    solverExecutionId: null,
    evaluatorVersion: 'test',
    createdAt: '2026-05-03T00:00:00.000Z',
    ...overrides,
  } satisfies NonNullable<ScheduleReviewResponse['latestEvaluation']>;
}

function createReviewWithEvaluation(
  version: ScheduleVersionSummary,
  evaluationOverrides: Partial<NonNullable<ScheduleReviewResponse['latestEvaluation']>> = {}
): ScheduleReviewResponse {
  return createReviewResponse(version, {
    latestEvaluation: createEvaluation({
      scheduleId: version.scheduleId,
      scheduleVersionId: version.id,
      revisionNo: version.currentRevision,
      ...evaluationOverrides,
    }),
  });
}
```

Add a basic shape test:

```ts
it('builds a decision model with summary, Off input rows, and requirement rows', () => {
  const leftVersion = createVersionSummary({
    versionNo: 2,
    inputDiffSummary: {
      changedOffRequests: 3,
      changedLockedAssignments: 0,
      changedSiteRequirements: 0,
      note: '휴가 요청 반영',
    },
  });
  const rightVersion = createVersionSummary({
    versionNo: 3,
    inputDiffSummary: {
      changedOffRequests: 1,
      changedLockedAssignments: 0,
      changedSiteRequirements: 0,
      note: null,
    },
  });

  const model = buildScheduleComparisonDecisionModel({
    leftVersion,
    rightVersion,
    leftReview: createReviewWithEvaluation(leftVersion),
    rightReview: createReviewWithEvaluation(rightVersion),
  });

  expect(model.summaryBullets).toHaveLength(2);
  expect(model.offInputRows).toEqual([
    {
      label: '변경 Off 요청',
      leftText: '3건',
      rightText: '1건',
    },
    {
      label: '변경 메모',
      leftText: '휴가 요청 반영',
      rightText: '메모 없음',
    },
  ]);
  expect(model.requirementRows.map((row) => row.label)).toEqual([
    'NOD 근무 불가',
    '3연속 야간(N) 근무 불가',
    '2연속 야간(N) 후 48시간 이상 휴식',
    '야간 근무 월 15회 이하',
    'Off 요청 준수',
  ]);
});
```

- [ ] **Step 2: Run the failing utility spec**

Run:

```bash
pnpm test:unit -- tests/unit/schedule-comparison-summary.spec.ts
```

Expected: FAIL because `buildScheduleComparisonDecisionModel` does not exist.

- [ ] **Step 3: Add exported decision-model types**

In `src/utils/scheduleComparisonSummary.ts`, below imports:

```ts
export type ScheduleComparisonRequirementStatus = 'passed' | 'failed' | 'unknown';
export type ScheduleComparisonRequirementGroup = 'mandatory' | 'optional';

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

export interface ScheduleComparisonDecisionModel {
  summaryBullets: string[];
  offInputRows: ScheduleComparisonTextRow[];
  requirementRows: ScheduleComparisonRequirementRow[];
}

interface BuildScheduleComparisonDecisionModelArgs {
  leftVersion: ScheduleVersionSummary;
  rightVersion: ScheduleVersionSummary;
  leftReview: ScheduleReviewResponse | null;
  rightReview: ScheduleReviewResponse | null;
}

interface OffReflectionDisplay {
  status: ScheduleComparisonRequirementStatus;
  text: string;
  fulfilled: number | null;
  total: number | null;
  rate: number | null;
}
```

- [ ] **Step 4: Add percent and status helpers**

Add helpers above the existing export functions:

```ts
const UNKNOWN_TEXT = '검토 정보 없음';
const NO_REQUEST_TEXT = '요청 없음';
const NIGHT_SHIFT_MAX_LIMIT = 15;

function normalizePercent(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;

  const normalized = value <= 1 ? value * 100 : value;
  return Math.round(normalized);
}

function formatPercent(value: number | null | undefined): string | null {
  const percent = normalizePercent(value);
  return percent == null ? null : `${percent}%`;
}

function getViolationStatus(value: number | null | undefined): ScheduleComparisonRequirementStatus {
  if (value == null) return 'unknown';
  return value === 0 ? 'passed' : 'failed';
}

function formatViolationText(value: number | null | undefined): string {
  if (value == null) return UNKNOWN_TEXT;
  return value === 0 ? '통과' : `위반 ${value}건`;
}

function getNightShiftMaxStatus(
  value: number | null | undefined
): ScheduleComparisonRequirementStatus {
  if (value == null) return 'unknown';
  return value <= NIGHT_SHIFT_MAX_LIMIT ? 'passed' : 'failed';
}

function formatNightShiftMaxText(value: number | null | undefined): string {
  if (value == null) return UNKNOWN_TEXT;
  if (value <= NIGHT_SHIFT_MAX_LIMIT) return `통과 (최대 ${value}회)`;
  return `최대 ${value}회`;
}
```

- [ ] **Step 5: Add Off-request display helper**

Add:

```ts
function buildOffReflectionDisplay(
  review: ScheduleReviewResponse | null,
  version: ScheduleVersionSummary
): OffReflectionDisplay {
  const results = review?.latestEvaluation?.offRequestResults ?? null;

  if (results) {
    const total = results.length;
    if (total === 0) {
      return {
        status: 'unknown',
        text: NO_REQUEST_TEXT,
        fulfilled: 0,
        total: 0,
        rate: null,
      };
    }

    const fulfilled = results.filter((result) => result.fulfilled).length;
    const rate = Math.round((fulfilled / total) * 100);

    return {
      status: fulfilled === total ? 'passed' : 'failed',
      text: `${total}건 중 ${fulfilled}건 반영 (${rate}%)`,
      fulfilled,
      total,
      rate,
    };
  }

  const fallbackRate = formatPercent(
    review?.latestEvaluation?.comparisonMetrics.offRequestReflectionRate ??
      version.comparisonMetrics?.offRequestReflectionRate ??
      null
  );

  if (!fallbackRate) {
    return {
      status: 'unknown',
      text: UNKNOWN_TEXT,
      fulfilled: null,
      total: null,
      rate: null,
    };
  }

  return {
    status: 'unknown',
    text: `반영률 ${fallbackRate}`,
    fulfilled: null,
    total: null,
    rate: normalizePercent(
      review?.latestEvaluation?.comparisonMetrics.offRequestReflectionRate ??
        version.comparisonMetrics?.offRequestReflectionRate ??
        null
    ),
  };
}
```

- [ ] **Step 6: Add row builders**

Add:

```ts
function buildRequirementRow(
  label: string,
  leftValue: number | null | undefined,
  rightValue: number | null | undefined
): ScheduleComparisonRequirementRow {
  return {
    group: 'mandatory',
    label,
    leftStatus: getViolationStatus(leftValue),
    rightStatus: getViolationStatus(rightValue),
    leftText: formatViolationText(leftValue),
    rightText: formatViolationText(rightValue),
  };
}

function buildNightShiftRow(
  leftValue: number | null | undefined,
  rightValue: number | null | undefined
): ScheduleComparisonRequirementRow {
  return {
    group: 'mandatory',
    label: '야간 근무 월 15회 이하',
    leftStatus: getNightShiftMaxStatus(leftValue),
    rightStatus: getNightShiftMaxStatus(rightValue),
    leftText: formatNightShiftMaxText(leftValue),
    rightText: formatNightShiftMaxText(rightValue),
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
```

- [ ] **Step 7: Add summary-bullet helper**

Add:

```ts
function countMandatoryFailures(
  rows: ScheduleComparisonRequirementRow[],
  side: 'left' | 'right'
): number {
  return rows.filter((row) => {
    if (row.group !== 'mandatory') return false;
    return side === 'left' ? row.leftStatus === 'failed' : row.rightStatus === 'failed';
  }).length;
}

function countMandatoryUnknowns(
  rows: ScheduleComparisonRequirementRow[],
  side: 'left' | 'right'
): number {
  return rows.filter((row) => {
    if (row.group !== 'mandatory') return false;
    return side === 'left' ? row.leftStatus === 'unknown' : row.rightStatus === 'unknown';
  }).length;
}

function buildDecisionSummaryBullets(
  leftVersion: ScheduleVersionSummary,
  rightVersion: ScheduleVersionSummary,
  requirementRows: ScheduleComparisonRequirementRow[],
  leftOff: OffReflectionDisplay,
  rightOff: OffReflectionDisplay
): string[] {
  const bullets: string[] = [];
  const leftLabel = formatVersionLabel(leftVersion);
  const rightLabel = formatVersionLabel(rightVersion);
  const leftFailures = countMandatoryFailures(requirementRows, 'left');
  const rightFailures = countMandatoryFailures(requirementRows, 'right');
  const leftUnknowns = countMandatoryUnknowns(requirementRows, 'left');
  const rightUnknowns = countMandatoryUnknowns(requirementRows, 'right');

  if (leftUnknowns === 0 && rightUnknowns === 0 && leftFailures !== rightFailures) {
    const saferLabel = leftFailures < rightFailures ? leftLabel : rightLabel;
    const saferFailures = Math.min(leftFailures, rightFailures);
    const riskierFailures = Math.max(leftFailures, rightFailures);
    bullets.push(
      saferFailures === 0
        ? `${saferLabel}은 필수 기준을 모두 통과했습니다.`
        : `${saferLabel}의 필수 기준 위반이 ${riskierFailures - saferFailures}건 더 적습니다.`
    );
  } else if (leftUnknowns > 0 || rightUnknowns > 0) {
    bullets.push('검토 정보가 없는 항목이 있어 필수 기준 판단은 제한적입니다.');
  } else if (leftFailures === 0) {
    bullets.push('두 안 모두 필수 기준을 통과했습니다.');
  } else {
    bullets.push(`두 안 모두 필수 기준 위반 ${leftFailures}건이 있습니다.`);
  }

  if (leftOff.total != null && rightOff.total != null && leftOff.total > 0 && rightOff.total > 0) {
    if (leftOff.rate !== rightOff.rate) {
      const betterLabel = (rightOff.rate ?? 0) > (leftOff.rate ?? 0) ? rightLabel : leftLabel;
      bullets.push(`${betterLabel}의 Off 요청 반영률이 더 높습니다.`);
    } else {
      bullets.push('두 안의 Off 요청 반영률은 같습니다.');
    }
  } else if (leftOff.text === NO_REQUEST_TEXT && rightOff.text === NO_REQUEST_TEXT) {
    bullets.push('비교할 Off 요청이 없습니다.');
  } else {
    bullets.push('Off 요청 반영률은 제공된 검토 정보 기준으로만 확인할 수 있습니다.');
  }

  return bullets.slice(0, 3);
}
```

- [ ] **Step 8: Export `buildScheduleComparisonDecisionModel()`**

Add the new export below helper functions and above or below `buildScheduleComparisonSummary()`:

```ts
export function buildScheduleComparisonDecisionModel({
  leftVersion,
  rightVersion,
  leftReview,
  rightReview,
}: BuildScheduleComparisonDecisionModelArgs): ScheduleComparisonDecisionModel {
  const leftEvaluation = leftReview?.latestEvaluation ?? null;
  const rightEvaluation = rightReview?.latestEvaluation ?? null;

  const leftOff = buildOffReflectionDisplay(leftReview, leftVersion);
  const rightOff = buildOffReflectionDisplay(rightReview, rightVersion);

  const requirementRows: ScheduleComparisonRequirementRow[] = [
    buildRequirementRow(
      'NOD 근무 불가',
      leftEvaluation?.proofSummary.nodViolations,
      rightEvaluation?.proofSummary.nodViolations
    ),
    buildRequirementRow(
      '3연속 야간(N) 근무 불가',
      leftEvaluation?.proofSummary.nnnViolations,
      rightEvaluation?.proofSummary.nnnViolations
    ),
    buildRequirementRow(
      '2연속 야간(N) 후 48시간 이상 휴식',
      leftEvaluation?.proofSummary.minimumRestViolations,
      rightEvaluation?.proofSummary.minimumRestViolations
    ),
    buildNightShiftRow(
      leftEvaluation?.comparisonMetrics.nightShiftMax,
      rightEvaluation?.comparisonMetrics.nightShiftMax
    ),
    buildOffRow(leftOff, rightOff),
  ];

  return {
    summaryBullets: buildDecisionSummaryBullets(
      leftVersion,
      rightVersion,
      requirementRows,
      leftOff,
      rightOff
    ),
    offInputRows: [
      {
        label: '변경 Off 요청',
        leftText: `${leftVersion.inputDiffSummary.changedOffRequests}건`,
        rightText: `${rightVersion.inputDiffSummary.changedOffRequests}건`,
      },
      {
        label: '변경 메모',
        leftText: leftVersion.inputDiffSummary.note ?? '메모 없음',
        rightText: rightVersion.inputDiffSummary.note ?? '메모 없음',
      },
    ],
    requirementRows,
  };
}
```

- [ ] **Step 9: Add branch tests for mandatory status**

Add tests:

```ts
it('marks mandatory proof rows as passed, failed, or unknown without false pass states', () => {
  const leftVersion = createVersionSummary({ versionNo: 2 });
  const rightVersion = createVersionSummary({ versionNo: 3 });

  const model = buildScheduleComparisonDecisionModel({
    leftVersion,
    rightVersion,
    leftReview: createReviewWithEvaluation(leftVersion, {
      proofSummary: {
        weeklyHoursViolations: 0,
        nnnViolations: 2,
        nodViolations: 0,
        minimumRestViolations: 1,
        staffingShortfalls: 0,
      },
      comparisonMetrics: {
        offRequestReflectionRate: null,
        nightShiftMin: null,
        nightShiftMax: 16,
        weekendShiftMin: null,
        weekendShiftMax: null,
        manualEditCount: 0,
      },
    }),
    rightReview: null,
  });

  expect(model.requirementRows).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        label: 'NOD 근무 불가',
        leftStatus: 'passed',
        leftText: '통과',
        rightStatus: 'unknown',
        rightText: '검토 정보 없음',
      }),
      expect.objectContaining({
        label: '3연속 야간(N) 근무 불가',
        leftStatus: 'failed',
        leftText: '위반 2건',
        rightStatus: 'unknown',
      }),
      expect.objectContaining({
        label: '야간 근무 월 15회 이하',
        leftStatus: 'failed',
        leftText: '최대 16회',
        rightStatus: 'unknown',
      }),
    ])
  );
});
```

- [ ] **Step 10: Add branch tests for Off-request exact and fallback behavior**

Add tests:

```ts
it('uses exact offRequestResults before fallback reflection metrics', () => {
  const leftVersion = createVersionSummary({
    versionNo: 2,
    comparisonMetrics: {
      offRequestReflectionRate: 20,
      nightShiftMin: null,
      nightShiftMax: null,
      weekendShiftMin: null,
      weekendShiftMax: null,
      manualEditCount: 0,
    },
  });
  const rightVersion = createVersionSummary({ versionNo: 3 });

  const model = buildScheduleComparisonDecisionModel({
    leftVersion,
    rightVersion,
    leftReview: createReviewWithEvaluation(leftVersion, {
      offRequestResults: [{ fulfilled: true }, { fulfilled: true }, { fulfilled: false }].map(
        (partial, index) => ({
          employeeId: `employee-${index}`,
          date: `2026-05-0${index + 1}`,
          requestCode: 'O',
          requestNote: null,
          isSoft: false,
          resolutionStatus: 'pending',
          resolvedShiftId: null,
          resolvedAt: null,
          reason: null,
          ...partial,
        })
      ),
    }),
    rightReview: createReviewWithEvaluation(rightVersion, {
      offRequestResults: [],
    }),
  });

  expect(model.requirementRows).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        label: 'Off 요청 준수',
        leftText: '3건 중 2건 반영 (67%)',
        leftStatus: 'failed',
        rightText: '요청 없음',
        rightStatus: 'unknown',
      }),
    ])
  );
});

it('normalizes fallback reflection-rate metrics without inventing exact counts', () => {
  const leftVersion = createVersionSummary({
    versionNo: 2,
    comparisonMetrics: {
      offRequestReflectionRate: 0.81,
      nightShiftMin: null,
      nightShiftMax: null,
      weekendShiftMin: null,
      weekendShiftMax: null,
      manualEditCount: 0,
    },
  });
  const rightVersion = createVersionSummary({
    versionNo: 3,
    comparisonMetrics: {
      offRequestReflectionRate: 81,
      nightShiftMin: null,
      nightShiftMax: null,
      weekendShiftMin: null,
      weekendShiftMax: null,
      manualEditCount: 0,
    },
  });

  const model = buildScheduleComparisonDecisionModel({
    leftVersion,
    rightVersion,
    leftReview: null,
    rightReview: null,
  });

  const offRow = model.requirementRows.find((row) => row.label === 'Off 요청 준수');

  expect(offRow?.leftText).toBe('반영률 81%');
  expect(offRow?.rightText).toBe('반영률 81%');
  expect(offRow?.leftText).not.toContain('건 중');
});
```

- [ ] **Step 11: Run utility tests and fix compile issues**

Run:

```bash
pnpm test:unit -- tests/unit/schedule-comparison-summary.spec.ts
```

Expected: PASS.

- [ ] **Step 12: Commit Task 1**

```bash
git add src/utils/scheduleComparisonSummary.ts tests/unit/schedule-comparison-summary.spec.ts
git commit -m "feat: add schedule comparison decision model"
```

## Task 2: Rebuild Comparison Workspace UI

**Files:**

- Modify: `src/components/schedule/review/ComparisonWorkspace.vue`
- Test: `tests/unit/comparison-workspace.spec.ts`

- [ ] **Step 1: Add failing workspace tests for decision-first order**

In `tests/unit/comparison-workspace.spec.ts`, add a helper for review overrides if needed:

```ts
function createReviewResponse(
  version: ScheduleVersionSummary,
  overrides: Partial<ScheduleReviewResponse> = {}
): ScheduleReviewResponse {
  return {
    scheduleId: version.scheduleId,
    selectedVersionId: version.id,
    finalizedVersionId: null,
    version,
    latestEvaluation: null,
    primaryAction: {
      kind: 'none',
      targetVersionId: null,
      label: '선택 가능한 작업이 없습니다.',
      disabledReason: null,
    },
    defaultTab: 'grid',
    ...overrides,
  };
}
```

Add a test that asserts the visible order:

```ts
it('renders decision sections before detail actions and old status metadata', () => {
  const leftVersion = createVersionSummary({
    versionNo: 2,
    inputDiffSummary: {
      changedOffRequests: 2,
      changedLockedAssignments: 0,
      changedSiteRequirements: 0,
      note: '휴가 요청 변경',
    },
  });
  const rightVersion = createVersionSummary({ versionNo: 3 });

  const wrapper = mount(ComparisonWorkspace, {
    props: {
      leftVersion,
      rightVersion,
      leftReview: createReviewResponse(leftVersion),
      rightReview: createReviewResponse(rightVersion),
      focusedVersionId: null,
    },
  });

  const text = wrapper.text();
  expect(text.indexOf('핵심 판단')).toBeLessThan(text.indexOf('Off 요청 입력 차이'));
  expect(text.indexOf('Off 요청 입력 차이')).toBeLessThan(text.indexOf('요구사항 충족 비교'));
  expect(text.indexOf('요구사항 충족 비교')).toBeLessThan(text.indexOf('이 근무표안 자세히 보기'));
  expect(text.indexOf('핵심 판단')).toBeLessThan(text.indexOf('상태:'));
});
```

- [ ] **Step 2: Add failing tests for status text and events**

Add:

```ts
it('shows pass, fail, unknown, and no-request states as visible text', () => {
  const leftVersion = createVersionSummary({ versionNo: 2 });
  const rightVersion = createVersionSummary({ versionNo: 3 });

  const wrapper = mount(ComparisonWorkspace, {
    props: {
      leftVersion,
      rightVersion,
      leftReview: createReviewResponse(leftVersion, {
        latestEvaluation: {
          id: 'evaluation-left',
          scheduleId: leftVersion.scheduleId,
          scheduleVersionId: leftVersion.id,
          revisionNo: 1,
          resultStatus: 'passed',
          proofSummary: {
            weeklyHoursViolations: 0,
            nnnViolations: 2,
            nodViolations: 0,
            minimumRestViolations: 0,
            staffingShortfalls: 0,
          },
          violationDetails: [],
          infeasibility: null,
          offRequestResults: [],
          comparisonMetrics: {
            offRequestReflectionRate: null,
            nightShiftMin: null,
            nightShiftMax: 16,
            weekendShiftMin: null,
            weekendShiftMax: null,
            manualEditCount: 0,
          },
          finalizationGate: {
            allowed: true,
            blockingReasons: [],
          },
          assignmentHash: 'hash-left',
          solverExecutionId: null,
          evaluatorVersion: 'test',
          createdAt: '2026-05-03T00:00:00.000Z',
        },
      }),
      rightReview: null,
      focusedVersionId: null,
    },
  });

  expect(wrapper.text()).toContain('통과');
  expect(wrapper.text()).toContain('위반 2건');
  expect(wrapper.text()).toContain('검토 정보 없음');
  expect(wrapper.text()).toContain('요청 없음');
});

it('emits focus-version from both detail buttons', async () => {
  const leftVersion = createVersionSummary({ versionNo: 2 });
  const rightVersion = createVersionSummary({ versionNo: 3 });

  const wrapper = mount(ComparisonWorkspace, {
    props: {
      leftVersion,
      rightVersion,
      leftReview: createReviewResponse(leftVersion),
      rightReview: createReviewResponse(rightVersion),
      focusedVersionId: null,
    },
  });

  await wrapper.get(`[data-test="detail-version-${leftVersion.id}"]`).trigger('click');
  await wrapper.get(`[data-test="detail-version-${rightVersion.id}"]`).trigger('click');

  expect(wrapper.emitted('focus-version')).toEqual([[leftVersion.id], [rightVersion.id]]);
});
```

- [ ] **Step 3: Run workspace tests and verify they fail**

Run:

```bash
pnpm test:unit -- tests/unit/comparison-workspace.spec.ts
```

Expected: FAIL because the current component renders `핵심 차이`, old status cards, and old button copy.

- [ ] **Step 4: Update imports and computed state**

In `ComparisonWorkspace.vue`, replace `buildScheduleComparisonSummary` import with:

```ts
import {
  buildScheduleComparisonDecisionModel,
  type ScheduleComparisonRequirementStatus,
} from '@/utils/scheduleComparisonSummary';
```

Replace `summaryBullets` with:

```ts
const decisionModel = computed(() => {
  if (!props.leftVersion || !props.rightVersion) {
    return null;
  }

  return buildScheduleComparisonDecisionModel({
    leftVersion: props.leftVersion,
    rightVersion: props.rightVersion,
    leftReview: props.leftReview,
    rightReview: props.rightReview,
  });
});
```

Add class helpers:

```ts
function getStatusClass(status: ScheduleComparisonRequirementStatus) {
  if (status === 'passed') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'failed') return 'border-rose-200 bg-rose-50 text-rose-800';
  return 'border-slate-200 bg-slate-100 text-slate-600';
}

function getGroupLabel(group: 'mandatory' | 'optional') {
  return group === 'mandatory' ? '필수 기준' : '선택 기준';
}
```

Keep:

```ts
function isFocused(versionId: string | null | undefined) {
  return !!versionId && versionId === props.focusedVersionId;
}
```

- [ ] **Step 5: Replace template with decision-first structure**

Use one outer workspace panel and section bands. Do not add repeated `n-card`.

```vue
<template>
  <section
    data-test="comparison-workspace"
    class="rounded-2xl border border-slate-200 bg-slate-50 p-4"
  >
    <div class="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">근무표안 비교</p>
        <h3 class="text-base font-semibold text-slate-900">
          Off 요청과 필수 기준을 먼저 확인하세요
        </h3>
        <p class="mt-1 text-sm text-slate-600">Off 요청 차이와 필수 기준 충족 여부를 비교합니다.</p>
      </div>
      <p class="text-xs text-slate-500">
        {{ hasTwoVersions ? '2개 안 비교 중' : '비교할 근무표안을 하나 더 선택하세요' }}
      </p>
    </div>

    <div v-if="decisionModel" class="space-y-4">
      <section
        data-test="comparison-summary"
        class="rounded-xl border border-slate-200 bg-white p-4"
      >
        <h4 class="text-sm font-semibold text-slate-900">핵심 판단</h4>
        <ul class="mt-3 space-y-2 text-sm leading-6 text-slate-700">
          <li
            v-for="(bullet, index) in decisionModel.summaryBullets"
            :key="`${index}:${bullet}`"
            class="flex gap-2"
          >
            <span class="mt-2 size-1.5 shrink-0 rounded-full bg-slate-500" />
            <span>{{ bullet }}</span>
          </li>
        </ul>
      </section>

      <section
        data-test="comparison-off-input"
        class="rounded-xl border border-slate-200 bg-white p-4"
      >
        <h4 class="text-sm font-semibold text-slate-900">Off 요청 입력 차이</h4>
        <div class="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-100">
          <div
            v-for="row in decisionModel.offInputRows"
            :key="row.label"
            class="grid gap-2 px-3 py-3 text-sm md:grid-cols-[1.2fr_1fr_1fr]"
          >
            <p class="font-medium text-slate-700">
              {{ row.label }}
            </p>
            <p class="text-slate-600"><span class="md:hidden">왼쪽: </span>{{ row.leftText }}</p>
            <p class="text-slate-600"><span class="md:hidden">오른쪽: </span>{{ row.rightText }}</p>
          </div>
        </div>
      </section>

      <section
        data-test="comparison-requirements"
        class="rounded-xl border border-slate-200 bg-white p-4"
      >
        <h4 class="text-sm font-semibold text-slate-900">요구사항 충족 비교</h4>
        <div class="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-100">
          <div
            v-for="row in decisionModel.requirementRows"
            :key="`${row.group}:${row.label}`"
            class="grid gap-2 px-3 py-3 text-sm md:grid-cols-[1.2fr_1fr_1fr]"
          >
            <div>
              <p class="font-medium text-slate-800">
                {{ row.label }}
              </p>
              <p class="mt-1 text-xs text-slate-500">
                {{ getGroupLabel(row.group) }}
              </p>
            </div>
            <p
              class="rounded-lg border px-3 py-2 text-sm font-medium"
              :class="getStatusClass(row.leftStatus)"
            >
              <span class="md:hidden">왼쪽 근무표안: </span>{{ row.leftText }}
            </p>
            <p
              class="rounded-lg border px-3 py-2 text-sm font-medium"
              :class="getStatusClass(row.rightStatus)"
            >
              <span class="md:hidden">오른쪽 근무표안: </span>{{ row.rightText }}
            </p>
          </div>
        </div>
      </section>

      <section
        data-test="comparison-detail-actions"
        class="rounded-xl border border-slate-200 bg-white p-4"
      >
        <h4 class="text-sm font-semibold text-slate-900">생성 근무표 확인</h4>
        <div class="mt-3 grid gap-3 md:grid-cols-2">
          <article
            v-for="version in [leftVersion, rightVersion]"
            :key="version?.id ?? 'empty-version'"
            class="rounded-lg border p-3"
            :class="
              isFocused(version?.id) ? 'border-sky-500 ring-2 ring-sky-100' : 'border-slate-200'
            "
          >
            <p class="text-sm font-semibold text-slate-900">
              {{ formatVersionLabel(version) }}
            </p>
            <p v-if="version" class="mt-1 text-xs text-slate-500">
              상태: {{ formatScheduleVersionStatus(version.status) }} · 수정
              {{ version.manualEditCount ?? 0 }}회
            </p>
            <button
              v-if="version"
              :data-test="`detail-version-${version.id}`"
              type="button"
              class="mt-3 min-h-11 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              @click="emit('focus-version', version.id)"
            >
              이 근무표안 자세히 보기
            </button>
          </article>
        </div>
      </section>
    </div>

    <p
      v-else
      class="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500"
    >
      비교할 근무표안을 하나 더 선택하세요.
    </p>
  </section>
</template>
```

If the linter rejects the inline `[leftVersion, rightVersion]` array in the template, replace it with a computed:

```ts
const comparedVersions = computed(() => [props.leftVersion, props.rightVersion]);
```

and render `comparedVersions`.

- [ ] **Step 6: Run workspace tests**

Run:

```bash
pnpm test:unit -- tests/unit/comparison-workspace.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Run utility and workspace tests together**

Run:

```bash
pnpm test:unit -- tests/unit/schedule-comparison-summary.spec.ts tests/unit/comparison-workspace.spec.ts
```

Expected: PASS.

- [ ] **Step 8: Commit Task 2**

```bash
git add src/components/schedule/review/ComparisonWorkspace.vue tests/unit/comparison-workspace.spec.ts
git commit -m "feat: make comparison workspace decision first"
```

## Task 3: Reorder and Retest Compare Modal

**Files:**

- Modify: `src/components/schedule/review/ScheduleCompareModal.vue`
- Test: `tests/unit/schedule-compare-modal.spec.ts`

- [ ] **Step 1: Add failing modal copy and order tests**

In `tests/unit/schedule-compare-modal.spec.ts`, add:

```ts
it('describes the modal as an Off-request and mandatory-rule decision surface', async () => {
  mountModal();
  await flushPromises();

  expect(document.body.textContent).toContain(
    'Off 요청 차이와 필수 기준 충족 여부를 비교한 뒤 필요한 근무표안을 자세히 확인하세요.'
  );
});
```

Add a DOM order test:

```ts
it('renders the decision workspace before the candidate shelf when two plans can be compared', async () => {
  mountModal();
  await flushPromises();

  const workspace = document.querySelector('[data-test="comparison-workspace"]');
  const shelf = document.querySelector('[data-test="comparison-candidate-shelf-section"]');

  expect(workspace).toBeTruthy();
  expect(shelf).toBeTruthy();
  expect(
    workspace!.compareDocumentPosition(shelf!) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy();
});
```

Add a loading guard test:

```ts
it('keeps loading state modal-local and does not render the decision workspace while loading', async () => {
  mountModal({ loading: true });
  await flushPromises();

  expect(document.querySelector('[data-test="compare-modal-loading"]')).toBeTruthy();
  expect(document.querySelector('[data-test="comparison-workspace"]')).toBeNull();
});
```

- [ ] **Step 2: Run modal tests and verify they fail**

Run:

```bash
pnpm test:unit -- tests/unit/schedule-compare-modal.spec.ts
```

Expected: FAIL because current copy is generic and the candidate shelf appears before the workspace.

- [ ] **Step 3: Update modal helper copy**

In `ScheduleCompareModal.vue`, replace:

```vue
여러 안의 결과를 비교하고 최종으로 볼 안을 선택하세요.
```

with:

```vue
Off 요청 차이와 필수 기준 충족 여부를 비교한 뒤 필요한 근무표안을 자세히 확인하세요.
```

- [ ] **Step 4: Reorder success layout**

Replace the success branch order with:

```vue
<div
  v-else
  class="space-y-5"
>
  <ComparisonWorkspace
    :left-version="leftVersion"
    :right-version="rightVersion"
    :left-review="leftReview"
    :right-review="rightReview"
    :focused-version-id="focusedVersionId"
    @focus-version="emit('focus-version', $event)"
  />

  <section
    data-test="comparison-candidate-shelf-section"
    class="rounded-2xl border border-slate-200 bg-white p-4"
  >
    <div class="mb-3">
      <h3 class="text-sm font-semibold text-slate-900">
        비교 대상 변경
      </h3>
      <p class="mt-1 text-sm text-slate-600">
        다른 근무표안을 비교하려면 아래 후보를 선택하세요.
      </p>
    </div>

    <VersionCandidateShelf
      :versions="versions"
      :compare-version-ids="compareVersionIds"
      :focused-version-id="focusedVersionId"
      :selected-version-id="selectedVersionId"
      :locked-version-id="lockedVersionId"
      @toggle-compare="emit('toggle-compare', $event)"
      @focus-version="emit('focus-version', $event)"
      @select-version="emit('select-version', $event)"
      @delete-version="emit('delete-version', $event)"
    />
  </section>
</div>
```

Do not change loading, error, or empty branches.

- [ ] **Step 5: Preserve empty branch behavior**

Confirm this branch remains first for `versions.length <= 1`:

```vue
<div v-else-if="versions.length <= 1" data-test="compare-modal-empty">
  ...
</div>
```

The workspace must not render when there is no second candidate.

- [ ] **Step 6: Run modal tests**

Run:

```bash
pnpm test:unit -- tests/unit/schedule-compare-modal.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Run all targeted unit specs**

Run:

```bash
pnpm test:unit -- tests/unit/schedule-comparison-summary.spec.ts tests/unit/comparison-workspace.spec.ts tests/unit/schedule-compare-modal.spec.ts
```

Expected: PASS.

- [ ] **Step 8: Commit Task 3**

```bash
git add src/components/schedule/review/ScheduleCompareModal.vue tests/unit/schedule-compare-modal.spec.ts
git commit -m "feat: prioritize decision workspace in compare modal"
```

## Task 4: Inspect Adjacent Compare Components

**Files:**

- Inspect: `src/components/schedule/review/VersionCandidateShelf.vue`
- Inspect: `src/components/schedule/review/VersionCompareSurface.vue`
- Inspect: `src/components/schedule/review/ComparisonToolsSection.vue`
- Test: existing targeted tests from Tasks 1-3

- [ ] **Step 1: Inspect candidate shelf copy and actions**

Run:

```bash
sed -n '1,280p' src/components/schedule/review/VersionCandidateShelf.vue
```

Expected: candidate shelf still owns candidate toggle/focus/select/delete UI only.

Do not move decision rows into this component.

- [ ] **Step 2: Inspect base compare surface**

Run:

```bash
sed -n '1,240p' src/components/schedule/review/VersionCompareSurface.vue
```

Expected: base Step5 preview surface can still show compact version metrics, but it should not duplicate the new modal decision table.

- [ ] **Step 3: Inspect tools section shell**

Run:

```bash
sed -n '1,220p' src/components/schedule/review/ComparisonToolsSection.vue
```

Expected: component remains a shell for comparison tools and does not get new proof/off-request calculation logic.

- [ ] **Step 4: Search for newly exposed English workflow terms**

Run:

```bash
rg -n "version|preview|focus" src/components/schedule/review/ComparisonWorkspace.vue src/components/schedule/review/ScheduleCompareModal.vue
```

Expected:

- Matches in code identifiers, prop names, event names, or `data-test` are fine.
- User-facing Korean template text should not newly expose `version`, `preview`, or `focus`.

- [ ] **Step 5: Commit only if this task required edits**

If no edits were needed:

```bash
git status --short
```

Expected: no new changes from Task 4.

If edits were needed:

```bash
git add src/components/schedule/review/VersionCandidateShelf.vue src/components/schedule/review/VersionCompareSurface.vue src/components/schedule/review/ComparisonToolsSection.vue
git commit -m "chore: keep compare helpers scoped"
```

## Task 5: Final Verification

**Files:**

- Verify: all modified production and test files
- Optional Test: `tests/e2e/schedule-workflow.spec.ts`

- [ ] **Step 1: Run targeted unit specs**

Run:

```bash
pnpm test:unit -- tests/unit/schedule-comparison-summary.spec.ts tests/unit/comparison-workspace.spec.ts tests/unit/schedule-compare-modal.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
pnpm lint:check
```

Expected: PASS with no ESLint errors. Warnings are allowed by the repo command, but do not ignore errors.

- [ ] **Step 3: Run E2E smoke only if unit coverage is insufficient**

If unit tests cannot reliably validate modal order or focus return, add a small smoke assertion to `tests/e2e/schedule-workflow.spec.ts` and run:

```bash
pnpm test:e2e -- tests/e2e/schedule-workflow.spec.ts
```

Expected: PASS.

Do not add broad E2E coverage for every comparison row unless unit tests prove insufficient. This feature is mostly deterministic UI derivation from existing props.

- [ ] **Step 4: Manual UI check in dev server if visual confidence is low**

Run:

```bash
pnpm dev
```

Open the Step5 compare modal and verify:

- `핵심 판단` appears before `비교 대상 변경`.
- `Off 요청 입력 차이` appears before generated schedule detail actions.
- Mandatory and Optional rows are readable on desktop width.
- Narrow width preserves label/value meaning.
- No nested card grid or decorative gradient was introduced.

- [ ] **Step 5: Final commit if Task 5 changed tests or implementation**

```bash
git status --short
git add <changed-files>
git commit -m "test: cover step5 comparison decision screen"
```

## Acceptance Criteria

- The compare modal first answers which schedule candidate is safer to consider.
- `핵심 판단`, `Off 요청 입력 차이`, and `요구사항 충족 비교` appear before candidate shelf controls when two versions are selected.
- Mandatory rows compare these criteria in the same row:
  - `NOD 근무 불가`
  - `3연속 야간(N) 근무 불가`
  - `2연속 야간(N) 후 48시간 이상 휴식`
  - `야간 근무 월 15회 이하`
- Optional row compares `Off 요청 준수`.
- Off-request exact display uses `latestEvaluation.offRequestResults` when available.
- Fallback display uses `comparisonMetrics.offRequestReflectionRate` only as a rate and does not invent exact counts.
- `0.81` and `81` both display as `81%`.
- Missing review data displays `검토 정보 없음`, never `통과`.
- Zero Off requests display `요청 없음`, not a pass/fail claim.
- Generated schedules are opened through `이 근무표안 자세히 보기` as a secondary action.
- Candidate shelf remains available under `비교 대상 변경`.
- User-facing UI text is Korean.
- No API schema, store, route, Supabase function, or solver integration changes are introduced.
- `pnpm lint:check` passes.
- Targeted unit specs pass.

## Risk Controls

- Keep `buildScheduleComparisonSummary()` behavior stable for existing tests.
- Keep all decision calculations out of Vue template expressions.
- Do not infer employee/date-level Off diff; current API does not provide it.
- Treat null/undefined proof and metric values as `unknown`.
- Use color plus visible text for pass/fail/unknown.
- Avoid new dependencies, design tokens, fonts, palettes, gradients, or decorative icon cards.
- Keep candidate cards only in `VersionCandidateShelf.vue`; the decision workspace should read like a compact comparison document.

## Out Of Scope

- Employee/date-level Off diff API.
- Backend evaluator improvements.
- Step5 default page redesign outside the compare modal/workspace.
- Mobile-first comparison UX.
- Registration, approval, analytics, or organization CRUD.
- Real AI solver integration.

## Review Notes

- This plan was generated from `docs/plans/2026-05-02-step5-version-comparison-decision-screen.ko.md` using `superpowers:writing-plans`.
- The subagent plan-document-review loop from the skill was not run in this session because current agent policy only allows spawning subagents when the user explicitly asks for subagents, delegation, or parallel agent work.
- Before implementation, use `superpowers:subagent-driven-development` or `superpowers:executing-plans` as required by the header.
