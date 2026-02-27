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

## 4. Rollout Policy

- Stage order:
  1. Development validation
  2. Staging validation
  3. Private beta rollout
- Every rollout requires:
  - Passed quality gates
  - Regression impact review
  - Rollback readiness confirmation

## 5. Definition of Done (DoD)

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
   - Migration decisions are reflected in `docs/migration/`.
5. Security and Access:
   - RLS/RBAC impact reviewed for data access changes.
6. Evidence:
   - PR includes gate run output summary and test evidence.

## 6. Quality Gate Execution

- Canonical entrypoint:
  - `scripts/quality-gate.sh`
- Required gates:
  1. Lint
  2. Unit tests
  3. Build
  4. Documentation baseline
  5. Debug statement guard

If any gate fails, merge/release is blocked.

## 7. Exception (Waiver) Policy

Waivers are allowed only when all fields are documented in the PR:

- Reason for waiver
- Scope and impacted modules
- Risk and mitigation plan
- Expiration date
- Approver names

Expired waivers must not be reused.

## 8. Rollback Policy

Rollback must be defined before rollout for:

- Database migration
- Edge function deployment
- Frontend deployment

Detailed rollback actions should be tracked in migration execution docs.

## 9. Change Control

- This governance document can be changed only through PR review.
- Every change must include:
  - Why the rule changed
  - Which existing workflow is affected
  - Effective date
