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

## Required Environment Variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL`
- `VITE_PUBLIC_SITE_URL`

## CI Gate

Minimum gate:

- `pnpm lint:check`
- focused auth/router/RBAC unit tests
- manual verification of the inquiry form link and consent copy
