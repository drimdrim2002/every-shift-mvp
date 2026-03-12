# P3 온보딩 상태 머신과 완료 ownership

## 1. 목적

이 문서는 `P3-1.1`의 canonical source of truth이다.
후속 온보딩 태스크(`P3-1.2`부터 `P3-3.4`까지)는 여기서 정의한 단계 키, 완료 의미, ownership 규칙, 접근 불변식을 재해석 없이 그대로 사용해야 한다.

이 문서의 범위:
- 최초 승인된 admin 로그인에 대한 3단계 온보딩 상태 머신
- 단계 진입 조건과 완료 조건
- 완료 ownership과 canonical read rule
- `/onboarding`의 admin-only 접근 불변식
- 승인 차단과 온보딩 강제 진입 간 우선순위

범위 밖:
- persistence schema 및 RLS 설계
- API transport contract
- Pinia cache 구조
- wizard 문구, deep-link 시각효과, 최종 landing route UX

## 2. Canonical Domain 결정

### 2.1 완료 Ownership

온보딩 완료는 **organization-scoped**로 정의한다.

근거:
- 이 wizard는 개인 설정이 아니라 tenant readiness를 확정하기 위해 존재한다.
- Step 1은 조직 수준의 스케줄링 선행조건을 설정한다.
- Step 2와 Step 3은 조직이 최소 운영 준비 상태에 도달했는지를 검증한다.
- 같은 조직의 모든 admin이 동일한 설정을 반복하도록 만들면 tenant bootstrap 작업이 중복되고, PRD의 "신규 조직 온보딩" 의도와도 충돌한다.

### 2.2 Canonical Read Rule

활성 admin의 온보딩 상태는 정확히 하나의 organization scope에서 해석한다.

1. auth context / membership selection logic으로 admin의 effective organization을 결정한다.
2. 해당 `organization_id`에 대한 onboarding progress를 읽는다.
3. 그 organization-scoped progress를 같은 조직의 모든 admin에게 적용되는 단일 진실원천으로 취급한다.

guard 결정에는 user-scoped completion flag를 사용하지 않는다.

## 3. 적용 대상과 Guard 선행조건

온보딩 평가는 아래 조건을 모두 만족할 때만 적용한다.
- 사용자가 인증되어 있다
- access state가 `admin_active`이다
- effective organization membership이 해석되어 있다

온보딩 평가는 다음 경우에는 적용하지 않는다.
- `unauthenticated`
- `no_membership_or_inactive`
- `admin_pending`
- `admin_rejected`
- `user_active`
- `super_active`

우선순위 규칙:
- `P2_ACCESS_APPROVAL_POLICY.md`의 승인/접근 차단이 온보딩보다 먼저 평가된다.
- 따라서 `admin_pending`과 `admin_rejected`는 `/access/pending` 또는 `/access/rejected`로 먼저 차단되며, 온보딩 평가에 들어가지 않는다.

## 4. Canonical Step Key

유효한 온보딩 step key는 아래 세 개뿐이다.

1. `organization_info`
2. `employee_seed`
3. `schedule_request`

이 step key는 persistence, API, store, router, test 산출물에서 이름 변경 없이 재사용해야 한다.

## 5. 상태 해석 모델

### 5.1 Wizard 상태 해석 규칙

Wizard 상태는 순서 기반 평가로 도출한다.

- `currentStepKey` = canonical 순서에서 가장 먼저 발견되는 미완료 단계
- `isOnboardingComplete` = 세 단계가 모두 완료된 경우에만 `true`
- 세 단계가 모두 완료되었다면 `currentStepKey`는 `null`

### 5.2 Step 상태 의미

각 단계는 domain 관점에서 이진 상태만 가진다.
- complete
- incomplete

loading, saving, highlighted, expanded, dismissed 같은 UI-local 상태는 표현 계층의 관심사이며 domain completion을 재정의해서는 안 된다.

## 6. 단계 진입 조건과 완료 조건

### 6.1 Step 1: `organization_info`

목적:
- 스케줄 생성 시작에 필요한 최소 조직 수준 데이터를 확인하고 확정한다

진입 조건:
- `admin_active` membership에 대해 온보딩이 평가되고 있으며, 이 단계가 첫 번째 미완료 단계이다

완료 조건:
- 조직 프로필이 확인되었다
- PRD 5.3에서 요구하는 스케줄링 설정이 조직에 존재한다
- 최소한 조직에 다음 항목이 존재해야 한다:
  - 확인된 조직 identity record
  - 스케줄링에 필요한 최소 1개 이상의 work/shift-type 기반 설정
  - 등록된 최소 1개 이상의 work site

해석 규칙:
- "보기만 하고 저장하지 않은 상태"는 완료가 아니다
- 완료는 persisted organization-level confirmation/update event를 요구한다

### 6.2 Step 2: `employee_seed`

목적:
- 첫 계획 수립 흐름 전에 조직에 최소 1명의 스케줄 가능한 근무자가 존재하도록 보장한다

진입 조건:
- `organization_info`가 완료되었고, `employee_seed`가 첫 번째 미완료 단계이다

완료 조건:
- 조직에 스케줄링 workflow에서 사용할 수 있는 active employee record가 최소 1개 존재한다

Canonical 규칙:
- employee readiness는 해당 조직에 최소 1개의 schedulable `employees` row가 존재할 때 충족된다
- 그 employee가 직접 employee CRUD, Excel import, 또는 이후 account-link flow에서 생성되었는지는 구현 세부사항이다
- schedulable employee row 없이 membership만 존재하는 상태는 이 단계를 완료로 보지 않는다

### 6.3 Step 3: `schedule_request`

목적:
- admin이 첫 번째 실제 스케줄링 workflow를 시작했음을 보장한다

진입 조건:
- `employee_seed`가 완료되었고, `schedule_request`가 첫 번째 미완료 단계이다

완료 조건:
- 조직이 첫 번째 schedule request / planning run record를 생성했다

Canonical 규칙:
- 완료는 조직의 첫 persisted scheduling workflow start event로 충족된다
- 페이지 방문, 템플릿 다운로드, 업로드 UI 열기만으로는 완료되지 않는다
- solver 성공까지는 요구하지 않으며, 첫 스케줄 workflow 시작만으로 충분하다

## 7. 라우트 접근 불변식

`/onboarding`는 **admin-only 이며 incomplete-only**이다.

허용 대상:
- effective organization 기준 organization-scoped onboarding이 미완료인 `admin_active`

허용되지 않음:
- `super_active`
- `user_active`
- `admin_pending`
- `admin_rejected`
- `unauthenticated`
- `no_membership_or_inactive`
- effective organization 기준 onboarding이 이미 완료된 `admin_active`

기본 redirect 규칙:
- access-state 차단 대상 사용자는 P2 access-state redirect를 따른다
- 인증은 되었지만 진입 자격이 없는 사용자는 일반 post-auth route로 보낸다
- 미인증 사용자는 `/login`으로 보낸다

## 8. 강제 진입 불변식

`admin_active` 사용자가 온보딩이 미완료인 조직에 속해 있다면, 그 admin은 강제 진입 대상이다.

의미:
- 명시적으로 허용된 onboarding/public 예외 route를 제외한 protected app route는 `/onboarding`으로 redirect되어야 한다
- direct URL 진입, refresh, re-login에서도 동일한 organization-scoped onboarding 결론이 나와야 한다
- organization-scoped onboarding이 완료되면, 그 admin뿐 아니라 같은 조직의 다른 admin도 더 이상 `/onboarding`으로 강제 진입되면 안 된다

## 9. 후속 태스크가 유지해야 할 불변식

후속 태스크는 아래 항목을 모두 유지해야 한다.

1. Ownership은 organization-scoped로 유지된다.
2. Canonical step key는 `organization_info`, `employee_seed`, `schedule_request`로 유지된다.
3. Guard 적용 대상은 `admin_active`부터 시작한다.
4. 승인 차단이 온보딩 강제보다 먼저 적용된다.
5. 완료 기준은 페이지 방문이 아니라 persisted domain event이다.
6. 한 admin의 완료는 그 사용자 개인이 아니라 조직 전체의 온보딩 완료를 의미한다.

## 10. 후속 태스크로 넘기는 열린 경계

- `P3-1.2`는 이 organization-scoped 모델을 기준으로 storage shape, tenant isolation, RLS를 정의한다.
- `P3-1.3`은 이 문서의 step key를 그대로 사용해 DTO와 API envelope을 정의한다.
- `P3-1.4`는 ownership semantics를 바꾸지 않고 frontend cache/store lifecycle을 정의한다.
- `P3-2.1`은 문구, CTA 텍스트, highlight UX, 완료 후 landing semantics를 정의한다.
- `P3-3.1`, `P3-3.2`는 이 적용 대상 모델을 기준으로 구체적인 router matrix와 insertion order를 정의한다.
