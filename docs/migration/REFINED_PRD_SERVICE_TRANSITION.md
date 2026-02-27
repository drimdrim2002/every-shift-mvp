# REFINED_PRD Service Transition Baseline

This document tracks the initial implementation baseline for migrating EveryShift MVP to the service-grade scope described in `docs/REFINED_PRD.md`.

## Completed in this baseline

1. `.shrimp-data/tasks.json` replaced with REFINED_PRD migration program backlog (P0~P10)
2. Backup created: `.shrimp-data/tasks.migration-backup-20260227.json`
3. Database migration created: `migrations/007_service_transition_rbac_multitenant.sql`
4. RBAC/onboarding/notification/dashboard application scaffolding added
5. New routes and role-based guards added
6. Supabase edge function scaffolds created under `supabase/functions/`

## v2 baseline reference

- See `docs/migration/REFINED_PRD_SERVICE_TRANSITION_V2.md` for the upgraded execution protocol:
  - repo-local `DATA_DIR` lock
  - quality gate single entry alignment
  - `/access` route baseline
  - production fallback restrictions for function-bound flows
- Governance source of truth:
  - `docs/migration/MIGRATION_GOVERNANCE.md`

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
