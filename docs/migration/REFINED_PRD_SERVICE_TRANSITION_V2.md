# REFINED_PRD Service Transition v2 (Execution Baseline)

This document tracks the v2 execution baseline for migrating EveryShift MVP to a private-beta service level using Shrimp Task Manager MCP.

## Scope

- Canonical backlog source: `data/tasks.json`
- Program metadata source: `data/tasks.metadata.json`
- Shrimp data directory: repository-local `data/` (via `DATA_DIR`)
- Quality gate single entry: `scripts/quality-gate.sh`

## Locked operating rules

1. Shrimp workflow order: `init_project_rules` -> `plan_task` -> `split_tasks` -> `analyze_task` -> `execute_task` -> `verify_task` -> `reflect_task`
2. Task decomposition unit: 4-8 hours, single technical domain per task
3. Task update policy: first sync with `clearAllTasks`, then only `selective`
4. Migration policy: keep `007_*` immutable, apply incremental migrations as `008+`
5. Production fallback policy: no direct table fallback for approval/notification/export flows

## Implemented in this v2 baseline

1. `scripts/mcp/shrimp-task-manager.sh` exports `DATA_DIR` with repo-local default
2. MCP configs updated to include `DATA_DIR` for shrimp server
3. Added `/access` status route baseline (`src/views/auth/AccessStatus.vue`)
4. Login flow now routes pending/rejected accounts to `/access`
5. API fallback for `signup`, `approval`, `dashboard export` is dev-only
6. `scripts/quality-gate.sh` rewritten as repo-aligned single entry gate
7. Backlog metadata split into `data/tasks.metadata.json`

## Verification checkpoints

1. Shrimp `list_tasks(all)` returns the expected migration backlog after sync
2. `scripts/quality-gate.sh` executes lint/unit/build in this repository without path errors
3. Pending/rejected login leads to `/access`
4. In non-dev mode, function invocation failures do not use direct table fallback

## Next execution targets

1. Replace edge-function scaffold handlers with service-role implementations
2. Expand phase tasks from 33 parent tasks into 4-8 hour executable subtasks
3. Add dedicated E2E scenarios for signup->approval->access and onboarding guard
