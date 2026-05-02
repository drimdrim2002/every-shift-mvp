# EveryShift Phase2 PRD - Strengthening Deployment and Operational Reliability

## Document Information

- Version: Phase2 Draft 1.0
- Date: 2026-03-25
- Purpose: Define the feature scope required for real ward deployment after the Phase1 MVP
- Audience: Product planning, design, implementation, and pilot operations
- Premise: The Phase1 shift-generation MVP has been completed, and Phase2 extends the deployment and operations layer of the existing product rather than introducing a new product.

---

## 1. Purpose of This Document

This document was written to connect the following two documents.

- `PRD.md`: The Phase1 MVP document centered on shift generation
- `REFINED_PRD_KR.md`: A document capturing expansion-feature ideas needed for real service delivery

The purpose of Phase2 is not simply to add more features. At the product level, it is to complete the following so that real wards can trust and adopt EveryShift.

1. Trust that legal hard constraints are always enforced
2. Proof that fairness has actually improved
3. Operational explainability for unreflected requests and generated results
4. A practically deployable onboarding flow for ward administrators

The core positioning is as follows.

> EveryShift is a solution for head nurses in wards with 50 or more staff, reducing night and weekend shift imbalance and shortening schedule creation time while accounting for legal constraints and advance off requests.

---

## 2. Product Phase Definition

### 2.1 Current State of Phase1

Phase1 has been implemented around the following scope.

- Login
- A schedule-generation workflow based on organization, shift, and employee data
- Schedule creation and editing across Steps 1 through 4
- Excel export
- Schedule generation based on off-related data input

### 2.2 Remaining Gaps in Phase1

Phase1 can generate schedules, but the following elements are still missing for real ward deployment.

- Proof that generated results satisfy hard constraints
- Explanations for why generation is impossible
- Explanations for why off requests were not reflected
- Comparison across generated schedule plans and rationale for selecting the final plan
- Fairness management from a cumulative perspective rather than a month-only view
- Administrator-centered initial onboarding for actual deployment

### 2.3 Definition of Phase2

Phase2 is divided into the following two stages.

- `Phase2A: Go-Live Core`
  Scope required to enable real ward pilots and initial deployment
- `Phase2B: Self-Serve & Scale`
  Expanded scope that allows hospitals to sign up and operate on their own

---

## 3. Product Principles

### 3.1 Constraint Priority

EveryShift does not treat all constraints equally.

#### Hard Constraints

These constraints must never be violated.

- No work beyond 52 hours per week
- No `NNN`
- No `NOD`
- No minimum-rest-time violations
- No understaffing against required headcount

#### Soft Constraints

These should be satisfied whenever possible, but only within the range that does not break hard constraints.

- Employee-specific off requests
- Preferred and non-preferred shifts
- Minimizing variance in night, weekend, and evening shifts
- Improving monthly and cumulative fairness

#### Policy Constraints

These are constraints configured by the organization according to operating policy.

- Monthly off-request limits by rank
- Annual off-request limits by rank
- Whether specific shift types are allowed
- Additional rules for specific wards or job functions

### 3.2 Explainability Principle

Users should not simply receive a result. They must also be able to get answers to the following questions.

- Is this result legally safe?
- Why were some off requests not reflected?
- Why is this plan more appropriate than the other generated plans?
- If fairness is not perfect this month, how is it corrected from a cumulative perspective?

### 3.3 Deployment Principle

The first deployment is defined not as a fully self-serve SaaS launch, but as a ward-pilot deployment.

- First-deployment goal: One or two head nurses must be able to generate and finalize a real monthly schedule.
- Expansion goal: Hospitals must eventually be able to sign up, configure their organizations, and operate on their own.

---

## 4. Phase2A - Go-Live Core

Phase2A is the minimum scope required for real ward deployment.

### 4.1 Goals

- Make Phase1 functionality usable in real wards
- Secure result trustworthiness and explainability
- Complete administrator-centered initial onboarding

### 4.2 Internal Layer Split

Phase2A is not treated as one undifferentiated bundle. It is split into the following two layers.

- `Phase2A-1: Trust Layer`
  The layer that lets head nurses trust, explain, compare, and finalize generated results
- `Phase2A-2: Go-Live Ops Layer`
  The minimum operational-preparation layer required to start a real pilot

Principles:

- The Trust Layer is defined separately from the Go-Live Ops Layer.
- The success of the first pilot depends more directly on Trust Layer completeness than on Go-Live Ops completeness.
- The Go-Live Ops Layer should be added immediately after the Trust Layer when possible, but the two should not be mixed into one oversized scope.

### 4.3 Phase2A-1 - Trust Layer

#### Trust Layer Fixed Rules

- Multiple schedule plans (`schedule_versions`) may exist for the same target month.
- A materially different set of off requests, locked assignments, policies, or input conditions creates a new plan.
- Re-solving, manual edits, and rechecks within the same plan are tracked by increasing the revision.
- An evaluation is stored as an immutable snapshot at the `version + revision` level.
- The backend evaluator calculates hard-constraint proof, unreflected off-request explanations, and review state from the saved assignments.
- `review_blocked` means a result exists, but hard-constraint violations were found.
- `infeasible` means no feasible schedule could be created under the current input conditions.
- `solve_failed` means a system, network, or integration failure occurred.

#### A. Proof of Hard-Constraint Compliance

After generation is complete, the system must show the following outcomes.

- Number of 52-hour-per-week violations
- Number of `NNN` violations
- Number of `NOD` violations
- Number of minimum-rest-time violations
- Number of required-staffing shortfalls

Output principles:

- If there are zero hard-constraint violations, display the status as `Satisfied`
- If violations exist, block final confirmation of the result and provide a list of causes
- The proof snapshot must be stored for the current revision of the selected version.
- Final confirmation must only be allowed against the latest passed evaluation for the current revision of the selected version.

#### B. Explanation of Why Generation Is Impossible

If no feasible solution exists, the system must explain the reason rather than simply failing.

Example:

- Three staff are required for the night shift on September 14
- After reflecting approved off requests and previous-day work history, only two feasible staff remain
- If hard constraints are preserved, that date cannot be satisfied

Required output items:

- Infeasible date
- Short-staffed shift
- Required headcount and feasible headcount
- Main conflict causes

Classification principles:

- `infeasible` is used only when no feasible schedule can be created under the current inputs.
- If a result exists but hard-constraint violations such as `NOD`, weekly-hours violations, minimum-rest violations, or staffing shortfalls are found, the result is classified as `review_blocked`, not `infeasible`.

#### C. Explanation for Unreflected Off Requests

Because off requests are a soft constraint, the system must provide a reason whenever a request is not reflected.

Required output items:

- Employee name
- Request date
- Request details
- Reflection status
- Reason it was not reflected
- Summary of why no feasible alternative existed

#### D. Candidate Version Comparison Report

For the same target month, compare multiple generated schedule plans and select one of them as the finalization target. The base Step5 screen focuses on the current result detail; comparison opens only inside the `근무표안 비교` modal.

Comparison conditions:

- Same organization / ward
- Same target month
- The changed inputs for each plan, such as off requests, locked assignments, policies, or manual edits, must be recorded explicitly
- The purpose of compare is to choose one finalization target plan

Comparison metrics:

- Number of hard-constraint violations
- Off-request reflection rate
- Night-shift variance
- Weekend-shift variance
- Rolling fairness impact
- Number of manual edits
- Summary of input differences across plans

Notes:

- The core compare flow in Phase2A does not assume a manual baseline schedule by default.
- Manual-schedule versus generated-schedule reporting may be separated into pilot materials or later functionality.

#### E. Finalization Gate

- If at least one hard-constraint violation exists, finalization is not allowed.
- If the version is `infeasible`, finalization is not allowed.
- Unreflected off requests do not block finalization, but their reasons must remain inspectable.
- If an operator manually edits the selected plan, the state must move to `review_pending` and proof / explanation artifacts must be recalculated.
- Finalization is only allowed when the latest passed evaluation matches the current revision of the selected plan.
- Other unfinalized plans may remain visible as compare candidates inside the compare modal.

### 4.4 Phase2A-2 - Go-Live Ops Layer

Scope note:

- Phase2A-2 completion is defined as an operator-assisted pilot go-live, not a fully self-serve launch.
- An operator or internal team may provision the first pilot administrator and help complete initial setup.
- Browser users do not create organizations, invite themselves, or grant themselves access in this phase.
- `site_requirements` remains the canonical staffing source for schedule generation. `sites` can support pilot metadata and active-site selection, but Phase2A-2 does not migrate staffing to `site_staffing_requirements`.

#### A. Administrator Bootstrap and Initial Operational Setup

- An operator or internal team must be able to provision the first administrator account
- Administrator login
- Input / confirmation of core organization information
- Input of ward or site information
- Employee registration and Excel upload
- Shift and constraint configuration

Notes:

- The first deployment can operate without `general employee self-signup`.
- If needed, an assisted pilot model is allowed in which an operator sets up the initial data directly.
- The bootstrap described here is distinct from the self-serve signup and approval flow in Phase2B.

#### B. Off-Request Policy Management

- Off-request input by employee
- Monthly off-request limit management
- Annual cumulative off-request limit management
- Off-request limit policy settings by organization-specific rank code
- Display of reflected versus unreflected requests

Notes:

- Rank is managed by organization-specific codes, and some organizations may not use a rank system.
- Organizations without rank should fall back to a common organization-level policy.

#### C. Rolling Fairness Ledger

Fairness should be managed on a cumulative basis rather than as a single-month metric.

- Cumulative N/E/weekend shifts over the last 3 months
- Cumulative N/E/weekend shifts over the last 6 months
- Cumulative N/E/weekend shifts over the last 12 months
- Read-only cumulative fairness summaries for operator review

Notes:

- The rolling fairness ledger should only be written from finalized versions.
- Drafts, review-in-progress versions, and compare-only candidates must not pollute the ledger.
- Phase2A-2 includes finalized-only ledger writes and read-only aggregate summaries.
- Solver optimization from rolling fairness history is separated into a later phase.

#### D. Pilot Entry Guidance

- After the first login, guide operators through what they should do and in what order
- Organization information confirmation
- Employee registration guidance
- First schedule request guidance

Notes:

- In Phase2A, a guided checklist is sufficient.
- A full self-serve onboarding wizard belongs to Phase2B.

#### E. Phase2A-2 Assisted Pilot Scope and Deferred Items

The following items are not missing requirements. They are intentionally deferred because Phase2A-2 is limited to an operator-assisted pilot go-live.

| Item                                                                         | Why deferred from Phase2A-2                                                                                                            | Next-step direction                                                                                                |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Solver consumption of rolling fairness context                               | Phase2A-2 records finalized-only ledger data and exposes read-only summaries, but does not tune solver behavior from that history yet. | Reopen after ledger integrity and finalized-history semantics are proven in pilot usage.                           |
| Canonical migration from `site_requirements` to `site_staffing_requirements` | Switching the staffing source during pilot setup would risk duplicate scheduling inputs.                                               | Evaluate only when a multi-site or richer staffing model requires a new canonical source.                          |
| Reopen/unfinalize or fairness correction workflow                            | Phase2A-2 keeps finalized months read-only and avoids changing the Trust Layer finalization lifecycle.                                 | Define reversal semantics, audit trail, and ledger correction rules before allowing finalized schedules to reopen. |
| Self-signup or invite-driven onboarding                                      | Assisted pilot launch can rely on operator-provisioned access and does not need self-serve acquisition flows.                          | Move to Phase2B self-serve onboarding once hospitals need to create their own organizations and users.             |
| Approval queue semantics                                                     | There is no end-user approval queue in the assisted pilot scope.                                                                       | Add only when self-signup, invite acceptance, or organization membership requests exist.                           |
| Membership-based auth rewrite                                                | Existing organization-scoped access is sufficient for assisted pilot operations.                                                       | Revisit when multi-organization membership, invite flows, or per-organization role assignment becomes necessary.   |
| Full RBAC                                                                    | Phase2A-2 requires narrow operator/admin access, not a complete permission matrix.                                                     | Expand with Phase2B scale-up needs across super/admin/user roles and multi-organization administration.            |
| Advanced operations dashboard or analytics                                   | Phase2A-2 needs a guided readiness checklist, not a broad analytics surface.                                                           | Build after pilot metrics prove which operational questions must be answered repeatedly.                           |
| Any Phase2B self-serve feature                                               | Phase2B is the self-serve and scale-up stage, separate from the assisted pilot go-live.                                                | Keep in Phase2B unless a pilot-blocking dependency is explicitly proven.                                           |

### 4.5 Phase2A Success Criteria

Trust Layer criteria:

- Zero hard-constraint violations
- Operators can understand the tradeoffs across generated plans and choose one plan
- Operators receive explanations for unreflected off requests that they find understandable and acceptable
- Proof and explanation artifacts can be reviewed before finalization

Go-Live Ops Layer criteria:

- One or two administrators can complete initial setup and enter the monthly generation flow
- Head-nurse schedule creation and editing time is reduced from about 6 hours to around 30 minutes
- Real ward pilots can generate and finalize monthly schedules

### 4.6 Phase2A Deliverables

Trust Layer deliverables:

- A hard-constraint compliance proof screen
- An infeasibility explanation screen
- An unreflected off-request explanation screen
- A generated-plan comparison report
- A finalization gate

Go-Live Ops Layer deliverables:

- A ward-operable deployment
- Administrator bootstrap and pilot entry guidance
- An off-request policy-management surface
- A cumulative fairness data structure based on rolling fairness

### 4.7 Engineering-Ready Rules

#### A. Core Entities

- One target month is managed as one schedule container.
- Multiple generated plans can exist under one schedule container.
- Each version can have multiple revisions.
- An evaluation is an immutable review artifact stored per `version + revision`.

#### B. State Lifecycle

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

- `review_ready`: the latest evaluation for the current revision is passed
- `review_blocked`: a result exists, but hard-constraint violations remain
- `review_pending`: recheck required after manual edits
- `infeasible`: no feasible schedule exists under the current inputs
- `solve_failed`: system failure

#### C. Finalization Rules

- Finalization is performed at the selected plan level, not at the whole month level.
- Finalization is allowed only when `selected version + current revision + latest passed evaluation` all match.
- Only the finalized version is treated as the operationally confirmed result, and rolling fairness ledger writes must also follow the finalized version.

#### D. Compare Rules

- The default compare unit is a generated schedule plan, not a manual baseline.
- The base Step5 screen must not keep the compare screen always visible; the compare modal shows both input differences and result differences across plans.
- Operators must compare plans and then finalize one chosen plan.

---

## 5. Phase2B - Self-Serve & Scale

Phase2B is the service expansion stage.

### 5.1 Goals

- Enable hospitals to sign up and operate on their own
- Expand operational capabilities across administrators, employees, and organizations
- Prepare for multi-organization support and expansion into other industries

### 5.2 Feature Scope

#### A. Sign-Up and Approval Flow

- Admin signup
- Employee signup
- Organization selection and approval flow
- Approval workflow by `super` / `admin` / `user` roles

#### B. New Organization Onboarding

- Onboarding wizard on the admin's first login
- Organization information confirmation
- Guidance for employee registration
- Guidance for the first schedule request

#### C. Operations Dashboard

- Night and weekend shift status by employee
- Fairness trends by period
- Status of unreflected off requests
- Schedule status by ward
- Filters and Excel/CSV export

#### D. Notification System

- Approval and rejection notifications
- Generation-complete notifications
- Operational announcement notifications
- Notification preference settings

#### E. Advanced Permission and Organization Management

- Multi-organization management
- More granular permissions for `super`, `admin`, and `user`
- Enhanced organization and employee management UI

#### F. Industry Expansion

- Expansion beyond hospitals into fire, police, and factory domains
- Expansion of shift-type and policy models by domain

### 5.3 Phase2B Is Not Required for the First Deployment

Phase2B is important for product expansion, but it is not considered a blocker for the first ward deployment.

---

## 6. Candidate Version Comparison Report Template

The following report should be provided by default in real ward pilots.

### 6.1 Purpose of the Report

- Provide rationale for deciding which version should be finalized for the same target month
- Compare fairness, request reflection, and hard-constraint status at the version level

### 6.2 Report Template

#### Basic Information

- Target organization:
- Target ward:
- Target month:
- Comparison purpose:
  - Candidate version comparison for the same month
  - Selection of the finalization target

#### Candidate Version Summary

| Version | Creation mode | Input change summary         | Review status  | Finalizable |
| ------- | ------------- | ---------------------------- | -------------- | ----------- |
| V1      | Initial solve | Default off inputs           | review_ready   | Yes         |
| V2      | Re-solve      | Some off requests adjusted   | review_ready   | Yes         |
| V3      | Re-solve      | Staffing requirement changed | review_blocked | No          |

#### Comparison Summary

| Metric                      | V1    | V2    | V3    | Selected |
| --------------------------- | ----- | ----- | ----- | -------- |
| Hard-constraint violations  | 0     | 0     | 2     | V2       |
| Off-request reflection rate | 72%   | 81%   | 79%   | V2       |
| Night-shift min/max         | 0 / 7 | 4 / 5 | 3 / 6 | V2       |
| Weekend-shift min/max       | 1 / 6 | 3 / 4 | 2 / 5 | V2       |
| Manual edits                | 0     | 1     | 0     | V2       |

#### Input Difference Details

| Version | Changed off requests | Changed policy | Changed locked assignments | Note            |
| ------- | -------------------- | -------------- | -------------------------- | --------------- |
| V1      | None                 | None           | None                       | Initial version |
| V2      | 2 adjusted           | None           | None                       | Request realism |
| V3      | None                 | 1 changed      | None                       | Staffing test   |

#### Interpretation Summary

- Operators compare both input differences and result differences across versions before choosing the finalization target.
- A `review_blocked` version may remain visible in compare, but it cannot become the finalization target.
- The selected version can only be finalized against the latest passed evaluation.

---

## 7. Format for Explaining Unreflected Off Requests

### 7.1 Purpose

- Provide explanations so users can trust the result
- Help operators explain to staff why a request could not be granted

### 7.2 Format

| Employee | Date       | Request | Status        | Reason Not Reflected                                                                                                                                            | Note                               |
| -------- | ---------- | ------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Kim OO   | 2026-09-18 | Off     | Not reflected | Meeting the minimum staffing requirement for the N shift on that date took priority, and all alternative staff were blocked by rest or weekly-hours constraints | No feasible reassignment candidate |

### 7.3 Detailed Explanation Template

```text
[Employee Name]'s off request for [Date] was not reflected.
Reason: [Summary of the main conflict].
Details:
- Required [Shift] staffing on that date: [Number]
- Number of feasible alternative staff: [Number]
- Main exclusion reasons: [Rest constraint / 52-hour weekly limit / Previous-night shift / Lack of skill / Insufficient rank]
Conclusion: While preserving hard constraints, this request cannot be reflected in this month's schedule.
```

---

## 8. Deployment Strategy

### 8.1 First Deployment Goal

The first deployment is defined as the point at which `Phase2A` is complete.

Deployment criteria:

- Ward administrators can log in directly
- Organization and employee data can be entered or uploaded
- Off requests can be entered and results can be generated
- Users can view proof that the generated result is legally safe
- Users can review unreflected requests and generated-plan comparison results

### 8.2 Second Deployment Goal

After `Phase2B` is complete, the goal becomes self-serve adoption and expanded operations.

---

## 9. Implementation Priorities

### Priority 1

- Entire Trust Layer
- Hard-constraint compliance proof
- Explanation of why generation is impossible
- Explanation for unreflected off requests
- Candidate-version comparison report
- Finalization gate

### Priority 2

- Entire Go-Live Ops Layer
- Administrator bootstrap and pilot entry guidance
- Off-request limit policy
- Rolling fairness ledger

### Later

- Self-serve signup and approval flow
- Admin operations dashboard
- Notifications
- More advanced organization and permission management
- Expansion into other industries

---

## 10. Open Issues

- What formula should be used to calculate the rolling fairness score?
- Which input differences should be fixed as the default compare diff set?
- How should monthly and annual off-request limits be differentiated by organization-specific rank code?
- For infeasible months, how many alternative schedules should be provided?
- In a real ward pilot, which purchase or adoption metric should be fixed as the primary one?

---

## 11. Conclusion

Phase2 is not a new product. It is the stage that turns the Phase1 MVP into a product that hospitals can actually adopt.

- Phase2A includes the features required for deployment
- Phase2B includes the features required for expansion

EveryShift's core differentiation remains the following.

1. 100% compliance with legal hard constraints
2. Fairness improvement based on cumulative history
3. Explainability for both generated results and unreflected requests
4. Reduced schedule creation and editing time for head nurses
