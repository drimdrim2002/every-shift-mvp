# Dashboard Readiness Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the first `Dashboard.vue` screen a hospital operator sees after login into an onboarding-only screen or a ready dashboard based on required operations setup readiness.

**Architecture:** Use the existing `getChecklist()` response in `Dashboard.vue` as the single source of truth for the readiness gate. Determine completion from only three checklist items: `organization_profile`, `schedule_foundation`, and `employee_roster`; show `off_request_policy` and `schedule_review` only as supporting information after readiness is complete.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vite, Tailwind CSS, Naive UI, Pinia, Vue Test Utils, Vitest, Playwright.

---

## Scope

This change only covers the information architecture and display conditions for the first `Dashboard.vue` screen after login.

- Include: show an onboarding-only screen when required information is incomplete
- Include: show three sections when required information is complete
- Include: determine completion from the existing checklist response
- Exclude: include Off request policy in required onboarding conditions
- Exclude: include prior schedule review/fairness confirmation in required onboarding conditions
- Exclude: mobile support, analytics dashboards, CRUD expansion, real AI solver integration
- Exclude: backend API, DB schema, route contract changes

## Readiness Contract

Required readiness is true only when all three checklist items below have `status === 'ready'`.

```ts
const REQUIRED_DASHBOARD_READINESS_KEYS = [
  'organization_profile',
  'schedule_foundation',
  'employee_roster',
] as const;
```

- `organization_profile`: hospital information
- `schedule_foundation`: ward/shift standards
- `employee_roster`: employee information

Keep `checklist.ready` as a reference value only. Dashboard branching must prioritize the actual status of the three required items.

Show `off_request_policy` and `schedule_review` only as supporting cards or in the past results area after readiness is complete. Even if those two items are `blocked`, Dashboard is considered ready when the three required items are ready.

If checklist loading fails, do not expose create/list actions. Because the user’s readiness state cannot be verified, show a guidance state that can be retried.

## File Structure

**Modify: `src/views/Dashboard.vue`**

- Add computed state for readiness
- Split the template into loading, no-access, incomplete-readiness, and complete-readiness states
- Hide the existing schedule list and new schedule CTA on the incomplete-readiness screen
- Show three sections on the complete-readiness screen
- Keep the existing month selection modal, schedule list, and Step5 navigation logic

**Modify: `src/components/ops/PilotChecklistCard.vue`**

- If the existing checklist card remains useful, add props so required and supporting items can be displayed separately.
- If reuse makes the implementation more complex, do not modify this file and keep onboarding-only markup inside `Dashboard.vue`.

**Modify: `tests/unit/dashboard.spec.ts`**

- Add/update readiness gate unit tests
- Cover incomplete, complete, optional-blocked, and loading-failure scenarios

**Modify: `tests/e2e/pilot-checklist.spec.ts`**

- Update the existing checklist deep-link test to match the new screen structure
- Verify both incomplete-readiness and complete-readiness fixtures

### File Responsibility Boundaries

Keep the implementation boring and local. Do not create new files unless the existing file becomes clearly unreadable during implementation.

```text
src/views/Dashboard.vue
  Owns: dashboard reload order, readiness computed state, visible branches, schedule history state,
        month modal entry, and existing schedule card actions.
  Must not own: backend readiness derivation, schedule solver logic, employee CRUD, or new app shell layout.

src/components/ops/PilotChecklistCard.vue
  Owns: the old full checklist card only if it remains useful after the split.
  Preferred action: leave unchanged unless reuse avoids duplicated checklist item markup.

tests/unit/dashboard.spec.ts
  Owns: branch-level behavior, fetch ordering, readiness-state rendering, route targets,
        permission gates, and existing schedule action regressions.

tests/e2e/pilot-checklist.spec.ts
  Owns: browser-visible dashboard readiness flows and deep-link smoke coverage.

tests/e2e/helpers.ts
  Owns: shared dashboard helpers only if existing dashboard-start helpers need a complete-ready
        checklist fixture before waiting for schedule cards.
```

### Execution Order for Agentic Workers

Use TDD order even though the implementation tasks below are grouped by component.

```text
1. Add/adjust unit fixtures and red tests in tests/unit/dashboard.spec.ts.
2. Run the focused unit test file and confirm the new tests fail for the expected reason.
3. Implement Dashboard.vue readiness state and reload order.
4. Run the focused unit test file until it passes.
5. Move/refine the template sections and preserve existing schedule actions.
6. Run the focused unit test file again.
7. Add/update Playwright readiness fixtures and E2E assertions.
8. Run focused E2E for the dashboard readiness gate.
9. Run lint and build.
```

Do not start by editing the template. The first checkpoint is a failing dashboard unit test that proves the current screen leaks schedule actions before readiness is verified.

### Commit Plan

Commit in small checkpoints so regressions are easy to isolate.

```bash
git add tests/unit/dashboard.spec.ts
git commit -m "test: cover dashboard readiness gate"

git add src/views/Dashboard.vue
git commit -m "feat: gate dashboard by readiness"

git add tests/e2e/pilot-checklist.spec.ts tests/e2e/helpers.ts
git commit -m "test: cover dashboard readiness e2e"

git add docs/plans/2026-05-13-dashboard-readiness-gate.md
git commit -m "docs: document dashboard readiness plan"
```

If unrelated local changes exist, do not include them in these commits.

## Design Review Addendum

### Design Completeness Rating

- Initial plan rating: **6/10**
- Target after this addendum: **9/10**
- A 10/10 for this plan would also include final visual screenshots after implementation, but this document is implementation-stage planning only.

The original plan was technically specific about routing and tests, but underspecified what the operator sees first, how error and empty states feel, and how the split dashboard avoids becoming a generic card grid.

### What Already Exists

Reuse these existing project decisions instead of inventing a new dashboard language.

- `DESIGN.md` is the active design contract.
- Dashboard hierarchy from `DESIGN.md`: first readiness and next action, second monthly work area, third lower-priority metadata.
- App UI direction: calm operational product, dense but readable, minimal chrome, restrained neutrals, one meaningful accent.
- Typography: `Pretendard Variable` for UI text and `IBM Plex Mono` only for inspectable counts, timestamps, IDs, and score-like values.
- Color tokens: prefer existing semantic CSS variables and restrained slate/teal language; do not introduce purple/blue gradients or decorative color systems.
- Existing dashboard patterns: section-local loading, schedule cards as true schedule entities, Naive UI buttons/cards/spinner/modal, and existing schedule actions.

### UI Scope

This plan changes one authenticated app surface: the first `Dashboard.vue` screen after login.

It affects:

- dashboard header CTA visibility
- readiness loading, failure, incomplete, and complete states
- onboarding-only required item flow
- complete dashboard sections for basic information, schedule creation, and past results
- schedule list placement inside the history section

It does not introduce a new app shell, sidebar, mobile app layout, analytics surface, CRUD module, or new route contract.

### Screen Classifier

This is **APP UI**, not a landing page.

Apply App UI rules:

- calm surface hierarchy
- dense but readable layout
- utility language
- minimal chrome
- cards only when the card is an action container or schedule entity
- no decorative hero, gradient background, ornamental icon set, or generic dashboard mosaic

### Information Architecture

The dashboard has exactly five mutually exclusive top-level states.

```text
 Dashboard.vue
 |
 +-- No admin access
 |   +-- permissions guidance only
 |
 +-- Readiness loading
 |   +-- section-local loading state only
 |
 +-- Readiness unavailable
 |   +-- retryable guidance state
 |
 +-- Incomplete readiness
 |   +-- onboarding-only required setup sequence
 |
 +-- Complete readiness
     +-- 기본 정보
     +-- 근무표 생성
     +-- 지난 결과
```

The hierarchy should be visible within the first three seconds.

1. **Incomplete state:** "what blocks schedule creation" first, "which item is actionable now" second, route CTAs third.
2. **Complete state:** "what information can be reviewed" first, "create new schedule" second, "past results" third.
3. **History section:** schedule entities first, supporting `schedule_review` guidance second if shown.

### Incomplete Screen Layout

Use a single onboarding section, not the existing full checklist plus the schedule list.

```text
[Page title: 근무표 관리]

[Onboarding-only section]
  Title: 근무표 생성을 시작하기 전에 필수 정보를 먼저 확인해주세요
  Helper: 아래 3가지를 순서대로 완료하면 근무표 생성과 지난 결과 확인을 사용할 수 있습니다.

  [1 병원 정보]       status chip: 완료 / 진행 / 대기
      one-line context
      CTA: 병원 정보 확인하기

  [2 병동/근무 기준] status chip: 완료 / 진행 / 대기
      one-line context
      CTA: 근무 기준 설정하기

  [3 직원 정보]       status chip: 완료 / 진행 / 대기
      one-line context
      CTA: 직원 정보 확인하기
```

Only the current actionable item gets the primary button treatment. Completed items use secondary review buttons. Waiting items stay disabled with a short reason that the previous step must be completed first.

### Complete Screen Layout

Do not make the complete dashboard a decorative grid of equal cards. Use three clear work sections with different jobs.

```text
[Page title: 근무표 관리]                         [새 근무표 생성]

[기본 정보]
  Compact action row/list:
  - 병원 정보
  - 병동/근무 기준
  - 직원 정보

[근무표 생성]
  Primary action surface for the month selection modal.
  If canManageSchedules is false, show readonly guidance instead of a hidden blank section.

[지난 결과]
  Existing schedule loading/list/empty/error behavior lives here.
```

Section jobs:

- `기본 정보`: review or edit readiness inputs
- `근무표 생성`: start the schedule-generation workflow
- `지난 결과`: inspect, edit, delete, or continue existing schedules

### Interaction State Coverage

State design is mandatory. Implement the user-visible state, not just the boolean branch.

| Feature                   | Loading                                                       | Empty                                                                      | Error                                                                                | Success                                                           | Partial                                                                         |
| ------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Readiness gate            | Show `dashboard-ops-readiness-loading`; hide schedule actions | Not applicable if checklist request succeeds                               | Show retryable readiness unavailable state; hide create/list actions                 | Branch to incomplete or complete state                            | If required keys are missing, treat as unavailable, not ready                   |
| Incomplete onboarding     | Do not render until readiness loading resolves                | Show all 3 required items with current status                              | If route click fails, keep user on dashboard and show existing message utility       | After an item becomes ready on reload, move it to completed state | Completed prior items stay visible; only next incomplete item is primary        |
| Basic information section | Not shown while readiness loading                             | Not applicable after ready                                                 | If a route target is unavailable, keep section visible and show disabled action copy | Routes to existing setup surfaces                                 | Optional checklist items must not change required readiness                     |
| Schedule creation section | Hidden while readiness loading                                | If `canManageSchedules === false`, show readonly permission guidance       | Existing month modal errors remain in modal context                                  | Existing `handleCreateNew()` and month modal behavior             | Header create button and section CTA use same readiness permission              |
| Past results section      | Existing schedule list loading inside section                 | Warm empty state with primary CTA when allowed; no emoji-first empty state | Preserve existing safe error behavior or add retry guidance if present               | Existing card click/edit/delete behavior                          | `schedule_review` may appear as supporting guidance, never as readiness blocker |

### Required Copy and Tone

All user-facing copy stays Korean and operational.

Use utility language:

- what is missing
- why it blocks schedule creation
- what the user can do now

Avoid:

- marketing claims
- "AI" promotional copy
- vague labels like "Get started"
- emoji-first empty states
- decorative checklist language

### Visual System Alignment

Use `DESIGN.md` as the visual contract.

- Use the existing dashboard/app content width and app shell spacing.
- Use `text-2xl` for the page title and `text-xl` for section titles.
- Use `text-sm` for helper copy and operational metadata.
- Use restrained neutral surfaces with subtle borders before shadows.
- Use accent color only for the primary actionable item, primary CTA, or important status.
- Use status chips that communicate through text and shape, not color alone.
- Do not introduce a third font, new token family, gradient background, decorative blobs, or icon-in-colored-circle feature cards.
- Cards are allowed only for the three onboarding action containers and schedule entities; do not nest cards inside cards.

### Responsive and Accessibility Requirements

This MVP dashboard remains desktop-first, but tablet and narrow desktop behavior must be intentional.

- Desktop: three complete-state sections stack vertically in priority order; history can use existing schedule-card layout.
- Tablet: keep the same vertical section order; action rows may wrap, but CTAs must remain adjacent to their item labels.
- Mobile: broad mobile support remains out of scope, but the screen must not produce overlapping text or unreachable actions if viewed in a narrow viewport.
- Touch targets: all buttons and clickable card rows are at least `44px` high.
- Keyboard: onboarding item cards that navigate must be focusable and activatable with Enter/Space, or use real buttons/links inside non-clickable containers.
- Focus: visible focus ring on header CTA, onboarding CTAs, basic info CTAs, schedule cards, edit/delete buttons, and modal controls.
- Screen readers: each status chip must have text that makes sense without color; disabled waiting items explain what must happen first.
- Color contrast: body text and essential warnings meet WCAG AA; muted text is only secondary.

### AI Slop Risk Assessment

Risk level after this addendum: **low**.

Hard rejections to avoid during implementation:

- app UI made of stacked decorative cards instead of a work layout
- equal-weight dashboard-card mosaic where every section competes
- emoji-first empty state in `지난 결과`
- colored icon circles for the three readiness items
- centered-everything layout
- purple/blue gradients or decorative blobs

### NOT in Scope

- New mobile interaction model for the full schedule workflow: out of MVP dashboard readiness scope.
- Dashboard analytics or KPI widgets: this gate is about readiness and schedule-generation entry only.
- CRUD for organizations, employees, or shifts: the MVP continues to use existing setup flows and seed data assumptions.
- Real AI solver integration: unrelated to the dashboard readiness split.
- New visual design system: `DESIGN.md` already provides the contract.
- Public landing-page treatment: this is authenticated app UI.

### Unresolved Design Decisions

None. The implementation should use the complete design contract above.

## UI Behavior

### Loading

When `opsReadinessLoading === true`, hide all schedule actions as today.

- Hide: header `새 근무표 생성`
- Hide: schedule list
- Hide: three complete-state sections
- Show: `dashboard-ops-readiness-loading`

Keep the existing meaning of the copy.

```text
운영 준비 정보를 확인하는 중입니다
병원 정보, 기준 설정, 체크리스트를 불러오고 있습니다.
```

The loading state should be section-local, calm, and non-promotional. Do not show skeletons for schedule cards because schedule actions are not available until readiness is verified.

### No Admin Access

When `hasAdminDashboardAccess === false`, keep the existing permissions guidance screen.

- Do not call `loadOrganization()`, `getChecklist()`, or `getScheduleList()`
- Do not show schedule create/list actions

### Readiness Load Failure

When `getChecklist()` fails or the required readiness keys are missing, show a retryable guidance state instead of schedule actions.

- Hide: header `새 근무표 생성`
- Hide: schedule list
- Hide: complete-state sections
- Show: a section error card explaining that readiness could not be verified
- Primary action: retry readiness loading

Required copy:

```text
운영 준비 상태를 확인하지 못했습니다
필수 정보가 준비되었는지 확인할 수 없어 근무표 생성과 지난 결과를 잠시 숨겼습니다.
다시 확인
```

This state matters because exposing schedule creation while readiness is unknown breaks the trust contract.

### Incomplete Readiness

If any of the three required items is not ready, show only the onboarding-only screen.

The display order is fixed.

1. Hospital information
2. Ward/shift standards
3. Employee information

Each item shows one of these states.

- Complete: `완료`
- Currently actionable: `진행`
- Requires previous item: `대기`

State rules:

- `완료`: show as completed and allow secondary review/edit navigation.
- `진행`: first required item that is not ready; show one primary CTA.
- `대기`: any later incomplete item; show disabled action and explain which prior item is required.

CTA routes are fixed as follows.

```ts
organization_profile -> getOpsOrganizationSetupRoutePath()
schedule_foundation -> { path: getScheduleStepRoutePath(2), query: buildScheduleEntryQuery('setup') }
employee_roster -> { path: getScheduleStepRoutePath(3), query: buildScheduleEntryQuery('setup') }
```

Do not show the following on the incomplete-readiness screen.

- Existing schedule list
- Header `새 근무표 생성`
- `월별 근무표 작업`
- Three ready-state menus/sections
- Supporting `off_request_policy` or `schedule_review` items

The incomplete screen must not show the old `PilotChecklistCard` as-is if it includes optional or non-required items. The operator should see only the three required blockers for schedule creation.

### Complete Readiness

When all three required items are ready, show three sections.

**기본 정보**

- Review/edit hospital information
- Review/edit ward/shift standards
- Review/edit employee information
- Each CTA links to the same route used in onboarding.

**근무표 생성**

- Enter the new schedule creation workflow
- Keep using the existing `handleCreateNew()` and month selection modal
- Hide the create CTA when `canManageSchedules === false`

**지난 결과**

- Put the existing schedule list inside this section.
- Keep existing behavior for schedule card click, edit, delete, and Step5 canonical route navigation.
- If there are no schedules, show the existing empty state inside this section.
- The `schedule_review` checklist item is not a required completion condition; if needed, use it only as supporting guidance in this section.

Empty-state copy inside `지난 결과` should be warm and directive, not emoji-first. Replace the current emoji-led empty state if this surface is touched.

Recommended empty-state copy:

```text
아직 생성된 근무표가 없습니다
필수 정보는 준비되었습니다. 첫 근무표를 생성해 이번 달 배정을 시작하세요.
첫 근무표 생성하기
```

## Implementation Tasks

### Task 0: Establish Red Tests and Baseline

**Files:**

- Modify: `tests/unit/dashboard.spec.ts`

- [ ] **Step 1: Add only the checklist fixture helper and one failing incomplete-readiness test**

Start with the smallest regression proof: when `schedule_foundation` is blocked, the dashboard must show onboarding-only UI and must not fetch schedules.

```ts
it('shows onboarding only and skips schedule loading when required readiness is incomplete', async () => {
  getChecklistMock.mockResolvedValue(
    buildChecklistFixture({
      schedule_foundation: {
        status: 'blocked',
        blockedReason: '기준 장소, 휴식시간, 시프트, 인력 기준 설정을 먼저 완료해주세요.',
      },
      employee_roster: {
        status: 'blocked',
        blockedReason: '직원 로스터가 아직 등록되지 않았습니다.',
      },
    })
  );

  const wrapper = createWrapper();
  await flushPromises();

  expect(wrapper.find('[data-test="dashboard-onboarding-only"]').exists()).toBe(true);
  expect(wrapper.find('[data-test="dashboard-create-schedule"]').exists()).toBe(false);
  expect(wrapper.find('[data-test="schedule-card"]').exists()).toBe(false);
  expect(getScheduleListMock).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the focused unit test and confirm it fails**

```bash
pnpm test:unit -- tests/unit/dashboard.spec.ts -t "shows onboarding only and skips schedule loading when required readiness is incomplete"
```

Expected: **FAIL** because `dashboard-onboarding-only` does not exist yet and the current dashboard still loads schedules before the readiness gate.

- [ ] **Step 3: Add the remaining red unit tests from Task 4**

Add the readiness-unavailable, optional-blocked, schedule-review-blocked, schedule-list-failure, route-target, route-failure, and permission-gated create tests before implementation.

- [ ] **Step 4: Run the dashboard unit suite and keep the red failure list**

```bash
pnpm test:unit -- tests/unit/dashboard.spec.ts
```

Expected: **FAIL** with the new readiness-gate tests failing and the unrelated existing tests still passing. If an unrelated existing test fails before implementation, stop and identify whether the test setup is incompatible with the new fixture helper before editing production code.

### Task 1: Add Dashboard Readiness Computed State

**Files:**

- Modify: `src/views/Dashboard.vue`

- [ ] **Step 1: Add required key constants and helper types near the checklist state**

```ts
const REQUIRED_DASHBOARD_READINESS_KEYS = [
  'organization_profile',
  'schedule_foundation',
  'employee_roster',
] as const satisfies readonly ChecklistItem['key'][];

type DashboardReadinessKey = (typeof REQUIRED_DASHBOARD_READINESS_KEYS)[number];
```

- [ ] **Step 2: Add checklist lookup computed values**

```ts
const opsReadinessLoadFailed = ref(false);

const checklistItemByKey = computed(() => {
  return new Map((checklist.value?.items ?? []).map((item) => [item.key, item]));
});

const requiredReadinessItems = computed(() => {
  return REQUIRED_DASHBOARD_READINESS_KEYS.map((key) => checklistItemByKey.value.get(key) ?? null);
});

const hasRequiredReadinessItems = computed(() => {
  return requiredReadinessItems.value.every((item) => item !== null);
});

const isDashboardReady = computed(() => {
  return requiredReadinessItems.value.every((item) => item?.status === 'ready');
});

const incompleteRequiredReadinessItems = computed(() => {
  return requiredReadinessItems.value.filter((item) => item?.status !== 'ready');
});

const isDashboardReadinessUnavailable = computed(() => {
  return (
    !opsReadinessLoading.value && (opsReadinessLoadFailed.value || !hasRequiredReadinessItems.value)
  );
});
```

- [ ] **Step 3: Mark checklist request failures explicitly and load schedules only after readiness is verified**

When the dashboard reload starts, reset `opsReadinessLoadFailed` to `false`, clear stale `schedules`, and load organization/foundation data first. Then call `getChecklist()` before `getScheduleList()`.

If `getChecklist()` rejects or the response is missing any required key, set `opsReadinessLoadFailed` to `true`, keep `checklist.value = null`, keep `schedules.value = []`, and skip `loadSchedules()`.

If the checklist loads but required readiness is incomplete, keep the checklist response for onboarding display, keep `schedules.value = []`, and skip `loadSchedules()`.

Only call `loadSchedules()` after all three required readiness items are present and ready. This keeps data loading, UI exposure, and permission behavior aligned.

Change `loadChecklist()` to return the loaded `ChecklistResponse | null` so `reloadDashboardData()` can make the schedule-loading decision without relying on a later template branch.

- [ ] **Step 3a: Add schedule-list failure state for the ready dashboard**

Add a separate `scheduleListLoadFailed` ref. Reset it before `loadSchedules()`. If `getScheduleList()` fails after readiness is complete, keep the complete dashboard visible but show a retryable history error instead of the empty schedule state.

Recommended data-test attributes:

- `dashboard-history-error`
- `dashboard-history-retry`

Required copy:

```text
지난 결과를 불러오지 못했습니다
근무표 생성은 계속 사용할 수 있지만, 기존 결과를 확인하려면 목록을 다시 불러와야 합니다.
다시 불러오기
```

- [ ] **Step 4: Add helper for readiness route targets**

```ts
function getReadinessRoute(key: DashboardReadinessKey) {
  if (key === 'organization_profile') {
    return getOpsOrganizationSetupRoutePath();
  }

  if (key === 'schedule_foundation') {
    return {
      path: getScheduleStepRoutePath(2),
      query: buildScheduleEntryQuery('setup'),
    };
  }

  return {
    path: getScheduleStepRoutePath(3),
    query: buildScheduleEntryQuery('setup'),
  };
}
```

- [ ] **Step 5: Add navigation handler for readiness cards**

```ts
async function handleOpenReadinessItem(key: DashboardReadinessKey) {
  if (!hasAdminDashboardAccess.value) {
    return;
  }

  try {
    await router.push(getReadinessRoute(key));
  } catch (error) {
    console.warn('Readiness navigation failed:', error);
    showError('화면을 열지 못했습니다. 잠시 후 다시 시도해주세요.');
  }
}
```

- [ ] **Step 6: Run unit tests after readiness state implementation**

```bash
pnpm test:unit -- tests/unit/dashboard.spec.ts
```

Expected: readiness computed/fetch-order tests pass or move to template-only failures. Existing schedule action tests must still pass.

- [ ] **Step 7: Commit readiness state when green enough to isolate**

```bash
git add src/views/Dashboard.vue tests/unit/dashboard.spec.ts
git commit -m "feat: add dashboard readiness state"
```

### Task 2: Split Dashboard Template by Readiness

**Files:**

- Modify: `src/views/Dashboard.vue`

- [ ] **Step 1: Gate the header create button**

Change the header create button condition to:

```vue
v-if="canManageSchedules && isDashboardReady && !opsReadinessLoading"
```

- [ ] **Step 2: Keep loading as the only readiness-loading surface**

Do not render setup/checklist/schedule sections while `opsReadinessLoading` is true.

- [ ] **Step 3: Add readiness unavailable section**

Show this only when `!opsReadinessLoading && isDashboardReadinessUnavailable`.

Recommended data-test attributes:

- `dashboard-readiness-unavailable`
- `dashboard-readiness-retry`

Expected behavior:

- Do not render `dashboard-onboarding-only`
- Do not render complete-state sections
- Do not render schedule cards or create CTAs
- Retry action reruns the readiness load path that calls `getChecklist()`

- [ ] **Step 4: Add incomplete onboarding-only section**

Show this only when `!opsReadinessLoading && !isDashboardReadinessUnavailable && !isDashboardReady`.

Required screen copy:

```text
근무표 생성을 시작하기 전에 필수 정보를 먼저 확인해주세요
아래 3가지를 순서대로 완료하면 근무표 생성과 지난 결과 확인을 사용할 수 있습니다.
```

Recommended data-test attributes:

- `dashboard-onboarding-only`
- `dashboard-onboarding-item-organization_profile`
- `dashboard-onboarding-item-schedule_foundation`
- `dashboard-onboarding-item-employee_roster`

- [ ] **Step 5: Add onboarding item state and accessibility details**

For each required item:

- Use Korean labels and status text from the design addendum.
- Make completed and current items navigable with real buttons or links.
- Keep waiting items disabled and include a visible reason.
- Do not rely on color alone for `완료`, `진행`, or `대기`.

- [ ] **Step 6: Hide schedule surfaces while incomplete**

Render `월별 근무표 작업`, schedule cards, the empty schedule state, and create CTAs only when `isDashboardReady` is true.

- [ ] **Step 7: Add complete state sections**

When `!opsReadinessLoading && isDashboardReady`, render these three sections.

Recommended data-test attributes:

- `dashboard-basic-info-section`
- `dashboard-create-section`
- `dashboard-history-section`

Section titles:

```text
기본 정보
근무표 생성
지난 결과
```

- [ ] **Step 8: Apply visual-system constraints**

Follow the design addendum while editing the template:

- no decorative card mosaic
- no nested cards
- no emoji-first empty state
- no new color token family
- clear section order and utility copy

- [ ] **Step 9: Run unit tests after template split**

```bash
pnpm test:unit -- tests/unit/dashboard.spec.ts
```

Expected: all dashboard unit tests pass except any tests that intentionally wait for E2E fixture work.

- [ ] **Step 10: Commit template split**

```bash
git add src/views/Dashboard.vue tests/unit/dashboard.spec.ts
git commit -m "feat: split dashboard readiness states"
```

### Task 3: Preserve Existing Schedule Actions Inside History Section

**Files:**

- Modify: `src/views/Dashboard.vue`

- [ ] **Step 1: Move the existing schedule loading/list/empty state under `dashboard-history-section`**

Keep the existing `scheduleLoading`, `schedules.length === 0`, and `schedule-card` branches.

Do not fetch or render the schedule list until required readiness is complete. The history section exists only in the complete-ready branch.

If `scheduleListLoadFailed === true`, render `dashboard-history-error` before the empty state branch so a failed request is never misrepresented as "no schedules."

- [ ] **Step 2: Keep existing schedule card actions**

Do not change the signatures or behavior of these existing handlers.

```ts
handleViewSchedule(schedule);
handleEdit(schedule);
handleDelete(schedule);
handleCreateNew();
handleMonthConfirm();
```

- [ ] **Step 3: Keep Step5 navigation helpers unchanged**

Do not modify these helpers as part of the readiness work.

```ts
seedChecklistScheduleContext(item);
navigateToCanonicalStep5(scheduleKey);
handleChecklistNavigate(item);
```

- [ ] **Step 4: Remove duplicated foundation-card state**

Remove `foundationChecklistItems`, `showFoundationCard`, `foundationCardTarget`, `FoundationCardTarget`, and `handleOpenFoundationEntry` once the new onboarding and basic information sections own those CTAs. Do not leave the old foundation card alongside the new readiness gate.

- [ ] **Step 5: Run schedule-action regression tests**

```bash
pnpm test:unit -- tests/unit/dashboard.spec.ts -t "canonical preview|legacy uuid|compare fails|deletes an existing schedule|month picker"
```

Expected: **PASS**. These tests prove the history-section move did not break Step5 entry, delete behavior, or month creation.

- [ ] **Step 6: Commit preserved schedule actions**

```bash
git add src/views/Dashboard.vue tests/unit/dashboard.spec.ts
git commit -m "refactor: preserve dashboard schedule actions"
```

### Task 4: Update Unit Tests

**Files:**

- Modify: `tests/unit/dashboard.spec.ts`

- [ ] **Step 1: Add a checklist fixture helper**

```ts
function buildChecklistFixture(
  overrides?: Partial<Record<ChecklistItem['key'], Partial<ChecklistItem>>>
) {
  const items: ChecklistItem[] = [
    {
      key: 'organization_profile',
      title: '병원 정보 확인',
      status: 'ready',
      route: '/ops/organization-setup',
      blockedReason: null,
      isOptional: false,
    },
    {
      key: 'schedule_foundation',
      title: '기준 장소와 근무 기준 설정',
      status: 'ready',
      route: '/schedule/step2',
      blockedReason: null,
      isOptional: false,
    },
    {
      key: 'employee_roster',
      title: '직원 로스터 준비',
      status: 'ready',
      route: '/schedule/step3',
      blockedReason: null,
      isOptional: false,
    },
    {
      key: 'off_request_policy',
      title: 'Off 사용 기준 설정',
      status: 'blocked',
      route: '/ops/off-request-policy-setup',
      blockedReason: '필요하면 나중에 설정할 수 있습니다.',
      isOptional: true,
    },
    {
      key: 'schedule_review',
      title: '최종 검토 진입',
      status: 'blocked',
      route: null,
      blockedReason: '검토할 근무표가 아직 없습니다.',
      isOptional: false,
    },
  ].map((item) => ({
    ...item,
    ...(overrides?.[item.key] ?? {}),
  }));

  return {
    organizationId: 'org-1',
    checklistCursor: 'employee_roster',
    ready: items.slice(0, 3).every((item) => item.status === 'ready'),
    items,
    fairnessSummary: [],
  };
}
```

- [ ] **Step 2: Add incomplete onboarding-only test**

Expected assertions:

```ts
expect(wrapper.find('[data-test="dashboard-onboarding-only"]').exists()).toBe(true);
expect(wrapper.find('[data-test="dashboard-create-schedule"]').exists()).toBe(false);
expect(wrapper.find('[data-test="schedule-card"]').exists()).toBe(false);
expect(wrapper.find('[data-test="dashboard-basic-info-section"]').exists()).toBe(false);
expect(wrapper.find('[data-test="dashboard-create-section"]').exists()).toBe(false);
expect(wrapper.find('[data-test="dashboard-history-section"]').exists()).toBe(false);
```

- [ ] **Step 3: Add readiness load failure test**

Make `getChecklist()` reject or return a payload missing one required key.

Expected assertions:

```ts
expect(wrapper.find('[data-test="dashboard-readiness-unavailable"]').exists()).toBe(true);
expect(wrapper.find('[data-test="dashboard-create-schedule"]').exists()).toBe(false);
expect(wrapper.find('[data-test="schedule-card"]').exists()).toBe(false);
expect(wrapper.find('[data-test="dashboard-onboarding-only"]').exists()).toBe(false);
expect(wrapper.find('[data-test="dashboard-basic-info-section"]').exists()).toBe(false);
```

Also assert that the schedule list was not fetched:

```ts
expect(getScheduleListMock).not.toHaveBeenCalled();
```

- [ ] **Step 3a: Add incomplete-readiness schedule fetch guard test**

Make one required key blocked and assert the onboarding-only screen appears without loading schedules.

Expected assertions:

```ts
expect(wrapper.find('[data-test="dashboard-onboarding-only"]').exists()).toBe(true);
expect(getScheduleListMock).not.toHaveBeenCalled();
expect(wrapper.find('[data-test="schedule-card"]').exists()).toBe(false);
```

- [ ] **Step 4: Add optional item blocked test**

Set `off_request_policy.status = 'blocked'` and keep the three required items ready.

Expected assertions:

```ts
expect(wrapper.find('[data-test="dashboard-onboarding-only"]').exists()).toBe(false);
expect(wrapper.find('[data-test="dashboard-basic-info-section"]').exists()).toBe(true);
expect(wrapper.find('[data-test="dashboard-create-section"]').exists()).toBe(true);
expect(wrapper.find('[data-test="dashboard-history-section"]').exists()).toBe(true);
```

- [ ] **Step 5: Add schedule review blocked test**

Set `schedule_review.status = 'blocked'` and keep the three required items ready.

Expected assertion:

```ts
expect(wrapper.find('[data-test="dashboard-history-section"]').exists()).toBe(true);
```

- [ ] **Step 6: Add schedule list failure test**

Keep the three required readiness items ready, make `getScheduleList()` reject, and assert the ready dashboard shows a retryable history error instead of the empty state.

Expected assertions:

```ts
expect(wrapper.find('[data-test="dashboard-history-section"]').exists()).toBe(true);
expect(wrapper.find('[data-test="dashboard-history-error"]').exists()).toBe(true);
expect(wrapper.text()).toContain('지난 결과를 불러오지 못했습니다');
expect(wrapper.text()).not.toContain('아직 생성된 근무표가 없습니다');
```

- [ ] **Step 7: Add onboarding route tests**

Expected route assertions:

```ts
expect(pushMock).toHaveBeenCalledWith('/app/ops/organization-setup');
expect(pushMock).toHaveBeenCalledWith({
  path: '/app/schedule/step2',
  query: { context: 'setup' },
});
expect(pushMock).toHaveBeenCalledWith({
  path: '/app/schedule/step3',
  query: { context: 'setup' },
});
```

- [ ] **Step 8: Add onboarding route failure test**

Make `router.push` reject for an actionable onboarding item.

Expected assertions:

```ts
expect(showErrorMock).toHaveBeenCalledWith('화면을 열지 못했습니다. 잠시 후 다시 시도해주세요.');
expect(wrapper.find('[data-test="dashboard-onboarding-only"]').exists()).toBe(true);
```

- [ ] **Step 9: Add permission-gated create section test**

Set required readiness ready and `canManageSchedules === false`.

Expected assertions:

```ts
expect(wrapper.find('[data-test="dashboard-create-section"]').exists()).toBe(true);
expect(wrapper.find('[data-test="dashboard-create-schedule"]').exists()).toBe(false);
expect(wrapper.text()).toContain('근무표 생성 권한');
```

- [ ] **Step 10: Update existing checklist tests**

Update the existing `surfaces the pilot checklist entry with deep links from the dashboard shell` test so it looks for the checklist or basic information cards inside the new complete-state section.

- [ ] **Step 11: Run full dashboard unit suite**

```bash
pnpm test:unit -- tests/unit/dashboard.spec.ts
```

Expected: **PASS**.

- [ ] **Step 12: Commit complete unit coverage**

```bash
git add tests/unit/dashboard.spec.ts src/views/Dashboard.vue
git commit -m "test: complete dashboard readiness unit coverage"
```

### Task 5: Update E2E Coverage

**Files:**

- Modify: `tests/e2e/pilot-checklist.spec.ts`

- [ ] **Step 1: Rename the describe block to match Dashboard readiness**

```ts
test.describe('dashboard readiness gate', () => {
```

- [ ] **Step 2: Add incomplete checklist route mock**

Required fixture state:

```json
{
  "organization_profile": "ready",
  "schedule_foundation": "blocked",
  "employee_roster": "blocked",
  "off_request_policy": "blocked",
  "schedule_review": "blocked"
}
```

Expected browser assertions:

```ts
await expect(page.getByTestId('dashboard-onboarding-only')).toBeVisible();
await expect(
  page.getByText('근무표 생성을 시작하기 전에 필수 정보를 먼저 확인해주세요')
).toBeVisible();
await expect(page.getByText('월별 근무표 작업')).toHaveCount(0);
await expect(page.getByTestId('dashboard-create-schedule')).toHaveCount(0);
```

- [ ] **Step 3: Add readiness failure browser assertion**

Mock the checklist endpoint as a failed response.

Expected browser assertions:

```ts
await expect(page.getByTestId('dashboard-readiness-unavailable')).toBeVisible();
await expect(page.getByText('운영 준비 상태를 확인하지 못했습니다')).toBeVisible();
await expect(page.getByTestId('dashboard-create-schedule')).toHaveCount(0);
await expect(page.getByText('월별 근무표 작업')).toHaveCount(0);
```

- [ ] **Step 4: Keep ready checklist deep-link test**

Ready fixture state:

```json
{
  "organization_profile": "ready",
  "schedule_foundation": "ready",
  "employee_roster": "ready",
  "off_request_policy": "blocked",
  "schedule_review": "blocked"
}
```

Expected browser assertions:

```ts
await expect(page.getByTestId('dashboard-basic-info-section')).toBeVisible();
await expect(page.getByTestId('dashboard-create-section')).toBeVisible();
await expect(page.getByTestId('dashboard-history-section')).toBeVisible();
```

- [ ] **Step 5: Update dashboard-start E2E fixtures**

Any E2E test that starts from the dashboard and expects schedule creation or schedule-card access must provide a complete-ready checklist fixture before waiting for schedule state.

Affected helper flows:

- `startNewScheduleFromDashboard(page)`
- `openExistingScheduleFromDashboard(page, options)`

If a test intentionally covers incomplete readiness, do not call `waitForDashboardScheduleState(page)` because schedule history is intentionally hidden.

- [ ] **Step 6: Run focused Playwright readiness tests**

```bash
pnpm test:e2e -- tests/e2e/pilot-checklist.spec.ts
```

Expected: **PASS**.

- [ ] **Step 7: Run dashboard-start regression E2E**

```bash
pnpm test:e2e -- tests/e2e/schedule-workflow.spec.ts
```

Expected: **PASS**. This verifies `startNewScheduleFromDashboard(page)` still reaches Step1 after the readiness gate.

- [ ] **Step 8: Commit E2E coverage**

```bash
git add tests/e2e/pilot-checklist.spec.ts tests/e2e/helpers.ts
git commit -m "test: cover dashboard readiness gate e2e"
```

### Task 6: Final Verification and Handoff

**Files:**

- Verify: `src/views/Dashboard.vue`
- Verify: `tests/unit/dashboard.spec.ts`
- Verify: `tests/e2e/pilot-checklist.spec.ts`
- Verify: `tests/e2e/helpers.ts`
- Verify: `docs/plans/2026-05-13-dashboard-readiness-gate.md`

- [ ] **Step 1: Run focused unit tests**

```bash
pnpm test:unit -- tests/unit/dashboard.spec.ts
```

Expected: **PASS**.

- [ ] **Step 2: Run focused E2E tests**

```bash
pnpm test:e2e -- tests/e2e/pilot-checklist.spec.ts tests/e2e/schedule-workflow.spec.ts
```

Expected: **PASS**.

- [ ] **Step 3: Run lint**

```bash
pnpm lint:check
```

Expected: **PASS** with no ESLint errors.

- [ ] **Step 4: Run production build**

```bash
pnpm run build
```

Expected: **PASS** with `vue-tsc -b` and `vite build` completing successfully.

- [ ] **Step 5: Review diff for accidental scope creep**

```bash
git diff --stat
git diff -- src/views/Dashboard.vue tests/unit/dashboard.spec.ts tests/e2e/pilot-checklist.spec.ts tests/e2e/helpers.ts
```

Expected: only dashboard readiness, dashboard tests, E2E fixtures/helpers, and this plan changed.

- [ ] **Step 6: Final commit if any verification-only fixes were needed**

```bash
git add src/views/Dashboard.vue tests/unit/dashboard.spec.ts tests/e2e/pilot-checklist.spec.ts tests/e2e/helpers.ts docs/plans/2026-05-13-dashboard-readiness-gate.md
git commit -m "chore: verify dashboard readiness gate"
```

Skip this commit if no files changed after the previous task commits.

## Verification

Run after implementation:

```bash
pnpm test:unit -- tests/unit/dashboard.spec.ts
pnpm lint:check
pnpm run build
```

If E2E fixtures are changed:

```bash
pnpm test:e2e -- tests/e2e/pilot-checklist.spec.ts tests/e2e/schedule-workflow.spec.ts
```

Expected result:

- Dashboard unit tests pass
- Lint passes
- Build passes
- E2E readiness gate test passes when run

## Assumptions

- User-facing UI text stays Korean.
- The `getChecklist()` response shape remains unchanged.
- Backend `ready` can remain broader than the Dashboard readiness gate; Dashboard uses the three required item statuses.
- Existing schedule creation modal and Step5 navigation behavior remain unchanged.
- No new CRUD surface is added for organizations, employees, or shifts.
- This plan intentionally stays inside the MVP schedule-generation flow.

## Engineering Review Addendum

### Step 0: Scope Challenge

**Existing code already solving sub-problems**

- `src/views/Dashboard.vue` already owns admin access checks, organization loading, checklist loading, schedule list loading, month modal behavior, and Step5 navigation. Reuse it; do not create a dashboard service or new route.
- `getChecklist()` already returns the readiness inputs needed for this gate. Reuse its item statuses; do not add backend, DB, or API contract work.
- `getOpsOrganizationSetupRoutePath()`, `getScheduleStepRoutePath()`, and `buildScheduleEntryQuery('setup')` already encode the route contract. Reuse them; do not hard-code route strings in the template.
- `tests/unit/dashboard.spec.ts` already mocks the dashboard data boundaries. Extend those mocks instead of creating a second test harness.
- `tests/e2e/pilot-checklist.spec.ts` already proves checklist deep links from the dashboard. Convert it into the readiness gate E2E suite.

**Minimum viable change**

The smallest complete implementation is still a one-view refactor: keep all branching in `Dashboard.vue`, add local computed readiness state, load schedules only after the three required readiness keys are verified, and update existing dashboard unit/E2E tests. `PilotChecklistCard.vue` should be modified only if it reduces duplication; otherwise leave it untouched.

**Complexity check**

Planned touch set is 3-4 files:

```text
src/views/Dashboard.vue
tests/unit/dashboard.spec.ts
tests/e2e/pilot-checklist.spec.ts
src/components/ops/PilotChecklistCard.vue   (optional only)
```

This is below the 8-file / 2-new-service smell threshold. No new class, store, composable, API endpoint, or migration is justified.

**Search check**

No new infrastructure or unfamiliar concurrency pattern is introduced. The plan uses Vue 3 computed state, existing route helpers, and existing Vitest/Playwright tests: **[Layer 1] boring, in-distribution technology**.

**TODOS cross-reference**

No `TODOS.md` exists in this repo at review time. No deferred item blocks this plan. The only new follow-up worth tracking is visual QA after implementation, and the design review summary already captures that as `/design-review` after the screen exists.

**Completeness check**

The original design plan was close, but the engineering plan had two shortcuts that would save little time and create production ambiguity:

1. Schedule data could still be fetched before readiness was verified.
2. A failed schedule-list request could still render as an empty history state.

Both are now in scope because they are small local changes with high trust impact.

**Distribution check**

No new artifact type is introduced. No package, binary, container, or publish pipeline is required.

**Retrospective learning**

Recent commits mostly touch Step5 result review and finalization behavior. This plan should preserve Step5 route helpers and add regression tests around `navigateToCanonicalStep5()`/schedule-card behavior because the dashboard is the entry point into those recently changed flows.

### Architecture Review

**Decision:** Keep the readiness gate local to `Dashboard.vue`.

Why: the backend already exposes the checklist contract, and this change is strictly first-screen information architecture. Moving readiness logic into a store or new service would add accidental complexity without reducing blast radius.

```text
Dashboard mount / selected org changes
        |
        v
hasAdminDashboardAccess?
   | no
   +--> reset local dashboard data
   |     show no-access guidance
   |
   | yes
   v
loadOrganization()
        |
        v
loadFoundationData()
        |
        v
getChecklist()
   |
   +-- rejects OR missing required keys
   |       -> readiness unavailable
   |       -> schedules = []
   |       -> do not call getScheduleList()
   |
   +-- required key blocked
   |       -> onboarding-only screen
   |       -> schedules = []
   |       -> do not call getScheduleList()
   |
   +-- required keys ready
           -> getScheduleList()
           -> complete dashboard sections
```

**Issue 1: schedule loading must be readiness-first.**

Recommendation: load checklist before schedules and skip schedule fetching unless readiness is complete. This keeps the data boundary honest: an operator who is not ready should not see history or pay the latency cost for history.

**Issue 2: history errors need their own state.**

Recommendation: add `scheduleListLoadFailed` and render `dashboard-history-error`. A failed list request is not the same thing as an empty schedule history.

**Issue 3: duplicate setup surfaces should be removed.**

Recommendation: remove the old foundation-card computed state when adding the onboarding/basic-information sections. Keeping both would create two competing readiness explanations.

### Code Quality Review

- Prefer explicit local constants over clever generic mappers: `REQUIRED_DASHBOARD_READINESS_KEYS` plus a typed metadata map is enough.
- Keep item labels, descriptions, disabled reasons, and route targets in one local typed record so onboarding and basic-information rows do not drift.
- Do not use `checklist.ready` for branching. It remains diagnostic only because its backend meaning is intentionally broader than the dashboard gate.
- Change `loadChecklist()` to return its response so reload order is readable and testable.
- Replace touched `window.$message?.error/info` paths in `Dashboard.vue` with `showError()` or `showWarning()` from `src/utils/message.ts` when editing nearby code.
- Do not introduce a composable unless `Dashboard.vue` becomes materially harder to read after implementation. A one-screen readiness gate is not enough reason for a new abstraction.

### Test Framework Detection

- Unit framework: Vitest with Vue Test Utils (`pnpm test:unit`).
- E2E framework: Playwright (`pnpm test:e2e`).
- Required workflow checks after code changes: `pnpm lint:check` and `pnpm run build`.

### Test Coverage Diagram

```text
CODE PATH COVERAGE
==================
[+] src/views/Dashboard.vue
    |
    +-- reloadDashboardData()
    |   +-- [EXISTING] no admin access -> reset local state
    |   +-- [EXISTING] organization load failure -> show error, no actions
    |   +-- [GAP -> REQUIRED] checklist rejects -> unavailable, no schedule fetch
    |   +-- [GAP -> REQUIRED] checklist missing required key -> unavailable, no schedule fetch
    |   +-- [GAP -> REQUIRED] required key blocked -> onboarding-only, no schedule fetch
    |   +-- [GAP -> REQUIRED] three required keys ready, optional blocked -> load schedules
    |   +-- [GAP -> REQUIRED] schedule list rejects after ready -> history error, not empty state
    |
    +-- readiness computed state
    |   +-- [GAP -> REQUIRED] uses only organization_profile/schedule_foundation/employee_roster
    |   +-- [GAP -> REQUIRED] ignores off_request_policy blocked
    |   +-- [GAP -> REQUIRED] ignores schedule_review blocked
    |   +-- [GAP -> REQUIRED] does not trust checklist.ready for dashboard branching
    |
    +-- handleOpenReadinessItem()
    |   +-- [GAP -> REQUIRED] organization_profile -> org setup route
    |   +-- [GAP -> REQUIRED] schedule_foundation -> Step2 setup query
    |   +-- [GAP -> REQUIRED] employee_roster -> Step3 setup query
    |   +-- [GAP -> REQUIRED] router.push rejection -> Korean error, stays on dashboard
    |
    +-- existing schedule actions
        +-- [EXISTING] handleCreateNew() month modal
        +-- [EXISTING] handleMonthConfirm() duplicate month guard
        +-- [EXISTING] handleViewSchedule() canonical Step5 navigation
        +-- [EXISTING] handleDelete() backend delete boundary

USER FLOW COVERAGE
==================
[+] First dashboard after login
    |
    +-- [GAP -> E2E REQUIRED] incomplete readiness hides create/list/history
    +-- [GAP -> E2E REQUIRED] readiness unavailable hides create/list/history and offers retry
    +-- [GAP -> E2E REQUIRED] complete readiness shows basic info/create/history
    +-- [GAP -> E2E REQUIRED] complete readiness with optional blocked still shows ready dashboard
    |
[+] Onboarding-only flow
    |
    +-- [GAP -> REQUIRED] only first incomplete item is primary/actionable
    +-- [GAP -> REQUIRED] later incomplete items are disabled with visible reason
    +-- [GAP -> REQUIRED] completed prior items remain reviewable
    |
[+] Ready dashboard flow
    |
    +-- [EXISTING + REGRESSION REQUIRED] create schedule from dashboard still opens month modal
    +-- [EXISTING + REGRESSION REQUIRED] existing schedule card still opens canonical Step5
    +-- [GAP -> REQUIRED] schedule-list failure shows retryable history error

SUMMARY:
Existing coverage before implementation: 7/25 relevant paths.
Required additions in this plan: 18 paths, including 4 E2E-worthy user flows.
Critical regressions to guard: create schedule entry, Step5 existing schedule entry, delete/edit actions inside moved history section.
```

### Failure Modes

| Codepath                  | Production failure                                     | Test required            | Error handling required                            | User-visible result                            |
| ------------------------- | ------------------------------------------------------ | ------------------------ | -------------------------------------------------- | ---------------------------------------------- |
| `getChecklist()`          | Edge function timeout or 500                           | Unit + E2E               | `opsReadinessLoadFailed = true`; skip schedules    | Retryable readiness-unavailable state          |
| Required key lookup       | Backend omits one of the three required keys           | Unit                     | Treat as unavailable, not incomplete and not ready | Retryable readiness-unavailable state          |
| Incomplete readiness      | Employee roster blocked but schedules already exist    | Unit + E2E               | Skip `getScheduleList()` and clear stale schedules | Onboarding-only screen                         |
| Optional readiness        | `off_request_policy` blocked after required keys ready | Unit + E2E               | Ignore for dashboard-ready branch                  | Complete dashboard with optional guidance only |
| Schedule list load        | Supabase/network failure after ready                   | Unit                     | `scheduleListLoadFailed = true`                    | History error, not false empty state           |
| Readiness navigation      | `router.push()` rejects                                | Unit                     | `try/catch` with `showError()`                     | Operator stays on dashboard with clear error   |
| Step5 schedule-card entry | Compare request fails                                  | Existing unit regression | Existing `showError()` path remains                | No broken navigation to Step5                  |

No silent critical gap remains after the added schedule-list error state and route failure handling are implemented.

### Performance Review

- Positive change: skipping `getScheduleList()` until readiness is complete removes one unnecessary network request from incomplete and unavailable dashboard states.
- No N+1 pattern is introduced; the dashboard still uses one checklist request and, only when ready, one schedule-list request.
- No caching layer is needed. The readiness state should refresh on mount and selected-organization change because stale setup readiness would expose the wrong first action.
- Memory impact is negligible; the largest retained local collection remains the schedule list already used today.

### Engineering NOT in Scope

- Backend checklist reducer changes: existing contract is sufficient for this UI gate.
- New Pinia store/composable for dashboard readiness: not needed until multiple screens consume the same gate.
- Broad dashboard analytics/KPI work: explicitly out of MVP readiness scope.
- Full mobile workflow redesign: narrow viewport must not break, but mobile optimization remains out of scope.
- Separate TODO entry: no `TODOS.md` exists and all known implementation work is captured in this plan.

### Engineering Plan Review Completion Summary

```text
+====================================================================+
|      ENGINEERING PLAN REVIEW - COMPLETION SUMMARY                  |
+====================================================================+
| Step 0: Scope Challenge    | scope accepted; no new infra/service   |
| Architecture Review        | 3 issues found; all folded into plan   |
| Code Quality Review        | 6 guidance items added                 |
| Test Review                | diagram produced, 18 gaps identified   |
| Performance Review         | 1 positive optimization, 0 blockers    |
| NOT in scope               | written                                |
| What already exists        | written                                |
| TODOS.md updates           | 0 items proposed; no TODOS.md present  |
| Failure modes              | 0 critical silent gaps after updates   |
| Outside voice              | skipped                                |
| Lake Score                 | 3/3 recommendations chose complete fix |
+====================================================================+
```

Engineering plan review status: **DONE**. The plan is implementation-ready after the added readiness-first data flow, schedule history error state, route failure handling, and coverage requirements.

## Writing-Plans Review Addendum

### Writing-Plans Findings

This plan already had the required header, exact target files, clear scope, and strong design/engineering addenda. The gap was execution shape: the original task order could lead an implementer to edit `Dashboard.vue` first, then add tests afterward.

The plan now explicitly requires:

- red tests before production edits
- exact focused commands with expected fail/pass outcomes
- task-level commit checkpoints
- file responsibility boundaries
- final diff review before handoff
- dashboard-start E2E regression coverage after helper fixture changes

### TDD Execution Diagram

```text
Task 0
  write failing dashboard unit tests
        |
        v
  confirm RED with focused Vitest command
        |
        v
Task 1
  implement readiness state + fetch order
        |
        v
  unit tests move from RED to template-only failures or PASS
        |
        v
Task 2-3
  split template + preserve schedule actions
        |
        v
  dashboard unit suite PASS
        |
        v
Task 5
  Playwright readiness fixtures + dashboard-start regressions
        |
        v
Task 6
  lint + build + diff review
```

### Plan-Quality Guardrails for Implementers

- Do not merge Task 4 tests after Task 1 implementation. Tests must exist first.
- Do not batch all changes into one large commit unless the user explicitly asks.
- Do not include `scripts/mcp/supabase.sh` or other unrelated local changes in any commit.
- If the first red test fails for a different reason than expected, stop and fix the test harness before editing production code.
- If `tests/e2e/helpers.ts` does not need a fixture change after implementation, leave it untouched and skip it in the commit.

### Writing-Plans Completion Summary

```text
+====================================================================+
|      WRITING-PLANS REVIEW - COMPLETION SUMMARY                     |
+====================================================================+
| Required header              | already present                      |
| File responsibility map      | added                                |
| TDD order                    | added                                |
| Bite-sized red/green steps   | added Task 0 and per-task commands   |
| Exact commands               | added for unit, E2E, lint, build     |
| Expected outcomes            | added FAIL/PASS expectations         |
| Commit checkpoints           | added                                |
| Final handoff checks         | added Task 6                         |
| Subagent plan reviewer       | not run; user requested doc update   |
+====================================================================+
```

Writing-plans review status: **DONE**. The plan is now executable by a low-context implementer using TDD and small commits.

## Design Plan Review Completion Summary

```text
+====================================================================+
|         DESIGN PLAN REVIEW - COMPLETION SUMMARY                    |
+====================================================================+
| System Audit         | DESIGN.md exists; UI scope is Dashboard.vue |
| Step 0               | 6/10 initial; gaps were states, IA, a11y    |
| Pass 1  (Info Arch)  | 6/10 -> 9/10 after hierarchy/diagrams      |
| Pass 2  (States)     | 5/10 -> 9/10 after state matrix/failure    |
| Pass 3  (Journey)    | 6/10 -> 9/10 after operator flow clarified |
| Pass 4  (AI Slop)    | 6/10 -> 9/10 after app-UI constraints     |
| Pass 5  (Design Sys) | 7/10 -> 9/10 after DESIGN.md alignment    |
| Pass 6  (Responsive) | 4/10 -> 8/10 after viewport/a11y rules    |
| Pass 7  (Decisions)  | 0 unresolved, 8 added to plan             |
+--------------------------------------------------------------------+
| NOT in scope         | written (6 items)                          |
| What already exists  | written                                    |
| TODOS.md updates     | 0 items proposed; all design debt captured |
| Decisions made       | 8 added to plan                            |
| Decisions deferred   | 0                                          |
| Overall design score | 6/10 -> 9/10                               |
+====================================================================+
```

Design plan review status: **DONE**. Plan is design-complete enough to implement. Run `/design-review` after implementation for visual QA against the live screen.

## GSTACK REVIEW REPORT

| Review        | Trigger               | Why                             | Runs | Status | Findings                                                             |
| ------------- | --------------------- | ------------------------------- | ---- | ------ | -------------------------------------------------------------------- |
| CEO Review    | `/plan-ceo-review`    | Scope & strategy                | 0    | -      | -                                                                    |
| Codex Review  | `/codex review`       | Independent 2nd opinion         | 0    | -      | -                                                                    |
| Eng Review    | `/plan-eng-review`    | Architecture & tests (required) | 1    | clean  | 3 architecture issues, 18 test gaps captured, 0 critical silent gaps |
| Design Review | `/plan-design-review` | UI/UX gaps                      | 1    | clean  | score: 6/10 -> 9/10, 8 decisions                                     |

**UNRESOLVED:** 0 decisions.
**VERDICT:** DESIGN + ENG CLEARED for implementation. Run `/design-review` after implementation for visual QA, then run the required lint/build checks before shipping.
