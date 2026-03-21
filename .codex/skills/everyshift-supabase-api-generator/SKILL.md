---
name: everyshift-supabase-api-generator
description: Use when creating or refactoring Supabase-facing API modules in EveryShift MVP, especially files under src/api that query tables, invoke Edge Functions, normalize errors, and map snake_case database rows to camelCase application models. This skill applies to typed data-access boundaries used by stores, composables, and views.
---

# Everyshift Supabase Api Generator

## Overview

Use this skill for client-side data-access modules. The goal is a clean boundary between Supabase transport details and the rest of the app.

## Use When

- Editing `src/api/**`
- Adding table query helpers, CRUD wrappers, or Edge Function invoke wrappers
- Normalizing database rows or contract responses into app-level types
- Centralizing error handling and user-facing message mapping

Do not use this skill for direct SQL execution planning through MCP. In this repo, prepare SQL for the user when needed; do not execute remote writes.

## API Rules

1. Keep Supabase access in `src/api/**`, not spread across views.
2. Map `snake_case` rows to `camelCase` app models when returning domain objects.
3. Type raw row shapes locally in the module when generated DB types are unavailable.
4. Use `single()` and `maybeSingle()` deliberately.
5. Normalize backend or Edge Function errors into typed `Error` subclasses when the caller needs structured handling.
6. Keep Korean user-facing error messages where the rest of the app surfaces them.
7. Prefer one clear boundary per feature, such as a single `submitSignup()` wrapper or a single Edge Function invoke helper.
8. Reuse `supabase` from `src/api/supabase.ts`; do not instantiate extra clients.

## Current Repo Patterns

- Basic table APIs often use local `Row` interfaces and `toXxx()` mappers.
- Edge Function wrappers validate `success` envelopes and throw typed API errors.
- Some legacy modules still query Supabase directly from stores or composables; prefer converging toward API-layer boundaries rather than expanding that drift.
- Mock solver integration is intentional for MVP; do not replace it with real infrastructure unless asked.

## Workflow

1. Identify the contract boundary: table query, RPC-like Edge Function, or browser fetch to the mock solver.
2. Read the consuming store/composable/view to understand the expected return shape.
3. Add or reuse raw row interfaces and conversion helpers.
4. Keep mutations and reads explicit; avoid magic helper factories.
5. Validate error paths, empty states, and success-envelope parsing.

## Guardrails

- Never execute SQL, migrations, or data-changing Supabase MCP operations from the agent side in this repo.
- If schema changes are needed, draft the SQL and present it to the user.
- Check local docs first for project conventions, then official docs via Context7 only if needed.
