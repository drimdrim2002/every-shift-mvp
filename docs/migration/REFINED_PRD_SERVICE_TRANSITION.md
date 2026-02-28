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

## P0-2.2 Completion Assessment (P0-2.14)

**Task**: P0-2.2 에픽별 하위 태스크 분해(1~3h) + 의존성 그래프 작성
**Completed**: 2026-02-28
**Status**: ✅ ALL PASS

### Verification Checklist

| Criteria | Status | Details |
|----------|--------|---------|
| P0-P10 모든 에픽에 1~3시간 하위 태스크 존재 | ✅ PASS | 152개 태스크, 모두 estimatedMinutes ∈ {60, 90, 120, 180} |
| 의존성 그래프 단절 없음 | ✅ PASS | Missing targets: 0, Orphan roots: 0 |
| Graph 무결성 | ✅ PASS | No cycles, all nodes reachable |

### Task Distribution by Phase

| Phase | Tasks | Focus Area |
|-------|-------|------------|
| P0 | 29 | Governance, Tooling, Quality Gates |
| P1 | 10 | Multitenancy, RBAC, Migration |
| P2 | 17 | Registration, Approval Workflow |
| P3 | 10 | Authentication, Onboarding |
| P4 | 11 | Account Management |
| P5 | 16 | Organization/Employee/Site Management |
| P6 | 11 | Schedule Editing, Excel Upload |
| P7 | 11 | Solver Integration, Events |
| P8 | 13 | Notifications (In-App, Email) |
| P9 | 12 | Dashboard, Analytics |
| P10 | 12 | Security, Release Readiness |
| **Total** | **152** | |

### Critical Path Analysis

**Longest Dependency Chain**: 34 tasks
**Phase Progression**: P0 → P1 → P5 → P7 → P8

```
P0 (Governance)
  └─ P0-1.1 운영 규칙/DoD 문서 초안 작성
     └─ P0-1.2 품질 게이트 기준 확정
        └─ P0-1.3 Shrimp 태스크 작성 규칙 확정
           └─
P1 (Multitenancy Foundation)
  └─ P1-1.1 멀티테넌트/RBAC 데이터 모델 확정
     └─ P1-1.2 마이그레이션 007 설계/DDL 초안 작성
        └─ P1-1.3 Seed/Backfill 기준 정의
           └─
P5 (Organization & Site Management - 21 tasks)
  ├─ P5-1.x 조직 관리 (4 tasks)
  ├─ P5-2.x 마스터 데이터 관리 (5 tasks)
  └─ P5-3.x 사이트/요구인원 관리 (5 tasks)
     └─
P7 (Solver Integration - 7 tasks)
  ├─ P7-1.x 스케줄 플로우 호환성 (4 tasks)
  └─ P7-2.1 Solver 계약/API 문서화
     └─
P8 (Notifications - 10 tasks)
  ├─ P8-1.x 알림 도메인/DB/API (5 tasks)
  ├─ P8-2.x 알림 UX/UI (4 tasks)
  └─ P8-2.4 알림센터 E2E 시나리오 정의
```

**Key Insights**:
- The critical path reflects the "spine" of the system: governance → multitenancy → master data → scheduling → notifications
- P5 (Organization/Site) is the backbone phase with 16 tasks, bridging P1 foundation to P7 solver
- P8 (Notifications) forms the final output chain, delivering solver results to users
- Parallel tracks (P2/P3/P4 auth flow, P6 editing, P9 dashboard, P10 security) can execute independently

### Graph Entry Points

**Primary Entry Point** (Critical Path):
- P0-1.1 운영 규칙/DoD 문서 초안 작성

**Alternative Entry Points** (Parallel execution):
- P1-1.4 Harden 007 migration for legacy site_requirements multitenant scope
- P0-2.3.1 requiredFields 누락 13건 보정 (completed)
- P0-2.3.5 namePattern 위반 태스크 리네이밍 (completed)

### Exit Nodes (Termination Points)

Each phase terminates into specific validation/delivery tasks:
- P0: Quality gates, tooling standards (P0-2.14, P0-3.3)
- P1: Migration verification (P1-3.3)
- P2: E2E scenarios (P2-1.8)
- P4: RBAC E2E (P4-3.3)
- P6: Excel upload testing (P6-3.4)
- P7: Unit testing standards (P7-3.3, P7-3.4)
- P8: Notification E2E (P8-2.4, P8-3.4)
- P10: Go/No-Go review (P10-3.4)

## Rollback notes

- Task backlog rollback: restore `.shrimp-data/tasks.migration-backup-20260227.json` to `.shrimp-data/tasks.json`
- Application rollback: revert commit containing migration baseline
- Database rollback: apply inverse migration script for `007_*` in controlled environment

## Phase KPI and Release Readiness Criteria (P0-3.1)

This section defines the completion criteria (deliverables, tests, security) and release readiness indicators for each phase.

### Phase Completion Definition Matrix

| Phase | Name | Key Deliverables | Required Tests | Security Checkpoints | Ready Criterion |
|-------|------|------------------|----------------|---------------------|-----------------|
| **P0** | Governance & Tooling | • MIGRATION_GOVERNANCE.md<br>• quality-gate.sh<br>• task-quality-check.sh<br>• Shrimp tooling standards | • Lint gate passes<br>• Unit test framework valid<br>• Build succeeds | • Git access control<br>• Branch protection rules | All quality gates operational; team follows governance |
| **P1** | Multitenancy Foundation | • Migration 007 DDL<br>• ERD for RBAC tables<br>• Seed/backfill spec | • Migration rollback tested<br>• RLS policies verified<br>• Tenant isolation query tests | • RLS covers all new tables<br>• No cross-tenant data leaks | Migration 007 applies/reverts cleanly; RLS blocks 100% of cross-tenant access |
| **P2** | Registration & Approval | • Signup UX/flow spec<br>• signup_requests table<br>• Approval workflow API | • Signup E2E (admin/user)<br>• Approval state transitions<br>• Rejection flow | • Input validation on all fields<br>• Rate limiting on signup | Complete signup→approval→login flow works end-to-end |
| **P3** | Authentication & Onboarding | • Onboarding wizard (3-step)<br>• onboarding_required flag<br>• Forced-flow guards | • Onboarding E2E (new admin)<br>• Route guard tests<br>• Skip/complete scenarios | • Onboarding route: `['admin']` only<br>• User role blocked from onboarding | New admin completes onboarding; user cannot access onboarding routes |
| **P4** | Account Management | • Account list/filter UI<br>• Tenant-scoped queries<br>• Approval/rejection actions | • Account CRUD E2E<br>• Super vs admin scope tests<br>• Status change tests | • Super sees all orgs<br>• Admin sees own org only | Account management works for both super and admin scopes |
| **P5** | Org/Employee/Site Mgmt | • Org CRUD UI<br>• Employee management<br>• Site requirements per DOW | • Org/Employee/Site CRUD tests<br>• Master data edit E2E<br>• Excel upload validation | • Route guards: `['super', 'admin']`<br>• User role blocked | Master data fully manageable through UI; user role cannot access admin screens |
| **P6** | Schedule Editing & Excel | • Excel import/export<br>• Schedule edit UI<br>• Validation rules | • Excel upload E2E<br>• Edit validation tests<br>• Format error handling | • File upload validation<br>• Malicious file blocking | Schedule data loads from Excel; edits validate constraints |
| **P7** | Solver Integration | • Solver API contract<br>• Step1~Step4 data flow<br>• Event consumption | • Solver polling E2E<br>• Status transition tests<br>• Retry/idempotency | • Service role usage<br>• API auth validation | Solver request→poll→complete flow works; events consumed correctly |
| **P8** | Notifications | • In-app notification UI<br>• Email templates<br>• Notification preferences | • Notification E2E (solver complete)<br>• Preference tests<br>• Delivery tracking | • No PII in logs<br>• Notification access control | Users receive notifications for subscribed events |
| **P9** | Dashboard & Analytics | • Admin dashboard (metrics)<br>• Employee dashboard<br>• Filter by period/site | • Dashboard data accuracy tests<br>• Filter E2E<br>• Role-based view tests | • Dashboard routes: `['super', 'admin']` vs all roles | Dashboards render correct metrics; filters work; role separation enforced |
| **P10** | Security & Release | • Security audit checklist<br>• Edge function security<br>• Go/No-Go criteria | • Security audit passed<br>• Penetration test clean<br>• Load test meets SLA | • All RLS verified<br>• Edge functions use service role<br>• Logs masked | All security checks pass; release ready for Private Beta |

### Ready/Not Ready Decision Framework

#### Phase-Level Ready Criteria

A phase is declared **READY** when ALL of the following are satisfied:

1. **Functional Completeness**
   - [ ] All tasks in phase have `status: "completed"`
   - [ ] All deliverables listed in matrix above exist and are reviewed
   - [ ] No blockers remain in phase dependency chain

2. **Quality Gates**
   - [ ] `pnpm lint:check` passes with zero errors
   - [ ] `pnpm test:unit` passes for phase-related code
   - [ ] `pnpm build` succeeds
   - [ ] E2E scenarios (if required) pass

3. **Security Verification**
   - [ ] Security checkpoints in matrix passed
   - [ ] RLS/RBAC impact reviewed (if schema change)
   - [ ] Edge functions use service role (if applicable)
   - [ ] No `console.log`/debug statements in committed code

4. **Documentation**
   - [ ] PR description includes task linkage and evidence summary
   - [ ] Rollback notes documented (for risky changes)
   - [ ] Relevant migration docs updated

#### Not Ready Triggers

A phase is **NOT READY** if ANY of the following apply:

- [ ] One or more tasks have `status: "pending"` or `status: "in_progress"`
- [ ] Any quality gate fails
- [ ] E2E scenarios fail without documented waiver
- [ ] Security checkpoint failed
- [ ] Critical bug discovered in phase scope
- [ ] Breaking change to dependent phase not addressed

### Private Beta Release Readiness

#### Overall Release Criteria

Private Beta is **READY** when the following phase completion status is achieved:

| Phase Category | Requirement | Rationale |
|----------------|-------------|-----------|
| **Foundation** | P0, P1 ✅ COMPLETE | Governance and multitenancy must be solid |
| **Auth Flow** | P2, P3, P4 ✅ COMPLETE | Signup, onboarding, account management end-to-end |
| **Core Data** | P5 ✅ COMPLETE | Master data management operational |
| **Scheduling** | P6, P7 ✅ COMPLETE | Schedule editing and solver integration working |
| **User Value** | P8, P9 ✅ COMPLETE | Notifications and dashboard delivering value |
| **Safety** | P10 ✅ COMPLETE | Security audit passed, safe for beta users |

#### Critical Path Check

Before Private Beta release, verify the **34-task critical path** is complete:

```
P0 → P1 → P5 → P7 → P8
```

Specifically:
- [ ] P0-1.1 → P0-1.2 → P0-1.3 (governance foundation)
- [ ] P1-1.1 → P1-1.2 → P1-1.3 (multitenancy data model)
- [ ] P5 tasks (org/employee/site management)
- [ ] P7 tasks (solver integration)
- [ ] P8 tasks (notifications)

#### Release Checklist

```bash
# 1. Verify all critical path tasks completed
jq -r '.tasks[] | select(.id == "10000000-0000-4000-8000-000000000034" or .id == "10000000-0000-4000-8000-000000000035" or ...) | .status' .shrimp-data/tasks.json | grep -v "completed"

# 2. Run quality gates
./scripts/quality-gate.sh

# 3. Run E2E tests
pnpm test:e2e

# 4. Check for debug statements
grep -r "console\." src/ || echo "No debug statements found"

# 5. Verify task graph integrity
./scripts/task-quality-check.sh
```

All commands must pass before release.

### Phase Exit Nodes

Each phase terminates into specific validation tasks. These are the final "gatekeeper" tasks:

| Phase | Exit Node Task | Verification Method |
|-------|----------------|---------------------|
| P0 | P0-3.3 Shrimp 상태 조회 표준 정의 | Query/report standard documented |
| P1 | P1-3.3 Migration 007 E2E 검증 | Migration applies/rolls back cleanly |
| P2 | P2-1.8 가입/승인 E2E 시나리오 정의 | Full signup→approval flow works |
| P3 | P3-3.3 온보딩 강제 플로우 E2E | Admin forced through onboarding |
| P4 | P4-3.3 RBAC 스코프(account mgmt) E2E | Super/admin scope separation works |
| P5 | P5-4.5 마스터 데이터 E2E | Org/employee/site CRUD end-to-end |
| P6 | P6-3.4 엑셀 업로드 E2E | Excel import/export works |
| P7 | P7-3.4 Solver 통합 E2E | Full solver flow works |
| P8 | P8-3.4 알림 E2E | Notifications delivered correctly |
| P9 | P9-3.4 대시보드 E2E | Dashboards show correct data |
| P10 | P10-3.4 Go/No-Go 리뷰 | All security checks pass; release approved |

These exit node tasks serve as the **final arbiter** for phase completion.
