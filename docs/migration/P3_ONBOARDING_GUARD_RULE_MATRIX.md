# P3 Onboarding Guard Rule Matrix

This document is the canonical deliverable for task `P3-3.1`.
It defines who is forced into `/onboarding`, who is excluded, which routes are exceptions, and how onboarding evaluation is ordered against the existing P2 access-state guard.

Upstream source of truth:

- `docs/migration/P2_ACCESS_APPROVAL_POLICY.md`
- `docs/migration/P3_ONBOARDING_STATE_MACHINE.md`
- `docs/migration/P3_ONBOARDING_PERSISTENCE_RLS.md`

Reference implementation targets:

- `src/router/index.ts`
- `src/router/guards.ts`
- `src/stores/rbac.ts`
- `src/constants/routes.ts`

## 1. Scope

This document fixes:

- the onboarding guard evaluation order
- route exceptions and route classes
- the redirect result for each `AccessState`
- how effective organization selection affects onboarding evaluation
- the policy boundary that `P3-3.2` must implement without reinterpretation

This document does not define:

- the concrete `beforeEach` insertion code
- store fetch timing details beyond the guard contract
- onboarding API DTOs
- onboarding page content or CTA copy

## 2. Canonical Inputs

The onboarding guard may only consume these upstream decisions:

1. `accessState`
2. `effectiveMembership`
3. organization-scoped onboarding state for `effectiveMembership.organizationId`

The guard must not invent a second access model.
It must reuse the exact `AccessState` names already defined in `src/types/rbac.ts`:

- `unauthenticated`
- `super_active`
- `admin_active`
- `admin_pending`
- `admin_rejected`
- `user_active`
- `no_membership_or_inactive`

## 3. Effective Organization Rule

Onboarding is always evaluated against the same effective organization selected by the RBAC access model.

Resolution source order is fixed by `src/stores/rbac.ts`:

1. `selectedOrganizationId`
2. `context.currentOrganizationId`
3. role-priority fallback among approved memberships
4. pending/rejected admin fallback for access-state resolution only

Implications:

- onboarding evaluation is organization-scoped, never user-scoped
- `admin_active` is the only state that can enter onboarding evaluation
- if the effective organization changes, onboarding status must be re-evaluated for the new organization before completing navigation
- if no approved admin membership resolves, onboarding evaluation does not run and the P2 access result wins

## 4. Guard Order

Guard order is fixed as follows:

1. session restore
2. auth-context load and `accessState` resolution
3. P2 status blocking redirect
4. route-level access-state or role gate
5. onboarding guard
6. schedule step progression guard

This preserves the P2 invariant that approval blocking happens before onboarding.

Consequences:

- `admin_pending` and `admin_rejected` are redirected before onboarding is checked
- `user_active`, `super_active`, and `no_membership_or_inactive` never reach onboarding evaluation
- schedule step validation must not run before onboarding redirect is resolved

## 5. Route Classes and Exceptions

### 5.1 Auth Pages

Current auth pages:

- `/login`
- `/signup`

If a legacy or future alias such as `/register` exists, it must follow the same auth-page rule as `/signup`.

### 5.2 Access-State Pages

- `/access/pending`
- `/access/rejected`

### 5.3 Onboarding Route

- `/onboarding`

This route is:

- admin-only
- incomplete-only
- organization-scoped

### 5.4 Protected App Routes

Any authenticated application route that is not one of the explicit exceptions above and is not a public route.

Examples:

- `/`
- `/schedule/step1`
- `/schedule/step2`
- `/schedule/step3`
- `/schedule/step4`
- `/schedule/step5/:id`
- future admin dashboard or management pages

### 5.5 Public Route Exceptions

A route is a public exception only if product policy explicitly allows bypassing the onboarding force rule.

For P3 guard policy, the exception set is:

- auth pages
- access-state pages
- explicitly public marketing/help/legal pages, if added later

`/onboarding` itself is not a bypass route.
It is a controlled target route with its own allow/deny rule.

Dev-only test routes are not part of the canonical product exception list and must not be used to redefine the onboarding policy.

## 6. Canonical Redirect Rules by AccessState

### 6.1 Global Access-State Redirects

| AccessState | Target Route Class | Result | Reason |
| :--- | :--- | :--- | :--- |
| `unauthenticated` | protected app route | `/login` | auth required before any onboarding decision |
| `unauthenticated` | `/onboarding` | `/login` | unauthenticated users can never enter onboarding |
| `no_membership_or_inactive` | protected app route | `/login` | P2 access result wins |
| `no_membership_or_inactive` | `/onboarding` | `/login` | no onboarding eligibility |
| `admin_pending` | any route except `/access/pending` | `/access/pending` | approval blocking precedes onboarding |
| `admin_pending` | `/access/pending` | allow | canonical pending page |
| `admin_rejected` | any route except `/access/rejected` | `/access/rejected` | approval blocking precedes onboarding |
| `admin_rejected` | `/access/rejected` | allow | canonical rejected page |
| `user_active` | `/onboarding` | post-auth route | user role is never an onboarding actor |
| `super_active` | `/onboarding` | post-auth route | super bypasses onboarding route entirely |

### 6.2 Auth and Access Page Rules for Active States

| AccessState | Route | Result |
| :--- | :--- | :--- |
| `admin_active` | `/login`, `/signup` | proceed to onboarding evaluation, then either `/onboarding` or normal post-auth route |
| `user_active` | `/login`, `/signup` | normal post-auth route |
| `super_active` | `/login`, `/signup` | normal post-auth route |
| `admin_active` | `/access/pending`, `/access/rejected` | normal onboarding/post-auth evaluation; never stay on access-state page |
| `user_active` | `/access/pending`, `/access/rejected` | normal post-auth route |
| `super_active` | `/access/pending`, `/access/rejected` | normal post-auth route |

For `admin_active`, auth-page exit does not immediately imply `/schedule/step1`.
Onboarding completion must be checked first.

## 7. Canonical Onboarding Decision Matrix

Only `admin_active` enters this matrix.

| AccessState | Onboarding State for Effective Organization | Requested Route Class | Result |
| :--- | :--- | :--- | :--- |
| `admin_active` | incomplete | `/onboarding` | allow |
| `admin_active` | incomplete | protected app route | redirect to `/onboarding` |
| `admin_active` | incomplete | auth page | redirect to `/onboarding` |
| `admin_active` | incomplete | access-state page | redirect to `/onboarding` |
| `admin_active` | incomplete | explicit public exception | allow |
| `admin_active` | complete | `/onboarding` | redirect to normal post-auth route |
| `admin_active` | complete | protected app route | allow |
| `admin_active` | complete | auth page | redirect to normal post-auth route |
| `admin_active` | complete | access-state page | redirect to normal post-auth route |
| `admin_active` | complete | explicit public exception | allow |

Interpretation notes:

- "normal post-auth route" means the standard active-user entry path used by the router at that moment
- for the current app baseline, that path is `/schedule/step1`
- `P3-3.2` may refine how the normal post-auth route is resolved, but it may not change the matrix above

## 8. `/onboarding` Allow Rule

`/onboarding` is allowed if and only if all conditions are true:

1. user is authenticated
2. `accessState = 'admin_active'`
3. `effectiveMembership` is resolved
4. onboarding for `effectiveMembership.organizationId` is incomplete

`/onboarding` must reject:

- `unauthenticated`
- `no_membership_or_inactive`
- `admin_pending`
- `admin_rejected`
- `user_active`
- `super_active`
- `admin_active` with completed onboarding

Redirect target on rejection:

- blocked access states follow the P2 route
- active but ineligible states go to the normal post-auth route
- unauthenticated or inactive/no-membership states go to `/login`

## 9. Selected Organization / Membership Impact

The guard must evaluate onboarding against the effective membership selected by the RBAC store, not against an arbitrary organization list.

Rules:

1. if `selectedOrganizationId` points to an approved admin membership, use that organization for onboarding evaluation
2. if `selectedOrganizationId` is absent or invalid, use the RBAC fallback organization already resolved by the store
3. if the resolved membership is approved `user`, onboarding does not apply
4. if the resolved membership is pending or rejected `admin`, P2 access-state blocking applies and onboarding does not run
5. if the same account has multiple admin organizations, the guard decision may differ when the effective organization changes

This means onboarding force is not a global user flag.
It is recalculated per effective organization.

## 10. Conflict Resolution Rules

When multiple redirects are theoretically possible, use this precedence:

1. unauthenticated redirect
2. `admin_pending` / `admin_rejected` blocking redirect
3. `no_membership_or_inactive` redirect
4. route-level access-state or role denial
5. onboarding force redirect
6. schedule step progression redirect

Examples:

- `admin_pending` visiting `/onboarding` -> `/access/pending`, not `/onboarding`
- `user_active` visiting `/onboarding` -> normal post-auth route, not `/login`
- `admin_active` with incomplete onboarding visiting `/schedule/step3` -> `/onboarding`, not step-progress fallback
- `admin_active` with completed onboarding visiting `/schedule/step3` -> route stays eligible, then step-progress guard may still redirect if schedule prerequisites are missing

## 11. Boundary for P3-3.2

`P3-3.2` may decide:

- where the onboarding state is prefetched
- whether onboarding state is cached in a store
- how to avoid duplicate fetches during one navigation cycle
- how route metadata expresses the onboarding exception set

`P3-3.2` may not redefine:

- who enters onboarding evaluation
- the exception route classes
- the redirect precedence
- the organization-scoped evaluation rule
- the meaning of complete vs incomplete onboarding
- the allow rule for `/onboarding`

## 12. Verification Checklist

This matrix is complete only if all statements remain true:

1. `admin_pending` and `admin_rejected` never reach onboarding evaluation
2. only `admin_active` can be forced into `/onboarding`
3. `/onboarding` is denied to `user_active` and `super_active`
4. incomplete `admin_active` is forced from protected app routes into `/onboarding`
5. completed `admin_active` is redirected away from `/onboarding`
6. selected organization changes can change the onboarding decision because evaluation is organization-scoped
7. schedule step validation cannot run before onboarding redirect is settled

When these seven conditions hold, the router implementation plan can consume this document directly without policy reinterpretation.
