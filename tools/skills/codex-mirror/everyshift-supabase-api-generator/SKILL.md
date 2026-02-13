---
name: everyshift-supabase-api-generator
description: Generate Supabase API modules for EveryShift with typed CRUD functions, Korean user-facing error messages, and safe single/maybeSingle rules.
---

# EveryShift Supabase API Generator

Use when adding API functions under `src/api/`.

## Trigger examples
- Korean: "schedules용 supabase api 함수 만들어줘"
- Korean: "CRUD + pagination API 골격 생성"
- English: "Create typed Supabase CRUD API for a table"

## Inputs to confirm
- Table/entity name
- Required operations (`getAll`, `getById`, `create`, `update`, `delete`, `upsert`)
- Need pagination or transform layer
- Expected not-found behavior

## Output rules
- Use `single()` for required rows
- Use `maybeSingle()` for optional existence checks
- Keep user-facing errors in Korean
- Keep internal logs in English where needed
- Prefer typed transform helpers for snake_case/camelCase mapping

## Post-generation checklist
- Error messages are consistent
- `single/maybeSingle` semantics are correct
- No untyped `Record<string, any>` in core paths
- Generated or modified files pass `pnpm lint:check` with zero ESLint errors
- No unused imports or variables remain in generated code
- Do not use `@ts-ignore`; use `@ts-expect-error` only with a brief rationale
