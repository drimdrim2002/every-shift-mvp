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

| 테이블명                     | RLS 활성  | 정책(Policies) 위험 요소                            | 권한(ACL) 위험 요소                   |
| :--------------------------- | :-------- | :-------------------------------------------------- | :------------------------------------ |
| `analytics_metrics`          | ❌ 미활성 | (RLS 미적용)                                        | `anon`/`authenticated` CRUD 전면 허용 |
| `approval_logs`              | ❌ 미활성 | (RLS 미적용)                                        | `anon`/`authenticated` CRUD 전면 허용 |
| `employee_site_assignments`  | ❌ 미활성 | (RLS 미적용)                                        | `anon`/`authenticated` CRUD 전면 허용 |
| `employee_skills`            | ❌ 미활성 | (RLS 미적용)                                        | `anon`/`authenticated` CRUD 전면 허용 |
| `employees`                  | ✅ 활성   | 정책 없음 (기본 차단)                               | `anon`/`authenticated` CRUD 전면 허용 |
| `invite_codes`               | ✅ 활성   | 정상 (함수 기반 검증)                               | `anon`/`authenticated` CRUD 전면 허용 |
| `notification_preferences`   | ❌ 미활성 | (RLS 미적용)                                        | `anon`/`authenticated` CRUD 전면 허용 |
| `notifications`              | ❌ 미활성 | (RLS 미적용)                                        | `anon`/`authenticated` CRUD 전면 허용 |
| `onboarding_progress`        | ❌ 미활성 | (RLS 미적용)                                        | `anon`/`authenticated` CRUD 전면 허용 |
| `organization_memberships`   | ✅ 활성   | 정책 없음 (기본 차단)                               | `anon`/`authenticated` CRUD 전면 허용 |
| `organization_settings`      | ❌ 미활성 | (RLS 미적용)                                        | `anon`/`authenticated` CRUD 전면 허용 |
| `organizations`              | ✅ 활성   | 정책 없음 (기본 차단)                               | `anon`/`authenticated` CRUD 전면 허용 |
| `profiles`                   | ✅ 활성   | 정책 없음 (기본 차단)                               | `anon`/`authenticated` CRUD 전면 허용 |
| `ranks`                      | ✅ 활성   | 정책 없음 (기본 차단)                               | `anon`/`authenticated` CRUD 전면 허용 |
| `schedule_assignments`       | ❌ 미활성 | (RLS 미적용) - 핵심 데이터 노출 위험                | `anon`/`authenticated` CRUD 전면 허용 |
| `schedule_preferences`       | ✅ 활성   | ⚠️ `USING (true)` / `WITH CHECK (true)` (전체 허용) | `anon`/`authenticated` CRUD 전면 허용 |
| `schedules`                  | ✅ 활성   | ⚠️ `USING (true)` / `WITH CHECK (true)` (전체 허용) | `anon`/`authenticated` CRUD 전면 허용 |
| `shifts`                     | ✅ 활성   | 정책 없음 (기본 차단)                               | `anon`/`authenticated` CRUD 전면 허용 |
| `signup_requests`            | ✅ 활성   | 정책 없음 (기본 차단)                               | `anon`/`authenticated` CRUD 전면 허용 |
| `site_requirements`          | ❌ 미활성 | (RLS 미적용)                                        | `anon`/`authenticated` CRUD 전면 허용 |
| `site_staffing_requirements` | ❌ 미활성 | (RLS 미적용)                                        | `anon`/`authenticated` CRUD 전면 허용 |
| `sites`                      | ✅ 활성   | 정책 없음 (기본 차단)                               | `anon`/`authenticated` CRUD 전면 허용 |
| `skills`                     | ✅ 활성   | 정책 없음 (기본 차단)                               | `anon`/`authenticated` CRUD 전면 허용 |

### 2.2) 주요 위험(Risk) 요약

1. **RLS 미적용 (RLS Disabled):** `schedule_assignments`, `site_requirements` 등 11개 주요/운영 테이블이 RLS 미적용 상태.
2. **과도한 권한 정책 (Permissive Policy):** `schedule_preferences`, `schedules` 테이블은 RLS가 활성화되어 있으나, `USING (true)`, `WITH CHECK (true)` 형태의 정책으로 테넌트 격리나 권한 제어가 되지 않는 심각한 보안 취약점 존재.
3. **과도한 기본 ACL (Broad default ACLs):** `anon` 및 `authenticated` 역할에 대해 모든 테이블에 폭넓은 권한(`SELECT`, `INSERT`, `UPDATE`, `DELETE` 등)이 부여되어 있음. RLS가 없는 테이블에서는 즉시 데이터 유출/변조로 이어질 수 있음.

주의: 위 상태는 테스트 설계의 입력값(현상)이며, 본 검증의 합격 기준은 목표 RLS 상태(개선 후)다.

## 3) 시나리오 인터페이스 표준

모든 시나리오는 아래 필드를 고정 사용한다.

| Field                | 설명                                                                       |
| :------------------- | :------------------------------------------------------------------------- |
| `Scenario ID`        | 고유 식별자 (`RLS-00N`)                                                    |
| `Threat Class`       | `TENANT_BREACH`, `ROLE_ESCALATION`, `IDOR`, `ACCOUNT_BYPASS`, `REGRESSION` |
| `Actor Role`         | `super`, `admin`, `user`, `inactive_user`, `pending_user`                  |
| `Target Table`       | 검증 대상 테이블                                                           |
| `Precondition`       | 실행 전 데이터/정책 상태                                                   |
| `Validation SQL`     | SQL Editor 또는 MCP `execute_sql` 실행 쿼리                                |
| `Expected Result`    | `ALLOW`, `DENY`, `EMPTY_SET`, `ERROR(permission denied)`                   |
| `Negative Variant`   | 반대 조건(오용 경로) 검증                                                  |
| `Related Matrix Row` | P1-2.2 매트릭스의 대응 행                                                  |

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

| Scenario ID | 매핑 기준                                    |
| :---------- | :------------------------------------------- |
| `RLS-001`   | super 전역 우회                              |
| `RLS-002`   | `schedules` admin SELECT 조직 스코프         |
| `RLS-003`   | `schedules` admin UPDATE 조직 스코프         |
| `RLS-004`   | `schedules` admin INSERT 조직 스코프         |
| `RLS-005`   | `schedules` user SELECT 조직 스코프          |
| `RLS-006`   | `schedule_assignments` user self-only SELECT |
| `RLS-007`   | 계정 상태(active) 필수 규칙                  |
| `RLS-008`   | membership approved 필수 규칙                |
| `RLS-009`   | `signup_requests` self workflow 규칙         |
| `RLS-010`   | permissive 정책 제거 후 회귀 없음            |

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

본 섹션은 `docs/migration/P2_SIGNUP_ROLE_FLOW.md`와 `migrations/010_signup_role_flow.sql` 기준 검증이다. `invite_codes` helper는 `008_rls_progressive_rollout.sql`에 정의되지만 실제 정책/제약 canonical source는 `010_signup_role_flow.sql`이다.

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
- `Precondition`: 유효 미사용 invite 1건 존재 (`used_count=0`, `max_uses=1`, `used_at is null`, `expires_at > now()`)
- `Validation SQL`:

```sql
-- same transaction contract (conceptual)
-- 1) consume invite
update public.invite_codes
set used_count = used_count + 1,
    used_at = now(),
    used_by = '<APPLICANT_USER_ID>',
    updated_at = now()
where id = '<VALID_INVITE_ID>'
  and used_count < max_uses
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
set used_count = used_count + 1,
    used_at = now(),
    used_by = '<APPLICANT_USER_ID>'
where id = '<EXPIRED_INVITE_ID>'
  and used_count < max_uses
  and expires_at > now();

-- already used invite consume attempt
update public.invite_codes
set used_count = used_count + 1,
    used_at = now(),
    used_by = '<APPLICANT_USER_ID>'
where id = '<ALREADY_USED_INVITE_ID>'
  and used_count < max_uses
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
set used_count = used_count + 1,
    used_at = now(),
    used_by = '<USER_A_ID>',
    updated_at = now()
where id = '<RACE_INVITE_ID>'
  and used_count < max_uses
  and revoked_at is null
  and expires_at > now();
commit;

-- Session B (run in parallel)
begin;
update public.invite_codes
set used_count = used_count + 1,
    used_at = now(),
    used_by = '<USER_B_ID>',
    updated_at = now()
where id = '<RACE_INVITE_ID>'
  and used_count < max_uses
  and revoked_at is null
  and expires_at > now();
commit;
```

- `Expected Result`: 정확히 1개 세션만 1 row update, 다른 세션은 0 row update
- `Negative Variant`: `where used_count < max_uses` 조건 제거 시 경쟁 취약성 발생 가능(금지)
- `Related Matrix Row`: invite consume 원자성/동시성 제어

## 12) P2 시나리오 추적표

| Scenario ID | 검증 목적                                               |
| :---------- | :------------------------------------------------------ |
| `SGN-001`   | admin submit 시 pending 생성 및 승인 membership 미생성  |
| `SGN-002`   | admin approve 시 request/membership 동기화              |
| `SGN-003`   | admin reject 시 승인 membership 미생성                  |
| `SGN-004`   | user invite redeem 원자성(consume + membership + audit) |
| `SGN-005`   | invite 만료/재사용 차단                                 |
| `SGN-006`   | pending dedupe 제약 확인                                |
| `SGN-007`   | terminal 요청 재전이 금지                               |
| `SGN-008`   | approved membership 접근 게이트                         |
| `SGN-009`   | invite 동시성 단일 성공 보장                            |

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

| Role    | Required                                                                            | Optional / Alias                                   | Fail Code                                                 |
| :------ | :---------------------------------------------------------------------------------- | :------------------------------------------------- | :-------------------------------------------------------- |
| `admin` | `email`, `password`, `name`, `role=admin`, `hospitalId`(or legacy `organizationId`) | `organizationSelectionMode`, `organizationDraftId` | `VALIDATION_ERROR`, `HOSPITAL_REQUIRED`, `INVALID_ROLE`   |
| `user`  | `email`, `password`, `name`, `role=user`, `inviteCode`                              | `organizationSelectionMode=existing`               | `VALIDATION_ERROR`, `INVALID_INVITE_CODE`, `INVALID_ROLE` |

검증 포인트:

1. `role` 누락/오타는 `INVALID_ROLE`로 반환되는가
2. 공통 필드 누락/형식 오류는 `VALIDATION_ERROR`로 반환되는가
3. admin에서 병원 미선택 시 `HOSPITAL_REQUIRED`를 반환하는가
4. user에서 invite 누락/무효/만료/재사용/폐기/역할불일치 시 `INVALID_INVITE_CODE`를 반환하는가
5. 동일 requester/role/scope의 pending 중복 요청은 `DUPLICATE_REQUEST`를 반환하는가

### 14.2 Canonical-Detail 매핑 체크리스트

| Detail/Legacy Code (`error.details.reason`) | Canonical Code (`error.code`) |
| :------------------------------------------ | :---------------------------- |
| `DUPLICATE_PENDING_REQUEST`                 | `DUPLICATE_REQUEST`           |
| `ORGANIZATION_REQUIRED`                     | `HOSPITAL_REQUIRED`           |
| `INVITE_NOT_FOUND`                          | `INVALID_INVITE_CODE`         |
| `INVITE_EXPIRED`                            | `INVALID_INVITE_CODE`         |
| `INVITE_ALREADY_USED`                       | `INVALID_INVITE_CODE`         |
| `INVITE_REVOKED`                            | `INVALID_INVITE_CODE`         |
| `INVITE_ROLE_MISMATCH`                      | `INVALID_INVITE_CODE`         |

검증 포인트:

1. 클라이언트 분기 로직이 `error.code`만 사용하고 자유 텍스트에 의존하지 않는가
2. detail reason은 로깅/디버깅 용도로만 사용되는가
3. UI 메시지 매핑이 canonical code 기준 단일화되어 있는가

## 15) P2-1.5 가입 제출 스모크 테스트 시나리오 (admin/user 분기)

본 섹션은 자동화 도입 전 `/signup` 수동 회귀 체크리스트다.  
하위 DB/계약 검증은 `SGN-001`~`SGN-009`, 입력/에러 코드 검증은 14장을 기준으로 하고, 여기서는 실제 화면 기준 최소 happy/fail 흐름만 점검한다.

### 15.1 스모크 시나리오 요약표

| Scenario ID | Path                | 목적                                      | 관련 기준             |
| :---------- | :------------------ | :---------------------------------------- | :-------------------- |
| `SMK-001`   | `admin` happy       | 병원 검색/선택 후 pending 안내 노출 확인  | `SGN-001`, 14.1       |
| `SMK-002`   | `user` happy        | 유효 invite 제출 후 active 안내 노출 확인 | `SGN-004`, 14.1       |
| `SMK-003`   | `admin` fail        | 병원 미선택 시 제출 차단 확인             | 14.1                  |
| `SMK-004`   | `user` fail         | 무효/만료/재사용 invite 오류 처리 확인    | `SGN-005`, 14.1, 14.2 |
| `SMK-005`   | `admin`/`user` fail | 중복 신청 시 canonical 오류 메시지 확인   | `SGN-006`, 14.1, 14.2 |
| `SMK-006`   | `admin`/`user` fail | 함수/백엔드 오류 시 일반 오류 처리 확인   | 14.2                  |

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

## 16) P2-1.11 user 초대코드 가입 E2E 시나리오 (Playwright)

본 섹션은 `user` 초대코드 가입 플로우만을 위한 전용 E2E 시나리오 세트다.  
`admin` 승인 큐, 병원 선택, duplicate contract probe는 본 섹션의 범위에 포함하지 않는다.

계약 기준:

- `docs/API_SPEC.md`의 `signup-submit` canonical contract
- `path='user_invite_redeem'`
- `nextState='active'`
- invite 상태 규칙: `active`, `expired`, `used`, `revoked`
- 클라이언트 판정 기준은 자유 텍스트가 아니라 canonical `error.code`다.

### 16.1 공통 전제

1. 대상 화면은 단일 `/signup` 라우트이며 역할은 반드시 `사용자`로 선택한다.
2. happy path와 fail path를 분리해 실행한다.
3. fail path 검증 시 `VITE_SIGNUP_FORCE_REMOTE=true`를 설정하고 Vite dev server를 재시작한다.
4. `VITE_SIGNUP_FORCE_REMOTE=true`가 없으면 dev mock bypass 또는 contract scaffold fallback으로 인해 무효 invite가 성공(`active`)처럼 보일 수 있다.
5. 아래 fixture를 최소 1건씩 준비한다.
   - 유효 미사용 invite
   - 만료 invite
   - 폐기(revoked) invite
   - 재사용 검증용으로 한 번 성공시킬 invite
6. 성공 후 로그인 handoff 검증을 위해 [`src/views/auth/Login.vue`](/home/brown/projects/every-shift-mvp/src/views/auth/Login.vue)의 `signupState` 안내 메시지와 일치 여부를 확인한다.
7. 보안 검증 시 invite 원문은 입력값으로만 사용하고, 응답/화면/문서 어디에도 재노출되지 않는지 확인한다.
8. 미존재 invite는 `INVALID_INVITE_CODE` canonical 분기에 포함되지만, 본 task의 최소 E2E 세트에서는 폐기/reuse/race 검증을 우선한다.

### 16.2 시나리오 템플릿

모든 시나리오는 아래 필드를 고정 사용한다.

| Field                | 설명                           |
| :------------------- | :----------------------------- |
| `Scenario ID`        | 고유 식별자 (`E2E-INV-00N`)    |
| `Goal`               | 검증 목적                      |
| `Precondition`       | 테스트 데이터 및 환경 플래그   |
| `Steps`              | 화면 기준 실행 단계            |
| `Expected Result`    | UI/API 계약 기준 기대 결과     |
| `Security Assertion` | 보안/재사용 방지 검증 포인트   |
| `Automation Note`    | 추후 Playwright 전환 시 주의점 |

### E2E-INV-001

- `Scenario ID`: `E2E-INV-001`
- `Goal`: 유효한 초대코드로 `user` 가입이 완료되고 즉시 로그인 가능 상태로 전이되는지 검증한다.
- `Precondition`:
  - 유효 미사용 invite 1건이 존재한다.
  - invite는 `role_scope='user'`, `revoked_at is null`, `used_count=0`, `expires_at > now()` 상태다.
  - 신규 이메일 기준 중복 pending 요청이 없다.
- `Steps`:
  1. `/signup`에 진입한다.
  2. `사용자` 역할을 선택한다.
  3. 이름, 이메일, 비밀번호를 유효값으로 입력한다.
  4. 유효 invite code를 입력한다.
  5. `가입하기` 버튼을 클릭한다.
  6. 성공 후 `로그인으로 이동` 버튼을 클릭한다.
- `Expected Result`:
  - 요청은 성공한다.
  - signup 성공 상태는 `path='user_invite_redeem'`, `nextState='active'`로 해석된다.
  - 상단 success alert에 `가입이 완료되었습니다. 로그인 페이지에서 바로 로그인할 수 있습니다.`가 표시된다.
  - 성공 메시지는 `가입이 완료되었습니다. 로그인할 수 있습니다.`다.
  - 로그인 화면 이동 후 success alert에 `가입이 완료되었습니다. 로그인할 수 있습니다.`가 표시된다.
- `Security Assertion`:
  - 성공 응답/화면 어디에도 invite 원문이 다시 노출되지 않는다.
  - 성공 플로우에서 `관리자 승인 후 로그인` 또는 pending approval 계열 문구가 나타나지 않는다.
- `Automation Note`:
  - 로컬 mock 경로를 사용할 경우에도 `active` handoff와 Login 안내 문구는 동일해야 한다.
  - 원격 경로를 사용할 경우 network assertion은 `error.code`가 아닌 success envelope의 `nextState='active'` 중심으로 고정한다.

### E2E-INV-002

- `Scenario ID`: `E2E-INV-002`
- `Goal`: 만료된 초대코드가 즉시 거부되고 활성 상태가 부여되지 않는지 검증한다.
- `Precondition`:
  - 만료 invite 1건이 존재한다.
  - `VITE_SIGNUP_FORCE_REMOTE=true`가 적용되어 있다.
- `Steps`:
  1. `/signup`에 진입하고 `사용자` 역할을 선택한다.
  2. 공통 필드를 유효값으로 입력한다.
  3. 만료 invite code를 입력한다.
  4. `가입하기` 버튼을 클릭한다.
- `Expected Result`:
  - 요청은 실패한다.
  - UI 오류 메시지는 `초대코드가 유효하지 않습니다.`다.
  - canonical 오류값은 `INVALID_INVITE_CODE`다.
  - success alert와 `/login?signupState=active` handoff는 발생하지 않는다.
- `Security Assertion`:
  - 만료 invite로는 승인 membership 또는 즉시 로그인 가능 상태가 생성되지 않는다.
  - 세부 reason이 `INVITE_EXPIRED`로 오더라도 클라이언트 판정은 `INVALID_INVITE_CODE` 하나로 유지된다.
- `Automation Note`:
  - Playwright 전환 시 실패 근거는 alert 문구 + network payload의 `error.code`로 고정한다.
  - free-text reason 비교는 디버그 로그 용도로만 사용한다.

### E2E-INV-003

- `Scenario ID`: `E2E-INV-003`
- `Goal`: 폐기된 초대코드가 즉시 거부되고 invite 존재 여부를 추가로 노출하지 않는지 검증한다.
- `Precondition`:
  - `revoked_at is not null` 상태의 invite 1건이 존재한다.
  - `VITE_SIGNUP_FORCE_REMOTE=true`가 적용되어 있다.
- `Steps`:
  1. `/signup`에 진입하고 `사용자` 역할을 선택한다.
  2. 공통 필드를 유효값으로 입력한다.
  3. 폐기된 invite code를 입력한다.
  4. `가입하기` 버튼을 클릭한다.
- `Expected Result`:
  - 요청은 실패한다.
  - UI 오류 메시지는 `초대코드가 유효하지 않습니다.`다.
  - canonical 오류값은 `INVALID_INVITE_CODE`다.
  - 성공 alert, `active` 전이, 로그인 handoff는 발생하지 않는다.
- `Security Assertion`:
  - 폐기 여부 또는 invite 실존 여부를 사용자에게 구체적으로 노출하지 않는다.
  - 클라이언트는 `INVITE_REVOKED` detail reason을 직접 분기 기준으로 사용하지 않는다.
- `Automation Note`:
  - 원격 contract token(`revoked-...`) 사용 시에도 assertion은 `INVALID_INVITE_CODE` 기준으로 유지한다.
  - free-text detail reason은 evidence 보조값으로만 기록한다.

### E2E-INV-004

- `Scenario ID`: `E2E-INV-004`
- `Goal`: 1회용 초대코드가 한 번 성공 사용된 뒤 동일 코드로 재사용되지 않는지 검증한다.
- `Precondition`:
  - 처음에는 유효 미사용 invite 1건이 존재한다.
  - 동일 invite code로 두 번째 가입을 시도할 수 있는 환경이다.
  - 실제 consume 결과를 반영할 수 있도록 원격/통합 검증 경로를 사용한다.
- `Steps`:
  1. `E2E-INV-001` 절차로 첫 번째 가입을 성공시킨다.
  2. 브라우저 세션을 분리하거나 다른 이메일로 다시 `/signup`에 진입한다.
  3. 같은 invite code를 다시 입력한다.
  4. `가입하기` 버튼을 클릭한다.
- `Expected Result`:
  - 첫 번째 시도만 성공한다.
  - 두 번째 시도는 실패한다.
  - 두 번째 시도의 UI 오류 메시지는 `초대코드가 유효하지 않습니다.`다.
  - 두 번째 시도의 canonical 오류값은 `INVALID_INVITE_CODE`다.
  - 두 번째 시도에서 `active` 상태와 로그인 handoff는 발생하지 않는다.
- `Security Assertion`:
  - 1회용 invite 재사용이 차단된다.
  - 성공 사용 이후 invite는 더 이상 활성 상태로 남아 있지 않다.
- `Automation Note`:
  - Playwright 전환 시 두 개의 isolated browser context를 사용해 첫 성공과 두 번째 재시도를 분리한다.
  - contract token 기반 mock만으로는 실제 consume 후 재사용 차단을 증명할 수 없으므로 통합 환경 케이스로 분류한다.

### E2E-INV-005

- `Scenario ID`: `E2E-INV-005`
- `Goal`: 동시성 요청에서 동일 1회용 invite가 정확히 한 번만 성공하도록 방어되는지 검증한다.
- `Precondition`:
  - 유효 미사용 invite 1건이 존재한다.
  - 동일 invite code로 거의 동시에 가입 요청을 발생시킬 수 있는 원격/통합 검증 환경이다.
  - 서로 다른 브라우저 context 또는 두 명의 applicant 데이터를 준비한다.
- `Steps`:
  1. 두 개의 독립 browser context에서 동시에 `/signup`에 진입한다.
  2. 각 context에서 서로 다른 이메일과 동일 invite code를 입력한다.
  3. 두 context가 가능한 한 같은 시점에 `가입하기`를 클릭한다.
  4. 두 응답과 후속 화면 상태를 비교한다.
- `Expected Result`:
  - 정확히 한 요청만 성공한다.
  - 나머지 한 요청은 실패하며 canonical 오류값은 `INVALID_INVITE_CODE`다.
  - 실패한 요청은 `active` 상태 또는 로그인 handoff를 받지 못한다.
- `Security Assertion`:
  - race condition에서도 1회용 규칙이 깨지지 않는다.
  - 동일 invite로 두 건의 approved user 가입이 동시에 성립하면 안 된다.
- `Automation Note`:
  - Playwright 전환 시 `Promise.all` 기반 동시 submit과 두 context의 결과 수집이 필요하다.
  - contract token만으로는 경쟁 상태를 재현할 수 없으므로 실서버 또는 통합 harness 환경으로 제한한다.

### 16.3 리뷰 체크리스트

1. happy / fail / security 3축 시나리오가 모두 존재하는가
2. 유효 / 만료 / 폐기 invite와 1회용 재사용 방지 케이스가 모두 포함되는가
3. `user` 성공 플로우가 `nextState='active'`와 로그인 handoff까지 연결되는가
4. 실패 플로우가 모두 canonical `INVALID_INVITE_CODE` 기준으로 판정되는가
5. 재사용 차단과 race condition 방어가 각각 별도 security 시나리오로 존재하는가
6. invite 원문 재노출 금지와 admin 승인 큐 비대상 규칙이 보안 항목으로 명시되는가
7. 각 시나리오가 추후 Playwright 자동화로 옮길 수 있는 단계형 구조를 갖는가

## 17) P2-2.x/P2-3.x 접근/승인 라우팅 시나리오 (Canonical)

### 17.1 상태 기반 라우팅 매트릭스

| Scenario    | Input AccessState           | Entry URL          | Expected URL       | Notes                          |
| :---------- | :-------------------------- | :----------------- | :----------------- | :----------------------------- |
| `P2-RT-001` | `unauthenticated`           | `/schedule/step1`  | `/login`           | 보호 라우트 접근 차단          |
| `P2-RT-002` | `admin_pending`             | `/schedule/step1`  | `/access/pending`  | 미승인 admin 강제 우회         |
| `P2-RT-003` | `admin_rejected`            | `/schedule/step1`  | `/access/rejected` | 반려 admin 강제 우회           |
| `P2-RT-004` | `admin_pending`             | `/login`           | `/access/pending`  | 인증페이지 재진입 시 상태 우선 |
| `P2-RT-005` | `admin_rejected`            | `/signup`          | `/access/rejected` | 인증페이지 재진입 시 상태 우선 |
| `P2-RT-006` | `user_active`               | `/access/pending`  | `/schedule/step1`  | 상태 페이지 우회 금지          |
| `P2-RT-007` | `admin_active`              | `/access/rejected` | `/schedule/step1`  | 상태 페이지 우회 금지          |
| `P2-RT-008` | `no_membership_or_inactive` | `/schedule/step1`  | `/login`           | 비활성 계정 보호 라우트 차단   |

### 17.2 복구/직접 접근 시나리오

#### P2-RT-009: 직접 URL 접근 (pending)

- `Precondition`: 세션 존재 + resolved `accessState='admin_pending'`
- `Steps`:
  1. 브라우저 주소창에 `/schedule/step3` 직접 입력
  2. 페이지 로드 완료 대기
- `Expected`:
  - 최종 URL은 `/access/pending`
  - schedule step guard보다 상태 가드가 먼저 적용됨

#### P2-RT-010: 세션 복구 후 상태 재평가 (rejected)

- `Precondition`: 이전 세션 존재 + `accessState='admin_rejected'`
- `Steps`:
  1. `/schedule/step1`에서 새로고침
  2. 세션 복구 및 auth-context 재해석 완료 대기
- `Expected`:
  - 최종 URL은 `/access/rejected`
  - 캐시된 이전 라우트 상태로 접근 허용되지 않음

### 17.3 P2-3.5 통합 플로우 시나리오

#### P2-E2E-001: Admin signup pending -> approve -> login allow

- `Flow`:
  1. admin signup 제출
  2. 로그인 시 `/access/pending` 유도
  3. superuser가 approve
  4. 동일 계정 재로그인
- `Expected`:
  - 승인 전 보호 라우트 접근 불가
  - 승인 후 보호 라우트 접근 가능

#### P2-E2E-002: Admin signup pending -> reject -> rejected screen

- `Flow`:
  1. admin signup 제출
  2. superuser가 reject
  3. 대상 계정 로그인
- `Expected`:
  - `/access/rejected` 유도
  - rejection reason 존재 시 화면 노출

#### P2-E2E-003: User invite signup active path

- `Flow`:
  1. user invite signup 성공
  2. 로그인
- `Expected`:
  - `active` 상태로 보호 라우트 진입 허용
  - approval queue 비대상 유지

### 17.4 자동화 후보

1. unit: `router beforeEach` 매트릭스 (`P2-RT-001` ~ `P2-RT-008`)
2. unit/component: `AccessState` pending/rejected copy + logout CTA
3. integration/e2e: `P2-E2E-001` ~ `P2-E2E-003`

## 18) P3-3.4 온보딩 E2E 시나리오 세트 (Canonical)

본 섹션은 `admin_active` 최초 로그인 온보딩 전체 플로우를 위한 E2E 시나리오 세트다.  
범위는 forced entry, 단계 완료, refresh resume, relogin skip, approval 우선 차단, non-admin deny, API/store/guard 정합성 검증이다.

기준 문서:

- `docs/migration/P3_ONBOARDING_STATE_MACHINE.md`
- `docs/migration/P3_ONBOARDING_WIZARD_UX.md`
- `docs/migration/P3_ONBOARDING_GUARD_RULE_MATRIX.md`
- `docs/API_SPEC.md`의 `onboarding-progress` contract

비범위:

- direct URL / back-button / logout-login 우회 회귀 자체는 `P3-3.3`에서 별도 검증한다.
- router `beforeEach` 삽입 순서의 구현 상세는 `P3-3.2`에서 확정한다.

### 18.1 공통 전제

1. 테스트 actor는 기본적으로 승인 완료된 `admin_active` 또는 비교 대상 `user_active` / `admin_pending`이다.
2. onboarding 상태는 organization-scoped이며, 테스트 데이터는 조직 단위로 준비한다.
3. `onboarding-progress` 호출은 `supabase.functions.invoke('onboarding-progress')` 경계를 사용한다.
4. canonical step key는 `organization_info` -> `employee_seed` -> `schedule_request` 순서를 유지한다.
5. Step 1, Step 2는 `update` action, 최종 완료는 `complete` action을 사용한다.
6. 완료 후 canonical landing은 `/dashboard/admin`이며, 현재 앱이 임시로 `/schedule/step1`을 post-auth baseline으로 사용하더라도 온보딩 완료 목적지는 dashboard semantics를 유지해야 한다.
7. E2E 판정은 자유 텍스트가 아니라 route, CTA label, API payload, store state, 완료 UI 상태를 함께 본다.

### 18.2 시나리오 템플릿

| Field                   | 설명                                              |
| :---------------------- | :------------------------------------------------ |
| `Scenario ID`           | 고유 식별자 (`E2E-ONB-00N`)                       |
| `Category`              | `happy`, `fail`, `security`                       |
| `Goal`                  | 검증 목적                                         |
| `Precondition`          | actor 상태, onboarding row, 조직 fixture          |
| `Steps`                 | 실제 사용자 흐름 기준 단계                        |
| `Expected Result`       | route, CTA, UI 상태, API/store 기대 결과          |
| `API / Store Assertion` | `get` / `update` / `complete`와 store 동기화 검증 |
| `Guard Assertion`       | access-state / onboarding redirect 기대 결과      |
| `Automation Note`       | Playwright 전환 시 주의점                         |

### 18.3 Happy Path

#### E2E-ONB-001

- `Scenario ID`: `E2E-ONB-001`
- `Category`: `happy`
- `Goal`: 승인 완료된 admin의 최초 로그인 시 onboarding이 강제 진입되고, 3단계 완료 후 dashboard로 이동하는지 검증한다.
- `Precondition`:
  - actor는 `admin_active`다.
  - 대상 조직의 onboarding은 미완료 상태다.
  - `get` 응답은 `currentStepKey='organization_info'`, `completedStepKeys=[]`, `isOnboardingComplete=false`다.
  - 조직에는 Step 2 완료 전까지 schedulable employee가 없고, Step 3 완료 전까지 persisted schedule request가 없다.
- `Steps`:
  1. admin이 `/login`에서 로그인한다.
  2. post-auth 첫 진입 route를 기다린다.
  3. onboarding 첫 화면에서 headline, 3-step indicator, Step 1 확장 상태를 확인한다.
  4. Step 1 CTA `조직 정보 확인하기`를 클릭해 조직 설정 entry surface로 이동한다.
  5. 조직 최소 설정을 저장하고 onboarding surface로 복귀하거나 상태 갱신을 기다린다.
  6. Step 2 CTA `직원 등록하러 가기`를 클릭해 직원 등록 entry surface로 이동한다.
  7. 직원 1명 이상을 실제로 생성하고 onboarding surface로 복귀하거나 상태 갱신을 기다린다.
  8. Step 3 CTA `첫 스케줄 요청 시작하기`를 클릭해 첫 스케줄 생성 entry surface로 이동한다.
  9. 첫 persisted schedule request를 시작하고 onboarding 완료 상태를 기다린다.
  10. 완료 화면에서 `대시보드로 이동` CTA를 클릭한다.
- `Expected Result`:
  - 로그인 직후 최종 URL은 `/onboarding`이다.
  - onboarding shell에는 `EveryShift 시작 준비를 함께 완료해볼까요?` headline과 3단계 진행 표시가 보인다.
  - Step 1에서는 later step card가 disabled preview로 보인다.
  - Step 1 완료 후 `조직 기본 설정이 준비되었습니다.`와 함께 Step 2가 자동 확장된다.
  - Step 2 완료 후 `첫 직원 등록이 완료되었습니다.`와 함께 Step 3가 자동 확장된다.
  - Step 2 deep-link 시 직원관리 메뉴가 식별 가능하게 강조되고, onboarding으로 복귀 가능한 진입점이 제공된다.
  - Step 3 deep-link 시 스케줄 생성 시작 지점이 강조되고, onboarding으로 복귀 가능한 진입점이 제공된다.
  - Step 3 완료 후 최종 성공 headline `이제 EveryShift를 사용할 준비가 되었습니다!`와 CTA `대시보드로 이동`이 표시된다.
  - 최종 CTA 실행 후 URL은 `/dashboard/admin`으로 이동한다.
- `API / Store Assertion`:
  - 최초 진입 시 `action='get'` 성공 응답이 store의 canonical source가 된다.
  - Step 1 완료 시 `update(stepKey='organization_info')` 성공 후 store는 `currentStepKey='employee_seed'`로 이동한다.
  - Step 2 완료 시 `update(stepKey='employee_seed')` 성공 후 store는 `currentStepKey='schedule_request'`로 이동한다.
  - Step 3 완료 시 `complete` 성공 후 store는 `currentStepKey=null`, `completedStepKeys` 3개, `isOnboardingComplete=true`, `completedAt!=null`을 반영한다.
  - 완료 UI는 `complete` API 성공 전에 먼저 표시되면 안 된다.
- `Guard Assertion`:
  - `admin_active + incomplete onboarding` 조합에서 auth page 이탈 결과는 `/onboarding`이다.
  - schedule step guard는 onboarding completion 전까지 실행 결과를 노출하지 않는다.
- `Automation Note`:
  - Playwright 전환 시 각 단계 완료는 UI copy만이 아니라 network payload와 store snapshot으로 함께 검증한다.
  - Step 2, Step 3는 deep-link 페이지 왕복이 포함되므로 browser URL change와 return CTA 노출 여부를 모두 캡처한다.

#### E2E-ONB-002

- `Scenario ID`: `E2E-ONB-002`
- `Category`: `happy`
- `Goal`: onboarding 도중 refresh 이후에도 canonical progress를 다시 읽어 현재 단계에서 재개하는지 검증한다.
- `Precondition`:
  - actor는 `admin_active`다.
  - 대상 조직은 Step 1 완료, Step 2 미완료 상태다.
  - `get` 응답은 `currentStepKey='employee_seed'`, `completedStepKeys=['organization_info']`, `isOnboardingComplete=false`다.
- `Steps`:
  1. admin이 보호 라우트 또는 `/onboarding`으로 진입한다.
  2. onboarding Step 2 화면이 렌더링된 것을 확인한다.
  3. 브라우저 새로고침을 실행한다.
  4. 세션 복구와 onboarding progress 재로딩이 완료될 때까지 기다린다.
- `Expected Result`:
  - refresh 전후 최종 URL은 계속 `/onboarding`이다.
  - Step 1은 `완료` 상태로 접혀 있고 Step 2가 다시 확장된다.
  - Step 2 CTA `직원 등록하러 가기`가 유지되고, Step 3는 여전히 disabled preview 상태다.
  - 사용자는 Step 1부터 다시 시작하지 않는다.
- `API / Store Assertion`:
  - refresh 후 store는 local transient state가 아니라 `get` 응답을 다시 canonical source로 사용한다.
  - 복구 직후 store의 `currentStepKey`는 `employee_seed`이며 `completedStepKeys=['organization_info']`와 일치한다.
- `Guard Assertion`:
  - `admin_active + incomplete onboarding` 상태는 refresh 이후에도 보호 라우트 접근 대신 `/onboarding` 유지가 우선이다.
- `Automation Note`:
  - Playwright 전환 시 `page.reload()` 후 skeleton/loading 종료 시점에서 step status를 재검증한다.

#### E2E-ONB-003

- `Scenario ID`: `E2E-ONB-003`
- `Category`: `happy`
- `Goal`: onboarding 완료 조직의 admin은 재로그인 시 onboarding을 건너뛰고 dashboard로 바로 진입하는지 검증한다.
- `Precondition`:
  - actor는 `admin_active`다.
  - 대상 조직 onboarding은 이미 완료 상태다.
  - `get` 응답은 `currentStepKey=null`, `completedStepKeys=['organization_info','employee_seed','schedule_request']`, `isOnboardingComplete=true`, `completedAt!=null`이다.
- `Steps`:
  1. admin이 로그아웃한 뒤 다시 로그인한다.
  2. post-auth landing이 안정화될 때까지 기다린다.
  3. 같은 세션에서 `/onboarding`으로 직접 이동을 시도한다.
- `Expected Result`:
  - 재로그인 직후 onboarding 화면이 나타나지 않는다.
  - 최종 landing은 `/dashboard/admin`이다.
  - `/onboarding` 직접 진입 시도는 허용되지 않으며 정상 post-auth route로 되돌린다.
  - onboarding completion screen이 재노출되지 않는다.
- `API / Store Assertion`:
  - 재로그인 후 store는 completed progress를 읽고 `isOnboardingComplete=true` 상태를 유지한다.
  - client는 `complete`를 다시 호출하지 않는다.
- `Guard Assertion`:
  - `admin_active + complete onboarding` 조합에서 `/onboarding`은 deny되고 normal post-auth route가 우선한다.
- `Automation Note`:
  - Playwright 전환 시 새 browser context에서 relogin을 수행해 캐시된 메모리 상태 의존성을 제거한다.

### 18.4 Fail / Edge Path

#### E2E-ONB-004

- `Scenario ID`: `E2E-ONB-004`
- `Category`: `fail`
- `Goal`: 승인 대기 admin은 onboarding보다 approval pending 차단이 먼저 적용되는지 검증한다.
- `Precondition`:
  - actor는 인증 가능하지만 `accessState='admin_pending'`다.
  - onboarding row 존재 여부와 무관하다.
- `Steps`:
  1. pending admin이 로그인한다.
  2. `/onboarding`으로 직접 진입을 시도한다.
  3. 보호 라우트 진입도 한 번 더 시도한다.
- `Expected Result`:
  - 로그인 직후 또는 `/onboarding` 직접 접근 시 최종 URL은 `/access/pending`이다.
  - onboarding wizard shell, step CTA, deep-link UI는 전혀 보이지 않는다.
  - pending 안내 화면만 노출된다.
- `API / Store Assertion`:
  - onboarding `get` / `update` / `complete` 호출은 발생하지 않거나, 발생 시 허용되면 안 된다.
  - onboarding store는 active progress state로 hydrate되면 안 된다.
- `Guard Assertion`:
  - `admin_pending`은 onboarding evaluation에 진입하지 않는다.
  - approval blocking redirect가 onboarding redirect보다 우선한다.
- `Automation Note`:
  - Playwright 전환 시 network spy로 onboarding-progress invoke 부재를 확인하는 편이 안전하다.

#### E2E-ONB-005

- `Scenario ID`: `E2E-ONB-005`
- `Category`: `fail`
- `Goal`: 최종 완료 직전 `complete` API 실패 시 UI가 완료 상태를 성급하게 표시하지 않는지 검증한다.
- `Precondition`:
  - actor는 `admin_active`다.
  - 대상 조직은 Step 1, Step 2 완료 상태이며 Step 3에서 `complete` 호출만 남아 있다.
  - `complete` 응답은 `success=false`와 canonical `error.code`(`PERMISSION_DENIED` 또는 `INTERNAL_ERROR`)를 반환하도록 준비한다.
- `Steps`:
  1. Step 3에서 `첫 스케줄 요청 시작하기` 흐름을 끝까지 진행한다.
  2. 최종 `complete` 호출 실패를 발생시킨다.
  3. 실패 후 onboarding 화면 상태를 관찰한다.
- `Expected Result`:
  - 완료 headline `이제 EveryShift를 사용할 준비가 되었습니다!`는 표시되지 않는다.
  - `대시보드로 이동` CTA는 primary success state로 표시되지 않는다.
  - 사용자는 여전히 Step 3 문맥에 머무르며 재시도 가능한 오류 피드백을 본다.
  - route는 `/dashboard/admin`으로 이동하지 않는다.
- `API / Store Assertion`:
  - store는 `isOnboardingComplete=false`, `currentStepKey='schedule_request'`를 유지한다.
  - `completedAt`는 비어 있어야 한다.
  - client는 API 실패와 무관하게 local step status를 terminal complete로 덮어쓰면 안 된다.
- `Guard Assertion`:
  - 실패 후에도 `admin_active + incomplete onboarding` 상태이므로 이후 navigation은 계속 `/onboarding` 우선이다.
- `Automation Note`:
  - Playwright 전환 시 network mock 또는 test harness로 `complete` 실패를 deterministically 주입한다.

### 18.5 Security / Access Control

#### E2E-ONB-006

- `Scenario ID`: `E2E-ONB-006`
- `Category`: `security`
- `Goal`: 일반 사용자(`user_active`)는 `/onboarding`과 onboarding deep-link 문맥에 접근할 수 없는지 검증한다.
- `Precondition`:
  - actor는 `user_active`다.
  - 대상 조직 onboarding 완료 여부와 무관하다.
- `Steps`:
  1. user가 로그인한다.
  2. 주소창으로 `/onboarding` 직접 진입을 시도한다.
  3. 온보딩 deep-link가 붙은 URL 또는 onboarding 복귀 query가 포함된 링크가 있다면 동일하게 접근을 시도한다.
- `Expected Result`:
  - `/onboarding`은 허용되지 않는다.
  - 최종 route는 normal post-auth route로 이동한다.
  - onboarding shell, step CTA, 완료 화면, 복귀 배너가 모두 보이지 않는다.
  - deep-link query가 있더라도 user를 onboarding actor처럼 취급하지 않는다.
- `API / Store Assertion`:
  - onboarding-progress 호출은 발생하지 않거나 성공해서는 안 된다.
  - onboarding store는 user 세션에서 active wizard state를 만들지 않는다.
- `Guard Assertion`:
  - `user_active`는 onboarding actor가 아니므로 `/onboarding` deny 후 normal post-auth route로 보낸다.
- `Automation Note`:
  - Playwright 전환 시 query-string만 바꿔도 권한이 상승하지 않는지 확인한다.

#### E2E-ONB-007

- `Scenario ID`: `E2E-ONB-007`
- `Category`: `security`
- `Goal`: 완료된 onboarding 상태는 organization-scoped로 유지되고, 이미 완료된 조직에서는 다른 admin도 다시 onboarding에 들어가지 않는지 검증한다.
- `Precondition`:
  - 동일 조직에 admin A와 admin B가 있다.
  - admin A가 onboarding을 완료해 조직 상태가 terminal complete다.
  - admin B는 개인 로컬 캐시가 비어 있는 새 세션이다.
- `Steps`:
  1. admin B가 새 세션에서 로그인한다.
  2. post-auth landing을 확인한다.
  3. `/onboarding` 직접 접근을 시도한다.
- `Expected Result`:
  - admin B도 onboarding으로 강제 진입되지 않는다.
  - 최종 landing은 `/dashboard/admin`이다.
  - `/onboarding` 직접 접근 시 허용되지 않는다.
  - organization-scoped 완료 상태 때문에 개인별 재온보딩이 발생하지 않는다.
- `API / Store Assertion`:
  - `get` 응답은 completed progress를 반환하며 user-scoped empty state를 만들지 않는다.
  - store는 admin B 개인 기준이 아니라 조직 기준 completion을 반영한다.
- `Guard Assertion`:
  - onboarding force는 global user flag가 아니라 effective organization 기준으로 계산된다.
- `Automation Note`:
  - Playwright 전환 시 admin A, admin B 두 계정을 분리된 fixture로 운영한다.

### 18.6 리뷰 체크리스트

1. `first login force-in` happy path가 3단계 CTA, deep-link, final dashboard landing까지 포함되는가
2. `refresh resume` 시나리오가 `get` 재로딩과 step resume을 함께 검증하는가
3. `relogin skip` 시나리오가 completed admin의 `/onboarding` 재진입 거부까지 포함하는가
4. `approval pending`이 onboarding보다 먼저 차단된다는 fail path가 존재하는가
5. `non-admin deny`가 onboarding shell 부재와 API/store 미진입까지 확인하는가
6. `complete` API 실패 시 UI 완료 상태가 선반영되지 않는다는 정합성 시나리오가 존재하는가
7. 조직 단위 completion ownership 때문에 다른 admin도 재온보딩되지 않는다는 security 시나리오가 존재하는가
8. 모든 시나리오가 route, API payload, store state, CTA copy 중 2개 이상을 함께 검증하는가

### 18.7 자동화 후보

1. Playwright full-flow: `E2E-ONB-001`, `E2E-ONB-002`, `E2E-ONB-003`
2. Network-mocked integration: `E2E-ONB-004`, `E2E-ONB-005`, `E2E-ONB-006`
3. Multi-account org-scoped regression: `E2E-ONB-007`
