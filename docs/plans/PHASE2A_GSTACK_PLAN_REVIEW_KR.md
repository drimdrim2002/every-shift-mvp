# EveryShift Phase2A Gstack Plan Review Doc

> 상태: Draft for `/plan-eng-review`
>
> 브랜치: `gstack-plan-review`
>
> 소스 문서:
>
> - [PHASE2_PRD_KR.md](../prd/PHASE2_PRD_KR.md)
> - [PHASE2_PRD.md](../prd/PHASE2_PRD.md)
> - [PHASE2_ENGINEERING_SPEC_KR.md](../prd/PHASE2_ENGINEERING_SPEC_KR.md)
> - [PHASE2_ENGINEERING_SPEC.md](../prd/PHASE2_ENGINEERING_SPEC.md)

## 0. Gstack Flow Recovery

이 브랜치의 현재 상태는 gstack 산출물이 서로 다른 층위의 문서와 draft code로 섞여 있는 상태다.

이 문서는 그 섞인 상태를 다시 다음 순서로 정렬하기 위한 recovery control document다.

### 0.1 Skill별 산출물 재분류

#### A. `/office-hours` + `/plan-ceo-review`

이 단계의 결과물은 제품 정의와 scope lock-in 문서다.

- [PHASE2_PRD_KR.md](../prd/PHASE2_PRD_KR.md)
- [PHASE2_PRD.md](../prd/PHASE2_PRD.md)

이 두 문서는 gstack의 `~/.gstack/projects/...design...md` 형식은 아니지만, 실제 내용 기준으로는 이 브랜치의 product/design artifact로 간주한다.

#### B. `/plan-eng-review`

이 단계의 결과물은 구현 관점의 execution spec이다.

- [PHASE2_ENGINEERING_SPEC_KR.md](../prd/PHASE2_ENGINEERING_SPEC_KR.md)
- [PHASE2_ENGINEERING_SPEC.md](../prd/PHASE2_ENGINEERING_SPEC.md)

이 두 문서는 PRD를 코드에 내리기 위한 engineering artifact로 간주한다.

#### C. 구현 draft

아래 산출물은 review 완료 전 미리 생성된 구현 초안이다.

- [007_phase2a_version_evaluation_foundation.sql](../../migrations/007_phase2a_version_evaluation_foundation.sql)
- [phase2.ts](../../src/api/phase2.ts)
- [phase2.ts](../../src/types/phase2.ts)
- [phase2-schedule/index.ts](../../supabase/functions/phase2-schedule/index.ts)
- [phase2-ops/index.ts](../../supabase/functions/phase2-ops/index.ts)
- [http.ts](../../supabase/functions/_shared/http.ts)
- [auth.ts](../../supabase/functions/_shared/auth.ts)
- [routes.ts](../../supabase/functions/_shared/routes.ts)
- [supabase.ts](../../supabase/functions/_shared/supabase.ts)

이들은 approved implementation이 아니라 draft implementation이다.

### 0.2 Canonical source of truth

이 브랜치에서 source of truth는 다음 우선순위를 따른다.

1. 제품 결정: [PHASE2_PRD_KR.md](../prd/PHASE2_PRD_KR.md), [PHASE2_PRD.md](../prd/PHASE2_PRD.md)
2. 구현 결정: [PHASE2_ENGINEERING_SPEC_KR.md](../prd/PHASE2_ENGINEERING_SPEC_KR.md), [PHASE2_ENGINEERING_SPEC.md](../prd/PHASE2_ENGINEERING_SPEC.md)
3. review control: [PHASE2A_GSTACK_PLAN_REVIEW_KR.md](./PHASE2A_GSTACK_PLAN_REVIEW_KR.md)
4. code drafts: migration / Edge Function / frontend API skeleton

즉, code draft는 문서를 이기지 못한다.

### 0.3 Recovery 원칙

- 이미 작성된 PRD는 버리지 않는다.
- engineering spec도 버리지 않는다.
- implementation draft는 당장 삭제하지 않되 freeze 상태로 둔다.
- 이후 review는 code가 아니라 이 문서를 기준으로 진행한다.
- review가 끝난 뒤에만 draft implementation을 slice 단위로 되살린다.

### 0.4 이제부터의 gstack 순서

이 브랜치에서는 아래 순서를 canonical flow로 간주한다.

1. `/office-hours` 결과는 이미 PRD에 반영된 것으로 본다.
2. `/plan-ceo-review` 결과는 PRD의 scope/positioning 결정으로 본다.
3. `/plan-eng-review`는 이 문서를 review target으로 삼아 architecture/tests/performance를 잠근다.
4. eng review가 끝나기 전에는 migration과 TS skeleton을 진행 중 work가 아니라 frozen draft로 본다.
5. eng review 종료 후 implementation은 아래 순서로 재개한다.
   - schema foundation
   - backend read/write path
   - Step5 review hub
   - ops write path
   - finalize + fairness ledger

### 0.4-bis 이번 eng review의 확정 범위

Step 0 결정에 따라 이번 `/plan-eng-review`와 첫 구현 슬라이스는 `Trust Layer`만 다룬다.

이번 review/첫 구현의 in scope:

- month container 재정의
- `schedule_versions`
- `schedule_evaluations`
- version-scoped assignments/preferences
- recheck/finalize gate
- Step5 review hub
- trust-layer tests

이번 review/첫 구현의 out of scope:

- `organization_rank_codes`
- `off_request_policy_rules`
- admin bootstrap
- ops write path
- rolling fairness ledger

위 out-of-scope 항목은 제품 범위에서 삭제하는 것이 아니라, 다음 plan/implementation slice로 이월한다.

### 0.5 지금 당장 하지 않는 일

- office-hours를 다시 처음부터 재실행하지 않는다.
- PRD를 새 형식으로 다시 쓰지 않는다.
- draft implementation을 source of truth처럼 계속 확장하지 않는다.
- migration 적용 문제를 먼저 해결하려고 하지 않는다.

## 1. 이 문서의 역할

이 문서는 지금까지 작성된 Phase2 PRD와 engineering spec을 실제 구현 계획으로 잠그기 위한 branch 전용 review 대상 문서다.

이 문서의 목적은 다음과 같다.

- `/plan-eng-review`가 검토할 단일 implementation plan을 제공한다.
- 이미 작성된 migration, Edge Function skeleton, frontend API skeleton을 source of truth가 아닌 draft artifact로 격리한다.
- 구현 전에 scope, architecture, test plan, cut line을 다시 잠근다.

## 2. 현재 판단

지금까지의 산출물 중 제품 결정은 유효하지만 구현은 review 절차보다 앞서 나갔다.

유효한 planning artifact:

- [PHASE2_PRD_KR.md](../prd/PHASE2_PRD_KR.md)
- [PHASE2_PRD.md](../prd/PHASE2_PRD.md)
- [PHASE2_ENGINEERING_SPEC_KR.md](../prd/PHASE2_ENGINEERING_SPEC_KR.md)
- [PHASE2_ENGINEERING_SPEC.md](../prd/PHASE2_ENGINEERING_SPEC.md)

아직 승인되지 않은 draft artifact:

- [007_phase2a_version_evaluation_foundation.sql](../../migrations/007_phase2a_version_evaluation_foundation.sql)
- [phase2-schedule/index.ts](../../supabase/functions/phase2-schedule/index.ts)
- [phase2-ops/index.ts](../../supabase/functions/phase2-ops/index.ts)
- [phase2.ts](../../src/api/phase2.ts)
- [phase2.ts](../../src/types/phase2.ts)

원칙:

- 위 draft artifact는 참고만 한다.
- formal review가 끝나기 전까지 implementation baseline으로 취급하지 않는다.
- review에서 구조가 바뀌면 위 draft artifact는 수정 또는 폐기할 수 있다.

## 3. 목표

Phase2A의 핵심 목표는 기존 Phase1 근무표 생성 흐름 위에 다음을 얹는 것이다.

- 동일 월에 대해 여러 candidate version을 만들고 비교할 수 있다.
- 선택된 version의 `latest passed evaluation` 기준으로만 finalization 할 수 있다.
- backend evaluator가 hard constraint proof, off 요청 설명, review status를 계산한다.
- `review_blocked`, `infeasible`, `solve_failed`를 구분한다.
- rank는 조직별 code 기반으로 운영한다.
- rolling fairness ledger는 finalized version 기준으로만 적재한다.

## 4. 범위

### 4.1 In Scope

- `schedules`를 month container로 재정의
- `schedule_versions`, `schedule_evaluations` 도입
- `schedule_assignments`, `schedule_preferences`의 version scope 확장
- Step5를 version compare + review hub로 재구성
- evaluator/recheck/finalize backend flow 정의
- unit/integration/e2e test plan 확정

### 4.2 Not In Scope

- Phase2B signup/self-serve/dashboard
- finalized month reopen UI
- real solver engine 교체
- multi-tenant admin console 확장
- rank code / off request policy write path
- admin bootstrap
- finalized version 기반 fairness ledger 적재
- 배포 자동화 외 신규 artifact type 추가

## 5. Step 0 기준의 최소 변경 원칙

### 5.1 Existing code reuse

가능한 한 기존 흐름을 재사용한다.

- [schedule.ts](../../src/api/schedule.ts): 월별 schedule container 로직의 출발점
- [useAISolver.ts](../../src/composables/useAISolver.ts): solver 상태/polling 패턴 참고
- [Step4InitialData.vue](../../src/views/schedule/Step4InitialData.vue): version-scoped preference 입력의 출발점
- [Step5Result.vue](../../src/views/schedule/Step5Result.vue): review hub로 확장할 기존 화면
- [schedule.ts](../../src/stores/schedule.ts): wizard state와 route progression 재사용

### 5.2 Minimum viable change set

핵심 목표를 달성하기 위한 최소 구현 단위는 아래 네 묶음이다.

1. DB foundation: container/version/evaluation 스키마
2. Backend read/write path: ensure/create version/compare/review/recheck/finalize
3. Step5 review hub: version list, compare summary, evaluation proof, finalize CTA
4. Test suite: DB invariants, API contracts, finalize gate, review UI flow

### 5.3 Complexity guardrail

다음은 smell로 본다.

- 계획이 8개 이상의 코드 파일을 동시에 크게 바꾸도록 설계되는 경우
- 동일 책임을 위해 3개 이상의 신규 service/helper가 필요한 경우
- Step5 확장 대신 별도 review app처럼 분리되는 경우

이 문서의 권장 방향은 새 플랫폼을 만드는 것이 아니라 기존 Step4/Step5와 Supabase function 경계를 확장하는 것이다.

## 6. 제안 아키텍처

### 6.1 Data flow

```text
Step1-4 inputs
  -> ensure month container
  -> create version from current inputs
  -> solver execution
  -> write current assignments for version
  -> evaluator computes immutable evaluation
  -> Step5 review hub loads:
       - version list
       - compare metrics
       - latest evaluation for selected version
  -> operator may edit assignments
  -> recheck creates new evaluation for bumped revision
  -> finalize selected version if latest evaluation passed
  -> write fairness ledger from finalized version
```

### 6.2 Status lifecycle

```text
draft
  -> solving
  -> review_ready
  -> review_blocked
  -> infeasible
  -> solve_failed

manual edit
  -> review_pending
  -> recheck
  -> review_ready / review_blocked

review_ready
  -> finalize
  -> finalized
```

### 6.3 Finalization gate

```text
selected version
  -> current_revision 확인
  -> latest_evaluation 조회
  -> latest_evaluation.revision_no == current_revision ?
  -> latest_evaluation.result_status == passed ?
  -> yes: finalize transaction
  -> no: block with reason
```

## 7. 구현 슬라이스

### Slice 1. Schema foundation

출력:

- version/evaluation 중심 schema migration
- legacy data backfill strategy
- idempotent migration notes

검증:

- legacy schedule 1건당 version 1건 backfill
- version-scoped uniqueness 보장
- finalization FK와 policy tables 생성 확인

### Slice 2. Read/write API boundary

출력:

- month container ensure
- create version
- list versions / compare
- load selected version review
- recheck
- finalize

검증:

- selected version 기준 응답 shape 일관성
- stale evaluation이면 finalize 거절
- `review_blocked`, `infeasible`, `solve_failed` 응답 구분

### Slice 3. Step5 review hub

출력:

- version selector
- input diff summary
- comparison metrics
- proof summary / violation details / off request results
- finalize button gating

검증:

- 다른 version 선택 시 review pane 즉시 교체
- manual edit 후 `review_pending` 상태 반영
- recheck 전 finalize 불가

### Slice 4. Ops write path

출력:

- organization rank codes CRUD-lite
- off request policy write path
- admin bootstrap 최소 흐름

검증:

- rank 없는 조직도 default 정책으로 동작
- rank code 유효성 체크
- policy active range 충돌 처리

### Slice 5. Fairness ledger and finalize transaction

출력:

- finalized version 기준 ledger upsert
- schedule.finalized_version_id 갱신
- immutable finalize audit fields

검증:

- non-finalized version에서는 ledger write 금지
- finalized version 변경 없는 재요청은 idempotent 처리

주석:

- Slice 4와 Slice 5는 현재 review 범위 밖이다.
- 이번 eng review는 Slice 1~3만 대상으로 한다.

## 8. 테스트 계획

### 8.1 DB / migration

- legacy backfill
- unique key migration
- `profiles` existing-table compatibility
- selected/finalized version FK integrity

### 8.2 Backend integration

- ensure month container idempotency
- create version increments `latest_version_no`
- compare payload contains input diff + metrics
- recheck creates immutable evaluation row
- finalize blocks stale revision
- finalize writes fairness ledger only once

### 8.3 Frontend

- Step5 version switching
- review states rendering
- manual edit -> review_pending -> recheck
- finalize CTA disabled/enabled transitions

### 8.4 Failure modes

- solver timeout -> `solve_failed`
- infeasible response -> infeasibility panel
- evaluator detects hard violations -> `review_blocked`
- stale selected version while another tab edits data

## 9. Cut Lines

이 plan은 다음을 먼저 잠근다.

- compare의 기본 단위는 version
- finalization gate는 selected version 기준
- backend evaluator가 trust proof를 계산
- Step5를 새 앱이 아닌 확장 화면으로 유지

다음은 review 통과 전 구현하지 않는다.

- migration 실제 배포
- Edge Function business logic 본구현
- frontend route wiring 완료
- real solver integration 확대

## 10. Review에서 꼭 잠가야 할 질문

1. migration을 한 번에 적용할지, foundation/backfill을 분리할지
2. evaluator와 finalize transaction을 같은 function에 둘지, 분리할지
3. Step5에 compare와 edit를 함께 둘지, pane을 분리할지
4. selected version concurrency를 optimistic check만으로 충분히 막을지
5. API contract에서 proof/metrics JSON shape를 얼마나 고정할지

## 11. 이번 브랜치의 작업 원칙

- planning artifact를 먼저 잠근다.
- implementation draft는 review의 input이지 output이 아니다.
- review가 끝나기 전에는 코드보다 plan을 바꾼다.
- 구현 시작 시에는 slice 단위로 다시 착수한다.

## GSTACK REVIEW REPORT

| Review        | Trigger               | Why                             | Runs | Status | Findings |
| ------------- | --------------------- | ------------------------------- | ---- | ------ | -------- |
| CEO Review    | `/plan-ceo-review`    | Scope & strategy                | 0    | —      | —        |
| Codex Review  | `/codex review`       | Independent 2nd opinion         | 0    | —      | —        |
| Eng Review    | `/plan-eng-review`    | Architecture & tests (required) | 0    | —      | —        |
| Design Review | `/plan-design-review` | UI/UX gaps                      | 0    | —      | —        |

**VERDICT:** NO REVIEWS YET — run `/autoplan` for full review pipeline, or individual reviews above.
