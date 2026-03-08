# P2 Access / Approval Policy (Canonical)

## 1. Scope

This document fixes the decision-complete policy for:

- `P2-2.2` route guard sequence and redirect rules
- `P2-2.3` pending/rejected access-state UI spec
- `P2-2.4` approval-state routing test scenarios
- `P2-3.1` approval workflow policy
- `P2-3.2` approval-decision API contract
- `P2-3.3` superuser approval queue UI boundary/spec
- `P2-3.4` approval result event producer policy
- `P2-3.5` integrated signup/approval E2E scenarios

Out of scope:

- P5 organization/site/master field redesign
- notification channel/template policy (owned by P8)

## 2. Route Guard Policy

Guard order is fixed:

1. session restore
2. auth-context load and `accessState` resolution
3. status blocking redirect
4. route-level `allowedAccessStates` check
5. schedule step progression check (`stepProgressGuard`)

Public route exceptions:

- `/login`
- `/signup`
- `/access/pending`
- `/access/rejected`

Access-state redirects:

- `admin_pending` -> `/access/pending`
- `admin_rejected` -> `/access/rejected`
- `admin_active` / `user_active` / `super_active` -> normal app entry
- `no_membership_or_inactive` -> `/login`

Compatibility fallback:

- If auth-context rows are missing during migration, legacy authenticated users are mapped to active context to avoid accidental lockout.

## 3. AccessState UI Spec

Single page component with state-mode split:

- pending mode
  - title: `승인 대기`
  - message: admin signup request is received; wait for superuser decision
  - CTA: `로그아웃`
- rejected mode
  - title: `승인 반려`
  - message: rejected request cannot be reactivated; submit a new signup request
  - optional `rejectionReason` display when present
  - CTA: `로그아웃`

Refresh policy:

- No auto polling on screen.
- state re-evaluation happens on browser refresh or re-login.

Exclusions:

- User invite-code signup errors remain inline in `Signup.vue`, not AccessState screen.

## 4. Approval Workflow / API / Queue

### 4.1 Workflow Policy

- Approval queue target is only `admin` signup requests.
- Decision actor is fixed to `super` only.
- User invite signup is out of queue scope and remains immediate-approval path.

### 4.2 `approval-decision` API Contract

Request DTO:

- `signupRequestId: string`
- `decision: 'approve' | 'reject'`
- `reviewNote?: string`

Success DTO:

- `signupRequestId`
- `decision`
- `requestStatus` (`approved` | `rejected`)
- `membershipStatus` (`approved` | `none`)
- `organizationId`
- `membershipId`
- `decidedAt`
- `alreadyProcessed` (idempotent replay indicator)

Error codes:

- `REQUEST_NOT_FOUND`
- `INVALID_TRANSITION`
- `PERMISSION_DENIED`
- `VALIDATION_ERROR`
- `INTERNAL_ERROR`

Idempotency rules:

- same terminal replay -> `success=true`, `alreadyProcessed=true`
- conflicting replay (terminal state mismatch) -> `INVALID_TRANSITION`

State write rules:

- approve:
  - `signup_requests.pending -> approved`
  - `organization_memberships(role='admin') -> approved`
  - `approval_logs(action='approve')`
- reject:
  - `signup_requests.pending -> rejected`
  - no approved membership creation
  - `approval_logs(action='reject')`

### 4.3 Superuser Approval Queue UI Boundary

Queue surface is a dedicated superuser page (not P4 account management tab).

Minimum list fields:

- requester email
- requester name
- organization
- requested role
- status
- createdAt

Minimum filters:

- status
- organization
- keyword (email/name)

Detail panel includes:

- signup metadata (`workType`, `shiftType`, `requestedSiteName`, `requestedSkillSummary`, `requestedRankCode`, `requestedCredit`)
- review note input
- approve/reject confirmation

Boundary rule:

- P2 queue handles signup approval queue only.
- P4 account management handles post-approval account operations.

## 5. Approval Event Producer Policy (P2-3.4)

Event types:

- `signup_approved`
- `signup_rejected`

Minimum payload:

- `signupRequestId`
- `decision`
- `actorUserId`
- `targetUserId`
- `organizationId`
- `decidedAt`

Idempotency key:

- `approval-decision:{signupRequestId}:{decision}`

Producer-only boundary:

- P2 defines generation timing and payload.
- P8 owns channels/templates/dispatch policy.

## 6. Test Scenario Baseline

Routing matrix minimum:

- unauthenticated protected route -> `/login`
- `admin_pending` protected route/direct URL/session restore -> `/access/pending`
- `admin_rejected` protected route/direct URL/session restore -> `/access/rejected`
- active states accessing `/access/*` -> redirected to normal entry path

Integrated E2E minimum:

- admin signup -> pending -> blocked login/access-state page
- super approve -> admin login allowed
- super reject -> admin blocked with rejected page/reason
- user invite signup -> active -> login allowed

This baseline is reusable for:

- `P3-1.1` onboarding state machine and guard insertion
- `P4-1.1` account management list/filter requirements
- `P6-1.1` employee-management permission scope
