# Employee Result Detail Calendar UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the employee schedule table in `EmployeeResultDetail.vue` with a read-only monthly calendar so reviewers can inspect assignments and Off requests in date context.

**Architecture:** Keep the existing Step5 data flow and the existing employee-detail review panels. Extend the employee schedule-row helper to carry `dayOfWeek`, pass the existing `shiftColors` computed value from `Step5Result.vue` into `EmployeeResultDetail.vue`, and build a local 7-column calendar matrix from the component's existing `scheduleRows`.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Tailwind CSS, Naive UI, Vitest, Vue Test Utils.

---

## Writing-Plans Review Notes Applied

- The original plan had the right product scope, but the tasks were too broad to execute safely.
- The original plan referenced `row.dayOfWeek`, but `EmployeeScheduleRow` currently does not expose that field.
- The strengthened plan below adds the missing helper/type change, exact file responsibilities, test-first steps, stable `data-test` selectors, expected command results, and per-task commit points.
- This plan stays in `docs/plans/` because the user requested this path; that overrides the writing-plans default of `docs/superpowers/plans/`.

## Scope

### In Scope

- Replace only the left schedule display area inside `EmployeeResultDetail.vue`.
- Keep the employee selector, guideline status, guideline violation details, right-side Off request reflection list, and existing Off request modal.
- Keep the employee detail view read-only.
- Show previous-month reference dates with lower visual emphasis.
- Use Step1/Step2 shift colors in employee calendar assignment badges.

### Out of Scope

- No assignment editing in the employee detail calendar.
- No API, store, Supabase, solver, or persistence changes.
- No organization, employee, shift, or Off request CRUD.
- No mobile-specific redesign beyond preserving horizontal scroll for the calendar.

## File Structure

- Modify: `src/utils/employeeResultDetail.ts`
  - Responsibility: build employee-specific schedule and Off request rows from the Step5 grid inputs.
  - Change: add `dayOfWeek` to `EmployeeScheduleRow` and copy it from each `GridColumn`.

- Modify: `tests/unit/employee-result-detail.spec.ts`
  - Responsibility: unit-test employee result helper behavior.
  - Change: assert `buildEmployeeScheduleRows()` preserves `dayOfWeek`.

- Modify: `src/components/schedule/review/EmployeeResultDetail.vue`
  - Responsibility: render the selected employee's read-only result details.
  - Change: replace the schedule table in `[data-test="employee-result-schedule"]` with a calendar layout, add shift color styling, and reuse the existing Off request modal opener from date cells.

- Modify: `tests/unit/employee-result-detail-component.spec.ts`
  - Responsibility: component-level tests for employee result detail rendering and interactions.
  - Change: replace table expectations with calendar expectations, cover color styles, and cover Off request cell behavior.

- Modify: `src/views/schedule/Step5Result.vue`
  - Responsibility: own Step5 result data flow and pass props into the site and employee result views.
  - Change: pass the existing `shiftColors` computed value into `EmployeeResultDetail`.

- Modify: `tests/unit/step5-result.spec.ts`
  - Responsibility: Step5 integration-level behavior.
  - Change: verify the employee view receives and uses organization shift colors.

## Calendar Contract

- The calendar is rendered inside the existing `[data-test="employee-result-schedule"]` container.
- Weekday headers render in this exact order: `일`, `월`, `화`, `수`, `목`, `금`, `토`.
- `scheduleRows` are sorted by `date` before calendar matrix generation.
- The matrix prepends `null` cells equal to the first sorted row's `dayOfWeek`.
- The matrix appends `null` cells until the final row has exactly 7 cells.
- Empty calendar cells render with `data-test="employee-calendar-empty-cell"` and `aria-hidden="true"`.
- Real date cells render with `data-test="employee-calendar-date-cell"` and `data-date="<YYYY-MM-DD>"`.
- Off-request date buttons render with `data-test="employee-calendar-off-request-button"` and `aria-label="{date} Off 요청 상세"`.
- Assignment badges render with `data-test="employee-assignment-badge"` and `data-assignment="<display assignment>"`.
- Month title renders with `data-test="employee-calendar-title"` and uses the first non-previous-month row formatted as `YYYY년 M월`.
- The empty state remains exactly `선택된 직원이 없습니다.` when no employee is selected or no schedule rows exist.

## Implementation Tasks

### Task 1: Preserve `dayOfWeek` in Employee Schedule Rows

**Files:**

- Modify: `tests/unit/employee-result-detail.spec.ts`
- Modify: `src/utils/employeeResultDetail.ts`

- [ ] **Step 1: Write the failing helper test**

Update `createDate()` in `tests/unit/employee-result-detail.spec.ts` so tests can set real weekday indexes:

```ts
function createDate(
  date: string,
  day: number,
  dayName: string,
  isLastMonth = false,
  dayOfWeek = 1
): GridColumn {
  return {
    date,
    day,
    dayOfWeek,
    dayName,
    isLastMonth,
  };
}
```

Update the `builds schedule rows with notes and blank missing assignments in input date order` expectation so each row includes `dayOfWeek`:

```ts
expect(rows).toEqual([
  {
    date: '2025-11-30',
    day: 30,
    dayOfWeek: 0,
    dayName: '일',
    isLastMonth: true,
    assignment: 'N',
    hasOffRequest: false,
    offRequestNote: null,
  },
  {
    date: '2025-12-01',
    day: 1,
    dayOfWeek: 1,
    dayName: '월',
    isLastMonth: false,
    assignment: '',
    hasOffRequest: true,
    offRequestNote: '병원 예약',
  },
]);
```

Also call `createDate('2025-11-30', 30, '일', true, 0)` and `createDate('2025-12-01', 1, '월', false, 1)` in that test.

- [ ] **Step 2: Run the helper test and verify it fails**

Run:

```bash
pnpm test:unit -- tests/unit/employee-result-detail.spec.ts
```

Expected: FAIL because `dayOfWeek` is missing from `EmployeeScheduleRow`.

- [ ] **Step 3: Implement the minimal helper change**

In `src/utils/employeeResultDetail.ts`, add `dayOfWeek` to the row type:

```ts
export interface EmployeeScheduleRow {
  date: string;
  day: number;
  dayOfWeek: number;
  dayName: string;
  isLastMonth: boolean;
  assignment: string;
  hasOffRequest: boolean;
  offRequestNote: string | null;
}
```

Copy it when building rows:

```ts
return dates.map((dateColumn) => ({
  date: dateColumn.date,
  day: dateColumn.day,
  dayOfWeek: dateColumn.dayOfWeek,
  dayName: dateColumn.dayName,
  isLastMonth: dateColumn.isLastMonth,
  assignment: getEmployeeAssignment(assignments, employeeId, dateColumn.date),
  hasOffRequest: offRequests[employeeId]?.[dateColumn.date] === 'O',
  offRequestNote: getEmployeeNote(offRequestNotes, employeeId, dateColumn.date),
}));
```

- [ ] **Step 4: Run the helper test and verify it passes**

Run:

```bash
pnpm test:unit -- tests/unit/employee-result-detail.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/employeeResultDetail.ts tests/unit/employee-result-detail.spec.ts
git commit -m "test: preserve employee schedule weekday index"
```

### Task 2: Add Calendar Layout Tests and Replace the Table

**Files:**

- Modify: `tests/unit/employee-result-detail-component.spec.ts`
- Modify: `src/components/schedule/review/EmployeeResultDetail.vue`

- [ ] **Step 1: Write failing component tests for calendar structure**

In `tests/unit/employee-result-detail-component.spec.ts`, update the local `createDate()` helper to accept `dayOfWeek`:

```ts
function createDate(
  date: string,
  day: number,
  dayName: string,
  isLastMonth = false,
  dayOfWeek = 1
): GridColumn {
  return {
    date,
    day,
    dayOfWeek,
    dayName,
    isLastMonth,
  };
}
```

Expand the default `dates` fixture so the first visible date starts mid-week and the calendar needs both leading and trailing empty cells:

```ts
const dates = [
  createDate('2025-11-26', 26, '수', true, 3),
  createDate('2025-11-27', 27, '목', true, 4),
  createDate('2025-11-28', 28, '금', true, 5),
  createDate('2025-11-29', 29, '토', true, 6),
  createDate('2025-11-30', 30, '일', true, 0),
  createDate('2025-12-01', 1, '월', false, 1),
  createDate('2025-12-02', 2, '화', false, 2),
];
```

Add assignments for any new dates that should not be blank:

```ts
const assignments: AssignmentMap = {
  'employee-1': {
    '2025-11-26': 'N',
    '2025-11-27': 'O',
    '2025-11-28': '',
    '2025-11-29': 'E',
    '2025-11-30': 'N',
    '2025-12-01': 'D',
    '2025-12-02': 'D',
  },
  'employee-2': {
    '2025-11-26': 'O',
    '2025-11-27': 'O',
    '2025-11-28': 'E',
    '2025-11-29': 'N',
    '2025-11-30': 'O',
    '2025-12-01': 'O',
    '2025-12-02': 'E',
  },
};
```

Replace the old table rendering expectations with calendar expectations:

```ts
it('renders a read-only employee schedule as a monthly calendar without edit controls', () => {
  const wrapper = mountDetail();

  expect(wrapper.get('[data-test="employee-result-detail"]').exists()).toBe(true);
  const schedule = wrapper.get('[data-test="employee-result-schedule"]');

  expect(schedule.find('[data-test="employee-calendar-title"]').text()).toBe('2025년 12월');
  expect(
    schedule.findAll('[data-test="employee-calendar-weekday"]').map((node) => node.text())
  ).toEqual(['일', '월', '화', '수', '목', '금', '토']);
  expect(schedule.findAll('[data-test="employee-calendar-empty-cell"]')).toHaveLength(7);
  expect(schedule.get('[data-date="2025-11-26"]').text()).toContain('11/26');
  expect(schedule.get('[data-date="2025-12-01"]').text()).toContain('1');
  expect(schedule.get('[data-date="2025-12-02"]').text()).toContain('2');
  expect(schedule.get('[data-date="2025-11-26"]').classes()).toContain('bg-slate-50');

  expect(wrapper.find('[data-test="grid-edit"]').exists()).toBe(false);
  expect(wrapper.find('input').exists()).toBe(false);
  expect(wrapper.find('textarea').exists()).toBe(false);
  expect(wrapper.find('[contenteditable="true"]').exists()).toBe(false);
  expect(wrapper.findAll('select, [role="combobox"]')).toHaveLength(1);
  expect(wrapper.get('[data-test="employee-result-select"]').attributes('aria-label')).toBe(
    '직원 선택'
  );
});
```

Keep the existing empty-state coverage, or add this if missing:

```ts
it('renders the existing empty state when no employee is selected', () => {
  const wrapper = mountDetail(null);

  expect(wrapper.get('[data-test="employee-result-schedule"]').text()).toContain(
    '선택된 직원이 없습니다.'
  );
});
```

- [ ] **Step 2: Run the component test and verify it fails**

Run:

```bash
pnpm test:unit -- tests/unit/employee-result-detail-component.spec.ts
```

Expected: FAIL because the component still renders a table and does not have the calendar selectors.

- [ ] **Step 3: Add calendar computed state**

In `src/components/schedule/review/EmployeeResultDetail.vue`, import the helper row type:

```ts
import type { EmployeeScheduleRow } from '@/utils/employeeResultDetail';
```

Add local calendar types and constants in `<script setup>`:

```ts
type EmployeeCalendarCell = EmployeeScheduleRow | null;

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'] as const;
```

Add computed values:

```ts
const sortedScheduleRows = computed(() => {
  return [...scheduleRows.value].sort((left, right) => left.date.localeCompare(right.date));
});

const calendarMonthTitle = computed(() => {
  const currentMonthRow = sortedScheduleRows.value.find((row) => !row.isLastMonth);
  if (!currentMonthRow) {
    return '';
  }

  const [year, month] = currentMonthRow.date.split('-');
  if (!year || !month) {
    return '';
  }

  return `${year}년 ${Number(month)}월`;
});

const calendarCells = computed<EmployeeCalendarCell[]>(() => {
  if (sortedScheduleRows.value.length === 0) {
    return [];
  }

  const firstDayOfWeek = sortedScheduleRows.value[0]?.dayOfWeek ?? 0;
  const cells: EmployeeCalendarCell[] = [
    ...Array.from({ length: firstDayOfWeek }, () => null),
    ...sortedScheduleRows.value,
  ];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
});

const calendarWeeks = computed(() => {
  const weeks: EmployeeCalendarCell[][] = [];

  for (let index = 0; index < calendarCells.value.length; index += 7) {
    weeks.push(calendarCells.value.slice(index, index + 7));
  }

  return weeks;
});
```

Add date-label helpers:

```ts
function formatCalendarDateLabel(row: EmployeeScheduleRow) {
  if (row.isLastMonth) {
    return formatShortDate(row.date);
  }

  return String(row.day);
}
```

- [ ] **Step 4: Replace the table template with calendar markup**

Inside `[data-test="employee-result-schedule"]`, replace the `<table>` block with:

```vue
<div class="min-w-[46rem] bg-white text-sm">
  <div
    v-if="scheduleRows.length > 0"
    class="p-3"
  >
    <div class="mb-3 flex items-center justify-between gap-3">
      <h4
        data-test="employee-calendar-title"
        class="text-sm font-semibold text-slate-950"
      >
        {{ calendarMonthTitle }}
      </h4>
    </div>

    <div class="grid grid-cols-7 border-y border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-600">
      <div
        v-for="weekday in weekdayLabels"
        :key="weekday"
        data-test="employee-calendar-weekday"
        class="px-2 py-2"
      >
        {{ weekday }}
      </div>
    </div>

    <div class="divide-y divide-slate-200 border-b border-slate-200">
      <div
        v-for="(week, weekIndex) in calendarWeeks"
        :key="weekIndex"
        class="grid grid-cols-7 divide-x divide-slate-200"
      >
        <div
          v-for="(cell, cellIndex) in week"
          :key="cell?.date ?? `empty-${weekIndex}-${cellIndex}`"
          class="min-h-28 p-2"
          :class="cell ? (cell.isLastMonth ? 'bg-slate-50 text-slate-500' : 'bg-white text-slate-900') : 'bg-slate-50/70'"
          :data-test="cell ? 'employee-calendar-date-cell' : 'employee-calendar-empty-cell'"
          :data-date="cell?.date"
          :aria-hidden="cell ? undefined : 'true'"
        >
          <template v-if="cell">
            <div class="flex items-start justify-between gap-2">
              <span
                class="text-xs font-semibold"
                :class="cell.isLastMonth ? 'text-slate-500' : 'text-slate-900'"
              >
                {{ formatCalendarDateLabel(cell) }}
              </span>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
  <div
    v-else
    class="px-3 py-8 text-center text-sm text-slate-500"
  >
    선택된 직원이 없습니다.
  </div>
</div>
```

- [ ] **Step 5: Run the component test and verify it passes**

Run:

```bash
pnpm test:unit -- tests/unit/employee-result-detail-component.spec.ts
```

Expected: PASS for calendar structure and existing non-editable controls.

- [ ] **Step 6: Commit**

```bash
git add src/components/schedule/review/EmployeeResultDetail.vue tests/unit/employee-result-detail-component.spec.ts
git commit -m "feat: render employee result calendar"
```

### Task 3: Add Assignment Badge Display and Shift Colors

**Files:**

- Modify: `tests/unit/employee-result-detail-component.spec.ts`
- Modify: `src/components/schedule/review/EmployeeResultDetail.vue`

- [ ] **Step 1: Write failing tests for assignment badge styles**

Update `mountDetail()` to accept optional props:

```ts
function mountDetail(
  selectedEmployeeId = 'employee-1',
  overrides: Partial<InstanceType<typeof EmployeeResultDetail>['$props']> = {}
) {
  return mount(EmployeeResultDetail, {
    props: {
      employees,
      dates,
      assignments,
      violations,
      offRequests,
      offRequestNotes,
      offRequestResults,
      selectedEmployeeId,
      ...overrides,
    },
  });
}
```

If that generic prop type is awkward in this test file, use this narrower local type instead:

```ts
type MountDetailOverrides = Partial<{
  assignments: AssignmentMap;
  shiftColors: Record<string, string>;
}>;
```

Add tests:

```ts
it('uses configured shift colors for work assignment badges', () => {
  const wrapper = mountDetail('employee-1', {
    shiftColors: {
      D: '#123456',
    },
  });

  const badge = wrapper.get('[data-date="2025-12-01"] [data-test="employee-assignment-badge"]');
  const badgeStyle = (badge.element as HTMLElement).style;

  expect(badge.text()).toBe('D');
  expect(badgeStyle.backgroundColor).toBe('rgb(18, 52, 86)');
  expect(badgeStyle.borderColor).toBe('rgb(18, 52, 86)');
  expect(badgeStyle.color).toBe('rgb(255, 255, 255)');
});

it('renders missing and Off assignments with gray badges', () => {
  const wrapper = mountDetail('employee-1', {
    assignments: {
      'employee-1': {
        '2025-11-26': '',
        '2025-11-27': 'Off',
      },
    },
    shiftColors: {
      Off: '#ff0000',
    },
  });

  expect(
    wrapper.get('[data-date="2025-11-26"] [data-test="employee-assignment-badge"]').text()
  ).toBe('미배정');
  expect(
    wrapper.get('[data-date="2025-11-27"] [data-test="employee-assignment-badge"]').text()
  ).toBe('Off');
  expect(
    wrapper
      .get('[data-date="2025-11-27"] [data-test="employee-assignment-badge"]')
      .attributes('style') ?? ''
  ).not.toContain('#ff0000');
});
```

- [ ] **Step 2: Run the component test and verify it fails**

Run:

```bash
pnpm test:unit -- tests/unit/employee-result-detail-component.spec.ts
```

Expected: FAIL because `shiftColors` is not a prop and assignment badge markup/styles are not implemented.

- [ ] **Step 3: Add the `shiftColors` prop and style helpers**

In `EmployeeResultDetail.vue`, add the prop:

```ts
const props = withDefaults(
  defineProps<{
    employees: Employee[];
    dates: GridColumn[];
    assignments: AssignmentMap;
    violations: ScheduleComplianceViolation[];
    offRequests: ConstraintMap;
    offRequestNotes: CommentMap;
    offRequestResults: ScheduleOffRequestResult[];
    selectedEmployeeId: string | null;
    shiftColors?: Record<string, string>;
  }>(),
  {
    shiftColors: () => ({}),
  }
);
```

Add helper functions:

```ts
function normalizeHexColor(color?: string): string | null {
  if (!color) return null;

  const normalized = color.trim();
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(normalized) ? normalized : null;
}

function getReadableTextColor(hexColor: string): string {
  const hex = hexColor.slice(1);
  const normalized =
    hex.length === 3
      ? hex
          .split('')
          .map((value) => value + value)
          .join('')
      : hex;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

  return luminance >= 170 ? '#1f2937' : '#ffffff';
}

function isOffAssignment(assignment: string) {
  return assignment === 'O' || assignment === 'Off';
}

function getAssignmentBadgeStyle(assignment: string): Record<string, string> {
  const formattedAssignment = formatAssignment(assignment);

  if (formattedAssignment === '미배정' || isOffAssignment(formattedAssignment)) {
    return {};
  }

  const color = normalizeHexColor(props.shiftColors[formattedAssignment]);
  if (!color) {
    return {};
  }

  return {
    backgroundColor: color,
    borderColor: color,
    color: getReadableTextColor(color),
  };
}

function getAssignmentBadgeClass(assignment: string) {
  const formattedAssignment = formatAssignment(assignment);

  if (formattedAssignment === '미배정' || isOffAssignment(formattedAssignment)) {
    return 'border-slate-300 bg-slate-100 text-slate-600';
  }

  return normalizeHexColor(props.shiftColors[formattedAssignment])
    ? 'border-slate-300'
    : 'border-slate-300 bg-white text-slate-700';
}
```

- [ ] **Step 4: Render assignment badges in each real cell**

Below the date label inside `<template v-if="cell">`, add:

```vue
<div class="mt-3">
  <span
    data-test="employee-assignment-badge"
    :data-assignment="formatAssignment(cell.assignment)"
    class="inline-flex min-w-12 items-center justify-center rounded-md border px-2 py-1 text-xs font-semibold"
    :class="getAssignmentBadgeClass(cell.assignment)"
    :style="getAssignmentBadgeStyle(cell.assignment)"
  >
    {{ formatAssignment(cell.assignment) }}
  </span>
</div>
```

- [ ] **Step 5: Run the component test and verify it passes**

Run:

```bash
pnpm test:unit -- tests/unit/employee-result-detail-component.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/schedule/review/EmployeeResultDetail.vue tests/unit/employee-result-detail-component.spec.ts
git commit -m "feat: color employee calendar assignments"
```

### Task 4: Add Calendar Off Request Display and Click Behavior

**Files:**

- Modify: `tests/unit/employee-result-detail-component.spec.ts`
- Modify: `src/components/schedule/review/EmployeeResultDetail.vue`

- [ ] **Step 1: Write failing Off request calendar tests**

Add or update tests:

```ts
it('opens Off request detail from an Off request calendar cell', async () => {
  const wrapper = mountDetail();

  const detailButton = wrapper.get(
    '[data-date="2025-12-02"] [data-test="employee-calendar-off-request-button"]'
  );
  expect(detailButton.attributes('aria-label')).toBe('2025-12-02 Off 요청 상세');
  expect(detailButton.text()).toContain('Off 요청');
  expect(detailButton.text()).toContain('가족 행사');

  await detailButton.trigger('click');
  await nextTick();

  const modal = wrapper.get('[data-test="employee-off-request-detail-modal"]');
  expect(modal.text()).toContain('2025-12-02');
  expect(modal.text()).toContain('가족 행사');
});

it('does not open the Off request detail modal from a non-Off date cell', async () => {
  const wrapper = mountDetail();

  await wrapper.get('[data-date="2025-12-01"]').trigger('click');
  await nextTick();

  expect(wrapper.find('[data-test="employee-off-request-detail-modal"]').exists()).toBe(false);
  expect(
    wrapper
      .find('[data-date="2025-12-01"] [data-test="employee-calendar-off-request-button"]')
      .exists()
  ).toBe(false);
});
```

Keep the existing side-list modal test. It should continue to click `[data-test="employee-off-request-detail-button"]`.

- [ ] **Step 2: Run the component test and verify it fails**

Run:

```bash
pnpm test:unit -- tests/unit/employee-result-detail-component.spec.ts
```

Expected: FAIL because Off request buttons do not exist inside calendar cells yet.

- [ ] **Step 3: Render Off request content in date cells**

Below the assignment badge in the real-cell template, add:

```vue
<button
  v-if="cell.hasOffRequest"
  type="button"
  data-test="employee-calendar-off-request-button"
  class="mt-3 w-full rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-left text-xs font-medium text-amber-900 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
  :aria-label="`${cell.date} Off 요청 상세`"
  @click="openOffRequestDetail(cell.date)"
>
  <span class="block font-semibold">Off 요청</span>
  <span
    v-if="cell.offRequestNote"
    class="mt-0.5 block truncate text-amber-800"
  >
    {{ cell.offRequestNote }}
  </span>
</button>
```

Do not add a click handler to non-Off date cells.

- [ ] **Step 4: Run the component test and verify it passes**

Run:

```bash
pnpm test:unit -- tests/unit/employee-result-detail-component.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/schedule/review/EmployeeResultDetail.vue tests/unit/employee-result-detail-component.spec.ts
git commit -m "feat: open off request details from calendar"
```

### Task 5: Pass Shift Colors from Step5 to Employee Detail

**Files:**

- Modify: `tests/unit/step5-result.spec.ts`
- Modify: `src/views/schedule/Step5Result.vue`

- [ ] **Step 1: Write the failing Step5 integration test**

Add a test near the existing employee-view tests in `tests/unit/step5-result.spec.ts`:

```ts
it('passes organization shift colors into the employee result calendar', async () => {
  getScheduleStatusMock.mockResolvedValue({
    status: 'complete',
    hard_score: 11,
    soft_score: 22,
    solver_execution_id: null,
  });
  getScheduleVersionAssignmentsMock.mockResolvedValue({
    assignments: {
      'emp-1': {
        '2025-12-01': 'D',
      },
    },
    offReasons: {},
    comments: {},
  });

  const wrapper = createWrapper();
  await flushPromises();

  await wrapper.get('[data-test="step5-result-view-employee"]').trigger('click');
  await flushPromises();

  const badge = wrapper.get('[data-date="2025-12-01"] [data-test="employee-assignment-badge"]');
  expect(badge.text()).toBe('D');
  expect(badge.attributes('style')).toContain('background-color: rgb(18, 52, 86)');
});
```

This uses the existing `organizationStoreMock.shifts` fixture, where shift `D` has `colorCode: '#123456'`.

- [ ] **Step 2: Run the Step5 test and verify it fails**

Run:

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts
```

Expected: FAIL because `EmployeeResultDetail` does not receive `shiftColors` from Step5.

- [ ] **Step 3: Pass the prop in Step5**

In `src/views/schedule/Step5Result.vue`, update the employee detail usage:

```vue
<EmployeeResultDetail
  v-model:selected-employee-id="selectedResultEmployeeId"
  :employees="grid.employees.value"
  :dates="grid.dates.value"
  :assignments="grid.assignments.value"
  :violations="complianceResult.violations"
  :off-requests="offRequestsCurrentMonth"
  :off-request-notes="offRequestNotesCurrentMonth"
  :off-request-results="selectedEmployeeOffRequestResults"
  :shift-colors="shiftColors"
/>
```

- [ ] **Step 4: Run the Step5 test and verify it passes**

Run:

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/schedule/Step5Result.vue tests/unit/step5-result.spec.ts
git commit -m "feat: pass shift colors to employee calendar"
```

### Task 6: Final Regression Verification

**Files:**

- Verify all modified implementation and test files.

- [ ] **Step 1: Run focused unit tests**

Run:

```bash
pnpm test:unit -- tests/unit/employee-result-detail.spec.ts tests/unit/employee-result-detail-component.spec.ts tests/unit/step5-result.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
pnpm lint:check
```

Expected: PASS with no ESLint errors.

- [ ] **Step 3: Run production build**

Run:

```bash
pnpm run build
```

Expected: PASS with successful `vue-tsc -b` and Vite build output.

- [ ] **Step 4: Inspect the final diff**

Run:

```bash
git diff -- src/utils/employeeResultDetail.ts tests/unit/employee-result-detail.spec.ts src/components/schedule/review/EmployeeResultDetail.vue tests/unit/employee-result-detail-component.spec.ts src/views/schedule/Step5Result.vue tests/unit/step5-result.spec.ts
```

Expected:

- No unrelated files in the implementation diff.
- `EmployeeResultDetail.vue` still emits only `update:selectedEmployeeId`.
- No grid edit controls or assignment update emitters added to the employee view.
- Existing side-list Off request detail behavior remains intact.

- [ ] **Step 5: Commit final verification notes if needed**

If Task 6 required any cleanup changes, commit them:

```bash
git add <changed-files>
git commit -m "chore: verify employee calendar result detail"
```

If no cleanup changes were needed, do not create an empty commit.

## Acceptance Criteria

- Selecting an employee shows that employee's assignments in a Sunday-to-Saturday 7-column monthly calendar.
- Previous-month reference dates are included and visually distinct from current-month dates.
- Current-month dates show day-only labels; previous-month dates show month/day labels.
- Leading and trailing empty cells preserve the weekly calendar structure and are hidden from assistive technology.
- Assignment badges use the same shift colors as the Step5 site result grid when a valid hex color exists.
- `미배정`, `O`, and `Off` render as gray badges.
- Invalid or missing shift colors fall back to neutral badge styling.
- Off-request dates show an `Off 요청` badge and a one-line reason when available.
- Clicking an Off-request calendar cell opens the existing Off request detail modal.
- Clicking or interacting with a non-Off date cell does not open the Off request detail modal.
- The right-side guideline violation details, Off request reflection list, and existing Off request modal remain intact.
- The employee detail view remains read-only and does not emit assignment edit events.

## Verification Commands

```bash
pnpm test:unit -- tests/unit/employee-result-detail.spec.ts tests/unit/employee-result-detail-component.spec.ts tests/unit/step5-result.spec.ts
pnpm lint:check
pnpm run build
```

## Assumptions

- Scope is limited to the left schedule display area in the Step5 employee detail view.
- The `dates` array already includes previous-month reference dates and current-month dates in normal Step5 usage.
- `GridColumn.dayOfWeek` uses `0` for Sunday through `6` for Saturday.
- No new date-generation logic, API call, store state, or persistence change is needed.
- The calendar is a read-only detail surface and does not support assignment editing.
- The right-side review panels and existing modal copy/structure remain unchanged.
