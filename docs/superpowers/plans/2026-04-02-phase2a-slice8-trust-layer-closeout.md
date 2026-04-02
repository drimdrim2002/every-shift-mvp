# Phase2A Slice 8 Trust Layer Closeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the locked Phase2A Slice 8 scope by making Step5 fully state-driven, blocking Step3 employee resave for finalized months, and adding the missing Trust Layer regression coverage.

**Architecture:** Keep the Slice 7 compare/selection plumbing intact and close Slice 8 with thin, testable additions around it. The main approach is: extract pure review-state mapping into a small utility, render a dedicated Step5 detail component on top of the existing review hub shell, use existing `recheck`/`finalize` endpoints instead of new backend routes, and add only the minimum Trust Layer contract adjustment needed for the `solve_failed` failure panel to show real backend failure details.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Pinia, Naive UI, Tailwind CSS, Vitest, Playwright, Supabase Edge Functions

---

## Scope Lock

This plan only covers the locked Slice 8 work from [docs/plans/PHASE2A_EXECUTION_SLICES.md](/Users/brown/workspace/every-shift-mvp/docs/plans/PHASE2A_EXECUTION_SLICES.md) and the corresponding Step5/Step3 rules in [docs/prd/PHASE2_ENGINEERING_SPEC.md](/Users/brown/workspace/every-shift-mvp/docs/prd/PHASE2_ENGINEERING_SPEC.md).

In scope:

- Step5 default detail panels by version status
- one visually primary CTA at a time
- common failure panel inside the Step5 frame
- Step3 finalized-month resave protection
- automated unit/E2E regression coverage for Trust Layer behavior

Out of scope:

- metadata/dashboard/logging expansion
- fairness ledger work
- finalized month reopen UI
- Phase2B behavior

## Requirements Analysis

Slice 8 is not “another Step5 refactor.” It is the closeout slice that finishes behavior already implied by Slices 3-7:

- `Step5Result.vue` already has compare + preview/selected plumbing, but it still behaves like the legacy result screen.
- `VersionActionArea.vue` only renders the `select` CTA, so `recheck`, `finalize`, and `retry` are not exposed even though the backend routes already exist.
- `useScheduleReviewHub()` persists `reviewTab`, but the backend currently returns `defaultTab: 'grid'` for every state, so the final panel-priority rules are not implemented.
- `Step3EmployeeInfo.vue` still hard-deletes current-month schedules on employee resave, which directly violates the Phase2A rule to block resave when a finalized version exists.
- `solve_failed` needs an operator-facing failure panel, but the current review payload does not preserve structured failure details in a reusable way. The lowest-risk fix is to persist failure summary/details inside the existing evaluation artifact instead of inventing a new schema surface.

## Read Before Implementing

- [docs/plans/PHASE2A_EXECUTION_SLICES.md](/Users/brown/workspace/every-shift-mvp/docs/plans/PHASE2A_EXECUTION_SLICES.md)
- [docs/prd/PHASE2_ENGINEERING_SPEC.md](/Users/brown/workspace/every-shift-mvp/docs/prd/PHASE2_ENGINEERING_SPEC.md)
- [src/views/schedule/Step5Result.vue](/Users/brown/workspace/every-shift-mvp/src/views/schedule/Step5Result.vue)
- [src/components/schedule/review/VersionActionArea.vue](/Users/brown/workspace/every-shift-mvp/src/components/schedule/review/VersionActionArea.vue)
- [src/composables/useScheduleReviewHub.ts](/Users/brown/workspace/every-shift-mvp/src/composables/useScheduleReviewHub.ts)
- [src/views/schedule/Step3EmployeeInfo.vue](/Users/brown/workspace/every-shift-mvp/src/views/schedule/Step3EmployeeInfo.vue)
- [tests/unit/useAISolver.spec.ts](/Users/brown/workspace/every-shift-mvp/tests/unit/useAISolver.spec.ts)

## File Structure

- Create: `src/utils/scheduleReviewState.ts`
  Responsibility: Pure Slice 8 reducer helpers for default tab, lead panel, CTA explanation, and selected-gate copy. Keep this logic out of the already-large `Step5Result.vue`.
- Create: `src/components/schedule/review/VersionReviewDetail.vue`
  Responsibility: Render the preview-driven detail area, including the lead panel for `review_pending`, `review_blocked`, `infeasible`, and `solve_failed`, plus tabs for grid/proof/off-requests.
- Modify: `src/views/schedule/Step5Result.vue`
  Responsibility: Remove legacy “single result page” assumptions, wire the new detail component, execute the single primary CTA (`select` / `recheck` / `finalize` / `retry`), and keep `reviewTab` synced when preview changes.
- Modify: `src/components/schedule/review/VersionActionArea.vue`
  Responsibility: Render exactly one primary button for the current action kind and show the selected gate/blocking explanation beside it.
- Modify: `src/utils/scheduleReviewCopy.ts`
  Responsibility: Add any missing Korean labels/copy helpers needed by the new panels and CTA explanations without duplicating strings across components.
- Modify: `src/views/schedule/Step3EmployeeInfo.vue`
  Responsibility: Check Trust Layer compare state before destructive employee resave, block finalized months, and require explicit confirmation when only draft/unfinalized versions exist.
- Modify: `supabase/functions/phase2-schedule/engine.ts`
  Responsibility: Persist structured `solve_failed` summary/details inside the evaluation artifact so the Step5 failure panel can show backend truth after refresh/re-entry.
- Create: `tests/unit/schedule-review.spec.ts`
  Responsibility: Lock pure reducer behavior for panel priority, default tab selection, and CTA explanation.
- Modify: `tests/unit/useAISolver.spec.ts`
  Responsibility: Lock solver failure/retry payload behavior so the failure panel has stable data to render.
- Modify: `tests/e2e/helpers.ts`
  Responsibility: Replace stale Step3/Step5 helpers with current wizard-navigation helpers that can enter Step5 with Trust Layer route fixtures.
- Create: `tests/e2e/step5-review-hub.spec.ts`
  Responsibility: Cover Slice 8 review hub behavior with deterministic mocked Trust Layer responses.
- Modify: `tests/e2e/schedule-workflow.spec.ts`
  Responsibility: Update the stale workflow expectations to current Step3/Step5 surfaces and add finalized-month guard coverage.

## Implementation Notes

- Do not add new schema or migration files for Slice 8.
- Do not move selection/finalization authority back into the frontend.
- Do not add more Pinia state unless the existing `reviewTab`, `selectedVersionId`, and `previewVersionId` are insufficient.
- Keep Step5 query-param behavior unchanged: preview-only, never authoritative selection.
- For `solve_failed`, reuse the existing evaluation artifact path instead of inventing a second backend store for failure UI state.

### Task 1: Lock Review-State Mapping and Failure Payload

**Files:**

- Create: `src/utils/scheduleReviewState.ts`
- Modify: `src/utils/scheduleReviewCopy.ts`
- Modify: `supabase/functions/phase2-schedule/engine.ts`
- Create: `tests/unit/schedule-review.spec.ts`
- Test: `tests/unit/useAISolver.spec.ts`

- [ ] **Step 1: Write the failing review-state unit tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  resolveReviewLeadPanel,
  resolveDefaultReviewTab,
  buildPrimaryActionSupportCopy,
} from '@/utils/scheduleReviewState';

describe('scheduleReviewState', () => {
  it('maps each Slice 8 status to the correct lead panel', () => {
    expect(resolveReviewLeadPanel('review_ready')).toBe('grid');
    expect(resolveReviewLeadPanel('finalized')).toBe('grid');
    expect(resolveReviewLeadPanel('review_pending')).toBe('pending');
    expect(resolveReviewLeadPanel('review_blocked')).toBe('proof');
    expect(resolveReviewLeadPanel('infeasible')).toBe('infeasible');
    expect(resolveReviewLeadPanel('solve_failed')).toBe('failure');
  });

  it('defaults review_blocked to the proof tab and all other states to grid', () => {
    expect(resolveDefaultReviewTab('review_blocked')).toBe('proof');
    expect(resolveDefaultReviewTab('review_pending')).toBe('grid');
    expect(resolveDefaultReviewTab('solve_failed')).toBe('grid');
  });
});
```

- [ ] **Step 2: Run the unit tests to verify they fail**

Run: `pnpm test:unit -- tests/unit/schedule-review.spec.ts`

Expected: FAIL because `src/utils/scheduleReviewState.ts` does not exist yet.

- [ ] **Step 3: Write the failing solver failure-payload regression**

```ts
it('persists failure context so Step5 can show operator-facing retry details', async () => {
  vi.mocked(getSolverStatus).mockResolvedValue({
    execution_id: 'exec-fail',
    status: 'FAILED',
    error_message: 'solver crashed',
    failure_type: 'worker_crash',
    failure_context: { traceId: 'trace-123' },
    score: null,
    result: null,
  });

  const solver = useAISolver();
  solver.status.value = 'running';
  solver.startPolling('exec-fail', 'version-8');

  await vi.advanceTimersByTimeAsync(10000);
  await flushPromises();

  expect(submitPhase2ScheduleVersionSolverResult).toHaveBeenCalledWith('version-8', {
    status: 'failed',
    solverExecutionId: 'exec-fail',
    assignments: [],
    score: null,
    failureReason: 'solver crashed',
    failureType: 'worker_crash',
    failureContext: { traceId: 'trace-123' },
  });
});
```

- [ ] **Step 4: Run the solver unit test to verify it fails if the payload regresses**

Run: `pnpm test:unit -- tests/unit/useAISolver.spec.ts`

Expected: PASS today or fail only if current payload handling is incomplete. If it already passes, keep the test as the lock for later Slice 8 work.

- [ ] **Step 5: Implement the minimal reducer and failure-payload support**

```ts
// src/utils/scheduleReviewState.ts
import type {
  ScheduleEvaluation,
  ScheduleFinalizationGate,
  SchedulePrimaryAction,
  ScheduleReviewTab,
  ScheduleVersionStatus,
} from '@/types/schedule';

export type ReviewLeadPanel = 'grid' | 'pending' | 'proof' | 'infeasible' | 'failure';

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
  if (args.action.disabledReason) return args.action.disabledReason;
  if (args.action.kind === 'none' && args.gate?.blockingReasons.length) {
    return args.gate.blockingReasons[0]?.message ?? null;
  }
  return null;
}
```

```ts
// supabase/functions/phase2-schedule/engine.ts
const shouldExposeFailureDetails = resultStatus === 'infeasible' || resultStatus === 'solve_failed';

const infeasibility = shouldExposeFailureDetails
  ? {
      summary: getFailureSummary(
        input.failureReason,
        resultStatus === 'solve_failed'
          ? 'Solver execution failed for this version.'
          : 'No feasible schedule exists for the current input.'
      ),
      reason: input.failureType ?? resultStatus,
      details: input.failureContext ?? {},
    }
  : null;
```

- [ ] **Step 6: Run the targeted unit tests**

Run: `pnpm test:unit -- tests/unit/schedule-review.spec.ts tests/unit/useAISolver.spec.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/utils/scheduleReviewState.ts src/utils/scheduleReviewCopy.ts supabase/functions/phase2-schedule/engine.ts tests/unit/schedule-review.spec.ts tests/unit/useAISolver.spec.ts
git commit -m "feat: lock slice8 review state mapping"
```

### Task 2: Build the Final Step5 Detail Area and Primary CTA Flow

**Files:**

- Create: `src/components/schedule/review/VersionReviewDetail.vue`
- Modify: `src/components/schedule/review/VersionActionArea.vue`
- Modify: `src/views/schedule/Step5Result.vue`
- Test: `tests/unit/schedule-review.spec.ts`

- [ ] **Step 1: Add failing unit coverage for CTA rendering and tab defaults**

```ts
import { mount } from '@vue/test-utils';
import VersionActionArea from '@/components/schedule/review/VersionActionArea.vue';

it('renders only one primary CTA for finalize', () => {
  const wrapper = mount(VersionActionArea, {
    props: {
      previewVersion: createVersionSummary('version-2', 2, { status: 'review_ready' }),
      selectedVersion: createVersionSummary('version-2', 2, { status: 'review_ready' }),
      primaryAction: {
        kind: 'finalize',
        targetVersionId: 'version-2',
        label: '이 버전 확정',
        disabledReason: null,
      },
      supportCopy: null,
      selecting: false,
      acting: false,
    },
  });

  expect(wrapper.text()).toContain('이 버전 확정');
  expect(wrapper.find('[data-test="primary-action-button"]').exists()).toBe(true);
  expect(wrapper.find('[data-test="select-preview-button"]').exists()).toBe(false);
});
```

- [ ] **Step 2: Run the targeted unit test and confirm it fails**

Run: `pnpm test:unit -- tests/unit/schedule-review.spec.ts`

Expected: FAIL because `VersionActionArea.vue` does not yet support `acting`, `supportCopy`, or the generalized primary button.

- [ ] **Step 3: Implement the dedicated detail component**

```vue
<!-- src/components/schedule/review/VersionReviewDetail.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { NTabs, NTabPane, NAlert, NCard, NDescriptions, NDescriptionsItem } from 'naive-ui';
import { resolveReviewLeadPanel } from '@/utils/scheduleReviewState';
import type { ScheduleReviewResponse, ScheduleReviewTab } from '@/types/schedule';

const props = defineProps<{
  review: ScheduleReviewResponse | null;
  activeTab: ScheduleReviewTab;
}>();

const emit = defineEmits<{
  (event: 'update:tab', tab: ScheduleReviewTab): void;
}>();

const leadPanel = computed(() => {
  return props.review ? resolveReviewLeadPanel(props.review.version.status) : 'grid';
});
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-4">
    <div v-if="leadPanel === 'pending'" class="mb-4">
      <n-alert type="warning">재검토 전에는 확정할 수 없습니다.</n-alert>
    </div>
    <div v-else-if="leadPanel === 'proof'" class="mb-4">
      <n-card title="하드 제약 위반 요약">...</n-card>
    </div>
    <div v-else-if="leadPanel === 'infeasible'" class="mb-4">
      <n-alert type="error">생성 불가 사유와 입력 조건을 확인하세요.</n-alert>
    </div>
    <div v-else-if="leadPanel === 'failure'" class="mb-4">
      <n-alert type="error">실패 사유와 trace id를 확인한 뒤 다시 생성하세요.</n-alert>
    </div>

    <n-tabs :value="activeTab" type="line" @update:value="emit('update:tab', $event)">
      <n-tab-pane name="grid" tab="배정표"><slot name="grid" /></n-tab-pane>
      <n-tab-pane name="proof" tab="하드 제약"><slot name="proof" /></n-tab-pane>
      <n-tab-pane name="offRequests" tab="Off 요청"><slot name="offRequests" /></n-tab-pane>
    </n-tabs>
  </section>
</template>
```

- [ ] **Step 4: Generalize `VersionActionArea.vue` to one primary CTA**

```vue
<script setup lang="ts">
const props = defineProps<{
  previewVersion: ScheduleVersionSummary | null;
  selectedVersion: ScheduleVersionSummary | null;
  primaryAction: SchedulePrimaryAction;
  supportCopy: string | null;
  selecting: boolean;
  acting: boolean;
}>();

const emit = defineEmits<{
  (event: 'primary-action'): void;
}>();

const isPrimaryVisible = computed(() => props.primaryAction.kind !== 'none');
</script>

<template>
  <button
    v-if="isPrimaryVisible"
    data-test="primary-action-button"
    type="button"
    class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-300"
    :disabled="selecting || acting || !!primaryAction.disabledReason"
    @click="emit('primary-action')"
  >
    {{ primaryActionLabel }}
  </button>
  <p v-if="supportCopy" class="text-xs text-amber-700">{{ supportCopy }}</p>
</template>
```

- [ ] **Step 5: Integrate the detail component and CTA dispatcher into `Step5Result.vue`**

```ts
import { finalizePhase2ScheduleVersion, recheckPhase2ScheduleVersion } from '@/api/schedule';
import {
  buildPrimaryActionSupportCopy,
  resolveDefaultReviewTab,
} from '@/utils/scheduleReviewState';

const isPrimaryActionRunning = ref(false);

const activeReviewTab = computed(() => scheduleStore.reviewTab);
const selectedGate = computed(() => selectedVersionSummary.value?.finalizationGate ?? null);
const primaryActionSupportCopy = computed(() => {
  return buildPrimaryActionSupportCopy({
    action: primaryAction.value,
    gate: selectedGate.value,
    latestEvaluation: review.value?.latestEvaluation ?? null,
  });
});

async function handlePrimaryAction() {
  if (isPrimaryActionRunning.value) return;
  isPrimaryActionRunning.value = true;

  try {
    switch (primaryAction.value.kind) {
      case 'select':
        await hub.selectPreviewVersion();
        break;
      case 'recheck':
        await recheckPhase2ScheduleVersion(primaryAction.value.targetVersionId!);
        break;
      case 'finalize':
        await finalizePhase2ScheduleVersion(primaryAction.value.targetVersionId!);
        break;
      case 'retry':
        await handleStartSolver();
        break;
      default:
        return;
    }

    await hub.hydrate();
    scheduleStore.setReviewTab(
      resolveDefaultReviewTab(review.value?.version.status ?? 'review_ready')
    );
    await syncPreviewWorkspace({
      syncOriginal: true,
      clearChanges: true,
      forceAssignmentSync: true,
    });
  } finally {
    isPrimaryActionRunning.value = false;
  }
}
```

- [ ] **Step 6: Run the targeted unit tests**

Run: `pnpm test:unit -- tests/unit/schedule-review.spec.ts tests/unit/use-schedule-review-hub.spec.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/schedule/review/VersionReviewDetail.vue src/components/schedule/review/VersionActionArea.vue src/views/schedule/Step5Result.vue tests/unit/schedule-review.spec.ts
git commit -m "feat: complete slice8 step5 review detail flow"
```

### Task 3: Add Finalized-Month Guard to Step3 Employee Resave

**Files:**

- Modify: `src/views/schedule/Step3EmployeeInfo.vue`
- Modify: `tests/e2e/helpers.ts`
- Test: `tests/e2e/schedule-workflow.spec.ts`

- [ ] **Step 1: Write the failing workflow guard test**

```ts
test('Step3 blocks employee resave when the month already has a finalized version', async ({
  page,
}) => {
  await login(page);
  await completeStep1(page);
  await completeStep2(page, [{ dayOfWeek: 1, D: 1, E: 0, N: 0, O: 0 }]);

  await page.route('**/functions/v1/phase2-schedule/schedules/*/compare', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        scheduleId: 'schedule-finalized',
        selectedVersionId: 'version-2',
        finalizedVersionId: 'version-2',
        activeSolvingVersionId: null,
        versions: [],
      }),
    });
  });

  await page.getByRole('button', { name: '+ 직원 추가' }).click();
  await page.locator('input[placeholder="직원 이름 입력"]').fill('테스트 간호사');
  await page.getByRole('button', { name: '추가' }).click();
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page.locator('.n-message')).toContainText(
    '확정된 근무표가 있어 직원 정보를 다시 저장할 수 없습니다'
  );
});
```

- [ ] **Step 2: Run the workflow spec and confirm it fails**

Run: `pnpm test:e2e -- tests/e2e/schedule-workflow.spec.ts`

Expected: FAIL because `Step3EmployeeInfo.vue` currently deletes current-month schedules without checking `finalizedVersionId`.

- [ ] **Step 3: Implement the finalized-month guard and draft invalidation confirmation**

```ts
async function loadCurrentMonthTrustState() {
  const targetSchedule = await getTargetScheduleForNextStep();
  if (!targetSchedule?.id) return null;

  return getPhase2ScheduleCompare(targetSchedule.id);
}

async function handleSave() {
  const trustState = await loadCurrentMonthTrustState();

  if (trustState?.finalizedVersionId) {
    showError(
      '확정된 근무표가 있어 직원 정보를 다시 저장할 수 없습니다. 새 월로 진행하거나 확정 해제 정책이 추가될 때까지 유지해주세요.'
    );
    return;
  }

  if (trustState?.versions.length) {
    const confirmed = await new Promise<boolean>((resolve) => {
      window.$dialog?.warning({
        title: '현재 월 초안 무효화',
        content:
          '직원 정보를 다시 저장하면 현재 월의 미확정 버전과 비교 상태가 무효화됩니다. 계속하시겠습니까?',
        positiveText: '계속',
        negativeText: '취소',
        onPositiveClick: () => resolve(true),
        onNegativeClick: () => resolve(false),
      });
    });

    if (!confirmed) return;
  }

  // existing destructive save flow continues here
}
```

- [ ] **Step 4: Run the updated workflow spec**

Run: `pnpm test:e2e -- tests/e2e/schedule-workflow.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/views/schedule/Step3EmployeeInfo.vue tests/e2e/schedule-workflow.spec.ts
git commit -m "feat: guard finalized months from step3 resave"
```

### Task 4: Add Slice 8 Step5 Regression Coverage

**Files:**

- Modify: `tests/e2e/helpers.ts`
- Create: `tests/e2e/step5-review-hub.spec.ts`
- Modify: `tests/e2e/schedule-workflow.spec.ts`
- Test: `tests/unit/schedule-review.spec.ts`

- [ ] **Step 1: Write the failing Step5 regression spec**

```ts
test.describe('Step5 review hub trust layer', () => {
  test('preview switching does not change authoritative selection', async ({ page }) => {
    await login(page);
    await enterStep5ReviewHub(page, {
      compare: createCompareResponse('version-2', ['version-1', 'version-2']),
      reviews: {
        'version-1': createReviewResponse('version-1', 'review_blocked'),
        'version-2': createReviewResponse('version-2', 'review_ready'),
      },
    });

    await page.locator('[data-test="preview-version-1"]').click();

    await expect(page.getByText('선택된 버전')).toContainText('V2');
    await expect(page.getByText('미리보기 버전')).toContainText('V1');
    await expect(page.locator('[data-test="primary-action-button"]')).toContainText(
      '이 버전을 선택'
    );
  });

  test('review_blocked opens proof first, solve_failed stays inside shared frame, finalize runs only for selected allowed version', async ({
    page,
  }) => {
    // mock GET compare/review and POST select/recheck/finalize
    // assert panel priority, CTA transitions, and no selection mutation from query-only changes
  });
});
```

- [ ] **Step 2: Run the new Step5 E2E spec and confirm it fails**

Run: `pnpm test:e2e -- tests/e2e/step5-review-hub.spec.ts`

Expected: FAIL because the current Step5 screen does not render the Slice 8 detail panels or the generalized CTA flow.

- [ ] **Step 3: Implement deterministic route mocks and the full regression matrix**

```ts
// tests/e2e/step5-review-hub.spec.ts
// tests/e2e/helpers.ts
export async function enterStep5ReviewHub(page: Page, fixtures: TrustLayerFixtures) {
  await mockTrustLayerRoutes(page, fixtures);
  await completeStep1(page);
  await completeStep2(page, [{ dayOfWeek: 1, D: 1, E: 0, N: 0, O: 0 }]);
  await addEmployee(page, { name: '테스트 간호사' });
  await page.getByRole('button', { name: '저장' }).click();
  await page.getByRole('button', { name: '다음 단계 →' }).click();
  await fillInitialDataGrid(page);
  await page.getByRole('button', { name: /결과 확인|생성/ }).click();
  await page.waitForURL(/\/schedule\/step5\/.+/);
}

export async function mockTrustLayerRoutes(page: Page, fixtures: TrustLayerFixtures) {
  await page.route('**/functions/v1/phase2-schedule/schedules/*/compare', async (route) => {
    await route.fulfill(json(fixtures.compare));
  });

  await page.route('**/functions/v1/phase2-schedule/schedule-versions/*/review', async (route) => {
    const versionId = route.request().url().split('/').at(-2)!;
    await route.fulfill(json(fixtures.reviews[versionId]));
  });

  await page.route('**/functions/v1/phase2-schedule/schedule-versions/*/select', async (route) => {
    fixtures.selectedVersionId = fixtures.nextSelectedVersionId;
    await route.fulfill(
      json({ scheduleId: 'schedule-1', selectedVersionId: fixtures.selectedVersionId })
    );
  });
}
```

Required assertions:

- `review_ready`, `finalized`, `review_pending`, `review_blocked`, `infeasible`, `solve_failed` each open the correct lead panel
- only one primary CTA is styled primary at a time
- `preview` switching changes only the query/view state
- `select` is explicit and updates the authoritative selected version
- `recheck` transitions a blocked/pending selected version back through the review API
- `finalize` is only offered for the selected version when the gate is allowed
- the failure panel stays inside the shared Step5 frame and shows backend failure summary/trace id

- [ ] **Step 4: Run the Slice 8 regression suite**

Run: `pnpm test:unit -- tests/unit/schedule-review.spec.ts tests/unit/useAISolver.spec.ts tests/unit/use-schedule-review-hub.spec.ts`

Expected: PASS

Run: `pnpm test:e2e -- tests/e2e/step5-review-hub.spec.ts tests/e2e/schedule-workflow.spec.ts`

Expected: PASS

- [ ] **Step 5: Run repository lint**

Run: `pnpm lint:check`

Expected: PASS with no new ESLint errors

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/helpers.ts tests/e2e/step5-review-hub.spec.ts tests/e2e/schedule-workflow.spec.ts tests/unit/schedule-review.spec.ts tests/unit/useAISolver.spec.ts tests/unit/use-schedule-review-hub.spec.ts
git commit -m "test: cover slice8 trust layer regressions"
```

## Final Verification Checklist

- [ ] Step5 compare surface remains visible for all states
- [ ] Preview changes never mutate authoritative selection
- [ ] Only explicit select updates `selected_version_id`
- [ ] `review_ready`, `finalized`, `review_pending`, `review_blocked`, `infeasible`, `solve_failed` each open the correct lead panel
- [ ] Exactly one CTA is visually primary at a time
- [ ] `solve_failed` panel renders backend failure summary and operator-facing trace id when available
- [ ] Step3 blocks employee resave when `finalizedVersionId` exists
- [ ] Unfinalized current-month drafts require confirmation before invalidation
- [ ] `pnpm test:unit` targeted Slice 8 suite passes
- [ ] `pnpm test:e2e` targeted Slice 8 suite passes
- [ ] `pnpm lint:check` passes

## Risks to Watch During Execution

- `Step5Result.vue` is already large. If edits start spreading solver/review/panel logic across multiple unrelated watchers, stop and move pure presentation logic back into `src/utils/scheduleReviewState.ts`.
- The current E2E helpers are stale relative to the present Step3/Step5 UI. Update the tests to today’s screens instead of fighting old helper assumptions.
- If the backend review payload still cannot express `solve_failed` details cleanly after the `engine.ts` adjustment, stop and add a small non-breaking review-contract field rather than hiding missing data in the UI.

## Recommended Execution Order

1. Task 1: lock reducer + failure payload first
2. Task 2: finish Step5 UI behavior
3. Task 3: add Step3 finalized guard
4. Task 4: close the regression suite and lint gate
