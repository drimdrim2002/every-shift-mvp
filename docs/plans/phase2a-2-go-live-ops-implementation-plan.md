# Phase2A-2 Go-Live Ops Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the narrow assisted-pilot operations layer needed to provision a pilot admin, confirm organization/site/shift setup, safely register employees, manage off-request policies, persist finalized-only rolling fairness history, and guide pilot entry without expanding into Phase2B.

**Architecture:** Keep Trust Layer ownership exactly where it is today: `phase2-schedule` remains the sole owner of schedule/version/review/finalize lifecycle and the only writer of the rolling fairness ledger. Add a separate `phase2-ops` boundary for admin bootstrap, organization/site foundation, employee import preparation, policy management, and checklist reduction, while reusing the existing Dashboard plus Step2/Step3/Step4/Step5 surfaces instead of introducing a new operations product area.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Pinia, Naive UI, Tailwind CSS, Supabase Edge Functions, Supabase Postgres, Vitest, Playwright

---

## Scope Lock

This plan is derived from:

- [docs/plans/phase2b-scope-lock.md](/Users/brown/workspace/every-shift-mvp/docs/plans/phase2b-scope-lock.md)
- [docs/prd/PHASE2_PRD_KR.md](/Users/brown/workspace/every-shift-mvp/docs/prd/PHASE2_PRD_KR.md)
- [docs/prd/PHASE2_ENGINEERING_SPEC_KR.md](/Users/brown/workspace/every-shift-mvp/docs/prd/PHASE2_ENGINEERING_SPEC_KR.md)
- [docs/plans/PHASE2A_PRD_EXECUTION_GAP_REPORT_KR.md](/Users/brown/workspace/every-shift-mvp/docs/plans/PHASE2A_PRD_EXECUTION_GAP_REPORT_KR.md)

Hard locks for this plan:

- HOLD SCOPE
- Trust Layer is already treated as completed
- No Phase2B expansion
- Assisted pilot assumptions stay explicit
- Fairness ledger writes are finalized-version-only
- Draft, review-in-progress, and compare-only versions never write or mutate rolling fairness state
- `site_requirements` remains the canonical staffing source for schedule generation
- No public fairness-ledger write endpoint
- No self-signup, approval flow, membership rewrite, full RBAC, advanced operations dashboard, or unrelated Trust Layer redesign

## Assisted Pilot Assumptions

- The first pilot admin is provisioned by an internal operator or assisted internal workflow.
- Browser users do not create organizations or grant themselves access in this phase.
- Browser users operate within a single `organization_id` auth scope resolved from existing auth metadata.
- The product continues to behave like a single pilot ward/site scheduling workflow even if `sites` stores multiple rows.
- If multiple sites are entered, exactly one site is marked as the schedule-active pilot site; all scheduling reads continue to use organization-scoped `site_requirements`.

## What Already Exists

- `supabase/functions/phase2-schedule/*` already owns schedule ensure/compare/review/select/solve/recheck/finalize and current-month roster reset.
- `src/views/schedule/Step2SiteInfo.vue`, `src/views/schedule/Step3EmployeeInfo.vue`, `src/views/schedule/Step4InitialData.vue`, and `src/views/schedule/Step5Result.vue` already provide the main pilot scheduling surfaces.
- `src/api/schedule.ts` already calls the `phase2-schedule` edge function and directly reads/writes current schedule tables.
- `src/stores/organization.ts` and `src/utils/authScope.ts` already resolve `organization_id` from auth metadata.
- `Step3EmployeeInfo.vue` already blocks destructive resave for finalized months and reuses `resetPhase2ScheduleRoster`.
- The current compare/review/finalize model and `schedule_versions` / `schedule_evaluations` baseline are already active.

## Locked Boundaries

### Slice Boundaries

- O1 owns pilot admin bootstrap only.
- O2 owns organization confirmation, primary site metadata, shift setup, and schedule-safe staffing compatibility only.
- O3 owns employee roster import template, validate/apply flow, and Step3 integration only.
- O4 owns rank/default off-request policy definition and policy-check persistence only.
- O5 owns finalized-only fairness ledger write + read models only.
- O6 owns guided checklist reduction and pilot entry surfaces only.

### Schema Boundaries

Canonical Phase2A-2 schema surface:

- `organizations`
- `profiles`
- `onboarding_progress`
- `sites`
- `site_requirements`
- `shifts`
- `organization_settings`
- `employees.rank_code`
- `organization_rank_codes`
- `off_request_policy_rules`
- `schedule_preferences.policy_check_status`
- `schedule_preferences.policy_rejection_reason`
- `fairness_ledger_monthly`

Deferred schema stays dark:

- `organization_memberships`
- `invite_codes`
- `approval_logs`
- `site_staffing_requirements`
- any new dashboard analytics tables

Schema decisions locked for safety:

- `site_requirements` stays organization-scoped and remains the schedule-generation source of truth.
- `sites` stores pilot metadata plus the single schedule-active site pointer; it does not become a new staffing engine.
- `fairness_ledger_monthly` is append/update-safe only through finalization internals.
- `schedule_preferences` receives policy outcome columns but not a second lifecycle.

Concrete schema lock for the first implementation pass:

- `sites`
  Columns: `id`, `organization_id`, `code`, `name`, `is_active`, `is_schedule_active`, `created_at`, `updated_at`
  Constraints: unique `(organization_id, code)` plus a partial unique index ensuring only one `is_schedule_active = true` row per organization
- `organization_settings`
  Columns: `organization_id`, `pilot_site_id`, `minimum_rest_hours`, `checklist_cursor`, `updated_at`
  Constraints: unique/PK on `organization_id`; `pilot_site_id` FK to `sites.id`; a DB trigger rejects any `pilot_site_id` that does not reference the organization’s single `is_schedule_active = true` site
- `employees.rank_code`
  Column: nullable `rank_code`
  Meaning: `NULL` explicitly means “use the organization default off-request policy”
- `organization_rank_codes`
  Columns: `id`, `organization_id`, `code`, `label`, `display_order`, `is_active`, `created_at`, `updated_at`
  Constraints: unique `(organization_id, code)`
- `off_request_policy_rules`
  Columns: `id`, `organization_id`, `rank_code`, `period_type`, `limit_count`, `is_active`, `created_at`, `updated_at`
  Constraints: unique `(organization_id, rank_code, period_type)` for active rules; nullable `rank_code` represents the organization default rule; partial unique index enforces only one active default rule per `(organization_id, period_type)` where `rank_code IS NULL`

Enforcement mechanics:

- partial unique index: one schedule-active site per organization
- trigger: `organization_settings.pilot_site_id` must reference that schedule-active site
- partial unique index: one active default off-request policy row per organization and period when `rank_code IS NULL`
- application validation plus repository tests: ranked rules cannot reference unknown or inactive rank codes

### API Boundaries

Public browser-facing ops boundary:

- `supabase/functions/phase2-ops/*`
- `src/api/ops.ts`

Locked `phase2-ops` endpoints:

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

Internal-only boundaries:

- rolling fairness ledger writes stay inside `supabase/functions/phase2-schedule/repository.ts` finalization flow
- no `POST`/`PATCH`/`PUT` fairness-ledger endpoint is added
- bootstrap-admin is operator-assisted and not wired into the production browser flow
- Phase2A implementation note: `bootstrap-admin` currently uses the existing Supabase bearer token path plus server-side `profiles.global_role` / `account_status` checks for operator authorization.
- Deferred hardening note: a future script-only secret or dedicated operator token boundary may replace the current auth path without changing bootstrap repository behavior; that hardening is explicitly deferred out of the current slice.

### Lifecycle and State Rules

- `onboarding_progress` is a navigation cursor and operator memory only; it never overrides derived readiness.
- Checklist readiness is computed from real table state.
- Policy changes apply prospectively to new saves/rechecks and never rewrite existing evaluation artifacts.
- Employee roster apply remains destructive by design for the current unfinalized month only and keeps finalized months blocked.
- Finalized months remain read-only.
- Rolling fairness ledger rows are written only when the selected version successfully finalizes.
- Recheck, compare, review, preview switching, and draft mutation never write rolling fairness data.

### Failure Modes That Must Stay Explicit

- bootstrap succeeds but auth metadata does not contain `organization_id`
- profile exists but points to the wrong organization
- organization/site setup saves but schedule generation still reads stale `site_requirements`
- employee import validate passes but apply would invalidate finalized history
- policy changes save but policy-check explanations disappear from Step4/Step5
- finalize retry attempts a duplicate fairness write
- checklist reports ready while required foundation data is still missing

### Observability Points

Minimum structured logs or equivalent metrics:

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

### Test Strategy

Unit coverage:

- auth bootstrap mapping
- checklist reduction
- employee import validation
- policy evaluation
- fairness ledger idempotency and blocked-write guards

Integration coverage:

- bootstrap -> login scope
- site setup -> schedule-generation compatibility
- validate/apply -> reset guard and finalized protection
- policy persistence -> `schedule_preferences` explanation fields
- finalize -> ledger write + no duplicate on retry

E2E coverage:

- assisted pilot bootstrap handoff
- pilot checklist readiness flow
- finalized month roster protection
- compare-only/draft versions never writing fairness ledger state

### Rollout Order

Mandatory order:

1. O1 Admin Bootstrap
2. O2 Organization / Site / Shift Foundation
3. O3 Employee Registration and Excel Preparation
4. O4 Off Request Policy Management
5. O5 Rolling Fairness Ledger
6. O6 Guided Checklist / Pilot Entry

### Parallelization Rules

Safe parallel work after contracts are frozen:

- frontend `src/api/ops.ts` + UI screens can proceed in parallel with `phase2-ops` repository implementation
- checklist UI can proceed after checklist contract is frozen, while backend reducer tests are finishing
- unit tests for `phase2-ops` contracts/repository and frontend component tests can be split by slice

Must stay centralized:

- migrations and RPC additions
- finalization changes in `phase2-schedule`
- anything that mutates `schedule_preferences` policy fields
- anything that writes `fairness_ledger_monthly`

## File Structure and Ownership Boundaries

Backend ownership:

- Create: `supabase/functions/phase2-ops/index.ts`
  Responsibility: route dispatch for all ops endpoints; no schedule finalization logic.
- Create: `supabase/functions/phase2-ops/auth.ts`
  Responsibility: reuse current auth-scope pattern plus operator bootstrap authorization checks.
- Create: `supabase/functions/phase2-ops/cors.ts`
  Responsibility: match current edge function CORS behavior.
- Create: `supabase/functions/phase2-ops/contracts.ts`
  Responsibility: request/response contracts and route matching for ops endpoints only.
- Create: `supabase/functions/phase2-ops/repository.ts`
  Responsibility: data access for profiles, onboarding_progress, sites, organization settings, employee validate/apply, policy CRUD, checklist reads.
- Create: `supabase/functions/phase2-ops/checklist.ts`
  Responsibility: pure checklist reduction from table snapshots; no DB writes.
- Create: `supabase/functions/phase2-ops/observability.ts`
  Responsibility: structured event helpers so logs stay boring and consistent.
- Modify: `supabase/functions/phase2-schedule/repository.ts`
  Responsibility: finalized-only fairness ledger write integration and read-model loading; no new public fairness mutation route.

Database ownership:

- Create: `migrations/20260408_090000_phase2a2_ops_foundation.sql`
  Responsibility: missing columns/indexes/defaults for `profiles`, `onboarding_progress`, `sites`, `organization_settings`, and any helper SQL functions for bootstrap/foundation writes.
- Create: `migrations/20260408_100000_phase2a2_off_request_policy.sql`
  Responsibility: `employees.rank_code`, `organization_rank_codes`, `off_request_policy_rules`, `schedule_preferences.policy_check_status`, `schedule_preferences.policy_rejection_reason`, and policy evaluation helper functions.
- Create: `migrations/20260408_110000_phase2a2_fairness_ledger.sql`
  Responsibility: `fairness_ledger_monthly` indexes/constraints, finalized-only upsert helper, and aggregate read views/functions.

Frontend ownership:

- Create: `src/types/ops.ts`
  Responsibility: all ops-layer request/response/view-model types.
- Create: `src/api/ops.ts`
  Responsibility: browser caller for `phase2-ops`; the only frontend entry point to the ops edge function.
- Create: `src/components/ops/PilotChecklistCard.vue`
  Responsibility: dashboard checklist summary and deep links.
- Create: `src/components/ops/OrganizationProfileForm.vue`
  Responsibility: organization profile confirmation form.
- Create: `src/components/ops/SiteFoundationForm.vue`
  Responsibility: site metadata + primary-site selection UI without replacing `site_requirements`.
- Create: `src/components/ops/OffRequestPolicyTable.vue`
  Responsibility: rank/default policy editing UI.
- Create: `src/views/ops/OrganizationProfileSetup.vue`
  Responsibility: O2 organization profile screen.
- Create: `src/views/ops/OffRequestPolicySetup.vue`
  Responsibility: O4 policy management screen.
- Modify: `src/router/index.ts`
  Responsibility: add narrow ops routes; do not alter existing schedule route behavior.
- Modify: `src/views/Dashboard.vue`
  Responsibility: surface pilot entry readiness and deep links; do not turn dashboard into an analytics surface.
- Modify: `src/views/schedule/Step2SiteInfo.vue`
  Responsibility: keep `site_requirements` canonical while reflecting primary-site metadata and ops save state.
- Modify: `src/views/schedule/Step3EmployeeInfo.vue`
  Responsibility: replace local Excel-only save path with validate/apply ops flow and preserve finalized protections.
- Modify: `src/views/schedule/Step4InitialData.vue`
  Responsibility: show policy rejection explanations from `schedule_preferences`.
- Modify: `src/views/schedule/Step5Result.vue`
  Responsibility: optional fairness summary read-only panel; never writes fairness data.
- Modify: `src/stores/organization.ts`
  Responsibility: load and cache organization/site foundation data needed across Dashboard and schedule setup.
- Modify: `src/types/schedule.ts`
  Responsibility: add policy explanation fields used by Step4/Step5 display.

Scripts and assisted bootstrap ownership:

- Create: `scripts/ops/bootstrap-phase2-admin.ts`
  Responsibility: operator-assisted CLI wrapper that calls `bootstrap-admin`; not shipped in the browser bundle.

Test ownership:

- Create: `tests/unit/phase2-ops-contracts.spec.ts`
- Create: `tests/unit/phase2-ops-repository.spec.ts`
- Create: `tests/unit/phase2-ops-api.spec.ts`
- Create: `tests/unit/phase2-ops-checklist.spec.ts`
- Modify: `tests/unit/dashboard.spec.ts`
- Modify: `tests/unit/step2-site-info.spec.ts`
- Modify: `tests/unit/step3-employee-info.spec.ts`
- Modify: `tests/unit/step4-initial-data.spec.ts`
- Modify: `tests/unit/organization-store.spec.ts`
- Modify: `tests/unit/phase2-schedule-write-repository.spec.ts`
- Create: `tests/e2e/pilot-checklist.spec.ts`
- Modify: `tests/e2e/schedule-workflow.spec.ts`

## Implementation Slices

### Slice O1: Admin Bootstrap

**Goal:** Create the minimum safe path to provision the first pilot admin without introducing self-serve onboarding.

**In Scope:**

- operator-assisted admin provisioning
- `profiles` bootstrap for the pilot admin
- auth metadata alignment for `organization_id`
- `onboarding_progress` initialization
- CLI/bootstrap handoff for internal operators

**Out of Scope:**

- self-signup
- invite flows
- approval queue
- membership resolver
- role hierarchy beyond “pilot admin exists”

**Dependencies:** existing auth metadata scope, existing `resolveAuthScope`, existing organization row

**Main Risks:**

- auth user exists but metadata scope is missing
- bootstrap path accidentally becomes user-facing
- profile row and auth scope drift apart

**Files to Create/Modify:**

- Create: `migrations/20260408_090000_phase2a2_ops_foundation.sql`
- Create: `supabase/functions/phase2-ops/index.ts`
- Create: `supabase/functions/phase2-ops/auth.ts`
- Create: `supabase/functions/phase2-ops/contracts.ts`
- Create: `supabase/functions/phase2-ops/repository.ts`
- Create: `supabase/functions/phase2-ops/observability.ts`
- Create: `src/types/ops.ts`
- Create: `scripts/ops/bootstrap-phase2-admin.ts`
- Modify: `src/types/organization.ts`
- Modify: `src/utils/authScope.ts`
- Modify: `src/stores/organization.ts`
- Create: `tests/unit/phase2-ops-contracts.spec.ts`
- Create: `tests/unit/phase2-ops-repository.spec.ts`
- Modify: `tests/unit/organization-store.spec.ts`

**Test Coverage:**

- contract tests for operator-only bootstrap payload
- repository tests for metadata/profile/onboarding initialization
- auth-scope unit regression for metadata fallback keys
- integration smoke via script calling bootstrap endpoint

**Rollout / Verification Gate:**

- operator can provision a pilot admin
- pilot admin login resolves `organization_id`
- dashboard loads without manual DB patching
- bootstrap endpoint is not linked from browser UI

**Safe Parallelization:**

- contract tests and CLI script can proceed in parallel after payload shape is frozen
- migration + repository implementation must stay centralized

#### Task O1.1: Lock bootstrap schema and contracts

**Files:**

- Create: `migrations/20260408_090000_phase2a2_ops_foundation.sql`
- Create: `supabase/functions/phase2-ops/contracts.ts`
- Create: `tests/unit/phase2-ops-contracts.spec.ts`

- [ ] Step 1: Write failing contract tests for `POST /bootstrap-admin` covering operator authorization, required `organizationId`, target email, display name, and onboarding initialization flags.
- [ ] Step 2: Run `pnpm test:unit -- tests/unit/phase2-ops-contracts.spec.ts`; expect FAIL because `phase2-ops` contracts do not exist yet.
- [ ] Step 3: Draft the migration for minimal bootstrap columns/defaults only; avoid any membership or RBAC tables.
- [ ] Step 4: Pin the concrete `sites` and `organization_settings` schema exactly as locked above; do not leave column choices implicit.
- [ ] Step 5: Implement the route matcher and request/response parsers in `supabase/functions/phase2-ops/contracts.ts`.
- [ ] Step 6: Re-run `pnpm test:unit -- tests/unit/phase2-ops-contracts.spec.ts`; expect PASS.

#### Task O1.2: Implement operator-assisted bootstrap flow

**Files:**

- Create: `supabase/functions/phase2-ops/index.ts`
- Create: `supabase/functions/phase2-ops/auth.ts`
- Create: `supabase/functions/phase2-ops/repository.ts`
- Create: `supabase/functions/phase2-ops/observability.ts`
- Create: `scripts/ops/bootstrap-phase2-admin.ts`
- Modify: `src/utils/authScope.ts`
- Modify: `src/stores/organization.ts`
- Create: `tests/unit/phase2-ops-repository.spec.ts`

- [ ] Step 1: Write failing repository tests for bootstrap creating or syncing `profiles`, `onboarding_progress`, and auth metadata alignment.
- [ ] Step 2: Run `pnpm test:unit -- tests/unit/phase2-ops-repository.spec.ts`; expect FAIL because bootstrap repository behavior is missing.
- [ ] Step 3: Implement operator authorization in `supabase/functions/phase2-ops/auth.ts`; keep browser users unable to call bootstrap accidentally.
- [ ] Step 4: Implement `bootstrap-admin` repository logic with idempotent profile/onboarding writes and structured observability events.
- [ ] Step 5: Add the CLI wrapper in `scripts/ops/bootstrap-phase2-admin.ts` so operators do not use ad hoc SQL.
- [ ] Step 6: Update `src/types/organization.ts`, `src/stores/organization.ts`, and `tests/unit/organization-store.spec.ts` only enough to consume the new foundation metadata after first login.
- [ ] Step 7: Add/adjust auth-scope regression tests in existing auth-scope coverage and re-run targeted tests.
- [ ] Step 8: Verify with `pnpm test:unit -- tests/unit/phase2-ops-repository.spec.ts tests/unit/auth-scope.spec.ts tests/unit/organization-store.spec.ts`; expect PASS.

### Slice O2: Organization / Site / Shift Foundation

**Goal:** Make organization confirmation, primary site setup, shifts, and schedule-safe staffing configuration pilot-ready without changing the canonical staffing source.

**In Scope:**

- organization basic info confirmation
- site metadata registration via `sites`
- single schedule-active pilot site selection
- shift definition and constraint configuration
- `organization_settings` write path for narrow pilot settings only
- continued use of `site_requirements` for staffing

**Out of Scope:**

- `site_staffing_requirements` migration
- multi-site staffing engine
- advanced rank/skill/site staffing matrix
- dashboard analytics

**Dependencies:** O1

**Main Risks:**

- Step2 writes foundation data that scheduling does not read
- introducing `sites` accidentally forks staffing truth
- multi-site metadata appears supported while only one site is schedule-active

**Files to Create/Modify:**

- Modify: `migrations/20260408_090000_phase2a2_ops_foundation.sql`
- Create: `src/components/ops/OrganizationProfileForm.vue`
- Create: `src/components/ops/SiteFoundationForm.vue`
- Create: `src/views/ops/OrganizationProfileSetup.vue`
- Create: `src/api/ops.ts`
- Create: `src/types/ops.ts`
- Modify: `src/router/index.ts`
- Modify: `src/views/Dashboard.vue`
- Modify: `src/views/schedule/Step2SiteInfo.vue`
- Modify: `src/stores/organization.ts`
- Modify: `src/types/organization.ts`
- Modify: `src/api/shift.ts`
- Modify: `src/api/employee.ts`
- Create: `tests/unit/phase2-ops-api.spec.ts`
- Modify: `tests/unit/step2-site-info.spec.ts`
- Modify: `tests/unit/dashboard.spec.ts`
- Modify: `tests/unit/organization-store.spec.ts`

**Test Coverage:**

- API tests for organization-profile, sites, and shifts-constraints routes
- Step2 component tests ensuring `site_requirements` stays canonical
- dashboard tests ensuring checklist/deep links reflect real foundation data
- integration test for site save followed by schedule read compatibility

**Rollout / Verification Gate:**

- organization profile saves and reloads cleanly
- exactly one schedule-active site is resolved
- Step2 still reads/writes `site_requirements`
- no schedule-generation regression from site metadata introduction

**Safe Parallelization:**

- organization profile form and API client can proceed in parallel after contracts are frozen
- Step2 compatibility work must wait for the primary-site rule to be fixed

#### Task O2.1: Freeze the foundation contract and single-active-site rule

**Files:**

- Modify: `migrations/20260408_090000_phase2a2_ops_foundation.sql`
- Create: `src/types/ops.ts`
- Create: `src/api/ops.ts`
- Create: `tests/unit/phase2-ops-api.spec.ts`

- [ ] Step 1: Write failing API tests for `organization-profile`, `sites`, and `shifts-constraints`, including the “one schedule-active site” invariant.
- [ ] Step 2: Run `pnpm test:unit -- tests/unit/phase2-ops-api.spec.ts`; expect FAIL because `src/api/ops.ts` does not exist yet.
- [ ] Step 3: Lock migration changes for `sites` and `organization_settings` using the concrete column and constraint set defined in the schema lock; do not add site-scoped staffing tables.
- [ ] Step 4: Implement `src/types/ops.ts` and `src/api/ops.ts` with explicit request/response models.
- [ ] Step 5: Re-run `pnpm test:unit -- tests/unit/phase2-ops-api.spec.ts`; expect PASS.

#### Task O2.2: Wire organization/site foundation into dashboard and setup views

**Files:**

- Create: `src/components/ops/OrganizationProfileForm.vue`
- Create: `src/components/ops/SiteFoundationForm.vue`
- Create: `src/views/ops/OrganizationProfileSetup.vue`
- Modify: `src/router/index.ts`
- Modify: `src/views/Dashboard.vue`
- Modify: `src/stores/organization.ts`
- Modify: `tests/unit/dashboard.spec.ts`

- [ ] Step 1: Write failing dashboard tests for rendering foundation readiness and deep-linking to the organization/site setup screen.
- [ ] Step 2: Run `pnpm test:unit -- tests/unit/dashboard.spec.ts`; expect FAIL because the new ops setup surface is not wired.
- [ ] Step 3: Add narrow ops routes to `src/router/index.ts`; keep the current schedule wizard untouched.
- [ ] Step 4: Implement the organization/site setup view and load/save path through `src/api/ops.ts`.
- [ ] Step 5: Extend `src/stores/organization.ts` only enough to cache foundation data needed across Dashboard and Step2.
- [ ] Step 6: Re-run `pnpm test:unit -- tests/unit/dashboard.spec.ts`; expect PASS.

#### Task O2.3: Preserve `site_requirements` as the canonical staffing source

**Files:**

- Modify: `src/views/schedule/Step2SiteInfo.vue`
- Modify: `src/api/employee.ts`
- Modify: `src/api/shift.ts`
- Modify: `tests/unit/step2-site-info.spec.ts`

- [ ] Step 1: Add a failing Step2 regression test that saves foundation metadata and confirms staffing still reads/writes `site_requirements`.
- [ ] Step 2: Run `pnpm test:unit -- tests/unit/step2-site-info.spec.ts`; expect FAIL on the new compatibility assertion.
- [ ] Step 3: Thread primary-site metadata into Step2 display only; do not change the `replaceSiteRequirements` canonical write path.
- [ ] Step 4: Add any missing helper methods so Step2 can read foundation context without switching staffing tables.
- [ ] Step 5: Re-run `pnpm test:unit -- tests/unit/step2-site-info.spec.ts`; expect PASS.

### Slice O3: Employee Registration and Excel Preparation

**Goal:** Support assisted-pilot employee roster setup through a validate/apply flow that reuses the destructive reset boundary safely.

**In Scope:**

- Excel template definition
- validate-preview flow
- apply flow
- duplicate employee checks
- available-shift validation
- optional `rank_code` capture
- current finalized-month protection reuse

**Out of Scope:**

- employee self-service
- cross-organization sync
- skill matrix onboarding
- historical roster rewrite outside the current unfinalized month

**Dependencies:** O2

**Main Risks:**

- a bad apply silently invalidates pilot data
- finalized-month state is overwritten
- roster apply behavior splits between multiple code paths

**Files to Create/Modify:**

- Modify: `supabase/functions/phase2-ops/contracts.ts`
- Modify: `supabase/functions/phase2-ops/repository.ts`
- Modify: `src/types/employee.ts`
- Modify: `src/types/ops.ts`
- Modify: `src/components/schedule/EmployeeExcelUpload.vue`
- Modify: `src/views/schedule/Step3EmployeeInfo.vue`
- Modify: `src/api/ops.ts`
- Modify: `tests/unit/step3-employee-info.spec.ts`
- Modify: `tests/unit/excel.spec.ts`
- Modify: `tests/e2e/schedule-workflow.spec.ts`

**Test Coverage:**

- validation unit tests for duplicate IDs, invalid shifts, and optional rank-code handling
- Step3 unit tests for validate-preview/apply flow and finalized guard
- E2E regression for assisted import followed by schedule flow

**Rollout / Verification Gate:**

- validate returns a non-destructive preview
- apply uses exactly one destructive write path
- finalized month remains blocked
- current unfinalized month can still be reset intentionally
- null `rank_code` employees fall back to the default organization policy

**Safe Parallelization:**

- Excel parser tests and Step3 UI work can proceed in parallel after validate/apply contracts are frozen
- apply path must stay centralized because it controls destructive writes

#### Task O3.1: Add validate/apply contracts around the existing roster reset boundary

**Files:**

- Modify: `supabase/functions/phase2-ops/contracts.ts`
- Modify: `supabase/functions/phase2-ops/repository.ts`
- Modify: `migrations/20260408_100000_phase2a2_off_request_policy.sql`
- Modify: `src/types/employee.ts`
- Modify: `src/types/ops.ts`
- Modify: `src/api/ops.ts`
- Modify: `tests/unit/phase2-ops-repository.spec.ts`

- [ ] Step 1: Write failing repository tests for `employee-import/validate` and `employee-import/apply`, including duplicate employee IDs, missing shifts, and finalized-month block behavior.
- [ ] Step 2: Run `pnpm test:unit -- tests/unit/phase2-ops-repository.spec.ts`; expect FAIL on the new validate/apply cases.
- [ ] Step 3: Add the nullable `employees.rank_code` column in `migrations/20260408_100000_phase2a2_off_request_policy.sql`; keep null as the default-fallback state.
- [ ] Step 4: Extend employee and ops types with optional `rankCode` and preview payloads only; do not add self-service fields.
- [ ] Step 5: Implement validate as pure preview logic and apply as the only path that calls the existing destructive reset boundary.
- [ ] Step 6: Re-run `pnpm test:unit -- tests/unit/phase2-ops-repository.spec.ts`; expect PASS.

#### Task O3.2: Replace Step3 save behavior with validate then apply

**Files:**

- Modify: `src/components/schedule/EmployeeExcelUpload.vue`
- Modify: `src/views/schedule/Step3EmployeeInfo.vue`
- Modify: `tests/unit/step3-employee-info.spec.ts`
- Modify: `tests/unit/excel.spec.ts`

- [ ] Step 1: Add failing Step3 tests for “validate first, apply second” and “finalized month stays blocked”.
- [ ] Step 2: Run `pnpm test:unit -- tests/unit/step3-employee-info.spec.ts tests/unit/excel.spec.ts`; expect FAIL on the new behavior.
- [ ] Step 3: Update the Excel upload component to surface validation preview results without mutating DB state.
- [ ] Step 4: Update `Step3EmployeeInfo.vue` so Save performs validate preview and Apply performs the destructive write with explicit confirmation.
- [ ] Step 5: Keep the existing finalized protection and current compare-state invalidation copy aligned with the validate/apply flow.
- [ ] Step 6: Re-run `pnpm test:unit -- tests/unit/step3-employee-info.spec.ts tests/unit/excel.spec.ts`; expect PASS.

#### Task O3.3: Lock the assisted pilot roster flow end to end

**Files:**

- Modify: `tests/e2e/schedule-workflow.spec.ts`

- [ ] Step 1: Add a failing E2E path that uploads employees, validates preview, applies roster, and continues into Step4 without rewriting finalized months.
- [ ] Step 2: Run `pnpm test:e2e -- tests/e2e/schedule-workflow.spec.ts`; expect FAIL on the new validate/apply assertions.
- [ ] Step 3: Adjust the UI only as needed to make the validate/apply interaction testable and deterministic.
- [ ] Step 4: Re-run `pnpm test:e2e -- tests/e2e/schedule-workflow.spec.ts`; expect PASS.

### Slice O4: Off Request Policy Management

**Goal:** Add narrow policy management for monthly and annual off-request limits while preserving explainable request rows.

**In Scope:**

- `organization_rank_codes`
- `off_request_policy_rules`
- default organization policy when `rank_code` is null
- policy row validation
- `schedule_preferences.policy_check_status`
- `schedule_preferences.policy_rejection_reason`

**Out of Scope:**

- approval workflow
- employee-facing request portal
- retroactive rewrite of old evaluation artifacts
- solver cost-function tuning

**Dependencies:** O3

**Main Risks:**

- policy changes silently change operator meaning
- rankless employees behave inconsistently
- rejected requests disappear instead of remaining explainable

**Files to Create/Modify:**

- Create: `migrations/20260408_100000_phase2a2_off_request_policy.sql`
- Modify: `supabase/functions/phase2-ops/contracts.ts`
- Modify: `supabase/functions/phase2-ops/repository.ts`
- Create: `src/components/ops/OffRequestPolicyTable.vue`
- Create: `src/views/ops/OffRequestPolicySetup.vue`
- Modify: `src/router/index.ts`
- Modify: `src/api/ops.ts`
- Modify: `src/types/ops.ts`
- Modify: `src/types/schedule.ts`
- Modify: `src/api/schedule.ts`
- Modify: `supabase/functions/phase2-schedule/repository.ts`
- Modify: `src/views/schedule/Step4InitialData.vue`
- Modify: `src/views/schedule/Step5Result.vue`
- Create: `tests/unit/phase2-ops-checklist.spec.ts`
- Modify: `tests/unit/step4-initial-data.spec.ts`
- Modify: `tests/unit/phase2-schedule-write-repository.spec.ts`

**Test Coverage:**

- policy validation and fallback reducer tests
- repository tests for policy CRUD and request explanation persistence
- Step4 tests showing rejected requests remain visible with reason
- Step5/read-model tests ensuring policy status is explainable
- policy tests proving null-rank employees use the organization default rule while ranked employees use rank-specific overrides

**Rollout / Verification Gate:**

- default org policy works when no rank code is present
- rank-specific rules override defaults predictably
- rejected requests persist as rows with visible reason
- old finalized evaluations are not rewritten

**Safe Parallelization:**

- policy UI can proceed in parallel with checklist reducer work after contracts freeze
- `schedule_preferences` mutation logic stays centralized

#### Task O4.1: Freeze policy schema and CRUD contracts

**Files:**

- Create: `migrations/20260408_100000_phase2a2_off_request_policy.sql`
- Modify: `supabase/functions/phase2-ops/contracts.ts`
- Modify: `supabase/functions/phase2-ops/repository.ts`
- Modify: `src/types/ops.ts`
- Modify: `src/api/ops.ts`
- Create: `src/components/ops/OffRequestPolicyTable.vue`
- Create: `src/views/ops/OffRequestPolicySetup.vue`

- [ ] Step 1: Write failing contract/repository tests for rank/default policy CRUD, invalid overlap cases, null-rank employee fallback to the organization default policy, and rejection of a second active default rule for the same organization/period.
- [ ] Step 2: Run `pnpm test:unit -- tests/unit/phase2-ops-contracts.spec.ts tests/unit/phase2-ops-repository.spec.ts`; expect FAIL on the new policy paths.
- [ ] Step 3: Add the migration for `employees.rank_code`, `organization_rank_codes`, `off_request_policy_rules`, and `schedule_preferences` explanation columns.
- [ ] Step 4: Implement policy CRUD in `phase2-ops` and wire the read/write client and setup view.
- [ ] Step 5: Re-run `pnpm test:unit -- tests/unit/phase2-ops-contracts.spec.ts tests/unit/phase2-ops-repository.spec.ts`; expect PASS.

#### Task O4.2: Persist policy-check outcomes on request rows without a new public request-write API

**Files:**

- Modify: `supabase/functions/phase2-schedule/repository.ts`
- Modify: `src/types/schedule.ts`
- Modify: `src/api/schedule.ts`
- Modify: `src/views/schedule/Step4InitialData.vue`
- Modify: `src/views/schedule/Step5Result.vue`
- Modify: `tests/unit/step4-initial-data.spec.ts`
- Modify: `tests/unit/phase2-schedule-write-repository.spec.ts`

- [ ] Step 1: Add failing repository tests that recheck/save requests and expect `policy_check_status` plus `policy_rejection_reason` to persist on `schedule_preferences`.
- [ ] Step 2: Run `pnpm test:unit -- tests/unit/phase2-schedule-write-repository.spec.ts tests/unit/step4-initial-data.spec.ts`; expect FAIL on the new policy assertions.
- [ ] Step 3: Implement server-side policy evaluation in the existing schedule read/write path so browser code does not become the policy engine.
- [ ] Step 4: Extend Step4 and Step5 to display visible rejection reasons while keeping rejected rows present.
- [ ] Step 5: Re-run `pnpm test:unit -- tests/unit/phase2-schedule-write-repository.spec.ts tests/unit/step4-initial-data.spec.ts`; expect PASS.

### Slice O5: Rolling Fairness Ledger

**Goal:** Add finalized-only rolling fairness persistence with idempotent writes and safe aggregate reads.

**In Scope:**

- finalized-time ledger write
- idempotent write behavior
- 3/6/12 month aggregate read models
- read-only operator fairness summary consumption

**Out of Scope:**

- fairness-aware solver tuning
- reopen/unfinalize flow
- public fairness write endpoint
- retrospective mutation of old finalized months

**Dependencies:** O4 and the existing `phase2-schedule` finalize transaction

**Main Risks:**

- duplicate writes on finalize retry
- draft/review/compare versions contaminating ledger state
- fairness summary diverging from finalized history

**Files to Create/Modify:**

- Create: `migrations/20260408_110000_phase2a2_fairness_ledger.sql`
- Modify: `supabase/functions/phase2-schedule/repository.ts`
- Modify: `src/types/ops.ts`
- Modify: `src/api/ops.ts`
- Modify: `src/views/schedule/Step5Result.vue`
- Modify: `tests/unit/phase2-schedule-write-repository.spec.ts`
- Create: `tests/unit/phase2-ops-checklist.spec.ts`

**Test Coverage:**

- repository tests for finalize write idempotency and blocked writes on non-finalized states
- checklist/read-model tests for 3/6/12 month aggregates
- E2E regression verifying compare-only versions never write the ledger

**Rollout / Verification Gate:**

- finalize writes exactly once per finalized version
- repeated finalize callback/retry does not duplicate ledger rows
- draft/review states produce `fairness_ledger_write_blocked`
- read-only summary matches finalized history only

**Safe Parallelization:**

- read-only summary UI can proceed in parallel with aggregate SQL once response contract is frozen
- finalize integration stays centralized inside `phase2-schedule`

#### Task O5.1: Add finalized-only ledger schema and internal write helper

**Files:**

- Create: `migrations/20260408_110000_phase2a2_fairness_ledger.sql`
- Modify: `supabase/functions/phase2-schedule/repository.ts`
- Modify: `tests/unit/phase2-schedule-write-repository.spec.ts`

- [ ] Step 1: Write failing repository tests for finalize success, finalize retry, and blocked writes for draft/review/compare-only versions.
- [ ] Step 2: Run `pnpm test:unit -- tests/unit/phase2-schedule-write-repository.spec.ts`; expect FAIL on the new fairness ledger cases.
- [ ] Step 3: Create the ledger migration with a uniqueness guarantee keyed to the finalized version identity so retries cannot double-write.
- [ ] Step 4: Extend `finalizeVersion` internals to call the ledger upsert helper inside the existing finalization boundary only.
- [ ] Step 5: Emit `fairness_ledger_write_attempted`, `..._succeeded`, and `..._blocked` structured logs from the internal write path.
- [ ] Step 6: Re-run `pnpm test:unit -- tests/unit/phase2-schedule-write-repository.spec.ts`; expect PASS.

#### Task O5.2: Expose read-only rolling fairness aggregates without a new write surface

**Files:**

- Modify: `src/types/ops.ts`
- Modify: `src/api/ops.ts`
- Modify: `supabase/functions/phase2-ops/repository.ts`
- Create: `tests/unit/phase2-ops-checklist.spec.ts`
- Modify: `src/views/schedule/Step5Result.vue`

- [ ] Step 1: Write failing checklist/reducer tests for 3/6/12 month aggregate reads derived only from finalized ledger rows.
- [ ] Step 2: Run `pnpm test:unit -- tests/unit/phase2-ops-checklist.spec.ts`; expect FAIL because fairness summary reduction is missing.
- [ ] Step 3: Add read-only aggregate queries to `phase2-ops` checklist response; do not add a dedicated write route.
- [ ] Step 4: Surface the fairness summary in Step5 or checklist UI as read-only context only.
- [ ] Step 5: Re-run `pnpm test:unit -- tests/unit/phase2-ops-checklist.spec.ts`; expect PASS.

### Slice O6: Guided Checklist / Pilot Entry

**Goal:** Guide the pilot admin through the minimum required setup and block go-live entry until derived readiness is satisfied.

**In Scope:**

- checklist API
- derived step completion
- deep-links to relevant setup screens
- `onboarding_progress` cursor updates
- pilot entry gate based on real data

**Out of Scope:**

- self-serve onboarding wizard
- adaptive automation
- advanced dashboard
- manual override of derived readiness

**Dependencies:** O1 through O5

**Main Risks:**

- checklist becomes cosmetic
- manual completion drifts from actual data
- pilot admin sees “ready” before real setup is complete

**Files to Create/Modify:**

- Create: `supabase/functions/phase2-ops/checklist.ts`
- Modify: `supabase/functions/phase2-ops/contracts.ts`
- Modify: `supabase/functions/phase2-ops/repository.ts`
- Create: `src/components/ops/PilotChecklistCard.vue`
- Modify: `src/views/Dashboard.vue`
- Modify: `src/router/index.ts`
- Create: `tests/unit/phase2-ops-checklist.spec.ts`
- Create: `tests/e2e/pilot-checklist.spec.ts`

**Test Coverage:**

- pure reducer tests for each readiness slice
- dashboard tests for deep-link rendering and blocked states
- E2E checklist flow from first login through ready state

**Rollout / Verification Gate:**

- checklist completion is derived from data, not manual toggles
- `onboarding_progress` remembers cursor but does not force readiness
- go-live entry stays blocked until O1-O5 are complete

**Safe Parallelization:**

- reducer tests and dashboard component work can proceed in parallel after the checklist contract freezes
- final readiness logic must stay centralized in `phase2-ops/checklist.ts`

#### Task O6.1: Implement pure checklist reduction and contract shape

**Files:**

- Create: `supabase/functions/phase2-ops/checklist.ts`
- Modify: `supabase/functions/phase2-ops/contracts.ts`
- Modify: `supabase/functions/phase2-ops/repository.ts`
- Create: `tests/unit/phase2-ops-checklist.spec.ts`

- [ ] Step 1: Write failing reducer tests for each derived checklist item and for “blocked” states when required tables are still empty.
- [ ] Step 2: Run `pnpm test:unit -- tests/unit/phase2-ops-checklist.spec.ts`; expect FAIL because the reducer does not exist yet.
- [ ] Step 3: Implement `checklist.ts` as a pure reducer that consumes repository snapshots and fairness summary reads.
- [ ] Step 4: Implement `GET /checklist` and `PATCH /checklist` so derived readiness stays authoritative and `onboarding_progress` only stores cursor/navigation metadata.
- [ ] Step 5: Re-run `pnpm test:unit -- tests/unit/phase2-ops-checklist.spec.ts`; expect PASS.

#### Task O6.2: Surface pilot entry in the existing dashboard shell

**Files:**

- Create: `src/components/ops/PilotChecklistCard.vue`
- Modify: `src/views/Dashboard.vue`
- Modify: `src/router/index.ts`
- Modify: `tests/unit/dashboard.spec.ts`
- Create: `tests/e2e/pilot-checklist.spec.ts`

- [ ] Step 1: Add failing dashboard and E2E tests for a checklist card that links to organization profile, Step2, Step3, policy setup, and final schedule review.
- [ ] Step 2: Run `pnpm test:unit -- tests/unit/dashboard.spec.ts` and `pnpm test:e2e -- tests/e2e/pilot-checklist.spec.ts`; expect FAIL because the checklist entry surface does not exist yet.
- [ ] Step 3: Implement the checklist card in `Dashboard.vue`; keep the rest of the dashboard narrow and non-analytic.
- [ ] Step 4: Add route/deep-link plumbing to the new setup screens and existing schedule steps.
- [ ] Step 5: Re-run `pnpm test:unit -- tests/unit/dashboard.spec.ts` and `pnpm test:e2e -- tests/e2e/pilot-checklist.spec.ts`; expect PASS.

## Centralized Verification Gates

Run after each slice:

- `pnpm test:unit -- tests/unit/<targeted-specs>`
- `pnpm lint:check`

Run after O3:

- `pnpm test:e2e -- tests/e2e/schedule-workflow.spec.ts`

Run after O6:

- `pnpm test:e2e -- tests/e2e/pilot-checklist.spec.ts tests/e2e/schedule-workflow.spec.ts`

Before marking Phase2A-2 complete:

- `pnpm test:unit -- tests/unit/phase2-ops-contracts.spec.ts tests/unit/phase2-ops-repository.spec.ts tests/unit/phase2-ops-api.spec.ts tests/unit/phase2-ops-checklist.spec.ts tests/unit/phase2-schedule-write-repository.spec.ts tests/unit/step2-site-info.spec.ts tests/unit/step3-employee-info.spec.ts tests/unit/step4-initial-data.spec.ts tests/unit/dashboard.spec.ts`
- `pnpm test:e2e -- tests/e2e/pilot-checklist.spec.ts tests/e2e/schedule-workflow.spec.ts`
- `pnpm lint:check`

## Deferred Even Within Phase2A-2

These stay deferred even if adjacent schema already exists:

- solver consumption of rolling fairness context
- canonical migration from `site_requirements` to `site_staffing_requirements`
- reopen/unfinalize or fairness correction workflow
- self-signup or invite-driven onboarding
- approval queue semantics
- membership-based auth rewrite
- full RBAC
- advanced operations dashboard or analytics
- any Phase2B self-serve feature

## NOT in Scope

- public fairness-ledger write API
- approval workflows
- self-signup
- multi-organization self-serve onboarding
- broad Trust Layer redesign
- analytics dashboard
- solver fairness tuning
