# Step5 Result Review Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Step5 so nurse managers review a generated schedule through a site-wide editable schedule view and an employee-level read-only guideline review view, without exposing solver score jargon.

**Architecture:** Keep Step5 data loading, version selection, comparison, save, delete, regenerate, export, and finalization flows unchanged. Replace the current tabbed review shell with a local `site | employee` view state, move employee-specific review UI into a focused component, and derive all employee detail data from existing review, compliance, assignment, Off request, and grid state. Add pure helper functions for employee-detail derivation so the component and Step5 integration stay testable.

**Tech Stack:** Vue 3, TypeScript, Vite, Pinia, Vue Router, Naive UI, Tailwind CSS, Vitest, Playwright

---

## Writing-Plans Review Corrections Applied

- The original plan had the right UX direction but was too high-level for safe execution.
- This version adds exact file ownership, explicit non-goals, data contracts, TDD-first task slices, expected test failures, expected passes, and commit checkpoints.
- This version keeps implementation inside the MVP schedule-generation flow and does not add APIs, CRUD, mobile work, analytics, or real solver wiring.

## Scope And Guardrails

- Change only the Step5 result review surface and directly related tests.
- Keep user-facing UI text in Korean.
- Keep plan text and code comments in English.
- Do not change Supabase schema, Edge Function contracts, schedule version contracts, or solver contracts.
- Do not remove backend compatibility fields such as `defaultTab` or `ScheduleReviewTab`.
- Do not modify dashboard score labels in this task unless a failing Step5 test requires a shared copy helper update.
- Keep assignment editing only in the site view.
- Keep the employee view read-only.
- Do not add new network requests; use data Step5 already has in memory.
- Do not replace the compare modal or version candidate behavior.
- Do not introduce nested cards. Use section shells, summary cards, buttons, selectors, and modal surfaces only where appropriate.

## UX Target

From the user's point of view, Step5 should work like this:

1. They see status cards for generation state, Ministry of Health and Welfare guideline result, Off request reflection, and finalization availability.
2. They do not see `Hard Score`, `Soft Score`, hard constraints, soft constraints, or internal solver score wording.
3. They can switch between `사이트` and `근무자`.
4. `사이트` shows the full editable schedule grid and the global guideline summary.
5. `근무자` shows one selected employee's schedule, guideline result, violation details, and Off request details.
6. Entering `근무자` selects the first employee with guideline violations. If none exists, it selects the first employee.
7. Employee violation details expand automatically only when the selected employee has violations.
8. Off request detail popup appears only in `근무자` and shows request date, request note, actual assignment, reflection status, and unfulfilled reason when available.

## File Map

### Create

- `src/utils/employeeResultDetail.ts`
  - Pure helpers for employee selection, employee schedule rows, employee violation filtering, and employee Off request detail rows.
  - No Vue imports.
  - No API calls.
- `src/components/schedule/review/EmployeeResultDetail.vue`
  - Read-only employee review panel.
  - Owns only local UI state such as Off request dialog open row and violation collapse state.
  - Receives selected employee id through `v-model:selected-employee-id`.
- `tests/unit/employee-result-detail.spec.ts`
  - Pure helper coverage for default selection, violation filtering, schedule row derivation, and Off request fallback behavior.
- `tests/unit/employee-result-detail-component.spec.ts`
  - Component coverage for read-only rendering, selector behavior, auto-expanded violation details, and Off request popup content.

### Modify

- `src/views/schedule/Step5Result.vue`
  - Remove `VersionReviewDetail` usage from the main Step5 result surface.
  - Remove `activeReviewTab`, `handleReviewTabChange`, `syncReviewTabForPreview`, and the `resolveDefaultReviewTab` import from Step5.
  - Add `resultViewMode: 'site' | 'employee'`.
  - Add summary card computed data.
  - Add `사이트 / 근무자` view switch.
  - Move current editable grid into the `site` view.
  - Replace last-month slider with an `n-input-number` stepper above the site grid.
  - Integrate `EmployeeResultDetail`.
- `src/components/schedule/review/ScheduleCompliancePanel.vue`
  - Replace user-facing `법적 기준` wording with `보건복지부 가이드라인`.
  - Keep it suitable as a global guideline summary panel.
  - Keep reveal behavior deterministic on result prop replacement.
- `tests/unit/schedule-compliance-panel.spec.ts`
  - Update Korean copy expectations.
  - Keep accessibility and no-nested-card assertions.
- `tests/unit/step5-result.spec.ts`
  - Replace old review-tab assertions with view-switch assertions.
  - Assert score terms are absent in empty, running, completed, blocked, and finalized states where relevant.
  - Assert site grid remains editable when the preview version is mutable.
  - Assert employee detail is read-only.
  - Assert previous-month numeric stepper updates `lastMonthDays`.
- `tests/e2e/step5-review-hub.spec.ts`
  - Replace old tab flow checks with `사이트 / 근무자` checks.
  - Keep compare modal smoke coverage.
- `tests/e2e/helpers.ts`
  - Update `verifyStep5ReviewHub` to assert the new Step5 review surface.

### Leave Unchanged Unless Needed For Types

- `src/components/schedule/review/VersionReviewDetail.vue`
  - Keep for compatibility until no other surface uses it.
- `src/types/schedule.ts`
  - Keep `ScheduleReviewTab` and `defaultTab`.
- `src/composables/useScheduleReviewHub.ts`
  - Keep existing version, compare, and review behavior unchanged.
- `src/stores/schedule.ts`
  - Keep `reviewTab` state for compatibility even though Step5 no longer uses it.

## Data Contracts

Use these existing inputs only:

- `grid.employees.value`
- `grid.dates.value`
- `grid.assignments.value`
- `complianceResult.violations`
- `review.value?.latestEvaluation?.violationDetails`
- `review.value?.latestEvaluation?.offRequestResults`
- `offRequestsCurrentMonth`
- `offRequestNotesCurrentMonth`
- `organizationStore.shifts`

Employee Off request reflection rule:

1. Prefer `review.value?.latestEvaluation?.offRequestResults` when a row exists for the employee and date.
2. Otherwise fall back to `offRequestsCurrentMonth[employeeId][date] === 'O'`.
3. In fallback mode, treat current assignment `O` as fulfilled and any other assignment as unfulfilled.
4. The popup's actual assignment should come from `grid.assignments.value[employeeId][date]`; show `미배정` when missing.

Employee default selection rule:

1. Keep the current selected employee if that id still exists in `grid.employees.value`.
2. Otherwise select the first employee id appearing in `complianceResult.violations`.
3. Otherwise select the first employee.
4. Otherwise return `null`.

## Data-Test Contract

Add or preserve these selectors so tests and QA have stable hooks:

- `step5-result-status-summary`
- `step5-summary-card-generation`
- `step5-summary-card-guideline`
- `step5-summary-card-off-requests`
- `step5-summary-card-finalization`
- `step5-result-view-switch`
- `step5-result-view-site`
- `step5-result-view-employee`
- `step5-site-view`
- `step5-employee-view`
- `last-month-days-stepper`
- `employee-result-detail`
- `employee-result-select`
- `employee-result-schedule`
- `employee-guideline-status`
- `employee-violation-section`
- `employee-violation-reveal`
- `employee-off-request-row`
- `employee-off-request-detail-button`
- `employee-off-request-detail-modal`

## Task 1: Compliance Copy Foundation

**Files:**

- Modify: `src/components/schedule/review/ScheduleCompliancePanel.vue`
- Modify: `src/views/schedule/Step5Result.vue`
- Test: `tests/unit/schedule-compliance-panel.spec.ts`
- Test: `tests/unit/step5-result.spec.ts`

- [ ] **Step 1: Write failing copy tests**

Update `tests/unit/schedule-compliance-panel.spec.ts` expectations so the panel uses Ministry wording:

```ts
expect(wrapper.get('[data-test="compliance-decision-status"]').text()).toContain(
  '보건복지부 가이드라인 충족'
);
expect(wrapper.text()).toContain('보건복지부 가이드라인 확인 결과');
expect(wrapper.text()).not.toContain('법적 기준');
```

Update Step5 blocker expectations:

```ts
describe('Step5 compliance guideline copy', () => {
  it('uses Ministry guideline wording for local finalization blockers', async () => {
    mockSingleFinalizeReview({
      assignments: {
        'emp-1': {
          '2025-12-01': 'N',
          '2025-12-02': 'O',
          '2025-12-03': 'D',
        },
      },
    });

    const wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.get('[data-test="compliance-decision-status"]').text()).toContain(
      '보건복지부 가이드라인 위반 1건'
    );
    expect(wrapper.get('[data-test="finalize-block-reason"]').text()).toBe(
      '보건복지부 가이드라인 위반 1건을 해결한 뒤 확정할 수 있습니다.'
    );
    expect(wrapper.text()).not.toContain('법적 기준');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm test:unit -- tests/unit/schedule-compliance-panel.spec.ts
pnpm test:unit -- tests/unit/step5-result.spec.ts -t "Step5 compliance guideline copy"
```

Expected: FAIL with old `법적 기준` copy still rendered.

- [ ] **Step 3: Update user-facing copy**

In `ScheduleCompliancePanel.vue`, use this copy:

```ts
const decisionTitle = computed(() => {
  if (decisionTone.value === 'check') {
    return '보건복지부 가이드라인 확인 필요';
  }

  if (decisionTone.value === 'fail') {
    return `보건복지부 가이드라인 위반 ${props.result.mandatoryViolationCount}건`;
  }

  return '보건복지부 가이드라인 충족';
});
```

Update the panel heading and aria label:

```vue
<h3 class="text-sm font-semibold text-slate-900">
  보건복지부 가이드라인 확인 결과
</h3>

<div role="list" aria-label="보건복지부 가이드라인 확인 결과"></div>
```

In `Step5Result.vue`, update local finalization blockers:

```ts
const complianceFinalizeBlockReason = computed(() => {
  if (complianceResult.value.checkRequiredCount > 0) {
    return '보건복지부 가이드라인을 확인한 뒤 확정할 수 있습니다.';
  }

  if (complianceResult.value.mandatoryViolationCount > 0) {
    return `보건복지부 가이드라인 위반 ${complianceResult.value.mandatoryViolationCount}건을 해결한 뒤 확정할 수 있습니다.`;
  }

  return null;
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm test:unit -- tests/unit/schedule-compliance-panel.spec.ts
pnpm test:unit -- tests/unit/step5-result.spec.ts -t "Step5 compliance guideline copy"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/schedule/review/ScheduleCompliancePanel.vue src/views/schedule/Step5Result.vue tests/unit/schedule-compliance-panel.spec.ts tests/unit/step5-result.spec.ts
git commit -m "copy: rename Step5 compliance wording"
```

## Task 2: Status Summary Cards And Solver Score Removal

**Files:**

- Modify: `src/views/schedule/Step5Result.vue`
- Test: `tests/unit/step5-result.spec.ts`

- [ ] **Step 1: Write failing Step5 summary tests**

Add tests near the existing score/status assertions under a dedicated `describe('Step5 result summary cards', () => { /* tests */ })` block:

```ts
it('does not expose solver score labels in running or completed states', async () => {
  solverMock.status.value = 'running';
  solverMock.progress.value = 42;

  const runningWrapper = createWrapper();
  await flushPromises();

  expect(runningWrapper.text()).not.toContain('Hard Score');
  expect(runningWrapper.text()).not.toContain('Soft Score');
  expect(runningWrapper.get('[data-test="step5-summary-card-generation"]').text()).toContain(
    '생성 중'
  );

  solverMock.status.value = 'complete';
  const completedWrapper = createWrapper();
  await flushPromises();

  expect(completedWrapper.text()).not.toContain('Hard Score');
  expect(completedWrapper.text()).not.toContain('Soft Score');
});

it('renders four reviewer-facing summary cards', async () => {
  const wrapper = createWrapper();
  await flushPromises();

  expect(wrapper.get('[data-test="step5-summary-card-generation"]').text()).toContain('생성 상태');
  expect(wrapper.get('[data-test="step5-summary-card-guideline"]').text()).toContain(
    '보건복지부 가이드라인'
  );
  expect(wrapper.get('[data-test="step5-summary-card-off-requests"]').text()).toContain('Off 요청');
  expect(wrapper.get('[data-test="step5-summary-card-finalization"]').text()).toContain('확정');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- tests/unit/step5-result.spec.ts -t "Step5 result summary cards"`

Expected: FAIL because score labels still render and summary card selectors do not exist.

- [ ] **Step 3: Replace the status card block**

Remove:

```vue
<div v-if="shouldShowScoreSummary" class="text-sm">
  <span class="mr-4">Hard Score: <strong>{{ solver.hardScore.value }}</strong></span>
  <span>Soft Score: <strong>{{ solver.softScore.value }}</strong></span>
</div>
```

Remove the `shouldShowScoreSummary` computed if it becomes unused.

Add summary cards:

```ts
interface Step5SummaryCard {
  key: 'generation' | 'guideline' | 'offRequests' | 'finalization';
  title: string;
  value: string;
  description: string;
  tone: 'default' | 'info' | 'success' | 'warning' | 'error';
}

const guidelineSummaryCard = computed<Step5SummaryCard>(() => {
  if (complianceResult.value.checkRequiredCount > 0) {
    return {
      key: 'guideline',
      title: '보건복지부 가이드라인',
      value: '확인 필요',
      description: '일부 항목은 직접 확인이 필요합니다.',
      tone: 'warning',
    };
  }

  if (complianceResult.value.mandatoryViolationCount > 0) {
    return {
      key: 'guideline',
      title: '보건복지부 가이드라인',
      value: `위반 ${complianceResult.value.mandatoryViolationCount}건`,
      description: '위반 항목을 해결한 뒤 확정할 수 있습니다.',
      tone: 'error',
    };
  }

  return {
    key: 'guideline',
    title: '보건복지부 가이드라인',
    value: '충족',
    description: '필수 기준을 모두 확인했습니다.',
    tone: 'success',
  };
});

const offRequestSummaryCard = computed<Step5SummaryCard>(() => {
  const off = complianceResult.value.offRequests;
  if (off.totalRequests === 0) {
    return {
      key: 'offRequests',
      title: 'Off 요청 반영',
      value: '요청 없음',
      description: '이번 달 Off 요청이 없습니다.',
      tone: 'default',
    };
  }

  return {
    key: 'offRequests',
    title: 'Off 요청 반영',
    value: `${off.fulfilledRequests}/${off.totalRequests}일`,
    description:
      off.reflectionRate === null ? '반영률 계산 전입니다.' : `반영률 ${off.reflectionRate}%`,
    tone: off.unfulfilledRequests > 0 ? 'warning' : 'success',
  };
});
```

Add generation and finalization cards using existing `statusText`, `isRunning`, `solver.progress.value`, `visibleFinalizeBlockReason`, and `isFinalizeActionDisabled`.

Template target:

```vue
<section
  v-if="shouldShowStatusCard"
  data-test="step5-result-status-summary"
  class="mb-6 grid gap-3 md:grid-cols-4"
>
  <article
    v-for="card in resultSummaryCards"
    :key="card.key"
    :data-test="`step5-summary-card-${card.key}`"
    class="rounded-lg border border-slate-200 bg-white p-4"
  >
    <p class="text-xs font-medium text-slate-500">{{ card.title }}</p>
    <p class="mt-2 text-lg font-semibold text-slate-950">{{ card.value }}</p>
    <p class="mt-1 text-sm leading-5 text-slate-600">{{ card.description }}</p>
    <n-progress
      v-if="card.key === 'generation' && isRunning"
      type="line"
      :percentage="solver.progress.value"
      class="mt-3"
    />
  </article>
</section>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- tests/unit/step5-result.spec.ts -t "Step5 result summary cards"`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/views/schedule/Step5Result.vue tests/unit/step5-result.spec.ts
git commit -m "feat: add Step5 result summary cards"
```

## Task 3: Employee Detail Helper Functions

**Files:**

- Create: `src/utils/employeeResultDetail.ts`
- Test: `tests/unit/employee-result-detail.spec.ts`

- [ ] **Step 1: Write failing helper tests**

Create `tests/unit/employee-result-detail.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  buildEmployeeOffRequestRows,
  buildEmployeeScheduleRows,
  filterEmployeeViolations,
  selectDefaultResultEmployeeId,
} from '@/utils/employeeResultDetail';
import type { GridColumn } from '@/types/schedule';

const employees = [
  {
    id: 'emp-1',
    name: '김간호',
    employeeId: 'E001',
    organizationId: 'org-1',
    availableShifts: ['D', 'E', 'N', 'O'],
  },
  {
    id: 'emp-2',
    name: '박간호',
    employeeId: 'E002',
    organizationId: 'org-1',
    availableShifts: ['D', 'E', 'N', 'O'],
  },
];

const dates: GridColumn[] = [
  { date: '2026-05-01', day: 1, dayOfWeek: 5, dayName: '금', isLastMonth: false },
  { date: '2026-05-02', day: 2, dayOfWeek: 6, dayName: '토', isLastMonth: false },
];

it('keeps the current employee when still valid', () => {
  expect(selectDefaultResultEmployeeId(employees, [], 'emp-2')).toBe('emp-2');
});

it('selects the first employee with guideline violations when current selection is missing', () => {
  expect(
    selectDefaultResultEmployeeId(
      employees,
      [
        {
          id: 'v-1',
          ruleCode: 'triple_night',
          employeeId: 'emp-2',
          employeeName: '박간호',
          dates: ['2026-05-01'],
          message: '위반',
        },
      ],
      null
    )
  ).toBe('emp-2');
});

it('builds read-only schedule rows with assignment and request note', () => {
  expect(
    buildEmployeeScheduleRows({
      employeeId: 'emp-1',
      dates,
      assignments: { 'emp-1': { '2026-05-01': 'D' } },
      offRequests: { 'emp-1': { '2026-05-02': 'O' } },
      offRequestNotes: { 'emp-1': { '2026-05-02': '가족 일정' } },
    })
  ).toMatchObject([
    { date: '2026-05-01', assignment: 'D', hasOffRequest: false },
    { date: '2026-05-02', assignment: '', hasOffRequest: true, offRequestNote: '가족 일정' },
  ]);
});

it('prefers evaluation Off request results and falls back to current assignment O', () => {
  expect(
    buildEmployeeOffRequestRows({
      employeeId: 'emp-1',
      assignments: { 'emp-1': { '2026-05-01': 'D', '2026-05-02': 'O' } },
      offRequests: { 'emp-1': { '2026-05-01': 'O', '2026-05-02': 'O' } },
      offRequestNotes: { 'emp-1': { '2026-05-01': '중요 일정' } },
      offRequestResults: [
        {
          employeeId: 'emp-1',
          date: '2026-05-01',
          requestCode: 'O',
          requestNote: '중요 일정',
          isSoft: true,
          resolutionStatus: 'unfulfilled',
          resolvedShiftId: null,
          resolvedAt: null,
          fulfilled: false,
          reason: '인력 부족',
        },
      ],
    })
  ).toEqual([
    expect.objectContaining({
      date: '2026-05-01',
      actualAssignment: 'D',
      fulfilled: false,
      reason: '인력 부족',
    }),
    expect.objectContaining({
      date: '2026-05-02',
      actualAssignment: 'O',
      fulfilled: true,
      reason: null,
    }),
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- tests/unit/employee-result-detail.spec.ts`

Expected: FAIL with missing `@/utils/employeeResultDetail`.

- [ ] **Step 3: Implement pure helpers**

Create `src/utils/employeeResultDetail.ts`:

```ts
import type { Employee } from '@/types/employee';
import type {
  AssignmentMap,
  CommentMap,
  ConstraintMap,
  GridColumn,
  ScheduleOffRequestResult,
} from '@/types/schedule';
import type { ScheduleComplianceViolation } from '@/types/scheduleCompliance';

export interface EmployeeScheduleRow {
  date: string;
  day: number;
  dayName: string;
  isLastMonth: boolean;
  assignment: string;
  hasOffRequest: boolean;
  offRequestNote: string | null;
}

export interface EmployeeOffRequestRow {
  employeeId: string;
  date: string;
  requestNote: string | null;
  actualAssignment: string;
  fulfilled: boolean;
  reason: string | null;
  source: 'evaluation' | 'fallback';
}

export function selectDefaultResultEmployeeId(
  employees: Pick<Employee, 'id'>[],
  violations: Pick<ScheduleComplianceViolation, 'employeeId'>[],
  currentEmployeeId: string | null
): string | null {
  const employeeIds = new Set(employees.map((employee) => employee.id));
  if (currentEmployeeId && employeeIds.has(currentEmployeeId)) {
    return currentEmployeeId;
  }

  const violationEmployee = violations.find((violation) => employeeIds.has(violation.employeeId));
  if (violationEmployee) {
    return violationEmployee.employeeId;
  }

  return employees[0]?.id ?? null;
}
```

Also implement:

- `filterEmployeeViolations(violations, employeeId)`
- `buildEmployeeScheduleRows(input)`
- `buildEmployeeOffRequestRows(input)`

Keep fallback sorting deterministic by date ascending.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- tests/unit/employee-result-detail.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/employeeResultDetail.ts tests/unit/employee-result-detail.spec.ts
git commit -m "feat: derive Step5 employee review rows"
```

## Task 4: Employee Result Detail Component

**Files:**

- Create: `src/components/schedule/review/EmployeeResultDetail.vue`
- Test: `tests/unit/employee-result-detail-component.spec.ts`

- [ ] **Step 1: Write failing component tests**

Create `tests/unit/employee-result-detail-component.spec.ts`:

```ts
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import EmployeeResultDetail from '@/components/schedule/review/EmployeeResultDetail.vue';

it('renders a read-only employee schedule and does not expose grid edit controls', () => {
  const wrapper = mountEmployeeDetail();

  expect(wrapper.get('[data-test="employee-result-detail"]').text()).toContain('김간호');
  expect(wrapper.get('[data-test="employee-result-schedule"]').text()).toContain('D');
  expect(wrapper.find('[data-test="grid-edit"]').exists()).toBe(false);
});

it('auto-expands violation details only for employees with violations', async () => {
  const wrapper = mountEmployeeDetail({ selectedEmployeeId: 'emp-2' });

  expect(wrapper.get('[data-test="employee-guideline-status"]').text()).toContain('위반 1건');
  expect(wrapper.get('[data-test="employee-violation-reveal"]').attributes('aria-expanded')).toBe(
    'true'
  );

  wrapper.getComponent({ name: 'NSelect' }).vm.$emit('update:value', 'emp-1');
  await nextTick();

  expect(wrapper.get('[data-test="employee-guideline-status"]').text()).toContain('충족');
  expect(wrapper.find('[data-test="employee-violation-reveal"]').exists()).toBe(false);
});

it('opens Off request detail popup with note, assignment, reflection status, and reason', async () => {
  const wrapper = mountEmployeeDetail({ selectedEmployeeId: 'emp-1' });

  await wrapper.get('[data-test="employee-off-request-detail-button"]').trigger('click');

  const modal = wrapper.get('[data-test="employee-off-request-detail-modal"]');
  expect(modal.text()).toContain('2026-05-01');
  expect(modal.text()).toContain('중요 일정');
  expect(modal.text()).toContain('D');
  expect(modal.text()).toContain('미반영');
  expect(modal.text()).toContain('인력 부족');
});
```

Use local helpers in the test file to create employees, dates, assignments, violations, and off request rows.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- tests/unit/employee-result-detail-component.spec.ts`

Expected: FAIL with missing component.

- [ ] **Step 3: Implement component**

Create `EmployeeResultDetail.vue` with these responsibilities:

```ts
const props = defineProps<{
  employees: Employee[];
  dates: GridColumn[];
  assignments: AssignmentMap;
  violations: ScheduleComplianceViolation[];
  offRequests: ConstraintMap;
  offRequestNotes: CommentMap;
  offRequestResults: ScheduleOffRequestResult[];
  selectedEmployeeId: string | null;
}>();

const emit = defineEmits<{
  (event: 'update:selectedEmployeeId', value: string | null): void;
}>();
```

Use Naive UI controls:

- `NSelect` for employee selection.
- `NCollapse` / `NCollapseItem` or a simple button-controlled section for violation details.
- `NButton` for Off request detail buttons.
- `NModal` for the Off request detail popup.

Watch selected employee violations:

```ts
watch(
  () => selectedViolations.value.map((violation) => violation.id).join('|'),
  () => {
    isViolationSectionOpen.value = selectedViolations.value.length > 0;
  },
  { immediate: true }
);
```

Render guideline status:

```vue
<p data-test="employee-guideline-status" class="text-sm font-semibold">
  {{ selectedViolations.length > 0 ? `보건복지부 가이드라인 위반 ${selectedViolations.length}건` : '보건복지부 가이드라인 충족' }}
</p>
```

The schedule table must be read-only:

- Render text cells only.
- Do not use `ScheduleGrid` in editable mode.
- Do not emit assignment updates.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- tests/unit/employee-result-detail.spec.ts tests/unit/employee-result-detail-component.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/schedule/review/EmployeeResultDetail.vue tests/unit/employee-result-detail-component.spec.ts
git commit -m "feat: add Step5 employee review detail"
```

## Task 5: Site / Employee View Shell And Last-Month Stepper

**Files:**

- Modify: `src/views/schedule/Step5Result.vue`
- Test: `tests/unit/step5-result.spec.ts`

- [ ] **Step 1: Write failing Step5 view-switch tests**

Replace old tab tests such as `opens proof-first when the preview version is review_blocked` and `renders compliance panel before review tabs after assignments load` with view-shell assertions:

```ts
it('renders site and employee views instead of the old review tabs', async () => {
  const wrapper = createWrapper();
  await flushPromises();

  expect(wrapper.get('[data-test="step5-result-view-switch"]').text()).toContain('사이트');
  expect(wrapper.get('[data-test="step5-result-view-switch"]').text()).toContain('근무자');
  expect(wrapper.find('[data-test="review-tab-grid"]').exists()).toBe(false);
  expect(wrapper.find('[data-test="review-tab-proof"]').exists()).toBe(false);
  expect(wrapper.find('[data-test="review-tab-offRequests"]').exists()).toBe(false);
  expect(wrapper.findComponent({ name: 'VersionReviewDetail' }).exists()).toBe(false);
});

it('keeps assignment editing available only in site view', async () => {
  const wrapper = createWrapper();
  await flushPromises();

  expect(wrapper.get('[data-test="step5-site-view"]').exists()).toBe(true);
  expect(wrapper.find('[data-test="grid-edit"]').exists()).toBe(true);

  await wrapper.get('[data-test="step5-result-view-employee"]').trigger('click');
  await flushPromises();

  expect(wrapper.get('[data-test="step5-employee-view"]').exists()).toBe(true);
  expect(wrapper.find('[data-test="grid-edit"]').exists()).toBe(false);
});

it('uses a numeric stepper for previous-month display days above the site grid', async () => {
  mockSingleFinalizeReview({
    assignments: {
      'emp-1': {
        '2025-11-29': 'D',
        '2025-11-30': 'N',
        '2025-12-01': 'D',
      },
    },
  });

  const wrapper = createWrapper();
  await flushPromises();

  const stepper = wrapper.get('[data-test="last-month-days-stepper"]');
  expect(stepper.exists()).toBe(true);
  expect(wrapper.findComponent({ name: 'NSlider' }).exists()).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- tests/unit/step5-result.spec.ts`

Expected: FAIL because old `VersionReviewDetail`, review tabs, and slider still render.

- [ ] **Step 3: Update imports and local state**

In `Step5Result.vue`:

```ts
import { NCard, NButton, NProgress, NAlert, NInputNumber, NSpin, NModal } from 'naive-ui';
import EmployeeResultDetail from '@/components/schedule/review/EmployeeResultDetail.vue';
import { selectDefaultResultEmployeeId } from '@/utils/employeeResultDetail';
```

Remove:

```ts
import { NSlider } from 'naive-ui';
import VersionReviewDetail from '@/components/schedule/review/VersionReviewDetail.vue';
import { resolveDefaultReviewTab } from '@/utils/scheduleReviewState';
```

Add:

```ts
type ResultViewMode = 'site' | 'employee';

const resultViewMode = ref<ResultViewMode>('site');
const selectedResultEmployeeId = ref<string | null>(null);

const selectedEmployeeOffRequestResults = computed(() => {
  return review.value?.latestEvaluation?.offRequestResults ?? [];
});

const visibleLastMonthDays = computed({
  get: () => lastMonthDays.value,
  set: (value: number | null) => {
    const numericValue = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    lastMonthDays.value = Math.min(
      maxVisibleLastMonthDays.value,
      Math.max(0, Math.floor(numericValue))
    );
  },
});
```

Add a watcher:

```ts
watch(
  () => [
    resultViewMode.value,
    grid.employees.value.map((employee) => employee.id).join('|'),
    complianceResult.value.violations
      .map((violation) => `${violation.employeeId}:${violation.id}`)
      .join('|'),
  ],
  () => {
    if (resultViewMode.value !== 'employee') return;

    selectedResultEmployeeId.value = selectDefaultResultEmployeeId(
      grid.employees.value,
      complianceResult.value.violations,
      selectedResultEmployeeId.value
    );
  },
  { immediate: true }
);
```

Remove:

- `activeReviewTab`
- `syncReviewTabForPreview`
- `handleReviewTabChange`
- any `syncReviewTabForPreview()` calls

- [ ] **Step 4: Replace result-detail template**

Replace the `VersionReviewDetail` block with:

```vue
<section v-if="shouldShowResultDetails" class="my-6">
  <div
    data-test="step5-result-view-switch"
    class="mb-4 inline-flex rounded-lg border border-slate-200 bg-white p-1"
  >
    <n-button
      data-test="step5-result-view-site"
      :type="resultViewMode === 'site' ? 'primary' : 'default'"
      size="small"
      @click="resultViewMode = 'site'"
    >
      사이트
    </n-button>
    <n-button
      data-test="step5-result-view-employee"
      :type="resultViewMode === 'employee' ? 'primary' : 'default'"
      size="small"
      @click="resultViewMode = 'employee'"
    >
      근무자
    </n-button>
  </div>

  <div
    v-if="resultViewMode === 'site'"
    data-test="step5-site-view"
  >
    <ScheduleCompliancePanel :result="complianceResult" />

    <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
      <div
        v-if="shouldShowLastMonthDayControl"
        class="flex items-center gap-2"
      >
        <span class="text-sm font-medium text-slate-700">전월 데이터 표시</span>
        <n-input-number
          v-model:value="visibleLastMonthDays"
          data-test="last-month-days-stepper"
          size="small"
          :min="0"
          :max="maxVisibleLastMonthDays"
          :step="1"
          :disabled="maxVisibleLastMonthDays === 0"
          class="w-28"
        />
        <span class="text-sm text-slate-500">일</span>
      </div>

      <div class="flex flex-wrap items-center gap-2 sm:justify-end">
        <!-- keep existing changed-count, reset, and save buttons here -->
      </div>
    </div>

    <ScheduleGrid
      v-if="grid.employees.value.length > 0"
      class="mt-4"
      mode="result"
      :employees="grid.employees.value"
      :dates="grid.dates.value"
      :assignments="grid.assignments.value"
      :shift-colors="shiftColors"
      :off-requests="offRequestsCurrentMonth"
      :off-request-notes="offRequestNotesCurrentMonth"
      :preference-display-mode="preferenceDisplayMode"
      :allow-pre-run-fallback-when-empty="allowPreRunFallbackWhenEmpty"
      :readonly="isReadonlyGrid"
      :show-last-month="true"
      result-cell-layout="single-box"
      @update:assignment="handleAssignmentUpdate"
    />
  </div>

  <EmployeeResultDetail
    v-else
    v-model:selected-employee-id="selectedResultEmployeeId"
    data-test="step5-employee-view"
    :employees="grid.employees.value"
    :dates="grid.dates.value"
    :assignments="grid.assignments.value"
    :violations="complianceResult.violations"
    :off-requests="offRequestsCurrentMonth"
    :off-request-notes="offRequestNotesCurrentMonth"
    :off-request-results="selectedEmployeeOffRequestResults"
  />
</section>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test:unit -- tests/unit/step5-result.spec.ts tests/unit/employee-result-detail.spec.ts tests/unit/employee-result-detail-component.spec.ts`

Expected: PASS for new view-shell tests and employee detail tests.

- [ ] **Step 6: Commit**

```bash
git add src/views/schedule/Step5Result.vue tests/unit/step5-result.spec.ts
git commit -m "feat: split Step5 result review views"
```

## Task 6: Step5 Integration Edge Cases

**Files:**

- Modify: `src/views/schedule/Step5Result.vue`
- Modify: `tests/unit/step5-result.spec.ts`

- [ ] **Step 1: Add failing edge-case tests**

Add tests for:

```ts
it('selects the first employee with guideline violations when entering employee view', async () => {
  mockSingleFinalizeReview({
    assignments: {
      'emp-1': { '2025-12-01': 'D' },
      'emp-2': { '2025-12-01': 'N', '2025-12-02': 'O', '2025-12-03': 'D' },
    },
  });

  const wrapper = createWrapper();
  await flushPromises();

  await wrapper.get('[data-test="step5-result-view-employee"]').trigger('click');
  await flushPromises();

  expect(wrapper.get('[data-test="employee-result-detail"]').text()).toContain('박간호');
  expect(wrapper.get('[data-test="employee-guideline-status"]').text()).toContain('위반');
});
```

Also test:

- finalized or solving preview keeps employee view read-only.
- compare modal button behavior remains unchanged.
- finalization button still uses `visibleFinalizeBlockReason`.
- manual edit save/reset buttons remain visible in site view only.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- tests/unit/step5-result.spec.ts`

Expected: FAIL for missing or incorrect integration edge behavior.

- [ ] **Step 3: Fix integration without changing backend flows**

Use existing state only:

- Keep `handleAssignmentUpdate`, `handleSave`, `handleReset`, `handlePrimaryAction`, `handleFinalize`, compare modal, delete modal, export, and regenerate functions unchanged except for template placement.
- Keep `ScheduleGrid` assignment updates in site view only.
- Keep `isReadonlyGrid` logic unchanged.
- Do not move version loading logic into `EmployeeResultDetail`.
- Do not call any API from `EmployeeResultDetail`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- tests/unit/step5-result.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/views/schedule/Step5Result.vue tests/unit/step5-result.spec.ts
git commit -m "fix: preserve Step5 result review behavior"
```

## Task 7: E2E Review Hub Update

**Files:**

- Modify: `tests/e2e/step5-review-hub.spec.ts`
- Modify: `tests/e2e/helpers.ts`

- [ ] **Step 1: Update failing e2e expectations**

In `tests/e2e/helpers.ts`, update `verifyStep5ReviewHub`:

```ts
export async function verifyStep5ReviewHub(page: Page) {
  await expect(page.getByText('근무표 생성 - 결과 확인')).toBeVisible();
  await expect(page.getByTestId('step5-result-view-switch')).toBeVisible();
  await expect(page.getByTestId('step5-result-view-site')).toBeVisible();
  await expect(page.getByTestId('step5-result-view-employee')).toBeVisible();
  await expect(page.getByTestId('review-tab-grid')).toHaveCount(0);
  return page.getByTestId('step5-result-view-switch').isVisible();
}
```

In `tests/e2e/step5-review-hub.spec.ts`, replace tab switching with:

```ts
test('switches between site and employee review views', async ({ page }) => {
  await verifyStep5ReviewHub(page);

  await expect(page.getByTestId('step5-site-view')).toBeVisible();

  await page.getByTestId('step5-result-view-employee').click();
  await expect(page.getByTestId('step5-employee-view')).toBeVisible();
  await expect(page.getByTestId('employee-result-detail')).toBeVisible();

  await page.getByTestId('step5-result-view-site').click();
  await expect(page.getByTestId('step5-site-view')).toBeVisible();
});
```

Keep the compare modal smoke test:

```ts
test('opens the compare modal from the Step5 result frame', async ({ page }) => {
  await verifyStep5ReviewHub(page);

  await page.getByTestId('step5-compare-button').click();
  await expect(page.getByTestId('schedule-compare-modal')).toBeVisible();
  await expect(page.getByText('근무표안 비교')).toBeVisible();
});
```

- [ ] **Step 2: Run e2e test if environment is available**

Run: `pnpm test:e2e -- tests/e2e/step5-review-hub.spec.ts`

Expected when e2e environment is configured: PASS

If the e2e environment is not available, record the blocker in the implementation handoff and still run unit, lint, and build.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/step5-review-hub.spec.ts tests/e2e/helpers.ts
git commit -m "test: update Step5 review hub e2e flow"
```

## Task 8: Final Verification And Cleanup

**Files:**

- Review: `src/views/schedule/Step5Result.vue`
- Review: `src/components/schedule/review/EmployeeResultDetail.vue`
- Review: `src/components/schedule/review/ScheduleCompliancePanel.vue`
- Review: `src/utils/employeeResultDetail.ts`
- Review: all touched tests

- [ ] **Step 1: Search for removed Step5 UI terms**

Run:

```bash
rg -n "Hard Score|Soft Score|법적 기준|review-tab-grid|review-tab-proof|review-tab-offRequests|VersionReviewDetail|activeReviewTab|handleReviewTabChange|resolveDefaultReviewTab" src/views/schedule/Step5Result.vue src/components/schedule/review tests/unit/step5-result.spec.ts tests/e2e/step5-review-hub.spec.ts tests/e2e/helpers.ts
```

Expected:

- No `Hard Score` or `Soft Score` in Step5 UI/tests.
- No `법적 기준` in Step5 result review UI/tests.
- No old review-tab selectors in Step5 result tests/e2e.
- No `VersionReviewDetail`, `activeReviewTab`, `handleReviewTabChange`, or `resolveDefaultReviewTab` in `Step5Result.vue`.

- [ ] **Step 2: Run focused unit tests**

Run:

```bash
pnpm test:unit -- tests/unit/employee-result-detail.spec.ts tests/unit/employee-result-detail-component.spec.ts tests/unit/schedule-compliance-panel.spec.ts tests/unit/step5-result.spec.ts
```

Expected: PASS

- [ ] **Step 3: Run workflow-required checks**

Run:

```bash
pnpm lint:check
pnpm run build
```

Expected: PASS

- [ ] **Step 4: Run e2e if available**

Run:

```bash
pnpm test:e2e -- tests/e2e/step5-review-hub.spec.ts
```

Expected: PASS when the e2e environment is available.

- [ ] **Step 5: Final manual smoke check**

Open Step5 in the browser and verify:

- `사이트` is the default view.
- Status cards fit without overlap.
- The previous-month numeric stepper appears above the left side of the site calendar when previous-month rows exist.
- Site grid editing, reset, and save still work.
- `근무자` view selects a violating employee first when one exists.
- Employee view contains no editable grid controls.
- Employee violation details auto-expand only for violating employees.
- Off request detail popup shows date, note, actual assignment, reflection status, and reason.
- Compare modal still opens from Step5.
- Finalization blocking copy uses `보건복지부 가이드라인`.

- [ ] **Step 6: Commit final cleanup if needed**

```bash
git add src tests
git commit -m "chore: verify Step5 result review redesign"
```

## Acceptance Criteria

- Step5 no longer renders `Hard Score` or `Soft Score`.
- Step5 no longer presents `Assignment / Hard constraints / Off requests` review tabs.
- Step5 user-facing guideline copy says `보건복지부 가이드라인`, not `법적 기준`.
- Summary cards show generation status, guideline result, Off request reflection, and finalization availability.
- `사이트` view contains the full editable schedule grid and global guideline summary.
- Assignment editing, reset, and save are unavailable from `근무자` view.
- Previous-month display control is an `n-input-number`, not an `n-slider`.
- The previous-month control is visually placed above the site calendar where previous-month columns begin.
- `근무자` view defaults to a violating employee when possible.
- Employee violation details auto-expand only when selected employee violations exist.
- Employee Off request popup shows request date, request note, actual assignment, reflection status, and unfulfilled reason when available.
- No new API calls are introduced.
- Existing compare, save, delete, regenerate, export, and finalization behavior remains covered by tests.
- `pnpm lint:check` passes.
- `pnpm run build` passes.

## Risks And Mitigations

- **Risk:** `Step5Result.vue` is already large and easy to regress.
  - **Mitigation:** Keep employee-specific derivation in `employeeResultDetail.ts` and employee rendering in `EmployeeResultDetail.vue`.
- **Risk:** Employee Off request results may be missing before evaluation.
  - **Mitigation:** Use assignment-based fallback and mark row source internally as `fallback`.
- **Risk:** Removing `VersionReviewDetail` from Step5 might break old tests that verify backend `defaultTab` behavior through the UI.
  - **Mitigation:** Keep backend types and store state, but replace Step5 UI tests with the new `site | employee` behavior.
- **Risk:** Naive UI `NInputNumber` emits `null`.
  - **Mitigation:** Clamp `lastMonthDays` with a computed setter or watcher so `lastMonthDays` always remains an integer from `0` to `maxVisibleLastMonthDays`.

## Implementation Notes

- Use Tailwind utilities for layout.
- Keep cards at `rounded-lg` or less.
- Avoid visible instructional text explaining how to use the page.
- Keep compact operational styling; this is a scheduling work surface, not a landing page.
- Do not key rows by editable fields.
- Ensure any local selected employee state syncs when employee props are replaced.
- Use `showSuccess`, `showError`, and `showInfo` for messages if new messages are needed; do not access `window.$message`.

## Execution Handoff

Plan is saved to `docs/plans/2026-05-10-step5-result-review-redesign.md`.

Recommended execution mode:

1. Use `superpowers:subagent-driven-development` for Task 1 through Task 8 if multiple workers are available.
2. Use `superpowers:executing-plans` for inline execution if a single agent is implementing.
3. After each task, run that task's focused tests before moving to the next task.
4. Before final handoff, run `pnpm lint:check` and `pnpm run build`.
