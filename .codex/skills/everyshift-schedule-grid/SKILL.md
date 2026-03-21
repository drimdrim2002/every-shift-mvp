---
name: everyshift-schedule-grid
description: Use when working on the EveryShift schedule grid domain, including ScheduleGrid.vue, ShiftSelector, ConstraintSelector, grid statistics, date generation, planning/result modes, Step4InitialData, Step5Result, or related schedule-grid composables. This skill is for performance-sensitive table behavior and schedule editing flows.
---

# Everyshift Schedule Grid

## Overview

Use this skill for the scheduling grid and its immediate workflow. This domain is high impact and should be changed conservatively.

## Use When

- Editing `src/components/schedule/ScheduleGrid.vue`
- Editing `ShiftSelector`, `ConstraintSelector`, `CommentModal`, `DaySummaryModal`, or grid statistics helpers
- Editing `src/composables/useScheduleGrid*.ts`
- Editing `src/views/schedule/Step4InitialData.vue` or `src/views/schedule/Step5Result.vue`
- Fixing assignment reactivity, statistics, sticky columns, date generation, last-month visibility, or planner/result display rules

## Core Model

1. The live wizard is 5 steps, with the grid in `Step4InitialData.vue` and results in `Step5Result.vue`.
2. `ScheduleGrid.vue` supports at least two modes:
   planning mode for constraint input
   result mode for shift assignment display and edits
3. Planning mode centers on `O` constraints and comment capture.
4. Result mode centers on shift assignment rendering, row and column statistics, and post-run edits.
5. Date generation combines previous-month days with current-month days. Some row totals intentionally exclude previous-month values.

## Grid Rules

1. Do not replace the table with a different grid library unless explicitly requested.
2. Preserve sticky left employee column and sticky right stats behavior.
3. Treat reactivity carefully for nested assignment maps; object replacement is often intentional.
4. Avoid deep watchers unless required.
5. When changing statistics, verify both row totals and column totals in planning and result modes.
6. Respect current last-month handling, especially the distinction between displayed dates and counted dates.
7. Keep performance in mind for 30 employees x 36+ days plus stats.

## Workflow

1. Read `ScheduleGrid.vue` and the consuming step view together.
2. Identify whether the change belongs to rendering, interaction, statistics, persistence, or solver/result integration.
3. Confirm whether the requested behavior is for planning mode, result mode, or both.
4. Preserve existing props and events unless there is a clear contract change.
5. Test the change path mentally for empty data, loading, readonly mode, and pre-run versus post-run display.

## Guardrails

- If the user cites the old PRD step numbers, reconcile them with the live files before editing.
- Solver intermediate results may use shift IDs rather than display codes; keep that distinction intact.
- Keep Korean UI labels and current shift semantics (`D`, `E`, `N`, `O`) consistent.
- When a change also affects route flow or store ownership, coordinate with the wizard-flow or Pinia-store skill.

## Validation Focus

- Header grouping and sticky columns still align
- Cell interactions still emit the correct event payloads
- Planning constraints and comments survive save/load paths
- Result-mode statistics still match assignments
- No obvious performance regression from new reactive work
