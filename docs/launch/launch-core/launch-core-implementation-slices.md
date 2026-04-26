# Launch Core Implementation Slices

> Execution plan derived from [launch-core-plan.md](./launch-core-plan.md)

**Document role:** This is the master slice plan for Launch Core. It owns the full Slice 0-6 sequence. Slice 6 uses two supporting artifacts:

- [Launch Core Auth and Deploy Spec](./launch-core-auth-and-deploy-spec.md): auth, environment, Vercel, domain, and SSL criteria for Slice 6.
- [Launch Core QA Checklist](./launch-core-qa-checklist.md): the executable smoke checklist for preview, production default URL, and custom domain verification.

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
Slice 6: Deploy Readiness + Preview Regression Gate
```

## Slice Progress

Last updated: 2026-04-25

| Slice                                               | Status      | Notes                                                                                                                                                             |
| --------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slice 0: Route semantics freeze                     | Done        | Public root and authenticated app route semantics are split in the route contract.                                                                                |
| Slice 1: Route contract consolidation               | Done        | Launch Core route constants, canonical builders, and legacy redirect targets are centralized.                                                                     |
| Slice 2: Canonical `/app` workspace coexistence     | Done        | `DefaultLayout` is owned by `/app`, canonical workspace routes are active, and legacy workspace URLs redirect to `/app/*` with query/hash preserved.              |
| Slice 3: Public landing + layout boundary           | Done        | `/` renders the public landing surface for logged-out users, active authenticated root visits enter `/app`, and app chrome stays scoped to `/app/*`.              |
| Slice 4: Legacy redirect window                     | Done        | Redirect normalization, helper updates, unit coverage, and direct Playwright spec coverage are complete; full Playwright setup depends on local test credentials. |
| Slice 5: Launch-safe inquiry CTA                    | Done        | Public inquiry CTAs use one `VITE_PUBLIC_INQUIRY_FORM_URL`, local env validation and focused unit coverage are in place, and Vercel env setup remains in Slice 6. |
| Slice 6: Deploy Readiness + Preview Regression Gate | Not started | Master stage flow is defined here; Vercel/auth details live in the support spec and execution checks live in the QA checklist.                                    |

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

**Status:** Done

**Completed:** `/` renders the public landing surface for logged-out users, authenticated root visits enter `/app`, and public/auth/access-state surfaces stay outside the app chrome boundary.

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

**Status:** Done

**Completed:** Legacy route normalization is centralized in route constants, the static legacy redirect matrix and Step5 redirect preservation are covered by unit tests, and launch E2E/checklist specs now assert canonical `/app` destinations. The dependency-skipped Playwright spec run passes locally; the full Playwright setup depends on local `TEST_USER_EMAIL` and `TEST_USER_PASSWORD`.

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

**Status:** Done

**Completed:** Header, hero, and bottom inquiry CTAs now open the same configured Google Form URL in a new tab. `VITE_PUBLIC_INQUIRY_FORM_URL` is documented in `.env.example`, validated by `pnpm check-env`, and covered by focused unit tests for CTA parity and env validation. The Google Form contract has been prepared for launch QA; Vercel Preview/Production environment variable setup remains part of Slice 6 deployment smoke.

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
- `pnpm test:unit -- tests/unit/public-landing.spec.ts tests/unit/check-env.spec.ts`
- manual Google Form contract QA complete

---

## Slice 6: Deploy Readiness + Preview Regression Gate

**Goal:** Make the repository deploy-ready, bootstrap the first Vercel deployment path, and define launch regression gates without requiring custom-domain DNS or SSL readiness.

**Why this is the last slice:** It validates the complete route, auth, redirect, inquiry CTA, and deploy contract only after the Launch Core migration behavior exists.

### Status Layers

```text
Repo-ready
  -> Vercel-project-ready
  -> Preview-smoke-ready
  -> Production-default-domain-ready
  -> Custom-domain-ready
```

`Repo-ready` can merge before a Vercel project exists and before the custom domain is connected. `Custom-domain-ready` blocks only the public launch on `everyshift.co.kr`, not the repository deploy-readiness proof.

### Explicit Assumptions

- the purchased custom domain is `everyshift.co.kr`
- no Vercel project may exist yet
- the first deployed verification target is a Vercel generated URL
- registrar DNS and SSL readiness are external launch-ops tasks
- Slice 6 code and docs can merge before `everyshift.co.kr` is connected and SSL-ready

**Supporting artifacts:**

- [Launch Core Auth and Deploy Spec](./launch-core-auth-and-deploy-spec.md)
- [Launch Core QA Checklist](./launch-core-qa-checklist.md)

This master slice document defines the stage sequence and pass/fail gates. The support spec records the Vercel project settings and deployment principles. The QA checklist records the actual verification order for a person performing the launch smoke.

### Slice 6 Stage Flow

#### 1. Repo-ready

Purpose: prove the repository is ready before any Vercel project setup or deployment smoke.

Gate:

- root `vercel.json` contains the Vite SPA rewrite to `/index.html`
- `pnpm check-env` validates the public inquiry URL contract
- focused unit and E2E launch regression coverage is ready
- local `pnpm build` succeeds before the first deploy handoff

#### 2. Vercel-project-ready

Purpose: create or confirm the Vercel project and GitHub connection with settings a Vercel beginner can check.

Gate:

- GitHub repository is connected to the Vercel project
- Framework Preset is Vite or equivalent Vite auto-detection is confirmed
- Build Command is `pnpm build`
- Output Directory is `dist`
- Install Command follows the project package manager, normally `pnpm install`
- Preview and Production environment variables are set independently
- `VITE_PUBLIC_INQUIRY_FORM_URL` is set in both Preview and Production

#### 3. Preview-smoke-ready

Purpose: verify the generated Preview URL before any production promotion.

Gate:

- generated Preview URL opens the public landing at `/`
- `/app/*` deep links survive direct load and refresh on the Preview URL
- login, signup, access-state, role landing, legacy redirects, and inquiry CTA checks pass on Preview
- Preview smoke result is recorded in [Launch Core QA Checklist](./launch-core-qa-checklist.md)

#### 4. Production-default-domain-ready

Purpose: verify the generated Production URL before attaching or announcing the launch domain.

Gate:

- generated Production URL is reachable
- public landing, auth redirects, `/app/*` refresh, legacy redirects, and inquiry CTA checks pass on the generated Production URL
- production environment variable values match the intended launch values
- production default-domain smoke result is recorded in [Launch Core QA Checklist](./launch-core-qa-checklist.md)

#### 5. Custom-domain-ready

Purpose: verify `everyshift.co.kr` after DNS and SSL are active.

Gate:

- `everyshift.co.kr` is assigned to the Vercel project
- DNS records shown by Vercel are configured at the domain provider
- Vercel reports the HTTPS certificate as active after DNS propagation
- public landing, `/app/*` refresh, legacy redirects, and inquiry CTA checks pass on `https://everyshift.co.kr`
- custom-domain smoke result is recorded in [Launch Core QA Checklist](./launch-core-qa-checklist.md)

### In Scope

- add root `vercel.json` rewrite for Vite SPA deep links
- keep local repo-ready checks independent from Vercel
- define Vercel project bootstrap settings
- define Preview smoke checks on `https://<vercel-preview-deployment>.vercel.app`
- define Production smoke checks on `https://<vercel-project>.vercel.app`
- defer custom-domain smoke checks on `https://everyshift.co.kr` until DNS and SSL are complete

### Out of Scope

- buying additional domains or changing the registered domain
- configuring registrar DNS
- adding OAuth providers
- adding analytics
- changing schedule-generation behavior

### Repo Deploy Contract

- root `vercel.json` exists with a Vite SPA fallback rewrite to `/index.html`
- `/app/*` hard refreshes are expected to resolve through the SPA fallback
- local checks use `.env.local` and do not require live Vercel URLs
- credential-backed Playwright specs are reported separately from repo readiness
- `pnpm check-env` remains the launch env gate for `VITE_PUBLIC_INQUIRY_FORM_URL`

### Vercel Project Bootstrap Checklist

- import the GitHub repo into Vercel
- framework preset: `Vite`
- install command: `pnpm install`
- build command: `pnpm build`
- output directory: `dist`
- Node version: Vercel default unless a project constraint is added later
- set Preview and Production environment variables separately:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_API_BASE_URL`
  - `VITE_PUBLIC_INQUIRY_FORM_URL`
- optional until canonical/meta behavior exists:
  - `VITE_PUBLIC_SITE_URL`
- do not put secrets in `VITE_*`
- do not copy `.env.local` into Vercel without reviewing values
- `VITE_PUBLIC_INQUIRY_FORM_URL` must be the real Google Form URL, not the template placeholder

### Preview Smoke Gate

Preview target:

```text
https://<vercel-preview-deployment>.vercel.app
```

Required checks:

- logged-out `/` shows public landing
- logged-in `/` redirects to `/app`
- `/login`, `/signup`, and `/access/*` render without app chrome
- `/app` loads with app chrome for an active admin
- `/app/schedule/step1` hard refresh does not 404
- `/admin/*`, `/home/*`, `/ops/*`, and `/schedule/*` redirect to canonical `/app/*`
- inquiry CTA opens the configured Google Form
- pending, rejected, and restricted-user routes land correctly

Failure rule:

```text
If preview smoke fails, do not promote to production. Fix the repo or Vercel env/config first.
```

### Production Default-Domain Smoke Gate

Production target before custom-domain connection:

```text
https://<vercel-project>.vercel.app
```

Run the same smoke matrix from the Preview gate against the production generated URL.

Promotion rule:

```text
Production deployment can be verified on the generated Vercel domain. Custom-domain launch on everyshift.co.kr remains blocked until DNS, SSL, and custom-domain smoke are complete.
```

### Deferred Custom-Domain Checklist

Target custom domain:

```text
https://everyshift.co.kr
```

Complete this only after the Vercel project exists and domain connection work begins:

- confirm the purchased domain is `everyshift.co.kr`
- add `everyshift.co.kr` to the Vercel project
- configure registrar DNS records as instructed by Vercel
- wait for the Vercel SSL certificate to become valid
- smoke test `/`, `/app`, `/login`, `/signup`, `/access/*`, and one `/app/schedule/*` hard refresh on `https://everyshift.co.kr`
- update `VITE_PUBLIC_SITE_URL` only if site metadata or canonical URL behavior is implemented

Custom-domain rule:

```text
Do not block Slice 6 repo completion on connecting everyshift.co.kr. Block public custom-domain launch on this checklist instead.
```

### Likely Files

- `vercel.json`
- `docs/launch/launch-core/launch-core-implementation-slices.md`
- `docs/launch/launch-core/launch-core-implementation-slices.ko.md`
- `docs/launch/launch-core/launch-core-auth-and-deploy-spec.md`
- `docs/launch/launch-core/launch-core-auth-and-deploy-spec.ko.md`
- `docs/launch/launch-core/launch-core-qa-checklist.md`
- `docs/launch/launch-core/launch-core-qa-checklist.ko.md`

### Test Files

- `tests/unit/router-index.spec.ts`
- `tests/unit/router-auth-guards.spec.ts`
- `tests/unit/login-view.spec.ts`
- `tests/unit/public-landing.spec.ts`
- `tests/unit/check-env.spec.ts`
- `tests/unit/schedule-version-resolver.spec.ts`
- `tests/unit/step5-result.spec.ts`
- `tests/e2e/public-launch.spec.ts`
- `tests/e2e/signup-flow.spec.ts`
- `tests/e2e/multi-org-rbac.spec.ts`

### Exit Criteria

- `vercel.json` defines the Vite SPA fallback rewrite
- local repo-ready checks pass without live Vercel URLs
- Vercel project bootstrap settings are documented
- preview smoke is defined against a generated Vercel URL
- production smoke is defined against the generated Vercel production URL
- custom-domain launch on `everyshift.co.kr` is deferred behind DNS, SSL, and smoke checks
- launch cannot proceed with a missing, malformed, non-Google, or template inquiry URL
- all five Slice 6 readiness stages are recorded as pass, blocked, or intentionally deferred in the QA checklist

### Test Gate After Slice 6

Repo-ready local gate:

```bash
pnpm lint:check
pnpm check-env
pnpm test:unit -- tests/unit/router-index.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/login-view.spec.ts tests/unit/public-landing.spec.ts tests/unit/check-env.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts
pnpm test:e2e -- --no-deps tests/e2e/public-launch.spec.ts
pnpm build
```

Expected: all commands pass locally using `.env.local`; E2E does not require a live Vercel URL.

Credential-backed E2E gate:

```bash
pnpm test:e2e -- tests/e2e/signup-flow.spec.ts tests/e2e/multi-org-rbac.spec.ts
```

Expected: runs only when `.env.test` or the shell environment has the required test account credentials.

If credential-backed E2E cannot run, record:

```text
Blocked locally by missing TEST_USER_EMAIL/TEST_USER_PASSWORD. Not a Slice 6 repo-readiness failure.
```

Manual smoke records before launch:

- logged-out `/` works as the public launch page
- logged-in `/` redirects to `/app`
- `/login`, `/signup`, and `/access/*` render without app chrome
- preview `/app/*` refresh works
- legacy redirect matrix resolves correctly for `/admin/*`, `/home/*`, `/ops/*`, `/schedule/*`
- inquiry CTA opens the configured Google Form
- admin, super, pending, rejected, and restricted-user routing all land correctly
- generated Preview URL, generated Production URL, and `everyshift.co.kr` have explicit smoke results before launch announcement

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
- preview, production default URL, and custom-domain smoke checks pass or have an explicit launch decision recorded
- `launch-core-qa-checklist.md` is complete
