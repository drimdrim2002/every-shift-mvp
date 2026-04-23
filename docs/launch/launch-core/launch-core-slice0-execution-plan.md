# Launch Core Slice 0 Execution Plan

> Source slice: [launch-core-implementation-slices.md](./launch-core-implementation-slices.md#slice-0-route-semantics-freeze)

## Outcome

Freeze route semantics before any `/app` route tree or public landing work starts.

After Slice 0:

- `/` means public root only
- `/app` means authenticated workspace root only
- route constants express both meanings explicitly
- Launch Core path owners stop introducing new raw path strings
- the remaining migration surface is tracked as a checklist instead of being implicit

## Review Summary

The slice definition is directionally correct, but the current repo state needs two adjustments before implementation starts:

1. `src/constants/routes.ts` still treats `/` as authenticated home and still exposes canonical `/admin` and `/home` paths.
2. raw path usage is broader than the slice checklist currently states, especially in `src/views/ops/OffRequestPolicySetup.vue` and unit/E2E helper code.

Slice 0 should therefore freeze semantics and centralize builders first, but avoid changing the visible route tree yet. The repo should become contract-driven before Slice 2 introduces canonical `/app` routes.

## Current-State Findings

### Semantic conflicts already in code

- `HOME_ROUTE_PATH = '/'` currently represents authenticated home in [src/constants/routes.ts](/Users/brown/workspace/every-shift-mvp/src/constants/routes.ts:3)
- `resolvePostAuthRedirectPath()` still sends active admins to `/` and active users to `/home/user` in [src/constants/routes.ts](/Users/brown/workspace/every-shift-mvp/src/constants/routes.ts:18)
- authenticated workspace layout is still mounted at `/` in [src/router/index.ts](/Users/brown/workspace/every-shift-mvp/src/router/index.ts:52)
- auth guards still special-case `/` as the authenticated landing surface in [src/router/guards.ts](/Users/brown/workspace/every-shift-mvp/src/router/guards.ts:39)

### Additional raw path owners not fully called out in the slice doc

- `src/views/ops/OffRequestPolicySetup.vue`
- `tests/e2e/multi-org-rbac.spec.ts`
- `tests/e2e/pilot-checklist.spec.ts`
- `tests/unit/login-view.spec.ts`
- `tests/unit/step1-basic-info.spec.ts`
- `tests/unit/step2-site-info.spec.ts`
- `tests/unit/step3-employee-info.spec.ts`
- `tests/unit/step4-initial-data.spec.ts`
- `tests/unit/phase2-ops-contracts.spec.ts`
- `tests/unit/phase2-ops-checklist.spec.ts`

### Raw path census command

Use this before and after the slice:

```bash
rg -n "'/((admin|home|ops|schedule)|app)" src tests
```

Use this to track affected files:

```bash
rg -l "'/((admin|home|ops|schedule)|app)" src tests
```

## Scope Boundary For Slice 0

### In scope

- define route semantics in constants and helpers
- introduce canonical builders for public root, app root, approval queue, user home, ops routes, schedule step routes, and Step5
- define an explicit legacy redirect map as data
- replace the highest-risk raw strings in contract-owner files
- convert the remaining raw path surface into a tracked follow-up checklist
- extend unit tests that lock the semantic split

### Explicitly not in scope

- mounting `DefaultLayout` under `/app`
- adding legacy redirect routes in the router
- shipping the landing page UI
- changing production-visible route behavior beyond contract semantics and tests

## Files To Change In Slice 0

### Primary contract files

- `src/constants/routes.ts`
- `src/router/guards.ts`
- `src/router/index.ts`

### First-wave caller updates

- `src/views/Dashboard.vue`
- `src/components/layout/Sidebar.vue`
- `src/views/schedule/Step1BasicInfo.vue`
- `src/views/schedule/Step2SiteInfo.vue`
- `src/views/schedule/Step3EmployeeInfo.vue`
- `src/views/schedule/Step4InitialData.vue`
- `src/views/schedule/Step5Result.vue`
- `src/views/ops/OffRequestPolicySetup.vue`
- `tests/e2e/helpers.ts`

### Tests to update now

- `tests/unit/router-index.spec.ts`
- `tests/unit/router-guards.spec.ts`
- `tests/unit/router-auth-guards.spec.ts`
- `tests/unit/dashboard.spec.ts`
- `tests/unit/sidebar.spec.ts`
- `tests/unit/schedule-version-resolver.spec.ts`
- `tests/unit/step5-result.spec.ts`
- `tests/unit/login-view.spec.ts`

### Tests to census and track, not necessarily fully migrate in Slice 0

- `tests/e2e/multi-org-rbac.spec.ts`
- `tests/e2e/pilot-checklist.spec.ts`
- `tests/unit/step1-basic-info.spec.ts`
- `tests/unit/step2-site-info.spec.ts`
- `tests/unit/step3-employee-info.spec.ts`
- `tests/unit/step4-initial-data.spec.ts`
- `tests/unit/phase2-ops-contracts.spec.ts`
- `tests/unit/phase2-ops-checklist.spec.ts`

## Contract To Freeze

Add these exported constants and helpers in `src/constants/routes.ts`:

```ts
export const PUBLIC_ROOT_ROUTE_PATH = '/';
export const APP_HOME_ROUTE_PATH = '/app';

export const LEGACY_APPROVAL_QUEUE_ROUTE_PATH = '/admin/approval-queue';
export const LEGACY_USER_HOME_ROUTE_PATH = '/home/user';
export const LEGACY_OPS_ORGANIZATION_SETUP_ROUTE_PATH = '/ops/organization-setup';
export const LEGACY_OPS_OFF_REQUEST_POLICY_SETUP_ROUTE_PATH = '/ops/off-request-policy-setup';
export const LEGACY_SCHEDULE_STEP1_ROUTE_PATH = '/schedule/step1';
export const LEGACY_SCHEDULE_STEP2_ROUTE_PATH = '/schedule/step2';
export const LEGACY_SCHEDULE_STEP3_ROUTE_PATH = '/schedule/step3';
export const LEGACY_SCHEDULE_STEP4_ROUTE_PATH = '/schedule/step4';
```

Also add canonical builders:

- `getAppHomeRoutePath()`
- `getApprovalQueueRoutePath()`
- `getUserHomeRoutePath()`
- `getOpsOrganizationSetupRoutePath()`
- `getOpsOffRequestPolicySetupRoutePath()`
- `getScheduleStepRoutePath(step: 1 | 2 | 3 | 4)`
- `getScheduleStep5RoutePath(scheduleKey: string)`

Also add route classifiers:

- `isPublicRootRoutePath(path: string)`
- `isAppRoutePath(path: string)`
- `isLegacyAppRoutePath(path: string)`
- `getLegacyRedirectTarget(path: string)`

The important constraint is naming:

- do not keep `HOME_ROUTE_PATH` as an overloaded concept
- distinguish public root, app root, canonical app destinations, and legacy app destinations in names

## Concrete Execution Order

1. Baseline the current behavior.
   Run the slice baseline commands and save the current redirect matrix for `/`, `/login`, `/signup`, `/access/*`, `/admin/*`, `/home/*`, `/ops/*`, `/schedule/*`.

2. Refactor `src/constants/routes.ts` into a semantic contract file.
   Add public root and app root constants, canonical builders, Step5 builder, and a typed legacy redirect map.

3. Update guard logic to depend on semantics, not raw paths.
   Replace `/`-based authenticated-home checks in `resolveAuthNavigationTarget()`, `resolveRouteAccessTarget()`, and `stepProgressGuard()` with route helpers.

4. Update router references without changing the main route tree yet.
   Import the new helpers into `src/router/index.ts`, but keep the current mounted tree stable until Slice 2.

5. Replace high-risk caller-owned raw strings.
   Start with `Dashboard.vue`, `Sidebar.vue`, `Step1BasicInfo.vue` through `Step5Result.vue`, `OffRequestPolicySetup.vue`, and `tests/e2e/helpers.ts`.

6. Lock the contract with unit tests.
   Add assertions that public root and app root are distinct, that redirect helpers resolve canonical `/app` targets, and that Step5 builders/self-heal paths do not fall back to `/`.

7. Run the post-slice census.
   Re-run `rg` and capture remaining raw paths as Slice 1 or Slice 4 migration items instead of continuing ad hoc edits.

## Implementation Notes By Area

### `src/constants/routes.ts`

- keep auth routes and access-state routes as fixed constants
- change post-auth resolution to return canonical `/app` destinations
- keep legacy destinations exported only as legacy compatibility constants
- prefer builder functions over string concatenation in callers

### `src/router/guards.ts`

- `resolveAuthNavigationTarget()` should interpret `/` as public root
- authenticated users hitting `/` should resolve toward canonical `/app` targets at the helper level, even if router mounting has not moved yet
- Step guard comparisons should use builders for step routes
- Step5 invalid access should not rely on `/` meaning dashboard

### `src/router/index.ts`

- prepare imports and tests for the split, but do not fully move layout ownership in Slice 0
- keep this slice mergeable by avoiding half-migrated route registration

### `Dashboard.vue` and `Sidebar.vue`

- replace schedule, ops, and Step5 string checks with helpers
- keep selection and active-state logic aligned with the future canonical contract
- make any remaining legacy assumptions explicit with comments or TODO markers only if unavoidable

### Schedule step views

- replace forward and backward navigation raw strings with step builders
- Step5 “back to step4” and “restart from step1” flows should already be canonical-helper based before `/app` routes exist

### `tests/e2e/helpers.ts`

- stop assuming authenticated landing is one of `/`, `/admin/approval-queue`, `/home/user`
- introduce helper predicates that can later accept canonical `/app` and temporary legacy routes during the coexistence window

## Test Plan

### Baseline before edits

```bash
pnpm lint:check
pnpm test:unit -- tests/unit/router-index.spec.ts tests/unit/router-guards.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/login-view.spec.ts tests/unit/dashboard.spec.ts tests/unit/sidebar.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts
```

### Slice 0 gate

```bash
pnpm lint:check
pnpm test:unit -- tests/unit/router-index.spec.ts tests/unit/router-guards.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/login-view.spec.ts tests/unit/dashboard.spec.ts tests/unit/sidebar.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts
```

### Assertions to add or strengthen

- route constants expose distinct public and app roots
- post-auth redirects resolve to `/app`, `/app/home/user`, or `/app/admin/approval-queue` as appropriate
- auth pages redirect authenticated users to canonical `/app` destinations
- sidebar and dashboard navigation use route helpers instead of hard-coded strings
- Step5 path builders preserve `scheduleKey`

## Definition Of Done

Slice 0 is complete only if all of the following are true:

- no one can reasonably confuse public root and authenticated home by reading `src/constants/routes.ts`
- new route helpers cover approval queue, user home, ops setup, schedule steps, and Step5
- legacy route support is represented as an explicit map, not scattered string literals
- high-risk Launch Core owners no longer introduce raw route strings
- remaining raw paths are documented as follow-up items with clear file ownership
- `pnpm lint:check` is green
- the Slice 0 unit gate is green

## Recommended Commit Boundary

Use one commit for this slice:

```text
chore: freeze launch route semantics
```

## Suggested Follow-Up Hand-Off To Slice 1

When Slice 0 lands, Slice 1 should start from this exact checklist:

- finish replacing remaining raw route strings found by the post-slice census
- convert any temporary compatibility helpers into the single Launch Core route contract
- make `src/router/index.ts`, guards, layout navigation, and tests consume the same builder set with no direct path ownership left in Launch Core code
