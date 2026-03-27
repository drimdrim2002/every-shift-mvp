# Phase2A Execution Slices

> Status: Execution planning document
>
> Scope lock: `Phase2A Trust Layer only`
>
> This document does not reopen product, engineering, or design decisions that are already locked in the Phase2A review materials.

## 1. Role of This Document

This document exists to convert the already-locked Phase2A Trust Layer scope into implementation-ready execution slices.

It is intentionally different from the review document:

- The review document locks **what** must be built and **where the cut line is**.
- This execution plan locks **in what order**, **in which file boundaries**, and **with which verification gates** the work should be implemented.

This document is not:

- a rewrite of the PRD
- a second plan review
- a place to expand scope
- a place to revive frozen draft code as source of truth

### 1.1 Source of Truth Priority

The source of truth order for this branch is:

1. [PHASE2_PRD.md](../prd/PHASE2_PRD.md)
2. [PHASE2_ENGINEERING_SPEC.md](../prd/PHASE2_ENGINEERING_SPEC.md)
3. [PHASE2A_GSTACK_PLAN_REVIEW.md](./PHASE2A_GSTACK_PLAN_REVIEW.md)
4. This execution planning document

If this document conflicts with a higher-priority source, the higher-priority source wins.

### 1.2 Fixed Decisions Carried Into Execution

The following are treated as fixed and are not re-discussed here:

- `selected version` is authoritative
- `preview version` and `selected version` are separate concepts
- compare is the always-visible decision surface at the top of Step5
- the default detail panel changes by version state
- Step5 uses one state-driven primary CTA at a time
- the failure panel stays inside the common Step5 frame
- finalize is based on `selected version + current revision + latest passed evaluation`
- `select`, `recheck`, and `finalize` are separate operations
- the `version` query parameter is for deep-link and preview view state only, never authoritative selection

## 2. Implementation Strategy

The plan review locked four large implementation groups:

1. DB foundation
2. Backend read/write path
3. Step5 review hub
4. Test suite

Those four groups are too coarse for safe implementation in this repository.

If implemented as-is, one change batch would combine:

- schema migration and backfill
- backend contract design
- Step4 entry plumbing
- Step5 state/UI conversion
- finalization gate logic
- finalized-data protection

That would make rollback and debugging too expensive.

This document therefore splits the locked Phase2A Trust Layer scope into eight sequential execution slices. Each slice:

- has a narrow file boundary
- has one dominant responsibility
- has a completion gate that can be verified before moving forward
- avoids mixing schema, transaction logic, and Step5 UX changes in the same slice unless required

## 3. Execution Slices

### Slice 1. Schema Foundation

**Goal**

- Introduce the Trust Layer schema foundation:
  - `schedule_versions`
  - `schedule_evaluations`
  - container-level selection/finalization fields on `schedules`
  - version-scoped ownership on `schedule_assignments`
  - version-scoped ownership on `schedule_preferences`

**Why this order**

- Every later slice depends on `schedule_version_id`, `selected_version_id`, `current_revision`, and immutable evaluation rows existing first.
- This slice isolates backfill risk before any API or UI change is introduced.

**Prerequisites / Dependencies**

- None

**Create / Modify Targets**

- Create `migrations/007_phase2a_trust_layer_foundation.sql`

**API / Schema / Store / View Impact**

- Schema only
- No frontend or store changes in this slice

**Verification**

- Backfill exactly one default `V1` version for each legacy month container
- Ensure `(schedule_version_id, employee_id, date)` uniqueness for assignments
- Ensure `(schedule_version_id, employee_id, date)` uniqueness for preferences
- Ensure `selected_version_id` and `finalized_version_id` maintain FK integrity
- Document compatibility rules for legacy `schedule_id` reads inside the migration notes

**Definition of Done**

- The schema can represent container/version/evaluation/revision/finalization without requiring any Step5 UI work
- Legacy rows can be represented as container + default version without ambiguity

**Do Not Do in This Slice**

- Edge Function implementation
- Step4 or Step5 UI work
- evaluator logic
- finalize transaction logic
- fairness ledger work

### Slice 2. Shared Contracts and Store Groundwork

**Goal**

- Lock frontend TypeScript contracts and Pinia state keys before API and Step5 implementation begin.

**Why this order**

- Backend and frontend must share the same version/review/compare/finalization vocabulary before any route or UI work starts.
- This avoids parallel drift in response shape.

**Prerequisites / Dependencies**

- Slice 1

**Create / Modify Targets**

- Modify `src/types/schedule.ts`
- Modify `src/stores/schedule.ts`

**API / Schema / Store / View Impact**

- TS types:
  - `ScheduleVersionSummary`
  - `ScheduleEvaluation`
  - `ScheduleCompareResponse`
  - `ScheduleReviewResponse`
  - `SchedulePrimaryAction`
  - related gate/detail types
- Pinia state:
  - `selectedVersionId`
  - `previewVersionId`
  - `versions`
  - `latestEvaluation`
  - `compareMatrix`
  - `reviewTab`

**Verification**

- All new types compile and can be imported by API/store/view code
- Store reset semantics are defined for version-specific state

**Definition of Done**

- The type layer is stable enough that backend and Step5 work can target it without reshaping contracts later

**Do Not Do in This Slice**

- direct Supabase writes
- Step5 markup changes
- Edge Function invocation wiring

### Slice 3. Backend Read and Selection Boundary

**Goal**

- Implement the Trust Layer read/selection boundary under `phase2-schedule`:
  - `ensure`
  - `compare`
  - `review`
  - `select`

**Why this order**

- Step5 must be able to read `preview` and `selected` state before solve/recheck/finalize logic is added.
- Selection authority must move to backend before Step5 starts depending on it.

**Prerequisites / Dependencies**

- Slice 1
- Slice 2

**Create / Modify Targets**

- Create `supabase/functions/phase2-schedule/index.ts`
- Create `supabase/functions/phase2-schedule/repository.ts`
- Create `supabase/functions/phase2-schedule/contracts.ts`
- Modify `src/api/schedule.ts`

**API / Schema / Store / View Impact**

- Backend contract boundary for:
  - ensure month container
  - bootstrap default `V1`
  - get compare matrix
  - get review payload
  - change authoritative selection
- Frontend API wrapper support in `src/api/schedule.ts`

**Verification**

- `ensure` is idempotent for the same organization + month
- `ensure` creates default `V1` only on first entry
- `select` only updates `selected_version_id`
- query parameter changes alone do not mutate authoritative selection

**Definition of Done**

- The app can load Step5 review data with backend-owned authoritative selection

**Do Not Do in This Slice**

- `create version`
- `solve`
- `PATCH assignments`
- `recheck`
- `finalize`

### Slice 4. Wizard Entry Plumbing for V1 and Version-Scoped Preferences

**Goal**

- Convert Step1 and Step4 into the container + default-version flow.
- Move off-request persistence from `schedule_id` scope to `schedule_version_id` scope.

**Why this order**

- Candidate-version separation breaks immediately if Step4 continues to write requests only by `schedule_id`.
- Step5 route wiring must already carry a preview version before the review hub is implemented.

**Prerequisites / Dependencies**

- Slice 1
- Slice 2
- Slice 3

**Create / Modify Targets**

- Modify `src/views/schedule/Step1BasicInfo.vue`
- Modify `src/views/schedule/Step4InitialData.vue`
- Modify `src/api/schedule.ts`

**API / Schema / Store / View Impact**

- Step1 stops pre-creating the working month row as the old Phase1 unit
- Step4 saves against `schedule_version_id`
- Step5 routing uses `scheduleId + ?version=previewVersionId`

**Verification**

- First Step4 save runs `ensure + bootstrap V1 + version-scoped preference save`
- Step5 navigation includes preview version id
- Step1 no longer creates the schedule row as the old authoritative working record

**Definition of Done**

- New month entry now lands on a version-aware Trust Layer baseline without any compare UI yet

**Do Not Do in This Slice**

- compare UI
- extra candidate version creation
- finalize gate UI

### Slice 5. Candidate Version Write Path and Solver Integration

**Goal**

- Add candidate version creation and write-path behavior:
  - create candidate version
  - start solve
  - persist version-scoped assignments
  - mark manual edits as `review_pending`
  - increment revision/edit counters

**Why this order**

- The version lifecycle write path must stabilize before immutable evaluation and finalize rules are layered on top.

**Prerequisites / Dependencies**

- Slice 1
- Slice 2
- Slice 3
- Slice 4

**Create / Modify Targets**

- Modify `supabase/functions/phase2-schedule/index.ts`
- Modify `supabase/functions/phase2-schedule/repository.ts`
- Create `supabase/functions/phase2-schedule/engine.ts`
- Modify `src/api/schedule.ts`
- Modify `src/composables/useAISolver.ts`

**API / Schema / Store / View Impact**

- Backend mutation contract for version creation and solve
- Solver execution persistence moves into version-aware flow
- Assignment saves become version-scoped
- Manual edit changes revision and version state

**Verification**

- `create version` increments version number only
- `create version` does not automatically update `selected_version_id` on an existing container
- `solve` moves the version to `solving`
- manual edit increments `current_revision`
- manual edit moves the version to `review_pending`

**Definition of Done**

- Version lifecycle and version-scoped write behavior are stable before trust proof/finalization is added

**Do Not Do in This Slice**

- evaluation proof persistence
- stale finalize block
- Step5 review hub shell

### Slice 6. Trust Gate: Evaluation, Recheck, Finalize

**Goal**

- Implement immutable evaluation and finalization rules:
  - `schedule_evaluations`
  - `recheck`
  - result-state classification
  - stale revision block
  - finalize transaction

**Why this order**

- This is the core Trust Layer invariant and must be closed before Step5 UX is finalized.

**Prerequisites / Dependencies**

- Slice 5

**Create / Modify Targets**

- Modify `supabase/functions/phase2-schedule/index.ts`
- Modify `supabase/functions/phase2-schedule/repository.ts`
- Modify `supabase/functions/phase2-schedule/engine.ts`
- Modify `src/api/schedule.ts`

**API / Schema / Store / View Impact**

- Review/evaluation API contract
- Finalization gate contract
- Container finalization fields become active

**Verification**

- `recheck` writes a new immutable evaluation row for the current revision
- `review_blocked`, `infeasible`, and `solve_failed` are stored and returned distinctly
- finalize only succeeds for:
  - authoritative selected version
  - current revision
  - latest passed evaluation
- finalize returns `409` for stale or invalid target state

**Definition of Done**

- Finalization is backend-authoritative and protected by the Trust Layer gate

**Do Not Do in This Slice**

- Step5 panel layout polish
- Step3 employee-resave guard
- fairness ledger work

### Slice 7. Step5 Review Hub Shell and Data Plumbing

**Goal**

- Convert Step5 into the review-hub shell with split `preview` and `selected` state.
- Make compare the always-visible top decision surface.

**Why this order**

- Step5 shell should only be built after backend contracts and trust gate semantics are stable.

**Prerequisites / Dependencies**

- Slice 2
- Slice 3
- Slice 4
- Slice 5
- Slice 6

**Create / Modify Targets**

- Modify `src/views/schedule/Step5Result.vue`
- Create `src/composables/useScheduleReviewHub.ts`
- Create `src/components/schedule/review/VersionCompareSurface.vue`
- Create `src/components/schedule/review/VersionActionArea.vue`

**API / Schema / Store / View Impact**

- Step5 shell:
  - preview/selected header
  - compare surface
  - explicit select CTA
  - deep-link query sync for preview only

**Verification**

- Compare surface remains visible for all Step5 states
- Clicking a version changes preview only
- Only explicit select changes authoritative selection
- When no query parameter is present, preview defaults from backend `selected_version_id`

**Definition of Done**

- Step5 now behaves as a review hub rather than a single-result screen, but without final panel-order polish yet

**Do Not Do in This Slice**

- final state-panel priority polish
- Step3 finalized-data protection
- metadata/dashboard/log updates

### Slice 8. Step5 State Panels, Final Guards, and Trust-Layer Tests

**Goal**

- Close the final user-facing behavior and test coverage:
  - state-driven default detail panels
  - single-primary-CTA reducer
  - common failure panel
  - Step3 protection when a finalized version exists
  - Trust Layer unit/E2E coverage

**Why this order**

- This slice depends on all prior contracts being stable.
- It is the correct place to close cross-cutting UX and verification work.

**Prerequisites / Dependencies**

- Slices 1 through 7

**Create / Modify Targets**

- Modify `src/views/schedule/Step5Result.vue`
- Create `src/components/schedule/review/VersionReviewDetail.vue`
- Modify `src/views/schedule/Step3EmployeeInfo.vue`
- Create `tests/e2e/step5-review-hub.spec.ts`
- Modify `tests/e2e/schedule-workflow.spec.ts`
- Create `tests/unit/schedule-review.spec.ts`
- Modify `tests/unit/useAISolver.spec.ts`

**API / Schema / Store / View Impact**

- Final Step5 state UX
- finalized-month protection in Step3
- automated regression coverage

**Verification**

- `review_ready`, `finalized`, `review_pending`, `review_blocked`, `infeasible`, and `solve_failed` each open the correct default panel
- Only one primary CTA is visually primary at a time
- Failure panel stays inside the shared Step5 frame
- Step3 employee resave is blocked when the month has a finalized version
- Automated coverage exists for:
  - `V1 -> V2 -> select -> recheck -> finalize`
  - state mapping
  - gate behavior
  - version switching behavior

**Definition of Done**

- Trust Layer UI behavior and automated regression coverage are complete for the locked Phase2A scope

**Do Not Do in This Slice**

- review metadata updates
- dashboard/log tracking expansion
- fairness ledger work
- Phase2B scope expansion

## 4. Risk Notes

This order is chosen to minimize rework.

### 4.1 Why This Cut Reduces Rework

- Schema and backfill risk are isolated before API and UI work starts.
- Shared contract shape is locked before backend and Step5 are implemented.
- Version write path is stabilized before immutable evaluation/finalization is layered on top.
- Step5 shell is built after backend truth exists, avoiding a fake frontend-only state model.
- Step3 finalized-data protection is deferred until finalization semantics are real.

### 4.2 Risky Slice Combinations

The following combinations are intentionally avoided:

- **Slice 1 + Slice 3/4**: mixes migration/backfill debugging with API/UI regressions
- **Slice 5 + Slice 6**: mixes write-path errors with trust-gate errors and obscures classification bugs
- **Slice 7 + Slice 8**: mixes query/selection plumbing with final panel/CTA behavior and makes Step5 rework larger

## 5. Open Implementation Gaps

The following gaps should be explicitly closed during implementation, without reopening product scope.

### 5.1 Missing Selection Mutation Contract

The engineering spec defines backend-owned `selected_version_id`, but the endpoint table does not currently define a dedicated `select` mutation.

Implementation default:

- add `POST /functions/v1/schedule-versions/:versionId/select`
- keep `select`, `recheck`, and `finalize` as separate operations

### 5.2 `create version` vs Authoritative Selection

The current engineering spec says `create version` updates `selected_version_id`, but the locked execution rule requires preview and selected to stay separate.

Implementation default:

- on an existing container, `create version` must **not** auto-select the new version
- only the first bootstrap `V1` created by `ensure` should initialize `selected_version_id`

### 5.3 Preview + Selected Read Contract

Step5 must render:

- preview detail
- selected gate summary

The exact read contract for those two views is not fully closed yet.

Implementation default:

- `GET compare`
- `GET review(preview)`
- `GET review(selected)`
- if `preview == selected`, reuse the same review response

### 5.4 Finalize Target Validation

The path target of `finalize` and the authoritative selected version rule must be aligned.

Implementation default:

- if the path version is not the current authoritative `selected_version_id`, finalize returns `409`

### 5.5 Concrete TS Contract Shapes

The engineering spec names types such as `ScheduleVersionSummary` and `ScheduleCompareResponse`, but does not fully define the TS contract shapes.

Implementation default:

- lock the exact TS shapes in Slice 2 before backend and Step5 implementation proceeds

### 5.6 Legacy Schema Reality Check

This plan is based on repository-visible schema assumptions and the legacy migration docs.

Implementation default:

- before executing the migration in a real environment, compare:
  - `docs/prd/02-database-migration.md`
  - current project schema
  - existing migration history

## 6. Final Recommendation

### 6.1 Recommended Work Units

Keep implementation slices at eight units.

Recommended PR grouping:

- `PR1 = Slice 1 + Slice 2`
- `PR2 = Slice 3 + Slice 4`
- `PR3 = Slice 5 + Slice 6`
- `PR4 = Slice 7`
- `PR5 = Slice 8`

### 6.2 Execution Discipline

- Do not widen scope beyond the locked Trust Layer
- Do not reopen office-hours / CEO / eng / design review loops
- Do not revive old draft code as baseline truth
- Do not combine migration, backend write path, Step5 final-state UX, and Step3 finalized guard into one PR

### 6.3 Practical Starting Point

When implementation begins, the first execution target should be:

1. Slice 1 - schema foundation
2. Slice 2 - shared contracts/store groundwork

No implementation should skip directly to Step5 UI before those two slices are closed.
