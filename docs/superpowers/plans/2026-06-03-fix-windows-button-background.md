# Fix Windows Button Backgrounds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the issue where button backgrounds turn black on Windows PC under dark mode by explicitly specifying background colors.

**Architecture:** Add `bg-transparent` or `bg-white` classes to all HTML `<button>` elements that currently lack background style definitions, preventing browsers from defaulting to the dark system color `ButtonFace`.

**Tech Stack:** Vue 3, Tailwind CSS

---

### Task 1: Fix Header Navigation and Result Page Buttons

**Files:**

- Modify: `src/components/layout/Header.vue`
- Modify: `src/views/schedule/Step5Result.vue`

- [ ] **Step 1: Modify `src/components/layout/Header.vue`**
      Add `bg-transparent` to the dropdown child buttons on line 54.

  ```vue
  <!-- Before -->
  class="block w-full cursor-pointer px-3 py-2 text-left text-sm font-medium text-slate-700
  hover:bg-teal-50 hover:text-teal-800 focus:bg-teal-50 focus:text-teal-800 focus:outline-none"
  <!-- After -->
  class="block w-full cursor-pointer bg-transparent px-3 py-2 text-left text-sm font-medium
  text-slate-700 hover:bg-teal-50 hover:text-teal-800 focus:bg-teal-50 focus:text-teal-800
  focus:outline-none"
  ```

- [ ] **Step 2: Modify `src/views/schedule/Step5Result.vue`**
      Add `bg-transparent` to the summary card action buttons on line 77.

  ```vue
  <!-- Before -->
  class="rounded-md text-left text-lg font-semibold text-slate-950 underline underline-offset-4
  transition hover:text-slate-700 focus-visible:outline focus-visible:outline-2
  focus-visible:outline-offset-2 focus-visible:outline-slate-900"
  <!-- After -->
  class="rounded-md bg-transparent text-left text-lg font-semibold text-slate-950 underline
  underline-offset-4 transition hover:text-slate-700 focus-visible:outline focus-visible:outline-2
  focus-visible:outline-offset-2 focus-visible:outline-slate-900"
  ```

- [ ] **Step 3: Verify build and lint status**
      Run: `pnpm lint:check`
      Expected: PASS

---

### Task 2: Fix Shift Selector and Comparison Workspace Buttons

**Files:**

- Modify: `src/components/schedule/ShiftSelector.vue`
- Modify: `src/components/schedule/review/ComparisonWorkspace.vue`

- [ ] **Step 1: Modify `src/components/schedule/ShiftSelector.vue`**
      Add `bg-white` to the unselected button colors in `colorMap` on lines 122-127.

  ```typescript
  // Before
  const colorMap: Record<string, string> = {
    D: 'border-shift-day text-green-700',
    E: 'border-shift-evening text-orange-700',
    N: 'border-shift-night text-blue-700',
    O: 'border-shift-off text-gray-700',
  };
  // After
  const colorMap: Record<string, string> = {
    D: 'bg-white border-shift-day text-green-700',
    E: 'bg-white border-shift-evening text-orange-700',
    N: 'bg-white border-shift-night text-blue-700',
    O: 'bg-white border-shift-off text-gray-700',
  };
  ```

- [ ] **Step 2: Modify `src/components/schedule/review/ComparisonWorkspace.vue`**
      Add `bg-transparent` to the inactive states of the view tabs on lines 161 and 170.

  ```vue
  <!-- Before (Line 161 & 170) -->
  :class="offDiffView === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500
  hover:text-slate-800'" :class="offDiffView === 'calendar' ? 'bg-white text-slate-900 shadow-sm' :
  'text-slate-500 hover:text-slate-800'"
  <!-- After -->
  :class="offDiffView === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent
  text-slate-500 hover:text-slate-800'" :class="offDiffView === 'calendar' ? 'bg-white
  text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-800'"
  ```

- [ ] **Step 3: Verify build and lint status**
      Run: `pnpm lint:check`
      Expected: PASS

---

### Task 3: Fix Employee Result Detail and Work Performance Buttons

**Files:**

- Modify: `src/components/schedule/review/EmployeeResultDetail.vue`
- Modify: `src/views/schedule/WorkPerformance.vue`

- [ ] **Step 1: Modify `src/components/schedule/review/EmployeeResultDetail.vue`**
      Add `bg-white` to the calendar buttons on lines 373, 395, and 451.

  ```vue
  <!-- Before (Line 373) -->
  class="mt-auto w-fit rounded-md border border-slate-300 px-2 py-1 text-xs font-medium
  text-slate-700 hover:bg-slate-50"
  <!-- After -->
  class="mt-auto w-fit rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium
  text-slate-700 hover:bg-slate-50"

  <!-- Before (Line 395) -->
  class="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700
  hover:bg-slate-50"
  <!-- After -->
  class="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700
  hover:bg-slate-50"

  <!-- Before (Line 451) -->
  class="shrink-0 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700
  hover:bg-slate-50"
  <!-- After -->
  class="shrink-0 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium
  text-slate-700 hover:bg-slate-50"
  ```

- [ ] **Step 2: Modify `src/views/schedule/WorkPerformance.vue`**
      Add `bg-white` or `bg-transparent` to the sort and detail buttons.

  ```vue
  <!-- Before (Line 347) -->
  class="min-h-11 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700
  hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
  <!-- After -->
  class="min-h-11 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium
  text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"

  <!-- Before (Line 403, 418, 447, 476) -->
  class="min-h-11 rounded-md px-2 text-center font-semibold text-slate-600 focus:outline-none
  focus:ring-2 focus:ring-teal-500"
  <!-- After -->
  class="min-h-11 rounded-md bg-transparent px-2 text-center font-semibold text-slate-600
  focus:outline-none focus:ring-2 focus:ring-teal-500"

  <!-- Before (Line 599) -->
  class="min-h-11 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700
  hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
  <!-- After -->
  class="min-h-11 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium
  text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
  ```

- [ ] **Step 3: Verify build and lint status**
      Run: `pnpm lint:check`
      Expected: PASS

---

### Task 4: Final Validation and Build Check

- [ ] **Step 1: Check build and lint**
      Run: `pnpm run build`
      Expected: Successful compilation without errors.

- [ ] **Step 2: Verification**
      Run: `pnpm lint:check`
      Expected: Successful lint check.
