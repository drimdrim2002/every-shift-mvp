# Dashboard Top Fixed Navigation Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the EveryShift MVP app shell from a left sidebar to a top fixed navigation menu, and widen the horizontal workspace for the schedule-generation workflow.

**Architecture:** First extract the RBAC menu visibility and active-route normalization logic currently owned by `Sidebar.vue` into `useAppNavigation.ts`. `Header.vue` will consume this composable and render only the top nav, while `DefaultLayout.vue` will be simplified into a sticky header + route content structure. Add two new read-only lookup routes inside the app shell, without touching backend/API code or schedule workflow business logic.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vite, Tailwind CSS, Naive UI, Pinia, Vue Router, Vitest, Playwright.

---

**Created:** 2026-05-13
**Review perspectives:** `plan-design-review` + `plan-eng-review` + `superpowers:writing-plans`
**Target screens:** `/app` app shell, `Dashboard.vue`, schedule generation workflow entry point
**Conclusion:** For the current EveryShift MVP, a **top fixed menu + task-step-centered UI** is more appropriate than a left fixed sidebar.

---

## Direct Recommendation

Remove the left sidebar and change the app shell to a top fixed header structure.

The reason is simple. The current primary menu is centered around `운영 기준`, `근무표 생성`, and `근무표 조회`, while EveryShift's core work surface is a 30 employees x 36 days schedule grid. The sidebar continuously creates unused vertical empty space and reduces horizontal width, which is the most expensive resource in this product.

Menu names should follow the user's monthly work flow: **prepare -> generate -> look up**.

Recommended top nav:

```text
운영 기준
근무표 생성
근무표 조회
```

This naming also matches the "calm operational product" direction in the current `DESIGN.md` from the `design-consultation` perspective. The menu should communicate work context before brand-like wording. `기본 정보` conflicts with the schedule workflow Step 1 label `기본 정보`, so it should not be used in the top nav. `지난 결과 보기` is semantically close, but it is long and retrospective; `근무표 조회` is a more stable parent menu that can contain both generated schedules and per-employee performance.

Submenu structure:

```text
운영 기준
├── 병원 정보
├── 병동/근무 기준
└── 직원 정보

근무표 생성
└── No submenu

근무표 조회
├── 생성된 근무표
└── 근무 실적
```

`근무표 생성` is a single primary action where the user creates a new planning month, so do not add a submenu. Clicking the top menu item itself should enter the generation workflow. Screen titles or CTAs may use `새 근무표 만들기` when separate text is needed, but the top nav label should remain `근무표 생성`.

Recommended structure:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ EveryShift   운영 기준   근무표 생성   근무표 조회             조직 / 권한 / 로그아웃 │
└─────────────────────────────────────────────────────────────────────────────┘
│                                                                             │
│  [Page title / current next action]                                          │
│                                                                             │
│  Dashboard or Schedule Step workspace                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

Inside the schedule workflow, do not add more global menu chrome. Put step-style progress at the top of the screen content.

```text
EveryShift | 운영 기준 | 근무표 생성 | 근무표 조회              세브란스병원 / 운영 관리자
─────────────────────────────────────────────────────────────────────────────
근무표 생성
[1 기본 정보] ─ [2 사이트 기준] ─ [3 직원 기준] ─ [4 오프 입력] ─ [5 결과 검토]
─────────────────────────────────────────────────────────────────────────────
Large schedule / input / review workspace
```

---

## System Audit

### Base Branch

The PR base could not be auto-detected because the `gh` command was unavailable. This review uses `main` as the baseline.

### Current UI Scope

This change does not alter backend or schedule generation business logic. Existing route paths should be kept, while two read-only route contracts should be added so lookup menus can be opened directly.

Included scope:

- App shell structure in `DefaultLayout.vue`
- Brand, global menu, and organization/account area in `Header.vue`
- Deletion of `Sidebar.vue`
- Content width, page chrome, and duplicate CTA cleanup in `Dashboard.vue`
- Top nav naming system: `운영 기준`, `근무표 생성`, `근무표 조회`
- Definition of two lookup purposes: review generated schedules, review period performance by employee
- Add `근무표 조회 > 생성된 근무표` route: `/app/schedule-results`
- Add `근무표 조회 > 근무 실적` route: `/app/work-performance`
- For this implementation, create only an empty placeholder page for `근무 실적`.
- Clearly place the stepper on schedule routes as a workflow step indicator at the top of the content area

Excluded scope:

- Expanding organization/employee/shift CRUD
- Full mobile support
- Real AI solver integration
- Analytics dashboard or broad report center
- Actual aggregation/analysis features for `근무 실적`
- Full admin shell assuming six or more menus such as approval/reporting

### What Already Exists

Criteria to reuse:

- `DESIGN.md` is the active design contract.
- The app UI direction is "calm operational product, dense but readable, minimal chrome."
- Dashboard hierarchy is `readiness and next action -> schedule work area -> lower-priority metadata`.
- Top nav should first reveal the user's monthly flow: `준비 -> 생성 -> 조회`.
- Sidebar/header are infrastructural chrome, not promotional elements.
- Step 3 grid is a desktop-first critical high-density surface.
- Header and sidebar actions must be keyboard accessible.
- User-facing UI text is Korean.

Current code structure confirmed:

- The app shell in `src/components/layout/DefaultLayout.vue` is composed of `n-layout-sider` + `n-layout-header`.
- The left menu is handled by the `n-menu` in `src/components/layout/Sidebar.vue`.
- The top-right organization selector and logout are handled by `src/components/layout/Header.vue` and `OrganizationSwitcher.vue`.
- Dashboard content in `src/views/Dashboard.vue` already handles the readiness gate and schedule list in substantial detail.

---

## Design Scope Assessment

### Initial Rating

The current proposal is **7/10**.

What is good:

- The decision to recover horizontal space fits the product's core task.
- It correctly recognizes the constraint that there are only a few current menu items.
- It clearly prioritizes Step 3 grid width.

What is missing:

- Active state, overflow state, and permission-based menu visibility rules for the top menu are not yet defined.
- The Dashboard content still risks looking like "cards inside a large card."
- The role separation between the schedule workflow stepper and global nav must be clearer.
- Layout rules are needed for narrow desktop/tablet when the organization selector text becomes long.

To reach 10/10, the document must specify:

- app shell information architecture
- active nav rules per route
- interaction states
- responsive behavior
- keyboard/screen reader contract
- implementation file scope and test scope

---

## Pass 1: Information Architecture

**Rating:** 7/10 -> 9/10

### Recommended Structure

The app shell should have only three areas. Primary nav should read in the order of the user's work: `준비 -> 생성 -> 조회`.

```text
Top App Header
├── Brand: EveryShift
├── Primary Nav
│   ├── 운영 기준
│   ├── 근무표 생성
│   └── 근무표 조회
└── Account Context
    ├── Selected organization
    ├── Role label
    └── Logout
```

Top nav naming contract:

| Candidate        | Decision           | Reason                                                                                                                                                                   |
| ---------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `기본 정보`      | Reject for top nav | Conflicts with schedule Step 1 `기본 정보`. Hospital/ward/employee information is closer to operational criteria prepared before generation than to simple input values. |
| `운영 기준 설정` | Shorten            | The meaning is right, but it is too long for top nav. Because the submenu already communicates setup, `운영 기준` reads faster.                                          |
| `운영 기준`      | Use                | Accurately groups hospital/ward/employee criteria that must be prepared before schedule generation.                                                                      |
| `지난 결과 보기` | Reject for top nav | It is long and retrospective. It is too narrow as a parent menu that also contains performance lookup.                                                                   |
| `근무표 조회`    | Use                | Work-oriented wording that contains both generated schedules and per-employee performance lookup.                                                                        |

Primary nav hierarchy:

```text
운영 기준
├── 병원 정보 -> /app/ops/organization-setup#hospital-info
├── 병동/근무 기준 -> /app/ops/organization-setup#site-shift-rules
└── 직원 정보 -> /app/ops/organization-setup#employee-info

근무표 생성
└── direct route: /app/schedule/step1

근무표 조회
├── 생성된 근무표 -> /app/schedule-results
└── 근무 실적 -> /app/work-performance
```

Do not create a submenu for `근무표 생성`. When the user clicks this top-level menu item, they should enter the new schedule generation workflow. A submenu with only one item forces the user to choose the same thing twice and adds friction without adding options.

The `운영 기준` child items are not new CRUD routes. In the current MVP, hospital information, ward/shift criteria, and employee information should move to anchors within the same operations criteria screen. During implementation, anchor IDs must match the screen section names, and the route guard should reuse the existing org/admin rule for `/app/ops/organization-setup`.

The `근무표 조회` child items should have new routes. `생성된 근무표` moves or reuses the schedule list data previously provided by the `지난 결과` section in `Dashboard.vue` as a read-only lookup screen. `근무 실적` does not have actual analysis functionality yet, so first create an empty-state placeholder page at `/app/work-performance`.

Permission-based menu visibility:

| Ability                                                                                         | Top Nav Item |
| ----------------------------------------------------------------------------------------------- | ------------ |
| `canManageOrganizationSetup`                                                                    | 운영 기준    |
| `canManageSchedules`                                                                            | 근무표 생성  |
| `canManageSchedules`, or the corresponding lookup ability if lookup permissions are split later | 근무표 조회  |
| `canViewRestrictedUserHome`                                                                     | 내 홈        |
| `canViewApprovalQueue`                                                                          | 가입 승인    |
| no available items                                                                              | 대시보드     |

Active state:

| Current Route                                                               | Active Nav               |
| --------------------------------------------------------------------------- | ------------------------ |
| `/app/ops/*`                                                                | 운영 기준                |
| `/app/schedule/step1` - `/app/schedule/step5/*`                             | 근무표 생성              |
| `/app/schedule-results` and generated schedule detail routes if added later | 근무표 조회              |
| `/app/work-performance`                                                     | 근무표 조회              |
| `/app/admin/approval-queue`                                                 | 가입 승인                |
| `/app/home/user`                                                            | 내 홈                    |
| `/app`                                                                      | 대시보드 fallback active |

Dashboard should not repeat the global menu. The first content block should show readiness/next action.

```text
[Top fixed app header]

[Dashboard page]
  Page title: 근무표 관리
  Primary state:
    - readiness loading
    - readiness unavailable
    - incomplete readiness
    - complete readiness
  Work sections:
    - 운영 기준
    - 근무표 생성
    - 근무표 조회
```

### Design Decision

Remove the left sidebar from the default app shell structure in `DefaultLayout.vue`. Delete `Sidebar.vue`. However, do not discard the route/RBAC mapping behavior currently owned by `Sidebar.vue`; move it to `useAppNavigation.ts` and preserve it with tests.

Dashboard body copy should use the same language as the top nav. The current `기본 정보` section should become `운영 기준`, and the `지난 결과` section should become `근무표 조회`. This lets users recognize the top menu and Dashboard work areas as the same structure.

Dashboard cleanup is surface cleanup, not feature deletion. If the entire page is wrapped in one large `n-card` and then section/cards are nested inside it, the app shell ends up with another boxed page inside it, which does not fit a Step 3 grid-centered product. The cleanup goal is to remove the page-level card and keep surfaces only where they are actually needed, such as readiness/status, schedule generation CTA, and schedule lookup.

---

## Pass 2: Interaction State Coverage

**Rating:** 6/10 -> 9/10

| Feature                   | Loading                                                                                        | Empty                                                                                                                                                         | Error                                                                                                                       | Success                                                                  | Partial                                                                                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Top navigation            | While RBAC context is loading, show minimum brand + disabled context instead of a nav skeleton | If no menu is available by permission, show only `대시보드`                                                                                                   | If access context fails, show a short state only in the account area so it does not conflict with the Dashboard error state | Show `aria-current="page"` and accent underline on active route          | If no organization is selected, leave org-required nav to the route guard rather than disabling it; show no current selection in the header           |
| Top nav submenus          | Do not calculate submenu options late; show fixed IA immediately                               | Do not create a dropdown for `근무표 생성`, which has no children                                                                                             | If submenu route resolution fails, show recovery CTA on the relevant landing screen                                         | `운영 기준` and `근무표 조회` reveal child purposes on hover/focus/click | On narrow desktop, do not fix submenu width; size to label length while preventing viewport overflow                                                  |
| Organization switcher     | Disable select before options load                                                             | Placeholder when no organization is selectable                                                                                                                | Use the existing message utility when organization switching fails                                                          | Update the current organization label after selection                    | Truncate long organization names and provide full name through title or accessible label                                                              |
| Dashboard create CTA      | Hide while readiness is loading                                                                | Keep primary CTA in schedule empty state                                                                                                                      | If readiness is unavailable, hide create/list actions                                                                       | Enter month modal                                                        | If header CTA and section CTA duplicate each other, prefer the section CTA and remove the page header CTA if possible                                 |
| Schedule lookup           | Preserve the existing list area height while schedule list is loading                          | If no generated schedules exist, show empty state with `새 근무표 생성` primary action. `근무 실적` shows a placeholder empty page until the feature is ready | Show retry separated from generation flow when list lookup fails. `근무 실적` should not call an API yet                    | Clearly separate generated schedule lookup from work performance entry   | For `생성된 근무표`, first consider a year/month calendar-picker-style lookup UI. For `근무 실적`, do not build actual condition input UI in this PR. |
| Schedule workflow stepper | Display independently from route content loading                                               | N/A                                                                                                                                                           | On route guard failure, prioritize error/redirect state over the stepper                                                    | Emphasize current step                                                   | Step 5 dynamic route displays `결과 검토` according to current copy                                                                                   |

### Required State Details

- Top nav active state must not be communicated by color alone. Use underline, font weight, and `aria-current` together.
- Keep logout as a text button, but ensure a visible focus ring.
- The organization selector area should not use a fixed minimum width; use `minmax` or a responsive clamp. The current `min-w-[220px]` can pressure the header at narrower widths.
- The top menu is route navigation, and the schedule stepper is workflow progress. Do not give them the same visual style.
- `근무표 생성` is a direct nav item. A dropdown with only one submenu item deepens the information architecture without increasing choices.
- `근무표 조회` has two lookup purposes, so a submenu is acceptable. However, on the first screen, do not let both entries compete with equal card weight; treat `생성된 근무표` as primary and `근무 실적` as a secondary analysis entry.
- The `생성된 근무표` screen should reuse the existing `지난 결과` list data from Dashboard, but the UI should prioritize a year/month calendar-picker-style selection over a list-only layout. A schedule is a monthly output, so year selection + 12 month tile grid is more natural than a date grid. Generated months are selectable; missing months are disabled/empty.
- The `근무 실적` screen is only an empty page scaffold in this scope. Allow only a title, a preparing empty state, and a secondary action to `생성된 근무표`; do not add actual period/employee condition inputs or aggregation API calls.

---

## Pass 3: User Journey & Emotional Arc

**Rating:** 7/10 -> 9/10

| Step | User Does                                                         | User Should Feel                                                                    | Plan Specifies                                                                   |
| ---- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1    | Enters `/app` after login                                         | Immediately understands what to do now                                              | First Dashboard block shows readiness/next action                                |
| 2    | Checks operational criteria                                       | Understands why preparation is needed before generation                             | `운영 기준` is global nav, readiness items connect to Dashboard internal actions |
| 3    | Starts schedule generation                                        | Feels they entered a workflow, not a menu                                           | Schedule route displays top stepper                                              |
| 4    | Edits the Step 3 grid                                             | Has enough horizontal space and menu chrome does not get in the way                 | Sidebar removed, content width expanded                                          |
| 5    | Moves to result review/edit/export                                | Keeps context that they are still inside the generation workflow                    | Stepper and route title remain                                                   |
| 6    | After generation, searches past schedules or employee performance | Feels they are looking up operational records, not merely revisiting completed work | Put `생성된 근무표` and `근무 실적` under `근무표 조회`                          |

Time-horizon design:

- 5 seconds: The user immediately understands the brand, current organization, and three available tasks (`운영 기준`, `근무표 생성`, `근무표 조회`) from the top area.
- 5 minutes: The user checks readiness on Dashboard and enters the generation workflow. They know completed results can be found later under `근무표 조회`.
- Long-term use: In repeated monthly work, the same order `운영 기준 -> 근무표 생성 -> 근무표 조회` repeats, so users do not have to relearn the menu.

---

## Pass 4: AI Slop Risk

**Rating:** 8/10 -> 9/10

This screen is **APP UI**. Apply operational workspace rules, not landing page rules.

Hard rejection risk:

- App UI made of stacked cards: **needs caution**
- Generic dashboard-card mosaic: **needs caution**
- Decorative gradients/icons: **do not introduce**

Fix:

- The current structure that wraps the entire Dashboard in a single `n-card` should be removed long-term. The page itself should be an unframed layout, and each section should have only as much surface as needed.
- `운영 기준`, `근무표 생성`, and `근무표 조회` are not three identical cards; they are different work phases. Their visual weight should also differ.
- Distinguish `운영 기준` as readiness/status-centered, `근무표 생성` as primary-action-centered, and `근무표 조회` as record-finding-centered.
- A schedule list card is appropriate because it represents an actual schedule entity.
- An onboarding readiness item is appropriate as an action container.
- Header should be separated with border and sticky surface, not shadow.

Litmus:

| Check                                  | Result                                                 |
| -------------------------------------- | ------------------------------------------------------ |
| Brand unmistakable in first screen?    | YES, top-left EveryShift                               |
| One strong visual anchor?              | YES, Dashboard readiness block or Step workspace title |
| Page understandable by headlines only? | YES, if section titles stay operational                |
| Each section has one job?              | YES, after Dashboard sections are separated            |
| Cards actually necessary?              | PARTIAL, schedule entity/onboarding item only          |
| Motion improves hierarchy?             | NOT REQUIRED for app shell                             |
| Premium without decorative shadows?    | YES, use border, spacing, typography                   |

---

## Pass 5: Design System Alignment

**Rating:** 8/10 -> 9/10

Use `DESIGN.md` directly.

### Visual Rules

- Header height: 56-64px.
- Header background: `--color-surface-primary`.
- Header border: `--color-border-subtle`.
- App canvas: `--color-bg-app` or current app background.
- Brand text: `text-lg` or `text-xl`, font weight `700`.
- Top nav text: `text-sm`, active `600`, inactive `500`.
- Top nav labels: `운영 기준`, `근무표 생성`, `근무표 조회`.
- Dropdown/submenu labels: keep `text-sm`; use `font-medium` for item labels and short helper copy only if the dropdown has enough width.
- Page title: `text-2xl`.
- Section title: `text-xl`.
- Metadata: `text-sm`; timestamps/scores may use mono only if already supported by global font wiring.
- Accent color only for active nav, primary CTA, important status.

### Avoid

- purple/blue gradient header
- large rounded pill nav for every item
- icon-in-circle menu decoration
- card inside card
- heavy drop shadows on app chrome
- centered dashboard copy except true loading/empty states
- long verb-style nav labels such as `지난 결과 보기`

---

## Pass 6: Responsive & Accessibility

**Rating:** 5/10 -> 8/10

This MVP remains desktop-first, but the top header must not break on narrower work laptops.

### Desktop

```text
brand width: 160-180px
nav: horizontal, left aligned
account area: right aligned
content: max width widened for grid surfaces
```

### Tablet / Narrow Desktop

- Top nav remains horizontal.
- Nav may scroll horizontally if needed, but the current three-item MVP should not require it.
- `운영 기준` and `근무표 조회` dropdowns must open within the viewport and remain keyboard reachable.
- Organization switcher compresses before nav items wrap.
- Long organization names truncate with accessible full label.
- Header can become two rows only below the compact breakpoint, not unpredictably.
- Default compact breakpoint is `1024px`. Define it as a single adjustable design token or constant, for example `APP_HEADER_COMPACT_BREAKPOINT = 1024` or `--app-header-compact-breakpoint: 1024px`, so implementation and visual QA use the same threshold.

### Mobile

Full mobile support is out of MVP scope, especially for the Step 3 grid. Still, the header must avoid overlap:

- 44px minimum touch target.
- No clipped logout button.
- If the viewport is too narrow, account context can collapse to a compact menu button, but this is a fallback state, not the primary MVP design.

### Accessibility Contract

- Header uses `<header>` landmark.
- Primary nav uses `<nav aria-label="주요 메뉴">`.
- Active nav item uses `aria-current="page"`.
- Submenu triggers expose expanded/collapsed state with `aria-expanded` when implemented as dropdown buttons.
- Dropdown items are reachable by keyboard and dismiss on Escape.
- Stepper uses `<nav aria-label="근무표 생성 단계">`.
- Buttons and links keep visible focus.
- Disabled-looking nav states must still explain route guard result through page state, not hidden UI.
- State is never communicated by color alone.

---

## Pass 7: Unresolved Design Decisions

**Rating:** 6/10 -> 8/10

| Decision Needed                   | Recommendation                                                                              | If Deferred                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Header single-row vs two-row      | Start single-row on desktop; allow two-row only below tablet breakpoint                     | Long org names may crush nav or logout                                                          |
| Top nav naming                    | Use `운영 기준`, `근무표 생성`, `근무표 조회`                                               | `기본 정보` conflicts with Step 1, and `지난 결과 보기` reads too narrow for performance lookup |
| `근무표 생성` submenu             | Do not create a submenu while there is only one action                                      | User has to choose the same thing twice                                                         |
| `근무표 조회` submenu labels      | Use `생성된 근무표`, `근무 실적`                                                            | Engineers may ship vague labels like `지난 결과` or mix schedule list with performance analysis |
| `Sidebar.vue` delete vs repurpose | Repurpose route option logic into top nav helper first, delete only after tests pass        | Duplicate nav logic can drift                                                                   |
| Dashboard outer `n-card` removal  | Remove in the same UI pass if scope allows                                                  | Page may still feel like card-inside-card                                                       |
| Schedule stepper owner            | Put stepper in schedule workflow layout or a small route-local component, not global header | Global nav and workflow progress may blur together                                              |
| Future 6+ menu expansion          | Reconsider sidebar only when menu count actually grows                                      | Premature admin portal chrome returns                                                           |

---

## Engineering Review Addendum

**Review perspective:** `plan-eng-review`
**Review date:** 2026-05-13
**Target branch:** `codex/dashboard-readiness-gate`
**Status:** DONE_WITH_CONCERNS. Implementation is possible, but the plan must explicitly specify navigation logic extraction and test scope to be safe.

### Step 0: Scope Challenge

#### What Existing Code Already Solves

| Sub-problem                               | Existing Source                                                                       | Reuse Decision                                                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| RBAC-based menu visibility                | `menuOptions` computed in `src/components/layout/Sidebar.vue`                         | Reuse it. Do not copy the same logic into `Header.vue`.                                                         |
| Normalize current route to nav active key | `currentRoute` computed in `Sidebar.vue` + route helpers in `src/constants/routes.ts` | Reuse it. Keep legacy route active handling too.                                                                |
| Route access control                      | `resolveRouteAccessTarget` in `src/router/guards.ts`                                  | Leave as is. Header nav only displays permissions; the guard owns access blocking.                              |
| Organization selection/logout             | `Header.vue`, `OrganizationSwitcher.vue`, `src/utils/message.ts`                      | Leave as is. Adding top nav should not touch account context.                                                   |
| Schedule workflow step display            | `StepIndicator.vue` used by each schedule view                                        | Do not create a new global stepper. Keep the existing component or only organize it with a route-local wrapper. |
| Dashboard readiness gate                  | `Dashboard.vue`, `tests/unit/dashboard.spec.ts`                                       | Do not change behavior. Only reduce visual nesting.                                                             |

#### Minimum Change Set

The smallest safe implementation is five source files plus existing test reinforcement.

```text
src/components/layout/
├── DefaultLayout.vue        # remove sider, sticky header + content only
├── Header.vue               # add primary nav rendering
├── Sidebar.vue              # delete after behavior extraction
└── useAppNavigation.ts      # extract route/RBAC mapping from sidebar

tests/unit/
├── app-navigation.spec.ts   # new composable unit coverage
├── header.spec.ts           # add nav render/click/a11y
└── router-index.spec.ts     # keep existing tests for DefaultLayout boundary
```

`Dashboard.vue` outer surface cleanup can be done in the same PR, but do not mix navigation transition with behavior changes. Dashboard CTA deduplication is visual cleanup, not a route contract change.

#### Complexity Check

If this plan touches more than eight files or creates more than three new services/helpers during implementation, it is too large.

Recommended ceiling:

- New composable/helper: `useAppNavigation.ts` only
- New layout component: 0
- Route changes: 0
- Store changes: 0
- Backend/API changes: 0

#### Search Check

Do not introduce a new framework or infrastructure. [Layer 1] Use only Vue Router, Naive UI, Tailwind, and existing route helpers. Top navigation is an app shell composition problem and does not need a separate navigation framework.

#### TODOS Cross-reference

`TODOS.md` does not currently exist. The `TODO Candidates` section in this document serves as a temporary backlog. After implementation, move remaining items to `TODOS.md` and record why they remain.

#### Completeness Check

Switching only the top nav and postponing tests is a shortcut. The complete version includes tests for the RBAC matrix, active route normalization, keyboard/a11y, responsive compression, and schedule workflow smoke.

Lake score: **4/4 complete recommendations chosen**

- Navigation extraction: complete option chosen.
- Active route and legacy route coverage: complete option chosen.
- Header accessibility states: complete option chosen.
- Visual QA for app shell and schedule grid: complete option chosen.

#### Distribution Check

Do not create new artifacts, packages, binaries, or container images. Deployment pipeline changes are out of scope.

### Architecture Review

#### Data Flow

```text
rbacStore.abilities + route.path
        │
        ▼
useAppNavigation()
        ├── navigationItems
        │     ├── label: Korean UI copy
        │     ├── key/path: constants/routes helper output
        │     ├── children: optional submenu entries for 운영 기준 and 근무표 조회
        │     └── isVisible: RBAC ability result
        │
        ├── activeNavigationKey
        │     └── canonical + legacy route prefixes normalized
        │
        └── navigateToNavigationItem(key)
              └── router.push(key)
                    └── existing route guards enforce org/admin access

Header.vue
  ├── Brand
  ├── <nav aria-label="주요 메뉴">
  │     └── buttons/links/dropdowns with aria-current on active item
  └── Account context
        ├── OrganizationSwitcher
        ├── access label
        └── logout

DefaultLayout.vue
  └── sticky app header + content router-view
```

#### Opinionated Recommendation

`Header.vue` should render nav, but not own nav rules. Put route/RBAC mapping in `useAppNavigation.ts` so the highest-risk logic is unit-testable without mounting app shell chrome.

Tradeoff:

- Pros: DRY, explicit, easy unit tests, preserves current sidebar behavior.
- Cons: one new file.
- Recommendation: accept the one-file helper. It is the smallest abstraction that removes meaningful duplication.

#### Production Failure Scenarios

| New Codepath                         | Failure Scenario                                                                         | Planned Handling                                                                                                                         |
| ------------------------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `useAppNavigation().navigationItems` | RBAC context loads after first render and nav briefly shows fallback only                | computed reacts to store update; test fallback and admin/user/super states.                                                              |
| `activeNavigationKey`                | `/app/schedule/step5/:scheduleKey` does not highlight `근무표 생성`                      | keep `isScheduleRoutePath()` normalization; add unit test.                                                                               |
| `activeNavigationKey`                | `/app/schedule-results` or `/app/work-performance` accidentally highlights `근무표 생성` | add explicit lookup route normalization before broad schedule workflow matching. Prefer keeping lookup routes outside `/app/schedule/*`. |
| `navigateToNavigationItem`           | user clicks nav requiring org context while no org is selected                           | route guard redirects; header must not fake disabled state.                                                                              |
| Header account compression           | long organization name pushes logout off-screen                                          | truncate account context and keep 44px targets; add visual QA at narrow desktop.                                                         |
| Dropdown submenu keyboard handling   | `운영 기준` or `근무표 조회` is hover-only                                               | implement click/focus-open behavior, Escape close, and unit/a11y assertions.                                                             |
| Sidebar removal                      | tests still mount deleted `Sidebar.vue`                                                  | migrate `sidebar.spec.ts` assertions to `app-navigation.spec.ts` before deleting the component.                                          |

### Code Quality Review

#### 1. Avoid Duplicated Navigation Rules

Current risk: `Sidebar.vue` already has a complete RBAC/active-route mapping. Copying it into `Header.vue` creates two sources of truth during the transition.

Recommendation: extract first, then render top nav.

```text
Before:
Sidebar.vue owns menuOptions/currentRoute
Header.vue owns account context only

After:
useAppNavigation.ts owns menuItems/activeKey/navigation
Header.vue consumes useAppNavigation()
Sidebar.vue is deleted after its behavior coverage is moved to app-navigation tests
```

#### 2. Keep Header Explicit

`Header.vue` should stay a small shell component:

- render brand
- render top nav
- render account context
- handle logout

It should not parse route prefixes inline. Route parsing belongs in `useAppNavigation.ts`.

#### 3. Do Not Change Business Flow

No changes to:

- `src/router/guards.ts`
- schedule store state
- Dashboard readiness API calls
- Step progression guard
- solver integration

#### 4. Resolve Step Label Drift Before Implementation

The design section proposes:

```text
1 기본 정보
2 사이트 정보
3 직원 정보
4 초기 데이터
5 결과 확인
```

The current code and test use:

```text
1 기본 정보
2 사이트 기준
3 직원 기준
4 오프 입력
5 결과 검토
```

Recommendation: keep the existing labels in this top-nav PR unless the implementation explicitly includes a copy-change task and updates `tests/unit/step-indicator.spec.ts`. Silent label drift is a regression risk.

### Test Review

Detected test framework:

- Unit: Vitest + Vue Test Utils
- E2E: Playwright
- Required repo checks after implementation: `pnpm lint:check`, `pnpm run build`

#### Code Path Coverage Diagram

```text
CODE PATH COVERAGE
===========================
[+] src/components/layout/useAppNavigation.ts
    │
    ├── navigationItems
    │   ├── [GAP] admin abilities -> 운영 기준 + 근무표 생성 + 근무표 조회
    │   ├── [GAP] 운영 기준 children -> 병원 정보 + 병동/근무 기준 + 직원 정보 anchors on /app/ops/organization-setup
    │   ├── [GAP] 근무표 생성 -> direct item with no one-item submenu
    │   ├── [GAP] 근무표 조회 children -> 생성된 근무표 (/app/schedule-results) + 근무 실적 (/app/work-performance)
    │   ├── [GAP] restricted user -> 내 홈 only
    │   ├── [GAP] approval queue ability -> 가입 승인 only
    │   └── [GAP] no visible abilities -> 대시보드 fallback
    │
    ├── activeNavigationKey
    │   ├── [GAP] /app/schedule/* and legacy /schedule/* -> Step 1 route key
    │   ├── [GAP] /app/schedule-results and /app/work-performance -> 근무표 조회 route key
    │   ├── [GAP] /app/ops/* and legacy /ops/* -> organization setup key
    │   ├── [GAP] approval queue route -> approval key
    │   └── [GAP] user home/dashboard fallback -> matching key
    │
    └── navigateToNavigationItem()
        └── [GAP] pushes selected route key through Vue Router

[+] src/components/layout/Header.vue
    │
    ├── [★★ TESTED] role label + organization switcher render — tests/unit/header.spec.ts
    ├── [★★★ TESTED] logout success/failure — tests/unit/header.spec.ts
    ├── [GAP] renders top nav items from useAppNavigation()
    ├── [GAP] active item has aria-current="page" and non-color active cue
    ├── [GAP] nav click calls navigation handler
    └── [GAP] no available nav item still renders 대시보드 fallback

[+] src/components/layout/DefaultLayout.vue
    │
    ├── [GAP] removes n-layout-sider from /app shell
    ├── [GAP] keeps Header and router-view under DefaultLayout
    └── [GAP] content width no longer reserves sidebar space

[+] src/components/schedule/StepIndicator.vue
    │
    ├── [★ TESTED] renders current labels — tests/unit/step-indicator.spec.ts
    └── [GAP] if labels change, test must change in same PR
```

#### User Flow Coverage Diagram

```text
USER FLOW COVERAGE
===========================
[+] Admin dashboard navigation
    │
    ├── [GAP] [→E2E] /app shows top nav and no sidebar
    ├── [GAP] [→E2E] click 근무표 생성 -> /app/schedule/step1
    ├── [GAP] [→E2E] click 운영 기준 > 병원 정보 -> /app/ops/organization-setup#hospital-info
    ├── [GAP] [→E2E] click 근무표 조회 > 생성된 근무표 -> /app/schedule-results
    ├── [GAP] [→E2E] click 근무표 조회 > 근무 실적 -> /app/work-performance placeholder
    └── [GAP] [→E2E] active nav updates on Step 5 dynamic route

[+] Schedule workflow workspace
    │
    ├── [GAP] [→E2E] Step 3 grid gains horizontal room compared with sidebar shell
    ├── [GAP] [→E2E] schedule stepper remains visible inside route content
    └── [GAP] [→E2E] route guard still blocks incomplete step progression

[+] Account context
    │
    ├── [★★ TESTED] logout works — tests/unit/header.spec.ts
    ├── [GAP] organization switcher remains usable after header layout change
    └── [GAP] long organization name truncates instead of overlapping nav/logout

─────────────────────────────────
COVERAGE: 4/27 paths currently tested (15%)
  Code paths: 4/17 (24%)
  User flows: 0/10 (0%)
QUALITY:  ★★★: 1  ★★: 3  ★: 1
GAPS: 23 paths need explicit test coverage (7 should be E2E)
─────────────────────────────────
```

#### Required Test Additions

| Test File                                                 | Type | Assertions                                                                                                                                                                             |
| --------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/unit/app-navigation.spec.ts`                       | unit | RBAC menu matrix, `운영 기준`/`근무표 조회` children, no submenu for `근무표 생성`, fallback dashboard item, canonical/legacy active route normalization, navigation push.             |
| `tests/unit/header.spec.ts`                               | unit | renders nav labels, active item has `aria-current="page"`, dropdown triggers expose submenu items, nav click triggers route push, fallback `대시보드` item renders.                    |
| `tests/unit/router-index.spec.ts`                         | unit | keep `DefaultLayout` mounted only under `/app`; existing route paths unchanged; add `/app/schedule-results` and `/app/work-performance` as authenticated org/admin workspace children. |
| `tests/unit/step-indicator.spec.ts`                       | unit | update only if the implementation intentionally changes step labels.                                                                                                                   |
| `tests/unit/work-performance.spec.ts`                     | unit | placeholder page renders title, empty/준비 중 state, and does not call performance APIs.                                                                                               |
| `tests/e2e/pilot-checklist.spec.ts` or new app-shell spec | E2E  | `/app` has top nav, no sidebar menu, organization switcher and logout are reachable.                                                                                                   |
| `tests/e2e/schedule-workflow.spec.ts`                     | E2E  | schedule workflow still reaches Step 3/Step 5 after layout change; Step 5 active nav remains `근무표 생성`; lookup routes do not steal active state from in-progress generation.       |

Regression rule: the old sidebar tests already cover behavior that must survive the UI move. Move those assertions to `app-navigation.spec.ts`; do not delete them with `Sidebar.vue`.

### Performance Review

No backend, database, or solver codepath is introduced. N+1 query risk is not applicable.

Potential frontend performance issues:

- Avoid async loading or API calls in `Header.vue`; it should consume existing Pinia state only.
- Keep `navigationItems` as computed data over a small fixed menu list.
- Do not add window resize listeners unless CSS can solve the header compression.
- Do not move schedule grid wrappers into a globally constrained `max-w-*`; Step 3/Step 5 need route-level width freedom.

Performance acceptance:

- Header render does not trigger new network requests.
- Step 3 table keeps its current data and virtualization behavior.
- Layout shift is limited to the intentional sidebar removal.

### Failure Modes

| Failure Mode                                                  | Test?                                                                   | Error Handling?                                                                                 | User Impact                                                             |
| ------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| RBAC context unavailable on first render                      | add unit fallback test                                                  | existing store load flow                                                                        | user sees `대시보드` fallback or stable account state, not broken nav   |
| User has no selected organization and clicks org-required nav | route guard test already covers guard logic; add E2E smoke if practical | existing `resolveRouteAccessTarget`                                                             | redirect/fallback, not silent failure                                   |
| Legacy route is opened from old bookmark                      | add active-key unit test                                                | existing redirects and route helpers                                                            | top nav highlights correct section                                      |
| Lookup route is introduced under a broad schedule prefix      | avoid broad schedule prefix for lookup routes; add active-key unit test | `/app/schedule-results` and `/app/work-performance` normalize before schedule workflow matching | user does not see `근무표 생성` highlighted while browsing past records |
| Long organization name overlaps nav                           | add Playwright screenshot at narrow desktop                             | CSS truncation and accessible label                                                             | user can still logout and navigate                                      |
| Submenu opens only on hover                                   | add keyboard interaction test or Playwright smoke                       | use click/focus-open dropdown behavior                                                          | keyboard users cannot reach `병원 정보`, `근무 실적`                    |
| Sidebar behavior tests are deleted with component             | add replacement `app-navigation.spec.ts`                                | not runtime-handled                                                                             | regression could ship unnoticed                                         |
| Step labels silently change                                   | update unit test only when intentional                                  | not runtime-handled                                                                             | user copy inconsistency                                                 |

Critical gaps: **0** if the required test additions are implemented with the layout change. Critical gaps become **2** if sidebar tests are deleted without replacement or if active route normalization is copied manually into `Header.vue`.

### Implementation Sequence

```text
1. Extract navigation mapping
   Sidebar.vue -> useAppNavigation.ts
   Add app-navigation unit tests first.

2. Render top nav in Header.vue
   Consume useAppNavigation().
   Add aria-current and click tests.

3. Remove sidebar from DefaultLayout.vue and delete Sidebar.vue
   Keep existing route paths and guards unchanged.
   Verify /app still mounts Dashboard through router-view.

4. Add lookup routes and placeholder page
   Add /app/schedule-results for generated schedule lookup.
   Add /app/work-performance as a placeholder page only.

5. Clean Dashboard shell as visual cleanup
   Remove page-level card nesting without changing readiness behavior.

6. Run verification
   pnpm lint:check
   pnpm run build
   targeted Vitest + Playwright smoke
```

### Engineering NOT In Scope

- Rewriting route guards: existing guards already own access enforcement.
- Adding a global admin navigation framework: current menu count does not justify it.
- Moving schedule stepper into the global header: global navigation and workflow progress have different jobs.
- Reworking Step 3 grid internals: the layout change should only give it more room.
- Adding mobile-first schedule grid behavior: MVP remains desktop-first.
- Adding new backend or Supabase calls for navigation.
- Implementing real `근무 실적` aggregation, filters, charts, or API calls.

### Plan-Ready Acceptance Criteria

Add these to the implementation checklist:

- `useAppNavigation.ts` has full RBAC and active-route unit coverage before `Sidebar.vue` is removed.
- `Header.vue` top nav uses Korean labels and `aria-current="page"` on the active item.
- `/app/schedule/step5/:scheduleKey` highlights `근무표 생성`.
- `운영 기준` exposes `병원 정보`, `병동/근무 기준`, `직원 정보`.
- `근무표 생성` has no single-item submenu.
- `근무표 조회` exposes `생성된 근무표`, `근무 실적`.
- `/app/schedule-results` renders generated schedule lookup and highlights `근무표 조회`.
- `/app/work-performance` renders a placeholder empty page and highlights `근무표 조회`.
- Lookup route active-state tests run before any broad `/app/schedule/*` matching rule is reused.
- legacy `/schedule/*` and `/ops/*` paths still normalize to the right active nav key during redirect or direct test setup.
- no new network request is introduced by app shell render.
- 1024px screenshot shows no overlap among brand, nav, organization switcher, role label, and logout.
- if step labels change, `StepIndicator.vue` and `tests/unit/step-indicator.spec.ts` are updated in the same PR.

---

## Writing-Plans Review Findings

From the `superpowers:writing-plans` perspective, the previous document had enough design judgment and engineering risk analysis, but it lacked the following five things for an implementer to start immediately.

| Gap                                  | Why It Matters                                                                                   | Fix In This Revision                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Missing required plan header         | The implementing agent cannot understand the goal, structure, and stack in the first 10 seconds. | Added Goal, Architecture, Tech Stack, and required sub-skill to the document header. |
| Insufficient file responsibility map | If responsibility is unclear, route/RBAC logic can leak into `Header.vue`.                       | Added `File Responsibility Map` below.                                               |
| Task granularity is too large        | "Implement top nav" is too big at once and makes test failures hard to isolate.                  | Split tasks into 2-5 minute steps and commit boundaries.                             |
| Weak TDD order                       | If regressions are found after deleting `Sidebar.vue`, root cause tracing is delayed.            | Reordered each task as failing test -> implementation -> pass.                       |
| Missing expected command output      | Implementers cannot clearly distinguish failure from success.                                    | Added Expected result to each verification command.                                  |

---

## File Responsibility Map

| File                                         | Action           | Responsibility                                                                                                                                              |
| -------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/layout/useAppNavigation.ts`  | Create           | Owns RBAC-based top nav items, submenu, active-route normalization, and navigation push.                                                                    |
| `src/components/layout/Header.vue`           | Modify           | Renders only the EveryShift brand, primary top nav, organization switcher, role label, and logout. Does not parse route prefixes.                           |
| `src/components/layout/DefaultLayout.vue`    | Modify           | Owns `n-layout-sider` removal, sticky header, and app content wrapper.                                                                                      |
| `src/components/layout/Sidebar.vue`          | Delete           | Delete after behavior coverage moves to `app-navigation.spec.ts`.                                                                                           |
| `src/constants/routes.ts`                    | Modify           | Add `/app/schedule-results`, `/app/work-performance` constants/helpers and lookup-route predicate.                                                          |
| `src/router/index.ts`                        | Modify           | Register new lookup routes as `/app` child routes. Do not change existing schedule workflow routes.                                                         |
| `src/views/schedule/ScheduleResults.vue`     | Create           | Renders monthly lookup UI for generated schedules. Reuse only the existing Dashboard schedule list data access pattern and do not create new backend calls. |
| `src/views/schedule/WorkPerformance.vue`     | Create           | Renders only the `근무 실적` preparing placeholder. Do not add filters, charts, or aggregation APIs.                                                        |
| `src/views/Dashboard.vue`                    | Modify           | Only remove page-level card nesting and align copy. Do not change readiness, modal, or schedule deletion behavior.                                          |
| `tests/unit/app-navigation.spec.ts`          | Create           | Replaces the RBAC/active-route behavior from existing `sidebar.spec.ts`.                                                                                    |
| `tests/unit/header.spec.ts`                  | Modify           | Verifies top nav render, active state, submenu trigger, click behavior, and logout regression.                                                              |
| `tests/unit/router-index.spec.ts`            | Modify           | Verifies new lookup routes are registered as `/app` layout children.                                                                                        |
| `tests/unit/schedule-results.spec.ts`        | Create           | Verifies monthly lookup empty/success state and Step 5 route entry.                                                                                         |
| `tests/unit/work-performance.spec.ts`        | Create           | Verifies placeholder renders without API calls.                                                                                                             |
| `tests/unit/dashboard.spec.ts`               | Modify           | Verifies readiness behavior is preserved and section copy matches top nav.                                                                                  |
| `tests/e2e/app-shell-top-navigation.spec.ts` | Create or extend | Verifies `/app` top nav, no sidebar, no overlap at 1024px, and basic keyboard reachability.                                                                 |
| `tests/e2e/schedule-workflow.spec.ts`        | Modify           | Verifies Step 3/Step 5 flow is preserved after layout transition and active nav is `근무표 생성`.                                                           |

---

## Agent-Ready Implementation Plan

### Task 1: Extract Navigation Behavior Before Touching UI

**Files:**

- Modify: `src/constants/routes.ts`
- Create: `src/components/layout/useAppNavigation.ts`
- Create: `tests/unit/app-navigation.spec.ts`
- Reference only: `src/components/layout/Sidebar.vue`
- Reference only: `src/stores/rbac.ts`

- [ ] **Step 1: Write failing RBAC and active-route tests**

Add `tests/unit/app-navigation.spec.ts` with these cases:

```ts
it('shows admin primary navigation in workflow order', () => {
  expect(labels).toEqual(['운영 기준', '근무표 생성', '근무표 조회']);
});

it('keeps 근무표 생성 as a direct item without a one-item submenu', () => {
  expect(scheduleCreateItem.children).toBeUndefined();
});

it('normalizes schedule workflow routes to 근무표 생성', () => {
  expect(activeKeyFor('/app/schedule/step5/2026-05')).toBe('/app/schedule/step1');
});

it('normalizes lookup routes to 근무표 조회 before broad schedule matching', () => {
  expect(activeKeyFor('/app/schedule-results')).toBe('/app/schedule-results');
  expect(activeKeyFor('/app/work-performance')).toBe('/app/schedule-results');
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
pnpm exec vitest run tests/unit/app-navigation.spec.ts
```

Expected: FAIL because `src/components/layout/useAppNavigation.ts` does not exist yet.

- [ ] **Step 3: Add lookup route constants**

In `src/constants/routes.ts`, add route constants before implementing `useAppNavigation.ts`:

```ts
export const APP_SCHEDULE_RESULTS_ROUTE_PATH = `${APP_HOME_ROUTE_PATH}/schedule-results`;
export const APP_WORK_PERFORMANCE_ROUTE_PATH = `${APP_HOME_ROUTE_PATH}/work-performance`;

export function getScheduleResultsRoutePath(): string {
  return APP_SCHEDULE_RESULTS_ROUTE_PATH;
}

export function getWorkPerformanceRoutePath(): string {
  return APP_WORK_PERFORMANCE_ROUTE_PATH;
}

export function isScheduleLookupRoutePath(path: string): boolean {
  return path === APP_SCHEDULE_RESULTS_ROUTE_PATH || path === APP_WORK_PERFORMANCE_ROUTE_PATH;
}
```

- [ ] **Step 4: Implement the smallest composable**

Create `src/components/layout/useAppNavigation.ts`.

Required public shape:

```ts
export interface AppNavigationItem {
  label: string;
  key: string;
  children?: AppNavigationItem[];
}

export function useAppNavigation(): {
  navigationItems: ComputedRef<AppNavigationItem[]>;
  activeNavigationKey: ComputedRef<string>;
  navigateToNavigationItem: (key: string) => Promise<void>;
};
```

Rules:

- Use `useRbacStore()`, `useRoute()`, `useRouter()`.
- Use `src/constants/routes.ts` helpers instead of string duplication where helpers exist.
- Check lookup routes before `isScheduleRoutePath()`.
- Include `대시보드` fallback when no visible item exists.
- Keep `운영 기준` children as anchors under `/app/ops/organization-setup`.
- Keep `근무표 조회` children as `/app/schedule-results` and `/app/work-performance`.

- [ ] **Step 5: Run navigation tests and verify pass**

Run:

```bash
pnpm exec vitest run tests/unit/app-navigation.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/constants/routes.ts src/components/layout/useAppNavigation.ts tests/unit/app-navigation.spec.ts
git commit -m "test: cover app navigation behavior"
```

---

### Task 2: Add Lookup Route Contracts And Placeholder Views

**Files:**

- Modify: `src/router/index.ts`
- Create: `src/views/schedule/ScheduleResults.vue`
- Create: `src/views/schedule/WorkPerformance.vue`
- Modify: `tests/unit/router-index.spec.ts`
- Create: `tests/unit/schedule-results.spec.ts`
- Create: `tests/unit/work-performance.spec.ts`

- [ ] **Step 1: Write failing route contract tests**

In `tests/unit/router-index.spec.ts`, add assertions that:

- `/app/schedule-results` is registered under `DefaultLayout`.
- `/app/work-performance` is registered under `DefaultLayout`.
- Existing `/app/schedule/step1` through Step 5 routes remain unchanged.

Run:

```bash
pnpm exec vitest run tests/unit/router-index.spec.ts
```

Expected: FAIL because the routes are missing.

- [ ] **Step 2: Register lookup routes**

In `src/router/index.ts`, add the routes as `/app` children with the same authenticated workspace metadata pattern used by Dashboard and schedule workflow routes.

Expected route paths:

```text
/app/schedule-results
/app/work-performance
```

- [ ] **Step 3: Create the placeholder views**

`src/views/schedule/ScheduleResults.vue`:

- Title: `생성된 근무표`
- Year/month lookup surface: current year heading or selector + 12 month tiles.
- Empty state for months with no generated schedule.
- Generated month click routes to existing Step 5 review path.
- No new backend/API function in this task unless the existing Dashboard schedule list abstraction already exposes the needed data.

`src/views/schedule/WorkPerformance.vue`:

- Title: `근무 실적`
- Empty state: feature preparing.
- Secondary action to `/app/schedule-results`.
- No filters, charts, aggregation, or API calls.

- [ ] **Step 4: Write and run view tests**

Run:

```bash
pnpm exec vitest run tests/unit/schedule-results.spec.ts tests/unit/work-performance.spec.ts tests/unit/router-index.spec.ts
```

Expected: PASS, with `WorkPerformance.vue` tests proving no performance API is called.

- [ ] **Step 5: Commit**

```bash
git add src/router/index.ts src/views/schedule/ScheduleResults.vue src/views/schedule/WorkPerformance.vue tests/unit/router-index.spec.ts tests/unit/schedule-results.spec.ts tests/unit/work-performance.spec.ts
git commit -m "feat: add schedule lookup routes"
```

---

### Task 3: Render Top Navigation In Header

**Files:**

- Modify: `src/components/layout/Header.vue`
- Modify: `tests/unit/header.spec.ts`
- Reference: `src/components/layout/useAppNavigation.ts`
- Reference: `src/components/layout/OrganizationSwitcher.vue`

- [ ] **Step 1: Write failing header tests**

Add `tests/unit/header.spec.ts` coverage for:

- Brand `EveryShift` renders.
- Primary nav uses `aria-label="주요 메뉴"`.
- `운영 기준`, `근무표 생성`, `근무표 조회` render for admin abilities.
- Active item has `aria-current="page"`.
- `근무표 생성` click pushes `/app/schedule/step1`.
- `운영 기준` and `근무표 조회` submenu items are keyboard/click reachable.
- Organization switcher, role label, and logout still render.

Run:

```bash
pnpm exec vitest run tests/unit/header.spec.ts
```

Expected: FAIL because `Header.vue` does not render primary nav yet.

- [ ] **Step 2: Implement header nav rendering**

In `Header.vue`:

- Import and consume `useAppNavigation()`.
- Render `<header>` or ensure the parent header landmark is preserved by `DefaultLayout.vue`.
- Render `<nav aria-label="주요 메뉴">`.
- Use Naive UI dropdown/menu primitives only if they preserve keyboard reachability.
- Use Tailwind for layout and visible active underline.
- Keep logout logic unchanged and still use `showSuccess` / `showError`.
- Keep user-facing text Korean.

- [ ] **Step 3: Run header tests**

Run:

```bash
pnpm exec vitest run tests/unit/header.spec.ts tests/unit/app-navigation.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Header.vue tests/unit/header.spec.ts
git commit -m "feat: render top navigation header"
```

---

### Task 4: Remove Sidebar From App Shell

**Files:**

- Modify: `src/components/layout/DefaultLayout.vue`
- Delete: `src/components/layout/Sidebar.vue`
- Delete or rewrite: `tests/unit/sidebar.spec.ts`
- Modify: `tests/unit/router-index.spec.ts` if it snapshots layout assumptions

- [ ] **Step 1: Move remaining sidebar assertions**

Before deleting `Sidebar.vue`, compare `tests/unit/sidebar.spec.ts` against `tests/unit/app-navigation.spec.ts`.

Required outcome:

- No RBAC menu visibility assertion is lost.
- No active-route normalization assertion is lost.
- No navigation click behavior assertion is lost.

- [ ] **Step 2: Update layout test expectations**

If existing tests assert that `DefaultLayout.vue` contains `n-layout-sider`, change them to assert:

- `Header` renders.
- `router-view` renders.
- Sidebar text `메뉴` no longer appears.

Run:

```bash
pnpm exec vitest run tests/unit/router-index.spec.ts tests/unit/app-navigation.spec.ts
```

Expected: FAIL until `DefaultLayout.vue` is changed.

- [ ] **Step 3: Remove `n-layout-sider`**

In `DefaultLayout.vue`:

- Remove `Sidebar` import and usage.
- Keep app shell under `/app` only.
- Keep content scroll behavior stable.
- Use a sticky top header surface with border, not heavy shadow.
- Do not apply one global narrow `max-w-*` wrapper to schedule workflow pages.

- [ ] **Step 4: Delete sidebar component and obsolete test**

Delete `src/components/layout/Sidebar.vue`.

Delete `tests/unit/sidebar.spec.ts` only after its behavior is covered by `app-navigation.spec.ts`.

- [ ] **Step 5: Run layout/navigation regression tests**

Run:

```bash
pnpm exec vitest run tests/unit/app-navigation.spec.ts tests/unit/header.spec.ts tests/unit/router-index.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/DefaultLayout.vue src/components/layout/Header.vue src/components/layout/useAppNavigation.ts tests/unit/app-navigation.spec.ts tests/unit/header.spec.ts tests/unit/router-index.spec.ts
git rm src/components/layout/Sidebar.vue tests/unit/sidebar.spec.ts
git commit -m "refactor: replace sidebar with top app navigation"
```

---

### Task 5: Clean Dashboard Surface Without Changing Behavior

**Files:**

- Modify: `src/views/Dashboard.vue`
- Modify: `tests/unit/dashboard.spec.ts`

- [ ] **Step 1: Write failing copy/surface tests**

Update `tests/unit/dashboard.spec.ts` to assert:

- Dashboard section language uses `운영 기준`.
- Dashboard lookup section uses `근무표 조회`.
- Readiness loading, unavailable, incomplete, and complete states still render.
- Existing create modal behavior still works.
- Existing schedule deletion behavior still works.

Run:

```bash
pnpm exec vitest run tests/unit/dashboard.spec.ts
```

Expected: FAIL only for the new copy/surface assertions. Existing behavior tests should still pass.

- [ ] **Step 2: Remove unnecessary page-level framing**

In `Dashboard.vue`:

- Remove outer full-page `n-card` if it creates card-inside-card layout.
- Keep real section surfaces for readiness, generation, and lookup.
- Rename `기본 정보` references to `운영 기준` where they refer to the app-level preparation area.
- Rename `지난 결과` references to `근무표 조회` where they refer to lookup.
- Do not change readiness API calls, creation modal, deletion logic, or stores.

- [ ] **Step 3: Run dashboard tests**

Run:

```bash
pnpm exec vitest run tests/unit/dashboard.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/views/Dashboard.vue tests/unit/dashboard.spec.ts
git commit -m "refactor: align dashboard surface with top navigation"
```

---

### Task 6: Add App-Shell E2E And Schedule Workflow Smoke

**Files:**

- Create: `tests/e2e/app-shell-top-navigation.spec.ts`
- Modify: `tests/e2e/schedule-workflow.spec.ts`
- Optional modify: `tests/e2e/pilot-checklist.spec.ts`

- [ ] **Step 1: Add app-shell E2E coverage**

Add assertions:

- `/app` shows top nav labels.
- Sidebar label `메뉴` is absent.
- Organization switcher and logout are reachable.
- At `1024px`, brand, nav, organization switcher, role label, and logout do not overlap.
- `근무표 생성` navigates to `/app/schedule/step1`.
- `근무표 조회 > 근무 실적` navigates to `/app/work-performance`.

- [ ] **Step 2: Add schedule workflow smoke coverage**

In `tests/e2e/schedule-workflow.spec.ts`, add or preserve assertions:

- Step 3 grid still renders inside the new layout.
- Step 5 dynamic route highlights `근무표 생성`.
- `/app/schedule-results` and `/app/work-performance` highlight `근무표 조회`, not `근무표 생성`.

- [ ] **Step 3: Run targeted E2E**

Run:

```bash
pnpm exec playwright test tests/e2e/app-shell-top-navigation.spec.ts tests/e2e/schedule-workflow.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/app-shell-top-navigation.spec.ts tests/e2e/schedule-workflow.spec.ts tests/e2e/pilot-checklist.spec.ts
git commit -m "test: cover top navigation app shell"
```

---

### Task 7: Final Verification

**Files:**

- Verify only unless previous tasks expose a defect.

- [ ] **Step 1: Run required repo checks**

Run:

```bash
pnpm lint:check
pnpm run build
```

Expected: both PASS.

- [ ] **Step 2: Run targeted unit suite**

Run:

```bash
pnpm exec vitest run tests/unit/app-navigation.spec.ts tests/unit/header.spec.ts tests/unit/router-index.spec.ts tests/unit/dashboard.spec.ts tests/unit/schedule-results.spec.ts tests/unit/work-performance.spec.ts tests/unit/step-indicator.spec.ts
```

Expected: PASS. `step-indicator.spec.ts` should pass unchanged unless step labels were intentionally changed.

- [ ] **Step 3: Run targeted E2E**

Run:

```bash
pnpm exec playwright test tests/e2e/app-shell-top-navigation.spec.ts tests/e2e/schedule-workflow.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Inspect diff for scope drift**

Run:

```bash
git diff --stat
git diff -- src/router/guards.ts src/stores/schedule.ts src/composables/useAISolver.ts
```

Expected:

- Diff stat is limited to layout, nav, routes, new lookup views, tests, and Dashboard cleanup.
- No changes to solver integration.
- No changes to route guard semantics unless an existing test required a narrow route registration fix.
- No backend, Supabase, or API changes.

---

## Acceptance Criteria

### Visual

- Left sidebar no longer appears on `/app`.
- `Sidebar.vue` is deleted; its RBAC and active-route behavior is covered by `app-navigation.spec.ts`.
- Top header stays visible while scrolling app content.
- `운영 기준`, `근무표 생성`, and `근무표 조회` are visible as primary navigation for admin users.
- `운영 기준` shows `병원 정보`, `병동/근무 기준`, `직원 정보` as submenu/anchor destinations on `/app/ops/organization-setup`.
- `근무표 생성` is a direct item, not a dropdown with one repeated action.
- `근무표 조회` shows `생성된 근무표`, `근무 실적` as submenus.
- `/app/schedule-results` uses a year/month schedule lookup UI, not only a vertical schedule list.
- `/app/work-performance` exists as a placeholder empty page.
- Active route is visually obvious without relying on color alone.
- Step 3 grid gains horizontal room compared with the sidebar layout.
- Dashboard no longer reads as a full-page card nested inside app chrome.
- Header has no overlap at `1024px`, and the compact threshold is adjustable through one token/constant.

### Functional

- Existing route paths still work.
- New lookup routes work: `/app/schedule-results`, `/app/work-performance`.
- Existing role-based menu visibility still works.
- Organization switching still works.
- Logout still works.
- Dashboard readiness gate behavior does not change.
- Schedule creation modal behavior does not change.
- `근무 실적` placeholder does not trigger new backend/API calls.

### Accessibility

- Header and nav are keyboard reachable.
- Active nav has `aria-current`.
- Focus ring is visible on nav items, organization switcher, logout, CTA buttons.
- 44px minimum clickable height is preserved.

### Tests

Run after implementation:

```bash
pnpm lint:check
pnpm run build
```

Recommended targeted tests:

```bash
pnpm exec vitest run tests/unit/dashboard.spec.ts
pnpm exec playwright test tests/e2e/pilot-checklist.spec.ts
pnpm exec playwright test tests/e2e/schedule-workflow.spec.ts
```

Additional required tests from engineering review:

```bash
pnpm exec vitest run tests/unit/app-navigation.spec.ts tests/unit/header.spec.ts tests/unit/router-index.spec.ts
```

`Sidebar.vue` is deleted in this plan. Replace `tests/unit/sidebar.spec.ts` with `tests/unit/app-navigation.spec.ts` before deletion and run the replacement test instead.

---

## NOT In Scope

- Adding organization/employee/shift CRUD menus: MVP scope does not require it.
- Adding analytics or broad reporting navigation: not part of schedule-generation focus. `근무 실적` is limited to employee-period duty performance from generated schedules.
- Making Step 3 a mobile-first grid: current product contract is desktop-first.
- Replacing Naive UI: existing stack remains Vue 3 + Naive UI + Tailwind.
- Rebranding the product shell: this is layout and IA cleanup, not brand exploration.
- Real solver integration: mocked solver contract remains.

---

## TODO Candidates

These are not blockers for the top-nav conversion, but they should be considered if the implementation reveals debt.

| What                                                      | Why                                                                                 | Recommendation                                                 |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Create `useAppNavigation.ts`                              | Prevent duplicated permission/active-route logic between old sidebar and new header | Do in the same PR if top nav is implemented                    |
| Add route-level app content width policy                  | Dashboard and Step 3 need different width behavior                                  | Do in the same PR if layout changes are touched                |
| Add visual QA screenshots for `/app`, Step 3, Step 5      | Proves sidebar removal actually improves workspace width                            | Do after implementation                                        |
| Revisit sidebar only when menu count reaches 6+           | Avoid premature admin portal chrome                                                 | Defer                                                          |
| Preserve sidebar behavior coverage after deleting sidebar | Current `sidebar.spec.ts` covers important RBAC/active-route behavior               | Do in the same PR; move assertions to `app-navigation.spec.ts` |
| Add app-shell E2E smoke for top nav                       | Unit tests will not catch real layout overlap or sticky header regressions          | Do in the same PR if top nav is implemented                    |
| Add lookup route IA for `근무표 조회`                     | Resolved in this plan as `/app/schedule-results` and `/app/work-performance`        | Implement in the same PR                                       |
| Add employee performance lookup empty/error states        | `근무 실적` is not implemented yet and needs a deliberate placeholder               | Do in the same PR as `/app/work-performance`; no API calls     |

---

## Completion Summary

```text
+====================================================================+
|         DESIGN PLAN REVIEW — COMPLETION SUMMARY                    |
+====================================================================+
| System Audit         | DESIGN.md exists, UI scope is app shell + dashboard |
| Step 0               | initial rating 7/10, focus on IA, states, a11y       |
| Pass 1  (Info Arch)  | 7/10 -> 9/10 after nav naming + submenu fixes       |
| Pass 2  (States)     | 6/10 -> 9/10 after fixes                            |
| Pass 3  (Journey)    | 7/10 -> 9/10 after fixes                            |
| Pass 4  (AI Slop)    | 8/10 -> 9/10 after fixes                            |
| Pass 5  (Design Sys) | 8/10 -> 9/10 after fixes                            |
| Pass 6  (Responsive) | 5/10 -> 8/10 after fixes                            |
| Pass 7  (Decisions)  | 6 resolved, 2 deferred                              |
| Eng Scope Challenge  | accepted with minimum 5-source-file implementation |
| Eng Architecture     | 0 blocking issues, extract nav mapping first        |
| Eng Code Quality     | 1 concrete drift risk: StepIndicator labels         |
| Eng Test Review      | 23 gaps identified, 7 E2E-worthy                    |
| Eng Performance      | no backend risk, avoid header-side async work       |
| Writing Plans        | header, file map, TDD tasks, commands added         |
+--------------------------------------------------------------------+
| NOT in scope         | written (6 items)                                    |
| What already exists  | written                                              |
| TODOS.md updates     | 8 candidates proposed in this document               |
| Decisions made       | top fixed nav, route active mapping, naming, submenus |
| Decisions deferred   | future 6+ menu sidebar, full mobile grid support     |
| Overall score        | design 7/10 -> 9/10, eng ready with test additions   |
+====================================================================+
```

**Status:** DONE_WITH_CONCERNS
**Verdict:** Plan is implementable after adding `useAppNavigation.ts` test coverage and preserving current sidebar behavior assertions. Run visual QA after implementation, especially on `/app`, Step 3 grid, and Step 5 review surfaces.

## GSTACK REVIEW REPORT

| Review        | Trigger                      | Why                             | Runs | Status      | Findings                                                                         |
| ------------- | ---------------------------- | ------------------------------- | ---- | ----------- | -------------------------------------------------------------------------------- |
| CEO Review    | `/plan-ceo-review`           | Scope & strategy                | 0    | —           | —                                                                                |
| Codex Review  | `/codex review`              | Independent 2nd opinion         | 0    | —           | —                                                                                |
| Eng Review    | `/plan-eng-review`           | Architecture & tests (required) | 1    | issues_open | 23 test gaps, 0 critical gaps; extraction-first plan required                    |
| Design Review | `/plan-design-review`        | UI/UX gaps                      | 1    | clean       | score: 7/10 -> 9/10, top navigation and submenu IA recommended                   |
| Writing Plans | `$superpowers:writing-plans` | Implementation readiness        | 1    | clean       | required header, file ownership map, TDD task breakdown, expected commands added |

**UNRESOLVED:** 0
**VERDICT:** DESIGN CLEARED + ENG REVIEW COMPLETE WITH TEST REQUIREMENTS — ready to implement after carrying the listed tests into the PR.
