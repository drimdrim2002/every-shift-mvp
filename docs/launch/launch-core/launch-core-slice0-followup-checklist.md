# Launch Core Slice 0 Follow-Up Checklist

Post-slice census command:

```bash
rg -l \"'/((admin|home|ops|schedule)|app)|\\\"/((admin|home|ops|schedule)|app)\" src tests
```

Remaining owners after Slice 0:

- Compatibility internals to remove in Slice 1
  - `src/router/index.ts`
  - `src/components/layout/Sidebar.vue`
  - `src/constants/routes.ts`
- Route-adjacent tests still asserting compatibility literals
  - `tests/unit/router-guards.spec.ts`
  - `tests/unit/login-view.spec.ts`
  - `tests/unit/dashboard.spec.ts`
  - `tests/unit/schedule-version-resolver.spec.ts`
  - `tests/unit/step5-result.spec.ts`
- Schedule-step unit tests still using raw route fixtures/assertions
  - `tests/unit/step1-basic-info.spec.ts`
  - `tests/unit/step2-site-info.spec.ts`
  - `tests/unit/step3-employee-info.spec.ts`
  - `tests/unit/step4-initial-data.spec.ts`
- Launch Core-adjacent ops and E2E callers to migrate in follow-up slices
  - `tests/e2e/helpers.ts`
  - `tests/e2e/multi-org-rbac.spec.ts`
  - `tests/e2e/pilot-checklist.spec.ts`
  - `tests/unit/phase2-ops-contracts.spec.ts`
  - `tests/unit/phase2-ops-checklist.spec.ts`
- Non-route API endpoints caught by the broad census regex and intentionally out of Slice 0 scope
  - `src/api/schedule.ts`
