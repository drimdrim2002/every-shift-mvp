# EveryShift Phase2 Engineering Spec

> **Document Status**: Draft for implementation lock-in
>
> This document is the engineering companion to [PHASE2_PRD_KR.md](./PHASE2_PRD_KR.md) and [PHASE2_PRD.md](./PHASE2_PRD.md).
> Scope is limited to `Phase2A`. `Phase2B` self-serve signup, dashboards, and broader scaling concerns are intentionally excluded.
> The active implementation target in this revision is `Phase2A-1 Trust Layer` only; rank/policy/bootstrap/fairness ledger work is split into a deferred slice.

## 1. Purpose

The purpose of this document is to turn the locked product decisions in the Phase2 PRD into an implementation-ready design on top of the current codebase.

This document must answer:

- What DB model should represent `version / revision / evaluation / finalization`?
- What API boundaries should own solver, evaluator, and finalization logic?
- How should the current `Step5Result.vue` evolve into a review hub?
- How should failures be split across `review_blocked`, `infeasible`, and `solve_failed`?
- In what order should implementation proceed to minimize risk?

## 2. Locked Decisions

This spec treats the following decisions as fixed:

- Finalization is based on the `selected version` and its `latest passed evaluation`.
- The default compare unit is `candidate version`, not `manual baseline`.
- Hard-constraint proof and unfulfilled off-request explanation are computed by the `backend evaluator`.
- A result with hard-constraint violations is `review_blocked`, not `infeasible`.
- `infeasible` and `solve_failed` must remain distinct product states.
- Rank/policy/bootstrap work belongs to a deferred slice after the Trust Layer.
- The `rolling fairness ledger` write path belongs to a deferred slice after the Trust Layer.
- Phase2A does not support reopening a finalized month in product UI.

## 3. Current Implementation Baseline

The current implementation baseline is:

- [schedule.ts](../../src/api/schedule.ts): reuses `schedules` as a single month-level working row.
- [useAISolver.ts](../../src/composables/useAISolver.ts): tracks solver state as `created/running/complete/error/changed`.
- [Step4InitialData.vue](../../src/views/schedule/Step4InitialData.vue): stores Step4 requests into `schedule_preferences`.
- [Step5Result.vue](../../src/views/schedule/Step5Result.vue): handles result review, regeneration, manual edits, and save in one screen.
- [Step3EmployeeInfo.vue](../../src/views/schedule/Step3EmployeeInfo.vue): deletes existing month schedules when employees are resaved.

Because of this baseline, Phase2A must shift from “overwriting a single working row” to “container + version + evaluation”.

## 4. Architecture Snapshot

```text
[Step1-4 Planning Inputs]
  -> schedules (month container)
  -> schedule_versions (candidate versions)
  -> schedule_preferences (version-scoped off requests)
  -> schedule_assignments (current working assignments per version)
  -> solver execution
  -> backend evaluator
  -> schedule_evaluations (immutable review artifact)
  -> Step5 Review Hub
  -> finalize transaction
```

The ops layer is outside the active scope of this revision.

```text
Deferred after Trust Layer
  -> profiles
  -> setup checklist
  -> organization_rank_codes
  -> off_request_policy_rules
  -> fairness_ledger_monthly
```

## 5. Data Model

### 5.1 Core Modeling Rules

- `schedules` becomes a month-level schedule container, not a single schedule result.
- `schedule_versions` represents candidate options A/B/C.
- `schedule_assignments` stores the current working assignments for each version.
- `schedule_evaluations` is the immutable review artifact stored at `version + revision`.
- Manual edits update assignments, increment `revision`, and create a new evaluation row.

### 5.2 Changes to Existing Tables

#### A. `schedules`

The current `status/hard_score/soft_score/solver_execution_id` model does not support version compare cleanly.

Phase2A redefines `schedules` as a month container.

Add columns:

| Column                 | Type                       | Purpose                        |
| ---------------------- | -------------------------- | ------------------------------ |
| `selected_version_id`  | UUID NULL                  | version currently under review |
| `finalized_version_id` | UUID NULL                  | finalized version              |
| `latest_version_no`    | INTEGER NOT NULL DEFAULT 0 | source of version numbering    |
| `finalized_at`         | TIMESTAMPTZ NULL           | finalization timestamp         |
| `finalized_by`         | UUID NULL                  | finalizing user                |

Transition rule:

- Existing `status`, `hard_score`, `soft_score`, and `solver_execution_id` may remain for migration compatibility.
- New write paths must treat `schedule_versions` and `schedule_evaluations` as the source of truth.
- Container-level status should be derived from version states in API responses.

#### B. `schedule_assignments`

Add / change:

| Column                | Type             | Purpose             |
| --------------------- | ---------------- | ------------------- |
| `schedule_version_id` | UUID NOT NULL    | owning version      |
| `edited_by`           | UUID NULL        | last editor         |
| `edited_at`           | TIMESTAMPTZ NULL | last edit timestamp |

Constraints:

- New unique key: `(schedule_version_id, employee_id, date)`
- Keep `schedule_id` for container-level reference
- Store only the current working assignment state per version

#### C. `schedule_preferences`

Off requests must be version-scoped if candidate versions are to differ.

Add / change:

| Column                | Type                                        | Purpose           |
| --------------------- | ------------------------------------------- | ----------------- |
| `schedule_version_id` | UUID NOT NULL                               | owning version    |
| `request_source`      | VARCHAR(30) NOT NULL DEFAULT `employee_off` | source of request |

Constraints:

- New unique key: `(schedule_version_id, employee_id, date)`
- Keep `schedule_id` for container-level reference

#### D. `employees`

This Trust Layer revision does not add new columns to `employees`.

- `rank_code` is deferred to a later slice.

### 5.3 New Tables

#### A. `schedule_versions`

Stores candidate-version metadata.

Recommended columns:

| Column                       | Type                               | Purpose                                       |
| ---------------------------- | ---------------------------------- | --------------------------------------------- |
| `id`                         | UUID PK                            | version id                                    |
| `schedule_id`                | UUID FK                            | month container                               |
| `version_no`                 | INTEGER NOT NULL                   | 1, 2, 3 ...                                   |
| `name`                       | VARCHAR(100) NULL                  | human-readable label                          |
| `source_type`                | VARCHAR(30) NOT NULL               | `initial_solve`, `re_solve`, `manual_variant` |
| `base_version_id`            | UUID NULL                          | version lineage                               |
| `current_revision`           | INTEGER NOT NULL DEFAULT 0         | current revision number                       |
| `status`                     | VARCHAR(30) NOT NULL               | lifecycle state                               |
| `input_snapshot`             | JSONB NOT NULL DEFAULT '{}'::jsonb | snapshot of version inputs                    |
| `input_diff_summary`         | JSONB NOT NULL DEFAULT '{}'::jsonb | compare-facing input diff summary             |
| `manual_edit_count`          | INTEGER NOT NULL DEFAULT 0         | manual edit count                             |
| `active_solver_execution_id` | VARCHAR NULL                       | active solver execution                       |
| `latest_evaluation_id`       | UUID NULL                          | latest evaluation                             |
| `created_by`                 | UUID NULL                          | creator                                       |
| `created_at`                 | TIMESTAMPTZ                        | created time                                  |
| `updated_at`                 | TIMESTAMPTZ                        | updated time                                  |

Minimum `input_snapshot`:

```json
{
  "off_request_count": 42,
  "locked_assignment_count": 155,
  "site_requirement_hash": "sha256:...",
  "employee_roster_hash": "sha256:..."
}
```

Minimum `input_diff_summary`:

```json
{
  "changed_off_requests": 2,
  "changed_locked_assignments": 0,
  "changed_site_requirements": 0,
  "note": "Adjusted 2 off requests"
}
```

#### B. `schedule_evaluations`

The immutable review artifact used for review and finalization.

Recommended columns:

| Column                | Type                 | Purpose                                                  |
| --------------------- | -------------------- | -------------------------------------------------------- |
| `id`                  | UUID PK              | evaluation id                                            |
| `schedule_id`         | UUID FK              | month container                                          |
| `schedule_version_id` | UUID FK              | target version                                           |
| `revision_no`         | INTEGER NOT NULL     | evaluated revision                                       |
| `result_status`       | VARCHAR(30) NOT NULL | `passed`, `review_blocked`, `infeasible`, `solve_failed` |
| `proof_summary`       | JSONB NOT NULL       | hard-constraint rollup                                   |
| `violation_details`   | JSONB NOT NULL       | detailed violation list                                  |
| `infeasibility`       | JSONB NULL           | infeasibility explanation                                |
| `off_request_results` | JSONB NOT NULL       | per-request explanation                                  |
| `comparison_metrics`  | JSONB NOT NULL       | compare metrics                                          |
| `finalization_gate`   | JSONB NOT NULL       | gate result                                              |
| `assignment_hash`     | TEXT NOT NULL        | assignment identity check                                |
| `solver_execution_id` | VARCHAR NULL         | solver trace                                             |
| `evaluator_version`   | VARCHAR NOT NULL     | evaluator logic version                                  |
| `created_at`          | TIMESTAMPTZ          | created time                                             |

Example `proof_summary`:

```json
{
  "weekly_hours_violations": 0,
  "nnn_violations": 0,
  "nod_violations": 0,
  "minimum_rest_violations": 0,
  "staffing_shortfalls": 0
}
```

Example `comparison_metrics`:

```json
{
  "off_request_reflection_rate": 0.81,
  "night_shift_min": 4,
  "night_shift_max": 5,
  "weekend_shift_min": 3,
  "weekend_shift_max": 4,
  "manual_edit_count": 1
}
```

Example `finalization_gate`:

```json
{
  "allowed": true,
  "blocking_reasons": []
}
```

#### C. Deferred After Trust Layer

The following models are not part of the active schema target in this revision.

- `organization_rank_codes`
- `off_request_policy_rules`
- `fairness_ledger_monthly`
- `profiles`

## 6. Status Lifecycle

Version lifecycle is the source of truth.

```text
draft
-> solving
-> review_ready | review_blocked | infeasible | solve_failed

review_ready
-> finalized

review_ready
-> review_pending
-> review_ready | review_blocked
```

State meanings:

- `draft`: version exists but has not been solved
- `solving`: solver is running
- `review_ready`: latest evaluation for the current revision is `passed`
- `review_blocked`: assignments exist, but hard constraints are violated
- `review_pending`: manual edits happened and re-evaluation is required
- `infeasible`: no feasible solution exists for the current inputs
- `solve_failed`: system, network, or integration failure
- `finalized`: finalization is complete and the version is read-only

## 7. API Boundaries

### 7.1 Principles

- Organization, employee, and shift lookup can remain direct Supabase reads.
- Version, evaluation, and finalization mutations should move to Edge Functions or backend endpoints.
- Any transaction-sensitive logic should not be implemented directly in the frontend.

### 7.2 Recommended Endpoints

| Method  | Path                                                     | Purpose                          |
| ------- | -------------------------------------------------------- | -------------------------------- |
| `POST`  | `/functions/v1/schedules/ensure`                         | ensure org+month container       |
| `POST`  | `/functions/v1/schedules/:scheduleId/versions`           | create new candidate version     |
| `PUT`   | `/functions/v1/schedule-versions/:versionId/preferences` | save version-scoped off requests |
| `POST`  | `/functions/v1/schedule-versions/:versionId/solve`       | start solver                     |
| `PATCH` | `/functions/v1/schedule-versions/:versionId/assignments` | save manual edits                |
| `POST`  | `/functions/v1/schedule-versions/:versionId/recheck`     | run backend evaluator again      |
| `GET`   | `/functions/v1/schedule-versions/:versionId/review`      | fetch proof/off request/gate     |
| `GET`   | `/functions/v1/schedules/:scheduleId/compare`            | fetch version compare matrix     |
| `POST`  | `/functions/v1/schedule-versions/:versionId/finalize`    | finalize selected version        |

Implementation note:

- This Trust Layer slice keeps schedule/version/review/finalize routes inside one active backend boundary.
- The deployed boundary remains `/functions/v1/phase2-schedule/...`.
- bootstrap/rank/policy routes are reopened only in the deferred slice.

### 7.3 Key Contracts

#### A. `POST /functions/v1/schedules/ensure`

Request:

```json
{
  "organization_id": "uuid",
  "month": "2026-04"
}
```

Response:

```json
{
  "schedule_id": "uuid",
  "selected_version_id": "uuid",
  "finalized_version_id": null,
  "versions": [
    {
      "id": "uuid",
      "version_no": 1,
      "name": "V1",
      "status": "draft",
      "current_revision": 0
    }
  ]
}
```

#### B. `POST /functions/v1/schedules/:scheduleId/versions`

Request:

```json
{
  "base_version_id": "uuid-or-null",
  "name": "V2",
  "source_type": "re_solve",
  "input_diff_summary": {
    "changed_off_requests": 2,
    "changed_locked_assignments": 0,
    "note": "Adjusted 2 off requests"
  }
}
```

Behavior:

- Creates the version with `latest_version_no + 1`
- Clones preferences and locked assignments from `base_version_id` when provided
- Updates `selected_version_id` to the new version

#### C. `POST /functions/v1/schedule-versions/:versionId/solve`

Response:

```json
{
  "schedule_version_id": "uuid",
  "status": "solving",
  "solver_execution_id": "ext-123"
}
```

Behavior:

- Moves version state to `solving`
- Builds the solver request
- Persists solver execution id

#### D. `PATCH /functions/v1/schedule-versions/:versionId/assignments`

Request:

```json
{
  "changes": [
    {
      "employee_id": "uuid",
      "date": "2026-04-12",
      "shift_id": "uuid"
    }
  ]
}
```

Behavior:

- Upserts assignments
- Increments `manual_edit_count`
- Increments `current_revision`
- Moves state to `review_pending`

#### E. `POST /functions/v1/schedule-versions/:versionId/recheck`

Response:

```json
{
  "schedule_version_id": "uuid",
  "current_revision": 3,
  "evaluation_id": "uuid",
  "result_status": "review_ready"
}
```

Behavior:

- Computes the current assignment hash
- Runs the evaluator
- Writes a `schedule_evaluations` row
- Moves version state to `review_ready` or `review_blocked`

#### F. `GET /functions/v1/schedule-versions/:versionId/review`

Response:

```json
{
  "version": {
    "id": "uuid",
    "version_no": 2,
    "name": "V2",
    "status": "review_ready",
    "current_revision": 3
  },
  "latest_evaluation": {
    "id": "uuid",
    "revision_no": 3,
    "result_status": "passed",
    "proof_summary": {},
    "violation_details": [],
    "infeasibility": null,
    "off_request_results": [],
    "comparison_metrics": {},
    "finalization_gate": {
      "allowed": true,
      "blocking_reasons": []
    }
  }
}
```

#### G. `GET /functions/v1/schedules/:scheduleId/compare`

Response:

```json
{
  "schedule_id": "uuid",
  "selected_version_id": "uuid",
  "versions": [
    {
      "id": "uuid",
      "version_no": 1,
      "name": "V1",
      "status": "review_ready",
      "input_diff_summary": {},
      "comparison_metrics": {},
      "finalizable": true
    }
  ]
}
```

#### H. `POST /functions/v1/schedule-versions/:versionId/finalize`

Transaction order:

1. Lock the version row
2. Lock the latest evaluation row
3. Validate `latest_evaluation.revision_no == version.current_revision`
4. Validate `latest_evaluation.result_status == passed`
5. Update `finalized_version_id`, `selected_version_id`, `finalized_at`, and `finalized_by` on the container
6. Move version state to `finalized`

Return `409` or `422` for:

- `stale_evaluation`
- `review_not_passed`
- `already_finalized`

## 8. Frontend Structure

### 8.1 Routes

Phase2A should keep existing routes where possible.

| Route                                            | Action                   |
| ------------------------------------------------ | ------------------------ |
| `/schedule/step1`                                | keep                     |
| `/schedule/step2`                                | keep                     |
| `/schedule/step3`                                | keep                     |
| `/schedule/step4`                                | keep                     |
| `/schedule/step5/:scheduleId?version=:versionId` | expand into `Review Hub` |

Key migration rule:

- Keep `Step5Result.vue` and expand it into the review hub.
- Use query parameter version selection rather than introducing a new route tree.

### 8.2 Step5 Review Hub

Extend [Step5Result.vue](../../src/views/schedule/Step5Result.vue) into:

```text
Review Hub
  - Header: selected version, status badge, finalization gate
  - Left panel: candidate version list
  - Main tab 1: assignment grid
  - Main tab 2: hard-constraint proof
  - Main tab 3: unfulfilled off requests
  - Main tab 4: version compare
  - Footer actions: re-solve, save edit, recheck, finalize, export
```

New UI rules:

- Disable `Finalize` when status is `review_pending`
- Disable `Finalize` and show violation detail when status is `review_blocked`
- Prioritize the infeasibility panel over the assignment grid when status is `infeasible`
- Show retry CTA and operator-facing trace id for `solve_failed`

### 8.3 Step4 Changes

Step4 is no longer “create one month-level schedule row”.

Changes:

- Replace or wrap `createSchedule()` with `ensure schedule`
- Ensure the default version `V1` on first entry
- Save off requests against `schedule_version_id`, not only `schedule_id`
- Route to Step5 with `scheduleId + versionId`

### 8.4 Step3 Changes

Current [Step3EmployeeInfo.vue](../../src/views/schedule/Step3EmployeeInfo.vue) deletes the month schedule when employees are resaved.

Phase2A changes this to:

- Block employee resave when a finalized version exists
- If only unfinalized versions exist, show an explicit confirmation that current month drafts/versions will be invalidated
- If the employee roster hash changes, discard current compare context and start a new version or new container flow

### 8.5 Pinia State Additions

Add to `useScheduleStore`:

```ts
selectedVersionId: string | null
versions: ScheduleVersionSummary[]
latestEvaluation: ScheduleEvaluation | null
compareMatrix: ScheduleCompareResponse | null
reviewTab: 'grid' | 'proof' | 'offRequests' | 'compare'
```

## 9. Solver / Evaluator Integration

### 9.1 Core Principles

- The solver is the candidate assignment generator.
- The backend evaluator is the validator and explainer.
- Finalization is always based on evaluator output, never solver output alone.

### 9.2 Solver Request

The current `mapToSolverRequest()` skeleton can remain.

Phase2A additions:

- Inputs always come from the `selected version`
- Previous-month history remains `is_locked = true`
- If current-month locked assignments exist, include them on re-solve via `history` or a separate `locked_assignments` section
- Fairness context is reopened in the deferred slice

Minimum required extension to solver response:

| Field             | Purpose                                               |
| ----------------- | ----------------------------------------------------- |
| `failure_type`    | `infeasible` vs `system_error` classification         |
| `failure_context` | minimal infeasibility context: date, shift, headcount |

This extension is not for rich UI proof. It is the minimum backend classification signal.

### 9.3 Evaluator Responsibilities

Evaluator input:

- current version assignments
- shifts
- site requirements
- employees + available shifts
- schedule preferences

Evaluator output:

- hard-constraint rollup
- detailed violation list
- per-request fulfilled/unfulfilled explanations
- compare metrics
- finalization gate

### 9.4 `review_blocked` vs `infeasible` vs `solve_failed`

Classification rules:

- Solver returned assignments and evaluator found hard violations -> `review_blocked`
- Solver signaled no feasible solution via `failure_type` -> `infeasible`
- Timeout, 5xx, invalid payload, persistence failure -> `solve_failed`

Examples:

- `NOD` found -> `review_blocked`
- `4 consecutive Night shifts` found -> `review_blocked`
- “Need 3 N staff on April 12, only 2 feasible” -> `infeasible`
- solver polling timeout -> `solve_failed`

## 10. Finalization Rules

Finalization is allowed only when all of the following are true:

- selected version state is `review_ready`
- latest evaluation exists
- `latest_evaluation.revision_no == version.current_revision`
- `latest_evaluation.result_status == passed`
- container is not already finalized

After finalization:

- finalized version becomes read-only
- other versions may remain in compare history, but Phase2A UI does not reactivate them
- rolling fairness ledger write is reopened in the deferred slice

## 11. Failure Mode Registry

| Failure Mode                                      | Classification | Handling                       | Observability                             |
| ------------------------------------------------- | -------------- | ------------------------------ | ----------------------------------------- |
| solver timeout                                    | `solve_failed` | allow retry, show status badge | execution id, retry count, timeout metric |
| solver 5xx                                        | `solve_failed` | allow retry                    | error log, response trace                 |
| infeasible month                                  | `infeasible`   | show infeasibility panel       | infeasible count metric                   |
| stale evaluation finalization attempt             | business error | block finalization             | `409 stale_evaluation` log                |
| manual edit without recheck                       | business error | disable finalize               | version status metric                     |
| employee resave attempts to damage finalized data | business error | block employee save            | admin action audit                        |

## 12. Observability

Minimum trace fields:

- `schedule_id`
- `schedule_version_id`
- `revision_no`
- `solver_execution_id`
- `evaluation_id`
- `result_status`
- `finalization_allowed`
- `blocking_reason_codes`

Recommended events:

- `version_created`
- `solver_started`
- `solver_completed`
- `evaluation_saved`
- `manual_edit_saved`
- `recheck_completed`
- `finalization_succeeded`
- `finalization_blocked`

## 13. Test Strategy

### 13.1 Unit

- evaluator rule calculators
- compare metric reducer
- finalization gate function
- version status mapper

### 13.2 Integration

- `ensure schedule -> create version -> solve -> evaluation saved`
- `manual edit -> review_pending -> recheck -> review_ready`
- finalization blocked for `review_blocked`
- `infeasible` persistence and retrieval

### 13.3 E2E

- create V1, create V2, compare, finalize V2
- manual edit in Step5 disables finalize
- successful recheck re-enables finalize
- infeasible version shows explanation panel

## 14. Implementation Order

### Phase 1. Schema foundation

- `schedule_versions`
- `schedule_evaluations`
- `schedule_assignments.schedule_version_id`
- `schedule_preferences.schedule_version_id`

### Phase 2. Review hub foundation

- `ensure schedule`
- `create version`
- `get review`
- Step5 version selector + status badge

### Phase 3. Evaluator and finalization

- backend evaluator
- `recheck`
- `finalize`
- stale evaluation block

### Phase 4. Compare

- compare API
- compare table
- input diff summary rendering

### Deferred after Trust Layer

- `profiles`
- `/setup`
- `organization_rank_codes`
- `off_request_policy_rules`
- finalize-triggered fairness ledger write
- optional solver fairness context

## 15. Phase2A Cut Lines

Intentionally excluded from Phase2A:

- finalized month reopen UI
- manual baseline import
- manual-vs-automatic before/after comparison in the core flow
- employee self-signup
- full RBAC
- advanced operations dashboard

## 16. Ready-to-Start Standard

This document provides the implementation starting point for:

- DB schema delta
- API boundaries
- route and screen change direction
- version lifecycle
- evaluator and finalize transaction
- failure and test plan

At this point, work should move from “re-discussing architecture” to “writing migrations and endpoints”.
