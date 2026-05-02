# Step4 Off 요청 수정 새 근무표안 생성 플로우 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Step4에서 `요청 수정해서 새 근무표안 만들기`를 선택한 뒤 수정한 Off 요청이 기존 결과 버전에 저장되지 않고, 새 `schedule_version`의 입력값으로 저장되어 AI Solver를 실행할 수 있게 한다.

**Architecture:** 기존 월별 `schedules` 컨테이너는 유지하고, Off 요청이 실질적으로 바뀐 생성 후보는 새 `schedule_versions`로 만든다. `intent=edit-off`는 기존 결과를 직접 수정하는 모드가 아니라, 새 근무표안 생성을 위한 staged edit mode로 고정한다. 새 버전이 생성되기 전까지 수정된 Off 요청은 로컬 state와 기존 temp storage에만 유지하고, DB 저장은 새 `createdVersionId`가 생긴 뒤 수행한다.

**Tech Stack:** Vue 3, TypeScript, Vite, Tailwind CSS, Naive UI, Pinia, Supabase schedule APIs, Vitest, Playwright

---

## Summary

- `intent=edit-off` 모드에서는 `결과 확인으로 이동`을 절대 노출하지 않는다.
- 이 모드의 Off 요청 반영/임시 저장은 기존 `previewVersionId`에 `schedule_preferences`를 쓰지 않는다.
- 사용자가 실제 Off 요청을 바꾸고 `생성 시작으로 이동`을 누르면 새 근무표안 이름 modal을 연다.
- 이름 확정 후 새 `schedule_version`을 만들고, 수정된 Off 요청과 `inputSnapshot`을 새 버전에 저장한다.
- Step5는 기존 실행 이력이 있어도 방금 만든 새 draft version에서는 AI Solver를 시작할 수 있어야 한다.

## Implementation Changes

### Step4 edit-off mode

- [ ] `src/views/schedule/Step4InitialData.vue`에 `isExistingResultEditMode` 계열 computed를 추가한다.
  - 조건: `route.query.intent === 'edit-off'`이고 `baselineState.hasExecutedHistory === true`.
  - 이 모드는 “기존 결과 수정”이 아니라 “새 근무표안 입력 staged edit”로 간주한다.
- [ ] `nextStepLabel`을 수정한다.
  - edit-off mode에서는 변경 여부와 무관하게 `결과 확인으로 이동`을 반환하지 않는다.
  - Off 요청 변경이 있으면 `생성 시작으로 이동`을 반환한다.
  - Off 요청 변경이 아직 없으면 같은 CTA를 유지하되 click 시 안내 메시지로 막는다.
- [ ] `applyDraftRequest()`의 persistence 분기를 나눈다.
  - 일반 모드: 기존처럼 `persistStep4PreferenceMaps()`를 호출한다.
  - edit-off mode: `commitPreferenceMaps()`만 호출하고 `saveScheduleVersionPreferences()` / `recheckPhase2ScheduleVersion()`는 호출하지 않는다.
  - 성공 메시지는 `요청이 새 근무표안 입력에 반영되었습니다.`처럼 DB 저장으로 오해하지 않게 한다.
- [ ] `handleSave()`도 edit-off mode에서는 기존 preview version에 저장하지 않는다.
  - staged maps를 local state/temp storage에 유지한다.
  - 성공 메시지는 `새 근무표안 입력으로 임시 반영되었습니다.`로 둔다.
- [ ] edit-off mode에서는 `baselinePreferenceSnapshot`을 기존 preview version 원본으로 유지한다.
  - apply/save 후 baseline snapshot을 현재 수정값으로 갱신하지 않는다.
  - 그래야 `hasStep4Changes`와 `inputDiffSummary.changedOffRequests`가 사라지지 않는다.
- [ ] `handleNext()`를 edit-off mode 우선 분기로 보강한다.
  - 변경 없음: 새 버전을 만들지 않고 `Off 요청을 수정한 뒤 새 근무표안을 생성할 수 있습니다.`를 표시한다.
  - constraints 변경 있음: 항상 `openVersionNameModal('new_re_solve', context)`를 호출한다.
  - note만 변경된 경우는 새 Solver 입력에는 영향이 작지만, 사용자 의도는 “새 근무표안 만들기”이므로 새 버전 생성으로 처리한다.

### New version handoff

- [ ] `createAndRouteReSolveVersion()`의 기존 새 버전 생성 흐름을 재사용한다.
  - `createPhase2ScheduleVersion()` 호출 시 `baseVersionId`는 기존 `baseline.previewVersionId`로 둔다.
  - `sourceType`은 `re_solve`로 둔다.
  - `inputDiffSummary`는 원본 baseline snapshot과 staged current snapshot을 비교해 만든다.
  - `inputSnapshot`은 staged constraints를 넘겨 생성한다.
- [ ] `createResponse.createdVersionId`가 생긴 뒤에만 `saveScheduleVersionPreferences()`를 호출한다.
  - 저장 대상은 반드시 새 `createdVersionId`다.
  - 기존 `baseline.previewVersionId`에는 저장하지 않는다.
- [ ] 새 버전으로 route할 때 `autoStart`를 켠다.
  - 새 버전은 current-month assignments가 없어야 하므로 Step5에서 Solver 시작 CTA가 가능해야 한다.
  - compare query는 새 버전과 기존 selected/default version을 비교할 수 있게 기존 흐름을 유지한다.

### Step5 autoStart guard

- [ ] `src/views/schedule/Step5Result.vue`의 `consumeRouteAutoStart()` 차단 조건을 target preview version 기준으로 조정한다.
  - 제거 또는 완화할 조건: `hasExecutedHistory.value`.
  - 유지할 조건: 현재 preview version이 mutable하지 않음, 현재 preview version에 current-month assignments가 있음, 다른 version이 solving 중임.
- [ ] 방금 만든 새 draft version은 같은 월에 기존 결과가 있어도 `autoStart=1`로 Solver가 시작되어야 한다.

## Test Plan

### Unit tests

- [ ] `tests/unit/step4-initial-data.spec.ts`
  - edit-off mode에서 `요청 수정해서 새 근무표안 만들기` 선택 후 기존 Off 요청을 불러오는지 확인한다.
  - edit-off mode에서 Off 요청 apply 시 `saveScheduleVersionPreferences()`와 `recheckPhase2ScheduleVersion()`가 호출되지 않는지 확인한다.
  - edit-off mode에서 apply 후에도 `결과 확인으로 이동`이 나타나지 않는지 확인한다.
  - edit-off mode에서 변경 없이 다음 CTA를 누르면 새 version을 만들지 않고 안내 메시지를 표시하는지 확인한다.
  - edit-off mode에서 Off 요청 변경 후 이름 확정 시 `createPhase2ScheduleVersion()`이 호출되고, `saveScheduleVersionPreferences()`가 `createdVersionId`로 호출되는지 확인한다.
  - 기존 일반 모드 테스트는 유지한다. 특히 일반 모드의 request apply는 계속 active preview version에 저장되어야 한다.

- [ ] `tests/unit/step5-result.spec.ts`
  - 기존 실행 이력이 있어도 preview version이 새 draft이고 current-month assignments가 없으면 `autoStart=1`이 Solver를 시작하는지 확인한다.
  - 다른 version이 solving 중이면 autoStart가 시작되지 않는 기존 보호 동작을 유지한다.
  - 현재 preview version에 current-month assignments가 있으면 autoStart가 시작되지 않는 기존 보호 동작을 유지한다.

### Optional E2E

- [ ] `tests/e2e/step4-existing-result-flow.spec.ts`
  - skip 상태를 유지할지 확인한 뒤, 실행 가능한 fixture가 있으면 edit-off flow를 보강한다.
  - `요청 수정해서 새 근무표안 만들기` -> Off 요청 수정 -> `생성 시작으로 이동` -> 이름 입력 -> Step5 이동 -> Solver 시작 가능 상태를 확인한다.

### Commands

```bash
pnpm test:unit -- tests/unit/step4-initial-data.spec.ts tests/unit/step5-result.spec.ts
pnpm lint:check
```

필요 시:

```bash
pnpm test:e2e -- tests/e2e/step4-existing-result-flow.spec.ts
```

## Acceptance Criteria

- edit-off mode에서 Off 요청을 반영해도 기존 결과 version의 `schedule_preferences`가 바뀌지 않는다.
- edit-off mode에서는 `결과 확인으로 이동` 버튼이 보이지 않는다.
- Off 요청 변경 후 새 이름을 확정하면 새 `schedule_version`이 생성된다.
- 수정된 Off 요청은 새 `schedule_version_id` 기준으로 저장된다.
- 새 version의 `inputSnapshot`은 수정된 Off 요청을 포함한다.
- Step5 이동 후 새 version에서 AI Solver를 실행할 수 있다.
- 기존 일반 Step4 first-run / non-edit flow는 유지된다.
- `pnpm lint:check`가 통과한다.

## Assumptions

- 사용자가 말한 “새로운 schedule”은 새 월 container가 아니라 기존 월 container 안의 새 `schedule_version`을 의미한다.
- edit-off mode의 apply/save는 DB 저장 완료가 아니라 새 근무표안 입력에 staged 반영된 상태다.
- 새로고침 대비는 기존 scoped temp preferences storage를 사용한다.
- 변경 없는 edit-off mode에서는 같은 입력의 중복 version을 만들지 않는다.
- 신규 DB migration이나 API endpoint는 만들지 않는다.
