# Step5 Version Delete And Month Delete UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Step5 삭제 UX를 `비교안 1개 삭제`와 `이번 달 근무표 삭제`로 명확히 분리하고, 각 삭제가 Step4/Step5 상태를 예측 가능하게 복구하도록 만든다.

**Architecture:** 카드 우측 상단 삭제는 active compare version 하나만 archive 처리한다. 하단 `이번 달 근무표 삭제`는 choice dialog를 열고, `생성 결과만 삭제`는 현재 preview version만 draft baseline으로 되돌리며 나머지 active version을 archive 처리한다. `이번 달 전체 삭제`는 기존 month container delete boundary를 그대로 사용한다.

**Tech Stack:** Vue 3, TypeScript, Vite, Naive UI, Pinia, Supabase Edge Functions, Vitest.

---

## Summary

- `현재 안 초기화` 버튼은 제거한다.
- `이번 달 새로 시작` 버튼은 제거한다.
- 비교 후보 카드 우측 상단에 `이 안 삭제` 액션을 추가하되, `focusedVersionId` 카드에는 렌더링하지 않는다.
- 카드 삭제는 version 1개만 archive 처리한다.
- 하단에는 `이번 달 근무표 삭제` 버튼 하나만 남기고, 클릭 후 사용자가 두 범위 중 하나를 선택한다.
  - `생성 결과만 삭제`: 현재 preview version의 Off 요청은 유지하고, 생성 결과와 비교 이력만 정리한 뒤 Step4로 이동한다.
  - `이번 달 전체 삭제`: scheduleId 기준으로 해당 월 근무표 전체를 삭제하고 홈으로 이동한다.

## Product Behavior

### 1. 비교안 1개 삭제

- 삭제 버튼은 active version 카드에서만 보인다.
- 다음 카드에는 삭제 버튼을 렌더링하지 않는다.
  - 현재 자세히 보는 카드 (`focusedVersionId`)
  - finalized 카드
  - solving 중인 카드
  - `lockedVersionId`로 잠긴 카드
- 마지막 active version 1개만 남아 있으면 삭제할 수 없다. 이 경우 사용자는 하단 `이번 달 근무표 삭제` 흐름을 사용해야 한다.
- 사용자가 삭제 대상이 아닌 현재 preview version에서 unsaved cell 변경을 가지고 있으면 카드 삭제를 막고 안내한다. 이유는 delete 이후 compare/review 재수화가 현재 편집 중인 preview state를 덮어쓸 수 있기 때문이다.
- 삭제 대상이 현재 `selectedVersionId`이지만 `focusedVersionId`는 다른 경우는 허용한다. 이때 frontend는 현재 preview version을 replacement selected version으로 함께 보내고, backend가 selection repair를 atomic하게 처리한다.

### 2. 생성 결과만 삭제

- 하단 `이번 달 근무표 삭제` 클릭 시 choice dialog를 연다.
- `생성 결과만 삭제`는 현재 `previewVersionId`를 source version으로 사용한다.
- backend는 source version만 active로 남기고 나머지 active version을 모두 archive 처리한다.
- source version에서는 다음만 reset한다.
  - current month assignment rows 삭제
  - `status = 'draft'`
  - `latest_evaluation_id = null`
  - `active_solver_execution_id = null`
  - `current_revision = 0`
  - `manual_edit_count = 0`
  - preference resolution fields를 unresolved 상태로 초기화
- source version의 previous-month carry rows는 유지한다. Step3/Step4의 rolling-history window를 깨면 안 되기 때문이다.
- reset 이후 compare response는 정확히 1개의 active draft version만 반환해야 하며, Step4에서 `hasExecutedVersionHistory(compare) === false`가 되어야 한다.

### 3. 이번 달 전체 삭제

- 기존 `deletePhase2ScheduleMonth` 경로를 그대로 사용한다.
- 이 흐름만 schedule container와 month-scoped data 전체를 제거한다.
- Off 요청도 함께 삭제된다.

## Scope And Contract Decisions

- 이 작업은 Step5 review/delete UX와 그에 필요한 phase2-schedule mutation boundary만 다룬다.
- employee/org/shift CRUD는 추가하지 않는다.
- 실제 solver 연동은 추가하지 않는다.
- user-facing copy는 모두 Korean으로 유지한다.
- archive reason은 기존 `month_reset`만으로는 부족하므로 SQL constraint를 `month_reset`, `version_delete`, `generated_results_reset`까지 허용하도록 확장한다.
- version delete API는 frontend가 selection repair 의도를 명시할 수 있어야 하므로 request body를 가진다.
- generated-only reset은 새 version을 만들지 않고 current preview version row를 draft baseline으로 재사용한다. 그래야 Step4가 같은 version context에서 Off 요청을 복원할 수 있고, 이전 month carry rows도 유지하기 쉽다.
- route query에 삭제된 version id가 남아 있더라도 Step5 hydration이 canonical route로 정리해야 한다. ad hoc local array mutation만으로 끝내지 않는다.

## File Responsibility Map

- `migrations/20260501_step5_delete_actions.sql`
  - archive reason constraint 확장
  - version delete atomic RPC 추가
  - generated-results reset atomic RPC 추가
- `supabase/functions/phase2-schedule/contracts.ts`
  - route name, request/response type, parser 추가
- `supabase/functions/phase2-schedule/index.ts`
  - 새 delete routes wire-up
- `supabase/functions/phase2-schedule/repository.ts`
  - RPC 호출, conflict remap, compare response refresh
- `src/types/schedule.ts`
  - delete request/response types
- `src/api/schedule.ts`
  - frontend API wrappers
- `src/components/schedule/review/VersionCandidateShelf.vue`
  - delete button UI와 emit
- `src/views/schedule/Step5Result.vue`
  - old reset CTA 제거
  - delete choice dialog
  - version delete / generated-results delete handlers
- `tests/unit/version-candidate-shelf.spec.ts`
  - delete button visibility/emits
- `tests/unit/step5-result.spec.ts`
  - Step5 destructive UX regression coverage
- `tests/unit/phase2-schedule-contracts.spec.ts`
  - route/parser coverage
- `tests/unit/phase2-schedule-api.spec.ts`
  - wrapper URL/body coverage
- `tests/unit/phase2-schedule-write-repository.spec.ts`
  - repository RPC wiring + conflict coverage

## API And Data Changes

### 1. Delete One Version

- Add route in `supabase/functions/phase2-schedule/contracts.ts`:
  - `POST /schedule-versions/:versionId/delete`
  - route name: `deleteVersion`

- Request type:

```ts
export interface DeleteScheduleVersionRequest {
  replacementSelectedVersionId?: string;
}
```

- Response type:

```ts
export type DeleteScheduleVersionResponse = ScheduleCompareResponse;
```

- Backend behavior:
  - version이 같은 organization/schedule에 속하는지 검증한다.
  - finalized month면 `already_finalized`로 거부한다.
  - target version이 archived면 `version_archived`로 거부한다.
  - target version이나 sibling version solving state가 delete를 막는 경우 `version_locked_for_solving`으로 거부한다.
  - active version이 1개뿐이면 `last_version`로 거부한다.
  - target이 현재 `selected_version_id`이면 `replacementSelectedVersionId`를 요구한다.
  - replacement는 같은 schedule의 다른 active version이어야 한다.
  - delete는 hard delete가 아니라 `archived_at`, `archived_by`, `archive_reason = 'version_delete'`를 기록한다.
  - target이 selected였다면 같은 RPC 안에서 `schedules.selected_version_id`를 replacement로 교체한다.
  - refreshed compare response를 반환한다.

### 2. Delete Generated Results Only

- Add route in `supabase/functions/phase2-schedule/contracts.ts`:
  - `POST /schedules/:scheduleId/delete-generated-results`
  - route name: `deleteGeneratedResults`

- Request type:

```ts
export interface DeleteGeneratedResultsRequest {
  sourceVersionId: string;
}
```

- Response type:

```ts
export type DeleteGeneratedResultsResponse = ScheduleCompareResponse;
```

- Backend behavior:
  - schedule이 같은 organization에 속하는지 검증한다.
  - `sourceVersionId`가 같은 schedule의 active version인지 검증한다.
  - finalized month면 `already_finalized`로 거부한다.
  - 어떤 active version이라도 solving 중이면 `version_locked_for_solving`으로 거부한다.
  - source version을 제외한 active non-finalized versions를 모두 `generated_results_reset` reason으로 archive 처리한다.
  - source version은 row를 재사용하고 다음을 reset한다:
    - current month assignment rows만 삭제
    - `status = 'draft'`
    - `latest_evaluation_id = null`
    - `active_solver_execution_id = null`
    - `current_revision = 0`
    - `manual_edit_count = 0`
  - source version preference rows의 `resolution_status`, `resolved_shift_id`, `resolved_at`를 unresolved state로 초기화한다.
  - `schedules.selected_version_id = sourceVersionId`로 맞춘다.
  - `schedules.status`, `solver_execution_id`, `hard_score`, `soft_score`를 reset한다.
  - refreshed compare response는 source version 1개만 active로 보여야 한다.

### 3. Keep Full Month Delete

- Keep existing route:
  - `POST /schedules/delete-month`
- Keep existing frontend wrapper:
  - `deletePhase2ScheduleMonth`
- This remains the only flow that removes the schedule container and all month-scoped data, including Off requests.

## Frontend Changes

### VersionCandidateShelf

Modify `src/components/schedule/review/VersionCandidateShelf.vue`.

- Add emit:

```ts
(event: 'delete-version', versionId: string): void
```

- Add `canDeleteVersion(version)` guard:
  - `version.id !== focusedVersionId`
  - `version.id !== lockedVersionId`
  - `!version.isFinalized`
  - `version.status !== 'solving'`
  - `!version.activeSolverExecutionId`
- Render compact icon-only delete button in the top-right corner of the card.
- Required labels:
  - `aria-label="이 안 삭제"`
  - tooltip text: `이 안 삭제`
  - data-test: `delete-version-${version.id}`
- Delete click must stop propagation and emit only `delete-version`.

### Step5Result

Modify `src/views/schedule/Step5Result.vue`.

- Remove:
  - `현재 안 초기화` button and `handleResetCurrentVersion`
  - `이번 달 새로 시작` button and `handleResetActiveMonthFlow`
  - `resetPhase2ScheduleActiveFlow` import usage
  - `deleteThisMonthVersionAssignments` direct destructive reset usage from Step5 delete CTA
- Keep one lower destructive button:
  - label: `이번 달 근무표 삭제`
  - data-test: `delete-month-schedule-button`
- On click, open a warning dialog with two explicit actions:
  - `생성 결과만 삭제`
  - `이번 달 전체 삭제`
- `생성 결과만 삭제` handler:
  - Calls `deletePhase2ScheduleGeneratedResults(scheduleId, { sourceVersionId: previewVersionId })`.
  - Stops solver polling and assignment refresh.
  - Clears result-only local state:
    - `currentScheduleAssignments`
    - `changedCells`
    - `originalCurrentAssignments`
    - realtime flags
    - review cache that no longer matches the reset compare state
  - Clears temp preference storage only after DB-backed preferences are authoritative again.
  - Updates compare matrix and selected/preview version IDs from response.
  - Shows success message: `생성 결과를 삭제했습니다. Step4에서 요청을 다시 확인해주세요.`
  - Routes to Step4.
- `이번 달 전체 삭제` handler:
  - Reuses existing `deletePhase2ScheduleMonth` flow.
  - Clears scheduleId and review state.
  - Shows success message: `이번 달 근무표를 삭제했습니다.`
  - Routes to home.
- `delete-version` handler:
  - If `changedCells.size > 0`, block with info copy and do not call the API.
  - Confirm with:
    - `이 안을 삭제할까요? 삭제한 안의 생성 결과와 비교 이력은 사라집니다. 현재 자세히 보는 안은 유지됩니다.`
  - Calls:

```ts
deletePhase2ScheduleVersion(versionId, {
  replacementSelectedVersionId:
    versionId === selectedVersionId ? (previewVersionId ?? undefined) : undefined,
});
```

- After success, call `hub.hydrate()` to rebuild compare/review state and let the existing canonical route flow remove deleted version ids from query state.
- Ensure deleted version id disappears from compare ids and route query.
- Shows success message: `안을 삭제했습니다.`

## Tests

### Unit Tests

- `tests/unit/version-candidate-shelf.spec.ts`
  - focused card does not render `delete-version-*`
  - finalized/solving/locked cards do not expose delete action
  - non-focused card renders delete button
  - delete button emits `delete-version`

- `tests/unit/step5-result.spec.ts`
  - `현재 안 초기화` is no longer rendered
  - `이번 달 새로 시작` is no longer rendered
  - `이번 달 근무표 삭제` opens a choice dialog
  - `생성 결과만 삭제` calls generated-results API with `previewVersionId`
  - `이번 달 전체 삭제` calls existing delete-month API
  - card delete confirms and calls version delete API
  - deleting selected compare card sends `replacementSelectedVersionId = previewVersionId`
  - focused card delete action is unavailable
  - dirty preview changes block compare-card delete before the API call

- `tests/unit/phase2-schedule-contracts.spec.ts`
  - route matching for `POST /schedule-versions/:versionId/delete`
  - route matching for `POST /schedules/:scheduleId/delete-generated-results`
  - parser validation for `replacementSelectedVersionId`
  - parser validation for `sourceVersionId`

- `tests/unit/phase2-schedule-api.spec.ts`
  - wrapper calls correct version delete URL and JSON body
  - wrapper calls correct generated-results URL and body

- `tests/unit/phase2-schedule-write-repository.spec.ts`
  - version archive success returns refreshed compare response
  - deleting the selected version repairs `selected_version_id`
  - deleting the last active version fails with `last_version`
  - finalized conflict maps to `already_finalized`
  - solving conflict maps to `version_locked_for_solving`
  - generated-results reset archives sibling versions only
  - generated-results reset keeps source version active and draft
  - generated-results reset deletes only current-month assignment rows for the kept version
  - generated-results reset clears preference resolution state

## Verification Commands

Run focused tests first:

```bash
pnpm test:unit -- tests/unit/version-candidate-shelf.spec.ts tests/unit/step5-result.spec.ts tests/unit/phase2-schedule-contracts.spec.ts tests/unit/phase2-schedule-api.spec.ts tests/unit/phase2-schedule-write-repository.spec.ts
```

Run lint after implementation:

```bash
pnpm lint:check
```

## Implementation Tasks

### Task 1: SQL Atomic Delete Boundaries

**Files:**

- Create: `migrations/20260501_step5_delete_actions.sql`
- Modify: `supabase/functions/phase2-schedule/repository.ts`
- Test: `tests/unit/phase2-schedule-write-repository.spec.ts`

- [ ] **Step 1: Add failing repository tests**
  - cover `deleteVersion`
  - cover `deleteGeneratedResults`
  - cover selected-version replacement and `last_version`
- [ ] **Step 2: Run repository tests to confirm failure**

```bash
pnpm test:unit -- tests/unit/phase2-schedule-write-repository.spec.ts
```

Expected: FAIL because the new RPCs and conflict remaps do not exist yet.

- [ ] **Step 3: Create `migrations/20260501_step5_delete_actions.sql`**
  - widen `archive_reason` constraint
  - add `archive_schedule_version_atomic`
  - add `reset_schedule_generated_results_atomic`
- [ ] **Step 4: Add repository wrappers and conflict remaps**
  - `deleteVersion(client, auth, versionId, request)`
  - `deleteGeneratedResults(client, auth, scheduleId, request)`
- [ ] **Step 5: Re-run repository tests**

```bash
pnpm test:unit -- tests/unit/phase2-schedule-write-repository.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add migrations/20260501_step5_delete_actions.sql supabase/functions/phase2-schedule/repository.ts tests/unit/phase2-schedule-write-repository.spec.ts
git commit -m "feat: add atomic step5 delete boundaries"
```

### Task 2: Edge Contracts And Frontend API Wrappers

**Files:**

- Modify: `supabase/functions/phase2-schedule/contracts.ts`
- Modify: `supabase/functions/phase2-schedule/index.ts`
- Modify: `src/types/schedule.ts`
- Modify: `src/api/schedule.ts`
- Test: `tests/unit/phase2-schedule-contracts.spec.ts`
- Test: `tests/unit/phase2-schedule-api.spec.ts`

- [ ] **Step 1: Add failing contract and API wrapper tests**
  - new route names
  - new request parsers
  - wrapper URL/body assertions
- [ ] **Step 2: Run the focused tests to confirm failure**

```bash
pnpm test:unit -- tests/unit/phase2-schedule-contracts.spec.ts tests/unit/phase2-schedule-api.spec.ts
```

Expected: FAIL because routes and wrappers are missing.

- [ ] **Step 3: Update shared contracts**
  - extend `RouteName`
  - add request/response types
  - add parser functions
- [ ] **Step 4: Wire the new routes in the Edge Function index**
- [ ] **Step 5: Add frontend wrapper functions**

```ts
export async function deletePhase2ScheduleVersion(
  versionId: string,
  request: DeleteScheduleVersionRequest = {}
): Promise<DeleteScheduleVersionResponse>;

export async function deletePhase2ScheduleGeneratedResults(
  scheduleId: string,
  request: DeleteGeneratedResultsRequest
): Promise<DeleteGeneratedResultsResponse>;
```

- [ ] **Step 6: Re-run the focused tests**

```bash
pnpm test:unit -- tests/unit/phase2-schedule-contracts.spec.ts tests/unit/phase2-schedule-api.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/phase2-schedule/contracts.ts supabase/functions/phase2-schedule/index.ts src/types/schedule.ts src/api/schedule.ts tests/unit/phase2-schedule-contracts.spec.ts tests/unit/phase2-schedule-api.spec.ts
git commit -m "feat: expose step5 delete contracts"
```

### Task 3: Version Card Delete UI

**Files:**

- Modify: `src/components/schedule/review/VersionCandidateShelf.vue`
- Test: `tests/unit/version-candidate-shelf.spec.ts`

- [ ] **Step 1: Add failing component tests**
  - focused card hides delete
  - eligible card emits delete
  - locked/finalized/solving cards hide delete
- [ ] **Step 2: Run the component test to confirm failure**

```bash
pnpm test:unit -- tests/unit/version-candidate-shelf.spec.ts
```

Expected: FAIL because the delete affordance does not exist.

- [ ] **Step 3: Add the `delete-version` emit and top-right delete button**
- [ ] **Step 4: Add Korean tooltip and aria-label**
- [ ] **Step 5: Re-run the component test**

```bash
pnpm test:unit -- tests/unit/version-candidate-shelf.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/schedule/review/VersionCandidateShelf.vue tests/unit/version-candidate-shelf.spec.ts
git commit -m "feat: add step5 compare-card delete action"
```

### Task 4: Step5 Delete Flow Consolidation

**Files:**

- Modify: `src/views/schedule/Step5Result.vue`
- Test: `tests/unit/step5-result.spec.ts`

- [ ] **Step 1: Add failing Step5 tests**
  - old reset buttons removed
  - delete choice dialog rendered
  - generated-results path calls the new API
  - selected-card delete sends replacement selected version id
  - dirty preview changes block compare-card delete
- [ ] **Step 2: Run the Step5 test to confirm failure**

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts
```

Expected: FAIL because Step5 still renders the old reset CTA set.

- [ ] **Step 3: Remove the old reset handlers and CTA rendering**
- [ ] **Step 4: Implement the new choice dialog and generated-results delete path**
- [ ] **Step 5: Implement compare-card delete guard and API call**
- [ ] **Step 6: Refresh compare/review state without leaving deleted version ids in route query**
- [ ] **Step 7: Re-run the Step5 test**

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/views/schedule/Step5Result.vue tests/unit/step5-result.spec.ts
git commit -m "feat: consolidate step5 delete UX"
```

### Task 5: Final Verification

- [ ] **Step 1: Run all focused tests**

```bash
pnpm test:unit -- tests/unit/version-candidate-shelf.spec.ts tests/unit/step5-result.spec.ts tests/unit/phase2-schedule-contracts.spec.ts tests/unit/phase2-schedule-api.spec.ts tests/unit/phase2-schedule-write-repository.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run lint**

```bash
pnpm lint:check
```

Expected: PASS with no ESLint errors.

- [ ] **Step 3: Manual QA**
  - preview card에는 `이 안 삭제`가 보이지 않는다.
  - non-focused compare card에는 `이 안 삭제`가 보인다.
  - selected지만 non-focused인 카드를 삭제하면 기준안이 현재 preview로 자연스럽게 이동한다.
  - `생성 결과만 삭제` 후 Step4에 돌아가면 Off 요청은 남아 있고 실행 이력 gate는 다시 열리지 않는다.
  - `이번 달 전체 삭제` 후 홈으로 이동하고 동일 month 재진입 시 새 schedule로 시작한다.

## Implementation Notes

- Naive UI는 기존처럼 discrete dialog/message 경로를 사용한다.
- `window.$message`를 직접 템플릿에서 호출하지 않는다.
- `src/utils/message.ts` 또는 setup-context-safe wrapper를 사용한다.
- Step5 delete flows는 current preview assignment grid와 compare shelf를 동시에 건드리므로, local state reset 순서를 테스트로 고정해야 한다.
- compare-card delete는 dirty preview changes를 먼저 차단하므로, 성공 후 `hub.hydrate()`가 preview assignment를 다시 읽어도 사용자 편집 손실이 발생하지 않는 전제를 유지한다.
