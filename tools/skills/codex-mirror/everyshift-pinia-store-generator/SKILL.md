---
name: everyshift-pinia-store-generator
description: Generate Pinia stores for EveryShift MVP using setup-style defineStore, strict TypeScript, explicit actions/getters, and safe optional persistence.
---

# EveryShift Pinia Store Generator

Use when creating or refactoring stores in `src/stores/`.

## Trigger examples
- Korean: "schedule store 골격 만들어줘"
- Korean: "persist 포함한 pinia store 생성"
- English: "Create a setup-style Pinia store with persistence"

## Inputs to confirm
- Store name (camelCase)
- State fields and initial values
- Required getters/actions
- Persistence on/off and storage key

## Output rules
- Use `defineStore('name', () => {})`
- State with `ref`; getters with `computed`
- Include `reset()`
- If persistence enabled, guard JSON parse failures
- Add performance note for `deep: true` watcher usage

## Post-generation checklist
- No nullable assignment crash path in loadFromStorage
- No broad deep watchers unless needed
- Return object grouped by state/getters/actions
- Generated or modified files pass `pnpm lint:check` with zero ESLint errors
- No unused imports or variables remain in generated code
- Do not use `@ts-ignore`; use `@ts-expect-error` only with a brief rationale
