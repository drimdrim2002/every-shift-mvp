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
- Comparison of improvements versus an existing manual schedule
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
- Why is this result fairer than the existing schedule?
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

### 4.2 Internal Layer Split for Phase2A

Phase2A should be designed not as one large bundle, but as two distinct layers.

- `Phase2A-1: Trust Layer`
  The layer that allows head nurses to trust, explain, and finalize generated results
- `Phase2A-2: Go-Live Ops Layer`
  The minimum operational-preparation layer required to start a real pilot

Principles:

- The Trust Layer should be defined separately from the Go-Live Ops Layer.
- First-pilot success depends more directly on Trust Layer completeness than on Go-Live Ops Layer completeness.
- The Go-Live Ops Layer should ideally follow right after the Trust Layer, but the two should not be mixed into one oversized scope.

### 4.3 Phase2A-1 - Trust Layer

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
- Final confirmation must be based on the latest proof snapshot for the latest generated result

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

#### C. Explanation for Unreflected Off Requests

Because off requests are a soft constraint, the system must provide a reason whenever a request is not reflected.

Required output items:

- Employee name
- Request date
- Request details
- Reflection status
- Reason it was not reflected
- Summary of why no feasible alternative existed

#### D. Before/After Comparison Report

Under the same input conditions, compare the existing manual plan with the EveryShift result.

Comparison conditions:

- Same month
- Same staff population
- Same required staffing
- Same off requests
- Same legal constraints

Comparison metrics:

- Number of hard-constraint violations
- Time spent creating and editing
- Off-request reflection rate
- Night-shift variance
- Weekend-shift variance
- Number of manual edits

Note:

- In pilots, the product must support at least one of the following: manual-plan upload or direct entry of key baseline metrics.

#### E. Finalization Gate

- If at least one hard-constraint violation exists, final confirmation is blocked
- If the result is infeasible, final confirmation is blocked
- Unreflected off requests do not block final confirmation, but their reasons must always be inspectable
- If an operator manually edits the result, the proof and explanation outputs must be refreshed

### 4.4 Phase2A-2 - Go-Live Ops Layer

#### A. Admin Bootstrap and Initial Operational Setup

- The operator or internal team must be able to provision the first admin account
- Admin login
- Input or confirmation of core organization information
- Input of ward or site information
- Employee registration and Excel upload
- Shift and constraint configuration

Notes:

- The first deployment can operate without `general employee self-signup`
- If needed, an assisted pilot model is allowed in which an operator sets up the initial data directly
- This bootstrap scope is intentionally distinct from the self-serve signup and approval flow in Phase2B

#### B. Off-Request Policy Management

- Off-request input by employee
- Monthly off-request limit management
- Annual cumulative off-request limit management
- Off-request limit policy settings by rank
- Display of reflected versus unreflected requests

#### C. Rolling Fairness Ledger

Fairness should be managed on a cumulative basis rather than as a single-month metric.

- Cumulative N/E/weekend shifts over the last 3 months
- Cumulative N/E/weekend shifts over the last 6 months
- Cumulative N/E/weekend shifts over the last 12 months
- Apply cumulative imbalance to the cost function when generating the next month

#### D. Pilot Entry Guide

- After first login, guide the operator through what to do and in what order
- Confirm organization information
- Guide employee registration
- Guide the first scheduling request

Notes:

- In Phase2A, a guided checklist is sufficient
- A polished self-serve onboarding wizard belongs to Phase2B

### 4.5 Phase2A Success Criteria

Trust Layer criteria:

- Zero hard-constraint violations
- Improved night and weekend variance compared with manual scheduling under the same inputs
- Explanations for unreflected off requests that operators find understandable and acceptable
- Proof and explanation outputs can be reviewed before final confirmation

Go-Live Ops Layer criteria:

- One or two admins can complete initial setup and reach the monthly scheduling flow
- A reduction in head-nurse schedule creation and editing time from 6 hours to around 30 minutes
- The ability to generate and finalize monthly schedules in a real ward pilot

### 4.6 Phase2A Deliverables

Trust Layer deliverables:

- A hard-constraint compliance proof screen
- An infeasibility explanation screen
- An unreflected off-request explanation screen
- A before/after comparison report
- A finalization gate

Go-Live Ops Layer deliverables:

- A deployable version that can support ward operations
- Admin bootstrap and a pilot-entry guide
- Off-request policy management UI
- A cumulative fairness data structure based on rolling fairness

---

## 5. Phase2B - Self-Serve & Scale

Phase2B is the service expansion stage.

### 5.1 Goals

- Enable hospitals to sign up and operate on their own
- Expand operational capabilities across administrators, employees, and organizations
- Prepare for multi-organization support and expansion into other industries

### 5.2 Feature Scope

#### A. Sign-Up and Approval Flow

- Admin self-signup
- Employee self-signup
- Organization selection and approval flow
- Approval workflow by `super` / `admin` / `user` roles

#### B. New Organization Self-Serve Onboarding

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

## 6. Before/After Comparison Report Template

The following report should be provided by default in real ward pilots.

### 6.1 Purpose of the Report

- Explain why the EveryShift result is better than the existing manual plan
- Compare fairness, time, and request reflection rates under the same conditions

### 6.2 Report Template

#### Basic Information

- Target organization:
- Target ward:
- Target month:
- Comparison baseline:
  - Existing plan: Manual schedule or output from the current solution
  - Improved plan: EveryShift-generated result

#### Comparison Summary

| Metric                      | Existing Plan | EveryShift | Difference           |
| --------------------------- | ------------- | ---------- | -------------------- |
| Hard-constraint violations  | 0             | 0          | Same                 |
| Creation/editing time       | 6 hours       | 30 minutes | -5h 30m              |
| Off-request reflection rate | 72%           | 81%        | +9 percentage points |
| Night-shift min/max         | 0 / 7         | 4 / 5      | Reduced variance     |
| Weekend-shift min/max       | 1 / 6         | 3 / 4      | Reduced variance     |
| Manual edits                | 14            | 3          | -11                  |

#### Fairness Details

| Item                          | Existing Plan | EveryShift | Interpretation                          |
| ----------------------------- | ------------- | ---------- | --------------------------------------- |
| Night distribution            | 0~7           | 4~5        | Reduced concentration on specific staff |
| Weekend distribution          | 1~6           | 3~4        | Lower weekend variance                  |
| 3-month cumulative N variance | High          | Reduced    | Rolling fairness improved               |

#### Interpretation Summary

- While satisfying all hard constraints, EveryShift reduced night and weekend variance compared with the existing manual plan.
- Under the same conditions, the off-request reflection rate improved and the number of manual edits decreased significantly.
- Operators can either finalize the result immediately or finalize it after only a small number of adjustments.

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
- Users can review unreflected requests and improvement results

### 8.2 Second Deployment Goal

After `Phase2B` is complete, the goal becomes self-serve adoption and expanded operations.

---

## 9. Implementation Priorities

### Priority 1

- Entire Trust Layer
- Hard-constraint compliance proof
- Explanation of why generation is impossible
- Explanation for unreflected off requests
- Before/after comparison report
- Finalization gate

### Priority 2

- Entire Go-Live Ops Layer
- Admin bootstrap and pilot-entry guide
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
- What input method should be standardized for the existing-plan baseline used in before/after comparison?
- How should monthly and annual off-request limits be differentiated by rank?
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
