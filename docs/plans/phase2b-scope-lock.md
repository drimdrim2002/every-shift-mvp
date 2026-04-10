# Phase2A-2 Go-Live Ops Layer Scope Lock

> Filename requested as `phase2b-scope-lock.md`.
> This document intentionally locks **Phase2A-2 Go-Live Ops Layer** only.
> It does **not** expand scope into Phase2B.

## 1. Purpose

This document converts the Phase2A-2 review outcome into a single planning input for the next `writing-plans` session.

It exists to lock:

- the exact Phase2A-2 cut line
- the assisted-pilot operating assumptions
- the safe implementation order
- the schema, API, and lifecycle boundaries
- the parts that must remain deferred even if related tables already exist

This document is a scope lock, not an implementation plan.

## 2. Source of Truth

Use these documents in this order:

1. `docs/prd/PHASE2_PRD_KR.md`
2. `docs/prd/PHASE2_ENGINEERING_SPEC_KR.md`
3. `docs/plans/PHASE2A_PRD_EXECUTION_GAP_REPORT_KR.md`
4. This document

If this document conflicts with a higher-priority source, the higher-priority source wins.

## 3. Scope Lock Summary

### In Scope

Phase2A-2 must include the minimum operations layer required to run an assisted pilot safely:

- admin bootstrap for assisted pilot only
- organization basic info confirmation
- ward/site setup
- employee registration and Excel upload preparation
- shift and constraint setup required for go-live
- off request policy management
- rolling fairness ledger
- pilot entry checklist / guided checklist

### Out of Scope

The following items are explicitly excluded:

- self-signup
- approval flow
- full RBAC
- advanced operations dashboard
- unrelated Trust Layer redesign
- any Phase2B feature
- reopening finalized months
- fairness-aware solver cost-function tuning
- multi-organization self-serve onboarding
- site staffing model migration beyond what is needed for pilot safety

## 4. Non-Negotiable Constraints

### 4.1 Trust Layer Boundary

- Trust Layer is already treated as completed for this planning step.
- Phase2A-2 must build on top of the existing version/review/finalize model.
- Phase2A-2 must not reshape Trust Layer lifecycle rules unless strictly required for safety.

### 4.2 Assisted Pilot Assumptions

- Initial admin accounts may be provisioned by an operator or internal team.
- Initial data setup may be performed with operational assistance.
- There is no self-serve org creation path in this scope.
- There is no end-user approval queue in this scope.

### 4.3 Fairness Ledger Safety

- rolling fairness ledger writes must be **finalized-version-only**
- draft versions must never write the ledger
- review-in-progress versions must never write the ledger
- compare-only candidate versions must never write the ledger
- public write endpoints for ledger mutation are not allowed

### 4.4 Safety-First Implementation Bias

When there is ambiguity, prefer:

- reusing an existing narrow boundary over introducing a new subsystem
- explicit writes over implicit background behavior
- idempotent persistence over convenience
- read-only reuse of existing dormant tables over activating broad flows
- delaying solver fairness consumption until after ledger integrity is proven

## 5. Existing Repo Reality

### 5.1 Already Active and Reusable

These are already part of the live architectural baseline and must be reused:

- `phase2-schedule` function boundary for schedule/version/review/finalize flows
- `schedule_versions`
- `schedule_evaluations`
- `schedule_preferences` policy-check columns
- `Step5Result.vue` review-hub pattern
- `Step3EmployeeInfo.vue` finalized-month protection behavior
- auth scope based on `organization_id` metadata

### 5.2 Existing but Must Stay Narrow / Dark

These tables already exist in the database, but their activation must stay tightly scoped:

- `profiles`
- `sites`
- `onboarding_progress`
- `organization_rank_codes`
- `off_request_policy_rules`
- `fairness_ledger_monthly`

### 5.3 Existing but Deferred for This Scope

These exist or are conceptually adjacent, but must remain out of scope:

- `organization_memberships`
- `invite_codes`
- `approval_logs`
- `site_staffing_requirements` as canonical staffing source
- advanced analytics / dashboard surfaces

## 6. Canonical Boundaries

### 6.1 Schema Boundary

Canonical Phase2A-2 schema surface:

- `organizations`
- `profiles`
- `onboarding_progress`
- `sites`
- `site_requirements`
- `shifts`
- `organization_settings`
- `employees` with optional `rank_code`
- `organization_rank_codes`
- `off_request_policy_rules`
- `schedule_preferences.policy_check_status`
- `schedule_preferences.policy_rejection_reason`
- `fairness_ledger_monthly`

Boundary rule:

- `site_requirements` remains the staffing source of truth for this scope.
- `sites` may be added and referenced, but Phase2A-2 does not migrate the product to a new staffing engine model.

### 6.2 API Boundary

Recommended public operations boundary:

- `phase2-ops`

Recommended public endpoints:

- `POST /functions/v1/phase2-ops/bootstrap-admin`
- `GET /functions/v1/phase2-ops/organization-profile`
- `PATCH /functions/v1/phase2-ops/organization-profile`
- `GET /functions/v1/phase2-ops/sites`
- `PUT /functions/v1/phase2-ops/sites`
- `GET /functions/v1/phase2-ops/shifts-constraints`
- `PUT /functions/v1/phase2-ops/shifts-constraints`
- `POST /functions/v1/phase2-ops/employee-import/validate`
- `POST /functions/v1/phase2-ops/employee-import/apply`
- `GET /functions/v1/phase2-ops/off-request-policies`
- `PUT /functions/v1/phase2-ops/off-request-policies`
- `GET /functions/v1/phase2-ops/checklist`
- `PATCH /functions/v1/phase2-ops/checklist`

Internal-only boundary:

- fairness ledger writes happen inside the existing `phase2-schedule finalize` flow, not via a new public mutation API

### 6.3 Lifecycle / State Boundary

- `onboarding_progress` is a UX cursor, not the source of truth for readiness
- actual checklist readiness must be derived from real tables
- policy changes apply prospectively and must not silently rewrite the meaning of existing versions
- employee roster reset rules remain centralized and destructive by design
- finalized months remain read-only

## 7. Locked Implementation Slices

The next implementation plan should use these slices in this order.

### Slice O1: Admin Bootstrap

**Goal**

- Create the minimum safe path to provision the first pilot admin.

**In Scope**

- internal or operator-assisted admin provisioning
- `profiles` bootstrap for admin access
- auth metadata alignment for `organization_id`
- `onboarding_progress` initialization

**Out of Scope**

- self-signup
- invite flows
- approval flows
- organization membership workflows
- RBAC expansion

**Dependencies**

- Trust Layer baseline only

**Main Risks**

- auth user exists but org metadata is missing
- profile row exists but org linkage is wrong
- login succeeds but the app cannot resolve org scope

**Recommendation**

- reuse the current metadata-based auth scope instead of introducing a new membership resolver

### Slice O2: Organization / Site / Shift Foundation

**Goal**

- Make organization confirmation, site setup, and shift/constraint setup pilot-ready.

**In Scope**

- organization basic info confirmation
- site/ward registration using `sites`
- site-linked staffing configuration using `site_requirements`
- shift definitions
- organization-level work constraints via `organization_settings`

**Out of Scope**

- full staffing engine migration
- canonical switch to `site_staffing_requirements`
- advanced site/skill/rank staffing modeling

**Dependencies**

- Slice O1

**Main Risks**

- duplicate staffing sources cause schedule-generation regressions
- Step2 reads one table while setup writes another
- site config appears saved but does not affect scheduling

**Recommendation**

- keep `site_requirements` as the canonical staffing source for this phase

### Slice O3: Employee Registration and Excel Preparation

**Goal**

- Safely support employee roster setup and Excel-based import for assisted pilot use.

**In Scope**

- import template definition
- validate-preview flow
- apply flow
- duplicate employee checks
- available-shift validation
- optional rank-code capture
- reuse of centralized roster reset behavior

**Out of Scope**

- employee self-service
- cross-organization roster sync
- skill matrix onboarding

**Dependencies**

- Slice O2

**Main Risks**

- finalized month data could be overwritten
- draft versions could be invalidated too broadly
- bad imports could silently corrupt roster state

**Recommendation**

- split import into `validate` and `apply`; keep all destructive writes behind one centralized apply path

### Slice O4: Off Request Policy Management

**Goal**

- Add policy setup for monthly and annual off-request limits with rank/default fallback.

**In Scope**

- `organization_rank_codes`
- `off_request_policy_rules`
- default org policy when `rank_code` is null
- validation of policy rows
- policy-check result persistence on request rows

**Out of Scope**

- approval flows
- employee-facing off-request portal
- retroactive mass re-evaluation of old versions

**Dependencies**

- Slice O3

**Main Risks**

- policy edits silently change existing operational assumptions
- rankless organizations behave inconsistently
- rejected requests disappear instead of remaining explainable

**Recommendation**

- preserve rejected requests as rows with explicit rejection reason instead of deleting or hiding them

### Slice O5: Rolling Fairness Ledger

**Goal**

- Add finalized-only fairness ledger persistence and safe cumulative reads.

**In Scope**

- idempotent ledger write at finalization time
- 3/6/12-month aggregate read models
- operator-facing fairness summary read path

**Out of Scope**

- fairness-aware solver cost-function input
- formula tuning beyond a stable first definition
- finalized-month reopen/reversal semantics

**Dependencies**

- Slice O4
- existing finalize transaction in `phase2-schedule`

**Main Risks**

- duplicate writes on retry
- compare-only versions pollute the ledger
- fairness summaries disagree with finalized history

**Recommendation**

- keep ledger writes internal to finalize and enforce idempotency at the database level

### Slice O6: Guided Checklist / Pilot Entry

**Goal**

- Guide the pilot admin through the minimum required setup before first real schedule use.

**In Scope**

- checklist API
- step completion rendering
- deep-links to relevant setup screens
- derived readiness gates from actual stored data

**Out of Scope**

- self-serve onboarding wizard
- adaptive onboarding automation
- advanced operations dashboard

**Dependencies**

- Slices O1 through O5

**Main Risks**

- checklist becomes a cosmetic progress bar instead of a readiness gate
- manual completion state drifts from actual data reality

**Recommendation**

- derive completion from real data wherever possible; use `onboarding_progress` only as navigation memory

## 8. What Must Stay Deferred Even Within Phase2A-2

The following must stay deferred for safety even though they are adjacent:

- solver consumption of rolling fairness context
- canonical migration from `site_requirements` to `site_staffing_requirements`
- any reopen/unfinalize workflow for fairness correction
- any approval-queue semantics
- any membership-based auth rewrite
- any broad dashboard / analytics buildout
- any Phase2B user acquisition or self-serve flow

## 9. Failure Modes to Preserve in the Next Plan

The implementation plan must explicitly cover these failure modes:

- bootstrap succeeds but `organization_id` auth metadata is missing
- setup writes are accepted but scheduling still reads stale sources
- employee apply resets more than the intended month scope
- policy changes alter behavior without a clear operator-visible explanation
- finalize retries write duplicate fairness ledger rows
- checklist says “ready” while required pilot data is still missing

## 10. Observability Requirements

The implementation plan must include these minimum events or equivalent metrics:

- `admin_bootstrap_provisioned`
- `organization_profile_confirmed`
- `site_config_saved`
- `employee_import_validated`
- `employee_roster_applied`
- `off_request_policy_saved`
- `policy_check_rejected`
- `fairness_ledger_write_attempted`
- `fairness_ledger_write_succeeded`
- `fairness_ledger_write_blocked`
- `checklist_gate_blocked`

## 11. Test Strategy Requirements

The next implementation plan must include:

- unit tests for policy evaluation, checklist reduction, fairness-ledger idempotency, and auth bootstrap mapping
- integration tests for bootstrap -> login scope, site setup -> scheduling compatibility, employee apply -> reset guard, policy persistence, finalize -> ledger write
- end-to-end tests for assisted pilot bootstrap, protected finalized month behavior, and no-ledger-write on compare-only versions

## 12. Planning Rules for the Next Session

When this document is converted into an implementation plan:

- do not expand into Phase2B
- do not rewrite the Trust Layer
- do not introduce a second fairness write path
- do not create a public ledger mutation endpoint
- do not switch staffing canonical sources unless the plan explicitly proves why it is required
- prefer minimal diff and existing repo patterns
- bias toward test-first, explicit, reversible work

## 13. Final Lock

This document locks the Phase2A-2 planning target as:

- a narrow assisted-pilot operations layer
- built on the existing Trust Layer
- with fairness ledger integrity preserved by finalized-only writes
- and with all self-serve / approval / dashboard expansion explicitly deferred
