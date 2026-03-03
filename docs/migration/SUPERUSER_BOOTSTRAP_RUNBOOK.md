# SUPERUSER Bootstrap Runbook

## 1) Purpose

This runbook standardizes how to grant `super` privileges to a user created in Supabase Console (`auth.users`), using:

- SQL function: `public.grant_superuser(target_email text, target_organization_ids uuid[] default null)`
- Migration source: `migrations/011_superuser_grant_function.sql`

## 2) Prerequisites

1. Migration `011_superuser_grant_function.sql` is already applied.
2. Target user already exists in `auth.users` (created via Supabase Console or auth flow).
3. Operator has SQL execution privileges in Supabase SQL Editor.

## 3) Standard Procedure

### Step A: Confirm target auth user exists

```sql
select id, email, created_at
from auth.users
where lower(trim(email)) = lower(trim('<TARGET_EMAIL>'));
```

Expected:
- Exactly one row for the target email.

### Step B: Grant super role only (no organization membership)

```sql
select *
from public.grant_superuser('<TARGET_EMAIL>');
```

Use this mode when you only need global super privileges.

### Step C: Grant super role + bootstrap admin memberships

```sql
select *
from public.grant_superuser(
  '<TARGET_EMAIL>',
  array[
    '00000000-0000-0000-0000-000000000001'::uuid
  ]
);
```

Use this mode when the super user should also have explicit admin membership in one or more organizations.

## 4) Verification Queries

### Verify profile state

```sql
select id, global_role, account_status, updated_at
from public.profiles
where id = (
  select id
  from auth.users
  where lower(trim(email)) = lower(trim('<TARGET_EMAIL>'))
  limit 1
);
```

Expected:
- `global_role = 'super'`
- `account_status = 'active'`

### Verify memberships (if organization IDs were provided)

```sql
select organization_id, user_id, role, status, approved_at, updated_at
from public.organization_memberships
where user_id = (
  select id
  from auth.users
  where lower(trim(email)) = lower(trim('<TARGET_EMAIL>'))
  limit 1
)
order by organization_id;
```

Expected for passed organization IDs:
- `role = 'admin'`
- `status = 'approved'`

## 5) Idempotency Rules

The function is designed for safe rerun:

1. Re-running with same email keeps `profiles.global_role='super'` and `account_status='active'`.
2. Re-running with same organization IDs does not create duplicate membership rows (`ON CONFLICT` upsert).
3. Existing `approved_at` in membership is preserved when already present.

## 6) Failure Modes and Recovery

### Error: target email missing

Message pattern:
- `grant_superuser failed: target_email is required`

Action:
- Re-run with non-empty email string.

### Error: auth user not found

Message pattern:
- `grant_superuser failed: auth user not found for email=...`

Action:
1. Create user in Supabase Console/Auth flow first.
2. Re-run Step A and then function call.

### Error: organization not found

Message pattern:
- `grant_superuser failed: organization not found id=...`

Action:
1. Validate organization UUID exists.
2. Re-run function with corrected organization IDs.

## 7) Recommended Operational Checklist

1. Confirm migration `011` is applied.
2. Confirm target auth user exists.
3. Execute `grant_superuser`.
4. Run profile/membership verification queries.
5. Save execution evidence (SQL output screenshot or ticket log).

