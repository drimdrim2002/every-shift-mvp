# EveryShift Phase2 Engineering Spec (KR)

> **문서 상태**: Draft for implementation lock-in
>
> 이 문서는 [PHASE2_PRD_KR.md](./PHASE2_PRD_KR.md)와 [PHASE2_PRD.md](./PHASE2_PRD.md)의 구현 동반 문서다.
> 범위는 `Phase2A`까지로 제한한다. `Phase2B`의 self-serve/signup/dashboard는 본 문서에 포함하지 않는다.

## 1. 목적

이 문서의 목적은 Phase2 PRD에서 잠근 제품 결정을 현재 코드베이스 위에서 바로 구현 가능한 수준으로 내리는 것이다.

이 문서는 다음 질문에 답해야 한다.

- 어떤 DB 구조로 `version / revision / evaluation / finalization`을 표현할 것인가
- 어떤 API 경계에서 solver, evaluator, finalize를 처리할 것인가
- 현재 `Step5Result.vue`를 어떤 review hub로 바꿀 것인가
- 어떤 실패를 `review_blocked`, `infeasible`, `solve_failed`로 구분할 것인가
- 어떤 순서로 구현해야 리스크가 가장 낮은가

## 2. 구현 고정 결정

본 스펙은 다음 결정을 이미 확정된 것으로 간주한다.

- 결과 확정은 `selected version`의 `latest passed evaluation` 기준이다.
- compare의 기본 단위는 `manual baseline`이 아니라 `candidate version`이다.
- 하드 제약 증명과 미반영 off 요청 설명은 `backend evaluator`가 계산한다.
- 하드 제약 위반이 있는 결과는 `review_blocked`이며 `infeasible`와 다르다.
- `infeasible`와 `solve_failed`를 제품 상태로 구분한다.
- rank는 고정 enum이 아니라 `조직별 rank code`다.
- `rolling fairness ledger`는 `finalized version` 기준으로만 적재한다.
- Phase2A에서는 finalized month reopen UI를 지원하지 않는다.

## 3. 현재 구현 기준점

현재 구현의 핵심 기준점은 다음과 같다.

- [schedule.ts](../../src/api/schedule.ts): `schedules`를 월별 단일 작업 행으로 재사용한다.
- [useAISolver.ts](../../src/composables/useAISolver.ts): solver 상태를 `created/running/complete/error/changed`로 관리한다.
- [Step4InitialData.vue](../../src/views/schedule/Step4InitialData.vue): Step4에서 `schedule_preferences`를 저장한다.
- [Step5Result.vue](../../src/views/schedule/Step5Result.vue): 결과 확인, 재생성, 수동 수정, 저장을 한 화면에서 처리한다.
- [Step3EmployeeInfo.vue](../../src/views/schedule/Step3EmployeeInfo.vue): 직원 재저장 시 기존 month schedule을 삭제한다.

이 기준점 때문에 Phase2A는 “기존 row를 덮어쓰는 방식”에서 “container + version + evaluation 방식”으로 바뀌어야 한다.

## 4. 아키텍처 스냅샷

```text
[Step1-4 Planning Inputs]
  -> schedules (month container)
  -> schedule_versions (candidate versions)
  -> schedule_preferences (version-scoped off requests)
  -> schedule_assignments (current working assignments per version)
  -> solver execution
  -> backend evaluator
  -> schedule_evaluations (immutable review artifact)
  -> Step5 Review Hub
  -> finalize transaction
  -> fairness_ledger_monthly
```

운영 준비 레이어는 별도로 붙는다.

```text
Supabase Auth
  -> profiles
  -> setup checklist
  -> organization_rank_codes
  -> off_request_policy_rules
```

## 5. 데이터 모델

### 5.1 핵심 모델 원칙

- `schedules`는 더 이상 “결과표 1개”가 아니라 “월별 schedule container”다.
- `schedule_versions`가 후보안 A/B/C를 표현한다.
- `schedule_assignments`는 각 version의 현재 working assignment를 저장한다.
- `schedule_evaluations`는 `version + revision` 단위의 불변 검토 기록이다.
- manual edit는 assignment를 수정하고 `revision`을 증가시키며, evaluation은 새 row로 추가한다.

### 5.2 기존 테이블 변경

#### A. `schedules`

현재 `status/hard_score/soft_score/solver_execution_id` 중심 모델은 version compare와 맞지 않는다.

Phase2A에서는 `schedules`를 month container로 재정의한다.

추가 컬럼:

| Column                 | Type                       | Purpose                  |
| ---------------------- | -------------------------- | ------------------------ |
| `selected_version_id`  | UUID NULL                  | 현재 review 중인 version |
| `finalized_version_id` | UUID NULL                  | 최종 확정된 version      |
| `latest_version_no`    | INTEGER NOT NULL DEFAULT 0 | version 번호 증가용      |
| `finalized_at`         | TIMESTAMPTZ NULL           | 최종 확정 시각           |
| `finalized_by`         | UUID NULL                  | 확정 사용자              |

정리 원칙:

- 기존 `status`, `hard_score`, `soft_score`, `solver_execution_id`는 migration compatibility를 위해 남길 수 있다.
- 신규 write path는 `schedule_versions`와 `schedule_evaluations`를 source of truth로 사용한다.
- container 수준 상태는 API 응답에서 version 상태를 집계해 계산한다.

#### B. `schedule_assignments`

추가/변경 컬럼:

| Column                | Type             | Purpose                 |
| --------------------- | ---------------- | ----------------------- |
| `schedule_version_id` | UUID NOT NULL    | assignment 소속 version |
| `edited_by`           | UUID NULL        | 마지막 수정 사용자      |
| `edited_at`           | TIMESTAMPTZ NULL | 마지막 수정 시각        |

제약:

- 신규 unique key는 `(schedule_version_id, employee_id, date)`다.
- 기존 `schedule_id`는 container 참조용으로 유지한다.
- version별 assignment current state만 저장한다.

#### C. `schedule_preferences`

version compare를 하려면 off 요청도 version 단위여야 한다.

추가/변경 컬럼:

| Column                    | Type                                        | Purpose             |
| ------------------------- | ------------------------------------------- | ------------------- |
| `schedule_version_id`     | UUID NOT NULL                               | 요청이 속한 version |
| `request_source`          | VARCHAR(30) NOT NULL DEFAULT `employee_off` | 요청 출처           |
| `policy_check_status`     | VARCHAR(20) NOT NULL DEFAULT `pending`      | 정책 검사 상태      |
| `policy_rejection_reason` | TEXT NULL                                   | 정책상 불가 사유    |

제약:

- 신규 unique key는 `(schedule_version_id, employee_id, date)`다.
- 기존 `schedule_id`는 container 참조용으로 유지한다.

#### D. `employees`

추가 컬럼:

| Column      | Type         | Purpose          |
| ----------- | ------------ | ---------------- |
| `rank_code` | VARCHAR NULL | 조직별 rank code |

### 5.3 신규 테이블

#### A. `schedule_versions`

후보안 단위 메타데이터를 저장한다.

권장 컬럼:

| Column                       | Type                               | Purpose                                       |
| ---------------------------- | ---------------------------------- | --------------------------------------------- |
| `id`                         | UUID PK                            | version id                                    |
| `schedule_id`                | UUID FK                            | month container                               |
| `version_no`                 | INTEGER NOT NULL                   | 1, 2, 3 ...                                   |
| `name`                       | VARCHAR(100) NULL                  | 운영자가 이해할 수 있는 version 이름          |
| `source_type`                | VARCHAR(30) NOT NULL               | `initial_solve`, `re_solve`, `manual_variant` |
| `base_version_id`            | UUID NULL                          | 파생된 기준 version                           |
| `current_revision`           | INTEGER NOT NULL DEFAULT 0         | 현재 revision                                 |
| `status`                     | VARCHAR(30) NOT NULL               | lifecycle status                              |
| `input_snapshot`             | JSONB NOT NULL DEFAULT '{}'::jsonb | version 생성 시 입력 스냅샷                   |
| `input_diff_summary`         | JSONB NOT NULL DEFAULT '{}'::jsonb | compare용 입력 차이 요약                      |
| `manual_edit_count`          | INTEGER NOT NULL DEFAULT 0         | 수동 수정 건수                                |
| `active_solver_execution_id` | VARCHAR NULL                       | 현재 solver execution                         |
| `latest_evaluation_id`       | UUID NULL                          | 최신 evaluation                               |
| `created_by`                 | UUID NULL                          | 생성 사용자                                   |
| `created_at`                 | TIMESTAMPTZ                        | 생성 시각                                     |
| `updated_at`                 | TIMESTAMPTZ                        | 수정 시각                                     |

`input_snapshot` 최소 항목:

```json
{
  "off_request_count": 42,
  "locked_assignment_count": 155,
  "policy_version": "2026-03-26T10:30:00Z",
  "site_requirement_hash": "sha256:...",
  "employee_roster_hash": "sha256:..."
}
```

`input_diff_summary` 최소 항목:

```json
{
  "changed_off_requests": 2,
  "changed_locked_assignments": 0,
  "changed_policy_rules": 1,
  "changed_site_requirements": 0,
  "note": "2건의 off 요청 조정"
}
```

#### B. `schedule_evaluations`

review/finalization의 기준이 되는 불변 검토 기록이다.

권장 컬럼:

| Column                | Type                 | Purpose                                                  |
| --------------------- | -------------------- | -------------------------------------------------------- |
| `id`                  | UUID PK              | evaluation id                                            |
| `schedule_id`         | UUID FK              | month container                                          |
| `schedule_version_id` | UUID FK              | 대상 version                                             |
| `revision_no`         | INTEGER NOT NULL     | 평가 대상 revision                                       |
| `result_status`       | VARCHAR(30) NOT NULL | `passed`, `review_blocked`, `infeasible`, `solve_failed` |
| `proof_summary`       | JSONB NOT NULL       | 하드 제약 위반 집계                                      |
| `violation_details`   | JSONB NOT NULL       | 위반 상세 목록                                           |
| `infeasibility`       | JSONB NULL           | infeasible 설명                                          |
| `off_request_results` | JSONB NOT NULL       | 요청별 반영/미반영 결과                                  |
| `comparison_metrics`  | JSONB NOT NULL       | compare용 지표                                           |
| `finalization_gate`   | JSONB NOT NULL       | gate 결과                                                |
| `assignment_hash`     | TEXT NOT NULL        | assignment 일치 확인용                                   |
| `solver_execution_id` | VARCHAR NULL         | solver trace                                             |
| `evaluator_version`   | VARCHAR NOT NULL     | evaluator 로직 버전                                      |
| `created_at`          | TIMESTAMPTZ          | 생성 시각                                                |

`proof_summary` 예시:

```json
{
  "weekly_hours_violations": 0,
  "nnn_violations": 0,
  "nod_violations": 0,
  "minimum_rest_violations": 0,
  "staffing_shortfalls": 0
}
```

`comparison_metrics` 예시:

```json
{
  "off_request_reflection_rate": 0.81,
  "night_shift_min": 4,
  "night_shift_max": 5,
  "weekend_shift_min": 3,
  "weekend_shift_max": 4,
  "rolling_fairness_impact_score": -0.12,
  "manual_edit_count": 1
}
```

`finalization_gate` 예시:

```json
{
  "allowed": true,
  "blocking_reasons": []
}
```

#### C. `organization_rank_codes`

조직별 rank code 사전을 저장한다.

| Column            | Type                          | Purpose     |
| ----------------- | ----------------------------- | ----------- |
| `id`              | UUID PK                       | row id      |
| `organization_id` | UUID FK                       | 조직        |
| `code`            | VARCHAR(50) NOT NULL          | rank code   |
| `label`           | VARCHAR(100) NOT NULL         | 화면 표시명 |
| `sort_order`      | INTEGER NOT NULL DEFAULT 0    | 정렬        |
| `is_active`       | BOOLEAN NOT NULL DEFAULT true | 사용 여부   |

#### D. `off_request_policy_rules`

off 요청 정책을 rank code 기준으로 정의한다.

| Column                | Type             | Purpose                 |
| --------------------- | ---------------- | ----------------------- |
| `id`                  | UUID PK          | row id                  |
| `organization_id`     | UUID FK          | 조직                    |
| `rank_code`           | VARCHAR(50) NULL | NULL이면 조직 공통 정책 |
| `monthly_limit`       | INTEGER NULL     | 월간 한도               |
| `annual_limit`        | INTEGER NULL     | 연간 한도               |
| `allowed_shift_codes` | JSONB NULL       | 허용 시프트 목록        |
| `active_from`         | DATE NULL        | 시작일                  |
| `active_to`           | DATE NULL        | 종료일                  |
| `created_at`          | TIMESTAMPTZ      | 생성 시각               |
| `updated_at`          | TIMESTAMPTZ      | 수정 시각               |

#### E. `fairness_ledger_monthly`

employee-month grain의 누적 공정성 기록이다.

| Column                | Type                       | Purpose             |
| --------------------- | -------------------------- | ------------------- |
| `id`                  | UUID PK                    | row id              |
| `organization_id`     | UUID FK                    | 조직                |
| `employee_id`         | UUID FK                    | 직원                |
| `month`               | VARCHAR(7) NOT NULL        | `YYYY-MM`           |
| `schedule_id`         | UUID FK                    | month container     |
| `schedule_version_id` | UUID FK                    | finalized version   |
| `night_count`         | INTEGER NOT NULL DEFAULT 0 | 월간 N 횟수         |
| `evening_count`       | INTEGER NOT NULL DEFAULT 0 | 월간 E 횟수         |
| `weekend_count`       | INTEGER NOT NULL DEFAULT 0 | 월간 주말 근무 횟수 |
| `created_at`          | TIMESTAMPTZ                | 생성 시각           |

unique key:

- `(organization_id, employee_id, month)`

#### F. `profiles`

Go-Live Ops Layer에서 auth user와 organization role을 연결한다.

| Column             | Type                                  | Purpose                   |
| ------------------ | ------------------------------------- | ------------------------- |
| `user_id`          | UUID PK                               | auth user id              |
| `organization_id`  | UUID FK                               | 조직                      |
| `role`             | VARCHAR(20) NOT NULL                  | `admin`, `operator`       |
| `display_name`     | VARCHAR(100) NULL                     | 표시 이름                 |
| `status`           | VARCHAR(20) NOT NULL DEFAULT `active` | 계정 상태                 |
| `onboarding_state` | JSONB NOT NULL DEFAULT '{}'::jsonb    | setup checklist 진행 상태 |
| `created_at`       | TIMESTAMPTZ                           | 생성 시각                 |
| `updated_at`       | TIMESTAMPTZ                           | 수정 시각                 |

## 6. 상태 수명주기

version lifecycle을 source of truth로 사용한다.

```text
draft
-> solving
-> review_ready | review_blocked | infeasible | solve_failed

review_ready
-> finalized

review_ready
-> review_pending
-> review_ready | review_blocked
```

상태 의미:

- `draft`: version이 생성되었으나 solve 전
- `solving`: solver 실행 중
- `review_ready`: current revision 기준 latest evaluation이 `passed`
- `review_blocked`: 결과표는 있으나 hard constraint 위반 존재
- `review_pending`: 수동 수정 후 재검증 필요
- `infeasible`: 현재 입력으로 feasible solution 없음
- `solve_failed`: 시스템, 네트워크, 통합 실패
- `finalized`: 확정 완료, 수정 불가

## 7. API 경계

### 7.1 원칙

- organization/employees/shifts/read-only lookup은 기존 Supabase direct read를 유지할 수 있다.
- version/evaluation/finalize/policy mutation은 Edge Function 또는 backend endpoint로 이동한다.
- transaction이 필요한 로직은 프론트엔드에서 직접 구현하지 않는다.

### 7.2 권장 엔드포인트

| Method  | Path                                                      | Purpose                           |
| ------- | --------------------------------------------------------- | --------------------------------- |
| `POST`  | `/functions/v1/schedules/ensure`                          | org+month 기준 container 확보     |
| `POST`  | `/functions/v1/schedules/:scheduleId/versions`            | 새 candidate version 생성         |
| `PUT`   | `/functions/v1/schedule-versions/:versionId/preferences`  | version별 off 요청 저장           |
| `POST`  | `/functions/v1/schedule-versions/:versionId/solve`        | solver 실행 시작                  |
| `PATCH` | `/functions/v1/schedule-versions/:versionId/assignments`  | 수동 수정 저장                    |
| `POST`  | `/functions/v1/schedule-versions/:versionId/recheck`      | backend evaluator 재실행          |
| `GET`   | `/functions/v1/schedule-versions/:versionId/review`       | proof/off request/gate 조회       |
| `GET`   | `/functions/v1/schedules/:scheduleId/compare`             | version compare matrix 조회       |
| `POST`  | `/functions/v1/schedule-versions/:versionId/finalize`     | 확정 처리                         |
| `PUT`   | `/functions/v1/organizations/:orgId/rank-codes`           | rank code 설정                    |
| `PUT`   | `/functions/v1/organizations/:orgId/off-request-policies` | 정책 저장                         |
| `POST`  | `/functions/v1/admin-bootstrap`                           | assisted pilot용 관리자 bootstrap |

구현 메모:

- 실제 Supabase Edge Function skeleton은 두 개의 function으로 그룹화한다.
- schedule/version/review/finalize 계열은 `/functions/v1/phase2-schedule/...`
- bootstrap/rank/policy 계열은 `/functions/v1/phase2-ops/...`
- 프론트엔드 wrapper는 [phase2.ts](../../src/api/phase2.ts)에서 이 grouped path를 호출한다.

### 7.3 주요 계약

#### A. `POST /functions/v1/schedules/ensure`

Request:

```json
{
  "organization_id": "uuid",
  "month": "2026-04"
}
```

Response:

```json
{
  "schedule_id": "uuid",
  "selected_version_id": "uuid",
  "finalized_version_id": null,
  "versions": [
    {
      "id": "uuid",
      "version_no": 1,
      "name": "V1",
      "status": "draft",
      "current_revision": 0
    }
  ]
}
```

#### B. `POST /functions/v1/schedules/:scheduleId/versions`

Request:

```json
{
  "base_version_id": "uuid-or-null",
  "name": "V2",
  "source_type": "re_solve",
  "input_diff_summary": {
    "changed_off_requests": 2,
    "changed_policy_rules": 0,
    "note": "2건의 off 요청 조정"
  }
}
```

동작:

- `latest_version_no + 1`로 version 생성
- `base_version_id`가 있으면 preferences와 locked assignments를 clone
- `selected_version_id`를 새 version으로 갱신

#### C. `POST /functions/v1/schedule-versions/:versionId/solve`

Response:

```json
{
  "schedule_version_id": "uuid",
  "status": "solving",
  "solver_execution_id": "ext-123"
}
```

동작:

- version 상태를 `solving`으로 전환
- solver request 생성
- solver execution id 저장

#### D. `PATCH /functions/v1/schedule-versions/:versionId/assignments`

Request:

```json
{
  "changes": [
    {
      "employee_id": "uuid",
      "date": "2026-04-12",
      "shift_id": "uuid"
    }
  ]
}
```

동작:

- assignment upsert
- `manual_edit_count` 증가
- `current_revision += 1`
- 상태를 `review_pending`으로 변경

#### E. `POST /functions/v1/schedule-versions/:versionId/recheck`

Response:

```json
{
  "schedule_version_id": "uuid",
  "current_revision": 3,
  "evaluation_id": "uuid",
  "result_status": "review_ready"
}
```

동작:

- current assignments 해시 계산
- evaluator 실행
- `schedule_evaluations` row 생성
- version 상태를 `review_ready` 또는 `review_blocked`로 갱신

#### F. `GET /functions/v1/schedule-versions/:versionId/review`

Response:

```json
{
  "version": {
    "id": "uuid",
    "version_no": 2,
    "name": "V2",
    "status": "review_ready",
    "current_revision": 3
  },
  "latest_evaluation": {
    "id": "uuid",
    "revision_no": 3,
    "result_status": "passed",
    "proof_summary": {},
    "violation_details": [],
    "infeasibility": null,
    "off_request_results": [],
    "comparison_metrics": {},
    "finalization_gate": {
      "allowed": true,
      "blocking_reasons": []
    }
  }
}
```

#### G. `GET /functions/v1/schedules/:scheduleId/compare`

Response:

```json
{
  "schedule_id": "uuid",
  "selected_version_id": "uuid",
  "versions": [
    {
      "id": "uuid",
      "version_no": 1,
      "name": "V1",
      "status": "review_ready",
      "input_diff_summary": {},
      "comparison_metrics": {},
      "finalizable": true
    }
  ]
}
```

#### H. `POST /functions/v1/schedule-versions/:versionId/finalize`

동작 순서:

1. version row lock
2. latest evaluation row lock
3. `latest_evaluation.revision_no == version.current_revision` 검증
4. `latest_evaluation.result_status == passed` 검증
5. schedule container의 `finalized_version_id`, `selected_version_id`, `finalized_at`, `finalized_by` 갱신
6. version 상태를 `finalized`로 변경
7. `fairness_ledger_monthly` upsert

실패 시 `409` 또는 `422` 반환:

- `stale_evaluation`
- `review_not_passed`
- `already_finalized`

## 8. Frontend 구조

### 8.1 라우트

Phase2A에서는 기존 route를 최대한 유지한다.

| Route                                            | Action                          |
| ------------------------------------------------ | ------------------------------- |
| `/schedule/step1`                                | 유지                            |
| `/schedule/step2`                                | 유지                            |
| `/schedule/step3`                                | 유지                            |
| `/schedule/step4`                                | 유지                            |
| `/schedule/step5/:scheduleId?version=:versionId` | `Review Hub`로 확장             |
| `/setup`                                         | 신규, admin bootstrap checklist |
| `/settings/off-request-policy`                   | 신규, 정책 관리                 |

핵심 방침:

- `Step5Result.vue`를 버리지 않고 review hub로 확장한다.
- version 선택은 path 추가보다 query parameter가 migration diff를 줄인다.

### 8.2 Step5 Review Hub

기존 [Step5Result.vue](../../src/views/schedule/Step5Result.vue)를 다음 구조로 확장한다.

```text
Review Hub
  - Header: selected version, status badge, finalization gate
  - Left panel: candidate version list
  - Main tab 1: assignment grid
  - Main tab 2: hard-constraint proof
  - Main tab 3: unfulfilled off requests
  - Main tab 4: version compare
  - Footer actions: re-solve, save edit, recheck, finalize, export
```

새 UI 규칙:

- `review_pending`이면 `Finalize` 비활성화
- `review_blocked`이면 `Finalize` 비활성화, 위반 상세 노출
- `infeasible`이면 assignment grid 대신 infeasibility panel 우선 노출
- `solve_failed`이면 retry CTA와 운영자용 trace id 노출

### 8.3 Step4 변경

Step4는 더 이상 “월별 단일 schedule 생성”이 아니다.

변경 사항:

- `createSchedule()`는 container 확보용으로만 사용하거나 `ensure schedule` endpoint로 대체
- 최초 진입 시 기본 version `V1`을 확보
- off 요청 저장 대상은 `schedule_id`가 아니라 `schedule_version_id`
- “다음 단계” 이동 시 `scheduleId + versionId`를 Step5로 넘김

### 8.4 Step3 변경

현재 [Step3EmployeeInfo.vue](../../src/views/schedule/Step3EmployeeInfo.vue)는 직원 재저장 시 month schedule을 삭제한다.

Phase2A에서는 아래 규칙으로 바꾼다.

- finalized version이 존재하면 직원 저장을 막고 안내 문구를 띄운다.
- unfinalized version만 있으면 “현재 month의 draft/version이 무효화된다”는 명시적 확인 후 reset한다.
- employee roster hash가 바뀌면 기존 version compare는 폐기하고 새 version 또는 새 container flow를 시작한다.

### 8.5 Pinia 상태 추가

`useScheduleStore` 추가 필드:

```ts
selectedVersionId: string | null
versions: ScheduleVersionSummary[]
latestEvaluation: ScheduleEvaluation | null
compareMatrix: ScheduleCompareResponse | null
reviewTab: 'grid' | 'proof' | 'offRequests' | 'compare'
setupChecklist: SetupChecklistState | null
```

## 9. Solver / Evaluator 통합

### 9.1 기본 원칙

- solver는 “후보 assignment 생성기”다.
- backend evaluator는 “검증기이자 설명기”다.
- finalization은 evaluator 결과를 기준으로만 가능하다.

### 9.2 Solver request

현재 `mapToSolverRequest()`의 골격은 유지한다.

Phase2A 추가 계약:

- input source는 `selected version` 기준이다.
- previous-month history는 `is_locked = true`로 유지한다.
- current-month locked assignment가 생기면 same version re-solve 시 `history` 또는 별도 `locked_assignments`로 포함한다.
- fairness ledger가 구현되면 optional `fairness_context`를 추가한다.

Phase2A에서 solver 응답에 반드시 필요한 추가 필드:

| Field             | Purpose                                      |
| ----------------- | -------------------------------------------- |
| `failure_type`    | `infeasible` 또는 `system_error` 구분        |
| `failure_context` | infeasible date/shift/headcount 등 최소 설명 |

이 추가 계약은 UI 표시를 위한 것이 아니라 backend classification을 위한 최소 신호다.

### 9.3 Evaluator 책임

backend evaluator 입력:

- current version assignments
- shifts
- site requirements
- employees + available shifts + rank code
- schedule preferences
- off-request policy rules
- fairness ledger

backend evaluator 출력:

- hard constraint 집계
- 위반 상세 목록
- off 요청별 fulfilled/unfulfilled explanation
- compare metrics
- finalization gate

### 9.4 `review_blocked` vs `infeasible` vs `solve_failed`

구분 규칙:

- solver가 assignment를 반환했고 evaluator가 hard violation을 찾음 -> `review_blocked`
- solver가 feasible assignment를 만들지 못했다고 failure_type으로 반환함 -> `infeasible`
- timeout, 5xx, invalid payload, persistence failure -> `solve_failed`

예시:

- `NOD` 발견 -> `review_blocked`
- `Night 4연속` 발견 -> `review_blocked`
- “4월 12일 N 3명 필요, 가능한 인원 2명” -> `infeasible`
- solver polling timeout -> `solve_failed`

## 10. Finalization 규칙

finalization은 다음 조건을 모두 만족할 때만 허용한다.

- 선택된 version의 상태가 `review_ready`
- latest evaluation 존재
- `latest_evaluation.revision_no == version.current_revision`
- `latest_evaluation.result_status == passed`
- container가 아직 finalized되지 않음

finalization 후 규칙:

- finalized version은 읽기 전용
- 다른 version은 compare history로 남길 수 있으나 Phase2A UI에서는 재활성화하지 않는다
- fairness ledger는 finalized version assignment 기준으로만 적재한다

## 11. Failure Mode Registry

| Failure Mode                                   | Classification    | Handling                          | Observability                             |
| ---------------------------------------------- | ----------------- | --------------------------------- | ----------------------------------------- |
| solver timeout                                 | `solve_failed`    | retry 허용, status badge 표시     | execution id, retry count, timeout metric |
| solver 5xx                                     | `solve_failed`    | retry 허용                        | error log, response body trace            |
| infeasible month                               | `infeasible`      | infeasibility panel 표시          | infeasible count metric                   |
| stale evaluation finalize 시도                 | business error    | finalize 차단                     | `409 stale_evaluation` log                |
| manual edit 후 미재검증                        | business error    | finalize disabled                 | version status metric                     |
| off-request policy 위반 입력                   | validation error  | 저장 차단 또는 rejected 상태 저장 | policy rejection audit                    |
| Step3 직원 재저장으로 finalized data 파손 시도 | business error    | 직원 저장 차단                    | admin action audit                        |
| fairness ledger 중복 적재                      | consistency error | unique key로 차단                 | finalize transaction error log            |

## 12. Observability

최소 관측 포인트:

- `schedule_id`
- `schedule_version_id`
- `revision_no`
- `solver_execution_id`
- `evaluation_id`
- `result_status`
- `finalization_allowed`
- `blocking_reason_codes`

권장 로그 이벤트:

- `version_created`
- `solver_started`
- `solver_completed`
- `evaluation_saved`
- `manual_edit_saved`
- `recheck_completed`
- `finalization_succeeded`
- `finalization_blocked`

## 13. 테스트 전략

### 13.1 Unit

- evaluator rule calculators
- compare metric reducer
- rank policy resolver
- finalization gate function
- version status mapper

### 13.2 Integration

- `ensure schedule -> create version -> solve -> evaluation 저장`
- `manual edit -> review_pending -> recheck -> review_ready`
- `review_blocked` version finalize 차단
- `infeasible` 응답 저장 및 표시
- `finalize -> fairness ledger upsert`
- `rank_code NULL -> organization default policy fallback`

### 13.3 E2E

- V1 생성 후 V2 생성, compare 후 V2 finalize
- Step5 수동 수정 후 finalize 버튼 비활성화
- recheck 성공 후 finalize 가능
- infeasible 버전에서 explanation panel 확인
- setup checklist 완료 후 policy screen 진입

## 14. 구현 순서

### Phase 1. Schema foundation

- `schedule_versions`
- `schedule_evaluations`
- `schedule_assignments.schedule_version_id`
- `schedule_preferences.schedule_version_id`
- `employees.rank_code`

### Phase 2. Review hub foundation

- `ensure schedule`
- `create version`
- `get review`
- Step5 version selector + status badge

### Phase 3. Evaluator and finalization

- backend evaluator
- `recheck`
- `finalize`
- stale evaluation block

### Phase 4. Compare

- compare API
- compare table
- input diff summary rendering

### Phase 5. Go-Live Ops Layer

- `profiles`
- `/setup`
- `organization_rank_codes`
- `off_request_policy_rules`

### Phase 6. Fairness ledger

- finalize write path
- optional solver fairness_context

## 15. Phase2A Cut Lines

Phase2A에서 의도적으로 하지 않는 것:

- finalized month reopen UI
- manual baseline import
- 수기안과 자동안 before/after 비교를 core flow에 포함
- employee self-signup
- full RBAC
- 고도화된 운영 대시보드

## 16. 바로 구현 착수 가능한 기준

이 문서는 아래 항목을 구현 착수 기준으로 제공한다.

- DB schema delta
- API boundary
- route/screen change direction
- version lifecycle
- evaluator/finalize transaction
- failure/test plan

즉, 본 문서 기준으로는 “엔지니어링 설계를 다시 토론하는 단계”가 아니라 “migration과 endpoint 설계부터 바로 들어가는 단계”다.
