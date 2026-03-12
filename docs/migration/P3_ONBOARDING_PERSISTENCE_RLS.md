# P3 Onboarding Progress Persistence and RLS Design

This document is the canonical deliverable for task `P3-1.2`.
It fixes the persistence ownership, recovery rule, and target RLS boundary for `onboarding_progress` without redefining the API transport contract.

Upstream source of truth:

- `docs/migration/P3_ONBOARDING_STATE_MACHINE.md`

Reference sources:

- `docs/migration/P1-2.2_RLS_POLICY_MATRIX.md`
- `docs/verification/test-validation-guide.md`
- `migrations/007_service_transition_rbac_multitenant.sql`
- `migrations/008_rls_progressive_rollout.sql`

## 1. Scope

This document defines:

- the canonical ownership model of `onboarding_progress`
- the row shape and persistence boundary required by the onboarding domain
- who may read, initialize, update, and complete onboarding progress
- how refresh, relogin, and legacy-row recovery must resolve a canonical row
- the target RLS posture that closes the current disabled-RLS gap

This document does not define:

- HTTP request or response payloads
- edge function transport envelopes
- frontend cache/store implementation
- onboarding page copy or UI flow

Those belong to later tasks and must consume this document rather than reinterpret it.

## 2. Current Drift That Must Be Resolved

`P3-1.1` fixed onboarding completion ownership as organization-scoped, but the current table created in `migrations/007_service_transition_rbac_multitenant.sql` still reflects a user-scoped draft model:

- uniqueness is `UNIQUE (organization_id, user_id)`
- progress is stored as `current_step INTEGER`
- `user_id` behaves like an owner key instead of an audit key
- RLS is disabled, so `anon` and `authenticated` can currently read and mutate rows

That schema is not a valid long-term contract for P3.
The target model below takes precedence over the current table shape.

## 3. Canonical Ownership Model

### 3.1 Domain Owner

`onboarding_progress` is owned by the organization, not by an individual admin.

Implications:

- there is exactly one canonical onboarding state per `organization_id`
- onboarding completion by one admin completes onboarding for the whole organization
- `user_id` must not be used as the ownership or isolation boundary
- the authenticated admin is an actor on the row, not the row owner

### 3.2 Actor Model

The only product actor allowed to mutate onboarding progress is an `admin_active` user for the same organization:

- authenticated
- `profiles.account_status = 'active'`
- approved membership exists for the same `organization_id`
- membership role is `admin`

The following actors are not onboarding actors:

- `anon`
- `user_active`
- `admin_pending`
- `admin_rejected`
- `no_membership_or_inactive`
- `super_active` through the normal onboarding route

If support or migration work needs broader access, it must use `service_role` or an offline migration path, not a widened client-side onboarding policy.

## 4. Target Persistence Model

### 4.1 Canonical Row Cardinality

Target invariant:

- one canonical row per organization
- canonical uniqueness key: `UNIQUE (organization_id)`

The current `(organization_id, user_id)` uniqueness is legacy-only and must not survive the final migration state.

### 4.2 Canonical Fields

The persistence layer must store organization-scoped state using the P3-1.1 step vocabulary.
The recommended target row shape is:

| Field | Meaning | Notes |
| :--- | :--- | :--- |
| `organization_id` | canonical owner key | required, unique |
| `current_step_key` | first incomplete step key | enum limited to `organization_info`, `employee_seed`, `schedule_request` or `null` when complete |
| `organization_info_confirmed_at` | explicit completion timestamp for Step 1 | Step 1 needs a persisted confirmation event |
| `organization_info_confirmed_by` | admin who confirmed Step 1 | audit only |
| `completed_at` | organization onboarding completion timestamp | set only when all three steps are complete |
| `completed_by` | admin who triggered the final completion transition | audit only |
| `last_actor_user_id` | last admin that changed the row | audit only |
| `created_at` / `updated_at` | normal audit timestamps | required |

Notes:

- `current_step INTEGER` is a legacy transport/storage convenience and must not be treated as the canonical domain representation.
- If an incremental rollout temporarily keeps `current_step`, it must be treated as a derived compatibility field mapped from the canonical step keys.
- `user_id` should be replaced by explicit audit fields such as `organization_info_confirmed_by`, `completed_by`, or `last_actor_user_id`.

### 4.3 Step Authority Boundary

`onboarding_progress` is not allowed to invent completion that the underlying domain does not support.

Step authority is fixed as follows:

1. `organization_info`
   - completion requires both:
     - the minimum organization-side data required by `P3-1.1`
     - an explicit persisted confirmation event on `onboarding_progress`
2. `employee_seed`
   - completion is derived from the existence of at least one schedulable employee row for the organization
   - `onboarding_progress` may cache the current step position, but it must not mark Step 2 complete if the employee readiness condition is false
3. `schedule_request`
   - completion is derived from the first persisted scheduling workflow start for the organization
   - `onboarding_progress` must not mark Step 3 complete if no qualifying schedule/planning-start record exists

As a result, the row is a canonical onboarding state record, but not a free-form wizard cursor that may move independently from domain facts.

## 5. Read, Write, and Completion Boundary

### 5.1 Read Rules

`SELECT` is allowed only for the active approved admin scope of the target organization.

The caller must first resolve the effective organization using the access model fixed by P2/P3.
Only then may it read that organization's onboarding row.

The read result is organization-scoped:

- every admin in the same approved organization reads the same canonical onboarding state
- no user-scoped completion flag may override the organization-scoped result

### 5.2 Initialize Rules

Row initialization is allowed only when:

- the caller is `admin_active` for the target organization
- no canonical organization row exists yet

Initialization must create the organization row, not a per-user row.

Default initial state:

- `current_step_key = 'organization_info'`
- `organization_info_confirmed_at = null`
- `completed_at = null`

### 5.3 Update Rules

Allowed mutation scope:

- persist Step 1 confirmation audit fields
- refresh derived `current_step_key`
- update `last_actor_user_id`

Disallowed mutation scope:

- backdating completion without the required domain facts
- rewinding a completed organization back to incomplete from the normal product flow
- creating a second row for another admin in the same organization
- marking Step 2 or Step 3 complete by UI intent alone

### 5.4 Complete Rules

`complete` is allowed only when all of the following are true:

- caller is `admin_active` for the target organization
- Step 1 organization confirmation exists
- Step 2 employee readiness condition is true
- Step 3 first scheduling workflow start exists
- the canonical row is not already complete

Completion writes:

- `current_step_key = null`
- `completed_at = now()`
- `completed_by = auth.uid()`
- `last_actor_user_id = auth.uid()`

Once complete, normal product APIs must treat onboarding as immutable.
Support correction, if ever required, is an explicit administrative remediation path and not part of the onboarding client contract.

## 6. Canonical Recovery Rules

### 6.1 Runtime Recovery on Refresh or Relogin

Refresh, relogin, and direct URL access must all resolve onboarding state in the same order:

1. resolve the caller's access state
2. resolve the caller's effective organization
3. read that organization's canonical onboarding row
4. if the row does not exist, initialize the organization row in the default state
5. re-evaluate derived step completion against the authoritative domain tables
6. return one organization-scoped result

The recovery path must never scan for "the current user's onboarding row" as the primary read rule.

### 6.2 Legacy Row Collapse Rule

Because the current schema allows multiple rows per organization, the migration path must define a deterministic collapse rule before the final unique-by-organization state is enforced.

For each `organization_id`, canonical recovery must choose or synthesize the target row using this precedence:

1. if any row has `completed_at is not null`, the organization is complete
2. if multiple rows are completed, keep the earliest `completed_at` as the canonical completion timestamp and the corresponding actor as `completed_by`
3. if no row is completed, select the row with the highest progress
4. if progress ties, select the row with the latest `updated_at`
5. if `updated_at` also ties, select the lexicographically smallest `user_id` as the deterministic final tie-breaker

After collapse:

- only one canonical organization row may remain
- other legacy rows must be removed or ignored by all product code
- later API/store work must not depend on the existence of per-user rows

### 6.3 Canonical Step Recalculation

Recovery must recalculate the step in canonical order:

1. if Step 1 is not satisfied, `current_step_key = 'organization_info'`
2. else if Step 2 is not satisfied, `current_step_key = 'employee_seed'`
3. else if Step 3 is not satisfied, `current_step_key = 'schedule_request'`
4. else onboarding is complete and `current_step_key = null`

This recalculation rule is more authoritative than any stale cached cursor stored on the row.

## 7. Target RLS Posture

### 7.1 Required Baseline Changes

The final persistence rollout must:

- enable RLS on `public.onboarding_progress`
- remove broad table grants that allow unrestricted `anon` or `authenticated` access
- add explicit policies for the approved admin scope only
- keep `service_role` as the migration/support escape hatch outside the product contract

### 7.2 Target Policy Semantics

Required product-facing policy behavior:

- `SELECT`
  - allow only authenticated users who have approved admin membership for the target `organization_id`
  - deny all other roles and statuses
- `INSERT`
  - allow only authenticated approved admins of the same `organization_id`
  - enforce organization-scoped uniqueness
- `UPDATE`
  - allow only authenticated approved admins of the same `organization_id`
  - enforce that audit actor fields reflect `auth.uid()`
  - deny transitions that violate the state machine, especially backtracking after completion
- `DELETE`
  - deny to normal authenticated users
  - reserve for migration/service-role cleanup only

### 7.3 Isolation Rule

RLS isolation is organization-based, not user-based.

Policy checks must anchor on:

- target `organization_id`
- caller account status
- approved admin membership for that organization

Policy checks must not anchor on:

- `user_id = auth.uid()` as the ownership rule
- any per-user draft assumption

## 8. Persistence Boundary vs API Boundary

This task fixes the persistence contract only.

The follow-up API contract task may define:

- action names
- request and response envelopes
- field serialization format
- canonical error codes

The follow-up API contract task may not redefine:

- ownership (`organization-scoped`)
- canonical uniqueness (`one row per organization`)
- actor eligibility (`admin_active` only)
- runtime recovery order
- RLS isolation anchor (`organization_id`, not `user_id`)
- derived-step authority rules

If the API shape requires compatibility with the current table or edge function, that compatibility layer must adapt to this document instead of changing it.

## 9. Implementation Handoff

The next implementation or migration task should treat the following as mandatory:

1. replace the user-owned uniqueness model with an organization-owned uniqueness model
2. migrate away from integer-only step identity toward the P3-1.1 step keys
3. convert `user_id` from ownership semantics to audit semantics
4. enable and enforce organization-scoped admin-only RLS
5. make recovery deterministic for legacy duplicate rows before tightening the unique key

When those five items are satisfied, `onboarding_progress` can be interpreted independently from the later API contract and without ambiguity in refresh/relogin/guard flows.
