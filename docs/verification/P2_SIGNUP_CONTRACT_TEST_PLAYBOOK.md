# P2 Signup Contract Test Playbook

This playbook validates completed tasks:
- `79d3fd2b-ecec-45bc-9578-a88f19599d20` (invite domain DDL/RLS)
- `97cfb736-1ec7-425e-948d-b9a9d5b247f0` (signup-submit v2 contract)
- `3d552bc3-2866-437c-a3e5-8e208b1d5c51` (frontend type/API/store alignment)

## 1) Shell-Executable Scenarios (Automated)

### SC-SH-001: Contract unit tests
- Command:
```bash
pnpm vitest run tests/unit/signup-api.spec.ts tests/unit/auth-signup.spec.ts
```
- Expected:
  - All tests pass.
  - `signup-api.spec.ts` confirms alias normalization and canonical error mapping.
  - `auth-signup.spec.ts` confirms deterministic store return structure.

### SC-SH-002: Lint gate
- Command:
```bash
pnpm lint:check
```
- Expected:
  - ESLint exits with code `0`.
  - No blocking lint errors.

### SC-SH-003: Contract marker verification
- Command:
```bash
rg -n "can_manage_invite_codes|max_uses|used_count|invite_codes_update_admin_scope" \
  migrations/008_rls_progressive_rollout.sql migrations/010_signup_role_flow.sql

rg -n "Invite Code Domain Rules|contract_only_scaffold|DUPLICATE_REQUEST|organizationSelectionMode" \
  docs/API_SPEC.md

rg -n "validateOrganizationSelectionMode|hasDuplicateContractToken|DUPLICATE_PENDING_REQUEST" \
  supabase/functions/signup-submit/index.ts
```
- Expected:
  - All key markers are found.
  - Migration/function/spec are aligned.

### SC-SH-004: One-shot regression script
- Command:
```bash
pnpm test:signup:contracts
```
- Expected:
  - Executes SC-SH-001 ~ SC-SH-003 in sequence.
  - Ends with `[signup-contract] Done`.

## 2) DB Scenarios (Manual Execution by Operator)

> Run these in SQL editor or psql against your test database.

### SC-DB-001: invite_codes schema contract
- SQL:
```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public' and table_name='invite_codes'
order by ordinal_position;
```
- Expected:
  - Columns include `max_uses`, `used_count`, `code_hash`, `expires_at`, `used_at`, `used_by`, `revoked_at`.

### SC-DB-002: constraints for single-use consistency
- SQL:
```sql
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid='public.invite_codes'::regclass
order by conname;
```
- Expected:
  - Constraints include:
    - `max_uses = 1`
    - `used_count` bounded in `0..1`
    - `(used_count=0 => used_at/used_by null)`
    - `(used_count=1 => used_at/used_by not null)`

### SC-DB-003: reject invalid usage pair
- SQL:
```sql
insert into public.invite_codes (
  organization_id, role_scope, code_hash, expires_at, max_uses, used_count, used_at, created_by
) values (
  '<ORG_UUID>', 'user', 'hash-invalid-usage-pair', now() + interval '1 day', 1, 0, now(), '<USER_UUID>'
);
```
- Expected:
  - Insert fails by check constraint.

### SC-DB-004: reject invalid used_count
- SQL:
```sql
insert into public.invite_codes (
  organization_id, role_scope, code_hash, expires_at, max_uses, used_count, created_by
) values (
  '<ORG_UUID>', 'user', 'hash-invalid-used-count', now() + interval '1 day', 1, 2, '<USER_UUID>'
);
```
- Expected:
  - Insert fails by check constraint.

### SC-DB-005: RLS policy existence
- SQL:
```sql
select policyname, cmd, qual, with_check
from pg_policies
where schemaname='public' and tablename='invite_codes'
order by policyname;
```
- Expected:
  - Policies exist:
    - `invite_codes_select_admin_scope`
    - `invite_codes_insert_admin_scope`
    - `invite_codes_update_admin_scope`

## 3) UI Scenarios (Manual Execution by Operator)

> Precondition for contract-negative UI checks:
> - Set `VITE_SIGNUP_FORCE_REMOTE=true` in `.env.local`.
> - Restart Vite dev server after env changes.
> - If not set, dev mock bypass may return success (`active`) even for invalid invites.

### SC-UI-001: Admin signup success branch
- Steps:
  1. Open `/signup`.
  2. Select role `admin`.
  3. Search and select a hospital.
  4. Submit.
- Expected:
  - Success state is `pending_approval`.
  - UI shows pending approval guidance.

### SC-UI-002: User signup success branch
- Steps:
  1. Open `/signup`.
  2. Select role `user`.
  3. Enter valid invite code.
  4. Submit.
- Expected:
  - Success state is `active`.
  - UI shows immediate-login guidance.

### SC-UI-003: Invalid invite code branch
- Steps:
  1. Use malformed/expired/revoked/already-used invite.
  2. Submit with role `user`.
- Expected:
  - Error branch uses canonical `INVALID_INVITE_CODE`.
  - Message is mapped by frontend canonical table.

### SC-UI-004: Duplicate request contract probe
- Steps:
  1. For contract probe, use email or invite code prefixed with `duplicate-`.
  2. Submit.
- Expected:
  - API returns `DUPLICATE_REQUEST`.
  - UI handles duplicate by error-code branch (not free-text parsing).

### SC-UI-005: Invalid organizationSelectionMode
- Steps:
  1. Submit payload with `organizationSelectionMode='create_new'` (DevTools override).
  2. Trigger submit.
- Expected:
  - API returns `VALIDATION_ERROR`.
  - Error details indicate expected mode is `existing`.

## 4) Final Acceptance Checklist

- Shell checks all pass (`SC-SH-001~004`).
- DB schema/constraint/policy checks pass (`SC-DB-001~005`).
- UI success/error branches match canonical contract (`SC-UI-001~005`).
- Frontend decision logic is based on canonical `error.code`, not message text.
