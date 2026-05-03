# Step5 비교 모달 정확도 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Step5 비교 모달의 `Off 요청 준수`와 필수 기준 판정을 Step5 본문 `위반 상세`와 같은 실제 배정표 기반 결과로 통일한다.

**Architecture:** Step5가 비교할 좌/우 버전의 assignments/preferences를 modal open 시 함께 로드하고, 각 버전별 `ScheduleComplianceResult`와 Off 요청 입력 snapshot을 만든다. `scheduleComparisonSummary.ts`는 서버 evaluator proof 값 대신 이 snapshot을 받아 비교용 view model을 만들고, `ComparisonWorkspace.vue`는 그 model을 목록/캘린더 UI로 표시한다.

**Tech Stack:** Vue 3, TypeScript, Vite, Tailwind CSS, Naive UI, Pinia, Vitest, ESLint.

---

## Source Context

- Product scope: MVP schedule-generation Step5 비교 모달만 변경한다.
- Source spec: this document.
- Existing decision screen plan: `docs/superpowers/plans/2026-05-03-step5-version-comparison-decision-screen.md`
- High-value files:
  - `src/views/schedule/Step5Result.vue`
  - `src/utils/scheduleComparisonSummary.ts`
  - `src/components/schedule/review/ComparisonWorkspace.vue`
  - `src/components/schedule/review/ScheduleCompareModal.vue`
  - `src/utils/scheduleCompliance.ts`
  - `src/types/scheduleCompliance.ts`

## Current Problem

현재 비교 모달은 `latestEvaluation.offRequestResults`와 `latestEvaluation.proofSummary`를 사용한다. 이 값은 서버 evaluator가 만든 값이라, 현재 화면의 실제 배정표와 Off 요청 입력을 기준으로 계산하는 Step5 본문 `위반 상세`와 어긋날 수 있다.

이번 변경의 핵심은 비교 모달도 좌/우 버전별 실제 데이터를 다시 읽어 `evaluateScheduleCompliance()`를 통과시킨 뒤, 그 결과만으로 아래 행을 표시하는 것이다.

- `NOD 근무 불가`
- `3연속 야간(N) 근무 불가`
- `2연속 야간(N) 후 48시간 이상 휴식`
- `야간 근무 월 15회 이하`
- `Off 요청 준수`

서버 evaluator 개편, Supabase schema 변경, API response contract 변경은 이번 범위가 아니다.

## Scope Check

이 계획은 하나의 subsystem만 다룬다: Step5 비교 모달 정확도. Step5 본문 compliance 계산, schedule version API, solver, 서버 evaluator는 새 인터페이스를 만들지 않고 기존 기능을 호출만 한다.

Out of scope:

- 서버 evaluator 로직 개편
- Supabase schema 변경
- API response contract 변경
- 실제 배정 결과 차이 비교 UI
- Off 요청 캘린더 drag/edit 기능
- 모바일 전용 UX 재설계
- Organizations/employees/shifts CRUD
- 실제 AI solver 연동

## File Structure

- Modify `src/utils/scheduleComparisonSummary.ts`
  - Keep `buildScheduleComparisonSummary()` unchanged for existing callers.
  - Extend `buildScheduleComparisonDecisionModel()` args so comparison rows can be built from optional left/right `ScheduleComplianceResult`.
  - Add pure helpers for compliance summary lookup, Off reflection display, Off input diff rows, and calendar grouping.
  - Do not directly use `latestEvaluation.offRequestResults`, `proofSummary.minimumRestViolations`, `proofSummary.nnnViolations`, or `proofSummary.nodViolations` for the decision rows when compliance results are available.
- Modify `src/components/schedule/review/ComparisonWorkspace.vue`
  - Pass new props into `buildScheduleComparisonDecisionModel()`.
  - Render employee/date-level Off input diff rows.
  - Add a list/calendar view switch for `Off 요청 입력 차이`.
  - Preserve existing `focus-version` event and detail buttons.
- Modify `src/components/schedule/review/ScheduleCompareModal.vue`
  - Accept comparison-local loading/error props from Step5 if needed.
  - Keep loading/error states inside modal body.
  - Keep existing candidate shelf behavior.
- Modify `src/views/schedule/Step5Result.vue`
  - Add comparison data cache keyed by version id.
  - On modal open/retry, load compared reviews, assignments, and preferences for both selected versions.
  - Build left/right `ScheduleComplianceResult` from loaded version data and pass them to the modal.
  - Use existing `getScheduleVersionAssignments()`, `getScheduleVersionPreferences()`, `evaluateScheduleCompliance()`, `previousMonthFallbackAssignments`, `grid.employees.value`, and `organizationStore.shifts`.
- Modify `tests/unit/schedule-comparison-summary.spec.ts`
  - Add pure utility coverage for compliance-first decision rows and Off input diff.
- Modify `tests/unit/comparison-workspace.spec.ts`
  - Add component coverage for list/calendar views and displayed rows.
- Modify `tests/unit/schedule-compare-modal.spec.ts`
  - Add pass-through/loading/error coverage only if modal props change.
- Modify `tests/unit/step5-result.spec.ts`
  - Add data-loading, compliance-building, retry, and failure coverage.

## Data Contracts

Use existing types where possible:

```ts
import type { AssignmentMap, CommentMap, ConstraintMap } from '@/types/schedule';
import type { ScheduleComplianceResult } from '@/types/scheduleCompliance';
```

Add comparison-only types in `src/utils/scheduleComparisonSummary.ts` unless reuse outside the utility becomes necessary:

```ts
export type ScheduleComparisonRequirementStatus =
  | 'passed'
  | 'failed'
  | 'check_required'
  | 'unknown';

export type ScheduleComparisonOffDiffType = 'left_only' | 'right_only' | 'note_changed';

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
```

Decision model should expose enough data for both views:

```ts
export interface ScheduleComparisonDecisionModel {
  summaryBullets: string[];
  offInputRows: ScheduleComparisonTextRow[]; // keep for existing summary rows if still rendered
  offInputDiffRows: ScheduleComparisonOffInputDiffRow[];
  offInputDiffEmptyText: string;
  requirementRows: ScheduleComparisonRequirementRow[];
}
```

## Display Rules

Requirement rows:

- `passed` -> `통과`
- `failed` -> `위반 N건`
- `check_required` -> `확인 필요`
- missing compliance data -> `검토 정보 없음`
- `Off 요청 없음` -> `요청 없음`
- Off requests present -> `45건 중 45건 반영 (100%)`

Off input diff rows:

- left has `O`, right does not -> `왼쪽만 Off`
- right has `O`, left does not -> `오른쪽만 Off`
- both have `O` but note differs -> `메모 변경`
- no rows -> `두 안의 Off 요청 입력은 같습니다.`

Employee names come from Step5 grid employees. If the employee id is missing from the map, show the raw employee id.

## Task 1: Add Compliance-First Decision Model Tests

**Files:**

- Modify: `tests/unit/schedule-comparison-summary.spec.ts`
- Modify later: `src/utils/scheduleComparisonSummary.ts`

- [ ] **Step 1: Add failing imports and factories**

Update the test import to include the new types only after the implementation exports them:

```ts
import {
  buildScheduleComparisonDecisionModel,
  type ScheduleComparisonOffInputSnapshot,
} from '@/utils/scheduleComparisonSummary';
import type { ScheduleComplianceResult } from '@/types/scheduleCompliance';
```

Add compact factories near existing version/review factories:

```ts
function createComplianceResult(
  overrides: Partial<ScheduleComplianceResult> = {}
): ScheduleComplianceResult {
  return {
    mandatoryPassed: true,
    canFinalizeLocally: true,
    mandatoryViolationCount: 0,
    checkRequiredCount: 0,
    summaries: [
      {
        code: 'nod_pattern',
        label: 'NOD 금지',
        status: 'passed',
        violationCount: 0,
        message: '통과',
      },
      {
        code: 'triple_night',
        label: '3연속 야간 금지',
        status: 'passed',
        violationCount: 0,
        message: '통과',
      },
      {
        code: 'rest_after_two_nights',
        label: '2연속 야간 후 48시간 휴식',
        status: 'passed',
        violationCount: 0,
        message: '통과',
      },
      {
        code: 'monthly_night_limit',
        label: '월 야간 15회 이하',
        status: 'passed',
        violationCount: 0,
        message: '통과',
      },
    ],
    violations: [],
    offRequests: {
      totalRequests: 45,
      fulfilledRequests: 45,
      unfulfilledRequests: 0,
      reflectionRate: 100,
    },
    ...overrides,
  };
}

function createOffInput(
  constraints: ScheduleComparisonOffInputSnapshot['constraints'],
  notes: ScheduleComparisonOffInputSnapshot['notes'] = {}
): ScheduleComparisonOffInputSnapshot {
  return { constraints, notes };
}
```

- [ ] **Step 2: Add failing test for compliance result priority**

```ts
it('uses compliance result instead of latest evaluation for mandatory and Off rows', () => {
  const leftVersion = createVersionSummary({ id: 'left-version' });
  const rightVersion = createVersionSummary({ id: 'right-version' });

  const model = buildScheduleComparisonDecisionModel({
    leftVersion,
    rightVersion,
    leftReview: createReviewWithEvaluation(leftVersion, {
      proofSummary: {
        weeklyHoursViolations: 0,
        nnnViolations: 0,
        nodViolations: 0,
        minimumRestViolations: 0,
        staffingShortfalls: 0,
      },
      offRequestResults: [],
    }),
    rightReview: createReviewWithEvaluation(rightVersion, {
      proofSummary: {
        weeklyHoursViolations: 0,
        nnnViolations: 0,
        nodViolations: 0,
        minimumRestViolations: 0,
        staffingShortfalls: 0,
      },
      offRequestResults: [],
    }),
    leftComplianceResult: createComplianceResult({
      summaries: [
        {
          code: 'nod_pattern',
          label: 'NOD 금지',
          status: 'passed',
          violationCount: 0,
          message: '통과',
        },
        {
          code: 'triple_night',
          label: '3연속 야간 금지',
          status: 'passed',
          violationCount: 0,
          message: '통과',
        },
        {
          code: 'rest_after_two_nights',
          label: '2연속 야간 후 48시간 휴식',
          status: 'failed',
          violationCount: 10,
          message: '위반 10건',
        },
        {
          code: 'monthly_night_limit',
          label: '월 야간 15회 이하',
          status: 'passed',
          violationCount: 0,
          message: '통과',
        },
      ],
      offRequests: {
        totalRequests: 45,
        fulfilledRequests: 45,
        unfulfilledRequests: 0,
        reflectionRate: 100,
      },
    }),
    rightComplianceResult: createComplianceResult(),
  });

  expect(model.requirementRows).toContainEqual(
    expect.objectContaining({
      label: '2연속 야간(N) 후 48시간 이상 휴식',
      leftStatus: 'failed',
      leftText: '위반 10건',
      rightStatus: 'passed',
      rightText: '통과',
    })
  );
  expect(model.requirementRows).toContainEqual(
    expect.objectContaining({
      label: 'Off 요청 준수',
      leftText: '45건 중 45건 반영 (100%)',
    })
  );
});
```

Run:

```bash
pnpm vitest run tests/unit/schedule-comparison-summary.spec.ts
```

Expected: FAIL because `buildScheduleComparisonDecisionModel()` does not yet accept or use compliance args.

- [ ] **Step 3: Add failing test for check_required display**

Create one compliance summary with `status: 'check_required'` and assert the matching row has `leftStatus: 'check_required'` and `leftText: '확인 필요'`.

Run:

```bash
pnpm vitest run tests/unit/schedule-comparison-summary.spec.ts
```

Expected: FAIL until status mapping is implemented.

## Task 2: Add Off Input Diff Utility Tests

**Files:**

- Modify: `tests/unit/schedule-comparison-summary.spec.ts`
- Modify later: `src/utils/scheduleComparisonSummary.ts`

- [ ] **Step 1: Add failing test for employee/date diff rows**

```ts
it('builds employee-date Off input diff rows', () => {
  const leftVersion = createVersionSummary({ id: 'left-version' });
  const rightVersion = createVersionSummary({ id: 'right-version' });

  const model = buildScheduleComparisonDecisionModel({
    leftVersion,
    rightVersion,
    leftReview: null,
    rightReview: null,
    leftComplianceResult: createComplianceResult(),
    rightComplianceResult: createComplianceResult(),
    employees: [
      { id: 'employee-1', name: '김간호' },
      { id: 'employee-2', name: '박간호' },
      { id: 'employee-3', name: '이간호' },
    ],
    leftOffInput: createOffInput(
      {
        'employee-1': { '2026-05-05': 'O' },
        'employee-3': { '2026-05-07': 'O' },
      },
      {
        'employee-3': { '2026-05-07': '오전 병원' },
      }
    ),
    rightOffInput: createOffInput(
      {
        'employee-2': { '2026-05-06': 'O' },
        'employee-3': { '2026-05-07': 'O' },
      },
      {
        'employee-3': { '2026-05-07': '가족 일정' },
      }
    ),
  });

  expect(model.offInputDiffRows).toEqual([
    expect.objectContaining({
      employeeName: '김간호',
      date: '2026-05-05',
      leftText: 'Off',
      rightText: '-',
      changeTypeLabel: '왼쪽만 Off',
    }),
    expect.objectContaining({
      employeeName: '박간호',
      date: '2026-05-06',
      leftText: '-',
      rightText: 'Off',
      changeTypeLabel: '오른쪽만 Off',
    }),
    expect.objectContaining({
      employeeName: '이간호',
      date: '2026-05-07',
      leftText: 'Off · 오전 병원',
      rightText: 'Off · 가족 일정',
      changeTypeLabel: '메모 변경',
    }),
  ]);
});
```

Run:

```bash
pnpm vitest run tests/unit/schedule-comparison-summary.spec.ts
```

Expected: FAIL until diff rows are implemented.

- [ ] **Step 2: Add failing test for empty diff text**

Pass identical `leftOffInput` and `rightOffInput`, then assert:

```ts
expect(model.offInputDiffRows).toEqual([]);
expect(model.offInputDiffEmptyText).toBe('두 안의 Off 요청 입력은 같습니다.');
```

Run:

```bash
pnpm vitest run tests/unit/schedule-comparison-summary.spec.ts
```

Expected: FAIL until empty text is implemented.

## Task 3: Implement Decision Model Changes

**Files:**

- Modify: `src/utils/scheduleComparisonSummary.ts`
- Test: `tests/unit/schedule-comparison-summary.spec.ts`

- [ ] **Step 1: Add comparison-only types**

Add the types from the Data Contracts section. Keep them in this utility unless another module needs ownership.

- [ ] **Step 2: Add compliance summary helpers**

Implement helpers with deterministic fallback:

```ts
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
  if (!summary) return '검토 정보 없음';
  if (summary.status === 'passed') return '통과';
  if (summary.status === 'check_required') return '확인 필요';
  return `위반 ${summary.violationCount}건`;
}
```

If the existing status union does not include `check_required`, extend it instead of mapping it to `unknown`.

- [ ] **Step 3: Replace decision rows with compliance-first rows**

For each rule code, use `leftComplianceResult` and `rightComplianceResult`.

Keep a defensive fallback to `unknown` when compliance results are missing. Do not fall back to stale server evaluator values for these rows, because that would recreate the mismatch this plan is fixing.

- [ ] **Step 4: Replace Off request row with compliance Off summary**

Use:

```ts
function buildComplianceOffDisplay(
  compliance: ScheduleComplianceResult | null | undefined
): OffReflectionDisplay {
  const offRequests = compliance?.offRequests;
  if (!offRequests)
    return { status: 'unknown', text: '검토 정보 없음', fulfilled: null, total: null, rate: null };
  if (offRequests.totalRequests === 0)
    return { status: 'unknown', text: '요청 없음', fulfilled: 0, total: 0, rate: null };

  const rate =
    offRequests.reflectionRate == null
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
```

- [ ] **Step 5: Implement Off input diff rows**

Rules:

- Compare only cells where either side has `O`.
- Compare notes only when both sides have `O`.
- Sort by date ascending, then employee display order, then employee name/id.
- Trim notes before comparing.
- Format empty side as `-`.
- Format requested side as `Off` or `Off · {note}`.

- [ ] **Step 6: Run the unit test**

Run:

```bash
pnpm vitest run tests/unit/schedule-comparison-summary.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/utils/scheduleComparisonSummary.ts tests/unit/schedule-comparison-summary.spec.ts
git commit -m "fix: use compliance snapshots for comparison model"
```

## Task 4: Render Off Diff List and Calendar

**Files:**

- Modify: `src/components/schedule/review/ComparisonWorkspace.vue`
- Test: `tests/unit/comparison-workspace.spec.ts`

- [ ] **Step 1: Add failing component tests**

Add tests for:

- `Off 요청 입력 차이` renders employee/date rows.
- Empty diff renders `두 안의 Off 요청 입력은 같습니다.`
- Switching to `캘린더 보기` renders diff badges under the matching dates.
- Requirement rows display `통과`, `위반 N건`, `확인 필요`, and `요청 없음`.

Run:

```bash
pnpm vitest run tests/unit/comparison-workspace.spec.ts
```

Expected: FAIL until props/rendering are implemented.

- [ ] **Step 2: Add props**

Extend props:

```ts
leftComplianceResult: ScheduleComplianceResult | null;
rightComplianceResult: ScheduleComplianceResult | null;
leftOffInput: ScheduleComparisonOffInputSnapshot | null;
rightOffInput: ScheduleComparisonOffInputSnapshot | null;
employees: Array<{ id: string; name: string }>;
month: string;
```

Pass them into `buildScheduleComparisonDecisionModel()`.

- [ ] **Step 3: Add view switch**

Use a simple local ref:

```ts
const offDiffView = ref<'list' | 'calendar'>('list');
```

Use Naive UI buttons or existing button styling. User-facing labels:

- `목록 보기`
- `캘린더 보기`

- [ ] **Step 4: Render list view**

Columns:

- 직원
- 날짜
- 왼쪽 요청
- 오른쪽 요청
- 차이

Keep mobile stacking readable. Do not add nested cards.

- [ ] **Step 5: Render calendar view**

Build dates from `month` in the component or from a pure helper in the utility. Use Tailwind grid, not a new calendar library.

Calendar cell content:

- day number
- one badge per diff row for that date
- badge text: `{employeeName} · {changeTypeLabel}`

If many rows exist for one date, show the first 3 and a compact `외 N건` line.

- [ ] **Step 6: Run component test**

Run:

```bash
pnpm vitest run tests/unit/comparison-workspace.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/schedule/review/ComparisonWorkspace.vue tests/unit/comparison-workspace.spec.ts
git commit -m "feat: show off request diffs in comparison workspace"
```

## Task 5: Load Version Assignments and Preferences in Step5

**Files:**

- Modify: `src/views/schedule/Step5Result.vue`
- Modify if prop pass-through changes: `src/components/schedule/review/ScheduleCompareModal.vue`
- Test: `tests/unit/step5-result.spec.ts`
- Test if modal props change: `tests/unit/schedule-compare-modal.spec.ts`

- [ ] **Step 1: Add failing Step5 tests**

Cover:

- Opening compare modal loads `getScheduleVersionAssignments(versionId)` and `getScheduleVersionPreferences(versionId)` for both selected versions.
- Loaded assignments are split/merged with `previousMonthFallbackAssignments` before `evaluateScheduleCompliance()`.
- Loaded preferences are filtered to current month Off constraints before compliance evaluation.
- `ComparisonWorkspace` receives left/right compliance results and Off input snapshots.
- If either side fails to load assignments/preferences, modal shows `비교 데이터를 불러오지 못했습니다.`
- Retry reloads compared reviews, assignments, and preferences.

Run:

```bash
pnpm vitest run tests/unit/step5-result.spec.ts
```

Expected: FAIL until Step5 loading is implemented.

- [ ] **Step 2: Add comparison data cache**

Near existing compare modal refs, add:

```ts
interface ComparisonVersionData {
  assignments: AssignmentMap;
  offInput: ScheduleComparisonOffInputSnapshot;
  complianceResult: ScheduleComplianceResult;
}

const comparisonVersionDataById = ref<Record<string, ComparisonVersionData>>({});
```

- [ ] **Step 3: Add loader for one version**

Implementation rules:

- Call assignments/preferences in parallel for one version.
- Use existing `splitAssignmentsByMonth()` to isolate current/previous assignments.
- Use existing `mergeAssignmentMapsWithFallback()` with `previousMonthFallbackAssignments.value`.
- Use current-month-only Off requests from preferences.
- Evaluate with:

```ts
evaluateScheduleCompliance({
  month: scheduleStore.basicInfo?.month ?? '',
  employees: grid.employees.value,
  assignments: mergeComplianceAssignments(mergedPreviousAssignments, currentAssignments),
  offRequests: currentMonthOffConstraints,
  shifts: organizationStore.shifts,
});
```

- Preserve notes in `offInput` for diff display.

- [ ] **Step 4: Add loader for selected comparison versions**

Load `leftComparedVersion.value?.id` and `rightComparedVersion.value?.id`.

If fewer than two versions are selected, clear missing cache entries and do not fail the modal.

If either selected side fails, set:

```ts
compareModalErrorMessage.value = '비교 데이터를 불러오지 못했습니다.';
```

Also `console.warn()` the original error for debugging.

- [ ] **Step 5: Include comparison data in modal open/retry**

`handleOpenCompareModal()` should await both:

```ts
await hub.hydrateComparedReviews();
await hydrateComparisonVersionData();
```

The modal loading state should cover both operations.

Retry should call the same method so compared reviews, assignments, and preferences all reload.

- [ ] **Step 6: Pass data into modal/workspace**

Either pass through `ScheduleCompareModal.vue` props or compute the decision model in Step5. Prefer prop pass-through so `ComparisonWorkspace.vue` remains the view-model consumer.

Props to pass:

- `left-compliance-result`
- `right-compliance-result`
- `left-off-input`
- `right-off-input`
- `employees`
- `month`

- [ ] **Step 7: Run Step5 and modal tests**

Run:

```bash
pnpm vitest run tests/unit/step5-result.spec.ts tests/unit/schedule-compare-modal.spec.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/views/schedule/Step5Result.vue src/components/schedule/review/ScheduleCompareModal.vue tests/unit/step5-result.spec.ts tests/unit/schedule-compare-modal.spec.ts
git commit -m "fix: hydrate comparison compliance data in step5"
```

## Task 6: Integration Verification

**Files:**

- Inspect only unless tests reveal issues:
  - `src/components/schedule/review/ScheduleCompareModal.vue`
  - `src/components/schedule/review/VersionCandidateShelf.vue`
  - `src/components/schedule/review/VersionCompareSurface.vue`

- [ ] **Step 1: Run focused unit suite**

```bash
pnpm vitest run tests/unit/schedule-comparison-summary.spec.ts tests/unit/comparison-workspace.spec.ts tests/unit/schedule-compare-modal.spec.ts tests/unit/step5-result.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run lint**

```bash
pnpm lint:check
```

Expected: PASS.

- [ ] **Step 3: Optional browser QA**

If a local browser check is available, open Step5 with at least two comparison versions and verify:

- Modal loading covers review + assignments + preferences.
- `Off 요청 준수` matches Step5 본문 `위반 상세`.
- `2연속 야간(N) 후 48시간 이상 휴식` matches Step5 본문 `위반 상세`.
- Off input list shows employee/date rows.
- Calendar view shows date badges and does not overflow incoherently on desktop width.
- Retry works after mocked/network failure.

- [ ] **Step 4: Final commit if verification required additional fixes**

```bash
git add src tests
git commit -m "test: verify step5 comparison accuracy"
```

## Implementation Notes

- Do not mutate nested props in Vue components.
- Do not access `window.$message` directly in templates.
- Use existing `showError()`/message utility patterns from Step5 for user-facing errors.
- Keep user-facing copy Korean.
- Keep comparison modal errors local to the modal; Step5 main result review should remain visible.
- Prefer pure utility logic in `scheduleComparisonSummary.ts`; Step5 should load/assemble data, not format UI rows.
- If `previousMonthFallbackError.value` exists, mark compliance as `check_required` consistently with existing `complianceResult` behavior, or reuse the same wrapper logic so comparison and Step5 본문 stay aligned.

## Final Checks

Run before handing off:

```bash
pnpm vitest run tests/unit/schedule-comparison-summary.spec.ts tests/unit/comparison-workspace.spec.ts tests/unit/schedule-compare-modal.spec.ts tests/unit/step5-result.spec.ts
pnpm lint:check
```

Expected:

- All focused tests pass.
- ESLint passes.
- Final response reports lint status explicitly.

## Execution Handoff

Plan complete at `docs/plans/2026-05-03-step5-comparison-accuracy-improvement.ko.md`.

Recommended execution option: `superpowers:subagent-driven-development`, one fresh worker per task with review between tasks. Inline execution with `superpowers:executing-plans` is also acceptable if the implementer wants a single-session checkpoint flow.
