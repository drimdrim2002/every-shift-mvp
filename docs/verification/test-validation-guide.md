# P1-2.3 RLS 검증 시나리오 및 테스트 가이드

본 문서는 Task `10000000-0000-4000-8000-000000000048`의 산출물이다.  
목표는 P1-2.2 RLS 매트릭스를 기준으로 테넌트 침범 방지, 권한 상승 차단, IDOR 방지 검증 시나리오를 문서+SQL 형태로 확정하는 것이다.

## 1) 범위 및 기준

- 범위: 검증 설계 문서화(실제 정책 배포/DDL 적용은 비범위)
- 기준 상태: 목표 RLS 상태(P1-2.2 매트릭스)
- 산출 위치: 본 문서 단일 파일
- 참조 문서: `docs/migration/P1-2.2_RLS_POLICY_MATRIX.md`

## 2) 실DB 베이스라인 스냅샷 (Supabase MCP 측정)

- 측정일: `2026-03-02` (KST)
- 프로젝트: `every-shift-mvp` (`vjmerqaxguovnojinxfq`)
- 핵심 관찰:
  - `public` 스키마 대부분 테이블 RLS 비활성
  - RLS 활성 테이블은 `schedules`, `schedule_preferences` 중심
  - 일부 정책이 `USING true / WITH CHECK true`로 과도 permissive
  - `anon`/`authenticated`에 광범위 CRUD ACL(`arwdDxtm`) 존재
  - Security Advisor: `rls_disabled_in_public` 다수 + permissive RLS 경고

주의: 위 상태는 테스트 설계의 입력값(현상)이며, 본 검증의 합격 기준은 목표 RLS 상태(개선 후)다.

## 3) 시나리오 인터페이스 표준

모든 시나리오는 아래 필드를 고정 사용한다.

| Field | 설명 |
| :--- | :--- |
| `Scenario ID` | 고유 식별자 (`RLS-00N`) |
| `Threat Class` | `TENANT_BREACH`, `ROLE_ESCALATION`, `IDOR`, `ACCOUNT_BYPASS`, `REGRESSION` |
| `Actor Role` | `super`, `admin`, `user`, `inactive_user`, `pending_user` |
| `Target Table` | 검증 대상 테이블 |
| `Precondition` | 실행 전 데이터/정책 상태 |
| `Validation SQL` | SQL Editor 또는 MCP `execute_sql` 실행 쿼리 |
| `Expected Result` | `ALLOW`, `DENY`, `EMPTY_SET`, `ERROR(permission denied)` |
| `Negative Variant` | 반대 조건(오용 경로) 검증 |
| `Related Matrix Row` | P1-2.2 매트릭스의 대응 행 |

## 4) 판정 규칙

- `ALLOW`: 의도된 권한 범위 내에서 조회/변경 성공
- `DENY`: 변경 시도 결과가 0 rows 또는 정책상 차단
- `EMPTY_SET`: 조회 결과가 0 rows
- `ERROR(permission denied)`: 권한 또는 RLS check 위반으로 오류 발생

권장 매핑:

- 조회 차단: `EMPTY_SET`
- 쓰기 차단(INSERT/UPDATE/DELETE): `DENY` 또는 `ERROR(permission denied)`

## 5) 실행 전 공통 준비 SQL

아래 템플릿으로 actor를 전환하여 각 시나리오 SQL을 실행한다.

```sql
begin;

-- 1) actor JWT claims 주입
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '<ACTOR_USER_ID>', true);

-- 2) DB role 전환 (RLS + ACL 검증)
set local role authenticated;

-- 3) 시나리오 SQL 실행
-- ... validation SQL ...

rollback;
```

`anon` 경로 검증 시:

```sql
begin;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
set local role anon;
-- ... validation SQL ...
rollback;
```

## 6) 테스트 데이터 전제

모든 시나리오는 아래 최소 fixture를 전제로 한다.

1. Org A, Org B 각각 존재
2. `super` 1명, Org A `admin` 1명, Org A `user` 1명, Org B `user` 1명
3. `inactive_user` 1명 (`profiles.account_status != 'active'`)
4. `pending_user` 1명 (`organization_memberships.status = 'pending'`)
5. Org A/B에 대응되는 `schedules`, `schedule_assignments`, `schedule_preferences`, `signup_requests` 샘플 데이터 존재

## 7) RLS 검증 시나리오 (최소 10개)

### RLS-001

- `Scenario ID`: `RLS-001`
- `Threat Class`: `TENANT_BREACH`
- `Actor Role`: `super`
- `Target Table`: `organizations`, `schedules`, `schedule_assignments`
- `Precondition`: super 계정은 `global_role='super'`, `account_status='active'`
- `Validation SQL`:

```sql
select count(*) as org_cnt from public.organizations;
select count(*) as schedule_cnt from public.schedules;
select count(*) as assignment_cnt from public.schedule_assignments;
```

- `Expected Result`: `ALLOW`
- `Negative Variant`: super 계정을 `account_status='suspended'`로 변경 후 재실행 시 조회 차단 확인
- `Related Matrix Row`: `organizations`, `schedules`, `schedule_assignments` / super `S/I/U/D`

### RLS-002

- `Scenario ID`: `RLS-002`
- `Threat Class`: `TENANT_BREACH`
- `Actor Role`: `admin` (Org A)
- `Target Table`: `schedules`
- `Precondition`: Org A admin 승인 상태, Org B schedule row 존재
- `Validation SQL`:

```sql
select id, organization_id
from public.schedules
where organization_id = '<ORG_B_ID>';
```

- `Expected Result`: `EMPTY_SET`
- `Negative Variant`: `organization_id='<ORG_A_ID>'` 조회는 반환되어야 함(`ALLOW`)
- `Related Matrix Row`: `schedules` / admin 자기 조직 범위만 `S`

### RLS-003

- `Scenario ID`: `RLS-003`
- `Threat Class`: `ROLE_ESCALATION`
- `Actor Role`: `admin` (Org A)
- `Target Table`: `schedules`
- `Precondition`: Org B schedule row 존재
- `Validation SQL`:

```sql
update public.schedules
set status = 'changed'
where organization_id = '<ORG_B_ID>';
```

- `Expected Result`: `DENY`
- `Negative Variant`: Org A row 업데이트는 `ALLOW`
- `Related Matrix Row`: `schedules` / admin `U`는 자기 조직만

### RLS-004

- `Scenario ID`: `RLS-004`
- `Threat Class`: `ROLE_ESCALATION`
- `Actor Role`: `admin` (Org A)
- `Target Table`: `schedules`
- `Precondition`: Org B row 미존재 여부와 무관
- `Validation SQL`:

```sql
insert into public.schedules (organization_id, month, status)
values ('<ORG_B_ID>', '2026-04', 'created');
```

- `Expected Result`: `ERROR(permission denied)` 또는 `DENY`
- `Negative Variant`: `organization_id='<ORG_A_ID>'` insert는 `ALLOW`
- `Related Matrix Row`: `schedules` / admin `I`는 자기 조직만

### RLS-005

- `Scenario ID`: `RLS-005`
- `Threat Class`: `TENANT_BREACH`
- `Actor Role`: `user` (Org A)
- `Target Table`: `schedules`
- `Precondition`: Org A/B schedule row 존재
- `Validation SQL`:

```sql
select id, organization_id
from public.schedules
where organization_id in ('<ORG_A_ID>', '<ORG_B_ID>')
order by organization_id;
```

- `Expected Result`: Org A만 반환되어 `ALLOW` + Org B는 `EMPTY_SET`
- `Negative Variant`: Org B filter 단독 조회 시 `EMPTY_SET`
- `Related Matrix Row`: `schedules` / user `S`만 허용

### RLS-006

- `Scenario ID`: `RLS-006`
- `Threat Class`: `IDOR`
- `Actor Role`: `user` (Org A)
- `Target Table`: `schedule_assignments`
- `Precondition`: Org B 직원 assignment ID를 알고 있는 상태
- `Validation SQL`:

```sql
select id, employee_id, schedule_id
from public.schedule_assignments
where id = '<ORG_B_ASSIGNMENT_ID>';
```

- `Expected Result`: `EMPTY_SET`
- `Negative Variant`: Org A 본인 assignment ID 조회는 `ALLOW`
- `Related Matrix Row`: `schedule_assignments` / user self assignment만 `S`

### RLS-007

- `Scenario ID`: `RLS-007`
- `Threat Class`: `ACCOUNT_BYPASS`
- `Actor Role`: `inactive_user`
- `Target Table`: `organizations`, `schedules`, `employees`
- `Precondition`: `profiles.account_status in ('suspended','withdrawn','rejected')`
- `Validation SQL`:

```sql
select count(*) from public.organizations;
select count(*) from public.schedules;
select count(*) from public.employees;
```

- `Expected Result`: `EMPTY_SET`
- `Negative Variant`: 같은 사용자의 `account_status='active'` 복구 후 자기 조직 범위 조회 `ALLOW`
- `Related Matrix Row`: 공통 권한 원칙(활성 계정만 허용)

### RLS-008

- `Scenario ID`: `RLS-008`
- `Threat Class`: `ACCOUNT_BYPASS`
- `Actor Role`: `pending_user`
- `Target Table`: `organizations`, `schedules`
- `Precondition`: `organization_memberships.status='pending'`
- `Validation SQL`:

```sql
select count(*) from public.organizations;
select count(*) from public.schedules;
```

- `Expected Result`: `EMPTY_SET`
- `Negative Variant`: membership를 `approved`로 변경 후 자기 조직 범위 조회 `ALLOW`
- `Related Matrix Row`: 공통 권한 원칙(승인 membership만 허용)

### RLS-009

- `Scenario ID`: `RLS-009`
- `Threat Class`: `ROLE_ESCALATION`
- `Actor Role`: `user` (Org A)
- `Target Table`: `signup_requests`
- `Precondition`: 본인 요청 1건, 타인 요청 1건 존재
- `Validation SQL`:

```sql
-- self create 허용
insert into public.signup_requests (requester_user_id, organization_id, requested_role, status)
values ('<ACTOR_USER_ID>', null, 'user', 'pending');

-- 타인 요청 수정 차단
update public.signup_requests
set status = 'withdrawn'
where requester_user_id = '<OTHER_USER_ID>';
```

- `Expected Result`: self insert `ALLOW`, 타인 update `DENY` 또는 `ERROR(permission denied)`
- `Negative Variant`: 본인 요청 withdraw는 `ALLOW`
- `Related Matrix Row`: `signup_requests` / user self `I/S/U`, 타인 수정 금지

### RLS-010

- `Scenario ID`: `RLS-010`
- `Threat Class`: `REGRESSION`
- `Actor Role`: `admin` (Org A), `user` (Org A)
- `Target Table`: `schedules`, `schedule_preferences`
- `Precondition`: permissive 정책(`USING true`, `WITH CHECK true`) 제거 완료
- `Validation SQL`:

```sql
-- schedules: 타조직 접근 회귀 확인
select id from public.schedules where organization_id = '<ORG_B_ID>';

-- schedule_preferences: 타조직/타인 row 접근 회귀 확인
select id
from public.schedule_preferences
where employee_id = '<ORG_B_EMPLOYEE_ID>';
```

- `Expected Result`: 둘 다 `EMPTY_SET`
- `Negative Variant`: 자기 조직/자기 대상 row는 `ALLOW`
- `Related Matrix Row`: `schedules` + `schedule_preferences` 보강안

## 8) 시나리오-매트릭스 추적표

| Scenario ID | 매핑 기준 |
| :--- | :--- |
| `RLS-001` | super 전역 우회 |
| `RLS-002` | `schedules` admin SELECT 조직 스코프 |
| `RLS-003` | `schedules` admin UPDATE 조직 스코프 |
| `RLS-004` | `schedules` admin INSERT 조직 스코프 |
| `RLS-005` | `schedules` user SELECT 조직 스코프 |
| `RLS-006` | `schedule_assignments` user self-only SELECT |
| `RLS-007` | 계정 상태(active) 필수 규칙 |
| `RLS-008` | membership approved 필수 규칙 |
| `RLS-009` | `signup_requests` self workflow 규칙 |
| `RLS-010` | permissive 정책 제거 후 회귀 없음 |

## 9) 리뷰 체크리스트 (완료 기준)

1. 타조직 침범 방지 케이스가 조회/쓰기 모두 포함되는가
2. role escalation 케이스가 `INSERT/UPDATE/DELETE`까지 포함되는가
3. IDOR 케이스가 직접 PK 추측 접근 형태로 검증되는가
4. inactive/pending 계정 차단이 명시되는가
5. permissive 정책 제거 회귀 검증이 `schedules`, `schedule_preferences` 모두 포함되는가
6. 모든 시나리오가 `Validation SQL` + `Expected Result`를 가진가
7. P1-2.2 매트릭스와 1:1 추적 가능성이 보장되는가

## 10) 후속 자동화 전환 포인트

향후 통합 테스트/e2e 자동화 시 아래 순서를 권장한다.

1. fixture seed 스크립트(Org A/B, role별 사용자, schedule/sample assignment) 고정
2. actor 전환 유틸( JWT claim + role )를 테스트 helper로 추상화
3. 본 문서 `Scenario ID` 단위로 테스트 케이스 자동 생성
4. CI에서 `RLS-001`~`RLS-010` 회귀 묶음으로 실행
