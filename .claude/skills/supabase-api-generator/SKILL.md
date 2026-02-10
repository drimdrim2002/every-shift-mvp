---
name: supabase-api-generator
description: "Use when creating Supabase API functions for EveryShift with strict TypeScript, CRUD patterns, Korean user-facing errors, and correct single/maybeSingle usage."
version: "1.1.0"
author: "EveryShift Team"
tags: [supabase, api, typescript, crud, database]
---

# Supabase API Generator

## Overview
Generate typed Supabase API modules with safe query semantics.

## Usage notes
- Claude command style (`/api ...`) is **deprecated for Codex** and remains Claude-only shorthand.
- In Codex, use intent prompts (for example: "create schedules CRUD API with pagination").

## Query semantics
- Use `.single()` when the row must exist.
- Use `.maybeSingle()` when missing rows are a valid case.

## Error format
- User-facing errors: Korean
- Internal logs: English context prefix

## Reference Materials
- `reference/basic-api.ts.template`
- `reference/paginated-api.ts.template`
- `examples/schedule-api.example.md`
