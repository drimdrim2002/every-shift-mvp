# Build Typecheck Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `npm run build` pass without weakening the current TypeScript strictness baseline.

**Architecture:** Keep `noUncheckedIndexedAccess` enabled and remove the unsafe assumptions it exposed. Fix the failure clusters in dependency order: shared index/day-name lookups first, XLSX parser typing second, Supabase site-requirement normalization third, and the local test/debug type mismatch last. Use build output as the primary regression gate and `pnpm lint:check` as the final repo gate.

**Tech Stack:** Vue 3, TypeScript 5.8, `vue-tsc`, Vite, Supabase JS, `xlsx`, Pinia

---

## Root Cause Summary

- The effective app config now includes `noUncheckedIndexedAccess` through `@vue/tsconfig`, so array and record indexing return `T | undefined` instead of `T`.
- Several files assume indexed values always exist, for example `DAY_NAMES[dayOfWeek]`, `workbook.SheetNames[0]`, `lastMonthDates[j]`, `fullDates[0]`, `str[i]`, and `singleBoxColorMap[key]`.
- `XLSX.utils.sheet_to_json(..., { header: 1 })` is being typed as `Record<string, unknown>[]`, but that mode actually returns row arrays. The current casts are now rejected.
- Supabase `shifts(code)` joins are normalized with unsafe casts in two places, and the local row types do not match the actual query result shape.
- `src/views/TestSchedule.vue` passes a date-keyed `SiteRequirements` object into a store setter that expects `SiteRequirementList` (`SiteRequirementRow[]`).

## Evidence Captured

- Reproduced with `npm run build`
- Confirmed effective config with `npx tsc -p tsconfig.app.json --showConfig`
- Confirmed inherited strictness source in `node_modules/@vue/tsconfig/tsconfig.json`

## Task 1: Fix Shared Indexed-Lookup Failures

**Files:**

- Modify: `src/types/excel.ts`
- Modify: `src/utils/date.ts`
- Modify: `src/components/schedule/ShiftSelector.vue`
- Modify: `src/utils/excelTemplate.ts`
- Modify: `src/utils/excel.ts`

- [ ] **Step 1: Add or reuse safe day-name lookup helpers**

Implementation notes:

- Reuse `dayOfWeekToDayName()` from `src/types/excel.ts` instead of indexing `DAY_NAMES` directly from multiple call sites.
- If the helper is too narrow, expand it so invalid day indexes fail explicitly instead of silently returning `undefined`.

- [ ] **Step 2: Replace direct array and record indexing that now returns `undefined`**

Implementation notes:

- Update `src/utils/date.ts` to derive `dayName` through a helper instead of `['일', ...][date.day()]`.
- Update `src/utils/excelTemplate.ts` to avoid unchecked `DAY_NAMES[dayOfWeek]` and `fullDates[0]` style access.
- Update `src/components/schedule/ShiftSelector.vue` so record lookups such as `singleBoxColorMap[key]` always have an explicit fallback.
- Update `src/utils/excel.ts` `getStringWidth()` so the loop never passes `string | undefined` into `RegExp.test`.

- [ ] **Step 3: Run the build and confirm this error cluster is gone**

Run:

```bash
npm run build
```

Expected:

- `dayName`/indexed lookup errors from `src/types/excel.ts`, `src/utils/date.ts`, `src/components/schedule/ShiftSelector.vue`, `src/utils/excelTemplate.ts`, and `src/utils/excel.ts` are gone
- Remaining errors should now be concentrated in XLSX parsing and site-requirement normalization

- [ ] **Step 4: Commit**

```bash
git add src/types/excel.ts src/utils/date.ts src/components/schedule/ShiftSelector.vue src/utils/excelTemplate.ts src/utils/excel.ts
git commit -m "fix: guard indexed lookups for strict typecheck"
```

## Task 2: Correct XLSX Parsing Types And Workbook Guards

**Files:**

- Modify: `src/utils/excel.ts`
- Modify: `src/utils/excelParser.ts`

- [ ] **Step 1: Normalize `sheet_to_json` typing for `header: 1` mode**

Implementation notes:

- Stop using `sheet_to_json<Record<string, unknown>>(..., { header: 1 })` in these files.
- Replace with a row-array type that matches runtime behavior, for example `unknown[][]` or a small helper that returns row arrays.
- Keep conversions local and explicit instead of broad `as` casts.

- [ ] **Step 2: Add explicit worksheet, row, and date guards where indexed values are reused**

Implementation notes:

- Guard `workbook.Sheets[firstSheetName]` after checking the first sheet name.
- Guard `lastMonthDates[j]`, `dates[j]`, and similar indexed values before dereferencing `.date`.
- Prefer early `throw new Error(...)` for structurally invalid Excel input instead of silent fallback.

- [ ] **Step 3: Re-run the build**

Run:

```bash
npm run build
```

Expected:

- TS2352/TS2345/TS2532 errors in `src/utils/excel.ts` and `src/utils/excelParser.ts` disappear
- Remaining errors should now be limited to site-requirement query normalization and the debug page mismatch

- [ ] **Step 4: Commit**

```bash
git add src/utils/excel.ts src/utils/excelParser.ts
git commit -m "fix: align xlsx parsing with strict typings"
```

## Task 3: Normalize Supabase Site-Requirement Query Shapes

**Files:**

- Modify: `src/api/employee.ts`
- Modify: `src/composables/useSiteRequirements.ts`
- Optional Modify: `src/api/supabase.ts`

- [ ] **Step 1: Define one normalized row shape for `site_requirements` query results**

Implementation notes:

- Treat the raw Supabase response shape as untrusted until normalized.
- Remove `as { code: string }` and `as SiteRequirementRow[]` casts.
- Introduce a small local normalizer that extracts `day_of_week`, `required_count`, and `shiftCode` safely from the raw query result.

- [ ] **Step 2: Decide how to handle `shifts(code)` relation shape explicitly**

Implementation notes:

- If the query result is typed as `shifts: { code: string }[]`, normalize from the first item with a guard.
- If a typed client or a more precise query can make it `shifts: { code: string } | null`, do that only if it stays scoped to this fix.
- Do not weaken typing with `unknown as` just to silence `vue-tsc`.

- [ ] **Step 3: Replace direct `DAY_NAMES[row.day_of_week]` usage in API normalization**

Implementation notes:

- Use the shared day-name helper so `loadSiteRequirements()` returns a guaranteed `dayName: string`.

- [ ] **Step 4: Re-run the build**

Run:

```bash
npm run build
```

Expected:

- Errors in `src/api/employee.ts` and `src/composables/useSiteRequirements.ts` are gone
- Only the remaining local type mismatch, if any, should be left

- [ ] **Step 5: Commit**

```bash
git add src/api/employee.ts src/composables/useSiteRequirements.ts src/api/supabase.ts
git commit -m "fix: normalize site requirement query typings"
```

Note:

- Only include `src/api/supabase.ts` in the commit if the implementation actually changes it.
- A full generated Supabase schema can be a follow-up task if the minimal normalization fixes the build cleanly.

## Task 4: Resolve Local Domain-Type Drift In The Debug View

**Files:**

- Modify: `src/views/TestSchedule.vue`
- Read: `src/stores/schedule.ts`
- Read: `src/types/schedule.ts`

- [ ] **Step 1: Keep the store contract canonical**

Implementation notes:

- `useScheduleStore().setSiteRequirements()` currently accepts `SiteRequirementList` (`SiteRequirementRow[]`).
- Do not broaden the store API just to accommodate sample/debug data unless there is a real product need.

- [ ] **Step 2: Convert the sample data in `TestSchedule.vue` to match the store contract**

Implementation notes:

- Replace the date-keyed `SiteRequirements` sample with a `SiteRequirementList` sample array, or stop passing it into `setSiteRequirements()` if the page no longer needs that action.

- [ ] **Step 3: Run the build**

Run:

```bash
npm run build
```

Expected:

- `npm run build` completes successfully
- Vite production bundle step starts and finishes after `vue-tsc`

- [ ] **Step 4: Commit**

```bash
git add src/views/TestSchedule.vue
git commit -m "fix: align debug view with site requirement types"
```

## Task 5: Final Verification

**Files:**

- Read: `package.json`

- [ ] **Step 1: Run the full build**

Run:

```bash
npm run build
```

Expected:

- exit code `0`
- no TypeScript errors
- Vite build output completes normally

- [ ] **Step 2: Run repository lint gate**

Run:

```bash
pnpm lint:check
```

Expected:

- exit code `0`
- no ESLint errors

- [ ] **Step 3: Capture completion notes**

Implementation notes:

- Summarize which strictness failures were fixed by indexed-lookup guards, which by XLSX typing corrections, and which by Supabase normalization.
- If any optional hardening was deferred, record it separately from the build-fix scope.
