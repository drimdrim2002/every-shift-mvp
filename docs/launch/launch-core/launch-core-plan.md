# Launch Core Plan

> Status: Canonical plan for the first public launch gate

## Objective

Ship the minimum scope that makes EveryShift a real public product.

That means:

- a public landing page exists at `/`
- search and crawl traffic land on public content, not on the app shell
- authenticated users work under `/app`
- the current app remains stable after the route split
- the frontend is deployable on Vercel
- the public CTA leads to a real flow

## What Launch Core Is

`Launch Core` is not "marketing only."
It is the first release where the product has:

- a front door
- a protected workspace
- a deploy contract
- a launch QA gate

## What Launch Core Is Not

It is not:

- a full auth expansion
- a complete marketing site program
- a rewrite of the schedule-generation workflow
- a social-login launch

## Scope

In scope:

- restore green `pnpm build`
- keep `pnpm lint:check` green
- split public routes and app routes
- make `/` the public landing page
- move the authenticated product root to `/app`
- preserve existing email/password login and signup
- lock a real CTA path for admin signup or inquiry
- configure preview and production deployment on Vercel
- run launch-blocking QA

Out of scope:

- Google login
- Kakao login
- shared OAuth callback route rollout
- provider-specific account-linking rules
- deep launch polish beyond what is needed for public credibility

## Why This Must Ship First

The product cannot launch publicly if:

- the build is broken
- `/` still behaves like the internal app home
- early traffic hits placeholder CTAs
- deployment behavior is undefined

## Implementation Order

### 1. Baseline Stabilization

- fix current build errors
- confirm `pnpm build` passes
- confirm `pnpm lint:check` passes
- re-run focused auth/router tests

### 2. Public/App Route Split

- public routes remain at `/`, `/login`, `/signup`
- authenticated product routes move under `/app`
- post-login redirects target `/app`
- app shell no longer owns `/`

### 3. Public Landing Page

- hero and product explanation
- workflow summary
- trust signals
- clear CTA
- SEO-ready copy and structure

### 4. Conversion Path

- choose the real beta CTA
- if signup-led, route to `/signup?role=admin`
- if inquiry-led, route to a real contact flow
- avoid placeholder dead ends

### 5. Deployment

- Vercel preview deploy
- Vercel production deploy
- environment variables
- SPA deep-link support for `/app/*`

### 6. QA and Release Gate

- landing QA
- auth QA
- routing QA
- menu and RBAC QA
- preview and production smoke QA

## Release Gate

Launch Core is not ready unless:

- `pnpm build` passes
- `pnpm lint:check` passes
- focused auth/router tests pass
- `/` is public
- `/app` is protected
- deployed `/app` deep links survive refresh
- CTA path is real and verified
- preview and production are both reachable

## KPI

Track from day one:

- visits to `/`
- CTA click-through rate
- signup starts
- signup completions
- approved admins reaching `/app`

If these are invisible, launch learning is weak even if the site is technically live.
