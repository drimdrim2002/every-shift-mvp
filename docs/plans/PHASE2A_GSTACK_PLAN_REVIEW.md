# EveryShift Phase2A Gstack Plan Review Doc

> Status: Draft for `/plan-eng-review`
>
> Branch: `gstack-plan-review`
>
> Source documents:
>
> - [PHASE2_PRD_KR.md](../prd/PHASE2_PRD_KR.md)
> - [PHASE2_PRD.md](../prd/PHASE2_PRD.md)
> - [PHASE2_ENGINEERING_SPEC_KR.md](../prd/PHASE2_ENGINEERING_SPEC_KR.md)
> - [PHASE2_ENGINEERING_SPEC.md](../prd/PHASE2_ENGINEERING_SPEC.md)

## 0. Gstack Flow Recovery

The current state of this branch is that gstack outputs are mixed together across documents at different levels and draft code.

This document is the recovery control document for reorganizing that mixed state back into the order below.

### 0.1 Reclassifying Outputs by Skill

#### A. `/office-hours` + `/plan-ceo-review`

The outputs of this stage are the product definition and scope lock-in documents.

- [PHASE2_PRD_KR.md](../prd/PHASE2_PRD_KR.md)
- [PHASE2_PRD.md](../prd/PHASE2_PRD.md)

These two documents are not in gstack's `~/.gstack/projects/...design...md` format, but by actual content they should be treated as the product/design artifacts for this branch.

#### B. `/plan-eng-review`

π
The outputs of this stage are the execution specs from an implementation perspective.

- [PHASE2_ENGINEERING_SPEC_KR.md](../prd/PHASE2_ENGINEERING_SPEC_KR.md)
- [PHASE2_ENGINEERING_SPEC.md](../prd/PHASE2_ENGINEERING_SPEC.md)

These two documents are treated as engineering artifacts for translating the PRD into code.

#### C. Implementation drafts

This branch previously had initial drafts for migrations, Edge Functions, and the frontend API skeleton from an earlier session, but they have now been rolled back and do not remain in the working tree.

In this review, they are treated only as historical draft artifacts.

- Even if they do not exist in the current worktree, they are not the source of truth.
- Even in future implementation, these drafts will not be restored. Instead, each slice will be re-implemented based on the plan locked by the review.

### 0.2 Canonical source of truth

In this branch, the source of truth follows the priority order below.

1. Product decisions: [PHASE2_PRD_KR.md](../prd/PHASE2_PRD_KR.md), [PHASE2_PRD.md](../prd/PHASE2_PRD.md)
2. Implementation decisions: [PHASE2_ENGINEERING_SPEC_KR.md](../prd/PHASE2_ENGINEERING_SPEC_KR.md), [PHASE2_ENGINEERING_SPEC.md](../prd/PHASE2_ENGINEERING_SPEC.md)
3. Review control: [PHASE2A_GSTACK_PLAN_REVIEW_KR.md](./PHASE2A_GSTACK_PLAN_REVIEW_KR.md)
4. Code drafts: migration / Edge Function / frontend API skeleton

In other words, the code drafts do not override the documents.

### 0.3 Recovery principles

- Do not discard the PRD that has already been written.
- Do not discard the engineering spec either.
- Do not delete the implementation drafts right now, but keep them frozen.
- From this point forward, the review is based on this document, not the code.
- Only after the review ends do we revive the draft implementation slice by slice.

### 0.4 Gstack order from this point onward

In this branch, the sequence below is treated as the canonical flow.

1. The `/office-hours` result is considered already reflected in the PRD.
2. The `/plan-ceo-review` result is treated as the PRD's scope/positioning decision.
3. `/plan-eng-review` uses this document as the review target and locks architecture/tests/performance.
4. Before the eng review is complete, migrations and the TS skeleton are treated not as in-progress work but as frozen drafts.
5. After the eng review is complete, the first implementation slice resumes in the order below.
   - schema foundation
   - backend read/write path
   - Step5 review hub
   - trust-layer tests
6. The ops write path and rolling fairness ledger are deferred to the next slice.

### 0.4-bis Confirmed scope of this eng review

Per the Step 0 decision, this `/plan-eng-review` and the first implementation slice will cover only the `Trust Layer`.

In scope for this review / first implementation:

- month container redefinition
- `schedule_versions`
- `schedule_evaluations`
- version-scoped assignments/preferences
- recheck/finalize gate
- Step5 review hub
- trust-layer tests

Out of scope for this review / first implementation:

- `organization_rank_codes`
- `off_request_policy_rules`
- admin bootstrap
- ops write path
- rolling fairness ledger

The out-of-scope items above are not removed from product scope. They are deferred to the next plan/implementation slice.

### 0.5 What we are not doing right now

- Do not rerun office-hours from scratch.
- Do not rewrite the PRD again in a new format.
- Do not keep expanding the draft implementation as if it were the source of truth.
- Do not try to solve migration application issues first.

## 1. Role of this document

This document is the branch-specific review target for locking the Phase2 PRD and engineering spec written so far into an actual implementation plan.

The purposes of this document are as follows.

- Provide a single implementation plan for `/plan-eng-review` to review.
- Isolate the already written migration, Edge Function skeleton, and frontend API skeleton as draft artifacts rather than the source of truth.
- Re-lock scope, architecture, test plan, and cut line before implementation.

## 2. Current assessment

Among the outputs created so far, the product decisions are valid, but implementation moved ahead of the review process.

Valid planning artifacts:

- [PHASE2_PRD_KR.md](../prd/PHASE2_PRD_KR.md)
- [PHASE2_PRD.md](../prd/PHASE2_PRD.md)
- [PHASE2_ENGINEERING_SPEC_KR.md](../prd/PHASE2_ENGINEERING_SPEC_KR.md)
- [PHASE2_ENGINEERING_SPEC.md](../prd/PHASE2_ENGINEERING_SPEC.md)

Draft artifacts not yet approved:

- [007_phase2a_version_evaluation_foundation.sql](../../migrations/007_phase2a_version_evaluation_foundation.sql)
- [phase2-schedule/index.ts](../../supabase/functions/phase2-schedule/index.ts)
- [phase2-ops/index.ts](../../supabase/functions/phase2-ops/index.ts)
- [phase2.ts](../../src/api/phase2.ts)
- [phase2.ts](../../src/types/phase2.ts)

Principles:

- The draft artifacts above are for reference only.
- They are not treated as the implementation baseline until the formal review is complete.
- If the structure changes during review, those draft artifacts may be revised or discarded.

## 3. Goal

The overall goal of Phase2A is to add the following on top of the existing Phase1 schedule-generation flow.

- Allow multiple candidate versions to be created and compared for the same month.
- Allow finalization only based on the selected version's `latest passed evaluation`.
- Have the backend evaluator compute hard-constraint proof, off-request explanations, and review status.
- Distinguish among `review_blocked`, `infeasible`, and `solve_failed`.
- Operate rank using organization-specific code-based configuration.
- Write the rolling fairness ledger only based on the finalized version.

However, the locking target of this `/plan-eng-review` is only the items directly required for the Trust Layer among the full goals above.

## 4. Scope

### 4.1 In Scope

- Redefine `schedules` as the month container
- Introduce `schedule_versions` and `schedule_evaluations`
- Extend `schedule_assignments` and `schedule_preferences` to version scope
- Restructure Step5 into a version compare + review hub
- Define the evaluator/recheck/finalize backend flow
- Finalize the unit/integration/e2e test plan

### 4.2 Not In Scope

- Phase2B signup/self-serve/dashboard
- finalized month reopen UI
- real solver engine replacement
- multi-tenant admin console expansion
- rank code / off-request policy write path
- admin bootstrap
- fairness ledger write based on the finalized version
- any new artifact type beyond deployment automation

## 5. Minimum-change principles based on Step 0

### 5.1 Existing code reuse

Reuse the existing flow as much as possible.

- [schedule.ts](../../src/api/schedule.ts): starting point for month-based schedule container logic
- [useAISolver.ts](../../src/composables/useAISolver.ts): reference for solver state/polling patterns
- [Step4InitialData.vue](../../src/views/schedule/Step4InitialData.vue): starting point for version-scoped preference input
- [Step5Result.vue](../../src/views/schedule/Step5Result.vue): existing screen to extend into the review hub
- [schedule.ts](../../src/stores/schedule.ts): reuse wizard state and route progression

### 5.2 Minimum viable change set

The minimum implementation units required to achieve the core goal are the four groups below.

1. DB foundation: container/version/evaluation schema
2. Backend read/write path: ensure/create version/compare/review/recheck/finalize
3. Step5 review hub: version list, compare summary, evaluation proof, finalize CTA
4. Test suite: DB invariants, API contracts, finalize gate, review UI flow

### 5.3 Complexity guardrail

Treat the following as smells.

- The plan is designed to require large simultaneous changes across more than eight code files
- More than three new services/helpers are needed for the same responsibility
- Step5 is split out like a separate review app instead of being expanded

The recommended direction of this document is not to build a new platform, but to extend the existing Step4/Step5 flow and Supabase function boundaries.

## 6. Proposed architecture

### 6.1 Data flow

```text
Step1-4 inputs
  -> ensure month container
  -> create version from current inputs
  -> solver execution
  -> write current assignments for version
  -> evaluator computes immutable evaluation
  -> Step5 review hub loads:
       - version list
       - compare metrics
       - latest evaluation for selected version
  -> operator may edit assignments
  -> recheck creates new evaluation for bumped revision
  -> finalize selected version if latest evaluation passed
```

Notes:

- Writing the rolling fairness ledger after finalization is not included in the scope of this review.

### 6.2 Status lifecycle

```text
draft
  -> solving
  -> review_ready
  -> review_blocked
  -> infeasible
  -> solve_failed

manual edit
  -> review_pending
  -> recheck
  -> review_ready / review_blocked

review_ready
  -> finalize
  -> finalized
```

### 6.3 Finalization gate

```text
selected version
  -> check current_revision
  -> query latest_evaluation
  -> latest_evaluation.revision_no == current_revision ?
  -> latest_evaluation.result_status == passed ?
  -> yes: finalize transaction
  -> no: block with reason
```

## 7. Implementation slices

### Slice 1. Schema foundation

Output:

- version/evaluation-centered schema migration
- legacy data backfill strategy
- idempotent migration notes

Verification:

- backfill one version for each legacy schedule
- ensure version-scoped uniqueness
- verify finalization FK integrity

### Slice 2. Read/write API boundary

Output:

- ensure month container
- create version
- list versions / compare
- load selected version review
- recheck
- finalize

Verification:

- consistent response shape based on the selected version
- reject finalize on stale evaluation
- distinguish responses for `review_blocked`, `infeasible`, and `solve_failed`

### Slice 3. Step5 review hub

Output:

- version selector
- input diff summary
- comparison metrics
- proof summary / violation details / off-request results
- finalize button gating

Verification:

- when a different version is selected, the review pane switches immediately
- after manual edit, the `review_pending` state is reflected
- finalize is not allowed before recheck

Notes:

- This eng review and the first implementation slice target only Slices 1-3.
- `organization_rank_codes`, `off_request_policy_rules`, admin bootstrap, and the rolling fairness ledger are deferred to the next slice.

## 8. Test plan

### 8.1 DB / migration

- legacy backfill
- unique key migration
- selected/finalized version FK integrity

### 8.2 Backend integration

- ensure month container idempotency
- create version increments `latest_version_no`
- compare payload contains input diff + metrics
- recheck creates immutable evaluation row
- finalize blocks stale revision

### 8.3 Frontend

- Step5 version switching
- review state rendering
- manual edit -> review_pending -> recheck
- finalize CTA disabled/enabled transitions

### 8.4 Failure modes

- solver timeout -> `solve_failed`
- infeasible response -> infeasibility panel
- evaluator detects hard violations -> `review_blocked`
- stale selected version while another tab edits data

### 8.5 Deferred after Trust Layer

- rank code dictionary / policy write path
- admin bootstrap / setup checklist
- rolling fairness ledger write

## 9. Cut lines

This plan locks the following first.

- the basic unit of compare is version
- the finalization gate is based on the selected version
- the backend evaluator computes trust proof
- Step5 remains an expanded screen, not a new app

The following are not implemented before review approval.

- actual migration deployment
- full implementation of Edge Function business logic
- completed frontend route wiring
- expanded real solver integration

## 10. Questions that must be locked in review

1. Whether to apply the migration all at once, or split foundation/backfill
2. Whether to keep the evaluator and finalize transaction in the same function, or separate them
3. Whether compare and edit should coexist in Step5, or be split into separate panes
4. Whether optimistic checks alone are sufficient for selected version concurrency, or row locking should be included
5. How fixed the proof/metrics JSON shape should be in the API contract

## 11. Working principles for this branch

- Lock the planning artifacts first.
- The implementation drafts are inputs to the review, not outputs.
- Before the review is done, change the plan before changing the code.
- When implementation starts, resume slice by slice.

## GSTACK REVIEW REPORT

| Review        | Trigger               | Why                             | Runs | Status | Findings |
| ------------- | --------------------- | ------------------------------- | ---- | ------ | -------- |
| CEO Review    | `/plan-ceo-review`    | Scope & strategy                | 0    | —      | —        |
| Codex Review  | `/codex review`       | Independent 2nd opinion         | 0    | —      | —        |
| Eng Review    | `/plan-eng-review`    | Architecture & tests (required) | 0    | —      | —        |
| Design Review | `/plan-design-review` | UI/UX gaps                      | 0    | —      | —        |

**VERDICT:** NO REVIEWS YET — run `/autoplan` for the full review pipeline, or run the individual reviews above.
