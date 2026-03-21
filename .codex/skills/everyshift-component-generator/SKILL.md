---
name: everyshift-component-generator
description: Use when creating or refactoring Vue 3 components in EveryShift MVP, especially files under src/components or step views under src/views. This skill applies to script-setup SFC work that must follow the repo's Tailwind-first styling, Naive UI usage, Korean UI copy, strict TypeScript, and current scheduling-domain patterns.
---

# Everyshift Component Generator

## Overview

Use this skill for Vue single-file components that belong to the current EveryShift codebase. Favor the live implementation over older PRD wording when they differ.

## Use When

- Adding or refactoring files in `src/components/**`
- Editing schedule step views in `src/views/schedule/**`
- Building Naive UI form, card, modal, table-shell, or wizard-screen components
- Updating component props, emits, display states, loading states, or validation UI
- The request is UI-heavy but should stay inside existing EveryShift patterns rather than invent a new design system

Do not use this skill for Pinia-first work, composable-first work, or API wrappers. Use the more specific EveryShift skill instead when one matches better.

## Component Rules

1. Use `<script setup lang="ts">`.
2. Keep user-facing text in Korean.
3. Prefer Tailwind utility classes over custom CSS.
4. Use Naive UI for controls, cards, alerts, tabs, buttons, sliders, inputs, and modals. Do not replace the schedule grid with Naive UI table components.
5. Follow the project rule for global feedback: prefer wrapper methods or `src/utils/message.ts`; do not access `window.$message` directly inside templates.
6. Keep props and emits explicit and typed. Prefer small computed values and direct event handlers over indirection.
7. Match existing layout vocabulary first: `StepIndicator`, `n-card`, bordered panels, clear bottom action rows, Korean labels.
8. Preserve the current visual language unless the user explicitly asks for a redesign.

## Workflow

1. Inspect the nearest existing component first.
2. Identify whether the component is presentational, workflow-driven, or grid-adjacent.
3. Reuse existing types from `src/types/**` before creating new interfaces.
4. If the component talks to Supabase or long-lived state directly, pause and check whether that logic belongs in `src/api`, a composable, or a Pinia store.
5. Keep side effects in event handlers or lifecycle hooks; avoid embedding business logic deeply in the template.
6. After edits, verify prop flow, emits, loading states, empty states, and Korean copy.

## Schedule-Specific Guidance

- For wizard screens, keep step number, route, store progression, and bottom action buttons aligned.
- For schedule views, prefer the live route map:
  `Step1BasicInfo.vue` -> `Step2SiteInfo.vue` -> `Step3EmployeeInfo.vue` -> `Step4InitialData.vue` -> `Step5Result.vue`
- If a request mentions the older 4-step PRD flow, map it to the current implementation before editing.
- `ScheduleGrid.vue` is performance-sensitive. Do not casually rewrite its table structure, sticky columns, or statistics rendering.

## Output Checklist

- Props, emits, and major local state are typed
- Korean copy is consistent
- Tailwind classes are preferred over ad hoc CSS
- Naive UI usage follows project conventions
- Business logic is not misplaced in the template
- If docs are needed, check local docs first:
  `docs/naive/*.md`, then project PRD/spec docs, then Context7 if still needed
