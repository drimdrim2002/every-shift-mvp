# Phase2A PRD ↔ Execution Cutline Gap Report

- Date: 2026-04-03
- Author: Codex
- Target: `docs/prd/PHASE2_PRD.md`, `docs/prd/PHASE2_PRD_KR.md`, `docs/prd/PHASE2_ENGINEERING_SPEC.md`, `docs/plans/PHASE2A_EXECUTION_SLICES.md`

## 1. Conclusion

`PHASE2A_EXECUTION_SLICES.md` is intentionally locked to **Phase2A-1 Trust Layer only**.

- This is aligned with:
  - `PHASE2_PRD_KR.md` (Phase2A internal split into Trust Layer / Go-Live Ops Layer)
  - `PHASE2_ENGINEERING_SPEC.md` (active target = Trust Layer, ops/fairness deferred)
- This is misaligned with:
  - `PHASE2_PRD.md` (EN), which still reads as if the broader Phase2A scope is a single block without explicit Trust/Ops cutline.

## 2. Scope Alignment Matrix

| Item                                                                    | PRD/Spec Expectation                                                             | Execution Slices Status                                   | Alignment                                 |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------- |
| Hard-constraint proof                                                   | Phase2A Trust Layer required                                                     | Planned in Slice 6/7/8 trust-gate and Step5 review states | Aligned                                   |
| Infeasible explanation                                                  | Phase2A Trust Layer required                                                     | Planned via evaluator/result-state classification         | Aligned                                   |
| Unreflected off-request explanation                                     | Phase2A Trust Layer required                                                     | Planned via evaluator/review payload path                 | Aligned                                   |
| Version compare + select + finalize gate                                | Phase2A Trust Layer required                                                     | Core of Slice 3~8                                         | Aligned                                   |
| Admin bootstrap & pilot setup entry                                     | Phase2A Go-Live Ops Layer required                                               | Not present in slices, deferred from trust-only plan      | Deferred/omitted in current execution doc |
| Off-request policy management (monthly/annual limits, rank-code policy) | Phase2A Go-Live Ops Layer required                                               | Not present in slices, deferred                           | Deferred/omitted in current execution doc |
| Rolling fairness ledger                                                 | Phase2A Go-Live Ops Layer required                                               | Explicitly excluded (`Do Not Do` + deferred references)   | Deferred/omitted in current execution doc |
| Manual baseline before/after report                                     | `PHASE2_PRD.md` requires; `PHASE2_PRD_KR.md` allows separation from core compare | Not represented as a dedicated execution slice            | Needs explicit cutline decision           |

## 3. Confirmed Cutline Conflicts

### 3.1 PRD (EN) vs PRD/Spec (KR+ENG) structure mismatch

- `PHASE2_PRD.md` does not explicitly split Phase2A into Trust/Ops layers.
- `PHASE2_PRD_KR.md` explicitly splits:
  - `Phase2A-1 Trust Layer`
  - `Phase2A-2 Go-Live Ops Layer`
- Execution slices follow the split model, not the monolithic EN PRD model.

Impact:

- Readers using `PHASE2_PRD.md` only can interpret deferred items as missing implementation errors.

### 3.2 Deferred items are real product scope, but absent from execution slices

Execution slices explicitly exclude fairness work and do not include ops-layer tracks.

Impact:

- Without a follow-up plan doc for Go-Live Ops Layer, Phase2A completion criteria are ambiguous at repository level.

## 4. Deferred/Omitted Implementation Register (Separate Tracking)

The following items are currently not covered by `PHASE2A_EXECUTION_SLICES.md` and need a separate execution plan document.

### GAP-01 Admin bootstrap and setup checklist

- Requirement source:
  - `PHASE2_PRD_KR.md` 4.4-A (admin bootstrap / initial ops setup)
  - `PHASE2_PRD_KR.md` 4.6 Go-Live Ops deliverables
- Current status:
  - Deferred, no execution slice owner
- Suggested follow-up artifact:
  - `PHASE2A_OPS_EXECUTION_SLICES.md` Slice O1

### GAP-02 Off-request policy management by rank code (monthly/annual)

- Requirement source:
  - `PHASE2_PRD_KR.md` 4.4-B
  - `PHASE2_ENGINEERING_SPEC.md` deferred list (`organization_rank_codes`, `off_request_policy_rules`)
- Current status:
  - Deferred, no execution slice owner
- Suggested follow-up artifact:
  - `PHASE2A_OPS_EXECUTION_SLICES.md` Slice O2

### GAP-03 Rolling fairness ledger (finalize-triggered write + cumulative model)

- Requirement source:
  - `PHASE2_PRD.md` 4.2-G, 4.4 deliverables, Priority 1
  - `PHASE2_PRD_KR.md` 4.4-C, 4.6 Go-Live Ops deliverables
  - `PHASE2_ENGINEERING_SPEC.md` deferred list (`fairness_ledger_monthly`, finalize-triggered write, optional solver fairness context)
- Current status:
  - Explicitly excluded from current execution slices
- Suggested follow-up artifact:
  - `PHASE2A_OPS_EXECUTION_SLICES.md` Slice O3

### GAP-04 Pilot operations entry guide

- Requirement source:
  - `PHASE2_PRD_KR.md` 4.4-D
- Current status:
  - Deferred, no execution slice owner
- Suggested follow-up artifact:
  - `PHASE2A_OPS_EXECUTION_SLICES.md` Slice O4

### GAP-05 Manual baseline before/after report interpretation gap

- Requirement source conflict:
  - `PHASE2_PRD.md` 4.2-F (manual baseline compare is required)
  - `PHASE2_PRD_KR.md` 4.3-D note (manual baseline compare can be separated from core compare)
- Current status:
  - Not represented explicitly in current execution slices
- Suggested follow-up action:
  - Add a cutline clarification note in PRD/plan docs to avoid future mismatch

## 5. Recommended Documentation Fixes

1. Add a short “Phase2A cutline statement” to `PHASE2_PRD.md` matching KR split (Trust Layer vs Go-Live Ops Layer).
2. Add cross-link from `PHASE2A_EXECUTION_SLICES.md` to a future ops-slice document placeholder.
3. Create `docs/plans/PHASE2A_OPS_EXECUTION_SLICES.md` and move GAP-01~05 into owned slices.

## 6. Key Evidence (line anchors)

- Trust-layer-only lock in execution doc:
  - `docs/plans/PHASE2A_EXECUTION_SLICES.md:5`
- Fairness explicitly excluded in execution slices:
  - `docs/plans/PHASE2A_EXECUTION_SLICES.md:129`
  - `docs/plans/PHASE2A_EXECUTION_SLICES.md:409`
  - `docs/plans/PHASE2A_EXECUTION_SLICES.md:518`
- Engineering spec deferred statement:
  - `docs/prd/PHASE2_ENGINEERING_SPEC.md:7`
  - `docs/prd/PHASE2_ENGINEERING_SPEC.md:31`
  - `docs/prd/PHASE2_ENGINEERING_SPEC.md:797`
- KR PRD split model and ops-layer requirements:
  - `docs/prd/PHASE2_PRD_KR.md:131`
  - `docs/prd/PHASE2_PRD_KR.md:246`
  - `docs/prd/PHASE2_PRD_KR.md:327`
- EN PRD broader Phase2A requirements (including rolling fairness and manual baseline framing):
  - `docs/prd/PHASE2_PRD.md:129`
  - `docs/prd/PHASE2_PRD.md:218`
  - `docs/prd/PHASE2_PRD.md:242`
