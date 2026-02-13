---
name: everyshift-component-generator
description: Generate Vue 3 SFC components for EveryShift MVP with script setup, strict TypeScript, Tailwind-first styling, and Naive UI conventions. Use when the user asks to create or scaffold a component (basic/form/grid) for schedule features.
---

# EveryShift Component Generator

Generate a compile-safe starter component and align it to project rules.

## Trigger examples
- Korean: "ShiftSelector 비슷한 컴포넌트 골격 만들어줘"
- Korean: "스케줄 폼 컴포넌트 생성해줘"
- English: "Scaffold a new Vue component for schedule editing"

## Inputs to confirm
- Component name (PascalCase)
- Component type: `basic` | `form` | `grid`
- Props and emitted events
- Target path under `src/components/`

## Output rules
- Use `<script setup lang="ts">`
- Use explicit Props/Emits interfaces
- Avoid `any`; prefer concrete types or `unknown`
- Prefer Tailwind utility classes; keep CSS minimal
- If feedback is needed, use `src/utils/message.ts` helpers (`showSuccess`, `showError`)

## Post-generation checklist
- Component compiles without unresolved placeholders
- User-facing text is Korean
- No direct `window.$message` access in templates
- No unnecessary scoped CSS block
- Generated or modified files pass `pnpm lint:check` with zero ESLint errors
- No unused imports or variables remain in generated code
- Do not use `@ts-ignore`; use `@ts-expect-error` only with a brief rationale
