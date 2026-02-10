---
name: vue-composable-generator
description: "Use when creating Vue 3 composables for EveryShift with strict TypeScript, cleanup patterns, and optional polling/persistence."
version: "1.1.0"
author: "EveryShift Team"
tags: [vue, composable, typescript, reactive, state-management]
---

# Vue Composable Generator

## Overview
Generate composables with stable public APIs, strict typing, and clear cleanup behavior.

## Usage notes
- Claude command style (`/composable ...`) is **deprecated for Codex** and remains Claude-only shorthand.
- In Codex, use intent prompts (for example: "create a polling composable for solver status").

## Rules
- Use `ref` for primitive state and `computed` for derived values
- Use `unknown` in catch blocks
- Include `onUnmounted` cleanup for timers/listeners
- Use 10-second polling default to match current codebase

## Reference Materials
- `reference/basic-composable.ts.template`
- `reference/polling-composable.ts.template`
- `examples/use-ai-solver.example.md`
