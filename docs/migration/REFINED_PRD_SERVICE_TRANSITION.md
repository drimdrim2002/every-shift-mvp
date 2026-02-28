# REFINED_PRD Service Transition Baseline

This document tracks the initial implementation baseline for migrating EveryShift MVP to the service-grade scope described in `docs/REFINED_PRD.md`.

## Completed in this baseline

1. `.shrimp-data/tasks.json` replaced with REFINED_PRD migration program backlog (P0~P10)
2. Backup created: `.shrimp-data/tasks.migration-backup-20260227.json`
3. Database migration created: `migrations/007_service_transition_rbac_multitenant.sql`
4. RBAC/onboarding/notification/dashboard application scaffolding added
5. New routes and role-based guards added
6. Supabase edge function scaffolds created under `supabase/functions/`

## Task Graph Integrity Check (P0-2.12)

To maintain the integrity of the dependency graph in `tasks.json`, run the following command before each batch merge:

```bash
./scripts/task-quality-check.sh
```

This command validates:
1. **Missing Targets**: Dependencies pointing to non-existent task IDs.
2. **Cycles**: Circular dependencies that prevent topological sorting.
3. **Orphan Roots**: Isolated tasks that are neither dependent on anything nor have dependents.

### Manual Verification Commands

If you need to run specific checks manually:

- **Missing Targets**:
  ```bash
  jq -r '(.tasks | map(.id)) as $ids | .tasks[] | .id as $pid | .dependencies[]? | .taskId as $tid | select([$ids[] == $tid] | any | not) | "Missing target: \($pid) -> \($tid)"' .shrimp-data/tasks.json
  ```
- **Cycles**:
  ```bash
  jq -r '.tasks[] | .id as $id | .dependencies[]? | "\(.taskId) \($id)"' .shrimp-data/tasks.json | tsort
  ```
- **Orphan Roots**:
  ```bash
  jq -r '(.tasks | map(.id)) as $ids | ([.tasks[].dependencies[]?.taskId] | unique) as $targets | .tasks[] | select((.dependencies | length == 0) and ([$targets[] == .id] | any | not)) | "Orphan root: \(.id) (\(.name))"' .shrimp-data/tasks.json
  ```

## v2 baseline reference

- See `docs/migration/REFINED_PRD_SERVICE_TRANSITION_V2.md` for the upgraded execution protocol:
  - repo-local `DATA_DIR` lock
  - quality gate single entry alignment
  - `/access` route baseline
  - production fallback restrictions for function-bound flows
- Governance source of truth:
  - `docs/migration/MIGRATION_GOVERNANCE.md`

## Operational rules reference

- Canonical governance source:
  - `docs/migration/MIGRATION_GOVERNANCE.md`
- Policy duplication rule:
  - Do not duplicate full governance text in transition docs.
  - Keep this document as execution index and checklist only.

Execution checklist (P0~P10):

1. Create a branch using the governance naming rule.
2. Move task state `pending` → `in_progress` with active owner.
3. Open PR with task linkage and quality gate evidence summary.
4. Complete DoD requirements, then transition `in_progress` → `completed`.
5. If validation fails, keep or return task state to `in_progress` with remediation notes.

## Next execution order (shrimp-task-manager)

1. `init_project_rules`
2. `plan_task`
3. `split_tasks`
4. `analyze_task`
5. `execute_task`
6. `verify_task`
7. `reflect_task`

## Rollback notes

- Task backlog rollback: restore `.shrimp-data/tasks.migration-backup-20260227.json` to `.shrimp-data/tasks.json`
- Application rollback: revert commit containing migration baseline
- Database rollback: apply inverse migration script for `007_*` in controlled environment
