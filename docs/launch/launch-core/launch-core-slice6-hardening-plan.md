# Launch Core Slice 6 Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework Slice 6 so Launch Core can prove deploy readiness on Vercel generated URLs before connecting the purchased custom-domain target, `everyshift.co.kr`.

**Architecture:** Separate repo-owned deploy correctness from external launch operations. The repository must become mergeable with a Vercel SPA contract, local regression gates, and generated-URL smoke criteria; Vercel project bootstrap, Production promotion, and custom-domain readiness are staged gates that do not block the repo-ready slice.

**Tech Stack:** Vue 3, TypeScript, Vite, Playwright, Vitest, Vercel, pnpm

---

## Scope Check

This plan is documentation and deploy-contract hardening only.

In scope:

- rewrite Slice 6 docs around generated Vercel URLs
- add the root `vercel.json` SPA fallback contract
- split local, preview, production generated-domain, and custom-domain gates
- make Vercel project bootstrap explicit
- preserve the existing Launch Core route, auth, inquiry CTA, and env-validation behavior

Out of scope:

- buying additional domains or changing the registered domain
- configuring DNS
- wiring OAuth providers
- adding analytics
- changing schedule-generation behavior
- adding new CRUD flows

## Current Problem

The current Slice 6 definition assumes the deployment environment already exists:

- no root `vercel.json` exists yet
- Vercel project setup is not represented as a bootstrap task
- preview and production smoke checks are written as if URLs already exist
- custom-domain readiness is implied even though `everyshift.co.kr` DNS, SSL, and custom-domain smoke are external launch-ops gates
- repo-owned gates and external operational setup are mixed together

Slice 6 should not block on connecting `everyshift.co.kr`. It should first prove that the repo can deploy safely to Vercel-generated URLs, then make DNS, SSL, and custom-domain smoke an explicit follow-up gate.

## Plan Review Findings

The existing plan direction is correct. The needed hardening is plan quality, not a strategy change:

- exact replacement text is required so implementers do not invent different Slice 6 semantics
- `scripts/check-env.js` should not be reworked in Slice 6 unless existing Slice 5 validations are missing
- credential-backed Playwright specs must stay separate from the repo-ready gate
- custom-domain launch on `everyshift.co.kr` must be explicitly blocked on DNS, SSL, and smoke, while repo completion remains unblocked
- verification must include markdown consistency checks because most of this slice edits docs

## Target Slice Shape

Rename Slice 6 to:

```text
Slice 6: Deploy Readiness + Preview Regression Gate
```

Use these status layers:

```text
Repo-ready
  -> Vercel-project-ready
  -> Preview-smoke-ready
  -> Production-default-domain-ready
  -> Custom-domain-ready
```

`Repo-ready` is mergeable. `Custom-domain-ready` applies only to the public custom-domain launch, not to proving Launch Core deployment correctness.

## File Structure

- Modify: `docs/launch/launch-core/launch-core-implementation-slices.md`
  - Replace the current Slice 6 section with Source Block A.
- Modify: `docs/launch/launch-core/launch-core-implementation-slices.ko.md`
  - Mirror Source Block A in Korean, preserving the same status layer names and command blocks.
- Modify: `docs/launch/launch-core/launch-core-auth-and-deploy-spec.md`
  - Add Source Block B under `## Deployment Contract` after `### Platform`.
- Modify: `docs/launch/launch-core/launch-core-auth-and-deploy-spec.ko.md`
  - Mirror Source Block B in Korean, preserving env var names and command strings exactly.
- Modify: `docs/launch/launch-core/launch-core-qa-checklist.md`
  - Replace the current `## Deployment Smoke` section with Source Block C.
  - Replace the current `## Final Gate` section with Source Block D.
- Modify: `docs/launch/launch-core/launch-core-qa-checklist.ko.md`
  - Mirror Source Blocks C and D in Korean.
- Create: `vercel.json`
  - Add the Vite SPA fallback rewrite needed for `/app/*` hard refreshes.

Do not modify by default:

- `scripts/check-env.js`
  - Slice 5 already validates `VITE_PUBLIC_INQUIRY_FORM_URL` presence, URL shape, Google Form host, and template placeholders. Touch this file only if current code lacks those checks.
- `.env.example`
  - It already documents the public inquiry URL. Touch it only if the required Vercel env list changes.
- `tests/e2e/public-launch.spec.ts` and `tests/e2e/helpers.ts`
  - They already use local app-relative navigation. Touch them only if the repo-ready E2E gate fails because the test requires a live Vercel URL.

## Source Block A: Replacement Slice 6 Section

Replace the full section from `## Slice 6:` through the line before `---` that precedes `## Recommended Development Flow` in `docs/launch/launch-core/launch-core-implementation-slices.md` with:

````markdown
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
  - `VITE_PUBLIC_INQUIRY_FORM_URL`
- leave `VITE_API_BASE_URL` unset in Vercel so browser solver calls use the same-origin `/api/*` rewrite
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
- custom-domain launch is deferred behind domain, DNS, SSL, and smoke checks
- launch cannot proceed with a missing, malformed, non-Google, or template inquiry URL

### Test Gate After Slice 6

Repo-ready local gate:

```bash
pnpm lint:check
pnpm check-env
pnpm test:unit tests/unit/router-index.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/login-view.spec.ts tests/unit/public-landing.spec.ts tests/unit/check-env.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts
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
````

## Source Block B: Deploy Spec Addition

Add this under `## Deployment Contract` after `### Platform` in `docs/launch/launch-core/launch-core-auth-and-deploy-spec.md`:

````markdown
### Deployment Readiness Layers

Launch Core deployment is staged in this order:

```text
Repo-ready
  -> Vercel-project-ready
  -> Preview-smoke-ready
  -> Production-default-domain-ready
  -> Custom-domain-ready
```

`Repo-ready` proves the repository can be built, tested, and configured for Vercel. `Custom-domain-ready` is a launch-ops gate for `everyshift.co.kr` that begins only after Vercel project setup, DNS setup, and SSL readiness.

### Initial Deploy Targets

- first Preview target: `https://<vercel-preview-deployment>.vercel.app`
- first Production target: `https://<vercel-project>.vercel.app`
- custom domain: `https://everyshift.co.kr`, deferred until DNS, SSL, and custom-domain smoke

The generated Vercel URLs are required for initial deployment proof. Connecting `everyshift.co.kr` is not required to complete Slice 6 repo readiness.

### Vercel Project Bootstrap

Required project settings:

- framework preset: `Vite`
- install command: `pnpm install`
- build command: `pnpm build`
- output directory: `dist`
- Node version: Vercel default unless a project constraint is added later

Required Preview and Production environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PUBLIC_INQUIRY_FORM_URL`

Optional until canonical/meta work exists:

- `VITE_PUBLIC_SITE_URL`

Optional only when directly calling Cloud Run from the browser:

- `VITE_API_BASE_URL`

Environment rules:

- set Preview and Production values separately
- leave `VITE_API_BASE_URL` unset in Vercel so solver traffic uses the same-origin `/api/*` rewrite
- do not put secrets in `VITE_*`
- review values before copying anything from `.env.local`
- `VITE_PUBLIC_INQUIRY_FORM_URL` must be the real Google Form URL, not the template placeholder
````

## Source Block C: QA Deployment Smoke Replacement

Replace the current `## Deployment Smoke` section in `docs/launch/launch-core/launch-core-qa-checklist.md` with:

```markdown
## Deployment Smoke

### Local Repo-Ready

- [ ] `pnpm lint:check` passed
- [ ] `pnpm check-env` passed
- [ ] `pnpm test:unit tests/unit/router-index.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/login-view.spec.ts tests/unit/public-landing.spec.ts tests/unit/check-env.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts` passed
- [ ] `pnpm test:e2e -- --no-deps tests/e2e/public-launch.spec.ts` passed
- [ ] `pnpm build` passed
- [ ] credential-backed E2E status recorded separately if `TEST_USER_EMAIL` or `TEST_USER_PASSWORD` is missing

### Vercel Project Bootstrap

- [ ] GitHub repo imported into Vercel
- [ ] framework preset is `Vite`
- [ ] install command is `pnpm install`
- [ ] build command is `pnpm build`
- [ ] output directory is `dist`
- [ ] Preview `VITE_SUPABASE_URL` is set
- [ ] Preview `VITE_SUPABASE_ANON_KEY` is set
- [ ] Preview `VITE_API_BASE_URL` is unset or empty
- [ ] Preview `VITE_PUBLIC_INQUIRY_FORM_URL` is set
- [ ] Production `VITE_SUPABASE_URL` is set
- [ ] Production `VITE_SUPABASE_ANON_KEY` is set
- [ ] Production `VITE_API_BASE_URL` is unset or empty
- [ ] Production `VITE_PUBLIC_INQUIRY_FORM_URL` is set
- [ ] `VITE_PUBLIC_INQUIRY_FORM_URL` is a real Google Form URL in Preview
- [ ] `VITE_PUBLIC_INQUIRY_FORM_URL` is a real Google Form URL in Production
- [ ] no secrets are stored in `VITE_*`

### Preview Generated URL

- [ ] Preview URL recorded: `https://<vercel-preview-deployment>.vercel.app`
- [ ] logged-out `/` shows public landing
- [ ] logged-in `/` redirects to `/app`
- [ ] `/login`, `/signup`, and `/access/*` render without app chrome
- [ ] `/app` loads with app chrome for an active admin
- [ ] `/app/schedule/step1` hard refresh does not 404
- [ ] legacy `/admin/*`, `/home/*`, `/ops/*`, and `/schedule/*` URLs redirect to canonical `/app/*`
- [ ] `도입 문의` opens the configured Google Form
- [ ] pending, rejected, and restricted-user routes land correctly

### Production Generated URL

- [ ] Production URL recorded: `https://<vercel-project>.vercel.app`
- [ ] same smoke matrix from Preview Generated URL passed
- [ ] production promotion happened only after Preview smoke passed

### Custom Domain

- [ ] purchased domain confirmed as `everyshift.co.kr`
- [ ] `everyshift.co.kr` added to Vercel project
- [ ] registrar DNS records configured as instructed by Vercel
- [ ] Vercel SSL certificate is valid
- [ ] `/`, `/app`, `/login`, `/signup`, `/access/*`, and one `/app/schedule/*` hard refresh passed on `https://everyshift.co.kr`
- [ ] `VITE_PUBLIC_SITE_URL` updated only if site metadata or canonical URL behavior exists
```

## Source Block D: Final Gate Replacement

Replace the current `## Final Gate` section in `docs/launch/launch-core/launch-core-qa-checklist.md` with:

```markdown
## Final Gate

- [ ] all 7 slices are complete
- [ ] every repo-ready slice gate is green
- [ ] final launch regression suite is green
- [ ] Vercel project bootstrap is complete
- [ ] Preview generated URL smoke passed
- [ ] Production generated URL smoke passed
- [ ] custom-domain checklist is complete, or custom-domain launch is explicitly deferred
- [ ] `launch-core-qa-checklist.md` is complete with tested URL, date, and tester recorded where manual checks were performed
```

### Task 1: Replace Slice 6 Scope And Status Model

**Files:**

- Modify: `docs/launch/launch-core/launch-core-implementation-slices.md`
- Modify: `docs/launch/launch-core/launch-core-implementation-slices.ko.md`

- [ ] **Step 1: Locate the existing Slice 6 section**

Run:

```bash
rg -n "## Slice 6:|## Recommended Development Flow|## Final Launch Gate" docs/launch/launch-core/launch-core-implementation-slices.md docs/launch/launch-core/launch-core-implementation-slices.ko.md
```

Expected: both language files have one Slice 6 section before `## Recommended Development Flow`.

- [ ] **Step 2: Replace the English Slice 6 section**

Use Source Block A exactly for `docs/launch/launch-core/launch-core-implementation-slices.md`.

- [ ] **Step 3: Replace the Korean Slice 6 section**

Mirror Source Block A in `docs/launch/launch-core/launch-core-implementation-slices.ko.md`.

Rules:

- keep command blocks exactly the same as English
- keep env var names exactly the same as English
- keep status layer labels exactly the same as English
- write explanatory prose in Korean

- [ ] **Step 4: Update the dependency graph and progress table label**

Replace any remaining old Slice 6 label:

```text
legacy Slice 6 deploy contract label
```

with:

```text
Slice 6: Deploy Readiness + Preview Regression Gate
```

Korean progress table label:

```text
Slice 6: 배포 준비 + Preview 회귀 게이트
```

- [ ] **Step 5: Run markdown search checks**

Run:

```bash
rg -n "Slice 6|custom domain|domain|Vercel preview|generated URL|Production generated|Preview generated|everyshift\.co\.kr" docs/launch/launch-core/launch-core-implementation-slices.md docs/launch/launch-core/launch-core-implementation-slices.ko.md
```

Expected: generated Vercel URLs are described before custom-domain setup in both files, and `everyshift.co.kr` appears as the known custom-domain target.

- [ ] **Step 6: Commit the slice-doc rewrite**

```bash
git add docs/launch/launch-core/launch-core-implementation-slices.md docs/launch/launch-core/launch-core-implementation-slices.ko.md
git commit -m "docs: harden launch core slice 6 deploy model"
```

### Task 2: Add The Repo-Owned Vercel SPA Contract

**Files:**

- Create: `vercel.json`

- [ ] **Step 1: Confirm the file does not already exist**

Run:

```bash
ls vercel.json
```

Expected: `ls: vercel.json: No such file or directory`

- [ ] **Step 2: Create `vercel.json`**

Use:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

- [ ] **Step 3: Verify the JSON parses**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('vercel.json', 'utf8')); console.log('vercel.json ok')"
```

Expected:

```text
vercel.json ok
```

- [ ] **Step 4: Verify build still works locally**

Run:

```bash
pnpm build
```

Expected: `vue-tsc -b && vite build` completes successfully.

- [ ] **Step 5: Commit the deploy contract**

```bash
git add vercel.json
git commit -m "chore: add vercel spa deploy contract"
```

### Task 3: Keep Local Gates Independent From Vercel

**Files:**

- Modify only if needed: `tests/e2e/public-launch.spec.ts`
- Modify only if needed: `tests/e2e/helpers.ts`
- Modify only if needed: `playwright.config.ts`

- [ ] **Step 1: Run the repo-ready E2E gate**

Run:

```bash
pnpm test:e2e -- --no-deps tests/e2e/public-launch.spec.ts
```

Expected: tests navigate with app-relative paths and do not require a live Vercel URL.

- [ ] **Step 2: If it fails because of missing credentials, stop and classify correctly**

Record:

```text
Blocked locally by missing TEST_USER_EMAIL/TEST_USER_PASSWORD. Not a Slice 6 repo-readiness failure.
```

Do not rewrite public-launch tests to depend on real credentials.

- [ ] **Step 3: If it fails because it expects a live URL, make the smallest local-only test fix**

Allowed fix shape:

```ts
await page.goto('/');
await page.goto(APP_HOME_ROUTE_PATH);
await page.goto(LEGACY_SCHEDULE_STEP1_ROUTE_PATH);
```

Disallowed fix shape:

```ts
await page.goto(process.env.VERCEL_URL!);
await page.goto('https://<preview>.vercel.app');
```

- [ ] **Step 4: Rerun the repo-ready E2E gate**

Run:

```bash
pnpm test:e2e -- --no-deps tests/e2e/public-launch.spec.ts
```

Expected: pass locally without a Vercel URL.

- [ ] **Step 5: Commit only if test files changed**

```bash
git add tests/e2e/public-launch.spec.ts tests/e2e/helpers.ts playwright.config.ts
git commit -m "test: keep launch smoke local to repo readiness"
```

### Task 4: Add Vercel Project Bootstrap To The Deploy Spec

**Files:**

- Modify: `docs/launch/launch-core/launch-core-auth-and-deploy-spec.md`
- Modify: `docs/launch/launch-core/launch-core-auth-and-deploy-spec.ko.md`

- [ ] **Step 1: Add English deploy readiness details**

Insert Source Block B under `## Deployment Contract` after `### Platform`.

- [ ] **Step 2: Add Korean deploy readiness details**

Mirror Source Block B in `docs/launch/launch-core/launch-core-auth-and-deploy-spec.ko.md`.

Rules:

- keep env var names exactly the same as English
- keep URL placeholder text exactly the same as English
- keep Vercel setting values exactly the same as English
- write explanatory prose in Korean

- [ ] **Step 3: Search for contradictory domain wording**

Run:

```bash
rg -n "custom domai[n]|require[d] domai[n]|domai[n].*require[d]|VITE_PUBLIC_SITE_URL|Vercel" docs/launch/launch-core/launch-core-auth-and-deploy-spec.md docs/launch/launch-core/launch-core-auth-and-deploy-spec.ko.md
```

Expected: custom domain is deferred, and `VITE_PUBLIC_SITE_URL` is optional unless canonical/meta behavior exists.

- [ ] **Step 4: Commit the deploy spec**

```bash
git add docs/launch/launch-core/launch-core-auth-and-deploy-spec.md docs/launch/launch-core/launch-core-auth-and-deploy-spec.ko.md
git commit -m "docs: define vercel launch bootstrap"
```

### Task 5: Split Deployment QA Into Staged Gates

**Files:**

- Modify: `docs/launch/launch-core/launch-core-qa-checklist.md`
- Modify: `docs/launch/launch-core/launch-core-qa-checklist.ko.md`

- [ ] **Step 1: Replace English deployment smoke**

Replace `## Deployment Smoke` with Source Block C.

- [ ] **Step 2: Replace English final gate**

Replace `## Final Gate` with Source Block D.

- [ ] **Step 3: Mirror the QA split in Korean**

Update `docs/launch/launch-core/launch-core-qa-checklist.ko.md` with the same sections.

Rules:

- Korean checklist labels should be Korean
- route paths, env var names, command strings, and URL placeholders must remain exactly the same
- keep `도입 문의` as the CTA label

- [ ] **Step 4: Search for stale deployment smoke wording**

Run:

```bash
rg -n "Deployment Smoke|preview deploy reachabl[e]|production deploy reachabl[e]|custom-domain|custom domain|generated URL|Preview Generated|Production Generated" docs/launch/launch-core/launch-core-qa-checklist.md docs/launch/launch-core/launch-core-qa-checklist.ko.md
```

Expected: QA is split into local repo-ready, Vercel bootstrap, Preview generated URL, Production generated URL, and Custom Domain sections.

- [ ] **Step 5: Commit the QA checklist**

```bash
git add docs/launch/launch-core/launch-core-qa-checklist.md docs/launch/launch-core/launch-core-qa-checklist.ko.md
git commit -m "docs: split launch deploy qa gates"
```

### Task 6: Verify Existing Env Validation Was Not Regressed

**Files:**

- Modify only if needed: `scripts/check-env.js`
- Modify only if needed: `tests/unit/check-env.spec.ts`

- [ ] **Step 1: Run the env validation tests**

Run:

```bash
pnpm test:unit tests/unit/check-env.spec.ts
```

Expected: tests pass and cover missing URL, invalid URL, non-Google URL, and template placeholder.

- [ ] **Step 2: Inspect the current validation behavior if tests fail**

Run:

```bash
rg -n "YOUR_|REPLACE_|TODO|forms.gle|docs.google.com|VITE_PUBLIC_INQUIRY_FORM_URL" scripts/check-env.js tests/unit/check-env.spec.ts
```

Expected: both implementation and tests mention placeholder rejection and Google Form host validation.

- [ ] **Step 3: Patch only the missing validation if needed**

Use this implementation shape only if the current code does not already contain it:

```js
if (/YOUR_|REPLACE_|TODO/i.test(inquiryFormUrl)) {
  return `${PUBLIC_INQUIRY_FORM_ENV_KEY}에는 실제 Google Form URL을 입력하세요.`;
}

const isFormsGleUrl = parsedUrl.hostname === 'forms.gle';
const isDocsGoogleFormsUrl =
  parsedUrl.hostname === 'docs.google.com' && parsedUrl.pathname.startsWith('/forms/');

if (!isFormsGleUrl && !isDocsGoogleFormsUrl) {
  return `${PUBLIC_INQUIRY_FORM_ENV_KEY}은 Google Form URL이어야 합니다. docs.google.com/forms 또는 forms.gle을 사용하세요.`;
}
```

- [ ] **Step 4: Rerun the env validation tests**

Run:

```bash
pnpm test:unit tests/unit/check-env.spec.ts
```

Expected: pass.

- [ ] **Step 5: Commit only if env validation files changed**

```bash
git add scripts/check-env.js tests/unit/check-env.spec.ts
git commit -m "test: preserve inquiry env validation"
```

### Task 7: Final Local Verification

**Files:**

- All files changed in Tasks 1-6

- [ ] **Step 1: Run markdown consistency search**

Run:

```bash
rg -n "Deploy Contract And Launch Regression Gat[e]|Deploy contract \\+ regression gat[e]|배포 계약 \\+ 최종 회귀 게이트|before any custom domai[n] has been purchase[d]|without requiring a purchased custom domai[n]|no custom domai[n] has been purchased ye[t]|preview deploy reachabl[e]|production deploy reachabl[e]|require[d] domai[n]|domai[n].*require[d]" docs/launch/launch-core
```

Expected: no stale Slice 6 title remains, and no wording makes custom-domain setup a repo-readiness prerequisite.

- [ ] **Step 2: Run repo-ready checks**

Run:

```bash
pnpm lint:check
pnpm check-env
pnpm test:unit tests/unit/router-index.spec.ts tests/unit/router-auth-guards.spec.ts tests/unit/login-view.spec.ts tests/unit/public-landing.spec.ts tests/unit/check-env.spec.ts tests/unit/schedule-version-resolver.spec.ts tests/unit/step5-result.spec.ts
pnpm test:e2e -- --no-deps tests/e2e/public-launch.spec.ts
pnpm build
```

Expected: all commands pass locally using `.env.local`.

- [ ] **Step 3: Run credential-backed E2E only when credentials exist**

Run only if `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` are set:

```bash
pnpm test:e2e -- tests/e2e/signup-flow.spec.ts tests/e2e/multi-org-rbac.spec.ts
```

Expected when credentials exist: pass.

Expected when credentials are missing: record this blocker instead of failing repo readiness:

```text
Blocked locally by missing TEST_USER_EMAIL/TEST_USER_PASSWORD. Not a Slice 6 repo-readiness failure.
```

- [ ] **Step 4: Review final diff**

Run:

```bash
git diff -- docs/launch/launch-core/launch-core-implementation-slices.md docs/launch/launch-core/launch-core-implementation-slices.ko.md docs/launch/launch-core/launch-core-auth-and-deploy-spec.md docs/launch/launch-core/launch-core-auth-and-deploy-spec.ko.md docs/launch/launch-core/launch-core-qa-checklist.md docs/launch/launch-core/launch-core-qa-checklist.ko.md vercel.json scripts/check-env.js tests/unit/check-env.spec.ts tests/e2e/public-launch.spec.ts tests/e2e/helpers.ts playwright.config.ts
```

Expected: diff contains only Slice 6 deploy readiness docs, `vercel.json`, and any narrowly required test/env-validation fixes.

- [ ] **Step 5: Commit final verification notes if docs changed after previous commits**

```bash
git add docs/launch/launch-core/launch-core-implementation-slices.md docs/launch/launch-core/launch-core-implementation-slices.ko.md docs/launch/launch-core/launch-core-auth-and-deploy-spec.md docs/launch/launch-core/launch-core-auth-and-deploy-spec.ko.md docs/launch/launch-core/launch-core-qa-checklist.md docs/launch/launch-core/launch-core-qa-checklist.ko.md
git commit -m "docs: finalize launch core deploy readiness gate"
```

## Review Loop

After implementation, review the plan outcome with the writing-plans reviewer criteria:

- Completeness: no TODOs, placeholders, or missing gates
- Spec alignment: no custom-domain requirement before generated Vercel URL proof
- Task decomposition: every change is either docs, `vercel.json`, or a narrowly justified existing-test fix
- Buildability: every command is copy-pasteable and has an expected result

If subagent review is available, dispatch one plan-document-reviewer with only:

```text
Plan to review: docs/launch/launch-core/launch-core-slice6-hardening-plan.md
Spec for reference: docs/launch/launch-core/launch-core-plan.md
```

If issues are found, fix this plan before executing Slice 6.
