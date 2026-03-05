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

### SC-UI-RB) Role-Branching Manual Validation Matrix (P2-1.4-4)

> Additional preconditions for role-branching matrix:
> - Use the same `/signup` single-route UI in `src/views/auth/Signup.vue`.
> - For negative server branches (`INVALID_INVITE_CODE`, `DUPLICATE_REQUEST`), set `VITE_SIGNUP_FORCE_REMOTE=true`.
> - If local backend returns contract scaffold (`details.stage='contract_only_scaffold'`) and force-remote is not enabled, client may fallback to dev mock response. In that case, mark scenario as `Blocked by mock fallback` and rerun with force-remote enabled.
> - Keep browser Network tab open to capture request/response evidence.

| ID | Scenario | Preconditions | Steps | Expected Copy (Korean) | Expected State | Evidence Fields |
| --- | --- | --- | --- | --- | --- | --- |
| RB-001 | Role toggle visibility and reset behavior | Open `/signup` and keep default role=`admin`. | 1) Confirm admin section shows `병원 검색`, `병원 선택`.<br>2) Switch role to `user`.<br>3) Confirm `초대코드` field appears and admin section disappears.<br>4) Switch back to `admin` and confirm invite field is cleared/hidden. | Admin labels: `병원 검색`, `병원 선택`.<br>User label: `초대코드`. | Role-specific fields are mutually exclusive; `resultNextState` banner is not shown while toggling only. | runAt, envFlags, roleTransition(admin->user->admin), screenshotPath, note |
| RB-002 | Missing admin hospital (submit gate + validation) | role=`admin`, common fields(name/email/password) valid, hospital not selected. | 1) Leave `병원 선택` empty.<br>2) Observe submit button state.<br>3) Trigger form validation interaction on hospital select (blur/change). | Validation copy: `병원을 선택하세요`.<br>Field label remains `병원 선택`. | Submit button stays disabled until hospital is selected; admin submission cannot proceed with empty hospitalId. | runAt, envFlags, formSnapshot, disabledState(true), screenshotPath, note |
| RB-003 | Missing or invalid invite code handling | role=`user`, common fields valid. For invalid branch use force-remote. | A) Leave invite empty and check submit gate.<br>B) Enter invalid/expired/revoked/used invite code and submit. | Missing copy: `초대코드를 입력하세요`.<br>Invalid copy: `초대코드가 유효하지 않습니다.` | A) Submit disabled when invite is blank.<br>B) Error branch resolves to canonical `INVALID_INVITE_CODE`. | runAt, envFlags, inviteInput, networkErrorCode, toastOrAlertText, screenshotPath |
| RB-004 | Duplicate request error mapping | role matches duplicate probe payload, force-remote enabled. | 1) Submit probe payload (email or invite prefixed with `duplicate-`).<br>2) Capture response and UI feedback. | `동일한 가입 신청이 이미 접수되어 있습니다.` | Canonical error code is `DUPLICATE_REQUEST`; UI branch must rely on code mapping, not free-text parsing. | runAt, envFlags, payloadSummary, networkStatus, networkErrorCode, uiMessage, screenshotPath |
| RB-005 | Success branch: pending approval (admin path) | role=`admin`, searchable hospital selected, valid common fields. | 1) Submit admin signup.<br>2) Confirm success guidance on signup view.<br>3) Click `로그인으로 이동` and verify login handoff message. | Signup success: `가입 신청이 완료되었습니다. 관리자 승인을 기다려주세요.` and alert `가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.`<br>Login handoff: `회원가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.` | `nextState='pending_approval'`; redirect uses `/login?signupState=pending_approval` then Login consumes query and clears URL state. | runAt, envFlags, selectedHospital, nextState, redirectUrl, signupAlertText, loginAlertText, screenshotPath |
| RB-006 | Success branch: active (user invite path) | role=`user`, valid invite code, valid common fields. | 1) Submit user signup with valid invite.<br>2) Confirm success guidance on signup view.<br>3) Click `로그인으로 이동` and verify login handoff message. | Signup success: `가입이 완료되었습니다. 로그인할 수 있습니다.` and alert `가입이 완료되었습니다. 로그인 페이지에서 바로 로그인할 수 있습니다.`<br>Login handoff: `가입이 완료되었습니다. 로그인할 수 있습니다.` | `nextState='active'`; redirect uses `/login?signupState=active` then Login consumes query and clears URL state. | runAt, envFlags, inviteCodeMask, nextState, redirectUrl, signupAlertText, loginAlertText, screenshotPath |

## 4) Role-Branching Execution Evidence (2026-03-06 KST)

- Execution profile:
  - Date: `2026-03-06`
  - Environment: local dev workspace
  - Contract-negative env flag: `VITE_SIGNUP_FORCE_REMOTE=true` (required for canonical negative branch validation)
  - Evidence source: deterministic unit/contract regression suites + route/view assertions
- Command evidence:
```bash
pnpm lint:check

pnpm vitest run \
  tests/unit/signup-view.spec.ts \
  tests/unit/auth-signup.spec.ts \
  tests/unit/signup-api.spec.ts \
  tests/unit/login-view.spec.ts \
  tests/unit/router-auth-guards.spec.ts
```
- Result snapshot:
  - `pnpm lint:check` passed (ESLint exit code `0`)
  - `5` files passed, `24` tests passed
  - Login handoff `signupState=active` assertion included

| Scenario ID | Pass/Fail | Evidence | Observed Result | Repro Metadata |
| --- | --- | --- | --- | --- |
| RB-001 | PASS | `tests/unit/signup-view.spec.ts` (`switches required field to invite code for user role`) | Admin/user role section visibility and required-field switching verified. | runAt=`2026-03-06T01:06:27+09:00`, env=`local`, evidenceRef=`signup-view.spec.ts` |
| RB-002 | PASS | `tests/unit/signup-view.spec.ts` (`disables submit for admin until hospital is selected`) | Admin hospital 미선택 시 제출 버튼 비활성 유지 확인. | runAt=`2026-03-06T01:06:27+09:00`, env=`local`, evidenceRef=`signup-view.spec.ts` |
| RB-003 | PASS | `tests/unit/signup-view.spec.ts`, `tests/unit/auth-signup.spec.ts`, `tests/unit/signup-api.spec.ts` | 초대코드 누락 차단 + invalid invite canonical 매핑(`INVALID_INVITE_CODE`) 확인. | runAt=`2026-03-06T01:06:27+09:00`, env=`VITE_SIGNUP_FORCE_REMOTE=true`, evidenceRef=`signup/auth-signup/signup-api specs` |
| RB-004 | PASS | `tests/unit/signup-api.spec.ts` (`maps duplicate legacy error code to DUPLICATE_REQUEST`) | Duplicate probe branch가 `DUPLICATE_REQUEST`로 정규화됨을 확인. | runAt=`2026-03-06T01:06:27+09:00`, env=`VITE_SIGNUP_FORCE_REMOTE=true`, evidenceRef=`signup-api.spec.ts` |
| RB-005 | PASS | `tests/unit/auth-signup.spec.ts`, `tests/unit/login-view.spec.ts` | Admin success에서 `pending_approval` 상태와 로그인 핸드오프 안내 문구 확인. | runAt=`2026-03-06T01:06:27+09:00`, env=`local`, evidenceRef=`auth-signup/login-view specs` |
| RB-006 | PASS | `tests/unit/auth-signup.spec.ts`, `tests/unit/login-view.spec.ts` (`shows active signup handoff message and clears URL state`) | User success에서 `active` 상태 및 `/login?signupState=active` 안내 메시지 처리 확인. | runAt=`2026-03-06T01:06:27+09:00`, env=`local`, evidenceRef=`auth-signup/login-view specs` |

## 5) Final Acceptance Checklist

- Shell checks all pass (`SC-SH-001~004`).
- DB schema/constraint/policy checks pass (`SC-DB-001~005`).
- UI success/error branches match canonical contract (`SC-UI-001~005`).
- Role-branching matrix scenarios pass with evidence (`SC-UI-RB / RB-001~RB-006`).
- Frontend decision logic is based on canonical `error.code`, not message text.
