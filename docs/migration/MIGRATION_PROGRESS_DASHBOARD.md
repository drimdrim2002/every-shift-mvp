# REFINED_PRD Migration Progress Dashboard

## Document Information
- Version: 1.0
- Last Updated: 2026-02-27
- Purpose: Track phase-level progress, blockers, risk, and release readiness in one page
- Source of Truth: `.shrimp-data/tasks.json`

## KPI Definition
- `Completed`: Number of tasks with `status=completed`
- `In Progress`: Number of tasks with `status=in_progress`
- `Pending`: Number of tasks with `status=pending`
- `Completion %`: `Completed / Total * 100`
- `Release Readiness`: `Not Ready`, `In Preparation`, `Ready for Next Gate`, `Beta Candidate`

## Phase Dashboard

| Phase | KPI (C/IP/P/T) | Completion | Current Status | Primary Blocker | Risk Level | Exit Criteria (Done Definition) | Release Readiness |
|---|---:|---:|---|---|---|---|---|
| P0 | 2/1/9/12 | 16.7% | In Progress | None (active execution) | Medium | Governance, backlog baseline, dashboard baseline approved | In Preparation |
| P1 | 0/0/12/12 | 0.0% | Not Started | P0 operational baseline sign-off | High | Schema/RLS/backfill complete without data regression | Not Ready |
| P2 | 0/0/17/17 | 0.0% | Not Started | P1 schema + RLS completion | High | Signup, approval gate, and decision workflow operational | Not Ready |
| P3 | 0/0/13/13 | 0.0% | Not Started | P1 core data model + P2 entry flow stability | Medium | Onboarding data + UI + guard enforced end-to-end | Not Ready |
| P4 | 0/0/14/14 | 0.0% | Not Started | P2 approval workflow readiness | Medium | Account management RBAC matrix implemented and tested | Not Ready |
| P5 | 0/0/17/17 | 0.0% | Not Started | P1 schema readiness for org config domains | Medium | Organization/site/constraint management fully operational | Not Ready |
| P6 | 0/0/14/14 | 0.0% | Not Started | P1 RLS + P5 master data model stability | Medium | Employee management + mapping + import/export complete | Not Ready |
| P7 | 0/0/14/14 | 0.0% | Not Started | P5/P6 data contract stabilization | High | Scheduler UX/data contract + validation flow completed | Not Ready |
| P8 | 0/0/15/15 | 0.0% | Not Started | P7 solver contract and API readiness | High | Solver integration, polling, and result workflow hardened | Not Ready |
| P9 | 0/0/15/15 | 0.0% | Not Started | P8 schedule history/metrics pipeline | Medium | Dashboard metrics and export/report paths complete | Not Ready |
| P10 | 0/0/15/15 | 0.0% | Not Started | P8/P9 completion evidence | High | Security/performance/release/rollback gates approved | Not Ready |

## Dependency Graph (Phase Level)
1. `P0 -> P1`
2. `P1 -> P2, P3, P5, P6`
3. `P2 -> P4`
4. `P5, P6 -> P7`
5. `P7 -> P8`
6. `P8 -> P9`
7. `P8, P9 -> P10`

## Operational Review Cadence
1. Refresh KPI from `.shrimp-data/tasks.json` daily.
2. Review blocker ownership and due date by phase.
3. Reclassify risk (`Low/Medium/High`) at each phase gate.
4. Promote `Release Readiness` only when all exit criteria are verified.
