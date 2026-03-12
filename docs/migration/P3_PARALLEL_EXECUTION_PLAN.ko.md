# P3 병렬 실행 계획

> 작성일: 2026-03-12  
> 범위: canonical source를 아직 변경하지 않은 상태에서, 현재 `P3` 온보딩 백로그를 병렬 실행 가능한 의존성 그래프로 재설계한다.  
> 현재 canonical source: `.shrimp-data/tasks.json`  
> 이 문서는 구조 재편 제안의 한국어 번역본이며, task ID/status를 직접 변경하는 문서는 아니다.

## 1. 목적

현재 `P3` 백로그는 논리적으로는 유효하지만 운영 관점에서는 비효율적이다. 10개의 task가 거의 완전한 직렬 체인으로 연결되어 있다.

`P2-2.4 -> P3-1.1 -> P3-1.2 -> P3-1.3 -> P3-2.1 -> P3-2.2 -> P3-2.3 -> P3-2.4 -> P3-3.1 -> P3-3.2 -> P3-3.3`

이 계획은 `P3`를 더 적은 수의 핵심 게이트와 세 개의 병렬 워크스트림으로 재구성한다.

- Domain/API 워크스트림
- Frontend/UX 워크스트림
- Guard/Test 워크스트림

목표는 아키텍처 정합성을 유지하면서 동시 작업 가능 폭을 넓히고 critical path의 깊이를 줄이는 것이다.

## 2. 입력 자료와 제약 조건

이 제안은 다음 repo 소스를 근거로 한다.

- `docs/REFINED_PRD.md`의 `5.3 [신규] 신규 조직 온보딩`
- `docs/migration/RBAC_MATRIX.md`
- `.shrimp-data/tasks.json`의 현재 `P3` task 집합
- `docs/verification/test-validation-guide.md`

현재 베이스라인에서 확인된 중요한 제약은 다음과 같다.

- `onboarding_progress`는 현재 `docs/verification/test-validation-guide.md`에서 `RLS disabled`로 표시되어 있다.
- 따라서 persistence와 RLS를 일반적인 “API contract” task 안에 암묵적으로 포함시켜 둘 수 없다.
- 구현 계획으로 넘어가기 전에, 전용 persistence/RLS 설계 task가 필요하다.

## 3. 현재 P3 그래프 진단

### 3.1 현재 문제점

1. 그래프가 과도하게 직렬화되어 있다.  
   `P3-1.1` 이후에는 여러 task가 독립적으로 진행될 수 있지만, 현재 DAG는 한 번에 하나의 활성 task만 허용한다.

2. 명세와 구현 계획이 섞여 있다.  
   일부 task는 이름상 “definition” 또는 “plan” task인데, related files는 실제 코드 산출물을 가리키고 있다.

3. persistence ownership이 불명확하다.  
   `P3-1.1`은 저장 범위를, `P3-1.2`는 API를 언급하지만, 어느 쪽도 테이블 형태, ownership 경계, RLS 전략을 명시적으로 고정하지 않는다.

4. 테스트 task가 너무 뒤에 배치되어 있다.  
   `P3-2.4`가 `P3-3.1`을 막고 있지만, 실제로는 guard rule 정의가 훨씬 더 먼저 가능해야 한다.

5. frontend와 guard 작업의 동시성 모델이 명시되어 있지 않다.  
   온보딩 위저드 UX와 guard rule matrix는 도메인 불변식이 고정되면 병렬로 진행할 수 있다.

### 3.2 그 결과 발생하는 병목

현재 구조에서 `P3`는 다음 특성을 가진다.

- Concurrency width: 사실상 `1`
- Critical-path depth: upstream blocker 이후 `10`개의 P3 task
- 현재 즉시 시작 가능한 P3 task: `0`개 (`P2-2.4`가 아직 pending이기 때문)

## 4. 재설계 원칙

재구성된 `P3`는 다음 원칙을 따라야 한다.

1. 시작 지점에는 하나의 필수 domain gate만 둔다.  
   `P3-1.1`은 온보딩 불변식을 고정하는 단일 진실원천 task로 유지한다.

2. persistence와 transport를 분리한다.  
   `onboarding_progress`의 storage/RLS와 API contract를 별도 task로 나눈다.

3. domain invariants가 고정되면 frontend UX와 guard-rule 설계가 시작될 수 있어야 한다.  
   실제 contract 의존성이 없는 한, 이 작업들은 전체 API/store 계획이 끝날 때까지 기다리면 안 된다.

4. 시나리오 설계는 자신이 검증할 산출물에 더 가깝게 배치한다.  
   Guard bypass 시나리오는 guard plan에 의존해야 하고, onboarding E2E 시나리오는 이후의 모든 계획 task가 아니라 domain, UX, guard rule에 의존해야 한다.

5. 기존 upstream gate는 유지한다.  
   `P2-2.4 승인 상태별 라우팅 테스트 시나리오 정의(role/status 조합)`은 온보딩 guard 동작이 P2 access model과 정렬되어야 하므로 upstream blocker로 유지한다.

## 5. 제안하는 병렬 구조

## 5.1 워크스트림 개요

### Gate

- `P3-1.1` Onboarding domain invariants and completion ownership

### Workstream A: Domain/API

- `P3-1.2` onboarding_progress persistence and RLS design
- `P3-1.3` onboarding-progress API contract
- `P3-1.4` frontend onboarding store/cache strategy

### Workstream B: Frontend/UX

- `P3-2.1` onboarding wizard IA/content definition
- `P3-2.2` menu highlight and deep-link UX definition
- `P3-2.3` onboarding page composition plan

### Workstream C: Guard/Test

- `P3-3.1` onboarding guard rule matrix
- `P3-3.2` router insertion plan
- `P3-3.3` guard bypass scenario set
- `P3-3.4` onboarding E2E scenario set

## 5.2 제안 task 목록

| Proposed Task | Purpose | Depends On | Primary Outputs | Key Files |
| --- | --- | --- | --- | --- |
| `P3-1.1` Onboarding domain invariants + completion ownership | 3단계 상태 머신, 완료 조건, organization-vs-user ownership, admin-only access invariant를 고정한다 | `P1-1.3`, `P1-1.4`, `P2-2.4` | Canonical state diagram과 ownership rules | `docs/REFINED_PRD.md`, `docs/migration/RBAC_MATRIX.md` |
| `P3-1.2` onboarding_progress persistence + RLS design | 테이블 ownership, write/read boundary, active admin scope, org isolation, recovery semantics를 정의한다 | `P3-1.1` | Persistence spec과 security rules | `docs/verification/test-validation-guide.md`, migration docs |
| `P3-1.3` onboarding-progress API contract | `get/update/complete` contract, request/response schema, auth boundary, error model을 정의한다 | `P3-1.1` | 서버/클라이언트 골격 작업에 바로 쓸 수 있는 API contract | `docs/API_SPEC.md`, `supabase/functions/onboarding-progress/index.ts` |
| `P3-1.4` frontend onboarding store/cache strategy | Pinia state, loading lifecycle, refresh restore, storage event sync, invalidation rules를 정의한다 | `P3-1.3` | Store interface와 caching rules | `src/stores/onboarding.ts`, `src/stores/auth.ts` |
| `P3-2.1` onboarding wizard IA/content definition | 단계별 콘텐츠, CTA copy, 완료 UX, dashboard exit semantics를 고정한다 | `P3-1.1` | 위저드 정보구조와 콘텐츠 명세 | `src/views/Onboarding.vue`, `docs/REFINED_PRD.md` |
| `P3-2.2` menu highlight + deep-link UX definition | Sidebar highlight 동작, return path, menu expansion, cross-page guidance를 정의한다 | `P3-2.1` | 직원 등록 및 엑셀 업로드 안내 UX 명세 | `src/components/layout/Sidebar.vue` |
| `P3-2.3` onboarding page composition plan | route, store, API, UX를 하나의 구현 가능한 페이지 계획으로 통합한다 | `P3-1.3`, `P3-1.4`, `P3-2.1`, `P3-2.2` | 구현 준비가 끝난 페이지 통합 계획 | `src/router/index.ts`, `src/views/Onboarding.vue` |
| `P3-3.1` onboarding guard rule matrix | 누가 onboarding으로 강제 진입되는지, 누가 제외되는지, login/signup/approval routes 대비 우선순위를 정의한다 | `P3-1.1`, `P2-2.4` | Guard rule table과 precedence rules | `src/router/guards.ts`, `docs/migration/RBAC_MATRIX.md` |
| `P3-3.2` router insertion plan | `beforeEach` 삽입 순서, store read 지점, redirect 규칙, 기존 guard와의 충돌 처리를 정의한다 | `P3-1.3`, `P3-1.4`, `P3-3.1` | Router integration plan | `src/router/index.ts`, `src/router/guards.ts` |
| `P3-3.3` guard bypass scenario set | direct URL, refresh, logout/login, back-button, non-admin access bypass 케이스를 정의한다 | `P3-3.2` | Guard regression scenario set | `docs/verification/test-validation-guide.md` |
| `P3-3.4` onboarding E2E scenario set | first-login forced onboarding, completion, re-login skip, admin-only route coverage를 정의한다 | `P3-1.3`, `P3-2.1`, `P3-3.1` | Onboarding E2E matrix | `docs/verification/test-validation-guide.md` |

## 5.3 왜 이 그래프가 더 나은가

`P3-1.1` 이후에는 네 개의 task가 병렬로 시작 가능해진다.

- `P3-1.2`
- `P3-1.3`
- `P3-2.1`
- `P3-3.1`

그 결과 작업 형태는 단일 직렬 큐에서 다중 레인 그래프로 바뀐다.

```text
P2-2.4
   |
P3-1.1
   ├── P3-1.2
   ├── P3-1.3 ── P3-1.4 ───────────────┐
   ├── P3-2.1 ── P3-2.2 ────────┐      │
   └── P3-3.1 ───────────────────┼── P3-3.2 ── P3-3.3
                                 │
                    P3-1.3 ──────┼── P3-3.4
                                 │
                    P3-1.4 + P3-2.1 + P3-2.2 ── P3-2.3
```

예상되는 개선 효과는 다음과 같다.

- Concurrency width가 `1`에서 `4`로 증가한다.
- Critical-path depth가 `10`개의 P3 task에서 `6`개의 의미 있는 stage로 줄어든다.
- Guard rule 설계가 더 이상 E2E 정의를 기다리지 않는다.
- UX 작업이 전체 router insertion planning을 기다리지 않아도 된다.

## 6. 현재 task에서 제안 task로의 매핑

| Current Task | Action in Replan | Notes |
| --- | --- | --- |
| `P3-1.1 온보딩 상태 머신(3단계) + 저장 범위 확정` | 유지하되, 단일 domain gate로 더 엄격히 정의한다 | ownership과 completion semantics를 명시적으로 고정해야 한다 |
| `P3-1.2 온보딩 진행 API 계약 정의(get/update)` | `P3-1.2` persistence/RLS와 `P3-1.3` API contract로 분리한다 | 현재 task 안에 보안 민감한 persistence concern이 숨어 있다 |
| `P3-1.3 프론트 스토어/캐시 전략 정의(온보딩)` | `P3-1.4`로 재번호 부여 | 모든 UX 작업이 아니라 API contract에 의존해야 한다 |
| `P3-2.1 온보딩 위저드 UI 플로우/콘텐츠 확정` | `P3-2.1`로 유지 | domain gate 직후 바로 시작 가능하다 |
| `P3-2.2 온보딩 페이지 구현 계획(컴포넌트/라우트/스토어)` | 범위를 좁혀 `P3-2.3`으로 이동 | 전체 UX를 막는 blocker가 아니라 integration task가 되어야 한다 |
| `P3-2.3 메뉴 하이라이트/딥링크 UX 설계(직원관리/엑셀 업로드)` | 더 앞 단계인 `P3-2.2`로 이동 | 전체 페이지 통합 계획이 아니라 wizard IA에 의존한다 |
| `P3-2.4 온보딩 E2E 테스트 시나리오 정의` | `P3-3.4`로 이동 | 전체 플로우를 검증하므로 verification lane에 있어야 한다 |
| `P3-3.1 온보딩 강제 가드 규칙 정의(예외 포함)` | `P3-3.1`로 유지하되 앞당긴다 | E2E가 아니라 access model에 의존해야 한다 |
| `P3-3.2 온보딩 가드 구현 계획(라우터 beforeEach 흐름)` | `P3-3.2`로 유지 | rule matrix와 store/API read 지점에 의존한다 |
| `P3-3.3 온보딩 가드 테스트 시나리오 정의(우회 방지)` | `P3-3.3`으로 유지 | guard insertion plan에만 의존해야 한다 |

## 7. 권장 실행 Wave

| Wave | Start Condition | Parallel Tasks |
| --- | --- | --- |
| `Wave 0` | upstream blocker를 끝낸다 | `P2-2.4` |
| `Wave 1` | upstream access model이 안정화되었다 | `P3-1.1` |
| `Wave 2` | domain invariants가 고정되었다 | `P3-1.2`, `P3-1.3`, `P3-2.1`, `P3-3.1` |
| `Wave 3` | API/UX/rule 산출물이 준비되었다 | `P3-1.4`, `P3-2.2`, `P3-3.4` |
| `Wave 4` | integration 입력이 준비되었다 | `P3-2.3`, `P3-3.2` |
| `Wave 5` | router insertion plan이 안정화되었다 | `P3-3.3` |

## 8. 재설계된 P3의 Definition of Done

다음 조건이 모두 충족되어야 이 재설계가 성공한 것으로 본다.

1. `P3-1.1`이 onboarding completion owner를 명시적으로 정의한다.  
   organization-scoped, user-scoped, 또는 hybrid 중 하나여야 하며 canonical read rule이 하나로 고정되어야 한다.

2. `P3-1.2`가 현재 `onboarding_progress`의 RLS gap을 명시적으로 다룬다.

3. `P3-1.3`과 `P3-1.4`가 동일한 state name과 field name을 사용한다.

4. `P3-2.1`과 `P3-2.2`는 router implementation details를 기다리지 않고도 리뷰 가능해야 한다.

5. `P3-3.1`이 다음 경우에 대한 guard priority를 고정한다.  
   login, signup, approval pending, user role, admin completed-onboarding

6. `P3-3.4`는 최소한 다음 케이스를 포함한다.  
   first login force-in, completion, refresh 이후 resume, relogin skip, non-admin deny

## 9. 권장 다음 단계

팀이 이 구조를 수용한다면, 다음 변경은 `.shrimp-data/tasks.json`에 대한 canonical backlog update가 되어야 한다.

- 현재의 직렬 `P3` 체인을 Section 5의 task map으로 대체한다
- 가능하다면 기존 `P3-1.1` task ID를 유지한다
- 현재 `P3-1.2`를 두 개의 task로 분리한다
- `P3-2.4`를 verification lane 아래 `P3-3.4`로 이동한다
- UX와 guard/test task 사이의 불필요한 직렬 dependency를 제거한다

그 canonical update가 이루어지기 전까지는, 이 파일을 `P3`의 운영용 실행 가이드로 취급해야 한다.
