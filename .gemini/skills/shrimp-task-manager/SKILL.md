---
name: shrimp-task-manager
description: Manage and split tasks in shrimp-task-manager. Use this skill when editing .shrimp-data/tasks.json so dependency order remains valid and docs/migration/REMAINING_TASKS_MERGED.md stays synchronized.
---

# Shrimp Task Manager

## Overview

This skill enforces two mandatory operating rules:

1. Keep task dependency order valid in `.shrimp-data/tasks.json`.
2. Whenever `.shrimp-data/tasks.json` changes, synchronize `docs/migration/REMAINING_TASKS_MERGED.md` in the same update.

## Core Rules for Task Dependencies

When working with tasks that have a parent-child relationship (e.g., breaking down a complex task into smaller steps):

1. **Child Before Parent Execution:** A child task must be completed before its parent task can be completed. Therefore, the parent task MUST depend on all of its child tasks.
2. **Dependency Assignment:**
   - Add the IDs or exact names of all child tasks to the `dependencies` array of the parent task.
   - Child tasks inherit the parent's external dependencies (if applicable) unless they are independent.
3. **Execution Order:** 
   - Tasks must be sorted or generated such that child tasks appear before their parent tasks in the execution order.
   - Any task that depends on another task must be executed after its dependency.
   - Dependency graph must keep `missing targets = 0` and `cycle = false`.
4. **Task Splitting:** 
   - When using `split_tasks` or similar tools, ensure the granularity guidelines are met.
   - Create the child tasks first in your planned list.
   - Then, recreate or update the parent task (if it remains as an aggregation/finalization step), adding the newly created child tasks to its `dependencies`.
   - If the parent task is entirely replaced by child tasks, ensure any other tasks that depended on the old parent now depend on the appropriate final child tasks.

## Mandatory Documentation Sync

If any task changes in `.shrimp-data/tasks.json` (name, description, dependencies, status, estimate, verification, relatedFiles):

- Update `docs/migration/REMAINING_TASKS_MERGED.md` for the same task IDs.
- Sync both the task summary/table row and the detailed task section.
- Do not leave `tasks.json` and migration docs in different states.

## Workflow: Updating Task Relationships

1. **Identify Relationships:** Determine parent and child tasks.
2. **Update Child Tasks First:** Define or modify children as atomic units.
3. **Update Parent Dependencies:** Parent depends on all children.
4. **Sync Docs:** Reflect all changed task IDs in `REMAINING_TASKS_MERGED.md`.
5. **Validate:** Check dependency integrity and doc-sync completeness before completion.
