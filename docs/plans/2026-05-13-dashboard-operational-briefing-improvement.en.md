# Dashboard Operational Briefing Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the dashboard from a menu collection into an operational briefing screen where an operations manager can immediately understand the next action, blocked state, and recent schedule.

**Architecture:** Do not add a new store, service, or backend endpoint. Use Vue `computed` derived state inside `src/views/Dashboard.vue` and existing route/API helpers. Lock branch logic first in `tests/unit/dashboard.spec.ts`, and align E2E helpers with the new dashboard selectors and the `ScheduleResults.vue` responsibility split.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vite, Tailwind CSS, Naive UI, Pinia, Vitest, Playwright

---

**Date:** 2026-05-13
**Target Screen:** `src/views/Dashboard.vue`
**Related Context:** Dashboard role redefinition after `docs/plans/2026-05-13-dashboard-top-navigation-design-review.ko.md`
**Objective:** Rebuild the dashboard from a feature collection screen into the first screen for operations managers.

## 0. `plan-design-review` Enhancement Results

This plan is an **APP UI** change. It is not a landing page or analytics dashboard. It is an operational briefing screen where a logged-in operations manager starts monthly schedule work.

- Design completeness: **7/10 -> 9/10**
- Additional condition needed for 10/10: after implementation, validate with `/design-review` using desktop and narrow-desktop screenshots
- Main enhancements: information hierarchy, interaction states, empty/error copy, responsive/accessibility rules, anti-AI-slop rules, explicit TODO/non-scope decisions
- Reference document: `DESIGN.md`, especially “calm operational product, dense but readable, minimal chrome”

### `plan-eng-review` Enhancement Results

Keep this as a **single-screen Dashboard.vue refactor**. Do not create a new service, store, or backend endpoint. The required work is to clean up derived dashboard state and template structure.

Engineering verdict:

- Scope: **accepted as-is with one completeness fix**. `schedule list load failure` was missing from primary CTA priority, so add `다시 불러오기` immediately after readiness checks.
- Architecture: **boring by default**. Use Vue `computed`, existing route helpers, existing `getChecklist`, existing `getScheduleList`, and the existing canonical Step5 route only.
- Blast radius: limited to `src/views/Dashboard.vue`, `tests/unit/dashboard.spec.ts`, `tests/e2e/helpers.ts`, and some readiness-related E2E usage.
- Complexity smell: if touched source files exceed 8 or new abstractions exceed 2, scope has grown. In that case, reduce back to pure helpers and computed state inside `Dashboard.vue`.
- Distribution check: no new binary/package/container artifact, so no separate publishing pipeline is needed.
- Lake score: completeness recommendation **5/5**. Cover list failure, stale responses, sorting tie-breakers, route failure, and permission-gated CTA in this plan.

### System Audit

- Automatic base-branch detection failed because `gh` was unavailable. This review treats `main` as the fallback base.
- The current working tree already contains Dashboard/layout-related changes outside this plan. Implementers must not revert unrelated diffs just because this document does not mention them.
- `DESIGN.md` exists, and all screen decisions for color, typography, density, and state should follow it.
- `TODOS.md` does not currently exist. This plan does not create a new TODO file.

### What Already Exists

Reuse existing decisions instead of creating a new visual language.

- Dashboard hierarchy: `what to do next -> what is blocked/ready -> what can be acted on now`
- App UI direction: restrained neutral surface, one meaningful teal accent, minimal chrome
- Typography: `Pretendard Variable` for Korean UI, `IBM Plex Mono` only for timestamps/scores/IDs when useful
- State contract: show loading/empty/error/success/partial state at section level, not only page level
- Existing flow: readiness gate, month-selection modal, canonical Step5 route navigation, `getReadinessRoute`
- Existing top nav decision: `운영 기준`, `근무표 생성`, `근무표 조회`
- Existing API boundary: use `getChecklist(orgId)` for readiness and `getScheduleList(orgId)` for schedule summaries.
- Existing route helpers: reuse `getOpsOrganizationSetupRoutePath`, `getScheduleStepRoutePath`, `getScheduleResultsRoutePath`, and `buildCanonicalStep5RouteLocation`.
- Existing Step5 resolver: keep the `navigateToCanonicalStep5` flow using `getPhase2ScheduleCompare` + `resolveStep5VersionState`.
- Existing tests: `tests/unit/dashboard.spec.ts` already covers readiness gate, Step5 navigation, month-selection modal, and org-change reload. Do not delete those tests; update expectations for the new role.

### `writing-plans` Review Results and Enhancement Scope

The existing plan had enough design and engineering decisions, but lacked execution granularity required by `superpowers:writing-plans`.

- Gap 1: no file responsibility map that an implementer could follow directly.
- Gap 2: no task-level red test -> verify failure -> minimal implementation -> verify pass -> commit flow.
- Gap 3: core derived state such as CTA priority, recent schedule sorting, and stale response guard was too abstract.
- Gap 4: dashboard helper migration and visual QA handoff were not connected to verification commands.

This document addresses those four gaps in `## 4. writing-plans Execution Tasks` and is implementation-ready.

## 0.1 File Responsibility Map

Lock these file boundaries before implementation. If work needs to go beyond this scope, treat that as a new requirement and split it into a separate plan.

- Modify: `src/views/Dashboard.vue`
  - Change the Dashboard template to a vertical stack of `오늘의 다음 작업`, `운영 상태`, and `최근 근무표`.
  - Remove the local `Schedule` interface and import the `ScheduleSummary` type.
  - Add computed values: `primaryDashboardAction`, `sortedSchedulesByRecency`, `latestDisplaySchedule`, `runningSchedule`, `recentActionableSchedule`, and `operationalStatusRows`.
  - Remove `handleEdit`, `handleDelete`, `deletePhase2ScheduleMonth`, and delete dialog/message paths.
  - Add stale response guards to `reloadDashboardData` and `loadSchedules`.
- Modify: `tests/unit/dashboard.spec.ts`
  - Replace legacy dashboard expectations with operational briefing expectations.
  - Lock CTA priority, recent schedule sorting, schedule list failure, `error` schedule Step4 route, and stale response guard with unit tests.
  - Remove dependencies on `deletePhase2ScheduleMonth`, `showSuccess`, and delete dialog mocks.
- Modify: `tests/e2e/helpers.ts`
  - Update `startNewScheduleFromDashboard` to use `dashboard-primary-action` or the `새 근무표 생성하기` CTA.
  - Remove legacy `schedule-card` selector dependency from dashboard helpers.
- Modify as needed: `tests/e2e/schedule-workflow.spec.ts`
  - Any flow that depends on the dashboard full list should navigate to `/app/schedule-results` first and continue from there.
- Read-only reference: `DESIGN.md`, `src/constants/routes.ts`, `src/api/schedule.ts`, `src/utils/date.ts`, `src/utils/scheduleVersionResolver.ts`, `src/utils/message.ts`
  - Use these only to confirm existing helpers, APIs, and types. Do not create new raw route strings, API boundaries, or design token families.
- Do not modify: Supabase migrations, solver integration, organization/employee CRUD, registration/approval flow, Step 3 grid, Step 5 result editor.

## 1. Conclusion

The dashboard is no longer a menu-like screen that repeats `운영 기준`, `근무표 생성`, and `근무표 조회`.

As the first screen a logged-in operations manager sees, it must immediately answer these questions:

```text
Am I ready now?
Is anything blocked?
What should I click next?
Where can I check the latest result?
```

Therefore, when readiness is complete, the dashboard should keep only these three blocks:

```text
1. Today's Next Action
2. Operational Status
3. Recent Schedule
```

## 2. Requirements

### In Scope

- Show exactly one top primary CTA.
- Fix CTA priority in this order:

```text
1. Readiness check failed -> retry readiness
2. Readiness incomplete -> go to the currently blocked readiness item
3. Schedule list check failed -> reload list
4. Running schedule exists -> check generation status
5. Next schedulable month exists -> create new schedule
6. Recent complete/changed schedule exists -> view recent schedule
7. No work -> go to schedule results
```

`운영 기준 확인 실패` means the readiness result itself is not reliable. In this state, do not infer incomplete items; prioritize `다시 확인` over schedule create/view actions. `운영 기준 미완료` should only be evaluated after the checklist response succeeds.

`근무표 목록 확인 실패` means schedule state is not reliable. In this state, the dashboard cannot know running schedules, recent results, or already-created months, so `다시 불러오기` must take priority over `새 근무표 생성하기`.

- Show only one recent schedule.
- Show detailed `운영 기준` items only when readiness is incomplete.
- After readiness is complete, show only summary status such as `운영 기준 준비 완료`.
- Move the full list to the `근무표 조회` screen.

### Out of Scope

- Full schedule list
- Monthly schedule lookup inside the dashboard
- Schedule `수정` and `삭제` buttons inside the dashboard
- Repeated detailed readiness cards
- Feature cards that duplicate top navigation
- Analytics-style dashboard
- Work-performance analysis

## 3. Implementation Plan

### 3.1 Dashboard Screen Structure

Change the ready-state area in `Dashboard.vue` to this structure:

```text
근무표 관리

[오늘의 다음 작업]  <- first visual anchor
- One most important status sentence
- One primary CTA
- One line of supporting context

[운영 상태]
- 운영 기준: 준비 완료 / 확인 필요 / 확인 실패
- 생성 중 근무표: 있음 / 없음
- 최근 완료 근무표: 있음 / 없음
- 확인 필요: 있음 / 없음
  - `확인 필요` only means data trust is broken, such as readiness check failure or schedule list failure.
  - An `error` schedule is not included in this row's `확인 필요`; show it only as the recent schedule status chip.

[최근 근무표]
- Latest 1 item
- Status, created date, score summary
- View
- View full list
```

The design hierarchy must not present the three blocks as three equal parallel cards.

```text
┌──────────────────────────────────────────────────────────────┐
│ 근무표 관리                                                    │
├──────────────────────────────────────────────────────────────┤
│ 오늘의 다음 작업                                                │
│ [Most important status sentence]              [Primary CTA] │
│ supporting context                                             │
├──────────────────────────────────────────────────────────────┤
│ 운영 상태                                                      │
│ 운영 기준      준비 완료 / 확인 필요 / 확인 실패               │
│ 생성 중 근무표 있음 / 없음                                     │
│ 최근 완료 근무표 있음 / 없음                                   │
│ 확인 필요      있음 / 없음                                     │
├──────────────────────────────────────────────────────────────┤
│ 최근 근무표                                                    │
│ 2026-05 근무표  status chip  created date score    [보기]     │
│                                             [전체 목록 보기]   │
└──────────────────────────────────────────────────────────────┘
```

- `오늘의 다음 작업` is the strongest surface. The screen’s purpose is to make the next action clear within three seconds.
- `운영 상태` is a scannable status row list, not a card grid.
- `최근 근무표` shows only one schedule entity. Do not rebuild the full list on this screen.
- Use `text-xl` for section headings, `text-2xl` for the page title, and `text-sm` for body/helper text.
- Use accent color only for the primary CTA and key status states.

Keep the existing incomplete-readiness screen, but clarify its role.

- Keep `dashboard-onboarding-only` only for incomplete readiness.
- Show `organization_profile`, `schedule_foundation`, and `employee_roster` details only in that state.
- After readiness is complete, remove the three detailed items and `확인하기` buttons from the old `dashboard-basic-info-section`.

### 3.2 Add CTA Decision Logic

Create a `primaryDashboardAction` computed value inside the dashboard.

Required fields:

```ts
type DashboardPrimaryActionKey =
  | 'retry_readiness'
  | 'open_readiness_item'
  | 'retry_schedule_list'
  | 'open_running_schedule'
  | 'create_schedule'
  | 'open_recent_schedule'
  | 'open_schedule_results';

interface DashboardPrimaryAction {
  key: DashboardPrimaryActionKey;
  label: string;
  title: string;
  description: string;
  readinessKey?: DashboardReadinessKey;
  schedule?: ScheduleSummary;
  disabled?: boolean;
}
```

`primaryDashboardAction` is an **action descriptor**, not an executor. Actual click handling belongs in `handlePrimaryDashboardAction(action)` with `switch(action.key)`. This lets unit tests verify action keys separately from route side effects and avoids stacking anonymous async closures in the template.

Priority:

1. If readiness check failed, show `다시 확인`.
2. If readiness is incomplete, go to the currently blocked readiness item.
3. If schedule list check failed, show `다시 불러오기`.
4. If a `running` schedule exists, navigate to that schedule’s Step5.
5. If a schedulable month exists and `canManageSchedules` is true, open the month-selection modal.
6. If a recent `complete` or `changed` schedule exists, navigate to that schedule’s Step5.
7. Otherwise, navigate to `/app/schedule-results`.

Do not invent a new rule for `schedulable month`. Use the existing `getDefaultSchedulableMonth(existingScheduleMonthSet) !== null`. If the value is `null`, create is not an action candidate; show the existing warning copy only if the user manually presses a create button.

### 3.3 Compute One Recent Schedule

Compute only one recent schedule from the `schedules` array.

- Do not depend on API response order.
- Prefer `updated_at` when it is a valid date; otherwise fall back to `created_at`.
- For identical timestamps, tie-break by `month` desc and `id` asc. Sorting must be deterministic so test snapshots do not drift.
- Use `running` schedules for generation-in-progress state; if multiple exist, use the same latest-sort rule.
- Use `complete` and `changed` schedules as recent-result CTA candidates, computed separately from `running`.
- Show `error` status in the recent schedule area. When the user clicks `보기` for that month, fill schedule context and route to Step4 instead of Step5.
- `error` status is not a primary CTA candidate. It ranks lower than create/view in primary CTA priority.
- Do not sort the original `schedules` array in place. Copy with `slice()` or spread before sorting in computed state.

### 3.4 Remove Delete/Edit Features

Remove these from the dashboard:

- Full repeated `schedule-card` list
- `수정` button
- `삭제` button
- `handleEdit`
- `handleDelete`
- `deletePhase2ScheduleMonth` import
- Delete error message helper
- `NCard` import used only for full card list display
- `showSuccess` import used only for delete success messages
- Direct `window.$message` call used for unviewable states

Keep the recent schedule `보기` flow through the existing `handleViewSchedule` or equivalent path.

- `created`, `running`, `complete`, `changed`: navigate to the canonical Step5 route.
- `error`: fill `scheduleStore.basicInfo` with the schedule’s `id`, `public_id`, `month`, and organization context, then route to Step4.

Do not block `error` schedules with an unviewable toast. Do not call `window.$message` directly from the template or methods.

### 3.5 Routing

`Dashboard.vue` should use route helpers directly.

- Recent schedule view: `created`, `running`, `complete`, and `changed` use the existing `buildCanonicalStep5RouteLocation` flow.
- Recent `error` schedule view: `getScheduleStepRoutePath(4)`.
- Full list view: `getScheduleResultsRoutePath()`.
- New schedule creation: existing `handleCreateNew`.
- Readiness navigation: existing `getReadinessRoute`.

Do not add new raw path strings.

### 3.6 Interaction State Coverage

Do not implement only boolean branches. Fix the user-visible states as follows.

| Feature               | Loading                                                               | Empty                                                     | Error                                                                              | Success                                         | Partial                                                                                                                |
| --------------------- | --------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Readiness gate        | Show only `dashboard-ops-readiness-loading` and hide schedule actions | N/A                                                       | Retryable state with `다시 확인` primary CTA                                       | Branch to incomplete or complete state          | Missing required key means unavailable, not ready                                                                      |
| Today's next action   | Do not render before readiness loading finishes                       | If there is no work, show `근무표 조회로 이동` CTA        | If readiness fails, show `다시 확인`; if schedule list fails, show `다시 불러오기` | Modal/route navigation after click              | If a running schedule exists, status check beats create CTA                                                            |
| Operational status    | Do not render before readiness loading finishes                       | No schedules is expressed as `없음` row                   | Readiness failure or schedule list failure is expressed as `확인 필요` row         | Express as text chips such as ready/none/exists | Avoid making partial data failure look empty. An `error` schedule is not a data-trust failure and is not included here |
| Recent schedule       | Schedule list loading is a section-local spinner                      | No created schedule + new schedule CTA or lookup guidance | List load failure + retry action                                                   | Show latest one item                            | `error` schedule can be shown and `보기` routes to Step4, but it is not a primary action candidate                     |
| Month selection modal | Positive button loading                                               | Warning if no selectable month exists                     | Keep duplicate/validation failure message                                          | Route to Step1                                  | Already-created months are disabled                                                                                    |

Recommended Korean user-facing copy:

| State                     | Title                                | Description                                                                       | CTA                |
| ------------------------- | ------------------------------------ | --------------------------------------------------------------------------------- | ------------------ |
| Readiness unavailable     | 운영 준비 상태를 확인하지 못했습니다 | 필수 정보가 준비되었는지 확인할 수 없어 다음 작업을 잠시 멈췄습니다.              | 다시 확인          |
| Incomplete readiness      | 운영 기준 확인이 필요합니다          | 근무표 생성을 시작하려면 먼저 막힌 기준 항목을 완료해야 합니다.                   | 현재 항목 확인하기 |
| Schedule list unavailable | 근무표 목록을 확인하지 못했습니다    | 생성 중인 근무표나 이미 만든 계획월을 확인할 수 없어 목록을 다시 불러와야 합니다. | 다시 불러오기      |
| Running schedule          | 생성 중인 근무표가 있습니다          | 생성 상태를 확인하고 이어서 검토할 수 있습니다.                                   | 생성 상태 확인하기 |
| Creatable month           | 새 근무표를 만들 수 있습니다         | 아직 생성하지 않은 다음 계획월을 선택해 생성 흐름을 시작합니다.                   | 새 근무표 생성하기 |
| Recent result             | 최근 완료된 근무표가 있습니다        | 마지막으로 작업한 근무표를 바로 확인할 수 있습니다.                               | 최근 근무표 보기   |
| No immediate work         | 지금 바로 처리할 작업은 없습니다     | 생성된 근무표 목록에서 이전 결과를 확인할 수 있습니다.                            | 근무표 조회로 이동 |

### 3.7 User Journey & Emotional Arc

| Step | User Does                                            | User Should Feel                                        | Plan Specifies                                      |
| ---- | ---------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------- |
| 1    | Enters `/app` after login                            | They immediately know what to click                     | `오늘의 다음 작업` is the first visual anchor       |
| 2    | Sees a blocked readiness state                       | They understand why schedule creation is blocked        | Only the blocked item is exposed as the primary CTA |
| 3    | Returns to the dashboard after readiness is complete | They see an operational briefing, not a menu collection | Status rows and one recent item only                |
| 4    | Checks a running schedule                            | They do not lose in-progress work                       | Running schedule beats create CTA                   |
| 5    | Reopens a recent result                              | They can continue without digging through the full list | One recent item + full list link                    |
| 6    | Uses this repeatedly                                 | They can make the same monthly judgment quickly         | Aligns prepare -> create -> view flow with top nav  |

Time horizon:

- 5 seconds: the user understands the next action by looking only at the `오늘의 다음 작업` CTA.
- 5 minutes: the user scans operational status and the recent schedule to recover current monthly work context.
- Long-term use: the dashboard acts only as a monthly operational briefing and does not duplicate menus.

### 3.8 Visual System Alignment

Follow `DESIGN.md`.

- Surface: prefer `--color-surface-primary`, `--color-surface-secondary`, and subtle borders.
- Accent: use `--color-accent-primary` only for the primary CTA and active/important status.
- Status: use success/warning/error/info semantic tokens and do not communicate meaning by color alone.
- Radius: use `radius-md` or `radius-lg` for panels, `radius-sm` or pill for buttons/chips.
- Shadow: default to borders; use `shadow-soft` only when elevation is needed.
- Typography: page title `text-2xl`, section title `text-xl`, row label/body `text-sm`.
- Mono: use only for inspectable data such as `created_at`, score, or schedule id.
- Forbidden: purple/blue gradients, icon-in-circle decoration, emoji-first empty states, decorative blobs, card-inside-card.

### 3.9 AI Slop Risk Assessment

This screen is **APP UI**, so it fails if it looks like a generic dashboard mosaic.

Hard rejection rules:

- Do not make the three sections equal-height decorative cards.
- Do not use four colored icon circles for `운영 상태`.
- Do not exaggerate `오늘의 다음 작업` into a hero.
- Do not put emoji or marketing copy in empty states.
- Do not wrap the entire Dashboard in one large `NCard` and then repeat cards inside it.

Litmus:

| Check                                           | Result                                                                       |
| ----------------------------------------------- | ---------------------------------------------------------------------------- |
| Brand/product unmistakable in first screen?     | YES, app shell EveryShift + `근무표 관리`                                    |
| One strong visual anchor?                       | YES, `오늘의 다음 작업`                                                      |
| Page understandable by scanning headlines only? | YES, `오늘의 다음 작업`, `운영 상태`, `최근 근무표`                          |
| Each section has one job?                       | YES                                                                          |
| Cards actually necessary?                       | PARTIAL, only recent schedule entity and primary action surface need framing |
| Motion improves hierarchy?                      | NOT REQUIRED, use only hover/focus/section state transitions for app UI      |
| Premium without decorative shadows?             | YES, hierarchy comes from typography/order/borders                           |

### 3.10 Responsive & Accessibility Contract

The MVP is desktop-first, but it must not break on narrow desktop/tablet.

Responsive:

- Desktop: keep the three sections in a vertical stack. Keep dashboard width readable inside the existing app content max width.
- Narrow desktop/tablet: `오늘의 다음 작업` text and CTA must wrap. Keep the CTA inside the same section so it does not detach from the heading.
- Mobile: broad mobile support is out of scope, but text overlap, clipped CTA, and unreachable actions are not allowed.
- `운영 상태` rows should switch from a two-column grid to a single-column row list when narrow.
- `최근 근무표` should stack schedule summary and buttons vertically when narrow.

Accessibility:

- Primary CTA must be a real `<button>` or router link, with a minimum hit target of 44px.
- Status chips must include text such as `준비 완료`, `확인 필요`, `확인 실패`, `있음`, `없음`.
- Do not rely on color alone for state.
- Preserve visible focus rings on all buttons/links.
- The relationship between the `오늘의 다음 작업` section heading and CTA should read naturally for screen readers.
- `다시 확인`, `새 근무표 생성하기`, `최근 근무표 보기`, and `전체 목록 보기` must have distinct accessible names.
- Loading state must not blank the full page; keep section-local guidance visible.

### 3.11 NOT in Scope

- Full schedule workflow mobile redesign: Step 3/Step 5 are desktop-first surfaces per `DESIGN.md`.
- Dashboard analytics/KPI widgets: this screen is an operational briefing, not an analytics dashboard.
- Monthly calendar-style lookup UI: that belongs to the `근무표 조회` screen.
- Organizations, employees, shifts CRUD: outside the MVP seed/setup flow.
- Real AI solver integration: solver integration remains mocked.
- New design system or token family: `DESIGN.md` is already the source of truth.
- Schedule edit/delete inside Dashboard: move responsibility to the dedicated lookup/results screen.

### 3.12 Unresolved Design Decisions

None. Implementers should use the following defaults.

| Decision                           | Default                                                                                                                |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| CTA failure vs incomplete priority | Handle readiness check failure first; only evaluate incomplete items after a successful response                       |
| Complete dashboard layout          | Vertical stack; no equal-card mosaic                                                                                   |
| Recent schedule display            | Show exactly one item; full list is `/app/schedule-results`                                                            |
| `error` schedule                   | May be shown in Recent Schedule; exclude from primary CTA candidates                                                   |
| Operational status `확인 필요`     | Include only data-trust failures such as readiness/schedule list load failure; exclude presence of an `error` schedule |
| Mobile support                     | Full support is out of scope; preventing overlap/clipping is required                                                  |

### 3.13 TODO.md Update

No new TODOs.

Dashboard-specific empty/error/responsive/accessibility decisions are all covered in this plan, so nothing is deferred to `TODOS.md`. If screenshot-based visual QA is needed after implementation, handle it during `/design-review`.

### 3.14 Engineering Architecture Contract

Do not add a new data source. Dashboard reads existing readiness API and schedule summary API, then computes presentation state locally.

```text
/app Dashboard mount or selected organization changes
   │
   ├── reloadDashboardData(loadToken)
   │      │
   │      ├── orgStore.loadOrganization()
   │      ├── orgStore.loadFoundationData(orgId)
   │      ├── loadChecklist(orgId)
   │      │      ├── success -> checklist
   │      │      └── failure -> opsReadinessLoadFailed
   │      │
   │      ├── if readiness unavailable/incomplete -> stop before schedules
   │      │
   │      └── loadSchedules(orgId)
   │             ├── success -> schedules
   │             └── failure -> scheduleListLoadFailed
   │
   └── computed presentation state
          ├── isDashboardReadinessUnavailable
          ├── isDashboardReady
          ├── latestDisplaySchedule
          ├── runningSchedule
          ├── recentActionableSchedule
          ├── operationalStatusRows
          └── primaryDashboardAction
```

Stale response guard:

- `reloadDashboardData` should use a monotonically increasing token such as `dashboardLoadRunId`.
- `loadChecklist` and `loadSchedules` must verify the current token and org id before writing response data into state.
- A slow response from a previous org must not overwrite the dashboard state for the newly selected org.

Search check:

- [Layer 1] Use Vue `computed` and Vue Router helpers. Do not introduce a state machine library, event bus, or dashboard store.
- [Layer 1] Naive UI discrete API is already wrapped by `src/utils/message.ts`. Dashboard must not call `window.$message` directly.
- [Layer 3] This screen is an operational briefing, not an analytics dashboard. Deterministic local derivation is simpler and safer than caching, analytics widgets, or background polling.

### 3.15 Derived State Contract

Separate derived state inside `Dashboard.vue` by these names and responsibilities. Implementers may rename slightly, but must not mix responsibilities.

```text
schedules
   │
   ├── sortedSchedulesByRecency
   │      └── updated_at valid desc -> created_at valid desc -> month desc -> id asc
   │
   ├── latestDisplaySchedule
   │      └── one item shown in Recent Schedule section, no status restriction
   │
   ├── runningSchedule
   │      └── primary CTA candidate, latest item with status === running
   │
   ├── recentActionableSchedule
   │      └── primary CTA candidate, latest item with status in complete/changed
   │
   └── existingScheduleMonthSet
          └── used for month-selection modal disabled calculation
```

If `scheduleListLoadFailed=true`, `runningSchedule`, `recentActionableSchedule`, and `existingScheduleMonthSet` are not reliable. In this state, primary CTA must return `retry_schedule_list`.

### 3.16 Code Quality Contract

- Do not duplicate a local `Schedule` interface. Reuse the existing `ScheduleSummary` type.
- Keep `primaryDashboardAction` as a pure computed descriptor and put side effects in `handlePrimaryDashboardAction`.
- Send `created/running/complete/changed` through the same canonical Step5 route flow in `handleViewSchedule`. For `error`, fill schedule context and route to Step4. Do not create duplicated try/catch branches.
- Keep `getStatusText`, `getStatusType`, and `formatDate` if the recent one-item UI still needs them. Remove them if unused.
- Remove `deletePhase2ScheduleMonth`, `handleDelete`, `handleEdit`, and deletion helper tests from dashboard scope.
- Leave no direct `window.$message` or `window.$dialog` access. Use helpers in `src/utils/message.ts`.
- Keep CSS Tailwind-utility-first. Do not add complex scoped CSS for the dashboard.
- Data-test names should reflect the new role: `dashboard-next-action`, `dashboard-primary-action`, `dashboard-operational-status`, `dashboard-recent-schedule`, `dashboard-schedule-list-retry`.

### 3.17 Production Failure Modes

| Codepath                       | Realistic failure                                               | Handling required                        | Test required                    | User-visible result                               |
| ------------------------------ | --------------------------------------------------------------- | ---------------------------------------- | -------------------------------- | ------------------------------------------------- |
| `reloadDashboardData`          | Previous response arrives late during org change                | Block stale writes with load token       | unit                             | Only new org state is visible                     |
| `loadChecklist`                | Checklist API 500 or required key missing                       | Readiness unavailable                    | unit + existing E2E failure flow | `다시 확인`                                       |
| `loadSchedules`                | Schedule list API 500                                           | Schedule list unavailable                | unit                             | `다시 불러오기`; create CTA hidden/lower priority |
| `primaryDashboardAction`       | Running schedule and creatable month both exist                 | Running wins                             | unit                             | `생성 상태 확인하기`                              |
| `primaryDashboardAction`       | `getDefaultSchedulableMonth(existingScheduleMonthSet) === null` | Exclude create action                    | unit                             | Recent result or lookup CTA                       |
| `primaryDashboardAction`       | `canManageSchedules=false` but creatable month exists           | Exclude create action                    | unit                             | Recent result or lookup CTA                       |
| `recent schedule sorting`      | API responds oldest-first                                       | Local deterministic sort                 | unit                             | Only latest one item shown                        |
| `operationalStatusRows`        | `error` schedule exists                                         | Do not include in `확인 필요` row        | unit                             | Show only as recent schedule status chip          |
| `handleViewSchedule`           | Step5 compare fails                                             | Error message + no route push            | keep existing unit               | Clear error toast                                 |
| `handleViewSchedule`           | Latest schedule has `error` status                              | Fill schedule context and route to Step4 | unit                             | User can rework that month in Step4               |
| `handlePrimaryDashboardAction` | Router push rejects                                             | catch + error message                    | unit                             | Screen remains stable and retryable               |
| `handleMonthConfirm`           | Duplicate month detected after modal opens                      | Keep existing duplicate validation       | keep existing unit               | Modal stays open                                  |
| narrow layout                  | CTA/button text wraps                                           | Responsive classes, no clipping          | E2E viewport                     | CTA remains clickable                             |

Critical gap count after this addendum: **0**. The only critical candidate was schedule-list failure offering create; it is now covered by action priority, copy, and tests.

## 4. `writing-plans` Execution Tasks

Each task is independently reviewable. Implementers should stage and commit only the relevant files after each task. Do not stage unrelated local changes that already exist.

### Task 1: Dashboard role regression tests

**Files:**

- Modify: `tests/unit/dashboard.spec.ts`
- Read: `src/views/Dashboard.vue`

- [ ] **Step 1: Write failing tests for the new ready-state layout**

Add or update tests that assert the ready dashboard renders only the operational briefing surfaces.

```ts
it('renders the operational briefing instead of legacy dashboard sections when ready', async () => {
  getChecklistMock.mockResolvedValue(createReadyChecklist());
  getScheduleListMock.mockResolvedValue([
    createScheduleSummary({ id: 'schedule-1', month: '2026-05', status: 'complete' }),
  ]);

  const wrapper = createWrapper();
  await flushPromises();

  expect(wrapper.find('[data-test="dashboard-next-action"]').exists()).toBe(true);
  expect(wrapper.find('[data-test="dashboard-operational-status"]').exists()).toBe(true);
  expect(wrapper.find('[data-test="dashboard-recent-schedule"]').exists()).toBe(true);
  expect(wrapper.find('[data-test="dashboard-basic-info-section"]').exists()).toBe(false);
  expect(wrapper.find('[data-test="dashboard-create-section"]').exists()).toBe(false);
  expect(wrapper.findAll('[data-test="schedule-card"]')).toHaveLength(0);
  expect(wrapper.text()).not.toContain('수정');
  expect(wrapper.text()).not.toContain('삭제');
});
```

- [ ] **Step 2: Run the test and verify it fails for the expected reason**

Run:

```bash
pnpm test:unit tests/unit/dashboard.spec.ts
```

Expected: FAIL because `dashboard-next-action`, `dashboard-operational-status`, and `dashboard-recent-schedule` do not exist yet, or because legacy sections still render.

- [ ] **Step 3: Add failing tests for primary navigation affordances**

Cover `전체 목록 보기` and the accessible distinction between primary CTA and list navigation.

```ts
it('routes to schedule results from the full-list action', async () => {
  getChecklistMock.mockResolvedValue(createReadyChecklist());
  getScheduleListMock.mockResolvedValue([
    createScheduleSummary({ id: 'schedule-1', month: '2026-05', status: 'complete' }),
  ]);

  const wrapper = createWrapper();
  await flushPromises();

  await wrapper.find('[data-test="dashboard-view-all-schedules"]').trigger('click');

  expect(pushMock).toHaveBeenCalledWith('/app/schedule-results');
  expect(wrapper.find('[data-test="dashboard-primary-action"]').text()).not.toBe(
    wrapper.find('[data-test="dashboard-view-all-schedules"]').text()
  );
});
```

- [ ] **Step 4: Do not implement yet**

This task intentionally stops with red tests. Task 3 implements the template and action handler.

- [ ] **Step 5: Commit the red-test checkpoint**

```bash
git add tests/unit/dashboard.spec.ts
git commit -m "test: lock dashboard briefing layout expectations"
```

### Task 2: Derived state and failure-priority tests

**Files:**

- Modify: `tests/unit/dashboard.spec.ts`
- Read: `src/api/schedule.ts`
- Read: `src/utils/date.ts`

- [ ] **Step 1: Add test fixtures that use `ScheduleSummary` shape**

Ensure test data matches the API summary type and includes `updated_at`.

```ts
function createScheduleSummary(overrides: Partial<ScheduleSummary> = {}): ScheduleSummary {
  return {
    id: 'schedule-1',
    public_id: 'public-schedule-1',
    organization_id: 'org-1',
    month: '2026-05',
    status: 'complete',
    hard_score: 0,
    soft_score: 0,
    created_at: '2026-05-01T00:00:00.000Z',
    updated_at: '2026-05-02T00:00:00.000Z',
    ...overrides,
  };
}
```

- [ ] **Step 2: Write failing tests for CTA priority**

Use separate tests for each priority edge, not one large table that hides failure cause.

```ts
it('prioritizes schedule-list retry over creating a new schedule', async () => {
  getChecklistMock.mockResolvedValue(createReadyChecklist());
  getScheduleListMock.mockRejectedValue(new Error('schedule list failed'));

  const wrapper = createWrapper();
  await flushPromises();

  const primaryAction = wrapper.find('[data-test="dashboard-primary-action"]');
  expect(primaryAction.text()).toContain('다시 불러오기');
  expect(primaryAction.text()).not.toContain('새 근무표 생성');
});

it('prioritizes a running schedule over a creatable month', async () => {
  getChecklistMock.mockResolvedValue(createReadyChecklist());
  getScheduleListMock.mockResolvedValue([
    createScheduleSummary({ id: 'running-1', month: '2026-05', status: 'running' }),
  ]);

  const wrapper = createWrapper();
  await flushPromises();

  expect(wrapper.find('[data-test="dashboard-primary-action"]').text()).toContain(
    '생성 상태 확인하기'
  );
});
```

- [ ] **Step 3: Write failing tests for recent schedule sorting**

Lock deterministic order and non-mutating behavior.

```ts
it('shows one recent schedule sorted by updated_at, created_at, month, then id', async () => {
  const oldFirstApiResponse = [
    createScheduleSummary({
      id: 'b-schedule',
      month: '2026-04',
      created_at: '2026-05-01T00:00:00.000Z',
      updated_at: 'not-a-date',
    }),
    createScheduleSummary({
      id: 'a-schedule',
      month: '2026-06',
      created_at: '2026-05-01T00:00:00.000Z',
      updated_at: 'not-a-date',
    }),
  ];
  getChecklistMock.mockResolvedValue(createReadyChecklist());
  getScheduleListMock.mockResolvedValue(oldFirstApiResponse);

  const wrapper = createWrapper();
  await flushPromises();

  expect(wrapper.find('[data-test="dashboard-recent-schedule"]').text()).toContain('2026-06');
  expect(wrapper.findAll('[data-test="dashboard-recent-schedule"]')).toHaveLength(1);
  expect(oldFirstApiResponse.map((schedule) => schedule.id)).toEqual(['b-schedule', 'a-schedule']);
});
```

- [ ] **Step 4: Write failing tests for stale response guard**

Use two deferred promises so the older org resolves after the newer org.

```ts
it('ignores stale schedule responses after the selected organization changes', async () => {
  const firstSchedules = createDeferred<ScheduleSummary[]>();
  const secondSchedules = createDeferred<ScheduleSummary[]>();
  getChecklistMock.mockResolvedValue(createReadyChecklist());
  getScheduleListMock
    .mockReturnValueOnce(firstSchedules.promise)
    .mockReturnValueOnce(secondSchedules.promise);

  const wrapper = createWrapper();
  await flushPromises();

  rbacStoreMock.selectedOrganizationId = 'org-2';
  organizationStoreMock.current = { ...organizationStoreMock.current, id: 'org-2' };
  await nextTick();

  secondSchedules.resolve([createScheduleSummary({ id: 'new-org-schedule', month: '2026-07' })]);
  await flushPromises();

  firstSchedules.resolve([createScheduleSummary({ id: 'old-org-schedule', month: '2026-01' })]);
  await flushPromises();

  expect(wrapper.text()).toContain('2026-07');
  expect(wrapper.text()).not.toContain('2026-01');
});
```

- [ ] **Step 5: Run tests and verify they fail before implementation**

Run:

```bash
pnpm test:unit tests/unit/dashboard.spec.ts
```

Expected: FAIL on missing operational CTA/sorting/stale guard behavior.

- [ ] **Step 6: Commit the red-test checkpoint**

```bash
git add tests/unit/dashboard.spec.ts
git commit -m "test: cover dashboard action priority and recency"
```

### Task 3: Dashboard derived state implementation

**Files:**

- Modify: `src/views/Dashboard.vue`
- Modify: `tests/unit/dashboard.spec.ts`

- [ ] **Step 1: Replace the local schedule interface**

Remove `interface Schedule` from `Dashboard.vue` and import the existing API type.

```ts
import { getPhase2ScheduleCompare, getScheduleList, type ScheduleSummary } from '@/api/schedule';

const schedules = ref<ScheduleSummary[]>([]);
```

- [ ] **Step 2: Add deterministic recency helpers**

Keep this local to `Dashboard.vue`; do not create a shared utility until another screen needs it.

```ts
function getScheduleSortTime(schedule: ScheduleSummary) {
  const updatedTime = dayjs(schedule.updated_at);
  if (updatedTime.isValid()) {
    return updatedTime.valueOf();
  }

  const createdTime = dayjs(schedule.created_at);
  return createdTime.isValid() ? createdTime.valueOf() : 0;
}

const sortedSchedulesByRecency = computed(() => {
  return [...schedules.value].sort((left, right) => {
    const timeDiff = getScheduleSortTime(right) - getScheduleSortTime(left);
    if (timeDiff !== 0) {
      return timeDiff;
    }

    const monthDiff = right.month.localeCompare(left.month);
    if (monthDiff !== 0) {
      return monthDiff;
    }

    return left.id.localeCompare(right.id);
  });
});

const latestDisplaySchedule = computed(() => sortedSchedulesByRecency.value[0] ?? null);
const runningSchedule = computed(
  () => sortedSchedulesByRecency.value.find((schedule) => schedule.status === 'running') ?? null
);
const recentActionableSchedule = computed(
  () =>
    sortedSchedulesByRecency.value.find(
      (schedule) => schedule.status === 'complete' || schedule.status === 'changed'
    ) ?? null
);
```

- [ ] **Step 3: Add the action descriptor and priority computed**

Keep side effects out of the computed.

```ts
type DashboardPrimaryActionKey =
  | 'retry_readiness'
  | 'open_readiness_item'
  | 'retry_schedule_list'
  | 'open_running_schedule'
  | 'create_schedule'
  | 'open_recent_schedule'
  | 'open_schedule_results';

interface DashboardPrimaryAction {
  key: DashboardPrimaryActionKey;
  label: string;
  title: string;
  description: string;
  readinessKey?: DashboardReadinessKey;
  schedule?: ScheduleSummary;
}

const nextSchedulableMonth = computed(() =>
  getDefaultSchedulableMonth(existingScheduleMonthSet.value)
);

const primaryDashboardAction = computed<DashboardPrimaryAction>(() => {
  if (isDashboardReadinessUnavailable.value) {
    return {
      key: 'retry_readiness',
      label: '다시 확인',
      title: '운영 준비 상태를 확인하지 못했습니다',
      description: '필수 정보가 준비되었는지 확인할 수 없어 다음 작업을 잠시 멈췄습니다.',
    };
  }

  if (!isDashboardReady.value && firstIncompleteReadinessKey.value) {
    return {
      key: 'open_readiness_item',
      label: '현재 항목 확인하기',
      title: '운영 기준 확인이 필요합니다',
      description: '근무표 생성을 시작하려면 먼저 막힌 기준 항목을 완료해야 합니다.',
      readinessKey: firstIncompleteReadinessKey.value,
    };
  }

  if (scheduleListLoadFailed.value) {
    return {
      key: 'retry_schedule_list',
      label: '다시 불러오기',
      title: '근무표 목록을 확인하지 못했습니다',
      description:
        '생성 중인 근무표나 이미 만든 계획월을 확인할 수 없어 목록을 다시 불러와야 합니다.',
    };
  }

  if (runningSchedule.value) {
    return {
      key: 'open_running_schedule',
      label: '생성 상태 확인하기',
      title: '생성 중인 근무표가 있습니다',
      description: '생성 상태를 확인하고 이어서 검토할 수 있습니다.',
      schedule: runningSchedule.value,
    };
  }

  if (canManageSchedules.value && nextSchedulableMonth.value !== null) {
    return {
      key: 'create_schedule',
      label: '새 근무표 생성하기',
      title: '새 근무표를 만들 수 있습니다',
      description: '아직 생성하지 않은 다음 계획월을 선택해 생성 흐름을 시작합니다.',
    };
  }

  if (recentActionableSchedule.value) {
    return {
      key: 'open_recent_schedule',
      label: '최근 근무표 보기',
      title: '최근 완료된 근무표가 있습니다',
      description: '마지막으로 작업한 근무표를 바로 확인할 수 있습니다.',
      schedule: recentActionableSchedule.value,
    };
  }

  return {
    key: 'open_schedule_results',
    label: '근무표 조회로 이동',
    title: '지금 바로 처리할 작업은 없습니다',
    description: '생성된 근무표 목록에서 이전 결과를 확인할 수 있습니다.',
  };
});
```

- [ ] **Step 4: Add stale response guard**

Use a monotonically increasing token and compare both token and organization id before writing async results.

```ts
const dashboardLoadRunId = ref(0);

async function reloadDashboardData() {
  const runId = dashboardLoadRunId.value + 1;
  dashboardLoadRunId.value = runId;

  // existing reset and org load logic

  const organizationId = orgStore.current?.id ?? null;
  const loadedChecklist = await loadChecklist(runId, organizationId);
  if (runId !== dashboardLoadRunId.value || organizationId !== orgStore.current?.id) {
    return;
  }

  if (!loadedChecklist || !hasRequiredReadinessItems.value || !isDashboardReady.value) {
    schedules.value = [];
    return;
  }

  await loadSchedules(runId, organizationId);
}
```

- [ ] **Step 5: Run unit tests**

Run:

```bash
pnpm test:unit tests/unit/dashboard.spec.ts
```

Expected: previously added derived-state tests PASS or fail only on missing template selectors that Task 4 will add.

- [ ] **Step 6: Commit**

```bash
git add src/views/Dashboard.vue tests/unit/dashboard.spec.ts
git commit -m "feat: add dashboard briefing state model"
```

### Task 4: Dashboard template replacement and action handling

**Files:**

- Modify: `src/views/Dashboard.vue`
- Modify: `tests/unit/dashboard.spec.ts`

- [ ] **Step 1: Replace the ready-state template**

Remove the ready-state `dashboard-basic-info-section`, `dashboard-create-section`, full schedule list, edit button, and delete button. Add only these ready-state surfaces:

```text
dashboard-next-action
dashboard-primary-action
dashboard-operational-status
dashboard-recent-schedule
dashboard-view-recent-schedule
dashboard-view-all-schedules
dashboard-schedule-list-retry
```

- [ ] **Step 2: Add operational status rows**

Rows must be text-readable without relying on color.

```ts
const operationalStatusRows = computed(() => [
  {
    key: 'readiness',
    label: '운영 기준',
    value: isDashboardReadinessUnavailable.value
      ? '확인 실패'
      : isDashboardReady.value
        ? '준비 완료'
        : '확인 필요',
  },
  {
    key: 'running_schedule',
    label: '생성 중 근무표',
    value: runningSchedule.value ? '있음' : '없음',
  },
  {
    key: 'recent_schedule',
    label: '최근 완료 근무표',
    value: recentActionableSchedule.value ? '있음' : '없음',
  },
  {
    key: 'data_attention',
    label: '확인 필요',
    value: isDashboardReadinessUnavailable.value || scheduleListLoadFailed.value ? '있음' : '없음',
  },
]);
```

- [ ] **Step 3: Implement primary action handler**

Side effects stay in the handler.

```ts
async function handlePrimaryDashboardAction(action: DashboardPrimaryAction) {
  try {
    switch (action.key) {
      case 'retry_readiness':
        await reloadDashboardData();
        return;
      case 'open_readiness_item':
        if (action.readinessKey) {
          handleOpenReadinessItem(action.readinessKey);
        }
        return;
      case 'retry_schedule_list':
        await loadSchedules();
        return;
      case 'open_running_schedule':
      case 'open_recent_schedule':
        if (action.schedule) {
          await handleViewSchedule(action.schedule);
        }
        return;
      case 'create_schedule':
        handleCreateNew();
        return;
      case 'open_schedule_results':
        await router.push(getScheduleResultsRoutePath());
        return;
    }
  } catch {
    showError('요청한 화면으로 이동하지 못했습니다. 다시 시도해주세요.');
  }
}
```

- [ ] **Step 4: Update recent schedule `error` behavior**

`error` schedule `보기` should route to Step4 after setting schedule context.

```ts
if (schedule.status === 'error') {
  scheduleStore.setBasicInfo({
    ...buildChecklistBasicInfo(schedule.month, schedule.id, schedule.public_id ?? undefined),
  });
  await router.push(getScheduleStepRoutePath(4));
  return;
}
```

- [ ] **Step 5: Remove imports and tests tied only to deletion/editing**

Remove `deletePhase2ScheduleMonth`, `showSuccess`, delete dialog mock, `handleEdit`, `handleDelete`, and related expectations. Keep Step5 compare failure tests.

- [ ] **Step 6: Run unit tests**

Run:

```bash
pnpm test:unit tests/unit/dashboard.spec.ts
```

Expected: PASS for `tests/unit/dashboard.spec.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/views/Dashboard.vue tests/unit/dashboard.spec.ts
git commit -m "feat: replace dashboard with operational briefing"
```

### Task 5: E2E helper migration

**Files:**

- Modify: `tests/e2e/helpers.ts`
- Modify as needed: `tests/e2e/schedule-workflow.spec.ts`
- Read: `src/views/schedule/ScheduleResults.vue`

- [ ] **Step 1: Write or update helper expectations first**

Dashboard helpers should use operational briefing selectors, not deleted schedule cards.

```ts
export async function startNewScheduleFromDashboard(page: Page) {
  await page
    .getByTestId('dashboard-primary-action')
    .filter({ hasText: '새 근무표 생성하기' })
    .click();
}

export async function openExistingScheduleFromDashboard(page: Page) {
  await page.getByTestId('dashboard-recent-schedule').getByRole('button', { name: '보기' }).click();
}
```

- [ ] **Step 2: Move full-list assumptions to schedule results route**

Any test that needs multiple schedules must first navigate through `dashboard-view-all-schedules` or directly to `/app/schedule-results`, then use `ScheduleResults.vue` selectors.

- [ ] **Step 3: Run affected E2E specs**

Run:

```bash
pnpm test:e2e tests/e2e/schedule-workflow.spec.ts
```

Expected: PASS, or fail only on pre-existing environment/auth setup that is documented in the test output.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/helpers.ts tests/e2e/schedule-workflow.spec.ts
git commit -m "test: migrate dashboard e2e helpers to briefing selectors"
```

### Task 6: Final verification and visual QA handoff

**Files:**

- Modify only if verification exposes a real bug: `src/views/Dashboard.vue`, `tests/unit/dashboard.spec.ts`, `tests/e2e/helpers.ts`, `tests/e2e/schedule-workflow.spec.ts`

- [ ] **Step 1: Run lint**

Run:

```bash
pnpm lint:check
```

Expected: PASS with no ESLint errors.

- [ ] **Step 2: Run build**

Run:

```bash
pnpm run build
```

Expected: PASS with `vue-tsc` and Vite build success.

- [ ] **Step 3: Run focused unit tests again**

Run:

```bash
pnpm test:unit tests/unit/dashboard.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Run visual QA after implementation**

Use `/design-review` or the local browser QA flow to capture desktop and narrow desktop screenshots for `/app`. Verify no clipped CTA, no equal-card mosaic, and no nested-card look.

- [ ] **Step 5: Commit verification fixes if any**

Only commit if Step 1-4 required code changes.

```bash
git add src/views/Dashboard.vue tests/unit/dashboard.spec.ts tests/e2e/helpers.ts tests/e2e/schedule-workflow.spec.ts
git commit -m "fix: polish dashboard briefing verification issues"
```

## 5. Test Plan

Test framework, per `package.json`: **Vitest unit** + **Playwright E2E**.

```text
CODE PATH COVERAGE
==================
[+] src/views/Dashboard.vue
    │
    ├── reloadDashboardData()
    │   ├── [PLANNED ★★★] admin access false -> no API calls, restricted fallback
    │   ├── [PLANNED ★★★] org load failure -> readiness unavailable, schedule hidden
    │   ├── [PLANNED ★★★] checklist failure/missing required key -> retry action
    │   ├── [PLANNED ★★★] incomplete required readiness -> onboarding-only
    │   ├── [PLANNED ★★★] ready + schedule load success -> briefing sections
    │   ├── [PLANNED ★★★] ready + schedule load failure -> retry_schedule_list action
    │   └── [PLANNED ★★★] stale org response ignored after selected org changes
    │
    ├── primaryDashboardAction
    │   ├── [PLANNED ★★★] readiness failure beats everything
    │   ├── [PLANNED ★★★] incomplete readiness beats schedule states
    │   ├── [PLANNED ★★★] schedule list failure beats running/create/recent/fallback
    │   ├── [PLANNED ★★★] running schedule beats creatable month
    │   ├── [PLANNED ★★★] canManageSchedules=false removes create candidate
    │   ├── [PLANNED ★★★] recent complete/changed beats fallback
    │   └── [PLANNED ★★★] no work -> schedule results route
    │
    ├── recent schedule derivation
    │   ├── [PLANNED ★★★] updated_at desc, invalid updated_at falls back to created_at
    │   ├── [PLANNED ★★★] deterministic tie-breaker: month desc, id asc
    │   └── [PLANNED ★★★] original schedules array is not mutated
    │
    ├── handlePrimaryDashboardAction()
    │   ├── [PLANNED ★★★] retry readiness calls reloadDashboardData
    │   ├── [PLANNED ★★★] retry schedule list calls loadSchedules
    │   ├── [PLANNED ★★★] readiness item routes through getReadinessRoute
    │   ├── [PLANNED ★★★] running/recent schedule routes through Step5 canonical flow
    │   ├── [PLANNED ★★★] create opens month modal only when permitted
    │   ├── [PLANNED ★★★] fallback uses getScheduleResultsRoutePath()
    │   └── [PLANNED ★★★] route/compare failure shows error and leaves screen stable
    │
    └── removed deletion/editing code
        ├── [PLANNED ★★★] no 수정/삭제 buttons in dashboard
        ├── [PLANNED ★★★] deletePhase2ScheduleMonth is not imported/called
        └── [PLANNED ★★★] no direct window.$message/window.$dialog usage remains

USER FLOW COVERAGE
==================
[+] Dashboard operational briefing
    │
    ├── [PLANNED ★★★] Login -> /app -> next action visible in under one screen
    ├── [PLANNED ★★★] Incomplete readiness -> current blocked item CTA opens setup flow
    ├── [PLANNED ★★★] Ready + running schedule -> 생성 상태 확인하기 opens Step5
    ├── [PLANNED ★★★] Ready + no schedules -> 새 근무표 생성하기 opens month modal
    ├── [PLANNED ★★★] Ready + recent schedule -> 최근 근무표 보기 opens Step5
    ├── [PLANNED ★★★] Schedule list failure -> 다시 불러오기, not generic empty state
    ├── [PLANNED ★★ ] Keyboard tab reaches primary CTA, recent 보기, 전체 목록 보기
    └── [PLANNED ★★ ] [→E2E] narrow desktop no clipped CTA or overlapping action row

────────────────────────────────────────
TARGET COVERAGE: 31/31 planned paths
  Code paths: 23/23
  User flows: 8/8
QUALITY TARGET: ★★★ for all branch logic, ★★ minimum for viewport/a11y E2E
REGRESSION TESTS: schedule list failure priority, deletion/edit removal, helper selector migration
────────────────────────────────────────
```

### Unit Test

Update `tests/unit/dashboard.spec.ts` for the new dashboard role.

Verify:

- In ready state, `오늘의 다음 작업`, `운영 상태`, and `최근 근무표` render.
- In ready state, legacy `dashboard-basic-info-section`, `dashboard-create-section`, and the full `schedule-card` list do not render.
- Even if multiple recent schedules exist, only one is displayed.
- Recent schedule is determined by `updated_at -> created_at -> month -> id`, not API response order.
- Dashboard has no `수정` or `삭제` buttons.
- `deletePhase2ScheduleMonth` is removed from Dashboard test mocks or is not called.
- Clicking `전체 목록 보기` routes to `/app/schedule-results`.
- Clicking recent schedule `보기` routes `created/running/complete/changed` through the existing canonical Step5 route.
- If the recent schedule has `error` status, clicking `보기` routes to Step4 with that schedule context.
- If a running schedule exists, `생성 상태 확인하기` is the primary CTA instead of `새 근무표 생성하기`.
- In incomplete readiness state, detailed readiness items remain.
- In readiness check failure state, the `다시 확인` CTA remains.
- If `canManageSchedules=false`, create CTA is not displayed.
- On schedule list load failure, the dashboard does not look like an empty state; it shows `다시 불러오기` primary CTA and an attention-needed status.
- On schedule list load failure, `새 근무표 생성하기` is not the primary CTA.
- `primaryDashboardAction` follows this priority: readiness failure, incomplete readiness, schedule list failure, running schedule, creatable month, recent result, fallback.
- `운영 상태` renders status text that makes sense without color.
- Even if an `error` schedule exists, the `확인 필요` row in `운영 상태` remains `없음` when there is no data-trust failure.
- Recent schedule area shows only the latest one by `updated_at` and does not recreate the full `schedule-card` list.
- Recent schedule empty/error states do not use generic copy such as `No items found`.
- Primary CTA and `전체 목록 보기` have distinct accessible names.
- If an old request resolves slowly during org change, it does not overwrite the new organization dashboard state.
- If route push or Step5 compare fails, show error message and do not navigate to the wrong route.
- No direct `window.$message` or `window.$dialog` call remains in Dashboard.

### E2E Test

Adjust E2E helpers that depended on the dashboard full list.

- Change `startNewScheduleFromDashboard` to find `dashboard-primary-action` or the `새 근무표 생성하기` CTA.
- Change `openExistingScheduleFromDashboard` to use the `보기` action inside `dashboard-recent-schedule`.
- Tests needing the full list should first navigate to `/app/schedule-results`.
- Move or split helpers that depend on `[data-test="schedule-card"]` so that selector belongs to `ScheduleResults.vue`, not Dashboard.
- Verify at narrow desktop viewport that the `오늘의 다음 작업` CTA and recent schedule action are not clipped.
- Verify keyboard traversal reaches primary CTA, recent schedule `보기`, and `전체 목록 보기`.

### Required Verification Commands

Do not run these for documentation-only changes. Run them after code changes.

```bash
pnpm lint:check
pnpm run build
```

## 6. Completion Criteria

- After login, the next action is visible within three seconds.
- Dashboard does not duplicate top navigation or features.
- Detailed work routes to each dedicated menu.
- The ready-state screen reads as exactly three blocks.
- Only one recent schedule is displayed.
- Schedule edit/delete is not visible in the dashboard.
- Existing readiness gate, month-selection modal, and Step5 navigation flows are not broken.
- If the schedule list cannot load, the dashboard shows `다시 불러오기` instead of suggesting new creation first.
- A slow old response during org switch does not overwrite the latest dashboard state.

## 7. Confirmed Defaults

- Dashboard is an operations-manager-only operational briefing screen.
- Do not expand it into a general user home.
- Recent schedule sorting is computed on the frontend by date.
- If the schedule list is not reliable, derived create/recent-result state is also not reliable.
- User-facing copy is written in Korean.
- Design direction follows existing `DESIGN.md`: “calm operational product, dense but readable, minimal chrome”.

## 8. `plan-design-review` Completion Summary

```text
+====================================================================+
|         DESIGN PLAN REVIEW - COMPLETION SUMMARY                    |
+====================================================================+
| System Audit         | DESIGN.md exists, UI scope is Dashboard.vue  |
| Step 0               | initial 7/10, focused on hierarchy/states/a11y |
| Pass 1  (Info Arch)  | 7/10 -> 9/10 after hierarchy diagram           |
| Pass 2  (States)     | 6/10 -> 9/10 after state matrix/copy           |
| Pass 3  (Journey)    | 7/10 -> 9/10 after storyboard                  |
| Pass 4  (AI Slop)    | 7/10 -> 9/10 after hard rejection rules        |
| Pass 5  (Design Sys) | 8/10 -> 9/10 after DESIGN.md token mapping     |
| Pass 6  (Responsive) | 5/10 -> 8/10 after narrow viewport/a11y rules  |
| Pass 7  (Decisions)  | 5 resolved, 0 deferred                         |
+--------------------------------------------------------------------+
| NOT in scope         | written (7 items)                              |
| What already exists  | written                                        |
| TODOS.md updates     | 0 items proposed                               |
| Decisions made       | 5 added to plan                                |
| Decisions deferred   | 0                                              |
| Overall design score | 7/10 -> 9/10                                   |
+====================================================================+
```

Plan is design-complete for implementation. Run `/design-review` after implementation for visual QA.

## 9. `plan-eng-review` Completion Summary

```text
+====================================================================+
|          ENG PLAN REVIEW - COMPLETION SUMMARY                      |
+====================================================================+
| Step 0: Scope Challenge        | scope accepted with 1 completeness fix |
| Architecture Review            | 1 issue found, addressed in plan        |
| Code Quality Review            | 4 concrete constraints added            |
| Test Review                    | coverage diagram produced, 31 paths     |
| Performance Review             | no new infra, local derivation only     |
| NOT in scope                   | written                                 |
| What already exists            | expanded with route/API/test reuse      |
| TODOS.md updates               | 0 items proposed                        |
| Failure modes                  | 10 listed, 0 critical gaps remaining    |
| Outside voice                  | skipped                                 |
| Lake Score                     | 5/5 complete recommendations chosen     |
+--------------------------------------------------------------------+
| VERDICT                       | ENG READY FOR IMPLEMENTATION            |
+====================================================================+
```

The main engineering correction is explicit: schedule-list failure must be treated as a first-class unreliable state, not as an empty schedule list.

## GSTACK REVIEW REPORT

| Review        | Trigger               | Why                             | Runs | Status | Findings                                          |
| ------------- | --------------------- | ------------------------------- | ---- | ------ | ------------------------------------------------- |
| CEO Review    | `/plan-ceo-review`    | Scope & strategy                | 0    | —      | —                                                 |
| Codex Review  | `/codex review`       | Independent 2nd opinion         | 0    | —      | —                                                 |
| Eng Review    | `/plan-eng-review`    | Architecture & tests (required) | 3    | clean  | scope accepted, 31 planned paths, 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps                      | 2    | clean  | score: 7/10 -> 9/10, 5 decisions                  |

**UNRESOLVED:** 0
**VERDICT:** DESIGN + ENG CLEARED — ready to implement.
