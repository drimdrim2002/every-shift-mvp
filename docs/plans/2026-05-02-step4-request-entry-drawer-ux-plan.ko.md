# Step4 Request Entry Drawer Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 Step4의 좌우 동시 노출 request-entry 화면을 `월간 검토 워크스페이스 우선 + 요청 입력 drawer` 구조로 전환하면서, existing save/restore/version handoff semantics를 그대로 유지한다.

**Architecture:** `src/views/schedule/Step4InitialData.vue`가 Step4의 단일 orchestration owner로 남는다. 요청 입력의 domain draft state는 parent가 계속 소유하고, `Step4RequestComposer.vue`는 right drawer body 전용 UI로 축소한다. `ScheduleGrid.vue`는 계속 `selection + review surface` 역할만 수행하고, drawer open/close 여부에 따라 grid mutation contract는 바뀌지 않는다.

**Tech Stack:** Vue 3, TypeScript, Naive UI (`NDrawer`), Tailwind CSS, Pinia, existing schedule APIs/stores, Vitest, Playwright

---

**문서 상태:** 기존 `docs/plans/2026-05-02-step4-request-entry-ux-plan.ko.md` 위에 얹는 후속 drawer 전환 구현 계획서

**Plan file:** `docs/plans/2026-05-02-step4-request-entry-drawer-ux-plan.ko.md`

**Primary implementation rule:** 새 API, 새 store, 새 calendar/search 라이브러리는 도입하지 않는다.

**Review status:** 2026-05-02 기준 실제 `Step4InitialData.vue` / `Step4RequestComposer.vue` / unit/E2E 테스트 seam을 대조해 drawer 계약과 현재 guard/focus 동작을 반영했다.

## 1. System Audit

- 현재 Step4는 request-entry refactor가 이미 반영되어 있으며, `Step4InitialData.vue`가 draft state, local apply, save/next guard, Step5 handoff, policy summary를 모두 orchestration한다.
- 현재 UI 문제는 기능 부족이 아니라 정보 구조 문제다. `요청 입력 패널`과 `월간 검토 워크스페이스`가 동시에 큰 폭을 차지해 검토 중심 단계라는 성격이 흐려져 있다.
- 이미 구현된 핵심 계약은 유지 대상이다.
  - grid click = selection only
  - `요청 반영` 전에는 local draft만 바뀌고 grid/list/maps는 commit되지 않음
  - page-level `임시 저장` / `다음 단계`는 unapplied draft에서 차단됨
  - save/next는 기존 version/persistence flow를 그대로 사용함
- 이번 변경의 범위는 **레이아웃 + interaction contract**이며, request domain model, persistence shape, policy-check data semantics를 바꾸는 작업이 아니다.
- 현재 draft transition은 `guardDraftTransition()`이 단일 진입점이다. grid 셀 선택, 직원 선택, 기존 요청 편집, 요청 삭제 모두 이 guard를 통과하므로, drawer 전환도 이 보호막을 우회하면 안 된다.
- 현재 search focus는 `focusRequestComposerSearch()`를 통해 mount 직후와 `handleRetryBaseline()` 후에 자동 실행된다. drawer 기본 닫힘 구조로 바꾸면 이 focus 타이밍을 drawer open 시점으로 옮겨야 한다.
- 현재 unit test 환경은 `naive-ui`를 얕게 mock하고 있지만 `NDrawer`는 아직 mock하지 않는다. drawer 도입 시 parent spec mock seam을 먼저 보강하지 않으면 테스트가 UI contract보다 framework 세부 구현에 묶일 수 있다.
- 현재 E2E helper는 Step4 진입 직후 request composer가 보인다고 가정한다. drawer 전환 후 helper 선행 수정 없이 happy path test를 바꾸면 연쇄 실패가 난다.

### Current code hotspots

- `src/views/schedule/Step4InitialData.vue`
  - Step4 layout, grid, page-level actions, draft guard, modal stack, focus orchestration
- `src/components/schedule/request-entry/Step4RequestComposer.vue`
  - 현재 고정 패널 전체 shell + 입력 body + emit contract
- `tests/unit/step4-initial-data.spec.ts`
  - Step4 orchestration regression suite
- `tests/unit/step4-request-composer.spec.ts`
  - request composer child contract suite
- `tests/e2e/helpers.ts`
  - Step4 happy-path helper
- `tests/e2e/schedule-workflow.spec.ts`
  - request-entry Step4 workflow E2E

### Locked decisions

이번 계획에서 아래 결정은 고정값으로 본다.

1. 기본 진입 시 drawer는 닫혀 있다.
2. 검토 워크스페이스가 기본 화면이다.
3. grid 셀 클릭은 drawer를 자동으로 열지 않고 selection만 바꾼다.
4. `요청 반영` 후 drawer는 자동으로 닫히지 않는다.
5. drawer를 닫아도 미반영 draft는 유지된다.
6. hidden draft가 있으면 `요청 입력 다시 열기` CTA와 상태 문구를 노출한다.
7. hidden draft가 있는 동안에는 grid/직원 선택이 draft guard를 우회하지 않는다.

## 2. File Responsibility Proposal

### Modify

- `src/views/schedule/Step4InitialData.vue`
  - review-first layout 재구성
  - `NDrawer` 도입
  - drawer open/close/reopen state와 focus orchestration 추가
  - hidden draft status / reopen CTA 추가
  - 기존 page-level block copy를 drawer contract에 맞게 보정
- `src/components/schedule/request-entry/Step4RequestComposer.vue`
  - outer card shell 제거
  - drawer body 전용 구조로 정리
  - props/emits contract 유지
- `tests/unit/step4-initial-data.spec.ts`
  - drawer contract 회귀 테스트 추가
  - hidden draft / reopen / no auto-open / apply-keeps-open 시나리오 추가
- `tests/unit/step4-request-composer.spec.ts`
  - body-only composer 구조에 맞는 assertion으로 업데이트
- `tests/e2e/helpers.ts`
  - drawer open helper 추가
  - Step4 flow helper를 drawer 기준으로 보정
- `tests/e2e/schedule-workflow.spec.ts`
  - Step4 happy path가 먼저 drawer를 여는 흐름으로 바뀌도록 수정

### Avoid touching unless verification proves necessary

- `src/components/schedule/ScheduleGrid.vue`
- `src/components/schedule/ConstraintSelector.vue`
- `src/components/schedule/request-entry/Step4MonthCalendar.vue`
- `src/components/schedule/request-entry/EmployeeRequestList.vue`

이 파일들은 현재 drawer 전환의 주된 변경 지점이 아니다. verification이 실제 회귀를 드러낼 때만 수정한다.

## 3. Interaction Contract

### 3.1 Entry and primary surface

- Step4 기본 진입 시 사용자는 `월간 검토 워크스페이스`만 본다.
- 검토 워크스페이스 헤더 또는 summary 영역에 `요청 입력 열기` CTA를 둔다.
- CTA는 hidden draft가 있으면 `요청 입력 다시 열기`로 바뀐다.

### 3.2 Drawer behavior

- drawer는 right placement를 사용한다.
- desktop width는 약 `420~460px`로 유지한다.
- narrow viewport에서는 `min(100vw, 460px)` 수준으로 확장해 거의 full-width처럼 동작하게 한다.
- drawer close는 confirmation 없이 허용한다.
- close 시 draft employee/date/note/editing state는 그대로 남는다.
- reopen 시 마지막 draft state를 그대로 복원한다.

### 3.2.1 Drawer state matrix

| 상태                                   | 보이는 것                             | CTA/차단 계약                                             |
| -------------------------------------- | ------------------------------------- | --------------------------------------------------------- |
| drawer closed + clean                  | review workspace only                 | `요청 입력 열기` CTA                                      |
| drawer open + clean                    | review workspace + request drawer     | page-level 저장 허용                                      |
| drawer open + unapplied draft          | review workspace + request drawer     | `임시 저장` / `다음 단계` 차단, drawer 내부 안내 유지     |
| drawer closed + hidden unapplied draft | review workspace + hidden-draft alert | `요청 입력 다시 열기` CTA, `임시 저장` / `다음 단계` 차단 |

### 3.3 Grid behavior

- drawer open/close 여부와 무관하게 grid click은 계속 `selection only`다.
- selection summary는 workspace header에 남는다.
- drawer가 닫혀 있고 미반영 draft가 없다면 grid selection은 계속 동작한다.
- hidden draft가 있는 동안에는 grid selection 역시 기존 `guardDraftTransition()` 계약을 따라야 한다. 즉, 다른 직원/날짜로 selection을 바꾸려는 시도는 reopen 후 `요청 반영` 또는 `선택 초기화` 전까지 차단된다.

### 3.4 Draft visibility and blocking

- hidden draft가 있으면 review workspace 안에서 이를 즉시 볼 수 있어야 한다.
- draft가 drawer 안에 보이든 hidden 상태이든 `임시 저장` / `다음 단계`는 계속 차단된다.
- hidden draft 상태에서는 page-level 차단 문구와 hidden-draft alert가 같은 행동을 가리켜야 한다. 둘 다 `drawer를 다시 열어 반영 또는 선택 초기화를 진행`하라는 동일한 next action을 보여줘야 한다.
- 차단 문구는 drawer를 다시 열어야 한다는 행동을 명확히 알려야 한다.
  - 예: `미반영 요청이 있습니다. 요청 입력을 다시 열어 반영 또는 선택 초기화를 진행해 주세요.`

### 3.5 Apply and focus

- `요청 반영` 후 drawer는 유지된다.
- 같은 직원 또는 다음 직원에 대해 연속 입력을 이어갈 수 있도록 focus를 다시 검색 input으로 보내는 흐름을 유지한다.
- baseline load 후 자동 focus도 drawer open 시점으로 이동한다. 기본 진입 상태가 닫힘이므로 mount 시 즉시 focus는 하지 않는다.
- `handleRetryBaseline()`도 동일한 규칙을 따른다. retry 후 drawer가 닫혀 있으면 focus를 강제로 이동하지 않고, retry 시 drawer가 열린 상태였다면 reopen 없이 검색 input focus만 복구한다.

## 4. Implementation Plan

### Task 0: Freeze the drawer contract with tests first

**Files:**

- Modify: `tests/unit/step4-initial-data.spec.ts`
- Modify: `tests/e2e/helpers.ts`
- Verify: `src/views/schedule/Step4InitialData.vue`

- [ ] **Step 1: Add failing Step4 drawer regression tests**
      Add explicit tests for:
  - default Step4 mount renders the review workspace while the drawer is closed
  - clicking `요청 입력 열기` opens the drawer
  - grid `cell-select` does not auto-open the drawer
  - closing the drawer preserves the draft and shows a hidden-draft status with reopen CTA
  - applying a request keeps the drawer open
- [ ] **Step 2: Update the Step4 unit test harness for `NDrawer`**
      Extend the `naive-ui` mock with an `NDrawer` stub that:
  - accepts `show`, `placement`, and `width` props
  - renders its slot only when `show` is truthy
  - exposes a deterministic close trigger such as `data-test="drawer-close"`
- [ ] **Step 3: Extend the `Step4RequestComposer` stub**
      Keep the existing intent emit buttons and add a no-op `focusSearchInput` expose so parent tests can assert drawer open/focus orchestration without depending on real child rendering.
- [ ] **Step 4: Add a small E2E helper seam first**
      Introduce an `openStep4RequestDrawer(page)` helper in `tests/e2e/helpers.ts` before changing the spec so the drawer-open action has one canonical selector.
- [ ] **Step 5: Run the Step4 suite to confirm isolated failures**
      Run: `pnpm exec vitest run tests/unit/step4-initial-data.spec.ts`
      Expected: new drawer assertions fail; existing restore/version/localStorage regressions remain green.
- [ ] **Step 6: Commit**

```bash
git add tests/unit/step4-initial-data.spec.ts tests/e2e/helpers.ts
git commit -m "test: lock step4 drawer transition contract"
```

### Task 1: Recompose Step4 into a review-first layout with parent-owned drawer state

**Files:**

- Modify: `src/views/schedule/Step4InitialData.vue`
- Modify: `tests/unit/step4-initial-data.spec.ts`

- [ ] **Step 1: Add local drawer UI state and derived status in the parent**
      Introduce parent-owned state/helpers:
  - `isRequestDrawerOpen`
  - `hasHiddenUnappliedDraft`
  - `requestDrawerCtaLabel`
  - `requestDrawerStatusCopy`
- [ ] **Step 2: Replace the current two-column layout**
      Remove the always-visible left composer column. Expand the review workspace into the primary card and add:
  - `요청 입력 열기` / `요청 입력 다시 열기` CTA
  - hidden draft status chip or alert
  - drawer-aware page guidance copy
- [ ] **Step 3: Mount `NDrawer` in the parent**
      Render `Step4RequestComposer` inside `NDrawer` and keep all existing props/emits wired through the parent.
- [ ] **Step 4: Move focus orchestration behind drawer state**
      Replace unconditional mount/retry focus with:
  - `handleOpenRequestDrawer()` -> `await nextTick()` 후 `focusSearchInput()`
  - `applyDraftRequest()` 성공 후 drawer가 열려 있으면 search input refocus
  - `handleRetryBaseline()` 후 drawer가 열려 있을 때만 refocus
- [ ] **Step 5: Keep existing orchestration semantics intact**
      Preserve:
  - `guardDraftTransition()` gating
  - `restoreData()` precedence
  - `canPersistStep4`
  - `handleSave()`
  - `handleNext()`
  - policy summary and rejection display
- [ ] **Step 6: Re-run the parent suite**
      Run: `pnpm exec vitest run tests/unit/step4-initial-data.spec.ts`
      Expected: drawer state and hidden-draft assertions pass without breaking older Step4 regressions.
- [ ] **Step 7: Commit**

```bash
git add src/views/schedule/Step4InitialData.vue tests/unit/step4-initial-data.spec.ts
git commit -m "feat: convert step4 to review-first drawer layout"
```

### Task 2: Convert the request composer into a drawer-body component

**Files:**

- Modify: `src/components/schedule/request-entry/Step4RequestComposer.vue`
- Modify: `tests/unit/step4-request-composer.spec.ts`
- Verify: `src/views/schedule/Step4InitialData.vue`

- [ ] **Step 1: Add failing child-contract assertions**
      Cover:
  - body-only structure still renders search, request type, selection mode, note, apply/reset, request list
  - apply/reset/edit/delete emits remain unchanged
  - disabled reason copy still renders without the old outer card shell
  - existing `data-test` hooks for search/apply/reset/employee option remain stable
- [ ] **Step 2: Run the composer suite**
      Run: `pnpm exec vitest run tests/unit/step4-request-composer.spec.ts`
      Expected: fails because the current component still includes fixed-panel shell assumptions.
- [ ] **Step 3: Remove panel shell responsibilities from the child**
      Move title/description/card chrome to the parent drawer container and keep the child as content-only UI.
- [ ] **Step 4: Preserve focus exposure and selectors**
      Keep `focusSearchInput()` exposed and do not rename the current `data-test` hooks that E2E already relies on.
- [ ] **Step 5: Re-run composer and parent tests**
      Run:
  - `pnpm exec vitest run tests/unit/step4-request-composer.spec.ts`
  - `pnpm exec vitest run tests/unit/step4-initial-data.spec.ts`
    Expected: body-only contract passes and parent drawer flow stays green.
- [ ] **Step 6: Commit**

```bash
git add src/components/schedule/request-entry/Step4RequestComposer.vue tests/unit/step4-request-composer.spec.ts src/views/schedule/Step4InitialData.vue
git commit -m "refactor: scope step4 request composer to drawer body"
```

### Task 3: Update drawer-specific E2E and final interaction coverage

**Files:**

- Modify: `tests/e2e/helpers.ts`
- Modify: `tests/e2e/schedule-workflow.spec.ts`
- Verify: `src/views/schedule/Step4InitialData.vue`

- [ ] **Step 1: Finalize the explicit drawer-open helper**
      Add `openStep4RequestDrawer(page)` and make `searchEmployee()` / `completeStep4InitialData()` call it instead of assuming the composer is visible on first paint.
- [ ] **Step 2: Rewrite the Step4 happy path around drawer flow**
      Cover:
  - default review-first screen
  - opening the drawer
  - searching employee
  - selecting request dates
  - applying request while the drawer stays open
  - saving and moving to Step5
- [ ] **Step 3: Add one hidden-draft regression scenario if the fixture allows it**
      Close the drawer before apply and assert the page-level blocked status plus reopen CTA. If the existing E2E setup is too brittle for this branch, keep it as a unit-only assertion and document that choice in the final implementation note.
- [ ] **Step 4: Run the targeted E2E spec**
      Run: `pnpm exec playwright test tests/e2e/schedule-workflow.spec.ts`
      Expected: Step4 workflow passes with the drawer-first UX.
- [ ] **Step 5: Commit**

```bash
git add tests/e2e/helpers.ts tests/e2e/schedule-workflow.spec.ts
git commit -m "test: update step4 e2e flow for request drawer"
```

### Task 4: Final verification, lint, and manual QA pass

**Files:**

- Modify only if verification exposes issues in already touched files

- [ ] **Step 1: Run focused unit tests**
      Run:
  - `pnpm exec vitest run tests/unit/step4-request-composer.spec.ts`
  - `pnpm exec vitest run tests/unit/step4-initial-data.spec.ts`
    Expected: all Step4 drawer regressions pass.
- [ ] **Step 2: Run the Step4 E2E workflow**
      Run: `pnpm exec playwright test tests/e2e/schedule-workflow.spec.ts`
      Expected: request drawer happy path passes end-to-end.
- [ ] **Step 3: Run lint**
      Run: `pnpm lint:check`
      Expected: zero ESLint errors.
- [ ] **Step 4: Fix and re-run lint if needed**
      Run: `pnpm lint:fix`
      Expected: only touched-file formatting or lint issues change.
- [ ] **Step 5: Re-run lint after fixes**
      Run: `pnpm lint:check`
      Expected: zero ESLint errors.
- [ ] **Step 6: Manual QA pass**
      Verify:
  - default entry shows the full review workspace width
  - drawer open/close animation feels intentional, not abrupt
  - grid selection remains stable while drawer is closed
  - hidden draft state explains why save/next are blocked
  - hidden draft state does not allow grid/employee selection to bypass the existing draft guard
  - reopen restores employee/date/note state
  - `요청 반영` keeps the drawer open
  - baseline retry does not steal focus when the drawer stays closed
- [ ] **Step 7: Commit**

```bash
git add src/views/schedule/Step4InitialData.vue src/components/schedule/request-entry/Step4RequestComposer.vue tests/unit/step4-initial-data.spec.ts tests/unit/step4-request-composer.spec.ts tests/e2e/helpers.ts tests/e2e/schedule-workflow.spec.ts
git commit -m "feat: ship step4 request entry drawer workflow"
```

## 5. Verification Plan

### 5.1 Required automated commands

| Layer                   | Command                                                          | When          | Expected                                        |
| ----------------------- | ---------------------------------------------------------------- | ------------- | ----------------------------------------------- |
| Step4 parent regression | `pnpm exec vitest run tests/unit/step4-initial-data.spec.ts`     | Tasks 0, 1, 4 | drawer contract + legacy orchestration all pass |
| Composer contract       | `pnpm exec vitest run tests/unit/step4-request-composer.spec.ts` | Tasks 2, 4    | body-only UI contract passes                    |
| Step4 E2E               | `pnpm exec playwright test tests/e2e/schedule-workflow.spec.ts`  | Tasks 3, 4    | drawer-first happy path passes                  |
| Lint                    | `pnpm lint:check`                                                | Task 4        | zero ESLint errors                              |

### 5.2 Required code path coverage

- default Step4 mount with drawer closed
- open drawer CTA
- close drawer without losing draft
- hidden draft status + reopen CTA
- grid selection while drawer remains closed
- hidden draft does not bypass `guardDraftTransition()`
- apply keeps drawer open
- mount does not auto-focus search while the drawer is closed
- retry re-focuses search only when the drawer is already open
- save/next blocked while hidden draft exists
- save/next flow after local apply remains unchanged
- Step5 handoff semantics remain unchanged

### 5.3 Manual QA checklist

- `요청 입력 열기`가 검토 워크스페이스의 primary companion action으로 보인다.
- drawer가 열려도 뒤의 월간 검토 맥락이 계속 읽힌다.
- drawer를 닫았을 때 사용자가 “입력이 사라졌다”고 느끼지 않도록 hidden draft status가 충분히 명확하다.
- drawer를 다시 열었을 때 마지막 draft가 그대로 복원된다.
- keyboard 사용자 기준으로 drawer open 직후 search input focus가 보장된다.
- drawer가 닫힌 상태의 retry나 페이지 진입이 불필요하게 focus를 빼앗지 않는다.

## 6. Acceptance Criteria

- 관리자는 Step4 기본 진입 시 더 넓어진 월간 검토 워크스페이스를 본다.
- 관리자는 필요할 때만 요청 입력 drawer를 열 수 있다.
- drawer가 닫힌 상태의 grid 클릭은 selection만 바꾸고 drawer를 자동으로 열지 않는다.
- 미반영 draft가 있는 상태에서 drawer를 닫아도 draft는 유지되며, reopen CTA와 차단 문구가 즉시 보인다.
- hidden draft가 있는 동안에는 다른 grid/직원 selection이 draft guard를 우회하지 않는다.
- `요청 반영` 후 drawer는 계속 열린 상태로 남는다.
- drawer 기본 닫힘 진입에서는 search input auto focus가 발생하지 않고, drawer open 시점에만 focus가 간다.
- 기존 Step4 save/restore/version/Step5 handoff semantics는 바뀌지 않는다.
- `pnpm exec vitest run tests/unit/step4-initial-data.spec.ts`가 통과한다.
- `pnpm exec vitest run tests/unit/step4-request-composer.spec.ts`가 통과한다.
- `pnpm exec playwright test tests/e2e/schedule-workflow.spec.ts`가 통과한다.
- `pnpm lint:check`가 통과한다.
