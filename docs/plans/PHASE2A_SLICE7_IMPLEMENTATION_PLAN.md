# Phase2A Slice 7 Review Hub Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Step5 into a version-aware review hub shell where compare is always visible, preview and selected state are explicitly separated, and authoritative selection changes only through an explicit CTA.

**Architecture:** Keep backend/schema unchanged and refactor Step5 around a thin review-hub composable plus two focused UI components. The composable owns compare/review loading, preview query canonicalization, and explicit select mutation; Step5 keeps the existing grid/solver/manual-edit behavior but consumes the new review-hub state instead of mixing routing, selection, and result UI in one file.

**Tech Stack:** Vue 3 (`<script setup>`), TypeScript, Pinia, Vue Router, Naive UI, Vitest, Vue Test Utils

---

## Scope Lock

This plan implements **Slice 7 only** from [docs/plans/PHASE2A_EXECUTION_SLICES.md](/Users/brown/workspace/every-shift-mvp/docs/plans/PHASE2A_EXECUTION_SLICES.md).

In scope:

- Step5 review-hub shell
- preview vs selected header/state split
- always-visible compare surface at the top of Step5
- explicit select CTA wired to backend `select`
- preview deep-link sync using `?version=...`
- review payload plumbing for the preview version

Out of scope:

- final panel priority polish
- finalized-month protection in Step3
- dashboard/log metadata work
- new backend contracts or schema changes
- Slice 8 default-panel logic and single-primary-CTA reducer completion

## References To Read Before Coding

- [docs/plans/PHASE2A_EXECUTION_SLICES.md](/Users/brown/workspace/every-shift-mvp/docs/plans/PHASE2A_EXECUTION_SLICES.md)
- [docs/prd/PHASE2_ENGINEERING_SPEC.md](/Users/brown/workspace/every-shift-mvp/docs/prd/PHASE2_ENGINEERING_SPEC.md)
- [src/views/schedule/Step5Result.vue](/Users/brown/workspace/every-shift-mvp/src/views/schedule/Step5Result.vue)
- [src/utils/scheduleVersionResolver.ts](/Users/brown/workspace/every-shift-mvp/src/utils/scheduleVersionResolver.ts)
- [src/api/schedule.ts](/Users/brown/workspace/every-shift-mvp/src/api/schedule.ts)
- [src/stores/schedule.ts](/Users/brown/workspace/every-shift-mvp/src/stores/schedule.ts)
- [tests/unit/step5-result.spec.ts](/Users/brown/workspace/every-shift-mvp/tests/unit/step5-result.spec.ts)

## File Structure

### Existing files to modify

- `src/views/schedule/Step5Result.vue`
  - Remove compare/review-shell concerns from the large screen component.
  - Consume a new composable for preview/selected/review state.
  - Render the compare surface above the status/grid area.
  - Render the version action/header area between compare and the existing Step5 content.

- `tests/unit/step5-result.spec.ts`
  - Keep this as the Step5 integration-style unit test.
  - Add assertions for compare visibility, preview switching, URL canonicalization, and explicit select behavior.

### New files to create

- `src/composables/useScheduleReviewHub.ts`
  - Single responsibility: review-hub state and actions for Step5.
  - Own compare fetch, preview review fetch, query canonicalization, store synchronization, preview switching, and explicit selection mutation.

- `src/components/schedule/review/VersionCompareSurface.vue`
  - Pure display/control component for the always-visible compare area.
  - Shows all candidate versions with selected/preview/finalized badges and compare metrics.
  - Emits preview-switch intent only.

- `src/components/schedule/review/VersionActionArea.vue`
  - Pure display/action component for selected-vs-preview context.
  - Shows current preview version, authoritative selected version, preview status, and explicit select CTA.

- `tests/unit/use-schedule-review-hub.spec.ts`
  - Focused composable tests for canonicalization, preview switching, and explicit select refresh.

- `tests/unit/version-compare-surface.spec.ts`
  - Focused component tests for compare surface rendering and preview-only click events.

- `tests/unit/version-action-area.spec.ts`
  - Focused component tests for preview/selected labels and explicit select CTA state.

## Implementation Notes

- Reuse existing API functions in [src/api/schedule.ts](/Users/brown/workspace/every-shift-mvp/src/api/schedule.ts):
  - `getPhase2ScheduleCompare`
  - `getPhase2ScheduleReview`
  - `selectPhase2ScheduleVersion`
- Do not add backend routes in Slice 7.
- Do not move manual edit, solver start, regenerate, export, recheck, or finalize logic into the new composable unless Step5 becomes simpler without changing behavior.
- Preview changes must be **client-side view state only**:
  - update `scheduleStore.previewVersionId`
  - update the `version` query
  - refresh preview review payload
  - do **not** call `select`
- Only the explicit select CTA may change `selected_version_id`.

### Task 1: Lock Review-Hub State Contract In Tests

**Files:**

- Create: `tests/unit/use-schedule-review-hub.spec.ts`
- Reference: `src/utils/scheduleVersionResolver.ts`
- Reference: `src/api/schedule.ts`

- [ ] **Step 1: Write the failing composable test for compare canonicalization**

```ts
it('hydrates selected and preview from compare and canonicalizes invalid preview queries', async () => {
  route.query = { version: 'missing-version' };
  getPhase2ScheduleCompareMock.mockResolvedValue(
    compareResponse({
      selectedVersionId: 'version-2',
      versions: [version1, version2],
    })
  );
  getPhase2ScheduleReviewMock.mockResolvedValue(reviewResponse('version-2'));

  const hub = await mountUseScheduleReviewHub();

  expect(hub.selectedVersionId.value).toBe('version-2');
  expect(hub.previewVersionId.value).toBe('version-2');
  expect(replaceMock).toHaveBeenCalledWith({
    path: '/schedule/step5/schedule-1',
    query: { version: 'version-2' },
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- tests/unit/use-schedule-review-hub.spec.ts`
Expected: FAIL because `src/composables/useScheduleReviewHub.ts` does not exist yet.

- [ ] **Step 3: Write the failing composable test for preview-only switching**

```ts
it('switches preview without mutating authoritative selection', async () => {
  const hub = await mountUseScheduleReviewHub();

  getPhase2ScheduleReviewMock.mockResolvedValue(reviewResponse('version-1'));
  await hub.setPreviewVersion('version-1');

  expect(scheduleStoreMock.setPreviewVersionId).toHaveBeenCalledWith('version-1');
  expect(replaceMock).toHaveBeenCalledWith({
    path: '/schedule/step5/schedule-1',
    query: { version: 'version-1' },
  });
  expect(selectPhase2ScheduleVersionMock).not.toHaveBeenCalled();
});
```

- [ ] **Step 4: Write the failing composable test for explicit select**

```ts
it('selects the preview version only through the explicit action and refreshes compare/review state', async () => {
  const hub = await mountUseScheduleReviewHub({ previewVersionId: 'version-1' });

  selectPhase2ScheduleVersionMock.mockResolvedValue({
    scheduleId: 'schedule-1',
    selectedVersionId: 'version-1',
  });
  getPhase2ScheduleCompareMock.mockResolvedValue(
    compareResponse({
      selectedVersionId: 'version-1',
      versions: [selectedVersion1, version2],
    })
  );
  getPhase2ScheduleReviewMock.mockResolvedValue(reviewResponse('version-1'));

  await hub.selectPreviewVersion();

  expect(selectPhase2ScheduleVersionMock).toHaveBeenCalledWith('version-1');
  expect(scheduleStoreMock.setSelectedVersionId).toHaveBeenCalledWith('version-1');
});
```

- [ ] **Step 5: Create the minimal composable implementation**

Create `src/composables/useScheduleReviewHub.ts` with a minimal public surface like:

```ts
export function useScheduleReviewHub() {
  const versions = ref<ScheduleVersionSummary[]>([]);
  const review = ref<ScheduleReviewResponse | null>(null);
  const isLoading = ref(false);
  const isSelecting = ref(false);

  const selectedVersionId = computed(() => scheduleStore.selectedVersionId);
  const previewVersionId = computed(() => scheduleStore.previewVersionId);

  async function hydrate() {}
  async function setPreviewVersion(versionId: string) {}
  async function selectPreviewVersion() {}

  return {
    versions,
    review,
    isLoading,
    isSelecting,
    selectedVersionId,
    previewVersionId,
    hydrate,
    setPreviewVersion,
    selectPreviewVersion,
  };
}
```

- [ ] **Step 6: Run composable tests until they pass**

Run: `pnpm test:unit -- tests/unit/use-schedule-review-hub.spec.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add tests/unit/use-schedule-review-hub.spec.ts src/composables/useScheduleReviewHub.ts
git commit -m "feat: add step5 review hub composable"
```

### Task 2: Build The Always-Visible Compare Surface

**Files:**

- Create: `src/components/schedule/review/VersionCompareSurface.vue`
- Create: `tests/unit/version-compare-surface.spec.ts`

- [ ] **Step 1: Write the failing component test for always-visible version cards**

```ts
it('renders every version with preview and selected markers', () => {
  const wrapper = mount(VersionCompareSurface, {
    props: {
      versions: [version1, version2],
      previewVersionId: 'version-1',
      selectedVersionId: 'version-2',
    },
  });

  expect(wrapper.text()).toContain('V1');
  expect(wrapper.text()).toContain('미리보기');
  expect(wrapper.text()).toContain('선택됨');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- tests/unit/version-compare-surface.spec.ts`
Expected: FAIL because the component does not exist yet.

- [ ] **Step 3: Write the failing interaction test for preview-only click**

```ts
it('emits preview change without implying selection', async () => {
  const wrapper = mount(VersionCompareSurface, {
    props: {
      versions: [version1, version2],
      previewVersionId: 'version-2',
      selectedVersionId: 'version-2',
    },
  });

  await wrapper.get('[data-test=\"preview-version-1\"]').trigger('click');

  expect(wrapper.emitted('preview-change')).toEqual([['version-1']]);
});
```

- [ ] **Step 4: Implement the minimal compare surface**

Render a simple card/list that:

- loops through `versions`
- shows `versionNo`, `name`, `status`
- shows compare metrics if `comparisonMetrics` exists
- labels preview, selected, and finalized state
- emits `preview-change` when a non-preview version card is clicked

Minimal template target:

```vue
<button
  v-for="version in versions"
  :key="version.id"
  :data-test="`preview-${version.id}`"
  @click="$emit('preview-change', version.id)"
>
  {{ version.name ?? `V${version.versionNo}` }}
</button>
```

- [ ] **Step 5: Run compare-surface tests until they pass**

Run: `pnpm test:unit -- tests/unit/version-compare-surface.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/schedule/review/VersionCompareSurface.vue tests/unit/version-compare-surface.spec.ts
git commit -m "feat: add step5 version compare surface"
```

### Task 3: Build The Preview/Selected Action Area

**Files:**

- Create: `src/components/schedule/review/VersionActionArea.vue`
- Create: `tests/unit/version-action-area.spec.ts`

- [ ] **Step 1: Write the failing component test for split preview/selected context**

```ts
it('shows preview and selected version labels separately', () => {
  const wrapper = mount(VersionActionArea, {
    props: {
      previewVersion: version1,
      selectedVersion: version2,
      primaryAction: {
        kind: 'select',
        targetVersionId: 'version-1',
        label: 'Select this version as the finalization candidate',
        disabledReason: null,
      },
      selecting: false,
    },
  });

  expect(wrapper.text()).toContain('미리보기 버전');
  expect(wrapper.text()).toContain('선택된 버전');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- tests/unit/version-action-area.spec.ts`
Expected: FAIL because the component does not exist yet.

- [ ] **Step 3: Write the failing test for explicit select CTA exposure**

```ts
it('emits select-preview only when the backend primary action is select', async () => {
  const wrapper = mount(VersionActionArea, {
    props: {
      previewVersion: version1,
      selectedVersion: version2,
      primaryAction: {
        kind: 'select',
        targetVersionId: 'version-1',
        label: 'Select this version as the finalization candidate',
        disabledReason: null,
      },
      selecting: false,
    },
  });

  await wrapper.get('[data-test=\"select-preview-button\"]').trigger('click');

  expect(wrapper.emitted('select-preview')).toEqual([[]]);
});
```

- [ ] **Step 4: Implement the minimal action area**

Render:

- preview summary
- selected summary
- current preview status badge
- explicit select CTA only when `primaryAction.kind === 'select'`

Minimal script contract:

```ts
const canSelectPreview = computed(() => props.primaryAction.kind === 'select');
```

- [ ] **Step 5: Run action-area tests until they pass**

Run: `pnpm test:unit -- tests/unit/version-action-area.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/schedule/review/VersionActionArea.vue tests/unit/version-action-area.spec.ts
git commit -m "feat: add step5 version action area"
```

### Task 4: Integrate The Review Hub Into Step5

**Files:**

- Modify: `src/views/schedule/Step5Result.vue`
- Modify: `tests/unit/step5-result.spec.ts`
- Use existing: `src/composables/useScheduleReviewHub.ts`
- Use existing: `src/components/schedule/review/VersionCompareSurface.vue`
- Use existing: `src/components/schedule/review/VersionActionArea.vue`

- [ ] **Step 1: Write the failing Step5 test for always-visible compare shell**

```ts
it('renders the compare surface above the result grid for all preview states', async () => {
  const wrapper = createWrapper();
  await flushPromises();

  expect(wrapper.find('[data-test=\"version-compare-surface\"]').exists()).toBe(true);
});
```

- [ ] **Step 2: Write the failing Step5 test for preview switching**

```ts
it('changes preview only when a version card is clicked', async () => {
  routeMock.query = { version: 'version-2' };
  const wrapper = createWrapper();
  await flushPromises();

  await wrapper.get('[data-test=\"preview-version-1\"]').trigger('click');

  expect(scheduleStoreMock.setPreviewVersionId).toHaveBeenCalledWith('version-1');
  expect(selectPhase2ScheduleVersionMock).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Write the failing Step5 test for explicit select CTA**

```ts
it('changes authoritative selection only when the explicit select button is clicked', async () => {
  routeMock.query = { version: 'version-1' };
  const wrapper = createWrapper();
  await flushPromises();

  await wrapper.get('[data-test=\"select-preview-button\"]').trigger('click');

  expect(selectPhase2ScheduleVersionMock).toHaveBeenCalledWith('version-1');
});
```

- [ ] **Step 4: Run Step5 tests to verify failure**

Run: `pnpm test:unit -- tests/unit/step5-result.spec.ts`
Expected: FAIL because Step5 does not render the new shell or wire the new events yet.

- [ ] **Step 5: Refactor Step5Result.vue to consume the composable**

Implementation target:

- import and initialize `useScheduleReviewHub`
- replace ad hoc compare sync with `hub.hydrate()`
- use `hub.setPreviewVersion(versionId)` for compare-surface clicks
- use `hub.selectPreviewVersion()` for explicit select
- derive `previewVersionSummary`, `selectedVersionSummary`, and `primaryAction` from `hub.review`
- keep the existing grid/solver/manual-edit code path intact

Minimal integration shape:

```ts
const hub = useScheduleReviewHub();

const review = computed(() => hub.review.value);
const primaryAction = computed(() => review.value?.primaryAction ?? emptyPrimaryAction);

async function handlePreviewVersionChange(versionId: string) {
  await hub.setPreviewVersion(versionId);
}

async function handleSelectPreviewVersion() {
  await hub.selectPreviewVersion();
}
```

- [ ] **Step 6: Update Step5 unit mocks for new review/select API calls**

Add mocks in `tests/unit/step5-result.spec.ts` for:

- `getPhase2ScheduleReview`
- `selectPhase2ScheduleVersion`

Baseline response target:

```ts
getPhase2ScheduleReviewMock.mockResolvedValue({
  scheduleId: 'schedule-1',
  selectedVersionId: 'version-2',
  finalizedVersionId: null,
  version: version2,
  latestEvaluation: null,
  primaryAction: {
    kind: 'none',
    targetVersionId: null,
    label: 'No primary action',
    disabledReason: null,
  },
  defaultTab: 'grid',
});
```

- [ ] **Step 7: Run Step5 tests until they pass**

Run: `pnpm test:unit -- tests/unit/step5-result.spec.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/views/schedule/Step5Result.vue tests/unit/step5-result.spec.ts
git commit -m "feat: convert step5 into review hub shell"
```

### Task 5: Verify The Slice As A Stable Frontend Cut

**Files:**

- Modify if needed: `src/views/schedule/Step5Result.vue`
- Modify if needed: `src/composables/useScheduleReviewHub.ts`
- Modify if needed: `src/components/schedule/review/VersionCompareSurface.vue`
- Modify if needed: `src/components/schedule/review/VersionActionArea.vue`

- [ ] **Step 1: Run the focused Slice 7 unit suite**

Run: `pnpm test:unit -- tests/unit/use-schedule-review-hub.spec.ts tests/unit/version-compare-surface.spec.ts tests/unit/version-action-area.spec.ts tests/unit/step5-result.spec.ts`
Expected: PASS

- [ ] **Step 2: Run lint check required by repo rules**

Run: `pnpm lint:check`
Expected: PASS for modified files, or zero new ESLint errors attributable to Slice 7 changes.

- [ ] **Step 3: If lint fails, fix and rerun**

Run: `pnpm lint:fix`
Expected: ESLint autofixes formatting/import issues only.

Run: `pnpm lint:check`
Expected: PASS

- [ ] **Step 4: Manual browser sanity check**

Run: `pnpm dev`
Expected:

- Step5 opens with compare visible above the grid
- invalid or missing `?version=` self-heals to a canonical preview query
- clicking another version changes preview only
- explicit select updates authoritative selection and refreshes labels

- [ ] **Step 5: Commit final verification fixes**

```bash
git add src/views/schedule/Step5Result.vue src/composables/useScheduleReviewHub.ts src/components/schedule/review/VersionCompareSurface.vue src/components/schedule/review/VersionActionArea.vue tests/unit/use-schedule-review-hub.spec.ts tests/unit/version-compare-surface.spec.ts tests/unit/version-action-area.spec.ts tests/unit/step5-result.spec.ts
git commit -m "test: verify slice7 review hub shell"
```

## Acceptance Checklist

- [ ] Compare surface is visible at the top of Step5 in every Step5 state
- [ ] Preview version and selected version are displayed as separate concepts
- [ ] Clicking a version changes preview only
- [ ] Only the explicit select CTA mutates authoritative selection
- [ ] Missing/invalid `version` query canonicalizes to the backend-selected preview fallback
- [ ] Step5 still loads assignments/preferences by `previewVersionId`
- [ ] Existing solver/manual-edit/export/save behaviors remain intact for the preview version
- [ ] Slice 7 introduces no backend/schema changes
- [ ] `pnpm lint:check` is green before handoff

## Risks To Watch During Execution

- Step5 is already large, so do not mix shell refactor and behavior rewrites in one commit.
- The store already persists `previewVersionId`; preserve that contract and let the query remain the source of deep-link state.
- Do not accidentally call `select` from preview-card clicks. That is the most important Slice 7 invariant.
- Do not let review-hub loading regress existing solver polling recovery logic in Step5.

## Handoff

Plan complete. Preferred execution order is Task 1 -> Task 2 -> Task 3 -> Task 4 -> Task 5 with TDD and a commit after each task.
