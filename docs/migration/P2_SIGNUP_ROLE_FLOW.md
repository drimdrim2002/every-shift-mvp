# P2 Signup Role Flow Canonical State Model

## 1. Purpose and Canonical Scope

This document is the canonical source of truth for P2 signup state semantics.
All downstream tasks (P2-1.3, P2-1.7, P2-3.x) must reference this document and must not redefine state behavior independently.

Scope covered here:
- Dual-path onboarding:
  - Admin signup (approval required)
  - User signup by invite code (instant approval)
- State transitions for:
  - `signup_requests`
  - `organization_memberships`
- Audit policy and invariants
- Forbidden transitions

Out of scope:
- UI rendering details
- Edge Function transport-level implementation
- Notification template details

## 2. Core Policy Decisions

1. Unified audit policy:
   - Both admin and user paths must persist a `signup_requests` row.
2. Admin path:
   - Signup submission creates `signup_requests(status='pending', requested_role='admin')`.
   - Membership approval is applied only at approval decision time.
3. User invite path:
   - Invite code validation + invite consumption + approved membership write must occur in one transaction.
   - The same transaction also persists `signup_requests(status='approved', requested_role='user')` for audit consistency.
4. Expiration handling:
   - `signup_requests.status='expired'` is a terminal request state.
5. Access gate:
   - Only `organization_memberships.status='approved'` grants tenant data access (aligned with RBAC/RLS design).

## 3. State Definitions

### 3.1 `signup_requests.status`

- `pending`: Submitted and waiting for decision.
- `approved`: Approved by reviewer or auto-approved via valid invite flow.
- `rejected`: Explicitly rejected by reviewer.
- `expired`: Timed out by policy/system scheduler.
- `withdrawn`: Cancelled by requester before terminal system handling.

Terminal request states:
- `approved`, `rejected`, `expired`, `withdrawn`

### 3.2 `organization_memberships.status`

- `pending`: Reserved but not yet approved (not used for user invite instant approval path).
- `approved`: Membership is active for access control.
- `rejected`: Explicitly rejected in membership review context.
- `withdrawn`: Membership removed by workflow/lifecycle action.

## 4. Transition Matrix: `signup_requests`

| Event | Actor | Preconditions | DB Writes | Postconditions |
| :--- | :--- | :--- | :--- | :--- |
| `admin_submit` | requester | requester authenticated, dedupe rule passes | `INSERT signup_requests(requested_role='admin', status='pending', requester_user_id, organization_id, ...)` | exactly one new pending admin request exists |
| `admin_approve` | super/admin reviewer | target request is `pending` and role is `admin` | `UPDATE signup_requests SET status='approved', reviewed_by, reviewed_at` | request becomes terminal `approved` |
| `admin_reject` | super/admin reviewer | target request is `pending` and role is `admin` | `UPDATE signup_requests SET status='rejected', reviewed_by, reviewed_at, review_note` | request becomes terminal `rejected` |
| `admin_withdraw` | requester | request is own request and status=`pending` | `UPDATE signup_requests SET status='withdrawn'` | request becomes terminal `withdrawn` |
| `admin_expire` | system job | request status=`pending` and expires policy matched | `UPDATE signup_requests SET status='expired'` | request becomes terminal `expired` |
| `user_invite_redeem` | requester | invite code valid, not expired, unused, role scope valid | `INSERT signup_requests(requested_role='user', status='approved', requester_user_id, organization_id, reviewed_by, reviewed_at, ...)` | request recorded as terminal `approved` in same tx as invite consume + membership upsert |

## 5. Transition Matrix: `organization_memberships`

| Event | Actor | Preconditions | DB Writes | Postconditions |
| :--- | :--- | :--- | :--- | :--- |
| `admin_approve` | super/admin reviewer | corresponding admin `signup_requests` row is `pending` | `UPSERT organization_memberships(organization_id, user_id, role='admin', status='approved', approved_by, approved_at)` | requester has approved admin membership |
| `user_invite_redeem` | requester + system | invite row is valid and available | `UPSERT organization_memberships(organization_id, user_id, role='user', status='approved', approved_at=now())` | requester has approved user membership immediately |
| `admin_reject` | super/admin reviewer | admin request is `pending` | membership must not transition to `approved` from this event | no active approved membership created by reject |
| `admin_withdraw` | requester | request is own pending request | membership write not allowed from this event | no approved membership created by withdrawal |
| `admin_expire` | system job | request is stale pending request | membership write not allowed from this event | no approved membership created by expiration |

## 6. Cross-Table Invariants

1. One active membership row per user-organization:
   - Enforced by `UNIQUE (organization_id, user_id)` on `organization_memberships`.
2. Pending dedupe:
   - A requester must not own duplicate pending requests for the same effective scope and role.
3. Invite single-use:
   - Invite row can be consumed exactly once (`used_at`, `used_by`).
4. Atomic invite redemption:
   - Invite consume + membership upsert + approved signup_request insert must be one transaction.
5. No implicit approval:
   - Admin submission never creates approved membership until explicit approval event.
6. Approved-access consistency:
   - Only `organization_memberships.status='approved'` can pass tenant access checks.

## 7. Forbidden Transitions

Forbidden request transitions (`signup_requests`):
- Any terminal state -> any other state.
- `pending -> pending` via duplicate create for same dedupe key.
- `rejected/expired/withdrawn -> approved` (must resubmit as new request).
- `approved -> withdrawn` (lifecycle revocation must be handled in membership/account flows, not by mutating approved request).

Forbidden membership outcomes:
- Creating approved membership on `reject`, `withdraw`, or `expire`.
- User invite flow creating `role='admin'` membership.

## 8. Transaction Boundary Contract

### 8.1 Admin Approval Transaction

Single transaction:
1. Validate target `signup_requests` row is pending admin request.
2. Update request to `approved` (review metadata included).
3. Upsert membership to approved admin.
4. Insert approval audit log.

### 8.2 User Invite Redemption Transaction

Single transaction:
1. Validate invite is active (`used_at is null` and `expires_at > now()`).
2. Mark invite consumed (`used_at`, `used_by`).
3. Upsert membership to approved user.
4. Insert approved `signup_requests` row for audit.
5. Insert approval audit log (action metadata indicates invite auto-approval).

If any step fails, the entire transaction must roll back.

## 9. Audit Policy

Audit records are mandatory for both paths:
- `signup_requests` is mandatory for every signup outcome.
- `approval_logs` records decision/auto-approval action with actor/target context.

Minimum required audit fields:
- Request identity: `signup_request_id`, `requester_user_id`, `organization_id`, `requested_role`
- Decision context: `action`, `reviewed_by` or system actor, `created_at`
- Invite context for user flow: invite identifier metadata (non-raw secret), consume timestamp

## 10. Integration References

- Baseline schema: `migrations/007_service_transition_rbac_multitenant.sql`
- RLS/RBAC access principle: `docs/migration/P1-2.2_RLS_POLICY_MATRIX.md`
- Signup bridge route/API context: `docs/migration/SIGNUP_ORG_REUSE_BRIDGE.md`

