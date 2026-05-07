# Step4 Off 요청 그리드 Shortcut Drawer 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Step4에서 큰 근무표 셀을 직접 Off로 토글하지 않고, 셀 클릭을 `요청 입력` Drawer로 들어가는 shortcut으로 만든다.

**Architecture:** `src/views/schedule/Step4InitialData.vue`가 계속 Step4 orchestration owner로 남는다. `ScheduleGrid`는 검토/선택 surface로 유지하고, `Step4RequestComposer`가 Off 요청 입력과 확정의 authority가 된다. 그리드 셀 클릭은 근무자/날짜 draft를 채우고 Drawer를 여는 shortcut이며, 실제 반영은 기존 `요청 반영` 버튼으로만 수행한다.

**Tech Stack:** Vue 3, TypeScript, Naive UI `NDrawer`, Tailwind CSS, Pinia, existing schedule APIs/stores, Vitest, Playwright

---

## Summary

- 큰 근무표에서 직접 Off를 입력하는 방식은 재도입하지 않는다.
- 그리드 셀 클릭은 `근무자 + 날짜`를 요청 입력 Drawer에 자동 세팅하고 Drawer를 연다.
- 사용자는 Drawer 안에서 메모/날짜를 확인한 뒤 `요청 반영`을 눌러 Off 요청을 확정한다.
- 이 방식은 버튼 중심 입력의 정확성과 검색 가능성을 유지하면서, 기존 캘린더 클릭 선호 사용자에게 빠른 진입 shortcut을 제공한다.

## Product Decision

### 최종 UX 결정

- **허용:** 그리드 셀 클릭으로 요청 입력 Drawer 열기
- **허용:** Drawer 내부 월간 캘린더에서 날짜 선택
- **불허:** 그리드 셀 클릭으로 즉시 Off 토글
- **불허:** `ScheduleGrid`를 다시 직접 편집 surface로 되돌리기

### 이유

- Step4의 핵심 작업은 “한 칸을 빠르게 바꾸는 것”보다 “여러 근무자의 Off 요청을 정확히 모아 반영하는 것”이다.
- 큰 그리드 직접 토글은 행과 열을 동시에 맞춰 봐야 해서 오입력 가능성이 높다.
- Drawer 입력은 근무자 검색, 다중 근무자 선택, 여러 날짜 선택, 메모, 기존 요청 목록을 한 흐름에 묶는다.
- 그리드 셀 클릭 shortcut은 사용자의 기존 습관을 살리되, 확정 전 확인 단계를 유지한다.

## Implementation Changes

### Step4 parent orchestration

- [ ] `src/views/schedule/Step4InitialData.vue`의 `handleGridCellSelect()`를 수정한다.
  - `guardDraftTransition()` 통과 후 기존처럼 `selectedEmployeeIds`, `draftSelectedDates`, `draftNote`, `editingRequestKey`를 채운다.
  - 그 다음 `handleOpenRequestDrawer()`를 호출해 요청 입력 Drawer를 자동으로 연다.
  - focus는 기존 `focusRequestComposerSearch()` 경로를 재사용한다.

- [ ] 빈 셀 클릭과 기존 요청 셀 클릭을 구분한다.
  - 빈 셀 클릭: 새 Off 요청 입력 의도로 보고 Drawer를 열며, `요청 반영` 전까지 `constraints`는 변경하지 않는다.
  - 기존 Off 요청 셀 클릭: 기존 요청 수정/확인 의도로 보고 note와 editing key를 hydrate한다.
  - 기존 요청 셀 클릭만으로는 실제 변경 전까지 불필요한 dirty 상태를 만들지 않는다.

- [ ] hidden draft 보호 동작을 유지한다.
  - 미반영 draft가 있는 상태에서 다른 셀을 클릭하면 기존 draft를 덮어쓰지 않는다.
  - 대신 Drawer를 다시 열고 기존 차단 문구를 보여준다.
  - 사용자는 `요청 반영` 또는 `선택 초기화`로 현재 draft를 마무리해야 한다.

### Grid and selector contract

- [ ] `ScheduleGrid`는 계속 `planning-interaction-mode="select"`로 사용한다.
- [ ] `ConstraintSelector`의 `toggle` 모드는 Step4에서 다시 켜지 않는다.
- [ ] `@cell-select` emit contract를 유지한다.
- [ ] `ScheduleGrid.vue`와 `ConstraintSelector.vue`는 가능하면 수정하지 않는다. 구현 중 직접 토글이 필요해 보이면 중단하고 계획을 재검토한다.

### Drawer copy and state

- [ ] Drawer가 grid shortcut으로 열린 경우 사용자가 다음 행동을 이해할 수 있게 안내 문구를 명확히 한다.
  - 예: `선택한 셀을 Off 요청으로 반영하려면 요청 반영을 눌러 주세요.`
- [ ] hidden draft alert는 현재 방향을 유지하되, “요청 입력을 다시 열어 마무리해야 한다”는 행동이 명확해야 한다.
- [ ] 기존 `request-drawer-toggle`, `step4-request-drawer`, `hidden-request-draft-alert`, `request-drawer-close-button` test selector는 유지한다.

## Data Flow

```text
ScheduleGrid cell click
  -> Step4InitialData.handleGridCellSelect()
  -> guardDraftTransition()
  -> parent draft state update
  -> handleOpenRequestDrawer()
  -> Step4RequestComposer receives selected employee/date/note props
  -> user clicks 요청 반영
  -> existing applyDraftRequest() persistence branch
```

- 새 backend API, DB schema, store, route query는 추가하지 않는다.
- `요청 반영` 이후 저장/persistence 동작은 기존 `applyDraftRequest()` 분기를 그대로 따른다.
- page-level `다음 단계`, edit-off mode, existing result handoff, policy recheck semantics는 바꾸지 않는다.

## Test Plan

### Unit tests

- [ ] `tests/unit/step4-initial-data.spec.ts`
  - 기존 “grid cell selection does not auto-open drawer” 테스트를 “grid cell selection auto-opens drawer”로 바꾼다.
  - 빈 셀 클릭 시 Drawer가 열리고 근무자/날짜가 채워지는지 확인한다.
  - 빈 셀 클릭 직후 `constraints`가 아직 바뀌지 않는지 확인한다.
  - 빈 셀 클릭 후 Drawer를 닫으면 hidden draft alert가 보이고 다음 단계가 차단되는지 확인한다.
  - 기존 Off 요청 셀 클릭 시 note/editing state가 hydrate되는지 확인한다.
  - hidden draft 상태에서 다른 셀 클릭 시 기존 draft를 덮어쓰지 않고 Drawer만 다시 열리는지 확인한다.
  - `요청 반영` 후 Drawer는 열린 상태로 유지되고 기존 저장 mock 호출이 유지되는지 확인한다.

### E2E tests

- [ ] `tests/e2e/schedule-workflow.spec.ts` 또는 Step4 helper에 셀 클릭으로 Drawer가 열리는 smoke scenario를 추가한다.
- [ ] 기존 버튼으로 Drawer를 여는 흐름은 fallback 진입점으로 유지한다.

### Verification commands

```bash
pnpm exec vitest run tests/unit/step4-initial-data.spec.ts
pnpm lint:check
```

필요 시:

```bash
pnpm test:e2e -- tests/e2e/schedule-workflow.spec.ts
```

## Acceptance Criteria

- 그리드 셀 클릭 시 요청 입력 Drawer가 자동으로 열린다.
- Drawer에는 클릭한 근무자와 날짜가 선택된 상태로 표시된다.
- 그리드 셀 클릭만으로 Off 요청이 즉시 저장되거나 `constraints`에 반영되지 않는다.
- Off 요청 반영은 기존처럼 `요청 반영` 버튼을 통해서만 확정된다.
- 직접 Off 토글 UX는 Step4에 다시 노출되지 않는다.
- 미반영 draft 보호, hidden draft alert, page-level 차단 동작이 유지된다.
- 기존 Step4 저장, edit-off, Step5 handoff, policy recheck 흐름이 유지된다.
- `pnpm lint:check`가 통과한다.

## Assumptions

- 사용자가 선택한 최종 UX는 “셀 클릭 시 Drawer 자동 열기”다.
- 큰 그리드에서 직접 Off 토글은 허용하지 않는다.
- Drawer 내부 월간 캘린더 클릭은 계속 허용한다. 이는 요청 입력 패널 안의 날짜 선택 기능이므로 큰 그리드 직접 편집과 다르다.
- 빈 셀 클릭은 입력 의도로 간주해 미반영 draft 보호를 적용한다.
- 기존 요청 셀 클릭은 확인/수정 의도로 간주해 실제 변경 전까지는 page-level block을 만들지 않는다.
