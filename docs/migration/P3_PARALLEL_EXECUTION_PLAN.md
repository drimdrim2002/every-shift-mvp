# P3 Parallel Execution Plan

> Created: 2026-03-12  
> Scope: Replan the current `P3` onboarding backlog into a dependency graph that supports parallel execution without changing the canonical source yet.  
> Canonical source today: `.shrimp-data/tasks.json`  
> This document is a restructuring proposal, not a direct mutation of task IDs/statuses.

## 1. Purpose

The current `P3` backlog is logically valid but operationally inefficient. All ten tasks are arranged as an almost fully serial chain:

`P2-2.4 -> P3-1.1 -> P3-1.2 -> P3-1.3 -> P3-2.1 -> P3-2.2 -> P3-2.3 -> P3-2.4 -> P3-3.1 -> P3-3.2 -> P3-3.3`

This plan rewrites `P3` into a smaller number of true dependency gates and three parallel workstreams:

- Domain/API workstream
- Frontend/UX workstream
- Guard/Test workstream

The goal is to preserve architectural correctness while increasing concurrency and reducing critical-path depth.

## 2. Inputs and Constraints

This proposal is grounded in the following repo sources:

- `docs/REFINED_PRD.md` section `5.3 [신규] 신규 조직 온보딩`
- `docs/migration/RBAC_MATRIX.md`
- `.shrimp-data/tasks.json` current `P3` task set
- `docs/verification/test-validation-guide.md`

Important constraint discovered from the current baseline:

- `onboarding_progress` is currently listed as `RLS disabled` in `docs/verification/test-validation-guide.md`
- Therefore persistence and RLS cannot stay implicit inside a generic “API contract” task
- A dedicated persistence/RLS design task is required before implementation planning is considered complete

## 3. Diagnosis of the Current P3 Graph

### 3.1 Current problems

1. The graph is over-serialized.
   After `P3-1.1`, several tasks could proceed independently, but the current DAG allows only one active task at a time.

2. Specification and implementation planning are mixed.
   Some tasks are named as “definition” or “plan” tasks, but their related files point to concrete code artifacts.

3. Persistence ownership is underspecified.
   `P3-1.1` mentions storage scope and `P3-1.2` mentions API, but neither explicitly isolates table shape, ownership boundary, or RLS strategy.

4. Test tasks are sequenced too late.
   `P3-2.4` blocks `P3-3.1`, even though guard-rule definition should be available much earlier.

5. There is no explicit concurrency model for frontend and guard work.
   The onboarding wizard UX and the guard rule matrix can be advanced in parallel once the domain invariants are fixed.

### 3.2 Resulting bottleneck

In the current structure, `P3` has:

- Concurrency width: effectively `1`
- Critical-path depth: `10` P3 tasks after the upstream blocker
- Startable P3 tasks today: `0` because `P2-2.4` is still pending

## 4. Replanning Principles

The restructured `P3` should follow these rules:

1. Keep only one mandatory domain gate at the start.
   `P3-1.1` should remain the single truth-setting task for onboarding invariants.

2. Split persistence from transport.
   `onboarding_progress` storage/RLS and API contract should be separate tasks.

3. Allow frontend UX and guard-rule design to start once domain invariants are fixed.
   They should not wait for full API/store planning unless a real contract dependency exists.

4. Move scenario design closer to the artifacts it validates.
   Guard bypass scenarios should depend on guard plan, while E2E onboarding scenarios should depend on domain, UX, and guard rules, not on every later planning task.

5. Preserve the existing upstream gate.
   `P2-2.4 승인 상태별 라우팅 테스트 시나리오 정의(role/status 조합)` remains the upstream blocker because onboarding guard behavior must align with the P2 access model.

## 5. Proposed Parallel Structure

## 5.1 Workstream overview

### Gate

- `P3-1.1` Onboarding domain invariants and completion ownership

### Workstream A: Domain/API

- `P3-1.2` onboarding_progress persistence and RLS design
- `P3-1.3` onboarding-progress API contract
- `P3-1.4` frontend onboarding store/cache strategy

### Workstream B: Frontend/UX

- `P3-2.1` onboarding wizard IA/content definition
- `P3-2.2` menu highlight and deep-link UX definition
- `P3-2.3` onboarding page composition plan

### Workstream C: Guard/Test

- `P3-3.1` onboarding guard rule matrix
- `P3-3.2` router insertion plan
- `P3-3.3` guard bypass scenario set
- `P3-3.4` onboarding E2E scenario set

## 5.2 Proposed task list

| Proposed Task | Purpose | Depends On | Primary Outputs | Key Files |
| --- | --- | --- | --- | --- |
| `P3-1.1` Onboarding domain invariants + completion ownership | Fix the 3-step state machine, completion conditions, organization-vs-user ownership, and admin-only access invariant | `P1-1.3`, `P1-1.4`, `P2-2.4` | Canonical state diagram and ownership rules | `docs/REFINED_PRD.md`, `docs/migration/RBAC_MATRIX.md` |
| `P3-1.2` onboarding_progress persistence + RLS design | Define table ownership, write/read boundary, active admin scope, org isolation, and recovery semantics | `P3-1.1` | Persistence spec and security rules | `docs/verification/test-validation-guide.md`, migration docs |
| `P3-1.3` onboarding-progress API contract | Define `get/update/complete` contract, request/response schema, auth boundary, and error model | `P3-1.1` | API contract ready for server/client skeleton work | `docs/API_SPEC.md`, `supabase/functions/onboarding-progress/index.ts` |
| `P3-1.4` frontend onboarding store/cache strategy | Define Pinia state, loading lifecycle, refresh restore, storage event sync, and invalidation rules | `P3-1.3` | Store interface and caching rules | `src/stores/onboarding.ts`, `src/stores/auth.ts` |
| `P3-2.1` onboarding wizard IA/content definition | Fix the step content, CTA copy, completion UX, and dashboard exit semantics | `P3-1.1` | Wizard information architecture and content spec | `src/views/Onboarding.vue`, `docs/REFINED_PRD.md` |
| `P3-2.2` menu highlight + deep-link UX definition | Define sidebar highlight behavior, return path, menu expansion, and cross-page guidance | `P3-2.1` | UX spec for employee registration and Excel upload guidance | `src/components/layout/Sidebar.vue` |
| `P3-2.3` onboarding page composition plan | Compose route, store, API, and UX into one implementable page plan | `P3-1.3`, `P3-1.4`, `P3-2.1`, `P3-2.2` | Implementation-ready page integration plan | `src/router/index.ts`, `src/views/Onboarding.vue` |
| `P3-3.1` onboarding guard rule matrix | Define who is forced into onboarding, who is excluded, and guard priority vs login/signup/approval routes | `P3-1.1`, `P2-2.4` | Guard rule table and precedence rules | `src/router/guards.ts`, `docs/migration/RBAC_MATRIX.md` |
| `P3-3.2` router insertion plan | Define `beforeEach` insertion order, store reads, redirects, and collision handling with existing guards | `P3-1.3`, `P3-1.4`, `P3-3.1` | Router integration plan | `src/router/index.ts`, `src/router/guards.ts` |
| `P3-3.3` guard bypass scenario set | Define direct URL, refresh, logout/login, back-button, and non-admin access bypass cases | `P3-3.2` | Guard regression scenario set | `docs/verification/test-validation-guide.md` |
| `P3-3.4` onboarding E2E scenario set | Define first-login forced onboarding, completion, re-login skip, and admin-only route coverage | `P3-1.3`, `P3-2.1`, `P3-3.1` | Onboarding E2E matrix | `docs/verification/test-validation-guide.md` |

## 5.3 Why this graph is better

After `P3-1.1`, four tasks become startable in parallel:

- `P3-1.2`
- `P3-1.3`
- `P3-2.1`
- `P3-3.1`

That changes the working shape from a single-file queue into a multi-lane graph:

```text
P2-2.4
   |
P3-1.1
   ├── P3-1.2
   ├── P3-1.3 ── P3-1.4 ───────────────┐
   ├── P3-2.1 ── P3-2.2 ────────┐      │
   └── P3-3.1 ───────────────────┼── P3-3.2 ── P3-3.3
                                 │
                    P3-1.3 ──────┼── P3-3.4
                                 │
                    P3-1.4 + P3-2.1 + P3-2.2 ── P3-2.3
```

Expected improvement:

- Concurrency width increases from `1` to `4`
- Critical-path depth is reduced from `10` P3 tasks to `6` meaningful stages
- Guard rule design no longer waits for E2E definition
- UX work no longer waits for full router insertion planning

## 6. Mapping from Current Tasks to Proposed Tasks

| Current Task | Action in Replan | Notes |
| --- | --- | --- |
| `P3-1.1 온보딩 상태 머신(3단계) + 저장 범위 확정` | Keep, but tighten as single domain gate | This must explicitly freeze ownership and completion semantics |
| `P3-1.2 온보딩 진행 API 계약 정의(get/update)` | Split into `P3-1.2` persistence/RLS and `P3-1.3` API contract | Current task hides a security-sensitive persistence concern |
| `P3-1.3 프론트 스토어/캐시 전략 정의(온보딩)` | Renumber to `P3-1.4` | Depends on API contract, not on all UX work |
| `P3-2.1 온보딩 위저드 UI 플로우/콘텐츠 확정` | Keep as `P3-2.1` | Can start right after domain gate |
| `P3-2.2 온보딩 페이지 구현 계획(컴포넌트/라우트/스토어)` | Narrow and move to `P3-2.3` | Should become an integration task, not a blocker for all UX |
| `P3-2.3 메뉴 하이라이트/딥링크 UX 설계(직원관리/엑셀 업로드)` | Move earlier to `P3-2.2` | Depends on wizard IA, not on full page integration |
| `P3-2.4 온보딩 E2E 테스트 시나리오 정의` | Move to `P3-3.4` | It validates full flow and should sit with verification tasks |
| `P3-3.1 온보딩 강제 가드 규칙 정의(예외 포함)` | Keep as `P3-3.1`, move earlier | It should depend on access model, not on E2E |
| `P3-3.2 온보딩 가드 구현 계획(라우터 beforeEach 흐름)` | Keep as `P3-3.2` | Depends on rule matrix plus store/API reads |
| `P3-3.3 온보딩 가드 테스트 시나리오 정의(우회 방지)` | Keep as `P3-3.3` | Should depend only on guard insertion plan |

## 7. Recommended Execution Waves

| Wave | Start Condition | Parallel Tasks |
| --- | --- | --- |
| `Wave 0` | Finish upstream blocker | `P2-2.4` |
| `Wave 1` | Upstream access model is stable | `P3-1.1` |
| `Wave 2` | Domain invariants are frozen | `P3-1.2`, `P3-1.3`, `P3-2.1`, `P3-3.1` |
| `Wave 3` | API/UX/rule outputs are available | `P3-1.4`, `P3-2.2`, `P3-3.4` |
| `Wave 4` | Integration inputs are ready | `P3-2.3`, `P3-3.2` |
| `Wave 5` | Router insertion plan is stable | `P3-3.3` |

## 8. Definition of Done for the Replanned P3

The replan should be considered successful only if all conditions below are true:

1. `P3-1.1` explicitly defines the onboarding completion owner:
   organization-scoped, user-scoped, or hybrid with one canonical read rule.

2. `P3-1.2` explicitly addresses the current `onboarding_progress` RLS gap.

3. `P3-1.3` and `P3-1.4` use the same state names and field names.

4. `P3-2.1` and `P3-2.2` can be reviewed without waiting for router implementation details.

5. `P3-3.1` fixes guard priority against:
   login, signup, approval pending, user role, and admin completed-onboarding cases.

6. `P3-3.4` covers at least:
   first login force-in, completion, resume after refresh, relogin skip, and non-admin deny.

## 9. Recommended Next Step

If the team accepts this structure, the next change should be a canonical backlog update in `.shrimp-data/tasks.json`:

- replace the current serial `P3` chain with the task map in Section 5
- preserve the existing `P3-1.1` task ID if possible
- split the current `P3-1.2` into two tasks
- move `P3-2.4` under the verification lane as `P3-3.4`
- remove unnecessary serial dependencies between UX and guard/test tasks

Until that canonical update happens, this file should be treated as the operational execution guide for `P3`.
