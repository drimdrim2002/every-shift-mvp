# 단일 월 근무표 정책 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use @superpowers:subagent-driven-development (recommended) or @superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 한 조직의 한 계획 월에서 Step4/Step5가 하나의 `schedule-id + schedule_version_id`만 사용하도록 UI, route, API 방어, 테스트를 정리한다.

**Architecture:** 기존 `schedule_versions` 모델은 유지하고, MVP 화면에서는 canonical active version 하나만 선택한다. Step4는 같은 version에 Off 요청을 저장하고 현재 월 배정 결과만 초기화하며, Step5는 compare/candidate 흐름을 숨긴 채 같은 version으로 solve/regenerate/finalize한다. 서버는 오래된 클라이언트나 직접 API 호출이 새 active version을 만드는 것을 방어적으로 거절한다.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vite, Pinia, Naive UI, Supabase Edge Function, Vitest, Playwright.

---

상태: 초안 - Eng Review 및 Writing Plans 보강 반영

작성일: 2026-05-14

대상 화면:

- `src/views/schedule/Step4InitialData.vue`
- `src/views/schedule/Step5Result.vue`

## 1. 배경

현재 Step4에서 Off 요청을 확정하고 AI Solver를 호출한 뒤 Step5에서 결과를 확인하고 확정하는 과정에서, 여러 근무표안/version 흐름이 섞이며 데이터 불일치가 발생할 수 있다.

이 문서는 구현 전에 정책을 먼저 고정하기 위한 요구사항 문서다. 이 문서만으로는 코드 동작을 변경하지 않는다.

## 2. 핵심 정책

한 계획 월에는 하나의 근무표만 허용한다.

여기서 "하나의 근무표"는 아래 두 값을 모두 포함한다.

- `schedule-id`: 계획 월의 스케줄 식별자
- `schedule_version_id`: 해당 계획 월에서 Step4/Step5가 사용하는 단일 버전 식별자

즉, 한 조직의 한 계획 월에서는 Step4에서 Step5로 넘어가거나 Step5에서 다시 Step4로 돌아와도 `schedule-id`와 `schedule_version_id`가 계속 고정된다.

## 3. 사용자 흐름

### 3.1 최초 생성

1. 사용자가 Step4에 진입한다.
2. Step4는 사용자에게 "근무표 버전" 또는 "근무표안 이름"을 묻지 않는다.
3. 사용자가 Off 요청을 입력하거나 수정한다.
4. 사용자가 `근무표 생성(AI)`를 누른다.
5. 현재 고정된 `schedule-id`와 `schedule_version_id`에 Off 요청을 저장한다.
6. Step5로 이동해 같은 `schedule_version_id`로 AI Solver를 실행한다.
7. Step5에서 결과를 확인하고 필요하면 수동 수정 후 확정한다.

### 3.2 Step5에서 Off 요청 수정

1. 사용자가 Step5에서 `Off 수정`을 선택한다.
2. Step4로 돌아간다.
3. 이때 새 `schedule-id`나 새 `schedule_version_id`를 만들지 않는다.
4. 사용자가 Off 요청을 수정한다.
5. 사용자가 다시 `근무표 생성(AI)`를 누른다.
6. 같은 `schedule-id`와 같은 `schedule_version_id`에 Off 요청을 업데이트한다.
7. 기존 생성 결과는 같은 버전 안에서 재생성 대상으로 처리한다.
8. Step5에서 새 결과를 확인하고 확정한다.

## 4. 데이터 처리 원칙

### 4.1 고정해야 하는 값

- Step4 진입 시 별도 version 선택 UI를 표시하지 않는다.
- Step4/Step5 왕복 중 `schedule-id`는 바뀌지 않는다.
- Step4/Step5 왕복 중 `schedule_version_id`도 바뀌지 않는다.
- Step4의 Off 요청 저장 대상은 항상 현재 계획 월의 고정 `schedule_version_id`다.
- AI Solver 요청 대상도 항상 같은 `schedule_version_id`다.

### 4.2 Off 요청 수정 후 재생성

Off 요청이 변경된 뒤 다시 AI Solver를 실행할 때는 기존 `schedule_version_id`를 업데이트하는 방식을 기본값으로 한다.

권장 처리:

1. 같은 `schedule_version_id`에 Off 요청을 저장한다.
2. 같은 `schedule_version_id`의 현재 계획 월 배정 결과를 초기화한다.
3. 같은 `schedule_version_id`로 AI Solver를 다시 실행한다.
4. 새 Solver 결과가 같은 `schedule_version_id`의 배정 결과를 덮어쓴다.

이 방식은 `schedule-id` 삭제 후 재생성보다 안전하다. 사용자의 월별 작업 컨텍스트가 유지되고, 화면 이동과 URL이 안정적으로 유지된다.

### 4.3 문제가 발생한 생성 결과

근무표 생성 중 오류가 발생했고 사용자가 Off 요청을 수정한 뒤 다시 생성하려는 경우에도 기본 정책은 "기존 `schedule_version_id` 업데이트"다.

예외적으로 전체 스케줄 데이터가 복구 불가능한 상태라면 별도의 `근무표 전체 삭제` 기능으로 사용자가 명시적으로 월 전체를 삭제한 뒤 새로 시작한다.

## 5. UI 정책

### 5.1 Step4

- Step4 진입 시 기존 결과가 있더라도 "기존 결과 보기 / 요청 수정해서 새 근무표안 만들기" 선택 모달을 띄우지 않는다.
- Step4에서 "새 근무표안 이름" 모달을 띄우지 않는다.
- Step4의 주요 CTA는 현재 상태에 따라 아래처럼 단순화한다.
  - 생성 결과가 없거나 Off 요청이 바뀐 경우: `근무표 생성(AI)`
  - 생성 결과가 있고 변경이 없는 경우: `결과 확인으로 이동`
- Step4는 version query가 있더라도 사용자에게 version 선택 개념을 노출하지 않는다.

### 5.2 Step5

- `Off 수정`은 같은 `schedule-id`와 같은 `schedule_version_id`로 Step4에 돌아간다.
- `근무표안 비교`는 단일 버전 정책에서는 기본 화면에서 숨긴다.
- 여러 근무표안을 선택하거나 삭제하는 UI는 단일 버전 정책에 맞게 제거하거나 단순화한다.
- `더 개선하기`는 새 근무표안을 만드는 기능이 아니라 같은 `schedule_version_id`를 다시 생성하는 기능으로 해석한다.

## 6. Writing Plans 리뷰

이 문서는 정책과 Eng Review는 충분하지만, `@superpowers:writing-plans` 기준에서는 바로 실행하기에 부족한 부분이 있었다.

보강해야 할 핵심은 아래 4가지다.

1. Agentic worker가 첫 화면에서 목표, 아키텍처, 기술 스택을 바로 이해할 수 있는 plan header가 필요하다.
2. "Phase" 수준의 설명만으로는 구현자가 너무 많은 판단을 해야 하므로, 파일별 책임과 변경 순서를 먼저 고정해야 한다.
3. 테스트를 "추가한다"가 아니라 "실패하는 테스트 작성 -> 실패 확인 -> 최소 구현 -> 통과 확인" 단위로 쪼개야 한다.
4. 각 작업은 exact file path, exact command, expected result, commit checkpoint를 가져야 한다.

### 6.1 파일 구조와 책임

| 파일                                                  | 책임                                                    | 변경 원칙                                                                                                                            |
| ----------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `src/utils/scheduleVersionResolver.ts`                | Step4/Step5의 canonical version 결정과 route query 정리 | 단일-version 선택 규칙은 여기의 작은 pure helper로 모은다. 새 store/service를 만들지 않는다.                                         |
| `src/views/schedule/Step4InitialData.vue`             | Off 요청 입력, 저장, Step5 handoff                      | 새 version 생성/이름 입력/기존 결과 선택 분기를 제거하고 same-version save/reset/route만 남긴다.                                     |
| `src/views/schedule/Step5Result.vue`                  | 결과 확인, 수동 수정, 재생성, 확정                      | `Off 수정`, `근무표 생성(AI)`, `더 개선하기`는 모두 현재 `previewVersionId`만 사용한다. compare/candidate UI는 기본 흐름에서 숨긴다. |
| `src/api/schedule.ts`                                 | 프론트엔드 API wrapper                                  | 기존 함수 signature를 유지한다. Step4/Step5가 새 version 생성 wrapper를 부르지 않도록 테스트로 고정한다.                             |
| `supabase/functions/phase2-schedule/http.ts`          | Edge Function error boundary                            | `single_version_policy_violation`이 plain error code로 들어와도 409로 매핑되도록 방어한다.                                           |
| `supabase/functions/phase2-schedule/repository.ts`    | 서버 write guard                                        | `creationMode: 'new'` 요청을 단일-version MVP 정책 위반으로 거절한다. overwrite/reset/solve의 기존 conflict mapping은 유지한다.      |
| `tests/unit/schedule-version-resolver.spec.ts`        | canonical version 선택 단위 테스트                      | finalized, selected, latest executed, draft fallback, invalid query canonicalization을 고정한다.                                     |
| `tests/unit/step4-initial-data.spec.ts`               | Step4 regression tests                                  | 모달 미노출, `createPhase2ScheduleVersion` 미호출, same-version save/reset/route를 고정한다.                                         |
| `tests/unit/step5-result.spec.ts`                     | Step5 regression tests                                  | compare hidden, same-version `Off 수정`, same-version regenerate/autostart를 고정한다.                                               |
| `tests/unit/phase2-schedule-http.spec.ts`             | error boundary expectations                             | single-version policy error code가 409로 내려가는지 고정한다.                                                                        |
| `tests/unit/phase2-schedule-write-repository.spec.ts` | server write guard tests                                | `creationMode: 'new'` 거절과 기존 conflict mapping 보존을 검증한다.                                                                  |
| `tests/e2e/step4-existing-result-flow.spec.ts`        | 기존 skipped Step4 existing-result flow                 | 기존 다중-version UX 기대값을 단일-version UX 기대값으로 바꿔 skip을 제거한다.                                                       |
| `tests/e2e/schedule-workflow.spec.ts`                 | end-to-end smoke                                        | 신규 월 생성과 확정 월 read-only 흐름이 깨지지 않는지 확인한다.                                                                      |

### 6.2 구현 단계 제안

#### Phase 0: 요구사항 확정

- 이 문서의 정책과 열린 질문을 검토한다.
- `schedule_version_id`까지 단일로 고정한다는 결정을 확정한다.
- 기존 다중 version 데이터 처리 방침을 확정한다.

#### Phase 1: 회귀 테스트 먼저 추가

- Step4가 version-name modal을 띄우지 않는 테스트를 추가한다.
- Step4가 `createPhase2ScheduleVersion`을 호출하지 않는 테스트를 추가한다.
- Off 요청 변경 후 같은 `schedule_version_id`의 생성 결과만 초기화하는 테스트를 추가한다.
- Step5 `Off 수정`이 같은 version으로 Step4에 돌아가는 테스트를 추가한다.
- Step5 비교 UI가 숨겨지는 테스트를 추가한다.

#### Phase 2: Step4 흐름 단순화

- Step4의 기존 version 선택/생성 분기를 제거하거나 비활성화한다.
- `handleNext`는 새 version 생성 대신 현재 version에 저장하고 Step5로 이동한다.
- Off 요청이 바뀐 경우 현재 계획 월의 기존 배정 결과를 초기화한 뒤 Step5에서 auto-start 되도록 한다.

#### Phase 3: Step5 흐름 단순화

- Step5의 `Off 수정`이 같은 고정 version으로 Step4에 돌아가도록 정리한다.
- 비교 UI와 다중 version 관련 액션을 숨기거나 제거한다.
- 재생성/재시도는 같은 version을 대상으로만 실행한다.

#### Phase 4: 서버/데이터 보호

- 프론트엔드만으로는 새 version 생성을 완전히 막을 수 없으므로 서버 API에도 단일 active version 정책을 적용할지 검토한다.
- 기존 월에 다중 version이 있는 경우 마이그레이션 또는 표시 정책을 정한다.
- 확정된 월은 Off 수정과 재생성을 막는지 확인한다.

#### Phase 5: QA

- 신규 월 최초 생성
- Step5 결과 확인 후 Off 수정
- Solver 실패 후 Off 수정 재생성
- Step5 수동 수정 후 저장
- 확정 후 읽기 전용
- 기존 다중 version 월 진입

## 7. 완료 기준

- Step4 진입 시 사용자가 근무표 version을 선택하거나 이름을 입력하지 않는다.
- 한 계획 월의 Step4/Step5 흐름에서 `schedule-id`가 변하지 않는다.
- 한 계획 월의 Step4/Step5 흐름에서 `schedule_version_id`가 변하지 않는다.
- Off 요청 수정 후 재생성해도 새 version row가 생기지 않는다.
- Step5 `Off 수정` 후 다시 생성해도 같은 version에 결과가 업데이트된다.
- 기존 생성 결과와 새 Off 요청이 섞여 보이지 않는다.
- `pnpm lint:check`와 `pnpm run build`가 통과한다.

## 8. 열린 질문

1. 기존에 이미 여러 `schedule_versions`가 있는 월은 어떻게 처리할 것인가?
   - 추천: finalized version이 있으면 finalized version을 기준으로 읽기 전용 처리한다. finalized가 없으면 selected version 하나만 남기고 나머지는 archive 대상으로 본다.

2. 확정된 근무표에서 Off 수정을 허용할 것인가?
   - 추천: MVP에서는 허용하지 않는다. 확정 후 수정은 별도 정책이 필요하다.

3. Step5 수동 수정이 저장되지 않은 상태에서 `Off 수정`을 누르면 어떻게 할 것인가?
   - 추천: 저장 또는 변경 취소를 먼저 요구한다.

4. Solver가 실행 중일 때 `Off 수정`을 허용할 것인가?
   - 추천: 허용하지 않는다. 실행 중에는 Step5에서 진행 상태만 보여준다.

5. 서버 API에서 새 version 생성 자체를 막을 것인가?
   - 추천: 프론트엔드 정리 후 서버에도 동일 정책을 방어적으로 추가한다.

## 9. Eng Review 결론

추천 방향은 "기존 version 모델은 유지하되, MVP 화면에서는 한 계획 월의 단일 active version만 쓰도록 잠그는 것"이다.

이 정책은 기존 Phase2의 `schedule_versions` 테이블을 제거하는 변경이 아니다. 이번 변경은 Step4/Step5 사용자 흐름에서 새 후보안을 만들거나 비교하게 하는 UI와 분기를 걷어내고, 이미 존재하는 `schedule-id + schedule_version_id`를 계속 재사용하도록 강제하는 범위다.

### 9.1 Scope Challenge

#### 기존에 이미 있는 것

| 하위 문제                    | 이미 있는 코드/흐름                                                                                    | 재사용 판단                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| 월별 schedule container 확보 | `ensurePhase2Schedule()`                                                                               | 재사용한다. 새 월 생성 API를 만들지 않는다.                    |
| Step4 진입 시 version 결정   | `resolveStep4VersionState()`                                                                           | 단일 active version 규칙으로 축소해 재사용한다.                |
| Step4 Off 요청 저장          | `saveScheduleVersionPreferences()`                                                                     | 재사용한다. 저장 대상은 항상 현재 `previewVersionId`다.        |
| 현재 월 배정 결과 초기화     | `deleteThisMonthVersionAssignments()` 및 `deletePhase2ScheduleGeneratedResults(..., selected_version)` | 재사용하되 호출 위치와 범위를 명확히 한다.                     |
| Step5 같은 version 재생성    | `handleRegenerate()` -> `handleStartSolver()`                                                          | 이미 새 version을 만들지 않는다. 이 정책의 기준 구현으로 둔다. |
| Step5 autoStart handoff      | `buildStep5Route(..., { autoStart })` 및 `consumeRouteAutoStart()`                                     | 재사용한다. Step4가 같은 version으로 넘기는지만 고친다.        |
| Step5 version 상태 동기화    | `useScheduleReviewHub()`                                                                               | 재사용한다. 단, compare/preview 전환 UX는 숨긴다.              |

#### 최소 변경 범위

1. Step4에서 기존 결과 선택 모달, edit-off draft version 모달, 새 근무표안 이름 모달을 제거하거나 단일-version 정책 뒤에 완전히 숨긴다.
2. Step4 `handleNext()`는 `createPhase2ScheduleVersion()`을 호출하지 않고 현재 `previewVersionId`에 Off 요청을 저장한다.
3. Off 요청이 바뀐 상태에서 생성 버튼을 누르면 현재 `previewVersionId`의 현재 월 배정 결과를 초기화하고 Step5로 `autoStart=1`을 넘긴다.
4. Step5 `Off 수정`, `더 개선하기`, `근무표 생성(AI)`는 모두 현재 `previewVersionId`만 대상으로 동작한다.
5. Step5 비교, 후보 선택, 후보 삭제 UI는 단일-version MVP에서는 숨긴다.
6. 서버는 프론트엔드 실수나 오래된 탭을 막기 위해 "이미 active version이 있는 월에서 새 active version 생성"을 방어적으로 거절하거나, 단일-version endpoint만 허용한다.

#### 복잡도 기준

구현이 8개 이상 파일을 건드리거나 새 서비스/클래스를 2개 이상 추가하면 과설계 신호로 본다.

권장 파일 범위:

- `src/views/schedule/Step4InitialData.vue`
- `src/views/schedule/Step5Result.vue`
- `src/utils/scheduleVersionResolver.ts`
- `src/api/schedule.ts`
- `supabase/functions/phase2-schedule/http.ts`
- `supabase/functions/phase2-schedule/repository.ts`
- 관련 unit/e2e test 파일

새 composable이나 새 store를 만들기 전에, Step4/Step5에 이미 있는 version-state 흐름을 줄이는 방식으로 먼저 해결한다.

#### Search Check

새 라우팅, 상태관리, 동시성 프레임워크는 필요 없다.

- Vue Router query는 이미 `autoStart` handoff에 충분하다.
- Pinia store의 `selectedVersionId`/`previewVersionId`가 이미 authoritative client state 역할을 한다.
- 서버 동시성은 기존 RPC/constraint와 version status guard를 재사용한다.

따라서 이번 변경은 Layer 1 접근이다. 검증된 기존 Vue/Pinia/API 경계 안에서 scope를 줄인다.

#### Completeness Check

프론트엔드 UI만 숨기는 것은 불완전하다. 오래된 탭, 직접 API 호출, 테스트 fixture가 여전히 새 version 생성을 유발할 수 있다.

완전한 변경은 다음 3가지를 모두 포함한다.

1. Step4/Step5 UI와 route handoff 정리
2. 서버 API 방어 정책 추가
3. 회귀 테스트와 e2e 정책 테스트 추가

## 10. Architecture Review

### 10.1 권장 데이터 흐름

```text
Step4 enter
  |
  v
ensurePhase2Schedule(org, month)
  |
  v
resolve single active version
  |
  +-- finalized version exists --> Step4 read-only/block edit -> Step5 read-only
  |
  +-- draft/review version exists --> load preferences for that version
  |
  v
User edits Off requests
  |
  v
Save preferences to same schedule_version_id
  |
  v
Did current-month assignments already exist?
  |
  +-- no  --> route Step5(version=same, autoStart=1)
  |
  +-- yes --> reset current-month assignments for same version
              reset preference resolution for same version
              route Step5(version=same, autoStart=1)
```

Step5는 새 version을 만들지 않는다.

```text
Step5(version=same)
  |
  +-- autoStart=1 and no assignments and not solving
  |     |
  |     v
  |   build solver request from same version preferences
  |     |
  |     v
  |   startSolver(same schedule_version_id)
  |
  +-- Off 수정
  |     |
  |     v
  |   route Step4(version=same)
  |
  +-- 더 개선하기
        |
        v
      startSolver(same schedule_version_id)
```

### 10.2 Version 상태 정책

```text
draft
  |
  | create/recreate same version
  v
solving
  |
  +-- success --> review_ready
  |
  +-- policy/evaluator block --> review_blocked
  |
  +-- solver infeasible --> infeasible
  |
  +-- transport/runtime failure --> solve_failed

review_ready/review_blocked/infeasible/solve_failed
  |
  +-- Off 수정 --> same version preferences update + current-month assignment reset
  |
  +-- 더 개선하기/재시도 --> same version solve
  |
  +-- 확정 --> finalized

finalized
  |
  +-- Step4 Off 수정 blocked
  +-- Step5 manual edit/solver blocked
```

### 10.3 서버 API 방어선

프론트엔드에서 `createPhase2ScheduleVersion()` 호출을 제거해도 서버 방어선은 필요하다.

권장:

1. MVP 단일-version 정책에서는 Step4/Step5에서 `/schedules/:scheduleId/versions`를 호출하지 않는다.
2. 서버는 finalized schedule, solving version, archived version에 대한 overwrite/reset/solve 요청을 기존처럼 거절한다.
3. 서버는 단일-version 모드에서 `creationMode: 'new'` 요청이 들어오면 `single_version_policy_violation`으로 거절한다.
4. 실패 version 재사용은 "새 version 생성"이 아니라 같은 version의 상태와 결과를 초기화한 뒤 다시 solve하는 방식으로 통일한다.

단, 운영 데이터에 이미 여러 version이 있는 월은 즉시 삭제하지 않는다. 최초 진입 시 읽을 canonical version 하나를 고르고 나머지는 숨김/보존 처리한다.

### 10.4 기존 다중 version 월 선택 규칙

기존 월에 여러 `schedule_versions`가 있으면 아래 우선순위로 canonical version을 결정한다.

```text
1. finalized_version_id가 있으면 finalized version
2. selected_version_id가 있고 archived가 아니면 selected version
3. 가장 최근 실행 이력이 있는 non-archived version
4. 가장 낮은 version_no의 draft version
```

canonical이 아닌 version은 MVP UI에서 비교/선택 대상으로 노출하지 않는다.

## 11. Code Quality Review

### 11.1 제거하거나 숨길 분기

Step4:

- `showExistingHistoryChoiceModal`
- `isEditOffStartModalOpen`
- `isVersionNameModalOpen`
- `handleConfirmEditOffDraftStart()`
- `routeFirstRunAfterName()`
- `createAndRouteReSolveVersion()`
- `executePendingHandoff()`
- `openVersionNameModal(...)` 호출부

Step5:

- `shouldShowCompareAction`
- `ScheduleCompareModal`
- 후보 version focus/select/delete 액션
- `selectedDeleteScope === 'all_active_versions'`
- "새 근무표안을 만들 수 없습니다" 류 copy

주의: 한 번에 큰 삭제를 하기보다, 먼저 feature flag 없이 단일 정책으로 조건을 고정하고 테스트를 녹색으로 만든 뒤 dead code를 정리한다. 구조 변경과 동작 변경을 한 커밋에 과하게 섞지 않는다.

### 11.2 이름 정리

사용자에게 보이는 한국어 문구는 "근무표안"보다 "근무표" 또는 "현재 근무표"를 기본으로 쓴다.

예:

- `근무표 생성(AI)`
- `결과 확인으로 이동`
- `Off 수정`
- `현재 근무표는 확정되어 수정할 수 없습니다.`

내부 타입과 DB 컬럼은 기존 `schedule_version_id`를 유지한다. DB 모델까지 단일-version 이름으로 바꾸면 scope가 커진다.

### 11.3 DRY 기준

Step4와 Step5가 각각 "현재 version이 수정 가능한가"를 다른 방식으로 판단하면 회귀가 생긴다.

권장:

- 기존 `previewVersionStatus`, `canMutatePreviewVersion`, `isVersionReadOnly` 계열 판단을 Step5에서 유지한다.
- Step4는 `baselineState.previewVersionId`와 compare response의 finalized/solving 상태만 확인한다.
- 공통화가 필요하면 새 대형 service가 아니라 `scheduleVersionResolver.ts`의 작은 pure helper로 제한한다.

## 12. Test Review

테스트 프레임워크는 Vitest unit test와 Playwright e2e를 사용한다.

### 12.1 Code Path Coverage Diagram

```text
CODE PATH COVERAGE
==================
[ ] src/views/schedule/Step4InitialData.vue
    |
    +-- Step4 mount -> ensurePhase2Schedule -> resolve canonical single version
    |   +-- [GAP] no existing schedule/version -> bootstrap version loaded, no name modal
    |   +-- [GAP] existing executed version -> no existing-result choice modal
    |   +-- [GAP] multiple legacy versions -> canonical version chosen, others hidden
    |   +-- [GAP] finalized version -> edit/generate blocked
    |
    +-- handleNext()
    |   +-- [GAP] no Off changes + no assignments -> route Step5 same version autoStart=1
    |   +-- [GAP] no Off changes + assignments exist -> route Step5 same version autoStart omitted
    |   +-- [GAP] Off changes + assignments exist -> save preferences, reset same-version assignments, route autoStart=1
    |   +-- [GAP] unapplied draft exists -> block transition
    |   +-- [GAP] save/reset API failure -> user-facing error, stay on Step4
    |   +-- [REGRESSION GAP] createPhase2ScheduleVersion is never called from Step4
    |
    +-- clear all Off requests
        +-- [GAP] local clear only before save
        +-- [GAP] saved clear persists to same version

[ ] src/views/schedule/Step5Result.vue
    |
    +-- Off 수정
    |   +-- [PARTIAL] unsaved manual changes require confirmation
    |   +-- [GAP] route Step4 with same version only
    |   +-- [GAP] solving/finalized state blocks edit
    |
    +-- autoStart
    |   +-- [PARTIAL] consumes autoStart once
    |   +-- [GAP] same-version only after Step4 reset
    |   +-- [GAP] another active solving version blocks and strips autoStart
    |
    +-- 더 개선하기 / 재시도
    |   +-- [PARTIAL] re-solves current preview version without createVersion
    |   +-- [GAP] changed manual cells block regenerate
    |
    +-- compare / select / delete candidate version UI
        +-- [GAP] compare button hidden under single-version policy
        +-- [GAP] candidate selection/deletion unreachable in default Step5 UI

[ ] supabase/functions/phase2-schedule
    |
    +-- createVersion
    |   +-- [GAP] single-version policy rejects creationMode=new for active MVP month
    |   +-- [GAP] finalized/solving/archived errors remain mapped
    |
    +-- deleteGeneratedResults selected_version
        +-- [GAP] resets only current canonical version
        +-- [GAP] all_active_versions is not used by MVP UI
```

### 12.2 User Flow Coverage Diagram

```text
USER FLOW COVERAGE
==================
[ ] 신규 월 최초 생성
    +-- [GAP] Step4 opens without version name modal
    +-- [GAP] 근무표 생성(AI) routes to Step5 with same version
    +-- [GAP] Step5 auto-starts solver once

[ ] Step5 결과 확인 후 Off 수정
    +-- [GAP] Off 수정 returns to Step4 same version
    +-- [GAP] modified Off request resets current-month result only
    +-- [GAP] regenerated result overwrites same version

[ ] Solver 실패 후 Off 수정 재생성
    +-- [GAP] no failed-version overwrite/name collision modal
    +-- [GAP] same version returns to solving

[ ] Step5 수동 수정 후 저장
    +-- [PARTIAL] manual changes save through preview-version patch route
    +-- [GAP] Off 수정 requires save/discard before leaving

[ ] 확정 후 읽기 전용
    +-- [PARTIAL] finalized Step5 read-only exists
    +-- [GAP] finalized Step4 blocks Off edit and generation

[ ] 기존 다중 version 월 진입
    +-- [GAP] canonical version chosen deterministically
    +-- [GAP] compare UI hidden
    +-- [GAP] hidden versions are not deleted implicitly
```

Coverage target: 위 GAP은 구현 PR에서 모두 테스트로 닫는다.

### 12.3 Required Unit Tests

`tests/unit/step4-initial-data.spec.ts`

- Step4 진입 시 `이미 만든 근무표안이 있습니다` 모달을 띄우지 않는다.
- Step4 진입 시 `새 근무표안 이름` 모달을 띄우지 않는다.
- `handleNext()` happy path에서 `createPhase2ScheduleVersionMock`이 호출되지 않는다.
- Off 요청 변경 후 생성 시 `saveScheduleVersionPreferences`가 현재 `previewVersionId`로 호출된다.
- 기존 현재 월 배정이 있으면 같은 `previewVersionId` 범위만 초기화한다.
- finalized version이면 Off 수정/생성 CTA가 차단된다.
- legacy multiple versions 응답에서 canonical version 하나만 Step4 기준 version으로 선택된다.

`tests/unit/step5-result.spec.ts`

- `Off 수정`이 `buildStep4RouteLocation({ versionId: previewVersionId })`로 이동한다.
- `근무표안 비교` 버튼이 단일-version 정책에서 보이지 않는다.
- `더 개선하기`가 `createPhase2ScheduleVersion` 없이 `startSolver(previewVersionId, ...)`만 호출한다.
- autoStart는 같은 `previewVersionId`에서 한 번만 실행된다.
- unsaved manual changes가 있으면 `Off 수정` 이동을 확인 dialog로 막는다.
- finalized/solving 상태에서는 `Off 수정`과 재생성이 막힌다.

`tests/unit/schedule-version-resolver.spec.ts`

- finalized version 우선 canonical 선택
- selected version 우선 canonical 선택
- executed latest fallback
- draft fallback
- invalid route `version` query가 canonical version으로 정리됨

`tests/unit/phase2-schedule-http.spec.ts` 및 `tests/unit/phase2-schedule-write-repository.spec.ts`

- `single_version_policy_violation`이 HTTP boundary에서 409로 매핑된다.
- 단일-version 정책에서 `creationMode: 'new'` 요청이 거절된다.
- 같은 version result reset은 current-month assignments와 evaluation-derived state만 초기화한다.
- finalized schedule에서는 reset/create/solve가 거절된다.
- solving version이 있으면 reset/create/solve 충돌이 사용자 코드로 매핑된다.

### 12.4 Required E2E Tests

`tests/e2e/step4-existing-result-flow.spec.ts`는 기존 skipped 시나리오를 단일-version 정책으로 바꾼다.

- 기존 결과가 있는 월에 Step4로 진입해도 기존 결과 선택 모달이 뜨지 않는다.
- Off 요청 수정 후 `근무표 생성(AI)`를 누르면 새 근무표안 이름 입력 없이 Step5로 이동한다.
- Step5 URL은 같은 schedule key를 유지하고, version query는 canonical로 정리된다.
- Step5에서 `근무표안 비교`가 보이지 않는다.

`tests/e2e/schedule-workflow.spec.ts`

- 신규 월 Step4 -> Step5 -> autoStart smoke flow
- 확정 월 read-only smoke flow

## 13. Performance Review

성능상 가장 중요한 부분은 Step4/Step5 진입 때 version별 데이터를 불필요하게 여러 번 읽지 않는 것이다.

위험:

1. 기존 다중 version 후보를 계속 hydrate하면 Step5 compare 데이터 로딩이 남아 네트워크 요청이 늘어난다.
2. Step4에서 canonical이 아닌 version preferences까지 순회하면 legacy multi-version 월에서 초기 로딩이 느려진다.
3. Off 요청 수정 후 재생성 때 `all_active_versions` reset을 쓰면 불필요한 삭제 범위가 커진다.

권장:

- Step4 restore는 canonical `previewVersionId` 하나만 preference/assignment를 읽는다.
- Step5 compare modal 관련 `hydrateComparedReviews()`와 `hydrateComparisonVersionData()`는 단일-version 정책에서 호출되지 않게 한다.
- reset은 `selected_version` 또는 명시적 current `previewVersionId` 범위만 사용한다.

## 14. Failure Modes

| Codepath                        | 현실적인 실패                            | 테스트 필요 |                         에러 처리 | 사용자 표시 |
| ------------------------------- | ---------------------------------------- | ----------: | --------------------------------: | ----------: |
| Step4 ensure schedule           | 네트워크/API 실패                        |          예 |            기존 inline retry 유지 |          예 |
| Step4 canonical version resolve | legacy versions가 모두 archived/invalid  |          예 |                 Step4 초기화 실패 |          예 |
| Step4 save preferences          | Supabase/API 저장 실패                   |          예 |            catch 후 stay on Step4 |          예 |
| Step4 reset assignments         | 일부 결과 삭제 실패                      |          예 |               solver handoff 중단 |          예 |
| Step5 autoStart                 | autoStart query 중복 소비                |          예 |  `hasConsumedRouteAutoStart` 유지 | 조용히 방지 |
| Step5 autoStart                 | 다른 version solving 충돌                |          예 |          start 차단 및 query 제거 |          예 |
| Step5 Off 수정                  | 수동 수정 미저장                         |          예 |                    confirm dialog |          예 |
| Step5 regenerate                | previous-month fallback 로드 실패        |          예 |              기존 error path 유지 |          예 |
| 서버 createVersion 방어         | 오래된 클라이언트가 새 version 생성 요청 |          예 | `single_version_policy_violation` |          예 |
| 서버 reset                      | finalized schedule reset 시도            |          예 |               `already_finalized` |          예 |

Critical gap: 서버 createVersion 방어가 없으면 UI를 고쳐도 오래된 탭 또는 직접 호출로 새 version이 생길 수 있다.

## 15. NOT in Scope

- `schedule_versions` 테이블 제거: 기존 Phase2 데이터 모델과 평가 이력을 보존해야 한다.
- version/evaluation/revision 전체 재설계: 이번 변경 목표는 MVP 흐름 단순화다.
- 기존 non-canonical version 즉시 삭제: 데이터 손실 위험이 있어 숨김/보존으로 처리한다.
- finalized month reopen/unfinalize: 별도 audit/reversal 정책이 필요하다.
- 실제 AI solver 교체 또는 품질 개선: 이 문서는 handoff 대상 version 정책만 다룬다.
- 조직/직원/근무 CRUD 확장: MVP schedule-generation 흐름 밖이다.
- 모바일 UI 재설계: 현재 정책 변경과 직접 관련 없다.

## 16. Implementation Tasks

아래 작업은 `@superpowers:writing-plans` 기준의 실행 단위다. 구현자는 위에서 아래로 진행하고, 각 task마다 테스트가 먼저 실패하는지 확인한 뒤 구현한다.

### Task 1: Canonical Version Resolver

**Files:**

- Modify: `src/utils/scheduleVersionResolver.ts`
- Test: `tests/unit/schedule-version-resolver.spec.ts`

- [ ] **Step 1: Write failing resolver tests**

Add tests for these cases:

```ts
// tests/unit/schedule-version-resolver.spec.ts
// Expected canonical priority:
// 1. finalized version
// 2. selected version
// 3. latest executed version
// 4. lowest version_no draft
// 5. null when no versions exist
```

Run:

```bash
pnpm test:unit -- tests/unit/schedule-version-resolver.spec.ts
```

Expected: FAIL because the single-version canonical helper or behavior is not implemented yet.

- [ ] **Step 2: Implement the resolver helper**

Add a small pure helper in `src/utils/scheduleVersionResolver.ts`. Do not add a new store or service.

Implementation intent:

```ts
export function getCanonicalSingleMonthVersionId(
  compare: Pick<ScheduleCompareResponse, 'versions' | 'selectedVersionId' | 'finalizedVersionId'>
): string | null {
  // finalized -> selected -> latest executed -> lowest versionNo draft
}
```

Use it from `resolveStep4VersionState()` and from the default Step5 focus path where the single-version MVP policy should ignore invalid route `version` query values.

- [ ] **Step 3: Verify resolver tests pass**

Run:

```bash
pnpm test:unit -- tests/unit/schedule-version-resolver.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/utils/scheduleVersionResolver.ts tests/unit/schedule-version-resolver.spec.ts
git commit -m "test: lock single-version resolver policy"
```

### Task 2: Step4 Same-Version Tests

**Files:**

- Modify: `tests/unit/step4-initial-data.spec.ts`

- [ ] **Step 1: Rewrite modal expectations**

Replace tests that expect these user-facing flows:

- `이미 만든 근무표안이 있습니다`
- `새 근무표안으로 Off 요청 수정`
- `새 근무표안 이름`

with tests that expect Step4 to stay on the same canonical version and show no version naming UI.

- [ ] **Step 2: Add create-version regression assertions**

Add or update expectations so these paths assert:

```ts
expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled();
expect(saveScheduleVersionPreferencesMock).toHaveBeenCalledWith(
  'schedule-1',
  'version-2',
  expect.any(Object),
  expect.any(Object)
);
```

Cover at least:

- first run with Off requests
- existing result with changed Off requests
- note-only change
- no changes with existing assignments
- finalized version blocked

- [ ] **Step 3: Run tests and confirm failure**

Run:

```bash
pnpm test:unit -- tests/unit/step4-initial-data.spec.ts
```

Expected: FAIL before Step4 implementation, especially around version-name modal and `createPhase2ScheduleVersion` calls.

### Task 3: Step4 Same-Version Implementation

**Files:**

- Modify: `src/views/schedule/Step4InitialData.vue`
- Test: `tests/unit/step4-initial-data.spec.ts`

- [ ] **Step 1: Remove visible version/candidate modals**

Remove or hard-hide these template branches and their user entry points:

- `showExistingHistoryChoiceModal`
- `isEditOffStartModalOpen`
- `isVersionNameModalOpen`

Do not leave reachable UI copy that says "새 근무표안".

- [ ] **Step 2: Collapse handoff helpers to same-version route**

Remove or make unreachable these Step4 paths:

- `handleConfirmEditOffDraftStart()`
- `routeFirstRunAfterName()`
- `createAndRouteReSolveVersion()`
- `executePendingHandoff()`
- `openVersionNameModal(...)`

Replace them with one same-version handoff path:

```ts
// Implementation shape, not a separate required abstraction.
await saveScheduleVersionPreferences(
  baseline.scheduleId,
  baseline.previewVersionId,
  constraints.value,
  constraintNotes.value
);

if (hasConstraintChanges && baseline.hasCurrentMonthAssignments) {
  await deleteThisMonthVersionAssignments(
    baseline.scheduleId,
    baseline.previewVersionId,
    scheduleStore.basicInfo!.month
  );
}

routeToStep5(baseline.schedulePublicId ?? baseline.scheduleId, baseline.previewVersionId, {
  autoStart: hasConstraintChanges || !baseline.hasCurrentMonthAssignments,
  defaultVersionId: baseline.defaultRouteFocusVersionId,
});
```

- [ ] **Step 3: Keep existing guardrails**

Preserve these behaviors:

- unapplied draft blocks transition
- stale employees are sanitized before save
- finalized/solving/read-only states block edit/generate
- save/reset API failure stays on Step4 and shows an error

- [ ] **Step 4: Verify Step4 tests pass**

Run:

```bash
pnpm test:unit -- tests/unit/step4-initial-data.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/schedule/Step4InitialData.vue tests/unit/step4-initial-data.spec.ts
git commit -m "feat: keep Step4 on the current schedule version"
```

### Task 4: Step5 Same-Version UI And Actions

**Files:**

- Modify: `src/views/schedule/Step5Result.vue`
- Test: `tests/unit/step5-result.spec.ts`

- [ ] **Step 1: Write failing Step5 tests**

Add or update tests for:

```ts
expect(wrapper.find('[data-test="step5-compare-button"]').exists()).toBe(false);
expect(createPhase2ScheduleVersionMock).not.toHaveBeenCalled();
expect(pushMock).toHaveBeenCalledWith(buildStep4RouteLocation({ versionId: 'version-2' }));
```

Cover:

- `Off 수정` routes to Step4 with current `previewVersionId`
- `더 개선하기` calls `handleStartSolver()` for current `previewVersionId`
- compare button is hidden under single-version policy
- compare modal hydration is not called when hidden
- changed manual cells block regenerate
- finalized/solving state blocks edit/regenerate

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts
```

Expected: FAIL before Step5 UI cleanup where compare/candidate branches remain visible or reachable.

- [ ] **Step 3: Hide compare/candidate UI**

Set the single-version policy default so these are not reachable from Step5:

- `shouldShowCompareAction`
- `ScheduleCompareModal`
- candidate focus/select/delete actions
- `selectedDeleteScope === 'all_active_versions'`

Prefer hiding/removing reachable UI before deleting large supporting code. Remove dead code in a later cleanup commit only after tests are green.

- [ ] **Step 4: Verify Step5 tests pass**

Run:

```bash
pnpm test:unit -- tests/unit/step5-result.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/schedule/Step5Result.vue tests/unit/step5-result.spec.ts
git commit -m "feat: simplify Step5 to one active version"
```

### Task 5: Server-Side Create Version Guard

**Files:**

- Modify: `supabase/functions/phase2-schedule/http.ts`
- Modify: `supabase/functions/phase2-schedule/repository.ts`
- Test: `tests/unit/phase2-schedule-http.spec.ts`
- Test: `tests/unit/phase2-schedule-write-repository.spec.ts`

- [ ] **Step 1: Write failing server guard tests**

Add repository tests that call `createVersion(..., { creationMode: 'new', ... })` and expect:

```ts
await expect(createVersion(client, AUTH_CONTEXT, 'schedule-1', request)).rejects.toMatchObject({
  code: 'single_version_policy_violation',
  status: 409,
});
expect(rpcSpies.create_schedule_version_atomic).not.toHaveBeenCalled();
```

Also keep existing overwrite tests green, because failed-version overwrite/reset paths are separate from creating a new active version.

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
pnpm test:unit -- tests/unit/phase2-schedule-http.spec.ts tests/unit/phase2-schedule-write-repository.spec.ts
```

Expected: FAIL until the repository guard exists.

- [ ] **Step 3: Implement repository guard**

In `createVersion()` before `create_schedule_version_atomic`, reject MVP new-version creation:

```ts
if (request.creationMode === 'new') {
  throw new ContractError(
    'single_version_policy_violation',
    'Single-version MVP flow cannot create a new active version',
    409
  );
}
```

Do not change `overwrite` conflict mapping for `already_finalized`, `version_solving`, `version_archived`, `version_not_solve_failed`, or `another_version_solving`.

Add `single_version_policy_violation` to the 409 cases in `mapErrorToStatus()` so non-`ContractError` envelopes stay consistent at the HTTP boundary.

- [ ] **Step 4: Verify server tests pass**

Run:

```bash
pnpm test:unit -- tests/unit/phase2-schedule-http.spec.ts tests/unit/phase2-schedule-write-repository.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/phase2-schedule/http.ts supabase/functions/phase2-schedule/repository.ts tests/unit/phase2-schedule-http.spec.ts tests/unit/phase2-schedule-write-repository.spec.ts
git commit -m "feat: reject new schedule versions in MVP flow"
```

### Task 6: E2E Policy Coverage

**Files:**

- Modify: `tests/e2e/step4-existing-result-flow.spec.ts`
- Modify: `tests/e2e/schedule-workflow.spec.ts`

- [ ] **Step 1: Rewrite skipped existing-result specs**

Unskip `tests/e2e/step4-existing-result-flow.spec.ts` and change expectations:

- Step4 existing month does not show `이미 만든 근무표안이 있습니다`
- Step4 existing month does not show `새 근무표안 이름`
- Off request edit routes to Step5 without naming a new version
- Step5 does not show `근무표안 비교`
- Step5 URL keeps the same schedule key and canonical version query

- [ ] **Step 2: Add smoke coverage**

In `tests/e2e/schedule-workflow.spec.ts`, keep or add smoke paths for:

- 신규 월 Step4 -> Step5 -> autoStart
- 확정 월 Step4/Step5 read-only

- [ ] **Step 3: Run targeted e2e**

Run:

```bash
pnpm test:e2e -- tests/e2e/step4-existing-result-flow.spec.ts tests/e2e/schedule-workflow.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/step4-existing-result-flow.spec.ts tests/e2e/schedule-workflow.spec.ts
git commit -m "test: cover single-version schedule workflow"
```

### Task 7: Final Verification

**Files:**

- Verify all changed code and tests

- [ ] **Step 1: Run focused unit tests**

```bash
pnpm test:unit -- tests/unit/schedule-version-resolver.spec.ts tests/unit/step4-initial-data.spec.ts tests/unit/step5-result.spec.ts tests/unit/phase2-schedule-http.spec.ts tests/unit/phase2-schedule-write-repository.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run required project checks**

```bash
pnpm lint:check
pnpm run build
```

Expected: PASS with no ESLint or build errors.

- [ ] **Step 3: Review diff for scope creep**

Run:

```bash
git diff --stat
git diff -- src/views/schedule/Step4InitialData.vue src/views/schedule/Step5Result.vue src/utils/scheduleVersionResolver.ts supabase/functions/phase2-schedule/repository.ts
```

Expected: changes stay inside MVP schedule-generation flow and do not add organization/employee/shift CRUD, mobile redesign, analytics, registration, approval, or real solver integration.

- [ ] **Step 4: Final commit if needed**

```bash
git add src/views/schedule/Step4InitialData.vue src/views/schedule/Step5Result.vue src/utils/scheduleVersionResolver.ts supabase/functions/phase2-schedule/http.ts supabase/functions/phase2-schedule/repository.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step4-initial-data.spec.ts tests/unit/step5-result.spec.ts tests/unit/phase2-schedule-http.spec.ts tests/unit/phase2-schedule-write-repository.spec.ts tests/e2e/step4-existing-result-flow.spec.ts tests/e2e/schedule-workflow.spec.ts
git commit -m "chore: verify single-version schedule policy"
```

## 17. Completion Summary

- Step 0: Scope Challenge - scope accepted as single-version MVP policy, with existing version model preserved.
- Architecture Review: 2 issues found - server-side createVersion guard and legacy multi-version canonical selection.
- Code Quality Review: 2 issues found - Step4 multi-version modal branches and Step5 compare/candidate branches must be removed or hidden without new abstraction.
- Test Review: diagrams produced, 34 gaps identified.
- Writing Plans Review: required agentic-worker header, file ownership map, checkbox task plan, exact test commands, expected results, and commit checkpoints added.
- Performance Review: 3 issues found - avoid compare hydration, avoid non-canonical preference reads, avoid all-active reset.
- NOT in scope: written.
- What already exists: written.
- TODOS.md updates: 0 items proposed; no `TODOS.md` file exists in the repo root during review.
- Failure modes: 1 critical gap flagged - server createVersion defense.
- Plan-document-reviewer subagent: skipped because this request did not authorize subagent delegation; this pass focused on direct plan hardening.
- Lake Score: 3/3 recommendations chose complete option - UI cleanup, server guard, full regression/e2e coverage.

## 18. GSTACK REVIEW REPORT

| Review        | Trigger               | Why                             | Runs | Status             | Findings                                                                                                   |
| ------------- | --------------------- | ------------------------------- | ---- | ------------------ | ---------------------------------------------------------------------------------------------------------- |
| CEO Review    | `/plan-ceo-review`    | Scope & strategy                | 0    | -                  | -                                                                                                          |
| Codex Review  | `/codex review`       | Independent 2nd opinion         | 0    | -                  | -                                                                                                          |
| Eng Review    | `/plan-eng-review`    | Architecture & tests (required) | 1    | DONE_WITH_CONCERNS | 서버 createVersion 방어와 legacy multi-version canonical 선택을 critical implementation requirement로 추가 |
| Design Review | `/plan-design-review` | UI/UX gaps                      | 0    | -                  | UI copy/compare hiding scope only; 별도 visual audit 미실행                                                |

**UNRESOLVED:** 기존 다중 version 월에서 non-canonical version을 언제 archive할지는 구현 전 제품 결정이 필요하다.

**VERDICT:** ENG REVIEW COMPLETE - ready to implement after accepting the server guard and canonical legacy-version policy.
