# Launch Core Auth and Deploy Spec

> Slice 6 supporting spec for [Launch Core Implementation Slices](./launch-core-implementation-slices.md#slice-6-deploy-contract-and-launch-regression-gate)
> and [launch-core-plan.md](./launch-core-plan.md)

## Document Role

This spec records the auth, environment, Vercel project, domain, and SSL criteria that support Slice 6. The master stage flow lives in [Launch Core Implementation Slices](./launch-core-implementation-slices.md), and the executable click/verify sequence lives in [Launch Core QA Checklist](./launch-core-qa-checklist.md).

## Goal

Ship public launch without expanding auth complexity beyond what is required.

## Auth Scope

In scope:

- email/password login
- email/password signup
- active, pending, and rejected routing
- authenticated redirect correctness after the `/app` move
- authenticated visit handling for `/`
- temporary legacy redirects from old app URLs to canonical `/app` URLs

Out of scope:

- Google login
- Kakao login
- `/auth/callback`
- provider-linking logic

## Entry Surfaces

### Login

Must include:

- email field
- password field
- `로그인` button
- link to `회원 가입`

### Signup

Must remain admin-first for public beta:

- default role is `admin`
- public CTA may target `/signup?role=admin`

### Authenticated Visit Rule

- unauthenticated visitors may stay on `/`
- active authenticated users who hit `/` should be redirected to `/app`
- pending and rejected users should continue to land on `/access/pending` and `/access/rejected`
- `/login` and `/signup` should never become alternate authenticated home screens

### Post-Login Landing Matrix

Successful auth should resolve directly to the canonical role-aware workspace destination:

| Access State   | Canonical Landing           |
| -------------- | --------------------------- |
| `super_active` | `/app/admin/approval-queue` |
| `admin_active` | `/app`                      |
| `user_active`  | `/app/home/user`            |

Rules:

- this matrix governs login completion and authenticated visits to `/login` or `/signup`
- the `/` redirect rule remains separate: active authenticated users who hit the public landing should be redirected to `/app`
- blocked states still bypass the workspace and land on `/access/pending` or `/access/rejected`

### Public Inquiry

Must be a real Google Form, not placeholder copy.

Required fields:

- `요청 내용` (checkbox, multi-select)
  - `소개 자료 다운로드`
  - `한 달 무료 사용하기`
  - `기타`
- `기타 상세 내용` (shown or clearly paired with `기타`)
- `병원 이름`
- `병동 이름`
- `이메일 주소`

Rules:

- `병원 이름`, `병동 이름`, `이메일 주소` are required
- `요청 내용` allows duplicate intent selection by checkbox
- if `기타` is selected, the user must have a place to write the request
- completion copy must tell the user what happens next

### Personal Information Notice

The inquiry form must show a personal-information collection/use notice before submission.

Launch-safe minimum notice:

- collection purpose: inquiry response, intro material delivery, free-trial coordination
- collected items: hospital name, ward name, email address, request details
- retention period: explicit period written in the form
- refusal rights: the user can refuse, but then inquiry handling may be limited

Recommended launch decision:

- add a required checkbox for consent before submit
- keep the processing scope narrow and operational
- review final wording before public launch

Note:

- this is a practical compliance recommendation, not legal sign-off
- because Google Form is used, review whether additional Google-related disclosure is needed for processing, storage, or overseas handling before launch

## Deployment Contract

### Platform

- Vercel preview
- Vercel production
- Vercel generated preview and production URLs
- `everyshift.co.kr` after DNS and SSL activation

### Required Behavior

- static frontend deploys correctly
- `/app/*` deep links work on refresh
- environment variables are isolated by environment
- public pages and app pages both resolve correctly
- public inquiry CTA opens the correct Google Form
- legacy app URLs redirect to their canonical `/app` equivalents during the launch window
- legacy `/ops/*` and `/schedule/*` deep links remain usable during the launch window

### Vercel Project Settings

Use these values when creating or reviewing the Vercel project. Record the final values in [Launch Core QA Checklist](./launch-core-qa-checklist.md).

| Setting          | Launch Core Value                                 |
| ---------------- | ------------------------------------------------- |
| Git provider     | GitHub repository for this project                |
| Framework Preset | Vite, or Vercel auto-detection confirmed as Vite  |
| Install Command  | `pnpm install` or Vercel default using `pnpm`     |
| Build Command    | `pnpm build`                                      |
| Output Directory | `dist`                                            |
| Root Directory   | repository root unless the project layout changes |

Notes:

- Vercel may auto-detect Vite settings, but launch QA should still record the visible values.
- The production deployment should come from the intended production branch or an explicit production deploy command.
- Preview smoke must use a generated Preview URL from the branch or pull request before any production promotion.

### Required Routing Config

Vite SPA deep links do not work on Vercel without an explicit rewrite.

Launch Core therefore requires a root `vercel.json` with the SPA fallback:

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

## Required Environment Variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL`
- `VITE_PUBLIC_INQUIRY_FORM_URL`

Optional only if canonical/meta work is implemented now:

- `VITE_PUBLIC_SITE_URL`

Rules:

- `VITE_PUBLIC_INQUIRY_FORM_URL` is public configuration and may be exposed to the client
- do not place secrets in any `VITE_*` variable
- launch builds should fail pre-release validation if the inquiry form URL is missing
- set Preview and Production values independently in Vercel
- redeploy the relevant environment after changing Vercel environment variables

## Generated URL Smoke

Vercel generates URLs for deployments. Slice 6 uses them in this order:

1. Preview URL from the branch or pull request
2. Production generated `vercel.app` URL
3. `https://everyshift.co.kr` after domain setup

Smoke checks must cover:

- `/`
- `/login`
- `/signup`
- `/access/pending`
- `/app`
- at least one `/app/schedule/*` deep link refresh
- legacy redirect examples for `/admin/*`, `/home/*`, `/ops/*`, and `/schedule/*`
- public inquiry CTA

## Custom Domain And SSL

Use `everyshift.co.kr` as the launch domain target when the team is ready to attach the public domain.

Process criteria:

- add `everyshift.co.kr` in the Vercel project Domains settings
- configure the DNS record values shown by Vercel at the domain provider
- wait for DNS propagation before treating the domain as launch-ready
- confirm Vercel reports HTTPS certificate issuance as active
- run the same smoke checks on `https://everyshift.co.kr` that passed on the production generated URL

Reference points from Vercel docs:

- Vercel serves only the configured Output Directory after a build, so Launch Core records `dist` for the Vite build output.
- Vercel environment variables are scoped to Production, Preview, custom environments, or Development.
- Vercel custom-domain setup asks for DNS records based on apex or subdomain configuration.
- Vercel automatically tries to generate an SSL certificate after a domain is added and DNS validation can complete.

## CI Gate

Minimum gate:

- `pnpm lint:check`
- focused auth/router/RBAC unit tests
- focused launch E2E covering `/`, `/app`, post-login redirects, and legacy redirects
- manual verification of the inquiry form link and consent copy
