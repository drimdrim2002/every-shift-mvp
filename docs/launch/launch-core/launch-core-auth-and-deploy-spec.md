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
- link to `관리자로 시작하기`

### Signup

Must remain admin-first for public beta:

- default role is `admin`
- public CTA may target `/signup?role=admin`

## Deployment Contract

### Platform

- Vercel preview
- Vercel production

### Required Behavior

- static frontend deploys correctly
- `/app/*` deep links work on refresh
- environment variables are isolated by environment
- public pages and app pages both resolve correctly

## Required Environment Variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL`
- `VITE_PUBLIC_SITE_URL`

## CI Gate

Minimum gate:

- `pnpm lint:check`
- focused auth/router/RBAC unit tests
