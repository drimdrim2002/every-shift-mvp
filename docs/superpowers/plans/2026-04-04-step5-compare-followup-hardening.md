# Step5 Compare Follow-Up Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the compare-centric Step5 regressions found in review and add a user-controlled comparison-tools visibility model that disappears entirely once a month is finalized.

**Architecture:** Keep the current compare-centric Step5 structure, but harden the state flow so focused-version routing, compare-workspace state, and post-action hydration cannot drift. Add a thin comparison-tools container that owns show/hide behavior for non-finalized months, while finalized months skip the candidate shelf and workspace entirely and rely on the focused detail pane plus read-only messaging.

**Tech Stack:** Vue 3, TypeScript, Vue Router, Pinia, Naive UI, Tailwind CSS, Vitest

---

## Scope And Decisions

- This is a follow-up plan for the already-shipped compare-centric Step5 work. Do not redesign Step5 again.
- Fix the three review issues first:
  - new candidate focus is lost after `더 개선하기`
  - comparison summary uses the wrong metric for Off-request guidance
  - focused version shows a fake `비교에서 제거` action that does nothing
- Add one new UX rule for non-finalized months:
  - users can hide/show the comparison tools
- Add one new UX rule for finalized months:
  - the comparison candidate shelf and comparison workspace are not rendered at all
- Keep backend contracts unchanged:
  - `getPhase2ScheduleCompare`
  - `getPhase2ScheduleReview`
  - `selectPhase2ScheduleVersion`
  - `recheckPhase2ScheduleVersion`
  - `finalizePhase2ScheduleVersion`
- Keep user-facing UI copy in Korean.

## UX Target

### Non-finalized month

1. User opens Step5.
2. User sees a compact `비교 도구` header with a visible `숨기기` or `다시 보기` control.
3. When expanded, the existing `비교 후보` shelf and `비교 워크스페이스` appear.
4. When collapsed, only the compact header remains; detail pane and action bar stay usable.
5. Focused version is always stable after `더 개선하기`, `기준안 선택`, `저장`, and refresh.

### Finalized month

1. User opens Step5.
2. User does not see `비교 후보` or `비교 워크스페이스`.
3. User only sees the finalized focused detail view, read-only messaging, export, and navigation.
4. No compare/focus/select affordances are rendered, because they are not actionable.

## File Map

### Create

- `src/components/schedule/review/ComparisonToolsSection.vue`
  - Owns the `비교 도구` heading, collapsed/expanded state UI, compact summary, and slot rendering for shelf/workspace.
- `tests/unit/comparison-tools-section.spec.ts`
  - Covers expand/collapse UI and finalized-hide behavior at the component boundary.
- `docs/superpowers/plans/2026-04-04-step5-compare-followup-hardening.md`
  - This plan.

### Modify

- `src/views/schedule/Step5Result.vue`
  - Fix post-action focus drift.
  - Render comparison tools through the new section wrapper.
  - Hide comparison tools entirely for finalized months.
  - Make compare/focus actions honest and stable.
- `src/composables/useScheduleReviewHub.ts`
  - Add explicit route-synced focus hydration helpers so `setPreviewVersion` and follow-up flows cannot silently diverge from the URL.
- `src/utils/scheduleVersionResolver.ts`
  - Preserve canonical route behavior for focus + compare state after action-driven transitions.
- `src/components/schedule/review/VersionCandidateShelf.vue`
  - Remove the fake removable state for the focused version.
  - Make compare button copy/disabled state truthful.
- `src/components/schedule/review/ComparisonWorkspace.vue`
  - Keep rendering logic compatible with hidden/collapsed tools and corrected summary semantics.
- `src/utils/scheduleComparisonSummary.ts`
  - Stop using `inputDiffSummary.changedOffRequests` as if it were satisfaction quality.
  - Use `comparisonMetrics.offRequestReflectionRate` when available.
- `src/types/schedule.ts`
  - Read-only confirmation of the correct metrics fields; no contract change expected, but keep this file in scope if helper typing needs narrowing.
- `tests/unit/step5-result.spec.ts`
  - Add regression coverage for regenerate focus persistence, tools collapse, and finalized hiding.
- `tests/unit/use-schedule-review-hub.spec.ts`
  - Add route-sync regression tests.
- `tests/unit/schedule-version-resolver.spec.ts`
  - Add route canonicalization tests for explicit compare/focus transitions.
- `tests/unit/version-candidate-shelf.spec.ts`
  - Assert focused version compare action is not a fake removable button.
- `tests/unit/comparison-workspace.spec.ts`
  - Assert corrected summary text behavior.
- `tests/unit/schedule-comparison-summary.spec.ts`
  - Assert comparison summary uses real comparison metrics.
- `docs/plans/PHASE2A_UI_TEST_SCENARIOS.md`
  - Update QA scenarios for collapse/hide behavior and finalized hidden-tools behavior.

## State Rules To Lock In

### Focus And Route

- `version=<id>` remains the source of truth for the focused detail pane.
- Compare actions that change focus must also update the route immediately.
- After `더 개선하기`, the newly created version must become:
  - focused version
  - route `version`
  - one member of the compare set
- `hub.hydrate()` must always reflect the latest route state, not stale in-memory focus.

### Compare Tools Visibility

- If `finalizedVersionId` exists, do not render the comparison tools section.
- If no finalized version exists, render the comparison tools section header.
- Default expanded state:
  - `true` when there are 2 or more versions and month is not finalized
  - `false` is allowed only after explicit user collapse
- Collapsing hides both:
  - `VersionCandidateShelf`
  - `ComparisonWorkspace`
- Collapsing must not clear compare membership, focused version, or selected version.

### Honest Compare Action

- Focused version cannot advertise `비교에서 제거` if the click is a no-op.
- Recommended behavior for focused version:
  - compare button is disabled
  - label is `현재 보는 안`
- Non-focused versions may still toggle compare membership.

### Comparison Summary Semantics

- `inputDiffSummary.changedOffRequests` means “input changed count,” not “better reflection.”
- Use `comparisonMetrics.offRequestReflectionRate` for reflection guidance when both sides provide it.
- If reflection-rate data is missing, do not invent a “더 반영했습니다” sentence.
- Safe fallback categories:
  - readiness/finalization state
  - manual edit count
  - neutral summary

## Task 1: Lock The Regressions With Failing Tests

**Files:**

- Modify: `tests/unit/step5-result.spec.ts`
- Modify: `tests/unit/use-schedule-review-hub.spec.ts`
- Modify: `tests/unit/schedule-version-resolver.spec.ts`
- Modify: `tests/unit/version-candidate-shelf.spec.ts`
- Modify: `tests/unit/schedule-comparison-summary.spec.ts`

- [ ] **Step 1: Write the failing Step5 integration test for regenerate focus persistence**

```ts
it('keeps the newly created version focused after regenerate and hydrate', async () => {
  await regenerateButton.trigger('click');
  await flushPromises();

  expect(replaceMock).toHaveBeenCalledWith({
    path: '/schedule/step5/schedule-1',
    query: {
      version: 'version-3',
      compare: 'version-3,version-2',
    },
  });
  expect(scheduleStoreMock.previewVersionId).toBe('version-3');
});
```

- [ ] **Step 2: Write the failing Step5 integration test for comparison-tools collapse**

```ts
it('collapses and re-expands comparison tools without clearing focus state', async () => {
  await wrapper.get('[data-test="comparison-tools-toggle"]').trigger('click');
  expect(wrapper.find('[data-test="comparison-workspace"]').exists()).toBe(false);
  expect(wrapper.find('[data-test="version-candidate-shelf"]').exists()).toBe(false);

  await wrapper.get('[data-test="comparison-tools-toggle"]').trigger('click');
  expect(wrapper.find('[data-test="comparison-workspace"]').exists()).toBe(true);
});
```

- [ ] **Step 3: Write the failing Step5 integration test for finalized hiding**

```ts
it('does not render comparison tools for finalized months', async () => {
  expect(wrapper.find('[data-test="comparison-tools-section"]').exists()).toBe(false);
  expect(wrapper.text()).not.toContain('비교 후보');
  expect(wrapper.text()).not.toContain('비교 워크스페이스');
});
```

- [ ] **Step 4: Write the failing hub/resolver regression tests**

```ts
it('setPreviewVersion updates route state for the new focused version', async () => {
  await hub.setPreviewVersion('version-3');
  expect(replaceMock).toHaveBeenCalledWith({
    path: '/schedule/step5/schedule-1',
    query: {
      version: 'version-3',
      compare: 'version-3,version-2',
    },
  });
});
```

```ts
it('builds a canonical route that preserves focused version plus compare ids', () => {
  expect(buildStep5Route('schedule-1', 'version-3', ['version-3', 'version-2'])).toEqual({
    path: '/schedule/step5/schedule-1',
    query: {
      version: 'version-3',
      compare: 'version-3,version-2',
    },
  });
});
```

- [ ] **Step 5: Write the failing summary and shelf tests**

```ts
it('uses off-request reflection rate instead of changedOffRequests count', () => {
  expect(summary).toContain('V2안의 Off 요청 반영률이 더 높습니다.');
  expect(summary).not.toContain('Off 요청을 3건 더 반영했습니다.');
});
```

```ts
it('does not offer compare removal for the focused version', () => {
  expect(wrapper.get('[data-test="compare-version-2"]').text()).toContain('현재 보는 안');
  expect(wrapper.get('[data-test="compare-version-2"]').attributes('disabled')).toBeDefined();
});
```

- [ ] **Step 6: Run targeted tests to verify failure**

Run:

```bash
pnpm exec vitest run \
  tests/unit/step5-result.spec.ts \
  tests/unit/use-schedule-review-hub.spec.ts \
  tests/unit/schedule-version-resolver.spec.ts \
  tests/unit/version-candidate-shelf.spec.ts \
  tests/unit/schedule-comparison-summary.spec.ts
```

Expected: FAIL on missing collapse UI, finalized hide behavior, route-sync persistence, and corrected summary semantics.

- [ ] **Step 7: Commit the failing-test checkpoint**

```bash
git add \
  tests/unit/step5-result.spec.ts \
  tests/unit/use-schedule-review-hub.spec.ts \
  tests/unit/schedule-version-resolver.spec.ts \
  tests/unit/version-candidate-shelf.spec.ts \
  tests/unit/schedule-comparison-summary.spec.ts
git commit -m "test: lock step5 follow-up regression coverage"
```

## Task 2: Fix Focus Persistence And Route Synchronization

**Files:**

- Modify: `src/composables/useScheduleReviewHub.ts`
- Modify: `src/utils/scheduleVersionResolver.ts`
- Modify: `src/views/schedule/Step5Result.vue`
- Test: `tests/unit/use-schedule-review-hub.spec.ts`
- Test: `tests/unit/schedule-version-resolver.spec.ts`
- Test: `tests/unit/step5-result.spec.ts`

- [ ] **Step 1: Add a route-synced focus helper in the review hub**

```ts
async function syncFocusedVersion(
  requestedFocusVersionId: string,
  requestedCompareVersionIds: string[]
) {
  const resolvedState = await loadCompare({
    requestedFocusVersionId,
    requestedCompareVersionIds,
  });

  await router.replace(
    buildStep5Route(
      getScheduleId(),
      resolvedState.previewVersionId,
      resolvedState.compareVersionIds
    )
  );

  await loadReviews(resolvedState.compareVersionIds, resolvedState.previewVersionId);
}
```

- [ ] **Step 2: Make `setPreviewVersion()` route-aware instead of memory-only**

```ts
async function setPreviewVersion(versionId: string) {
  const requestedCompareVersionIds = dedupeVersionIds(
    [selectedVersionId.value, versionId].filter(Boolean) as string[]
  );

  await syncFocusedVersion(versionId, requestedCompareVersionIds);
}
```

- [ ] **Step 3: Update `handleRegenerate()` to promote the newly created version into canonical focus**

```ts
await hub.setPreviewVersion(createResponse.createdVersionId);
await syncPreviewWorkspace({
  syncOriginal: true,
  clearChanges: true,
  forceAssignmentSync: true,
});
await handleStartSolver();
```

Important:

- remove any stale manual `scheduleStore.setPreviewVersionId(createResponse.createdVersionId)` writes that bypass route canonicalization
- after regenerate, route and store must agree before `handleStartSolver()`

- [ ] **Step 4: Ensure action-driven hydrate paths never overwrite fresh focus with stale route state**

Implementation notes:

- Review `handlePrimaryAction()`
- Review `handleSelectCandidateVersion()`
- Review `handleSave()`
- Keep `hub.hydrate()` only after route state is already correct

- [ ] **Step 5: Run focused tests**

Run:

```bash
pnpm exec vitest run \
  tests/unit/use-schedule-review-hub.spec.ts \
  tests/unit/schedule-version-resolver.spec.ts \
  tests/unit/step5-result.spec.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add \
  src/composables/useScheduleReviewHub.ts \
  src/utils/scheduleVersionResolver.ts \
  src/views/schedule/Step5Result.vue \
  tests/unit/use-schedule-review-hub.spec.ts \
  tests/unit/schedule-version-resolver.spec.ts \
  tests/unit/step5-result.spec.ts
git commit -m "fix: keep step5 focus and route state in sync"
```

## Task 3: Correct Comparison Summary Semantics

**Files:**

- Modify: `src/utils/scheduleComparisonSummary.ts`
- Modify: `src/components/schedule/review/ComparisonWorkspace.vue`
- Test: `tests/unit/schedule-comparison-summary.spec.ts`
- Test: `tests/unit/comparison-workspace.spec.ts`

- [ ] **Step 1: Replace the misleading Off-request sentence with reflection-rate-based logic**

```ts
function buildOffRequestRateCopy(
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
```

- [ ] **Step 2: Keep safe fallback bullets only**

```ts
if (!offRequestRateCopy && bullets.length === 0) {
  bullets.push('두 안의 핵심 지표 차이가 크지 않습니다.');
}
```

Use fallback categories in this order:

1. off-request reflection rate
2. readiness/finalization state
3. manual edit count
4. neutral summary

- [ ] **Step 3: Update the workspace tests to match truthful copy**

```ts
expect(wrapper.get('[data-test="comparison-summary"]').text()).toContain(
  'V2안의 Off 요청 반영률이 더 높습니다.'
);
```

- [ ] **Step 4: Run the summary/workspace tests**

Run:

```bash
pnpm exec vitest run \
  tests/unit/schedule-comparison-summary.spec.ts \
  tests/unit/comparison-workspace.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  src/utils/scheduleComparisonSummary.ts \
  src/components/schedule/review/ComparisonWorkspace.vue \
  tests/unit/schedule-comparison-summary.spec.ts \
  tests/unit/comparison-workspace.spec.ts
git commit -m "fix: use truthful comparison summary metrics"
```

## Task 4: Add Comparison Tools Visibility Controls

**Files:**

- Create: `src/components/schedule/review/ComparisonToolsSection.vue`
- Modify: `src/views/schedule/Step5Result.vue`
- Test: `tests/unit/comparison-tools-section.spec.ts`
- Test: `tests/unit/step5-result.spec.ts`

- [ ] **Step 1: Write the failing component test for collapsed and expanded states**

```ts
it('renders slots only when expanded', async () => {
  expect(wrapper.find('[data-test="comparison-tools-body"]').exists()).toBe(true);

  await wrapper.get('[data-test="comparison-tools-toggle"]').trigger('click');
  expect(wrapper.find('[data-test="comparison-tools-body"]').exists()).toBe(false);
});
```

- [ ] **Step 2: Write the minimal section component**

```vue
<section data-test="comparison-tools-section">
  <header>
    <h3>비교 도구</h3>
    <button
      data-test="comparison-tools-toggle"
      type="button"
      @click="$emit('toggle-collapsed')"
    >
      {{ collapsed ? '다시 보기' : '숨기기' }}
    </button>
  </header>

  <div v-if="!collapsed" data-test="comparison-tools-body">
    <slot />
  </div>
</section>
```

- [ ] **Step 3: Integrate the section into Step5**

Implementation notes:

- add `const isComparisonToolsCollapsed = ref(false);`
- add `const isFinalizedMonth = computed(() => Boolean(scheduleStore.compareMatrix?.finalizedVersionId));`
- add `const shouldShowComparisonTools = computed(() => !isFinalizedMonth.value);`
- wrap `VersionCandidateShelf` and `ComparisonWorkspace` inside `ComparisonToolsSection`

Example:

```vue
<ComparisonToolsSection
  v-if="shouldShowComparisonTools"
  :collapsed="isComparisonToolsCollapsed"
  :candidate-count="compareVersions.length"
  :compare-count="compareVersionIds.length"
  @toggle-collapsed="isComparisonToolsCollapsed = !isComparisonToolsCollapsed"
>
  <!-- shelf + workspace -->
</ComparisonToolsSection>
```

- [ ] **Step 4: Preserve detail pane behavior while tools are collapsed**

Rules:

- collapsing does not mutate:
  - `previewVersionId`
  - `selectedVersionId`
  - `compareVersionIds`
- detail pane and action bar remain visible

- [ ] **Step 5: Run tests**

Run:

```bash
pnpm exec vitest run \
  tests/unit/comparison-tools-section.spec.ts \
  tests/unit/step5-result.spec.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add \
  src/components/schedule/review/ComparisonToolsSection.vue \
  src/views/schedule/Step5Result.vue \
  tests/unit/comparison-tools-section.spec.ts \
  tests/unit/step5-result.spec.ts
git commit -m "feat: add collapsible comparison tools section"
```

## Task 5: Hide Comparison Tools Entirely For Finalized Months

**Files:**

- Modify: `src/views/schedule/Step5Result.vue`
- Modify: `tests/unit/step5-result.spec.ts`
- Modify: `docs/plans/PHASE2A_UI_TEST_SCENARIOS.md`

- [ ] **Step 1: Make finalized hiding explicit in Step5**

```ts
const isFinalizedMonth = computed(() => {
  return Boolean(scheduleStore.compareMatrix?.finalizedVersionId);
});

const shouldShowComparisonTools = computed(() => !isFinalizedMonth.value);
```

- [ ] **Step 2: Keep finalized UX simple**

Rules:

- do not render `ComparisonToolsSection`
- do not render shelf/workspace placeholders
- keep:
  - focused version heading
  - read-only warning
  - export action
  - navigation

- [ ] **Step 3: Update the QA guide with finalized hidden-tools scenarios**

Add scenarios like:

```md
- `FINALIZED` fixture에서는 `비교 도구`, `비교 후보`, `비교 워크스페이스`가 보이지 않는다.
- 상세 화면은 바로 읽기 전용 상태로 열린다.
```

- [ ] **Step 4: Run tests**

Run:

```bash
pnpm exec vitest run tests/unit/step5-result.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  src/views/schedule/Step5Result.vue \
  tests/unit/step5-result.spec.ts \
  docs/plans/PHASE2A_UI_TEST_SCENARIOS.md
git commit -m "feat: hide comparison tools for finalized months"
```

## Task 6: Remove Fake Compare Removal On The Focused Version

**Files:**

- Modify: `src/components/schedule/review/VersionCandidateShelf.vue`
- Modify: `src/views/schedule/Step5Result.vue`
- Modify: `tests/unit/version-candidate-shelf.spec.ts`
- Modify: `tests/unit/step5-result.spec.ts`

- [ ] **Step 1: Make the focused-version compare button truthful**

```ts
function getCompareActionLabel(versionId: string) {
  if (versionId === props.focusedVersionId) {
    return '현재 보는 안';
  }

  return compareVersionSet.value.has(versionId) ? '비교에서 제거' : '비교에 추가';
}
```

```vue
:disabled="isLockedOut(version.id) || version.id === focusedVersionId"
```

- [ ] **Step 2: Leave compare toggling only for non-focused versions**

No Step5 route logic should rely on “remove focused version” anymore.

- [ ] **Step 3: Run tests**

Run:

```bash
pnpm exec vitest run \
  tests/unit/version-candidate-shelf.spec.ts \
  tests/unit/step5-result.spec.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add \
  src/components/schedule/review/VersionCandidateShelf.vue \
  src/views/schedule/Step5Result.vue \
  tests/unit/version-candidate-shelf.spec.ts \
  tests/unit/step5-result.spec.ts
git commit -m "fix: remove fake compare toggle from focused version"
```

## Task 7: Full Verification And Documentation Pass

**Files:**

- Modify: `docs/plans/PHASE2A_UI_TEST_SCENARIOS.md`
- Modify: `tests/unit/comparison-workspace.spec.ts`
- Modify: `tests/unit/focused-version-action-bar.spec.ts`
- Modify: `tests/unit/version-candidate-shelf.spec.ts`
- Modify: `tests/unit/step5-result.spec.ts`

- [ ] **Step 1: Update the QA guide for the final Step5 behavior**

Cover:

- non-finalized months show collapsible comparison tools
- collapsed tools keep the detail pane usable
- finalized months hide comparison tools entirely
- focused version no longer offers a fake compare-removal action
- comparison summary copy is based on real comparison metrics

- [ ] **Step 2: Run the full affected unit suite**

Run:

```bash
pnpm exec vitest run \
  tests/unit/step5-result.spec.ts \
  tests/unit/use-schedule-review-hub.spec.ts \
  tests/unit/schedule-version-resolver.spec.ts \
  tests/unit/version-candidate-shelf.spec.ts \
  tests/unit/comparison-workspace.spec.ts \
  tests/unit/comparison-tools-section.spec.ts \
  tests/unit/focused-version-action-bar.spec.ts \
  tests/unit/schedule-comparison-summary.spec.ts
```

Expected: PASS

- [ ] **Step 3: Run lint**

Run:

```bash
pnpm lint:check
```

Expected: `0 errors`

- [ ] **Step 4: Commit the documentation and verification pass**

```bash
git add \
  docs/plans/PHASE2A_UI_TEST_SCENARIOS.md \
  tests/unit/step5-result.spec.ts \
  tests/unit/use-schedule-review-hub.spec.ts \
  tests/unit/schedule-version-resolver.spec.ts \
  tests/unit/version-candidate-shelf.spec.ts \
  tests/unit/comparison-workspace.spec.ts \
  tests/unit/comparison-tools-section.spec.ts \
  tests/unit/focused-version-action-bar.spec.ts \
  tests/unit/schedule-comparison-summary.spec.ts
git commit -m "docs: update step5 qa coverage for hardened compare ux"
```

## Implementation Notes For The Worker

- Do not reintroduce the old preview-vs-selected teaching UI.
- Do not use `changedOffRequests` to describe outcome quality.
- Do not keep any state mutation path that updates store focus without also updating the route when the user-visible focus changes.
- Prefer small helpers over more inline logic in `Step5Result.vue`; that file is already large.
- Keep `VersionCandidateShelf.vue` and `ComparisonWorkspace.vue` focused on rendering and user intent, not route orchestration.

## Final Verification Checklist

- [ ] `더 개선하기` leaves the newly created version focused and visible after hydrate
- [ ] compare tools can be hidden and shown again without losing compare state
- [ ] finalized months render no comparison tools at all
- [ ] focused version compare button is honest and non-clickable
- [ ] summary copy does not claim “더 반영” from changed-input counts
- [ ] affected unit tests pass
- [ ] `pnpm lint:check` reports `0 errors`
