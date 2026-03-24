# API Specification: Planning Request

This document describes the JSON structure for the `PlanningRequest` API, which is used to trigger the schedule generation process.
The endpoint accepts a JSON object with the following structure.

## Overview

The request body consists of five main sections:

1.  **`organization`**: Basic organization info and time frame settings.
2.  **`employees`**: List of employees available for scheduling.
3.  **`history`**: Historical assignments (fixed past data).
4.  **`undesirable`**: Employee requests or undesirable shifts (future data).
5.  **`requirements`**: Daily staffing requirements per shift.

---

## JSON Structure

### Root Object

| Field          | Type   | Required | Description                                                                    |
| :------------- | :----- | :------- | :----------------------------------------------------------------------------- |
| `organization` | Object | Yes      | Organization details and schedule parameters.                                  |
| `employees`    | Array  | Yes      | List of employees.                                                             |
| `history`      | Array  | No       | List of past assignments before `firstDraftDate` (Off/O assignments excluded). |
| `undesirable`  | Array  | No       | List of employee off requests on or after `firstDraftDate`.                    |
| `requirements` | Array  | Yes      | Staffing requirements for each shift per day.                                  |

---

### 1. Organization (`organization`)

Defines the context and the time range for the schedule.

| Field                | Type    | Format       | Description                                                                   |
| :------------------- | :------ | :----------- | :---------------------------------------------------------------------------- |
| `id`                 | String  | UUID         | Unique identifier for the organization.                                       |
| `name`               | String  | -            | Name of the organization (e.g., "Severance Hospital").                        |
| `type`               | String  | -            | Type of organization (e.g., "hospital").                                      |
| `shifts`             | Array   | -            | List of planning shift definitions (D/E/N only).                              |
| `lastHistoricalDate` | String  | `yyyy-MM-dd` | The last date of the historical data period.                                  |
| `publishLength`      | Integer | -            | Number of days to publish (not directly used in calculation logic currently). |
| `firstDraftDate`     | String  | `yyyy-MM-dd` | The start date of the planning period (schedule draft).                       |
| `draftLength`        | Integer | -            | The length of the planning period in days.                                    |

#### Shift Object (`organization.shifts[]`)

| Field        | Type   | Format     | Description                                         |
| :----------- | :----- | :--------- | :-------------------------------------------------- |
| `id`         | String | UUID       | Unique identifier for the shift.                    |
| `code`       | String | -          | Short code for the shift (e.g., "D", "E", "N").     |
| `name`       | String | -          | Display name of the shift (e.g., "Day", "Evening"). |
| `start_time` | String | `HH:mm:ss` | Shift start time.                                   |
| `end_time`   | String | `HH:mm:ss` | Shift end time.                                     |

---

### 2. Employees (`employees`)

List of all employees to be scheduled.

| Field              | Type          | Description                                                             |
| :----------------- | :------------ | :---------------------------------------------------------------------- |
| `employee_id`      | String        | Unique identifier for the employee.                                     |
| `name`             | String        | Employee name. (Defaults to `employee_id` if null).                     |
| `available_shifts` | Array<String> | List of shift codes (e.g., `["D", "E", "N"]`) the employee can perform. |
| `skill_set`        | Array<String> | List of skills/roles (e.g., `["ALL"]`).                                 |

---

### 3. History (`history`)

Represents confirmed past schedules used for constraint checking.

| Field         | Type    | Format       | Description                                            |
| :------------ | :------ | :----------- | :----------------------------------------------------- |
| `employee_id` | String  | UUID         | ID of the employee.                                    |
| `shift_id`    | String  | UUID         | ID of the assigned shift (`D/E/N`, Off/O is excluded). |
| `date`        | String  | `yyyy-MM-dd` | Date of the assignment (`date < firstDraftDate`).      |
| `is_locked`   | Boolean | -            | Always `true` (hard constraint).                       |

### 4. Undesirable (`undesirable`)

Represents future off requests/undesirable days.

| Field         | Type    | Format       | Description                                |
| :------------ | :------ | :----------- | :----------------------------------------- |
| `employee_id` | String  | UUID         | ID of the employee.                        |
| `date`        | String  | `yyyy-MM-dd` | Requested date (`date >= firstDraftDate`). |
| `is_locked`   | Boolean | -            | Always `false` (soft constraint).          |

---

### 5. Requirements (`requirements`)

Defines how many employees are needed for each shift on each day of the planning period.

| Field           | Type    | Description                                                      |
| :-------------- | :------ | :--------------------------------------------------------------- |
| `shiftId`       | String  | ID of the shift.                                                 |
| `dayIndex`      | Integer | 0-based index from `firstDraftDate`. (e.g., 0 is the first day). |
| `employeeCount` | Integer | Required number of employees for this shift on this day.         |

---

## Example Request Body

```json
{
  "organization": {
    "id": "00000000-0000-0000-0000-000000000001",
    "name": "Severance Hospital",
    "type": "hospital",
    "shifts": [
      {
        "id": "a5bcb7c0-b9b1-408d-9add-fd08c13b951c",
        "code": "D",
        "name": "Day",
        "start_time": "08:00:00",
        "end_time": "16:00:00"
      }
    ],
    "lastHistoricalDate": "2025-11-26",
    "firstDraftDate": "2025-12-01",
    "publishLength": 4,
    "draftLength": 31
  },
  "employees": [
    {
      "employee_id": "3515886c-6359-4919-9c02-682565bb93c7",
      "name": "John Doe",
      "available_shifts": ["D", "E", "N"],
      "skill_set": ["ALL"]
    }
  ],
  "history": [
    {
      "employee_id": "3515886c-6359-4919-9c02-682565bb93c7",
      "shift_id": "a5bcb7c0-b9b1-408d-9add-fd08c13b951c",
      "date": "2025-11-30",
      "is_locked": true
    }
  ],
  "undesirable": [
    {
      "employee_id": "3515886c-6359-4919-9c02-682565bb93c7",
      "date": "2025-12-03",
      "is_locked": false
    }
  ],
  "requirements": [
    {
      "shiftId": "a5bcb7c0-b9b1-408d-9add-fd08c13b951c",
      "dayIndex": 0,
      "employeeCount": 3
    }
  ]
}
```

---

## Signup and Approval Contract (P2 Canonical)

This section defines state semantics for signup and approval workflows.
It is intentionally separated from `PlanningRequest` payload rules above.

Canonical state source:

- `docs/migration/P2_SIGNUP_ROLE_FLOW.md`

### Contract Scope

- This section defines:
  - Request/response contract for `signup-submit` and approval operations
  - State transition expectations (`signup_requests`, `organization_memberships`)
  - Error code semantics for frontend/server consistency
- This section does not define:
  - UI interaction details
  - Internal SQL implementation details

### Shared Enums

| Name                        | Values                                                    |
| :-------------------------- | :-------------------------------------------------------- |
| `requestedRole`             | `admin`, `user`                                           |
| `organizationSelectionMode` | `existing`                                                |
| `nextState`                 | `pending_approval`, `active`                              |
| `signupRequestStatus`       | `pending`, `approved`, `rejected`, `expired`, `withdrawn` |
| `membershipStatus`          | `pending`, `approved`, `rejected`, `withdrawn`, `none`    |

`membershipStatus='none'` means no membership row was created/updated in that operation.

### Edge Function Boundary (`signup-submit`)

- Client boundary is fixed to `supabase.functions.invoke('signup-submit')`.
- Production direct-table fallback is forbidden.
- Server must normalize role input and enforce role-specific required fields.
- Server responses must follow the unified envelope in this section.

### Request DTO (Basic Contract)

#### Common fields

| Field           | Type   | Required | Rules                                                            |
| :-------------- | :----- | :------- | :--------------------------------------------------------------- |
| `email`         | String | Yes      | Valid email format                                               |
| `password`      | String | Yes      | Policy-validated secret                                          |
| `name`          | String | Yes      | Non-empty                                                        |
| `role`          | String | Yes      | `admin` or `user`                                                |
| `requestedRole` | String | No       | Legacy alias for `role` (deprecated, accepted for compatibility) |

#### Role-specific fields

| Field                       | Type   | Required    | Rules                                                                  |
| :-------------------------- | :----- | :---------- | :--------------------------------------------------------------------- |
| `hospitalId`                | UUID   | Conditional | Required when `role='admin'`                                           |
| `hospitalName`              | String | Conditional | Required when `role='admin'`, selected hospital display name           |
| `hospitalSource`            | String | Conditional | Required when `role='admin'`, must be `data.go.kr`                     |
| `organizationId`            | UUID   | No          | Legacy alias for `hospitalId` (deprecated, accepted for compatibility) |
| `inviteCode`                | String | Conditional | Required when `role='user'`                                            |
| `organizationSelectionMode` | String | No          | Canonical value is `existing`                                          |
| `workType`                  | String | No          | Optional profile metadata                                              |
| `shiftType`                 | String | No          | Optional profile metadata                                              |
| `requestedSiteName`         | String | No          | Optional profile metadata                                              |
| `requestedSkillSummary`     | String | No          | Optional profile metadata                                              |
| `requestedRankCode`         | String | No          | Optional profile metadata                                              |
| `requestedCredit`           | Number | No          | Optional profile metadata                                              |

### Input Validation Checklist

- Common:
  - `email`, `password`, `name` are required and non-empty.
  - `role` (or legacy alias `requestedRole`) must be one of `admin`, `user`.
- `role='admin'`:
  - `hospitalId` or `organizationId` must be provided.
  - `hospitalName` must be provided.
  - `hospitalSource` must be `data.go.kr`.
  - Missing hospital selection returns `HOSPITAL_REQUIRED`.
- `role='user'`:
  - `inviteCode` must be provided and valid.
  - Invalid or unusable invite returns `INVALID_INVITE_CODE`.
- Duplicate pending request in same requester/role/scope returns `DUPLICATE_REQUEST`.

### Invite Code Domain Rules (`invite_codes`)

- Persistence table: `public.invite_codes` (user signup path only).
- Raw invite token must never be stored. Only a 64-character SHA-256 hex digest is stored in `code_hash`.
- `expires_at` is mandatory and must be later than `created_at`.
- Canonical single-use model:
  - `max_uses` is fixed to `1`
  - `used_count` is constrained to `0` or `1`
  - `used_count=0` requires `used_at IS NULL` and `used_by IS NULL`
  - `used_count=1` requires `used_at IS NOT NULL` and `used_by IS NOT NULL`
- Canonical policy source:
  - helper function is defined in `migrations/008_rls_progressive_rollout.sql`
  - actual `invite_codes` RLS policies are applied in `migrations/010_signup_role_flow.sql`
- State classification for validation:
  - Active: `revoked_at IS NULL` AND `used_count < max_uses` AND `expires_at > NOW()`
  - Expired: `expires_at <= NOW()`
  - Used: `used_count >= max_uses`
  - Revoked: `revoked_at IS NOT NULL`
- Invite issuance/revocation is restricted to super/admin organization scope via RLS policy (`can_manage_invite_codes`).
- `used_at` / `used_by` remain compatibility integrity fields and must stay aligned with the canonical `used_count/max_uses` state.

### Contract-Only Scaffold Note

- During contract-only rollout, `signup-submit` may return:
  - `501 INTERNAL_ERROR` with `error.details.stage='contract_only_scaffold'` when persistence is disabled
  - `DUPLICATE_REQUEST` envelope for duplicate-request contract verification
- `SIGNUP_SUBMIT_CONTRACT_MOCK_SUCCESS=true` is the explicit non-production toggle that swaps the scaffold into success-envelope mode for contract validation.
- Frontend must branch by canonical `error.code` and treat detail values as supplementary metadata.

### Success Response Envelope

- `nextState` is required on every success response and is the only canonical client branch key for immediate post-signup behavior.

```json
{
  "success": true,
  "data": {
    "path": "admin_submit",
    "nextState": "pending_approval",
    "signupRequestId": "uuid",
    "signupRequestStatus": "pending",
    "membershipStatus": "none"
  }
}
```

### Success Example: User Invite Redeem

```json
{
  "success": true,
  "data": {
    "path": "user_invite_redeem",
    "nextState": "active",
    "signupRequestId": "uuid",
    "signupRequestStatus": "approved",
    "membershipStatus": "approved",
    "organizationId": "uuid"
  }
}
```

### Error Response Envelope

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_REQUEST",
    "message": "Human-readable message",
    "details": {
      "reason": "DUPLICATE_PENDING_REQUEST"
    }
  }
}
```

Clients must branch by `error.code` (canonical), not by free-form message text.

### Canonical Error Code Contract (`signup-submit`)

| Code                  | Meaning                                                        | Typical Operation              |
| :-------------------- | :------------------------------------------------------------- | :----------------------------- |
| `INVALID_ROLE`        | Role is missing or not one of `admin` / `user`                 | signup-submit                  |
| `INVALID_INVITE_CODE` | Invite is missing/invalid/expired/used/revoked/role-mismatched | signup-submit (`role='user'`)  |
| `HOSPITAL_REQUIRED`   | Admin hospital selection is missing                            | signup-submit (`role='admin'`) |
| `DUPLICATE_REQUEST`   | Duplicate pending signup request exists in same scope          | signup-submit                  |
| `VALIDATION_ERROR`    | Generic request schema validation failure                      | signup-submit                  |
| `PERMISSION_DENIED`   | Caller lacks required scope/permission                         | signup-submit/approval         |
| `INTERNAL_ERROR`      | Unexpected server-side failure                                 | all                            |

#### Legacy/Error Detail Mapping

The server may include legacy detail reasons under `error.details.reason` for migration compatibility.

| Legacy/Detail Code          | Canonical Code        |
| :-------------------------- | :-------------------- |
| `DUPLICATE_PENDING_REQUEST` | `DUPLICATE_REQUEST`   |
| `ORGANIZATION_REQUIRED`     | `HOSPITAL_REQUIRED`   |
| `INVITE_NOT_FOUND`          | `INVALID_INVITE_CODE` |
| `INVITE_EXPIRED`            | `INVALID_INVITE_CODE` |
| `INVITE_ALREADY_USED`       | `INVALID_INVITE_CODE` |
| `INVITE_REVOKED`            | `INVALID_INVITE_CODE` |
| `INVITE_ROLE_MISMATCH`      | `INVALID_INVITE_CODE` |

## Auth Context Contract (P2 Canonical)

This section defines the authenticated context payload used after login or session restore.
Client-side access control must derive post-login access from this payload, not from `signup-submit.nextState`.

### Contract Scope

- This section defines:
  - canonical profile and membership fields for post-login access decisions
  - multi-membership precedence inputs
  - shared enum values used by frontend access-state resolution
- This section does not define:
  - route guard sequencing
  - pending/rejected UI copy
  - organization switcher UX

### Shared Enums

| Name               | Values                                                                                                                           |
| :----------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| `globalRole`       | `super`, `admin`, `user`                                                                                                         |
| `accountStatus`    | `active`, `pending`, `rejected`, `suspended`, `withdrawn`                                                                        |
| `membershipRole`   | `admin`, `user`                                                                                                                  |
| `membershipStatus` | `pending`, `approved`, `rejected`, `withdrawn`                                                                                   |
| `accessState`      | `unauthenticated`, `super_active`, `admin_active`, `admin_pending`, `admin_rejected`, `user_active`, `no_membership_or_inactive` |

### Response Envelope

```json
{
  "success": true,
  "data": {
    "profile": {
      "userId": "uuid",
      "globalRole": "admin",
      "accountStatus": "active"
    },
    "currentOrganizationId": "uuid",
    "memberships": [
      {
        "membershipId": "uuid",
        "organizationId": "uuid",
        "role": "admin",
        "status": "pending",
        "approvedAt": null,
        "createdAt": "2026-03-07T01:00:00.000Z",
        "rejectionReason": null
      }
    ]
  }
}
```

### Field Rules

#### `profile`

| Field           | Type   | Required | Rules                 |
| :-------------- | :----- | :------- | :-------------------- | ------------ | ------------- | -------------- | ----------- |
| `userId`        | UUID   | Yes      | Authenticated user id |
| `globalRole`    | String | Yes      | `super` \\            | `admin` \\   | `user`        |
| `accountStatus` | String | Yes      | `active` \\           | `pending` \\ | `rejected` \\ | `suspended` \\ | `withdrawn` |

#### `memberships[]`

| Field             | Type   | Required | Rules                        |
| :---------------- | :----- | :------- | :--------------------------- | ------------- | ------------- | ----------- |
| `membershipId`    | UUID   | No       | Membership row id            |
| `organizationId`  | UUID   | Yes      | Organization scope id        |
| `role`            | String | Yes      | `admin` \\                   | `user`        |
| `status`          | String | Yes      | `pending` \\                 | `approved` \\ | `rejected` \\ | `withdrawn` |
| `approvedAt`      | String | No       | ISO-8601 timestamp or `null` |
| `createdAt`       | String | No       | ISO-8601 timestamp or `null` |
| `rejectionReason` | String | No       | Optional rejection metadata  |

#### Optional context field

| Field                   | Type | Required | Rules                                                                          |
| :---------------------- | :--- | :------- | :----------------------------------------------------------------------------- |
| `currentOrganizationId` | UUID | No       | When present, the matching membership is evaluated first for access resolution |

### Access-State Derivation Rules

- `globalRole='super'` and `accountStatus='active'` resolves to `super_active` without membership checks.
- Any non-`active` `accountStatus` resolves to `no_membership_or_inactive`.
- For non-super users, only `membershipStatus='approved'` grants active tenant access.
- When `currentOrganizationId` is present, the matching membership row is evaluated first.
- Without current organization context, clients should select memberships in this order:
  - approved `admin`
  - approved `user`
  - pending `admin`
  - rejected `admin`
- Pending or rejected `user` memberships are not a normal happy-path access state and should resolve to `no_membership_or_inactive`.

## Invite Code Manage Contract (P2 Canonical)

This section defines the admin/super invite-code management contract for issuance, revoke, and list operations.

### Edge Function Boundary (`invite-code-manage`)

- Client boundary is fixed to `supabase.functions.invoke('invite-code-manage')`.
- Request body uses a single action discriminator: `create`, `revoke`, `list`.
- Server must enforce organization scope using `public.can_manage_invite_codes(target_org_id)`.
  - `admin`: only own organization scope.
  - `superuser`: cross-organization scope allowed.
- `maxUses` is fixed server-side to `1` regardless of client input.
- Raw invite code is returned only once on `create` success and must never be persisted or re-readable.

### Request DTO (Action Union)

#### Common field

| Field    | Type   | Required | Rules                          |
| :------- | :----- | :------- | :----------------------------- |
| `action` | String | Yes      | `create` \| `revoke` \| `list` |

#### Action: `create`

| Field            | Type   | Required | Rules                                                         |
| :--------------- | :----- | :------- | :------------------------------------------------------------ |
| `action`         | String | Yes      | Fixed to `create`                                             |
| `organizationId` | UUID   | Yes      | Target organization for issuance                              |
| `expiresAt`      | String | Yes      | ISO-8601 timestamp, must be later than server `NOW()`         |
| `maxUses`        | Number | No       | Optional compatibility input, server always normalizes to `1` |

#### Action: `revoke`

| Field          | Type   | Required | Rules                                         |
| :------------- | :----- | :------- | :-------------------------------------------- |
| `action`       | String | Yes      | Fixed to `revoke`                             |
| `inviteCodeId` | UUID   | Yes      | Target invite row id in `public.invite_codes` |

#### Action: `list`

| Field             | Type    | Required | Rules                                                          |
| :---------------- | :------ | :------- | :------------------------------------------------------------- |
| `action`          | String  | Yes      | Fixed to `list`                                                |
| `organizationId`  | UUID    | Yes      | Query scope target organization                                |
| `includeInactive` | Boolean | No       | Default `true`; when `false`, only `active` items are returned |

### Response Rules

- Success and error envelopes follow the same canonical shape used by `signup-submit`.
- `create` success includes `rawCode` exactly once.
- `revoke` and `list` responses never include `rawCode` or `codeHash`.
- `list` items expose only management metadata plus derived status.

### Invite Status Derivation (`derivedStatus`)

- `revoked`: `revoked_at IS NOT NULL`
- `used`: `used_count = 1`
- `expired`: `expires_at <= NOW()`
- `active`: `revoked_at IS NULL AND used_count = 0 AND expires_at > NOW()`

Evaluation order is deterministic: `revoked` -> `used` -> `expired` -> `active`.

### Success Response Envelope

#### Success Example: `create`

```json
{
  "success": true,
  "data": {
    "action": "create",
    "inviteCodeId": "uuid",
    "organizationId": "uuid",
    "roleScope": "user",
    "rawCode": "ABCD-1234-EFGH",
    "maxUses": 1,
    "usedCount": 0,
    "expiresAt": "2026-03-31T14:59:59.000Z",
    "createdAt": "2026-03-06T01:00:00.000Z",
    "createdBy": "uuid",
    "derivedStatus": "active"
  }
}
```

#### Success Example: `revoke`

```json
{
  "success": true,
  "data": {
    "action": "revoke",
    "inviteCodeId": "uuid",
    "organizationId": "uuid",
    "revokedAt": "2026-03-06T01:03:00.000Z",
    "derivedStatus": "revoked"
  }
}
```

#### Success Example: `list`

```json
{
  "success": true,
  "data": {
    "action": "list",
    "organizationId": "uuid",
    "items": [
      {
        "inviteCodeId": "uuid",
        "roleScope": "user",
        "maxUses": 1,
        "usedCount": 0,
        "expiresAt": "2026-03-31T14:59:59.000Z",
        "revokedAt": null,
        "usedAt": null,
        "createdAt": "2026-03-06T01:00:00.000Z",
        "createdBy": "uuid",
        "derivedStatus": "active"
      }
    ]
  }
}
```

### Error Response Envelope

```json
{
  "success": false,
  "error": {
    "code": "INVITE_CODE_NOT_FOUND",
    "message": "Invite code not found.",
    "details": {
      "inviteCodeId": "uuid"
    }
  }
}
```

Clients must branch by `error.code` (canonical), not by free-form message text.

### Canonical Error Code Contract (`invite-code-manage`)

| Code                          | Meaning                                           | Typical Operation  |
| :---------------------------- | :------------------------------------------------ | :----------------- |
| `VALIDATION_ERROR`            | Request payload schema/field validation failed    | create/revoke/list |
| `PERMISSION_DENIED`           | Caller lacks organization scope permission        | create/revoke/list |
| `INVITE_CODE_NOT_FOUND`       | Target invite row does not exist in allowed scope | revoke             |
| `INVITE_CODE_ALREADY_REVOKED` | Invite row is already revoked                     | revoke             |
| `INTERNAL_ERROR`              | Unexpected server-side failure                    | all                |

### Contract-Only Scaffold Note

- During contract-only rollout, `invite-code-manage` may return:
  - `501 INTERNAL_ERROR` with `error.details.stage='contract_only_scaffold'` when persistence is disabled.
- Frontend should treat this as a non-production scaffold response and keep canonical error handling.

## Hospital Search Contract (P2 Canonical)

This section defines the contract for hospital lookup used by admin signup.

### Edge Function Boundary (`hospital-search`)

- Client boundary is fixed to `supabase.functions.invoke('hospital-search')`.
- Client must not call `data.go.kr` directly.
- `HOSPITAL_API_BASE_URL` and `HOSPITAL_API_KEY` must be used only in server environment variables.

### Request DTO

| Field       | Type   | Required | Rules                                    |
| :---------- | :----- | :------- | :--------------------------------------- |
| `keyword`   | String | Yes      | Trimmed length must be `2..50`           |
| `pageNo`    | Number | No       | Positive integer, default `1`            |
| `numOfRows` | Number | No       | Positive integer, default `20`, max `50` |

### Input Validation Checklist

- `keyword` is required and must be `2..50` chars after trim.
- `pageNo` must be a positive integer if provided.
- `numOfRows` must be a positive integer in range `1..50` if provided.

### Success Response Envelope

```json
{
  "success": true,
  "data": {
    "source": "data.go.kr",
    "keyword": "세브란스",
    "items": [
      {
        "id": "A1234567",
        "name": "세브란스병원",
        "source": "data.go.kr"
      }
    ],
    "paging": {
      "pageNo": 1,
      "numOfRows": 20,
      "totalCount": 154
    }
  }
}
```

### Error Response Envelope

```json
{
  "success": false,
  "error": {
    "code": "UPSTREAM_TIMEOUT",
    "message": "Upstream request timed out.",
    "details": {
      "timeoutMs": 5000
    }
  }
}
```

Clients must branch by `error.code` (canonical), not by free-form message text.

### Canonical Error Code Contract (`hospital-search`)

| Code                  | Meaning                                            |
| :-------------------- | :------------------------------------------------- |
| `VALIDATION_ERROR`    | Request payload validation failed                  |
| `UPSTREAM_TIMEOUT`    | data.go.kr request timed out                       |
| `UPSTREAM_RATE_LIMIT` | data.go.kr or edge-level rate limit was hit        |
| `UPSTREAM_ERROR`      | data.go.kr returned non-success or invalid payload |
| `INTERNAL_ERROR`      | Unexpected server-side failure                     |

### Rate Limit / Timeout / Error Mapping Policy

- Timeout: upstream fetch timeout is fixed to `5000ms` and maps to `UPSTREAM_TIMEOUT`.
- Rate limit:
  - HTTP `429` from upstream maps to `UPSTREAM_RATE_LIMIT`.
  - Edge-level request throttling maps to `UPSTREAM_RATE_LIMIT`.
- Upstream errors:
  - Non-2xx response maps to `UPSTREAM_ERROR`.
  - Invalid payload shape or upstream result code mismatch maps to `UPSTREAM_ERROR`.
- Local validation failures map to `VALIDATION_ERROR`.

### Security Boundary Checklist

- Browser network does not call `data.go.kr` directly.
- `HOSPITAL_API_KEY` is not referenced in browser code.
- Every hospital item includes `source='data.go.kr'`.

### State Write Expectation by Role

- `role='admin'`:
  - Create `signup_requests(status='pending', requested_role='admin')`.
  - Do not create approved membership at submit time.
- `role='user'`:
  - Validate/consume invite.
  - Upsert `organization_memberships(role='user', status='approved')`.
  - Insert `signup_requests(status='approved', requested_role='user')` for audit in same transaction.

### Operation C: Approval Decision (Admin Queue, Reference)

Logical operation:

- Superuser decision on pending admin signup request.

Canonical policy source:

- `docs/migration/P2_ACCESS_APPROVAL_POLICY.md`

#### Request Body

| Field             | Type   | Required | Rules                    |
| :---------------- | :----- | :------- | :----------------------- |
| `signupRequestId` | UUID   | Yes      | Pending admin request ID |
| `decision`        | String | Yes      | `approve` or `reject`    |
| `reviewNote`      | String | No       | Optional reason/context  |

### Success Response DTO (Canonical)

| Field              | Type    | Required | Notes                                          |
| :----------------- | :------ | :------- | :--------------------------------------------- |
| `signupRequestId`  | UUID    | Yes      | Target request id                              |
| `decision`         | String  | Yes      | `approve` \| `reject`                          |
| `requestStatus`    | String  | Yes      | `approved` \| `rejected`                       |
| `membershipStatus` | String  | Yes      | `approved` \| `none`                           |
| `organizationId`   | UUID    | No       | Tenant scope id                                |
| `membershipId`     | UUID    | No       | Created/updated membership id for approve path |
| `decidedAt`        | String  | Yes      | ISO-8601 decision timestamp                    |
| `alreadyProcessed` | Boolean | Yes      | Idempotent replay indicator                    |

#### State Write Expectation

- `decision='approve'`:
  - `signup_requests.pending -> approved`
  - `organization_memberships` upsert to `approved` with `role='admin'`
- `decision='reject'`:
  - `signup_requests.pending -> rejected`
  - no approved membership creation

#### Approval-Specific Error Codes

| Code                 | Meaning                                                                  |
| :------------------- | :----------------------------------------------------------------------- |
| `INVALID_TRANSITION` | Request state transition is forbidden (already terminal or incompatible) |
| `REQUEST_NOT_FOUND`  | Target signup request does not exist                                     |
| `PERMISSION_DENIED`  | Caller lacks required approval/tenant scope                              |
| `INTERNAL_ERROR`     | Unexpected server-side failure                                           |

### Approval Idempotency Rules

- Same decision replay on an already terminal request must return success with `alreadyProcessed=true`.
- Conflicting decision replay on an already terminal request must return `INVALID_TRANSITION`.
- Approval log and downstream event production should happen only for the first terminal transition.

### Compatibility Rule

- Canonical v2 signup contract uses role-branch submit with `organizationSelectionMode='existing'`.
- Legacy `organizationId` alias for `hospitalId` remains accepted for compatibility.

## Onboarding Progress Contract (P3 Canonical)

This section defines the transport contract for the `onboarding-progress` server boundary.
It fixes request/response/error semantics for `get`, `update`, and `complete` without redefining persistence ownership or RLS policy.

Canonical domain source:

- `docs/migration/P3_ONBOARDING_STATE_MACHINE.md`

Persistence/RLS policy source:

- `P3-1.2 onboarding_progress persistence + RLS design`

### Contract Scope

- This section defines:
  - request and response envelopes for `get`, `update`, and `complete`
  - canonical step keys and progress DTO fields
  - admin-only auth boundary and organization-scope resolution responsibility
  - canonical error codes for frontend branching
- This section does not define:
  - storage table shape
  - RLS implementation details
  - guard insertion order
  - onboarding wizard copy or CTA behavior

### Edge Function Boundary (`onboarding-progress`)

- Client boundary is fixed to `supabase.functions.invoke('onboarding-progress')`.
- Direct browser reads/writes to `onboarding_progress` are not part of this contract.
- The caller must be authenticated.
- The server must resolve the caller's effective organization from auth context and approved admin membership.
- `organizationId` is never accepted from the client request body.
- Only `admin_active` callers in an effective organization scope may use this function.
- `user_active`, `super_active`, `admin_pending`, `admin_rejected`, `unauthenticated`, and `no_membership_or_inactive` are outside the allowed caller set.

### Shared Enums

| Name             | Values                                                                                                        |
| :--------------- | :------------------------------------------------------------------------------------------------------------ |
| `action`         | `get`, `update`, `complete`                                                                                   |
| `stepKey`        | `organization_info`, `employee_seed`, `schedule_request`                                                      |
| `transitionType` | `noop`, `advance`, `complete`                                                                                 |
| `error.code`     | `VALIDATION_ERROR`, `PERMISSION_DENIED`, `FORBIDDEN_STATE_TRANSITION`, `METHOD_NOT_ALLOWED`, `INTERNAL_ERROR` |

### Canonical Progress DTO

`progress` represents organization-scoped onboarding state for the caller's effective organization.

| Field                  | Type             | Required | Rules                                                                               |
| :--------------------- | :--------------- | :------- | :---------------------------------------------------------------------------------- |
| `organizationId`       | UUID             | Yes      | Effective organization scope resolved by server                                     |
| `currentStepKey`       | String \| `null` | Yes      | First incomplete step key in canonical order, or `null` when onboarding is complete |
| `completedStepKeys`    | Array<String>    | Yes      | Ordered subset of canonical step keys already complete                              |
| `isOnboardingComplete` | Boolean          | Yes      | `true` only when all three steps are complete                                       |
| `completedAt`          | String \| `null` | Yes      | ISO-8601 timestamp for terminal completion, otherwise `null`                        |

### Transition DTO

`transition` communicates the result of a mutating call so the frontend store/router can consume it without additional interpretation.

| Field                     | Type             | Required | Rules                                                                                            |
| :------------------------ | :--------------- | :------- | :----------------------------------------------------------------------------------------------- |
| `type`                    | String           | Yes      | `noop` \| `advance` \| `complete`                                                                |
| `requestedStepKey`        | String \| `null` | Yes      | Requested target step for `update`, fixed to `schedule_request` for `complete`, `null` for `get` |
| `previousCurrentStepKey`  | String \| `null` | Yes      | Previous `progress.currentStepKey` before mutation                                               |
| `resultingCurrentStepKey` | String \| `null` | Yes      | Resulting `progress.currentStepKey` after mutation                                               |
| `isOnboardingComplete`    | Boolean          | Yes      | Post-mutation completion state                                                                   |

### Request DTO (Action Union)

#### Action: `get`

| Field    | Type   | Required | Rules          |
| :------- | :----- | :------- | :------------- |
| `action` | String | Yes      | Fixed to `get` |

#### Action: `update`

| Field     | Type   | Required | Rules                                                        |
| :-------- | :----- | :------- | :----------------------------------------------------------- |
| `action`  | String | Yes      | Fixed to `update`                                            |
| `stepKey` | String | Yes      | `organization_info` \| `employee_seed` \| `schedule_request` |

`update` means "advance the canonical first-incomplete step to this requested step key" while preserving monotonic progress.
The server must reject backward movement and must not infer organization scope from the request body.

#### Action: `complete`

| Field    | Type   | Required | Rules               |
| :------- | :----- | :------- | :------------------ |
| `action` | String | Yes      | Fixed to `complete` |

`complete` is the terminal onboarding action and represents that the organization has crossed the final `schedule_request` completion boundary.

### Response Envelope

#### Success Envelope

```json
{
  "success": true,
  "data": {
    "action": "update",
    "progress": {
      "organizationId": "uuid",
      "currentStepKey": "employee_seed",
      "completedStepKeys": ["organization_info"],
      "isOnboardingComplete": false,
      "completedAt": null
    },
    "transition": {
      "type": "advance",
      "requestedStepKey": "employee_seed",
      "previousCurrentStepKey": "organization_info",
      "resultingCurrentStepKey": "employee_seed",
      "isOnboardingComplete": false
    }
  }
}
```

#### Success Example: `get`

```json
{
  "success": true,
  "data": {
    "action": "get",
    "progress": {
      "organizationId": "uuid",
      "currentStepKey": "schedule_request",
      "completedStepKeys": ["organization_info", "employee_seed"],
      "isOnboardingComplete": false,
      "completedAt": null
    },
    "transition": null
  }
}
```

#### Success Example: `complete`

```json
{
  "success": true,
  "data": {
    "action": "complete",
    "progress": {
      "organizationId": "uuid",
      "currentStepKey": null,
      "completedStepKeys": ["organization_info", "employee_seed", "schedule_request"],
      "isOnboardingComplete": true,
      "completedAt": "2026-03-12T09:00:00.000Z"
    },
    "transition": {
      "type": "complete",
      "requestedStepKey": "schedule_request",
      "previousCurrentStepKey": "schedule_request",
      "resultingCurrentStepKey": null,
      "isOnboardingComplete": true
    }
  }
}
```

#### Error Envelope

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN_STATE_TRANSITION",
    "message": "Onboarding step can only stay the same or move forward.",
    "details": {
      "requestedStepKey": "organization_info",
      "currentStepKey": "employee_seed"
    }
  }
}
```

Clients must branch by `error.code`, not by free-form message text.

### Canonical Error Code Contract (`onboarding-progress`)

| Code                         | Meaning                                                                              | Typical Operation   |
| :--------------------------- | :----------------------------------------------------------------------------------- | :------------------ |
| `VALIDATION_ERROR`           | Payload is invalid or required action fields are missing                             | get/update/complete |
| `PERMISSION_DENIED`          | Caller is unauthenticated, not `admin_active`, or lacks effective organization scope | get/update/complete |
| `FORBIDDEN_STATE_TRANSITION` | Requested update moves backward or attempts to mutate terminal progress incorrectly  | update              |
| `METHOD_NOT_ALLOWED`         | Request used an unsupported HTTP method                                              | transport           |
| `INTERNAL_ERROR`             | Unexpected server-side failure                                                       | all                 |

### State Interpretation Rules

- Canonical step order is fixed:
  1. `organization_info`
  2. `employee_seed`
  3. `schedule_request`
- `currentStepKey` always means the first incomplete step in that order.
- `isOnboardingComplete=true` requires all three step keys to be complete.
- When onboarding is complete:
  - `currentStepKey=null`
  - `completedStepKeys` must contain all three canonical step keys in order
- `update` may return:
  - `transition.type='noop'` when the requested `stepKey` already matches `currentStepKey`
  - `transition.type='advance'` when the requested `stepKey` moves progress forward
- `complete` may return:
  - `transition.type='complete'` on the first terminal transition
  - `transition.type='noop'` on idempotent replay after onboarding is already complete

### Auth Boundary Checklist

- The server resolves effective organization scope from authenticated admin membership.
- The client does not send `organizationId` or role claims in the request body.
- Transport contract remains organization-scoped even if persistence internals change in `P3-1.2`.
- The function response is safe for frontend store/router consumption without extra state-name translation.

---

## Dashboard Analytics Contract (P9 Canonical)

This section defines the read-only dashboard analytics boundary for `P9-1.3`.

Canonical sources:

- `docs/specs/p9/P9-1.1-dashboard-metrics-filter-spec.md`
- `src/types/dashboard.ts`

### Contract Scope

- This section defines:
  - the client-to-Supabase boundary for dashboard metrics
  - request/response contracts for admin and employee dashboards
  - RBAC and scope-resolution rules for organization and employee access
  - empty/dependency states that must be represented without fabricating zero-valued metrics
- This section does not define:
  - the final SQL body of the RPC functions
  - chart library or page layout concerns
  - export/download behavior (`P9-3.x`)

### Aggregation Boundary Decision

The canonical dashboard metrics boundary is **Supabase RPC**. Frontend callers must use `supabase.rpc(...)` through a dedicated API wrapper layer.

Decision summary:

- `RPC (chosen)`: primary path for dashboard reads because the metrics are multi-table aggregates over `schedules`, `schedule_assignments`, `employees`, `shifts`, and optional site/rank scope. The database is the correct place to compute fairness counts and enforce tenant scope close to the data.
- `Edge Function (not primary)`: not used for the main dashboard read path because it adds an extra network hop and duplicates auth/scope checks that are better enforced in SQL/RLS-adjacent logic. Edge Functions remain appropriate for export or long-running report generation later.
- `Direct client aggregation (forbidden)`: the browser must not fetch raw assignment sets and recompute fairness metrics locally. That would duplicate business formulas, enlarge payloads, and weaken RBAC guarantees.

### Client Boundary

The public frontend boundary is:

```typescript
getAdminDashboardStats(input: AdminDashboardStatsRequest): Promise<AdminDashboardStatsResponse>
getEmployeeDashboardStats(input: EmployeeDashboardStatsRequest): Promise<EmployeeDashboardStatsResponse>
```

These contracts are defined in `src/types/dashboard.ts`.

Implementation rule:

- Optional UI filters may be omitted at the TypeScript/browser contract.
- The API layer normalizes omitted optional filters to nullable RPC arguments (`null`) when calling `supabase.rpc(...)`.
- Sentinel strings such as `'all'` or `'none'` must not cross the API boundary.

### RPC Function Contract

#### Admin dashboard RPC

Frontend wrapper target:

```typescript
supabase.rpc('get_admin_dashboard_stats', {
  p_period_month: input.filters.periodMonth,
  p_site_id: input.filters.siteId ?? null,
  p_rank_id: input.filters.rankId ?? null,
  p_grouping: input.scope.grouping,
  p_organization_id: input.scope.organizationId ?? null,
});
```

Rules:

- `p_period_month` is required and uses `YYYY-MM`.
- `p_grouping` is required and must be `'employee'` or `'site'`.
- `p_organization_id` is:
  - required for `super_active`
  - omitted / `null` for `admin_active`, where the server resolves the caller's effective organization
- `p_site_id` and `p_rank_id` are nullable optional filters.
- The RPC must reject cross-organization access. `admin_active` cannot override organization scope.
- The RPC must return an `empty` state for months without persisted schedule data instead of returning fabricated zeroed summary values.

#### Employee dashboard RPC

Frontend wrapper target:

```typescript
supabase.rpc('get_employee_dashboard_stats', {
  p_period_month: input.filters.periodMonth,
  p_site_id: input.filters.siteId ?? null,
  p_rank_id: input.filters.rankId ?? null,
});
```

Rules:

- The public client contract intentionally does **not** accept an arbitrary `employeeId`.
- The RPC resolves the caller's employee scope from `auth.uid()` and the linked employee row (`employees.user_id`) inside the database boundary.
- If the signed-in account has no linked employee row for the effective scope, the RPC returns a `dependency` state with reason `employee_mapping_required`.
- `admin_active` and `super_active` visiting `/dashboard/employee` still use the same employee-perspective contract; widening this API into an arbitrary employee-inspection endpoint is out of scope for `P9-1.3`.

### TypeScript Contract

The exact TypeScript contract lives in `src/types/dashboard.ts`.

Key request interfaces:

```typescript
export interface DashboardFilters {
  periodMonth: string;
  siteId?: string | null;
  rankId?: string | null;
}

export interface AdminDashboardScopeSelector {
  organizationId?: string | null;
  grouping: 'employee' | 'site';
}

export interface AdminDashboardStatsRequest {
  filters: DashboardFilters;
  scope: AdminDashboardScopeSelector;
}

export interface EmployeeDashboardStatsRequest {
  filters: DashboardFilters;
}
```

Key response states:

- `ready`: metrics and data rows are available
- `empty`: there is no persisted schedule data for the selected month/scope
- `dependency`: a required non-permission dependency is missing, currently `employee_mapping_required` only

### Response Shape Semantics

#### Admin dashboard response

`AdminDashboardStatsResponse` returns:

- `dashboardScope='admin'`
- `filters`: resolved filter values with explicit `null` for unselected optional filters
- `resolvedScope.organizationId`: the organization actually used after RBAC resolution
- `resolvedScope.grouping`: `'employee'` or `'site'`
- `summary`: fairness summary metrics for the current grouping set
- `rows`: grouped metric rows

Summary metrics:

- `nightShiftAvg`, `nightShiftMin`, `nightShiftMax`, `nightShiftGap`
- `weekendWorkAvg`, `weekendWorkMin`, `weekendWorkMax`, `weekendWorkGap`
- `groupCount`: number of included grouped rows after all filters

Grouped row semantics:

- `grouping='employee'`:
  - one row per included employee
  - each row exposes `nightShiftCount` and `weekendWorkCount`
  - row metadata may include `siteId`, `siteName`, `rankId`, `rankName`
- `grouping='site'`:
  - one row per included site
  - each row exposes `nightShiftCount` and `weekendWorkCount`

#### Employee dashboard response

`EmployeeDashboardStatsResponse` returns:

- `dashboardScope='employee'`
- `filters`: resolved filter values with explicit `null` for unselected optional filters
- `resolvedScope.organizationId`: effective organization scope when available
- `resolvedScope.employeeId`: resolved employee id when available
- `summary`:
  - `myNightShiftCount`
  - `myWeekendWorkCount`
  - `teamNightShiftAvg`
  - `teamWeekendWorkAvg`
  - `teamMemberCount`
- `calendarAssignments`: persisted daily assignments for the month, each including:
  - `date`
  - `shiftCode`
  - `shiftName`
  - optional `siteId` / `siteName`

### Metric Evaluation Rules

All dashboard RPC implementations must inherit the metric semantics from `P9-1.1` exactly:

- Source data is persisted schedule assignment data only.
- `N` counts as a night shift.
- Weekend work means Saturday/Sunday assignments whose shift code is one of `D`, `E`, `N`.
- `O` is excluded from work-count metrics.
- The selected month is always the evaluation window.
- Hidden or unsupported filters must be omitted at the client contract, not represented by sentinel strings.

Implementation note:

- Dashboard queries should operate on finalized persisted schedule states (`complete`, `changed`) rather than draft/running states so the dashboard does not expose in-progress solver output.

### RBAC and Scope Rules

- `super_active`
  - may call admin dashboard RPC for any selected organization
  - must provide `organizationId`; implicit all-organization aggregation is forbidden
  - may call employee dashboard RPC only for the signed-in user's own employee mapping
- `admin_active`
  - may call admin dashboard RPC only for the effective membership organization
  - organization override attempts must be rejected
  - may call employee dashboard RPC only for the signed-in user's own employee mapping
- `user_active`
  - may not call admin dashboard RPC
  - may call employee dashboard RPC only for the signed-in user's own employee mapping

### Error and State Contract

Known product states must be modeled in the response union where possible rather than being surfaced as generic transport failures:

- `empty` + `reason='no_persisted_schedule'`
- `dependency` + `reason='employee_mapping_required'`

Canonical RPC/business error codes:

| Code                                    | Meaning                                                                        |
| :-------------------------------------- | :----------------------------------------------------------------------------- |
| `DASHBOARD_ACCESS_DENIED`               | Caller role cannot access the requested dashboard scope                        |
| `DASHBOARD_ORGANIZATION_SCOPE_REQUIRED` | `super_active` attempted admin dashboard access without selecting organization |
| `DASHBOARD_INVALID_PERIOD_MONTH`        | `periodMonth` failed `YYYY-MM` validation                                      |
| `DASHBOARD_UNSUPPORTED_RANK_SCOPE`      | `rankId` was provided before employee-rank mapping is supported                |
| `DASHBOARD_INTERNAL_ERROR`              | Unexpected server-side failure                                                 |

### Implementation Checklist

- Frontend reads must go through RPC wrappers, not ad hoc table joins in views/stores.
- The API layer normalizes omitted optional filters to nullable RPC args.
- The SQL layer enforces auth-derived organization/employee scope.
- Super admin requests must never default to implicit all-org aggregation.
- Empty/dependency states must remain distinguishable from numeric zero metrics.
