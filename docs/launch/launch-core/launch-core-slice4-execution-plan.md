# Launch Core Slice 4 Execution Plan

## Goal

Keep legacy app URLs usable during the launch window by redirecting them to canonical `/app` URLs without changing auth policy, schedule workflow behavior, or public landing content.

## Scope

- Keep the existing `LEGACY_APP_ROUTE_REDIRECTS` map and Step5 legacy redirect route.
- Export `normalizeAppContractPath(path)` from `src/constants/routes.ts`.
- Make router guards and Dashboard checklist navigation consume that shared helper instead of local normalization.
- Expand unit coverage for all static legacy redirects plus Step5 query/hash/replace preservation.
- Update launch E2E specs and shared helpers so authenticated landing waits and checklist clicks assert canonical `/app` destinations.

## Verification Gate

- `pnpm lint:check`
- `pnpm exec vitest run tests/unit/router-index.spec.ts tests/unit/router-guards.spec.ts tests/unit/dashboard.spec.ts tests/unit/sidebar.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts`
- `pnpm test:e2e -- tests/e2e/public-launch.spec.ts tests/e2e/multi-org-rbac.spec.ts tests/e2e/pilot-checklist.spec.ts`

## Current Status

- Unit and lint gates pass locally.
- The dependency-skipped Playwright spec run passes locally for `public-launch`, `multi-org-rbac`, and `pilot-checklist`.
- The full Playwright gate is blocked locally until `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` are available for the setup project.
