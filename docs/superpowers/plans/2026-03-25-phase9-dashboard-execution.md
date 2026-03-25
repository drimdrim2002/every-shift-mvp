# Phase 9 Dashboard Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the real Phase 9 dashboard backlog by aligning route/RBAC landing first, then finishing the analytics backend, live pages, filter persistence, E2E coverage, and export flow.

**Architecture:** Treat Phase 9 as a dependency chain, not twelve unrelated items. First lock the route and access baseline so every later page uses the correct landing and route surface. Then close the shared dashboard contract and SQL/RPC boundary, finish the admin and employee pages on top of that live data path, add persistence and E2E coverage, and only then implement export on the stabilized admin dashboard surface.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vue Router, Naive UI, Vitest, Playwright, Supabase SQL migrations, Supabase Edge Functions

---

## Current Audit Summary

- `src/types/dashboard.ts`, `src/api/dashboard.ts`, `src/stores/dashboard.ts` already contain substantial `P9-1.2` scaffolding.
- `src/views/dashboard/AdminDashboard.vue` already contains substantial `P9-2.1` work and has absorbed legacy schedule operations from `src/views/Dashboard.vue`.
- `src/constants/routes.ts`, `src/router/index.ts`, `src/views/auth/Login.vue`, and `src/components/layout/Sidebar.vue` still use the pre-P9 landing baseline in parts of the runtime.
- `/dashboard/employee` does not exist yet.
- `migrations/015_dashboard_analytics_rpc.sql`, `src/api/dashboard-export.ts`, `supabase/functions/dashboard-export/index.ts`, `tests/e2e/dashboard.spec.ts`, and `tests/e2e/dashboard-export.spec.ts` do not exist yet.
- `docs/API_SPEC.md` and `docs/verification/test-validation-guide.md` already contain partial Phase 9 documentation and should be updated in place instead of rewritten.

## Critical Path

1. `P9-1.1` route split and landing baseline
2. `P9-1.2` contract/store/api drift cleanup
3. `P9-1.3` analytics RPC migration
4. `P9-1.4` fixture and executable verification assets
5. `P9-2.1` admin dashboard live wiring
6. `P9-2.2` employee dashboard page
7. `P9-2.3` filter persistence and restore
8. `P9-2.4` dashboard Playwright coverage
9. `P9-3.1` export contract
10. `P9-3.2` export backend
11. `P9-3.3` export UI
12. `P9-3.4` export integration and E2E validation

## Task 1: Close P9-1.1 Route Split And Landing Baseline

**Files:**

- Modify: `src/constants/routes.ts`
- Modify: `src/router/index.ts`
- Modify: `src/views/auth/Login.vue`
- Modify: `src/components/layout/Sidebar.vue`
- Create: `src/views/dashboard/EmployeeDashboard.vue`
- Test: `tests/unit/router-auth-guards.spec.ts`

- [ ] **Step 1: Write the failing route guard tests**

Add coverage for:

- `user_active` auth-page redirect to `/dashboard/employee`
- `admin_active` and `super_active` auth-page redirect to `/dashboard/admin`
- `user_active` direct access deny on `/dashboard/admin`
- `user_active` successful access to `/dashboard/employee`
- completed `admin_active` and `user_active` `/onboarding` redirect using the new landing policy

- [ ] **Step 2: Run the targeted test to verify RED**

Run: `pnpm exec vitest run tests/unit/router-auth-guards.spec.ts`
Expected: FAIL because the runtime still redirects active users to `/schedule/step1` and has no employee dashboard route.

- [ ] **Step 3: Implement the minimal route baseline**

Implementation notes:

- add `EMPLOYEE_DASHBOARD_ROUTE_PATH`
- replace static `POST_AUTH_REDIRECT_PATH` usage with access-state-based resolution
- keep `/` as an onboarding compatibility target when the onboarding deep-link query requires it
- redirect normal `/` visits to the correct dashboard landing
- expose `관리자 대시보드` only to `super/admin`
- expose `직원 대시보드` to `super/admin/user`
- keep `근무표 생성` hidden from `user_active`
- add a minimal `EmployeeDashboard.vue` shell that can be expanded by `P9-2.2`

- [ ] **Step 4: Re-run the targeted test to verify GREEN**

Run: `pnpm exec vitest run tests/unit/router-auth-guards.spec.ts`
Expected: PASS

- [ ] **Step 5: Run adjacent route regression**

Run: `pnpm exec vitest run tests/unit/onboarding-context.spec.ts tests/unit/router-auth-guards.spec.ts`
Expected: PASS, confirming `/` onboarding compatibility still works.

## Task 2: Reconcile P9-1.2 Shared Dashboard Scaffolding

**Files:**

- Modify: `src/types/dashboard.ts`
- Modify: `src/stores/dashboard.ts`
- Modify: `src/api/dashboard.ts`
- Test: `tests/unit/dashboard-api.spec.ts`
- Test: `tests/unit/dashboard-store.spec.ts`

- [ ] **Step 1: Add tests for any missing drift discovered after Task 1**

Focus on:

- route baseline assumptions reflected in store initialization
- admin vs employee scope handling
- dead fields or placeholder state no longer used by the runtime

- [ ] **Step 2: Run dashboard unit tests to verify RED when drift exists**

Run: `pnpm exec vitest run tests/unit/dashboard-api.spec.ts tests/unit/dashboard-store.spec.ts`

- [ ] **Step 3: Apply minimal contract/store/API cleanup**

Implementation notes:

- keep RPC names and parameter names aligned with `docs/API_SPEC.md`
- preserve cache and blocked state behavior already covered by tests
- remove speculative or unused contract surface only when no caller depends on it

- [ ] **Step 4: Re-run dashboard unit tests**

Run: `pnpm exec vitest run tests/unit/dashboard-api.spec.ts tests/unit/dashboard-store.spec.ts`
Expected: PASS

## Task 3: Implement P9-1.3 Analytics RPC Migration

**Files:**

- Create: `migrations/015_dashboard_analytics_rpc.sql`
- Modify: `docs/API_SPEC.md`
- Reference: `src/api/dashboard.ts`

- [ ] **Step 1: Write the SQL contract checklist into the migration draft**

Cover:

- `get_admin_dashboard_stats`
- `get_employee_dashboard_stats`
- finalized schedule states only
- super organization scope requirement
- admin override deny
- employee dependency state when employee mapping is missing

- [ ] **Step 2: Implement the migration**

Implementation notes:

- keep SQL function parameter names exactly matched to the frontend wrapper
- emit explicit dashboard error codes/messages
- scope with `auth.uid()`

- [ ] **Step 3: Update API spec to the implemented SQL contract**

- [ ] **Step 4: Apply and verify the migration against Supabase only after explicit user confirmation**

Run after approval:

- schema migration apply
- schema cache verification for both RPC functions

## Task 4: Implement P9-1.4 Fixture And Verification Assets

**Files:**

- Modify: `supabase/seed.sql`
- Modify: `docs/verification/test-validation-guide.md`

- [ ] **Step 1: Add deterministic dashboard fixture rows and expected values**

- [ ] **Step 2: Document executable verification steps**

Must specify exact:

- target route or RPC
- actor account
- fixture month
- expected night/weekend metrics
- tenant isolation case
- dependency-state case

## Task 5: Finish P9-2.1 Admin Dashboard Live Wiring

**Files:**

- Modify: `src/views/dashboard/AdminDashboard.vue`
- Modify: `src/router/index.ts`
- Reference: `docs/specs/p9/P9-2.1-admin-dashboard-ia.md`

- [ ] **Step 1: Add or tighten tests around any missing live wiring**

- [ ] **Step 2: Connect blocked/error/empty/loading and live RPC response consistently**

- [ ] **Step 3: Verify schedule operations remain on `/dashboard/admin`**

## Task 6: Build P9-2.2 Employee Dashboard Live Page

**Files:**

- Modify: `src/views/dashboard/EmployeeDashboard.vue`
- Modify: `src/constants/routes.ts`
- Modify: `src/router/index.ts`

- [ ] **Step 1: Write the failing route/page test coverage**

- [ ] **Step 2: Implement the employee dashboard shell with live store wiring**

Must include:

- personal summary
- monthly calendar surface
- dependency state for `employee_mapping_required`
- employee-perspective behavior for `super/admin`

- [ ] **Step 3: Verify `user_active` landing and `/dashboard/admin` deny behavior**

## Task 7: Implement P9-2.3 Filter Persistence And Restore

**Files:**

- Modify: `src/stores/dashboard.ts`
- Modify: `src/views/dashboard/AdminDashboard.vue`
- Modify: `src/views/dashboard/EmployeeDashboard.vue`

- [ ] **Step 1: Choose and document the canonical restore policy in code**

- [ ] **Step 2: Implement query/store restoration with stale-scope sanitation**

- [ ] **Step 3: Add tests for refresh and revisit behavior**

## Task 8: Implement P9-2.4 Dashboard Playwright Coverage

**Files:**

- Create: `tests/e2e/dashboard.spec.ts`
- Modify: `docs/verification/test-validation-guide.md`

- [ ] **Step 1: Cover `/dashboard/admin` route and filter behavior**
- [ ] **Step 2: Cover `/dashboard/employee` route and dependency state**
- [ ] **Step 3: Cover RBAC deny and tenant isolation**

## Task 9: Define And Implement Export (P9-3.1 To P9-3.4)

**Files:**

- Modify: `docs/API_SPEC.md`
- Create: `supabase/functions/dashboard-export/index.ts`
- Create: `src/api/dashboard-export.ts`
- Modify: `src/views/dashboard/AdminDashboard.vue`
- Create: `tests/e2e/dashboard-export.spec.ts`
- Modify: `docs/verification/test-validation-guide.md`

- [ ] **Step 1: Lock the export request/response/report schema**
- [ ] **Step 2: Implement the backend export boundary**
- [ ] **Step 3: Implement admin dashboard export UI**
- [ ] **Step 4: Add integration and E2E verification for export content and scope**

## Verification Gate

- [ ] Run: `pnpm exec vitest run tests/unit/router-auth-guards.spec.ts tests/unit/onboarding-context.spec.ts tests/unit/dashboard-api.spec.ts tests/unit/dashboard-store.spec.ts`
- [ ] Run: `pnpm lint:check`
- [ ] Run Playwright dashboard suites after the E2E tasks exist
- [ ] For any Supabase write operation, report exact SQL/function changes and observed result

## Immediate Execution Choice For This Session

Start with `Task 1` and `Task 2` inline in this session:

1. They are the shortest path to removing current runtime drift.
2. They unblock every later dashboard page and E2E task.
3. They only touch the current Vue/Router/Pinia surface and do not require remote DB writes yet.
