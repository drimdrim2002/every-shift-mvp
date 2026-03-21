---
name: everyshift-composable-generator
description: Use when creating or refactoring Vue composables in EveryShift MVP, especially files under src/composables that manage reusable schedule logic, polling, persistence, derived state, or component coordination. This skill is for Composition API utilities that must match the repo's strict TypeScript and scheduling workflow patterns.
---

# Everyshift Composable Generator

## Overview

Use this skill for reusable logic extracted from views or components. Composables in this repo usually own reactive state plus focused actions, but they should not become hidden stores.

## Use When

- Editing `src/composables/**`
- Pulling polling, grid logic, persistence, statistics, or date transforms out of components
- Consolidating repeated setup code across schedule views
- Adding cleanup for intervals, watchers, subscriptions, or local storage persistence

Do not use this skill when the primary change is store orchestration, route progression, or Supabase CRUD boundaries.

## Composable Rules

1. Export a single `useXxx` function unless there is a clear reason to split helpers.
2. Prefer `ref` for mutable state and `computed` for derived state.
3. Use `watch` only for real side effects.
4. Clean up timers, polling loops, and subscriptions with `onUnmounted()` when lifecycle-bound.
5. Accept explicit inputs and return a clear public surface. Avoid leaking internals that only one component needs.
6. Keep API calls in the composable only when the composable is explicitly the integration boundary, such as solver polling or grid loading.
7. Reuse existing types from `src/types/**` and keep output types explicit.
8. Preserve current behavior around object replacement for reactivity when mutating nested assignment maps.

## Current Repo Patterns

- `useScheduleGrid.ts` owns employees, dates, assignments, off reasons, comments, and grid statistics.
- `useAISolver.ts` owns solver status, progress, polling, intermediate results, and cleanup.
- `useScheduleGridStatistics.ts` is pure derived logic wrapped in `computed`.
- Grid-adjacent composables should respect the current split between planning mode and result mode.

## Workflow

1. Read the consuming component or view first.
2. Define the composable's responsibility boundary in one sentence.
3. Decide what must remain local to the component and what should move into the composable.
4. Keep returned state minimal but sufficient for the caller.
5. Verify cleanup, reactivity, and error propagation behavior.

## Guardrails

- Do not move wizard-wide state into a composable if it belongs in Pinia.
- Do not turn a composable into a generic abstraction that hides domain names; concrete schedule terms are fine in this repo.
- For polling or persistence, prefer explicit start/stop methods and deterministic reset behavior.
- When docs are needed, inspect local project docs first, then Context7 only if local docs are insufficient.
