# Launch Core Implementation Slices

> Execution plan derived from [launch-core-plan.md](./launch-core-plan.md)

**Goal:** Break `Launch Core` into slices that can be developed, verified, and landed one at a time without leaving routing, auth, or launch CTAs in a half-migrated state.

**Architecture:** Treat this as a route-boundary migration, not a product rewrite. Reuse the current auth screens, access-state screens, app shell, ops screens, and schedule workflow. Add the public landing surface at `/`, move the authenticated workspace under `/app`, preserve legacy deep links during the launch window, and lock deployment/test gates around the migration.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Vue Router, Pinia, Naive UI, Tailwind CSS, Vite, Vitest, Playwright, Vercel

---

## Scope Lock

This slice plan implements `Launch Core` only.

In scope:

- public landing page at `/`
- authenticated workspace rooted at `/app`
- existing email/password login and signup continuity
- pending/rejected/admin/user/super redirect correctness
- real inquiry CTA path via public config
- temporary legacy redirects from old app URLs
- Vercel SPA deep-link contract
- launch-focused regression coverage

Out of scope:

- Google login
- Kakao login
- OAuth callback rollout
- in-app inquiry management
- analytics SDK rollout
- schedule-generation behavior changes unrelated to route migration

## Migration Invariants

- `/` is discovery only.
- `/app` is work only.
- public, auth, and access-state surfaces must not mount app chrome.
- authenticated home and public root must never share the same constant.
- legacy paths stay alive during the launch window only through explicit redirects.
- raw path strings found during migration must be replaced with canonical helpers or the legacy redirect map.

## Route Contract Freeze

Lock these semantics before any `/app` tree or landing work starts:

- `PUBLIC_ROOT_ROUTE_PATH = '/'`
- `APP_HOME_ROUTE_PATH = '/app'`
- canonical app destinations:
  - approval queue: `/app/admin/approval-queue`
  - user home: `/app/home/user`
  - ops organization setup: `/app/ops/organization-setup`
  - ops off-request policy setup: `/app/ops/off-request-policy-setup`
  - schedule steps: `/app/schedule/step1` through `/app/schedule/step4`
  - step5 builder target: `/app/schedule/step5/:scheduleKey`
- legacy redirect map:
  - `/admin/*`
  - `/home/*`
  - `/ops/*`
  - `/schedule/*`

Launch Core code must follow this contract in:

- post-login redirect resolution
- auth guard fallback
- dashboard CTA navigation
- sidebar selection and active-state logic
- Step1-5 navigation
- Step5 route builder and self-heal helpers
- shared E2E helpers and landing assumptions

## Slice Operating Rules

- Ship one slice at a time.
- Do not begin the next slice until the current slice test gate is green.
- If a slice introduces a regression, fix it inside the same slice before moving on.
- Keep each slice mergeable on its own.
- Prefer extending existing tests over building a parallel test harness.

## Dependency Graph

```text
Slice 0: Route semantics freeze
   ↓
Slice 1: Route contract consolidation
   ↓
Slice 2: Canonical /app workspace coexistence
   ↓
Slice 3: Public landing + layout boundary
   ↓
Slice 4: Legacy redirect window
   ↓
Slice 5: Launch-safe inquiry CTA
   ↓
Slice 6: Deploy contract + regression gate
```

## Baseline Before Slice 0

Run once before starting the first slice:

- `pnpm lint:check`
- `pnpm test:unit -- tests/unit/router-index.spec.ts tests/unit/router-guards.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/login-view.spec.ts tests/unit/dashboard.spec.ts tests/unit/sidebar.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts`

Capture these baseline assumptions before changing any route semantics:

- current redirect matrix for `/`, `/login`, `/signup`, `/access/*`, `/admin/*`, `/home/*`, `/ops/*`, `/schedule/*`
- current legacy `/schedule/step*` guard behavior, especially Step5 `scheduleKey` fallback rules
- current dashboard and sidebar assumptions about “home” and direct route strings
- current shared E2E helper assumptions about landing destinations and schedule review URLs

Expected baseline outcome:

- the route-semantics split is measured before migration begins
- route, auth, dashboard, sidebar, and Step5 helpers provide a regression floor for later slices

## Test Diagram

```text
Public `/`
  ├─ logged-out -> landing page
  └─ logged-in visit to `/` -> `/app`

Canonical `/app`
  ├─ `/app`
  ├─ `/app/home/user`
  ├─ `/app/admin/approval-queue`
  ├─ `/app/ops/*`
  └─ `/app/schedule/step1..step5`

Legacy coexistence
  ├─ `/admin/*` -> `/app/admin/*`
  ├─ `/home/*` -> `/app/home/*`
  ├─ `/ops/*` -> `/app/ops/*`
  └─ `/schedule/*` -> `/app/schedule/*`

Layout boundary
  ├─ `/`, `/login`, `/signup`, `/access/*` -> no app chrome
  └─ `/app/*` -> app chrome allowed

Inquiry
  ├─ header CTA
  ├─ hero CTA
  └─ one validated Google Form contract
```

---

## Slice 0: Route Semantics Freeze

**Goal:** Freeze what `/` and `/app` mean before code starts moving so later slices cannot reintroduce mixed semantics.

**Why this slice comes first:** Without a hard semantic split, later router and landing work will keep leaking raw strings, duplicate assumptions, and incorrect auth fallbacks.

### In Scope

- document and implement the meaning split between public root and authenticated home
- define the canonical builder set for app home, approval queue, user home, ops setup, schedule steps, and Step5
- define the launch-window legacy redirect map for `/admin/*`, `/home/*`, `/ops/*`, `/schedule/*`
- run a raw path census and convert known Launch Core path owners into a migration checklist

### Raw Path Census Checklist

Use grep before and after this slice to keep the blast radius explicit:

- `src/router/index.ts`
- `src/router/guards.ts`
- `src/views/Dashboard.vue`
- `src/components/layout/Sidebar.vue`
- `src/views/schedule/Step1BasicInfo.vue`
- `src/views/schedule/Step2SiteInfo.vue`
- `src/views/schedule/Step3EmployeeInfo.vue`
- `src/views/schedule/Step4InitialData.vue`
- `src/views/schedule/Step5Result.vue`
- `tests/e2e/helpers.ts`
- `tests/unit/dashboard.spec.ts`
- `tests/unit/sidebar.spec.ts`
- `tests/unit/schedule-version-resolver.spec.ts`
- `tests/unit/step5-result.spec.ts`

Recommended grep:

- `rg -n \"'/((admin|home|ops|schedule)|app)\" src tests`

### Likely Files

- `src/constants/routes.ts`
- `src/router/index.ts`
- `src/router/guards.ts`
- `src/views/Dashboard.vue`
- `src/components/layout/Sidebar.vue`
- `src/views/schedule/Step1BasicInfo.vue`
- `src/views/schedule/Step2SiteInfo.vue`
- `src/views/schedule/Step3EmployeeInfo.vue`
- `src/views/schedule/Step4InitialData.vue`
- `src/views/schedule/Step5Result.vue`
- `tests/e2e/helpers.ts`

### Test Files

- `tests/unit/router-index.spec.ts`
- `tests/unit/router-guards.spec.ts`
- `tests/unit/router-auth-guards.spec.ts`
- `tests/unit/dashboard.spec.ts`
- `tests/unit/sidebar.spec.ts`
- `tests/unit/schedule-version-resolver.spec.ts`
- `tests/unit/step5-result.spec.ts`

### Exit Criteria

- `PUBLIC_ROOT_ROUTE_PATH` and `APP_HOME_ROUTE_PATH` are distinct and documented as distinct
- the canonical builder set is complete enough to cover approval queue, user home, ops setup, schedule steps, and Step5
- the legacy redirect map is explicit before any public landing work starts
- the raw path census is reduced to a tracked checklist, not tribal knowledge

### Test Gate After Slice 0

- `pnpm lint:check`
- `pnpm test:unit -- tests/unit/router-index.spec.ts tests/unit/router-guards.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/dashboard.spec.ts tests/unit/sidebar.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts`

---

## Slice 1: Route Contract Consolidation

**Goal:** Make the route constants and helpers the only source of truth for Launch Core paths.

**Why this slice is separate:** The contract has to be usable everywhere before the repo can safely host both canonical `/app` routes and legacy redirects.

### In Scope

- expand `src/constants/routes.ts` into the canonical Launch Core route map
- add builders or helpers for:
  - app home
  - approval queue
  - user home
  - ops organization setup
  - ops off-request policy setup
  - schedule step paths
  - Step5 route payloads
  - legacy-to-canonical redirect targets
- replace remaining raw path ownership in Launch Core code with canonical helpers or the legacy map

### Likely Files

- `src/constants/routes.ts`
- `src/router/index.ts`
- `src/router/guards.ts`
- `src/components/layout/Sidebar.vue`
- `src/views/Dashboard.vue`
- `src/views/schedule/Step1BasicInfo.vue`
- `src/views/schedule/Step2SiteInfo.vue`
- `src/views/schedule/Step3EmployeeInfo.vue`
- `src/views/schedule/Step4InitialData.vue`
- `src/views/schedule/Step5Result.vue`
- `tests/e2e/helpers.ts`

### Test Files

- `tests/unit/router-index.spec.ts`
- `tests/unit/router-guards.spec.ts`
- `tests/unit/router-auth-guards.spec.ts`
- `tests/unit/dashboard.spec.ts`
- `tests/unit/sidebar.spec.ts`
- `tests/unit/schedule-version-resolver.spec.ts`
- `tests/unit/step5-result.spec.ts`

### Exit Criteria

- route constants and builders become the single source of truth for Launch Core destinations
- `/ops/organization-setup`, `/ops/off-request-policy-setup`, and `/schedule/step5/:scheduleKey` are in contract scope, not treated as edge cases
- remaining raw paths are either removed or explicitly tracked in the legacy redirect map
- visible user behavior remains unchanged in this slice

### Test Gate After Slice 1

- `pnpm lint:check`
- `pnpm test:unit -- tests/unit/router-index.spec.ts tests/unit/router-guards.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/dashboard.spec.ts tests/unit/sidebar.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts`

---

## Slice 2: Canonical `/app` Workspace Coexistence

**Goal:** Introduce the canonical authenticated workspace under `/app` while preserving temporary compatibility with legacy destinations.

**Why this slice is separate:** `/app` must exist and be stable before `/` can safely become discovery-only.

### In Scope

- add `/app` parent route that owns `DefaultLayout`
- register canonical authenticated child routes under `/app`
- move post-login redirect targets and guard fallbacks to canonical `/app` destinations
- keep old routes functioning temporarily so the app is not broken mid-migration
- make router-guard regressions a blocking gate for this slice

### Likely Files

- `src/router/index.ts`
- `src/router/guards.ts`
- `src/constants/routes.ts`
- `src/views/auth/Login.vue`
- `src/components/layout/Header.vue`
- `src/components/layout/Sidebar.vue`
- `src/views/Dashboard.vue`
- `tests/e2e/helpers.ts`

### Test Files

- `tests/unit/router-index.spec.ts`
- `tests/unit/router-guards.spec.ts`
- `tests/unit/router-auth-guards.spec.ts`
- `tests/unit/login-view.spec.ts`
- `tests/unit/dashboard.spec.ts`
- `tests/unit/sidebar.spec.ts`
- `tests/unit/schedule-version-resolver.spec.ts`
- `tests/unit/step5-result.spec.ts`
- `tests/e2e/signup-flow.spec.ts`
- `tests/e2e/multi-org-rbac.spec.ts`
- new focused `/app` migration E2E coverage if current specs do not assert canonical destinations directly

### Exit Criteria

- successful auth resolves into canonical `/app` destinations first
- `DefaultLayout` is mounted only through `/app`
- canonical `/app` destinations are usable
- legacy destinations still resolve during the coexistence window
- router guards do not misroute schedule users during the transition

### Test Gate After Slice 2

- `pnpm lint:check`
- `pnpm test:unit -- tests/unit/router-index.spec.ts tests/unit/router-guards.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/login-view.spec.ts tests/unit/dashboard.spec.ts tests/unit/sidebar.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts`
- `pnpm test:e2e -- tests/e2e/signup-flow.spec.ts tests/e2e/multi-org-rbac.spec.ts tests/e2e/public-launch.spec.ts`

---

## Slice 3: Public Landing And Layout Boundary

**Goal:** Make `/` the public landing page and keep app chrome out of public, auth, and access-state surfaces.

**Why this slice is independent:** This is the visible launch front door and should land only after the `/app` workspace already works.

### In Scope

- add the public landing page component or view for `/`
- ensure `/login`, `/signup`, `/access/pending`, and `/access/rejected` stay outside `DefaultLayout`
- redirect active authenticated users from `/` to `/app`
- keep landing hero and header CTA structure aligned with the launch IA

### Acceptance Additions

- logged-out `/` renders the public landing page
- authenticated visit to public `/` redirects to `/app` without redefining the role-aware post-login landing matrix
- `/login`, `/signup`, `/access/pending`, `/access/rejected` render without app chrome
- no app sidebar or workspace header leaks onto public/auth/access-state routes

### Likely Files

- `src/router/index.ts`
- `src/router/guards.ts`
- landing page view and related public CTA components
- `src/App.vue` and `src/main.ts` only if theme or layout ownership needs adjustment
- `src/style.css` only if shared landing tokens are required

### Test Files

- `tests/unit/router-index.spec.ts`
- `tests/unit/router-auth-guards.spec.ts`
- `tests/unit/header.spec.ts` if shared public header logic changes
- new `tests/unit/public-landing.spec.ts`
- new focused Playwright launch entry spec

### Exit Criteria

- unauthenticated users see a public landing page at `/`
- active authenticated users who hit `/` are redirected to `/app`
- no app chrome leaks onto public, auth, or access-state routes

### Test Gate After Slice 3

- `pnpm lint:check`
- `pnpm test:unit -- tests/unit/public-landing.spec.ts tests/unit/router-index.spec.ts tests/unit/router-auth-guards.spec.ts`
- `pnpm test:e2e -- tests/e2e/public-launch.spec.ts`

---

## Slice 4: Legacy Redirect Window

**Goal:** Preserve old bookmarks, test helpers, and operator habits by explicitly redirecting legacy app URLs to canonical `/app` URLs.

**Why this slice matters:** Once `/` becomes public, old deep links become the highest-probability regression path.

### In Scope

- redirect:
  - `/admin/approval-queue` -> `/app/admin/approval-queue`
  - `/home/user` -> `/app/home/user`
  - `/ops/organization-setup` -> `/app/ops/organization-setup`
  - `/ops/off-request-policy-setup` -> `/app/ops/off-request-policy-setup`
  - `/schedule/step1` -> `/app/schedule/step1`
  - `/schedule/step2` -> `/app/schedule/step2`
  - `/schedule/step3` -> `/app/schedule/step3`
  - `/schedule/step4` -> `/app/schedule/step4`
  - `/schedule/step5/:scheduleKey` -> `/app/schedule/step5/:scheduleKey`
- update shared E2E helpers to understand canonical and legacy destinations explicitly
- verify helper consumers still pass when legacy and canonical routes coexist

### Likely Files

- `src/router/index.ts`
- `src/constants/routes.ts`
- `tests/e2e/helpers.ts`
- route-aware unit tests and any dashboard/sidebar tests that assert direct paths

### Test Files

- `tests/unit/router-index.spec.ts`
- `tests/unit/router-guards.spec.ts`
- `tests/unit/dashboard.spec.ts`
- `tests/unit/sidebar.spec.ts`
- `tests/unit/schedule-version-resolver.spec.ts`
- `tests/unit/step5-result.spec.ts`
- `tests/e2e/public-launch.spec.ts`
- `tests/e2e/multi-org-rbac.spec.ts`
- helper consumer specs that assert direct schedule or ops routes

### Exit Criteria

- old bookmarked deep links resolve into the new `/app` workspace
- redirect behavior is explicit and tested, not accidental
- `/ops/*`, `/schedule/*`, and Step5 legacy routes do not dead-end
- shared E2E helpers work against canonical routes without breaking launch-window legacy coverage

### Test Gate After Slice 4

- `pnpm lint:check`
- `pnpm test:unit -- tests/unit/router-index.spec.ts tests/unit/router-guards.spec.ts tests/unit/dashboard.spec.ts tests/unit/sidebar.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts`
- `pnpm test:e2e -- tests/e2e/public-launch.spec.ts tests/e2e/multi-org-rbac.spec.ts`

---

## Slice 5: Launch-Safe Inquiry CTA

**Goal:** Wire all public inquiry CTAs through one validated config value and gate launch on the real external form contract.

**Why this slice is separate:** It is a launch conversion-path slice, not just a route wiring task.

### In Scope

- use one public config value for all inquiry CTA surfaces
- add `VITE_PUBLIC_INQUIRY_FORM_URL` to `.env.example`
- validate that the URL exists and has a valid URL shape through `pnpm check-env`
- keep CTA labels and new-tab behavior consistent across header and hero
- document and execute manual Google Form contract QA

### Manual Google Form Contract QA

Verify before closing this slice:

- required fields exist: `요청 내용`, `병원 이름`, `병동 이름`, `이메일 주소`
- `요청 내용` supports `소개 자료 다운로드`, `한 달 무료 사용하기`, `기타`
- `기타` has a usable free-text input path
- personal-information notice is visible before submit
- consent checkbox behavior is present if launch copy requires it
- submission confirmation explains what happens next

### Likely Files

- landing and header CTA component files
- `.env.example`
- `scripts/check-env.js`
- `vite-env.d.ts` if env typing is introduced

### Test Files

- `tests/unit/public-landing.spec.ts`
- new focused CTA parity and inquiry URL validation coverage if logic is extracted

### Exit Criteria

- all public inquiry CTAs open the same configured destination
- missing or malformed inquiry URL is caught before launch, not by end users
- no duplicate hard-coded form URL remains in the codebase
- the Google Form contract is manually verified and documented as launch-safe

### Test Gate After Slice 5

- `pnpm lint:check`
- `pnpm check-env`
- `pnpm test:unit -- tests/unit/public-landing.spec.ts`
- manual Google Form contract QA complete

---

## Slice 6: Deploy Contract And Launch Regression Gate

**Goal:** Lock the deployment contract and make the launch regression gate executable instead of advisory.

**Why this is the last slice:** It validates the complete migration only after all route, redirect, and CTA behavior exists.

### In Scope

- add root `vercel.json` rewrite for Vite SPA deep links
- verify `/app/*` refresh behavior
- make `pnpm check-env` a required launch gate with at least:
  - `VITE_PUBLIC_INQUIRY_FORM_URL` presence
  - `VITE_PUBLIC_INQUIRY_FORM_URL` URL-shape validation
- add or finish focused launch regression coverage for:
  - public `/`
  - canonical `/app`
  - auth redirect matrix
  - legacy redirect matrix
  - helper consumer coverage
  - inquiry CTA path
- define preview and production smoke checks for the launch gate

### Likely Files

- `vercel.json`
- `scripts/check-env.js`
- `tests/e2e/public-launch.spec.ts`
- `tests/e2e/helpers.ts`
- route and auth unit tests if final assertions change

### Test Files

- `tests/unit/router-index.spec.ts`
- `tests/unit/router-auth-guards.spec.ts`
- `tests/unit/login-view.spec.ts`
- `tests/unit/public-landing.spec.ts`
- `tests/unit/schedule-version-resolver.spec.ts`
- `tests/unit/step5-result.spec.ts`
- `tests/e2e/public-launch.spec.ts`
- `tests/e2e/signup-flow.spec.ts`
- `tests/e2e/multi-org-rbac.spec.ts`

### Exit Criteria

- `/app/*` deep links survive refresh in Vercel preview
- launch-focused route, auth, helper, and redirect regressions are covered in unit and E2E tests
- preview is ready for manual smoke before production promotion
- launch cannot proceed with a missing or malformed inquiry URL

### Test Gate After Slice 6

- `pnpm lint:check`
- `pnpm check-env`
- `pnpm test:unit -- tests/unit/router-index.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/login-view.spec.ts tests/unit/public-landing.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts`
- `pnpm test:e2e -- tests/e2e/public-launch.spec.ts tests/e2e/signup-flow.spec.ts tests/e2e/multi-org-rbac.spec.ts`
- `pnpm build`

Manual verification before production:

- logged-out `/` works as the public launch page
- logged-in `/` redirects to `/app`
- `/login`, `/signup`, and `/access/*` render without app chrome
- preview `/app/*` refresh works
- legacy redirect matrix resolves correctly for `/admin/*`, `/home/*`, `/ops/*`, `/schedule/*`
- inquiry CTA opens the configured Google Form
- admin, super, pending, rejected, and restricted-user routing all land correctly

---

## Recommended Development Flow

Use this exact loop for every slice:

1. implement only the current slice
2. run the slice test gate
3. fix regressions inside the same slice
4. commit the slice
5. only then begin the next slice

Recommended commit shape:

- `chore: freeze launch route semantics`
- `feat: consolidate launch route contract`
- `feat: add canonical app workspace routes`
- `feat: add public launch landing route`
- `feat: add launch legacy redirects`
- `feat: wire inquiry CTA config`
- `chore: add vercel launch routing contract`

## Critical Failure Modes

| Failure Mode                                    | What Breaks                                                                              | Slice That Must Catch It  |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------- |
| authenticated `/` loop or wrong landing         | active users bounce between `/`, `/login`, and legacy homes or land on the wrong surface | Slice 0, Slice 2, Slice 3 |
| `/ops/*` bookmark dead-end                      | admin operators hit saved setup links and land on 404 or a blank shell                   | Slice 1, Slice 4          |
| `/app/schedule/*` step guard misroute           | schedule users skip required steps, lose `scheduleKey`, or re-enter the wrong screen     | Slice 0, Slice 1, Slice 2 |
| missing inquiry env with visible-but-broken CTA | launch page exposes a CTA that cannot open the real inquiry form                         | Slice 5, Slice 6          |

## Final Launch Gate

`Launch Core` is ready to ship only when:

- all 7 slices are complete
- every slice gate is green
- final launch regression suite is green
- preview smoke checks pass
- `launch-core-qa-checklist.md` is complete
