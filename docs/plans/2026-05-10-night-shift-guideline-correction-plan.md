# Step5 Night Guideline Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align Step5 schedule compliance logic with the corrected MOHW interpretation: allow `N,N,N`, block `N,N,N,N`, and measure 48-hour rest after the end of the consecutive night block.

**Architecture:** Keep the existing compliance API surface stable (`triple_night`, `rest_after_two_nights`) to avoid breaking Step5 wiring. Refactor only the internal evaluator logic and update rule labels/copy so UI, comparison summaries, tests, and docs all describe the same policy. Execute with strict TDD: update failing tests first, then minimal implementation, then label/documentation synchronization.

**Tech Stack:** Vue 3, TypeScript, Vite, Tailwind CSS, Vitest.

---

## Decision Lock (Deep-Interview Outcome)

- `N,N,N` is allowed.
- `N,N,N,N` is forbidden.
- 48-hour rest is measured from the **end of the last `N` in a consecutive night block**.

## Scope Check

This change is one subsystem (Step5 compliance policy correction) and can remain a single plan.

## File Structure

### Modify

- `src/utils/scheduleCompliance.ts`
  - Replace old 3-night violation logic with 4-night threshold logic.
  - Replace pair-based rest evaluation with consecutive-night-block-based rest evaluation.
  - Update rule labels/messages.
- `src/types/scheduleCompliance.ts`
  - Keep rule code union stable; add semantic comments for updated policy meaning.
- `src/components/schedule/review/ScheduleCompliancePanel.vue`
  - No layout changes; ensure rendered labels/messages stay policy-consistent.
- `src/utils/scheduleComparisonSummary.ts`
  - Update requirement row labels to corrected wording.
- `src/components/public/LandingProductPreview.vue`
  - Update guide preview description text (`3+` -> `4+`).
- `src/data/publicLandingContent.ts`
  - Keep overview detail wording consistent with corrected policy.
- `docs/plans/2026-05-02-step5-schedule-compliance-validation.md`
  - Add dated errata and replace policy wording/examples.

### Test Files

- `tests/unit/schedule-compliance.spec.ts`
- `tests/unit/schedule-compliance-panel.spec.ts`
- `tests/unit/schedule-comparison-summary.spec.ts`
- `tests/unit/step5-result.spec.ts` (text assertion alignment for updated rule labels)
- `tests/unit/public-landing.spec.ts` (text assertion alignment for updated guide copy)

### Out of Scope

- Backend enforcement/schema updates
- New policy configuration UI
- Step5 IA/layout redesign

---

### Task 1: Update Utility Tests to Correct Policy (Fail First)

**Files:**

- Modify: `tests/unit/schedule-compliance.spec.ts`
- Test: `tests/unit/schedule-compliance.spec.ts`

- [ ] **Step 1: Replace old 3-night violation expectation with 3-night pass + 4-night fail tests**

```ts
it('allows three consecutive nights without triple_night violation', () => {
  const result = evaluate({
    e1: {
      '2026-05-01': 'N',
      '2026-05-02': 'N',
      '2026-05-03': 'N',
      '2026-05-04': 'O',
      '2026-05-05': 'O',
      '2026-05-06': 'D',
    },
  });

  expect(result.violations.some((violation) => violation.ruleCode === 'triple_night')).toBe(false);
  expect(result.summaries.find((summary) => summary.code === 'triple_night')?.status).toBe(
    'passed'
  );
});

it('reports four consecutive nights as triple_night violation', () => {
  const result = evaluate({
    e1: {
      '2026-05-01': 'N',
      '2026-05-02': 'N',
      '2026-05-03': 'N',
      '2026-05-04': 'N',
    },
  });

  expect(result.violations).toContainEqual(
    expect.objectContaining({
      ruleCode: 'triple_night',
      dates: ['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04'],
    })
  );
  expect(result.summaries.find((summary) => summary.code === 'triple_night')?.status).toBe(
    'failed'
  );
});
```

- [ ] **Step 2: Replace old rest rule tests with “end of streak” anchor behavior**

```ts
it('blocks when first work after a three-night streak starts before 48 hours from last night end', () => {
  const result = evaluate({
    e1: {
      '2026-05-01': 'N',
      '2026-05-02': 'N',
      '2026-05-03': 'N',
      '2026-05-04': 'O',
      '2026-05-05': 'D',
    },
  });

  expect(result.violations).toContainEqual(
    expect.objectContaining({
      ruleCode: 'rest_after_two_nights',
      dates: ['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-05'],
    })
  );
});

it('passes when first work starts at least 48 hours after last night in streak', () => {
  const result = evaluate({
    e1: {
      '2026-05-01': 'N',
      '2026-05-02': 'N',
      '2026-05-03': 'N',
      '2026-05-04': 'O',
      '2026-05-05': 'O',
      '2026-05-06': 'O',
      '2026-05-07': 'D',
    },
  });

  expect(
    result.violations.some((violation) => violation.ruleCode === 'rest_after_two_nights')
  ).toBe(false);
  expect(result.summaries.find((summary) => summary.code === 'rest_after_two_nights')?.status).toBe(
    'passed'
  );
});
```

- [ ] **Step 3: Run test to confirm failure before implementation**

Run:

```bash
pnpm test:unit -- tests/unit/schedule-compliance.spec.ts
```

Expected: FAIL on updated consecutive-night/rest expectations.

- [ ] **Step 4: Commit failing-test setup**

```bash
git add tests/unit/schedule-compliance.spec.ts
git commit -m "test: update compliance policy tests for 3-night allowance"
```

---

### Task 2: Implement Utility Logic for 4-Night Limit and Streak-End Rest

**Files:**

- Modify: `src/utils/scheduleCompliance.ts`
- Modify: `src/types/scheduleCompliance.ts`
- Test: `tests/unit/schedule-compliance.spec.ts`

- [ ] **Step 1: Introduce constants and labels for corrected semantics**

```ts
const MAX_CONSECUTIVE_NIGHTS = 3;
const CONSECUTIVE_NIGHT_VIOLATION_THRESHOLD = MAX_CONSECUTIVE_NIGHTS + 1;
const MIN_REST_AFTER_CONSECUTIVE_NIGHTS_MS = 48 * 60 * 60 * 1000;

export const RULE_LABELS: Record<ScheduleComplianceRuleCode, string> = {
  nod_pattern: 'NOD 금지',
  triple_night: '4연속 야간 금지 (3연속 허용)',
  rest_after_two_nights: '연속 야간 후 48시간 휴식',
  monthly_night_limit: '월 야간 15회 이하',
};
```

- [ ] **Step 2: Replace old `evaluateTripleNight` with 4-night-threshold evaluation**

```ts
function evaluateConsecutiveNightLimit(
  timelines: EmployeeTimeline[]
): ScheduleComplianceViolation[] {
  const violations: ScheduleComplianceViolation[] = [];

  for (const timeline of timelines) {
    for (
      let index = 0;
      index <= timeline.entries.length - CONSECUTIVE_NIGHT_VIOLATION_THRESHOLD;
      index += 1
    ) {
      const window = timeline.entries.slice(index, index + CONSECUTIVE_NIGHT_VIOLATION_THRESHOLD);
      if (hasConsecutiveDates(window) && window.every((entry) => entry.shiftCode === 'N')) {
        const dates = window.map((entry) => entry.date);
        violations.push(
          createViolation(
            'triple_night',
            timeline.employeeId,
            timeline.employeeName,
            dates,
            `${timeline.employeeName}님에게 ${dates.join(', ')} 4연속 야간 근무가 배정되었습니다. 3연속까지는 허용됩니다.`
          )
        );
      }
    }
  }

  return violations;
}
```

- [ ] **Step 3: Replace old pair-based rest check with streak-end rest check**

```ts
function evaluateRestAfterTwoNights(
  timelines: EmployeeTimeline[],
  shiftTimes: Map<KnownShiftCode, ShiftTime>
): ScheduleComplianceViolation[] {
  const violations: ScheduleComplianceViolation[] = [];

  for (const timeline of timelines) {
    for (let index = 0; index < timeline.entries.length; index += 1) {
      const streak = collectConsecutiveNightStreak(timeline.entries, index);
      if (!streak) {
        continue;
      }

      const { endIndex, entries } = streak;
      const lastNight = entries[entries.length - 1];
      const lastNightInterval = lastNight
        ? buildWorkInterval(lastNight.date, 'N', shiftTimes)
        : null;
      if (!lastNightInterval) {
        index = endIndex;
        continue;
      }

      const nextWork = timeline.entries
        .slice(endIndex + 1)
        .find((entry) => WORK_SHIFT_CODES.has(entry.shiftCode));
      if (!nextWork) {
        index = endIndex;
        continue;
      }

      const nextWorkInterval = buildWorkInterval(
        nextWork.date,
        nextWork.shiftCode as WorkShiftCode,
        shiftTimes
      );
      if (!nextWorkInterval) {
        index = endIndex;
        continue;
      }

      const restMs = nextWorkInterval.start.getTime() - lastNightInterval.end.getTime();
      if (restMs < MIN_REST_AFTER_CONSECUTIVE_NIGHTS_MS) {
        violations.push(
          createViolation(
            'rest_after_two_nights',
            timeline.employeeId,
            timeline.employeeName,
            [...entries.map((entry) => entry.date), nextWork.date],
            `${timeline.employeeName}님은 연속 야간 종료 후 48시간 휴식 전에 다음 근무가 배정되었습니다.`
          )
        );
      }

      index = endIndex;
    }
  }

  return violations;
}
```

- [ ] **Step 4: Add local helper for streak extraction**

```ts
function collectConsecutiveNightStreak(
  entries: TimelineEntry[],
  startIndex: number
): { startIndex: number; endIndex: number; entries: TimelineEntry[] } | null {
  const first = entries[startIndex];
  if (!first || first.shiftCode !== 'N') {
    return null;
  }

  const streak: TimelineEntry[] = [first];
  let endIndex = startIndex;

  for (let index = startIndex + 1; index < entries.length; index += 1) {
    const previous = entries[index - 1];
    const current = entries[index];
    if (
      !previous ||
      !current ||
      current.shiftCode !== 'N' ||
      !areConsecutiveDates(previous, current)
    ) {
      break;
    }

    streak.push(current);
    endIndex = index;
  }

  return streak.length >= 2 ? { startIndex, endIndex, entries: streak } : null;
}
```

- [ ] **Step 5: Update evaluator callsite from old function name**

```ts
const violations = [
  ...evaluateNodPattern(timelines),
  ...evaluateConsecutiveNightLimit(timelines),
  ...evaluateRestAfterTwoNights(timelines, normalized.shiftTimes),
  ...evaluateMonthlyNightLimit(timelines, normalized.month),
].sort((left, right) => compareViolations(left, right, normalized.employeeOrder));
```

- [ ] **Step 6: Document semantic compatibility in type file without API break**

```ts
export type ScheduleComplianceRuleCode =
  | 'nod_pattern'
  // legacy key kept for API compatibility; semantics: 4+ consecutive nights are violations
  | 'triple_night'
  // legacy key kept for API compatibility; semantics: 48h rest after the consecutive night block ends
  | 'rest_after_two_nights'
  | 'monthly_night_limit';
```

- [ ] **Step 7: Run utility tests until pass**

Run:

```bash
pnpm test:unit -- tests/unit/schedule-compliance.spec.ts
```

Expected: PASS with updated policy behavior.

- [ ] **Step 8: Commit utility implementation**

```bash
git add src/utils/scheduleCompliance.ts src/types/scheduleCompliance.ts tests/unit/schedule-compliance.spec.ts
git commit -m "feat: allow three consecutive nights and enforce 4-night limit"
```

---

### Task 3: Align Compliance Panel Labels and Panel Tests

**Files:**

- Modify: `tests/unit/schedule-compliance-panel.spec.ts`
- Modify: `src/components/schedule/review/ScheduleCompliancePanel.vue` (only if hardcoded old wording is found)
- Test: `tests/unit/schedule-compliance-panel.spec.ts`

- [ ] **Step 1: Update panel test label map to corrected wording**

```ts
const ruleLabels: Record<ScheduleComplianceRuleCode, string> = {
  nod_pattern: 'NOD 금지',
  triple_night: '4연속 야간 금지 (3연속 허용)',
  rest_after_two_nights: '연속 야간 후 48시간 휴식',
  monthly_night_limit: '월 야간 15회 이하',
};
```

- [ ] **Step 2: Update Step5 text assertions that rely on old labels**

```ts
expect(document.body.textContent).toContain('4연속 야간 금지 (3연속 허용)');
expect(document.body.textContent).toContain('연속 야간 후 48시간 휴식');
```

- [ ] **Step 3: Run panel + Step5 tests**

Run:

```bash
pnpm test:unit -- tests/unit/schedule-compliance-panel.spec.ts tests/unit/step5-result.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit panel-level alignment**

```bash
git add tests/unit/schedule-compliance-panel.spec.ts tests/unit/step5-result.spec.ts src/components/schedule/review/ScheduleCompliancePanel.vue
git commit -m "test: align compliance panel labels with corrected night policy"
```

---

### Task 4: Align Comparison Summary Labels and Tests

**Files:**

- Modify: `src/utils/scheduleComparisonSummary.ts`
- Modify: `tests/unit/schedule-comparison-summary.spec.ts`
- Test: `tests/unit/schedule-comparison-summary.spec.ts`

- [ ] **Step 1: Update requirement labels in comparison model**

```ts
const COMPLIANCE_REQUIREMENT_DEFINITIONS: Array<{
  code: ScheduleComplianceRuleCode;
  label: string;
}> = [
  { code: 'nod_pattern', label: 'NOD 근무 불가' },
  { code: 'triple_night', label: '4연속 야간(N) 근무 불가 (3연속 허용)' },
  { code: 'rest_after_two_nights', label: '연속 야간(N) 후 48시간 이상 휴식' },
  { code: 'monthly_night_limit', label: '야간 근무 월 15회 이하' },
];
```

- [ ] **Step 2: Update old fallback labels for legacy review paths**

```ts
buildRequirementRow(
  '4연속 야간(N) 근무 불가 (3연속 허용)',
  leftEvaluation?.proofSummary?.nnnViolations,
  rightEvaluation?.proofSummary?.nnnViolations,
),
buildRequirementRow(
  '연속 야간(N) 후 48시간 이상 휴식',
  leftEvaluation?.proofSummary?.minimumRestViolations,
  rightEvaluation?.proofSummary?.minimumRestViolations,
),
```

- [ ] **Step 3: Update spec assertions for new labels**

```ts
expect(labels).toContain('4연속 야간(N) 근무 불가 (3연속 허용)');
expect(labels).toContain('연속 야간(N) 후 48시간 이상 휴식');
```

- [ ] **Step 4: Run comparison summary tests**

Run:

```bash
pnpm test:unit -- tests/unit/schedule-comparison-summary.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit comparison label alignment**

```bash
git add src/utils/scheduleComparisonSummary.ts tests/unit/schedule-comparison-summary.spec.ts
git commit -m "chore: update comparison labels for corrected consecutive-night policy"
```

---

### Task 5: Align Public Landing Copy + Legacy Plan Errata

**Files:**

- Modify: `src/components/public/LandingProductPreview.vue`
- Modify: `src/data/publicLandingContent.ts`
- Modify: `docs/plans/2026-05-02-step5-schedule-compliance-validation.md`
- Test: `tests/unit/public-landing.spec.ts`

- [ ] **Step 1: Update guide preview copy in landing product preview**

```ts
{
  label: '연속 야간 제한',
  description: '연속 야간 4회 이상 배치가 없도록 점검합니다.',
  warning: true,
},
```

- [ ] **Step 2: Update public landing section detail copy**

```ts
details: ['연속 야간 근무는 최대 3일', '연속 야간 종료 후 48시간 휴식 보장', '위반 여부를 쉽게 확인'],
```

- [ ] **Step 3: Add dated errata and replace old policy wording in legacy plan doc**

```md
## Policy Errata (2026-05-10)

- `3연속 야간 금지` -> `4연속 야간 금지 (3연속 허용)`
- `2연속 야간 후 48시간` -> `연속 야간 종료 후 48시간`
- `N -> N -> N` 위반 예시는 폐기하고 `N -> N -> N -> N` 위반 예시로 교체
```

- [ ] **Step 4: Run public landing tests**

Run:

```bash
pnpm test:unit -- tests/unit/public-landing.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit copy + documentation alignment**

```bash
git add src/components/public/LandingProductPreview.vue src/data/publicLandingContent.ts docs/plans/2026-05-02-step5-schedule-compliance-validation.md tests/unit/public-landing.spec.ts
git commit -m "docs: align public and plan copy with corrected night guideline"
```

---

### Task 6: Full Verification Gate

**Files:**

- Verify only (no file changes expected)

- [ ] **Step 1: Run targeted unit suites**

```bash
pnpm test:unit -- tests/unit/schedule-compliance.spec.ts tests/unit/schedule-compliance-panel.spec.ts tests/unit/schedule-comparison-summary.spec.ts tests/unit/step5-result.spec.ts tests/unit/public-landing.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run lint check (required by repo workflow)**

```bash
pnpm lint:check
```

Expected: exit `0` (warnings acceptable, ESLint errors not acceptable).

- [ ] **Step 3: Run production build (required because .ts/.vue changed)**

```bash
pnpm run build
```

Expected: exit `0`.

- [ ] **Step 4: If lint fails with fixable issues, run fix and re-check**

```bash
pnpm lint:fix
pnpm lint:check
```

Expected: `pnpm lint:check` exits `0`.

- [ ] **Step 5: Final commit (if verification-stage adjustments were needed)**

```bash
git add -A
git commit -m "chore: finalize night guideline correction verification"
```

---

## Acceptance Criteria

- `N,N,N` does not produce a `triple_night` violation.
- `N,N,N,N` produces a `triple_night` violation.
- 48-hour rest is computed from the last `N` in the consecutive night block.
- Panel/Step5/comparison/public copy all use corrected policy wording.
- `docs/plans/2026-05-02-step5-schedule-compliance-validation.md` contains explicit 2026-05-10 errata.
- `pnpm lint:check` and `pnpm run build` both pass.

## Risks and Guardrails

- Keep API keys (`triple_night`, `rest_after_two_nights`) unchanged to avoid downstream type/UI breakage.
- Limit this change to validation semantics and copy; do not alter Step5 finalization architecture.
- Do not include unrelated dirty worktree changes in commits.

## Self-Review

- Spec coverage: covered policy correction, impacted UI labels, comparison labels, landing copy, and legacy plan errata.
- Placeholder scan: no `TBD/TODO/implement later` placeholders remain.
- Type consistency: rule code keys remain unchanged; only semantics/copy are updated.

## Execution Handoff

Plan complete and saved to `docs/plans/2026-05-10-night-shift-guideline-correction-plan.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
