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

### 18.8 P3-3.3 온보딩 guard / 재진입 회귀 시나리오 (Addendum)

본 subsection은 Task `10000000-0000-4000-8000-000000000075`의 산출물이다.
범위는 P3-3.4 canonical full onboarding happy path를 다시 반복하는 것이 아니라,
이미 구현된 guard precedence, deep-link compatibility, 재진입 CTA, completion
boundary를 브라우저 레벨에서 회귀 검증하는 데 있다.

대상 문서/코드:

- `src/router/guards.ts`
- `src/router/index.ts`
- `src/views/Onboarding.vue`
- `src/views/schedule/Step3EmployeeInfo.vue`
- `src/utils/onboarding-context.ts`
- `tests/unit/router-auth-guards.spec.ts`

비범위:

- 실제 조직/직원/스케줄 생성의 end-to-end happy path
- `complete` action 성공 후 최종 저장 payload 상세
- multi-account organization-scoped completion ownership full fixture

#### 18.8.1 회귀 목표

1. `admin_active + incomplete onboarding` 세션은 보호 라우트 direct URL에서도 `/onboarding`으로 강제 복귀된다.
2. `employee_seed` deep-link는 `/schedule/step3`에서만 허용되고, 화면에는 onboarding 복귀 CTA가 노출된다.
3. 새로고침 후에도 `/onboarding`은 canonical progress 기준으로 같은 단계에서 재개된다.
4. onboarding 완료 후 `/onboarding` direct access는 허용되지 않고 normal post-auth route로 되돌아간다.
5. `admin_pending`, `user_active`는 `/onboarding` actor가 아니므로 onboarding shell을 보지 못한다.

#### 18.8.2 회귀 시나리오 템플릿

| Field               | 설명                                                            |
| :------------------ | :-------------------------------------------------------------- |
| `Scenario ID`       | 고유 식별자 (`E2E-ONB-REG-00N`)                                 |
| `Target Route`      | 정확한 route path                                               |
| `Exact UI Surface`  | exact tab / banner / CTA / shell                                |
| `Actor`             | access-state fixture                                            |
| `User Action`       | 클릭, 새로고침, 주소 직접 입력, back-button 등 실제 사용자 동작 |
| `Expected Result`   | 최종 route, 표시 UI, query 유지/제거 여부                       |
| `Automation Status` | `playwright`, `manual`, `unit-covered`                          |
| `Related Baseline`  | 연관 unit or canonical E2E scenario                             |

#### E2E-ONB-REG-001

- `Scenario ID`: `E2E-ONB-REG-001`
- `Target Route`: `/schedule/step1`
- `Exact UI Surface`: `/onboarding` shell headline, step progress card
- `Actor`: `admin_active` + incomplete onboarding (`currentStepKey='organization_info'`)
- `User Action`:
  1. 로그인 후 브라우저 주소창으로 `/schedule/step1`을 직접 입력한다.
  2. route stabilization이 끝날 때까지 기다린다.
- `Expected Result`:
  - 최종 route는 `/onboarding`이다.
  - `/onboarding` 상단 headline `EveryShift 시작 준비를 함께 완료해볼까요?`가 보인다.
  - onboarding shell 바깥의 schedule step surface는 노출되지 않는다.
- `Automation Status`: `playwright`
- `Related Baseline`: `tests/unit/router-auth-guards.spec.ts`의 incomplete admin redirect regression

#### E2E-ONB-REG-002

- `Scenario ID`: `E2E-ONB-REG-002`
- `Target Route`: `/onboarding`
- `Exact UI Surface`: Step 2 current card, `직원 등록하러 가기` CTA
- `Actor`: `admin_active` + incomplete onboarding (`currentStepKey='employee_seed'`)
- `User Action`:
  1. `/onboarding`으로 진입한다.
  2. Step 2가 current 상태인 것을 확인한다.
  3. 브라우저 새로고침을 실행한다.
- `Expected Result`:
  - refresh 전후 최종 route는 계속 `/onboarding`이다.
  - Step 1은 완료 상태로 접혀 있고 Step 2 CTA `직원 등록하러 가기`가 다시 보인다.
  - Step 3 `첫 스케줄 요청 시작하기`는 current로 승격되지 않는다.
- `Automation Status`: `playwright`
- `Related Baseline`: `E2E-ONB-002`

#### E2E-ONB-REG-003

- `Scenario ID`: `E2E-ONB-REG-003`
- `Target Route`: `/schedule/step3?source=onboarding&step=employee_seed&entry=excel`
- `Exact UI Surface`: Step3EmployeeInfo onboarding banner, excel upload callout, footer return CTA
- `Actor`: `admin_active` + incomplete onboarding (`currentStepKey='employee_seed'`)
- `User Action`:
  1. `/onboarding` Step 2 current card에서 `엑셀 업로드로 시작` CTA를 클릭한다.
  2. onboarding banner와 excel surface를 확인한다.
  3. 하단 `온보딩으로 돌아가기` CTA를 클릭한다.
- `Expected Result`:
  - CTA 클릭 결과 route는 `/schedule/step3?source=onboarding&step=employee_seed&entry=excel...`로 이동한다.
  - onboarding banner(`data-test='onboarding-banner'`)가 보인다.
  - `data-test='excel-upload-entry'` 영역이 보인다.
  - 하단 `data-test='onboarding-footer-return'` CTA가 보인다.
  - CTA 클릭 후 route는 `/onboarding`으로 돌아가고 `step=employee_seed` query 문맥이 유지된다.
- `Automation Status`: `playwright`
- `Related Baseline`: `tests/unit/router-auth-guards.spec.ts` employee-seed compatibility allow

#### E2E-ONB-REG-004

- `Scenario ID`: `E2E-ONB-REG-004`
- `Target Route`: `/onboarding`
- `Exact UI Surface`: onboarding shell absence, `/dashboard/admin` summary surface
- `Actor`: `admin_active` + completed onboarding
- `User Action`:
  1. 완료 상태 admin으로 로그인한다.
  2. 같은 세션에서 브라우저 주소창으로 `/onboarding`을 직접 입력한다.
- `Expected Result`:
  - route guard 단계에서는 `/onboarding` direct access가 거부된다.
  - 이후 current app shell에서 post-auth fallback route는 `/schedule/step1`이며, screen-level normalization에 따라 `/dashboard/admin`으로 이어질 수 있다.
  - onboarding headline, completion card, onboarding CTA는 보이지 않는다.
- `Automation Status`: `playwright`
- `Related Baseline`: `tests/unit/router-auth-guards.spec.ts` completed admin deny

#### E2E-ONB-REG-005

- `Scenario ID`: `E2E-ONB-REG-005`
- `Target Route`: `/onboarding`
- `Exact UI Surface`: approval pending screen only
- `Actor`: `admin_pending`
- `User Action`:
  1. pending admin으로 로그인한다.
  2. `/onboarding`을 직접 입력한다.
- `Expected Result`:
  - 최종 route는 `/access/pending`이다.
  - onboarding shell headline과 step CTA는 보이지 않는다.
  - approval pending 안내 화면만 보인다.
- `Automation Status`: `playwright`
- `Related Baseline`: `E2E-ONB-004`, `tests/unit/router-auth-guards.spec.ts`

#### E2E-ONB-REG-006

- `Scenario ID`: `E2E-ONB-REG-006`
- `Target Route`: `/onboarding`
- `Exact UI Surface`: onboarding shell absence
- `Actor`: `user_active`
- `User Action`:
  1. 일반 사용자로 로그인한다.
  2. `/onboarding`을 직접 입력한다.
- `Expected Result`:
  - route guard 기준 `/onboarding`은 거부된다.
  - 이후 normal post-auth route 또는 그 다음 screen-level normalization으로 정리된다.
  - onboarding shell, completion card, onboarding return banner는 보이지 않는다.
- `Automation Status`: `unit-covered`
- `Related Baseline`: `E2E-ONB-006`, `tests/unit/router-auth-guards.spec.ts`

#### E2E-ONB-REG-007

- `Scenario ID`: `E2E-ONB-REG-007`
- `Target Route`: `/schedule/step3?source=onboarding&step=employee_seed`
- `Exact UI Surface`: onboarding banner + browser history
- `Actor`: `admin_active` + incomplete onboarding (`currentStepKey='employee_seed'`)
- `User Action`:
  1. onboarding shell에서 `직원 등록하러 가기`를 눌러 `/schedule/step3`로 이동한다.
  2. 브라우저 뒤로가기를 누른다.
  3. 다시 주소창으로 `/schedule/step1`을 직접 입력한다.
- `Expected Result`:
  - 뒤로가기 직후 route는 `/onboarding`으로 돌아간다.
  - 그 상태에서 `/schedule/step1` direct URL을 입력하면 다시 `/onboarding`으로 강제 복귀된다.
- `Automation Status`: `manual`
- `Related Baseline`: `E2E-ONB-REG-001`, `E2E-ONB-REG-003`

#### E2E-ONB-REG-008

- `Scenario ID`: `E2E-ONB-REG-008`
- `Target Route`: `/login` -> post-auth landing -> `/onboarding`
- `Exact UI Surface`: login form, `/dashboard/admin` landing surface
- `Actor`: `admin_active` + completed onboarding
- `User Action`:
  1. 완료 상태 admin으로 로그인한다.
  2. 로그아웃 후 다시 로그인한다.
  3. `/onboarding` 직접 접근을 시도한다.
- `Expected Result`:
  - 로그인 직후와 재로그인 직후 모두 onboarding shell이 아니라 `/dashboard/admin`이 노출된다.
  - `/onboarding` 직접 접근은 여전히 허용되지 않는다.
- `Automation Status`: `manual`
- `Related Baseline`: `E2E-ONB-003`, `E2E-ONB-REG-004`

#### 18.8.3 자동화 범위 결정

Playwright로 우선 자동화하는 범위:

1. `E2E-ONB-REG-001`
2. `E2E-ONB-REG-002`
3. `E2E-ONB-REG-003`
4. `E2E-ONB-REG-004`
5. `E2E-ONB-REG-005`

수동 검증으로 남기는 범위:

1. `E2E-ONB-REG-006`
2. `E2E-ONB-REG-007`
3. `E2E-ONB-REG-008`

수동으로 남기는 이유:

- browser history/back-button은 mocked browser flow에서도 가능하지만 flake 가능성이 높다.
- `user_active` direct deny는 unit router baseline이 이미 존재하고, current app의 screen-level normalization이 추가돼 route assertion만으로는 E2E 신호가 약하다.
- relogin skip은 별도 계정/세션 fixture와 cleanup 비용이 커서 regression smoke 1차 범위를 넘는다.

#### 18.8.4 실행 로그 기록 규칙

- Playwright 실행 파일: `tests/e2e/onboarding-regression.spec.ts`
- 권장 실행 명령: `pnpm exec playwright test tests/e2e/onboarding-regression.spec.ts`
- 결과 기록 방식:
  - pass한 자동화 시나리오 ID를 task summary와 verification log에 남긴다.
  - 수동 시나리오는 route, exact surface, user action, expected result를 체크리스트로만 남기고 미실행이면 `manual pending`으로 표시한다.

#### 18.8.5 실행 로그 (`2026-03-24`, PDT)

- 실행 명령:
  - `pnpm lint:check`
  - `pnpm exec vitest run tests/unit/router-auth-guards.spec.ts tests/unit/onboarding-reentry.spec.ts`
  - `pnpm exec playwright test tests/e2e/onboarding-regression.spec.ts`
- 확인 결과:
  - lint 통과
  - unit 25 tests 통과 (`router-auth-guards`, `onboarding-reentry`)
  - Playwright 5 scenarios 통과:
    - `E2E-ONB-REG-001`
    - `E2E-ONB-REG-002`
    - `E2E-ONB-REG-003`
    - `E2E-ONB-REG-004`
    - `E2E-ONB-REG-005`
  - `E2E-ONB-REG-006` ~ `E2E-ONB-REG-008`은 manual pending

### 18.9 Phase 3 UI 기반 통합테스트 실행 세트 (Consolidated)

본 subsection은 이미 정의된 `18.3`~`18.8`의 canonical/onboarding regression 시나리오를
실행 관점으로 다시 묶은 Phase 3 통합 검증 runbook이다.
목표는 `.shrimp-data/tasks.json`의 P3 완료 범위를 실제 화면 기준으로 한 번에 확인하는 것이다.

이 subsection은 새로운 정답 소스를 만들지 않는다.
세부 기대 결과는 기존 `E2E-ONB-*`, `E2E-ONB-REG-*`를 따르고, 여기서는
"어떤 순서로 어떤 화면을 어떻게 검증하면 P3 전체 구현이 통과로 판단되는가"를 명확히 적는다.

#### 18.9.1 커버리지 매핑

| P3 범위                      | UI로 확인하는 핵심 증거                                                | 주 시나리오                                 |
| :--------------------------- | :--------------------------------------------------------------------- | :------------------------------------------ |
| `P3-1.1`, `P3-3.1`, `P3-3.2` | `/onboarding` forced entry, actor 제한, incomplete-only 접근           | `P3-UI-INT-001`, `004`, `005`, `006`        |
| `P3-1.3`, `P3-1.4`           | `get/update/complete` 이후 step 전환, refresh resume, relogin skip     | `P3-UI-INT-001`, `002`, `007`               |
| `P3-2.1`                     | `/onboarding` 헤더, 3단계 progress, CTA 문구, 완료 화면                | `P3-UI-INT-001`                             |
| `P3-2.2`, `P3-2.4`, `P3-2.5` | Step 2 manual/excel 딥링크, onboarding banner, 복귀 CTA                | `P3-UI-INT-003`                             |
| `P3-3.4`, `P3-3.5`           | full-flow happy path + refresh/direct-url/back-button 성격의 회귀 경계 | `P3-UI-INT-001`, `002`, `003`, `004`, `007` |

#### 18.9.2 권장 actor / 계정 fixture

| Actor                                  | 권장 계정                                      | 사용 목적                                           |
| :------------------------------------- | :--------------------------------------------- | :-------------------------------------------------- |
| `admin_active + incomplete onboarding` | `sindeaf@gmail.com` 또는 P3 incomplete fixture | full-flow, refresh, deep-link, direct URL 강제 진입 |
| `admin_active + completed onboarding`  | 완료 조직에 연결된 admin fixture               | relogin skip, `/onboarding` 재진입 차단             |
| `admin_pending`                        | `p3-admin-pending@example.com`                 | approval pending 우선 차단                          |
| `user_active`                          | `p3-user-active@example.com`                   | non-admin deny                                      |

주의:

1. `admin_active + completed onboarding` 검증은 organization-scoped 완료 fixture가 필요하다.
2. 동일 조직에 admin 2명을 준비할 수 있으면 organization-scoped ownership 회귀까지 함께 확인하는 편이 좋다.
3. fixture가 없으면 Playwright mock 기반으로 route/API/store contract만 우선 고정하고, shared org 실데이터 변형은 피한다.

#### 18.9.3 실행 순서

아래 순서대로 실행하면 P3 구현 범위를 중복 없이 확인할 수 있다.

#### P3-UI-INT-001 신규 admin 온보딩 전체 완료 플로우

- `Target Route`: `/login` -> `/onboarding` -> 조직 정보 surface -> `/schedule/step3?...` -> 스케줄 시작 surface -> `/dashboard/admin`
- `Exact UI Surface`:
  - `/login` 로그인 폼
  - `/onboarding` 헤더 `EveryShift 시작 준비를 함께 완료해볼까요?`
  - 3단계 progress card
  - Step 1 CTA `조직 정보 확인하기`
  - Step 2 CTA `직원 등록하러 가기`, `엑셀 업로드로 시작`
  - Step 3 CTA `첫 스케줄 요청 시작하기`
  - 완료 카드의 `대시보드로 이동`
- `Actor`: `admin_active` + incomplete onboarding (`currentStepKey='organization_info'`)
- `User Action`:
  1. `/login`에서 로그인한다.
  2. `/onboarding` 강제 진입을 확인한다.
  3. Step 1에서 시프트 1개 이상, 사이트 1개 이상을 준비한 뒤 `조직 정보 확인하기`를 클릭한다.
  4. Step 2가 자동 확장되는지 확인한 뒤 `직원 등록하러 가기` 또는 `엑셀 업로드로 시작`으로 이동한다.
  5. 직원 1명 이상을 저장하고 온보딩으로 복귀한다.
  6. Step 3에서 `첫 스케줄 요청 시작하기`를 눌러 첫 스케줄 시작 흐름으로 이동한다.
  7. 첫 persisted schedule request 시작 후 완료 카드가 나타나는지 확인한다.
  8. `대시보드로 이동`을 클릭한다.
- `Expected Result`:
  - 로그인 직후 최종 route는 `/onboarding`이다.
  - Step 1 완료 후 `조직 기본 설정이 준비되었습니다.` 메시지와 함께 Step 2가 current가 된다.
  - Step 2 완료 후 `첫 직원 등록이 완료되었습니다.` 메시지와 함께 Step 3가 current가 된다.
  - 최종 완료 시 `이제 EveryShift를 사용할 준비가 되었습니다!`가 보인다.
  - `대시보드로 이동` 클릭 후 최종 route는 `/dashboard/admin`이다.
- `Scope Boundary`:
  - route guard 확인: `/login` 이후 forced entry
  - screen-level 확인: `/onboarding` shell, step card, completion card
  - in-screen action 확인: Step 1/2/3 CTA와 단계 전환
- `Related Baseline`: `E2E-ONB-001`

#### P3-UI-INT-002 새로고침 후 현재 단계 재개

- `Target Route`: `/onboarding`
- `Exact UI Surface`: Step 2 current card, `직원 등록하러 가기` CTA, Step 1 completed summary
- `Actor`: `admin_active` + incomplete onboarding (`currentStepKey='employee_seed'`)
- `User Action`:
  1. `/onboarding`에서 Step 2가 current인 상태까지 진입한다.
  2. 브라우저 새로고침을 실행한다.
  3. 로딩 종료 후 현재 단계와 완료 단계 표시를 다시 확인한다.
- `Expected Result`:
  - refresh 전후 route는 `/onboarding`으로 유지된다.
  - Step 1은 `완료` 상태로 유지된다.
  - Step 2 CTA `직원 등록하러 가기`가 다시 보인다.
  - Step 3는 disabled preview이며 current로 앞당겨지지 않는다.
- `Scope Boundary`:
  - route guard 확인: refresh 후에도 `/onboarding` 유지
  - screen-level 확인: step status 복원
  - in-screen action 확인: reload 이후 current CTA 보존
- `Related Baseline`: `E2E-ONB-002`, `E2E-ONB-REG-002`

#### P3-UI-INT-003 Step 2 딥링크와 온보딩 복귀 CTA

- `Target Route`: `/onboarding` -> `/schedule/step3?source=onboarding&step=employee_seed&entry=excel`
- `Exact UI Surface`:
  - `/onboarding` Step 2 action area
  - `/schedule/step3`의 `data-test='onboarding-banner'`
  - `data-test='excel-upload-entry'`
  - `data-test='onboarding-footer-return'`
- `Actor`: `admin_active` + incomplete onboarding (`currentStepKey='employee_seed'`)
- `User Action`:
  1. `/onboarding` Step 2에서 `엑셀 업로드로 시작`을 클릭한다.
  2. `/schedule/step3`의 onboarding banner와 excel entry surface를 확인한다.
  3. 하단 `온보딩으로 돌아가기`를 클릭한다.
- `Expected Result`:
  - 클릭 직후 route는 `/schedule/step3?source=onboarding&step=employee_seed&entry=excel...`로 이동한다.
  - Step3 화면 상단에 onboarding banner가 보인다.
  - excel upload 안내 surface가 보인다.
  - 하단 복귀 CTA 클릭 후 `/onboarding`으로 돌아간다.
  - 복귀 후 Step 2 문맥이 유지된다.
- `Scope Boundary`:
  - route guard 확인: compatibility deep-link 허용
  - screen-level 확인: Step3 banner/excel entry/return CTA
  - in-screen action 확인: onboarding -> employee deep-link -> onboarding 복귀
- `Related Baseline`: `E2E-ONB-REG-003`

#### P3-UI-INT-004 완료된 admin의 `/onboarding` 재진입 차단

- `Target Route`: `/onboarding`
- `Exact UI Surface`: onboarding shell 부재, post-auth landing surface
- `Actor`: `admin_active` + completed onboarding
- `User Action`:
  1. 완료 상태 admin으로 로그인한다.
  2. 브라우저 주소창에 `/onboarding`을 직접 입력한다.
- `Expected Result`:
  - `/onboarding` 직접 진입은 허용되지 않는다.
  - onboarding 헤더, step CTA, completion card는 보이지 않는다.
  - 사용자는 normal post-auth route 또는 `/dashboard/admin` 계열 landing에 남는다.
- `Scope Boundary`:
  - route guard 확인: completed admin deny
  - screen-level 확인: onboarding shell absence
  - in-screen tab/content 검증은 없음
- `Related Baseline`: `E2E-ONB-003`, `E2E-ONB-REG-004`

#### P3-UI-INT-005 승인 대기 admin 우선 차단

- `Target Route`: `/login` -> `/access/pending`, 그리고 `/onboarding`
- `Exact UI Surface`: pending access state 화면만 노출
- `Actor`: `admin_pending`
- `User Action`:
  1. pending admin으로 로그인한다.
  2. 로그인 직후 landing을 확인한다.
  3. 이어서 `/onboarding`을 직접 입력한다.
- `Expected Result`:
  - 로그인 직후와 직접 접근 모두 최종 route는 `/access/pending`이다.
  - onboarding shell, step CTA, completion card는 보이지 않는다.
  - pending 안내 화면만 보인다.
- `Scope Boundary`:
  - route guard 확인: approval pending precedence
  - screen-level 확인: pending 화면만 보임
  - in-screen onboarding 검증은 없음
- `Related Baseline`: `E2E-ONB-004`, `E2E-ONB-REG-005`

#### P3-UI-INT-006 일반 사용자 `/onboarding` 차단

- `Target Route`: `/onboarding`
- `Exact UI Surface`: onboarding shell 부재
- `Actor`: `user_active`
- `User Action`:
  1. 일반 사용자로 로그인한다.
  2. `/onboarding`을 직접 입력한다.
  3. 필요하면 onboarding query가 붙은 deep-link도 동일하게 시도한다.
- `Expected Result`:
  - `/onboarding`은 허용되지 않는다.
  - onboarding shell, 완료 카드, onboarding 복귀 배너는 보이지 않는다.
  - 사용자는 normal post-auth route로 정리된다.
- `Scope Boundary`:
  - route guard 확인: non-admin deny
  - screen-level 확인: onboarding shell absence
  - in-screen onboarding 검증은 없음
- `Related Baseline`: `E2E-ONB-006`, `E2E-ONB-REG-006`

#### P3-UI-INT-007 완료 상태의 organization-scoped 재로그인 검증

- `Target Route`: `/login` -> post-auth landing -> `/onboarding`
- `Exact UI Surface`: 로그인 폼, post-auth landing, onboarding shell 부재
- `Actor`: `admin_active` + completed onboarding
- `User Action`:
  1. 완료 상태 admin으로 로그인한다.
  2. 로그아웃 후 다시 로그인한다.
  3. 같은 세션에서 `/onboarding` 직접 접근을 시도한다.
- `Expected Result`:
  - 로그인 직후와 재로그인 직후 모두 onboarding이 아니라 completed organization용 landing으로 간다.
  - `/onboarding` 직접 접근은 계속 거부된다.
  - completion screen이 재노출되지 않는다.
- `Scope Boundary`:
  - route guard 확인: relogin skip
  - screen-level 확인: onboarding shell absence
  - in-screen onboarding 검증은 없음
- `Related Baseline`: `E2E-ONB-003`, `E2E-ONB-REG-008`

#### 18.9.4 최소 합격 기준

다음 7개 시나리오 중 아래 기준을 만족하면 P3 UI 통합 검증을 통과로 판단한다.

1. `P3-UI-INT-001`은 반드시 pass여야 한다.
2. `P3-UI-INT-002`, `003`, `004`, `005`, `006`은 route와 exact UI surface가 모두 기대값과 일치해야 한다.
3. `P3-UI-INT-007`은 relogin 후 onboarding 재진입 차단만 확인해도 합격으로 본다.
4. 어느 시나리오에서도 다음 현상이 나오면 fail이다.
   - `user_active` 또는 `admin_pending`가 onboarding shell을 본다.
   - completed admin이 `/onboarding` completion card를 다시 본다.
   - Step 2 deep-link에서 onboarding banner 또는 복귀 CTA가 누락된다.
   - refresh 후 completed/current step 상태가 역전된다.

#### 18.9.5 Playwright 전환 우선순위

1. 1차 자동화:
   - `P3-UI-INT-002`
   - `P3-UI-INT-003`
   - `P3-UI-INT-004`
   - `P3-UI-INT-005`
2. 2차 자동화:
   - `P3-UI-INT-001`
   - `P3-UI-INT-006`
3. fixture 준비 후 확장:
   - `P3-UI-INT-007`

현재 저장소 기준의 직접 대응 자산:

- `tests/e2e/onboarding-regression.spec.ts`
- `tests/unit/router-auth-guards.spec.ts`
- `tests/unit/onboarding-reentry.spec.ts`
- `tests/unit/onboarding-context.spec.ts`
- `tests/unit/onboarding-view.spec.ts`

## 19) P5-1.4 조직 관리 테스트 시나리오 (권한/테넌트 격리/필드 검증)

본 섹션은 Task `10000000-0000-4000-8000-000000000090`의 산출물이다.
대상 범위는 `/admin/organization` 페이지와 해당 페이지가 사용하는 `organizations`,
`organization_settings` 읽기/저장 경계다.

### 19.1 범위와 canonical 기준

- canonical route: `/admin/organization`
- route guard: `allowedAccessStates: ['super_active', 'admin_active']`
- canonical client API:
  - `loadOrganizationsForManagement(scope)`
  - `loadOrganizationForManagement(scope, targetOrganizationId?)`
  - `saveOrganizationForManagement(scope, orgData, targetOrganizationId?)`
  - `loadSettingsForManagement(scope, targetOrganizationId?)`
  - `saveSettingsForManagement(scope, settings, targetOrganizationId?)`
- canonical scope resolver:
  - `resolveOrganizationManagementOrganizationId(scope, targetOrganizationId?)`
- canonical field contract:
  - organization type 저장 허용값은 `hospital | fire | police`
  - `organization_settings`는 `maxConsecutiveNightShifts`,
    `minimumRestHours`, `workConstraints`만 저장 대상으로 본다.

주의:

- backlog 구현 가이드의 "403 확인" 문구는 현재 앱 계약에 맞게 아래 3종 판정으로 구체화한다.
  - 라우트 레벨: `redirect`
  - 클라이언트 scope 레벨: local error throw
  - 서버/RLS 레벨: `DENY`, `EMPTY_SET`, `ERROR(permission denied)`
- 본 문서 2장 스냅샷 기준 `organization_settings`는 아직 RLS 미적용 상태로 측정되었다.
  본 섹션의 기대 결과는 **현재 현상값이 아니라 P5 목표 계약 기준의 pass condition**이다.

### 19.2 공통 fixture 전제

1. Org A, Org B가 각각 1개 이상 존재한다.
2. 아래 actor가 준비되어 있다.
   - `super_active`
   - Org A `admin_active`
   - Org A `admin_pending`
   - Org A `admin_rejected`
   - Org A `user_active`
   - unauthenticated session
3. Org A, Org B 모두 `organizations` row가 존재한다.
4. `organization_settings`는 Org A/B 각각 row가 있거나, `null -> upsert` 흐름을 검증할 수 있도록 최소 한 조직에서 비어 있어야 한다.
5. super actor는 조직 selector에서 Org A/B를 모두 선택할 수 있어야 한다.

### 19.3 시나리오 인터페이스

본 섹션은 아래 필드를 고정 사용한다.

| Field                  | 설명                                                                    |
| :--------------------- | :---------------------------------------------------------------------- |
| `Scenario ID`          | 고유 식별자 (`ORG-MGMT-00N`)                                            |
| `Layer`                | `ROUTE_UI`, `CLIENT_SCOPE`, `API_RLS`, `FIELD_VALIDATION`, `REGRESSION` |
| `Actor`                | 실행 주체(access state 또는 DB actor)                                   |
| `Target`               | 검증 대상 route, component, API helper, table                           |
| `Precondition`         | 실행 전 준비 조건                                                       |
| `Steps`                | 검증 절차                                                               |
| `Expected Result`      | 허용/차단/리다이렉트/오류 메시지 기준                                   |
| `Negative Variant`     | 반대 조건 또는 오용 경로                                                |
| `Automation Candidate` | 추천 자동화 레이어 (`unit`, `component`, `router`, `playwright`, `sql`) |

### 19.4 시나리오 목록

### ORG-MGMT-001

- `Scenario ID`: `ORG-MGMT-001`
- `Layer`: `ROUTE_UI`
- `Actor`: `super_active`
- `Target`: `/admin/organization`, `OrganizationManagement.vue`
- `Precondition`:
  - super 계정으로 로그인되어 있다.
  - Org A, Org B가 모두 존재한다.
- `Steps`:
  1. `/admin/organization`로 이동한다.
  2. 상단 selector 또는 현재 조직 요약 영역을 확인한다.
  3. Org A를 선택한 뒤 조직 정보/설정 탭 데이터를 로드한다.
  4. Org B로 전환한 뒤 동일 화면을 다시 로드한다.
- `Expected Result`:
  - route 접근이 허용된다.
  - super 전용 조직 선택 UI가 보인다.
  - Org A/B 전환 시 선택 조직 기준으로 조회 컨텍스트가 바뀐다.
  - organization list 조회는 전체 조직을 반환할 수 있다.
- `Negative Variant`:
  - 대상 조직을 선택하지 않은 상태에서 상세 조회/저장을 시도하면
    `슈퍼 관리자는 대상 조직을 선택해야 합니다.` 오류가 발생하고 API 호출이 진행되지 않는다.
- `Automation Candidate`: `router`, `component`, `unit`

### ORG-MGMT-002

- `Scenario ID`: `ORG-MGMT-002`
- `Layer`: `ROUTE_UI`
- `Actor`: `admin_active` (Org A)
- `Target`: `/admin/organization`, `Sidebar.vue`, `OrganizationManagement.vue`
- `Precondition`:
  - actor의 `effectiveMembership.organizationId = <ORG_A_ID>`
  - Org B도 별도로 존재한다.
- `Steps`:
  1. Org A admin으로 로그인한다.
  2. 사이드바 메뉴를 확인한다.
  3. `/admin/organization`로 이동한다.
  4. 화면 상단에 조직 selector가 없는지 확인한다.
  5. 조직 정보/설정 데이터를 조회한다.
- `Expected Result`:
  - 사이드바에 `조직 관리` 메뉴가 노출된다.
  - route 접근이 허용된다.
  - admin에게는 조직 selector가 보이지 않는다.
  - 조회/수정 범위는 Org A 1개 조직으로 고정된다.
- `Negative Variant`:
  - route query, params, local state 변조로 Org B를 선택하려 해도 admin UI에서 조직 전환 수단이 노출되지 않는다.
- `Automation Candidate`: `router`, `component`, `playwright`

### ORG-MGMT-003

- `Scenario ID`: `ORG-MGMT-003`
- `Layer`: `ROUTE_UI`
- `Actor`: `user_active`, `admin_pending`, `admin_rejected`, `unauthenticated`
- `Target`: `/admin/organization`, router guard
- `Precondition`: 각 access state별 세션 fixture가 준비되어 있다.
- `Steps`:
  1. 각 actor로 `/admin/organization` 직접 접근을 시도한다.
  2. 최종 landing route를 확인한다.
  3. 사이드바 메뉴 노출 여부를 확인한다.
- `Expected Result`:
  - `user_active` -> `/schedule/step1`로 리다이렉트
  - `admin_pending` -> `/access/pending`으로 리다이렉트
  - `admin_rejected` -> `/access/rejected`으로 리다이렉트
  - `unauthenticated` -> `/login`으로 리다이렉트
  - 위 actor들에게 `조직 관리` 메뉴는 노출되지 않는다.
- `Negative Variant`:
  - 브라우저 뒤로가기, 새로고침, 직접 URL 입력에서도 동일한 리다이렉트 규칙이 유지되어야 한다.
- `Automation Candidate`: `router`, `playwright`

### ORG-MGMT-004

- `Scenario ID`: `ORG-MGMT-004`
- `Layer`: `CLIENT_SCOPE`
- `Actor`: `admin_active` (Org A)
- `Target`: `resolveOrganizationManagementOrganizationId()`
- `Precondition`:
  - scope는 `{ accessState: 'admin_active', organizationId: '<ORG_A_ID>' }`
  - Org B ID를 알고 있다.
- `Steps`:
  1. `loadOrganizationForManagement(scope, '<ORG_B_ID>')` 또는
     `saveOrganizationForManagement(scope, payload, '<ORG_B_ID>')`를 호출한다.
  2. 동일 조건으로 `loadSettingsForManagement`, `saveSettingsForManagement`도 호출한다.
- `Expected Result`:
  - 모두 네트워크 호출 전에 `다른 조직 데이터에는 접근할 수 없습니다.`를 throw 한다.
  - `supabase.from(...)` 호출은 발생하지 않는다.
- `Negative Variant`:
  - `<ORG_A_ID>` 또는 target 미지정 호출은 정상적으로 통과해야 한다.
- `Automation Candidate`: `unit`

### ORG-MGMT-005

- `Scenario ID`: `ORG-MGMT-005`
- `Layer`: `FIELD_VALIDATION`
- `Actor`: `super_active`, `admin_active`
- `Target`: `saveOrganizationForManagement()`
- `Precondition`:
  - target organization이 유효하게 선택되어 있다.
- `Steps`:
  1. organization name만 수정하는 patch를 저장한다.
  2. `type='hospital'`, `type='fire'`, `type='police'`로 각각 저장한다.
  3. `type='logistics'` 또는 `type='production'` 저장을 시도한다.
- `Expected Result`:
  - name patch는 정상 저장된다.
  - DB-safe type 3종은 정상 저장된다.
  - `logistics`, `production` 저장 시
    `조직 유형은 병원, 소방, 경찰만 저장할 수 있습니다.` 오류가 발생한다.
- `Negative Variant`:
  - type을 생략한 patch는 허용되지만, 지원하지 않는 type 문자열은 저장되면 안 된다.
- `Automation Candidate`: `unit`, `integration`

### ORG-MGMT-006

- `Scenario ID`: `ORG-MGMT-006`
- `Layer`: `FIELD_VALIDATION`
- `Actor`: `super_active`, `admin_active`
- `Target`: `saveSettingsForManagement()`, `organization_settings`
- `Precondition`:
  - target organization이 유효하게 resolve된다.
  - Org A 또는 Org B에 settings row가 없을 수도 있다.
- `Steps`:
  1. `maxConsecutiveNightShifts`만 포함한 partial payload를 저장한다.
  2. `minimumRestHours`만 포함한 partial payload를 저장한다.
  3. `workConstraints`만 포함한 partial payload를 저장한다.
  4. settings row가 없는 조직에 대해 저장을 호출한다.
- `Expected Result`:
  - partial payload 저장이 허용된다.
  - 저장 후 반환값은 `organizationId`와 저장 필드가 target organization 기준으로 매핑된다.
  - row가 없던 조직은 `upsert(..., { onConflict: 'organization_id' })` 계약으로 생성/갱신된다.
  - 허용되지 않은 조직으로 저장 대상이 바뀌지 않는다.
- `Negative Variant`:
  - admin이 Org B를 target으로 넘긴 경우에는 `ORG-MGMT-004`와 동일하게 client scope에서 먼저 차단된다.
- `Automation Candidate`: `unit`, `integration`

### ORG-MGMT-007

- `Scenario ID`: `ORG-MGMT-007`
- `Layer`: `API_RLS`
- `Actor`: DB actor `admin_active` (Org A)
- `Target`: `organizations`, `organization_settings`
- `Precondition`:
  - P5 목표 RLS 정책이 적용되어 있다.
  - Org B row가 존재한다.
- `Steps`:
  1. admin actor로 Org B `organizations` row를 직접 조회한다.
  2. admin actor로 Org B `organizations` row를 직접 수정한다.
  3. admin actor로 Org B `organization_settings` row를 직접 조회/업서트한다.
- `Expected Result`:
  - 타 조직 조회는 `EMPTY_SET`
  - 타 조직 수정/업서트는 `DENY` 또는 `ERROR(permission denied)`
  - UI helper를 우회한 직접 API/SQL 호출에서도 테넌트 침범이 허용되지 않는다.
- `Negative Variant`:
  - 동일 actor가 Org A row를 조회/수정할 때는 허용되어야 한다.
- `Automation Candidate`: `sql`

예시 검증 SQL:

```sql
begin;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '<ORG_A_ADMIN_USER_ID>', true);
set local role authenticated;

select id, name
from public.organizations
where id = '<ORG_B_ID>';

update public.organizations
set name = 'forged-update'
where id = '<ORG_B_ID>';

insert into public.organization_settings (
  organization_id,
  minimum_rest_hours,
  work_constraints
)
values (
  '<ORG_B_ID>',
  '{"D":24,"E":24,"N":36}'::jsonb,
  '{"weeklyTargetHours":40,"weeklyMaxHours":52,"weeklyOffDays":2}'::jsonb
)
on conflict (organization_id) do update
set work_constraints = excluded.work_constraints;

rollback;
```

### ORG-MGMT-008

- `Scenario ID`: `ORG-MGMT-008`
- `Layer`: `API_RLS`
- `Actor`: DB actor `user_active` (Org A)
- `Target`: `organizations`, `organization_settings`
- `Precondition`:
  - `user_active`는 조직 관리 화면에 접근할 수 없어야 한다.
  - target rows는 Org A/B 모두 존재한다.
- `Steps`:
  1. user actor로 Org A `organizations` / `organization_settings`를 직접 조회한다.
  2. 동일 actor로 Org A/B row에 대해 update/upsert를 시도한다.
- `Expected Result`:
  - user actor는 route 접근이 차단될 뿐 아니라 direct data access도 허용되면 안 된다.
  - 조회는 `EMPTY_SET`, 쓰기는 `DENY` 또는 `ERROR(permission denied)`가 되어야 한다.
- `Negative Variant`:
  - user가 query param 또는 body에 org id를 넣어도 권한 상승이 일어나지 않는다.
- `Automation Candidate`: `sql`

### ORG-MGMT-009

- `Scenario ID`: `ORG-MGMT-009`
- `Layer`: `REGRESSION`
- `Actor`: `super_active`, `admin_active`
- `Target`: `OrganizationManagement.vue`, `organization_settings`, legacy staffing tables
- `Precondition`:
  - organization management 화면에서 조직 정보/설정 저장을 실행할 수 있다.
  - legacy `site_requirements` row와 service-native `site_staffing_requirements` row가 모두 준비되어 있다.
- `Steps`:
  1. 조직 정보 또는 조직 설정만 수정 저장한다.
  2. 저장 전후 `site_requirements`, `site_staffing_requirements` 변경 여부를 비교한다.
- `Expected Result`:
  - 조직 관리 저장은 `organizations`, `organization_settings` 범위에만 영향을 준다.
  - `site_requirements`는 건드리지 않는다.
  - P5-1 범위에서는 staffing table dual-write가 발생하지 않는다.
- `Negative Variant`:
  - 설정 저장이 legacy scheduling wizard 데이터에 부수 효과를 만들면 실패다.
- `Automation Candidate`: `integration`, `sql`

### 19.5 권한 × 동작 매트릭스

| 검증 항목                       | `super_active` | `admin_active`    | `user_active`              | `admin_pending`            | `admin_rejected`            | `unauthenticated` |
| :------------------------------ | :------------- | :---------------- | :------------------------- | :------------------------- | :-------------------------- | :---------------- |
| 사이드바 `조직 관리` 메뉴 노출  | Yes            | Yes               | No                         | No                         | No                          | No                |
| `/admin/organization` 직접 접근 | Allow          | Allow             | Redirect `/schedule/step1` | Redirect `/access/pending` | Redirect `/access/rejected` | Redirect `/login` |
| 조직 선택 selector 표시         | Yes            | No                | No                         | No                         | No                          | No                |
| organization list 조회          | 전체           | 자기 조직 1건     | Blocked                    | Blocked                    | Blocked                     | Blocked           |
| organization info/settings 수정 | 선택 조직      | 자기 조직만       | Blocked                    | Blocked                    | Blocked                     | Blocked           |
| 다른 조직 target 전달           | Allow          | Client-scope deny | Not reachable              | Not reachable              | Not reachable               | Not reachable     |
| UI 우회 direct DB access        | RLS allow      | 자기 조직만 allow | RLS deny                   | RLS deny                   | RLS deny                    | ACL/RLS deny      |

### 19.6 리뷰 체크리스트

1. super/admin/user/pending/rejected/unauthenticated의 direct route 결과가 모두 명시되어 있는가
2. super 전용 조직 selector와 admin 고정 스코프 차이가 문서에 반영되어 있는가
3. admin의 cross-tenant 시도가 client scope helper에서 먼저 차단되는가
4. client helper를 우회한 direct API/SQL 시도도 RLS 기준으로 차단되는가
5. organization type 저장 허용값이 `hospital|fire|police`로 제한된다는 검증이 포함되는가
6. `organization_settings` partial upsert와 null row 생성 흐름이 포함되는가
7. 조직 관리 저장이 `site_requirements`를 건드리지 않는다는 회귀 검증이 포함되는가
8. "403" 요구사항이 현재 앱의 실제 판정값(`redirect`, local error, RLS deny)으로 치환되어 있는가

### 19.7 권장 자동화 매핑

1. unit
   - `resolveOrganizationManagementOrganizationId()`
   - `assertPersistedOrganizationType()`
   - `saveOrganizationForManagement()` / `saveSettingsForManagement()`의 client-scope 차단
2. router/component
   - `Sidebar.vue` 메뉴 노출
   - `/admin/organization` 접근 제어
   - super selector 표시 여부
3. playwright
   - `ORG-MGMT-001`, `ORG-MGMT-002`, `ORG-MGMT-003`
4. sql 또는 Supabase integration
   - `ORG-MGMT-007`, `ORG-MGMT-008`, `ORG-MGMT-009`

## 20) P9-1.4 대시보드 지표 테스트 시나리오 (샘플 데이터 기반)

본 섹션은 Task `10000000-0000-4000-8000-000000000138`의 산출물이다.  
대상 범위는 `/dashboard/admin`, `/dashboard/employee`의 지표 검증, 필터 반응, 역할별 라우팅, 테넌트 격리, dependency state 판정이다.

### 20.1 범위와 canonical 기준

- canonical routes
  - 관리자 지표 화면: `/dashboard/admin`
  - 직원 지표 화면: `/dashboard/employee`
- canonical UI surface
  - `/dashboard/admin`: 상단 filter bar(`periodMonth`, `siteId`, `rankId`, `grouping`), 공정성 summary card 영역, 직원/사이트 비교 table 또는 chart 영역
  - `/dashboard/employee`: 상단 filter bar(`periodMonth`, `siteId`, `rankId`), 개인 summary card 영역, 개인 월간 calendar 영역
- canonical API/read boundary
  - `getAdminDashboardStats() -> supabase.rpc('get_admin_dashboard_stats', ...)`
  - `getEmployeeDashboardStats() -> supabase.rpc('get_employee_dashboard_stats', ...)`
- canonical metric semantics
  - `N`은 야간 근무에 포함된다.
  - 토/일의 `D`, `E`, `N`만 주말 근무에 포함된다.
  - `O`는 근무 횟수 집계에서 제외된다.
  - `complete`, `changed` 상태의 persisted schedule만 집계에 포함된다.
- canonical reference
  - `docs/specs/p9/P9-1.1-dashboard-metrics-filter-spec.md`
  - `docs/API_SPEC.md`의 Dashboard Analytics Contract
  - `src/types/dashboard.ts`
- 현재 구현 메모 (`2026-03-24` 기준)
  - `src/constants/routes.ts`의 `resolvePostAuthRedirectPath()`는 아직 active user를 `/schedule/step1`로 보낸다.
  - 따라서 아래 라우팅 시나리오 중 post-auth landing 분기 항목은 P9 canonical acceptance로 유지하며, 실제 구현이 뒤따르기 전까지는 red scenario일 수 있다.

### 20.2 샘플 fixture 전제

#### 20.2.1 조직 / 사용자 fixture

| Fixture Key        | 조직     | 역할 / 용도                                                             |
| :----------------- | :------- | :---------------------------------------------------------------------- |
| `ORG-A`            | 서울병원 | admin 대시보드 기본 검증 조직                                           |
| `ORG-B`            | 남부병원 | 타 조직 데이터 혼입 방지 검증 조직                                      |
| `admin-a`          | `ORG-A`  | `/dashboard/admin` 검증 actor (`admin_active`)                          |
| `user-kim`         | `ORG-A`  | `/dashboard/employee` 검증 actor (`user_active`, employee mapping 존재) |
| `user-no-employee` | `ORG-A`  | employee mapping 누락 dependency 검증 actor (`user_active`)             |
| `super-1`          | global   | 조직 선택 강제 및 super scope 검증 actor (`super_active`)               |

#### 20.2.2 샘플 스케줄 fixture

Weekend dates used in this section:

- `2026-03`: `01`, `07`, `08`, `14`, `15`, `21`, `22`, `28`, `29`
- `2026-02`: `01`, `07`, `08`, `14`, `15`, `21`, `22`, `28`

| Org     | Month     | Schedule Status | Employee            | Site | Rank   | Metric-driving persisted assignments                             | Derived Metric         |
| :------ | :-------- | :-------------- | :------------------ | :--- | :----- | :--------------------------------------------------------------- | :--------------------- |
| `ORG-A` | `2026-03` | `complete`      | 김하늘 (`user-kim`) | ICU  | Senior | `03-01 N`, `03-07 D`, `03-12 N`, `03-22 E`, `03-28 N`, `03-29 N` | night=`4`, weekend=`5` |
| `ORG-A` | `2026-03` | `complete`      | 이서준              | ICU  | Junior | `03-03 N`, `03-14 D`, `03-21 E`, `03-27 N`, `03-29 D`            | night=`2`, weekend=`3` |
| `ORG-A` | `2026-03` | `complete`      | 박민지              | Ward | Senior | `03-07 D`, `03-20 N`, `03-21 O`                                  | night=`1`, weekend=`1` |
| `ORG-A` | `2026-02` | `changed`       | 김하늘 (`user-kim`) | ICU  | Senior | `02-01 N`, `02-07 D`, `02-12 N`                                  | night=`2`, weekend=`2` |
| `ORG-A` | `2026-02` | `changed`       | 이서준              | ICU  | Junior | `02-14 N`, `02-21 D`                                             | night=`1`, weekend=`2` |
| `ORG-A` | `2026-02` | `changed`       | 박민지              | Ward | Senior | `02-08 D`                                                        | night=`0`, weekend=`1` |
| `ORG-B` | `2026-03` | `complete`      | 최도윤              | ER   | Senior | `03-01 N`, `03-08 N`, `03-14 D`, `03-21 N`, `03-28 D`, `03-29 E` | night=`3`, weekend=`6` |

추가 전제:

1. `ORG-A`에는 `status='running'`인 `2026-03` draft schedule이 별도로 존재하고, 여기에 더 큰 night/weekend count가 들어 있어도 dashboard 집계에는 포함되면 안 된다.
2. `ORG-A`는 기본 fixture에서 usable site가 2개(`ICU`, `Ward`)이므로 `siteId` filter가 표시된다.
3. `ORG-A`는 기본 fixture에서 rank mapping이 존재하므로 `rankId` filter가 표시된다.
4. unsupported visibility 시나리오에서는 별도 변형 fixture로 usable site를 1개만 남기고 rank mapping을 제거한다.

### 20.3 샘플 데이터 기준 기대값

#### 20.3.1 `ORG-A` / `2026-03` / admin dashboard / grouping=`employee`

| Row / Summary | Night | Weekend |
| :------------ | ----: | ------: |
| 김하늘        |     4 |       5 |
| 이서준        |     2 |       3 |
| 박민지        |     1 |       1 |
| `groupCount`  |     3 |       3 |
| `avg`         |  2.33 |    3.00 |
| `min`         |     1 |       1 |
| `max`         |     4 |       5 |
| `gap`         |     3 |       4 |

#### 20.3.2 `ORG-A` / `2026-03` / admin dashboard / grouping=`site`

| Row / Summary | Night | Weekend |
| :------------ | ----: | ------: |
| ICU           |     6 |       8 |
| Ward          |     1 |       1 |
| `groupCount`  |     2 |       2 |
| `avg`         |  3.50 |    4.50 |
| `min`         |     1 |       1 |
| `max`         |     6 |       8 |
| `gap`         |     5 |       7 |

#### 20.3.3 `ORG-A` / `2026-03` / filtered expected values

| Filter Condition                           | Expected Rows          | Night Summary (`avg/min/max/gap`) | Weekend Summary (`avg/min/max/gap`) |
| :----------------------------------------- | :--------------------- | :-------------------------------- | :---------------------------------- |
| `siteId=ICU`, grouping=`employee`          | 김하늘, 이서준         | `3.00 / 2 / 4 / 2`                | `4.00 / 3 / 5 / 2`                  |
| `rankId=Senior`, grouping=`employee`       | 김하늘, 박민지         | `2.50 / 1 / 4 / 3`                | `3.00 / 1 / 5 / 4`                  |
| `periodMonth=2026-02`, grouping=`employee` | 김하늘, 이서준, 박민지 | `1.00 / 0 / 2 / 2`                | `1.67 / 1 / 2 / 1`                  |

#### 20.3.4 `ORG-A` / `2026-03` / employee dashboard (`user-kim`)

| Filter Condition    | My Night | My Weekend | Team Night Avg | Team Weekend Avg | Team Member Count |
| :------------------ | -------: | ---------: | -------------: | ---------------: | ----------------: |
| no site/rank filter |        4 |          5 |           2.33 |             3.00 |                 3 |
| `siteId=ICU`        |        4 |          5 |           3.00 |             4.00 |                 2 |
| `rankId=Senior`     |        4 |          5 |           2.50 |             3.00 |                 2 |

Calendar assertions for `user-kim`:

- `2026-03-01` cell shows `N`
- `2026-03-07` cell shows `D`
- `2026-03-22` cell shows `E`
- `2026-03-28` cell shows `N`
- `2026-03-29` cell shows `N`

### 20.4 시나리오 인터페이스

| Field                   | 설명                                                                         |
| :---------------------- | :--------------------------------------------------------------------------- |
| `Scenario ID`           | 고유 식별자 (`DSH-00N`)                                                      |
| `Layer`                 | `route_rbac`, `metric_accuracy`, `filter_behavior`, `dependency`, `api_rbac` |
| `Target Route`          | 검증 대상 route                                                              |
| `Exact UI Surface`      | summary card, filter bar, calendar, table/chart 등 정확한 위치               |
| `Actor`                 | 로그인 actor / API actor                                                     |
| `Precondition`          | fixture, 선택된 조직, employee mapping 여부                                  |
| `Action`                | 사용자가 클릭/선택/직접 입력해야 하는 동작                                   |
| `Expected Result`       | route, visible UI, redirect, state                                           |
| `Sample-data Assertion` | 샘플 fixture 기준 기대 숫자 또는 row 집합                                    |
| `Automation Candidate`  | `unit`, `store`, `playwright`, `integration`                                 |

### 20.5 시나리오 목록

### DSH-001

- `Scenario ID`: `DSH-001`
- `Layer`: `metric_accuracy`
- `Target Route`: `/dashboard/admin`
- `Exact UI Surface`: 상단 filter bar 아래 `공정성 summary card` 영역, 그 아래 `직원별 비교 table/chart` 영역
- `Actor`: `admin-a` (`admin_active`, `ORG-A`)
- `Precondition`:
  - `ORG-A` `2026-03` complete fixture와 `2026-03` running draft fixture가 동시에 존재한다.
  - 진입 시 `periodMonth='2026-03'`, `grouping='employee'`, `siteId=null`, `rankId=null`이다.
- `Action`:
  1. `/login`에서 `admin-a`로 로그인한다.
  2. `/dashboard/admin`으로 이동한다.
  3. filter bar에서 `기준 월=2026-03`, `그룹 기준=직원별` 상태를 확인한다.
  4. summary card와 직원별 비교 영역의 값을 확인한다.
- `Expected Result`:
  - 최종 route는 `/dashboard/admin`이다.
  - admin dashboard shell과 filter bar가 렌더링된다.
  - running draft schedule은 지표 계산에 반영되지 않는다.
- `Sample-data Assertion`:
  - 직원별 row는 김하늘=`4/5`, 이서준=`2/3`, 박민지=`1/1`(night/weekend)만 보여야 한다.
  - summary는 night=`avg 2.33, min 1, max 4, gap 3`, weekend=`avg 3.00, min 1, max 5, gap 4`여야 한다.
  - `ORG-B` 직원/사이트 이름은 어떤 admin row에도 나타나면 안 된다.
- `Automation Candidate`: `playwright`, `integration`

### DSH-002

- `Scenario ID`: `DSH-002`
- `Layer`: `filter_behavior`
- `Target Route`: `/dashboard/admin`
- `Exact UI Surface`: 상단 `filter bar`, `공정성 summary card`, `직원/사이트 비교 table/chart`
- `Actor`: `admin-a` (`admin_active`, `ORG-A`)
- `Precondition`:
  - `ORG-A` fixture가 기본 상태(usable site 2개, rank mapping 존재)로 준비되어 있다.
- `Action`:
  1. `/dashboard/admin`에서 baseline으로 `2026-03`, `grouping='employee'` 값을 확인한다.
  2. 같은 화면의 filter bar에서 `siteId=ICU`를 선택한다.
  3. `siteId`를 해제한 뒤 `rankId=Senior`를 선택한다.
  4. `rankId`를 해제하고 `grouping='site'`로 바꾼다.
  5. `periodMonth=2026-02`로 바꾼다.
- `Expected Result`:
  - 모든 동작은 `/dashboard/admin` 내부에서만 일어나며 다른 route로 튀지 않는다.
  - filter 변경 시 summary와 비교 영역이 즉시 재조회 또는 재렌더링된다.
  - hidden/unsupported filter가 아닌 실제 visible filter만 동작한다.
- `Sample-data Assertion`:
  - `siteId=ICU` 후 employee row는 김하늘, 이서준만 남고 night summary=`3.00 / 2 / 4 / 2`, weekend summary=`4.00 / 3 / 5 / 2`가 된다.
  - `rankId=Senior` 후 employee row는 김하늘, 박민지만 남고 night summary=`2.50 / 1 / 4 / 3`, weekend summary=`3.00 / 1 / 5 / 4`가 된다.
  - `grouping='site'` 후 row는 ICU=`6/8`, Ward=`1/1`이어야 한다.
  - `periodMonth=2026-02` 후 employee row는 김하늘=`2/2`, 이서준=`1/2`, 박민지=`0/1`로 바뀌고 March 수치가 남아 있으면 실패다.
- `Automation Candidate`: `playwright`, `store`

### DSH-003

- `Scenario ID`: `DSH-003`
- `Layer`: `api_rbac`
- `Target Route`: `/dashboard/admin`
- `Exact UI Surface`: 관리자 대시보드의 `summary card` 영역과 `비교 table/chart`; 필요 시 network/RPC assertion 병행
- `Actor`: `admin-a` (`admin_active`, `ORG-A`) 및 `super-1` (`super_active`)
- `Precondition`:
  - `ORG-A`, `ORG-B` 모두 `2026-03` persisted schedule fixture를 가진다.
  - `super-1`은 org selector를 통해 `ORG-A` 또는 `ORG-B`를 선택할 수 있다.
- `Action`:
  1. `admin-a`로 `/dashboard/admin`에 진입한다.
  2. 지표와 row에 `ORG-B` 데이터가 섞이지 않는지 확인한다.
  3. 별도 세션에서 `super-1`로 `/dashboard/admin`에 진입한다.
  4. org selector에서 `ORG-B`를 선택한 후 다시 `ORG-A`를 선택한다.
- `Expected Result`:
  - `admin-a`는 자기 조직(`ORG-A`)만 본다.
  - `super-1`은 명시적으로 선택한 조직의 값만 본다.
  - 어떤 경우에도 implicit all-org aggregate가 발생하면 안 된다.
- `Sample-data Assertion`:
  - `admin-a` 기준 row/summary는 반드시 `ORG-A` 기대값과 일치하고, 최도윤(`ORG-B`)이 admin table/chart에 나타나면 실패다.
  - `super-1 + ORG-B` 선택 시 `ORG-A`의 김하늘/이서준/박민지 row가 보이면 실패다.
  - `super-1`이 조직을 아직 선택하지 않은 상태라면 metrics load 대신 organization selection blocking state가 먼저 보여야 한다.
- `Automation Candidate`: `playwright`, `store`, `integration`

### DSH-004

- `Scenario ID`: `DSH-004`
- `Layer`: `metric_accuracy`
- `Target Route`: `/dashboard/employee`
- `Exact UI Surface`: 상단 `filter bar`, `개인 summary card` 영역, `개인 월간 calendar` 영역
- `Actor`: `user-kim` (`user_active`, employee mapping 존재, `ORG-A`)
- `Precondition`:
  - `user-kim`은 김하늘 employee row와 연결되어 있다.
  - `ORG-A` `2026-03` fixture가 준비되어 있다.
- `Action`:
  1. `/login`에서 `user-kim`으로 로그인한다.
  2. `/dashboard/employee`에 진입한다.
  3. baseline `periodMonth=2026-03` 값을 확인한다.
  4. 같은 화면에서 `siteId=ICU`를 선택한다.
  5. `siteId`를 해제하고 `rankId=Senior`를 선택한다.
  6. calendar에서 `2026-03-01`, `2026-03-07`, `2026-03-22`, `2026-03-28`, `2026-03-29` 셀을 확인한다.
- `Expected Result`:
  - 최종 route는 계속 `/dashboard/employee`다.
  - 화면에는 `나의 지표`와 `개인 월간 일정`만 보여야 하며, 다른 직원의 상세 row/table은 노출되면 안 된다.
  - filter 변경 시 개인/팀 지표와 calendar 범위가 현재 scope로 다시 계산된다.
- `Sample-data Assertion`:
  - baseline summary는 `myNightShiftCount=4`, `myWeekendWorkCount=5`, `teamNightShiftAvg=2.33`, `teamWeekendWorkAvg=3.00`, `teamMemberCount=3`이다.
  - `siteId=ICU` 후 summary는 `4 / 5 / 3.00 / 4.00 / 2`로 바뀐다.
  - `rankId=Senior` 후 summary는 `4 / 5 / 2.50 / 3.00 / 2`로 바뀐다.
  - calendar cell은 `03-01=N`, `03-07=D`, `03-22=E`, `03-28=N`, `03-29=N`을 보여야 한다.
- `Automation Candidate`: `playwright`, `integration`

### DSH-005

- `Scenario ID`: `DSH-005`
- `Layer`: `dependency`
- `Target Route`: `/dashboard/employee`
- `Exact UI Surface`: employee dashboard의 `dependency state panel` 또는 empty-placeholder 영역
- `Actor`: `user-no-employee` (`user_active`, employee mapping 없음, `ORG-A`)
- `Precondition`:
  - 인증과 membership은 유효하지만 `employees.user_id = auth.uid()`로 resolve되는 employee row가 없다.
  - `/dashboard/employee` route 자체는 접근 가능하다.
- `Action`:
  1. `/login`에서 `user-no-employee`로 로그인한다.
  2. `/dashboard/employee`로 이동한다.
  3. summary card, calendar, generic error UI 노출 여부를 확인한다.
- `Expected Result`:
  - route는 `/dashboard/employee`에 남는다.
  - permission-denied screen이 아니라 dependency state가 보인다.
  - team summary와 personal calendar는 로드되지 않는다.
  - retry 또는 안내 문구는 employee mapping 의존성을 설명해야 한다.
- `Sample-data Assertion`:
  - response/store state는 `state='dependency'`, `reason='employee_mapping_required'`여야 한다.
  - `summary=null`, `calendarAssignments=[]`여야 한다.
- `Automation Candidate`: `store`, `integration`, `playwright`

### DSH-006

- `Scenario ID`: `DSH-006`
- `Layer`: `route_rbac`
- `Target Route`: `/login`, `/dashboard/admin`, `/dashboard/employee`
- `Exact UI Surface`: 로그인 직후 landing route, 브라우저 주소창 route, admin dashboard shell 노출 여부
- `Actor`: `super-1`, `admin-a`, `user-kim`
- `Precondition`:
  - 세 actor 모두 active session을 만들 수 있다.
  - dashboard route split이 P9 canonical대로 구현되었는지 검증한다.
- `Action`:
  1. `/login`에서 `super-1`로 로그인해 최종 landing을 확인한다.
  2. `/login`에서 `admin-a`로 로그인해 최종 landing을 확인한다.
  3. `/login`에서 `user-kim`으로 로그인해 최종 landing을 확인한다.
  4. `user-kim` 세션으로 브라우저 주소창에 `/dashboard/admin`을 직접 입력한다.
  5. 같은 세션에서 admin RPC를 직접 호출하거나 admin dashboard load를 강제 시도한다.
- `Expected Result`:
  - `super-1`, `admin-a`는 `/dashboard/admin`으로 landing한다.
  - `user-kim`은 `/dashboard/employee`로 landing한다.
  - `user-kim`의 `/dashboard/admin` 직접 접근은 route guard에서 차단된다.
  - route guard 차단과 API/RPC 차단은 별도로 검증한다.
- `Sample-data Assertion`:
  - route layer expected result: `user-kim`의 브라우저 최종 route는 `/dashboard/employee`여야 하며 admin dashboard summary/table이 렌더링되면 실패다.
  - API layer expected result: user session의 `get_admin_dashboard_stats`는 `DASHBOARD_ACCESS_DENIED` 또는 HTTP 403 equivalent로 실패해야 한다.
- `Automation Candidate`: `router`, `playwright`, `integration`

### DSH-007

- `Scenario ID`: `DSH-007`
- `Layer`: `filter_behavior`
- `Target Route`: `/dashboard/admin`, `/dashboard/employee`
- `Exact UI Surface`: 두 dashboard 화면의 `filter bar`
- `Actor`: `admin-a`, `user-kim`
- `Precondition`:
  - `ORG-A` 변형 fixture에서 usable site는 1개만 남는다.
  - rank master 또는 employee-rank mapping이 제거되어 rank scope가 unsupported 상태다.
- `Action`:
  1. `admin-a`로 `/dashboard/admin`에 진입한다.
  2. filter bar에 `siteId`, `rankId` control이 렌더링되는지 확인한다.
  3. `user-kim`으로 `/dashboard/employee`에 진입한다.
  4. 동일하게 filter bar의 visible control을 확인한다.
  5. network/RPC payload에서 optional filter 인자가 어떻게 전달되는지 확인한다.
- `Expected Result`:
  - usable site가 1개뿐이면 `siteId` control은 disabled가 아니라 hidden이어야 한다.
  - rank mapping이 unsupported면 `rankId` control은 hidden이어야 한다.
  - hidden filter 때문에 query가 실패하면 안 된다.
- `Sample-data Assertion`:
  - admin/employee 둘 다 `siteId`, `rankId` UI control이 사라진다.
  - RPC payload는 hidden filter를 sentinel string 없이 `null` 또는 omitted optional argument로 보낸다.
  - summary와 calendar/row 값은 기본 organization scope 기준으로 정상 로드된다.
- `Automation Candidate`: `store`, `playwright`, `integration`

### 20.6 역할 × 라우트 / API 판정표

| 검증 항목                       | `super_active`                    | `admin_active`                    | `user_active`                     |
| :------------------------------ | :-------------------------------- | :-------------------------------- | :-------------------------------- |
| 로그인 직후 landing             | `/dashboard/admin`                | `/dashboard/admin`                | `/dashboard/employee`             |
| `/dashboard/admin` 직접 접근    | Allow                             | Allow                             | Route-level deny                  |
| `/dashboard/employee` 직접 접근 | Allow (employee perspective)      | Allow (employee perspective)      | Allow                             |
| admin dashboard RPC 호출        | Allow, 단 `organizationId` 필수   | Allow, 단 자기 조직만             | Deny                              |
| employee dashboard RPC 호출     | Allow, 단 본인 employee mapping만 | Allow, 단 본인 employee mapping만 | Allow, 단 본인 employee mapping만 |
| employee mapping 없음           | dependency state                  | dependency state                  | dependency state                  |

주의:

1. UI route guard 결과와 API/RPC 결과는 같은 의미라도 별도 계층으로 본다.
2. "403" 요구사항은 현재 앱 패턴상 `redirect + API access deny` 조합으로 판정할 수 있다.

### 20.7 리뷰 체크리스트

1. 샘플 fixture가 최소 2개 조직(`ORG-A`, `ORG-B`), 2개 route(`/dashboard/admin`, `/dashboard/employee`), 2개 월(`2026-02`, `2026-03`)을 모두 포함하는가
2. admin dashboard 시나리오가 `employee` grouping, `site` grouping, `periodMonth`, `siteId`, `rankId` 변화를 실제 숫자로 검증하는가
3. employee dashboard 시나리오가 personal summary와 monthly calendar를 정확한 날짜/shift code로 검증하는가
4. `running` draft schedule exclusion과 `ORG-B` tenant leakage 방지가 별도 assertion으로 문서화되어 있는가
5. post-auth landing 분기와 `/dashboard/admin` direct access deny가 route layer와 API layer로 분리되어 있는가
6. employee mapping 누락 시 `dependency` state를 permission error와 구분해서 검증하는가
7. single-site / missing-rank unsupported 상태에서 filter가 hidden이어야 한다는 규칙이 포함되어 있는가
8. 각 시나리오가 Target Route, Exact UI Surface, Action, Expected Result를 모두 명시하는가

### 20.8 권장 자동화 매핑

1. router / unit
   - post-auth landing 분기
   - `/dashboard/admin` direct access deny
2. store / unit
   - `dependency` state 유지
   - hidden filter capability 계산
   - super organization selection blocking
3. API / integration
   - `get_admin_dashboard_stats` / `get_employee_dashboard_stats` RBAC
   - `running` schedule exclusion
   - cross-tenant aggregate isolation
4. playwright
   - `DSH-001`, `DSH-002`, `DSH-004`, `DSH-006`, `DSH-007`
