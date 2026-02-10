---
name: pinia-store-generator
description: "Use when creating setup-style Pinia stores with strict TypeScript, explicit state/getters/actions, and safe optional persistence."
version: "1.1.0"
author: "EveryShift Team"
tags: [pinia, store, state-management, typescript, vue]
---

# Pinia Store Generator

## Overview
Generate setup-style Pinia stores that are safe by default.

## Usage notes
- Claude command style (`/store ...`) is **deprecated for Codex** and remains Claude-only shorthand.
- In Codex, use intent prompts (for example: "create a persisted schedule store").

## Rules
- Use `defineStore('name', () => {})`
- State with `ref`, getters with `computed`
- Include `reset()` action
- For persistence, use null-safe load and guarded JSON parse
- Add guidance on `deep: true` watcher performance tradeoff

## Reference Materials
- `reference/basic-store.ts.template`
- `examples/auth-store.example.md`
- `examples/schedule-store.example.md`
