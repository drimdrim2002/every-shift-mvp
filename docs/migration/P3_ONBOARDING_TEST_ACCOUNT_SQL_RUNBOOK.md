# P3 Onboarding Test Account SQL Runbook

This runbook prepares the minimum account states needed for manual verification of `P3-3.2`.

Scope:

- create test auth users from Supabase Dashboard
- assign RBAC/account/membership state with SQL
- verify that route-guard test actors exist before manual browser checks

Out of scope:

- changing onboarding completion state for a real organization
- executing SQL through MCP
- production-safe data migration strategy

## 1. Target Test Actors

Prepare these six test users:

- `p3-super@example.com`
- `p3-admin-pending@example.com`
- `p3-admin-rejected@example.com`
- `p3-admin-active@example.com`
- `p3-user-active@example.com`
- `p3-no-membership@example.com`

Recommended password pattern:

- use one shared temporary password for all test users
- mark email as confirmed when creating the auth user

## 2. Dashboard Preparation

1. Open Supabase Dashboard.
2. Go to `Authentication > Users`.
3. Create each user with email/password.
4. Confirm the email during creation if the Dashboard UI provides that option.
5. After all users are created, open `SQL Editor`.

## 3. Resolve IDs Before State Writes

Run the query below first and keep the results visible while preparing the state SQL.

```sql
select id, email, email_confirmed_at, created_at
from auth.users
where email in (
  'p3-super@example.com',
  'p3-admin-pending@example.com',
  'p3-admin-rejected@example.com',
  'p3-admin-active@example.com',
  'p3-user-active@example.com',
  'p3-no-membership@example.com'
)
order by created_at asc;
```

Resolve the target organization:

```sql
select id, name, created_at
from public.organizations
order by created_at asc;
```

Choose one organization for the shared onboarding/access-state tests and keep:

- `<ORG_ID>`
- `<SUPER_USER_ID>`
- each test user's auth `id`

## 4. Cleanup Existing Test Rows

Run this once before inserting new state. It keeps reruns predictable.

```sql
delete from public.signup_requests
where requester_user_id in (
  select id
  from auth.users
  where email like 'p3-%@example.com'
);

delete from public.organization_memberships
where user_id in (
  select id
  from auth.users
  where email like 'p3-%@example.com'
);

delete from public.profiles
where id in (
  select id
  from auth.users
  where email like 'p3-%@example.com'
);
```

## 5. Base Profile + Membership + Signup State SQL

Replace all placeholders before running:

- `<ORG_ID>`
- `<SUPER_USER_ID>`
- `<SUPER_ID>`
- `<ADMIN_PENDING_ID>`
- `<ADMIN_REJECTED_ID>`
- `<ADMIN_ACTIVE_ID>`
- `<USER_ACTIVE_ID>`
- `<NO_MEMBERSHIP_ID>`

### 5.1 Super Active

```sql
insert into public.profiles (id, global_role, account_status)
values ('<SUPER_ID>', 'super', 'active')
on conflict (id) do update
set global_role = excluded.global_role,
    account_status = excluded.account_status,
    updated_at = now();
```

### 5.2 Admin Pending

```sql
insert into public.profiles (id, global_role, account_status)
values ('<ADMIN_PENDING_ID>', 'admin', 'active')
on conflict (id) do update
set global_role = excluded.global_role,
    account_status = excluded.account_status,
    updated_at = now();

insert into public.organization_memberships (
  organization_id,
  user_id,
  role,
  status,
  approved_by,
  approved_at,
  rejection_reason
)
values (
  '<ORG_ID>',
  '<ADMIN_PENDING_ID>',
  'admin',
  'pending',
  null,
  null,
  null
)
on conflict (organization_id, user_id) do update
set role = excluded.role,
    status = excluded.status,
    approved_by = null,
    approved_at = null,
    rejection_reason = null,
    updated_at = now();

insert into public.signup_requests (
  requester_user_id,
  organization_id,
  requested_role,
  status
)
values (
  '<ADMIN_PENDING_ID>',
  '<ORG_ID>',
  'admin',
  'pending'
);
```

### 5.3 Admin Rejected

```sql
insert into public.profiles (id, global_role, account_status)
values ('<ADMIN_REJECTED_ID>', 'admin', 'active')
on conflict (id) do update
set global_role = excluded.global_role,
    account_status = excluded.account_status,
    updated_at = now();

insert into public.organization_memberships (
  organization_id,
  user_id,
  role,
  status,
  approved_by,
  approved_at,
  rejection_reason
)
values (
  '<ORG_ID>',
  '<ADMIN_REJECTED_ID>',
  'admin',
  'rejected',
  null,
  null,
  'manual test reject'
)
on conflict (organization_id, user_id) do update
set role = excluded.role,
    status = excluded.status,
    approved_by = null,
    approved_at = null,
    rejection_reason = excluded.rejection_reason,
    updated_at = now();

insert into public.signup_requests (
  requester_user_id,
  organization_id,
  requested_role,
  status,
  reviewed_by,
  reviewed_at,
  review_note
)
values (
  '<ADMIN_REJECTED_ID>',
  '<ORG_ID>',
  'admin',
  'rejected',
  '<SUPER_USER_ID>',
  now(),
  'manual test reject'
);
```

### 5.4 Admin Active

```sql
insert into public.profiles (id, global_role, account_status)
values ('<ADMIN_ACTIVE_ID>', 'admin', 'active')
on conflict (id) do update
set global_role = excluded.global_role,
    account_status = excluded.account_status,
    updated_at = now();

insert into public.organization_memberships (
  organization_id,
  user_id,
  role,
  status,
  approved_by,
  approved_at,
  rejection_reason
)
values (
  '<ORG_ID>',
  '<ADMIN_ACTIVE_ID>',
  'admin',
  'approved',
  '<SUPER_USER_ID>',
  now(),
  null
)
on conflict (organization_id, user_id) do update
set role = excluded.role,
    status = excluded.status,
    approved_by = excluded.approved_by,
    approved_at = excluded.approved_at,
    rejection_reason = null,
    updated_at = now();

insert into public.signup_requests (
  requester_user_id,
  organization_id,
  requested_role,
  status,
  reviewed_by,
  reviewed_at,
  review_note
)
values (
  '<ADMIN_ACTIVE_ID>',
  '<ORG_ID>',
  'admin',
  'approved',
  '<SUPER_USER_ID>',
  now(),
  'manual test approve'
);
```

### 5.5 User Active

```sql
insert into public.profiles (id, global_role, account_status)
values ('<USER_ACTIVE_ID>', 'user', 'active')
on conflict (id) do update
set global_role = excluded.global_role,
    account_status = excluded.account_status,
    updated_at = now();

insert into public.organization_memberships (
  organization_id,
  user_id,
  role,
  status,
  approved_by,
  approved_at,
  rejection_reason
)
values (
  '<ORG_ID>',
  '<USER_ACTIVE_ID>',
  'user',
  'approved',
  '<SUPER_USER_ID>',
  now(),
  null
)
on conflict (organization_id, user_id) do update
set role = excluded.role,
    status = excluded.status,
    approved_by = excluded.approved_by,
    approved_at = excluded.approved_at,
    rejection_reason = null,
    updated_at = now();

insert into public.signup_requests (
  requester_user_id,
  organization_id,
  requested_role,
  status,
  reviewed_by,
  reviewed_at,
  review_note
)
values (
  '<USER_ACTIVE_ID>',
  '<ORG_ID>',
  'user',
  'approved',
  '<SUPER_USER_ID>',
  now(),
  'manual test approve'
);
```

### 5.6 No Membership Or Inactive

This actor is intentionally authenticated but not eligible for organization access.

```sql
insert into public.profiles (id, global_role, account_status)
values ('<NO_MEMBERSHIP_ID>', 'user', 'active')
on conflict (id) do update
set global_role = excluded.global_role,
    account_status = excluded.account_status,
    updated_at = now();

delete from public.organization_memberships
where user_id = '<NO_MEMBERSHIP_ID>';
```

## 6. Verification Query

Run this after all inserts complete.

```sql
select
  u.email,
  p.global_role,
  p.account_status,
  om.organization_id,
  om.role as membership_role,
  om.status as membership_status,
  sr.requested_role,
  sr.status as signup_request_status,
  sr.reviewed_at
from auth.users u
left join public.profiles p
  on p.id = u.id
left join public.organization_memberships om
  on om.user_id = u.id
left join public.signup_requests sr
  on sr.requester_user_id = u.id
where u.email like 'p3-%@example.com'
order by u.email, sr.created_at desc nulls last;
```

Expected high-level result:

- `p3-super@example.com` -> `global_role='super'`, no membership required
- `p3-admin-pending@example.com` -> `admin` + membership `pending`
- `p3-admin-rejected@example.com` -> `admin` + membership `rejected`
- `p3-admin-active@example.com` -> `admin` + membership `approved`
- `p3-user-active@example.com` -> `user` + membership `approved`
- `p3-no-membership@example.com` -> profile only, no membership row

## 7. Optional Reset

If you want to remove only the product-state rows but keep the auth users:

```sql
delete from public.signup_requests
where requester_user_id in (
  select id
  from auth.users
  where email like 'p3-%@example.com'
);

delete from public.organization_memberships
where user_id in (
  select id
  from auth.users
  where email like 'p3-%@example.com'
);

delete from public.profiles
where id in (
  select id
  from auth.users
  where email like 'p3-%@example.com'
);
```

If you also want to remove the auth users, delete them manually from `Authentication > Users`.

## 8. Notes For P3-3.2 Manual Testing

- this runbook prepares access-state actors only
- `admin_active + onboarding incomplete/complete` still depends on organization-scoped onboarding state
- do not mark a shared real organization as onboarding complete unless that side effect is acceptable
- if you need a second runbook for onboarding completion fixtures, prepare it separately and target a disposable organization
