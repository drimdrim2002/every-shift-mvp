# Step4/Step5 진입 및 버전 관리 계획

> **에이전트 작업자용:** 필수 하위 스킬: 이 계획은 작업 단위로 구현할 때 `superpowers:subagent-driven-development`(권장) 또는 `superpowers:executing-plans`를 사용한다. 단계 추적에는 체크박스(`- [ ]`) 문법을 사용한다.

**목표:** Step4/Step5 진입 동작을 수정하여 편집 또는 풀이 실행 전에 기존 실행 이력을 확인하고, 일정 버전을 새로 만들거나 다시 실행하기 전에 명시적인 버전 이름 입력과 덮어쓰기 확인을 요구한다.

**아키텍처:** `schedules`는 월 단위 컨테이너로 유지하고, `schedule_versions`는 생성된 각 후보 결과의 단일 진실 공급원으로 유지한다. Step4는 Off 요청 편집과 버전 전달 결정을 담당한다. Step5는 결과 검토, 비교, 그리고 표시할 기존 결과가 없을 때만 solver 실행을 담당한다. 공유 resolver 헬퍼는 어떤 버전을 실행 이력으로 볼지, 어떤 버전을 기본 포커스 또는 비교 대상으로 삼을지 결정한다.

**기술 스택:** Vue 3, TypeScript, Vite, Naive UI, Pinia, Supabase Edge Functions, Vitest.

---

## 요약

Step4와 Step5는 모두 계속 진행하기 전에 기존 schedule/version 이력을 확인해야 한다. 기존 실행 이력이 있으면 Step4는 사용자에게 Off 요청을 수정할지, 결과를 검토할지 묻는다. Step5는 solver를 즉시 실행하지 않고 기존 결과를 보여준다. Step4에서 풀이 또는 재풀이 의도로 Step5로 이동할 때는 사용자가 버전 이름을 입력해야 한다. 해당 이름이 이미 존재하면 사용자는 기존 버전을 덮어쓸지, 다른 이름을 입력할지 선택해야 한다.

## 제품 동작

- Step4 진입:
  - 로드 시 기존 schedule ensure/compare 경로를 호출하고 버전들을 검사한다.
  - 실행 이력이 없으면 Step4에 머물며 현재처럼 Off 입력을 허용한다.
  - 실행 이력이 있으면 일반 편집 전에 모달을 표시한다:
    - `Off 수정 후 다시 실행`: Step4에 머물고, 선택된/현재 버전의 Off 요청을 로드한 뒤 편집을 허용한다.
    - `결과 확인`: 기본 결과 포커스로 Step5로 이동한다.
  - Step4를 열었다는 이유만으로 다른 버전을 자동 생성하지 않는다.

- Step5 진입:
  - compare/review 상태를 먼저 hydrate한다.
  - 실행 이력이 있으면 결과/검토 허브를 보여주고 solver를 자동 시작하지 않는다.
  - 실행된 버전이 여러 개 있으면 기본 비교는 선택된 버전과 가장 최근의 다른 실행 후보를 보여줘야 한다.
  - 실행 이력이 없고 포커스된 버전이 이번 달 assignment가 없는 draft라면 현재 첫 실행 동작을 유지하고 `autoStart=1`로 풀이 시작을 허용한다.

- 버전 이름:
  - Step4는 이동이 버전을 생성, 덮어쓰기, 실행하는 경우 Step5로 이동하기 전에 버전 이름을 요구해야 한다.
  - 첫 실행 기본값: `V1`.
  - 재실행 기본값: `V{latestVersionNo + 1}`.
  - 비어 있거나 공백만 있는 이름은 유효하지 않다.
  - 이름은 `trim().toLowerCase()` 후 비교하므로 `V1`, `v1`, `v1`은 중복으로 본다.
  - archived version도 이 계획에서 별도 rename/archive-name release workflow를 추가하기 전까지는 이름을 계속 점유한다.
  - 입력한 이름이 기존 버전과 일치하면 확인 선택지를 표시한다:
    - 해당 기존 버전을 덮어쓰기; 또는
    - 이름 입력으로 돌아가기.
  - 확정된 버전이나 현재 풀이 중인 버전은 덮어쓸 수 없다.

## 범위 및 계약 결정

- 작업 범위는 Step4/Step5 schedule-generation flow 안으로 제한한다.
- Step4 전달과 Step5 검토 화면 밖의 version CRUD는 추가하지 않는다.
- 실제 solver 연동은 추가하지 않는다. 기존 mocked solver path와 현재 Step5 solver orchestration을 유지한다.
- 명시적 Step4 편집 의도는 route query `intent=edit-off`로 추가한다. Step4는 현재 진입에 이 intent가 없으면 기존 이력 모달을 표시해야 한다.
- "실행 이력"은 schedule container 존재가 아니라 version 단위 solver 또는 review activity를 뜻한다.
- "덮어쓰기"는 대상 version row를 다시 draft/run에 재사용한다는 뜻이다. 기존 `schedule_evaluations` row는 append-only로 남기되, 덮어쓴 version은 `latest_evaluation_id`를 비워 예전 evaluation이 현재 review artifact로 노출되지 않게 한다.
- schedule month가 finalized 상태이거나, 대상 version이 finalized/archived 상태이거나, 대상 version 또는 같은 schedule의 다른 version이 현재 solving 중이면 overwrite를 허용하지 않는다.
- `selected_version_id`를 authoritative state로 유지한다. query parameter는 preview/focus만 바꿀 수 있고 finalization target을 선택하면 안 된다.

## 파일 책임 지도

- `src/utils/scheduleVersionResolver.ts`: 실행 이력 감지, 기본 focus, 기본 compare ID, Step5 route canonicalization을 담당하는 pure resolver 함수.
- `src/views/schedule/Step4InitialData.vue`: Step4 진입 모달, edit intent 처리, version name modal, 중복 이름 확인, Step4-to-Step5 routing.
- `src/views/schedule/Step5Result.vue`: review hub hydrate 이후 auto-start guard.
- `src/composables/useScheduleReviewHub.ts`: view 중복을 줄이는 편이 낫다면 compare/focus 기본값 중앙화.
- `src/types/schedule.ts`, `src/api/schedule.ts`: create-version의 frontend request/response contract.
- `supabase/functions/phase2-schedule/contracts.ts`: Edge Function parser와 response contract.
- `supabase/functions/phase2-schedule/repository.ts`: 중복 이름 enforcement, overwrite 검증, write operation.
- `migrations/20260501_step4_step5_version_management.sql`: normalized unique version name, create-version RPC input snapshot 지원, atomic overwrite helper가 필요할 경우의 SQL authority 변경.

## 구현 계획

### Task 0: 버전 이름과 입력 스냅샷에 대한 SQL 권한층 추가

**파일:**

- 생성: `migrations/20260501_step4_step5_version_management.sql`
- 테스트: `tests/unit/phase2-schedule-write-repository.spec.ts`

- [ ] 다음 repository 실패 테스트를 작성한다:
  - 중복 이름은 `version_name_exists`로 거부된다.
  - 중복 검사는 trim/case-insensitive 기준이다.
  - create-version은 `inputSnapshot`을 SQL write path로 전달한다.
  - overwrite는 finalized, solving, archived 상태 또는 다른 version solving 상태에서 거부된다.
- [ ] 테스트를 실행해 실패를 확인한다:

```bash
pnpm test:unit -- tests/unit/phase2-schedule-write-repository.spec.ts
```

예상: 현재 Edge repository/RPC path에는 normalized name contract가 없고 `inputSnapshot`을 저장하지 않으므로 FAIL.

- [ ] migration 변경을 추가한다:
  - active version name에 대해 `lower(btrim(name))`을 사용하는 partial unique index 추가
  - `create_schedule_version_atomic`이 `p_input_snapshot jsonb DEFAULT '{}'::jsonb`를 받도록 수정
  - `schedule_versions` insert에 `input_snapshot` 저장
  - 새 RPC argument list에 맞춰 `REVOKE`, `GRANT` signature 수정
- [ ] 새 unique index conflict를 `409 version_name_exists`로 remap하는 repository 처리를 추가한다.
- [ ] 대상 repository 테스트를 다시 실행한다.

예상: duplicate-name과 input-snapshot contract 테스트 PASS.

### Task 1: 공유 버전 이력 헬퍼 추가

**파일:**

- 수정: `src/utils/scheduleVersionResolver.ts`
- 테스트: `tests/unit/schedule-version-resolver.spec.ts`

- [ ] no-history, single-history, multiple-history, selected/finalized 우선순위, active solving, draft-with-assignments-not-counted 케이스에 대한 실패 테스트를 작성한다.
- [ ] resolver 테스트를 실행해 실패를 확인한다:

```bash
pnpm test:unit -- tests/unit/schedule-version-resolver.spec.ts
```

예상: 새 helper 함수가 아직 없으므로 FAIL.

- [ ] 다음 중 하나라도 있는 버전을 감지하는 `hasExecutedVersionHistory(compare)`를 추가한다:
  - `draft`가 아닌 상태
  - `latestEvaluationId`
  - `activeSolverExecutionId`
  - 비교 지표 또는 finalization gate
- [ ] `getDefaultExecutedFocusVersionId(compare)`를 추가한다:
  - 확정된 버전 우선
  - 선택된 실행 버전 두 번째
  - `versionNo` 기준 최신 실행 버전 세 번째
  - 기존 기본 fallback 마지막
- [ ] `getDefaultCompareVersionIds(compare, focusVersionId)`를 추가한다:
  - 확정된 월은 비교 없음
  - 포커스 버전과 가장 최근의 다른 실행 후보를 포함
  - 최대 2개 ID
- [ ] route query가 compare target을 지정하지 않았을 때 executed-history 기본값을 사용하도록 `resolveStep5VersionState()`를 업데이트한다.
- [ ] resolver 테스트를 다시 실행한다.

예상: PASS.

### Task 2: 기존 이력 선택으로 Step4 진입 제어

**파일:**

- 수정: `src/views/schedule/Step4InitialData.vue`
- 테스트: `tests/unit/step4-initial-data.spec.ts`

- [ ] 다음 Step4 실패 테스트를 작성한다:
  - 일반 진입에서 기존 이력이 있으면 선택 모달을 연다.
  - `?intent=edit-off`가 있으면 모달을 표시하지 않는다.
  - `Off 수정 후 다시 실행`은 Step4를 편집 가능 상태로 유지하고 version preferences를 로드한다.
  - `결과 확인`은 기본 focus/compare ID로 Step5에 라우팅한다.
  - Step4를 여는 것만으로 `createPhase2ScheduleVersion()`을 호출하지 않는다.
- [ ] Step4 테스트를 실행해 실패를 확인한다:

```bash
pnpm test:unit -- tests/unit/step4-initial-data.spec.ts
```

예상: Step4에 executed-history gate가 아직 없으므로 FAIL.

- [ ] baseline 상태를 `hasExecutedHistory`, `versions`, resolver에서 받은 기본 Step5 focus/compare ID로 확장한다.
- [ ] 실행 이력이 있고 사용자가 명시적 편집 의도로 진입하지 않았을 때 Step4 진입마다 한 번 표시되는 Naive UI modal/dialog를 추가한다.
- [ ] route intent 처리를 추가한다:
  - `intent=edit-off`는 사용자가 명시적으로 편집/재실행을 선택했다는 뜻이다.
  - 그 외 값은 무시하고 모달 bypass에 사용하지 않는다.
  - 사용자가 편집을 선택하면 새로고침 동작이 안정적이도록 route를 `intent=edit-off`로 replace한다.
- [ ] `Off 수정 후 다시 실행`은 모달을 닫고 Step4를 편집 가능 상태로 유지하도록 구현한다.
- [ ] `결과 확인`은 기본 focus/compare ID를 사용해 Step5로 라우팅하도록 구현한다.
- [ ] 기존 Step4 preference 복원 순서를 유지한다: version preferences, selected version preferences, legacy schedule preferences, local storage fallback.
- [ ] Step4 테스트를 다시 실행한다.

예상: PASS.

### Task 3: Step4 전달에 버전 이름 및 덮어쓰기 확인 추가

**파일:**

- 수정: `src/views/schedule/Step4InitialData.vue`
- 수정: `src/types/schedule.ts`
- 수정: `src/api/schedule.ts`
- 테스트: `tests/unit/step4-initial-data.spec.ts`
- 테스트: `tests/unit/phase2-schedule-api.spec.ts`

- [ ] 다음 frontend 실패 테스트를 작성한다:
  - 첫 실행 기본값은 `V1`이다.
  - 재실행 기본값은 `V{latestVersionNo + 1}`이다.
  - 비어 있거나 공백만 있는 이름은 API 호출 전에 차단된다.
  - 중복 이름은 `trim().toLowerCase()` 기준으로 감지된다.
  - duplicate finalized/solving/archived version은 overwrite 대상으로 선택할 수 없다.
  - overwrite는 `creationMode: 'overwrite'`와 `overwriteVersionId`를 전송한다.
  - 새 version은 `creationMode: 'new'`를 전송한다.
  - note-only 변경은 version을 생성하지 않고 preferences만 저장한다.
- [ ] frontend 테스트를 실행해 실패를 확인한다:

```bash
pnpm test:unit -- tests/unit/step4-initial-data.spec.ts tests/unit/phase2-schedule-api.spec.ts
```

예상: name/overwrite UI와 request field가 아직 없으므로 FAIL.

- [ ] 버전 이름 모달용 local state를 추가한다:
  - `pendingVersionName`
  - `isVersionNameModalOpen`
  - `duplicateVersionCandidate`
  - `pendingHandoffAction`
- [ ] `pendingHandoffAction`을 명시적으로 모델링한다:
  - `first_run`
  - `new_re_solve`
  - `overwrite_re_solve`
- [ ] 버전을 생성하거나 재실행하기 전에 모달로 비어 있지 않은 이름을 수집하도록 요구한다.
- [ ] 첫 실행 기본값으로 `V1`, 새 재실행 기본값으로 `V{latestVersionNo + 1}`을 사용한다.
- [ ] 이름이 기존 버전과 중복되면 create를 즉시 호출하지 않고 덮어쓰기 확인을 표시한다.
- [ ] 새 버전 생성 시 `createPhase2ScheduleVersion()`을 다음 값으로 호출한다:
  - `name`
  - `creationMode: 'new'`
  - `inputSnapshot`
  - `inputDiffSummary`
- [ ] 덮어쓰기 시 `createPhase2ScheduleVersion()`을 다음 값으로 호출한다:
  - `name`
  - `creationMode: 'overwrite'`
  - `overwriteVersionId`
  - `inputSnapshot`
  - `inputDiffSummary`
- [ ] 사용자가 재실행에 대해 명시적으로 덮어쓰기를 선택하지 않는 한, note-only 변경은 새 버전을 만들지 않고 현재 버전에 유지한다.
- [ ] frontend 테스트를 다시 실행한다.

예상: PASS.

### Task 4: Edge Function Create-Version 계약 및 Repository Write 정렬

**파일:**

- 수정: `supabase/functions/phase2-schedule/contracts.ts`
- 수정: `supabase/functions/phase2-schedule/repository.ts`
- 수정: route handling에 새 parsed field가 필요할 경우에만 `supabase/functions/phase2-schedule/index.ts`
- 테스트: `tests/unit/phase2-schedule-contracts.spec.ts`
- 테스트: `tests/unit/phase2-schedule-write-repository.spec.ts`

- [ ] 다음 contract 실패 테스트를 작성한다:
  - trimmed `name`은 필수이고 최대 길이는 100자다.
  - `creationMode`는 필수이며 `new` 또는 `overwrite`만 허용한다.
  - `overwriteVersionId`는 overwrite일 때만 필수다.
  - `baseVersionId`는 새 version 생성 시 계속 필수다.
  - `inputSnapshot`은 JSON object로 허용되며 기본값은 `{}`이다.
- [ ] contract/repository 테스트를 실행해 실패를 확인한다:

```bash
pnpm test:unit -- tests/unit/phase2-schedule-contracts.spec.ts tests/unit/phase2-schedule-write-repository.spec.ts
```

예상: Edge contract가 아직 nullable `name`을 허용하고 `creationMode`가 없으므로 FAIL.

- [ ] `CreateVersionRequest`에 다음을 포함하도록 업데이트한다:
  - `baseVersionId?: string`
  - `name: string`
  - `creationMode: 'new' | 'overwrite'`
  - `overwriteVersionId?: string`
  - `inputSnapshot?: ScheduleInputSnapshot`
- [ ] parser validation을 업데이트한다:
  - name trim
  - name 길이 1-100 요구
  - `creationMode`가 `overwrite`일 때 overwrite version UUID 검증
- [ ] `CreateVersionResponse`에 `wasCreated: boolean`을 포함하도록 업데이트한다.
- [ ] `creationMode: 'new'`에서는 같은 schedule 안의 중복 버전 이름을 `409 version_name_exists`로 거부한다.
- [ ] `creationMode: 'overwrite'`에서는 대상 버전이 같은 schedule에 속하며 finalized, solving, archived 상태가 아닌지 검증한다.
- [ ] overwrite에서는 같은 schedule의 어떤 version이라도 `activeSolvingVersionId`가 있으면 요청을 거부한다.
- [ ] 새 버전과 덮어쓴 버전에 대해 `inputSnapshot`을 `schedule_versions.input_snapshot`에 저장한다.
- [ ] 덮어쓰기 시 하나의 transaction 또는 row lock으로 보호되는 repository sequence 안에서 다음을 수행한다:
  - 덮어쓴 version의 이번 달 assignments 삭제
  - `active_solver_execution_id` reset
  - `latest_evaluation_id` clear
  - status를 `draft`로 설정
  - `current_revision`을 `0`으로 reset
  - `manual_edit_count`를 `0`으로 reset
  - `name`, `input_diff_summary`, `input_snapshot` 업데이트
  - 기존 `schedule_evaluations` row는 append-only로 남기되 `latest_evaluation_id`를 비워 현재 review에서 분리
  - `wasCreated: false`와 `createdVersionId = overwriteVersionId` 반환
- [ ] 순수 새 버전 생성에는 가능한 한 기존 create-version atomic RPC 경로를 유지한다.
- [ ] contract/repository 테스트를 다시 실행한다.

예상: PASS.

### Task 5: 결과가 있을 때 Step5 자동 실행 방지

**파일:**

- 수정: `src/views/schedule/Step5Result.vue`
- 기본 compare 상태를 중앙화하는 편이 더 적절하면 수정: `src/composables/useScheduleReviewHub.ts`
- 테스트: `tests/unit/step5-result.spec.ts`
- 테스트: `tests/unit/use-schedule-review-hub.spec.ts`

- [ ] 다음 Step5 실패 테스트를 작성한다:
  - 실행 이력이 하나라도 있으면 `autoStart=1`을 무시한다.
  - 진짜 첫 실행에서는 `autoStart=1`이 여전히 solver를 시작한다.
  - 다른 version이 현재 solving 중이면 `autoStart=1`을 무시한다.
  - 실행된 version이 여러 개 있으면 기본값은 selected + 가장 최근의 다른 실행 후보이다.
  - finalized month는 기본 compare ID가 없다.
- [ ] Step5/review hub 테스트를 실행해 실패를 확인한다:

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts tests/unit/use-schedule-review-hub.spec.ts
```

예상: 현재 `consumeRouteAutoStart()`는 mutability와 이번 달 assignments만 확인하므로 FAIL.

- [ ] `hub.hydrate()` 이후 compare 상태에서 실행 이력이 존재하는지 판단한다.
- [ ] `consumeRouteAutoStart()`에서 `autoStart`를 제거하거나 canonicalize하되, 실행 이력이 있으면 `handleStartSolver()`를 호출하지 않는다.
- [ ] 다음 조건을 모두 만족할 때만 auto-start를 유지한다:
  - 실행 이력이 없음
  - 포커스된 버전이 수정 가능한 draft임
  - 이번 달 assignments가 없음
  - 풀이 중인 다른 버전이 없음
- [ ] 기본 compare ID를 선택된 버전과 가장 최근의 다른 실행 후보로 설정한다.
- [ ] 다음 테스트를 추가한다:
  - 결과가 있을 때 `autoStart=1` 무시
  - 진짜 첫 실행에서는 `autoStart=1`이 여전히 solver 시작
  - 여러 버전은 기본값이 선택된 버전 + 최신 후보
  - 확정된 월은 기본적으로 비교 도구를 표시하지 않음
- [ ] Step5/review hub 테스트를 다시 실행한다.

예상: PASS.

## 인수 기준

- 이전 실행 이력이 있는 월의 Step4를 열면 조용히 편집으로 진입하지 않고 Off 요청을 수정할지 결과를 검토할지 묻는다.
- Step4에서 결과 검토를 선택하면 Step5가 열리고 solver 실행 없이 기존 결과를 보여준다.
- 기존 결과가 있는 월의 Step5를 열면 solver가 절대 자동 시작되지 않는다.
- 진짜 첫 실행의 Step5는 Step4 전달에서 여전히 auto-start할 수 있다.
- Step4에서 재실행하려면 버전 이름이 필요하다.
- 중복 버전 이름은 명시적인 덮어쓰기 확인을 요구한다.
- 확정된 버전이나 풀이 중인 버전은 덮어쓸 수 없다.
- 기존 버전이 여러 개 있으면 포커스된 결과와 비교 후보 하나를 기본으로 보여준다.

## 검증

- [ ] 대상 단위 테스트 실행:

```bash
pnpm test:unit -- tests/unit/schedule-version-resolver.spec.ts tests/unit/step4-initial-data.spec.ts tests/unit/step5-result.spec.ts tests/unit/use-schedule-review-hub.spec.ts tests/unit/phase2-schedule-api.spec.ts tests/unit/phase2-schedule-contracts.spec.ts tests/unit/phase2-schedule-write-repository.spec.ts
```

- [ ] lint 실행:

```bash
pnpm lint:check
```

## 가정

- 이 저장소는 이미 계획 문서를 `docs/plans/`에 저장하므로 이 계획 문서도 `docs/plans/`에 둔다.
- "실행 이력"은 월 단위 schedule 컨테이너가 단순히 존재한다는 뜻이 아니라, 버전에 solver/result 활동이 있다는 뜻이다.
- "덮어쓰기"는 선택된 버전의 편집 가능한 draft/run 상태를 새 Off 입력으로 다시 풀 수 있도록 교체한다는 뜻이며, 확정된 버전과 현재 풀이 중인 버전은 보호 상태로 유지한다.
- 사용자-facing UI 문구는 한국어여야 한다.
