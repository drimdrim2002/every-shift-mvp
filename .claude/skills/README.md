# EveryShift MVP Skills

## Overview
This directory contains Claude-oriented skill definitions. `.claude/skills` remains the source of truth.

## Available Claude Skills
- `component-generator`
- `composable-generator`
- `pinia-store-generator`
- `supabase-api-generator`

## Compatibility with Codex
Codex-compatible mirror skills live in:
- `tools/skills/codex-mirror/everyshift-component-generator`
- `tools/skills/codex-mirror/everyshift-composable-generator`
- `tools/skills/codex-mirror/everyshift-pinia-store-generator`
- `tools/skills/codex-mirror/everyshift-supabase-api-generator`

Use the sync script to install/update into `~/.codex/skills`:
```bash
bash tools/skills/sync-to-codex.sh
```

## Command Style Notes
- Claude shorthand commands like `/component`, `/composable`, `/store`, `/api` are maintained for Claude workflows.
- For Codex, use intent-based prompts and `everyshift-*` skill triggers.

## Project Rules Alignment
All skill templates should follow:
- Strict TypeScript (`no any`)
- Tailwind-first styling
- Korean user-facing text
- Naive UI discrete API wrapper usage via `src/utils/message.ts`

## Validation
Run skill validation before commits:
```bash
bash tools/skills/validate-skills.sh
```

## Version
- Version: `1.1.0`
- Last Updated: `2026-02-10`
