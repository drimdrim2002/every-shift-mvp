# Membership Follow-Up Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** membership 기반 auth/RBAC/multi-org 전환 이후 남은 3개 후속 이슈를 안전한 순서로 정리해 UI 라벨, corrective backfill, direct Supabase path RLS 정합성을 완성한다.

**Architecture:** 조직 표시 이름은 RBAC hydration 시점에 membership와 함께 일괄 조회해서 주입하고, membership corrective migration은 legacy active profile을 기준으로 stale membership만 approved로 교정한다. direct path 권한은 `public.has_org_access()` 하나를 source of truth로 삼아 `organizations`, `employees`, `shifts`, `site_requirements`의 정책을 정리하고 legacy auth metadata 기반 정책을 제거한다.

**Tech Stack:** Vue 3, TypeScript, Pinia, Naive UI, Supabase Postgres, Supabase RLS, SQL migrations, Vitest, Playwright, ESLint

---

## Scope Check

- 이 문서는 3개 이슈를 한 번에 다루지만, 구현은 반드시 3개 배치로 나눈다.
- 이유: 이슈 2의 corrective migration이 먼저 들어가야 이슈 3의 stricter RLS에서 stale membership 때문에 정상 active user가 막히는 회귀를 줄일 수 있다.
- 이번 범위에는 `organizations`, `employees`, `shifts`뿐 아니라 현재 direct path가 남아 있는 `site_requirements`까지 포함한다.
- `schedule_assignments`, `organization_settings`, `off_request_policy_rules` 등 다른 drift는 이번 작업 범위에 넣지 않는다.

## Reference Docs

- `README.md`
- `docs/prd/PHASE2_PRD_KR.md`
- `docs/superpowers/plans/2026-04-18-phase2b-epic2-membership-auth-rbac-multi-org.md`

## File Map

- Modify: `src/types/rbac.ts`
  - `AuthContextMembership`에 organization display name 필드를 추가한다.
- Modify: `src/stores/rbac.ts`
  - membership hydration 시 organization name을 일괄 조회해서 주입한다.
- Modify: `src/utils/rbacAccess.ts`
  - `buildOrganizationOptions()`가 ID 대신 organization name을 기본 라벨로 사용하도록 바꾼다.
- Modify: `src/components/layout/OrganizationSwitcher.vue`
  - 표시 라벨은 `option.name`, value는 `option.id`를 계속 사용한다.
- Modify: `tests/unit/rbac-access-hydration.spec.ts`
  - hydration 이후 조직 옵션에 실제 조직명이 채워지는지 검증한다.
- Modify: `tests/unit/organization-switcher.spec.ts`
  - switcher가 조직명을 표시하는지 검증한다.
- Modify: `tests/e2e/multi-org-rbac.spec.ts`
  - multi-org switcher가 실제 조직명으로 동작하는지 검증한다.
- Create: `migrations/20260419120000_phase2b_membership_backfill_corrective.sql`
  - legacy active profile 기준 stale membership를 approved로 교정하는 forward-only migration.
- Create: `migrations/20260419123000_phase2b_direct_path_rls_alignment.sql`
  - direct Supabase path 대상 테이블의 canonical membership-based RLS migration.
- Modify: `tests/unit/phase2-ops-migrations.spec.ts`
  - 두 신규 migration contract를 고정한다.
- Modify: `src/stores/organization.ts`
  - direct path read가 selected/effective org scope만 사용한다는 점을 테스트와 함께 다시 고정한다.
- Modify: `src/composables/useSiteRequirements.ts`
  - direct `site_requirements` read/write 경로가 selected org 기반으로 계속 동작하는지 확인한다.
- Modify: `tests/unit/organization-store.spec.ts`
  - selected/effective org scope를 source of truth로 유지하는 회귀를 방지한다.
- Modify: `tests/unit/step2-site-info.spec.ts`
  - `site_requirements` direct path가 RLS 활성화 이후에도 기존 UX를 깨지 않는지 검증한다.

## Execution Order

1. 조직 switcher 라벨 수정
2. corrective membership backfill migration 추가
3. direct path RLS alignment migration 추가
4. 전체 lint/unit/e2e 및 DB policy/advisor 검증

## Pre-Implementation Checklist

- [ ] 현재 `pg_policies` baseline을 저장한다.
- [ ] Supabase security advisor baseline을 저장한다.
- [ ] 현재 direct path inventory를 다시 확인한다.
  - `src/stores/organization.ts`
  - `src/composables/useSiteRequirements.ts`
  - `src/composables/useScheduleGrid.ts`
  - `src/views/schedule/Step3EmployeeInfo.vue`
  - `src/api/schedule.ts`
- [ ] 현재 연결된 DB에서 stale membership 영향 집계 쿼리를 한 번 실행해 baseline을 기록한다.

### Task 1: Fix Organization Switcher Labels At RBAC Hydration Time

**Files:**

- Modify: `src/types/rbac.ts`
- Modify: `src/stores/rbac.ts`
- Modify: `src/utils/rbacAccess.ts`
- Modify: `src/components/layout/OrganizationSwitcher.vue`
- Modify: `tests/unit/rbac-access-hydration.spec.ts`
- Modify: `tests/unit/organization-switcher.spec.ts`
- Modify: `tests/e2e/multi-org-rbac.spec.ts`
- Modify: `tests/e2e/helpers.ts`

- [ ] **Step 1: Write the failing hydration and switcher tests**

```ts
expect(store.organizationOptions).toEqual([
  expect.objectContaining({ id: 'org-1', name: '서버 병원' }),
  expect.objectContaining({ id: 'org-2', name: '동부 병원' }),
]);

expect(wrapper.text()).toContain('서버 병원');
expect(wrapper.text()).not.toContain('org-1');
```

- [ ] **Step 2: Run the targeted tests to confirm the current failure**

Run:

```bash
pnpm test:unit -- tests/unit/rbac-access-hydration.spec.ts tests/unit/organization-switcher.spec.ts
```

Expected:

```text
FAIL because organizationOptions.name is currently populated from membership.organizationId
```

- [ ] **Step 3: Add organization name hydration in the RBAC store**

Implementation contract:

```ts
interface OrganizationRow {
  id: string;
  name: string | null;
}

const organizationIds = [
  ...new Set(membershipsFromDatabase.map((membership) => membership.organizationId)),
];

const { data: organizations } = await supabase
  .from('organizations')
  .select('id, name')
  .in('id', organizationIds);

const organizationNameById = new Map(
  (organizations ?? []).map((organization) => [organization.id, organization.name?.trim() || null])
);
```

- [ ] **Step 4: Update option construction and fallback policy**

Implementation contract:

```ts
return [...membershipsByOrganizationId.values()]
  .sort(compareMembershipPriority)
  .map((membership) => ({
    id: membership.organizationId,
    name: membership.organizationName?.trim() || '알 수 없는 조직',
    membershipRole: membership.role,
  }));
```

Rules:

- 별도 component-level fetch는 추가하지 않는다.
- `OrganizationSwitcher.vue`는 `option.name`만 표시하고 `option.id`는 value로만 유지한다.
- fallback 라벨은 `'알 수 없는 조직'`으로 고정하고 raw ID는 기본 라벨로 쓰지 않는다.

- [ ] **Step 5: Re-run tests and lint**

Run:

```bash
pnpm test:unit -- tests/unit/rbac-access-hydration.spec.ts tests/unit/organization-switcher.spec.ts
pnpm test:e2e -- tests/e2e/multi-org-rbac.spec.ts
pnpm lint:check
```

Expected:

```text
PASS, and the switcher renders organization names such as "동부 병원 (관리자)"
```

- [ ] **Step 6: Commit only the switcher-label batch**

```bash
git add src/types/rbac.ts src/stores/rbac.ts src/utils/rbacAccess.ts src/components/layout/OrganizationSwitcher.vue tests/unit/rbac-access-hydration.spec.ts tests/unit/organization-switcher.spec.ts tests/e2e/multi-org-rbac.spec.ts tests/e2e/helpers.ts
git commit -m "fix: hydrate organization names for switcher"
```

### Task 2: Add A Corrective Membership Backfill Migration

**Files:**

- Create: `migrations/20260419120000_phase2b_membership_backfill_corrective.sql`
- Modify: `tests/unit/phase2-ops-migrations.spec.ts`

- [ ] **Step 1: Write the failing migration contract test**

```ts
const sql = readMigration(
  '20260419120000_phase2b_membership_backfill_corrective.sql'
).toLowerCase();

expect(sql).toContain('insert into public.organization_memberships');
expect(sql).toContain('on conflict (organization_id, user_id) do update');
expect(sql).toContain("status = 'approved'");
expect(sql).toContain('rejection_reason = null');
expect(sql).toContain(
  "where lower(coalesce(public.organization_memberships.status, 'pending')) <> 'approved'"
);
```

- [ ] **Step 2: Run the migration spec to confirm the file is missing**

Run:

```bash
pnpm test:unit -- tests/unit/phase2-ops-migrations.spec.ts
```

Expected:

```text
FAIL with file-not-found or missing corrective migration contract
```

- [ ] **Step 3: Add the corrective migration with explicit overwrite/preserve rules**

Migration contract:

```sql
insert into public.organization_memberships (
  organization_id,
  user_id,
  role,
  status,
  approved_at,
  rejection_reason,
  created_at,
  updated_at
)
select
  p.organization_id,
  p.id,
  case when lower(coalesce(p.role, 'user')) = 'admin' then 'admin' else 'user' end,
  'approved',
  coalesce(om.approved_at, p.updated_at, p.created_at, now()),
  null,
  coalesce(om.created_at, p.created_at, now()),
  now()
from public.profiles p
left join public.organization_memberships om
  on om.organization_id = p.organization_id
 and om.user_id = p.id
where p.organization_id is not null
  and lower(coalesce(p.account_status, 'pending')) = 'active'
  and lower(coalesce(p.status, 'active')) = 'active'
on conflict (organization_id, user_id) do update
set
  role = excluded.role,
  status = 'approved',
  approved_at = coalesce(public.organization_memberships.approved_at, excluded.approved_at),
  rejection_reason = null,
  updated_at = now()
where lower(coalesce(public.organization_memberships.status, 'pending')) <> 'approved';
```

Interpretation rules:

- missing row: insert approved membership
- existing `pending/rejected/withdrawn`: overwrite to approved
- existing approved: preserve current row

- [ ] **Step 4: Add the impact-check SQL to the migration comment block or rollout notes**

Use this query before and after applying the migration:

```sql
with legacy_active as (
  select id as user_id, organization_id
  from public.profiles
  where organization_id is not null
    and lower(coalesce(account_status, 'pending')) = 'active'
    and lower(coalesce(status, 'active')) = 'active'
)
select
  count(*) filter (where om.user_id is null) as missing_rows,
  count(*) filter (where om.user_id is not null and lower(coalesce(om.status, 'pending')) in ('pending', 'rejected', 'withdrawn')) as stale_non_approved_rows
from legacy_active la
left join public.organization_memberships om
  on om.organization_id = la.organization_id
 and om.user_id = la.user_id;
```

- [ ] **Step 5: Re-run the migration spec**

Run:

```bash
pnpm test:unit -- tests/unit/phase2-ops-migrations.spec.ts
pnpm lint:check
```

Expected:

```text
PASS, and the contract explicitly distinguishes overwrite vs preserve behavior
```

- [ ] **Step 6: Commit only the corrective migration batch**

```bash
git add migrations/20260419120000_phase2b_membership_backfill_corrective.sql tests/unit/phase2-ops-migrations.spec.ts
git commit -m "fix: add corrective membership backfill migration"
```

### Task 3: Align Direct Supabase Path RLS With Membership Access

**Files:**

- Create: `migrations/20260419123000_phase2b_direct_path_rls_alignment.sql`
- Modify: `tests/unit/phase2-ops-migrations.spec.ts`
- Modify: `src/stores/organization.ts`
- Modify: `src/composables/useSiteRequirements.ts`
- Modify: `tests/unit/organization-store.spec.ts`
- Modify: `tests/unit/step2-site-info.spec.ts`

- [ ] **Step 1: Extend the migration contract test to cover the new RLS migration**

```ts
const sql = readMigration('20260419123000_phase2b_direct_path_rls_alignment.sql').toLowerCase();

expect(sql).toContain('alter table if exists public.organizations enable row level security');
expect(sql).toContain('alter table if exists public.site_requirements enable row level security');
expect(sql).toContain(
  'drop policy if exists "authenticated users can read own organization" on public.organizations'
);
expect(sql).toContain(
  'drop policy if exists "authenticated users can read own employees" on public.employees'
);
expect(sql).toContain(
  'drop policy if exists "authenticated users can read own shifts" on public.shifts'
);
expect(sql).toContain('create policy organizations_select_authenticated on public.organizations');
expect(sql).toContain('create policy employees_select_authenticated on public.employees');
expect(sql).toContain('create policy shifts_select_authenticated on public.shifts');
expect(sql).toContain(
  'create policy site_requirements_select_authenticated on public.site_requirements'
);
expect(sql).toContain("has_org_access(organization_id, 'admin')");
```

- [ ] **Step 2: Run the migration spec to confirm the new contract is missing**

Run:

```bash
pnpm test:unit -- tests/unit/phase2-ops-migrations.spec.ts
```

Expected:

```text
FAIL because the direct-path RLS alignment migration does not exist yet
```

- [ ] **Step 3: Add canonical RLS for the four direct-path tables**

Migration contract:

```sql
alter table if exists public.organizations enable row level security;
alter table if exists public.employees enable row level security;
alter table if exists public.shifts enable row level security;
alter table if exists public.site_requirements enable row level security;

drop policy if exists "authenticated users can read own organization" on public.organizations;
drop policy if exists organizations_select_authenticated on public.organizations;
drop policy if exists organizations_update_admin on public.organizations;

create policy organizations_select_authenticated on public.organizations
for select to authenticated
using (has_org_access(id, 'user'));

create policy organizations_update_admin on public.organizations
for update to authenticated
using (has_org_access(id, 'admin'))
with check (has_org_access(id, 'admin'));
```

Do the same for:

- `public.employees`
- `public.shifts`
- `public.site_requirements`

Policy rules:

- read: membership `user` 이상
- write: membership `admin`만
- super: `has_org_access()`를 통해 필요한 범위만 우회

- [ ] **Step 4: Reconfirm the direct path callers still source org scope from RBAC-selected state**

Verification targets:

- `src/stores/organization.ts`
- `src/composables/useSiteRequirements.ts`
- `src/composables/useScheduleGrid.ts`
- `src/views/schedule/Step3EmployeeInfo.vue`

If any caller still implicitly trusts auth metadata, update the test first and then the implementation.

- [ ] **Step 5: Add or update the targeted frontend regression tests**

Required assertions:

```ts
expect(result).toEqual({ success: true });
expect(store.current?.id).toBe('org-selected');
expect(fromMock).toHaveBeenCalledWith('site_requirements');
```

Run:

```bash
pnpm test:unit -- tests/unit/organization-store.spec.ts tests/unit/step2-site-info.spec.ts tests/unit/phase2-ops-migrations.spec.ts
```

Expected:

```text
PASS, and the direct-path store/composable tests still use selected org scope while the migration contract removes legacy metadata policies
```

- [ ] **Step 6: Capture the post-migration DB verification queries**

Run after applying the migration to a branch DB:

```sql
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('organizations', 'employees', 'shifts', 'site_requirements')
order by tablename, policyname;
```

Expected:

- no legacy `"authenticated users can read own *"` policies
- `site_requirements` now has explicit select/admin policies

- [ ] **Step 7: Commit only the direct-path RLS batch**

```bash
git add migrations/20260419123000_phase2b_direct_path_rls_alignment.sql tests/unit/phase2-ops-migrations.spec.ts src/stores/organization.ts src/composables/useSiteRequirements.ts tests/unit/organization-store.spec.ts tests/unit/step2-site-info.spec.ts
git commit -m "fix: align direct-path rls with membership access"
```

### Task 4: Run Full Verification And Prepare Rollout Evidence

**Files:**

- Modify: `docs/superpowers/plans/2026-04-19-membership-followup-fixes.md`
  - 체크된 결과와 rollout evidence만 메모한다. 구현 코드 변경은 없다.

- [ ] **Step 1: Run the full local verification suite**

```bash
pnpm lint:check
pnpm test:unit
pnpm test:e2e
```

Expected:

```text
PASS, with no ESLint errors
```

- [ ] **Step 2: Run DB-side verification on a branch DB or safe dev DB**

Required checks:

- stale membership impact query before/after Task 2 migration
- `pg_policies` diff before/after Task 3 migration
- Supabase security advisor rerun after Task 3 migration

Success criteria:

- stale non-approved legacy rows reduce to 0
- `organizations/employees/shifts` no longer reference auth metadata in policies
- `site_requirements` no longer appears as `rls_disabled_in_public`

- [ ] **Step 3: Perform manual smoke by role**

Smoke matrix:

- `super`: approval queue 진입 가능, org 선택 후 admin 화면 read 가능
- `admin`: 선택 조직의 setup/employee/schedule flow read/write 가능
- `user`: 제한 홈만 접근 가능, admin flow 차단 유지

- [ ] **Step 4: Record the verification summary and stop if any regression remains**

Record:

- failing test names
- failed policy queries
- advisor findings that remain after Task 3

Stop rule:

- `pnpm lint:check` 실패 시 작업 미완료
- `site_requirements` read/write smoke 실패 시 rollout 금지

- [ ] **Step 5: Commit the final verification-only updates if any notes were added**

```bash
git add docs/superpowers/plans/2026-04-19-membership-followup-fixes.md
git commit -m "chore: record membership followup verification"
```

## Rollout Notes

- Task 2 migration을 Task 3 migration보다 먼저 배포한다.
- Task 3 migration은 DB branch 또는 staging에서 policy/advisor 확인 후 production에 반영한다.
- production 반영 시 확인할 가장 위험한 회귀 포인트는 다음 4개다.
  - switcher value persistence는 유지되지만 표시 라벨만 바뀌는지
  - intentional revoke처럼 보이는 stale membership가 의도치 않게 복구되지 않는지
  - `site_requirements` RLS 활성화 이후 Step 2가 막히지 않는지
  - legacy metadata 기반 policy가 하나라도 남아 canonical access model을 우회하지 않는지

## Definition Of Done

- switcher가 조직명을 표시한다.
- corrective migration이 stale membership를 approved로 교정하되 approved row는 preserve한다.
- `organizations`, `employees`, `shifts`, `site_requirements` direct path가 모두 `has_org_access()` 기반 정책만 사용한다.
- `pnpm lint:check`, `pnpm test:unit`, `pnpm test:e2e` 통과.
- Supabase security advisor에서 이번 범위의 경고가 정리된다.
