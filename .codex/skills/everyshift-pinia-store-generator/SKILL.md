---
name: everyshift-pinia-store-generator
description: Use when creating or refactoring Pinia stores in EveryShift MVP, especially files under src/stores that manage workflow state, auth/session state, organization data, or cross-view scheduling state. This skill applies to setup-style defineStore modules that must match the repo's Composition API and strict TypeScript patterns.
---

# Everyshift Pinia Store Generator

## Overview

Use this skill for store design in the current codebase. Stores here are setup-style, explicit, and domain-named rather than heavily abstracted.

## Use When

- Editing `src/stores/**`
- Adding workflow state shared across multiple views
- Managing auth, RBAC, onboarding, organization, or schedule state
- Refactoring component state that has become cross-route or cross-feature state

Do not use this skill for one-off local UI state that belongs inside a component or composable.

## Store Rules

1. Use setup-style `defineStore('name', () => { ... })`.
2. Keep state in `ref`s and derived values in `computed`.
3. Return a clear public surface: state, getters, and actions only.
4. Action names should be explicit: `loadOrganization`, `setAssignments`, `reset`, `ensureAccessContext`.
5. Include deterministic reset behavior when the store owns workflow data.
6. If the store coordinates other stores, do it explicitly and sparingly.
7. Reuse types from `src/types/**`; avoid `any`.
8. Keep store responsibilities focused. If a store starts owning rendering logic, move that back out.

## Current Repo Patterns

- `schedule.ts` keeps wizard state, assignments, comments, current step, and reset helpers.
- `auth.ts` wraps Supabase auth and normalizes signup/login flows.
- `organization.ts` loads and mutates organization-related data while mapping Supabase rows to camelCase models.
- Related context handoffs between stores are explicit, not hidden behind plugins.

## Workflow

1. Read the consuming routes, views, and APIs first.
2. Decide whether the store owns persistent workflow state, session state, or read-through cached data.
3. Keep API boundaries in `src/api/**`; call them from store actions rather than inlining Supabase queries everywhere.
4. Expose a minimal but complete action surface for components.
5. Verify reset, navigation, and stale-state behavior.

## Guardrails

- Prefer extending an existing store over creating a new one when the domain is already represented.
- Do not make a store the only place where a simple transformation can live in `src/api` or a composable.
- Keep user-visible strings in Korean and technical comments in English.
