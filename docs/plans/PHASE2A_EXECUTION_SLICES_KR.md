# Phase2A 실행 슬라이스

> 상태: 실행 계획 문서
>
> 범위 고정: `Phase2A Trust Layer only`
>
> 이 문서는 이미 Phase2A review 자료에서 확정된 제품, 엔지니어링, 디자인 결정을 다시 열지 않는다.

## 1. 이 문서의 역할

이 문서는 이미 확정된 Phase2A Trust Layer 범위를 실제 구현 가능한 execution slice로 전환하기 위해 존재한다.

이 문서는 review 문서와 의도적으로 역할이 다르다.

- review 문서는 **무엇을 만들어야 하는지**와 **어디까지가 컷 라인인지**를 확정한다.
- 이 실행 계획은 작업을 **어떤 순서로**, **어떤 파일 경계 안에서**, **어떤 검증 게이트와 함께** 구현할지를 확정한다.

이 문서는 다음이 아니다.

- PRD를 다시 쓰는 문서
- 두 번째 plan review 문서
- 범위를 확장하는 장소
- 동결된 draft code를 source of truth로 되살리는 장소

### 1.1 Source of Truth 우선순위

이 브랜치의 source of truth 우선순위는 다음과 같다.

1. [PHASE2_PRD_KR.md](../prd/PHASE2_PRD_KR.md)
2. [PHASE2_ENGINEERING_SPEC_KR.md](../prd/PHASE2_ENGINEERING_SPEC_KR.md)
3. [PHASE2A_GSTACK_PLAN_REVIEW_KR.md](./PHASE2A_GSTACK_PLAN_REVIEW_KR.md)
4. 이 execution planning 문서

이 문서가 더 높은 우선순위의 source와 충돌하면, 더 높은 우선순위의 source가 우선한다.

### 1.2 실행으로 가져가는 고정 결정

다음 사항은 이미 고정된 것으로 간주하며, 여기서 다시 논의하지 않는다.

- `selected version`이 authoritative하다
- `preview version`과 `selected version`은 서로 다른 개념이다
- compare는 Step5 상단에 항상 보이는 의사결정 surface다
- 기본 detail panel은 version state에 따라 바뀐다
- Step5는 한 시점에 하나의 state-driven primary CTA만 사용한다
- failure panel은 공통 Step5 frame 안에 머문다
- finalize는 `selected version + current revision + latest passed evaluation`을 기준으로 한다
- `select`, `recheck`, `finalize`는 서로 다른 연산이다
- `version` query parameter는 deep-link와 preview view state에만 사용되며, authoritative selection이 될 수 없다

## 2. 구현 전략

plan review에서는 네 개의 큰 구현 그룹이 확정되었다.

1. DB foundation
2. Backend read/write path
3. Step5 review hub
4. Test suite

하지만 이 네 그룹은 이 저장소에서 안전하게 구현하기에는 너무 거칠다.

그대로 구현하면 하나의 변경 묶음 안에 다음이 함께 섞이게 된다.

- schema migration과 backfill
- backend contract 설계
- Step4 진입 경로 연결
- Step5 state/UI 전환
- finalize gate 로직
- finalized-data protection

이렇게 되면 rollback과 디버깅 비용이 너무 커진다.

따라서 이 문서는 고정된 Phase2A Trust Layer 범위를 순차적인 8개의 execution slice로 나눈다. 각 slice는 다음 특성을 가진다.

- 좁은 파일 경계를 가진다
- 하나의 지배적인 책임만 가진다
- 다음 단계로 넘어가기 전에 검증 가능한 완료 게이트를 가진다
- 꼭 필요한 경우가 아니면 schema, transaction logic, Step5 UX 변경을 같은 slice에 섞지 않는다

## 3. 실행 슬라이스

### Slice 1. Schema Foundation

**목표**

- Trust Layer schema foundation을 도입한다.
  - `schedule_versions`
  - `schedule_evaluations`
  - `schedules`에 들어가는 container-level selection/finalization 필드
  - `schedule_assignments`의 version-scoped ownership
  - `schedule_preferences`의 version-scoped ownership

**왜 이 순서인가**

- 이후 모든 slice는 먼저 `schedule_version_id`, `selected_version_id`, `current_revision`, 불변 평가 row가 존재해야 한다.
- 이 slice는 API나 UI 변경을 넣기 전에 backfill 리스크를 분리한다.

**선행 조건 / 의존성**

- 없음

**생성 / 수정 대상**

- `migrations/007_phase2a_trust_layer_foundation.sql` 생성

**API / Schema / Store / View 영향**

- schema만 변경
- 이 slice에서는 frontend나 store를 변경하지 않음

**검증**

- 각 legacy month container마다 정확히 하나의 기본 `V1` version이 backfill되는지 확인
- assignments에 대해 `(schedule_version_id, employee_id, date)` uniqueness가 보장되는지 확인
- preferences에 대해 `(schedule_version_id, employee_id, date)` uniqueness가 보장되는지 확인
- `selected_version_id`와 `finalized_version_id`가 FK integrity를 유지하는지 확인
- migration notes 안에 legacy `schedule_id` read와의 호환 규칙을 문서화

**완료 정의**

- Step5 UI 작업 없이도 schema가 container/version/evaluation/revision/finalization을 표현할 수 있다
- legacy row를 모호함 없이 container + default version으로 표현할 수 있다

**이 Slice에서 하지 말 것**

- Edge Function 구현
- Step4 또는 Step5 UI 작업
- evaluator 로직
- finalize transaction 로직
- fairness ledger 작업

### Slice 2. Shared Contracts and Store Groundwork

**목표**

- API와 Step5 구현에 들어가기 전에 frontend TypeScript contract와 Pinia state key를 먼저 고정한다.

**왜 이 순서인가**

- backend와 frontend는 route나 UI 작업을 시작하기 전에 version/review/compare/finalization vocabulary를 공유해야 한다.
- 그래야 response shape가 병렬로 어긋나는 일을 막을 수 있다.

**선행 조건 / 의존성**

- Slice 1

**생성 / 수정 대상**

- `src/types/schedule.ts` 수정
- `src/stores/schedule.ts` 수정

**API / Schema / Store / View 영향**

- TS types:
  - `ScheduleVersionSummary`
  - `ScheduleEvaluation`
  - `ScheduleCompareResponse`
  - `ScheduleReviewResponse`
  - `SchedulePrimaryAction`
  - 관련 gate/detail type
- Pinia state:
  - `selectedVersionId`
  - `previewVersionId`
  - `versions`
  - `latestEvaluation`
  - `compareMatrix`
  - `reviewTab`

**검증**

- 모든 신규 type이 compile되며 API/store/view 코드에서 import 가능해야 한다
- version-specific state에 대한 store reset semantics가 정의되어 있어야 한다

**완료 정의**

- type layer가 충분히 안정화되어 이후 backend와 Step5 작업이 나중에 contract를 다시 바꾸지 않고도 이를 대상으로 구현될 수 있다

**이 Slice에서 하지 말 것**

- direct Supabase write
- Step5 markup 변경
- Edge Function invocation wiring

### Slice 3. Backend Read and Selection Boundary

**목표**

- `phase2-schedule` 아래에서 Trust Layer의 read/selection boundary를 구현한다.
  - `ensure`
  - `compare`
  - `review`
  - `select`

**왜 이 순서인가**

- Step5는 solve/recheck/finalize 로직이 추가되기 전에 먼저 `preview`와 `selected` state를 읽을 수 있어야 한다.
- Step5가 selection에 의존하기 시작하기 전에 selection authority를 backend로 옮겨야 한다.

**선행 조건 / 의존성**

- Slice 1
- Slice 2

**생성 / 수정 대상**

- `supabase/functions/phase2-schedule/index.ts` 생성
- `supabase/functions/phase2-schedule/repository.ts` 생성
- `supabase/functions/phase2-schedule/contracts.ts` 생성
- `src/api/schedule.ts` 수정

**API / Schema / Store / View 영향**

- 다음을 위한 backend contract boundary:
  - month container 보장
  - 기본 `V1` bootstrap
  - compare matrix 조회
  - review payload 조회
  - authoritative selection 변경
- `src/api/schedule.ts`의 frontend API wrapper 지원

**검증**

- 같은 organization + month에 대해 `ensure`가 idempotent한지 확인
- `ensure`가 첫 진입에서만 기본 `V1`을 생성하는지 확인
- `select`가 `selected_version_id`만 업데이트하는지 확인
- query parameter만 바뀌어서는 authoritative selection이 변경되지 않는지 확인

**완료 정의**

- 앱이 backend가 소유하는 authoritative selection을 기준으로 Step5 review data를 로드할 수 있다

**이 Slice에서 하지 말 것**

- `create version`
- `solve`
- `PATCH assignments`
- `recheck`
- `finalize`

### Slice 4. Wizard Entry Plumbing for V1 and Version-Scoped Preferences

**목표**

- Step1과 Step4를 container + default-version 흐름으로 전환한다.
- off-request persistence를 `schedule_id` 스코프에서 `schedule_version_id` 스코프로 옮긴다.

**왜 이 순서인가**

- Step4가 계속 `schedule_id` 기준으로만 request를 쓰면 candidate version 분리가 즉시 깨진다.
- review hub를 구현하기 전에 Step5 route wiring이 이미 preview version을 들고 있어야 한다.

**선행 조건 / 의존성**

- Slice 1
- Slice 2
- Slice 3

**생성 / 수정 대상**

- `src/views/schedule/Step1BasicInfo.vue` 수정
- `src/views/schedule/Step4InitialData.vue` 수정
- `src/api/schedule.ts` 수정

**API / Schema / Store / View 영향**

- Step1은 더 이상 예전 Phase1 단위처럼 working month row를 미리 생성하지 않는다
- Step4는 `schedule_version_id` 기준으로 저장한다
- Step5 routing은 `scheduleId + ?version=previewVersionId`를 사용한다

**검증**

- 첫 번째 Step4 저장에서 `ensure + bootstrap V1 + version-scoped preference save`가 실행되는지 확인
- Step5 이동에 preview version id가 포함되는지 확인
- Step1이 더 이상 예전 authoritative working record로서 schedule row를 생성하지 않는지 확인

**완료 정의**

- 새 월 진입이 이제 compare UI 없이도 version-aware Trust Layer baseline 위에 안착한다

**이 Slice에서 하지 말 것**

- compare UI
- 추가 candidate version 생성
- finalize gate UI

### Slice 5. Candidate Version Write Path and Solver Integration

**목표**

- candidate version 생성과 write-path 동작을 추가한다.
  - candidate version 생성
  - solve 시작
  - version-scoped assignments 저장
  - 수동 수정 시 `review_pending` 표시
  - revision/edit counter 증가

**왜 이 순서인가**

- 불변 evaluation과 finalize 규칙을 그 위에 얹기 전에 version lifecycle write path를 먼저 안정화해야 한다.

**선행 조건 / 의존성**

- Slice 1
- Slice 2
- Slice 3
- Slice 4

**생성 / 수정 대상**

- `supabase/functions/phase2-schedule/index.ts` 수정
- `supabase/functions/phase2-schedule/repository.ts` 수정
- `supabase/functions/phase2-schedule/engine.ts` 생성
- `src/api/schedule.ts` 수정
- `src/composables/useAISolver.ts` 수정

**API / Schema / Store / View 영향**

- version 생성과 solve를 위한 backend mutation contract
- solver 실행 persistence가 version-aware flow로 이동
- assignment 저장이 version-scoped가 됨
- 수동 수정이 revision과 version state를 바꿈

**검증**

- `create version`이 version number만 증가시키는지 확인
- `create version`이 기존 container에서 `selected_version_id`를 자동으로 업데이트하지 않는지 확인
- `solve`가 version을 `solving`으로 이동시키는지 확인
- 수동 수정이 `current_revision`을 증가시키는지 확인
- 수동 수정이 version을 `review_pending`으로 이동시키는지 확인

**완료 정의**

- trust proof/finalization을 추가하기 전에 version lifecycle과 version-scoped write 동작이 안정화된다

**이 Slice에서 하지 말 것**

- evaluation proof persistence
- stale finalize block
- Step5 review hub shell

### Slice 6. Trust Gate: Evaluation, Recheck, Finalize

**목표**

- 불변 evaluation 및 finalization 규칙을 구현한다.
  - `schedule_evaluations`
  - `recheck`
  - result-state classification
  - stale revision block
  - finalize transaction

**왜 이 순서인가**

- 이것이 Trust Layer의 핵심 invariant이며, Step5 UX를 마무리하기 전에 반드시 닫혀야 한다.

**선행 조건 / 의존성**

- Slice 5

**생성 / 수정 대상**

- `supabase/functions/phase2-schedule/index.ts` 수정
- `supabase/functions/phase2-schedule/repository.ts` 수정
- `supabase/functions/phase2-schedule/engine.ts` 수정
- `src/api/schedule.ts` 수정

**API / Schema / Store / View 영향**

- review/evaluation API contract
- finalization gate contract
- container finalization 필드가 활성화됨

**검증**

- `recheck`가 현재 revision에 대해 새로운 불변 evaluation row를 쓰는지 확인
- `review_blocked`, `infeasible`, `solve_failed`가 구분된 상태로 저장되고 반환되는지 확인
- finalize가 다음 조건에서만 성공하는지 확인
  - authoritative selected version
  - current revision
  - latest passed evaluation
- stale 또는 invalid target state에서는 finalize가 `409`를 반환하는지 확인

**완료 정의**

- finalization이 backend-authoritative하며 Trust Layer gate로 보호된다

**이 Slice에서 하지 말 것**

- Step5 panel layout polish
- Step3 employee-resave guard
- fairness ledger 작업

### Slice 7. Step5 Review Hub Shell and Data Plumbing

**목표**

- Step5를 `preview`와 `selected` state가 분리된 review-hub shell로 전환한다.
- compare를 항상 보이는 상단 의사결정 surface로 만든다.

**왜 이 순서인가**

- backend contract와 trust gate semantics가 안정화된 뒤에야 Step5 shell을 만들어야 한다.

**선행 조건 / 의존성**

- Slice 2
- Slice 3
- Slice 4
- Slice 5
- Slice 6

**생성 / 수정 대상**

- `src/views/schedule/Step5Result.vue` 수정
- `src/composables/useScheduleReviewHub.ts` 생성
- `src/components/schedule/review/VersionCompareSurface.vue` 생성
- `src/components/schedule/review/VersionActionArea.vue` 생성

**API / Schema / Store / View 영향**

- Step5 shell:
  - preview/selected header
  - compare surface
  - 명시적인 select CTA
  - preview에만 적용되는 deep-link query sync

**검증**

- compare surface가 모든 Step5 state에서 계속 보이는지 확인
- version을 클릭하면 preview만 바뀌는지 확인
- 명시적인 select만 authoritative selection을 바꾸는지 확인
- query parameter가 없을 때 preview가 backend의 `selected_version_id`를 기본값으로 쓰는지 확인

**완료 정의**

- Step5가 단일 결과 화면이 아니라 review hub로 동작하지만, 최종 panel-order polish는 아직 들어가지 않은 상태가 된다

**이 Slice에서 하지 말 것**

- 최종 state-panel priority polish
- Step3 finalized-data protection
- metadata/dashboard/log 업데이트

### Slice 8. Step5 State Panels, Final Guards, and Trust-Layer Tests

**목표**

- 최종 사용자 동작과 테스트 커버리지를 마감한다.
  - state-driven 기본 detail panel
  - single-primary-CTA reducer
  - 공통 failure panel
  - finalized version이 있을 때의 Step3 protection
  - Trust Layer unit/E2E coverage

**왜 이 순서인가**

- 이 slice는 앞선 모든 contract가 안정화되어 있어야 한다.
- 또한 cross-cutting UX와 검증 작업을 마감하기에 적절한 위치다.

**선행 조건 / 의존성**

- Slice 1부터 Slice 7까지

**생성 / 수정 대상**

- `src/views/schedule/Step5Result.vue` 수정
- `src/components/schedule/review/VersionReviewDetail.vue` 생성
- `src/views/schedule/Step3EmployeeInfo.vue` 수정
- `tests/e2e/step5-review-hub.spec.ts` 생성
- `tests/e2e/schedule-workflow.spec.ts` 수정
- `tests/unit/schedule-review.spec.ts` 생성
- `tests/unit/useAISolver.spec.ts` 수정

**API / Schema / Store / View 영향**

- 최종 Step5 state UX
- Step3의 finalized-month protection
- 자동화된 회귀 테스트 coverage

**검증**

- `review_ready`, `finalized`, `review_pending`, `review_blocked`, `infeasible`, `solve_failed` 각각이 올바른 기본 panel을 여는지 확인
- 시각적으로 primary인 CTA는 항상 하나만 존재하는지 확인
- failure panel이 공통 Step5 frame 안에 머무는지 확인
- finalized version이 있는 월에서는 Step3 employee resave가 차단되는지 확인
- 다음에 대한 자동화 커버리지가 존재하는지 확인
  - `V1 -> V2 -> select -> recheck -> finalize`
  - state mapping
  - gate behavior
  - version switching behavior

**완료 정의**

- 고정된 Phase2A 범위에 대해 Trust Layer UI 동작과 자동화 회귀 테스트 coverage가 완성된다

**이 Slice에서 하지 말 것**

- review metadata 업데이트
- dashboard/log tracking 확장
- fairness ledger 작업
- Phase2B 범위 확장

## 4. 리스크 메모

이 순서는 재작업을 최소화하기 위해 선택되었다.

### 4.1 이 컷이 재작업을 줄이는 이유

- schema와 backfill 리스크를 API/UI 작업 시작 전에 분리한다.
- backend와 Step5 구현 전에 공통 contract shape를 확정한다.
- 불변 evaluation/finalization을 얹기 전에 version write path를 안정화한다.
- backend truth가 생긴 뒤에 Step5 shell을 구축하여, 가짜 frontend-only state model을 피한다.
- Step3 finalized-data protection은 finalization semantics가 실제로 만들어진 뒤로 미룬다.

### 4.2 리스크가 큰 Slice 조합

다음 조합은 의도적으로 피한다.

- **Slice 1 + Slice 3/4**: migration/backfill 디버깅과 API/UI regression이 섞인다
- **Slice 5 + Slice 6**: write-path 오류와 trust-gate 오류가 섞여 classification bug가 가려진다
- **Slice 7 + Slice 8**: query/selection plumbing과 최종 panel/CTA 동작이 섞여 Step5 재작업 규모가 커진다

## 5. 열린 구현 갭

다음 갭은 제품 범위를 다시 열지 않으면서 구현 중에 명시적으로 닫아야 한다.

### 5.1 빠져 있는 Selection Mutation Contract

engineering spec은 backend가 소유하는 `selected_version_id`를 정의하지만, 현재 endpoint 표에는 전용 `select` mutation이 정의되어 있지 않다.

기본 구현 원칙:

- `POST /functions/v1/schedule-versions/:versionId/select` 추가
- `select`, `recheck`, `finalize`는 서로 다른 연산으로 유지

### 5.2 `create version`과 Authoritative Selection

현재 engineering spec은 `create version`이 `selected_version_id`를 업데이트한다고 되어 있지만, 고정된 실행 규칙은 preview와 selected를 분리하도록 요구한다.

기본 구현 원칙:

- 기존 container에서는 `create version`이 새 version을 **자동 선택하면 안 된다**
- `ensure`가 생성하는 첫 bootstrap `V1`만 `selected_version_id`를 초기화해야 한다

### 5.3 Preview + Selected Read Contract

Step5는 다음을 렌더링해야 한다.

- preview detail
- selected gate summary

이 두 view의 정확한 read contract는 아직 완전히 닫히지 않았다.

기본 구현 원칙:

- `GET compare`
- `GET review(preview)`
- `GET review(selected)`
- `preview == selected`라면 같은 review response를 재사용

### 5.4 Finalize Target Validation

`finalize`의 path target과 authoritative selected version 규칙은 서로 정렬되어 있어야 한다.

기본 구현 원칙:

- path의 version이 현재 authoritative `selected_version_id`가 아니면 finalize는 `409`를 반환한다

### 5.5 구체적인 TS Contract Shape

engineering spec은 `ScheduleVersionSummary`, `ScheduleCompareResponse` 같은 type 이름은 제시하지만, TS contract shape를 완전히 정의하지는 않는다.

기본 구현 원칙:

- backend와 Step5 구현이 진행되기 전에 Slice 2에서 정확한 TS shape를 고정한다

### 5.6 Legacy Schema Reality Check

이 계획은 저장소에서 보이는 schema 가정과 legacy migration 문서를 바탕으로 작성되었다.

기본 구현 원칙:

- 실제 환경에서 migration을 실행하기 전에 다음을 비교한다.
  - `docs/prd/02-database-migration.md`
  - 현재 프로젝트 schema
  - 기존 migration history

## 6. 최종 권고

### 6.1 권장 작업 단위

구현 slice는 8개 단위로 유지한다.

권장 PR 묶음:

- `PR1 = Slice 1 + Slice 2`
- `PR2 = Slice 3 + Slice 4`
- `PR3 = Slice 5 + Slice 6`
- `PR4 = Slice 7`
- `PR5 = Slice 8`

### 6.2 실행 규율

- 고정된 Trust Layer 범위를 넘겨서 scope를 넓히지 말 것
- office-hours / CEO / eng / design review loop를 다시 열지 말 것
- 예전 draft code를 baseline truth로 되살리지 말 것
- migration, backend write path, Step5 최종 state UX, Step3 finalized guard를 하나의 PR로 합치지 말 것

### 6.3 실질적인 시작 지점

구현이 시작되면 첫 execution target은 다음 순서여야 한다.

1. Slice 1 - schema foundation
2. Slice 2 - shared contracts/store groundwork

이 두 slice가 닫히기 전에는 어떤 구현도 Step5 UI로 바로 건너뛰면 안 된다.
