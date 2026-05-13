# Step5 Live Compliance Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every Step5 Ministry guideline count and blocker update from the currently visible schedule assignments, including solver results, intermediate results, manual edits, save, reset, and comparison views.

**Architecture:** Keep the existing local compliance evaluator (`evaluateScheduleCompliance`) and Step5 review flow. Change Step5 to build one canonical active assignment snapshot from the visible grid's current-month assignments plus the full loaded previous-month rolling history, then feed that snapshot to all Step5 compliance surfaces. Keep backend evaluation data only for backend-only review warnings such as weekly hours and staffing shortfalls.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Pinia stores, Naive UI, Vitest, existing schedule API/composable layer.

---

## Context

The user-reported bug is that `src/views/schedule/Step5Result.vue` can show stale text such as "보건복지부 가이드라인 위반 2건" even when the visible generated schedule no longer has those violations. The expected behavior is:

- The guideline result follows the schedule currently visible on Step5.
- Solver completion, solver intermediate results, manual edits, save, reset, and version focus changes all refresh the guideline result.
- All Step5 guideline surfaces stay consistent: summary card, guideline modal, employee detail, finalize blocker, and comparison modal.

Existing implementation already computes local compliance in Step5, but it currently relies on `currentScheduleAssignments` as the current-month source. The fix should make the visible grid assignment state the canonical source for current-month compliance while preserving full previous-month history for cross-month rules.

## File Responsibilities

- Modify `src/views/schedule/Step5Result.vue`
  - Own the active Step5 compliance input snapshot.
  - Keep all Step5 compliance surfaces wired to the same `complianceResult`.
  - Keep comparison modal compliance consistent for the currently focused version.
- Modify `tests/unit/step5-result.spec.ts`
  - Add regression coverage for visible-grid compliance updates across generation, manual edit, modal, employee detail, finalize blocker, and comparison modal.
  - Preserve existing previous-month rolling history behavior.

No public API, database schema, route, or type contract changes are required.

## Current Code Anchors

Use these existing symbols instead of introducing new ownership boundaries:

- `src/views/schedule/Step5Result.vue`
  - Template surfaces: `step5-summary-card-guideline`, `step5-summary-card-guideline-action`, `finalize-block-reason`, `employee-guideline-status`, and the `ScheduleCompareModal` compliance props.
  - Current assignment state: `currentScheduleAssignments`, `grid.assignments.value`, `previousMonthAssignments`, `rebuildDisplayAssignments()`, and `handleAssignmentUpdate()`.
  - Compliance path: `mergeComplianceAssignments()`, `hasCurrentMonthAssignments`, `liveComplianceResult`, `complianceResult`, and `complianceFinalizeBlockReason`.
  - Solver refresh path: `loadCurrentAssignments()`, `applyIntermediateAssignments()`, the `solver.status` watcher, and the `solver.intermediateResults` watcher.
  - Comparison path: `leftComparisonVersionData`, `rightComparisonVersionData`, `loadComparisonVersionData()`, and `hydrateComparisonVersionData()`.
  - Backend attention copy: `reviewAttentionSummary`.
- `tests/unit/step5-result.spec.ts`
  - Reuse `mockSingleFinalizeReview()`, `createWrapper()`, `emitButtonComponentClick()`, `gridMock`, `solverMock`, `getScheduleVersionAssignmentsMock`, and `getScheduleVersionPreferencesMock`.
  - The `ScheduleGrid` stub emits `update:assignment` with `emp-1`, `2025-12-01`, and shift `D`; use it when testing manual-edit behavior.
  - Add any new test-only helpers near `mockSingleFinalizeReview()` so compliance regressions stay readable.

## Test Helper Guidance

If the new tests need repeated visible-grid updates, add a tiny helper rather than duplicating ref mutation:

```ts
function setVisibleAssignments(assignments: Record<string, Record<string, string>>) {
  gridMock.assignments.value = assignments;
}
```

If checking the summary repeatedly, prefer a helper that keeps selectors stable:

```ts
function expectGuidelineSummary(wrapper: ReturnType<typeof createWrapper>, text: string) {
  expect(wrapper.get('[data-test="step5-summary-card-guideline"]').text()).toContain(text);
}
```

Keep helper names boring and local to `tests/unit/step5-result.spec.ts`; do not create shared test utilities for this narrow regression.

## Task 1: Add Regression Tests for Visible Assignment Compliance

**Files:**

- Modify: `tests/unit/step5-result.spec.ts`

- [ ] **Step 1: Add local test helpers if repeated assertions become noisy**

Add `setVisibleAssignments()` and optionally `expectGuidelineSummary()` near `mockSingleFinalizeReview()`.

Expected: no production code changes, no behavior changes.

- [ ] **Step 2: Add a test proving visible grid assignments drive the summary, modal, employee view, and finalize blocker**

Create a test near the existing compliance tests. Use `mockSingleFinalizeReview()` with a stale violating backend/API assignment first, then mutate `gridMock.assignments.value` to a non-violating visible assignment.

Suggested test name:

```ts
it('uses visible grid assignments for guideline summary, detail, employee view, and finalize blocker', async () => {
  // ...
});
```

Use this shape:

```ts
mockSingleFinalizeReview({
  assignments: {
    'emp-1': {
      '2025-12-01': 'N',
      '2025-12-02': 'O',
      '2025-12-03': 'D',
    },
  },
  primaryAction: {
    disabledReason: '백엔드 사유',
  },
});

const wrapper = createWrapper();
await flushPromises();

expectGuidelineSummary(wrapper, '위반 1건');
await wrapper.get('[data-test="step5-summary-card-guideline-action"]').trigger('click');
await flushPromises();
expect(document.body.textContent).toContain('N-O-D');

setVisibleAssignments({
  'emp-1': {
    '2025-12-01': 'D',
    '2025-12-02': 'D',
    '2025-12-03': 'D',
  },
});
await flushPromises();
```

Expected assertions:

- `step5-summary-card-guideline` changes from `위반 1건` to `충족`.
- Clicking `step5-summary-card-guideline-action` before the visible update opens stale violation detail, but after the update the action is not rendered.
- Switching to employee view shows `employee-guideline-status` as `보건복지부 가이드라인 충족`.
- `finalize-block-reason` no longer shows the guideline blocker and falls back to unsaved/backend state when appropriate.

- [ ] **Step 3: Add a test proving solver result refresh does not leave stale compliance**

Use an initial assignment that violates N-O-D, then make `getScheduleVersionAssignmentsMock` return a non-violating assignment after solver completion status is applied.

Implementation detail:

- Mount with stale `mockSingleFinalizeReview()` assignments.
- After the first `flushPromises()`, call `getScheduleVersionAssignmentsMock.mockResolvedValueOnce(...)` with corrected current-month assignments.
- Set `solverMock.status.value = 'complete'`.
- `await flushPromises()` twice if the status watcher hydrates and then reloads assignments.

Expected assertions:

- Before the simulated refresh, the summary shows `위반 1건`.
- After setting `solverMock.status.value = 'complete'` and flushing promises, Step5 reloads assignments and the summary shows `충족`.
- `finalize-block-reason` no longer contains the old guideline count.

- [ ] **Step 4: Add a test proving intermediate solver assignments update compliance**

Set `solverMock.status.value = 'running'`, then assign `solverMock.intermediateResults.value` to a new visible assignment snapshot.

Implementation detail:

- Use real shift codes (`D`, `N`, `O`) unless the test is intentionally covering `mapIntermediateShiftIdsToCodes()`.
- Assert both `gridMock.assignments.value` and the rendered summary after the watcher applies intermediate data.
- Keep this test focused on visible compliance; do not also assert polling interval behavior here.

Expected assertions:

- The grid/visible assignment state receives the intermediate assignment.
- The guideline summary updates from stale violation to the intermediate-result count.
- If the intermediate result resolves all violations, the summary shows `충족`.

- [ ] **Step 5: Add a comparison modal regression**

Extend the existing `loads compared version assignments and preferences for compliance comparison` test or add a nearby test:

- Focus `version-3`.
- Open the comparison modal.
- Make the focused version's DB-loaded comparison cache stale, but set the visible grid assignment for `version-3` to the corrected current schedule.

Suggested test name:

```ts
it('uses live focused-version compliance in the comparison modal', async () => {
  // ...
});
```

Implementation detail:

- Keep `version-2` loaded through `loadComparisonVersionData()` so the test proves only the focused side is overridden.
- Keep the existing Off request assertions (`V3만 Off`, `V2만 Off`, no `2026-01-01`) so input comparison remains version-cache based.
- Make the stale focused comparison payload include a cross-month N-O-D pattern, then set `gridMock.assignments.value` to a passing current-month schedule before opening the modal.

Expected assertions:

- The focused side's `comparison-requirements` rows use the current visible `complianceResult`; for a corrected focused schedule, rows such as `NOD 근무 불가` should show `통과` on the focused side instead of the stale `위반 1건`.
- The other compared version still uses `loadComparisonVersionData()` from `getScheduleVersionAssignments()`.
- Off request comparison behavior remains unchanged.

- [ ] **Step 6: Run the focused tests and confirm failure**

Run:

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts -t "compliance"
```

Expected: at least one new test fails before implementation because Step5 still uses stale assignment state for one or more surfaces.

- [ ] **Step 7: Checkpoint failing regression tests**

```bash
git diff -- tests/unit/step5-result.spec.ts
```

Expected: diff contains only the test/helper changes. Do not commit failing tests in this repository; `AGENTS.md` requires `pnpm lint:check` and `pnpm run build` before commits.

## Task 2: Make Visible Assignments the Canonical Current-Month Compliance Source

**Files:**

- Modify: `src/views/schedule/Step5Result.vue`

- [ ] **Step 1: Add current-month extraction helper**

Add a pure helper near `mergeComplianceAssignments()`. Keep it file-local; no export is needed.

```ts
function extractCurrentMonthAssignments(
  assignments: AssignmentMap,
  month: string | null | undefined
): AssignmentMap {
  if (!month) return {};

  const currentAssignments: AssignmentMap = {};

  for (const [employeeId, dateMap] of Object.entries(assignments || {})) {
    for (const [date, shiftCode] of Object.entries(dateMap || {})) {
      if (!shiftCode || !date.startsWith(month)) continue;
      if (!currentAssignments[employeeId]) {
        currentAssignments[employeeId] = {};
      }
      currentAssignments[employeeId]![date] = shiftCode;
    }
  }

  return currentAssignments;
}
```

Expected: helper ignores previous-month dates shown in `grid.assignments.value`, ignores empty cells, and copies only dates whose string starts with `scheduleStore.basicInfo.month`.

- [ ] **Step 2: Add canonical computed inputs**

Add these computed values near the existing compliance computed values:

```ts
const visibleCurrentMonthAssignments = computed<AssignmentMap>(() => {
  return extractCurrentMonthAssignments(grid.assignments.value, scheduleStore.basicInfo?.month);
});

const activeComplianceAssignments = computed<AssignmentMap>(() => {
  return mergeComplianceAssignments(
    previousMonthAssignments.value,
    visibleCurrentMonthAssignments.value
  );
});
```

Expected: `previousMonthAssignments.value` remains the only previous-month source for compliance, while `grid.assignments.value` becomes the current-month source.

- [ ] **Step 3: Update `hasCurrentMonthAssignments`**

Change it to inspect `visibleCurrentMonthAssignments.value` instead of `currentScheduleAssignments.value`.

This ensures Step5 visibility and button state follow what the user is actually seeing.

Minimal shape:

```ts
const hasCurrentMonthAssignments = computed(() => {
  return Object.values(visibleCurrentMonthAssignments.value).some((dateMap) => {
    return Object.values(dateMap || {}).some((shiftCode) => Boolean(shiftCode));
  });
});
```

- [ ] **Step 4: Update `liveComplianceResult`**

Change:

```ts
assignments: mergeComplianceAssignments(
  previousMonthAssignments.value,
  currentScheduleAssignments.value,
),
```

to:

```ts
assignments: activeComplianceAssignments.value,
```

Expected: all existing consumers of `complianceResult` pick up the new source without adding separate per-surface logic.

- [ ] **Step 5: Preserve previous-month rolling history behavior**

Do not use slider-visible previous-month grid rows for compliance. The previous-month part must remain `previousMonthAssignments.value`, which already contains DB/fallback rolling history and is intentionally independent of the visible previous-month day slider.

Regression target: `uses previousMonthAssignments instead of slider-visible assignments for validation` should still pass.

- [ ] **Step 6: Run focused compliance tests**

Run:

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts -t "compliance"
```

Expected: the new visible-assignment compliance tests pass.

- [ ] **Step 7: Check production diff**

```bash
git diff -- src/views/schedule/Step5Result.vue
```

Expected: diff is limited to the helper and compliance source rewiring. It should not alter API calls, save/reset mutation behavior, route handling, or the solver mapper.

## Task 3: Keep Comparison Modal Consistent for the Focused Version

**Files:**

- Modify: `src/views/schedule/Step5Result.vue`
- Test: `tests/unit/step5-result.spec.ts`

- [ ] **Step 1: Confirm the comparison regression fails before implementation**

Run only the new comparison test or the comparison-focused group:

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts -t "comparison"
```

Expected: the focused-version live compliance assertion fails because the modal still reads `leftComparisonVersionData?.complianceResult` or `rightComparisonVersionData?.complianceResult`.

- [ ] **Step 2: Add a focused-version comparison data override**

Keep `loadComparisonVersionData()` for non-focused versions. For the currently focused `previewVersionId`, pass the live local `complianceResult` into the modal instead of stale cached comparison data.

One acceptable implementation is to add this helper near `leftComparisonVersionData` and `rightComparisonVersionData`:

```ts
function getComparisonComplianceResult(
  versionId: string | null | undefined
): ScheduleComplianceResult | null {
  if (!versionId) return null;
  if (versionId === previewVersionId.value) {
    return complianceResult.value;
  }
  return comparisonVersionDataById.value[versionId]?.complianceResult ?? null;
}
```

Then use it for modal props:

```vue
:left-compliance-result="getComparisonComplianceResult(leftComparedVersion?.id)"
:right-compliance-result="getComparisonComplianceResult(rightComparedVersion?.id)"
```

If Vue template unwrapping causes type friction, replace the function with `leftComparisonComplianceResult` and `rightComparisonComplianceResult` computed values.

- [ ] **Step 3: Keep off-input data source unchanged**

Do not change `left-off-input` or `right-off-input`. The current requirement only concerns guideline compliance count consistency; comparison Off request input snapshots are still version-specific loaded data.

- [ ] **Step 4: Run comparison tests**

Run:

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts -t "comparison"
```

Expected: comparison tests pass, including the new focused-version live compliance regression.

- [ ] **Step 5: Check comparison diff**

```bash
git diff -- src/views/schedule/Step5Result.vue tests/unit/step5-result.spec.ts
```

Expected: focused compliance result is live only for `previewVersionId`; all other version data still comes from `comparisonVersionDataById`.

## Task 4: Audit Backend Review Attention Copy

**Files:**

- Modify only if needed: `src/views/schedule/Step5Result.vue`
- Test: `tests/unit/step5-result.spec.ts`

- [ ] **Step 1: Update or add the review-attention regression first**

Use the existing review-blocked test that asserts `step5-review-attention-panel` text. Keep the weekly-hours and staffing assertions:

```ts
proofSummary: {
  weeklyHoursViolations: 1,
  nnnViolations: 1,
  nodViolations: 1,
  minimumRestViolations: 1,
  staffingShortfalls: 1,
},

expect(reviewAttention.text()).toContain('주간 시간 위반 1건');
expect(reviewAttention.text()).toContain('인력 부족 1건');
```

Add negative assertions for guideline-overlapping backend counts:

```ts
expect(reviewAttention.text()).not.toContain('야간 연속 위반');
expect(reviewAttention.text()).not.toContain('NOD 패턴');
expect(reviewAttention.text()).not.toContain('휴식 기준 위반');
```

- [ ] **Step 2: Run the review-attention regression and confirm failure if stale copy is currently rendered**

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts -t "review-blocked"
```

Expected: fail before implementation if the fixture has non-zero `nnnViolations`, `nodViolations`, or `minimumRestViolations` and the UI renders those stale backend counts.

- [ ] **Step 3: Inspect `reviewAttentionSummary`**

`reviewAttentionSummary` currently derives NOD/night/rest counts from `latestEvaluation.proofSummary`. These can overlap with the local guideline result and may become stale after visible schedule changes.

- [ ] **Step 4: Remove or replace overlapping stale counts**

Preferred behavior:

- Keep backend-only items in review attention: weekly hours and staffing shortfalls.
- Do not show NOD, consecutive-night, or minimum-rest counts from `latestEvaluation.proofSummary` after local compliance is available.
- Let the guideline summary card/modal/employee detail/finalize blocker be the single source for Ministry guideline counts.

Implementation option:

```ts
const parts = [
  summary.weeklyHoursViolations > 0 ? `주간 시간 위반 ${summary.weeklyHoursViolations}건` : null,
  summary.staffingShortfalls > 0 ? `인력 부족 ${summary.staffingShortfalls}건` : null,
].filter((part): part is string => Boolean(part));
```

- [ ] **Step 5: Run the review-attention test**

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts -t "review-blocked"
```

Expected: pass with weekly-hours and staffing copy still visible, and backend NOD/night/rest copy absent.

- [ ] **Step 6: Re-run the focused compliance tests**

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts -t "compliance"
```

Expected: pass. This guards against accidentally removing the local Ministry guideline source while cleaning backend attention copy.

## Task 5: Full Verification

**Files:**

- Verify all modified files.

- [ ] **Step 1: Run Step5 unit tests**

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run compliance-related unit tests**

```bash
pnpm test:unit -- tests/unit/schedule-compliance.spec.ts tests/unit/schedule-comparison-summary.spec.ts
```

Expected: PASS.

- [ ] **Step 3: Run required project checks**

```bash
pnpm lint:check
pnpm run build
```

Expected: both PASS.

- [ ] **Step 4: Manual QA in browser if a dev server is available**

Scenario:

- Open Step5 for a schedule version with known stale guideline count.
- Generate or load a corrected schedule.
- Confirm the summary card, guideline modal, employee detail, and finalize blocker all update together.
- Manually edit a cell to create and then resolve an N-O-D violation.
- Confirm every Step5 guideline surface changes immediately with the visible schedule.
- Open the comparison modal and confirm the currently focused version reflects the visible schedule while other versions use their loaded version data.

- [ ] **Step 5: Review the final diff**

```bash
git diff -- src/views/schedule/Step5Result.vue tests/unit/step5-result.spec.ts
```

Expected: the final diff contains only Step5 compliance synchronization, comparison modal compliance source selection, review attention copy cleanup, and related tests.

- [ ] **Step 6: Commit after verification passes**

```bash
git add src/views/schedule/Step5Result.vue tests/unit/step5-result.spec.ts
git commit -m "fix: sync Step5 compliance with visible assignments"
```

Expected: commit is created only after `pnpm lint:check` and `pnpm run build` pass.

## Acceptance Criteria

- Step5 never shows a stale Ministry guideline violation count after the visible schedule changes.
- Summary card, guideline detail modal, employee detail, finalize blocker, and comparison modal agree on the same guideline result for the focused version.
- Previous-month rolling history still participates in NOD/rest checks even when the previous-month slider hides those days.
- Backend review/evaluation data no longer overrides local guideline counts.
- No API, schema, or route contract changes are introduced.
- `pnpm lint:check` and `pnpm run build` pass after implementation.
