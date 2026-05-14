# Work Performance Fairness Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use @superpowers:subagent-driven-development (recommended) or @superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `근무 실적` fairness analysis screen, which compares night shifts, weekend/holiday shifts, and Off request acceptance variance by employee based on finalized schedules.

**Architecture:** Keep the existing placeholder route at `/app/work-performance` and replace only `WorkPerformance.vue` with the real screen. Separate read-only Supabase queries into `src/api/workPerformance.ts`, deterministic calculations into `src/utils/workPerformanceFairness.ts`, and shared contracts into `src/types/workPerformance.ts` so UI state does not mix with calculation/query responsibilities.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vite, Tailwind CSS, Naive UI, Supabase direct read, Vitest, Playwright.

---

**Created:** 2026-05-13
**Last updated:** 2026-05-14
**Target screen:** `근무표 조회 > 근무 실적`
**Target route:** `/app/work-performance`
**Target implementation file:** `src/views/schedule/WorkPerformance.vue`
**Document type:** Requirements + engineering implementation plan
**Implementation status:** Requirements are being finalized. `src/views/schedule/WorkPerformance.vue` is currently a placeholder, but the output of this document must be applied to that file as the real work performance fairness analysis screen.

---

## writing-plans Review Reinforcement Result

**Review perspective:** `@superpowers:writing-plans`
**Review date:** 2026-05-14
**Conclusion:** The previous document had enough product requirements, design criteria, and engineering risk analysis, but its plan contract was weak for an agentic worker to execute directly. This reinforcement adds the required plan header, file ownership, TDD execution units, commands/expected results, and commit checkpoints.

### What Was Reinforced

- Added the Goal, Architecture, Tech Stack, and agentic worker handoff wording required by `@superpowers:writing-plans` at the top of the document.
- Specified implementation responsibility and test ownership by file to reduce the risk of query, calculation, and rendering all being mixed into `WorkPerformance.vue`.
- Expanded the previous `Implementation Order` into TDD-based checkbox tasks.
- Added a failing test, expected failure, minimal implementation, verification command, and commit unit for each task.
- Split `lint:check`, `build`, unit tests, E2E tests, and post-implementation `/design-review` into completion gates.

### Application Principles

- This document keeps the `docs/plans/` path selected by the user. It is not moved to the `writing-plans` default storage location, `docs/superpowers/plans/`.
- Route, navigation, and scope preserve existing decisions. The plan reinforcement must not widen the feature scope.
- The subagent review loop is run only when the implementer explicitly chooses it. This session only reinforces the document and does not dispatch a separate worker.

---

## Design Review Reinforcement Result

**Review perspective:** `design-consultation` + `plan-design-review`
**Initial design completeness:** 6/10
**Target design completeness after reinforcement:** 9/10

This plan is already specific enough about fairness calculation criteria and MVP scope, but from the original text alone, the implementer would have had to decide screen hierarchy, state-specific UI, narrow-screen handling, keyboard accessibility, and fairness emphasis expression arbitrarily. The reinforcement below is added based on `DESIGN.md` principles: a "calm operational product", a restrained slate/teal palette, compact-to-comfortable density, and an app workspace-first layout.

A 10/10 score can only be reached after implementation by validating the actual `/app/work-performance` screen with screenshot-based `/design-review`. In particular, table overflow, expanded row height, emphasized color contrast, keyboard focus movement, and screen reader reading order must be checked after the actual DOM and styling exist.

### Design Principles for This Screen

- This screen is a **read-only operational analysis workspace**, not a marketing screen or dashboard mosaic.
- The first visual anchor is the **employee comparison table**, not the summary cards. Summary cards are supporting information that helps the user quickly understand the overall distribution.
- Color must not replace judgment text. Emphasized cells should use color, weight, and text/ARIA descriptions together.
- Card UI should be used only for meaningfully separated information such as summary metrics and state guidance. Do not create decorative card grids above and below the table.
- User-facing UI copy should be written in Korean, and verifiable numbers such as `평균 대비 +3일` should be prioritized over judgmental wording such as "fairness score good".

### Reuse Existing Design Assets

- `DESIGN.md`: Follow Pretendard Variable, IBM Plex Mono, slate/teal tokens, compact-to-comfortable spacing, and desktop-first operational surface principles.
- `src/views/schedule/ScheduleResults.vue`: Reuse the `근무표 조회` overline, `text-2xl` page title, compact year selector, and loading/empty/error state structure.
- `src/views/Dashboard.vue`: Reuse the operational sentence pattern that first explains "what is blocked and what the user can do", as in loading/error/empty section copy.
- Naive UI: Prefer `NButton`, `NSelect`, `NInputNumber`, `NDataTable`, or table patterns already used in the current codebase. Do not add a new component library.

### Excluded from Design Scope

- Mobile-specific redesign: MVP remains desktop-first, with narrow screens limited to protection against layout breakage.
- Trend charts, radar charts, score visualizations: the trust criteria for this screen are numbers and evidence date lists.
- Employee detail profile drawer: provide only row-expanded date lists.
- Automatic fairness status labels: do not add judgment labels such as `양호`, `주의`, or `확인 필요`.
- Design system changes: do not change the colors, fonts, or radius system in `DESIGN.md` for this screen.

---

## Purpose

The `근무 실적` screen compares employee work performance over a selected period so an administrator can confirm whether scheduling fairness is being maintained.

On this screen, administrators should be able to quickly see whether night shifts or weekend/holiday shift burdens are repeatedly concentrated on a specific employee, or whether any employee has relatively fewer accepted Off requests.

At the same time, the screen numerically demonstrates that the schedule-generation engine did not excessively accumulate burden on a specific employee, based on the final confirmed schedule.

---

## Menu Location

Place this screen under the `근무 실적` menu inside `근무표 조회` in the new top navigation structure.

```text
근무표 조회
├── 생성된 근무표
└── 근무 실적
```

`근무 실적` is not a Step 4 or Step 5 screen inside the existing schedule generation/review workflow. It is an analysis screen for looking up finalized operational results across one or more periods, not for editing a specific monthly schedule.

---

## Implementation Target

The implementation target for this requirement is `src/views/schedule/WorkPerformance.vue`.

That file currently renders only a "coming soon" placeholder with the following elements:

- Screen title `근무 실적`
- Empty state `근무 실적 화면은 준비 중입니다`
- Secondary navigation button `생성된 근무표 보기`

This placeholder is a temporary state created to open the top navigation route first. The final implementation must provide period selection, fairness summary cards, emphasis threshold settings, an employee comparison table, and row-level detailed date lists in the same file.

The wording in the previous top navigation plan that said "create only a placeholder" applies only to the scope at the time the route was introduced. This requirements document is the reference document for the real `근무 실적` feature implementation.

Keep the existing route and navigation structure during implementation.

- route path: `/app/work-performance`
- route component: `src/views/schedule/WorkPerformance.vue`
- top menu location: `근무표 조회 > 근무 실적`

`src/views/schedule/ScheduleResults.vue` is the generated schedule lookup screen, so this fairness analysis feature must not be moved into that file.

---

## Reference Data

Fairness metrics are calculated based on the **finalized schedule**.

Drafts generated by the engine or temporary schedules being edited by an administrator are not the default calculation target for this screen. Fairness should be judged based on the final result actually assigned to employees.

### Criteria for Identifying the Finalized Schedule

In the current code, the reference value for a finalized schedule is `schedules.finalized_version_id`.

`schedules` is the monthly container, and actual candidate schedules are stored as versions in `schedule_versions`. The finalization RPC allows finalization only when the selected version is `review_ready`, the latest evaluation is `passed`, and `finalization_gate.allowed = true`. When finalization is complete, it updates `schedule_versions.status = 'finalized'` and also records `schedules.finalized_version_id`, `schedules.finalized_at`, and `schedules.finalized_by`.

Therefore, the calculation target for the `근무 실적` screen is identified by this condition:

```text
schedules.finalized_version_id IS NOT NULL
```

Assignment data is queried with `schedule_assignments.schedule_version_id = schedules.finalized_version_id`.

Do not use `schedules.status = 'complete'` or `schedule_versions.status = 'finalized'` alone as the criterion. The `complete` status can also be set by legacy flows, and the version status alone makes it hard to determine which monthly container's final confirmed version it is.

If any month in the selected period is not finalized but at least one selected month is finalized, display fairness calculations using only finalized months. Exclude non-finalized months from calculation and show a top notice so the user can distinguish the requested period from the actual analysis basis.

---

## Period Selection

The user selects `연도`, `시작 월`, and `종료 월`.

Examples:

```text
2026년 1월 ~ 2026년 3월
2026년 4월 ~ 2026년 6월
```

The period can only be selected within the same year.

Disallowed example:

```text
2025년 12월 ~ 2026년 1월
```

Cross-year periods are excluded from this MVP scope.

---

## Comparison Target

The MVP comparison target is all employees.

Department/team, role or grade, and work-form filters are excluded from this requirement.

Employees who did not work for the entire selected period are excluded from the default fairness comparison target. Simple day-count comparison can be distorted for employees who joined mid-period, resigned, or were on leave.

---

## Fairness Metrics

This screen compares three fairness metrics.

1. Night shift days
2. Weekend and holiday work days
3. Off request accepted days

### Night Shift Days

The number of days assigned as night shifts in the finalized schedule during the selected period.

Night shift burden is considered higher when the count is much higher than average.

### Weekend and Holiday Work Days

The number of days worked on Saturdays, Sundays, and Korean public holidays during the selected period.

Use the already generated `public.public_holidays` table as the reference data for Korean public holidays. Holiday dates are stored in the `public_holidays.holiday_date` column in `YYYY-MM-DD` format. Example: `2026-01-01`.

During implementation, classify each date in the selected period with this rule:

```text
date is Saturday
OR date is Sunday
OR date IN public.public_holidays.holiday_date
```

Compare `holiday_date` as a date-only value. Do not rely on JavaScript `Date` object local timezone conversion, which can shift a day. Compare with `YYYY-MM-DD` strings or date-only helpers.

If there is no `holiday_date` row for the selected period, do not treat that alone as an error. There may simply be no public holidays in that period. However, if the selected year has no `public.public_holidays` rows at all, treat the public holiday reference data as not prepared and block the screen with the `공휴일 데이터 없음` state.

Hospital-specific designated holidays are excluded from the default scope of this requirement.

Weekend and holiday work burden is considered higher when the count is much higher than average.

### Off Request Accepted Days

The number of dates where the employee requested Off and the finalized schedule also assigned Off.

Do not include ordinary days off that became Off in the final schedule without an employee request.

For Off request accepted days, a value lower than average means the employee received relatively less consideration.

---

## Screen Composition

The screen consists of four major areas.

1. Period selection area
2. Fairness summary cards
3. Emphasis threshold settings
4. Employee comparison table

### Information Hierarchy

After entering the screen, the user should understand things in this order:

1. Which period they are currently viewing
2. Whether the selected period is finalized and calculable for fairness
3. Which metric has the largest overall variance
4. Which employee deviates most in an unfavorable direction compared to average
5. Which dates support that number

Follow this screen structure during implementation:

```text
WorkPerformance.vue
└── Page shell: max-w-6xl, px-4, space-y-6
    ├── Header
    │   ├── overline: 근무표 조회
    │   ├── title: 근무 실적
    │   └── helper: 확정된 근무표 기준으로 야간, 주말·휴일, Off 요청 수락 편차를 확인합니다.
    ├── Period controls
    │   ├── 연도 select
    │   ├── 시작 월 select
    │   ├── 종료 월 select
    │   └── 조회 button
    ├── Period state banner
    │   └── 조회 가능 / 확정 누락 / 데이터 없음 / 오류 상태를 section-local로 표시
    ├── Summary metrics
    │   └── 3 compact metric panels: 야간 근무, 주말·휴일 근무, Off 요청 수락
    ├── Threshold controls
    │   └── 강조 기준 input/stepper + 짧은 설명
    └── Employee comparison table
        ├── sortable columns
        ├── highlighted metric cells
        └── expandable evidence rows
```

Period selection should apply via the `조회` button, not automatic lookup. This avoids the screen feeling half-updated while the administrator changes year/start month/end month, and gives confidence that "this period was recalculated".

### Visual Priority by Area

| Area                | What the user must understand first                                   | Visual treatment                                                                 |
| ------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Header              | This is past operational result analysis, not the generation workflow | Same overline/title structure as `ScheduleResults.vue`                           |
| Period controls     | Current calculation range                                             | One-line control group; allow two-line wrap on narrow screens                    |
| Period state banner | Whether calculation is possible                                       | Use semantic tint only for missing finalization/errors; normal state stays quiet |
| Summary metrics     | Average/min/max/max variance per metric                               | Three compact panels; numbers may use mono accent                                |
| Threshold controls  | Which differences should be emphasized                                | Place directly above the table to connect it with the highlight result           |
| Employee table      | Who should be checked first                                           | Largest work surface. Prioritize table density and sticky header                 |
| Expanded row        | Evidence dates behind the number                                      | Open only inside the row; do not use a separate modal/drawer                     |

### AI Slop Prevention Criteria

- Do not make the first screen "three summary cards + a large empty area". It fails if the scroll becomes long before the table is visible.
- Each summary panel is a compact metric panel containing real summary numbers, not a decorative card of equal size.
- Do not use icon-in-circle, gradient backgrounds, decorative blobs, emoji, or hero copy.
- Use amber/error semantic tokens sparingly for emphasis colors. Do not use primary teal as a risk/imbalance color.
- Do not use promotional copy such as "공정성을 한눈에!". Operators want evidence numbers more than explanation.

### Period Selection Area

The user selects a lookup period within the same year.

Required inputs:

- Year
- Start month
- End month

Interaction criteria:

- The default value finds the most recent finalized month and sets that year/month. However, do not auto-query on initial entry; apply only when the user clicks `조회`.
- If there are no finalized schedules yet, use the current year and current month as the default and show the `선택한 기간에 확정된 근무표가 없습니다` state guidance.
- If the start month is after the end month, disable the `조회` button and show `시작 월은 종료 월보다 늦을 수 없습니다` below the controls.
- While querying, show loading state inside the `조회` button. If an existing result is present, do not clear the existing table. Until the new result arrives, show a small helper phrase indicating that this is the "previous query result".
- Cross-year periods should be impossible through the select structure. Do not send the user to a separate error page.

### Fairness Summary Cards

The top summary cards show the overall distribution for each metric numerically.

Display these values for each metric:

- Average
- Minimum
- Maximum
- Maximum variance

Example:

```text
야간 근무
평균 4.2일 · 최소 3일 · 최대 6일 · 최대 편차 2일

주말·휴일 근무
평균 3.1일 · 최소 2일 · 최대 5일 · 최대 편차 2일

Off 요청 수락
평균 2.8일 · 최소 1일 · 최대 4일 · 최대 편차 2일
```

Do not add status labels such as `양호`, `주의`, or `확인 필요` to summary cards. The user judges the overall variance from the numbers.

Visual criteria:

- Each summary panel uses `border-subtle`, `surface-primary`, and `radius-md`.
- Metric names use `text-sm font-semibold`, while average/min/max/variance values use `text-sm` or `text-base`. Do not use hero-size numbers inside a panel.
- Numbers and signed deltas may use an `IBM Plex Mono` style mono accent.
- Write the label for maximum variance accurately so "unfavorable-direction basis" and "overall absolute variance" are not confused. In the MVP, keep the card label as `최대 편차`, but explain in helper text that it means "the value furthest from the average".

### Emphasis Threshold Settings

Values with large differences from average are emphasized with color.

The default emphasis threshold is `3일`. The user must be able to adjust this threshold in the screen.

Emphasis direction:

- Night shifts: emphasize when the value is at least `+threshold days` above average
- Weekend and holiday work: emphasize when the value is at least `+threshold days` above average
- Off request accepted: emphasize when the value is at most `-threshold days` below average

Example:

```text
강조 기준: 3일

야간 근무 평균 4일, 직원 A 7일 -> +3일이므로 강조
Off 요청 수락 평균 4일, 직원 B 1일 -> -3일이므로 강조
```

Emphasis expression criteria:

- Place the emphasis threshold input directly above the table.
- The default control should be an `NInputNumber` or stepper with 1-day increments.
- Allow values from 1 day to 10 days. Do not allow 0 days because it would emphasize every deviation and create visual noise.
- Do not change only the color of emphasized cells. Provide hidden text or an `aria-label` so screen readers can read `강조` or `평균보다 3일 많음/적음`.
- For unfavorable night/weekend-holiday deviations, use an amber tint by default. For insufficient Off request acceptance, use the same amber family but make the direction clear in text.

### Employee Comparison Table

The table compares the three fairness metrics by employee.

Each metric shows both the actual day count and the difference from average.

Example:

```text
근무자      야간 근무        주말·휴일 근무     Off 요청 수락
김민지      7일 (+3일)       4일 (+1일)        2일 (-1일)
박서연      3일 (-1일)       6일 (+3일)        5일 (+2일)
```

The default sort is descending by largest fairness deviation.

The default sort score treats the three metrics as separate metrics with equal weight. Each metric contributes only unfavorable deviation from average to the score.

```text
Sort score =
  max(0, night shift days - night shift average)
+ max(0, weekend/holiday work days - weekend/holiday work average)
+ max(0, Off request accepted average - Off request accepted days)
```

If scores tie, sort again in this order:

- Employees whose night shift count is much higher than average
- Employees whose weekend and holiday work count is much higher than average
- Employees whose Off request accepted count is much lower than average

In other words, employees with accumulated burden or less consideration should appear first.

The user must be able to change sorting by metric in the table.

Table display criteria:

- The first column is employee name; consider sticky-left behavior. If the name is long, apply one-line ellipsis, but the full name must be available through `title` or an accessible name.
- Each metric cell shows `actual day count` and `difference from average` inside the same cell.
- Differences from average use signed format. Example: `+3일`, `-1일`, `0일`.
- If the average is decimal, the difference from average may also be shown to one decimal place. Actual day count is always shown as an integer day count.
- The default sort column may be treated as a separate hidden column named `공정성 편차 점수`. Explain it in the UI with a `확인 우선순위` tooltip or helper copy.
- When the user changes column sorting, reflect the change in `aria-sort` on the column header.
- Include the sentence "평균보다 불리한 방향으로 많이 벗어난 근무자가 먼저 표시됩니다" in the table caption or a screen-reader-only description.

---

## Detailed Review

When an employee row is expanded, the user must be able to see the date lists that support each metric.

Example:

```text
김민지

야간 근무
- 1/3
- 1/8
- 1/14

주말·휴일 근무
- 1/5
- 1/12

Off 요청 수락
- 1/20
- 1/21
```

Detailed date lists are supporting information for verifying the basis of the numbers. The default screen should prioritize readability of the employee comparison table.

Expanded row UI criteria:

- Expand with an explicit `상세 보기` button, not a full-row click.
- Display the expanded area inline below the same table row. Do not use a modal.
- Split the three metrics into three columns; stack them vertically on narrow widths.
- Show dates with month/day and weekday, such as `1/3 토` and `1/8 목`. If the date is a public holiday, attach a secondary `공휴일` label.
- If there are no dates, show `해당 날짜 없음` instead of an empty list.
- Express expanded/collapsed state with `aria-expanded`, and focus must not suddenly jump to the top of the page.

---

## Screen State Criteria

Because this screen reads finalized schedules and multiple periods of data, UI for empty or partially prepared states is important. The implementer must handle all states below separately.

| State                       | What the user sees                                                                                                                                                    | Default action                               |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Initial entry               | Header, period selection, guidance based on latest finalized month or pre-query guidance                                                                              | Select period and click `조회`               |
| Querying                    | If no previous result exists, section-local loading; if a previous result exists, keep the table + query button loading                                               | None                                         |
| Queryable                   | Summary metrics, threshold controls, employee table                                                                                                                   | Sort / expand rows                           |
| Missing finalized month     | Missing month list and guidance that lookup is possible after the entire selected period is finalized                                                                 | Secondary navigation to `생성된 근무표 보기` |
| No finalized schedule       | `선택한 기간에 확정된 근무표가 없습니다` and guidance for generation/lookup flow                                                                                      | `생성된 근무표 보기` or `새 근무표 생성`     |
| No comparison employees     | `선택 기간 전체를 근무한 직원이 없습니다` and explanation of exclusion criteria                                                                                       | Change period                                |
| Missing public holiday data | Blocked state indicating that the Korean public holiday classification basis is not ready because the selected year has no `public.public_holidays.holiday_date` rows | Guidance to check holiday data               |
| No request data             | Show Off request accepted metrics using 0 as the basis, with explanation `선택 기간에 Off 요청이 없습니다`                                                            | None                                         |
| Query failed                | Explain which information could not be loaded and provide retry guidance                                                                                              | `다시 시도`                                  |

If any month is missing finalization but at least one selected month is finalized, still show the result. Showing only the table would make the user misinterpret it as "the whole selected period was calculated", so include a top notice with excluded months and the analysis basis.

The missing public holiday data state is judged by selected-year coverage, not by whether rows exist in the selected period. For example, if a March 2026 lookup period has no holiday rows but there are `holiday_date` rows somewhere in 2026, calculate normally. Conversely, if there are no rows at all for 2026, data sync is likely missing, so block the calculation.

### State Copy Criteria

- Loading: `근무 실적을 계산하는 중입니다`
- Missing finalization notice: `아래 월은 확정된 근무표가 없어 실적 계산에서 제외되었습니다.`
- Global empty: `선택한 기간에 확정된 근무표가 없습니다`
- No comparison target: `이 기간 전체를 근무한 직원이 없습니다`
- Error: `근무 실적을 불러오지 못했습니다`

Each state should contain one-line cause and one next action only. Do not list multiple actions with the same visual weight.

---

## User Journey and Emotional Criteria

| Step | What the user does                           | What the user should feel                                              | What the UI must support                       |
| ---- | -------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------- |
| 1    | Enters `근무표 조회 > 근무 실적`             | "This is an operational result review screen, not a generation screen" | Overline, title, short helper copy             |
| 2    | Selects a period and queries                 | "The period I am viewing is clear"                                     | Applied period summary, disabled invalid range |
| 3    | Skims the summary distribution               | "I can understand the overall variance scale first"                    | Compact metric panels                          |
| 4    | Checks the employees at the top of the table | "The people I need to review appear first"                             | Default fairness deviation sort                |
| 5    | Expands a row and reviews date evidence      | "I can verify why this number exists"                                  | Inline evidence row                            |
| 6    | Adjusts the period or threshold              | "I can re-check according to my criteria"                              | Stable controls, no layout jump                |

Within five seconds, the current period and the purpose of the table should be understandable. Within five minutes, an administrator should be able to explain "why this employee was emphasized" using date evidence. Over the long term, this screen should become the proof surface that builds trust in the generation engine.

---

## Responsive and Accessibility Criteria

Mobile optimization is excluded from the MVP, but key information must not break when the screen becomes narrow.

### Desktop

- This is the primary target.
- Summary metrics can be arranged as three panels in one row.
- Prioritize sticky header for the table.
- Allow horizontal overflow for the table body, but handle it inside the table container so the whole page does not wobble unnecessarily.

### Tablet / Narrow Desktop

- Period controls may wrap to two lines.
- Summary metrics may collapse to two columns or one column.
- The table should keep a minimum width and provide horizontal scroll.
- Threshold controls must remain above the table.

### Mobile

- Full mobile optimization is outside the MVP scope.
- Do not block access.
- Controls and state guidance must remain readable.
- Protect the table with horizontal scroll, and allow a small helper phrase such as "넓은 화면에서 더 보기 쉽습니다".

### Accessibility

- Every form control has a visible label.
- `조회`, `다시 시도`, and `상세 보기` must be keyboard-accessible.
- Row expansion buttons have `aria-expanded`.
- Sortable headers reflect `aria-sort`.
- Emphasized cells must not be color-only.
- The table has a caption or screen-reader-only description.
- Touch targets must be at least 44px.
- Error/empty/loading states keep heading hierarchy and must not lose focus.

---

## Out of Scope

The following items are excluded from this requirement:

- Real AI solver integration
- Fairness comparison between generated drafts and finalized schedules
- Hospital-specific holiday management
- Department/team, role or grade, and work-form filters
- Separate adjusted calculation for mid-period joiners, leavers, or employees on leave
- Employee CRUD or organization CRUD
- Mobile optimization
- Broad analytics dashboard
- Status-label-based judgment copy
- Cross-year period lookup

---

## MVP Completion Criteria

The `근무 실적` fairness analysis screen meets MVP requirements when all conditions below are satisfied.

- `src/views/schedule/WorkPerformance.vue` renders the real fairness analysis screen instead of the placeholder.
- The `/app/work-performance` route continues to use `WorkPerformance.vue`.
- The user can select year, start month, and end month.
- Cross-year periods cannot be selected.
- Metrics are calculated only when every month in the selected period has `schedules.finalized_version_id`.
- Metrics are calculated based on `schedule_assignments.schedule_version_id` for the finalized version.
- The three fairness metrics are calculated for all employees.
- Department/team, role, and work-form filters are not provided.
- Employees who did not work for the entire selected period are excluded from comparison.
- Korean public holidays are identified based on `YYYY-MM-DD` date-only values from `public.public_holidays.holiday_date`.
- Due to current schema limitations, working throughout the selected period is judged by final assignment coverage.
- `src/api/workPerformance.ts` explicitly queries only required columns, and assignment/preference queries use pagination so more than 1000 rows can be read.
- Pure calculation functions in `src/utils/workPerformanceFairness.ts` calculate averages, deltas, emphasis, sorting, and evidence dates.
- The missing public holiday data state must pass a selected-year coverage check separately from the selected-period range query.
- The top summary cards show average, minimum, maximum, and maximum variance.
- The employee table shows actual day count and difference from average.
- The default emphasis threshold is 3 days.
- The user can adjust the emphasis threshold in days.
- Expanding a row shows the evidence date list for the corresponding numbers.
- The default sort is descending by equal-weight deviation score across the three metrics.
- Querying, missing finalization, global empty, no comparison target, missing public holiday data, and query failure states are displayed as distinct UIs.
- The employee comparison table is implemented as the screen's primary visual anchor.
- Emphasized cells do not communicate state by color alone.
- Row expansion, column sorting, and query/retry actions satisfy keyboard and screen reader criteria.
- On narrow screens, controls and state guidance remain readable, and the table is protected with horizontal scroll.
- The implementation follows the typography, color token, spacing, radius, and app workspace principles in `DESIGN.md`.
- Existing placeholder-only tests are updated to match the real screen requirements.
- Unit tests for fairness calculation, Supabase query contract, screen states, and key lookup E2E tests are all added.

---

## Ambiguity Resolution Result

The following items were decided in this document update.

- The implementation target file is `src/views/schedule/WorkPerformance.vue`.
- The current placeholder is treated only as temporary route scaffolding. The real implementation output is applied to this file.
- Korean public holiday data follows the direction of the separate plan, `docs/plans/2026-05-13-public-holidays-solver-integration-plan.md`.
- Employees who did not work for the entire selected period are excluded from the MVP comparison target.
- Department/team, role or grade, and work-form filters are excluded from the MVP.
- Finalized schedules are identified by `schedules.finalized_version_id`, and assignments are queried from `schedule_assignments.schedule_version_id` for that version.
- Fairness deviation sorting treats night shifts, weekend/holiday shifts, and Off request acceptance as separate equal-weight metrics.
- Period changes are applied through the `조회` button, not automatic query.
- On initial entry, the default period prioritizes the most recent finalized month. However, it does not auto-query; it applies only when the user clicks `조회`.
- If there are no finalized schedules, use the current year/current month as the default and show the global empty state.
- The first visual anchor is the employee comparison table, not the summary cards.
- Summary cards are used only as compact metric panels and are not expanded into a dashboard-card mosaic.
- The emphasis threshold input is limited from 1 day to 10 days.
- Detailed date review is provided as an inline table expanded row, not a modal/drawer.
- Mobile-specific optimization is excluded, but controls and state guidance must not break on narrow screens.
- Missing public holiday data is judged not when there is no public holiday row in the selected period, but when there are no `public.public_holidays.holiday_date` rows at all in the selected year.

There are no remaining open questions.

---

## Engineering Review Reinforcement Result

**Review perspective:** `plan-eng-review`
**Review date:** 2026-05-14
**Review target:** Real implementation plan for `src/views/schedule/WorkPerformance.vue`
**Conclusion:** Implementation is feasible. However, if all calculation is placed inside the Vue file, testing and incident response become weak, so implement with a minimal structure that separates data queries and pure calculation.

### Step 0 Scope Challenge

The core of this implementation is not a "new analysis platform"; it is reading already finalized schedule data, calculating fairness metrics, and displaying them.

- **[Layer 1] Reuse the existing route and placeholder.** `/app/work-performance` and `src/views/schedule/WorkPerformance.vue` already exist, so do not add routes or rework navigation.
- **[Layer 1] Keep the existing Supabase direct-read pattern.** Phase 2 documents state that organization/employees/shifts/read-only lookup can keep the existing Supabase direct-read pattern. This screen is read-only analysis, so do not create a new Edge Function.
- **[Layer 1] Reuse the existing public holiday API helper, but reinforce coverage check.** `listPublicHolidayDatesInRange()` already provides date-only range reads. This screen also needs selected-year coverage verification, so add a helper with `hasPublicHolidayCoverageForYear(year)` semantics at the same API boundary.
- **[Layer 3] Because the current DB has no hire/leave date columns, define "employees for the whole selected period" by assignment coverage.** `employees` has no hire/leave/status period columns. In the MVP, only employees who have a finalized version assignment row for every date in the selected period are included in the comparison.
- **Scope reduction:** Charts, score labels, separate detail drawers, department/grade filters, and hospital-specific holidays are excluded from this PR.
- **Complexity criterion:** The recommended write scope is 7 files. Do not exceed the 8-file threshold, and do not create a new service/class.

Recommended implementation scope:

```text
src/views/schedule/WorkPerformance.vue          # Screen state, controls, table rendering
src/api/workPerformance.ts                      # Read-only Supabase query boundary
src/types/workPerformance.ts                    # Screen/calculation-only types
src/utils/workPerformanceFairness.ts            # Pure calculation, date-only helper
tests/unit/work-performance.spec.ts             # Screen state/interaction
tests/unit/work-performance-fairness.spec.ts    # Calculation/sorting/edge cases
tests/unit/work-performance-api.spec.ts         # Supabase query contract
tests/e2e/work-performance.spec.ts              # Primary user flow
```

Do not create `src/composables/useWorkPerformance.ts` in this MVP. Separating only the API boundary and pure calculation functions is enough to reduce complexity in the Vue file, and an additional composable may only increase state ownership.

### superpowers:writing-plans File Map

The file structure below is the ownership map the implementer must check before starting work. Do not add abstractions not listed in this table unless necessary.

| File                                           | Action           | Responsibility                                                                                    | Primary verification files                                                                                                       |
| ---------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/types/workPerformance.ts`                 | Create           | API raw rows, calculation input, metric summary, employee row, load state type                    | `tests/unit/work-performance-fairness.spec.ts`, `tests/unit/work-performance-api.spec.ts`, `tests/unit/work-performance.spec.ts` |
| `src/utils/workPerformanceFairness.ts`         | Create           | Date-only helpers, metric descriptors, averages/deltas/emphasis/sorting/evidence date calculation | `tests/unit/work-performance-fairness.spec.ts`                                                                                   |
| `src/api/workPerformance.ts`                   | Create           | Supabase read-only query, pagination, schedule finalized blocker payload                          | `tests/unit/work-performance-api.spec.ts`                                                                                        |
| `src/api/publicHolidays.ts`                    | Modify           | Add selected-year public holiday coverage helper                                                  | `tests/unit/public-holidays-api.spec.ts`, `tests/unit/work-performance-api.spec.ts`                                              |
| `src/views/schedule/WorkPerformance.vue`       | Modify           | Replace placeholder; period controls, state banner, summary, threshold, table, expansion          | `tests/unit/work-performance.spec.ts`, `tests/e2e/work-performance.spec.ts`                                                      |
| `tests/unit/work-performance.spec.ts`          | Modify           | Remove placeholder assertions; real screen state/interaction tests                                | `pnpm test:unit -- tests/unit/work-performance.spec.ts`                                                                          |
| `tests/unit/work-performance-fairness.spec.ts` | Create           | Pure calculation TDD contract                                                                     | `pnpm test:unit -- tests/unit/work-performance-fairness.spec.ts`                                                                 |
| `tests/unit/work-performance-api.spec.ts`      | Create           | Supabase query chain, pagination, error mapping contract                                          | `pnpm test:unit -- tests/unit/work-performance-api.spec.ts`                                                                      |
| `tests/e2e/work-performance.spec.ts`           | Create           | Admin route, success/blocker/highlight/detail primary flow                                        | `pnpm test:e2e -- tests/e2e/work-performance.spec.ts`                                                                            |
| `tests/e2e/app-shell-top-navigation.spec.ts`   | Modify if needed | Keep `/app/work-performance` navigation smoke; remove placeholder copy assertions                 | `pnpm test:e2e -- tests/e2e/app-shell-top-navigation.spec.ts`                                                                    |

#### Type Contract Skeleton

The implementer starts with the type names in the contract below. If actual column names differ, match them in the API normalize layer, and do not destabilize the calculation utility's public types.

```ts
export type WorkPerformanceMetricKey = 'night' | 'weekendHoliday' | 'offRequestAccepted';

export interface WorkPerformancePeriod {
  year: number;
  startMonth: number;
  endMonth: number;
  startDate: string;
  endDate: string;
}

export interface WorkPerformanceAssignmentRow {
  scheduleVersionId: string;
  employeeId: string;
  date: string;
  shiftId: string | null;
  shiftCode: string | null;
  shiftName: string | null;
}

export interface WorkPerformancePreferenceRow {
  scheduleVersionId: string;
  employeeId: string;
  date: string;
  requestCode: 'O';
}

export interface WorkPerformanceEmployeeRow {
  id: string;
  name: string;
}

export interface WorkPerformanceMetricResult {
  key: WorkPerformanceMetricKey;
  count: number;
  average: number;
  delta: number;
  highlighted: boolean;
  evidenceDates: string[];
}

export interface WorkPerformanceEmployeeResult {
  employeeId: string;
  employeeName: string;
  priorityScore: number;
  metrics: Record<WorkPerformanceMetricKey, WorkPerformanceMetricResult>;
}
```

#### Metric Descriptor Skeleton

Group the three metrics with descriptors instead of scattering them into separate hard-coded branches. However, do not expand this into a generic analytics framework outside the MVP.

```ts
const metricDefinitions = [
  { key: 'night', label: '야간 근무', unfavorableDirection: 'aboveAverage' },
  { key: 'weekendHoliday', label: '주말·휴일 근무', unfavorableDirection: 'aboveAverage' },
  { key: 'offRequestAccepted', label: 'Off 요청 수락', unfavorableDirection: 'belowAverage' },
] as const;
```

### What Already Exists

| Existing asset                                      | Current role                                      | Use in this plan                                      |
| --------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| `src/views/schedule/WorkPerformance.vue`            | Placeholder screen                                | Replace with real screen                              |
| `src/router/index.ts`                               | `/app/work-performance` route and admin org guard | Reuse as is                                           |
| `src/views/schedule/ScheduleResults.vue`            | Page title, loading/error/empty patterns          | Reuse screen hierarchy and state copy patterns        |
| `src/api/publicHolidays.ts`                         | `public_holidays` date-only range read            | Reuse range read, add year coverage helper            |
| Pagination pattern in `src/api/schedule.ts`         | Handles `schedule_assignments` 1000 row limit     | Apply same pagination to assignment/preference reads  |
| `migrations/007_phase2a_trust_layer_foundation.sql` | States `schedule_version_id` source of truth      | Basis for final-version query                         |
| `tests/unit/work-performance.spec.ts`               | Placeholder test                                  | Update to real screen tests                           |
| `tests/e2e/schedule-workflow.spec.ts`               | Route smoke coverage                              | Add separate work-performance E2E or keep route smoke |

### NOT in Scope

- New Edge Function: this is read-only analysis and the existing Supabase direct-read pattern is sufficient.
- DB schema changes: because there are no hire/leave/absence date columns, close the MVP with assignment coverage.
- Fairness ledger reuse: `fairness_ledger_monthly` is a finalized-month ledger, while this screen needs selected-period aggregation and evidence date lists.
- Chart or score visualization: the trust basis for this screen is numbers, deltas from average, and date lists.
- Department/grade/work-form filters: implement first with all employees as the comparison target.
- Mobile-specific table redesign: only protect with horizontal scroll.
- Hospital-specific holidays: use only legal public holidays.

### Architecture Review

#### 1. Data Query Boundary

Do not directly chain together several Supabase tables inside `WorkPerformance.vue`. The screen file owns query state and rendering only; table-by-table queries live in `src/api/workPerformance.ts`.

```text
WorkPerformance.vue
   │
   ├─ loadWorkPerformancePeriod({ organizationId, year, startMonth, endMonth })
   │
   └─ computeWorkPerformanceFairness(input)
         │
         ├─ schedules.finalized_version_id
         ├─ schedule_assignments by finalized version ids
         ├─ schedule_preferences request_code = 'O'
         ├─ employees id/name
         ├─ shifts id/code/name
         └─ public_holidays date-only strings
```

This structure matters because when fairness calculation is mixed with UI, averages, deltas, exclusions, and sorting rules are hard to protect with unit tests.

#### 2. Query Order and State Handling

Implementation follows the order below. Missing finalization is handled as a notice when at least one selected month is finalized, while missing public holiday coverage and no comparison target remain distinct blocker states.

```text
Query click
  │
  ├─ validate same-year range
  │    └─ invalid -> query button disabled
  │
  ├─ load schedules for selected months
  │    ├─ no finalized schedules at all -> global empty
  │    ├─ any selected month missing finalized_version_id -> missing finalization
  │    └─ all months finalized -> continue
  │
  ├─ check public holiday coverage for selected year
  │    ├─ 0 rows in selected year -> missing public holiday data
  │    └─ at least 1 row in selected year -> continue
  │
  ├─ load assignments/preferences/employees/shifts/holiday range
  │
  ├─ compute rows
  │    ├─ no employee with full assignment coverage -> no comparison target
  │    └─ rows exist -> queryable
  │
  └─ render summary + threshold + table
```

#### 3. Assignment Coverage Definition

The current schema has no hire date, leave date, or leave-of-absence period for employees. Therefore, implement "exclude employees who did not work for the entire selected period" as follows:

```text
requiredDates = every YYYY-MM-DD in the selected months
employeeCoverage = unique date count the employee has in finalized assignments

Comparison inclusion condition:
employeeCoverage === requiredDates.length
```

Important notes:

- Off is also a daily status in the finalized schedule, so if there is an assignment row, it is included in coverage.
- An employee missing assignment rows may be a mid-period joiner/leaver/on leave, or it may be a data gap. In the MVP, exclude all such employees from comparison and show excluded count in state helper text.
- This criterion is the MVP definition that can be implemented without DB schema changes. Replace this definition later if hire/leave/absence periods are added.

#### 4. Date-Only Rules

Do not use JavaScript local timezone `Date` conversion for fairness calculation.

Put the helpers below in `src/utils/workPerformanceFairness.ts`.

```text
isIsoDate(value)
compareIsoDate(left, right)
listMonthDates(year, month)
listPeriodDates(year, startMonth, endMonth)
getIsoDayOfWeek(date)      # UTC-based 0-6 or pure algorithm
formatKoreanMonthDay(date) # "1/3 토"
```

All these helpers are unit test targets. In particular, include `2026-01-01`, `2026-03-01`, `2026-10-09`, month ends, and leap day `2028-02-29`.

#### 5. Data Access Contract

`src/api/workPerformance.ts` does not use `select('*')`. It explicitly lists only the required columns.

```text
schedules:
  id, month, finalized_version_id
  where organization_id = active org
  where month between selected start/end

schedule_assignments:
  schedule_version_id, employee_id, date, shift_id, shifts(code, name)
  where schedule_version_id in finalizedVersionIds
  where date between selected start/end
  paginated range(0, 999), range(1000, 1999), ...

schedule_preferences:
  schedule_version_id, employee_id, date, request_code
  where schedule_version_id in finalizedVersionIds
  where request_code = 'O'
  where date between selected start/end
  paginated

employees:
  id, name
  where organization_id = active org
  order name

public_holidays:
  holiday_date
  where country_code = 'KR'
  where is_holiday = true
  where date range matches selected period or selected year coverage check
```

Security boundary: route meta already requires auth, organization context, and admin role. Even so, API helpers must filter organization-owned tables by the active organization, or query only finalized version IDs obtained from organization-scoped `schedules`.

### Code Quality Review

#### Required Module Boundaries

- `WorkPerformance.vue` owns UI state only: draft period controls, applied period, loading/error/blocker states, threshold, sorting, expanded rows.
- `src/api/workPerformance.ts` owns all Supabase query chains and converts raw rows into typed raw input.
- `src/utils/workPerformanceFairness.ts` owns deterministic calculations and has no Vue, router, store, Supabase, or Naive UI import.
- `src/types/workPerformance.ts` owns shared input/output types used by API, utility, and view tests.

#### DRY Rules

- Do not duplicate date range generation in the view and tests. Tests should import the same helper only when directly asserting helper behavior; integration tests should assert user-visible output.
- Do not create separate calculation functions for each metric if one metric descriptor can clearly express direction and evidence extraction.
- Do not create a generic analytics framework. This screen has exactly three metrics in the MVP.

Recommended metric descriptor:

```text
MetricDefinition
  key: 'night' | 'weekendHoliday' | 'offRequestAccepted'
  label: Korean label
  unfavorableDirection: 'aboveAverage' | 'belowAverage'
  collectEvidence(row): YYYY-MM-DD[]
```

This keeps the three metrics explicit while avoiding triplicated average/min/max/delta calculation logic.

#### Error Handling Rules

- Invalid month range is a validation state, not a thrown error.
- Missing finalized month is a non-blocking notice when at least one selected month is finalized.
- Missing public holiday year coverage is a blocker state, not a warning.
- A Supabase error becomes `조회 실패` with retry.
- Unexpected malformed rows are ignored only if they are non-critical display metadata. Missing `employee_id`, `date`, or `schedule_version_id` in assignments is a load failure because the calculation would be untrustworthy.

### Test Review

The test framework detected from `package.json` is Vitest for unit tests and Playwright for E2E.

#### Code Path Coverage Diagram

```text
CODE PATH COVERAGE
==================
[+] src/api/workPerformance.ts
    │
    ├── loadWorkPerformancePeriod()
    │   ├── [GAP] finalized months query filters by organization/month
    │   ├── [GAP] missing finalized month returns blocker payload
    │   ├── [GAP] assignment pagination continues past 1000 rows
    │   ├── [GAP] preference pagination continues past 1000 rows
    │   ├── [GAP] public holiday year coverage distinguishes "no holidays in range" from "no year data"
    │   └── [GAP] Supabase error maps to Korean load error
    │
    └── normalizeWorkPerformanceRows()
        ├── [GAP] nested shifts object and array shape both normalize
        └── [GAP] malformed required row fails loudly

[+] src/utils/workPerformanceFairness.ts
    │
    ├── listPeriodDates()
    │   ├── [GAP] same-year Jan-Mar range
    │   ├── [GAP] invalid inverted range
    │   └── [GAP] leap day
    │
    ├── computeWorkPerformanceFairness()
    │   ├── [GAP] night count uses shift code N only
    │   ├── [GAP] weekend/holiday count dedupes weekend holiday overlap
    │   ├── [GAP] off request accepted counts requested Off that remained Off
    │   ├── [GAP] requested Off assigned to work is not accepted
    │   ├── [GAP] ordinary Off without request is not counted
    │   ├── [GAP] partial-coverage employee is excluded
    │   ├── [GAP] averages/min/max/max deviation use included employees only
    │   └── [GAP] default fairness sort uses unfavorable deltas only

[+] src/views/schedule/WorkPerformance.vue
    │
    ├── period controls
    │   ├── [GAP] default period prefers latest finalized month
    │   ├── [GAP] invalid start/end disables 조회
    │   └── [GAP] changing controls does not mutate applied result until 조회
    │
    ├── state rendering
    │   ├── [GAP] initial
    │   ├── [GAP] loading with no previous result
    │   ├── [GAP] loading with previous result keeps table
    │   ├── [GAP] finalized missing
    │   ├── [GAP] no finalized schedule
    │   ├── [GAP] no comparison employees
    │   ├── [GAP] public holiday data missing
    │   └── [GAP] load failure + retry
    │
    └── table interactions
        ├── [GAP] threshold 1-10 controls highlight
        ├── [GAP] color is not the only highlighted signal
        ├── [GAP] sortable headers expose aria-sort
        ├── [GAP] detail button toggles aria-expanded
        └── [GAP] expanded evidence dates render empty labels when absent
```

#### User Flow Coverage Diagram

```text
USER FLOW COVERAGE
==================
[+] 관리자 조회 flow
    │
    ├── [GAP] [->E2E] Enter `/app/work-performance` and successfully query a period
    ├── [GAP] [->E2E] If a month is missing finalization, show the result table and excluded-month notice
    ├── [GAP] [->E2E] Changing threshold immediately changes emphasized cells
    └── [GAP] [->E2E] Use the detail button to review evidence dates

[+] 접근성 flow
    │
    ├── [GAP] Query, sort, and detail view are keyboard-accessible
    ├── [GAP] aria-sort matches the current sort direction
    └── [GAP] aria-expanded matches expanded row state

[+] 장애/복구 flow
    │
    ├── [GAP] Retry succeeds after initial query failure
    ├── [GAP] Missing public holiday year coverage is a blocked state
    └── [GAP] Previous result is retained during a new query and "previous query result" helper text is shown
```

#### Required Tests

Unit test requirements:

- `tests/unit/work-performance-fairness.spec.ts`
  - Period date list: normal range, inverted range, leap day.
  - Weekend/holiday classification: Saturday, Sunday, public holiday, weekend holiday overlap dedupe.
  - Metric counting: night, weekend/holiday, Off request accepted, ordinary Off exclusion.
  - Partial employee exclusion via assignment coverage.
  - Summary stats: average, min, max, max deviation.
  - Fairness sort tie-breakers: night, weekend/holiday, Off request shortage.
  - Threshold highlight direction: above-average for burden metrics, below-average for Off acceptance.

- `tests/unit/work-performance-api.spec.ts`
  - Schedules query filters by `organization_id` and month range.
  - Assignments query filters by `schedule_version_id in (...)` and date range.
  - Preferences query filters `request_code = 'O'`.
  - Assignment/preference pagination reads beyond 1000 rows.
  - Holiday coverage query checks selected year separately from selected period.
  - Supabase errors throw one Korean load error consumed by the view.

- `tests/unit/work-performance.spec.ts`
  - Replace placeholder assertions with real screen assertions.
  - Initial state, invalid range, loading, success, missing finalized month, no finalized schedule, no comparison employees, public holiday missing, load failure.
  - Query button applies draft controls.
  - Threshold input clamps 1-10.
  - Highlighted cells include visible delta and accessible description.
  - Expand/collapse preserves focus and updates `aria-expanded`.

E2E test requirements:

- `tests/e2e/work-performance.spec.ts`
  - Route is accessible from top navigation.
  - Successful mock data renders summary metrics and table as the primary surface.
  - Missing finalized month blocks calculation.
  - Threshold change updates highlighted cells.
  - Detail expansion shows evidence dates.

Regression test:

- Remove the existing placeholder test assertion for `준비 중입니다`, or rewrite it as a real screen assertion. If it stays as is, the new implementation will fail for the wrong reason.
- Route smoke tests in `tests/e2e/app-shell-top-navigation.spec.ts` should continue to assert navigation to `/app/work-performance`, but should not assert placeholder content.

### Performance Review

The expected MVP scale is not large, but the implementation must not rely on Supabase's default 1000-row limit.

```text
30 employees x 31 days x 3 months = 2,790 assignment rows
30 employees x 36 days x 3 months = 3,240 rows if prior-month generation context leaks in
```

Rules:

- All assignment and preference reads must use pagination or explicit `.range()` loops.
- Query only selected months and finalized version IDs. Do not load all historical assignments for the organization.
- Build maps once:
  - `shiftCodeById`
  - `employeeById`
  - `assignmentsByEmployeeDate`
  - `offRequestDatesByEmployee`
  - `holidayDateSet`
- Summary metrics must be computed in one pass over included employees.
- Expanded evidence rows can be precomputed with the row. Lazy recomputation on every expansion is unnecessary for the MVP.
- No client-side caching is required. The user manually clicks `조회`, and selected-period data is modest.

### Failure Modes

| Codepath                  | Production failure                                   | Test coverage required | Error handling            | User-visible result                                 |
| ------------------------- | ---------------------------------------------------- | ---------------------- | ------------------------- | --------------------------------------------------- |
| finalized schedule lookup | One selected month has no `finalized_version_id`     | yes                    | non-blocking notice       | finalized-month result plus missing-month notice    |
| assignment read           | More than 1000 rows but only first page loaded       | yes                    | pagination                | no silent truncation                                |
| assignment normalization  | Required `date` or `employee_id` missing             | yes                    | fail load                 | `근무 실적을 불러오지 못했습니다`                   |
| public holiday range      | Selected month has no holiday rows but year has rows | yes                    | allow calculation         | normal result                                       |
| public holiday coverage   | Selected year has zero rows                          | yes                    | blocker state             | `공휴일 데이터 없음`                                |
| date calculation          | Timezone shifts date by one day                      | yes                    | date-only helper          | no Date local conversion                            |
| employee inclusion        | Employee missing assignment rows for some dates      | yes                    | exclude from comparison   | comparison empty or helper copy with excluded count |
| Off request accepted      | Ordinary Off counted as accepted request             | yes                    | request set intersection  | correct Off request metric                          |
| load retry                | First query fails, retry succeeds                    | yes                    | retry button resets error | result appears without stale error                  |
| threshold control         | 0 threshold highlights every cell                    | yes                    | clamp/validation 1-10     | no noisy all-highlight state                        |

After this document update, there are no remaining critical silent gaps. All risky paths have been converted into explicit test requirements.

### Agentic Implementation Tasks

Run the tasks below in order. Each commit includes only that task's files, and unrelated local changes must not be staged.

#### Task 1: Date-Only Helpers and Shared Types

**Files:**

- Create: `src/types/workPerformance.ts`
- Create: `src/utils/workPerformanceFairness.ts`
- Create: `tests/unit/work-performance-fairness.spec.ts`

- [ ] **Step 1: Write failing date/helper tests**

  First lock the following behavior in `tests/unit/work-performance-fairness.spec.ts`.

  ```ts
  expect(listPeriodDates(2026, 1, 1)).toContain('2026-01-01');
  expect(listPeriodDates(2028, 2, 2)).toContain('2028-02-29');
  expect(() => listPeriodDates(2026, 3, 1)).toThrow('시작 월은 종료 월보다 늦을 수 없습니다');
  expect(getIsoDayOfWeek('2026-01-03')).toBe(6);
  expect(formatKoreanMonthDay('2026-01-03')).toBe('1/3 토');
  ```

- [ ] **Step 2: Run test to verify it fails**

  Run: `pnpm test:unit -- tests/unit/work-performance-fairness.spec.ts`

  Expected: FAIL because `src/utils/workPerformanceFairness.ts` or helper exports do not exist yet.

- [ ] **Step 3: Add minimal type contract and date-only helpers**

  Add the type skeleton from `superpowers:writing-plans File Map`. Implement helpers without JavaScript local timezone conversion. UTC `Date.UTC()` or pure calendar math is allowed; local interpretation via `new Date('YYYY-MM-DD')` is not.

- [ ] **Step 4: Run test to verify it passes**

  Run: `pnpm test:unit -- tests/unit/work-performance-fairness.spec.ts`

  Expected: PASS for date/helper tests.

- [ ] **Step 5: Commit**

  ```bash
  git add src/types/workPerformance.ts src/utils/workPerformanceFairness.ts tests/unit/work-performance-fairness.spec.ts
  git commit -m "feat: add work performance date helpers"
  ```

#### Task 2: Fairness Calculation Contract

**Files:**

- Modify: `src/types/workPerformance.ts`
- Modify: `src/utils/workPerformanceFairness.ts`
- Modify: `tests/unit/work-performance-fairness.spec.ts`

- [ ] **Step 1: Write failing calculation tests**

  Add tests for night count, weekend/holiday count, Off request accepted count, ordinary Off exclusion, partial coverage exclusion, summary stats, default priority sort, tie-breakers, and threshold direction.

  ```ts
  const result = computeWorkPerformanceFairness({
    period,
    employees,
    assignments,
    offRequests,
    publicHolidayDates: ['2026-01-01'],
    highlightThresholdDays: 3,
  });

  expect(result.rows[0]?.employeeName).toBe('김민지');
  expect(result.rows[0]?.metrics.night.count).toBe(7);
  expect(result.rows[0]?.metrics.night.delta).toBe(3);
  expect(result.rows[0]?.metrics.night.highlighted).toBe(true);
  expect(result.excludedEmployeeCount).toBe(1);
  ```

- [ ] **Step 2: Run test to verify it fails**

  Run: `pnpm test:unit -- tests/unit/work-performance-fairness.spec.ts`

  Expected: FAIL because metric aggregation is not implemented.

- [ ] **Step 3: Implement pure calculation**

  Build maps once: `employeeById`, `assignmentsByEmployeeDate`, `offRequestDatesByEmployee`, `holidayDateSet`. Include only employees whose assignment coverage equals `listPeriodDates(...).length`. Compute summary stats from included employees only.

- [ ] **Step 4: Run test to verify it passes**

  Run: `pnpm test:unit -- tests/unit/work-performance-fairness.spec.ts`

  Expected: PASS for all fairness utility tests.

- [ ] **Step 5: Commit**

  ```bash
  git add src/types/workPerformance.ts src/utils/workPerformanceFairness.ts tests/unit/work-performance-fairness.spec.ts
  git commit -m "feat: compute work performance fairness"
  ```

#### Task 3: Supabase Read Boundary

**Files:**

- Create: `src/api/workPerformance.ts`
- Modify: `src/api/publicHolidays.ts`
- Create: `tests/unit/work-performance-api.spec.ts`
- Modify if needed: `tests/unit/public-holidays-api.spec.ts`

- [ ] **Step 1: Write failing API contract tests**

  Tests must verify schedules are filtered by `organization_id` and month range, assignments/preferences use finalized version IDs and the selected date range, preferences filter `request_code = 'O'`, pagination continues beyond 1000 rows, and selected-year holiday coverage is checked separately from the selected-period holiday range.

- [ ] **Step 2: Run test to verify it fails**

  Run: `pnpm test:unit -- tests/unit/work-performance-api.spec.ts tests/unit/public-holidays-api.spec.ts`

  Expected: FAIL because `src/api/workPerformance.ts` and the year coverage helper are missing.

- [ ] **Step 3: Implement API helper**

  `loadWorkPerformancePeriod({ organizationId, year, startMonth, endMonth })` returns one of these typed outcomes: `success`, `noFinalizedSchedule`, `missingHolidayCoverage`, or throws a Korean load error for query failure. When some selected months are not finalized but at least one selected month is finalized, return `success` with `missingMonths`. Use explicit `select(...)` column lists and `.range()` loops for assignments/preferences.

- [ ] **Step 4: Run test to verify it passes**

  Run: `pnpm test:unit -- tests/unit/work-performance-api.spec.ts tests/unit/public-holidays-api.spec.ts`

  Expected: PASS for API contract tests.

- [ ] **Step 5: Commit**

  ```bash
  git add src/api/workPerformance.ts src/api/publicHolidays.ts tests/unit/work-performance-api.spec.ts tests/unit/public-holidays-api.spec.ts
  git commit -m "feat: load finalized work performance data"
  ```

#### Task 4: WorkPerformance View States

**Files:**

- Modify: `src/views/schedule/WorkPerformance.vue`
- Modify: `tests/unit/work-performance.spec.ts`

- [ ] **Step 1: Replace placeholder tests with failing real-state tests**

  Cover initial state, invalid month range, loading without previous result, loading with previous result, success, missing finalized month, no finalized schedule, no comparison employees, missing holiday coverage, load failure, and retry success.

- [ ] **Step 2: Run test to verify it fails**

  Run: `pnpm test:unit -- tests/unit/work-performance.spec.ts`

  Expected: FAIL because the component still renders the placeholder.

- [ ] **Step 3: Implement screen shell and state rendering**

  Keep the `/app/work-performance` route unchanged. Render header, period controls, state banner, summary metrics, threshold control, and table area in `WorkPerformance.vue`. Use Korean user-facing copy from `상태 copy 기준`.

- [ ] **Step 4: Run test to verify it passes**

  Run: `pnpm test:unit -- tests/unit/work-performance.spec.ts`

  Expected: PASS for state rendering and retry tests.

- [ ] **Step 5: Commit**

  ```bash
  git add src/views/schedule/WorkPerformance.vue tests/unit/work-performance.spec.ts
  git commit -m "feat: render work performance states"
  ```

#### Task 5: Table Interaction, Highlighting, and Accessibility

**Files:**

- Modify: `src/views/schedule/WorkPerformance.vue`
- Modify: `tests/unit/work-performance.spec.ts`

- [ ] **Step 1: Write failing interaction tests**

  Cover draft controls not applying until `조회`, threshold clamp 1-10, highlighted cells showing visible delta plus accessible description, sortable headers updating `aria-sort`, and detail button toggling `aria-expanded` without losing focus.

- [ ] **Step 2: Run test to verify it fails**

  Run: `pnpm test:unit -- tests/unit/work-performance.spec.ts`

  Expected: FAIL for missing sort/highlight/expansion behavior.

- [ ] **Step 3: Implement table behavior**

  Use the calculation result as the single table data source. The first visual anchor must be the employee comparison table, not a decorative metric grid. Keep expansion inline, not modal/drawer.

- [ ] **Step 4: Run test to verify it passes**

  Run: `pnpm test:unit -- tests/unit/work-performance.spec.ts`

  Expected: PASS for interaction and accessibility tests.

- [ ] **Step 5: Commit**

  ```bash
  git add src/views/schedule/WorkPerformance.vue tests/unit/work-performance.spec.ts
  git commit -m "feat: add work performance table interactions"
  ```

#### Task 6: E2E Flow and Existing Navigation Regression

**Files:**

- Create: `tests/e2e/work-performance.spec.ts`
- Modify if needed: `tests/e2e/app-shell-top-navigation.spec.ts`

- [ ] **Step 1: Write failing E2E tests**

  Cover top navigation entry, successful `조회` showing summary + employee table, missing finalized month blocker, threshold change updating highlighted cells, and detail expansion showing evidence dates.

- [ ] **Step 2: Run E2E to verify it fails or exposes missing mocks**

  Run: `pnpm test:e2e -- tests/e2e/work-performance.spec.ts`

  Expected: FAIL until the route test data/mocks and selectors match the implemented screen.

- [ ] **Step 3: Implement E2E support and remove placeholder assertions**

  Use existing E2E helper patterns. Do not assert `준비 중입니다` anywhere after this feature ships.

- [ ] **Step 4: Run E2E to verify it passes**

  Run: `pnpm test:e2e -- tests/e2e/work-performance.spec.ts tests/e2e/app-shell-top-navigation.spec.ts`

  Expected: PASS for work performance flow and navigation smoke.

- [ ] **Step 5: Commit**

  ```bash
  git add tests/e2e/work-performance.spec.ts tests/e2e/app-shell-top-navigation.spec.ts
  git commit -m "test: cover work performance e2e flow"
  ```

#### Task 7: Final Verification Gate

**Files:**

- No new feature files. Only fix files directly responsible for failures found by the commands below.

- [ ] **Step 1: Run focused unit suite**

  Run: `pnpm test:unit -- tests/unit/work-performance-fairness.spec.ts tests/unit/work-performance-api.spec.ts tests/unit/work-performance.spec.ts tests/unit/public-holidays-api.spec.ts`

  Expected: PASS.

- [ ] **Step 2: Run lint**

  Run: `pnpm lint:check`

  Expected: PASS with no ESLint errors. Warnings are allowed only if they are existing project warnings and not introduced by this work.

- [ ] **Step 3: Run production build**

  Run: `pnpm run build`

  Expected: PASS.

- [ ] **Step 4: Run E2E**

  Run: `pnpm test:e2e -- tests/e2e/work-performance.spec.ts`

  Expected: PASS.

- [ ] **Step 5: Run visual QA after implementation**

  Run screenshot-based `/design-review` on `/app/work-performance`. Expected: table overflow, expanded row height, focus state, highlight contrast, and narrow-width layout have no blocking visual issue.

- [ ] **Step 6: Commit verification fixes if any**

  ```bash
  git add <only files fixed during verification>
  git commit -m "fix: stabilize work performance verification"
  ```

### plan-eng-review Completion Summary

```text
+====================================================================+
|          ENGINEERING PLAN REVIEW — COMPLETION SUMMARY              |
+====================================================================+
| Step 0: Scope Challenge      | scope accepted with module boundary  |
| Architecture Review          | 5 issues found, all resolved in plan |
| Code Quality Review          | 3 issues found, all resolved in plan |
| Test Review                  | coverage diagram produced, 33 gaps   |
| Performance Review           | 1 issue found, pagination required   |
| NOT in scope                 | written                              |
| What already exists          | written                              |
| TODOS.md updates             | 0 items proposed; plan captures work |
| Failure modes                | 0 critical silent gaps after update  |
| Outside voice                | skipped for document-only pass       |
| Lake Score                   | 9/9 recommendations chose complete   |
+====================================================================+
```

If the tests above are written together with the feature implementation, this plan is engineering-ready.

---

## plan-design-review Completion Summary

```text
+====================================================================+
|         DESIGN PLAN REVIEW — COMPLETION SUMMARY                    |
+====================================================================+
| System Audit         | DESIGN.md exists; UI scope is APP UI         |
| Step 0               | initial rating 6/10; focus on UI specifics   |
| Pass 1  (Info Arch)  | 5/10 -> 9/10 after hierarchy + diagram       |
| Pass 2  (States)     | 4/10 -> 9/10 after state matrix              |
| Pass 3  (Journey)    | 5/10 -> 9/10 after journey storyboard        |
| Pass 4  (AI Slop)    | 7/10 -> 9/10 after anti-slop constraints     |
| Pass 5  (Design Sys) | 6/10 -> 9/10 after DESIGN.md alignment       |
| Pass 6  (Resp/A11y)  | 4/10 -> 8.5/10 after responsive/a11y rules   |
| Pass 7  (Decisions)  | 6 resolved, 0 deferred                       |
+--------------------------------------------------------------------+
| NOT in scope         | written (5 design items)                     |
| What already exists  | written                                     |
| TODOS.md updates     | 0 items proposed; no TODOS.md exists         |
| Decisions made       | 6 added to plan                              |
| Decisions deferred   | 0                                            |
| Overall design score | 6/10 -> 9/10                                 |
+====================================================================+
```

Plan is design-complete for implementation planning. Run `/design-review` after implementation for visual QA.

## GSTACK REVIEW REPORT

| Review        | Trigger               | Why                             | Runs | Status | Findings                                                          |
| ------------- | --------------------- | ------------------------------- | ---- | ------ | ----------------------------------------------------------------- |
| CEO Review    | `/plan-ceo-review`    | Scope & strategy                | 0    | —      | —                                                                 |
| Codex Review  | `/codex review`       | Independent 2nd opinion         | 0    | —      | —                                                                 |
| Eng Review    | `/plan-eng-review`    | Architecture & tests (required) | 3    | clean  | latest: document strengthened, 9 issues resolved, 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps                      | 3    | clean  | latest score: 6/10 -> 9/10, 6 decisions                           |

- **UNRESOLVED:** 0 unresolved decisions after this document update.
- **VERDICT:** DESIGN + ENG PLAN CLEARED — ready to implement with the required test coverage above.
