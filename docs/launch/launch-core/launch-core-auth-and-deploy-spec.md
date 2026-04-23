# Launch Core Auth and Deploy Spec

> Supporting spec for [launch-core-plan.md](./launch-core-plan.md)

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

### Required Behavior

- static frontend deploys correctly
- `/app/*` deep links work on refresh
- environment variables are isolated by environment
- public pages and app pages both resolve correctly
- public inquiry CTA opens the correct Google Form
- legacy app URLs redirect to their canonical `/app` equivalents during the launch window
- legacy `/ops/*` and `/schedule/*` deep links remain usable during the launch window

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

## CI Gate

Minimum gate:

- `pnpm lint:check`
- focused auth/router/RBAC unit tests
- focused launch E2E covering `/`, `/app`, post-login redirects, and legacy redirects
- manual verification of the inquiry form link and consent copy
