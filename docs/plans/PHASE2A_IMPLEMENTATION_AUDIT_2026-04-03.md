# Phase2A Implementation Audit

Date: 2026-04-03
Source of truth: `docs/plans/PHASE2A_EXECUTION_SLICES.md`
Audit mode: static review + focused automated verification

## Summary

This audit checks whether all Phase2A execution slices were implemented, whether any behavior was implemented incorrectly, and whether slice boundaries now conflict with each other.

Overall verdict:

- Slice 1: Partial
- Slice 2: Pass
- Slice 3: Pass
- Slice 4: Partial
- Slice 5: Conflict
- Slice 6: Conflict
- Slice 7: Pass
- Slice 8: Partial

Why the overall verdict is not `Pass`:

- destructive Step3 resave still bypasses the Trust Layer boundary
- finalized state can be bypassed by later write paths
- finalized UI lock can be bypassed by previewing a non-finalized version
- full `V1 -> V2 -> select -> recheck -> finalize` automated chain is still not covered

## Verification Run

Executed successfully:

- `pnpm test:unit -- tests/unit/phase2-schedule-contracts.spec.ts tests/unit/phase2-schedule-repository.spec.ts tests/unit/phase2-schedule-write-repository.spec.ts tests/unit/phase2-schedule-trust-gate.spec.ts tests/unit/phase2-schedule-api.spec.ts tests/unit/phase2-schedule-version-scope-api.spec.ts`
- `pnpm test:unit -- tests/unit/schedule-store.spec.ts tests/unit/use-schedule-review-hub.spec.ts tests/unit/schedule-review.spec.ts tests/unit/step1-basic-info.spec.ts tests/unit/step3-employee-info.spec.ts tests/unit/step4-initial-data.spec.ts tests/unit/step5-result.spec.ts tests/unit/version-action-area.spec.ts tests/unit/version-compare-surface.spec.ts tests/unit/schedule-version-resolver.spec.ts`
- `pnpm lint:check`

Observed results:

- unit tests passed
- lint completed with warnings only, no errors
- focused Playwright smoke could not validate app behavior because all tests timed out in login `beforeEach`

Playwright blocker:

- `tests/e2e/schedule-workflow.spec.ts`
- `tests/e2e/step5-review-hub.spec.ts`
- both failed waiting for `input[type="email"]` on `/login`

## Slice Matrix

### Slice 1. Schema Foundation

Verdict: `Partial`

Evidence:

- foundation migration exists in `migrations/007_phase2a_trust_layer_foundation.sql`
- RLS lockdown follow-up exists in `migrations/011_phase2a_trust_layer_rls_lockdown.sql`

Residual concerns:

- append-only evaluation immutability is enforced by route shape and privilege boundary, but not by an explicit `UPDATE/DELETE` guard on `schedule_evaluations`

### Slice 2. Shared Contracts and Store Groundwork

Verdict: `Pass`

Evidence:

- Trust Layer types exist in `src/types/schedule.ts`
- review-state bucket exists in `src/stores/schedule.ts`
- store reset coverage exists in `tests/unit/schedule-store.spec.ts`

Note:

- `scheduleStore.versions` appears underused and is not a current source of truth for Step5 rendering

### Slice 3. Backend Read and Selection Boundary

Verdict: `Pass`

Evidence:

- `ensure`, `compare`, `review`, `select` routes and handlers exist under `supabase/functions/phase2-schedule`
- repository coverage exists in `tests/unit/phase2-schedule-repository.spec.ts`
- API coverage exists in `tests/unit/phase2-schedule-api.spec.ts`

Confirmed:

- selection remains backend-authoritative
- preview query alone does not mutate selection

### Slice 4. Wizard Entry Plumbing

Verdict: `Partial`

Evidence:

- Step1 no longer creates the schedule row directly
- Step4 ensures baseline version and routes to Step5 with `?version=...`
- version-scoped preference persistence exists

Residual concerns:

- Step4 still keeps legacy `schedule_id` preference fallback during restore
- Step3/Step4 can still carry stale `scheduleId` state across flows

### Slice 5. Candidate Version Write Path

Verdict: `Conflict`

Evidence:

- create-version, solve, solver-result, and patch paths exist and are covered by repository/API tests

Conflict:

- finalized container state is not checked by later write RPCs
- solver-result persistence and evaluation persistence are not one atomic boundary

### Slice 6. Trust Gate

Verdict: `Conflict`

Evidence:

- recheck/finalize contract exists
- trust-gate evaluator and finalize RPC exist
- trust-gate unit coverage exists

Conflict:

- finalize semantics can be bypassed by Slice 5 write paths after finalization
- stale passed evaluation can remain briefly usable while solver-result updates land before evaluation append completes

### Slice 7. Step5 Review Hub Shell

Verdict: `Pass`

Evidence:

- compare surface always visible
- preview and selected are separated
- explicit select path exists
- query canonicalization exists
- unit coverage exists in `tests/unit/use-schedule-review-hub.spec.ts` and `tests/unit/step5-result.spec.ts`

### Slice 8. State Panels, Final Guards, and Tests

Verdict: `Partial`

Evidence:

- lead-panel mapping exists in `src/utils/scheduleReviewState.ts`
- detail panel exists in `src/components/schedule/review/VersionReviewDetail.vue`
- Step3 finalized guard exists in `src/views/schedule/Step3EmployeeInfo.vue`

Residual concerns:

- finalized read-only can be bypassed by previewing a non-finalized version
- full automated lifecycle chain is still missing
- UI-level conflict handling for 409 paths is still thin

## Prioritized Findings

### 1. Critical: finalized state can be bypassed by later write paths

The finalize boundary is not the last word. Solve start, solver-result sync, and assignment patch paths do not reject already-finalized containers before mutating state.

Evidence:

- `supabase/functions/phase2-schedule/repository.ts`
- `migrations/009_slice5_single_running_version_guards.sql`
- `migrations/010_slice5_version_isolation_write_guards.sql`
- `migrations/014_slice6_trust_gate_atomic.sql`

Impact:

- a finalized month can still be mutated by later backend write paths
- finalize no longer guarantees immutable post-final state

### 2. Critical: solver-result and evaluation append are not atomic together

`syncVersionSolverResult()` applies solver result first, then computes and persists the immutable evaluation in a separate step.

Evidence:

- `supabase/functions/phase2-schedule/repository.ts`
- `migrations/014_slice6_trust_gate_atomic.sql`

Impact:

- assignments and version status can change before `latest_evaluation_id` catches up
- finalize can reason over stale evaluation state

### 3. High: Step3 destructive resave bypasses the Trust Layer boundary

Step3 checks compare state through `phase2-schedule`, but once the guard passes it deletes rows directly through raw Supabase table operations.

Evidence:

- `src/views/schedule/Step3EmployeeInfo.vue`

Impact:

- implementation breaks the intended backend boundary
- destructive month invalidation is not version-aware

### 4. High: Step3 deletes assignments too broadly

Step3 deletes `schedule_assignments` by `employee_id` only before recreating employees.

Evidence:

- `src/views/schedule/Step3EmployeeInfo.vue`

Impact:

- this can remove assignments outside the current month container and outside the intended version scope

### 5. High: finalized UI lock can be bypassed by preview switching

Finalized months should remain read-only in Phase2A, but the compare surface still allows previewing a non-finalized version, which then re-enables edit-oriented actions because mutability is computed from preview state.

Evidence:

- `src/components/schedule/review/VersionCompareSurface.vue`
- `src/views/schedule/Step5Result.vue`

Impact:

- finalized month UI can appear editable again
- this conflicts with the product rule that Phase2A UI does not reactivate other versions after finalization

### 6. Medium: Step3 destructive resave is fail-open

If schedule deletion fails, the code warns and continues with employee deletion and recreation.

Evidence:

- `src/views/schedule/Step3EmployeeInfo.vue`

Impact:

- roster state and trust-layer month state can diverge
- user confirmation text no longer matches actual outcome

### 7. Medium: legacy `schedule_id` fallback still remains in Step4 restore

Version-scoped persistence exists, but restore logic still falls back to legacy `schedule_id` preferences.

Evidence:

- `src/views/schedule/Step4InitialData.vue`
- `src/api/schedule.ts`

Impact:

- migration compatibility is preserved
- full version-scope cutover is not yet clean

### 8. Medium: full lifecycle automation gap remains

There is still no automated test that closes the full chain:

- `V1 -> V2 -> select -> recheck -> finalize`

Evidence:

- `tests/e2e/schedule-workflow.spec.ts`
- `tests/e2e/step5-review-hub.spec.ts`

Impact:

- slice interactions are validated mostly by units and manual QA, not by a single integrated regression lock

## Recommended Next Audit / Fix Order

1. Close finalized write-bypass in backend SQL and repository boundary.
2. Make solver-result plus evaluation persistence a single authoritative transaction boundary.
3. Replace Step3 raw destructive delete flow with a Trust Layer-aware invalidation path.
4. Lock finalized UI against preview-based reactivation.
5. Add one integrated regression path for `V1 -> V2 -> select -> recheck -> finalize`.
