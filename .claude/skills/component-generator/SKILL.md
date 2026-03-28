---
name: vue-component-generator
description: "Use when creating Vue 3 components for EveryShift MVP with strict TypeScript, Naive UI conventions, and Tailwind-first styling."
version: "1.1.0"
author: "EveryShift Team"
tags: [vue, component, typescript, naive-ui, tailwind]
---

# Vue Component Generator

## Overview
Generate compile-safe Vue 3 SFC starters aligned with EveryShift conventions.

## Usage notes
- Claude command style (`/component ...`) is **deprecated for Codex** and remains as Claude-only shorthand.
- In Codex, use intent-based prompts (for example: "Create a schedule form component").

## Inputs
- Component name (PascalCase)
- Type: `basic`, `form`, `grid`
- Props and emits
- Target directory under `src/components/`

## Rules
- Use `<script setup lang=\"ts\">`
- Use explicit `Props` and `Emits` interfaces
- Do not use `any`
- Prefer Tailwind utilities and keep custom CSS minimal
- For global messages, use `showSuccess`, `showError` from `src/utils/message.ts`
- Never access `window.$message` directly in templates

## Reference Materials
- `reference/basic-component.vue.template`
- `reference/form-component.vue.template`
- `reference/grid-component.vue.template`
- `examples/shift-selector.example.md`

## Output checklist
- No unresolved template placeholders
- User-facing text remains Korean
- Optional chaining and strict TS patterns are respected
