# Step5 Rolling History Backfill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When 4월 근무표를 생성할 때, Step5가 이미 확정된 3월 말 rolling history를 보여주고 AI solver 요청의 `history`에도 같은 기간의 확정 근무 내역을 포함하도록 만든다.

**Architecture:** Keep the existing solver request schema and the current MVP rolling contract (`lastMonthDays` / `publishLength`, max 5 days). Add a frontend helper that resolves the previous month’s `finalized_version_id` and fetches both display assignments and planning assignments for that finalized version. Step5 uses that finalized-month data as fallback only when the current preview version does not already carry previous-month rows, and `solverMapper` clamps `history` to the same rolling window so the screen and the solver always see the same carry-over period.

**Tech Stack:** Vue 3, TypeScript, Pinia, Naive UI, Supabase JS, Day.js, Vitest, Tailwind CSS

---

## Scope And Decisions

- This plan only changes Step5 rolling history behavior and the solver request contents.
- Do not change Supabase schema, Edge Function contracts, or the solver JSON shape.
- Keep the current MVP window semantics: `lastMonthDays` remains `0..5`. Do not reinterpret this feature as a true 7-day calendar week in this patch.
- Use the previous month’s `finalized_version_id` as the fallback source. Do not use draft, solving, or `review_ready` versions from the previous month.
- Current preview-version rows remain authoritative. If the preview version already has previous-month assignments, they win over the fallback finalized-month rows.
- Step5 display may include `O` because it is a real stored assignment. Solver `history` must keep excluding `O`, matching the intent shown in `data/request.json`.
- If there is no previous-month finalized schedule, keep today’s behavior and send an empty rolling fallback.
- If the previous-month lookup fails because of a real query error, surface the error and block AI start until the user retries; silent omission would generate with the wrong context.

## Current Breakpoint

These are the exact places where the feature currently stops:

- `src/views/schedule/Step5Result.vue`
  - `loadCurrentAssignments()` only splits assignments already stored on the current preview version.
  - `buildSolverRequest()` only loads `getPlanningAssignmentsForVersion(previewVersionId)`.
- `src/utils/solverMapper.ts`
  - `history` is built only from the passed assignment list and is filtered only by `date < firstDraftDate`, so a full previous-month fallback would leak the whole month into `history`.
- `src/api/schedule.ts`
  - There is no helper that resolves “previous month finalized version + its assignments” for rolling carry-over.

## File Map

### Modify

- `src/views/schedule/Step5Result.vue`
  - Load previous-month finalized fallback once per month.
  - Merge fallback display rows into `previousMonthAssignments` only when the preview version is missing those dates.
  - Pass fallback planning rows into the solver request builder.
  - Add a stable `data-test="start-solver-button"` hook to the AI start button for Step5 tests.
  - Prevent AI start if the previous-month fallback query failed.
- `src/api/schedule.ts`
  - Add a helper that finds the previous month schedule by `organization_id + month`, requires `finalized_version_id`, and fetches both display/planning assignments for that version.
- `src/utils/solverMapper.ts`
  - Clamp solver `history` to the rolling window (`lastHistoricalDate < date < firstDraftDate`).
  - Merge current-version planning rows with finalized fallback planning rows while preserving preview-version precedence.
- `src/types/schedule.ts`
  - Add the typed return shape for previous-month finalized context if it improves call-site safety.
- `tests/unit/solver-mapper.spec.ts`
  - Add coverage for fallback rolling rows, dedupe precedence, date-window clamping, and `O` exclusion.
- `tests/unit/step5-result.spec.ts`
  - Add coverage for fallback display rendering and fallback solver-request wiring.

### Create

- `src/utils/rollingHistory.ts`
  - Single source of truth for rolling-window date math and fallback merge helpers.
- `tests/unit/rolling-history.spec.ts`
  - Unit tests for date-window math and merge precedence.
- `tests/unit/phase2-schedule-rolling-history-api.spec.ts`
  - Focused tests for previous-month finalized lookup behavior in `src/api/schedule.ts`.

### Reference Only

- `data/request.json`
  - Use as the payload-shape sanity reference for `history` semantics. Do not change the contract in this implementation.

## Task 1: Centralize Rolling Window Math And Merge Rules

**Files:**

- Create: `src/utils/rollingHistory.ts`
- Test: `tests/unit/rolling-history.spec.ts`

- [ ] **Step 1: Write the failing utility tests**

```ts
import {
  buildRollingHistoryWindow,
  mergeAssignmentMapsWithFallback,
  mergePlanningAssignmentsWithFallback,
} from '@/utils/rollingHistory';

it('builds the exact previous-month carry-over window from month + lastMonthDays', () => {
  expect(buildRollingHistoryWindow('2025-04', 5)).toEqual({
    firstDraftDate: '2025-04-01',
    lastHistoricalDate: '2025-03-26',
    publishLength: 5,
    previousMonthDates: ['2025-03-27', '2025-03-28', '2025-03-29', '2025-03-30', '2025-03-31'],
  });
});

it('keeps preview-version rows authoritative when fallback and current rows overlap', () => {
  expect(
    mergePlanningAssignmentsWithFallback(
      [{ employee_id: 'emp-1', shift_id: 'shift-e', date: '2025-03-31', is_locked: false }],
      [
        { employee_id: 'emp-1', shift_id: 'shift-d', date: '2025-03-31', is_locked: true },
        { employee_id: 'emp-1', shift_id: 'shift-n', date: '2025-03-30', is_locked: true },
      ],
      buildRollingHistoryWindow('2025-04', 5)
    )
  ).toEqual([
    { employee_id: 'emp-1', shift_id: 'shift-n', date: '2025-03-30', is_locked: true },
    { employee_id: 'emp-1', shift_id: 'shift-e', date: '2025-03-31', is_locked: false },
  ]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:unit -- tests/unit/rolling-history.spec.ts`
Expected: FAIL with missing `rollingHistory` module and exports.

- [ ] **Step 3: Write the minimal implementation**

```ts
import dayjs from 'dayjs';
import type { AssignmentMap, PlanningAssignment } from '@/types/schedule';

export interface RollingHistoryWindow {
  firstDraftDate: string;
  lastHistoricalDate: string;
  publishLength: number;
  previousMonthDates: string[];
}

export function buildRollingHistoryWindow(
  month: string,
  lastMonthDays: number
): RollingHistoryWindow {
  const firstDraftDate = dayjs(`${month}-01`).format('YYYY-MM-DD');
  const publishLength = Math.max(0, Math.floor(lastMonthDays));
  const lastHistoricalDate = dayjs(firstDraftDate)
    .subtract(publishLength + 1, 'day')
    .format('YYYY-MM-DD');

  const previousMonthDates = Array.from({ length: publishLength }, (_, index) =>
    dayjs(firstDraftDate)
      .subtract(publishLength - index, 'day')
      .format('YYYY-MM-DD')
  );

  return {
    firstDraftDate,
    lastHistoricalDate,
    publishLength,
    previousMonthDates,
  };
}

export function mergeAssignmentMapsWithFallback(
  currentPreviousAssignments: AssignmentMap,
  fallbackPreviousAssignments: AssignmentMap,
  allowedDates: string[]
): AssignmentMap {
  const allowed = new Set(allowedDates);
  const merged: AssignmentMap = JSON.parse(JSON.stringify(fallbackPreviousAssignments || {}));

  for (const [employeeId, dateMap] of Object.entries(currentPreviousAssignments || {})) {
    if (!merged[employeeId]) merged[employeeId] = {};
    for (const [date, shiftCode] of Object.entries(dateMap || {})) {
      if (!allowed.has(date) || !shiftCode) continue;
      merged[employeeId]![date] = shiftCode;
    }
  }

  return Object.fromEntries(
    Object.entries(merged).map(([employeeId, dateMap]) => [
      employeeId,
      Object.fromEntries(
        Object.entries(dateMap || {}).filter(
          ([date, shiftCode]) => allowed.has(date) && Boolean(shiftCode)
        )
      ),
    ])
  );
}

export function mergePlanningAssignmentsWithFallback(
  currentAssignments: PlanningAssignment[],
  fallbackAssignments: PlanningAssignment[],
  window: RollingHistoryWindow
): PlanningAssignment[] {
  const allowed = new Set(window.previousMonthDates);
  const merged = new Map<string, PlanningAssignment>();

  for (const row of fallbackAssignments) {
    if (!allowed.has(row.date)) continue;
    merged.set(`${row.employee_id}:${row.date}`, row);
  }

  for (const row of currentAssignments) {
    if (!allowed.has(row.date)) continue;
    merged.set(`${row.employee_id}:${row.date}`, row);
  }

  return Array.from(merged.values()).sort((left, right) => {
    if (left.date === right.date) return left.employee_id.localeCompare(right.employee_id);
    return left.date.localeCompare(right.date);
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:unit -- tests/unit/rolling-history.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/unit/rolling-history.spec.ts src/utils/rollingHistory.ts
git commit -m "feat: add rolling history window helpers"
```

## Task 2: Add Previous-Month Finalized Lookup Helper

**Files:**

- Modify: `src/api/schedule.ts`
- Modify: `src/types/schedule.ts`
- Test: `tests/unit/phase2-schedule-rolling-history-api.spec.ts`

- [ ] **Step 1: Write the failing API helper tests**

```ts
it('returns null when the previous month exists but has no finalized version', async () => {
  expect(await getPreviousMonthFinalizedContext('org-1', '2025-04')).toBeNull();
});

it('returns display + planning assignments for the previous month finalized version', async () => {
  expect(await getPreviousMonthFinalizedContext('org-1', '2025-04')).toEqual({
    scheduleId: 'schedule-2025-03',
    scheduleVersionId: 'version-2025-03-final',
    displayAssignments: {
      'emp-1': { '2025-03-31': 'D' },
    },
    planningAssignments: [
      { employee_id: 'emp-1', shift_id: 'shift-d', date: '2025-03-31', is_locked: true },
    ],
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:unit -- tests/unit/phase2-schedule-rolling-history-api.spec.ts`
Expected: FAIL with missing helper export.

- [ ] **Step 3: Write the minimal implementation**

Add the type in `src/types/schedule.ts`:

```ts
export interface PreviousMonthFinalizedContext {
  scheduleId: string;
  scheduleVersionId: string;
  displayAssignments: AssignmentMap;
  planningAssignments: PlanningAssignment[];
}
```

Add the helper in `src/api/schedule.ts`:

```ts
export async function getPreviousMonthFinalizedContext(
  organizationId: string,
  month: string
): Promise<PreviousMonthFinalizedContext | null> {
  const previousMonth = dayjs(`${month}-01`).subtract(1, 'month').format('YYYY-MM');

  const { data, error } = await supabase
    .from('schedules')
    .select('id, finalized_version_id')
    .eq('organization_id', organizationId)
    .eq('month', previousMonth)
    .maybeSingle();

  if (error) throw new Error(`전월 확정 스케줄 조회 실패: ${error.message}`);
  if (!data?.id || !data.finalized_version_id) return null;

  const [displayData, planningAssignments] = await Promise.all([
    getScheduleVersionAssignments(data.finalized_version_id),
    getPlanningAssignmentsForVersion(data.finalized_version_id),
  ]);

  return {
    scheduleId: data.id,
    scheduleVersionId: data.finalized_version_id,
    displayAssignments: displayData.assignments,
    planningAssignments,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:unit -- tests/unit/phase2-schedule-rolling-history-api.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/unit/phase2-schedule-rolling-history-api.spec.ts src/api/schedule.ts src/types/schedule.ts
git commit -m "feat: add previous month finalized lookup for rolling history"
```

## Task 3: Clamp Solver History To The Rolling Window

**Files:**

- Modify: `src/utils/solverMapper.ts`
- Modify: `tests/unit/solver-mapper.spec.ts`

- [ ] **Step 1: Write the failing mapper tests**

```ts
it('uses finalized fallback rows when the preview version has no previous-month history', () => {
  const payload = mapToSolverRequest(
    createBasicInfo(shifts),
    createSiteRequirements(),
    createConstraints(),
    createEmployees(),
    shifts,
    [],
    5,
    [{ employee_id: 'emp-1', shift_id: 'shift-d', date: '2025-11-30', is_locked: true }]
  );

  expect(payload.history).toEqual([
    { employee_id: 'emp-1', shift_id: 'shift-d', date: '2025-11-30', is_locked: true },
  ]);
});

it('limits history to the rolling window and excludes O rows', () => {
  const payload = mapToSolverRequest(
    createBasicInfo(shifts),
    createSiteRequirements(),
    createConstraints(),
    createEmployees(),
    shifts,
    [
      { employee_id: 'emp-1', shift_id: 'shift-d', date: '2025-11-20', is_locked: false },
      { employee_id: 'emp-1', shift_id: 'shift-o', date: '2025-11-29', is_locked: false },
    ],
    4,
    [{ employee_id: 'emp-1', shift_id: 'shift-e', date: '2025-11-30', is_locked: true }]
  );

  expect(payload.history).toEqual([
    { employee_id: 'emp-1', shift_id: 'shift-e', date: '2025-11-30', is_locked: true },
  ]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:unit -- tests/unit/solver-mapper.spec.ts`
Expected: FAIL because `mapToSolverRequest` cannot accept fallback rows and still leaks out-of-window history.

- [ ] **Step 3: Write the minimal implementation**

Update the signature and history builder in `src/utils/solverMapper.ts`:

```ts
import {
  buildRollingHistoryWindow,
  mergePlanningAssignmentsWithFallback,
} from '@/utils/rollingHistory';

export function mapToSolverRequest(
  basicInfo: ScheduleBasicInfo,
  siteRequirements: SiteRequirements,
  constraints: ConstraintMap,
  employees: PlanningEmployee[],
  shifts: Shift[],
  existingAssignments: PlanningAssignment[] = [],
  lastMonthDays: number,
  fallbackHistoryAssignments: PlanningAssignment[] = [],
): SolverRequest {
  const window = buildRollingHistoryWindow(month, lastMonthDays);
  const historyAssignments = mergePlanningAssignmentsWithFallback(
    existingAssignments,
    fallbackHistoryAssignments,
    window,
  );

  const history: SolverRequestHistoryItem[] = historyAssignments
    .filter((assignment) => assignment.date > window.lastHistoricalDate)
    .filter((assignment) => assignment.date < window.firstDraftDate)
    .filter((assignment) => shiftCodeById[assignment.shift_id] !== 'O')
    .map((assignment) => ({
      employee_id: assignment.employee_id,
      shift_id: assignment.shift_id,
      date: assignment.date,
      is_locked: true,
    }));
```

Keep `organization.lastHistoricalDate`, `firstDraftDate`, and `publishLength` derived from the same `window` object so the metadata and the actual `history` rows never diverge.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:unit -- tests/unit/solver-mapper.spec.ts tests/unit/rolling-history.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/unit/solver-mapper.spec.ts src/utils/solverMapper.ts src/utils/rollingHistory.ts
git commit -m "fix: clamp solver history to rolling carry-over window"
```

## Task 4: Wire Previous-Month Fallback Into Step5 Display And AI Start

**Files:**

- Modify: `src/views/schedule/Step5Result.vue`
- Modify: `tests/unit/step5-result.spec.ts`

- [ ] **Step 1: Write the failing Step5 integration tests**

```ts
it('shows finalized previous-month rows in Step5 when the preview version has no previous-month assignments', async () => {
  getPreviousMonthFinalizedContextMock.mockResolvedValue({
    scheduleId: 'schedule-2025-03',
    scheduleVersionId: 'version-2025-03-final',
    displayAssignments: {
      'emp-1': { '2025-03-31': 'D' },
    },
    planningAssignments: [
      { employee_id: 'emp-1', shift_id: 'shift-d', date: '2025-03-31', is_locked: true },
    ],
  });

  gridMock.generateDates.mockImplementation((_month: string, lastMonthDays = 0) => {
    gridMock.dates.value = [
      ...(lastMonthDays > 0 ? [{ date: '2025-03-31', isLastMonth: true }] : []),
      { date: '2025-04-01', isLastMonth: false },
    ];
  });

  createWrapper();
  await flushPromises();

  expect(gridMock.assignments.value['emp-1']['2025-03-31']).toBe('D');
});

it('passes finalized previous-month planning rows into mapToSolverRequest on AI start', async () => {
  scheduleStoreMock.basicInfo.month = '2025-04';
  scheduleStoreMock.siteRequirements = [{ dayOfWeek: 1, shiftCode: 'D', requiredCount: 1 }];
  getPreviousMonthFinalizedContextMock.mockResolvedValue({
    scheduleId: 'schedule-2025-03',
    scheduleVersionId: 'version-2025-03-final',
    displayAssignments: {},
    planningAssignments: [
      { employee_id: 'emp-1', shift_id: 'shift-d', date: '2025-03-31', is_locked: true },
    ],
  });

  const wrapper = createWrapper();
  await flushPromises();
  await wrapper.get('[data-test="start-solver-button"]').trigger('click');
  await flushPromises();

  expect(mapToSolverRequestMock).toHaveBeenCalledWith(
    expect.anything(),
    expect.anything(),
    expect.anything(),
    expect.anything(),
    expect.anything(),
    expect.anything(),
    expect.any(Number),
    [{ employee_id: 'emp-1', shift_id: 'shift-d', date: '2025-03-31', is_locked: true }]
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:unit -- tests/unit/step5-result.spec.ts`
Expected: FAIL because Step5 does not fetch finalized previous-month fallback and does not pass fallback planning rows into `mapToSolverRequest`.

- [ ] **Step 3: Write the minimal implementation**

Add the new local state in `src/views/schedule/Step5Result.vue`:

```ts
const previousMonthFallbackAssignments = ref<AssignmentMap>({});
const previousMonthFallbackPlanningAssignments = ref<PlanningAssignment[]>([]);
const previousMonthFallbackError = ref<string | null>(null);
```

Add the loader:

```ts
async function loadPreviousMonthFallback() {
  if (!scheduleStore.basicInfo) return;

  previousMonthFallbackError.value = null;

  try {
    const context = await getPreviousMonthFinalizedContext(
      scheduleStore.basicInfo.organizationId,
      scheduleStore.basicInfo.month
    );

    previousMonthFallbackAssignments.value = context?.displayAssignments ?? {};
    previousMonthFallbackPlanningAssignments.value = context?.planningAssignments ?? [];
  } catch (error) {
    previousMonthFallbackAssignments.value = {};
    previousMonthFallbackPlanningAssignments.value = [];
    previousMonthFallbackError.value =
      error instanceof Error ? error.message : '전월 rolling history 조회 실패';
  }
}
```

Resolve the display fallback inside `loadCurrentAssignments()`:

```ts
const mergedPreviousAssignments = mergeAssignmentMapsWithFallback(
  previousAssignments,
  previousMonthFallbackAssignments.value,
  buildRollingHistoryWindow(scheduleStore.basicInfo!.month, 5).previousMonthDates
);

previousMonthAssignments.value = mergedPreviousAssignments;
syncLastMonthDayWindow(
  new Set(Object.values(mergedPreviousAssignments).flatMap((dateMap) => Object.keys(dateMap || {})))
);
```

Pass fallback planning rows into `buildSolverRequest()`:

```ts
if (previousMonthFallbackError.value) {
  throw new Error('전월 확정 근무 이력을 불러오지 못했습니다. 다시 시도해주세요.');
}

return mapToSolverRequest(
  basicInfo,
  dateBasedRequirements,
  constraints,
  planningEmployees,
  organizationStore.shifts,
  planningAssignments,
  lastMonthDays.value,
  previousMonthFallbackPlanningAssignments.value
);
```

Also add `data-test="start-solver-button"` to the `근무표 생성 (AI)` button so the new test does not depend on button copy.

Load the fallback before the first workspace sync:

```ts
await loadPreviousMonthFallback();
await syncPreviewWorkspace({
  syncOriginal: true,
  clearChanges: true,
});
```

Do not reload the fallback on preview-version change, because the month is unchanged. Reload only when `scheduleStore.basicInfo.month` or `organizationId` changes.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:unit -- tests/unit/step5-result.spec.ts tests/unit/solver-mapper.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/unit/step5-result.spec.ts src/views/schedule/Step5Result.vue
git commit -m "feat: backfill step5 and solver with finalized rolling history"
```

## Verification Sweep

After all four tasks are complete, run the full feature verification set.

- [ ] **Step 1: Run the focused unit suite**

Run:

```bash
pnpm test:unit -- tests/unit/rolling-history.spec.ts tests/unit/phase2-schedule-rolling-history-api.spec.ts tests/unit/solver-mapper.spec.ts tests/unit/step5-result.spec.ts
```

Expected: PASS

- [ ] **Step 2: Run lint gate**

Run:

```bash
pnpm lint:check
```

Expected: PASS with no ESLint errors

- [ ] **Step 3: Manual QA on the real flow**

1. Finalize a 3월 schedule version.
2. Open 4월 Step5 on a draft/reviewable version.
3. Confirm the slider auto-enables and the grid shows 3월 말 carry-over cells from the finalized 3월 version.
4. Click `근무표 생성 (AI)` and inspect the payload or request logger.
5. Confirm `history` contains only the rolling window dates, not the whole 3월 month.
6. Confirm `history` excludes `O` rows and still matches the shape in `data/request.json`.
7. Confirm the first ever month, or a month with no previous finalized schedule, still starts with empty fallback and no crash.

## Notes For The Implementer

- Do not touch unrelated dirty files in the worktree. This repository already has in-progress review-hub changes from another session.
- Keep the fallback state local to Step5. There is no current requirement to persist previous-month finalized context in Pinia.
- Resist widening the scope into fairness-ledger or backend contract work. This patch is about carrying finalized previous-month rows into Step5 and the solver request only.
- If product later insists on a true 7-day calendar week instead of the current 5-day MVP window, treat that as a separate contract-change plan. This implementation deliberately stays inside the existing `lastMonthDays` model.
