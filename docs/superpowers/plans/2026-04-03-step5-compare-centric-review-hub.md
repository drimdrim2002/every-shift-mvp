# Step5 Compare-Centric Review Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Step5 into a compare-centric review experience where users explicitly pick candidate plans to compare, understand the differences in plain language, and then choose or finalize a plan without learning internal preview/selected semantics.

**Architecture:** Keep the Trust Layer backend contracts (`compare`, `review`, `select`, `recheck`, `finalize`) unchanged. Move the UX center of gravity from a single previewed version to a comparison workspace driven by explicit compare slots, a focused version detail pane, and action copy that talks about “current basis plan” and “plan you are reviewing” instead of backend concepts. Use query canonicalization to deep-link the focused version and the current comparison set without making the URL authoritative for selection.

**Tech Stack:** Vue 3, TypeScript, Vite, Pinia, Vue Router, Naive UI, Vitest, Tailwind CSS

---

## Scope And Guardrails

- This plan only changes the Step5 review experience and the related QA/documentation surface.
- Do not change Supabase schema or Edge Function contracts for this iteration.
- Keep the existing authoritative selection rule: backend `selected_version_id` remains the source of truth.
- Keep finalized-month protection intact. If a month is finalized, the comparison UI may still explain the locked state, but must not reopen editing.
- User-facing copy stays in Korean. Plan and code comments stay in English.

## UX Target

From the user’s point of view, Step5 should work like this:

1. They see a candidate shelf of all generated plans.
2. They explicitly add one or two plans into a comparison workspace.
3. They see a short human summary first, not raw status jargon.
4. They can still open one plan as the focused detail view for grid/proof/off-request inspection.
5. They use clear actions:
   - `비교에 추가`
   - `이 안 자세히 보기`
   - `이 안을 기준안으로 사용`
   - `이 안으로 최종 확정`

The old “click card = preview only” mental model should disappear from the user-facing UX.

## File Map

### Modify

- `src/views/schedule/Step5Result.vue`
  - Replace the current compare-header-first layout with a compare-centric shell.
  - Keep existing grid/edit/save/regenerate/export logic, but drive it from a focused version instead of implicit preview semantics.
- `src/composables/useScheduleReviewHub.ts`
  - Add focused-version state, compare-slot state, query canonicalization, and multi-review loading.
- `src/utils/scheduleVersionResolver.ts`
  - Resolve and canonicalize `version` + `compare` query state for Step5.
- `src/utils/scheduleReviewCopy.ts`
  - Replace internal-feeling labels with comparison-oriented Korean copy.
- `src/utils/scheduleReviewState.ts`
  - Add helpers for compare-summary support copy and focus/version action wording if needed.
- `tests/unit/use-schedule-review-hub.spec.ts`
  - Add coverage for compare-slot hydration, canonicalization, and multi-review state.
- `tests/unit/schedule-version-resolver.spec.ts`
  - Add coverage for `compare` query parsing/canonicalization.
- `tests/unit/step5-result.spec.ts`
  - Update Step5 integration tests to assert the new compare-centric flow.
- `docs/plans/PHASE2A_UI_TEST_SCENARIOS.md`
  - Rewrite the QA guide so it matches explicit comparison actions instead of preview-vs-selected teaching.

### Create

- `src/utils/scheduleComparisonSummary.ts`
  - Pure helper that converts two version summaries/reviews into human-readable comparison bullets.
- `src/components/schedule/review/VersionCandidateShelf.vue`
  - Candidate list with explicit actions per version (`비교에 추가`, `자세히 보기`, `기준안으로 사용`).
- `src/components/schedule/review/ComparisonWorkspace.vue`
  - Two-slot comparison area with left/right candidate summaries and a “what changed” section.
- `src/components/schedule/review/FocusedVersionActionBar.vue`
  - Focused-version headline, current basis plan summary, and a single primary CTA.
- `tests/unit/schedule-comparison-summary.spec.ts`
  - Unit tests for summary generation.
- `tests/unit/version-candidate-shelf.spec.ts`
  - Component tests for explicit compare/focus/select actions.
- `tests/unit/comparison-workspace.spec.ts`
  - Component tests for side-by-side rendering and comparison summary text.
- `tests/unit/focused-version-action-bar.spec.ts`
  - Component tests for user-facing wording and CTA behavior.

## Query Model

- Keep `version=<versionId>` as the focused detail pane target.
- Add `compare=<leftVersionId>,<rightVersionId>` for the explicit comparison set.
- Canonicalization rules:
  - Remove missing or duplicate version IDs.
  - Limit to two IDs.
  - If no valid `compare` query exists, default to:
    - `[selectedVersionId, version]` when they differ
    - `[selectedVersionId]` when only one valid version is meaningful
    - fallback to `V1` when there is no authoritative selection
  - If the month is finalized, force the finalized version into the focus slot and disable other compare actions.

## Task 1: Comparison Query And Hub State Foundation

**Files:**

- Modify: `src/utils/scheduleVersionResolver.ts`
- Modify: `src/composables/useScheduleReviewHub.ts`
- Test: `tests/unit/schedule-version-resolver.spec.ts`
- Test: `tests/unit/use-schedule-review-hub.spec.ts`

- [ ] **Step 1: Write the failing resolver and hub tests**

```ts
it('canonicalizes compare query to at most two valid distinct ids', () => {
  expect(
    resolveStep5VersionState(compareResponse, {
      requestedFocusVersionId: 'version-3',
      requestedCompareVersionIds: ['version-3', 'version-2', 'missing'],
    })
  ).toMatchObject({
    previewVersionId: 'version-3',
    compareVersionIds: ['version-3', 'version-2'],
    shouldCanonicalize: true,
  });
});

it('hydrates focused review and comparison reviews together', async () => {
  const hub = await mountUseScheduleReviewHub({
    version: 'version-3',
    compare: 'version-3,version-2',
  });
  expect(hub.focusVersionId.value).toBe('version-3');
  expect(hub.compareVersionIds.value).toEqual(['version-3', 'version-2']);
  expect(hub.comparedReviews.value['version-2']?.version.id).toBe('version-2');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:unit -- tests/unit/schedule-version-resolver.spec.ts tests/unit/use-schedule-review-hub.spec.ts`
Expected: FAIL with missing compare-query state and missing multi-review hub state.

- [ ] **Step 3: Write the minimal implementation**

```ts
export interface Step5QueryState {
  requestedFocusVersionId: string | null;
  requestedCompareVersionIds: string[];
}

export interface ResolvedStep5VersionState {
  selectedVersionId: string | null;
  previewVersionId: string | null;
  compareVersionIds: string[];
  activeSolvingVersionId: string | null;
  versions: ScheduleVersionSummary[];
  shouldCanonicalize: boolean;
}
```

Implement in `useScheduleReviewHub.ts`:

```ts
const focusVersionId = computed(() => scheduleStore.previewVersionId);
const compareVersionIds = ref<string[]>([]);
const comparedReviews = ref<Record<string, ScheduleReviewResponse>>({});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:unit -- tests/unit/schedule-version-resolver.spec.ts tests/unit/use-schedule-review-hub.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/unit/schedule-version-resolver.spec.ts tests/unit/use-schedule-review-hub.spec.ts src/utils/scheduleVersionResolver.ts src/composables/useScheduleReviewHub.ts
git commit -m "refactor: add compare workspace state to review hub"
```

## Task 2: Human-Readable Comparison Summary

**Files:**

- Create: `src/utils/scheduleComparisonSummary.ts`
- Modify: `src/utils/scheduleReviewCopy.ts`
- Test: `tests/unit/schedule-comparison-summary.spec.ts`

- [ ] **Step 1: Write the failing summary tests**

```ts
it('describes the strongest differences between two candidate versions', () => {
  expect(
    buildScheduleComparisonSummary(leftVersion, rightVersion, leftReview, rightReview)
  ).toEqual([
    'V3안이 Off 요청을 3건 더 반영했습니다.',
    'V2안은 규칙 위반이 없어 바로 확정할 수 있습니다.',
    'V3안은 직접 수정이 있어 다시 검사가 필요합니다.',
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- tests/unit/schedule-comparison-summary.spec.ts`
Expected: FAIL with missing helper/module.

- [ ] **Step 3: Write minimal implementation**

```ts
export function buildScheduleComparisonSummary(
  left: ScheduleVersionSummary,
  right: ScheduleVersionSummary,
  leftReview: ScheduleReviewResponse | null,
  rightReview: ScheduleReviewResponse | null
): string[] {
  const bullets: string[] = [];
  // Compare off-request reflection, gate readiness, and manual-edit / recheck state.
  return bullets.slice(0, 3);
}
```

Also update `scheduleReviewCopy.ts` so displayed labels become:

```ts
review_ready: '확정 가능',
review_blocked: '규칙 위반으로 확정 불가',
review_pending: '수정 후 다시 검사 필요',
infeasible: '조건 충돌로 생성 불가',
solve_failed: '생성 중 오류 발생',
finalized: '최종 확정됨',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- tests/unit/schedule-comparison-summary.spec.ts tests/unit/schedule-review.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/unit/schedule-comparison-summary.spec.ts tests/unit/schedule-review.spec.ts src/utils/scheduleComparisonSummary.ts src/utils/scheduleReviewCopy.ts
git commit -m "feat: add user-facing comparison summary copy"
```

## Task 3: Candidate Shelf With Explicit Compare Actions

**Files:**

- Create: `src/components/schedule/review/VersionCandidateShelf.vue`
- Test: `tests/unit/version-candidate-shelf.spec.ts`

- [ ] **Step 1: Write the failing component test**

```ts
it('emits explicit actions instead of implicit preview switching', async () => {
  await wrapper.get('[data-test="compare-version-2"]').trigger('click');
  await wrapper.get('[data-test="focus-version-2"]').trigger('click');
  await wrapper.get('[data-test="select-version-2"]').trigger('click');

  expect(wrapper.emitted('toggle-compare')).toEqual([['version-2']]);
  expect(wrapper.emitted('focus-version')).toEqual([['version-2']]);
  expect(wrapper.emitted('select-version')).toEqual([['version-2']]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- tests/unit/version-candidate-shelf.spec.ts`
Expected: FAIL with missing component/module.

- [ ] **Step 3: Write minimal implementation**

```vue
<button
  :data-test="`compare-${version.id}`"
  @click="$emit('toggle-compare', version.id)"
>비교에 추가</button>
<button
  :data-test="`focus-${version.id}`"
  @click="$emit('focus-version', version.id)"
>이 안 자세히 보기</button>
<button
  :data-test="`select-${version.id}`"
  @click="$emit('select-version', version.id)"
>이 안을 기준안으로 사용</button>
```

Rules:

- Show at most one `현재 기준안` badge.
- Show `비교 중` badge when the version is in the compare tray.
- Disable compare/focus/select actions when `lockedVersionId` exists and the version is not the locked one.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- tests/unit/version-candidate-shelf.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/unit/version-candidate-shelf.spec.ts src/components/schedule/review/VersionCandidateShelf.vue
git commit -m "feat: add explicit version candidate shelf actions"
```

## Task 4: Two-Slot Comparison Workspace

**Files:**

- Create: `src/components/schedule/review/ComparisonWorkspace.vue`
- Modify: `src/components/schedule/review/VersionReviewDetail.vue`
- Test: `tests/unit/comparison-workspace.spec.ts`

- [ ] **Step 1: Write the failing comparison workspace test**

```ts
it('renders two selected candidates and their plain-language deltas', () => {
  expect(wrapper.text()).toContain('비교 중인 안');
  expect(wrapper.text()).toContain('V2안이 Off 요청을 3건 더 반영했습니다.');
  expect(wrapper.text()).toContain('왼쪽 안 자세히 보기');
  expect(wrapper.text()).toContain('오른쪽 안 자세히 보기');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- tests/unit/comparison-workspace.spec.ts`
Expected: FAIL with missing component/module.

- [ ] **Step 3: Write minimal implementation**

```vue
<section>
  <h3>비교 중인 안</h3>
  <article>{{ leftVersion.name }}</article>
  <article>{{ rightVersion?.name ?? '비교할 안을 하나 더 선택하세요' }}</article>
  <ul>
    <li v-for="item in summary" :key="item">{{ item }}</li>
  </ul>
</section>
```

Also update `VersionReviewDetail.vue` so the detail pane can show a focused-version heading like `현재 자세히 보는 안: V3`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- tests/unit/comparison-workspace.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/unit/comparison-workspace.spec.ts src/components/schedule/review/ComparisonWorkspace.vue src/components/schedule/review/VersionReviewDetail.vue
git commit -m "feat: add two-slot comparison workspace"
```

## Task 5: Focused Action Bar And Step5 Integration

**Files:**

- Create: `src/components/schedule/review/FocusedVersionActionBar.vue`
- Modify: `src/views/schedule/Step5Result.vue`
- Modify: `src/composables/useScheduleReviewHub.ts`
- Test: `tests/unit/focused-version-action-bar.spec.ts`
- Test: `tests/unit/step5-result.spec.ts`

- [ ] **Step 1: Write the failing integration tests**

```ts
it('shows the focused plan, the current basis plan, and compare-first actions', async () => {
  expect(wrapper.text()).toContain('현재 자세히 보는 안');
  expect(wrapper.text()).toContain('현재 기준안');
  expect(wrapper.text()).toContain('이 안을 기준안으로 사용');
});

it('keeps grid editing attached to the focused version while comparison stays visible', async () => {
  await wrapper.get('[data-test="focus-version-3"]').trigger('click');
  expect(getScheduleVersionAssignmentsMock).toHaveBeenCalledWith('version-3');
  expect(wrapper.text()).toContain('비교 중인 안');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:unit -- tests/unit/focused-version-action-bar.spec.ts tests/unit/step5-result.spec.ts`
Expected: FAIL with missing action bar and outdated Step5 expectations.

- [ ] **Step 3: Write minimal implementation**

In `FocusedVersionActionBar.vue`:

```vue
<p>현재 자세히 보는 안: {{ focusedLabel }}</p>
<p>현재 기준안: {{ selectedLabel }}</p>
<button @click="$emit('primary-action')">{{ primaryActionLabel }}</button>
```

In `Step5Result.vue`:

- Replace `VersionCompareSurface` + `VersionActionArea` with:
  - `VersionCandidateShelf`
  - `ComparisonWorkspace`
  - `FocusedVersionActionBar`
- Keep existing grid/recheck/finalize/save/export logic, but wire it to `focusVersionId`.
- Ensure `handlePrimaryAction()` still calls:
  - `selectPhase2ScheduleVersion`
  - `recheckPhase2ScheduleVersion`
  - `finalizePhase2ScheduleVersion`
  - solver retry

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:unit -- tests/unit/focused-version-action-bar.spec.ts tests/unit/step5-result.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/unit/focused-version-action-bar.spec.ts tests/unit/step5-result.spec.ts src/components/schedule/review/FocusedVersionActionBar.vue src/views/schedule/Step5Result.vue src/composables/useScheduleReviewHub.ts
git commit -m "refactor: make Step5 comparison-first for multiple versions"
```

## Task 6: QA Guide Rewrite And Final Verification

**Files:**

- Modify: `docs/plans/PHASE2A_UI_TEST_SCENARIOS.md`
- Modify: `tests/unit/version-action-area.spec.ts` (remove or rewrite if the component is retired)
- Modify: `tests/unit/version-compare-surface.spec.ts` (remove or rewrite if the component is retired)

- [ ] **Step 1: Rewrite the failing/obsolete tests**

Replace old preview-vs-selected expectations with compare-centric assertions:

```ts
expect(wrapper.text()).toContain('비교에 추가');
expect(wrapper.text()).toContain('현재 기준안');
expect(wrapper.text()).not.toContain('카드 클릭 = 미리보기만 변경');
```

- [ ] **Step 2: Run the affected tests to verify failures are real**

Run: `pnpm test:unit -- tests/unit/version-action-area.spec.ts tests/unit/version-compare-surface.spec.ts`
Expected: FAIL because the old UX vocabulary/components no longer match.

- [ ] **Step 3: Update documentation and tests**

Rewrite the QA guide around this user flow:

1. Open Step5.
2. Add one or two candidate plans to comparison.
3. Read the summary deltas.
4. Open one plan in detail.
5. Use it as the current basis plan or finalize it.

Also rename component tests if `VersionActionArea.vue` / `VersionCompareSurface.vue` are deleted or fully replaced.

- [ ] **Step 4: Run full verification**

Run:

```bash
pnpm test:unit -- tests/unit/schedule-version-resolver.spec.ts tests/unit/use-schedule-review-hub.spec.ts tests/unit/schedule-comparison-summary.spec.ts tests/unit/version-candidate-shelf.spec.ts tests/unit/comparison-workspace.spec.ts tests/unit/focused-version-action-bar.spec.ts tests/unit/step5-result.spec.ts
pnpm lint:check
```

Expected:

- All targeted unit tests PASS
- `pnpm lint:check` completes with no ESLint errors

- [ ] **Step 5: Commit**

```bash
git add docs/plans/PHASE2A_UI_TEST_SCENARIOS.md tests/unit src/components/schedule/review src/views/schedule/Step5Result.vue src/composables/useScheduleReviewHub.ts src/utils
git commit -m "docs: align Step5 QA guide with compare-centric UX"
```

## Rollout Notes

- Do not mix this UI redesign with backend Trust Layer fixes in the same PR.
- If deleting `VersionCompareSurface.vue` or `VersionActionArea.vue`, do it only after `Step5Result.vue` and the replacement tests are green.
- Keep the compare workspace capped at two versions for this iteration. More than two is a product question, not an implementation detail.
- If reviewers push back on route shape, prefer keeping `version` and adding `compare` over inventing a new Step5 route.

## Manual QA Checklist

- Open a month with 3+ versions and confirm the shelf shows all candidates without requiring card-click mental models.
- Add two candidates to compare and confirm a human-readable summary appears.
- Focus one candidate and confirm the grid/proof/off-request detail pane follows that focused candidate.
- Switch the current basis plan through an explicit button only.
- Finalize from the focused candidate only when it is also the backend-selected candidate and the gate is open.
- Confirm finalized months still lock editing and disable compare actions for other versions.

## Review Notes

- Preferred spec/context inputs for implementation review:
  - `docs/plans/PHASE2A_UI_TEST_SCENARIOS.md`
  - `docs/plans/PHASE2A_GSTACK_PLAN_REVIEW_KR.md`
  - `src/views/schedule/Step5Result.vue`
  - `src/composables/useScheduleReviewHub.ts`

- The normal `plan-document-reviewer` subagent loop is not included in this document itself. If delegation is allowed in the execution session, run that review before implementation starts.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-03-step5-compare-centric-review-hub.md`. Two execution options:

**1. Subagent-Driven (recommended)** - dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - execute tasks in one session using executing-plans, batch execution with checkpoints

Which approach?
