---
name: everyshift-wizard-flow
description: Use when modifying the EveryShift scheduling wizard flow, including step routes, step guards, StepIndicator progression, schedule store transitions, temporary save and restore behavior, and the handoff between planning data entry and AI-result review. This skill applies to multi-step workflow changes across router, stores, views, and related APIs.
---

# Everyshift Wizard Flow

## Overview

Use this skill for changes that span multiple wizard steps or alter how users move through the scheduling workflow. Prioritize the current route implementation over older PRD wording.

## Live Flow

The live route structure is:

1. `Step1BasicInfo.vue`
2. `Step2SiteInfo.vue`
3. `Step3EmployeeInfo.vue`
4. `Step4InitialData.vue`
5. `Step5Result.vue`

If documentation still mentions the older 4-step structure, treat that as historical context and reconcile it before editing.

## Use When

- Editing `src/router/index.ts` or route guards
- Updating `StepIndicator` numbers or progression behavior
- Changing what each step saves to `useScheduleStore`
- Adding validation gates before advancing
- Adjusting temp-save, resume, or solver handoff behavior between Step4 and Step5

## Wizard Rules

1. Keep route, step indicator, store state, and button labels aligned.
2. When a step owns persisted data, decide whether it should read from store first, DB first, or both.
3. Preserve explicit back/next behavior and any guard confirmations.
4. Keep the mock AI solver handoff intact unless the user asks for infrastructure changes.
5. Prefer clear user recovery paths when data is missing or stale.
6. Keep Korean UI copy consistent across steps.

## Workflow

1. Trace the user path from route entry to route exit.
2. Identify which state lives in the schedule store, which lives in DB, and which is local to the step.
3. Confirm guard behavior for refresh, direct navigation, and missing prerequisites.
4. Apply the smallest change that keeps route names, step numbers, and persisted data coherent.
5. Verify both forward progression and back navigation.

## Guardrails

- Do not update a step in isolation if the route, guard, or store contract also changes.
- Do not trust PRD step numbering blindly; cross-check the live router.
- When wizard work touches the grid or stores deeply, coordinate with the schedule-grid or Pinia-store skill.
