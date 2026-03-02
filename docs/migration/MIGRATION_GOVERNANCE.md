# Migration Governance (Single Source of Truth)

This document defines the operating rules for the REFINED_PRD migration program.
It is the canonical governance reference for branch strategy, rollout policy, release decisions, and Definition of Done (DoD).

## 1. Scope

- Applies to all migration phases `P0` to `P10` in `.shrimp-data/tasks.json`.
- Applies to schema changes, edge function changes, and frontend changes.
- Applies to all contributors, including AI-assisted contributors.

## 2. Ownership and Decision Rights

- Program Owner:
  - Maintains migration priorities and phase sequencing.
- Technical Owner:
  - Approves architectural decisions and exception handling.
- Release Owner:
  - Executes rollout decisions (Go/No-Go) based on gate evidence.

Any waiver requires explicit approval by Technical Owner and Release Owner.

## 3. Branch Strategy

- `main`:
  - Protected branch.
  - Only merge via reviewed PR.
- `feature/<scope>-<short-name>`:
  - Default branch pattern for implementation tasks.
- `release/<yyyy-mm-dd>-<tag>`:
  - Stabilization branch for private beta or production-like rollout.
- `hotfix/<scope>-<short-name>`:
  - Emergency fix branch with mandatory post-merge retrospective.

No direct pushes to `main`.

## 4. Pull Request and Review Rules

Every migration change must be submitted through a PR and satisfy the checklist below:

- PR links the relevant task IDs (for example `P0-1.1`) and describes scope boundaries.
- Branch naming follows the strategy in Section 3.
- PR includes quality gate evidence summary (`lint`, `unit`, `build`) and any known risk.
- PR includes rollback notes for impacted areas (database, edge functions, frontend).
- At least one qualified reviewer approval is required before merge.

Self-merge is disallowed except emergency hotfixes with mandatory retrospective follow-up.

## 5. Task State Transition Policy

Canonical task states are `pending`, `in_progress`, and `completed`.

- `pending`:
  - Scope and verification criteria are defined.
  - No active owner is currently executing the task.
- `in_progress`:
  - Exactly one active owner is responsible for execution.
  - Implementation, validation, or investigation is actively ongoing.
- `completed`:
  - Verification criteria are satisfied.
  - DoD evidence is attached (PR link, gate outputs, and related doc updates).

Allowed transitions:

1. `pending` → `in_progress`
2. `in_progress` → `pending` (only with blocking/defer reason recorded)
3. `in_progress` → `completed`

Forbidden transitions:

- `pending` → `completed`
- `completed` → `in_progress` (create a follow-up task instead)

If any required verification fails, state must return to `in_progress` until remediation is complete.

## 6. Rollout Policy

- Stage order:
  1. Development validation
  2. Staging validation
  3. Private beta rollout
- Every rollout requires:
  - Passed quality gates
  - Regression impact review
  - Rollback readiness confirmation

## 7. Definition of Done (DoD)

Every migration task is considered done only if all items below are satisfied:

1. Code Quality:
   - `pnpm lint:check` passes.
2. Tests:
   - `pnpm test:unit` passes.
   - Relevant E2E scenarios are updated/executed for critical flows when applicable.
3. Build Integrity:
   - `pnpm build` passes.
4. Documentation:
   - Relevant docs are updated when behavior/API/schema changes.
   - If `.shrimp-data/tasks.json` changes, regenerate `docs/migration/REMAINING_TASKS_MERGED.md` using `pnpm shrimp:remaining:generate`.
   - Migration decisions are reflected in `docs/migration/`.
5. Security and Access:
   - RLS/RBAC impact reviewed for data access changes.
6. Evidence:
   - PR includes gate run output summary and test evidence.

## 8. Quality Gate Execution

- Canonical entrypoint:
  - `scripts/quality-gate.sh`
- Non-canonical scripts:
  - `scripts/quality-gates.sh` must not be used as merge/release gate evidence.
- Required gates:
  1. Lint
  2. Unit tests
  3. Build
  4. Documentation baseline
  5. Debug statement guard
  6. Remaining tasks merged document sync (`tasks.json` ↔ `REMAINING_TASKS_MERGED.md`)

If any gate fails, merge/release is blocked.

### 8.1 Quality Gate Criteria Matrix

Run gates in the fixed order below:

| Order | Gate | Command / Check | Pass Criteria | Fail Response |
| --- | --- | --- | --- | --- |
| 1 | Lint | `pnpm lint:check` | Exit code `0` and no ESLint error | Fix lint errors, rerun Gate 1 |
| 2 | Unit Tests | `pnpm test:unit` | Exit code `0` and all selected unit tests pass | Fix failing tests, rerun Gate 2 |
| 3 | Build | `pnpm build` | Exit code `0` and production build artifacts generated | Fix compile/build errors, rerun Gate 3 |
| 4 | Documentation Baseline | `scripts/quality-gate.sh` required-doc check | Required migration docs exist and are readable | Restore/update missing docs, rerun Gate 4 |
| 5 | Debug Statement Guard | `scripts/quality-gate.sh` debug scan | No `console.log`/`console.table` in `src/**/*.ts` and `src/**/*.vue` | Remove debug statements, rerun Gate 5 |
| 6 | Remaining Tasks Sync | `./scripts/task-quality-check.sh` (Metric 6) | No drift between `.shrimp-data/tasks.json` and `docs/migration/REMAINING_TASKS_MERGED.md` | Run `pnpm shrimp:remaining:generate`, review diff, rerun Gate 6 |

A PR can be merged only after all six gates pass in sequence.

### 8.2 E2E Trigger Conditions

`pnpm test:e2e` (or a documented targeted Playwright subset) is mandatory when changes touch one or more of the following:

1. Auth, membership status, RBAC rules, or route guards
2. Signup/approval/access status flows
3. Onboarding forced-flow behavior
4. Core schedule workflow contracts (Step1~Step4 data flow, solver request/response/polling)
5. Navigation/menu access control by role

E2E pass criteria:

- All selected scenarios pass with exit code `0`
- No unresolved flaky test remains in release evidence

If E2E is required and not passed, merge/release is blocked.

### 8.3 Failure Triage and Rollback Procedure

When any quality gate fails, use the following sequence:

1. Classify failure:
   - `lint`, `unit`, `build`, `docs`, `debug`, `e2e`, or `environment`
2. Assign owner and response time:
   - Record owner and ETA in PR or task update
3. Apply remediation:
   - Fix root cause and rerun the failed gate first
   - Then rerun full `scripts/quality-gate.sh`
4. Decide rollback readiness:
   - If release window risk remains, Release Owner decides No-Go or rollback using Section 10 policy
5. Attach evidence:
   - Update PR with failure cause, fix summary, rerun logs, and final gate status

## 9. Exception (Waiver) Policy

Waivers are allowed only when all fields are documented in the PR:

- Reason for waiver
- Scope and impacted modules
- Risk and mitigation plan
- Expiration date
- Approver names

Expired waivers must not be reused.

## 10. Rollback Policy

Rollback must be defined before rollout for:

- Database migration
- Edge function deployment
- Frontend deployment

Detailed rollback actions should be tracked in migration execution docs.

## 11. Change Control

- This governance document can be changed only through PR review.
- Every change must include:
  - Why the rule changed
  - Which existing workflow is affected
  - Effective date
