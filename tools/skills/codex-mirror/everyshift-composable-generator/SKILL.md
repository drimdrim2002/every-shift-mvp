---
name: everyshift-composable-generator
description: Generate Vue composables for EveryShift MVP with ref/computed state, async error handling, cleanup patterns, and optional polling/persistence.
---

# EveryShift Composable Generator

Use this skill when creating reusable business logic in `src/composables/`.

## Trigger examples
- Korean: "useAISolver 스타일 composable 만들어줘"
- Korean: "polling 있는 composable 초안 필요해"
- English: "Create a composable with polling and cleanup"

## Inputs to confirm
- Composable name with `use` prefix
- Required refs/computed/methods
- Polling and interval requirement
- localStorage persistence requirement

## Output rules
- Use `ref` for primitive state, `computed` for derived state
- Use `unknown` in catch blocks
- Include `onUnmounted` cleanup for intervals/listeners
- Follow current polling default: 10000ms unless caller overrides
- Keep public return shape explicit

## Post-generation checklist
- No `catch (e: any)`
- Polling loop has stop + timeout path
- cleanup runs on unmount
- Generated API is compatible with consuming views/stores
- Generated or modified files pass `pnpm lint:check` with zero ESLint errors
- No unused imports or variables remain in generated code
- Do not use `@ts-ignore`; use `@ts-expect-error` only with a brief rationale
