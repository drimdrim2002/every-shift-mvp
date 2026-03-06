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

| Field          | Type   | Required | Description                                                                  |
| :------------- | :----- | :------- | :--------------------------------------------------------------------------- |
| `organization` | Object | Yes      | Organization details and schedule parameters.                                |
| `employees`    | Array  | Yes      | List of employees.                                                           |
| `history`      | Array  | No       | List of past assignments before `firstDraftDate` (Off/O assignments excluded). |
| `undesirable`  | Array  | No       | List of employee off requests on or after `firstDraftDate`.                  |
| `requirements` | Array  | Yes      | Staffing requirements for each shift per day.                                |

---

### 1. Organization (`organization`)

Defines the context and the time range for the schedule.

| Field                | Type    | Format       | Description                                                                   |
| :------------------- | :------ | :----------- | :---------------------------------------------------------------------------- |
| `id`                 | String  | UUID         | Unique identifier for the organization.                                       |
| `name`               | String  | -            | Name of the organization (e.g., "Severance Hospital").                        |
| `type`               | String  | -            | Type of organization (e.g., "hospital").                                      |
| `shifts`             | Array   | -            | List of planning shift definitions (D/E/N only).                             |
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

| Field         | Type    | Format       | Description                                                            |
| :------------ | :------ | :----------- | :--------------------------------------------------------------------- |
| `employee_id` | String  | UUID         | ID of the employee.                                                    |
| `shift_id`    | String  | UUID         | ID of the assigned shift (`D/E/N`, Off/O is excluded).                |
| `date`        | String  | `yyyy-MM-dd` | Date of the assignment (`date < firstDraftDate`).                     |
| `is_locked`   | Boolean | -            | Always `true` (hard constraint).                                       |

### 4. Undesirable (`undesirable`)

Represents future off requests/undesirable days.

| Field         | Type    | Format       | Description                                                |
| :------------ | :------ | :----------- | :--------------------------------------------------------- |
| `employee_id` | String  | UUID         | ID of the employee.                                        |
| `date`        | String  | `yyyy-MM-dd` | Requested date (`date >= firstDraftDate`).                 |
| `is_locked`   | Boolean | -            | Always `false` (soft constraint).                          |

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

| Name | Values |
| :--- | :--- |
| `requestedRole` | `admin`, `user` |
| `organizationSelectionMode` | `existing` |
| `nextState` | `pending_approval`, `active` |
| `signupRequestStatus` | `pending`, `approved`, `rejected`, `expired`, `withdrawn` |
| `membershipStatus` | `pending`, `approved`, `rejected`, `withdrawn`, `none` |

`membershipStatus='none'` means no membership row was created/updated in that operation.

### Edge Function Boundary (`signup-submit`)

- Client boundary is fixed to `supabase.functions.invoke('signup-submit')`.
- Production direct-table fallback is forbidden.
- Server must normalize role input and enforce role-specific required fields.
- Server responses must follow the unified envelope in this section.

### Request DTO (Basic Contract)

#### Common fields

| Field | Type | Required | Rules |
| :--- | :--- | :--- | :--- |
| `email` | String | Yes | Valid email format |
| `password` | String | Yes | Policy-validated secret |
| `name` | String | Yes | Non-empty |
| `role` | String | Yes | `admin` or `user` |
| `requestedRole` | String | No | Legacy alias for `role` (deprecated, accepted for compatibility) |

#### Role-specific fields

| Field | Type | Required | Rules |
| :--- | :--- | :--- | :--- |
| `hospitalId` | UUID | Conditional | Required when `role='admin'` |
| `hospitalName` | String | Conditional | Required when `role='admin'`, selected hospital display name |
| `hospitalSource` | String | Conditional | Required when `role='admin'`, must be `data.go.kr` |
| `organizationId` | UUID | No | Legacy alias for `hospitalId` (deprecated, accepted for compatibility) |
| `inviteCode` | String | Conditional | Required when `role='user'` |
| `organizationSelectionMode` | String | No | Canonical value is `existing` |
| `workType` | String | No | Optional profile metadata |
| `shiftType` | String | No | Optional profile metadata |
| `requestedSiteName` | String | No | Optional profile metadata |
| `requestedSkillSummary` | String | No | Optional profile metadata |
| `requestedRankCode` | String | No | Optional profile metadata |
| `requestedCredit` | Number | No | Optional profile metadata |

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
- State classification for validation:
  - Active: `revoked_at IS NULL` AND `used_count=0` AND `expires_at > NOW()`
  - Expired: `expires_at <= NOW()`
  - Used: `used_count=1`
  - Revoked: `revoked_at IS NOT NULL`
- Invite issuance/revocation is restricted to super/admin organization scope via RLS policy (`can_manage_invite_codes`).

### Contract-Only Scaffold Note

- During contract-only rollout, `signup-submit` may return:
  - `501 INTERNAL_ERROR` with `error.details.stage='contract_only_scaffold'` when persistence is disabled
  - `DUPLICATE_REQUEST` envelope for duplicate-request contract verification
- Frontend must branch by canonical `error.code` and treat detail values as supplementary metadata.

### Success Response Envelope

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

| Code | Meaning | Typical Operation |
| :--- | :--- | :--- |
| `INVALID_ROLE` | Role is missing or not one of `admin` / `user` | signup-submit |
| `INVALID_INVITE_CODE` | Invite is missing/invalid/expired/used/revoked/role-mismatched | signup-submit (`role='user'`) |
| `HOSPITAL_REQUIRED` | Admin hospital selection is missing | signup-submit (`role='admin'`) |
| `DUPLICATE_REQUEST` | Duplicate pending signup request exists in same scope | signup-submit |
| `VALIDATION_ERROR` | Generic request schema validation failure | signup-submit |
| `PERMISSION_DENIED` | Caller lacks required scope/permission | signup-submit/approval |
| `INTERNAL_ERROR` | Unexpected server-side failure | all |

#### Legacy/Error Detail Mapping

The server may include legacy detail reasons under `error.details.reason` for migration compatibility.

| Legacy/Detail Code | Canonical Code |
| :--- | :--- |
| `DUPLICATE_PENDING_REQUEST` | `DUPLICATE_REQUEST` |
| `ORGANIZATION_REQUIRED` | `HOSPITAL_REQUIRED` |
| `INVITE_NOT_FOUND` | `INVALID_INVITE_CODE` |
| `INVITE_EXPIRED` | `INVALID_INVITE_CODE` |
| `INVITE_ALREADY_USED` | `INVALID_INVITE_CODE` |
| `INVITE_REVOKED` | `INVALID_INVITE_CODE` |
| `INVITE_ROLE_MISMATCH` | `INVALID_INVITE_CODE` |

## Hospital Search Contract (P2 Canonical)

This section defines the contract for hospital lookup used by admin signup.

### Edge Function Boundary (`hospital-search`)

- Client boundary is fixed to `supabase.functions.invoke('hospital-search')`.
- Client must not call `data.go.kr` directly.
- `HOSPITAL_API_BASE_URL` and `HOSPITAL_API_KEY` must be used only in server environment variables.

### Request DTO

| Field | Type | Required | Rules |
| :--- | :--- | :--- | :--- |
| `keyword` | String | Yes | Trimmed length must be `2..50` |
| `pageNo` | Number | No | Positive integer, default `1` |
| `numOfRows` | Number | No | Positive integer, default `20`, max `50` |

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

| Code | Meaning |
| :--- | :--- |
| `VALIDATION_ERROR` | Request payload validation failed |
| `UPSTREAM_TIMEOUT` | data.go.kr request timed out |
| `UPSTREAM_RATE_LIMIT` | data.go.kr or edge-level rate limit was hit |
| `UPSTREAM_ERROR` | data.go.kr returned non-success or invalid payload |
| `INTERNAL_ERROR` | Unexpected server-side failure |

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
- Decision on pending admin signup request.

#### Request Body

| Field | Type | Required | Rules |
| :--- | :--- | :--- | :--- |
| `signupRequestId` | UUID | Yes | Pending admin request ID |
| `decision` | String | Yes | `approve` or `reject` |
| `reviewNote` | String | No | Optional reason/context |

#### State Write Expectation

- `decision='approve'`:
  - `signup_requests.pending -> approved`
  - `organization_memberships` upsert to `approved` with `role='admin'`
- `decision='reject'`:
  - `signup_requests.pending -> rejected`
  - no approved membership creation

#### Approval-Specific Error Codes

| Code | Meaning |
| :--- | :--- |
| `INVALID_TRANSITION` | Request state transition is forbidden (already terminal or incompatible) |
| `REQUEST_NOT_FOUND` | Target signup request does not exist |
| `PERMISSION_DENIED` | Caller lacks required approval/tenant scope |
| `INTERNAL_ERROR` | Unexpected server-side failure |

### Compatibility Rule

- Canonical v2 signup contract uses role-branch submit with `organizationSelectionMode='existing'`.
- Legacy `organizationId` alias for `hospitalId` remains accepted for compatibility.
