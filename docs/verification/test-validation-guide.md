# P1-2.3 RLS 검증 시나리오 및 테스트 가이드

본 문서는 Task `10000000-0000-4000-8000-000000000048`의 산출물이다.  
목표는 P1-2.2 RLS 매트릭스를 기준으로 테넌트 침범 방지, 권한 상승 차단, IDOR 방지 검증 시나리오를 문서+SQL 형태로 확정하는 것이다.

## 1) 범위 및 기준

- 범위: 검증 설계 문서화(실제 정책 배포/DDL 적용은 비범위)
- 기준 상태: 목표 RLS 상태(P1-2.2 매트릭스)
- 산출 위치: 본 문서 단일 파일
- 참조 문서: `docs/migration/P1-2.2_RLS_POLICY_MATRIX.md`

## 2) 실DB 베이스라인 스냅샷 (Supabase MCP 측정)

- 측정일: `2026-03-06` (KST)
- 프로젝트 ID: `vjmerqaxguovnojinxfq`
- 프로젝트 명: `every-shift-mvp`

### 2.1) 테이블별 RLS 활성화 상태 및 핵심 위험

| 테이블명 | RLS 활성 | 정책(Policies) 위험 요소 | 권한(ACL) 위험 요소 |
| :--- | :--- | :--- | :--- |
| `analytics_metrics` | ❌ 미활성 | (RLS 미적용) | `anon`/`authenticated` CRUD 전면 허용 |
| `approval_logs` | ❌ 미활성 | (RLS 미적용) | `anon`/`authenticated` CRUD 전면 허용 |
| `employee_site_assignments` | ❌ 미활성 | (RLS 미적용) | `anon`/`authenticated` CRUD 전면 허용 |
| `employee_skills` | ❌ 미활성 | (RLS 미적용) | `anon`/`authenticated` CRUD 전면 허용 |
| `employees` | ✅ 활성 | 정책 없음 (기본 차단) | `anon`/`authenticated` CRUD 전면 허용 |
| `invite_codes` | ✅ 활성 | 정상 (함수 기반 검증) | `anon`/`authenticated` CRUD 전면 허용 |
| `notification_preferences` | ❌ 미활성 | (RLS 미적용) | `anon`/`authenticated` CRUD 전면 허용 |
| `notifications` | ❌ 미활성 | (RLS 미적용) | `anon`/`authenticated` CRUD 전면 허용 |
| `onboarding_progress` | ❌ 미활성 | (RLS 미적용) | `anon`/`authenticated` CRUD 전면 허용 |
| `organization_memberships` | ✅ 활성 | 정책 없음 (기본 차단) | `anon`/`authenticated` CRUD 전면 허용 |
| `organization_settings` | ❌ 미활성 | (RLS 미적용) | `anon`/`authenticated` CRUD 전면 허용 |
| `organizations` | ✅ 활성 | 정책 없음 (기본 차단) | `anon`/`authenticated` CRUD 전면 허용 |
| `profiles` | ✅ 활성 | 정책 없음 (기본 차단) | `anon`/`authenticated` CRUD 전면 허용 |
| `ranks` | ✅ 활성 | 정책 없음 (기본 차단) | `anon`/`authenticated` CRUD 전면 허용 |
| `schedule_assignments` | ❌ 미활성 | (RLS 미적용) - 핵심 데이터 노출 위험 | `anon`/`authenticated` CRUD 전면 허용 |
| `schedule_preferences` | ✅ 활성 | ⚠️ `USING (true)` / `WITH CHECK (true)` (전체 허용) | `anon`/`authenticated` CRUD 전면 허용 |
| `schedules` | ✅ 활성 | ⚠️ `USING (true)` / `WITH CHECK (true)` (전체 허용) | `anon`/`authenticated` CRUD 전면 허용 |
| `shifts` | ✅ 활성 | 정책 없음 (기본 차단) | `anon`/`authenticated` CRUD 전면 허용 |
| `signup_requests` | ✅ 활성 | 정책 없음 (기본 차단) | `anon`/`authenticated` CRUD 전면 허용 |
| `site_requirements` | ❌ 미활성 | (RLS 미적용) | `anon`/`authenticated` CRUD 전면 허용 |
| `site_staffing_requirements` | ❌ 미활성 | (RLS 미적용) | `anon`/`authenticated` CRUD 전면 허용 |
| `sites` | ✅ 활성 | 정책 없음 (기본 차단) | `anon`/`authenticated` CRUD 전면 허용 |
| `skills` | ✅ 활성 | 정책 없음 (기본 차단) | `anon`/`authenticated` CRUD 전면 허용 |

### 2.2) 주요 위험(Risk) 요약

1. **RLS 미적용 (RLS Disabled):** `schedule_assignments`, `site_requirements` 등 11개 주요/운영 테이블이 RLS 미적용 상태.
2. **과도한 권한 정책 (Permissive Policy):** `schedule_preferences`, `schedules` 테이블은 RLS가 활성화되어 있으나, `USING (true)`, `WITH CHECK (true)` 형태의 정책으로 테넌트 격리나 권한 제어가 되지 않는 심각한 보안 취약점 존재.
3. **과도한 기본 ACL (Broad default ACLs):** `anon` 및 `authenticated` 역할에 대해 모든 테이블에 폭넓은 권한(`SELECT`, `INSERT`, `UPDATE`, `DELETE` 등)이 부여되어 있음. RLS가 없는 테이블에서는 즉시 데이터 유출/변조로 이어질 수 있음.

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

## 11) P2 가입 상태 전이/제약 검증 시나리오 (P2-1.2)

본 섹션은 `docs/migration/P2_SIGNUP_ROLE_FLOW.md`와 `migrations/010_signup_role_flow.sql` 기준 검증이다.

### 11.1 공통 전제

1. `invite_codes` 테이블과 `signup_requests.status='expired'` 제약이 적용되어 있어야 한다.
2. Org A 기준으로 아래 actor가 존재해야 한다.
   - `applicant_admin` (가입 신청자)
   - `applicant_user` (초대코드 가입 신청자)
   - `reviewer_admin` 또는 `super`
3. `invite_codes`에 미사용/만료/사용완료 샘플 코드가 각각 1건 이상 있어야 한다.
4. 승인 전 사용자의 `organization_memberships`는 `approved`가 아니어야 한다.

### SGN-001

- `Scenario ID`: `SGN-001`
- `Threat Class`: `REGRESSION`
- `Actor Role`: `applicant_admin`
- `Target Table`: `signup_requests`, `organization_memberships`
- `Precondition`: 동일 scope에 pending 요청 없음
- `Validation SQL`:

```sql
-- admin submit write
insert into public.signup_requests (
  requester_user_id, organization_id, requested_role, status, created_at, updated_at
)
values ('<APPLICANT_ADMIN_USER_ID>', '<ORG_A_ID>', 'admin', 'pending', now(), now())
returning id;

-- membership must not be approved at submit time
select status
from public.organization_memberships
where organization_id = '<ORG_A_ID>'
  and user_id = '<APPLICANT_ADMIN_USER_ID>';
```

- `Expected Result`: signup_request insert `ALLOW`; submit 시점에 approved membership 자동 생성 없음
- `Negative Variant`: 동일 actor/role/org로 pending 재삽입 시 unique index 차단
- `Related Matrix Row`: P2 canonical admin submit 규칙

### SGN-002

- `Scenario ID`: `SGN-002`
- `Threat Class`: `INVALID_TRANSITION`
- `Actor Role`: `reviewer_admin`
- `Target Table`: `signup_requests`, `organization_memberships`
- `Precondition`: admin pending request 1건 존재
- `Validation SQL`:

```sql
-- decision approve
update public.signup_requests
set status = 'approved',
    reviewed_by = '<REVIEWER_USER_ID>',
    reviewed_at = now(),
    updated_at = now()
where id = '<PENDING_ADMIN_REQUEST_ID>'
  and status = 'pending';

-- approval side effect (service function or follow-up transaction) expectation
insert into public.organization_memberships (
  organization_id, user_id, role, status, approved_by, approved_at
)
values ('<ORG_A_ID>', '<APPLICANT_ADMIN_USER_ID>', 'admin', 'approved', '<REVIEWER_USER_ID>', now())
on conflict (organization_id, user_id) do update
set role = excluded.role,
    status = excluded.status,
    approved_by = excluded.approved_by,
    approved_at = excluded.approved_at;
```

- `Expected Result`: request는 `approved`; membership은 `role='admin', status='approved'`
- `Negative Variant`: 이미 terminal 상태 요청에 approve 재시도 시 `INVALID_TRANSITION` 처리
- `Related Matrix Row`: P2 canonical admin approve 규칙

### SGN-003

- `Scenario ID`: `SGN-003`
- `Threat Class`: `INVALID_TRANSITION`
- `Actor Role`: `reviewer_admin`
- `Target Table`: `signup_requests`, `organization_memberships`
- `Precondition`: admin pending request 1건 존재
- `Validation SQL`:

```sql
update public.signup_requests
set status = 'rejected',
    reviewed_by = '<REVIEWER_USER_ID>',
    reviewed_at = now(),
    review_note = 'capacity limit',
    updated_at = now()
where id = '<PENDING_ADMIN_REQUEST_ID>'
  and status = 'pending';

select status
from public.organization_memberships
where organization_id = '<ORG_A_ID>'
  and user_id = '<APPLICANT_ADMIN_USER_ID>';
```

- `Expected Result`: request는 `rejected`; approved membership 생성/승격 없음
- `Negative Variant`: rejected 후 approved로 직접 변경 시도는 금지(`INVALID_TRANSITION`)
- `Related Matrix Row`: P2 canonical admin reject 규칙

### SGN-004

- `Scenario ID`: `SGN-004`
- `Threat Class`: `REGRESSION`
- `Actor Role`: `applicant_user`
- `Target Table`: `invite_codes`, `signup_requests`, `organization_memberships`
- `Precondition`: 유효 미사용 invite 1건 존재 (`used_at is null`, `expires_at > now()`)
- `Validation SQL`:

```sql
-- same transaction contract (conceptual)
-- 1) consume invite
update public.invite_codes
set used_at = now(),
    used_by = '<APPLICANT_USER_ID>',
    updated_at = now()
where id = '<VALID_INVITE_ID>'
  and used_at is null
  and revoked_at is null
  and expires_at > now();

-- 2) upsert approved membership
insert into public.organization_memberships (
  organization_id, user_id, role, status, approved_at
)
values ('<ORG_A_ID>', '<APPLICANT_USER_ID>', 'user', 'approved', now())
on conflict (organization_id, user_id) do update
set role = excluded.role,
    status = excluded.status,
    approved_at = excluded.approved_at;

-- 3) approved signup audit row
insert into public.signup_requests (
  requester_user_id, organization_id, requested_role, status, reviewed_by, reviewed_at, created_at, updated_at
)
values ('<APPLICANT_USER_ID>', '<ORG_A_ID>', 'user', 'approved', '<INVITE_CREATOR_USER_ID>', now(), now(), now());
```

- `Expected Result`: invite consumed + membership approved + signup_request approved가 모두 성립
- `Negative Variant`: 중간 단계 실패 시 전체 롤백(부분 반영 금지)
- `Related Matrix Row`: P2 canonical user invite redeem 규칙

### SGN-005

- `Scenario ID`: `SGN-005`
- `Threat Class`: `REGRESSION`
- `Actor Role`: `applicant_user`
- `Target Table`: `invite_codes`
- `Precondition`: 만료 invite 및 이미 사용 invite 각각 1건 존재
- `Validation SQL`:

```sql
-- expired invite consume attempt
update public.invite_codes
set used_at = now(), used_by = '<APPLICANT_USER_ID>'
where id = '<EXPIRED_INVITE_ID>'
  and used_at is null
  and expires_at > now();

-- already used invite consume attempt
update public.invite_codes
set used_at = now(), used_by = '<APPLICANT_USER_ID>'
where id = '<ALREADY_USED_INVITE_ID>'
  and used_at is null
  and expires_at > now();
```

- `Expected Result`: 둘 다 0 row update (`INVITE_EXPIRED` 또는 `INVITE_ALREADY_USED` 매핑)
- `Negative Variant`: 유효 미사용 invite는 1 row update
- `Related Matrix Row`: invite 단일 사용/만료 규칙

### SGN-006

- `Scenario ID`: `SGN-006`
- `Threat Class`: `ROLE_ESCALATION`
- `Actor Role`: `applicant_admin` 또는 `applicant_user`
- `Target Table`: `signup_requests`
- `Precondition`: 동일 requester/role/org scope로 pending 1건 존재
- `Validation SQL`:

```sql
insert into public.signup_requests (
  requester_user_id, organization_id, requested_role, status, created_at, updated_at
)
values ('<ACTOR_USER_ID>', '<ORG_A_ID>', 'admin', 'pending', now(), now());
```

- `Expected Result`: `ux_signup_requests_pending_dedupe` 제약으로 실패
- `Negative Variant`: terminal 상태(approved/rejected/withdrawn/expired) 신규 insert는 허용 가능
- `Related Matrix Row`: pending dedupe 무결성 제약

### SGN-007

- `Scenario ID`: `SGN-007`
- `Threat Class`: `INVALID_TRANSITION`
- `Actor Role`: `applicant_admin`
- `Target Table`: `signup_requests`
- `Precondition`: terminal 상태 요청(예: withdrawn) 1건 존재
- `Validation SQL`:

```sql
update public.signup_requests
set status = 'approved',
    reviewed_at = now(),
    updated_at = now()
where id = '<TERMINAL_REQUEST_ID>';
```

- `Expected Result`: 서비스 레이어에서 `INVALID_TRANSITION`으로 차단
- `Negative Variant`: pending -> withdrawn(본인 요청) 전이는 허용
- `Related Matrix Row`: terminal 요청 재전이 금지 규칙

### SGN-008

- `Scenario ID`: `SGN-008`
- `Threat Class`: `ACCOUNT_BYPASS`
- `Actor Role`: `pending_user` / `approved_user`
- `Target Table`: `organizations`, `schedules`
- `Precondition`: 동일 조직 기준 pending membership 사용자와 approved membership 사용자 각각 존재
- `Validation SQL`:

```sql
-- pending membership actor
select count(*) from public.organizations;
select count(*) from public.schedules;

-- approved membership actor
-- (actor context switched)
select count(*) from public.organizations;
select count(*) from public.schedules;
```

- `Expected Result`: pending actor는 `EMPTY_SET`, approved actor는 자기 조직 범위 `ALLOW`
- `Negative Variant`: approved를 pending으로 되돌리면 접근 차단
- `Related Matrix Row`: membership approved access gate

### SGN-009

- `Scenario ID`: `SGN-009`
- `Threat Class`: `REGRESSION`
- `Actor Role`: concurrent applicants
- `Target Table`: `invite_codes`
- `Precondition`: 동일 invite를 두 세션이 동시에 consume 시도
- `Validation SQL`:

```sql
-- Session A
begin;
update public.invite_codes
set used_at = now(), used_by = '<USER_A_ID>', updated_at = now()
where id = '<RACE_INVITE_ID>'
  and used_at is null
  and revoked_at is null
  and expires_at > now();
commit;

-- Session B (run in parallel)
begin;
update public.invite_codes
set used_at = now(), used_by = '<USER_B_ID>', updated_at = now()
where id = '<RACE_INVITE_ID>'
  and used_at is null
  and revoked_at is null
  and expires_at > now();
commit;
```

- `Expected Result`: 정확히 1개 세션만 1 row update, 다른 세션은 0 row update
- `Negative Variant`: `where used_at is null` 조건 제거 시 경쟁 취약성 발생 가능(금지)
- `Related Matrix Row`: invite consume 원자성/동시성 제어

## 12) P2 시나리오 추적표

| Scenario ID | 검증 목적 |
| :--- | :--- |
| `SGN-001` | admin submit 시 pending 생성 및 승인 membership 미생성 |
| `SGN-002` | admin approve 시 request/membership 동기화 |
| `SGN-003` | admin reject 시 승인 membership 미생성 |
| `SGN-004` | user invite redeem 원자성(consume + membership + audit) |
| `SGN-005` | invite 만료/재사용 차단 |
| `SGN-006` | pending dedupe 제약 확인 |
| `SGN-007` | terminal 요청 재전이 금지 |
| `SGN-008` | approved membership 접근 게이트 |
| `SGN-009` | invite 동시성 단일 성공 보장 |

## 13) P2 리뷰 체크리스트 (완료 기준)

1. admin/user 경로 각각에 대해 happy/fail 상태 전이가 모두 포함되는가
2. invite 만료/재사용/동시성 케이스가 누락 없이 포함되는가
3. pending dedupe unique index 검증이 명시되는가
4. terminal 상태 재전이 금지 규칙이 검증되는가
5. approved membership 접근 게이트 검증이 포함되는가
6. 각 시나리오가 `Precondition + Validation SQL + Expected Result`를 갖는가

## 14) P2-1.3 signup-submit 입력 검증/에러 코드 체크리스트

본 섹션은 `docs/API_SPEC.md`의 `signup-submit` 기본 계약 검증용이다.

### 14.1 입력 검증 체크리스트

| Role | Required | Optional / Alias | Fail Code |
| :--- | :--- | :--- | :--- |
| `admin` | `email`, `password`, `name`, `role=admin`, `hospitalId`(or legacy `organizationId`) | `organizationSelectionMode`, `organizationDraftId` | `VALIDATION_ERROR`, `HOSPITAL_REQUIRED`, `INVALID_ROLE` |
| `user` | `email`, `password`, `name`, `role=user`, `inviteCode` | `organizationSelectionMode=existing` | `VALIDATION_ERROR`, `INVALID_INVITE_CODE`, `INVALID_ROLE` |

검증 포인트:

1. `role` 누락/오타는 `INVALID_ROLE`로 반환되는가
2. 공통 필드 누락/형식 오류는 `VALIDATION_ERROR`로 반환되는가
3. admin에서 병원 미선택 시 `HOSPITAL_REQUIRED`를 반환하는가
4. user에서 invite 누락/무효/만료/재사용/폐기/역할불일치 시 `INVALID_INVITE_CODE`를 반환하는가
5. 동일 requester/role/scope의 pending 중복 요청은 `DUPLICATE_REQUEST`를 반환하는가

### 14.2 Canonical-Detail 매핑 체크리스트

| Detail/Legacy Code (`error.details.reason`) | Canonical Code (`error.code`) |
| :--- | :--- |
| `DUPLICATE_PENDING_REQUEST` | `DUPLICATE_REQUEST` |
| `ORGANIZATION_REQUIRED` | `HOSPITAL_REQUIRED` |
| `INVITE_NOT_FOUND` | `INVALID_INVITE_CODE` |
| `INVITE_EXPIRED` | `INVALID_INVITE_CODE` |
| `INVITE_ALREADY_USED` | `INVALID_INVITE_CODE` |
| `INVITE_REVOKED` | `INVALID_INVITE_CODE` |
| `INVITE_ROLE_MISMATCH` | `INVALID_INVITE_CODE` |

검증 포인트:

1. 클라이언트 분기 로직이 `error.code`만 사용하고 자유 텍스트에 의존하지 않는가
2. detail reason은 로깅/디버깅 용도로만 사용되는가
3. UI 메시지 매핑이 canonical code 기준 단일화되어 있는가

## 15) P2-1.5 가입 제출 스모크 테스트 시나리오 (admin/user 분기)

본 섹션은 자동화 도입 전 `/signup` 수동 회귀 체크리스트다.  
하위 DB/계약 검증은 `SGN-001`~`SGN-009`, 입력/에러 코드 검증은 14장을 기준으로 하고, 여기서는 실제 화면 기준 최소 happy/fail 흐름만 점검한다.

### 15.1 스모크 시나리오 요약표

| Scenario ID | Path | 목적 | 관련 기준 |
| :--- | :--- | :--- | :--- |
| `SMK-001` | `admin` happy | 병원 검색/선택 후 pending 안내 노출 확인 | `SGN-001`, 14.1 |
| `SMK-002` | `user` happy | 유효 invite 제출 후 active 안내 노출 확인 | `SGN-004`, 14.1 |
| `SMK-003` | `admin` fail | 병원 미선택 시 제출 차단 확인 | 14.1 |
| `SMK-004` | `user` fail | 무효/만료/재사용 invite 오류 처리 확인 | `SGN-005`, 14.1, 14.2 |
| `SMK-005` | `admin`/`user` fail | 중복 신청 시 canonical 오류 메시지 확인 | `SGN-006`, 14.1, 14.2 |
| `SMK-006` | `admin`/`user` fail | 함수/백엔드 오류 시 일반 오류 처리 확인 | 14.2 |

### 15.2 공통 실행 규칙

1. 대상 화면은 단일 `/signup` 라우트다.
2. 역할 전환은 `관리자` / `사용자` 라디오 버튼으로 수행한다.
3. 기대 오류값은 자유 텍스트가 아니라 canonical code 기준으로 판정한다.
4. 메시지 문구는 [`src/views/auth/Signup.vue`](/home/brown/projects/every-shift-mvp/src/views/auth/Signup.vue), [`src/views/auth/Login.vue`](/home/brown/projects/every-shift-mvp/src/views/auth/Login.vue), [`src/types/signup.ts`](/home/brown/projects/every-shift-mvp/src/types/signup.ts) 구현과 일치해야 한다.

### SMK-001

- `Scenario ID`: `SMK-001`
- `Path`: `admin` happy path
- `Precondition`:
  - 병원 검색 API가 정상 응답한다.
  - 선택 가능한 병원 1건 이상이 검색된다.
  - 신규 admin 가입 이메일로 중복 pending 요청이 없다.
- `Steps`:
  1. `/signup` 진입 후 `관리자` 역할을 선택한다.
  2. 이름, 이메일, 비밀번호를 유효값으로 입력한다.
  3. 병원명을 2글자 이상 입력하고 `검색` 버튼을 클릭한다.
  4. 검색 결과에서 병원 1건을 선택한다.
  5. `가입 신청` 버튼을 클릭한다.
  6. 성공 후 `로그인으로 이동` 버튼을 클릭한다.
- `Expected Result`:
  - 병원 출처 문구 `병원 목록 출처: 공공데이터포털(data.go.kr)`가 표시된다.
  - 제출 성공 시 상단 info alert에 `가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.`가 표시된다.
  - 성공 메시지는 `가입 신청이 완료되었습니다. 관리자 승인을 기다려주세요.`로 표시된다.
  - 결과 상태는 `pending_approval`로 해석된다.
  - 로그인 화면 이동 후 info alert에 `회원가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.`가 표시된다.

### SMK-002

- `Scenario ID`: `SMK-002`
- `Path`: `user` happy path
- `Precondition`:
  - 유효한 미사용 invite code 1건이 존재한다.
  - invite code는 만료되지 않았고 역할이 `user`와 일치한다.
  - 가입 이메일 기준 중복 pending 요청이 없다.
- `Steps`:
  1. `/signup` 진입 후 `사용자` 역할을 선택한다.
  2. 이름, 이메일, 비밀번호를 유효값으로 입력한다.
  3. 초대코드를 입력한다.
  4. `가입하기` 버튼을 클릭한다.
  5. 성공 후 `로그인으로 이동` 버튼을 클릭한다.
- `Expected Result`:
  - 제출 성공 시 상단 success alert에 `가입이 완료되었습니다. 로그인 페이지에서 바로 로그인할 수 있습니다.`가 표시된다.
  - 성공 메시지는 `가입이 완료되었습니다. 로그인할 수 있습니다.`로 표시된다.
  - 결과 상태는 `active`로 해석된다.
  - 로그인 화면 이동 후 success alert에 `가입이 완료되었습니다. 로그인할 수 있습니다.`가 표시된다.

### SMK-003

- `Scenario ID`: `SMK-003`
- `Path`: `admin` fail path
- `Precondition`:
  - `/signup` 화면이 정상 렌더링된다.
- `Steps`:
  1. `/signup` 진입 후 `관리자` 역할을 선택한다.
  2. 이름, 이메일, 비밀번호를 유효값으로 입력한다.
  3. 병원을 선택하지 않은 상태를 유지한다.
  4. 제출 버튼 상태와 병원 필드 검증을 확인한다.
- `Expected Result`:
  - `가입 신청` 버튼은 disabled 상태다.
  - 병원 필수 조건 위반 시 제출이 진행되지 않는다.
  - 폼 검증 기준 메시지는 `병원을 선택하세요`다.
  - 병원 ID는 있으나 선택 label 해석에 실패한 비정상 케이스에서는 `선택한 병원 정보를 다시 확인해주세요` 오류가 표시된다.

### SMK-004

- `Scenario ID`: `SMK-004`
- `Path`: `user` fail path
- `Precondition`:
  - 아래 케이스별 테스트 데이터가 준비되어 있다.
  - 무효 invite code 1건
  - 만료 invite code 1건
  - 이미 사용된 invite code 1건
- `Steps`:
  1. `/signup` 진입 후 `사용자` 역할을 선택한다.
  2. 이름, 이메일, 비밀번호를 유효값으로 입력한다.
  3. 케이스별 invite code를 입력한다.
  4. `가입하기` 버튼을 클릭한다.
- `Expected Result`:
  - 초대코드가 비어 있으면 버튼은 disabled 상태이며 폼 검증 메시지는 `초대코드를 입력하세요`다.
  - 무효/만료/재사용 invite 제출 시 요청은 실패한다.
  - UI 오류 메시지는 모두 `초대코드가 유효하지 않습니다.`로 단일화된다.
  - canonical 오류값은 `INVALID_INVITE_CODE`로 판정한다.
  - 성공 alert(`active`)는 노출되지 않는다.

### SMK-005

- `Scenario ID`: `SMK-005`
- `Path`: `admin` / `user` fail path
- `Precondition`:
  - 동일 requester/role/scope 기준 pending signup request가 이미 1건 존재한다.
- `Steps`:
  1. admin 경로 또는 user 경로로 `/signup`에 진입한다.
  2. 기존 pending 요청과 동일 scope가 되도록 유효 데이터를 입력한다.
  3. 제출 버튼을 클릭한다.
- `Expected Result`:
  - 요청은 실패한다.
  - UI 오류 메시지는 `동일한 가입 신청이 이미 접수되어 있습니다.`다.
  - canonical 오류값은 `DUPLICATE_REQUEST`로 판정한다.
  - success/info alert는 신규로 노출되지 않는다.

### SMK-006

- `Scenario ID`: `SMK-006`
- `Path`: `admin` / `user` fail path
- `Precondition`:
  - `signup-submit` 함수가 일반 실패를 반환하거나 invoke 단계 오류를 발생시키도록 환경을 구성한다.
  - dev mock fallback을 우회해야 하는 경우 `VITE_SIGNUP_FORCE_REMOTE=true` 상태에서 수행한다.
- `Steps`:
  1. admin 또는 user 경로로 `/signup`에 진입한다.
  2. 역할별 필수 입력값을 모두 채운다.
  3. 제출 시 함수 오류 또는 백엔드 내부 오류를 유도한다.
- `Expected Result`:
  - 요청은 실패한다.
  - UI 오류 메시지는 `가입 처리 중 오류가 발생했습니다.`다.
  - canonical 오류값은 `INTERNAL_ERROR`로 판정한다.
  - `pending_approval` 또는 `active` 성공 상태로 전이되지 않는다.

### 15.3 리뷰 체크리스트

1. `admin`/`user` 각각 happy path 1건 이상이 존재하는가
2. `admin` 병원 미선택, `user` invite invalid 계열 fail path가 포함되는가
3. `pending_approval`와 `active` 상태 전이가 모두 검증되는가
4. `INVALID_INVITE_CODE`, `DUPLICATE_REQUEST`, `INTERNAL_ERROR` 기대값이 명시되는가
5. 로그인 화면의 `signupState` 안내 문구까지 확인 대상으로 포함되는가
6. 본 섹션이 `SGN-001`~`SGN-009`를 대체하지 않고 UI 스모크 레이어로 유지되는가
