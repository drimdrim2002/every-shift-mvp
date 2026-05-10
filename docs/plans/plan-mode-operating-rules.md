# Plan Mode Operating Rules

This document defines how an agent should behave in plan mode before proposing implementation work. Its purpose is to prevent fast but under-specified plans, force ambiguity into the open, and make every plan verifiable before implementation begins.

## Purpose

Plan mode is a quality gate, not a shortcut to a task list.

The agent must convert an unclear request into a clear execution contract. If the request is ambiguous, the plan must expose that ambiguity and either ask questions or label the uncertainty explicitly. The agent must not silently invent requirements that could change the design.

Plan depth must be proportional to risk. A small, clear request should get a small, clear plan. A broad or ambiguous request should get a deeper investigation and design process.

## Core Rule

Do not produce an implementation plan until these steps are complete:

1. Restate the goal in the agent's own words.
2. Identify ambiguous requirements.
3. Inspect relevant local files before proposing code changes.
4. List assumptions explicitly.
5. Ask clarifying questions if any assumption could change the design.
6. Provide at least two possible approaches with trade-offs when multiple materially different designs are possible.
7. Recommend one approach and explain why.
8. Define concrete acceptance criteria.
9. Produce a step-by-step implementation plan.
10. Critically review the plan, revise it, then stop and wait for approval.

If the user asks for a specific output shape, follow that shape first. If the requested shape conflicts with this rule, explain the conflict briefly and ask whether to continue with the stricter plan-mode protocol.

For mechanical or low-risk requests, the agent may use the simple plan fast path below. The fast path still requires code inspection, assumptions, acceptance criteria, and an approval stop, but it does not require a long template or artificial alternatives.

## Information Labels

When information is missing or uncertain, label it instead of hiding it:

- `Question`: The user must answer because the choice changes behavior, scope, or architecture.
- `Assumption`: The agent can proceed only if this remains true.
- `Risk`: A known way the plan could fail, regress behavior, or create operational cost.
- `Needs code inspection`: The agent cannot answer yet without reading specific files.

## Ambiguity Checklist

Before writing the plan, evaluate each category:

| Category                            | Status                             | Notes                                                   |
| ----------------------------------- | ---------------------------------- | ------------------------------------------------------- |
| User flow / expected behavior       | Clear / Ambiguous / Not applicable | What should the user see or do?                         |
| Data model changes                  | Clear / Ambiguous / Not applicable | Are schema, type, or persistence changes needed?        |
| API contract                        | Clear / Ambiguous / Not applicable | Are request, response, or error contracts affected?     |
| Error handling                      | Clear / Ambiguous / Not applicable | What happens when the operation fails?                  |
| Authentication / authorization      | Clear / Ambiguous / Not applicable | Who can perform the action?                             |
| Edge cases                          | Clear / Ambiguous / Not applicable | What unusual states must still work?                    |
| Migration or backward compatibility | Clear / Ambiguous / Not applicable | Does existing data or behavior need preservation?       |
| Tests                               | Clear / Ambiguous / Not applicable | What must prove the change works?                       |
| Performance impact                  | Clear / Ambiguous / Not applicable | Could the change affect load, rendering, or query cost? |
| Deployment impact                   | Clear / Ambiguous / Not applicable | Are environment, build, or release steps affected?      |
| Rollback plan                       | Clear / Ambiguous / Not applicable | How can the change be safely undone?                    |

If any category is `Ambiguous`, either ask a clarifying question or state why the ambiguity can safely remain an assumption.

## Required Plan Sections

Medium and large plans must contain these sections. If a section is empty, explain why. Small fast-path plans may condense the same information into fewer headings, but must not omit real ambiguity, risk, acceptance criteria, or verification.

## Goal

Restate the requested outcome in plain language. Include what is in scope and what is out of scope when that matters.

## Current Codebase Understanding

Summarize what the agent learned from local files. This must be based on inspected files, not memory alone.

## Relevant Files Inspected

List the files or directories read before planning. Include one short reason for each.

## Ambiguity Review

Show the ambiguity checklist with `Clear`, `Ambiguous`, or `Not applicable` for each category.

## Open Questions

List questions that could change implementation, product behavior, data shape, testing, deployment, or rollback. If there are none, say why.

## Assumptions

List assumptions the plan depends on. Each assumption should be concrete enough to invalidate or revise the plan if false.

## Risks

List likely failure modes, regressions, and operational concerns. Include product risks, technical risks, and testing gaps.

## Options Considered

Provide at least two approaches when any of these are true:

- Product behavior could reasonably go in more than one direction.
- Data shape, API contract, authorization, migration, or rollback could differ by approach.
- One option is faster but riskier, and another is safer but larger.
- The user explicitly asks for alternatives.

For mechanical or low-risk tasks, do not invent fake alternatives. State that a single direct approach is appropriate and why.

For each real option, describe:

- What it is.
- Why it works.
- Trade-offs.
- When it would be the wrong choice.

## Recommended Approach

Choose one option and explain why it is the best fit for this codebase, request, and risk profile.

## Detailed Implementation Steps

Provide ordered, concrete steps. Each step should identify the behavior being changed and, when possible, the likely file or module.

For large work, split the plan into phases:

1. Investigation.
2. Design.
3. Implementation.
4. Verification.
5. Rollback or release follow-up.

Do not collapse these phases into one list if the work spans multiple user flows, data contracts, migrations, or deployment surfaces.

## Files to Change

List expected file changes with the reason for each. Separate confirmed files from files that may change after implementation begins.

## Test Plan

Define the verification work before implementation starts. Include targeted unit tests, integration tests, E2E tests, manual QA, lint, and build checks as appropriate.

For this repository:

- Run `pnpm lint:check` after code changes.
- Run `pnpm run build` after changes touching `.vue`, `.ts`, routing, stores, composables, types, tests, or build config.
- Add or update focused tests when behavior changes.

## Acceptance Criteria

Define the Definition of Done in concrete, testable terms. Acceptance criteria should include user-visible behavior, data/API correctness, error states, non-regression requirements, and verification commands.

Bad:

- "The page works."

Good:

- "Clicking a Step4 grid cell opens the request drawer with the selected employee and date prefilled, but does not persist an Off request until the user clicks the apply button."

## Rollback Plan

Explain how to undo the change. If rollback is just a code revert, say so. If migrations, data changes, or deployment configuration are involved, specify the safe rollback path and any data preservation constraints.

## Approval Gate

End every plan with an explicit stop:

```text
I will wait for your approval before implementation.
```

Do not start editing code in plan mode unless the user explicitly approves the plan or exits plan mode.

## Self-Review Pass

After drafting the plan, critically review it before presenting the final version.

Find and fix:

1. Hidden assumptions.
2. Missing edge cases.
3. Places where implementation could break existing behavior.
4. Files or contracts that may have been missed.
5. Tests that would catch regressions.
6. Rollback gaps.
7. Acceptance criteria that are too vague to verify.

Then revise the plan. The final answer should include either:

- A short `Self-review changes` section explaining what changed after review.
- Or a statement that no plan changes were needed and why.

## Clarifying Question Policy

Ask clarifying questions when:

- Multiple materially different designs are possible.
- A missing requirement could change user behavior.
- A missing requirement could change data shape, API contract, auth, migration, or rollback.
- The request affects broad scope or production behavior.
- The Definition of Done is missing and cannot be safely inferred.

Do not ask questions when:

- The missing detail is cosmetic and can be handled by existing project conventions.
- The answer is discoverable from local docs or source files.
- The task is mechanical and the acceptance criteria are already clear.

When questions are needed, ask the minimum set needed to unblock planning. Prefer grouped, specific questions over a long interrogation.

## Work Size Calibration

The plan should be no heavier than the change deserves. Use the smallest process that still exposes real ambiguity and risk.

### Simple Plan Fast Path

Use this path when all of these are true:

- The requested change is narrow and has one obvious implementation path.
- No data model, API contract, auth, migration, deployment, or cross-screen behavior is affected.
- Relevant files can be inspected quickly.
- Acceptance criteria are easy to state concretely.
- The cost of a long plan would exceed the risk of the change.

Fast-path plans may use this shorter structure:

1. Goal.
2. Files inspected.
3. Assumptions or open questions, if any.
4. Implementation steps.
5. Acceptance criteria.
6. Verification.
7. Approval stop.

Do not use the fast path when the request is ambiguous enough that the wrong interpretation would change product behavior, data, APIs, tests, deployment, or rollback.

Small tasks:

- Inspect the directly relevant files.
- Run a lightweight ambiguity check and list only real ambiguities.
- Provide a concise plan with acceptance criteria.

Medium tasks:

- Inspect related components, stores, types, and tests.
- Provide two or more approaches.
- Include explicit test and rollback plans.

Large tasks:

- Do not jump directly to implementation planning.
- First produce an investigation plan.
- After investigation, produce a design plan.
- After design approval, produce the implementation plan.

A task is large if it spans multiple user flows, persistent data, API contracts, migrations, authentication, deployment, or cross-screen behavior.

## Over-Engineering Guardrails

Plan mode must prevent both under-planning and over-engineering.

Do not expand a simple request into a broad redesign unless the current code makes the simple change unsafe. If broader work is discovered, label it as a follow-up or risk instead of silently absorbing it into the main plan.

Avoid proposing these unless the request or inspected code justifies them:

- New abstractions or framework changes.
- New dependencies.
- Database migrations.
- API redesigns.
- Broad refactors.
- New product surfaces.
- E2E test suites for purely local behavior.
- Rollout or deployment machinery for local-only changes.

Prefer the local pattern already used in the codebase. If the existing pattern is adequate, the plan should use it directly.

The agent should explicitly downshift when appropriate:

- "This is a small, mechanical change; one direct approach is enough."
- "No migration/API/auth impact was found, so those sections are not expanded."
- "The rollback is a normal code revert because no data shape changes are involved."

## EveryShift-Specific Planning Constraints

For this repository, plan mode must respect these constraints unless the user explicitly overrides them:

- Keep default scope inside the MVP schedule-generation flow.
- User-facing UI text is Korean.
- Organizations, employees, and shifts are seed data in the MVP; do not add CRUD by default.
- AI solver integration is mocked; do not wire a real solver by default.
- Step 3 grid is a critical surface and requires careful inspection before changes.
- Do not key editable rows by user-editable fields.
- Async-loaded editors must not render inputs until initial preload resolves.
- Local form copies must sync from prop replacement, not deep nested prop mutation.

## Output Discipline

The plan should be detailed enough to implement, but not padded. Prefer concrete statements over generic planning language. Do not add ceremonial sections, alternatives, tests, or phases that do not reduce risk. Every section should help answer one of these questions:

- What are we building?
- What could be misunderstood?
- What did we inspect?
- What will change?
- How will we know it works?
- How can we undo it?
